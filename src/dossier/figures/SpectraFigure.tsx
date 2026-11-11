'use client';

/**
 * The spectra of the scene's light sources in the rest frame, and the two windows
 * of that spectrum which reach the eye as visible light at the current speed.
 * As β grows the forward window slides off the LED spectrum into the far infrared,
 * where only the thermal emission of the surroundings is left.
 */

import { useMemo } from 'react';
import { VISIBLE_MAX_NM, VISIBLE_MIN_NM } from '@/physics/bands';
import { clampBeta, headOnDopplerFactor } from '@/physics/kinematics';
import { planckRadiancePerNm } from '@/physics/radiometry';
import { SCENARIO } from '@/physics/scenario';
import { ledSpectrum } from '@/physics/spectra';
import { AxisBottom, AxisLeft, type FigureProps, Frame, INK, LegendItem, type Scale, logScale, pathThrough } from './kit';

const WIDTH = 640;
const HEIGHT = 348;
const PLOT = { left: 50, right: 624, top: 34, bottom: 278 } as const;
const MIN_NM = 1;
const MAX_NM = 1e6;
const FLOOR = 1e-5;
const SAMPLES = 420;

const LABELS = {
  tr: {
    aria: 'Sahnedeki ışık kaynaklarının durgun çerçeve tayfları ve geçerli hızda görünür banda düşen aralıklar',
    x: 'durgun çerçevede dalga boyu',
    y: 'bağıl tayfsal ışınım parlaklığı',
    visible: 'görünür',
    ahead: 'önden',
    behind: 'arkadan',
    led: 'LED sokak aydınlatması',
    moon: 'ay ışığı (4100 K)',
    interior: 'pencereler (2856 K)',
    thermal: 'ortam (288 K)',
  },
  en: {
    aria: 'Rest-frame spectra of the light sources of the scene and the ranges that fall into the visible band at the current speed',
    x: 'wavelength in the rest frame',
    y: 'relative spectral radiance',
    visible: 'visible',
    ahead: 'ahead',
    behind: 'behind',
    led: 'LED street lighting',
    moon: 'moonlight (4100 K)',
    interior: 'windows (2856 K)',
    thermal: 'surroundings (288 K)',
  },
} as const;

const X_TICKS = [1, 10, 100, 1e3, 1e4, 1e5, 1e6] as const;
const X_LABEL: Record<number, string> = {
  1: '1 nm',
  10: '10 nm',
  100: '100 nm',
  1000: '1 µm',
  10000: '10 µm',
  100000: '100 µm',
  1000000: '1 mm',
};
const Y_TICKS = [1, 1e-1, 1e-2, 1e-3, 1e-4, 1e-5] as const;
const Y_LABEL: Record<number, string> = { 1: '1', 0.1: '10⁻¹', 0.01: '10⁻²', 0.001: '10⁻³', 0.0001: '10⁻⁴', 0.00001: '10⁻⁵' };

/** Samples a spectrum on a logarithmic wavelength grid and normalises it to its peak. */
function normalisedPath(spectrum: (nm: number) => number, x: Scale, y: Scale): string {
  const values: Array<[number, number]> = [];
  let peak = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const nm = MIN_NM * (MAX_NM / MIN_NM) ** (i / SAMPLES);
    const value = spectrum(nm);
    values.push([nm, value]);
    if (value > peak) peak = value;
  }
  return pathThrough(
    values.map(([nm, value]) => {
      const relative = value / peak;
      return [x(nm), relative >= FLOOR ? y(relative) : Number.NaN];
    })
  );
}

