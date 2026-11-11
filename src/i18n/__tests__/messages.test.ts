import { describe, expect, it } from 'vitest';
import { LENSES, type Language, RAPIDITY_STEP } from '@/state/simulation';
import { formatFixed } from '../format';
import { MESSAGES, type Messages } from '../messages';

const LANGUAGES: readonly Language[] = ['tr', 'en'];

type Leaf =
  | { readonly path: string; readonly kind: 'string'; readonly text: string }
  | { readonly path: string; readonly kind: 'function' }
  | { readonly path: string; readonly kind: 'other' };

/** Every leaf of a dictionary with its dotted path; arrays count as objects whose keys are the indices. */
function leaves(node: unknown, path = ''): Leaf[] {
  if (typeof node === 'string') return [{ path, kind: 'string', text: node }];
  if (typeof node === 'function') return [{ path, kind: 'function' }];
  if (typeof node !== 'object' || node === null) return [{ path, kind: 'other' }];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, child]) =>
    leaves(child, path === '' ? key : `${path}.${key}`)
  );
}

/**
 * One representative call of every function leaf, with the fragments its result has
 * to contain: each argument, next to its symbol or unit where the sentence has one.
 * The arguments are what the instruments pass: values that are already formatted.
 */
type Call = readonly [call: (messages: Messages) => string, contains: readonly string[]];
const CALLS = new Map<string, Call>([
  ['controls.lensValue', [(m) => m.controls.lensValue(10), ['10']]],
  ['speed.valueText', [(m) => m.speed.valueText('0.9900', '7.089'), ['β = 0.9900', 'γ = 7.089']]],
  ['speed.presetHint', [(m) => m.speed.presetHint('0.5000'), ['0.5000 c']]],
  ['regime.slow', [(m) => m.regime.slow('84.3°'), ['84.3°']]],
  ['regime.moderate', [(m) => m.regime.moderate('60.0°', '1.73'), ['60.0°', 'D₀ = 1.73']]],
  ['regime.fast', [(m) => m.regime.fast('8.11°', '4063'), ['8.11°', '4063 K']]],
  ['regime.extreme', [(m) => m.regime.extreme('9.61°', '0.810°'), ['9.61°', '0.810°']]],
  ['regime.limit', [(m) => m.regime.limit('0.256°', '223.6'), ['0.256°', 'γ = 223.6']]],
  ['regime.measured', [(m) => m.regime.measured('44.7 cm'), ['44.7 cm']]],
]);

/** All the text a dictionary can produce: its strings and the result of each representative call. */
function texts(messages: Messages): Array<{ readonly path: string; readonly text: string }> {
  return leaves(messages).flatMap((leaf) => {
    if (leaf.kind === 'string') return [{ path: leaf.path, text: leaf.text }];
    const call = CALLS.get(leaf.path)?.[0];
    return call ? [{ path: leaf.path, text: call(messages) }] : [];
  });
}

/** The symbols of a text (Greek letters, subscripts, prime, degree sign), in a fixed order. */
const symbolsOf = (text: string): string => (text.match(/[\p{Script=Greek}₀-₉′°]/gu) ?? []).sort().join('');

/** The numbers of a text, with the decimal comma of Turkish read as a point. */
const numbersOf = (text: string): string[] => (text.replace(/(\d),(\d)/g, '$1.$2').match(/\d+(?:\.\d+)?/g) ?? []).sort();

