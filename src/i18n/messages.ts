/**
 * Interface strings. One typed dictionary per language: a missing or misspelt key
 * is a compile error, so the two languages cannot drift apart.
 *
 * Symbols (β, γ, τ, D₀ …) are never translated and never put through
 * `text-transform`: Γ is not γ.
 */

import type { BandId } from '@/physics/bands';
import type { Language, Lens, ViewMode } from '@/state/simulation';

export interface Messages {
  readonly app: {
    readonly name: string;
    readonly tagline: string;
    readonly frame: string;
    readonly skipToControls: string;
  };
  readonly view: {
    readonly group: string;
    readonly modes: Record<ViewMode, { readonly label: string; readonly hint: string }>;
  };
  readonly controls: {
    readonly thermal: string;
    readonly thermalHint: string;
    readonly guides: string;
    readonly guidesHint: string;
    readonly lens: string;
    readonly lensHint: string;
    readonly lensValue: (lens: Lens) => string;
    readonly pause: string;
    readonly resume: string;
    readonly dossier: string;
    readonly dossierHint: string;
    readonly language: string;
    readonly languageName: Record<Language, string>;
    readonly help: string;
    readonly lookAhead: string;
    readonly resetClocks: string;
    readonly collapse: string;
    readonly expand: string;
    readonly close: string;
  };
  readonly speed: {
    readonly label: string;
    readonly slower: string;
    readonly faster: string;
    readonly valueText: (beta: string, gamma: string) => string;
    readonly rest: string;
    readonly hint: string;
    readonly presetHint: (beta: string) => string;
  };
  readonly readout: {
    readonly velocity: string;
    readonly lorentz: string;
    readonly rapidity: string;
    readonly clockRate: string;
    readonly dopplerAhead: string;
  };
  readonly dock: {
    readonly title: string;
    readonly properTime: string;
    readonly streetTime: string;
    readonly rate: string;
    readonly road: string;
    readonly roadNote: string;
    readonly transverse: string;
    readonly transverseNote: string;
    readonly neutralCone: string;
    readonly neutralConeNote: string;
    readonly reference: string;
    readonly ahead: string;
    readonly behind: string;
    readonly ambient: string;
    readonly ambientNote: string;
    readonly exposure: string;
    readonly exposureNote: string;
    readonly heading: string;
    readonly spectrum: string;
    readonly spectrumCaption: string;
    readonly visible: string;
  };
  readonly bands: Record<BandId, string>;
  /** One live sentence describing what the current speed does to the view. */
  readonly regime: {
    readonly rest: string;
    readonly slow: (transverse: string) => string;
    readonly moderate: (transverse: string, doppler: string) => string;
    readonly fast: (transverse: string, temperature: string) => string;
    readonly extreme: (cone: string, hemisphere: string) => string;
    readonly limit: (hemisphere: string, gamma: string) => string;
    readonly measured: (length: string) => string;
  };
  readonly guides: {
    readonly motion: string;
    readonly neutral: string;
    readonly transverse: string;
  };
  readonly loading: {
    readonly models: string;
    readonly geometry: string;
    readonly ready: string;
    readonly failed: string;
    readonly unsupported: string;
    readonly unsupportedDetail: string;
    readonly retry: string;
  };
  readonly help: {
    readonly title: string;
    readonly rows: ReadonlyArray<readonly [keys: string, action: string]>;
    readonly pointer: ReadonlyArray<readonly [gesture: string, action: string]>;
    readonly coach: string;
  };
  readonly dossier: {
    readonly title: string;
    readonly contents: string;
    readonly abstract: string;
    readonly keywords: string;
    readonly references: string;
    readonly glossary: string;
    readonly tryIt: string;
    readonly figure: string;
    readonly table: string;
    readonly equation: string;
    readonly checkedPrimary: string;
    readonly checkedSecondary: string;
    readonly loading: string;
    readonly backToTop: string;
  };
}

