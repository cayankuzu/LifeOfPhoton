'use client';

/**
 * The speed rail: primary read-out and the throttle.
 *
 * The throttle is linear in the square root of rapidity (see kinematics.ts), so the
 * marks 0.5c, γ = 2, 0.99c … sit at even distances. It is a native range input —
 * keyboard, touch and assistive technology work as for any slider — drawn over a
 * hairline ruler whose labels double as presets.
 */

import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { formatBeta, formatFixed, formatGamma, formatInteger } from '@/i18n/format';
import { SPEED_OF_LIGHT } from '@/physics/constants';
import { betaToControl, boostBy, controlToBeta, kinematicState } from '@/physics/kinematics';
import { RAPIDITY_STEP, boostByWheel, telemetry, updateSettings, useSettings } from '@/state/simulation';
import { setText, useFrame, useMessages } from '../hooks';
import { describedById, entryProps, type InventoryId } from '../inventory';
import { IconButton, Panel } from '../primitives';
import { MARKS, fittingLabels } from './speedMarks';
import { useElementWidth, useHudTier } from './tier';

/** Boost applied by the − / + buttons and the arrow keys, in rapidity. */
export const KEY_RAPIDITY_STEP = RAPIDITY_STEP;

/** Position of a velocity along the rail as a CSS percentage, rounded so that server and client markup agree. */
const percent = (beta: number): string => `${(betaToControl(beta) * 100).toFixed(3)}%`;

function Readout({
  entry,
  symbol,
  label,
  unit,
  tone,
  valueRef,
  large,
}: {
  readonly entry: InventoryId;
  readonly symbol: string;
  readonly label: string;
  readonly unit?: string;
  readonly tone: string;
  readonly valueRef: RefObject<HTMLSpanElement | null>;
  readonly large?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1" {...entryProps(entry)}>
      <span className="label">
        <span className="font-serif text-[12px] italic tracking-normal text-ink-2">{symbol}</span>
        <span className="sr-only"> {label}</span>
      </span>
      <span className="flex items-baseline gap-1">
        <span
          ref={valueRef}
          className={`tabular font-mono leading-none ${tone} ${large ? 'text-[24px] font-semibold' : 'text-[15px] font-medium'}`}
        />
        {unit && <span className="font-mono text-[11px] leading-none text-ink-3">{unit}</span>}
      </span>
    </div>
  );
}

