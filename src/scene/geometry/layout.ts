/**
 * Layout of the avenue.
 *
 * The avenue is assembled from `CHUNK_COUNT` blocks of `CHUNK_LENGTH` metres that
 * are recycled as the observer advances. Cross-section (x across, y up, the
 * observer travels towards −z along x = 0):
 *
 *   |x| <  4.8 m   carriageway, driving surface at y = 0.10 m
 *   |x| <  6.0 m   kerb strips of the road tiles, at y = 0.20 m
 *   |x| < 10.8 m   pavements, surface at y = 0.235 m
 *   |x| ≈ 15.8 m   first row of buildings (facades at |x| ≈ 10.4–10.9 m)
 *   |x| ≈ 27.5 m   second row of towers
 *
 * Street luminaires stand every 18 m on both sides, at the edge of the pavements;
 * their heads reach over the kerb, 6.5 m above the ground.
 *
 * Everything in the avenue is a model of the kit in public/models, placed as it
 * is. The only geometry added here are the lenses of the traffic signals, which
 * the signal model lacks.
 */

import { SCENARIO } from '@/physics/scenario';
import { type EmitterCode, EMITTER } from '../emitters';

export const CHUNK_LENGTH = 36;
export const CHUNK_COUNT = 16;
export const CHUNKS_BEHIND = 3;
export const VARIANT_COUNT = 6;

/**
 * Spacing of the measuring grid drawn on the ground in the measured view, m of rest length along
 * the avenue. The shader draws it and the panel "Why does it look like this?" names it.
 */
export const MEASURING_GRID_M = 10;

/** Height of the driving surface, m (the road model's kerb strips rise to 0.20 m). */
export const ROAD_SURFACE_Y = 0.1;

/** Half-width of the driving surface (where the kerb strips of the road tile begin) and of the road tile, m. */
export const CARRIAGEWAY_HALF_WIDTH = 4.8;
export const ROAD_HALF_WIDTH = 6;

/** Height of the pavement surface, m (its decorative paving stones stand 5 cm proud of it). */
export const PAVEMENT_Y = 0.235;

/** Base of the first row of buildings: sunk 3 cm below the pavement so that no gap shows over its edge. */
const BUILDING_BASE_Y = PAVEMENT_Y - 0.03;

const M = (name: string): string => `/models/${name}.glb`;

/** Every model the layout can place. Only palette-textured models are used: their colours bake into vertices. */
export const MODEL_PATHS = [
  M('building-a'),
  M('building-b'),
  M('building-c'),
  M('building-d'),
  M('building-e'),
  M('building-f'),
  M('building-g'),
  M('building-h'),
  M('skyscraper-a'),
  M('skyscraper-b'),
  M('skyscraper-c'),
  M('skyscraper-d'),
  M('road-straight'),
  M('road-crossing'),
  M('pavement'),
  M('light-curved'),
  M('traffic-light'),
  M('sign-highway'),
  M('tree-large'),
  M('tree-small'),
  M('bench'),
  M('parasol'),
  M('vehicle-red'),
  M('vehicle-yellow'),
  M('vehicle-purple'),
  M('vehicle-motorcycle'),
] as const;

export type ModelPath = (typeof MODEL_PATHS)[number];

/** What a placed model is, which decides how finely it is tessellated. */
export type PlacementKind = 'ground' | 'building' | 'prop';

/** What the palette of a model marks as a light source (see palette.ts). */
export type ModelRole = 'building' | 'luminaire' | 'plain';

export interface Placement {
  readonly model: ModelPath;
  readonly kind: PlacementKind;
  readonly position: readonly [number, number, number];
  /** Rotation about the vertical axis, rad. */
  readonly yaw: number;
  readonly scale: readonly [number, number, number];
}

/** A rectangular face added in front of a model that lacks it: the lenses of the traffic signals. */
export interface Panel {
  readonly centre: readonly [number, number, number];
  /** Half-extent vectors spanning the rectangle. */
  readonly u: readonly [number, number, number];
  readonly v: readonly [number, number, number];
  readonly colour: readonly [number, number, number];
  /** What the panel emits (see emitters.ts) and its level relative to the scenario's luminance for that kind. */
  readonly emitter: EmitterCode;
  readonly level: number;
}

/** A street luminaire as a light source for the baked irradiance. */
export interface Luminaire {
  readonly position: readonly [number, number, number];
}

