'use client';

/**
 * The instrument dock: every number the theory attaches to the current speed,
 * computed from the velocity the simulation is actually at and written straight
 * into the DOM once per frame.
 */

import { type ReactNode, useRef } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import {
  formatAngle,
  formatClock,
  formatExposure,
  formatFixed,
  formatGamma,
  formatLength,
  formatTemperature,
  formatWavelength,
} from '@/i18n/format';
import { classifyWavelength } from '@/physics/bands';
import { CANDELA_WAVELENGTH_NM } from '@/physics/constants';
import { toExposureValue } from '@/physics/exposure';
import { kinematicState } from '@/physics/kinematics';
import { neutralConeAngle, transversePlaneApparentAngle } from '@/physics/optics';
import { SCENARIO } from '@/physics/scenario';
import { getSettings, resetClocks, telemetry, updateSettings, useSettings } from '@/state/simulation';
import { setText, useFrame, useMessages } from '../hooks';
import { IconButton, Panel } from '../primitives';
import SpectrumStrip from './SpectrumStrip';

const DEGREES = 180 / Math.PI;

/** One instrument: what it is on the left, its reading on the right; the note explains it on hover and to screen readers. */
function Row({ label, note, children }: { readonly label: ReactNode; readonly note?: string; readonly children: ReactNode }) {
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-hairline py-[5px] first:border-t-0"
      title={note}
    >
      <dt className="min-w-0 truncate text-[11.5px] leading-4 text-ink-2">
        {label}
        {note && <span className="sr-only"> ({note})</span>}
      </dt>
      <dd className="m-0 whitespace-nowrap text-right">{children}</dd>
    </div>
  );
}

const VALUE = 'tabular font-mono text-[13px] leading-4 text-ink';
const UNIT = 'ml-1 font-mono text-[10.5px] text-ink-3';

