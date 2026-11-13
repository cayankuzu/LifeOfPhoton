'use client';

/**
 * The marks of the panel "Why does it look like this?": while the reader rests on a text of the panel
 * (src/ui/hud/Explainer.tsx sets the target, src/ui/pointing.ts holds it), the thing it talks about is
 * marked on the screen. A thing in the picture gets a thin amber circle, a cone its curve, and one
 * outside the view an arrow at the edge the way to turn; an instrument or a control of the interface
 * gets an outline (found by its `data-explain-entry`). A short name stands beside a mark, never on it.
 *
 * Two layers, each drawing only its part of a target. The marks in the picture ("scene") lie in the stage
 * over the scene and the guide layer but under the HUD: a curve or a circle passes behind the dock, the
 * panel and the speed rail rather than across their words. The outlines of the interface ("interface") lie
 * over the HUD, under the dossier. Neither is in the way of the pointer, and both are hidden from assistive
 * technology (the text a mark belongs to says everything). The positions are written in place every frame
 * while a target is set, as the guide layer writes its circles: React renders only when the target
 * changes. A new mark fades in, except under prefers-reduced-motion (globals.css).
 */

import { type RefObject, useRef, useSyncExternalStore } from 'react';
import { getSettings, telemetry } from '@/state/simulation';
import { useFrame, useMessages } from '../hooks';
import type { InventoryId } from '../inventory';
import { type CoveredBox, type MarkShape, getPointerTarget, resolveMark, subscribePointerTarget } from '../pointing';

/** Outlines drawn at most: an entry can be on screen in more than one place. */
const MAX_OUTLINES = 6;
/** Space between an element and its outline, px. */
const OUTLINE_GAP = 3;
/** Room a label needs beside a mark before it moves to the other side, px. */
const LABEL_ROOM = 150;

const fixed = (value: number): string => value.toFixed(1);

/** The panels over the stage that can hide a thing of the picture: the top bar's, the dock and the panel "Why?". */
const PANELS = '#controls, #explainer, [data-explain-entry="dock"], [data-explain-entry="title"]';

/** The boxes of the panels over the stage, in its pixels (a panel that is not shown has none). */
function coveredBoxes(stage: HTMLElement, box: DOMRect): CoveredBox[] {
  const boxes: CoveredBox[] = [];
  stage.querySelectorAll(PANELS).forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0)
      boxes.push({
        left: rect.left - box.left,
        top: rect.top - box.top,
        right: rect.right - box.left,
        bottom: rect.bottom - box.top,
      });
  });
  return boxes;
}

/** Path of the curves of a shape. */
function curvePath(shape: Extract<MarkShape, { kind: 'curves' }>): string {
  return shape.paths.map((path) => path.map((p, i) => `${i === 0 ? 'M' : 'L'}${fixed(p[0])} ${fixed(p[1])}`).join('')).join('');
}

function show(element: Element | null, visible: boolean): void {
  if (element instanceof SVGElement && element.style.display !== (visible ? '' : 'none'))
    element.style.display = visible ? '' : 'none';
}

/** Draws the outlines of the elements of the interface that carry these entries into the groups `outlines`. */
function drawOutlines(elements: readonly InventoryId[], outlines: ReadonlyArray<SVGGElement | null>): void {
  const boxes: DOMRect[] = [];
  for (const id of elements) {
    document.querySelectorAll(`[data-explain-entry="${id}"]`).forEach((element) => {
      const rect = element.getBoundingClientRect();
      // an element that is hidden (or not laid out on this screen) has no box
      if (rect.width > 0 && rect.height > 0) boxes.push(rect);
    });
  }
  outlines.forEach((outline, index) => {
    const rect = boxes[index];
    show(outline, rect !== undefined);
    if (!outline || !rect) return;
    for (const shapeElement of Array.from(outline.children)) {
      shapeElement.setAttribute('x', fixed(rect.left - OUTLINE_GAP));
      shapeElement.setAttribute('y', fixed(rect.top - OUTLINE_GAP));
      shapeElement.setAttribute('width', fixed(rect.width + 2 * OUTLINE_GAP));
      shapeElement.setAttribute('height', fixed(rect.height + 2 * OUTLINE_GAP));
    }
  });
}

/**
 * One layer of the marks: `scene` is placed inside the stage (`view`), whose box it fills, and draws in the
 * coordinates of that box; `interface` covers the window and draws in its coordinates.
 */
