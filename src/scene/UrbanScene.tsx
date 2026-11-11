'use client';

import { Component, type ReactNode, Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { SCENARIO } from '@/physics/scenario';
import { boostByWheel, lookAhead, setLoadPhase, telemetry, turnBy } from '@/state/simulation';
import Simulation from './Simulation';
import { preferredPixelRatio } from './resolution';

/** Reports failures while loading or building the scene instead of leaving a black canvas. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    setLoadPhase('error', 0, error.message);
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

/** Forwards the download progress of the models to the loading screen. */
function DownloadProgress(): null {
  const { progress, active } = useProgress();
  useEffect(() => {
    if (telemetry.phase === 'loading') setLoadPhase('loading', active ? progress / 100 : telemetry.progress);
  }, [progress, active]);
  return null;
}

function supportsWebGL2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

export default function UrbanScene() {
  const surface = useRef<HTMLDivElement | null>(null);
  // This component is only ever rendered in the browser (App.tsx loads it with `ssr: false`), so the
  // first render can ask the browser directly.
  const [supported] = useState(supportsWebGL2);
  // The resolution the scene is drawn at is state of this component and reaches the canvas as
  // a prop: a value set behind the canvas's back is lost the next time the canvas renders.
  const [pixelRatio, setPixelRatio] = useState(() => preferredPixelRatio(window.devicePixelRatio));

  useEffect(() => {
    if (!supported) setLoadPhase('error', 0, 'webgl2');
  }, [supported]);

  // Pointer: drag to look around, wheel to boost, double click to face forward again.
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    // the pointer that drags; a second finger must not move the view
    let pointer: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0 || pointer !== null) return;
      pointer = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      element.setPointerCapture(event.pointerId);
      element.dataset.dragging = 'true';
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerId !== pointer) return;
      // one pixel of drag turns the view by one pixel of the current field of view
      const radiansPerPixel = telemetry.fieldOfView / Math.max(element.clientHeight, 1);
      turnBy((event.clientX - lastX) * radiansPerPixel, (event.clientY - lastY) * radiansPerPixel);
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onPointerUp = (event: PointerEvent): void => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      delete element.dataset.dragging;
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    const onDoubleClick = (): void => lookAhead();

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerUp);
    element.addEventListener('wheel', boostByWheel, { passive: false });
    element.addEventListener('dblclick', onDoubleClick);
    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
      element.removeEventListener('wheel', boostByWheel);
      element.removeEventListener('dblclick', onDoubleClick);
    };
  }, []);

  return (
    <div ref={surface} className="scene-surface absolute inset-0 z-0 touch-pinch-zoom select-none bg-obsidian" aria-hidden="true">
      {supported && (
        <Canvas
          gl={{ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' }}
          flat
          dpr={pixelRatio}
          camera={{ fov: SCENARIO.camera.fieldOfViewDeg, near: 0.1, far: 1500, position: [0, 1.85, 0] }}
          onCreated={({ gl }) => {
            // let the browser restore a lost context instead of leaving a dead canvas
            gl.domElement.addEventListener('webglcontextlost', (event) => event.preventDefault());
          }}
        >
          <SceneBoundary>
            <Suspense fallback={<DownloadProgress />}>
              <Simulation pixelRatio={pixelRatio} onPixelRatio={setPixelRatio} />
            </Suspense>
          </SceneBoundary>
        </Canvas>
      )}
    </div>
  );
}
