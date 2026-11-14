import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MESSAGES } from '@/i18n/messages';
import { EXPLAIN_SECTIONS, EXPLAIN_VARIANTS, type ExplainKey } from '../explain';
import { drawingOf, EXPLAIN_DRAWINGS } from '../drawings';
import { DrawingDisclosure } from '../hud/Drawings';

const KEYS = Object.keys(EXPLAIN_SECTIONS) as ExplainKey[];

describe('the drawings of the panel', () => {
  it('are carried by the items they explain, in every variant, and by no other', () => {
    expect(EXPLAIN_DRAWINGS).toEqual({ crowding: 'rain', shapes: 'delay', measuredWhy: 'delay' });
    for (const variant of EXPLAIN_VARIANTS.crowding) expect(drawingOf(`crowding/${variant}`)).toBe('rain');
    expect(drawingOf('crowding')).toBe('rain');
    expect(drawingOf('shapes')).toBe('delay');
    expect(drawingOf('measuredWhy')).toBe('delay');
    for (const key of KEYS.filter((key) => !(key in EXPLAIN_DRAWINGS))) expect(drawingOf(key), key).toBeNull();
  });

  it.each(['tr', 'en'] as const)('are images with a name and a visible caption, closed at first (%s)', (language) => {
    const t = MESSAGES[language];
    for (const drawing of ['rain', 'delay'] as const) {
      const html = renderToStaticMarkup(<DrawingDisclosure drawing={drawing} id="d" t={t} />);
      const text = t.explain.drawings[drawing];
      expect(html).toContain(`aria-expanded="false"`);
      expect(html).toContain(`aria-controls="d"`);
      expect(html).toMatch(/<figure id="d" hidden=""/);
      expect(html).toContain(`<svg role="img" aria-label="${text.name}"`);
      expect(html).toContain(`>${text.caption}</figcaption>`);
      expect(html).toContain(t.explain.drawings.show);
      // two or three short sentences
      const sentences = text.caption.split(/(?<=[.!?])\s+/);
      expect(sentences.length).toBeGreaterThanOrEqual(2);
      expect(sentences.length).toBeLessThanOrEqual(3);
      for (const sentence of sentences) expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(22);
    }
  });

  it('say what the physics says: the rain is an analogy, light does the same; the delay hides the shortening', () => {
    expect(MESSAGES.tr.explain.drawings.rain.caption).toContain('Işık da aynısını yapar');
    expect(MESSAGES.en.explain.drawings.rain.caption).toContain('Light does the same');
    expect(MESSAGES.tr.explain.drawings.delay.caption).toContain('Bu gecikme kısalmayı saklar.');
    expect(MESSAGES.en.explain.drawings.delay.caption).toContain('The delay hides the shortening.');
  });
});
