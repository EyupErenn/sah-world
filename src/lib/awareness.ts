export type Geography = 'filistin' | 'dogu_turkistan'
export type QuizOption = 'A' | 'B' | 'C' | 'D'

export type AwarenessContent = {
  id: string
  geography: Geography
  section: 'history' | 'displacement' | 'today' | 'human' | 'detention' | 'culture' | 'solidarity'
  sectionTitle: string
  contentBody: string
  sourceName: string
  sourceUrl: string
  displayOrder: number
  actionCue: string
}

export type AwarenessQuizQuestion = {
  id: string
  geography: Geography
  questionText: string
  options: Record<QuizOption, string>
  correctOption: QuizOption
  explanationText: string
  orderIndex: number
  sourceUrl: string
}

export type AwarenessOpening = {
  statement: string
  sourceName: string
  sourceUrl: string
}

export const GEOGRAPHY_META: Record<Geography, { name: string; short: string; icon: string; accent: string }> = {
  filistin: { name: 'Filistin', short: 'Nekbe’den bugüne hafıza, işgal ve sebat', icon: 'olive', accent: '#9f1239' },
  dogu_turkistan: { name: 'Doğu Türkistan', short: 'Tarih, kitlesel gözaltılar ve kültürel hafıza', icon: 'moon-stars', accent: '#b91c1c' },
}

