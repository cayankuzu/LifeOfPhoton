/**
 * Turns the models of the city kit (GLB files) into the renderer's geometry.
 *
 * The models are used as they are. They are only re-expressed in the form the
 * relativistic renderer needs: for every block variant the placed models are
 * flattened into one indexed mesh, subdivided where the aberration would bend
 * their edges visibly, with four per-vertex attributes and no textures:
 *
 *   position, normal   chunk-local rest-frame geometry
 *   color              linear albedo, baked from the model's palette texture
 *   aSurface           (LED irradiance, emitter code, emitter level)
 *
 * Baking the palette into vertices removes every texture fetch from the fragment
 * shader and lets a whole block be drawn with a single call; baking the street
 * lighting is possible because the luminaires repeat with the period of a block.
 */

import * as THREE from 'three';
import { decodeSrgb } from '@/physics/colorimetry';
import { SCENARIO } from '@/physics/scenario';
import { EMITTER } from '../emitters';
import { type ModelPath, type ModelRole, type Panel, type Placement, ROAD_SURFACE_Y, chunkLayout } from './layout';
import { ledIrradiance } from './lighting';
import { isGlass, isLampLight } from './palette';
import { type TriangleSoup, subdivideAdaptive, weld } from './subdivide';

/** Floats per vertex of the working soup: position 3, normal 3, colour 3, surface 3. */
const STRIDE = 12;

/**
 * Tessellation rule (see subdivide.ts): no edge may subtend more than `maxAngle`
 * at the observer. The GPU draws a straight edge where the true image is curved;
 * the image of a great circle has geodesic curvature up to γβ·D·sin θ′, so an edge
 * of rest-frame angular length δ deviates by at most γβ·sin θ′·δ²/(8D). The
 * resulting error, wherever anything is bright enough to be seen, is measured by
 * the tessellation test (src/scene/geometry/__tests__/tessellation.test.ts).
 *
 * `minEdge` stops the subdivision next to the path. It must not override the
 * angular rule where there is geometry: nothing in the avenue comes closer to the
 * observer's path than 1.45 m (checked against the model files by the asset
 * test), and maxAngle × 1.45 m = 0.29 m.
 */
export const NEAREST_GEOMETRY = 1.45;
export const TESSELLATION = {
  maxAngle: 0.2,
  minEdge: 0.2 * NEAREST_GEOMETRY,
  axisHeight: SCENARIO.camera.eyeHeight + ROAD_SURFACE_Y,
} as const;

/**
 * Levels of detail. A block AHEAD of the observer can only subtend large angles
 * while it is close, and aberration shrinks it further, so four tessellations of
 * every block are kept and the coarser ones are used with distance ahead. Blocks
 * beside and behind the observer always use level 0 (see Simulation.tsx). The
 * surfaces are identical; only the density of vertices differs.
 *   minDistance  distance ahead of the observer beyond which the level is used, m
 *   maxEdge      longest edge allowed per kind of object, m. The ground stays fine
 *                at every level because the pools of lamp light are baked per vertex.
 */
export const LEVELS_OF_DETAIL = [
  { minDistance: 0, maxEdge: { ground: 3, building: 6, prop: 2 } },
  { minDistance: 12, maxEdge: { ground: 3, building: 6, prop: 3 } },
  { minDistance: 40, maxEdge: { ground: 3, building: 8, prop: 6 } },
  { minDistance: 150, maxEdge: { ground: 3, building: 14, prop: 9 } },
] as const;

/**
 * Level of detail of a block whose nearest point lies `nearestAhead` metres ahead
 * of the observer (zero or negative: the block reaches beside or behind them).
 *
 * Only blocks AHEAD may be coarsened with distance. Aberration minifies what lies
 * ahead, but it pulls what lies behind forward into the visible ring around the
 * neutral cone and bends it strongly, so blocks beside and behind the observer
 * always keep the full angular rule (level 0).
 */