export default function SpeedRail() {
  const { language, t } = useMessages();
  const tier = useHudTier();
  const target = useSettings((state) => state.beta);

  const betaRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const gammaRef = useRef<HTMLSpanElement>(null);
  const rateRef = useRef<HTMLSpanElement>(null);
  const dopplerRef = useRef<HTMLSpanElement>(null);
  const actualRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  // the rail changes width with the window and with the tier (which rearranges the panel)
  const [railWidth, setRailWidth] = useState(0);
  useElementWidth(railRef, setRailWidth, tier);
  const labelled = useMemo(() => fittingLabels(railWidth), [railWidth]);

  // the wheel works over the rail as it does over the scene
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    rail.addEventListener('wheel', boostByWheel, { passive: false });
    return () => rail.removeEventListener('wheel', boostByWheel);
  }, []);

  // The read-out follows the velocity the simulation is actually at (it eases towards the target).
  useFrame(() => {
    const k = kinematicState(telemetry.beta);
    setText(betaRef.current, formatBeta(k.beta, language));
    setText(speedRef.current, formatInteger((k.beta * SPEED_OF_LIGHT) / 1000, language));
    setText(gammaRef.current, formatGamma(k.gamma, language));
    setText(rateRef.current, formatFixed(k.clockRate, 4, language));
    setText(dopplerRef.current, formatGamma(k.dopplerAhead, language));
    if (actualRef.current) actualRef.current.style.left = percent(k.beta);
  });

  const position = betaToControl(target);
  const targetState = kinematicState(target);
  const roomy = tier !== 'narrow';

  return (
    <Panel className={tier === 'narrow' ? 'px-3 pb-2 pt-2.5' : 'px-4 pb-2 pt-2.5'}>
      <div className={tier === 'wide' ? 'flex items-end gap-6' : 'flex flex-col gap-3'}>
        {/* primary read-out */}
        <div className={`flex items-end ${roomy ? 'gap-6' : 'gap-4'}`}>
          <Readout entry="beta" symbol="β = v/c" label={t.readout.velocity} tone="text-amber" valueRef={betaRef} large />
          {roomy && (
            <Readout entry="speed" symbol="v" label={t.readout.velocity} unit="km/s" tone="text-ink" valueRef={speedRef} />
          )}
          <Readout entry="gamma" symbol="γ" label={t.readout.lorentz} tone="text-cryo" valueRef={gammaRef} />
          <Readout entry="clockRate" symbol="dτ/dt" label={t.readout.clockRate} tone="text-violet" valueRef={rateRef} />
          {roomy && <Readout entry="doppler" symbol="D₀" label={t.readout.dopplerAhead} tone="text-ink" valueRef={dopplerRef} />}
        </div>

        {/* throttle */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <IconButton
            label={t.speed.slower}
            onClick={() => updateSettings({ beta: boostBy(target, -KEY_RAPIDITY_STEP) })}
            entry="steps"
            explainKey="↑ ↓"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>

          <div ref={railRef} className="relative min-w-0 flex-1 pb-4 pt-0.5">
            {/* ruler */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[14px] h-px bg-rule" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-[14px] h-px bg-amber-dim"
              style={{ width: percent(target) }}
            />
            {MARKS.map((mark) => (
              <span
                key={mark.label}
                aria-hidden="true"
                className="pointer-events-none absolute top-[10px] h-[9px] w-px bg-rule"
                style={{ left: percent(mark.beta) }}
              />
            ))}
            {/* where the simulation actually is while it eases towards the target */}
            <span
              ref={actualRef}
              aria-hidden="true"
              className="pointer-events-none absolute top-[11px] h-[7px] w-[7px] -translate-x-1/2 rotate-45 border border-amber bg-obsidian"
            />

            <input
              type="range"
              className="throttle relative block"
              min={0}
              max={1}
              step={0.001}
              value={Number(position.toFixed(4))}
              aria-label={t.speed.label}
              aria-valuetext={
                target === 0
                  ? t.speed.rest
                  : t.speed.valueText(formatBeta(target, language), formatGamma(targetState.gamma, language))
              }
              {...entryProps('slider')}
              data-explain-hint={t.speed.hint}
              onChange={(event) => updateSettings({ beta: controlToBeta(Number(event.target.value)) })}
              onKeyDown={(event) => {
                // An arrow key is one boost, as everywhere else. The native step of the track would be
                // 6 × 10⁻⁶ c at rest: hundreds of presses to get anywhere, none of them audible.
                const direction =
                  event.key === 'ArrowUp' || event.key === 'ArrowRight'
                    ? 1
                    : event.key === 'ArrowDown' || event.key === 'ArrowLeft'
                      ? -1
                      : 0;
                if (direction === 0 || event.ctrlKey || event.metaKey || event.altKey) return;
                event.preventDefault();
                updateSettings({ beta: boostBy(target, direction * KEY_RAPIDITY_STEP) });
              }}
            />

            {/* The labels of the marks double as presets. Each is 16 px high; an invisible extension reaches down into
                the padding of the panel, so that it is a 24 px target that keeps clear of the slider above it. */}
            <div className="absolute inset-x-0 bottom-0 h-4" {...entryProps('presets')} data-explain-key="0 – 5">
              {MARKS.map((mark, index) => {
                if (!labelled.has(index)) return null;
                const selected = Math.abs(position - betaToControl(mark.beta)) < 0.004;
                const align = index === 0 ? '' : index === MARKS.length - 1 ? '-translate-x-full' : '-translate-x-1/2';
                const hint = t.speed.presetHint(formatBeta(mark.beta, language));
                return (
                  <button
                    key={mark.label}
                    type="button"
                    onClick={() => updateSettings({ beta: mark.beta })}
                    aria-label={hint}
                    aria-describedby={describedById('presets')}
                    data-explain-hint={hint}
                    aria-pressed={selected}
                    className={`pointer-events-auto absolute top-0 ${align} tabular whitespace-nowrap rounded-[3px] px-1 font-mono text-[10.5px] leading-4 transition-colors duration-150 before:absolute before:left-1/2 before:top-0 before:h-6 before:w-full before:min-w-6 before:-translate-x-1/2 before:content-[''] ${
                      selected ? 'text-amber' : 'text-ink-3 hover:text-ink'
                    }`}
                    style={{ left: percent(mark.beta) }}
                  >
                    {language === 'tr' ? mark.label.replace('.', ',') : mark.label}
                  </button>
                );
              })}
            </div>
          </div>

          <IconButton
            label={t.speed.faster}
            onClick={() => updateSettings({ beta: boostBy(target, KEY_RAPIDITY_STEP) })}
            entry="steps"
            explainKey="↑ ↓"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </Panel>
  );
}
