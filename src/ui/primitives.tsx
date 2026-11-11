'use client';

/**
 * The few interface primitives everything is built from. They carry the whole
 * visual language: matte panels with hairline borders, one focus treatment, one
 * control height, state shown by weight and a thin amber rule rather than by fills.
 */

import { type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode, forwardRef } from 'react';

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
};

/** Plain control. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, hint, children, ...rest }, ref) {
  return (
    <button ref={ref} type="button" title={hint} className={join(CONTROL, className)} {...rest}>
      {children}
    </button>
  );
});

/** Square control holding a single icon. */
export const IconButton = forwardRef<HTMLButtonElement, ButtonProps & { readonly label: string }>(function IconButton(
  { className, label, hint, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={hint ?? label}
      className={join(CONTROL, 'w-8 px-0 [@media(pointer:coarse)]:w-10', className)}
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
}: {
  readonly pressed: boolean;
  readonly onChange: (next: boolean) => void;
  readonly children: ReactNode;
  readonly hint?: string;
  /** Id of a visible note that explains the switch. */
  readonly describedBy?: string;
  readonly className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-describedby={describedBy}
      title={hint}
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
}: {
  readonly label: string;
  readonly value: T;
  readonly options: ReadonlyArray<{ readonly value: T; readonly label: string; readonly hint?: string }>;
  readonly onChange: (next: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
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
            title={option.hint}
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
