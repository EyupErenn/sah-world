-- SAH World — Meslek ve Ahlak Okulu
-- Source policy: Qur'an translations link to Diyanet; hadith text links to the
-- exact Sahih al-Bukhari / Sahih Muslim record. The commonly repeated itqan
-- narration is deliberately not used because its attribution needs scholarly review.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profession_tracks (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9_-]+$'),
  profession_name TEXT NOT NULL UNIQUE CHECK (char_length(profession_name) BETWEEN 2 AND 80),
  icon TEXT NOT NULL CHECK (char_length(icon) BETWEEN 2 AND 60),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 280),
  color_accent TEXT NOT NULL CHECK (color_accent ~ '^#[0-9a-fA-F]{6}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profession_lessons (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9_-]+$'),
  track_id TEXT NOT NULL REFERENCES public.profession_tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 160),
  order_index INTEGER NOT NULL CHECK (order_index BETWEEN 1 AND 20),
  duration_estimate_minutes INTEGER NOT NULL CHECK (duration_estimate_minutes BETWEEN 1 AND 60),
  content_body JSONB NOT NULL CHECK (jsonb_typeof(content_body) = 'object'),
  source_references JSONB NOT NULL CHECK (jsonb_typeof(source_references) = 'array' AND jsonb_array_length(source_references) > 0),
  xp_reward INTEGER NOT NULL DEFAULT 30 CHECK (xp_reward BETWEEN 5 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, order_index)
);

CREATE TABLE IF NOT EXISTS public.user_profession_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES public.profession_tracks(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id)
);

CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES public.profession_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reflection_note TEXT CHECK (reflection_note IS NULL OR char_length(reflection_note) <= 600),
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS profession_lessons_track_order_idx ON public.profession_lessons(track_id, order_index);
CREATE INDEX IF NOT EXISTS user_profession_tracks_user_idx ON public.user_profession_tracks(user_id, followed_at DESC);
CREATE INDEX IF NOT EXISTS user_lesson_progress_user_idx ON public.user_lesson_progress(user_id, completed_at DESC);

ALTER TABLE public.profession_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profession_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profession_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY profession_tracks_read ON public.profession_tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY profession_lessons_read ON public.profession_lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY user_profession_tracks_select_own ON public.user_profession_tracks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_profession_tracks_insert_own ON public.user_profession_tracks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_profession_tracks_delete_own ON public.user_profession_tracks FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY user_lesson_progress_select_own ON public.user_lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_lesson_progress_insert_own ON public.user_lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_lesson_progress_update_own ON public.user_lesson_progress FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS profession_tracks_updated_at ON public.profession_tracks;
CREATE TRIGGER profession_tracks_updated_at BEFORE UPDATE ON public.profession_tracks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS profession_lessons_updated_at ON public.profession_lessons;
CREATE TRIGGER profession_lessons_updated_at BEFORE UPDATE ON public.profession_lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.profession_tracks (id, profession_name, icon, description, color_accent) VALUES
  ('muhendis','Mühendis','settings-cog','Emniyet, hassasiyet ve kamusal sorumluluğu teknik kararların merkezine al.','#4f46e5'),
  ('lojistikci','Lojistikçi','truck-delivery','Emaneti doğru zamanda, doğru şartlarda ve hakkaniyetle ulaştır.','#0f766e'),
  ('doktor','Doktor','stethoscope','Tıbbî yeterliliği merhamet, mahremiyet ve zarar vermeme ilkesiyle birleştir.','#be123c'),
  ('ogretmen','Öğretmen','school','Bilgiyi kolaylaştır, adil değerlendir ve her öğrencinin onurunu koru.','#7c3aed'),
  ('girisimci','Girişimci','briefcase-2','Değer üretirken şeffaflık, helal kazanç ve paydaş hakkını birlikte gözet.','#b45309'),
  ('ogrenci','Öğrenci','books','Öğrenmeyi niyet, doğrulama, emek ve faydaya dönüşen bilgiyle derinleştir.','#2563eb')
