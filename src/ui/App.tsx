'use client';

import dynamic from 'next/dynamic';
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { decodeFragment, encodeFragment, isExperimentFragment } from '@/state/fragment';
import { storedLanguage, storedSingleKeys } from '@/state/preferences';
import {
  type Language,
  type Settings,
  getSettings,
  look,
  subscribeSettings,
  telemetry,
  updateSettings,
  useSceneReady,
  useSettings,
} from '@/state/simulation';
import { DossierBoundary, DossierLoading, SHEET_COVERS_QUERY } from './DossierFrame';
import { useMessages } from './hooks';
import Guides from './hud/Guides';
import InstrumentDock from './hud/InstrumentDock';
import Loading from './hud/Loading';
import LookAhead from './hud/LookAhead';
import SpeedRail from './hud/SpeedRail';
import TopBar from './hud/TopBar';
import { HudTierProvider } from './hud/tier';
import { runShortcut } from './shortcuts';

const UrbanScene = dynamic(() => import('@/scene/UrbanScene'), { ssr: false });
const Dossier = dynamic(() => import('@/dossier/Dossier'), { ssr: false, loading: () => <DossierLoading /> });

/** A layout effect in the browser; on the server, where there is no layout, a plain effect (which React does not warn about). */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * The `inert` attribute of an element a layer covers. React 18 has no `inert` property, but it
 * passes a string attribute through, on the server as well: the stage is out of reach in the
 * markup that arrives first, before the script that would otherwise set the attribute has loaded
 * (on a slow connection the start-up screen stands for seconds over controls that Tab still
 * reached). React writes and removes it while committing, so it is gone before any effect runs
 * that hands the focus back.
 */
function inertWhile(covered: boolean): Record<string, string> {
  return covered ? { inert: '' } : {};
}

/**
 * Keeps track of the focus around a layer: the element (made inert with `inertWhile`) is out of
 * the tab order and away from assistive technology while covered. When it is uncovered, the focus
 * goes back to the control that was in use if it was lost on the way (a layer that arrives after
 * the element became inert cannot see where the focus came from).
 */
function useCover(ref: RefObject<HTMLElement>, covered: boolean): void {
  const opener = useRef<HTMLElement | null>(null);

  // A layout effect runs in the same task as the commit that made the element inert, before the
  // browser moves the focus out of it, so the control that had it can still be seen here.
  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (covered && element?.contains(document.activeElement)) opener.current = document.activeElement as HTMLElement;
  }, [ref, covered]);

  useEffect(() => {
    if (covered) return;
    const back = opener.current;
    opener.current = null;
    if (back?.isConnected && (!document.activeElement || document.activeElement === document.body)) back.focus();
  }, [covered]);
}

const STORAGE_COACHED = 'life-of-a-photon.coached';

/** Replaces the fragment of the address bar without adding a history entry. */
function writeFragment(settings: Settings): void {
  const fragment = encodeFragment(settings);
  const url = `${window.location.pathname}${window.location.search}${fragment ? `#${fragment}` : ''}`;
  window.history.replaceState(null, '', url);
}

