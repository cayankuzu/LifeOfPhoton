/**
 * Tessellation error of the relativistic vertex transform.
 *
 * The scene is kept in its rest frame; the vertex shader moves every vertex to the direction in which the
 * moving observer sees it (aberration, reference implementation: aberratePoint in src/physics/optics.ts).
 * That is exact for the vertices. The rasteriser then joins two transformed vertices by a STRAIGHT edge,
 * which the observer sees as the great-circle arc between the two apparent directions, and this is the one
 * approximation in the renderer's geometry, because the exact image of a straight rest-frame edge is an arc
 * of a SMALL circle:
 *
 *   - seen from the eye, a straight segment lies on a great circle of the rest-frame sky: the section of
 *     the sky with the plane through the eye and the segment, whose unit normal n is the pole of the circle;
 *   - aberration is the dilation ζ′ = e^(−φ)·ζ of the stereographic plane. It maps circles to circles, and
 *     the great circle with pole n to a small circle of geodesic curvature
 *
 *         κ = γβ·|cos α| = γβ·|n_z|        (α = angle between n and the direction of motion, −z).
 *
 * The error of a drawn edge is the largest angular distance between that small-circle arc and the great
 * circle through its end points, i.e. its sagitta: κ·s′²/8 for an arc of image length s′. Because
 * |cos α| ≤ sin θ everywhere on the great circle and the image is shorter than the rest-frame arc δ by the
 * local factor 1/D, this is at most γβ·sin θ·δ²/(8D²) = γβ·sin θ′·δ²/(8D), the bound printed in the
 * dossier (src/dossier/content/method.ts, the paragraph on the geodesic curvature).
 *
 * The first two tests check that theory against the reference implementation. The others measure what
 * the tessellation rule (subdivide.ts, TESSELLATION and LEVELS_OF_DETAIL in build.ts) leaves of the error
 * wherever the scene is bright enough to be seen.
 */

import { describe, expect, it } from 'vitest';
import { BETA_MAX, lorentzFactor } from '@/physics/kinematics';
import { type BoostUniforms, type Vec3, aberratePoint, boostUniforms } from '@/physics/optics';
import { FADE_AHEAD_END, FADE_BEHIND_END } from '../../uniforms';
import { LEVELS_OF_DETAIL, NEAREST_GEOMETRY, TESSELLATION, levelOfDetail } from '../build';
import { edgeLimit } from '../subdivide';

// ---------------------------------------------------------------------------
// Vectors and deterministic sampling
// ---------------------------------------------------------------------------

const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const norm = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
const normalise = (a: Vec3): Vec3 => scale(a, 1 / norm(a));
/** Angle between two vectors; atan2 keeps its accuracy for nearly parallel ones, where acos would not. */
const angleBetween = (a: Vec3, b: Vec3): number => Math.atan2(norm(cross(a, b)), dot(a, b));

/** Small seeded generator (mulberry32): the tests must give the same numbers on every run. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Unit vector distributed uniformly over the sphere. */
function randomUnit(random: () => number): Vec3 {
  const z = 2 * random() - 1;
  const azimuth = 2 * Math.PI * random();
  const s = Math.sqrt(1 - z * z);
  return { x: s * Math.cos(azimuth), y: s * Math.sin(azimuth), z };
}

/** Two orthonormal vectors that span the plane perpendicular to the unit vector n. */
function basisOfPlane(n: Vec3): [Vec3, Vec3] {
  const helper = Math.abs(n.x) < 0.6 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const e1 = normalise(cross(n, helper));
  return [e1, cross(n, e1)];
}

/** Unit direction in which the moving observer sees the rest-frame point `rel`. */
const apparentDirection = (rel: Vec3, u: BoostUniforms): Vec3 => normalise(aberratePoint(rel, u).position);

