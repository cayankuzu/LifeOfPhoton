/**
 * The two small drawings of the panel "Why does it look like this?", for the two ideas that words alone
 * explain least well to a child (src/ui/hud/Drawings.tsx draws them):
 *
 *   rain    a child standing in vertical rain, and running in it with the rain seeming to come from ahead
 *           and the umbrella tilted forward: the classical analogy of aberration, for the item "crowding"
 *   delay   a car and the eye, and two rays from its far end and its near end that set out at different
 *           moments (the far one earlier, when the car was farther away) and arrive together: why the
 *           shortening is not seen, for the items "shapes" and "measuredWhy"
 *
 * Pure: which item carries which drawing. src/ui/__tests__/drawings.test.ts checks it.
 */

import type { ExplainKey } from './explain';

export type DrawingId = 'rain' | 'delay';

/** The drawing of each item that has one (every variant of an item carries the same one). */
export const EXPLAIN_DRAWINGS: Readonly<Partial<Record<ExplainKey, DrawingId>>> = {
  crowding: 'rain',
  shapes: 'delay',
  measuredWhy: 'delay',
};

/** The drawing of an item by the name of its text (key, or key/variant), or null when it has none. */
export function drawingOf(id: string): DrawingId | null {
  return EXPLAIN_DRAWINGS[id.split('/')[0] as ExplainKey] ?? null;
}
