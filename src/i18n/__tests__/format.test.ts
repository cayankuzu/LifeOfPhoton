import { describe, expect, it } from 'vitest';
import { BETA_MAX, controlToBeta } from '@/physics/kinematics';
import type { Language } from '@/state/simulation';
import {
  formatAngle,
  formatBeta,
  formatClock,
  formatExposure,
  formatFixed,
  formatGamma,
  formatInteger,
  formatLength,
  formatSignificant,
  formatTemperature,
  formatWavelength,
  GROUP_SEPARATOR,
} from '../format';

const LANGUAGES: readonly Language[] = ['tr', 'en'];

/** What a read-out shows when there is no number to show. */
const EM_DASH = '—';
/** The true minus sign, as wide as "+" in tabular figures; not the hyphen of the keyboard. */
const MINUS = '−';
/** Written with the micro sign U+00B5, which is not the Greek letter mu. */
const MICROMETRE = 'µm';

/** The narrow no-break space between digit groups, written short so that the expectations stay readable. */
const G = GROUP_SEPARATOR;

/** The same number as Turkish writes it: a decimal comma; the digit groups are separated alike in both languages. */
const inTurkish = (english: string): string => english.replace(/\./g, ',');

/** Superscript digits in numerical order, for reading an exponent back. */
const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/**
 * Reads a formatted number back, so that a test can state what a string means and
 * not only how it is spelt. Understands both languages and the "m × 10ⁿ" form.
 */
function readBack(text: string, language: Language): number {
  const [mantissa, power] = text.split(' × 10');
  const ungrouped = mantissa.replaceAll(GROUP_SEPARATOR, '');
  const plain = language === 'tr' ? ungrouped.replace(',', '.') : ungrouped;
  const exponent =
    power === undefined
      ? '0'
      : [...power].map((character) => (character === '⁻' ? '-' : SUPERSCRIPT_DIGITS.indexOf(character))).join('');
  return Number(`${plain}e${exponent}`);
}

