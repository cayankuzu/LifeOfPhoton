import { describe, expect, it } from 'vitest';
import { classifyWavelength, VISIBLE_MAX_NM, VISIBLE_MIN_NM } from '@/physics/bands';
import { NOMINAL_SOLAR_TEMPERATURE_K } from '@/physics/constants';
import { toDisplay } from '@/physics/display';
import { meterLnExposure } from '@/physics/exposure';
import { headOnDopplerFactor, RAPIDITY_MAX } from '@/physics/kinematics';
import { aberrate, deaberrate, transversePlaneApparentAngle } from '@/physics/optics';
import { blackbodyLuminance } from '@/physics/radiometry';
import { MOON_DISC_LUMINANCE_CD_M2, REFERENCE_LUMINANCE_CD_M2, SCENARIO } from '@/physics/scenario';
import {
  blackbodyLuminanceUnits,
  blackbodyRadiance,
  reflectedGain,
  reflectedRadiance,
  sharedAtlas,
} from '@/physics/spectralAtlas';
import { DOSSIER } from '@/dossier/content';
import { MESSAGES } from '@/i18n/messages';
import { BASE_LN_EXPOSURE } from '@/scene/uniforms';
import type { Language } from '@/state/simulation';
import {
  EMPTY_MEMORY,
  EXPLAIN_SECTIONS,
  EXPLAIN_VARIANTS,
  explain,
  explainConstants,
  type ExplainInput,
  type ExplainItem,
  type ExplainKey,
  type ExplainMemory,
  explainTextId,
  GLOW_COLOUR_BOUNDS_K,
  GLOW_VISIBLE_DOPPLER,
  glowBands,
  LAMP_BANDS,
  renderExplainItem,
  SIDE_FAST_DEG,
  viewGeometry,
} from '../explain';

const DEG = Math.PI / 180;
const LANGUAGES: readonly Language[] = ['tr', 'en'];
const WIDE = 16 / 9;
const PHONE = 375 / 812;

type State = Partial<Omit<ExplainInput, 'fieldOfView' | 'lnExposure'>> & { readonly beta: number };

/** The input at a state, with the exposure the meter settles at (as the renderer computes it). */
function inputAt(state: State): ExplainInput {
  const lens = state.lens ?? 1;
  const fieldOfView = 2 * Math.atan(Math.tan((SCENARIO.camera.fieldOfViewDeg * DEG) / 2) / lens);
  const base = {
    view: 'seen' as const,
    thermal: true,
    yaw: 0,
    pitch: 0,
    paused: false,
    aspect: WIDE,
    ...state,
    lens,
    fieldOfView,
  };
  return { ...base, lnExposure: meterLnExposure(sharedAtlas(), { ...base, optical: base.view === 'seen' }) };
}

/** What a reader sees after arriving at a state: the memory fed back until it is stable. */
function settled(
  input: ExplainInput,
  memory: ExplainMemory = EMPTY_MEMORY
): { items: readonly ExplainItem[]; memory: ExplainMemory } {
  let result = explain(input, memory);
  for (let i = 0; i < 3; i++) result = explain(input, result.memory);
  return result;
}

const ids = (items: readonly ExplainItem[]): string[] => items.map(explainTextId);
const keysOf = (items: readonly ExplainItem[]): string =>
  items
    .map((item) => item.key)
    .sort()
    .join();
const has = (items: readonly ExplainItem[], key: ExplainKey): boolean => items.some((item) => item.key === key);
const find = (items: readonly ExplainItem[], key: ExplainKey): ExplainItem | undefined => items.find((item) => item.key === key);

/** Bisection for the β at which a monotonic condition switches. */
function betaWhere(f: (beta: number) => number, lo = 1e-4, hi = 0.99999): number {
  let a = lo;
  let b = hi;
  const fa = f(a);
  for (let i = 0; i < 80; i++) {
    const m = 0.5 * (a + b);
    if (Math.sign(f(m)) === Math.sign(fa)) a = m;
    else b = m;
  }
  return 0.5 * (a + b);
}

