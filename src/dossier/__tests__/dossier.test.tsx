import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import katex from 'katex';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '@/i18n/messages';
import { BETA_MAX } from '@/physics/kinematics';
import { SCENARIO } from '@/physics/scenario';
import { DEFAULT_SETTINGS, LENSES, type Language, getSettings, look, updateSettings } from '@/state/simulation';
import { SHEET_COVERS_QUERY } from '@/ui/DossierFrame';
import { DOSSIER } from '../content';
import { SPEED_MARKERS, betaOfExcess, oneMinusBeta } from '../data/speedScale';
import Dossier, { DossierDocument, applyScenario, numberFloats } from '../Dossier';
import { FIGURES } from '../figures';
import { citationsIn, renderInline } from '../inline';
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

/**
 * The last word of a number as it is read out in Turkish ("1924" → "dört", "0,045" →
 * "beş", "%30" → "otuz"): a case suffix written after the digits follows this word.
 */
function turkishLastWord(digits: string): string {
  const [whole, fraction] = digits.replace(/[\s\u202F.]/g, '').split(',');
  const value = Number(fraction !== undefined && Number(fraction) > 0 ? fraction : whole);
  const units = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
  const tens = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
  if (value === 0) return 'sıfır';
  if (value % 10) return units[value % 10];
  if (value % 100) return tens[(value % 100) / 10];
  if (value % 1000) return 'yüz';
  if (value % 1e6) return 'bin';
  return value % 1e9 ? 'milyon' : 'milyar';
}

/** Why a suffix cannot follow a word under vowel harmony and consonant assimilation, or null if it can. */
function suffixError(word: string, suffix: string): string | null {
  const vowels = 'aeıioöuü';
  const lastVowel = [...word].reverse().find((ch) => vowels.includes(ch)) ?? 'e';
  const firstVowel = [...suffix].find((ch) => vowels.includes(ch));
  if (!firstVowel) return null;
  const back = (ch: string) => 'aıou'.includes(ch);
  const rounded = (ch: string) => 'oöuü'.includes(ch);
  if (back(lastVowel) !== back(firstVowel)) return 'front/back harmony';
  if ('ıiuü'.includes(firstVowel) && rounded(lastVowel) !== rounded(firstVowel)) return 'rounding harmony';
  const voicelessEnd = 'çfhkpsşt'.includes(word.at(-1) ?? '');
  if (suffix[0] === 'd' && voicelessEnd) return 'd after a voiceless consonant';
  if (suffix[0] === 't' && !voicelessEnd) return 't after a voiced sound';
  if (vowels.includes(word.at(-1) ?? '') && vowels.includes(suffix[0])) return 'missing buffer consonant';
  return null;
}