/** Small deterministic generator (the Numerical Recipes LCG), so that a scan is the same on every run. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe('formatFixed', () => {
  it('writes exactly the requested decimals, with the decimal mark of the language', () => {
    expect(formatFixed(7.089, 3, 'tr')).toBe('7,089');
    expect(formatFixed(7.089, 3, 'en')).toBe('7.089');
    // padded with zeros rather than shortened: a column of readings must not change width
    expect(formatFixed(2, 3, 'en')).toBe('2.000');
    expect(formatFixed(0.5, 4, 'tr')).toBe('0,5000');
    // rounded to the nearest, in either direction, not truncated
    expect(formatFixed(3.14159, 2, 'en')).toBe('3.14');
    expect(formatFixed(2.71828, 2, 'en')).toBe('2.72');
    expect(formatFixed(0.9996, 3, 'tr')).toBe('1,000');
    expect(formatFixed(447.2125, 0, 'en')).toBe('447');
  });

  it('separates thousands only when asked to, with a narrow no-break space in both languages', () => {
    expect(GROUP_SEPARATOR).toBe('\u202F');
    expect(formatFixed(1234567.891, 2, 'en')).toBe('1234567.89');
    expect(formatFixed(1234567.891, 2, 'en', true)).toBe(`1${G}234${G}567.89`);
    expect(formatFixed(1234567.891, 2, 'tr')).toBe('1234567,89');
    expect(formatFixed(1234567.891, 2, 'tr', true)).toBe(`1${G}234${G}567,89`);
    // neither the point nor the comma of the locales: each is the decimal marker of the other language
    for (const language of LANGUAGES) expect(formatFixed(1234567, 0, language, true)).toBe(`1${G}234${G}567`);
  });

  it('keeps language, precision and grouping apart however the calls are interleaved', () => {
    // the Intl formatters are cached per combination: two combinations sharing one cache entry would show up here
    for (let round = 0; round < 2; round++) {
      for (const digits of [0, 1, 3, 6]) {
        for (const language of LANGUAGES) {
          for (const grouping of [false, true]) {
            const text = formatFixed(1234567.03125, digits, language, grouping);
            const [whole, fraction = ''] = text.split(language === 'tr' ? ',' : '.');
            const grouped = `1${G}234${G}567`;
            expect(whole, text).toBe(grouping ? grouped : '1234567');
            expect(fraction, text).toHaveLength(digits);
          }
        }
      }
    }
  });
});

describe('formatInteger', () => {
  it('rounds to a whole number and separates the thousands from five digits on', () => {
    // the speed of light in km/s, the largest value the speed rail can show …
    expect(formatInteger(299_792.458, 'tr')).toBe(`299${G}792`);
    expect(formatInteger(299_792.458, 'en')).toBe(`299${G}792`);
    // … 0.5 c, and the top of the simulated range
    expect(formatInteger(149_896.229, 'en')).toBe(`149${G}896`);
    expect(formatInteger(299_789.46, 'tr')).toBe(`299${G}789`);
    expect(formatInteger(0, 'tr')).toBe('0');
    expect(formatInteger(999.4, 'en')).toBe('999');
    // a four-digit number stands unseparated (SI Brochure, §5.4.4), the rounding decides how many digits there are
    expect(formatInteger(999.6, 'en')).toBe('1000');
    expect(formatInteger(9999.4, 'tr')).toBe('9999');
    expect(formatInteger(9999.6, 'tr')).toBe(`10${G}000`);
    expect(formatInteger(-12_345, 'en')).toBe(`-12${G}345`);
    expect(formatInteger(1_000_000_000, 'tr')).toBe(`1${G}000${G}000${G}000`);
  });
});

describe('formatSignificant', () => {
  it('writes values between 10⁻³ and 10⁶ out, with the requested figures', () => {
    const cases: Array<[value: number, figures: number, english: string]> = [
      [3.14159, 3, '3.14'],
      [3.14159, 5, '3.1416'],
      [1, 3, '1.00'],
      [0.5, 1, '0.5'],
      [0.001234, 3, '0.00123'],
      [1.1547, 4, '1.155'],
      [447.2125, 4, '447.2'],
      [12345.678, 7, `12${G}345.68`],
    ];
    for (const [value, figures, english] of cases) {
      expect(formatSignificant(value, figures, 'en')).toBe(english);
      expect(formatSignificant(value, figures, 'tr')).toBe(inTurkish(english));
    }
    expect(formatSignificant(447.2125, 4, 'tr')).toBe('447,2');
    expect(formatSignificant(12345.678, 7, 'tr')).toBe(`12${G}345,68`);
    // four digits before the decimal marker stand unseparated
    expect(formatSignificant(4064.86, 4, 'tr')).toBe('4065');
  });

  it('switches to mantissa × 10ⁿ below 10⁻³ and from 10⁶ upwards', () => {
    // the lower limit itself is still written out, the first value below it is not
    expect(formatSignificant(0.001, 3, 'en')).toBe('0.00100');
    expect(formatSignificant(0.000999, 3, 'en')).toBe('9.99 × 10⁻⁴');
    // the upper limit is the first value in powers of ten
    expect(formatSignificant(999_999, 6, 'en')).toBe(`999${G}999`);
    expect(formatSignificant(1e6, 3, 'en')).toBe('1.00 × 10⁶');
    expect(formatSignificant(1_234_567, 3, 'tr')).toBe('1,23 × 10⁶');
    expect(formatSignificant(0.000025, 2, 'tr')).toBe('2,5 × 10⁻⁵');
  });

  it('writes every exponent in superscript digits', () => {
    // between them these exponents use all ten digits and the minus sign
    const cases: Array<[exponent: number, written: string]> = [
      [-19, '⁻¹⁹'],
      [-10, '⁻¹⁰'],
      [23, '²³'],
      [45, '⁴⁵'],
      [67, '⁶⁷'],
      [89, '⁸⁹'],
    ];
    for (const [exponent, written] of cases) {
      expect(formatSignificant(Number(`2.5e${exponent}`), 2, 'en')).toBe(`2.5 × 10${written}`);
      expect(formatSignificant(Number(`2.5e${exponent}`), 2, 'tr')).toBe(`2,5 × 10${written}`);
    }
  });

  it('writes zero as a bare 0, whatever the figures', () => {
    for (const language of LANGUAGES) {
      expect(formatSignificant(0, 1, language)).toBe('0');
      expect(formatSignificant(0, 4, language)).toBe('0');
      // also the negative zero that a product with a negative factor leaves behind
      expect(formatSignificant(-0, 4, language)).toBe('0');
    }
  });

  it('writes a negative value as its magnitude with a minus in front', () => {
    const cases: Array<[value: number, figures: number]> = [
      [3.14159, 3],
      [0.000025, 2],
      [1_234_567, 3],
      [12345.678, 7],
    ];
    for (const [value, figures] of cases) {
      for (const language of LANGUAGES) {
        const negative = formatSignificant(-value, figures, language);
        expect(negative.slice(1)).toBe(formatSignificant(value, figures, language));
        // which of the two minus signs stands in front is left open here
        expect(negative[0]).toMatch(/[-−]/);
      }
    }
  });

  it('means the number it was given, to the requested figures, over 24 decades', () => {
    const random = seeded(1905);
    for (let i = 0; i < 2000; i++) {
      const value = (random() < 0.2 ? -1 : 1) * 10 ** (-12 + 24 * random());
      const figures = 1 + Math.floor(6 * random());
      // half a unit of the last requested figure; the factor allows for the rounding of this bound itself
      const tolerance = 0.5 * 10 ** (Math.floor(Math.log10(Math.abs(value))) - figures + 1) * (1 + 1e-9);
      for (const language of LANGUAGES) {
        const text = formatSignificant(value, figures, language);
        const error = Math.abs(readBack(text, language) - value);
        expect(error, `${value} to ${figures} figures reads "${text}"`).toBeLessThanOrEqual(tolerance);
      }
    }
  });

  it('carries into the next decade when the last figure rounds up', () => {
    // 9.996 to three figures is ten, not 9.99
    for (const language of LANGUAGES) {
      expect(readBack(formatSignificant(9.996, 3, language), language)).toBe(10);
      expect(readBack(formatSignificant(99.96, 3, language), language)).toBe(100);
      expect(readBack(formatSignificant(0.0009996, 3, language), language)).toBe(0.001);
      expect(readBack(formatSignificant(9.996e6, 3, language), language)).toBe(1e7);
    }
    // and the carried number keeps its count of figures and a mantissa below ten
    expect(formatSignificant(9.996, 3, 'en')).toBe('10.0');
    expect(formatSignificant(99.96, 3, 'en')).toBe('100');
    expect(formatSignificant(0.0009996, 3, 'en')).toBe('0.00100');
    expect(formatSignificant(9.996e6, 3, 'en')).toBe('1.00 × 10⁷');
    expect(formatSignificant(9.996e6, 3, 'tr')).toBe('1,00 × 10⁷');
    expect(formatSignificant(9.99996e22, 4, 'en')).toBe('1.000 × 10²³');
    // an integer is rounded to the figures asked for, not printed in full
    expect(formatSignificant(3514.86, 2, 'en')).toBe('3500');
    expect(formatSignificant(1301.55, 2, 'tr')).toBe('1300');
    expect(formatSignificant(299_792.458, 4, 'en')).toBe(`299${G}800`);
    // the case the dossier prints: 1 − β at the top of the range, to two figures
    expect(formatSignificant(9.999999999954e-6, 2, 'en')).toBe('1.0 × 10⁻⁵');
  });

  it('never writes a mantissa of ten', () => {
    for (let exponent = -30; exponent <= 30; exponent++) {
      for (const mantissa of [9.4, 9.94, 9.95, 9.994, 9.995, 9.9994, 9.9995, 9.99999999]) {
        for (const figures of [1, 2, 3, 4, 5]) {
          for (const language of LANGUAGES) {
            const text = formatSignificant(mantissa * 10 ** exponent, figures, language);
            expect(/(^|[^\d.,])10([.,]0*)? × 10/.test(text), text).toBe(false);
          }
        }
      }
    }
  });
});

describe('formatBeta', () => {
  /** The velocities marked on the speed rail. */
  const MARKED = [0, 0.5, 0.99, 0.999, 0.9999, BETA_MAX];

  it('shows four decimals while that is enough to tell β from 1', () => {
    expect(formatBeta(0, 'en')).toBe('0.0000');
    expect(formatBeta(0.5, 'en')).toBe('0.5000');
    expect(formatBeta(0.99, 'en')).toBe('0.9900');
    expect(formatBeta(0.5, 'tr')).toBe('0,5000');
    expect(formatBeta(0.99, 'tr')).toBe('0,9900');
  });

  it('keeps the last nine of every marked velocity', () => {
    for (const beta of MARKED) {
      for (const language of LANGUAGES) {
        const text = formatBeta(beta, language);
        // read back, the string is the velocity itself: no nine has been rounded away or added
        expect(readBack(text, language), text).toBe(beta);
        expect(text.startsWith('0'), text).toBe(true);
      }
    }
  });

  it('shows one decimal more than the leading nines, also where 1 − β is a rounding error off a power of ten', () => {
    // 1 − 0.9999 and 1 − 0.99999 fall just below 10⁻⁴ and 10⁻⁵ in binary, 1 − 0.999 just above 10⁻³
    expect(formatBeta(0.99, 'en')).toBe('0.9900');
    expect(formatBeta(0.999, 'en')).toBe('0.9990');
    expect(formatBeta(0.9999, 'en')).toBe('0.99990');
    expect(formatBeta(BETA_MAX, 'en')).toBe('0.999990');
    expect(formatBeta(BETA_MAX, 'tr')).toBe('0,999990');
    // a marked velocity reads like the velocities just below it; one more decimal appears as soon as
    // the gap drops below the power of ten, so that 1 − β always keeps two significant figures
    expect(formatBeta(0.99989, 'en')).toBe('0.99989');
    expect(formatBeta(0.99991, 'en')).toBe('0.999910');
    expect(formatBeta(0.999985, 'en')).toBe('0.999985');
  });

  it('never reads as 1 and resolves 1 − β to within 5 % over the whole simulated range', () => {
    const betas = Array.from({ length: 2001 }, (_, step) => controlToBeta(step / 2000));
    // the decades below the limit, where another decimal is needed each time
    for (let decade = 1; decade <= 5; decade++) {
      for (const multiple of [1, 1.5, 2, 5, 9.5]) betas.push(Math.min(BETA_MAX, 1 - multiple * 10 ** -decade));
    }
    for (const beta of betas) {
      for (const language of LANGUAGES) {
        const text = formatBeta(beta, language);
        const shown = readBack(text, language);
        expect(shown, `β = ${beta} reads "${text}"`).toBeLessThan(1);
        // rounding moves the value by at most half a unit of the last decimal shown, and that
        // decimal is at most a tenth of the distance to 1
        expect(Math.abs(shown - beta), `β = ${beta} reads "${text}"`).toBeLessThanOrEqual(0.05 * (1 - beta));
      }
    }
  });

  it('never gives up decimals as the speed rises', () => {
    let decimals = 0;
    for (let step = 0; step <= 2000; step++) {
      const text = formatBeta(controlToBeta(step / 2000), 'en');
      const shown = text.length - text.indexOf('.') - 1;
      expect(shown, text).toBeGreaterThanOrEqual(decimals);
      decimals = shown;
    }
    // and the top of the range does need more of them than rest
    expect(decimals).toBeGreaterThan(4);
  });
});

