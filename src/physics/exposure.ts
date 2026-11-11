/**
 * Automatic exposure.
 *
 * Between rest and the top of the range the luminance in the field of view spans
 * more than eleven decades; no display can show that, and neither can an eye
 * without adapting. The camera therefore meters the scene the way cameras and the
 * photographic tone-reproduction operator do (Reinhard et al. 2002): it takes the
 * log-average luminance and scales the image so that this average sits at a fixed
 * display level. Like a photographer it exposes for what is lit: directions that
 * have gone dark (redshifted out of the visible band) do not pull the exposure up,
 * unless nearly everything in view is dark. The result is reported to the user as
 * an exposure value (EV), so the adaptation is never hidden.
 *
 * The meter does not read pixels back from the GPU. It evaluates the same atlas
 * the shaders use on a coarse grid of view directions, for a generic street scene.
 */

import { BETA_MAX, clampBeta, headOnDopplerFactor } from './kinematics';
import { SCENARIO } from './scenario';
import { type SpectralAtlas, blackbodyLuminanceUnits, reflectedGain } from './spectralAtlas';

/** Mean luminance of street-lit and of moon-lit surfaces of the scene at rest, reference units. */
const TYPICAL_LED_LUMINANCE = 0.11;
const TYPICAL_MOON_LUMINANCE = (SCENARIO.moon.illuminanceLux / SCENARIO.street.illuminanceLux) * 0.3;

/** A direction counts as lit when it is at least this bright relative to the rest level. */
const LIT_THRESHOLD = 0.04;
/** Brighter samples than this (relative to rest) are treated as this bright, so a glare spot cannot blind the meter. */
const METER_CEILING = 3e3;
/** Below this lit fraction of the field of view the camera starts to open up for the darkness. */
const LIT_COVERAGE = 0.2;

/** Limits of the adaptation, in EV relative to the rest exposure. */
export const EXPOSURE_MIN_EV = -14;
export const EXPOSURE_MAX_EV = 3;

const GRID_X = 9;
const GRID_Y = 7;

export interface MeterInput {
  readonly beta: number;
  /** Camera yaw (left positive) and pitch (up positive) relative to the direction of motion, rad. */
  readonly yaw: number;
  readonly pitch: number;
  /** Vertical field of view, rad, and aspect ratio (width / height). */
  readonly fieldOfView: number;
  readonly aspect: number;
  /** False in the measured (pure contraction) view, where nothing is Doppler shifted. */
  readonly optical: boolean;
  readonly thermal: boolean;
}

/** Luminance of the generic scene (reference units) in a direction with Doppler factor D. */
export function typicalLuminance(atlas: SpectralAtlas, doppler: number, thermal: boolean): number {
  let luminance =
    TYPICAL_LED_LUMINANCE * reflectedGain(atlas, 'led', doppler) + TYPICAL_MOON_LUMINANCE * reflectedGain(atlas, 'moon', doppler);
  if (thermal) {
    luminance +=
      SCENARIO.environment.surfaceEmissivity * blackbodyLuminanceUnits(atlas, SCENARIO.environment.temperatureK * doppler);
  }
  return luminance;
}

/**
 * Exposure the meter asks for, as a natural logarithm relative to the exposure at
 * rest (0 at β = 0). Multiply by 1/ln 2 for EV.
 */
export function meterLnExposure(atlas: SpectralAtlas, input: MeterInput): number {
  if (!input.optical) return 0;
  const beta = clampBeta(input.beta);
  if (beta === 0) return 0;
  const d0 = headOnDopplerFactor(Math.min(beta, BETA_MAX));
  const rest = typicalLuminance(atlas, 1, false);

  const tanY = Math.tan(input.fieldOfView / 2);
  const tanX = tanY * input.aspect;
  const cosYaw = Math.cos(input.yaw);
  const sinYaw = Math.sin(input.yaw);
  const cosPitch = Math.cos(input.pitch);
  const sinPitch = Math.sin(input.pitch);

  let sum = 0;
  let lit = 0;
  for (let iy = 0; iy < GRID_Y; iy++) {
    const sy = ((iy + 0.5) / GRID_Y) * 2 - 1;
    for (let ix = 0; ix < GRID_X; ix++) {
      const sx = ((ix + 0.5) / GRID_X) * 2 - 1;
      // view-space ray (camera looks along −z), then pitch about x and yaw about y
      const vx = sx * tanX;
      const vy = sy * tanY;
      const vz = -1;
      const py = vy * cosPitch - vz * sinPitch;
      const pz = vy * sinPitch + vz * cosPitch;
      const wx = vx * cosYaw + pz * sinYaw;
      const wz = -vx * sinYaw + pz * cosYaw;
      const length = Math.hypot(wx, py, wz);
      // cos of the apparent angle from the direction of motion (−z)
      const cosApparent = -wz / length;
      // 1/D = cos²(θ′/2)/D₀ + D₀ sin²(θ′/2)
      const cos2 = 0.5 * (1 + cosApparent);
      const sin2 = 0.5 * (1 - cosApparent);
      const doppler = 1 / (cos2 / d0 + d0 * sin2);
      const relative = typicalLuminance(atlas, doppler, input.thermal) / rest;
      if (relative < LIT_THRESHOLD) continue;
      sum += Math.log(Math.min(METER_CEILING, relative));
      lit++;
    }
  }
  const darkest = EXPOSURE_MAX_EV * Math.LN2;
  if (lit === 0) return darkest;
  // expose for the lit part of the view; open up gradually as it shrinks to a small fraction
  const forLit = -sum / lit;
  const coverage = Math.min(1, lit / (GRID_X * GRID_Y) / LIT_COVERAGE);
  const lnExposure = darkest + (forLit - darkest) * coverage;
  return Math.min(darkest, Math.max(EXPOSURE_MIN_EV * Math.LN2, lnExposure));
}

/** Natural-log exposure → exposure value (stops). */
export function toExposureValue(lnExposure: number): number {
  return lnExposure / Math.LN2;
}
