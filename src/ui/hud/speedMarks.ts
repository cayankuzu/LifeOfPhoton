/**
 * The marked velocities of the speed rail and the choice of which of them get a
 * label when the rail is too short for all.
 */

import { BETA_MAX, betaToControl } from '@/physics/kinematics';

export interface SpeedMark {
  readonly beta: number;
  readonly label: string;
  /** Order in which labels claim space on a short rail (lower = earlier). */
  readonly priority: number;
}

/** Marked velocities, in ascending order. Every mark keeps its tick; labels may be dropped. */
export const MARKS: readonly SpeedMark[] = [
  { beta: 0, label: '0', priority: 0 },
  { beta: 0.5, label: '0.5', priority: 4 },
  { beta: Math.sqrt(3) / 2, label: '0.866', priority: 2 },
  { beta: 0.99, label: '0.99', priority: 3 },
  { beta: 0.999, label: '0.999', priority: 5 },
  { beta: 0.9999, label: '0.9999', priority: 6 },
  { beta: BETA_MAX, label: '0.99999 c', priority: 1 },
];

/** Advance of one character of the label font and the padding of a label, px. */
const CHARACTER_WIDTH = 6.4;
const LABEL_PADDING = 14;

/** Horizontal extent [from, to] of the label of mark `index` on a rail `railWidth` pixels wide. */
export function labelExtent(index: number, railWidth: number): [number, number] {
  const width = MARKS[index].label.length * CHARACTER_WIDTH + LABEL_PADDING;
  const centre = betaToControl(MARKS[index].beta) * railWidth;
  // the first label is left-aligned on its mark, the last right-aligned, the others centred
  if (index === 0) return [centre, centre + width];
  if (index === MARKS.length - 1) return [centre - width, centre];
  return [centre - width / 2, centre + width / 2];
}

/**
 * Indices of the marks whose labels fit side by side on a rail of the given width.
 * Labels are placed in order of priority and dropped when they would overlap one
 * already placed; the two ends are always labelled, even before the rail has been
 * measured (width 0).
 */
export function fittingLabels(railWidth: number): ReadonlySet<number> {
  const last = MARKS.length - 1;
  const placed: Array<[number, number]> = [];
  const shown = new Set<number>();
  const order = MARKS.map((_, index) => index).sort((a, b) => MARKS[a].priority - MARKS[b].priority);
  for (const index of order) {
    const [from, to] = labelExtent(index, railWidth);
    const collides = placed.some(([otherFrom, otherTo]) => from < otherTo && to > otherFrom);
    if (!collides || index === 0 || index === last) {
      placed.push([from, to]);
      shown.add(index);
    }
  }
  return shown;
}
