/**
 * The marks the panel puts on the picture (src/ui/pointing.ts): they must stand where the shaders draw
 * the things they mark. The positions here are computed again by other means: the aberration law in its
 * scalar form (optics.ts: aberrate) instead of the vector transform, a rotation matrix instead of the
 * guide layer's projection, and the layout read again for every block.
 */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { lorentzFactor } from '@/physics/kinematics';
import { type Vec3, aberrate, measuredPoint, transversePlaneApparentAngle } from '@/physics/optics';
import { SCENARIO } from '@/physics/scenario';
import { PUBLIC_DIRECTORY, readGlb } from '@/scene/geometry/__tests__/glb';
import {
  CHUNK_COUNT,
  CHUNK_LENGTH,
  FADE_AHEAD_START,
  FADE_BEHIND_START,
  OBSERVER_Y,
  VARIANT_COUNT,
  blockCentreAhead,
  chunkLayout,
  chunkLuminaires,
} from '@/scene/geometry/layout';
import { EXPLAIN_SECTIONS, type ExplainKey } from '../explain';
import { EXPLAIN_POINTING, INTERFACE_ENTRIES, INVENTORY_IDS, SCENE_MARKS, type SceneMark, inventoryPointing } from '../inventory';
import {
  arrowToCovered,
  DIRECTIONS,
  EDGE_INSET,
  MODEL_CENTRES,
  OBJECT_MARKS,
  outOfPanels,
  PANEL_ARROW_GAP,
  PLACES,
  type MarkShape,
  type PointingView,
  getPointerTarget,
  resolveMark,
  setPointerTarget,
  subscribePointerTarget,
  thingsAround,
} from '../pointing';

const DEG = Math.PI / 180;
const WIDTH = 1280;
const HEIGHT = 720;

/** The vertical field of view of a lens of the scene (Simulation.tsx). */
const fieldOfView = (zoom: number): number => 2 * Math.atan(Math.tan((SCENARIO.camera.fieldOfViewDeg * DEG) / 2) / zoom);

const viewOf = (patch: Partial<PointingView>): PointingView => ({
  beta: 0,
  optical: 1,
  travel: 13,
  yaw: 0,
  pitch: 0,
  fieldOfView: fieldOfView(1),
  thermal: true,
  width: WIDTH,
  height: HEIGHT,
  ...patch,
});

/** Where a rest-frame displacement is drawn, by the scalar law: the angle from the motion aberrated, the azimuth kept. */
function seenDirection(rel: Vec3, beta: number): Vec3 {
  const r = Math.hypot(rel.x, rel.y, rel.z);
  const across = Math.hypot(rel.x, rel.y);
  const theta = aberrate(Math.acos(-rel.z / r), beta);
  if (across === 0) return { x: 0, y: 0, z: -Math.cos(theta) };
  return { x: (rel.x / across) * Math.sin(theta), y: (rel.y / across) * Math.sin(theta), z: -Math.cos(theta) };
}

/** Pixel of a world direction for a camera turned by Euler angles (pitch, yaw, 0) in the order 'YXZ', or null behind. */
function pixel(d: Vec3, view: PointingView): [number, number] | null {
  // R = Ry(yaw) Rx(pitch); camera coordinates are Rᵀ d
  const cy = Math.cos(view.yaw);
  const sy = Math.sin(view.yaw);
  const cp = Math.cos(view.pitch);
  const sp = Math.sin(view.pitch);
  const columns = [
    [cy, 0, -sy],
    [sy * sp, cp, cy * sp],
    [sy * cp, -sp, cy * cp],
  ];
  const [x, y, z] = columns.map((c) => c[0] * d.x + c[1] * d.y + c[2] * d.z);
  if (z >= 0) return null;
  const tanY = Math.tan(view.fieldOfView / 2);
  const tanX = (tanY * view.width) / view.height;
  return [((x / -z / tanX + 1) * view.width) / 2, ((1 - y / -z / tanY) * view.height) / 2];
}

const inView = (p: [number, number] | null): p is [number, number] =>
  p !== null && p[0] >= 0 && p[0] <= WIDTH && p[1] >= 0 && p[1] <= HEIGHT;

/** Where a rest-frame displacement is drawn in the seen (optical 1) or the measured (optical 0) view. */
function drawn(rel: Vec3, beta: number, optical: 0 | 1): Vec3 {
  return optical === 1 ? seenDirection(rel, beta) : measuredPoint(rel, lorentzFactor(beta));
}

