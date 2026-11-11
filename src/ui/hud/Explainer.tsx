'use client';

/**
 * The panel "Why does it look like this?": two to four short items, in plain words, on why the
 * picture looks the way it does at this moment (src/ui/explain.ts chooses them).
 *
 * The choice is evaluated at most five times a second from the velocity the simulation is actually
 * at, and the panel changes only once the list has stayed the same for half a second: while the
 * speed eases it keeps the last settled list, so it never flickers. A screen reader hears the titles
 * of a new list once, and only when the set of items changes, not when a number in a text does.
 *
 * Two placements, of which one renders at a time: beside the instrument dock on the medium and wide
 * tiers ("row"), and on a phone, where there is no room beside the dock, as one line under the top
 * bar that opens into an accordion ("top"). Either way it is in the flow of the HUD: it never covers
 * the top bar, the dock, the speed rail or the middle of the view.
 */

import { useRef, useState } from 'react';
import { BookOpen, ChevronDown, Lightbulb, X } from 'lucide-react';
import type { Messages } from '@/i18n/messages';
import { chooseExplainer } from '@/state/preferences';
import { type Language, getSettings, telemetry, updateSettings, useSettings } from '@/state/simulation';
import {
  EMPTY_MEMORY,
  type ExplainItem,
  type ExplainSection,
  type ExplainText,
  explain,
  explainTextId,
  MAX_ITEMS,
  MAX_ITEMS_TALL,
  renderExplainItem,
} from '../explain';
import { setText, useFrame, useMessages } from '../hooks';
import { IconButton, Panel } from '../primitives';
import { useHudTier } from './tier';

/** Id of the panel (the target of the top bar's switch) and of that switch (where the focus goes on closing). */
export const EXPLAINER_ID = 'explainer';
export const EXPLAINER_TOGGLE_ID = 'explainer-toggle';

/** At most five evaluations a second. */
export const EVALUATE_EVERY_MS = 200;
/** How long a list has to stay the same before the panel shows it: the delay the dock waits before announcing. */
export const SETTLE_MS = 500;
/** Height of the HUD from which the wide tier shows a fourth item, CSS pixels. */
const TALL_FROM_PX = 760;

/** Where the panel stands between evaluations. */
export interface Settling {
  /** The list last evaluated, as it would read, and since when it has stayed the same, ms. */
  candidate: string;
  since: number;
  /** The list shown, and the keys of its items (null before the first list, which is not announced). */
  committed: string;
  keys: string | null;
}

export function newSettling(): Settling {
  return { candidate: '', since: 0, committed: '', keys: null };
}

/**
 * What to do with a list evaluated at `now`: `signature` is the list as it would read (keys, variants
 * and the formatted values), `keys` the set of its items. A list is shown once it has stayed the same
 * for SETTLE_MS; it is announced as well when the set of items differs from the one shown before.
 */
export function settle(state: Settling, now: number, signature: string, keys: string): 'wait' | 'show' | 'announce' {
  if (signature !== state.candidate) {
    state.candidate = signature;
    state.since = now;
    return 'wait';
  }
  if (now - state.since < SETTLE_MS || signature === state.committed) return 'wait';
  const announce = state.keys !== null && keys !== state.keys;
  state.committed = signature;
  state.keys = keys;
  return announce ? 'announce' : 'show';
}

/** A list as the panel would show it: its texts, how it reads (`signature`) and the set of its items (`keys`). */
export function describeList(
  items: readonly ExplainItem[],
  language: Language,
  guides: boolean
): { texts: ExplainText[]; signature: string; keys: string } {
  const texts = items.map((item) => renderExplainItem(item, language, guides));
  return {
    texts,
    signature: JSON.stringify(items.map((item, index) => [explainTextId(item), texts[index]])),
    keys: items
      .map((item) => item.key)
      .sort()
      .join(),
  };
}

/**
 * Opens the dossier at a section. The dossier scrolls there whenever the setting changes; when it is
 * already open at that section the setting does not change, so the section is brought back into view here.
 */
export function openDossierAt(section: ExplainSection): void {
  if (getSettings().dossier === section) document.getElementById(`dossier-${section}`)?.scrollIntoView({ block: 'start' });
  else updateSettings({ dossier: section });
}

/** The body of an item, its optional extra sentence and the way on to the dossier. */
function ItemBody({ text, section, t }: { readonly text: ExplainText; readonly section: ExplainSection; readonly t: Messages }) {
  return (
    <>
      <p className="tabular m-0 mt-1 text-[12px] leading-[1.45] text-ink-2">
        {text.body}
        {text.extra && ` ${text.extra}`}
      </p>
      <button
        type="button"
        onClick={() => openDossierAt(section)}
        aria-label={t.explain.readMoreAbout(text.title)}
        className="-ml-1 mt-1 inline-flex min-h-6 items-center gap-1 rounded px-1 text-[11.5px] text-ink-3 transition-colors duration-150 hover:text-ink hover:underline [@media(pointer:coarse)]:min-h-9"
      >
        <BookOpen className="h-3 w-3 text-amber" aria-hidden="true" />
        {t.explain.readMore}
      </button>
    </>
  );
}

export default function Explainer({ placement }: { readonly placement: 'row' | 'top' }) {
  const tier = useHudTier();
  const open = useSettings((state) => state.explainer);
  const mine = placement === 'top' ? tier === 'narrow' : tier !== 'narrow';
  if (!open || !mine) return null;
  return <ExplainerPanel compact={placement === 'top'} />;
}