ON CONFLICT (id) DO UPDATE SET profession_name=EXCLUDED.profession_name, icon=EXCLUDED.icon, description=EXCLUDED.description, color_accent=EXCLUDED.color_accent;

WITH common(order_index,title,duration,opening_type,opening_arabic,opening_text,explanation,action,source_label,source_url) AS (VALUES
  (1,'Niyet: işi ibadet bilinciyle başlatmak',6,'hadis','إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ','Ameller niyetlere göredir; herkese niyet ettiği vardır.','Meslek yalnızca gelir üreten bir rol değildir. Helal rızık, insanlara fayda ve sorumluluğu hakkıyla taşıma niyeti teknik standardın neden korunacağını hatırlatır.','Bugünkü en önemli işinin başına tek cümlelik bir niyet yaz.','Sahih el-Buhârî 1 · Ameller niyetlere göredir','https://sunnah.com/bukhari:1'),
  (2,'Amanah: yetki, bilgi ve zaman birer emanettir',7,'ayet','إِنَّ اللَّهَ يَأْمُرُكُمْ أَنْ تُؤَدُّوا الْأَمَانَاتِ إِلَى أَهْلِهَا','Allah size, emanetleri mutlaka ehline vermenizi emrediyor.','Proje erişimi, müşteri bilgisi, bütçe, ekip zamanı ve yetki emanettir. Gizliliği korumak, çıkar çatışmasını bildirmek ve yetkin olmadığın konuda destek istemek profesyonel karakterin parçasıdır.','Taşıdığın bilgi, zaman ve karar emanetleri için birer koruma davranışı belirle.','Nisâ 4:58 · Emanet ve ehliyet','https://kuran.diyanet.gov.tr/mushaf/kuran-tefsir-1/nisa-suresi-4/ayet-58/diyanet-isleri-baskanligi-meali-1'),
  (3,'İhsan: kaliteyi görünür bir standarda dönüştürmek',8,'hadis','إِنَّ اللَّهَ كَتَبَ الإِحْسَانَ عَلَى كُلِّ شَيْءٍ','Allah her şeyde ihsanı gerekli kılmıştır.','İhsan; kontrol listesi, akran incelemesi, hata kaydı ve sürekli iyileştirme gibi doğrulanabilir kalite pratikleriyle görünür olur.','Teslim edeceğin bir işi ikinci kez kontrol et ve bir iyileştirmeyi kayda geçir.','Sahih Müslim 1955a · Her işte ihsan','https://sunnah.com/muslim:1955a'),
  (4,'Sıdk: hatayı ve sınırı saklamadan söylemek',7,'hadis','مَنْ غَشَّ فَلَيْسَ مِنِّي','Bizi aldatan bizden değildir.','Kusuru, gecikmeyi, veri sınırını veya çıkar çatışmasını saklamak güveni ve karar kalitesini bozar. Profesyonel doğruluk, önemli bilgiyi zamanında açıklamaktır.','Bir raporda varsayım, risk ve kesin olmayan noktaları açıkça etiketle.','Sahih Müslim 102 · Aldatma yasağı','https://sunnah.com/muslim:102'),
  (5,'Denge: işin, bedenin, ailenin ve ibadetin hakkı',6,'hadis','فَأَعْطِ كُلَّ ذِي حَقٍّ حَقَّهُ','Her hak sahibine hakkını ver.','Sınır koymak, dinlenmek, ibadet vakitlerini ve aile sorumluluğunu planlamak sürdürülebilir performansın ahlâkî tarafıdır.','Bugün iş, ibadet, dinlenme ve yakınların için gerçekçi zaman sınırları oluştur.','Sahih el-Buhârî 1968 · Her hak sahibine hakkı','https://sunnah.com/bukhari:1968')
)
INSERT INTO public.profession_lessons (id,track_id,title,order_index,duration_estimate_minutes,content_body,source_references,xp_reward)
SELECT t.id || '-' || c.order_index, t.id, c.title, c.order_index, c.duration,
  jsonb_build_object('openingType',c.opening_type,'openingArabic',c.opening_arabic,'openingText',c.opening_text,'explanation',c.explanation,'action',c.action),
  jsonb_build_array(jsonb_build_object('label',c.source_label,'url',c.source_url)), 30
