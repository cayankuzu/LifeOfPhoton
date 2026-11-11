/**
 * Colorimetry: from CIE XYZ tristimulus values to display RGB.
 *
 * The RGB working space is linear sRGB (IEC 61966-2-1:1999, primaries of ITU-R
 * BT.709, white point D65). The conversion matrices are derived here from the
 * chromaticities that define the standard rather than copied as rounded numbers.
 */

export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];
export type Triple = readonly [number, number, number];

// ---------------------------------------------------------------------------
// 3×3 matrix helpers (row-major)
// ---------------------------------------------------------------------------

export function multiply(a: Mat3, b: Mat3): Mat3 {
  const out = new Array<number>(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out as unknown as Mat3;
}

export function apply(m: Mat3, v: Triple): Triple {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

export function invert(m: Mat3): Mat3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-300) throw new Error('colorimetry.invert: singular matrix');
  const s = 1 / det;
  return [
    A * s,
    -(b * i - c * h) * s,
    (b * f - c * e) * s,
    B * s,
    (a * i - c * g) * s,
    -(a * f - c * d) * s,
    C * s,
    -(a * h - b * g) * s,
    (a * e - b * d) * s,
  ];
}

export function diagonal(v: Triple): Mat3 {
  return [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]];
}

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

// ---------------------------------------------------------------------------
// sRGB
// ---------------------------------------------------------------------------

/** CIE xy chromaticities that define sRGB / BT.709. */
export const SRGB_PRIMARIES = {
  red: [0.64, 0.33],
  green: [0.3, 0.6],
  blue: [0.15, 0.06],
  /** CIE standard illuminant D65 as specified by IEC 61966-2-1 */
  white: [0.3127, 0.329],
} as const;

function xyToXYZ(xy: readonly [number, number]): Triple {
  return [xy[0] / xy[1], 1, (1 - xy[0] - xy[1]) / xy[1]];
}

function deriveRgbToXyz(): Mat3 {
  const r = xyToXYZ(SRGB_PRIMARIES.red);
  const g = xyToXYZ(SRGB_PRIMARIES.green);
  const b = xyToXYZ(SRGB_PRIMARIES.blue);
  const primaries: Mat3 = [r[0], g[0], b[0], r[1], g[1], b[1], r[2], g[2], b[2]];
  // scale each primary so that R = G = B = 1 reproduces the white point with Y = 1
  const scale = apply(invert(primaries), xyToXYZ(SRGB_PRIMARIES.white));
  return multiply(primaries, diagonal(scale));
}

/** Linear sRGB → CIE XYZ (D65, Y of white = 1). */
export const SRGB_TO_XYZ: Mat3 = deriveRgbToXyz();

/** CIE XYZ → linear sRGB. Its rounded form is the matrix printed in IEC 61966-2-1. */
export const XYZ_TO_SRGB: Mat3 = invert(SRGB_TO_XYZ);

/** Relative luminance weights of linear sRGB (the Y row of {@link SRGB_TO_XYZ}): ≈ (0.2126, 0.7152, 0.0722). */
export const LUMINANCE_WEIGHTS: Triple = [SRGB_TO_XYZ[3], SRGB_TO_XYZ[4], SRGB_TO_XYZ[5]];

export function relativeLuminance(rgb: Triple): number {
  return LUMINANCE_WEIGHTS[0] * rgb[0] + LUMINANCE_WEIGHTS[1] * rgb[1] + LUMINANCE_WEIGHTS[2] * rgb[2];
}

/** sRGB opto-electronic transfer function (linear → display-encoded), per channel, input clamped to [0, 1]. */
export function encodeSrgb(linear: number): number {
  const v = Math.min(1, Math.max(0, linear));
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/** Inverse sRGB transfer function (display-encoded → linear). */
export function decodeSrgb(encoded: number): number {
  const v = Math.min(1, Math.max(0, encoded));
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// ---------------------------------------------------------------------------
// Chromatic adaptation and chromaticity
// ---------------------------------------------------------------------------

/** Bradford cone-response matrix (Lam 1985; used by CIECAM97s and ICC profiles). */
export const BRADFORD: Mat3 = [0.8951, 0.2664, -0.1614, -0.7502, 1.7135, 0.0367, 0.0389, -0.0685, 1.0296];

/**
 * Linear Bradford chromatic-adaptation transform taking colours seen under the
 * white `source` to their appearance under the white `destination` (both XYZ).
 * This is the camera's white balance.
 */
export function bradfordAdaptation(source: Triple, destination: Triple): Mat3 {
  const coneSource = apply(BRADFORD, source);
  const coneDestination = apply(BRADFORD, destination);
  const gain = diagonal([
    coneDestination[0] / coneSource[0],
    coneDestination[1] / coneSource[1],
    coneDestination[2] / coneSource[2],
  ]);
  return multiply(invert(BRADFORD), multiply(gain, BRADFORD));
}

/** XYZ of the sRGB white point (D65) with Y = 1. */
export const D65_XYZ: Triple = xyToXYZ(SRGB_PRIMARIES.white);

/** CIE 1931 chromaticity coordinates (x, y) of a tristimulus value. */
export function chromaticity(xyz: Triple): [number, number] {
  const sum = xyz[0] + xyz[1] + xyz[2];
  if (!(sum > 0)) return [1 / 3, 1 / 3];
  return [xyz[0] / sum, xyz[1] / sum];
}

/**
 * Correlated colour temperature from chromaticity, McCamy's cubic approximation
 * (McCamy 1992, Color Res. Appl. 17, 142). Accurate to a few kelvin between about
 * 2800 K and 6500 K; used for diagnostics and tests only.
 */
export function correlatedColourTemperature(xy: readonly [number, number]): number {
  const n = (xy[0] - 0.332) / (0.1858 - xy[1]);
  return 449 * n * n * n + 3525 * n * n + 6823.3 * n + 5520.33;
}

/**
 * Brings a linear RGB colour with negative components (outside the display gamut)
 * back into gamut by mixing it with the achromatic colour of equal luminance —
 * the smallest desaturation that removes the negative lobe while preserving
 * luminance and dominant wavelength (the perceived hue only approximately, see
 * display.ts). Identical to the operation performed in the fragment shader.
 */
export function compressToGamut(rgb: Triple): Triple {
  const y = relativeLuminance(rgb);
  if (!(y > 0)) return [0, 0, 0];
  const lowest = Math.min(rgb[0], rgb[1], rgb[2]);
  if (lowest >= 0) return rgb;
  const t = y / (y - lowest);
  return [y + (rgb[0] - y) * t, y + (rgb[1] - y) * t, y + (rgb[2] - y) * t];
}
