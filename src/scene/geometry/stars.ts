/**
 * A statistically realistic naked-eye sky.
 *
 * The positions are random, but the two distributions that decide how the sky
 * responds to a boost follow observation:
 *   – apparent magnitudes: the cumulative count of stars brighter than m grows as
 *     10^(0.51 m) (≈ ×3.2 per magnitude), which gives about 2 600 stars above the
 *     horizon down to magnitude 5.8;
 *   – temperatures: the mix of spectral classes among naked-eye stars (the bright
 *     sky is dominated by hot B and A stars and by cool K giants).
 * Each star is a black body; its visual magnitude fixes its illuminance through
 * E = 10^(−0.4 (m + 14.18)) lux.
 */

import { REFERENCE_LUMINANCE_CD_M2, SCENARIO } from '@/physics/scenario';
import { type SpectralAtlas, ATLAS_ROW, sampleAtlas, temperatureCoordinate } from '@/physics/spectralAtlas';

/** Fraction of naked-eye stars per spectral class and the temperature range of the class, K. */
const SPECTRAL_CLASSES: ReadonlyArray<{ share: number; coolest: number; hottest: number }> = [
  { share: 0.01, coolest: 30_000, hottest: 40_000 }, // O
  { share: 0.19, coolest: 10_000, hottest: 30_000 }, // B
  { share: 0.22, coolest: 7_500, hottest: 10_000 }, // A
  { share: 0.14, coolest: 6_000, hottest: 7_500 }, // F
  { share: 0.13, coolest: 5_200, hottest: 6_000 }, // G
  { share: 0.25, coolest: 3_700, hottest: 5_200 }, // K
  { share: 0.06, coolest: 2_600, hottest: 3_700 }, // M
];

const BRIGHTEST_MAGNITUDE = -1.5;
const COUNT_SLOPE = 0.51;

/**
 * Stars closer to the horizon than this (tan of the elevation, about 4°) are left
 * out: there the air mass exceeds 12, and extinction and the glow of the city hide
 * all but the very brightest.
 */
const HORIZON_SLOPE = 0.07;

/** Deterministic generator (mulberry32) so that the sky is the same on every visit. */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StarField {
  readonly count: number;
  /** Unit direction of each star in the rest frame. */
  readonly directions: Float32Array;
  /** Per star: (ln of illuminance in reference units, ln T, atlas ln-luminance of a black body at T). */
  readonly attributes: Float32Array;
  /** Per star: visual magnitude and temperature, for diagnostics and tests. */
  readonly magnitudes: Float32Array;
  readonly temperatures: Float32Array;
}

/** Illuminance of a star of visual magnitude m, lux. */
export function illuminanceOfMagnitude(magnitude: number): number {
  return 10 ** (-0.4 * (magnitude + 14.18));
}

export function generateStarField(atlas: SpectralAtlas, seed = 1905): StarField {
  const { count, limitingMagnitude, visibilityGain } = SCENARIO.stars;
  const random = generator(seed);
  const directions = new Float32Array(count * 3);
  const attributes = new Float32Array(count * 3);
  const magnitudes = new Float32Array(count);
  const temperatures = new Float32Array(count);

  let made = 0;
  while (made < count) {
    // uniform on the sphere, keeping the part of the sky clear of the horizon haze
    const y = random();
    const horizontal = Math.sqrt(1 - y * y);
    if (y / Math.max(horizontal, 1e-6) < HORIZON_SLOPE) continue;
    const azimuth = 2 * Math.PI * random();

    // inverse of the cumulative count N(<m) ∝ 10^(0.51 m)
    const magnitude = Math.max(BRIGHTEST_MAGNITUDE, limitingMagnitude + Math.log10(Math.max(random(), 1e-12)) / COUNT_SLOPE);

    let pick = random();
    let temperature = 5772;
    for (const spectral of SPECTRAL_CLASSES) {
      if (pick < spectral.share) {
        // log-uniform within the class
        temperature = spectral.coolest * (spectral.hottest / spectral.coolest) ** random();
        break;
      }
      pick -= spectral.share;
    }

    directions[made * 3] = horizontal * Math.sin(azimuth);
    directions[made * 3 + 1] = y;
    directions[made * 3 + 2] = -horizontal * Math.cos(azimuth);
    const lnIlluminance = Math.log((illuminanceOfMagnitude(magnitude) * visibilityGain) / REFERENCE_LUMINANCE_CD_M2);
    attributes[made * 3] = lnIlluminance;
    attributes[made * 3 + 1] = Math.log(temperature);
    attributes[made * 3 + 2] = sampleAtlas(atlas, ATLAS_ROW.blackbody, temperatureCoordinate(temperature))[3];
    magnitudes[made] = magnitude;
    temperatures[made] = temperature;
    made++;
  }
  return { count, directions, attributes, magnitudes, temperatures };
}
