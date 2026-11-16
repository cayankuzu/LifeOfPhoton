import { describe, expect, it } from 'vitest';
import { type Container, focusIsLost } from '../focusHandOver';

// Elements stand in as plain objects: the rule compares and asks for containment, nothing more.
const element = (name: string): Element => ({ name }) as unknown as Element;
const body = element('body');
const inside = element('a button of the panel');
const outside = element('the speed slider');
const region: Container = { contains: (other) => other === (inside as unknown as Node) };

describe('where the focus goes when a region of the interface goes', () => {
  it('counts a focus on the page itself, or on nothing, as lost', () => {
    // where the browser puts it when the focused element leaves the page
    expect(focusIsLost(body, body, region)).toBe(true);
    expect(focusIsLost(null, body, region)).toBe(true);
    expect(focusIsLost(body, body, null)).toBe(true);
  });

  it('counts a focus still inside the region as lost: the region was hidden, not removed', () => {
    expect(focusIsLost(inside, body, region)).toBe(true);
  });

  it('leaves a focus that is elsewhere where it is', () => {
    // something else took it in the meantime (an outer region that went at the same time and handed it over first)
    expect(focusIsLost(outside, body, region)).toBe(false);
    expect(focusIsLost(outside, body, null)).toBe(false);
  });
});