/** Every luminaire face in the part of the model drawn whole, read again from the layout. */
function luminaires(travel: number): Vec3[] {
  const result: Vec3[] = [];
  for (let index = 0; index < CHUNK_COUNT; index++) {
    const centre = blockCentreAhead(index, travel);
    for (const { position } of chunkLuminaires()) {
      const rel = { x: position[0], y: position[1] - OBSERVER_Y, z: position[2] - centre };
      if (-rel.z < FADE_AHEAD_START && -rel.z > -FADE_BEHIND_START && Math.hypot(rel.x, rel.y, rel.z) >= 3) result.push(rel);
    }
  }
  return result;
}

const spotAt = (shape: MarkShape | null): [number, number] => {
  if (shape?.kind !== 'spot') throw new Error(`expected a spot, got ${shape?.kind ?? 'nothing'}`);
  return [shape.at[0], shape.at[1]];
};

describe('the marks stand where the shaders draw the things', () => {
  const cameras = [
    { yaw: 0, pitch: 0, zoom: 1 },
    { yaw: 0.3, pitch: -0.1, zoom: 1 },
    { yaw: -0.5, pitch: 0.2, zoom: 1 },
    { yaw: 0.08, pitch: -0.05, zoom: 3 },
    { yaw: 0, pitch: -0.02, zoom: 10 },
    { yaw: 2.6, pitch: 0.1, zoom: 1 },
  ];
  const cases = [
    { beta: 0, optical: 1 as const },
    { beta: 0.5, optical: 1 as const },
    { beta: 0.99, optical: 1 as const },
    { beta: 0, optical: 0 as const },
    { beta: 0.5, optical: 0 as const },
    { beta: 0.99, optical: 0 as const },
  ];

  it('places the nearest street lamp in the view within a pixel', () => {
    let compared = 0;
    for (const travel of [13, 517.3]) {
      for (const { beta, optical } of cases) {
        for (const { yaw, pitch, zoom } of cameras) {
          const view = viewOf({ beta, optical, travel, yaw, pitch, fieldOfView: fieldOfView(zoom) });
          const visible = luminaires(travel)
            .map((rel) => ({ rel, at: pixel(drawn(rel, beta, optical), view) }))
            .filter((lamp): lamp is { rel: Vec3; at: [number, number] } => inView(lamp.at))
            .sort((a, b) => Math.hypot(a.rel.x, a.rel.y, a.rel.z) - Math.hypot(b.rel.x, b.rel.y, b.rel.z));
          const shape = resolveMark('lamp', view);
          const context = `β ${beta}, optical ${optical}, yaw ${yaw}, pitch ${pitch}, lens ${zoom}, travel ${travel}`;
          if (visible.length === 0) {
            expect(shape?.kind, context).toBe('edge');
            continue;
          }
          const [x, y] = spotAt(shape);
          expect(Math.abs(x - visible[0].at[0]), context).toBeLessThan(1);
          expect(Math.abs(y - visible[0].at[1]), context).toBeLessThan(1);
          compared++;
        }
      }
    }
    expect(compared).toBeGreaterThan(40);
  });

  it('places the road ahead and the far end within a pixel', () => {
    for (const mark of ['road', 'farEnd'] as const) {
      for (const { beta, optical } of cases) {
        for (const { yaw, pitch, zoom } of cameras.slice(0, 5)) {
          const view = viewOf({ beta, optical, yaw, pitch, fieldOfView: fieldOfView(zoom) });
          const expected = pixel(drawn(PLACES[mark].rel, beta, optical), view);
          const shape = resolveMark(mark, view);
          const context = `${mark}: β ${beta}, optical ${optical}, yaw ${yaw}, pitch ${pitch}, lens ${zoom}`;
          if (!inView(expected)) {
            expect(shape?.kind, context).toBe('edge');
            continue;
          }
          const [x, y] = spotAt(shape);
          expect(Math.hypot(x - expected[0], y - expected[1]), context).toBeLessThan(1);
        }
      }
    }
  });

  it('places the Moon where its direction is seen', () => {
    const e = SCENARIO.moon.elevationDeg * DEG;
    const a = SCENARIO.moon.azimuthDeg * DEG;
    const moon = { x: Math.sin(a) * Math.cos(e), y: Math.sin(e), z: -Math.cos(a) * Math.cos(e) };
    for (const beta of [0, 0.5, 0.99]) {
      const view = viewOf({ beta });
      const expected = pixel(seenDirection(moon, beta), view)!;
      const [x, y] = spotAt(resolveMark('moon', view));
      expect(Math.hypot(x - expected[0], y - expected[1]), `β ${beta}`).toBeLessThan(1);
    }
  });

  it('draws the θ = 90° circle at the angle the transverse plane is seen at', () => {
    // (at β = 0.5 the circle, at 60°, lies outside the view ahead)
    for (const beta of [0.9, 0.99, 0.999]) {
      const view = viewOf({ beta });
      const shape = resolveMark('transverse', view);
      if (shape?.kind !== 'curves') throw new Error(`β ${beta}: expected curves`);
      const focal = HEIGHT / 2 / Math.tan(view.fieldOfView / 2);
      const expected = focal * Math.tan(transversePlaneApparentAngle(beta));
      const points = shape.paths.flat();
      expect(points.length).toBeGreaterThan(10);
      for (const [x, y] of points)
        expect(Math.abs(Math.hypot(x - WIDTH / 2, y - HEIGHT / 2) - expected), `β ${beta}`).toBeLessThan(1);
    }
  });

  it('turns a mark behind the observer into an arrow at the nearest edge', () => {
    // looking ahead: straight behind, turn right
    expect(resolveMark('behind', viewOf({}))).toEqual({ kind: 'edge', at: [WIDTH - EDGE_INSET, HEIGHT / 2], angle: 0 });
    // looking a little to the left (a positive yaw turns the camera towards −x): keep turning left
    const left = resolveMark('behind', viewOf({ yaw: 0.4 }));
    expect(left?.kind).toBe('edge');
    if (left?.kind === 'edge') {
      expect(left.at[0]).toBeCloseTo(EDGE_INSET, 6);
      expect(Math.abs(left.angle)).toBeCloseTo(Math.PI, 6);
    }
    // looking back, the direction of motion is behind
    expect(resolveMark('motion', viewOf({ yaw: Math.PI }))?.kind).toBe('edge');
    // and seen from behind, what is behind is a spot
    expect(resolveMark('behind', viewOf({ yaw: Math.PI }))?.kind).toBe('spot');
  });
});

