import { describe, expect, it } from 'vitest';
import { meterLnExposure } from '@/physics/exposure';
import { SCENARIO } from '@/physics/scenario';
import { sharedAtlas } from '@/physics/spectralAtlas';
import { EMPTY_MEMORY, type ExplainInput, type ExplainMemory, type ExplainText, explain, MAX_ITEMS } from '../explain';
import {
  ANNOUNCE_SETTLE_MS,
  EVALUATE_EVERY_MS,
  SET_SETTLE_MS,
  describeList,
  newPanelUpdate,
  textsOnShow,
  updatePanel,
} from '../panelUpdate';

const FIELD_OF_VIEW = (SCENARIO.camera.fieldOfViewDeg * Math.PI) / 180;
/** Time constant of the speed's ease in rapidity (src/scene/Simulation.tsx), s. */
const SPEED_RESPONSE = 0.32;
const FRAME_MS = 1000 / 60;

function inputAt(beta: number): ExplainInput {
  const base = {
    beta,
    view: 'seen' as const,
    thermal: true,
    lens: 1,
    paused: false,
    yaw: 0,
    pitch: 0,
    fieldOfView: FIELD_OF_VIEW,
    aspect: 16 / 9,
  };
  return { ...base, lnExposure: meterLnExposure(sharedAtlas(), { ...base, optical: true }) };
}

interface Evaluation {
  readonly at: number;
  readonly beta: number;
  /** The list as evaluated and the structure on show after this evaluation. */
  readonly evaluated: string;
  readonly shown: string;
  readonly texts: ReadonlyMap<string, ExplainText>;
  readonly latest: ReadonlyMap<string, ExplainText>;
  /** The titles a screen reader heard at this evaluation: those of the items that open by themselves. */
  readonly announced: string | null;
}

/**
 * The panel as Explainer.tsx drives it: frames at 60 Hz, an evaluation at the first frame at least
 * EVALUATE_EVERY_MS after the last, the velocity eased in rapidity towards `target(time)`.
 */
function drive(target: (time: number) => number, duration: number, from = 0): Evaluation[] {
  const state = newPanelUpdate();
  let memory: ExplainMemory = EMPTY_MEMORY;
  let rapidity = Math.atanh(from);
  let last = Number.NEGATIVE_INFINITY;
  let ids: readonly string[] = [];
  let opening = 0;
  let shown = '';
  let texts: ReadonlyMap<string, ExplainText> = new Map();
  const log: Evaluation[] = [];
  for (let now = 0; now <= duration; now += FRAME_MS) {
    const goal = Math.atanh(target(now));
    rapidity = goal + (rapidity - goal) * Math.exp(-FRAME_MS / 1000 / SPEED_RESPONSE);
    if (now - last < EVALUATE_EVERY_MS) continue;
    last = now;
    const beta = Math.tanh(rapidity);
    const result = explain(inputAt(beta), memory);
    memory = result.memory;
    // every item that applies is on show, the first MAX_ITEMS open by themselves
    const lead = Math.min(MAX_ITEMS, result.items.length);
    const list = describeList(result.items, 'en', true, lead);
    const step = updatePanel(state, now, list.structure, list.keys);
    if (step.show) {
      ids = list.ids;
      opening = lead;
      shown = list.structure;
    }
    texts = textsOnShow(ids, list, texts);
    log.push({
      at: now,
      beta,
      evaluated: list.structure,
      shown,
      texts,
      latest: new Map(list.ids.map((id, index) => [id, list.texts[index]])),
      announced: step.announce
        ? ids
            .slice(0, opening)
            .map((id) => texts.get(id)?.title)
            .join(' | ')
        : null,
    });
  }
  return log;
}

/** The longest time the structure on show trailed a structure that the evaluations had already agreed on, ms. */
function worstSetDelay(log: readonly Evaluation[]): number {
  let worst = 0;
  let since = 0;
  for (let i = 0; i < log.length; i++) {
    if (i > 0 && log[i].evaluated !== log[i - 1].evaluated) since = log[i].at;
    if (log[i].shown !== log[i].evaluated) worst = Math.max(worst, log[i].at - since);
  }
  return worst;
}

