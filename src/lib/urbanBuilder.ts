import * as THREE from 'three';

export const CHUNK_LENGTH = 36; // 3 tiles of 12m = 36m per chunk
export const NUM_CHUNKS = 20; // 20 * 36m = 720m continuous looping urban corridor

export const ALL_GLB_MODEL_PATHS = [
  '/models/building-a.glb',
  '/models/building-b.glb',
  '/models/building-c.glb',
  '/models/building-d.glb',
  '/models/building-e.glb',
  '/models/building-f.glb',
  '/models/building-g.glb',
  '/models/building-h.glb',
  '/models/skyscraper-a.glb',
  '/models/skyscraper-b.glb',
  '/models/skyscraper-c.glb',
  '/models/skyscraper-d.glb',
  '/models/road-straight.glb',
  '/models/road-crossing.glb',
  '/models/pavement.glb',
  '/models/light-curved.glb',
  '/models/light-double.glb',
  '/models/traffic-light.glb',
  '/models/sign-highway.glb',
  '/models/tree-large.glb',
  '/models/tree-small.glb',
  '/models/tree-park.glb',
  '/models/tree-pine.glb',
  '/models/bench.glb',
  '/models/parasol.glb',
  '/models/awning.glb',
  '/models/truck-green.glb',
  '/models/truck-grey.glb',
  '/models/vehicle-red.glb',
  '/models/vehicle-yellow.glb',
  '/models/vehicle-purple.glb',
  '/models/vehicle-motorcycle.glb',
] as const;

/**
 * Crack-free (conformal) world-space triangle subdivision for Relativistic Aberration.
 * Because each edge (0-1, 1-2, 2-0) is tested independently against `maxEdgeLength`,
 * any two triangles sharing an edge make the exact same split decision at the exact
 * same midpoint—eliminating T-junction cracks while allowing tall skyscrapers and
 * long road tiles to curve smoothly in the GLSL vertex shader.
 */