describe('Turkish suffixes after numbers', () => {
  it('reads numbers the way the suffix checker assumes', () => {
    expect(['1924', '%30', '0,045', '10\u202F000', '1960', '100'].map((n) => turkishLastWord(n.replace('%', '')))).toEqual([
      'dört',
      'otuz',
      'beş',
      'bin',
      'altmış',
      'yüz',
    ]);
    expect(suffixError('dört', 'te')).toBeNull();
    expect(suffixError('bir', 'den')).toBeNull();
    expect(suffixError('altı', 'sında')).toBeNull();
    expect(suffixError('kırk', 'si')).not.toBeNull();
    expect(suffixError('beş', 'de')).not.toBeNull();
    expect(suffixError('iki', 'e')).not.toBeNull();
  });

  it('agree with the number as it is read out, so a generated value never carries a hand-written suffix that does not fit', () => {
    const turkish = localize(DOSSIER, 'tr');
    let checked = 0;
    for (const { where, text } of texts(turkish)) {
      for (const match of prose(text).matchAll(/(\d[\d\u202F]*(?:,\d+)?)\s?’([a-zçğıöşü]+)/g)) {
        const word = turkishLastWord(match[1]);
        expect(suffixError(word, match[2]), `${where}: "${match[0]}" (read "${word}")`).toBeNull();
        checked += 1;
      }
      // a formula that ends in a number, such as $\beta = 0{,}99$’da
      for (const match of text.matchAll(/(\d+(?:\{,\}\d+)?)\$’([a-zçğıöşü]+)/g)) {
        const word = turkishLastWord(match[1].replace('{,}', ','));
        expect(suffixError(word, match[2]), `${where}: "${match[0]}" (read "${word}")`).toBeNull();
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(40);
  });
});

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

describe('claims that rest on other tests', () => {
  // The numbers below are quoted in the text and set in the test files that check them; read as text, as
  // gpu.test.ts itself reads Simulation.tsx, so that a changed tolerance cannot leave the dossier behind.
  const source = (relative: string): string => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
  const constant = (text: string, name: string): string => {
    const match = new RegExp(`const ${name} = ([^;]+);`).exec(text);
    if (!match) throw new Error(`no constant ${name}`);
    return match[1].trim();
  };
  const verification = (language: Language): string => {
    const section = localize(DOSSIER, language).sections.find((s) => s.id === 'verification')!;
    const paragraph = section.blocks.find((block) => block.type === 'paragraph');
    return paragraph && paragraph.type === 'paragraph' ? paragraph.text : '';
  };

  it('Section 9 states the tolerances and ranges of the GPU tests', () => {
    const gpu = source('../../scene/__tests__/gpu.test.ts');
    const side = Number(constant(gpu, 'N'));
    expect(constant(gpu, 'ARITHMETIC')).toBe('1e-4');
    expect(constant(gpu, 'SUBTEXEL')).toBe('1 / 256');
    expect(constant(gpu, 'BOOST_TOLERANCE')).toBe('1e-6');
    expect(constant(gpu, 'STAR_TOLERANCE')).toBe('1e-4');
    expect(gpu).toContain('Math.log(0.002) + (i / 300) * (Math.log(500) - Math.log(0.002))');
    expect(gpu).toContain('[0, 0.5, 0.9, 0.99, 0.999, 0.9999, 0.99999]');
    expect(gpu).toContain('expect(worst, worstAt).toBeLessThanOrEqual(1)');
    // the Moon: pixels from a sixth of the radius to three times it, flux within 8 %
    expect(gpu).toContain('for (const radiusPx of [0.3, 0.6, 1, 1.5, 2, 2.5, 3, 4, 6])');
    expect(constant(gpu, 'MOON_FLUX')).toBe('0.08');
    expect(gpu).toContain('expect(stray).toBe(0)');
    const en = verification('en');
    for (const claim of [
      `in 8 bits for ${side * side} radiances`,
      'Doppler factors from 0.002 to 500',
      '$10^{-4}$ of the value',
      'a 256th of a texel',
      'up to $\\beta = 0.99999$',
      '$10^{-6}$ of the distance',
      'within $10^{-4}$ beyond the same filter allowance',
      'from a sixth of the disc’s radius to three times it',
      'its flux is kept to within 8 %',
      '90° away from the disc it adds no light at all',
    ])
      expect(en).toContain(claim);
    const tr = verification('tr');
    for (const claim of [
      `${side * side} ışınımda`,
      '0,002 ile 500 arasındaki',
      '$10^{-4}$ katı',
      '256’da biri',
      '$10^{-6}$ katı',
      'yarıçapının altıda birinden üç katına kadar',
      'akı %8 içinde korunur',
    ])
      expect(tr).toContain(claim);
  });

  it('Table 4 quotes the catalogue count that the star tests pin', () => {
    const stars = source('../../scene/geometry/__tests__/stars.test.ts');
    const { limitingMagnitude } = SCENARIO.stars;
    const pinned = new RegExp(`\\[${String(limitingMagnitude).replace('.', '\\.')}, (\\d+)\\]`).exec(stars);
    expect(pinned).not.toBeNull();
    // the share of a hemisphere more than atan(0.07), about 4°, above the horizon, as a whole percentage
    const share = Math.round(100 * (1 - Math.sin(Math.atan(0.07))));
    const row = (language: Language, start: string): string =>
      texts(localize(DOSSIER, language)).find((entry) => entry.text.startsWith(start))?.text ?? '';
    const tr = row('tr', 'istatistiksel olarak üretilmiş gökyüzü');
    const en = row('en', 'statistically generated sky');
    expect(tr).toContain(`${String(limitingMagnitude).replace('.', ',')} kadire kadar ${pinned![1]} kayıt`);
    expect(tr).toContain(`%${share}’ü`);
    expect(en).toContain(`${pinned![1]} entries down to magnitude ${limitingMagnitude}`);
    expect(en).toContain(`${share} % of those`);
    expect(tr).toContain('[@hoffleitwarren1991]');
    expect(en).toContain('[@hoffleitwarren1991]');
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
      // a well-formed BCP 47 tag, written the canonical way
      if (reference.language !== undefined) {
        expect(Intl.getCanonicalLocales(reference.language), reference.key).toEqual([reference.language]);
      }
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

describe.each(LANGUAGES)('references to figures and tables (%s)', (language) => {
  const content = localize(DOSSIER, language);
  const numbering = numberFloats(content);
  const words = MESSAGES[language].dossier;
  const floats = { figure: [...numbering.figure.keys()], table: [...numbering.table.keys()] };

  /** Every prose string with the block it belongs to (null outside the sections). */
  const units: Array<{ block: Block | null; text: string }> = [
    ...content.abstract.map((text) => ({ block: null, text })),
    ...content.glossary.map((entry) => ({ block: null, text: entry.definition })),
    ...content.sections.flatMap((section) => [
      { block: null, text: section.title },
      { block: null, text: section.summary },
      ...section.blocks.flatMap((block) => blockTexts(block).map((text) => ({ block, text }))),
    ]),
  ];

  // "Şekil 3", "Çizelge 3’ün", "Figure 3", "Tables 1 and 2", "Şekil 4–6"
  const reference = new RegExp(
    `(?<!\\p{L})(${words.figure}|${words.table})(?:s|ler|lar)?\\s+(\\d+(?:\\s*(?:,|ve|and|–)\\s*\\d+)*)`,
    'gu'
  );
  const found = units.flatMap(({ block, text }) =>
    [...prose(text).matchAll(reference)].flatMap((match) => {
      const kind = match[1] === words.figure ? ('figure' as const) : ('table' as const);
      const numbers: number[] = [];
      for (const part of match[2].matchAll(/(\d+)(?:\s*–\s*(\d+))?/g)) {
        const from = Number(part[1]);
        const to = part[2] === undefined ? from : Number(part[2]);
        for (let number = from; number <= to; number++) numbers.push(number);
      }
      return numbers.map((number) => ({ kind, number, block, text }));
    })
  );

  it('refers only to figures and captioned tables that exist', () => {
    for (const { kind, number, text } of found) {
      expect(floats[kind][number - 1], `${kind} ${number} does not exist: "${text.slice(0, 80)}"`).toBeDefined();
    }
  });

  it('refers to every figure and every captioned table at least once, outside its own caption', () => {
    for (const kind of ['figure', 'table'] as const) {
      floats[kind].forEach((target, index) => {
        const referred = found.some((entry) => entry.kind === kind && entry.number === index + 1 && entry.block !== target);
        const name =
          target.type === 'figure' ? target.figure : target.type === 'table' ? (target.caption ?? '').slice(0, 50) : '';
        expect(referred, `${kind} ${index + 1} ("${name}") is never referred to`).toBe(true);
      });
    }
  });
});

describe('"show in the scene" buttons', () => {
  const scenarios = localize(DOSSIER, 'en')
    .sections.flatMap((section) => section.blocks)
    .flatMap((block) => (block.type === 'try' ? [block.scenario] : []));

  /** A browser window as far as applyScenario asks about it. */
  const stubWindow = ({ reduceMotion = false, narrow = false } = {}): void => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        // the sheet's own query, which App.tsx uses to make the scene inert: the two must agree
        matches: query.includes('prefers-reduced-motion') ? reduceMotion : query === SHEET_COVERS_QUERY ? narrow : false,
      }),
    });
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    updateSettings(DEFAULT_SETTINGS);
  });

  it('include the states whose leftovers would make the next label false', () => {
    // otherwise the test below would not test what it is for
    expect(scenarios.some((scenario) => scenario.view === 'measured')).toBe(true);
    expect(scenarios.some((scenario) => scenario.thermal === false)).toBe(true);
    expect(scenarios.some((scenario) => scenario.view === undefined && scenario.thermal === undefined)).toBe(true);
  });

  it('are self-contained: each shows its own state whatever was pressed before (every pair, both orders)', () => {
    stubWindow();
    const yaw = { ahead: 0, left: Math.PI / 2, behind: Math.PI, up: 0 } as const;
    for (const before of scenarios) {
      for (const scenario of scenarios) {
        applyScenario(before);
        applyScenario(scenario);
        const settings = getSettings();
        const where = `${JSON.stringify(before)} then ${JSON.stringify(scenario)}`;
        expect(settings.beta, where).toBe(scenario.beta);
        expect(settings.view, where).toBe(scenario.view ?? 'seen');
        expect(settings.thermal, where).toBe(scenario.thermal ?? true);
        expect(settings.lens, where).toBe(scenario.lens ?? 1);
        expect(look.yaw, where).toBe(yaw[scenario.look ?? 'ahead']);
      }
    }
  });

  it('start the motion, except for readers who asked for less of it', () => {
    stubWindow();
    updateSettings({ paused: true });
    applyScenario(scenarios[0]);
    expect(getSettings().paused).toBe(false);

    stubWindow({ reduceMotion: true });
    updateSettings({ paused: true });
    applyScenario(scenarios[0]);
    expect(getSettings().paused).toBe(true);
  });

  it('step the sheet aside only where it covers the scene', () => {
    stubWindow();
    updateSettings({ dossier: 'method' });
    applyScenario(scenarios[0]);
    expect(getSettings().dossier).toBe('method');

    stubWindow({ narrow: true });
    applyScenario(scenarios[0]);
    expect(getSettings().dossier).toBeNull();
  });
});

