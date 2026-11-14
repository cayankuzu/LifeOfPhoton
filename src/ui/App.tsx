'use client';

import dynamic from 'next/dynamic';
import { type RefObject, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { decodeFragment, encodeFragment, isExperimentFragment } from '@/state/fragment';
import {
  dismissCoach,
  isCoached,
  storedExplainer,
  storedLanguage,
  storedSingleKeys,
  subscribeCoached,
} from '@/state/preferences';
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
import { useMediaQuery, useMessages } from './hooks';
import { EntryDescriptions, EntryTooltip } from './hud/EntryHelp';
import Guides from './hud/Guides';
import Explainer from './hud/Explainer';
import InstrumentDock from './hud/InstrumentDock';
import Loading from './hud/Loading';
import LookAhead from './hud/LookAhead';
import Pointer from './hud/Pointer';
import SpeedRail from './hud/SpeedRail';
import TopBar from './hud/TopBar';
import { HudTierProvider } from './hud/tier';
import { entryProps } from './inventory';
import { runShortcut } from './shortcuts';

const UrbanScene = dynamic(() => import('@/scene/UrbanScene'), { ssr: false });
const Dossier = dynamic(() => import('@/dossier/Dossier'), { ssr: false, loading: () => <DossierLoading /> });

/**
 * Keeps track of the focus around a layer: the element (given `inert` while covered; see the stage
 * below) is out of the tab order and away from assistive technology. When it is uncovered, the focus
 * goes back to the control that was in use if it was lost on the way (a layer that arrives after
 * the element became inert cannot see where the focus came from).
 */
function useCover(ref: RefObject<HTMLElement | null>, covered: boolean): void {
  const opener = useRef<HTMLElement | null>(null);

  // A layout effect runs in the same task as the commit that made the element inert, before the
  // browser moves the focus out of it, so the control that had it can still be seen here. (On the
  // server it does not run; React 19 no longer warns about that.)
  useLayoutEffect(() => {
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
  // Read from the browser once the page has hydrated; the server's markup and the first render in the
  // browser take the values in the third argument, so that the two agree (useSyncExternalStore).
  const coached = useSyncExternalStore(subscribeCoached, isCoached, () => true);
  // a touch screen has no wheel to roll
  const touch = useMediaQuery('(pointer: coarse)');
  // the dossier takes the whole viewport (and makes the stage inert) below this width
  const sheetCovers = useMediaQuery(SHEET_COVERS_QUERY);
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
      // the panel "Why does it look like this?" is open unless the reader closed it on an earlier visit
      ...(storedExplainer() === false ? { explainer: false } : {}),
      // people who ask for less motion start with the avenue standing still
      ...(reduceMotion ? { paused: true } : {}),
      // on small screens the instruments start collapsed so that the view stays open
      ...(window.innerWidth < 900 || window.innerHeight < 700 ? { dock: false } : {}),
    });
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
  }, [language]);

  // --- the first deliberate input dismisses the coach line for good; a press counts when it is released, since the line
  // going moves the panels above it, and on the press a click (on "Start the tour", say) would land beside its button
  useEffect(() => {
    if (coached) return;
    window.addEventListener('wheel', dismissCoach, { once: true, passive: true });
    window.addEventListener('pointerup', dismissCoach, { once: true });
    window.addEventListener('keydown', dismissCoach, { once: true });
    return () => {
      window.removeEventListener('wheel', dismissCoach);
      window.removeEventListener('pointerup', dismissCoach);
      window.removeEventListener('keydown', dismissCoach);
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
      {/* The tab, the history entry and the first thing a screen reader says follow the language. React places the
          element in <head>, on the server as well. It is the only <title> of the page (layout.tsx sets none): Next.js 16
          hydrates its metadata after this component's effects and would write its own title back over one set here. */}
      <title>{t.app.title}</title>
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
      {/* `inert` is rendered on the server too (React 19 knows the attribute and writes inert=""): the stage is out of
          reach in the markup that arrives first, before any script has loaded (on a slow connection the start-up
          screen stands for seconds over controls that Tab would otherwise reach). React sets and removes it while
          committing, so it is gone before any effect runs that hands the focus back. */}
      <div
        ref={stage}
        inert={covered}
        className={`absolute inset-y-0 left-0 ${dossierOpen ? 'right-0 lg:right-[min(46rem,52vw)]' : 'right-0'}`}
      >
        <UrbanScene />
        <Guides />
        {/* the marks in the picture of what a text of the panel talks about: over the guide layer, under the HUD */}
        <Pointer view={stage} layer="scene" />

        <HudTierProvider target={hud} revision={dossierOpen}>
          <div ref={hud} className="pointer-events-none absolute inset-0 z-10 flex flex-col gap-3 p-3 sm:p-4">
            <TopBar />
            {/* on a phone there is no room beside the dock: the panel is one line under the top bar */}
            <Explainer placement="top" />

            <div className="relative flex min-h-0 flex-1 items-end justify-between gap-3">
              <InstrumentDock />
              <Explainer placement="row" />
              <LookAhead />
            </div>

            {!coached && (
              <p
                {...entryProps('coach')}
                className="pointer-events-none mx-auto -mb-1 max-w-full rounded-full border border-hairline bg-panel px-3 py-1.5 text-center text-[12px] text-ink-2"
              >
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
      <div ref={startup} inert={sheetCoversAll}>
        <Loading />
      </div>
      {/* the outlines of the elements of the interface a text of the panel talks about: over the HUD, under the dossier */}
      <Pointer view={stage} layer="interface" />
      {/* the explanations of the elements of the interface, and the one tooltip that shows them, over every layer */}
      <EntryDescriptions />
      <EntryTooltip view={stage} />
    </main>
  );
}
