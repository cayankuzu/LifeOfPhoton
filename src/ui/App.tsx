'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { BETA_MAX, boostBy } from '@/physics/kinematics';
import { decodeFragment, encodeFragment } from '@/state/fragment';
import {
  LENSES,
  type Language,
  type Settings,
  getSettings,
  look,
  lookAhead,
  resetClocks,
  subscribeSettings,
  telemetry,
  turnBy,
  updateSettings,
  useSettings,
} from '@/state/simulation';
import { useMessages } from './hooks';
import Guides from './hud/Guides';
import InstrumentDock from './hud/InstrumentDock';
import Loading from './hud/Loading';
import LookAhead from './hud/LookAhead';
import SpeedRail, { KEY_RAPIDITY_STEP } from './hud/SpeedRail';
import TopBar from './hud/TopBar';
import { HudTierProvider } from './hud/tier';

const UrbanScene = dynamic(() => import('@/scene/UrbanScene'), { ssr: false });
const Dossier = dynamic(() => import('@/dossier/Dossier'), { ssr: false });

/** Velocities on the digit keys 0–5. */
const PRESETS = [0, 0.5, Math.sqrt(3) / 2, 0.99, 0.9999, BETA_MAX] as const;

const LOOK_STEP = (15 * Math.PI) / 180;
const STORAGE_LANGUAGE = 'life-of-a-photon.language';
const STORAGE_COACHED = 'life-of-a-photon.coached';

/** Replaces the fragment of the address bar without adding a history entry. */
function writeFragment(settings: Settings): void {
  const fragment = encodeFragment(settings);
  const url = `${window.location.pathname}${window.location.search}${fragment ? `#${fragment}` : ''}`;
  window.history.replaceState(null, '', url);
}

function initialLanguage(fromUrl: Language | undefined): Language {
  if (fromUrl) return fromUrl;
  try {
    const stored = window.localStorage.getItem(STORAGE_LANGUAGE);
    if (stored === 'tr' || stored === 'en') return stored;
  } catch {
    // storage may be unavailable (private mode); fall through to the browser language
  }
  return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export default function App() {
  const { language, t } = useMessages();
  const dossierOpen = useSettings((state) => state.dossier !== null);
  const [coached, setCoached] = useState(true);
  const hud = useRef<HTMLDivElement>(null);

  // --- initial state: URL fragment, stored language, motion preference
  useEffect(() => {
    // the state of the experiment lives in the URL fragment, so any view can be shared
    const fromUrl = decodeFragment(window.location.hash);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    updateSettings({
      ...fromUrl,
      language: initialLanguage(fromUrl.language),
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
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as Record<string, unknown>).__photon = { getSettings, updateSettings, telemetry, look };
    }
  }, []);

  // --- keep the URL, the document language and the stored language in step with the settings
  useEffect(() => {
    let timer = 0;
    const sync = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => writeFragment(getSettings()), 300);
    };
    const unsubscribe = subscribeSettings(sync);
    // a link pasted into an open tab changes only the fragment: follow it
    const follow = (): void => updateSettings(decodeFragment(window.location.hash));
    window.addEventListener('hashchange', follow);
    return () => {
      unsubscribe();
      window.removeEventListener('hashchange', follow);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem(STORAGE_LANGUAGE, language);
    } catch {
      // not being able to remember the language is harmless
    }
  }, [language]);

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
      if (isTyping(event.target)) return;
      const settings = getSettings();
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key === 'Escape') {
        if (settings.dossier !== null) updateSettings({ dossier: null });
        return;
      }
      // inside the dossier the keys belong to reading, not to flying
      if (event.target instanceof HTMLElement && event.target.closest('[data-dossier]')) return;

      switch (key) {
        case 'ArrowUp':
        case 'w':
          updateSettings({ beta: boostBy(settings.beta, KEY_RAPIDITY_STEP) });
          break;
        case 'ArrowDown':
        case 's':
          updateSettings({ beta: boostBy(settings.beta, -KEY_RAPIDITY_STEP) });
          break;
        case 'ArrowLeft':
        case 'a':
          turnBy(LOOK_STEP, 0);
          break;
        case 'ArrowRight':
          turnBy(-LOOK_STEP, 0);
          break;
        case ' ':
          // let Space activate a focused button instead
          if (event.target instanceof HTMLElement && event.target.closest('button, a, [role="radio"]')) return;
          updateSettings({ paused: !settings.paused });
          break;
        case 'm':
          updateSettings({ view: settings.view === 'seen' ? 'measured' : 'seen' });
          break;
        case 't':
          updateSettings({ thermal: !settings.thermal });
          break;
        case 'g':
          updateSettings({ guides: !settings.guides });
          break;
        case 'l':
          updateSettings({ lens: LENSES[(LENSES.indexOf(settings.lens) + 1) % LENSES.length] });
          break;
        case 'f':
        case 'Home':
          lookAhead();
          break;
        case 'r':
          resetClocks();
          break;
        case 'd':
          updateSettings({ dossier: settings.dossier === null ? 'abstract' : null });
          break;
        default: {
          const digit = Number(key);
          if (key.length === 1 && Number.isInteger(digit) && digit < PRESETS.length && key !== ' ') {
            updateSettings({ beta: PRESETS[digit] });
            break;
          }
          return;
        }
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className="relative h-dvh w-screen overflow-hidden">
      <a
        href="#controls"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-panel focus:px-3 focus:py-2 focus:text-[13px]"
      >
        {t.app.skipToControls}
      </a>

      {/* The stage: scene, guide layer and instruments share one box, which makes room for the dossier on wide screens. */}
      <div className={`absolute inset-y-0 left-0 ${dossierOpen ? 'right-0 lg:right-[min(46rem,52vw)]' : 'right-0'}`}>
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
                {t.help.coach}
              </p>
            )}
            <SpeedRail />
          </div>
        </HudTierProvider>
      </div>

      {dossierOpen && <Dossier />}
      <Loading />
    </main>
  );
}
