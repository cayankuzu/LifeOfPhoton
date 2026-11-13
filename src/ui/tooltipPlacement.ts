/**
 * Where the tooltip of an element of the interface goes (src/ui/hud/EntryHelp.tsx). A pure function
 * of rectangles, so that the rules can be tested without a browser:
 *
 * - it never covers the element it explains: it sits beside it, on one of its four sides;
 * - it stays inside the viewport, a margin away from its edges;
 * - it keeps off the middle of the view, where at high speed everything is: a side that would cover
 *   the middle is taken only when no side can avoid it, and then the one that covers the least.
 *
 * The sides are tried away from the nearest edge of the viewport first: an element in the top bar is
 * explained below it, one on the speed rail above it, one at the left edge to its right.
 */

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export type Side = 'below' | 'above' | 'right' | 'left';

export interface Placement {
  readonly left: number;
  readonly top: number;
  readonly side: Side;
}

/** Distance between the tooltip and its element, px. */
export const TOOLTIP_GAP = 8;
/** Distance kept from the edges of the viewport, px. */
export const VIEWPORT_MARGIN = 8;
/** The middle of the view the tooltip keeps off, as a fraction of each dimension of the view. */
export const MIDDLE_FRACTION = 0.28;

/** The middle of a view: a box about its centre, MIDDLE_FRACTION of its width and height. */
export function middleOf(view: Rect): Rect {
  const width = view.width * MIDDLE_FRACTION;
  const height = view.height * MIDDLE_FRACTION;
  return { left: view.left + (view.width - width) / 2, top: view.top + (view.height - height) / 2, width, height };
}

/** Area two rectangles share. */
export function overlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
}

/** A position along one axis: centred on the anchor, then moved inside [margin, extent − margin]. */
function clampAlong(centre: number, size: number, extent: number): number {
  const ideal = centre - size / 2;
  const max = extent - VIEWPORT_MARGIN - size;
  // a tooltip larger than the viewport starts at the margin
  return Math.max(VIEWPORT_MARGIN, Math.min(ideal, max));
}

/** The tooltip beside the anchor on one side, and whether it fits there inside the viewport. */
function besides(anchor: Rect, tip: Size, viewport: Size, side: Side): { readonly rect: Rect; readonly fits: boolean } {
  const centreX = anchor.left + anchor.width / 2;
  const centreY = anchor.top + anchor.height / 2;
  let left: number;
  let top: number;
  let fits: boolean;
  switch (side) {
    case 'below':
      top = anchor.top + anchor.height + TOOLTIP_GAP;
      left = clampAlong(centreX, tip.width, viewport.width);
      fits = top + tip.height <= viewport.height - VIEWPORT_MARGIN;
      break;
    case 'above':
      top = anchor.top - TOOLTIP_GAP - tip.height;
      left = clampAlong(centreX, tip.width, viewport.width);
      fits = top >= VIEWPORT_MARGIN;
      break;
    case 'right':
      left = anchor.left + anchor.width + TOOLTIP_GAP;
      top = clampAlong(centreY, tip.height, viewport.height);
      fits = left + tip.width <= viewport.width - VIEWPORT_MARGIN;
      break;
    case 'left':
      left = anchor.left - TOOLTIP_GAP - tip.width;
      top = clampAlong(centreY, tip.height, viewport.height);
      fits = left >= VIEWPORT_MARGIN;
      break;
  }
  // across the side the tooltip must fit in the viewport as well
  fits &&=
    side === 'below' || side === 'above'
      ? tip.width <= viewport.width - 2 * VIEWPORT_MARGIN
      : tip.height <= viewport.height - 2 * VIEWPORT_MARGIN;
  return { rect: { left, top, width: tip.width, height: tip.height }, fits };
}

/** The order in which the sides are tried: away from the nearest edge first, vertical before horizontal. */
export function sideOrder(anchor: Rect, viewport: Size): readonly Side[] {
  const upper = anchor.top + anchor.height / 2 < viewport.height / 2;
  const leftHalf = anchor.left + anchor.width / 2 < viewport.width / 2;
  const vertical: Side[] = upper ? ['below', 'above'] : ['above', 'below'];
  const horizontal: Side[] = leftHalf ? ['right', 'left'] : ['left', 'right'];
  return [...vertical, ...horizontal];
}

/**
 * The place of a tooltip of size `tip` for an element at `anchor`, in a viewport of size `viewport`,
 * keeping off `middle` (the middle of the view: middleOf the box of the scene). All in CSS pixels of
 * the viewport.
 */
export function placeTooltip(anchor: Rect, tip: Size, viewport: Size, middle: Rect): Placement {
  const candidates = sideOrder(anchor, viewport).map((side) => ({ side, ...besides(anchor, tip, viewport, side) }));
  const fitting = candidates.filter((candidate) => candidate.fits);
  const pick = (from: typeof candidates) =>
    from.reduce((best, candidate) => (overlapArea(candidate.rect, middle) < overlapArea(best.rect, middle) ? candidate : best));
  if (fitting.length > 0) {
    const chosen = pick(fitting);
    return { left: chosen.rect.left, top: chosen.rect.top, side: chosen.side };
  }
  // No side has room (an element as large as the viewport): the side with the most room, pushed inside.
  const room: Record<Side, number> = {
    below: viewport.height - (anchor.top + anchor.height),
    above: anchor.top,
    right: viewport.width - (anchor.left + anchor.width),
    left: anchor.left,
  };
  const side = sideOrder(anchor, viewport).reduce((best, candidate) => (room[candidate] > room[best] ? candidate : best));
  const rect = besides(anchor, tip, viewport, side).rect;
  return {
    left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, viewport.width - VIEWPORT_MARGIN - tip.width)),
    top: Math.max(VIEWPORT_MARGIN, Math.min(rect.top, viewport.height - VIEWPORT_MARGIN - tip.height)),
    side,
  };
}
