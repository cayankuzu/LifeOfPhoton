export type Language = 'tr' | 'en';

export interface RegimeCommentary {
  badge: string;
  title: string;
  summary: string;
  timeDilationText: string;
  lengthContractionText: string;
  opticalEffectText: string;
}

export function getRegimeCommentary(beta: number, gamma: number, lang: Language): RegimeCommentary {
  const isTr = lang === 'tr';
  const kms = Math.round(beta * 299_792.458).toLocaleString();

  if (beta < 0.05) {
    return isTr
      ? {
          badge: 'STATIK REJIM • DÜNYA REFERANSI',
          title: 'Klasik Newton Evreni (v ≈ 0)',
          summary: 'Işık gözünüze neredeyse anında ulaştığı için uzay ve zaman mutlak görünür. Hiçbir nesne bükülmez, saatler eşzamanlı ilerler.',
          timeDilationText: 'Zaman akışı sokak saatiyle birebir aynıdır (γ = 1.000).',
          lengthContractionText: 'Mesafe büzülmesi sıfırdır; 100 metre tam 100 metredir.',
          opticalEffectText: 'Işık sapması ve Doppler kayması gözlemlenmez.',
        }
      : {
          badge: 'STATIC REGIME • EARTH FRAME',
          title: 'Classical Newtonian World (v ≈ 0)',
          summary: 'Light reaches your eyes almost instantaneously. Space and time appear absolute; geometry is unwarped.',
          timeDilationText: 'Clocks tick in unison with the street clock (γ = 1.000).',
          lengthContractionText: 'Spatial contraction is zero; 100 meters is exactly 100 meters.',
          opticalEffectText: 'No measurable light aberration or Doppler shift.',
        };
  }

  if (beta < 0.72) {
    const contracted100m = (100 / gamma).toFixed(1);
    const sideAngle = ((Math.acos(beta) * 180) / Math.PI).toFixed(0);
    return isTr
      ? {
          badge: `RELATIVISTIK BASLANGIC • ${kms} km/s`,
          title: `Hafif Büzülme ve Maviye Kayma (v = ${(beta * 100).toFixed(0)}% c)`,
          summary: 'İleriye doğru yüksek hızda koşan bir gözlemci için önündeki ışık dalgaları sıkışmaya, yol ise hareket yönünde kısalmaya başlar.',
          timeDilationText: `Senin saatinde 1.0 sn geçerken sokakta ${(gamma).toFixed(2)} sn geçer.`,
          lengthContractionText: `100 metrelik cadde ${contracted100m} metreye indi (%${((1 - 1 / gamma) * 100).toFixed(0)} büzülme).`,
          opticalEffectText: `Tam 90° yanındaki binalar artık ${sideAngle}° önünde görünür (Aberrasyon).`,
        }
      : {
          badge: `RELATIVISTIC ONSET • ${kms} km/s`,
          title: `Onset of Contraction & Blueshift (v = ${(beta * 100).toFixed(0)}% c)`,
          summary: 'Oncoming light waves compress toward higher frequencies, and distance ahead contracts noticeably.',
          timeDilationText: `1.0s on your watch corresponds to ${(gamma).toFixed(2)}s on the street.`,
          lengthContractionText: `100m of avenue contracts to ${contracted100m}m (${((1 - 1 / gamma) * 100).toFixed(0)}% shrink).`,
          opticalEffectText: `Objects at 90° transverse position sweep to ${sideAngle}° forward.`,
        };
  }

  if (beta < 0.94) {
    const contracted100m = (100 / gamma).toFixed(1);
    const sideAngle = ((Math.acos(beta) * 180) / Math.PI).toFixed(0);
    return isTr
      ? {
          badge: `KRITIK DÖNÜM NOKTASI • γ ≈ ${gamma.toFixed(2)}`,
          title: 'Zaman ve Uzayın Yarılanması (v = 0.866c)',
          summary: 'Doğanın 2 kat eşiğindesiniz: Zaman tam yarı hızına iner ve önünüzdeki şehir hareket yönünde yarı yarıya basıklaşır.',
          timeDilationText: 'Senin 1 saniyende sokakta 2 tam saniye geçer (γ = 2.000).',
          lengthContractionText: `100 metrelik cadde ${contracted100m} metreye iner (hareket yönünde %50 büzülme).`,
          opticalEffectText: `Işık gecikmesi yüzünden arkandaki binalar bile (${sideAngle}°) ön görüş alanına girer.`,
        }
      : {
          badge: `CRITICAL THRESHOLD • γ ≈ ${gamma.toFixed(2)}`,
          title: 'Halving of Time & Distance (v = 0.866c)',
          summary: 'The milestone where time rate is halved and forward space is compressed by exactly 50%.',
          timeDilationText: '1 second on your clock spans 2 full seconds on the street.',
          lengthContractionText: `100 meters of road contracts to ${contracted100m} meters (50% shrink).`,
          opticalEffectText: `Even buildings located behind you sweep into the front cone (${sideAngle}°).`,
        };
  }

  if (beta < 0.998) {
    const contracted100m = (100 / gamma).toFixed(1);
    return isTr
      ? {
          badge: `ASIRI RELATIVISTIK • γ = ${gamma.toFixed(1)}`,
          title: 'Tünel Görüşü ve Doppler Gökkuşağı (v = 0.99c)',
          summary: 'Arkanızdaki neredeyse tüm 360° dünya önünüzdeki dar bir ışık konisine sıkışır. Merkez kör edici maviye kayarken çevre kararır.',
          timeDilationText: `Senin 1 saniyende Dünya'da tam ${gamma.toFixed(0)} saniye tükenir.`,
          lengthContractionText: `100 metrelik cadde senin için sadece ${contracted100m} metrelik ince bir çizgiye döner.`,
          opticalEffectText: 'Merkezde şiddetli mavi projektör parlaması, çevrede Doppler gökkuşağı oluşur.',
        }
      : {
          badge: `EXTREME RELATIVISTIC • γ = ${gamma.toFixed(1)}`,
          title: 'Tunnel Vision & Doppler Rainbow (v = 0.99c)',
          summary: 'Nearly the entire 360° surroundings compress into a forward cone. The center beams violet while periphery fades to infrared.',
          timeDilationText: `1 second for you spans ${gamma.toFixed(0)} seconds on Earth.`,
          lengthContractionText: `100 meters shrinks down to just ${contracted100m} meters.`,
          opticalEffectText: 'Intense headlight beaming ahead surrounded by a neutral Doppler rainbow iris.',
        };
  }

  return isTr
    ? {
        badge: `MUTLAK FOTON REJIMI • γ = ${gamma.toFixed(0)}`,
        title: 'Fotonun Referans Çerçevesi (v → 0.99999c)',
        summary: 'Işık hızındaki bir foton için zaman durur (0 saniye) ve tüm mesafe tek bir iki boyutlu düzleme çöker. Doğduğu an ile vardığı an aynı andır.',
        timeDilationText: 'Fotonun öz saati sıfırdır (Δτ = 0): Foton için evrende zaman geçmez.',
        lengthContractionText: 'Tüm evren hareket yönünde sıfır kalınlığa büzülür (L → 0).',
        opticalEffectText: 'Bütün 360° gökyüzü ve Dünya tam karşıdaki tek bir foton tekilliğine çöker.',
      }
    : {
        badge: `PHOTON LIMIT REGIME • γ = ${gamma.toFixed(0)}`,
        title: 'The Photon’s Reference Frame (v → 0.99999c)',
        summary: 'For a photon, proper time ceases to tick (0s) and distance collapses to a 2D plane. Emission and absorption occur simultaneously.',
        timeDilationText: 'Proper time is zero (Δτ = 0): No time passes for a photon.',
        lengthContractionText: 'The entire universe contracts to zero thickness along motion (L → 0).',
        opticalEffectText: 'The entire 360° cosmos collapses into a single blinding point dead ahead.',
      };
}