function ExplainerPanel({ compact }: { readonly compact: boolean }) {
  const { language, t } = useMessages();
  const tier = useHudTier();
  const guides = useSettings((state) => state.guides);
  // the settled list; an item that joins it fades in (class explainer-in on a newly mounted item), while the
  // items that stay are not mounted again, so that the focus on one of their buttons is kept
  const [shown, setShown] = useState<readonly ExplainItem[]>([]);
  // the accordion of the phone form: closed to one line at first, then one item open at a time
  const [expanded, setExpanded] = useState(false);
  const [openIndex, setOpenIndex] = useState(0);
  const announced = useRef<HTMLParagraphElement>(null);
  const evaluation = useRef({ at: Number.NEGATIVE_INFINITY, memory: EMPTY_MEMORY, settling: newSettling() });

  useFrame(() => {
    const now = performance.now();
    const state = evaluation.current;
    if (now - state.at < EVALUATE_EVERY_MS) return;
    state.at = now;
    const settings = getSettings();
    const result = explain(
      {
        beta: telemetry.beta,
        view: settings.view,
        thermal: settings.thermal,
        lens: settings.lens,
        paused: settings.paused,
        yaw: telemetry.yaw,
        pitch: telemetry.pitch,
        fieldOfView: telemetry.fieldOfView,
        aspect: telemetry.aspect,
        lnExposure: telemetry.lnExposure,
      },
      state.memory
    );
    // the hysteresis follows every evaluation, whether or not its result is shown
    state.memory = result.memory;
    const count = tier === 'wide' && window.innerHeight >= TALL_FROM_PX ? MAX_ITEMS_TALL : MAX_ITEMS;
    const items = result.items.slice(0, count);
    const { texts, signature, keys } = describeList(items, language, settings.guides);
    const action = settle(state.settling, now, signature, keys);
    if (action === 'wait') return;
    if (action === 'announce') setText(announced.current, t.explain.announce(texts.map((text) => text.title)));
    setShown(items);
  });

  const close = (): void => {
    chooseExplainer(false);
    document.getElementById(EXPLAINER_TOGGLE_ID)?.focus();
  };
  const texts = shown.map((item) => renderExplainItem(item, language, guides));
  const current = Math.min(openIndex, Math.max(0, shown.length - 1));
  const closeButton = (
    <IconButton label={t.controls.close} onClick={close}>
      <X className="h-3.5 w-3.5" aria-hidden="true" />
    </IconButton>
  );
  const liveRegion = <p ref={announced} className="sr-only" aria-live="polite" />;

  if (compact) {
    return (
      <Panel
        id={EXPLAINER_ID}
        role="region"
        aria-labelledby="explainer-title"
        lang={language}
        className="flex max-h-[32dvh] min-h-0 w-full shrink-0 flex-col"
      >
        <h2 id="explainer-title" className="sr-only">
          {t.explain.title}
        </h2>
        <div className="flex h-10 shrink-0 items-center gap-1 pl-1 pr-1">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="explainer-list"
            onClick={() => setExpanded((value) => !value)}
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded px-2 text-left"
          >
            <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">
              {/* closed: the first item; open: the name of the panel, which the list below does not repeat */}
              {(!expanded && texts[0]?.title) || t.explain.title}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {closeButton}
        </div>
        {expanded && (
          <ol id="explainer-list" className="scroll-thin m-0 min-h-0 list-none overflow-y-auto p-0">
            {shown.map((item, index) => (
              <li key={explainTextId(item)} className="explainer-in border-t border-hairline px-3 py-1.5">
                <h3 className="m-0">
                  <button
                    type="button"
                    aria-expanded={index === current}
                    onClick={() => setOpenIndex(index)}
                    className="flex min-h-9 w-full items-center text-left text-[12.5px] font-semibold leading-snug text-ink"
                  >
                    {texts[index].title}
                  </button>
                </h3>
                {index === current && <ItemBody text={texts[index]} section={item.section} t={t} />}
              </li>
            ))}
          </ol>
        )}
        {liveRegion}
      </Panel>
    );
  }

  // Beside the dock, below the row of the Look-ahead chip. On the medium tier the panel is only a few
  // centimetres right of the middle of the view, where at high speed everything is: there it stays in
  // the lower half of the row and scrolls rather than rise beside the middle.
  const height = tier === 'medium' ? 'max-h-[calc(50%-4rem)]' : 'max-h-[calc(100%-3rem)]';
  return (
    <Panel
      id={EXPLAINER_ID}
      role="region"
      aria-labelledby="explainer-title"
      lang={language}
      className={`flex ${height} min-h-0 w-[19rem] max-w-full flex-col self-end`}
    >
      <div className="flex items-center justify-between gap-2 py-1 pl-3 pr-1">
        <h2 id="explainer-title" className="label m-0">
          {t.explain.title}
        </h2>
        {closeButton}
      </div>
      <ol className="scroll-thin m-0 min-h-0 list-none overflow-y-auto p-0">
        {shown.map((item, index) => (
          <li key={explainTextId(item)} className="explainer-in border-t border-hairline px-3 py-2">
            <h3 className="m-0 text-[12.5px] font-semibold leading-snug text-ink">{texts[index].title}</h3>
            <ItemBody text={texts[index]} section={item.section} t={t} />
          </li>
        ))}
      </ol>
      {liveRegion}
    </Panel>
  );
}
