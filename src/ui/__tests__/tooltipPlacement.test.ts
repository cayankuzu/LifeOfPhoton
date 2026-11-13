import { describe, expect, it } from 'vitest';
import {
  middleOf,
  overlapArea,
  placeTooltip,
  type Rect,
  type Size,
  sideOrder,
  TOOLTIP_GAP,
  VIEWPORT_MARGIN,
} from '../tooltipPlacement';

const rect = (left: number, top: number, width: number, height: number): Rect => ({ left, top, width, height });

/** The tooltip as a rectangle, where placeTooltip puts it. */
function placed(anchor: Rect, tip: Size, viewport: Size, middle: Rect = middleOf({ left: 0, top: 0, ...viewport })) {
  const place = placeTooltip(anchor, tip, viewport, middle);
  return { ...place, rect: rect(place.left, place.top, tip.width, tip.height) };
}

/** Whether a rectangle lies inside the viewport, its margin kept. */
const inside = (box: Rect, viewport: Size): boolean =>
  box.left >= VIEWPORT_MARGIN &&
  box.top >= VIEWPORT_MARGIN &&
  box.left + box.width <= viewport.width - VIEWPORT_MARGIN &&
  box.top + box.height <= viewport.height - VIEWPORT_MARGIN;

const DESKTOP: Size = { width: 1440, height: 900 };
const PHONE: Size = { width: 375, height: 812 };
const TIP: Size = { width: 288, height: 96 };

describe('the place of the tooltip', () => {
  it('is below an element of the top bar, the gap away, centred on it', () => {
    const anchor = rect(600, 10, 80, 32);
    const { rect: box, side } = placed(anchor, TIP, DESKTOP);
    expect(side).toBe('below');
    expect(box.top).toBe(anchor.top + anchor.height + TOOLTIP_GAP);
    expect(box.left + box.width / 2).toBe(anchor.left + anchor.width / 2);
  });

  it('is above an element of the speed rail at the bottom', () => {
    const anchor = rect(400, 840, 200, 40);
    const { rect: box, side } = placed(anchor, TIP, DESKTOP);
    expect(side).toBe('above');
    expect(box.top + box.height).toBe(anchor.top - TOOLTIP_GAP);
  });

  it('is pushed inside the viewport at a corner, along the side it is on', () => {
    for (const anchor of [rect(0, 0, 32, 32), rect(DESKTOP.width - 32, 0, 32, 32), rect(DESKTOP.width - 40, 860, 40, 40)]) {
      const { rect: box } = placed(anchor, TIP, DESKTOP);
      expect(inside(box, DESKTOP)).toBe(true);
      expect(overlapArea(box, anchor)).toBe(0);
    }
  });

  it('never covers its element and stays in the viewport, for elements all over a desktop and a phone', () => {
    for (const viewport of [DESKTOP, PHONE]) {
      for (let left = 0; left + 40 <= viewport.width; left += 37) {
        for (let top = 0; top + 30 <= viewport.height; top += 41) {
          const anchor = rect(left, top, 40, 30);
          const tip = { width: Math.min(TIP.width, viewport.width - 2 * VIEWPORT_MARGIN), height: TIP.height };
          const { rect: box } = placed(anchor, tip, viewport);
          expect(inside(box, viewport), `${left},${top}`).toBe(true);
          expect(overlapArea(box, anchor), `${left},${top}`).toBe(0);
        }
      }
    }
  });

  it('keeps off the middle of the view, taking another side when the first would cover it', () => {
    const middle = middleOf({ left: 0, top: 0, ...DESKTOP });
    // a panel beside the middle, in the upper half: below it would reach into the middle
    const anchor = rect(middle.left - 120, middle.top - 60, 100, 40);
    const tall: Size = { width: 288, height: 220 };
    const below = rect(anchor.left + anchor.width / 2 - tall.width / 2, anchor.top + anchor.height + TOOLTIP_GAP, 288, 220);
    expect(overlapArea(below, middle)).toBeGreaterThan(0);
    const { rect: box, side } = placed(anchor, tall, DESKTOP, middle);
    expect(overlapArea(box, middle)).toBe(0);
    expect(side).toBe('above');
    expect(inside(box, DESKTOP)).toBe(true);
  });

  it('keeps off the middle of the scene where it is, not of the window', () => {
    // the scene beside a sheet: its middle is left of the window's
    const stage = rect(0, 0, 900, 900);
    const middle = middleOf(stage);
    const anchor = rect(middle.left + middle.width + 10, middle.top - 50, 40, 30);
    const { rect: box } = placed(anchor, TIP, DESKTOP, middle);
    expect(overlapArea(box, middle)).toBe(0);
  });

  it('when no side has room, takes the side with the most and stays in the viewport', () => {
    // an element as large as the viewport, a sheet on a phone
    const anchor = rect(0, 40, PHONE.width, PHONE.height - 40);
    const { rect: box, side } = placed(anchor, { width: 300, height: 120 }, PHONE);
    expect(side).toBe('above');
    expect(inside(box, PHONE)).toBe(true);
  });

  it('tries the sides away from the nearest edge first', () => {
    expect(sideOrder(rect(10, 10, 20, 20), DESKTOP)).toEqual(['below', 'above', 'right', 'left']);
    expect(sideOrder(rect(1400, 860, 20, 20), DESKTOP)).toEqual(['above', 'below', 'left', 'right']);
  });

  it('measures the middle as a box about the centre of the view', () => {
    const middle = middleOf(rect(100, 0, 1000, 800));
    expect(middle.left + middle.width / 2).toBe(600);
    expect(middle.top + middle.height / 2).toBe(400);
    expect(overlapArea(middle, middle)).toBeCloseTo(middle.width * middle.height);
    expect(overlapArea(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toBe(0);
  });
});