export function subdivideGeometryForRelativity(
  sourceGeom: THREE.BufferGeometry,
  maxEdgeLength = 2.2,
  maxIterations = 4
): THREE.BufferGeometry {
  let geom = sourceGeom.index ? sourceGeom.toNonIndexed() : sourceGeom.clone();

  for (let iter = 0; iter < maxIterations; iter++) {
    const posAttr = geom.getAttribute('position');
    const normAttr = geom.getAttribute('normal');
    const uvAttr = geom.getAttribute('uv');

    if (!posAttr) break;

    const triCount = Math.floor(posAttr.count / 3);
    const newPos: number[] = [];
    const newNorm: number[] = [];
    const newUv: number[] = [];
    let splitAny = false;

    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();

    const n0 = new THREE.Vector3();
    const n1 = new THREE.Vector3();
    const n2 = new THREE.Vector3();

    const u0 = new THREE.Vector2();
    const u1 = new THREE.Vector2();
    const u2 = new THREE.Vector2();

    const pushVertex = (p: THREE.Vector3, n: THREE.Vector3, u: THREE.Vector2) => {
      newPos.push(p.x, p.y, p.z);
      newNorm.push(n.x, n.y, n.z);
      newUv.push(u.x, u.y);
    };

    const pushTriangle = (
      aP: THREE.Vector3,
      aN: THREE.Vector3,
      aU: THREE.Vector2,
      bP: THREE.Vector3,
      bN: THREE.Vector3,
      bU: THREE.Vector2,
      cP: THREE.Vector3,
      cN: THREE.Vector3,
      cU: THREE.Vector2
    ) => {
      pushVertex(aP, aN, aU);
      pushVertex(bP, bN, bU);
      pushVertex(cP, cN, cU);
    };

    for (let t = 0; t < triCount; t++) {
      const i0 = t * 3;
      const i1 = t * 3 + 1;
      const i2 = t * 3 + 2;

      p0.fromBufferAttribute(posAttr, i0);
      p1.fromBufferAttribute(posAttr, i1);
      p2.fromBufferAttribute(posAttr, i2);

      if (normAttr) {
        n0.fromBufferAttribute(normAttr, i0);
        n1.fromBufferAttribute(normAttr, i1);
        n2.fromBufferAttribute(normAttr, i2);
      } else {
        n0.set(0, 1, 0);
        n1.set(0, 1, 0);
        n2.set(0, 1, 0);
      }

      if (uvAttr) {
        u0.set(uvAttr.getX(i0), uvAttr.getY(i0));
        u1.set(uvAttr.getX(i1), uvAttr.getY(i1));
        u2.set(uvAttr.getX(i2), uvAttr.getY(i2));
      } else {
        u0.set(0, 0);
        u1.set(0, 0);
        u2.set(0, 0);
      }

      const s01 = p0.distanceTo(p1) > maxEdgeLength;
      const s12 = p1.distanceTo(p2) > maxEdgeLength;
      const s20 = p2.distanceTo(p0) > maxEdgeLength;

      const splitCount = (s01 ? 1 : 0) + (s12 ? 1 : 0) + (s20 ? 1 : 0);

      if (splitCount === 0) {
        pushTriangle(p0, n0, u0, p1, n1, u1, p2, n2, u2);
        continue;
      }

      splitAny = true;

      const m01P = p0.clone().add(p1).multiplyScalar(0.5);
      const m12P = p1.clone().add(p2).multiplyScalar(0.5);
      const m20P = p2.clone().add(p0).multiplyScalar(0.5);

      const m01N = n0.clone().add(n1).normalize();
      const m12N = n1.clone().add(n2).normalize();
      const m20N = n2.clone().add(n0).normalize();

      const m01U = u0.clone().add(u1).multiplyScalar(0.5);
      const m12U = u1.clone().add(u2).multiplyScalar(0.5);
      const m20U = u2.clone().add(u0).multiplyScalar(0.5);

      if (splitCount === 3) {
        pushTriangle(p0, n0, u0, m01P, m01N, m01U, m20P, m20N, m20U);
        pushTriangle(m01P, m01N, m01U, p1, n1, u1, m12P, m12N, m12U);
        pushTriangle(m20P, m20N, m20U, m12P, m12N, m12U, p2, n2, u2);
        pushTriangle(m01P, m01N, m01U, m12P, m12N, m12U, m20P, m20N, m20U);
      } else if (splitCount === 1) {
        if (s01) {
          pushTriangle(p0, n0, u0, m01P, m01N, m01U, p2, n2, u2);
          pushTriangle(m01P, m01N, m01U, p1, n1, u1, p2, n2, u2);
        } else if (s12) {
          pushTriangle(p0, n0, u0, p1, n1, u1, m12P, m12N, m12U);
          pushTriangle(p0, n0, u0, m12P, m12N, m12U, p2, n2, u2);
        } else {
          pushTriangle(p0, n0, u0, p1, n1, u1, m20P, m20N, m20U);
          pushTriangle(m20P, m20N, m20U, p1, n1, u1, p2, n2, u2);
        }
      } else {
        // Exactly 2 edges split
        if (!s01) {
          // s12 and s20 split
          pushTriangle(m20P, m20N, m20U, m12P, m12N, m12U, p2, n2, u2);
          pushTriangle(p0, n0, u0, p1, n1, u1, m12P, m12N, m12U);
          pushTriangle(p0, n0, u0, m12P, m12N, m12U, m20P, m20N, m20U);
        } else if (!s12) {
          // s01 and s20 split
          pushTriangle(p0, n0, u0, m01P, m01N, m01U, m20P, m20N, m20U);
          pushTriangle(m01P, m01N, m01U, p1, n1, u1, p2, n2, u2);
          pushTriangle(m01P, m01N, m01U, p2, n2, u2, m20P, m20N, m20U);
        } else {
          // s01 and s12 split
          pushTriangle(m01P, m01N, m01U, p1, n1, u1, m12P, m12N, m12U);
          pushTriangle(p0, n0, u0, m01P, m01N, m01U, m12P, m12N, m12U);
          pushTriangle(p0, n0, u0, m12P, m12N, m12U, p2, n2, u2);
        }
      }
    }

    geom.dispose();
    const nextGeom = new THREE.BufferGeometry();
    nextGeom.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3));
    nextGeom.setAttribute('normal', new THREE.Float32BufferAttribute(newNorm, 3));
    nextGeom.setAttribute('uv', new THREE.Float32BufferAttribute(newUv, 2));
    geom = nextGeom;

    if (!splitAny || geom.getAttribute('position').count > 48000) {
      break;
    }
  }

  return geom;
}

