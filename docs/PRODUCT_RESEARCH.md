# SAH World — Ürün Araştırması ve Tasarım Yönü

Tarih: 21 Ağustos 2026

Bu çalışma, güncel resmî ürün sayfaları ve yardım merkezlerindeki doğrulanabilir özelliklere dayanır. Amaç ekran kopyalamak değil; olgun ürünlerin ortak bilgi mimarisi ve davranış desenlerini SAH World'ün Türkçe, mahrem ve yargılamayan karakterine uyarlamaktır.

## Araştırma matrisi

| Ürün | Güçlü desen | Kullanıcı açısından değeri | SAH World'e uyarlanan kısım | Bilinçli olarak alınmayan kısım |
|---|---|---|---|---|
| [Calm](https://support.calm.com/hc/en-us/articles/9699990936731-How-to-Use-Check-Ins-Mood-Sleep-Gratitude-Tracker) | Duygu, uyku, şükür ve düşünceyi ayrı ama sakin check-in akışlarında toplama | Kullanıcı ne kaydedeceğini hızlı seçer; geniş içerik kataloğunda kaybolmaz | Bugünün hızlı kayıt eylemleri ve düşük baskılı mikro metin | İçerik kataloğu/abonelik vitrini ve yoğun görsel medya |
| [Headspace](https://www.headspace.com/how-it-works) | Kısa yönlendirmeler, konu bazlı kütüphane ve anlaşılır animasyon | İlk kullanımda tek bir sonraki adımı görünür kılar | Giriş ekranında net değer önerisi, seviye sahnesinde açıklayıcı hareket | Sağlık sonucu iddiaları ve maskot/marka estetiği |
| [Finch](https://help.finchcare.com/hc/en-us/articles/37935669335309-Our-Approach-to-Self-Care) | Küçük günlük adımlar, destekleyici dil ve gelişen eşlikçi metaforu | Öz bakımın görev gibi hissettirmemesini hedefler | Yargılamayan dil, küçük adım vurgusu, gelişen doğa sahnesi | Evcil hayvan ekonomisi, kozmetik ödüller ve çocuklaşmış ton |
| [Fabulous](https://help.thefabulous.co/en/support/solutions/articles/101000427430-how-does-fabulous-work-) | Sabah/öğle/akşam rutinleri ve kademeli yolculuklar | Davranışı tek seferlik hedef yerine sürdürülebilir akışa dönüştürür | Bugün alanı, tek öncelikli eylem ve haftalık içgörü | Uzun onboarding, agresif upsell ve çok katmanlı program kataloğu |
| [Day One](https://dayoneapp.com/privacy-pledge/) | Mahremiyeti ürün vaadinin merkezine koyan yazma deneyimi | Günlük kaydında güven ve sahiplik hissini artırır | Sidebar mahremiyet notu, sade yazma yüzeyleri, özel veriye açık vurgu | Editoryal/medya ağırlıklı günlük özellikleri ve marka görünümü |
| [Linear](https://linear.app/now/behind-the-latest-design-refresh) | Ana işi öne çıkarıp navigasyonu geri çeken disiplinli kabuk | Karmaşık ürünlerde yön duygusunu korur, görsel gürültüyü azaltır | Gruplu sol sidebar, sayfa bağlamı header'ı, sınırlı yüzey seviyesi | Koyu teknoloji estetiği ve geliştiriciye özgü bilgi yoğunluğu |
| [Strava](https://support.strava.com/en-us/articles/15402014-viewing-your-activity-history-on-strava) | Kişisel ilerleme özeti, filtrelenebilir geçmiş ve topluluk katmanı | Aktivitenin zaman içindeki anlamını görünür kılar | Son faaliyetler, haftalık aktif gün ve ayrıntıyı raporlara taşıma | Rekabeti merkeze alan sıralama ve kamusal paylaşım varsayımı |
| [GitHub](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference) | Günlük yoğunluğu tek bakışta gösteren contribution graph | Uzun dönemde istikrar desenini anlaşılır kılar | Raporlardaki faaliyet ısı haritası ve metinsel grafik özeti | Sayıyı başarı/kişisel değer gibi sunma ve herkese açık profil modeli |

Focus To-Do ekranları kullanıcı tarafından işlevsel referans olarak sağlandı. Grup kodu, faaliyet akışı ve rapor hiyerarşisi incelendi; görsel düzeni, rengi veya marka öğeleri kopyalanmadı.

## Ortak desenlerden çıkan kararlar

- İlk kullanım: Giriş sonrası pazarlama sayfası değil, bugünün durumu ve tek bir güvenli başlangıç eylemi gösterilir.
- Giriş: Google birincil; e-posta OTP erişilebilir alternatif. Mahremiyet açıklaması giriş eyleminin hemen yanında kalır.
- Bilgi hiyerarşisi: Masaüstünde gruplu sidebar, sayfaya özel ince header; mobilde ayrı alt navigasyon ve “Daha” paneli.
- İlerleme: XP, yalnızca uygulama içi istikrarı temsil eder. Manevi seviye, iman veya üstünlük iddiası kurulmaz.
- Görsel hikâye: Aynı doğa dünyası; toprak, ışık, bitki, ufuk ve kozmik derinlik katmanlarıyla 10 seviyede gelişir.
- Faaliyet geçmişi: Son hareketler ana ekranda sınırlı; ayrıntı, filtre ve uzun dönem analizi Raporlarım'da kalır.
- Topluluk: Önce kişinin kendi gelişimi; sosyal görünürlük yalnızca üyelik ve mevcut RLS sınırları içinde.
- Boş durumlar: “Eksik” veya “başarısız” dili yerine, ilk güvenli eylemi açıklayan kısa yönlendirme.
- Hareket: Kısa, anlamlı ve `prefers-reduced-motion` ile devre dışı bırakılabilir.
- Mahremiyet: Navigasyon, giriş ve form alanlarında görünür; güvenlik yalnızca metin değil, RLS ve sunucu doğrulamasıyla uygulanır.

## SAH World ürün karakteri

Sakin, güvenilir, olgun, sıcak ve umut veren. Ürün, kullanıcının kendisini yargılanmadan gözlemleyebildiği özel bir alan gibi davranır. Indigo/violet marka rengi odak ve ilerleme için sınırlı kullanılır; başarı durumları yeşil, uyarılar amber, hatalar muted kırmızı ile ayrılır.
