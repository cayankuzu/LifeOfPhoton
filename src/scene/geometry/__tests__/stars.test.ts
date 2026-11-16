import { describe, expect, it } from 'vitest';
import { blackbodyLuminance, visibleGainOfBlackbody } from '@/physics/radiometry';
import { REFERENCE_LUMINANCE_CD_M2, SCENARIO } from '@/physics/scenario';
import { ATLAS_ROW, sampleAtlas, sharedAtlas, temperatureCoordinate } from '@/physics/spectralAtlas';
import {
  COUNT_SLOPE,
  SPECTRAL_CLASSES,
  STAR_PSF_AREA,
  STAR_PSF_CUTOFF,
  STAR_PSF_STEEPNESS,
  STAR_SIZE,
  generateStarField,
  illuminanceOfMagnitude,
  starLnFlux,
  starLnNormalisation,
  starLnOffAxis,
  starPointSize,
} from '../stars';

const atlas = sharedAtlas();
const field = generateStarField(atlas);
const { count, limitingMagnitude, visibilityGain } = SCENARIO.stars;

/*
 * The Bright Star Catalogue, 5th revised edition (Hoffleit & Warren 1991; VizieR catalogue V/50,
 * table V/50/catalog), counted in full on 2026-11-11 through the ASU interface of CDS's VizieR
 * mirror at the CfA, and checked a second way with the magnitude constraint applied by the server
 * (V ≤ 1.0: 15, V ≤ 5.0: 1630, V ≤ 5.8: 4103, V ≤ 6.5: 8404). Pinned here independently of the
 * generator, which must reproduce them.
 */
/** Entries of the catalogue; those with a V magnitude (the other 14 are novae, clusters and M 31). */
const CATALOGUE_ENTRIES = 9110;
const CATALOGUE_WITH_MAGNITUDE = 9096;
/** Entries over the whole sky with V ≤ m, as [m, N]. */
const CATALOGUE_AT_MOST: ReadonlyArray<readonly [number, number]> = [
  [1, 15],
  [2, 50],
  [2.5, 93],
  [3, 174],
  [3.5, 287],
  [4, 518],
  [4.5, 904],
  [5, 1630],
  [5.5, 2887],
  [5.8, 4103],
  [6, 5080],
  [6.5, 8404],
];
/**
 * Entries with V ≤ 5.8 per spectral class, the class being the first capital letter of the
 * catalogue's spectral type (so "gG9" is G), with the temperature range the generator gives the
 * class, K. Eleven entries have no class O–M (carbon stars C and N, S stars, the Wolf-Rayet star γ² Vel).
 * The boundaries are derived from the calibrations below (see CALIBRATION).
 */
const CATALOGUE_CLASSES: ReadonlyArray<readonly [string, number, number, number]> = [
  ['O', 31, 31_700, 40_000],
  ['B', 896, 10_000, 31_700],
  ['A', 798, 7_300, 10_000],
  ['F', 536, 6_000, 7_300],
  ['G', 554, 4_700, 6_000],
  ['K', 1000, 3_900, 4_700],
  ['M', 277, 3_100, 3_900],
];
/*
 * Effective temperature against MK spectral type, K, read from the sources on 2026-11-16:
 *   – dwarfs: Pecaut & Mamajek (2013), table 5 as published in VizieR J/ApJS/208/9 (O9V–M9V);
 *   – giants: van Belle et al. (2021), table 8, linear fits T = a·S + b with the spectral index S
 *     (G0 = 50, K0 = 60, M0 = 66): a = −52.74, b = 7856 over S = 51–61; a = −85.98, b = 9491 over
 *     S = 64–71.5; a constant 3134 K over S = 72–74 (M6–M8);
 *   – O stars: Martins, Schaerer & Hillier (2005), observational scale, tables 4–6 (O5V, O5III, O5I).
 * Most B, A and F entries of the catalogue with a luminosity class are dwarfs or subgiants, most G and
 * K entries and all M entries giants or supergiants; the boundaries take the scale accordingly.
 */
