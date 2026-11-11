import { describe, expect, it } from 'vitest';
import { type IndexedMesh, type SubdivisionOptions, type TriangleSoup, edgeLimit, subdivideAdaptive, weld } from '../subdivide';

type Point = readonly [number, number, number];
type Triangle = readonly [Point, Point, Point];

/**
 * A street-level rule. x is the lateral coordinate, y the height and z the direction of travel: the observer's
 * eye moves along the line x = 0, y = 1.6 m. An edge may subtend 0.2 rad there, is never split below 0.36 m
 * and always above 6 m.
 */
const RULE: SubdivisionOptions = { maxAngle: 0.2, minEdge: 0.36, maxEdge: 6, axisHeight: 1.6 };

// ---------------------------------------------------------------------------
// Vectors, soups and a seeded generator
// ---------------------------------------------------------------------------

const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Point, b: Point): Point => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Point, b: Point): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Point): number => Math.hypot(a[0], a[1], a[2]);

/** Small seeded generator (mulberry32), so that a failure can be reproduced. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const positionOf = (soup: TriangleSoup, vertex: number): Point => {
  const offset = vertex * soup.stride;
  return [soup.data[offset], soup.data[offset + 1], soup.data[offset + 2]];
};

/** Position-only soup (stride 3). */
const soupOf = (triangles: readonly Triangle[]): TriangleSoup => {
  const data = new Float32Array(triangles.length * 9);
  triangles.forEach((triangle, t) => triangle.forEach((point, k) => data.set(point, (t * 3 + k) * 3)));
  return { stride: 3, data, count: triangles.length * 3 };
};

/** Soup with one row of attributes per vertex. */
const soupOfRows = (rows: readonly (readonly number[])[]): TriangleSoup => ({
  stride: rows[0].length,
  data: Float32Array.from(rows.flat()),
  count: rows.length,
});

/** Subdivided copy; the argument keeps its data. */
const subdivided = (soup: TriangleSoup, options: SubdivisionOptions): TriangleSoup => {
  const copy: TriangleSoup = { stride: soup.stride, data: soup.data.slice(), count: soup.count };
  subdivideAdaptive(copy, options);
  return copy;
};

/** The soup an indexed mesh stands for. */
const expand = (mesh: IndexedMesh, stride: number): Float32Array => {
  const data = new Float32Array(mesh.indices.length * stride);
  mesh.indices.forEach((index, vertex) => {
    data.set(mesh.vertices.subarray(index * stride, (index + 1) * stride), vertex * stride);
  });
  return data;
};

/**
 * Index of the first float in which the arrays differ, −1 if there is none. The comparison is on the value
 * as stored: +0 and −0 are different, and so are arrays of different length.
 */
const firstDifference = (a: Float32Array, b: Float32Array): number => {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) if (!Object.is(a[i], b[i])) return i;
  return -1;
};

/** Largest value of `measure` over the edges of all triangles. */
const maxOverEdges = (soup: TriangleSoup, measure: (a: Point, b: Point) => number): number => {
  let largest = 0;
  for (let vertex = 0; vertex < soup.count; vertex++) {
    const next = vertex - (vertex % 3) + ((vertex + 1) % 3);
    largest = Math.max(largest, measure(positionOf(soup, vertex), positionOf(soup, next)));
  }
  return largest;
};

const longestEdge = (soup: TriangleSoup): number => maxOverEdges(soup, (a, b) => norm(sub(b, a)));

/** Largest ratio of edge length to edge limit: at most 1 when the rule is satisfied. */
const worstEdgeRatio = (soup: TriangleSoup, options: SubdivisionOptions): number =>
  maxOverEdges(soup, (a, b) => norm(sub(b, a)) / edgeLimit(a[0], a[1], b[0], b[1], options));

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

const quad = (a: Point, b: Point, c: Point, d: Point): Triangle[] => [
  [a, b, c],
  [a, c, d],
];

/** A varied input: surfaces at several distances from the observer's path, slivers, tilted and vertical faces. */
const STREET: readonly Triangle[] = [
  // road right under the path (closest approach 1.6 m) and a pavement beside it
  ...quad([-4, 0, 0], [4, 0, 0], [4, 0, 24], [-4, 0, 24]),
  ...quad([6, 0, 0], [10, 0, 0], [10, 0, 24], [6, 0, 24]),
  // far ground, where only maxEdge limits the edges
  ...quad([30, 0, 0], [60, 0, 0], [60, 0, 40], [30, 0, 40]),
  // façade along the road
  ...quad([-12, 0, 0], [-12, 0, 20], [-12, 30, 20], [-12, 30, 0]),
  // wall across the road: the path pierces it
  ...quad([-5, 0.5, 30], [5, 0.5, 30], [5, 6, 30], [-5, 6, 30]),
  // banner hanging in the plane of the path: a stretch of the path lies inside it
  [
    [0, 0.5, 50],
    [0, 4, 50],
    [0, 2, 62],
  ],
  // a corner exactly on the path
  [
    [0, 1.6, 40],
    [2, 3, 44],
    [-1, 0.2, 47],
  ],
  // kerb-like sliver, 0.2 m by 80 m, and a tilted one
  [
    [5, 0, 0],
    [5.2, 0, 0],
    [5.1, 0, 80],
  ],
  [
    [-3, 4, 0],
    [-3.05, 4.1, 0.02],
    [-9, 9, 50],
  ],
  // tilted roof plane
  [
    [8, 10, 0],
    [14, 14, 3],
    [9, 12, 15],
  ],
];

