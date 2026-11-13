import { describe, expect, it } from 'vitest';
import { classifyWavelength } from '@/physics/bands';
import { CANDELA_WAVELENGTH_NM, SPEED_OF_LIGHT } from '@/physics/constants';
import { BETA_MAX } from '@/physics/kinematics';
import { SCENARIO } from '@/physics/scenario';
import {
  formatAngle,
  formatFixed,
  formatInteger,
  formatLength,
  formatTemperature,
  formatWavelength,
  GROUP_SEPARATOR,
} from '@/i18n/format';
import { MESSAGES } from '@/i18n/messages';
import {
  CHUNK_COUNT,
  CHUNK_LENGTH,
  chunkLayout,
  chunkLuminaires,
  FADE_AHEAD_END,
  FADE_BEHIND_END,
  MEASURING_GRID_M,
  MODEL_LENGTH,
  VARIANT_COUNT,
} from '@/scene/geometry/layout';
import { LENSES, type Language } from '@/state/simulation';
import { explainConstants, GLOW_VISIBLE_DOPPLER } from '../explain';
import { MARKS } from '../hud/speedMarks';
import {
  CROSSING_SPACING,
  DETAILED,
  INVENTORY,
  INVENTORY_GROUPS,
  INVENTORY_IDS,
  type InventoryId,
  inventoryDetail,
  inventoryPointing,
  isInterfaceEntry,
  lampLimits,
  LIVE_DETAILS,
  SCENE_MARKS,
  type SceneMark,
} from '../inventory';

const LANGUAGES: readonly Language[] = ['tr', 'en'];
const DEG = Math.PI / 180;
/** The velocities at which the live details are checked against the physics. */
const BETAS = [0, 0.2, Math.sqrt(3) / 2, 0.99] as const;

/** Words of a text, as a reader counts them: a token of punctuation or symbols alone (·, =, −, +, —) is not a word. */
const words = (text: string): number =>
  text
    .trim()
    .split(/\s+/)
    .filter((word) => !/^[\p{P}\p{S}]+$/u.test(word)).length;