export const AWARENESS_CONTENT_FALLBACK: AwarenessContent[] = [
  {
    id: 'p-nakba', geography: 'filistin', section: 'history', displayOrder: 1,
    sectionTitle: '1948: Nekbe ve mülksüzleştirme',
    contentBody: 'TRT Haber’in 15 Mayıs 2024 tarihli dosyası, 14 Mayıs 1948’de İsrail devletinin kurulması sürecinde Filistinlilerin zorunlu göçe maruz bırakılmasını ve 15 Mayıs’ın “Nekbe — Büyük Felaket” olarak anılmasını aktarıyor. Bu anlatı, toprağından edilme ile kuşaklar boyunca taşınan hafızayı birlikte ele alıyor.',
    sourceName: 'TRT Haber · Filistin’in 76 yıldır süren dramı: Nekbe',
    sourceUrl: 'https://www.trthaber.com/haber/dunya/filistinin-76-yildir-suren-drami-nekbe-857567.html',
    actionCue: 'Tarihi bir sloganla değil, tarih ve kaynak bağlantısıyla aktar.',
  },
  {
    id: 'p-refugees', geography: 'filistin', section: 'human', displayOrder: 4,
    sectionTitle: 'Sürgün, mültecilik ve geri dönüş iradesi',
    contentBody: 'Dijital Hafıza, Filistinli mültecileri 1948 Nekbesi veya 1967 Haziran Savaşı sonrasında evlerini terk etmek zorunda kalan ve geri dönüşleri engellenen siviller olarak tanımlıyor. Kaynak, farklı ülke ve kamplara dağılan insanların Filistinli kimliğine aidiyetlerini ve geri dönme iradesini sürdürdüğünü vurguluyor.',
    sourceName: 'Dijital Hafıza · Filistinli Mülteciler',
    sourceUrl: 'https://www.dijitalhafiza.com/kavramlar-sozlugu/filistinli-multeciler',
    actionCue: 'Mültecileri yalnızca sayı olarak değil; ev, aile ve aidiyet hikâyeleriyle hatırla.',
  },
  {
    id: 'p-occupation', geography: 'filistin', section: 'history', displayOrder: 2,
    sectionTitle: '1967 sonrası işgalin genişlemesi',
    contentBody: 'TRT Haber dosyası, İsrail’in 1967’deki Altı Gün Savaşı’nın ardından Batı Şeria ve Gazze Şeridi’ni ele geçirdiğini; sonraki yıllarda Filistin topraklarında yeni yerleşimlerin açıldığını aktarıyor. Bugünü anlamak, 1948 ile 1967 arasındaki sürekliliği birlikte görmeyi gerektiriyor.',
    sourceName: 'TRT Haber · Nekbe dosyası',
    sourceUrl: 'https://www.trthaber.com/haber/dunya/filistinin-76-yildir-suren-drami-nekbe-857567.html',
    actionCue: 'Bir güncel haberi paylaşmadan önce olayın 1948 ve 1967 bağlamını kontrol et.',
  },
  {
    id: 'p-gaza', geography: 'filistin', section: 'today', displayOrder: 3,
    sectionTitle: 'Gazze: tanıkların bugüne verdiği isim',
    contentBody: 'TRT Haber’in 12 Mayıs 2026 tarihli haberinde Gazze’de yaşayan Filistinliler, Ekim 2023’ten beri yaşadıklarını “soykırım” ve 1948’le kıyaslanamayacak ölçekte yeni bir Nekbe olarak nitelendiriyor. Haber; güvenli barınma, su, gıda, sağlık ve eğitim imkânlarından yoksun bırakılan ailelerin doğrudan anlatımlarını aktarıyor. Bu nitelemeler haberdeki tanıkların ve haber çerçevesinin ifadeleridir.',
    sourceName: 'TRT Haber · Gazzelilerin tanıklıkları',
    sourceUrl: 'https://www.trthaber.com/haber/dunya/filistinliler-yasadigimiz-soykirim-1948deki-nekbe-ile-kiyas-dahi-edilemez-944861.html',
    actionCue: 'İnsan onurunu koruyan, grafik görüntü içermeyen tanıklıkları kaynak bağlantısıyla paylaş.',
  },
  {
    id: 'p-prisoners', geography: 'filistin', section: 'detention', displayOrder: 5,
    sectionTitle: 'Mahpuslar ve tutuklular',
    contentBody: 'TRT Haber’in 5 Kasım 2025 tarihli haberinde Filistin Esir İşleri Kurumu Başkanı Raid Ebu Humus, cezaevlerindeki Filistinlilere yönelik sistematik işkence, aç bırakma, tecrit, nakil ve aşağılamadan söz ediyor. Haber, açıklamanın yapıldığı tarihte İsrail hapishanelerinde 10 binden fazla Filistinli bulunduğunu aktarıyor.',
    sourceName: 'TRT Haber · Filistin Esir İşleri Kurumu açıklaması',
    sourceUrl: 'https://www.trthaber.com/haber/dunya/filistin-esir-isleri-kurumu-baskani-israil-cezaevlerinde-sessiz-soykirim-uyguluyor-924909.html',
    actionCue: 'Mahpuslar hakkında konuşurken iddiayı kimin, hangi tarihte söylediğini görünür kıl.',
  },
  {
    id: 'p-sumud', geography: 'filistin', section: 'solidarity', displayOrder: 6,
    sectionTitle: 'Sebat, dayanışma ve sivil sorumluluk',
    contentBody: 'TRT Haber’in 25 Şubat 2026 tarihli haberi, Özgürlük ve Sumud Filosu’nun 150’yi aşkın ülkeden katılımcılarla ve 100’ü aşkın gemi ve tekneyle yola çıkacağının duyurulduğunu aktarıyor. Bu örnek, “sumud” adının uluslararası sivil dayanışma ve süreklilik fikriyle birlikte kullanıldığını gösteriyor.',
    sourceName: 'TRT Haber · Özgürlük ve Sumud Filosu',
    sourceUrl: 'https://www.trthaber.com/haber/dunya/ozgurluk-ve-sumud-filosu-12-nisanda-yeniden-akdenize-acilacak-935510.html',
    actionCue: 'Öfkeyi doğrulanabilir bilgiye, düzenli öğrenmeye ve barışçıl dayanışmaya dönüştür.',
  },
  {
    id: 'e-history', geography: 'dogu_turkistan', section: 'history', displayOrder: 1,
    sectionTitle: 'Tarihsel eşik: 1759',
    contentBody: 'Dijital Hafıza’nın zaman tüneli, Mançuların 1755’te Cungarya’yı ele geçirmesinin ardından Tanrı Dağları’nın güneyine ilerlediğini ve 1759’da Doğu Türkistan’ın ilk istilasını gerçekleştirdiğini anlatıyor. Kaynak, dönemin iç çekişmelerinin ortak direnişi zayıflattığını da vurguluyor.',
    sourceName: 'Dijital Hafıza Doğu Türkistan · Mançuların İlk İstilası',
    sourceUrl: 'https://doguturkistan.dijitalhafiza.com/zaman-tuneli/1759-mancularin-ilk-dogu-turkistan-istilasi',
    actionCue: 'Bugünü değerlendirirken coğrafyanın uzun tarihini tek bir döneme indirgeme.',
  },
  {
    id: 'e-detentions', geography: 'dogu_turkistan', section: 'today', displayOrder: 2,
    sectionTitle: 'Bugünün kapalı gerçeği',
    contentBody: 'Dijital Hafıza, Çin makamlarının “Mesleki Eğitim ve Öğretim Merkezi” adını kullandığı kapalı yapıları; hukuki süreç olmadan özgürlüğün sistematik biçimde kaldırıldığı yerler olarak tarif ediyor. Kaynak, kapalılık nedeniyle kesin ve güncel sayılara ulaşmanın güç olduğunu özellikle belirtiyor.',
    sourceName: 'Dijital Hafıza Doğu Türkistan · Toplama Kampları',
    sourceUrl: 'https://doguturkistan.dijitalhafiza.com/kavramlar-sozlugu/toplama-kamplari',
    actionCue: 'Doğrulanması güç sayıları tekrar etmek yerine kaynağın kesinlik sınırını koru.',
  },
  {
    id: 'e-camps', geography: 'dogu_turkistan', section: 'human', displayOrder: 3,
    sectionTitle: 'Bir hayatın geride bıraktıkları',
    contentBody: 'Dijital Hafıza’daki 7 Mayıs 2020 tarihli söyleşi, güvenlik nedeniyle tam adı ve yaşadığı şehir paylaşılmayan bir Uygur Türkünün hikâyesini aktarıyor. Kaynağın editoryal girişine göre kendisi, işini ve yakınlarını geride bırakarak eşi ve iki çocuğuyla yurt dışına çıkmak zorunda kaldı. Bu, büyük başlıkların ardındaki kayıp, aile ve belirsizlik boyutunu görünür kılan kişisel bir tanıklıktır.',
    sourceName: 'Dijital Hafıza Doğu Türkistan · Bir Doğu Türkistanlının Yaşadıkları',
    sourceUrl: 'https://doguturkistan.dijitalhafiza.com/kose-yazilari/bir-dogu-turkistanlinin-yasadiklari',
    actionCue: 'Tanıklığı sahibine atfederek oku; kişinin güvenlik için saklı tutulan kimliğine ve mahremiyetine saygı göster.',
  },
  {
    id: 'e-reeducation', geography: 'dogu_turkistan', section: 'culture', displayOrder: 4,
    sectionTitle: '“Yeniden eğitim” ve inanç baskısı',
    contentBody: 'Dijital Hafıza’nın kavram sayfası, “yeniden eğitim” adı altında Müslüman Uygurların inançlarıyla bağdaşmayan davranışlara zorlandığı uygulamaları aktarıyor. Bu anlatım, kamp politikasını yalnızca gözaltı değil, kimlik ve inanç üzerinde baskı iddiası olarak da ele alıyor.',
    sourceName: 'Dijital Hafıza Doğu Türkistan · Yeniden Eğitim',
    sourceUrl: 'https://doguturkistan.dijitalhafiza.com/kavramlar-sozlugu/yeniden-egitim',
    actionCue: 'Bir topluluğu yalnız mağduriyetle değil; dil, inanç, sanat ve gündelik hayatıyla da tanı.',
  },
  {
    id: 'e-suppression', geography: 'dogu_turkistan', section: 'solidarity', displayOrder: 5,
    sectionTitle: 'Dili yaşatmak, hafızayı geleceğe taşımak',
    contentBody: 'Dijital Hafıza’nın biyografi sayfası, dilbilimci ve şair Abduweli Ayup’u Uygurca dil okulları kuran ve dil ile kültürün kuşaklar arası aktarım hakkını savunan bir eğitimci olarak tanıtıyor. Kültürel sebat burada yalnızca geçmişi hatırlamak değil; dili öğreterek geleceğe taşıyan somut bir emek olarak görünür oluyor.',
    sourceName: 'Dijital Hafıza Doğu Türkistan · Abduweli Ayup biyografisi',
    sourceUrl: 'https://doguturkistan.dijitalhafiza.com/biyografiler/abdulweli-ayup',
    actionCue: 'Bir halkı yalnızca maruz kaldığı baskıyla değil, dilini ve kültürünü yaşatma iradesiyle de tanı.',
  },
  {
    id: 'e-documentation', geography: 'dogu_turkistan', section: 'solidarity', displayOrder: 6,
    sectionTitle: 'Belgelemeden sorumluluğa',
    contentBody: 'TRT Haber’in 29 Aralık 2022 tarihli haberinde dönemin Dışişleri Bakanı Mevlüt Çavuşoğlu, BM İnsan Hakları Komiserinin görevden ayrılırken yayımladığı raporun ihlalleri ortaya koyduğunu söylüyor; bağımsız bir insani heyetin bölgeye erişebilmesi ve şeffaf inceleme yapılması gerektiğini vurguluyor.',
    sourceName: 'TRT Haber · BM raporu ve şeffaf inceleme açıklaması',
    sourceUrl: 'https://www.trthaber.com/haber/gundem/bakan-cavusoglu-rejim-de-teror-tehdidinin-farkinda-ortak-mucadele-olabilir-734259.html',
    actionCue: 'Sosyal medya özetleri yerine erişilebilir raporları ve açık kaynak zincirini takip et.',
  },
]

