/**
 * The avenue is built from model files, and several numbers in the code are
 * statements about those files: where the luminaire's light face is, where the
 * driving surface lies, how close anything comes to the observer. These tests read
 * the files themselves, so that replacing a model cannot silently invalidate them.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCENARIO } from '@/physics/scenario';
import {
  type Placement,
  CARRIAGEWAY_HALF_WIDTH,
  CHUNK_LENGTH,
  LAMP_FACE,
  LAMP_MODEL,
  LAMP_SCALE,
  LUMINAIRE_FACE_AREA,
  MODEL_PATHS,
  PAVEMENT_Y,
  ROAD_SURFACE_Y,
  SIGNAL_HEAD,
  SIGNAL_MODEL,
  ROAD_HALF_WIDTH,
  VARIANT_COUNT,
  chunkLayout,
  chunkLuminaires,
  modelRole,
} from '../layout';
import { NEAREST_GEOMETRY, TESSELLATION } from '../build';
import { isGlass, isLampLight } from '../palette';
import { type Image, type Model, type ModelTriangle, type Vec3, PUBLIC_DIRECTORY, readGlb, readPng } from './glb';

/** Palette textures are large atlases of flat swatches; smaller textures are noise tiles (as in build.ts). */
const PALETTE_MIN_SIZE = 256;

const models = new Map<string, Model>();
const images = new Map<string, Image>();

function load(model: string): Model {
  let loaded = models.get(model);
  if (!loaded) {
    loaded = readGlb(path.join(PUBLIC_DIRECTORY, model));
    models.set(model, loaded);
  }
  return loaded;
}

function texture(model: string, uri: string): Image {
  const file = path.join(PUBLIC_DIRECTORY, path.dirname(model), uri);
  let loaded = images.get(file);
  if (!loaded) {
    loaded = readPng(file);
    images.set(file, loaded);
  }
  return loaded;
}

/** Triangles all of whose corners carry a palette colour that `accepts` — the rule of prepareModel. */
function marked(model: string, accepts: (colour: readonly number[]) => boolean): ModelTriangle[] {
  return load(model).triangles.filter((triangle) => {
    if (!triangle.uv || !triangle.texture) return false;
    const palette = texture(model, triangle.texture);
    if (palette.width < PALETTE_MIN_SIZE) return false;
    return triangle.uv.every(([u, v]) => accepts(palette.sample(u, v)));
  });
}

/** A model-space point as the block builder places it (scale, rotation about the vertical, translation). */
function place(point: Vec3, placement: Placement): Vec3 {
  const x = point[0] * placement.scale[0];
  const y = point[1] * placement.scale[1];
  const z = point[2] * placement.scale[2];
  const cos = Math.cos(placement.yaw);
  const sin = Math.sin(placement.yaw);
  return [x * cos + z * sin + placement.position[0], y + placement.position[1], -x * sin + z * cos + placement.position[2]];
}

/** Distance from the point p to the segment ab, in the plane. */
function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const t = length2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / length2)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/** Distance from the point p to the triangle abc in the plane (zero inside it). */
function distanceToTriangle(px: number, py: number, a: Vec3, b: Vec3, c: Vec3): number {
  const side = (u: Vec3, v: Vec3): number => (px - v[0]) * (u[1] - v[1]) - (u[0] - v[0]) * (py - v[1]);
  const d1 = side(a, b);
  const d2 = side(b, c);
  const d3 = side(c, a);
  const doubleArea = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]));
  const inside = !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  if (inside && doubleArea > 1e-9) return 0;
  return Math.min(
    distanceToSegment(px, py, a[0], a[1], b[0], b[1]),
    distanceToSegment(px, py, b[0], b[1], c[0], c[1]),
    distanceToSegment(px, py, c[0], c[1], a[0], a[1])
  );
}