describe('formatGamma', () => {
  it('keeps four significant figures: the decimals step down at 10 and at 100', () => {
    const cases: Array<[gamma: number, english: string]> = [
      [1, '1.000'],
      [1.1547, '1.155'], // β = 0.5
      [7.0888, '7.089'], // β = 0.99
      [9.999, '9.999'],
      [10, '10.00'],
      [22.366, '22.37'], // β = 0.999
      [99.99, '99.99'],
      [100, '100.0'],
      [223.607, '223.6'], // the top of the simulated range
      [447.2125, '447.2'], // the head-on Doppler factor there, which is shown by the same rule
    ];
    for (const [gamma, english] of cases) {
      expect(formatGamma(gamma, 'en')).toBe(english);
      expect(formatGamma(gamma, 'tr')).toBe(inTurkish(english));
    }
    expect(formatGamma(7.0888, 'tr')).toBe('7,089');
  });
});

describe('formatAngle', () => {
  it('gives small angles more decimals: three below 1°, two below 10°, one from there on', () => {
    const cases: Array<[degrees: number, english: string]> = [
      [0, '0.000°'],
      [0.25624, '0.256°'], // where the transverse plane is seen at the top of the range
      [0.999, '0.999°'],
      [1, '1.00°'],
      [8.1096, '8.11°'], // the same at 0.99 c
      [9.99, '9.99°'],
      [10, '10.0°'],
      [29.82, '29.8°'],
      [90, '90.0°'],
      [180, '180.0°'],
    ];
    for (const [degrees, english] of cases) {
      expect(formatAngle(degrees, 'en')).toBe(english);
      expect(formatAngle(degrees, 'tr')).toBe(inTurkish(english));
    }
    expect(formatAngle(8.1096, 'tr')).toBe('8,11°');
  });

  it('chooses the precision of a negative angle by its magnitude', () => {
    for (const degrees of [0.25624, 8.1096, 29.82]) {
      const negative = formatAngle(-degrees, 'en');
      expect(negative.slice(1)).toBe(formatAngle(degrees, 'en'));
      expect(negative[0]).toMatch(/[-−]/);
    }
  });
});

