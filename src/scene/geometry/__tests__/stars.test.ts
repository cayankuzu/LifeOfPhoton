import { describe, expect, it } from 'vitest';
import { REFERENCE_LUMINANCE_CD_M2, SCENARIO } from '@/physics/scenario';
import { ATLAS_ROW, sampleAtlas, sharedAtlas, temperatureCoordinate } from '@/physics/spectralAtlas';
import { generateStarField, illuminanceOfMagnitude } from '../stars';

const atlas = sharedAtlas();
const field = generateStarField(atlas);
const { count, limitingMagnitude, visibilityGain } = SCENARIO.stars;

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
    // the mean of n unit-ish vectors scatters by about 1/√n ≈ 0.02; four standard deviations
    expect(Math.abs(sumX / count)).toBeLessThan(0.06);
    expect(Math.abs(sumZ / count)).toBeLessThan(0.06);
    // uniform on the sphere means uniform in y = sin(elevation) between the cut and the zenith
    expect(sumY / count).toBeGreaterThan(0.5);
    expect(sumY / count).toBeLessThan(0.57);
    for (const quadrant of quadrants) {
      // binomial scatter of a quarter of 2600 is about 22
      expect(Math.abs(quadrant - count / 4)).toBeLessThan(90);
    }
  });

  it('reproduces the observed number counts: about 3.2 times more stars per magnitude', () => {
    for (let i = 0; i < count; i++) {
      expect(field.magnitudes[i]).toBeLessThanOrEqual(limitingMagnitude + 1e-5);
      expect(field.magnitudes[i]).toBeGreaterThanOrEqual(-1.5 - 1e-5);
    }
    // cumulative count N(<m) ∝ 10^(0.51 m): the share brighter than m is 10^(−0.51 (m_lim − m))
    for (const fainter of [1, 2, 3]) {
      const expected = 10 ** (-0.51 * fainter);
      const measured = share((i) => field.magnitudes[i] < limitingMagnitude - fainter);
      // binomial scatter: √(p(1−p)/n) ≤ 0.009; allow three standard deviations and a little more
      expect(Math.abs(measured - expected)).toBeLessThan(0.035);
    }
    // a handful of first-magnitude stars, as in the real sky above the horizon
    const bright = share((i) => field.magnitudes[i] < 1.5) * count;
    expect(bright).toBeGreaterThan(3);
    expect(bright).toBeLessThan(40);
  });

  it('mixes spectral classes as the naked-eye sky does: mostly B–A stars and K giants', () => {
    const between = (low: number, high: number): number =>
      share((i) => field.temperatures[i] >= low && field.temperatures[i] < high);
    // three standard deviations of a binomial share at n = 2600 are about 0.025
    expect(Math.abs(between(10_000, 30_000) - 0.19)).toBeLessThan(0.03); // B
    expect(Math.abs(between(7_500, 10_000) - 0.22)).toBeLessThan(0.03); // A
    expect(Math.abs(between(3_700, 5_200) - 0.25)).toBeLessThan(0.03); // K
    expect(between(2_600, 40_000 + 1)).toBeCloseTo(1, 12);
    // hot and cool stars are both well represented: this is what makes the boosted sky change colour
    expect(between(7_500, 40_001)).toBeGreaterThan(0.35);
    expect(between(2_600, 5_200)).toBeGreaterThan(0.25);
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