/**
 * Error of drawing the straight rest-frame edge from `from` to `to` as a straight line: the largest angle,
 * over `interior` equally spaced points of the edge, between the apparent direction of the point (the
 * exact image) and the plane spanned by the apparent directions of the two ends (the great circle that
 * the rasteriser draws).
 */
function chordError(from: Vec3, to: Vec3, u: BoostUniforms, interior = 15): number {
  const pole = cross(apparentDirection(from, u), apparentDirection(to, u));
  const length = norm(pole);
  // An edge seen end-on (a radial edge) has a point for an image: there is nothing to deviate from, and
  // the plane of its two coinciding end directions would be rounding noise.
  if (!(length > 1e-9)) return 0;
  let sine = 0;
  for (let k = 1; k <= interior; k++) {
    const t = k / (interior + 1);
    const seen = aberratePoint(
      { x: from.x + t * (to.x - from.x), y: from.y + t * (to.y - from.y), z: from.z + t * (to.z - from.z) },
      u
    ).position;
    sine = Math.max(sine, Math.abs(dot(seen, pole)) / norm(seen));
  }
  return Math.asin(Math.min(1, sine / length));
}

// ---------------------------------------------------------------------------
// Theory: the image of a straight edge
// ---------------------------------------------------------------------------

describe('aberration of a straight edge', () => {
  const BETAS = [0.3, 0.5, Math.sqrt(3) / 2, 0.99, 0.9999, BETA_MAX];

  /**
   * Plane m · p = h through three of the given points: the first one, the one farthest from it and the
   * one farthest from the line through those two. At high speed the image points crowd together around the
   * forward direction, so three points picked by index could form a needle that fixes the plane badly.
   */
  function planeThrough(points: readonly Vec3[]): { pole: Vec3; offset: number } {
    const first = points[0];
    let second = first;
    let third = first;
    let farthest = 0;
    for (const p of points) {
      const distance = norm(sub(p, first));
      if (distance > farthest) {
        farthest = distance;
        second = p;
      }
    }
    let widest = 0;
    for (const p of points) {
      const area = norm(cross(sub(second, first), sub(p, first)));
      if (area > widest) {
        widest = area;
        third = p;
      }
    }
    const pole = normalise(cross(sub(second, first), sub(third, first)));
    return { pole, offset: dot(pole, first) };
  }

  it('the image of a great circle is a small circle of geodesic curvature γβ·|cos α|', () => {
    const random = seeded(20261111);
    const poles: Vec3[] = [
      // degenerate: the great circle passes through the direction of motion (a meridian)
      { x: 1, y: 0, z: 0 },
      { x: 0.6, y: -0.8, z: 0 },
      // the transverse plane: the largest curvature, γβ
      { x: 0, y: 0, z: 1 },
    ];
    for (let i = 0; i < 48; i++) poles.push(randomUnit(random));

    for (const beta of BETAS) {
      const u = boostUniforms(beta);
      for (const n of poles) {
        const [e1, e2] = basisOfPlane(n);
        const phase = random();
        const image: Vec3[] = [];
        for (let k = 0; k < 60; k++) {
          const t = (2 * Math.PI * (k + phase)) / 60;
          image.push(apparentDirection(add(scale(e1, Math.cos(t)), scale(e2, Math.sin(t))), u));
        }

        // A circle on the unit sphere is a plane section m · p = h. Its radius in that plane is
        // sin ρ = √(1 − h²) and its geodesic curvature is cot ρ = h/√(1 − h²).
        const { pole, offset } = planeThrough(image);
        const radius = Math.sqrt((1 - offset) * (1 + offset));
        let residual = 0;
        for (const p of image) residual = Math.max(residual, Math.abs(dot(pole, p) - offset));
        // The image points carry rounding errors of about 1e-16, but at the top speed the whole circle
        // has a radius of only 4.5e-3, so the residual is compared with the radius. Measured: ≤ 2e-13.
        expect(residual / radius).toBeLessThan(1e-11);

        if (n.z === 0) {
          // Aberration only slides the points of a meridian along it: the image is the same great circle.
          expect(Math.abs(offset)).toBeLessThan(1e-12);
          expect(1 - Math.abs(dot(pole, n))).toBeLessThan(1e-12);
        } else {
          const curvature = Math.abs(offset) / radius;
          // h is good to about 1e-16, which leaves 11 digits of 1 − h² (as small as 2e-5 at the top
          // speed) and of h itself when the pole is nearly perpendicular to the motion. Measured: ≤ 2e-11.
          expect(Math.abs(curvature / (lorentzFactor(beta) * beta * Math.abs(n.z)) - 1)).toBeLessThan(1e-9);
        }
      }
    }
  });

  it('a short edge never deviates by more than the curvature bound', () => {
    const SAMPLES = 64;
    // The sagitta formula κ·s′²/8 is the short-arc limit: the next term of its expansion is a relative
    // (5/48)·s′² at most. Images up to 0.2 rad long are tested, for which that is 0.42 % (measured: 0.31 %).
    const LONGEST_IMAGE = 0.2;
    const TOLERANCE = 0.005;
    // Rounding floor of an angle measured between unit vectors, for edges whose bound is all but zero.
    const FLOOR = 1e-12;

    for (const beta of BETAS) {
      const random = seeded(977);
      const u = boostUniforms(beta);
      const gammaBeta = lorentzFactor(beta) * beta;
      let tested = 0;
      let sharpest = 0;
      let sharpestDossier = 0;

      for (let i = 0; i < 300; i++) {
        // Two directions δ apart, joined at independent distances: a straight segment in a random
        // position and orientation, generally seen foreshortened, that subtends exactly δ at the eye.
        const a = randomUnit(random);
        const [t1, t2] = basisOfPlane(a);
        const turn = 2 * Math.PI * random();
        const delta = 0.005 + 0.045 * random();
        const tangent = add(scale(t1, Math.cos(turn)), scale(t2, Math.sin(turn)));
        const b = add(scale(a, Math.cos(delta)), scale(tangent, Math.sin(delta)));
        const from = scale(a, 10 ** (0.3 + 2 * random()));
        const to = scale(b, norm(from) * (0.5 + 1.5 * random()));
        const n = normalise(cross(a, b));

        // Length of the image and the extreme values of D and sin θ along the edge.
        let imageLength = 0;
        let minDoppler = Infinity;
        let maxSine = 0;
        let previous: Vec3 | undefined;
        for (let k = 0; k <= SAMPLES; k++) {
          const p = add(from, scale(sub(to, from), k / SAMPLES));
          const seen = aberratePoint(p, u);
          const direction = normalise(seen.position);
          if (previous) imageLength += angleBetween(previous, direction);
          previous = direction;
          minDoppler = Math.min(minDoppler, seen.doppler);
          maxSine = Math.max(maxSine, Math.hypot(p.x, p.y) / norm(p));
        }
        // Next to the backward direction, where D ≪ 1, even a short edge is stretched into a long arc.
        if (imageLength > LONGEST_IMAGE) continue;
        tested++;

        const error = chordError(from, to, u, SAMPLES - 1);
        const sagitta = (gammaBeta * Math.abs(n.z) * imageLength * imageLength) / 8;
        const dossier = (gammaBeta * maxSine * delta * delta) / (8 * minDoppler * minDoppler);
        expect(error).toBeLessThanOrEqual((1 + TOLERANCE) * sagitta + FLOOR);
        expect(error).toBeLessThanOrEqual((1 + TOLERANCE) * dossier + FLOOR);
        sharpest = Math.max(sharpest, error / sagitta);
        sharpestDossier = Math.max(sharpestDossier, error / dossier);
      }

      // Nearly all edges must have been short enough to be tested …
      expect(tested).toBeGreaterThanOrEqual(285);
      // … and both bounds are sharp: some edge comes within 1 % of them, so neither has a factor to spare.
      expect(sharpest).toBeGreaterThan(0.99);
      expect(sharpestDossier).toBeGreaterThan(0.99);
    }
  });
});