const giantFit = (index: number): number => (index <= 61 ? 7856 - 52.74 * index : index <= 71.5 ? 9491 - 85.98 * index : 3134);
const CALIBRATION = {
  O9_5V: 32_000,
  B0V: 31_500,
  B9_5V: 10_400,
  A0V: 9_700,
  A9V: 7_440,
  F0V: 7_200,
  F9V: 6_040,
  G0V: 5_920,
  K9V: 3_880,
  M0V: 3_850,
  G9III: giantFit(59),
  K0III: giantFit(60),
  K5III: giantFit(65),
  M0III: giantFit(66),
  M8III: giantFit(74),
  O5: [40_862, 40_307, 38_612],
} as const;
/** Boundary between two adjacent subtypes: their geometric mean, rounded to 100 K. */
const boundary = (hotter: number, cooler: number): number => 100 * Math.round(Math.sqrt(hotter * cooler) / 100);
const CATALOGUE_UNCLASSIFIED = 11;

/** Entries with V ≤ m in the catalogue. */
function catalogueAtMost(magnitude: number): number {
  const entry = CATALOGUE_AT_MOST.find(([m]) => m === magnitude);
  if (!entry) throw new Error(`no catalogue count pinned at magnitude ${magnitude}`);
  return entry[1];
}

/** Fraction of a hemisphere more than atan(0.07), about 4°, above the horizon. */
const ABOVE_CUT = 1 - Math.sin(Math.atan(0.07));

/** Share of the stars for which `test` holds. */
function share(test: (index: number) => boolean): number {
  let hits = 0;
  for (let i = 0; i < field.count; i++) if (test(i)) hits++;
  return hits / field.count;
}

describe('illuminance of a star', () => {
  it('follows the magnitude scale: five magnitudes are a factor of one hundred', () => {
    for (const magnitude of [-1.46, 0, 2.5, 5.8]) {
      expect(illuminanceOfMagnitude(magnitude) / illuminanceOfMagnitude(magnitude + 5)).toBeCloseTo(100, 9);
    }
  });

  it('is anchored at about 2 µlx for magnitude zero', () => {
    // m = −2.5 log₁₀ E − 14.18 with E in lux: a zero-magnitude star seen through the atmosphere
    expect(illuminanceOfMagnitude(0)).toBeGreaterThan(2.0e-6);
    expect(illuminanceOfMagnitude(0)).toBeLessThan(2.6e-6);
    // the same scale puts the Sun (−26.74) at about 10⁵ lx and the full Moon (−12.7) at a few tenths of a lux
    expect(illuminanceOfMagnitude(-26.74)).toBeGreaterThan(0.9e5);
    expect(illuminanceOfMagnitude(-26.74)).toBeLessThan(1.4e5);
    expect(illuminanceOfMagnitude(-12.7)).toBeGreaterThan(0.15);
    expect(illuminanceOfMagnitude(-12.7)).toBeLessThan(0.4);
  });
});

