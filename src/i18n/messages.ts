/**
 * Interface strings. One typed dictionary per language: a missing or misspelt key
 * is a compile error, so the two languages cannot drift apart.
 *
 * Symbols (β, γ, τ, D₀ …) are never translated and never put through
 * `text-transform`: Γ is not γ.
 */

import type { BandId } from '@/physics/bands';
import type { Language, Lens, ViewMode } from '@/state/simulation';
import type { InventoryGroup, InventoryId, SceneMark } from '@/ui/inventory';

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
    readonly guides: string;
    readonly lens: string;
    readonly lensValue: (lens: Lens) => string;
    readonly pause: string;
    readonly resume: string;
    readonly dossier: string;
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
    /** Caption of the picture behind the start-up screen, so that the still is not taken for the live scene. */
    readonly still: string;
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
  /** The panel "Why does it look like this?" (src/ui/explain.ts): plain words for a curious child. */
  readonly explain: ExplainMessages;
  /** Its second view, "What is on the screen?" (src/ui/inventory.ts), and the tooltips of the interface. */
  readonly inventory: InventoryMessages;
  /** Short names written beside the marks the panel puts on the picture (src/ui/hud/Pointer.tsx): one thing each. */
  readonly pointer: Record<SceneMark, string>;
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

/** An entry of the inventory: a name of one to five words and one to three short sentences. */
interface InventoryEntryText {
  readonly title: string;
  readonly body: string;
}

export interface InventoryMessages {
  /** The two views of the panel, as tabs, and the name of their list. */
  readonly tabs: { readonly label: string; readonly now: string; readonly inventory: string };
  /** One line above the inventory: how to have an entry marked on the screen. */
  readonly intro: string;
  readonly groups: Record<InventoryGroup, string>;
  readonly entries: Record<InventoryId, InventoryEntryText>;
  /** The sentences with numbers that follow some explanations (inventoryDetail in src/ui/inventory.ts). */
  readonly details: {
    readonly avenue: (millions: string, metres: string) => string;
    readonly crossings: (spacing: string) => string;
    readonly windows: (lit: string, now: string, rest: string) => string;
    readonly lamps: (spacing: string, ahead: string, behind: string) => string;
    readonly signals: (colour: string, wavelength: string) => string;
    readonly moon: (now: string, rest: string) => string;
    readonly stars: (count: string, gain: string) => string;
    readonly farEnd: (ahead: string, behind: string) => string;
    readonly ring: {
      readonly none: (behind: string, ahead: string) => string;
      readonly disc: (outer: string) => string;
      readonly between: (inner: string, outer: string) => string;
    };
    readonly heatGlow: (now: string, rest: string, from: string) => string;
    readonly grid: (rest: string, now: string) => string;
    readonly transverseCircle: (angle: string) => string;
    readonly neutralCircle: (angle: string) => string;
    readonly neutralCircleRest: string;
  };
}

/** An item of the explainer whose title and body are fixed. */
interface FixedText {
  readonly title: string;
  readonly body: string;
}

/** An item whose body is built from formatted values. */
interface LiveText<Args extends readonly string[]> {
  readonly title: string;
  readonly body: (...args: Args) => string;
}

