import { describe, expect, it } from 'vitest';
import { BETA_MAX, betaToControl } from '@/physics/kinematics';
import { MARKS, fittingLabels, labelExtent } from '../speedMarks';

const LAST = MARKS.length - 1;

/** Rail widths of the scan, px: from "not measured yet" to wider than the rail gets on any screen. */
const WIDTHS = Array.from({ length: 1401 }, (_, width) => width);

type Extent = readonly [from: number, to: number];

/** Whether two labels share more than an edge. */
const overlap = ([fromA, toA]: Extent, [fromB, toB]: Extent): boolean => Math.max(fromA, fromB) < Math.min(toA, toB);

/** Width of a label, px. */
const widthOf = (index: number, rail = 0): number => {
  const [from, to] = labelExtent(index, rail);
  return to - from;
};

/** Room the two end labels need side by side, px. */
const ROOM_FOR_ENDS = widthOf(0) + widthOf(LAST);

/** The labelled marks in the order of the rail. */
const labelled = (rail: number): number[] => [...fittingLabels(rail)].sort((a, b) => a - b);

describe('the marks of the speed rail', () => {
  it('run from rest to the top of the simulated range, in ascending order', () => {
    expect(MARKS[0].beta).toBe(0);
    expect(MARKS[LAST].beta).toBe(BETA_MAX);
    for (let index = 1; index <= LAST; index++) expect(MARKS[index].beta).toBeGreaterThan(MARKS[index - 1].beta);
  });

  it('have distinct priorities and distinct labels', () => {
    // the priority decides which of two labels gives way; the label is also the key of its button
    expect(new Set(MARKS.map((mark) => mark.priority)).size).toBe(MARKS.length);
    expect(new Set(MARKS.map((mark) => mark.label)).size).toBe(MARKS.length);
  });

  it('are labelled with the velocity they mark, to the decimals shown', () => {
    for (const mark of MARKS) {
      const decimals = /\.(\d+)/.exec(mark.label)?.[1].length ?? 0;
      // half a unit of the last decimal of the label
      const tolerance = 0.5 * 10 ** -decimals;
      expect(Math.abs(Number.parseFloat(mark.label) - mark.beta), mark.label).toBeLessThanOrEqual(tolerance);
    }
  });
});

describe('labelExtent', () => {
  it('starts the first label at its mark, ends the last one at its mark and centres the others', () => {
    // this is how the rail aligns the buttons; an estimate laid out differently would predict the wrong collisions
    for (const rail of [0, 320, 800]) {
      expect(labelExtent(0, rail)[0]).toBe(0);
      expect(labelExtent(LAST, rail)[1]).toBe(rail);
      for (let index = 1; index < LAST; index++) {
        const [from, to] = labelExtent(index, rail);
        // 9 digits: the mark is where the throttle puts this velocity, to rounding
        expect((from + to) / 2).toBeCloseTo(betaToControl(MARKS[index].beta) * rail, 9);
      }
    }
  });

  it('gives every label a width of its own that grows with its text and not with the rail', () => {
    for (let index = 0; index <= LAST; index++) {
      expect(widthOf(index)).toBeGreaterThan(0);
      // 9 digits: the extent is computed around a centre that depends on the rail
      for (const rail of [320, 800, 1400]) expect(widthOf(index, rail)).toBeCloseTo(widthOf(index), 9);
    }
    const byLength = MARKS.map((mark, index) => ({ length: mark.label.length, width: widthOf(index) })).sort(
      (a, b) => a.length - b.length || a.width - b.width
    );
    for (let i = 1; i < byLength.length; i++) {
      if (byLength[i].length > byLength[i - 1].length) expect(byLength[i].width).toBeGreaterThan(byLength[i - 1].width);
    }
  });
});

describe('fittingLabels', () => {
  it('always labels the two ends, even before the rail has been measured', () => {
    // width 0 is what the rail reports before its first layout: then the ends are all there is
    expect(labelled(0)).toEqual([0, LAST]);
    for (const rail of WIDTHS) {
      const shown = fittingLabels(rail);
      expect(shown.has(0) && shown.has(LAST), `rail of ${rail} px`).toBe(true);
    }
  });

  it('labels every mark on a wide rail', () => {
    for (const rail of [1000, 1200, 1400]) expect(fittingLabels(rail).size, `rail of ${rail} px`).toBe(MARKS.length);
  });

  it('never lets two labels overlap, except the two ends on a rail too short for both', () => {
    for (const rail of WIDTHS) {
      const shown = labelled(rail);
      for (const a of shown) {
        for (const b of shown) {
          if (a >= b || !overlap(labelExtent(a, rail), labelExtent(b, rail))) continue;
          // The ends are labelled no matter what, so they are the one pair that can overlap:
          // on a rail that is not longer than the two of them, where nothing else is labelled.
          expect([a, b], `rail of ${rail} px`).toEqual([0, LAST]);
          expect(rail).toBeLessThanOrEqual(ROOM_FOR_ENDS);
          expect(shown, `rail of ${rail} px`).toEqual([0, LAST]);
        }
      }
    }
    // the exception is a real one: on half the room the ends do overlap
    expect(overlap(labelExtent(0, ROOM_FOR_ENDS / 2), labelExtent(LAST, ROOM_FOR_ENDS / 2))).toBe(true);
  });

  it('never shows fewer labels on a wider rail', () => {
    // which labels are shown can change (one may give way to one that outranks it); their number does not go down
    let count = 0;
    for (const rail of WIDTHS) {
      const now = fittingLabels(rail).size;
      expect(now, `rail of ${rail} px`).toBeGreaterThanOrEqual(count);
      count = now;
    }
    // and the scan does go from the two ends to all of them
    expect(fittingLabels(WIDTHS[0]).size).toBe(2);
    expect(count).toBe(MARKS.length);
  });

  it('drops a label only where it would collide with a shown label that outranks it', () => {
    // This is all that can be said: the label that takes the place may itself be of lower
    // priority than the one dropped, which lost its room to a third.
    for (const rail of WIDTHS) {
      const shown = fittingLabels(rail);
      for (let index = 0; index <= LAST; index++) {
        if (shown.has(index)) continue;
        const outranking = [...shown].filter(
          (other) => MARKS[other].priority < MARKS[index].priority && overlap(labelExtent(index, rail), labelExtent(other, rail))
        );
        expect(outranking.length, `"${MARKS[index].label}" on a rail of ${rail} px`).toBeGreaterThan(0);
      }
    }
  });
});
