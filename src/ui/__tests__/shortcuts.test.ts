import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { boostBy } from '@/physics/kinematics';
import { storedExplainer } from '@/state/preferences';
import { DEFAULT_SETTINGS, RAPIDITY_STEP, type Settings, getSettings, look, updateSettings } from '@/state/simulation';
import { type KeyScope, PRESETS, runShortcut } from '../shortcuts';

/** Focus on nothing in particular, over an uncovered stage. */
const FREE: KeyScope = { covered: false, inDossier: false, onControl: false };

const press = (key: string, scope: KeyScope = FREE, repeat = false): boolean =>
  runShortcut({ key, repeat }, getSettings(), scope);

/** The settings a key leaves behind, starting from `from`. */
function after(key: string, scope: KeyScope = FREE, from: Partial<Settings> = {}): Settings {
  updateSettings({ ...DEFAULT_SETTINGS, ...from });
  press(key, scope);
  return getSettings();
}

/** One key of every kind the simulation answers to. */
const LETTERS_DIGITS_SPACE = ['w', 's', 'a', ' ', 'm', 't', 'g', 'l', 'f', 'r', 'd', 'e', '0', '3', '5'];
const NAMED = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home'];

describe('keyboard shortcuts', () => {
  beforeEach(() => {
    updateSettings(DEFAULT_SETTINGS);
    look.yaw = 0;
    look.pitch = 0;
  });

  afterEach(() => {
    updateSettings(DEFAULT_SETTINGS);
  });

  it('act on the simulation', () => {
    expect(after('m').view).toBe('measured');
    expect(after('M').view).toBe('measured');
    expect(after('t').thermal).toBe(!DEFAULT_SETTINGS.thermal);
    expect(after('g').guides).toBe(!DEFAULT_SETTINGS.guides);
    expect(after(' ').paused).toBe(!DEFAULT_SETTINGS.paused);
    expect(after('d').dossier).toBe('abstract');
    expect(after('d', FREE, { dossier: 'method' }).dossier).toBeNull();
    expect(after('ArrowUp').beta).toBe(boostBy(0, RAPIDITY_STEP));
    expect(after('w', FREE, { beta: 0.5 }).beta).toBe(boostBy(0.5, RAPIDITY_STEP));
    expect(after('s', FREE, { beta: 0.5 }).beta).toBe(boostBy(0.5, -RAPIDITY_STEP));
    PRESETS.forEach((beta, digit) => expect(after(String(digit)).beta).toBe(beta));
    // a digit without a preset is not a shortcut, and keeps its default action
    expect(press('6')).toBe(false);
    look.yaw = 0;
    expect(press('ArrowLeft')).toBe(true);
    expect(look.yaw).toBeGreaterThan(0);
  });

  it('open and close the panel “Why does it look like this?” and remember the choice', () => {
    const items = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) => items.set(key, value),
      },
    });
    try {
      expect(after('e').explainer).toBe(false);
      expect(storedExplainer()).toBe(false);
      expect(after('E', FREE, { explainer: false }).explainer).toBe(true);
      expect(storedExplainer()).toBe(true);
      // a switch: holding the key does not flip it at the repeat rate
      updateSettings({ ...DEFAULT_SETTINGS });
      expect(press('e', FREE, true)).toBe(false);
      expect(getSettings().explainer).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('tell the browser to skip its default only for keys they used', () => {
    expect(press('m')).toBe(true);
    expect(press('x')).toBe(false);
    expect(press('Tab')).toBe(false);
  });

  it('leave Space to a focused button', () => {
    const settings = after(' ', { ...FREE, onControl: true });
    expect(settings.paused).toBe(DEFAULT_SETTINGS.paused);
    expect(press(' ', { ...FREE, onControl: true })).toBe(false);
  });

  it('can have every single-character shortcut switched off, and keep arrows, Home and Escape (WCAG 2.1.4)', () => {
    for (const key of LETTERS_DIGITS_SPACE) {
      updateSettings({ ...DEFAULT_SETTINGS, singleKeys: false, beta: 0.5 });
      expect(press(key), key).toBe(false);
      expect(getSettings(), key).toEqual({ ...DEFAULT_SETTINGS, singleKeys: false, beta: 0.5 });
    }
    for (const key of NAMED) {
      updateSettings({ ...DEFAULT_SETTINGS, singleKeys: false, beta: 0.5 });
      expect(press(key), key).toBe(true);
    }
    expect(after('ArrowUp', FREE, { singleKeys: false }).beta).toBe(boostBy(0, RAPIDITY_STEP));
    expect(after('Escape', FREE, { singleKeys: false, dossier: 'abstract' }).dossier).toBeNull();
  });

  it('do nothing to a scene that a layer covers, except that Escape closes the dossier', () => {
    const covered: KeyScope = { ...FREE, covered: true };
    for (const key of [...LETTERS_DIGITS_SPACE, ...NAMED]) {
      updateSettings({ ...DEFAULT_SETTINGS, dossier: 'abstract', beta: 0.5 });
      look.yaw = 0;
      expect(press(key, covered), key).toBe(false);
      expect(getSettings(), key).toEqual({ ...DEFAULT_SETTINGS, dossier: 'abstract', beta: 0.5 });
      expect(look.yaw, key).toBe(0);
    }
    expect(after('Escape', covered, { dossier: 'abstract' }).dossier).toBeNull();
  });

  it('leave the keys to reading inside the dossier, apart from Escape', () => {
    const inside: KeyScope = { ...FREE, inDossier: true };
    for (const key of [...LETTERS_DIGITS_SPACE, ...NAMED]) {
      updateSettings({ ...DEFAULT_SETTINGS, dossier: 'abstract' });
      expect(press(key, inside), key).toBe(false);
      expect(getSettings().dossier, key).toBe('abstract');
    }
    expect(after('Escape', inside, { dossier: 'abstract' }).dossier).toBeNull();
  });

  it('let the browser keep Escape, and do nothing with it while no dossier is open', () => {
    expect(press('Escape')).toBe(false);
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('flip a switch once per press, however long it is held, but keep boosting while an arrow is held', () => {
    updateSettings({ ...DEFAULT_SETTINGS });
    expect(press('m', FREE, true)).toBe(false);
    expect(getSettings().view).toBe(DEFAULT_SETTINGS.view);
    expect(press('d', FREE, true)).toBe(false);
    expect(getSettings().dossier).toBeNull();
    expect(press('ArrowUp', FREE, true)).toBe(true);
    expect(getSettings().beta).toBe(boostBy(0, RAPIDITY_STEP));
  });
});
