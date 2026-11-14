/**
 * Marks on the picture for what a text of the panel "Why does it look like this?" talks about.
 *
 * A text points at a mark in the scene, at elements of the interface, or at both (src/ui/inventory.ts,
 * Pointing). This module turns a mark of the scene into a shape in the pixels of the stage, for the
 * velocity, the view and the camera of this frame:
 *
 *   a direction        the direction of motion, the one behind, the Moon, a patch of sky: mapped as the
 *                      star shader maps a rest-frame direction, normalize(mix(measured, seen, optical))
 *   a point            an object of the avenue, found in the layout where the simulation has put the
 *                      recycled blocks, or a place a fixed distance from the observer: mapped as the city
 *                      shader maps a vertex, mix(measuredPoint, aberratePoint, optical)
 *   a cone             about the direction of motion (θ = 90°, D = 1, the edges of the ring of lamp light,
 *                      the glow of the surroundings), drawn as the curve it makes on the screen
 *
 * then projected through the camera of the scene (yaw, pitch, the field of view of the lens), as the
 * guide layer projects its circles (src/ui/hud/Guides.tsx). A mark outside the view becomes an arrow at
 * the nearest edge, in the direction to turn. Of the objects of a kind the one marked is the nearest
 * that is in the view, or, when none is, the one closest to it. A thing that lies under a panel (the Moon
 * under the top bar of a phone) is shown by an arrow just outside that panel, pointing at it; an arrow at
 * the edge of the view that would fall under a panel moves out from under it in the same way.
 *
 * Pure: no React, no three.js. The overlay that draws the shapes is src/ui/hud/Pointer.tsx; the store at
 * the end holds what the panel points at now.
 */

import { lorentzFactor } from '@/physics/kinematics';
import {
  type BoostUniforms,
  type Vec3,
  aberratePoint,
  apparentAngleOfDoppler,
  boostUniforms,
  measuredPoint,
  neutralConeAngle,
} from '@/physics/optics';
import { SCENARIO } from '@/physics/scenario';
import { EMITTER } from '@/scene/emitters';
import {
  type Placement,
  CARRIAGEWAY_HALF_WIDTH,
  CHUNK_COUNT,
  FADE_AHEAD_END,
  FADE_AHEAD_START,
  FADE_BEHIND_START,
  MEASURING_GRID_M,
  OBSERVER_Y,
  PAVEMENT_Y,
  ROAD_SURFACE_Y,
  VARIANT_COUNT,
  blockCentreAhead,
  chunkLayout,
  chunkLuminaires,
} from '@/scene/geometry/layout';
import { GLOW_VISIBLE_DOPPLER } from './explain';
import { type Pointing, type SceneMark, ringEdges } from './inventory';

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

/** What the shapes are computed from: the telemetry of the frame, a setting, and the size of the stage. */
export interface PointingView {
  /** Velocity the simulation is at, and the share of the seen view in the picture (telemetry). */
  readonly beta: number;
  readonly optical: number;
  /** Position of the observer along the avenue, m (telemetry.travel). */
  readonly travel: number;
  /** View direction relative to the direction of motion and vertical field of view, rad. */
  readonly yaw: number;
  readonly pitch: number;
  readonly fieldOfView: number;
  /** Whether the thermal emission of the surroundings is drawn. */
  readonly thermal: boolean;
  /** Size of the stage, CSS pixels. */
  readonly width: number;
  readonly height: number;
  /**
   * Boxes of the panels that lie over the stage, in its pixels: of the things of a kind, the nearest one
   * that is not under a panel is marked (one under a panel only when there is no other in the view, and then by an
   * arrow beside the panel, as is any other thing under one), and the name of a curve stands where no panel covers it.
   */
  readonly covered?: readonly CoveredBox[];
}

/** A box over the stage, CSS pixels from its top left. */
export interface CoveredBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export type ScreenPoint = readonly [x: number, y: number];