describe('formatWavelength', () => {
  it('chooses the unit by magnitude, from picometres to metres', () => {
    const cases: Array<[nanometres: number, value: string, unit: string]> = [
      [0.5, '500.0', 'pm'],
      [1.241, '1.241', 'nm'], // the 555 nm reference seen head-on at the top of the range …
      [555, '555.0', 'nm'], // … at rest …
      [248_199, '248.2', MICROMETRE], // … and from behind
      [2.1e8, '210.0', 'mm'], // the 21 cm line of hydrogen
      [3e9, '3.000', 'm'],
    ];
    for (const [nanometres, value, unit] of cases) {
      expect(formatWavelength(nanometres, 'en')).toEqual({ value, unit });
      expect(formatWavelength(nanometres, 'tr')).toEqual({ value: inTurkish(value), unit });
    }
  });

  it('moves to the next unit at every power of a thousand', () => {
    const steps: Array<[nanometres: number, below: string, above: string]> = [
      [1, 'pm', 'nm'],
      [1e3, 'nm', MICROMETRE],
      [1e6, MICROMETRE, 'mm'],
      [1e9, 'mm', 'm'],
    ];
    for (const [nanometres, below, above] of steps) {
      expect(formatWavelength(nanometres, 'en')).toEqual({ value: '1.000', unit: above });
      expect(formatWavelength(0.999 * nanometres, 'en')).toEqual({ value: '999.0', unit: below });
    }
    expect(formatWavelength(0.001, 'en')).toEqual({ value: '1.000', unit: 'pm' });
  });

  it('stays with the outermost units beyond the ends of the ladder', () => {
    expect(formatWavelength(1e-4, 'en')).toEqual({ value: '0.1000', unit: 'pm' });
    expect(formatWavelength(5e15, 'en')).toEqual({ value: '5.000 × 10⁶', unit: 'm' });
  });

  it('always means the wavelength it was given, as a reading between 1 and 1000 of its unit', () => {
    const metresPer: Record<string, number> = { pm: 1e-12, nm: 1e-9, [MICROMETRE]: 1e-6, mm: 1e-3, m: 1 };
    // from 1 pm to 1 m in steps of half a per cent, and the neighbourhood of every change of unit
    const samples: number[] = [];
    for (let nanometres = 1e-3; nanometres <= 1e9; nanometres *= 1.005) samples.push(nanometres);
    for (const step of [1, 1e3, 1e6, 1e9]) samples.push(0.9994 * step, 0.9996 * step, 0.99994 * step, 0.99996 * step);
    for (const nanometres of samples) {
      for (const language of LANGUAGES) {
        const { value, unit } = formatWavelength(nanometres, language);
        const shown = readBack(value, language);
        const context = `${nanometres} nm reads "${value} ${unit}"`;
        // no "1000 nm" while there is a larger unit, and no early change that would waste a figure
        expect(shown, context).toBeLessThan(1000);
        expect(shown, context).toBeGreaterThanOrEqual(1);
        // four significant figures: half a unit of the fourth, relative to a reading of at least 1.000
        const metres = nanometres * 1e-9;
        expect(Math.abs(shown * metresPer[unit] - metres) / metres, context).toBeLessThan(5.01e-4);
      }
    }
  });
});