FROM public.profession_tracks t CROSS JOIN common c
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,duration_estimate_minutes=EXCLUDED.duration_estimate_minutes,content_body=EXCLUDED.content_body,source_references=EXCLUDED.source_references,xp_reward=EXCLUDED.xp_reward;

WITH specific(track_id,order_index,title,duration,opening_type,opening_arabic,opening_text,explanation,action,source_label,source_url) AS (VALUES
  ('muhendis',6,'Emniyet kararlarında adalet ve bağımsızlık',9,'ayet','اعْدِلُوا هُوَ أَقْرَبُ لِلتَّقْوَى','Adaletli olun; bu, takvâya daha uygundur.','Maliyet ve takvim baskısı emniyet gereklerini gevşetmez. Riski kanıtla görünür kılmak ve insan güvenliğini pazarlık konusu yapmamak gerekir.','Bir tasarım kararında en kötü makul senaryoyu ve azaltıcı kontrolü yaz.','Mâide 5:8 · Adalet','https://kuran.diyanet.gov.tr/mushaf/kuran-tefsir-1/M%C3%A2ide-S%C3%BBresi-5/ayet-6/kuran-yolu-meali-5'),
  ('muhendis',7,'Ölçüm, tolerans ve doğrulanabilirlik',8,'ayet','وَأَوْفُوا الْكَيْلَ إِذَا كِلْتُمْ','Ölçtüğünüzde ölçmeyi tam yapın.','Kalibrasyon, tolerans, sürüm ve test sonucu doğru kaydedilmelidir; ham veri, yöntem ve belirsizlik birlikte saklanır.','Bir ölçümün kaynağını, birimini, toleransını ve tarihini doğrula.','İsrâ 17:35 · Ölçüde doğruluk','https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/isra-suresi-17/ayet-35/diyanet-isleri-baskanligi-meali-1'),
  ('muhendis',8,'Yetkinlik sınırı ve uzman görüşü',7,'ayet','فَاسْأَلُوا أَهْلَ الذِّكْرِ إِنْ كُنْتُمْ لَا تَعْلَمُونَ','Bilmiyorsanız bilgi sahibi olanlara sorun.','Yetkinlik sınırını bilmek risk yönetimidir. Kritik alanda uzman incelemesi istemek meslek etiği ve emanet bilincidir.','Uzman görüşü gerektiren bir teknik belirsizliği doğru kişiye taşı.','Nahl 16:43 · Uzmanlık','https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/nahl-suresi-16/ayet-43/diyanet-isleri-baskanligi-meali-1'),
  ('lojistikci',6,'Taşınan malın ve bilginin emaneti',8,'ayet','إِنَّ اللَّهَ يَأْمُرُكُمْ أَنْ تُؤَدُّوا الْأَمَانَاتِ إِلَى أَهْلِهَا','Emanetleri mutlaka ehline verin.','Ürün güvenliği, sıcaklık zinciri, teslim bilgisi ve müşteri verisi birlikte korunur; hasar ve gecikme erken bildirilir.','Bir sevkiyatın teslim, koşul ve hasar kontrol noktalarını doğrula.','Nisâ 4:58 · Emanet','https://kuran.diyanet.gov.tr/mushaf/kuran-tefsir-1/nisa-suresi-4/ayet-58/diyanet-isleri-baskanligi-meali-1'),
  ('lojistikci',7,'Sözleşme, süre ve teslim sözü',7,'ayet','يَا أَيُّهَا الَّذِينَ آمَنُوا أَوْفُوا بِالْعُقُودِ','Ey iman edenler! Akitleri yerine getirin.','Kapasiteyi dürüst hesaplamak, gecikmeyi erken haber vermek ve değişikliği yazılı mutabakatla yönetmek gerekir.','Açık bir teslim sözünü kapasite, risk ve sorumlu kişi açısından doğrula.','Mâide 5:1 · Akitler','https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/maide-suresi-5/ayet-1/diyanet-isleri-baskanligi-meali-1'),
  ('lojistikci',8,'Dağıtım kararlarında hakkaniyet',8,'ayet','اعْدِلُوا هُوَ أَقْرَبُ لِلتَّقْوَى','Adaletli olun; bu, takvâya daha uygundur.','Kıt kapasite dağıtılırken aciliyet, kırılganlık ve sözleşme hakkı birlikte değerlendirilir; kriterler denetlenebilir olmalıdır.','Bir öncelik kararının kriterlerini yaz ve herkese aynı uygulanıp uygulanmadığını kontrol et.','Mâide 5:8 · Adalet','https://kuran.diyanet.gov.tr/mushaf/kuran-tefsir-1/M%C3%A2ide-S%C3%BBresi-5/ayet-6/kuran-yolu-meali-5'),
  ('doktor',6,'Hayatı koruma ve klinik özen',9,'ayet',NULL,'Kim bir canı kurtarırsa bütün insanların hayatını kurtarmış gibi olur.','Ayetin bağlamı korunarak hayatın değerini hatırlatır. Klinik özen doğru kimliklendirme, ilaç kontrolü, güncel rehber ve konsültasyonla somutlaşır.','Bir hasta güvenliği kontrolünü çift doğrulamayla tamamla.','Mâide 5:32 · Hayatı koruma','https://kuran.diyanet.gov.tr/mushaf/kuran-tefsir-1/maide-suresi-5/ayet-32/diyanet-isleri-baskanligi-meali-1'),
  ('doktor',7,'Mahremiyet ve tıbbî sır',8,'ayet','إِنَّ اللَّهَ يَأْمُرُكُمْ أَنْ تُؤَدُّوا الْأَمَانَاتِ إِلَى أَهْلِهَا','Emanetleri ehline verin.','Hasta bilgisi korunması gereken emanettir; yalnız bakım için gerekli kişilere gerekli kadar bilgi verilir.','Çalışma alanında bir mahremiyet riskini bul ve ortadan kaldır.','Nisâ 4:58 · Emanet','https://kuran.diyanet.gov.tr/mushaf/kuran-tefsir-1/nisa-suresi-4/ayet-58/diyanet-isleri-baskanligi-meali-1'),
  ('doktor',8,'Bilmediğinde danışmak, belirsizliği açıklamak',8,'ayet','فَاسْأَلُوا أَهْلَ الذِّكْرِ إِنْ كُنْتُمْ لَا تَعْلَمُونَ','Bilmiyorsanız bilgi sahibi olanlara sorun.','Belirsizliği uygun dille açıklamak ve konsültasyon istemek güvenliği artırır; yetkinlik sınırını tanımak klinik tevazudur.','Belirsiz kaldığın bir konuda rehber veya uzman görüşünü doğrula.','Nahl 16:43 · Uzmanlık','https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/nahl-suresi-16/ayet-43/diyanet-isleri-baskanligi-meali-1'),
  ('ogretmen',6,'Kolaylaştıran ve ümit veren öğretim',8,'hadis','يَسِّرُوا وَلاَ تُعَسِّرُوا وَبَشِّرُوا وَلاَ تُنَفِّرُوا','Kolaylaştırın, zorlaştırmayın; müjdeleyin, nefret ettirmeyin.','Kolaylaştırmak beklentiyi düşürmek değil; hedefi görünür kılmak, örnek vermek ve öğrenciyi utandırmadan düzeltmektir.','Bir konuyu üç küçük adıma böl ve ilk başarıyı erken görünür kıl.','Sahih el-Buhârî 69 · Kolaylaştırma','https://sunnah.com/bukhari:69'),
  ('ogretmen',7,'Değerlendirmede adalet',8,'ayet','اعْدِلُوا هُوَ أَقْرَبُ لِلتَّقْوَى','Adaletli olun; bu, takvâya daha uygundur.','Ölçütü önceden açıklamak, benzer performansa benzer karşılık vermek ve itirazı dinlemek öğretmenin emanetidir.','Bir ödev için üç açık ölçüt yaz ve önceden paylaş.','Mâide 5:8 · Adalet','https://kuran.diyanet.gov.tr/mushaf/kuran-tefsir-1/M%C3%A2ide-S%C3%BBresi-5/ayet-6/kuran-yolu-meali-5'),
  ('ogretmen',8,'Bilginin sınırını dürüstçe göstermek',7,'ayet','فَاسْأَلُوا أَهْلَ الذِّكْرِ إِنْ كُنْتُمْ لَا تَعْلَمُونَ','Bilmiyorsanız bilgi sahibi olanlara sorun.','Bilmiyorum deyip araştırarak geri dönmek güvenilir öğrenme modeli kurar; kaynak göstermek epistemik dürüstlük öğretir.','Cevaplayamadığın bir soruyu doğrula ve öğrenciye geri dön.','Nahl 16:43 · Uzmanlık','https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/nahl-suresi-16/ayet-43/diyanet-isleri-baskanligi-meali-1'),
  ('girisimci',6,'Satışta açıklık ve kusuru saklamamak',9,'hadis',NULL,'Taraflar doğru söyler ve özellikleri açıklarsa alışverişleri bereketlenir.','Fiyat, kapsam, risk, yenileme ve ürün sınırları görünür olmalıdır; önemli kusuru saklamak müşterinin iradesini bozar.','Teklifinde müşterinin kararını etkileyen bir sınırlamayı görünür yap.','Sahih el-Buhârî 2079 · Ticarette açıklık','https://sunnah.com/bukhari:2079'),
  ('girisimci',7,'Helal finans ve riba hassasiyeti',9,'ayet','وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا','Allah alışverişi helâl, faizi haram kılmıştır.','Finansman modeli dinî ve hukukî değerlendirme gerektirir. Şüpheli sözleşme ehil fıkıh ve finans uzmanına inceletilmelidir.','Bir finansman sözleşmesini faiz, gecikme ve ceza maddeleri açısından işaretle.','Bakara 2:275 · Faiz','https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/bakara-suresi-2/ayet-275/diyanet-isleri-baskanligi-meali-1'),
  ('girisimci',8,'Çalışan, müşteri ve yatırımcı hakkı',8,'ayet','اعْدِلُوا هُوَ أَقْرَبُ لِلتَّقْوَى','Adaletli olun; bu, takvâya daha uygundur.','Büyüme hedefi ücret, çalışma yükü, müşteri sözü ve yatırımcı bilgisini birbirine ezdirmemelidir.','Bir karar için kim fayda görüyor, kim risk taşıyor tablosu çıkar.','Mâide 5:8 · Adalet','https://kuran.diyanet.gov.tr/mushaf/kuran-tefsir-1/M%C3%A2ide-S%C3%BBresi-5/ayet-6/kuran-yolu-meali-5'),
  ('ogrenci',6,'İlmi artırma duası ve öğrenme hedefi',7,'ayet','رَبِّ زِدْنِي عِلْمًا','Rabbim, ilmimi artır!','Bilgiyi anlamak, doğrulamak ve faydaya dönüştürmek gerekir. İyi hedef neyi, ne kadar ve nasıl sınayacağını söyler.','Konu, süre ve kendini sınama yönteminden oluşan tek hedef yaz.','Tâhâ 20:114 · İlim duası','https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/taha-suresi-20/ayet-114/diyanet-isleri-baskanligi-meali-1'),
  ('ogrenci',7,'Kaynağı doğrulamak ve intihalden kaçınmak',8,'ayet',NULL,'Bir haber geldiğinde doğruluğunu araştırın.','Kaynak doğrulama ödev, sunum ve araştırmada ahlâkî disiplindir; başkasının fikrini sahiplenmek öğrenmeyi ve güveni zedeler.','Bir ödevindeki üç iddianın asıl kaynağını bul ve atıfları düzelt.','Hucurât 49:6 · Doğrulama','https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/hucurat-suresi-49/ayet-6/diyanet-isleri-baskanligi-meali-1'),
  ('ogrenci',8,'Bilmediğini sormak ve geri bildirim istemek',7,'ayet','فَاسْأَلُوا أَهْلَ الذِّكْرِ إِنْ كُنْتُمْ لَا تَعْلَمُونَ','Bilmiyorsanız bilgi sahibi olanlara sorun.','Önce neyi denediğini göstermek, soruyu daraltmak ve geri bildirimi uygulamak öğrenme çevrimini güçlendirir.','Sorunu bildiğim, denediğim, anlamadığım şeklinde üç satırla sor.','Nahl 16:43 · Uzmanlık','https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/nahl-suresi-16/ayet-43/diyanet-isleri-baskanligi-meali-1')
)
INSERT INTO public.profession_lessons (id,track_id,title,order_index,duration_estimate_minutes,content_body,source_references,xp_reward)
SELECT s.track_id || '-' || s.order_index, s.track_id, s.title, s.order_index, s.duration,
  jsonb_strip_nulls(jsonb_build_object('openingType',s.opening_type,'openingArabic',s.opening_arabic,'openingText',s.opening_text,'explanation',s.explanation,'action',s.action)),
  jsonb_build_array(jsonb_build_object('label',s.source_label,'url',s.source_url)), 30
