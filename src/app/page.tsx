'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import ScientificHUD from '@/components/ScientificHUD';
import { betaToSlider, sliderToBeta } from '@/lib/relativity';
import { Language } from '@/lib/i18n';
import { TelemetryData } from '@/components/UrbanScene';

const UrbanScene = dynamic(() => import('@/components/UrbanScene'), {
  ssr: false,
});

export default function LifeOfPhotonPage() {
  const [beta, setBeta] = useState<number>(0.0);
  const [opticalMode, setOpticalMode] = useState<boolean>(true);
  const [motionActive, setMotionActive] = useState<boolean>(true);
  const [lang, setLang] = useState<Language>('tr');

  const scrollImpulseRef = useRef<number>(0);
  const telemetryRef = useRef<TelemetryData>({
    earthTimeSec: 0,
    properTimeSec: 0,
    earthDistanceMeters: 0,
    contractedDistanceMeters: 0,
  });

  const handleResetTelemetry = useCallback(() => {
    telemetryRef.current = {
      earthTimeSec: 0,
      properTimeSec: 0,
      earthDistanceMeters: 0,
      contractedDistanceMeters: 0,
    };
  }, []);

  // Mouse wheel scroll listener: drives velocity beta from 0.00000c to 0.99999c with logarithmic precision
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      // Allow normal scrolling inside any scrollable panel or modal
      const target = e.target as HTMLElement | null;
      if (target) {
        if (target.closest('[data-modal="true"]')) {
          return;
        }
        const scrollableParent = target.closest('[data-scrollable="true"]');
        if (
          scrollableParent &&
          scrollableParent.scrollHeight > scrollableParent.clientHeight + 2
        ) {
          return;
        }
      }

      e.preventDefault();
      const direction = Math.sign(e.deltaY);
      const magnitude = Math.min(Math.abs(e.deltaY), 160) / 100;

      // Scroll down (deltaY > 0) accelerates toward c; Scroll up decelerates toward 0
      const step = direction * magnitude * 0.018;

      setBeta((prevBeta) => {
        const currentSlider = betaToSlider(prevBeta);
        const nextSlider = Math.max(0, Math.min(1, currentSlider + step));
        return sliderToBeta(nextSlider);
      });

      // Add forward momentum impulse along the avenue when scrolling
      if (direction > 0) {
        scrollImpulseRef.current = Math.min(2.5, scrollImpulseRef.current + magnitude * 0.4);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#05070a]">
      <UrbanScene
        beta={beta}
        opticalMode={opticalMode}
        motionActive={motionActive}
        scrollImpulseRef={scrollImpulseRef}
        telemetryRef={telemetryRef}
      />

      <ScientificHUD
        beta={beta}
        setBeta={setBeta}
        opticalMode={opticalMode}
        setOpticalMode={setOpticalMode}
        motionActive={motionActive}
        setMotionActive={setMotionActive}
        lang={lang}
        setLang={setLang}
        telemetryRef={telemetryRef}
        onResetTelemetry={handleResetTelemetry}
      />
    </main>
  );
}
