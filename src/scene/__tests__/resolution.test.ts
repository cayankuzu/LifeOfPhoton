import { describe, expect, it } from 'vitest';
import { MAX_PIXEL_RATIO, MIN_PIXEL_RATIO, adaptResolution, createResolutionState, preferredPixelRatio } from '../resolution';

/** Feeds a constant frame rate for a while, in half-second measurements, and returns the ratio it ends at. */
function run(
  state: ReturnType<typeof createResolutionState>,
  ratio: number,
  fps: number,
  seconds: number,
  startAt = 0,
  ceiling = 1
): { ratio: number; now: number; changes: number[] } {
  const changes: number[] = [];
  let now = startAt;
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += 0.5) {
    now += 0.5;
    const next = adaptResolution(state, ratio, fps, 0.5, now, ceiling);
    if (next !== ratio) changes.push(now - startAt);
    ratio = next;
  }
  return { ratio, now, changes };
}

describe('preferredPixelRatio', () => {
  it('follows the device up to the limit beyond which pixels cost more than they show', () => {
    expect(preferredPixelRatio(1)).toBe(1);
    expect(preferredPixelRatio(1.25)).toBe(1.25);
    expect(preferredPixelRatio(2)).toBe(MAX_PIXEL_RATIO);
    expect(preferredPixelRatio(3)).toBe(MAX_PIXEL_RATIO);
    // a missing or absurd value still gives a usable ratio
    expect(preferredPixelRatio(0)).toBe(1);
    expect(preferredPixelRatio(Number.NaN)).toBe(1);
    expect(preferredPixelRatio(0.3)).toBe(MIN_PIXEL_RATIO);
  });
});

describe('adaptResolution', () => {
  it('leaves the resolution alone while the frame rate is fine', () => {
    const { ratio, changes } = run(createResolutionState(), 1, 50, 120);
    expect(ratio).toBe(1);
    expect(changes).toEqual([]);
  });

  it('lowers it after two seconds of a slow frame rate, and keeps lowering it down to the floor', () => {
    const state = createResolutionState();
    const { ratio, changes } = run(state, 1, 30, 20);
    // 1.0 → 0.8 → 0.6, each step after more than a second and a half below 42 fps
    expect(changes.length).toBe(2);
    expect(changes[0]).toBeCloseTo(2, 9);
    expect(changes[1]).toBeCloseTo(4, 9);
    expect(ratio).toBeCloseTo(MIN_PIXEL_RATIO, 12);
  });

  it('is not triggered by a hitch: one good measurement starts the count again', () => {
    const state = createResolutionState();
    let ratio = 1;
    let now = 0;
    for (let i = 0; i < 40; i++) {
      now += 0.5;
      // three slow measurements, then a fast one, over and over
      ratio = adaptResolution(state, ratio, i % 4 === 3 ? 60 : 30, 0.5, now, 1);
    }
    expect(ratio).toBe(1);
  });

  it('raises it again slowly, in small steps, and never above what the device calls for', () => {
    const state = createResolutionState();
    const { ratio, changes } = run(state, 0.6, 60, 60, 1000, 1);
    // one step of 0.1 for every six and a half seconds above 57 fps
    expect(changes.length).toBe(4);
    for (let i = 1; i < changes.length; i++) expect(changes[i] - changes[i - 1]).toBeCloseTo(6.5, 9);
    expect(ratio).toBeCloseTo(1, 12);
    expect(run(state, 1, 60, 60, 2000, 1).ratio).toBe(1);
    expect(run(createResolutionState(), 1.4, 60, 60, 0, MAX_PIXEL_RATIO).ratio).toBeCloseTo(MAX_PIXEL_RATIO, 12);
  });

  it('does not pump: after a step down it holds the lower resolution although the frame rate is high', () => {
    const state = createResolutionState();
    const slow = run(state, 1, 30, 2.5);
    expect(slow.ratio).toBeCloseTo(0.8, 12);
    // the lower resolution brings the frame rate back up at once
    const held = run(state, slow.ratio, 60, 40, slow.now);
    expect(held.ratio).toBeCloseTo(0.8, 12);
    // after the hold it may try again
    const later = run(state, held.ratio, 60, 20, held.now);
    expect(later.ratio).toBeGreaterThan(0.8);
  });

  it('never leaves the allowed range, whatever it is fed', () => {
    const state = createResolutionState();
    let ratio = 1.2;
    let now = 0;
    // a deterministic but irregular sequence of frame rates
    for (let i = 0; i < 4000; i++) {
      now += 0.5;
      const fps = 20 + ((i * 7919) % 53);
      ratio = adaptResolution(state, ratio, fps, 0.5, now, 1.3);
      expect(ratio).toBeGreaterThanOrEqual(MIN_PIXEL_RATIO - 1e-12);
      expect(ratio).toBeLessThanOrEqual(1.3 + 1e-12);
    }
  });
});