/** What to draw for a mark, in the pixels of the stage (origin at its top left, y down). */
export type MarkShape =
  /** a thing or a direction inside the view: a circle about it, `radius` pixels */
  | { readonly kind: 'spot'; readonly at: ScreenPoint; readonly radius: number }
  /** cones and lines: their curves on the screen, and a place on one of them for a label (null: none in a good place) */
  | { readonly kind: 'curves'; readonly paths: readonly (readonly ScreenPoint[])[]; readonly anchor: ScreenPoint | null }
  /** outside the view: an arrow at the edge, pointing (`angle`, rad, screen axes) the way to turn */
  | { readonly kind: 'edge'; readonly at: ScreenPoint; readonly angle: number };

/** Distance of an edge arrow from the edge of the stage, px. */
export const EDGE_INSET = 22;
/** Smallest circle of a spot, px. */
export const SPOT_MIN_RADIUS = 9;

interface Frame {
  readonly view: PointingView;
  readonly gamma: number;
  readonly boost: BoostUniforms;
  readonly cosYaw: number;
  readonly sinYaw: number;
  readonly cosPitch: number;
  readonly sinPitch: number;
  /** Focal length in pixels: the same along both axes of the screen. */
  readonly focal: number;
}

function frameOf(view: PointingView): Frame {
  return {
    view,
    gamma: lorentzFactor(view.beta),
    boost: boostUniforms(view.beta),
    cosYaw: Math.cos(view.yaw),
    sinYaw: Math.sin(view.yaw),
    cosPitch: Math.cos(view.pitch),
    sinPitch: Math.sin(view.pitch),
    focal: view.height / 2 / Math.tan(view.fieldOfView / 2),
  };
}

const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});

const normalise = (v: Vec3): Vec3 => {
  const length = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / length, y: v.y / length, z: v.z / length };
};

/**
 * Where the city shader draws a point at the rest-frame displacement `rel` from the eye, relative to the
 * eye, and its Doppler factor: mix(measured, seen, optical), as in src/scene/shaders/city.ts.
 */
export function apparentPoint(rel: Vec3, beta: number, optical: number): { readonly position: Vec3; readonly doppler: number } {
  const seen = aberratePoint(rel, boostUniforms(beta));
  return { position: lerp(measuredPoint(rel, lorentzFactor(beta)), seen.position, optical), doppler: seen.doppler };
}

/** The direction the star shader draws the unit rest-frame direction `rest` in: normalize(mix(measured, seen, optical)). */
export function apparentDirection(rest: Vec3, beta: number, optical: number): Vec3 {
  const seen = aberratePoint(rest, boostUniforms(beta)).position;
  const measured = normalise({ x: rest.x, y: rest.y, z: rest.z / lorentzFactor(beta) });
  return normalise(lerp(measured, seen, optical));
}

/** World direction to the camera's axes: undo the yaw about y, then the pitch about x (the camera turns 'YXZ'). */
function toCamera(frame: Frame, d: Vec3): Vec3 {
  const x = d.x * frame.cosYaw - d.z * frame.sinYaw;
  const z1 = d.x * frame.sinYaw + d.z * frame.cosYaw;
  return { x, y: d.y * frame.cosPitch + z1 * frame.sinPitch, z: -d.y * frame.sinPitch + z1 * frame.cosPitch };
}

/** Pixel of a direction in the camera's axes, or null when it lies behind the camera. */
function toScreen(frame: Frame, v: Vec3): ScreenPoint | null {
  if (v.z > -1e-9) return null;
  return [frame.view.width / 2 + (frame.focal * v.x) / -v.z, frame.view.height / 2 - (frame.focal * v.y) / -v.z];
}

/**
 * Pixel at which a world direction (relative to the eye) is drawn, or null behind the camera: the
 * projection of the guide layer and of the scene's camera.
 */
export function projectDirection(view: PointingView, direction: Vec3): ScreenPoint | null {
  const frame = frameOf(view);
  return toScreen(frame, toCamera(frame, direction));
}