/**
 * Layout of the attributed soup: position, two attributes that are affine functions of the position (like a
 * planar texture projection), the index of the input triangle and a second per-triangle constant.
 */
const STRIDE = 7;
const AFFINE = [
  (x: number, y: number, z: number): number => 0.25 * x - 0.5 * y + 0.125 * z + 3,
  (x: number, y: number, z: number): number => -0.3 * x + 0.7 * y + 0.11 * z - 2,
];
const PARENT = 5;
const FLAG = 6;

const attributedSoup = (triangles: readonly Triangle[]): TriangleSoup => {
  const data = new Float32Array(triangles.length * 3 * STRIDE);
  triangles.forEach((triangle, t) => {
    triangle.forEach((point, k) => {
      const offset = (t * 3 + k) * STRIDE;
      data.set(point, offset);
      // evaluated at the position as it is stored, i.e. after rounding to float32
      AFFINE.forEach((f, i) => {
        data[offset + 3 + i] = f(data[offset], data[offset + 1], data[offset + 2]);
      });
      data[offset + PARENT] = t;
      // not a binary fraction: any arithmetic other than a plain copy or the mean of equal values would show
      data[offset + FLAG] = 0.1 + 0.3 * t;
    });
  });
  return { stride: STRIDE, data, count: triangles.length * 3 };
};

/** The twelve triangles of a closed box with outward normals; `corner(i, j, k)` are its eight corners. */
const box = (corner: (i: number, j: number, k: number) => Point): Triangle[] => [
  ...quad(corner(0, 0, 0), corner(0, 1, 0), corner(1, 1, 0), corner(1, 0, 0)),
  ...quad(corner(0, 0, 1), corner(1, 0, 1), corner(1, 1, 1), corner(0, 1, 1)),
  ...quad(corner(0, 0, 0), corner(1, 0, 0), corner(1, 0, 1), corner(0, 0, 1)),
  ...quad(corner(0, 1, 0), corner(0, 1, 1), corner(1, 1, 1), corner(1, 1, 0)),
  ...quad(corner(0, 0, 0), corner(0, 0, 1), corner(0, 1, 1), corner(0, 1, 0)),
  ...quad(corner(1, 0, 0), corner(1, 1, 0), corner(1, 1, 1), corner(1, 0, 1)),
];

const alignedBox = (min: Point, max: Point): Triangle[] =>
  box((i, j, k) => [i ? max[0] : min[0], j ? max[1] : min[1], k ? max[2] : min[2]]);

/**
 * Box in general position: pitched about x by the 5-12-13 angle, then turned about the vertical by the 3-4-5
 * angle, so that no edge is parallel to an axis and no trigonometric function is involved.
 */
const turnedBox = (centre: Point, half: Point): Triangle[] =>
  box((i, j, k) => {
    const x = (2 * i - 1) * half[0];
    const y = (2 * j - 1) * half[1];
    const z = (2 * k - 1) * half[2];
    const pitchedY = (12 * y - 5 * z) / 13;
    const pitchedZ = (5 * y + 12 * z) / 13;
    return [centre[0] + 0.8 * x + 0.6 * pitchedZ, centre[1] + pitchedY, centre[2] - 0.6 * x + 0.8 * pitchedZ];
  });

/** Off the path, so that the edge limit varies across it from 0.6 m to almost 2 m. */
const BOX_BESIDE_THE_ROAD = alignedBox([3.1, 0.2, 0.3], [9.3, 6.1, 8.7]);

const CLOSED_SURFACES: readonly (readonly [string, readonly Triangle[]])[] = [
  ['a box beside the road', BOX_BESIDE_THE_ROAD],
  ['a building at an angle', turnedBox([-45, 34, 30], [14, 22, 28])],
  // the path runs through it and pierces two of its faces, around which the limit drops to minEdge
  ['a box the observer drives through', turnedBox([-1, 4.5, 27], [6, 4.5, 7])],
];

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

/**
 * A midpoint is rounded to float32 once per pass. Below 128 m that moves a coordinate by at most 3.8e-6 m, so
 * after the twelve passes allowed a vertex lies within 12 × 3.8e-6 × √3 ≈ 8e-5 m of its exact place.
 */
const POSITION_TOLERANCE = 1e-4;

const turn = (ax: number, ay: number, bx: number, by: number, px: number, py: number): number =>
  (bx - ax) * (py - ay) - (by - ay) * (px - ax);

/**
 * How the output of a subdivision sits on its input. Works on the attributed layout: a child finds its input
 * triangle through the PARENT attribute.
 */