FROM specific s
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,duration_estimate_minutes=EXCLUDED.duration_estimate_minutes,content_body=EXCLUDED.content_body,source_references=EXCLUDED.source_references,xp_reward=EXCLUDED.xp_reward;

CREATE OR REPLACE FUNCTION public.complete_profession_lesson(target_lesson_id TEXT, reflection_text TEXT DEFAULT NULL)
RETURNS TABLE(awarded BOOLEAN, xp_awarded INTEGER, track_completed BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor UUID := auth.uid();
  lesson_row public.profession_lessons%ROWTYPE;
  progress_id UUID;
  completed_count INTEGER;
  lesson_count INTEGER;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  SELECT * INTO lesson_row FROM public.profession_lessons WHERE id = target_lesson_id;
  IF lesson_row.id IS NULL THEN RAISE EXCEPTION 'lesson_not_found'; END IF;
  IF reflection_text IS NOT NULL AND char_length(reflection_text) > 600 THEN RAISE EXCEPTION 'reflection_too_long'; END IF;

  INSERT INTO public.user_profession_tracks(user_id, track_id) VALUES(actor, lesson_row.track_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_lesson_progress(user_id, lesson_id, reflection_note)
  VALUES(actor, target_lesson_id, NULLIF(trim(reflection_text), ''))
  ON CONFLICT (user_id, lesson_id) DO NOTHING RETURNING id INTO progress_id;

  awarded := progress_id IS NOT NULL;
  xp_awarded := CASE WHEN awarded THEN lesson_row.xp_reward ELSE 0 END;
  IF awarded THEN
    UPDATE public.profiles SET xp = xp + lesson_row.xp_reward WHERE id = actor;
    INSERT INTO public.xp_events(user_id, source_type, source_id, label, xp_amount)
    VALUES(actor, 'profession_lesson', progress_id, left(lesson_row.title, 120), lesson_row.xp_reward)
    ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
  END IF;

  SELECT count(*) INTO completed_count FROM public.user_lesson_progress p JOIN public.profession_lessons l ON l.id=p.lesson_id WHERE p.user_id=actor AND l.track_id=lesson_row.track_id;
  SELECT count(*) INTO lesson_count FROM public.profession_lessons WHERE track_id=lesson_row.track_id;
  track_completed := lesson_count > 0 AND completed_count >= lesson_count;
  IF track_completed THEN
    UPDATE public.profiles SET badges = CASE WHEN badges @> ARRAY['meslek_ahlaki']::TEXT[] THEN badges ELSE array_append(badges,'meslek_ahlaki') END WHERE id=actor;
  END IF;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.complete_profession_lesson(TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_profession_lesson(TEXT,TEXT) TO authenticated;
GRANT SELECT ON public.profession_tracks, public.profession_lessons TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_profession_tracks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_lesson_progress TO authenticated;

COMMIT;
