/**
 * The spectral atlas: pre-integrated colour and brightness of every kind of light
 * source in the scene as a function of the Doppler factor.
 *
 * Physics. If a source has rest-frame spectral radiance S(λ), an observer who sees
 * it with Doppler factor D receives S′(λ′) = D⁵·S(D·λ′) (optics.ts). The colour a
 * camera records is the integral of S′ against the CIE colour-matching functions.
 * That integral depends on D alone, so it is tabulated once on the CPU and looked
 * up per pixel — the shaders contain no fitted colour ramps, only these tables.
 *
 * Layout. One RGBA row per source class, `ATLAS_WIDTH` texels wide:
 *
 *   rows 0–2  surface lit by the Moon (Planck 4100 K), per albedo channel R, G, B   index: ln D
 *   rows 3–5  surface lit by the street LEDs,          per albedo channel R, G, B   index: ln D
 *   row  6    black body                                                           index: ln T
 *   row  7    monochromatic line                                                   index: λ′
 *
 * RGB holds the colour in linear camera RGB, normalised to unit luminance (signed:
 * out-of-gamut lobes are kept until all light has been summed). A holds the natural
 * logarithm of the luminance, so that five decades of brightness interpolate
 * accurately: linear interpolation of ln L in ln D is exact for power laws and
 * within 0.3 % for the Wien tail at the chosen resolution.
 */

import { photopicEfficiency } from './cie1931';
import {
  type Mat3,
  type Triple,
  D65_XYZ,
  LUMINANCE_WEIGHTS,
  XYZ_TO_SRGB,
  apply,
  bradfordAdaptation,
  invert,
  multiply,
} from './colorimetry';
import { LUMINOUS_EFFICACY_KCD } from './constants';
import {
  SPECTRAL_SAMPLES,
  SPECTRAL_STEP_NM,
  blackbodyTristimulus,
  planckRadiancePerNm,
  sampleWavelength,
  tristimulus,
} from './radiometry';
import { REFERENCE_LUMINANCE_CD_M2, SCENARIO } from './scenario';
import { ledSpectrum, reflectanceBasis } from './spectra';

export const ATLAS_WIDTH = 512;
export const ATLAS_ROWS = 8;

export const ATLAS_ROW = {
  moonRed: 0,
  moonGreen: 1,
  moonBlue: 2,
  ledRed: 3,
  ledGreen: 4,
  ledBlue: 5,
  blackbody: 6,
  line: 7,
} as const;

/** Width of one texel of the Doppler axis in ln D. */
const DOPPLER_TEXEL = (2 * Math.log(512)) / ATLAS_WIDTH;

/** Texel whose centre is exactly D = 1, so that the rest view involves no interpolation at all. */
export const REST_TEXEL = ATLAS_WIDTH / 2;

/**
 * Range of the Doppler axis: D from ≈ 1/512 to ≈ 512, which covers β up to
 * 0.999 992 (γ ≈ 256). Shifted by half a texel so that a texel centre falls on D = 1.
 */
export const LN_DOPPLER_MIN = -(REST_TEXEL + 0.5) * DOPPLER_TEXEL;
export const LN_DOPPLER_MAX = LN_DOPPLER_MIN + ATLAS_WIDTH * DOPPLER_TEXEL;

/** Range of the temperature axis of the black-body row, K. */
export const LN_TEMPERATURE_MIN = Math.log(60);
export const LN_TEMPERATURE_MAX = Math.log(2.4e7);

/**
 * Range of the wavelength axis of the line row, nm. Lookups beyond it are clamped to
 * its ends, so both ends must lie in complete darkness: further from the limits of
 * the observer (380 and 780 nm) than the six standard deviations at which the line
 * profile is cut off, or a line shifted far out of the visible band would return
 * with the faint luminance of the last texel, multiplied by D⁴.
 */
export const LINE_MIN_NM = 320;
export const LINE_MAX_NM = 840;

