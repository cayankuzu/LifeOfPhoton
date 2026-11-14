/**
 * "What is on the screen?": the second view of the panel "Why does it look like this?". Every kind
 * of thing the reader can see — in the scene, among the guide marks, in the instruments, on the speed
 * rail and in the top bar — with a short explanation in plain words (the dictionary, under
 * `inventory`), the place it is pointed out on the screen, and for some a sentence with the numbers
 * of this moment.
 *
 * A pure module: the texts come from the dictionary passed in, the numbers from the state passed in.
 * src/ui/__tests__/inventory.test.ts checks the list against the elements of the interface, the
 * marks against the layout, and the numbers in the texts against the scenario and the physics.
 */

import { classifyWavelength } from '@/physics/bands';
import { SPEED_OF_LIGHT } from '@/physics/constants';
import { headOnDopplerFactor, lorentzFactor } from '@/physics/kinematics';
import { aberrate, apparentAngleOfDoppler, neutralConeAngle, transversePlaneApparentAngle } from '@/physics/optics';
import { SCENARIO, slowMotionFactor } from '@/physics/scenario';
import {
  formatAngle,
  formatFixed,
  formatInteger,
  formatLength,
  formatSignificant,
  formatTemperature,
  formatWavelength,
  type Quantity,
} from '@/i18n/format';
import type { Messages } from '@/i18n/messages';
import { CHUNK_LENGTH, FADE_AHEAD_END, FADE_BEHIND_END, LUMINAIRE_SPACING, MEASURING_GRID_M } from '@/scene/geometry/layout';
import type { Language } from '@/state/simulation';
import { type ExplainItem, type ExplainKey, explainConstants, GLOW_VISIBLE_DOPPLER } from './explain';

/** The entries, by group, in the order the panel lists them. */
export const INVENTORY = {
  scene: [
    'avenue',
    'road',
    'crossings',
    'pavements',
    'buildings',
    'windows',
    'lamps',
    'signals',
    'cars',
    'trees',
    'benches',
    'parasols',
    'gantry',
    'sky',
    'moon',
    'stars',
    'ground',
    'farEnd',
    'ring',
    'heatGlow',
    'grid',
  ],
  guides: ['crosshair', 'transverseCircle', 'neutralCircle'],
  instruments: [
    'dock',
    'collapse',
    'sentence',
    'properTime',
    'resetClocks',
    'streetTime',
    'road100',
    'transverse',
    'neutralCone',
    'ahead555',
    'behind555',
    'ambient',
    'exposure',
    'spectrum',
    'spectrumMarkers',
  ],
  rail: ['coach', 'beta', 'speed', 'gamma', 'clockRate', 'doppler', 'slider', 'presets', 'steps'],
  bar: [
    'title',
    'view',
    'thermal',
    'guides',
    'lens',
    'pause',
    'why',
    'explainer',
    'tour',
    'dossier',
    'dossierSheet',
    'shortcuts',
    'language',
    'lookAhead',
  ],
} as const;

export type InventoryGroup = keyof typeof INVENTORY;
export type InventoryId = (typeof INVENTORY)[InventoryGroup][number];

export const INVENTORY_GROUPS = Object.keys(INVENTORY) as InventoryGroup[];
export const INVENTORY_IDS: readonly InventoryId[] = INVENTORY_GROUPS.flatMap((group) => INVENTORY[group]);

/**
 * What a pointer can mark in the scene. Directions and cones are about the direction of motion;
 * points are found in the layout of the avenue (src/ui/pointing.ts places them as the shaders do).
 */
export type SceneMark =
  /** the direction of motion, and the one opposite */
  | 'motion'
  | 'behind'
  /** cones about the direction of motion: θ = 90°, D = 1, the ring of lamp light, the glow of the surroundings */
  | 'transverse'
  | 'neutral'
  | 'ring'
  | 'glow'
  /** directions in the sky (the sky itself: the glow of the city's light above the horizon) */
  | 'moon'
  | 'stars'
  | 'sky'
  /** the nearest object of a kind ahead, as the layout places it */
  | 'crossing'
  | 'signal'
  | 'lamp'
  | 'car'
  | 'tree'
  | 'bench'
  | 'parasol'
  | 'gantry'
  | 'facade'
  | 'window'
  /** fixed places relative to the observer */
  | 'road'
  | 'pavement'
  | 'ground'
  | 'farEnd'
  | 'grid';

export const SCENE_MARKS: readonly SceneMark[] = [
  'motion',
  'behind',
  'transverse',
  'neutral',
  'ring',
  'glow',
  'moon',
  'stars',
  'sky',
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
  'road',
  'pavement',
  'ground',
  'farEnd',
  'grid',
];

/** Where a text points: a mark in the scene, elements of the interface (by their `data-explain-entry`), or both. */
export interface Pointing {
  readonly scene?: SceneMark;
  readonly elements?: readonly InventoryId[];
}

