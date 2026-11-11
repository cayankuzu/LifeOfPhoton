import katex from 'katex';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BETA_MAX } from '@/physics/kinematics';
import { LENSES, type Language } from '@/state/simulation';
import { DOSSIER } from '../content';
import { SPEED_MARKERS, betaOfExcess, oneMinusBeta } from '../data/speedScale';
import { DossierDocument } from '../Dossier';
import { FIGURES } from '../figures';
import { citationsIn } from '../inline';
import { REFERENCES, REFERENCE_BY_KEY } from '../references';
import { type Block, type DossierContent, type FigureId, localize } from '../types';

const LANGUAGES: readonly Language[] = ['tr', 'en'];
const FIGURE_IDS = Object.keys(FIGURES) as FigureId[];

/** Every piece of prose of the document, with a label saying where it is. */
function texts(content: DossierContent): Array<{ where: string; text: string }> {
  const out: Array<{ where: string; text: string }> = [
    { where: 'title', text: content.title },
    { where: 'subtitle', text: content.subtitle },
    ...content.abstract.map((text, index) => ({ where: `abstract ${index + 1}`, text })),
    ...content.keywords.map((text) => ({ where: 'keywords', text })),
  ];
  for (const section of content.sections) {
    const where = `section ${section.number}`;
    out.push({ where, text: section.title }, { where, text: section.summary });
    for (const block of section.blocks) out.push(...blockTexts(block).map((text) => ({ where, text })));
  }
  for (const entry of content.glossary) {
    out.push(
      { where: 'glossary', text: entry.symbol },
      { where: 'glossary', text: entry.term },
      { where: 'glossary', text: entry.definition }
    );
  }
  return out;
}

function blockTexts(block: Block): string[] {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      return [block.text];
    case 'equation':
      return block.note ? [block.note] : [];
    case 'list':
      return [...block.items];
    case 'callout':
      return [block.title ?? '', block.text];
    case 'table':
      return [block.caption ?? '', ...block.head, ...block.rows.flat()];
    case 'figure':
      return [block.caption];
    case 'try':
      return [block.label];
  }
}

/** Inline formulas of a string. */
function inlineMath(text: string): string[] {
  return [...text.matchAll(/\$([^$]+)\$/g)].map((match) => match[1]);
}

/** The string with formulas, citations and links removed: what is left is running prose. */
function prose(text: string): string {
  return text
    .replace(/\$[^$]+\$/g, ' ')
    .replace(/\[@[^\]]+\]/g, ' ')
    .replace(/\]\(https?:[^)]+\)/g, ' ');
}