// ---------------------------------------------------------------------------
// The tessellation rule
// ---------------------------------------------------------------------------

/**
 * Smallest Doppler factor at which anything can be seen: below it the street-lit scene has less than 1 %
 * of its rest luminance, and thermal emission only appears for D > 1.
 */
const VISIBLE_DOPPLER = 0.69;

/**
 * Bound on the error of a drawn edge wherever anything is visible: 6 mrad (0.34°), the figure quoted in
 * the dossier (src/dossier/content/method.ts, the paragraph on the geodesic curvature). The scan below
 * finds at most 5.1 mrad at 0.5 c, √3/2 c and from 0.99 c upwards, and a flat maximum of 5.7 mrad between
 * 0.94 c and 0.97 c. The worst edge is the same at every speed: close to the path, at right angles to
 * both the path and the line of sight, behind the observer and at or near the edge of visibility.
 */
const MAX_ERROR = 6e-3;

/**
 * Lateral distances from the observer's path, m, on a geometric grid. The avenue reaches |x| ≤ 34 m and
 * 58 m above the road, at most 66 m from the path, and nothing comes closer to the path than
 * NEAREST_GEOMETRY (both are checked against the model files in assets.test.ts).
 */
const LATERAL = Array.from({ length: 28 }, (_, i) => NEAREST_GEOMETRY * (68 / NEAREST_GEOMETRY) ** (i / 27));

