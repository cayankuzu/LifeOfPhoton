/**
 * Adaptive resolution.
 *
 * The cost of a frame grows with the number of pixels, and it grows with speed:
 * aberration crowds the whole avenue into the forward view, where its layers
 * overlap. When the frame rate falls the scene is drawn with fewer pixels and
 * scaled up; when it has been high for a while the resolution is raised again.
 *
 * The rule is deliberately lopsided. It lowers the resolution quickly, in large
 * steps, because a slow frame rate is worse than a soft picture; it raises it
 * slowly, in small steps, and not at all for a while after a step down, so that
 * the picture does not pump between two resolutions.
 */

/** Limits of the device pixel ratio the scene is drawn at. */
export const MIN_PIXEL_RATIO = 0.6;
export const MAX_PIXEL_RATIO = 1.5;

/** Below this frame rate the resolution is lowered, above the other it may be raised, frames per second. */
const SLOW_BELOW = 42;
const FAST_ABOVE = 57;

/** How long the frame rate has to stay slow or fast before the resolution changes, s. */
const SLOW_FOR = 1.5;
const FAST_FOR = 6;

/** Steps of the pixel ratio, down and up. */
const STEP_DOWN = 0.2;
const STEP_UP = 0.1;

/** After a step down the resolution is not raised again for this long, s. */
const HOLD_AFTER_DROP = 45;

/** Ratios are kept to two decimals, so that steps down and up land on the same values. */
const snap = (ratio: number): number => Math.round(ratio * 100) / 100;

export interface ResolutionState {
  /** Time the frame rate has been below / above its threshold without interruption, s. */
  slowSeconds: number;
  fastSeconds: number;
  /** No step up before this time, s (same clock as `now`). */
  holdUntil: number;
}

export function createResolutionState(): ResolutionState {
  return { slowSeconds: 0, fastSeconds: 0, holdUntil: 0 };
}

/** The pixel ratio a device would be drawn at if speed were no concern. */
export function preferredPixelRatio(devicePixelRatio: number): number {
  return Math.min(Math.max(devicePixelRatio || 1, MIN_PIXEL_RATIO), MAX_PIXEL_RATIO);
}

/**
 * Takes one measurement of the frame rate — `fps` over the last `seconds` — and
 * returns the pixel ratio to draw at from now on (the same value when nothing
 * changes). `ceiling` is the preferred ratio of the device, `now` a clock in seconds.
 */
export function adaptResolution(
  state: ResolutionState,
  ratio: number,
  fps: number,
  seconds: number,
  now: number,
  ceiling: number
): number {
  state.slowSeconds = fps < SLOW_BELOW ? state.slowSeconds + seconds : 0;
  state.fastSeconds = fps > FAST_ABOVE ? state.fastSeconds + seconds : 0;

  if (state.slowSeconds > SLOW_FOR && ratio > MIN_PIXEL_RATIO) {
    state.slowSeconds = 0;
    state.fastSeconds = 0;
    state.holdUntil = now + HOLD_AFTER_DROP;
    return Math.max(MIN_PIXEL_RATIO, snap(ratio - STEP_DOWN));
  }
  if (state.fastSeconds > FAST_FOR && ratio < ceiling && now >= state.holdUntil) {
    state.fastSeconds = 0;
    return Math.min(ceiling, snap(ratio + STEP_UP));
  }
  return ratio;
}
