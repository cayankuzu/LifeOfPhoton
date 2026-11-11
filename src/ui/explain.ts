/**
 * "Why does it look like this?": which effects are visible at this moment, and why.
 *
 * A pure module (no React, no DOM, no three.js). `explain` takes what is on the screen — the
 * velocity the simulation is actually at, the view, the direction of looking, the field of
 * view and the exposure — and returns every item of the catalogue that applies, with its
 * priority, its variant, its live values and the section of the dossier that treats it.
 * `renderExplainItem` turns an item into the plain words of the dictionary.
 *
 * Every threshold acts on the rapidity φ = ln D₀ unless it says otherwise: equal steps of φ
 * are equal boosts (one key press is Δφ = 0.045). An item appears at its threshold and goes
 * again only `HYSTERESIS` below it, which is why `explain` is given the previous result: the
 * speed eases, and the panel must not flicker while it does.
 *
 * Nothing here says that a thing is visible unless the physics of the application makes it so:
 * the thresholds of the lamp light are solved from the spectral atlas the renderer uses, the
 * glow is reported only where it reaches into the view, the Moon only where its aberrated
 * direction is inside the frame. The derivation of every threshold is in the design notes of
 * the panel and is checked by src/ui/__tests__/explain.test.ts against the physics modules.
 */

import { type BandId, classifyWavelength, VISIBLE_MIN_NM } from '@/physics/bands';
import { NOMINAL_SOLAR_TEMPERATURE_K, SPEED_OF_LIGHT } from '@/physics/constants';
import { toExposureValue } from '@/physics/exposure';
import { kinematicState } from '@/physics/kinematics';
import {
  aberrate,
  apparentAngleOfDoppler,
  deaberrate,
  dopplerFromRestAngle,
  transversePlaneApparentAngle,
} from '@/physics/optics';
import { blackbodyLuminance, solveLogBisection, visibleGainOfBlackbody } from '@/physics/radiometry';
import { MOON_DISC_LUMINANCE_CD_M2, REFERENCE_LUMINANCE_CD_M2, SCENARIO } from '@/physics/scenario';
import { blackbodyLuminanceUnits, reflectedGain, sharedAtlas } from '@/physics/spectralAtlas';
import {
  formatAngle,
  formatExposure,
  formatFixed,
  formatInteger,
  formatLength,
  formatSignificant,
  formatWavelength,
  type Quantity,
} from '@/i18n/format';
import { MESSAGES } from '@/i18n/messages';
import { MEASURING_GRID_M } from '@/scene/geometry/layout';
import type { Language, ViewMode } from '@/state/simulation';

const DEG = Math.PI / 180;

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

/** Sections of the dossier an item can lead to (ids of src/dossier/content). */
export type ExplainSection =
  'thought-experiment' | 'kinematics' | 'optics' | 'radiometry' | 'method' | 'guide' | 'misconceptions';

/**
 * The items, in catalogue order (which breaks ties of priority), each with the section of the
 * dossier that actually treats the effect.
 */
export const EXPLAIN_SECTIONS = {
  paused: 'kinematics',
  rest: 'thought-experiment',
  restNext: 'guide',
  slow: 'guide',
  colours: 'radiometry',
  lamps: 'guide',
  invisible: 'radiometry',
  ring: 'radiometry',
  brightness: 'radiometry',
  camera: 'method',
  crowding: 'optics',
  shapes: 'optics',
  measured: 'optics',
  measuredWhy: 'misconceptions',
  measuredColours: 'optics',
  clocks: 'kinematics',
  heatGlow: 'radiometry',
  heatOff: 'radiometry',
  stars: 'misconceptions',
  moon: 'guide',
  behind: 'guide',
  side: 'guide',
  lens: 'guide',
  speedOfLight: 'thought-experiment',
  limit: 'thought-experiment',
} as const satisfies Record<string, ExplainSection>;

export type ExplainKey = keyof typeof EXPLAIN_SECTIONS;

const CATALOGUE_ORDER = Object.keys(EXPLAIN_SECTIONS) as ExplainKey[];

/** The variants of the items that have more than one text; every other item has the variant 'main'. */
export const EXPLAIN_VARIANTS = {
  camera: ['opens', 'closes'],
  crowding: ['pull', 'beside', 'circle'],
  measured: ['rest', 'main'],
  moon: ['reflected', 'ownGlow'],
  behind: ['redder', 'infrared'],
  side: ['sideSlow', 'sideFast', 'upSlow', 'upFast'],
} as const satisfies Partial<Record<ExplainKey, readonly string[]>>;

