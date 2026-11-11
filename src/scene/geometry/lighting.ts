/**
 * Street lighting of the avenue.
 *
 * The luminaires repeat with the period of a block, so the light they shed can be
 * baked per vertex. The photometric model is the simplest one that is consistent
 * with what is drawn: the light source of a luminaire IS the light face of the
 * lamp model, a flat face looking straight down, and it is taken to be a uniform
 * diffuse (Lambertian) emitter. Its luminance is then the same from every
 * direction — which is how the shader draws it — its intensity falls off as the
 * cosine of the angle from the nadir, and no light leaves it above the horizontal.
 * One number remains, the luminance, and it is fixed by a single requirement: the
 * average horizontal illuminance of the carriageway equals the reference
 * illuminance of the scenario (lighting class C2 of EN 13201-2:2015). The
 * uniformity of the lighting follows and is checked against the same standard.
 *
 * Units. Irradiance is expressed in units of the reference illuminance E₀, radiance
 * in units of the luminance E₀/π of a perfect white diffuser under it, lengths in
 * metres. A small face of area A and luminance L then has the intensity
 * I(θ) = (L·A/π)·cos θ, and an intensity I produces the irradiance I·cos(incidence)/d².
 *
 * No shadows are cast and nothing is inter-reflected — a deliberate simplification
 * of the lighting, not of the relativistic transformation.
 */

import { SCENARIO } from '@/physics/scenario';
import {
  CARRIAGEWAY_HALF_WIDTH,
  CHUNK_LENGTH,
  LUMINAIRE_FACE_AREA,
  LUMINAIRE_SPACING,
  ROAD_SURFACE_Y,
  chunkLuminaires,
} from './layout';

const LUMINAIRES = chunkLuminaires();

/** Neighbouring blocks whose luminaires are included on either side. */
const IMAGES = 2;

/** No surface is treated as closer to a luminaire than √1.5 m: the luminaire is not a point. */
const MIN_DISTANCE_SQUARED = 1.5;

/** A surface right next to a luminaire is not allowed more than this many times the reference illuminance. */
const DIRECT_CEILING = 3;

/**
 * Irradiance that one luminaire produces on a surface with unit normal n, for unit
 * intensity towards the nadir, the luminaire being displaced by (dx, dy, dz) from
 * the surface point: Lambert's cosine at the emitting face (which looks straight
 * down), Lambert's cosine at the receiving surface, over the square of the distance.
 */
export function luminaireIrradiance(dx: number, dy: number, dz: number, nx: number, ny: number, nz: number): number {
  const d2 = dx * dx + dy * dy + dz * dz;
  if (!(d2 > 0)) return 0;
  const d = Math.sqrt(d2);
  // cosine of the angle between the downward vertical at the luminaire and the ray to the point
  const emission = dy / d;
  if (emission <= 0) return 0; // the point is level with the face or above it
  const incidence = (nx * dx + ny * dy + nz * dz) / d;
  if (incidence <= 0) return 0;
  // directions are those of the true displacement; only the divergence of 1/d² is cut short
  return (emission * incidence) / Math.max(d2, MIN_DISTANCE_SQUARED);
}

/** Direct irradiance at a point with unit normal n from all luminaires within reach, for unit intensity towards the nadir. */
function directIrradiance(px: number, py: number, pz: number, nx: number, ny: number, nz: number): number {
  let total = 0;
  for (let image = -IMAGES; image <= IMAGES; image++) {
    for (const lamp of LUMINAIRES) {
      total += luminaireIrradiance(
        lamp.position[0] - px,
        lamp.position[1] - py,
        lamp.position[2] + image * CHUNK_LENGTH - pz,
        nx,
        ny,
        nz
      );
    }
  }
  return total;
}

/**
 * Light scattered back from the lit street reaches every surface, less so higher
 * up. A stand-in for inter-reflection, as a fraction of the reference illuminance.
 */
function ambientIrradiance(py: number): number {
  const { ambientLedFraction, ambientLedAloft, ambientLedScaleHeightM } = SCENARIO;
  return ambientLedFraction * (ambientLedAloft + (1 - ambientLedAloft) * Math.exp(-Math.max(py, 0) / ambientLedScaleHeightM));
}

export interface IlluminanceStatistics {
  readonly mean: number;
  readonly minimum: number;
  readonly maximum: number;
}

/** Statistics of a function over the driving surface, sampled on a grid of the given step (m). */
function overCarriageway(sample: (x: number, z: number) => number, step: number): IlluminanceStatistics {
  const across = Math.round((2 * CARRIAGEWAY_HALF_WIDTH) / step);
  const along = Math.round(LUMINAIRE_SPACING / step);
  let sum = 0;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = 0;
  for (let i = 0; i < across; i++) {
    const x = -CARRIAGEWAY_HALF_WIDTH + ((i + 0.5) / across) * 2 * CARRIAGEWAY_HALF_WIDTH;
    for (let k = 0; k < along; k++) {
      // one period of the lighting, which repeats with the spacing of the luminaires
      const value = sample(x, ((k + 0.5) / along) * LUMINAIRE_SPACING);
      sum += value;
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    }
  }
  return { mean: sum / (across * along), minimum, maximum };
}

/**
 * Luminous intensity of a luminaire straight down. It is chosen so that the
 * horizontal illuminance of the carriageway, averaged over the driving surface,
 * equals the reference illuminance.
 */
export const LUMINAIRE_INTENSITY =
  (1 - ambientIrradiance(ROAD_SURFACE_Y)) / overCarriageway((x, z) => directIrradiance(x, ROAD_SURFACE_Y, z, 0, 1, 0), 0.25).mean;

/**
 * Luminance of the luminaire's emitting face, in units of the reference luminance:
 * the same in every direction for a diffuse emitter. Not an independent assumption —
 * the face of the lamp model has to send out exactly the light that the street
 * receives.
 */
export const LUMINAIRE_FACE_LUMINANCE = (Math.PI * LUMINAIRE_INTENSITY) / LUMINAIRE_FACE_AREA;

/**
 * Irradiance by the street lighting at a point with the given unit normal, in
 * units of the reference illuminance: the direct light of every luminaire within
 * reach plus the light scattered back by the street.
 */
export function ledIrradiance(px: number, py: number, pz: number, nx: number, ny: number, nz: number): number {
  const direct = LUMINAIRE_INTENSITY * directIrradiance(px, py, pz, nx, ny, nz);
  return Math.min(direct, DIRECT_CEILING) + ambientIrradiance(py);
}

/**
 * Horizontal illuminance of the driving surface, in units of the reference
 * illuminance. EN 13201-2 judges a lighting installation by its average and by the
 * overall uniformity, minimum / average.
 */
export function carriagewayIlluminance(step = 0.25): IlluminanceStatistics & { readonly uniformity: number } {
  const statistics = overCarriageway((x, z) => ledIrradiance(x, ROAD_SURFACE_Y, z, 0, 1, 0), step);
  return { ...statistics, uniformity: statistics.minimum / statistics.mean };
}