export default function InstrumentDock() {
  const { language, t } = useMessages();
  const open = useSettings((state) => state.dock);
  // the optical instruments describe what is seen; in the measured view nothing is shifted or aberrated
  const optical = useSettings((state) => state.view === 'seen');

  const regime = useRef<HTMLParagraphElement>(null);
  const tau = useRef<HTMLSpanElement>(null);
  const street = useRef<HTMLSpanElement>(null);
  const road = useRef<HTMLSpanElement>(null);
  const roadUnit = useRef<HTMLSpanElement>(null);
  const transverse = useRef<HTMLSpanElement>(null);
  const cone = useRef<HTMLSpanElement>(null);
  const aheadValue = useRef<HTMLSpanElement>(null);
  const aheadBand = useRef<HTMLSpanElement>(null);
  const behindValue = useRef<HTMLSpanElement>(null);
  const behindBand = useRef<HTMLSpanElement>(null);
  const ambient = useRef<HTMLSpanElement>(null);
  const exposure = useRef<HTMLSpanElement>(null);

  useFrame(() => {
    const k = kinematicState(telemetry.beta);
    const measured = getSettings().view === 'measured';
    const transverseDeg = transversePlaneApparentAngle(k.beta) * DEGREES;
    const coneDeg = neutralConeAngle(k.beta) * DEGREES;
    const ambientAhead = SCENARIO.environment.temperatureK * k.dopplerAhead;
    const length = formatLength(100 * k.contraction, language);

    // one sentence on what this speed does to the view
    let sentence: string;
    if (measured) sentence = t.regime.measured(`${length.value} ${length.unit}`);
    else if (k.beta < 0.02) sentence = t.regime.rest;
    else if (k.beta < 0.3) sentence = t.regime.slow(formatAngle(transverseDeg, language));
    else if (k.dopplerAhead < 3.3)
      sentence = t.regime.moderate(formatAngle(transverseDeg, language), formatFixed(k.dopplerAhead, 2, language));
    else if (k.beta < 0.97)
      sentence = t.regime.fast(formatAngle(transverseDeg, language), formatTemperature(ambientAhead, language));
    else if (k.beta < 0.9995) sentence = t.regime.extreme(formatAngle(coneDeg, language), formatAngle(transverseDeg, language));
    else sentence = t.regime.limit(formatAngle(transverseDeg, language), formatGamma(k.gamma, language));
    setText(regime.current, sentence);

    setText(tau.current, formatClock(telemetry.properTime, language));
    setText(street.current, formatClock(telemetry.earthTime, language));
    setText(road.current, length.value);
    setText(roadUnit.current, length.unit);
    setText(transverse.current, formatAngle(transverseDeg, language));
    setText(cone.current, k.beta === 0 ? '—' : formatAngle(coneDeg, language));

    const ahead = CANDELA_WAVELENGTH_NM / k.dopplerAhead;
    const behind = CANDELA_WAVELENGTH_NM * k.dopplerAhead;
    const aheadText = formatWavelength(ahead, language);
    const behindText = formatWavelength(behind, language);
    setText(aheadValue.current, `${aheadText.value} ${aheadText.unit}`);
    setText(aheadBand.current, t.bands[classifyWavelength(ahead).id]);
    setText(behindValue.current, `${behindText.value} ${behindText.unit}`);
    setText(behindBand.current, t.bands[classifyWavelength(behind).id]);
    setText(ambient.current, formatTemperature(ambientAhead, language));
    setText(exposure.current, formatExposure(toExposureValue(telemetry.lnExposure), language));
  });

  return (
    <Panel className="flex max-h-full min-h-0 w-[18rem] max-w-full flex-col" aria-label={t.dock.title}>
      <div className="flex items-center justify-between gap-2 py-1 pl-3 pr-1">
        <h2 className="label m-0">{t.dock.title}</h2>
        <IconButton
          label={open ? t.controls.collapse : t.controls.expand}
          aria-expanded={open}
          onClick={() => updateSettings({ dock: !open })}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </IconButton>
      </div>

      <p
        ref={regime}
        className="m-0 min-h-[3.4rem] border-t border-hairline px-3 py-2 text-[12px] leading-[1.45] text-ink-2"
        aria-live="polite"
      />

      {open && (
        <div className="scroll-thin max-h-[26rem] min-h-0 overflow-y-auto border-t border-hairline px-3 pb-2.5">
          <dl className="m-0">
            <Row label={t.dock.properTime} note={t.dock.rate}>
              <span className="inline-flex items-center gap-1">
                <IconButton label={t.controls.resetClocks} onClick={resetClocks} className="-my-1.5 h-6 w-6">
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                </IconButton>
                <span ref={tau} className={`${VALUE} text-violet`} />
              </span>
            </Row>
            <Row label={t.dock.streetTime}>
              <span ref={street} className={VALUE} />
            </Row>
            <Row label={t.dock.road} note={t.dock.roadNote}>
              <span ref={road} className={`${VALUE} text-cryo`} />
              <span ref={roadUnit} className={UNIT} />
            </Row>
            {optical && (
              <>
                <Row label={t.dock.transverse} note={t.dock.transverseNote}>
                  <span ref={transverse} className={VALUE} />
                </Row>
                <Row label={t.dock.neutralCone} note={t.dock.neutralConeNote}>
                  <span ref={cone} className={VALUE} />
                </Row>
                <Row label={`${t.dock.reference} · ${t.dock.ahead}`}>
                  <span ref={aheadBand} className="mr-2 text-[10.5px] text-ink-3" />
                  <span ref={aheadValue} className={VALUE} />
                </Row>
                <Row label={`${t.dock.reference} · ${t.dock.behind}`}>
                  <span ref={behindBand} className="mr-2 text-[10.5px] text-ink-3" />
                  <span ref={behindValue} className={VALUE} />
                </Row>
                <Row label={`${t.dock.ambient} · ${t.dock.ahead}`} note={t.dock.ambientNote}>
                  <span ref={ambient} className={VALUE} />
                  <span className={UNIT}>K</span>
                </Row>
                <Row label={t.dock.exposure} note={t.dock.exposureNote}>
                  <span ref={exposure} className={VALUE} />
                  <span className={UNIT}>EV</span>
                </Row>
              </>
            )}
          </dl>
          {optical && (
            <div className="mt-1 border-t border-hairline pt-2">
              <p className="label mb-1.5">{t.dock.spectrum}</p>
              <SpectrumStrip />
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