/** The live values of an item, raw (they are formatted for a language only when rendered). */
export interface ExplainParams {
  /** 100 β */
  readonly percent?: number;
  /** Wavelength at which the red signal arrives head-on, nm, and its band. */
  readonly signalNm?: number;
  readonly signalBand?: BandId;
  /** Colour name of a lamp-lit white surface dead ahead. */
  readonly lampBand?: BandId;
  /** Visible luminance gain of moonlight. */
  readonly gain?: number;
  /** Exposure relative to rest, EV. */
  readonly ev?: number;
  /** Angle at which the transverse plane is seen, rad, and whether the lens tip applies. */
  readonly angle?: number;
  readonly lensTip?: boolean;
  /** Head-on Doppler factor (the apparent distance factor of the cars ahead). */
  readonly times?: number;
  readonly gamma?: number;
  /** Measured length of 100 m of road, m. */
  readonly road?: number;
  /** Apparent temperature of the surroundings dead ahead, K. */
  readonly kelvin?: number;
  readonly lens?: number;
  /** Spacing of the measuring grid, m. */
  readonly grid?: number;
  /** Speed of light, km/s. */
  readonly km?: number;
}

export interface ExplainItem {
  readonly key: ExplainKey;
  readonly variant: string;
  readonly priority: number;
  readonly params: ExplainParams;
  readonly section: ExplainSection;
}

/** Which way the reader looks, relative to the direction of motion. */
export type Facing = 'ahead' | 'side' | 'back';

/** What the hysteresis needs to know about the previous evaluation. */
export interface ExplainMemory {
  readonly keys: ReadonlySet<ExplainKey>;
  readonly variants: ReadonlyMap<ExplainKey, string>;
  readonly facing: Facing;
}

export const EMPTY_MEMORY: ExplainMemory = { keys: new Set(), variants: new Map(), facing: 'ahead' };

export interface ExplainInput {
  /** The velocity the simulation is actually at (telemetry.beta), not the target. */
  readonly beta: number;
  readonly view: ViewMode;
  readonly thermal: boolean;
  readonly lens: number;
  readonly paused: boolean;
  /** Direction of looking relative to the direction of motion, rad (left and up positive). */
  readonly yaw: number;
  readonly pitch: number;
  /** Vertical field of view, rad, and width over height of the view. */
  readonly fieldOfView: number;
  readonly aspect: number;
  /** Natural log of the exposure relative to rest (telemetry.lnExposure). */
  readonly lnExposure: number;
}

