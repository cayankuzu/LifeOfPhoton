/**
 * Dossier, sections 1–4: the thought experiment, kinematics, optics, radiometry.
 *
 * Every number in running text was computed with src/physics (see the unit tests);
 * the tables are generated from the same functions when this module is loaded.
 */

import { BETA_MAX, kinematicState } from '@/physics/kinematics';
import { aberrate, neutralConeAngle, transversePlaneApparentAngle } from '@/physics/optics';
import { L, type SourceSection, type Text } from '../types';
import { deg, num, r, sig } from './helpers';

/** Velocities of the reference tables. */
const TABLE_BETAS = [0.5, Math.sqrt(3) / 2, 0.99, 0.999, 0.9999, BETA_MAX] as const;

function betaLabel(beta: number): Text {
  if (Math.abs(beta - Math.sqrt(3) / 2) < 1e-9) return { tr: '0,8660', en: '0.8660' };
  const digits = beta >= 0.9999 ? (beta >= 0.99999 ? 5 : 4) : beta >= 0.999 ? 3 : 2;
  return num(beta, digits);
}

const KINEMATIC_ROWS: ReadonlyArray<readonly Text[]> = TABLE_BETAS.map((beta) => {
  const k = kinematicState(beta);
  return [
    betaLabel(beta),
    sig(k.gamma, 5),
    num(k.rapidity, 4),
    sig(k.dopplerAhead, 5),
    sig(k.clockRate, 4),
    sig(100 * k.contraction, 4),
  ];
});

const ABERRATION_ROWS: ReadonlyArray<readonly Text[]> = TABLE_BETAS.map((beta) => [
  betaLabel(beta),
  deg(transversePlaneApparentAngle(beta), beta > 0.99 ? 3 : 2),
  deg(aberrate((135 * Math.PI) / 180, beta), beta > 0.99 ? 3 : 2),
  deg(aberrate((170 * Math.PI) / 180, beta), 2),
  deg(neutralConeAngle(beta), 2),
]);