/** β just above and just below a threshold given in β (a step of 10⁻⁷ in rapidity). */
const around = (beta: number): [below: number, above: number] => [
  Math.tanh(Math.atanh(beta) - 1e-7),
  Math.tanh(Math.atanh(beta) + 1e-7),
];

/** Hue (degrees) and saturation (HSV) of a display colour. */
function hueOf([r, g, b]: readonly number[]): { hue: number; saturation: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const saturation = max > 0 ? delta / max : 0;
  if (delta === 0) return { hue: 0, saturation };
  const hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { hue: (hue * 60 + 360) % 360, saturation };
}

/** Words of a text, as a reader counts them (a dash is not a word). */
const words = (text: string): number =>
  text
    .trim()
    .split(/\s+/)
    .filter((word) => !/^[—–-]$/.test(word)).length;

/** The numbers of a text, with the decimal comma of Turkish read as a point and digit groups joined. */
const numbersOf = (text: string): string[] =>
  (
    text
      .replace(/(\d)\u202F(\d)/g, '$1$2')
      .replace(/(\d),(\d)/g, '$1.$2')
      .match(/\d+(?:\.\d+)?/g) ?? []
  ).sort();

const G2 = Math.sqrt(3) / 2;

describe('the selection at the states of the design (part 4)', () => {
  // the three items shown, in order; the clocks rise to 60 in the seen view from γ = 2
  const TABLE: ReadonlyArray<[label: string, state: State, shown: string[]]> = [
    ['β 0 seen', { beta: 0 }, ['rest', 'restNext']],
    ['β 0 seen, thermal off', { beta: 0, thermal: false }, ['rest', 'restNext']],
    ['β 0 measured', { beta: 0, view: 'measured' }, ['measured/rest']],
    ['β 0.1 seen', { beta: 0.1 }, ['colours', 'lamps']],
    ['β 0.1 seen, thermal off', { beta: 0.1, thermal: false }, ['colours', 'lamps']],
    ['β 0.1 measured', { beta: 0.1, view: 'measured' }, ['measured/main', 'measuredWhy', 'measuredColours']],
    ['β 0.2 seen', { beta: 0.2 }, ['colours', 'lamps']],
    ['β 0.2 measured', { beta: 0.2, view: 'measured' }, ['measured/main', 'measuredWhy', 'measuredColours']],
    ['β 0.5 seen', { beta: 0.5 }, ['invisible', 'shapes', 'crowding/pull']],
    ['β 0.5 seen, thermal off', { beta: 0.5, thermal: false }, ['invisible', 'shapes', 'crowding/pull']],
    ['β 0.5 measured', { beta: 0.5, view: 'measured' }, ['measured/main', 'measuredWhy', 'clocks']],
    ['β 0.866 seen', { beta: G2 }, ['heatGlow', 'crowding/circle', 'shapes', 'clocks']],
    ['β 0.866 seen, thermal off', { beta: G2, thermal: false }, ['crowding/circle', 'ring', 'shapes', 'clocks']],
    ['β 0.866 measured', { beta: G2, view: 'measured' }, ['measured/main', 'measuredWhy', 'clocks']],
    ['β 0.99 seen', { beta: 0.99 }, ['heatGlow', 'crowding/circle', 'clocks', 'ring']],
    ['β 0.99 seen, thermal off', { beta: 0.99, thermal: false }, ['crowding/circle', 'ring', 'clocks', 'shapes']],
    ['β 0.99 measured', { beta: 0.99, view: 'measured' }, ['measured/main', 'measuredWhy', 'clocks']],
    ['β 0.999 seen', { beta: 0.999 }, ['heatGlow', 'crowding/circle', 'clocks', 'ring']],
    ['β 0.999 seen, thermal off', { beta: 0.999, thermal: false }, ['crowding/circle', 'ring', 'clocks', 'shapes']],
    ['β 0.99999 seen', { beta: 0.99999 }, ['heatGlow', 'crowding/circle', 'clocks', 'limit']],
    ['β 0.99999 seen, thermal off', { beta: 0.99999, thermal: false }, ['crowding/circle', 'ring', 'clocks', 'limit']],
    ['β 0.99999 measured', { beta: 0.99999, view: 'measured' }, ['measured/main', 'measuredWhy', 'clocks']],
    ['β 0.99 looking back', { beta: 0.99, yaw: Math.PI }, ['behind/infrared', 'clocks', 'camera/opens', 'speedOfLight']],
    ['β 0.2 looking back', { beta: 0.2, yaw: Math.PI }, ['behind/redder', 'camera/opens']],
    // below the item on what lies behind (0.1 c) the panel is not left empty
    ['β 0.07 looking back', { beta: 0.07, yaw: Math.PI }, ['slow']],
    ['β 0.6 looking left', { beta: 0.6, yaw: Math.PI / 2 }, ['side/sideFast', 'ring', 'clocks']],
    ['β 0.5 looking up', { beta: 0.5, pitch: Math.PI / 3 }, ['side/upSlow', 'stars', 'ring', 'clocks']],
    // the stars behind are redder and sparser: the item on stars gathering ahead and turning bluer stays away
    ['β 0.5 looking back and up', { beta: 0.5, yaw: Math.PI, pitch: 0.5 }, ['behind/infrared', 'ring', 'camera/opens']],
    ['β 0.5 paused', { beta: 0.5, paused: true }, ['paused', 'invisible', 'shapes', 'crowding/pull']],
    ['β 0.99999 lens ×10', { beta: 0.99999, lens: 10 }, ['heatGlow', 'crowding/circle', 'lens', 'clocks']],
    ['β 0.866 phone', { beta: G2, aspect: PHONE }, ['heatGlow', 'crowding/beside', 'shapes', 'clocks']],
    ['β 0.99 phone', { beta: 0.99, aspect: PHONE }, ['heatGlow', 'crowding/circle', 'clocks', 'ring']],
  ];

  it.each(TABLE)('%s', (_label, state, shown) => {
    expect(ids(settled(inputAt(state)).items.slice(0, shown.length))).toEqual(shown);
  });

  it('puts the clocks before the effects of the same band from γ = 2 in the seen view, and not below', () => {
    const at = (beta: number): number => find(settled(inputAt({ beta })).items, 'clocks')?.priority ?? 0;
    expect(at(G2)).toBe(60);
    // the same mark as a link carries it (β to seven figures)
    expect(at(0.8660254)).toBe(60);
    expect(at(0.86)).toBe(40);
    expect(at(0.8)).toBe(40);
    expect(at(0.99)).toBe(60);
    expect(find(settled(inputAt({ beta: 0.99, view: 'measured' })).items, 'clocks')?.priority).toBe(70);
  });

  it('writes the live values of the design', () => {
    const text = (state: State, key: ExplainKey, language: Language = 'en'): string => {
      const item = find(settled(inputAt(state)).items, key);
      if (!item) throw new Error(`${key} not selected`);
      const rendered = renderExplainItem(item, language, true);
      return `${rendered.title} ${rendered.body} ${rendered.extra ?? ''}`;
    };
    expect(text({ beta: 0.1 }, 'colours')).toContain('yellow (566.2 nm)');
    expect(text({ beta: 0.2 }, 'colours', 'tr')).toContain('yeşil görünüyor (511,1 nm)');
    expect(text({ beta: 0.1 }, 'lamps')).toContain('look cyan ahead');
    expect(text({ beta: 0.2 }, 'lamps')).toContain('look blue ahead');
    expect(text({ beta: 0.5 }, 'shapes', 'tr')).toContain('sanki 1,7 kat');
    expect(text({ beta: 0.99 }, 'shapes')).toContain('as if 14 times');
    expect(text({ beta: G2 }, 'heatGlow')).toContain('glows red, like a red-hot stove coil (about 802 °C). Yet it is 15 °C.');
    expect(text({ beta: 0.99 }, 'heatGlow')).toContain('white, though less than the Sun (about 3790 °C)');
    expect(text({ beta: 0.99999 }, 'heatGlow', 'tr')).toContain('açık mavi parlıyor (yaklaşık 129\u202F000 °C)');
    expect(text({ beta: 0.99 }, 'crowding', 'tr')).toContain('yarıçapı 8,11° olan');
    expect(text({ beta: 0.99999 }, 'crowding')).toContain('Switch the lens to ×10');
    expect(text({ beta: G2, view: 'measured' }, 'measured')).toContain('2.00 times shorter: 100 m of road is 50.00 m');
    expect(text({ beta: 0.99999, view: 'measured' }, 'measured', 'tr')).toContain(
      '224 kat daha kısa: 100 metrelik yol 44,7 cm çıkar'
    );
    expect(text({ beta: 0, view: 'measured' }, 'measured')).toContain('the 10-metre squares');
    expect(text({ beta: 0.99, yaw: Math.PI }, 'camera')).toContain('(+3.0 EV)');
    expect(text({ beta: 0.99, yaw: Math.PI }, 'speedOfLight', 'tr')).toContain('yaklaşık 300\u202F000 km');
    expect(text({ beta: 0.99999, lens: 10 }, 'lens')).toContain('Lens ×10');
    expect(text({ beta: 0.6, yaw: Math.PI / 2 }, 'clocks')).toContain('move on 1.25 seconds');
  });
});

