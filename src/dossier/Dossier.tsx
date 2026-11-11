'use client';

/**
 * The dossier: the scientific account of the simulation, typeset as a paper.
 *
 * A side sheet rather than a modal, so that the scene stays visible and every
 * "show in the scene" button can be tried while reading. Where the sheet covers
 * the whole viewport the host makes the scene inert and declares the sheet modal.
 */

import { type ReactNode, createContext, memo, useContext, useEffect, useMemo, useRef } from 'react';
import { ArrowUpRight, Play, X } from 'lucide-react';
import { MESSAGES } from '@/i18n/messages';
import { type Language, type Settings, look, lookAhead, updateSettings, useSettings } from '@/state/simulation';
import { IconButton } from '@/ui/primitives';
import { DOSSIER } from './content';
import { FIGURES } from './figures';
import { type InlineContext, citationsIn, describeReference, renderInline, renderMath } from './inline';
import { REFERENCES, REFERENCE_BY_KEY } from './references';
import { type Block, type DossierContent, type FigureId, type Scenario, type Section, localize } from './types';

/** All inline strings of a block, for collecting citations in reading order. */
function stringsOf(block: Block): string[] {
  switch (block.type) {
    case 'paragraph':
      return [block.text];
    case 'equation':
      return block.note ? [block.note] : [];
    case 'list':
      return [...block.items];
    case 'callout':
      return [block.text];
    case 'table':
      return [block.caption ?? '', ...block.rows.flat()];
    case 'figure':
      return [block.caption];
    default:
      return [];
  }
}

/** Numbers the references in order of first citation, as a journal would. */
function numberCitations(content: DossierContent): Map<string, number> {
  const numbers = new Map<string, number>();
  const visit = (text: string): void => {
    for (const key of citationsIn(text)) {
      if (!numbers.has(key) && REFERENCE_BY_KEY.has(key)) numbers.set(key, numbers.size + 1);
    }
  };
  content.abstract.forEach(visit);
  for (const section of content.sections) {
    for (const block of section.blocks) stringsOf(block).forEach(visit);
  }
  content.glossary.forEach((entry) => visit(entry.definition));
  return numbers;
}

/** Figures and captioned tables, numbered in document order as a journal would. */
export interface Numbering {
  readonly figure: ReadonlyMap<Block, number>;
  readonly table: ReadonlyMap<Block, number>;
}

export function numberFloats(content: DossierContent): Numbering {
  const figure = new Map<Block, number>();
  const table = new Map<Block, number>();
  for (const section of content.sections) {
    for (const block of section.blocks) {
      if (block.type === 'figure') figure.set(block, figure.size + 1);
      if (block.type === 'table' && block.caption) table.set(block, table.size + 1);
    }
  }
  return { figure, table };
}

/** Whether the reader has asked the system for less motion. */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * What a "show in the scene" button sets. Every button is self-contained: whatever its
 * scenario does not name goes back to the state its text assumes (the seen view, the
 * thermal emission on, no lens), so that the button pressed before cannot make the label
 * false. The motion is restarted only for readers who have not asked for less of it.
 */
export function scenarioSettings(scenario: Scenario, reduceMotion: boolean): Partial<Settings> {
  return {
    beta: scenario.beta,
    view: scenario.view ?? 'seen',
    thermal: scenario.thermal ?? true,
    lens: scenario.lens ?? 1,
    ...(reduceMotion ? {} : { paused: false }),
  };
}

export function applyScenario(scenario: Scenario): void {
  updateSettings(scenarioSettings(scenario, prefersReducedMotion()));
  if (scenario.look === 'left') {
    look.yaw = Math.PI / 2;
    look.pitch = 0;
  } else if (scenario.look === 'behind') {
    look.yaw = Math.PI;
    look.pitch = 0;
  } else if (scenario.look === 'up') {
    look.yaw = 0;
    look.pitch = Math.PI / 3;
  } else {
    lookAhead();
  }
  // on a narrow screen the sheet covers the scene: step aside to show it
  if (window.matchMedia('(max-width: 1023px)').matches) updateSettings({ dossier: null });
}

const TONE = {
  note: 'border-hairline-strong',
  caution: 'border-amber',
  result: 'border-cryo',
} as const;

/**
 * The current speed, for the figures only. The text does not depend on it, so it is passed
 * by context: a change of speed then re-renders the seven figures and not the whole document.
 */
const BetaContext = createContext(0);

const selectBeta = (beta: number): void => updateSettings({ beta });

function FigureView({ figure, language }: { readonly figure: FigureId; readonly language: Language }) {
  const beta = useContext(BetaContext);
  const FigureComponent = FIGURES[figure];
  return <FigureComponent beta={beta} language={language} onSelectBeta={selectBeta} />;
}

