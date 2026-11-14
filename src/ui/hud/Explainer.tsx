'use client';

/**
 * The panel "Why does it look like this?", in two views chosen by tabs (src/ui/panelViews.ts):
 *
 *   Now                       every item that applies at this moment, in plain words, on why the picture
 *                             looks the way it does (src/ui/explain.ts chooses them). The first ones open
 *                             by themselves; the others follow under "Also right now" by their titles and
 *                             open in place, so that nothing on show goes unexplained.
 *   What is on the screen?    everything the reader can see, by group (src/ui/inventory.ts), one entry
 *                             open at a time, with a sentence of live numbers for some of them.
 *
 * The choice of "Now" is evaluated ten times a second from the velocity the simulation is actually at
 * (src/ui/panelUpdate.ts has the rule). The numbers inside the items follow every evaluation, those of
 * the items not yet opened as well: they are written into the items in place, as the instrument dock
 * writes its rows, so that nothing is mounted again and no screen reader is interrupted. The set and the
 * order of the items change once two evaluations in a row agree on them; the first list is shown at
 * once. A screen reader hears the titles of the items that open by themselves, once, and only when
 * their set changes, not when a number in a text does. The live sentence of an open inventory entry is
 * written in place in the same way.
 *
 * Two placements, of which one renders at a time: beside the instrument dock on the medium and wide
 * tiers ("row"), and on a phone, where there is no room beside the dock, as one line under the top
 * bar that opens into an accordion ("top"). Either way it is in the flow of the HUD: it never covers
 * the top bar, the dock, the speed rail or the middle of the view; a long view scrolls inside it. The
 * view and the open inventory entry are kept for the visit and shared by the two placements.
 *
 * Resting the mouse on an item or an entry, or giving it the focus, marks on the screen what it talks
 * about (src/ui/pointing.ts, drawn by src/ui/hud/Pointer.tsx); on a touch screen the open one is marked, on
 * a phone also while the accordion is folded, so that a thing under the open list can be seen. Leaving it,
 * changing the view or closing the panel takes the mark away.
 *
 * "Start the tour" puts a guided tour (src/ui/tour.ts) in place of the views: a card per stop, with Back, Next
 * and End. Each stop sets a state of the simulation, as a "show in the scene" button of the dossier does, and
 * marks what its text is about for as long as it is shown; ending the tour (End, Escape, closing the panel)
 * takes the mark away and leaves the scene where the last stop put it.
 */

import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Lightbulb, Route, X } from 'lucide-react';
import { applyScenario } from '@/dossier/scenario';
import { formatInteger } from '@/i18n/format';
import type { Language } from '@/state/simulation';
import type { Messages } from '@/i18n/messages';
import { chooseExplainer } from '@/state/preferences';
import { getSettings, telemetry, updateSettings, useSettings } from '@/state/simulation';
import {
  EMPTY_MEMORY,
  type ExplainKey,
  type ExplainSection,
  type ExplainText,
  explain,
  MAX_ITEMS,
  MAX_ITEMS_TALL,
} from '../explain';
import { drawingOf } from '../drawings';
import { setText, useFrame, useMediaQuery, useMessages } from '../hooks';
import {
  DETAILED,
  entryProps,
  explainPointing,
  INVENTORY,
  INVENTORY_GROUPS,
  type InventoryId,
  inventoryDetail,
  inventoryPointing,
  LIVE_DETAILS,
  type Pointing,
} from '../inventory';
import { EVALUATE_EVERY_MS, describeList, newPanelUpdate, textsOnShow, updatePanel } from '../panelUpdate';
import {
  choosePanel,
  entryAfterPress,
  getPanelChoice,
  keepOnShow,
  openBesideDock,
  openInAccordion,
  PANEL_VIEWS,
  type PanelView,
  splitNow,
  subscribePanelChoice,
  tabAfterKey,
  toggleOpened,
} from '../panelViews';
import { setPointerTarget } from '../pointing';
import { Button, IconButton, Panel } from '../primitives';
import { endTour, firstStop, isFirstStop, isLastStop, nextStop, previousStop, TOUR, tourSource } from '../tour';
import { DrawingDisclosure } from './Drawings';
import { useHudTier } from './tier';