export default function SpectraFigure({ beta, language }: FigureProps) {
  const t = LABELS[language];
  const x = useMemo(() => logScale([MIN_NM, MAX_NM], [PLOT.left, PLOT.right]), []);
  const y = useMemo(() => logScale([FLOOR, 2], [PLOT.bottom, PLOT.top]), []);

  const paths = useMemo(
    () => ({
      led: normalisedPath(ledSpectrum, x, y),
      moon: normalisedPath((nm) => planckRadiancePerNm(nm, SCENARIO.moon.colourTemperatureK), x, y),
      interior: normalisedPath((nm) => planckRadiancePerNm(nm, SCENARIO.interior.colourTemperatureK), x, y),
      thermal: normalisedPath((nm) => planckRadiancePerNm(nm, SCENARIO.environment.temperatureK), x, y),
    }),
    [x, y]
  );

  const d0 = headOnDopplerFactor(clampBeta(beta));
  const shifted = d0 > 1.02;

  /** A window of the rest-frame spectrum, clipped to the axis. */
  const band = (from: number, to: number, colour: string, label: string, labelY: number) => {
    const lo = Math.max(from, MIN_NM);
    const hi = Math.min(to, MAX_NM);
    if (!(hi > lo)) return null;
    const left = x(lo);
    const width = Math.max(x(hi) - left, 1.5);
    return (
      <g>
        <rect
          x={left}
          y={PLOT.top}
          width={width}
          height={PLOT.bottom - PLOT.top}
          fill={colour}
          fillOpacity={0.1}
          stroke={colour}
          strokeWidth={1}
        />
        <text
          x={Math.min(Math.max(left + width / 2, PLOT.left + 22), PLOT.right - 22)}
          y={labelY}
          textAnchor="middle"
          fill={colour}
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <Frame width={WIDTH} height={HEIGHT} label={t.aria}>
      <AxisLeft
        scale={y}
        at={PLOT.left}
        ticks={Y_TICKS}
        format={(value) => Y_LABEL[value] ?? String(value)}
        grid={[PLOT.left, PLOT.right]}
        title={t.y}
      />
      <AxisBottom scale={x} at={PLOT.bottom} ticks={X_TICKS} format={(value) => X_LABEL[value] ?? String(value)} title={t.x} />

      {/* the visible band at rest */}
      <rect
        x={x(VISIBLE_MIN_NM)}
        y={PLOT.top}
        width={x(VISIBLE_MAX_NM) - x(VISIBLE_MIN_NM)}
        height={PLOT.bottom - PLOT.top}
        fill={INK.primary}
        fillOpacity={0.07}
      />
      <text x={(x(VISIBLE_MIN_NM) + x(VISIBLE_MAX_NM)) / 2} y={PLOT.top - 20} textAnchor="middle" fill={INK.secondary}>
        {t.visible}
      </text>

      {shifted && band(VISIBLE_MIN_NM * d0, VISIBLE_MAX_NM * d0, INK.cryo, t.ahead, PLOT.top - 7)}
      {shifted && band(VISIBLE_MIN_NM / d0, VISIBLE_MAX_NM / d0, INK.alarm, t.behind, PLOT.top - 7)}

      <path d={paths.thermal} fill="none" stroke={INK.alarm} strokeWidth={1.5} />
      <path d={paths.interior} fill="none" stroke={INK.secondary} strokeWidth={1.2} strokeDasharray="4 3" />
      <path d={paths.moon} fill="none" stroke={INK.primary} strokeWidth={1.5} />
      <path d={paths.led} fill="none" stroke={INK.amber} strokeWidth={1.6} />

      <LegendItem x={PLOT.left} y={HEIGHT - 12} colour={INK.amber}>
        {t.led}
      </LegendItem>
      <LegendItem x={PLOT.left + 176} y={HEIGHT - 12} colour={INK.primary}>
        {t.moon}
      </LegendItem>
      <LegendItem x={PLOT.left + 320} y={HEIGHT - 12} colour={INK.secondary} dashed>
        {t.interior}
      </LegendItem>
      <LegendItem x={PLOT.left + 462} y={HEIGHT - 12} colour={INK.alarm}>
        {t.thermal}
      </LegendItem>
    </Frame>
  );
}