describe('formatTemperature', () => {
  it('shows whole kelvin below 1000 K', () => {
    expect(formatTemperature(288, 'en')).toBe('288');
    expect(formatTemperature(2.725, 'en')).toBe('3');
    expect(formatTemperature(499.6, 'tr')).toBe('500');
  });

  it('shows four significant figures from 1000 K upwards, rounded and not merely cut', () => {
    // the 288 K surroundings seen head-on at 0.99 c and at the top of the range, then a stellar core
    for (const kelvin of [1000, 4062.7, 128_795, 1.5e7]) {
      for (const language of LANGUAGES) {
        const text = formatTemperature(kelvin, language);
        // half a unit of the fourth figure is at most 0.05 % of the value
        expect(Math.abs(readBack(text, language) - kelvin) / kelvin, text).toBeLessThanOrEqual(0.0005);
      }
    }
    expect(formatTemperature(1.5e7, 'en')).toBe('1.500 × 10⁷');
    expect(formatTemperature(1.5e7, 'tr')).toBe('1,500 × 10⁷');
    // what the instrument shows for the surroundings ahead at 0.99 c and at the top of the range
    expect(formatTemperature(4064.86, 'en')).toBe('4065');
    expect(formatTemperature(128_864, 'en')).toBe(`128${G}900`);
    expect(formatTemperature(128_864, 'tr')).toBe(`128${G}900`);
  });
});

