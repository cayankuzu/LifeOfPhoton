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
    /** Title of the browser tab; follows the language of the interface. */
    readonly title: string;
    readonly tagline: string;
    readonly skipToControls: string;
    /** Shown by the last line of defence when the application itself fails. */
    readonly crashed: string;
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
    readonly spectrum: string;
    readonly spectrumCaption: string;
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
    /** The coach line for touch screens, which have no wheel. */
    readonly coachTouch: string;
    /** Switch for the single-character shortcuts (WCAG 2.1.4) and what stays active without them. */
    readonly singleKeys: string;
    readonly singleKeysNote: string;
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
    readonly checkedPrimary: string;
    readonly checkedSecondary: string;
    readonly loading: string;
    readonly failed: string;
    readonly failedDetail: string;
    readonly backToTop: string;
  };
}

const tr: Messages = {
  app: {
    name: 'Life of a Photon',
    title: 'Life of a Photon — özel göreliliğin birinci şahıs görünümü',
    tagline: 'Özel görelilik · birinci şahıs',
    skipToControls: 'Denetimlere geç',
    crashed: 'Uygulama beklenmedik bir hatayla durdu',
  },
  view: {
    group: 'Görünüm',
    modes: {
      seen: { label: 'Görülen', hint: 'Gözün gördüğü: ışık sapıncı, Doppler kayması, ışınım parlaklığının dönüşümü' },
      measured: { label: 'Ölçülen', hint: 'Eşzamanlı ölçüm: yalnızca Lorentz büzülmesi, L = L₀/γ' },
    },
  },
  controls: {
    thermal: 'Isıl ışıma',
    thermalHint: '288 K’lik ortamın kendi ışımasını göster ya da gizle',
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
    expand: 'Ölçerleri genişlet',
    close: 'Kapat',
  },
  speed: {
    label: 'Hız',
    slower: 'Yavaşla',
    faster: 'Hızlan',
    valueText: (beta, gamma) => `β = ${beta}; γ = ${gamma}`,
    rest: 'durgun',
    hint: 'Tekerlek: her çentik aynı Lorentz itmesi (Δφ = 0,045)',
    presetHint: (beta) => `${beta} c değerine git`,
  },
  readout: {
    velocity: 'Hız',
    lorentz: 'Lorentz çarpanı',
    clockRate: 'Saat hızı',
    dopplerAhead: 'İleri Doppler çarpanı',
  },
  dock: {
    title: 'Ölçerler',
    properTime: 'Öz zaman τ',
    streetTime: 'Cadde zamanı t',
    rate: 'dτ/dt',
    road: '100 m’lik yol',
    roadNote: 'ölçülen, L₀/γ',
    transverse: 'Yan düzlem θ = 90°',
    transverseNote: 'görüldüğü açı θ′',
    neutralCone: 'Nötr koni D = 1',
    neutralConeNote: 'içi maviye, dışı kırmızıya kayar',
    reference: '555 nm',
    ahead: 'ileride',
    behind: 'geride',
    ambient: '288 K’lik ortam',
    ambientNote: 'ileride görünen sıcaklık',
    exposure: 'Pozlama',
    exposureNote: 'otomatik, durgun hâle göre',
    spectrum: 'Elektromanyetik tayf',
    spectrumCaption: '555 nm başvuru ışığının ileride ve geride kaydığı yer',
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
      `İlk değişen renktir: önünüzdeki bant sınırlı ışık maviye kayar. Yanınızdaki düzlem hareket yönünden ${transverse} açıda görünür.`,
    moderate: (transverse, doppler) =>
      `İleride D₀ = ${doppler}: LED ışığı morötesine çıkar, ay ışığı parlar ve mavileşir. Yan düzlem hareket yönünden ${transverse} açıda.`,
    fast: (transverse, temperature) =>
      `Yan düzlem hareket yönünden yalnızca ${transverse} açıda görünür. Tam karşıda 288 K’lik ortam ${temperature} K’lik bir kara cisim gibi ışır.`,
    extreme: (cone, hemisphere) =>
      `Ön yarıküre ${hemisphere} içine sığar. Nötr koni ${cone} açısında; çevresinde LED ışığının Doppler halkası.`,
    limit: (hemisphere, gamma) =>
      `γ = ${gamma}: ön yarıkürenin tamamı ${hemisphere} içinde. Merceği kullanın; bir fotonun çerçevesi yoktur; bu yalnızca sınırdır.`,
    measured: (length) =>
      `Ölçülen görünüm: ışık gecikmesi yok. 100 m’lik yol ${length} olarak ölçülür; ızgara kareleri dilime döner.`,
  },
  guides: {
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
      ['F · Home', 'İleri bak'],
      ['R', 'Saatleri sıfırla'],
      ['D', 'Bilimsel analiz'],
      ['Esc', 'Bu listeyi, o kapalıysa analizi kapat'],
    ],
    pointer: [
      ['Sürükle', 'Çevreye bak'],
      ['Tekerlek', 'Hızı değiştir'],
      ['Çift tık', 'İleri bak'],
    ],
    coach: 'Hızlanmak için tekerleği çevirin · bakmak için sürükleyin',
    coachTouch: 'Hızlanmak için alttaki hız çubuğunu kaydırın · bakmak için sürükleyin',
    singleKeys: 'Tek tuşlu kısayollar',
    singleKeysNote:
      'Kapalıyken harf, rakam ve boşluk tuşları kısayol olarak çalışmaz; ok tuşları, Home ve Esc çalışmayı sürdürür.',
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
    checkedPrimary: 'kaynağın kendisi okundu',
    checkedSecondary: 'künye doğrulandı; sav ikincil kaynaklara dayanır',
    loading: 'Bilimsel analiz açılıyor',
    failed: 'Bilimsel analiz yüklenemedi',
    failedDetail: 'Bağlantınızı denetleyip sayfayı yeniden yükleyin; deneyin durumu adreste saklı kalır.',
    backToTop: 'Başa dön',
  },
};

