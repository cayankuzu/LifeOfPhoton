'use client';

/**
 * Colour and relative brightness of five light sources as a function of the
 * Doppler factor — the figure that settles the "starbow" question.
 *
 * Every strip is computed from the spectral atlas and passed through the same
 * display transform as the image (src/physics/display.ts). Each strip is exposed
 * for its own appearance at D = 1 — the thermal strip, which is black at D = 1,
 * for D = 4.
 */

import { useMemo } from 'react';
import { formatSignificant } from '@/i18n/format';
import { type Triple, relativeLuminance } from '@/physics/colorimetry';
import { NOMINAL_SOLAR_TEMPERATURE_K } from '@/physics/constants';
import { toCss } from '@/physics/display';
import { clampBeta, headOnDopplerFactor } from '@/physics/kinematics';
import { SCENARIO } from '@/physics/scenario';
import { blackbodyRadiance, lineRadiance, reflectedRadiance, sharedAtlas } from '@/physics/spectralAtlas';
import { type FigureProps, Frame, INK, logScale } from './kit';

const WIDTH = 640;
const HEIGHT = 246;
const STRIP = { left: 168, right: 624, top: 26, height: 26, gap: 8 } as const;
const D_MIN = 0.3;
const D_MAX = 30;
const SLICES = 228;
/** Scene luminance, in units of the reference white, given to each strip at its reference Doppler factor. */
const REFERENCE_LEVEL = 0.5;

const LABELS = {
  tr: {
    aria: 'Beş ışık kaynağının rengi ve parlaklığı, Doppler çarpanına karşı',
    star: 'Güneş benzeri yıldız',
    moon: 'ay ışığında beyaz duvar',
    led: 'LED ışığında beyaz duvar',
    signal: 'kırmızı trafik ışığı',
    thermal: 'ortamın ısıl ışıması',
    axis: 'Doppler çarpanı D',
    ahead: 'ileride',
    behind: 'geride',
  },
  en: {
    aria: 'Colour and brightness of five light sources against the Doppler factor',
    star: 'Sun-like star',
    moon: 'white wall in moonlight',
    led: 'white wall in LED light',
    signal: 'red traffic signal',
    thermal: 'thermal emission',
    axis: 'Doppler factor D',
    ahead: 'ahead',
    behind: 'behind',
  },
} as const;

const TICKS = [0.3, 0.5, 1, 2, 5, 10, 30] as const;

interface Strip {
  readonly key: 'star' | 'moon' | 'led' | 'signal' | 'thermal';
  readonly colours: string[];
}

export default function ColourTracksFigure({ beta, language }: FigureProps) {
  const t = LABELS[language];
  const x = useMemo(() => logScale([D_MIN, D_MAX], [STRIP.left, STRIP.right]), []);

  const strips = useMemo<Strip[]>(() => {
    const atlas = sharedAtlas();
    const white: Triple = [1, 1, 1];
    const sources: Array<{ key: Strip['key']; radiance: (doppler: number) => Triple; reference: number }> = [
      {
        // an unresolved black body: radiance of D·T, flux reduced by the shrinking solid angle
        key: 'star',
        radiance: (doppler) => {
          const body = blackbodyRadiance(atlas, NOMINAL_SOLAR_TEMPERATURE_K * doppler);
          const dilution = 1 / (doppler * doppler);
          return [body[0] * dilution, body[1] * dilution, body[2] * dilution];
        },
        reference: 1,
      },
      { key: 'moon', radiance: (doppler) => reflectedRadiance(atlas, 'moon', white, doppler), reference: 1 },
      { key: 'led', radiance: (doppler) => reflectedRadiance(atlas, 'led', white, doppler), reference: 1 },
      { key: 'signal', radiance: (doppler) => lineRadiance(atlas, SCENARIO.signals.redNm, doppler), reference: 1 },
      {
        key: 'thermal',
        radiance: (doppler) => blackbodyRadiance(atlas, SCENARIO.environment.temperatureK * doppler),
        reference: 4,
      },
    ];
    return sources.map((source) => {
      const scale = REFERENCE_LEVEL / relativeLuminance(source.radiance(source.reference));
      const colours: string[] = [];
      for (let i = 0; i < SLICES; i++) {
        const doppler = D_MIN * (D_MAX / D_MIN) ** ((i + 0.5) / SLICES);
        const radiance = source.radiance(doppler);
        colours.push(toCss([radiance[0] * scale, radiance[1] * scale, radiance[2] * scale]));
      }
      return { key: source.key, colours };
    });
  }, []);

  const sliceWidth = (STRIP.right - STRIP.left) / SLICES;
  const bottom = STRIP.top + strips.length * (STRIP.height + STRIP.gap) - STRIP.gap;
  const d0 = headOnDopplerFactor(clampBeta(beta));
  const marks: Array<{ doppler: number; label: string }> = [];
  if (d0 > 1.02) {
    if (d0 <= D_MAX) marks.push({ doppler: d0, label: t.ahead });
    if (1 / d0 >= D_MIN) marks.push({ doppler: 1 / d0, label: t.behind });
  }

  return (
    <Frame width={WIDTH} height={HEIGHT} label={t.aria}>
      {strips.map((strip, row) => {
        const top = STRIP.top + row * (STRIP.height + STRIP.gap);
        return (
          <g key={strip.key}>
            <text x={STRIP.left - 10} y={top + STRIP.height / 2} dy="0.32em" textAnchor="end" fill={INK.secondary}>
              {t[strip.key]}
            </text>
            {strip.colours.map((colour, index) => (
              <rect
                key={index}
                x={STRIP.left + index * sliceWidth}
                y={top}
                width={sliceWidth + 0.5}
                height={STRIP.height}
                fill={colour}
              />
            ))}
            <rect
              x={STRIP.left}
              y={top}
              width={STRIP.right - STRIP.left}
              height={STRIP.height}
              fill="none"
              stroke={INK.hairlineStrong}
            />
          </g>
        );
      })}

      {/* D = 1 */}
      <line
        x1={x(1)}
        x2={x(1)}
        y1={STRIP.top - 4}
        y2={bottom + 4}
        stroke={INK.primary}
        strokeWidth={1}
        strokeDasharray="2 3"
        opacity={0.7}
      />

      {marks.map((mark) => (
        <g key={mark.label} transform={`translate(${x(mark.doppler)} 0)`}>
          <path d={`M0 ${STRIP.top - 3} l-4 -7 h8 z`} fill={INK.cryo} />
          <text y={STRIP.top - 13} textAnchor="middle" fill={INK.cryo}>
            {mark.label}
          </text>
        </g>
      ))}

      <line x1={STRIP.left} x2={STRIP.right} y1={bottom + 10} y2={bottom + 10} stroke={INK.hairlineStrong} />
      {TICKS.map((tick) => (
        <g key={tick} transform={`translate(${x(tick)} ${bottom + 10})`}>
          <line y2={4} stroke={INK.hairlineStrong} />
          <text y={15} textAnchor="middle" fill={INK.tertiary}>
            {formatSignificant(tick, 1, language)}
          </text>
        </g>
      ))}
      <text x={(STRIP.left + STRIP.right) / 2} y={bottom + 40} textAnchor="middle" fill={INK.secondary}>
        {t.axis}
      </text>
    </Frame>
  );
}