describe('thresholds solved from the physics, not written down', () => {
  const atlas = sharedAtlas();
  const c = explainConstants();

  it('the lamp light is gone where its luminance falls below 1 % (the dossier: 0.69 < D < 1.6)', () => {
    expect(reflectedGain(atlas, 'led', c.ledHigh)).toBeCloseTo(0.01, 6);
    expect(reflectedGain(atlas, 'led', c.ledLow)).toBeCloseTo(0.01, 6);
    expect(c.ledHigh.toPrecision(2)).toBe('1.6');
    expect(c.ledLow.toPrecision(2)).toBe('0.69');
  });

  it('the colours item appears just above 5 % of c', () => {
    const [below, above] = around(0.05);
    expect(has(settled(inputAt({ beta: below })).items, 'colours')).toBe(false);
    expect(has(settled(inputAt({ beta: above })).items, 'colours')).toBe(true);
  });

  it('the live signal example goes where the signal leaves the visible band and comes back 5 nm inside it', () => {
    const at = (nm: number): number => Math.tanh(Math.log(SCENARIO.signals.redNm / nm));
    const shown = settled(inputAt({ beta: 0.4 }));
    expect(has(shown.items, 'colours')).toBe(true);
    // on the way up it stays down to the edge of the visible band …
    expect(has(explain(inputAt({ beta: at(VISIBLE_MIN_NM + 0.01) }), shown.memory).items, 'colours')).toBe(true);
    expect(has(explain(inputAt({ beta: at(VISIBLE_MIN_NM - 0.01) }), shown.memory).items, 'colours')).toBe(false);
    // … and on the way down it returns only 5 nm inside it
    const gone = settled(inputAt({ beta: 0.5 }));
    expect(has(explain(inputAt({ beta: at(VISIBLE_MIN_NM + 4.9) }), gone.memory).items, 'colours')).toBe(false);
    expect(has(explain(inputAt({ beta: at(VISIBLE_MIN_NM + 5.1) }), gone.memory).items, 'colours')).toBe(true);
  });

  it('the lamps ahead go dark exactly where the head-on Doppler factor reaches the upper edge of the window', () => {
    const [below, above] = around(betaWhere((beta) => headOnDopplerFactor(beta) - c.ledHigh));
    expect(has(explain(inputAt({ beta: below })).items, 'invisible')).toBe(false);
    expect(has(explain(inputAt({ beta: above })).items, 'invisible')).toBe(true);
  });

  it('looking back, the light turns infrared exactly where 1/D₀ reaches the lower edge of the window', () => {
    const [below, above] = around(betaWhere((beta) => 1 / headOnDopplerFactor(beta) - c.ledLow));
    expect(ids(settled(inputAt({ beta: below, yaw: Math.PI })).items)).toContain('behind/redder');
    expect(ids(settled(inputAt({ beta: above, yaw: Math.PI })).items)).toContain('behind/infrared');
  });

  it('things beside you are “ahead” exactly where the transverse plane enters the long half-axis of the view', () => {
    for (const aspect of [WIDE, PHONE]) {
      const half = viewGeometry({ fieldOfView: SCENARIO.camera.fieldOfViewDeg * DEG, aspect, yaw: 0, pitch: 0 });
      const [below, above] = around(betaWhere((beta) => transversePlaneApparentAngle(beta) - half.halfLong));
      expect(ids(explain(inputAt({ beta: below, aspect })).items)).toContain('crowding/pull');
      expect(ids(explain(inputAt({ beta: above, aspect })).items)).toContain('crowding/beside');
      const [inside, outside] = around(betaWhere((beta) => transversePlaneApparentAngle(beta) - half.halfShort));
      expect(ids(explain(inputAt({ beta: outside, aspect })).items)).toContain('crowding/circle');
      expect(ids(explain(inputAt({ beta: inside, aspect }), settled(inputAt({ beta: inside, aspect })).memory).items)).toContain(
        'crowding/beside'
      );
    }
  });

  it('a sideways view shows “what is behind you” exactly where its centre comes from 100° in the street frame', () => {
    const [below, above] = around(betaWhere((beta) => deaberrate(Math.PI / 2, beta) - SIDE_FAST_DEG * DEG));
    expect(ids(explain(inputAt({ beta: below, yaw: Math.PI / 2 }), { ...EMPTY_MEMORY, facing: 'side' }).items)).toContain(
      'side/sideSlow'
    );
    expect(ids(explain(inputAt({ beta: above, yaw: Math.PI / 2 }), { ...EMPTY_MEMORY, facing: 'side' }).items)).toContain(
      'side/sideFast'
    );
  });

  it('the Moon glows by itself where its thermal emission equals the sunlight it reflects (the scenario: D ≈ 5.5)', () => {
    const D = c.moonOwnGlowDoppler;
    const own = SCENARIO.moon.surfaceEmissivity * blackbodyLuminanceUnits(atlas, SCENARIO.moon.surfaceTemperatureK * D);
    const reflected = (MOON_DISC_LUMINANCE_CD_M2 / REFERENCE_LUMINANCE_CD_M2) * reflectedGain(atlas, 'moon', D);
    expect(own / reflected).toBeCloseTo(1, 6);
    expect(D.toPrecision(2)).toBe('5.5');
  });

  it('the glow outshines the Sun’s surface where 0.92 L(T) = L(5772 K) (the dossier: D₀ > 20)', () => {
    const T = c.sunMatchKelvin;
    expect(
      (SCENARIO.environment.surfaceEmissivity * blackbodyLuminance(T)) / blackbodyLuminance(NOMINAL_SOLAR_TEMPERATURE_K)
    ).toBeCloseTo(1, 6);
    expect(T / SCENARIO.environment.temperatureK).toBeGreaterThan(20);
    expect(glowBands(T - 1).likeness).toBe(3);
    expect(glowBands(T + 1).likeness).toBe(4);
  });

  it('calls the glow visible where the camera shows it at a small but clear level', () => {
    const beta = Math.tanh(Math.log(GLOW_VISIBLE_DOPPLER));
    for (const aspect of [WIDE, PHONE]) {
      const lnExposure = meterLnExposure(atlas, {
        beta,
        yaw: 0,
        pitch: 0,
        fieldOfView: SCENARIO.camera.fieldOfViewDeg * DEG,
        aspect,
        optical: true,
        thermal: true,
      });
      const level =
        SCENARIO.environment.surfaceEmissivity *
        blackbodyLuminanceUnits(atlas, SCENARIO.environment.temperatureK * GLOW_VISIBLE_DOPPLER) *
        Math.exp(BASE_LN_EXPOSURE + lnExposure);
      expect(level).toBeGreaterThan(0.01);
      expect(level).toBeLessThan(0.05);
    }
  });
});

