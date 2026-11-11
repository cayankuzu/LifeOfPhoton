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
  /** Label and hint of the switch in the top bar. */
  readonly toggle: string;
  readonly toggleHint: string;
  /** Link to the dossier under each item; its accessible name adds the title of the item. */
  readonly readMore: string;
  readonly readMoreAbout: (title: string) => string;
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
    toggleHint: 'Görüntünün neden böyle göründüğünü sade bir dille anlatır',
    readMore: 'Bilimsel analizde oku',
    readMoreAbout: (title) => `Bilimsel analizde oku: ${title}`,
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
    toggleHint: 'Explains in plain words why the picture looks the way it does',
    readMore: 'Read in the scientific dossier',
    readMoreAbout: (title) => `Read in the scientific dossier: ${title}`,
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