describe.each(LANGUAGES)('dossier content (%s)', (language) => {
  const content = localize(DOSSIER, language);
  const all = texts(content);
  const blocks = content.sections.flatMap((section) => section.blocks);

  it('has ten sections numbered in order, each with a title, a summary and a body', () => {
    expect(content.sections.map((section) => section.number)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(new Set(content.sections.map((section) => section.id)).size).toBe(10);
    for (const section of content.sections) {
      expect(section.title.length).toBeGreaterThan(3);
      expect(section.summary.length).toBeGreaterThan(20);
      expect(section.blocks.length).toBeGreaterThanOrEqual(2);
    }
    expect(content.abstract.length).toBeGreaterThanOrEqual(2);
    expect(content.glossary.length).toBeGreaterThanOrEqual(12);
  });

  it('cites only references that exist', () => {
    for (const { where, text } of all) {
      for (const key of citationsIn(text)) {
        expect(REFERENCE_BY_KEY.has(key), `${where}: unknown citation "${key}"`).toBe(true);
      }
    }
  });

  it('cites every entry of the bibliography', () => {
    const cited = new Set(all.flatMap(({ text }) => citationsIn(text)));
    const unused = REFERENCES.map((reference) => reference.key).filter((key) => !cited.has(key));
    expect(unused).toEqual([]);
  });

  it('contains only formulas that KaTeX can typeset', () => {
    const strict = { throwOnError: true, strict: 'error' } as const;
    for (const block of blocks) {
      if (block.type === 'equation') {
        expect(() => katex.renderToString(block.tex, { ...strict, displayMode: true }), block.tex).not.toThrow();
      }
    }
    for (const { where, text } of all) {
      for (const tex of inlineMath(text)) {
        expect(() => katex.renderToString(tex, strict), `${where}: ${tex}`).not.toThrow();
      }
      // a stray dollar sign would swallow the text after it
      expect((text.match(/\$/g) ?? []).length % 2, `${where}: unbalanced $ in "${text.slice(0, 60)}"`).toBe(0);
    }
  });

  it('numbers its equations by section, without gaps or repeats', () => {
    for (const section of content.sections) {
      const numbers = section.blocks.flatMap((block) => (block.type === 'equation' && block.number ? [block.number] : []));
      expect(numbers).toEqual(numbers.map((_, index) => `${section.number}.${index + 1}`));
    }
  });

  it('refers only to equations and sections that exist', () => {
    const equations = new Set(blocks.flatMap((block) => (block.type === 'equation' && block.number ? [block.number] : [])));
    for (const { where, text } of all) {
      for (const match of prose(text).matchAll(/\((\d+\.\d+)\)/g)) {
        expect(equations.has(match[1]), `${where}: reference to missing equation (${match[1]})`).toBe(true);
      }
    }
  });

  it('places every figure exactly once', () => {
    const placed = blocks.flatMap((block) => (block.type === 'figure' ? [block.figure] : []));
    expect([...placed].sort()).toEqual([...FIGURE_IDS].sort());
  });

  it('offers only scenarios the simulation can show', () => {
    const scenarios = blocks.flatMap((block) => (block.type === 'try' ? [block] : []));
    expect(scenarios.length).toBeGreaterThanOrEqual(12);
    for (const { label, scenario } of scenarios) {
      expect(label.length).toBeGreaterThan(2);
      expect(scenario.beta).toBeGreaterThanOrEqual(0);
      expect(scenario.beta).toBeLessThanOrEqual(BETA_MAX);
      if (scenario.lens !== undefined) expect(LENSES).toContain(scenario.lens);
    }
  });

  it('keeps tables rectangular', () => {
    for (const block of blocks) {
      if (block.type !== 'table') continue;
      for (const row of block.rows) expect(row).toHaveLength(block.head.length);
      if (block.align) expect(block.align).toHaveLength(block.head.length);
    }
  });

  it('is written in a plain register: no exclamation marks, no emoji, no placeholders', () => {
    for (const { where, text } of all) {
      const plain = prose(text);
      expect(plain, where).not.toMatch(/!/);
      expect(plain, where).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(plain, where).not.toMatch(/TODO|FIXME|lorem|undefined|NaN/);
    }
  });

  it('writes decimals the way the language does', () => {
    for (const { where, text } of all) {
      // equation numbers such as (3.1) are not decimals
      const plain = prose(text).replace(/\(\d+\.\d+\)/g, ' ');
      if (language === 'tr') {
        expect(plain, `${where}: decimal point in Turkish text: "${plain.trim().slice(0, 80)}"`).not.toMatch(/\d\.\d/);
        for (const tex of inlineMath(text)) expect(tex, `${where}: decimal point in Turkish formula`).not.toMatch(/\d\.\d/);
      } else {
        expect(plain, `${where}: decimal comma in English text: "${plain.trim().slice(0, 80)}"`).not.toMatch(/\d,\d/);
        for (const tex of inlineMath(text)) expect(tex, `${where}: decimal comma in English formula`).not.toMatch(/\d\{,\}\d/);
      }
    }
  });
});

describe('the two languages', () => {
  const tr = localize(DOSSIER, 'tr');
  const en = localize(DOSSIER, 'en');

  it('differ in their prose', () => {
    const pairs = tr.sections.flatMap((section, s) =>
      section.blocks.flatMap((block, b) => {
        const other = en.sections[s].blocks[b];
        return block.type === 'paragraph' && other.type === 'paragraph' ? [[block.text, other.text] as const] : [];
      })
    );
    expect(pairs.length).toBeGreaterThan(40);
    for (const [turkish, english] of pairs) expect(turkish).not.toBe(english);
  });

  it('use Turkish letters in Turkish and none in English', () => {
    const turkish = texts(tr)
      .map((entry) => prose(entry.text))
      .join(' ');
    const english = texts(en)
      .map((entry) => prose(entry.text))
      .join(' ');
    expect(turkish).toMatch(/[ğışİ]/);
    // names keep their diacritics; the letters below occur in no name cited here
    expect(english).not.toMatch(/[ğışİ]/);
  });

  it('state the same numbers in running text', () => {
    // every number of a paragraph must appear in its counterpart once decimal separators are unified
    const numbers = (text: string): string[] =>
      [
        ...text
          .replace(/\{,\}/g, '.')
          .replace(/(\d),(\d)/g, '$1.$2')
          .matchAll(/\d+(?:\.\d+)?/g),
      ]
        .map((match) => match[0])
        .sort();
    tr.sections.forEach((section, s) => {
      section.blocks.forEach((block, b) => {
        const other = en.sections[s].blocks[b];
        if (block.type === 'paragraph' && other.type === 'paragraph') {
          expect(numbers(block.text), `section ${section.number}, block ${b + 1}`).toEqual(numbers(other.text));
        }
      });
    });
  });
});

describe('bibliography', () => {
  it('is sorted by key, without duplicates', () => {
    const keys = REFERENCES.map((reference) => reference.key);
    expect(keys).toEqual([...keys].sort());
    expect(new Set(keys).size).toBe(keys.length);
    expect(REFERENCE_BY_KEY.size).toBe(keys.length);
  });

  it('has complete, well-formed entries', () => {
    for (const reference of REFERENCES) {
      expect(reference.authors.length, reference.key).toBeGreaterThan(2);
      expect(reference.title.length, reference.key).toBeGreaterThan(5);
      expect(reference.venue.length, reference.key).toBeGreaterThan(3);
      expect(reference.year, reference.key).toMatch(/^\d{4}$/);
      if (reference.doi) expect(reference.doi, reference.key).toMatch(/^10\.\d{4,9}\/\S+$/);
      if (reference.url) expect(reference.url, reference.key).toMatch(/^https:\/\/\S+$/);
      expect(['primary', 'secondary']).toContain(reference.checked);
    }
  });
});

describe('speed scale data', () => {
  it('lists physically ordered, finite markers with known sources', () => {
    for (const marker of SPEED_MARKERS) {
      expect(marker.excess, marker.id).toBeGreaterThan(0);
      expect(Number.isFinite(marker.excess), marker.id).toBe(true);
      if (marker.source) expect(REFERENCE_BY_KEY.has(marker.source), marker.id).toBe(true);
    }
    expect(new Set(SPEED_MARKERS.map((marker) => marker.id)).size).toBe(SPEED_MARKERS.length);
  });

  it('reproduces the values quoted by the sources', () => {
    const gamma = (id: string): number => 1 + (SPEED_MARKERS.find((marker) => marker.id === id)?.excess ?? Number.NaN);
    expect(gamma('linac4')).toBeCloseTo(1.1703, 3);
    expect(gamma('booster')).toBeCloseTo(3.1316, 3);
    expect(gamma('ps')).toBeCloseTo(27.73, 1);
    expect(gamma('sps')).toBeCloseTo(479.6, 0);
    expect(gamma('lhc') / 7247.4).toBeCloseTo(1, 4);
    expect(gamma('cosmicmuon')).toBeCloseTo(37.9, 0);
    expect(gamma('limit')).toBeCloseTo(223.607, 2);
    expect(gamma('omg') / 3.4e11).toBeCloseTo(1, 1);
    // slow objects: γ − 1 = β²/2
    const earth = SPEED_MARKERS.find((marker) => marker.id === 'earth');
    expect(earth && earth.excess / 4.93e-9).toBeCloseTo(1, 2);
  });

  it('converts between γ − 1, β and 1 − β without cancellation', () => {
    expect(betaOfExcess(1)).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(oneMinusBeta(7246.4) / 9.52e-9).toBeCloseTo(1, 2);
    expect(betaOfExcess(5e-9) / 1e-4).toBeCloseTo(1, 6);
    expect(oneMinusBeta(1e-12)).toBeCloseTo(1, 5);
  });
});

describe('rendering', () => {
  const states = [0, 0.2, Math.sqrt(3) / 2, 0.99, BETA_MAX];

  it.each(LANGUAGES)('typesets the whole document (%s) at every speed', (language) => {
    for (const beta of states) {
      const html = renderToStaticMarkup(<DossierDocument language={language} beta={beta} />);
      expect(html.length).toBeGreaterThan(50_000);
      expect(html).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
      // an unresolved citation is rendered as "?key"
      expect(html).not.toMatch(/>\?[a-z]+\d{4}/);
      // KaTeX marks what it could not parse
      expect(html).not.toContain('katex-error');
    }
  });

  it.each(FIGURE_IDS)('draws figure "%s" with finite coordinates in both languages', (id) => {
    const Figure = FIGURES[id];
    for (const language of LANGUAGES) {
      for (const beta of [...states, 0.5, 0.9999]) {
        const svg = renderToStaticMarkup(<Figure beta={beta} language={language} />);
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg, `${id} at β = ${beta}`).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
  });
});
