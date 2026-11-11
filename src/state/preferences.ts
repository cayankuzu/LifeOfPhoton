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
 * The same again for the panel "Why does it look like this?": open by default, and once closed
 * it stays closed at later visits. None of these preferences is part of a shared link.
 *
 * The coach line ("roll the wheel to accelerate") is shown until the first deliberate input
 * and then never again.
 */

import { type Language, updateSettings } from './simulation';

const STORAGE_LANGUAGE = 'life-of-a-photon.language';
const STORAGE_SINGLE_KEYS = 'life-of-a-photon.single-keys';
const STORAGE_EXPLAINER = 'life-of-a-photon.explainer';
const STORAGE_COACHED = 'life-of-a-photon.coached';

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

/** Whether the reader opened or closed the panel "Why does it look like this?" on an earlier visit, if they did. */
export function storedExplainer(): boolean | null {
  const stored = read(STORAGE_EXPLAINER);
  return stored === 'on' ? true : stored === 'off' ? false : null;
}

/** Opens or closes the panel "Why does it look like this?" and remembers the choice. */
export function chooseExplainer(on: boolean): void {
  updateSettings({ explainer: on });
  write(STORAGE_EXPLAINER, on ? 'on' : 'off');
}

/** Dismissed in this visit: the coach line stays away even where the browser cannot store that. */
let coachedThisVisit = false;
const coachedListeners = new Set<() => void>();

/** Whether the coach line has been dismissed, in this visit or an earlier one (read with useSyncExternalStore). */
export function isCoached(): boolean {
  return coachedThisVisit || read(STORAGE_COACHED) === '1';
}

/** Calls `listener` when the coach line is dismissed; returns the function that stops it. */
export function subscribeCoached(listener: () => void): () => void {
  coachedListeners.add(listener);
  return () => {
    coachedListeners.delete(listener);
  };
}

/** Dismisses the coach line for good. */
export function dismissCoach(): void {
  if (coachedThisVisit) return;
  coachedThisVisit = true;
  write(STORAGE_COACHED, '1');
  coachedListeners.forEach((listener) => listener());
}
