export type Geography = 'filistin' | 'dogu_turkistan'
export type QuizOption = 'A' | 'B' | 'C' | 'D'

export type AwarenessContent = {
  id: string
  geography: Geography
  section: 'overview' | 'heritage' | 'today'
  title: string
  body: string
  sourceLabel: string
  sourceUrl: string
  orderIndex: number
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

export const GEOGRAPHY_META: Record<Geography, { name: string; short: string; icon: string; accent: string }> = {
  filistin: { name: 'Filistin', short: 'Kültürü, hafızayı ve insani sorumluluğu tanı', icon: 'olive', accent: '#0f766e' },
  'dogu_turkistan': { name: 'Doğu Türkistan', short: 'Uygur kültür mirasını ve hak temelli kaynakları tanı', icon: 'moon-stars', accent: '#2563eb' },
}

export const AWARENESS_CONTENT_FALLBACK: AwarenessContent[] = [
  { id: 'p-overview', geography: 'filistin', section: 'overview', title: 'Bir coğrafyadan fazlası', body: 'Filistin; Akdeniz kıyısından kadim kentlere uzanan, aile hafızası, gündelik yaşam ve güçlü kültürel üretimle biçimlenmiş bir coğrafyadır. Bu alan, insanları yalnızca kriz başlıklarıyla değil; tarihleri, emekleri ve kültürleriyle tanımayı amaçlar.', sourceLabel: 'UNESCO · Filistin mirası', sourceUrl: 'https://whc.unesco.org/en/statesparties/ps', orderIndex: 1 },
  { id: 'p-heritage', geography: 'filistin', section: 'heritage', title: 'Nakış, teraslar ve yaşayan miras', body: 'Filistin nakış sanatı 2021’de UNESCO İnsanlığın Somut Olmayan Kültürel Mirası listesine kaydedildi. Battir’in zeytin ve üzüm terasları da kuşaklar boyunca sürdürülen ortak bilgi ve emeğin izlerini taşır.', sourceLabel: 'UNESCO · Tatreez ve Battir', sourceUrl: 'https://ich.unesco.org/en/RL/the-art-of-embroidery-in-palestine-practices-skills-knowledge-and-rituals-01722', orderIndex: 2 },
  { id: 'p-today', geography: 'filistin', section: 'today', title: 'Bugünü insan onuruyla okumak', body: 'Güncel gelişmeleri değerlendirirken sivillerin korunması, insani yardımın tarafsızlığı ve uluslararası insancıl hukuk temel alınmalıdır. Hızlı paylaşımlar yerine güvenilir kurumların doğrulanmış açıklamalarını takip etmek önemlidir.', sourceLabel: 'ICRC · Bölgesel çalışma', sourceUrl: 'https://www.icrc.org/en/where-we-work/middle-east/israel-and-occupied-territories', orderIndex: 3 },
  { id: 'e-overview', geography: 'dogu_turkistan', section: 'overview', title: 'İpek Yolu’nun kültür kavşağı', body: 'Bugün Çin’in Sincan Uygur Özerk Bölgesi olarak adlandırdığı coğrafya, tarih boyunca Doğu ile Batı arasındaki kültürel alışverişin önemli kavşaklarından biri oldu. Uygur topluluklarının dili, müziği, edebiyatı ve şehir kültürü bu çoğul mirasın parçalarıdır.', sourceLabel: 'UNESCO · Uygur Muqamı', sourceUrl: 'https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109', orderIndex: 1 },
  { id: 'e-heritage', geography: 'dogu_turkistan', section: 'heritage', title: 'Muqam ve Meshrep', body: 'Uygur Muqamı; şarkı, dans, halk ve klasik müziği bir araya getiren zengin bir sanat geleneğidir. Meshrep ise müzik, dans, sözlü anlatı, oyun ve toplumsal aktarımı buluşturan yaşayan bir kültürel ortamdır.', sourceLabel: 'UNESCO · Meshrep', sourceUrl: 'https://ich.unesco.org/en/USL/meshrep-00304', orderIndex: 2 },
  { id: 'e-today', geography: 'dogu_turkistan', section: 'today', title: 'Hak temelli ve kaynaklı bakış', body: 'Güncel insan hakları tartışmalarını anlamak için iddiaları sosyal medya özetleriyle değil, birincil belgelerle karşılaştırmak gerekir. Birleşmiş Milletler İnsan Hakları Ofisi 31 Ağustos 2022’de bölgeye ilişkin kapsamlı bir değerlendirme yayımladı.', sourceLabel: 'OHCHR · 31 Ağustos 2022 değerlendirmesi', sourceUrl: 'https://www.ohchr.org/sites/default/files/documents/countries/2022-08-31/22-08-31-final-assesment.pdf', orderIndex: 3 },
]

const q = (id: string, geography: Geography, orderIndex: number, questionText: string, options: [string, string, string, string], correctOption: QuizOption, explanationText: string, sourceUrl: string): AwarenessQuizQuestion => ({ id, geography, orderIndex, questionText, options: { A: options[0], B: options[1], C: options[2], D: options[3] }, correctOption, explanationText, sourceUrl })

export const AWARENESS_QUIZ_FALLBACK: AwarenessQuizQuestion[] = [
  q('p-01','filistin',1,'Filistin nakış sanatı (tatreez) UNESCO Somut Olmayan Kültürel Miras listesine hangi yıl kaydedildi?',['2012','2017','2021','2024'],'C','Filistin nakış sanatı 2021’de UNESCO listesine kaydedildi; motifler bölgesel kimlik ve toplumsal yaşam hakkında bilgi taşır.','https://ich.unesco.org/en/RL/the-art-of-embroidery-in-palestine-practices-skills-knowledge-and-rituals-01722'),
  q('p-02','filistin',2,'UNESCO’ya göre Antik Eriha / Tell es-Sultan’ın en erken arkeolojik katmanları yaklaşık hangi döneme uzanır?',['MÖ 10.500','MÖ 2.000','MS 500','MS 1453'],'A','UNESCO alan açıklaması, yerleşim tarihini Natufyen avcı-toplayıcılarına ait yaklaşık MÖ 10.500 tarihli katmanlara kadar götürür.','https://whc.unesco.org/en/list/1687'),
  q('p-03','filistin',3,'Battir kültürel peyzajının belirgin özelliği hangisidir?',['Buz mağaraları','Zeytin ve üzüm terasları','Mercan adaları','Volkanik kraterler'],'B','Battir, kaynaklarla beslenen sulama sistemi ve kuru taş duvarlı zeytin-üzüm teraslarıyla tanınır.','https://whc.unesco.org/en/list/1492/'),
  q('p-04','filistin',4,'Beytüllahim’deki Doğuş Kilisesi UNESCO Dünya Mirası listesine hangi yıl girdi?',['1987','2001','2012','2023'],'C','Doğuş Kilisesi ve hac yolu 2012’de Dünya Mirası listesine kaydedildi.','https://whc.unesco.org/en/statesparties/ps'),
  q('p-05','filistin',5,'Birleşmiş Milletler Filistin Halkıyla Uluslararası Dayanışma Günü hangi tarihte gözlemlenir?',['29 Kasım','1 Ocak','8 Mart','21 Eylül'],'A','BM bu günü her yıl 29 Kasım’da veya o tarihe yakın bir günde gözlemler.','https://www.un.org/en/observances/international-day-of-solidarity-with-the-palestinian-people/background'),
  q('p-06','filistin',6,'UNRWA hangi Birleşmiş Milletler kararıyla 1949’da kuruldu?',['181 (II)','194 (III)','302 (IV)','242'],'C','UNRWA, BM Genel Kurulu’nun 8 Aralık 1949 tarihli 302 (IV) sayılı kararıyla kuruldu.','https://www.unrwa.org/who-we-are'),
  q('p-07','filistin',7,'Filistin’in UNESCO Dünya Mirası alanlarından biri hangisidir?',['Antik Eriha / Tell es-Sultan','Machu Picchu','Angkor','Pompeii'],'A','Antik Eriha / Tell es-Sultan 2023’te Filistin’in Dünya Mirası alanları arasına katıldı.','https://whc.unesco.org/en/statesparties/ps'),
  q('p-08','filistin',8,'Filistin nakışında desenler geleneksel olarak en çok neyi aktarır?',['Yalnız hava tahminini','Bölgesel kimlik ve toplumsal yaşamı','Sadece sayısal hesapları','Denizcilik rotalarını'],'B','UNESCO, motiflerin bölgesel kimlik, medeni durum ve toplumsal-ekonomik koşullar hakkında işaretler taşıdığını açıklar.','https://ich.unesco.org/en/RL/the-art-of-embroidery-in-palestine-practices-skills-knowledge-and-rituals-01722'),
  q('p-09','filistin',9,'Silahlı çatışmalarda insani yardım için temel ilke hangisidir?',['Tarafsızlık ve ayrım gözetmeme','Gizli propaganda','Sivilleri dışlama','Doğrulanmamış bilgi paylaşma'],'A','ICRC insani faaliyetlerini tarafsız, yansız ve bağımsız ilkelerle yürüttüğünü belirtir.','https://www.icrc.org/en/where-we-work/middle-east/israel-and-occupied-territories'),
  q('p-10','filistin',10,'Filistin hakkında güncel bilgi paylaşırken en güvenli yaklaşım hangisidir?',['Kaynağı kontrol etmek','Yalnız başlığı okumak','Tarihi kaldırmak','Görseli bağlamdan koparmak'],'A','Kaynak, tarih ve bağlam kontrolü; yanlış bilgi riskini azaltan temel adımdır. Bu alan resmî ve kurumsal kaynaklara bağlantı verir.','https://www.un.org/en/observances/international-day-of-solidarity-with-the-palestinian-people'),
  q('e-01','dogu_turkistan',1,'UNESCO’ya göre Uygur Muqamı hangi sanatları bir araya getirir?',['Yalnız mimariyi','Şarkı, dans, halk ve klasik müziği','Sadece heykeli','Yalnız sinemayı'],'B','Uygur Muqamı şarkı, dans, halk ve klasik müzik ile farklı sözlü anlatı biçimlerini buluşturur.','https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109'),
  q('e-02','dogu_turkistan',2,'Uygur Muqamının UNESCO listesinde belirtilen ana bölgesel üsluplarından biri hangisidir?',['Dolan Muqam','Flamenko','Kabuki','Fado'],'A','UNESCO dört ana üslubu Twelve, Dolan, Turpan ve Hami Muqam olarak sıralar.','https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109'),
  q('e-03','dogu_turkistan',3,'“Twelve Muqam” yaklaşık kaç enstrümantal ve vokal süitten oluşur?',['4','8','12','40'],'C','Adından da anlaşılacağı üzere Twelve Muqam, on iki enstrümantal ve vokal süitten oluşur.','https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109'),
  q('e-04','dogu_turkistan',4,'UNESCO’nun Meshrep tanımında hangisi yer alır?',['Müzik, dans, sözlü edebiyat ve oyunlar','Yalnız spor istatistikleri','Sadece yazılı sınavlar','Deniz feneri bakımı'],'A','Meshrep; müzik, dans, drama, sözlü edebiyat, yemek kültürü, akrobasi ve oyunları bir araya getiren toplumsal bir ortamdır.','https://ich.unesco.org/en/USL/meshrep-00304'),
  q('e-05','dogu_turkistan',5,'Meshrep UNESCO’nun Acil Koruma Gerektiren Somut Olmayan Kültürel Miras listesine hangi yıl kaydedildi?',['2001','2005','2010','2022'],'C','Meshrep 2010’da Acil Koruma Gerektiren Somut Olmayan Kültürel Miras listesine kaydedildi.','https://ich.unesco.org/en/USL/meshrep-00304'),
  q('e-06','dogu_turkistan',6,'UNESCO, Uygur Muqamının gelişiminde hangi tarihî konumun etkisini vurgular?',['İpek Yolu üzerindeki kültürel alışveriş','Atlas Okyanusu adaları','Antarktika seferleri','Amazon havzası'],'A','Bölgenin İpek Yolu üzerindeki merkezi konumu, Doğu-Batı kültürel alışverişini güçlendirdi.','https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109'),
  q('e-07','dogu_turkistan',7,'Uygur Muqamındaki şarkı sözlerinde hangileri bulunabilir?',['Halk baladları ve klasik Uygur şairlerinin şiirleri','Yalnız teknik kılavuzlar','Sadece hava raporları','Yalnız matematik formülleri'],'A','UNESCO; halk baladları, şiirler, atasözleri ve halk anlatılarının repertuvarda yer aldığını belirtir.','https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109'),
  q('e-08','dogu_turkistan',8,'BM İnsan Hakları Ofisinin bölgeye ilişkin değerlendirmesi hangi tarihte yayımlandı?',['31 Ağustos 2022','1 Ocak 2000','29 Kasım 1977','8 Aralık 1949'],'A','OHCHR değerlendirmesinin kapak tarihi 31 Ağustos 2022’dir.','https://www.ohchr.org/sites/default/files/documents/countries/2022-08-31/22-08-31-final-assesment.pdf'),
  q('e-09','dogu_turkistan',9,'Güncel hak tartışmalarını incelerken hangi kaynak önceliklidir?',['Birincil kurum belgeleri','Kaynağı belirsiz ekran görüntüleri','Tarihsiz zincir mesajlar','Kesilmiş videolar'],'A','Birincil belgeler; iddia, tarih ve bağlamın denetlenebilmesini sağlar. Bu nedenle OHCHR ve UNESCO gibi kurumların özgün belgeleri öne çıkarılır.','https://www.ohchr.org/sites/default/files/documents/countries/2022-08-31/22-08-31-final-assesment.pdf'),
  q('e-10','dogu_turkistan',10,'Uygur kültürel mirasını desteklemenin saygılı yollarından biri hangisidir?',['Kültürel üretimleri kaynaklı biçimde öğrenmek','Topluluğu tek bir kriz başlığına indirgemek','Doğrulanmamış sayı yaymak','İnsanları genellemek'],'A','İnsanları yalnız mağduriyetle tanımlamamak; dil, müzik, edebiyat ve gündelik yaşamı kaynaklı biçimde öğrenmek onurlu bir farkındalık yaklaşımıdır.','https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109'),
]

export const AWARENESS_ACTIONS = {
  filistin: [
    { icon: 'heart-handshake', title: 'Tarafsız insani yardımı destekle', body: 'ICRC’nin sivillere yönelik bağımsız insani çalışmasını incele.', href: 'https://www.icrc.org/en/donate/israelgaza' },
    { icon: 'building-community', title: 'UNRWA’nın görevini öğren', body: 'Kurumun kuruluşunu, hizmetlerini ve hesap verebilirlik kaynaklarını doğrudan oku.', href: 'https://www.unrwa.org/who-we-are' },
    { icon: 'book', title: 'Kültürel mirası tanı', body: 'UNESCO’nun Filistin Dünya Mirası kayıtlarını keşfet.', href: 'https://whc.unesco.org/en/statesparties/ps' },
  ],
  'dogu_turkistan': [
    { icon: 'file-description', title: 'Birincil belgeyi oku', body: 'OHCHR’nin 31 Ağustos 2022 değerlendirmesini kaynağından incele.', href: 'https://www.ohchr.org/sites/default/files/documents/countries/2022-08-31/22-08-31-final-assesment.pdf' },
    { icon: 'music', title: 'Uygur Muqamını tanı', body: 'UNESCO’nun yaşayan kültür mirası kaydını ve örneklerini keşfet.', href: 'https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109' },
    { icon: 'users', title: 'Meshrep mirasını öğren', body: 'Topluluk belleğini taşıyan Meshrep geleneğinin resmî kaydını oku.', href: 'https://ich.unesco.org/en/USL/meshrep-00304' },
  ],
} as const

export const quizReward = (score: number) => 40 + score * 5