describe('the star field', () => {
  it('is the same sky on every visit, and a different one for a different seed', () => {
    const again = generateStarField(atlas);
    expect(Array.from(again.directions)).toEqual(Array.from(field.directions));
    expect(Array.from(again.attributes)).toEqual(Array.from(field.attributes));
    const other = generateStarField(atlas, 7);
    expect(Array.from(other.directions.subarray(0, 30))).not.toEqual(Array.from(field.directions.subarray(0, 30)));
  });

  it('has the number of stars of the scenario, each a unit direction above the horizon haze', () => {
    expect(field.count).toBe(count);
    expect(field.directions.length).toBe(3 * count);
    for (let i = 0; i < count; i++) {
      const [x, y, z] = [field.directions[3 * i], field.directions[3 * i + 1], field.directions[3 * i + 2]];
      // float32 storage
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 6);
      // about 4° of elevation
      expect(y / Math.hypot(x, z)).toBeGreaterThanOrEqual(0.07 - 1e-6);
    }
  });

  it('has as many stars as the Bright Star Catalogue above the horizon haze, down to the limiting magnitude', () => {
    expect(limitingMagnitude).toBe(5.8);
    // the direct count of the catalogue, not an interpolation: half of the whole sky is above the
    // horizon, and the generator leaves out the 4° next to it (93.0 % remain): 1908
    const aboveCut = (catalogueAtMost(limitingMagnitude) / 2) * ABOVE_CUT;
    expect(aboveCut).toBeCloseTo(1908.2, 1);
    // 1900 is that number rounded; the catalogue's own Poisson scatter is 1/√4103 ≈ 1.6 %
    expect(Math.abs(count / aboveCut - 1)).toBeLessThan(0.01);
  });

  it('covers the sky uniformly: no preferred azimuth, uniform in the sine of the elevation', () => {
    let sumX = 0;
    let sumZ = 0;
    let sumY = 0;
    const quadrants = [0, 0, 0, 0];
    for (let i = 0; i < count; i++) {
      const [x, y, z] = [field.directions[3 * i], field.directions[3 * i + 1], field.directions[3 * i + 2]];
      sumX += x;
      sumZ += z;
      sumY += y;
      quadrants[(x >= 0 ? 0 : 1) + (z >= 0 ? 0 : 2)]++;
    }
    // each horizontal component of the mean scatters by about 0.57/√n ≈ 0.013; more than four standard deviations
    expect(Math.abs(sumX / count)).toBeLessThan(0.06);
    expect(Math.abs(sumZ / count)).toBeLessThan(0.06);
    // uniform on the sphere means uniform in y = sin(elevation) between the cut and the zenith
    expect(sumY / count).toBeGreaterThan(0.5);
    expect(sumY / count).toBeLessThan(0.57);
    for (const quadrant of quadrants) {
      // binomial scatter of a quarter of the 1900 stars is √(1900 · ¼ · ¾) ≈ 19
      expect(Math.abs(quadrant - count / 4)).toBeLessThan(90);
    }
  });

  it('pins catalogue numbers that are consistent with one another', () => {
    expect(CATALOGUE_WITH_MAGNITUDE + 14).toBe(CATALOGUE_ENTRIES);
    for (let k = 1; k < CATALOGUE_AT_MOST.length; k++) {
      expect(CATALOGUE_AT_MOST[k][0]).toBeGreaterThan(CATALOGUE_AT_MOST[k - 1][0]);
      expect(CATALOGUE_AT_MOST[k][1]).toBeGreaterThan(CATALOGUE_AT_MOST[k - 1][1]);
    }
    expect(catalogueAtMost(6.5)).toBeLessThan(CATALOGUE_WITH_MAGNITUDE);
    const classified = CATALOGUE_CLASSES.reduce((sum, [, entries]) => sum + entries, 0);
    expect(classified + CATALOGUE_UNCLASSIFIED).toBe(catalogueAtMost(5.8));
  });

  it('draws magnitudes with the slope of the catalogue: log₁₀ N(≤ m) fitted over m = 2–5.8', () => {
    // least squares of log₁₀ N against m over the pinned counts from 2 to 5.8 gives 0.499
    const points = CATALOGUE_AT_MOST.filter(([m]) => m >= 2 && m <= 5.8);
    expect(points.length).toBe(9);
    const meanM = points.reduce((sum, [m]) => sum + m, 0) / points.length;
    const meanLog = points.reduce((sum, [, n]) => sum + Math.log10(n), 0) / points.length;
    let sxy = 0;
    let sxx = 0;
    for (const [m, n] of points) {
      sxy += (m - meanM) * (Math.log10(n) - meanLog);
      sxx += (m - meanM) ** 2;
    }
    const slope = sxy / sxx;
    expect(slope).toBeCloseTo(0.499, 3);
    expect(Math.abs(COUNT_SLOPE - slope)).toBeLessThan(0.005);
    // a single power law describes the catalogue to 0.026 dex (6 %, at m = 3) over this range
    for (const [m, n] of points) expect(Math.abs(Math.log10(n) - (meanLog + slope * (m - meanM)))).toBeLessThan(0.03);
  });

  it('reproduces the cumulative counts of the catalogue from magnitude 2 to 5.8', () => {
    for (let i = 0; i < count; i++) {
      expect(field.magnitudes[i]).toBeLessThanOrEqual(limitingMagnitude + 1e-5);
      expect(field.magnitudes[i]).toBeGreaterThanOrEqual(-1.5 - 1e-5);
    }
    const whole = catalogueAtMost(limitingMagnitude);
    for (const [m, entries] of CATALOGUE_AT_MOST.filter(([magnitude]) => magnitude >= 2 && magnitude < limitingMagnitude)) {
      // the catalogue's share of entries with V ≤ m, scaled to the stars generated
      const expected = (count * entries) / whole;
      const measured = share((i) => field.magnitudes[i] <= m) * count;
      // two Poisson samples of the same sky, the generated one and the catalogue (174 entries at m = 3
      // scatter by 7.6 % themselves): three standard deviations of their difference
      const sigma = expected * Math.sqrt(1 / expected + 1 / entries);
      expect(Math.abs(measured - expected), `V ≤ ${m}: ${measured} generated, ${expected.toFixed(1)} expected`).toBeLessThan(
        3 * sigma
      );
    }
    // the brightest: 15 entries of the whole sky with V ≤ 1, i.e. about 7 above the cut
    const firstMagnitude = share((i) => field.magnitudes[i] <= 1) * count;
    const expectedFirst = (catalogueAtMost(1) / 2) * ABOVE_CUT;
    expect(Math.abs(firstMagnitude - expectedFirst)).toBeLessThan(3 * Math.sqrt(expectedFirst) + 1);
  });

  it('mixes spectral classes in the shares of the catalogue: mostly B–A stars and K giants', () => {
    const between = (low: number, high: number): number =>
      share((i) => field.temperatures[i] >= low && field.temperatures[i] < high);
    const classified = CATALOGUE_CLASSES.reduce((sum, [, entries]) => sum + entries, 0);
    for (const [name, entries, coolest, hottest] of CATALOGUE_CLASSES) {
      const expected = entries / classified;
      // three standard deviations of a binomial share: 0.029 for B at n = 1900, 0.006 for O
      const tolerance = 3 * Math.sqrt((expected * (1 - expected)) / count);
      expect(Math.abs(between(coolest, hottest) - expected), `class ${name}`).toBeLessThan(tolerance);
    }
    expect(between(3_100, 40_000 + 1)).toBeCloseTo(1, 12);
    // hot and cool stars are both well represented: this is what makes the boosted sky change colour
    // (O, B and A are 42 % of the classified entries, K and M 31 %)
    expect(between(7_300, 40_001)).toBeGreaterThan(0.35);
    expect(between(3_100, 4_700)).toBeGreaterThan(0.25);
  });

  it('gives each class the temperatures of the published calibrations, rounded to 100 K', () => {
    // the generator uses the pinned table
    expect(SPECTRAL_CLASSES.map(({ name, entries, coolest, hottest }) => [name, entries, coolest, hottest])).toEqual(
      CATALOGUE_CLASSES.map((row) => [...row])
    );
    const edges = CATALOGUE_CLASSES.map(([, , coolest]) => coolest);
    // dwarfs: O9.5V/B0V, B9.5V/A0V, A9V/F0V, F9V/G0V
    expect(edges[0]).toBe(boundary(CALIBRATION.O9_5V, CALIBRATION.B0V));
    expect(edges[1]).toBe(boundary(CALIBRATION.B9_5V, CALIBRATION.A0V));
    expect(edges[2]).toBe(boundary(CALIBRATION.A9V, CALIBRATION.F0V));
    expect(edges[3]).toBe(boundary(CALIBRATION.F9V, CALIBRATION.G0V));
    // giants: G9III/K0III (4744 and 4692 K) and K5III/M0III (3902 and 3816 K); the dwarfs agree at K/M
    expect(CALIBRATION.G9III).toBeCloseTo(4744.3, 1);
    expect(CALIBRATION.K0III).toBeCloseTo(4691.6, 1);
    expect(edges[4]).toBe(boundary(CALIBRATION.G9III, CALIBRATION.K0III));
    expect(edges[5]).toBe(boundary(CALIBRATION.K5III, CALIBRATION.M0III));
    expect(edges[5]).toBe(boundary(CALIBRATION.K9V, CALIBRATION.M0V));
    // the coolest M stars of the catalogue are giants of M6–M8 (3134 K); the hottest O stars are O5
    expect(edges[6]).toBe(100 * Math.round(CALIBRATION.M8III / 100));
    const hottest = CATALOGUE_CLASSES[0][3];
    expect(hottest).toBeGreaterThanOrEqual(Math.min(...CALIBRATION.O5));
    expect(hottest).toBeLessThanOrEqual(Math.max(...CALIBRATION.O5));
    // the giants' G/K boundary lies some 600 K below the dwarfs' (K0V 5280 K, G9V 5340 K)
    expect(boundary(5_340, 5_280) - edges[4]).toBe(600);
  });

  it('tiles the range of temperatures with the classes, without gaps or overlaps', () => {
    for (const [name, , coolest, hottest] of CATALOGUE_CLASSES) expect(coolest, `class ${name}`).toBeLessThan(hottest);
    for (let k = 1; k < CATALOGUE_CLASSES.length; k++) {
      // ordered from hot to cool, each class beginning where the hotter one ends
      expect(CATALOGUE_CLASSES[k][3], CATALOGUE_CLASSES[k][0]).toBe(CATALOGUE_CLASSES[k - 1][2]);
    }
    // every star generated lies in the range of a class (float32 storage)
    for (let i = 0; i < count; i++) {
      const temperature = field.temperatures[i];
      const inClass = CATALOGUE_CLASSES.some(
        ([, , coolest, hottest]) => temperature >= coolest * (1 - 1e-6) && temperature <= hottest * (1 + 1e-6)
      );
      expect(inClass, `star ${i}: ${temperature} K`).toBe(true);
    }
  });

  it('stores for each star what the shader needs: flux, temperature and the atlas luminance at rest', () => {
    for (let i = 0; i < count; i += 37) {
      const lnFlux = field.attributes[3 * i];
      const lnTemperature = field.attributes[3 * i + 1];
      const lnLuminance = field.attributes[3 * i + 2];
      const expected = (illuminanceOfMagnitude(field.magnitudes[i]) * visibilityGain) / REFERENCE_LUMINANCE_CD_M2;
      // float32 logarithms
      expect(Math.exp(lnFlux) / expected).toBeCloseTo(1, 4);
      expect(Math.exp(lnTemperature) / field.temperatures[i]).toBeCloseTo(1, 5);
      const atRest = sampleAtlas(atlas, ATLAS_ROW.blackbody, temperatureCoordinate(field.temperatures[i]))[3];
      expect(lnLuminance).toBeCloseTo(atRest, 4);
    }
  });

  it('brightest stars are far fainter than anything the street lighting shows', () => {
    // even with the visibility gain a star is a small fraction of the reference luminance per unit solid angle of a pixel
    let brightest = -Infinity;
    for (let i = 0; i < count; i++) brightest = Math.max(brightest, field.attributes[3 * i]);
    const brightestLux = (Math.exp(brightest) * REFERENCE_LUMINANCE_CD_M2) / visibilityGain;
    expect(brightestLux).toBeLessThan(illuminanceOfMagnitude(-1.5) * 1.001);
    expect(brightestLux).toBeLessThan(SCENARIO.moon.illuminanceLux / 1e4);
  });
});

