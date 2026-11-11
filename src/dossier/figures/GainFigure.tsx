'use client';

/**
 * Luminance of a white surface against the Doppler factor, for the three ways it
 * can send light to the observer: reflected moonlight, reflected LED light and its
 * own thermal emission. The unit is the luminance of the same surface under the
 * street lighting at rest. All curves are read from the spectral atlas, i.e. from
 * exactly the numbers the image is drawn with.
 */

import { useMemo } from 'react';
import { formatSignificant } from '@/i18n/format';
import { clampBeta, headOnDopplerFactor } from '@/physics/kinematics';
import { solveLogBisection } from '@/physics/radiometry';
import { SCENARIO } from '@/physics/scenario';
import { blackbodyLuminanceUnits, reflectedGain, sharedAtlas } from '@/physics/spectralAtlas';
import { AxisBottom, AxisLeft, type FigureProps, Frame, INK, LegendItem, logScale, pathThrough } from './kit';

const WIDTH = 640;
const HEIGHT = 352;
const PLOT = { left: 54, right: 624, top: 22, bottom: 282 } as const;
const D_MIN = 0.3;
const D_MAX = 500;
const FLOOR = 1e-6;
const CEILING = 1e12;
const SAMPLES = 260;

const LABELS = {
  tr: {
    aria: 'Beyaz bir yüzeyin parıltısının Doppler çarpanına bağlılığı: ay ışığı, LED ışığı ve ısıl ışıma',
    x: 'Doppler çarpanı D',
    y: 'bağıl parıltı',
    moon: 'ay ışığı',
    led: 'LED ışığı',
    thermal: 'ısıl ışıma',
    bolometric: 'D⁴',
    ahead: 'ileride',
    behind: 'geride',
  },
  en: {
    aria: 'Luminance of a white surface against the Doppler factor: moonlight, LED light and thermal emission',
    x: 'Doppler factor D',
    y: 'relative luminance',
    moon: 'moonlight',
    led: 'LED light',
    thermal: 'thermal emission',
    bolometric: 'D⁴',
    ahead: 'ahead',
    behind: 'behind',
  },
} as const;

const X_TICKS = [0.3, 1, 3, 10, 30, 100, 300] as const;
const Y_TICKS = [1e-6, 1e-3, 1, 1e3, 1e6, 1e9, 1e12] as const;
const Y_LABEL: Record<number, string> = {
  0.000001: '10⁻⁶',
  0.001: '10⁻³',
  1: '1',
  1000: '10³',
  1000000: '10⁶',
  1000000000: '10⁹',
  1000000000000: '10¹²',
};

export default function GainFigure({ beta, language }: FigureProps) {
  const t = LABELS[language];
  const x = useMemo(() => logScale([D_MIN, D_MAX], [PLOT.left, PLOT.right]), []);
  const y = useMemo(() => logScale([FLOOR, CEILING], [PLOT.bottom, PLOT.top]), []);

  const model = useMemo(() => {
    const atlas = sharedAtlas();
    const moonRatio = SCENARIO.moon.illuminanceLux / SCENARIO.street.illuminanceLux;
    const { surfaceEmissivity, temperatureK } = SCENARIO.environment;
    const thermal = (doppler: number): number => surfaceEmissivity * blackbodyLuminanceUnits(atlas, temperatureK * doppler);
    const sample = (fn: (doppler: number) => number): string => {
      const points: Array<[number, number]> = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const doppler = D_MIN * (D_MAX / D_MIN) ** (i / SAMPLES);
        const value = fn(doppler);
        points.push([x(doppler), value >= FLOOR && value <= CEILING ? y(value) : Number.NaN]);
      }
      return pathThrough(points);
    };
    return {
      moon: sample((doppler) => moonRatio * reflectedGain(atlas, 'moon', doppler)),
      led: sample((doppler) => reflectedGain(atlas, 'led', doppler)),
      thermal: sample(thermal),
      bolometric: sample((doppler) => doppler ** 4),
      // where the thermal emission equals the luminance of the street-lit surface at rest
      crossover: solveLogBisection((doppler) => thermal(doppler) - 1, 1.5, 20),
    };
  }, [x, y]);

  const d0 = headOnDopplerFactor(clampBeta(beta));
  const marks: Array<{ doppler: number; label: string }> = [];
  if (d0 > 1.02) {
    if (d0 <= D_MAX) marks.push({ doppler: d0, label: t.ahead });
    if (1 / d0 >= D_MIN) marks.push({ doppler: 1 / d0, label: t.behind });
  }

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
      <AxisBottom
        scale={x}
        at={PLOT.bottom}
        ticks={X_TICKS}
        format={(value) => formatSignificant(value, 1, language)}
        title={t.x}
        grid={[PLOT.top, PLOT.bottom]}
      />

      <path d={model.bolometric} fill="none" stroke={INK.tertiary} strokeWidth={1} strokeDasharray="3 4" />
      <path d={model.moon} fill="none" stroke={INK.primary} strokeWidth={1.5} />
      <path d={model.led} fill="none" stroke={INK.amber} strokeWidth={1.6} />
      <path d={model.thermal} fill="none" stroke={INK.alarm} strokeWidth={1.6} />

      {Number.isFinite(model.crossover) && (
        <g transform={`translate(${x(model.crossover)} ${y(1)})`}>
          <circle r={3} fill={INK.well} stroke={INK.alarm} strokeWidth={1.4} />
          <text x={8} y={14} fill={INK.secondary}>
            D = {formatSignificant(model.crossover, 2, language)}
          </text>
        </g>
      )}

      {marks.map((mark) => (
        <g key={mark.label}>
          <line
            x1={x(mark.doppler)}
            x2={x(mark.doppler)}
            y1={PLOT.top}
            y2={PLOT.bottom}
            stroke={INK.cryo}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <text x={x(mark.doppler)} y={PLOT.top - 7} textAnchor="middle" fill={INK.cryo}>
            {mark.label}
          </text>
        </g>
      ))}

      <LegendItem x={PLOT.left} y={HEIGHT - 12} colour={INK.primary}>
        {t.moon}
      </LegendItem>
      <LegendItem x={PLOT.left + 132} y={HEIGHT - 12} colour={INK.amber}>
        {t.led}
      </LegendItem>
      <LegendItem x={PLOT.left + 264} y={HEIGHT - 12} colour={INK.alarm}>
        {t.thermal}
      </LegendItem>
      <LegendItem x={PLOT.left + 420} y={HEIGHT - 12} colour={INK.tertiary} dashed>
        {t.bolometric}
      </LegendItem>
    </Frame>
  );
}
