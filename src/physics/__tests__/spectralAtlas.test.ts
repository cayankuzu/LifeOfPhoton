import { beforeAll, describe, expect, it } from 'vitest';
import { type Triple, chromaticity, compressToGamut, correlatedColourTemperature, relativeLuminance } from '../colorimetry';
import { NOMINAL_SOLAR_TEMPERATURE_K, SOLAR_DILUTION_AT_1AU } from '../constants';
import { BETA_MAX, headOnDopplerFactor } from '../kinematics';
import { blackbodyLuminance, planckianChromaticity, solveLogBisection, tristimulus, visibleGainOfBlackbody } from '../radiometry';
import { MOON_DISC_LUMINANCE_CD_M2, REFERENCE_LUMINANCE_CD_M2, SCENARIO } from '../scenario';
import { ledSpectrum, reflectanceBasis } from '../spectra';
import {
  type SpectralAtlas,
  ATLAS_ROW,
  ATLAS_ROWS,
  ATLAS_WIDTH,
  LINE_MAX_NM,
  LINE_MIN_NM,
  LN_LUMINANCE_FLOOR,
  REST_TEXEL,
  blackbodyLuminanceUnits,
  blackbodyRadiance,
  buildSpectralAtlas,
  dopplerCoordinate,
  lineRadiance,
  reflectedGain,
  reflectedRadiance,
  sampleAtlas,
} from '../spectralAtlas';

let atlas: SpectralAtlas;
beforeAll(() => {
  atlas = buildSpectralAtlas();
});

describe('street LED model', () => {
  it('lies on the Planckian locus at 4000 K', () => {
    const xy = chromaticity(tristimulus(ledSpectrum));
    const cct = correlatedColourTemperature(xy);
    expect(cct).toBeGreaterThan(3900);
    expect(cct).toBeLessThan(4100);
    const locus = planckianChromaticity(cct);
    expect(Math.hypot(xy[0] - locus[0], xy[1] - locus[1])).toBeLessThan(0.004);
  });

  it('is band-limited: no power outside the visible band', () => {
    expect(ledSpectrum(380)).toBeLessThan(1e-4);
    expect(ledSpectrum(900)).toBeLessThan(1e-6);
    expect(ledSpectrum(1500)).toBeLessThan(1e-50);
  });
});

