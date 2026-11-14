import { describe, expect, it } from 'vitest';
import { scenarioSettings } from '@/dossier/scenario';
import { formatFixed } from '@/i18n/format';
import { MESSAGES } from '@/i18n/messages';
import { meterLnExposure } from '@/physics/exposure';
import { transversePlaneApparentAngle } from '@/physics/optics';
import { SCENARIO } from '@/physics/scenario';
import { sharedAtlas } from '@/physics/spectralAtlas';
import type { Language } from '@/state/simulation';
import { EMPTY_MEMORY, explain, type ExplainInput, type ExplainItem, type ExplainKey, GLOW_COLOUR_BOUNDS_K } from '../explain';
import { EXPLAIN_POINTING } from '../inventory';
import {
  endTour,
  firstStop,
  isFirstStop,
  isLastStop,
  lastStop,
  nextStop,
  previousStop,
  TOUR,
  type TourStopId,
  tourSource,
} from '../tour';

const DEG = Math.PI / 180;
const LANGUAGES: readonly Language[] = ['tr', 'en'];

const stopOf = (id: TourStopId) => {
  const stop = TOUR.find((candidate) => candidate.id === id);
  if (!stop) throw new Error(id);
  return stop;
};

/** What the panel's "Now" holds once the reader has arrived at a stop (the state its scenario sets, on a wide screen). */
function itemsAt(id: TourStopId): readonly ExplainItem[] {
  const { scenario } = stopOf(id);
  if (!scenario) throw new Error(`${id} sets no state`);
  const settings = scenarioSettings(scenario, true);
  const lens = settings.lens ?? 1;
  const yaw = scenario.look === 'behind' ? Math.PI : scenario.look === 'left' ? Math.PI / 2 : 0;
  const pitch = scenario.look === 'up' ? Math.PI / 3 : 0;
  const base = {
    beta: scenario.beta,
    view: settings.view ?? 'seen',
    thermal: settings.thermal ?? true,
    lens,
    paused: false,
    yaw,
    pitch,
    fieldOfView: 2 * Math.atan(Math.tan((SCENARIO.camera.fieldOfViewDeg * DEG) / 2) / lens),
    aspect: 16 / 9,
  };
  const input: ExplainInput = {
    ...base,
    lnExposure: meterLnExposure(sharedAtlas(), { ...base, optical: base.view === 'seen' }),
  };
  let result = explain(input, EMPTY_MEMORY);
  for (let i = 0; i < 3; i++) result = explain(input, result.memory);
  return result.items;
}

const item = (items: readonly ExplainItem[], key: ExplainKey): ExplainItem | undefined =>
  items.find((candidate) => candidate.key === key);

describe('the stops of the tour', () => {
  it('go from rest to the top of the range and end with the reader', () => {
    expect(TOUR.map((stop) => stop.id)).toEqual([
      'rest',
      'colours',
      'gather',
      'clocks',
      'ring',
      'behind',
      'measured',
      'limit',
      'end',
    ]);
    expect(TOUR[0].scenario?.beta).toBe(0);
    // the last stop leaves the scene where the one before put it
    expect(TOUR[lastStop()].scenario).toBeNull();
    expect(new Set(TOUR.map((stop) => tourSource(TOUR.indexOf(stop)))).size).toBe(TOUR.length);
  });

  it('mark what an item of the panel would mark for the same thing', () => {
    const items: Partial<Record<TourStopId, ExplainKey>> = {
      colours: 'colours',
      gather: 'crowding',
      clocks: 'clocks',
      ring: 'ring',
      behind: 'behind',
      measured: 'measured',
    };
    for (const [id, key] of Object.entries(items) as [TourStopId, ExplainKey][]) {
      const { mark } = stopOf(id);
      expect(mark.scene, id).toBe(EXPLAIN_POINTING[key].scene);
      for (const element of mark.elements ?? []) expect(EXPLAIN_POINTING[key].elements ?? [], id).toContain(element);
    }
  });
});

