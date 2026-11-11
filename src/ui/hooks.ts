'use client';

import { useEffect, useRef } from 'react';
import { MESSAGES, type Messages } from '@/i18n/messages';
import { type Language, onFrame, useSettings } from '@/state/simulation';

/** Active language and its dictionary. */
export function useMessages(): { language: Language; t: Messages } {
  const language = useSettings((state) => state.language);
  return { language, t: MESSAGES[language] };
}

/**
 * Runs `callback` once per rendered frame of the simulation, without causing a
 * React render. Instruments use it to write changing numbers straight into the DOM.
 * The latest callback is always the one that runs.
 */
export function useFrame(callback: () => void): void {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    latest.current();
    return onFrame(() => latest.current());
  }, []);
}

/** Writes text into an element only when it changed, to keep per-frame DOM work minimal. */
export function setText(element: Element | null, text: string): void {
  if (element && element.textContent !== text) element.textContent = text;
}
