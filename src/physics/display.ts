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
 *   3. tone        a filmic curve (toe, linear middle, shoulder) evaluated on the
 *                  largest of the three channels, and the same factor applied to
 *                  all three (the maxRGB norm of HDR tone mapping);
 *   4. encoding    the sRGB transfer function.
 *
 * Step 3 keeps the chromaticity as well. A curve applied to each channel separately
 * would not: it lifts a weak channel towards one wherever the strong one has reached
 * the shoulder. A deep red keeps a small blue component after step 1 (its dominant
 * wavelength lies beyond that of the sRGB red primary, towards the purples), and per
 * channel a lit red signal came out magenta, and violet light a hot magenta. The
 * curve on the largest channel leaves every ratio between the channels as steps 1
 * and 2 left it, so a grey comes out exactly as it did per channel, and no channel
 * can exceed one.
 *
 * Nothing else had to change with it. Step 1 is still needed: the ratios are taken
 * of channels that must not be negative. It moves a colour straight towards the
 * white of equal luminance, which keeps the dominant wavelength but the perceived hue
 * only roughly: the red signal (626 nm) is shown at a CIELAB hue angle of 27.5°,
 * the light itself has 41° and the sRGB red primary 40°, so the signal looks a
 * little crimson; a gamut mapping at constant perceptual hue would need a colour
 * space of its own in every shader. Step 2 scales all three channels alike, so
 * it does not change which one is the largest; it decides how far above the white
 * a light can still be told apart before the shoulder holds it. The shaders' dither
 * is added equally to the three encoded channels. toCss, which colours the
 * dossier's figures, inherits the curve; the spectrum strip of the instrument panel
 * (bands.ts) never used it and already scales each wavelength by its largest channel.
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
  // the projection into the gamut puts its lowest channel at zero only up to rounding
  const r = Math.max(0, inGamut[0] * scale);
  const g = Math.max(0, inGamut[1] * scale);
  const b = Math.max(0, inGamut[2] * scale);
  const peak = Math.max(r, g, b);
  if (!(peak > 0)) return [0, 0, 0];
  // each channel as a fraction of the largest: exactly 1 for that one, and for all three of a grey
  const level = filmic(peak);
  return [level * (r / peak), level * (g / peak), level * (b / peak)];
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
