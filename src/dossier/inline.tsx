'use client';

/**
 * Renders the dossier's inline markup (see types.ts):
 *   $…$ mathematics · **bold** · _italic_ · [@key; @key] citations · [text](url) links
 */

import katex from 'katex';
import { Fragment, type ReactNode } from 'react';
import type { Reference } from './types';

export interface InlineContext {
  /** Number assigned to each cited reference, in order of first appearance. */
  readonly citationNumber: ReadonlyMap<string, number>;
  readonly referenceByKey: ReadonlyMap<string, Reference>;
}

const mathCache = new Map<string, string>();

/**
 * TeX → HTML. KaTeX output is generated from our own strings and contains no user input.
 * KaTeX's default output is kept: the visible HTML is hidden from assistive technology and
 * a MathML copy (clipped by katex.min.css) is what screen readers read. HTML alone would
 * leave every formula of the text out of what they announce.
 */
export function renderMath(tex: string, display: boolean): string {
  const key = `${display ? 'D' : 'I'}${tex}`;
  let html = mathCache.get(key);
  if (html === undefined) {
    html = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' });
    mathCache.set(key, html);
  }
  return html;
}

/** One-line plain-text form of a reference, for tooltips and screen readers. */
export function describeReference(reference: Reference): string {
  return `${reference.authors} (${reference.year}). ${reference.title}. ${reference.venue}.`;
}

interface Token {
  readonly index: number;
  readonly length: number;
  readonly node: (key: string) => ReactNode;
}

const PATTERNS: ReadonlyArray<{
  readonly regex: RegExp;
  readonly build: (match: RegExpExecArray, context: InlineContext) => (key: string) => ReactNode;
}> = [
  {
    // KaTeX sets a formula in inline blocks, and a line may break on either side of an inline block,
    // even after an opening parenthesis: "(" ended one line and "γ = 223.6)" began the next. The
    // punctuation that touches a formula, and a Turkish suffix after an apostrophe ("$D$’nin"), are
    // therefore kept on its line. They are punctuation and letters only, which need no escaping.
    regex: /([([“‘«]*)\$([^$]+)\$((?:[’'][\p{L}]+)?[)\]”’».,;:!?]*)/u,
    build: (match) => (key) => (
      <span
        key={key}
        className="whitespace-nowrap"
        dangerouslySetInnerHTML={{ __html: match[1] + renderMath(match[2], false) + match[3] }}
      />
    ),
  },
  {
    regex: /\[@([^\]]+)\]/,
    build: (match, context) => (key) => {
      const keys = match[1].split(';').map((part) => part.trim().replace(/^@/, ''));
      return (
        <span key={key} className="whitespace-nowrap font-sans text-[0.8em] text-ink-2">
          [
          {keys.map((citation, index) => {
            const reference = context.referenceByKey.get(citation);
            const number = context.citationNumber.get(citation);
            return (
              <Fragment key={citation}>
                {index > 0 && ', '}
                {reference && number !== undefined ? (
                  <a
                    href={`#reference-${citation}`}
                    title={describeReference(reference)}
                    className="tabular text-cryo underline-offset-2 hover:underline"
                    onClick={(event) => {
                      // go to the entry without changing the address bar, which holds the state of the experiment
                      event.preventDefault();
                      const entry = document.getElementById(`reference-${citation}`);
                      entry?.scrollIntoView({ block: 'center' });
                      entry?.focus({ preventScroll: true });
                    }}
                  >
                    {number}
                  </a>
                ) : (
                  <span className="text-alarm">?{citation}</span>
                )}
              </Fragment>
            );
          })}
          ]
        </span>
      );
    },
  },
  {
    regex: /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/,
    build: (match, context) => (key) => (
      <a key={key} href={match[2]} target="_blank" rel="noreferrer" className="text-cryo underline underline-offset-2">
        {renderInline(match[1], context)}
      </a>
    ),
  },
  {
    regex: /\*\*([^*]+)\*\*/,
    build: (match, context) => (key) => (
      <strong key={key} className="font-semibold text-ink">
        {renderInline(match[1], context)}
      </strong>
    ),
  },
  {
    // Underscores delimit italics only at word boundaries, so identifiers stay intact. The
    // character before the underscore is matched and put back rather than looked behind at:
    // a lookbehind is a syntax error in Safari before 16.4 and would stop the whole chunk
    // from loading. Ties go to the earlier patterns, so the extra character changes no token.
    regex: /(^|[^\w\\])_([^_\n]+)_(?!\w)/,
    build: (match, context) => (key) => (
      <Fragment key={key}>
        {match[1]}
        <em>{renderInline(match[2], context)}</em>
      </Fragment>
    ),
  },
];

export function renderInline(text: string, context: InlineContext): ReactNode {
  const nodes: ReactNode[] = [];
  let rest = text;
  let counter = 0;
  while (rest.length > 0) {
    let earliest: Token | null = null;
    for (const pattern of PATTERNS) {
      const match = pattern.regex.exec(rest);
      if (match && (earliest === null || match.index < earliest.index)) {
        earliest = { index: match.index, length: match[0].length, node: pattern.build(match, context) };
      }
    }
    if (!earliest) {
      nodes.push(rest);
      break;
    }
    if (earliest.index > 0) nodes.push(rest.slice(0, earliest.index));
    nodes.push(earliest.node(`i${counter++}`));
    rest = rest.slice(earliest.index + earliest.length);
  }
  return nodes.length === 1 ? nodes[0] : nodes;
}

/** Every citation key used in a string, in order. */
export function citationsIn(text: string): string[] {
  const keys: string[] = [];
  const regex = /\[@([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    for (const part of match[1].split(';')) keys.push(part.trim().replace(/^@/, ''));
  }
  return keys;
}
