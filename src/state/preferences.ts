/**
 * What the reader has chosen for themselves, remembered by the browser.
 *
 * The language is a preference of the reader, not part of the experiment. A link
 * may carry a language and is then shown in it for that visit, but only a choice
 * the reader makes with the language button is remembered: following somebody
 * else's link must not change the language of every later visit.
 */

import { type Language, updateSettings } from './simulation';

const STORAGE_LANGUAGE = 'life-of-a-photon.language';

/** The language the reader chose on an earlier visit, if any. */
export function storedLanguage(): Language | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_LANGUAGE);
    return stored === 'tr' || stored === 'en' ? stored : null;
  } catch {
    // storage may be unavailable (private mode)
    return null;
  }
}

/** Switches the interface to a language and remembers it as the reader's choice. */
export function chooseLanguage(language: Language): void {
  updateSettings({ language });
  try {
    window.localStorage.setItem(STORAGE_LANGUAGE, language);
  } catch {
    // not being able to remember the language is harmless
  }
}
