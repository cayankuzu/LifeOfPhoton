/**
 * Dossier front matter: title, abstract, keywords and the glossary of symbols.
 */

import { L, type DossierSource } from '../types';
import { r } from './helpers';

export const FRONT: Pick<DossierSource, 'title' | 'subtitle' | 'abstract' | 'keywords' | 'glossary'> = {
  title: 'Life of a Photon',
  subtitle: L(
    'Durgun hâlden 0,99999 c’ye: rengi tayfsal olarak hesaplanan, birinci şahıs özel görelilik simülasyonu',
    'From rest to 0.99999 c: a first-person simulation of special relativity with spectrally computed colour'
  ),
  abstract: [
    L(
      r`Einstein on altı yaşında, bir ışık demetinin peşinden gidildiğinde ne görüleceğini sormuştu. Bu çalışma soruyu fiziğin izin verdiği yere kadar yanıtlar: kütleli bir gözlemcinin, bir kent caddesinde durgun hâl ile $\beta = 0{,}99999$ ($\gamma = 223{,}6$) arasındaki herhangi bir sabit hızla ilerlerken gördüğünü, birinci şahıs bakışıyla ve gerçek zamanlı olarak gösterir.`,
      r`At sixteen, Einstein asked what one would see when pursuing a beam of light. This work answers the question as far as physics allows: it shows, in the first person and in real time, what an observer with mass sees while travelling along a city avenue at any constant speed between rest and $\beta = 0.99999$ ($\gamma = 223.6$).`
    ),
    L(
      r`Sahne durgun çerçevesinde tutulur. Geometri, relativistik ışık sapıncının kesin yasasıyla dönüştürülür; parlaklık ve renk, $I_\nu/\nu^3$’ün Lorentz değişmezliğinden elde edilir ve her tayf, RGB kanallarını kaydırma yaklaşıklığı yerine CIE 1931 standart gözlemcisinin renk eşleme fonksiyonlarıyla tümlenir. Yıldızların yanı sıra sahnede beş ışık kaynağı vardır: LED sokak aydınlatması, ay ışığı, aydınlık pencereler, trafik ışıkları ve ortamın ısıl ışıması. Bunlar, Doppler kaymasına farklı tepki veren dört tayf türüne ayrılır: bant sınırlı (LED’ler), geniş bantlı (ay ve pencere ışığı), neredeyse tek renkli (trafik ışıkları) ve kızılötesi ısıl ışıma (ortam).`,
      r`The scene is kept in its rest frame. Geometry is transformed by the exact law of relativistic aberration; brightness and colour follow from the Lorentz invariance of $I_\nu/\nu^3$, with every spectrum integrated with the colour-matching functions of the CIE 1931 standard observer rather than approximated by shifting RGB channels. Besides the stars, the scene has five light sources: LED street lighting, moonlight, lit windows, traffic signals and the thermal emission of the surroundings. They fall into four spectral kinds that respond differently to a Doppler shift: band-limited (the LEDs), broadband (moonlight and window light), nearly monochromatic (the signals) and thermal infrared (the surroundings).`
    ),
    L(
      r`Buradan üç bulgu çıkar. Isıl ışığın görünür parlaklığı $D^4$ ile değil, $DT$ sıcaklığındaki bir kara cismin parıltısı gibi değişir. Doppler gökkuşağı bant sınırlı ışık için gerçektir ve nötr koni ($D = 1$) çevresinde bir halka oluşturur; yıldızlar için ise yoktur. Yaklaşık $\gamma = 2$’den sonra ileri görünüme ortamın ısıl ışıması egemen olur; $\beta > 0{,}995$ için ortam Güneş yüzeyinden daha parlaktır. Uygulama kapalı biçimli sonuçlarla, kolorimetri ve fotometri standartlarıyla ve bağımsız bir yeniden türetmeyle karşılaştırılarak doğrulanmıştır; varsayımları ve sınırları açıkça belirtilmiştir.`,
      r`Three findings follow. The visible brightness of thermal light does not grow as $D^4$ but as the luminance of a black body at $DT$. A Doppler rainbow is real for band-limited light, where it forms a ring around the neutral cone $D = 1$, and absent for stars. And from about $\gamma = 2$ the view ahead is dominated by the thermal emission of the surroundings, which for $\beta > 0.995$ outshine the surface of the Sun. The implementation is verified against closed-form results, against colorimetric and photometric standards and against an independent re-derivation; its assumptions and limits are stated.`
    ),
  ],
  keywords: [
    L('özel görelilik', 'special relativity'),
    L('relativistik ışık sapıncı', 'relativistic aberration'),
    L('Doppler etkisi', 'Doppler effect'),
    L('Terrell dönmesi', 'Terrell rotation'),
    L('ışınım parlaklığının dönüşümü', 'transformation of radiance'),
    L('kolorimetri', 'colorimetry'),
    L('gerçek zamanlı görüntüleme', 'real-time rendering'),
  ],
  glossary: [
    {
      symbol: r`$c$`,
      term: L('Işık hızı', 'Speed of light'),
      definition: L(
        r`299 792 458 m s⁻¹; metrenin tanımı gereği kesindir [@bipm2019].`,
        r`299 792 458 m s⁻¹, exact by the definition of the metre [@bipm2019].`
      ),
    },
    {
      symbol: 'S, S′',
      term: L('Çerçeveler', 'Frames'),
      definition: L(
        r`S: caddenin durgun olduğu çerçeve. S′: gözlemcinin durgun olduğu çerçeve.`,
        r`S: the rest frame of the street. S′: the rest frame of the observer.`
      ),
    },
    {
      symbol: r`$\beta$`,
      term: L('Hız', 'Velocity'),
      definition: L(r`$v/c$; simülasyonda $0 \le \beta \le 0{,}99999$.`, r`$v/c$; in the simulation $0 \le \beta \le 0.99999$.`),
    },
    {
      symbol: r`$\gamma$`,
      term: L('Lorentz çarpanı', 'Lorentz factor'),
      definition: r`$1/\sqrt{1-\beta^2}$.`,
    },
    {
      symbol: r`$\varphi$`,
      term: L('Hızlılık', 'Rapidity'),
      definition: L(
        r`$\operatorname{artanh}\beta$; aynı doğrultudaki itmelerde toplanır.`,
        r`$\operatorname{artanh}\beta$; additive under boosts along one line.`
      ),
    },
    {
      symbol: r`$\tau$`,
      term: L('Öz zaman', 'Proper time'),
      definition: L(
        r`Gözlemcinin taşıdığı saatin gösterdiği zaman; $d\tau = dt/\gamma$.`,
        r`The time shown by a clock carried by the observer; $d\tau = dt/\gamma$.`
      ),
    },
    {
      symbol: r`$\theta,\ \theta'$`,
      term: L('Hareket yönüyle yapılan açı', 'Angle from the direction of motion'),
      definition: L(
        r`S ve S′ çerçevelerinde; $\theta'$ bir kaynağın görüldüğü açıdır.`,
        r`In S and in S′; $\theta'$ is where a source is seen.`
      ),
    },
    {
      symbol: r`$D$`,
      term: L('Doppler çarpanı', 'Doppler factor'),
      definition: L(r`$\nu'/\nu$; maviye kaymada birden büyüktür.`, r`$\nu'/\nu$; greater than one for a blueshift.`),
    },
    {
      symbol: r`$D_0$`,
      term: L('İleri Doppler çarpanı', 'Head-on Doppler factor'),
      definition: L(r`$e^{\varphi}$; tam karşıdan gelen ışık için.`, r`$e^{\varphi}$, for light arriving from dead ahead.`),
    },
    {
      symbol: r`$\theta'_1$`,
      term: L('Nötr koni', 'Neutral cone'),
      definition: L(
        r`Üzerinde $D = 1$ olan koni, (3.4) denklemi; içi maviye, dışı kırmızıya kayar.`,
        r`The cone on which $D = 1$, Eq. (3.4); blueshift inside, redshift outside.`
      ),
    },
    {
      symbol: r`$I_\nu$`,
      term: L('Özgül şiddet', 'Specific intensity'),
      definition: L(
        r`Birim frekans başına ışınım parlaklığı (radyans); $I_\nu/\nu^3$ değişmezdir.`,
        r`Radiance per unit frequency; $I_\nu/\nu^3$ is invariant.`
      ),
    },
    {
      symbol: r`$L_{\mathrm v}$`,
      term: L('Parıltı (luminans)', 'Luminance'),
      definition: L(
        r`Fotopik duyarlık $V(\lambda)$ ile ağırlıklandırılmış ışınım parlaklığı; birimi cd m⁻².`,
        r`Radiance weighted with the photopic sensitivity $V(\lambda)$, in cd m⁻².`
      ),
    },
    {
      symbol: r`$G_T(D)$`,
      term: L('Görünür kazanç', 'Visible gain'),
      definition: L(
        r`Planck tayflı bir kaynağın $D$ çarpanıyla görülen parıltısının durgun hâldeki parıltısına oranı, (4.2) denklemi.`,
        r`Ratio of the luminance of a Planckian source seen at Doppler factor $D$ to its luminance at rest, Eq. (4.2).`
      ),
    },
    {
      symbol: 'EV',
      term: L('Pozlama değeri', 'Exposure value'),
      definition: L(
        r`Pozlamanın durgun hâle göre 2 tabanında logaritması; +1 EV pozlamayı iki katına çıkarır.`,
        r`Base-2 logarithm of the exposure relative to rest; +1 EV doubles the exposure.`
      ),
    },
    {
      symbol: '—',
      term: L('Işık sapıncı (aberasyon)', 'Aberration'),
      definition: L(
        r`Bir kaynağın görünen yönünün gözlemcinin hızıyla değişmesi, (3.1) denklemi.`,
        r`The change of the apparent direction of a source with the velocity of the observer, Eq. (3.1).`
      ),
    },
    {
      symbol: '—',
      term: L('Bant sınırlı kaynak', 'Band-limited source'),
      definition: L(
        r`Tayfı sonlu bir dalga boyu aralığına sıkışmış kaynak (LED); yeterince kaydığında görünür bandı tümüyle terk eder.`,
        r`A source whose spectrum is confined to a finite range of wavelengths (an LED); shifted far enough, it leaves the visible band altogether.`
      ),
    },
    {
      symbol: '—',
      term: L('Görülen / ölçülen görünüm', 'Seen / measured view'),
      definition: L(
        r`Görülen: göze aynı anda ulaşan ışığın oluşturduğu görüntü. Ölçülen: S′ zamanının tek bir anındaki koordinat geometrisi (Lorentz büzülmesi).`,
        r`Seen: the image formed by light arriving at one instant. Measured: the coordinate geometry at one instant of S′ time (Lorentz contraction).`
      ),
    },
  ],
};