/** Floor of the log-luminance channel; e^−70 is zero for every purpose here. */
export const LN_LUMINANCE_FLOOR = -70;

export interface SpectralAtlas {
  readonly width: number;
  readonly rows: number;
  /** RGBA float data, row-major, `rows × width × 4` values. */
  readonly data: Float32Array;
  /** XYZ → linear camera RGB, including the fixed white balance. */
  readonly cameraMatrix: Mat3;
  /** Albedo RGB → coefficients of the reflectance basis (calibrated so that β = 0 reproduces the authored colour). */
  readonly albedoToBasis: Mat3;
}

/** XYZ → linear camera RGB with the scenario's fixed white balance (Bradford adaptation to D65). */
export function cameraMatrix(whiteBalanceK: number = SCENARIO.camera.whiteBalanceK): Mat3 {
  const white = blackbodyTristimulus(whiteBalanceK);
  const normalised: Triple = [white[0] / white[1], 1, white[2] / white[1]];
  return multiply(XYZ_TO_SRGB, bradfordAdaptation(normalised, D65_XYZ));
}

function luminanceOf(rgb: Triple): number {
  return LUMINANCE_WEIGHTS[0] * rgb[0] + LUMINANCE_WEIGHTS[1] * rgb[1] + LUMINANCE_WEIGHTS[2] * rgb[2];
}

/** Doppler factor at texel centre i of the Doppler axis. */
export function atlasDoppler(index: number): number {
  return Math.exp(LN_DOPPLER_MIN + ((index + 0.5) / ATLAS_WIDTH) * (LN_DOPPLER_MAX - LN_DOPPLER_MIN));
}

/** Texture coordinate u ∈ [0, 1] of a Doppler factor on rows 0–5. */
export function dopplerCoordinate(doppler: number): number {
  return (Math.log(doppler) - LN_DOPPLER_MIN) / (LN_DOPPLER_MAX - LN_DOPPLER_MIN);
}

/** Texture coordinate of a temperature on the black-body row. */
export function temperatureCoordinate(temperatureK: number): number {
  return (Math.log(temperatureK) - LN_TEMPERATURE_MIN) / (LN_TEMPERATURE_MAX - LN_TEMPERATURE_MIN);
}

/** Texture coordinate of an observed wavelength on the line row. */
export function lineCoordinate(wavelengthNm: number): number {
  return (wavelengthNm - LINE_MIN_NM) / (LINE_MAX_NM - LINE_MIN_NM);
}

interface ReflectedRows {
  /** camera RGB of the three basis functions, each `width × 3`, not yet normalised */
  readonly basis: [Float64Array, Float64Array, Float64Array];
  /** photometric luminance (CIE Y) of a white reflector, per texel */
  readonly whiteY: Float64Array;
}

/**
 * Integrates ∫ CMF(λ′) · D⁵ · ρ_k(Dλ′) · E(Dλ′) dλ′ for the three basis reflectances
 * ρ_k under the illuminant E, at every Doppler factor of the axis.
 */
function integrateReflected(illuminant: (wavelengthNm: number) => number, camera: Mat3): ReflectedRows {
  const basis: [Float64Array, Float64Array, Float64Array] = [
    new Float64Array(ATLAS_WIDTH * 3),
    new Float64Array(ATLAS_WIDTH * 3),
    new Float64Array(ATLAS_WIDTH * 3),
  ];
  const whiteY = new Float64Array(ATLAS_WIDTH);
  const rho = [0, 0, 0];
  const spectrum = new Float64Array(SPECTRAL_SAMPLES);
  const weights = [new Float64Array(SPECTRAL_SAMPLES), new Float64Array(SPECTRAL_SAMPLES), new Float64Array(SPECTRAL_SAMPLES)];

  for (let i = 0; i < ATLAS_WIDTH; i++) {
    const doppler = atlasDoppler(i);
    const d5 = doppler ** 5;
    for (let s = 0; s < SPECTRAL_SAMPLES; s++) {
      const emitted = doppler * sampleWavelength(s);
      spectrum[s] = d5 * illuminant(emitted);
      reflectanceBasis(emitted, rho);
      weights[0][s] = rho[0];
      weights[1][s] = rho[1];
      weights[2][s] = rho[2];
    }
    let total = 0;
    for (let k = 0; k < 3; k++) {
      const w = weights[k];
      const xyz = tristimulus((nm) => {
        const s = Math.round((nm - sampleWavelength(0)) / SPECTRAL_STEP_NM);
        return spectrum[s] * w[s];
      });
      total += xyz[1];
      const rgb = apply(camera, xyz);
      basis[k][i * 3] = rgb[0];
      basis[k][i * 3 + 1] = rgb[1];
      basis[k][i * 3 + 2] = rgb[2];
    }
    whiteY[i] = total;
  }
  return { basis, whiteY };
}