/** Id of the panel (the target of the top bar's switch) and of that switch (where the focus goes on closing). */
export const EXPLAINER_ID = 'explainer';
export const EXPLAINER_TOGGLE_ID = 'explainer-toggle';

/** Ids of a view's tab and of its tabpanel. */
export const tabId = (view: PanelView): string => `explainer-tab-${view}`;
export const tabPanelId = (view: PanelView): string => `explainer-view-${view}`;

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

/** A text that can mark something on the screen: an item of "Now" by the name of its text, or an entry of the inventory. */
const nowSource = (id: string): string => `now:${id}`;
const entrySource = (id: InventoryId): string => `entry:${id}`;

/** What a source points at (the variants of an item point at the same things). */
function pointingOf(source: string): Pointing {
  const name = source.slice(source.indexOf(':') + 1);
  return source.startsWith('entry:')
    ? inventoryPointing(name as InventoryId)
    : explainPointing({ key: name.split('/')[0] as ExplainKey });
}

/** The handlers a row of the panel carries to mark what it talks about. */
type MarkHandlers = (source: string) => {
  readonly onPointerEnter: (event: PointerEvent) => void;
  readonly onPointerLeave: () => void;
  readonly onFocus: () => void;
  readonly onBlur: () => void;
};

/**
 * Which text marks the screen: the one under the mouse, else the one that has the focus; on a touch screen,
 * where there is no hover and a tap need not move the focus, the open one (`open`). A change of `view`
 * drops the others, and so does an item of "Now" leaving the list (`shown`: the names of the items on
 * show) while the mouse rests on it; unmounting takes the mark away. While the guided tour runs
 * (`touring`), its card sets the mark and the texts leave it alone.
 */
function useMarks(
  view: PanelView,
  shown: readonly string[],
  open: string | null,
  touch: boolean,
  touring: boolean
): MarkHandlers {
  const sources = useRef({ view, hover: null as string | null, focus: null as string | null, open: null as string | null });
  const apply = (): void => {
    if (touring) return;
    const { hover, focus, open: opened } = sources.current;
    const source = touch ? opened : (hover ?? focus);
    setPointerTarget(source === null ? null : { source, pointing: pointingOf(source) });
  };
  useEffect(() => {
    const current = sources.current;
    if (current.view !== view) {
      current.view = view;
      current.hover = null;
      current.focus = null;
    }
    const gone = (source: string | null): boolean =>
      source !== null && source.startsWith('now:') && !shown.includes(source.slice('now:'.length));
    if (gone(current.hover)) current.hover = null;
    if (gone(current.focus)) current.focus = null;
    current.open = open;
    apply();
  });
  useEffect(() => () => setPointerTarget(null), []);
  return (source) => ({
    onPointerEnter: (event) => {
      if (event.pointerType === 'touch') return;
      sources.current.hover = source;
      apply();
    },
    onPointerLeave: () => {
      if (sources.current.hover !== source) return;
      sources.current.hover = null;
      apply();
    },
    onFocus: () => {
      sources.current.focus = source;
      apply();
    },
    onBlur: () => {
      if (sources.current.focus !== source) return;
      sources.current.focus = null;
      apply();
    },
  });
}

/** An item on show: the name of its text (key or key/variant) and the section of the dossier it leads to. */
interface ShownItem {
  readonly id: string;
  readonly section: ExplainSection;
}

/** The items of "Now" on show, of which the first `lead` open by themselves. */
interface ShownList {
  readonly items: readonly ShownItem[];
  readonly lead: number;
}

/** Id of the body of an item of "Now" (the target of its title's aria-controls); the name of a text may hold a slash. */
const itemBodyId = (id: string): string => `explainer-item-${id.replace(/[^A-Za-z0-9-]/g, '-')}`;
const entryBodyId = (id: InventoryId): string => `inventory-entry-${id}`;

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