const tr: Messages = {
  app: {
    name: 'Life of a Photon',
    tagline: 'Özel görelilik · birinci şahıs',
    frame: 'Gözlemci çerçevesi S′',
    skipToControls: 'Denetimlere geç',
  },
  view: {
    group: 'Görünüm',
    modes: {
      seen: { label: 'Görülen', hint: 'Gözün gördüğü: ışık sapıncı, Doppler kayması, ışınım dönüşümü' },
      measured: { label: 'Ölçülen', hint: 'Eşzamanlı ölçüm: yalnızca Lorentz büzülmesi, L = L₀/γ' },
    },
  },
  controls: {
    thermal: 'Isıl ışıma',
    thermalHint: '288 K ortamın kendi ışımasını göster ya da gizle',
    guides: 'Kılavuz',
    guidesHint: 'Hareket yönü, nötr koni ve yan düzlem işaretleri',
    lens: 'Mercek',
    lensHint: 'Görüş alanını daralt (büyütme)',
    lensValue: (lens) => `×${lens}`,
    pause: 'Duraklat',
    resume: 'Sürdür',
    dossier: 'Bilimsel analiz',
    dossierHint: 'Kuram, yöntem, doğrulama ve kaynakça',
    language: 'Dil',
    languageName: { tr: 'Türkçe', en: 'English' },
    help: 'Kısayollar',
    lookAhead: 'İleri bak',
    resetClocks: 'Saatleri sıfırla',
    collapse: 'Ölçerleri daralt',
    expand: 'Ölçerleri aç',
    close: 'Kapat',
  },
  speed: {
    label: 'Hız',
    slower: 'Yavaşla',
    faster: 'Hızlan',
    valueText: (beta, gamma) => `β = ${beta}, γ = ${gamma}`,
    rest: 'durgun',
    hint: 'Tekerlek: her çentik aynı Lorentz itmesi (Δφ = 0,045)',
    presetHint: (beta) => `${beta} c değerine git`,
  },
  readout: {
    velocity: 'Hız',
    lorentz: 'Lorentz çarpanı',
    rapidity: 'Hızlılık',
    clockRate: 'Saat hızı',
    dopplerAhead: 'İleri Doppler çarpanı',
  },
  dock: {
    title: 'Ölçerler',
    properTime: 'Öz zaman τ',
    streetTime: 'Cadde zamanı t',
    rate: 'dτ/dt',
    road: '100 m yol',
    roadNote: 'ölçülen, L₀/γ',
    transverse: 'Yan düzlem θ = 90°',
    transverseNote: 'görüldüğü açı θ′',
    neutralCone: 'Nötr koni D = 1',
    neutralConeNote: 'içi maviye, dışı kırmızıya kayar',
    reference: '555 nm',
    ahead: 'ileride',
    behind: 'geride',
    ambient: '288 K ortam',
    ambientNote: 'ileride görünen sıcaklık',
    exposure: 'Pozlama',
    exposureNote: 'otomatik, durgun hâle göre',
    heading: 'Bakış yönü',
    spectrum: 'Elektromanyetik tayf',
    spectrumCaption: '555 nm başvuru ışığının ileride ve geride kaydığı yer',
    visible: 'görünür',
  },
  bands: {
    gamma: 'gama ışını',
    xray: 'X-ışını',
    extremeUv: 'aşırı morötesi',
    uvC: 'morötesi C',
    uvB: 'morötesi B',
    uvA: 'morötesi A',
    violet: 'mor',
    blue: 'mavi',
    cyan: 'camgöbeği',
    green: 'yeşil',
    yellow: 'sarı',
    orange: 'turuncu',
    red: 'kırmızı',
    nearIr: 'yakın kızılötesi',
    shortIr: 'kısa dalga kızılötesi',
    midIr: 'orta kızılötesi',
    farIr: 'uzak kızılötesi',
    microwave: 'mikrodalga',
    radio: 'radyo',
  },
  regime: {
    rest: 'Durgun gözlemci: gece caddesi olduğu gibi görünür.',
    slow: (transverse) =>
      `İlk değişen renktir: önünüzdeki dar bantlı ışık maviye kayar. Yanınızdaki düzlem ${transverse} önde görünür.`,
    moderate: (transverse, doppler) =>
      `İleride D₀ = ${doppler}: LED ışığı morötesine çıkar, ay ışığı parlar ve mavileşir. Yan düzlem ${transverse} önde.`,
    fast: (transverse, temperature) =>
      `Yan düzlem ${transverse} önünüzde. Tam karşıda 288 K’lik ortam ${temperature} K’lik bir kara cisim gibi ışır.`,
    extreme: (cone, hemisphere) =>
      `Ön yarıküre ${hemisphere} içine sığar. Nötr koni ${cone} açısında; çevresinde LED ışığının Doppler halkası.`,
    limit: (hemisphere, gamma) =>
      `γ = ${gamma}: ön yarıkürenin tamamı ${hemisphere} içinde. Merceği kullanın; bir fotonun çerçevesi yoktur, bu yalnızca sınırdır.`,
    measured: (length) =>
      `Ölçülen görünüm: ışık gecikmesi yok. 100 m’lik yol ${length} olarak ölçülür; ızgara kareleri dilime döner.`,
  },
  guides: {
    motion: 'hareket yönü',
    neutral: 'D = 1',
    transverse: 'θ = 90°',
  },
  loading: {
    models: 'Modeller yükleniyor',
    geometry: 'Geometri hazırlanıyor',
    ready: 'Hazır',
    failed: 'Sahne yüklenemedi',
    unsupported: 'Bu tarayıcı WebGL 2 desteklemiyor',
    unsupportedDetail: 'Simülasyon için güncel bir masaüstü ya da mobil tarayıcı gerekir.',
    retry: 'Yeniden dene',
  },
  help: {
    title: 'Denetimler',
    rows: [
      ['↑ ↓', 'Hızlan / yavaşla (Δφ = 0,045)'],
      ['← →', 'Sola / sağa bak'],
      ['0 – 5', 'Hazır hızlar'],
      ['Boşluk', 'Duraklat / sürdür'],
      ['M', 'Görülen / ölçülen görünüm'],
      ['T', 'Isıl ışıma'],
      ['G', 'Kılavuz çizgileri'],
      ['L', 'Mercek ×1 / ×3 / ×10'],
      ['F', 'İleri bak'],
      ['R', 'Saatleri sıfırla'],
      ['D', 'Bilimsel analiz'],
    ],
    pointer: [
      ['Sürükle', 'Çevrene bak'],
      ['Tekerlek', 'Hızı değiştir'],
      ['Çift tık', 'İleri bak'],
    ],
    coach: 'Hızlanmak için tekerleği çevirin · bakmak için sürükleyin',
  },
  dossier: {
    title: 'Bilimsel analiz',
    contents: 'İçindekiler',
    abstract: 'Özet',
    keywords: 'Anahtar sözcükler',
    references: 'Kaynakça',
    glossary: 'Simgeler ve terimler',
    tryIt: 'Sahnede göster',
    figure: 'Şekil',
    table: 'Çizelge',
    equation: 'Denk.',
    checkedPrimary: 'kaynağın kendisi okundu',
    checkedSecondary: 'künye doğrulandı; içerik ikincil kaynaktan',
    loading: 'Dosya açılıyor',
    backToTop: 'Başa dön',
  },
};

