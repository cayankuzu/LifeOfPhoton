import { describe, expect, it } from 'vitest';
import { SCENARIO } from '@/physics/scenario';
import { EMITTER } from '../../emitters';
import {
  CARRIAGEWAY_HALF_WIDTH,
  CHUNK_COUNT,
  CHUNK_LENGTH,
  CHUNKS_BEHIND,
  LAMP_MODEL,
  LUMINAIRE_FACE_AREA,
  LUMINAIRE_SPACING,
  LUMINAIRE_X,
  LUMINAIRE_Y,
  MODEL_PATHS,
  PAVEMENT_Y,
  ROAD_HALF_WIDTH,
  ROAD_SURFACE_Y,
  SIGNAL_HEAD,
  SIGNAL_MODEL,
  SIGNAL_SCALE,
  VARIANT_COUNT,
  chunkLayout,
  chunkLuminaires,
} from '../layout';

const VARIANTS = Array.from({ length: VARIANT_COUNT }, (_, variant) => variant);
const count = <T>(items: readonly T[], test: (item: T) => boolean): number => items.filter(test).length;

describe('the avenue', () => {
  it('is long enough to dissolve before its ends come into view, with most of it ahead', () => {
    expect(CHUNK_COUNT * CHUNK_LENGTH).toBeGreaterThanOrEqual(500);
    expect(CHUNKS_BEHIND).toBeGreaterThanOrEqual(2);
    expect(CHUNKS_BEHIND).toBeLessThan(CHUNK_COUNT / 2);
    // every variant is used, and the sequence of blocks repeats only after all variants
    expect(CHUNK_COUNT).toBeGreaterThanOrEqual(VARIANT_COUNT);
  });

  it('has a cross-section that fits: carriageway inside the road tile, kerb below the pavement', () => {
    expect(CARRIAGEWAY_HALF_WIDTH).toBeLessThan(ROAD_HALF_WIDTH);
    expect(ROAD_SURFACE_Y).toBeGreaterThan(0);
    expect(PAVEMENT_Y).toBeGreaterThan(ROAD_SURFACE_Y);
    // a kerb, not a wall
    expect(PAVEMENT_Y - ROAD_SURFACE_Y).toBeLessThan(0.2);
  });
});

describe('block layouts', () => {
  it('are deterministic, and the variants differ from one another', () => {
    const serialised = VARIANTS.map((variant) => JSON.stringify(chunkLayout(variant)));
    VARIANTS.forEach((variant) => expect(JSON.stringify(chunkLayout(variant))).toBe(serialised[variant]));
    expect(new Set(serialised).size).toBe(VARIANT_COUNT);
  });

  it('place only models of the kit, each with a valid transform', () => {
    for (const variant of VARIANTS) {
      for (const placement of chunkLayout(variant).placements) {
        expect(MODEL_PATHS as readonly string[]).toContain(placement.model);
        expect(placement.scale.every((s) => s > 0)).toBe(true);
        expect(Number.isFinite(placement.yaw)).toBe(true);
        expect(placement.position.every(Number.isFinite)).toBe(true);
        // origins stay inside the block
        expect(Math.abs(placement.position[2])).toBeLessThanOrEqual(CHUNK_LENGTH / 2);
      }
    }
  });

  it('use every model that is downloaded', () => {
    const used = new Set(VARIANTS.flatMap((variant) => chunkLayout(variant).placements.map((placement) => placement.model)));
    expect([...used].sort()).toEqual([...MODEL_PATHS].sort());
  });

  it('every block has its ground, both rows of buildings and four luminaires', () => {
    for (const variant of VARIANTS) {
      const { placements } = chunkLayout(variant);
      // three road tiles and three pavement tiles on either side
      expect(count(placements, (p) => p.kind === 'ground')).toBe(9);
      // three buildings on either side and one tower behind them on either side
      expect(count(placements, (p) => p.kind === 'building')).toBe(8);
      expect(count(placements, (p) => p.model === LAMP_MODEL)).toBe(4);
      for (const side of [-1, 1]) {
        expect(count(placements, (p) => p.kind === 'building' && Math.sign(p.position[0]) === side)).toBe(4);
      }
    }
  });

  it('buildings face the street and stand clear of the pavement’s inner half', () => {
    for (const variant of VARIANTS) {
      for (const placement of chunkLayout(variant).placements) {
        if (placement.kind !== 'building') continue;
        // model +z is turned towards the centre line on either side
        expect(placement.yaw).toBeCloseTo(placement.position[0] < 0 ? Math.PI / 2 : -Math.PI / 2, 12);
        expect(Math.abs(placement.position[0])).toBeGreaterThan(ROAD_HALF_WIDTH + 4);
      }
    }
  });

  it('keeps the carriageway clear except for the parked vehicles', () => {
    for (const variant of VARIANTS) {
      for (const placement of chunkLayout(variant).placements) {
        if (placement.kind !== 'prop') continue;
        const x = Math.abs(placement.position[0]);
        if (placement.model.includes('/vehicle-')) {
          // in a lane, on the driving surface, parallel to the street
          expect(x).toBeLessThan(CARRIAGEWAY_HALF_WIDTH);
          expect(x).toBeGreaterThan(2);
          expect(placement.position[1]).toBe(ROAD_SURFACE_Y);
          expect(Math.abs(Math.sin(placement.yaw))).toBeLessThan(1e-12);
        } else if (placement.model !== '/models/sign-highway.glb') {
          // everything else stands on the pavement (the gantry spans the road from pavement to pavement)
          expect(x).toBeGreaterThanOrEqual(ROAD_HALF_WIDTH);
        }
      }
    }
  });
});

