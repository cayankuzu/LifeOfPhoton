/**
 * Number formatting for instruments and text.
 *
 * One rule set for the whole application: digits follow the active language
 * (Turkish uses a decimal comma), magnitudes outside a comfortable range switch to
 * powers of ten, and nothing is ever special-cased into a word — a readout shows
 * the number that was computed.
 */

import type { Language } from '@/state/simulation';

const LOCALE: Record<Language, string> = { tr: 'tr-TR', en: 'en-US' };

const fixedCache = new Map<string, Intl.NumberFormat>();

function fixedFormatter(language: Language, digits: number, grouping: boolean): Intl.NumberFormat {
  const key = `${language}:${digits}:${grouping}`;
  let formatter = fixedCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE[language], {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      useGrouping: grouping,
    });
    fixedCache.set(key, formatter);
  }
  return formatter;
}

/**
 * Separator of digit groups in both languages: a narrow no-break space, as the SI
 * Brochure (9th ed., §5.4.4) and the dossier write them (299 792 458). The point and
 * the comma of the locales would read as a decimal marker in the other language, and
 * in Turkish "128.900 K" would stand next to "0,256°".
 */
export const GROUP_SEPARATOR = '\u202F';

/** Fixed number of decimals, e.g. 7.089 → "7,089" in Turkish. */
export function formatFixed(value: number, digits: number, language: Language, grouping = false): string {
  if (!Number.isFinite(value)) return '—';
  const formatter = fixedFormatter(language, digits, grouping);
  if (!grouping) return formatter.format(value);
  return formatter
    .formatToParts(value)
    .map((part) => (part.type === 'group' ? GROUP_SEPARATOR : part.value))
    .join('');
}

/**
 * Whole number, grouped in threes from five digits on: 299 792, but 4065 (the SI
 * Brochure leaves a four-digit number unseparated).
 */
export function formatInteger(value: number, language: Language): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  return formatFixed(rounded, 0, language, Math.abs(rounded) >= 10_000);
}

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

function superscript(exponent: number): string {
  return String(exponent)
    .split('')
    .map((character) => SUPERSCRIPT[character] ?? character)
    .join('');
}

/**
 * `significant` significant figures: the value is rounded to that many figures
 * (3515 to two figures is 3500, not 3515). Values between 10⁻³ and 10⁶ are written
 * out; anything else as mantissa × 10ⁿ.
 */
export function formatSignificant(value: number, significant: number, language: Language): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  // toExponential rounds first, so a mantissa that rounds up to ten is carried into the
  // exponent (9.996 × 10⁶ to three figures is 1.00 × 10⁷, never 10.00 × 10⁶)
  const [mantissa, exponent] = value.toExponential(Math.max(0, significant - 1)).split('e');
  const magnitude = Number(exponent);
  if (magnitude < -3 || magnitude >= 6) {
    return `${formatFixed(Number(mantissa), Math.max(0, significant - 1), language)} × 10${superscript(magnitude)}`;
  }
  const digits = Math.max(0, significant - 1 - magnitude);
  return formatFixed(Number(`${mantissa}e${exponent}`), digits, language, magnitude >= 4);
}

/**
 * β with as many decimals as it takes to keep two significant figures of the gap 1 − β:
 * 0.5 → 0.5000, 0.99 → 0.9900, 0.9999 → 0.99990, 0.99995 → 0.999950, 0.99999 → 0.999990.
 */
export function formatBeta(beta: number, language: Language): string {
  const gap = 1 - beta;
  // 1 − 0.9999 is a rounding error below 10⁻⁴ in binary; the margin keeps such values in their own decade
  const nines = Math.ceil(-Math.log10(gap) - 1e-9);
  const digits = gap >= 1e-3 || beta === 0 ? 4 : Math.min(7, nines + 1);
  return formatFixed(beta, digits, language);
}