export function levelOfDetail(nearestAhead: number): number {
  let level = 0;
  if (nearestAhead > 0) {
    while (level + 1 < LEVELS_OF_DETAIL.length && nearestAhead >= LEVELS_OF_DETAIL[level + 1].minDistance) level++;
  }
  return level;
}

// ---------------------------------------------------------------------------
// Texture → colour
// ---------------------------------------------------------------------------

/** Palette textures are large atlases of flat swatches; anything smaller is a noise tile. */
const PALETTE_MIN_SIZE = 256;

interface Bitmap {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8ClampedArray;
  /** Mean linear colour, used for small noise textures whose texels carry no layout. */
  readonly mean: [number, number, number];
}

function readBitmap(texture: THREE.Texture): Bitmap | null {
  const image = texture.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!image || !image.width || !image.height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let r = 0;
  let g = 0;
  let b = 0;
  // only the small noise tiles are ever used through their mean
  if (canvas.width < PALETTE_MIN_SIZE) {
    const count = pixels.length / 4;
    for (let i = 0; i < pixels.length; i += 4) {
      r += decodeSrgb(pixels[i] / 255);
      g += decodeSrgb(pixels[i + 1] / 255);
      b += decodeSrgb(pixels[i + 2] / 255);
    }
    r /= count;
    g /= count;
    b /= count;
  }
  return { width: canvas.width, height: canvas.height, pixels, mean: [r, g, b] };
}

/** Encoded sRGB colour of the texel at (u, v); glTF puts (0, 0) at the top-left corner. */
function sampleEncoded(bitmap: Bitmap, u: number, v: number, out: number[]): void {
  const wrap = (t: number): number => t - Math.floor(t);
  const x = Math.min(bitmap.width - 1, Math.floor(wrap(u) * bitmap.width));
  const y = Math.min(bitmap.height - 1, Math.floor(wrap(v) * bitmap.height));
  const offset = (y * bitmap.width + x) * 4;
  out[0] = bitmap.pixels[offset] / 255;
  out[1] = bitmap.pixels[offset + 1] / 255;
  out[2] = bitmap.pixels[offset + 2] / 255;
}

// ---------------------------------------------------------------------------
// Model preparation
// ---------------------------------------------------------------------------

export interface PreparedModel {
  /** Model-space soup with baked colours; surface attributes zero. */
  readonly soup: Float32Array;
  readonly triangleCount: number;
  /** Per triangle: index of the window pane it belongs to, or −1. */
  readonly pane: Int32Array;
  readonly paneCount: number;
  /** Per triangle: emitter code of a face that is a light source in the model itself (the luminaire's face), or 0. */
  readonly emitter: Uint8Array;
}

/** Union–find over welded vertex ids. */
function makeUnionFind(size: number): { find: (i: number) => number; union: (a: number, b: number) => void } {
  const parent = new Int32Array(size);
  for (let i = 0; i < size; i++) parent[i] = i;
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    while (parent[i] !== root) {
      const next = parent[i];
      parent[i] = root;
      i = next;
    }
    return root;
  };
  return {
    find,
    union: (a, b) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    },
  };
}

/**
 * Flattens a loaded glTF scene into a coloured triangle soup and finds the faces
 * that the model's palette marks as light sources: for buildings the glass
 * triangles, grouped into window panes so that each pane can be lit as a whole;
 * for the street luminaire the emitting face of its head.
 */