describe('every mark and every text resolves to something', () => {
  const resolves = (mark: SceneMark, view: PointingView): boolean => resolveMark(mark, view) !== null;

  it('draws every mark of the scene where the thing exists', () => {
    for (const mark of SCENE_MARKS) {
      // the grid is drawn in the measured view only; the Doppler cones in the seen view, once they exist
      const view = mark === 'grid' ? viewOf({ beta: 0.5, optical: 0 }) : viewOf({ beta: 0.9 });
      expect(resolves(mark, view), mark).toBe(true);
    }
  });

  it('draws nothing for a thing that is not in the picture', () => {
    expect(resolves('grid', viewOf({ beta: 0.5 }))).toBe(false);
    expect(resolves('neutral', viewOf({ beta: 0 }))).toBe(false);
    expect(resolves('neutral', viewOf({ beta: 0.9, optical: 0 }))).toBe(false);
    expect(resolves('ring', viewOf({ beta: 0 }))).toBe(false);
    expect(resolves('glow', viewOf({ beta: 0.9, thermal: false }))).toBe(false);
    expect(resolves('glow', viewOf({ beta: 0.3 }))).toBe(false);
  });

  it('finds every kind of object in the drawn part of the avenue', () => {
    for (const kind of OBJECT_MARKS) {
      for (const travel of [0, 13, 250, 1e4 + 7.7])
        expect(thingsAround(kind, travel).length, `${kind} ${travel}`).toBeGreaterThan(0);
    }
  });

  it('points every item of "Now" at a mark of the scene or at elements of the interface', () => {
    expect(Object.keys(EXPLAIN_POINTING).sort()).toEqual(Object.keys(EXPLAIN_SECTIONS).sort());
    for (const key of Object.keys(EXPLAIN_SECTIONS) as ExplainKey[]) {
      const { scene, elements = [] } = EXPLAIN_POINTING[key];
      expect(scene !== undefined || elements.length > 0, key).toBe(true);
      if (scene) expect(SCENE_MARKS, key).toContain(scene);
      for (const element of elements) expect(INTERFACE_ENTRIES, key).toContain(element);
    }
  });

  it('points every entry of the inventory at something', () => {
    for (const id of INVENTORY_IDS) {
      const { scene, elements = [] } = inventoryPointing(id);
      expect(scene !== undefined || elements.length > 0, id).toBe(true);
    }
  });
});