describe('formatLength', () => {
  it('chooses millimetres, centimetres, metres or kilometres by magnitude', () => {
    const cases: Array<[metres: number, value: string, unit: string]> = [
      [100, '100.0', 'm'], // the 100 m of road at rest …
      [14.107, '14.11', 'm'], // … measured at 0.99 c …
      [0.44721, '44.7', 'cm'], // … and at the top of the range
      [0.005, '5.00', 'mm'],
      [2500, '2.500', 'km'],
    ];
    for (const [metres, value, unit] of cases) {
      expect(formatLength(metres, 'en')).toEqual({ value, unit });
      expect(formatLength(metres, 'tr')).toEqual({ value: inTurkish(value), unit });
    }
  });

  it('changes unit at 1 cm, 1 m and 1 km, each limit belonging to the larger unit', () => {
    expect(formatLength(0.009, 'en')).toEqual({ value: '9.00', unit: 'mm' });
    expect(formatLength(0.01, 'en')).toEqual({ value: '1.00', unit: 'cm' });
    expect(formatLength(0.99, 'en')).toEqual({ value: '99.0', unit: 'cm' });
    expect(formatLength(1, 'en')).toEqual({ value: '1.000', unit: 'm' });
    expect(formatLength(999, 'en')).toEqual({ value: '999.0', unit: 'm' });
    expect(formatLength(1000, 'en')).toEqual({ value: '1.000', unit: 'km' });
  });

  it('chooses the unit for the value as it is shown: no "100 cm", "1000 m" or "10.0 mm" just below a step', () => {
    // the 100 m of road at γ = 100.001 measures 0.99999 m
    expect(formatLength(0.99999, 'en')).toEqual({ value: '1.000', unit: 'm' });
    expect(formatLength(0.9996, 'en')).toEqual({ value: '0.9996', unit: 'm' });
    expect(formatLength(0.994, 'en')).toEqual({ value: '99.4', unit: 'cm' });
    expect(formatLength(999.96, 'en')).toEqual({ value: '1.000', unit: 'km' });
    expect(formatLength(0.009996, 'en')).toEqual({ value: '1.00', unit: 'cm' });
    expect(formatLength(0.00994, 'en')).toEqual({ value: '9.94', unit: 'mm' });
  });

  it('chooses the unit of a negative length by its magnitude', () => {
    expect(formatLength(-0.02, 'en').unit).toBe('cm');
    expect(formatLength(-14.107, 'en').unit).toBe('m');
    expect(formatLength(-2500, 'en').unit).toBe('km');
  });
});