describe('the update rule of the panel "Why does it look like this?"', () => {
  it('shows the first list at once and does not announce it', () => {
    const log = drive(() => 0.2, 2000, 0.2);
    expect(log[0].shown).toBe(log[0].evaluated);
    expect(log[0].shown).toBe('colours,lamps');
    expect(log.every((entry) => entry.announced === null)).toBe(true);
  });

  it('keeps every number on show as the state is, while the speed eases (preset 0 -> 0.99 c)', () => {
    const log = drive(() => 0.99, 6000);
    let numbersChanged = 0;
    for (const [index, entry] of log.entries()) {
      // every item on show that the latest evaluation still has reads exactly as that evaluation does
      for (const [id, text] of entry.texts) {
        const latest = entry.latest.get(id);
        if (latest) expect(text).toEqual(latest);
      }
      if (index > 0 && JSON.stringify([...entry.texts]) !== JSON.stringify([...log[index - 1].texts])) numbersChanged++;
    }
    // the words on show changed at most evaluations of the ease, not once at its end
    expect(numbersChanged).toBeGreaterThan(10);
    // the panel arrived at the list of 0.99 c while the speed was still easing (a key step short of it)
    const final = log[log.length - 1].evaluated;
    const arrived = log.find((entry) => entry.shown === final);
    expect(arrived && arrived.beta).toBeLessThan(0.99);
  });

  it('shows a new set within two evaluations, and never one that a single evaluation saw', () => {
    for (const log of [
      drive(() => 0.99, 6000),
      drive((time) => Math.min(0.93, (time / 5000) * 0.93), 7000),
      drive(() => 0.9994, 8000),
    ]) {
      // two evaluations at most 116 ms apart (a frame late each), a commit later: well within 250 ms
      expect(worstSetDelay(log)).toBeLessThanOrEqual(SET_SETTLE_MS + EVALUATE_EVERY_MS + 2 * FRAME_MS);
      for (const [index, entry] of log.entries()) {
        if (index === 0 || entry.shown === log[index - 1].shown) continue;
        // a newly shown structure was evaluated at least twice in a row
        expect(log[index - 1].evaluated).toBe(entry.shown);
      }
    }
  });

  it('never shows a set again that it has left while the speed rises', () => {
    const log = drive(() => 0.99, 6000);
    const sequence = log.map((entry) => entry.shown).filter((shown, index, all) => index === 0 || shown !== all[index - 1]);
    expect(new Set(sequence).size).toBe(sequence.length);
    expect(sequence.length).toBeGreaterThan(1);
  });

  it('announces a set only once it has stayed for half a second, and never a change of a number', () => {
    const log = drive((time) => (time < 3000 ? 0.2 : 0.5), 8000, 0.2);
    const announcements = log.filter((entry) => entry.announced !== null);
    expect(announcements).toHaveLength(1);
    const heard = announcements[0];
    // the set it announces had been on show for ANNOUNCE_SETTLE_MS without a change
    const shownSince = log.find((entry) => entry.shown === heard.shown)?.at ?? Number.NaN;
    expect(heard.at - shownSince).toBeGreaterThanOrEqual(ANNOUNCE_SETTLE_MS);
    expect(heard.at - shownSince).toBeLessThan(ANNOUNCE_SETTLE_MS + EVALUATE_EVERY_MS + 2 * FRAME_MS);
    expect(heard.announced).toBe('Did the lamps go out? | Why aren’t the cars shorter? | Everything gathers ahead');
    // a little faster: only a number changes (the cars look farther away), which is written but not announced
    const faster = drive((time) => (time < 2000 ? 0.5 : 0.53), 5000, 0.5);
    expect(faster.filter((entry) => entry.announced !== null)).toHaveLength(0);
    const shapes = (entry: Evaluation): string | undefined => entry.texts.get('shapes')?.body;
    expect(shapes(faster[faster.length - 1])).not.toBe(shapes(faster[0]));
  });

  it('describes the items under "Also right now" in the structure, and announces only those that open by themselves', () => {
    const items = explain(inputAt(0.99)).items;
    expect(items.length).toBeGreaterThan(MAX_ITEMS);
    const all = describeList(items, 'en', true);
    const split = describeList(items, 'en', true, MAX_ITEMS);
    expect(split.ids).toEqual(all.ids);
    expect(split.texts).toEqual(all.texts);
    expect(all.structure).toBe(all.ids.join());
    expect(split.structure).toBe(`${all.ids.slice(0, MAX_ITEMS).join()}|${all.ids.slice(MAX_ITEMS).join()}`);
    // where the open items end is part of the structure: a fourth item that opens is a new structure
    expect(describeList(items, 'en', true, MAX_ITEMS + 1).structure).not.toBe(split.structure);
    expect(split.keys).toBe(
      items
        .slice(0, MAX_ITEMS)
        .map((item) => item.key)
        .sort()
        .join()
    );
  });

  it('never announces a title that is not open, while the speed rises to 0.99999 c', () => {
    const log = drive((time) => (time < 500 ? 0 : 0.99999), 12000);
    expect(log.some((entry) => entry.announced !== null)).toBe(true);
    for (const entry of log) {
      if (entry.announced === null) continue;
      expect(entry.announced.split(' | ').length).toBeLessThanOrEqual(MAX_ITEMS);
    }
  });

  it('lets an item that is about to leave keep its last words until the new list is shown', () => {
    const text = (title: string): ExplainText => ({ title, body: title, extra: null });
    const previous = new Map([
      ['a', text('a old')],
      ['b', text('b old')],
    ]);
    const evaluated = { ids: ['a', 'c'], texts: [text('a new'), text('c new')], structure: 'a,c', keys: 'a,c' };
    expect([...textsOnShow(['a', 'b'], evaluated, previous)]).toEqual([
      ['a', text('a new')],
      ['b', text('b old')],
    ]);
  });
});
