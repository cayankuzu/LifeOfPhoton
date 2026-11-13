import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '@/i18n/messages';
import { DEFAULT_SETTINGS, getSettings, type Language, updateSettings } from '@/state/simulation';
import App from '../App';
import { openDossierAt, tabId, tabPanelId } from '../hud/Explainer';
import { describedById, INTERFACE_ENTRIES, INVENTORY_GROUPS, INVENTORY_IDS, type InventoryId } from '../inventory';
import { TOOLTIP_ID } from '../hud/EntryHelp';
import { PANEL_VIEWS } from '../panelViews';
import type { HudTier } from '../hud/tier';

// the tier is measured in the browser; here a test sets it
const tier = vi.hoisted(() => ({ value: 'wide' as HudTier }));
vi.mock('../hud/tier', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hud/tier')>()),
  useHudTier: () => tier.value,
}));

// The server renders the default settings (useSettings' server snapshot). A visit in another state (in English, with the
// dossier open) is the same markup as the browser renders it after hydration; here the store is read as it stands.
vi.mock('@/state/simulation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/state/simulation')>();
  return {
    ...actual,
    useSettings: <T,>(selector: (state: ReturnType<typeof actual.getSettings>) => T) => selector(actual.getSettings()),
  };
});

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
    // explained by its entry of the inventory, in the tooltip of the interface rather than a native one
    expect(toggle).toContain('data-explain-entry="why"');
    expect(toggle).not.toContain(' title=');
    expect(toggle).toContain(`>${MESSAGES.tr.explain.toggle}</span>`);
    // beside the dossier's button: the two explanations together
    expect(html.indexOf('id="explainer-toggle"')).toBeLessThan(html.indexOf('data-explain-entry="dossier"'));
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

  /** The two views of the panel in this markup: a tablist with one tab stop, and a tabpanel for every tab. */
  function expectViews(html: string): void {
    const panel = html.slice(html.indexOf('id="explainer"'));
    const list = panel.match(/<div role="tablist"[^>]*>/)?.[0] ?? '';
    expect(list).toContain(`aria-label="${MESSAGES.tr.inventory.tabs.label}"`);
    const tabs = panel.match(/<button [^>]*role="tab"[^>]*>[^<]*/g) ?? [];
    expect(tabs).toHaveLength(PANEL_VIEWS.length);
    PANEL_VIEWS.forEach((view, index) => {
      const selected = view === 'now';
      expect(tabs[index]).toContain(`id="${tabId(view)}"`);
      expect(tabs[index]).toContain(`aria-selected="${selected}"`);
      expect(tabs[index]).toContain(`aria-controls="${tabPanelId(view)}"`);
      expect(tabs[index]).toContain(`tabindex="${selected ? 0 : -1}"`);
      const tabpanel = startTag(panel, tabPanelId(view));
      expect(tabpanel).toContain('role="tabpanel"');
      expect(tabpanel).toContain(`aria-labelledby="${tabId(view)}"`);
      // "Now" is chosen at first; the other view is in the page, hidden
      expect(tabpanel.includes('hidden=""')).toBe(!selected);
    });
    expect(tabs[0]).toContain(`>${MESSAGES.tr.inventory.tabs.now}`);
    expect(tabs[1]).toContain(`>${MESSAGES.tr.inventory.tabs.inventory}`);
    // the inventory: its line of introduction, every group as a heading, every entry as a closed title
    const inventory = panel.slice(panel.indexOf(`id="${tabPanelId('inventory')}"`));
    expect(inventory).toContain(MESSAGES.tr.inventory.intro);
    for (const group of INVENTORY_GROUPS) expect(inventory).toContain(`>${MESSAGES.tr.inventory.groups[group]}</h3>`);
    const titles = inventory.match(/<button [^>]*aria-controls="inventory-entry-[^"]*"[^>]*>/g) ?? [];
    expect(titles).toHaveLength(INVENTORY_IDS.length);
    for (const title of titles) expect(title).toContain('aria-expanded="false"');
  }

  it('has the views "Now" and "What is on the screen?" as tabs beside the dock', () => {
    const html = renderToStaticMarkup(<App />);
    expectViews(html);
    // the views follow the heading of the panel and are its last content: nothing comes between them and the dock's row
    expect(html.indexOf('role="tablist"')).toBeGreaterThan(html.indexOf('id="explainer-title"'));
  });

  it('has the same tabs in the accordion of a phone, in the page while the accordion is closed', () => {
    tier.value = 'narrow';
    const html = renderToStaticMarkup(<App />);
    expectViews(html);
    const list = startTag(html, 'explainer-list');
    expect(list).toContain('hidden=""');
    expect(html.indexOf('role="tablist"')).toBeGreaterThan(html.indexOf('id="explainer-list"'));
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
});