export function prepareModel(root: THREE.Object3D, role: ModelRole, bitmaps: Map<THREE.Texture, Bitmap | null>): PreparedModel {
  root.updateMatrixWorld(true);
  const chunks: Float32Array[] = [];
  // per triangle: all three corners carry the swatch this model's role looks for
  const marked: boolean[] = [];
  const marks = role === 'building' ? isGlass : role === 'luminaire' ? isLampLight : null;
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  const encoded = [0, 0, 0];

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry;
    const positions = geometry.getAttribute('position');
    if (!positions) return;
    const normals = geometry.getAttribute('normal');
    const uvs = geometry.getAttribute('uv');
    const index = geometry.getIndex();
    const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
    const texture = material?.map ?? null;
    const tint = material?.color ?? new THREE.Color(1, 1, 1);

    let bitmap: Bitmap | null = null;
    if (texture) {
      if (!bitmaps.has(texture)) bitmaps.set(texture, readBitmap(texture));
      bitmap = bitmaps.get(texture) ?? null;
    }
    const isPalette = bitmap !== null && bitmap.width >= PALETTE_MIN_SIZE;
    normalMatrix.getNormalMatrix(mesh.matrixWorld);

    const corners = index ? index.count : positions.count;
    const data = new Float32Array(corners * STRIDE);
    let markedCorners = 0;
    for (let corner = 0; corner < corners; corner++) {
      const vertex = index ? index.getX(corner) : corner;
      position.fromBufferAttribute(positions, vertex).applyMatrix4(mesh.matrixWorld);
      if (normals) normal.fromBufferAttribute(normals, vertex).applyMatrix3(normalMatrix).normalize();
      else normal.set(0, 1, 0);

      let r = tint.r;
      let g = tint.g;
      let b = tint.b;
      let isMarked = false;
      if (bitmap && isPalette && uvs) {
        sampleEncoded(bitmap, uvs.getX(vertex), uvs.getY(vertex), encoded);
        isMarked = marks !== null && marks(encoded);
        r *= decodeSrgb(encoded[0]);
        g *= decodeSrgb(encoded[1]);
        b *= decodeSrgb(encoded[2]);
      } else if (bitmap) {
        r *= bitmap.mean[0];
        g *= bitmap.mean[1];
        b *= bitmap.mean[2];
      }

      const offset = corner * STRIDE;
      data[offset] = position.x;
      data[offset + 1] = position.y;
      data[offset + 2] = position.z;
      data[offset + 3] = normal.x;
      data[offset + 4] = normal.y;
      data[offset + 5] = normal.z;
      data[offset + 6] = r;
      data[offset + 7] = g;
      data[offset + 8] = b;
      // a triangle is marked when all three of its corners are
      if (isMarked) markedCorners++;
      if (corner % 3 === 2) {
        marked.push(markedCorners === 3);
        markedCorners = 0;
      }
    }
    chunks.push(data);
  });

  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const soup = new Float32Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    soup.set(chunk, cursor);
    cursor += chunk.length;
  }
  const triangleCount = total / (3 * STRIDE);

  // --- group glass triangles into panes: triangles sharing a vertex position belong together
  const pane = new Int32Array(triangleCount).fill(-1);
  const emitter = new Uint8Array(triangleCount);
  let paneCount = 0;
  if (role === 'luminaire') {
    for (let t = 0; t < triangleCount; t++) if (marked[t]) emitter[t] = EMITTER.luminaire;
  }
  if (role === 'building') {
    const ids = new Map<string, number>();
    const cornerId = new Int32Array(triangleCount * 3);
    for (let corner = 0; corner < triangleCount * 3; corner++) {
      const o = corner * STRIDE;
      const key = `${Math.round(soup[o] * 2000)},${Math.round(soup[o + 1] * 2000)},${Math.round(soup[o + 2] * 2000)}`;
      let id = ids.get(key);
      if (id === undefined) {
        id = ids.size;
        ids.set(key, id);
      }
      cornerId[corner] = id;
    }
    const sets = makeUnionFind(ids.size);
    for (let t = 0; t < triangleCount; t++) {
      if (!marked[t]) continue;
      sets.union(cornerId[t * 3], cornerId[t * 3 + 1]);
      sets.union(cornerId[t * 3], cornerId[t * 3 + 2]);
    }
    const labels = new Map<number, number>();
    for (let t = 0; t < triangleCount; t++) {
      if (!marked[t]) continue;
      const rootId = sets.find(cornerId[t * 3]);
      let label = labels.get(rootId);
      if (label === undefined) {
        label = paneCount++;
        labels.set(rootId, label);
      }
      pane[t] = label;
    }
  }

  return { soup, triangleCount, pane, paneCount, emitter };
}