function BlockView({
  block,
  context,
  numbering,
  language,
}: {
  readonly block: Block;
  readonly context: InlineContext;
  readonly numbering: Numbering;
  readonly language: Language;
}): ReactNode {
  const t = MESSAGES[language].dossier;
  switch (block.type) {
    case 'paragraph':
      return <p className="my-[0.85em]">{renderInline(block.text, context)}</p>;
    case 'heading':
      return (
        <h4 className="mb-1 mt-7 font-sans text-[15px] font-semibold leading-snug text-ink">
          {renderInline(block.text, context)}
        </h4>
      );
    case 'equation':
      return (
        <div className="my-4">
          <div className="flex items-center gap-3">
            <div
              className="scroll-thin min-w-0 flex-1 overflow-x-auto py-1 text-ink"
              dangerouslySetInnerHTML={{ __html: renderMath(block.tex, true) }}
            />
            {block.number && <span className="tabular shrink-0 font-sans text-[12.5px] text-ink-3">({block.number})</span>}
          </div>
          {block.note && (
            <p className="mt-1 font-sans text-[12.5px] leading-relaxed text-ink-2">{renderInline(block.note, context)}</p>
          )}
        </div>
      );
    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag className={`my-3 space-y-1.5 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-ink-3`}>
          {block.items.map((item, index) => (
            <li key={index} className="pl-1">
              {renderInline(item, context)}
            </li>
          ))}
        </ListTag>
      );
    }
    case 'callout':
      return (
        <aside
          className={`my-5 border-l-2 ${TONE[block.tone]} bg-well px-4 py-3 font-sans text-[13.5px] leading-relaxed text-ink-2`}
        >
          {block.title && <p className="mb-1 font-semibold text-ink">{block.title}</p>}
          <p className="m-0">{renderInline(block.text, context)}</p>
        </aside>
      );
    case 'table':
      return (
        <figure className="my-6">
          {block.caption && (
            <figcaption className="mb-2 font-sans text-[12.5px] leading-relaxed text-ink-2">
              <span className="font-semibold text-ink">
                {t.table} {numbering.table.get(block)}.
              </span>{' '}
              {renderInline(block.caption, context)}
            </figcaption>
          )}
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full border-collapse font-sans text-[12.5px] leading-snug">
              <thead>
                <tr>
                  {block.head.map((cell, index) => (
                    <th
                      key={index}
                      scope="col"
                      className={`border-b border-hairline-strong px-2 py-1.5 font-medium text-ink-2 first:pl-0 last:pr-0 ${
                        block.align?.[index] === 'right'
                          ? 'whitespace-nowrap text-right'
                          : block.align?.[index] === 'center'
                            ? 'text-center'
                            : 'text-left'
                      }`}
                    >
                      {renderInline(cell, context)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, index) => (
                      <td
                        key={index}
                        className={`tabular border-b border-hairline px-2 py-1.5 align-top text-ink-2 first:pl-0 first:text-ink last:pr-0 ${
                          block.align?.[index] === 'right'
                            ? 'whitespace-nowrap text-right'
                            : block.align?.[index] === 'center'
                              ? 'text-center'
                              : 'text-left'
                        }`}
                      >
                        {renderInline(cell, context)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );
    case 'figure': {
      return (
        <figure className="my-6">
          <div className="rounded border border-hairline bg-well p-3">
            <FigureView figure={block.figure} language={language} />
          </div>
          <figcaption className="mt-2 font-sans text-[12.5px] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">
              {t.figure} {numbering.figure.get(block)}.
            </span>{' '}
            {renderInline(block.caption, context)}
          </figcaption>
        </figure>
      );
    }
    case 'try':
      return (
        <p className="my-3">
          <button
            type="button"
            onClick={() => applyScenario(block.scenario)}
            title={t.tryIt}
            className="inline-flex min-h-8 items-center gap-2 rounded-[5px] border border-hairline-strong bg-well px-3 py-1.5 text-left font-sans text-[12.5px] font-medium leading-snug text-ink transition-colors duration-150 hover:border-amber"
          >
            <Play className="h-3 w-3 shrink-0 text-amber" aria-hidden="true" />
            <span>{block.label}</span>
          </button>
        </p>
      );
  }
}

function SectionView({
  section,
  context,
  numbering,
  language,
}: {
  readonly section: Section;
  readonly context: InlineContext;
  readonly numbering: Numbering;
  readonly language: Language;
}) {
  return (
    <section id={`dossier-${section.id}`} aria-labelledby={`dossier-${section.id}-title`} className="scroll-mt-4 pt-10">
      <h3
        id={`dossier-${section.id}-title`}
        tabIndex={-1}
        className="m-0 font-sans text-[20px] font-semibold leading-tight text-ink"
      >
        <span className="tabular mr-3 font-mono text-[13px] font-medium text-amber">{section.number}</span>
        {section.title}
      </h3>
      {section.blocks.map((block, index) => (
        <BlockView key={index} block={block} context={context} numbering={numbering} language={language} />
      ))}
    </section>
  );
}

/**
 * Goes to a part of the document: scrolls it into view and moves the focus to its heading,
 * so that the next Tab and a screen reader's reading position continue from there. The
 * reduced-motion rule of the style sheet governs only scrolling that is not asked to be
 * smooth, so the preference is read here as well.
 */
function jump(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  (target.querySelector<HTMLElement>('h2, h3') ?? target).focus({ preventScroll: true });
}

/**
 * The document itself: a pure function of the language and of the current speed
 * (which the figures mark). Rendered inside the side sheet below, and on its own
 * by the tests.
 */
export function DossierDocument({ language, beta }: { readonly language: Language; readonly beta: number }) {
  return (
    <BetaContext.Provider value={beta}>
      <DocumentBody language={language} />
    </BetaContext.Provider>
  );
}

/** Everything of the document but the speed, which only the figures read (from BetaContext). */
const DocumentBody = memo(function DocumentBody({ language }: { readonly language: Language }) {
  const t = MESSAGES[language];
  const content = useMemo(() => localize(DOSSIER, language), [language]);

  const { context, numbering, cited } = useMemo(() => {
    const citationNumber = numberCitations(content);
    const ordered = REFERENCES.filter((reference) => citationNumber.has(reference.key)).sort(
      (a, b) => (citationNumber.get(a.key) ?? 0) - (citationNumber.get(b.key) ?? 0)
    );
    return {
      context: { citationNumber, referenceByKey: REFERENCE_BY_KEY } satisfies InlineContext,
      numbering: numberFloats(content),
      cited: ordered,
    };
  }, [content]);

  return (
    <article
      id="dossier-top"
      className="mx-auto max-w-[40rem] px-5 pb-24 pt-8 font-serif text-[16px] leading-[1.68] text-ink-2 sm:px-8"
    >
      <h2
        id="dossier-title"
        tabIndex={-1}
        className="m-0 font-sans text-[30px] font-semibold leading-[1.15] tracking-[-0.01em] text-ink"
      >
        {content.title}
      </h2>
      <p className="mt-2 font-sans text-[15px] leading-snug text-ink-2">{content.subtitle}</p>

      <section aria-labelledby="dossier-abstract-title" className="mt-8 border-y border-hairline py-5">
        <h3 id="dossier-abstract-title" className="label m-0">
          {t.dossier.abstract}
        </h3>
        {content.abstract.map((paragraph, index) => (
          <p key={index} className="mb-0 mt-3 text-[15px] leading-[1.65]">
            {renderInline(paragraph, context)}
          </p>
        ))}
        <p className="mb-0 mt-4 font-sans text-[12.5px] leading-relaxed text-ink-3">
          <span className="text-ink-2">{t.dossier.keywords}: </span>
          {content.keywords.join(' · ')}
        </p>
      </section>

      <nav aria-label={t.dossier.contents} className="mt-6">
        <p className="label m-0">{t.dossier.contents}</p>
        <ol className="m-0 mt-2 list-none p-0 font-sans text-[13.5px]">
          {content.sections.map((section) => (
            <li key={section.id} className="border-b border-hairline">
              <button
                type="button"
                onClick={() => jump('dossier-' + section.id)}
                className="group flex w-full items-baseline gap-3 py-2 text-left"
              >
                <span className="tabular w-5 shrink-0 font-mono text-[12px] text-amber">{section.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink group-hover:underline group-hover:underline-offset-2">
                    {section.title}
                  </span>
                  <span className="block text-[12.5px] leading-snug text-ink-3">{section.summary}</span>
                </span>
              </button>
            </li>
          ))}
          {[
            ['dossier-references', t.dossier.references],
            ['dossier-glossary', t.dossier.glossary],
          ].map(([id, label]) => (
            <li key={id} className="border-b border-hairline">
              <button type="button" onClick={() => jump(id)} className="flex w-full items-baseline gap-3 py-2 text-left">
                <span className="w-5 shrink-0" />
                <span className="font-medium text-ink hover:underline hover:underline-offset-2">{label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {content.sections.map((section) => (
        <SectionView key={section.id} section={section} context={context} numbering={numbering} language={language} />
      ))}

      <section id="dossier-references" aria-labelledby="dossier-references-title" className="scroll-mt-4 pt-12">
        <h3 id="dossier-references-title" tabIndex={-1} className="m-0 font-sans text-[20px] font-semibold text-ink">
          {t.dossier.references}
        </h3>
        <ol className="m-0 mt-4 list-none space-y-2.5 p-0 font-sans text-[12.5px] leading-relaxed">
          {cited.map((reference) => (
            <li
              key={reference.key}
              id={'reference-' + reference.key}
              tabIndex={-1}
              className="-mx-2 flex scroll-mt-4 gap-3 rounded px-2 py-0.5 outline-none focus:bg-raised focus:shadow-[inset_2px_0_0_var(--amber)]"
            >
              <span className="tabular w-6 shrink-0 text-right text-ink-3">{context.citationNumber.get(reference.key)}.</span>
              <span className="min-w-0">
                {/* titles keep their own language, so that a screen reader pronounces them by its rules */}
                <span lang={reference.language ?? 'en'}>
                  <span className="text-ink">{reference.authors}</span> ({reference.year}). {reference.title}.{' '}
                  <span className="italic">{reference.venue}</span>.
                </span>{' '}
                {(reference.doi || reference.url) && (
                  <a
                    href={reference.doi ? 'https://doi.org/' + reference.doi : reference.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 break-all text-cryo underline-offset-2 hover:underline"
                    aria-label={describeReference(reference)}
                    lang={reference.language ?? 'en'}
                  >
                    {reference.doi ? 'doi:' + reference.doi : reference.url}
                    <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </a>
                )}
                <span
                  className="ml-1.5 text-ink-3"
                  title={reference.checked === 'primary' ? t.dossier.checkedPrimary : t.dossier.checkedSecondary}
                >
                  {reference.checked === 'primary' ? '●' : '○'}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 font-sans text-[12px] leading-relaxed text-ink-3">
          ● {t.dossier.checkedPrimary} · ○ {t.dossier.checkedSecondary}
        </p>
      </section>

      <section id="dossier-glossary" aria-labelledby="dossier-glossary-title" className="scroll-mt-4 pt-12">
        <h3 id="dossier-glossary-title" tabIndex={-1} className="m-0 font-sans text-[20px] font-semibold text-ink">
          {t.dossier.glossary}
        </h3>
        <dl className="m-0 mt-4 grid grid-cols-[minmax(4.5rem,auto)_1fr] gap-x-4 gap-y-2.5 font-sans text-[13px] leading-relaxed">
          {content.glossary.map((entry) => (
            <div key={entry.term} className="contents">
              <dt className="text-ink">{renderInline(entry.symbol, context)}</dt>
              <dd className="m-0">
                <span className="font-medium text-ink">{entry.term}.</span> {renderInline(entry.definition, context)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-12">
        <button
          type="button"
          onClick={() => jump('dossier-top')}
          className="font-sans text-[12.5px] text-ink-3 underline-offset-2 hover:text-ink hover:underline"
        >
          {t.dossier.backToTop}
        </button>
      </p>
    </article>
  );
});

/**
 * The side sheet that holds the document: opens beside the scene, takes and returns the focus, closes with Escape.
 * `modal` is set by the host while the sheet covers the whole viewport and the scene behind it is inert.
 */
export default function Dossier({ modal = false }: { readonly modal?: boolean }) {
  const language = useSettings((state) => state.language);
  const target = useSettings((state) => state.dossier);
  const beta = useSettings((state) => state.beta);
  const t = MESSAGES[language];
  const scroller = useRef<HTMLDivElement>(null);

  // Take the focus on opening and give it back on closing. The focus goes to the element
  // that scrolls: keyboard scrolling starts at the focused element and looks upwards only.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    scroller.current?.focus({ preventScroll: true });
    return () => previous?.focus();
  }, []);

  // open at the section named in the settings
  useEffect(() => {
    if (!target || target === 'abstract') return;
    document.getElementById('dossier-' + target)?.scrollIntoView({ block: 'start' });
  }, [target]);

  return (
    <div
      role="dialog"
      aria-modal={modal}
      aria-labelledby="dossier-title"
      data-dossier
      className="fixed inset-y-0 right-0 z-20 flex w-full flex-col border-l border-hairline bg-panel shadow-[-24px_0_48px_rgb(0_0_0/0.45)] outline-none lg:w-[min(46rem,52vw)]"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline py-2 pl-5 pr-2">
        <p className="label m-0">{t.dossier.title}</p>
        <IconButton label={t.controls.close} hint="Esc" onClick={() => updateSettings({ dossier: null })}>
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </header>
      <div
        ref={scroller}
        tabIndex={0}
        role="document"
        aria-labelledby="dossier-title"
        className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain outline-offset-[-2px]"
      >
        <DossierDocument language={language} beta={beta} />
      </div>
    </div>
  );
}