export interface ChunkLayout {
  readonly placements: Placement[];
  readonly panels: Panel[];
}

/** Area and centroid of a simple polygon in the plane (shoelace formula). */
function polygon(outline: ReadonlyArray<readonly [number, number]>): { area: number; centroid: [number, number] } {
  let doubleArea = 0;
  let cx = 0;
  let cy = 0;
  outline.forEach(([x0, y0], index) => {
    const [x1, y1] = outline[(index + 1) % outline.length];
    const cross = x0 * y1 - x1 * y0;
    doubleArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  });
  return { area: Math.abs(doubleArea) / 2, centroid: [cx / (3 * doubleArea), cy / (3 * doubleArea)] };
}

// --- The street luminaire. The lamp model carries its own light-emitting face: the
// underside of its head, which the palette marks with the lamp-light colour — a
// rectangle that tapers towards the arm. Its height and outline (x, z) in model
// units are recorded here because the lighting needs to know where the light comes
// from; the asset test checks them against the file.
export const LAMP_MODEL = M('light-curved') as ModelPath;
export const LAMP_SCALE: readonly [number, number, number] = [9.2, 9.6, 9.2];
export const LAMP_FACE = {
  y: 0.6528,
  outline: [
    [-0.025, -0.2],
    [0.025, -0.2],
    [0.025, -0.15],
    [0.0125, -0.1],
    [-0.0125, -0.1],
    [-0.025, -0.15],
  ],
} as const;
const LAMP_FACE_SHAPE = polygon(LAMP_FACE.outline);
const LAMP_BASE_X = 6.25;

/** z-positions of the luminaires within a chunk: an even spacing that continues across chunks. */
export const LUMINAIRE_Z = [-9, 9] as const;
export const LUMINAIRE_SPACING = CHUNK_LENGTH / LUMINAIRE_Z.length;

/** Centroid of a luminaire's emitting face: lateral offset from the centre line and height, m. */
export const LUMINAIRE_X = LAMP_BASE_X + LAMP_FACE_SHAPE.centroid[1] * LAMP_SCALE[2];
export const LUMINAIRE_Y = PAVEMENT_Y + LAMP_FACE.y * LAMP_SCALE[1];

/** Area of the emitting face, m². */
export const LUMINAIRE_FACE_AREA = LAMP_FACE_SHAPE.area * LAMP_SCALE[0] * LAMP_SCALE[2];

/** What the palette of a model can mark as a light source. */
export function modelRole(path: ModelPath): ModelRole {
  if (path === LAMP_MODEL) return 'luminaire';
  return /\/(building|skyscraper)-/.test(path) ? 'building' : 'plain';
}

/** All luminaires of one chunk (chunk-local coordinates). The pattern is identical in every chunk. */
export function chunkLuminaires(): Luminaire[] {
  const result: Luminaire[] = [];
  for (const side of [-1, 1]) {
    for (const z of LUMINAIRE_Z) result.push({ position: [side * LUMINAIRE_X, LUMINAIRE_Y, z] });
  }
  return result;
}

// --- The traffic signal. Its head is a plain box under a visor: the model has no
// lenses, so three are placed just in front of the face that looks along model −x
// (model units; the asset test checks that they lie on that face).
export const SIGNAL_MODEL = M('traffic-light') as ModelPath;
export const SIGNAL_SCALE: readonly [number, number, number] = [5.6, 5.8, 5.6];
export const SIGNAL_HEAD = {
  /** x of the head's front face, and of the lenses a little in front of it. */
  faceX: -0.063,
  lensX: -0.066,
  /** Centre of the head across its face. */
  lensZ: -0.436,
  lensRadius: 0.019,
  /** Heights of the red, amber and green lens. */
  lensY: [0.958, 0.908, 0.858],
} as const;