export interface ThoughtTopic {
  id: string;
  title: string;
  summary: string;
  explanation: string;
  keyFact: string;
  tryBeta: number;
}

export function getThoughtTopics(lang: Language): ThoughtTopic[] {
  const isTr = lang === 'tr';
  return isTr
    ? [
        {
          id: 'thought-experiment',
          title: 'Bu Düşünce Deneyinin Amacı Nedir?',
          summary: '16 yaşındaki Einstein’ın hayali: "Bir ışık dalgasına binip onunla birlikte uçsaydım evreni nasıl görürdüm?"',
          explanation: 'Günlük hayat hızlarımız ışığın yanında sıfır kaldığı için zamanın her yerde aynı aktığını sanırız. Bu simülasyon, insan hızından ışık hızına kadar uzay ve zamanın nasıl büküldüğünü birebir Einstein denklemleriyle görselleştirir.',
          keyFact: 'Işık hızı (c = 299.792.458 m/s) evrenin mutlak hız sınırıdır; hiçbir kütleli cisim bu hızı aşamaz.',
          tryBeta: 0.0,
        },
        {
          id: 'light-nature',
          title: 'Foton Nedir ve Neden Kütlesi Sıfırdır?',
          summary: 'Foton, elektromanyetik alanın kütlesiz kuantum enerji paketidir.',
          explanation: 'Fotonun durgun kütlesi sıfırdır (m₀ = 0). Bu yüzden sonsuz enerjiye ihtiyaç duymadan, doğduğu andan itibaren tam c hızında ilerler. İçindeki elektrik ve manyetik alanlar birbirine dik salınarak uzayda yayılır.',
          keyFact: 'Kütlesi olan bir cismi ışık hızına çıkarmak sonsuz enerji gerektirir; bu yüzden sadece kütlesiz parçacıklar c hızında uçabilir.',
          tryBeta: 0.5,
        },
        {
          id: 'time-dilation',
          title: 'Hızlandıkça Zaman Neden Yavaşlar?',
          summary: 'Işık hızının herkes için aynı kalması gerektiğinden, hızlanan gözlemci için zaman akışı mecburen yavaşlar.',
          explanation: 'İki ayna arasında zıplayan bir ışık saati düşünün. Siz ileri hızlandığınızda, ışık aynalara yetişmek için daha uzun bir hipotenüs yolu yürümek zorundadır. Işığın hızı sabit olduğundan bu yolculuk daha uzun sürer ve saatiniz yavaşlar.',
          keyFact: '0.866c hızında sizin saatinizde 1 saniye geçerken dışarıdaki durgun dünyada 2 saniye tükenir (γ = 2).',
          tryBeta: 0.8660254,
        },
        {
          id: 'length-contraction',
          title: 'Araba Işık Hızına Yaklaşırsa Boyu Uzar mı, Kısalır mı?',
          summary: 'Kesinlikle uzamaz; sadece hareket yönünde bir madeni para gibi büzülür. Eni ve tavanı hiç değişmez.',
          explanation: 'Lorentz büzülmesi (L = L₀ / γ) yalnızca hareket doğrultusunda gerçekleşir. 4.6 metrelik bir spor araba 0.866c hızında 2.3 metreye, 0.9999c hızında ise birkaç santimetreye büzülür.',
          keyFact: 'En ve yükseklik boyutları değişmez; araba sadece hareket ekseninde krep gibi yassılaşır.',
          tryBeta: 0.8660254,
        },
        {
          id: 'terrell-rotation',
          title: 'Dışarıdan Bakan Göz Gerçekte Ne Görür? (Terrell Etkisi)',
          summary: 'Işık sonlu bir hızla yayıldığı için, büzülen cisimler gözümüze sanki yana dönmüş gibi görünür.',
          explanation: 'Bir arabanın arkasından çıkan ışık gözümüze daha uzun sürede ulaşır. Bu gecikme yüzünden gözlemci doğrudan arabanın yanına bakarken bile arabanın arka tamponunu öne dönmüş (Terrell rotasyonu) olarak fotoğraflar.',
          keyFact: 'Özel görelilik sadece geometrik büzülme değildir; optik gecikmeler cisimleri görsel olarak döndürür ve büker.',
          tryBeta: 0.99,
        },
        {
          id: 'mass-energy',
          title: 'Işık Hızına Yaklaşan Nesnenin Kütlesi ve Enerjisi Ne Olur?',
          summary: 'Kinetik enerjisi sonsuza gider. Bir arabayı 0.99c hızına çıkarmak yüz binlerce nükleer bomba enerjisi gerektirir.',
          explanation: 'Hızlandıkça cismin eylemsizlik direnci m = γ·m₀ olarak artar. 1500 kg bir araba 0.99c hızında 10.600 kg ağırlığındaki bir tır gibi davranır. Işık hızına ulaşmak evrendeki tüm enerjiden fazlasını gerektirir.',
          keyFact: 'E = γ·m₀·c² bağıntısı gereği ışık hızında kinetik enerji sonsuzdur.',
          tryBeta: 0.99,
        },
        {
          id: 'photon-perspective',
          title: 'Fotonun Gözünden Evren Nasıl Görünür?',
          summary: 'Bir foton için zaman yoktur (0 saniyedir) ve bütün evren tek bir iki boyutlu düzleme büzülmüştür.',
          explanation: 'Işık hızında γ → ∞ olur. Bu sebeple fotonun kendi öz zamanı Δτ = Δt / γ = 0 olur. Milyonlarca ışık yılı uzaktaki bir yıldızdan çıkıp gözünüze giren bir foton için doğduğu an ile gözünüze ulaştığı an arasında sıfır saniye geçmiştir.',
          keyFact: 'Işığın doğuşu ile yok oluşu onun kendi referans çerçevesinde tek bir andır.',
          tryBeta: 0.99999,
        },
      ]
    : [
        {
          id: 'thought-experiment',
          title: 'What Is the Purpose of This Thought Experiment?',
          summary: '16-year-old Einstein’s thought experiment: "What would the universe look like if I rode along with a beam of light?"',
          explanation: 'Because our everyday velocities are negligible compared to c, we intuit that time and space are absolute. This simulation shows how space contracts and time dilates as speed approaches c.',
          keyFact: 'Light speed (c = 299,792,458 m/s) is the universe’s universal speed limit; no massive entity can surpass it.',
          tryBeta: 0.0,
        },
        {
          id: 'light-nature',
          title: 'What Is a Photon and Why Is It Massless?',
          summary: 'A photon is a massless quantum wave packet of the electromagnetic field.',
          explanation: 'A photon has zero rest mass (m₀ = 0). It propagates at exactly c from inception without requiring infinite kinetic energy. Perpendicular electric and magnetic waves sustain each other in vacuum.',
          keyFact: 'Accelerating any object with mass to c requires infinite energy, which is physically impossible.',
          tryBeta: 0.5,
        },
        {
          id: 'time-dilation',
          title: 'Why Does Time Slow Down at Near-Light Speed?',
          summary: 'Because c must be invariant for all observers, moving clocks must tick slower to compensate.',
          explanation: 'Consider a bouncing light-clock between two mirrors. In motion, the light pulse must travel a longer diagonal path. Because c is invariant, each tick takes longer and proper time slows down.',
          keyFact: 'At 0.866c, 1 second on your clock corresponds to 2 seconds for a stationary observer (γ = 2).',
          tryBeta: 0.8660254,
        },
        {
          id: 'length-contraction',
          title: 'Does a Car Stretch or Shorten at Light Speed?',
          summary: 'It never stretches; it flattens like a pancake strictly along its axis of motion. Transverse dimensions stay invariant.',
          explanation: 'Lorentz contraction (L = L₀ / γ) acts purely along the direction of motion. A 4.6m car flattens to 2.3m at 0.866c and down to a few centimeters at 0.9999c.',
          keyFact: 'Width and height are unaffected; the car flattens strictly in length.',
          tryBeta: 0.8660254,
        },
        {
          id: 'terrell-rotation',
          title: 'What Do Eyes Actually See? (Terrell-Penrose Effect)',
          summary: 'Because light travels at finite speed, contracted objects appear optically rotated to an external camera.',
          explanation: 'Light emitted from the rear of the car takes longer to reach the observer. This retardation causes the observer to see the rear face even when looking directly at the side profile.',
          keyFact: 'Relativistic vision combines pure Lorentz contraction with optical time-retardation rotation.',
          tryBeta: 0.99,
        },
        {
          id: 'mass-energy',
          title: 'What Happens to the Car’s Mass and Energy?',
          summary: 'Kinetic energy diverges to infinity. Reaching 0.99c requires thousands of megatons of TNT equivalent.',
          explanation: 'Effective inertia grows as m = γ·m₀. A 1,500 kg vehicle at 0.99c behaves with the inertial resistance of a 10,600 kg truck. Infinite energy is needed to reach c.',
          keyFact: 'Because E = γ·m₀·c², reaching light speed demands more than the total energy of the observable universe.',
          tryBeta: 0.99,
        },
        {
          id: 'photon-perspective',
          title: 'What Does the Universe Look Like to a Photon?',
          summary: 'For a photon, proper time is zero (0 seconds) and distance collapses to a single 2D plane.',
          explanation: 'As v → c, γ → ∞. Proper time Δτ = Δt / γ = 0. A photon emitted from a distant galaxy reaches your eye with exactly zero elapsed seconds on its own reference frame.',
          keyFact: 'Emission and absorption are instantaneous in the photon’s frame of reference.',
          tryBeta: 0.99999,
        },
      ];
}