const inside = (frame: Frame, p: ScreenPoint | null): p is ScreenPoint =>
  p !== null && p[0] >= 0 && p[0] <= frame.view.width && p[1] >= 0 && p[1] <= frame.view.height;

/** Whether a pixel of the stage lies under one of the panels over it. */
const underPanel = (frame: Frame, p: ScreenPoint): boolean =>
  (frame.view.covered ?? []).some((box) => p[0] >= box.left && p[0] <= box.right && p[1] >= box.top && p[1] <= box.bottom);

/** How close a direction in the camera's axes is to the middle of the view: the cosine of the angle between them. */
const closeness = (v: Vec3): number => -v.z / Math.hypot(v.x, v.y, v.z);

/** The arrow at the edge for a direction (in the camera's axes) outside the view: on the line from the middle towards it. */
function edgeArrow(frame: Frame, v: Vec3): MarkShape {
  const { width, height } = frame.view;
  // the focal length is the same along both axes, so the way to the projected point is (x, −y), in front or behind
  let dx = v.x;
  let dy = -v.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-9) {
    // straight behind: turn to the right
    dx = 1;
    dy = 0;
  } else {
    dx /= length;
    dy /= length;
  }
  const hx = Math.max(0, width / 2 - EDGE_INSET);
  const hy = Math.max(0, height / 2 - EDGE_INSET);
  const t = Math.min(dx === 0 ? Infinity : hx / Math.abs(dx), dy === 0 ? Infinity : hy / Math.abs(dy));
  return { kind: 'edge', at: [width / 2 + dx * t, height / 2 + dy * t], angle: Math.atan2(dy, dx) };
}

/** Distance of an arrow beside a panel from the panel's edge, px. */
export const PANEL_ARROW_GAP = 14;

/** The panel over the stage under which a pixel lies, if any. */
const panelAt = (covered: readonly CoveredBox[], p: ScreenPoint): CoveredBox | undefined =>
  covered.find((box) => p[0] >= box.left && p[0] <= box.right && p[1] >= box.top && p[1] <= box.bottom);

/**
 * The nearest place in the open for a pixel under a panel: straight out of the panel across its nearest edge,
 * on past any panel that adjoins it on that side, `PANEL_ARROW_GAP` beyond the last one; a way that leaves the
 * stage (with the inset of the edge arrows) is not taken. The pixel itself when it is in the open; null when
 * every way out is closed.
 */
export function outOfPanels(p: ScreenPoint, covered: readonly CoveredBox[], width: number, height: number): ScreenPoint | null {
  const first = panelAt(covered, p);
  if (!first) return p;
  const ways = [
    { dx: 0, dy: 1, distance: first.bottom - p[1] },
    { dx: 0, dy: -1, distance: p[1] - first.top },
    { dx: 1, dy: 0, distance: first.right - p[0] },
    { dx: -1, dy: 0, distance: p[0] - first.left },
  ].sort((a, b) => a.distance - b.distance);
  for (const { dx, dy } of ways) {
    let at: ScreenPoint = p;
    for (let box = panelAt(covered, at), step = 0; box && step < covered.length; box = panelAt(covered, at), step++) {
      at =
        dx !== 0
          ? [dx > 0 ? box.right + PANEL_ARROW_GAP : box.left - PANEL_ARROW_GAP, at[1]]
          : [at[0], dy > 0 ? box.bottom + PANEL_ARROW_GAP : box.top - PANEL_ARROW_GAP];
    }
    const open = !panelAt(covered, at);
    const within = at[0] >= EDGE_INSET && at[0] <= width - EDGE_INSET && at[1] >= EDGE_INSET && at[1] <= height - EDGE_INSET;
    if (open && within) return at;
  }
  return null;
}

/**
 * The mark of a thing at the pixel `at` that lies under a panel: an arrow just outside the panel, pointing at
 * it; null when it is in the open or no way out from under the panels is found (it is then marked where it is).
 */
