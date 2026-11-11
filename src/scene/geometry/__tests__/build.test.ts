/**
 * The block builder, exercised without the model files: every model of the kit is
 * replaced by a box of a distinct colour, which is enough to check what the
 * builder itself is responsible for — placement, tessellation per level of
 * detail, lighting, emitters, and that all levels show the same city.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SCENARIO } from '@/physics/scenario';
import { EMITTER } from '../../emitters';
import { type PreparedModel, LEVELS_OF_DETAIL, buildBlock } from '../build';
import { type ModelPath, LAMP_MODEL, MODEL_PATHS, SIGNAL_HEAD, SIGNAL_SCALE, modelRole } from '../layout';

const STRIDE = 12;

/** The six faces of the box [−½, ½] × [0, 1] × [−½, ½]: outward normal and four corners, counter-clockwise from outside. */
const FACES: ReadonlyArray<{ normal: [number, number, number]; corners: Array<[number, number, number]> }> = [
  {
    normal: [0, 1, 0],
    corners: [
      [-0.5, 1, -0.5],
      [-0.5, 1, 0.5],
      [0.5, 1, 0.5],
      [0.5, 1, -0.5],
    ],
  },
  {
    normal: [0, -1, 0],
    corners: [
      [-0.5, 0, -0.5],
      [0.5, 0, -0.5],
      [0.5, 0, 0.5],
      [-0.5, 0, 0.5],
    ],
  },
  {
    normal: [1, 0, 0],
    corners: [
      [0.5, 0, -0.5],
      [0.5, 1, -0.5],
      [0.5, 1, 0.5],
      [0.5, 0, 0.5],
    ],
  },
  {
    normal: [-1, 0, 0],
    corners: [
      [-0.5, 0, -0.5],
      [-0.5, 0, 0.5],
      [-0.5, 1, 0.5],
      [-0.5, 1, -0.5],
    ],
  },
  {
    normal: [0, 0, 1],
    corners: [
      [-0.5, 0, 0.5],
      [0.5, 0, 0.5],
      [0.5, 1, 0.5],
      [-0.5, 1, 0.5],
    ],
  },
  {
    normal: [0, 0, -1],
    corners: [
      [-0.5, 0, -0.5],
      [-0.5, 1, -0.5],
      [0.5, 1, -0.5],
      [0.5, 0, -0.5],
    ],
  },
];

/** Colour that identifies a model in the built geometry (float32-exact components). */
const colourOf = (index: number): [number, number, number] => [(index + 1) / 32, 0.25, 0.5];

/**
 * A box standing in for a model. Buildings get two window panes (the two faces
 * along z), the lamp gets a light face (its underside), as the real models have.
 */
function boxModel(path: ModelPath, index: number): PreparedModel {
  const role = modelRole(path);
  const triangles = FACES.length * 2;
  const soup = new Float32Array(triangles * 3 * STRIDE);
  const pane = new Int32Array(triangles).fill(-1);
  const emitter = new Uint8Array(triangles);
  const colour = colourOf(index);
  let cursor = 0;
  FACES.forEach((face, f) => {
    for (const corner of [0, 1, 2, 0, 2, 3]) {
      soup.set([...face.corners[corner], ...face.normal, ...colour, 0, 0, 0], cursor);
      cursor += STRIDE;
    }
    if (role === 'building' && face.normal[2] !== 0) {
      pane[2 * f] = face.normal[2] > 0 ? 0 : 1;
      pane[2 * f + 1] = pane[2 * f];
    }
    if (role === 'luminaire' && face.normal[1] < 0) {
      emitter[2 * f] = EMITTER.luminaire;
      emitter[2 * f + 1] = EMITTER.luminaire;
    }
  });
  return { soup, triangleCount: triangles, pane, paneCount: role === 'building' ? 2 : 0, emitter };
}

const MODELS = new Map<ModelPath, PreparedModel>(MODEL_PATHS.map((path, index) => [path, boxModel(path, index)]));

interface Triangle {
  readonly area: number;
  readonly normalY: number;
  readonly colour: number;
  readonly emitter: number;
  readonly level: number;
}

