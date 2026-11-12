'use client';

/**
 * The panel "Why does it look like this?": two to four short items, in plain words, on why the
 * picture looks the way it does at this moment (src/ui/explain.ts chooses them).
 *
 * The choice is evaluated ten times a second from the velocity the simulation is actually at
 * (src/ui/panelUpdate.ts has the rule). The numbers inside the items follow every evaluation: they
 * are written into the items in place, as the instrument dock writes its rows, so that nothing is
 * mounted again and no screen reader is interrupted. The set and the order of the items change once
 * two evaluations in a row agree on them; the first list is shown at once. A screen reader hears the
 * titles of a new list once, and only when the set of items changes, not when a number in a text does.
 *
 * Two placements, of which one renders at a time: beside the instrument dock on the medium and wide
 * tiers ("row"), and on a phone, where there is no room beside the dock, as one line under the top
 * bar that opens into an accordion ("top"). Either way it is in the flow of the HUD: it never covers
 * the top bar, the dock, the speed rail or the middle of the view.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Lightbulb, X } from 'lucide-react';
import type { Messages } from '@/i18n/messages';
import { chooseExplainer } from '@/state/preferences';
import { getSettings, telemetry, updateSettings, useSettings } from '@/state/simulation';
import { EMPTY_MEMORY, type ExplainSection, type ExplainText, explain, MAX_ITEMS, MAX_ITEMS_TALL } from '../explain';
import { setText, useFrame, useMessages } from '../hooks';
import { EVALUATE_EVERY_MS, describeList, newPanelUpdate, textsOnShow, updatePanel } from '../panelUpdate';
import { IconButton, Panel } from '../primitives';
import { useHudTier } from './tier';

/** Id of the panel (the target of the top bar's switch) and of that switch (where the focus goes on closing). */
export const EXPLAINER_ID = 'explainer';
export const EXPLAINER_TOGGLE_ID = 'explainer-toggle';

/** Height of the HUD from which the wide tier shows a fourth item, CSS pixels. */
const TALL_FROM_PX = 760;

/**
 * Opens the dossier at a section. The dossier scrolls there whenever the setting changes; when it is
 * already open at that section the setting does not change, so the section is brought back into view here.
 */
export function openDossierAt(section: ExplainSection): void {
  if (getSettings().dossier === section) document.getElementById(`dossier-${section}`)?.scrollIntoView({ block: 'start' });
  else updateSettings({ dossier: section });
}

/** An item on show: the name of its text (key or key/variant) and the section of the dossier it leads to. */
interface ShownItem {
  readonly id: string;
  readonly section: ExplainSection;
}

/** Elements whose words come from the texts and are written in place (titles, bodies, names of the dossier links). */
const PAINTED = '[data-explain-title],[data-explain-body],[data-explain-more]';

/** Writes the texts of the items on show into the panel. Only what changed is touched. */
function paintTexts(root: HTMLElement | null, texts: ReadonlyMap<string, ExplainText>, t: Messages): void {
  if (!root) return;
  root.querySelectorAll<HTMLElement>(PAINTED).forEach((element) => {
    const { explainTitle, explainBody, explainMore } = element.dataset;
    const text = texts.get(explainTitle ?? explainBody ?? explainMore ?? '');
    if (!text) return;
    if (explainTitle !== undefined) setText(element, text.title);
    else if (explainBody !== undefined) setText(element, text.extra ? `${text.body} ${text.extra}` : text.body);
    else {
      const label = t.explain.readMoreAbout(text.title);
      if (element.getAttribute('aria-label') !== label) element.setAttribute('aria-label', label);
    }
  });
}

/** The body of an item, its optional extra sentence and the way on to the dossier; the words are written in place. */
function ItemBody({ item, t }: { readonly item: ShownItem; readonly t: Messages }) {
  return (
    <>
      <p data-explain-body={item.id} className="tabular m-0 mt-1 text-[12px] leading-[1.45] text-ink-2" />
      <button
        type="button"
        data-explain-more={item.id}
        onClick={() => openDossierAt(item.section)}
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
  // the structure on show; an item that joins it fades in (class explainer-in on a newly mounted item), while the
  // items that stay are not mounted again, so that the focus on one of their buttons is kept
  const [shown, setShown] = useState<readonly ShownItem[]>([]);
  // the accordion of the phone form: closed to one line at first, then one item open at a time
  const [expanded, setExpanded] = useState(false);
  const [openIndex, setOpenIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const announced = useRef<HTMLParagraphElement>(null);
  const live = useRef({
    at: Number.NEGATIVE_INFINITY,
    /** What the texts also depend on besides the state of the simulation: a change of it is evaluated at once. */
    context: '',
    memory: EMPTY_MEMORY,
    update: newPanelUpdate(),
    ids: [] as readonly string[],
    texts: new Map<string, ExplainText>() as ReadonlyMap<string, ExplainText>,
  });

  useFrame(() => {
    const now = performance.now();
    const state = live.current;
    const settings = getSettings();
    const count = tier === 'wide' && window.innerHeight >= TALL_FROM_PX ? MAX_ITEMS_TALL : MAX_ITEMS;
    const context = `${language} ${settings.guides} ${count}`;
    if (now - state.at < EVALUATE_EVERY_MS && context === state.context) return;
    state.at = now;
    state.context = context;
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
    const items = result.items.slice(0, count);
    const list = describeList(items, language, settings.guides);
    const step = updatePanel(state.update, now, list.structure, list.keys);
    if (step.show) {
      state.ids = list.ids;
      setShown(items.map((item, index) => ({ id: list.ids[index], section: item.section })));
    }
    state.texts = textsOnShow(state.ids, list, state.texts);
    if (step.announce) {
      const titles = state.ids.map((id) => state.texts.get(id)?.title ?? '');
      setText(announced.current, t.explain.announce(titles));
    }
    paintTexts(root.current, state.texts, t);
  });

  // the items React has just mounted have their words before the browser paints them
  useLayoutEffect(() => paintTexts(root.current, live.current.texts, t));

  const close = (): void => {
    chooseExplainer(false);
    document.getElementById(EXPLAINER_TOGGLE_ID)?.focus();
  };
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
        ref={root}
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
            {/* closed: the first item; open: the name of the panel, which the list below does not repeat */}
            {!expanded && shown[0] ? (
              <span
                key="first"
                data-explain-title={shown[0].id}
                className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink"
              />
            ) : (
              <span key="name" className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">
                {t.explain.title}
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {closeButton}
        </div>
        {expanded && (
          <ol id="explainer-list" data-explain-live className="scroll-thin m-0 min-h-0 list-none overflow-y-auto p-0">
            {shown.map((item, index) => (
              <li key={item.id} className="explainer-in border-t border-hairline px-3 py-1.5">
                <h3 className="m-0">
                  <button
                    type="button"
                    aria-expanded={index === current}
                    onClick={() => setOpenIndex(index)}
                    data-explain-title={item.id}
                    className="flex min-h-9 w-full items-center text-left text-[12.5px] font-semibold leading-snug text-ink"
                  />
                </h3>
                {index === current && <ItemBody item={item} t={t} />}
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
      ref={root}
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
      <ol data-explain-live className="scroll-thin m-0 min-h-0 list-none overflow-y-auto p-0">
        {shown.map((item) => (
          <li key={item.id} className="explainer-in border-t border-hairline px-3 py-2">
            <h3 data-explain-title={item.id} className="m-0 text-[12.5px] font-semibold leading-snug text-ink" />
            <ItemBody item={item} t={t} />
          </li>
        ))}
      </ol>
      {liveRegion}
    </Panel>
  );
}
