'use client';

import { useEffect, useState } from 'react';
import { useLoadPhase } from '@/state/simulation';
import { useMessages } from '../hooks';
import { Button } from '../primitives';

/**
 * Start-up screen: says what is happening and how far along it is, and turns into
 * a plain explanation when the scene cannot be shown at all.
 */
export default function Loading() {
  const { t } = useMessages();
  const { phase, progress, error } = useLoadPhase();
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
      className={`fixed inset-0 z-30 flex items-center justify-center bg-obsidian transition-opacity duration-500 ease-out ${
        phase === 'ready' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      role={failed ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className="w-[min(22rem,calc(100vw-3rem))]">
        <p className="font-mono text-[12px] font-semibold tracking-[0.2em] text-ink">LIFE OF A PHOTON</p>
        <p className="mt-6 text-[13px] text-ink-2">{status}</p>
        {failed ? (
          <>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-3">{unsupported ? t.loading.unsupportedDetail : error}</p>
            {!unsupported && (
              <Button className="mt-5 border border-hairline-strong text-ink" onClick={() => window.location.reload()}>
                {t.loading.retry}
              </Button>
            )}
          </>
        ) : (
          <div
            className="mt-3 h-px w-full bg-hairline-strong"
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
