import { describe, expect, it } from 'vitest';
import {
  CIE1931_STEP_NM,
  CIE1931_START_NM,
  CIE1931_TABLE,
  colourMatching,
  colourMatchingAnalytic,
  photopicEfficiency,
} from '../cie1931';
import {
  type Triple,
  D65_XYZ,
  LUMINANCE_WEIGHTS,
  SRGB_TO_XYZ,
  XYZ_TO_SRGB,
  apply,
  bradfordAdaptation,
  chromaticity,
  compressToGamut,
  correlatedColourTemperature,
  decodeSrgb,
  encodeSrgb,
  invert,
  multiply,
  relativeLuminance,
} from '../colorimetry';
import {
  ASTRONOMICAL_UNIT_METRES,
  FIRST_RADIATION_CONSTANT_RADIANCE,
  NOMINAL_SOLAR_RADIUS_METRES,
  NOMINAL_SOLAR_TEMPERATURE_K,
  SECOND_RADIATION_CONSTANT,
} from '../constants';
import {
  blackbodyLuminance,
  illuminanceFromBlackbodyDisc,
  planckRadiance,
  planckianChromaticity,
  solveLogBisection,
  tristimulus,
  visibleGainOfBlackbody,
} from '../radiometry';

describe('CIE 1931 standard observer table', () => {
  it('has 81 rows from 380 nm to 780 nm', () => {
    expect(CIE1931_TABLE).toHaveLength(81);
    expect(CIE1931_START_NM + (CIE1931_TABLE.length - 1) * CIE1931_STEP_NM).toBe(780);
  });

  it('reproduces the published column sums (equal-energy white is achromatic)', () => {
    const sums = [0, 0, 0];
    for (const row of CIE1931_TABLE) {
      sums[0] += row[0];
      sums[1] += row[1];
      sums[2] += row[2];
    }
    expect(sums[0]).toBeCloseTo(21.3714, 3);
    expect(sums[1]).toBeCloseTo(21.3711, 3);
    expect(sums[2]).toBeCloseTo(21.3715, 3);
  });

  it('agrees entry by entry with the independent analytic fit of Wyman, Sloan & Shirley (2013)', () => {
    CIE1931_TABLE.forEach((row, index) => {
      const fit = colourMatchingAnalytic(CIE1931_START_NM + index * CIE1931_STEP_NM);
      expect(Math.abs(row[0] - fit[0])).toBeLessThan(0.02);
      expect(Math.abs(row[1] - fit[1])).toBeLessThan(0.012);
      expect(Math.abs(row[2] - fit[2])).toBeLessThan(0.03);
    });
  });

  it('peaks at V(555 nm) = 1 and vanishes outside the table', () => {
    expect(photopicEfficiency(555)).toBe(1);
    expect(photopicEfficiency(379.9)).toBe(0);
    expect(photopicEfficiency(780.1)).toBe(0);
    expect(photopicEfficiency(Number.NaN)).toBe(0);
    const out = [9, 9, 9];
    colourMatching(1200, out);
    expect(out).toEqual([0, 0, 0]);
  });

  it('interpolates linearly between nodes', () => {
    const out = [0, 0, 0];
    colourMatching(552.5, out);
    expect(out[1]).toBeCloseTo((0.99495 + 1) / 2, 12);
    expect(photopicEfficiency(552.5)).toBeCloseTo(out[1], 14);
  });
});

