/**
 * Dossier, sections 5–7: method, observation guide, misconceptions.
 *
 * The table of model assumptions is generated from src/physics/scenario.ts, so the
 * document cannot disagree with the values the renderer actually uses.
 */

import { HIGHLIGHT_SLOPE } from '@/physics/display';
import { EXPOSURE_MAX_EV, EXPOSURE_MIN_EV } from '@/physics/exposure';
import { aberrate, dopplerFromRestAngle } from '@/physics/optics';
import { SPEED_OF_LIGHT } from '@/physics/constants';
import { MOON_DISC_LUMINANCE_CD_M2, REFERENCE_LUMINANCE_CD_M2, SCENARIO, slowMotionFactor } from '@/physics/scenario';
import { LUMINAIRE_FACE_AREA, LUMINAIRE_SPACING, LUMINAIRE_Y, ROAD_SURFACE_Y } from '@/scene/geometry/layout';
import { LUMINAIRE_FACE_LUMINANCE, LUMINAIRE_INTENSITY, carriagewayIlluminance } from '@/scene/geometry/lighting';
import { type Bilingual, L, type SourceSection, type Text } from '../types';
import { num, r, sig } from './helpers';

const { moon, street, interior, signals, environment, stars, camera, sky, ground } = SCENARIO;

/** A signed whole number with a true minus sign, as typeset in prose. */
const signed = (value: number): string => (value < 0 ? `−${-value}` : `+${value}`);

/** A decimal inside TeX: the Turkish comma must be braced so that KaTeX does not space it as punctuation. */
const texNum = (value: number, digits: number): Bilingual => {
  const { tr, en } = num(value, digits);
  return { tr: tr.replace(',', '{,}'), en };
};

/**
 * The bound on the error of a drawn edge (tessellation.test.ts enforces it), and what it
 * amounts to on a view 900 pixels high: the lens scales the focal length, so the
 * vertical field of view of the ×n lens has half-angle atan(tan(½ fov) / n).
 */
const EDGE_ERROR_RAD = 6e-3;
const VIEW_HEIGHT_PX = 900;
const pixelsOf = (angle: number, zoom: number): number =>
  Math.round((angle * (VIEW_HEIGHT_PX / 2) * zoom) / Math.tan((camera.fieldOfViewDeg * Math.PI) / 360));

/**
 * Percentages taken from scenario.ts. The Turkish text never attaches a case suffix
 * to them ("%42 kadarı", not "%42’si"): the suffix follows the number as it is read
 * out, and a hand-written one would go wrong as soon as a constant changes.
 */
const percent = (fraction: number, digits = 0): Bilingual => num(100 * fraction, digits);

/** The Moon at β = 0.99: where it is seen, and the temperature at which its own thermal emission appears. */
const MOON_AT_099 = (() => {
  const restAngle = Math.acos(Math.cos((moon.elevationDeg * Math.PI) / 180) * Math.cos((moon.azimuthDeg * Math.PI) / 180));
  return {
    angleDeg: Math.round((aberrate(restAngle, 0.99) * 180) / Math.PI),
    temperatureK: sig(moon.surfaceTemperatureK * dopplerFromRestAngle(restAngle, 0.99), 2),
  };
})();

/** The street lighting as the renderer bakes it, in the units a lighting engineer would quote. */
const LIGHTING = {
  spacingM: LUMINAIRE_SPACING,
  heightM: num(LUMINAIRE_Y - ROAD_SURFACE_Y, 1),
  intensityCd: sig(LUMINAIRE_INTENSITY * street.illuminanceLux, 2),
  uniformity: num(carriagewayIlluminance().uniformity, 2),
  faceAreaM2: num(LUMINAIRE_FACE_AREA, 2),
  faceLuminanceCdM2: sig(LUMINAIRE_FACE_LUMINANCE * REFERENCE_LUMINANCE_CD_M2, 2),
  litPercent: Math.round(interior.litFraction * 100),
};

/** The aspect the signals show, as an adverb of colour ("kırmızı yanar" / "shows red"). */
const SIGNAL_ASPECT: Bilingual = {
  red: { tr: 'kırmızı', en: 'red' },
  amber: { tr: 'sarı', en: 'amber' },
  green: { tr: 'yeşil', en: 'green' },
}[signals.aspect];

const withUnit = (value: Text, unit: string): Text =>
  typeof value === 'string' ? `${value} ${unit}` : { tr: `${value.tr} ${unit}`, en: `${value.en} ${unit}` };