const tilingOf = (input: TriangleSoup, output: TriangleSoup) => {
  const random = seeded(7);
  const frames = Array.from({ length: input.count / 3 }, (_, parent) => {
    const origin = positionOf(input, parent * 3);
    const e1 = sub(positionOf(input, parent * 3 + 1), origin);
    const e2 = sub(positionOf(input, parent * 3 + 2), origin);
    const n = cross(e1, e2);
    const twiceArea = norm(n);
    const normal: Point = [n[0] / twiceArea, n[1] / twiceArea, n[2] / twiceArea];
    // height of the triangle above each side, in the order of the barycentric weights (u, v, 1 − u − v)
    const heights = [twiceArea / norm(e2), twiceArea / norm(e1), twiceArea / norm(sub(e2, e1))];
    return { origin, e1, e2, twiceArea, normal, heights, childArea: 0, children: [] as number[] };
  });

  const worst = { offPlane: 0, outside: 0, tilt: 0, areaError: 0, miscovered: 0 };
  for (let t = 0; t < output.count / 3; t++) {
    const frame = frames[output.data[t * 3 * STRIDE + PARENT]];
    const corners = [0, 1, 2].map((k) => positionOf(output, t * 3 + k));
    const n = cross(sub(corners[1], corners[0]), sub(corners[2], corners[0]));
    frame.childArea += norm(n) / 2;
    // 1 − cos of the angle between the two normals: 0 for a parallel child, 2 for a flipped one
    worst.tilt = Math.max(worst.tilt, 1 - dot(n, frame.normal) / norm(n));
    for (const corner of corners) {
      // corner = origin + u·e1 + v·e2 + height·normal
      const w = sub(corner, frame.origin);
      const u = dot(cross(w, frame.e2), frame.normal) / frame.twiceArea;
      const v = dot(cross(frame.e1, w), frame.normal) / frame.twiceArea;
      worst.offPlane = Math.max(worst.offPlane, Math.abs(dot(w, frame.normal)));
      worst.outside = Math.max(worst.outside, -u * frame.heights[0], -v * frame.heights[1], (u + v - 1) * frame.heights[2]);
      frame.children.push(u, v);
    }
  }

  for (const { twiceArea, childArea, children } of frames) {
    worst.areaError = Math.max(worst.areaError, Math.abs((2 * childArea) / twiceArea - 1));
    for (let sample = 0; sample < 32; sample++) {
      // a point distributed uniformly over the input triangle, in barycentric coordinates
      let u = random();
      let v = random();
      if (u + v > 1) [u, v] = [1 - u, 1 - v];
      let hits = 0;
      for (let c = 0; c < children.length; c += 6) {
        const inside =
          turn(children[c], children[c + 1], children[c + 2], children[c + 3], u, v) > 0 &&
          turn(children[c + 2], children[c + 3], children[c + 4], children[c + 5], u, v) > 0 &&
          turn(children[c + 4], children[c + 5], children[c], children[c + 1], u, v) > 0;
        if (inside) hits++;
      }
      if (hits !== 1) worst.miscovered++;
    }
  }
  return worst;
};

/** Asserts that `output` is a tiling of `input` by triangles of the same orientation. */
const expectSameSurface = (input: TriangleSoup, output: TriangleSoup): void => {
  const tiling = tilingOf(input, output);
  // every output vertex lies in the plane of its input triangle and not outside it
  expect(tiling.offPlane).toBeLessThan(POSITION_TOLERANCE);
  expect(tiling.outside).toBeLessThan(POSITION_TOLERANCE);
  // The area of every input triangle is kept. The narrowest one is 0.1 m wide and its float32 corners are
  // rounded by up to 2.4e-7 m per pass, which limits the agreement to a few parts in a million.
  expect(tiling.areaError).toBeLessThan(1e-5);
  // The children face the same way as the parent. Rounding (< 1e-6 m) can tilt a child that is a millimetre
  // wide by 1e-3 rad, i.e. 1 − cos < 1e-6; a flipped child would give 2.
  expect(tiling.tilt).toBeLessThan(1e-6);
  // and every sampled point of the input lies in exactly one child: no gap, no overlap
  expect(tiling.miscovered).toBe(0);
};

/**
 * Seams of a position-only soup, judged on its welded vertices. On a closed, consistently oriented surface
 * every directed edge a→b is used by exactly one triangle and the opposite edge b→a by exactly one other. An
 * edge that is split on one side only breaks this and leaves a vertex in the interior of the unsplit edge.
 */
