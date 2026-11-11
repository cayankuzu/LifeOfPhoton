/**
 * The electromagnetic spectrum as the instruments name it, and the display colour
 * of a single wavelength.
 *
 * Band limits follow the CIE division of optical radiation (UV-C/B/A; IR-A/B/C)
 * and the customary radio-astronomy usage beyond it. The colour names inside the
 * visible band are conventional: the spectrum is continuous and no standard fixes
 * where "green" ends.
 */

import { colourMatching } from './cie1931';
import { XYZ_TO_SRGB, apply, compressToGamut, encodeSrgb } from './colorimetry';

export type BandId =
  | 'gamma'
  | 'xray'
  | 'extremeUv'
  | 'uvC'
  | 'uvB'
  | 'uvA'
  | 'violet'
  | 'blue'
  | 'cyan'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'nearIr'
  | 'shortIr'
  | 'midIr'
  | 'farIr'
  | 'microwave'
  | 'radio';

export interface Band {
  readonly id: BandId;
  /** Lower and upper limit of the band, nm. */
  readonly from: number;
  readonly to: number;
  /** Whether the human eye responds to it (the range of the CIE 1931 observer). */
  readonly visible: boolean;
}

/** Limits of human vision as tabulated by the CIE 1931 observer, nm. */
export const VISIBLE_MIN_NM = 380;
export const VISIBLE_MAX_NM = 780;

export const BANDS: readonly Band[] = [
  { id: 'gamma', from: 0, to: 0.01, visible: false },
  { id: 'xray', from: 0.01, to: 10, visible: false },
  { id: 'extremeUv', from: 10, to: 100, visible: false },
  { id: 'uvC', from: 100, to: 280, visible: false },
  { id: 'uvB', from: 280, to: 315, visible: false },
  { id: 'uvA', from: 315, to: VISIBLE_MIN_NM, visible: false },
  { id: 'violet', from: VISIBLE_MIN_NM, to: 450, visible: true },
  { id: 'blue', from: 450, to: 485, visible: true },
  { id: 'cyan', from: 485, to: 500, visible: true },
  { id: 'green', from: 500, to: 565, visible: true },
  { id: 'yellow', from: 565, to: 590, visible: true },
  { id: 'orange', from: 590, to: 625, visible: true },
  { id: 'red', from: 625, to: VISIBLE_MAX_NM, visible: true },
  { id: 'nearIr', from: VISIBLE_MAX_NM, to: 1400, visible: false },
  { id: 'shortIr', from: 1400, to: 3000, visible: false },
  { id: 'midIr', from: 3000, to: 50_000, visible: false },
  { id: 'farIr', from: 50_000, to: 1e6, visible: false },
  { id: 'microwave', from: 1e6, to: 1e9, visible: false },
  { id: 'radio', from: 1e9, to: Number.POSITIVE_INFINITY, visible: false },
];

/** The band a wavelength (nm) falls in. */
export function classifyWavelength(wavelengthNm: number): Band {
  if (!(wavelengthNm > 0)) return BANDS[0];
  for (const band of BANDS) {
    if (wavelengthNm < band.to) return band;
  }
  return BANDS[BANDS.length - 1];
}

/**
 * sRGB colour (CSS string) of monochromatic light of the given wavelength as a
 * standard display can show it, normalised to full brightness; `null` outside the
 * visible band. Out-of-gamut spectral colours are desaturated just enough to fit.
 */
export function spectralSwatch(wavelengthNm: number): string | null {
  const xyz = [0, 0, 0];
  colourMatching(wavelengthNm, xyz);
  if (!(xyz[1] > 1e-5)) return null;
  const rgb = compressToGamut(apply(XYZ_TO_SRGB, [xyz[0], xyz[1], xyz[2]]));
  const peak = Math.max(rgb[0], rgb[1], rgb[2], 1e-9);
  const channel = (value: number): number => Math.round(255 * encodeSrgb(Math.max(0, value) / peak));
  return `rgb(${channel(rgb[0])} ${channel(rgb[1])} ${channel(rgb[2])})`;
}