const ASSUMPTION_ROWS: ReadonlyArray<readonly Text[]> = [
  [
    L('Ay ışığı, aydınlık düzeyi', 'Moonlight, illuminance'),
    L(
      `${num(moon.illuminanceLux, 1).tr} lx; ayrıca bunun %${percent(moon.skyFillFraction).tr} kadarı gökten yaygın olarak (yukarı bakan bir yüzey bu yaygın payın tamamını, aşağı bakan bir yüzey %${percent(moon.skyFillFacingDown).tr} kadarını alır)`,
      `${num(moon.illuminanceLux, 1).en} lx; in addition ${percent(moon.skyFillFraction).en} % of it diffusely from the sky (a surface facing up receives all of this diffuse share, one facing down ${percent(moon.skyFillFacingDown).en} % of it)`
    ),
    L(
      'gökyüzünde yüksekteki dolunay; çoğu dolunayda 0,05–0,2 lx, en çok yaklaşık 0,3 lx [@kyba2017]; yaygın pay varsayım',
      'a full Moon high in the sky; 0.05–0.2 lx for most full Moons, about 0.3 lx at most [@kyba2017]; diffuse share assumed'
    ),
  ],
  [
    L('Ay ışığı, tayf', 'Moonlight, spectrum'),
    L(`Planck, ${moon.colourTemperatureK} K`, `Planck, ${moon.colourTemperatureK} K`),
    L('yaygın olarak verilen renk sıcaklığı; varsayım', 'commonly quoted colour temperature; assumption'),
  ],
  [
    L('Ay’ın konumu ve büyüklüğü', 'Position and size of the Moon'),
    L(
      `yükseklik açısı ${moon.elevationDeg}°, hareket yönünden azimut ${moon.azimuthDeg}°; açısal yarıçap ${num(moon.angularRadiusDeg, 3).tr}°; diskin parıltısı yaklaşık ${sig(MOON_DISC_LUMINANCE_CD_M2, 2).tr} cd m⁻²`,
      `elevation ${moon.elevationDeg}°, azimuth ${moon.azimuthDeg}° from the direction of motion; angular radius ${num(moon.angularRadiusDeg, 3).en}°; luminance of the disc about ${sig(MOON_DISC_LUMINANCE_CD_M2, 2).en} cd m⁻²`
    ),
    L(
      'açısal yarıçap, Ay’ın yarıçapından ve ortalama uzaklığından [@williams2024moon]; diskin parıltısı, aydınlık düzeyinden ve açısal yarıçaptan çıkar; konum varsayım',
      'angular radius from the Moon’s radius and mean distance [@williams2024moon]; the luminance of the disc follows from the illuminance and the angular radius; position assumed'
    ),
  ],
  [
    L('Ay’ın ısıl ışıması', 'Thermal emission of the Moon'),
    L(
      `kara cisim, ${moon.surfaceTemperatureK} K, bütün disk için; yayınırlık ${num(moon.surfaceEmissivity, 2).tr}`,
      `black body at ${moon.surfaceTemperatureK} K over the whole disc; emissivity ${num(moon.surfaceEmissivity, 2).en}`
    ),
    L(
      'Diviner ölçümleri: ekvatorda öğle sıcaklığı en çok 387–397 K, kenara doğru düşer [@williams2017]; regolitin yayınırlığı Diviner verisine uydurulan ısıl modellerdeki gibi [@vasavada2012]; tek sıcaklık varsayım',
      'Diviner measurements: equatorial noon maxima of 387–397 K, falling towards the limb [@williams2017]; emissivity of the regolith as in the thermal models fitted to the Diviner data [@vasavada2012]; a single temperature assumed'
    ),
  ],
  [
    L('Sokak aydınlatması, aydınlık düzeyi', 'Street lighting, illuminance'),
    `${street.illuminanceLux} lx`,
    L(
      'EN 13201-2, C2 sınıfı: taşıt yolunun ortalaması [@en13201]',
      'class C2 of EN 13201-2: average over the carriageway [@en13201]'
    ),
  ],
  [
    L('Sokak aydınlatması, tayf', 'Street lighting, spectrum'),
    L(
      `${street.led.pumpPeakNm} nm’de pompa çizgisi (yarı yükseklikte tam genişlik ${street.led.pumpFwhmNm} nm) + tepesi ${street.led.phosphorPeakNm} nm’de olan fosfor bandı (kısa dalga yanında σ = ${street.led.phosphorSigmaBelowNm} nm, uzun dalga yanında ${street.led.phosphorSigmaAboveNm} nm); pompa tepesi fosfor tepesinin ${num(street.led.pumpToPhosphorRatio, 2).tr} katı; ≈ 4000 K`,
      `pump line at ${street.led.pumpPeakNm} nm (full width at half maximum ${street.led.pumpFwhmNm} nm) + phosphor band peaking at ${street.led.phosphorPeakNm} nm (σ = ${street.led.phosphorSigmaBelowNm} nm on the short-wave side, ${street.led.phosphorSigmaAboveNm} nm on the long-wave side); pump peak ${num(street.led.pumpToPhosphorRatio, 2).en} times the phosphor peak; ≈ 4000 K`
    ),
    L(
      'fosfor dönüşümlü LED’in iki loblu modeli (krş. [@ohno2005]); genişlikler ve oran varsayım; renk sıcaklığı McCamy formülüyle [@mccamy1992]',
      'two-lobe model of a phosphor-converted LED (cf. [@ohno2005]); widths and ratio assumed; colour temperature by McCamy’s formula [@mccamy1992]'
    ),
  ],
  [
    L('Geri saçılan LED ışığı', 'Back-scattered LED light'),
    L(
      `her yüzeye, sokak aydınlık düzeyinin %${percent(SCENARIO.ambientLedFraction).tr} kadarı; yükseldikçe (ölçek yüksekliği ${SCENARIO.ambientLedScaleHeightM} m) bu değerin %${percent(SCENARIO.ambientLedAloft).tr} kadarına iner`,
      `on every surface, ${percent(SCENARIO.ambientLedFraction).en} % of the street illuminance; falling with height (scale height ${SCENARIO.ambientLedScaleHeightM} m) to ${percent(SCENARIO.ambientLedAloft).en} % of that value`
    ),
    L('yüzeyler arası yansımanın yerine geçen yaygın bir terim; varsayım', 'a diffuse stand-in for inter-reflection; assumption'),
  ],
  [
    L('Aydınlık pencereler', 'Lit windows'),
    L(
      `Planck, ${interior.colourTemperatureK} K; ${interior.windowLuminanceCdM2} cd m⁻² (odadan odaya × ${num(interior.levelRange[0], 2).tr}–${num(interior.levelRange[1], 2).tr}); %${percent(interior.litFraction).tr} kadarı aydınlık`,
      `Planck, ${interior.colourTemperatureK} K; ${interior.windowLuminanceCdM2} cd m⁻² (× ${num(interior.levelRange[0], 2).en}–${num(interior.levelRange[1], 2).en} from room to room); ${percent(interior.litFraction).en} % lit`
    ),
    L(
      'CIE standart aydınlatıcısı A [@cie2018]; parıltı ve oran varsayım',
      'CIE standard illuminant A [@cie2018]; luminance and fraction assumed'
    ),
  ],
  [
    L('Trafik ışıkları', 'Traffic signals'),
    L(
      `${signals.redNm}, ${signals.amberNm} ve ${signals.greenNm} nm’de çizgiler, gözlenen genişlik σ = ${signals.lineSigmaNm} nm; yanan merceğin parıltısı ${signals.luminanceCdM2} cd m⁻²; bütün sinyaller ${SIGNAL_ASPECT.tr} yanar, sönük mercekler yalnızca renkli camlarının yansıttığı ışığı gösterir`,
      `lines at ${signals.redNm}, ${signals.amberNm} and ${signals.greenNm} nm, observed width σ = ${signals.lineSigmaNm} nm; luminance of a lit lens ${signals.luminanceCdM2} cd m⁻²; every signal shows ${SIGNAL_ASPECT.en}, and an unlit lens shows only the light its tinted glass reflects`
    ),
    L(
      'LED sinyal modüllerinin baskın dalga boyları; genişlik, parıltı ve camların yansıtması varsayım',
      'dominant wavelengths of LED signal modules; width, luminance and reflectance of the glass assumed'
    ),
  ],
  [
    L('Ortam sıcaklığı', 'Ambient temperature'),
    withUnit(num(environment.temperatureK, 2), 'K'),
    L('standart atmosfer, deniz düzeyi [@iso2533]', 'standard atmosphere at sea level [@iso2533]'),
  ],
  [
    L('Yüzeylerin yayınırlığı', 'Emissivity of surfaces'),
    num(environment.surfaceEmissivity, 2),
    L('asfalt, beton, tuğla, cam: 0,85–0,96 [@bergman2011]', 'asphalt, concrete, brick, glass: 0.85–0.96 [@bergman2011]'),
  ],
  [
    L('Açık gece göğünün yayınırlığı', 'Emissivity of the clear night sky'),
    num(environment.skyEmissivity, 2),
    L('288 K’de Swinbank bağıntısı [@swinbank1963]', 'Swinbank’s relation at 288 K [@swinbank1963]'),
  ],
  [
    L('Gece göğünün ışıltısı', 'Glow of the night sky'),
    L(
      `LED tayfı, maviye ağırlıklı; başucunda başvuru parıltısının %${percent(sky.glowZenith, 2).tr} kadarı, ufukta %${percent(sky.glowZenith + sky.glowHorizon, 1).tr} kadarı`,
      `LED spectrum, weighted towards the blue; ${percent(sky.glowZenith, 2).en} % of the reference luminance at the zenith, ${percent(sky.glowZenith + sky.glowHorizon, 1).en} % at the horizon`
    ),
    L('aydınlatılmış bir kentin göğü; varsayım', 'the sky over a lit city; assumption'),
  ],
  [
    L('Caddenin ötesindeki zemin', 'Ground beyond the avenue'),
    L(
      `yaygın yansıtan düzlem, albedo ≈ ${num(ground.albedo[1], 2).tr}; sokak ışığının %${percent(ground.ledFill).tr} kadarı, ${ground.ledFillRangeM} m’de sönerek`,
      `diffusely reflecting plane, albedo ≈ ${num(ground.albedo[1], 2).en}; ${percent(ground.ledFill).en} % of the street light, fading over ${ground.ledFillRangeM} m`
    ),
    L('varsayım', 'assumption'),
  ],
  [
    L('Yıldızlar', 'Stars'),
    L(
      `${stars.count} kara cisim; kadir ≤ ${num(stars.limitingMagnitude, 1).tr}; akı × ${stars.visibilityGain}`,
      `${stars.count} black bodies; magnitude ≤ ${num(stars.limitingMagnitude, 1).en}; flux × ${stars.visibilityGain}`
    ),
    L('istatistiksel olarak üretilmiş gökyüzü', 'statistically generated sky'),
  ],
  [
    L('Göz yüksekliği; görüş alanı', 'Eye height; field of view'),
    L(
      `${num(camera.eyeHeight, 2).tr} m; ${camera.fieldOfViewDeg}° (×1 mercek, düşey)`,
      `${num(camera.eyeHeight, 2).en} m; ${camera.fieldOfViewDeg}° (×1 lens, vertical)`
    ),
    L('varsayım', 'assumption'),
  ],
  [
    L('Gösterim ölçeği', 'Playback scale'),
    L(`gösterilen saniye başına ${SCENARIO.visualLightSpeed} m`, `${SCENARIO.visualLightSpeed} m per displayed second`),
    L(
      `${sig(slowMotionFactor(SPEED_OF_LIGHT), 2).tr} kat yavaşlatma`,
      `slow motion by ${sig(slowMotionFactor(SPEED_OF_LIGHT), 2).en}`
    ),
  ],
];

