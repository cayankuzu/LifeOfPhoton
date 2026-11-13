'use client';

/**
 * The explanation of every element of the interface, reachable from the element itself.
 *
 * Every element that has an entry in the inventory (src/ui/inventory.ts) carries
 * `data-explain-entry` and an `aria-describedby` that points at its explanation here. The
 * explanations are rendered once, by EntryDescriptions, in the markup the server sends and
 * whether or not the panel is open; they follow the language of the visit.
 *
 * EntryTooltip is the one tooltip of the interface. A pointer resting on such an element for
 * TOOLTIP_DELAY_MS, or the keyboard focus on such a control, shows the title and explanation of its
 * entry beside it (src/ui/tooltipPlacement.ts). It goes when the pointer leaves, the focus moves,
 * Escape is pressed or the element is activated. A few listeners on the document serve every
 * element; nothing runs per element or per frame.
 *
 * Attributes the tooltip reads, besides the entry:
 * - `data-explain-handle` inside a large panel (the dock, the panel "Why does it look like this?", the
 *   dossier): the panel answers only there, at its heading and not over the controls in it, so that
 *   reading the panel does not keep bringing up its explanation;
 * - `data-explain-hint` on the element or a part of it: what that part does, in a line of its own
 *   (an option of the view switch, a preset of the speed); it replaces the native `title`, which
 *   would be a second tooltip;
 * - `data-explain-key` on the element: its key on the keyboard, shown as a key cap.
 */

import { type RefObject, useEffect, useRef } from 'react';
import { getSettings } from '@/state/simulation';
import { describedById, INTERFACE_ENTRIES, type InventoryId } from '../inventory';
import { useMessages } from '../hooks';
import { middleOf, placeTooltip } from '../tooltipPlacement';

/** How long the pointer rests on an element, or the focus stays on it, before its tooltip shows, ms. */
export const TOOLTIP_DELAY_MS = 600;

/** Id of the one tooltip element. */
export const TOOLTIP_ID = 'explain-tooltip';

/** Keys that work whether or not the single-character shortcuts are on (src/ui/shortcuts.ts). */
const ALWAYS_ACTIVE_KEY = /^[↑↓←→]/u;

/**
 * The explanations of the elements of the interface, out of sight: the targets of their
 * aria-describedby, and the source of the tooltip's text (the title in `data-title`).
 */
export function EntryDescriptions() {
  const { t } = useMessages();
  return (
    <div hidden data-explain-descriptions="">
      {INTERFACE_ENTRIES.map((id) => (
        <p key={id} id={describedById(id)} data-title={t.inventory.entries[id].title}>
          {t.inventory.entries[id].body}
        </p>
      ))}
    </div>
  );
}

interface Found {
  /** The element that carries the entry. */
  readonly element: Element;
  readonly id: InventoryId;
  /** The line of the part under the pointer or in focus, if it has one. */
  readonly hint: string | null;
}

/** The entry an event target belongs to, if its tooltip may show for it. */
function entryOf(target: EventTarget | null): Found | null {
  if (!(target instanceof Element)) return null;
  const element = target.closest('[data-explain-entry]');
  // a covered layer does not answer
  if (!element || element.closest('[inert]')) return null;
  // a large panel answers at its heading, but not over the controls there, which have names (and titles) of their own
  const handle = element.querySelector('[data-explain-handle]');
  if (handle && (!handle.contains(target) || handle.contains(target.closest('button, a, input')))) return null;
  const hinted = target.closest('[data-explain-hint]');
  return {
    element,
    id: element.getAttribute('data-explain-entry') as InventoryId,
    hint: hinted && element.contains(hinted) ? hinted.getAttribute('data-explain-hint') : null,
  };
}

/**
 * The one tooltip of the interface, kept off the middle of `view` (the box of the scene). Its text
 * comes from EntryDescriptions, so it is always in the language of the page.
 */