const seams = (soup: TriangleSoup) => {
  const { vertices, indices, vertexCount } = weld(soup);
  const uses = new Map<number, number>();
  for (let corner = 0; corner < indices.length; corner++) {
    const next = corner - (corner % 3) + ((corner + 1) % 3);
    const key = indices[corner] * vertexCount + indices[next];
    uses.set(key, (uses.get(key) ?? 0) + 1);
  }

  let unmatched = 0;
  let clearance = Infinity;
  for (const [key, used] of uses) {
    const a = Math.floor(key / vertexCount);
    const b = key % vertexCount;
    const opposite = uses.get(b * vertexCount + a);
    if (used !== 1 || opposite !== 1) unmatched++;
    if (opposite !== undefined && a > b) continue; // the opposite direction stands for this edge
    const ax = vertices[a * 3];
    const ay = vertices[a * 3 + 1];
    const az = vertices[a * 3 + 2];
    const dx = vertices[b * 3] - ax;
    const dy = vertices[b * 3 + 1] - ay;
    const dz = vertices[b * 3 + 2] - az;
    const lengthSquared = dx * dx + dy * dy + dz * dz;
    // Only a vertex inside the box around the edge, widened by the smallest distance found so far, can be
    // closer still. Skipping the others replaces most of the edges × vertices distances by one comparison.
    const lowX = Math.min(0, dx) - clearance;
    const highX = Math.max(0, dx) + clearance;
    const lowY = Math.min(0, dy) - clearance;
    const highY = Math.max(0, dy) + clearance;
    const lowZ = Math.min(0, dz) - clearance;
    const highZ = Math.max(0, dz) + clearance;
    for (let vertex = 0; vertex < vertexCount; vertex++) {
      const px = vertices[vertex * 3] - ax;
      if (px < lowX || px > highX) continue;
      const py = vertices[vertex * 3 + 1] - ay;
      if (py < lowY || py > highY) continue;
      const pz = vertices[vertex * 3 + 2] - az;
      if (pz < lowZ || pz > highZ || vertex === a || vertex === b) continue;
      // nearest point of the segment: the foot of the perpendicular, or an end point
      const foot = (px * dx + py * dy + pz * dz) / lengthSquared;
      const along = foot < 0 ? 0 : foot > 1 ? 1 : foot;
      clearance = Math.min(clearance, Math.hypot(px - along * dx, py - along * dy, pz - along * dz));
    }
  }
  return {
    triangles: soup.count / 3,
    vertices: vertexCount,
    /** Directed edges that are not used exactly once and matched by exactly one opposite edge. */
    unmatched,
    /** Smallest distance between an edge and a vertex that is not one of its end points, m. */
    clearance,
  };
};