/** The marks of the scene entries; every other entry points at its own element. */
const SCENE_POINTING: Partial<Record<InventoryId, SceneMark>> = {
  avenue: 'motion',
  road: 'road',
  crossings: 'crossing',
  pavements: 'pavement',
  buildings: 'facade',
  windows: 'window',
  lamps: 'lamp',
  signals: 'signal',
  cars: 'car',
  trees: 'tree',
  benches: 'bench',
  parasols: 'parasol',
  gantry: 'gantry',
  sky: 'sky',
  moon: 'moon',
  stars: 'stars',
  ground: 'ground',
  farEnd: 'farEnd',
  ring: 'ring',
  heatGlow: 'glow',
  grid: 'grid',
  crosshair: 'motion',
  transverseCircle: 'transverse',
  neutralCircle: 'neutral',
};

/** What an entry points at. */
export function inventoryPointing(id: InventoryId): Pointing {
  const scene = SCENE_POINTING[id];
  return scene ? { scene } : { elements: [id] };
}

/** Whether an entry is an element of the interface (it carries `data-explain-entry` and a description). */
export function isInterfaceEntry(id: InventoryId): boolean {
  return SCENE_POINTING[id] === undefined;
}

/** The entries of the interface, which the elements carry. */
export const INTERFACE_ENTRIES: readonly InventoryId[] = INVENTORY_IDS.filter(isInterfaceEntry);

/**
 * What each item of the view "Now" (src/ui/explain.ts) points at: the thing in the picture it is about,
 * and the numbers on the instruments it talks of. The variants of an item point at the same things.
 */
export const EXPLAIN_POINTING: Readonly<Record<ExplainKey, Pointing>> = {
  paused: { elements: ['pause'] },
  rest: { elements: ['beta'] },
  restNext: { elements: ['slider'] },
  slow: { elements: ['beta'] },
  // the red signal, and the colours of the 555 nm light ahead and behind
  colours: { scene: 'signal', elements: ['ahead555', 'behind555'] },
  lamps: { scene: 'lamp' },
  invisible: { scene: 'lamp' },
  ring: { scene: 'ring' },
  brightness: { scene: 'road' },
  camera: { elements: ['exposure'] },
  crowding: { scene: 'transverse', elements: ['transverse'] },
  shapes: { scene: 'car' },
  // the grid on the ground, and the row that gives the measured length of 100 m of road
  measured: { scene: 'grid', elements: ['road100'] },
  measuredWhy: { scene: 'car' },
  measuredColours: { elements: ['view'] },
  // the two clocks, and γ, the ratio of their rates
  clocks: { elements: ['properTime', 'streetTime', 'gamma'] },
  // the glowing cone ahead, and the row of the apparent temperature of the 288 K surroundings
  heatGlow: { scene: 'glow', elements: ['ambient'] },
  heatOff: { elements: ['thermal'] },
  stars: { scene: 'stars' },
  moon: { scene: 'moon' },
  behind: { scene: 'behind', elements: ['behind555'] },
  side: { scene: 'motion' },
  lens: { elements: ['lens'] },
  speedOfLight: { elements: ['beta'] },
  limit: { elements: ['beta'] },
};

/** What an item of the view "Now" points at. */
export function explainPointing(item: Pick<ExplainItem, 'key'>): Pointing {
  return EXPLAIN_POINTING[item.key];
}

/** What the sentences with numbers are computed from. */
export interface InventoryState {
  /** The velocity the simulation is actually at. */
  readonly beta: number;
}

/** β at which the head-on Doppler factor is `doppler`: (D² − 1)/(D² + 1). */
export function betaOfDoppler(doppler: number): number {
  return (doppler * doppler - 1) / (doppler * doppler + 1);
}

/** Rest-frame angle between the Moon and the direction of motion, rad. */
export function moonRestAngle(): number {
  const deg = Math.PI / 180;
  return Math.acos(Math.cos(SCENARIO.moon.elevationDeg * deg) * Math.cos(SCENARIO.moon.azimuthDeg * deg));
}

/** The edges of the ring of lamp light, rad from the direction of motion; NaN where an edge does not exist (yet). */
export function ringEdges(beta: number): { readonly inner: number; readonly outer: number } {
  const c = explainConstants();
  return { inner: apparentAngleOfDoppler(c.ledHigh, beta), outer: apparentAngleOfDoppler(c.ledLow, beta) };
}

/** Velocities at which the lamp light leaves the visible band: dead ahead, and straight behind. */
export function lampLimits(): { readonly ahead: number; readonly behind: number } {
  const c = explainConstants();
  return { ahead: betaOfDoppler(c.ledHigh), behind: betaOfDoppler(1 / c.ledLow) };
}