const q = (id: string, geography: Geography, orderIndex: number, questionText: string, options: [string, string, string, string], correctOption: QuizOption, explanationText: string, sourceUrl: string): AwarenessQuizQuestion => ({ id, geography, orderIndex, questionText, options: { A: options[0], B: options[1], C: options[2], D: options[3] }, correctOption, explanationText, sourceUrl })

const P_NAKBA = 'https://www.trthaber.com/haber/dunya/filistinin-76-yildir-suren-drami-nekbe-857567.html'
const P_REFUGEES = 'https://www.dijitalhafiza.com/kavramlar-sozlugu/filistinli-multeciler'
const P_GAZA = 'https://www.trthaber.com/haber/dunya/filistinliler-yasadigimiz-soykirim-1948deki-nekbe-ile-kiyas-dahi-edilemez-944861.html'
const P_PRISONERS = 'https://www.trthaber.com/haber/dunya/filistin-esir-isleri-kurumu-baskani-israil-cezaevlerinde-sessiz-soykirim-uyguluyor-924909.html'
const P_SUMUD = 'https://www.trthaber.com/haber/dunya/ozgurluk-ve-sumud-filosu-12-nisanda-yeniden-akdenize-acilacak-935510.html'
const E_HISTORY = 'https://doguturkistan.dijitalhafiza.com/zaman-tuneli/1759-mancularin-ilk-dogu-turkistan-istilasi'
const E_CAMPS = 'https://doguturkistan.dijitalhafiza.com/kavramlar-sozlugu/toplama-kamplari'
const E_REEDUCATION = 'https://doguturkistan.dijitalhafiza.com/kavramlar-sozlugu/yeniden-egitim'
const E_TRT = 'https://www.trthaber.com/haber/gundem/cin-makamlarini-toplama-kamplarini-kapatmaya-davet-ediyoruz-404380.html'
const E_REPORT = 'https://www.trthaber.com/haber/gundem/bakan-cavusoglu-rejim-de-teror-tehdidinin-farkinda-ortak-mucadele-olabilir-734259.html'

