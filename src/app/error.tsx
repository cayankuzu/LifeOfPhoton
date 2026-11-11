'use client';

/**
 * The last line of defence: an error that no boundary inside the application caught.
 * The scene and the dossier have boundaries of their own; this one replaces Next.js's
 * bare error page with the start-up screen's plain explanation and a way back.
 */

import { useEffect } from 'react';
import { useMessages } from '@/ui/hooks';
import { Button } from '@/ui/primitives';

export default function AppError({ error, reset }: { readonly error: Error & { digest?: string }; readonly reset: () => void }) {
  const { t } = useMessages();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex h-dvh w-screen items-center justify-center bg-obsidian">
      <div role="alert" className="w-[min(22rem,calc(100vw-3rem))]">
        <h1 className="sr-only">{t.app.name}</h1>
        <p aria-hidden="true" className="font-mono text-[12px] font-semibold tracking-[0.2em] text-ink">
          LIFE OF A PHOTON
        </p>
        <p className="mt-6 text-[13px] text-ink-2">{t.app.crashed}</p>
        {/* the settings live outside React, so trying again keeps the experiment as it was */}
        <Button className="mt-5 border border-hairline-strong text-ink" onClick={reset}>
          {t.loading.retry}
        </Button>
      </div>
    </main>
  );
}
