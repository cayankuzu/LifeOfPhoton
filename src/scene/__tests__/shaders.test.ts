/**
 * The shaders cannot be compiled without a graphics context, but a good part of
 * what can go wrong between GLSL and TypeScript is checkable as text: a uniform
 * that is declared but never supplied (it would silently read as zero), a uniform
 * that is supplied but never used, a varying whose two declarations disagree, an
 * attribute the geometry does not provide.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { REFERENCE_LUMINANCE_CD_M2, SCENARIO } from '@/physics/scenario';
import { ATLAS_ROWS, ATLAS_WIDTH, sharedAtlas } from '@/physics/spectralAtlas';
import { EMITTER } from '../emitters';
import { LUMINAIRE_FACE_LUMINANCE } from '../geometry/lighting';
import { cityFragmentShader, cityVertexShader } from '../shaders/city';
import { skyFragmentShader, skyVertexShader } from '../shaders/sky';
import { starFragmentShader, starVertexShader } from '../shaders/stars';
import {
  FADE_AHEAD_END,
  FADE_AHEAD_START,
  FADE_BEHIND_END,
  FADE_BEHIND_START,
  MODEL_BEHIND,
  MODEL_LENGTH,
  OBSERVER_Y,
  createAtlasTexture,
  createSceneUniforms,
  moonDirection,
} from '../uniforms';

const PROGRAMS = {
  city: { vertex: cityVertexShader, fragment: cityFragmentShader },
  sky: { vertex: skyVertexShader, fragment: skyFragmentShader },
  stars: { vertex: starVertexShader, fragment: starFragmentShader },
} as const;

/** Uniforms, attributes and varyings three.js declares itself for a ShaderMaterial. */
const BUILT_IN = new Set(['projectionMatrix', 'viewMatrix', 'modelMatrix', 'position', 'normal']);

const withoutComments = (source: string): string => source.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** Declarations `<qualifier> <type> <name>;` of a shader, as name → type. */
function declarations(source: string, qualifier: 'uniform' | 'attribute' | 'varying'): Map<string, string> {
  const found = new Map<string, string>();
  const pattern = new RegExp(`\\b${qualifier}\\s+(\\w+)\\s+(\\w+)\\s*;`, 'g');
  for (const match of withoutComments(source).matchAll(pattern)) found.set(match[2], match[1]);
  return found;
}

/** How often an identifier occurs in a shader, outside comments. */
function occurrences(source: string, name: string): number {
  return [...withoutComments(source).matchAll(new RegExp(`\\b${name}\\b`, 'g'))].length;
}

function glslTypeOf(value: unknown): string {
  if (typeof value === 'number') return 'float';
  if (value instanceof THREE.Vector2) return 'vec2';
  if (value instanceof THREE.Vector3) return 'vec3';
  if (value instanceof THREE.Vector4) return 'vec4';
  if (value instanceof THREE.Texture) return 'sampler2D';
  return 'unknown';
}

const atlas = sharedAtlas();
const texture = createAtlasTexture(atlas);
const uniforms = createSceneUniforms(atlas, texture);