/**
 * Distances ahead of the observer (negative: behind), m, over the part of the model that is drawn: it
 * dissolves FADE_AHEAD_END ahead and FADE_BEHIND_END behind. Symmetric offsets, 0.25 m apart next to the
 * observer and 20 % apart further out, plus the distances at which the level of detail changes and the
 * two ends themselves.
 */
function distancesAhead(): number[] {
  const offsets = [0, FADE_AHEAD_END, FADE_BEHIND_END, ...LEVELS_OF_DETAIL.map((level) => level.minDistance)];
  for (let k = 1; k <= 12; k++) offsets.push(0.25 * k);
  for (let offset = 3.6; offset < Math.max(FADE_AHEAD_END, FADE_BEHIND_END); offset *= 1.2) offsets.push(offset);
  const ahead = offsets.filter((offset) => offset <= FADE_AHEAD_END);
  const behind = offsets.filter((offset) => offset > 0 && offset <= FADE_BEHIND_END).map((offset) => -offset);
  return [...new Set([...behind, ...ahead])].sort((p, q) => p - q);
}
const AHEAD = distancesAhead();

/**
 * Doppler cones on which the edge midpoint is placed in addition to the grid. The first is the edge of
 * visibility, where the error is largest at high speed: it has to be sampled exactly.
 */
const DOPPLER_CONES = [VISIBLE_DOPPLER, 0.72, 0.76, 0.8, 0.85, 0.9, 0.95, 1.0, 1.25, 1.6];

/**
 * Edge directions: the three axes, the face and space diagonals, and a Fibonacci hemisphere in between
 * (an edge and its reverse are the same edge).
 */
function edgeDirections(): Vec3[] {
  const lattice: Vec3[] = [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 1, y: 1, z: 0 },
    { x: 1, y: -1, z: 0 },
    { x: 1, y: 0, z: 1 },
    { x: 1, y: 0, z: -1 },
    { x: 0, y: 1, z: 1 },
    { x: 0, y: 1, z: -1 },
    { x: 1, y: 1, z: 1 },
    { x: 1, y: 1, z: -1 },
    { x: 1, y: -1, z: 1 },
    { x: 1, y: -1, z: -1 },
  ];
  const directions = lattice.map(normalise);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 24; i++) {
    const z = (i + 0.5) / 24;
    const s = Math.sqrt(1 - z * z);
    directions.push({ x: s * Math.cos(i * goldenAngle), y: s * Math.sin(i * goldenAngle), z });
  }
  return directions;
}
const DIRECTIONS = edgeDirections();