export function arrowToCovered(at: ScreenPoint, covered: readonly CoveredBox[], width: number, height: number): MarkShape | null {
  if (!panelAt(covered, at)) return null;
  const place = outOfPanels(at, covered, width, height);
  return place ? { kind: 'edge', at: place, angle: Math.atan2(at[1] - place[1], at[0] - place[0]) } : null;
}

/** An arrow at the edge of the view, moved out from under a panel (it keeps its direction); as it is when none is open. */
function edgeArrowInOpen(frame: Frame, v: Vec3): MarkShape {
  const arrow = edgeArrow(frame, v);
  if (arrow.kind !== 'edge') return arrow;
  const place = outOfPanels(arrow.at, frame.view.covered ?? [], frame.view.width, frame.view.height);
  return place ? { ...arrow, at: place } : arrow;
}

/**
 * A circle about a drawn position (relative to the eye) whose angular radius is `angle`; the arrow beside the panel
 * when it lies under one; the arrow at the edge when it is outside the view.
 */
function spotOrEdge(frame: Frame, position: Vec3, angle: number): MarkShape {
  const v = toCamera(frame, position);
  const at = toScreen(frame, v);
  if (!inside(frame, at)) return edgeArrowInOpen(frame, v);
  const covered = arrowToCovered(at, frame.view.covered ?? [], frame.view.width, frame.view.height);
  if (covered) return covered;
  const largest = 0.3 * Math.min(frame.view.width, frame.view.height);
  return { kind: 'spot', at, radius: Math.min(largest, Math.max(SPOT_MIN_RADIUS, frame.focal * Math.tan(Math.min(angle, 1.2)))) };
}

/**
 * The angular radius of a thing of radius `radius` at the rest-frame displacement `rel`, as drawn: in the
 * seen view its width is divided by its Doppler factor at the same distance, in the measured view it keeps
 * its width at the measured distance.
 */
function drawnAngle(rel: Vec3, radius: number, frame: Frame): { readonly position: Vec3; readonly angle: number } {
  const { position, doppler } = apparentPoint(rel, frame.view.beta, frame.view.optical);
  const optical = frame.view.optical;
  const width = radius * (1 - optical + optical / doppler);
  return { position, angle: Math.atan2(width, Math.hypot(position.x, position.y, position.z)) };
}

// ---------------------------------------------------------------------------
// Curves: cones about the direction of motion, lines on the ground
// ---------------------------------------------------------------------------

const SEGMENTS = 96;

/** Shapes of curves through drawn directions (relative to the eye); null when no curve has a point. */
function curvesOf(frame: Frame, curves: readonly (readonly Vec3[])[]): MarkShape | null {
  const { width, height } = frame.view;
  const paths: ScreenPoint[][] = [];
  let anchor: ScreenPoint | null = null;
  let anchorScore = Infinity;
  let seen = false;
  let nearest: Vec3 | null = null;
  let nearestCloseness = -Infinity;
  for (const curve of curves) {
    let path: ScreenPoint[] = [];
    for (const direction of curve) {
      const v = toCamera(frame, direction);
      const c = closeness(v);
      if (c > nearestCloseness) {
        nearestCloseness = c;
        nearest = v;
      }
      const p = toScreen(frame, v);
      // a point far outside the view is left out (the curve resumes when it comes back)
      if (!p || Math.abs(p[0] - width / 2) > 6 * width || Math.abs(p[1] - height / 2) > 6 * height) {
        if (path.length > 1) paths.push(path);
        path = [];
        continue;
      }
      path.push(p);
      if (!inside(frame, p)) continue;
      seen = true;
      // the label where the curve passes the upper left of the view (the guide layer labels its circles at the upper
      // right), out from under the panels
      if (p[0] > 24 && p[0] < width - 140 && p[1] > 40 && p[1] < height - 60 && !underPanel(frame, p)) {
        const score = Math.hypot(p[0] - width * 0.3, p[1] - height * 0.3);
        if (score < anchorScore) {
          anchorScore = score;
          anchor = p;
        }
      }
    }
    if (path.length > 1) paths.push(path);
  }
  if (seen) return { kind: 'curves', paths, anchor };
  return nearest ? edgeArrowInOpen(frame, nearest) : null;
}