describe('street luminaires', () => {
  it('stand at an even spacing that continues from block to block', () => {
    const luminaires = chunkLuminaires();
    expect(luminaires.length).toBe(4);
    for (const side of [-1, 1]) {
      const zs = [-1, 0, 1]
        .flatMap((block) =>
          luminaires.filter((l) => Math.sign(l.position[0]) === side).map((l) => l.position[2] + block * CHUNK_LENGTH)
        )
        .sort((a, b) => a - b);
      for (let i = 1; i < zs.length; i++) expect(zs[i] - zs[i - 1]).toBeCloseTo(LUMINAIRE_SPACING, 12);
    }
  });

  it('are the light faces of the placed lamp models: over the kerb, opposite one another', () => {
    const lamps = chunkLayout(0).placements.filter((placement) => placement.model === LAMP_MODEL);
    const luminaires = chunkLuminaires();
    for (const luminaire of luminaires) {
      const [x, y, z] = luminaire.position;
      expect(Math.abs(x)).toBeCloseTo(LUMINAIRE_X, 12);
      expect(y).toBeCloseTo(LUMINAIRE_Y, 12);
      // a lamp model stands at the same z, further from the centre line, on the same side
      const post = lamps.find((lamp) => lamp.position[2] === z && Math.sign(lamp.position[0]) === Math.sign(x));
      expect(post).toBeDefined();
      expect(Math.abs(post!.position[0])).toBeGreaterThan(Math.abs(x));
      // and its mirror image exists
      expect(luminaires.some((other) => other.position[0] === -x && other.position[2] === z)).toBe(true);
    }
    // the head reaches the carriageway's edge but stays outside the lanes
    expect(LUMINAIRE_X).toBeGreaterThan(CARRIAGEWAY_HALF_WIDTH - 0.5);
    expect(LUMINAIRE_X).toBeLessThan(ROAD_HALF_WIDTH);
    // mounting height and face size of a real street luminaire
    expect(LUMINAIRE_Y - ROAD_SURFACE_Y).toBeGreaterThan(5);
    expect(LUMINAIRE_Y - ROAD_SURFACE_Y).toBeLessThan(10);
    expect(LUMINAIRE_FACE_AREA).toBeGreaterThan(0.1);
    expect(LUMINAIRE_FACE_AREA).toBeLessThan(0.6);
  });
});