/** Longest edge that the rule allows at a lateral distance from the path in a block of the given level, m. */
function longestEdge(lateral: number, level: number): number {
  const detail = LEVELS_OF_DETAIL[level];
  // edgeLimit takes absolute heights: an edge at the height of the path, `lateral` metres to its side
  return edgeLimit(lateral, TESSELLATION.axisHeight, lateral, TESSELLATION.axisHeight, {
    ...TESSELLATION,
    minDistance: detail.minDistance,
    maxEdge: Math.max(...Object.values(detail.maxEdge)),
  });
}

/** The visible edge with the largest error found at one lateral distance. */
interface WorstCase {
  /** Error of the drawn edge, rad */
  readonly deviation: number;
  /** Lateral distance and distance ahead of the edge midpoint, m */
  readonly lateral: number;
  readonly ahead: number;
  /** Level of detail and length of the edge, m */
  readonly level: number;
  readonly edge: number;
  /** Doppler factor of the edge midpoint */
  readonly doppler: number;
}

/**
 * Structured scan of the drawn volume at one speed; returns the worst visible edge for every lateral
 * distance of the grid.
 *
 * By the symmetry about the axis of motion the edge midpoint can be put at (lateral, 0, −ahead) relative
 * to the eye. The edge is as long as the rule allows there, in the coarsest level its block can have:
 * `levelAt(ahead)`, the midpoint then being the nearest point of the block. It counts as visible when its
 * midpoint lies in the drawn range and has a Doppler factor of at least VISIBLE_DOPPLER.
 */
function scan(beta: number, levelAt: (ahead: number) => number): WorstCase[] {
  const u = boostUniforms(beta);
  const gamma = lorentzFactor(beta);
  return LATERAL.map((lateral) => {
    const positions = [...AHEAD];
    for (const doppler of DOPPLER_CONES) {
      // D = γ(1 + β cos θ) solved for the rest-frame angle θ of the midpoint; then ahead = lateral/tan θ
      const cosine = (doppler / gamma - 1) / beta;
      if (Math.abs(cosine) < 1) positions.push((lateral * cosine) / Math.sqrt(1 - cosine * cosine));
    }

    let worst: WorstCase = { deviation: 0, lateral, ahead: 0, level: 0, edge: 0, doppler: 1 };
    for (const ahead of positions) {
      if (ahead < -FADE_BEHIND_END || ahead > FADE_AHEAD_END) continue;
      const mid = { x: lateral, y: 0, z: -ahead };
      const doppler = aberratePoint(mid, u).doppler;
      // (the factor lets a midpoint placed on the cone D = VISIBLE_DOPPLER pass in spite of rounding)
      if (doppler < VISIBLE_DOPPLER * (1 - 1e-9)) continue;
      const level = levelAt(ahead);
      const edge = longestEdge(lateral, level);
      for (const direction of DIRECTIONS) {
        const half = scale(direction, edge / 2);
        const deviation = chordError(sub(mid, half), add(mid, half), u);
        if (deviation > worst.deviation) worst = { deviation, lateral, ahead, level, edge, doppler };
      }
    }
    return worst;
  });
}

function worstOf(cases: readonly WorstCase[]): WorstCase {
  let worst = cases[0];
  for (const candidate of cases) if (candidate.deviation > worst.deviation) worst = candidate;
  return worst;
}