/** The cone of apparent half-angle `angle` about the direction of motion (−z), as drawn in the seen view. */
function apparentCone(angle: number): Vec3[] {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return Array.from({ length: SEGMENTS + 1 }, (_, i) => {
    const psi = (i / SEGMENTS) * 2 * Math.PI;
    return { x: sin * Math.cos(psi), y: sin * Math.sin(psi), z: -cos };
  });
}

/** The rest-frame cone of half-angle `angle` about the direction of motion, as drawn in the view of the moment. */
function restCone(angle: number, frame: Frame): Vec3[] {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return Array.from({ length: SEGMENTS + 1 }, (_, i) => {
    const psi = (i / SEGMENTS) * 2 * Math.PI;
    return apparentDirection({ x: sin * Math.cos(psi), y: sin * Math.sin(psi), z: -cos }, frame.view.beta, frame.view.optical);
  });
}

/** Below this velocity the Doppler cones are not drawn: they are not yet distinct (as in the guide layer). */
export const CONES_FROM_BETA = 0.02;

/** Cones defined by a Doppler factor mean something only in the seen view, where the colours shift. */
const dopplerShown = (frame: Frame): boolean => frame.view.optical >= 0.5 && frame.view.beta > CONES_FROM_BETA;

// ---------------------------------------------------------------------------
// Things of the avenue
// ---------------------------------------------------------------------------

/** The marks that are objects placed in every block of a kind. */
export const OBJECT_MARKS = [
  'crossing',
  'signal',
  'lamp',
  'car',
  'tree',
  'bench',
  'parasol',
  'gantry',
  'facade',
  'window',
] as const;
export type ObjectMark = (typeof OBJECT_MARKS)[number];

/** A thing to mark: a point in block-local coordinates (heights in the world) and its radius, m. */
interface Thing {
  readonly at: Vec3;
  readonly radius: number;
}

/**
 * The centres of the bounds of the models marked at their middle, in model units: read from the files
 * (src/ui/__tests__/pointing.test.ts checks them against public/models).
 */
export const MODEL_CENTRES: Readonly<Record<string, readonly [number, number, number]>> = {
  '/models/tree-large.glb': [0, 0.3835, 0],
  '/models/tree-small.glb': [0, 0.2835, 0],
  '/models/bench.glb': [0, 0.2045, 0],
  '/models/parasol.glb': [0, 0.225, 0],
  '/models/sign-highway.glb': [-0.041, 0.411, 0],
  '/models/vehicle-red.glb': [0, 0.65, 0],
  '/models/vehicle-yellow.glb': [0, 0.775, 0],
  '/models/vehicle-purple.glb': [0, 0.65, 0],
  '/models/vehicle-motorcycle.glb': [0, 0.633, 0.1],
};

/** The radius of the circle about a thing of each kind, m. */
const RADII: Record<ObjectMark, number> = {
  crossing: 4,
  signal: 0.5,
  lamp: 0.8,
  car: 2.2,
  tree: 2.5,
  bench: 1,
  parasol: 1.6,
  gantry: 4.5,
  facade: 5,
  window: 5,
};

/**
 * The facades of the first row of buildings stand 10.4–10.9 m from the centre line (layout.ts). The lit
 * windows are chosen per pane while the blocks are built (build.ts), so the mark of the windows is the
 * facade at the height of the upper floors, and the mark of a building the facade lower down.
 */
const FACADE_X = 10.6;
const FACADE_Y = 5;
const WINDOWS_Y = 9;

