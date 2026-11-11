import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../App';

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

  it('offers no way to skip to controls that cannot be reached', () => {
    expect(html).not.toContain('href="#controls"');
  });
});
