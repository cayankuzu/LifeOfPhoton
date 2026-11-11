/**
 * A statistically realistic naked-eye sky.
 *
 * The positions are uniform on the sky (the real stars crowd towards the Milky
 * Way, which is left out), but the two distributions that decide how the sky
 * responds to a boost follow the Bright Star Catalogue, 5th revised edition
 * (Hoffleit & Warren 1991, VizieR V/50, table V/50/catalog), counted in full on
 * 2026-11-11 (9110 entries, 9096 with a V magnitude; the 14 without are novae,
 * clusters and M 31 kept to preserve the numbering):
 *   – apparent magnitudes: the catalogue lists, over the whole sky, 15 entries with
 *     V ≤ 1, 50 with V ≤ 2, 174 with V ≤ 3, 518 with V ≤ 4, 1630 with V ≤ 5, 4103
 *     with V ≤ 5.8 and 5080 with V ≤ 6 (8404 with V ≤ 6.5). A least-squares fit of
 *     log₁₀ N against m over m = 2–5.8 (steps of half a magnitude) gives a slope of
 *     0.499, with residuals of at most 0.026 dex (at m = 3); N therefore grows as
 *     10^(0.50 m), ×3.2 per magnitude. The old slope 0.51, anchored at m = 5.8,
 *     fell 13 % short of the catalogue at m = 3. The number of stars is the direct
 *     count, not an interpolation: half of the 4103 entries with V ≤ 5.8 are above
 *     the horizon and 93.0 % of those more than 4° above it, 1908, so
 *     SCENARIO.stars.count = 1900;
 *   – temperatures: the spectral classes of those 4103 entries (SPECTRAL_CLASSES).
 * Caveats of the catalogue: some components of multiple stars are listed as
 * separate entries (α Cen A and B, HR 5459 and 5460), and it covers the stars
 * brighter than about magnitude 6.5 (its ReadMe), comfortably fainter than the
 * limit used here.
 * Each star is a black body; its visual magnitude fixes its illuminance through
 * E = 10^(−0.4 (m + 14.18)) lux.
 */

import { REFERENCE_LUMINANCE_CD_M2, SCENARIO } from '@/physics/scenario';
import { type SpectralAtlas, ATLAS_ROW, sampleAtlas, temperatureCoordinate } from '@/physics/spectralAtlas';

/**
 * Entries of the Bright Star Catalogue with V ≤ 5.8 per spectral class, and the
 * temperature range of the class, K. The class is the first capital letter of the
 * catalogue's spectral type, which skips the lower-case prefixes some types carry
 * (g giant, sg subgiant, d dwarf, sd subdwarf, c supergiant: "gG9" is a G star;
 * 114 of the entries counted here carry one). Of the 4103
 * entries 11 have no class O–M (seven carbon stars of types C and N, three S stars
 * and the Wolf-Rayet star γ² Vel); they are left out, 0.27 % of the sky, and the
 * shares below are taken of the remaining 4092: O 0.8 %, B 21.9 %, A 19.5 %,
 * F 13.1 %, G 13.5 %, K 24.4 %, M 6.8 %. The bright sky is dominated by hot B and A
 * stars and by cool K giants.
 */
const SPECTRAL_CLASSES: ReadonlyArray<{ entries: number; coolest: number; hottest: number }> = [
  { entries: 31, coolest: 30_000, hottest: 40_000 }, // O
  { entries: 896, coolest: 10_000, hottest: 30_000 }, // B
  { entries: 798, coolest: 7_500, hottest: 10_000 }, // A
  { entries: 536, coolest: 6_000, hottest: 7_500 }, // F
  { entries: 554, coolest: 5_200, hottest: 6_000 }, // G
  { entries: 1000, coolest: 3_700, hottest: 5_200 }, // K
  { entries: 277, coolest: 2_600, hottest: 3_700 }, // M
];
const CLASSIFIED_ENTRIES = SPECTRAL_CLASSES.reduce((sum, spectral) => sum + spectral.entries, 0);

const BRIGHTEST_MAGNITUDE = -1.5;

