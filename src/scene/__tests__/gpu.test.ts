/**
 * The shaders of the scene, executed on a real WebGL 2 implementation and compared
 * with the TypeScript reference implementations they repeat.
 *
 * shaders.test.ts can only read the GLSL as text. Here a headless browser (see
 * gpu/browser.ts; SwiftShader by default, so every machine and the CI runner execute
 * the same software rasteriser) compiles the application's materials as three.js
 * assembles them, and runs:
 *   – the display transform (chunks.ts DISPLAY_TRANSFORM) in a fragment shader, against
 *     toneMap/encodeSrgb of display.ts plus the shader's dither, to 8 bits;
 *   – the look-ups of the spectral atlas (chunks.ts ATLAS_SAMPLING, SKY_RADIANCE) in a
 *     fragment shader, on the atlas uploaded as the application uploads it, against
 *     spectralAtlas.ts;
 *   – the vertex stage of the city (aberration and contraction) and of the stars (flux
 *     law) with transform feedback, from the very sources three.js linked, against
 *     optics.ts and geometry/stars.ts;
 *   – the lunar disc of the sky shader (sky.ts MOON_DISC), with its own screen-space
 *     derivatives, for its roundness and its flux.
 * Not executed numerically: the rest of the main() of the city and sky fragment shaders
 * (the per-pixel Doppler factor, the inverse aberration, the ground, the grid, the
 * dissolve), the point-spread function and the star compositing. They are compiled
 * and linked here, and compared as text in shaders.test.ts.
 *
 * GPU_TESTS=off skips this file; GPU_TESTS=require (or CI) turns a missing browser or
 * WebGL 2 context into a failure. GPU_TEST_ANGLE=d3d11 (gl, vulkan, metal) runs it on
 * the graphics processor instead of SwiftShader.
 */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Triple, encodeSrgb } from '@/physics/colorimetry';
import { toneMap } from '@/physics/display';
import { lorentzFactor } from '@/physics/kinematics';
import { aberratePoint, boostUniforms } from '@/physics/optics';
import { MOON_DISC_LUMINANCE_CD_M2, REFERENCE_LUMINANCE_CD_M2, SCENARIO } from '@/physics/scenario';
import {
  type SpectralAtlas,
  ATLAS_ROW,
  ATLAS_WIDTH,
  LN_LUMINANCE_FLOOR,
  LN_TEMPERATURE_MAX,
  LN_TEMPERATURE_MIN,
  blackbodyRadiance,
  lineRadiance,
  reflectedRadiance,
  sampleAtlas,
  sharedAtlas,
  temperatureCoordinate,
} from '@/physics/spectralAtlas';
import { generateStarField, starLnFlux, starLnNormalisation, starLnOffAxis, starPointSize } from '../geometry/stars';
import { ATLAS_SAMPLING, COMMON_UNIFORMS, DISPLAY_TRANSFORM, SKY_RADIANCE, glslFloat } from '../shaders/chunks';
import { cityFragmentShader, cityVertexShader } from '../shaders/city';
import { MOON_DISC, skyFragmentShader, skyVertexShader } from '../shaders/sky';
import {
  STAR_LN_PEAK_MAX,
  starFragmentShader,
  starRadianceFragmentShader,
  starRadianceVertexShader,
  starVertexShader,
} from '../shaders/stars';
import { BASE_LN_EXPOSURE, createAtlasTexture, createSceneUniforms } from '../uniforms';
import { Browser, angleBackend, findBrowser, gpuTestMode } from './gpu/browser';

// ---------------------------------------------------------------------------
// What the application does, as far as the compiled programs depend on it
// ---------------------------------------------------------------------------