/** The centre of a placed model, transformed as build.ts places it (scale, then the turn about the vertical, then the shift). */
function placedCentre(placement: Placement): Vec3 {
  const [cx, cy, cz] = MODEL_CENTRES[placement.model];
  const [sx, sy, sz] = placement.scale;
  const cos = Math.cos(placement.yaw);
  const sin = Math.sin(placement.yaw);
  const [tx, ty, tz] = placement.position;
  return {
    x: cx * sx * cos + cz * sz * sin + tx,
    y: cy * sy + ty,
    z: -cx * sx * sin + cz * sz * cos + tz,
  };
}

const isModel =
  (pattern: RegExp) =>
  (placement: Placement): boolean =>
    pattern.test(placement.model);

/** The things of every kind in one block variant. */
function variantThings(variant: number): Record<ObjectMark, Thing[]> {
  const { placements, panels } = chunkLayout(variant);
  const thing = (radius: number) => (at: Vec3) => ({ at, radius });
  const centres = (pattern: RegExp, kind: ObjectMark): Thing[] =>
    placements.filter(isModel(pattern)).map(placedCentre).map(thing(RADII[kind]));
  const buildings = placements.filter((p) => p.kind === 'building' && Math.abs(p.position[0]) < 20);
  const facade = (y: number, kind: ObjectMark): Thing[] =>
    buildings.map((p) => ({ at: { x: Math.sign(p.position[0]) * FACADE_X, y, z: p.position[2] }, radius: RADII[kind] }));
  return {
    crossing: placements
      .filter(isModel(/\/road-crossing\.glb$/))
      .map((p) => ({ at: { x: 0, y: ROAD_SURFACE_Y, z: p.position[2] }, radius: RADII.crossing })),
    // the lit lens of the signals that face the observer: those on the right (layout.ts)
    signal: panels
      .filter((panel) => panel.emitter !== EMITTER.none && panel.centre[0] > 0)
      .map((panel) => ({ at: { x: panel.centre[0], y: panel.centre[1], z: panel.centre[2] }, radius: RADII.signal })),
    // the light-emitting face of each luminaire
    lamp: chunkLuminaires().map((l) => ({ at: { x: l.position[0], y: l.position[1], z: l.position[2] }, radius: RADII.lamp })),
    car: centres(/\/vehicle-/, 'car'),
    tree: centres(/\/tree-/, 'tree'),
    bench: centres(/\/bench\.glb$/, 'bench'),
    parasol: centres(/\/parasol\.glb$/, 'parasol'),
    gantry: centres(/\/sign-highway\.glb$/, 'gantry'),
    facade: facade(FACADE_Y, 'facade'),
    window: facade(WINDOWS_Y, 'window'),
  };
}

let things: Record<ObjectMark, Thing[]>[] | null = null;

function thingsOf(variant: number, kind: ObjectMark): readonly Thing[] {
  things ??= Array.from({ length: VARIANT_COUNT }, (_, v) => variantThings(v));
  return things[variant][kind];
}

/** Things nearer than this are not marked: they fill the view or lie beside the eye, m. */
const NEAREST_MARKED = 3;

/**
 * The rest-frame displacements from the eye of every thing of a kind in the part of the model that is drawn
 * whole (the blocks stand where Simulation.tsx puts them for this `travel`; the dissolving ends are left out).
 */
export function thingsAround(kind: ObjectMark, travel: number): { readonly rel: Vec3; readonly radius: number }[] {
  const result: { rel: Vec3; radius: number }[] = [];
  for (let index = 0; index < CHUNK_COUNT; index++) {
    const centre = blockCentreAhead(index, travel);
    for (const { at, radius } of thingsOf(index % VARIANT_COUNT, kind)) {
      const rel = { x: at.x, y: at.y - OBSERVER_Y, z: at.z - centre };
      const forward = -rel.z;
      if (forward >= FADE_AHEAD_START || forward <= -FADE_BEHIND_START) continue;
      if (Math.hypot(rel.x, rel.y, rel.z) < NEAREST_MARKED) continue;
      result.push({ rel, radius });
    }
  }
  return result;
}

