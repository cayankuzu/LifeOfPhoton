import { beforeEach, describe, expect, it } from 'vitest';
import { BETA_MAX, controlToBeta, lorentzFactor } from '@/physics/kinematics';
import { type SharedState, decodeFragment, encodeFragment, isExperimentFragment } from '../fragment';
import {
  DEFAULT_SETTINGS,
  LENSES,
  type Language,
  type Settings,
  type ViewMode,
  getSettings,
  updateSettings,
} from '../simulation';

const VIEWS: readonly ViewMode[] = ['seen', 'measured'];
const LANGUAGES: readonly Language[] = ['tr', 'en'];

/** Velocities that seven significant figures reproduce exactly, and one that they do not. */
const EXACT_BETAS = [0, 0.5, 0.99, 0.9999, BETA_MAX];
const GAMMA_TWO = Math.sqrt(3) / 2;

/** Every combination of the settings a link describes. */
function grid(): Settings[] {
  const out: Settings[] = [];
  for (const view of VIEWS) {
    for (const lens of LENSES) {
      for (const thermal of [true, false]) {
        for (const guides of [true, false]) {
          for (const beta of [...EXACT_BETAS, GAMMA_TWO]) {
            for (const language of LANGUAGES) {
              out.push({ ...DEFAULT_SETTINGS, view, lens, thermal, guides, beta, language });
            }
          }
        }
      }
    }
  }
  return out;
}

/** What an empty fragment stands for: the experiment as the fragment format documents it. */
const DEFAULT_EXPERIMENT: SharedState = { beta: 0, view: 'seen', thermal: true, guides: true, lens: 1 };

/** The value of one key of the fragment written for the given settings, or null if the key is absent. */
const written = (settings: Settings, key: string): string | null => new URLSearchParams(encodeFragment(settings)).get(key);

/** Small deterministic generator (the Numerical Recipes LCG), so that the random fragments are the same every run. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** Fails unless the state is one the simulation can be put into. */
function expectValid(state: SharedState, context: string): void {
  expect(Number.isFinite(state.beta), context).toBe(true);
  expect(state.beta, context).toBeGreaterThanOrEqual(0);
  expect(state.beta, context).toBeLessThanOrEqual(BETA_MAX);
  expect(VIEWS, context).toContain(state.view);
  expect(LENSES, context).toContain(state.lens);
  expect(typeof state.thermal, context).toBe('boolean');
  expect(typeof state.guides, context).toBe('boolean');
  if ('language' in state) expect(LANGUAGES, context).toContain(state.language);
}

// one test applies a fragment to the store, which is module-level state
beforeEach(() => {
  updateSettings(DEFAULT_SETTINGS);
});

