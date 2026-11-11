'use client';

/**
 * The simulation proper: geometry, materials and the per-frame update.
 *
 * Coordinates. The observer's eye is fixed at (0, OBSERVER_Y, 0) and looks along
 * −z; the avenue streams past in +z. All geometry is kept in its REST frame —
 * the boost is applied by the shaders, never baked into positions.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { meterLnExposure } from '@/physics/exposure';
import { BETA_MAX, lorentzFactor } from '@/physics/kinematics';
import { SCENARIO } from '@/physics/scenario';
import { sharedAtlas } from '@/physics/spectralAtlas';
import { getSettings, look, nearestTurn, notifyFrame, setLoadPhase, telemetry } from '@/state/simulation';
import {
  type BlockGeometry,
  type PreparedModel,
  LEVELS_OF_DETAIL,
  buildBlock,
  levelOfDetail,
  prepareModel,
} from './geometry/build';
import { type ModelPath, CHUNK_COUNT, CHUNK_LENGTH, MODEL_PATHS, VARIANT_COUNT, modelRole } from './geometry/layout';
import { generateStarField, starLnNormalisation, starPointSize } from './geometry/stars';
import { adaptResolution, createResolutionState, preferredPixelRatio } from './resolution';
import { cityFragmentShader, cityVertexShader } from './shaders/city';
import { skyFragmentShader, skyVertexShader } from './shaders/sky';
import { starFragmentShader, starRadianceFragmentShader, starRadianceVertexShader, starVertexShader } from './shaders/stars';
import {
  BASE_LN_EXPOSURE,
  FADE_AHEAD_END,
  FADE_BEHIND_END,
  MODEL_BEHIND,
  MODEL_LENGTH,
  OBSERVER_Y,
  createAtlasTexture,
  createSceneUniforms,
} from './uniforms';

/** Time constants of the eased quantities, s. */
const SPEED_RESPONSE = 0.32;
const VIEW_BLEND_RESPONSE = 0.28;
const LOOK_RESPONSE = 0.09;
const LENS_RESPONSE = 0.22;
/** The eye adapts to brightness faster than to darkness. */
const EXPOSURE_RESPONSE_DOWN = 0.35;
const EXPOSURE_RESPONSE_UP = 1.1;

/** Time after the avenue has appeared during which the frame rate is not yet judged, s. */
const RESOLUTION_GRACE = 2;

const GRID_PERIOD = 50;

/** Yields to the event loop. A timer, not requestAnimationFrame: frames stop in a hidden tab, start-up must not. */
const breathe = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Whether the stars can be summed in radiance: that needs a half-float target that can be rendered to and
 * blended into, which WebGL 2 provides with either extension (see shaders/stars.ts).
 */
function supportsStarRadiance(gl: THREE.WebGLRenderer): boolean {
  return gl.extensions.has('EXT_color_buffer_float') || gl.extensions.has('EXT_color_buffer_half_float');
}

/** Exponential approach of `current` to `target` with time constant `tau`. */
function ease(current: number, target: number, dt: number, tau: number): number {
  return target + (current - target) * Math.exp(-dt / tau);
}

/** Builds the block geometries off the critical path, yielding to the browser between steps. */
function useBlocks(scenes: ReadonlyArray<THREE.Object3D>): BlockGeometry[][] | null {
  const [blocks, setBlocks] = useState<BlockGeometry[][] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const built: BlockGeometry[][] = [];

    const run = async (): Promise<void> => {
      setLoadPhase('building', 0);
      await breathe();
      const bitmaps = new Map();
      const models = new Map<ModelPath, PreparedModel>();
      for (let i = 0; i < MODEL_PATHS.length; i++) {
        const path = MODEL_PATHS[i];
        models.set(path, prepareModel(scenes[i], modelRole(path), bitmaps));
        if (i % 5 === 4) {
          setLoadPhase('building', (0.25 * (i + 1)) / MODEL_PATHS.length);
          await breathe();
          if (cancelled) return;
        }
      }
      const steps = VARIANT_COUNT * LEVELS_OF_DETAIL.length;
      for (let variant = 0; variant < VARIANT_COUNT; variant++) {
        const levels: BlockGeometry[] = [];
        built.push(levels);
        for (let level = 0; level < LEVELS_OF_DETAIL.length; level++) {
          levels.push(buildBlock(variant, level, models));
          setLoadPhase('building', 0.25 + (0.75 * (variant * LEVELS_OF_DETAIL.length + level + 1)) / steps);
          await breathe();
          if (cancelled) return;
        }
      }
      setBlocks(built);
      setLoadPhase('ready', 1);
    };

    run().catch((error: unknown) => {
      if (!cancelled) setLoadPhase('error', 0, error instanceof Error ? error.message : String(error));
    });

    return () => {
      cancelled = true;
      built.forEach((levels) => levels.forEach((block) => block.geometry.dispose()));
    };
  }, [scenes]);

  return blocks;
}

