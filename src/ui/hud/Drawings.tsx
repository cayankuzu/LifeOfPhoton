'use client';

/**
 * The two small drawings of the panel "Why does it look like this?" (src/ui/drawings.ts says which item
 * carries which), each behind a disclosure "Show a drawing" inside its item. Inline SVG in the visual
 * language of the interface: ink lines, the amber accent for what the drawing is about, no fills. Each is an
 * image with an accessible name and a caption that says in words what it shows.
 *
 *   rain    standing still, the rain falls straight down; running, it seems to come from ahead, and the
 *           umbrella is tilted forward. The classical analogy of aberration: the drawing shows the rain, not light.
 *   delay   a car, the eye and two rays: from the far end, set out earlier, when the car was farther away (its
 *           earlier place drawn dashed); from the near end, set out later; both arrive together. No car is drawn
 *           shortened: the drawing is about when the light left, not about a seen shape.
 */

import { ChevronDown, PencilLine } from 'lucide-react';
import { useState } from 'react';
import type { Messages } from '@/i18n/messages';
import type { DrawingId } from '../drawings';

const INK = 'var(--ink-2)';
const FAINT = 'var(--ink-3)';
const AMBER = 'var(--amber)';
const LINE = { fill: 'none', strokeWidth: 1.25, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const LABEL = { fontFamily: 'var(--font-mono), monospace', fontSize: 9, fill: FAINT, textAnchor: 'middle' } as const;

const WIDTH = 280;
const HEIGHT = 106;
/** Ground line and the top of the rain, px of the drawing. */
const GROUND = 92;
const RAIN_TOP = 15;
/** The tilt of the rain the runner meets, and of the umbrella, deg. */
const TILT = 22;

/** An umbrella: its handle from `hand` up to the canopy, tilted `tilt` degrees forward (clockwise). */
function Umbrella({ hand, tilt }: { readonly hand: readonly [number, number]; readonly tilt: number }) {
  const r = (tilt * Math.PI) / 180;
  const top: [number, number] = [hand[0] + 34 * Math.sin(r), hand[1] - 34 * Math.cos(r)];
  return (
    <g stroke={AMBER} {...LINE}>
      <path d={`M${hand[0]} ${hand[1]}L${top[0].toFixed(1)} ${top[1].toFixed(1)}`} />
      <path
        d={`M${top[0] - 18} ${top[1] + 2}Q${top[0]} ${top[1] - 18} ${top[0] + 18} ${top[1] + 2}Z`}
        transform={`rotate(${tilt} ${top[0].toFixed(1)} ${top[1].toFixed(1)})`}
      />
    </g>
  );
}

/** The rain over one half of the drawing: short strokes, slanted by `tilt` (from ahead, top right), none under the umbrella. */
function Rain({
  from,
  to,
  shelter,
  tilt,
}: {
  readonly from: number;
  readonly to: number;
  readonly shelter: readonly [number, number];
  readonly tilt: number;
}) {
  const length = 8;
  const dx = length * Math.tan((tilt * Math.PI) / 180);
  let d = '';
  for (let row = 0; RAIN_TOP + row * 14 + length < GROUND - 4; row++) {
    const y = RAIN_TOP + row * 14;
    for (let x = from + (row % 2) * 6; x + dx <= to; x += 12) {
      // the umbrella and the child keep dry
      if (y + length > RAIN_TOP + 10 && x + dx > shelter[0] && x < shelter[1]) continue;
      d += `M${(x + dx).toFixed(1)} ${y}L${x} ${y + length}`;
    }
  }
  return <path d={d} stroke={FAINT} {...LINE} strokeWidth={1} />;
}

/** The rain: a child standing, and a child running. */
function RainDrawing({ t }: { readonly t: Messages['explain']['drawings']['rain'] }) {
  const a = 70;
  const b = 206;
  return (
    <>
      <line x1={140} y1={6} x2={140} y2={HEIGHT - 4} stroke="var(--hairline-strong)" strokeWidth={1} />
      <text x={a} y={9} style={LABEL}>
        {t.still}
      </text>
      <text x={b} y={9} style={LABEL}>
        {t.running}
      </text>
      <path d={`M12 ${GROUND}H128M152 ${GROUND}H268`} stroke={FAINT} {...LINE} strokeWidth={1} />

      {/* standing: the rain falls straight down, the umbrella is upright */}
      <Rain from={14} to={128} shelter={[a - 16, a + 30]} tilt={0} />
      <g stroke={INK} {...LINE}>
        <circle cx={a} cy={56} r={4} />
        <path d={`M${a} 60V76M${a} 76L${a - 5} ${GROUND}M${a} 76L${a + 5} ${GROUND}M${a} 64L${a - 5} 72M${a} 64L${a + 6} 68`} />
      </g>
      <Umbrella hand={[a + 6, 70]} tilt={0} />

      {/* running: the rain seems to come from ahead, the umbrella leans forward */}
      <Rain from={154} to={268} shelter={[b - 12, b + 44]} tilt={TILT} />
      <g stroke={INK} {...LINE}>
        <circle cx={b + 5} cy={56} r={4} />
        <path
          d={`M${b + 3} 60L${b - 1} 76M${b - 1} 76L${b - 11} ${GROUND}M${b - 1} 76L${b + 6} 84L${b + 9} ${GROUND}M${b + 2} 64L${b - 6} 70M${b + 2} 64L${b + 9} 67`}
        />
      </g>
      <Umbrella hand={[b + 8, 70]} tilt={TILT} />
      {/* the way the child runs */}
      <path
        d={`M${b - 14} ${GROUND + 8}H${b + 14}M${b + 10} ${GROUND + 5}L${b + 14} ${GROUND + 8}L${b + 10} ${GROUND + 11}`}
        stroke={INK}
        {...LINE}
      />
    </>
  );
}

/**
 * A car in profile, its front (the near end) at `x`, facing left, on the road: an estate, whose tall rear lets the ray
 * from the far end pass over the roof.
 */
function Car({ x, dashed }: { readonly x: number; readonly dashed: boolean }) {
  const base = GROUND - 6;
  return (
    <g stroke={dashed ? FAINT : INK} {...LINE} strokeDasharray={dashed ? '3 3' : undefined}>
      <path d={`M${x} ${base}V${base - 8}H${x + 14}L${x + 22} ${base - 17}H${x + 60}V${base}Z`} />
      <circle cx={x + 13} cy={base} r={4} />
      <circle cx={x + 47} cy={base} r={4} />
    </g>
  );
}

/** A ray from `from` to `to` with an arrowhead at `to` and a dot where it set out. */
function Ray({ from, to }: { readonly from: readonly [number, number]; readonly to: readonly [number, number] }) {
  const angle = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
  return (
    <g stroke={AMBER} {...LINE}>
      <circle cx={from[0]} cy={from[1]} r={1.8} fill={AMBER} stroke="none" />
      <path d={`M${from[0]} ${from[1]}L${to[0]} ${to[1]}`} />
      <path d="M-6 -3.5L0 0L-6 3.5" transform={`translate(${to[0]} ${to[1]}) rotate(${angle.toFixed(1)})`} />
    </g>
  );
}

/** The delay: the eye, the car earlier (farther) and later (nearer), and the two rays that arrive together. */
function DelayDrawing({ t }: { readonly t: Messages['explain']['drawings']['delay'] }) {
  const earlier = 200;
  const later = 104;
  /** the top of the bonnet at the front, and of the rear */
  const bonnet = GROUND - 14;
  const rear = GROUND - 23;
  const eye: [number, number] = [36, 31];
  return (
    <>
      <path d="M10 30Q22 21 34 30Q22 39 10 30Z" stroke={INK} {...LINE} />
      <circle cx={23} cy={30} r={2.5} fill={INK} />
      <text x={22} y={50} style={LABEL}>
        {t.eye}
      </text>
      <path d={`M8 ${GROUND}H272`} stroke={FAINT} {...LINE} strokeWidth={1} />
      <Car x={earlier} dashed />
      <Car x={later} dashed={false} />
      {/* the far end of the car, earlier; its near end, later */}
      <Ray from={[earlier + 60, rear]} to={eye} />
      <Ray from={[later, bonnet]} to={[eye[0], eye[1] + 1]} />
      {/* the car comes nearer between the two moments */}
      <path
        d={`M${earlier - 6} ${GROUND + 6}H${later + 66}M${later + 70} ${GROUND + 3}L${later + 66} ${GROUND + 6}L${later + 70} ${GROUND + 9}`}
        stroke={FAINT}
        {...LINE}
      />
      <text x={earlier + 30} y={HEIGHT - 2} style={LABEL}>
        {t.earlier}
      </text>
      <text x={later + 30} y={HEIGHT - 2} style={LABEL}>
        {t.later}
      </text>
    </>
  );
}

/** A drawing behind its disclosure, closed at first; `id` names its figure (the target of aria-controls). */
export function DrawingDisclosure({
  drawing,
  id,
  t,
}: {
  readonly drawing: DrawingId;
  readonly id: string;
  readonly t: Messages;
}) {
  const [open, setOpen] = useState(false);
  const text = t.explain.drawings[drawing];
  return (
    <div className="mt-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="-ml-1 inline-flex min-h-6 items-center gap-1 rounded px-1 text-[11.5px] text-ink-3 transition-colors duration-150 hover:text-ink [@media(pointer:coarse)]:min-h-9"
      >
        <PencilLine className="h-3 w-3 text-amber" aria-hidden="true" />
        {t.explain.drawings.show}
        <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <figure id={id} hidden={!open} data-drawing={drawing} className="m-0 mt-1">
        <svg role="img" aria-label={text.name} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full max-w-[280px]">
          {drawing === 'rain' ? <RainDrawing t={t.explain.drawings.rain} /> : <DelayDrawing t={t.explain.drawings.delay} />}
        </svg>
        <figcaption className="mt-1 text-[11.5px] leading-[1.45] text-ink-3">{text.caption}</figcaption>
      </figure>
    </div>
  );
}