describe('sRGB', () => {
  it('matches the matrix printed in IEC 61966-2-1', () => {
    const iec = [3.2406, -1.5372, -0.4986, -0.9689, 1.8758, 0.0415, 0.0557, -0.204, 1.057];
    XYZ_TO_SRGB.forEach((value, index) => expect(Math.abs(value - iec[index])).toBeLessThan(5e-4));
  });

  it('has the BT.709 luminance weights', () => {
    expect(LUMINANCE_WEIGHTS[0]).toBeCloseTo(0.2126, 4);
    expect(LUMINANCE_WEIGHTS[1]).toBeCloseTo(0.7152, 4);
    expect(LUMINANCE_WEIGHTS[2]).toBeCloseTo(0.0722, 4);
    expect(relativeLuminance([1, 1, 1])).toBeCloseTo(1, 12);
  });

  it('maps white to D65 and inverts cleanly', () => {
    const white = apply(SRGB_TO_XYZ, [1, 1, 1]);
    expect(white[0]).toBeCloseTo(D65_XYZ[0], 12);
    expect(white[2]).toBeCloseTo(D65_XYZ[2], 12);
    const identity = multiply(SRGB_TO_XYZ, XYZ_TO_SRGB);
    [1, 0, 0, 0, 1, 0, 0, 0, 1].forEach((v, i) => expect(identity[i]).toBeCloseTo(v, 12));
    expect(() => invert([1, 2, 3, 2, 4, 6, 0, 0, 1])).toThrow();
  });

  it('encodes with the piecewise transfer function', () => {
    expect(encodeSrgb(0)).toBe(0);
    expect(encodeSrgb(1)).toBeCloseTo(1, 12);
    expect(encodeSrgb(0.18)).toBeCloseTo(0.4614, 3);
    expect(encodeSrgb(-1)).toBe(0);
    expect(encodeSrgb(5)).toBeCloseTo(1, 12);
    for (const v of [0.001, 0.0031308, 0.02, 0.5, 0.9]) expect(decodeSrgb(encodeSrgb(v))).toBeCloseTo(v, 10);
  });
});

describe('chromatic adaptation and gamut', () => {
  it('is the identity when source and destination whites coincide', () => {
    const m = bradfordAdaptation(D65_XYZ, D65_XYZ);
    [1, 0, 0, 0, 1, 0, 0, 0, 1].forEach((v, i) => expect(m[i]).toBeCloseTo(v, 12));
  });

  it('maps the source white onto the destination white', () => {
    const tungsten: Triple = [1.0985, 1, 0.3558];
    const mapped = apply(bradfordAdaptation(tungsten, D65_XYZ), tungsten);
    mapped.forEach((v, i) => expect(v).toBeCloseTo(D65_XYZ[i], 10));
  });

  it('compresses out-of-gamut colours while preserving luminance', () => {
    const wild: Triple = [1.4, -0.3, 0.2];
    const fixed = compressToGamut(wild);
    expect(Math.min(...fixed)).toBeGreaterThanOrEqual(-1e-12);
    expect(relativeLuminance(fixed)).toBeCloseTo(relativeLuminance(wild), 12);
    expect(compressToGamut([0.2, 0.5, 0.7])).toEqual([0.2, 0.5, 0.7]);
    expect(compressToGamut([-1, -1, 0.1])).toEqual([0, 0, 0]);
  });

  it('recovers the colour temperature of daylight', () => {
    expect(correlatedColourTemperature([0.3127, 0.329])).toBeCloseTo(6504, -1.5);
    expect(chromaticity([0, 0, 0])).toEqual([1 / 3, 1 / 3]);
  });
});

describe("Planck's law", () => {
  it('obeys the Stefan–Boltzmann law: ∫B_λ dλ = σT⁴/π', () => {
    const sigma = 5.670374419e-8;
    for (const temperature of [300, 2856, 5772, 30000]) {
      // integrate in ln λ across the whole spectrum
      let sum = 0;
      const lo = Math.log(1e-9 * (5772 / temperature));
      const hi = Math.log(1e-2 * (5772 / temperature));
      const n = 20000;
      const h = (hi - lo) / n;
      for (let i = 0; i <= n; i++) {
        const lambda = Math.exp(lo + i * h);
        sum += planckRadiance(lambda, temperature) * lambda * (i === 0 || i === n ? 0.5 : 1);
      }
      expect((sum * h) / ((sigma * temperature ** 4) / Math.PI)).toBeCloseTo(1, 5);
    }
  });

  it("peaks where Wien's displacement law says", () => {
    const temperature = 5772;
    const peak = 2.897771955e-3 / temperature;
    const at = planckRadiance(peak, temperature);
    expect(planckRadiance(peak * 1.01, temperature)).toBeLessThan(at);
    expect(planckRadiance(peak * 0.99, temperature)).toBeLessThan(at);
  });

  it('is invariant in form under a Doppler shift: D⁵·B_λ(Dλ, T) = B_λ(λ, DT)', () => {
    for (const doppler of [0.01, 0.4, 1, 3.7, 447]) {
      for (const lambda of [380e-9, 555e-9, 780e-9]) {
        const shifted = doppler ** 5 * planckRadiance(doppler * lambda, 4100);
        const hotter = planckRadiance(lambda, doppler * 4100);
        if (hotter === 0) expect(shifted).toBe(0);
        else expect(shifted / hotter).toBeCloseTo(1, 10);
      }
    }
  });

  it('reduces to Rayleigh–Jeans and Wien in the two limits', () => {
    const lambda = 555e-9;
    const hot = 1e9;
    const rayleighJeans = (FIRST_RADIATION_CONSTANT_RADIANCE / lambda ** 4) * (hot / SECOND_RADIATION_CONSTANT);
    expect(planckRadiance(lambda, hot) / rayleighJeans).toBeCloseTo(1, 4);
    const cold = 800;
    const wien = (FIRST_RADIATION_CONSTANT_RADIANCE / lambda ** 5) * Math.exp(-SECOND_RADIATION_CONSTANT / (lambda * cold));
    expect(planckRadiance(lambda, cold) / wien).toBeCloseTo(1, 9);
    expect(planckRadiance(lambda, 0)).toBe(0);
    expect(planckRadiance(lambda, 1)).toBe(0);
  });
});

