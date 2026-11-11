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

/** Fixed number of decimals, e.g. 7.089 → "7,089" in Turkish. */
export function formatFixed(value: number, digits: number, language: Language, grouping = false): string {
  if (!Number.isFinite(value)) return '—';
  return fixedFormatter(language, digits, grouping).format(value);
}

/** Integer with thousands separators, e.g. 299 792 → "299.792" in Turkish. */
export function formatInteger(value: number, language: Language): string {
  if (!Number.isFinite(value)) return '—';
  return fixedFormatter(language, 0, true).format(Math.round(value));
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
 * `significant` significant figures. Values between 10⁻³ and 10⁶ are written out;
 * anything else as mantissa × 10ⁿ.
 */
export function formatSignificant(value: number, significant: number, language: Language): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  if (magnitude < -3 || magnitude >= 6) {
    const mantissa = value / 10 ** magnitude;
    return `${formatFixed(mantissa, Math.max(0, significant - 1), language)} × 10${superscript(magnitude)}`;
  }
  const digits = Math.max(0, significant - 1 - magnitude);
  return formatFixed(value, digits, language, magnitude >= 4);
}

/**
 * β with as many decimals as it takes to keep the last significant "nine" visible:
 * 0.5 → 0.5000, 0.99 → 0.9900, 0.99999 → 0.99999.
 */
export function formatBeta(beta: number, language: Language): string {
  const gap = 1 - beta;
  const digits = gap >= 1e-3 || beta === 0 ? 4 : Math.min(7, Math.ceil(-Math.log10(gap)) + 1);
  return formatFixed(beta, digits, language);
}

/** Lorentz factor: three decimals up to 10, then fewer. */
export function formatGamma(gamma: number, language: Language): string {
  if (gamma < 10) return formatFixed(gamma, 3, language);
  if (gamma < 100) return formatFixed(gamma, 2, language);
  return formatFixed(gamma, 1, language);
}

/** Angle in degrees with a precision that follows its size. */
export function formatAngle(degrees: number, language: Language): string {
  if (!Number.isFinite(degrees)) return '—';
  const magnitude = Math.abs(degrees);
  const digits = magnitude >= 10 ? 1 : magnitude >= 1 ? 2 : 3;
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
  let chosen = steps[0];
  for (const step of steps) if (metres >= step[0] * 0.9995) chosen = step;
  return { value: formatSignificant(metres / chosen[0], 4, language), unit: chosen[1] };
}

/** Temperature in kelvin, three significant figures above 1000 K. */
export function formatTemperature(kelvin: number, language: Language): string {
  if (!Number.isFinite(kelvin)) return '—';
  return kelvin < 1000 ? formatFixed(kelvin, 0, language) : formatSignificant(kelvin, 3, language);
}

/** Length in metres with a sensible unit (mm, cm, m, km). */
export function formatLength(metres: number, language: Language): Quantity {
  const magnitude = Math.abs(metres);
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
  const rounded = Math.round(ev * 10) / 10;
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '±';
  return `${sign}${formatFixed(Math.abs(rounded), 1, language)}`;
}
