[Türkçe](#tr) · [English](#en)

# Life of a Photon

<a name="tr"></a>

## Türkçe

_Durgun hâlden 0,99999 c’ye: rengi tayfsal olarak hesaplanan, birinci şahıs özel görelilik simülasyonu_

Life of a Photon, kütleli bir gözlemcinin gece vakti bir kent caddesinde, durgun hâl ile 0,99999 c arasındaki herhangi bir sabit hızla ilerlerken gördüğünü birinci şahıs bakışıyla ve gerçek zamanlı olarak gösteren, fiziğe dayalı bir görselleştirmedir: relativistik ışık sapıncı, Doppler kayması ve ışınım parlaklığının dönüşümü (demetlenme) her kare için yeniden hesaplanır. Çıkış noktası, on altı yaşındaki Einstein’ın düşünce deneyidir: bir ışık demetinin peşinden gidilseydi ne görülürdü? Kuram, yöntem, deneysel kanıt, yazılımın doğrulanması ve modelin sınırları, uygulamanın içindeki iki dilli (Türkçe ve İngilizce) bilimsel analizde ortaya konur.

### 1. Ne gösterir

Gözlemci cadde boyunca, durgun hâlden $\beta = 0{,}99999$ ($\gamma = 223{,}6$) değerine kadar ayarlanabilen sabit bir $v = \beta c$ hızıyla ilerler. Ekran, tek bir noktaya bütün yönlerden ulaşan ışığı gözlemcinin çerçevesine dönüştürülmüş olarak gösterir; hiçbir şey dışarıdan çizilmez.

**İki görünüm.** Simülasyon aynı hızda iki ayrı resim sunar:

| Görünüm   | Ne olduğu                                                                                                                                 | İçerdiği                                                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _Görülen_ | Göze aynı anda ulaşan ışığın oluşturduğu görüntü, yani ışığın yol süresini hesaba katan resim; bir gözün ya da kameranın kaydettiği şey.  | Işık sapıncı, Doppler kayması ve ışınım parlaklığının dönüşümü (demetlenme).                                                                                                              |
| _Ölçülen_ | Gözlemcinin koordinatlarının caddeyi S′ zamanının tek bir anında betimlediği hâl (eşzamanlılık kesiti); bir yer ölçümünün vereceği sonuç. | Yalnızca Lorentz büzülmesi: hareket doğrultusundaki her uzunluk $L = L_0/\gamma$ olur, renk kayması yoktur; büzülme okunabilsin diye zemine durgun uzunluğu 10 m olan bir ızgara çizilir. |

İkisini aynı hızda karşılaştırmak, görüntünün ölçüme ne kadar az benzediğini gösterir. _Görülen_ görünüm bir yaklaşıklık değildir: durgun çerçevesinde değişmeyen bir sahnede hareketli gözlemciye ulaşan fotonlar, aynı noktada durgun bir gözlemcinin alacağı fotonların aynısıdır; yalnızca yönleri yeniden eşlenir ve tayfları dönüştürülür (Weiskopf ve ark. 2000).

**Dört tür ışık, üç bulgu.** Sahnede dört tür ışık ayırt edilir, çünkü bunlar Doppler kaymasına farklı tepki verir: bant sınırlı LED sokak aydınlatması, geniş bantlı ay ışığı, neredeyse tek renkli LED trafik ışıkları ve ortamın ısıl ışıması (aydınlık pencereler ikinci bir ısıl kaynaktır). Buradan üç bulgu çıkar:

1. Isıl ışığın görünür parlaklığı $D^4$ ile değil, $DT$ sıcaklığındaki bir kara cismin parıltısı gibi değişir.
2. Doppler gökkuşağı bant sınırlı ışık için gerçektir ve nötr koni ($D = 1$) çevresinde bir halka oluşturur; yıldızlar için ise yoktur.
3. Yaklaşık $\gamma = 2$ değerinden sonra ileri görünüme ortamın ısıl ışıması egemen olur; $\beta \gt 0{,}995$ için ortam Güneş yüzeyinden daha parlaktır.

**Ölçerler.**

- Hız şeridi: $\beta = v/c$, km/s cinsinden hız, Lorentz çarpanı $\gamma$, saat hızı $d\tau/dt$ ve ileri Doppler çarpanı $D_0$; hız denetimi ve hazır hızlar.
- Ölçer paneli (_Ölçerler_): öz zaman $\tau$ ve cadde zamanı $t$; 100 m’lik yolun ölçülen uzunluğu; yan düzlemin ($\theta = 90^\circ$) görüldüğü açı; nötr koninin ($D = 1$) yarı açısı; 555 nm’lik başvuru ışığının ileride ve geride kaydığı dalga boyu ve bant; 288 K’lik ortamın ileride görünen sıcaklığı; EV cinsinden pozlama düzeltmesi; 1 nm ile 1 mm arasındaki elektromanyetik tayf şeridi; geçerli hızın görünüme ne yaptığını söyleyen tek cümlelik canlı bir açıklama.
- Kılavuz katmanı (_Kılavuz_): hareket yönü, nötr koni ve yan düzlemin görüldüğü çember; görüntünün içine değil, üzerine çizilir.
- Mercek (×1, ×3, ×10), ısıl ışıma katmanını açıp kapatan anahtar ve duraklatma.

**Bilimsel analiz.** Sahnenin yanında açılan, makale düzeninde dizilmiş bir yan paneldir (_Bilimsel analiz_). On bölümden oluşur: düşünce deneyi, gözlemcinin kinematiği, hareketli gözlemcinin optiği, parlaklık ve renk, yöntem, gözlem kılavuzu, yedi yanılgı, deneysel kanıt, yazılımın doğrulanması ve modelin sınırları; ayrıca simgeler ve terimler dizini ile açıklamalı bir kaynakça içerir. Sayısal çizelgeleri görüntüleyicinin kullandığı fonksiyonlarla üretilir, şekilleri geçerli hızı işaretler ve “Sahnede göster” düğmeleri simülasyonu metinde tartışılan duruma getirir.

### 2. Bilimsel temel

S caddenin durgun olduğu çerçeve, S′ gözlemcinin durgun olduğu çerçevedir. Gözlemcinin hızı $\beta = v/c$, Lorentz çarpanı $\gamma = 1/\sqrt{1-\beta^2}$, hızlılığı $\varphi = \operatorname{artanh}\beta$ ile gösterilir. $\theta$, bir kaynağın S çerçevesinde görüldüğü yön ile hareket yönü arasındaki açıdır; $\theta'$ ise aynı açının S′ çerçevesindeki değeridir. Türetmeler, çizelgeler ve kaynaklar analizin 2–4. bölümlerindedir (`src/dossier/content/foundations.ts`).

**Işık sapıncı (aberasyon)** (Einstein 1905, § 7):

$$
\cos\theta' = \frac{\cos\theta + \beta}{1 + \beta\cos\theta}
$$

Tam arkadaki yön dışında bütün yönler hareket yönüne doğru çekilir: $\beta = 0{,}99$ hızında caddenin ön yarıküresinin tamamı hareket yönünün 8,1° yakınında görülür.

**Yarım açı biçimi:**

$$
\tan\frac{\theta'}{2} = e^{-\varphi}\tan\frac{\theta}{2}, \qquad D_0 = e^{\varphi} = \sqrt{\frac{1+\beta}{1-\beta}}
$$

Bir itme, yönler küresinin stereografik izdüşümünü $1/D_0$ çarpanıyla düzgün ölçekler. Bu dönüşüm açıkorurdur (konformal): açıları korur ve çemberleri çemberlere götürür (Terrell 1959; Penrose 1959). Gözlemcinin bütün optiği hıza yalnızca $D_0$ üzerinden bağlıdır; bu biçim aynı zamanda sayısal olarak kararlı olandır.

**Doppler çarpanı:**

$$
D = \frac{\nu'}{\nu} = \gamma\left(1 + \beta\cos\theta\right) = \frac{1}{\gamma\left(1 - \beta\cos\theta'\right)}
$$

Önden gelen ışık en çok $D_0$ kadar maviye, arkadan gelen ışık en çok $1/D_0$ kadar kırmızıya kayar.

**Nötr koni:**

$$
\tan\frac{\theta_1'}{2} = e^{-\varphi/2} \quad\Longleftrightarrow\quad \cos\theta_1' = \sqrt{\frac{\gamma - 1}{\gamma + 1}}
$$

Üzerinde $D = 1$ olan konidir: içi maviye, dışı kırmızıya kayar. Küçük hızlarda 90° açısındadır, büyük hızlarda $\sqrt{2/\gamma}$ gibi kapanır. Caddenin yan düzlemi değildir: koni üzerindeki ışık cadde çerçevesinde arkadan gelir; tam yandan ($\theta = 90^\circ$) gelen ışık ise $\cos\theta' = \beta$ açısında görülür ve şimdiden $D = \gamma$ kadar maviye kaymıştır.

**Katı açı:**

$$
d\Omega' = \frac{d\Omega}{D^{2}}
$$

Maviye kayan bölgeler küçülür, kırmızıya kayan bölgeler büyür.

**Özgül şiddetin değişmezliği** (Rybicki ve Lightman 1979):

$$
\frac{I_{\nu'}'(\nu')}{\nu'^{3}} = \frac{I_{\nu}(\nu)}{\nu^{3}}, \qquad \nu' = D\nu
$$

Faz uzayının bir hücresindeki foton sayısı bütün gözlemciler için aynıdır; bu nedenle özgül şiddetin (birim frekans başına ışınım parlaklığı, $I_\nu$) frekansın küpüne bölümü Lorentz değişmezidir. Katı açı yasasıyla birlikte bu, görüntüleyicinin kullandığı bütün dönüşüm yasalarını verir:

| Nicelik                                     | Yasa                                                     | Anlamı                                                                    |
| ------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| Birim frekans başına ışınım parlaklığı      | $I_{\nu'}'(\nu') = D^{3} I_{\nu}(\nu'/D)$                | Tayf kayar ve $D^3$ ile ölçeklenir.                                       |
| Birim dalga boyu başına ışınım parlaklığı   | $I_{\lambda'}'(\lambda') = D^{5} I_{\lambda}(D\lambda')$ | Görüntüleyicinin tümlediği biçim (Weiskopf ve ark. 1999).                 |
| Tayf üzerinden toplam ışınım parlaklığı     | $I' = D^{4} I$                                           | Bolometrik kazanç.                                                        |
| Çözülmemiş (noktasal) kaynağın toplam akısı | $F' = D^{2} F$                                           | İki kuvvet küçülen katı açıya gider (McKinley 1980).                      |
| Kara cismin sıcaklığı                       | $T' = DT$                                                | Kaymış bir kara cisim yine bir kara cisimdir (Peebles ve Wilkinson 1968). |

**Kara cisim kara cisim olarak kalır.** Planck fonksiyonu $B_\lambda$ için $D^5 B_\lambda(D\lambda', T) = B_\lambda(\lambda', DT)$ olduğundan, Doppler çarpanı $D$ ile görülen bir kara cisim, $DT$ sıcaklığındaki bir kara cisimden ayırt edilemez.

**Görünür kazanç:**

$$
G_T(D) = \frac{L_{\mathrm{v}}(DT)}{L_{\mathrm{v}}(T)}, \qquad L_{\mathrm{v}}(T) = K_{\mathrm{cd}} \int V(\lambda) B_\lambda(\lambda, T) d\lambda
$$

Bir göz ya da kamera tayfın tamamı üzerinden toplama yapmaz; tayfsal ışınım parlaklığını kendi duyarlığıyla tartar. Burada bu, ışık verimi fonksiyonu $V(\lambda)$ 380–780 nm ile sınırlı olan CIE 1931 standart gözlemcisidir (CIE 2018); $K_{\mathrm{cd}} = 683$ lm W⁻¹. Planck tayflı bir kaynağın $D$ Doppler çarpanıyla görülen parıltısı, $DT$ sıcaklığındaki bir kara cisminkidir. Bu, $D^4$ değildir: 4100 K’lik bir Planck tayfı olarak modellenen ay ışığında kazanç, $D = 2$ için 24 ($D^4 = 16$ değerinden büyük), $D = 3{,}73$ için 126 ($D^4 = 194$ değerinden küçük), $D = 447$ için yaklaşık $4{,}0 \times 10^{4}$ olur; sonuncusu $D^4$ değerinin milyonda biridir. Kırmızı tarafta kazanç $D^4$ yasasından çok daha hızlı çöker ($D = 0{,}5$ için $2{,}1 \times 10^{-3}$).

### 3. Popüler anlatımlardan ayrıldığı yerler

Aşağıdaki dört nokta, analizin “Düşünce deneyi” ve “Yedi yanılgı” bölümlerinin özetidir.

**(a) Bir fotonun durgun çerçevesi yoktur.** Hiçbir eylemsiz çerçeve $c$ hızıyla hareket etmez; bu yüzden “bir fotonun gördüğü” tanımlı değildir. Lorentz dönüşümü $v = c$ değerinde tekildir ve orada bir limiti yoktur; ışıksı bir dünya çizgisi boyunca öz zamanın sıfır olması bir deneyime değil, aralığa ($ds^2 = 0$) ilişkin bir ifadedir (Einstein 1905). Limiti olan şey, kütleli bir gözlemcinin $\beta \to 1$ iken gördüğüdür. Bu nedenle aralık $\beta = 0{,}99999$ değerinde biter; orada Lorentz çarpanı sonsuz değil, 223,6 değerindedir ve başlık bu sınırı adlandıran bir söz sanatıdır. Anlatının kendisi de aynı özenle aktarılır: Einstein’ın anlatımı 1946 tarihlidir, Maxwell denklemlerine yapılan gönderme bu sonraki anlatıma aittir ve Norton’a göre olgunlaşmış düşünce deneyi en iyi, ışığın salım (emisyon) kuramlarına bir itiraz olarak okunur (Einstein 1949; Norton 2013).

**(b) Yıldızlar gökkuşağı oluşturmaz.** Sänger (1958), relativistik bir uzay gemisinin mürettebatının yıldızları uçuş yönü çevresinde gökkuşağı renkli halkalar hâlinde göreceğini öngörmüştü (“yıldız kuşağı”, _starbow_); öngörü her yıldızı tek renkli bir kaynak sayar. McKinley ve Doherty (1979) hesabı kara cisim tayfları, şiddet dönüşümü ve gözün tepkisiyle yineleyip yıldız kuşağının ortaya çıkmadığını gösterdi: kaymış bir kara cisim yine bir kara cisimdir; rengi yalnızca Planck eğrisi boyunca ilerler (kırmızı, turuncu, beyaz, mavi-beyaz) ve hiçbir zaman yeşilden ya da mordan geçmez (Kraus 2000). Simülasyonun yıldızları buna göre davranır; noktasal kaynak olduklarından parlaklıkları $G_T(D)/D^2$ oranını izler. Renkli halka yalnızca bant sınırlı kaynaklarda oluşur: fosfor dönüşümlü beyaz LED sokak aydınlatması yaklaşık 420–780 nm arasında ışır, bu ışıkla aydınlanan bir yüzey yalnızca $0{,}69 \lt D \lt 1{,}6$ için görünür ve bu pencere nötr koninin çevresinde bir halkadır: $\beta = 0{,}99$ hızında hareket yönünden 23° ile 36° arasında, $\beta = 0{,}99999$ hızında 4,3° ile 6,5° arasında; dışı kırmızı, içi mordur (krş. Savage ve ark. 2007). Neredeyse tek renkli trafik ışıkları da böyle davranır: $\beta = 0{,}2$ hızında tam karşıdan görülen kırmızı ışık (626 nm) göze 511 nm olarak ulaşır ve yeşil görünür.

**(c) Görünür parlaklık tayfa bağlıdır.** $D^3$, birim frekans başına ışınım parlaklığının; $D^4$ ise bütün dalga boyları üzerinden toplanmış ışınım parlaklığının kazancıdır. Görünür parlaklık ikisini de izlemez: göz ya da kamera bir bant görür ve tayfı kendi duyarlığıyla tartar, dolayısıyla kazanç kaynağın tayfına bağlıdır. Isıl bir kaynak için kazanç $G_T(D)$ fonksiyonudur: soğuk kaynaklarda ılımlı maviye kaymada $D^4$ değerinden büyük, büyük maviye kaymada $D$ ile orantılı, kırmızıya kaymada ise $D^4$ değerinden çok küçüktür (Kraus 2000). Bant sınırlı ışık, penceresinin dışında tümüyle kaybolur; çözülemeyecek kadar küçük bir kaynakta ise küçülen katı açı yüzünden iki kuvvet daha yitirilir (McKinley 1980). Sonucun bir RGB görüntüyü renklendirerek elde edilememesinin nedeni budur.

**(d) Terrell dönmesi küçük cisimlere ilişkindir; “relativistik kütle” kullanılmaz.** Uzunluk büzülmesi eşzamanlı ölçüme ilişkin bir ifadedir; görüntüyü ise farklı noktalardan farklı anlarda ayrılmış ışık oluşturur. Açısal boyutu küçük cisimlerde bu iki etki görünür bir dönmede birleşir (harekete dik doğrultuda görülen bir cisim için $\sin\alpha = \beta$) ve bir küre her hızda dairesel dış çizgisini korur (Terrell 1959; Penrose 1959). İçinden bakılan bir cadde ise baştan sona büyük cisim durumudur: birkaç metre ötedeki cepheler geniş bir katı açıyı doldurur, doğrular eğri görünür ve dünya öne yığılır (Boas 1961). Simülasyon bu yüzden katı bir dönme göstermez; büzülmeyi ayrı bir görünüm (_Ölçülen_) olarak sunar. “Relativistik kütle” kavramından kaçınılır: bir cismin kütlesi değişmezdir; hızla artan, enerjisi ($E = \gamma m c^2$) ve momentumudur ($p = \gamma m v$) (Okun 1989).

### 4. Sahne modeli ve varsayımları

Modelin sabitleri tek bir dosyada, `src/physics/scenario.ts` içinde toplanmıştır. Analizdeki varsayım çizelgesi de aynı dosyadan üretilir; dolayısıyla belge, görüntüleyicinin kullandığı değerlerden ayrılamaz. Uzunluklar durgun uzunluklardır.

| Nicelik                             | Değer                                                                    | Kaynak ya da dayanak                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Ay ışığı, aydınlık düzeyi           | 0,2 lx                                                                   | Yüksek dolunay; çoğu dolunayda 0,05–0,2 lx, en çok yaklaşık 0,3 lx (Kyba ve ark. 2017).                    |
| Ay ışığı, tayf                      | Planck, 4100 K                                                           | Yaygın olarak verilen renk sıcaklığı; varsayım.                                                            |
| Sokak aydınlatması, aydınlık düzeyi | 20 lx                                                                    | EN 13201-2:2015, C2 sınıfı: taşıt yolunun ortalaması.                                                      |
| Sokak aydınlatması, tayf            | 450 nm’de pompa çizgisi + tepe değeri 570 nm olan fosfor bandı; ≈ 4000 K | Fosfor dönüşümlü LED’in iki loblu modeli (krş. Ohno 2005); renk sıcaklığı McCamy formülüyle (McCamy 1992). |
| Aydınlık pencereler                 | Planck, 2856 K; 4 cd m⁻²; %42’si aydınlık                                | CIE standart aydınlatıcısı A (CIE 2018); parıltı ve oran varsayım.                                         |
| Trafik ışıkları                     | 626, 590 ve 505 nm’de çizgiler                                           | LED sinyal modüllerinin baskın dalga boyları; varsayım.                                                    |
| Ortam sıcaklığı                     | 288,15 K                                                                 | Standart atmosfer, deniz düzeyi (ISO 2533:1975).                                                           |
| Yüzeylerin yayınırlığı              | 0,92                                                                     | Asfalt, beton, tuğla, cam: 0,85–0,96 (Bergman ve ark. 2011).                                               |
| Açık gece göğünün yayınırlığı       | 0,78                                                                     | 288 K’de Swinbank bağıntısı (Swinbank 1963).                                                               |
| Yıldızlar                           | 2600 kara cisim; kadir ≤ 5,8; akı × 60                                   | İstatistiksel olarak üretilmiş gökyüzü.                                                                    |
| Göz yüksekliği; görüş alanı         | 1,65 m; 65°                                                              | Varsayım.                                                                                                  |
| Beyaz dengesi                       | 4100 K, sabit                                                            | Kent durgun hâlde nötr görünsün diye; sonradan hiç yeniden ayarlanmaz.                                     |
| Gösterim ölçeği                     | Gösterilen saniye başına 48 m                                            | 6,2 × 10⁶ kat yavaşlatma.                                                                                  |

Bu çizelgede adı geçip bu bölümün sonundaki seçilmiş kaynaklar arasında yer almayan kaynakların künyesi analizin kaynakçasındadır (`src/dossier/references.ts`).

**Kesin olan ve modellenen.** Işık sapıncı, Doppler çarpanı ve ışınım parlaklığının dönüşümü özel göreliliğin kesin sonuçlarıdır; durgun çerçevesinde değişmeyen bir sahne, boşluk ve anlık pozlama yapan ideal bir iğne deliği kamerası için görüntü de kesindir. Dönüşümün uygulandığı şey, yani gece vakti bir kentin ışık alanı ise bir modeldir. Cadde bütünüyle `public/models` klasöründeki gerçek 3B model dosyalarından (GLB) kurulur ve modeller oldukları gibi kullanılır; bir modelin yerine geçen hiçbir şey kodla modellenmez. Işık kaynakları da modellerin kendi yüzleridir: pencere camları bina paletindeki cam rengiyle bulunur ve bir bölümü aydınlatılır; sokak armatürünün ışık veren yüzü, lamba modelinin palet rengiyle bulunan kendi ışık yüzüdür. Kodla eklenen tek geometri, her trafik ışığındaki üç küçük sinyal merceğidir: modelde mercek yoktur, Doppler kaymasını göstermek için ise kırmızı, sarı ve yeşil, neredeyse tek renkli ışıklar gerekir. Bu yüz düzgün yayan (Lambert) bir yüzey olarak alınmıştır; parıltısı bağımsız bir varsayım değildir: taşıt yolunun ortalama yatay aydınlık düzeyi başvuru değerine (20 lx) eşit olacak biçimde, modeldeki ışık veren yüzün alanından çıkar (`src/scene/geometry/lighting.ts`). Gökyüzü, Ay ve caddenin ötesindeki zemin düzlemi model değil, bakış yönünün fonksiyonlarıdır. Gölge düşürülmez, ışık yüzeyler arasında yeniden yansıtılmaz; bunlar relativistik dönüşümün değil, aydınlatmanın yalınlaştırmalarıdır: durgun çerçevede hangi ışık alanı verilirse verilsin, ona uygulanan dönüşüm kesin olandır.

### 5. Görüntünün hesaplanması

Görüntüleyici bütün sahneyi durgun çerçevesinde tutar ve itmeyi olabilecek en son anda, grafik işlemcide uygular: hareketli gözlemcinin görüntüsü, durgun görüntünün yeniden eşlenmiş hâlidir (Weiskopf ve ark. 2000; Savage ve ark. 2007). Renk, üç RGB kanalını kaydırarak değil, kaymış tayfları standart gözlemciye karşı tümleyerek elde edilir. Aşağıdaki adımların ilk altısı fiziktir; son ikisi gösterime ilişkin bir tercihtir.

1. **Durgun çerçeve sahnesi.** GLB modelleri oldukları gibi yüklenir; yükleme sırasında her model tek bir ağa indirgenir, palet dokusundaki renkleri köşelere işlenir ve üçgenleri uyarlamalı olarak alt bölünür. Alt bölme gereklidir, çünkü relativistik dönüşüm köşe başına uygulanır ve düz kenarlar gözlemcinin yoluna yakın geçtikleri yerde kısa kalmalıdır. Sokak aydınlatması da köşelere işlenir. Konumlar, normaller, albedolar ve aydınlık düzeyleri durgun çerçeve nicelikleri olarak kalır. Dosyalar: `src/scene/geometry/` içinde `layout.ts`, `palette.ts`, `build.ts`, `subdivide.ts`, `lighting.ts`.
2. **Köşe aşaması: ışık sapıncı.** Her köşe, gözlemcinin onu gördüğü yöne, durgun çerçevedeki uzaklığı korunarak taşınır; böylece derinlik arabelleği her ışın boyunca örtmeyi yine doğru belirler. Kullanılan biçim tek duyarlıkta güvenlidir: $a = (1+\beta)(1+\cos\theta)$ ve $b = (1-\beta)(1-\cos\theta)$ ile $D = \gamma(a+b)/2$ olur; harekete dik bileşenler $D$ ile bölünür, hareket doğrultusundaki bileşen $r(a-b)/(a+b)$ olur. Her terim pozitif niceliklerin toplamıdır; ders kitabındaki biçim ise grafik işlemcinin tek duyarlıklı aritmetiğinde, $\beta = 0{,}99999$ hızında geriye bakan yön yakınında anlamlı basamaklarını yitirir. $1+\beta$, $1-\beta$ ve $\gamma$ işlemcide çift duyarlıkla hesaplanıp aktarılır. _Ölçülen_ görünümde aynı program bunun yerine hareket doğrultusundaki koordinatı $\gamma$ ile böler. Dosyalar: `src/scene/shaders/city.ts`, `src/scene/shaders/chunks.ts` (`BOOST_MATH`); başvuru uygulaması `src/physics/optics.ts` (`aberratePoint`).
3. **Piksel aşaması: Doppler çarpanı.** Doppler çarpanı her piksel için, pikselin kendi bakış ışınından hesaplanır; dolayısıyla üçgenin büyüklüğü ne olursa olsun kesindir. Dosya: `src/scene/shaders/city.ts`.
4. **Tayf atlası.** Durgun çerçevedeki tayfı $S(\lambda)$ olan bir kaynağın $D$ Doppler çarpanında kaydedilen üç uyaran değeri, $X(D) = \int \bar{x}(\lambda') D^{5} S(D\lambda') d\lambda'$, yalnızca $D$ değerine bağlıdır. Bu tümlev işlemcide bir kez, 1/512 ile 512 arasındaki 512 Doppler çarpanı için hesaplanır ve piksel programının okuduğu küçük bir çizelgede saklanır; gölgelendiricilerde uydurulmuş renk geçişleri yoktur. Çizelgenin satırları: yansıyan ay ışığı ve yansıyan LED ışığı (her biri üç yansıtma bileşeni için), sıcaklığa göre dizinlenmiş kara cisim ışıması ve gözlenen dalga boyuna göre dizinlenmiş çizgi ışıması. Her hücre birim parıltılı bir renk ile parıltının logaritmasını tutar. Dosyalar: `src/physics/spectralAtlas.ts`; grafik işlemcideki kopyası `src/scene/uniforms.ts`, okuma fonksiyonları `src/scene/shaders/chunks.ts` (`ATLAS_SAMPLING`).
5. **Yüzeyler ve ışık kaynakları.** Her piksel için yansıyan LED ışığı, yansıyan ay ışığı ve ortam sıcaklığındaki gri cismin ısıl ışıması toplanır; her katkı atlastan o pikselin Doppler çarpanıyla okunur. Buna ışık kaynakları eklenir: aydınlık pencereler (2856 K’lik kara cisim), armatür yüzleri (LED tayfı) ve sinyal mercekleri (çizgi ışıması: ışınım parlaklığı $D^4$ ile büyür, parıltı ayrıca $V(\lambda)$ eğrisini izler). Dosyalar: `src/scene/shaders/city.ts`, `src/scene/emitters.ts`.
6. **Gökyüzü: piksel başına.** Geometrinin örtmediği her piksel için bakış yönü, ışık sapıncı yasasının tersiyle cadde çerçevesine geri izlenir ve cadde çerçevesindeki dünya o yönde değerlendirilir: gece göğünün ışıltısı, disk olarak Ay, atmosferin ısıl ışıması ve caddenin ötesindeki zemin düzlemi. Burada üçgenleme yoktur; sonuç piksel başına kesindir. Yıldızlar noktasal kaynaklardır: konumları köşeler gibi sapınca uğratılır, akıları noktasal kaynak yasasını izler. Dosyalar: `src/scene/shaders/sky.ts`, `src/scene/shaders/stars.ts`, `src/scene/geometry/stars.ts`.
7. **Pozlama ölçümü.** Durgun hâl ile aralığın üst ucu arasında görüş alanındaki parıltı on bir mertebeden fazla değişir. Ölçer grafik işlemciden piksel okumaz; gölgelendiricilerin kullandığı atlası, genel bir cadde sahnesi için kaba bir bakış yönü ızgarasında değerlendirir ve görüş alanının aydınlık bölümünde parıltının logaritmik ortalamasını alır (Reinhard ve ark. 2002). Düzeltme, ölçer panelinde durgun hâle göre pozlama değeri (EV) olarak bildirilir; uyarlama hiçbir zaman gizlenmez. Dosyalar: `src/physics/exposure.ts`, `src/scene/Simulation.tsx`.
8. **Gösterim dönüşümü (fizik değildir).** Beyaz dengesi 4100 K değerinde sabittir (ekran beyazına Bradford uyarlaması) ve sonradan hiç yeniden ayarlanmaz, çünkü dengesini yenileyen bir kamera göstermesi gereken kaymayı kendisi yok ederdi. Ardından sırasıyla: ekranın renk gamının dışında kalan renkler, parıltılarını koruyan en küçük miktarda doygunluktan arındırılır; başvuru beyazının üstündeki parıltı logaritmik olarak sıkıştırılır; kanal başına filmsel bir ton eğrisi uygulanır; sonuç bir sRGB ekran için kodlanır. Bu adımlar bir pikselin ne kadar parlak çizileceğini değiştirir, hangi ışığı temsil ettiğini değil. Dosyalar: `src/physics/display.ts` (başvuru uygulaması), `src/scene/shaders/chunks.ts` (`DISPLAY_TRANSFORM`); beyaz dengesi `src/physics/spectralAtlas.ts` içindeki kamera matrisindedir.

### 6. Mimari

```text
src/
├── app/                  Next.js App Router girişi: layout.tsx (yazı tipleri, üstveri), page.tsx, globals.css
├── physics/              saf TypeScript fizik kütüphanesi; React’ten ve three.js’ten bağımsız
│   ├── constants.ts      fiziksel sabitler ve başvuru verileri, her biri kaynağıyla
│   ├── kinematics.ts     β, γ, hızlılık, ileri Doppler çarpanı, hız denetimi eşlemesi, hiperbolik hareket
│   ├── optics.ts         ışık sapıncı, Doppler çarpanı, nötr koni; gölgelendirici dönüşümlerinin başvuru uygulaması
│   ├── radiometry.ts     Planck yasası, CIE 1931 gözlemcisine karşı tümleme, görünür kazanç
│   ├── cie1931.ts        CIE 1931 standart gözlemcisi, 380–780 nm, 5 nm adımlı
│   ├── colorimetry.ts    XYZ ile sRGB arası dönüşüm, Bradford uyarlaması, gam sıkıştırma
│   ├── spectra.ts        model tayfları: sokak LED’i, yansıtma tabanı
│   ├── spectralAtlas.ts  önceden tümlenmiş tayf atlası ve işlemcideki örneklemesi
│   ├── exposure.ts       pozlama ölçeri
│   ├── display.ts        gösterim dönüşümü (başvuru uygulaması)
│   ├── bands.ts          ölçerlerin adlandırdığı elektromanyetik tayf bantları
│   ├── scenario.ts       sahne modelinin bütün varsayımları
│   └── __tests__/        kütüphanenin testleri
├── scene/                three.js sahnesi (React Three Fiber)
│   ├── UrbanScene.tsx    tuval, WebGL 2 denetimi, işaretçi girdisi
│   ├── Simulation.tsx    kare döngüsü: itme değişkenleri, hareket, kamera, pozlama, telemetri
│   ├── uniforms.ts       bütün malzemelerin paylaştığı değişkenler; atlasın grafik işlemcideki kopyası
│   ├── emitters.ts       ışık kaynağı türlerinin kodları
│   ├── geometry/         layout.ts (modellerin yerleşimi), palette.ts (ışık kaynağını belirten palet renkleri),
│   │                     build.ts (ağa indirgeme, renk işleme, blok kurma), subdivide.ts (uyarlamalı alt bölme),
│   │                     lighting.ts (sokak aydınlatması), stars.ts (yıldız alanı), __tests__/
│   └── shaders/          TypeScript dizgileri olarak GLSL: chunks.ts (itme, atlas okuma, gösterim dönüşümü),
│                         city.ts, sky.ts, stars.ts
├── state/
│   ├── simulation.ts     ayar deposu, telemetri, bakış yönü
│   └── fragment.ts       deneyin durumu, URL parçası olarak
├── i18n/                 format.ts (dile göre sayı biçimi), messages.ts (arayüz metinleri, Türkçe ve İngilizce)
├── ui/                   App.tsx (bileşim, klavye, URL ve dil), hooks.ts, primitives.tsx, hud/ (ölçerler)
└── dossier/              bilimsel analiz
    ├── content/          veri olarak metin; iki dil yan yana
    ├── figures/          etkileşimli SVG şekilleri
    ├── data/             speedScale.ts: hız ölçeğindeki gerçek cisimler
    ├── references.ts     kaynakça; her kaynağın ne ölçüde denetlendiği kayıtlıdır
    ├── Dossier.tsx       görüntüleyici; inline.tsx (satır içi biçimleme), types.ts (içerik modeli)
    └── __tests__/        içeriğin, kaynakçanın ve dizgi çıktısının testleri
```

**Ayarlar ve telemetri.** Durum iki türdür ve ömürleri farklıdır (`src/state/simulation.ts`). _Ayarlar_, kullanıcının yaptığı ayrık seçimlerdir (hedef hız, görünüm, mercek, dil ve benzerleri); React bileşenleri bunlara `useSyncExternalStore` üzerinden, yalnızca ilgilendikleri dilime abone olur. _Telemetri_, çizim döngüsünün her karede ilerlettiği niceliklerdir (saatler, pozlama, bakış yönü, o andaki hız); bunları React durumundan geçirmek arayüzü her karede yeniden çizdirirdi. Bu yüzden düz, değiştirilebilir bir nesnede tutulurlar; ölçerler kare başına çağrılan bir geri çağrıdan okur ve değişen sayıları doğrudan DOM’a yazar (`src/ui/hooks.ts`). Fizik kütüphanesi görüntüleme kodundan ayrıdır: gölgelendiricilerin hesapladığı her şeyin `src/physics` içinde bir başvuru uygulaması vardır.

### 7. Doğrulama

Fizik, saf fonksiyonlardan oluşan ayrı bir kütüphanededir ve otomatik bir test takımıyla sınanır. Gölgelendirici programları aynı aritmetiği satır satır yineler: bir gölgelendiricinin hesapladığı her şeyi kütüphanedeki bir başvuru uygulaması da hesaplar ve bu uygulama, grafik işlemcinin tek duyarlıklı aritmetiğinin benzetimi dâhil olmak üzere sınanır. Aşağıdaki çizelge, analizin doğrulama bölümündeki çizelgenin özetidir.

| Denetim                                                                                                                                                                                                          | Neye karşı korur                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Işık sapıncı, Doppler çarpanı ve tersleri bütün açı ve hızlarda kapalı biçimli bağıntılarla uyuşur; kutupsal ve azimutal ölçek çarpanlarının ikisi de $1/D$ olur; gökyüzündeki küçük bir çember çembere eşlenir. | Dönüşümdeki hatalar.                               |
| Köşe dönüşümü uzaklığı ve azimutu korur; piksel başına ters dönüşüm onu tam olarak geri alır.                                                                                                                    | Geometri ile gökyüzü arasında tutarsızlık.         |
| $\beta = 0{,}99999$ hızında, hareket yönünden 179,99° açısına kadar tek duyarlıklı aritmetik benzetimi.                                                                                                          | Grafik işlemcide anlamlı basamak yitimi.           |
| CIE 1931 çizelgesi yayımlanmış sütun toplamlarını verir ve bağımsız bir analitik uyumla tek tek uyuşur.                                                                                                          | Gözlemci verisinde aktarım hataları.               |
| sRGB renk koordinatlarından türetilen RGB matrisi, standartta (IEC 61966-2-1) basılı olana eşittir.                                                                                                              | Renk uzayı hataları.                               |
| Planck yasası: Stefan–Boltzmann tümlevi, Wien kayma yasası ve $D^5 B_\lambda(D\lambda, T) = B_\lambda(\lambda, DT)$ özdeşliği.                                                                                   | Radyometri hataları.                               |
| Fotometrik dayanaklar: platinin donma noktasındaki (2042 K) kara cismin parıltısı 60 cd cm⁻² olur; Güneş’in açısal büyüklüğündeki 5772 K’lik bir disk yaklaşık 1,25 × 10⁵ lx verir.                              | Ölçek hataları (birimler, sabitler).               |
| Atlas, görünür kazancın doğrudan sayısal tümlevini $D = 0{,}4$ ile $D = 447$ arasında %1’den iyi yineler ve $D = 1$ için her albedoyu kendisi olarak verir.                                                      | Aradeğerleme ve ayar hataları.                     |
| LED modeli 4000 K yakınında Planck eğrisi üzerindedir; her yansıtma tayfı [0, 1] aralığında kalır.                                                                                                               | Fiziksel olmayan model tayfları.                   |
| Alt bölme: her kenar kurala uyar, alan korunur, komşu üçgenler arasında T-bağlantısı oluşmaz; çizilen kenarların kesin görüntüden sapması ölçülür.                                                               | Çatlaklar ve eğrilik hatası.                       |
| Analiz metni: her atıf kaynakçada vardır, kaynakçadaki her kaynak anılır, her formül derlenir ve iki dil aynı sayıları verir.                                                                                    | Kopuk atıflar, bozuk formüller, ayrışan çeviriler. |

Bunlara ek olarak sahne testleri model dosyalarının kendisini okur (armatürün ışık yüzü, bina camları ve sinyal merceklerinin yeri dosyalarla karşılaştırılır) ve sokak aydınlatmasının fotometrik tasarımını denetler; böylece bir modelin değiştirilmesi koddaki sayıları sessizce geçersiz kılamaz. Testler kodun yanındaki `__tests__` klasörlerindedir: `src/physics`, `src/scene`, `src/scene/geometry`, `src/state`, `src/i18n`, `src/ui/hud` ve `src/dossier` altında.

```sh
npm test                                              # bütün takım, bir kez
npx vitest run src/physics/__tests__/optics.test.ts   # tek bir dosya
```

**Üçgenleme hatasının sınırı.** Işık sapıncı doğruları eğrilere götürür, oysa grafik işlemci dönüştürülmüş köşeler arasına düz kenarlar çizer. Bir büyük çemberin görüntüsünün jeodezik eğriliği en çok $\gamma\beta D\sin\theta'$ olduğundan, cadde çerçevesinde açısal uzunluğu $\delta$ olan bir kenar gerçek görüntüsünden en çok

$$
\frac{\gamma\beta\sin\theta'}{8D}\delta^{2}
$$

kadar ayrılır. Geometri bu nedenle, hiçbir kenar gözlemcinin yoluna olan uzaklığının 0,2 katını aşmayana dek alt bölünür; kural yalnızca kenarın kendisine bağlı olduğundan komşu üçgenler arasında çatlak açılamaz. Gözlemcinin önündeki bloklar uzaklıkla birlikte daha kaba sürümleriyle değiştirilir, yandaki ve arkadaki bloklar ise her zaman tam kuralı korur. Ortaya çıkan hata, modellenen hacim içinde görülebilecek kadar parlak olan her yerde ölçüldüğünde en çok 6 mrad (0,34°) olur; bu, standart mercekle 900 piksel yüksekliğindeki bir görüntüde yaklaşık dört pikseldir.

**Bağımsız yeniden türetme ve kaynakça denetimi.** Testlerden bağımsız olarak, analizin 2–4. bölümlerindeki bütün formüller, görüntüleyici yazılmadan önce foton dört-momentumunun dönüşümünden ve faz uzayı yoğunluğunun değişmezliğinden yeniden türetilmiş ve sayısal olarak denetlenmiştir. Bu denetim ilk taslaktaki birkaç sayısal değeri düzeltmiş; Doppler çarpanının piksel başına hesaplanmasına ve köşe dönüşümünün tek duyarlıkta güvenli biçimine yol açmıştır. Kaynakça Crossref ve yayıncı kayıtlarıyla karşılaştırılmıştır; her kaynak için, kaynağın kendisinin okunup okunmadığı kayıtlıdır (`src/dossier/references.ts`, `checked` alanı).

### 8. Kullanım

#### Gereksinimler

- Node.js 22.13 ya da daha yenisi (`package.json` içindeki `engines` alanı; testleri çalıştıran vitest bunu gerektirir) ve npm; sürekli tümleştirme iş akışı Node.js 22 kullanır.
- WebGL 2 destekleyen güncel bir tarayıcı; destek yoksa uygulama sahne yerine bir açıklama gösterir.

#### Komutlar

```sh
npm install
npm run dev
```

| Komut                  | İşlev                                                     |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | Geliştirme sunucusu.                                      |
| `npm run build`        | Üretim derlemesi.                                         |
| `npm start`            | Üretim derlemesini sunar.                                 |
| `npm run lint`         | ESLint denetimi.                                          |
| `npm run typecheck`    | TypeScript tür denetimi.                                  |
| `npm test`             | Test takımını bir kez çalıştırır.                         |
| `npm run test:watch`   | Testleri izleme kipinde çalıştırır.                       |
| `npm run format`       | Kaynakları Prettier ile biçimlendirir.                    |
| `npm run format:check` | Biçimi denetler.                                          |
| `npm run check`        | Tür denetimi, lint, testler ve üretim derlemesi, sırayla. |

Sürekli tümleştirme iş akışı (`.github/workflows/ci.yml`) aynı denetimleri çalıştırır.

#### Denetimler

Ekrandaki denetimler: _Görülen_ / _Ölçülen_ görünüm seçimi, _Isıl ışıma_, _Kılavuz_, _Mercek_, duraklatma, _Bilimsel analiz_, _Kısayollar_ ve dil düğmesi (üst çubuk); _Hız_ sürgüsü, yavaşlatma ve hızlandırma düğmeleri ile hazır hızlar (alt şerit).

| Tuş              | Eylem                                                           |
| ---------------- | --------------------------------------------------------------- |
| `↑` ya da `W`    | Hızlan: $\Delta\varphi = 0{,}045$ büyüklüğünde bir itme.        |
| `↓` ya da `S`    | Yavaşla: aynı itme, ters yönde.                                 |
| `←` ya da `A`    | Bakışı 15° sola çevir.                                          |
| `→`              | Bakışı 15° sağa çevir.                                          |
| `0` – `5`        | Hazır hızlar: β = 0; 0,5; 0,866 (γ = 2); 0,99; 0,9999; 0,99999. |
| `Boşluk`         | Duraklat / sürdür.                                              |
| `M`              | _Görülen_ ve _Ölçülen_ görünümler arasında geçiş.               |
| `T`              | Isıl ışımayı aç / kapat.                                        |
| `G`              | Kılavuz katmanını aç / kapat.                                   |
| `L`              | Sıradaki mercek: ×1, ×3, ×10.                                   |
| `F` ya da `Home` | İleri bak.                                                      |
| `R`              | Saatleri sıfırla.                                               |
| `D`              | Bilimsel analizi aç / kapat.                                    |
| `Esc`            | Bilimsel analizi kapat.                                         |

Kısayollar, odak bir form alanındayken (hız sürgüsü dâhil) ya da Ctrl, Alt veya Meta tuşu basılıyken çalışmaz; odak analizin içindeyken tuşlar okumaya aittir, odaktaki bir düğmenin üzerinde `Boşluk` ise o düğmeyi etkinleştirir.

| Hareket  | Eylem                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------- |
| Sürükle  | Çevrene bak; sürüklenen her piksel, bakışı geçerli görüş alanının bir pikseli kadar çevirir.              |
| Tekerlek | Hızı değiştir; her çentik aynı itmedir ($\Delta\varphi = 0{,}045$), tekerleği ileri çevirmek hızlandırır. |
| Çift tık | İleri bak.                                                                                                |

#### Paylaşılabilir bağlantılar

Deneyin durumu URL parçasında (`#` sonrası bölüm) tutulur; böylece her görünüm paylaşılabilir ve analizde tartışılan bir durum bir bağlantıyla yeniden üretilebilir (`src/state/fragment.ts`). Parça yalnızca varsayılandan farklı olanı listeler, her değişiklikten kısa süre sonra tarayıcı geçmişine kayıt eklemeden güncellenir; açık bir sekmeye yapıştırılan bağlantı izlenir.

| Anahtar | Anlamı                         | Yoksa                                               |
| ------- | ------------------------------ | --------------------------------------------------- |
| `b`     | Hız, β = v/c.                  | Durgun.                                             |
| `v`     | Görünüm: `measured`.           | _Görülen_ görünüm.                                  |
| `t`     | Isıl ışıma: `0` = kapalı.      | Açık.                                               |
| `g`     | Kılavuz katmanı: `0` = kapalı. | Açık.                                               |
| `z`     | Mercek: `3` ya da `10`.        | ×1.                                                 |
| `l`     | Dil: `tr` ya da `en`.          | Okurun kayıtlı seçimi, o da yoksa tarayıcının dili. |

Örnek: `#b=0.99&t=0&l=tr`, caddeyi 0,99 c hızında, ısıl ışıma kapalı olarak ve Türkçe açar.

#### Erişilebilirlik

- **Azaltılmış hareket.** `prefers-reduced-motion: reduce` tercihinde simülasyon duraklatılmış olarak, cadde hareketsizken başlar; arayüz geçişleri de bastırılır.
- **Klavye.** Bütün denetimler yerel düğmeler ve bir yerel sürgüdür; klavyeyle ulaşılır ve kullanılır. Bir atlama bağlantısı doğrudan denetimlere götürür, odak her zaman görünür, hız denetimi değerini β ve γ olarak bildirir. Analiz açıldığında odağı alır, kapandığında geri verir ve `Esc` ile kapanır.
- **Dil.** Türkçe ve İngilizce arasında her an geçilebilir. Başlangıç dili sırasıyla bağlantıdan, kayıtlı seçimden ve tarayıcının dilinden alınır; belgenin dil özniteliği buna göre ayarlanır ve sayılar dile uyar (Türkçede ondalık virgül).
- **Ekran okuyucular.** Tuval yardımcı teknolojilerden gizlenir; ölçer panelindeki canlı cümle geçerli hızın görünüme ne yaptığını bildirir, yükleme durumu ve hatalar duyurulur.

### 9. Modelin sınırları

Işık sapıncı, Doppler çarpanı ve ışınım parlaklığının dönüşümü kesindir. Bunların dışındaki her şey bir model ya da bir tercihtir ve aşağıdaki sınırlar geçerlidir.

- **Boşluk.** Işığın boşlukta yayıldığı varsayılır. Kırılma indisi birden 2,8 × 10⁻⁴ fazla olan havada $\beta \gt 0{,}99972$ ($\gamma \gt 42$) hızındaki bir gözlemci ortamdaki ışığı geçerdi; dolayısıyla aralığın üst bölümü boşluktaki bir kenttir. Bakış doğrultusu boyunca soğurma, saçılma ve ışıma hesaba katılmaz.
- **Durağan sahne, sabit hız.** Caddede hiçbir şey hareket etmez ya da değişmez, gözlemci ivmelenmez; hızı değiştirmek, kararlı durumlar arasında bir geçiştir. Her andaki görüntü, pozlama süresi sıfır olan ideal bir iğne deliği kamerasınınkidir.
- **Fotopik görme.** Parıltı baştan sona fotopik gözlemciyle hesaplanır; oysa ay ışığındaki bir cadde kısmen çubuk hücrelerle görülür.
- **Tayflar.** Görünür bandın dışındaki yansıtma bir dış kestirimdir. Ay ışığı 4100 K’lik bir Planck tayfı sayılmıştır; bu, yaygın olarak verilen ancak belirsizliğiyle birlikte birincil bir ölçümü bulunamayan bir renk sıcaklığıdır. LED tayfı iki loblu bir modeldir. Isıl ışıma tek bir yayınırlık ve tek bir sıcaklıkla gri kabul edilmiştir.
- **Aydınlatma.** Gölge ve yüzeyler arası yansıma yoktur; sokak aydınlatması köşe başına hesaplanır. Yıldız alanı yapaydır ve yıldızların, sokak aydınlatmasına göre ayarlanmış bir pozlamada görünebilmesi için akıları 60 kat artırılmıştır.
- **Geometri.** Çizilen kenarlar kesin eğri görüntüden 0,34° kadar sapabilir. Modellenen cadde, sonsuz bir sokağın 576 m’lik bir örneğidir; gözlemcinin yaklaşık 360–410 m önünde ve 65–85 m arkasında çözülerek biter. En yüksek hızlarda bu, Doppler halkasının dış bölümünde görünecek olanın bir kısmını dışarıda bırakır.
- **Gösterim.** Pozlama, ton eğrisi ve gam eşleme, on bir mertebelik parıltının bir ekranda nasıl gösterileceğine ilişkin tercihlerdir; bir pikselin ne kadar parlak çizileceğini değiştirirler, hangi ışığı temsil ettiğini değil. Pozlama düzeltmesi her zaman gösterilir.
- **Aralık.** Simülasyon $\beta = 0{,}99999$ değerinde biter. Ötesinde nitel olarak yeni bir şey olmaz ve hiçbir sonlu adım $\beta = 1$ değerine ulaşmaz.

### 10. Varlıklar ve lisanslar

- **3B modeller.** `public/models` klasöründeki dosyalar UnityGLTF ile dışa aktarılmış glTF ikili dosyalarıdır (her dosyada kayıtlı üretici bilgisi budur); palet dokuları `public/models/Textures` klasöründedir. Dosya ve doku adları (`building-a`, `skyscraper-a`, `light-curved`, `colormap-commercial`, `colormap-roads`, `colormap-suburban` ve benzerleri), Kenney’nin (kenney.nl) CC0 1.0 ile yayımladığı kent model takımlarıyla örtüşür. Ancak depoda bu modellere ait bir lisans dosyası yoktur; kökenlerinin proje sahibi tarafından doğrulanması gerekir.
- **Yazı tipleri.** Inter (arayüz metni), JetBrains Mono (ölçer sayıları ve etiketleri) ve Source Serif 4 (analizdeki uzun metin); `next/font` üzerinden yüklenir, SIL Open Font License 1.1.
- **Kütüphaneler.** Bağımlılıklar: Next.js, React, three.js (React Three Fiber ve drei ile), KaTeX ve lucide-react; geliştirme bağımlılıkları arasında Tailwind CSS, TypeScript, Vitest, ESLint ve Prettier vardır (bkz. `package.json`). Paket üstverilerine göre doğrudan bağımlılıkların tümü MIT lisanslıdır; lucide-react (ISC) ve TypeScript (Apache-2.0) bunun dışındadır.
- **Projenin kendisi.** Projenin henüz bir lisansı yoktur: depoda lisans dosyası bulunmaz. Proje sahibinin bir lisans seçmesi gerekir; o zamana kadar kodun hangi koşullarla kullanılabileceği tanımsızdır.

### 11. Bilinen eksikler ve sonraki adımlar

- **Sosyal önizleme görseli.** `public/opengraph-image.png` ve `public/preview.png` hâlâ önceki arayüzü gösterir; yeniden üretilmeleri gerekir.
- **Uygulama çatısı.** Next.js 14 bakım aşamasındadır; desteklenen bir ana sürüme geçiş yapılacak işler arasındadır.
- **Başarım.** Farklı aygıtlarda kare hızı ölçümleri yapılmamıştır. Görüntüleyici kare hızı düştüğünde çözünürlüğünü azaltır, ancak bu davranış ölçülerek belgelenmemiştir.
- **Ay ışığının renk sıcaklığı.** 4100 K değeri için belirsizliğiyle birlikte birincil bir kaynak bulunamamıştır.
- **Lisanslar.** 3B modellerin kökeni ve lisansı doğrulanmalı, proje için bir lisans seçilmelidir (bkz. 10. bölüm).

### 12. Seçilmiş kaynaklar

Aşağıdakiler bu metnin dayandığı kaynaklardır. Eksiksiz ve açıklamalı kaynakça analizin içindedir (`src/dossier/references.ts`); her kaynak için, kaynağın kendisinin okunup okunmadığı da orada kayıtlıdır.

- Boas, M. L. (1961). Apparent Shape of Large Objects at Relativistic Speeds. _American Journal of Physics 29 (5), 283–286_. [doi:10.1119/1.1937751](https://doi.org/10.1119/1.1937751)
- Commission Internationale de l’Éclairage (2018). CIE 015:2018 Colorimetry, 4th Edition. _CIE, Vienna_. [doi:10.25039/TR.015.2018](https://doi.org/10.25039/TR.015.2018)
- Einstein, A. (1905). Zur Elektrodynamik bewegter Körper. _Annalen der Physik 17 (322, no. 10), 891–921_. [doi:10.1002/andp.19053221004](https://doi.org/10.1002/andp.19053221004)
- Einstein, A. (1949). Autobiographical Notes (Autobiographisches). _In: Schilpp, P. A. (ed.), Albert Einstein: Philosopher-Scientist. The Library of Living Philosophers VII, Evanston, pp. 2–95_.
- Kraus, U. (2000). Brightness and color of rapidly moving objects: The visual appearance of a large sphere revisited. _American Journal of Physics 68 (1), 56–60_. [doi:10.1119/1.19373](https://doi.org/10.1119/1.19373)
- McKinley, J. M. (1980). Relativistic transformation of solid angle. _American Journal of Physics 48 (8), 612–614_. [doi:10.1119/1.12329](https://doi.org/10.1119/1.12329)
- McKinley, J. M.; Doherty, P. (1979). In search of the “starbow”: The appearance of the starfield from a relativistic spaceship. _American Journal of Physics 47 (4), 309–316_. [doi:10.1119/1.11834](https://doi.org/10.1119/1.11834)
- Norton, J. D. (2013). Chasing the Light: Einstein’s Most Famous Thought Experiment. _In: Frappier, M.; Meynell, L.; Brown, J. R. (eds.), Thought Experiments in Science, Philosophy, and the Arts. Routledge, New York, pp. 123–140_. [doi:10.4324/9780203113271-15](https://doi.org/10.4324/9780203113271-15)
- Okun, L. B. (1989). The Concept of Mass. _Physics Today 42 (6), 31–36_. [doi:10.1063/1.881171](https://doi.org/10.1063/1.881171)
- Peebles, P. J. E.; Wilkinson, D. T. (1968). Comment on the Anisotropy of the Primeval Fireball. _Physical Review 174 (5), 2168_. [doi:10.1103/PhysRev.174.2168](https://doi.org/10.1103/PhysRev.174.2168)
- Penrose, R. (1959). The apparent shape of a relativistically moving sphere. _Proceedings of the Cambridge Philosophical Society 55 (1), 137–139_. [doi:10.1017/S0305004100033776](https://doi.org/10.1017/S0305004100033776)
- Reinhard, E.; Stark, M.; Shirley, P.; Ferwerda, J. (2002). Photographic tone reproduction for digital images. _ACM Transactions on Graphics 21 (3), 267–276_. [doi:10.1145/566654.566575](https://doi.org/10.1145/566654.566575)
- Rybicki, G. B.; Lightman, A. P. (1979). Radiative Processes in Astrophysics, Sec. 4.9. _John Wiley & Sons, New York_. [doi:10.1002/9783527618170](https://doi.org/10.1002/9783527618170)
- Sänger, E. (1958). Einige optische und kinematische Effekte in der interstellaren Raumfahrt. _Zeitschrift für angewandte Mathematik und Physik 9 (5–6), 591–600_. [doi:10.1007/BF02424777](https://doi.org/10.1007/BF02424777)
- Savage, C. M.; Searle, A.; McCalman, L. (2007). Real Time Relativity: Exploratory learning of special relativity. _American Journal of Physics 75 (9), 791–798_. [doi:10.1119/1.2744048](https://doi.org/10.1119/1.2744048)
- Terrell, J. (1959). Invisibility of the Lorentz Contraction. _Physical Review 116 (4), 1041–1045_. [doi:10.1103/PhysRev.116.1041](https://doi.org/10.1103/PhysRev.116.1041)
- Weiskopf, D.; Kraus, U.; Ruder, H. (1999). Searchlight and Doppler effects in the visualization of special relativity: a corrected derivation of the transformation of radiance. _ACM Transactions on Graphics 18 (3), 278–292_. [doi:10.1145/336414.336459](https://doi.org/10.1145/336414.336459)
- Weiskopf, D.; Kobras, D.; Ruder, H. (2000). Real-world relativity: image-based special relativistic visualization. _Proceedings of IEEE Visualization 2000, 303–310_. [doi:10.1109/VISUAL.2000.885709](https://doi.org/10.1109/VISUAL.2000.885709)

---

<a name="en"></a>

## English

_From rest to 0.99999 c: a first-person simulation of special relativity with spectrally computed colour_

Life of a Photon is a first-person, physically based visualisation of what an observer with mass sees while travelling along a night-time city avenue at any constant speed between rest and 0.99999 c, shown in real time: relativistic aberration, Doppler shift and the transformation of radiance (beaming) are recomputed for every frame. Its motivation is the thought experiment of the sixteen-year-old Einstein: what would one see when pursuing a beam of light? The theory, the method, the experimental evidence, the verification of the software and the limits of the model are set out in a bilingual (Turkish and English) scientific dossier inside the application.

### 1. What it shows

The observer travels along the avenue at a constant velocity $v = \beta c$ that can be set anywhere from rest to $\beta = 0.99999$ ($\gamma = 223.6$). The screen shows the light arriving at one point from all directions, transformed into the observer’s frame; nothing is drawn from outside.

**Two views.** At the same speed the simulation offers two different pictures:

| View       | What it is                                                                                                                              | What it contains                                                                                                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| _Seen_     | The image formed by light that reaches the eye at one instant, that is, the light-travel-time picture; what an eye or a camera records. | Aberration, Doppler shift and the transformation of radiance (beaming).                                                                                                                                |
| _Measured_ | The street as the observer’s coordinates describe it at one instant of S′ time (a simultaneity slice); what a survey would yield.       | Lorentz contraction only: every length along the motion becomes $L = L_0/\gamma$ and nothing is shifted in colour; a grid of 10 m rest length is drawn on the ground to make the contraction readable. |

Comparing the two at the same speed shows how little the image resembles the measurement. The _seen_ view is not an approximation: for a scene that is static in its rest frame, the photons reaching the moving observer are the same photons that an observer at rest at the same point would receive; only their directions are re-mapped and their spectra transformed (Weiskopf et al. 2000).

**Four kinds of light, three findings.** Four kinds of light are distinguished in the scene because they respond differently to a Doppler shift: band-limited LED street lighting, broadband moonlight, nearly monochromatic LED signals and the thermal emission of the surroundings (lit windows are a second thermal source). Three findings follow:

1. The visible brightness of thermal light does not grow as $D^4$ but as the luminance of a black body at $DT$.
2. A Doppler rainbow is real for band-limited light, where it forms a ring around the neutral cone ($D = 1$), and absent for stars.
3. From about $\gamma = 2$ the view ahead is dominated by the thermal emission of the surroundings, which for $\beta \gt 0.995$ outshine the surface of the Sun.

**Instruments.**

- Speed rail: $\beta = v/c$, the speed in km/s, the Lorentz factor $\gamma$, the clock rate $d\tau/dt$ and the head-on Doppler factor $D_0$; the speed control and its preset speeds.
- Instrument dock (_Instruments_): proper time $\tau$ and street time $t$; the measured length of 100 m of road; the angle at which the transverse plane ($\theta = 90^\circ$) is seen; the half-angle of the neutral cone ($D = 1$); the wavelength and band at which 555 nm reference light lands ahead and behind; the apparent temperature of the 288 K surroundings ahead; the exposure correction in EV; a strip of the electromagnetic spectrum from 1 nm to 1 mm; one live sentence on what the current speed does to the view.
- Guide layer (_Guides_): the direction of motion, the neutral cone and the circle on which the transverse plane is seen; drawn over the image, never into it.
- A lens (×1, ×3, ×10), a switch for the thermal emission layer, and pause.

**The dossier.** A side sheet that opens beside the scene and is typeset as a paper (_Scientific dossier_). It has ten sections: the thought experiment, kinematics of the observer, the optics of a moving observer, brightness and colour, method, observation guide, seven misconceptions, experimental evidence, verification of the software and limits of the model; it also contains a glossary of symbols and terms and an annotated bibliography. Its numerical tables are generated with the functions the renderer uses, its figures mark the current speed, and its “Show in the scene” buttons set the simulation to the state under discussion.

### 2. Scientific basis

S is the frame in which the street is at rest, S′ the frame in which the observer is at rest. The observer’s velocity is $\beta = v/c$, the Lorentz factor $\gamma = 1/\sqrt{1-\beta^2}$ and the rapidity $\varphi = \operatorname{artanh}\beta$. $\theta$ is the angle between the direction of motion and the direction in which a source is seen in S; $\theta'$ is the same angle in S′. Derivations, tables and sources are in Sections 2–4 of the dossier (`src/dossier/content/foundations.ts`).

**Aberration** (Einstein 1905, § 7):

$$
\cos\theta' = \frac{\cos\theta + \beta}{1 + \beta\cos\theta}
$$

Every direction except the one exactly behind is pulled towards the direction of motion: at $\beta = 0.99$ the whole forward hemisphere of the street is seen within 8.1° of it.

**Half-angle form:**

$$
\tan\frac{\theta'}{2} = e^{-\varphi}\tan\frac{\theta}{2}, \qquad D_0 = e^{\varphi} = \sqrt{\frac{1+\beta}{1-\beta}}
$$

A boost scales the stereographic projection of the sphere of directions uniformly by the factor $1/D_0$. The map is conformal: it preserves angles and takes circles to circles (Terrell 1959; Penrose 1959). The whole optics of the observer depends on the velocity only through $D_0$, and this form is also the numerically stable one.

**Doppler factor:**

$$
D = \frac{\nu'}{\nu} = \gamma\left(1 + \beta\cos\theta\right) = \frac{1}{\gamma\left(1 - \beta\cos\theta'\right)}
$$

Light from ahead is blueshifted by up to $D_0$, light from behind is redshifted by down to $1/D_0$.

**Neutral cone:**

$$
\tan\frac{\theta_1'}{2} = e^{-\varphi/2} \quad\Longleftrightarrow\quad \cos\theta_1' = \sqrt{\frac{\gamma - 1}{\gamma + 1}}
$$

The cone on which $D = 1$: blueshift inside, redshift outside. It lies at 90° for small speeds and closes as $\sqrt{2/\gamma}$ for large ones. It is not the transverse plane of the street: light on the cone comes from behind in the street frame, whereas light from exactly abeam ($\theta = 90^\circ$) is seen at $\cos\theta' = \beta$ and is already blueshifted by $D = \gamma$.

**Solid angle:**

$$
d\Omega' = \frac{d\Omega}{D^{2}}
$$

Blueshifted regions shrink, redshifted regions are magnified.

**Invariance of the specific intensity** (Rybicki & Lightman 1979):

$$
\frac{I_{\nu'}'(\nu')}{\nu'^{3}} = \frac{I_{\nu}(\nu)}{\nu^{3}}, \qquad \nu' = D\nu
$$

The number of photons in a cell of phase space is the same for all observers; the specific intensity (radiance per unit frequency, $I_\nu$) divided by the cube of the frequency is therefore a Lorentz invariant. Together with the law for the solid angle it yields every transformation the renderer uses:

| Quantity                                | Law                                                      | Meaning                                                           |
| --------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| Radiance per unit frequency             | $I_{\nu'}'(\nu') = D^{3} I_{\nu}(\nu'/D)$                | The spectrum is shifted and scaled by $D^3$.                      |
| Radiance per unit wavelength            | $I_{\lambda'}'(\lambda') = D^{5} I_{\lambda}(D\lambda')$ | The form the renderer integrates (Weiskopf et al. 1999).          |
| Radiance integrated over the spectrum   | $I' = D^{4} I$                                           | The bolometric gain.                                              |
| Integrated flux of an unresolved source | $F' = D^{2} F$                                           | Two powers are lost to the shrinking solid angle (McKinley 1980). |
| Temperature of a black body             | $T' = DT$                                                | A shifted black body is a black body (Peebles & Wilkinson 1968).  |

**A black body stays a black body.** Because $D^5 B_\lambda(D\lambda', T) = B_\lambda(\lambda', DT)$ for the Planck function $B_\lambda$, a black body seen at Doppler factor $D$ cannot be told from a black body at temperature $DT$.

**Visible gain:**

$$
G_T(D) = \frac{L_{\mathrm{v}}(DT)}{L_{\mathrm{v}}(T)}, \qquad L_{\mathrm{v}}(T) = K_{\mathrm{cd}} \int V(\lambda) B_\lambda(\lambda, T) d\lambda
$$

An eye or a camera does not integrate over the whole spectrum; it weights the spectral radiance with its own sensitivity. Here that is the CIE 1931 standard observer, whose luminous efficiency function $V(\lambda)$ is confined to 380–780 nm (CIE 2018); $K_{\mathrm{cd}} = 683$ lm W⁻¹. The luminance of a source with a Planck spectrum seen at Doppler factor $D$ is that of a black body at $DT$. This is not $D^4$: for moonlight, modelled as a Planck spectrum of 4100 K, the gain is 24 at $D = 2$ (more than $D^4 = 16$), 126 at $D = 3.73$ (less than $D^4 = 194$) and about $4.0 \times 10^{4}$ at $D = 447$; the last value is a millionth of $D^4$. On the red side the gain collapses much faster than the $D^4$ law (to $2.1 \times 10^{-3}$ at $D = 0.5$).

### 3. Where it departs from popular accounts

The following four points summarise the sections “The thought experiment” and “Seven misconceptions” of the dossier.

**(a) A photon has no rest frame.** No inertial frame moves at the speed $c$, so “what a photon sees” is not defined. The Lorentz transformation is singular at $v = c$ and has no limit there; that the proper time along a light-like world line is zero is a statement about the interval ($ds^2 = 0$), not about an experience (Einstein 1905). What does have a limit is the view of an observer with mass as $\beta \to 1$. The range therefore ends at $\beta = 0.99999$, where the Lorentz factor is 223.6, not infinity, and the title is a figure of speech that names this limit. The anecdote itself is reported with the same care: Einstein’s account dates from 1946, the appeal to Maxwell’s equations belongs to that later account, and Norton argues that the mature thought experiment is best read as an objection to emission theories of light (Einstein 1949; Norton 2013).

**(b) The stars do not form a rainbow.** Sänger (1958) predicted that the crew of a relativistic spaceship would see the stars arranged in rainbow-coloured rings around the direction of flight (the _starbow_); the prediction treats every star as a source of a single colour. McKinley and Doherty (1979) repeated the calculation with black-body spectra, the transformation of intensity and the response of the eye, and showed that no starbow appears: a shifted black body is a black body, so its colour can only move along the Planckian locus (red, orange, white, blue-white) and never passes through green or violet (Kraus 2000). The stars of the simulation behave accordingly; as point sources their brightness follows the ratio $G_T(D)/D^2$. A coloured ring occurs only for band-limited emitters: phosphor-converted white LED street lighting emits between about 420 and 780 nm, a surface lit by it is visible only for $0.69 \lt D \lt 1.6$, and this window is a ring around the neutral cone: between 23° and 36° from the direction of motion at $\beta = 0.99$, between 4.3° and 6.5° at $\beta = 0.99999$; red on the outside, violet on the inside (cf. Savage et al. 2007). The nearly monochromatic traffic signals behave in the same way: a red signal (626 nm) seen head-on at $\beta = 0.2$ arrives at 511 nm and looks green.

**(c) Visible brightness depends on the spectrum.** $D^3$ is the gain of the radiance per unit frequency, $D^4$ that of the radiance integrated over all wavelengths. Visible brightness follows neither: an eye or a camera sees a band and weights the spectrum with its own sensitivity, so the gain depends on the spectrum of the source. For a thermal source the gain is the function $G_T(D)$: larger than $D^4$ for cool sources at moderate blueshift, proportional to $D$ at large blueshift, and far smaller than $D^4$ under redshift (Kraus 2000). Band-limited light vanishes altogether outside its window, and for a source too small to be resolved two further powers are lost to the shrinking solid angle (McKinley 1980). This is why the result cannot be obtained by tinting an RGB image.

**(d) Terrell rotation concerns small objects; “relativistic mass” is not used.** Length contraction is a statement about simultaneous measurement, whereas an image is formed by light that left different points at different times. For objects of small angular size the two effects combine into an apparent rotation ($\sin\alpha = \beta$ for an object seen at right angles to its motion), and a sphere keeps a circular outline at any speed (Terrell 1959; Penrose 1959). A street seen from within is the large-object case throughout: facades a few metres away fill a wide solid angle, straight lines appear curved and the world crowds forward (Boas 1961). The simulation therefore shows no rigid rotation; it offers the contraction as a separate view (_Measured_). The notion of a “relativistic mass” is avoided: the mass of a body is an invariant; what grows with speed is its energy ($E = \gamma m c^2$) and its momentum ($p = \gamma m v$) (Okun 1989).

### 4. The scene model and its assumptions

The constants of the model are collected in one file, `src/physics/scenario.ts`. The table of assumptions in the dossier is generated from the same file, so the document cannot disagree with the values the renderer uses. Lengths are rest lengths.

| Quantity                          | Value                                                           | Source or basis                                                                                                   |
| --------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Moonlight, illuminance            | 0.2 lx                                                          | A high full Moon; 0.05–0.2 lx for most full Moons, about 0.3 lx at most (Kyba et al. 2017).                       |
| Moonlight, spectrum               | Planck, 4100 K                                                  | Commonly quoted colour temperature; assumption.                                                                   |
| Street lighting, illuminance      | 20 lx                                                           | Class C2 of EN 13201-2:2015: average over the carriageway.                                                        |
| Street lighting, spectrum         | Pump line at 450 nm + phosphor band peaking at 570 nm; ≈ 4000 K | Two-lobe model of a phosphor-converted LED (cf. Ohno 2005); colour temperature by McCamy’s formula (McCamy 1992). |
| Lit windows                       | Planck, 2856 K; 4 cd m⁻²; 42 % lit                              | CIE standard illuminant A (CIE 2018); luminance and fraction assumed.                                             |
| Traffic signals                   | Lines at 626, 590 and 505 nm                                    | Dominant wavelengths of LED signal modules; assumption.                                                           |
| Ambient temperature               | 288.15 K                                                        | Standard atmosphere at sea level (ISO 2533:1975).                                                                 |
| Emissivity of surfaces            | 0.92                                                            | Asphalt, concrete, brick, glass: 0.85–0.96 (Bergman et al. 2011).                                                 |
| Emissivity of the clear night sky | 0.78                                                            | Swinbank’s relation at 288 K (Swinbank 1963).                                                                     |
| Stars                             | 2600 black bodies; magnitude ≤ 5.8; flux × 60                   | Statistically generated sky.                                                                                      |
| Eye height; field of view         | 1.65 m; 65°                                                     | Assumption.                                                                                                       |
| White balance                     | 4100 K, fixed                                                   | So that the city is neutral at rest; never adapted afterwards.                                                    |
| Playback scale                    | 48 m per displayed second                                       | Slow motion by 6.2 × 10⁶.                                                                                         |

Sources named in this table that are not among the selected references at the end of this part are listed in full in the bibliography of the dossier (`src/dossier/references.ts`).

**What is exact and what is modelled.** The aberration, the Doppler factor and the transformation of radiance are exact consequences of special relativity; for a scene that is static in its rest frame, in vacuum and for an ideal pinhole camera with an instantaneous exposure, so is the image. What the transformation is applied to, the light field of a night-time city, is a model. The avenue is assembled entirely from the real 3D model files (GLB) in `public/models`, and the models are used as they are; nothing is modelled procedurally in place of a model. The light sources, too, are the models’ own faces: window panes are found by the glass colour of the building palette, and a share of them is lit; the emitting face of a street luminaire is the lamp model’s own light face, found by its palette colour. The only geometry added by code is three small signal lenses on each traffic signal: the model has none, and red, amber and green quasi-monochromatic lights are needed to demonstrate the Doppler shift. That face is taken to be a uniform diffuse (Lambertian) emitter; its luminance is not an independent assumption: it follows from the requirement that the average horizontal illuminance of the carriageway equal the reference value (20 lx) and from the area of the model’s emitting face (`src/scene/geometry/lighting.ts`). The sky, the Moon and the ground plane beyond the avenue are not models but functions of the viewing direction. No shadows are cast and light is not inter-reflected; these are simplifications of the lighting, not of the relativistic transformation: whatever light field is supplied in the rest frame, the transformation applied to it is the exact one.

### 5. How it is rendered

The renderer keeps the whole scene in its rest frame and applies the boost at the last possible moment, on the graphics processor: the moving observer’s picture is the rest picture re-mapped (Weiskopf et al. 2000; Savage et al. 2007). Colour is obtained not by shifting three RGB channels but by integrating shifted spectra against the standard observer. The first six of the following steps are physics; the last two are a choice about the display.

1. **Rest-frame scene.** The GLB models are loaded as they are; at load time each model is flattened into one mesh, the colours of its palette texture are baked into the vertices, and its triangles are subdivided adaptively. The subdivision is needed because the relativistic transformation is applied per vertex and straight edges must stay short where they pass close to the observer’s path. The street lighting is baked into the vertices as well. Positions, normals, albedos and irradiances remain rest-frame quantities. Files: `layout.ts`, `palette.ts`, `build.ts`, `subdivide.ts`, `lighting.ts` in `src/scene/geometry/`.
2. **Vertex stage: aberration.** Each vertex is moved to the direction in which the observer sees it, at its rest-frame distance, so that the depth buffer still decides occlusion along every ray. The form used is safe in single precision: with $a = (1+\beta)(1+\cos\theta)$ and $b = (1-\beta)(1-\cos\theta)$ the Doppler factor is $D = \gamma(a+b)/2$; the components perpendicular to the motion are divided by $D$, and the component along the motion becomes $r(a-b)/(a+b)$. Every term is a sum of positive quantities, whereas the textbook form, evaluated in the single precision of a graphics processor, loses its significant digits near the backward direction at $\beta = 0.99999$. The quantities $1+\beta$, $1-\beta$ and $\gamma$ are computed in double precision on the processor and passed in. In the _measured_ view the same program instead divides the coordinate along the motion by $\gamma$. Files: `src/scene/shaders/city.ts`, `src/scene/shaders/chunks.ts` (`BOOST_MATH`); reference implementation in `src/physics/optics.ts` (`aberratePoint`).
3. **Pixel stage: Doppler factor.** The Doppler factor is evaluated per pixel from the pixel’s own viewing ray and is therefore exact whatever the size of the triangle. File: `src/scene/shaders/city.ts`.
4. **Spectral atlas.** The tristimulus values recorded at Doppler factor $D$ for a source with rest-frame spectrum $S(\lambda)$, $X(D) = \int \bar{x}(\lambda') D^{5} S(D\lambda') d\lambda'$, depend on $D$ alone. The integral is evaluated once, on the processor, for 512 Doppler factors between 1/512 and 512 and stored in a small table that the pixel program reads; the shaders contain no fitted colour ramps. The rows of the table are reflected moonlight and reflected LED light (each for three reflectance components), black-body emission indexed by temperature, and line emission indexed by observed wavelength. Each cell stores a colour of unit luminance together with the logarithm of the luminance. Files: `src/physics/spectralAtlas.ts`; its copy on the graphics processor in `src/scene/uniforms.ts`, the look-up functions in `src/scene/shaders/chunks.ts` (`ATLAS_SAMPLING`).
5. **Surfaces and light sources.** For each pixel the reflected LED light, the reflected moonlight and the thermal emission of a grey body at ambient temperature are added up; each contribution is read from the atlas at the Doppler factor of that pixel. The light sources are added to this: lit windows (a black body at 2856 K), luminaire faces (the LED spectrum) and signal lenses (line emission: the radiance grows as $D^4$, and the luminance additionally follows the curve $V(\lambda)$). Files: `src/scene/shaders/city.ts`, `src/scene/emitters.ts`.
6. **Sky: per pixel.** For each pixel that is not covered by geometry the viewing direction is traced back into the street frame by the inverse of the law of aberration, and the street-frame world is evaluated in that direction: the glow of the night sky, the Moon as a disc, the thermal emission of the atmosphere and the ground plane beyond the avenue. No tessellation is involved; the result is exact per pixel. Stars are point sources: their positions are aberrated like vertices and their flux follows the point-source law. Files: `src/scene/shaders/sky.ts`, `src/scene/shaders/stars.ts`, `src/scene/geometry/stars.ts`.
7. **Exposure metering.** Between rest and the top of the range the luminance in view spans more than eleven decades. The meter does not read pixels back from the graphics processor; it evaluates the atlas the shaders use on a coarse grid of viewing directions for a generic street scene and takes the logarithmic average of the luminance over the lit part of the field of view (Reinhard et al. 2002). The correction is reported on the instrument dock as an exposure value (EV) relative to rest; the adaptation is never hidden. Files: `src/physics/exposure.ts`, `src/scene/Simulation.tsx`.
8. **Display transform (not physics).** The white balance is fixed at 4100 K (a Bradford adaptation to the display white) and is never adapted afterwards, since a camera that re-balanced would cancel the very shift it is meant to show. Then, in this order: colours outside the display gamut are desaturated by the smallest amount that preserves their luminance; luminance above the reference white is compressed logarithmically; a filmic tone curve is applied per channel; the result is encoded for an sRGB display. These steps change how bright a pixel is drawn, never which light it stands for. Files: `src/physics/display.ts` (reference implementation), `src/scene/shaders/chunks.ts` (`DISPLAY_TRANSFORM`); the white balance is part of the camera matrix in `src/physics/spectralAtlas.ts`.

### 6. Architecture

```text
src/
├── app/                  Next.js App Router entry: layout.tsx (fonts, metadata), page.tsx, globals.css
├── physics/              pure TypeScript physics library; independent of React and three.js
│   ├── constants.ts      physical constants and reference data, each with its provenance
│   ├── kinematics.ts     β, γ, rapidity, head-on Doppler factor, speed-control mapping, hyperbolic motion
│   ├── optics.ts         aberration, Doppler factor, neutral cone; reference implementation of the shader transforms
│   ├── radiometry.ts     Planck’s law, integration against the CIE 1931 observer, visible gain
│   ├── cie1931.ts        CIE 1931 standard observer, 380–780 nm in 5 nm steps
│   ├── colorimetry.ts    conversion between XYZ and sRGB, Bradford adaptation, gamut compression
│   ├── spectra.ts        model spectra: street LED, reflectance basis
│   ├── spectralAtlas.ts  the pre-integrated spectral atlas and its sampling on the processor
│   ├── exposure.ts       exposure meter
│   ├── display.ts        display transform (reference implementation)
│   ├── bands.ts          bands of the electromagnetic spectrum as the instruments name them
│   ├── scenario.ts       every assumption of the scene model
│   └── __tests__/        tests of the library
├── scene/                three.js scene (React Three Fiber)
│   ├── UrbanScene.tsx    canvas, WebGL 2 check, pointer input
│   ├── Simulation.tsx    frame loop: boost uniforms, motion, camera, exposure, telemetry
│   ├── uniforms.ts       uniforms shared by all materials; copy of the atlas on the graphics processor
│   ├── emitters.ts       codes of the kinds of light source
│   ├── geometry/         layout.ts (placement of the models), palette.ts (palette colours that mark light sources),
│   │                     build.ts (flattening, colour baking, block assembly), subdivide.ts (adaptive subdivision),
│   │                     lighting.ts (street lighting), stars.ts (star field), __tests__/
│   └── shaders/          GLSL as TypeScript template strings: chunks.ts (boost, atlas look-up, display transform),
│                         city.ts, sky.ts, stars.ts
├── state/
│   ├── simulation.ts     settings store, telemetry, view direction
│   └── fragment.ts       the state of the experiment as a URL fragment
├── i18n/                 format.ts (number formatting per language), messages.ts (interface strings, Turkish and English)
├── ui/                   App.tsx (composition, keyboard, URL and language), hooks.ts, primitives.tsx, hud/ (instruments)
└── dossier/              the scientific dossier
    ├── content/          the text as data; both languages side by side
    ├── figures/          interactive SVG figures
    ├── data/             speedScale.ts: real objects on the speed scale
    ├── references.ts     bibliography; records how far each entry was checked
    ├── Dossier.tsx       renderer; inline.tsx (inline markup), types.ts (content model)
    └── __tests__/        tests of the content, the bibliography and the typeset output
```

**Settings and telemetry.** There are two kinds of state with different lifetimes (`src/state/simulation.ts`). _Settings_ are the discrete choices made by the user (target speed, view, lens, language and the like); React components subscribe to them through `useSyncExternalStore`, each to the slice it needs. _Telemetry_ is what the render loop advances every frame (clocks, exposure, view direction, the velocity at that instant); routing it through React state would re-render the interface every frame. It therefore lives in a plain mutable object; the instruments read it from a callback that runs once per frame and write the changing numbers straight into the DOM (`src/ui/hooks.ts`). The physics library is separate from the rendering code: whatever a shader computes has a reference implementation in `src/physics`.

### 7. Verification

The physics lives in a separate library of pure functions that is exercised by an automated test suite. The shader programs repeat the same arithmetic line for line: whatever a shader computes, a reference implementation in the library computes too, and that implementation is tested, including an emulation of the single-precision arithmetic of the graphics processor. The table below summarises the table in the verification section of the dossier.

| Check                                                                                                                                                                                                                   | Guards against                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Aberration, the Doppler factor and their inverses agree with the closed-form relations at all angles and speeds; the polar and the azimuthal scale factor both equal $1/D$; a small circle on the sky maps to a circle. | Errors in the transformation.                                |
| The vertex transform preserves distance and azimuth and is undone exactly by the per-pixel inverse transform.                                                                                                           | Inconsistency between geometry and sky.                      |
| Emulation of single-precision arithmetic at $\beta = 0.99999$, up to 179.99° from the direction of motion.                                                                                                              | Loss of significance on the graphics processor.              |
| The CIE 1931 table reproduces the published column sums and agrees entry by entry with an independent analytic fit.                                                                                                     | Transcription errors in the observer data.                   |
| The RGB matrix derived from the sRGB chromaticities equals the one printed in the standard (IEC 61966-2-1).                                                                                                             | Colour-space errors.                                         |
| Planck’s law: the Stefan–Boltzmann integral, Wien’s displacement law and the identity $D^5 B_\lambda(D\lambda, T) = B_\lambda(\lambda, DT)$.                                                                            | Errors in the radiometry.                                    |
| Photometric anchors: a black body at the freezing point of platinum (2042 K) has a luminance of 60 cd cm⁻²; a 5772 K disc of the Sun’s angular size yields about 1.25 × 10⁵ lx.                                         | Errors of scale (units, constants).                          |
| The atlas reproduces direct numerical integration of the visible gain to better than 1 % between $D = 0.4$ and $D = 447$ and returns every albedo as itself at $D = 1$.                                                 | Errors of interpolation and calibration.                     |
| The LED model lies on the Planckian locus near 4000 K; every reflectance spectrum stays within [0, 1].                                                                                                                  | Unphysical model spectra.                                    |
| Subdivision: every edge obeys the rule, area is preserved, no T-junction opens between neighbouring triangles; the deviation of drawn edges from the exact image is measured.                                           | Cracks and curvature error.                                  |
| The text of the dossier: every citation exists in the bibliography, every entry of the bibliography is cited, every formula compiles, and both languages state the same numbers.                                        | Dangling citations, broken formulas, diverging translations. |

In addition, the scene tests read the model files themselves (the position of the luminaire’s light face, of the window glass of the buildings and of the signal lenses is compared with the files) and check the photometric design of the street lighting, so that replacing a model cannot silently invalidate numbers in the code. The tests live next to the code in `__tests__` folders, under `src/physics`, `src/scene`, `src/scene/geometry`, `src/state`, `src/i18n`, `src/ui/hud` and `src/dossier`.

```sh
npm test                                              # the whole suite, once
npx vitest run src/physics/__tests__/optics.test.ts   # a single file
```

**Bound on the tessellation error.** Aberration maps straight lines to curves, but the graphics processor draws straight edges between transformed vertices. Because the image of a great circle has geodesic curvature at most $\gamma\beta D\sin\theta'$, an edge of angular length $\delta$ in the street frame departs from its true image by at most

$$
\frac{\gamma\beta\sin\theta'}{8D}\delta^{2}
$$

The geometry is therefore subdivided until no edge exceeds 0.2 times its distance from the observer’s path; the rule depends on the edge alone and so cannot open a crack between neighbouring triangles. Blocks ahead of the observer are replaced by coarser versions with distance, whereas blocks beside and behind always keep the full rule. The resulting error, measured throughout the modelled volume wherever anything is bright enough to be seen, is at most 6 mrad (0.34°), about four pixels with the standard lens on a view 900 pixels high.

**Independent re-derivation and check of the bibliography.** Independently of the tests, every formula of Sections 2–4 of the dossier was re-derived from the transformation of the photon four-momentum and from the invariance of the phase-space density, and checked numerically, before the renderer was written. That audit corrected several numerical values of the first draft and led to the per-pixel evaluation of the Doppler factor and to the single-precision-safe form of the vertex transform. The bibliography was checked against Crossref and the publishers’ records; for each entry it is recorded whether the source itself was read (`src/dossier/references.ts`, field `checked`).

### 8. Using it

#### Requirements

- Node.js 22.13 or later (the `engines` field of `package.json`; required by vitest, which runs the tests) and npm; the continuous-integration workflow uses Node.js 22.
- A current browser with WebGL 2; without it the application shows an explanation instead of the scene.

#### Commands

```sh
npm install
npm run dev
```

| Command                | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Development server.                                        |
| `npm run build`        | Production build.                                          |
| `npm start`            | Serves the production build.                               |
| `npm run lint`         | ESLint.                                                    |
| `npm run typecheck`    | TypeScript type check.                                     |
| `npm test`             | Runs the test suite once.                                  |
| `npm run test:watch`   | Runs the tests in watch mode.                              |
| `npm run format`       | Formats the sources with Prettier.                         |
| `npm run format:check` | Checks the formatting.                                     |
| `npm run check`        | Type check, lint, tests and production build, in sequence. |

The continuous-integration workflow (`.github/workflows/ci.yml`) runs the same checks.

#### Controls

On-screen controls: the _Seen_ / _Measured_ view switch, _Thermal emission_, _Guides_, _Lens_, pause, _Scientific dossier_, _Shortcuts_ and the language button (top bar); the _Speed_ slider, the slower and faster buttons and the preset speeds (bottom rail).

| Key           | Action                                                           |
| ------------- | ---------------------------------------------------------------- |
| `↑` or `W`    | Faster: one boost of $\Delta\varphi = 0.045$.                    |
| `↓` or `S`    | Slower: the same boost in the opposite direction.                |
| `←` or `A`    | Turn the view 15° to the left.                                   |
| `→`           | Turn the view 15° to the right.                                  |
| `0` – `5`     | Preset speeds: β = 0; 0.5; 0.866 (γ = 2); 0.99; 0.9999; 0.99999. |
| `Space`       | Pause / resume.                                                  |
| `M`           | Switch between the _Seen_ and the _Measured_ view.               |
| `T`           | Thermal emission on / off.                                       |
| `G`           | Guide layer on / off.                                            |
| `L`           | Next lens: ×1, ×3, ×10.                                          |
| `F` or `Home` | Look ahead.                                                      |
| `R`           | Reset the clocks.                                                |
| `D`           | Open / close the dossier.                                        |
| `Esc`         | Close the dossier.                                               |

The shortcuts are inactive while a form field (including the speed slider) has the focus or while Ctrl, Alt or Meta is held; while the focus is inside the dossier the keys belong to reading, and `Space` on a focused button activates that button.

| Gesture      | Action                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Drag         | Look around; each pixel of drag turns the view by one pixel of the current field of view.                                   |
| Wheel        | Change the speed; every notch is the same boost ($\Delta\varphi = 0.045$), and rolling the wheel away from you accelerates. |
| Double click | Look ahead.                                                                                                                 |

#### Shareable links

The state of the experiment is kept in the URL fragment (the part after `#`), so that any view can be shared and a state discussed in the dossier can be reproduced by following a link (`src/state/fragment.ts`). The fragment lists only what differs from the defaults and is rewritten shortly after every change without adding an entry to the browser history; a link pasted into an open tab is followed.

| Key | Meaning                      | When absent                                                        |
| --- | ---------------------------- | ------------------------------------------------------------------ |
| `b` | Velocity, β = v/c.           | At rest.                                                           |
| `v` | View: `measured`.            | The _Seen_ view.                                                   |
| `t` | Thermal emission: `0` = off. | On.                                                                |
| `g` | Guide layer: `0` = off.      | On.                                                                |
| `z` | Lens: `3` or `10`.           | ×1.                                                                |
| `l` | Language: `tr` or `en`.      | The reader’s stored choice, otherwise the language of the browser. |

Example: `#b=0.99&t=0&l=en` opens the avenue at 0.99 c with the thermal emission switched off, in English.

#### Accessibility

- **Reduced motion.** With the preference `prefers-reduced-motion: reduce` the simulation starts paused, with the avenue standing still; interface transitions are suppressed as well.
- **Keyboard.** All controls are native buttons and one native slider; they can be reached and operated from the keyboard. A skip link leads straight to the controls, the focus is always visible, and the speed control announces its value as β and γ. The dossier takes the focus when it opens, returns it when it closes, and closes with `Esc`.
- **Language.** Turkish and English can be switched at any time. The initial language is taken, in this order, from the link, from the stored choice and from the language of the browser; the language attribute of the document is set accordingly and numbers follow the language (decimal comma in Turkish).
- **Screen readers.** The canvas is hidden from assistive technology; a live sentence on the instrument dock reports what the current speed does to the view, and the loading state and failures are announced.

### 9. Limits of the model

The aberration, the Doppler factor and the transformation of radiance are exact. Everything else is a model or a choice, and the following limits apply.

- **Vacuum.** Light is assumed to travel in vacuum. In air, whose refractive index exceeds one by 2.8 × 10⁻⁴, an observer with $\beta \gt 0.99972$ ($\gamma \gt 42$) would outrun light in the medium; the upper part of the range is therefore a city in vacuum. No absorption, scattering or emission along the line of sight is included.
- **Static scene, constant velocity.** Nothing in the street moves or changes and the observer does not accelerate; changing the speed is a passage between stationary states. The image at each instant is that of an ideal pinhole camera with zero exposure time.
- **Photopic vision.** Luminance is computed with the photopic observer throughout, although a moonlit street is seen partly with rod vision.
- **Spectra.** Reflectance outside the visible band is an extrapolation. Moonlight is taken as a Planck spectrum of 4100 K, a commonly quoted colour temperature for which no primary measurement with an uncertainty was found. The LED spectrum is a two-lobe model. Thermal emission is grey, with a single emissivity and a single temperature.
- **Lighting.** There are no shadows and no inter-reflection; street lighting is evaluated per vertex. The star field is synthetic, and its flux is raised by a factor of 60 so that stars register at an exposure set for street lighting.
- **Geometry.** Drawn edges can deviate from the exact curved image by up to 0.34°. The modelled avenue is a 576 m sample of an endless street; it dissolves about 360–410 m ahead of the observer and 65–85 m behind. At the highest speeds this removes part of what would otherwise appear in the outer part of the Doppler ring.
- **Display.** Exposure, tone curve and gamut mapping are choices about how to show eleven decades of luminance on a screen; they change how bright a pixel is drawn, never which light it stands for. The exposure correction is always displayed.
- **Range.** The simulation ends at $\beta = 0.99999$. Nothing qualitatively new happens beyond it, and no finite step reaches $\beta = 1$.

### 10. Assets and licences

- **3D models.** The files in `public/models` are glTF binaries exported with UnityGLTF (the generator recorded in each file); their palette textures are in `public/models/Textures`. File and texture names (`building-a`, `skyscraper-a`, `light-curved`, `colormap-commercial`, `colormap-roads`, `colormap-suburban` and the like) match the city kits published by Kenney (kenney.nl) under CC0 1.0. The repository, however, carries no licence file for these models; their origin is to be confirmed by the owner.
- **Fonts.** Inter (interface text), JetBrains Mono (instrument numerals and labels) and Source Serif 4 (long-form reading in the dossier); loaded through `next/font`, SIL Open Font License 1.1.
- **Libraries.** Dependencies: Next.js, React, three.js (with React Three Fiber and drei), KaTeX and lucide-react; the development dependencies include Tailwind CSS, TypeScript, Vitest, ESLint and Prettier (see `package.json`). According to their package metadata all direct dependencies are MIT-licensed, with the exception of lucide-react (ISC) and TypeScript (Apache-2.0).
- **The project itself.** The project has no licence yet: the repository contains no licence file. The owner needs to choose one; until then the terms under which the code may be used are undefined.

### 11. Known follow-ups

- **Social preview image.** `public/opengraph-image.png` and `public/preview.png` still show the previous interface and need to be produced again.
- **Application framework.** Next.js 14 is in maintenance; moving to a supported major version is a follow-up.
- **Performance.** Frame-rate measurements on a range of devices have not been made. The renderer lowers its resolution when the frame rate drops, but this behaviour has not been measured and documented.
- **Colour temperature of moonlight.** No primary source with an uncertainty was found for the value of 4100 K.
- **Licences.** The origin and licence of the 3D models are to be confirmed, and a licence is to be chosen for the project (see Section 10).

### 12. Selected references

The following are the sources this text relies on. The complete, annotated bibliography is part of the dossier (`src/dossier/references.ts`); it also records for each entry whether the source itself was read.

- Boas, M. L. (1961). Apparent Shape of Large Objects at Relativistic Speeds. _American Journal of Physics 29 (5), 283–286_. [doi:10.1119/1.1937751](https://doi.org/10.1119/1.1937751)
- Commission Internationale de l’Éclairage (2018). CIE 015:2018 Colorimetry, 4th Edition. _CIE, Vienna_. [doi:10.25039/TR.015.2018](https://doi.org/10.25039/TR.015.2018)
- Einstein, A. (1905). Zur Elektrodynamik bewegter Körper. _Annalen der Physik 17 (322, no. 10), 891–921_. [doi:10.1002/andp.19053221004](https://doi.org/10.1002/andp.19053221004)
- Einstein, A. (1949). Autobiographical Notes (Autobiographisches). _In: Schilpp, P. A. (ed.), Albert Einstein: Philosopher-Scientist. The Library of Living Philosophers VII, Evanston, pp. 2–95_.
- Kraus, U. (2000). Brightness and color of rapidly moving objects: The visual appearance of a large sphere revisited. _American Journal of Physics 68 (1), 56–60_. [doi:10.1119/1.19373](https://doi.org/10.1119/1.19373)
- McKinley, J. M. (1980). Relativistic transformation of solid angle. _American Journal of Physics 48 (8), 612–614_. [doi:10.1119/1.12329](https://doi.org/10.1119/1.12329)
- McKinley, J. M.; Doherty, P. (1979). In search of the “starbow”: The appearance of the starfield from a relativistic spaceship. _American Journal of Physics 47 (4), 309–316_. [doi:10.1119/1.11834](https://doi.org/10.1119/1.11834)
- Norton, J. D. (2013). Chasing the Light: Einstein’s Most Famous Thought Experiment. _In: Frappier, M.; Meynell, L.; Brown, J. R. (eds.), Thought Experiments in Science, Philosophy, and the Arts. Routledge, New York, pp. 123–140_. [doi:10.4324/9780203113271-15](https://doi.org/10.4324/9780203113271-15)
- Okun, L. B. (1989). The Concept of Mass. _Physics Today 42 (6), 31–36_. [doi:10.1063/1.881171](https://doi.org/10.1063/1.881171)
- Peebles, P. J. E.; Wilkinson, D. T. (1968). Comment on the Anisotropy of the Primeval Fireball. _Physical Review 174 (5), 2168_. [doi:10.1103/PhysRev.174.2168](https://doi.org/10.1103/PhysRev.174.2168)
- Penrose, R. (1959). The apparent shape of a relativistically moving sphere. _Proceedings of the Cambridge Philosophical Society 55 (1), 137–139_. [doi:10.1017/S0305004100033776](https://doi.org/10.1017/S0305004100033776)
- Reinhard, E.; Stark, M.; Shirley, P.; Ferwerda, J. (2002). Photographic tone reproduction for digital images. _ACM Transactions on Graphics 21 (3), 267–276_. [doi:10.1145/566654.566575](https://doi.org/10.1145/566654.566575)
- Rybicki, G. B.; Lightman, A. P. (1979). Radiative Processes in Astrophysics, Sec. 4.9. _John Wiley & Sons, New York_. [doi:10.1002/9783527618170](https://doi.org/10.1002/9783527618170)
- Sänger, E. (1958). Einige optische und kinematische Effekte in der interstellaren Raumfahrt. _Zeitschrift für angewandte Mathematik und Physik 9 (5–6), 591–600_. [doi:10.1007/BF02424777](https://doi.org/10.1007/BF02424777)
- Savage, C. M.; Searle, A.; McCalman, L. (2007). Real Time Relativity: Exploratory learning of special relativity. _American Journal of Physics 75 (9), 791–798_. [doi:10.1119/1.2744048](https://doi.org/10.1119/1.2744048)
- Terrell, J. (1959). Invisibility of the Lorentz Contraction. _Physical Review 116 (4), 1041–1045_. [doi:10.1103/PhysRev.116.1041](https://doi.org/10.1103/PhysRev.116.1041)
- Weiskopf, D.; Kraus, U.; Ruder, H. (1999). Searchlight and Doppler effects in the visualization of special relativity: a corrected derivation of the transformation of radiance. _ACM Transactions on Graphics 18 (3), 278–292_. [doi:10.1145/336414.336459](https://doi.org/10.1145/336414.336459)
- Weiskopf, D.; Kobras, D.; Ruder, H. (2000). Real-world relativity: image-based special relativistic visualization. _Proceedings of IEEE Visualization 2000, 303–310_. [doi:10.1109/VISUAL.2000.885709](https://doi.org/10.1109/VISUAL.2000.885709)
