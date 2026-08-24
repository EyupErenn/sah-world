-- SAH World — sourced regional-awareness content and private quiz attempts.
-- The application keeps the internal `xp` profile column for backwards compatibility;
-- user-facing copy calls the same unit XH (Xeyir Hanesi).

CREATE TABLE IF NOT EXISTS public.regional_awareness_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geography TEXT NOT NULL CHECK (geography IN ('filistin', 'dogu_turkistan')),
  section TEXT NOT NULL CHECK (section IN ('overview', 'heritage', 'today')),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 120),
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 20 AND 1200),
  source_label TEXT NOT NULL CHECK (char_length(trim(source_label)) BETWEEN 3 AND 120),
  source_url TEXT NOT NULL CHECK (source_url ~ '^https://'),
  order_index INTEGER NOT NULL CHECK (order_index BETWEEN 1 AND 20),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (geography, section)
);

CREATE TABLE IF NOT EXISTS public.awareness_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geography TEXT NOT NULL CHECK (geography IN ('filistin', 'dogu_turkistan')),
  question_text TEXT NOT NULL CHECK (char_length(trim(question_text)) BETWEEN 10 AND 300),
  option_a TEXT NOT NULL, option_b TEXT NOT NULL, option_c TEXT NOT NULL, option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  explanation_text TEXT NOT NULL CHECK (char_length(trim(explanation_text)) BETWEEN 10 AND 600),
  source_url TEXT NOT NULL CHECK (source_url ~ '^https://'),
  order_index INTEGER NOT NULL CHECK (order_index BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (geography, order_index)
);

CREATE TABLE IF NOT EXISTS public.user_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  geography TEXT NOT NULL CHECK (geography IN ('filistin', 'dogu_turkistan')),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
  xh_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xh_awarded BETWEEN 0 AND 90),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS awareness_content_geo_idx ON public.regional_awareness_content(geography, order_index);
CREATE INDEX IF NOT EXISTS awareness_questions_geo_idx ON public.awareness_quiz_questions(geography, order_index);
CREATE INDEX IF NOT EXISTS quiz_attempts_user_idx ON public.user_quiz_attempts(user_id, completed_at DESC);

DROP TRIGGER IF EXISTS awareness_content_updated_at ON public.regional_awareness_content;
CREATE TRIGGER awareness_content_updated_at BEFORE UPDATE ON public.regional_awareness_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS awareness_questions_updated_at ON public.awareness_quiz_questions;
CREATE TRIGGER awareness_questions_updated_at BEFORE UPDATE ON public.awareness_quiz_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.regional_awareness_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awareness_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY awareness_content_read ON public.regional_awareness_content FOR SELECT TO authenticated USING (is_published OR public.is_app_admin());
CREATE POLICY awareness_content_admin_insert ON public.regional_awareness_content FOR INSERT TO authenticated WITH CHECK (public.is_app_admin());
CREATE POLICY awareness_content_admin_update ON public.regional_awareness_content FOR UPDATE TO authenticated USING (public.is_app_admin()) WITH CHECK (public.is_app_admin());
CREATE POLICY awareness_content_admin_delete ON public.regional_awareness_content FOR DELETE TO authenticated USING (public.is_app_admin());
CREATE POLICY awareness_questions_read ON public.awareness_quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY awareness_questions_admin_insert ON public.awareness_quiz_questions FOR INSERT TO authenticated WITH CHECK (public.is_app_admin());
CREATE POLICY awareness_questions_admin_update ON public.awareness_quiz_questions FOR UPDATE TO authenticated USING (public.is_app_admin()) WITH CHECK (public.is_app_admin());
CREATE POLICY awareness_questions_admin_delete ON public.awareness_quiz_questions FOR DELETE TO authenticated USING (public.is_app_admin());
CREATE POLICY quiz_attempts_select_own ON public.user_quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY quiz_attempts_insert_own ON public.user_quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

