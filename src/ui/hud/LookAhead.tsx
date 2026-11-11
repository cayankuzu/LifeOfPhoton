'use client';

import { useRef } from 'react';
import { LocateFixed } from 'lucide-react';
import { lookAhead, telemetry } from '@/state/simulation';
import { useFrame, useMessages } from '../hooks';
import { Button } from '../primitives';
import { useHudTier } from './tier';

/** Turn of the view (rad) beyond which the way back is offered. */
const THRESHOLD = 0.05;

/**
 * A way back to the direction of motion. It appears only while the view is turned
 * away, so it never competes with the scene when it is not needed.
 */
export default function LookAhead() {
  const { t } = useMessages();
  const tier = useHudTier();
  const chip = useRef<HTMLDivElement>(null);

  useFrame(() => {
    const turned = Math.abs(telemetry.yaw) > THRESHOLD || Math.abs(telemetry.pitch) > THRESHOLD;
    if (chip.current) chip.current.hidden = !turned;
  });

  return (
    <div ref={chip} hidden className="pointer-events-auto absolute right-0 top-0">
      <Button onClick={lookAhead} className="border border-hairline bg-panel text-ink" hint="F" aria-label={t.controls.lookAhead}>
        <LocateFixed className="h-3.5 w-3.5 text-amber" aria-hidden="true" />
        {tier !== 'narrow' && t.controls.lookAhead}
      </Button>
    </div>
  );
}