describe('decodeFragment', () => {
  it('reads an empty fragment as the default experiment, without a language', () => {
    // toStrictEqual also fails on a key that is present but undefined: applied to the
    // store, such a key would erase the language of the reader
    expect(decodeFragment('')).toStrictEqual(DEFAULT_EXPERIMENT);
    expect(decodeFragment('#')).toStrictEqual(DEFAULT_EXPERIMENT);
    // … which is what the store starts with
    const { beta, view, thermal, guides, lens } = DEFAULT_SETTINGS;
    expect(DEFAULT_EXPERIMENT).toStrictEqual({ beta, view, thermal, guides, lens });
  });

  it('reads every key of a complete link, with or without the "#", in any order', () => {
    // these strings are the public format: links that have been shared must keep working
    const complete: SharedState = {
      beta: 0.5,
      view: 'measured',
      thermal: false,
      guides: false,
      lens: 10,
      language: 'en',
    };
    expect(decodeFragment('b=0.5&v=measured&t=0&g=0&z=10&l=en')).toStrictEqual(complete);
    expect(decodeFragment('#b=0.5&v=measured&t=0&g=0&z=10&l=en')).toStrictEqual(complete);
    expect(decodeFragment('#l=en&z=10&g=0&t=0&v=measured&b=0.5')).toStrictEqual(complete);
    expect(decodeFragment('#z=3&l=tr')).toStrictEqual({ ...DEFAULT_EXPERIMENT, lens: 3, language: 'tr' });
  });

  it('describes the experiment completely: a key that is absent is reset, except the language', () => {
    updateSettings({
      beta: 0.9,
      view: 'measured',
      thermal: false,
      guides: false,
      lens: 10,
      language: 'en',
      paused: true,
      dossier: 'optics',
      dock: false,
    });
    // what the application does when a link is pasted into an open tab
    updateSettings(decodeFragment('#z=3'));
    expect(getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      lens: 3,
      // the language is a preference of the reader, not part of the experiment …
      language: 'en',
      // … and what a link does not describe at all stays as it was
      paused: true,
      dossier: 'optics',
      dock: false,
    });
  });

  it('clamps β into the simulated range', () => {
    expect(decodeFragment('b=0.999999').beta).toBe(BETA_MAX);
    expect(decodeFragment('b=1').beta).toBe(BETA_MAX);
    expect(decodeFragment('b=2').beta).toBe(BETA_MAX);
    expect(decodeFragment('b=-1').beta).toBe(0);
  });

  it('falls back to the default for a value it does not understand', () => {
    const malformed = [
      // not a number, a decimal comma, not finite
      'b=abc',
      'b=',
      'b=0,5',
      'b=0.5c',
      'b=NaN',
      'b=Infinity',
      // not one of the lenses
      'z=7',
      'z=abc',
      'z=',
      'z=-3',
      // not a view; the names are case-sensitive
      'v=other',
      'v=MEASURED',
      'v=',
      // only "0" switches a layer off
      't=1',
      't=off',
      'g=false',
      // not a language of the interface
      'l=de',
      'l=EN',
      'l=',
    ];
    for (const fragment of malformed) expect(decodeFragment(fragment), fragment).toStrictEqual(DEFAULT_EXPERIMENT);
  });

  it('ignores keys it does not know', () => {
    expect(decodeFragment('x=1&foo=bar&b=0.5&utm_source=mail')).toStrictEqual({ ...DEFAULT_EXPERIMENT, beta: 0.5 });
    // names that exist on every object are not keys of the format either
    expect(decodeFragment('__proto__=1&constructor=2&toString=3')).toStrictEqual(DEFAULT_EXPERIMENT);
  });

  it('reads percent-encoded values, but finds no keys in a fragment that was encoded as a whole', () => {
    expect(decodeFragment('b=%30.5&v=%6Deasured&l=%74r')).toStrictEqual({
      ...DEFAULT_EXPERIMENT,
      beta: 0.5,
      view: 'measured',
      language: 'tr',
    });
    expect(decodeFragment('b%3D0.5%26v%3Dmeasured')).toStrictEqual(DEFAULT_EXPERIMENT);
  });

  it('never throws and always returns a state the simulation can be put into', () => {
    const awkward = [
      // percent signs that do not start a valid escape
      '%',
      'b=%',
      'b=%ZZ',
      'v=%E0%A4%A',
      // separators without content, keys without values
      '&&&',
      '=',
      '=&=',
      'b',
      'b&v&t&g&z&l',
      // other ways of writing a link wrongly
      '##b=0.5',
      '#b=0.5#v=measured',
      'b=0.5;v=measured',
      'b=0.5&amp;v=measured',
      'b=1e999&z=1e999',
      'b=0x10',
      `b=${'9'.repeat(400)}`,
      '#'.repeat(200),
    ];
    // … and a thousand strings made of the characters fragments are made of
    const alphabet = 'bvtgzl=&#%+.-0123456789measurdtn';
    const random = seeded(2718);
    for (let i = 0; i < 1000; i++) {
      const length = Math.floor(30 * random());
      awkward.push(Array.from({ length }, () => alphabet[Math.floor(alphabet.length * random())]).join(''));
    }
    for (const fragment of awkward) {
      expect(() => decodeFragment(fragment), fragment).not.toThrow();
      expectValid(decodeFragment(fragment), fragment);
    }
  });
});

