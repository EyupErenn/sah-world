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

/**
 * Kısa anlamlar, kullanıcıyı resmî kaynağa yönlendiren editoryal özetlerdir;
 * tam meal veya hadis metni yerine geçmez. Kaynaklar Diyanet'in Kur'an ve
 * Hadislerle İslâm yayınlarına bağlanır.
 */
export const VERSE_REFLECTIONS: DailyReflection[] = [
  { id: 'insirah-5-6', kind: 'verse', title: 'Zorlukla beraber kolaylık', reference: 'İnşirâh 94:5-6', text: 'Her güçlüğün yanında bir kolaylığın bulunduğunu hatırla.', theme: 'Umut', sourceLabel: 'Diyanet Kur’an Yolu', sourceUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/insirah-suresi-94/ayet-1/kuran-yolu-meali-5' },
  { id: 'bakara-152', kind: 'verse', title: 'Hatırla ve şükret', reference: 'Bakara 2:152', text: 'Rabbini an, sana verilenleri fark et ve şükrü canlı tut.', theme: 'Şükür', sourceLabel: 'Diyanet Kur’an', sourceUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/bakara-suresi-2/ayet-152/diyanet-isleri-baskanligi-meali-1' },
  { id: 'rad-28', kind: 'verse', title: 'Kalbin sükûneti', reference: 'Ra’d 13:28', text: 'Kalplerin Allah’ı anmakla huzur bulduğunu düşün.', theme: 'Huzur', sourceLabel: 'Diyanet Kur’an', sourceUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/rad-suresi-13/ayet-28/diyanet-isleri-baskanligi-meali-1' },
  { id: 'zumer-53', kind: 'verse', title: 'Ümidini koru', reference: 'Zümer 39:53', text: 'Hataların ne kadar ağır görünürse görünsün Allah’ın rahmetinden ümit kesme.', theme: 'Rahmet', sourceLabel: 'Diyanet Kur’an', sourceUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/zumer-suresi-39/ayet-53/diyanet-isleri-baskanligi-meali-1' },
  { id: 'bakara-286', kind: 'verse', title: 'Gücünün ölçüsü', reference: 'Bakara 2:286', text: 'Allah’ın insana taşıyabileceğinin ötesinde bir sorumluluk yüklemediğini hatırla.', theme: 'Dayanıklılık', sourceLabel: 'Diyanet Kur’an', sourceUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/bakara-suresi-2/ayet-286/diyanet-isleri-baskanligi-meali-1' },
  { id: 'ibrahim-7', kind: 'verse', title: 'Şükrün bereketi', reference: 'İbrâhîm 14:7', text: 'Şükrün, nimeti fark etmeyi ve çoğaltmayı öğreten bir tutum olduğunu düşün.', theme: 'Şükür', sourceLabel: 'Diyanet Kur’an', sourceUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/ibrahim-suresi-14/ayet-7/diyanet-isleri-baskanligi-meali-1' },
  { id: 'taha-46', kind: 'verse', title: 'Yalnız değilsin', reference: 'Tâhâ 20:46', text: 'Korkunun içinde bile Allah’ın işittiğini ve gördüğünü hatırla.', theme: 'Güven', sourceLabel: 'Diyanet Kur’an', sourceUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/taha-suresi-20/ayet-46/diyanet-isleri-baskanligi-meali-1' },
  { id: 'duha-5', kind: 'verse', title: 'Geleceğe güven', reference: 'Duhâ 93:5', text: 'Rabbinin lütfunun gönlüne razılık vereceğine dair umudu koru.', theme: 'Teselli', sourceLabel: 'Diyanet Kur’an', sourceUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/duha-suresi-93/ayet-5/diyanet-isleri-baskanligi-meali-1' },
  { id: 'nahl-128', kind: 'verse', title: 'İyiliği güzel yap', reference: 'Nahl 16:128', text: 'Sorumluluk bilinciyle hareket eden ve iyiliği güzel yapanlarla Allah’ın beraberliğini düşün.', theme: 'İhsan', sourceLabel: 'Diyanet Kur’an Yolu', sourceUrl: 'https://kuran.diyanet.gov.tr/mushaf/tefsir-2/nahl-suresi-16/ayet-116/kuran-yolu-meali-5' },
  { id: 'muminun-61', kind: 'verse', title: 'İyilikte gayret', reference: 'Mü’minûn 23:61', text: 'İyiliklere yönelmenin ve bu uğurda gayret göstermenin değerini hatırla.', theme: 'Gayret', sourceLabel: 'Diyanet Kur’an Yolu', sourceUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-tefsir-1/muminun-suresi-23/ayet-60/kuran-yolu-meali-5' },
]

export const HADITH_REFLECTIONS: DailyReflection[] = [
  { id: 'muslim-musafirin-216', kind: 'hadith', title: 'Az ama devamlı', reference: 'Müslim, Müsâfirîn, 216', text: 'Allah katında sevilen amellerin az da olsa devamlı yapılanlar olduğunu hatırla.', theme: 'İstikrar', sourceLabel: 'Diyanet Hadislerle İslâm', sourceUrl: 'https://hadislerleislam.diyanet.gov.tr/sayfa.php?CILT=3&SAYFA=193' },
  { id: 'buhari-bedul-vahy-1', kind: 'hadith', title: 'Niyetin yönü', reference: 'Buhârî, Bed’ü’l-vahy, 1', text: 'Amellerin değerinin niyetlerle bağlantılı olduğunu düşün.', theme: 'Niyet', sourceLabel: 'Diyanet Hadislerle İslâm', sourceUrl: 'https://hadislerleislam.diyanet.gov.tr/' },
  { id: 'buhari-edeb-31', kind: 'hadith', title: 'İyi söz veya sükût', reference: 'Buhârî, Edeb, 31; Müslim, Îmân, 74', text: 'Sözün hayırlı olacaksa söyle; değilse sükûtu seç.', theme: 'Edep', sourceLabel: 'Diyanet Hadislerle İslâm', sourceUrl: 'https://hadislerleislam.diyanet.gov.tr/' },
  { id: 'tirmizi-birr-36', kind: 'hadith', title: 'Tebessümün iyiliği', reference: 'Tirmizî, Birr, 36', text: 'Bir insana içtenlikle gülümsemenin de iyilik olduğunu hatırla.', theme: 'Nezaket', sourceLabel: 'Diyanet Hadislerle İslâm', sourceUrl: 'https://hadislerleislam.diyanet.gov.tr/' },
  { id: 'buhari-edeb-34', kind: 'hadith', title: 'Güzel söz', reference: 'Buhârî, Edeb, 34; Müslim, Zekât, 56', text: 'İnsana iyi gelen, doğru ve güzel bir sözün sadaka değerinde olduğunu düşün.', theme: 'İyilik', sourceLabel: 'Diyanet Hadislerle İslâm', sourceUrl: 'https://hadislerleislam.diyanet.gov.tr/' },
  { id: 'muslim-birr-34', kind: 'hadith', title: 'Kalp ve davranış', reference: 'Müslim, Birr, 34', text: 'Görünüşten önce kalbin yönüne ve davranışların niteliğine dikkat et.', theme: 'Samimiyet', sourceLabel: 'Diyanet Hadislerle İslâm', sourceUrl: 'https://hadislerleislam.diyanet.gov.tr/' },
  { id: 'buhari-ilim-12', kind: 'hadith', title: 'Kolaylaştır', reference: 'Buhârî, İlim, 12; Müslim, Cihâd, 6', text: 'İnsanlara güçlük çıkarmak yerine kolaylık göstermeyi ve ümit vermeyi seç.', theme: 'Kolaylık', sourceLabel: 'Diyanet Hadislerle İslâm', sourceUrl: 'https://hadislerleislam.diyanet.gov.tr/' },
  { id: 'tirmizi-birr-16', kind: 'hadith', title: 'Merhamet göster', reference: 'Tirmizî, Birr, 16; Ebû Dâvûd, Edeb, 58', text: 'Yeryüzündekilere merhametle yaklaşmanın rahmete açılan bir yol olduğunu hatırla.', theme: 'Merhamet', sourceLabel: 'Diyanet Hadislerle İslâm', sourceUrl: 'https://hadislerleislam.diyanet.gov.tr/' },
  { id: 'buhari-iman-4', kind: 'hadith', title: 'Güven veren insan', reference: 'Buhârî, Îmân, 4; Müslim, Îmân, 64', text: 'Elinden ve dilinden insanların güvende olduğu biri olmayı niyet et.', theme: 'Güven', sourceLabel: 'Diyanet Hadislerle İslâm', sourceUrl: 'https://hadislerleislam.diyanet.gov.tr/' },
  { id: 'muslim-zikir-38', kind: 'hadith', title: 'Yükü hafiflet', reference: 'Müslim, Zikir, 38', text: 'Bir insanın sıkıntısını hafifletmenin ve ona destek olmanın değerini düşün.', theme: 'Dayanışma', sourceLabel: 'Diyanet Hadislerle İslâm', sourceUrl: 'https://hadislerleislam.diyanet.gov.tr/' },
]

export function getDailyReflectionIndex(kind: ReflectionKind, length: number, date = new Date()) {
  const key = `${kind}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  let hash = 0
  for (const character of key) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
  return Math.abs(hash) % length
}
