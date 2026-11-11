/**
 * CIE 1931 standard colorimetric observer (2° field) — colour-matching functions
 * x̄(λ), ȳ(λ), z̄(λ), tabulated from 380 nm to 780 nm in 5 nm steps.
 *
 * Source: the 5 nm values of the CIE 1931 standard colorimetric observer as
 * published by the CIE (CIE 015 "Colorimetry"; originally Smith & Guild 1931–32).
 * ȳ(λ) is identical to the photopic luminous efficiency function V(λ).
 *
 * Integrity of this transcription is enforced by unit tests:
 *   – the column sums equal the published 21.3714 / 21.3711 / 21.3715,
 *   – every entry agrees with the independent analytic fit of Wyman, Sloan &
 *     Shirley (2013, JCGT 2(2), 1–11) to within the stated accuracy of that fit.
 */

export const CIE1931_START_NM = 380;
export const CIE1931_END_NM = 780;
export const CIE1931_STEP_NM = 5;

/** [x̄, ȳ, z̄] at 380, 385, …, 780 nm. */
// prettier-ignore
export const CIE1931_TABLE: ReadonlyArray<readonly [number, number, number]> = [
  [0.001368, 0.000039, 0.006450], [0.002236, 0.000064, 0.010550], [0.004243, 0.000120, 0.020050],
  [0.007650, 0.000217, 0.036210], [0.014310, 0.000396, 0.067850], [0.023190, 0.000640, 0.110200],
  [0.043510, 0.001210, 0.207400], [0.077630, 0.002180, 0.371300], [0.134380, 0.004000, 0.645600],
  [0.214770, 0.007300, 1.039050], [0.283900, 0.011600, 1.385600], [0.328500, 0.016840, 1.622960],
  [0.348280, 0.023000, 1.747060], [0.348060, 0.029800, 1.782600], [0.336200, 0.038000, 1.772110],
  [0.318700, 0.048000, 1.744100], [0.290800, 0.060000, 1.669200], [0.251100, 0.073900, 1.528100],
  [0.195360, 0.090980, 1.287640], [0.142100, 0.112600, 1.041900], [0.095640, 0.139020, 0.812950],
  [0.057950, 0.169300, 0.616200], [0.032010, 0.208020, 0.465180], [0.014700, 0.258600, 0.353300],
  [0.004900, 0.323000, 0.272000], [0.002400, 0.407300, 0.212300], [0.009300, 0.503000, 0.158200],
  [0.029100, 0.608200, 0.111700], [0.063270, 0.710000, 0.078250], [0.109600, 0.793200, 0.057250],
  [0.165500, 0.862000, 0.042160], [0.225750, 0.914850, 0.029840], [0.290400, 0.954000, 0.020300],
  [0.359700, 0.980300, 0.013400], [0.433450, 0.994950, 0.008750], [0.512050, 1.000000, 0.005750],
  [0.594500, 0.995000, 0.003900], [0.678400, 0.978600, 0.002750], [0.762100, 0.952000, 0.002100],
  [0.842500, 0.915400, 0.001800], [0.916300, 0.870000, 0.001650], [0.978600, 0.816300, 0.001400],
  [1.026300, 0.757000, 0.001100], [1.056700, 0.694900, 0.001000], [1.062200, 0.631000, 0.000800],
  [1.045600, 0.566800, 0.000600], [1.002600, 0.503000, 0.000340], [0.938400, 0.441200, 0.000240],
  [0.854450, 0.381000, 0.000190], [0.751400, 0.321000, 0.000100], [0.642400, 0.265000, 0.000050],
  [0.541900, 0.217000, 0.000030], [0.447900, 0.175000, 0.000020], [0.360800, 0.138200, 0.000010],
  [0.283500, 0.107000, 0.000000], [0.218700, 0.081600, 0.000000], [0.164900, 0.061000, 0.000000],
  [0.121200, 0.044580, 0.000000], [0.087400, 0.032000, 0.000000], [0.063600, 0.023200, 0.000000],
  [0.046770, 0.017000, 0.000000], [0.032900, 0.011920, 0.000000], [0.022700, 0.008210, 0.000000],
  [0.015840, 0.005723, 0.000000], [0.011359, 0.004102, 0.000000], [0.008111, 0.002929, 0.000000],
  [0.005790, 0.002091, 0.000000], [0.004109, 0.001484, 0.000000], [0.002899, 0.001047, 0.000000],
  [0.002049, 0.000740, 0.000000], [0.001440, 0.000520, 0.000000], [0.001000, 0.000361, 0.000000],
  [0.000690, 0.000249, 0.000000], [0.000476, 0.000172, 0.000000], [0.000332, 0.000120, 0.000000],
  [0.000235, 0.000085, 0.000000], [0.000166, 0.000060, 0.000000], [0.000117, 0.000042, 0.000000],
  [0.000083, 0.000030, 0.000000], [0.000059, 0.000021, 0.000000], [0.000042, 0.000015, 0.000000],
];

const LAST_INDEX = CIE1931_TABLE.length - 1;

/**
 * Colour-matching functions at an arbitrary wavelength (nm), linearly interpolated
 * between the 5 nm nodes. Outside 380–780 nm the tabulated observer is zero.
 * Writes into `out` (length ≥ 3) to keep the hot integration loops allocation-free.
 */
export function colourMatching(wavelengthNm: number, out: Float64Array | number[]): void {
  const position = (wavelengthNm - CIE1931_START_NM) / CIE1931_STEP_NM;
  if (!(position >= 0) || position > LAST_INDEX) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return;
  }
  const lower = Math.min(LAST_INDEX - 1, Math.floor(position));
  const t = position - lower;
  const a = CIE1931_TABLE[lower];
  const b = CIE1931_TABLE[lower + 1];
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
}

/** Photopic luminous efficiency V(λ) = ȳ(λ). */
export function photopicEfficiency(wavelengthNm: number): number {
  const position = (wavelengthNm - CIE1931_START_NM) / CIE1931_STEP_NM;
  if (!(position >= 0) || position > LAST_INDEX) return 0;
  const lower = Math.min(LAST_INDEX - 1, Math.floor(position));
  const t = position - lower;
  return CIE1931_TABLE[lower][1] + (CIE1931_TABLE[lower + 1][1] - CIE1931_TABLE[lower][1]) * t;
}

/**
 * Analytic multi-lobe Gaussian approximation of the same observer
 * (Wyman, Sloan & Shirley 2013). Used only to cross-validate the table.
 */
export function colourMatchingAnalytic(wavelengthNm: number): [number, number, number] {
  const lobe = (mu: number, below: number, above: number): number => {
    const t = (wavelengthNm - mu) * (wavelengthNm < mu ? below : above);
    return Math.exp(-0.5 * t * t);
  };
  const x = 0.362 * lobe(442.0, 0.0624, 0.0374) + 1.056 * lobe(599.8, 0.0264, 0.0323) - 0.065 * lobe(501.1, 0.049, 0.0382);
  const y = 0.821 * lobe(568.8, 0.0213, 0.0247) + 0.286 * lobe(530.9, 0.0613, 0.0322);
  const z = 1.217 * lobe(437.0, 0.0845, 0.0278) + 0.681 * lobe(459.0, 0.0385, 0.0725);
  return [x, y, z];
}
