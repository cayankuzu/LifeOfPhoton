import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BETA_MAX } from '@/physics/kinematics';
import {
  DEFAULT_SETTINGS,
  LOOK_PITCH_LIMIT,
  type Settings,
  getSettings,
  look,
  lookAhead,
  notifyFrame,
  onFrame,
  resetClocks,
  setLoadPhase,
  subscribeSettings,
  telemetry,
  turnBy,
  updateSettings,
} from '../simulation';

/** The defaults and the telemetry as the module creates them, copied before any test can touch them. */
const PRISTINE_DEFAULTS = { ...DEFAULT_SETTINGS };
const PRISTINE_TELEMETRY = { ...telemetry };

/** A state in which every setting differs from its default. */
const EVERYTHING_CHANGED: Settings = {
  beta: 0.9,
  view: 'measured',
  paused: true,
  thermal: false,
  guides: false,
  lens: 10,
  language: 'en',
  dossier: 'optics',
  dock: false,
};

/** Subscriptions made by a test; they are removed after it even if it fails half-way. */
const subscriptions: Array<() => void> = [];

function watchSettings(listener: () => void): () => void {
  const unsubscribe = subscribeSettings(listener);
  subscriptions.push(unsubscribe);
  return unsubscribe;
}

function watchFrames(listener: () => void): () => void {
  const unsubscribe = onFrame(listener);
  subscriptions.push(unsubscribe);
  return unsubscribe;
}