export const METHOD: readonly SourceSection[] = [
  // ───────────────────────────────────────────────────────────────── 5
  {
    id: 'method',
    number: '5',
    title: L('Yöntem', 'Method'),
    summary: L(
      'Görüntünün nasıl hesaplandığı: geometri, piksel başına radyometri, tayf atlası, kamera ve modellenen sahne.',
      'How the image is computed: geometry, per-pixel radiometry, the spectral atlas, the camera, and the modelled scene.'
    ),
    blocks: [
      {
        type: 'paragraph',
        text: L(
          r`Görüntüleyici bütün sahneyi durgun çerçevesinde tutar ve itmeyi olabilecek en son anda, grafik işlemcide uygular. 3. bölümdeki görüntü temelli okumayı izler: hareketli gözlemcinin görüntüsü, durgun görüntünün yeniden eşlenmiş hâlidir. Bu, Weiskopf ve arkadaşlarının birinci şahıs görselleştirmelerinin ve _Real Time Relativity_’nin yaklaşımıdır [@weiskopf2000; @savage2007]; hareketli cisimler içeren sahnelerde gereken, geçmiş ışık konisi boyunca salım olaylarını arama yöntemi [@hsiungdunn1989; @sherin2016] burada gerekmez. Çalışmanın ayırt edici özelliği, rengin üç RGB kanalını kaydırarak değil, kaymış tayfları standart gözlemcinin renk eşleme fonksiyonlarıyla tümleyerek elde edilmesidir. İşlem hattının aşamaları Şekil 6’da gösterilmiştir.`,
          r`The renderer keeps the whole scene in its rest frame and applies the boost at the last possible moment, on the graphics processor. It follows the image-based reading of Section 3: the moving observer’s picture is the rest picture re-mapped. This is the approach of the first-person visualisations of Weiskopf and co-workers and of _Real Time Relativity_ [@weiskopf2000; @savage2007]; the search for emission events along the past light cone, which scenes with moving objects require [@hsiungdunn1989; @sherin2016], is not needed here. The distinguishing feature of this work is that colour is obtained not by shifting three RGB channels but by integrating shifted spectra with the colour-matching functions of the standard observer. Figure 6 shows the stages of the pipeline.`
        ),
      },
      {
        type: 'figure',
        figure: 'pipeline',
        caption: L(
          r`Görüntüleme işlem hattı. Kameradan önceki her şey fiziktir; kamera aşaması ise gösterime ilişkin bir tercihtir.`,
          r`The rendering pipeline. Everything upstream of the camera is physics; the camera stage is a choice about the display.`
        ),
      },
      { type: 'heading', text: L('Köşe aşaması', 'Vertex stage') },
      {
        type: 'paragraph',
        text: L(
          r`Gözlemciden durgun çerçevedeki yer değiştirmesi $\mathbf r$, uzaklığı $r$ ve hareket yönüyle açısı $\theta$ olan bir köşe noktası için ($\perp$ ve $\parallel$ hareket yönüne dik ve paralel bileşenleri gösterir) köşe programı`,
          r`For a vertex at rest-frame displacement $\mathbf r$ from the observer, at distance $r$ and angle $\theta$ from the direction of motion ($\perp$ and $\parallel$ denote the components perpendicular and parallel to the direction of motion), the vertex program forms`
        ),
      },
      {
        type: 'equation',
        number: '5.1',
        tex: r`a = (1+\beta)(1+\cos\theta),\qquad b = (1-\beta)(1-\cos\theta),\qquad D = \tfrac{1}{2}\,\gamma\,(a+b)`,
      },
      {
        type: 'paragraph',
        text: L(r`niceliklerini oluşturur ve köşeyi`, r`and moves the vertex to`),
      },
      {
        type: 'equation',
        number: '5.2',
        tex: r`\mathbf r'_{\perp} = \frac{\mathbf r_{\perp}}{D},\qquad r'_{\parallel} = r\,\frac{a-b}{a+b}`,
      },
      {
        type: 'paragraph',
        text: L(
          r`konumuna taşır. Bu, (3.1) denkleminin uzaklığı koruyan ($|\mathbf r'| = r$) bir yazımıdır; böylece derinlik arabelleği her ışın boyunca örtmeyi yine doğru belirler. $a$ ve $b$ pozitif çarpanların çarpımıdır, $D$ ise bunların toplamıdır; $a - b$ farkı yalnızca $a + b$’ye oranlanarak girer, bu yüzden yuvarlama hatası $r$ yanında küçük kalır. Bu önemlidir: ders kitabındaki $(\cos\theta+\beta)/(1+\beta\cos\theta)$ biçimi, grafik işlemcinin tek duyarlıklı aritmetiğinde, $\beta = 0{,}99999$’da geriye bakan yön yakınında anlamlı basamaklarını yitirir; orada $1 + \beta\cos\theta$ birbirine çok yakın iki sayının farkıdır. $1+\beta$, $1-\beta$ ve $\gamma$ işlemcide çift duyarlıkla hesaplanıp aktarılır; $1 \pm \cos\theta$ ise, çıkarmanın anlamlı basamak kaybına yol açacağı tarafta çıkarma yapılmadan $\mathbf r$’nin bileşenlerinden kurulur.`,
          r`which is Eq. (3.1) in a form that keeps the distance, $|\mathbf r'| = r$, so that the depth buffer still decides occlusion along every ray. Both $a$ and $b$ are products of positive factors and $D$ is their sum; the difference $a - b$ enters only relative to $a + b$, so that its rounding error stays small compared with $r$. This matters: the textbook form $(\cos\theta+\beta)/(1+\beta\cos\theta)$, evaluated in the single precision of a graphics processor, loses its significant digits near the backward direction at $\beta = 0.99999$, where $1 + \beta\cos\theta$ is the difference of two nearly equal numbers. The quantities $1+\beta$, $1-\beta$ and $\gamma$ are computed in double precision on the processor and passed in; $1 \pm \cos\theta$ is formed from the components of $\mathbf r$ without a subtraction on the side where it would cancel.`
        ),
      },
      {
        type: 'paragraph',
        text: L(
          r`Işık sapıncı doğruları eğrilere götürür, oysa grafik işlemci dönüştürülmüş köşeler arasına düz kenarlar çizer. Bir büyük çemberin görüntüsünün jeodezik eğriliği en çok $\gamma\beta D\sin\theta'$ değerindedir; dolayısıyla cadde çerçevesinde açısal uzunluğu $\delta$ olan bir kenar, gerçek görüntüsünden en çok $\gamma\beta\sin\theta'\,\delta^{2}/(8D)$ kadar ayrılır. Geometri bu nedenle, hiçbir kenar gözlemcinin yoluna olan uzaklığının 0,19 katını aşmayana dek alt bölümlenir; kural yalnızca kenarın kendisine bağlı olduğundan komşu üçgenler arasında hiçbir zaman çatlak açılamaz. Gözlemcinin önündeki bloklar uzaklıkla birlikte daha kaba sürümleriyle değiştirilir, çünkü ışık sapıncı önde olanı küçültür; yandaki ve arkadaki bloklar ise her zaman tam kuralı korur, çünkü ışık sapıncı onları öne, Doppler halkasına çeker ve büker. Ortaya çıkan hata, modellenen hacim içinde görülebilecek kadar parlak olan her yerde ölçüldüğünde en çok 6 mrad’dır ($0{,}34^\circ$). ${VIEW_HEIGHT_PX} piksel yüksekliğindeki bir görüntüde bu açı standart mercekle yaklaşık ${pixelsOf(EDGE_ERROR_RAD, 1)}, ×3 mercekle ${pixelsOf(EDGE_ERROR_RAD, 3)}, ×10 mercekle ${pixelsOf(EDGE_ERROR_RAD, 10)} piksele karşılık gelir. Ancak hata en büyük değerine $\beta = 0{,}97$ dolayında ulaşır ve aralığın üst ucuna, ×10 merceğin önerildiği yere doğru küçülür: orada ölçülen 1,2 mrad, ×10 mercekle yaklaşık ${pixelsOf(1.2e-3, 10)} pikseldir.`,
          r`Aberration maps straight lines to curves, but the graphics processor draws straight edges between transformed vertices. The image of a great circle has geodesic curvature at most $\gamma\beta D\sin\theta'$, so an edge of angular length $\delta$ in the street frame departs from its true image by at most $\gamma\beta\sin\theta'\,\delta^{2}/(8D)$. The geometry is therefore subdivided until no edge exceeds 0.19 times its distance from the observer’s path, a rule that depends on the edge alone and so can never open a crack between neighbouring triangles. Blocks ahead of the observer are replaced by coarser versions with distance, since aberration shrinks what lies ahead; blocks beside and behind always keep the full rule, because aberration pulls them forward into the Doppler ring and bends them. The resulting error, measured throughout the modelled volume wherever anything is bright enough to be seen, is at most 6 mrad ($0.34^\circ$). On a view ${VIEW_HEIGHT_PX} pixels high that angle is about ${pixelsOf(EDGE_ERROR_RAD, 1)} pixels with the standard lens, ${pixelsOf(EDGE_ERROR_RAD, 3)} with the ×3 lens and ${pixelsOf(EDGE_ERROR_RAD, 10)} with the ×10 lens. The error is largest near $\beta = 0.97$, however, and shrinks towards the top of the range, where the ×10 lens is recommended: the 1.2 mrad measured there is about ${pixelsOf(1.2e-3, 10)} pixels with the ×10 lens.`
        ),
      },
      { type: 'heading', text: L('Piksel aşaması', 'Pixel stage') },
      {
        type: 'paragraph',
        text: L(
          r`Doppler çarpanı her piksel için, pikselin kendi bakış yönünden, (3.3) denkleminin ikinci biçimiyle hesaplanır; dolayısıyla üçgenin büyüklüğü ne olursa olsun kesindir. Aydınlatmanın bütün girdileri — yüzey normali, albedo, her tür kaynaktan alınan aydınlık düzeyi — köşelerin taşıdığı durgun çerçeve nicelikleridir. Gökyüzü, Ay ve modelin ötesindeki zemin hiç geometri içermez: her piksel için bakış yönü (3.1) denkleminin tersiyle cadde çerçevesine geri izlenir ve cadde çerçevesindeki dünya o yönde değerlendirilir. Yıldızlar nokta olarak çizilir; konumları köşeler gibi ışık sapıncına uğratılır, akıları ise 4. bölümdeki noktasal kaynak yasasını izler. Işınım parlaklıkları ayrı bir kayan noktalı arabellekte piksel başına toplanır ve kamera aşamasından önce göğe eklenir; böylece üst üste binen yıldızlar ışığın toplandığı gibi toplanır. Grafik işlemci böyle bir arabelleğe çizemiyorsa her yıldız ekrandaki parlaklığa kendi katkısını ekler.`,
          r`The Doppler factor is evaluated per pixel from the pixel’s own viewing direction, by the second form of Eq. (3.3), and so is exact whatever the size of the triangle. All inputs to the lighting — surface normal, albedo, the illuminance received from each kind of source — are rest-frame quantities carried by the vertices. The sky, the Moon and the ground beyond the model involve no geometry at all: for each pixel the viewing direction is traced back into the street frame by the inverse of Eq. (3.1), and the street-frame world is evaluated in that direction. Stars are drawn as points; their positions are aberrated like vertices and their flux follows the point-source law of Section 4. Their radiance is summed per pixel in a separate floating-point buffer and added to the sky before the camera stage, so that overlapping stars add as light does. Where the graphics processor cannot render into such a buffer, each star adds its own increment to the displayed brightness instead.`
        ),
      },
      { type: 'heading', text: L('Tayf atlası', 'The spectral atlas') },
      {
        type: 'paragraph',
        text: L(
          r`Durgun çerçevedeki tayfsal ışınım parlaklığı $I_\lambda(\lambda)$ olan bir ışık kaynağını kamera, $D$ Doppler çarpanında şu üç uyaran değeriyle kaydeder:`,
          r`A light source with rest-frame spectral radiance $I_\lambda(\lambda)$ is recorded by the camera, at Doppler factor $D$, with the tristimulus values`
        ),
      },
      {
        type: 'equation',
        number: '5.3',
        tex: r`\mathbf X(D) = \int \bar{\mathbf x}(\lambda')\; D^{5}\, I_\lambda(D\lambda')\; d\lambda'`,
      },
      {
        type: 'paragraph',
        text: L(
          r`Burada $\bar{\mathbf x} = (\bar x, \bar y, \bar z)$, CIE 1931 gözlemcisinin renk eşleme fonksiyonlarıdır [@cie2018]. Tümlev yalnızca $D$’ye bağlıdır. Bu nedenle işlemcide bir kez, 1/512 ile 512 arasındaki 512 Doppler çarpanı için hesaplanır ve piksel programının okuduğu küçük bir çizelgede saklanır: gölgelendiricilerde uydurulmuş renk geçişleri yoktur. Çizelgede her ışık türü için bir satır bulunur — yansıyan ay ışığı ve yansıyan LED ışığı (her biri üç yansıtma bileşeni için), sıcaklığa göre dizinlenmiş kara cisim ışıması ve gözlenen dalga boyuna göre dizinlenmiş çizgi ışıması. Her satır birim parıltılı bir renk ile parıltının logaritmasını tutar; böylece parlaklığın pek çok mertebesi doğru biçimde aradeğerlenir.`,
          r`where $\bar{\mathbf x} = (\bar x, \bar y, \bar z)$ are the colour-matching functions of the CIE 1931 observer [@cie2018]. The integral depends on $D$ alone. It is therefore evaluated once, on the processor, for 512 Doppler factors between 1/512 and 512 and stored in a small table that the pixel program reads: the shaders contain no fitted colour ramps. The table holds one row per kind of light — reflected moonlight and reflected LED light (each for three reflectance components), black-body emission indexed by temperature, and line emission indexed by observed wavelength. Each row stores a colour of unit luminance together with the logarithm of the luminance, so that many decades of brightness interpolate accurately.`
        ),
      },
      {
        type: 'paragraph',
        text: L(
          r`Yüzey renkleri RGB üçlüleri olarak tanımlanmıştır; oysa Doppler kayması yansıtmayı, üçlünün hiçbir şey söylemediği $D\lambda'$ dalga boylarında örnekler. Bu yüzden her albedo, her dalga boyunda toplamı bir olan üç düzgün ve negatif olmayan taban tayfına $\rho(\lambda) = \sum_k c_k\,\rho_k(\lambda)$ biçiminde açılır; yaklaşım tayfsal üst örnekleme (spectral upsampling) çalışmalarının izindedir [@smits1999; @jakobhanika2019; @mallettyuksel2019]. Böylece gri bir yüzey tayfsal olarak düzdür, hiçbir geçerli renk gelen ışığın tamamından fazlasını yansıtmaz ve görünür bandın dışında her tayf en yakın platosunu sürdürür: kızılötesi yansıtma kırmızı bileşene, morötesi yansıtma mavi bileşene eşittir. Bu sürdürme bir varsayımdır; yeni bilgi eklemeyen en yalın varsayımdır. Katsayılar, $D = 1$’de ve kameranın dengelendiği aydınlatıcı altında her yüzey tam tanımlandığı gibi görünecek biçimde ayarlanmıştır.`,
          r`Surface colours are authored as RGB triples, but a Doppler shift samples the reflectance at wavelengths $D\lambda'$ about which a triple says nothing. Each albedo is therefore expanded as $\rho(\lambda) = \sum_k c_k\,\rho_k(\lambda)$ in three smooth, non-negative basis spectra that sum to one at every wavelength, in the spirit of spectral upsampling [@smits1999; @jakobhanika2019; @mallettyuksel2019]. A grey surface is then spectrally flat, no admissible colour reflects more than all of the incident light, and outside the visible band each spectrum continues its nearest plateau: the infrared reflectance equals the red component, the ultraviolet reflectance the blue one. That continuation is an assumption, the simplest one that adds no information. The coefficients are calibrated so that at $D = 1$, under the illuminant to which the camera is balanced, every surface renders exactly as authored.`
        ),
      },
      { type: 'heading', text: L('Kamera', 'The camera') },
      {
        type: 'paragraph',
        text: L(
          r`Işınım parlaklığını piksele çeviren dört adım vardır ve hiçbiri fizik değildir. Beyaz dengesi ${camera.whiteBalanceK} K’de sabittir (ekran beyazına Bradford uyarlaması); böylece kent durgun hâlde nötr görünür. Sonradan hiç yeniden ayarlanmaz, çünkü dengesini yenileyen bir kamera, göstermesi gereken kaymayı kendisi yok ederdi. Pozlama otomatiktir: durgun hâl ile aralığın üst ucu arasında görüş alanındaki parıltı on bir mertebeden fazla değişir; bunu hiçbir ekran gösteremez. Işıkölçer görüntünün kendisini okumaz. Genel bir cadde sahnesini — sokak ışığı ve ay ışığı alan tipik yüzeyleri ve, açıksa, ortamın ısıl ışımasını — aynı atlasla, görüş alanını kaplayan seyrek bir yön ızgarasında değerlendirir ve aydınlık yönlerde parıltının logaritmik ortalamasını alır; fotoğrafik ton yeniden üretimi işleci de böyle ölçer [@reinhard2002]. Durgun hâldekinden çok daha karanlık hâle gelen yönler ortalamaya daha az, en karanlıkları hiç katılmaz; böylece arkada kararan bir görüş pozlamayı yükseltmez ve kamera ancak görüşün küçük bir bölümü aydınlık kaldığında sınırına doğru açılır. Çok parlak yönler de sınırlanır, böylece tek bir parlak nokta ışıkölçeri kör edemez. Düzeltme durgun hâle göre ${signed(EXPOSURE_MIN_EV)} ile ${signed(EXPOSURE_MAX_EV)} EV arasında kalır ve ölçer panelinde pozlama değeri (EV) olarak bildirilir; yani uyarlama hiçbir zaman gizlenmez. _Ölçülen_ görünümde hiçbir şey kaymadığından pozlama durgun hâldeki değerinde kalır. Ortalamanın çok üzerindeki parıltıyı ve sınırın ötesindeki parlaklaşmayı üçüncü adım karşılar: beyaz düzeyinin üzerindeki parıltı, renksellik korunarak logaritmik olarak sıkıştırılır ($y \to 1 + ${texNum(HIGHLIGHT_SLOPE, 2).tr} \ln y$); böylece çok parlak ısıl ışık beyaza kırpılmak yerine sıcaklığının rengini korur. Son olarak kanal başına filmsel bir ton eğrisi uygulanır ve sonuç bir sRGB ekran için kodlanır [@iec61966]. Ekranın renk gamının dışında kalan renkler, sıkıştırmadan önce, parıltılarını koruyan en küçük miktarda doygunluktan arındırılır.`,
          r`Four steps turn radiance into pixels, and none of them is physics. The white balance is fixed at ${camera.whiteBalanceK} K (a Bradford adaptation to the display white), so that the city is neutral at rest. It is never adapted afterwards, since a camera that re-balanced would cancel the very shift it is meant to show. The exposure is automatic: between rest and the top of the range the luminance in view spans more than eleven decades, which no display can show. The light meter does not read the image. It evaluates a generic street scene — typical street-lit and moonlit surfaces and, when it is switched on, the thermal emission of the surroundings — with the same atlas on a coarse grid of directions across the field of view, and takes the logarithmic average of the luminance over the lit directions, in the manner of the photographic tone-reproduction operator [@reinhard2002]. Directions that have grown much darker than at rest count for less in the average, and the darkest not at all, so that a view that has gone dark behind does not pull the exposure up; only when little of the view is still lit does the camera open up towards its limit. Very bright directions are capped as well, so that a single bright spot cannot blind the meter. The correction stays between ${signed(EXPOSURE_MIN_EV)} and ${signed(EXPOSURE_MAX_EV)} EV relative to rest and is reported on the instrument panel in exposure values (EV), so the adaptation is never hidden. In the _measured_ view, where nothing is shifted, the exposure keeps its value at rest. Luminance far above the average, and any brightening beyond the limit, is taken up by the third step: luminance above the white level is compressed logarithmically at constant chromaticity ($y \to 1 + ${texNum(HIGHLIGHT_SLOPE, 2).en} \ln y$), so that very bright thermal light keeps the colour of its temperature instead of clipping to white. Finally a filmic tone curve is applied per channel and the result is encoded for an sRGB display [@iec61966]. Colours outside the display gamut are desaturated before the compression, by the smallest amount that preserves their luminance.`
        ),
      },
      { type: 'heading', text: L('Modellenen sahne', 'The modelled scene') },
      {
        type: 'paragraph',
        text: L(
          r`Dönüşüm kesindir; uygulandığı sahne ise bir modeldir. Modelin sabitleri kaynak kodda tek bir dosyada toplanmıştır; ışık alanını biçimlendirenler dayanaklarıyla birlikte Çizelge 4’te verilmiştir (kameranın beyaz dengesi yukarıda anlatılmıştır). Uzunluklar durgun uzunluklardır.`,
          r`The transformation is exact; the scene it is applied to is a model. Its constants are collected in one file of the source code; those that shape the light field are listed with their basis in Table 4 (the white balance of the camera is described above). Lengths are rest lengths.`
        ),
      },
      {
        type: 'paragraph',
        text: L(
          r`Cadde, Kenney’nin _City Kit_ ve aynı yazarın diğer model takımlarının (CC0 lisanslı) üç boyutlu modellerinden — binalar, yol ve kaldırım karoları, sokak armatürleri, trafik ışıkları, ağaçlar ve taşıtlar — kurulmuştur; modeller oldukları gibi kullanılır. Görüntüleyici yalnızca temsil biçimlerini değiştirir: her model tek bir ağa indirgenir, palet dokusundaki renkleri köşelere yazılır ve üçgenleri yukarıda anlatıldığı gibi alt bölümlenir. Işık kaynakları da modellerin kendi yüzleridir: binaların pencere camları (paletteki cam rengiyle bulunur; %${LIGHTING.litPercent} kadarı aydınlıktır) ve her armatür başlığının altındaki ışık veren yüz. Sonradan eklenen tek geometri trafik ışıklarının üçer merceğidir, çünkü modelde mercek yoktur. Gökyüzü, Ay ve caddenin ötesindeki zemin düzlemi ise model değil, bakış yönünün fonksiyonlarıdır.`,
          r`The avenue is assembled from the three-dimensional models of Kenney’s _City Kit_ and further asset packs by the same author (CC0) — buildings, road and pavement tiles, street luminaires, traffic signals, trees and vehicles — and the models are used as they are. The renderer changes only their representation: each model is flattened into one mesh, the colours of its palette texture are written to the vertices, and its triangles are subdivided as described above. The light sources, too, are the models’ own faces: the window panes of the buildings (found by the glass colour of the palette; ${LIGHTING.litPercent} % of them are lit) and the light-emitting face on the underside of each luminaire’s head. The only geometry added afterwards is the three lenses of each traffic signal, because the model has none. The sky, the Moon and the ground plane beyond the avenue are not models but functions of the viewing direction.`
        ),
      },
      {
        type: 'table',
        caption: L(
          r`Sahne modelinin varsayımları. Başvuru parıltısı, ${street.illuminanceLux} lx altındaki ideal beyaz yaygın yansıtıcı bir yüzeyin parıltısıdır (${num(REFERENCE_LUMINANCE_CD_M2, 1).tr} cd m⁻²); görüntüleyici ışınım parlaklığını bu birimle ölçer.`,
          r`Assumptions of the scene model. The reference luminance is that of a perfect white diffuser under ${street.illuminanceLux} lx (${num(REFERENCE_LUMINANCE_CD_M2, 1).en} cd m⁻²); the renderer measures radiance in this unit.`
        ),
        head: [L('Nicelik', 'Quantity'), L('Değer', 'Value'), L('Dayanak', 'Basis')],
        align: ['left', 'left', 'left'],
        rows: ASSUMPTION_ROWS,
      },
      {
        type: 'paragraph',
        text: L(
          r`Sokak aydınlatması köşelere işlenmiştir: her köşe için armatürlerden (iki yanda ${LIGHTING.spacingM} m aralıklı, yol yüzeyinden ${LIGHTING.heightM.tr} m yüksekte) gelen doğrudan aydınlık düzeyi, geri saçılan ışığı temsil eden küçük bir yaygın terimle (Çizelge 4) toplanır. Her armatürün ışık kaynağı, lamba modelinin aşağıya bakan ışık yüzünün kendisidir ve düzgün yayan (Lambert) bir yüzey olarak alınmıştır: parıltısı her doğrultuda aynıdır, ışık şiddeti düşeyle yapılan açının kosinüsüyle azalır ve yatayın üstüne hiç ışık çıkmaz. Geriye kalan tek büyüklük olan parıltı, taşıt yolunun ortalama yatay aydınlık düzeyi C2 sınıfının ${street.illuminanceLux} lx’üne eşit olacak biçimde belirlenmiştir: yüzün modeldeki alanı ${LIGHTING.faceAreaM2.tr} m² olduğundan yaklaşık ${LIGHTING.faceLuminanceCdM2.tr} cd m⁻² (düşey doğrultuda yaklaşık ${LIGHTING.intensityCd.tr} cd). Modellenen aydınlatmanın genel düzgünlüğü (en küçük / ortalama) bu durumda ${LIGHTING.uniformity.tr} olur; sınıfın istediği en küçük değer 0,4’tür [@en13201]. Gölge düşürülmez; ışığın yüzeyler arasında yeniden yansıması yalnızca bu yaygın terimle temsil edilir. Bunlar relativistik dönüşümün değil, aydınlatmanın yalınlaştırmalarıdır: durgun çerçevede hangi ışık alanı verilirse verilsin, ona uygulanan dönüşüm kesin olandır.`,
          r`The street lighting is baked into the vertices: for each vertex the direct illuminance from the luminaires (${LIGHTING.spacingM} m apart on both sides, ${LIGHTING.heightM.en} m above the road surface) is added to a small diffuse term that stands for back-scattered light (Table 4). The light source of each luminaire is the downward-looking light face of the lamp model itself, taken to be a uniform diffuse (Lambertian) emitter: its luminance is the same in every direction, its luminous intensity falls off as the cosine of the angle from the vertical, and no light leaves it above the horizontal. The one remaining quantity, the luminance, is set so that the average horizontal illuminance of the carriageway equals the ${street.illuminanceLux} lx of class C2: with the face’s area of ${LIGHTING.faceAreaM2.en} m² in the model it is about ${LIGHTING.faceLuminanceCdM2.en} cd m⁻² (about ${LIGHTING.intensityCd.en} cd straight down). The overall uniformity (minimum / average) of the modelled lighting is then ${LIGHTING.uniformity.en}; the class requires at least 0.4 [@en13201]. No shadows are cast, and inter-reflection is represented only by that diffuse term. These are simplifications of the lighting, not of the relativistic transformation: whatever light field is supplied in the rest frame, the transformation applied to it is the exact one.`
        ),
      },
      {
        type: 'paragraph',
        text: L(
          r`Gösterim, Gamow’un öykülerindeki ve _A Slower Speed of Light_ oyunundaki gibi yavaşlatılmıştır [@gamow1939; @kortemeyer2013]: sahne ölçeklidir, ancak ışık onu gösterilen her saniyede ${SCENARIO.visualLightSpeed} m hızla geçer. Boyutsuz niceliklerin hiçbiri — $\beta$, $\gamma$, $D$, bütün açılar ve bütün renkler — bundan etkilenmez.`,
          r`Playback is slowed in the manner of Gamow’s stories and of the game _A Slower Speed of Light_ [@gamow1939; @kortemeyer2013]: the scene is to scale, but light crosses it at ${SCENARIO.visualLightSpeed} m per displayed second. No dimensionless quantity — $\beta$, $\gamma$, $D$, any angle or any colour — is affected.`
        ),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 6
  {
    id: 'guide',
    number: '6',
    title: L('Gözlem kılavuzu', 'Observation guide'),
    summary: L(
      'Her hızda nelere bakılacağı ve ilgili sayılar.',
      'What to look for at each speed, with the numbers that go with it.'
    ),
    blocks: [
      {
        type: 'paragraph',
        text: L(
          r`Aşağıdaki her madde simülasyonu bir duruma getirir ve kuramın o durum için ne öngördüğünü söyler. Çevrenize bakmak için sürükleyin, en yüksek hızlarda merceği kullanın, _görülen_ ve _ölçülen_ görünümleri karşılaştırın.`,
          r`Each entry below sets the simulation to a state and says what the theory predicts for it. Drag to look around, use the lens at the highest speeds, and compare the _seen_ and _measured_ views.`
        ),
      },
      { type: 'heading', text: L('Durgun', 'At rest') },
      {
        type: 'paragraph',
        text: L(
          r`Durgun hâlde görünen dört tür ışık altında bir gece caddesi: beyaz LED sokak aydınlatması (bant sınırlı), dolunay (geniş bantlı, zayıf), aydınlık pencereler (ısıl, sıcak tonlu) ve LED trafik ışıkları (neredeyse tek renkli). Beşincisi, ortamın ve Ay’ın ısıl ışıması, durgun hâlde görünmez. Her biri Doppler kaymasına farklı tepki verir; yolculuğun geri kalanı bu farkı gösterir.`,
          r`A night avenue under the four kinds of light that are visible at rest: white LED street lighting (band-limited), a full Moon (broadband, weak), lit windows (thermal, warm) and LED signals (nearly monochromatic). The fifth, the thermal emission of the surroundings and of the Moon, is invisible at rest. Each responds differently to a Doppler shift; the rest of the journey shows that difference.`
        ),
      },
      { type: 'try', label: L('β = 0', 'β = 0'), scenario: { beta: 0 } },
      { type: 'heading', text: L('0,2 c: önce renk değişir', '0.2 c: colour changes first') },
      {
        type: 'paragraph',
        text: L(
          r`$D_0 = 1{,}22$. Geometri neredeyse değişmemiştir — yan düzlem $78^\circ$’de görülür — ama bant sınırlı ışık değişmiştir: öndeki sokak aydınlatması hareket yönüne doğru önce yeşile, sonra camgöbeğine döner; karşıdaki kırmızı trafik ışığı göze 511 nm olarak ulaşır ve yeşil görünür; arkanızda ise aynı aydınlatma önce kehribara, sonra sarı-yeşile döner ve sönükleşir.`,
          r`$D_0 = 1.22$. The geometry has barely changed — the transverse plane is seen at $78^\circ$ — but band-limited light has: towards the direction of motion the street lighting turns green and then cyan, a red signal ahead arrives at 511 nm and looks green, and behind you the same lighting turns amber, then yellow-green, and dims.`
        ),
      },
      { type: 'try', label: L('β = 0,2', 'β = 0.2'), scenario: { beta: 0.2 } },
      { type: 'heading', text: L('0,5 c: aydınlatma görünür bandı terk eder', '0.5 c: the lighting leaves the visible band') },
      {
        type: 'paragraph',
        text: L(
          r`$D_0 = 1{,}73$. Tam karşıda LED ışığı morötesine geçmiştir, sokak lambaları karanlıktır; orada kalan, durgun hâldekinden 15 kat parlak ve daha mavi olan ay ışığıdır. LED ışığının Doppler halkası hareket yönünden $23^\circ$ ile $120^\circ$ arasındadır. Yan düzlem $60^\circ$’de görülür.`,
          r`$D_0 = 1.73$. Dead ahead the LED light has moved to the ultraviolet and the street lamps are dark; what remains there is moonlight, 15 times brighter than at rest and bluer. The Doppler ring of the LED light lies between $23^\circ$ and $120^\circ$ from the direction of motion. The transverse plane is seen at $60^\circ$.`
        ),
      },
      { type: 'try', label: L('β = 0,5', 'β = 0.5'), scenario: { beta: 0.5 } },
      { type: 'heading', text: L('γ = 2: saatler ve ilk ışıma', 'γ = 2: the clocks, and the first glow') },
      {
        type: 'paragraph',
        text: L(
          r`Gözlemcinin saati cadde saatlerinin yarı hızıyla işler; 100 m’lik yol 50 m olarak ölçülür. Yan düzlem $30^\circ$’de, nötr koni $54{,}7^\circ$’de görülür. Tam karşıda $D_0 = 3{,}73$’tür: 288 K’lik ortam 1075 K olarak görünür ve donuk kırmızı ışımaya başlar; parıltısı, durgun hâlde sokak ışığı altındaki beyaz bir duvarınkinin yaklaşık iki katıdır. Görüntünün göstermediği büzülmeyi görmek için _ölçülen_ görünüme geçin.`,
          r`The observer’s clock runs at half the rate of the street clocks, and 100 m of road measures 50 m. The transverse plane is seen at $30^\circ$, the neutral cone at $54.7^\circ$. Dead ahead $D_0 = 3.73$: the 288 K surroundings appear at 1075 K and begin to glow dull red, about twice as bright as a street-lit white wall at rest. Switch to _measured_ to see the contraction that the image does not show.`
        ),
      },
      { type: 'try', label: L('γ = 2, görülen', 'γ = 2, seen'), scenario: { beta: Math.sqrt(3) / 2 } },
      { type: 'try', label: L('γ = 2, ölçülen', 'γ = 2, measured'), scenario: { beta: Math.sqrt(3) / 2, view: 'measured' } },
      { type: 'heading', text: L('0,99 c: Doppler halkası', '0.99 c: the Doppler ring') },
      {
        type: 'paragraph',
        text: L(
          r`$\gamma = 7{,}09$; $D_0 = 14{,}1$. Caddenin ön yarıküresinin tamamı $8{,}1^\circ$ içinde görülür; nötr koni $29{,}8^\circ$’dedir ve çevresini $23^\circ$ ile $36^\circ$ arasında LED ışığı sarar: dışı kırmızı, içi mor. Halkanın içinde ortam ısıl olarak ışır, tam karşıda 4065 K’e ulaşır; dışında her şey kırmızıya kayarak kararır. Ay, hareket yönünden yaklaşık ${MOON_AT_099.angleDeg}° uzakta görülür ve artık yansıttığı ışıktan çok kendi ısıl ışımasıyla, yaklaşık ${MOON_AT_099.temperatureK.tr} K’lik bir kara cisim olarak parlar. Yalnızca yansıyan ay ışığının ne göstereceğini görmek için ısıl ışımayı kapatın.`,
          r`$\gamma = 7.09$; $D_0 = 14.1$. The whole forward hemisphere of the street is seen within $8.1^\circ$; the neutral cone is at $29.8^\circ$, ringed by the LED light between $23^\circ$ and $36^\circ$, red on the outside and violet on the inside. Within the ring the surroundings glow thermally, reaching 4065 K dead ahead; outside it everything is redshifted into darkness. The Moon, seen about ${MOON_AT_099.angleDeg}° from the direction of motion, now shines by its own thermal emission rather than by reflected light, as a black body at about ${MOON_AT_099.temperatureK.en} K. Switch the thermal emission off to see what reflected moonlight alone would show.`
        ),
      },
      { type: 'try', label: L('β = 0,99', 'β = 0.99'), scenario: { beta: 0.99 } },
      {
        type: 'try',
        label: L('β = 0,99; ısıl ışıma kapalı', 'β = 0.99, thermal emission off'),
        scenario: { beta: 0.99, thermal: false },
      },
      { type: 'heading', text: L('Aralığın sınırı', 'The limit of the range') },
      {
        type: 'paragraph',
        text: L(
          r`$\gamma = 223{,}6$; $D_0 = 447$. Ön yarıküre, dolunayın görünür büyüklüğündeki bir diske sığar; Doppler halkası $4{,}3^\circ$ ile $6{,}5^\circ$ arasındadır; tam karşıda ortam $1{,}3 \times 10^{5}$ K’lik bir kara cisim olarak görünür. İlgi çekici neredeyse her şey artık birkaç derecenin içindedir: ×10 merceği kullanın. Gözlemcinin saati cadde saatlerinden 224 kat yavaş işler; bu hıza 1 g ivmeyle ulaşmak gemide 5,9 yıl sürerdi. Bu hâlâ kütleli bir gözlemcinin gördüğü görüntüdür; buradan $c$ “hızındaki” bir görünüme götüren bir adım yoktur.`,
          r`$\gamma = 223.6$; $D_0 = 447$. The forward hemisphere fits within a disc the apparent size of the full Moon; the Doppler ring lies between $4.3^\circ$ and $6.5^\circ$; dead ahead the surroundings appear as a black body at $1.3 \times 10^{5}$ K. Almost everything of interest now lies within a few degrees: use the ×10 lens. The observer’s clock runs 224 times slower than the street clocks, and reaching this speed at 1 g would have taken 5.9 years on board. This is still the view of an observer with mass; no further step leads to a view “at” $c$.`
        ),
      },
      { type: 'try', label: L('β = 0,99999; ×10 mercek', 'β = 0.99999, ×10 lens'), scenario: { beta: 0.99999, lens: 10 } },
      {
        type: 'try',
        label: L('β = 0,99999; ×10; ısıl ışıma kapalı', 'β = 0.99999, ×10, thermal emission off'),
        scenario: { beta: 0.99999, lens: 10, thermal: false },
      },
      { type: 'heading', text: L('Yana ve geriye bakmak', 'Looking sideways and back') },
      {
        type: 'paragraph',
        text: L(
          r`$\beta = 0{,}6$’da bakışı çevirin. Yana bakarken önden başlayarak sırayla şunları görürsünüz: maviye kaymış bölge, sokak aydınlatmasının Doppler halkası, ardından sönerek kaybolan kırmızıya kaymış dünya. Geriye bakıldığında neredeyse hiçbir şey yoktur: bu hızda tam arkadan gelen ışık iki kat kırmızıya kaymıştır ve bant sınırlı sokak aydınlatması kızılötesine geçmiştir. Arkadaki karanlık ışığın yokluğu değil, görünür ışığın yokluğudur.`,
          r`Turn the view at $\beta = 0.6$. Looking abeam you see, in order from the front: the blueshifted region, the Doppler ring of the street lighting, and then the redshifted world fading out. Looking back there is almost nothing: at this speed light from directly behind is redshifted by a factor of two and the band-limited street lighting has left for the infrared. The darkness behind is not an absence of light but an absence of visible light.`
        ),
      },
      { type: 'try', label: L('β = 0,6; yana bak', 'β = 0.6, look abeam'), scenario: { beta: 0.6, look: 'left' } },
      { type: 'try', label: L('β = 0,6; geriye bak', 'β = 0.6, look back'), scenario: { beta: 0.6, look: 'behind' } },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 7
  {
    id: 'misconceptions',
    number: '7',
    title: L('Yedi yanılgı', 'Seven misconceptions'),
    summary: L(
      'Işık hızına yakın yolculuğa ilişkin yaygın yanlış imgeler ve literatürün bunların yerine ne söylediği.',
      'Common pictures of travel near the speed of light, and what the literature says instead.'
    ),
    blocks: [
      { type: 'heading', text: L('1. Hızlı cisimler büzülmüş görünür', '1. Fast objects look contracted') },
      {
        type: 'paragraph',
        text: L(
          r`Uzunluk büzülmesi eşzamanlı ölçüme ilişkin bir ifadedir. Görüntüyü ise farklı noktalardan farklı anlarda ayrılmış ışık oluşturur; açısal boyutu küçük cisimlerde bu iki etki görünen bir dönmede birleşir ve bir küre her hızda dairesel dış çizgisini korur [@terrell1959; @penrose1959]. Popüler anlatımlardaki yassılaşmış bisikletli [@gamow1939] görülecek şey değildir [@boas1961].`,
          r`Length contraction is a statement about simultaneous measurement. An image is formed by light that left different points at different times; for objects of small angular size the two effects combine into an apparent rotation, and a sphere keeps a circular outline at any speed [@terrell1959; @penrose1959]. The flattened cyclist of popular accounts [@gamow1939] is not what would be seen [@boas1961].`
        ),
      },
      { type: 'heading', text: L('2. Yıldızlar bir gökkuşağı oluşturur', '2. The stars form a rainbow') },
      {
        type: 'paragraph',
        text: L(
          r`Yıldızlar tek bir renkte ışısaydı oluştururlardı [@sanger1958]. Yıldızlar kara cisme yakındır, kaymış bir kara cisim yine kara cisimdir ve yıldız kuşağı ortaya çıkmaz [@mckinleydoherty1979]. Doppler gökkuşağı, LED aydınlatma gibi bant sınırlı ışık için gerçektir (4. bölüm).`,
          r`They would if stars emitted a single colour [@sanger1958]. Stars are close to black bodies, a shifted black body is a black body, and the starbow does not appear [@mckinleydoherty1979]. A Doppler rainbow is real for band-limited light such as LED lighting (Section 4).`
        ),
      },
      { type: 'heading', text: L(r`3. Parlaklık $D^4$ ile artar`, r`3. Brightness grows as $D^4$`) },
      {
        type: 'paragraph',
        text: L(
          r`$D^4$, bütün dalga boyları üzerinden toplanmış ışınım parlaklığının kazancıdır. Göz ya da kamera ise bir bant görür. Görünür bantta ısıl bir kaynağın kazancı $L_{\mathrm v}(DT)/L_{\mathrm v}(T)$’dir: soğuk kaynaklarda ılımlı maviye kaymada $D^4$’ten büyük, büyük maviye kaymada $D$ ile orantılı, kırmızıya kaymada ise $D^4$’ten çok küçüktür [@kraus2000]. Çözülemeyecek kadar küçük bir kaynakta, küçülen katı açı yüzünden $D$’nin iki kuvveti daha yitirilir [@mckinley1980].`,
          r`$D^4$ is the gain of the radiance integrated over all wavelengths. An eye or a camera sees a band. Within the visible band the gain of a thermal source is $L_{\mathrm v}(DT)/L_{\mathrm v}(T)$: larger than $D^4$ for cool sources at moderate blueshift, proportional to $D$ at large blueshift, and far smaller than $D^4$ under redshift [@kraus2000]. For a source too small to be resolved, two further powers of $D$ are lost to the shrinking solid angle [@mckinley1980].`
        ),
      },
      { type: 'heading', text: L('4. Kütle hız arttıkça artar', '4. Mass increases with speed') },
      {
        type: 'paragraph',
        text: L(
          r`Bir cismin kütlesi değişmezdir. Hız arttıkça artan, enerjisi $E = \gamma m c^2$ ve momentumu $p = \gamma m v$’dir; hıza bağlı bir “relativistik kütle” kavramı bunlara bir şey katmaz ve kullanılmaması yeğdir [@okun1989]. Hiçbir sonlu enerji kütleli bir cismi $\beta = 1$’e ulaştıramaz.`,
          r`The mass of a body is an invariant. What grows with speed is its energy, $E = \gamma m c^2$, and its momentum, $p = \gamma m v$; a velocity-dependent “relativistic mass” adds nothing to these and is best avoided [@okun1989]. No finite energy brings a body with mass to $\beta = 1$.`
        ),
      },
      { type: 'heading', text: L('5. Foton için zaman durur', '5. For a photon, time stands still') },
      {
        type: 'paragraph',
        text: L(
          r`Işıksı bir dünya çizgisi boyunca öz zaman sıfırdır. Bu, aralığın bir özelliğidir ($ds^2 = 0$); bir fotonun yaşadığı bir şeyin betimi değildir: fotona bağlı, içinde saat ya da cetvel okunabilecek bir eylemsiz çerçeve yoktur ve Lorentz dönüşümünün $v = c$’de bir limiti yoktur. Limiti olan şey, kütleli bir gözlemcinin $\beta \to 1$ iken gördüğüdür; bu simülasyon onu gösterir.`,
          r`The proper time along a light-like world line is zero. This is a property of the interval, $ds^2 = 0$, not a description of something a photon experiences: there is no inertial frame attached to a photon in which clocks or rulers could be read, and the Lorentz transformation has no limit at $v = c$. What does have a limit is the view of an observer with mass as $\beta \to 1$, and that is what this simulation shows.`
        ),
      },
      { type: 'heading', text: L('6. Yüksek hızda yıldızlar çizgiler hâlinde akar', '6. At high speed the stars streak past') },
      {
        type: 'paragraph',
        text: L(
          r`Filmlerdeki “hiperuzay” çizgilerinin özel görelilikte bir karşılığı yoktur. Uzak kaynaklar görüş alanı boyunca akıp geçmez; hız arttıkça nokta olarak hareket yönüne doğru yığılır (ışık sapıncı), parlar ya da söner ve renkleri Planck eğrisi boyunca değişir [@scottvandriel1970; @mckinleydoherty1979].`,
          r`The streaks of film “hyperspace” have no counterpart in special relativity. Distant sources do not stream across the field of view; as the speed rises they crowd towards the direction of motion as points (aberration), brighten or fade, and change colour along the Planckian locus [@scottvandriel1970; @mckinleydoherty1979].`
        ),
      },
      {
        type: 'heading',
        text: L('7. Karanlığa — ya da kör edici ışığa — doğru uçulur', '7. One flies into darkness — or into blinding light'),
      },
      {
        type: 'paragraph',
        text: L(
          r`İkisi de olur; farklı yönlerde ve farklı ışık için. Bant sınırlı ışık önde (morötesine) ve arkada (kızılötesine) kaybolur, bir halkada varlığını sürdürür; ısıl ışık önde hız arttıkça parlar, arkada söner. Belirli bir sahnede hangisinin egemen olacağı kaynakların tayfına bağlıdır; sonucun bir RGB görüntüyü renklendirerek elde edilememesinin nedeni budur.`,
          r`Both happen, in different directions and for different light. Band-limited light vanishes ahead (to the ultraviolet) and behind (to the infrared) and survives in a ring; thermal light brightens ahead as the speed rises and dies out behind. Which of the two dominates a given scene depends on the spectra of its sources, which is why the result cannot be obtained by tinting an RGB image.`
        ),
      },
    ],
  },
];
