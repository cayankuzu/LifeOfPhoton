'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Crosshair, Keyboard, Pause, Play, Telescope, Thermometer } from 'lucide-react';
import { LENSES, type Language, type ViewMode, updateSettings, useSettings } from '@/state/simulation';
import { useMessages } from '../hooks';
import { Button, Divider, IconButton, Kbd, Panel, Segmented, Toggle } from '../primitives';
import { useHudTier } from './tier';

/** Shortcut sheet, anchored under its button. */
function HelpSheet({ onClose }: { readonly onClose: () => void }) {
  const { t } = useMessages();
  const sheet = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    const onPointer = (event: PointerEvent): void => {
      if (!(event.target instanceof Element) || sheet.current?.contains(event.target)) return;
      // the button that opened the sheet toggles it itself; closing here would let its click reopen it
      if (event.target.closest('[data-help-trigger]')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, [onClose]);

  return (
    <Panel
      ref={sheet}
      role="dialog"
      aria-label={t.help.title}
      className="scroll-thin absolute right-0 top-[calc(100%+8px)] z-20 max-h-[calc(100dvh-5.5rem)] w-[min(21rem,calc(100vw-1.5rem))] overflow-y-auto p-3"
    >
      <p className="label mb-2">{t.help.title}</p>
      <dl className="m-0 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-[12px] text-ink-2">
        {t.help.pointer.map(([gesture, action]) => (
          <div key={gesture} className="contents">
            <dt className="font-mono text-[11px] text-ink">{gesture}</dt>
            <dd className="m-0">{action}</dd>
          </div>
        ))}
        <div className="col-span-2 my-1 h-px bg-hairline" />
        {t.help.rows.map(([keys, action]) => (
          <div key={keys} className="contents">
            <dt>
              <Kbd>{keys}</Kbd>
            </dt>
            <dd className="m-0">{action}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

export default function TopBar() {
  const { language, t } = useMessages();
  const tier = useHudTier();
  const view = useSettings((state) => state.view);
  const thermal = useSettings((state) => state.thermal);
  const guides = useSettings((state) => state.guides);
  const lens = useSettings((state) => state.lens);
  const paused = useSettings((state) => state.paused);
  const dossierOpen = useSettings((state) => state.dossier !== null);
  const [help, setHelp] = useState(false);

  const otherLanguage: Language = language === 'tr' ? 'en' : 'tr';
  const cycleLens = (): void => {
    updateSettings({ lens: LENSES[(LENSES.indexOf(lens) + 1) % LENSES.length] });
  };
  // text labels beside the icons only where there is room for them
  const labelled = tier === 'wide';
  const label = (text: string) => (labelled ? <span>{text}</span> : <span className="sr-only">{text}</span>);

  return (
    <header className={`flex items-start gap-2 ${tier === 'narrow' ? 'justify-end' : 'justify-between'}`}>
      {/* the name gives way to the controls where room is short */}
      {tier !== 'narrow' && (
        <Panel className="pointer-events-none shrink-0 select-none px-3 py-2">
          <p className="m-0 whitespace-nowrap font-mono text-[12px] font-semibold leading-none tracking-[0.18em] text-ink">
            LIFE OF A PHOTON
          </p>
          {tier === 'wide' && <p className="m-0 mt-1.5 whitespace-nowrap text-[11px] leading-none text-ink-3">{t.app.tagline}</p>}
        </Panel>
      )}

      <Panel className="relative flex min-w-0 flex-wrap items-center justify-end gap-0.5 p-1" id="controls">
        <Segmented<ViewMode>
          label={t.view.group}
          value={view}
          onChange={(next) => updateSettings({ view: next })}
          options={[
            { value: 'seen', label: t.view.modes.seen.label, hint: t.view.modes.seen.hint },
            { value: 'measured', label: t.view.modes.measured.label, hint: t.view.modes.measured.hint },
          ]}
        />
        <Divider />
        <Toggle pressed={thermal} onChange={(next) => updateSettings({ thermal: next })} hint={t.controls.thermalHint}>
          <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />
          {label(t.controls.thermal)}
        </Toggle>
        <Toggle pressed={guides} onChange={(next) => updateSettings({ guides: next })} hint={t.controls.guidesHint}>
          <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
          {label(t.controls.guides)}
        </Toggle>
        <Button onClick={cycleLens} hint={t.controls.lensHint} aria-label={`${t.controls.lens} ${t.controls.lensValue(lens)}`}>
          <Telescope className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="tabular font-mono text-[11.5px]">{t.controls.lensValue(lens)}</span>
        </Button>
        <IconButton
          label={paused ? t.controls.resume : t.controls.pause}
          aria-pressed={paused}
          onClick={() => updateSettings({ paused: !paused })}
        >
          {paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
        </IconButton>
        <Divider />
        <Button
          onClick={() => updateSettings({ dossier: dossierOpen ? null : 'abstract' })}
          hint={t.controls.dossierHint}
          aria-expanded={dossierOpen}
          className="text-ink"
        >
          <BookOpen className="h-3.5 w-3.5 text-amber" aria-hidden="true" />
          {tier === 'narrow' ? <span className="sr-only">{t.controls.dossier}</span> : <span>{t.controls.dossier}</span>}
        </Button>
        <IconButton label={t.controls.help} aria-expanded={help} data-help-trigger onClick={() => setHelp((open) => !open)}>
          <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
        </IconButton>
        <Button
          onClick={() => updateSettings({ language: otherLanguage })}
          aria-label={`${t.controls.language}: ${t.controls.languageName[otherLanguage]}`}
          hint={t.controls.languageName[otherLanguage]}
          lang={otherLanguage}
          className="w-9 px-0 font-mono text-[11px]"
        >
          {otherLanguage.toUpperCase()}
        </Button>
        {help && <HelpSheet onClose={() => setHelp(false)} />}
      </Panel>
    </header>
  );
}
