import { describe, expect, it } from 'vitest';
import { type HudTier, tierOfWidth } from '../tier';

/** The tiers from tightest to roomiest. */
const RANK: Record<HudTier, number> = { narrow: 0, medium: 1, wide: 2 };

describe('tierOfWidth', () => {
  it('changes tier at 760 px and at 1040 px, each limit belonging to the roomier tier', () => {
    expect(tierOfWidth(759)).toBe('narrow');
    expect(tierOfWidth(760)).toBe('medium');
    expect(tierOfWidth(1039)).toBe('medium');
    expect(tierOfWidth(1040)).toBe('wide');
    // a measured width is in CSS pixels and need not be whole
    expect(tierOfWidth(759.5)).toBe('narrow');
    expect(tierOfWidth(1039.5)).toBe('medium');
  });

  it('is narrow for an element without width and wide for any large one', () => {
    // an element that is hidden or not laid out yet reports 0
    expect(tierOfWidth(0)).toBe('narrow');
    expect(tierOfWidth(320)).toBe('narrow');
    expect(tierOfWidth(1920)).toBe('wide');
    expect(tierOfWidth(7680)).toBe('wide');
  });

  it('never moves to a tighter tier as the width grows', () => {
    let rank = RANK[tierOfWidth(0)];
    for (let width = 0; width <= 2000; width += 0.5) {
      const now = RANK[tierOfWidth(width)];
      expect(now, `${width} px`).toBeGreaterThanOrEqual(rank);
      rank = now;
    }
    // all three tiers are passed on the way
    expect(RANK[tierOfWidth(0)]).toBe(0);
    expect(rank).toBe(2);
  });
});