export interface Explanation {
  /** Every applicable item, by priority and then catalogue order. */
  readonly items: readonly ExplainItem[];
  /** To be passed to the next evaluation, whether or not the items are shown. */
  readonly memory: ExplainMemory;
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** A light counts as gone when its luminance falls below this share of its value at rest (the dossier's 1 %). */
export const GONE_FRACTION = 0.01;

/** Default hysteresis, in rapidity: a little under half a key step (0.045). */
export const HYSTERESIS = 0.02;

/**
 * Head-on Doppler factor from which the glow of the 288 K surroundings is called visible dead
 * ahead (T = 864 K, β = 0.80): its display level after the metered exposure is then about 1/8
 * of that of a street-lit surface at rest. Checked against the renderer's exposure by the tests.
 */
export const GLOW_VISIBLE_DOPPLER = 3;
const GLOW_HYSTERESIS = 0.035;

/** Colour of a lamp-lit white surface dead ahead, by head-on Doppler factor (upper bounds). */
export const LAMP_BANDS: ReadonlyArray<readonly [upTo: number, band: BandId]> = [
  [1.1, 'green'],
  [1.2, 'cyan'],
  [1.33, 'blue'],
  [Number.POSITIVE_INFINITY, 'violet'],
];

/** Upper bounds of the glow colours through the camera (white balance 4100 K), K: red, orange, … light blue. */
export const GLOW_COLOUR_BOUNDS_K = [1150, 2200, 3400, 4700, 7000] as const;

/** Upper bounds of the likenesses of the glow, K; the last is where it outshines the Sun's surface. */
export function glowLikenessBoundsK(): readonly [number, number, number, number] {
  return [1150, 2200, 3400, explainConstants().sunMatchKelvin];
}

/** Looking ahead below this angle from the direction of motion, back from the next; degrees, with 5° of hysteresis. */
const AHEAD_BELOW_DEG = 50;
const BACK_FROM_DEG = 130;
const FACING_HYSTERESIS_DEG = 5;

/** A sideways view shows "what is behind you" when its centre lies at least this far from the direction of motion in the street frame. */
export const SIDE_FAST_DEG = 100;
const SIDE_FAST_HYSTERESIS_DEG = 3;

/** In the seen view the clocks come before most effects from γ = 2 on (the time dilation children ask about most). */
export const CLOCKS_RAISED_GAMMA = 2;

/** Items shown at once; one more on the wide tier when the HUD is tall enough. */
export const MAX_ITEMS = 3;
export const MAX_ITEMS_TALL = 4;

interface Constants {
  /** Doppler factors between which lamp light stays above GONE_FRACTION of its luminance at rest. */
  readonly ledLow: number;
  readonly ledHigh: number;
  /** Doppler factor from which the Moon's thermal emission outshines the sunlight it reflects. */
  readonly moonOwnGlowDoppler: number;
  /** Temperature at which the glowing street (emissivity 0.92) is as bright as the Sun's photosphere, K. */
  readonly sunMatchKelvin: number;
}

let constants: Constants | null = null;

/** The thresholds solved from the physics of the application (computed once). */
export function explainConstants(): Constants {
  if (constants) return constants;
  const atlas = sharedAtlas();
  const ledAt = (doppler: number): number => Math.log(reflectedGain(atlas, 'led', doppler) / GONE_FRACTION);
  const discReflected = MOON_DISC_LUMINANCE_CD_M2 / REFERENCE_LUMINANCE_CD_M2;
  const moonGlowAt = (doppler: number): number =>
    Math.log(
      (SCENARIO.moon.surfaceEmissivity * blackbodyLuminanceUnits(atlas, SCENARIO.moon.surfaceTemperatureK * doppler)) /
        (discReflected * reflectedGain(atlas, 'moon', doppler))
    );
  const sun = blackbodyLuminance(NOMINAL_SOLAR_TEMPERATURE_K);
  constants = {
    ledHigh: solveLogBisection(ledAt, 1.05, 8),
    ledLow: solveLogBisection(ledAt, 0.2, 0.95),
    moonOwnGlowDoppler: solveLogBisection(moonGlowAt, 1.5, 60),
    sunMatchKelvin: solveLogBisection(
      (kelvin) => Math.log((SCENARIO.environment.surfaceEmissivity * blackbodyLuminance(kelvin)) / sun),
      3000,
      20000
    ),
  };
  return constants;
}

// ---------------------------------------------------------------------------
// Geometry of the view
// ---------------------------------------------------------------------------

export interface ViewGeometry {
  readonly tanX: number;
  readonly tanY: number;
  /** Half-angles of the view along its diagonal, its long and its short axis, rad. */
  readonly halfDiagonal: number;
  readonly halfLong: number;
  readonly halfShort: number;
  /** Angle between the centre of the view and the direction of motion, rad. */
  readonly psi: number;
}

export function viewGeometry(input: Pick<ExplainInput, 'fieldOfView' | 'aspect' | 'yaw' | 'pitch'>): ViewGeometry {
  const tanY = Math.tan(input.fieldOfView / 2);
  const tanX = tanY * input.aspect;
  return {
    tanX,
    tanY,
    halfDiagonal: Math.atan(Math.hypot(tanX, tanY)),
    halfLong: Math.atan(Math.max(tanX, tanY)),
    halfShort: Math.atan(Math.min(tanX, tanY)),
    psi: Math.acos(Math.min(1, Math.cos(input.yaw) * Math.cos(input.pitch))),
  };
}

/** Which way the reader looks, with 5° of hysteresis on the borders. */
export function facingOf(psi: number, previous: Facing): Facing {
  const degrees = psi / DEG;
  const back = previous === 'back' ? BACK_FROM_DEG - FACING_HYSTERESIS_DEG : BACK_FROM_DEG;
  const side = previous === 'ahead' ? AHEAD_BELOW_DEG : AHEAD_BELOW_DEG - FACING_HYSTERESIS_DEG;
  return degrees >= back ? 'back' : degrees >= side ? 'side' : 'ahead';
}

interface Direction {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Direction of the Moon in the street frame (forward = −z, x right, y up). */
function moonRestDirection(): Direction {
  const azimuth = SCENARIO.moon.azimuthDeg * DEG;
  const elevation = SCENARIO.moon.elevationDeg * DEG;
  return { x: Math.cos(elevation) * Math.sin(azimuth), y: Math.sin(elevation), z: -Math.cos(elevation) * Math.cos(azimuth) };
}

/** Where the Moon is seen at velocity β (aberration about the direction of motion). */
export function moonApparentDirection(beta: number): Direction {
  const rest = moonRestDirection();
  const across = Math.hypot(rest.x, rest.y);
  const theta = aberrate(Math.acos(-rest.z), beta);
  return { x: (rest.x / across) * Math.sin(theta), y: (rest.y / across) * Math.sin(theta), z: -Math.cos(theta) };
}

/** Whether a direction lies inside `margin` of the frame (the projection of the guide layer, src/ui/hud/Guides.tsx). */
function inFrame(direction: Direction, input: ExplainInput, view: ViewGeometry, margin = 0.95): boolean {
  const cosYaw = Math.cos(input.yaw);
  const sinYaw = Math.sin(input.yaw);
  const cosPitch = Math.cos(input.pitch);
  const sinPitch = Math.sin(input.pitch);
  const vx = direction.x * cosYaw - direction.z * sinYaw;
  const vz1 = direction.x * sinYaw + direction.z * cosYaw;
  const vy = direction.y * cosPitch + vz1 * sinPitch;
  const vz = -direction.y * sinPitch + vz1 * cosPitch;
  if (vz > -1e-6) return false;
  return Math.abs(vx / -vz) < margin * view.tanX && Math.abs(vy / -vz) < margin * view.tanY;
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/** Every item that applies now, by priority (and catalogue order), and the memory for the next call. */
export function explain(input: ExplainInput, memory: ExplainMemory = EMPTY_MEMORY): Explanation {
  const c = explainConstants();
  const k = kinematicState(input.beta);
  const phi = k.rapidity;
  const view = viewGeometry(input);
  const seen = input.view === 'seen';
  const facing = facingOf(view.psi, memory.facing);
  const had = (key: ExplainKey): boolean => memory.keys.has(key);
  /** Above `show`, or still above `show − margin` for an item that is already there. */
  const over = (key: ExplainKey, value: number, show: number, margin = HYSTERESIS): boolean =>
    value >= show || (had(key) && value >= show - margin);
  const rapidity = Math.atanh;

  const items: ExplainItem[] = [];
  const add = (key: ExplainKey, priority: number, params: ExplainParams = {}, variant = 'main'): void => {
    items.push({ key, variant, priority, params, section: EXPLAIN_SECTIONS[key] });
  };
  const finish = (): Explanation => {
    items.sort((a, b) => b.priority - a.priority || CATALOGUE_ORDER.indexOf(a.key) - CATALOGUE_ORDER.indexOf(b.key));
    return {
      items,
      memory: {
        keys: new Set(items.map((item) => item.key)),
        variants: new Map(items.map((item) => [item.key, item.variant])),
        facing,
      },
    };
  };

  if (input.paused) add('paused', 100);
  if (input.lens > 1) add('lens', phi >= rapidity(0.999) ? 75 : 20, { lens: input.lens });

  // at rest below 0.5 % of c; released only at 1 % (absolute β here)
  const wasAtRest = had('rest') || memory.variants.get('measured') === 'rest';
  const atRest = input.beta < 0.005 || (wasAtRest && input.beta < 0.01);

  if (!seen) {
    // the measured view: nothing optical
    if (atRest) add('measured', 90, { grid: MEASURING_GRID_M }, 'rest');
    else {
      add('measured', 90, { gamma: k.gamma, road: 100 * k.contraction }, 'main');
      add('measuredWhy', 80);
      if (over('clocks', k.gamma, 1.05)) add('clocks', 70, { gamma: k.gamma });
      add('measuredColours', 30);
    }
    return finish();
  }

  if (atRest) {
    add('rest', 90);
    add('restNext', 80);
    return finish();
  }

  const D0 = k.dopplerAhead;
  const signalNm = SCENARIO.signals.redNm / D0;
  const ledGoneAhead = over('invisible', phi, Math.log(c.ledHigh)) || over('ring', phi, Math.log(c.ledHigh));
  const ledGoneBehind = phi >= -Math.log(c.ledLow);

  // --- where the reader looks
  if (facing === 'back' && over('behind', phi, rapidity(0.1), 0.01)) add('behind', 95, {}, ledGoneBehind ? 'infrared' : 'redder');
  if (facing === 'side' && over('side', phi, rapidity(0.05), 0.01)) {
    const up = Math.abs(input.pitch) > Math.abs(input.yaw);
    // the centre of the view shows what lies behind the transverse plane in the street frame
    const wasFast = memory.variants.get('side')?.endsWith('Fast') ?? false;
    const fast = deaberrate(view.psi, input.beta) / DEG >= SIDE_FAST_DEG - (wasFast ? SIDE_FAST_HYSTERESIS_DEG : 0);
    add('side', 95, {}, `${up ? 'up' : 'side'}${fast ? 'Fast' : 'Slow'}`);
  }

  // --- hardly moving yet (any direction); looking back it stays until the item on what lies behind takes over at
  // 0.1 c, so that the panel is never empty there
  const slowUntil = rapidity(facing === 'back' ? 0.1 : 0.05);
  if (phi < slowUntil || (had('slow') && phi < slowUntil + 0.01)) add('slow', 85, { percent: 100 * input.beta });

  // --- colours, with the live example of the red signal while it is still visible: it appears
  // from VISIBLE_MIN_NM + 5 nm on the way down and goes below VISIBLE_MIN_NM on the way up
  const signalVisible = signalNm >= VISIBLE_MIN_NM + (had('colours') ? 0 : 5);
  if (facing === 'ahead' && over('colours', phi, rapidity(0.05), 0.01) && signalVisible) {
    add('colours', input.beta < 0.25 ? 80 : 60, { signalNm, signalBand: classifyWavelength(signalNm).id });
  }

  // --- the colour of lamp-lit surfaces dead ahead
  if (facing === 'ahead' && over('lamps', phi, Math.log(1.03), 0.01) && !ledGoneAhead) {
    const band = LAMP_BANDS.find(([upTo]) => D0 < upTo)?.[1] ?? 'violet';
    add('lamps', input.beta < 0.3 ? 70 : 55, { lampBand: band });
  }

  // --- the lamp light leaves the visible band ahead; the ring where it is still visible
  if (facing === 'ahead' && ledGoneAhead) add('invisible', phi < rapidity(0.8) ? 75 : 40);
  if (ledGoneAhead) {
    // just under the threshold (hysteresis) the light dead ahead is still visible: the "ring" reaches the axis
    const inner = apparentAngleOfDoppler(c.ledHigh, input.beta);
    const outer = apparentAngleOfDoppler(c.ledLow, input.beta);
    const from = Number.isNaN(inner) ? 0 : inner;
    const to = Number.isNaN(outer) ? Math.PI : outer;
    if (view.psi - view.halfDiagonal < to && view.psi + view.halfDiagonal > from) {
      const fast = phi >= rapidity(0.8);
      add('ring', fast && !input.thermal ? 70 : fast ? 55 : 50);
    }
  }

  // --- moonlit surfaces ahead brighten
  if (facing === 'ahead' && over('brightness', phi, Math.log(1.4))) {
    add('brightness', phi < rapidity(0.8) ? 45 : 25, { gain: visibleGainOfBlackbody(SCENARIO.moon.colourTemperatureK, D0) });
  }

  // --- the automatic exposure
  const ev = toExposureValue(input.lnExposure);
  if (Math.abs(ev) >= 1 || (had('camera') && Math.abs(ev) >= 0.7)) {
    add('camera', Math.abs(ev) >= 2.5 ? 50 : 35, { ev }, ev > 0 ? 'opens' : 'closes');
  }

  // --- aberration
  if (facing === 'ahead' && over('crowding', phi, rapidity(0.25))) {
    const angle = transversePlaneApparentAngle(input.beta);
    const variant = angle < view.halfShort ? 'circle' : angle < view.halfLong ? 'beside' : 'pull';
    const priority = variant === 'circle' ? 85 : variant === 'beside' ? 72 : 55;
    add('crowding', priority, { angle, lensTip: angle < 3 * DEG && input.lens === 1 }, variant);
  }

  // --- the cars ahead are smaller, not squashed
  if (facing === 'ahead' && over('shapes', phi, Math.log(1.5))) add('shapes', input.beta < 0.97 ? 65 : 50, { times: D0 });

  // --- time dilation, raised from the γ the item writes as "2.00": the 0.866 c mark is √3/2, whose γ is
  // 1.9999999999999996, and a link carries β to seven figures (0.8660254, γ = 1.99999997)
  const clocksRaised = k.gamma >= CLOCKS_RAISED_GAMMA - 0.005;
  if (over('clocks', k.gamma, 1.05)) add('clocks', clocksRaised ? 60 : 40, { gamma: k.gamma });

  // --- the glow of the surroundings, where its cone reaches into the view
  const glowOn =
    over('heatGlow', phi, Math.log(GLOW_VISIBLE_DOPPLER), GLOW_HYSTERESIS) ||
    over('heatOff', phi, Math.log(GLOW_VISIBLE_DOPPLER), GLOW_HYSTERESIS);
  const glowAngle = apparentAngleOfDoppler(GLOW_VISIBLE_DOPPLER, input.beta);
  // within the hysteresis the glowing region has shrunk to the axis
  const glowInView = view.psi - view.halfDiagonal < (Number.isNaN(glowAngle) ? 0 : glowAngle);
  if (glowOn && glowInView) {
    if (input.thermal) add('heatGlow', 88, { kelvin: SCENARIO.environment.temperatureK * D0 });
    else add('heatOff', 30);
  }

  // --- stars (with thermal emission on, the sky ahead glows as well and outshines them); not when
  // looking back, even upwards: the stars there are redder and sparser, not gathered and bluer
  const skyDark = !input.thermal || phi < Math.log(GLOW_VISIBLE_DOPPLER) - 0.05;
  const skyward = facing === 'ahead' || (facing === 'side' && input.pitch > 0.35);
  if (skyward && input.pitch > -0.2 && over('stars', phi, rapidity(0.3)) && skyDark) {
    add('stars', input.pitch > 0.35 ? 70 : 30);
  }

  // --- the Moon, where it is in the frame
  if (over('moon', phi, rapidity(0.3)) && inFrame(moonApparentDirection(input.beta), input, view)) {
    const moonDoppler = dopplerFromRestAngle(Math.acos(-moonRestDirection().z), input.beta);
    const ownGlow = input.thermal && moonDoppler >= c.moonOwnGlowDoppler;
    add(
      'moon',
      35,
      { gain: visibleGainOfBlackbody(SCENARIO.moon.colourTemperatureK, moonDoppler) },
      ownGlow ? 'ownGlow' : 'reflected'
    );
  }

  // --- the speed of light and the limit
  if (over('speedOfLight', phi, rapidity(0.9))) add('speedOfLight', 45, { km: SPEED_OF_LIGHT / 1000 });
  if (over('limit', phi, rapidity(0.9999))) add('limit', 58);

  return finish();
}

// ---------------------------------------------------------------------------
// Texts
// ---------------------------------------------------------------------------

export interface ExplainText {
  readonly title: string;
  readonly body: string;
  /** At most one optional sentence, only when it is true of the screen. */
  readonly extra: string | null;
}

/** Name of the text an item is rendered with: its key, or key/variant. */
export function explainTextId(item: Pick<ExplainItem, 'key' | 'variant'>): string {
  return item.key in EXPLAIN_VARIANTS ? `${item.key}/${item.variant}` : item.key;
}

const both = (quantity: Quantity): string => `${quantity.value} ${quantity.unit}`;

/** Band index of a temperature among increasing upper bounds (the last band has none). */
function bandOf(kelvin: number, bounds: readonly number[]): number {
  const index = bounds.findIndex((bound) => kelvin < bound);
  return index === -1 ? bounds.length : index;
}

/** The glow colour band (index into `glowColours`) and likeness band (index into `glowLikeness`) of a temperature. */
export function glowBands(kelvin: number): { readonly colour: number; readonly likeness: number } {
  return { colour: bandOf(kelvin, GLOW_COLOUR_BOUNDS_K), likeness: bandOf(kelvin, glowLikenessBoundsK()) };
}

/** An item in the words of one language, with its values formatted as the instruments format them. */
export function renderExplainItem(item: ExplainItem, language: Language, guides: boolean): ExplainText {
  const m = MESSAGES[language];
  const t = m.explain.items;
  const p = item.params;
  const fixed = (value: number, digits: number): string => formatFixed(value, digits, language);
  /** A factor of a few to a few hundred: fewer decimals than the dock on purpose. */
  // A factor just above one gets as many decimals as it takes not to read as exactly one ("1,0013 kat", not "1,00 kat"
  // beside a road that measures 99,87 m), at most five; from 1.005 on two are enough.
  const factor = (value: number): string => {
    if (value >= 100) return formatInteger(value, language);
    if (value >= 10) return fixed(value, 1);
    const excess = value - 1;
    return fixed(value, excess > 0 && excess < 0.005 ? Math.min(5, Math.ceil(-Math.log10(excess)) + 1) : 2);
  };
  const text = (title: string, body: string, extra: string | null = null): ExplainText => ({ title, body, extra });

  switch (item.key) {
    case 'paused':
    case 'rest':
    case 'restNext':
    case 'invisible':
    case 'measuredWhy':
    case 'measuredColours':
    case 'heatOff':
    case 'stars':
    case 'limit':
      return text(t[item.key].title, t[item.key].body);
    case 'ring':
      return text(t.ring.title, t.ring.body, guides ? m.explain.extras.ringGuide : null);
    case 'slow':
      return text(t.slow.title, t.slow.body(fixed(p.percent ?? 0, 1)));
    case 'colours': {
      const nm = p.signalNm ?? Number.NaN;
      return text(t.colours.title, t.colours.body(m.bands[p.signalBand ?? 'red'], both(formatWavelength(nm, language))));
    }
    case 'lamps':
      return text(t.lamps.title, t.lamps.body(m.bands[p.lampBand ?? 'green']));
    case 'brightness':
      return text(t.brightness.title, t.brightness.body(formatSignificant(p.gain ?? 1, 2, language)));
    case 'camera': {
      const ev = formatExposure(p.ev ?? 0, language);
      return text(t.camera.title, item.variant === 'opens' ? t.camera.opens(ev) : t.camera.closes(ev));
    }
    case 'crowding': {
      if (item.variant === 'pull') return text(t.crowding.pull.title, t.crowding.pull.body);
      const angle = formatAngle((p.angle ?? 0) / DEG, language);
      const extra = p.lensTip ? m.explain.extras.crowdingLens : guides ? m.explain.extras.crowdingGuide : null;
      const variant = item.variant === 'circle' ? t.crowding.circle : t.crowding.beside;
      return text(variant.title, variant.body(angle), extra);
    }
    case 'shapes': {
      const times = p.times ?? 1;
      return text(t.shapes.title, t.shapes.body(times < 10 ? fixed(times, 1) : formatInteger(times, language)));
    }
    case 'measured':
      return item.variant === 'rest'
        ? text(t.measured.title, t.measured.rest(formatInteger(p.grid ?? MEASURING_GRID_M, language)))
        : text(t.measured.title, t.measured.main(factor(p.gamma ?? 1), both(formatLength(p.road ?? 100, language))));
    case 'clocks':
      return text(t.clocks.title, t.clocks.body(factor(p.gamma ?? 1)));
    case 'heatGlow': {
      const kelvin = p.kelvin ?? SCENARIO.environment.temperatureK;
      const bands = glowBands(kelvin);
      return text(
        t.heatGlow.title,
        t.heatGlow.body(
          m.explain.glowColours[bands.colour],
          m.explain.glowLikeness[bands.likeness],
          formatSignificant(kelvin - 273.15, 3, language),
          formatInteger(SCENARIO.environment.temperatureK - 273.15, language)
        )
      );
    }
    case 'moon':
      return item.variant === 'ownGlow'
        ? text(t.moon.ownGlow.title, t.moon.ownGlow.body)
        : text(t.moon.reflected.title, t.moon.reflected.body(formatSignificant(p.gain ?? 1, 2, language)));
    case 'behind':
      return text(t.behind.title, item.variant === 'infrared' ? t.behind.infrared : t.behind.redder);
    case 'side':
      return text(
        item.variant.startsWith('up') ? t.side.titleUp : t.side.titleSide,
        item.variant.endsWith('Fast') ? t.side.bodyFast : t.side.bodySlow
      );
    case 'lens': {
      const lens = formatInteger(p.lens ?? 1, language);
      return text(t.lens.title(lens), t.lens.body(lens));
    }
    case 'speedOfLight':
      // rounded to thousands: "about 300 000 km per second"
      return text(t.speedOfLight.title, t.speedOfLight.body(formatInteger(Math.round((p.km ?? 0) / 1000) * 1000, language)));
  }
}