/** Text as React writes it into markup. */
const escaped = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');

/** The start tags of the elements that carry an entry. */
const entryTags = (html: string, id: InventoryId): string[] =>
  html.match(new RegExp(`<[a-z]+ [^>]*data-explain-entry="${id}"[^>]*>`, 'g')) ?? [];

/** What the server sends for a tier and a state. */
function page(at: HudTier, settings: Partial<typeof DEFAULT_SETTINGS> = {}): string {
  tier.value = at;
  updateSettings({ ...DEFAULT_SETTINGS, ...settings });
  return renderToStaticMarkup(<App />);
}

describe('the explanation of every element of the interface', () => {
  afterEach(() => {
    tier.value = 'wide';
    updateSettings(DEFAULT_SETTINGS);
  });

  /** Entries whose element a phone has no room for: the name of the application, the speed in km/s and D₀. */
  const NOT_ON_A_PHONE: readonly InventoryId[] = ['title', 'speed', 'doppler'];

  it.each(['wide', 'narrow'] as const)('is on every element of the %s tier, as an entry and a description', (at) => {
    // the default state, and the dossier open (its sheet is an element too)
    const pages = [page(at), page(at, { dossier: 'abstract' })];
    const absent = INTERFACE_ENTRIES.filter((id) => pages.every((html) => entryTags(html, id).length === 0));
    expect([...absent].sort()).toEqual(at === 'narrow' ? [...NOT_ON_A_PHONE].sort() : []);
    for (const html of pages) {
      for (const id of INTERFACE_ENTRIES) {
        for (const tag of entryTags(html, id)) {
          // its explanation, after any description of its own
          expect(tag, id).toMatch(new RegExp(`aria-describedby="(?:[^"]* )?${describedById(id)}"`));
          // and no native tooltip beside the tooltip of the interface
          expect(tag, id).not.toMatch(/ title="/);
        }
      }
    }
    // the sheet appears only while it is open
    expect(entryTags(pages[0], 'dossierSheet')).toHaveLength(0);
    expect(entryTags(pages[1], 'dossierSheet')).toHaveLength(1);
  });

  it.each(['tr', 'en'] as const)(
    'describes every element once, out of sight, in the language of the visit (%s)',
    (language: Language) => {
      for (const at of ['wide', 'narrow'] as const) {
        // the panel closed: the descriptions do not depend on it
        for (const explainer of [true, false]) {
          const html = page(at, { language, explainer });
          const other = language === 'tr' ? 'en' : 'tr';
          const container = html.indexOf('<div hidden="" data-explain-descriptions="">');
          expect(container).toBeGreaterThan(-1);
          for (const id of INTERFACE_ENTRIES) {
            const { title, body } = MESSAGES[language].inventory.entries[id];
            const description = `<p id="${describedById(id)}" data-title="${escaped(title)}">${escaped(body)}</p>`;
            expect(html.split(description), id).toHaveLength(2);
            expect(html.indexOf(description)).toBeGreaterThan(container);
            if (MESSAGES[other].inventory.entries[id].body !== body)
              expect(html).not.toContain(escaped(MESSAGES[other].inventory.entries[id].body));
          }
          expect(html.match(/<p id="explain-entry-/g)).toHaveLength(INTERFACE_ENTRIES.length);
        }
      }
    }
  );

  it('has one tooltip for the whole interface, closed and outside the stage', () => {
    const html = page('wide');
    expect(html.match(/role="tooltip"/g)).toHaveLength(1);
    const tooltip = startTag(html, TOOLTIP_ID);
    expect(tooltip).toContain('role="tooltip"');
    expect(tooltip).not.toContain('data-open');
    expect(tooltip).toContain('motion-safe:transition-opacity');
    // after the stage, so that it is not made inert with it
    expect(html.indexOf(`id="${TOOLTIP_ID}"`)).toBeGreaterThan(html.indexOf('id="controls"'));
  });

  it('turns the hints of the parts of an element into lines of its tooltip', () => {
    const html = page('wide');
    const view = html.match(/<div role="radiogroup"[^>]*data-explain-entry="view"[^>]*>.*?<\/div>/)?.[0] ?? '';
    expect(view).toContain(`data-explain-hint="${escaped(MESSAGES.tr.view.modes.seen.hint)}"`);
    expect(view).toContain(`data-explain-hint="${escaped(MESSAGES.tr.view.modes.measured.hint)}"`);
    expect(view).not.toContain(' title=');
    expect(entryTags(html, 'slider')[0]).toContain(`data-explain-hint="${escaped(MESSAGES.tr.speed.hint)}"`);
    // the key of a switch, for its tooltip
    expect(entryTags(html, 'thermal')[0]).toContain('data-explain-key="T"');
  });
});