export interface ExplainMessages {
  /** Heading of the panel. */
  readonly title: string;
  /** Label of the switch in the top bar (the inventory's entry "why" explains it). */
  readonly toggle: string;
  /** Link to the dossier under each item; its accessible name adds the title of the item. */
  readonly readMore: string;
  readonly readMoreAbout: (title: string) => string;
  /** Label above the items that apply as well, shown by their titles and opened in place. */
  readonly alsoNow: string;
  /** Polite announcement of a new set of items. */
  readonly announce: (titles: readonly string[]) => string;
  /** Colour of the glowing street through the camera, by temperature band (GLOW_COLOUR_BOUNDS_K in src/ui/explain.ts). */
  readonly glowColours: readonly [string, string, string, string, string, string];
  /** What the glow is like, by temperature band (glowLikenessBoundsK in src/ui/explain.ts); set inside a sentence. */
  readonly glowLikeness: readonly [string, string, string, string, string];
  readonly items: {
    readonly paused: FixedText;
    readonly rest: FixedText;
    readonly restNext: FixedText;
    readonly slow: LiveText<[percent: string]>;
    readonly colours: LiveText<[colour: string, wavelength: string]>;
    readonly lamps: LiveText<[colour: string]>;
    readonly invisible: FixedText;
    readonly ring: FixedText;
    readonly brightness: LiveText<[gain: string]>;
    readonly camera: {
      readonly title: string;
      readonly opens: (ev: string) => string;
      readonly closes: (ev: string) => string;
    };
    readonly crowding: {
      readonly pull: FixedText;
      readonly beside: LiveText<[angle: string]>;
      readonly circle: LiveText<[angle: string]>;
    };
    readonly shapes: LiveText<[times: string]>;
    readonly measured: {
      readonly title: string;
      readonly rest: (grid: string) => string;
      readonly main: (gamma: string, road: string) => string;
    };
    readonly measuredWhy: FixedText;
    readonly measuredColours: FixedText;
    readonly clocks: LiveText<[gamma: string]>;
    readonly heatGlow: LiveText<[colour: string, likeness: string, celsius: string, ambient: string]>;
    readonly heatOff: FixedText;
    readonly stars: FixedText;
    readonly moon: {
      readonly reflected: LiveText<[gain: string]>;
      readonly ownGlow: FixedText;
    };
    readonly behind: {
      readonly title: string;
      readonly redder: string;
      readonly infrared: string;
    };
    readonly side: {
      readonly titleSide: string;
      readonly titleUp: string;
      readonly bodySlow: string;
      readonly bodyFast: string;
    };
    readonly lens: {
      readonly title: (lens: string) => string;
      readonly body: (lens: string) => string;
    };
    readonly speedOfLight: LiveText<[km: string]>;
    readonly limit: FixedText;
  };
  /** At most one of these follows a body, and only when it is true of the screen. */
  readonly extras: {
    readonly ringGuide: string;
    readonly crowdingGuide: string;
    readonly crowdingLens: string;
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
    guides: 'Kılavuz',
    lens: 'Mercek',
    lensValue: (lens) => `×${lens}`,
    pause: 'Duraklat',
    resume: 'Sürdür',
    dossier: 'Bilimsel analiz',
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
    still: 'Görsel: simülasyondan durağan bir kare, 0,866 c',
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
      ['E', '“Neden böyle görünüyor?” paneli'],
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
  explain: {
    title: 'Neden böyle görünüyor?',
    toggle: 'Neden?',
    readMore: 'Bilimsel analizde oku',
    readMoreAbout: (title) => `Bilimsel analizde oku: ${title}`,
    alsoNow: 'Şu an ayrıca',
    announce: (titles) => `Açıklama: ${titles.join('; ')}.`,
    glowColours: ['kırmızı', 'turuncu', 'sarımsı beyaz', 'beyaz', 'mavimsi beyaz', 'açık mavi'],
    glowLikeness: [
      'kızgın ocak teli gibi',
      'mum alevi gibi',
      'ampul teli gibi',
      'Güneş kadar olmasa da',
      'Güneş’in yüzeyinden bile parlak',
    ],
    items: {
      paused: {
        title: 'Zaman durdu',
        body: 'Duraklattın. Cadde artık akmıyor, saatler de durdu. Ekran yine bu hızdaki görüntüyü gösteriyor; istediğin yere bakabilirsin.',
      },
      rest: {
        title: 'Şimdilik duruyorsun',
        body: 'Gece caddesini olduğu gibi görüyorsun: beyaz sokak lambaları, Ay, ışıklı pencereler ve kırmızı trafik ışıkları. Hiçbir şey kaymıyor, çünkü hareket etmiyorsun.',
      },
      restNext: {
        title: 'Hızlanınca ne olacak?',
        body: 'Önce renkler değişir, sonra her şey gittiğin yöne doğru toplanır. Alttaki hız çubuğuyla hızlanabilirsin.',
      },
      slow: {
        title: 'Henüz çok yavaş',
        body: (percent) =>
          `Işık hızının %${percent} kadarıyla gidiyorsun. Bu, en hızlı uzay aracından bile hızlı! Ama ışığa göre yavaş: renkler daha yeni yeni kaymaya başlıyor.`,
      },
      colours: {
        title: 'Renkler kayıyor',
        body: (colour, wavelength) =>
          `Işık bir dalgadır. Dalgalara doğru koşarsan dalgalar sana daha sık çarpar; ışıkta bu, rengi maviye kaydırır. Bu yüzden öndeki kırmızı trafik ışığı şimdi ${colour} görünüyor (${wavelength}).`,
      },
      lamps: {
        title: 'Lamba ışığı da kayıyor',
        body: (colour) =>
          `Sokak lambalarının beyaz ışığı, karışmış birçok renkten oluşur. Hepsi maviye doğru kaydığı için lambaların aydınlattığı yol ve binalar önünde ${colour} görünüyor; ortadan uzaklaştıkça renk daha az kayıyor.`,
      },
      invisible: {
        title: 'Lambalar söndü mü?',
        body: 'Hayır, hâlâ yanıyorlar. Önden gelen ışıkları morun da ötesine, gözünün göremediği morötesine kaydı. Güneş yanığı yapan ışık da morötesidir.',
      },
      ring: {
        title: 'Gökkuşağı halkası',
        body: 'Lambaların ışığı artık yalnızca bir halkada görünüyor. Halkanın içinde morötesine, dışında kızılötesine kaçtı. Halkada içe doğru yeşil, mavi, mor; dışa doğru pembe, sarı, kırmızı var.',
      },
      brightness: {
        title: 'Önden gelen ışık güçleniyor',
        body: (gain) =>
          `Işık, foton denen minicik paketlerle gelir. Onlara doğru gidince fotonlar sana daha sık ve daha güçlü çarpar. Bu yüzden önde ay ışığı alan yerler ${gain} kat parladı; arkada her şey sönükleşti.`,
      },
      camera: {
        title: 'Kamera ayar yapıyor',
        opens: (ev) =>
          `Gördüğün yerlerin çoğu karardı. Kamera, karanlık bir odaya girince gözlerinin yaptığı gibi daha çok ışık alıyor (${ev} EV). Bu yüzden ekran, gerçekte olduğundan aydınlık.`,
        closes: (ev) =>
          `Görüntü çok parladı. Kamera, güneşte gözlerini kıstığın gibi daha az ışık alıyor (${ev} EV). Bu yüzden ekran, gerçekte olduğundan karanlık.`,
      },
      crowding: {
        pull: {
          title: 'Her şey öne toplanıyor',
          body: 'Yağmurda koşarken damlalar önden geliyormuş gibi olur; şemsiyeni öne eğersin. Işık da öyle: yandan gelen ışık önden geliyormuş gibi görünür. Bu yüzden binalar ortaya doğru eğiliyor.',
        },
        beside: {
          title: 'Yanındakiler önünde',
          body: (angle) =>
            `Tam yanındaki şeyler artık önünde görünüyor: gittiğin yönden yalnızca ${angle} açıda. Onlardan gelen ışık, koşarken yağmur damlaları gibi öne eğildi.`,
        },
        circle: {
          title: 'Arkandakiler bile önünde',
          body: (angle) =>
            `Önünde kalan caddenin tamamı, ortadaki yarıçapı ${angle} olan dairede. Dışında gördüğün her şey aslında yanında ya da arkanda.`,
        },
      },
      shapes: {
        title: 'Arabalar neden kısalmadı?',
        body: (times) =>
          `Öndeki arabalar ezilmedi; yalnızca küçüldü, sanki ${times} kat daha uzaktalar. Uzak uçlarından gelen ışık daha önce, aranızdaki yol daha uzunken yola çıktı. Kısalmayı ölçülen görünümde görebilirsin.`,
      },
      measured: {
        title: 'Ölçülen görünüm',
        rest: (grid) =>
          `Dururken ölçtüğün ile gördüğün aynıdır. Hızlanınca bu görünümde her şey gittiğin yönde kısalır; yerdeki ${grid} metrelik kareler ince dilimlere döner.`,
        main: (gamma, road) =>
          `Gözün gördüğü bu değil, ölçtüğün bu. Her yeri senin saatine göre aynı anda ölçünce gittiğin yönde her şey ${gamma} kat daha kısa: 100 metrelik yol ${road} çıkar. Arabalar ve binalar da öyle.`,
      },
      measuredWhy: {
        title: 'Gözün bunu neden görmez?',
        body: 'Görmek, sana aynı anda varan ışıkla olur. Uzak uçtan gelen ışık daha önce yola çıkmıştır; bu gecikme kısalmayı saklar. Görülen görünümde arabalar kısa değil, küçük ve uzak görünür.',
      },
      measuredColours: {
        title: 'Renkler neden aynı?',
        body: 'Bu görünüm, ışığın sana nasıl geldiğini değil, neyin nerede olduğunu gösterir. Bu yüzden renk kayması yok. Renkler için görülen görünüme dön.',
      },
      clocks: {
        title: 'Saatler farklı ilerliyor',
        body: (gamma) =>
          `Cadde boyunca saatler dizili olduğunu düşün. Yanlarından geçerken karşılaştır: onlar ${gamma} saniye ilerlediğinde seninki yalnızca 1 saniye ilerler. Ölçerlerdeki öz zaman ve cadde zamanı bunu gösterir.`,
      },
      heatGlow: {
        title: 'Cadde kendiliğinden parlıyor',
        body: (colour, likeness, celsius, ambient) =>
          `Cadde ve hava bile görünmez ısı ışığı yayar. Hızın bu ışığı görünür kıldı: önde cadde, ${likeness}, ${colour} parlıyor (yaklaşık ${celsius} °C). Oysa cadde hâlâ ${ambient} °C.`,
      },
      heatOff: {
        title: 'Isıl ışıma kapalı',
        body: 'Şu an caddenin ve havanın kendi ısısıyla yaydığı ışık gösterilmiyor. Isıl ışımayı açarsan önde nasıl parladıklarını görürsün.',
      },
      stars: {
        title: 'Yıldızlar öne toplanıyor',
        body: 'Yıldızlar da gittiğin yöne doğru toplanıyor ve renkleri maviye kayıyor. Ama gökkuşağı olmuyor: ısıtılan her şey gibi bir yıldızın rengi de kırmızıdan beyaza, maviye gider; hiç yeşil olmaz.',
      },
      moon: {
        reflected: {
          title: 'Ay öne kayıyor',
          body: (gain) =>
            `Ay, gittiğin yöne doğru kaydı. Daha küçük görünüyor ama ışığı ${gain} kat güçlendi ve rengi maviye kaydı.`,
        },
        ownGlow: {
          title: 'Ay kendi ısısıyla parlıyor',
          body: 'Ay, gittiğin yöne doğru kaydı ve minicik oldu. Artık yansıttığı güneş ışığından çok kendi ısısıyla parlıyor, tıpkı önündeki cadde gibi.',
        },
      },
      behind: {
        title: 'Arkana bakıyorsun',
        redder:
          'Arkadan gelen ışığın dalgalarından uzaklaşıyorsun; dalgalar sana daha seyrek ulaşıyor. Bu yüzden arkada mavi ışık yeşile, yeşil ışık sarıya ya da kırmızıya döner ve her şey sönükleşir.',
        infrared:
          'Lambaların arkadan gelen ışığı kırmızının da ötesine, kızılötesine kaydı. Televizyon kumandası da bu ışığı kullanır; gözün göremez. Arkası karanlık, ama ışıksız değil.',
      },
      side: {
        titleSide: 'Yana bakıyorsun',
        titleUp: 'Yukarı bakıyorsun',
        bodySlow:
          'Işık bir dalgadır. Önden gelen dalgalar sana daha sık, arkadan gelenler daha seyrek ulaşır. Bu yüzden ekranın gittiğin yöne yakın kenarı maviye, öbür kenarı kırmızıya kayıyor.',
        bodyFast:
          'Ekranın ortasında gördüğün şeyler aslında arkanda kalıyor: ışıkları öne eğildi. Ekranın gittiğin yöne yakın kenarı maviye, öbür kenarı kırmızıya kayıyor ve kararıyor.',
      },
      lens: {
        title: (lens) => `Mercek ×${lens}`,
        body: (lens) =>
          `Mercek, dürbün gibi ekranın ortasını ${lens} kat büyütür. Işığa bir şey yapmaz. Çok hızlıyken her şey ortada toplandığı için işe yarar.`,
      },
      speedOfLight: {
        title: 'Işık yine aynı hızda',
        body: (km) =>
          `Ne kadar hızlansan da ışık sana yine saniyede yaklaşık ${km} km hızla ulaşır. Değişen ışığın hızı değil; geldiği yön, rengi ve parlaklığı.`,
      },
      limit: {
        title: 'Işık hızına ulaşılamaz',
        body: 'Hızlandıkça ışık hızına yalnızca biraz daha yaklaşırsın; ona hiç ulaşamazsın. Bu görüntü bir fotonun değil, ışık hızına çok yaklaşmış bir yolcunun gördüğü.',
      },
    },
    extras: {
      ringGuide: 'Kılavuzdaki D = 1 çizgisinde renkler hiç değişmez.',
      crowdingGuide: 'Kılavuzdaki θ = 90° çemberi, yanındaki şeylerin göründüğü yeri gösterir.',
      crowdingLens: 'Merceği ×10 yap, daireyi büyüt.',
    },
  },
  inventory: {
    tabs: { label: 'Panelin görünümleri', now: 'Şimdi', inventory: 'Ekranda neler var?' },
    intro: 'Bir maddeyi seç; ekranda nerede olduğu işaretlenir.',
    groups: {
      scene: 'Sahne',
      guides: 'Kılavuz işaretleri',
      instruments: 'Ölçerler',
      rail: 'Hız çubuğu',
      bar: 'Üst çubuk ve paneller',
    },
    entries: {
      avenue: {
        title: 'Gece caddesi',
        body: 'Gece vakti uzun bir şehir caddesi. Yolun tam ortasında, göz hizasında, cadde boyunca ileri gidiyorsun. Cadde ve içindeki her şey yerinde duruyor; hareket eden yalnızca sensin.',
      },
      road: {
        title: 'Yol',
        body: 'Araçların durduğu gri asfalt. Üzerinde açık renkli çizgiler, iki kenarında beyaz bordürler var. Onu sokak lambaları ve Ay aydınlatır.',
      },
      crossings: {
        title: 'Yaya geçitleri',
        body: 'Yayaların karşıdan karşıya geçtiği, açık renkli şeritlerle çizilmiş yerler. Her birinin iki yanında birer trafik ışığı durur.',
      },
      pavements: {
        title: 'Kaldırımlar',
        body: 'Yolun iki yanında, yayaların yürüdüğü gri kaldırımlar. Üzerlerinde sokak lambaları, ağaçlar, banklar ve şemsiyeler duruyor.',
      },
      buildings: {
        title: 'Binalar ve gökdelenler',
        body: 'Caddenin iki yanında önde binalar ve gökdelenler, arkada ikinci bir sıra yüksek yapı var. Hızlanınca görülen görünümde gittiğin yöne doğru toplanırlar, çünkü ışıklarının sana geldiği yön değişir.',
      },
      windows: {
        title: 'Işıklı pencereler',
        body: 'Binaların camlı pencereleri. Bazılarının ardında ampul ışığıyla aydınlanan odalar var, ötekiler karanlık. Ampul ışığı sıcak bir cismin ışığıdır: hızlanınca önde sarıdan beyaza, sonra maviye döner; hiç yeşil olmaz.',
      },
      lamps: {
        title: 'Sokak lambaları',
        body: 'Yolun iki yanında, kolları yola uzanan beyaz LED lambalar. Işıkları yalnızca görünür renklerden oluşur; bu yüzden yeterince hızlanınca önde morötesine, arkada kızılötesine kaçar ve görünmez olur.',
      },
      signals: {
        title: 'Trafik ışıkları',
        body: 'Yaya geçitlerindeki trafik ışıkları. Hepsinde yalnızca kırmızı yanıyor; sarı ve yeşil camlar karanlık. LED ışıkları tek renkli olduğu için hızlanınca öndeki ışıkların kırmızısı sırayla turuncuya, sarıya, yeşile ve maviye kayar.',
      },
      cars: {
        title: 'Park etmiş araçlar',
        body: 'Yoldaki iki şeride park etmiş arabalar ve motosikletler. Hiçbiri hareket etmiyor; hareket eden sensin. Çok hızlıyken görülen görünümde öndekiler ezilmiş değil, küçülmüş ve uzaklaşmış gibi görünür.',
      },
      trees: {
        title: 'Ağaçlar',
        body: 'Kaldırımlara dikilmiş büyük ve küçük ağaçlar. Onları sokak lambaları ve Ay aydınlatır.',
      },
      benches: {
        title: 'Banklar',
        body: 'Kaldırımlardaki tahta banklar. Onları sokak lambaları ve Ay aydınlatır.',
      },
      parasols: {
        title: 'Şemsiyeler',
        body: 'Kaldırımlarda duran yeşil bahçe şemsiyeleri. Onları sokak lambaları ve Ay aydınlatır.',
      },
      gantry: {
        title: 'Tabela köprüsü',
        body: 'Bazı yerlerde yolun üstünden geçen, turuncu tabelalı bir köprü. Tabelaların içinde lamba yok; onları sokak lambaları ve Ay aydınlatır.',
      },
      sky: {
        title: 'Gece göğü',
        body: 'Şehrin ışığı havada saçılır ve göğü, en çok ufka yakın yerde, hafif mavimsi aydınlatır. Bu, sokak lambalarının ışığıdır; yeterince hızlanınca onunla birlikte kayar ve görünmez olur.',
      },
      moon: {
        title: 'Dolunay',
        body: 'Neredeyse tam önünde, biraz yukarıda bir dolunay. Yansıttığı güneş ışığı birçok renkten oluştuğu için hızlanınca maviye kayar ama görünmez olmaz. Çok hızlıyken ısıl ışıma açıksa kendi ısısıyla da parlar.',
      },
      stars: {
        title: 'Yıldızlar',
        body: 'Gökteki yıldızlar. Hızlandıkça ışıkları sana gittiğin yöne daha yakın bir yerden geliyormuş gibi ulaşır, bu yüzden öne toplanırlar. Sıcak cisimler oldukları için gökkuşağına dönmezler: renkleri hep kırmızı, beyaz ve mavi arasında kalır.',
      },
      ground: {
        title: 'Uzaktaki zemin',
        body: 'Binaların ötesinde uzanan karanlık, düz bir zemin. Onu Ay ve caddeden taşan biraz lamba ışığı aydınlatır.',
      },
      farEnd: {
        title: 'Caddenin uzak ucu',
        body: 'Bilgisayar caddenin yalnızca bir parçasını çizer. Uzakta bu parça yavaş yavaş silinir; ilerledikçe arkanda kalan bloklar önüne taşınır, böylece cadde hiç bitmez.',
      },
      ring: {
        title: 'Doppler halkası',
        body: 'Lamba ışığı yalnızca görünür renklerden oluşur. Yeterince hızlıyken önde morötesine, arkada kızılötesine kaçar; arada, renklerinin hâlâ görünür kaldığı gökkuşağı renkli bir halka kalır.',
      },
      heatGlow: {
        title: 'Sıcaklığın ışığı',
        body: 'Cadde, binalar, hava ve Ay, sıcaklıkları yüzünden gözle görülmeyen ısı ışığı yayar. Çok hızlıyken bu ışık maviye kayıp görünür olur ve önde her şey kendiliğinden parlar. Üst çubuktaki düğmeyle açılıp kapanır.',
      },
      grid: {
        title: 'Ölçüm ızgarası',
        body: 'Yalnızca ölçülen görünümde yere çizilen turuncu çizgiler ve kareler. Hızlandıkça gittiğin yönde daha kısa ölçüldükleri için kareler ince dilimlere döner.',
      },
      crosshair: {
        title: 'Hareket yönü',
        body: 'Ortasında halka olan turuncu artı işareti, tam olarak gittiğin yönü gösterir. Kılavuz açıkken görünür; etrafa bakınca ekranda yer değiştirir.',
      },
      transverseCircle: {
        title: 'θ = 90° çemberi',
        body: 'Noktalı çember, tam yanındaki şeylerin ışığının sana nereden geldiğini gösterir. Hızlandıkça küçülür: yanındakiler önünde görünür. Kılavuz açıkken, görülen görünümde ve hareket ederken çizilir.',
      },
      neutralCircle: {
        title: 'D = 1 çemberi',
        body: 'Kesik çizgili çember, ışığın rengi değişmeden geldiği yeri gösterir. İçinden gelen ışık maviye, dışından gelen kırmızıya kayar. Kılavuz açıkken, görülen görünümde ve hareket ederken çizilir.',
      },
      dock: {
        title: 'Ölçerler paneli',
        body: 'Bu hızla ilgili sayıları gösteren panel. Sayılar hız değiştikçe hemen güncellenir. Ölçülen görünümde yalnızca saatler ve yolun uzunluğu kalır.',
      },
      collapse: {
        title: 'Daraltma düğmesi',
        body: 'Ölçerler panelini daraltır ya da yeniden açar. Daraltınca yalnızca hızı anlatan cümle kalır.',
      },
      sentence: {
        title: 'Hız cümlesi',
        body: 'Panelin başındaki cümle, bu hızın görüntüye ne yaptığını kısaca özetler. Hız değiştikçe cümle de değişir.',
      },
      properTime: {
        title: 'Öz zaman τ',
        body: 'Senin saatin: başlangıçtan ya da son sıfırlamadan beri onda geçen zaman. Hareket ederken, yanından geçtiğin cadde saatleriyle karşılaştırınca daha yavaş ilerler; ne kadar yavaş olduğunu hız çubuğundaki dτ/dt söyler.',
      },
      resetClocks: {
        title: 'Saatleri sıfırla',
        body: 'Öz zamanı ve cadde zamanını sıfırdan yeniden başlatır.',
      },
      streetTime: {
        title: 'Cadde zamanı t',
        body: 'Cadde boyunca dizildiğini düşündüğümüz, caddeye göre duran saatlerin zamanı. Senin saatini, yanından geçtiğin cadde saatiyle karşılaştırmak içindir.',
      },
      road100: {
        title: '100 m’lik yol',
        body: 'Durgun hâlde 100 metre olan bir yol parçasının, iki ucu senin saatine göre aynı anda ölçülünce kaç metre çıktığı. Hızlandıkça kısalır; bunu gözün görmez, ölçülen görünüm gösterir.',
      },
      transverse: {
        title: 'Yan düzlem θ = 90°',
        body: 'Tam yanındaki şeylerin ışığının sana gittiğin yönden kaç derece açıyla ulaştığı. Dururken 90°; hızlandıkça küçülür, çünkü ışık sana gitgide daha çok önden geliyormuş gibi ulaşır.',
      },
      neutralCone: {
        title: 'Nötr koni D = 1',
        body: 'Rengi değişmeden gelen ışığın gittiğin yönle yaptığı açı. Bu açının içinden gelen ışık maviye, dışından gelen kırmızıya kayar. Dururken çizgi gösterir, çünkü hiçbir renk kaymaz.',
      },
      ahead555: {
        title: '555 nm · ileride',
        body: 'Gözün en iyi gördüğü 555 nm’lik yeşil ışık tam önden gelseydi sana hangi dalga boyunda ve renkte ulaşacağı. Dalgalarına doğru gittiğin için dalgalar daha sık gelir; bu yüzden maviye kayar.',
      },
      behind555: {
        title: '555 nm · geride',
        body: 'Aynı yeşil ışık tam arkadan gelseydi sana hangi dalga boyunda ve renkte ulaşacağı. Dalgalarından uzaklaştığın için dalgalar daha seyrek gelir; bu yüzden kırmızıya kayar.',
      },
      ambient: {
        title: '288 K’lik ortam · ileride',
        body: 'Cadde ve hava 288 K, yani 15 °C sıcaklıkta. Tam önden gelen ısı ışıkları sana, bu satırdaki sıcaklıkta bir cisminki gibi ulaşır: 288 K çarpı ileri Doppler çarpanı D₀.',
      },
      exposure: {
        title: 'Pozlama',
        body: 'Kamera, gözbebeklerinin karanlıkta büyümesi gibi, ne kadar ışık alacağını kendisi ayarlar. Bu sayı, durduğun zamana göre ne kadar çok (+) ya da az (−) ışık aldığını EV ile gösterir; her 1 EV iki kat demektir.',
      },
      spectrum: {
        title: 'Elektromanyetik tayf',
        body: '1 nm ile 1 mm arasındaki ışık türleri, soldan sağa dalga boyuna göre dizili: solda X ışınları ve morötesi, ortadaki renkli dar şeritte gözün gördüğü ışık, sağda kızılötesi.',
      },
      spectrumMarkers: {
        title: 'Tayftaki işaretler',
        body: 'Üstteki “ileride” üçgeni, 555 nm’lik yeşil ışığın tam önden gelince nereye kaydığını; alttaki “geride” üçgeni tam arkadan gelince nereye kaydığını gösterir. Hızlandıkça renkli şeritten dışarı çıkarlar.',
      },
      beta: {
        title: 'Hız β = v/c',
        body: 'Hızının, ışık hızının ne kadarı olduğu: 0 duruyorsun demek, 1 ışık hızı olurdu. 1’e hiç ulaşılamaz; bu simülasyon 0,99999’da durur.',
      },
      speed: {
        title: 'Hız v',
        body: 'Aynı hız, saniyede kilometre olarak. Işık her saniyede yaklaşık 300 bin km yol alır.',
      },
      gamma: {
        title: 'Lorentz çarpanı γ',
        body: 'Dururken 1’dir. Senin saatin 1 saniye ilerlerken, yanından geçtiğin cadde saatleri γ saniye ilerler; gittiğin yöndeki uzunluklar da γ kat kısa ölçülür.',
      },
      clockRate: {
        title: 'Saat hızı dτ/dt',
        body: 'Senin saatinin, cadde saatlerine göre ne hızla ilerlediği: 1/γ. Dururken 1’dir; 0,5 olunca senin saatin 1 saniye ilerlerken cadde saatleri 2 saniye ilerler.',
      },
      doppler: {
        title: 'İleri Doppler çarpanı D₀',
        body: 'Tam önden gelen ışık dalgalarının sana kaç kat daha sık ulaştığı. Dalga boyu bu sayıya bölünür, her fotonun enerjisi bu sayıyla çarpılır; arkadan gelen ışıkta tersi olur.',
      },
      slider: {
        title: 'Hız sürgüsü',
        body: 'Sürükleyerek hız seç; ışık hızına yaklaştıkça sürgü küçük hız farklarına daha çok yer ayırır. Küçük elmas, hızın şu an nerede olduğunu gösterir; hız seçtiğin değere yavaş yavaş yetişir.',
      },
      presets: {
        title: 'Hazır hızlar',
        body: 'Sürgünün altındaki sayılar; birine basınca o hıza gidersin. 0,866 c’de γ = 2 olur: senin saatin, cadde saatlerinin yarı hızıyla ilerler.',
      },
      steps: {
        title: 'Yavaşla ve hızlan',
        body: '− ve + düğmeleri hızı birer adım değiştirir. Her adım aynı itmedir; ama ışık hızına yaklaştıkça hızını gitgide daha az artırır.',
      },
      title: {
        title: 'Uygulamanın adı',
        body: 'Life of a Photon, yani “Bir fotonun hayatı”. Ama bir fotonun kendine ait bir bakış noktası yoktur: gördüğün, caddenin ışık hızına çok yaklaşmış bir yolcunun gözünden görünüşüdür.',
      },
      view: {
        title: 'Görülen ya da ölçülen',
        body: 'Görülen: o anda gözüne ulaşan ışığın gösterdiği, renk kaymasıyla ve öne toplanmayla. Ölçülen: her şeyin senin saatine göre aynı anda nerede olduğu; renk kayması yok, yalnızca gittiğin yönde kısalma var.',
      },
      thermal: {
        title: 'Isıl ışıma düğmesi',
        body: 'Caddenin, binaların, havanın ve Ay’ın sıcaklıkları yüzünden yaydığı ışığı gösterir ya da gizler. Bu ışık ancak çok hızlıyken görünür olur.',
      },
      guides: {
        title: 'Kılavuz düğmesi',
        body: 'Görüntünün üstüne üç işaret çizer: hareket yönü, θ = 90° çemberi ve D = 1 çemberi. Bunlar görüntünün parçası değildir, yalnızca yol gösterir.',
      },
      lens: {
        title: 'Mercek',
        body: 'Dürbün gibi ekranın ortasını ×1, ×3 ya da ×10 büyütür. Işığa bir şey yapmaz; çok hızlıyken her şey ortada toplandığı için işe yarar.',
      },
      pause: {
        title: 'Duraklat',
        body: 'Simülasyonu dondurur: cadde akmaz, saatler durur. Görüntü bu hızdaki görüntü olarak kalır; yine de etrafa bakabilirsin.',
      },
      why: {
        title: '“Neden?” düğmesi',
        body: 'Bu paneli açar ya da kapatır. Panel, görüntünün neden böyle göründüğünü sade sözlerle anlatır.',
      },
      explainer: {
        title: 'Neden böyle görünüyor?',
        body: 'Bu panel. “Şimdi”, şu an görüntüde olanları nedenleriyle anlatır; öbür görünüm ekrandaki her şeyi tek tek tanıtır. “Şimdi” bölümündeki maddeler bilimsel analize bağlanır.',
      },
      dossier: {
        title: 'Bilimsel analiz düğmesi',
        body: 'Simülasyonun arkasındaki bilimi anlatan belgeyi açar ya da kapatır.',
      },
      dossierSheet: {
        title: 'Bilimsel analiz',
        body: 'Kuramı, yöntemi, doğrulamayı ve kaynakçayı ayrıntılı anlatan belge. Geniş ekranda sahnenin yanında, dar ekranda ekranın tamamında açılır; içindeki düğmeler sahneyi anlatılan duruma getirir.',
      },
      shortcuts: {
        title: 'Kısayollar',
        body: 'Klavye tuşlarının ve fare hareketlerinin listesini açar. Örneğin ↑ ve ↓ ile hızlanıp yavaşlarsın, sürükleyerek etrafa bakarsın.',
      },
      language: {
        title: 'Dil düğmesi',
        body: 'Türkçe ile İngilizce arasında geçiş yapar.',
      },
      lookAhead: {
        title: 'İleri bak',
        body: 'Yalnızca başka bir yöne bakarken görünür. Basınca bakışın yeniden gittiğin yöne döner.',
      },
    },
    details: {
      avenue: (millions, metres) =>
        `Her şeyi izleyebilesin diye görüntü, gerçeğe göre yaklaşık ${millions} milyon kat yavaş oynatılır; renkler ve açılar bundan etkilenmez. Bu hızla ekranda geçen her saniyede ${metres} metre yol alırsın.`,
      crossings: (spacing) => `Cadde boyunca her ${spacing} metrede bir yaya geçidi var.`,
      windows: (lit, now, rest) =>
        `Her 100 pencereden yaklaşık ${lit} tanesi yanıyor. Odaların ışığı ${rest} K sıcaklıkta bir cisminki gibi; tam önden gelen pencere ışığı sana şimdi ${now} K sıcaklıkta bir cisminki gibi ulaşıyor.`,
      lamps: (spacing, ahead, behind) =>
        `Her iki yanda, her ${spacing} metrede bir lamba var. Tam önden gelen ışıkları hız ${ahead} c’yi, tam arkadan gelenler ${behind} c’yi geçince görünmez olur.`,
      signals: (colour, wavelength) => `Tam önden gelen kırmızı ışık sana şimdi ${wavelength} olarak ulaşıyor: ${colour}.`,
      moon: (now, rest) => `Ay, gittiğin yönden ${rest} uzakta duruyor; ışığı sana şimdi gittiğin yönden ${now} açıyla ulaşıyor.`,
      stars: (count, gain) =>
        `Gökte ${count} yıldız var. Gerçekte bu ekranda görünemeyecek kadar sönükler; görünsünler diye ışıkları ${gain} kat güçlendirildi.`,
      farEnd: (ahead, behind) => `Cadde önde yaklaşık ${ahead} metrede, arkada yaklaşık ${behind} metrede tamamen silinmiş olur.`,
      ring: {
        none: (behind, ahead) =>
          `Şimdilik lamba ışığı her yönden görünür olarak geliyor. Arkada hız ${behind} c’yi, önde ${ahead} c’yi geçince kaybolmaya başlar.`,
        disc: (outer) =>
          `Arkadan gelen lamba ışığı görünmez oldu; görünür kalan, gittiğin yönden ${outer} açıya kadar gelen ışık.`,
        between: (inner, outer) =>
          `Lamba ışığı şimdi yalnızca gittiğin yönden ${inner} ile ${outer} arasındaki bir halkadan görünür olarak geliyor.`,
      },
      heatGlow: (now, rest, from) =>
        `Cadde ve hava ${rest} K sıcaklıkta. Tam önden gelen ısı ışıkları sana şimdi ${now} K sıcaklıkta bir cisminki gibi ulaşıyor; hız yaklaşık ${from} c’yi geçince gözle görülür.`,
      grid: (rest, now) => `Çizgilerin arası durgun hâlde ${rest}; şu an gittiğin yönde ${now} ölçülüyor.`,
      transverseCircle: (angle) => `Yanındaki şeylerin ışığı sana şimdi gittiğin yönden ${angle} açıyla ulaşıyor.`,
      neutralCircle: (angle) => `Bu çember şu an gittiğin yönden ${angle} uzakta.`,
      neutralCircleRest: 'Dururken hiçbir ışığın rengi değişmez; bu yüzden bu çember çizilmez.',
    },
  },
  pointer: {
    motion: 'Gittiğin yön',
    behind: 'Arkan',
    transverse: 'θ = 90° çemberi',
    neutral: 'D = 1 çemberi',
    ring: 'Doppler halkası',
    glow: 'Sıcaklığın ışığı',
    moon: 'Ay',
    stars: 'Yıldızlar',
    sky: 'Gece göğü',
    crossing: 'Yaya geçidi',
    signal: 'Trafik ışığı',
    lamp: 'Sokak lambası',
    car: 'Park etmiş araç',
    tree: 'Ağaç',
    bench: 'Bank',
    parasol: 'Şemsiye',
    gantry: 'Tabela köprüsü',
    facade: 'Bina',
    window: 'Pencereler',
    road: 'Yol',
    pavement: 'Kaldırım',
    ground: 'Uzaktaki zemin',
    farEnd: 'Caddenin uzak ucu',
    grid: 'Izgara çizgisi',
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
    guides: 'Guides',
    lens: 'Lens',
    lensValue: (lens) => `×${lens}`,
    pause: 'Pause',
    resume: 'Resume',
    dossier: 'Scientific dossier',
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
    still: 'Picture: a still frame of the simulation, 0.866 c',
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
      ['E', '“Why does it look like this?” panel'],
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
  explain: {
    title: 'Why does it look like this?',
    toggle: 'Why?',
    readMore: 'Read in the scientific dossier',
    readMoreAbout: (title) => `Read in the scientific dossier: ${title}`,
    alsoNow: 'Also right now',
    announce: (titles) => `Explanation: ${titles.join('; ')}.`,
    glowColours: ['red', 'orange', 'yellowish white', 'white', 'bluish white', 'light blue'],
    glowLikeness: [
      'like a red-hot stove coil',
      'like a candle flame',
      'like a light-bulb filament',
      'though less than the Sun',
      'brighter even than the Sun’s surface',
    ],
    items: {
      paused: {
        title: 'Time is paused',
        body: 'You pressed pause. The street has stopped moving and the clocks have stopped. The screen still shows the picture for this speed; you can look around.',
      },
      rest: {
        title: 'You are standing still',
        body: 'You see the night avenue as it is: white street lamps, the Moon, lit windows and red traffic lights. Nothing is shifted, because you are not moving.',
      },
      restNext: {
        title: 'What if you speed up?',
        body: 'First the colours change, then everything gathers towards where you are heading. Use the speed rail at the bottom to speed up.',
      },
      slow: {
        title: 'Still very slow',
        body: (percent) =>
          `You are moving at ${percent}% of the speed of light. That is faster than the fastest spacecraft! But next to light it is slow: the colours are only just starting to shift.`,
      },
      colours: {
        title: 'Colours are shifting',
        body: (colour, wavelength) =>
          `Light is a wave. Run towards waves and they reach you more often; for light, that shifts the colour towards blue. That is why the red traffic light ahead now looks ${colour} (${wavelength}).`,
      },
      lamps: {
        title: 'Lamp light shifts too',
        body: (colour) =>
          `The street lamps’ white light is a mix of many colours. All of them shifted towards blue, so the road and buildings they light look ${colour} ahead; less so away from the middle.`,
      },
      invisible: {
        title: 'Did the lamps go out?',
        body: 'No, they are still on. Their light from ahead has shifted beyond violet, into ultraviolet, which your eyes cannot see. The light that gives you sunburn is ultraviolet too.',
      },
      ring: {
        title: 'The rainbow ring',
        body: 'The lamps’ light now shows only in a ring: inside it, it went ultraviolet; outside, infrared. Across it: green, blue, violet inwards; pink, yellow, red outwards.',
      },
      brightness: {
        title: 'Light from ahead grows stronger',
        body: (gain) =>
          `Light comes in tiny packets called photons. Heading into them, they hit you more often and harder. So ahead, moonlit places are ${gain} times brighter; behind, everything has dimmed.`,
      },
      camera: {
        title: 'The camera adjusts',
        opens: (ev) =>
          `Much of what you look at has gone dark. Like your eyes in a dark room, the camera lets in more light (${ev} EV). So the screen looks brighter than it really is.`,
        closes: (ev) =>
          `The view has become very bright. Like you squinting in sunshine, the camera lets in less light (${ev} EV). So the screen looks darker than it really is.`,
      },
      crowding: {
        pull: {
          title: 'Everything gathers ahead',
          body: 'When you run in the rain, drops seem to come from ahead; you tilt your umbrella forward. Light is the same: side light seems to come from ahead. So buildings lean towards the middle.',
        },
        beside: {
          title: 'What’s beside you is ahead',
          body: (angle) =>
            `Things right beside you now appear ahead, only ${angle} from where you are heading. Their light tilted forward, like raindrops when you run.`,
        },
        circle: {
          title: 'Even what’s behind is ahead',
          body: (angle) =>
            `All of the avenue in front of you fits in the middle circle, radius ${angle}. Everything outside it is really beside or behind you.`,
        },
      },
      shapes: {
        title: 'Why aren’t the cars shorter?',
        body: (times) =>
          `The cars ahead aren’t squashed, only smaller, as if ${times} times farther away. Light from their far end set out earlier, when you were farther apart. The measured view shows the shortening.`,
      },
      measured: {
        title: 'The measured view',
        rest: (grid) =>
          `Standing still, what you measure is what you see. Speed up, and in this view everything shortens along your way; the ${grid}-metre squares on the ground turn into thin slices.`,
        main: (gamma, road) =>
          `Not what your eyes see, but what you measure at one moment of your clock. Along your way everything is ${gamma} times shorter: 100 m of road is ${road}, and cars likewise.`,
      },
      measuredWhy: {
        title: 'Why don’t eyes see this?',
        body: 'You see with light that reaches you at one moment. Light from the far end set out earlier; that delay hides the shortening. In the seen view cars look small and far away, not short.',
      },
      measuredColours: {
        title: 'Why no colour shift?',
        body: 'This view shows where things are, not how their light reaches you. That is why no colour shifts. Go back to the seen view for the colours.',
      },
      clocks: {
        title: 'The clocks disagree',
        body: (gamma) =>
          `Imagine clocks all along the street. As you pass them, they move on ${gamma} seconds while your clock moves on only 1. The proper time and street time instruments show this.`,
      },
      heatGlow: {
        title: 'The street glows by itself',
        body: (colour, likeness, celsius, ambient) =>
          `The street and air give off invisible heat light. Your speed made it visible: ahead the street glows ${colour}, ${likeness} (about ${celsius} °C). Yet it is ${ambient} °C.`,
      },
      heatOff: {
        title: 'Thermal emission is off',
        body: 'Right now the light that the street and the air give off by their own warmth is not shown. Switch thermal emission on to see them glow ahead.',
      },
      stars: {
        title: 'The stars crowd forward',
        body: 'The stars gather towards where you are heading, and their colours shift towards blue. But there is no rainbow: like anything heated, a star only goes from red to white to blue, never green.',
      },
      moon: {
        reflected: {
          title: 'The Moon slides forward',
          body: (gain) =>
            `The Moon has slid towards where you are heading. It looks smaller, but its light is ${gain} times stronger and bluer.`,
        },
        ownGlow: {
          title: 'The Moon glows by itself',
          body: 'The Moon has slid towards where you are heading and become tiny. It now shines more by its own warmth than by the sunlight it reflects, just like the street ahead.',
        },
      },
      behind: {
        title: 'You are looking back',
        redder:
          'You are moving away from the light waves behind you, so they reach you less often. That is why, behind you, blue light turns green, green turns yellow or red, and everything dims.',
        infrared:
          'The lamps’ light from behind has shifted beyond red, into infrared. A TV remote uses this kind of light; your eyes cannot see it. It is dark back there, but not empty of light.',
      },
      side: {
        titleSide: 'You are looking sideways',
        titleUp: 'You are looking up',
        bodySlow:
          'Light is a wave. Waves from ahead reach you more often, waves from behind less often. So the edge of the screen towards where you are heading turns blue, the other edge red.',
        bodyFast:
          'What you see in the middle of the screen is really behind you: its light has tilted forward. The edge towards where you are heading turns blue; the other edge turns red and dark.',
      },
      lens: {
        title: (lens) => `Lens ×${lens}`,
        body: (lens) =>
          `Like binoculars, the lens enlarges the middle of the screen ${lens} times. It does nothing to the light. That helps at high speed, when everything gathers in the middle.`,
      },
      speedOfLight: {
        title: 'Light is still as fast',
        body: (km) =>
          `However fast you go, light still reaches you at about ${km} km per second. What changes is not its speed but the direction it comes from, its colour and its brightness.`,
      },
      limit: {
        title: 'You can’t reach light speed',
        body: 'Speeding up only brings you a little closer to the speed of light; you never reach it. This is not what a photon sees, but what a traveller very close to light speed would see.',
      },
    },
    extras: {
      ringGuide: 'Along the D = 1 guide, colours stay the same.',
      crowdingGuide: 'The θ = 90° guide circle shows where things beside you appear.',
      crowdingLens: 'Switch the lens to ×10 to enlarge the circle.',
    },
  },
  inventory: {
    tabs: { label: 'Views of the panel', now: 'Now', inventory: 'What is on the screen?' },
    intro: 'Choose an entry to have it marked on the screen.',
    groups: {
      scene: 'The scene',
      guides: 'Guide marks',
      instruments: 'Instruments',
      rail: 'Speed rail',
      bar: 'Top bar and panels',
    },
    entries: {
      avenue: {
        title: 'The night avenue',
        body: 'A long city avenue at night. You travel along it, at eye height in the middle of the road. The avenue and everything in it stand still; only you are moving.',
      },
      road: {
        title: 'The road',
        body: 'The grey asphalt the vehicles stand on, with light-coloured lines on it and white kerbs along both edges. The street lamps and the Moon light it.',
      },
      crossings: {
        title: 'Pedestrian crossings',
        body: 'Places where people cross the road, marked with light-coloured stripes. A traffic light stands on either side of each one.',
      },
      pavements: {
        title: 'Pavements',
        body: 'The grey pavements on both sides of the road, where people walk. Street lamps, trees, benches and parasols stand on them.',
      },
      buildings: {
        title: 'Buildings and skyscrapers',
        body: 'On both sides of the avenue stand buildings and skyscrapers, with a second row of tall ones behind. As you speed up, the seen view gathers them towards where you are heading, because the direction their light reaches you from changes.',
      },
      windows: {
        title: 'Lit windows',
        body: 'The glass windows of the buildings. Behind some are rooms lit by bulb light; the others are dark. Bulb light is the light of a hot body: speeding up turns it from yellow to white, then blue ahead, never green.',
      },
      lamps: {
        title: 'Street lamps',
        body: 'White LED lamps on both sides, their arms reaching over the road. Their light holds only visible colours, so at enough speed it slips into ultraviolet ahead and infrared behind, and turns invisible.',
      },
      signals: {
        title: 'Traffic lights',
        body: 'The traffic lights at the crossings. Only red is lit in all of them; the amber and green glass is dark. Their LED light has a single colour, so speeding up shifts the red of the lights ahead through orange, yellow and green to blue.',
      },
      cars: {
        title: 'Parked vehicles',
        body: 'Cars and motorcycles parked in both lanes of the road. None of them moves; you do. At very high speed the seen view shows the ones ahead not squashed, but smaller, as if farther away.',
      },
      trees: {
        title: 'Trees',
        body: 'Large and small trees planted along the pavements. The street lamps and the Moon light them.',
      },
      benches: {
        title: 'Benches',
        body: 'Wooden benches on the pavements. The street lamps and the Moon light them.',
      },
      parasols: {
        title: 'Parasols',
        body: 'Green garden parasols standing on the pavements. The street lamps and the Moon light them.',
      },
      gantry: {
        title: 'Sign gantry',
        body: 'In some places a gantry with orange signs spans the road. There are no lamps inside the signs; the street lamps and the Moon light them.',
      },
      sky: {
        title: 'The night sky',
        body: 'The city’s light scatters in the air and lights the sky faintly, most near the horizon, with a bluish tint. It is the light of the street lamps, so at enough speed it shifts with it and turns invisible.',
      },
      moon: {
        title: 'The full Moon',
        body: 'A full Moon almost straight ahead, a little above. The sunlight it reflects holds many colours, so speeding up turns it bluer but never invisible. At very high speed it also glows by its own warmth, if thermal emission is on.',
      },
      stars: {
        title: 'Stars',
        body: 'The stars in the sky. As you speed up their light reaches you as if from nearer to where you are heading, so they crowd forward. Being hot bodies they never turn into a rainbow: their colours always stay between red, white and blue.',
      },
      ground: {
        title: 'The ground beyond',
        body: 'A dark, flat ground stretching beyond the buildings. The Moon and a little lamp light spilling from the avenue light it.',
      },
      farEnd: {
        title: 'The far end',
        body: 'The computer draws only a piece of the avenue. In the distance that piece fades away bit by bit; as you advance, the blocks left behind are moved ahead, so the avenue never ends.',
      },
      ring: {
        title: 'The Doppler ring',
        body: 'Lamp light holds only visible colours. At enough speed it escapes into ultraviolet ahead and infrared behind; in between, where its colours are still visible, a rainbow-coloured ring remains.',
      },
      heatGlow: {
        title: 'The light of warmth',
        body: 'The street, the buildings, the air and the Moon give off invisible heat light because they are warm. At very high speed it shifts into the visible and everything ahead glows by itself. A switch in the top bar turns it on and off.',
      },
      grid: {
        title: 'The measuring grid',
        body: 'Orange lines and squares drawn on the ground in the measured view only. As you speed up they measure shorter along your way, so the squares turn into thin slices.',
      },
      crosshair: {
        title: 'Direction of motion',
        body: 'The orange cross with a ring in the middle marks exactly where you are heading. It shows while the guides are on, and moves across the screen as you look around.',
      },
      transverseCircle: {
        title: 'θ = 90° circle',
        body: 'The dotted circle shows where light from things right beside you comes from. It shrinks as you speed up: what is beside you appears ahead. It is drawn while the guides are on, in the seen view, when you move.',
      },
      neutralCircle: {
        title: 'D = 1 circle',
        body: 'The dashed circle shows where light arrives with its colour unchanged. Light from inside it shifts towards blue, from outside towards red. It is drawn while the guides are on, in the seen view, when you move.',
      },
      dock: {
        title: 'Instruments panel',
        body: 'The panel that shows the numbers belonging to this speed. They update as soon as the speed changes. In the measured view only the clocks and the length of the road remain.',
      },
      collapse: {
        title: 'Collapse button',
        body: 'Collapses the instruments panel or opens it again. Collapsed, only the sentence about the speed stays.',
      },
      sentence: {
        title: 'The speed sentence',
        body: 'The sentence at the top of the panel sums up briefly what this speed does to the picture. It changes as the speed changes.',
      },
      properTime: {
        title: 'Proper time τ',
        body: 'Your clock: the time that has passed on it since the start or the last reset. While you move, it runs slower than the street clocks you pass, compared one by one; dτ/dt on the speed rail says how much slower.',
      },
      resetClocks: {
        title: 'Reset clocks',
        body: 'Starts the proper time and the street time again from zero.',
      },
      streetTime: {
        title: 'Street time t',
        body: 'The time on clocks we imagine standing all along the avenue, at rest in it. It is there to compare your clock with the street clock you are passing.',
      },
      road100: {
        title: '100 m of road',
        body: 'How long a piece of road that is 100 metres at rest measures when both its ends are taken at one moment of your clock. It shortens as you speed up; your eye does not see this, the measured view shows it.',
      },
      transverse: {
        title: 'Transverse plane θ = 90°',
        body: 'At what angle from where you are heading light from things right beside you reaches you. At rest 90°; it shrinks as you speed up, because light seems to come more and more from ahead.',
      },
      neutralCone: {
        title: 'Neutral cone D = 1',
        body: 'The angle from where you are heading at which light arrives with its colour unchanged. Light from inside it shifts towards blue, from outside towards red. At rest it shows a dash, as no colour shifts.',
      },
      ahead555: {
        title: '555 nm · ahead',
        body: 'At which wavelength and colour green light of 555 nm, the colour the eye sees best, would reach you from dead ahead. You are heading into its waves, so they arrive more often and it shifts towards blue.',
      },
      behind555: {
        title: '555 nm · behind',
        body: 'At which wavelength and colour the same green light would reach you from directly behind. You are moving away from its waves, so they arrive less often and it shifts towards red.',
      },
      ambient: {
        title: '288 K surroundings · ahead',
        body: 'The street and the air are at 288 K, that is 15 °C. Their heat light from dead ahead reaches you like that of a body at the temperature in this row: 288 K times the head-on Doppler factor D₀.',
      },
      exposure: {
        title: 'Exposure',
        body: 'Like the pupils of your eyes widening in the dark, the camera sets by itself how much light it takes in. This number shows in EV how much more (+) or less (−) light it takes in than at rest; each 1 EV is twice as much.',
      },
      spectrum: {
        title: 'Electromagnetic spectrum',
        body: 'The kinds of light from 1 nm to 1 mm, set out from left to right by wavelength: X-rays and ultraviolet on the left, the light your eye sees in the narrow coloured strip, infrared on the right.',
      },
      spectrumMarkers: {
        title: 'Markers on the spectrum',
        body: 'The “ahead” triangle above shows where green 555 nm light lands when it comes from dead ahead; the “behind” triangle below, when it comes from directly behind. As you speed up they leave the coloured strip.',
      },
      beta: {
        title: 'Speed β = v/c',
        body: 'Your speed as a share of the speed of light: 0 means standing still, 1 would be the speed of light. 1 can never be reached; this simulation stops at 0.99999.',
      },
      speed: {
        title: 'Speed v',
        body: 'The same speed in kilometres per second. Light travels about 300 thousand km every second.',
      },
      gamma: {
        title: 'Lorentz factor γ',
        body: 'It is 1 at rest. While your clock moves on 1 second, the street clocks you pass move on γ seconds, and lengths along your way measure γ times shorter.',
      },
      clockRate: {
        title: 'Clock rate dτ/dt',
        body: 'How fast your clock moves on compared with the street clocks: 1/γ. At rest it is 1; at 0.5, your clock moves on 1 second while the street clocks move on 2.',
      },
      doppler: {
        title: 'Head-on Doppler factor D₀',
        body: 'How many times more often light waves from dead ahead reach you. Their wavelength is divided by this number and the energy of each photon multiplied by it; for light from behind it is the other way round.',
      },
      slider: {
        title: 'Speed slider',
        body: 'Drag to choose a speed; near the speed of light the slider gives more room to small differences in speed. The small diamond shows where the speed is right now, as it slowly catches up with your choice.',
      },
      presets: {
        title: 'Preset speeds',
        body: 'The numbers under the slider; press one to go to that speed. At 0.866 c, γ = 2: your clock moves on at half the rate of the street clocks.',
      },
      steps: {
        title: 'Slower and faster',
        body: '− and + change the speed one step at a time. Every step is the same push, yet near the speed of light it adds less and less speed.',
      },
      title: {
        title: 'Name of the application',
        body: 'Life of a Photon. Yet a photon has no point of view of its own: what you see is the avenue through the eyes of a traveller very close to the speed of light.',
      },
      view: {
        title: 'Seen or measured',
        body: 'Seen: what the light reaching your eye at one moment shows, with its colour shifts and its crowding ahead. Measured: where everything is at one moment of your clock; no colour shift, only shortening along your way.',
      },
      thermal: {
        title: 'Thermal emission switch',
        body: 'Shows or hides the light the street, the buildings, the air and the Moon give off because they are warm. That light becomes visible only at very high speed.',
      },
      guides: {
        title: 'Guides switch',
        body: 'Draws three marks over the picture: the direction of motion, the θ = 90° circle and the D = 1 circle. They are not part of the picture, only pointers.',
      },
      lens: {
        title: 'Lens',
        body: 'Like binoculars, it enlarges the middle of the screen ×1, ×3 or ×10. It does nothing to the light; it helps at high speed, when everything gathers in the middle.',
      },
      pause: {
        title: 'Pause',
        body: 'Freezes the simulation: the avenue stops moving and the clocks stop. The picture stays the one for this speed, and you can still look around.',
      },
      why: {
        title: 'The “Why?” button',
        body: 'Opens or closes this panel. The panel explains in plain words why the picture looks the way it does.',
      },
      explainer: {
        title: 'Why does it look like this?',
        body: 'This panel. “Now” explains what is in the picture at this moment, and why; the other view introduces everything on the screen one by one. The items of “Now” lead to the scientific dossier.',
      },
      dossier: {
        title: 'Scientific dossier button',
        body: 'Opens or closes the document that explains the science behind the simulation.',
      },
      dossierSheet: {
        title: 'Scientific dossier',
        body: 'A detailed account of the theory, the method, the checks and the references. On a wide screen it opens beside the scene, on a narrow one over all of it; its buttons set the scene to what the text describes.',
      },
      shortcuts: {
        title: 'Shortcuts',
        body: 'Opens the list of keys and mouse gestures. For example, ↑ and ↓ speed you up and slow you down, and dragging looks around.',
      },
      language: {
        title: 'Language button',
        body: 'Switches between Turkish and English.',
      },
      lookAhead: {
        title: 'Look ahead',
        body: 'Appears only while you are looking elsewhere. Press it to turn your view back to where you are heading.',
      },
    },
    details: {
      avenue: (millions, metres) =>
        `So that you can follow it, the picture plays about ${millions} million times slower than reality; colours and angles are not affected. At this speed you cover ${metres} metres in every second on the screen.`,
      crossings: (spacing) => `There is a pedestrian crossing every ${spacing} metres along the avenue.`,
      windows: (lit, now, rest) =>
        `About ${lit} windows in every 100 are lit. The rooms’ light is like that of a body at ${rest} K; window light from dead ahead now reaches you like that of a body at ${now} K.`,
      lamps: (spacing, ahead, behind) =>
        `On each side there is a lamp every ${spacing} metres. Their light from dead ahead turns invisible above ${ahead} c, from directly behind above ${behind} c.`,
      signals: (colour, wavelength) => `Red light from dead ahead now reaches you at ${wavelength}: ${colour}.`,
      moon: (now, rest) => `The Moon stands ${rest} from where you are heading; its light now reaches you ${now} from there.`,
      stars: (count, gain) =>
        `There are ${count} stars in the sky. In reality they are too faint for this screen; their light was made ${gain} times stronger so that you can see them.`,
      farEnd: (ahead, behind) =>
        `The avenue has faded out completely about ${ahead} metres ahead and about ${behind} metres behind.`,
      ring: {
        none: (behind, ahead) =>
          `For now lamp light arrives visible from every direction. It starts to vanish behind above ${behind} c, ahead above ${ahead} c.`,
        disc: (outer) =>
          `Lamp light from behind has turned invisible; what stays visible comes from within ${outer} of where you are heading.`,
        between: (inner, outer) =>
          `Lamp light now arrives visible only from a ring between ${inner} and ${outer} from where you are heading.`,
      },
      heatGlow: (now, rest, from) =>
        `The street and the air are at ${rest} K. Their heat light from dead ahead now reaches you like that of a body at ${now} K; above about ${from} c the eye can see it.`,
      grid: (rest, now) => `At rest the lines are ${rest} apart; along your way they now measure ${now}.`,
      transverseCircle: (angle) => `Light from things beside you now reaches you ${angle} from where you are heading.`,
      neutralCircle: (angle) => `This circle now lies ${angle} from where you are heading.`,
      neutralCircleRest: 'At rest no light changes colour, so this circle is not drawn.',
    },
  },
  pointer: {
    motion: 'Where you are heading',
    behind: 'Behind you',
    transverse: 'θ = 90° circle',
    neutral: 'D = 1 circle',
    ring: 'Doppler ring',
    glow: 'The light of warmth',
    moon: 'The Moon',
    stars: 'Stars',
    sky: 'The night sky',
    crossing: 'Pedestrian crossing',
    signal: 'Traffic light',
    lamp: 'Street lamp',
    car: 'Parked vehicle',
    tree: 'Tree',
    bench: 'Bench',
    parasol: 'Parasol',
    gantry: 'Sign gantry',
    facade: 'Building',
    window: 'Windows',
    road: 'Road',
    pavement: 'Pavement',
    ground: 'The ground beyond',
    farEnd: 'The far end',
    grid: 'Grid line',
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