describe('colour names agree with the colour the renderer draws', () => {
  const atlas = sharedAtlas();
  const c = explainConstants();

  it('names the lamp-lit surfaces dead ahead by their hue', () => {
    const HUES: Record<string, [number, number]> = { green: [120, 170], cyan: [170, 200], blue: [200, 245], violet: [245, 290] };
    let from = 1.03;
    for (const [upTo, band] of LAMP_BANDS) {
      const to = Math.min(upTo, c.ledHigh);
      const { hue } = hueOf(toDisplay(reflectedRadiance(atlas, 'led', [1, 1, 1], (from + to) / 2)));
      expect(hue, band).toBeGreaterThanOrEqual(HUES[band][0]);
      expect(hue, band).toBeLessThan(HUES[band][1]);
      from = to;
    }
  });

  it('names the glow by the colour the camera gives a black body', () => {
    const lowest = SCENARIO.environment.temperatureK * GLOW_VISIBLE_DOPPLER;
    const bounds = [lowest, ...GLOW_COLOUR_BOUNDS_K, 12000];
    const middles = bounds.slice(1).map((upTo, index) => (bounds[index] + upTo) / 2);
    const colours = middles.map((kelvin) => {
      const radiance = blackbodyRadiance(atlas, kelvin);
      const scale = 0.5 / Math.max(...radiance);
      return hueOf(toDisplay([radiance[0] * scale, radiance[1] * scale, radiance[2] * scale]));
    });
    const [red, orange, yellowish, white, bluish, lightBlue] = colours;
    for (const warm of [red, orange]) {
      expect(warm.hue).toBeLessThan(40);
      expect(warm.saturation).toBeGreaterThan(0.6);
    }
    expect(red.hue).toBeLessThan(orange.hue);
    expect(yellowish.hue).toBeGreaterThanOrEqual(20);
    expect(yellowish.hue).toBeLessThan(60);
    expect(yellowish.saturation).toBeGreaterThan(0.1);
    expect(yellowish.saturation).toBeLessThan(0.6);
    expect(white.saturation).toBeLessThan(0.1);
    for (const blue of [bluish, lightBlue]) {
      expect(blue.hue).toBeGreaterThanOrEqual(200);
      expect(blue.hue).toBeLessThan(230);
    }
    expect(bluish.saturation).toBeLessThan(lightBlue.saturation);
    // the bands map onto the six names of both dictionaries
    for (const language of LANGUAGES) expect(MESSAGES[language].explain.glowColours).toHaveLength(colours.length);
  });
});