/** Small deterministic generator (the Numerical Recipes LCG), so that the random walk is the same on every run. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

// The store is module-level state: every test starts from the defaults, looking straight
// ahead, with the clocks at zero.
beforeEach(() => {
  updateSettings(DEFAULT_SETTINGS);
  lookAhead();
  resetClocks();
});

afterEach(() => {
  subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
  setLoadPhase(PRISTINE_TELEMETRY.phase, PRISTINE_TELEMETRY.progress, PRISTINE_TELEMETRY.error);
  Object.assign(telemetry, PRISTINE_TELEMETRY);
});

describe('updateSettings', () => {
  it('merges a patch into the current settings and leaves the rest alone', () => {
    updateSettings({ view: 'measured' });
    updateSettings({ lens: 10, paused: true });
    expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, view: 'measured', lens: 10, paused: true });

    // a complete patch replaces everything, which is also how these tests return to the defaults
    updateSettings(EVERYTHING_CHANGED);
    expect(getSettings()).toEqual(EVERYTHING_CHANGED);
    updateSettings(DEFAULT_SETTINGS);
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('accepts a function of the current settings', () => {
    updateSettings({ lens: 3 });
    const current = getSettings();
    const received: Settings[] = [];
    updateSettings((settings) => {
      received.push(settings);
      return { paused: !settings.paused, dossier: 'optics' };
    });
    expect(received).toHaveLength(1);
    expect(received[0]).toBe(current);
    expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, lens: 3, paused: true, dossier: 'optics' });
  });

  it('keeps β within [0, β_max] however it is set', () => {
    const cases: Array<[requested: number, stored: number]> = [
      [0.5, 0.5],
      [BETA_MAX, BETA_MAX],
      [1, BETA_MAX],
      [2, BETA_MAX],
      [-1, 0],
    ];
    for (const [requested, stored] of cases) {
      // start each case from a velocity that none of them ends at
      updateSettings({ beta: 0.25 });
      updateSettings({ beta: requested });
      expect(getSettings().beta).toBe(stored);
      updateSettings({ beta: 0.25 });
      updateSettings(() => ({ beta: requested }));
      expect(getSettings().beta).toBe(stored);
    }
    // whatever is asked for, what is stored is a velocity the simulation can run at
    for (const requested of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1e300, -1e300]) {
      updateSettings({ beta: 0.25 });
      updateSettings({ beta: requested });
      const { beta } = getSettings();
      expect(Number.isFinite(beta), `β = ${requested}`).toBe(true);
      expect(beta, `β = ${requested}`).toBeGreaterThanOrEqual(0);
      expect(beta, `β = ${requested}`).toBeLessThanOrEqual(BETA_MAX);
    }
  });

  it('notifies every subscriber once per change, after the change has been made', () => {
    const seen: Settings[] = [];
    const first = vi.fn(() => {
      seen.push(getSettings());
    });
    const second = vi.fn();
    watchSettings(first);
    watchSettings(second);

    updateSettings({ view: 'measured' });
    expect(first).toHaveBeenCalledTimes(1);
    // one notification for a patch that touches several fields, not one per field
    updateSettings({ beta: 0.5, lens: 10, thermal: false });
    expect(first).toHaveBeenCalledTimes(2);
    updateSettings((current) => ({ paused: !current.paused }));
    expect(first).toHaveBeenCalledTimes(3);
    expect(second).toHaveBeenCalledTimes(3);

    // a subscriber that reads the store finds the new state, not the one before the change
    expect(seen[0]).toEqual({ ...DEFAULT_SETTINGS, view: 'measured' });
    expect(seen[1]).toEqual({ ...DEFAULT_SETTINGS, view: 'measured', beta: 0.5, lens: 10, thermal: false });
    expect(seen[2]).toEqual({ ...seen[1], paused: true });
  });

  it('stays silent when a patch changes nothing', () => {
    updateSettings({ view: 'measured', beta: 0.5 });
    const listener = vi.fn();
    watchSettings(listener);
    updateSettings({});
    updateSettings(() => ({}));
    updateSettings({ view: 'measured' });
    updateSettings({ beta: 0.5, view: 'measured' });
    updateSettings({ ...getSettings() });
    expect(listener).not.toHaveBeenCalled();

    // a request that the clamp turns into the value already stored is no change either
    updateSettings({ beta: BETA_MAX });
    expect(listener).toHaveBeenCalledTimes(1);
    updateSettings({ beta: 5 });
    updateSettings({ beta: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('never writes into the defaults', () => {
    updateSettings(EVERYTHING_CHANGED);
    updateSettings((current) => ({ beta: current.beta / 2, view: 'seen' }));
    expect(DEFAULT_SETTINGS).toEqual(PRISTINE_DEFAULTS);
  });
});

describe('getSettings', () => {
  it('returns the same object until something changes, and a new one afterwards', () => {
    // React compares snapshots by identity: a fresh object on every call would re-render
    // without end, and an object changed in place would never re-render
    const before = getSettings();
    updateSettings({ view: before.view, beta: before.beta });
    expect(getSettings()).toBe(before);

    updateSettings({ view: 'measured' });
    const after = getSettings();
    expect(after).not.toBe(before);
    expect(before.view).toBe('seen');
    expect(getSettings()).toBe(after);
  });
});

describe('subscribeSettings', () => {
  it('stops notifying a subscriber that has unsubscribed, and only that one', () => {
    const first = vi.fn();
    const second = vi.fn();
    const leave = watchSettings(first);
    watchSettings(second);

    updateSettings({ paused: true });
    leave();
    updateSettings({ paused: false });
    // unsubscribing a second time is harmless
    leave();
    updateSettings({ paused: true });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(3);
  });

  it('lets a subscriber unsubscribe itself while it is being notified', () => {
    const before = vi.fn();
    const after = vi.fn();
    watchSettings(before);
    const once = vi.fn(() => {
      leave();
    });
    const leave = watchSettings(once);
    watchSettings(after);

    updateSettings({ paused: true });
    updateSettings({ paused: false });
    expect(once).toHaveBeenCalledTimes(1);
    // the subscribers on either side of it miss nothing, not even in the round in which it left
    expect(before).toHaveBeenCalledTimes(2);
    expect(after).toHaveBeenCalledTimes(2);
  });
});

describe('frame callbacks', () => {
  it('run once per notified frame until they are removed', () => {
    const first = vi.fn();
    const second = vi.fn();
    const remove = watchFrames(first);
    watchFrames(second);

    notifyFrame();
    notifyFrame();
    remove();
    notifyFrame();
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(3);
  });

  it('are separate from the settings subscriptions', () => {
    // instruments redraw every frame without re-rendering the interface, and a setting
    // changes the interface without waiting for a frame
    const onSettings = vi.fn();
    const onEveryFrame = vi.fn();
    watchSettings(onSettings);
    watchFrames(onEveryFrame);

    notifyFrame();
    expect(onEveryFrame).toHaveBeenCalledTimes(1);
    expect(onSettings).not.toHaveBeenCalled();
    updateSettings({ paused: true });
    expect(onSettings).toHaveBeenCalledTimes(1);
    expect(onEveryFrame).toHaveBeenCalledTimes(1);
  });
});

describe('resetClocks', () => {
  it('zeroes the two clocks and the distance, and nothing else', () => {
    Object.assign(telemetry, {
      beta: 0.5,
      earthTime: 12.5,
      properTime: 3.25,
      distance: 1.5e9,
      lnExposure: -2,
      yaw: 0.3,
      pitch: 0.1,
      fieldOfView: 0.7,
      fps: 30,
      triangles: 1000,
    });
    updateSettings({ beta: 0.5 });
    turnBy(0.4, 0.2);
    const before = { ...telemetry };
    const settings = getSettings();
    const listener = vi.fn();
    watchSettings(listener);

    resetClocks();
    expect(telemetry).toEqual({ ...before, earthTime: 0, properTime: 0, distance: 0 });
    // the observer keeps moving and looking as before: only the stopwatches start again
    expect(getSettings()).toBe(settings);
    expect(look).toEqual({ yaw: 0.4, pitch: 0.2 });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('view direction', () => {
  it('adds up turns', () => {
    turnBy(0.3, 0.2);
    turnBy(0.1, -0.5);
    // 12 digits: one addition in double precision per axis
    expect(look.yaw).toBeCloseTo(0.4, 12);
    expect(look.pitch).toBeCloseTo(-0.3, 12);
  });

  it('keeps the yaw within ±π without changing the direction it stands for', () => {
    // turning past straight behind comes out on the other side
    turnBy(3, 0);
    turnBy(0.5, 0);
    expect(look.yaw).toBeCloseTo(3.5 - 2 * Math.PI, 12);
    lookAhead();
    turnBy(-3, 0);
    turnBy(-0.5, 0);
    expect(look.yaw).toBeCloseTo(2 * Math.PI - 3.5, 12);
    // straight behind itself stays as it is: both ends of the interval are allowed
    lookAhead();
    turnBy(Math.PI, 0);
    expect(look.yaw).toBe(Math.PI);

    // a long walk of turns of up to half a revolution each
    lookAhead();
    const random = seeded(1915);
    let total = 0;
    for (let step = 0; step < 2000; step++) {
      const turn = (2 * random() - 1) * Math.PI;
      total += turn;
      turnBy(turn, 0);
      expect(Math.abs(look.yaw)).toBeLessThanOrEqual(Math.PI);
      // the same direction as the sum that was never wrapped: they differ by whole revolutions.
      // 1e-10 rad leaves room for the rounding of 2000 additions and subtractions of 2π.
      expect(Math.abs(Math.sin((look.yaw - total) / 2))).toBeLessThan(1e-10);
    }
  });

  it('stops the pitch at the limit, short of the vertical, and turns back from it at once', () => {
    // looking exactly along the vertical would leave the yaw without a meaning
    expect(LOOK_PITCH_LIMIT).toBeGreaterThan(0);
    expect(LOOK_PITCH_LIMIT).toBeLessThan(Math.PI / 2);

    turnBy(0.3, 10);
    expect(look.pitch).toBe(LOOK_PITCH_LIMIT);
    // there is no hidden overshoot to unwind first
    turnBy(0, -0.1);
    expect(look.pitch).toBeCloseTo(LOOK_PITCH_LIMIT - 0.1, 12);
    turnBy(0, -100);
    expect(look.pitch).toBe(-LOOK_PITCH_LIMIT);
    // the limit concerns the pitch alone
    expect(look.yaw).toBe(0.3);
  });

  it('returns to straight ahead with lookAhead', () => {
    turnBy(2, 1);
    lookAhead();
    expect(look).toEqual({ yaw: 0, pitch: 0 });
  });
});

describe('setLoadPhase', () => {
  it('records the phase, its progress and its error in the telemetry', () => {
    setLoadPhase('building', 0.123456);
    expect(telemetry).toMatchObject({ phase: 'building', progress: 0.123456, error: null });
    setLoadPhase('error', 0.5, 'context lost');
    expect(telemetry).toMatchObject({ phase: 'error', progress: 0.5, error: 'context lost' });
    // progress and error belong to the phase just entered: they do not linger into the next one
    setLoadPhase('ready');
    expect(telemetry).toMatchObject({ phase: 'ready', progress: 0, error: null });
  });
});
