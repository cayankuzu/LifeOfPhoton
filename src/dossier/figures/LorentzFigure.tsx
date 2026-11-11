'use client';

/**
 * γ, 1/γ, γβ and D₀ against rapidity. Rapidity is the axis on which equal distances
 * are equal boosts, so the four curves are simply cosh φ, 1/cosh φ, sinh φ and e^φ.
 * Clicking or dragging in the plot sets the speed of the simulation; so do the arrow
 * keys, one equal boost per press, and Home / End.
 */

import { type KeyboardEvent, type PointerEvent, useMemo } from 'react';
import { formatBeta, formatSignificant } from '@/i18n/format';
import { BETA_MAX, boostBy, clampBeta, kinematicState } from '@/physics/kinematics';
import { RAPIDITY_STEP } from '@/state/simulation';
import { AxisBottom, AxisLeft, type FigureProps, Frame, INK, LegendItem, curve, linearScale, logScale } from './kit';

const WIDTH = 640;
const HEIGHT = 344;
const PLOT = { left: 52, right: 620, top: 34, bottom: 276 } as const;
const PHI_MAX = 6.2;

const LABELS = {
  tr: { aria: 'Hızlılığa karşı Lorentz çarpanı, saat hızı, öz hız ve ileri Doppler çarpanı', x: 'φ (hızlılık)', slider: 'Hız' },
  en: {
    aria: 'Lorentz factor, clock rate, proper velocity and head-on Doppler factor against rapidity',
    x: 'φ (rapidity)',
    slider: 'Speed',
  },
} as const;

const TOP_BETAS = [0.5, 0.9, 0.99, 0.999, 0.9999, 0.99999] as const;
/** A marked velocity without trailing zeros: 0.5, 0.99, 0.99999. */
const compact = (value: number, language: 'tr' | 'en'): string => String(value).replace('.', language === 'tr' ? ',' : '.');

const DECADES = [1e-3, 1e-2, 1e-1, 1, 10, 100, 1000] as const;
const DECADE_LABEL: Record<number, string> = {
  0.001: '10⁻³',
  0.01: '10⁻²',
  0.1: '10⁻¹',
  1: '1',
  10: '10',
  100: '10²',
  1000: '10³',
};