const en: Messages = {
  app: {
    name: 'Life of a Photon',
    tagline: 'Special relativity · first person',
    frame: 'Observer frame S′',
    skipToControls: 'Skip to controls',
  },
  view: {
    group: 'View',
    modes: {
      seen: { label: 'Seen', hint: 'What the eye receives: aberration, Doppler shift, transformed radiance' },
      measured: { label: 'Measured', hint: 'Simultaneous measurement: Lorentz contraction only, L = L₀/γ' },
    },
  },
  controls: {
    thermal: 'Thermal emission',
    thermalHint: 'Show or hide the self-emission of the 288 K surroundings',
    guides: 'Guides',
    guidesHint: 'Direction of motion, neutral cone and transverse plane',
    lens: 'Lens',
    lensHint: 'Narrow the field of view (magnification)',
    lensValue: (lens) => `×${lens}`,
    pause: 'Pause',
    resume: 'Resume',
    dossier: 'Scientific dossier',
    dossierHint: 'Theory, method, verification and references',
    language: 'Language',
    languageName: { tr: 'Türkçe', en: 'English' },
    help: 'Shortcuts',
    lookAhead: 'Look ahead',
    resetClocks: 'Reset clocks',
    collapse: 'Collapse instruments',
    expand: 'Expand instruments',
    close: 'Close',
  },
  speed: {
    label: 'Speed',
    slower: 'Slower',
    faster: 'Faster',
    valueText: (beta, gamma) => `β = ${beta}, γ = ${gamma}`,
    rest: 'at rest',
    hint: 'Wheel: every notch is the same boost (Δφ = 0.045)',
    presetHint: (beta) => `Go to ${beta} c`,
  },
  readout: {
    velocity: 'Velocity',
    lorentz: 'Lorentz factor',
    rapidity: 'Rapidity',
    clockRate: 'Clock rate',
    dopplerAhead: 'Doppler factor ahead',
  },
  dock: {
    title: 'Instruments',
    properTime: 'Proper time τ',
    streetTime: 'Street time t',
    rate: 'dτ/dt',
    road: '100 m of road',
    roadNote: 'measured, L₀/γ',
    transverse: 'Transverse plane θ = 90°',
    transverseNote: 'seen at θ′',
    neutralCone: 'Neutral cone D = 1',
    neutralConeNote: 'blueshift inside, redshift outside',
    reference: '555 nm',
    ahead: 'ahead',
    behind: 'behind',
    ambient: '288 K surroundings',
    ambientNote: 'apparent temperature ahead',
    exposure: 'Exposure',
    exposureNote: 'automatic, relative to rest',
    heading: 'View direction',
    spectrum: 'Electromagnetic spectrum',
    spectrumCaption: 'Where 555 nm reference light lands ahead and behind',
    visible: 'visible',
  },
  bands: {
    gamma: 'gamma ray',
    xray: 'X-ray',
    extremeUv: 'extreme ultraviolet',
    uvC: 'ultraviolet C',
    uvB: 'ultraviolet B',
    uvA: 'ultraviolet A',
    violet: 'violet',
    blue: 'blue',
    cyan: 'cyan',
    green: 'green',
    yellow: 'yellow',
    orange: 'orange',
    red: 'red',
    nearIr: 'near infrared',
    shortIr: 'short-wave infrared',
    midIr: 'mid infrared',
    farIr: 'far infrared',
    microwave: 'microwave',
    radio: 'radio',
  },
  regime: {
    rest: 'Observer at rest: the night avenue as it is.',
    slow: (transverse) =>
      `Colour changes first: band-limited light ahead shifts towards blue. The plane beside you is seen ${transverse} ahead.`,
    moderate: (transverse, doppler) =>
      `Ahead D₀ = ${doppler}: LED light leaves for the ultraviolet, moonlight brightens and turns blue. Transverse plane at ${transverse}.`,
    fast: (transverse, temperature) =>
      `The transverse plane is ${transverse} ahead. Dead ahead the 288 K surroundings glow like a ${temperature} K black body.`,
    extreme: (cone, hemisphere) =>
      `The forward hemisphere fits inside ${hemisphere}. Neutral cone at ${cone}, ringed by the Doppler iris of the LED light.`,
    limit: (hemisphere, gamma) =>
      `γ = ${gamma}: the whole forward hemisphere lies within ${hemisphere}. Use the lens; a photon has no frame, this is only the limit.`,
    measured: (length) =>
      `Measured view: no light-travel delay. 100 m of road measures ${length}; the grid squares become slabs.`,
  },
  guides: {
    motion: 'direction of motion',
    neutral: 'D = 1',
    transverse: 'θ = 90°',
  },
  loading: {
    models: 'Loading models',
    geometry: 'Preparing geometry',
    ready: 'Ready',
    failed: 'The scene could not be loaded',
    unsupported: 'This browser does not support WebGL 2',
    unsupportedDetail: 'The simulation needs a current desktop or mobile browser.',
    retry: 'Try again',
  },
  help: {
    title: 'Controls',
    rows: [
      ['↑ ↓', 'Faster / slower (Δφ = 0.045)'],
      ['← →', 'Look left / right'],
      ['0 – 5', 'Preset speeds'],
      ['Space', 'Pause / resume'],
      ['M', 'Seen / measured view'],
      ['T', 'Thermal emission'],
      ['G', 'Guide lines'],
      ['L', 'Lens ×1 / ×3 / ×10'],
      ['F', 'Look ahead'],
      ['R', 'Reset clocks'],
      ['D', 'Scientific dossier'],
    ],
    pointer: [
      ['Drag', 'Look around'],
      ['Wheel', 'Change speed'],
      ['Double click', 'Look ahead'],
    ],
    coach: 'Roll the wheel to accelerate · drag to look around',
  },
  dossier: {
    title: 'Scientific dossier',
    contents: 'Contents',
    abstract: 'Abstract',
    keywords: 'Keywords',
    references: 'References',
    glossary: 'Symbols and terms',
    tryIt: 'Show in the scene',
    figure: 'Figure',
    table: 'Table',
    equation: 'Eq.',
    checkedPrimary: 'the source itself was read',
    checkedSecondary: 'bibliography verified; content from secondary sources',
    loading: 'Opening the dossier',
    backToTop: 'Back to top',
  },
};

export const MESSAGES: Record<Language, Messages> = { tr, en };