/** Triangles of a built block with the attributes of their first corner. */
function trianglesOf(geometry: THREE.BufferGeometry): Triangle[] {
  const position = geometry.getAttribute('position');
  const colour = geometry.getAttribute('color');
  const surface = geometry.getAttribute('aSurface');
  const index = geometry.getIndex()!;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const result: Triangle[] = [];
  for (let t = 0; t < index.count; t += 3) {
    const [i0, i1, i2] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
    a.fromBufferAttribute(position, i0);
    b.fromBufferAttribute(position, i1);
    c.fromBufferAttribute(position, i2);
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    const area = normal.length() / 2;
    result.push({
      area,
      normalY: area > 0 ? normal.y / (2 * area) : 0,
      colour: colour.getX(i0),
      emitter: surface.getY(i0),
      level: surface.getZ(i0),
    });
  }
  return result;
}

const areaWhere = (triangles: readonly Triangle[], test: (triangle: Triangle) => boolean): number =>
  triangles.filter(test).reduce((sum, triangle) => sum + triangle.area, 0);

describe('buildBlock', () => {
  const levels = LEVELS_OF_DETAIL.map((_, level) => buildBlock(0, level, MODELS));
  const triangles = levels.map((block) => trianglesOf(block.geometry));

  it('produces an indexed mesh with the attributes the city shader declares', () => {
    for (const block of levels) {
      const { geometry } = block;
      for (const name of ['position', 'normal', 'color', 'aSurface']) {
        const attribute = geometry.getAttribute(name);
        expect(attribute, name).toBeDefined();
        expect(attribute.itemSize).toBe(3);
        expect(attribute.count).toBe(block.vertices);
        expect((attribute.array as Float32Array).every(Number.isFinite), name).toBe(true);
      }
      const index = geometry.getIndex()!;
      expect(index.count).toBe(3 * block.triangles);
      // 16-bit indices whenever they suffice
      expect(index.array instanceof Uint16Array).toBe(block.vertices <= 65535);
      let largest = 0;
      for (let i = 0; i < index.count; i++) largest = Math.max(largest, index.getX(i));
      expect(largest).toBe(block.vertices - 1);
      // welding pays: far fewer vertices than corners
      expect(block.vertices).toBeLessThan(2 * block.triangles);
    }
  });

  it('never lets the static bounds cull a block: the vertex shader moves every vertex', () => {
    for (const block of levels) expect(block.geometry.boundingSphere?.radius).toBe(Number.POSITIVE_INFINITY);
  });

  it('writes unit normals, albedos within [0, 1] and a bounded, non-negative street irradiance', () => {
    for (const block of levels) {
      const normal = block.geometry.getAttribute('normal');
      const colour = block.geometry.getAttribute('color');
      const surface = block.geometry.getAttribute('aSurface');
      for (let v = 0; v < block.vertices; v++) {
        expect(Math.hypot(normal.getX(v), normal.getY(v), normal.getZ(v))).toBeCloseTo(1, 5);
        for (const value of [colour.getX(v), colour.getY(v), colour.getZ(v)]) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
        expect(surface.getX(v)).toBeGreaterThan(0);
        expect(surface.getX(v)).toBeLessThanOrEqual(3 + SCENARIO.ambientLedFraction + 1e-6);
      }
    }
  });

  it('is deterministic', () => {
    const again = buildBlock(0, 0, MODELS);
    expect(again.triangles).toBe(levels[0].triangles);
    expect(Array.from(again.geometry.getAttribute('aSurface').array)).toEqual(
      Array.from(levels[0].geometry.getAttribute('aSurface').array)
    );
  });

  it('gets coarser with the level of detail, never finer', () => {
    for (let level = 1; level < levels.length; level++) {
      expect(levels[level].triangles).toBeLessThanOrEqual(levels[level - 1].triangles);
    }
    expect(levels[levels.length - 1].triangles).toBeLessThan(0.7 * levels[0].triangles);
  });

  it('shows exactly the same city at every level: same surfaces, same lit windows, same lamps', () => {
    const total = triangles.map((list) => areaWhere(list, () => true));
    const windows = triangles.map((list) => areaWhere(list, (t) => t.emitter === EMITTER.window));
    const lamps = triangles.map((list) => areaWhere(list, (t) => t.emitter === EMITTER.luminaire));
    const signals = triangles.map((list) => areaWhere(list, (t) => t.emitter === EMITTER.signalRed));
    expect(windows[0]).toBeGreaterThan(0);
    expect(lamps[0]).toBeGreaterThan(0);
    expect(signals[0]).toBeGreaterThan(0);
    for (let level = 1; level < levels.length; level++) {
      // subdivision only splits triangles; float32 positions leave a relative error of about 10⁻⁵
      expect(total[level] / total[0]).toBeCloseTo(1, 4);
      expect(windows[level] / windows[0]).toBeCloseTo(1, 4);
      expect(lamps[level] / lamps[0]).toBeCloseTo(1, 4);
      expect(signals[level] / signals[0]).toBeCloseTo(1, 4);
    }
  });

  it('keeps the light sources of the models and adds only the signal lenses', () => {
    const list = triangles[0];
    const codes = new Set(list.map((t) => t.emitter));
    // variant 0 has a crossing: windows, luminaires and the red signal; amber and green are dark
    expect([...codes].sort()).toEqual([EMITTER.none, EMITTER.window, EMITTER.luminaire, EMITTER.signalRed]);

    // luminaires: the underside of each of the four lamp boxes, always on at full level
    const lampColour = colourOf(MODEL_PATHS.indexOf(LAMP_MODEL))[0];
    const lamps = list.filter((t) => t.emitter === EMITTER.luminaire);
    expect(lamps.every((t) => t.colour === Math.fround(lampColour) && t.normalY < -0.99 && t.level === 1)).toBe(true);

    // the red lenses: one square per signal, as large as the layout says
    const side = 2 * SIGNAL_HEAD.lensRadius * SIGNAL_SCALE[2];
    const height = 2 * SIGNAL_HEAD.lensRadius * SIGNAL_SCALE[1];
    expect(areaWhere(list, (t) => t.emitter === EMITTER.signalRed)).toBeCloseTo(2 * side * height, 4);
  });

  it('lights whole panes, a share of them, at levels that differ from room to room', () => {
    const lit = triangles[0].filter((t) => t.emitter === EMITTER.window);
    const levelsSeen = new Set(lit.map((t) => t.level));
    // 8 buildings × 2 panes; with a lit fraction of 0.42 between 2 and 12 of them are on
    expect(levelsSeen.size).toBeGreaterThanOrEqual(2);
    expect(levelsSeen.size).toBeLessThanOrEqual(12);
    for (const level of levelsSeen) {
      // rooms differ in brightness by about a factor of four
      expect(level).toBeGreaterThanOrEqual(0.45 - 1e-6);
      expect(level).toBeLessThanOrEqual(1.95 + 1e-6);
    }
    // only building boxes carry windows, and only on the two faces that are panes (vertical)
    expect(lit.every((t) => Math.abs(t.normalY) < 1e-3)).toBe(true);
  });

  it('drops the undersides of the ground tiles, which no ray can reach', () => {
    const groundColours = new Set(
      MODEL_PATHS.map((path, index) => (/road-|pavement/.test(path) ? Math.fround(colourOf(index)[0]) : -1)).filter((c) => c >= 0)
    );
    const ground = triangles[0].filter((t) => groundColours.has(t.colour));
    expect(ground.length).toBeGreaterThan(0);
    expect(ground.some((t) => t.normalY > 0.99)).toBe(true);
    expect(ground.every((t) => t.normalY > -0.7)).toBe(true);
    // other models keep theirs: the lamp's underside is its light face
    expect(triangles[0].some((t) => !groundColours.has(t.colour) && t.normalY < -0.99)).toBe(true);
  });

  it('blocks without a crossing have no signal lenses', () => {
    const codes = new Set(trianglesOf(buildBlock(1, 0, MODELS).geometry).map((t) => t.emitter));
    expect(codes.has(EMITTER.signalRed)).toBe(false);
    expect(codes.has(EMITTER.luminaire)).toBe(true);
  });

  it('skips a model that failed to load instead of failing the whole block', () => {
    const partial = new Map(MODELS);
    partial.delete(LAMP_MODEL);
    const block = buildBlock(1, 3, partial);
    expect(block.triangles).toBeGreaterThan(0);
    expect(new Set(trianglesOf(block.geometry).map((t) => t.emitter)).has(EMITTER.luminaire)).toBe(false);
  });
});
