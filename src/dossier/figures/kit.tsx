/**
 * Shared building blocks for the dossier's figures.
 *
 * Every figure is a plain SVG drawn with these helpers so that all of them share
 * one visual language: hairline axes, monospace tick labels, the three signal
 * colours of the interface (amber = β, cryo = γ, violet = τ) and nothing else.
 * Figures size themselves through `viewBox`; the renderer decides the width.
 */

import type { ReactNode } from 'react';

/** Colours, taken from the design tokens in globals.css. */
export const INK = {
  primary: 'var(--ink)',
  secondary: 'var(--ink-2)',
  tertiary: 'var(--ink-3)',
  hairline: 'var(--hairline)',
  hairlineStrong: 'var(--hairline-strong)',
  amber: 'var(--amber)',
  cryo: 'var(--cryo)',
  violet: 'var(--violet)',
  alarm: 'var(--alarm)',
  panel: 'var(--panel)',
  well: 'var(--well)',
} as const;

export const FIGURE_FONT = 'var(--font-mono), ui-monospace, monospace';

export interface Scale {
  (value: number): number;
  readonly domain: readonly [number, number];
  readonly range: readonly [number, number];
  /** Inverse mapping, pixel → value. */
  invert(pixel: number): number;
}

/** Linear scale. */
export function linearScale(domain: readonly [number, number], range: readonly [number, number]): Scale {
  const span = domain[1] - domain[0] || 1;
  const scale = ((value: number) => range[0] + ((value - domain[0]) / span) * (range[1] - range[0])) as Scale;
  (scale as { domain: readonly [number, number] }).domain = domain;
  (scale as { range: readonly [number, number] }).range = range;
  scale.invert = (pixel) => domain[0] + ((pixel - range[0]) / (range[1] - range[0] || 1)) * span;
  return scale;
}

/** Logarithmic scale (base 10). Domain values must be positive. */
export function logScale(domain: readonly [number, number], range: readonly [number, number]): Scale {
  const lo = Math.log10(domain[0]);
  const hi = Math.log10(domain[1]);
  const inner = linearScale([lo, hi], range);
  const scale = ((value: number) => inner(Math.log10(Math.max(value, Number.MIN_VALUE)))) as Scale;
  (scale as { domain: readonly [number, number] }).domain = domain;
  (scale as { range: readonly [number, number] }).range = range;
  scale.invert = (pixel) => 10 ** inner.invert(pixel);
  return scale;
}

/** Builds an SVG path through the given points, skipping non-finite ones. */
export function pathThrough(points: ReadonlyArray<readonly [number, number]>): string {
  let d = '';
  let pen = false;
  for (const [x, y] of points) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    pen = true;
  }
  return d;
}

/** Samples a function at `count + 1` evenly spaced points of [from, to] and maps it through the scales. */
export function curve(fn: (x: number) => number, from: number, to: number, count: number, x: Scale, y: Scale): string {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= count; i++) {
    const value = from + ((to - from) * i) / count;
    points.push([x(value), y(fn(value))]);
  }
  return pathThrough(points);
}

interface FrameProps {
  readonly width: number;
  readonly height: number;
  /** Accessible description of what the figure shows. */
  readonly label: string;
  readonly children: ReactNode;
}

/** The outer SVG of a figure. */
export function Frame({ width, height, label, children }: FrameProps) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="block h-auto w-full select-none"
      style={{ fontFamily: FIGURE_FONT, fontSize: 10 }}
    >
      {children}
    </svg>
  );
}

interface AxisProps {
  readonly scale: Scale;
  /** Position of the axis line on the other axis, px. */
  readonly at: number;
  readonly ticks: ReadonlyArray<number>;
  readonly format?: (value: number) => string;
  /** Axis title. */
  readonly title?: string;
  /** Extent of the plot on the other axis, for grid lines; omit for no grid. */
  readonly grid?: readonly [number, number];
}

export function AxisBottom({ scale, at, ticks, format = String, title, grid }: AxisProps) {
  return (
    <g>
      {grid &&
        ticks.map((tick) => (
          <line key={`g${tick}`} x1={scale(tick)} x2={scale(tick)} y1={grid[0]} y2={grid[1]} stroke={INK.hairline} />
        ))}
      <line x1={scale.range[0]} x2={scale.range[1]} y1={at} y2={at} stroke={INK.hairlineStrong} />
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(${scale(tick)} ${at})`}>
          <line y2={4} stroke={INK.hairlineStrong} />
          <text y={15} textAnchor="middle" fill={INK.tertiary}>
            {format(tick)}
          </text>
        </g>
      ))}
      {title && (
        <text x={(scale.range[0] + scale.range[1]) / 2} y={at + 30} textAnchor="middle" fill={INK.secondary}>
          {title}
        </text>
      )}
    </g>
  );
}

export function AxisLeft({ scale, at, ticks, format = String, title, grid }: AxisProps) {
  const middle = (scale.range[0] + scale.range[1]) / 2;
  return (
    <g>
      {grid &&
        ticks.map((tick) => (
          <line key={`g${tick}`} y1={scale(tick)} y2={scale(tick)} x1={grid[0]} x2={grid[1]} stroke={INK.hairline} />
        ))}
      <line y1={scale.range[0]} y2={scale.range[1]} x1={at} x2={at} stroke={INK.hairlineStrong} />
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(${at} ${scale(tick)})`}>
          <line x2={-4} stroke={INK.hairlineStrong} />
          <text x={-7} dy="0.32em" textAnchor="end" fill={INK.tertiary}>
            {format(tick)}
          </text>
        </g>
      ))}
      {title && (
        <text transform={`translate(${at - 40} ${middle}) rotate(-90)`} textAnchor="middle" fill={INK.secondary}>
          {title}
        </text>
      )}
    </g>
  );
}

/** A small legend entry: a line sample and a label. */
export function LegendItem({
  x,
  y,
  colour,
  dashed,
  children,
}: {
  readonly x: number;
  readonly y: number;
  readonly colour: string;
  readonly dashed?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1={0} x2={16} stroke={colour} strokeWidth={1.5} strokeDasharray={dashed ? '3 3' : undefined} />
      <text x={22} dy="0.32em" fill={INK.secondary}>
        {children}
      </text>
    </g>
  );
}

/** Props every figure component receives from the renderer. */
export interface FigureProps {
  /** Velocity the simulation is currently set to, so that figures can mark "you are here". */
  readonly beta: number;
  readonly language: 'tr' | 'en';
  /** Lets a figure drive the simulation (e.g. by clicking a point of a curve). */
  readonly onSelectBeta?: (beta: number) => void;
}