/** Sentences of a text: each ends with a full stop, a question or an exclamation mark, before a space or the end. */
const sentences = (text: string): number => (text.match(/[.?!][”’"]?(?=\s|$)/gu) ?? []).length;

/** The numbers of a text, with the decimal comma of Turkish read as a point and digit groups joined. */
const numbersOf = (text: string): string[] =>
  (
    text
      .replaceAll(GROUP_SEPARATOR, '')
      .replace(/(\d),(\d)/g, '$1.$2')
      .match(/\d+(?:\.\d+)?/g) ?? []
  ).sort();

/** The numbers of a text in the order they are written. */
const numbersInOrder = (text: string): number[] =>
  (
    text
      .replaceAll(GROUP_SEPARATOR, '')
      .replace(/(\d),(\d)/g, '$1.$2')
      .match(/\d+(?:\.\d+)?/g) ?? []
  ).map(Number);

/** The symbols of a text (Greek letters, subscripts, prime, degree sign, multiplication sign), in a fixed order. */
const symbolsOf = (text: string): string => (text.match(/[\p{Script=Greek}₀-₉′°×]/gu) ?? []).sort().join('');

/** Doppler factor of light from dead ahead, written out here rather than taken from the physics modules. */
const headOn = (beta: number): number => Math.sqrt((1 + beta) / (1 - beta));
const lorentz = (beta: number): number => 1 / Math.sqrt(1 - beta * beta);
/** Apparent angle from the direction of motion of a ray whose rest-frame angle is θ: cos θ′ = (cos θ + β)/(1 + β cos θ). */
const aberrated = (theta: number, beta: number): number => Math.acos((Math.cos(theta) + beta) / (1 + beta * Math.cos(theta)));
/** Apparent angle at which the Doppler factor is D: D = 1/(γ(1 − β cos θ′′)) for the arriving ray, i.e. cos θ′ = (1 − 1/(γD))/β. */
const angleOfDoppler = (doppler: number, beta: number): number => Math.acos((1 - 1 / (lorentz(beta) * doppler)) / beta);

const angle = (radians: number, language: Language): string => formatAngle(radians / DEG, language);
const detail = (id: InventoryId, language: Language, beta: number): string =>
  inventoryDetail(id, MESSAGES[language], language, { beta }) ?? '';

describe('the list of the inventory', () => {
  it('names every entry once, and every group in the order of the panel', () => {
    expect(new Set(INVENTORY_IDS).size).toBe(INVENTORY_IDS.length);
    expect(INVENTORY_GROUPS).toEqual(['scene', 'guides', 'instruments', 'rail', 'bar']);
  });

  it('has the strings of every entry and group in both languages, and no strings without an entry', () => {
    for (const language of LANGUAGES) {
      const inventory = MESSAGES[language].inventory;
      expect(Object.keys(inventory.entries).sort(), language).toEqual([...INVENTORY_IDS].sort());
      expect(Object.keys(inventory.groups).sort(), language).toEqual([...INVENTORY_GROUPS].sort());
    }
  });

  it('points the entries of the scene and the guides at the picture, every other entry at its own element', () => {
    for (const id of [...INVENTORY.scene, ...INVENTORY.guides]) {
      expect(isInterfaceEntry(id), id).toBe(false);
      expect(SCENE_MARKS).toContain(inventoryPointing(id).scene);
    }
    for (const id of [...INVENTORY.instruments, ...INVENTORY.rail, ...INVENTORY.bar]) {
      expect(isInterfaceEntry(id), id).toBe(true);
      expect(inventoryPointing(id)).toEqual({ elements: [id] });
    }
  });

  it('names nothing in the avenue that the layout does not place', () => {
    const placed = new Set(
      Array.from({ length: VARIANT_COUNT }, (_, variant) => chunkLayout(variant).placements.map((p) => p.model)).flat()
    );
    const models: Partial<Record<SceneMark, RegExp>> = {
      road: /\/road-straight\.glb$/,
      crossing: /\/road-crossing\.glb$/,
      pavement: /\/pavement\.glb$/,
      facade: /\/(building|skyscraper)-/,
      window: /\/(building|skyscraper)-/,
      lamp: /\/light-curved\.glb$/,
      signal: /\/traffic-light\.glb$/,
      car: /\/vehicle-/,
      tree: /\/tree-/,
      bench: /\/bench\.glb$/,
      parasol: /\/parasol\.glb$/,
      gantry: /\/sign-highway\.glb$/,
    };
    for (const id of INVENTORY.scene) {
      const pattern = models[inventoryPointing(id).scene!];
      if (pattern)
        expect(
          [...placed].some((model) => pattern.test(model)),
          id
        ).toBe(true);
    }
    // and every kind of model the layout places has an entry
    for (const model of placed) {
      expect(
        Object.values(models).some((pattern) => pattern.test(model)),
        model
      ).toBe(true);
    }
  });
});

describe.each(LANGUAGES)('the texts of the inventory (%s)', (language) => {
  const inventory = MESSAGES[language].inventory;

  it('give every entry a title of one to five words and one to three short sentences of at most 45 words', () => {
    for (const id of INVENTORY_IDS) {
      const { title, body } = inventory.entries[id];
      const context = `${id}: ${body}`;
      expect(words(title), id).toBeGreaterThanOrEqual(1);
      // the panel is named by its own heading, which in English takes six words
      if (id === 'explainer') expect(title, id).toBe(MESSAGES[language].explain.title);
      else expect(words(title), id).toBeLessThanOrEqual(5);
      expect(title.endsWith('.'), id).toBe(false);
      expect(words(body), context).toBeLessThanOrEqual(45);
      expect(sentences(body), context).toBeGreaterThanOrEqual(1);
      expect(sentences(body), context).toBeLessThanOrEqual(3);
      expect(body.endsWith('.'), context).toBe(true);
    }
  });

  it('keep the live details short: one or two sentences of at most 40 words', () => {
    for (const beta of [...BETAS, 0.4, 0.5, BETA_MAX]) {
      for (const id of DETAILED) {
        const text = detail(id, language, beta);
        expect(words(text), `${id} at ${beta}: ${text}`).toBeLessThanOrEqual(40);
        expect(sentences(text), `${id} at ${beta}: ${text}`).toBeGreaterThanOrEqual(1);
        expect(sentences(text), `${id} at ${beta}: ${text}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('write numbers the way the language does', () => {
    const foreign = language === 'tr' ? /\d\.\d/ : /\d,\d/;
    for (const id of INVENTORY_IDS) {
      expect(`${inventory.entries[id].title} ${inventory.entries[id].body}`, id).not.toMatch(foreign);
      for (const beta of BETAS) expect(detail(id, language, beta), id).not.toMatch(foreign);
    }
  });
});

describe('the two languages of the inventory', () => {
  it('say the same numbers and symbols in every entry', () => {
    for (const id of INVENTORY_IDS) {
      const [tr, en] = LANGUAGES.map((language) => {
        const { title, body } = MESSAGES[language].inventory.entries[id];
        return `${title} ${body}`;
      });
      expect(numbersOf(tr), id).toEqual(numbersOf(en));
      expect(symbolsOf(tr), id).toEqual(symbolsOf(en));
    }
  });

  it('say the same numbers in every detail, at every speed', () => {
    for (const beta of [...BETAS, 0.4, BETA_MAX]) {
      for (const id of DETAILED) {
        expect(numbersOf(detail(id, 'tr', beta)), `${id} at ${beta}`).toEqual(numbersOf(detail(id, 'en', beta)));
      }
    }
  });

  it('use every placeholder of a detail exactly once, and in Turkish never with a case suffix glued to it', () => {
    const sentinels = ['AAA', 'BBB', 'CCC'];
    const walk = (node: unknown, path: string): Array<{ path: string; call: (...args: string[]) => string }> =>
      typeof node === 'function'
        ? [{ path, call: node as (...args: string[]) => string }]
        : typeof node === 'object' && node !== null
          ? Object.entries(node).flatMap(([key, child]) => walk(child, `${path}.${key}`))
          : [];
    const [tr, en] = LANGUAGES.map((language) => walk(MESSAGES[language].inventory.details, 'details'));
    expect(tr.map((leaf) => leaf.path)).toEqual(en.map((leaf) => leaf.path));
    tr.forEach((leaf, index) => {
      const arity = leaf.call.length;
      expect(en[index].call.length, leaf.path).toBe(arity);
      const used = sentinels.slice(0, arity);
      for (const text of [leaf.call(...used), en[index].call(...used)]) {
        for (const sentinel of used) expect(text.split(sentinel).length - 1, `${leaf.path}: ${text}`).toBe(1);
      }
      expect(leaf.call(...used), leaf.path).not.toMatch(/(AAA|BBB|CCC)['’\p{L}]/u);
    });
  });
});

describe('the details', () => {
  it('exist exactly for the entries that have one, and change with the speed only where they are written in place', () => {
    for (const language of LANGUAGES) {
      for (const id of INVENTORY_IDS) {
        const at = BETAS.map((beta) => inventoryDetail(id, MESSAGES[language], language, { beta }));
        if (!DETAILED.has(id)) {
          expect(
            at.every((text) => text === null),
            id
          ).toBe(true);
          continue;
        }
        expect(
          at.every((text) => typeof text === 'string' && text.length > 0),
          id
        ).toBe(true);
        if (!LIVE_DETAILS.has(id)) expect(new Set(at).size, id).toBe(1);
      }
    }
    for (const id of LIVE_DETAILS) expect(DETAILED.has(id), id).toBe(true);
  });

  it('reach every sentence of the dictionary at some speed', () => {
    const { details } = MESSAGES.en.inventory;
    const reached = new Set<string>();
    for (const beta of [0, 0.2, 0.4, 0.5, 0.99]) {
      reached.add(detail('ring', 'en', beta));
      reached.add(detail('neutralCircle', 'en', beta));
    }
    const limits = lampLimits();
    const velocity = (value: number): string => formatFixed(value, 2, 'en');
    expect(reached).toContain(details.ring.none(velocity(limits.behind), velocity(limits.ahead)));
    expect([...reached].some((text) => text.startsWith('Lamp light from behind'))).toBe(true);
    expect([...reached].some((text) => text.startsWith('Lamp light now arrives'))).toBe(true);
    expect(reached).toContain(details.neutralCircleRest);
  });

  it('give the street furniture and the crossings the spacing of the layout', () => {
    // crossings: every block of even variant, and block i shows variant i mod VARIANT_COUNT
    const crossings: number[] = [];
    for (let block = 0; block < CHUNK_COUNT; block++) {
      const layout = chunkLayout(block % VARIANT_COUNT);
      const tile = layout.placements.find((placement) => placement.model.endsWith('/road-crossing.glb'));
      if (tile) crossings.push(block * CHUNK_LENGTH + tile.position[2]);
    }
    const gaps = crossings.map((at, index) => (crossings[(index + 1) % crossings.length] - at + MODEL_LENGTH) % MODEL_LENGTH);
    expect(new Set(gaps)).toEqual(new Set([CROSSING_SPACING]));
    // lamps: an even spacing on each side that continues across the blocks
    const along = chunkLuminaires()
      .filter((lamp) => lamp.position[0] > 0)
      .map((lamp) => lamp.position[2])
      .sort((a, b) => a - b);
    const spacing = along[1] - along[0];
    expect(CHUNK_LENGTH - (along[along.length - 1] - along[0])).toBe(spacing);
    for (const language of LANGUAGES) {
      expect(detail('crossings', language, 0)).toContain(formatInteger(CROSSING_SPACING, language));
      expect(detail('lamps', language, 0)).toContain(formatInteger(spacing, language));
    }
  });

  it('state the fixed numbers of the scenario and the layout', () => {
    const limits = lampLimits();
    const c = explainConstants();
    // the lamp light from dead ahead leaves the visible band where the head-on Doppler factor reaches its upper limit
    expect(headOn(limits.ahead)).toBeCloseTo(c.ledHigh, 9);
    expect(1 / headOn(limits.behind)).toBeCloseTo(c.ledLow, 9);
    // the light from behind goes first: the detail of the ring relies on that order
    expect(limits.behind).toBeLessThan(limits.ahead);
    for (const language of LANGUAGES) {
      expect(detail('lamps', language, 0)).toContain(formatFixed(limits.ahead, 2, language));
      expect(detail('lamps', language, 0)).toContain(formatFixed(limits.behind, 2, language));
      expect(detail('stars', language, 0)).toContain(formatInteger(SCENARIO.stars.count, language));
      expect(detail('stars', language, 0)).toContain(formatInteger(SCENARIO.stars.visibilityGain, language));
      // the ends of the model, to the nearest ten metres
      const [ahead, behind] = numbersInOrder(detail('farEnd', language, 0));
      expect(Math.abs(ahead - FADE_AHEAD_END)).toBeLessThanOrEqual(5);
      expect(Math.abs(behind - FADE_BEHIND_END)).toBeLessThanOrEqual(5);
      // about 6.2 million times slower than reality: light crosses the scene at visualLightSpeed metres per second
      expect(detail('avenue', language, 0)).toContain(formatFixed(SPEED_OF_LIGHT / SCENARIO.visualLightSpeed / 1e6, 1, language));
    }
  });

  it.each(BETAS)('agree with the physics at β = %f', (beta) => {
    const d0 = headOn(beta);
    for (const language of LANGUAGES) {
      const at = (id: InventoryId): string => detail(id, language, beta);
      const t = MESSAGES[language];
      // the avenue: β times the displayed speed of light
      expect(at('avenue')).toContain(formatFixed(beta * SCENARIO.visualLightSpeed, 1, language));
      // the windows: illuminant A, shifted as a black body
      expect(at('windows')).toContain(`${formatTemperature(SCENARIO.interior.colourTemperatureK, language)} K`);
      expect(at('windows')).toContain(`${formatTemperature(SCENARIO.interior.colourTemperatureK * d0, language)} K`);
      expect(at('windows')).toContain(formatInteger(SCENARIO.interior.litFraction * 100, language));
      // the red signal from dead ahead
      const nm = SCENARIO.signals.redNm / d0;
      const wavelength = formatWavelength(nm, language);
      expect(at('signals')).toContain(`${wavelength.value} ${wavelength.unit}`);
      expect(at('signals')).toContain(t.bands[classifyWavelength(nm).id]);
      // the Moon: its rest-frame angle from the direction of motion, aberrated
      const moonRest = Math.acos(Math.cos(SCENARIO.moon.elevationDeg * DEG) * Math.cos(SCENARIO.moon.azimuthDeg * DEG));
      expect(at('moon')).toContain(angle(moonRest, language));
      expect(at('moon')).toContain(angle(aberrated(moonRest, beta), language));
      // the glow of the surroundings
      expect(at('heatGlow')).toContain(`${formatTemperature(SCENARIO.environment.temperatureK * d0, language)} K`);
      expect(at('heatGlow')).toContain(`${formatInteger(SCENARIO.environment.temperatureK, language)} K`);
      expect(at('heatGlow')).toContain(
        `${formatFixed((GLOW_VISIBLE_DOPPLER ** 2 - 1) / (GLOW_VISIBLE_DOPPLER ** 2 + 1), 2, language)} c`
      );
      // the measuring grid: rest spacing, and that spacing over γ
      const rest = formatLength(MEASURING_GRID_M, language);
      const now = formatLength(MEASURING_GRID_M / lorentz(beta), language);
      expect(at('grid')).toContain(`${rest.value} ${rest.unit}`);
      expect(at('grid')).toContain(`${now.value} ${now.unit}`);
      // the guides: cos θ′ = β, and D = 1
      expect(at('transverseCircle')).toContain(angle(Math.acos(beta), language));
      if (beta === 0) expect(at('neutralCircle')).toBe(t.inventory.details.neutralCircleRest);
      else expect(at('neutralCircle')).toContain(angle(angleOfDoppler(1, beta), language));
      // the ring of lamp light
      const c = explainConstants();
      const limits = lampLimits();
      if (beta < limits.behind) {
        expect(at('ring')).toContain(formatFixed(limits.behind, 2, language));
        expect(at('ring')).toContain(formatFixed(limits.ahead, 2, language));
      } else {
        expect(beta).toBeGreaterThan(limits.ahead);
        expect(at('ring')).toContain(angle(angleOfDoppler(c.ledHigh, beta), language));
        expect(at('ring')).toContain(angle(angleOfDoppler(c.ledLow, beta), language));
      }
    }
  });

  it('match the observation guide of the dossier at 0.2 c and 0.99 c', () => {
    // 0.2 c: the red signal arrives at 511 nm and looks green
    expect(detail('signals', 'en', 0.2)).toContain('511.1 nm: green');
    // 0.99 c: the Doppler ring between 23° and 36° (rounded in the dossier), the transverse plane at 8.1°
    expect(detail('ring', 'en', 0.99)).toMatch(/between 22\.\d° and 36\.\d°/);
    expect(detail('transverseCircle', 'en', 0.99)).toContain('8.11°');
    // γ = 2: the neutral cone at 54.7°
    expect(detail('neutralCircle', 'en', Math.sqrt(3) / 2)).toContain('54.7°');
  });
});

describe('the fixed facts in the explanations', () => {
  it('agree with the code that makes them true', () => {
    for (const language of LANGUAGES) {
      const { entries } = MESSAGES[language].inventory;
      // only the red lens of every signal is lit
      expect(SCENARIO.signals.aspect).toBe('red');
      // the lenses of the top bar
      for (const lens of LENSES) expect(entries.lens.body).toContain(`×${lens}`);
      // the highest speed of the simulation, and a preset with γ = 2
      expect(entries.beta.body).toContain(formatFixed(BETA_MAX, 5, language));
      expect(MARKS.some((mark) => mark.label === '0.866')).toBe(true);
      expect(entries.presets.body).toContain(formatFixed(0.866, 3, language));
      expect(lorentz(0.866)).toBeCloseTo(2, 2);
      // the reference light of the instruments and its spectrum
      expect(entries.ahead555.body).toContain(`${Math.round(CANDELA_WAVELENGTH_NM)} nm`);
      expect(entries.spectrumMarkers.body).toContain(`${Math.round(CANDELA_WAVELENGTH_NM)} nm`);
      // the temperature of the surroundings (288.15 K, the standard atmosphere): 288 K, 15 °C
      expect(entries.ambient.body).toContain(`${Math.round(SCENARIO.environment.temperatureK)} K`);
      expect(entries.ambient.body).toContain(`${Math.round(SCENARIO.environment.temperatureK - 273.15)} °C`);
      // the speed of light in thousands of km per second
      expect(entries.speed.body).toContain(String(Math.round(SPEED_OF_LIGHT / 1e6)));
    }
  });
});
