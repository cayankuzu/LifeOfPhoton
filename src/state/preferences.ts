/**
 * What the reader has chosen for themselves, remembered by the browser.
 *
 * The language is a preference of the reader, not part of the experiment. A link
 * may carry a language and is then shown in it for that visit, but only a choice
 * the reader makes with the language button is remembered: following somebody
 * else's link must not change the language of every later visit.
 *
 * The same holds for the single-character shortcuts: a reader who switches them off
 * (speech input types them by the dozen) must not find them on again at the next visit.
 * Neither preference is part of a shared link.
 */

import { type Language, updateSettings } from './simulation';

const STORAGE_LANGUAGE = 'life-of-a-photon.language';
const STORAGE_SINGLE_KEYS = 'life-of-a-photon.single-keys';

/** Reads a stored value; storage may be unavailable (private mode, blocked site data). */
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Stores a value; not being able to remember a preference is harmless. */
function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/** The language the reader chose on an earlier visit, if any. */
export function storedLanguage(): Language | null {
  const stored = read(STORAGE_LANGUAGE);
  return stored === 'tr' || stored === 'en' ? stored : null;
}

/** Switches the interface to a language and remembers it as the reader's choice. */
export function chooseLanguage(language: Language): void {
  updateSettings({ language });
  write(STORAGE_LANGUAGE, language);
}

/** Whether the reader switched the single-character shortcuts on or off on an earlier visit, if they did. */
export function storedSingleKeys(): boolean | null {
  const stored = read(STORAGE_SINGLE_KEYS);
  return stored === 'on' ? true : stored === 'off' ? false : null;
}

/** Switches the single-character shortcuts on or off and remembers the choice. */
export function chooseSingleKeys(on: boolean): void {
  updateSettings({ singleKeys: on });
  write(STORAGE_SINGLE_KEYS, on ? 'on' : 'off');
}