/** Whether the detail of an entry changes with the speed (and is therefore written in place while it is open). */
export const LIVE_DETAILS: ReadonlySet<InventoryId> = new Set<InventoryId>([
  'avenue',
  'windows',
  'signals',
  'moon',
  'ring',
  'heatGlow',
  'grid',
  'transverseCircle',
  'neutralCircle',
]);

/** The entries that have a sentence with numbers. */
export const DETAILED: ReadonlySet<InventoryId> = new Set<InventoryId>([
  ...LIVE_DETAILS,
  'crossings',
  'lamps',
  'stars',
  'farEnd',
]);

/**
 * Distance between neighbouring crossings along the avenue, m: the blocks of even variant have one,
 * and the blocks take the variants in turn (block i shows variant i mod VARIANT_COUNT; with an even
 * CHUNK_COUNT and an even VARIANT_COUNT the turn keeps every second block a crossing across the wrap).
 */
export const CROSSING_SPACING = 2 * CHUNK_LENGTH;

const both = (quantity: Quantity): string => `${quantity.value} ${quantity.unit}`;

/**
 * The sentence with numbers that follows the explanation of an entry, or null for the entries that
 * have none. Some numbers change with the speed (LIVE_DETAILS: written in place while the entry is
 * open); the others are fixed by the scenario and the layout.
 */
export function inventoryDetail(id: InventoryId, m: Messages, language: Language, state: InventoryState): string | null {
  const d = m.inventory.details;
  const beta = state.beta;
  const d0 = headOnDopplerFactor(beta);
  const angle = (radians: number): string => formatAngle((radians * 180) / Math.PI, language);
  const velocity = (value: number): string => formatFixed(value, 2, language);
  /** A distance of the layout, to the nearest ten metres. */
  const metres = (value: number): string => formatInteger(Math.round(value / 10) * 10, language);
  switch (id) {
    case 'avenue':
      return d.avenue(
        formatSignificant(slowMotionFactor(SPEED_OF_LIGHT) / 1e6, 2, language),
        formatFixed(beta * SCENARIO.visualLightSpeed, 1, language)
      );
    case 'crossings':
      return d.crossings(formatInteger(CROSSING_SPACING, language));
    case 'windows':
      return d.windows(
        formatInteger(SCENARIO.interior.litFraction * 100, language),
        formatTemperature(SCENARIO.interior.colourTemperatureK * d0, language),
        formatTemperature(SCENARIO.interior.colourTemperatureK, language)
      );
    case 'lamps': {
      const limits = lampLimits();
      return d.lamps(formatInteger(LUMINAIRE_SPACING, language), velocity(limits.ahead), velocity(limits.behind));
    }
    case 'signals': {
      const nm = SCENARIO.signals.redNm / d0;
      return d.signals(m.bands[classifyWavelength(nm).id], both(formatWavelength(nm, language)));
    }
    case 'moon':
      return d.moon(angle(aberrate(moonRestAngle(), beta)), angle(moonRestAngle()));
    case 'stars':
      return d.stars(formatInteger(SCENARIO.stars.count, language), formatInteger(SCENARIO.stars.visibilityGain, language));
    case 'farEnd':
      return d.farEnd(metres(FADE_AHEAD_END), metres(FADE_BEHIND_END));
    case 'ring': {
      const { inner, outer } = ringEdges(beta);
      if (!Number.isNaN(inner) && !Number.isNaN(outer)) return d.ring.between(angle(inner), angle(outer));
      if (!Number.isNaN(outer)) return d.ring.disc(angle(outer));
      const limits = lampLimits();
      return d.ring.none(velocity(limits.behind), velocity(limits.ahead));
    }
    case 'heatGlow':
      return d.heatGlow(
        formatTemperature(SCENARIO.environment.temperatureK * d0, language),
        formatInteger(SCENARIO.environment.temperatureK, language),
        velocity(betaOfDoppler(GLOW_VISIBLE_DOPPLER))
      );
    case 'grid':
      return d.grid(
        both(formatLength(MEASURING_GRID_M, language)),
        both(formatLength(MEASURING_GRID_M / lorentzFactor(beta), language))
      );
    case 'transverseCircle':
      return d.transverseCircle(angle(transversePlaneApparentAngle(beta)));
    case 'neutralCircle':
      return beta === 0 ? d.neutralCircleRest : d.neutralCircle(angle(neutralConeAngle(beta)));
    default:
      return null;
  }
}

/** Id of the hidden element that holds the explanation of an interface entry (the target of its aria-describedby). */
export function describedById(id: InventoryId): string {
  return `explain-entry-${id}`;
}

/** The attributes an element of the interface carries for its entry: the name of the entry and its description. */
export function entryProps(id: InventoryId): { readonly 'data-explain-entry': InventoryId; readonly 'aria-describedby': string } {
  return { 'data-explain-entry': id, 'aria-describedby': describedById(id) };
}
