/**
 * The keyboard shortcuts of the simulation, apart from the DOM: App.tsx tells where the
 * key was pressed, this module decides what it does. Kept apart so that the rules (which
 * keys a covered stage still takes, which ones the reader can switch off) can be tested.
 */

import { BETA_MAX, boostBy } from '@/physics/kinematics';
import { chooseExplainer } from '@/state/preferences';
import { LENSES, RAPIDITY_STEP, type Settings, lookAhead, resetClocks, turnBy, updateSettings } from '@/state/simulation';

/** Velocities on the digit keys 0–5. */
export const PRESETS = [0, 0.5, Math.sqrt(3) / 2, 0.99, 0.9999, BETA_MAX] as const;

const LOOK_STEP = (15 * Math.PI) / 180;

/** Keys that act for as long as they are held. Everything else is a switch and acts once per press. */
const CONTINUOUS_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 's', 'a']);

export interface KeyPress {
  readonly key: string;
  readonly repeat: boolean;
}

/** Where the key was pressed, as far as the shortcuts are concerned. */
export interface KeyScope {
  /** A layer covers the stage (start-up or failure screen, a dossier that fills the viewport). */
  readonly covered: boolean;
  /** The focus is inside the dossier, where the keys belong to reading. */
  readonly inDossier: boolean;
  /** The focus is on a control that Space activates by itself. */
  readonly onControl: boolean;
}

/**
 * Acts on a key press. Returns whether the key was a shortcut whose default action
 * the browser must not also perform.
 */
export function runShortcut(press: KeyPress, settings: Settings, scope: KeyScope): boolean {
  const key = press.key.length === 1 ? press.key.toLowerCase() : press.key;

  // Escape closes the dossier from anywhere; the browser keeps its own use of the key
  if (key === 'Escape') {
    if (settings.dossier !== null) updateSettings({ dossier: null });
    return false;
  }
  // nothing that a layer hides is worked from the keyboard either
  if (scope.covered) return false;
  if (scope.inDossier) return false;
  // the reader can switch off every shortcut that is a single character (WCAG 2.1.4):
  // speech input types them with every word; arrows, Home and Escape stay
  if (key.length === 1 && !settings.singleKeys) return false;
  // holding a switch down must not flip it at the keyboard's repeat rate
  if (press.repeat && !CONTINUOUS_KEYS.has(key)) return false;

  switch (key) {
    case 'ArrowUp':
    case 'w':
      updateSettings({ beta: boostBy(settings.beta, RAPIDITY_STEP) });
      return true;
    case 'ArrowDown':
    case 's':
      updateSettings({ beta: boostBy(settings.beta, -RAPIDITY_STEP) });
      return true;
    case 'ArrowLeft':
    case 'a':
      turnBy(LOOK_STEP, 0);
      return true;
    case 'ArrowRight':
      turnBy(-LOOK_STEP, 0);
      return true;
    case ' ':
      // let Space activate a focused button instead
      if (scope.onControl) return false;
      updateSettings({ paused: !settings.paused });
      return true;
    case 'm':
      updateSettings({ view: settings.view === 'seen' ? 'measured' : 'seen' });
      return true;
    case 't':
      updateSettings({ thermal: !settings.thermal });
      return true;
    case 'g':
      updateSettings({ guides: !settings.guides });
      return true;
    case 'l':
      updateSettings({ lens: LENSES[(LENSES.indexOf(settings.lens) + 1) % LENSES.length] });
      return true;
    case 'f':
    case 'Home':
      lookAhead();
      return true;
    case 'r':
      resetClocks();
      return true;
    case 'd':
      updateSettings({ dossier: settings.dossier === null ? 'abstract' : null });
      return true;
    case 'e':
      // the panel "Why does it look like this?"; a choice of the reader, remembered as the button's is
      chooseExplainer(!settings.explainer);
      return true;
    default: {
      const digit = /^[0-9]$/.test(key) ? Number(key) : -1;
      if (digit < 0 || digit >= PRESETS.length) return false;
      updateSettings({ beta: PRESETS[digit] });
      return true;
    }
  }
}
