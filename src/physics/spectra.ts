/**
 * Model spectra of the scene: the emission spectrum of the street LEDs and the
 * reflectance spectra assigned to surface colours.
 */

import { SCENARIO } from './scenario';

const FWHM_TO_SIGMA = 1 / (2 * Math.sqrt(2 * Math.log(2)));

// ---------------------------------------------------------------------------
// Phosphor-converted white LED
// ---------------------------------------------------------------------------

/**
 * Relative spectral power distribution of the street luminaires (arbitrary units
 * per nm): a Gaussian pump line plus a two-sided Gaussian phosphor band. The
 * parameters in scenario.ts are tuned so that its chromaticity lies on the
 * Planckian locus near 4000 K (verified by a unit test).
 */
export function ledSpectrum(wavelengthNm: number): number {
  const led = SCENARIO.street.led;
  const pumpSigma = led.pumpFwhmNm * FWHM_TO_SIGMA;
  const dp = (wavelengthNm - led.pumpPeakNm) / pumpSigma;
  const sigma = wavelengthNm < led.phosphorPeakNm ? led.phosphorSigmaBelowNm : led.phosphorSigmaAboveNm;
  const dq = (wavelengthNm - led.phosphorPeakNm) / sigma;
  // a phosphor cannot emit at shorter wavelengths than the pump that excites it (Stokes shift)
  const stokes = wavelengthNm <= led.pumpPeakNm ? 0 : Math.min(1, (wavelengthNm - led.pumpPeakNm) / 25);
  return led.pumpToPhosphorRatio * Math.exp(-0.5 * dp * dp) + stokes * Math.exp(-0.5 * dq * dq);
}

// ---------------------------------------------------------------------------
// Reflectance basis
// ---------------------------------------------------------------------------

/**
 * Parameters of the reflectance basis: the two crossover wavelengths and the
 * softness of the transitions, nm.
 */
export const REFLECTANCE_BASIS = {
  blueGreenCrossoverNm: 490,
  greenRedCrossoverNm: 594,
  softnessNm: 8,
} as const;

/**
 * Reflectance basis ρ_R(λ), ρ_G(λ), ρ_B(λ).
 *
 * Surface colours are authored as RGB triples, but a Doppler shift samples the
 * reflectance at wavelengths D·λ′ that an RGB triple says nothing about. Following
 * the idea of spectral upsampling (Smits 1999; Mallett & Yuksel 2019), an RGB
 * albedo is expanded into the spectrum ρ(λ) = r·ρ_R(λ) + g·ρ_G(λ) + b·ρ_B(λ) with
 * three smooth, non-negative basis functions that sum to exactly 1 at every
 * wavelength (a softmax partition of unity). Consequently
 *   – a white or grey albedo is a spectrally flat reflector at every wavelength,
 *   – no combination of valid albedos ever reflects more than 100 %,
 *   – beyond the visible band the spectrum continues its nearest plateau: the
 *     infrared reflectance equals the red channel, the ultraviolet the blue one.
 * The last point is the model's assumption about the invisible part of a paint's
 * spectrum; it is the simplest continuation that introduces no new information.
 *
 * It is not tied to the long-wave emissivities of scenario.ts, and the two are not
 * consistent. For an opaque surface reflectance and emissivity add up to one at every
 * wavelength (Kirchhoff's law); here reflected and emitted light are modelled
 * independently, so in the far infrared a surface of red albedo 0.5 reflects 50 % and
 * emits 92 % of a black body, and the sky emits with 0.78 while it transmits starlight
 * and moonlight unattenuated. Of the two, the emissivity is the realistic value
 * (building materials are nearly black at 10 µm whatever their colour); the continued
 * reflectance is not, but the light it reflects is negligible where it matters. The
 * thermal infrared, beyond about 5 µm, reaches the visible band only from D ≈ 7 on
 * (5 µm / 0.7 µm), and there the thermal term is already more than 10⁴ times the
 * moonlight a white surface reflects (2 × 10⁴ at D = 7, 4 × 10⁶ at D = 14). Below
 * that, where the two are comparable (equal at D ≈ 3.6), the reflected light comes
 * from the near infrared, 1–3 µm, where a paint may well reflect as much as in the red.
 *
 * Writes [ρ_R, ρ_G, ρ_B] into `out`.
 */
export function reflectanceBasis(wavelengthNm: number, out: Float64Array | number[]): void {
  const { blueGreenCrossoverNm, greenRedCrossoverNm, softnessNm } = REFLECTANCE_BASIS;
  const sBlue = (blueGreenCrossoverNm - wavelengthNm) / softnessNm;
  const sRed = (wavelengthNm - greenRedCrossoverNm) / softnessNm;
  // softmax over (sRed, 0, sBlue), shifted by the largest exponent for stability
  const top = Math.max(0, sBlue, sRed);
  const eRed = Math.exp(sRed - top);
  const eGreen = Math.exp(-top);
  const eBlue = Math.exp(sBlue - top);
  const norm = 1 / (eRed + eGreen + eBlue);
  out[0] = eRed * norm;
  out[1] = eGreen * norm;
  out[2] = eBlue * norm;
}
