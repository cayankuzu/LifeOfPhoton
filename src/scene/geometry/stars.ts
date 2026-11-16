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
 *   – temperatures: the spectral classes of those 4103 entries, each given the range
 *     of temperatures a published calibration assigns to it (SPECTRAL_CLASSES).
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
 *
 * The temperature ranges follow published calibrations of effective temperature
 * against MK spectral type, read from the sources on 2026-11-16. A boundary between
 * two classes is the geometric mean of the temperatures of the last subtype of the
 * hotter class and the first of the cooler one (the mean that suits a log-uniform
 * draw), rounded to 100 K; the hot end of O and the cool end of M are the hottest
 * and coolest subtypes the catalogue lists at V ≤ 5.8 (O5 and M8). Which scale
 * applies depends on the luminosity class: of the entries counted here that give
 * one, most B, A and F stars are dwarfs or subgiants (V or IV: 72 %, 85 %, 72 %),
 * while 80 % of the G stars, 96 % of the K stars and all 243 M stars are giants or
 * supergiants (no M dwarf is brighter than 5.8). So:
 *   – O/B, B/A, A/F and F/G follow the dwarf scale of Pecaut & Mamajek (2013,
 *     table 5 as published in VizieR J/ApJS/208/9): O9.5V 32 000 K and B0V 31 500 K
 *     give 31 700 (the old value, 30 000, lay below B0V); B9.5V 10 400 and A0V 9 700
 *     give 10 000; A9V 7 440 and F0V 7 200 give 7 300 (the old 7 500 was A8V);
 *     F9V 6 040 and G0V 5 920 give 6 000;
 *   – G/K, K/M and the cool end of M follow the giant scale of van Belle et al.
 *     (2021, the linear fits of their table 8): G9III 4 744 K and K0III 4 692 K give
 *     4 700 (the old 5 200 is the dwarfs' K1V, 5 170, and some 500 K too hot for the
 *     giants that make up the G and K classes); K5III 3 902 and M0III
 *     3 816 give 3 900, as do K9V 3 880 and M0V 3 850 on the dwarf scale (the old
 *     3 700 was M1V); M6III–M8III 3 134 K gives 3 100 (the old 2 600 was a late M
 *     dwarf, of which the naked-eye sky has none);
 *   – the hot end of O, 40 000 K, lies within the O5 stars of Martins et al. (2005,
 *     observational scale, tables 4–6): O5V 40 862, O5III 40 307, O5I 38 612 K.
 * What the model leaves out: the G class runs from the giants' G/K boundary to the
 * dwarfs' F/G boundary so that the classes tile the range, and covers both G giants
 * (G1III–G9III 5 166–4 744 K) and G dwarfs (G0V–G9V 5 920–5 340 K), but the
 * log-uniform draw puts only 41 % of its stars below 5 200 K while the catalogue's G
 * stars are mostly giants; giants of a class are cooler than its dwarfs by some
 * hundreds of kelvin (O9.5: 31 884 K for V, 30 463 K for I in Martins et al.), and
 * the dwarf scale is used for all O–F stars whatever their luminosity class; within
 * a class the temperature is drawn log-uniformly, not with the catalogue's mix of
 * subtypes.
 */
export const SPECTRAL_CLASSES: ReadonlyArray<{ name: string; entries: number; coolest: number; hottest: number }> = [
  { name: 'O', entries: 31, coolest: 31_700, hottest: 40_000 },
  { name: 'B', entries: 896, coolest: 10_000, hottest: 31_700 },
  { name: 'A', entries: 798, coolest: 7_300, hottest: 10_000 },
  { name: 'F', entries: 536, coolest: 6_000, hottest: 7_300 },
  { name: 'G', entries: 554, coolest: 4_700, hottest: 6_000 },
  { name: 'K', entries: 1000, coolest: 3_900, hottest: 4_700 },
  { name: 'M', entries: 277, coolest: 3_100, hottest: 3_900 },
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