describe('the model files', () => {
  it('every model of the layout is a readable glTF binary with its textures', () => {
    for (const model of MODEL_PATHS) {
      const file = path.join(PUBLIC_DIRECTORY, model);
      expect(fs.existsSync(file), model).toBe(true);
      const loaded = load(model);
      expect(loaded.triangles.length, model).toBeGreaterThan(0);
      // every triangle is textured: the colours of the scene come from the models, not from the code
      expect(
        loaded.triangles.every((triangle) => triangle.texture !== null && triangle.uv !== null),
        model
      ).toBe(true);
      for (const uri of loaded.textures) {
        const image = texture(model, uri);
        expect(image.width, `${model}: ${uri}`).toBeGreaterThan(0);
        expect(image.height, `${model}: ${uri}`).toBe(image.width);
      }
    }
  });

  it('models stand on the ground at their origin', () => {
    // the layout places every model by its base point, so the base must be at y = 0
    for (const model of MODEL_PATHS) {
      expect(load(model).min[1], model).toBeCloseTo(0, 3);
    }
  });

  it('ground tiles are unit squares, so that three of them fill a block without a gap', () => {
    for (const model of ['/models/road-straight.glb', '/models/road-crossing.glb', '/models/pavement.glb']) {
      const { min, max } = load(model);
      for (const axis of [0, 2]) {
        expect(min[axis], model).toBeCloseTo(-0.5, 3);
        expect(max[axis], model).toBeCloseTo(0.5, 3);
      }
    }
    const tiles = chunkLayout(0).placements.filter((placement) => placement.model === '/models/road-straight.glb');
    for (const tile of tiles) {
      expect(tile.scale[0]).toBe(CHUNK_LENGTH / 3);
      expect(tile.scale[2]).toBe(2 * ROAD_HALF_WIDTH);
    }
  });
});

