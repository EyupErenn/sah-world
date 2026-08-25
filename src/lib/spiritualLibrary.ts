export type AsmaName = {
  order: number
  arabic: string
  transliteration: string
  meaning: string
  reflection: string
}

export type DuaCategory = 'Kuran’dan Dualar' | 'Hadislerden Dualar' | 'Sahabeye Öğretilen Dualar'

export type DuaItem = {
  id: string
  category: DuaCategory
  occasion: 'Günlük' | 'Tövbe' | 'Aile' | 'Sıkıntı' | 'Sağlık' | 'Yolculuk' | 'İlim' | 'İbadet' | 'İman'
  title: string
  arabic: string
  meaning: string
  source: string
  sourceUrl: string
  context: string
}

const RAW_ASMA: Array<[string, string, string]> = [
  ['اللّٰه', 'Allah', 'Bütün kemal sıfatlarını kendinde toplayan yüce Zât’ın özel ismi'],
  ['الرَّحْمٰنُ', 'er-Rahmân', 'Rahmeti bütün varlığı kuşatan'],
  ['الرَّحِيمُ', 'er-Rahîm', 'Merhameti sürekli ve bol olan'],
  ['الْمَلِكُ', 'el-Melik', 'Mülkün gerçek sahibi ve hükümdarı'],
  ['الْقُدُّوسُ', 'el-Kuddûs', 'Her eksiklikten uzak ve tertemiz olan'],
  ['السَّلَامُ', 'es-Selâm', 'Esenliğin kaynağı, kusurdan uzak olan'],
  ['الْمُؤْمِنُ', 'el-Mü’min', 'Güven veren ve emniyete kavuşturan'],
  ['الْمُهَيْمِنُ', 'el-Müheymin', 'Her şeyi gözetip koruyan'],
  ['الْعَزِيزُ', 'el-Azîz', 'Mutlak izzet sahibi, yenilmez olan'],
  ['الْجَبَّارُ', 'el-Cebbâr', 'Kudreti üstün, kırıkları onaran'],
  ['الْمُتَكَبِّرُ', 'el-Mütekebbir', 'Büyüklükte eşi olmayan'],
  ['الْخَالِقُ', 'el-Hâlık', 'Her şeyi ölçüyle yaratan'],
  ['الْبَارِئُ', 'el-Bâri’', 'Varlıkları örneksiz ve uyumlu yaratan'],
  ['الْمُصَوِّرُ', 'el-Musavvir', 'Varlıklara biçim ve özellik veren'],
  ['الْغَفَّارُ', 'el-Gaffâr', 'Günahları tekrar tekrar örten'],
  ['الْقَهَّارُ', 'el-Kahhâr', 'Her şeye mutlak üstün gelen'],
  ['الْوَهَّابُ', 'el-Vehhâb', 'Karşılıksız ve bolca bağışlayan'],
  ['الرَّزَّاقُ', 'er-Rezzâk', 'Bütün canlıların rızkını veren'],
  ['الْفَتَّاحُ', 'el-Fettâh', 'Hayır kapılarını açan, hükmeden'],
  ['اَلْعَلِيمُ', 'el-Alîm', 'Her şeyi hakkıyla bilen'],
  ['الْقَابِضُ', 'el-Kâbıd', 'Hikmetiyle daraltan ve tutan'],
  ['الْبَاسِطُ', 'el-Bâsıt', 'Hikmetiyle genişleten ve açan'],
  ['الْخَافِضُ', 'el-Hâfıd', 'Hikmetiyle alçaltan'],
  ['الرَّافِعُ', 'er-Râfi’', 'Dereceleri yükselten'],
  ['الْمُعِزُّ', 'el-Muiz', 'Dilediğine izzet veren'],
  ['المُذِلُّ', 'el-Müzil', 'Dilediğini zillete düşüren'],
  ['السَّمِيعُ', 'es-Semî’', 'Her şeyi işiten'],
  ['الْبَصِيرُ', 'el-Basîr', 'Her şeyi gören'],
  ['الْحَكَمُ', 'el-Hakem', 'Son ve mutlak hüküm sahibi'],
  ['الْعَدْلُ', 'el-Adl', 'Mutlak adalet sahibi'],
  ['اللَّطِيفُ', 'el-Latîf', 'Lütfu ince, kullarına nazik davranan'],
  ['الْخَبِيرُ', 'el-Habîr', 'Her şeyin iç yüzünden haberdar olan'],
  ['الْحَلِيمُ', 'el-Halîm', 'Cezada acele etmeyen, yumuşak davranan'],
  ['الْعَظِيمُ', 'el-Azîm', 'Azameti sınırsız olan'],
  ['الْغَفُورُ', 'el-Gafûr', 'Bağışlaması çok olan'],
  ['الشَّكُورُ', 'eş-Şekûr', 'Az amele çok karşılık veren'],
  ['الْعَلِيُّ', 'el-Aliyy', 'Yüceliği mutlak olan'],
  ['الْكَبِيرُ', 'el-Kebîr', 'Büyüklükte eşi bulunmayan'],
  ['الْحَفِيظُ', 'el-Hafîz', 'Her şeyi koruyan'],
  ['المُقيِت', 'el-Mukît', 'Rızık ve güç veren'],
  ['الْحَسِيبُ', 'el-Hasîb', 'Hesap gören ve kullarına yeten'],
  ['الْجَلِيلُ', 'el-Celîl', 'Ululuk ve heybet sahibi'],
  ['الْكَرِيمُ', 'el-Kerîm', 'Cömertliği ve ikramı bol olan'],
  ['الرَّقِيبُ', 'er-Rakîb', 'Her an gözeten'],
  ['الْمُجِيبُ', 'el-Mücîb', 'Dualara karşılık veren'],
  ['الْوَاسِعُ', 'el-Vâsi’', 'Rahmeti ve ilmi her şeyi kuşatan'],
  ['الْحَكِيمُ', 'el-Hakîm', 'Her işi hikmetli olan'],
  ['الْوَدُودُ', 'el-Vedûd', 'Kullarını seven ve sevilen'],
  ['الْمَجِيدُ', 'el-Mecîd', 'Şanı ve ikramı yüce olan'],
  ['الْبَاعِثُ', 'el-Bâis', 'Ölüleri dirilten, elçiler gönderen'],
  ['الشَّهِيدُ', 'eş-Şehîd', 'Her şeye tanık olan'],
  ['الْحَقُّ', 'el-Hakk', 'Varlığı ve hükmü kesin gerçek olan'],
  ['الْوَكِيلُ', 'el-Vekîl', 'Kendisine güvenilip dayanılan'],
  ['الْقَوِيُّ', 'el-Kaviyy', 'Kudreti eksiksiz olan'],
  ['الْمَتِينُ', 'el-Metîn', 'Gücü sarsılmaz olan'],
  ['الْوَلِيُّ', 'el-Veliyy', 'Dost ve yardımcı olan'],
  ['الْحَمِيدُ', 'el-Hamîd', 'Her türlü övgüye layık olan'],
  ['الْمُحْصِي', 'el-Muhsî', 'Her şeyi tek tek bilen ve sayan'],
  ['الْمُبْدِئُ', 'el-Mübdi’', 'Yaratmayı ilk başlatan'],
  ['الْمُعِيدُ', 'el-Muîd', 'Yarattıklarını yeniden dirilten'],
  ['الْمُحْيِي', 'el-Muhyî', 'Hayat veren'],
  ['اَلْمُمِيتُ', 'el-Mümît', 'Ölümü yaratan'],
  ['الْحَيُّ', 'el-Hayy', 'Daima diri olan'],
  ['الْقَيُّومُ', 'el-Kayyûm', 'Her şeyi ayakta tutan'],
  ['الْوَاجِدُ', 'el-Vâcid', 'Dilediğini bulan, hiçbir şeye muhtaç olmayan'],
  ['الْمَاجِدُ', 'el-Mâcid', 'Şerefi ve cömertliği büyük olan'],
  ['الْواحِدُ', 'el-Vâhid', 'Tek ve eşsiz olan'],
  ['الصَّمَدُ', 'es-Samed', 'Her şeyin muhtaç olduğu, kendisi muhtaç olmayan'],
  ['الْقَادِرُ', 'el-Kâdir', 'Her şeye gücü yeten'],
  ['الْمُقْتَدِرُ', 'el-Muktedir', 'Kudreti her şeyi kuşatan'],
  ['الْمُقَدِّمُ', 'el-Mukaddim', 'Hikmetiyle öne alan'],
  ['الْمُؤَخِّرُ', 'el-Muahhir', 'Hikmetiyle geriye bırakan'],
  ['الأوَّلُ', 'el-Evvel', 'Başlangıcı olmayan ilk'],
  ['الآخِرُ', 'el-Âhir', 'Sonu olmayan son'],
  ['الظَّاهِرُ', 'ez-Zâhir', 'Varlığı ve delilleri açık olan'],
  ['الْبَاطِنُ', 'el-Bâtın', 'Mahiyeti idrakin ötesinde olan'],
  ['الْوَالِي', 'el-Vâlî', 'Kâinatı yöneten'],
  ['الْمُتَعَالِي', 'el-Müteâlî', 'Her türlü eksiklikten yüce olan'],
  ['الْبَرُّ', 'el-Berr', 'İyilik ve ihsanı bol olan'],
  ['التَّوَابُ', 'et-Tevvâb', 'Tövbeleri kabul eden'],
  ['الْمُنْتَقِمُ', 'el-Müntakim', 'Adaletiyle suçluyu cezalandıran'],
  ['العَفُوُّ', 'el-Afüvv', 'Günahları silip affeden'],
  ['الرَّؤُوفُ', 'er-Raûf', 'Şefkati pek çok olan'],
  ['مَالِكُ الْمُلْكِ', 'Mâlikü’l-Mülk', 'Mülkün mutlak sahibi'],
  ['ذُوالْجَلَالِ وَالإكْرَامِ', 'Zü’l-Celâli ve’l-İkrâm', 'Ululuk ve ikram sahibi'],
  ['الْمُقْسِطُ', 'el-Muksit', 'Adaletle hükmeden'],
  ['الْجَامِعُ', 'el-Câmi’', 'Dilediklerini bir araya getiren'],
  ['الْغَنِيُّ', 'el-Ganiyy', 'Hiçbir şeye muhtaç olmayan'],
  ['الْمُغْنِي', 'el-Mugnî', 'Dilediğini zengin ve yeterli kılan'],
  ['اَلْمَانِعُ', 'el-Mâni’', 'Hikmetiyle engelleyen ve koruyan'],
  ['الضَّارَّ', 'ed-Dârr', 'Hikmetiyle zarar ve sıkıntı yaratan'],
  ['النَّافِعُ', 'en-Nâfi’', 'Fayda veren'],
  ['النُّورُ', 'en-Nûr', 'Gökleri ve yeri aydınlatan'],
  ['الْهَادِي', 'el-Hâdî', 'Doğru yola ileten'],
  ['الْبَدِيعُ', 'el-Bedî’', 'Örneksiz ve benzersiz yaratan'],
  ['اَلْبَاقِي', 'el-Bâkî', 'Varlığının sonu olmayan'],
  ['الْوَارِثُ', 'el-Vâris', 'Her şeyin gerçek mirasçısı'],
  ['الرَّشِيدُ', 'er-Reşîd', 'Doğru yolu gösteren'],
  ['الصَّبُورُ', 'es-Sabûr', 'Cezada acele etmeyen, sabrı sınırsız olan'],
]

