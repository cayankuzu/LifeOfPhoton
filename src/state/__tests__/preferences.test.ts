import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeFragment } from '../fragment';
import {
  chooseExplainer,
  chooseLanguage,
  chooseSingleKeys,
  storedExplainer,
  storedLanguage,
  storedSingleKeys,
} from '../preferences';
import { DEFAULT_SETTINGS, getSettings, updateSettings } from '../simulation';

/** A Storage held in memory, which can be told to refuse every access as a private window may. */
function memoryStorage(refuse = false): Storage {
  const items = new Map<string, string>();
  const guard = (): void => {
    if (refuse) throw new DOMException('The operation is insecure.', 'SecurityError');
  };
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => {
      guard();
      return items.get(key) ?? null;
    },
    setItem: (key, value) => {
      guard();
      items.set(key, String(value));
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

describe('preferences of the reader', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = memoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
    updateSettings(DEFAULT_SETTINGS);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    updateSettings(DEFAULT_SETTINGS);
  });

  it('remember nothing until the reader chooses', () => {
    expect(storedLanguage()).toBeNull();
    expect(storedSingleKeys()).toBeNull();
    expect(storedExplainer()).toBeNull();
  });

  it('switch the language and remember it as the reader’s choice', () => {
    chooseLanguage('en');
    expect(getSettings().language).toBe('en');
    expect(storedLanguage()).toBe('en');
    chooseLanguage('tr');
    expect(storedLanguage()).toBe('tr');
  });

  it('do not remember a language that only came with a link', () => {
    // a link's language reaches the settings directly; only the language button stores it
    updateSettings({ language: 'en' });
    expect(storedLanguage()).toBeNull();
  });

  it('switch the single-character shortcuts and remember both states', () => {
    chooseSingleKeys(false);
    expect(getSettings().singleKeys).toBe(false);
    expect(storedSingleKeys()).toBe(false);
    chooseSingleKeys(true);
    expect(getSettings().singleKeys).toBe(true);
    expect(storedSingleKeys()).toBe(true);
  });

  it('open and close the panel “Why does it look like this?” and remember both states', () => {
    expect(getSettings().explainer).toBe(true);
    chooseExplainer(false);
    expect(getSettings().explainer).toBe(false);
    expect(storedExplainer()).toBe(false);
    chooseExplainer(true);
    expect(getSettings().explainer).toBe(true);
    expect(storedExplainer()).toBe(true);
  });

  it('ignore stored values they did not write', () => {
    storage.setItem('life-of-a-photon.language', 'de');
    storage.setItem('life-of-a-photon.single-keys', 'true');
    storage.setItem('life-of-a-photon.explainer', 'false');
    expect(storedLanguage()).toBeNull();
    expect(storedSingleKeys()).toBeNull();
    expect(storedExplainer()).toBeNull();
  });

  it('keep working when the browser refuses storage', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage(true) });
    expect(storedLanguage()).toBeNull();
    expect(storedSingleKeys()).toBeNull();
    expect(storedExplainer()).toBeNull();
    // the choice still applies to this visit
    expect(() => chooseLanguage('en')).not.toThrow();
    expect(() => chooseSingleKeys(false)).not.toThrow();
    expect(() => chooseExplainer(false)).not.toThrow();
    expect(getSettings()).toMatchObject({ language: 'en', singleKeys: false, explainer: false });
  });

  it('are not part of a shared link, apart from the language of the visit', () => {
    chooseSingleKeys(false);
    chooseExplainer(false);
    expect(encodeFragment(getSettings())).toBe(encodeFragment(DEFAULT_SETTINGS));
  });
});
