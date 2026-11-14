import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  choosePanel,
  entryAfterPress,
  getPanelChoice,
  INITIAL_CHOICE,
  keepOnShow,
  openBesideDock,
  openInAccordion,
  PANEL_VIEWS,
  splitNow,
  subscribePanelChoice,
  tabAfterKey,
  toggleOpened,
} from '../panelViews';

describe('the tabs of the panel', () => {
  it('go round with the arrows and to the ends with Home and End', () => {
    const count = PANEL_VIEWS.length;
    expect(PANEL_VIEWS).toEqual(['now', 'inventory']);
    expect(tabAfterKey('ArrowRight', 0, count)).toBe(1);
    expect(tabAfterKey('ArrowRight', 1, count)).toBe(0);
    expect(tabAfterKey('ArrowLeft', 0, count)).toBe(1);
    expect(tabAfterKey('ArrowLeft', 1, count)).toBe(0);
    expect(tabAfterKey('Home', 1, count)).toBe(0);
    expect(tabAfterKey('End', 0, count)).toBe(1);
  });

  it('leave every other key alone: up and down still change the speed', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'Enter', ' ', 'Tab', 'm']) expect(tabAfterKey(key, 0, 2)).toBeNull();
  });
});

describe('the items of "Now"', () => {
  const ids = ['rest', 'colours', 'lamps', 'ring', 'clocks'];

  it('open the first ones by themselves and list the others under "Also right now", leaving none out', () => {
    expect(splitNow(ids, 3)).toEqual({ lead: ['rest', 'colours', 'lamps'], also: ['ring', 'clocks'] });
    expect(splitNow(ids, 4).also).toEqual(['clocks']);
    expect(splitNow(ids.slice(0, 2), 3)).toEqual({ lead: ['rest', 'colours'], also: [] });
    const { lead, also } = splitNow(ids, 3);
    expect([...lead, ...also]).toEqual(ids);
  });

  it('beside the dock: open the first ones, and of the others those the reader opened', () => {
    expect([...openBesideDock(ids, 3, new Set())]).toEqual(['rest', 'colours', 'lamps']);
    expect([...openBesideDock(ids, 3, new Set(['clocks', 'gone']))]).toEqual(['rest', 'colours', 'lamps', 'clocks']);
    // an item the reader opened that moves up among the first ones stays open
    expect(openBesideDock(['clocks', 'rest'], 3, new Set(['clocks'])).has('clocks')).toBe(true);
  });

  it('open and close in place, and forget the items that have left', () => {
    const one = toggleOpened(new Set(), 'ring');
    expect([...one]).toEqual(['ring']);
    expect([...toggleOpened(one, 'ring')]).toEqual([]);
    const two = toggleOpened(one, 'clocks');
    expect(keepOnShow(two, ids)).toBe(two);
    expect([...keepOnShow(two, ['rest', 'clocks'])]).toEqual(['clocks']);
  });

  it('on a phone: one item open at a time, the chosen one while it is on show, else the first', () => {
    expect(openInAccordion(ids, null)).toBe('rest');
    expect(openInAccordion(ids, 'clocks')).toBe('clocks');
    expect(openInAccordion(ids, 'gone')).toBe('rest');
    expect(openInAccordion([], null)).toBeNull();
  });
});

describe('the entries of "What is on the screen?"', () => {
  it('open one at a time; pressing the open one closes it', () => {
    expect(entryAfterPress(null, 'moon')).toBe('moon');
    expect(entryAfterPress('moon', 'ring')).toBe('ring');
    expect(entryAfterPress('ring', 'ring')).toBeNull();
  });
});

describe('the choice of the reader', () => {
  afterEach(() => choosePanel(INITIAL_CHOICE));

  it('starts at "Now" with nothing open, is shared, and tells its readers only of a change', () => {
    expect(getPanelChoice()).toEqual({ view: 'now', entry: null, tour: null });
    const listener = vi.fn();
    const unsubscribe = subscribePanelChoice(listener);
    choosePanel({ view: 'inventory' });
    choosePanel({ entry: 'moon' });
    expect(getPanelChoice()).toEqual({ view: 'inventory', entry: 'moon', tour: null });
    expect(listener).toHaveBeenCalledTimes(2);
    choosePanel({ view: 'inventory' });
    expect(listener).toHaveBeenCalledTimes(2);
    // the stop of the guided tour is a choice as well
    choosePanel({ tour: 2 });
    expect(getPanelChoice().tour).toBe(2);
    choosePanel({ tour: null });
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
    choosePanel({ view: 'now' });
    expect(listener).toHaveBeenCalledTimes(4);
  });
});
