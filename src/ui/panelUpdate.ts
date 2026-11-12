/**
 * When the panel "Why does it look like this?" changes what it shows. A pure module: the panel
 * (src/ui/hud/Explainer.tsx) calls it at every evaluation, and the tests call it with a clock of
 * their own.
 *
 * Two things change at two different paces:
 *
 *   the numbers   inside the items on show follow the state at every evaluation, ten times a
 *                 second: they are written into the items in place, the items are not mounted
 *                 again, and a screen reader is not told about them;
 *   the set       of items, and their order, is the structure of the panel. A new structure is
 *                 shown once two evaluations in a row (SET_SETTLE_MS apart) have agreed on it,
 *                 so that an item does not flash past while the speed eases through a threshold
 *                 (the hysteresis of src/ui/explain.ts already keeps the selection itself from
 *                 going back and forth).
 *
 * The first list is shown at once. A screen reader hears the titles of a list only when its set
 * of items differs from the one it heard last and has stayed the same for ANNOUNCE_SETTLE_MS:
 * a list that only passes by is not read out.
 *
 * (Until this module the panel waited until the whole list, numbers included, had stayed the same
 * for half a second. While the speed eased, was dragged or a key was held, the numbers changed at
 * every evaluation, so nothing was shown until the speed had come to rest: at 0.99 c the panel
 * still said "you are standing still" for more than three seconds.)
 */

import { type ExplainItem, type ExplainText, explainTextId, renderExplainItem } from './explain';
import type { Language } from '@/state/simulation';

/** Ten evaluations a second: a number on show is never more than this, plus a frame, behind the state. */
export const EVALUATE_EVERY_MS = 100;
/** How long a new set or order of items has to stay the same before it is shown: two evaluations in a row. */
export const SET_SETTLE_MS = 100;
/** How long a set has to stay the same before a screen reader hears it (the delay the dock's sentence waits as well). */
export const ANNOUNCE_SETTLE_MS = 500;

export interface PanelUpdate {
  /** The structure on show (null before the first list) and the one waiting, with the time it was first seen. */
  shown: string | null;
  candidate: string | null;
  since: number;
  /** The set of items on show, since when, and the set last announced (null: nothing yet). */
  shownKeys: string | null;
  keysSince: number;
  heard: string | null;
}

export function newPanelUpdate(): PanelUpdate {
  return { shown: null, candidate: null, since: 0, shownKeys: null, keysSince: 0, heard: null };
}

/** What a list evaluated now asks of the panel. */
export interface PanelStep {
  /** Mount this list (its structure differs from the one on show). Otherwise only its numbers are written in place. */
  readonly show: boolean;
  /** Tell a screen reader the titles of the list on show. */
  readonly announce: boolean;
}

/**
 * The step for a list evaluated at `now`: `structure` is the list as a sequence of texts (key and
 * variant, in order), `keys` its set of items in any order.
 */
export function updatePanel(state: PanelUpdate, now: number, structure: string, keys: string): PanelStep {
  let show = false;
  if (structure === state.shown) {
    state.candidate = null;
  } else if (state.shown === null) {
    show = true;
  } else if (structure !== state.candidate) {
    state.candidate = structure;
    state.since = now;
  } else if (now - state.since >= SET_SETTLE_MS) {
    show = true;
  }
  if (show) {
    state.shown = structure;
    state.candidate = null;
    if (keys !== state.shownKeys) {
      // the first list is not announced: it is what the reader finds on opening the panel
      if (state.shownKeys === null) state.heard = keys;
      state.shownKeys = keys;
      state.keysSince = now;
    }
  }
  const announce = state.shownKeys !== null && state.shownKeys !== state.heard && now - state.keysSince >= ANNOUNCE_SETTLE_MS;
  if (announce) state.heard = state.shownKeys;
  return { show, announce };
}

/** A list as the panel shows it: the names of its texts, the texts, its structure (texts in order) and its set of items. */
export interface DescribedList {
  readonly ids: readonly string[];
  readonly texts: readonly ExplainText[];
  readonly structure: string;
  readonly keys: string;
}

export function describeList(items: readonly ExplainItem[], language: Language, guides: boolean): DescribedList {
  const ids = items.map(explainTextId);
  return {
    ids,
    texts: items.map((item) => renderExplainItem(item, language, guides)),
    structure: ids.join(),
    keys: items
      .map((item) => item.key)
      .sort()
      .join(),
  };
}

/**
 * The texts to write into the items on show (`shown`, by name): each from the latest evaluation
 * where that evaluation still has it, otherwise the text it was last written with. An item that is
 * about to leave keeps its last words for the few tenths of a second until the new list is shown;
 * every other item already reads as the state does now.
 */
export function textsOnShow(
  shown: readonly string[],
  evaluated: DescribedList,
  previous: ReadonlyMap<string, ExplainText>
): Map<string, ExplainText> {
  const latest = new Map(evaluated.ids.map((id, index) => [id, evaluated.texts[index]]));
  const texts = new Map<string, ExplainText>();
  for (const id of shown) {
    const text = latest.get(id) ?? previous.get(id);
    if (text) texts.set(id, text);
  }
  return texts;
}