describe('encodeFragment', () => {
  it('lists only what differs from the defaults, plus the language', () => {
    expect(encodeFragment(DEFAULT_SETTINGS)).toBe(`l=${DEFAULT_SETTINGS.language}`);
    expect(encodeFragment({ ...DEFAULT_SETTINGS, language: 'en' })).toBe('l=en');
    for (const settings of grid()) {
      const expected = ['l'];
      if (settings.beta !== DEFAULT_SETTINGS.beta) expected.push('b');
      if (settings.view !== DEFAULT_SETTINGS.view) expected.push('v');
      if (settings.thermal !== DEFAULT_SETTINGS.thermal) expected.push('t');
      if (settings.guides !== DEFAULT_SETTINGS.guides) expected.push('g');
      if (settings.lens !== DEFAULT_SETTINGS.lens) expected.push('z');
      const fragment = encodeFragment(settings);
      expect([...new URLSearchParams(fragment).keys()].sort(), fragment).toEqual(expected.sort());
    }
  });

  it('writes the keys and values of the documented format', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      beta: 0.5,
      view: 'measured',
      thermal: false,
      guides: false,
      lens: 10,
    };
    expect(written(settings, 'b')).toBe('0.5');
    expect(written(settings, 'v')).toBe('measured');
    expect(written(settings, 't')).toBe('0');
    expect(written(settings, 'g')).toBe('0');
    expect(written(settings, 'z')).toBe('10');
    expect(written(settings, 'l')).toBe('tr');
    // nothing that would need escaping, and no "#": the caller adds it
    expect(encodeFragment(settings)).toMatch(/^[a-z0-9.=&]+$/);
  });

  it('leaves out what is not part of the experiment', () => {
    // a link opens the experiment, not the state of somebody's interface
    for (const settings of grid()) {
      const elsewhere: Settings = { ...settings, paused: true, dossier: 'optics', dock: false };
      expect(encodeFragment(elsewhere)).toBe(encodeFragment(settings));
    }
  });

  it('writes β with seven significant figures: enough to tell 0.99999 from 0.9999', () => {
    expect(written({ ...DEFAULT_SETTINGS, beta: BETA_MAX }, 'b')).toBe('0.99999');
    expect(written({ ...DEFAULT_SETTINGS, beta: 0.9999 }, 'b')).toBe('0.9999');
    expect(written({ ...DEFAULT_SETTINGS, beta: GAMMA_TWO }, 'b')).toBe('0.8660254');
    // without the noise of binary fractions
    expect(written({ ...DEFAULT_SETTINGS, beta: 0.1 + 0.2 }, 'b')).toBe('0.3');
  });
});

describe('a link', () => {
  it('reproduces the settings it was made from', () => {
    for (const settings of grid()) {
      const fragment = encodeFragment(settings);
      const { beta, ...rest } = decodeFragment(fragment);
      const { view, thermal, guides, lens, language } = settings;
      expect(rest, fragment).toStrictEqual({ view, thermal, guides, lens, language });
      if (EXACT_BETAS.includes(settings.beta)) {
        expect(beta, fragment).toBe(settings.beta);
      } else {
        // seven significant figures of a number below 1: within half a unit of the seventh decimal
        expect(Math.abs(beta - settings.beta), fragment).toBeLessThanOrEqual(0.5e-7);
      }
    }
  });

  it('reproduces itself: decoding and encoding again gives the same link', () => {
    for (const settings of grid()) {
      const fragment = encodeFragment(settings);
      expect(encodeFragment({ ...DEFAULT_SETTINGS, ...decodeFragment(fragment) })).toBe(fragment);
    }
  });

  it('keeps the Lorentz factor to better than 0.3 % at every speed of the range', () => {
    // Rounding β to seven figures moves it by at most 5 × 10⁻⁸, which is 0.5 % of 1 − β at
    // the top of the range, where it matters most; γ goes as (1 − β)^(−1/2), hence half of that.
    for (let step = 0; step <= 2000; step++) {
      const beta = controlToBeta(step / 2000);
      const back = decodeFragment(encodeFragment({ ...DEFAULT_SETTINGS, beta })).beta;
      expect(back, `β = ${beta}`).toBeLessThanOrEqual(BETA_MAX);
      expect(Math.abs(lorentzFactor(back) / lorentzFactor(beta) - 1), `β = ${beta}`).toBeLessThan(0.003);
    }
  });
});

describe('isExperimentFragment', () => {
  it('tells a link to an experiment from an in-page anchor', () => {
    // The page has anchors of its own (the skip link, the citations of the dossier).
    // Following one fires hashchange; read as an experiment it would mean "everything
    // at its default" and put the observer back to rest.
    for (const anchor of ['', '#', '#controls', '#reference-einstein1905', 'dossier-method', '#x=1&y=2']) {
      expect(isExperimentFragment(anchor), anchor).toBe(false);
    }
    for (const link of ['#b=0.99', 'b=0.5&v=measured', '#z=3', '#l=tr', '#t=0', '#g=0', '#v=measured', '#b=']) {
      expect(isExperimentFragment(link), link).toBe(true);
    }
  });

  it('accepts every fragment the application writes itself', () => {
    for (const beta of [0, 0.5, BETA_MAX]) {
      for (const view of ['seen', 'measured'] as const) {
        const fragment = encodeFragment({ ...DEFAULT_SETTINGS, beta, view });
        expect(isExperimentFragment(fragment), fragment).toBe(true);
      }
    }
  });
});