/**
 * The nearest thing of a kind that is in the view and not under a panel; failing that the nearest one in
 * the view (by an arrow beside the panel over it); failing that the arrow towards the one closest to the view.
 */
function nearestThing(frame: Frame, kind: ObjectMark): MarkShape | null {
  // [in the open, under a panel]
  const best: [MarkShape | null, MarkShape | null] = [null, null];
  const bestDistance = [Infinity, Infinity];
  let closest: Vec3 | null = null;
  let closestCloseness = -Infinity;
  for (const { rel, radius } of thingsAround(kind, frame.view.travel)) {
    const distance = Math.hypot(rel.x, rel.y, rel.z);
    const { position, angle } = drawnAngle(rel, radius, frame);
    const v = toCamera(frame, position);
    const at = toScreen(frame, v);
    if (inside(frame, at)) {
      const slot = underPanel(frame, at) ? 1 : 0;
      if (distance < bestDistance[slot]) {
        bestDistance[slot] = distance;
        best[slot] = spotOrEdge(frame, position, angle);
      }
    } else if (closeness(v) > closestCloseness) {
      closestCloseness = closeness(v);
      closest = v;
    }
  }
  if (best[0] ?? best[1]) return best[0] ?? best[1];
  return closest ? edgeArrowInOpen(frame, closest) : null;
}

// ---------------------------------------------------------------------------
// Places and directions
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180;

/** A unit rest-frame direction at an elevation and an azimuth from the direction of motion towards +x, deg. */
function skyDirection(elevationDeg: number, azimuthDeg: number): Vec3 {
  const e = elevationDeg * DEG;
  const a = azimuthDeg * DEG;
  return { x: Math.sin(a) * Math.cos(e), y: Math.sin(e), z: -Math.cos(a) * Math.cos(e) };
}

/** Places a fixed distance from the eye (rest frame, relative to the eye) and their radii, m. */
export const PLACES = {
  /** the road a few metres ahead, between the lanes */
  road: { rel: { x: 0, y: ROAD_SURFACE_Y - OBSERVER_Y, z: -12 }, radius: 2 },
  /** the right-hand pavement a little further on, where it is in the view of a narrow screen too */
  pavement: { rel: { x: 8.4, y: PAVEMENT_Y - OBSERVER_Y, z: -30 }, radius: 2 },
  /** the middle of the stretch over which the avenue dissolves ahead */
  farEnd: { rel: { x: 0, y: ROAD_SURFACE_Y - OBSERVER_Y, z: -(FADE_AHEAD_START + FADE_AHEAD_END) / 2 }, radius: 10 },
} as const;

/** Directions of the sky (rest frame) and the angular radius of the circle about them, rad. */
export const DIRECTIONS = {
  motion: { direction: { x: 0, y: 0, z: -1 }, radius: 0 },
  behind: { direction: { x: 0, y: 0, z: 1 }, radius: 0 },
  moon: { direction: skyDirection(SCENARIO.moon.elevationDeg, SCENARIO.moon.azimuthDeg), radius: 2 * DEG },
  /** the patch of sky above the avenue ahead, where the stars crowd at speed */
  stars: { direction: skyDirection(22, 0), radius: 6 * DEG },
  /**
   * the sky low over the avenue ahead, where the city's light makes it brightest: as low as it is seldom
   * hidden, since below about 12° the sign gantry (6 to 7 m high, every third block) covers it from 50 m away
   */
  sky: { direction: skyDirection(15, 0), radius: 3 * DEG },
  /** the ground beyond the end of the avenue, just below the horizon */
  ground: { direction: skyDirection(-Math.atan(OBSERVER_Y / (2 * FADE_AHEAD_END)) / DEG, 0), radius: 1.5 * DEG },
} as const;

