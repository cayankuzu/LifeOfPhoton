import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '@/i18n/messages';
import { meterLnExposure } from '@/physics/exposure';
import { SCENARIO } from '@/physics/scenario';
import { sharedAtlas } from '@/physics/spectralAtlas';
import { DEFAULT_SETTINGS, getSettings, updateSettings } from '@/state/simulation';
import App from '../App';
import { EMPTY_MEMORY, type ExplainInput, explain, MAX_ITEMS } from '../explain';
import { EVALUATE_EVERY_MS, SETTLE_MS, describeList, newSettling, openDossierAt, settle } from '../hud/Explainer';
import type { HudTier } from '../hud/tier';

// the tier is measured in the browser; here a test sets it
const tier = vi.hoisted(() => ({ value: 'wide' as HudTier }));
vi.mock('../hud/tier', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hud/tier')>()),
  useHudTier: () => tier.value,
}));

describe('the page as the server sends it', () => {
  // The start-up screen is in this markup and covers the whole page until the scene is ready. On a slow
  // connection the scripts arrive seconds later; until then nothing behind the screen may take the focus.
  const html = renderToStaticMarkup(<App />);

  it('shows the start-up screen', () => {
    expect(html).toContain('role="progressbar"');
  });

  it('keeps the stage behind it inert, before any script has run', () => {
    const stage = html.indexOf('<div inert="" class="absolute inset-y-0 left-0');
    expect(stage).toBeGreaterThanOrEqual(0);
    // the controls are inside that box
    expect(html.indexOf('id="controls"')).toBeGreaterThan(stage);
    // and the start-up screen itself is not inert
    expect(html.match(/ inert=""/g)).toHaveLength(1);
  });

  it('lays a still of the simulation behind it, decorative and captioned in the language of the visit', () => {
    // The picture is in the markup itself, so that it paints before any script runs (a screenshot service, a browser
    // without WebGL 2). It is a static import: next/image writes the blur placeholder inline and asks for a preload.
    const image = html.match(/<img [^>]*poster[^>]*>/)?.[0] ?? '';
    expect(image).toContain('alt=""');
    expect(image).toContain('fetchPriority="high"');
    expect(image).toContain('background-image');
    expect(image).not.toContain('loading="lazy"');
    // it and its caption are hidden from assistive technology, inside the start-up screen
    const hidden = html.lastIndexOf('<div aria-hidden="true"', html.indexOf(image));
    expect(hidden).toBeGreaterThan(html.indexOf('role="status"'));
    expect(html.indexOf(MESSAGES.tr.loading.still)).toBeGreaterThan(hidden);
    expect(html).not.toContain(MESSAGES.en.loading.still);
  });

  it('offers no way to skip to controls that cannot be reached', () => {
    expect(html).not.toContain('href="#controls"');
  });

  it('carries the title of the page, in the language it is served in', () => {
    // the only <title> (layout.tsx sets none), so that it follows the language of the visit (App.tsx)
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain(`<title>${MESSAGES.tr.app.title}</title>`);
  });
});

/** The start tag of the element with this id. */
const startTag = (html: string, id: string): string => html.match(new RegExp(`<[a-z0-9]+ [^>]*id="${id}"[^>]*>`))?.[0] ?? '';

