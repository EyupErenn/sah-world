export type ProfessionTrack = {
  id: string
  professionName: string
  icon: string
  description: string
  colorAccent: string
}

export type LessonSource = { label: string; url: string }
export type ProfessionLessonContent = {
  openingType: 'ayet' | 'hadis'
  openingArabic?: string
  openingText: string
  explanation: string
  action: string
}

export type ProfessionLesson = {
  id: string
  trackId: string
  title: string
  orderIndex: number
  durationEstimateMinutes: number
  content: ProfessionLessonContent
  sourceReferences: LessonSource[]
  xpReward: number
}

export const PROFESSION_TRACKS: ProfessionTrack[] = [
  { id: 'muhendis', professionName: 'Mühendis', icon: 'settings-cog', description: 'Emniyet, hassasiyet ve kamusal sorumluluğu teknik kararların merkezine al.', colorAccent: '#4f46e5' },
  { id: 'lojistikci', professionName: 'Lojistikçi', icon: 'truck-delivery', description: 'Emaneti doğru zamanda, doğru şartlarda ve hakkaniyetle ulaştır.', colorAccent: '#0f766e' },
  { id: 'doktor', professionName: 'Doktor', icon: 'stethoscope', description: 'Tıbbî yeterliliği merhamet, mahremiyet ve zarar vermeme ilkesiyle birleştir.', colorAccent: '#be123c' },
  { id: 'ogretmen', professionName: 'Öğretmen', icon: 'school', description: 'Bilgiyi kolaylaştır, adil değerlendir ve her öğrencinin onurunu koru.', colorAccent: '#7c3aed' },
  { id: 'girisimci', professionName: 'Girişimci', icon: 'briefcase-2', description: 'Değer üretirken şeffaflık, helal kazanç ve paydaş hakkını birlikte gözet.', colorAccent: '#b45309' },
  { id: 'ogrenci', professionName: 'Öğrenci', icon: 'books', description: 'Öğrenmeyi niyet, doğrulama, emek ve faydaya dönüşen bilgiyle derinleştir.', colorAccent: '#2563eb' },
]