export const AWARENESS_QUIZ_FALLBACK: AwarenessQuizQuestion[] = [
  q('p-01','filistin',1,'TRT Haber dosyasına göre Nekbe hangi Türkçe ifadeyle açıklanır?',['Büyük Felaket','Uzun Yolculuk','Sessiz Bahar','Yeni Başlangıç'],'A','TRT Haber, Nekbe ifadesini “Büyük Felaket” olarak açıklar.',P_NAKBA),
  q('p-02','filistin',2,'TRT Haber’e göre Nekbe hangi tarihte anılır?',['15 Mayıs','1 Ocak','29 Ekim','10 Aralık'],'A','İsrail devletinin 14 Mayıs 1948’de kurulmasının ertesi günü olan 15 Mayıs, Nekbe olarak anılır.',P_NAKBA),
  q('p-03','filistin',3,'1967’deki savaşın ardından İsrail’in ele geçirdiği iki bölge hangileridir?',['Batı Şeria ve Gazze Şeridi','Ürdün ve Lübnan','Kahire ve Şam','Kıbrıs ve Girit'],'A','TRT Haber dosyası 1967’nin ardından Batı Şeria ve Gazze Şeridi’nin ele geçirildiğini aktarır.',P_NAKBA),
  q('p-04','filistin',4,'Dijital Hafıza, Filistinli mültecileri hangi iki tarihsel eşikle ilişkilendirir?',['1948 Nekbesi ve 1967 Haziran Savaşı','1914 ve 1918','1973 ve 1974','2001 ve 2005'],'A','Kavram sayfası, zorunlu göçü 1948 Nekbesi ve 1967 Haziran Savaşı sonrasıyla ilişkilendirir.',P_REFUGEES),
  q('p-05','filistin',5,'Dijital Hafıza’ya göre Filistinli mülteciler hangi iradeyi sürdürmektedir?',['Topraklarına dönme iradesini','Kimliklerini unutma iradesini','Kayıtları silme iradesini','Tarihi kapatma iradesini'],'A','Kaynak, mültecilerin geri dönüş iradesini ve Filistinli kimliğine aidiyetini koruduğunu vurgular.',P_REFUGEES),
  q('p-06','filistin',6,'12 Mayıs 2026 tarihli TRT Haber, bugünkü Gazze’yi en çok kimlerin anlatımıyla aktarır?',['Gazze’de yaşayan Filistinlilerin','Spor yorumcularının','Turizm şirketlerinin','Teknoloji yöneticilerinin'],'A','Haber, çadırlarda yaşayan Gazze sakinlerinin doğrudan tanıklıklarına yer verir.',P_GAZA),
  q('p-07','filistin',7,'TRT Haber’de cezaevi koşullarına ilişkin açıklamayı yapan kurum hangisidir?',['Filistin Esir İşleri Kurumu','Dünya Meteoroloji Örgütü','Uluslararası Olimpiyat Komitesi','Avrupa Uzay Ajansı'],'A','Açıklama Filistin Esir İşleri Kurumu Başkanı Raid Ebu Humus’a aittir.',P_PRISONERS),
  q('p-08','filistin',8,'Raid Ebu Humus’un aktarılan açıklamasında mahpuslara yönelik uygulamalardan biri hangisidir?',['Tecrit','Burs programı','Ücretsiz seyahat','Spor kampı'],'A','TRT Haber, açıklamada sistematik işkence, aç bırakma, tecrit, nakil ve aşağılamanın sayıldığını aktarır.',P_PRISONERS),
  q('p-09','filistin',9,'Özgürlük ve Sumud Filosu için duyurulan hareket tarihi hangisidir?',['12 Nisan 2026','15 Mayıs 2024','1 Ocak 2027','10 Aralık 2025'],'A','TRT Haber, filonun 12 Nisan 2026’da İspanya’dan açılacağının duyurulduğunu bildirir.',P_SUMUD),
  q('p-10','filistin',10,'TRT Haber’e göre Özgürlük ve Sumud Filosu kaçtan fazla ülkeden katılımcı hedefliyordu?',['150’den fazla','10’dan fazla','25’ten fazla','50’den fazla'],'A','Haberde 150’yi aşkın ülkeden binlerce katılımcı ifadesi yer alır.',P_SUMUD),
  q('e-01','dogu_turkistan',1,'Dijital Hafıza zaman tüneline göre Mançuların ilk Doğu Türkistan istilası hangi yılda gerçekleşti?',['1759','1453','1918','2001'],'A','Zaman tüneli, ilk istilayı 1759 yılına tarihler.',E_HISTORY),
  q('e-02','dogu_turkistan',2,'Mançular 1755’te hangi bölgeyi ele geçirdikten sonra güneye ilerledi?',['Cungarya','Anadolu','Balkanlar','Hicaz'],'A','Kaynak, Mançuların 1755’te Cungarya’yı ele geçirdiğini anlatır.',E_HISTORY),
  q('e-03','dogu_turkistan',3,'Dijital Hafıza, kamp olarak tarif ettiği yapılarda hangi temel soruna dikkat çeker?',['Hukuki süreç olmadan özgürlükten alıkoymaya','Ulaşım planlamasına','Turizm eğitimine','Spor organizasyonuna'],'A','Kavram sayfası, hukuki süreç olmadan özgürlüğün sistematik biçimde kaldırıldığı iddiasını aktarır.',E_CAMPS),
  q('e-04','dogu_turkistan',4,'Kaynak, kamp verilerinde kesinliğin neden sınırlı olduğunu söyler?',['Gizlilik ve kapalılık politikaları','Mevsim değişikliği','Harita ölçeği','Dilbilgisi farkı'],'A','Dijital Hafıza, gizlilik ve kapalılık nedeniyle net ve güncel bilgilere ulaşmanın güç olduğunu belirtir.',E_CAMPS),
  q('e-05','dogu_turkistan',5,'Dijital Hafıza’ya göre kamplar için kullanılan resmî adlandırma hangisidir?',['Mesleki Eğitim ve Öğretim Merkezi','Açık Üniversite Kampüsü','Kültür ve Spor Köyü','Turizm Eğitim Parkı'],'A','Kavram sayfası, Çin makamlarının “Mesleki Eğitim ve Öğretim Merkezi” adını kullandığını aktarır.',E_CAMPS),
  q('e-06','dogu_turkistan',6,'Dijital Hafıza, kamp verilerinde kesinliğin neden sınırlı olduğunu söyler?',['Gizlilik ve kapalılık politikaları','Mevsim değişikliği','Harita ölçeği','Dilbilgisi farkı'],'A','Kaynak, gizlilik ve kapalılık nedeniyle net bilgilere ulaşmanın güç olduğunu açıkça belirtir.',E_CAMPS),
  q('e-07','dogu_turkistan',7,'“Yeniden eğitim” kavram sayfası baskıyı hangi alanla da ilişkilendirir?',['Dinî inanç ve gündelik pratiklerle','Yalnız trafik eğitimiyle','Yalnız sporla','Yalnız hava durumuyla'],'A','Kaynak, Müslüman Uygurların inançlarıyla bağdaşmayan davranışlara zorlandığı iddialarını aktarır.',E_REEDUCATION),
  q('e-08','dogu_turkistan',8,'TRT Haber’de aktarılan “Tüm Dinlerin ve İnançların Çinlileştirilmesi” siyaseti hangi yıl ilan edildi?',['2017','1990','2005','2024'],'A','Dışişleri Bakanlığı açıklaması, bu siyasetin Ekim 2017’de ilan edildiğini belirtir.',E_TRT),
  q('e-09','dogu_turkistan',9,'TRT Haber’e göre Türkiye Dışişleri Bakanlığı Çin makamlarına hangi çağrıyı yaptı?',['Kampları kapatma çağrısı','Yeni kamp açma çağrısı','Spor turnuvası çağrısı','Ticaret fuarı çağrısı'],'A','Haberde Uygurların temel insan haklarına saygı gösterilmesi ve kampların kapatılması çağrısı aktarılır.',E_TRT),
  q('e-10','dogu_turkistan',10,'TRT Haber’de dönemin Dışişleri Bakanı bölge için hangi yöntemi savunuyordu?',['Şeffaf inceleme ve insani heyet erişimi','Kaynağı belirsiz paylaşımlar','Tarihsiz söylentiler','Kapalı sosyal medya grupları'],'A','Haberde şeffaf iş birliği ve bağımsız bir insani heyetin bölgeyi inceleyebilmesi gerektiği vurgulanır.',E_REPORT),
]

