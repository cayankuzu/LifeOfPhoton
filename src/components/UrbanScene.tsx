'use client';

import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  cosmosDomeFragmentShader,
  cosmosDomeVertexShader,
  createGlbRelativisticMaterial,
  createSharedRelativisticUniforms,
  RelativisticUniforms,
} from '@/shaders/relativisticShader';
import {
  ALL_GLB_MODEL_PATHS,
  CHUNK_LENGTH,
  getChunkGlbPlacements,
  NUM_CHUNKS,
  subdivideGeometryForRelativity,
} from '@/lib/urbanBuilder';
import { computeGamma } from '@/lib/relativity';

export interface TelemetryData {
  earthTimeSec: number;
  properTimeSec: number;
  earthDistanceMeters: number;
  contractedDistanceMeters: number;
}

export interface UrbanSceneProps {
  beta: number;
  opticalMode: boolean;
  motionActive: boolean;
  scrollImpulseRef: React.MutableRefObject<number>;
  telemetryRef: React.MutableRefObject<TelemetryData>;
}

const VARIANT_COUNT = 6;
const VISUAL_LIGHT_SPEED_MPS = 48.0;

interface ProcessedMeshPart {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
}

function RelativisticGlbCity({
  beta,
  opticalMode,
  motionActive,
  scrollImpulseRef,
  telemetryRef,
}: UrbanSceneProps) {
  const { camera } = useThree();
  const gltfs = useGLTF(ALL_GLB_MODEL_PATHS as unknown as string[]);

  const chunkGroupRefs = useRef<Array<THREE.Group | null>>([]);
  const domeMeshRef = useRef<THREE.Mesh | null>(null);
  const travelDistanceRef = useRef<number>(0);
  const smoothedBetaRef = useRef<number>(beta);
  const opticalBlendRef = useRef<number>(opticalMode ? 1.0 : 0.0);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const sharedUniforms: RelativisticUniforms = useMemo(
    () => createSharedRelativisticUniforms(),
    []
  );

  // Full 360-degree Relativistic Earth Horizon & Cosmos Sphere
  const cosmosDomeMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: cosmosDomeVertexShader,
        fragmentShader: cosmosDomeFragmentShader,
        uniforms: {
          uBeta: sharedUniforms.uBeta,
          uGamma: sharedUniforms.uGamma,
          uTime: sharedUniforms.uTime,
          uOpticalMode: sharedUniforms.uOpticalMode,
        },
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [sharedUniforms]
  );

  // Parse GLBs into subdivided geometry buckets per material
  const chunkVariants = useMemo(() => {
    const modelPartsMap = new Map<
      string,
      Array<{
        geometry: THREE.BufferGeometry;
        material: THREE.ShaderMaterial;
      }>
    >();

    const materialsByTexture = new Map<string, THREE.ShaderMaterial>();

    const getSharedMaterial = (
      tex: THREE.Texture | null,
      baseColor: THREE.Color,
      isEmissive: number
    ): THREE.ShaderMaterial => {
      const key = `${tex ? tex.uuid : 'notex'}_${baseColor.getHexString()}_${isEmissive}`;
      let mat = materialsByTexture.get(key);
      if (!mat) {
        mat = createGlbRelativisticMaterial(sharedUniforms, tex, baseColor, isEmissive);
        materialsByTexture.set(key, mat);
      }
      return mat;
    };

    ALL_GLB_MODEL_PATHS.forEach((modelPath, idx) => {
      const gltf = gltfs[idx];
      if (!gltf || !gltf.scene) return;

      const rawParts: Array<{
        geometry: THREE.BufferGeometry;
        material: THREE.ShaderMaterial;
      }> = [];

      gltf.scene.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          const stdMat = origMat as THREE.MeshStandardMaterial;

          const tex = stdMat?.map || null;
          const baseColor = stdMat?.color ? stdMat.color.clone() : new THREE.Color(1, 1, 1);
          const isEmissive =
            (stdMat?.emissive && stdMat.emissive.getHex() > 0) ||
            mesh.name.toLowerCase().includes('light') ||
            mesh.name.toLowerCase().includes('lamp')
              ? 1.0
              : 0.0;

          const relMat = getSharedMaterial(tex, baseColor, isEmissive);

          const geom = mesh.geometry.clone();
          geom.applyMatrix4(mesh.matrixWorld);
          rawParts.push({ geometry: geom, material: relMat });
        }
      });

      modelPartsMap.set(modelPath, rawParts);
    });

    const variants: ProcessedMeshPart[][] = [];

    for (let v = 0; v < VARIANT_COUNT; v++) {
      const placements = getChunkGlbPlacements(v);
      const bucketByMaterial = new Map<
        THREE.ShaderMaterial,
        { positions: number[]; normals: number[]; uvs: number[] }
      >();

      const appendWorldSubdividedGeometry = (
        localGeom: THREE.BufferGeometry,
        mat: THREE.ShaderMaterial,
        worldMatrix: THREE.Matrix4,
        maxEdgeMeters: number,
        maxIter: number
      ) => {
        let bucket = bucketByMaterial.get(mat);
        if (!bucket) {
          bucket = { positions: [], normals: [], uvs: [] };
          bucketByMaterial.set(mat, bucket);
        }

        const transformed = localGeom.clone();
        transformed.applyMatrix4(worldMatrix);
        const subdivided = subdivideGeometryForRelativity(transformed, maxEdgeMeters, maxIter);
        transformed.dispose();

        const pos = subdivided.getAttribute('position');
        const norm = subdivided.getAttribute('normal');
        const uv = subdivided.getAttribute('uv');

        for (let i = 0; i < pos.count; i++) {
          bucket.positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
          if (norm) {
            bucket.normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
          } else {
            bucket.normals.push(0, 1, 0);
          }
          if (uv) {
            bucket.uvs.push(uv.getX(i), uv.getY(i));
          } else {
            bucket.uvs.push(0, 0);
          }
        }
        subdivided.dispose();
      };

      const dummyObj = new THREE.Object3D();

      for (const pl of placements) {
        const parts = modelPartsMap.get(pl.modelPath);
        if (!parts) continue;

        dummyObj.position.set(pl.position[0], pl.position[1], pl.position[2]);
        dummyObj.rotation.set(pl.rotation[0], pl.rotation[1], pl.rotation[2]);
        dummyObj.scale.set(pl.scale[0], pl.scale[1], pl.scale[2]);
        dummyObj.updateMatrix();

        const isGroundTile =
          pl.modelPath.includes('road') || pl.modelPath.includes('pavement');
        const isBuilding =
          pl.modelPath.includes('building') || pl.modelPath.includes('skyscraper');

        const maxEdgeMeters = isGroundTile ? 2.0 : isBuilding ? 2.4 : 1.8;
        const maxIter = isGroundTile || isBuilding ? 3 : 2;

        for (const part of parts) {
          appendWorldSubdividedGeometry(
            part.geometry,
            part.material,
            dummyObj.matrix,
            maxEdgeMeters,
            maxIter
          );
        }
      }

      // Dashed lane lines along the center of the avenue
      const dashGeom = new THREE.BoxGeometry(0.15, 0.012, 3.0, 1, 1, 3);
      const dashZs = v % 2 === 0 ? [-14.0, -8.0, -2.0, 4.0] : [-14.0, -8.0, -2.0, 4.0, 10.0, 15.0];
      for (const dz of dashZs) {
        dummyObj.position.set(0, 0.205, dz);
        dummyObj.rotation.set(0, 0, 0);
        dummyObj.scale.set(1, 1, 1);
        dummyObj.updateMatrix();

        const yellowLineMat = getSharedMaterial(null, new THREE.Color(1.0, 0.85, 0.2), 0.35);
        appendWorldSubdividedGeometry(dashGeom, yellowLineMat, dummyObj.matrix, 2.0, 1);
      }
      dashGeom.dispose();

      const variantList: ProcessedMeshPart[] = [];
      bucketByMaterial.forEach((data, mat) => {
        if (data.positions.length === 0) return;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(new Float32Array(data.positions), 3)
        );
        geom.setAttribute(
          'normal',
          new THREE.Float32BufferAttribute(new Float32Array(data.normals), 3)
        );
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(data.uvs), 2));
        geom.computeBoundingBox();
        geom.computeBoundingSphere();
        variantList.push({ geometry: geom, material: mat });
      });

      variants.push(variantList);
    }

    return variants;
  }, [gltfs, sharedUniforms]);

  // Subtle interactive parallax lookaround
  useEffect(() => {
    const onPointerMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      pointerRef.current = { x: nx, y: ny };
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    return () => window.removeEventListener('mousemove', onPointerMove);
  }, []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);

    // Smoothly interpolate velocity beta for realistic acceleration
    const lerpRate = Math.min(1.0, dt * 14.0);
    smoothedBetaRef.current += (beta - smoothedBetaRef.current) * lerpRate;
    if (Math.abs(beta - smoothedBetaRef.current) < 1e-6) {
      smoothedBetaRef.current = beta;
    }

    const activeBeta = smoothedBetaRef.current;
    const gamma = computeGamma(activeBeta);

    const targetOptical = opticalMode ? 1.0 : 0.0;
    opticalBlendRef.current += (targetOptical - opticalBlendRef.current) * Math.min(1, dt * 8);

    const impulse = scrollImpulseRef.current;
    scrollImpulseRef.current *= Math.pow(0.04, dt);
    if (Math.abs(scrollImpulseRef.current) < 0.001) {
      scrollImpulseRef.current = 0;
    }

    const vVisual = motionActive ? activeBeta * VISUAL_LIGHT_SPEED_MPS : 0;
    const stepMeters = vVisual * dt + impulse * 5.5;

    travelDistanceRef.current += Math.max(0, stepMeters);

    if (motionActive || activeBeta > 0) {
      telemetryRef.current.earthTimeSec += dt;
      // Relativistic Time Dilation: proper time d\tau = dt / \gamma. At beta -> 1, proper time freezes!
      telemetryRef.current.properTimeSec += dt / gamma;
      const distIncrement = Math.max(0, stepMeters);
      telemetryRef.current.earthDistanceMeters += distIncrement;
      // Lorentz Length Contraction: L' = L / \gamma. At beta -> 1, distance contracts to 0!
      telemetryRef.current.contractedDistanceMeters =
        telemetryRef.current.earthDistanceMeters / gamma;
    }

    // PHOTON 1ST PERSON REFERENCE FRAME:
    // Observer moves forward through the city along -Z.
    // Parallax mouse tilt enables subtle inspection of aberrated side and rear horizons.
    const camX = pointerRef.current.x * 0.35;
    const camY = 1.85 - pointerRef.current.y * 0.15;
    camera.position.set(camX, camY, 0);
    camera.lookAt(camX * 0.5, camY, -60);

    sharedUniforms.uBeta.value = activeBeta;
    sharedUniforms.uGamma.value = gamma;

    if (domeMeshRef.current) {
      domeMeshRef.current.position.copy(camera.position);
    }

    // Recycle 20 chunks along the avenue
    const totalLength = NUM_CHUNKS * CHUNK_LENGTH;
    const baseOffset = travelDistanceRef.current % totalLength;

    for (let i = 0; i < NUM_CHUNKS; i++) {
      const grp = chunkGroupRefs.current[i];
      if (!grp) continue;

      let zPos = (i * CHUNK_LENGTH - baseOffset) % totalLength;
      if (zPos < 0) zPos += totalLength;
      const centeredZ = 3.0 * CHUNK_LENGTH - zPos;
      grp.position.set(0, 0, centeredZ);
    }

    sharedUniforms.uCameraPos.value.copy(camera.position);
    sharedUniforms.uTime.value = telemetryRef.current.earthTimeSec;
    sharedUniforms.uProperTime.value = telemetryRef.current.properTimeSec;
    sharedUniforms.uOpticalMode.value = opticalBlendRef.current;
  });

  return (
    <group>
      {/* 360-Degree Relativistic Earth Horizon & Cosmos Sphere */}
      <mesh ref={domeMeshRef} material={cosmosDomeMaterial} frustumCulled={false}>
        <sphereGeometry args={[780, 64, 48]} />
      </mesh>

      {/* 20 Looping 3D GLB Urban Street Blocks */}
      {Array.from({ length: NUM_CHUNKS }).map((_, chunkIdx) => {
        const variantParts = chunkVariants[chunkIdx % VARIANT_COUNT] || [];
        return (
          <group
            key={chunkIdx}
            ref={(el) => {
              chunkGroupRefs.current[chunkIdx] = el;
            }}
          >
            {variantParts.map((part, pIdx) => (
              <mesh
                key={pIdx}
                geometry={part.geometry}
                material={part.material}
                frustumCulled={false}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}

ALL_GLB_MODEL_PATHS.forEach((p) => useGLTF.preload(p));

export default function UrbanScene(props: UrbanSceneProps) {
  return (
    <div className="fixed inset-0 z-0 h-full w-full bg-[#05070a]">
      <Canvas
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        camera={{
          fov: 65,
          near: 0.2,
          far: 980,
          position: [0, 1.85, 0],
        }}
      >
        <color attach="background" args={['#05070a']} />
        <Suspense fallback={null}>
          <RelativisticGlbCity {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
