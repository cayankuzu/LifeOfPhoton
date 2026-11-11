/**
 * Minimal readers for the binary assets, for tests only.
 *
 * The application loads its models with three.js in the browser. The tests need to
 * look at the same files in Node, without a browser and without a WebGL context,
 * so this module reads just enough of the glTF binary container (positions,
 * indices, texture coordinates, node transforms, material → texture) and of PNG
 * (8-bit, non-interlaced) to answer questions such as "which faces of the lamp
 * model carry the lamp-light colour, and where are they?".
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export type Vec3 = readonly [number, number, number];

export interface ModelTriangle {
  /** Corners in model space (node transforms applied). */
  readonly corners: readonly [Vec3, Vec3, Vec3];
  /** Unit normal by the right-hand rule, and area. */
  readonly normal: Vec3;
  readonly area: number;
  /** Texture coordinates of the corners, or null when the primitive has none. */
  readonly uv: readonly [readonly [number, number], readonly [number, number], readonly [number, number]] | null;
  /** Name of the material and path of its base-colour texture relative to the model, or null. */
  readonly material: string;
  readonly texture: string | null;
}

export interface Model {
  readonly generator: string;
  readonly triangles: readonly ModelTriangle[];
  /** Base-colour textures the model refers to, relative to its folder. */
  readonly textures: readonly string[];
  readonly min: Vec3;
  readonly max: Vec3;
}

interface GltfAccessor {
  bufferView: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT4';
}

interface GltfNode {
  mesh?: number;
  children?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  matrix?: number[];
}

interface Gltf {
  asset?: { generator?: string; version?: string };
  scene?: number;
  scenes: Array<{ nodes: number[] }>;
  nodes: GltfNode[];
  meshes: Array<{
    primitives: Array<{ attributes: Record<string, number>; indices?: number; material?: number; mode?: number }>;
  }>;
  materials?: Array<{ name?: string; pbrMetallicRoughness?: { baseColorTexture?: { index: number } } }>;
  textures?: Array<{ source: number }>;
  images?: Array<{ uri?: string }>;
  accessors: GltfAccessor[];
  bufferViews: Array<{ byteOffset?: number; byteStride?: number }>;
}

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 } as const;
const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