export const AWARENESS_ACTIONS = {
  filistin: [
    { icon: 'book', title: 'Nekbe dosyasını kaynağından oku', body: '1948, zorunlu göç ve 1967 sonrası işgal bağlamını aynı dosyada incele.', href: P_NAKBA },
    { icon: 'users', title: 'Mültecilerin hafızasını tanı', body: 'Geri dönüş iradesini ve aidiyeti, Dijital Hafıza’nın kavram sayfasından oku.', href: P_REFUGEES },
    { icon: 'heart-handshake', title: 'Dayanışmayı doğrulanmış bilgiyle kur', body: 'Sumud Filosu haberini aç; tarih, aktör ve kapsamı kontrol ederek paylaş.', href: P_SUMUD },
  ],
  dogu_turkistan: [
    { icon: 'history', title: 'Tarih tünelini takip et', body: '1759 eşiğini ve bölgenin tarihsel sürekliliğini doğrudan kaynaktan incele.', href: E_HISTORY },
    { icon: 'file-description', title: 'Kavramları kaynaklarıyla öğren', body: 'Kamp ve yeniden eğitim ifadelerinin Dijital Hafıza’daki açıklamalarını karşılaştır.', href: E_CAMPS },
    { icon: 'shield-check', title: 'Şeffaf belgelemenin izini sür', body: 'TRT Haber’de aktarılan BM raporu ve insani heyet erişimi tartışmasını oku.', href: E_REPORT },
  ],
} as const