export default function Pointer({
  view,
  layer,
}: {
  readonly view: RefObject<HTMLElement | null>;
  readonly layer: 'scene' | 'interface';
}) {
  const { t } = useMessages();
  const target = useSyncExternalStore(subscribePointerTarget, getPointerTarget, () => null);

  const scene = useRef<SVGGElement>(null);
  const spotBack = useRef<SVGCircleElement>(null);
  const spot = useRef<SVGCircleElement>(null);
  const curveBack = useRef<SVGPathElement>(null);
  const curve = useRef<SVGPathElement>(null);
  const arrow = useRef<SVGGElement>(null);
  const label = useRef<SVGTextElement>(null);
  const outlines = useRef<Array<SVGGElement | null>>([]);

  useFrame(() => {
    if (!target) return;
    if (layer === 'interface') {
      drawOutlines(target.pointing.elements ?? [], outlines.current);
      return;
    }
    const stage = view.current;
    const box = stage?.getBoundingClientRect();

    // --- the mark in the picture, while the scene is on show
    const mark = target.pointing.scene;
    const ready = telemetry.phase === 'ready' && stage !== null && !stage.hasAttribute('inert');
    const shape =
      mark && ready && box
        ? resolveMark(mark, {
            beta: telemetry.beta,
            optical: telemetry.optical,
            travel: telemetry.travel,
            yaw: telemetry.yaw,
            pitch: telemetry.pitch,
            fieldOfView: telemetry.fieldOfView,
            thermal: getSettings().thermal,
            width: box.width,
            height: box.height,
            covered: coveredBoxes(stage, box),
          })
        : null;
    show(scene.current, shape !== null);
    if (shape && box) {
      for (const element of [spotBack.current, spot.current]) {
        show(element, shape.kind === 'spot');
        if (shape.kind === 'spot') {
          element?.setAttribute('cx', fixed(shape.at[0]));
          element?.setAttribute('cy', fixed(shape.at[1]));
          element?.setAttribute('r', fixed(shape.radius));
        }
      }
      const d = shape.kind === 'curves' ? curvePath(shape) : '';
      curveBack.current?.setAttribute('d', d);
      curve.current?.setAttribute('d', d);
      show(arrow.current, shape.kind === 'edge');
      if (shape.kind === 'edge')
        arrow.current?.setAttribute(
          'transform',
          `translate(${fixed(shape.at[0])} ${fixed(shape.at[1])}) rotate(${fixed((shape.angle * 180) / Math.PI)})`
        );

      // the name beside the mark: right of a circle (left near the right edge), inwards of an arrow, at the label place of a curve
      const text = label.current;
      if (text) {
        let place: { x: number; y: number; anchor: 'start' | 'middle' | 'end' } | null = null;
        if (shape.kind === 'spot') {
          const right = shape.at[0] + shape.radius + 6 + LABEL_ROOM <= box.width;
          place = {
            x: shape.at[0] + (right ? 1 : -1) * (shape.radius + 6),
            y: Math.min(box.height - 6, Math.max(14, shape.at[1] + 4)),
            anchor: right ? 'start' : 'end',
          };
        } else if (shape.kind === 'edge') {
          const cos = Math.cos(shape.angle);
          const sin = Math.sin(shape.angle);
          place = {
            x: shape.at[0] - cos * 16,
            y: shape.at[1] - sin * 20 + 4,
            anchor: cos > 0.5 ? 'end' : cos < -0.5 ? 'start' : 'middle',
          };
        } else if (shape.anchor) {
          place = { x: shape.anchor[0] + 8, y: shape.anchor[1] - 6, anchor: 'start' };
        }
        show(text, place !== null);
        if (place) {
          text.setAttribute('x', fixed(place.x));
          text.setAttribute('y', fixed(place.y));
          text.setAttribute('text-anchor', place.anchor);
        }
      }
    }
  });

  if (!target) return null;
  const sceneMark = target.pointing.scene;
  if (layer === 'scene' ? !sceneMark : !target.pointing.elements) return null;

  const halo = { stroke: 'rgb(5 7 10 / 0.6)', strokeWidth: 3, fill: 'none' } as const;
  const line = { stroke: 'var(--amber)', strokeWidth: 1.25, fill: 'none' } as const;
  const text = {
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 11,
    paintOrder: 'stroke',
    stroke: 'rgb(5 7 10 / 0.85)',
    strokeWidth: 3,
    strokeLinejoin: 'round',
  } as const;

  if (layer === 'interface')
    return (
      <svg
        // a new target fades in (the class's animation is removed under prefers-reduced-motion)
        key={target.source}
        aria-hidden="true"
        className="explainer-in pointer-events-none fixed inset-0 z-[15] h-full w-full"
      >
        {Array.from({ length: MAX_OUTLINES }, (_, index) => (
          <g
            key={index}
            ref={(element) => {
              outlines.current[index] = element;
            }}
            style={{ display: 'none' }}
          >
            <rect rx={7} {...halo} />
            <rect rx={7} {...line} />
          </g>
        ))}
      </svg>
    );

  return (
    // over the scene and the guide layer (z-[5]), under the HUD (z-10); the svg clips to the stage's box
    <svg
      key={target.source}
      aria-hidden="true"
      className="explainer-in pointer-events-none absolute inset-0 z-[6] h-full w-full overflow-hidden"
    >
      <g ref={scene} style={{ display: 'none' }}>
        <circle ref={spotBack} {...halo} />
        <circle ref={spot} {...line} />
        <path ref={curveBack} {...halo} strokeLinejoin="round" />
        <path ref={curve} {...line} strokeLinejoin="round" />
        <g ref={arrow}>
          <path d="M-7 -8L3 0L-7 8" {...halo} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M-7 -8L3 0L-7 8" {...line} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <text ref={label} fill="var(--amber)" style={text}>
          {sceneMark && t.pointer[sceneMark]}
        </text>
      </g>
    </svg>
  );
}