describe('shader sources', () => {
  it('are complete programs: templates expanded, brackets balanced, one main each', () => {
    for (const [name, program] of Object.entries(PROGRAMS)) {
      for (const [stage, source] of Object.entries(program)) {
        const label = `${name} ${stage}`;
        expect(source.includes('${'), label).toBe(false);
        expect(source.includes('undefined'), label).toBe(false);
        expect(source.includes('NaN'), label).toBe(false);
        const code = withoutComments(source);
        for (const [open, close] of [
          ['{', '}'],
          ['(', ')'],
          ['[', ']'],
        ]) {
          expect(code.split(open).length, `${label}: ${open}${close}`).toBe(code.split(close).length);
        }
        expect([...code.matchAll(/\bvoid\s+main\s*\(\s*\)/g)].length, label).toBe(1);
      }
    }
  });

  it('every uniform a shader declares is supplied, with the right type', () => {
    for (const [name, program] of Object.entries(PROGRAMS)) {
      for (const [stage, source] of Object.entries(program)) {
        for (const [uniform, type] of declarations(source, 'uniform')) {
          if (BUILT_IN.has(uniform)) continue;
          expect(uniforms[uniform], `${name} ${stage}: ${uniform}`).toBeDefined();
          expect(glslTypeOf(uniforms[uniform].value), `${name} ${stage}: ${uniform}`).toBe(type);
        }
      }
    }
  });

  it('every uniform that is declared or supplied is read by some shader', () => {
    // The common block is declared in every stage and each stage reads a part of it,
    // so "used" means: read somewhere, by some stage of some program.
    const declared = new Set<string>();
    const used = new Set<string>();
    for (const program of Object.values(PROGRAMS)) {
      for (const source of Object.values(program)) {
        for (const uniform of declarations(source, 'uniform').keys()) {
          declared.add(uniform);
          // once for the declaration, more often when it is read
          if (occurrences(source, uniform) > 1) used.add(uniform);
        }
      }
    }
    for (const uniform of declared) expect(used.has(uniform), `${uniform} is declared but never read`).toBe(true);
    for (const uniform of Object.keys(uniforms)) expect(used.has(uniform), `${uniform} is supplied but never read`).toBe(true);
  });

  it('varyings are declared identically in both stages, written in the vertex stage and read in the fragment stage', () => {
    for (const [name, program] of Object.entries(PROGRAMS)) {
      const out = declarations(program.vertex, 'varying');
      const into = declarations(program.fragment, 'varying');
      expect([...out.entries()].sort(), name).toEqual([...into.entries()].sort());
      for (const varying of out.keys()) {
        expect(
          new RegExp(`\\b${varying}\\s*=`).test(withoutComments(program.vertex)),
          `${name}: ${varying} is never written`
        ).toBe(true);
        expect(occurrences(program.fragment, varying), `${name}: ${varying} is never read`).toBeGreaterThan(1);
      }
    }
  });

  it('the attributes the shaders read are the ones the geometry provides', () => {
    // the block builder writes position, normal, color, aSurface (build.test.ts); the star field position, aStar
    expect([...declarations(cityVertexShader, 'attribute').keys()].sort()).toEqual(['aSurface', 'color']);
    expect([...declarations(starVertexShader, 'attribute').keys()]).toEqual(['aStar']);
    expect(declarations(skyVertexShader, 'attribute').size).toBe(0);
  });

  it('the sky is a function of direction only: no blocks, cells or random heights are generated in it', () => {
    // Buildings are models. A procedural skyline would need a hash and a floor() to
    // cut the horizon into blocks; neither may come back into the sky's main function.
    const code = withoutComments(skyFragmentShader);
    const main = code.slice(code.search(/\bvoid\s+main\b/));
    expect(/\bhash\w*\s*\(/.test(main)).toBe(false);
    expect(/\bfloor\s*\(/.test(main)).toBe(false);
    expect(/\batan\s*\(/.test(main)).toBe(false);
  });

  it('emitter codes are compared half-way between the integers the geometry stores', () => {
    const code = withoutComments(cityFragmentShader);
    const thresholds = [...code.matchAll(/\bcode\s*[<>]\s*(\d+\.\d+)/g)].map((match) => Number(match[1]));
    expect(thresholds).toEqual([
      EMITTER.none + 0.5,
      EMITTER.window + 0.5,
      EMITTER.luminaire + 0.5,
      EMITTER.signalRed + 0.5,
      EMITTER.signalAmber + 0.5,
    ]);
    // the codes themselves are consecutive, so every comparison separates exactly two of them
    expect(Object.values(EMITTER)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('scene uniforms', () => {
  it('the atlas texture has the layout the shaders sample: half floats, linear filter, clamped', () => {
    expect(texture.image.width).toBe(ATLAS_WIDTH);
    expect(texture.image.height).toBe(ATLAS_ROWS);
    expect(texture.type).toBe(THREE.HalfFloatType);
    expect(texture.format).toBe(THREE.RGBAFormat);
    expect(texture.magFilter).toBe(THREE.LinearFilter);
    expect(texture.minFilter).toBe(THREE.LinearFilter);
    expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(texture.generateMipmaps).toBe(false);
    // half floats reproduce the atlas to their 11-bit mantissa
    const half: ArrayLike<number> = texture.image.data;
    expect(texture.image.data).toBeInstanceOf(Uint16Array);
    let worst = 0;
    for (let i = 0; i < atlas.data.length; i += 97) {
      const stored = THREE.DataUtils.fromHalfFloat(half[i]);
      worst = Math.max(worst, Math.abs(stored - atlas.data[i]) / Math.max(1, Math.abs(atlas.data[i])));
    }
    expect(worst).toBeLessThan(1e-3);
  });

  it('start at rest: β = 0, γ = 1, both layers on', () => {
    expect(uniforms.uOnePlusBeta.value).toBe(1);
    expect(uniforms.uOneMinusBeta.value).toBe(1);
    expect(uniforms.uGamma.value).toBe(1);
    expect(uniforms.uOptical.value).toBe(1);
    expect(uniforms.uThermal.value).toBe(1);
  });

  it('place the observer at eye height above the driving surface', () => {
    expect((uniforms.uObserver.value as THREE.Vector3).toArray()).toEqual([0, OBSERVER_Y, 0]);
    expect(OBSERVER_Y).toBeGreaterThan(SCENARIO.camera.eyeHeight);
    expect(OBSERVER_Y).toBeLessThan(SCENARIO.camera.eyeHeight + 0.3);
  });

  it('carry the scenario’s light sources in the units of the renderer', () => {
    const { moon, street, environment, interior, signals } = SCENARIO;
    expect(uniforms.uMoonIrradiance.value).toBeCloseTo(moon.illuminanceLux / street.illuminanceLux, 12);
    expect(Math.exp(uniforms.uLnMoonT.value as number)).toBeCloseTo(moon.colourTemperatureK, 6);
    expect(Math.exp(uniforms.uLnAmbientT.value as number)).toBeCloseTo(environment.temperatureK, 6);
    expect(Math.exp(uniforms.uLnEmissivity.value as number)).toBeCloseTo(environment.surfaceEmissivity, 12);
    expect(Math.exp(uniforms.uLnSkyEmissivity.value as number)).toBeCloseTo(environment.skyEmissivity, 12);
    expect(Math.exp(uniforms.uLnWindowT.value as number)).toBeCloseTo(interior.colourTemperatureK, 6);
    expect(Math.exp(uniforms.uLnSignal.value as number) * REFERENCE_LUMINANCE_CD_M2).toBeCloseTo(signals.luminanceCdM2, 6);
    expect((uniforms.uSignalNm.value as THREE.Vector3).toArray()).toEqual([signals.redNm, signals.amberNm, signals.greenNm]);
    // the luminaire's face sends out what the baked street lighting receives
    expect(Math.exp(uniforms.uLnLuminaire.value as number)).toBeCloseTo(LUMINAIRE_FACE_LUMINANCE, 9);
    expect(uniforms.uMoonRadius.value).toBeCloseTo((moon.angularRadiusDeg * Math.PI) / 180, 12);
  });

  it('point at the Moon where the scenario puts it', () => {
    const direction = moonDirection();
    expect(direction.length()).toBeCloseTo(1, 12);
    expect((Math.asin(direction.y) * 180) / Math.PI).toBeCloseTo(SCENARIO.moon.elevationDeg, 9);
    // azimuth from the direction of travel (−z) towards +x
    expect((Math.atan2(direction.x, -direction.z) * 180) / Math.PI).toBeCloseTo(SCENARIO.moon.azimuthDeg, 9);
    expect((uniforms.uMoonDirection.value as THREE.Vector3).equals(direction)).toBe(true);
  });

  it('dissolve the model inside its own extent, ahead and behind', () => {
    expect(FADE_AHEAD_START).toBeLessThan(FADE_AHEAD_END);
    expect(FADE_BEHIND_START).toBeLessThan(FADE_BEHIND_END);
    // the model reaches from MODEL_BEHIND behind the observer over MODEL_LENGTH; a block is recycled when it leaves
    expect(FADE_BEHIND_END).toBeLessThan(MODEL_BEHIND);
    expect(FADE_AHEAD_END).toBeLessThan(MODEL_LENGTH - MODEL_BEHIND);
    expect((uniforms.uFadeAhead.value as THREE.Vector2).toArray()).toEqual([FADE_AHEAD_START, FADE_AHEAD_END]);
    expect((uniforms.uFadeBehind.value as THREE.Vector2).toArray()).toEqual([FADE_BEHIND_START, FADE_BEHIND_END]);
  });
});
