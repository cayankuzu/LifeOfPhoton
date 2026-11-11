'use client';

/**
 * Aberration as a map of directions. The outer ring carries the directions of the
 * street frame, the inner ring the directions in which the same light is seen;
 * each pair is joined by a line, so the forward crowding can be read off directly.
 */

import { formatAngle, formatSignificant } from '@/i18n/format';
import { clampBeta } from '@/physics/kinematics';
import { aberrate, dopplerFromRestAngle, neutralConeAngle, transversePlaneApparentAngle } from '@/physics/optics';
import { type FigureProps, Frame, INK } from './kit';

const WIDTH = 640;
const HEIGHT = 348;
const CENTRE = { x: 180, y: 172 } as const;
const OUTER = 128;
const INNER = 90;
const DEGREES = 180 / Math.PI;

const LABELS = {
  tr: {
    aria: 'Cadde çerçevesindeki yönlerin gözlemciye göründüğü yönlere eşlenmesi',
    rest: 'cadde çerçevesi θ',
    seen: 'görülen θ′',
    cone: 'nötr koni',
    transverse: 'yan düzlem',
    motion: 'hareket yönü',
  },
  en: {
    aria: 'Map from directions in the street frame to the directions in which they are seen',
    rest: 'street frame θ',
    seen: 'seen θ′',
    cone: 'neutral cone',
    transverse: 'transverse plane',
    motion: 'direction of motion',
  },
} as const;

const RING_ANGLES = Array.from({ length: 13 }, (_, index) => index * 15);
const TABLE_ANGLES = [30, 60, 90, 120, 150, 170] as const;

/** Point at polar angle `theta` (from "up", the direction of motion) on the given side. */
function point(theta: number, radius: number, side: 1 | -1): [number, number] {
  return [CENTRE.x + side * radius * Math.sin(theta), CENTRE.y - radius * Math.cos(theta)];
}

function dopplerColour(doppler: number): string {
  if (doppler > 1.02) return INK.cryo;
  if (doppler < 0.98) return INK.alarm;
  return INK.primary;
}

export default function AberrationFigure({ beta: rawBeta, language }: FigureProps) {
  const t = LABELS[language];
  const beta = clampBeta(rawBeta);
  const moving = beta > 1e-3;
  const cone = neutralConeAngle(beta);
  const transverse = transversePlaneApparentAngle(beta);

  return (
    <Frame width={WIDTH} height={HEIGHT} label={t.aria}>
      <circle cx={CENTRE.x} cy={CENTRE.y} r={OUTER} fill="none" stroke={INK.hairline} />
      <circle cx={CENTRE.x} cy={CENTRE.y} r={INNER} fill="none" stroke={INK.hairlineStrong} />

      {/* direction of motion */}
      <line x1={CENTRE.x} y1={CENTRE.y + 10} x2={CENTRE.x} y2={CENTRE.y - 34} stroke={INK.amber} strokeWidth={1.4} />
      <path d={`M${CENTRE.x} ${CENTRE.y - 42} l-4 9 h8 z`} fill={INK.amber} />
      <text x={CENTRE.x + 8} y={CENTRE.y + 8} fill={INK.amber}>
        v
      </text>

      {/* neutral cone */}
      {moving &&
        ([1, -1] as const).map((side) => {
          const [x2, y2] = point(cone, OUTER + 8, side);
          return (
            <line
              key={side}
              x1={CENTRE.x}
              y1={CENTRE.y}
              x2={x2}
              y2={y2}
              stroke={INK.secondary}
              strokeWidth={1}
              strokeDasharray="5 4"
            />
          );
        })}

      {([1, -1] as const).flatMap((side) =>
        RING_ANGLES.filter((degrees) => side === 1 || (degrees !== 0 && degrees !== 180)).map((degrees) => {
          const theta = degrees / DEGREES;
          const apparent = aberrate(theta, beta);
          const [ox, oy] = point(theta, OUTER, side);
          const [tx, ty] = point(theta, OUTER + 5, side);
          const [ix, iy] = point(apparent, INNER, side);
          return (
            <g key={`${side}:${degrees}`}>
              <line x1={ox} y1={oy} x2={ix} y2={iy} stroke={INK.tertiary} strokeWidth={0.7} opacity={0.55} />
              <line x1={ox} y1={oy} x2={tx} y2={ty} stroke={INK.secondary} strokeWidth={1} />
              <circle cx={ix} cy={iy} r={2.6} fill={dopplerColour(dopplerFromRestAngle(theta, beta))} />
            </g>
          );
        })
      )}

      {/* rest-frame angle labels on the right-hand side */}
      {[0, 45, 90, 135, 180].map((degrees) => {
        const [lx, ly] = point(degrees / DEGREES, OUTER + 17, 1);
        return (
          <text
            key={degrees}
            x={lx}
            y={ly}
            dy="0.32em"
            textAnchor={degrees === 0 || degrees === 180 ? 'middle' : 'start'}
            fill={INK.tertiary}
          >
            {degrees}°
          </text>
        );
      })}

      <text x={CENTRE.x} y={HEIGHT - 4} textAnchor="middle" fill={INK.tertiary}>
        {t.rest} → {t.seen}
      </text>

      {/* table of values */}
      <g transform="translate(372 44)">
        <text x={0} y={0} fill={INK.secondary}>
          θ
        </text>
        <text x={118} y={0} textAnchor="end" fill={INK.secondary}>
          θ′
        </text>
        <text x={236} y={0} textAnchor="end" fill={INK.secondary}>
          D
        </text>
        <line x1={0} x2={236} y1={8} y2={8} stroke={INK.hairlineStrong} />
        {TABLE_ANGLES.map((degrees, index) => {
          const theta = degrees / DEGREES;
          const doppler = dopplerFromRestAngle(theta, beta);
          const rowY = 26 + index * 20;
          return (
            <g key={degrees}>
              <text x={0} y={rowY} fill={INK.primary}>
                {degrees}°
              </text>
              <text x={118} y={rowY} textAnchor="end" fill={INK.primary}>
                {formatAngle(aberrate(theta, beta) * DEGREES, language)}
              </text>
              <text x={236} y={rowY} textAnchor="end" fill={dopplerColour(doppler)}>
                {formatSignificant(doppler, 3, language)}
              </text>
            </g>
          );
        })}
        <line x1={0} x2={236} y1={152} y2={152} stroke={INK.hairline} />
        <text x={0} y={172} fill={INK.secondary}>
          {t.cone} (D = 1)
        </text>
        <text x={236} y={172} textAnchor="end" fill={INK.primary}>
          {moving ? formatAngle(cone * DEGREES, language) : '—'}
        </text>
        <text x={0} y={192} fill={INK.secondary}>
          {t.transverse} (θ = 90°)
        </text>
        <text x={236} y={192} textAnchor="end" fill={INK.primary}>
          {formatAngle(transverse * DEGREES, language)}
        </text>
        <g transform="translate(0 222)">
          <circle cx={4} cy={-3} r={2.6} fill={INK.cryo} />
          <text x={14} y={0} fill={INK.tertiary}>
            D &gt; 1
          </text>
          <circle cx={74} cy={-3} r={2.6} fill={INK.alarm} />
          <text x={84} y={0} fill={INK.tertiary}>
            D &lt; 1
          </text>
          <line x1={144} x2={160} y1={-3} y2={-3} stroke={INK.amber} strokeWidth={1.4} />
          <text x={166} y={0} fill={INK.tertiary}>
            {t.motion}
          </text>
        </g>
      </g>
    </Frame>
  );
}
