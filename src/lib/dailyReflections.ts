export type ReflectionKind = 'verse' | 'hadith'

export type DailyReflection = {
  id: string
  kind: ReflectionKind
  title: string
  reference: string
  text: string
  theme: string
  sourceLabel: string
  sourceUrl: string
}

const verse = (id: string, title: string, reference: string, text: string, theme: string, path: string): DailyReflection => ({
  id, kind: 'verse', title, reference, text, theme,
  sourceLabel: 'Quran.com · ayet görünümü',
  sourceUrl: `https://quran.com/${path}`,
})

/**
 * Bunlar meal yerine geçen alıntılar değil, ayetin temasını koruyan kısa
 * editoryal tefekkür başlangıçlarıdır. Her kayıt doğrudan ayet görünümüne bağlanır.
 */
export const VERSE_REFLECTIONS: DailyReflection[] = [
  verse('fatiha-5', 'Yönünü yalnız O’na çevir', 'Fâtiha 1:5', 'Kulluğunu ve yardım talebini aynı merkezde toplamayı düşün.', 'Yöneliş', '1/5'),
  verse('bakara-45', 'Sabır ve namazla destek ara', 'Bakara 2:45', 'Zorlandığında sabırla durmayı ve namazla güç toplamayı hatırla.', 'Sabır', '2/45'),
  verse('bakara-152', 'Hatırla ve şükret', 'Bakara 2:152', 'Rabbini an, sana verilenleri fark et ve şükrü canlı tut.', 'Şükür', '2/152'),
  verse('bakara-153', 'Sabırla beraberlik', 'Bakara 2:153', 'Sabredenlerin ilahî beraberlikle desteklendiğini hatırla.', 'Sabır', '2/153'),
  verse('bakara-186', 'Duan karşılıksız değil', 'Bakara 2:186', 'Dua ederken Allah’ın yakınlığını ve karşılık verdiğini düşün.', 'Dua', '2/186'),
  verse('bakara-195', 'Emanetini özenle taşı', 'Bakara 2:195', 'Emanetlerini özenle yerine getirmenin ihsanın bir parçası olduğunu hatırla.', 'İhsan', '2/195'),
  verse('bakara-216', 'Bilmediğinde güven', 'Bakara 2:216', 'Hoşuna gitmeyen bir şeyin içinde hayır bulunabileceğini düşün.', 'Hikmet', '2/216'),
  verse('bakara-286', 'Gücünün ölçüsü', 'Bakara 2:286', 'Hiç kimseye gücünün ötesinde bir sorumluluk yüklenmediğini hatırla.', 'Dayanıklılık', '2/286'),
  verse('ali-imran-134', 'Öfkeni iyiliğe dönüştür', 'Âl-i İmrân 3:134', 'Öfkeyi yutmanın, affetmenin ve iyilikte kalmanın gücünü düşün.', 'Affetmek', '3/134'),
  verse('ali-imran-139', 'Gevşeme, ümidini koru', 'Âl-i İmrân 3:139', 'İnancın sana umutsuzluk yerine direnç kazandırsın.', 'Cesaret', '3/139'),
  verse('ali-imran-159', 'Yumuşaklıkla yaklaş', 'Âl-i İmrân 3:159', 'İnsanlarla ilişkinde yumuşaklığın, affın ve istişarenin yerini düşün.', 'Nezaket', '3/159'),
  verse('ali-imran-200', 'Sabırda ve hazırlıkta sebat et', 'Âl-i İmrân 3:200', 'Zorluk karşısında dayanışma ve sorumluluk bilinciyle sabret.', 'Sebat', '3/200'),
  verse('nisa-36', 'İyiliğin halkasını genişlet', 'Nisâ 4:36', 'Yakınından başlayarak insanlara karşı iyiliği çoğaltmayı düşün.', 'İyilik', '4/36'),
  verse('maide-8', 'Adaletten ayrılma', 'Mâide 5:8', 'Birine karşı hislerin seni adaletsizliğe sürüklemesin.', 'Adalet', '5/8'),
  verse('enam-160', 'İyiliğin bereketi', 'En‘âm 6:160', 'İyiliğin karşılığının katlanarak büyüdüğünü hatırla.', 'İyilik', '6/160'),
  verse('araf-56', 'Rahmete yakın yaşa', 'A‘râf 7:56', 'Yeryüzünü bozmak yerine iyileştirmenin rahmete yaklaştırdığını düşün.', 'Rahmet', '7/56'),
  verse('araf-199', 'Affı seç, iyiliği öner', 'A‘râf 7:199', 'Affediciliği, iyiliği ve gereksiz çatışmadan uzak durmayı seç.', 'Edep', '7/199'),
  verse('enfal-46', 'Birlikte gücünü koru', 'Enfâl 8:46', 'Çekişmenin gücü tükettiğini; sabrın ve uyumun koruduğunu hatırla.', 'Dayanışma', '8/46'),
  verse('tevbe-51', 'Güvenin merkezini hatırla', 'Tevbe 9:51', 'Kontrol edemediklerin karşısında tevekkülün kalbine yön vermesine izin ver.', 'Tevekkül', '9/51'),
  verse('yunus-57', 'Kalbine gelen öğüt', 'Yûnus 10:57', 'Vahyin gönüller için öğüt, şifa, rehberlik ve rahmet oluşunu düşün.', 'Şifa', '10/57'),
  verse('hud-115', 'İyilik kaybolmaz', 'Hûd 11:115', 'Sabırla sürdürülen iyiliğin karşılıksız bırakılmayacağını hatırla.', 'İstikrar', '11/115'),
  verse('yusuf-87', 'Ümidini kesme', 'Yûsuf 12:87', 'En karanlık ihtimalde bile Allah’ın rahmetinden ümit kesme.', 'Umut', '12/87'),
  verse('rad-11', 'Değişim içeriden başlar', 'Ra‘d 13:11', 'Hayatındaki dönüşüm için önce kendi tutumunda değiştirebileceğini ara.', 'Dönüşüm', '13/11'),
  verse('rad-28', 'Kalbin sükûneti', 'Ra‘d 13:28', 'Kalplerin Allah’ı anmakla huzur bulduğunu düşün.', 'Huzur', '13/28'),
  verse('ibrahim-7', 'Şükrün bereketi', 'İbrâhîm 14:7', 'Şükrün nimeti fark etmeyi ve çoğaltmayı öğreten bir tutum olduğunu düşün.', 'Şükür', '14/7'),
  verse('nahl-90', 'Adalet, iyilik ve paylaşma', 'Nahl 16:90', 'Bugünkü kararında adaletin, ihsanın ve yakını gözetmenin yerini ara.', 'Adalet', '16/90'),
  verse('nahl-128', 'İyiliği güzel yap', 'Nahl 16:128', 'Sorumluluk bilinciyle hareket eden ve iyiliği güzel yapanlarla Allah’ın beraberliğini düşün.', 'İhsan', '16/128'),
  verse('isra-23', 'Yakınlarına incelik göster', 'İsrâ 17:23-24', 'Anne babana karşı sözünde ve davranışında şefkati öne çıkar.', 'Vefa', '17/23-24'),
  verse('isra-70', 'İnsan onurunu koru', 'İsrâ 17:70', 'Her insanın taşıdığı değeri ve onuru ilişkilerinde gözet.', 'Onur', '17/70'),
  verse('kehf-46', 'Kalıcı olanı seç', 'Kehf 18:46', 'Geçici kazanımların yanında kalıcı iyiliklere ne kattığını düşün.', 'Öncelik', '18/46'),
  verse('taha-46', 'Yalnız değilsin', 'Tâhâ 20:46', 'Korkunun içinde bile Allah’ın işittiğini ve gördüğünü hatırla.', 'Güven', '20/46'),
  verse('taha-114', 'Bilgini artır', 'Tâhâ 20:114', 'Öğrenme yolculuğunda tevazu ile daha fazla bilgi istemeyi sürdür.', 'İlim', '20/114'),
  verse('enbiya-107', 'Rahmetin izini taşı', 'Enbiyâ 21:107', 'Bugün bulunduğun yere nasıl rahmet ve kolaylık taşıyabileceğini düşün.', 'Merhamet', '21/107'),
  verse('muminun-61', 'İyilikte gayret', 'Mü’minûn 23:61', 'İyiliklere yönelmenin ve bu uğurda gayret göstermenin değerini hatırla.', 'Gayret', '23/61'),
  verse('ankebut-69', 'Gayret yol açar', 'Ankebût 29:69', 'İyi olan için gösterilen samimi çabanın yeni yollar açtığını düşün.', 'Gayret', '29/69'),
  verse('lokman-17', 'Dengeli ve sabırlı ol', 'Lokmân 31:17-19', 'İyiliği gözetirken ölçülü, sabırlı ve alçak gönüllü kal.', 'Ölçü', '31/17-19'),
  verse('zumer-53', 'Ümidini koru', 'Zümer 39:53', 'Hataların ne kadar ağır görünürse görünsün Allah’ın rahmetinden ümit kesme.', 'Rahmet', '39/53'),
  verse('fussilet-34', 'Kötülüğü iyilikle karşıla', 'Fussilet 41:34', 'Zor bir davranışa daha güzel olanla karşılık vermenin dönüştürücü gücünü düşün.', 'Olgunluk', '41/34'),
  verse('hucurat-13', 'Tanışmak için farklıyız', 'Hucurât 49:13', 'Farklılıkların üstünlük değil tanışma ve sorumluluk vesilesi olduğunu hatırla.', 'Kardeşlik', '49/13'),
  verse('insirah-5-6', 'Zorlukla beraber kolaylık', 'İnşirâh 94:5-6', 'Her güçlüğün yanında bir kolaylığın bulunduğunu hatırla.', 'Teselli', '94/5-6'),
]