describe('photometry of black bodies against metrological data', () => {
  it('gives 60 cd/cm² at the freezing point of platinum (the pre-1979 definition of the candela)', () => {
    expect(blackbodyLuminance(2042) / 6.0e5).toBeCloseTo(1, 1);
  });

  it('gives the illuminance of sunlight above the atmosphere (≈ 1.3 × 10⁵ lx)', () => {
    const solidAngle = Math.PI * (NOMINAL_SOLAR_RADIUS_METRES / ASTRONOMICAL_UNIT_METRES) ** 2;
    const lux = illuminanceFromBlackbodyDisc(NOMINAL_SOLAR_TEMPERATURE_K, solidAngle);
    expect(lux).toBeGreaterThan(1.2e5);
    expect(lux).toBeLessThan(1.36e5);
  });

  it('places standard illuminants on the Planckian locus', () => {
    const a = planckianChromaticity(2856);
    expect(a[0]).toBeCloseTo(0.4476, 3);
    expect(a[1]).toBeCloseTo(0.4074, 3);
    const d = planckianChromaticity(6500);
    expect(d[0]).toBeCloseTo(0.3135, 2);
    expect(d[1]).toBeCloseTo(0.3237, 2);
  });

  it('integrates a flat spectrum to the column sums of the observer', () => {
    const flat = tristimulus(() => 1);
    // 1 nm trapezoid of a table that is linear between 5 nm nodes = 5 × (sum − half the end values)
    expect(flat[1]).toBeCloseTo(5 * (21.3713 - 0.5 * (0.000039 + 0.000015)), 2);
  });
});

describe('the headlight effect as an eye sees it', () => {
  it('is far below the bolometric D⁴ once the peak has left the visible band', () => {
    const gain = visibleGainOfBlackbody(5772, 447.2);
    expect(gain).toBeGreaterThan(5e3);
    expect(gain).toBeLessThan(2e4);
    expect(gain).toBeLessThan(1e-6 * 447.2 ** 4);
  });

  it('falls far faster than D⁴ on the red side (Wien tail)', () => {
    expect(visibleGainOfBlackbody(5772, 0.5)).toBeLessThan(0.5 ** 4 / 3);
    expect(visibleGainOfBlackbody(4100, 0.5)).toBeLessThan(0.005);
  });

  it('grows linearly with D in the Rayleigh–Jeans regime', () => {
    expect(visibleGainOfBlackbody(5772, 4000) / visibleGainOfBlackbody(5772, 2000)).toBeCloseTo(2, 2);
  });

  it('is 1 at rest', () => {
    expect(visibleGainOfBlackbody(4100, 1)).toBe(1);
    expect(visibleGainOfBlackbody(0, 2)).toBe(0);
  });
});

describe('log-bisection solver', () => {
  it('finds a bracketed root and reports an unbracketed one', () => {
    expect(solveLogBisection((x) => x * x - 2, 0.1, 10)).toBeCloseTo(Math.SQRT2, 12);
    expect(solveLogBisection((x) => x + 1, 0.1, 10)).toBeNaN();
  });
});