interface SimulationProps {
  /** Device pixel ratio the canvas is drawn at, and the way to ask for another (see resolution.ts). */
  readonly pixelRatio: number;
  readonly onPixelRatio: (ratio: number) => void;
}

export default function Simulation({ pixelRatio, onPixelRatio }: SimulationProps) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);

  const gltfs = useGLTF(MODEL_PATHS as unknown as string[]);
  const scenes = useMemo(() => gltfs.map((gltf) => gltf.scene), [gltfs]);
  const blocks = useBlocks(scenes);

  // --- physics tables and GPU resources (created once)
  const atlas = useMemo(() => sharedAtlas(), []);
  const resources = useMemo(() => {
    const texture = createAtlasTexture(atlas);
    const uniforms = createSceneUniforms(atlas, texture);

    const city = new THREE.ShaderMaterial({
      vertexShader: cityVertexShader,
      fragmentShader: cityFragmentShader,
      uniforms,
      side: THREE.DoubleSide,
      // the model dissolves at its ends through the multisample coverage (see city.ts)
      alphaToCoverage: true,
    });
    const sky = new THREE.ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
    });
    // The stars are summed in radiance in a target of their own, which the sky reads; where that cannot be
    // done they are drawn over the sky, each as the increment it makes on the display (shaders/stars.ts).
    const starTarget = supportsStarRadiance(gl)
      ? new THREE.WebGLRenderTarget(1, 1, {
          type: THREE.HalfFloatType,
          format: THREE.RGBAFormat,
          minFilter: THREE.NearestFilter,
          magFilter: THREE.NearestFilter,
          generateMipmaps: false,
          depthBuffer: false,
          stencilBuffer: false,
        })
      : null;
    const starMaterial = new THREE.ShaderMaterial({
      vertexShader: starTarget ? starRadianceVertexShader : starVertexShader,
      fragmentShader: starTarget ? starRadianceFragmentShader : starFragmentShader,
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: !starTarget,
      depthWrite: false,
    });

    const skyGeometry = new THREE.BoxGeometry(2, 2, 2);
    const field = generateStarField(atlas);
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(field.directions, 3));
    starGeometry.setAttribute('aStar', new THREE.BufferAttribute(field.attributes, 3));
    starGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Number.POSITIVE_INFINITY);

    let starScene: THREE.Scene | null = null;
    if (starTarget) {
      const noStars = uniforms.uStars.value as THREE.Texture;
      noStars.dispose();
      uniforms.uStars.value = starTarget.texture;
      starScene = new THREE.Scene();
      const points = new THREE.Points(starGeometry, starMaterial);
      points.frustumCulled = false;
      starScene.add(points);
    }

    return { texture, uniforms, city, sky, starMaterial, skyGeometry, starGeometry, starTarget, starScene };
  }, [atlas, gl]);

  // In development the scene runs under StrictMode (react-three-fiber 9 takes it from React DOM), which runs this
  // cleanup once right after mounting while the same resources stay in use. That is safe: dispose() frees only the
  // GPU copies, and three.js creates them again when the objects are next drawn (textures and the target included).
  useEffect(
    () => () => {
      resources.texture.dispose();
      resources.city.dispose();
      resources.sky.dispose();
      resources.starMaterial.dispose();
      resources.skyGeometry.dispose();
      resources.starGeometry.dispose();
      // the sky reads either the target's texture or the black stand-in
      if (resources.starTarget) resources.starTarget.dispose();
      else (resources.uniforms.uStars.value as THREE.Texture).dispose();
    },
    [resources]
  );

  const blockRefs = useRef<Array<THREE.Mesh | null>>([]);
  // eased state of the simulation
  const state = useRef({
    rapidity: 0,
    optical: 1,
    thermal: 1,
    grid: 0,
    yaw: 0,
    pitch: 0,
    zoom: 1,
    lnExposure: 0,
    // start in a clear stretch of road rather than beside a parked car
    travel: 13,
    fpsWindow: 0,
    fpsFrames: 0,
    // the frame rate is judged only from this time on, s (building the avenue stalls the first frames)
    adaptFrom: Number.POSITIVE_INFINITY,
  });
  const resolution = useRef(createResolutionState());
  const scratch = useMemo(() => ({ buffer: new THREE.Vector2(), clearColour: new THREE.Color() }), []);

  // Once the avenue is on screen, give the frame rate a moment to settle before judging it.
  useEffect(() => {
    if (blocks) state.current.adaptFrom = performance.now() / 1000 + RESOLUTION_GRACE;
  }, [blocks]);

  // The ends of the model dissolve by sample coverage where the framebuffer is multisampled.
  useEffect(() => {
    const context = gl.getContext();
    // eslint-disable-next-line react-hooks/immutability -- a uniform is the shaders' input and is written in place by design
    resources.uniforms.uCoverage.value = Number(context.getParameter(context.SAMPLES)) > 0 ? 1 : 0;
  }, [gl, resources]);

  /* eslint-disable react-hooks/immutability -- the frame loop writes uniforms, camera and renderer state in place, as three.js is driven */
  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const settings = getSettings();
    const s = state.current;
    const u = resources.uniforms;

    // --- velocity: ease in rapidity, i.e. apply a smooth boost
    const targetRapidity = Math.atanh(Math.min(settings.beta, BETA_MAX));
    s.rapidity = ease(s.rapidity, targetRapidity, dt, SPEED_RESPONSE);
    if (Math.abs(s.rapidity - targetRapidity) < 1e-7) s.rapidity = targetRapidity;
    const beta = Math.min(Math.tanh(s.rapidity), BETA_MAX);
    const gamma = lorentzFactor(beta);
    u.uOnePlusBeta.value = 1 + beta;
    u.uOneMinusBeta.value = 1 - beta;
    u.uGamma.value = gamma;

    // --- view mode and physical layers
    const optical = settings.view === 'seen';
    s.optical = ease(s.optical, optical ? 1 : 0, dt, VIEW_BLEND_RESPONSE);
    if (Math.abs(s.optical - (optical ? 1 : 0)) < 1e-4) s.optical = optical ? 1 : 0;
    s.thermal = ease(s.thermal, settings.thermal ? 1 : 0, dt, VIEW_BLEND_RESPONSE);
    s.grid = optical ? 0 : 1;
    u.uOptical.value = s.optical;
    u.uThermal.value = s.thermal;
    u.uGrid.value = s.grid;

    // --- motion along the avenue. The display is locked to the street's time t.
    if (!settings.paused) {
      const step = beta * SCENARIO.visualLightSpeed * dt;
      s.travel += step;
      telemetry.distance += step;
      telemetry.earthTime += dt;
      telemetry.properTime += dt / gamma;
    }
    const offset = s.travel % MODEL_LENGTH;
    for (let i = 0; i < CHUNK_COUNT; i++) {
      const mesh = blockRefs.current[i];
      if (!mesh) continue;
      let ahead = (i * CHUNK_LENGTH - offset + MODEL_BEHIND) % MODEL_LENGTH;
      if (ahead < 0) ahead += MODEL_LENGTH;
      const centre = ahead - MODEL_BEHIND;
      mesh.position.z = -centre;
      if (blocks) {
        const nearestAhead = centre - CHUNK_LENGTH / 2;
        const geometry = blocks[i % VARIANT_COUNT][levelOfDetail(nearestAhead)].geometry;
        if (mesh.geometry !== geometry) mesh.geometry = geometry;
        // a block that has dissolved completely at either end of the model need not be drawn
        mesh.visible = nearestAhead < FADE_AHEAD_END && centre + CHUNK_LENGTH / 2 > -FADE_BEHIND_END;
      }
    }
    u.uOdometer.value = s.travel % GRID_PERIOD;

    // --- camera: free look and lens
    // the shorter way round when the target has crossed "straight behind" (see nearestTurn)
    s.yaw = ease(s.yaw, nearestTurn(s.yaw, look.yaw), dt, LOOK_RESPONSE);
    if (s.yaw > Math.PI) s.yaw -= 2 * Math.PI;
    else if (s.yaw < -Math.PI) s.yaw += 2 * Math.PI;
    s.pitch = ease(s.pitch, look.pitch, dt, LOOK_RESPONSE);
    s.zoom = Math.exp(ease(Math.log(s.zoom), Math.log(settings.lens), dt, LENS_RESPONSE));
    const baseHalf = Math.tan(THREE.MathUtils.degToRad(SCENARIO.camera.fieldOfViewDeg) / 2);
    const fieldOfView = 2 * Math.atan(baseHalf / s.zoom);
    camera.position.set(0, OBSERVER_Y, 0);
    camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
    const fovDegrees = THREE.MathUtils.radToDeg(fieldOfView);
    if (Math.abs(camera.fov - fovDegrees) > 1e-4) {
      camera.fov = fovDegrees;
      camera.updateProjectionMatrix();
    }

    // --- exposure
    const metered = meterLnExposure(atlas, {
      beta,
      yaw: s.yaw,
      pitch: s.pitch,
      fieldOfView,
      aspect: size.width / Math.max(size.height, 1),
      optical: s.optical > 0.5,
      thermal: settings.thermal,
    });
    s.lnExposure = ease(s.lnExposure, metered, dt, metered < s.lnExposure ? EXPOSURE_RESPONSE_DOWN : EXPOSURE_RESPONSE_UP);
    u.uLnExposure.value = BASE_LN_EXPOSURE + s.lnExposure;

    // --- telemetry (the triangles of the last frame: read before the star pass below starts a new count)
    telemetry.beta = beta;
    telemetry.lnExposure = s.lnExposure;
    telemetry.yaw = s.yaw;
    telemetry.pitch = s.pitch;
    telemetry.fieldOfView = fieldOfView;
    telemetry.triangles = gl.info.render.triangles;

    // --- stars: a point-spread function of constant size in device pixels; flux → radiance through the solid
    // angle it covers (on the optical axis here; the shader adds the off-axis factor)
    const buffer = gl.getDrawingBufferSize(scratch.buffer);
    const pointSize = starPointSize(gl.getPixelRatio());
    const pixelAngle = (2 * Math.tan(fieldOfView / 2)) / Math.max(buffer.y, 1);
    u.uPointSize.value = pointSize;
    u.uLnStarNorm.value = starLnNormalisation(pointSize, pixelAngle);
    const { starTarget, starScene } = resources;
    if (starTarget && starScene) {
      // the target follows the drawing buffer: the canvas size and the adaptive pixel ratio
      if (starTarget.width !== buffer.x || starTarget.height !== buffer.y) {
        starTarget.setSize(buffer.x, buffer.y);
        (u.uStarsTexel.value as THREE.Vector2).set(1 / buffer.x, 1 / buffer.y);
      }
      const previousTarget = gl.getRenderTarget();
      const previousAlpha = gl.getClearAlpha();
      const autoClear = gl.autoClear;
      gl.getClearColor(scratch.clearColour);
      gl.setRenderTarget(starTarget);
      gl.setClearColor(0x000000, 0);
      gl.clear(true, false, false);
      gl.autoClear = false;
      gl.render(starScene, camera);
      gl.autoClear = autoClear;
      gl.setClearColor(scratch.clearColour, previousAlpha);
      gl.setRenderTarget(previousTarget);
    }

    // --- frame rate and resolution scaling
    s.fpsWindow += rawDelta;
    s.fpsFrames += 1;
    if (s.fpsWindow >= 0.5) {
      const fps = s.fpsFrames / s.fpsWindow;
      telemetry.fps = fps;
      const now = performance.now() / 1000;
      if (now >= s.adaptFrom) {
        const ceiling = preferredPixelRatio(window.devicePixelRatio);
        const next = adaptResolution(resolution.current, pixelRatio, fps, s.fpsWindow, now, ceiling);
        if (next !== pixelRatio) onPixelRatio(next);
      }
      s.fpsWindow = 0;
      s.fpsFrames = 0;
    }

    notifyFrame();
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group>
      {blocks &&
        Array.from({ length: CHUNK_COUNT }, (_, index) => (
          <mesh
            key={index}
            ref={(mesh) => {
              blockRefs.current[index] = mesh;
            }}
            geometry={blocks[index % VARIANT_COUNT][LEVELS_OF_DETAIL.length - 1].geometry}
            material={resources.city}
            frustumCulled={false}
          />
        ))}
      <mesh geometry={resources.skyGeometry} material={resources.sky} frustumCulled={false} renderOrder={10} />
      {!resources.starTarget && (
        <points geometry={resources.starGeometry} material={resources.starMaterial} frustumCulled={false} renderOrder={11} />
      )}
    </group>
  );
}

// Start downloading as soon as this module is evaluated; same cache key as the hook above.
useGLTF.preload(MODEL_PATHS as unknown as string[]);