const FRONT_ROW: ReadonlyArray<{ model: ModelPath; scale: readonly [number, number, number]; x: number }> = [
  { model: M('building-a') as ModelPath, scale: [10.6, 11.5, 10.5], x: 15.8 },
  { model: M('building-f') as ModelPath, scale: [10.8, 11.8, 10.5], x: 15.8 },
  { model: M('skyscraper-a') as ModelPath, scale: [8.0, 10.0, 8.0], x: 16.0 },
  { model: M('building-b') as ModelPath, scale: [10.4, 11.5, 10.5], x: 15.8 },
  { model: M('building-g') as ModelPath, scale: [10.4, 11.8, 10.5], x: 15.8 },
  { model: M('skyscraper-b') as ModelPath, scale: [7.9, 9.6, 7.9], x: 16.0 },
  { model: M('building-d') as ModelPath, scale: [10.8, 11.5, 10.5], x: 15.8 },
  { model: M('building-h') as ModelPath, scale: [10.6, 11.5, 10.5], x: 15.8 },
  { model: M('skyscraper-c') as ModelPath, scale: [8.2, 9.8, 8.0], x: 16.0 },
  { model: M('building-c') as ModelPath, scale: [10.6, 11.5, 10.0], x: 15.8 },
  { model: M('building-e') as ModelPath, scale: [6.5, 11.8, 10.5], x: 15.8 },
  { model: M('skyscraper-d') as ModelPath, scale: [8.2, 9.4, 8.0], x: 16.0 },
];

const BACK_ROW: ReadonlyArray<{ model: ModelPath; scale: readonly [number, number, number] }> = [
  { model: M('skyscraper-a') as ModelPath, scale: [8.5, 11.5, 8.5] },
  { model: M('skyscraper-c') as ModelPath, scale: [8.5, 11.0, 8.5] },
  { model: M('building-f') as ModelPath, scale: [11.0, 13.5, 11.0] },
  { model: M('skyscraper-b') as ModelPath, scale: [8.5, 11.0, 8.5] },
  { model: M('building-g') as ModelPath, scale: [11.0, 13.5, 11.0] },
  { model: M('skyscraper-d') as ModelPath, scale: [8.5, 10.5, 8.5] },
];

const VEHICLES: ReadonlyArray<{ model: ModelPath; scale: number }> = [
  { model: M('vehicle-red') as ModelPath, scale: 1.48 },
  { model: M('vehicle-yellow') as ModelPath, scale: 1.48 },
  { model: M('vehicle-purple') as ModelPath, scale: 1.48 },
  { model: M('vehicle-motorcycle') as ModelPath, scale: 1.32 },
];

const TREES: ReadonlyArray<{ model: ModelPath; scale: number }> = [
  { model: M('tree-large') as ModelPath, scale: 7.5 },
  { model: M('tree-small') as ModelPath, scale: 7.8 },
];

/** Rotates the model-space offset (x, z) by `yaw` about the vertical axis. */
function rotate(x: number, z: number, yaw: number): [number, number] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [x * c + z * s, -x * s + z * c];
}

