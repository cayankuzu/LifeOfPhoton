'use client';

/**
 * Real objects on one speed scale. The axis is γ − 1 (kinetic energy per rest
 * energy) on a logarithmic scale of 21 decades, because β itself saturates; a
 * second row of labels translates positions back into β.
 */

import { useMemo } from 'react';
import { formatBeta } from '@/i18n/format';
import { BETA_MAX, clampBeta, kineticEnergyPerRestEnergy, lorentzFactor } from '@/physics/kinematics';
import { SPEED_MARKERS, type SpeedMarker } from '../data/speedScale';
import { type FigureProps, Frame, INK, logScale } from './kit';

const WIDTH = 640;
const HEIGHT = 300;
const AXIS_Y = 132;
const RULER_Y = 250;
const X_MIN = 1e-9;
const X_MAX = 1e12;
const LEFT = 26;
const RIGHT = 614;
/** Advance of one character of the figure font at 10 px, and the padding around a label. */
const CHARACTER = 6.1;
const PADDING = 10;

const LABELS = {
  tr: { aria: 'Gerçek cisimlerin hız ölçeğindeki yerleri', range: 'simülasyon aralığı', axis: 'γ − 1', now: 'geçerli hız' },
  en: { aria: 'Real objects on the speed scale', range: 'simulated range', axis: 'γ − 1', now: 'current speed' },
} as const;

const DECADES = [-9, -6, -3, 0, 3, 6, 9, 12] as const;
const SUPERSCRIPT: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '6': '⁶', '9': '⁹' };
const power = (exponent: number): string =>
  exponent === 0
    ? '1'
    : `10${String(exponent)
        .split('')
        .map((character) => SUPERSCRIPT[character])
        .join('')}`;

/** Velocities shown on the ruler, as (β, γ − 1). */
const BETA_TICKS = [0.001, 0.1, 0.9, 0.99999].map((beta) => ({ beta, excess: kineticEnergyPerRestEnergy(beta) }));

interface Placed {
  readonly marker: SpeedMarker;
  readonly x: number;
  readonly labelX: number;
  readonly text: string;
  readonly above: boolean;
}

/**
 * Lays labels out in one row without overlap: each label goes as close to its
 * marker as its neighbours allow (a forward pass pushes right, a backward pass
 * pulls everything back inside the frame).
 */
function layoutRow(items: Array<{ marker: SpeedMarker; x: number; text: string }>, above: boolean): Placed[] {
  const widths = items.map((item) => item.text.length * CHARACTER + PADDING);
  const centres = items.map((item) => item.x);
  for (let i = 0; i < centres.length; i++) {
    const least = i === 0 ? LEFT + widths[0] / 2 : centres[i - 1] + (widths[i - 1] + widths[i]) / 2;
    centres[i] = Math.max(centres[i], least);
  }
  for (let i = centres.length - 1; i >= 0; i--) {
    const most = i === centres.length - 1 ? RIGHT - widths[i] / 2 : centres[i + 1] - (widths[i + 1] + widths[i]) / 2;
    centres[i] = Math.min(centres[i], most);
  }
  return items.map((item, index) => ({ ...item, labelX: centres[index], above }));
}

export default function SpeedScaleFigure({ beta, language }: FigureProps) {
  const t = LABELS[language];
  const x = useMemo(() => logScale([X_MIN, X_MAX], [LEFT, RIGHT]), []);

  const placed = useMemo(() => {
    const sorted = [...SPEED_MARKERS].sort((a, b) => a.excess - b.excess);
    const rows: [
      Array<{ marker: SpeedMarker; x: number; text: string }>,
      Array<{ marker: SpeedMarker; x: number; text: string }>,
    ] = [[], []];
    sorted.forEach((marker, index) => {
      const text = typeof marker.short === 'string' ? marker.short : marker.short[language];
      rows[index % 2].push({ marker, x: x(marker.excess), text });
    });
    return [...layoutRow(rows[0], true), ...layoutRow(rows[1], false)];
  }, [x, language]);

  const current = kineticEnergyPerRestEnergy(clampBeta(beta));
  const currentX = x(Math.max(current, X_MIN));
  const limitX = x(lorentzFactor(BETA_MAX) - 1);

  return (
    <Frame width={WIDTH} height={HEIGHT} label={t.aria}>
      {/* decade grid, tying the ruler to the axis */}
      {DECADES.map((exponent) => (
        <line key={exponent} x1={x(10 ** exponent)} x2={x(10 ** exponent)} y1={AXIS_Y - 8} y2={RULER_Y} stroke={INK.hairline} />
      ))}

      {/* the range the simulation covers */}
      <rect x={LEFT} y={AXIS_Y - 7} width={limitX - LEFT} height={14} fill={INK.amber} fillOpacity={0.14} />
      <text x={LEFT + 6} y={AXIS_Y + 24} fill={INK.amber}>
        {t.range}
      </text>
      <line x1={LEFT} x2={RIGHT} y1={AXIS_Y} y2={AXIS_Y} stroke={INK.hairlineStrong} />

      {placed.map(({ marker, x: markerX, labelX, text, above }) => {
        const direction = above ? -1 : 1;
        const isLimit = marker.source === null;
        const colour = isLimit ? INK.amber : INK.primary;
        // labels below the axis leave room for the caption of the range band
        const reach = above ? 44 : 56;
        return (
          <g key={marker.id}>
            <line x1={markerX} x2={markerX} y1={AXIS_Y - 5} y2={AXIS_Y + 5} stroke={colour} strokeWidth={1.4} />
            <path
              d={`M${markerX} ${AXIS_Y + direction * 6} L${labelX} ${AXIS_Y + direction * (reach - 12)}`}
              fill="none"
              stroke={isLimit ? INK.amber : INK.tertiary}
              strokeWidth={0.8}
            />
            <text
              x={labelX}
              y={AXIS_Y + direction * reach}
              dy={above ? 0 : '0.7em'}
              textAnchor="middle"
              fill={isLimit ? INK.amber : INK.secondary}
            >
              {marker.bound ? '≥ ' : ''}
              {text}
            </text>
          </g>
        );
      })}

      {/* current speed */}
      <g transform={`translate(${currentX} ${AXIS_Y})`}>
        <path d="M0 -8 l-4.5 -8 h9 z" fill={INK.amber} />
        <title>{t.now}</title>
      </g>

      {/* ruler: γ − 1 in decades, with selected velocities */}
      <line x1={LEFT} x2={RIGHT} y1={RULER_Y} y2={RULER_Y} stroke={INK.hairlineStrong} />
      {DECADES.map((exponent) => (
        <g key={exponent} transform={`translate(${x(10 ** exponent)} ${RULER_Y})`}>
          <line y2={4} stroke={INK.hairlineStrong} />
          <text y={15} textAnchor="middle" fill={INK.tertiary}>
            {power(exponent)}
          </text>
        </g>
      ))}
      <text x={RIGHT} y={RULER_Y + 34} textAnchor="end" fill={INK.secondary}>
        {t.axis}
      </text>
      {BETA_TICKS.map((tick) => (
        <g key={tick.beta} transform={`translate(${x(tick.excess)} ${RULER_Y})`}>
          <line y1={-4} y2={0} stroke={INK.secondary} />
          <text y={-8} textAnchor="middle" fill={INK.secondary}>
            β ={' '}
            {formatBeta(tick.beta, language)
              .replace(/([.,]\d*?)0+$/, '$1')
              .replace(/[.,]$/, '')}
          </text>
        </g>
      ))}
    </Frame>
  );
}