INSERT INTO public.regional_awareness_content (geography, section, title, body, source_label, source_url, order_index) VALUES
('filistin','overview','Bir coğrafyadan fazlası','Filistin; Akdeniz kıyısından kadim kentlere uzanan, aile hafızası, gündelik yaşam ve güçlü kültürel üretimle biçimlenmiş bir coğrafyadır. Bu alan, insanları yalnızca kriz başlıklarıyla değil; tarihleri, emekleri ve kültürleriyle tanımayı amaçlar.','UNESCO · Filistin mirası','https://whc.unesco.org/en/statesparties/ps',1),
('filistin','heritage','Nakış, teraslar ve yaşayan miras','Filistin nakış sanatı 2021’de UNESCO İnsanlığın Somut Olmayan Kültürel Mirası listesine kaydedildi. Battir’in zeytin ve üzüm terasları da kuşaklar boyunca sürdürülen ortak bilgi ve emeğin izlerini taşır.','UNESCO · Tatreez ve Battir','https://ich.unesco.org/en/RL/the-art-of-embroidery-in-palestine-practices-skills-knowledge-and-rituals-01722',2),
('filistin','today','Bugünü insan onuruyla okumak','Güncel gelişmeleri değerlendirirken sivillerin korunması, insani yardımın tarafsızlığı ve uluslararası insancıl hukuk temel alınmalıdır. Hızlı paylaşımlar yerine güvenilir kurumların doğrulanmış açıklamalarını takip etmek önemlidir.','ICRC · Bölgesel çalışma','https://www.icrc.org/en/where-we-work/middle-east/israel-and-occupied-territories',3),
('dogu_turkistan','overview','İpek Yolu’nun kültür kavşağı','Bugün Çin’in Sincan Uygur Özerk Bölgesi olarak adlandırdığı coğrafya, tarih boyunca Doğu ile Batı arasındaki kültürel alışverişin önemli kavşaklarından biri oldu. Uygur topluluklarının dili, müziği, edebiyatı ve şehir kültürü bu çoğul mirasın parçalarıdır.','UNESCO · Uygur Muqamı','https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109',1),
('dogu_turkistan','heritage','Muqam ve Meshrep','Uygur Muqamı; şarkı, dans, halk ve klasik müziği bir araya getiren zengin bir sanat geleneğidir. Meshrep ise müzik, dans, sözlü anlatı, oyun ve toplumsal aktarımı buluşturan yaşayan bir kültürel ortamdır.','UNESCO · Meshrep','https://ich.unesco.org/en/USL/meshrep-00304',2),
('dogu_turkistan','today','Hak temelli ve kaynaklı bakış','Güncel insan hakları tartışmalarını anlamak için iddiaları sosyal medya özetleriyle değil, birincil belgelerle karşılaştırmak gerekir. Birleşmiş Milletler İnsan Hakları Ofisi 31 Ağustos 2022’de bölgeye ilişkin kapsamlı bir değerlendirme yayımladı.','OHCHR · 31 Ağustos 2022 değerlendirmesi','https://www.ohchr.org/sites/default/files/documents/countries/2022-08-31/22-08-31-final-assesment.pdf',3)
ON CONFLICT (geography, section) DO UPDATE SET title=EXCLUDED.title, body=EXCLUDED.body, source_label=EXCLUDED.source_label, source_url=EXCLUDED.source_url, order_index=EXCLUDED.order_index;