export default function LorentzFigure({ beta, language, onSelectBeta }: FigureProps) {
  const t = LABELS[language];
  const x = useMemo(() => linearScale([0, PHI_MAX], [PLOT.left, PLOT.right]), []);
  const y = useMemo(() => logScale([1e-3, 1e3], [PLOT.bottom, PLOT.top]), []);

  const paths = useMemo(
    () => ({
      gamma: curve((phi) => Math.cosh(phi), 0, PHI_MAX, 160, x, y),
      rate: curve((phi) => 1 / Math.cosh(phi), 0, PHI_MAX, 160, x, y),
      // sinh φ leaves the plotted range below φ = 10⁻³
      proper: curve((phi) => Math.sinh(phi), 1e-3, PHI_MAX, 220, x, y),
      doppler: curve((phi) => Math.exp(phi), 0, PHI_MAX, 160, x, y),
    }),
    [x, y]
  );

  const state = kinematicState(beta);
  const phi = Math.min(state.rapidity, PHI_MAX);
  const marker = x(phi);

  const select = (event: PointerEvent<SVGRectElement>): void => {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg || !onSelectBeta) return;
    const box = svg.getBoundingClientRect();
    const position = ((event.clientX - box.left) / box.width) * WIDTH;
    onSelectBeta(clampBeta(Math.tanh(Math.max(0, x.invert(position)))));
  };

  // the same equal boost per key as the speed control of the interface
  const onKeyDown = (event: KeyboardEvent<SVGRectElement>): void => {
    if (!onSelectBeta) return;
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? boostBy(state.beta, RAPIDITY_STEP)
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? boostBy(state.beta, -RAPIDITY_STEP)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? BETA_MAX
              : null;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectBeta(clampBeta(next));
  };

  const gamma = formatSignificant(state.gamma, 4, language);
  const doppler = formatSignificant(state.dopplerAhead, 4, language);

  const dots: Array<{ value: number; colour: string }> = [
    { value: state.gamma, colour: INK.cryo },
    { value: state.clockRate, colour: INK.violet },
    { value: state.properVelocity, colour: INK.secondary },
    { value: state.dopplerAhead, colour: INK.amber },
  ];

  const interactive = onSelectBeta !== undefined;

  return (
    <Frame width={WIDTH} height={HEIGHT} label={t.aria} interactive={interactive}>
      {/* the drawing; the control below carries the state for assistive technology */}
      <g aria-hidden="true">
        <AxisLeft
          scale={y}
          at={PLOT.left}
          ticks={DECADES}
          format={(value) => DECADE_LABEL[value] ?? String(value)}
          grid={[PLOT.left, PLOT.right]}
        />
        <AxisBottom scale={x} at={PLOT.bottom} ticks={[0, 1, 2, 3, 4, 5, 6]} title={t.x} />

        {/* β along the top */}
        <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.top} y2={PLOT.top} stroke={INK.hairlineStrong} />
        {TOP_BETAS.map((value) => (
          <g key={value} transform={`translate(${x(Math.atanh(value))} ${PLOT.top})`}>
            <line y2={-4} stroke={INK.hairlineStrong} />
            <text y={-8} textAnchor="middle" fill={INK.tertiary}>
              {compact(value, language)}
            </text>
          </g>
        ))}
        <text x={PLOT.left - 8} y={PLOT.top - 8} textAnchor="end" fill={INK.secondary}>
          β
        </text>

        <path d={paths.proper} fill="none" stroke={INK.secondary} strokeWidth={1.2} strokeDasharray="4 3" />
        <path d={paths.rate} fill="none" stroke={INK.violet} strokeWidth={1.6} />
        <path d={paths.gamma} fill="none" stroke={INK.cryo} strokeWidth={1.6} />
        <path d={paths.doppler} fill="none" stroke={INK.amber} strokeWidth={1.6} />

        {/* current state */}
        <line x1={marker} x2={marker} y1={PLOT.top} y2={PLOT.bottom} stroke={INK.amber} strokeWidth={1} strokeDasharray="2 3" />
        {dots.map((dot, index) =>
          dot.value >= 1e-3 && dot.value <= 1e3 ? (
            <circle key={index} cx={marker} cy={y(dot.value)} r={3} fill={INK.well} stroke={dot.colour} strokeWidth={1.5} />
          ) : null
        )}

        <LegendItem x={PLOT.left} y={HEIGHT - 12} colour={INK.cryo}>
          γ = {gamma}
        </LegendItem>
        <LegendItem x={PLOT.left + 142} y={HEIGHT - 12} colour={INK.violet}>
          1/γ = {formatSignificant(state.clockRate, 4, language)}
        </LegendItem>
        <LegendItem x={PLOT.left + 296} y={HEIGHT - 12} colour={INK.secondary} dashed>
          γβ = {formatSignificant(state.properVelocity, 4, language)}
        </LegendItem>
        <LegendItem x={PLOT.left + 440} y={HEIGHT - 12} colour={INK.amber}>
          D₀ = {doppler}
        </LegendItem>
      </g>

      {/* interaction surface. On touch it lets vertical swipes scroll the document and selects
          only on a sideways drag or on lifting the finger, never where a swipe happens to start. */}
      {interactive && (
        <rect
          x={PLOT.left}
          y={PLOT.top}
          width={PLOT.right - PLOT.left}
          height={PLOT.bottom - PLOT.top}
          fill="transparent"
          style={{ cursor: 'crosshair', touchAction: 'pan-y' }}
          role="slider"
          tabIndex={0}
          aria-label={t.slider}
          aria-valuemin={0}
          aria-valuemax={BETA_MAX}
          aria-valuenow={state.beta}
          aria-valuetext={`β = ${formatBeta(state.beta, language)}; γ = ${gamma}; D₀ = ${doppler}`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            if (event.pointerType !== 'touch') select(event);
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) select(event);
          }}
          onPointerUp={(event) => {
            // a vertical pan ends in pointercancel instead, and selects nothing
            if (event.pointerType === 'touch') select(event);
          }}
          onKeyDown={onKeyDown}
        />
      )}
    </Frame>
  );
}