/**
 * Builds the complete atlas. Pure and deterministic; takes a few tens of
 * milliseconds, so it runs once at start-up.
 */
export function buildSpectralAtlas(): SpectralAtlas {
  const camera = cameraMatrix();
  const data = new Float32Array(ATLAS_ROWS * ATLAS_WIDTH * 4);

  const moonTemperature = SCENARIO.moon.colourTemperatureK;
  const moon = integrateReflected((nm) => planckRadiancePerNm(nm, moonTemperature), camera);
  const led = integrateReflected(ledSpectrum, camera);

  // --- calibration: at D = 1 under the white-balance illuminant an albedo must render as itself.
  const restColumns: Triple[] = [0, 1, 2].map((k) => [
    moon.basis[k][REST_TEXEL * 3],
    moon.basis[k][REST_TEXEL * 3 + 1],
    moon.basis[k][REST_TEXEL * 3 + 2],
  ]);
  const restWhite: Triple = [
    restColumns[0][0] + restColumns[1][0] + restColumns[2][0],
    restColumns[0][1] + restColumns[1][1] + restColumns[2][1],
    restColumns[0][2] + restColumns[1][2] + restColumns[2][2],
  ];
  const restWhiteLuminance = luminanceOf(restWhite);
  const basisAtRest: Mat3 = [
    restColumns[0][0] / restWhiteLuminance,
    restColumns[1][0] / restWhiteLuminance,
    restColumns[2][0] / restWhiteLuminance,
    restColumns[0][1] / restWhiteLuminance,
    restColumns[1][1] / restWhiteLuminance,
    restColumns[2][1] / restWhiteLuminance,
    restColumns[0][2] / restWhiteLuminance,
    restColumns[1][2] / restWhiteLuminance,
    restColumns[2][2] / restWhiteLuminance,
  ];
  // One reflectance spectrum per surface, whatever lights it: the same matrix serves both illuminants.
  const albedoToBasis = invert(basisAtRest);

  const writeReflected = (rows: ReflectedRows, firstRow: number): void => {
    const restY = rows.whiteY[REST_TEXEL];
    for (let i = 0; i < ATLAS_WIDTH; i++) {
      // camera-space luminance of white at this D normalises the colour part
      const white: Triple = [
        rows.basis[0][i * 3] + rows.basis[1][i * 3] + rows.basis[2][i * 3],
        rows.basis[0][i * 3 + 1] + rows.basis[1][i * 3 + 1] + rows.basis[2][i * 3 + 1],
        rows.basis[0][i * 3 + 2] + rows.basis[1][i * 3 + 2] + rows.basis[2][i * 3 + 2],
      ];
      const cameraY = luminanceOf(white);
      const visible = cameraY > 1e-250 && rows.whiteY[i] > 1e-250;
      const lnGain = visible ? Math.max(LN_LUMINANCE_FLOOR, Math.log(rows.whiteY[i] / restY)) : LN_LUMINANCE_FLOOR;
      for (let channel = 0; channel < 3; channel++) {
        // colour of the surface whose albedo is the pure primary `channel`
        let r = 0;
        let g = 0;
        let b = 0;
        if (visible) {
          for (let k = 0; k < 3; k++) {
            const coefficient = albedoToBasis[k * 3 + channel];
            r += coefficient * rows.basis[k][i * 3];
            g += coefficient * rows.basis[k][i * 3 + 1];
            b += coefficient * rows.basis[k][i * 3 + 2];
          }
          r /= cameraY;
          g /= cameraY;
          b /= cameraY;
        }
        const offset = ((firstRow + channel) * ATLAS_WIDTH + i) * 4;
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = lnGain;
      }
    }
  };
  writeReflected(moon, ATLAS_ROW.moonRed);
  writeReflected(led, ATLAS_ROW.ledRed);

  // --- black body, indexed by ln T; luminance in units of the reference luminance
  for (let i = 0; i < ATLAS_WIDTH; i++) {
    const temperature = Math.exp(LN_TEMPERATURE_MIN + ((i + 0.5) / ATLAS_WIDTH) * (LN_TEMPERATURE_MAX - LN_TEMPERATURE_MIN));
    const xyz = blackbodyTristimulus(temperature);
    const rgb = apply(camera, xyz);
    const cameraY = luminanceOf(rgb);
    const offset = (ATLAS_ROW.blackbody * ATLAS_WIDTH + i) * 4;
    if (cameraY > 1e-250 && xyz[1] > 1e-250) {
      data[offset] = rgb[0] / cameraY;
      data[offset + 1] = rgb[1] / cameraY;
      data[offset + 2] = rgb[2] / cameraY;
      data[offset + 3] = Math.max(LN_LUMINANCE_FLOOR, Math.log((LUMINOUS_EFFICACY_KCD * xyz[1]) / REFERENCE_LUMINANCE_CD_M2));
    } else {
      // far too cold to emit visible light: deepest red of the locus, zero brightness
      data[offset] = 1;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = LN_LUMINANCE_FLOOR;
    }
  }

  // --- monochromatic line of Gaussian profile, indexed by observed wavelength
  const sigma = SCENARIO.signals.lineSigmaNm;
  for (let i = 0; i < ATLAS_WIDTH; i++) {
    const centre = LINE_MIN_NM + ((i + 0.5) / ATLAS_WIDTH) * (LINE_MAX_NM - LINE_MIN_NM);
    const xyz = tristimulus((nm) => {
      const d = (nm - centre) / sigma;
      return d > 6 || d < -6 ? 0 : Math.exp(-0.5 * d * d) / (sigma * Math.sqrt(2 * Math.PI));
    });
    const rgb = apply(camera, xyz);
    const cameraY = luminanceOf(rgb);
    const offset = (ATLAS_ROW.line * ATLAS_WIDTH + i) * 4;
    if (cameraY > 1e-12 && xyz[1] > 1e-12) {
      data[offset] = rgb[0] / cameraY;
      data[offset + 1] = rgb[1] / cameraY;
      data[offset + 2] = rgb[2] / cameraY;
      data[offset + 3] = Math.max(LN_LUMINANCE_FLOOR, Math.log(xyz[1]));
    } else {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = LN_LUMINANCE_FLOOR;
    }
  }

  return { width: ATLAS_WIDTH, rows: ATLAS_ROWS, data, cameraMatrix: camera, albedoToBasis };
}

