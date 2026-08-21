# SAH World — Günün Ayeti ve Hadisi İçerik Politikası

## Amaç

Bugünün Çarkı, kullanıcının kısa bir tefekkür başlangıcı bulmasına yardımcı olur. Çark bir fetva, dinî hüküm, tam meal veya hadis eğitimi yerine geçmez. XP yalnızca uygulama içindeki düzenli katılımı temsil eder.

## Kaynak yaklaşımı

- Ayet referansları Diyanet İşleri Başkanlığı Kur'an portalına bağlanır.
- Hadis referansları temel hadis kaynaklarıyla birlikte Diyanet Hadislerle İslâm portalına bağlanır.
- Uygulamadaki kısa metinler, uzun kaynak metnini kopyalamayan editoryal anlam özetleridir.
- Kullanıcıya her sonuçta “Kaynağı aç” eylemi ve tam bağlam uyarısı gösterilir.
- Yeni içerik eklenirken referans, tema, kaynak etiketi ve çalışan resmî bağlantı zorunludur.

## Kayıt ve güvenlik

- Seçilen ayet mevcut `quran_notes`, hadis mevcut `hadis_notes` tablosuna kaydedilir.
- Ownership mevcut Supabase RLS politikalarıyla `auth.uid()` üzerinden korunur.
- Kullanıcı aynı gün her türden en fazla bir çark kaydı için XP kazanabilir.
- Çark sonucu kaydedilmeden kullanıcının özel alanına yazılmaz.

## İçerik bakımı

İçerik seçkisi `src/lib/dailyReflections.ts` dosyasında tür güvenli ve merkezi tutulur. Anlam veya kaynak düzeltmesi gerektiğinde tek noktadan güncellenir; UI içinde ayrı metin kopyaları oluşturulmaz.
