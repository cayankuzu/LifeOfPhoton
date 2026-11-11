/**
 * Authoring helpers for the dossier's content files.
 */

import { formatFixed, formatSignificant } from '@/i18n/format';
import type { Bilingual } from '../types';

/** Raw template tag: lets TeX be written with single backslashes. */
export const r = String.raw;

/** A number with a fixed count of decimals, formatted for each language (decimal comma in Turkish). */
export function num(value: number, digits: number): Bilingual {
  return { tr: formatFixed(value, digits, 'tr'), en: formatFixed(value, digits, 'en') };
}

/** A number with a given count of significant figures, formatted for each language. */
export function sig(value: number, significant: number): Bilingual {
  return { tr: formatSignificant(value, significant, 'tr'), en: formatSignificant(value, significant, 'en') };
}

/** An angle in degrees with a fixed count of decimals. */
export function deg(radians: number, digits: number): Bilingual {
  const degrees = (radians * 180) / Math.PI;
  return { tr: `${formatFixed(degrees, digits, 'tr')}°`, en: `${formatFixed(degrees, digits, 'en')}°` };
}
