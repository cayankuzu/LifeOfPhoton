'use client';

/**
 * What surrounds the dossier, which is a chunk of its own: an empty sheet while that
 * chunk is on its way, and a boundary that keeps a chunk that cannot be fetched
 * (offline, or a tab left open across a deployment) from taking the running
 * simulation down with it.
 */

import { Component, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { updateSettings } from '@/state/simulation';
import { useMessages } from './hooks';
import { Button, IconButton, Panel } from './primitives';

/**
 * Where the sheet takes the whole viewport: below the `lg` breakpoint of Tailwind, at which it
 * becomes a side sheet. Written as the exact complement of `(min-width: 1024px)`, which a
 * `(max-width: 1023px)` is not at fractional widths (a zoomed page can be 1023.5 px wide).
 */
export const SHEET_COVERS_QUERY = 'not all and (min-width: 1024px)';

/** The outer box of the sheet; the same as the dossier's own, so that nothing moves when it arrives. */
const SHEET =
  'fixed inset-y-0 right-0 z-20 flex w-full flex-col border-l border-hairline bg-panel shadow-[-24px_0_48px_rgb(0_0_0/0.45)] lg:w-[min(46rem,52vw)]';

/** Stand-in for the sheet while its code is being fetched. */
export function DossierLoading() {
  const { t } = useMessages();
  return (
    <div className={SHEET} data-dossier>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline py-2 pl-5 pr-2">
        <p className="label m-0">{t.dossier.title}</p>
        <IconButton label={t.controls.close} hint="Esc" onClick={() => updateSettings({ dossier: null })}>
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>
      <p role="status" className="m-0 px-5 py-6 text-[13px] text-ink-2">
        {t.dossier.loading}
      </p>
    </div>
  );
}

/** Says that the dossier could not be fetched; the simulation goes on beside it. */
function DossierFailure({ onDismiss }: { readonly onDismiss: () => void }) {
  const { t } = useMessages();
  return (
    <Panel role="alert" className="fixed right-3 top-3 z-40 w-[min(22rem,calc(100vw-1.5rem))] p-3">
      <p className="m-0 text-[13px] text-ink">{t.dossier.failed}</p>
      <p className="m-0 mt-1.5 text-[12px] leading-relaxed text-ink-3">{t.dossier.failedDetail}</p>
      <div className="mt-3 flex gap-2">
        {/* the state of the experiment survives the reload: it is in the address */}
        <Button className="border border-hairline-strong text-ink" onClick={() => window.location.reload()}>
          {t.loading.retry}
        </Button>
        <Button onClick={onDismiss}>{t.controls.close}</Button>
      </div>
    </Panel>
  );
}

interface BoundaryProps {
  /** Whether the dossier is asked for. */
  readonly open: boolean;
  readonly children: ReactNode;
}

interface BoundaryState {
  readonly failed: boolean;
  /** `open` as last seen, to tell a new request from the one that failed. */
  readonly open: boolean;
}

/**
 * Error boundary around the dossier. A failure closes the sheet and leaves a notice.
 * Asking for the dossier again renders it again, but does not fetch it again: React.lazy
 * keeps a rejected import, so the notice returns at once and only a reload helps.
 */
export class DossierBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false, open: this.props.open };

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState): Partial<BoundaryState> | null {
    if (props.open === state.open) return null;
    return props.open ? { open: true, failed: false } : { open: false };
  }

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error(error);
    // an open sheet that cannot be shown would leave the stage inert behind nothing
    updateSettings({ dossier: null });
  }

  render(): ReactNode {
    if (this.state.failed) return <DossierFailure onDismiss={() => this.setState({ failed: false })} />;
    return this.props.open ? this.props.children : null;
  }
}