/** Column-major 4 × 4 matrix of a node (glTF convention). */
function nodeMatrix(node: GltfNode): number[] {
  if (node.matrix) return node.matrix;
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  return [
    (1 - 2 * (y * y + z * z)) * sx,
    2 * (x * y + z * w) * sx,
    2 * (x * z - y * w) * sx,
    0,
    2 * (x * y - z * w) * sy,
    (1 - 2 * (x * x + z * z)) * sy,
    2 * (y * z + x * w) * sy,
    0,
    2 * (x * z + y * w) * sz,
    2 * (y * z - x * w) * sz,
    (1 - 2 * (x * x + y * y)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

function multiply(a: number[], b: number[]): number[] {
  const out = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[column * 4 + k];
      out[column * 4 + row] = sum;
    }
  }
  return out;
}

function transform(m: number[], p: readonly number[]): Vec3 {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

/** Reads a .glb file: every triangle of its default scene, in model space. */
export function readGlb(file: string): Model {
  const buffer = fs.readFileSync(file);
  if (buffer.readUInt32LE(0) !== GLB_MAGIC) throw new Error(`${file}: not a binary glTF file`);
  if (buffer.readUInt32LE(4) !== 2) throw new Error(`${file}: glTF version ${buffer.readUInt32LE(4)} is not supported`);

  let json: Gltf | null = null;
  let bin: Buffer | null = null;
  for (let offset = 12; offset < buffer.length;) {
    const length = buffer.readUInt32LE(offset);
    const kind = buffer.readUInt32LE(offset + 4);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (kind === CHUNK_JSON) json = JSON.parse(data.toString('utf8')) as Gltf;
    else if (kind === CHUNK_BIN) bin = data;
    offset += 8 + length;
  }
  if (!json || !bin) throw new Error(`${file}: missing JSON or binary chunk`);
  const gltf = json;
  const binary = bin;

  const read = (index: number): number[][] => {
    const accessor = gltf.accessors[index];
    const view = gltf.bufferViews[accessor.bufferView];
    const components = COMPONENTS[accessor.type];
    const size = accessor.componentType === 5126 || accessor.componentType === 5125 ? 4 : accessor.componentType === 5123 ? 2 : 1;
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const stride = view.byteStride ?? components * size;
    const rows: number[][] = [];
    for (let i = 0; i < accessor.count; i++) {
      const row: number[] = [];
      for (let c = 0; c < components; c++) {
        const at = start + i * stride + c * size;
        if (accessor.componentType === 5126) row.push(binary.readFloatLE(at));
        else if (accessor.componentType === 5125) row.push(binary.readUInt32LE(at));
        else if (accessor.componentType === 5123) row.push(binary.readUInt16LE(at));
        else if (accessor.componentType === 5121) row.push(binary.readUInt8(at));
        else throw new Error(`${file}: component type ${accessor.componentType} is not supported`);
      }
      rows.push(row);
    }
    return rows;
  };

  const triangles: ModelTriangle[] = [];
  const textures = new Set<string>();
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  const visit = (index: number, parent: number[]): void => {
    const node = gltf.nodes[index];
    const world = multiply(parent, nodeMatrix(node));
    if (node.mesh !== undefined) {
      for (const primitive of gltf.meshes[node.mesh].primitives) {
        if (primitive.mode !== undefined && primitive.mode !== 4) continue; // triangles only
        const positions = read(primitive.attributes.POSITION).map((p) => transform(world, p));
        const uvs = primitive.attributes.TEXCOORD_0 !== undefined ? read(primitive.attributes.TEXCOORD_0) : null;
        const indices =
          primitive.indices !== undefined ? read(primitive.indices).map((row) => row[0]) : positions.map((_, i) => i);
        const material = primitive.material !== undefined ? gltf.materials?.[primitive.material] : undefined;
        const textureIndex = material?.pbrMetallicRoughness?.baseColorTexture?.index;
        const texture =
          textureIndex !== undefined ? (gltf.images?.[gltf.textures?.[textureIndex]?.source ?? -1]?.uri ?? null) : null;
        if (texture) textures.add(texture);

        for (let t = 0; t + 2 < indices.length; t += 3) {
          const a = positions[indices[t]];
          const b = positions[indices[t + 1]];
          const c = positions[indices[t + 2]];
          const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
          const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
          const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
          const length = Math.hypot(n[0], n[1], n[2]);
          for (const corner of [a, b, c]) {
            for (let k = 0; k < 3; k++) {
              min[k] = Math.min(min[k], corner[k]);
              max[k] = Math.max(max[k], corner[k]);
            }
          }
          triangles.push({
            corners: [a, b, c],
            normal: length > 0 ? [n[0] / length, n[1] / length, n[2] / length] : [0, 0, 0],
            area: length / 2,
            uv: uvs
              ? [
                  [uvs[indices[t]][0], uvs[indices[t]][1]],
                  [uvs[indices[t + 1]][0], uvs[indices[t + 1]][1]],
                  [uvs[indices[t + 2]][0], uvs[indices[t + 2]][1]],
                ]
              : null,
            material: material?.name ?? '',
            texture,
          });
        }
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  };

  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const root of gltf.scenes[gltf.scene ?? 0].nodes) visit(root, identity);

  return { generator: gltf.asset?.generator ?? '', triangles, textures: [...textures], min, max };
}

export interface Image {
  readonly width: number;
  readonly height: number;
  /**
   * Encoded sRGB colour (components in [0, 1]) of the texel at texture coordinates
   * (u, v), with the convention of the application: wrapping, nearest texel, (0, 0)
   * at the top-left corner.
   */
  sample(u: number, v: number): [number, number, number];
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Reads an 8-bit, non-interlaced PNG (greyscale, RGB, palette, with or without alpha). */
export function readPng(file: string): Image {
  const buffer = fs.readFileSync(file);
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`${file}: not a PNG file`);
  let width = 0;
  let height = 0;
  let depth = 0;
  let colourType = 0;
  let interlace = 0;
  let palette: Buffer | null = null;
  const data: Buffer[] = [];
  for (let offset = 8; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    const kind = buffer.toString('ascii', offset + 4, offset + 8);
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (kind === 'IHDR') {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      depth = chunk[8];
      colourType = chunk[9];
      interlace = chunk[12];
    } else if (kind === 'PLTE') palette = chunk;
    else if (kind === 'IDAT') data.push(chunk);
    offset += 12 + length;
  }
  if (depth !== 8 || interlace !== 0) throw new Error(`${file}: only 8-bit non-interlaced PNG is supported`);
  const channels = colourType === 0 || colourType === 3 ? 1 : colourType === 4 ? 2 : colourType === 2 ? 3 : 4;
  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(data));
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x];
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      pixels[y * stride + x] = (value + predicted) & 255;
    }
  }
  const wrap = (t: number): number => t - Math.floor(t);
  return {
    width,
    height,
    sample(u, v) {
      const x = Math.min(width - 1, Math.floor(wrap(u) * width));
      const y = Math.min(height - 1, Math.floor(wrap(v) * height));
      const at = y * stride + x * channels;
      if (colourType === 3 && palette) {
        const entry = pixels[at] * 3;
        return [palette[entry] / 255, palette[entry + 1] / 255, palette[entry + 2] / 255];
      }
      if (channels <= 2) return [pixels[at] / 255, pixels[at] / 255, pixels[at] / 255];
      return [pixels[at] / 255, pixels[at + 1] / 255, pixels[at + 2] / 255];
    },
  };
}

/** Folder of the model files, resolved from the repository root (the tests run from there). */
export const PUBLIC_DIRECTORY = path.resolve(process.cwd(), 'public');