describe('traffic signals', () => {
  it('stand at the crossings only, one on either side', () => {
    for (const variant of VARIANTS) {
      const { placements, panels } = chunkLayout(variant);
      const hasCrossing = placements.some((placement) => placement.model === '/models/road-crossing.glb');
      expect(hasCrossing).toBe(variant % 2 === 0);
      const signals = placements.filter((placement) => placement.model === SIGNAL_MODEL);
      expect(signals.length).toBe(hasCrossing ? 2 : 0);
      // the lenses are the only geometry the layout adds to the models
      expect(panels.length).toBe(3 * signals.length);
      if (hasCrossing) expect(signals[0].position[0]).toBe(-signals[1].position[0]);
    }
  });

  it('each signal has three lenses, stacked red over amber over green, and shows red', () => {
    const { placements, panels } = chunkLayout(0);
    const signals = placements.filter((placement) => placement.model === SIGNAL_MODEL);
    for (const signal of signals) {
      const lenses = panels
        .filter((panel) => Math.sign(panel.centre[0]) === Math.sign(signal.position[0]))
        .sort((a, b) => b.centre[1] - a.centre[1]);
      expect(lenses.length).toBe(3);
      expect(lenses.map((lens) => lens.emitter)).toEqual([EMITTER.signalRed, EMITTER.none, EMITTER.none]);
      lenses.forEach((lens, index) => {
        // at the height of the model's head
        expect(lens.centre[1]).toBeCloseTo(signal.position[1] + SIGNAL_HEAD.lensY[index] * SIGNAL_SCALE[1], 12);
        // an upright square as wide as a real signal lens (200–300 mm), facing along the street
        const width = 2 * Math.hypot(lens.u[0], lens.u[1], lens.u[2]);
        const height = 2 * Math.hypot(lens.v[0], lens.v[1], lens.v[2]);
        expect(width).toBeGreaterThan(0.19);
        expect(width).toBeLessThan(0.31);
        expect(height).toBeCloseTo(width, 1);
        expect(lens.u[1]).toBe(0);
        expect(Math.abs(lens.u[2])).toBeLessThan(1e-12);
        expect(lens.v[0]).toBe(0);
        expect(lens.v[2]).toBe(0);
        // unlit glass is dark; the tint tells the lenses apart
        expect(Math.max(...lens.colour)).toBeLessThanOrEqual(0.1);
      });
      // red, amber, green by their dominant tint
      expect(lenses[0].colour[0]).toBeGreaterThan(lenses[0].colour[1]);
      expect(lenses[2].colour[1]).toBeGreaterThan(lenses[2].colour[0]);
      // the aspect and the tints are the scenario's
      expect(SCENARIO.signals.aspect).toBe('red');
      expect(lenses.map((lens) => lens.colour)).toEqual([
        SCENARIO.signals.glassAlbedo.red,
        SCENARIO.signals.glassAlbedo.amber,
        SCENARIO.signals.glassAlbedo.green,
      ]);
    }
  });

  it('the signal on the right faces the observer, the one on the left the oncoming traffic', () => {
    const { placements, panels } = chunkLayout(0);
    for (const signal of placements.filter((placement) => placement.model === SIGNAL_MODEL)) {
      const lens = panels.find((panel) => Math.sign(panel.centre[0]) === Math.sign(signal.position[0]))!;
      // The head hangs over the road at a different z than its post; the lenses sit on
      // the head's face, which is offset from the head's centre along the street.
      const headZ = lens.centre[2];
      const side = Math.sign(signal.position[0]);
      // the observer travels towards −z, so a lens seen from the front has the head behind it at smaller z
      const facing = side > 0 ? 1 : -1;
      const postToLens = headZ - signal.position[2];
      // right-hand signal: lenses on the +z side of the model's −x face; left-hand: mirrored
      expect(Math.sign(postToLens)).toBe(facing);
    }
  });
});