/** The line of the measuring grid that is drawn nearest ahead in the view, across the carriageway. */
function gridLine(frame: Frame): MarkShape | null {
  // a line every MEASURING_GRID_M of rest length, where (travel + along) is a whole number of spacings (city.ts)
  const phase = ((frame.view.travel % MEASURING_GRID_M) + MEASURING_GRID_M) % MEASURING_GRID_M;
  const line = (along: number): Vec3[] =>
    Array.from({ length: 13 }, (_, i) => {
      const x = CARRIAGEWAY_HALF_WIDTH * (i / 6 - 1);
      return apparentPoint({ x, y: ROAD_SURFACE_Y - OBSERVER_Y, z: -along }, frame.view.beta, frame.view.optical).position;
    });
  let first: Vec3[] | null = null;
  for (let k = 1; k * MEASURING_GRID_M - phase < FADE_AHEAD_START; k++) {
    const along = k * MEASURING_GRID_M - phase;
    if (along < NEAREST_MARKED) continue;
    const points = line(along);
    first ??= points;
    if (inside(frame, toScreen(frame, toCamera(frame, points[6])))) return curvesOf(frame, [points]);
  }
  return first ? curvesOf(frame, [first]) : null;
}

/**
 * The shape of a mark of the scene in this frame, or null when the thing it marks is not in the picture:
 * a Doppler cone at rest or in the measured view, a ring of lamp light not yet formed, the glow while it
 * is switched off or not yet visible, the grid in the seen view.
 */
export function resolveMark(mark: SceneMark, view: PointingView): MarkShape | null {
  if (!(view.width > 0 && view.height > 0)) return null;
  const frame = frameOf(view);
  switch (mark) {
    case 'motion':
    case 'behind':
    case 'moon':
    case 'stars':
    case 'sky':
    case 'ground': {
      const { direction, radius } = DIRECTIONS[mark];
      const drawn = apparentDirection(direction, view.beta, view.optical);
      // an angle on the sky shrinks by the Doppler factor in the seen view
      const doppler = aberratePoint(direction, frame.boost).doppler;
      return spotOrEdge(frame, drawn, radius * (1 - view.optical + view.optical / doppler));
    }
    case 'road':
    case 'pavement':
    case 'farEnd': {
      const { rel, radius } = PLACES[mark];
      const { position, angle } = drawnAngle(rel, radius, frame);
      return spotOrEdge(frame, position, angle);
    }
    case 'transverse':
      return curvesOf(frame, [restCone(Math.PI / 2, frame)]);
    case 'neutral':
      return dopplerShown(frame) ? curvesOf(frame, [apparentCone(neutralConeAngle(view.beta))]) : null;
    case 'ring': {
      if (!dopplerShown(frame)) return null;
      const edges = [ringEdges(view.beta).inner, ringEdges(view.beta).outer].filter((angle) => !Number.isNaN(angle));
      return edges.length > 0 ? curvesOf(frame, edges.map(apparentCone)) : null;
    }
    case 'glow': {
      const angle = apparentAngleOfDoppler(GLOW_VISIBLE_DOPPLER, view.beta);
      return view.thermal && dopplerShown(frame) && !Number.isNaN(angle) ? curvesOf(frame, [apparentCone(angle)]) : null;
    }
    case 'grid':
      return view.optical < 0.5 ? gridLine(frame) : null;
    default:
      return nearestThing(frame, mark);
  }
}

// ---------------------------------------------------------------------------
// What the panel points at now
// ---------------------------------------------------------------------------

/** What is marked: the pointing of a text, and a name of its source that tells one text from another. */
export interface PointerTarget {
  readonly source: string;
  readonly pointing: Pointing;
}

let target: PointerTarget | null = null;
const listeners = new Set<() => void>();

export function getPointerTarget(): PointerTarget | null {
  return target;
}

export function subscribePointerTarget(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Sets what is marked; null clears it. The same source again changes nothing. */
export function setPointerTarget(next: PointerTarget | null): void {
  if ((next?.source ?? null) === (target?.source ?? null)) return;
  target = next;
  listeners.forEach((listener) => listener());
}
