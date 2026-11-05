'use client';

import React, { useState } from 'react';
import { getGlossaryItems, getThoughtTopics, Language } from '@/lib/i18n';
import MathFormula from './MathFormula';
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  HelpCircle,
  Sliders,
  X,
  Zap,
} from 'lucide-react';

interface StoryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSelectBetaAndClose: (beta: number, opticalMode?: boolean) => void;
}

type ModalTab = 'story' | 'questions' | 'glossary';

export default function StoryGuideModal({
  isOpen,
  onClose,
  lang,
  onSelectBetaAndClose,
}: StoryGuideModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('story');
  const [page, setPage] = useState(0);
  const [expandedTopicId, setExpandedTopicId] = useState<string>('thought-experiment');

  if (!isOpen) return null;

  const isTr = lang === 'tr';
  const topics = getThoughtTopics(lang);
  const glossary = getGlossaryItems(lang);

  const slides = isTr
    ? [
        {
          badge: 'BÖLÜM 01 / 05 • EINSTEIN’IN DÜŞÜNCE DENEYİ',
          title: 'Bir Işık Işınına Binersek Ne Görürüz?',
          subtitle: '16 Yaşındaki Albert Einstein’ın Sorusu',
          summary:
            'Klasik fizik zamanın her yerde aynı aktığını varsayar. Ancak Einstein, ışık hızının herkes için aynı kalabilmesi adına zamanın yavaşlaması ve uzayın büzülmesi gerektiğini keşfetti.',
          keyPoints: [
            {
              h: 'Deneyin Mantığı',
              p: 'Şehir caddesinde hızlandıkça ışık hızına (c = 299.792.458 m/s) yaklaşırsınız. Simülasyon tüm görüntüleri uydurma efektlerle değil, gerçek Lorentz dönüşümleriyle hesaplar.',
            },
            {
              h: 'Deneyim',
              p: 'Mouse scrollu ile hızlanın. Yanınızdaki ve arkanızdaki binaların nasıl önünüze doğru toplandığını (Aberrasyon) ve renklerin maviye kaydığını gözlemleyin.',
            },
          ],
          tryBeta: 0.0,
          tryLabel: 'Durgun Caddeye Dön (0c)',
          diagram: 'intro',
        },
        {
          badge: 'BÖLÜM 02 / 05 • FOTONUN DOĞASI',
          title: 'Işık Neden Evrenin Hız Sınırıdır?',
          subtitle: 'Kütlesiz Parçacık (m₀ = 0) ve c Sabiti',
          summary:
            'Işık, foton adı verilen kütlesiz kuantum enerji paketlerinden oluşur. Kütlesi sıfır olduğu için doğar doğmaz c hızında uçar. Kütlesi olan herhangi bir cismi c hızına çıkarmak sonsuz enerji gerektirir.',
          keyPoints: [
            {
              h: 'Doğanın Değişmez Kuralı',
              p: 'Işığa doğru ne kadar hızlı koşarsanız koşun, ışık sizden DAİMA tam 299.792.458 m/s hızla uzaklaşır. Bu sabitliği korumak için doğa zamanı yavaşlatır.',
            },
          ],
          tryBeta: 0.5,
          tryLabel: 'Yarı Işık Hızını (0.50c) Dene',
          diagram: 'photon',
        },
        {
          badge: 'BÖLÜM 03 / 05 • ZAMAN VE UZAYIN BÜKÜLMESİ',
          title: 'Aynalı Işık Saati ve Uzunluk Büzülmesi',
          subtitle: 'Zamanın Genleşmesi (dt = γ·dτ)',
          summary:
            'İki ayna arasında zıplayan bir ışık fotonu düşünün. Siz hareket ettiğinizde ışık çapraz bir yol izlemek zorunda kalır; ışık hızı sabit olduğundan bu gidiş-geliş daha uzun sürer ve saatiniz yavaşlar.',
          keyPoints: [
            {
              h: 'Kritik Eşik (0.866c, γ = 2)',
              p: 'Bu hızda sizin saatinizde 1 saniye geçerken sokakta 2 tam saniye tükenir. Önünüzdeki 100 metrelik yol tam yarıya (50 metreye) büzülür.',
            },
          ],
          tryBeta: 0.8660254,
          tryLabel: 'Kritik Eşiği Gör (0.866c)',
          diagram: 'lightclock',
        },
        {
          badge: 'BÖLÜM 04 / 05 • TERRELL-PENROSE ETKİSİ',
          title: 'Binalar Neden Bükülür ve Döner?',
          subtitle: 'Işığın Sonlu Hızı ve Optik Gecikme',
          summary:
            'Yağmurda koşarken damlaların yüzünüze eğik gelmesi gibi, yanınızdaki ve arkanızdaki binalardan çıkan ışıklar da ön görüş koninize doğru bükülür (Aberrasyon).',
          keyPoints: [
            {
              h: 'Optik Görünüm vs Saf Büzülme',
              p: 'Saf büzülme cisimleri akordeon gibi sıkıştırır. Optik görünümde ise ışık gecikmesi yüzünden cisimler size doğru dönmüş (Terrell rotasyonu) olarak görünür.',
            },
          ],
          tryBeta: 0.99,
          tryLabel: '0.99c Tünel Görüşünü Dene',
          diagram: 'optical',
        },
        {
          badge: 'BÖLÜM 05 / 05 • MUTLAK FOTON LİMİTİ',
          title: 'Fotonun Kendi Gözünden Evren (v → c)',
          subtitle: 'Sıfır Öz Zaman (Δτ = 0) ve Sıfır Mesafe',
          summary:
            'Bir foton için zaman durmuştur (0 saniyedir). Yıldızdan doğup milyarlarca yıl sonra gözünüze giren bir fotonun kendi kol saatinde sıfır saniye geçmiştir; tüm evren tek bir iki boyutlu ışık noktasına çökmüştür.',
          keyPoints: [
            {
              h: 'Tekillik Noktası',
              p: 'Işık hızında γ → ∞, dolayısıyla L → 0 ve Δτ → 0 olur. Foton için doğuş ve varış tek bir andır.',
            },
          ],
          tryBeta: 0.99999,
          tryLabel: '0.99999c Foton Limitine Gir',
          diagram: 'doppler',
        },
      ]
    : [
        {
          badge: 'PART 01 / 05 • EINSTEIN’S THOUGHT EXPERIMENT',
          title: 'What Happens if We Ride a Beam of Light?',
          subtitle: 'The Question of 16-Year-Old Albert Einstein',
          summary:
            'Classical physics assumed time flowed universally. Einstein discovered that to keep light speed constant for all observers, time must dilate and distance must contract.',
          keyPoints: [
            {
              h: 'Methodology',
              p: 'As you accelerate down the avenue, all distortions are computed via exact Lorentz boost and past-light-cone equations in real-time GLSL.',
            },
            {
              h: 'Interaction',
              p: 'Use your mouse wheel to accelerate. Observe how transverse buildings wrap into your forward cone (Aberration) and spectrum blueshifts.',
            },
          ],
          tryBeta: 0.0,
          tryLabel: 'Stationary Street (0c)',
          diagram: 'intro',
        },
        {
          badge: 'PART 02 / 05 • NATURE OF THE PHOTON',
          title: 'Why Is Light the Cosmic Speed Limit?',
          subtitle: 'Massless Quantum (m₀ = 0) and Constant c',
          summary:
            'Photons have zero rest mass. Accelerating massive objects to light speed requires infinite energy, which is why only massless particles travel at c.',
          keyPoints: [
            {
              h: 'Invariance of c',
              p: 'No matter how fast you travel toward a beam of light, it still retreats at 299,792,458 m/s. Nature slows your clock to preserve this constant.',
            },
          ],
          tryBeta: 0.5,
          tryLabel: 'Try Half Light Speed (0.50c)',
          diagram: 'photon',
        },
        {
          badge: 'PART 03 / 05 • WARPING OF TIME & SPACE',
          title: 'The Light-Clock & Length Contraction',
          subtitle: 'Time Dilation (dt = γ·dτ)',
          summary:
            'In a moving frame, a light pulse bouncing between mirrors travels a longer hypotenuse. Because c is invariant, each tick takes longer.',
          keyPoints: [
            {
              h: 'Critical Milestone (0.866c, γ = 2)',
              p: 'At this velocity, 1 second on your clock corresponds to 2 seconds on the street, and forward distance is halved.',
            },
          ],
          tryBeta: 0.8660254,
          tryLabel: 'View γ = 2 Threshold (0.866c)',
          diagram: 'lightclock',
        },
        {
          badge: 'PART 04 / 05 • TERRELL-PENROSE EFFECT',
          title: 'Why Do Objects Appear to Rotate?',
          subtitle: 'Finite Speed of Light & Retardation',
          summary:
            'Light from the rear of moving objects takes longer to reach the observer. This causes contracted objects to appear optically rotated.',
          keyPoints: [
            {
              h: 'Optical vs Pure Contraction',
              p: 'Pure Lorentz contraction is accordion flattening. Real vision involves optical retardation that curves and rotates geometry.',
            },
          ],
          tryBeta: 0.99,
          tryLabel: 'Experience 0.99c Tunnel View',
          diagram: 'optical',
        },
        {
          badge: 'PART 05 / 05 • THE PHOTON’S EYE',
          title: 'The Universe in a Photon’s Frame (v → c)',
          subtitle: 'Zero Proper Time (Δτ = 0) & Zero Distance',
          summary:
            'For a photon, proper time ceases to tick (0s). Emission and absorption occur at the exact same instant, and forward space collapses to a 2D plane.',
          keyPoints: [
            {
              h: 'Singularity',
              p: 'At c, γ → ∞, L → 0, and Δτ → 0. The universe collapses into a single point.',
            },
          ],
          tryBeta: 0.99999,
          tryLabel: 'Enter 0.99999c Photon Limit',
          diagram: 'doppler',
        },
      ];

  const current = slides[page];

  return (
    <div
      data-modal="true"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-xl sm:p-6 font-mono select-none"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#090b10] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-950 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('story')}
              className={`rounded px-3 py-1 font-bold transition ${
                activeTab === 'story'
                  ? 'bg-zinc-200 text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isTr ? '1. HİKAYE & PRENSİP' : '1. STORY & DOSSIER'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={`rounded px-3 py-1 font-bold transition ${
                activeTab === 'questions'
                  ? 'bg-zinc-200 text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isTr ? '2. 7 TEMEL SORU' : '2. 7 QUESTIONS'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('glossary')}
              className={`rounded px-3 py-1 font-bold transition ${
                activeTab === 'glossary'
                  ? 'bg-zinc-200 text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isTr ? '3. FORMÜL & SÖZLÜK' : '3. MATH & GLOSSARY'}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ===================================================================
            TAB 1: 5-PART EDITORIAL STORY
        =================================================================== */}
        {activeTab === 'story' && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Step indicator */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-2 text-[10px] text-zinc-400">
              <span className="text-amber-400 font-bold">{current.badge}</span>
              <div className="flex items-center gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPage(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      page === idx ? 'w-6 bg-amber-400' : 'w-1.5 bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3.5 overflow-y-auto p-5 text-xs">
              <div>
                <h3 className="text-base font-black text-zinc-100">{current.title}</h3>
                <p className="mt-0.5 text-[11px] text-zinc-400">{current.subtitle}</p>
              </div>

              {/* Summary box */}
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-[11.5px] leading-relaxed text-amber-200">
                {current.summary}
              </div>

              {/* Minimal SVG Diagram */}
              {current.diagram === 'lightclock' && (
                <div className="rounded-lg border border-white/10 bg-zinc-950 p-2.5">
                  <svg viewBox="0 0 460 70" className="h-16 w-full">
                    {/* Left: Rest Clock */}
                    <line x1="40" y1="15" x2="160" y2="15" stroke="#38bdf8" strokeWidth="2" />
                    <line x1="40" y1="55" x2="160" y2="55" stroke="#38bdf8" strokeWidth="2" />
                    <line x1="100" y1="15" x2="100" y2="55" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 3" />
                    <circle cx="100" cy="35" r="4" fill="#fbbf24" />
                    <text x="100" y="68" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                      Durgun: Dikey Yol
                    </text>

                    {/* Right: Moving Clock */}
                    <line x1="260" y1="15" x2="420" y2="15" stroke="#38bdf8" strokeWidth="2" />
                    <line x1="260" y1="55" x2="420" y2="55" stroke="#38bdf8" strokeWidth="2" />
                    <line x1="280" y1="55" x2="400" y2="15" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 3" />
                    <circle cx="340" cy="35" r="4" fill="#fbbf24" />
                    <text x="340" y="68" textAnchor="middle" fill="#fbbf24" fontSize="8" fontFamily="monospace">
                      Hareketli: Uzayan Çapraz Yol (Zaman Yavaşlar)
                    </text>
                  </svg>
                </div>
              )}

              {/* Key points */}
              <div className="space-y-2">
                {current.keyPoints.map((pt, idx) => (
                  <div key={idx} className="rounded-lg border border-white/5 bg-zinc-950/60 p-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      {pt.h}
                    </span>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">{pt.p}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer controls */}
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className={`rounded border border-white/10 px-3 py-1 text-xs font-bold ${
                  page === 0 ? 'opacity-20' : 'text-zinc-300 hover:text-white'
                }`}
              >
                Geri
              </button>

              <button
                type="button"
                onClick={() => onSelectBetaAndClose(current.tryBeta, true)}
                className="rounded border border-amber-400/40 bg-amber-400/20 px-3.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-400/30"
              >
                {current.tryLabel}
              </button>

              <button
                type="button"
                disabled={page === slides.length - 1}
                onClick={() => setPage(page + 1)}
                className={`rounded border border-white/10 px-3 py-1 text-xs font-bold ${
                  page === slides.length - 1 ? 'opacity-20' : 'text-zinc-300 hover:text-white'
                }`}
              >
                İleri
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: 7 CRITICAL QUESTIONS
        =================================================================== */}
        {activeTab === 'questions' && (
          <div className="flex-1 space-y-2 overflow-y-auto p-5 text-xs">
            {topics.map((t) => {
              const isOpen = expandedTopicId === t.id;
              return (
                <div
                  key={t.id}
                  className={`rounded-lg border transition ${
                    isOpen ? 'border-amber-400/40 bg-zinc-950' : 'border-white/10 bg-zinc-950/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedTopicId(isOpen ? '' : t.id)}
                    className="flex w-full items-center justify-between p-3 text-left font-bold text-zinc-200 hover:text-white"
                  >
                    <span>{t.title}</span>
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-amber-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/10 p-3 space-y-2">
                      <p className="text-[11.5px] leading-relaxed text-zinc-300">{t.summary}</p>
                      <p className="text-[11px] leading-relaxed text-zinc-400">{t.explanation}</p>
                      <div className="rounded border border-white/10 bg-zinc-900 p-2 text-[10.5px] text-amber-300 font-mono">
                        ÖZET: {t.keyFact}
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectBetaAndClose(t.tryBeta, true)}
                        className="rounded border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10.5px] font-bold text-amber-300 hover:bg-amber-400/20"
                      >
                        Bu Hızı Sahnede Gör (v = {t.tryBeta}c)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ===================================================================
            TAB 3: MATH & GLOSSARY
        =================================================================== */}
        {activeTab === 'glossary' && (
          <div className="flex-1 space-y-3 overflow-y-auto p-5 text-xs">
            {/* Formulas */}
            <div className="rounded-lg border border-white/10 bg-zinc-950 p-3 space-y-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">
                TEMEL EINSTEIN DENKLEMLERİ
              </span>
              <div className="space-y-1.5 font-mono text-[11px] text-zinc-300">
                <div>1. Lorentz Faktörü: <MathFormula tex={String.raw`\gamma = \frac{1}{\sqrt{1 - \beta^2}}`} /></div>
                <div>2. Uzunluk Büzülmesi: <MathFormula tex={String.raw`L = \frac{L_0}{\gamma} = L_0\sqrt{1 - \beta^2}`} /></div>
                <div>3. Zaman Genleşmesi: <MathFormula tex={String.raw`dt = \gamma \cdot d\tau`} /></div>
                <div>4. Relativistik Enerji: <MathFormula tex={String.raw`E = \gamma m_0 c^2, \quad E_k = (\gamma - 1)m_0 c^2`} /></div>
                <div>5. Doppler Faktörü: <MathFormula tex={String.raw`D(\theta) = \frac{1}{\gamma(1 - \beta\cos\theta')}`} /></div>
              </div>
            </div>

            {/* Glossary */}
            <div className="space-y-1.5">
              {glossary.map((g) => (
                <div key={g.symbol} className="rounded-lg border border-white/5 bg-zinc-950/70 p-2.5">
                  <div className="flex items-center gap-2 font-bold text-zinc-200">
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-amber-400">{g.symbol}</span>
                    <span>{g.name}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">{g.definition}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