describe('formatClock', () => {
  it('reads minutes, seconds and tenths, with the decimal mark of the language', () => {
    expect(formatClock(0, 'en')).toBe('00:00.0');
    expect(formatClock(61.5, 'en')).toBe('01:01.5');
    expect(formatClock(61.5, 'tr')).toBe('01:01,5');
    expect(formatClock(754.25, 'en')).toBe('12:34.2');
    expect(formatClock(3599.5, 'tr')).toBe('59:59,5');
  });

  it('shows the tenths that have been completed, like a stopwatch, and never 60 seconds', () => {
    // Multiples of 1/8 s are exact in binary, so "completed" is unambiguous and the
    // comparison can be made in whole tenths: 10 × (n/8) = 1.25 n. The scan runs past
    // 100 minutes and collects what is wrong instead of asserting 48 801 times.
    const wrong: string[] = [];
    for (let eighths = 0; eighths <= 8 * 6100; eighths++) {
      const text = formatClock(eighths / 8, 'en');
      const parts = /^(\d{2,}):([0-5]\d)\.(\d)$/.exec(text);
      const tenths = parts ? 600 * Number(parts[1]) + 10 * Number(parts[2]) + Number(parts[3]) : Number.NaN;
      if (tenths !== Math.floor(1.25 * eighths)) wrong.push(`${eighths / 8} s reads "${text}"`);
    }
    expect(wrong).toEqual([]);
  });

  it('keeps counting minutes beyond 99 instead of wrapping', () => {
    expect(formatClock(5999.5, 'en')).toBe('99:59.5');
    expect(formatClock(6000, 'en')).toBe('100:00.0');
    expect(formatClock(360_000, 'tr')).toBe('6000:00,0');
  });

  it('never shows a negative time', () => {
    for (const seconds of [-0.05, -1, -1e9]) {
      expect(formatClock(seconds, 'en')).toBe('00:00.0');
      expect(formatClock(seconds, 'tr')).toBe('00:00,0');
    }
  });

  it('reads zero, in the usual layout, for a time that is not a finite number', () => {
    for (const seconds of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(formatClock(seconds, 'en')).toBe('00:00.0');
    }
  });
});

describe('formatExposure', () => {
  it('always carries a sign: plus, the true minus sign, or plus-minus for zero', () => {
    expect(formatExposure(4.7, 'en')).toBe('+4.7');
    expect(formatExposure(-4.7, 'en')).toBe(`${MINUS}4.7`);
    expect(formatExposure(0, 'en')).toBe('±0.0');
  });

  it('gives no direction to a value that rounds to zero', () => {
    for (const ev of [0.04, -0.04, -0]) expect(formatExposure(ev, 'en')).toBe('±0.0');
  });

  it('shows one decimal, with the decimal mark of the language', () => {
    expect(formatExposure(12.34, 'en')).toBe('+12.3');
    expect(formatExposure(3, 'en')).toBe('+3.0');
    expect(formatExposure(4.7, 'tr')).toBe('+4,7');
    expect(formatExposure(-4.74, 'tr')).toBe(`${MINUS}4,7`);
    expect(formatExposure(0, 'tr')).toBe('±0,0');
  });
});

