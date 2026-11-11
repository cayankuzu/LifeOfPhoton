/**
 * Dossier, sections 8–10: experimental evidence, verification, limits.
 *
 * The table of real objects is generated from data/speedScale.ts, the same data
 * the figure draws.
 */

import { SCENARIO } from '@/physics/scenario';
import { SPEED_MARKERS, type SpeedMarker, betaOfExcess, oneMinusBeta } from '../data/speedScale';
import { L, type SourceSection, type Text } from '../types';
import { num, r, sig } from './helpers';

function prefixed(prefix: string, value: Text): Text {
  return typeof value === 'string' ? `${prefix}${value}` : { tr: `${prefix}${value.tr}`, en: `${prefix}${value.en}` };
}

function betaCell(marker: SpeedMarker): Text {
  const beta = betaOfExcess(marker.excess);
  const bound = marker.bound ? '≥ ' : '';
  if (beta < 0.01) return sig(beta, 3);
  if (beta < 0.999) return prefixed(bound, num(beta, marker.betaDecimals ?? 4));
  return prefixed(`${bound}1 − `, sig(oneMinusBeta(marker.excess), 2));
}

function gammaCell(marker: SpeedMarker): Text {
  const bound = marker.bound ? '≥ ' : '';
  if (marker.excess < 1e-3) return prefixed('1 + ', sig(marker.excess, 2));
  return prefixed(bound, sig(1 + marker.excess, marker.gammaFigures ?? 4));
}

const SPEED_ROWS: ReadonlyArray<readonly Text[]> = SPEED_MARKERS.map((marker) => [
  marker.label,
  betaCell(marker),
  gammaCell(marker),
  marker.source ? `[@${marker.source}]` : '—',
]);