describe('each text, in the state its stop sets', () => {
  it('rest: standing still', () => {
    expect(item(itemsAt('rest'), 'rest')).toBeDefined();
  });

  it('0.2 c: the red signal ahead is seen green, and the light has not slowed down', () => {
    const colours = item(itemsAt('colours'), 'colours');
    expect(colours?.params.signalBand).toBe('green');
    expect(stopOf('colours').scenario?.beta).toBe(0.2);
  });

  it('0.5 c: things abeam are seen ahead, the cars smaller, the lamp light straight ahead ultraviolet', () => {
    const items = itemsAt('gather');
    expect(item(items, 'crowding')).toBeDefined();
    expect(transversePlaneApparentAngle(0.5)).toBeLessThan(90 * DEG);
    expect(item(items, 'shapes')?.params.times).toBeGreaterThan(1.5);
    expect(item(items, 'invisible')).toBeDefined();
  });

  it('γ = 2: the two clocks, and the street ahead beginning to glow red', () => {
    const items = itemsAt('clocks');
    expect(item(items, 'clocks')?.params.gamma).toBeCloseTo(2, 6);
    const kelvin = item(items, 'heatGlow')?.params.kelvin ?? 0;
    expect(kelvin).toBeGreaterThan(0);
    expect(kelvin).toBeLessThan(GLOW_COLOUR_BOUNDS_K[0]);
    for (const language of LANGUAGES) {
      const t = MESSAGES[language].explain;
      expect(t.tour.stops.clocks.body).toContain(t.glowColours[0]);
      expect(t.tour.stops.clocks.body).toContain('γ = 2');
    }
  });

  it('0.99 c: the forward half of the world in a circle of about 8°, the lamps only in the ring', () => {
    expect(item(itemsAt('ring'), 'ring')).toBeDefined();
    const degrees = Math.round(transversePlaneApparentAngle(0.99) / DEG);
    for (const language of LANGUAGES) {
      const body = MESSAGES[language].explain.tour.stops.ring.body;
      expect(body).toContain(`${degrees}°`);
      expect(body).toContain('99');
    }
  });

  it('0.99 c looking back: the lamp light from behind has gone infrared', () => {
    const behind = item(itemsAt('behind'), 'behind');
    expect(behind?.variant).toBe('infrared');
  });

  it('measured at γ = 2: 100 m of road measures 50 m', () => {
    const measured = item(itemsAt('measured'), 'measured');
    expect(measured?.variant).toBe('main');
    expect(measured?.params.road).toBeCloseTo(50, 6);
    for (const language of LANGUAGES) {
      const body = MESSAGES[language].explain.tour.stops.measured.body;
      expect(body).toContain('100');
      expect(body).toContain('50');
    }
  });

  it('near the limit through the ×10 lens: light at the same speed, the limit never reached', () => {
    const items = itemsAt('limit');
    expect(item(items, 'limit')).toBeDefined();
    expect(item(items, 'speedOfLight')).toBeDefined();
    expect(item(items, 'lens')?.params.lens).toBe(10);
    const { scenario } = stopOf('limit');
    for (const language of LANGUAGES) {
      const body = MESSAGES[language].explain.tour.stops.limit.body;
      expect(body).toContain(formatFixed(100 * (scenario?.beta ?? 0), 3, language));
      expect(body).toContain('10');
    }
  });
});

describe('the texts of the tour', () => {
  it.each(LANGUAGES)('are a short title and two or three short sentences for every stop (%s)', (language) => {
    const { stops } = MESSAGES[language].explain.tour;
    for (const { id } of TOUR) {
      const { title, body } = stops[id];
      const titleWords = title.split(/\s+/).length;
      expect(titleWords, id).toBeGreaterThanOrEqual(2);
      expect(titleWords, id).toBeLessThanOrEqual(5);
      expect(body.split(/\s+/).length, id).toBeLessThanOrEqual(45);
      const sentences = body.split(/[.!?](?:\s|$)/).filter((part) => part.trim() !== '').length;
      expect(sentences, id).toBeGreaterThanOrEqual(2);
      expect(sentences, id).toBeLessThanOrEqual(3);
    }
  });

  it('count the steps with the same numbers in both languages', () => {
    for (const language of LANGUAGES) {
      expect(MESSAGES[language].explain.tour.step('3', '9')).toMatch(/3\D+9/);
    }
  });
});

describe('the way through the tour', () => {
  it('goes on and back one stop at a time and stops at both ends', () => {
    expect(firstStop()).toBe(0);
    expect(lastStop()).toBe(TOUR.length - 1);
    expect(nextStop(0)).toBe(1);
    expect(nextStop(lastStop())).toBe(lastStop());
    expect(previousStop(3)).toBe(2);
    expect(previousStop(0)).toBe(0);
    expect(isFirstStop(0)).toBe(true);
    expect(isFirstStop(1)).toBe(false);
    expect(isLastStop(lastStop())).toBe(true);
    expect(isLastStop(0)).toBe(false);
    expect(endTour()).toBeNull();
    // every stop is reached by going on from the first
    let position = firstStop();
    const visited = [position];
    while (!isLastStop(position)) visited.push((position = nextStop(position)));
    expect(visited).toEqual(TOUR.map((_, index) => index));
  });
});