const SOURCES = {
  intention: { label: 'Sahih el-Buhârî 1 · Ameller niyetlere göredir', url: 'https://sunnah.com/bukhari:1' },
  trust: { label: 'Nisâ 4:58 · Emanet ve ehliyet', url: 'https://kuran.diyanet.gov.tr/mushaf/kuran-tefsir-1/nisa-suresi-4/ayet-58/diyanet-isleri-baskanligi-meali-1' },
  excellence: { label: 'Sahih Müslim 1955a · Her işte ihsan', url: 'https://sunnah.com/muslim:1955a' },
  honesty: { label: 'Sahih Müslim 102 · Aldatma yasağı', url: 'https://sunnah.com/muslim:102' },
  balance: { label: 'Sahih el-Buhârî 1968 · Her hak sahibine hakkı', url: 'https://sunnah.com/bukhari:1968' },
  justice: { label: 'Mâide 5:8 · Adalet takvâya daha yakındır', url: 'https://kuran.diyanet.gov.tr/mushaf/kuran-tefsir-1/M%C3%A2ide-S%C3%BBresi-5/ayet-6/kuran-yolu-meali-5' },
  measure: { label: 'İsrâ 17:35 · Ölçü ve tartıda doğruluk', url: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/isra-suresi-17/ayet-35/diyanet-isleri-baskanligi-meali-1' },
  contract: { label: 'Mâide 5:1 · Akitleri yerine getirme', url: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/maide-suresi-5/ayet-1/diyanet-isleri-baskanligi-meali-1' },
  expertise: { label: 'Nahl 16:43 · Bilmiyorsanız bilenlere sorun', url: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/nahl-suresi-16/ayet-43/diyanet-isleri-baskanligi-meali-1' },
  life: { label: 'Mâide 5:32 · Hayatı korumanın değeri', url: 'https://kuran.diyanet.gov.tr/mushaf/kuran-tefsir-1/maide-suresi-5/ayet-32/diyanet-isleri-baskanligi-meali-1' },
  ease: { label: 'Sahih el-Buhârî 69 · Kolaylaştırın, zorlaştırmayın', url: 'https://sunnah.com/bukhari:69' },
  trade: { label: 'Sahih el-Buhârî 2079 · Ticarette açıklık ve bereket', url: 'https://sunnah.com/bukhari:2079' },
  riba: { label: 'Bakara 2:275 · Alışveriş ve faiz ayrımı', url: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/bakara-suresi-2/ayet-275/diyanet-isleri-baskanligi-meali-1' },
  verify: { label: 'Hucurât 49:6 · Haberi araştırma sorumluluğu', url: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/hucurat-suresi-49/ayet-6/diyanet-isleri-baskanligi-meali-1' },
  knowledge: { label: 'Tâhâ 20:114 · “Rabbim, ilmimi artır”', url: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/taha-suresi-20/ayet-114/diyanet-isleri-baskanligi-meali-1' },
} as const

const common = [
  {
    title: 'Niyet: işi ibadet bilinciyle başlatmak', duration: 6,
    content: { openingType: 'hadis' as const, openingArabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', openingText: 'Ameller niyetlere göredir; herkese niyet ettiği vardır.', explanation: 'Meslek yalnızca gelir üreten bir rol değildir. Helal rızık, insanlara fayda ve sorumluluğu hakkıyla taşıma niyeti; aynı işi daha bilinçli, ölçülebilir ve dürüst yapmaya yön verir. Niyet, teknik standardın yerine geçmez; onu neden koruduğunu hatırlatır.', action: 'Bugünkü en önemli işinin başına tek cümlelik bir niyet yaz: “Bu işi ... faydası ve Allah’ın rızası için özenle tamamlayacağım.”' },
    source: SOURCES.intention,
  },
  {
    title: 'Amanah: yetki, bilgi ve zaman birer emanettir', duration: 7,
    content: { openingType: 'ayet' as const, openingArabic: 'إِنَّ اللَّهَ يَأْمُرُكُمْ أَنْ تُؤَدُّوا الْأَمَانَاتِ إِلَى أَهْلِهَا', openingText: 'Allah size, emanetleri mutlaka ehline vermenizi emrediyor.', explanation: 'Bir projeye erişim, müşteri bilgisi, kurum bütçesi, ekip zamanı ve verilen yetki emanet kapsamındadır. Emanet bilinci; gizliliği korumayı, çıkar çatışmasını bildirmeyi ve yetkin olmadığın konuda destek istemeyi profesyonel karakterin parçası yapar.', action: 'Bugün taşıdığın üç emaneti yaz: bilgi, zaman ve karar. Her biri için tek bir koruma davranışı belirle.' },
    source: SOURCES.trust,
  },
  {
    title: 'İhsan: kaliteyi görünür bir standarda dönüştürmek', duration: 8,
    content: { openingType: 'hadis' as const, openingArabic: 'إِنَّ اللَّهَ كَتَبَ الإِحْسَانَ عَلَى كُلِّ شَيْءٍ', openingText: 'Allah her şeyde ihsanı gerekli kılmıştır.', explanation: 'Sahih Müslim’deki hadis ihsanı somut bir uygulama üzerinden öğretir: işi özensizliğe bırakmamak ve gereksiz acıyı önlemek. Meslekte ihsan; kontrol listesi, akran incelemesi, hata kaydı ve sürekli iyileştirme gibi doğrulanabilir kalite pratikleriyle görünür olur.', action: 'Teslim edeceğin bir işi ikinci kez kontrol et; bulduğun bir iyileştirmeyi kayda geçir.' },
    source: SOURCES.excellence,
  },
  {
    title: 'Sıdk: hatayı ve sınırı saklamadan söylemek', duration: 7,
    content: { openingType: 'hadis' as const, openingArabic: 'مَنْ غَشَّ فَلَيْسَ مِنِّي', openingText: 'Bizi aldatan bizden değildir.', explanation: 'Bir kusuru, gecikmeyi, veri sınırını veya çıkar çatışmasını saklamak kısa vadede rahatlık sağlayabilir; fakat güveni ve karar kalitesini bozar. Profesyonel doğruluk, yalnızca yalan söylememek değil, karşı tarafın kararını etkileyen önemli bilgiyi zamanında açıklamaktır.', action: 'Bugün bir rapor veya konuşmada varsayım, risk ve kesin olmayan noktaları açıkça etiketle.' },
    source: SOURCES.honesty,
  },
  {
    title: 'Denge: işin, bedenin, ailenin ve ibadetin hakkı', duration: 6,
    content: { openingType: 'hadis' as const, openingArabic: 'فَأَعْطِ كُلَّ ذِي حَقٍّ حَقَّهُ', openingText: 'Her hak sahibine hakkını ver.', explanation: 'Sürekli tükenme hâli uzun vadede ne kişiye ne hizmet verdiği insanlara fayda sağlar. Sınır koymak, dinlenmek, ibadet vakitlerini ve aile sorumluluğunu planlamak; sürdürülebilir performansın ahlâkî tarafıdır.', action: 'Takviminde bugün iş, ibadet, dinlenme ve yakınların için gerçekçi birer zaman sınırı oluştur.' },
    source: SOURCES.balance,
  },
]

const specific: Record<string, Array<Omit<ProfessionLesson, 'id' | 'trackId' | 'orderIndex' | 'xpReward'>>> = {
  muhendis: [
    { title: 'Emniyet kararlarında adalet ve bağımsızlık', durationEstimateMinutes: 9, content: { openingType: 'ayet', openingArabic: 'اعْدِلُوا هُوَ أَقْرَبُ لِلتَّقْوَى', openingText: 'Adaletli olun; bu, takvâya daha uygundur.', explanation: 'Maliyet, takvim ve yönetim baskısı; emniyet gerekliliklerini gevşetmenin gerekçesi olamaz. Mühendis, riskleri kanıta dayalı biçimde görünür kılar, kritik kararı kayıt altına alır ve insan güvenliğini pazarlık konusu yapmaz.', action: 'Bir tasarım kararında en kötü makul senaryoyu ve onu azaltan kontrolü yaz.' }, sourceReferences: [SOURCES.justice] },
    { title: 'Ölçüm, tolerans ve doğrulanabilirlik', durationEstimateMinutes: 8, content: { openingType: 'ayet', openingArabic: 'وَأَوْفُوا الْكَيْلَ إِذَا كِلْتُمْ', openingText: 'Ölçtüğünüzde ölçmeyi tam yapın.', explanation: 'Kalibrasyon, tolerans, sürüm ve test sonucu doğru kaydedilmediğinde küçük sapmalar büyük güvenlik sorunlarına dönüşebilir. Ölçüde doğruluk; ham veriyi, yöntemi ve belirsizliği birlikte saklamayı gerektirir.', action: 'Bugün kullandığın bir ölçümün kaynağını, birimini, toleransını ve tarihini doğrula.' }, sourceReferences: [SOURCES.measure] },
    { title: 'Yetkinlik sınırı ve uzman görüşü', durationEstimateMinutes: 7, content: { openingType: 'ayet', openingArabic: 'فَاسْأَلُوا أَهْلَ الذِّكْرِ إِنْ كُنْتُمْ لَا تَعْلَمُونَ', openingText: 'Bilmiyorsanız bilgi sahibi olanlara sorun.', explanation: 'Yetkinlik sınırını bilmek zayıflık değil risk yönetimidir. Kritik bir alanda uzman incelemesi istemek; hem meslek etiğinin hem emanet bilincinin gereğidir.', action: 'Bu hafta uzman görüşü gerektiren tek bir teknik belirsizliği belirle ve doğru kişiye taşı.' }, sourceReferences: [SOURCES.expertise] },
  ],
  lojistikci: [
    { title: 'Taşınan malın ve bilginin emaneti', durationEstimateMinutes: 8, content: { openingType: 'ayet', openingArabic: 'إِنَّ اللَّهَ يَأْمُرُكُمْ أَنْ تُؤَدُّوا الْأَمَانَاتِ إِلَى أَهْلِهَا', openingText: 'Emanetleri mutlaka ehline verin.', explanation: 'Ürün güvenliği, sıcaklık zinciri, teslim bilgisi ve müşteri verisi birlikte korunur. Hasarı veya gecikmeyi gizlemek yerine erken bildirmek, emanetin sahibine karşı sorumluluktur.', action: 'Bir sevkiyatın teslim, sıcaklık/koşul ve hasar kontrol noktalarını tek listede doğrula.' }, sourceReferences: [SOURCES.trust] },
    { title: 'Sözleşme, süre ve teslim sözü', durationEstimateMinutes: 7, content: { openingType: 'ayet', openingArabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا أَوْفُوا بِالْعُقُودِ', openingText: 'Ey iman edenler! Akitleri yerine getirin.', explanation: 'Gerçekçi olmayan teslim sözü vermek bütün zinciri baskı altında bırakır. Kapasiteyi dürüst hesaplamak, gecikmeyi erken haber vermek ve değişikliği yazılı mutabakatla yönetmek ahlâkî bir tedarik pratiğidir.', action: 'Açık bir teslim sözünü kapasite, risk ve sorumlu kişi açısından yeniden doğrula.' }, sourceReferences: [SOURCES.contract] },
    { title: 'Dağıtım kararlarında hakkaniyet', durationEstimateMinutes: 8, content: { openingType: 'ayet', openingArabic: 'اعْدِلُوا هُوَ أَقْرَبُ لِلتَّقْوَى', openingText: 'Adaletli olun; bu, takvâya daha uygundur.', explanation: 'Kıt kapasiteyi dağıtırken yalnız en güçlü müşteriyi değil; aciliyeti, kırılganlığı ve sözleşme hakkını birlikte değerlendirmek gerekir. Karar kriterleri önceden tanımlanmalı ve denetlenebilir olmalıdır.', action: 'Bir öncelik kararının kriterlerini yaz ve aynı ölçünün herkese uygulanıp uygulanmadığını kontrol et.' }, sourceReferences: [SOURCES.justice] },
  ],
  doktor: [
    { title: 'Hayatı koruma ve klinik özen', durationEstimateMinutes: 9, content: { openingType: 'ayet', openingText: 'Kim bir canı kurtarırsa bütün insanların hayatını kurtarmış gibi olur.', explanation: 'Ayetin özgün bağlamı korunarak, hayatın dokunulmaz değerini hatırlatır. Klinik özen; doğru kimliklendirme, ilaç kontrolü, güncel rehber ve gerektiğinde konsültasyonla somutlaşır.', action: 'Bir hasta güvenliği kontrolünü bugün acele etmeden, çift doğrulamayla tamamla.' }, sourceReferences: [SOURCES.life] },
    { title: 'Mahremiyet ve tıbbî sır', durationEstimateMinutes: 8, content: { openingType: 'ayet', openingArabic: 'إِنَّ اللَّهَ يَأْمُرُكُمْ أَنْ تُؤَدُّوا الْأَمَانَاتِ إِلَى أَهْلِهَا', openingText: 'Allah size emanetleri ehline vermenizi emrediyor.', explanation: 'Hasta bilgisi merak konusu değil, korunması gereken bir emanettir. Yalnız bakım için gerekli kişilere, gerekli kadar bilgi vermek; ekran, konuşma ve kayıt güvenliğini birlikte düşünmek gerekir.', action: 'Çalışma alanında bir mahremiyet riskini bul ve bugün ortadan kaldır.' }, sourceReferences: [SOURCES.trust] },
    { title: 'Bilmediğinde danışmak, belirsizliği açıklamak', durationEstimateMinutes: 8, content: { openingType: 'ayet', openingArabic: 'فَاسْأَلُوا أَهْلَ الذِّكْرِ إِنْ كُنْتُمْ لَا تَعْلَمُونَ', openingText: 'Bilmiyorsanız bilgi sahibi olanlara sorun.', explanation: 'Tanısal belirsizliği saklamak yerine hastaya uygun dille açıklamak ve zamanında konsültasyon istemek güvenliği artırır. Yetkinlik sınırını tanımak, klinik tevazunun profesyonel karşılığıdır.', action: 'Bugün belirsiz kaldığın bir klinik konuda rehber veya uzman görüşünü kayıtlı biçimde doğrula.' }, sourceReferences: [SOURCES.expertise] },
  ],
  ogretmen: [
    { title: 'Kolaylaştıran ve ümit veren öğretim', durationEstimateMinutes: 8, content: { openingType: 'hadis', openingArabic: 'يَسِّرُوا وَلاَ تُعَسِّرُوا وَبَشِّرُوا وَلاَ تُنَفِّرُوا', openingText: 'Kolaylaştırın, zorlaştırmayın; müjdeleyin, nefret ettirmeyin.', explanation: 'Kolaylaştırmak beklentiyi düşürmek değildir. Hedefi görünür kılmak, örnek vermek, küçük geri bildirim döngüleri kurmak ve öğrenciyi utandırmadan düzeltmek öğrenme yükünü yönetir.', action: 'Bir konuyu üç küçük adıma böl ve öğrencinin ilk başarıyı erken görmesini sağla.' }, sourceReferences: [SOURCES.ease] },
    { title: 'Değerlendirmede adalet', durationEstimateMinutes: 8, content: { openingType: 'ayet', openingArabic: 'اعْدِلُوا هُوَ أَقْرَبُ لِلتَّقْوَى', openingText: 'Adaletli olun; bu, takvâya daha uygundur.', explanation: 'Notlandırma ölçütünü önceden açıklamak, benzer performansa benzer karşılık vermek ve itirazı dinlemek öğretmenin emanetidir. Sevgi veya kızgınlık değerlendirme standardını değiştirmemelidir.', action: 'Bir ödev için üç açık ölçüt yaz ve öğrencilere değerlendirmeden önce göster.' }, sourceReferences: [SOURCES.justice] },
    { title: 'Bilginin sınırını dürüstçe göstermek', durationEstimateMinutes: 7, content: { openingType: 'ayet', openingArabic: 'فَاسْأَلُوا أَهْلَ الذِّكْرِ إِنْ كُنْتُمْ لَا تَعْلَمُونَ', openingText: 'Bilmiyorsanız bilgi sahibi olanlara sorun.', explanation: '“Bilmiyorum, araştırıp döneceğim” demek öğretmen otoritesini azaltmaz; güvenilir öğrenme modeli kurar. Kaynak göstermek ve düzeltme yapmak öğrenciye epistemik dürüstlük öğretir.', action: 'Bu hafta cevaplayamadığın bir soruyu güvenilir kaynaktan doğrula ve sınıfa geri dön.' }, sourceReferences: [SOURCES.expertise] },
  ],
  girisimci: [
    { title: 'Satışta açıklık ve kusuru saklamamak', durationEstimateMinutes: 9, content: { openingType: 'hadis', openingText: 'Taraflar doğru söyler ve malın özelliklerini açıklarsa alışverişleri bereketlenir; yalan söyler ve gizlerlerse bereketi giderilir.', explanation: 'Fiyat, kapsam, risk, yenileme ve ürün sınırlarını görünür kılmak güvenilir satışın temelidir. Kısa vadeli dönüşüm uğruna önemli kusuru saklamak, müşterinin iradesini bozar.', action: 'Satış sayfanda veya teklifinde müşterinin kararını etkileyen bir sınırlamayı daha görünür hâle getir.' }, sourceReferences: [SOURCES.trade] },
    { title: 'Helal finans ve riba hassasiyeti', durationEstimateMinutes: 9, content: { openingType: 'ayet', openingArabic: 'وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا', openingText: 'Allah alışverişi helâl, faizi haram kılmıştır.', explanation: 'Finansman modeli yalnız nakit akışı değil, dinî ve hukukî değerlendirme gerektiren bir tasarımdır. Şüpheli yapıları pazarlama etiketiyle meşrulaştırmak yerine ehil fıkıh ve finans uzmanlarından somut sözleşme üzerinden görüş alınmalıdır.', action: 'Kullandığın bir finansman sözleşmesini faiz, gecikme ve ceza maddeleri açısından ehil uzmana inceletmek üzere işaretle.' }, sourceReferences: [SOURCES.riba, SOURCES.expertise] },
    { title: 'Çalışan, müşteri ve yatırımcı hakkı', durationEstimateMinutes: 8, content: { openingType: 'ayet', openingArabic: 'اعْدِلُوا هُوَ أَقْرَبُ لِلتَّقْوَى', openingText: 'Adaletli olun; bu, takvâya daha uygundur.', explanation: 'Büyüme hedefi; ücret, çalışma yükü, müşteri sözü ve yatırımcı bilgisini birbirine ezdirmemelidir. Kararın kazancını ve yükünü kimlerin taşıdığını açıkça görmek adil yönetişimin başlangıcıdır.', action: 'Yakın bir karar için “kim fayda görüyor, kim risk taşıyor?” tablosu çıkar.' }, sourceReferences: [SOURCES.justice] },
  ],
  ogrenci: [
    { title: 'İlmi artırma duası ve öğrenme hedefi', durationEstimateMinutes: 7, content: { openingType: 'ayet', openingArabic: 'رَبِّ زِدْنِي عِلْمًا', openingText: 'Rabbim, ilmimi artır!', explanation: 'Bilgi biriktirmek kadar onu anlamak, doğrulamak ve faydaya dönüştürmek önemlidir. İyi öğrenme hedefi “çalışacağım” yerine neyi, ne kadar ve nasıl geri çağıracağını söyler.', action: 'Bugün için ölçülebilir tek hedef yaz: konu + süre + kendini sınama yöntemi.' }, sourceReferences: [SOURCES.knowledge] },
    { title: 'Kaynağı doğrulamak ve intihalden kaçınmak', durationEstimateMinutes: 8, content: { openingType: 'ayet', openingText: 'Size bir haber getiren olursa, bilmeden bir topluluğa zarar verip pişman olmamak için doğruluğunu araştırın.', explanation: 'Kaynak doğrulama yalnız haber için değil; ödev, sunum ve araştırma için de ahlâkî bir disiplindir. Başkasının fikrini kendi sözü gibi göstermek öğrenmeyi ve güveni zedeler.', action: 'Bir ödevindeki üç iddianın asıl kaynağını bul; alıntı ve atıfları açıkça düzelt.' }, sourceReferences: [SOURCES.verify] },
    { title: 'Bilmediğini sormak ve geri bildirim istemek', durationEstimateMinutes: 7, content: { openingType: 'ayet', openingArabic: 'فَاسْأَلُوا أَهْلَ الذِّكْرِ إِنْ كُنْتُمْ لَا تَعْلَمُونَ', openingText: 'Bilmiyorsanız bilgi sahibi olanlara sorun.', explanation: 'Soru sormak hazırlıksızlığın değil, öğrenme sorumluluğunun parçasıdır. Önce neyi denediğini göstermek, soruyu daraltmak ve geri bildirimi uygulamak öğrenme çevrimini güçlendirir.', action: 'Takıldığın konuyu “bildiğim / denediğim / anlamadığım” şeklinde üç satırla bir uzmana sor.' }, sourceReferences: [SOURCES.expertise] },
  ],
}

export const PROFESSION_LESSONS: ProfessionLesson[] = PROFESSION_TRACKS.flatMap((track) => [
  ...common.map((lesson, index) => ({
    id: `${track.id}-${index + 1}`,
    trackId: track.id,
    title: lesson.title,
    orderIndex: index + 1,
    durationEstimateMinutes: lesson.duration,
    content: lesson.content,
    sourceReferences: [lesson.source],
    xpReward: 30,
  })),
  ...specific[track.id].map((lesson, index) => ({ ...lesson, id: `${track.id}-${index + 6}`, trackId: track.id, orderIndex: index + 6, xpReward: 30 })),
])

export function professionProgress(completedLessonIds: Set<string>, trackId: string) {
  const lessons = PROFESSION_LESSONS.filter((lesson) => lesson.trackId === trackId)
  const completed = lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length
  return { completed, total: lessons.length, percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0 }
}