export const FOUNDATIONS: readonly SourceSection[] = [
  // ───────────────────────────────────────────────────────────────── 1
  {
    id: 'thought-experiment',
    number: '1',
    title: L('Düşünce deneyi', 'The thought experiment'),
    summary: L(
      'Einstein’ın on altı yaşında sorduğu soru, 1905’teki çözümü ve bu simülasyonun neyi gösterip neyi göstermediği.',
      'What Einstein asked at sixteen, how the question was resolved in 1905, and what this simulation does and does not show.'
    ),
    blocks: [
      {
        type: 'paragraph',
        text: L(
          r`Einstein, 1946’da kaleme aldığı _Otobiyografik Notlar_’da, on altı yaşındayken karşılaştığı bir paradoksu anlatır [@einstein1949]: bir ışık demetinin peşinden $c$ hızıyla gidilseydi, demet durgun ama uzayda salınan bir elektromanyetik alan olarak görünmeliydi. Ne deneyim ne de Maxwell denklemleri böyle bir şeye izin veriyor gibiydi; üstelik böyle hareket eden bir gözlemci, Dünya’ya göre durgun bir gözlemciyle aynı yasaları bulmalıydı, yoksa düzgün ve hızlı hareket ettiğini anlayabilirdi.`,
          r`In his _Autobiographical Notes_, written in 1946, Einstein recalls “a paradox upon which I had already hit at the age of sixteen” [@einstein1949]: if one pursued a beam of light at the speed $c$, the beam should appear as an electromagnetic field at rest that nevertheless oscillates in space. Nothing of the kind seemed to exist, neither according to experience nor according to Maxwell’s equations; and an observer moving in this way should find the same laws as one at rest relative to the Earth, since otherwise he could tell that he is in fast uniform motion.`
        ),
      },
      {
        type: 'paragraph',
        text: L(
          r`Bu anlatı dikkatle aktarılmalıdır. _Notlar_ olayın geçtiği yeri belirtmez; Einstein’ın 1955’te yazdığı kısa bir özyaşam taslağı onu Aarau’daki kanton okulunda geçirdiği yıla (1895–96) yerleştirir [@einstein1956]. On altı yaşındaki Einstein Maxwell kuramını henüz bilmiyordu (kuramı 1898 dolaylarında çalıştı); dolayısıyla Maxwell denklemlerine yapılan gönderme sonraki anlatıma aittir. Kaynakları inceleyen Norton ayrıca, akıl yürütmenin bu hâliyle bir esir kuramını çürütmediğini — bir esir kuramcısının itirazların her birine yanıt verebileceğini — ve olgunlaşmış düşünce deneyinin en doğru biçimde, ışığın kaynağına göre $c$ hızıyla yayıldığı salım (emisyon) kuramlarına yöneltilmiş bir itiraz olarak okunabileceğini savunur [@norton2013].`,
          r`The retelling needs care. The _Notes_ do not say where this happened; a sketch Einstein wrote in 1955 places it in his year at the cantonal school in Aarau (1895–96) [@einstein1956]. The sixteen-year-old did not yet know Maxwell’s theory, which Einstein studied around 1898, so the appeal to Maxwell’s equations belongs to the later account. Norton, who has examined the sources, argues further that the argument as stated does not refute an ether theory — an ether theorist can answer each objection — and that the mature thought experiment is best read as an objection to emission theories of light, in which light would move at $c$ relative to its source [@norton2013].`
        ),
      },
      {
        type: 'paragraph',
        text: L(
          r`Çözüm 1905’te geldi [@einstein1905]. İki postulat — fizik yasaları bütün eylemsiz çerçevelerde aynıdır; ışığın boşluktaki hızı, kaynağın hareketinden bağımsız olarak bütün eylemsiz çerçevelerde aynıdır — ışıkla birlikte giden bir gözlemciye yer bırakmaz: eylemsiz çerçeveler arasındaki dönüşüm $v = c$’de tekil olur, var olan her çerçevede ise ışık yine $c$ hızıyla geçer. Gözlemcinin hızıyla değişen şey ışığın hızı değil, aldığı ışığın yönü, frekansı ve şiddetidir. Aynı makalenin 7. bölümü, burada gösterilen her şeyi yöneten iki yasayı zaten içerir: Doppler etkisi ve ışık sapıncı (aberasyon).`,
          r`The resolution came in 1905 [@einstein1905]. Two postulates — the laws of physics are the same in every inertial frame, and the speed of light in vacuum is the same in every inertial frame, independent of the motion of its source — leave no room for an observer who rides along with light: the transformation between inertial frames becomes singular at $v = c$, and in every frame that does exist light still passes at $c$. What changes with the observer’s velocity is not the speed of light but the direction, frequency and intensity of the light received. Section 7 of the same paper already contains the two laws that govern everything shown here: the Doppler effect and the aberration of light.`
        ),
      },
      {
        type: 'paragraph',
        text: L(
          r`Bu simülasyon soruyu, fiziğin izin verdiği yere kadar harfiyen izler. Kütleli bir gözlemci bir kent caddesinde, durgun hâlden $\beta = 0{,}99999$’a kadar ayarlanabilen sabit bir $v = \beta c$ hızıyla ilerler ve ekran o gözlemcinin göreceğini birinci şahıs bakışıyla gösterir: tek bir noktaya bütün yönlerden ulaşan ışığı, gözlemcinin çerçevesine dönüştürülmüş olarak. Hiçbir şey dışarıdan çizilmez. Relativistik dönüşüm kesindir; kent ve ışığı ise bir modeldir: varsayımları 5. bölümde, sınırları 10. bölümde verilmiştir.`,
          r`This simulation follows the question literally as far as physics allows. An observer with mass travels along a city avenue at a constant velocity $v = \beta c$ that can be set anywhere from rest to $\beta = 0.99999$, and the screen shows what that observer would see, in the first person: the light arriving at one point from all directions, transformed into the observer’s frame. Nothing is drawn from outside. The relativistic transformation is exact; the city and its light are a model, whose assumptions are listed in Section 5 and whose limits are stated in Section 10.`
        ),
      },
      {
        type: 'callout',
        tone: 'caution',
        title: L('Başlık üzerine', 'On the title'),
        text: L(
          r`Bir fotonun bakış açısı yoktur. Hiçbir eylemsiz çerçeve $c$ hızıyla hareket etmez; bu yüzden “bir fotonun gördüğü” tanımlı değildir. Işıksı bir dünya çizgisi boyunca öz zamanın sıfır olması, bir deneyime değil $ds^2 = 0$ aralığına ilişkin bir ifadedir. Başlık, gözlemcinin yaklaştığı ama asla ulaşmadığı $\beta \to 1$ sınırını adlandırır: aralığın üst ucunda Lorentz çarpanı sonsuz değil, $\gamma = 223{,}6$’dır.`,
          r`A photon has no point of view. No inertial frame moves at $c$, so “what a photon sees” is not defined; that the proper time along a light-like world line is zero is a statement about the interval $ds^2 = 0$, not about an experience. The title names the limit $\beta \to 1$ that the observer approaches and never reaches: at the top of the range the Lorentz factor is $\gamma = 223.6$, not infinity.`
        ),
      },
      { type: 'try', label: L('Caddede durgun dur', 'Stand in the avenue at rest'), scenario: { beta: 0 } },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 2
  {
    id: 'kinematics',
    number: '2',
    title: L('Gözlemcinin kinematiği', 'Kinematics of the observer'),
    summary: L(
      'Lorentz çarpanı, saatler, uzunluklar, hızlılık ve hız denetiminin hıza nasıl eşlendiği.',
      'Lorentz factor, clocks, lengths, rapidity, and how the speed control maps to velocity.'
    ),
    blocks: [
      {
        type: 'paragraph',
        text: L(
          r`S caddenin durgun olduğu çerçeve, S′ ise cadde boyunca (burada $x$ ekseni) $v = \beta c$ hızıyla ilerleyen gözlemcinin çerçevesi olsun. Olaylar Lorentz itmesiyle (boost) ilişkilidir:`,
          r`Let S be the frame in which the street is at rest and S′ the frame of the observer, who moves along the avenue (the $x$ axis here) with velocity $v = \beta c$. Events are related by the Lorentz boost`
        ),
      },
      {
        type: 'equation',
        number: '2.1',
        tex: r`\begin{gathered} t' = \gamma\left(t - \frac{\beta x}{c}\right),\qquad x' = \gamma\,(x - \beta c\,t),\qquad y' = y,\qquad z' = z, \\[4pt] \gamma = \frac{1}{\sqrt{1-\beta^{2}}} \end{gathered}`,
      },
      {
        type: 'paragraph',
        text: L(
          r`Ölçerler bunun iki sonucunu gösterir. Gözlemcinin taşıdığı saat, cadde saatleri $dt$ kadar ilerlerken öz zaman kadar ilerler:`,
          r`Two consequences are displayed by the instruments. While the street clocks advance by $dt$, a clock carried by the observer advances by the proper time`
        ),
      },
      { type: 'equation', number: '2.2', tex: r`d\tau = \frac{dt}{\gamma}` },
      {
        type: 'paragraph',
        text: L(
          r`ve caddede durgun olan $L_0$ uzunluğu, S′ çerçevesinde iki ucu aynı S′ anında işaretlenerek ölçüldüğünde`,
          r`and a length $L_0$ at rest in the street, measured in S′ by marking both of its ends at the same S′ time, is`
        ),
      },
      { type: 'equation', number: '2.3', tex: r`L = \frac{L_0}{\gamma}` },
      {
        type: 'paragraph',
        text: L(
          r`olur. Her iki ifade de ölçüme, yani olaylara koordinat atanmasına ilişkindir [@taylorwheeler1992; @rindler2006]. Hiçbiri bir kameranın ne kaydedeceğini söylemez: görüntüyü aynı anda ulaşan ışık oluşturur ve bu ışık sahnenin farklı yerlerinden farklı anlarda yola çıkmıştır. Bu, 3. bölümün konusudur.`,
          r`Both statements are about measurement, that is, about the assignment of coordinates to events [@taylorwheeler1992; @rindler2006]. Neither says what a camera records: an image is formed by light that arrives at one instant and therefore left different parts of the scene at different times. That is the subject of Section 3.`
        ),
      },
      { type: 'heading', text: L('Hızlılık', 'Rapidity') },
      {
        type: 'paragraph',
        text: L(
          r`Hızlar toplanmaz; hızlılıklar (rapidite) toplanır. Hızlılık $\varphi = \operatorname{artanh}\beta$ ile tanımlanırsa`,
          r`Velocities do not add; rapidities do. With the rapidity $\varphi = \operatorname{artanh}\beta$,`
        ),
      },
      {
        type: 'equation',
        number: '2.4',
        tex: r`\gamma = \cosh\varphi,\qquad \gamma\beta = \sinh\varphi,\qquad D_0 \equiv \sqrt{\frac{1+\beta}{1-\beta}} = e^{\varphi}`,
      },
      {
        type: 'paragraph',
        text: L(
          r`Aynı doğru boyunca iki itme, hızlılıklarının toplanmasıyla bileşir; $\gamma\beta$, $c$ biriminde öz hızdır: $\gamma\beta c = dx/d\tau$, gözlemcinin kendi zamanının birimi başına cadde çerçevesinde aşılan yoldur ve üst sınırı yoktur; $D_0$ ise tam karşıdan gelen ışığın Doppler çarpanıdır. Gözlemcinin bütün optiği hıza yalnızca $D_0$ üzerinden bağlıdır (3. bölüm); bu da $\varphi$’yi problemin doğal değişkeni yapar. Çizelge 1 bu nicelikleri işaretli hızlarda verir, Şekil 1 ise onları hızlılığa karşı çizer.`,
          r`Two boosts along the same line compose by adding their rapidities; $\gamma\beta$ is the proper velocity in units of $c$: $\gamma\beta c = dx/d\tau$ is the distance covered in the street frame per unit of the observer’s own time, and it has no upper bound; and $D_0$ is the Doppler factor of light arriving from dead ahead. The whole optics of the observer depends on the velocity only through $D_0$ (Section 3), which makes $\varphi$ the natural variable of the problem. Table 1 gives these quantities at the marked speeds, and Figure 1 plots them against rapidity.`
        ),
      },
      {
        type: 'table',
        caption: L(
          r`İşaretli hızlarda kinematik nicelikler. Son sütun, caddede durgun 100 m’lik bir uzunluğun S′ çerçevesinde ölçülen değeridir.`,
          r`Kinematic quantities at the marked speeds. The last column is the length, measured in S′, of 100 m at rest in the street.`
        ),
        head: [r`$\beta$`, r`$\gamma$`, r`$\varphi$`, r`$D_0$`, r`$d\tau/dt$`, r`$L$ (m)`],
        align: ['left', 'right', 'right', 'right', 'right', 'right'],
        rows: KINEMATIC_ROWS,
      },
      {
        type: 'figure',
        figure: 'lorentz',
        caption: L(
          r`Hızlılığa karşı Lorentz çarpanı $\gamma$, saat hızı $1/\gamma$, öz hız $\gamma\beta$ ve ileri Doppler çarpanı $D_0$. Bu eksende eşit uzaklıklar eşit itmelerdir; üstteki etiketler karşılık gelen $\beta$ değerini verir. Hızı ayarlamak için grafiğin üzerine tıklayın ya da imleci grafik üzerinde sürükleyin.`,
          r`Lorentz factor $\gamma$, clock rate $1/\gamma$, proper velocity $\gamma\beta$ and head-on Doppler factor $D_0$ against rapidity. On this axis equal distances are equal boosts; the labels along the top give the corresponding $\beta$. Click or drag in the plot to set the speed.`
        ),
      },
      { type: 'heading', text: L('Bu hıza ulaşmak', 'Reaching the speed') },
      {
        type: 'paragraph',
        text: L(
          r`Simülasyonda hız serbestçe ayarlanır; o hıza ulaşmak ise ayrı bir konudur. Durgun hâlden sabit öz ivme $a$ ile hızlanan bir roket hiperbolik hareket yapar [@mtw1973; @rindler2006]:`,
          r`The simulation lets the velocity be set freely; reaching it is another matter. A rocket that accelerates from rest with constant proper acceleration $a$ follows hyperbolic motion [@mtw1973; @rindler2006],`
        ),
      },
      {
        type: 'equation',
        number: '2.5',
        tex: r`\varphi = \frac{a\tau}{c},\qquad t = \frac{c}{a}\sinh\varphi,\qquad x = \frac{c^{2}}{a}\left(\cosh\varphi - 1\right)`,
      },
      {
        type: 'paragraph',
        text: L(
          r`Standart yer çekimi ivmesi $a = 9{,}80665\ \mathrm{m\,s^{-2}}$ için simülasyon aralığının üst ucuna, $\beta = 0{,}99999$’a ($\varphi = 6{,}103$), gemide 5,91 yıl sonra ulaşılır; bu sırada cadde çerçevesinde 216,6 yıl geçmiş ve 215,6 ışık yılı yol alınmıştır.`,
          r`At the standard acceleration of gravity, $a = 9.80665\ \mathrm{m\,s^{-2}}$, the top of the simulated range, $\beta = 0.99999$ ($\varphi = 6.103$), is reached after 5.91 years on board, by which time 216.6 years have passed in the street frame and 215.6 light-years have been covered.`
        ),
      },
      { type: 'heading', text: L('Hız denetimi', 'The speed control') },
      {
        type: 'paragraph',
        text: L(
          r`Hız denetiminin $s \in [0, 1]$ konumu hıza şu bağıntıyla eşlenir:`,
          r`The position $s \in [0, 1]$ of the speed control is mapped to velocity by`
        ),
      },
      {
        type: 'equation',
        number: '2.6',
        tex: r`\beta(s) = \tanh\!\left(\varphi_{\max}\, s^{2}\right),\qquad \varphi_{\max} = \operatorname{artanh}\beta_{\max}`,
      },
      {
        type: 'paragraph',
        text: L(
          r`$\varphi$ ile doğrusal bir denetim her adımı aynı itme yapardı, ama geometrinin en çok değiştiği $0 \le \beta \le 0{,}87$ aralığını yolun ilk beşte birine sıkıştırırdı; kare alma, rejimleri eşit aralıklarla yayar ($\beta = 0{,}5$ yolun %30’unda, $\gamma = 2$ %46’sında, $\beta = 0{,}99$ %66’sında). Fare tekerleği ve ok tuşları bu eşlemeyi kullanmaz: her çentik ya da tuş vuruşu, hız ne olursa olsun aynı itmeyi, $\Delta\varphi = 0{,}045$’i uygular.`,
          r`A control linear in $\varphi$ would make every step the same boost but would crowd the range $0 \le \beta \le 0.87$, where the geometry changes most, into the first fifth of its travel; the square spreads the regimes evenly ($\beta = 0.5$ at 30 % of the travel, $\gamma = 2$ at 46 %, $\beta = 0.99$ at 66 %). The scroll wheel and the arrow keys bypass the mapping: each notch or key press applies the same boost, $\Delta\varphi = 0.045$, at any speed.`
        ),
      },
      {
        type: 'callout',
        tone: 'note',
        title: L('Ekranın izlediği saat', 'Which clock the display follows'),
        text: L(
          r`Işık, modellenen 576 m’lik caddeyi iki mikrosaniyeden kısa sürede geçer; bu nedenle gösterim $6{,}2 \times 10^{6}$ kat yavaşlatılmıştır: ışık, gösterilen her saniyede 48 m yol alır. Ekran cadde zamanı $t$’ye kilitlidir; gözlemcinin öz zamanı $\tau$ bu yüzden gösterim hızının $1/\gamma$ katıyla akar. Ölçer panelindeki iki saat bunu gösterir.`,
          r`Light crosses the 576 m of the modelled avenue in less than two microseconds, so the playback is slowed by a factor of $6.2 \times 10^{6}$: light covers 48 m per displayed second. The display is locked to street time $t$; the observer’s proper time $\tau$ therefore runs at $1/\gamma$ of the displayed rate, which is what the two clocks of the instrument panel show.`
        ),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 3
  {
    id: 'optics',
    number: '3',
    title: L('Görülen: hareketli gözlemcinin optiği', 'What is seen: the optics of a moving observer'),
    summary: L(
      'Işık sapıncı, Doppler çarpanı, nötr koni ve hareketli cisimlerin neden büzülmüş değil dönmüş göründüğü.',
      'Aberration, the Doppler factor, the neutral cone, and why moving objects look rotated rather than contracted.'
    ),
    blocks: [
      {
        type: 'paragraph',
        text: L(
          r`Bir görüntü, göze aynı anda ulaşan ışıktan oluşur. Işığın ulaşması zaman aldığından, görüntü sahnenin her parçasını ışığın oradan ayrıldığı andaki hâliyle gösterir: görmek ölçmek değildir. Durgun çerçevesinde durağan (statik) bir sahne için bunun yalın bir sonucu vardır [@weiskopf2000]. Hareketli gözlemcinin caddenin belirli bir noktasından geçtiği olayı ele alalım. Oraya ulaşan fotonlar, o noktada durgun bir gözlemcinin alacağı fotonların aynısıdır; iki çerçeve arasında yalnızca yönleri, frekansları ve birim katı açıya düşen sayıları farklıdır. Dolayısıyla hareketli gözlemcinin gördüğü, durgun gözlemcinin görüntüsünün her yönü yeniden eşlenmiş ve her tayfı dönüştürülmüş hâlidir. Örtme ilişkileri değişmez, çünkü her ışın boyunca belirlenir. Bu ifade, boşlukta, anlık pozlama yapan ideal bir iğne deliği kamerası için kesindir.`,
          r`An image is made of light that reaches the eye at one instant. Because light takes time to arrive, the image shows each part of the scene as it was when the light left it: seeing is not measuring. For a scene that is static in its rest frame this has a simple consequence [@weiskopf2000]. Take the event at which the moving observer passes a given point of the street. The photons arriving there are the same photons that an observer at rest at that point would receive; only their directions, their frequencies and their number per unit solid angle differ between the two frames. What the moving observer sees is therefore the picture of the observer at rest, with every direction re-mapped and every spectrum transformed. Occlusion is unchanged, since it is decided along each ray. The statement is exact for an ideal pinhole camera with an instantaneous exposure, in vacuum.`
        ),
      },
      { type: 'heading', text: L('Işık sapıncı (aberasyon)', 'Aberration') },
      {
        type: 'paragraph',
        text: L(
          r`Bir kaynağın cadde çerçevesinde görüldüğü yön ile hareket yönü arasındaki açı $\theta$, aynı açının hareketli gözlemci için değeri $\theta'$ olsun. O zaman`,
          r`Let $\theta$ be the angle between the direction of motion and the direction in which a source is seen in the street frame, and $\theta'$ the same angle for the moving observer. Then`
        ),
      },
      { type: 'equation', number: '3.1', tex: r`\cos\theta' = \frac{\cos\theta + \beta}{1 + \beta\cos\theta}` },
      {
        type: 'paragraph',
        text: L(
          r`Bu, Einstein’ın 1905 makalesindeki ışık sapıncı yasasıdır [@einstein1905]; makale yasayı ışığın yayılma yönü için (dolayısıyla eksi işaretlerle) yazar, yukarıdaki biçim ise aynı yasanın bakılan yön için yazılışıdır. $\beta \ll 1$ için Bradley’nin bulduğu yıldız sapıncına indirgenir: en çok $\beta$ radyanlık bir kayma — Dünya’nın yörünge hızı için 20,5 yay saniyesi [@bradley1728]. Yarım açılarla yazıldığında yasa`,
          r`This is the law of aberration of Einstein’s 1905 paper [@einstein1905], which states it for the direction in which the light propagates (hence with minus signs); the form above is the same law for the direction one looks in. For $\beta \ll 1$ it reduces to the stellar aberration discovered by Bradley, a displacement of at most $\beta$ radians — 20.5 arcseconds for the Earth’s orbital speed [@bradley1728]. Written for half angles the law becomes`
        ),
      },
      { type: 'equation', number: '3.2', tex: r`\tan\frac{\theta'}{2} = e^{-\varphi}\,\tan\frac{\theta}{2}` },
      {
        type: 'paragraph',
        text: L(
          r`biçimini alır; yani bir itme, yönler küresinin stereografik izdüşümünü $1/D_0$ çarpanıyla düzgün ölçekler. Böyle bir dönüşüm açıkorurdur (konformal): açıları korur ve çemberleri çemberlere götürür [@terrell1959; @penrose1959]. Tam öndeki ve tam arkadaki yönler dışında bütün yönler hareket yönüne doğru çekilir; Çizelge 2 bunu işaretli hızlarda birkaç yön için sayılarla verir, Şekil 2 ise geçerli hızda çizer.`,
          r`so a boost acts on the sphere of directions as a uniform scaling of its stereographic projection by the factor $1/D_0$. Such a map is conformal: it preserves angles and takes circles to circles [@terrell1959; @penrose1959]. Every direction except those exactly ahead and exactly behind is pulled towards the direction of motion; Table 2 gives this in numbers for a few directions at the marked speeds, and Figure 2 draws it at the current speed.`
        ),
      },
      {
        type: 'table',
        caption: L(
          r`Cadde çerçevesindeki $\theta$ yönünün gözlemciye göründüğü $\theta'$ açısı ve nötr koninin ($D = 1$) yarı açısı.`,
          r`Apparent angle $\theta'$ at which the street-frame direction $\theta$ is seen, and half-angle of the neutral cone ($D = 1$).`
        ),
        head: [r`$\beta$`, r`$\theta = 90^\circ$`, r`$\theta = 135^\circ$`, r`$\theta = 170^\circ$`, r`$D = 1$`],
        align: ['left', 'right', 'right', 'right', 'right'],
        rows: ABERRATION_ROWS,
      },
      {
        type: 'paragraph',
        text: L(
          r`$\beta = 0{,}99$’da cadde çerçevesinde gözlemcinin önünde kalan her şey — ön yarıkürenin tamamı — hareket yönünün $8{,}1^\circ$ yakınında görülür; arka yarıkürenin büyük bölümü de öne gelmiştir. Aralığın üst ucunda ön yarıküre $0{,}26^\circ$ yarıçaplı bir diske, yani dolunayın görünür büyüklüğüne sığar.`,
          r`At $\beta = 0.99$ everything that lies ahead of the observer in the street frame — the whole forward hemisphere — is seen within $8.1^\circ$ of the direction of motion, and most of the rear hemisphere has come into view in front. At the top of the range the forward hemisphere fits into a disc of radius $0.26^\circ$, the apparent size of the full Moon.`
        ),
      },
      {
        type: 'figure',
        figure: 'aberration',
        caption: L(
          r`Geçerli hızda ışık sapıncı. Dış çentikler: cadde çerçevesindeki yönler. İç noktalar: aynı ışığın gözlemciye göründüğü yönler; renk Doppler çarpanını gösterir (mavi: $D > 1$, kırmızı: $D < 1$). Kesikli çizgiler nötr koniyi işaretler.`,
          r`Aberration at the current speed. Outer ticks: directions in the street frame. Inner points: the directions in which the same light is seen by the observer, coloured by its Doppler factor (blue: $D > 1$, red: $D < 1$). The dashed lines mark the neutral cone.`
        ),
      },
      { type: 'heading', text: L('Doppler çarpanı ve nötr koni', 'The Doppler factor and the neutral cone') },
      {
        type: 'paragraph',
        text: L(
          r`Aynı itme ışığın frekansını da değiştirir. Doppler çarpanı $D = \nu'/\nu$ olmak üzere`,
          r`The same boost changes the frequency of the light. With the Doppler factor $D = \nu'/\nu$,`
        ),
      },
      {
        type: 'equation',
        number: '3.3',
        tex: r`D = \gamma\,(1 + \beta\cos\theta) = \frac{1}{\gamma\,(1 - \beta\cos\theta')}`,
      },
      {
        type: 'paragraph',
        text: L(
          r`Önden gelen ışık maviye, en çok $D_0$ çarpanı kadar kayar; arkadan gelen ışık kırmızıya, $D = 1/D_0$ değerine kadar kayar. İki bölgeyi, üzerinde $D = 1$ olan nötr koni ayırır:`,
          r`Light from ahead is blueshifted, by a factor of up to $D_0$; light from behind is redshifted, down to $D = 1/D_0$. The two regions are separated by the neutral cone on which $D = 1$:`
        ),
      },
      {
        type: 'equation',
        number: '3.4',
        tex: r`\tan\frac{\theta'_{1}}{2} = e^{-\varphi/2}\qquad\Longleftrightarrow\qquad \cos\theta'_{1} = \sqrt{\frac{\gamma - 1}{\gamma + 1}}`,
      },
      {
        type: 'paragraph',
        text: L(
          r`Bu koni küçük hızlarda $90^\circ$’dedir ve büyük hızlarda yarı açısı $\sqrt{2/\gamma}$ değerine yaklaşarak kapanır. Nötr koni caddenin yan düzlemi değildir: koni üzerindeki ışık cadde çerçevesinde $\theta = 180^\circ - \theta'_1$ yönünden, yani arkadan gelir. Tam yandan ($\theta = 90^\circ$) gelen ışık $\cos\theta' = \beta$ açısında görülür ve $D = \gamma$ kadar maviye kaymış durumdadır; gözlemcinin tam yanında gördüğü ($\theta' = 90^\circ$) ışık ise $D = 1/\gamma$ kadar kırmızıya kaymıştır (enine Doppler etkisi). Son olarak, dönüşüm yerel ölçeği $1/D$ olan açıkorur bir dönüşüm olduğundan küçük bir katı açı`,
          r`It lies at $90^\circ$ for small speeds and closes for large ones, its half-angle approaching $\sqrt{2/\gamma}$. The neutral cone is not the transverse plane of the street: light on it comes from the street-frame direction $\theta = 180^\circ - \theta'_1$, from behind. Light from exactly abeam ($\theta = 90^\circ$) is seen at $\cos\theta' = \beta$ and is already blueshifted by $D = \gamma$; light that the observer sees exactly abeam ($\theta' = 90^\circ$) is redshifted by $D = 1/\gamma$, the transverse Doppler effect. Finally, because the map is conformal with local scale $1/D$, a small solid angle transforms as`
        ),
      },
      { type: 'equation', number: '3.5', tex: r`d\Omega' = \frac{d\Omega}{D^{2}}` },
      {
        type: 'paragraph',
        text: L(
          r`biçiminde dönüşür: maviye kayan bölgeler küçülür, kırmızıya kayan bölgeler büyür. Simülasyonun kılavuz katmanı nötr koniyi ve yan düzlemin görüldüğü çemberi çizer.`,
          r`Blueshifted regions shrink, redshifted regions are magnified. The guide layer of the simulation draws the neutral cone and the circle on which the transverse plane is seen.`
        ),
      },
      { type: 'heading', text: L('Büzülmüş değil, dönmüş', 'Rotated, not contracted') },
      {
        type: 'paragraph',
        text: L(
          r`Hızla hareket eden bir cismin hareket doğrultusunda yassılaşmış görüneceği uzun süre varsayıldı; Gamow’un Bay Tompkins’i, ışık hızının çok düşük olduğu bir kentte bir bisikletliyi karton bir figür kadar ince görür [@gamow1939]. Lampa hareketli bir çubuğun görünümünü 1924’te incelemişti [@lampa1924], ancak genel sonuç 1959’da ortaya kondu. Penrose hareketli bir kürenin her zaman dairesel bir dış çizgi gösterdiğini [@penrose1959], Terrell ise küçük bir katı açı kaplayan bir cismin büzülmüş değil dönmüş göründüğünü gösterdi [@terrell1959]. Hareketine dik doğrultuda görülen bir cisim için görünen dönme açısı $\alpha$`,
          r`It was long assumed that a fast-moving object would look flattened along its motion; Gamow’s Mr Tompkins, in a city where the speed of light is very low, sees a cyclist as thin as a cardboard figure [@gamow1939]. Lampa had analysed the appearance of a moving rod as early as 1924 [@lampa1924], but the general result was stated only in 1959. Penrose showed that a moving sphere always presents a circular outline [@penrose1959], and Terrell that an object subtending a small solid angle appears not contracted but rotated [@terrell1959]. For an object seen at right angles to its motion the apparent rotation $\alpha$ satisfies`
        ),
      },
      { type: 'equation', number: '3.6', tex: r`\sin\alpha = \beta` },
      {
        type: 'paragraph',
        text: L(
          r`bağıntısını sağlar; Weisskopf bunu bir küp için açıkça yazmıştır [@weisskopf1960]. Her iki sonuç da (3.2) denkleminin açıkorurluğundan çıkar. Terrell dönmesi yalnızca açısal boyutu küçük cisimler için geçerlidir; kürenin dairesel dış çizgisi ise her açısal boyutta korunur, çünkü dönüşüm çemberleri çemberlere götürür. Küre dışındaki büyük ya da yakın cisimler ise biçim değiştirir: doğrular eğri, harekete dik düzlemler hiperboloit olarak görünür [@boas1961; @scottviner1965; @scottvandriel1970; @mullerboblest2014]. Boas bu sonucu kullanarak Gamow’un bisikletlisini yeniden çizmiştir. 2025’te etki, pikosaniyelik lazer atımları ve kapılı bir kamerayla düşük bir ışık hızı taklit edilerek laboratuvarda görünür kılındı [@hornof2025].`,
          r`as Weisskopf spelled out for a cube [@weisskopf1960]. Both results follow from the conformality of Eq. (3.2). Terrell’s rotation holds only for objects of small angular size; the circular outline of a sphere holds at any angular size, because the map takes circles to circles. Other objects that are large or near are distorted: straight lines appear curved, and planes perpendicular to the motion appear as hyperboloids [@boas1961; @scottviner1965; @scottvandriel1970; @mullerboblest2014]. Boas used this to redraw Gamow’s cyclist. In 2025 the effect was made visible in the laboratory by emulating a slow speed of light with picosecond laser pulses and a gated camera [@hornof2025].`
        ),
      },
      {
        type: 'paragraph',
        text: L(
          r`İçinden bakılan bir cadde baştan sona büyük cisim durumudur: birkaç metre ötedeki cepheler geniş bir katı açıyı doldurur. Simülasyon bu yüzden katı bir dönme değil, eğrilen doğrular ve öne yığılan bir dünya gösterir.`,
          r`A street seen from within is the large-object case throughout: facades a few metres away fill a wide solid angle. The simulation therefore shows curving lines and a world crowding forward rather than a rigid rotation.`
        ),
      },
      { type: 'heading', text: L('İki görünüm', 'Two views') },
      {
        type: 'paragraph',
        text: L(
          r`Simülasyon her iki resmi de sunar. _Görülen_, yukarıda anlatılan görüntüdür: ışık sapıncı, Doppler kayması ve 4. bölümde anlatılan ışınım parlaklığının dönüşümü. _Ölçülen_ ise caddeyi, gözlemcinin koordinatlarının S′ zamanının tek bir anında betimlediği gibi gösterir: hareket doğrultusundaki her uzunluk $\gamma$’ya bölünmüştür, renk kayması yoktur; büzülme okunabilsin diye zemine aralığı durgun hâlde 10 m olan bir ızgara çizilir. İlki bir gözün ya da kameranın kaydettiği, ikincisi bir yer ölçümünün vereceği şeydir. İkisini aynı hızda karşılaştırmak, görüntünün ölçüme ne kadar az benzediğini gösterir.`,
          r`The simulation offers both pictures. _Seen_ is the image described above: aberration, Doppler shift and the transformation of radiance described in Section 4. _Measured_ shows the street as the observer’s coordinates describe it at one instant of S′ time: every length along the motion is divided by $\gamma$, nothing is shifted in colour, and a grid with a rest spacing of 10 m is drawn on the ground to make the contraction readable. The first is what an eye or a camera records; the second is what a survey would yield. Comparing the two at the same speed shows how little the image resembles the measurement.`
        ),
      },
      { type: 'try', label: L('γ = 2, görülen', 'γ = 2, seen'), scenario: { beta: Math.sqrt(3) / 2 } },
      {
        type: 'try',
        label: L('γ = 2, ölçülen', 'γ = 2, measured'),
        scenario: { beta: Math.sqrt(3) / 2, view: 'measured' },
      },
      { type: 'try', label: L('0,6 c’de yana bak', 'Look sideways at 0.6 c'), scenario: { beta: 0.6, look: 'left' } },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 4
  {
    id: 'radiometry',
    number: '4',
    title: L('Parlaklık ve renk', 'Brightness and colour'),
    summary: L(
      'Işınım parlaklığının dönüşümü, görünür kazancın neden D⁴ olmadığı, Doppler gökkuşağının gerçekte nerede oluştuğu ve ortamın ne zaman ışımaya başladığı.',
      'How radiance transforms, why the visible gain is not D⁴, where a Doppler rainbow really occurs, and when the surroundings begin to glow.'
    ),
    blocks: [
      {
        type: 'paragraph',
        text: L(
          r`Faz uzayının bir hücresindeki foton sayısı bütün gözlemciler için aynıdır. Bu tek olgudan, özgül şiddetin $I_\nu$ (birim frekans başına ışınım parlaklığı, radyans) $\nu^3$’e bölümünün Lorentz değişmezi olduğu çıkar [@rybickilightman1979; @mtw1973]:`,
          r`The number of photons in a cell of phase space is the same for all observers. From this single fact it follows that the specific intensity $I_\nu$ (radiance per unit frequency) divided by $\nu^3$ is a Lorentz invariant [@rybickilightman1979; @mtw1973],`
        ),
      },
      {
        type: 'equation',
        number: '4.1',
        tex: r`\frac{I'_{\nu'}(\nu')}{\nu'^{3}} = \frac{I_{\nu}(\nu)}{\nu^{3}},\qquad \nu' = D\,\nu`,
      },
      {
        type: 'table',
        caption: L(
          r`Görüntüleyicinin kullandığı dönüşüm yasaları; hepsi (4.1) ve (3.5) denklemlerinin sonucudur.`,
          r`The transformation laws used by the renderer; all are consequences of Eqs. (4.1) and (3.5).`
        ),
        head: [L('Nicelik', 'Quantity'), L('Yasa', 'Law')],
        align: ['left', 'left'],
        rows: [
          [
            L('Birim frekans başına ışınım parlaklığı', 'Radiance per unit frequency'),
            r`$I'_{\nu'}(\nu') = D^{3}\, I_{\nu}(\nu'/D)$`,
          ],
          [
            L('Birim dalga boyu başına ışınım parlaklığı', 'Radiance per unit wavelength'),
            r`$I'_{\lambda'}(\lambda') = D^{5}\, I_{\lambda}(D\lambda')$`,
          ],
          [L('Tayf üzerinden toplam ışınım parlaklığı', 'Radiance integrated over the spectrum'), r`$I' = D^{4}\, I$`],
          [L('Çözülmemiş (noktasal) kaynağın toplam akısı', 'Integrated flux of an unresolved source'), r`$F' = D^{2}\, F$`],
          [L('Kara cismin sıcaklığı', 'Temperature of a black body'), r`$T' = D\,T$`],
        ],
      },
      {
        type: 'paragraph',
        text: L(
          r`Birim dalga boyu başına beşinci kuvvet, bilgisayar grafiği için Weiskopf, Kraus ve Ruder tarafından ortaya konmuştur [@weiskopf1999]; Kraus bunu hızla hareket eden büyük bir kürenin parlaklığına ve rengine uygulamıştır [@kraus2000]. Çözülmemiş kaynaklarda katı açının rolünü McKinley ile Johnson ve Teller ele alır [@mckinley1979; @mckinley1980; @johnsonteller1982]. Çizelge 3’ün son satırı, Planck fonksiyonu $B_\lambda$ için $D^5 B_\lambda(D\lambda', T) = B_\lambda(\lambda', DT)$ olmasından çıkar: Doppler çarpanı $D$ ile görülen bir kara cisim, $DT$ sıcaklığındaki bir kara cisimden ayırt edilemez. Düzgün hareket eden bir kovuktaki kara cisim ışımasını özel görelilik çerçevesinde ilk kez von Mosengeil (1907) incelemiştir [@mosengeil1907]; yöne bağlı $DT$ sıcaklığı 1968’de kozmik mikrodalga arka planı içinde hareket eden bir gözlemciye uygulanmıştır [@peebleswilkinson1968; @heerkohl1968; @bracewellconklin1968].`,
          r`The fifth power per unit wavelength was established for computer graphics by Weiskopf, Kraus and Ruder [@weiskopf1999]; Kraus applied it to the brightness and colour of a large, fast-moving sphere [@kraus2000]. The role of the solid angle for unresolved sources is treated by McKinley and by Johnson and Teller [@mckinley1979; @mckinley1980; @johnsonteller1982]. The last row of Table 3 follows because $D^5 B_\lambda(D\lambda', T) = B_\lambda(\lambda', DT)$ for the Planck function $B_\lambda$: a black body seen at Doppler factor $D$ cannot be told from a black body at temperature $DT$. Black-body radiation in a uniformly moving cavity was first treated within special relativity by von Mosengeil (1907) [@mosengeil1907]; in 1968 the direction-dependent temperature $DT$ was applied to an observer moving through the cosmic microwave background [@peebleswilkinson1968; @heerkohl1968; @bracewellconklin1968].`
        ),
      },
      { type: 'heading', text: L('Gözün kaydettiği', 'What an eye registers') },
      {
        type: 'paragraph',
        text: L(
          r`Bir göz ya da kamera tayfın tamamı üzerinden toplama yapmaz. Tayfsal ışınım parlaklığını kendi duyarlığıyla ağırlıklandırır; burada bu duyarlık, CIE 1931 standart gözlemcisinin duyarlığıdır [@cie2018]. Bu gözlemcinin ışık verimi fonksiyonu $V(\lambda)$, bu çalışmada 380–780 nm aralığında çizelgelenmiştir. Planck tayflı bir kaynak için, $D$ Doppler çarpanıyla görülen parıltı (luminans) bu nedenle $DT$ sıcaklığındaki bir kara cisminkidir ve görünür kazanç`,
          r`An eye or a camera does not integrate over the whole spectrum. It weights the spectral radiance with its own sensitivity, here that of the CIE 1931 standard observer [@cie2018], whose luminous efficiency function $V(\lambda)$ is tabulated in this work from 380 to 780 nm. For a source with a Planck spectrum the luminance seen at Doppler factor $D$ is therefore that of a black body at $DT$, and the visible gain is`
        ),
      },
      {
        type: 'equation',
        number: '4.2',
        tex: r`G_T(D) = \frac{L_{\mathrm v}(DT)}{L_{\mathrm v}(T)},\qquad L_{\mathrm v}(T) = K_{\mathrm{cd}} \int V(\lambda)\, B_\lambda(\lambda, T)\, d\lambda`,
      },
      {
        type: 'paragraph',
        text: L(
          r`olur; burada $K_{\mathrm{cd}} = 683\ \mathrm{lm\,W^{-1}}$’dir. Bu, $D^4$ değildir. 4100 K’lik bir Planck tayfı olarak modellenen ay ışığı için (Şekil 5) kazanç $D = 2$’de $G = 24$, $D = 3{,}73$’te 126 ($D^4 = 194$’ten küçük), $D = 447$’de ise yaklaşık $4{,}0 \times 10^{4}$’tür; bu, $D^4$’ün milyonda biridir. $D = 2$’deki değer $D^4 = 16$’dan büyüktür: kaymış tayf 8200 K’lik bir kara cismin tayfıdır ve kara cisim ışımasının ışık verimi, yani birim güç başına ışık akısı, 6600 K dolayında en büyüktür ve 8200 K’de 4100 K’dekinin 1,5 katıdır. Büyük $D$’de görünür bant, itilmiş tayfın Rayleigh–Jeans kuyruğunu örnekler ve kazanç yalnızca $D$ ile orantılı büyür. Kırmızı tarafta ise kazanç $D^4$’ten çok daha hızlı çöker ($D = 0{,}5$’te $2{,}1 \times 10^{-3}$), çünkü görünür bant Wien kuyruğundan aşağı kayar. Şekil 3, geçerli hızda durgun çerçeve tayflarının hangi bölümünün görünür banda düştüğünü gösterir.`,
          r`with $K_{\mathrm{cd}} = 683\ \mathrm{lm\,W^{-1}}$. This is not $D^4$. For moonlight, modelled as a Planck spectrum of 4100 K (Figure 5), the gain is $G = 24$ at $D = 2$, 126 at $D = 3.73$ (less than $D^4 = 194$), and about $4.0 \times 10^{4}$ at $D = 447$, a millionth of $D^4$. The value at $D = 2$ exceeds $D^4 = 16$: the shifted spectrum is that of a black body at 8200 K, and the luminous efficacy of black-body radiation, the luminous flux per unit power, is greatest near 6600 K and is 1.5 times higher at 8200 K than at 4100 K. At large $D$ the visible band samples the Rayleigh–Jeans tail of the boosted spectrum and the gain grows only in proportion to $D$. On the red side the gain collapses much faster than $D^4$ (to $2.1 \times 10^{-3}$ at $D = 0.5$), as the visible band slides down the Wien tail. Figure 3 shows which part of the rest-frame spectra falls into the visible band at the current speed.`
        ),
      },
      {
        type: 'figure',
        figure: 'spectra',
        caption: L(
          r`Sahnedeki beş ışık kaynağından dördünün durgun çerçevedeki tayfları (trafik ışıklarının dar çizgileri çizilmemiştir); her biri kendi tepe değerine göre normalleştirilmiştir. Taralı bant durgun hâldeki görünür aralıktır. Çerçeveli iki bant, geçerli hızda durgun çerçeve tayfının hangi bölümünün göze görünür ışık olarak ulaştığını gösterir: önden (mavi çerçeve, daha uzun dalga boyları) ve arkadan (kırmızı çerçeve, daha kısa dalga boyları).`,
          r`Rest-frame spectra of four of the five light sources of the scene (the narrow lines of the traffic signals are not drawn), each normalised to its peak. The shaded band is the visible range at rest. The two outlined bands show which part of the rest-frame spectrum reaches the eye as visible light at the current speed: from ahead (blue outline, longer wavelengths) and from behind (red outline, shorter wavelengths).`
        ),
      },
      { type: 'heading', text: L('Doppler gökkuşağı gerçekte nerede oluşur', 'Where a Doppler rainbow really occurs') },
      {
        type: 'paragraph',
        text: L(
          r`1958’de Sänger, relativistik bir uzay gemisinin mürettebatının yıldızları uçuş yönü çevresinde gökkuşağı renkli halkalar hâlinde göreceğini öngördü [@sanger1958]; bu görüntü sonradan “yıldız kuşağı” (_starbow_) adıyla tanındı. Öngörü her yıldızı tek renkli bir kaynak sayar. McKinley ve Doherty hesabı kara cisim tayfları, şiddet dönüşümü ve gözün tepkisiyle yinelediler ve yıldız kuşağının ortaya çıkmadığı sonucuna vardılar [@mckinleydoherty1979]. Nedeni Çizelge 3’ün son satırıdır: kaymış bir kara cisim yine bir kara cisimdir. Rengi yalnızca Planck eğrisi boyunca ilerleyebilir — kırmızı, turuncu, beyaz, mavi-beyaz — ve hiçbir zaman yeşilden ya da mordan geçmez [@kraus2000]. Bu simülasyonun yıldızları buna göre davranır (Şekil 4, en üst satır). Noktasal kaynak olduklarından parlaklıkları $G_T(D)/D^2$’yi izler: Güneş benzeri bir yıldız en çok 2,9 kat parlar ($D = 2{,}9$’da), sonra söner; soğuk yıldızlar daha çok parlar, sıcak yıldızlar ise baştan itibaren söner.`,
          r`In 1958 Sänger predicted that the crew of a relativistic spaceship would see the stars arranged in rainbow-coloured rings around the direction of flight [@sanger1958]; the image became known as the _starbow_. The prediction treats every star as a source of a single colour. McKinley and Doherty repeated the calculation with black-body spectra, the transformation of intensity and the response of the eye, and concluded that no starbow appears [@mckinleydoherty1979]. The reason is the last row of Table 3: a shifted black body is a black body. Its colour can only move along the Planckian locus — red, orange, white, blue-white — and never passes through green or violet [@kraus2000]. The stars of this simulation behave accordingly (Figure 4, top row). As point sources their brightness follows $G_T(D)/D^2$: a star like the Sun brightens by at most a factor of 2.9 (at $D = 2.9$) and then fades; cool stars brighten more, and hot stars fade from the start.`
        ),
      },
      {
        type: 'paragraph',
        text: L(
          r`Gökkuşağı, tayfı bir banda sıkışmış kaynaklarda gerçekten oluşur, çünkü böyle bir ışık görünür aralığı tümüyle terk edebilir. Sahnenin sokak aydınlatması bu türdendir: fosfor dönüşümlü beyaz bir LED yaklaşık 420–780 nm arasında ışır, dışında ışımaz (Şekil 3). Bu ışıkla aydınlanan bir yüzey yalnızca $0{,}69 < D < 1{,}6$ için görünür (bu pencerenin dışında parıltısı durgun değerin %1’inin altındadır); pencere içinde renk kırmızıdan turuncuya, sarı-yeşile, kehribara, soluk pembeye ve beyaza ($D = 1$), oradan yeşile, camgöbeğine, maviye ve mora doğru ilerler (Şekil 4). Kırmızı taraftaki sıra tekdüze değildir: fosfor bandı kırmızıya ve kızılötesine kayarken 450 nm’lik pompa çizgisi yeşilden ve sarıdan geçer. Pencere, nötr koninin çevresinde bir halkadır: $\beta = 0{,}99$’da hareket yönünden $23^\circ$ ile $36^\circ$ arasında, $\beta = 0{,}99999$’da $4{,}3^\circ$ ile $6{,}5^\circ$ arasında. Halkanın içinde LED ışığı morötesine, dışında kızılötesine gitmiştir. Tek renkli cisimlerin sıfır kayma açısı yakınında böyle bir gökkuşağı gösterdiğine Savage ve arkadaşları dikkat çekmiştir [@savage2007]. Aynı şey bir trafik ışığının neredeyse tek renkli LED’leri için de geçerlidir: $\beta = 0{,}2$’de tam karşıdan görülen kırmızı ışık (626 nm) göze 511 nm olarak ulaşır ve yeşil görünür.`,
          r`A rainbow does occur for sources whose spectrum is confined to a band, because such light can leave the visible range altogether. The street lighting of the scene is of this kind: a phosphor-converted white LED emits between about 420 and 780 nm and nothing outside (Figure 3). A surface lit by it is visible only for $0.69 < D < 1.6$ (outside this window its luminance is below 1 % of its value at rest); within the window the colour runs from red through orange, yellow-green, amber and a pale pink to white (at $D = 1$) and on through green and cyan to blue and violet (Figure 4). The sequence on the red side is not monotonic: while the phosphor band moves into the red and the infrared, the 450 nm pump line passes through green and yellow. The window is a ring around the neutral cone: between $23^\circ$ and $36^\circ$ from the direction of motion at $\beta = 0.99$, between $4.3^\circ$ and $6.5^\circ$ at $\beta = 0.99999$. Inside the ring the LED light has gone to the ultraviolet, outside it to the infrared. That single-coloured objects show such a rainbow near the angle of zero shift was noted by Savage and co-workers [@savage2007]. The same holds for the nearly monochromatic LEDs of a traffic signal: a red signal (626 nm) seen head-on at $\beta = 0.2$ arrives at 511 nm and looks green.`
        ),
      },
      {
        type: 'figure',
        figure: 'colourTracks',
        caption: L(
          r`Beş kaynağın rengi ve bağıl parlaklığı, Doppler çarpanının fonksiyonu olarak; görüntüyle aynı işlem hattıyla hesaplanmıştır. Isıl kaynaklar (üstteki iki satır ve en alttaki) Planck eğrisi boyunca kayar; bant sınırlı kaynaklar (LED aydınlatma, trafik ışığı) tayfı boydan boya geçer ve kaybolur.`,
          r`Colour and relative brightness of five sources as a function of the Doppler factor, computed with the same pipeline as the image. Thermal sources (the top two rows and the bottom one) slide along the Planckian locus; band-limited sources (LED lighting, signal) run through the spectrum and vanish.`
        ),
      },
      { type: 'heading', text: L('Ortam ışımaya başlar', 'The surroundings begin to glow') },
      {
        type: 'paragraph',
        text: L(
          r`Ortam sıcaklığındaki her şey ısıl ışıma yapar; tayfın tepesi 10 µm dolayındadır. Yeterince büyük bir maviye kayma bu ışımayı görünür banda taşır: $D$ Doppler çarpanıyla görülen 288 K’lik bir yüzey, $288\,D$ kelvinlik bir gri cisim gibi görünür. Parıltısı, sokak ışığıyla aydınlanan beyaz bir yüzeyinkine $D = 3{,}6$’da (1040 K) ulaşır (Şekil 5); bu değere tam karşıda $\beta = 0{,}86$’da, yani $\gamma = 2$’nin hemen altında varılır. $D_0 > 20$, yani $\beta > 0{,}995$ için Güneş fotosferinin (5772 K [@prsa2016]) parıltısını aşar. Aralığın üst ucunda tam karşıdaki ortam $1{,}3 \times 10^{5}$ K’lik bir kara cisim olarak görünür. Dolayısıyla yaklaşık $\gamma = 2$’den sonra ileri görünüme egemen olan, yansıyan ışık değil, kentin kendi ısıl ışımasıdır. Ölçer paneli görünen sıcaklığı gösterir; yalnızca yansıyan ışığı görmek için bu katman kapatılabilir.`,
          r`Everything at ambient temperature radiates thermally, with a spectrum that peaks near 10 µm. A large enough blueshift brings this radiation into the visible band: a surface at 288 K seen at Doppler factor $D$ looks like a grey body at $288\,D$ kelvin. Its luminance reaches that of a street-lit white surface at $D = 3.6$ (1040 K; Figure 5), which is attained dead ahead at $\beta = 0.86$, just below $\gamma = 2$. For $D_0 > 20$, that is for $\beta > 0.995$, it exceeds the luminance of the solar photosphere (5772 K [@prsa2016]). At the top of the range the surroundings dead ahead appear as a black body at $1.3 \times 10^{5}$ K. From about $\gamma = 2$ onwards the view ahead is therefore dominated not by reflected light but by the thermal emission of the city itself. The instrument panel shows the apparent temperature, and the layer can be switched off to see the reflected light alone.`
        ),
      },
      {
        type: 'paragraph',
        text: L(
          r`Kozmik mikrodalga arka planı da aynı dönüşüme uğrar. $\beta = 0{,}99999$’da 2,725 K’lik sıcaklığı [@fixsen2009] tam karşıda 1219 K olur: yaklaşık 190 cd m⁻² parıltılı, donuk kırmızı bir ışıma. Önündeki caddeden dokuz büyüklük mertebesinden fazla sönük olduğundan gösterilmez.`,
          r`The cosmic microwave background undergoes the same transformation. At $\beta = 0.99999$ its temperature of 2.725 K [@fixsen2009] becomes 1219 K dead ahead, a dull red glow of about 190 cd m⁻². It is more than nine orders of magnitude fainter than the street in front of it and is therefore not shown.`
        ),
      },
      {
        type: 'figure',
        figure: 'gain',
        caption: L(
          r`Beyaz bir yüzeyin parıltısı, Doppler çarpanına karşı; durgun hâlde sokak ışığı altındaki aynı yüzeye göre bağıl: ay ışığıyla ve LED’lerle aydınlanmış hâli ile kendi ısıl ışıması. Kesikli çizgi bolometrik $D^4$ yasasıdır. Dikey işaretler, geçerli hızda tam karşıdan ve tam arkadan gelen ışığın Doppler çarpanlarıdır.`,
          r`Luminance of a white surface against the Doppler factor, relative to the same surface under the street lighting at rest: lit by the Moon, lit by the LEDs, and its own thermal emission. The dashed line is the bolometric law $D^4$. The vertical marks are the Doppler factors of light from dead ahead and from directly behind at the current speed.`
        ),
      },
      { type: 'try', label: L('Kırmızı ışık yeşile döner (0,2 c)', 'A red signal turns green (0.2 c)'), scenario: { beta: 0.2 } },
      {
        type: 'try',
        label: L('Isıl ışımanın başlangıcı (γ = 2)', 'Onset of the thermal glow (γ = 2)'),
        scenario: { beta: Math.sqrt(3) / 2 },
      },
      {
        type: 'try',
        label: L('Isıl ışıma kapalıyken Doppler halkası (0,99 c)', 'The Doppler ring without thermal emission (0.99 c)'),
        scenario: { beta: 0.99, thermal: false },
      },
    ],
  },
];
