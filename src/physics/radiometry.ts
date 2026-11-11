/**
 * Radiometry and photometry: Planck's law and its integration against the CIE
 * 1931 observer.
 *
 * Units. Wavelengths are in nanometres at the API boundary (metres inside Planck's
 * law). Radiance is in W·m⁻²·sr⁻¹; luminance in cd·m⁻².
 */

import { CIE1931_END_NM, CIE1931_START_NM, colourMatching } from './cie1931';
import { type Triple, chromaticity } from './colorimetry';
import { FIRST_RADIATION_CONSTANT_RADIANCE, LUMINOUS_EFFICACY_KCD, SECOND_RADIATION_CONSTANT } from './constants';

/** Integration step for all spectral integrals, nm. */
export const SPECTRAL_STEP_NM = 1;

/** Number of integration nodes between 380 nm and 780 nm inclusive. */
export const SPECTRAL_SAMPLES = Math.round((CIE1931_END_NM - CIE1931_START_NM) / SPECTRAL_STEP_NM) + 1;

/** Wavelength of integration node i, nm. */
export function sampleWavelength(index: number): number {
  return CIE1931_START_NM + index * SPECTRAL_STEP_NM;
}

/** Colour-matching functions pre-interpolated on the integration grid, with trapezoid weights folded in. */
const OBSERVER_WEIGHTS: Float64Array = (() => {
  const weights = new Float64Array(SPECTRAL_SAMPLES * 3);
  const cmf = [0, 0, 0];
  for (let i = 0; i < SPECTRAL_SAMPLES; i++) {
    colourMatching(sampleWavelength(i), cmf);
    const trapezoid = i === 0 || i === SPECTRAL_SAMPLES - 1 ? 0.5 : 1;
    weights[i * 3] = cmf[0] * trapezoid * SPECTRAL_STEP_NM;
    weights[i * 3 + 1] = cmf[1] * trapezoid * SPECTRAL_STEP_NM;
    weights[i * 3 + 2] = cmf[2] * trapezoid * SPECTRAL_STEP_NM;
  }
  return weights;
})();

/**
 * Tristimulus values ∫ S(λ)·(x̄, ȳ, z̄)(λ) dλ of a spectrum S given per nanometre.
 * Trapezoidal rule on a 1 nm grid over 380–780 nm.
 */
export function tristimulus(spectrum: (wavelengthNm: number) => number): Triple {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < SPECTRAL_SAMPLES; i++) {
    const s = spectrum(sampleWavelength(i));
    if (s === 0) continue;
    x += s * OBSERVER_WEIGHTS[i * 3];
    y += s * OBSERVER_WEIGHTS[i * 3 + 1];
    z += s * OBSERVER_WEIGHTS[i * 3 + 2];
  }
  return [x, y, z];
}

/**
 * Planck's law: spectral radiance of a black body per unit wavelength,
 * B_λ(λ, T) = 2hc² / λ⁵ / (exp(c₂/(λT)) − 1), in W·m⁻²·sr⁻¹ per metre of wavelength.
 * expm1 keeps the Rayleigh–Jeans limit (c₂/(λT) → 0) accurate.
 */
export function planckRadiance(wavelengthMetres: number, temperatureK: number): number {
  if (!(temperatureK > 0) || !(wavelengthMetres > 0)) return 0;
  const x = SECOND_RADIATION_CONSTANT / (wavelengthMetres * temperatureK);
  if (x > 700) return 0;
  return FIRST_RADIATION_CONSTANT_RADIANCE / (wavelengthMetres ** 5 * Math.expm1(x));
}

/** Planck radiance per nanometre of wavelength with λ given in nanometres. */
export function planckRadiancePerNm(wavelengthNm: number, temperatureK: number): number {
  return planckRadiance(wavelengthNm * 1e-9, temperatureK) * 1e-9;
}

/** Absolute tristimulus values (W·m⁻²·sr⁻¹, CIE 1931 weighting) of a black body. */
export function blackbodyTristimulus(temperatureK: number): Triple {
  return tristimulus((nm) => planckRadiancePerNm(nm, temperatureK));
}

/** Luminance of a black body, cd·m⁻²: L = K_cd ∫ V(λ) B_λ(λ, T) dλ. */
export function blackbodyLuminance(temperatureK: number): number {
  return LUMINOUS_EFFICACY_KCD * blackbodyTristimulus(temperatureK)[1];
}

/** CIE 1931 chromaticity of a black body (a point on the Planckian locus). */
export function planckianChromaticity(temperatureK: number): [number, number] {
  return chromaticity(blackbodyTristimulus(temperatureK));
}

/**
 * Visible-band luminance gain of a Planckian source of temperature T when it is
 * observed with Doppler factor D. Because D⁵·B_λ(Dλ, T) = B_λ(λ, D·T), the source
 * simply looks like a black body at D·T:
 *
 *     G_T(D) = L(D·T) / L(T)
 *
 * This is the "headlight effect" as an eye or camera registers it. It is NOT D⁴:
 * D⁴ is the bolometric gain, most of which leaves the visible band.
 */
export function visibleGainOfBlackbody(temperatureK: number, doppler: number): number {
  const rest = blackbodyLuminance(temperatureK);
  return rest > 0 ? blackbodyLuminance(temperatureK * doppler) / rest : 0;
}

/**
 * Illuminance (lux) produced on a surface facing a uniform black-body disc that
 * subtends the solid angle `solidAngleSr`: E = L·Ω. Used for sunlight and moonlight.
 */
export function illuminanceFromBlackbodyDisc(temperatureK: number, solidAngleSr: number): number {
  return blackbodyLuminance(temperatureK) * solidAngleSr;
}

/**
 * Solves f(x) = 0 for a monotonic f on [lo, hi] by bisection in log-space.
 * Returns NaN when the root is not bracketed.
 */
export function solveLogBisection(f: (x: number) => number, lo: number, hi: number, iterations = 80): number {
  let a = Math.log(lo);
  let b = Math.log(hi);
  let fa = f(Math.exp(a));
  const fb = f(Math.exp(b));
  if (!(fa * fb <= 0)) return Number.NaN;
  for (let i = 0; i < iterations; i++) {
    const m = 0.5 * (a + b);
    const fm = f(Math.exp(m));
    if (fa * fm <= 0) {
      b = m;
    } else {
      a = m;
      fa = fm;
    }
  }
  return Math.exp(0.5 * (a + b));
}
