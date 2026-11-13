'use client';

/**
 * The electromagnetic spectrum from 1 nm to 1 mm on a logarithmic axis, with the
 * places a 555 nm reference line lands for light arriving from dead ahead and from
 * directly behind. It makes the central fact of the Doppler shift visible: the
 * light does not change colour so much as leave the narrow band the eye can see.
 */

import { useRef, useSyncExternalStore } from 'react';
import { CANDELA_WAVELENGTH_NM } from '@/physics/constants';
import { VISIBLE_MAX_NM, VISIBLE_MIN_NM, spectralSwatch } from '@/physics/bands';
import { headOnDopplerFactor } from '@/physics/kinematics';
import { telemetry } from '@/state/simulation';
import { useFrame, useMessages } from '../hooks';
import { entryProps } from '../inventory';

const WIDTH = 288;
const HEIGHT = 58;
const AXIS_Y = 22;
const MIN_NM = 1;
const MAX_NM = 1e6;

/** Horizontal position of a wavelength, rounded so that server and client render identical markup. */
const x = (nm: number): number =>
  Math.round((Math.log10(Math.min(MAX_NM, Math.max(MIN_NM, nm)) / MIN_NM) / Math.log10(MAX_NM / MIN_NM)) * WIDTH * 100) / 100;

/** Decade ticks with their conventional names. */
const DECADES: ReadonlyArray<{ nm: number; label: string }> = [
  { nm: 1, label: '1 nm' },
  { nm: 1e3, label: '1 µm' },
  { nm: 1e6, label: '1 mm' },
];

interface Slice {
  readonly index: number;
  readonly from: number;
  readonly to: number;
  readonly colour: string;
}

/** The visible band in 40 slices of its own colours; computed once, on first use in the browser. */
let slices: Slice[] | null = null;
function visibleBand(): Slice[] {
  if (slices) return slices;
  slices = [];
  const count = 40;
  for (let i = 0; i < count; i++) {
    const from = VISIBLE_MIN_NM * (VISIBLE_MAX_NM / VISIBLE_MIN_NM) ** (i / count);
    const to = VISIBLE_MIN_NM * (VISIBLE_MAX_NM / VISIBLE_MIN_NM) ** ((i + 1) / count);
    const colour = spectralSwatch(Math.sqrt(from * to));
    if (colour) slices.push({ index: i, from, to, colour });
  }
  return slices;
}
const NO_SLICES: Slice[] = [];
/** The band never changes, so there is nothing to subscribe to. */
const unchanging = (): (() => void) => () => {};

export default function SpectrumStrip() {
  const { t } = useMessages();
  const aheadRef = useRef<SVGGElement>(null);
  const behindRef = useRef<SVGGElement>(null);

  // The visible band, drawn in its own colours, only in the browser: the colours come out of
  // floating-point colorimetry and need not match a server render bit for bit. The server and
  // the first render in the browser (hydration) draw no band; React then renders it.
  const visible = useSyncExternalStore(unchanging, visibleBand, () => NO_SLICES);

  useFrame(() => {
    const d0 = headOnDopplerFactor(telemetry.beta);
    aheadRef.current?.setAttribute('transform', `translate(${x(CANDELA_WAVELENGTH_NM / d0).toFixed(2)} 0)`);
    behindRef.current?.setAttribute('transform', `translate(${x(CANDELA_WAVELENGTH_NM * d0).toFixed(2)} 0)`);
  });

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={t.dock.spectrumCaption}
        style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 8.5 }}
      >
        <line x1={0} x2={WIDTH} y1={AXIS_Y} y2={AXIS_Y} stroke="var(--hairline-strong)" />
        {DECADES.map((decade) => (
          <g key={decade.nm} transform={`translate(${x(decade.nm)} ${AXIS_Y})`}>
            <line y1={-3} y2={3} stroke="var(--hairline-strong)" />
            <text
              y={34}
              textAnchor={decade.nm === MIN_NM ? 'start' : decade.nm === MAX_NM ? 'end' : 'middle'}
              fill="var(--ink-3)"
            >
              {decade.label}
            </text>
          </g>
        ))}
        {visible.map((slice) => (
          <rect
            key={slice.index}
            x={x(slice.from)}
            y={AXIS_Y - 3}
            width={Math.round((x(slice.to) - x(slice.from) + 0.3) * 100) / 100}
            height={6}
            fill={slice.colour}
          />
        ))}

        {/* ahead: blueshifted, drawn above the axis */}
        <g ref={aheadRef} {...entryProps('spectrumMarkers')}>
          <path d={`M0 ${AXIS_Y - 5} l-3.2 -5.5 h6.4 z`} fill="var(--ink)" />
          <text y={AXIS_Y - 13} textAnchor="middle" fill="var(--ink)">
            {t.dock.ahead}
          </text>
        </g>
        {/* behind: redshifted, drawn below the axis */}
        <g ref={behindRef} {...entryProps('spectrumMarkers')}>
          <path d={`M0 ${AXIS_Y + 5} l-3.2 5.5 h6.4 z`} fill="var(--ink-2)" />
          <text y={AXIS_Y + 19} textAnchor="middle" fill="var(--ink-2)">
            {t.dock.behind}
          </text>
        </g>
      </svg>
    </figure>
  );
}
