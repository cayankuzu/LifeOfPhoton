/**
 * Jumping to a state of the simulation: what a "show in the scene" button of the dossier does, and
 * what a stop of the guided tour of the panel "Why does it look like this?" does (src/ui/tour.ts).
 * A module of its own, so that the panel can use it without loading the dossier.
 */

import { type Settings, look, lookAhead, updateSettings } from '@/state/simulation';
import { SHEET_COVERS_QUERY } from '@/ui/DossierFrame';
import type { Scenario } from './types';

/** Whether the reader has asked the system for less motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * What a "show in the scene" button sets. Every button is self-contained: whatever its
 * scenario does not name goes back to the state its text assumes (the seen view, the
 * thermal emission on, no lens), so that the button pressed before cannot make the label
 * false. The motion is restarted only for readers who have not asked for less of it.
 */
export function scenarioSettings(scenario: Scenario, reduceMotion: boolean): Partial<Settings> {
  return {
    beta: scenario.beta,
    view: scenario.view ?? 'seen',
    thermal: scenario.thermal ?? true,
    lens: scenario.lens ?? 1,
    ...(reduceMotion ? {} : { paused: false }),
  };
}

export function applyScenario(scenario: Scenario): void {
  updateSettings(scenarioSettings(scenario, prefersReducedMotion()));
  if (scenario.look === 'left') {
    look.yaw = Math.PI / 2;
    look.pitch = 0;
  } else if (scenario.look === 'behind') {
    look.yaw = Math.PI;
    look.pitch = 0;
  } else if (scenario.look === 'up') {
    look.yaw = 0;
    look.pitch = Math.PI / 3;
  } else {
    lookAhead();
  }
  // where the sheet covers the scene, step aside to show it
  if (window.matchMedia(SHEET_COVERS_QUERY).matches) updateSettings({ dossier: null });
}
