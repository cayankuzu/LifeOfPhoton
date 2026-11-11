'use client';

import { Component, type ReactNode, Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { boostBy } from '@/physics/kinematics';
import { SCENARIO } from '@/physics/scenario';
import { getSettings, lookAhead, setLoadPhase, telemetry, turnBy, updateSettings } from '@/state/simulation';
import Simulation from './Simulation';

/** Rapidity added per wheel notch (≈ 100 px of scroll): the same boost at every speed. */
const WHEEL_RAPIDITY_PER_NOTCH = 0.045;

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
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const ok = supportsWebGL2();
    setSupported(ok);
    if (!ok) setLoadPhase('error', 0, 'webgl2');
  }, []);

  // Pointer: drag to look around, wheel to boost, double click to face forward again.
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      element.setPointerCapture(event.pointerId);
      element.dataset.dragging = 'true';
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (!dragging) return;
      // one pixel of drag turns the view by one pixel of the current field of view
      const radiansPerPixel = telemetry.fieldOfView / Math.max(element.clientHeight, 1);
      turnBy((event.clientX - lastX) * radiansPerPixel, (event.clientY - lastY) * radiansPerPixel);
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onPointerUp = (event: PointerEvent): void => {
      dragging = false;
      delete element.dataset.dragging;
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const pixels = event.deltaMode === 1 ? event.deltaY * 33 : event.deltaMode === 2 ? event.deltaY * 400 : event.deltaY;
      const notches = Math.max(-3, Math.min(3, pixels / 100));
      // rolling the wheel away from you pushes the throttle forward
      updateSettings({ beta: boostBy(getSettings().beta, -notches * WHEEL_RAPIDITY_PER_NOTCH) });
    };
    const onDoubleClick = (): void => lookAhead();

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerUp);
    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('dblclick', onDoubleClick);
    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('dblclick', onDoubleClick);
    };
  }, []);

  return (
    <div ref={surface} className="scene-surface absolute inset-0 z-0 touch-none select-none bg-obsidian" aria-hidden="true">
      {supported && (
        <Canvas
          gl={{ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' }}
          flat
          dpr={1}
          camera={{ fov: SCENARIO.camera.fieldOfViewDeg, near: 0.1, far: 1500, position: [0, 1.85, 0] }}
          onCreated={({ gl }) => {
            // let the browser restore a lost context instead of leaving a dead canvas
            gl.domElement.addEventListener('webglcontextlost', (event) => event.preventDefault());
          }}
        >
          <SceneBoundary>
            <Suspense fallback={<DownloadProgress />}>
              <Simulation />
            </Suspense>
          </SceneBoundary>
        </Canvas>
      )}
    </div>
  );
}