describe('the panel “Why does it look like this?”', () => {
  afterEach(() => {
    tier.value = 'wide';
    updateSettings(DEFAULT_SETTINGS);
    vi.unstubAllGlobals();
  });

  it('is open by default, beside the instruments, as a labelled region in the language of the visit', () => {
    const html = renderToStaticMarkup(<App />);
    const region = startTag(html, 'explainer');
    expect(region).toContain('role="region"');
    expect(region).toContain('aria-labelledby="explainer-title"');
    expect(region).toContain('lang="tr"');
    expect(html).toContain(`<h2 id="explainer-title" class="label m-0">${MESSAGES.tr.explain.title}</h2>`);
    // in the row of the dock, after it: not over the view
    expect(html.indexOf('id="explainer"')).toBeGreaterThan(html.indexOf('aria-labelledby="dock-title"'));
    expect(html.match(/id="explainer"/g)).toHaveLength(1);
  });

  it('has a switch in the top bar with a name, a state and the panel it controls', () => {
    const html = renderToStaticMarkup(<App />);
    const toggle = html.match(/<button [^>]*id="explainer-toggle"[^>]*>.*?<\/button>/)?.[0] ?? '';
    expect(toggle).toContain('aria-pressed="true"');
    expect(toggle).toContain('aria-controls="explainer"');
    expect(toggle).toContain(`title="${MESSAGES.tr.explain.toggleHint}"`);
    expect(toggle).toContain(`>${MESSAGES.tr.explain.toggle}</span>`);
    // beside the dossier's button: the two explanations together
    expect(html.indexOf('id="explainer-toggle"')).toBeLessThan(html.indexOf(MESSAGES.tr.controls.dossierHint));
    // (the server renders the default settings; closing is covered by the tests of the preference and of the E key)
  });

  it('is one line under the top bar on a phone, opening into the list', () => {
    tier.value = 'narrow';
    const html = renderToStaticMarkup(<App />);
    expect(html.match(/id="explainer"/g)).toHaveLength(1);
    expect(html.indexOf('id="explainer"')).toBeLessThan(html.indexOf('aria-labelledby="dock-title"'));
    expect(html.indexOf('id="explainer"')).toBeGreaterThan(html.indexOf('id="controls"'));
    const opener = html.match(/<button [^>]*aria-controls="explainer-list"[^>]*>/)?.[0] ?? '';
    expect(opener).toContain('aria-expanded="false"');
    expect(html).toContain(`<h2 id="explainer-title" class="sr-only">${MESSAGES.tr.explain.title}</h2>`);
    // the switch keeps its name where its label gives way
    const toggle = html.match(/<button [^>]*id="explainer-toggle"[^>]*>.*?<\/button>/)?.[0] ?? '';
    expect(toggle).toContain(`<span class="sr-only">${MESSAGES.tr.explain.toggle}</span>`);
  });

  it('opens the dossier at the section of an item, and scrolls there when it is already open at it', () => {
    const scrollIntoView = vi.fn();
    const getElementById = vi.fn(() => ({ scrollIntoView }));
    vi.stubGlobal('document', { getElementById });
    openDossierAt('radiometry');
    expect(getSettings().dossier).toBe('radiometry');
    expect(scrollIntoView).not.toHaveBeenCalled();
    openDossierAt('radiometry');
    expect(getElementById).toHaveBeenCalledWith('dossier-radiometry');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(getSettings().dossier).toBe('radiometry');
  });

  it('shows a list only once it has settled, and announces it only when its set of items changes', () => {
    const fieldOfView = (SCENARIO.camera.fieldOfViewDeg * Math.PI) / 180;
    const inputAt = (beta: number): ExplainInput => {
      const base = {
        beta,
        view: 'seen' as const,
        thermal: true,
        lens: 1,
        paused: false,
        yaw: 0,
        pitch: 0,
        fieldOfView,
        aspect: 16 / 9,
      };
      return { ...base, lnExposure: meterLnExposure(sharedAtlas(), { ...base, optical: true }) };
    };
    const settling = newSettling();
    let memory = EMPTY_MEMORY;
    let now = 0;
    const log: Array<{ at: number; action: string; titles: string }> = [];
    /** Evaluations at the panel's rate while the speed follows `beta` (a function of the time) for `duration` ms. */
    const run = (beta: (time: number) => number, duration: number): void => {
      for (const end = now + duration; now < end; now += EVALUATE_EVERY_MS) {
        const result = explain(inputAt(beta(now)), memory);
        memory = result.memory;
        const list = describeList(result.items.slice(0, MAX_ITEMS), 'en', true);
        const action = settle(settling, now, list.signature, list.keys);
        if (action !== 'wait') log.push({ at: now, action, titles: list.texts.map((text) => text.title).join(' | ') });
      }
    };
    // at 0.2 c: the first list is shown, not announced
    run(() => 0.2, 2000);
    expect(log).toEqual([{ at: 600, action: 'show', titles: 'Colours are shifting | Lamp light shifts too' }]);
    // the speed eases to 0.5 c over three seconds: nothing changes on the way …
    const start = now;
    run((time) => 0.2 + 0.3 * Math.min(1, (time - start) / 3000), 3000);
    expect(log).toHaveLength(1);
    // … and the list at 0.5 c is announced once, after it has stayed the same for half a second
    run(() => 0.5, 2000);
    expect(log).toHaveLength(2);
    expect(log[1].action).toBe('announce');
    // (the last steps of the ease already read like 0.5 c: "1.7 times" either way)
    expect(log[1].at).toBeGreaterThanOrEqual(start + 3000);
    expect(log[1].at).toBeLessThanOrEqual(start + 3000 + SETTLE_MS + 2 * EVALUATE_EVERY_MS);
    expect(log[1].titles).toBe('Did the lamps go out? | Why aren’t the cars shorter? | Everything gathers ahead');
    // a little faster: only a number changes (the cars look 1.8 times farther away), which is shown but not announced
    run(() => 0.53, 2000);
    expect(log.slice(2).map((entry) => entry.action)).toEqual(['show']);
  });
});