const expectWatertight = (soup: TriangleSoup): void => {
  const { triangles, vertices, unmatched, clearance } = seams(soup);
  expect(unmatched).toBe(0);
  // A vertex left on a neighbour's unsplit edge would lie within float32 rounding (1e-5 m) of it; in a sound
  // mesh the nearest foreign vertex is a triangle height away, which is centimetres at the least.
  expect(clearance).toBeGreaterThan(1e-3);
  // Euler's formula for a closed surface without handles, with three edges for every two triangles
  expect(vertices).toBe(triangles / 2 + 2);
  // the corners that triangles share agree bit for bit, not merely within the weld quantum
  const exact = new Set(Array.from({ length: soup.count }, (_, vertex) => positionOf(soup, vertex).join()));
  expect(exact.size).toBe(vertices);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('edgeLimit', () => {
  // every number here is a binary fraction, so the expected values are exact
  const exact: SubdivisionOptions = { maxAngle: 0.25, minEdge: 0.5, maxEdge: 8, axisHeight: 1.5 };

  it('is maxAngle × the distance of the edge midpoint from the line x = 0, y = axisHeight', () => {
    // midpoint (3, 1.5 + 4): 5 m from the path
    expect(edgeLimit(2, 5.5, 4, 5.5, exact)).toBe(1.25);
    // the same distance on the other side of the path and below it
    expect(edgeLimit(-2, -2.5, -4, -2.5, exact)).toBe(1.25);
    // only the midpoint counts: this edge has the same one, although it starts on the path itself
    expect(edgeLimit(0, 1.5, 6, 9.5, exact)).toBe(1.25);
  });

  it('is clamped to [minEdge, maxEdge]', () => {
    // both end points are 5 m from the path, but the midpoint lies on it
    expect(edgeLimit(-5, 1.5, 5, 1.5, exact)).toBe(0.5);
    expect(edgeLimit(1, 1.5, 1, 1.5, exact)).toBe(0.5);
    // the clamps take over at minEdge / maxAngle = 2 m and maxEdge / maxAngle = 32 m, without a jump
    expect(edgeLimit(2, 1.5, 2, 1.5, exact)).toBe(0.5);
    expect(edgeLimit(4, 1.5, 4, 1.5, exact)).toBe(1);
    expect(edgeLimit(32, 1.5, 32, 1.5, exact)).toBe(8);
    expect(edgeLimit(48, 65.5, 48, 65.5, exact)).toBe(8);
  });

  it('treats the edge as at least minDistance away', () => {
    const distant = { ...exact, minDistance: 12 };
    // on the path: 0.25 × 12 m instead of the minEdge floor
    expect(edgeLimit(-5, 1.5, 5, 1.5, distant)).toBe(3);
    // farther to the side than minDistance: the lateral distance still rules
    expect(edgeLimit(20, 1.5, 20, 1.5, distant)).toBe(5);
    expect(edgeLimit(20, 1.5, 20, 1.5, exact)).toBe(5);
    // and maxEdge still caps the result
    expect(edgeLimit(-5, 1.5, 5, 1.5, { ...exact, minDistance: 40 })).toBe(8);
  });

  it('does not depend on the order of the end points', () => {
    // Exact equality, not closeness: two triangles that share an edge see its end points in opposite order,
    // and the slightest disagreement about the limit could split the edge on one side only.
    const random = seeded(1);
    let disagreements = 0;
    for (let i = 0; i < 2000; i++) {
      // within 20 m of the path most limits are in the sloping part between the two clamps
      const [ax, ay, bx, by] = [0, 0, 0, 0].map(() => 40 * random() - 20);
      for (const options of [RULE, { ...RULE, minDistance: 3 }]) {
        if (edgeLimit(ax, ay, bx, by, options) !== edgeLimit(bx, by, ax, ay, options)) disagreements++;
      }
    }
    expect(disagreements).toBe(0);
  });
});

describe('subdivideAdaptive: the rule', () => {
  it('leaves no edge longer than its limit', () => {
    // the input breaks the rule by far, so doing nothing cannot pass
    expect(worstEdgeRatio(soupOf(STREET), RULE)).toBeGreaterThan(50);
    const rules = [
      RULE,
      { ...RULE, maxAngle: 0.05 },
      { ...RULE, minEdge: 0.1, maxEdge: 2 },
      { ...RULE, maxEdge: 3, minDistance: 12 },
    ];
    for (const rule of rules) {
      // Coordinates are float32: near 100 m they are defined to 4e-6 m, which is 1e-5 of the shortest edge
      // the rule asks for (0.36 m), so the rule cannot be checked more sharply than that.
      expect(worstEdgeRatio(subdivided(soupOf(STREET), rule), rule)).toBeLessThanOrEqual(1 + 1e-5);
    }
  });

  it('returns triangles that already satisfy the rule bit for bit', () => {
    const soup = soupOfRows([
      // on the path itself, where maxAngle × distance is zero: edges below minEdge are never split
      [-0.1, 1.5, 3, -0, 1e-40],
      [0.2, 1.6, 3, 0.1, -3e38],
      [0, 1.8, 3.1, 7, 0.3],
      // ten metres to the side: the limit is 2 m
      [10, 0, 0, 1, 2],
      [10, 0, 1.9, 3, 4],
      [11.5, 0, 1, 5, 6],
      // far away: the limit is maxEdge
      [50, 3, 0, -1, -2],
      [50, 3, 5.9, -3, -4],
      [54, 6, 3, -5, -6],
    ]);
    const after = subdivided(soup, RULE);
    expect(after.count).toBe(9);
    expect(firstDifference(after.data, soup.data)).toBe(-1);
  });

  it('splits an edge only when it is strictly longer than its limit', () => {
    // 40 m from the path the limit is maxEdge = 6 m, and the first edge is exactly that long
    expect(
      subdivided(
        soupOf([
          [
            [40, 0, 0],
            [40, 0, 6],
            [44, 0, 3],
          ],
        ]),
        RULE
      ).count
    ).toBe(3);
    // one float32 step longer (6.0000005 m) and it is cut in two
    expect(
      subdivided(
        soupOf([
          [
            [40, 0, 0],
            [40, 0, 6.0000005],
            [44, 0, 3],
          ],
        ]),
        RULE
      ).count
    ).toBe(6);
  });

  it('splits exactly the edges that are too long', () => {
    // 100 m from the path the limit is 6 m everywhere. Sides: (8, 5, 5), (3, 8, 8) and (8, 8, 8) m.
    const shapes: readonly (readonly [number, Triangle])[] = [
      [
        1,
        [
          [100, 0, 0],
          [100, 0, 8],
          [103, 0, 4],
        ],
      ],
      [
        2,
        [
          [100, 0, 0],
          [100, 0, 3],
          [107.86, 0, 1.5],
        ],
      ],
      [
        3,
        [
          [100, 0, 0],
          [100, 0, 8],
          [106.93, 0, 4],
        ],
      ],
    ];
    for (const [tooLong, [a, b, c]] of shapes) {
      // each rotation of the corners puts the long (or the short) edge into a different slot of the triangle
      for (const triangle of [
        [a, b, c],
        [b, c, a],
        [c, a, b],
      ] as const) {
        const input = attributedSoup([triangle]);
        const output = subdivided(input, RULE);
        // one new vertex per split edge: a triangle with n of them falls into n + 1
        expect(output.count / 3).toBe(tooLong + 1);
        expectSameSurface(input, output);
      }
    }
  });

  it("tessellates finely beside the observer's path and not at all far from it", () => {
    // the same 4 m × 12 m piece of ground at growing lateral distance
    const counts = [0, 4, 8, 16, 32, 64, 128].map((x) => {
      const ground = soupOf(quad([x, 0, 0], [x + 4, 0, 0], [x + 4, 0, 12], [x, 0, 12]));
      return subdivided(ground, { ...RULE, maxEdge: 14 }).count / 3;
    });
    for (let i = 1; i < counts.length; i++) {
      if (counts[i - 1] > 2) expect(counts[i]).toBeLessThan(counts[i - 1]);
      else expect(counts[i]).toBe(2);
    }
    // 64 m away even the 12.6 m diagonal subtends less than 0.2 rad: the two triangles are left alone
    expect(counts[counts.length - 1]).toBe(2);
  });

  it('gives at least as many triangles for a finer rule', () => {
    const triangles = (rule: SubdivisionOptions): number => subdivided(soupOf(STREET), rule).count / 3;
    // each list runs from fine to coarse
    const ladders = [
      [0.05, 0.1, 0.2, 0.4, 0.8].map((maxAngle) => triangles({ ...RULE, maxAngle })),
      [1, 2, 3, 6, 14].map((maxEdge) => triangles({ ...RULE, maxEdge })),
      [0.09, 0.18, 0.36, 0.72, 1.44].map((minEdge) => triangles({ ...RULE, minEdge })),
      // a block known to be far away may be coarser, however close to the path it lies
      [0, 3, 12, 40].map((minDistance) => triangles({ ...RULE, minDistance })),
    ];
    for (const counts of ladders) {
      for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
      // … and the parameter has an effect at all
      expect(counts[counts.length - 1]).toBeLessThan(counts[0]);
    }
  });

  it('copes with the degenerate triangles that real models contain', () => {
    const soup = subdivided(
      soupOf([
        // three corners on one line
        [
          [10, 0, 0],
          [10, 0, 20],
          [10, 0, 40],
        ],
        // two corners in the same place
        [
          [4, 2, 0],
          [4, 2, 0],
          [9, 5, 30],
        ],
        // a single point
        [
          [3, 1, 7],
          [3, 1, 7],
          [3, 1, 7],
        ],
      ]),
      RULE
    );
    // same float32 allowance as above
    expect(worstEdgeRatio(soup, RULE)).toBeLessThanOrEqual(1 + 1e-5);
    expect(soup.data.every(Number.isFinite)).toBe(true);
  });
});

describe('subdivideAdaptive: the surface', () => {
  it('tiles every input triangle with triangles of the same orientation', () => {
    const input = attributedSoup(STREET);
    const output = subdivided(input, RULE);
    expect(output.data.length).toBe(output.count * STRIDE);
    expectSameSurface(input, output);
  });

  it('interpolates attributes linearly and leaves per-triangle constants alone', () => {
    const input = attributedSoup(STREET);
    const output = subdivided(input, RULE);
    let worst = 0;
    let altered = 0;
    for (let vertex = 0; vertex < output.count; vertex++) {
      const offset = vertex * STRIDE;
      const [x, y, z] = positionOf(output, vertex);
      AFFINE.forEach((f, i) => {
        worst = Math.max(worst, Math.abs(output.data[offset + 3 + i] - f(x, y, z)));
      });
      // the three corners of a child carry the constants of one and the same input triangle
      const parent = output.data[(vertex - (vertex % 3)) * STRIDE + PARENT];
      const source = parent * 3 * STRIDE;
      if (output.data[offset + PARENT] !== parent || output.data[offset + FLAG] !== input.data[source + FLAG]) {
        altered++;
      }
    }
    // An attribute that is affine in the position stays so. Per pass the stored value (below 32) is rounded
    // by up to 1e-6 and the position by up to 4e-6 m, which enters with coefficients below 1: after twelve
    // passes at most 6e-5.
    expect(worst).toBeLessThan(1e-4);
    expect(altered).toBe(0);
  });
});

describe('subdivideAdaptive: cracks', () => {
  for (const [name, triangles] of CLOSED_SURFACES) {
    it(`keeps ${name} watertight`, () => {
      const soup = subdivided(soupOf(triangles), RULE);
      // unevenly refined, or there would be nothing to go wrong
      expect(soup.count / 3).toBeGreaterThan(1000);
      expectWatertight(soup);
      console.info(name, JSON.stringify(seams(soup)));
    });
  }

  it('stays watertight when the pass limit stops it early', () => {
    // every pass is a complete refinement step; with no pass at all this checks the box itself
    for (const maxPasses of [0, 1, 2, 3]) {
      expectWatertight(subdivided(soupOf(BOX_BESIDE_THE_ROAD), { ...RULE, maxPasses }));
    }
  });

  it('lets pieces that were subdivided separately meet without cracks', () => {
    // The decision about an edge depends on that edge alone, not on what else is in the soup, so the faces of
    // a surface can be processed one at a time (as the blocks of the scene are) and still fit together.
    const pieces = BOX_BESIDE_THE_ROAD.map((triangle) => subdivided(soupOf([triangle]), RULE).data);
    const data = new Float32Array(pieces.reduce((total, piece) => total + piece.length, 0));
    let cursor = 0;
    for (const piece of pieces) {
      data.set(piece, cursor);
      cursor += piece.length;
    }
    const whole = subdivided(soupOf(BOX_BESIDE_THE_ROAD), RULE);
    expect(data.length).toBe(whole.data.length);
    expectWatertight({ stride: 3, data, count: data.length / 3 });
  });
});

describe('subdivideAdaptive: safety limits', () => {
  it('makes at most maxPasses passes, each of which halves an edge once', () => {
    // 200 m from the path and with maxEdge = 1 m, all edges of this 100 m triangle are too long seven times
    const huge = soupOf([
      [
        [200, 0, 0],
        [300, 0, 0],
        [250, 0, 86.5],
      ],
    ]);
    const rule = { ...RULE, maxEdge: 1 };
    for (const maxPasses of [0, 1, 2, 3, 4]) {
      const soup = subdivided(huge, { ...rule, maxPasses });
      expect(soup.count / 3).toBe(4 ** maxPasses);
      // the coordinates are binary fractions, so the halves are exact
      expect(longestEdge(soup)).toBe(100 / 2 ** maxPasses);
    }
    // left alone it stops as soon as the rule is met: 100 / 2⁷ = 0.78 m, no eighth pass
    const soup = subdivided(huge, rule);
    expect(soup.count / 3).toBe(4 ** 7);
    expect(longestEdge(soup)).toBe(100 / 2 ** 7);
  });

  it('stops growing at the maxTriangles budget', () => {
    const input = attributedSoup(STREET);
    const unlimited = subdivided(input, RULE);
    for (const maxTriangles of [16, 100, 500, 5000]) {
      const soup = subdivided(input, { ...RULE, maxTriangles });
      // the split that reaches the budget turns one triangle into at most four
      expect(soup.count / 3).toBeLessThanOrEqual(maxTriangles + 3);
      // what there is, is still the whole surface
      expectSameSurface(input, soup);
      console.info('budget', maxTriangles, soup.count / 3);
    }
    // a budget that is not needed changes nothing
    const roomy = subdivided(input, { ...RULE, maxTriangles: 2 * (unlimited.count / 3) });
    expect(firstDifference(roomy.data, unlimited.data)).toBe(-1);
    // an input that is over budget already is passed through as it is
    const over = subdivided(input, { ...RULE, maxTriangles: STREET.length - 1 });
    expect(firstDifference(over.data, input.data)).toBe(-1);
  });

  it('terminates when the rule cannot be met', () => {
    // With minEdge = 0 the limit falls to zero on the path, so no triangle around the point where the path
    // pierces this one can ever satisfy it: only the safety limits end the refinement.
    const pierced = soupOf([
      [
        [-3, -0.4, 5],
        [3, 0.6, 5],
        [0, 5.6, 9],
      ],
    ]);
    const impossible = { ...RULE, minEdge: 0 };
    const byPasses = subdivided(pierced, impossible);
    expect(worstEdgeRatio(byPasses, impossible)).toBeGreaterThan(1);
    const byBudget = subdivided(pierced, { ...impossible, maxPasses: 1000, maxTriangles: 2000 });
    expect(byBudget.count / 3).toBeLessThanOrEqual(2003);
    console.info('impossible', byPasses.count / 3, worstEdgeRatio(byPasses, impossible), byBudget.count / 3);
  });

  it('accepts an empty soup', () => {
    const soup: TriangleSoup = { stride: 5, data: new Float32Array(0), count: 0 };
    subdivideAdaptive(soup, RULE);
    expect(soup.count).toBe(0);
    expect(soup.data.length).toBe(0);
  });
});

describe('weld', () => {
  /**
   * 3600 corners scattered around 150 grid points, each grid point being used about 24 times: near-duplicates
   * as rounding produces them. The first attribute is off by up to ±0.7 quantum, so that copies of a grid
   * point fall into up to three neighbouring cells; the others stay within ±0.3 quantum, inside one cell.
   */
  const scattered = (): TriangleSoup => {
    const random = seeded(3);
    const stride = 5;
    const anchors = Array.from({ length: 150 }, () =>
      Array.from({ length: stride }, () => Math.round(2000 * random() - 1000) / 100)
    );
    const data = new Float32Array(3600 * stride);
    for (let vertex = 0; vertex < 3600; vertex++) {
      const anchor = anchors[Math.floor(random() * anchors.length)];
      for (let k = 0; k < stride; k++) {
        data[vertex * stride + k] = anchor[k] + (k === 0 ? 1.4e-4 : 0.6e-4) * (random() - 0.5);
      }
    }
    return { stride, data, count: 3600 };
  };

  it('returns an indexed mesh that expands back to the soup', () => {
    // a subdivided surface: neighbouring triangles repeat each other's corners bit for bit
    const soup = subdivided(attributedSoup(STREET), RULE);
    const mesh = weld(soup);
    expect(mesh.indices.length).toBe(soup.count);
    expect(mesh.vertices.length).toBe(mesh.vertexCount * STRIDE);
    expect(firstDifference(expand(mesh, STRIDE), soup.data)).toBe(-1);
    console.info('weld street', soup.count, mesh.vertexCount, soup.count / mesh.vertexCount);
  });

  it('merges vertices that agree in every attribute, and no others', () => {
    const vertex = [1.5, -2.25, 40, 0, 1, 0];
    const rows = [
      vertex,
      // each of these differs from the first in a single attribute, by two quanta: position or normal alike
      ...vertex.map((_, k) => vertex.map((value, i) => (i === k ? value + 2e-4 : value))),
    ];
    const copies = [
      ...rows,
      // an exact copy, a copy that is off by a third of a quantum everywhere, and one with the other zero
      vertex,
      vertex.map((value) => value + 3e-5),
      [1.5, -2.25, 40, -0, 1, -0],
    ];
    const mesh = weld(soupOfRows(copies));
    expect(mesh.vertexCount).toBe(7);
    expect(new Set(mesh.indices.subarray(0, 7)).size).toBe(7);
    expect(Array.from(mesh.indices.subarray(7))).toEqual([mesh.indices[0], mesh.indices[0], mesh.indices[0]]);
  });

  it('uses a quantum of 1e-4 unless told otherwise', () => {
    // 2e-5 apart: inside one cell of 1e-4, in different cells of 1e-5
    const close = soupOfRows([
      [1.00001, 2, 3],
      [1.00003, 2, 3],
    ]);
    // 2e-4 apart: in different cells of 1e-4, inside one cell of 1e-3
    const apart = soupOfRows([
      [1, 2, 3],
      [1.0002, 2, 3],
    ]);
    expect(weld(close).vertexCount).toBe(1);
    expect(weld(close, 1e-5).vertexCount).toBe(2);
    expect(weld(apart).vertexCount).toBe(2);
    expect(weld(apart, 1e-3).vertexCount).toBe(1);
  });

  it('moves no attribute by a whole quantum', () => {
    const soup = scattered();
    const mesh = weld(soup);
    // between one and three cells per grid point: near-duplicates are merged, near misses are not
    expect(mesh.vertexCount).toBeGreaterThanOrEqual(150);
    expect(mesh.vertexCount).toBeLessThanOrEqual(450);
    const welded = expand(mesh, soup.stride);
    let worst = 0;
    for (let i = 0; i < welded.length; i++) worst = Math.max(worst, Math.abs(welded[i] - soup.data[i]));
    // vertices are merged only if every attribute rounds to the same multiple of the quantum
    expect(worst).toBeLessThan(1e-4);
    console.info('scattered', mesh.vertexCount, worst);
  });

  it('is idempotent', () => {
    const soup = scattered();
    const once = weld(soup);
    // welding the soup that the mesh stands for gives the same mesh again …
    const twice = weld({ stride: soup.stride, data: expand(once, soup.stride), count: soup.count });
    expect(firstDifference(twice.vertices, once.vertices)).toBe(-1);
    expect(Array.from(twice.indices)).toEqual(Array.from(once.indices));
    // … and its list of vertices holds nothing that could still be merged
    const list = weld({ stride: soup.stride, data: once.vertices, count: once.vertexCount });
    expect(list.vertexCount).toBe(once.vertexCount);
  });

  it('does not depend on the order of the triangles, except for the numbering', () => {
    const soup = scattered();
    const { stride } = soup;
    const triangles = soup.count / 3;
    const random = seeded(11);
    const order = Array.from({ length: triangles }, (_, t) => t);
    for (let i = triangles - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const shuffled: TriangleSoup = { stride, data: new Float32Array(soup.data.length), count: soup.count };
    order.forEach((from, to) => {
      shuffled.data.set(soup.data.subarray(from * 3 * stride, (from + 1) * 3 * stride), to * 3 * stride);
    });

    const before = weld(soup);
    const after = weld(shuffled);
    expect(after.vertexCount).toBe(before.vertexCount);
    // the same corners are merged in both: the two numberings are a one-to-one relabelling of each other
    const relabelled = new Map<number, number>();
    let conflicts = 0;
    order.forEach((from, to) => {
      for (let k = 0; k < 3; k++) {
        const old = before.indices[from * 3 + k];
        const now = after.indices[to * 3 + k];
        if ((relabelled.get(old) ?? now) !== now) conflicts++;
        relabelled.set(old, now);
      }
    });
    expect(conflicts).toBe(0);
    expect(new Set(relabelled.values()).size).toBe(before.vertexCount);
  });

  it('handles a single triangle and an empty soup', () => {
    const triangle = soupOfRows([
      [0, 0, 0, 1],
      [1, 0, 0, 1],
      [0, 1, 0, 1],
    ]);
    const mesh = weld(triangle);
    expect(mesh.vertexCount).toBe(3);
    expect(firstDifference(expand(mesh, 4), triangle.data)).toBe(-1);

    const empty = weld({ stride: 6, data: new Float32Array(0), count: 0 });
    expect(empty.vertexCount).toBe(0);
    expect(empty.vertices.length).toBe(0);
    expect(empty.indices.length).toBe(0);
  });

  it('gives one vertex per distinct tuple in a large soup full of duplicates', () => {
    const random = seeded(5);
    const stride = 8;
    // 500 different vertices on a 1 mm grid (ten quanta), each used about sixty times
    const tuples = new Map<string, number[]>();
    while (tuples.size < 500) {
      const tuple = Array.from({ length: stride }, () => Math.round(200_000 * random() - 100_000) / 1000);
      tuples.set(tuple.join(), tuple);
    }
    const distinct = [...tuples.values()];
    const picks = Array.from({ length: 30_000 }, () => Math.floor(random() * distinct.length));
    const soup = soupOfRows(picks.map((pick) => distinct[pick]));
    const mesh = weld(soup);
    // no tuple is split in two, and (since the mesh expands back to the soup) no two are merged
    expect(mesh.vertexCount).toBe(new Set(picks).size);
    expect(firstDifference(expand(mesh, stride), soup.data)).toBe(-1);
  });

  it('keeps the points of a dense lattice apart', () => {
    // 32³ points one quantum apart and no duplicates: the hash table is as full as it gets, and thousands of
    // points meet a different point in their slot. Only the comparison of every component tells them apart.
    const rows: number[][] = [];
    for (let i = 0; i < 32; i++) {
      for (let j = 0; j < 32; j++) {
        for (let k = 0; k < 32; k++) rows.push([12.5 + i * 1e-4, -3 + j * 1e-4, 40 + k * 1e-4]);
      }
    }
    expect(weld(soupOfRows(rows)).vertexCount).toBe(32 ** 3);
    // the same points once more, backwards: each has to find its first occurrence among the collisions
    const soup = soupOfRows([...rows, ...[...rows].reverse()]);
    const mesh = weld(soup);
    expect(mesh.vertexCount).toBe(32 ** 3);
    expect(firstDifference(expand(mesh, 3), soup.data)).toBe(-1);
  });
});