/** The renderer of UrbanScene.tsx's <Canvas>: its gl options, and `flat` (no tone mapping), not `linear` (sRGB output). */
const RENDERER = {
  context: { antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' },
  toneMapping: 'NoToneMapping',
  outputColorSpace: 'SRGBColorSpace',
};

/** The materials of Simulation.tsx, with the options that change what three.js prepends to the shaders. */
const MATERIALS = {
  city: {
    vertexShader: cityVertexShader,
    fragmentShader: cityFragmentShader,
    options: { side: 'DoubleSide', alphaToCoverage: true },
    geometry: 'mesh',
    target: 'canvas',
  },
  sky: {
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    options: { side: 'BackSide', depthWrite: false },
    geometry: 'box',
    target: 'canvas',
  },
  // the star material where a half-float target can be rendered to: drawn into it
  starRadiance: {
    vertexShader: starRadianceVertexShader,
    fragmentShader: starRadianceFragmentShader,
    options: { transparent: true, blending: 'AdditiveBlending', depthTest: false, depthWrite: false },
    geometry: 'points',
    target: 'starTarget',
  },
  // and where it cannot: drawn over the sky
  stars: {
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    options: { transparent: true, blending: 'AdditiveBlending', depthTest: true, depthWrite: false },
    geometry: 'points',
    target: 'canvas',
  },
} as const;

/** The star target of Simulation.tsx. */
const STAR_TARGET = {
  type: 'HalfFloatType',
  format: 'RGBAFormat',
  minFilter: 'NearestFilter',
  magFilter: 'NearestFilter',
  generateMipmaps: false,
  depthBuffer: false,
  stencilBuffer: false,
};

const SOURCE = (relative: string): string => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

/** `key: value` pairs of an object literal, comments removed; a shorthand `key` maps to itself. */
function objectLiteral(text: string): Record<string, string> {
  const code = text.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const entries: Record<string, string> = {};
  for (const part of code.split(/,\s*\n|,\s*(?=\w+\s*:)/)) {
    const trimmed = part.trim().replace(/,$/, '');
    if (!trimmed) continue;
    const match = /^(\w+)\s*:\s*([\s\S]+)$/.exec(trimmed);
    if (match) entries[match[1]] = match[2].replace(/\s+/g, ' ').trim();
    else entries[trimmed] = trimmed;
  }
  return entries;
}

describe('what the GPU tests reproduce of the application', () => {
  // Simulation.tsx and UrbanScene.tsx build these inline; the GPU tests repeat them, and this keeps the two the same.
  const simulation = SOURCE('../Simulation.tsx');
  const materials = [...simulation.matchAll(/new THREE\.ShaderMaterial\(\{([\s\S]*?)\}\)/g)].map((match) =>
    objectLiteral(match[1])
  );

  it('the material options', () => {
    const byVertex = (name: string): Record<string, string> | undefined => materials.find((m) => m.vertexShader?.includes(name));
    expect(materials).toHaveLength(3);
    expect(byVertex('cityVertexShader')).toEqual({
      vertexShader: 'cityVertexShader',
      fragmentShader: 'cityFragmentShader',
      uniforms: 'uniforms',
      side: 'THREE.DoubleSide',
      alphaToCoverage: 'true',
    });
    expect(byVertex('skyVertexShader')).toEqual({
      vertexShader: 'skyVertexShader',
      fragmentShader: 'skyFragmentShader',
      uniforms: 'uniforms',
      side: 'THREE.BackSide',
      depthWrite: 'false',
    });
    expect(byVertex('starRadianceVertexShader')).toEqual({
      vertexShader: 'starTarget ? starRadianceVertexShader : starVertexShader',
      fragmentShader: 'starTarget ? starRadianceFragmentShader : starFragmentShader',
      uniforms: 'uniforms',
      transparent: 'true',
      blending: 'THREE.AdditiveBlending',
      depthTest: '!starTarget',
      depthWrite: 'false',
    });
  });

  it('the star target and the renderer', () => {
    const target = /new THREE\.WebGLRenderTarget\(1, 1, \{([\s\S]*?)\}\)/.exec(simulation);
    expect(target).not.toBeNull();
    expect(objectLiteral(target![1])).toEqual(
      Object.fromEntries(Object.entries(STAR_TARGET).map(([k, v]) => [k, typeof v === 'string' ? `THREE.${v}` : String(v)]))
    );
    const canvas = /<Canvas([\s\S]*?)>/.exec(SOURCE('../UrbanScene.tsx'));
    expect(canvas).not.toBeNull();
    expect(canvas![1]).toContain("gl={{ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' }}");
    expect(canvas![1]).toMatch(/^\s*flat\s*$/m);
    expect(canvas![1]).not.toMatch(/\blinear\b/);
  });
});

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const atlas = sharedAtlas();
const atlasTexture = createAtlasTexture(atlas);
const sceneUniforms = createSceneUniforms(atlas, atlasTexture);
const noStarsTexture = sceneUniforms.uStars.value as THREE.DataTexture;

/** The atlas as the GPU holds it: every value rounded to a half float, as createAtlasTexture uploads it. */
const halfAtlas: SpectralAtlas = {
  ...atlas,
  data: Float32Array.from(atlasTexture.image.data as unknown as Uint16Array, (bits) => THREE.DataUtils.fromHalfFloat(bits)),
};

const TEXTURE_PROPERTIES = [
  'format',
  'type',
  'internalFormat',
  'magFilter',
  'minFilter',
  'wrapS',
  'wrapT',
  'generateMipmaps',
  'colorSpace',
  'flipY',
  'premultiplyAlpha',
  'unpackAlignment',
  'anisotropy',
] as const;

/** A DataTexture of the application, to be rebuilt in the page with the same data and every upload setting. */
function textureSpec(texture: THREE.DataTexture): Record<string, unknown> {
  const data = texture.image.data as Uint16Array | Uint8Array | Float32Array;
  const arrayType = data instanceof Uint16Array ? 'Uint16' : data instanceof Uint8Array ? 'Uint8' : 'Float32';
  return {
    width: texture.image.width,
    height: texture.image.height,
    arrayType,
    data: Array.from(data),
    properties: Object.fromEntries(TEXTURE_PROPERTIES.map((key) => [key, texture[key]])),
  };
}

type UniformSpec = { type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'texture'; value: number | number[] | string };

function uniformSpec(value: unknown): UniformSpec {
  if (typeof value === 'number') return { type: 'float', value };
  if (value instanceof THREE.Vector2) return { type: 'vec2', value: value.toArray() };
  if (value instanceof THREE.Vector3) return { type: 'vec3', value: value.toArray() };
  if (value instanceof THREE.Vector4) return { type: 'vec4', value: value.toArray() };
  if (value === atlasTexture) return { type: 'texture', value: 'atlas' };
  if (value === noStarsTexture) return { type: 'texture', value: 'noStars' };
  throw new Error(`a uniform the GPU test cannot transfer: ${String(value)}`);
}

/**
 * What rounding the atlas to half floats costs (the GPU reads those; the CPU references
 * read the float32 atlas): over every texel that is not at the floor, the relative change
 * of the luminance and the change of the colour relative to its largest component.
 */
function halfFloatLoss(): { luminance: number; colour: number } {
  let luminance = 0;
  let colour = 0;
  for (let i = 0; i < atlas.data.length; i += 4) {
    if (atlas.data[i + 3] <= LN_LUMINANCE_FLOOR + 1) continue;
    luminance = Math.max(luminance, Math.expm1(Math.abs(halfAtlas.data[i + 3] - atlas.data[i + 3])));
    const size = Math.max(Math.abs(atlas.data[i]), Math.abs(atlas.data[i + 1]), Math.abs(atlas.data[i + 2]));
    if (size > 0) {
      for (let c = 0; c < 3; c++) colour = Math.max(colour, Math.abs(halfAtlas.data[i + c] - atlas.data[i + c]) / size);
    }
  }
  return { luminance, colour };
}

/**
 * Tolerances of the vertex stages, relative.
 *
 * BOOST: the transverse part of the apparent position (x′ = x/D, so this is the Doppler
 * factor) relative to itself, and the part along the motion relative to the distance.
 * The float32 arithmetic of optics.ts (aberratePoint with Math.fround) stays within
 * 2.6e-7 of double precision at every β of the test. On top of that the transverse part
 * may carry MIX_ROUNDING times the rest-frame coordinate: city.ts blends the two views with
 * mix(measured, seen, uOptical), and both SwiftShader and Direct3D 11 evaluate mix(x, y, 1)
 * as x + (y − x), which rounds at the size of the rest coordinate x, not of the much smaller
 * apparent one. At β = 0.99999 that is 2.2e-5 of the transverse part, an angle of about
 * 1e-7 rad, a ten-thousandth of a pixel. (Written as measured·(1 − uOptical) + seen·uOptical,
 * the blend is exact at both ends and the GPU agrees with the float32 emulation to 3e-7;
 * checked on both implementations.)
 *
 * STAR: the radiance of a star, beyond what moving its black-body look-up by a 256th of a
 * texel changes (as for the atlas).
 *
 * MOON_ROUNDNESS: how much brighter (on the scale of the test, ½ = the reference white) a
 * pixel of the lunar disc may look than one nearer its centre. Measured: 0 on SwiftShader
 * and on Direct3D 11. With the former footprint fwidth(angle) it was up to 0.84, the cross
 * seen in the application.
 * MOON_FLUX: the flux of the disc, relative. The point source keeps it exactly; the edge
 * filter of the resolved disc, a smoothstep over ± one footprint f, adds 0.2 (f / radius)²
 * of it (the second moment of the ramp), which is largest where the two are blended, at
 * one and a half pixels: measured 6.4 % on SwiftShader, 4.1 % on Direct3D 11.
 */
const BOOST_TOLERANCE = 1e-6;
const MIX_ROUNDING = 2 ** -22;
const STAR_TOLERANCE = 1e-4;
const MOON_ROUNDNESS = 0.05;
const MOON_FLUX = 0.08;

const float = (value: number): UniformSpec => ({ type: 'float', value });
const vec3 = (x: number, y: number, z: number): UniformSpec => ({ type: 'vec3', value: [x, y, z] });

/** Deterministic generator (mulberry32). */
function generator(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One line on the terminal whatever the reporter: which GL implementation ran the tests, or
 * why they were skipped. (Vitest shows console output of passing tests only with
 * --silent=false; the measurements below are logged that way.)
 */
const announce = (line: string): void => {
  process.stderr.write(`${line}\n`);
};

/**
 * Each test takes about a second on SwiftShader. The limit is generous; the calls into the
 * page time out first (60 s, in call below), with a message that names what was waited for.
 */
const GPU_TEST_TIMEOUT = 90_000;

const mode = gpuTestMode();
const browserFound = mode === 'off' ? { path: null, reason: 'GPU_TESTS=off' } : findBrowser();
const angle = angleBackend();

let page: Browser | null = null;
let failure: Error | null = null;
let skipReason: string | null = null;
let compiled: {
  results: Array<{
    name: string;
    linked: boolean;
    vertexCompiled: boolean;
    fragmentCompiled: boolean;
    vertexLog: string;
    fragmentLog: string;
    programLog: string;
  }>;
  reported: unknown[];
  programCount: number;
  contextLost: boolean;
  glError: number;
} | null = null;

const call = <T>(fn: string, args: unknown, what: string, timeoutMs = 60_000): Promise<T> =>
  page!.evaluate<T>(`window.gpuHarness.${fn}(${JSON.stringify(args)})`, timeoutMs, what);

/** The browser, or a skip or a failure as GPU_TESTS asks. */
function ready(context: { skip: (note?: string) => void }): Browser {
  if (failure) throw failure;
  if (skipReason || !page) {
    context.skip(skipReason ?? 'no browser');
    throw new Error('unreachable');
  }
  return page;
}

describe('the shaders on a WebGL 2 implementation', () => {
  beforeAll(async () => {
    if (mode === 'off') {
      skipReason = 'GPU_TESTS=off';
      announce('GPU tests skipped: GPU_TESTS=off');
      return;
    }
    if (!browserFound.path) {
      const message = `GPU tests: no browser to run WebGL 2 in (${browserFound.reason}); set CHROME_PATH`;
      if (mode === 'require') failure = new Error(message);
      else {
        skipReason = message;
        announce(`${message} — skipped (GPU_TESTS=require makes this a failure)`);
      }
      return;
    }
    try {
      page = await Browser.launch(browserFound.path, angle);
      const three = fs.readFileSync(
        fileURLToPath(new URL('../../../node_modules/three/build/three.module.js', import.meta.url)),
        'utf8'
      );
      // three's own ES module build, the file the application's bundle is made from
      const revision = await page.evaluate<string>(
        `(async () => {
          const url = URL.createObjectURL(new Blob([${JSON.stringify(three)}], { type: 'text/javascript' }));
          window.THREE = await import(url);
          URL.revokeObjectURL(url);
          return window.THREE.REVISION;
        })()`,
        30_000,
        'importing three.js'
      );
      expect(revision, 'three.js in the page and in the tests').toBe(THREE.REVISION);
      await page.evaluate(`${SOURCE('./gpu/page.js')}\n;true`, 10_000, 'loading the page harness');
      const uniforms = Object.fromEntries(
        Object.entries(sceneUniforms).map(([name, uniform]) => [name, uniformSpec(uniform.value)])
      );
      const textures = { atlas: textureSpec(atlasTexture), noStars: textureSpec(noStarsTexture) };
      const context = await call<{
        webgl2: boolean;
        reason?: string;
        renderer?: string;
        version?: string;
        colorBufferFloat?: boolean;
      }>('init', { renderer: RENDERER, uniforms, textures }, 'creating the WebGL 2 context');
      if (!context.webgl2) {
        const message = `GPU tests: no WebGL 2 context (${context.reason ?? 'unknown'}) with ANGLE backend ${angle}`;
        if (mode === 'require') throw new Error(message);
        skipReason = message;
        announce(`${message} — skipped`);
        return;
      }
      announce(
        `GPU tests on ${context.renderer} (${context.version}; ANGLE backend ${angle}; EXT_color_buffer_float ${context.colorBufferFloat})`
      );
      if (!context.colorBufferFloat)
        throw new Error('GPU tests: the context cannot render to float targets (EXT_color_buffer_float)');
      compiled = await call('compileScene', { materials: MATERIALS, starTarget: STAR_TARGET }, 'compiling the scene', 120_000);
    } catch (error) {
      failure = error instanceof Error ? error : new Error(String(error));
      if (page && page.pageErrors.length) failure.message += `\npage errors:\n${page.pageErrors.join('\n')}`;
    }
  }, 180_000);

  afterAll(async () => {
    await page?.close();
    page = null;
  }, 30_000);

  it('every program of the scene compiles and links as three.js assembles it', (context) => {
    ready(context);
    expect(compiled!.contextLost, `the WebGL context was lost; page errors: ${page!.pageErrors.join('\n')}`).toBe(false);
    const problems = compiled!.results
      .filter((program) => !program.linked || !program.vertexCompiled || !program.fragmentCompiled)
      .map((p) => `${p.name}:\n  vertex: ${p.vertexLog}\n  fragment: ${p.fragmentLog}\n  program: ${p.programLog}`);
    expect(problems.join('\n'), 'compile and link logs').toBe('');
    expect(compiled!.results.map((program) => program.name).sort()).toEqual(Object.keys(MATERIALS).sort());
    // one program per material: nothing else was drawn, and no material compiled twice
    expect(compiled!.programCount).toBe(Object.keys(MATERIALS).length);
    expect(compiled!.reported).toEqual([]);
    expect(compiled!.glError).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 2. Display transform
  // -------------------------------------------------------------------------

  it(
    'DISPLAY_TRANSFORM agrees with display.ts (and the dither) to one level of 8 bits',
    async (context) => {
      ready(context);
      const N = 64;
      const scale = (t: Triple, k: number): Triple => [t[0] * k, t[1] * k, t[2] * k];
      const samples: Triple[] = [];
      const signal = SCENARIO.signals.luminanceCdM2 / REFERENCE_LUMINANCE_CD_M2;
      const { redNm, amberNm, greenNm } = SCENARIO.signals;
      for (const nm of [redNm, amberNm, greenNm, 400, 450, 700]) {
        for (const doppler of [0.5, 0.8, 1, 1.22, 1.5, 2.5]) {
          for (const exposure of [1e-4, 1e-3, 1e-2, 0.1, 1, 1.45, 10])
            samples.push(scale(lineRadiance(atlas, nm, doppler), signal * exposure));
        }
      }
      for (let i = 0; i < 120; i++) {
        const doppler = 0.3 * (4 / 0.3) ** (i / 119);
        for (const exposure of [0.05, 0.5, 1.45, 20])
          samples.push(scale(reflectedRadiance(atlas, 'led', [1, 1, 1], doppler), exposure));
      }
      for (let i = 0; i <= 40; i++) {
        const temperature = 800 * (40_000 / 800) ** (i / 40);
        const body = blackbodyRadiance(atlas, temperature);
        const luminance = 0.2126 * body[0] + 0.7152 * body[1] + 0.0722 * body[2];
        for (let decade = -6; decade <= 6; decade++) samples.push(scale(body, 10 ** decade / luminance));
      }
      for (let e = -7; e <= 12; e += 0.25) samples.push([10 ** e, 10 ** e, 10 ** e]);
      samples.push([0, 0, 0], [-1, -1, -1], [1, -1, 0], [0, 0, 1e-9], [1e30, 1e30, 1e30]);
      const random = generator(2016);
      while (samples.length < N * N) {
        const level = 10 ** (random() * 16 - 6);
        samples.push([level * (random() * 1.6 - 0.3), level * (random() * 1.6 - 0.3), level * (random() * 1.6 - 0.3)]);
      }
      expect(samples.length).toBe(N * N);

      const inputA = samples.flatMap((s) => [s[0], s[1], s[2], 0]);
      const fragmentShader = /* glsl */ `
      uniform highp sampler2D uInputA;
      uniform highp sampler2D uInputB;
      ${DISPLAY_TRANSFORM}
      void main() {
        gl_FragColor = vec4(toDisplay(texelFetch(uInputA, ivec2(gl_FragCoord.xy), 0).rgb), 1.0);
      }
    `;
      const result = await call<{ reported: unknown[]; glError: number; pixels: number[] }>(
        'evaluateFragment',
        { fragmentShader, width: N, height: N, inputA, output: 'byte' },
        'the display transform'
      );
      expect(result.reported).toEqual([]);
      expect(result.glError).toBe(0);

      const fract = (v: number): number => v - Math.floor(v);
      // ditherNoise of chunks.ts at the pixel centre
      const dither = (i: number, j: number): number =>
        (fract(52.9829189 * fract((i + 0.5) * 0.06711056 + (j + 0.5) * 0.00583715)) - 0.5) / 255;
      const to8 = (v: number): number => Math.round(255 * Math.min(1, Math.max(0, v)));
      let differing = 0;
      let worst = 0;
      let worstAt = '';
      samples.forEach((radiance, k) => {
        const d = dither(k % N, Math.floor(k / N));
        const expected = toneMap(radiance).map((v) => to8(encodeSrgb(v) + d));
        for (let c = 0; c < 3; c++) {
          const off = Math.abs(result.pixels[4 * k + c] - expected[c]);
          if (off > 0) differing++;
          if (off > worst) {
            worst = off;
            worstAt = `radiance ${radiance.map((v) => v.toPrecision(4)).join(', ')}: GPU ${result.pixels.slice(4 * k, 4 * k + 3)} reference ${expected}`;
          }
        }
      });
      console.info(
        `display transform: ${N * N} radiances; ${differing} of ${3 * N * N} channels differ, by at most ${worst} level(s) of 255`
      );
      expect(worst, worstAt).toBeLessThanOrEqual(1);
      // a one-level difference is a rounding at the edge of a level; it must stay rare
      expect(differing).toBeLessThan(0.02 * 3 * N * N);
    },
    GPU_TEST_TIMEOUT
  );

  // -------------------------------------------------------------------------
  // 3. Spectral atlas
  // -------------------------------------------------------------------------

  it(
    'the atlas look-ups of the shaders agree with spectralAtlas.ts over the whole range of Doppler factors',
    async (context) => {
      ready(context);
      const exposure = Math.exp(BASE_LN_EXPOSURE);
      const scale = (t: Triple, k: number): Triple => [t[0] * k, t[1] * k, t[2] * k];
      const add = (a: Triple, b: Triple): Triple => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
      // One texel of each axis, in its own unit, divided by 2^8: a filter that computes its weights with
      // 8 bits below the texel (the Direct3D 11 requirement, and what most GPUs do) may sample this far off.
      const SUBTEXEL = 1 / 256;
      const dopplerTexel = (Math.log(512) * 2) / ATLAS_WIDTH;
      const temperatureTexel = (LN_TEMPERATURE_MAX - LN_TEMPERATURE_MIN) / ATLAS_WIDTH;
      const lineTexelNm = 520 / ATLAS_WIDTH;

      // `reference(first, second)`: the reference with its first and its second look-up moved by that many texels
      type Sample = { label: string; a: number[]; albedo: Triple; reference: (first: number, second: number) => Triple };
      const samples: Sample[] = [];
      // the range of the scene: D from the tail of the rear view at β = 0.99999 (≈ 1/447) to the head-on factor (≈ 447)
      const lnDs = Array.from({ length: 301 }, (_, i) => Math.log(0.002) + (i / 300) * (Math.log(500) - Math.log(0.002)));
      lnDs.push(0);
      const albedos: Triple[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1], SCENARIO.sky.glowTint as unknown as Triple];
      for (const [kind, illuminant] of [
        [0, 'led'],
        [1, 'moon'],
      ] as const) {
        for (const albedo of albedos) {
          for (const lnD of lnDs) {
            samples.push({
              label: `${illuminant} albedo ${albedo} D ${Math.exp(lnD).toPrecision(4)}`,
              a: [kind, lnD, 0, 0],
              albedo,
              reference: (first) =>
                scale(reflectedRadiance(halfAtlas, illuminant, albedo, Math.exp(lnD + first * dopplerTexel)), exposure),
            });
          }
        }
      }
      // the black-body row over its whole axis and beyond both ends (the shaders rely on clamping there)
      for (let i = 0; i <= 700; i++) {
        const lnT = Math.log(20) + (i / 700) * (Math.log(6e7) - Math.log(20));
        const lnScale = [0, Math.log(0.78), -3][i % 3];
        samples.push({
          label: `black body ${Math.exp(lnT).toPrecision(4)} K`,
          a: [2, lnT, lnScale, 0],
          albedo: [0, 0, 0],
          reference: (first) =>
            scale(blackbodyRadiance(halfAtlas, Math.exp(lnT + first * temperatureTexel)), Math.exp(lnScale) * exposure),
        });
      }
      const lnSignal = Math.log(SCENARIO.signals.luminanceCdM2 / REFERENCE_LUMINANCE_CD_M2);
      for (const nm of [SCENARIO.signals.redNm, SCENARIO.signals.amberNm, SCENARIO.signals.greenNm, 400, 450, 700, 780]) {
        for (const lnD of lnDs) {
          samples.push({
            label: `line ${nm} nm D ${Math.exp(lnD).toPrecision(4)}`,
            a: [3, nm, lnD, lnSignal],
            albedo: [0, 0, 0],
            // first: the look-up at the seen wavelength nm/D; second: the one at the rest wavelength. Moving the
            // latter changes the D that lineRadiance is given, whose D⁴ is divided out again.
            reference: (first, second) => {
              const rest = nm + second * lineTexelNm;
              const doppler = rest / (nm * Math.exp(-lnD) + first * lineTexelNm);
              const fourth = (Math.exp(lnD) / doppler) ** 4;
              return scale(lineRadiance(halfAtlas, rest, doppler), fourth * Math.exp(lnSignal) * exposure);
            },
          });
        }
      }
      const { sky, environment } = SCENARIO;
      for (const slope of [0.07, 0.3, 1, 5, 50]) {
        for (const lnD of lnDs) {
          samples.push({
            label: `sky slope ${slope} D ${Math.exp(lnD).toPrecision(4)}`,
            a: [4, slope, lnD, 0],
            albedo: [0, 0, 0],
            reference: (first, second) => {
              const glow = scale(
                reflectedRadiance(halfAtlas, 'led', sky.glowTint as unknown as Triple, Math.exp(lnD + first * dopplerTexel)),
                exposure * (sky.glowZenith + sky.glowHorizon * Math.exp(-slope * sky.glowFalloff))
              );
              // uThermal = uOptical = 1
              const thermal = blackbodyRadiance(halfAtlas, environment.temperatureK * Math.exp(lnD + second * temperatureTexel));
              return add(glow, scale(thermal, environment.skyEmissivity * exposure));
            },
          });
        }
      }
      const W = 128;
      const H = Math.ceil(samples.length / W);
      const inputA = new Array<number>(W * H * 4).fill(0);
      const inputB = new Array<number>(W * H * 4).fill(0);
      samples.forEach((sample, k) => {
        inputA.splice(4 * k, 4, ...sample.a);
        inputB.splice(4 * k, 3, ...sample.albedo);
      });
      // padding: black bodies at 6000 K, never compared
      for (let k = samples.length; k < W * H; k++) inputA.splice(4 * k, 4, 2, Math.log(6000), 0, 0);

      const fragmentShader = /* glsl */ `
      ${COMMON_UNIFORMS}
      uniform highp sampler2D uInputA;
      uniform highp sampler2D uInputB;
      ${ATLAS_SAMPLING}
      ${SKY_RADIANCE}
      void main() {
        ivec2 pixel = ivec2(gl_FragCoord.xy);
        vec4 a = texelFetch(uInputA, pixel, 0);
        vec3 albedo = texelFetch(uInputB, pixel, 0).rgb;
        vec3 c;
        if (a.x < 0.5) c = reflectedLed(albedo, a.y);
        else if (a.x < 1.5) c = reflectedMoon(albedo, a.y);
        else if (a.x < 2.5) c = blackbody(a.y, a.z);
        else if (a.x < 3.5) c = lineEmitter(a.y, a.z, a.w);
        else c = skyRadiance(a.y, a.z);
        gl_FragColor = vec4(c, 1.0);
      }
    `;
      const result = await call<{ reported: unknown[]; glError: number; pixels: number[] }>(
        'evaluateFragment',
        { fragmentShader, width: W, height: H, inputA, inputB, output: 'float' },
        'the atlas look-ups'
      );
      expect(result.reported).toEqual([]);
      expect(result.glError).toBe(0);

      // Tolerance, relative to the largest component of the reference (the components are signed):
      // ARITHMETIC for float32 arithmetic, chiefly exp() of arguments down to −70, plus what moving the
      // look-up by SUBTEXEL of a texel changes in the reference at that point. The latter is below 1e−5
      // wherever the light is smooth in D, and large only where a row falls steeply towards its floor
      // (e^−70), where the light is invisible anyway. The half-float rounding of the atlas is not in it:
      // the reference reads the same half floats (halfAtlas).
      const ARITHMETIC = 1e-4;
      const largest = (t: Triple): number => Math.max(Math.abs(t[0]), Math.abs(t[1]), Math.abs(t[2]));
      const failures: string[] = [];
      let zeros = 0;
      let worst = 0;
      let worstAt = '';
      let worstSmooth = 0;
      samples.forEach((sample, k) => {
        const gpu: Triple = [result.pixels[4 * k], result.pixels[4 * k + 1], result.pixels[4 * k + 2]];
        const ref = sample.reference(0, 0);
        const size = largest(ref);
        if (!(size > 0)) {
          // outside the band of a band-limited source: nothing at all, on the GPU as well
          zeros++;
          if (largest(gpu) > 1e-30) failures.push(`${sample.label}: GPU ${gpu} where the reference is zero`);
          return;
        }
        const error = largest([gpu[0] - ref[0], gpu[1] - ref[1], gpu[2] - ref[2]]) / size;
        const change = (moved: Triple): number => largest([moved[0] - ref[0], moved[1] - ref[1], moved[2] - ref[2]]) / size;
        const sensitivity =
          Math.max(change(sample.reference(-SUBTEXEL, 0)), change(sample.reference(SUBTEXEL, 0))) +
          Math.max(change(sample.reference(0, -SUBTEXEL)), change(sample.reference(0, SUBTEXEL)));
        if (!(error <= sensitivity + ARITHMETIC)) {
          failures.push(
            `${sample.label}: relative error ${error.toExponential(2)} (filter ${sensitivity.toExponential(2)}); GPU ${gpu} reference ${ref}`
          );
        }
        if (error > worst) {
          worst = error;
          worstAt = sample.label;
        }
        if (sensitivity < 1e-5) worstSmooth = Math.max(worstSmooth, error);
      });
      const loss = halfFloatLoss();
      console.info(
        `atlas look-ups: ${samples.length} samples (${zeros} exactly zero); largest relative error ${worst.toExponential(2)} (${worstAt}), ` +
          `${worstSmooth.toExponential(2)} where the filter cannot matter. For the record, the half floats of the texture against ` +
          `the float32 atlas: luminance up to ${loss.luminance.toExponential(2)}, colour up to ${loss.colour.toExponential(2)}`
      );
      expect(failures.slice(0, 10).join('\n'), `${failures.length} look-ups out of tolerance`).toBe('');
    },
    GPU_TEST_TIMEOUT
  );

  // -------------------------------------------------------------------------
  // 4. Boost: the vertex stage of the city, by transform feedback
  // -------------------------------------------------------------------------

  it(
    'the aberration and contraction of the city vertex shader agree with optics.ts up to β = 0.99999',
    async (context) => {
      ready(context);
      const f = Math.fround;
      // unit directions all over the sphere, and close to straight ahead and straight behind (forward is −z)
      const directions: Array<[number, number, number]> = [];
      const n = 1500;
      for (let i = 0; i < n; i++) {
        const z = 1 - (2 * (i + 0.5)) / n;
        const ring = Math.sqrt(1 - z * z);
        const phi = i * Math.PI * (3 - Math.sqrt(5));
        directions.push([ring * Math.cos(phi), ring * Math.sin(phi), z]);
      }
      for (let k = 1; k <= 6; k++) {
        for (let azimuth = 0; azimuth < 6; azimuth++) {
          const epsilon = 10 ** -k * (1 + azimuth / 7);
          for (const theta of [epsilon, Math.PI - epsilon]) {
            directions.push([Math.sin(theta) * Math.cos(azimuth), Math.sin(theta) * Math.sin(azimuth), -Math.cos(theta)]);
          }
        }
      }
      directions.push([0, 0, -1], [0, 0, 1], [1, 0, 0], [0, 1, 0], [0, -1, 0]);
      const radii = [0.5, 7, 120, 900];
      // the rest-frame displacements as the vertex buffer holds them
      const rel = directions.map(([x, y, z], i) => {
        const r = radii[i % radii.length];
        return { x: f(x * r), y: f(y * r), z: f(z * r) };
      });
      const count = rel.length;
      const zeros = new Array<number>(count * 3).fill(0);
      const attributes = {
        position: { size: 3, data: rel.flatMap((p) => [p.x, p.y, p.z]) },
        normal: { size: 3, data: zeros },
        color: { size: 3, data: zeros },
        aSurface: { size: 3, data: zeros },
      };

      const report: string[] = [];
      const failures: string[] = [];
      for (const optical of [1, 0]) {
        for (const beta of optical ? [0, 0.5, 0.9, 0.99, 0.999, 0.9999, 0.99999] : [0.9, 0.99999]) {
          const boost = boostUniforms(beta);
          const result = await call<{
            status: { linked: boolean; programLog: string };
            glError: number;
            captured: { vApparent: number[] };
          }>(
            'transformFeedback',
            {
              program: 'city',
              count,
              attributes,
              varyings: [{ name: 'vApparent', size: 3 }],
              uniforms: {
                uOnePlusBeta: float(boost.onePlusBeta),
                uOneMinusBeta: float(boost.oneMinusBeta),
                uGamma: float(boost.gamma),
                uOptical: float(optical),
                uObserver: vec3(0, 0, 0),
              },
            },
            `the city vertex stage at β = ${beta}`
          );
          expect(result.status.linked, result.status.programLog).toBe(true);
          expect(result.glError).toBe(0);
          let transverse = 0;
          let longitudinal = 0;
          let emulated = 0;
          rel.forEach((p, i) => {
            const gpu = result.captured.vApparent.slice(3 * i, 3 * i + 3);
            const ref = optical ? aberratePoint(p, boost).position : { x: p.x, y: p.y, z: p.z / lorentzFactor(beta) };
            const r = Math.hypot(p.x, p.y, p.z);
            const across = Math.hypot(ref.x, ref.y);
            // the transverse part relative to itself (it is the Doppler factor: x′ = x/D), the part along the motion relative to r
            const t = Math.hypot(gpu[0] - ref.x, gpu[1] - ref.y) / (across > 0 ? across : r);
            const l = Math.abs(gpu[2] - ref.z) / r;
            transverse = Math.max(transverse, t);
            if (optical) {
              // what float32 arithmetic of the same formula gives (optics.ts emulates it with Math.fround)
              const single = aberratePoint(p, boost, Math.fround).position;
              emulated = Math.max(emulated, Math.hypot(single.x - ref.x, single.y - ref.y) / (across > 0 ? across : r));
            }
            longitudinal = Math.max(longitudinal, l);
            // mix(measured, seen, 1) is evaluated as measured + (seen − measured): one rounding at the size of the rest coordinate
            const mixRounding = (MIX_ROUNDING * Math.max(Math.abs(p.x), Math.abs(p.y))) / (across > 0 ? across : r);
            if (!(t <= BOOST_TOLERANCE + mixRounding && l <= BOOST_TOLERANCE)) {
              failures.push(
                `β ${beta}, optical ${optical}, rel (${p.x}, ${p.y}, ${p.z}): GPU ${gpu} reference ${ref.x}, ${ref.y}, ${ref.z}`
              );
            }
          });
          report.push(
            `${optical ? 'seen' : 'measured'} β ${beta}: ${transverse.toExponential(1)} / ${longitudinal.toExponential(1)}${optical ? ` (float32 emulation ${emulated.toExponential(1)})` : ''}`
          );
        }
      }
      console.info(
        `city vertex stage, ${count} points per β, largest error across (relative) / along (per r): ${report.join('; ')}`
      );
      expect(failures.slice(0, 10).join('\n'), `${failures.length} points out of tolerance`).toBe('');
    },
    GPU_TEST_TIMEOUT
  );

  // -------------------------------------------------------------------------
  // 5. Stars: the vertex stage of both star programs, by transform feedback
  // -------------------------------------------------------------------------

  it(
    'the flux law of the star vertex shaders agrees with starLnFlux, and their sky with the atlas',
    async (context) => {
      ready(context);
      const f = Math.fround;
      const field = generateStarField(atlas);
      // the field covers the sky above the haze; some stars all over the sphere besides
      const directions = Array.from(field.directions);
      const stars = Array.from(field.attributes);
      const random = generator(1979);
      for (let i = 0; i < 600; i++) {
        const z = 1 - (2 * (i + 0.5)) / 600;
        const ring = Math.sqrt(1 - z * z);
        const phi = i * Math.PI * (3 - Math.sqrt(5));
        const temperature = 2600 * (40_000 / 2600) ** random();
        directions.push(ring * Math.cos(phi), ring * Math.sin(phi), z);
        stars.push(
          -20 + 8 * random(),
          Math.log(temperature),
          sampleAtlas(atlas, ATLAS_ROW.blackbody, temperatureCoordinate(temperature))[3]
        );
      }
      const count = directions.length / 3;
      const pixelAngle = (2 * Math.tan(((SCENARIO.camera.fieldOfViewDeg / 2) * Math.PI) / 180)) / 900;
      const lnStarNorm = starLnNormalisation(starPointSize(1), pixelAngle);
      const temperatureTexel = (LN_TEMPERATURE_MAX - LN_TEMPERATURE_MIN) / ATLAS_WIDTH;
      const { sky, environment } = SCENARIO;
      const exposure = Math.exp(BASE_LN_EXPOSURE);
      const largest = (t: number[]): number => Math.max(...t.map(Math.abs));

      const failures: string[] = [];
      const report: string[] = [];
      for (const beta of [0, 0.6, 0.99, 0.99999]) {
        const boost = boostUniforms(beta);
        for (const program of ['starRadiance', 'stars'] as const) {
          const varyings =
            program === 'stars'
              ? [
                  { name: 'vRadiance', size: 3 },
                  { name: 'vSky', size: 3 },
                ]
              : [{ name: 'vRadiance', size: 3 }];
          const result = await call<{
            status: { linked: boolean; programLog: string };
            glError: number;
            captured: Record<string, number[]>;
          }>(
            'transformFeedback',
            {
              program,
              count,
              attributes: { position: { size: 3, data: directions }, aStar: { size: 3, data: stars } },
              varyings,
              uniforms: {
                uOnePlusBeta: float(boost.onePlusBeta),
                uOneMinusBeta: float(boost.oneMinusBeta),
                uGamma: float(boost.gamma),
                uOptical: float(1),
                uObserver: vec3(0, 0, 0),
                uLnStarNorm: float(lnStarNorm),
              },
            },
            `the ${program} vertex stage at β = ${beta}`
          );
          expect(result.status.linked, result.status.programLog).toBe(true);
          expect(result.glError).toBe(0);
          let worstRadiance = 0;
          let worstSky = 0;
          for (let i = 0; i < count; i++) {
            const [x, y, z] = [f(directions[3 * i]), f(directions[3 * i + 1]), f(directions[3 * i + 2])];
            const length = Math.hypot(x, y, z);
            const rest = { x: x / length, y: y / length, z: z / length };
            const seen = aberratePoint(rest, boost);
            const lnD = Math.log(seen.doppler);
            const cosAxis = -seen.position.z / Math.hypot(seen.position.x, seen.position.y, seen.position.z);
            const [lnIlluminance, lnT, lnLuminanceRest] = [f(stars[3 * i]), f(stars[3 * i + 1]), f(stars[3 * i + 2])];
            // the star's radiance at the centre of its sprite, after exposure, as the shader forms it
            const radiance = (shift: number): number[] => {
              const body = sampleAtlas(
                halfAtlas,
                ATLAS_ROW.blackbody,
                (lnT + lnD + shift - LN_TEMPERATURE_MIN) / (LN_TEMPERATURE_MAX - LN_TEMPERATURE_MIN)
              );
              const lnFlux = starLnFlux(lnIlluminance, lnLuminanceRest, body[3], lnD);
              const lnRadiance = Math.min(lnFlux + lnStarNorm + starLnOffAxis(cosAxis) + BASE_LN_EXPOSURE, STAR_LN_PEAK_MAX);
              return [0, 1, 2].map((c) => body[c] * Math.exp(lnRadiance));
            };
            const ref = radiance(0);
            const gpu = result.captured.vRadiance.slice(3 * i, 3 * i + 3);
            const size = largest(ref);
            const error = largest(gpu.map((v, c) => v - ref[c])) / size;
            const sensitivity = Math.max(
              ...[-temperatureTexel / 256, temperatureTexel / 256].map(
                (shift) => largest(radiance(shift).map((v, c) => v - ref[c])) / size
              )
            );
            worstRadiance = Math.max(worstRadiance, error);
            if (!(error <= sensitivity + STAR_TOLERANCE)) {
              failures.push(
                `${program} β ${beta} star ${i}: relative error ${error.toExponential(2)}; GPU ${gpu} reference ${ref}`
              );
            }
            if (program === 'stars') {
              const slope = rest.y / Math.max(Math.hypot(rest.x, rest.z), 1e-5);
              const level = exposure * (sky.glowZenith + sky.glowHorizon * Math.exp(-slope * sky.glowFalloff));
              // skyRadiance of chunks.ts, its two look-ups (LED glow, thermal emission) moved by the given shifts in ln D
              const skyAt = (glowShift: number, thermalShift: number): number[] => {
                const glow = reflectedRadiance(
                  halfAtlas,
                  'led',
                  sky.glowTint as unknown as Triple,
                  seen.doppler * Math.exp(glowShift)
                );
                const thermal = blackbodyRadiance(halfAtlas, environment.temperatureK * seen.doppler * Math.exp(thermalShift));
                return [0, 1, 2].map((c) => glow[c] * level + thermal[c] * environment.skyEmissivity * exposure);
              };
              const skyRef = skyAt(0, 0);
              const skySize = largest(skyRef);
              const skyChange = (moved: number[]): number => largest(moved.map((v, c) => v - skyRef[c])) / skySize;
              const dopplerStep = (Math.log(512) * 2) / ATLAS_WIDTH / 256;
              const skySensitivity =
                Math.max(skyChange(skyAt(-dopplerStep, 0)), skyChange(skyAt(dopplerStep, 0))) +
                Math.max(skyChange(skyAt(0, -temperatureTexel / 256)), skyChange(skyAt(0, temperatureTexel / 256)));
              const skyGpu = result.captured.vSky.slice(3 * i, 3 * i + 3);
              const skyError = largest(skyGpu.map((v, c) => v - skyRef[c])) / skySize;
              worstSky = Math.max(worstSky, skyError);
              if (!(skyError <= skySensitivity + STAR_TOLERANCE)) {
                failures.push(
                  `stars β ${beta} star ${i}: sky relative error ${skyError.toExponential(2)} (filter ${skySensitivity.toExponential(2)})`
                );
              }
            }
          }
          report.push(
            `${program} β ${beta}: ${worstRadiance.toExponential(1)}${program === 'stars' ? ` (sky ${worstSky.toExponential(1)})` : ''}`
          );
        }
      }
      console.info(`star vertex stages, ${count} stars, largest relative error of the radiance: ${report.join('; ')}`);
      expect(failures.slice(0, 10).join('\n'), `${failures.length} stars out of tolerance`).toBe('');
    },
    GPU_TEST_TIMEOUT
  );

  // -------------------------------------------------------------------------
  // 6. The Moon: MOON_DISC of sky.ts, with its own screen-space derivatives
  // -------------------------------------------------------------------------

  it(
    'the lunar disc is round and keeps its flux, resolved, unresolved and in between',
    async (context) => {
      ready(context);
      // The Moon of the scenario dead ahead of a pinhole view along −z, its centre on the corner of four pixels (and
      // of four 2 × 2 quads, in which the derivatives are formed). Pixels from a sixth of its radius (resolved) to three
      // times it (a point source): in the application the pixel's footprint in the rest frame grows with D in the same way.
      const SIDE = 48;
      const radius = (SCENARIO.moon.angularRadiusDeg * Math.PI) / 180;
      const failures: string[] = [];
      const report: string[] = [];
      for (const radiusPx of [0.3, 0.6, 1, 1.5, 2, 2.5, 3, 4, 6]) {
        const pixel = radius / radiusPx;
        const fragmentShader = /* glsl */ `
        uniform highp sampler2D uInputA;
        uniform highp sampler2D uInputB;
        ${MOON_DISC}
        void main() {
          vec2 p = (gl_FragCoord.xy - vec2(${SIDE / 2}.0)) * ${glslFloat(pixel)};
          vec3 d = normalize(vec3(p, -1.0));
          gl_FragColor = vec4(moonDisc(d, vec3(0.0, 0.0, -1.0), ${glslFloat(radius)}), 0.0, 0.0, 1.0);
        }
      `;
        const result = await call<{ reported: unknown[]; glError: number; pixels: number[] }>(
          'evaluateFragment',
          { fragmentShader, width: SIDE, height: SIDE, output: 'float' },
          `the Moon at a radius of ${radiusPx} px`
        );
        expect(result.reported).toEqual([]);
        expect(result.glError).toBe(0);
        const samples: Array<{ r: number; share: number }> = [];
        let flux = 0;
        for (let j = 0; j < SIDE; j++) {
          for (let i = 0; i < SIDE; i++) {
            const x = i + 0.5 - SIDE / 2;
            const y = j + 0.5 - SIDE / 2;
            const share = result.pixels[4 * (j * SIDE + i)];
            // solid angle of the pixel of a pinhole camera: (pixel angle)² cos³θ
            flux += share * pixel ** 2 * (1 + (x * x + y * y) * pixel ** 2) ** -1.5;
            samples.push({ r: Math.hypot(x, y), share });
          }
        }
        // Round: the brightness falls with the distance from the centre alone. Ordered by distance, no pixel may look
        // brighter than one more than a quarter of a pixel nearer the centre. The disc's luminance is about 490 times
        // the reference white, so a share of 1/490 is already drawn about as bright as white and everything well above
        // it white: brightness is measured as share / (share + that share), 0 for none, ½ at white, 1 for the disc.
        const white = REFERENCE_LUMINANCE_CD_M2 / MOON_DISC_LUMINANCE_CD_M2;
        const seen = (share: number): number => share / (share + white);
        samples.sort((a, b) => a.r - b.r);
        let rise = 0;
        let lowest = Infinity;
        let k = 0;
        for (const sample of samples) {
          while (samples[k].r < sample.r - 0.25) lowest = Math.min(lowest, seen(samples[k++].share));
          rise = Math.max(rise, seen(sample.share) - lowest);
        }
        const disc = 2 * Math.PI * (1 - Math.cos(radius));
        const fluxError = flux / disc - 1;
        report.push(`r ${radiusPx} px: rise ${rise.toFixed(3)}, flux ${(100 * fluxError).toFixed(1)} %`);
        if (!(rise <= MOON_ROUNDNESS)) failures.push(`radius ${radiusPx} px: brighter by ${rise.toFixed(3)} outwards`);
        if (!(Math.abs(fluxError) <= MOON_FLUX))
          failures.push(`radius ${radiusPx} px: flux off by ${(100 * fluxError).toFixed(2)} %`);
      }
      console.info(`Moon disc: ${report.join('; ')}`);
      expect(failures.join('\n')).toBe('');

      // Nothing of the Moon away from it. The view now looks across the great circle 90° from the Moon, where the
      // angle from its centre jumps to π: with the footprint taken from that angle, the jump drew a dashed arc of
      // spurious light across the sky (seen at 0.99 c, where the Doppler gain makes 10⁻⁶ of the disc visible). The
      // circle runs down the middle of a column of 2 × 2 quads, so that the derivatives are formed across it.
      const pixel = radius / 0.3;
      const across = await call<{ reported: unknown[]; glError: number; pixels: number[] }>(
        'evaluateFragment',
        {
          fragmentShader: /* glsl */ `
          uniform highp sampler2D uInputA;
          uniform highp sampler2D uInputB;
          ${MOON_DISC}
          void main() {
            vec3 d = normalize(vec3((gl_FragCoord.xy - vec2(${SIDE / 2 - 1}.0, ${SIDE / 2}.0)) * ${glslFloat(pixel)}, -1.0));
            gl_FragColor = vec4(moonDisc(d, vec3(1.0, 0.0, 0.0), ${glslFloat(radius)}), 0.0, 0.0, 1.0);
          }
        `,
          width: SIDE,
          height: SIDE,
          output: 'float',
        },
        'the sky 90° from the Moon'
      );
      expect(across.glError).toBe(0);
      const stray = Math.max(...across.pixels.filter((_, i) => i % 4 === 0));
      console.info(`Moon disc: largest share 90° from the Moon ${stray.toExponential(1)}`);
      expect(stray).toBe(0);
    },
    GPU_TEST_TIMEOUT
  );
});