export const AWARENESS_OPENINGS: Record<Geography, AwarenessOpening> = {
  filistin: {
    statement: '14 Mayıs 1948’in ardından zorla yerinden edilen Filistinliler, 15 Mayıs’ı Nekbe — Büyük Felaket — olarak anıyor.',
    sourceName: 'TRT Haber · Nekbe dosyası',
    sourceUrl: P_NAKBA,
  },
  dogu_turkistan: {
    statement: 'Dijital Hafıza’nın zaman tüneli, 1759’u Mançuların Doğu Türkistan’daki ilk istilası olarak kayda geçiriyor.',
    sourceName: 'Dijital Hafıza Doğu Türkistan · 1759',
    sourceUrl: E_HISTORY,
  },
}

export const AWARENESS_MILESTONES: Record<Geography, string[]> = {
  filistin: ['1948', '1967', 'Bugün', 'İnsan', 'Mahpuslar', 'Sumud'],
  dogu_turkistan: ['1759', 'Bugün', 'Tanıklık', 'İnanç', 'Dil', 'Şeffaflık'],
}

export const HUMANITARIAN_ORGANIZATIONS = [
  {
    name: 'Türk Kızılay',
    note: 'Filistin için açılan resmî bağış sayfası; saha yardımlarını Filistin ve Mısır Kızılayı ile koordineli yürüttüğünü belirtiyor.',
    href: 'https://bagis.kizilay.org.tr/tr/bagis/bagisyap/32/filistin-genel-bagisi',
  },
  {
    name: 'UNICEF Türkiye',
    note: 'Çocukların eğitim, sağlık ve korunma ihtiyaçları için çalışan resmî bağış kanalı; kullanım şeffaflığı bağlantısını açıkça sunuyor.',
    href: 'https://www.unicefturk.org/',
  },
] as const

export const AWARENESS_SHARE_COPY: Record<Geography, { title: string; text: string; sourceUrl: string }> = {
  filistin: {
    title: 'Filistin: Hafızayı kaynağıyla koru',
    text: '15 Mayıs, 1948’de zorla yerinden edilen Filistinlilerin Nekbe — Büyük Felaket — olarak andığı gündür. Kaynaklı ve insan onurunu koruyan kısa anlatıyı SAH World’de oku.',
    sourceUrl: P_NAKBA,
  },
  dogu_turkistan: {
    title: 'Doğu Türkistan: Bilgiyi kaynağıyla taşı',
    text: 'Dijital Hafıza’nın zaman tüneli 1759’u Mançuların Doğu Türkistan’daki ilk istilası olarak kayda geçiriyor. Kaynaklı ve sakin anlatıyı SAH World’de oku.',
    sourceUrl: E_HISTORY,
  },
}

export const quizReward = (score: number) => 40 + score * 5
