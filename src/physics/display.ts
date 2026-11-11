/**
 * The display transform: scene-referred linear RGB → what a screen shows.
 *
 * None of this is physics. It is the camera's rendering of a scene whose luminance
 * spans more than eleven decades, and it is kept deliberately simple and monotonic:
 *
 *   1. gamut       colours outside the display gamut (negative components) are
 *                  desaturated by the smallest amount that preserves luminance;
 *   2. highlights  luminance above the reference white is compressed
 *                  logarithmically while the chromaticity is kept, so that very
 *                  bright thermal light keeps the colour of its temperature
 *                  instead of clipping to white;
 *   3. tone        a filmic curve per channel (toe, linear middle, shoulder);
 *   4. encoding    the sRGB transfer function.
 *
 * The fragment shaders perform exactly these steps (src/scene/shaders/chunks.ts);
 * this module is their reference implementation and is used by the figures.
 */

import { type Triple, compressToGamut, encodeSrgb, relativeLuminance } from './colorimetry';

/**
 * Slope of the logarithmic highlight compression: a luminance y > 1 is displayed
 * as 1 + slope · ln y. With 0.18, twelve decades above white map to 1 … 6.
 */
export const HIGHLIGHT_SLOPE = 0.18;

/** Narkowicz's (2016) rational fit of the ACES filmic curve. */
export function filmic(value: number): number {
  const x = Math.max(0, value);
  return Math.min(1, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14));
}

/** Luminance after highlight compression. Identity up to the reference white, logarithmic above. */
export function compressHighlight(luminance: number): number {
  return luminance > 1 ? 1 + HIGHLIGHT_SLOPE * Math.log(luminance) : luminance;
}

/** Linear display RGB in [0, 1] (steps 1–3). */
export function toneMap(radiance: Triple): Triple {
  const luminance = relativeLuminance(radiance);
  if (!(luminance > 0)) return [0, 0, 0];
  const inGamut = compressToGamut(radiance);
  const scale = compressHighlight(luminance) / luminance;
  return [filmic(inGamut[0] * scale), filmic(inGamut[1] * scale), filmic(inGamut[2] * scale)];
}

/** sRGB-encoded display RGB in [0, 1] (steps 1–4). */
export function toDisplay(radiance: Triple): Triple {
  const mapped = toneMap(radiance);
  return [encodeSrgb(mapped[0]), encodeSrgb(mapped[1]), encodeSrgb(mapped[2])];
}

/** CSS colour of a scene-referred radiance. */
export function toCss(radiance: Triple): string {
  const [r, g, b] = toDisplay(radiance);
  return `rgb(${Math.round(255 * r)} ${Math.round(255 * g)} ${Math.round(255 * b)})`;
}