describe('the things of the avenue', () => {
  it('marks the models at the centres of their bounds, read from the files', () => {
    for (const [model, centre] of Object.entries(MODEL_CENTRES)) {
      const { min, max } = readGlb(path.join(PUBLIC_DIRECTORY, model));
      centre.forEach((value, axis) => expect(value, `${model} ${axis}`).toBeCloseTo((min[axis] + max[axis]) / 2, 3));
    }
    // every model placed in the avenue among the props marked by their centre is in the table
    const placed = new Set(Array.from({ length: VARIANT_COUNT }, (_, v) => chunkLayout(v).placements.map((p) => p.model)).flat());
    for (const model of placed) {
      if (/\/(tree-|bench|parasol|sign-highway|vehicle-)/.test(model)) expect(Object.keys(MODEL_CENTRES), model).toContain(model);
    }
  });
});

describe('a thing under a panel', () => {
  it('gives way to the nearest one in the open, and is marked when there is no other', () => {
    for (const mark of OBJECT_MARKS) {
      const open = resolveMark(mark, viewOf({}));
      if (open?.kind !== 'spot') continue;
      // a panel over the thing that would be marked
      const [x, y] = open.at;
      const panel = { left: x - 5, top: y - 5, right: x + 5, bottom: y + 5 };
      const moved = resolveMark(mark, viewOf({ covered: [panel] }));
      expect(moved?.kind, mark).toBe('spot');
      if (moved?.kind !== 'spot') continue;
      const underIt =
        moved.at[0] >= panel.left && moved.at[0] <= panel.right && moved.at[1] >= panel.top && moved.at[1] <= panel.bottom;
      // the only one of its kind in the view stays marked, under the panel
      const everywhere = { left: -1, top: -1, right: WIDTH + 1, bottom: HEIGHT + 1 };
      expect(resolveMark(mark, viewOf({ covered: [everywhere] })), mark).toEqual(open);
      expect(underIt, mark).toBe(false);
    }
  });

  // a phone: the top bar, and the panel "Why?" folded to its line under it
  const PHONE = { width: 390, height: 760 };
  const BAR = { left: 12, top: 12, right: 378, bottom: 60 };
  const LINE = { left: 12, top: 72, right: 378, bottom: 112 };
  const under = (p: readonly [number, number], box: { left: number; top: number; right: number; bottom: number }): boolean =>
    p[0] >= box.left && p[0] <= box.right && p[1] >= box.top && p[1] <= box.bottom;

  it('is shown by an arrow just outside the panel, on its nearest side, pointing at it', () => {
    const at = [200, 50] as const;
    const arrow = arrowToCovered(at, [BAR], PHONE.width, PHONE.height);
    expect(arrow).toEqual({ kind: 'edge', at: [200, BAR.bottom + PANEL_ARROW_GAP], angle: -Math.PI / 2 });
    // a thing in the open has no arrow
    expect(arrowToCovered([200, 300], [BAR], PHONE.width, PHONE.height)).toBeNull();
  });

  it('goes on past a panel that adjoins the first, and never leaves the stage', () => {
    const at = [200, 50] as const;
    const place = outOfPanels(at, [BAR, LINE], PHONE.width, PHONE.height);
    expect(place).toEqual([200, LINE.bottom + PANEL_ARROW_GAP]);
    // near the right end of the bar the way out to the right would leave the stage: it goes down
    const right = outOfPanels([360, 30], [BAR], PHONE.width, PHONE.height);
    expect(right).toEqual([360, BAR.bottom + PANEL_ARROW_GAP]);
    // no way out at all: no arrow, the thing is marked where it is
    const everywhere = { left: -1, top: -1, right: PHONE.width + 1, bottom: PHONE.height + 1 };
    expect(outOfPanels(at, [everywhere], PHONE.width, PHONE.height)).toBeNull();
    expect(arrowToCovered(at, [everywhere], PHONE.width, PHONE.height)).toBeNull();
  });

  it('marks the Moon at rest under the top bar of a phone by an arrow below the bar, pointing at it', () => {
    const view = { ...viewOf({}), ...PHONE };
    const open = resolveMark('moon', view);
    if (open?.kind !== 'spot') throw new Error('the Moon is not in the view of a phone');
    const bar = { left: 0, top: 0, right: PHONE.width, bottom: open.at[1] + 30 };
    const moved = resolveMark('moon', { ...view, covered: [bar] });
    if (moved?.kind !== 'edge') throw new Error('no arrow');
    expect(under(moved.at, bar)).toBe(false);
    expect(moved.at[1]).toBeCloseTo(bar.bottom + PANEL_ARROW_GAP);
    // it points at the Moon
    const towards = Math.atan2(open.at[1] - moved.at[1], open.at[0] - moved.at[0]);
    expect(moved.angle).toBeCloseTo(towards);
  });

  it('moves an arrow at the edge of the view out from under a panel, keeping its direction', () => {
    const open = resolveMark('behind', viewOf({}));
    if (open?.kind !== 'edge') throw new Error('no arrow');
    const panel = { left: open.at[0] - 60, top: open.at[1] - 20, right: WIDTH, bottom: open.at[1] + 20 };
    const moved = resolveMark('behind', viewOf({ covered: [panel] }));
    if (moved?.kind !== 'edge') throw new Error('no arrow');
    expect(moved.angle).toBe(open.angle);
    expect(under(moved.at, panel)).toBe(false);
  });

  it('keeps the name of a curve out from under a panel', () => {
    const open = resolveMark('transverse', viewOf({ beta: 0.866 }));
    expect(open?.kind).toBe('curves');
    if (open?.kind !== 'curves' || !open.anchor) throw new Error('no label');
    const [x, y] = open.anchor;
    const panel = { left: x - 40, top: y - 40, right: x + 40, bottom: y + 40 };
    const moved = resolveMark('transverse', viewOf({ beta: 0.866, covered: [panel] }));
    if (moved?.kind !== 'curves' || !moved.anchor) throw new Error('no label beside the panel');
    const [mx, my] = moved.anchor;
    expect(mx >= panel.left && mx <= panel.right && my >= panel.top && my <= panel.bottom).toBe(false);
  });
});