INSERT INTO public.awareness_quiz_questions (geography, order_index, question_text, option_a, option_b, option_c, option_d, correct_option, explanation_text, source_url) VALUES
('filistin',1,'Filistin nakış sanatı (tatreez) UNESCO Somut Olmayan Kültürel Miras listesine hangi yıl kaydedildi?','2012','2017','2021','2024','C','Filistin nakış sanatı 2021’de UNESCO listesine kaydedildi; motifler bölgesel kimlik ve toplumsal yaşam hakkında bilgi taşır.','https://ich.unesco.org/en/RL/the-art-of-embroidery-in-palestine-practices-skills-knowledge-and-rituals-01722'),
('filistin',2,'UNESCO’ya göre Antik Eriha / Tell es-Sultan’ın en erken arkeolojik katmanları yaklaşık hangi döneme uzanır?','MÖ 10.500','MÖ 2.000','MS 500','MS 1453','A','UNESCO alan açıklaması, yerleşim tarihini yaklaşık MÖ 10.500 tarihli katmanlara kadar götürür.','https://whc.unesco.org/en/list/1687'),
('filistin',3,'Battir kültürel peyzajının belirgin özelliği hangisidir?','Buz mağaraları','Zeytin ve üzüm terasları','Mercan adaları','Volkanik kraterler','B','Battir, kaynaklarla beslenen sulama sistemi ve kuru taş duvarlı zeytin-üzüm teraslarıyla tanınır.','https://whc.unesco.org/en/list/1492/'),
('filistin',4,'Beytüllahim’deki Doğuş Kilisesi UNESCO Dünya Mirası listesine hangi yıl girdi?','1987','2001','2012','2023','C','Doğuş Kilisesi ve hac yolu 2012’de Dünya Mirası listesine kaydedildi.','https://whc.unesco.org/en/statesparties/ps'),
('filistin',5,'Birleşmiş Milletler Filistin Halkıyla Uluslararası Dayanışma Günü hangi tarihte gözlemlenir?','29 Kasım','1 Ocak','8 Mart','21 Eylül','A','BM bu günü her yıl 29 Kasım’da veya o tarihe yakın bir günde gözlemler.','https://www.un.org/en/observances/international-day-of-solidarity-with-the-palestinian-people/background'),
('filistin',6,'UNRWA hangi Birleşmiş Milletler kararıyla 1949’da kuruldu?','181 (II)','194 (III)','302 (IV)','242','C','UNRWA, BM Genel Kurulu’nun 8 Aralık 1949 tarihli 302 (IV) sayılı kararıyla kuruldu.','https://www.unrwa.org/who-we-are'),
('filistin',7,'Filistin’in UNESCO Dünya Mirası alanlarından biri hangisidir?','Antik Eriha / Tell es-Sultan','Machu Picchu','Angkor','Pompeii','A','Antik Eriha / Tell es-Sultan 2023’te Filistin’in Dünya Mirası alanları arasına katıldı.','https://whc.unesco.org/en/statesparties/ps'),
('filistin',8,'Filistin nakışında desenler geleneksel olarak en çok neyi aktarır?','Yalnız hava tahminini','Bölgesel kimlik ve toplumsal yaşamı','Sadece sayısal hesapları','Denizcilik rotalarını','B','UNESCO, motiflerin bölgesel kimlik ve toplumsal-ekonomik koşullar hakkında işaretler taşıdığını açıklar.','https://ich.unesco.org/en/RL/the-art-of-embroidery-in-palestine-practices-skills-knowledge-and-rituals-01722'),
('filistin',9,'Silahlı çatışmalarda insani yardım için temel ilke hangisidir?','Tarafsızlık ve ayrım gözetmeme','Gizli propaganda','Sivilleri dışlama','Doğrulanmamış bilgi paylaşma','A','ICRC insani faaliyetlerini tarafsız, yansız ve bağımsız ilkelerle yürüttüğünü belirtir.','https://www.icrc.org/en/where-we-work/middle-east/israel-and-occupied-territories'),
('filistin',10,'Filistin hakkında güncel bilgi paylaşırken en güvenli yaklaşım hangisidir?','Kaynağı kontrol etmek','Yalnız başlığı okumak','Tarihi kaldırmak','Görseli bağlamdan koparmak','A','Kaynak, tarih ve bağlam kontrolü yanlış bilgi riskini azaltan temel adımdır.','https://www.un.org/en/observances/international-day-of-solidarity-with-the-palestinian-people'),
('dogu_turkistan',1,'UNESCO’ya göre Uygur Muqamı hangi sanatları bir araya getirir?','Yalnız mimariyi','Şarkı, dans, halk ve klasik müziği','Sadece heykeli','Yalnız sinemayı','B','Uygur Muqamı şarkı, dans, halk ve klasik müzik ile farklı sözlü anlatı biçimlerini buluşturur.','https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109'),
('dogu_turkistan',2,'Uygur Muqamının UNESCO listesinde belirtilen ana bölgesel üsluplarından biri hangisidir?','Dolan Muqam','Flamenko','Kabuki','Fado','A','UNESCO dört ana üslubu Twelve, Dolan, Turpan ve Hami Muqam olarak sıralar.','https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109'),
('dogu_turkistan',3,'“Twelve Muqam” yaklaşık kaç enstrümantal ve vokal süitten oluşur?','4','8','12','40','C','Twelve Muqam, on iki enstrümantal ve vokal süitten oluşur.','https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109'),
('dogu_turkistan',4,'UNESCO’nun Meshrep tanımında hangisi yer alır?','Müzik, dans, sözlü edebiyat ve oyunlar','Yalnız spor istatistikleri','Sadece yazılı sınavlar','Deniz feneri bakımı','A','Meshrep; müzik, dans, drama, sözlü edebiyat, yemek kültürü, akrobasi ve oyunları bir araya getirir.','https://ich.unesco.org/en/USL/meshrep-00304'),
('dogu_turkistan',5,'Meshrep UNESCO’nun Acil Koruma Gerektiren Somut Olmayan Kültürel Miras listesine hangi yıl kaydedildi?','2001','2005','2010','2022','C','Meshrep 2010’da Acil Koruma Gerektiren Somut Olmayan Kültürel Miras listesine kaydedildi.','https://ich.unesco.org/en/USL/meshrep-00304'),
('dogu_turkistan',6,'UNESCO, Uygur Muqamının gelişiminde hangi tarihî konumun etkisini vurgular?','İpek Yolu üzerindeki kültürel alışveriş','Atlas Okyanusu adaları','Antarktika seferleri','Amazon havzası','A','Bölgenin İpek Yolu üzerindeki merkezi konumu, Doğu-Batı kültürel alışverişini güçlendirdi.','https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109'),
('dogu_turkistan',7,'Uygur Muqamındaki şarkı sözlerinde hangileri bulunabilir?','Halk baladları ve klasik Uygur şairlerinin şiirleri','Yalnız teknik kılavuzlar','Sadece hava raporları','Yalnız matematik formülleri','A','UNESCO; halk baladları, şiirler, atasözleri ve halk anlatılarının repertuvarda yer aldığını belirtir.','https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109'),
('dogu_turkistan',8,'BM İnsan Hakları Ofisinin bölgeye ilişkin değerlendirmesi hangi tarihte yayımlandı?','31 Ağustos 2022','1 Ocak 2000','29 Kasım 1977','8 Aralık 1949','A','OHCHR değerlendirmesinin kapak tarihi 31 Ağustos 2022’dir.','https://www.ohchr.org/sites/default/files/documents/countries/2022-08-31/22-08-31-final-assesment.pdf'),
('dogu_turkistan',9,'Güncel hak tartışmalarını incelerken hangi kaynak önceliklidir?','Birincil kurum belgeleri','Kaynağı belirsiz ekran görüntüleri','Tarihsiz zincir mesajlar','Kesilmiş videolar','A','Birincil belgeler; iddia, tarih ve bağlamın denetlenebilmesini sağlar.','https://www.ohchr.org/sites/default/files/documents/countries/2022-08-31/22-08-31-final-assesment.pdf'),
('dogu_turkistan',10,'Uygur kültürel mirasını desteklemenin saygılı yollarından biri hangisidir?','Kültürel üretimleri kaynaklı biçimde öğrenmek','Topluluğu tek bir kriz başlığına indirgemek','Doğrulanmamış sayı yaymak','İnsanları genellemek','A','İnsanları yalnız mağduriyetle tanımlamamak; dil, müzik, edebiyat ve gündelik yaşamı kaynaklı biçimde öğrenmek onurlu bir farkındalık yaklaşımıdır.','https://ich.unesco.org/en/RL/uyghur-muqam-of-xinjiang-00109')
ON CONFLICT (geography, order_index) DO UPDATE SET question_text=EXCLUDED.question_text, option_a=EXCLUDED.option_a, option_b=EXCLUDED.option_b, option_c=EXCLUDED.option_c, option_d=EXCLUDED.option_d, correct_option=EXCLUDED.correct_option, explanation_text=EXCLUDED.explanation_text, source_url=EXCLUDED.source_url;

COMMENT ON TABLE public.regional_awareness_content IS 'Editable sourced summaries. Content is intentionally marked for expert editorial and factual review before broad promotion.';