/** Slope of log₁₀ N(≤ m) against m, fitted to the Bright Star Catalogue over m = 2–5.8 (0.499). */
export const COUNT_SLOPE = 0.5;

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

    // inverse of the cumulative count N(<m) ∝ 10^(COUNT_SLOPE m)
    const magnitude = Math.max(BRIGHTEST_MAGNITUDE, limitingMagnitude + Math.log10(Math.max(random(), 1e-12)) / COUNT_SLOPE);

    // a class with the probability of its share of the catalogue; drawn on the count of entries so that the shares sum to one exactly
    let pick = random() * CLASSIFIED_ENTRIES;
    let temperature = 5772;
    for (const spectral of SPECTRAL_CLASSES) {
      if (pick < spectral.entries) {
        // log-uniform within the class
        temperature = spectral.coolest * (spectral.hottest / spectral.coolest) ** random();
        break;
      }
      pick -= spectral.entries;
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

// ---------------------------------------------------------------------------
// Drawing a star: flux law and point-spread function (used by the star shader)
// ---------------------------------------------------------------------------

/**
 * ln of the visible-band flux of a star seen at Doppler factor D, in the units of
 * its rest flux: a black body of temperature T looks like one of D·T whose solid
 * angle has shrunk by D², so the flux changes by L(D·T) / (D² · L(T)). The
 * arguments are the ln of the rest illuminance, the ln-luminances of a black body
 * at T and at D·T, and ln D. The star shader computes exactly this sum.
 */
export function starLnFlux(
  lnIlluminance: number,
  lnLuminanceRest: number,
  lnLuminanceShifted: number,
  lnDoppler: number
): number {
  return lnIlluminance + (lnLuminanceShifted - lnLuminanceRest) - 2 * lnDoppler;
}

/** Diameter of the stellar point-spread function, CSS pixels, and its smallest size in device pixels. */
export const STAR_SIZE = 2.6;

/**
 * The point-spread function: exp(−STEEPNESS ρ²) over the sprite, ρ = distance from
 * the centre in units of the sprite's radius, cut off where it falls below CUTOFF
 * (which lies inside the sprite, since e^(−STEEPNESS) < CUTOFF). The star shader
 * is written with these numbers.
 */
export const STAR_PSF_STEEPNESS = 4;
export const STAR_PSF_CUTOFF = 0.02;

/**
 * Integral of the point-spread function over the region drawn, as a fraction of the
 * square of the sprite's radius: ∫ exp(−kρ²) dA over exp(−kρ²) ≥ c is (π/k)(1 − c).
 */
export const STAR_PSF_AREA = (Math.PI / STAR_PSF_STEEPNESS) * (1 - STAR_PSF_CUTOFF);

/**
 * Diameter of the sprite in device pixels at the given pixel ratio. Never less than
 * STAR_SIZE device pixels: a narrower Gaussian evaluated at pixel centres only would
 * pass on a flux that depends on where the star falls on the pixel grid (up to a
 * factor of seven at a pixel ratio of 0.6), and every star would flicker as it moves.
 */
export function starPointSize(pixelRatio: number): number {
  return Math.max(STAR_SIZE * pixelRatio, STAR_SIZE);
}

/**
 * ln of 1 / (solid angle covered by the point-spread function) on the optical axis,
 * for a sprite `pointSizePx` device pixels wide and pixels that subtend `pixelAngle`
 * radians there: flux × this = radiance at the centre of the sprite. Off the axis a
 * pixel of a rectilinear projection subtends cos³θ less (see starLnOffAxis).
 */
export function starLnNormalisation(pointSizePx: number, pixelAngle: number): number {
  const radius = pointSizePx / 2;
  return -Math.log(STAR_PSF_AREA * radius * radius * pixelAngle * pixelAngle);
}

/**
 * What a star at the angle θ from the optical axis adds to starLnNormalisation: the
 * sprite has the same size in pixels everywhere, and a pixel there subtends cos³θ of
 * the solid angle of one on the axis, so the same flux makes cos⁻³θ the radiance.
 */
export function starLnOffAxis(cosAxis: number): number {
  return -3 * Math.log(Math.max(cosAxis, 1e-3));
}