describe('the patch of sky', () => {
  it('is seldom hidden behind a sign gantry', () => {
    // the top of a gantry above the eye, from its model and its placement
    const placement = Array.from({ length: VARIANT_COUNT }, (_, v) => chunkLayout(v).placements)
      .flat()
      .find((p) => /\/sign-highway\.glb$/.test(p.model));
    expect(placement).toBeDefined();
    const { max } = readGlb(path.join(PUBLIC_DIRECTORY, placement!.model));
    const top = placement!.position[1] + max[1] * placement!.scale[1] - OBSERVER_Y;
    // the share of the way, metre by metre along the whole avenue, over which a gantry ahead hides an elevation
    const hiddenShare = (elevation: number): number => {
      const steps = CHUNK_COUNT * CHUNK_LENGTH;
      let hidden = 0;
      for (let travel = 0; travel < steps; travel++) {
        const ahead = thingsAround('gantry', travel).filter((thing) => thing.rel.z < 0);
        if (ahead.some((thing) => Math.atan2(top, -thing.rel.z) > elevation)) hidden++;
      }
      return hidden / steps;
    };
    // the centre of the patch is in the open for more than four fifths of the way (just above the horizon, 6°, it was not for half)
    expect(hiddenShare(Math.asin(DIRECTIONS.sky.direction.y))).toBeLessThan(0.2);
    expect(hiddenShare(6 * DEG)).toBeGreaterThan(0.4);
  });
});

describe('the target of the marks', () => {
  it('notifies only when the target changes', () => {
    let calls = 0;
    const unsubscribe = subscribePointerTarget(() => calls++);
    setPointerTarget({ source: 'entry:moon', pointing: { scene: 'moon' } });
    setPointerTarget({ source: 'entry:moon', pointing: { scene: 'moon' } });
    expect(getPointerTarget()?.source).toBe('entry:moon');
    setPointerTarget(null);
    setPointerTarget(null);
    unsubscribe();
    expect(calls).toBe(2);
    expect(getPointerTarget()).toBeNull();
  });
});
