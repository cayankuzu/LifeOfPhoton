import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeFragment } from '../fragment';
import { chooseLanguage, chooseSingleKeys, storedLanguage, storedSingleKeys } from '../preferences';
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

  it('ignore stored values they did not write', () => {
    storage.setItem('life-of-a-photon.language', 'de');
    storage.setItem('life-of-a-photon.single-keys', 'true');
    expect(storedLanguage()).toBeNull();
    expect(storedSingleKeys()).toBeNull();
  });

  it('keep working when the browser refuses storage', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage(true) });
    expect(storedLanguage()).toBeNull();
    expect(storedSingleKeys()).toBeNull();
    // the choice still applies to this visit
    expect(() => chooseLanguage('en')).not.toThrow();
    expect(() => chooseSingleKeys(false)).not.toThrow();
    expect(getSettings()).toMatchObject({ language: 'en', singleKeys: false });
  });

  it('are not part of a shared link, apart from the language of the visit', () => {
    chooseSingleKeys(false);
    expect(encodeFragment(getSettings())).toBe(encodeFragment(DEFAULT_SETTINGS));
  });
});