describe('heights the layout relies on', () => {
  /** Height of the upward-facing surface with the largest area, as placed. */
  function mainSurfaceHeight(placement: Placement): number {
    const areaAt = new Map<number, number>();
    for (const triangle of load(placement.model).triangles) {
      if (triangle.normal[1] < 0.99) continue;
      const height = Math.round(place(triangle.corners[0], placement)[1] * 1000) / 1000;
      areaAt.set(height, (areaAt.get(height) ?? 0) + triangle.area);
    }
    return [...areaAt.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  it('the driving surface is at ROAD_SURFACE_Y', () => {
    for (let variant = 0; variant < VARIANT_COUNT; variant++) {
      const roads = chunkLayout(variant).placements.filter((placement) => placement.model.includes('/road-'));
      expect(roads.length).toBe(3);
      for (const road of roads) expect(mainSurfaceHeight(road)).toBeCloseTo(ROAD_SURFACE_Y, 3);
    }
  });

  it('the driving surface is as wide as CARRIAGEWAY_HALF_WIDTH says; kerb strips fill the rest of the tile', () => {
    const road = chunkLayout(1).placements.find((placement) => placement.model === '/models/road-straight.glb');
    expect(road).toBeDefined();
    let reach = 0;
    let tileReach = 0;
    for (const triangle of load('/models/road-straight.glb').triangles) {
      if (triangle.normal[1] < 0.99) continue;
      for (const corner of triangle.corners) {
        const placed = place(corner, road!);
        tileReach = Math.max(tileReach, Math.abs(placed[0]));
        if (Math.abs(placed[1] - ROAD_SURFACE_Y) < 1e-3) reach = Math.max(reach, Math.abs(placed[0]));
      }
    }
    expect(reach).toBeCloseTo(CARRIAGEWAY_HALF_WIDTH, 3);
    expect(tileReach).toBeCloseTo(ROAD_HALF_WIDTH, 3);
  });

  it('the pavement surface is at PAVEMENT_Y and begins where the road tile ends', () => {
    const pavements = chunkLayout(0).placements.filter((placement) => placement.model === '/models/pavement.glb');
    expect(pavements.length).toBe(6);
    for (const pavement of pavements) {
      expect(mainSurfaceHeight(pavement)).toBeCloseTo(PAVEMENT_Y, 3);
      const inner = Math.abs(pavement.position[0]) - 0.5 * pavement.scale[0];
      expect(inner).toBeCloseTo(ROAD_HALF_WIDTH, 6);
    }
  });

  it('everything that stands on the pavement stands on its surface', () => {
    for (let variant = 0; variant < VARIANT_COUNT; variant++) {
      for (const placement of chunkLayout(variant).placements) {
        if (placement.kind !== 'prop') continue;
        const onPavement = Math.abs(placement.position[0]) >= ROAD_HALF_WIDTH;
        const isGantry = placement.model === '/models/sign-highway.glb';
        if (onPavement || isGantry) expect(placement.position[1], placement.model).toBe(PAVEMENT_Y);
        else expect(placement.position[1], placement.model).toBe(ROAD_SURFACE_Y);
      }
    }
  });
});

describe('light sources are faces of the models', () => {
  it('the luminaire carries its own light face, exactly where the layout says', () => {
    expect(modelRole(LAMP_MODEL)).toBe('luminaire');
    const lit = marked(LAMP_MODEL, isLampLight);
    // a hexagon: a rectangle that tapers towards the arm
    expect(lit.length).toBe(4);
    for (const triangle of lit) {
      // it faces straight down, at the height the layout records
      expect(triangle.normal[1]).toBeCloseTo(-1, 6);
      for (const corner of triangle.corners) expect(corner[1]).toBeCloseTo(LAMP_FACE.y, 4);
    }
    // every corner of the face is a corner of the recorded outline, and every outline corner is used
    const corners = new Set(
      lit.flatMap((triangle) => triangle.corners.map((corner) => `${corner[0].toFixed(4)},${corner[2].toFixed(4)}`))
    );
    const outline = new Set(LAMP_FACE.outline.map(([x, z]) => `${x.toFixed(4)},${z.toFixed(4)}`));
    expect([...corners].sort()).toEqual([...outline].sort());
    // and the triangles cover the outline exactly once (shoelace area of the outline = sum of the triangles)
    let doubleArea = 0;
    LAMP_FACE.outline.forEach(([x0, z0], index) => {
      const [x1, z1] = LAMP_FACE.outline[(index + 1) % LAMP_FACE.outline.length];
      doubleArea += x0 * z1 - x1 * z0;
    });
    const area = lit.reduce((sum, triangle) => sum + triangle.area, 0);
    expect(area).toBeCloseTo(Math.abs(doubleArea) / 2, 7);
    expect(area * LAMP_SCALE[0] * LAMP_SCALE[2]).toBeCloseTo(LUMINAIRE_FACE_AREA, 6);
  });

  it('the lighting places each luminaire at the centroid of a placed model’s light face', () => {
    const lit = marked(LAMP_MODEL, isLampLight);
    const lamps = chunkLayout(0).placements.filter((placement) => placement.model === LAMP_MODEL);
    const luminaires = chunkLuminaires();
    expect(lamps.length).toBe(luminaires.length);
    for (const lamp of lamps) {
      // area-weighted centroid of the face as the block builder places it
      let total = 0;
      const centroid = [0, 0, 0];
      for (const triangle of lit) {
        const placed = triangle.corners.map((corner) => place(corner, lamp));
        // the horizontal scales are equal, so areas scale uniformly and model areas serve as weights
        total += triangle.area;
        for (let axis = 0; axis < 3; axis++) {
          centroid[axis] += (triangle.area * (placed[0][axis] + placed[1][axis] + placed[2][axis])) / 3;
        }
      }
      const at = centroid.map((value) => value / total);
      const match = luminaires.find(
        (luminaire) => Math.hypot(luminaire.position[0] - at[0], luminaire.position[2] - at[2]) < 0.5
      );
      expect(match, `lamp at ${lamp.position.join(', ')}`).toBeDefined();
      // millimetres
      for (let axis = 0; axis < 3; axis++) expect(match!.position[axis]).toBeCloseTo(at[axis], 3);
      // the face reaches over the kerb, towards the carriageway
      expect(Math.abs(at[0])).toBeLessThan(Math.abs(lamp.position[0]));
    }
  });

  it('nothing of the luminaire hangs below its light face over the road', () => {
    const zs = LAMP_FACE.outline.map(([, z]) => z);
    const below = load(LAMP_MODEL).triangles.filter(
      (triangle) =>
        triangle.corners.every((corner) => corner[2] <= Math.max(...zs) + 1e-6) &&
        triangle.corners.some((corner) => corner[1] < LAMP_FACE.y - 0.004)
    );
    expect(below.length).toBe(0);
  });

  it('no face of the luminaire is half lamp-light: the swatch covers whole triangles', () => {
    const model = load(LAMP_MODEL);
    const touched = model.triangles.filter((triangle) => {
      if (!triangle.uv || !triangle.texture) return false;
      const palette = texture(LAMP_MODEL, triangle.texture);
      return triangle.uv.some(([u, v]) => isLampLight(palette.sample(u, v)));
    });
    expect(touched.length).toBe(4);
  });

  it('every building has glass panes on its facades', () => {
    const buildings = MODEL_PATHS.filter((model) => modelRole(model) === 'building');
    expect(buildings.length).toBe(12);
    for (const model of buildings) {
      const glass = marked(model, isGlass);
      // at least seven panes of two triangles each
      expect(glass.length, model).toBeGreaterThanOrEqual(14);
      // windows are in walls, never in roofs or floors
      expect(
        glass.every((triangle) => Math.abs(triangle.normal[1]) < 0.05),
        model
      ).toBe(true);
      const total = load(model).triangles.reduce((sum, triangle) => sum + triangle.area, 0);
      const share = glass.reduce((sum, triangle) => sum + triangle.area, 0) / total;
      // between the small windows of the low buildings and the glazed fronts of the towers
      expect(share, model).toBeGreaterThan(0.01);
      expect(share, model).toBeLessThan(0.4);
    }
  });

  it('only buildings and the luminaire are searched for light sources', () => {
    // the vehicles have blue glass and orange lamps too; they stay unlit because of their role
    for (const model of MODEL_PATHS) {
      const role = modelRole(model);
      if (/\/(building|skyscraper)-/.test(model)) expect(role, model).toBe('building');
      else if (model === LAMP_MODEL) expect(role, model).toBe('luminaire');
      else expect(role, model).toBe('plain');
    }
    expect(marked('/models/vehicle-yellow.glb', isGlass).length).toBeGreaterThan(0);
  });

  it('the signal has no lenses of its own, and the added ones lie on the face of its head', () => {
    const model = load(SIGNAL_MODEL);
    // the head's front: the faces looking along −x at the plane the layout names
    const front = model.triangles.filter(
      (triangle) =>
        triangle.normal[0] < -0.99 && triangle.corners.every((corner) => Math.abs(corner[0] - SIGNAL_HEAD.faceX) < 1e-3)
    );
    expect(front.length).toBeGreaterThan(0);
    // a plain face: one flat rectangle, so there is nothing in the model that could serve as a lens
    const ys = front.flatMap((triangle) => triangle.corners.map((corner) => corner[1]));
    const zs = front.flatMap((triangle) => triangle.corners.map((corner) => corner[2]));
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const zMin = Math.min(...zs);
    const zMax = Math.max(...zs);
    const area = front.reduce((sum, triangle) => sum + triangle.area, 0);
    expect(area).toBeCloseTo((yMax - yMin) * (zMax - zMin), 5);

    const radius = SIGNAL_HEAD.lensRadius;
    for (const y of SIGNAL_HEAD.lensY) {
      expect(y - radius).toBeGreaterThan(yMin);
      expect(y + radius).toBeLessThan(yMax);
    }
    expect(SIGNAL_HEAD.lensZ - radius).toBeGreaterThan(zMin);
    expect(SIGNAL_HEAD.lensZ + radius).toBeLessThan(zMax);
    // centred across the face, and the three do not overlap
    expect(SIGNAL_HEAD.lensZ).toBeCloseTo((zMin + zMax) / 2, 3);
    expect(SIGNAL_HEAD.lensY[0] - SIGNAL_HEAD.lensY[1]).toBeGreaterThanOrEqual(2 * radius);
    expect(SIGNAL_HEAD.lensY[1] - SIGNAL_HEAD.lensY[2]).toBeGreaterThanOrEqual(2 * radius);
    // just in front of the face, by less than a centimetre of model scale
    expect(SIGNAL_HEAD.lensX).toBeLessThan(SIGNAL_HEAD.faceX);
    expect(SIGNAL_HEAD.faceX - SIGNAL_HEAD.lensX).toBeLessThan(0.005);
  });
});

describe('the modelled volume', () => {
  const eyeHeight = ROAD_SURFACE_Y + SCENARIO.camera.eyeHeight;
  let closest = Infinity;
  let widest = 0;
  let highest = 0;
  let longest = 0;
  for (let variant = 0; variant < VARIANT_COUNT; variant++) {
    for (const placement of chunkLayout(variant).placements) {
      for (const triangle of load(placement.model).triangles) {
        const [a, b, c] = [
          place(triangle.corners[0], placement),
          place(triangle.corners[1], placement),
          place(triangle.corners[2], placement),
        ];
        closest = Math.min(closest, distanceToTriangle(0, eyeHeight, a, b, c));
        for (const corner of [a, b, c]) {
          widest = Math.max(widest, Math.abs(corner[0]));
          highest = Math.max(highest, corner[1]);
          longest = Math.max(longest, Math.abs(corner[2]));
        }
      }
    }
  }

  it('nothing comes closer to the observer’s path than the tessellation rule assumes', () => {
    // The minimum edge length of the rule and its error bound (tessellation.test.ts) rest
    // on this distance. The closest things are the flanks of the parked vehicles, at 1.5 m.
    expect(closest).toBeGreaterThan(NEAREST_GEOMETRY);
    expect(TESSELLATION.minEdge).toBeLessThanOrEqual(TESSELLATION.maxAngle * closest);
    expect(closest).toBeLessThan(ROAD_SURFACE_Y + SCENARIO.camera.eyeHeight);
  });

  it('stays within the cross-section the error bound was measured for', () => {
    expect(widest).toBeLessThan(34);
    expect(highest).toBeLessThan(58);
    // and it is not trivially small either: the towers of the second row are there
    expect(widest).toBeGreaterThan(30);
    expect(highest).toBeGreaterThan(50);
  });

  it('every block keeps to its own length, so that blocks tile the avenue', () => {
    expect(longest).toBeLessThanOrEqual(CHUNK_LENGTH / 2 + 1e-6);
  });
});