const en: Messages = {
  app: {
    name: 'Life of a Photon',
    title: 'Life of a Photon — a first-person view of special relativity',
    tagline: 'Special relativity · first person',
    skipToControls: 'Skip to controls',
    crashed: 'The application stopped because of an unexpected error',
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
    clockRate: 'Clock rate',
    dopplerAhead: 'Head-on Doppler factor',
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
    spectrum: 'Electromagnetic spectrum',
    spectrumCaption: 'Where 555 nm reference light lands ahead and behind',
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
      `Colour changes first: band-limited light ahead shifts towards blue. The plane beside you is seen at ${transverse} from the direction of motion.`,
    moderate: (transverse, doppler) =>
      `Ahead D₀ = ${doppler}: LED light leaves for the ultraviolet, moonlight brightens and turns blue. Transverse plane at ${transverse} from the direction of motion.`,
    fast: (transverse, temperature) =>
      `The transverse plane is seen at only ${transverse} from the direction of motion. Dead ahead the 288 K surroundings glow like a ${temperature} K black body.`,
    extreme: (cone, hemisphere) =>
      `The forward hemisphere fits inside ${hemisphere}. Neutral cone at ${cone}, surrounded by the Doppler ring of the LED light.`,
    limit: (hemisphere, gamma) =>
      `γ = ${gamma}: the whole forward hemisphere lies within ${hemisphere}. Use the lens; a photon has no frame; this is only the limit.`,
    measured: (length) =>
      `Measured view: no light-travel delay. 100 m of road measures ${length}; the grid squares become slabs.`,
  },
  guides: {
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
      ['F · Home', 'Look ahead'],
      ['R', 'Reset clocks'],
      ['D', 'Scientific dossier'],
      ['Esc', 'Close this sheet, or else the dossier'],
    ],
    pointer: [
      ['Drag', 'Look around'],
      ['Wheel', 'Change speed'],
      ['Double click', 'Look ahead'],
    ],
    coach: 'Roll the wheel to accelerate · drag to look around',
    coachTouch: 'Slide the speed rail below to accelerate · drag to look around',
    singleKeys: 'Single-key shortcuts',
    singleKeysNote: 'When off, the letter, digit and space keys are not shortcuts; the arrow keys, Home and Esc keep working.',
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
    checkedPrimary: 'the source itself was read',
    checkedSecondary: 'bibliographic data verified; the claim rests on secondary sources',
    loading: 'Opening the scientific dossier',
    failed: 'The scientific dossier could not be loaded',
    failedDetail: 'Check your connection and reload the page; the state of the experiment is kept in the address.',
    backToTop: 'Back to top',
  },
};

export const MESSAGES: Record<Language, Messages> = { tr, en };
