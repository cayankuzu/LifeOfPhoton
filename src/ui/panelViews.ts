/**
 * The two views of the panel "Why does it look like this?" (src/ui/hud/Explainer.tsx): "Now", the
 * items that apply at this moment, and "What is on the screen?", the inventory of everything visible
 * (src/ui/inventory.ts). A pure module: which tab a key leads to, which items open by themselves and
 * which wait under "Also right now", which ones are open; and the choices of the reader, kept for the
 * visit only (not stored), shared by the two placements of the panel, of which one renders at a time:
 * when the window crosses the width of a phone the panel keeps its view and its open entry.
 */

import type { InventoryId } from './inventory';

export type PanelView = 'now' | 'inventory';

/** The views in the order of their tabs. */
export const PANEL_VIEWS: readonly PanelView[] = ['now', 'inventory'];

/**
 * The tab a key moves the focus to, and selects, from the tab at `index` in a row of `count`: the
 * arrows go round, Home and End go to the ends. Null for any other key, which the row leaves alone
 * (up and down keep changing the speed).
 */
export function tabAfterKey(key: string, index: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count;
    case 'ArrowLeft':
      return (index + count - 1) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/** The items of "Now": the first `lead` open by themselves, the others are listed below them by their titles. */
export function splitNow<T>(items: readonly T[], lead: number): { readonly lead: readonly T[]; readonly also: readonly T[] } {
  return { lead: items.slice(0, lead), also: items.slice(lead) };
}

/** Beside the dock: every item that opens by itself, and of the others those the reader has opened. */
export function openBesideDock(ids: readonly string[], lead: number, opened: ReadonlySet<string>): Set<string> {
  return new Set(ids.filter((id, index) => index < lead || opened.has(id)));
}

/** In the accordion of a phone one item is open: the one the reader chose while it is on show, else the first. */
export function openInAccordion(ids: readonly string[], chosen: string | null): string | null {
  return chosen !== null && ids.includes(chosen) ? chosen : (ids[0] ?? null);
}

/** The items opened by the reader after a title is pressed: it opens, or closes when it was open. */
export function toggleOpened(opened: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(opened);
  if (!next.delete(id)) next.add(id);
  return next;
}

/** The items opened by the reader that are still on show (the same set when none has left). */
export function keepOnShow(opened: ReadonlySet<string>, ids: readonly string[]): ReadonlySet<string> {
  const kept = [...opened].filter((id) => ids.includes(id));
  return kept.length === opened.size ? opened : new Set(kept);
}

/** The inventory entry open after a title is pressed: one at a time; pressing the open one closes it. */
export function entryAfterPress(open: InventoryId | null, pressed: InventoryId): InventoryId | null {
  return open === pressed ? null : pressed;
}

/** What the reader has chosen in the panel during this visit. */
export interface PanelChoice {
  readonly view: PanelView;
  /** The inventory entry that is open, if any. */
  readonly entry: InventoryId | null;
}

export const INITIAL_CHOICE: PanelChoice = { view: 'now', entry: null };

let choice: PanelChoice = INITIAL_CHOICE;
const listeners = new Set<() => void>();

export function getPanelChoice(): PanelChoice {
  return choice;
}

export function subscribePanelChoice(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function choosePanel(change: Partial<PanelChoice>): void {
  const next = { ...choice, ...change };
  if (next.view === choice.view && next.entry === choice.entry) return;
  choice = next;
  listeners.forEach((listener) => listener());
}
