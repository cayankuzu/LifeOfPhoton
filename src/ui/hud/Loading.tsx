'use client';

import { useEffect, useState } from 'react';
import { updateSettings, useLoadPhase, useSettings } from '@/state/simulation';
import { useMessages } from '../hooks';
import { Button } from '../primitives';

/**
 * Start-up screen: says what is happening and how far along it is, and turns into
 * a plain explanation when the scene cannot be shown at all. The controls behind it
 * are inert until the scene is ready (App.tsx); when it cannot be shown, the dossier
 * is still offered from here, since it does not need the scene.
 */
export default function Loading() {
  const { t } = useMessages();
  const { phase, progress, error } = useLoadPhase();
  const dossierOpen = useSettings((state) => state.dossier !== null);
  const [gone, setGone] = useState(false);

  // keep the screen mounted for the length of its fade-out, then remove it
  useEffect(() => {
    if (phase !== 'ready') {
      setGone(false);
      return;
    }
    const timer = window.setTimeout(() => setGone(true), 700);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (gone) return null;

  const failed = phase === 'error';
  const unsupported = failed && error === 'webgl2';
  // downloading is the first quarter of the bar, building the rest
  const fraction = phase === 'loading' ? 0.25 * progress : phase === 'building' ? 0.25 + 0.75 * progress : 1;
  const status = failed
    ? unsupported
      ? t.loading.unsupported
      : t.loading.failed
    : phase === 'loading'
      ? t.loading.models
      : phase === 'building'
        ? t.loading.geometry
        : t.loading.ready;

  return (
    <div
      // a failure screen steps behind the dossier (z-20) opened from it
      className={`fixed inset-0 flex items-center justify-center bg-obsidian transition-opacity duration-500 ease-out ${
        failed && dossierOpen ? 'z-10' : 'z-30'
      } ${phase === 'ready' ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      role={failed ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className="w-[min(22rem,calc(100vw-3rem))]">
        <p aria-hidden="true" className="font-mono text-[12px] font-semibold tracking-[0.2em] text-ink">
          LIFE OF A PHOTON
        </p>
        <p className="mt-6 text-[13px] text-ink-2">{status}</p>
        {failed ? (
          <>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-3">{unsupported ? t.loading.unsupportedDetail : error}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {!unsupported && (
                <Button className="border border-hairline-strong text-ink" onClick={() => window.location.reload()}>
                  {t.loading.retry}
                </Button>
              )}
              <Button
                className="border border-hairline-strong text-ink"
                aria-expanded={dossierOpen}
                onClick={() => updateSettings({ dossier: dossierOpen ? null : 'abstract' })}
              >
                {t.controls.dossier}
              </Button>
            </div>
          </>
        ) : (
          <div
            className="mt-3 h-px w-full bg-rule"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fraction * 100)}
            aria-label={status}
          >
            <div
              className="h-px bg-amber transition-[width] duration-300 ease-out"
              style={{ width: `${Math.round(fraction * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