describe('inline markup', () => {
  const context = { citationNumber: new Map<string, number>(), referenceByKey: REFERENCE_BY_KEY };
  const html = (text: string): string => renderToStaticMarkup(<>{renderInline(text, context)}</>);

  it('sets italics between underscores at word boundaries only', () => {
    expect(html('_Annalen_ der Physik')).toBe('<em>Annalen</em> der Physik');
    expect(html('see (_ibid._), p. 3')).toBe('see (<em>ibid.</em>), p. 3');
    expect(html('MAX_ANGLE and snake_case_name')).toBe('MAX_ANGLE and snake_case_name');
    expect(html('an escaped \\_x_')).toBe('an escaped \\_x_');
  });

  it('keeps the punctuation and the suffix that touch a formula on its line', () => {
    // a formula is set in inline blocks, beside which a line may otherwise break, even after "("
    const glued = (text: string): string => {
      const match = /^<span class="whitespace-nowrap">([\s\S]*)<\/span>([\s\S]*)$/.exec(html(text));
      expect(match, text).not.toBeNull();
      return (match?.[1] ?? '').replace(/<span class="katex">[\s\S]*<\/span>(?=[^<]*$)/, 'MATH') + '|' + (match?.[2] ?? '');
    };
    expect(glued('($\\gamma = 2$), then')).toBe('(MATH),| then');
    expect(glued('$D$’nin değeri')).toBe('MATH’nin| değeri');
    expect(glued('$x$. Next')).toBe('MATH.| Next');
    expect(glued('$x$ and')).toBe('MATH| and');
    expect(html('see ($a$ and $b$)')).toMatch(/^see <span class="whitespace-nowrap">\(<span class="katex">/);
  });

  it('gives the other patterns precedence over an italic that starts in the same place', () => {
    expect(html('**_x_**')).toBe('<strong class="font-semibold text-ink"><em>x</em></strong>');
  });

  it('uses no regular-expression lookbehind in the code that reaches the browser', () => {
    // a lookbehind is a syntax error in Safari before 16.4, and would stop the dossier from loading
    const sources = (directory: string): string[] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sources(join(directory, entry.name));
        return /\.tsx?$/.test(entry.name) ? [join(directory, entry.name)] : [];
      });
    const files = sources(fileURLToPath(new URL('..', import.meta.url)));
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toMatch(/\(\?<[=!]/);
  });
});