// ---------------------------------------------------------------------------
// CPU sampling — the same arithmetic the GPU performs
// ---------------------------------------------------------------------------

/** Bilinear sample of one row at texture coordinate u (clamp-to-edge), as the GPU does it. */
export function sampleAtlas(atlas: SpectralAtlas, row: number, u: number): [number, number, number, number] {
  const x = Math.min(atlas.width - 1, Math.max(0, u * atlas.width - 0.5));
  const lower = Math.min(atlas.width - 2, Math.floor(x));
  const t = x - lower;
  const a = (row * atlas.width + lower) * 4;
  const b = a + 4;
  const d = atlas.data;
  return [
    d[a] * (1 - t) + d[b] * t,
    d[a + 1] * (1 - t) + d[b + 1] * t,
    d[a + 2] * (1 - t) + d[b + 2] * t,
    d[a + 3] * (1 - t) + d[b + 3] * t,
  ];
}

export type Illuminant = 'moon' | 'led';

/**
 * Radiance (linear camera RGB, reference units) reflected by a surface of the given
 * albedo that receives unit irradiance of the given illuminant, seen at Doppler
 * factor D. At D = 1 under the Moon this returns the albedo itself.
 */
export function reflectedRadiance(atlas: SpectralAtlas, illuminant: Illuminant, albedo: Triple, doppler: number): Triple {
  const first = illuminant === 'moon' ? ATLAS_ROW.moonRed : ATLAS_ROW.ledRed;
  const u = dopplerCoordinate(doppler);
  const r = sampleAtlas(atlas, first, u);
  const g = sampleAtlas(atlas, first + 1, u);
  const b = sampleAtlas(atlas, first + 2, u);
  const gain = Math.exp(r[3]);
  return [
    gain * (albedo[0] * r[0] + albedo[1] * g[0] + albedo[2] * b[0]),
    gain * (albedo[0] * r[1] + albedo[1] * g[1] + albedo[2] * b[1]),
    gain * (albedo[0] * r[2] + albedo[1] * g[2] + albedo[2] * b[2]),
  ];
}