const hadith = (number: number, title: string, text: string, theme: string): DailyReflection => ({
  id: `nawawi-${number}`, kind: 'hadith', title,
  reference: `Nevevî 40 Hadis, ${number}`, text, theme,
  sourceLabel: 'Sunnah.com · Nevevî 40 Hadis',
  sourceUrl: `https://sunnah.com/nawawi40:${number}`,
})

/** Nevevî'nin sahih/hasen rivayetlerden derlediği koleksiyonun 40 kaydı. */
export const HADITH_REFLECTIONS: DailyReflection[] = [
  hadith(1, 'Niyetin yönü', 'Davranışının değerini niyetinin yönüyle birlikte düşün.', 'Niyet'),
  hadith(2, 'İnanç, kulluk ve ihsan', 'İmanını bilgi, ibadet ve güzel davranışla bir bütün hâlinde yaşa.', 'İhsan'),
  hadith(3, 'Sağlam temel', 'Hayatını kulluğun temel sorumlulukları üzerinde dengeli biçimde kur.', 'İstikrar'),
  hadith(4, 'Sonuca değil istikamete odaklan', 'Hayatın akışında güzel bir sona taşıyacak istikameti korumayı düşün.', 'İstikamet'),
  hadith(5, 'Özü koru', 'Dinin özüne ait olmayan eklemeler yerine güvenilir rehberliğe bağlı kal.', 'Ölçü'),
  hadith(6, 'Şüpheliden uzak dur', 'Açık olanla yetinip kalbini bulandıran şüpheli alanlardan sakın.', 'Hassasiyet'),
  hadith(7, 'Samimi öğüt', 'İnançta ve ilişkilerde dürüst, iyi niyetli ve samimi ol.', 'Samimiyet'),
  hadith(9, 'Gücün kadarını yap', 'Yasaklardan kaçın; emredilenleri ise elinden geldiğince yerine getir.', 'Denge'),
  hadith(10, 'Temiz olanı seç', 'Kazancında, tüketiminde ve duanda temiz olana yönel.', 'Helal'),
  hadith(11, 'Şüpheyi bırak', 'İçini kuşkulandıranı bırakıp sana güven veren doğru seçeneğe yönel.', 'Güven'),
  hadith(12, 'Sana düşene odaklan', 'Seni ilgilendirmeyen şeyleri bırakmanın olgunluğunu düşün.', 'Sadelik'),
  hadith(13, 'Kendin için istediğini paylaş', 'Kendin için sevdiğin iyiliği başkası için de gönülden iste.', 'Kardeşlik'),
  hadith(15, 'İyi söz veya sükût', 'Sözün hayırlı olacaksa söyle; komşuna ve misafirine ikramı unutma.', 'Edep'),
  hadith(16, 'Öfkeye teslim olma', 'Öfken yükseldiğinde ona göre davranmak yerine durmayı seç.', 'Sabır'),
  hadith(17, 'Her işi güzel yap', 'Sorumluluğunu incelik, merhamet ve mümkün olan en güzel biçimde yerine getir.', 'İhsan'),
  hadith(18, 'Hatanın ardından iyilik', 'Bir hatanın ardından onu silmeye vesile olacak bir iyilik yap ve insanlara güzel davran.', 'Dönüşüm'),
  hadith(19, 'Allah’ı gözet', 'Sınırlarını koru; yardım ve güven ihtiyacında yönünü Allah’a çevir.', 'Tevekkül'),
  hadith(20, 'Hayânın rehberliği', 'Vicdanını ve insan onurunu koruyan hayâ duygusuna kulak ver.', 'Haya'),
  hadith(21, 'İnan ve dosdoğru ol', 'İnandığın değerleri gündelik hayatında istikrarlı davranışlara dönüştür.', 'Sebat'),
  hadith(22, 'Temel sorumluluklarda sadakat', 'Farzlarını gözetip helal ve haram sınırlarına dikkat ederek yoluna devam et.', 'Sadakat'),
  hadith(23, 'İyilik terazini doldur', 'Temizlik, şükür, sabır, namaz ve paylaşmanın hayatına nasıl ışık tuttuğunu düşün.', 'Arınma'),
  hadith(24, 'Zulme yer bırakma', 'Allah’ın zulmü yasakladığını hatırla; kimseye haksızlık etme.', 'Adalet'),
  hadith(25, 'İyiliğin çok yolu var', 'Zikir, iyi söz ve doğruya çağrı gibi gündelik iyiliklerin de sadaka olduğunu hatırla.', 'İyilik'),
  hadith(26, 'Her günün şükrü', 'İki insanın arasını düzeltmekten yoldaki engeli kaldırmaya kadar her iyilik bir şükürdür.', 'Şükür'),
  hadith(27, 'İyilik güzel ahlaktır', 'Kalbine huzur veren güzel ahlaka yönel; içinde huzursuzluk uyandıran davranışı sorgula.', 'Ahlak'),
  hadith(28, 'Güvenilir rehberliğe tutun', 'Karışıklık zamanlarında peygamberî örnekliği ve doğru yolu koru.', 'Rehberlik'),
  hadith(29, 'İyiliğin kapıları', 'Kulluğunu besleyen küçük davranışları ve dilini korumanın önemini düşün.', 'Sorumluluk'),
  hadith(30, 'Sınırları gözet', 'Yükümlülükleri ihmal etmeden, yasak sınırları aşmadan dengeli yaşa.', 'Ölçü'),
  hadith(31, 'Sahip olma hırsını azalt', 'Dünyaya ve insanların elindekine aşırı bağlanmadan gönlünü özgürleştir.', 'Kanaat'),
  hadith(32, 'Zarar verme', 'Kendi davranışının başkasına zarar vermemesini ve zarara zararla karşılık vermemeyi gözet.', 'Emanet'),
  hadith(33, 'İddiada adalet', 'Bir konuda hüküm vermeden önce delil ve sorumluluk dengesini gözet.', 'Adalet'),
  hadith(34, 'İyiliğe alan aç', 'Yanlışı düzeltirken gücünü, yöntemini ve kalbin sorumluluğunu birlikte düşün.', 'Sorumluluk'),
  hadith(35, 'Kardeşliğin hukukunu koru', 'Haset, nefret ve küçümseme yerine birbirinin onurunu korumayı seç.', 'Kardeşlik'),
  hadith(36, 'Yükü hafiflet', 'Birinin sıkıntısını gidermenin, öğrenmenin ve dayanışmanın değerini hatırla.', 'Dayanışma'),
  hadith(37, 'İyi niyet de değerlidir', 'Samimi bir iyilik niyetinin bile kaybolmadığını; yapılan iyiliğin katlandığını düşün.', 'Umut'),
  hadith(38, 'Yakınlığı adımlarla kur', 'Önce sorumluluklarını gözet, sonra gönüllü iyiliklerle yakınlığını derinleştir.', 'Yakınlık'),
  hadith(39, 'Hata ve unutmaya merhamet', 'İstemeden yapılan hata, unutma ve zorlanma karşısında ilahî merhameti hatırla.', 'Rahmet'),
  hadith(40, 'Bir yolcu gibi yaşa', 'Dünyada kalıcıymış gibi değil, yönünü bilen bir yolcu gibi ilerle.', 'Farkındalık'),
  hadith(41, 'Arzunu doğruya uydur', 'İsteklerini güvenilir rehberliğin ve hakikatin ölçüsüyle terbiye et.', 'İstikamet'),
  hadith(42, 'Bağışlanma kapısı açık', 'Hatan ne kadar büyük görünürse görünsün samimiyetle bağışlanma istemekten vazgeçme.', 'Rahmet'),
]

export function getDailyReflectionIndex(kind: ReflectionKind, length: number, userId = 'guest', date = new Date()) {
  const key = `${kind}-${userId}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  let hash = 2166136261
  for (const character of key) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % length
}