describe('the two dictionaries', () => {
  it('have exactly the same shape: the same keys at every depth and the same kind of leaf', () => {
    const shape = (language: Language): string[] =>
      leaves(MESSAGES[language])
        .map((leaf) => `${leaf.path}: ${leaf.kind}`)
        .sort();
    expect(shape('tr')).toEqual(shape('en'));
    // the walk does reach nested objects, the rows of the help tables and the functions
    expect(shape('en')).toContain('view.modes.measured.hint: string');
    expect(shape('en')).toContain('help.rows.0.1: string');
    expect(shape('en')).toContain('speed.valueText: function');
  });

  it('hold nothing but text and functions that produce text', () => {
    for (const language of LANGUAGES) {
      expect(leaves(MESSAGES[language]).filter((leaf) => leaf.kind === 'other')).toEqual([]);
    }
  });

  it('have a representative call for every function leaf', () => {
    // without this, a new function would escape every check below that goes through texts()
    for (const language of LANGUAGES) {
      const functions = leaves(MESSAGES[language])
        .filter((leaf) => leaf.kind === 'function')
        .map((leaf) => leaf.path);
      expect(functions.sort()).toEqual([...CALLS.keys()].sort());
    }
  });

  it('never translate a symbol or change a number', () => {
    const turkish = texts(MESSAGES.tr);
    const english = new Map(texts(MESSAGES.en).map(({ path, text }) => [path, text]));
    for (const { path, text } of turkish) {
      const other = english.get(path) ?? '';
      // β, γ, τ, D₀, θ′ … are the same in every language
      expect(symbolsOf(text), path).toBe(symbolsOf(other));
      // 288 K, 555 nm, 100 m, Δφ = 0.045: whatever is quantified is quantified alike
      expect(numbersOf(text), path).toEqual(numbersOf(other));
    }
  });

  it('give every text the same typographic role: a label or a note, a sentence or not', () => {
    const turkish = texts(MESSAGES.tr);
    const english = new Map(texts(MESSAGES.en).map(({ path, text }) => [path, text]));
    /** How a text begins: with a capital, with a small letter, or with neither (a digit, a symbol). */
    const opening = (text: string): 'capital' | 'small' | 'neither' =>
      /^\p{Lu}/u.test(text) ? 'capital' : /^\p{Ll}/u.test(text) ? 'small' : 'neither';
    for (const { path, text } of turkish) {
      const other = english.get(path) ?? '';
      const context = `${path}: "${text}" / "${other}"`;
      // labels are capitalised and notes are not; a text may open with a number in one language only
      if (opening(text) !== 'neither' && opening(other) !== 'neither') {
        expect(opening(text), context).toBe(opening(other));
      }
      expect(text.endsWith('.'), context).toBe(other.endsWith('.'));
    }
  });

  it('name each language in that language, whichever dictionary is active', () => {
    // a reader who has landed in the wrong language must still recognise their own
    for (const language of LANGUAGES) {
      expect(MESSAGES[language].controls.languageName).toEqual({ tr: 'Türkçe', en: 'English' });
    }
  });

  it('write Turkish with its own letters (spot checks)', () => {
    const { tr, en } = MESSAGES;
    const turkishLetter = /[çğıöşüÇĞİÖŞÜ]/;
    // labels whose Turkish spelling needs one of these letters: an ASCII transliteration would be a typo
    const spots: Array<[turkish: string, english: string]> = [
      [tr.view.group, en.view.group],
      [tr.view.modes.measured.label, en.view.modes.measured.label],
      [tr.controls.thermal, en.controls.thermal],
      [tr.controls.guides, en.controls.guides],
      [tr.readout.velocity, en.readout.velocity],
      [tr.dock.title, en.dock.title],
      [tr.bands.green, en.bands.green],
      [tr.loading.models, en.loading.models],
      [tr.dossier.references, en.dossier.references],
    ];
    for (const [turkish, english] of spots) {
      expect(turkish).not.toBe(english);
      expect(turkish).toMatch(turkishLetter);
      expect(english).not.toMatch(turkishLetter);
    }
    // the dotted capital İ is a letter of its own: "İleri" is not spelt "Ileri"
    expect(tr.controls.lookAhead.startsWith('İ')).toBe(true);
    expect(tr.dossier.contents.startsWith('İ')).toBe(true);
    // taken as a whole, Turkish uses all of its letters and English none of those that occur in no English name
    const all = (messages: Messages): string =>
      texts(messages)
        .map(({ text }) => text)
        .join(' ');
    for (const letter of 'çğıöşüİ') expect(all(tr), letter).toContain(letter);
    expect(all(en)).not.toMatch(/[ğışİ]/);
  });
});

describe.each(LANGUAGES)('dictionary (%s)', (language) => {
  const messages = MESSAGES[language];
  const all = texts(messages);

  it('has no empty, padded or doubly spaced text', () => {
    for (const { path, text } of all) {
      expect(text.length, path).toBeGreaterThan(0);
      expect(text, path).toBe(text.trim());
      // a double space, a tab or a line break would be collapsed or shown, depending on where the text lands
      expect(text, path).not.toMatch(/\s{2}|[\t\n\r]/);
    }
  });

  it('contains no emoji', () => {
    for (const { path, text } of all) expect(text, path).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('builds every sentence from all of its arguments', () => {
    for (const [path, [call, contains]] of CALLS) {
      const text = call(messages);
      for (const fragment of contains) expect(text, path).toContain(fragment);
    }
  });

  it('writes decimals the way the language does', () => {
    const foreign = language === 'tr' ? /\d\.\d/ : /\d,\d/;
    for (const leaf of leaves(messages)) {
      if (leaf.kind === 'string') expect(leaf.text, leaf.path).not.toMatch(foreign);
    }
  });

  it('names every lens of the simulation, also in the list of shortcuts', () => {
    const lensRow = messages.help.rows.find(([keys]) => keys === 'L');
    expect(lensRow).toBeDefined();
    const names = LENSES.map((lens) => messages.controls.lensValue(lens));
    expect(new Set(names).size).toBe(LENSES.length);
    LENSES.forEach((lens, index) => {
      expect(names[index]).toContain(String(lens));
      expect(lensRow?.[1]).toContain(names[index]);
    });
  });

  it('states the boost of one step as the simulation applies it', () => {
    // both languages would be wrong alike if the constant changed: the parity check above cannot see that
    const step = `Δφ = ${formatFixed(RAPIDITY_STEP, 3, language)}`;
    expect(messages.speed.hint).toContain(step);
    expect(messages.help.rows[0][1]).toContain(step);
  });

  it('lists the keys that keep working without the single-key shortcuts', () => {
    // the note under the switch names them; the sheet must say what they do
    const triggers = messages.help.rows.map(([trigger]) => trigger).join(' ');
    for (const key of ['Home', 'Esc']) {
      expect(messages.help.singleKeysNote).toContain(key);
      expect(triggers).toContain(key);
    }
  });

  it('lists no shortcut and no gesture twice', () => {
    for (const table of [messages.help.rows, messages.help.pointer]) {
      const triggers = table.map(([trigger]) => trigger);
      expect(new Set(triggers).size).toBe(triggers.length);
    }
  });
});