describe('every formatter', () => {
  /** Values of every size and sign that a read-out may be handed. */
  const REALS = [
    0, 1.5e-7, 0.000123, 0.25, 1, 7.0888, 59.75, 288, 999.5, 1234.5, 12345.678, 299_792.458, 1e6, 6.02214076e23, -0.5, -1234.5,
  ];
  /** Velocities: formatBeta is only defined below the speed of light. */
  const VELOCITIES = [0, 0.25, 0.5, 0.99, 0.999, 0.9999, BETA_MAX];
  /** Elapsed times a stopwatch can be asked to show, up to a hundred hours. */
  const TIMES = [0, 0.25, 59.75, 61.5, 754.25, 5999.5, 360_000, -1];
  const NOT_FINITE = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

  /** Each formatter as a function of one number, so that all of them can be put through the same checks. */
  const READOUTS: ReadonlyArray<{
    readonly name: string;
    readonly format: (value: number, language: Language) => string;
    readonly samples: readonly number[];
  }> = [
    { name: 'formatFixed', format: (value, language) => formatFixed(value, 2, language, true), samples: REALS },
    { name: 'formatInteger', format: formatInteger, samples: REALS },
    { name: 'formatSignificant', format: (value, language) => formatSignificant(value, 3, language), samples: REALS },
    { name: 'formatBeta', format: formatBeta, samples: VELOCITIES },
    { name: 'formatGamma', format: formatGamma, samples: REALS },
    { name: 'formatAngle', format: formatAngle, samples: REALS },
    { name: 'formatWavelength', format: (value, language) => formatWavelength(value, language).value, samples: REALS },
    { name: 'formatTemperature', format: formatTemperature, samples: REALS },
    { name: 'formatLength', format: (value, language) => formatLength(value, language).value, samples: REALS },
    { name: 'formatClock', format: formatClock, samples: TIMES },
    { name: 'formatExposure', format: formatExposure, samples: REALS },
  ];

  it('differs between the languages only in the decimal mark', () => {
    for (const { name, format, samples } of READOUTS) {
      for (const value of samples) {
        expect(format(value, 'tr'), `${name}(${value})`).toBe(inTurkish(format(value, 'en')));
      }
    }
  });

  it('never falls back to a word or to e-notation', () => {
    // a read-out shows digits or a dash: not "NaN", not "Infinity", not "6.02e+23"
    for (const { name, format, samples } of READOUTS) {
      for (const value of [...samples, ...NOT_FINITE]) {
        for (const language of LANGUAGES) {
          expect(format(value, language), `${name}(${value})`).not.toMatch(/[A-Za-z]/);
        }
      }
    }
  });

  it('shows a dash for a value that is not a finite number', () => {
    // The stopwatch is not in this list: it reads zero instead (see formatClock).
    const dashed = READOUTS.filter(({ name }) => name !== 'formatClock');
    expect(dashed).toHaveLength(READOUTS.length - 1);
    for (const { name, format } of dashed) {
      for (const value of NOT_FINITE) {
        for (const language of LANGUAGES) expect(format(value, language), `${name}(${value})`).toBe(EM_DASH);
      }
    }
    // a wavelength without a value keeps the unit of the reference light
    expect(formatWavelength(Number.NaN, 'en')).toEqual({ value: EM_DASH, unit: 'nm' });
  });
});

describe('steps of precision', () => {
  it('are taken on the value as it is shown, so that no read-out gains a figure by rounding up', () => {
    // Lorentz factor: three decimals below 10, two below 100, one above
    expect(formatGamma(9.9994, 'en')).toBe('9.999');
    expect(formatGamma(9.9996, 'en')).toBe('10.00');
    expect(formatGamma(99.994, 'en')).toBe('99.99');
    expect(formatGamma(99.996, 'en')).toBe('100.0');
    // angles: three decimals below 1°, two below 10°, one above
    expect(formatAngle(0.9994, 'en')).toBe('0.999°');
    expect(formatAngle(0.9996, 'en')).toBe('1.00°');
    expect(formatAngle(9.994, 'en')).toBe('9.99°');
    expect(formatAngle(9.996, 'en')).toBe('10.0°');
    expect(formatAngle(-9.996, 'tr')).toBe('-10,0°');
    // wavelengths: the reference light at the speed where it reaches one micrometre
    expect(formatWavelength(999.94, 'en')).toEqual({ value: '999.9', unit: 'nm' });
    expect(formatWavelength(999.96, 'en')).toEqual({ value: '1.000', unit: 'µm' });
    // the exposure read-out shows a bare dash when it has no value
    expect(formatExposure(Number.NaN, 'en')).toBe('—');
    expect(formatExposure(Number.NEGATIVE_INFINITY, 'tr')).toBe('—');
  });
});