describe('accessibility of the rendered document', () => {
  it.each(LANGUAGES)('gives every formula a MathML form that screen readers can read (%s)', (language) => {
    const html = renderToStaticMarkup(<DossierDocument language={language} beta={0.5} />);
    const formulas = html.match(/class="katex"/g)?.length ?? 0;
    expect(formulas).toBeGreaterThan(100);
    expect(html.match(/<math/g)?.length ?? 0).toBe(formulas);
    expect(html.match(/<annotation encoding="application\/x-tex">/g)?.length ?? 0).toBe(formulas);
  });

  it.each(LANGUAGES)('declares the language of every bibliography entry (%s)', (language) => {
    const html = renderToStaticMarkup(<DossierDocument language={language} beta={0} />);
    for (const reference of REFERENCES) {
      const entry = html.indexOf(`id="reference-${reference.key}"`);
      expect(entry, reference.key).toBeGreaterThan(0);
      const declared = /<span lang="([^"]+)">/.exec(html.slice(entry))?.[1];
      expect(declared, reference.key).toBe(reference.language ?? 'en');
    }
  });

  it('lets the headings that the contents list jumps to take the focus', () => {
    const html = renderToStaticMarkup(<DossierDocument language="en" beta={0} />);
    expect(html).toContain('<h2 id="dossier-title" tabindex="-1"');
    for (const section of DOSSIER.sections) expect(html).toContain(`<h3 id="dossier-${section.id}-title" tabindex="-1"`);
    expect(html).toContain('<h3 id="dossier-references-title" tabindex="-1"');
    expect(html).toContain('<h3 id="dossier-glossary-title" tabindex="-1"');
  });

  it('is a dialog that is modal only when the host says it covers the scene', () => {
    expect(renderToStaticMarkup(<Dossier />)).toMatch(/^<div role="dialog" aria-modal="false"/);
    expect(renderToStaticMarkup(<Dossier modal />)).toMatch(/^<div role="dialog" aria-modal="true"/);
  });

  it('exposes the interactive plot as a group holding a slider, not as an image', () => {
    const Lorentz = FIGURES.lorentz;
    const interactive = renderToStaticMarkup(<Lorentz beta={0.5} language="tr" onSelectBeta={() => {}} />);
    expect(interactive).toMatch(/^<svg[^>]* role="group"/);
    expect(interactive).toMatch(/role="slider"[^>]* aria-valuetext="β = 0,5000; γ = 1,155; D₀ = 1,732"/);
    expect(interactive).toContain('touch-action:pan-y');
    expect(interactive).toContain('<g aria-hidden="true">');
    const still = renderToStaticMarkup(<Lorentz beta={0.5} language="tr" />);
    expect(still).toMatch(/^<svg[^>]* role="img"/);
    expect(still).not.toContain('role="slider"');
  });
});
