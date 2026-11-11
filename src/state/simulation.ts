/**
 * Application state.
 *
 * Two kinds of state with different lifetimes:
 *
 *   settings   discrete choices made by the user (target speed, view mode, …).
 *              React components subscribe to them with `useSettings`.
 *   telemetry  quantities the render loop advances sixty times a second (clocks,
 *              exposure, view direction). Routing those through React state would
 *              re-render the interface every frame, so they live in a plain
 *              mutable object and instruments read them from a per-frame callback.
 */

import { useSyncExternalStore } from 'react';
import { clampBeta } from '@/physics/kinematics';

export type ViewMode = 'seen' | 'measured';
export type Language = 'tr' | 'en';

/** Zoom factors of the three lenses. */
export const LENSES = [1, 3, 10] as const;
export type Lens = (typeof LENSES)[number];

export interface Settings {
  /** Target velocity v/c set by the user; the simulation eases towards it. */
  readonly beta: number;
  /** 'seen' = aberration and Doppler shift; 'measured' = pure Lorentz contraction. */
  readonly view: ViewMode;
  readonly paused: boolean;
  /** Include the thermal self-emission of the environment. */
  readonly thermal: boolean;
  /** Show the annotation layer (neutral cone, transverse plane, direction of motion). */
  readonly guides: boolean;
  readonly lens: Lens;
  readonly language: Language;
  /** Open section of the dossier, or null when it is closed. */
  readonly dossier: string | null;
  /** Whether the instrument dock is expanded. */
  readonly dock: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  beta: 0,
  view: 'seen',
  paused: false,
  thermal: true,
  guides: true,
  lens: 1,
  language: 'tr',
  dossier: null,
  dock: true,
};

type Listener = () => void;

let settings: Settings = DEFAULT_SETTINGS;
const listeners = new Set<Listener>();

export function getSettings(): Settings {
  return settings;
}

export function updateSettings(patch: Partial<Settings> | ((current: Settings) => Partial<Settings>)): void {
  const change = typeof patch === 'function' ? patch(settings) : patch;
  const next: Settings = { ...settings, ...change };
  if (change.beta !== undefined) (next as { beta: number }).beta = clampBeta(change.beta);
  let changed = false;
  for (const key of Object.keys(next) as Array<keyof Settings>) {
    if (next[key] !== settings[key]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  settings = next;
  listeners.forEach((listener) => listener());
}

export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Subscribes a component to one slice of the settings. */
export function useSettings<T>(selector: (state: Settings) => T): T {
  return useSyncExternalStore(
    subscribeSettings,
    () => selector(settings),
    () => selector(DEFAULT_SETTINGS)
  );
}

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

export type LoadPhase = 'loading' | 'building' | 'ready' | 'error';

export interface Telemetry {
  /** Velocity the simulation is actually at this frame (eased towards the target). */
  beta: number;
  /** Coordinate time of the street frame elapsed since the last reset, displayed seconds. */
  earthTime: number;
  /** Proper time of the observer elapsed since the last reset, displayed seconds. */
  properTime: number;
  /** Rest-frame distance covered since the last reset, m. */
  distance: number;
  /** Natural log of the current exposure relative to rest. */
  lnExposure: number;
  /** View direction relative to the direction of motion, rad. */
  yaw: number;
  pitch: number;
  /** Current vertical field of view, rad. */
  fieldOfView: number;
  /** Smoothed frame rate. */
  fps: number;
  /** Triangles submitted per frame. */
  triangles: number;
  /** Start-up state. */
  phase: LoadPhase;
  progress: number;
  error: string | null;
}

export const telemetry: Telemetry = {
  beta: 0,
  earthTime: 0,
  properTime: 0,
  distance: 0,
  lnExposure: 0,
  yaw: 0,
  pitch: 0,
  fieldOfView: 1,
  fps: 60,
  triangles: 0,
  phase: 'loading',
  progress: 0,
  error: null,
};

const frameListeners = new Set<Listener>();

/** Registers a callback that runs once per rendered frame, after the telemetry has been updated. */
export function onFrame(listener: Listener): () => void {
  frameListeners.add(listener);
  return () => {
    frameListeners.delete(listener);
  };
}

export function notifyFrame(): void {
  frameListeners.forEach((listener) => listener());
}

export function resetClocks(): void {
  telemetry.earthTime = 0;
  telemetry.properTime = 0;
  telemetry.distance = 0;
}

// --- start-up phase is low-frequency and drives React (the loading screen)
const phaseListeners = new Set<Listener>();
let phaseSnapshot = { phase: telemetry.phase, progress: 0, error: null as string | null };

export function setLoadPhase(phase: LoadPhase, progress = 0, error: string | null = null): void {
  telemetry.phase = phase;
  telemetry.progress = progress;
  telemetry.error = error;
  const rounded = Math.round(progress * 100) / 100;
  if (phaseSnapshot.phase === phase && phaseSnapshot.progress === rounded && phaseSnapshot.error === error) return;
  phaseSnapshot = { phase, progress: rounded, error };
  phaseListeners.forEach((listener) => listener());
}

export function useLoadPhase(): { phase: LoadPhase; progress: number; error: string | null } {
  return useSyncExternalStore(
    (listener) => {
      phaseListeners.add(listener);
      return () => {
        phaseListeners.delete(listener);
      };
    },
    () => phaseSnapshot,
    () => phaseSnapshot
  );
}

// ---------------------------------------------------------------------------
// View direction (free look)
// ---------------------------------------------------------------------------

/** Target view direction set by pointer and keyboard; the camera eases towards it. */
export const look = {
  yaw: 0,
  pitch: 0,
};

export const LOOK_PITCH_LIMIT = (80 * Math.PI) / 180;

export function turnBy(deltaYaw: number, deltaPitch: number): void {
  // keep the yaw within ±π so that "straight ahead" stays the shortest way back
  let yaw = look.yaw + deltaYaw;
  if (yaw > Math.PI) yaw -= 2 * Math.PI;
  if (yaw < -Math.PI) yaw += 2 * Math.PI;
  look.yaw = yaw;
  look.pitch = Math.min(LOOK_PITCH_LIMIT, Math.max(-LOOK_PITCH_LIMIT, look.pitch + deltaPitch));
}

export function lookAhead(): void {
  look.yaw = 0;
  look.pitch = 0;
}