/** Luminance gain of a white surface under the given illuminant at Doppler factor D (1 at D = 1). */
export function reflectedGain(atlas: SpectralAtlas, illuminant: Illuminant, doppler: number): number {
  const first = illuminant === 'moon' ? ATLAS_ROW.moonRed : ATLAS_ROW.ledRed;
  return Math.exp(sampleAtlas(atlas, first, dopplerCoordinate(doppler))[3]);
}

/** Radiance of a black body of the given temperature (linear camera RGB, reference units). */
export function blackbodyRadiance(atlas: SpectralAtlas, temperatureK: number): Triple {
  const s = sampleAtlas(atlas, ATLAS_ROW.blackbody, temperatureCoordinate(temperatureK));
  const luminance = Math.exp(s[3]);
  return [s[0] * luminance, s[1] * luminance, s[2] * luminance];
}

/** Luminance of a black body in reference units, from the atlas. */
export function blackbodyLuminanceUnits(atlas: SpectralAtlas, temperatureK: number): number {
  return Math.exp(sampleAtlas(atlas, ATLAS_ROW.blackbody, temperatureCoordinate(temperatureK))[3]);
}

/**
 * Radiance of a quasi-monochromatic emitter of rest wavelength λ₀ and unit rest
 * luminance, seen at Doppler factor D: the line moves to λ₀/D, its integrated
 * radiance grows as D⁴ and its luminance additionally follows V(λ₀/D)/V(λ₀).
 */
export function lineRadiance(atlas: SpectralAtlas, restWavelengthNm: number, doppler: number): Triple {
  const observed = sampleAtlas(atlas, ATLAS_ROW.line, lineCoordinate(restWavelengthNm / doppler));
  const rest = sampleAtlas(atlas, ATLAS_ROW.line, lineCoordinate(restWavelengthNm));
  const luminance = Math.exp(4 * Math.log(doppler) + observed[3] - rest[3]);
  return [observed[0] * luminance, observed[1] * luminance, observed[2] * luminance];
}

/** Photopic efficiency of the wavelength a line of rest wavelength λ₀ is shifted to. */
export function shiftedLineEfficiency(restWavelengthNm: number, doppler: number): number {
  return photopicEfficiency(restWavelengthNm / doppler);
}

let shared: SpectralAtlas | null = null;

/** The atlas, built on first use and shared by everything that runs on the CPU (instruments, figures, the exposure meter). */
export function sharedAtlas(): SpectralAtlas {
  if (!shared) shared = buildSpectralAtlas();
  return shared;
}
