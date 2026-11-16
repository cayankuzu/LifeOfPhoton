/**
 * Where the keyboard focus goes when the part of the interface that holds it goes away.
 *
 * A region that leaves the page (the panel "Why does it look like this?", the card of its tour) or is hidden
 * (the phone's accordion folding) takes a focused element inside it along; the browser then puts the focus on
 * the page itself, and a keyboard or screen-reader user has to find the way back from the top. Whatever made
 * the region go (its own button, a shortcut, a setting changed elsewhere), the focus is handed to the control
 * that brings it back, the one place where the reader would look for it (WCAG 2.4.3, focus order). A focus that
 * was elsewhere stays where it is: only a focus that was lost is moved.
 */

import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';

/** The part of a DOM node the rule needs, so that it can be tested without a document. */
export interface Container {
  contains(other: Node | null): boolean;
}

/**
 * Whether the focus counts as lost once a region has gone: it is on nothing, on the page itself (where the
 * browser puts it when the focused element leaves), or still on an element inside the region (one that was
 * hidden rather than removed; the browser moves it away only at its next rendering step).
 */
export function focusIsLost(active: Element | null, body: Element | null, region: Container | null): boolean {
  if (active === null || active === body) return true;
  return region?.contains(active) ?? false;
}

/**
 * Hands the focus over to the element with the id `targetId` when the region in `region` goes (`present` turns false, or the component
 * unmounts) while the focus is inside it. The decision is taken while the region is still in the page (a layout
 * effect's cleanup runs before React removes the elements); the focus moves once the commit is over, when the
 * target may have just arrived (the button that starts the tour comes back as its card goes). Of several regions
 * that go at once, nested in one another, the outermost one that holds the focus decides: it is handed over first,
 * and the others then find it no longer lost.
 */
export function useFocusHandOver(region: RefObject<HTMLElement | null>, present: boolean, targetId: string): void {
  // whether the focus is inside, followed as it moves: the browser need not report a focus that it moves away
  // from an element being hidden, and the check at the time it goes covers a focus that was never reported
  const inside = useRef(false);

  useEffect(() => {
    const element = region.current;
    if (!element) return;
    const enter = (): void => {
      inside.current = true;
    };
    const leave = (event: FocusEvent): void => {
      if (!(event.relatedTarget instanceof Node && element.contains(event.relatedTarget))) inside.current = false;
    };
    element.addEventListener('focusin', enter);
    element.addEventListener('focusout', leave);
    return () => {
      element.removeEventListener('focusin', enter);
      element.removeEventListener('focusout', leave);
    };
  }, [region]);

  useLayoutEffect(() => {
    if (!present) return;
    const element = region.current;
    return () => {
      const held = inside.current || (element?.contains(document.activeElement) ?? false);
      inside.current = false;
      if (!held) return;
      queueMicrotask(() => {
        if (focusIsLost(document.activeElement, document.body, element)) document.getElementById(targetId)?.focus();
      });
    };
  }, [present, region, targetId]);
}