// ---------------------------------------------------------------------------
// Block assembly
// ---------------------------------------------------------------------------

/** Deterministic hash of two integers into [0, 1). */
function hash2(a: number, b: number): number {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x7f4a7c15, 0x85ebca6b)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/**
 * Places a prepared model: transforms it into chunk space, keeps the model's own
 * light sources and decides which windows are lit. Ground tiles lose their
 * undersides, which no ray can reach.
 */
function placeModel(model: PreparedModel, placement: Placement, seed: number): Float32Array {
  const out = new Float32Array(model.soup.length);
  const [sx, sy, sz] = placement.scale;
  const cos = Math.cos(placement.yaw);
  const sin = Math.sin(placement.yaw);
  const [tx, ty, tz] = placement.position;
  const litFraction = SCENARIO.interior.litFraction;
  const dropUndersides = placement.kind === 'ground';
  let cursor = 0;

  for (let t = 0; t < model.triangleCount; t++) {
    const first = t * 3 * STRIDE;
    // model-space normal pointing straight down: the underside of a ground tile
    if (dropUndersides && model.soup[first + 4] < -0.7) continue;

    // a face that is a light source in the model itself is always on
    let code: number = model.emitter[t];
    let level = code === EMITTER.none ? 0 : 1;
    const paneIndex = model.pane[t];
    if (paneIndex >= 0 && hash2(paneIndex, seed) < litFraction) {
      code = EMITTER.window;
      // rooms differ in brightness by about a factor of four
      level = 0.45 + 1.5 * hash2(paneIndex + 9173, seed) ** 2;
    }
    for (let corner = 0; corner < 3; corner++) {
      const from = first + corner * STRIDE;
      const x = model.soup[from] * sx;
      const y = model.soup[from + 1] * sy;
      const z = model.soup[from + 2] * sz;
      out[cursor] = x * cos + z * sin + tx;
      out[cursor + 1] = y + ty;
      out[cursor + 2] = -x * sin + z * cos + tz;
      // normals: inverse-transpose of the scale, then the rotation
      const nx = model.soup[from + 3] / sx;
      const ny = model.soup[from + 4] / sy;
      const nz = model.soup[from + 5] / sz;
      const length = Math.hypot(nx, ny, nz) || 1;
      out[cursor + 3] = (nx * cos + nz * sin) / length;
      out[cursor + 4] = ny / length;
      out[cursor + 5] = (-nx * sin + nz * cos) / length;
      out[cursor + 6] = model.soup[from + 6];
      out[cursor + 7] = model.soup[from + 7];
      out[cursor + 8] = model.soup[from + 8];
      out[cursor + 9] = 0;
      out[cursor + 10] = code;
      out[cursor + 11] = level;
      cursor += STRIDE;
    }
  }
  return out.subarray(0, cursor);
}

function panelSoup(panel: Panel): Float32Array {
  const [cx, cy, cz] = panel.centre;
  const [ux, uy, uz] = panel.u;
  const [vx, vy, vz] = panel.v;
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const length = Math.hypot(nx, ny, nz) || 1;
  nx /= length;
  ny /= length;
  nz /= length;
  const corner = (su: number, sv: number): number[] => [
    cx + su * ux + sv * vx,
    cy + su * uy + sv * vy,
    cz + su * uz + sv * vz,
    nx,
    ny,
    nz,
    panel.colour[0],
    panel.colour[1],
    panel.colour[2],
    0,
    panel.emitter,
    panel.level,
  ];
  return new Float32Array([
    ...corner(-1, -1),
    ...corner(1, -1),
    ...corner(1, 1),
    ...corner(-1, -1),
    ...corner(1, 1),
    ...corner(-1, 1),
  ]);
}

// ---------------------------------------------------------------------------

export interface BlockGeometry {
  readonly geometry: THREE.BufferGeometry;
  readonly triangles: number;
  readonly vertices: number;
}

/**
 * Builds the geometry of one block variant at one level of detail. `models` must
 * contain every model the layout references. The window pattern depends only on
 * the variant, so all levels of a block show exactly the same city.
 */