describe('reflectance basis', () => {
  it('is a non-negative partition of unity at every wavelength from X-rays to radio', () => {
    const out = [0, 0, 0];
    for (const nm of [1e-3, 1, 100, 380, 440, 490, 540, 594, 650, 780, 2500, 1e5, 1e9]) {
      reflectanceBasis(nm, out);
      expect(out[0] + out[1] + out[2]).toBeCloseTo(1, 13);
      for (const v of out) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('continues the red plateau into the infrared and the blue plateau into the ultraviolet', () => {
    const out = [0, 0, 0];
    reflectanceBasis(5000, out);
    expect(out[0]).toBeCloseTo(1, 12);
    reflectanceBasis(200, out);
    expect(out[2]).toBeCloseTo(1, 12);
    reflectanceBasis(540, out);
    expect(out[1]).toBeGreaterThan(0.99);
  });
});

describe('atlas structure', () => {
  it('has the documented size and contains only finite numbers', () => {
    expect(atlas.width).toBe(ATLAS_WIDTH);
    expect(atlas.rows).toBe(ATLAS_ROWS);
    expect(atlas.data).toHaveLength(ATLAS_WIDTH * ATLAS_ROWS * 4);
    for (let i = 0; i < atlas.data.length; i++) expect(Number.isFinite(atlas.data[i])).toBe(true);
  });

  it('stores values a half-float texture can represent', () => {
    let largest = 0;
    for (let i = 0; i < atlas.data.length; i++) largest = Math.max(largest, Math.abs(atlas.data[i]));
    expect(largest).toBeLessThan(65000);
  });

  it('assigns every sRGB primary a physically valid reflectance spectrum (0 ≤ ρ ≤ 1)', () => {
    const basis = [0, 0, 0];
    const m = atlas.albedoToBasis;
    for (let nm = 200; nm <= 3000; nm += 2) {
      reflectanceBasis(nm, basis);
      for (let channel = 0; channel < 3; channel++) {
        const rho = m[channel] * basis[0] + m[3 + channel] * basis[1] + m[6 + channel] * basis[2];
        expect(rho).toBeGreaterThan(-0.005);
        expect(rho).toBeLessThan(1.005);
      }
    }
  });
});

describe('reflected light', () => {
  const albedos: Triple[] = [
    [1, 1, 1],
    [0.5, 0.5, 0.5],
    [0.8, 0.1, 0.1],
    [0.1, 0.6, 0.2],
    [0.05, 0.1, 0.9],
    [0.9, 0.75, 0.2],
  ];

  it('renders every albedo as itself at rest under the white-balance illuminant', () => {
    for (const albedo of albedos) {
      const seen = reflectedRadiance(atlas, 'moon', albedo, 1);
      seen.forEach((v, i) => expect(v).toBeCloseTo(albedo[i], 5));
    }
  });

  it('keeps grey surfaces grey under the Moon at every speed: they just look like a hotter or cooler black body', () => {
    for (const doppler of [0.5, 0.8, 1.5, 3, 10, 100]) {
      const grey = reflectedRadiance(atlas, 'moon', [0.5, 0.5, 0.5], doppler);
      const body = blackbodyRadiance(atlas, SCENARIO.moon.colourTemperatureK * doppler);
      const yGrey = relativeLuminance(grey);
      const yBody = relativeLuminance(body);
      for (let i = 0; i < 3; i++) expect(grey[i] / yGrey).toBeCloseTo(body[i] / yBody, 2);
    }
  });

  it('reproduces the direct integral of the luminance gain to better than 1 %', () => {
    for (const doppler of [0.4, 0.6, 0.9, 1, 1.3, 2, 3.73, 14.1, 141, 447.2]) {
      const direct = visibleGainOfBlackbody(SCENARIO.moon.colourTemperatureK, doppler);
      expect(reflectedGain(atlas, 'moon', doppler) / direct).toBeCloseTo(1, 2);
    }
  });

  it('shows the street lighting only in a narrow window around D = 1', () => {
    expect(reflectedGain(atlas, 'led', 1)).toBeCloseTo(1, 2);
    // brightest slightly on the blue side, where the phosphor band crosses the peak of V(λ)
    expect(reflectedGain(atlas, 'led', 1.1)).toBeGreaterThan(1.2);
    // ultraviolet extinction ahead, infrared extinction behind
    expect(reflectedGain(atlas, 'led', 1.7)).toBeLessThan(0.01);
    expect(reflectedGain(atlas, 'led', 2)).toBeLessThan(1e-4);
    expect(reflectedGain(atlas, 'led', 0.65)).toBeLessThan(0.01);
    expect(reflectedGain(atlas, 'led', 0.5)).toBeLessThan(1e-6);
    // while moonlight on the same surface keeps growing
    expect(reflectedGain(atlas, 'moon', 2)).toBeGreaterThan(20);
  });

  it('turns LED light blue ahead and red behind — the Doppler iris', () => {
    const ahead = compressToGamut(reflectedRadiance(atlas, 'led', [1, 1, 1], 1.3));
    expect(ahead[2]).toBeGreaterThan(ahead[0]);
    expect(ahead[2]).toBeGreaterThan(ahead[1]);
    const behind = compressToGamut(reflectedRadiance(atlas, 'led', [1, 1, 1], 0.72));
    expect(behind[0]).toBeGreaterThan(behind[1]);
    expect(behind[0]).toBeGreaterThan(behind[2]);
  });
});

describe('black-body row', () => {
  it('matches the direct photometric integral over six decades of luminance', () => {
    for (const temperature of [900, 1200, 2042, 2856, 4100, 5772, 12000, 1e5, 2e6]) {
      const direct = blackbodyLuminance(temperature) / REFERENCE_LUMINANCE_CD_M2;
      expect(blackbodyLuminanceUnits(atlas, temperature) / direct).toBeCloseTo(1, 2);
    }
  });

  it('is neutral at the white-balance temperature, red below and blue above', () => {
    const neutral = blackbodyRadiance(atlas, SCENARIO.camera.whiteBalanceK);
    const y = relativeLuminance(neutral);
    neutral.forEach((v) => expect(v / y).toBeCloseTo(1, 2));
    const cool = blackbodyRadiance(atlas, 1500);
    expect(cool[0]).toBeGreaterThan(cool[2] * 5);
    const hot = blackbodyRadiance(atlas, 30000);
    expect(hot[2]).toBeGreaterThan(hot[0]);
  });

  it('is dark at ambient temperature', () => {
    expect(blackbodyLuminanceUnits(atlas, SCENARIO.environment.temperatureK)).toBeLessThan(1e-20);
  });
});

describe('thermal glow of the environment', () => {
  const emissivity = SCENARIO.environment.surfaceEmissivity;
  const ambient = SCENARIO.environment.temperatureK;
  const thermal = (doppler: number) => emissivity * blackbodyLuminance(ambient * doppler);

  it('overtakes a street-lit white surface at D ≈ 3.6 — reached dead ahead at γ ≈ 2', () => {
    const crossover = solveLogBisection((d) => thermal(d) - REFERENCE_LUMINANCE_CD_M2 * reflectedGain(atlas, 'led', 1), 1.5, 20);
    expect(crossover).toBeGreaterThan(3.4);
    expect(crossover).toBeLessThan(3.8);
  });

  it('overtakes white paper in direct sunlight at D ≈ 8', () => {
    const sunlitWhite = (doppler: number) => SOLAR_DILUTION_AT_1AU * blackbodyLuminance(NOMINAL_SOLAR_TEMPERATURE_K * doppler);
    const crossover = solveLogBisection((d) => thermal(d) - sunlitWhite(d), 2, 40);
    expect(crossover).toBeGreaterThan(7);
    expect(crossover).toBeLessThan(9.5);
  });

  it('outshines the surface of the Sun dead ahead at β = 0.999', () => {
    const d0 = Math.sqrt(1.999 / 0.001);
    expect(blackbodyLuminance(ambient * d0)).toBeGreaterThan(blackbodyLuminance(NOMINAL_SOLAR_TEMPERATURE_K));
  });
});

describe('line emitters', () => {
  it('have unit luminance at rest', () => {
    for (const nm of [SCENARIO.signals.redNm, SCENARIO.signals.amberNm, SCENARIO.signals.greenNm]) {
      expect(relativeLuminance(lineRadiance(atlas, nm, 1))).toBeCloseTo(1, 6);
    }
  });

  it('a red traffic light looks green at about a fifth of the speed of light', () => {
    const beta = 0.2;
    const d0 = Math.sqrt((1 + beta) / (1 - beta));
    const rest = compressToGamut(lineRadiance(atlas, SCENARIO.signals.redNm, 1));
    expect(rest[0]).toBeGreaterThan(rest[1] * 3);
    const moving = compressToGamut(lineRadiance(atlas, SCENARIO.signals.redNm, d0));
    expect(moving[1]).toBeGreaterThan(moving[0]);
    expect(moving[1]).toBeGreaterThan(moving[2]);
    // and it is much brighter: D⁴ and a more sensitive part of V(λ)
    expect(relativeLuminance(moving)).toBeGreaterThan(3);
  });

  it('disappear once shifted out of the visible band', () => {
    expect(relativeLuminance(lineRadiance(atlas, SCENARIO.signals.redNm, 2))).toBeLessThan(1e-6);
    expect(relativeLuminance(lineRadiance(atlas, SCENARIO.signals.greenNm, 0.55))).toBeLessThan(1e-6);
  });

  it('stay gone however large the shift: the D⁴ of the radiance cannot bring them back', () => {
    // Beyond the tabulated range the lookup is clamped to the end of the row. If that
    // end held even a faint luminance, D⁴ would turn it into a bright light at the
    // top of the range (D⁴ = 4 × 10¹⁰), so the row has to end in exact darkness.
    const { redNm, amberNm, greenNm } = SCENARIO.signals;
    for (const nm of [redNm, amberNm, greenNm]) {
      for (const doppler of [3, 20, 100, headOnDopplerFactor(0.9999), headOnDopplerFactor(BETA_MAX)]) {
        expect(lineRadiance(atlas, nm, doppler)).toEqual([0, 0, 0]);
        expect(lineRadiance(atlas, nm, 1 / doppler)).toEqual([0, 0, 0]);
      }
    }
    // the two ends of the row lie further from the observer's limits than the cut-off of the line profile
    const reach = 6 * SCENARIO.signals.lineSigmaNm;
    expect(LINE_MIN_NM).toBeLessThan(380 - reach);
    expect(LINE_MAX_NM).toBeGreaterThan(780 + reach);
    expect(sampleAtlas(atlas, ATLAS_ROW.line, 0)).toEqual([0, 0, 0, LN_LUMINANCE_FLOOR]);
    expect(sampleAtlas(atlas, ATLAS_ROW.line, 1)).toEqual([0, 0, 0, LN_LUMINANCE_FLOOR]);
  });
});

describe('the Moon', () => {
  it('the disc that is drawn delivers the moonlight that lights the scene', () => {
    // E = L · π sin²R for a uniform disc of angular radius R facing the surface
    const radius = (SCENARIO.moon.angularRadiusDeg * Math.PI) / 180;
    expect(MOON_DISC_LUMINANCE_CD_M2 * Math.PI * Math.sin(radius) ** 2).toBeCloseTo(SCENARIO.moon.illuminanceLux, 12);
    // a few thousand cd/m², as quoted for the full Moon high in the sky
    expect(MOON_DISC_LUMINANCE_CD_M2).toBeGreaterThan(2000);
    expect(MOON_DISC_LUMINANCE_CD_M2).toBeLessThan(5000);
  });
});

describe('sampling', () => {
  it('clamps outside the tabulated range instead of reading neighbouring rows', () => {
    const below = sampleAtlas(atlas, ATLAS_ROW.moonRed, -5);
    const first = sampleAtlas(atlas, ATLAS_ROW.moonRed, 0.5 / ATLAS_WIDTH);
    expect(below).toEqual(first);
    const above = sampleAtlas(atlas, ATLAS_ROW.ledBlue, 9);
    const last = sampleAtlas(atlas, ATLAS_ROW.ledBlue, 1 - 0.5 / ATLAS_WIDTH);
    expect(above).toEqual(last);
    // D = 1 sits exactly on a texel centre
    expect(dopplerCoordinate(1) * ATLAS_WIDTH - 0.5).toBeCloseTo(REST_TEXEL, 9);
  });
});
