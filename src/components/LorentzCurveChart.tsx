'use client';

import React, { useRef } from 'react';
import { computeGamma, formatBeta, formatGamma, MAX_BETA } from '@/lib/relativity';

interface LorentzCurveChartProps {
  beta: number;
  onSelectBeta: (newBeta: number) => void;
  title: string;
  subtitle: string;
}

export default function LorentzCurveChart({
  beta,
  onSelectBeta,
  title,
  subtitle,
}: LorentzCurveChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const width = 340;
  const height = 135;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 24;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Map gamma in [1, 80] onto vertical axis using compressed log-like scale so both low-beta and asymptotic blowup are clear
  const gammaToY = (g: number) => {
    const capped = Math.min(85, Math.max(1, g));
    const norm = Math.log(capped) / Math.log(85);
    return padTop + plotH * (1 - norm);
  };

  const betaToX = (b: number) => {
    return padLeft + Math.min(1, Math.max(0, b)) * plotW;
  };

  // Generate SVG path for gamma(beta)
  const points: string[] = [];
  const contractionPoints: string[] = [];
  const samples = 90;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    // Denser sampling near beta -> 1
    const b = t < 0.75 ? (t / 0.75) * 0.9 : 0.9 + ((t - 0.75) / 0.25) * 0.0999;
    const g = computeGamma(b);
    const x = betaToX(b);
    const y = gammaToY(g);
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);

    // Contraction ratio L/L0 = 1/gamma mapped from bottom (0) to top (1)
    const cy = padTop + plotH * (1 - 1 / g);
    contractionPoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${cy.toFixed(1)}`);
  }

  const gammaPath = points.join(' ');
  const contractionPath = contractionPoints.join(' ');

  const currentGamma = computeGamma(beta);
  const cx = betaToX(beta);
  const cy = gammaToY(currentGamma);

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const rawBeta = (relX - padLeft) / plotW;
    const clampedBeta = Math.max(0, Math.min(MAX_BETA, rawBeta));
    onSelectBeta(clampedBeta);
  };

  const thresholds = [
    { b: 0.5, label: '0.5c' },
    { b: 0.866, label: '0.866c' },
    { b: 0.99, label: '0.99c' },
  ];

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-950/70 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-bold tracking-wider text-cyan-300 uppercase">
            {title}
          </h3>
          <p className="text-[10px] text-slate-400">{subtitle}</p>
        </div>
        <div className="rounded bg-cyan-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-200 border border-cyan-500/30">
          β={formatBeta(beta)} → γ={formatGamma(currentGamma)}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-32 w-full cursor-crosshair select-none overflow-visible"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) handlePointer(e);
        }}
      >
        <defs>
          <linearGradient id="gammaGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="55%" stopColor="#06b6d4" />
            <stop offset="85%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[1, 2, 7.09, 70.7].map((gVal) => {
          const y = gammaToY(gVal);
          return (
            <g key={gVal}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="rgba(148, 163, 184, 0.16)"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 4}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-400 font-mono text-[8.5px]"
              >
                {gVal === 1 ? '1' : gVal === 2 ? '2' : gVal === 7.09 ? '7' : '71'}
              </text>
            </g>
          );
        })}

        {/* Vertical threshold markers */}
        {thresholds.map((th) => {
          const x = betaToX(th.b);
          return (
            <g key={th.label}>
              <line
                x1={x}
                y1={padTop}
                x2={x}
                y2={height - padBottom}
                stroke="rgba(56, 189, 248, 0.2)"
                strokeDasharray="2 3"
              />
              <text
                x={x}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-400 font-mono text-[8.5px]"
              >
                {th.label}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line
          x1={padLeft}
          y1={height - padBottom}
          x2={width - padRight}
          y2={height - padBottom}
          stroke="rgba(148, 163, 184, 0.45)"
        />
        <line
          x1={padLeft}
          y1={padTop}
          x2={padLeft}
          y2={height - padBottom}
          stroke="rgba(148, 163, 184, 0.45)"
        />

        {/* Asymptote at beta = 1.0 (Speed of Light c) */}
        <line
          x1={betaToX(1.0)}
          y1={padTop - 4}
          x2={betaToX(1.0)}
          y2={height - padBottom}
          stroke="rgba(244, 63, 94, 0.7)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        <text
          x={betaToX(1.0) - 3}
          y={padTop + 8}
          textAnchor="end"
          className="fill-rose-400 font-mono text-[8.5px] font-bold"
        >
          v = c (γ → ∞)
        </text>

        {/* Secondary curve: Length Contraction L/L0 = sqrt(1 - beta^2) */}
        <path
          d={contractionPath}
          fill="none"
          stroke="rgba(52, 211, 153, 0.45)"
          strokeWidth="1.5"
          strokeDasharray="3 2"
        />

        {/* Primary curve: Lorentz factor gamma(beta) */}
        <path
          d={gammaPath}
          fill="none"
          stroke="url(#gammaGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Active cursor crosshair & glowing dot */}
        <line
          x1={cx}
          y1={padTop}
          x2={cx}
          y2={height - padBottom}
          stroke="rgba(34, 211, 238, 0.55)"
          strokeWidth="1"
        />
        <circle
          cx={cx}
          cy={cy}
          r={6.5}
          fill="rgba(34, 211, 238, 0.25)"
        />
        <circle
          cx={cx}
          cy={cy}
          r={3.8}
          fill="#22d3ee"
          stroke="#ffffff"
          strokeWidth="1.2"
        />

        {/* Axis endpoints */}
        <text
          x={padLeft}
          y={height - 8}
          textAnchor="middle"
          className="fill-slate-400 font-mono text-[8.5px]"
        >
          0
        </text>
        <text
          x={width - padRight}
          y={height - 8}
          textAnchor="end"
          className="fill-rose-400 font-mono text-[8.5px]"
        >
          1.0c
        </text>
      </svg>

      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
          <span>γ = (1 - β²)⁻¹/²</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 bg-emerald-400" />
          <span>L / L₀ = √(1 - β²)</span>
        </span>
      </div>
    </div>
  );
}