/**
 * The body of an item, its optional extra sentence and the way on to the dossier; the words are written in
 * place. It is in the page while the item is closed as well, hidden, so that its numbers are current on opening. Some
 * items carry a small drawing behind a disclosure (src/ui/drawings.ts).
 */
function ItemBody({ item, open, t }: { readonly item: ShownItem; readonly open: boolean; readonly t: Messages }) {
  const drawing = drawingOf(item.id);
  return (
    <div id={itemBodyId(item.id)} hidden={!open}>
      <p data-explain-body={item.id} className="tabular m-0 mt-1 text-[12px] leading-[1.45] text-ink-2" />
      {drawing && <DrawingDisclosure drawing={drawing} id={`${itemBodyId(item.id)}-drawing`} t={t} />}
      <button
        type="button"
        data-explain-more={item.id}
        onClick={() => openDossierAt(item.section)}
        className="-ml-1 mt-1 inline-flex min-h-6 items-center gap-1 rounded px-1 text-[11.5px] text-ink-3 transition-colors duration-150 hover:text-ink hover:underline [@media(pointer:coarse)]:min-h-9"
      >
        <BookOpen className="h-3 w-3 text-amber" aria-hidden="true" />
        {t.explain.readMore}
      </button>
    </div>
  );
}

/** The chevron of a title that opens in place. */
function Chevron({ open }: { readonly open: boolean }) {
  return (
    <ChevronDown
      className={`h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    />
  );
}

const DISCLOSURE =
  'flex min-h-8 w-full items-center gap-2 text-left text-[12.5px] font-semibold leading-snug transition-colors duration-150 [@media(pointer:coarse)]:min-h-10';

/** A title that opens its item in place. */
function ItemTitle({ item, open, onPress }: { readonly item: ShownItem; readonly open: boolean; readonly onPress: () => void }) {
  return (
    <h3 className="m-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={itemBodyId(item.id)}
        onClick={onPress}
        className={`${DISCLOSURE} ${open ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}
      >
        <span data-explain-title={item.id} className="min-w-0 flex-1" />
        <Chevron open={open} />
      </button>
    </h3>
  );
}

/** The tabs of the two views: the arrows, Home and End move between them and select (one tab stop). */
function Tabs({ view, t }: { readonly view: PanelView; readonly t: Messages }) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const next = tabAfterKey(event.key, PANEL_VIEWS.indexOf(view), PANEL_VIEWS.length);
    if (next === null) return;
    // the arrows must not fall through to the window, where they would turn the view
    event.preventDefault();
    choosePanel({ view: PANEL_VIEWS[next] });
    document.getElementById(tabId(PANEL_VIEWS[next]))?.focus();
  };
  return (
    <div role="tablist" aria-label={t.inventory.tabs.label} className="flex shrink-0 gap-1 border-b border-hairline px-1.5">
      {PANEL_VIEWS.map((candidate) => {
        const selected = candidate === view;
        return (
          <button
            key={candidate}
            type="button"
            role="tab"
            id={tabId(candidate)}
            aria-selected={selected}
            aria-controls={tabPanelId(candidate)}
            tabIndex={selected ? 0 : -1}
            onClick={() => choosePanel({ view: candidate })}
            onKeyDown={onKeyDown}
            className={`relative h-8 rounded-[5px] px-2 text-[12px] font-medium leading-none transition-colors duration-150 ease-out [@media(pointer:coarse)]:h-10 ${
              selected ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {candidate === 'now' ? t.inventory.tabs.now : t.inventory.tabs.inventory}
            <span
              aria-hidden="true"
              className={`absolute inset-x-2 bottom-0 h-px transition-colors duration-150 ${selected ? 'bg-amber' : 'bg-transparent'}`}
            />
          </button>
        );
      })}
    </div>
  );
}

/** A tabpanel; the one not chosen stays in the page, hidden, so that its tab always controls an element. */
function TabPanel({
  view,
  chosen,
  children,
}: {
  readonly view: PanelView;
  readonly chosen: PanelView;
  readonly children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={tabPanelId(view)}
      aria-labelledby={tabId(view)}
      hidden={view !== chosen}
      className="scroll-thin min-h-0 overflow-y-auto overscroll-contain"
    >
      {children}
    </div>
  );
}

/**
 * The view "Now". Beside the dock the first items are open as they always are and the others open by
 * their titles; on a phone every item is a title of the accordion, one open at a time.
 */
function NowView({
  shown,
  open,
  accordion,
  onPress,
  marks,
  t,
}: {
  readonly shown: ShownList;
  readonly open: ReadonlySet<string>;
  readonly accordion: boolean;
  readonly onPress: (id: string) => void;
  readonly marks: MarkHandlers;
  readonly t: Messages;
}) {
  const { lead, also } = splitNow(shown.items, shown.lead);
  const row = (item: ShownItem) => (
    <li
      key={item.id}
      className="explainer-in border-t border-hairline px-3 py-1.5 first:border-t-0"
      {...marks(nowSource(item.id))}
    >
      {accordion ? (
        <ItemTitle item={item} open={open.has(item.id)} onPress={() => onPress(item.id)} />
      ) : (
        <h3 data-explain-title={item.id} className="m-0 pt-0.5 text-[12.5px] font-semibold leading-snug text-ink" />
      )}
      <ItemBody item={item} open={accordion ? open.has(item.id) : true} t={t} />
    </li>
  );
  return (
    <>
      <ol data-explain-live className="m-0 list-none p-0">
        {lead.map(row)}
      </ol>
      {also.length > 0 && (
        <>
          <p id="explainer-also" className="label m-0 border-t border-hairline px-3 pb-0.5 pt-2">
            {t.explain.alsoNow}
          </p>
          <ol data-explain-live aria-labelledby="explainer-also" className="m-0 list-none p-0">
            {also.map((item) => (
              <li key={item.id} className="explainer-in px-3 pb-1" {...marks(nowSource(item.id))}>
                <ItemTitle item={item} open={open.has(item.id)} onPress={() => onPress(item.id)} />
                <ItemBody item={item} open={open.has(item.id)} t={t} />
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}

/** The view "What is on the screen?": the groups and their entries, one open at a time. */
function InventoryView({
  entry,
  active,
  language,
  marks,
  t,
}: {
  readonly entry: InventoryId | null;
  readonly active: boolean;
  readonly language: Language;
  readonly marks: MarkHandlers;
  readonly t: Messages;
}) {
  const detail = useRef<HTMLParagraphElement>(null);
  const paintedAt = useRef(Number.NEGATIVE_INFINITY);
  const paint = (): void => {
    if (entry !== null) setText(detail.current, inventoryDetail(entry, t, language, { beta: telemetry.beta }) ?? '');
  };
  // the sentence of the open entry is current when it opens, and in the language of the moment
  useLayoutEffect(paint);
  // a sentence that changes with the speed is written in place, ten times a second, while it is in sight
  useFrame(() => {
    if (!active || entry === null || !LIVE_DETAILS.has(entry)) return;
    const now = performance.now();
    if (now - paintedAt.current < EVALUATE_EVERY_MS) return;
    paintedAt.current = now;
    paint();
  });
  const press = (id: InventoryId): void => {
    const next = entryAfterPress(entry, id);
    choosePanel({ entry: next });
    // the entry that opens comes into sight inside the list, without moving the page
    if (next !== null)
      requestAnimationFrame(() =>
        document.getElementById(entryBodyId(next))?.parentElement?.scrollIntoView({ block: 'nearest' })
      );
  };
  return (
    <>
      <p className="m-0 px-3 pb-1 pt-2 text-[12px] leading-[1.45] text-ink-3">{t.inventory.intro}</p>
      {INVENTORY_GROUPS.map((group) => (
        <section key={group} aria-labelledby={`inventory-group-${group}`}>
          <h3 id={`inventory-group-${group}`} className="label m-0 border-t border-hairline px-3 pb-0.5 pt-2">
            {t.inventory.groups[group]}
          </h3>
          <ul className="m-0 list-none p-0">
            {(INVENTORY[group] as readonly InventoryId[]).map((id) => {
              const open = id === entry;
              const text = t.inventory.entries[id];
              return (
                <li key={id} className="px-3" {...marks(entrySource(id))}>
                  <h4 className="m-0">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={entryBodyId(id)}
                      onClick={() => press(id)}
                      className={`${DISCLOSURE} ${open ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}
                    >
                      <span className="min-w-0 flex-1">{text.title}</span>
                      <Chevron open={open} />
                    </button>
                  </h4>
                  {open && (
                    <div id={entryBodyId(id)} className="pb-2">
                      <p className="m-0 text-[12px] leading-[1.45] text-ink-2">{text.body}</p>
                      {DETAILED.has(id) && <p ref={detail} className="tabular m-0 mt-1 text-[12px] leading-[1.45] text-ink-2" />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

/** Ids of the tour's heading (where the focus goes at each stop) and of the button that starts it (where it goes after). */
export const TOUR_TITLE_ID = 'explainer-tour-title';
export const TOUR_START_ID = 'explainer-tour-start';

/**
 * A stop of the guided tour, in place of the views: the step, the title, the text and the way on. Its mark stays on the
 * screen while it is shown, and goes when the card does. Escape ends the tour, unless something above it (a tooltip, the
 * sheet of shortcuts) has taken the key, or the focus is in the dossier, where the key is the dossier's; the arrow keys
 * are not taken and keep changing the speed and the view.
 */
function TourCard({
  position,
  onGo,
  onEnd,
  language,
  t,
}: {
  readonly position: number;
  readonly onGo: (position: number) => void;
  readonly onEnd: () => void;
  readonly language: Language;
  readonly t: Messages;
}) {
  const stop = TOUR[position];
  const text = t.explain.tour.stops[stop.id];
  useEffect(() => {
    setPointerTarget({ source: tourSource(position), pointing: stop.mark });
  }, [position, stop.mark]);
  useEffect(() => () => setPointerTarget(null), []);
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (event.target instanceof Element && event.target.closest('[data-dossier]')) return;
      // the key ends the tour and does nothing else (the dossier stays open, and so does the panel)
      event.preventDefault();
      onEnd();
    };
    // on the document, under the tooltip and the sheet of shortcuts (which listen first, on the window) and before the
    // shortcuts of the application (on the window, after it)
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onEnd]);
  const last = isLastStop(position);
  return (
    <section aria-label={t.explain.tour.label} className="scroll-thin min-h-0 overflow-y-auto overscroll-contain px-3 pb-2 pt-2">
      <p className="label tabular m-0">
        {t.explain.tour.step(formatInteger(position + 1, language), formatInteger(TOUR.length, language))}
      </p>
      <h3
        id={TOUR_TITLE_ID}
        tabIndex={-1}
        className="m-0 mt-1 rounded-sm text-[13px] font-semibold leading-snug text-ink outline-none focus-visible:ring-1 focus-visible:ring-amber"
      >
        {text.title}
      </h3>
      <p className="m-0 mt-1 text-[12px] leading-[1.45] text-ink-2">{text.body}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Button onClick={() => onGo(previousStop(position))} disabled={isFirstStop(position)} className="-ml-2.5">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {t.explain.tour.back}
        </Button>
        {!last && (
          <Button onClick={() => onGo(nextStop(position))} className="border border-hairline-strong text-ink">
            {t.explain.tour.next}
            <ChevronRight className="h-3.5 w-3.5 text-amber" aria-hidden="true" />
          </Button>
        )}
        <Button onClick={onEnd} className={last ? 'border border-hairline-strong text-ink' : 'ml-auto'}>
          {t.explain.tour.end}
        </Button>
      </div>
    </section>
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
  // the view and the open inventory entry, kept for the visit and shared by the two placements
  // (on the server no choice has been made: the store holds the initial one, which a test may change)
  const choice = useSyncExternalStore(subscribePanelChoice, getPanelChoice, getPanelChoice);
  // the structure on show; an item that joins it fades in (class explainer-in on a newly mounted item), while the
  // items that stay are not mounted again, so that the focus on one of their buttons is kept
  const [shown, setShown] = useState<ShownList>({ items: [], lead: 0 });
  // beside the dock: the items under "Also right now" the reader has opened
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
  // the accordion of the phone form: closed to one line at first, then one item open at a time
  const [expanded, setExpanded] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const announced = useRef<HTMLParagraphElement>(null);
  const live = useRef({
    at: Number.NEGATIVE_INFINITY,
    /** What the texts also depend on besides the state of the simulation: a change of it is evaluated at once. */
    context: '',
    memory: EMPTY_MEMORY,
    update: newPanelUpdate(),
    ids: [] as readonly string[],
    lead: 0,
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
    // every item that applies is on show; the first `count` open by themselves
    const items = result.items;
    const lead = Math.min(count, items.length);
    const list = describeList(items, language, settings.guides, lead);
    const step = updatePanel(state.update, now, list.structure, list.keys);
    if (step.show) {
      state.ids = list.ids;
      state.lead = lead;
      setShown({ items: items.map((item, index) => ({ id: list.ids[index], section: item.section })), lead });
      setOpened((previous) => keepOnShow(previous, list.ids));
    }
    state.texts = textsOnShow(state.ids, list, state.texts);
    // while the tour runs, the announcements are the tour's
    if (step.announce && getPanelChoice().tour === null) {
      const titles = state.ids.slice(0, state.lead).map((id) => state.texts.get(id)?.title ?? '');
      setText(announced.current, t.explain.announce(titles));
    }
    paintTexts(root.current, state.texts, t);
  });

  // the items React has just mounted have their words before the browser paints them
  useLayoutEffect(() => paintTexts(root.current, live.current.texts, t));

  const close = (): void => {
    // closing the panel leaves the tour as well
    choosePanel({ tour: endTour() });
    chooseExplainer(false);
    document.getElementById(EXPLAINER_TOGGLE_ID)?.focus();
  };
  // A stop of the tour sets its state, as a "show in the scene" button of the dossier does; the focus goes to its
  // heading, and its step and title are announced, politely.
  const goToStop = (position: number): void => {
    const { scenario } = TOUR[position];
    if (scenario) applyScenario(scenario);
    choosePanel({ tour: position });
    setExpanded(true);
    const step = t.explain.tour.step(formatInteger(position + 1, language), formatInteger(TOUR.length, language));
    setText(announced.current, t.explain.tour.announce(step, t.explain.tour.stops[TOUR[position].id].title));
    requestAnimationFrame(() => document.getElementById(TOUR_TITLE_ID)?.focus());
  };
  // Leaving it takes the mark away and leaves the scene where the last stop put it; a focus that was in the panel goes to
  // the button that starts the tour again.
  const leaveTour = (): void => {
    const inside = root.current?.contains(document.activeElement) === true;
    choosePanel({ tour: endTour() });
    setText(announced.current, '');
    if (inside) requestAnimationFrame(() => document.getElementById(TOUR_START_ID)?.focus());
  };
  const touring = choice.tour !== null;
  const ids = shown.items.map((item) => item.id);
  // the item open in the phone's accordion
  const accordionOpen = compact ? openInAccordion(ids, chosen) : null;
  const openNow = compact
    ? new Set([accordionOpen].filter((id): id is string => id !== null))
    : openBesideDock(ids, shown.lead, opened);
  // On a touch screen the open text is marked: the open entry, or the item open in the accordion. On a phone the
  // open list covers the upper part of the view, so what the reader opened stays marked while the accordion is
  // folded to its line, which then names it; the item the accordion opens by itself is marked only while it shows.
  const touch = useMediaQuery('(pointer: coarse)');
  let openSource: string | null = null;
  if (choice.view === 'inventory' && choice.entry !== null) openSource = entrySource(choice.entry);
  if (choice.view === 'now' && accordionOpen !== null && (expanded || chosen === accordionOpen))
    openSource = nowSource(accordionOpen);
  const marks = useMarks(choice.view, ids, openSource, touch, touring);
  const views = touring ? (
    <TourCard position={choice.tour ?? firstStop()} onGo={goToStop} onEnd={leaveTour} language={language} t={t} />
  ) : (
    <>
      <Tabs view={choice.view} t={t} />
      <TabPanel view="now" chosen={choice.view}>
        <NowView
          shown={shown}
          open={openNow}
          accordion={compact}
          onPress={compact ? setChosen : (id) => setOpened((previous) => toggleOpened(previous, id))}
          marks={marks}
          t={t}
        />
      </TabPanel>
      <TabPanel view="inventory" chosen={choice.view}>
        <InventoryView
          entry={choice.entry}
          active={choice.view === 'inventory' && (!compact || expanded)}
          language={language}
          marks={marks}
          t={t}
        />
      </TabPanel>
    </>
  );
  const closeButton = (
    <IconButton label={t.controls.close} onClick={close}>
      <X className="h-3.5 w-3.5" aria-hidden="true" />
    </IconButton>
  );
  const liveRegion = <p ref={announced} className="sr-only" aria-live="polite" />;
  const start = (): void => goToStop(firstStop());

  if (compact) {
    // folded: the item open in the accordion (the first, unless the reader chose another), or the open entry of the
    // inventory, else its name; open: the name of the panel, which the views do not repeat
    const first = accordionOpen;
    return (
      <Panel
        ref={root}
        id={EXPLAINER_ID}
        role="region"
        aria-labelledby="explainer-title"
        lang={language}
        className="flex max-h-[32dvh] min-h-0 w-full shrink-0 flex-col"
        {...entryProps('explainer')}
      >
        <h2 id="explainer-title" className="sr-only">
          {t.explain.title}
        </h2>
        {/* the panel's own tooltip answers here only, not over the views */}
        <div className="flex h-10 shrink-0 items-center gap-1 pl-1 pr-1" data-explain-handle="">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="explainer-list"
            onClick={() => setExpanded((value) => !value)}
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded px-2 text-left"
          >
            <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber" aria-hidden="true" />
            {!expanded && touring ? (
              <span key="tour" className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">
                {t.explain.tour.stops[TOUR[choice.tour ?? firstStop()].id].title}
              </span>
            ) : !expanded && choice.view === 'now' && first !== null ? (
              <span
                key="first"
                data-explain-title={first}
                className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink"
              />
            ) : (
              <span key="name" className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">
                {expanded || choice.view !== 'inventory'
                  ? t.explain.title
                  : choice.entry !== null
                    ? t.inventory.entries[choice.entry].title
                    : t.inventory.tabs.inventory}
              </span>
            )}
            <Chevron open={expanded} />
          </button>
          {!touring && (
            <IconButton id={TOUR_START_ID} label={t.explain.tour.start} entry="tour" onClick={start}>
              <Route className="h-3.5 w-3.5 text-amber" aria-hidden="true" />
            </IconButton>
          )}
          {closeButton}
        </div>
        {/* in the page while closed as well, so that the views keep their state and their numbers */}
        <div
          id="explainer-list"
          hidden={!expanded}
          className={expanded ? 'flex min-h-0 flex-col border-t border-hairline' : undefined}
        >
          {views}
        </div>
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
      {...entryProps('explainer')}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 py-1 pl-3 pr-1" data-explain-handle="">
        <h2 id="explainer-title" className="label m-0 min-w-0">
          {t.explain.title}
        </h2>
        {/* the buttons keep their width (the heading wraps instead), so that the close button stays inside the panel */}
        <div className="flex shrink-0 items-center gap-0.5">
          {!touring && (
            <Button id={TOUR_START_ID} entry="tour" onClick={start} className="px-2">
              <Route className="h-3.5 w-3.5 text-amber" aria-hidden="true" />
              {t.explain.tour.start}
            </Button>
          )}
          {closeButton}
        </div>
      </div>
      {views}
      {liveRegion}
    </Panel>
  );
}
