/**
 * Content model of the dossier ("Bilimsel analiz").
 *
 * The dossier is data. Its STRUCTURE — sections, equations, figures, tables,
 * "show in the scene" buttons — is written once; only the prose exists twice, as
 * `{ tr, en }` pairs sitting next to each other. The two languages therefore
 * cannot drift apart structurally, and a missing translation is a type error.
 *
 * Inline markup understood inside text:
 *   $...$            inline mathematics (KaTeX)
 *   **bold**         emphasis
 *   _italic_         titles, foreign words, first use of a term
 *   [@key]           citation; `key` must exist in references.ts. Several: [@a; @b]
 *   [text](url)      external link
 */

import type { Language, Lens, ViewMode } from '@/state/simulation';

/** One string per language. */
export interface Bilingual {
  readonly tr: string;
  readonly en: string;
}

/** Text of the dossier: a pair, or a single string where the languages do not differ (symbols, numbers in TeX). */
export type Text = Bilingual | string;

/** Authoring helper: Turkish first, English second. */
export function L(tr: string, en: string): Bilingual {
  return { tr, en };
}

/** Interactive figures available to the content; each is a component in ./figures. */
export type FigureId = 'lorentz' | 'aberration' | 'spectra' | 'gain' | 'colourTracks' | 'speedScale' | 'pipeline';

/** A state of the simulation that a "show in the scene" button jumps to. */
export interface Scenario {
  readonly beta: number;
  readonly view?: ViewMode;
  readonly thermal?: boolean;
  readonly lens?: Lens;
  /** Where to look, relative to the direction of motion. */
  readonly look?: 'ahead' | 'left' | 'behind' | 'up';
}

export type BlockOf<T> =
  | { readonly type: 'paragraph'; readonly text: T }
  | { readonly type: 'heading'; readonly text: T }
  | {
      /** Display equation. `number` is the label shown at the right, e.g. "3.2". */
      readonly type: 'equation';
      readonly tex: string;
      readonly number?: string;
      readonly note?: T;
    }
  | { readonly type: 'list'; readonly ordered?: boolean; readonly items: readonly T[] }
  | {
      /** note = context, caution = limit of validity, result = a finding of this work. */
      readonly type: 'callout';
      readonly tone: 'note' | 'caution' | 'result';
      readonly title?: T;
      readonly text: T;
    }
  | {
      readonly type: 'table';
      readonly caption?: T;
      readonly head: readonly T[];
      readonly rows: ReadonlyArray<readonly T[]>;
      /** Column alignment; numbers are right-aligned. */
      readonly align?: ReadonlyArray<'left' | 'right' | 'center'>;
    }
  | { readonly type: 'figure'; readonly figure: FigureId; readonly caption: T }
  | { readonly type: 'try'; readonly label: T; readonly scenario: Scenario };

export interface SectionOf<T> {
  /** Stable identifier, used for navigation and cross-references. */
  readonly id: string;
  /** Section number as displayed, e.g. "3". */
  readonly number: string;
  readonly title: T;
  /** One sentence shown in the table of contents. */
  readonly summary: T;
  readonly blocks: ReadonlyArray<BlockOf<T>>;
}

export interface GlossaryEntryOf<T> {
  readonly symbol: string;
  readonly term: T;
  readonly definition: T;
}

export interface DossierOf<T> {
  readonly title: T;
  readonly subtitle: T;
  /** Paragraphs of the abstract. */
  readonly abstract: readonly T[];
  readonly keywords: readonly T[];
  readonly sections: ReadonlyArray<SectionOf<T>>;
  readonly glossary: ReadonlyArray<GlossaryEntryOf<T>>;
}

/** The dossier as authored (both languages). */
export type SourceBlock = BlockOf<Text>;
export type SourceSection = SectionOf<Text>;
export type DossierSource = DossierOf<Text>;

/** The dossier as rendered (one language). */
export type Block = BlockOf<string>;
export type Section = SectionOf<string>;
export type GlossaryEntry = GlossaryEntryOf<string>;
export type DossierContent = DossierOf<string>;

function pick(text: Text, language: Language): string {
  return typeof text === 'string' ? text : text[language];
}

function localizeBlock(block: SourceBlock, language: Language): Block {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      return { ...block, text: pick(block.text, language) };
    case 'equation':
      return { ...block, note: block.note === undefined ? undefined : pick(block.note, language) };
    case 'list':
      return { ...block, items: block.items.map((item) => pick(item, language)) };
    case 'callout':
      return {
        ...block,
        title: block.title === undefined ? undefined : pick(block.title, language),
        text: pick(block.text, language),
      };
    case 'table':
      return {
        ...block,
        caption: block.caption === undefined ? undefined : pick(block.caption, language),
        head: block.head.map((cell) => pick(cell, language)),
        rows: block.rows.map((row) => row.map((cell) => pick(cell, language))),
      };
    case 'figure':
      return { ...block, caption: pick(block.caption, language) };
    case 'try':
      return { ...block, label: pick(block.label, language) };
  }
}

/** Resolves the authored dossier into one language. */
export function localize(source: DossierSource, language: Language): DossierContent {
  return {
    title: pick(source.title, language),
    subtitle: pick(source.subtitle, language),
    abstract: source.abstract.map((paragraph) => pick(paragraph, language)),
    keywords: source.keywords.map((keyword) => pick(keyword, language)),
    sections: source.sections.map((section) => ({
      id: section.id,
      number: section.number,
      title: pick(section.title, language),
      summary: pick(section.summary, language),
      blocks: section.blocks.map((block) => localizeBlock(block, language)),
    })),
    glossary: source.glossary.map((entry) => ({
      symbol: entry.symbol,
      term: pick(entry.term, language),
      definition: pick(entry.definition, language),
    })),
  };
}

/** One entry of the bibliography, the same in both languages of the dossier. */
export interface Reference {
  /** Citation key, e.g. "terrell1959". */
  readonly key: string;
  /** "Surname, I.; Surname, I." */
  readonly authors: string;
  readonly year: string;
  readonly title: string;
  /** Journal, book or proceedings, with volume and pages. */
  readonly venue: string;
  readonly doi?: string;
  readonly url?: string;
  /**
   * Language of the authors, title and venue as a BCP 47 tag; 'en' when absent. Rendered
   * as `lang` on the entry, so that a screen reader pronounces a German title as German
   * inside a Turkish or English document.
   */
  readonly language?: string;
  /**
   * How far the citation was checked while this dossier was written:
   *   'primary'   the source itself (or at least its abstract) was read and supports the claim it is cited for
   *   'secondary' bibliographic data verified; the claim rests on works that cite it, or on standard knowledge
   */
  readonly checked: 'primary' | 'secondary';
}