export const ASMA_NAMES: AsmaName[] = RAW_ASMA.map(([arabic, transliteration, meaning], index) => ({
  order: index + 1,
  arabic,
  transliteration,
  meaning,
  reflection: `${transliteration} ismi, Allah’ın “${meaning.toLocaleLowerCase('tr-TR')}” oluşunu hatırlatır. Bugün bu anlamın sende tevazu, güven ve güzel ahlâk olarak nasıl karşılık bulabileceğini düşün.`,
}))

const quranUrl = (surah: number, verse: number) => `https://quran.com/${surah}/${verse}`

export const DUA_LIBRARY: DuaItem[] = [
  { id:'q-2-201', category:'Kuran’dan Dualar', occasion:'Günlük', title:'Dünya ve âhiret iyiliği', arabic:'رَبَّنَآ اٰتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْاٰخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', meaning:'Rabbimiz! Bize dünyada iyilik, âhirette de iyilik ver; bizi ateş azabından koru.', source:'Bakara 2:201', sourceUrl:quranUrl(2,201), context:'Dünya ile âhiret dengesini isteyen kapsamlı bir Kur’an duası.' },
  { id:'q-2-250', category:'Kuran’dan Dualar', occasion:'Sıkıntı', title:'Sabır ve sebat', arabic:'رَبَّنَآ اَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ اَقْدَامَنَا وَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِر۪ينَ', meaning:'Rabbimiz! Üzerimize sabır yağdır, ayaklarımızı sağlam tut ve inkârcı topluma karşı bize yardım et.', source:'Bakara 2:250', sourceUrl:quranUrl(2,250), context:'Zorluk karşısında sabır, sağlam duruş ve yardım talebi.' },
  { id:'q-2-286', category:'Kuran’dan Dualar', occasion:'Sıkıntı', title:'Gücümüzün yetmediği yüklerden korunma', arabic:'رَبَّنَا لَا تُؤَاخِذْنَٓا اِنْ نَس۪ينَٓا اَوْ اَخْطَأْنَاۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَٓا اِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذ۪ينَ مِنْ قَبْلِنَاۚ', meaning:'Rabbimiz! Unutur veya yanılırsak bizi sorumlu tutma; bizden öncekilere yüklediğin gibi bize de ağır yük yükleme.', source:'Bakara 2:286', sourceUrl:quranUrl(2,286), context:'Hata, unutma ve ağır sorumluluk karşısında Allah’a sığınma.' },
  { id:'q-3-8', category:'Kuran’dan Dualar', occasion:'İman', title:'Kalbin doğrulukta kalması', arabic:'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ اِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةًۚ اِنَّكَ اَنْتَ الْوَهَّابُ', meaning:'Rabbimiz! Bizi doğru yola ilettikten sonra kalplerimizi eğriltme; bize katından rahmet bağışla. Şüphesiz çok bağışlayan sensin.', source:'Âl-i İmrân 3:8', sourceUrl:quranUrl(3,8), context:'Hidayette sebat ve rahmet için okunur.' },
  { id:'q-3-16', category:'Kuran’dan Dualar', occasion:'Tövbe', title:'Bağışlanma ve korunma', arabic:'رَبَّنَٓا اِنَّنَٓا اٰمَنَّا فَاغْفِرْ لَنَا ذُنُوبَنَا وَقِنَا عَذَابَ النَّارِ', meaning:'Rabbimiz! Biz iman ettik; günahlarımızı bağışla, bizi ateş azabından koru.', source:'Âl-i İmrân 3:16', sourceUrl:quranUrl(3,16), context:'İman ikrarıyla birlikte bağışlanma dileği.' },
  { id:'q-3-147', category:'Kuran’dan Dualar', occasion:'Sıkıntı', title:'Hataları bağışlama ve sebat', arabic:'رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَاِسْرَافَنَا ف۪ٓي اَمْرِنَا وَثَبِّتْ اَقْدَامَنَا', meaning:'Rabbimiz! Günahlarımızı ve işlerimizdeki taşkınlığımızı bağışla, ayaklarımızı sağlam tut.', source:'Âl-i İmrân 3:147', sourceUrl:quranUrl(3,147), context:'Hata sonrası toparlanma ve kararlılık talebi.' },
  { id:'q-3-191', category:'Kuran’dan Dualar', occasion:'İman', title:'Yaratılış üzerine tefekkür', arabic:'رَبَّنَا مَا خَلَقْتَ هٰذَا بَاطِلًاۚ سُبْحَانَكَ فَقِنَا عَذَابَ النَّارِ', meaning:'Rabbimiz! Sen bunu boş yere yaratmadın. Seni tenzih ederiz; bizi ateş azabından koru.', source:'Âl-i İmrân 3:191', sourceUrl:quranUrl(3,191), context:'Göklerin ve yerin yaratılışı üzerinde tefekkür ederken.' },
  { id:'q-7-23', category:'Kuran’dan Dualar', occasion:'Tövbe', title:'Âdem ve Havvâ’nın tövbesi', arabic:'رَبَّنَا ظَلَمْنَٓا اَنْفُسَنَا وَاِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِر۪ينَ', meaning:'Rabbimiz! Biz kendimize zulmettik. Eğer bizi bağışlamaz ve bize acımazsan mutlaka ziyan edenlerden oluruz.', source:'A‘râf 7:23', sourceUrl:quranUrl(7,23), context:'Yanlışı kabul ederek samimi tövbe etmek için.' },
  { id:'q-10-85', category:'Kuran’dan Dualar', occasion:'Sıkıntı', title:'Zulme araç olmaktan korunma', arabic:'رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِلْقَوْمِ الظَّالِم۪ينَۙ وَنَجِّنَا بِرَحْمَتِكَ مِنَ الْقَوْمِ الْكَافِر۪ينَ', meaning:'Rabbimiz! Bizi zalimler topluluğu için deneme konusu kılma; rahmetinle bizi inkârcılardan kurtar.', source:'Yûnus 10:85-86', sourceUrl:quranUrl(10,85), context:'Baskı ve zulüm karşısında korunma dileği.' },
  { id:'q-11-47', category:'Kuran’dan Dualar', occasion:'Tövbe', title:'Bilgisizce istemekten korunma', arabic:'رَبِّ اِنّ۪ٓي اَعُوذُ بِكَ اَنْ اَسْـَٔلَكَ مَا لَيْسَ ل۪ي بِه۪ عِلْمٌۜ وَاِلَّا تَغْفِرْ ل۪ي وَتَرْحَمْن۪ٓي اَكُنْ مِنَ الْخَاسِر۪ينَ', meaning:'Rabbim! Hakkında bilgim olmayan şeyi istemekten sana sığınırım. Beni bağışlamaz ve bana merhamet etmezsen ziyana uğrayanlardan olurum.', source:'Hûd 11:47', sourceUrl:quranUrl(11,47), context:'Bilginin sınırını kabul edip Allah’a sığınma.' },
  { id:'q-12-101', category:'Kuran’dan Dualar', occasion:'İman', title:'Müslüman olarak yaşamak', arabic:'تَوَفَّن۪ي مُسْلِمًا وَاَلْحِقْن۪ي بِالصَّالِح۪ينَ', meaning:'Canımı Müslüman olarak al ve beni iyilere kat.', source:'Yûsuf 12:101', sourceUrl:quranUrl(12,101), context:'Hz. Yûsuf’un iman ve salihlerle beraberlik duası.' },
  { id:'q-14-40', category:'Kuran’dan Dualar', occasion:'Aile', title:'Namazı devamlı kılmak', arabic:'رَبِّ اجْعَلْن۪ي مُق۪يمَ الصَّلٰوةِ وَمِنْ ذُرِّيَّت۪يۗ رَبَّنَا وَتَقَبَّلْ دُعَٓاءِ', meaning:'Rabbim! Beni ve soyumdan gelecekleri namazı devamlı kılanlardan eyle; Rabbimiz, duamı kabul et.', source:'İbrâhîm 14:40', sourceUrl:quranUrl(14,40), context:'Kişinin kendisi ve ailesi için ibadette devamlılık dileği.' },
  { id:'q-17-24', category:'Kuran’dan Dualar', occasion:'Aile', title:'Anne babaya rahmet', arabic:'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَان۪ي صَغ۪يرًا', meaning:'Rabbim! Küçüklüğümde onlar beni nasıl yetiştirmişlerse şimdi de sen onlara merhamet et.', source:'İsrâ 17:24', sourceUrl:quranUrl(17,24), context:'Anne baba için rahmet duası.' },
  { id:'q-18-10', category:'Kuran’dan Dualar', occasion:'Sıkıntı', title:'Doğru bir çıkış yolu', arabic:'رَبَّنَٓا اٰتِنَا مِنْ لَدُنْكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ اَمْرِنَا رَشَدًا', meaning:'Rabbimiz! Bize katından rahmet ver ve işimizde bize doğruyu göster, bizi başarıya ulaştır.', source:'Kehf 18:10', sourceUrl:quranUrl(18,10), context:'Zor bir kararda rahmet ve doğru yol istemek için.' },
  { id:'q-20-25', category:'Kuran’dan Dualar', occasion:'İlim', title:'Göğsün genişlemesi ve anlatım kolaylığı', arabic:'رَبِّ اشْرَحْ ل۪ي صَدْر۪يۙ وَيَسِّرْ ل۪ٓي اَمْر۪يۙ وَاحْلُلْ عُقْدَةً مِنْ لِسَان۪يۙ يَفْقَهُوا قَوْل۪ي', meaning:'Rabbim! Gönlüme ferahlık ver. İşimi bana kolaylaştır. Dilimdeki tutukluğu çöz ki sözümü anlasınlar.', source:'Tâhâ 20:25-28', sourceUrl:quranUrl(20,25), context:'Konuşma, sınav, sunum ve sorumluluk öncesinde okunabilir.' },
  { id:'q-21-83', category:'Kuran’dan Dualar', occasion:'Sağlık', title:'Hz. Eyyûb’un sıkıntı duası', arabic:'اَنّ۪ي مَسَّنِيَ الضُّرُّ وَاَنْتَ اَرْحَمُ الرَّاحِم۪ينَ', meaning:'Başıma bu dert geldi. Ama sen merhametlilerin en üstünüsün.', source:'Enbiyâ 21:83', sourceUrl:quranUrl(21,83), context:'Hastalık ve uzun süren sıkıntı zamanında.' },
  { id:'q-21-87', category:'Kuran’dan Dualar', occasion:'Tövbe', title:'Hz. Yûnus’un duası', arabic:'لَٓا اِلٰهَ اِلَّٓا اَنْتَ سُبْحَانَكَۗ اِنّ۪ي كُنْتُ مِنَ الظَّالِم۪ينَ', meaning:'Senden başka ilâh yoktur. Seni tenzih ederim. Gerçekten ben zalimlerden oldum.', source:'Enbiyâ 21:87', sourceUrl:quranUrl(21,87), context:'Sıkışmışlık içinde tevhid, tesbih ve hatayı kabul etme duası.' },
  { id:'q-23-29', category:'Kuran’dan Dualar', occasion:'Yolculuk', title:'Bereketli bir yere varmak', arabic:'رَبِّ اَنْزِلْن۪ي مُنْزَلًا مُبَارَكًا وَاَنْتَ خَيْرُ الْمُنْزِل۪ينَ', meaning:'Rabbim! Beni bereketli bir yere indir. Sen konuklayanların en hayırlısısın.', source:'Mü’minûn 23:29', sourceUrl:quranUrl(23,29), context:'Yeni bir yere varırken veya yeni bir başlangıçta.' },
  { id:'q-25-74', category:'Kuran’dan Dualar', occasion:'Aile', title:'Göz aydınlığı bir aile', arabic:'رَبَّنَا هَبْ لَنَا مِنْ اَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ اَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّق۪ينَ اِمَامًا', meaning:'Rabbimiz! Eşlerimizi ve çocuklarımızı bize göz aydınlığı kıl ve bizi Allah’a karşı gelmekten sakınanlara önder eyle.', source:'Furkân 25:74', sourceUrl:quranUrl(25,74), context:'Aile huzuru ve güzel örneklik için.' },
  { id:'q-59-10', category:'Kuran’dan Dualar', occasion:'İman', title:'Müminlere karşı kalbi arındırmak', arabic:'رَبَّنَا اغْفِرْ لَنَا وَلِاِخْوَانِنَا الَّذ۪ينَ سَبَقُونَا بِالْا۪يمَانِ وَلَا تَجْعَلْ ف۪ي قُلُوبِنَا غِلًّا لِلَّذ۪ينَ اٰمَنُوا', meaning:'Rabbimiz! Bizi ve bizden önce iman etmiş kardeşlerimizi bağışla; kalplerimizde iman edenlere karşı kin bırakma.', source:'Haşr 59:10', sourceUrl:quranUrl(59,10), context:'Bağışlama, kardeşlik ve kalp temizliği için.' },

  { id:'h-muslim-2721', category:'Hadislerden Dualar', occasion:'Günlük', title:'Hidayet, takvâ, iffet ve gönül zenginliği', arabic:'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى', meaning:'Allah’ım! Senden hidayet, takvâ, iffet ve gönül zenginliği isterim.', source:'Sahih Müslim 2721a', sourceUrl:'https://sunnah.com/muslim:2721a', context:'Resûlullah’ın kapsamlı ve kısa dualarından.' },
  { id:'h-bukhari-6369', category:'Hadislerden Dualar', occasion:'Sıkıntı', title:'Kaygı, üzüntü ve borç yükünden korunma', arabic:'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَالْعَجْزِ وَالْكَسَلِ وَالْجُبْنِ وَالْبُخْلِ وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ', meaning:'Allah’ım! Kaygıdan, üzüntüden, acizlikten, tembellikten, korkaklıktan, cimrilikten, borç yükünden ve insanların baskısından sana sığınırım.', source:'Sahih el-Buhârî 6369', sourceUrl:'https://sunnah.com/bukhari:6369', context:'Kaygı, yetersizlik hissi ve borç baskısı karşısında.' },
  { id:'h-bukhari-5743', category:'Hadislerden Dualar', occasion:'Sağlık', title:'Şifa duası', arabic:'اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ، اشْفِ أَنْتَ الشَّافِي، لاَ شِفَاءَ إِلاَّ شِفَاؤُكَ، شِفَاءً لاَ يُغَادِرُ سَقَمًا', meaning:'Ey insanların Rabbi! Sıkıntıyı gider, şifa ver; şifa veren sensin. Senin şifandan başka şifa yoktur. Hastalık bırakmayan bir şifa ver.', source:'Sahih el-Buhârî 5743', sourceUrl:'https://sunnah.com/bukhari:5743', context:'Hasta için Resûlullah’ın okuduğu şifa duası.' },
  { id:'h-bukhari-6306', category:'Hadislerden Dualar', occasion:'Tövbe', title:'Seyyidü’l-istiğfar', arabic:'اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ', meaning:'Allah’ım! Sen benim Rabbimsin, senden başka ilâh yoktur. Beni sen yarattın, ben senin kulunum; gücüm yettiğince ahdin ve vaadin üzereyim.', source:'Sahih el-Buhârî 6306', sourceUrl:'https://sunnah.com/bukhari:6306', context:'Hadiste “istiğfarın en üstünü” diye tanıtılan duanın başlangıcıdır; kaynak bağlantısında tam metin yer alır.' },
  { id:'h-muslim-2722', category:'Hadislerden Dualar', occasion:'İlim', title:'Faydasız bilgiden korunma', arabic:'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عِلْمٍ لاَ يَنْفَعُ وَمِنْ قَلْبٍ لاَ يَخْشَعُ وَمِنْ نَفْسٍ لاَ تَشْبَعُ وَمِنْ دَعْوَةٍ لاَ يُسْتَجَابُ لَهَا', meaning:'Allah’ım! Fayda vermeyen bilgiden, ürpermeyen kalpten, doymayan nefisten ve kabul edilmeyen duadan sana sığınırım.', source:'Sahih Müslim 2722', sourceUrl:'https://sunnah.com/muslim:2722', context:'Bilginin faydaya, kalbin huşûa dönüşmesi için.' },
  { id:'h-bukhari-6324', category:'Hadislerden Dualar', occasion:'Günlük', title:'Uyurken', arabic:'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', meaning:'Allah’ım! Senin adınla ölür ve dirilirim.', source:'Sahih el-Buhârî 6324', sourceUrl:'https://sunnah.com/bukhari:6324', context:'Yatağa girerken okunan kısa dua.' },
  { id:'h-bukhari-6312', category:'Hadislerden Dualar', occasion:'Günlük', title:'Uyanınca', arabic:'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', meaning:'Bizi öldürdükten sonra dirilten Allah’a hamdolsun. Dönüş yalnız O’nadır.', source:'Sahih el-Buhârî 6312', sourceUrl:'https://sunnah.com/bukhari:6312', context:'Uykudan uyanınca okunan dua.' },
  { id:'h-bukhari-6320', category:'Hadislerden Dualar', occasion:'Günlük', title:'Yatağa girerken korunma', arabic:'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي وَبِكَ أَرْفَعُهُ، إِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا', meaning:'Rabbim! Senin adınla yanımı yatağa koydum, senin yardımınla kaldırırım. Canımı alırsan ona merhamet et; geri verirsen salih kullarını koruduğun gibi onu koru.', source:'Sahih el-Buhârî 6320', sourceUrl:'https://sunnah.com/bukhari:6320', context:'Uyumadan önce korunma ve teslimiyet duası.' },
  { id:'h-abudawud-5095', category:'Hadislerden Dualar', occasion:'Günlük', title:'Evden çıkarken', arabic:'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ، لاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ', meaning:'Allah’ın adıyla; Allah’a tevekkül ettim. Güç ve kuvvet ancak Allah’ın yardımıyladır.', source:'Sünen Ebû Dâvûd 5095', sourceUrl:'https://sunnah.com/abudawud:5095', context:'Evden çıkarken tevekkül için.' },
  { id:'h-muslim-1342', category:'Hadislerden Dualar', occasion:'Yolculuk', title:'Yolculuk duası', arabic:'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ', meaning:'Bunu hizmetimize veren Allah’ı tenzih ederiz; yoksa bizim buna gücümüz yetmezdi. Şüphesiz Rabbimize döneceğiz.', source:'Sahih Müslim 1342', sourceUrl:'https://sunnah.com/muslim:1342', context:'Bir yolculuğa ve bineğe başlarken okunan duanın başlangıcı.' },
  { id:'h-muslim-713', category:'Hadislerden Dualar', occasion:'İbadet', title:'Mescide girerken', arabic:'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', meaning:'Allah’ım! Bana rahmetinin kapılarını aç.', source:'Sahih Müslim 713a', sourceUrl:'https://sunnah.com/muslim:713a', context:'Mescide girerken okunur.' },
  { id:'h-muslim-713-exit', category:'Hadislerden Dualar', occasion:'İbadet', title:'Mescidden çıkarken', arabic:'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ', meaning:'Allah’ım! Senin lütfundan isterim.', source:'Sahih Müslim 713b', sourceUrl:'https://sunnah.com/muslim:713b', context:'Mescidden çıkarken okunur.' },
  { id:'h-tirmidhi-2140', category:'Hadislerden Dualar', occasion:'İman', title:'Kalbin dinde sabit kalması', arabic:'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ', meaning:'Ey kalpleri çeviren! Kalbimi dinin üzere sabit kıl.', source:'Câmi‘ et-Tirmizî 2140 (hasen)', sourceUrl:'https://sunnah.com/tirmidhi:2140', context:'Resûlullah’ın sıkça yaptığı dualardan.' },
  { id:'h-abudawud-5074', category:'Hadislerden Dualar', occasion:'Sağlık', title:'Af ve âfiyet', arabic:'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ', meaning:'Allah’ım! Senden dünyada ve âhirette af ve âfiyet isterim.', source:'Sünen Ebû Dâvûd 5074', sourceUrl:'https://sunnah.com/abudawud:5074', context:'Sabah ve akşam okunması tavsiye edilen kapsamlı dua.' },
  { id:'h-ibnmajah-925', category:'Hadislerden Dualar', occasion:'İlim', title:'Faydalı ilim ve temiz rızık', arabic:'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلاً مُتَقَبَّلاً', meaning:'Allah’ım! Senden faydalı ilim, temiz rızık ve kabul edilmiş amel isterim.', source:'Sünen İbn Mâce 925', sourceUrl:'https://sunnah.com/ibnmajah:925', context:'Sabah namazından sonra rivayet edilen dua.' },
  { id:'h-abudawud-1516', category:'Hadislerden Dualar', occasion:'Tövbe', title:'Tövbe ve bağışlanma', arabic:'رَبِّ اغْفِرْ لِي وَتُبْ عَلَىَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ', meaning:'Rabbim! Beni bağışla, tövbemi kabul et. Şüphesiz sen tövbeleri çok kabul eden ve çok merhametli olansın.', source:'Sünen Ebû Dâvûd 1516', sourceUrl:'https://sunnah.com/abudawud:1516', context:'Resûlullah’ın bir mecliste çokça tekrar ettiği rivayet edilen istiğfar.' },

  { id:'s-bukhari-834', category:'Sahabeye Öğretilen Dualar', occasion:'Tövbe', title:'Hz. Ebû Bekir’e öğretilen bağışlanma duası', arabic:'اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي ظُلْمًا كَثِيرًا، وَلاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ، فَاغْفِرْ لِي مَغْفِرَةً مِنْ عِنْدِكَ وَارْحَمْنِي', meaning:'Allah’ım! Ben kendime çok zulmettim. Günahları ancak sen bağışlarsın. Katından bir bağışlamayla beni bağışla ve bana merhamet et.', source:'Sahih el-Buhârî 834', sourceUrl:'https://sunnah.com/bukhari:834', context:'Hz. Ebû Bekir’in namazında okuyabilmek için Resûlullah’tan istediği dua.' },
  { id:'s-abudawud-1522', category:'Sahabeye Öğretilen Dualar', occasion:'İbadet', title:'Muâz b. Cebel’e öğretilen dua', arabic:'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ', meaning:'Allah’ım! Seni anmak, sana şükretmek ve sana güzelce ibadet etmek için bana yardım et.', source:'Sünen Ebû Dâvûd 1522 (sahih)', sourceUrl:'https://sunnah.com/abudawud:1522', context:'Resûlullah’ın Muâz’a her namazın sonunda bırakmamasını öğütlediği dua.' },
  { id:'s-muslim-2725', category:'Sahabeye Öğretilen Dualar', occasion:'İlim', title:'Hz. Ali’ye öğretilen doğruluk duası', arabic:'اللَّهُمَّ اهْدِنِي وَسَدِّدْنِي', meaning:'Allah’ım! Bana hidayet ver ve beni doğruya isabet ettir.', source:'Sahih Müslim 2725a', sourceUrl:'https://sunnah.com/muslim:2725a', context:'Resûlullah’ın Hz. Ali’ye öğrettiği kısa ve kapsamlı dua.' },
  { id:'s-muslim-918', category:'Sahabeye Öğretilen Dualar', occasion:'Sıkıntı', title:'Ümmü Seleme’ye öğretilen musibet duası', arabic:'اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي وَأَخْلِفْ لِي خَيْرًا مِنْهَا', meaning:'Allah’ım! Musibetimde bana ecir ver ve onun yerine daha hayırlısını lütfet.', source:'Sahih Müslim 918b', sourceUrl:'https://sunnah.com/muslim:918b', context:'Ümmü Seleme’nin aktardığı, musibet anında söylenen dua.' },
]

export const ASMA_SOURCE = {
  label: 'TDV İslâm Ansiklopedisi · Esmâ-i Hüsnâ',
  url: 'https://islamansiklopedisi.org.tr/esma-i-husna',
  note: 'Sıralama, Türkiye’de yaygın olarak kullanılan Tirmizî rivayetindeki listeyi izler. Âlimler Allah’ın isimlerinin bu sayıyla sınırlı olmadığını belirtir.',
}

export function getDailyAsma(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const dayOfYear = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86_400_000)
  return ASMA_NAMES[(dayOfYear - 1 + ASMA_NAMES.length) % ASMA_NAMES.length]
}
