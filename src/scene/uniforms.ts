/**
 * Uniforms shared by every material of the scene, and the GPU copy of the
 * spectral atlas. All scene constants are taken from src/physics/scenario.ts.
 */

import * as THREE from 'three';
import { MOON_DISC_LUMINANCE_CD_M2, REFERENCE_LUMINANCE_CD_M2, SCENARIO } from '@/physics/scenario';
import {
  type SpectralAtlas,
  ATLAS_ROW,
  LINE_MAX_NM,
  LINE_MIN_NM,
  LN_DOPPLER_MAX,
  LN_DOPPLER_MIN,
  LN_TEMPERATURE_MAX,
  LN_TEMPERATURE_MIN,
  sampleAtlas,
  temperatureCoordinate,
} from '@/physics/spectralAtlas';
import {
  FADE_AHEAD_END,
  FADE_AHEAD_START,
  FADE_BEHIND_END,
  FADE_BEHIND_START,
  MODEL_BEHIND,
  MODEL_LENGTH,
  OBSERVER_Y,
} from './geometry/layout';
import { LUMINAIRE_FACE_LUMINANCE } from './geometry/lighting';

/** Exposure at rest: places a white surface under the reference street lighting just below display white. */
export const BASE_LN_EXPOSURE = Math.log(1.45);

// The observer's eye and the extent of the model are defined beside the layout, which the interface reads as well.
export { FADE_AHEAD_END, FADE_AHEAD_START, FADE_BEHIND_END, FADE_BEHIND_START, MODEL_BEHIND, MODEL_LENGTH, OBSERVER_Y };

/**
 * Uploads the atlas as a half-float RGBA texture. Half floats are filterable in
 * core WebGL 2 (32-bit floats need an extension that many mobile GPUs lack). Their
 * 11-bit significand costs little, but THREE.DataUtils.toHalfFloat (r169) truncates
 * instead of rounding, so the error is one unit in the last place, not half of one:
 * up to 9.4e-4 of the largest component of a colour, and up to 0.0156 in ln L where
 * |ln L| lies between 16 and 32 (1.6 % in luminance on the black-body row), towards
 * zero in ln L (src/scene/__tests__/gpu.test.ts reports the loss).
 */
export function createAtlasTexture(atlas: SpectralAtlas): THREE.DataTexture {
  const half = new Uint16Array(atlas.data.length);
  for (let i = 0; i < half.length; i++) half[i] = THREE.DataUtils.toHalfFloat(atlas.data[i]);
  const texture = new THREE.DataTexture(half, atlas.width, atlas.rows, THREE.RGBAFormat, THREE.HalfFloatType);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** A single black texel: what the sky reads as the stars' radiance when they are drawn over it instead. */
export function createNoStarsTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export type SceneUniforms = Record<string, THREE.IUniform>;

/** Unit vector towards the Moon: azimuth measured from the direction of travel (−z) towards +x. */
export function moonDirection(): THREE.Vector3 {
  const azimuth = THREE.MathUtils.degToRad(SCENARIO.moon.azimuthDeg);
  const elevation = THREE.MathUtils.degToRad(SCENARIO.moon.elevationDeg);
  return new THREE.Vector3(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    -Math.cos(azimuth) * Math.cos(elevation)
  );
}

export function createSceneUniforms(atlas: SpectralAtlas, texture: THREE.DataTexture): SceneUniforms {
  const blackbodyLn = (temperatureK: number): number =>
    sampleAtlas(atlas, ATLAS_ROW.blackbody, temperatureCoordinate(temperatureK))[3];
  const units = (luminanceCdM2: number): number => Math.log(luminanceCdM2 / REFERENCE_LUMINANCE_CD_M2);

  const { moon, interior, environment, street, signals, sky } = SCENARIO;

  return {
    // --- boost (updated every frame)
    uOnePlusBeta: { value: 1 },
    uOneMinusBeta: { value: 1 },
    uGamma: { value: 1 },
    uOptical: { value: 1 },
    uThermal: { value: 1 },
    uLnExposure: { value: BASE_LN_EXPOSURE },
    // --- atlas
    uAtlas: { value: texture },
    uAtlasAxis: {
      value: new THREE.Vector4(
        LN_DOPPLER_MIN,
        1 / (LN_DOPPLER_MAX - LN_DOPPLER_MIN),
        LN_TEMPERATURE_MIN,
        1 / (LN_TEMPERATURE_MAX - LN_TEMPERATURE_MIN)
      ),
    },
    uLineAxis: { value: new THREE.Vector2(LINE_MIN_NM, 1 / (LINE_MAX_NM - LINE_MIN_NM)) },
    // --- observer
    uObserver: { value: new THREE.Vector3(0, OBSERVER_Y, 0) },
    uEyeHeight: { value: OBSERVER_Y },
    uOdometer: { value: 0 },
    uGrid: { value: 0 },
    uFadeAhead: { value: new THREE.Vector2(FADE_AHEAD_START, FADE_AHEAD_END) },
    uFadeBehind: { value: new THREE.Vector2(FADE_BEHIND_START, FADE_BEHIND_END) },
    uCoverage: { value: 0 },
    // --- moonlight
    uMoonDirection: { value: moonDirection() },
    uMoonIrradiance: { value: moon.illuminanceLux / street.illuminanceLux },
    uSkyFill: { value: moon.skyFillFraction },
    uMoonRadius: { value: THREE.MathUtils.degToRad(moon.angularRadiusDeg) },
    uLnMoonT: { value: Math.log(moon.colourTemperatureK) },
    uLnMoonDisc: { value: units(MOON_DISC_LUMINANCE_CD_M2) - blackbodyLn(moon.colourTemperatureK) },
    // the disc's own thermal emission
    uLnMoonSurfaceT: { value: Math.log(moon.surfaceTemperatureK) },
    uLnMoonEmissivity: { value: Math.log(moon.surfaceEmissivity) },
    // --- thermal emission
    uLnAmbientT: { value: Math.log(environment.temperatureK) },
    uLnEmissivity: { value: Math.log(environment.surfaceEmissivity) },
    uLnSkyEmissivity: { value: Math.log(environment.skyEmissivity) },
    // --- emitters
    uLnWindowT: { value: Math.log(interior.colourTemperatureK) },
    uLnWindow: { value: units(interior.windowLuminanceCdM2) - blackbodyLn(interior.colourTemperatureK) },
    // the luminaire's face sends out exactly the light that the baked street lighting receives
    uLnLuminaire: { value: Math.log(LUMINAIRE_FACE_LUMINANCE) },
    uLnSignal: { value: units(signals.luminanceCdM2) },
    uSignalNm: { value: new THREE.Vector3(signals.redNm, signals.amberNm, signals.greenNm) },
    // --- night sky: light pollution at the zenith and the extra near the horizon, reference units
    uSkyGlow: { value: new THREE.Vector2(sky.glowZenith, sky.glowHorizon) },
    // --- stars (updated every frame)
    uPointSize: { value: 3 },
    uLnStarNorm: { value: 0 },
    // their summed radiance per pixel, read by the sky; black until the renderer provides a target (shaders/stars.ts)
    uStars: { value: createNoStarsTexture() },
    uStarsTexel: { value: new THREE.Vector2(1, 1) },
  };
}
