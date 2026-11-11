'use client';

/**
 * The annotation layer: three marks drawn over the image, never into it.
 *
 *   direction of motion   where the observer is heading
 *   neutral cone D = 1    inside it light is blueshifted, outside redshifted
 *   θ = 90° circle        where the rest-frame transverse plane is seen
 *
 * Each cone about the direction of motion is projected through the same camera
 * the scene uses, so the marks stay registered while the user looks around.
 */

import { useRef } from 'react';
import { neutralConeAngle, transversePlaneApparentAngle } from '@/physics/optics';
import { getSettings, telemetry, useSettings } from '@/state/simulation';
import { useFrame, useMessages } from '../hooks';

const SEGMENTS = 144;

interface Projector {
  (x: number, y: number, z: number): [number, number] | null;
}

/** Projects world directions to pixels for the current view. */
function makeProjector(width: number, height: number): Projector {
  const cosYaw = Math.cos(telemetry.yaw);
  const sinYaw = Math.sin(telemetry.yaw);
  const cosPitch = Math.cos(telemetry.pitch);
  const sinPitch = Math.sin(telemetry.pitch);
  const tanY = Math.tan(telemetry.fieldOfView / 2);
  const tanX = tanY * (width / Math.max(height, 1));
  return (x, y, z) => {
    // world -> view: undo the yaw about y, then the pitch about x
    const vx = x * cosYaw - z * sinYaw;
    const vz1 = x * sinYaw + z * cosYaw;
    const vy = y * cosPitch + vz1 * sinPitch;
    const vz = -y * sinPitch + vz1 * cosPitch;
    if (vz > -1e-3) return null;
    return [(vx / -vz / tanX + 1) * 0.5 * width, (1 - vy / -vz / tanY) * 0.5 * height];
  };
}

/** Path of the cone of half-angle `angle` about the direction of motion (−z), and an anchor point for its label. */
function conePath(
  angle: number,
  project: Projector,
  width: number,
  height: number
): { d: string; anchor: [number, number] | null } {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  let d = '';
  let pen = false;
  let anchor: [number, number] | null = null;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= SEGMENTS; i++) {
    const psi = (i / SEGMENTS) * 2 * Math.PI;
    const point = project(sin * Math.cos(psi), sin * Math.sin(psi), -cos);
    if (!point || Math.abs(point[0]) > 6 * width || Math.abs(point[1]) > 6 * height) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${point[0].toFixed(1)} ${point[1].toFixed(1)}`;
    pen = true;
    // label where the ring is closest to a comfortable spot in the upper right of the view
    if (point[0] > 24 && point[0] < width - 90 && point[1] > 70 && point[1] < height - 150) {
      const score = Math.hypot(point[0] - width * 0.68, point[1] - height * 0.3);
      if (score < best) {
        best = score;
        anchor = point;
      }
    }
  }
  return { d, anchor };
}

export default function Guides() {
  const { t } = useMessages();
  const enabled = useSettings((state) => state.guides);

  const svg = useRef<SVGSVGElement>(null);
  const neutralBack = useRef<SVGPathElement>(null);
  const neutralLine = useRef<SVGPathElement>(null);
  const neutralLabel = useRef<SVGTextElement>(null);
  const transverseBack = useRef<SVGPathElement>(null);
  const transverseLine = useRef<SVGPathElement>(null);
  const transverseLabel = useRef<SVGTextElement>(null);
  const motion = useRef<SVGGElement>(null);

  useFrame(() => {
    const element = svg.current;
    if (!element) return;
    // the layer covers the stage, which is narrower than the window while the dossier is open
    const stage = element.parentElement;
    const width = stage?.clientWidth ?? window.innerWidth;
    const height = stage?.clientHeight ?? window.innerHeight;
    element.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const project = makeProjector(width, height);
    const optical = getSettings().view === 'seen';
    const beta = telemetry.beta;

    const place = (label: SVGTextElement | null, anchor: [number, number] | null): void => {
      if (!label) return;
      if (anchor) {
        label.setAttribute('x', (anchor[0] + 8).toFixed(1));
        label.setAttribute('y', (anchor[1] - 6).toFixed(1));
        label.style.display = '';
      } else {
        label.style.display = 'none';
      }
    };

    // the cones only mean something in the seen view, and coincide at rest
    const showCones = optical && beta > 0.02;
    const neutral = showCones ? conePath(neutralConeAngle(beta), project, width, height) : { d: '', anchor: null };
    const transverse = showCones ? conePath(transversePlaneApparentAngle(beta), project, width, height) : { d: '', anchor: null };
    neutralBack.current?.setAttribute('d', neutral.d);
    neutralLine.current?.setAttribute('d', neutral.d);
    transverseBack.current?.setAttribute('d', transverse.d);
    transverseLine.current?.setAttribute('d', transverse.d);
    place(neutralLabel.current, neutral.anchor);
    place(transverseLabel.current, transverse.anchor);

    const ahead = project(0, 0, -1);
    if (motion.current) {
      if (ahead && ahead[0] > -40 && ahead[0] < width + 40 && ahead[1] > -40 && ahead[1] < height + 40) {
        motion.current.setAttribute('transform', `translate(${ahead[0].toFixed(1)} ${ahead[1].toFixed(1)})`);
        motion.current.style.display = '';
      } else {
        motion.current.style.display = 'none';
      }
    }
  });

  if (!enabled) return null;

  const halo = { stroke: 'rgb(5 7 10 / 0.55)', strokeWidth: 3, fill: 'none' } as const;
  const text = {
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 11,
    paintOrder: 'stroke',
    stroke: 'rgb(5 7 10 / 0.8)',
    strokeWidth: 3,
    strokeLinejoin: 'round',
  } as const;

  return (
    <svg ref={svg} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] h-full w-full">
      <path ref={transverseBack} {...halo} />
      <path
        ref={transverseLine}
        fill="none"
        stroke="rgb(233 235 239 / 0.42)"
        strokeWidth={1}
        strokeDasharray="1 5"
        strokeLinecap="round"
      />
      <path ref={neutralBack} {...halo} />
      <path ref={neutralLine} fill="none" stroke="rgb(233 235 239 / 0.7)" strokeWidth={1} strokeDasharray="6 5" />
      <text ref={transverseLabel} fill="rgb(233 235 239 / 0.75)" style={text}>
        {t.guides.transverse}
      </text>
      <text ref={neutralLabel} fill="rgb(233 235 239 / 0.95)" style={text}>
        {t.guides.neutral}
      </text>
      <g ref={motion}>
        <circle r={9} fill="none" stroke="rgb(5 7 10 / 0.55)" strokeWidth={3} />
        <circle r={9} fill="none" stroke="var(--amber)" strokeWidth={1} />
        <path d="M-15 0h8M7 0h8M0 -15v8M0 7v8" stroke="rgb(5 7 10 / 0.55)" strokeWidth={3} />
        <path d="M-15 0h8M7 0h8M0 -15v8M0 7v8" stroke="var(--amber)" strokeWidth={1} />
      </g>
    </svg>
  );
}