export function EntryTooltip({ view }: { readonly view: RefObject<HTMLElement | null> }) {
  const tip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = tip.current;
    if (!box) return;
    const titleLine = box.querySelector<HTMLElement>('[data-part="title"]');
    const keyCap = box.querySelector<HTMLElement>('[data-part="key"]');
    const bodyLine = box.querySelector<HTMLElement>('[data-part="body"]');
    const hintLine = box.querySelector<HTMLElement>('[data-part="hint"]');
    if (!titleLine || !keyCap || !bodyLine || !hintLine) return;

    /** The element shown or about to be, and how it was reached. */
    let current: { found: Found; source: 'pointer' | 'focus' } | null = null;
    let timer = 0;
    let open = false;
    /** An element that was activated or dismissed: its tooltip does not come back until it is left. */
    let quiet: Element | null = null;

    const hide = (): void => {
      window.clearTimeout(timer);
      current = null;
      if (!open) return;
      open = false;
      box.removeAttribute('data-open');
    };

    const show = (found: Found): void => {
      const description = document.getElementById(describedById(found.id));
      if (!description || !found.element.isConnected) return hide();
      titleLine.textContent = description.getAttribute('data-title') ?? '';
      bodyLine.textContent = description.textContent ?? '';
      hintLine.textContent = found.hint ?? '';
      hintLine.hidden = !found.hint;
      const key = found.element.getAttribute('data-explain-key');
      const keyShown = key !== null && (getSettings().singleKeys || ALWAYS_ACTIVE_KEY.test(key));
      keyCap.textContent = keyShown ? key : '';
      keyCap.hidden = !keyShown;
      // measured where it is, out of sight (visibility keeps its layout), then placed
      const anchor = found.element.getBoundingClientRect();
      const stage = view.current?.getBoundingClientRect() ?? {
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
      const place = placeTooltip(
        anchor,
        { width: box.offsetWidth, height: box.offsetHeight },
        { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
        middleOf(stage)
      );
      box.style.left = `${Math.round(place.left)}px`;
      box.style.top = `${Math.round(place.top)}px`;
      box.setAttribute('data-side', place.side);
      box.setAttribute('data-open', '');
      open = true;
    };

    const hintLineText = (): string | null => (hintLine.hidden ? null : hintLine.textContent);
    const schedule = (found: Found, source: 'pointer' | 'focus'): void => {
      window.clearTimeout(timer);
      if (open && current?.found.element === found.element) {
        // another part of the same element (another preset): its line at once
        current = { found, source };
        if (found.hint !== hintLineText()) show(found);
        return;
      }
      if (open) hide();
      current = { found, source };
      timer = window.setTimeout(() => {
        if (current) show(current.found);
      }, TOOLTIP_DELAY_MS);
    };

    const onPointerOver = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return;
      const found = entryOf(event.target);
      if (quiet && found?.element !== quiet) quiet = null;
      if (!found) {
        if (current?.source === 'pointer') hide();
        return;
      }
      if (found.element === quiet) return;
      if (current?.found.element === found.element && current.found.hint === found.hint) return;
      schedule(found, 'pointer');
    };
    const onPointerOut = (event: PointerEvent): void => {
      // out of the window: nothing is under the pointer any more
      if (event.relatedTarget === null && current?.source === 'pointer') hide();
    };
    const onPointerDown = (event: PointerEvent): void => {
      quiet = entryOf(event.target)?.element ?? null;
      hide();
    };
    const onFocusIn = (event: FocusEvent): void => {
      const target = event.target;
      // a click focuses too, but only the keyboard's focus is shown (and explained)
      if (!(target instanceof Element) || !target.matches(':focus-visible')) return;
      const found = entryOf(target);
      // a large panel is not a control: its tooltip is the pointer's only
      if (!found || found.element === quiet || found.element.querySelector('[data-explain-handle]')) {
        if (current?.source === 'focus') hide();
        return;
      }
      quiet = null;
      schedule(found, 'focus');
    };
    const onFocusOut = (event: FocusEvent): void => {
      if (current?.source !== 'focus') return;
      const next = event.relatedTarget;
      if (!(next instanceof Node) || !current.found.element.contains(next)) hide();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        if (!open) return;
        // the tooltip is the top layer: the key closes it and nothing else (a sheet, the dossier)
        event.preventDefault();
        event.stopImmediatePropagation();
        quiet = current?.found.element ?? null;
        hide();
        return;
      }
      // activation from the keyboard
      if (event.key === 'Enter' || event.key === ' ') {
        if (current) quiet = current.found.element;
        hide();
      }
    };
    const onAway = (): void => hide();

    // capture: the tooltip sees a key before the sheets and the shortcuts of the application do
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    // a tooltip placed for one layout is wrong in another
    document.addEventListener('scroll', onAway, { capture: true, passive: true });
    window.addEventListener('resize', onAway);
    window.addEventListener('blur', onAway);
    return () => {
      hide();
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('scroll', onAway, { capture: true });
      window.removeEventListener('resize', onAway);
      window.removeEventListener('blur', onAway);
    };
  }, [view]);

  return (
    // Out of sight but laid out while closed, so that it can be measured before it is placed. The elements
    // name their explanation themselves (aria-describedby); this box only shows it, and takes no pointer.
    <div
      ref={tip}
      id={TOOLTIP_ID}
      role="tooltip"
      className="pointer-events-none invisible fixed left-0 top-0 z-50 w-max max-w-[min(18rem,calc(100vw-16px))] rounded border border-hairline-strong bg-raised px-3 py-2 opacity-0 shadow-[0_8px_24px_rgb(0_0_0/0.45)] data-[open]:visible data-[open]:opacity-100 motion-safe:transition-opacity motion-safe:duration-150 motion-safe:ease-out"
    >
      <p className="m-0 flex items-baseline justify-between gap-3">
        <span data-part="title" className="text-[12px] font-semibold leading-4 text-ink" />
        <kbd
          data-part="key"
          hidden
          className="rounded-[4px] border border-hairline-strong bg-well px-1.5 py-0.5 font-mono text-[10.5px] leading-none text-ink-2"
        />
      </p>
      <p data-part="body" className="m-0 mt-1 text-[12px] leading-[1.45] text-ink-2" />
      <p data-part="hint" hidden className="m-0 mt-1.5 border-t border-hairline pt-1.5 font-mono text-[10.5px] text-ink-3" />
    </div>
  );
}