export interface ChunkPlacement {
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

// Carefully calibrated building specs so NO buildings ever overlap in 12m plots
const FRONT_ROW_BUILDINGS: Array<{
  path: string;
  scale: [number, number, number];
  xOffset: number;
}> = [
  { path: '/models/building-a.glb', scale: [10.6, 11.5, 10.5], xOffset: 15.8 },
  { path: '/models/building-f.glb', scale: [10.8, 11.8, 10.5], xOffset: 15.8 },
  { path: '/models/skyscraper-a.glb', scale: [8.0, 10.0, 8.0], xOffset: 16.0 },
  { path: '/models/building-b.glb', scale: [10.4, 11.5, 10.5], xOffset: 15.8 },
  { path: '/models/building-g.glb', scale: [10.4, 11.8, 10.5], xOffset: 15.8 },
  { path: '/models/skyscraper-b.glb', scale: [7.9, 9.6, 7.9], xOffset: 16.0 },
  { path: '/models/building-d.glb', scale: [10.8, 11.5, 10.5], xOffset: 15.8 },
  { path: '/models/building-h.glb', scale: [10.6, 11.5, 10.5], xOffset: 15.8 },
  { path: '/models/skyscraper-c.glb', scale: [8.2, 9.8, 8.0], xOffset: 16.0 },
  { path: '/models/building-c.glb', scale: [10.6, 11.5, 10.0], xOffset: 15.8 },
  { path: '/models/building-e.glb', scale: [6.5, 11.8, 10.5], xOffset: 15.8 },
  { path: '/models/skyscraper-d.glb', scale: [8.2, 9.4, 8.0], xOffset: 16.0 },
];

const SKYLINE_BACK_ROW: Array<{
  path: string;
  scale: [number, number, number];
}> = [
  { path: '/models/skyscraper-a.glb', scale: [8.5, 11.5, 8.5] },
  { path: '/models/skyscraper-c.glb', scale: [8.5, 11.0, 8.5] },
  { path: '/models/building-f.glb', scale: [11.0, 13.5, 11.0] },
  { path: '/models/skyscraper-b.glb', scale: [8.5, 11.0, 8.5] },
  { path: '/models/building-g.glb', scale: [11.0, 13.5, 11.0] },
  { path: '/models/skyscraper-d.glb', scale: [8.5, 10.5, 8.5] },
];

// All vehicles have minY = 0.00 after node transforms, so they sit directly on the road surface (Y = 0.20m)
const VEHICLE_POOL = [
  { path: '/models/vehicle-red.glb', yPos: 0.2, scale: 1.48 },
  { path: '/models/vehicle-yellow.glb', yPos: 0.2, scale: 1.48 },
  { path: '/models/vehicle-purple.glb', yPos: 0.2, scale: 1.48 },
  { path: '/models/truck-green.glb', yPos: 0.2, scale: 2.55 },
  { path: '/models/truck-grey.glb', yPos: 0.2, scale: 2.55 },
  { path: '/models/vehicle-motorcycle.glb', yPos: 0.2, scale: 1.32 },
];

const TREE_POOL = [
  { path: '/models/tree-large.glb', scale: 7.5 },
  { path: '/models/tree-park.glb', scale: 3.1 },
  { path: '/models/tree-pine.glb', scale: 2.8 },
  { path: '/models/tree-small.glb', scale: 7.8 },
];

/**
 * Generates exact, non-overlapping, grounded 3D GLB placements for a 36m urban block variant.
 * Road width: 12m (X from -6m to +6m, asphalt surface at Y = 0.20m)
 * Sidewalks: 4.8m wide on each side (X from ±6.0m to ±10.8m, top surface at Y = 0.28m)
 * First-row buildings: Front facade aligned at |X| = 10.7m (center at |X| = 15.8m, Y = 0.26m)
 * Second-row skyline towers: Center at |X| = 27.5m for rich metropolitan depth.
 */
export function getChunkGlbPlacements(variantIndex: number): ChunkPlacement[] {
  const placements: ChunkPlacement[] = [];
  const tileZs = [-12, 0, 12];

  // 1. CONTINUOUS ASPHALT ROAD & CROSSWALK TILES (Both rotated by Math.PI / 2 so road runs along Z!)
  tileZs.forEach((z, idx) => {
    const isCrosswalk = idx === 2 && variantIndex % 2 === 0;
    placements.push({
      modelPath: isCrosswalk ? '/models/road-crossing.glb' : '/models/road-straight.glb',
      position: [0, 0, z],
      rotation: [0, Math.PI / 2, 0],
      scale: [12.0, 10.0, 12.0],
    });

    // Left and Right Sidewalks (pavement.glb: 4.8m wide from |x|=6.0 to |x|=10.8, top at Y = 0.28m)
    for (const side of [-1, 1]) {
      placements.push({
        modelPath: '/models/pavement.glb',
        position: [side * 8.4, 0, z],
        rotation: [0, 0, 0],
        scale: [4.8, 4.7, 12.0],
      });
    }
  });

  // 2. FIRST-ROW URBAN BUILDINGS & SKYSCRAPERS (Grounded on sidewalk, facing the street, zero overlap)
  for (const side of [-1, 1]) {
    tileZs.forEach((z, slotIdx) => {
      const bIdx =
        (variantIndex * 3 + slotIdx * 5 + (side > 0 ? 4 : 0)) % FRONT_ROW_BUILDINGS.length;
      const spec = FRONT_ROW_BUILDINGS[bIdx];

      placements.push({
        modelPath: spec.path,
        position: [side * spec.xOffset, 0.26, z],
        // Building front facade is +Z in local space; rotate +90° on left (faces +X) and -90° on right (faces -X)
        rotation: [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0],
        scale: spec.scale,
      });
    });
  }

  // 3. SECOND-ROW METROPOLITAN SKYLINE TOWERS (Adds realistic urban depth behind the street row)
  for (const side of [-1, 1]) {
    for (const z of [-9, 9]) {
      const sIdx =
        (variantIndex * 2 + (z > 0 ? 1 : 0) + (side > 0 ? 3 : 0)) % SKYLINE_BACK_ROW.length;
      const backSpec = SKYLINE_BACK_ROW[sIdx];
      placements.push({
        modelPath: backSpec.path,
        position: [side * 27.5, 0.0, z],
        rotation: [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0],
        scale: backSpec.scale,
      });
    }
  }

  // 4. STREET LAMPS (light-curved.glb arm extends toward -Z in local space;
  //    rotate -90° on left so arm overhangs +X over the road, +90° on right so arm overhangs -X!)
  for (const side of [-1, 1]) {
    for (const lz of [-14.0, 2.0]) {
      placements.push({
        modelPath: '/models/light-curved.glb',
        position: [side * 6.25, 0.28, lz],
        rotation: [0, side < 0 ? -Math.PI / 2 : Math.PI / 2, 0],
        scale: [9.2, 9.6, 9.2],
      });
    }
  }

  // 5. TRAFFIC LIGHTS AT CROSSWALK (arm extends toward -Z in local space; overhang over the road!)
  if (variantIndex % 2 === 0) {
    for (const side of [-1, 1]) {
      placements.push({
        modelPath: '/models/traffic-light.glb',
        position: [side * 6.25, 0.28, 9.2],
        rotation: [0, side < 0 ? -Math.PI / 2 : Math.PI / 2, 0],
        scale: [5.6, 5.8, 5.6],
      });
    }
  }

  // 6. OVERHEAD HIGHWAY GANTRY SIGN (Spans cleanly across the entire 12m road from left to right sidewalk)
  if (variantIndex % 3 === 1) {
    placements.push({
      modelPath: '/models/sign-highway.glb',
      position: [0, 0.28, -6.0],
      rotation: [0, Math.PI / 2, 0],
      scale: [9.0, 8.8, 12.6],
    });
  }

  // 7. URBAN TREES ALONG BOTH SIDEWALKS (Grounded at Y = 0.28m)
  const treeZs = [-6.0, 15.0];
  for (const side of [-1, 1]) {
    treeZs.forEach((tz, tIdx) => {
      const treeSpec = TREE_POOL[(variantIndex + tIdx + (side > 0 ? 2 : 0)) % TREE_POOL.length];
      placements.push({
        modelPath: treeSpec.path,
        position: [side * 7.3, 0.28, tz],
        rotation: [0, (variantIndex + tIdx) * 1.3, 0],
        scale: [treeSpec.scale, treeSpec.scale, treeSpec.scale],
      });
    });
  }

  // 8. SIDEWALK BENCHES & CAFE PARASOLS (Grounded at Y = 0.28m near building storefronts)
  for (const side of [-1, 1]) {
    placements.push({
      modelPath: '/models/bench.glb',
      position: [side * 9.3, 0.28, -2.0 * side],
      rotation: [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0],
      scale: [2.6, 2.6, 2.6],
    });
    if ((variantIndex + (side > 0 ? 1 : 0)) % 2 === 0) {
      placements.push({
        modelPath: '/models/parasol.glb',
        position: [side * 9.5, 0.28, 5.5 * side],
        rotation: [0, 0, 0],
        scale: [4.2, 4.2, 4.2],
      });
    }
  }

  // 9. VEHICLES IN PROPER LANES (Grounded on asphalt at Y = 0.20m)
  // Left lane (x = -2.6m) is oncoming traffic facing +Z (rotY = 0);
  // Right lane (x = +2.6m) is forward traffic facing -Z (rotY = Math.PI).
  const carSlots = [
    { laneSide: -1, z: -10.5 },
    { laneSide: 1, z: -1.5 },
    { laneSide: -1, z: 7.5 },
  ];
  carSlots.forEach((slot, cIdx) => {
    if ((variantIndex + cIdx) % 3 === 2) return; // Natural spacing between cars
    const vSpec = VEHICLE_POOL[(variantIndex * 2 + cIdx) % VEHICLE_POOL.length];
    placements.push({
      modelPath: vSpec.path,
      position: [slot.laneSide * 2.6, vSpec.yPos, slot.z],
      rotation: [0, slot.laneSide < 0 ? 0 : Math.PI, 0],
      scale: [vSpec.scale, vSpec.scale, vSpec.scale],
    });
  });

  return placements;
}