/**
 * Lorentz factor: three decimals up to 10, then fewer. The step is taken on the value
 * as it will be shown, so that 9.9996 reads 10.00 and not 10.000.
 */
export function formatGamma(gamma: number, language: Language): string {
  if (Number(gamma.toFixed(3)) < 10) return formatFixed(gamma, 3, language);
  if (Number(gamma.toFixed(2)) < 100) return formatFixed(gamma, 2, language);
  return formatFixed(gamma, 1, language);
}

/** Angle in degrees with a precision that follows its size. */
export function formatAngle(degrees: number, language: Language): string {
  if (!Number.isFinite(degrees)) return '—';
  const magnitude = Math.abs(degrees);
  // decided on the value as it will be shown: 0.9996° reads 1.00°, not 1.000°
  const digits = Number(magnitude.toFixed(3)) < 1 ? 3 : Number(magnitude.toFixed(2)) < 10 ? 2 : 1;
  return `${formatFixed(degrees, digits, language)}°`;
}

export interface Quantity {
  readonly value: string;
  readonly unit: string;
}

/** Wavelength given in nanometres, with the unit chosen by magnitude (pm … m). */
export function formatWavelength(nanometres: number, language: Language): Quantity {
  if (!Number.isFinite(nanometres)) return { value: '—', unit: 'nm' };
  const metres = nanometres * 1e-9;
  const steps: Array<[number, string]> = [
    [1e-12, 'pm'],
    [1e-9, 'nm'],
    [1e-6, 'µm'],
    [1e-3, 'mm'],
    [1, 'm'],
  ];
  // The unit is chosen for the value as it will be shown, to four figures: 999.94 nm
  // reads 999.9 nm and 999.96 nm reads 1.000 µm, never 0.9999 µm or 1000 nm.
  const shown = Number(metres.toExponential(3));
  let chosen = steps[0];
  for (const step of steps) if (Math.abs(shown) >= step[0]) chosen = step;
  return { value: formatSignificant(shown / chosen[0], 4, language), unit: chosen[1] };
}

/** Temperature in kelvin: whole kelvins below 1000 K, four significant figures above. */
export function formatTemperature(kelvin: number, language: Language): string {
  if (!Number.isFinite(kelvin)) return '—';
  return kelvin < 1000 ? formatFixed(kelvin, 0, language) : formatSignificant(kelvin, 4, language);
}

/**
 * Length in metres with a sensible unit (mm, cm, m, km). The unit is chosen for the
 * value rounded to the three figures of the smallest units, so that a length a hair
 * below a step reads 1.00 cm, 1.000 m or 1.000 km rather than 10.0 mm, 100 cm or 1000 m.
 */
export function formatLength(metres: number, language: Language): Quantity {
  const magnitude = Math.abs(Number(metres.toExponential(2)));
  if (magnitude >= 1000) return { value: formatSignificant(metres / 1000, 4, language), unit: 'km' };
  if (magnitude >= 1) return { value: formatSignificant(metres, 4, language), unit: 'm' };
  if (magnitude >= 0.01) return { value: formatSignificant(metres * 100, 3, language), unit: 'cm' };
  return { value: formatSignificant(metres * 1000, 3, language), unit: 'mm' };
}

/** Elapsed time as mm:ss.d — the format of a stopwatch. */
export function formatClock(seconds: number, language: Language): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  const whole = Math.floor(rest);
  const tenth = Math.floor((rest - whole) * 10);
  const separator = language === 'tr' ? ',' : '.';
  return `${String(minutes).padStart(2, '0')}:${String(whole).padStart(2, '0')}${separator}${tenth}`;
}

/** Exposure value with an explicit sign, e.g. "−4.7 EV". */
export function formatExposure(ev: number, language: Language): string {
  if (!Number.isFinite(ev)) return '—';
  const rounded = Math.round(ev * 10) / 10;
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '±';
  return `${sign}${formatFixed(Math.abs(rounded), 1, language)}`;
}
