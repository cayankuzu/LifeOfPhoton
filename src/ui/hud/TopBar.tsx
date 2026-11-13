'use client';

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Crosshair, Keyboard, Lightbulb, Pause, Play, Telescope, Thermometer } from 'lucide-react';
import { chooseExplainer, chooseLanguage, chooseSingleKeys } from '@/state/preferences';
import { LENSES, type Language, type ViewMode, updateSettings, useSettings } from '@/state/simulation';
import { useMessages } from '../hooks';
import { entryProps } from '../inventory';
import { Button, Divider, IconButton, Kbd, Panel, Segmented, Toggle } from '../primitives';
import { EXPLAINER_ID, EXPLAINER_TOGGLE_ID } from './Explainer';
import { useHudTier } from './tier';

/**
 * Shortcut sheet, anchored under its button. A non-modal dialog: it takes the focus
 * when it opens and gives it back to its button when it closes from the inside.
 */
function HelpSheet({
  onClose,
  trigger,
}: {
  readonly onClose: () => void;
  readonly trigger: RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useMessages();
  const singleKeys = useSettings((state) => state.singleKeys);
  const sheet = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const button = trigger.current;
    sheet.current?.focus();
    return () => {
      // the focus was inside the sheet, which is gone now; a click elsewhere moves it on by itself
      if (!document.activeElement || document.activeElement === document.body) button?.focus();
    };
  }, [trigger]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      // a full-screen dossier opened over the sheet is the top layer then, and the key is its
      if (sheet.current?.closest('[inert]')) return;
      // otherwise the sheet is the top layer: the same stroke must not also close the dossier
      event.preventDefault();
      onClose();
    };
    const onPointer = (event: PointerEvent): void => {
      if (!(event.target instanceof Element) || sheet.current?.contains(event.target)) return;
      // the button that opened the sheet toggles it itself; closing here would let its click reopen it
      if (event.target.closest('[data-help-trigger]')) return;
      onClose();
    };
    // capture phase: before the window handler of the application sees the key
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, [onClose]);

  return (
    <Panel
      ref={sheet}
      role="dialog"
      aria-label={t.help.title}
      tabIndex={-1}
      className="scroll-thin absolute right-0 top-[calc(100%+8px)] z-20 max-h-[calc(100dvh-5.5rem)] w-[min(21rem,calc(100vw-1.5rem))] overflow-y-auto p-3 outline-none"
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
      <div className="mt-2 border-t border-hairline pt-2">
        <Toggle pressed={singleKeys} onChange={chooseSingleKeys} className="-ml-2.5" describedBy="single-keys-note">
          {t.help.singleKeys}
        </Toggle>
        <p id="single-keys-note" className="m-0 mt-1 text-[11.5px] leading-snug text-ink-3">
          {t.help.singleKeysNote}
        </p>
      </div>
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
  const explainer = useSettings((state) => state.explainer);
  const [help, setHelp] = useState(false);
  const helpTrigger = useRef<HTMLButtonElement>(null);
  const closeHelp = useCallback(() => setHelp(false), []);

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
        // it takes the pointer for its tooltip; the view is dragged anywhere else
        <Panel className="shrink-0 select-none px-3 py-2" {...entryProps('title')}>
          {/* the name is the h1 of the page; written in capitals by hand, since CSS would make the i of "Life" an İ in Turkish */}
          <p
            aria-hidden="true"
            className="m-0 whitespace-nowrap font-mono text-[12px] font-semibold leading-none tracking-[0.18em] text-ink"
          >
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
          entry="view"
          explainKey="M"
          options={[
            { value: 'seen', label: t.view.modes.seen.label, hint: t.view.modes.seen.hint },
            { value: 'measured', label: t.view.modes.measured.label, hint: t.view.modes.measured.hint },
          ]}
        />
        <Divider />
        <Toggle pressed={thermal} onChange={(next) => updateSettings({ thermal: next })} entry="thermal" explainKey="T">
          <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />
          {label(t.controls.thermal)}
        </Toggle>
        <Toggle pressed={guides} onChange={(next) => updateSettings({ guides: next })} entry="guides" explainKey="G">
          <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
          {label(t.controls.guides)}
        </Toggle>
        <Button onClick={cycleLens} entry="lens" explainKey="L" aria-label={`${t.controls.lens} ${t.controls.lensValue(lens)}`}>
          <Telescope className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="tabular font-mono text-[11.5px]">{t.controls.lensValue(lens)}</span>
        </Button>
        {/* the name says what a press does; an aria-pressed state as well would contradict it */}
        <IconButton
          label={paused ? t.controls.resume : t.controls.pause}
          onClick={() => updateSettings({ paused: !paused })}
          entry="pause"
        >
          {paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
        </IconButton>
        <Divider />
        {/* the two explanations side by side: plain words first, then the scientific dossier */}
        <Toggle
          id={EXPLAINER_TOGGLE_ID}
          pressed={explainer}
          onChange={chooseExplainer}
          controls={EXPLAINER_ID}
          entry="why"
          explainKey="E"
        >
          <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
          {label(t.explain.toggle)}
        </Toggle>
        <Button
          onClick={() => updateSettings({ dossier: dossierOpen ? null : 'abstract' })}
          entry="dossier"
          explainKey="D"
          aria-expanded={dossierOpen}
          className="text-ink"
        >
          <BookOpen className="h-3.5 w-3.5 text-amber" aria-hidden="true" />
          {tier === 'narrow' ? <span className="sr-only">{t.controls.dossier}</span> : <span>{t.controls.dossier}</span>}
        </Button>
        <IconButton
          ref={helpTrigger}
          label={t.controls.help}
          aria-expanded={help}
          aria-haspopup="dialog"
          data-help-trigger
          entry="shortcuts"
          onClick={() => setHelp((open) => !open)}
        >
          <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
        </IconButton>
        <Button onClick={() => chooseLanguage(otherLanguage)} entry="language" className="w-9 px-0 font-mono text-[11px]">
          {/* each part of the name in its own language: "Dil" in Turkish, "English" in English */}
          <span aria-hidden="true">{otherLanguage.toUpperCase()}</span>
          <span className="sr-only">
            {t.controls.language}: <span lang={otherLanguage}>{t.controls.languageName[otherLanguage]}</span>
          </span>
        </Button>
        {help && <HelpSheet onClose={closeHelp} trigger={helpTrigger} />}
      </Panel>
    </header>
  );
}
