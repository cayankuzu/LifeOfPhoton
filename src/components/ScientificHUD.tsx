'use client';

import React, { useEffect, useState } from 'react';
import {
  betaToSlider,
  computeRelativisticState,
  DEFAULT_EMIT_WAVELENGTH_NM,
  formatBeta,
  formatGamma,
  MAX_BETA,
  RELATIVISTIC_PRESETS,
  sliderToBeta,
  wavelengthToColorInfo,
} from '@/lib/relativity';
import { getRegimeCommentary, Language, UI_TEXT } from '@/lib/i18n';
import StoryGuideModal from './StoryGuideModal';
import { TelemetryData } from './UrbanScene';
import LorentzCurveChart from './LorentzCurveChart';
import {
  ChevronDown,
  ChevronUp,
  LineChart,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface ScientificHUDProps {
  beta: number;
  setBeta: (val: number) => void;
  opticalMode: boolean;
  setOpticalMode: (val: boolean) => void;
  motionActive: boolean;
  setMotionActive: (val: boolean) => void;
  lang: Language;
  setLang: (val: Language) => void;
  telemetryRef: React.MutableRefObject<TelemetryData>;
  onResetTelemetry: () => void;
}

function formatClock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export default function ScientificHUD({
  beta,
  setBeta,
  opticalMode,
  setOpticalMode,
  motionActive,
  setMotionActive,
  lang,
  setLang,
  telemetryRef,
  onResetTelemetry,
}: ScientificHUDProps) {
  const [hudExpanded, setHudExpanded] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [liveTelemetry, setLiveTelemetry] = useState<TelemetryData>({
    earthTimeSec: 0,
    properTimeSec: 0,
    earthDistanceMeters: 0,
    contractedDistanceMeters: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTelemetry({
        earthTimeSec: telemetryRef.current.earthTimeSec,
        properTimeSec: telemetryRef.current.properTimeSec,
        earthDistanceMeters: telemetryRef.current.earthDistanceMeters,
        contractedDistanceMeters: telemetryRef.current.contractedDistanceMeters,
      });
    }, 40);
    return () => clearInterval(interval);
  }, [telemetryRef]);

  const isTr = lang === 'tr';
  const t = UI_TEXT[lang];
  const rel = computeRelativisticState(beta, DEFAULT_EMIT_WAVELENGTH_NM);
  const commentary = getRegimeCommentary(rel.beta, rel.gamma, lang);
  const forwardColor = wavelengthToColorInfo(rel.wavelengthForwardNm, lang);
  const sliderVal = betaToSlider(beta);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 font-mono select-none">
      {/* DOSSIER & DEEP EXPERIMENT JOURNAL MODAL */}
      <StoryGuideModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        lang={lang}
        onSelectBetaAndClose={(targetBeta, targetOpt) => {
          setBeta(targetBeta);
          if (typeof targetOpt === 'boolean') setOpticalMode(targetOpt);
          setStoryModalOpen(false);
        }}
      />

      {/* =====================================================================
          TOP HEADER: LABORATORY GRADE SCIENTIFIC CONSOLE
      ===================================================================== */}
      <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#07090e]/92 px-4 py-2.5 shadow-2xl backdrop-blur-2xl">
        {/* Left: Brand & Photon Reference Frame Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pr-3 border-r border-white/10">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800 text-[11px] font-black text-amber-400">
              c
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-widest text-zinc-100">
                LIFE OF A PHOTON
              </span>
              <span className="text-[9px] tracking-wider text-zinc-400">
                {isTr ? 'ÖZEL GÖRELİLİK & FOTON GÖZLEMEVİ' : 'SPECIAL RELATIVITY OBSERVATORY'}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>{isTr ? 'FOTON REFERANS ÇERÇEVESİ (1. KİŞİ)' : 'PHOTON REFERENCE FRAME (1P)'}</span>
          </div>
        </div>

        {/* Center: High-Precision Monospace Telemetry Strip */}
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-950/90 px-3.5 py-1 text-xs">
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] text-zinc-500">v:</span>
            <span className="font-black text-amber-400 tabular-nums">{formatBeta(rel.beta)}c</span>
          </div>
          <span className="text-zinc-700">/</span>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-zinc-100 tabular-nums">
              {Math.round(rel.velocityKms).toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-500">km/s</span>
          </div>
          <span className="text-zinc-700">/</span>
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] text-zinc-500">γ:</span>
            <span className="font-bold text-cyan-300 tabular-nums">{formatGamma(rel.gamma)}</span>
          </div>
          <span className="hidden sm:inline text-zinc-700">/</span>
          <div className="hidden sm:flex items-baseline gap-1">
            <span className="text-[10px] text-zinc-500">dτ/dt:</span>
            <span className="font-bold text-violet-300 tabular-nums">
              {(1 / rel.gamma).toFixed(4)}
            </span>
          </div>
        </div>

        {/* Right: Optical Mode Switcher & Lab Journal Access */}
        <div className="flex items-center gap-2 text-xs">
          {/* Mode Switcher: Relativistic Optics vs Pure Lorentz Contraction */}
          <div className="flex items-center rounded-lg border border-white/10 bg-zinc-950/80 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setOpticalMode(true)}
              className={`rounded px-2.5 py-1 font-bold transition ${
                opticalMode ? 'bg-zinc-200 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t.opticalMode}
            </button>
            <button
              type="button"
              onClick={() => setOpticalMode(false)}
              className={`rounded px-2.5 py-1 font-bold transition ${
                !opticalMode ? 'bg-zinc-200 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t.geometricMode}
            </button>
          </div>

          {/* Dossier button */}
          <button
            type="button"
            onClick={() => setStoryModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-bold text-amber-300 transition hover:bg-amber-400/20"
          >
            <Sparkles className="h-3 w-3" />
            <span>{t.dossierBtn}</span>
          </button>

          {/* Pause/Play */}
          <button
            type="button"
            onClick={() => setMotionActive(!motionActive)}
            title={motionActive ? 'Hareketi Duraklat' : 'Hareketi Başlat'}
            className="rounded-lg border border-white/10 bg-zinc-950/80 p-1.5 text-zinc-300 hover:text-white"
          >
            {motionActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>

          {/* Lang */}
          <button
            type="button"
            onClick={() => setLang(isTr ? 'en' : 'tr')}
            className="rounded-lg border border-white/10 bg-zinc-950/80 px-2.5 py-1 text-[11px] font-bold text-zinc-300 hover:text-white"
          >
            {isTr ? 'EN' : 'TR'}
          </button>
        </div>
      </header>

      {/* =====================================================================
          FLOATING TELEMETRY INSTRUMENT DOCK (COMPACT & NON-OBTRUSIVE)
      ===================================================================== */}
      <div className="relative my-auto flex flex-1 items-end justify-start">
        <aside className="pointer-events-auto mb-2 flex w-full max-w-sm flex-col rounded-xl border border-white/10 bg-[#07090e]/92 p-3.5 shadow-2xl backdrop-blur-2xl sm:max-w-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-[11px] font-black tracking-wider text-zinc-100 uppercase">
                {commentary.badge}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowChart(!showChart)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold border transition ${
                  showChart
                    ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200'
                    : 'border-white/10 text-zinc-400 hover:text-white'
                }`}
                title="Lorentz Eğrisi Grafiği"
              >
                <LineChart className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setHudExpanded(!hudExpanded)}
                className="rounded p-1 text-zinc-400 hover:text-white"
              >
                {hudExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {hudExpanded && (
            <div className="mt-2.5 flex flex-col gap-2.5 text-xs">
              {/* Optional Inline Precision Lorentz Curve Chart */}
              {showChart && (
                <div className="border-b border-white/10 pb-2">
                  <LorentzCurveChart
                    beta={beta}
                    onSelectBeta={setBeta}
                    title="LORENTZ FAKTÖRÜ ASİMPTOTİK EĞRİSİ"
                    subtitle="Hız c'ye yaklaştıkça uzay ve zaman sonsuza doğru bükülür"
                  />
                </div>
              )}

              {/* 1 Crisp Physical Reality Sentence */}
              <p className="text-[11.5px] leading-relaxed text-zinc-300">
                {commentary.summary}
              </p>

              {/* 4 Precision Scientific Data Cards */}
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2 text-[11px]">
                {/* 1. ÖZ ZAMAN (TAU) VS DÜNYA ZAMANI */}
                <div className="flex flex-col rounded-lg bg-zinc-950/60 p-2 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-400">ÖZ SAAT (τ)</span>
                    <button
                      type="button"
                      onClick={onResetTelemetry}
                      title={t.resetClock}
                      className="p-0.5 text-zinc-500 hover:text-zinc-200"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <span className="text-base font-black text-violet-300 tabular-nums">
                    {formatClock(liveTelemetry.properTimeSec)}
                  </span>
                  <div className="flex items-center justify-between text-[9.5px] text-zinc-500">
                    <span>Dünya: {formatClock(liveTelemetry.earthTimeSec)}</span>
                    <span className="text-violet-400 font-bold">
                      {beta >= 0.99998 ? '0.00× (DURDU)' : `${(1 / rel.gamma).toFixed(3)}×`}
                    </span>
                  </div>
                </div>

                {/* 2. UZUNLUK BÜZÜLMESİ (L = L0 / gamma) */}
                <div className="flex flex-col rounded-lg bg-zinc-950/60 p-2 border border-white/5">
                  <span className="text-[10px] font-semibold text-zinc-400">100M CADDE BOYU</span>
                  <span className="text-base font-black text-emerald-400 tabular-nums">
                    {(100 / rel.gamma).toFixed(1)} m
                  </span>
                  <div className="flex items-center justify-between text-[9.5px] text-zinc-500">
                    <span>L = L₀ / γ</span>
                    <span className="text-emerald-400 font-bold">
                      -%{((1 - 1 / rel.gamma) * 100).toFixed(0)} büzülme
                    </span>
                  </div>
                </div>

                {/* 3. PENROSE IŞIK SAPMASI (ABERRATION) */}
                <div className="flex flex-col rounded-lg bg-zinc-950/60 p-2 border border-white/5">
                  <span className="text-[10px] font-semibold text-zinc-400">PENROSE SAPMASI</span>
                  <span className="text-base font-black text-amber-300 tabular-nums">
                    90° → {rel.aberrationSideAngleDeg.toFixed(1)}°
                  </span>
                  <div className="flex items-center justify-between text-[9.5px] text-zinc-500">
                    <span>Yan Binalar</span>
                    <span className="text-amber-400 font-bold">Ön Koniye Kaydı</span>
                  </div>
                </div>

                {/* 4. DOPPLER ÇARPANI & TAYF */}
                <div className="flex flex-col rounded-lg bg-zinc-950/60 p-2 border border-white/5">
                  <span className="text-[10px] font-semibold text-zinc-400">DOPPLER & TAYF</span>
                  <div className="flex items-center gap-1.5 my-auto">
                    <span
                      className="h-3 w-3 rounded-full border border-white/40 shadow-sm shrink-0"
                      style={{ backgroundColor: forwardColor.hex }}
                    />
                    <span className="truncate text-xs font-bold text-zinc-100">
                      {Math.round(rel.wavelengthForwardNm)} nm
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9.5px] text-zinc-500">
                    <span className="truncate">{forwardColor.bandName.split(' ')[0]}</span>
                    <span className="text-cyan-400 font-bold">D={rel.dopplerForward.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* =====================================================================
          BOTTOM CONTROL DOCK: TACTILE SPEED SCRUBBER & PRESET CHIPS
      ===================================================================== */}
      <footer className="pointer-events-auto rounded-xl border border-white/10 bg-[#07090e]/92 px-4 py-2.5 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          {/* Quick-Step Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {RELATIVISTIC_PRESETS.map((preset) => {
              const isSelected = Math.abs(beta - preset.beta) < 0.0004;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setBeta(preset.beta)}
                  className={`rounded border px-2.5 py-1 text-[11px] font-bold transition ${
                    isSelected
                      ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                      : 'border-white/10 bg-zinc-950/80 text-zinc-400 hover:border-white/25 hover:text-white'
                  }`}
                >
                  <span>{preset.shortTag}</span>
                  <span className="ml-1 text-[10px] text-zinc-500">
                    {preset.gammaLabel}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setBeta(MAX_BETA)}
              className={`rounded border px-2.5 py-1 text-[11px] font-bold transition ${
                beta >= 0.99998
                  ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300'
                  : 'border-white/10 bg-zinc-950/80 text-zinc-400 hover:border-white/25 hover:text-white'
              }`}
            >
              <span>0.99999c</span>
              <span className="ml-1 text-[10px] text-cyan-400 font-bold">γ = 224 (Foton Limiti)</span>
            </button>
          </div>

          {/* Stepper + Tactile Logarithmic Scrubber */}
          <div className="flex flex-1 items-center gap-2 md:max-w-md lg:max-w-lg">
            <button
              type="button"
              onClick={() => setBeta(sliderToBeta(Math.max(0, sliderVal - 0.025)))}
              className="rounded border border-white/10 bg-zinc-950/80 px-2 py-0.5 text-xs font-bold text-zinc-300 hover:border-white/30"
            >
              -
            </button>

            <div className="flex flex-1 flex-col">
              <input
                type="range"
                min={0}
                max={1}
                step={0.0005}
                value={sliderVal}
                onChange={(e) => setBeta(sliderToBeta(parseFloat(e.target.value)))}
                aria-label="Speed Scrubber"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-amber-400"
              />
            </div>

            <button
              type="button"
              onClick={() => setBeta(sliderToBeta(Math.min(1, sliderVal + 0.025)))}
              className="rounded border border-white/10 bg-zinc-950/80 px-2 py-0.5 text-xs font-bold text-zinc-300 hover:border-white/30"
            >
              +
            </button>

            <span className="hidden lg:inline text-[10px] text-zinc-500 whitespace-nowrap pl-1">
              {isTr ? 'Mouse tekerleği ile hızlan' : 'Scroll wheel to accelerate'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
