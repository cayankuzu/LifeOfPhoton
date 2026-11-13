'use client';

/**
 * The few interface primitives everything is built from. They carry the whole
 * visual language: matte panels with hairline borders, one focus treatment, one
 * control height, state shown by weight and a thin amber rule rather than by fills.
 */

import { type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode, forwardRef } from 'react';
import { entryProps, type InventoryId } from './inventory';

/**
 * The attributes of an element that has an entry in the inventory (src/ui/inventory.ts): its name and
 * its explanation (aria-describedby; a description of its own, if it has one, is read first), and its
 * key on the keyboard for the tooltip (src/ui/hud/EntryHelp.tsx). Such an element has no native
 * `title`: the tooltip of the interface explains it, and a second one would cover the first.
 */
function entryAttributes(entry: InventoryId | undefined, describedBy?: string, key?: string) {
  if (!entry) return { 'aria-describedby': describedBy };
  const props = entryProps(entry);
  return {
    'data-explain-entry': props['data-explain-entry'],
    'aria-describedby': describedBy ? `${describedBy} ${props['aria-describedby']}` : props['aria-describedby'],
    'data-explain-key': key,
  };
}

function join(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Matte surface with a hairline border. */
export const Panel = forwardRef<HTMLDivElement, { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>>(
  function Panel({ children, className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={join(
          'pointer-events-auto rounded border border-hairline bg-panel shadow-[0_1px_0_rgb(255_255_255/0.03)_inset]',
          className
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

const CONTROL =
  'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[5px] px-2.5 text-[12px] font-medium leading-none ' +
  'text-ink-2 transition-colors duration-150 ease-out hover:bg-white/[0.06] hover:text-ink ' +
  'disabled:pointer-events-none disabled:opacity-40 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:px-3';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Short description used as tooltip and accessible name when the content is an icon. */
  readonly hint?: string;
  /** The entry of the inventory the control stands for; it then has the tooltip of the interface instead of `hint`. */
  readonly entry?: InventoryId;
  /** Its key on the keyboard, shown in that tooltip. */
  readonly explainKey?: string;
};

/** Plain control. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, hint, entry, explainKey, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      title={entry ? undefined : hint}
      className={join(CONTROL, className)}
      {...entryAttributes(entry, undefined, explainKey)}
      {...rest}
    >
      {children}
    </button>
  );
});

/** Square control holding a single icon. */
export const IconButton = forwardRef<HTMLButtonElement, ButtonProps & { readonly label: string }>(function IconButton(
  { className, label, hint, entry, explainKey, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={entry ? undefined : (hint ?? label)}
      className={join(CONTROL, 'w-8 px-0 [@media(pointer:coarse)]:w-10', className)}
      {...entryAttributes(entry, undefined, explainKey)}
      {...rest}
    >
      {children}
    </button>
  );
});

/** Two-state control. On = ink text with a thin amber rule beneath. */
export function Toggle({
  pressed,
  onChange,
  children,
  hint,
  describedBy,
  className,
  id,
  controls,
  entry,
  explainKey,
}: {
  readonly pressed: boolean;
  readonly onChange: (next: boolean) => void;
  readonly children: ReactNode;
  readonly hint?: string;
  /** Id of a visible note that explains the switch. */
  readonly describedBy?: string;
  readonly className?: string;
  readonly id?: string;
  /** Id of the element the switch shows and hides. */
  readonly controls?: string;
  /** The entry of the inventory the switch stands for, and its key (see ButtonProps). */
  readonly entry?: InventoryId;
  readonly explainKey?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      aria-pressed={pressed}
      aria-controls={controls}
      title={entry ? undefined : hint}
      {...entryAttributes(entry, describedBy, explainKey)}
      onClick={() => onChange(!pressed)}
      className={join(CONTROL, 'relative', pressed ? 'text-ink' : 'text-ink-3', className)}
    >
      {children}
      <span
        aria-hidden="true"
        className={join(
          'absolute inset-x-2 bottom-[3px] h-px transition-colors duration-150',
          pressed ? 'bg-amber' : 'bg-transparent'
        )}
      />
    </button>
  );
}

/** Mutually exclusive choice, exposed as a radio group. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  entry,
  explainKey,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: ReadonlyArray<{ readonly value: T; readonly label: string; readonly hint?: string }>;
  readonly onChange: (next: T) => void;
  /** The entry of the inventory the choice stands for, and its key (see ButtonProps); the hints of the options are then lines of its tooltip. */
  readonly entry?: InventoryId;
  readonly explainKey?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      {...entryAttributes(entry, undefined, explainKey)}
      className="inline-flex h-8 items-center rounded-[5px] bg-well p-0.5 [@media(pointer:coarse)]:h-10"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={entry ? undefined : option.hint}
            data-explain-hint={entry ? option.hint : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              // all four arrows move the selection, as in a native radio group; up and down
              // must not fall through to the window, where they would change the speed
              const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
              const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
              if (!forward && !backward) return;
              event.preventDefault();
              const index = options.findIndex((candidate) => candidate.value === value);
              const next = options[(index + (forward ? 1 : options.length - 1)) % options.length];
              onChange(next.value);
              const group = event.currentTarget.parentElement;
              requestAnimationFrame(() => group?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus());
            }}
            className={join(
              'h-full rounded-[4px] px-2.5 text-[12px] font-medium leading-none transition-colors duration-150 ease-out',
              selected ? 'bg-raised text-ink shadow-[0_0_0_1px_var(--hairline-strong)]' : 'text-ink-3 hover:text-ink-2'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Thin vertical rule between groups of controls. */
export function Divider() {
  return <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-hairline" />;
}

/** Keyboard key. */
export function Kbd({ children }: { readonly children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded-[4px] border border-hairline-strong bg-well px-1.5 py-0.5 font-mono text-[11px] leading-none text-ink-2">
      {children}
    </kbd>
  );
}
