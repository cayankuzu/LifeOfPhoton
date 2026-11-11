'use client';

/**
 * How much room the instruments have.
 *
 * The space available to the HUD is not the width of the window: on a wide screen
 * the dossier takes half of it. Components therefore do not use viewport
 * breakpoints but the measured width of the HUD itself, reduced to three tiers.
 */

import { type ReactNode, type RefObject, createContext, useContext, useEffect, useState } from 'react';

export type HudTier = 'narrow' | 'medium' | 'wide';

/** Lower bounds of the tiers, CSS pixels. */
const MEDIUM_FROM = 760;
const WIDE_FROM = 1040;

export function tierOfWidth(width: number): HudTier {
  if (width >= WIDE_FROM) return 'wide';
  if (width >= MEDIUM_FROM) return 'medium';
  return 'narrow';
}

const TierContext = createContext<HudTier>('wide');

/** The tier of the surrounding HUD. */
export function useHudTier(): HudTier {
  return useContext(TierContext);
}

/**
 * Calls `onChange` with the width of `target` now, whenever it is resized, and
 * whenever `revision` changes. A ResizeObserver alone is not enough: its
 * notifications are tied to rendering and are withheld while the page is in the
 * background, so window resizes and known layout changes are handled explicitly.
 */
export function useElementWidth(
  target: RefObject<HTMLElement | null>,
  onChange: (width: number) => void,
  revision?: unknown
): void {
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const measure = (): void => onChange(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
    // onChange is a state setter or a stable callback at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, revision]);
}

/** Measures `target` and provides its tier to everything inside. `revision` marks layout changes made by the app itself. */
export function HudTierProvider({
  target,
  revision,
  children,
}: {
  readonly target: RefObject<HTMLElement | null>;
  readonly revision?: unknown;
  readonly children: ReactNode;
}) {
  // 'wide' until measured: the server cannot know the width, and the first effect corrects it
  const [tier, setTier] = useState<HudTier>('wide');
  useElementWidth(target, (width) => setTier(tierOfWidth(width)), revision);
  return <TierContext.Provider value={tier}>{children}</TierContext.Provider>;
}