export const EVIDENCE: readonly SourceSection[] = [
  // ───────────────────────────────────────────────────────────────── 8
  {
    id: 'evidence',
    number: '8',
    title: L('Deneysel kanıt', 'Experimental evidence'),
    summary: L(
      'Yukarıdaki kinematik ve optiğin dayandığı ölçümler ve gerçek cisimlerin hız ölçeğindeki yerleri.',
      'The measurements on which the kinematics and optics above rest, and where real objects sit on the speed scale.'
    ),
    blocks: [
      {
        type: 'paragraph',
        text: L(
          r`Burada kullanılan bağıntıların hiçbiri varsayımsal değildir. Çizelge 5, ışık hızının sabitliğine, zaman genişlemesine ve Doppler bağıntısına ilişkin, saniyede birkaç metrelik hızlardan onlar mertebesindeki Lorentz çarpanlarına uzanan ölçümleri listeler.`,
          r`None of the relations used here is hypothetical. Table 5 lists measurements of the constancy of the speed of light, of time dilation and of the Doppler relation, from speeds of metres per second to Lorentz factors of several tens.`
        ),
      },
      {
        type: 'table',
        caption: L(r`Özel göreliliğin seçilmiş deneysel sınamaları.`, r`Selected experimental tests of special relativity.`),
        head: [L('Deney', 'Experiment'), L('Hız', 'Speed'), L('Sonuç', 'Result')],
        align: ['left', 'left', 'left'],
        rows: [
          [
            L('Michelson ve Morley, 1887 [@michelsonmorley1887]', 'Michelson and Morley, 1887 [@michelsonmorley1887]'),
            L(r`Dünya’nın yörünge hareketi, $\beta \approx 10^{-4}$`, r`Earth’s orbital motion, $\beta \approx 10^{-4}$`),
            L(
              'Dünya’nın esire göre hareketine bağlanabilecek bir saçak kayması bulunmadı.',
              'No fringe shift attributable to a motion of the Earth through an ether was found.'
            ),
          ],
          [
            L('Ives ve Stilwell, 1938 [@ivesstilwell1938]', 'Ives and Stilwell, 1938 [@ivesstilwell1938]'),
            L(r`hidrojen kanal ışınları, $\beta = 0{,}002$–$0{,}004$`, r`hydrogen canal rays, $\beta = 0.002$–$0.004$`),
            L(
              r`İleri ve geri gözlenen H$\beta$ çizgilerinin ortalaması, $\sqrt{1-\beta^2}$ çarpanının gerektirdiği kadar kaydı (ikinci mertebe Doppler etkisi).`,
              r`The mean of the H$\beta$ lines observed forwards and backwards was displaced as the factor $\sqrt{1-\beta^2}$ requires (second-order Doppler effect).`
            ),
          ],
          [
            L('Rossi ve Hall, 1941 [@rossihall1941]', 'Rossi and Hall, 1941 [@rossihall1941]'),
            L('kozmik ışın müonları', 'cosmic-ray muons'),
            L(
              'Bozunma hızı momentuma, zaman genişlemesinin gerektirdiği biçimde bağlıdır; öz ömür (2,4 ± 0,3) µs.',
              'The decay rate depends on momentum as time dilation requires; proper lifetime (2.4 ± 0.3) µs.'
            ),
          ],
          [
            L('Frisch ve Smith, 1963 [@frischsmith1963]', 'Frisch and Smith, 1963 [@frischsmith1963]'),
            L(r`müonlar, $\beta = 0{,}9950$–$0{,}9954$`, r`muons, $\beta = 0.9950$–$0.9954$`),
            L(
              'Dağ tepesi ile deniz düzeyi arasında gözlenen zaman genişlemesi çarpanı 8,8 ± 0,8.',
              'Time-dilation factor of 8.8 ± 0.8 observed between a mountain top and sea level.'
            ),
          ],
          [
            L('Alväger ve ark., 1964 [@alvager1964]', 'Alväger et al., 1964 [@alvager1964]'),
            L(r`$\gamma \approx 45$’lik $\pi^0$’lardan çıkan gama ışınları`, r`gamma rays from $\pi^0$ with $\gamma \approx 45$`),
            L(
              r`Foton hızı kaynağın hızından bağımsızdır: $c' = c + kv$ yazılırsa $k = (-3 \pm 13) \times 10^{-5}$.`,
              r`The photon speed is independent of the speed of the source: with $c' = c + kv$, $k = (-3 \pm 13) \times 10^{-5}$.`
            ),
          ],
          [
            L('Hafele ve Keating, 1972 [@hafelekeating1972]', 'Hafele and Keating, 1972 [@hafelekeating1972]'),
            L('yolcu uçakları', 'airliners'),
            L(
              'Dünya çevresinde doğuya uçurulan saatler 59 ± 10 ns geri kaldı, batıya uçurulanlar 273 ± 7 ns ileri gitti (kinematik ve kütleçekimsel etkilerin toplamı); öngörülerle uyumlu.',
              'Clocks flown eastward round the world lost 59 ± 10 ns, those flown westward gained 273 ± 7 ns (kinematic and gravitational effects combined), in agreement with prediction.'
            ),
          ],
          [
            L('Bailey ve ark., 1977 [@bailey1977]', 'Bailey et al., 1977 [@bailey1977]'),
            L(r`depolanmış müonlar, $\gamma = 29{,}33$`, r`stored muons, $\gamma = 29.33$`),
            L(
              r`Ömür 64,4 µs’ye uzadı; özel görelilikle $2 \times 10^{-3}$ içinde uyum.`,
              r`Lifetime dilated to 64.4 µs; agreement with special relativity within $2 \times 10^{-3}$.`
            ),
          ],
          [
            L('Chou ve ark., 2010 [@chou2010]', 'Chou et al., 2010 [@chou2010]'),
            L(r`optik saatler, $v < 10\ \mathrm{m\,s^{-1}}$`, r`optical clocks, $v < 10\ \mathrm{m\,s^{-1}}$`),
            L(
              'Zaman genişlemesi, saniyede 10 metrenin altındaki bağıl hızlarda gözlendi.',
              'Time dilation was observed at relative speeds below 10 metres per second.'
            ),
          ],
          [
            L('Botermann ve ark., 2014 [@botermann2014]', 'Botermann et al., 2014 [@botermann2014]'),
            L(r`Li⁺ iyonları, $\beta = 0{,}338$`, r`Li⁺ ions, $\beta = 0.338$`),
            L(
              r`Relativistik Doppler bağıntısı $(1{,}5 \pm 2{,}3) \times 10^{-9}$ düzeyinde doğrulandı.`,
              r`The relativistic Doppler relation was confirmed to $(1.5 \pm 2.3) \times 10^{-9}$.`
            ),
          ],
        ],
      },
      {
        type: 'paragraph',
        text: L(
          r`Işınımın sapıncı ve Doppler dönüşümü en büyük ölçekte kozmik mikrodalga arka planında (KMA) gözlenir. Güneş Sistemi ona göre 369,82 ± 0,11 km s⁻¹ hızla hareket eder ($\beta = 1{,}2336 \times 10^{-3}$); bu, 2,725 K’lik gökyüzünde 3,362 mK genlikli bir dipol olarak görünür [@planck2018i; @fixsen2009]: 4. bölümdeki Planck tayfı, $T' = DT$ sıcaklığında görülmektedir. Planck uydusu, buna eşlik eden ışık sapıncını ve küçük ölçekli yönbağımlılıkların (anizotropilerin) Doppler kiplenimini de $4\sigma$’nın üzerinde (istatistiksel) bir anlamlılıkla saptamıştır [@planck2013xxvii]. Hızlı hareket eden cisimlerin görünen dönmesi ise laboratuvarda görselleştirilmiştir [@hornof2025].`,
          r`Aberration and the Doppler transformation of radiation are observed on the largest scale in the cosmic microwave background (CMB). The Solar System moves relative to it at 369.82 ± 0.11 km s⁻¹ ($\beta = 1.2336 \times 10^{-3}$), which appears as a dipole of amplitude 3.362 mK in the 2.725 K sky [@planck2018i; @fixsen2009]: the Planck spectrum of Section 4, seen at $T' = DT$. The Planck satellite has also detected the accompanying aberration and Doppler modulation of the small-scale anisotropies, with a (statistical) significance above $4\sigma$ [@planck2013xxvii]. The apparent rotation of fast-moving objects has been visualised in the laboratory [@hornof2025].`
        ),
      },
      { type: 'heading', text: L('Hız ölçeği', 'The speed scale') },
      {
        type: 'paragraph',
        text: L(
          r`Şekil 7 ve Çizelge 6, tanıdık ve uç hızları tek bir ölçeğe yerleştirir. Yatay eksen $\gamma - 1$’dir, yani durgun enerji biriminde kinetik enerji; çünkü $\beta$’nın kendisi doyuma ulaşır. Simülasyon aralığı $\gamma = 223{,}6$’da biter: deniz düzeyindeki kozmik ışın müonlarının ve CERN’de depolanan müonların Lorentz çarpanının ötesinde, SPS ve LHC’deki protonlarınkinin altında.`,
          r`Figure 7 and Table 6 place familiar and extreme speeds on one scale. The horizontal axis is $\gamma - 1$, the kinetic energy in units of the rest energy, because $\beta$ itself saturates. The simulated range ends at $\gamma = 223.6$: beyond the Lorentz factor of cosmic-ray muons at sea level and of the muons stored at CERN, below that of the protons in the SPS and the LHC.`
        ),
      },
      {
        type: 'figure',
        figure: 'speedScale',
        caption: L(
          r`Gerçek cisimler, $\gamma - 1$ ekseninde. Renkli bant simülasyonun kapsadığı aralıktır; işaret geçerli hızı gösterir.`,
          r`Real objects on the axis of $\gamma - 1$. The tinted band is the range the simulation covers; the marker shows the current speed.`
        ),
      },
      {
        type: 'table',
        caption: L(
          r`Şekildeki cisimlerin hızı ve Lorentz çarpanı. Parçacıkların $\gamma$ değerleri, demet enerjisi ile durgun enerjiden (proton 938,272 MeV, müon 105,658 MeV [@codata2022]) hesaplanmıştır.`,
          r`Speed and Lorentz factor of the objects in the figure. For particles $\gamma$ is computed from the beam energy and the rest energy (proton 938.272 MeV, muon 105.658 MeV [@codata2022]).`
        ),
        head: [L('Cisim', 'Object'), r`$\beta$`, r`$\gamma$`, L('Kaynak', 'Source')],
        align: ['left', 'right', 'right', 'left'],
        rows: SPEED_ROWS,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 9
  {
    id: 'verification',
    number: '9',
    title: L('Yazılımın doğrulanması', 'Verification of the software'),
    summary: L(
      'Uygulamanın kapalı biçimli sonuçlarla, standartlarla ve bağımsız bir denetimle karşılaştırılarak nasıl sınandığı.',
      'How the implementation is checked against closed-form results, standards and an independent audit.'
    ),
    blocks: [
      {
        type: 'paragraph',
        text: L(
          r`Fizik, görüntüleme kodundan ayrı, saf fonksiyonlardan oluşan bir kütüphanede yer alır ve otomatik bir test takımıyla sınanır. Gölgelendirici programları bu aritmetiği yineler. İtme, atlas okumaları, gösterim dönüşümü, yıldızların akı yasası ve ölçülen görünüm için kütüphanede birer başvuru uygulaması vardır ve bunlar sınanır; itme ayrıca grafik işlemcinin tek duyarlıklı aritmetiğinin benzetimiyle de sınanır. Yalın aydınlatma toplamları (Lambert terimleri ve yaygın paylar) yalnızca gölgelendiricilerde yazılıdır. Gölgelendiricilerin kendileri de yürütülür: başsız bir Chrome’da, tarayıcıyla birlikte gelen yazılım tabanlı rasterleştirici SwiftShader üzerinde; böylece her makine aynı WebGL 2 uygulamasını ve aynı aritmetiği kullanır. Bu testler Chrome, Edge ya da Chromium bulunan her makinede çalışır; sürekli tümleştirmede tarayıcı bulunamazsa test atlanmaz, koşu başarısız olur. Sahnenin dört programı (şehir, gökyüzü ve yıldızları çizmenin iki yolu) three.js’in birleştirdiği biçimde derlenir ve bağlanır; parçaları başvuru uygulamalarına karşı yürütülür. Gösterim dönüşümü 4096 ışınımda başvurusuyla 8 bitte en çok bir adım farkla uyuşur. Atlas okumaları, görüntüleyicinin yüklediği yarım duyarlıklı dokudan yapılır ve 0,002 ile 500 arasındaki Doppler çarpanlarında, atlasın her satırında başvurularıyla uyuşur; tolerans, değerin $10^{-4}$ katı artı okuma bir doku hücresinin 256’da biri kadar kaydırıldığında değerin uğradığı değişimdir. Doku süzgecinin ara değerleme ağırlıkları için bırakılan bu pay yalnızca bir satırın sıfıra doğru dik düştüğü yerlerde önem taşır. Şehrin köşe aşamasındaki ışık sapıncı ve büzülme, $\beta = 0{,}99999$’a kadar ve hareket yönüne ya da tam tersine çok yakın doğrultular dâhil, hareket doğrultusundaki bileşende uzaklığın $10^{-6}$ katı içinde uyuşur (ölçülen: $2{,}5 \times 10^{-7}$); dik bileşenlerde, dolayısıyla Doppler çarpanında, kendilerinin $10^{-6}$ katı artı durgun çerçevedeki koordinat büyüklüğünde tek bir yuvarlama içinde uyuşur. Bu yuvarlama iki görünümün karışımından gelir ve $\beta = 0{,}99999$’da $2{,}2 \times 10^{-5}$ tutar. Yıldızların iki programının köşe aşamasında her yıldıza verilen ışınım, akı yasasıyla aynı süzgeç payının ötesinde $10^{-4}$ içinde uyuşur. Gökyüzü gölgelendiricisinin Ay diski de yürütülür; piksel, ışık sapıncının durgun çerçevede getirdiği gibi, diskin yarıçapının altıda birinden üç katına kadar büyütülür: disk yuvarlak çizilir, hiçbir piksel merkeze daha yakın bir pikselden daha parlak görünmez ve akı %8 içinde korunur; en çok %6,4’lük (ölçülen) fazlalık, çözümlenmiş diskin kenar süzgecinden gelir; diskten 90° uzakta hiç ışık eklemez. Aynı testler, denenen tek grafik işlemcide (Intel UHD Graphics, Direct3D 11) de geçer. Şehir ve gökyüzü parça gölgelendiricilerinin ana fonksiyonları (her pikselin Doppler çarpanı, ters ışık sapıncı, zemin, ızgara ve silinme), yıldızların nokta yayılım fonksiyonu ve birleştirilmeleri derlenir, ancak bir başvuruya karşı yürütülmez; bunlar için, geri kalan her şeyde olduğu gibi, testler metni karşılaştırır (bildirilen ve sağlanan değişkenler, aktarılan sabitler, yıldızların akı yasasının, ölçülen görünümün ve ton eğrisinin ifadeleri). Çizelge 7 neyin denetlendiğini ve her denetimin neye karşı koruduğunu listeler.`,
          r`The physics lives in a library of pure functions, separate from the rendering code, that is exercised by an automated test suite. The shader programs repeat that arithmetic. The boost, the atlas look-ups, the display transform, the flux law of the stars and the measured view each have a reference implementation in the library, and these are tested; the boost is tested under an emulation of the single-precision arithmetic of the graphics processor as well. The simple lighting sums (Lambert terms and diffuse shares) are written in the shaders only. The shaders themselves are executed as well: in a headless Chrome, on SwiftShader, the software rasteriser that ships with the browser, so that every machine uses the same WebGL 2 implementation and the same arithmetic. These tests run on every machine that has Chrome, Edge or Chromium; in continuous integration a missing browser fails the run instead of skipping the test. The four programs of the scene (city, sky, and the two ways of drawing the stars) are compiled and linked as three.js assembles them, and parts of them are executed against the reference implementations. The display transform agrees with its reference to within one step in 8 bits for 4096 radiances. The atlas look-ups are made from the half-float texture as the viewer uploads it and agree with theirs at Doppler factors from 0.002 to 500 and in every row of the atlas; the tolerance is $10^{-4}$ of the value plus the change of the value when the look-up is shifted by a 256th of a texel. This allowance for the interpolation weights of the texture filter matters only where a row falls steeply towards zero. The aberration and contraction of the city’s vertex stage, up to $\beta = 0.99999$ and including directions very close to the direction of motion and to its opposite, agree to within $10^{-6}$ of the distance in the component along the motion (measured: $2.5 \times 10^{-7}$); in the transverse components, and therefore in the Doppler factor, to within $10^{-6}$ of themselves plus a single rounding at the size of the rest-frame coordinate. That rounding comes from the blend of the two views and amounts to $2.2 \times 10^{-5}$ at $\beta = 0.99999$. The radiance that the vertex stage of both star programs gives each star agrees with the flux law to within $10^{-4}$ beyond the same filter allowance. The lunar disc of the sky shader is executed as well, with the pixel grown from a sixth of the disc’s radius to three times it, as aberration grows it in the rest frame: the disc is drawn round, no pixel looking brighter than one nearer its centre, and its flux is kept to within 8 %; what it gains, at most 6.4 % (measured), comes from the edge filter of the resolved disc; 90° away from the disc it adds no light at all. The same tests also pass on the one graphics processor tried (Intel UHD Graphics, Direct3D 11). The main functions of the city and sky fragment shaders (the Doppler factor of each pixel, the inverse aberration, the ground, the grid and the dissolve), the point-spread function of the stars and their compositing are compiled but not executed against a reference; for them, as for everything else, the tests compare the text (the variables declared and supplied, the constants passed in, the expressions of the flux law of the stars, of the measured view and of the tone curve). Table 7 lists what is checked and what each check guards against.`
        ),
      },
      {
        type: 'table',
        caption: L(r`Test takımının denetlediği özellikler.`, r`Properties checked by the test suite.`),
        head: [L('Denetim', 'Check'), L('Neye karşı korur', 'Guards against')],
        align: ['left', 'left'],
        rows: [
          [
            L(
              r`Işık sapıncı, Doppler çarpanı ve tersleri bütün açı ve hızlarda (3.1)–(3.4) denklemleriyle uyuşur; kutupsal ve azimutal ölçek çarpanlarının ikisi de $1/D$’dir; gökyüzündeki küçük bir çember çembere eşlenir.`,
              r`Aberration, the Doppler factor and their inverses agree with Eqs. (3.1)–(3.4) at all angles and speeds; the polar and the azimuthal scale factor both equal $1/D$; a small circle on the sky maps to a circle.`
            ),
            L('dönüşümdeki hatalar', 'errors in the transformation'),
          ],
          [
            L(
              r`Köşe dönüşümü uzaklığı ve azimutu korur; piksel başına ters dönüşüm onu tam olarak geri alır.`,
              r`The vertex transform preserves distance and azimuth and is undone exactly by the per-pixel inverse transform.`
            ),
            L('geometri ile gökyüzü arasında tutarsızlık', 'inconsistency between geometry and sky'),
          ],
          [
            L(
              r`$\beta = 0{,}99999$’da, hareket yönünden $179{,}99^\circ$’ye kadar tek duyarlıklı aritmetik benzetimi.`,
              r`Emulation of single-precision arithmetic at $\beta = 0.99999$, up to $179.99^\circ$ from the direction of motion.`
            ),
            L('grafik işlemcide anlamlı basamak yitimi', 'loss of significance on the graphics processor'),
          ],
          [
            L(
              r`CIE 1931 çizelgesi yayımlanmış sütun toplamlarını verir ve bağımsız bir analitik yaklaştırımla değer değer uyuşur [@wyman2013].`,
              r`The CIE 1931 table reproduces the published column sums and agrees entry by entry with an independent analytic fit [@wyman2013].`
            ),
            L('gözlemci verisinde aktarım hataları', 'transcription errors in the observer data'),
          ],
          [
            L(
              r`sRGB renksellik koordinatlarından türetilen RGB matrisi, standartta basılı olana eşittir [@iec61966].`,
              r`The RGB matrix derived from the sRGB chromaticities equals the one printed in the standard [@iec61966].`
            ),
            L('renk uzayı hataları', 'colour-space errors'),
          ],
          [
            L(
              r`Planck yasası: Stefan–Boltzmann tümlevi, Wien kayma yasası ve $D^5 B_\lambda(D\lambda, T) = B_\lambda(\lambda, DT)$ özdeşliği.`,
              r`Planck’s law: the Stefan–Boltzmann integral, Wien’s displacement law and the identity $D^5 B_\lambda(D\lambda, T) = B_\lambda(\lambda, DT)$.`
            ),
            L('radyometri hataları', 'errors in the radiometry'),
          ],
          [
            L(
              r`Fotometrik dayanaklar: platinin donma noktasındaki (2042 K) kara cismin parıltısı 60 cd cm⁻²’dir (kandelanın 1979 öncesi tanımı [@bipm2019]); Güneş’in açısal büyüklüğündeki 5772 K’lik bir disk yaklaşık $1{,}25 \times 10^{5}$ lx verir.`,
              r`Photometric anchors: a black body at the freezing point of platinum (2042 K) has a luminance of 60 cd cm⁻² (the definition of the candela before 1979 [@bipm2019]); a 5772 K disc of the Sun’s angular size yields about $1.25 \times 10^{5}$ lx.`
            ),
            L('ölçek hataları (birimler, sabitler)', 'errors of scale (units, constants)'),
          ],
          [
            L(
              r`Atlas, görünür kazancın doğrudan sayısal tümlevini $D = 0{,}4$ ile $D = 447$ arasında %1’den küçük bir farkla yineler ve $D = 1$’de her albedoyu kendisi olarak verir.`,
              r`The atlas reproduces direct numerical integration of the visible gain to better than 1 % between $D = 0.4$ and $D = 447$, and returns every albedo as itself at $D = 1$.`
            ),
            L('aradeğerleme ve ayar hataları', 'errors of interpolation and calibration'),
          ],
          [
            L(
              r`LED modeli 4000 K yakınında Planck eğrisi üzerindedir; her yansıtma tayfı $[0, 1]$ aralığında kalır.`,
              r`The LED model lies on the Planckian locus near 4000 K; every reflectance spectrum stays within $[0, 1]$.`
            ),
            L('fiziksel olmayan model tayfları', 'unphysical model spectra'),
          ],
          [
            L(
              r`Gösterim dönüşümü: ton eğrisi kanallar arasındaki oranları her pozlamada korur ve $[0, 1]$ aralığından çıkmaz; kırmızı trafik ışığı kırmızı, mor ışık ne kadar parlak olursa olsun mor çizilir; GLSL kopyası aynı katsayıları kullanır ve eğriyi o da en büyük kanala uygular.`,
              r`Display transform: the tone curve keeps the ratios between the channels at every exposure and never leaves $[0, 1]$; a red signal is drawn red, and violet light violet however bright; the GLSL copy uses the same coefficients and applies the curve to the largest channel as well.`
            ),
            L('gösterimin renk tonlarını bozması', 'hue shifts introduced by the display'),
          ],
          [
            L(
              r`Gölgelendiriciler, başsız Chrome’da SwiftShader üzerinde yürütülerek: dört program three.js’in birleştirdiği biçimde derlenir ve bağlanır; gösterim dönüşümü başvurusuyla 8 bitte bir adım, atlas okumaları değerin $10^{-4}$ katı artı süzgeç payı içinde uyuşur; şehrin köşe aşaması ve yıldızların akı yasası da başvuru uygulamalarıyla uyuşur; Ay diski yuvarlak çizilir ve akısını korur. Parça gölgelendiricilerinin ana fonksiyonları, Ay diski dışında, yalnızca derlenir ve metin olarak karşılaştırılır.`,
              r`Shaders, executed in headless Chrome on SwiftShader: the four programs compile and link as three.js assembles them; the display transform agrees with its reference to one step in 8 bits, the atlas look-ups to $10^{-4}$ of the value plus the filter allowance, and the vertex stage of the city and the flux law of the stars agree with theirs; the lunar disc is drawn round and keeps its flux. Apart from the lunar disc, the main functions of the fragment shaders are only compiled and compared as text.`
            ),
            L(
              'siteye ulaşan bir sözdizimi hatası; gölgelendirici ile başvuru uygulaması arasında ayrılık',
              'a syntax error reaching the site; drift between shader and reference'
            ),
          ],
          [
            L(
              r`Alt bölümleme: her kenar kurala uyar, alan korunur, komşu üçgenler arasında T-bağlantısı oluşmaz; çizilen kenarların kesin görüntüden sapması ölçülür.`,
              r`Subdivision: every edge obeys the rule, area is preserved, no T-junction opens between neighbouring triangles; the deviation of drawn edges from the exact image is measured.`
            ),
            L('çatlaklar ve eğrilik hatası', 'cracks and curvature error'),
          ],
          [
            L(
              r`Yıldızlar: akı $G_T(D)/D^2$ çarpanıyla değişir; nokta yayılım fonksiyonunun tümlevi normalleştirmenin varsaydığı katı açıya eşittir ve yıldızın piksel ızgarasında nereye düştüğüne pek bağlı değildir; optik eksenle $\psi$ açısı yapan bir pikselin katı açısı $\cos^3\psi$ çarpanıyla küçülür; sayıları, kadir dağılımları ve tayf sınıflarının payları, istatistiksel saçılım içinde Parlak Yıldız Kataloğu’ndaki sayımlarla uyuşur [@hoffleitwarren1991]. Ölçülen görünüm: hareket doğrultusundaki uzunluklar $1/\gamma$ oranında kısalır; piksel başına ters dönüşüm bunu geri alır.`,
              r`Stars: the flux changes by the factor $G_T(D)/D^2$; the integral of the point-spread function equals the solid angle the normalisation assumes and hardly depends on where the star falls on the pixel grid; a pixel at the angle $\psi$ from the optical axis subtends a solid angle smaller by the factor $\cos^3\psi$; their number, their distribution in magnitude and the shares of the spectral classes agree, within the statistical scatter, with counts made in the Bright Star Catalogue [@hoffleitwarren1991]. Measured view: lengths along the motion contract by $1/\gamma$, and the per-pixel inverse undoes it.`
            ),
            L(
              'yıldızların titremesi, yanlış parlaklık ya da yoğunluk; ölçülen görünümde yanlış büzülme',
              'flickering stars, wrong brightness or density; a wrong contraction in the measured view'
            ),
          ],
          [
            L(
              r`Bu belge: her atıf kaynakçada vardır, kaynakçadaki her kaynak anılır, her şekle ve çizelgeye metinde numarasıyla değinilir, her formül derlenir; iki dildeki her paragraf aynı sayıları verir.`,
              r`This document: every citation exists in the bibliography, every entry of the bibliography is cited, every figure and table is referred to by number in the text, every formula compiles; every paragraph states the same numbers in both languages.`
            ),
            L(
              'kopuk atıflar, bozuk formüller, iki dil arasında ayrılık',
              'dangling citations, broken formulas, drift between the two languages'
            ),
          ],
        ],
      },
      {
        type: 'paragraph',
        text: L(
          r`Testlerden bağımsız olarak, 2–4. bölümlerin bütün formülleri, görüntüleyici yazılmadan önce foton dört-momentumunun dönüşümünden ve faz uzayı yoğunluğunun değişmezliğinden yeniden türetilmiş ve sayısal olarak denetlenmiştir. Bu denetim ilk taslaktaki birkaç sayısal değeri düzeltmiş; Doppler çarpanının piksel başına hesaplanmasına ve (5.1) denkleminin tek duyarlıkta güvenli biçimine yol açmıştır. Literatür, Crossref ve yayıncı kayıtlarıyla karşılaştırılmıştır; kaynakça her kaynak için, kaynağın kendisinin okunup okunmadığını belirtir.`,
          r`Independently of the tests, every formula of Sections 2–4 was re-derived from the transformation of the photon four-momentum and from the invariance of the phase-space density, and checked numerically, before the renderer was written. That audit corrected several numerical values of the first draft and led to the per-pixel evaluation of the Doppler factor and to the single-precision-safe form of Eq. (5.1). The literature was checked against Crossref and the publishers’ records; the bibliography states for each entry whether the source itself was read.`
        ),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 10
  {
    id: 'limits',
    number: '10',
    title: L('Modelin sınırları', 'Limits of the model'),
    summary: L(
      'Neyin kesin, neyin varsayım olduğu ve nelerin dışarıda bırakıldığı.',
      'What is exact, what is assumed, and what is left out.'
    ),
    blocks: [
      {
        type: 'paragraph',
        text: L(
          r`Işık sapıncı, Doppler çarpanı ve ışınım parlaklığının dönüşümü özel göreliliğin kesin sonuçlarıdır. Bunların dışındaki her şey bir model ya da bir tercihtir ve aşağıdaki sınırlar geçerlidir.`,
          r`The aberration, the Doppler factor and the transformation of radiance are exact consequences of special relativity. Everything else is a model or a choice, and the following limits apply.`
        ),
      },
      {
        type: 'list',
        items: [
          L(
            r`**Boşluk.** Işığın boşlukta yayıldığı varsayılır. Deniz düzeyinde görünür ışık için kırılma indisi birden $2{,}8 \times 10^{-4}$ fazla olan havada [@ciddor1996], $\beta > 0{,}99972$ ($\gamma > 42$) hızındaki bir gözlemci ortamdaki ışığı geçerdi; dolayısıyla aralığın üst bölümü boşluktaki bir kenttir. Bakış doğrultusu boyunca soğurma, saçılma ve ışıma hesaba katılmaz.`,
            r`**Vacuum.** Light is assumed to travel in vacuum. In air at sea level, whose refractive index for visible light exceeds one by $2.8 \times 10^{-4}$ [@ciddor1996], an observer with $\beta > 0.99972$ ($\gamma > 42$) would outrun light in the medium; the upper part of the range is therefore a city in vacuum. No absorption, scattering or emission along the line of sight is included.`
          ),
          L(
            r`**Durağan sahne, sabit hız.** Caddede hiçbir şey hareket etmez ya da değişmez; gözlemci ivmelenmez: hızı değiştirmek, kararlı durumlar arasında bir geçiştir. Her andaki görüntü, pozlama süresi sıfır olan ideal bir iğne deliği kamerasınınkidir.`,
            r`**Static scene, constant velocity.** Nothing in the street moves or changes, and the observer does not accelerate: changing the speed is a passage between stationary states. The image at each instant is that of an ideal pinhole camera with zero exposure time.`
          ),
          L(
            r`**Fotopik görme.** Parıltı baştan sona fotopik gözlemciyle hesaplanır; oysa ay ışığındaki bir cadde kısmen çubuk hücrelerle görülür.`,
            r`**Photopic vision.** Luminance is computed with the photopic observer throughout, although a moonlit street is seen partly with rod vision.`
          ),
          L(
            r`**Tayflar.** Görünür bandın dışındaki yansıtma bir dış kestirimdir (5. bölüm). Ay ışığı 4100 K’lik bir Planck tayfı sayılmıştır; bu, yaygın olarak verilen ancak belirsizliğiyle birlikte birincil bir ölçümü bulunamayan bir renk sıcaklığıdır ve gerçek ay ışığı ayrıca Güneş’in soğurma çizgilerini ve atmosferin soğurma bantlarını taşır. LED tayfı iki loblu bir modeldir. Isıl ışıma gri kabul edilmiştir: kentin yüzeyleri tek bir sıcaklık ve tek bir yayınırlıkla, Ay diski de kendi sıcaklığı ve yayınırlığıyla ışır; gerçek kızılötesinde malzemelerin ve atmosferin güçlü bir tayfsal yapısı vardır. Yansıyan ve yayılan ışık birbirinden bağımsız modellenmiştir: saydam olmayan bir yüzeyde Kirchhoff yasası gereği yansıtma ile yayınırlığın toplamı her dalga boyunda birdir; gri yayınırlık ile kızılötesine sürdürülen yansıtma bu koşulu birlikte sağlamaz. Tutarsızlık yalnızca yansıyan ve yayılan ışığın aynı büyüklükte olduğu yerde önem taşır: ışımanın başladığı $D \approx 3{,}6$ dolayında görünür bant, durgun çerçevede 1,4–2,8 µm dalga boylarını örnekler ve orada yansıyan ay ışığı ile ısıl ışıma aynı mertebededir; $D = 5$’ten itibaren ısıl ışıma yüz kattan, $D = 9$’dan itibaren $10^{5}$ kattan daha güçlüdür.`,
            r`**Spectra.** Reflectance outside the visible band is an extrapolation (Section 5). Moonlight is taken as a Planck spectrum of 4100 K, a commonly quoted colour temperature for which no primary measurement with an uncertainty was found; real moonlight also carries the absorption lines of the Sun and the absorption bands of the atmosphere. The LED spectrum is a two-lobe model. Thermal emission is grey: the surfaces of the city radiate with a single temperature and a single emissivity, the lunar disc with its own; in the real infrared, materials and the atmosphere have strong spectral structure. Reflected and emitted light are modelled independently: for an opaque surface Kirchhoff’s law makes reflectance and emissivity add up to one at every wavelength, which the grey emissivity and the reflectance continued into the infrared do not satisfy together. The inconsistency matters only where reflected and emitted light are of similar size: near the onset of the glow, at $D \approx 3.6$, the visible band samples rest-frame wavelengths of 1.4–2.8 µm, and there reflected moonlight and thermal emission are of the same order; from $D = 5$ on the thermal emission is more than a hundred times stronger, and from $D = 9$ more than $10^{5}$ times.`
          ),
          L(
            r`**Aydınlatma.** Gölge yoktur; yüzeyler arası yansımanın yerine küçük bir yaygın terim konmuştur (Çizelge 4); sokak aydınlatması köşe başına hesaplanır. Yıldız alanı yapaydır ve yıldızların, sokak aydınlatmasına göre ayarlanmış bir pozlamada görünebilmesi için akıları ${SCENARIO.stars.visibilityGain} kat artırılmıştır.`,
            r`**Lighting.** There are no shadows, and inter-reflection is replaced by a small diffuse term (Table 4); street lighting is evaluated per vertex. The star field is synthetic, and its flux is raised by a factor of ${SCENARIO.stars.visibilityGain} so that stars register at an exposure set for street lighting.`
          ),
          L(
            r`**Geometri.** Çizilen kenarlar kesin eğri görüntüden $0{,}34^\circ$’ye kadar sapar (5. bölüm). Modellenen cadde, sonsuz bir sokağın 576 m’lik bir örneğidir; gözlemcinin yaklaşık 360–410 m önünde ve 65–85 m arkasında çözülerek biter. En yüksek hızlarda bu, Doppler halkasının dış bölümünde görünecek olanın bir kısmını dışarıda bırakır.`,
            r`**Geometry.** Drawn edges deviate from the exact curved image by up to $0.34^\circ$ (Section 5). The modelled avenue is a 576 m sample of an endless street; it dissolves about 360–410 m ahead of the observer and 65–85 m behind. At the highest speeds this removes part of what would otherwise appear in the outer part of the Doppler ring.`
          ),
          L(
            r`**Gösterim.** Beyaz dengesi, pozlama, parlak bölgelerin sıkıştırılması, ton eğrisi ve gam eşleme, on bir mertebeye yayılan parıltının bir ekranda nasıl gösterileceğine ilişkin tercihlerdir (5. bölüm). Bir pikselin nasıl çizileceğini değiştirirler, hangi ışığı temsil ettiğini değil; pozlama düzeltmesi her zaman gösterilir. Ton eğrisi renk tonunu ve doygunluğu koruduğundan, doygun bir renk ekranın o renkteki ana renginden daha parlak çizilemez: kırmızı bir ışık ne kadar parlak olursa olsun en çok kırmızı ana renk kadar, yani ekran beyazının parıltısının yaklaşık beşte biriyle çizilir (mavi ışık yaklaşık on dörtte biriyle). Başvuru beyazı kadar parlak kırmızı bir ışık bu sınıra neredeyse varmıştır; ondan daha parlak kırmızılar birbirinden ayırt edilemez. Gam eşleme baskın dalga boyunu korur, algılanan renk tonunu ise tam olarak korumaz: kırmızı trafik ışığı (626 nm) hafifçe pembeye çalan bir kırmızı olarak çizilir.`,
            r`**Display.** White balance, exposure, highlight compression, tone curve and gamut mapping are choices about how to show eleven decades of luminance on a screen (Section 5). They change how a pixel is drawn, never which light it stands for; the exposure correction is always displayed. Because the tone curve keeps hue and saturation, a saturated colour cannot be drawn brighter than the display primary of that colour: a red light, however bright, is drawn at most about as bright as the red primary, at about a fifth of the luminance of the display white (blue light at about a fourteenth). A red light as bright as the reference white is already close to that limit, and brighter reds cannot be told apart. The mapping into the gamut keeps the dominant wavelength but not quite the perceived hue: the red signal (626 nm) is drawn as a red leaning slightly towards crimson.`
          ),
          L(
            r`**Aralık.** Simülasyon $\beta = 0{,}99999$’da biter. Ötesinde nitel olarak yeni bir şey olmaz ve hiçbir sonlu adım $\beta = 1$’e ulaşmaz.`,
            r`**Range.** The simulation ends at $\beta = 0.99999$. Nothing qualitatively new happens beyond it, and no finite step reaches $\beta = 1$.`
          ),
        ],
      },
    ],
  },
];