describe('drawing a star', () => {
  const sumOverGrid = (pointSize: number, centreX: number, centreY: number, step = 1): number => {
    // the shader evaluates the point-spread function at the sample positions (n + ½)·step inside the square sprite
    const radius = pointSize / 2;
    const first = (centre: number): number => (Math.ceil((centre - radius) / step - 0.5) + 0.5) * step;
    let sum = 0;
    for (let y = first(centreY); y <= centreY + radius; y += step) {
      for (let x = first(centreX); x <= centreX + radius; x += step) {
        const rho2 = ((x - centreX) ** 2 + (y - centreY) ** 2) / (radius * radius);
        const falloff = Math.exp(-STAR_PSF_STEEPNESS * rho2);
        if (falloff >= STAR_PSF_CUTOFF) sum += falloff * step * step;
      }
    }
    return sum;
  };

  it('changes the flux by L(D·T) / (D² L(T)): a black body at D·T whose solid angle has shrunk by D²', () => {
    for (const temperature of [3_000, 5_772, 10_000, 30_000]) {
      for (const doppler of [0.2, 0.7, 1, 2.5, 20, 447]) {
        const lnFlux = starLnFlux(
          Math.log(3e-7),
          Math.log(blackbodyLuminance(temperature)),
          Math.log(blackbodyLuminance(temperature * doppler)),
          Math.log(doppler)
        );
        const expected = (3e-7 * visibleGainOfBlackbody(temperature, doppler)) / doppler ** 2;
        expect(Math.exp(lnFlux) / expected).toBeCloseTo(1, 9);
      }
    }
    // at rest the flux is the rest flux
    expect(starLnFlux(-12.5, 3.2, 3.2, 0)).toBe(-12.5);
  });

  it('spreads the flux over exactly the solid angle the normalisation assumes', () => {
    // integral of the point-spread function over the region drawn: (π/k)(1 − c) times the square of the radius
    for (const pointSize of [2.6, 3.9, 6]) {
      const integral = sumOverGrid(pointSize, 0.37, -0.21, 0.01);
      const pixelAngle = 1.1e-3;
      // radiance at the centre × ∫ falloff dΩ = flux, with a flux of one
      expect(integral * pixelAngle * pixelAngle * Math.exp(starLnNormalisation(pointSize, pixelAngle))).toBeCloseTo(1, 3);
    }
    expect(STAR_PSF_AREA).toBeCloseTo((Math.PI / 4) * 0.98, 12);
    // the cut-off lies inside the sprite, so the disc it bounds is never clipped by the square
    expect(Math.exp(-STAR_PSF_STEEPNESS)).toBeLessThan(STAR_PSF_CUTOFF);
  });

  it('is never drawn narrower than 2.6 device pixels, so its flux hardly depends on where it falls on the pixel grid', () => {
    expect(starPointSize(1)).toBeCloseTo(STAR_SIZE, 12);
    expect(starPointSize(1.5)).toBeCloseTo(1.5 * STAR_SIZE, 12);
    expect(starPointSize(0.6)).toBe(STAR_SIZE);
    // evaluated at pixel centres, over a grid of sub-pixel positions of the star (measured 0.94–1.06 at 2.6 px;
    // a sprite of 1.56 px, as at a pixel ratio of 0.6 without the floor, ranges over 0.31–2.1)
    const spread = (pointSize: number): [number, number] => {
      const exact = STAR_PSF_AREA * (pointSize / 2) ** 2;
      let low = Infinity;
      let high = 0;
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
          const ratio = sumOverGrid(pointSize, (i + 0.5) / 20, (j + 0.5) / 20) / exact;
          low = Math.min(low, ratio);
          high = Math.max(high, ratio);
        }
      }
      return [low, high];
    };
    const [low, high] = spread(starPointSize(0.6));
    expect(low).toBeGreaterThan(0.93);
    expect(high).toBeLessThan(1.07);
    const [narrowLow, narrowHigh] = spread(STAR_SIZE * 0.6);
    expect(narrowHigh / narrowLow).toBeGreaterThan(5);
  });

  it('is brighter per pixel off the optical axis, where a pixel subtends cos³θ less solid angle', () => {
    // exact solid angle of a pixel of a rectilinear projection: a rectangle on the image plane at distance f
    const f = 1000;
    const corner = (x: number, y: number): number => Math.atan((x * y) / (f * Math.hypot(x, y, f)));
    const pixel = (x: number, y: number): number => corner(x + 1, y + 1) - corner(x, y + 1) - corner(x + 1, y) + corner(x, y);
    const onAxis = pixel(-0.5, -0.5);
    for (const [x, y] of [
      [0, 0],
      [600, 0],
      [0, 540],
      [960, 540],
      [1500, 1200],
    ]) {
      const cosAxis = f / Math.hypot(x + 0.5, y + 0.5, f);
      // the same flux over the smaller solid angle: the radiance rises by exactly the inverse ratio
      expect(Math.exp(-starLnOffAxis(cosAxis)) / (pixel(x, y) / onAxis)).toBeCloseTo(1, 5);
    }
    expect(starLnOffAxis(1)).toBe(-0);
  });
});