/** The language of this visit: the link's, else the reader's earlier choice, else the browser's. */
function initialLanguage(fromUrl: Language | undefined): Language {
  return fromUrl ?? storedLanguage() ?? (navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en');
}

/** Keys a focused slider uses itself. */
const SLIDER_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']);

/** Whether the key belongs to the element that has the focus rather than to the simulation. */
function belongsToFocus(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  // a slider keeps its own keys only: after dragging the speed, M or Space must still work
  if (target instanceof HTMLInputElement && target.type === 'range') return SLIDER_KEYS.has(event.key);
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export default function App() {
  const { language, t } = useMessages();
  const dossierOpen = useSettings((state) => state.dossier !== null);
  const ready = useSceneReady();
  const [coached, setCoached] = useState(true);
  // read after mounting, so that the server's markup and the first render in the browser agree
  const [touch, setTouch] = useState(false);
  const [sheetCovers, setSheetCovers] = useState(false);
  const hud = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const startup = useRef<HTMLDivElement>(null);

  // What a full-screen layer covers must be out of reach as well as out of sight: the start-up
  // screen covers the stage until the scene is ready, and the dossier, where it takes the whole
  // viewport, covers the stage and the failure screen it can be opened from.
  const sheetCoversAll = dossierOpen && sheetCovers;
  const covered = !ready || sheetCoversAll;
  useCover(stage, covered);
  useCover(startup, sheetCoversAll);

  // --- initial state: URL fragment, stored language, motion preference
  useEffect(() => {
    // the state of the experiment lives in the URL fragment, so any view can be shared
    const fromUrl = decodeFragment(window.location.hash);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    updateSettings({
      ...fromUrl,
      language: initialLanguage(fromUrl.language),
      ...(storedSingleKeys() === false ? { singleKeys: false } : {}),
      // people who ask for less motion start with the avenue standing still
      ...(reduceMotion ? { paused: true } : {}),
      // on small screens the instruments start collapsed so that the view stays open
      ...(window.innerWidth < 900 || window.innerHeight < 700 ? { dock: false } : {}),
    });
    try {
      setCoached(window.localStorage.getItem(STORAGE_COACHED) === '1');
    } catch {
      setCoached(false);
    }
    // a touch screen has no wheel to roll
    setTouch(window.matchMedia('(pointer: coarse)').matches);
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as Record<string, unknown>).__photon = { getSettings, updateSettings, telemetry, look };
    }
  }, []);

  // --- keep the URL and the document language in step with the settings
  useEffect(() => {
    let timer = 0;
    const sync = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => writeFragment(getSettings()), 300);
    };
    const unsubscribe = subscribeSettings(sync);
    // a link pasted into an open tab changes only the fragment: follow it
    const follow = (): void => {
      if (isExperimentFragment(window.location.hash)) updateSettings(decodeFragment(window.location.hash));
    };
    window.addEventListener('hashchange', follow);
    return () => {
      unsubscribe();
      window.removeEventListener('hashchange', follow);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    // the tab, the history entry and the first thing a screen reader says follow the language too
    document.title = t.app.title;
  }, [language, t]);

  // --- the stage is inert while a layer covers it
  useEffect(() => {
    const query = window.matchMedia(SHEET_COVERS_QUERY);
    const sync = (): void => setSheetCovers(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // --- the first deliberate input dismisses the coach line for good
  useEffect(() => {
    if (coached) return;
    const dismiss = (): void => {
      setCoached(true);
      try {
        window.localStorage.setItem(STORAGE_COACHED, '1');
      } catch {
        // ignore
      }
    };
    window.addEventListener('wheel', dismiss, { once: true, passive: true });
    window.addEventListener('pointerdown', dismiss, { once: true });
    window.addEventListener('keydown', dismiss, { once: true });
    return () => {
      window.removeEventListener('wheel', dismiss);
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
  }, [coached]);

  // --- keyboard
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (belongsToFocus(event)) return;
      const target = event.target instanceof Element ? event.target : null;
      const handled = runShortcut(event, getSettings(), {
        // the stage is inert exactly while a layer covers it (start-up, failure, a full-screen dossier):
        // keys pressed with the focus nowhere in particular must not work the scene behind it either
        covered: telemetry.phase !== 'ready' || stage.current?.hasAttribute('inert') === true,
        inDossier: target?.closest('[data-dossier]') != null,
        onControl: target?.closest('button, a, [role="radio"]') != null,
      });
      if (handled) event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className="relative h-dvh w-screen overflow-hidden">
      {!covered && (
        <a
          href="#controls"
          onClick={(event) => {
            // move the focus without touching the address bar, which holds the state of the experiment;
            // in the view switch only the selected option is a tab stop
            event.preventDefault();
            document.querySelector<HTMLElement>('#controls [role="radio"][aria-checked="true"]')?.focus();
          }}
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-panel focus:px-3 focus:py-2 focus:text-[13px]"
        >
          {t.app.skipToControls}
        </a>
      )}
      <h1 className="sr-only">{t.app.name}</h1>

      {/* The stage: scene, guide layer and instruments share one box, which makes room for the dossier on wide screens. */}
      <div
        ref={stage}
        {...inertWhile(covered)}
        className={`absolute inset-y-0 left-0 ${dossierOpen ? 'right-0 lg:right-[min(46rem,52vw)]' : 'right-0'}`}
      >
        <UrbanScene />
        <Guides />

        <HudTierProvider target={hud} revision={dossierOpen}>
          <div ref={hud} className="pointer-events-none absolute inset-0 z-10 flex flex-col gap-3 p-3 sm:p-4">
            <TopBar />

            <div className="relative flex min-h-0 flex-1 items-end justify-between gap-3">
              <InstrumentDock />
              <LookAhead />
            </div>

            {!coached && (
              <p className="pointer-events-none mx-auto -mb-1 max-w-full rounded-full border border-hairline bg-panel px-3 py-1.5 text-center text-[12px] text-ink-2">
                {touch ? t.help.coachTouch : t.help.coach}
              </p>
            )}
            <SpeedRail />
          </div>
        </HudTierProvider>
      </div>

      <DossierBoundary open={dossierOpen}>
        <Dossier modal={sheetCovers} />
      </DossierBoundary>
      {/* the box only carries `inert` while a full-screen dossier opened from the failure screen covers it */}
      <div ref={startup} {...inertWhile(sheetCoversAll)}>
        <Loading />
      </div>
    </main>
  );
}