describe('error of the drawn edges', () => {
  // The round speeds of the dossier, and the neighbourhood of 0.95 c: the error does not peak at one of
  // the round values but in a flat maximum between 0.94 c and 0.97 c.
  const SPEEDS = [0.5, Math.sqrt(3) / 2, 0.9, 0.94, 0.95, 0.96, 0.97, 0.99, 0.999, 0.9999, BETA_MAX];

  // The scan is the expensive part of this file, so each speed is scanned once for all the tests.
  const scans = new Map<number, WorstCase[]>();
  function scanWithActualRule(beta: number): WorstCase[] {
    let cases = scans.get(beta);
    if (!cases) {
      cases = scan(beta, levelOfDetail);
      scans.set(beta, cases);
    }
    return cases;
  }

  it('edges that satisfy the rule stay within 6 mrad of the exact image wherever anything is visible', () => {
    let largest = 0;
    for (const beta of SPEEDS) {
      const worst = worstOf(scanWithActualRule(beta));
      expect(worst.deviation).toBeLessThan(MAX_ERROR);
      largest = Math.max(largest, worst.deviation);
    }
    // The scan must have found the hard cases: if the sampling collapsed, the bound would hold vacuously.
    expect(largest).toBeGreaterThan(5e-3);
  });

  it('the minimum edge length never overrides the angular rule where there is geometry', () => {
    // Closer to the path than minEdge/maxAngle the edges are not split any further and subtend more than
    // maxAngle; an edge 1.2 m from the path would then be bent by more than 8 mrad. The rule is safe
    // because that distance is not larger than the distance of the nearest geometry.
    expect(TESSELLATION.minEdge / TESSELLATION.maxAngle).toBeLessThanOrEqual(NEAREST_GEOMETRY + 1e-12);
    expect(longestEdge(NEAREST_GEOMETRY, 0)).toBeCloseTo(TESSELLATION.maxAngle * NEAREST_GEOMETRY, 12);
  });

  it('coarser levels are only safe ahead of the observer', () => {
    // A hypothetical rule that picks the level from the distance alone, also behind the observer.
    // Aberration shrinks what lies ahead, but it pulls what lies behind forward into the visible ring
    // and magnifies it by 1/D, so that the long edges of a coarse block are bent far beyond the bound
    // there. This is why levelOfDetail returns 0 for blocks beside and behind the observer.
    const byDistanceAlone = (ahead: number): number => levelOfDetail(Math.abs(ahead));
    for (const beta of [0.999, 0.9999, BETA_MAX]) {
      const actual = worstOf(scanWithActualRule(beta));
      const coarse = worstOf(scan(beta, byDistanceAlone));
      expect(coarse.ahead).toBeLessThan(0);
      expect(coarse.level).toBeGreaterThan(0);
      // Measured: 38 mrad (2.2°), 65 mrad (3.7°) and 0.49 rad (28°) at the three speeds. That is 2.9,
      // 4.9 and 37 times the bound, and 5.1, 15 and 195 times the error of the actual rule at that speed.
      expect(coarse.deviation).toBeGreaterThan(5 * MAX_ERROR);
      expect(coarse.deviation).toBeGreaterThan(5 * actual.deviation);
    }
  });
});

describe('levelOfDetail', () => {
  const last = LEVELS_OF_DETAIL.length - 1;

  it('keeps the full rule at and behind the observer', () => {
    for (const nearestAhead of [0, -1e-9, -1, -FADE_BEHIND_END, -1e6]) expect(levelOfDetail(nearestAhead)).toBe(0);
  });

  it('switches exactly at each minDistance and never becomes finer with distance', () => {
    for (let level = 1; level <= last; level++) {
      const boundary = LEVELS_OF_DETAIL[level].minDistance;
      expect(levelOfDetail(boundary)).toBe(level);
      expect(levelOfDetail(boundary * (1 - 1e-12))).toBe(level - 1);
    }
    let previous = 0;
    for (let nearestAhead = -20; nearestAhead <= 2 * FADE_AHEAD_END; nearestAhead += 0.5) {
      const level = levelOfDetail(nearestAhead);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it('never exceeds the last level', () => {
    expect(levelOfDetail(1e12)).toBe(last);
    expect(levelOfDetail(Infinity)).toBe(last);
  });
});