export function buildBlock(variant: number, level: number, models: Map<ModelPath, PreparedModel>): BlockGeometry {
  const layout = chunkLayout(variant);
  const detail = LEVELS_OF_DETAIL[level];
  const cache = new Map<string, TriangleSoup>();
  const pieces: Float32Array[] = [];

  layout.placements.forEach((placement, index) => {
    const model = models.get(placement.model);
    if (!model) return;
    const hasWindows = model.paneCount > 0;
    // The tessellation rule does not depend on z, so identical models at the same
    // lateral position can share one tessellated copy. Buildings carry a random
    // window pattern and are therefore always tessellated individually.
    const key = hasWindows
      ? ''
      : `${placement.model}|${placement.position[0]}|${placement.position[1]}|${placement.yaw}|${placement.scale.join(',')}`;
    let soup = key ? cache.get(key) : undefined;
    let offsetZ = 0;
    if (soup) {
      offsetZ = placement.position[2];
    } else {
      const local: Placement = key ? { ...placement, position: [placement.position[0], placement.position[1], 0] } : placement;
      const data = placeModel(model, local, variant * 1000 + index);
      soup = { stride: STRIDE, data, count: data.length / STRIDE };
      subdivideAdaptive(soup, {
        ...TESSELLATION,
        minDistance: detail.minDistance,
        maxEdge: detail.maxEdge[placement.kind],
      });
      if (key) {
        cache.set(key, soup);
        offsetZ = placement.position[2];
      }
    }
    if (offsetZ === 0) {
      pieces.push(soup.data);
    } else {
      const moved = soup.data.slice();
      for (let o = 2; o < moved.length; o += STRIDE) moved[o] += offsetZ;
      pieces.push(moved);
    }
  });

  for (const panel of layout.panels) {
    const data = panelSoup(panel);
    const soup: TriangleSoup = { stride: STRIDE, data, count: data.length / STRIDE };
    subdivideAdaptive(soup, { ...TESSELLATION, minDistance: detail.minDistance, maxEdge: detail.maxEdge.prop });
    pieces.push(soup.data);
  }

  let total = 0;
  for (const piece of pieces) total += piece.length;
  const merged = new Float32Array(total);
  let cursor = 0;
  for (const piece of pieces) {
    merged.set(piece, cursor);
    cursor += piece.length;
  }

  const mesh = weld({ stride: STRIDE, data: merged, count: total / STRIDE });
  const count = mesh.vertexCount;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const surface = new Float32Array(count * 3);
  for (let v = 0; v < count; v++) {
    const o = v * STRIDE;
    const px = mesh.vertices[o];
    const py = mesh.vertices[o + 1];
    const pz = mesh.vertices[o + 2];
    let nx = mesh.vertices[o + 3];
    let ny = mesh.vertices[o + 4];
    let nz = mesh.vertices[o + 5];
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;
    positions[v * 3] = px;
    positions[v * 3 + 1] = py;
    positions[v * 3 + 2] = pz;
    normals[v * 3] = nx;
    normals[v * 3 + 1] = ny;
    normals[v * 3 + 2] = nz;
    colours[v * 3] = mesh.vertices[o + 6];
    colours[v * 3 + 1] = mesh.vertices[o + 7];
    colours[v * 3 + 2] = mesh.vertices[o + 8];
    surface[v * 3] = ledIrradiance(px, py, pz, nx, ny, nz);
    surface[v * 3 + 1] = mesh.vertices[o + 10];
    surface[v * 3 + 2] = mesh.vertices[o + 11];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geometry.setAttribute('aSurface', new THREE.BufferAttribute(surface, 3));
  geometry.setIndex(new THREE.BufferAttribute(count > 65535 ? mesh.indices : Uint16Array.from(mesh.indices), 1));
  // the vertex shader moves every vertex, so the static bounds must never cull the block
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Number.POSITIVE_INFINITY);

  return { geometry, triangles: mesh.indices.length / 3, vertices: count };
}
