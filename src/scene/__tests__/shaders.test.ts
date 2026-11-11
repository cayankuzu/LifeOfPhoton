/**
 * The shaders cannot be compiled without a graphics context, but a good part of
 * what can go wrong between GLSL and TypeScript is checkable as text: a uniform
 * that is declared but never supplied (it would silently read as zero), a uniform
 * that is supplied but never used, a varying whose two declarations disagree, an
 * attribute the geometry does not provide.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Triple } from '@/physics/colorimetry';
import { toDisplay } from '@/physics/display';
import { REFERENCE_LUMINANCE_CD_M2, SCENARIO } from '@/physics/scenario';
import { ATLAS_ROW, ATLAS_ROWS, ATLAS_WIDTH, blackbodyLuminanceUnits, sharedAtlas } from '@/physics/spectralAtlas';
import { EMITTER } from '../emitters';
import { LUMINAIRE_FACE_LUMINANCE } from '../geometry/lighting';
import { cityFragmentShader, cityVertexShader } from '../shaders/city';
import { skyFragmentShader, skyVertexShader } from '../shaders/sky';
import {
  STAR_LN_PEAK_MAX,
  STAR_RADIANCE_SCALE,
  starFragmentShader,
  starRadianceFragmentShader,
  starRadianceVertexShader,
  starVertexShader,
} from '../shaders/stars';
import { STAR_PSF_CUTOFF, STAR_PSF_STEEPNESS } from '../geometry/stars';
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
  starRadiance: { vertex: starRadianceVertexShader, fragment: starRadianceFragmentShader },
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
    expect([...declarations(starRadianceVertexShader, 'attribute').keys()]).toEqual(['aStar']);
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

  it('the measured view is the map of optics.ts: measuredPoint forward, measuredDirectionInverse back', () => {
    // measuredPoint: (x, y, z/γ) at the rest distance for vertices, its direction for stars
    expect(withoutComments(cityVertexShader).includes('vec3 measured = vec3(rel.xy, rel.z / uGamma);')).toBe(true);
    for (const vertex of [starVertexShader, starRadianceVertexShader]) {
      expect(withoutComments(vertex).includes('vec3 measured = normalize(vec3(rest.xy, rest.z / uGamma));')).toBe(true);
    }
    // measuredDirectionInverse: the normalised (x, y, γ z) of the view direction
    expect(withoutComments(skyFragmentShader).includes('vec3 restMeasured = normalize(vec3(seen.xy, seen.z * uGamma));')).toBe(
      true
    );
  });

  it('the diffuse moonlight falls on a surface by the scenario’s orientation weighting', () => {
    const match = /uSkyFill \* \(([\d.]+) \+ ([\d.]+) \* n\.y\)/.exec(withoutComments(cityFragmentShader));
    expect(match).not.toBeNull();
    const [mean, slope] = [Number(match?.[1]), Number(match?.[2])];
    // all of it facing up, the scenario's share facing down
    expect(mean + slope).toBeCloseTo(1, 12);
    expect(mean - slope).toBeCloseTo(SCENARIO.moon.skyFillFacingDown, 12);
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
    expect(Math.exp(uniforms.uLnMoonSurfaceT.value as number)).toBeCloseTo(moon.surfaceTemperatureK, 6);
    expect(Math.exp(uniforms.uLnMoonEmissivity.value as number)).toBeCloseTo(moon.surfaceEmissivity, 12);
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

describe('stars', () => {
  it('are drawn with the flux law and normalisation of geometry/stars.ts', () => {
    // starLnFlux, starLnNormalisation (uLnStarNorm) and starLnOffAxis, term by term, in both ways of drawing them
    for (const vertex of [starVertexShader, starRadianceVertexShader]) {
      const code = withoutComments(vertex);
      expect(code.includes('float lnFlux = aStar.x + (body.a - aStar.z) - 2.0 * lnD;')).toBe(true);
      expect(code.includes('float cosAxis = -view.z / length(view.xyz);')).toBe(true);
      expect(code.includes('float lnRadiance = lnFlux + uLnStarNorm - 3.0 * log(max(cosAxis, 1e-3)) + uLnExposure;')).toBe(true);
      expect(code.includes(`vRadiance = body.rgb * exp(min(lnRadiance, ${STAR_LN_PEAK_MAX.toFixed(1)}));`)).toBe(true);
    }
    for (const fragment of [starFragmentShader, starRadianceFragmentShader]) {
      const code = withoutComments(fragment);
      expect(code.includes(`return exp(-${STAR_PSF_STEEPNESS.toFixed(1)} * dot(p, p));`)).toBe(true);
      expect(code.includes(`if (falloff < ${STAR_PSF_CUTOFF}) discard;`)).toBe(true);
    }
  });

  it('are summed in radiance and added to the sky before its display transform', () => {
    const stored = withoutComments(starRadianceFragmentShader);
    expect(stored.includes(`gl_FragColor = vec4(vRadiance * (falloff * ${STAR_RADIANCE_SCALE}), 1.0);`)).toBe(true);
    // nothing of the display transform in the target: it holds radiance
    expect(stored.includes('toDisplay')).toBe(false);
    const sky = withoutComments(skyFragmentShader);
    expect(sky.includes(`clamp(stored, vec3(-6.0e4), vec3(6.0e4)) * ${(1 / STAR_RADIANCE_SCALE).toFixed(1)}`)).toBe(true);
    const added = sky.indexOf('radiance += starRadiance();');
    expect(added).toBeGreaterThan(0);
    expect(sky.indexOf('gl_FragColor = vec4(toDisplay(radiance), 1.0);')).toBeGreaterThan(added);
    // the sky reads the target pixel by pixel
    expect(sky.includes('texture2D(uStars, gl_FragCoord.xy * uStarsTexel)')).toBe(true);
    expect(uniforms.uStars.value).toBeInstanceOf(THREE.Texture);
    expect((uniforms.uStars.value as THREE.DataTexture).image.data).toEqual(new Uint8Array(4));
  });

  it('cannot overflow the half floats of the target, and stay resolved at the dark end', () => {
    // the largest colour component of a unit-luminance black body anywhere in the atlas
    let largest = 0;
    for (let i = 0; i < ATLAS_WIDTH; i++) {
      for (let channel = 0; channel < 3; channel++) {
        largest = Math.max(largest, Math.abs(atlas.data[(ATLAS_ROW.blackbody * ATLAS_WIDTH + i) * 4 + channel]));
      }
    }
    const brightest = Math.exp(STAR_LN_PEAK_MAX) * largest * STAR_RADIANCE_SCALE;
    // ten of the brightest stars the shader can draw, in the most saturated colour of the atlas, still fit on one
    // pixel (measured: thirteen); beyond that the sky clamps what it reads
    expect(10 * brightest).toBeLessThan(65504);
    expect(65504 / brightest).toBeLessThan(14);
    // a star just visible on the display (about 1.4 × 10⁻³ in radiance) is stored above 2⁻²⁴ by a factor of 50 or more
    expect((1.4e-3 * STAR_RADIANCE_SCALE) / 2 ** -24).toBeGreaterThan(50);
  });
});

describe('stars over the sky, where the half-float target is not available', () => {
  it('the star shader writes the increment a star makes over the sky, not the star by itself', () => {
    const code = withoutComments(starFragmentShader);
    expect(code.includes('toDisplay(vSky + vRadiance * falloff) - toDisplay(vSky)')).toBe(true);
    // and the sky behind the star is the very function the sky shader draws
    expect(withoutComments(starVertexShader).includes('vSky = skyRadiance(')).toBe(true);
    expect(withoutComments(skyFragmentShader).includes('radiance += skyRadiance(')).toBe(true);
  });

  it('a star lost in the glow of the sky adds nothing; over a dark sky it shows in full', () => {
    // The display transform compresses highlights, so display values do not add. The
    // reference implementation of the transform shows what the shader's difference does.
    const increment = (sky: Triple, star: Triple): number[] => {
      const lit = toDisplay([sky[0] + star[0], sky[1] + star[1], sky[2] + star[2]]);
      const dark = toDisplay(sky);
      return lit.map((value, channel) => value - dark[channel]);
    };
    const star: Triple = [0.9, 0.9, 0.9];
    const luma = ([r, g, b]: number[]): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // tone-mapped by itself, the star would be added at more than half of full scale
    expect(Math.min(...toDisplay(star))).toBeGreaterThan(0.5);
    // a thermal sky a thousand times brighter in every channel: the star leaves no trace
    for (const channel of increment([2000, 1400, 900], star)) expect(Math.abs(channel)).toBeLessThan(1 / 255);
    // the surroundings at D ≈ 5 (44 reference units, orange): the star changes the display
    // luminance by under one per cent and tints the weak blue channel a little, nothing more
    const overGlow = increment([60, 42, 3], star);
    expect(Math.abs(luma(overGlow))).toBeLessThan(0.01);
    expect(Math.max(...overGlow.map(Math.abs))).toBeLessThan(0.1);
    // over a black sky the increment is the star itself
    const alone = toDisplay(star);
    increment([0, 0, 0], star).forEach((value, channel) => expect(value).toBeCloseTo(alone[channel], 12));
    // and it is never negative in luminance: a star cannot darken the sky
    expect(luma(increment([2, 1.5, 0.4], [0.2, 0.3, 0.9]))).toBeGreaterThan(0);
  });
});

describe('the Moon', () => {
  const { moon, environment } = SCENARIO;
  // luminances in reference units, as the sky shader computes them for the disc and the sky around it
  const reflected = (doppler: number): number =>
    Math.exp(uniforms.uLnMoonDisc.value as number) * blackbodyLuminanceUnits(atlas, moon.colourTemperatureK * doppler);
  const glowing = (doppler: number): number =>
    Math.exp(uniforms.uLnMoonEmissivity.value as number) *
    blackbodyLuminanceUnits(atlas, Math.exp(uniforms.uLnMoonSurfaceT.value as number) * doppler);
  const sky = (doppler: number): number =>
    environment.skyEmissivity * blackbodyLuminanceUnits(atlas, environment.temperatureK * doppler);

  it('the disc reflects moonlight and glows by itself, the latter only where thermal emission is shown', () => {
    const code = withoutComments(skyFragmentShader);
    expect(
      code.includes('blackbody(uLnMoonT + lnD, uLnMoonDisc) + thermal * blackbody(uLnMoonSurfaceT + lnD, uLnMoonEmissivity)')
    ).toBe(true);
    expect(code.includes('float thermal = uThermal * uOptical;')).toBe(true);
  });

  it('at rest it shows reflected light only; its own glow outshines that above D ≈ 5.5', () => {
    // a 380 K surface emits nothing visible: at rest the glow is under 10⁻¹⁸ of the reflected light
    expect(glowing(1) / reflected(1)).toBeLessThan(1e-18);
    expect(glowing(5.3)).toBeLessThan(reflected(5.3));
    expect(glowing(5.8)).toBeGreaterThan(reflected(5.8));
    // the disc reflects the light of a 4100 K body and is warmer than the air: from D ≈ 8 on the glow alone is
    // brighter than the sky's thermal emission behind it, and the ratio tends to the Rayleigh–Jeans limit
    // ε T / (ε_sky T_ambient) = 0.95 × 380 / (0.78 × 288.15) ≈ 1.6 (measured 1.65 at D = 400)
    for (const doppler of [8, 20, 100, 400]) expect(glowing(doppler)).toBeGreaterThan(sky(doppler));
    const limit = (moon.surfaceEmissivity * moon.surfaceTemperatureK) / (environment.skyEmissivity * environment.temperatureK);
    expect(glowing(400) / sky(400)).toBeGreaterThan(limit);
    expect(glowing(400) / sky(400)).toBeLessThan(1.1 * limit);
  });
});