export interface GlossaryItem {
  symbol: string;
  name: string;
  definition: string;
}

export function getGlossaryItems(lang: Language): GlossaryItem[] {
  const isTr = lang === 'tr';
  return isTr
    ? [
        { symbol: 'c', name: 'Işık Hızı', definition: '299.792.458 m/s. Evrendeki mutlak bilgi ve nedensellik hızı.' },
        { symbol: 'β', name: 'Hız Oranı (Beta)', definition: 'v / c. Cisme ait hızın ışık hızına olan kesirsel oranı.' },
        { symbol: 'γ', name: 'Lorentz Faktörü (Gamma)', definition: '1 / √(1 - β²). Zaman genleşmesi ve boy kısalmasının katsayısı.' },
        { symbol: 'L', name: 'Uzunluk Büzülmesi', definition: 'L = L₀ / γ. Hareket doğrultusunda fiziksel mesafelerin kısalması.' },
        { symbol: 'τ', name: 'Öz Zaman (Tau)', definition: 'Hareket eden gözlemcinin kendi kol saatinde geçen gerçek zaman.' },
        { symbol: 'D(θ)', name: 'Doppler Çarpanı', definition: 'Işığın yaklaşırken maviye, uzaklaşırken kırmızıya kayma faktörü.' },
        { symbol: 'θ\'', name: 'Işık Sapması (Aberrasyon)', definition: 'Hareket yönüne doğru çevresel ışık konisinin daralması.' },
      ]
    : [
        { symbol: 'c', name: 'Speed of Light', definition: '299,792,458 m/s. The universal cosmic speed limit of causality.' },
        { symbol: 'β', name: 'Velocity Ratio (Beta)', definition: 'v / c. Speed expressed as a fraction of light speed.' },
        { symbol: 'γ', name: 'Lorentz Factor (Gamma)', definition: '1 / √(1 - β²). Scale factor for time dilation and length contraction.' },
        { symbol: 'L', name: 'Length Contraction', definition: 'L = L₀ / γ. Contraction of longitudinal physical lengths.' },
        { symbol: 'τ', name: 'Proper Time (Tau)', definition: 'Time measured by a clock accompanying the moving observer.' },
        { symbol: 'D(θ)', name: 'Doppler Factor', definition: 'Spectral wavelength compression (blue) or dilation (red).' },
        { symbol: 'θ\'', name: 'Relativistic Aberration', definition: 'Beaming of the apparent viewing field toward the direction of motion.' },
      ];
}

export const UI_TEXT = {
  tr: {
    appTitle: 'LIFE OF A PHOTON',
    opticalMode: 'OPTİK GÖRÜNÜM',
    geometricMode: 'SAF BÜZÜLME',
    dossierBtn: 'BİLİMSEL ANALİZ',
    resetClock: 'Sıfırla',
  },
  en: {
    appTitle: 'LIFE OF A PHOTON',
    opticalMode: 'OPTICAL VIEW',
    geometricMode: 'CONTRACTION ONLY',
    dossierBtn: 'SCIENTIFIC DOSSIER',
    resetClock: 'Reset',
  },
};