/** Layout of one of the `VARIANT_COUNT` block variants, in chunk-local coordinates (z ∈ [−18, 18]). */
export function chunkLayout(variant: number): ChunkLayout {
  const placements: Placement[] = [];
  const panels: Panel[] = [];
  const tiles = [-12, 0, 12];
  const hasCrossing = variant % 2 === 0;

  // carriageway and pavements
  tiles.forEach((z, index) => {
    placements.push({
      model: (hasCrossing && index === 2 ? M('road-crossing') : M('road-straight')) as ModelPath,
      kind: 'ground',
      position: [0, 0, z],
      yaw: Math.PI / 2,
      scale: [CHUNK_LENGTH / 3, 10, 2 * ROAD_HALF_WIDTH],
    });
    for (const side of [-1, 1]) {
      placements.push({
        model: M('pavement') as ModelPath,
        kind: 'ground',
        position: [side * 8.4, 0, z],
        yaw: 0,
        scale: [4.8, 4.7, 12],
      });
    }
  });

  // first row of buildings, facades towards the street
  for (const side of [-1, 1]) {
    tiles.forEach((z, slot) => {
      const spec = FRONT_ROW[(variant * 3 + slot * 5 + (side > 0 ? 4 : 0)) % FRONT_ROW.length];
      placements.push({
        model: spec.model,
        kind: 'building',
        position: [side * spec.x, BUILDING_BASE_Y, z],
        yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2,
        scale: spec.scale,
      });
    });
  }

  // second row: one tower per side, staggered
  for (const side of [-1, 1]) {
    const spec = BACK_ROW[(variant * 2 + (side > 0 ? 3 : 0)) % BACK_ROW.length];
    placements.push({
      model: spec.model,
      kind: 'building',
      position: [side * 27.5, 0, side * (variant % 2 === 0 ? 9 : -9)],
      yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2,
      scale: spec.scale,
    });
  }

  // street luminaires: the arm (model −z) is turned to overhang the carriageway
  for (const side of [-1, 1]) {
    const yaw = side < 0 ? -Math.PI / 2 : Math.PI / 2;
    for (const z of LUMINAIRE_Z) {
      // the light-emitting face is part of the model (see LAMP_FACE)
      placements.push({
        model: LAMP_MODEL,
        kind: 'prop',
        position: [side * LAMP_BASE_X, PAVEMENT_Y, z],
        yaw,
        scale: LAMP_SCALE,
      });
    }
  }

  // traffic signals at the crossing. The lens faces model −x; on the right-hand side that is towards the observer.
  if (hasCrossing) {
    for (const side of [-1, 1]) {
      const yaw = side < 0 ? -Math.PI / 2 : Math.PI / 2;
      const base: readonly [number, number, number] = [side * LAMP_BASE_X, PAVEMENT_Y, 9.2];
      placements.push({ model: SIGNAL_MODEL, kind: 'prop', position: base, yaw, scale: SIGNAL_SCALE });
      // one lens is lit (scenario.ts); the others keep the dark tint of their glass
      const lenses: ReadonlyArray<{ name: 'red' | 'amber' | 'green'; emitter: EmitterCode }> = [
        { name: 'red', emitter: EMITTER.signalRed },
        { name: 'amber', emitter: EMITTER.signalAmber },
        { name: 'green', emitter: EMITTER.signalGreen },
      ];
      lenses.forEach((lens, index) => {
        const [ox, oz] = rotate(SIGNAL_HEAD.lensX * SIGNAL_SCALE[0], SIGNAL_HEAD.lensZ * SIGNAL_SCALE[2], yaw);
        const [ux, uz] = rotate(0, SIGNAL_HEAD.lensRadius * SIGNAL_SCALE[2], yaw);
        panels.push({
          centre: [base[0] + ox, base[1] + SIGNAL_HEAD.lensY[index] * SIGNAL_SCALE[1], base[2] + oz],
          u: [ux, 0, uz],
          v: [0, SIGNAL_HEAD.lensRadius * SIGNAL_SCALE[1], 0],
          colour: SCENARIO.signals.glassAlbedo[lens.name],
          emitter: lens.name === SCENARIO.signals.aspect ? lens.emitter : EMITTER.none,
          level: 1,
        });
      });
    }
  }

  // overhead gantry
  if (variant % 3 === 1) {
    placements.push({
      model: M('sign-highway') as ModelPath,
      kind: 'prop',
      position: [0, PAVEMENT_Y, -6],
      yaw: Math.PI / 2,
      scale: [9, 8.8, 12.6],
    });
  }

  // street trees
  for (const side of [-1, 1]) {
    [-3, 15].forEach((z, index) => {
      const tree = TREES[(variant + index + (side > 0 ? 1 : 0)) % TREES.length];
      placements.push({
        model: tree.model,
        kind: 'prop',
        position: [side * 7.3, PAVEMENT_Y, z],
        yaw: (variant + index) * 1.3,
        scale: [tree.scale, tree.scale, tree.scale],
      });
    });
  }

  // street furniture
  for (const side of [-1, 1]) {
    placements.push({
      model: M('bench') as ModelPath,
      kind: 'prop',
      position: [side * 9.3, PAVEMENT_Y, -2 * side],
      yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2,
      scale: [2.6, 2.6, 2.6],
    });
    if ((variant + (side > 0 ? 1 : 0)) % 2 === 0) {
      placements.push({
        model: M('parasol') as ModelPath,
        kind: 'prop',
        position: [side * 9.5, PAVEMENT_Y, 5.5 * side],
        yaw: 0,
        scale: [4.2, 4.2, 4.2],
      });
    }
  }

  // parked vehicles: the left lane faces the observer, the right lane faces away
  const slots = [
    { lane: -1, z: -10.5 },
    { lane: 1, z: -1.5 },
    { lane: -1, z: 7.5 },
  ];
  slots.forEach((slot, index) => {
    if ((variant + index) % 3 === 2) return;
    const vehicle = VEHICLES[(variant * 2 + index) % VEHICLES.length];
    placements.push({
      model: vehicle.model,
      kind: 'prop',
      position: [slot.lane * 2.6, ROAD_SURFACE_Y, slot.z],
      yaw: slot.lane < 0 ? 0 : Math.PI,
      scale: [vehicle.scale, vehicle.scale, vehicle.scale],
    });
  });

  return { placements, panels };
}