/** Every state of the sweep: 201 speeds × both views × thermal on and off × 5 directions × 2 pitches × 2 lenses × 2 aspects. */
function* sweep(): Generator<{ state: State; result: ReturnType<typeof settled> }> {
  for (let i = 0; i <= 200; i++) {
    const beta = Math.tanh(RAPIDITY_MAX * (i / 200) ** 2);
    for (const view of ['seen', 'measured'] as const)
      for (const thermal of [true, false])
        for (const yaw of [0, 0.5, Math.PI / 2, 2.4, Math.PI])
          for (const pitch of [0, 0.9])
            for (const lens of [1, 10])
              for (const aspect of [WIDE, PHONE]) {
                if (view === 'measured' && (yaw !== 0 || pitch !== 0 || lens !== 1)) continue;
                const state: State = { beta, view, thermal, yaw, pitch, lens, aspect, paused: i % 7 === 0 };
                yield { state, result: settled(inputAt(state)) };
              }
  }
}

describe('over the whole range', () => {
  const states = [...sweep()];

  it('shows the live signal example only when it is true', () => {
    let shown = 0;
    // up and down the range, with the memory carried along as the panel carries it
    const betas = Array.from({ length: 2001 }, (_, i) => Math.tanh(RAPIDITY_MAX * (i / 2000) ** 2));
    for (const order of [betas, [...betas].reverse()]) {
      let memory = EMPTY_MEMORY;
      for (const beta of order) {
        const result = explain(inputAt({ beta }), memory);
        memory = result.memory;
        const item = find(result.items, 'colours');
        if (!item) continue;
        shown++;
        const nm = SCENARIO.signals.redNm / headOnDopplerFactor(beta);
        expect(nm).toBeGreaterThanOrEqual(VISIBLE_MIN_NM);
        expect(nm).toBeLessThanOrEqual(VISIBLE_MAX_NM);
        expect(classifyWavelength(nm).id).toBe(item.params.signalBand);
        expect(item.params.signalBand).not.toBe('red');
      }
    }
    expect(shown).toBeGreaterThan(100);
  });

  it('never says a thing is visible when its condition says it is not', () => {
    const OPTICAL: ExplainKey[] = ['colours', 'lamps', 'invisible', 'ring', 'brightness', 'camera', 'crowding', 'shapes'];
    const AHEAD: ExplainKey[] = ['colours', 'lamps', 'invisible', 'brightness', 'crowding', 'shapes'];
    const moonRest = (() => {
      const az = SCENARIO.moon.azimuthDeg * DEG;
      const el = SCENARIO.moon.elevationDeg * DEG;
      return { x: Math.cos(el) * Math.sin(az), y: Math.sin(el), z: -Math.cos(el) * Math.cos(az) };
    })();
    for (const { state, result } of states) {
      const keys = result.items.map((item) => item.key);
      if (!state.thermal || state.view === 'measured') expect(keys).not.toContain('heatGlow');
      if (state.view === 'measured') {
        for (const key of [...OPTICAL, 'heatGlow', 'heatOff', 'stars', 'moon', 'behind', 'side'] as const)
          expect(keys).not.toContain(key);
      }
      if (state.yaw === Math.PI) for (const key of AHEAD) expect(keys).not.toContain(key);
      if (keys.includes('moon')) {
        // the projection of the guide layer, written out again
        const input = inputAt(state);
        const across = Math.hypot(moonRest.x, moonRest.y);
        const theta = aberrate(Math.acos(-moonRest.z), state.beta);
        const d = { x: (moonRest.x / across) * Math.sin(theta), y: (moonRest.y / across) * Math.sin(theta), z: -Math.cos(theta) };
        const [cy, sy, cp, sp] = [Math.cos(input.yaw), Math.sin(input.yaw), Math.cos(input.pitch), Math.sin(input.pitch)];
        const vx = d.x * cy - d.z * sy;
        const vz1 = d.x * sy + d.z * cy;
        const vy = d.y * cp + vz1 * sp;
        const vz = -d.y * sp + vz1 * cp;
        const tanY = Math.tan(input.fieldOfView / 2);
        expect(vz).toBeLessThan(0);
        expect(Math.abs(vx / -vz)).toBeLessThan(tanY * input.aspect);
        expect(Math.abs(vy / -vz)).toBeLessThan(tanY);
      }
    }
  });

  it('does not flip-flop while the speed jitters around any state', () => {
    let flips = 0;
    for (let i = 1; i < 400; i++) {
      const phi = RAPIDITY_MAX * (i / 400) ** 2;
      for (const yaw of [0, Math.PI / 2, Math.PI]) {
        const s0 = settled(inputAt({ beta: Math.tanh(phi), yaw }));
        for (const d of [-0.002, 0.002]) {
          const s1 = explain(inputAt({ beta: Math.tanh(phi + d), yaw }), s0.memory);
          const s2 = explain(inputAt({ beta: Math.tanh(phi), yaw }), s1.memory);
          if (keysOf(s1.items) !== keysOf(s0.items) && keysOf(s2.items) !== keysOf(s1.items)) flips++;
        }
      }
    }
    expect(flips).toBe(0);
  });

  it('keeps every text short: titles of 2 to 5 words, bodies of at most 35, with the extra sentence at most 38', () => {
    for (const { state, result } of states) {
      for (const item of result.items) {
        for (const language of LANGUAGES) {
          const text = renderExplainItem(item, language, true);
          const context = `${language} ${explainTextId(item)}: ${text.title} — ${text.body}`;
          expect(words(text.title), context).toBeGreaterThanOrEqual(2);
          expect(words(text.title), context).toBeLessThanOrEqual(5);
          expect(words(text.body), context).toBeLessThanOrEqual(35);
          expect(words(`${text.body} ${text.extra ?? ''}`), context).toBeLessThanOrEqual(38);
          expect(`${text.title} ${text.body} ${text.extra ?? ''}`, context).not.toMatch(/undefined|NaN|—/);
          expect(text.body.endsWith('.'), context).toBe(true);
        }
        expect(item.section).toBe(EXPLAIN_SECTIONS[item.key]);
      }
      expect(state.beta).toBeLessThan(1);
    }
  });

  it('says the same things with the same values in both languages', () => {
    for (const { result } of states) {
      for (const item of result.items) {
        const [tr, en] = LANGUAGES.map((language) => renderExplainItem(item, language, true));
        const all = (text: typeof tr): string => `${text.title} ${text.body} ${text.extra ?? ''}`;
        expect(numbersOf(all(tr)), explainTextId(item)).toEqual(numbersOf(all(en)));
        expect(tr.extra === null, explainTextId(item)).toBe(en.extra === null);
      }
    }
  });

  it('never writes a contraction just above one as "1,00 times"', () => {
    // at 0.05 c the road measures 99,87 m: the factor beside it must not read as exactly one
    const measured = find(settled(inputAt({ beta: 0.05, view: 'measured' })).items, 'measured');
    expect(measured).toBeDefined();
    expect(renderExplainItem(measured!, 'tr', true).body).toContain('1,0013');
    expect(renderExplainItem(measured!, 'en', true).body).toContain('1.0013');
  });

  it('never glues a Turkish case suffix to a value', () => {
    const SENTINEL = 'XYZ';
    const walk = (node: unknown): string[] =>
      typeof node === 'function'
        ? [(node as (...args: unknown[]) => string)(...Array.from({ length: 4 }, () => SENTINEL))]
        : typeof node === 'object' && node !== null && !Array.isArray(node)
          ? Object.values(node).flatMap(walk)
          : [];
    const texts = walk(MESSAGES.tr.explain.items);
    expect(texts.length).toBeGreaterThan(15);
    for (const text of texts) expect(text).not.toMatch(/XYZ['’\p{L}]/u);
  });

  it('reaches every text of the dictionary from some state', () => {
    const reached = new Set<string>();
    const extras = new Set<string>();
    for (const { result } of states) {
      for (const item of result.items) {
        reached.add(explainTextId(item));
        const text = renderExplainItem(item, 'en', true);
        if (text.extra) extras.add(text.extra);
      }
    }
    const expected = (Object.keys(EXPLAIN_SECTIONS) as ExplainKey[]).flatMap((key) =>
      key in EXPLAIN_VARIANTS
        ? EXPLAIN_VARIANTS[key as keyof typeof EXPLAIN_VARIANTS].map((variant) => `${key}/${variant}`)
        : [key]
    );
    expect([...reached].sort()).toEqual(expected.sort());
    expect([...extras].sort()).toEqual(Object.values(MESSAGES.en.explain.extras).sort());
  });

  it('leads to sections the dossier has', () => {
    const sections = new Set(DOSSIER.sections.map((section) => section.id));
    for (const section of Object.values(EXPLAIN_SECTIONS)) expect(sections).toContain(section);
  });
});
