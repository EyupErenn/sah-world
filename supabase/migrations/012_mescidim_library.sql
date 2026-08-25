-- SAH World — Mescidim: Esmâü'l Hüsnâ, kaynaklı dua kütüphanesi ve Günlük bağı

CREATE TABLE IF NOT EXISTS public.asma_ul_husna (
  order_number SMALLINT PRIMARY KEY CHECK (order_number BETWEEN 1 AND 99),
  arabic_text TEXT NOT NULL,
  transliteration_turkish TEXT NOT NULL,
  meaning_turkish TEXT NOT NULL,
  brief_reflection TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_asma_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asma_order_number SMALLINT NOT NULL REFERENCES public.asma_ul_husna(order_number) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  reflection_note TEXT NOT NULL DEFAULT '' CHECK (char_length(reflection_note) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, asma_order_number)
);

CREATE TABLE IF NOT EXISTS public.dua_library (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('quran', 'hadith', 'companions')),
  occasion TEXT NOT NULL,
  title TEXT NOT NULL,
  arabic_text TEXT NOT NULL,
  turkish_meaning TEXT NOT NULL,
  source_citation TEXT NOT NULL,
  source_url TEXT NOT NULL,
  context_note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_dua_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dua_id TEXT NOT NULL REFERENCES public.dua_library(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, dua_id)
);

CREATE TABLE IF NOT EXISTS public.journal_spiritual_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT current_date,
  entry_kind TEXT NOT NULL CHECK (entry_kind IN ('asma', 'dua')),
  reference_id TEXT NOT NULL,
  display_label TEXT NOT NULL,
  reflection_note TEXT,
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded BETWEEN 0 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date, entry_kind, reference_id)
);

CREATE INDEX IF NOT EXISTS user_asma_reflections_user_idx ON public.user_asma_reflections(user_id);
CREATE INDEX IF NOT EXISTS user_dua_favorites_user_idx ON public.user_dua_favorites(user_id);
CREATE INDEX IF NOT EXISTS journal_spiritual_links_user_date_idx ON public.journal_spiritual_links(user_id, entry_date DESC);

DROP TRIGGER IF EXISTS user_asma_reflections_updated_at ON public.user_asma_reflections;
CREATE TRIGGER user_asma_reflections_updated_at BEFORE UPDATE ON public.user_asma_reflections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.asma_ul_husna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dua_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_asma_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dua_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_spiritual_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY asma_public_read ON public.asma_ul_husna FOR SELECT TO authenticated USING (true);
CREATE POLICY dua_public_read ON public.dua_library FOR SELECT TO authenticated USING (true);
CREATE POLICY asma_reflection_own_select ON public.user_asma_reflections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY asma_reflection_own_insert ON public.user_asma_reflections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY asma_reflection_own_update ON public.user_asma_reflections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY asma_reflection_own_delete ON public.user_asma_reflections FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY dua_favorite_own_select ON public.user_dua_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY dua_favorite_own_insert ON public.user_dua_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY dua_favorite_own_delete ON public.user_dua_favorites FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY spiritual_link_own_select ON public.journal_spiritual_links FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON public.asma_ul_husna, public.dua_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_asma_reflections TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_dua_favorites TO authenticated;
GRANT SELECT ON public.journal_spiritual_links TO authenticated;

-- Public reference data is versioned in src/lib/spiritualLibrary.ts as the UI's
-- offline-safe canonical copy. The same dataset is inserted below so database
-- clients and future server components receive identical, auditable content.
INSERT INTO public.asma_ul_husna (order_number, arabic_text, transliteration_turkish, meaning_turkish, brief_reflection)
SELECT item.ordinality::smallint, item.arabic, item.name, item.meaning,
       item.name || ' ismi, Allah''ın “' || lower(item.meaning) || '” oluşunu hatırlatır. Bugün bu anlamın güzel ahlâk olarak nasıl karşılık bulabileceğini düşün.'
FROM jsonb_to_recordset($asma$
[
 {"arabic":"اللّٰه","name":"Allah","meaning":"Bütün kemal sıfatlarını kendinde toplayan yüce Zât’ın özel ismi"},
 {"arabic":"الرَّحْمٰنُ","name":"er-Rahmân","meaning":"Rahmeti bütün varlığı kuşatan"},
 {"arabic":"الرَّحِيمُ","name":"er-Rahîm","meaning":"Merhameti sürekli ve bol olan"},
 {"arabic":"الْمَلِكُ","name":"el-Melik","meaning":"Mülkün gerçek sahibi ve hükümdarı"},
 {"arabic":"الْقُدُّوسُ","name":"el-Kuddûs","meaning":"Her eksiklikten uzak ve tertemiz olan"},
 {"arabic":"السَّلَامُ","name":"es-Selâm","meaning":"Esenliğin kaynağı, kusurdan uzak olan"},
 {"arabic":"الْمُؤْمِنُ","name":"el-Mü’min","meaning":"Güven veren ve emniyete kavuşturan"},
 {"arabic":"الْمُهَيْمِنُ","name":"el-Müheymin","meaning":"Her şeyi gözetip koruyan"},
 {"arabic":"الْعَزِيزُ","name":"el-Azîz","meaning":"Mutlak izzet sahibi, yenilmez olan"},
 {"arabic":"الْجَبَّارُ","name":"el-Cebbâr","meaning":"Kudreti üstün, kırıkları onaran"},
 {"arabic":"الْمُتَكَبِّرُ","name":"el-Mütekebbir","meaning":"Büyüklükte eşi olmayan"},
 {"arabic":"الْخَالِقُ","name":"el-Hâlık","meaning":"Her şeyi ölçüyle yaratan"},
 {"arabic":"الْبَارِئُ","name":"el-Bâri’","meaning":"Varlıkları örneksiz ve uyumlu yaratan"},
 {"arabic":"الْمُصَوِّرُ","name":"el-Musavvir","meaning":"Varlıklara biçim ve özellik veren"},
 {"arabic":"الْغَفَّارُ","name":"el-Gaffâr","meaning":"Günahları tekrar tekrar örten"},
 {"arabic":"الْقَهَّارُ","name":"el-Kahhâr","meaning":"Her şeye mutlak üstün gelen"},
 {"arabic":"الْوَهَّابُ","name":"el-Vehhâb","meaning":"Karşılıksız ve bolca bağışlayan"},
 {"arabic":"الرَّزَّاقُ","name":"er-Rezzâk","meaning":"Bütün canlıların rızkını veren"},
 {"arabic":"الْفَتَّاحُ","name":"el-Fettâh","meaning":"Hayır kapılarını açan, hükmeden"},
 {"arabic":"اَلْعَلِيمُ","name":"el-Alîm","meaning":"Her şeyi hakkıyla bilen"},
 {"arabic":"الْقَابِضُ","name":"el-Kâbıd","meaning":"Hikmetiyle daraltan ve tutan"},
 {"arabic":"الْبَاسِطُ","name":"el-Bâsıt","meaning":"Hikmetiyle genişleten ve açan"},
 {"arabic":"الْخَافِضُ","name":"el-Hâfıd","meaning":"Hikmetiyle alçaltan"},
 {"arabic":"الرَّافِعُ","name":"er-Râfi’","meaning":"Dereceleri yükselten"},
 {"arabic":"الْمُعِزُّ","name":"el-Muiz","meaning":"Dilediğine izzet veren"},
 {"arabic":"المُذِلُّ","name":"el-Müzil","meaning":"Dilediğini zillete düşüren"},
 {"arabic":"السَّمِيعُ","name":"es-Semî’","meaning":"Her şeyi işiten"},
 {"arabic":"الْبَصِيرُ","name":"el-Basîr","meaning":"Her şeyi gören"},
 {"arabic":"الْحَكَمُ","name":"el-Hakem","meaning":"Son ve mutlak hüküm sahibi"},
 {"arabic":"الْعَدْلُ","name":"el-Adl","meaning":"Mutlak adalet sahibi"},
 {"arabic":"اللَّطِيفُ","name":"el-Latîf","meaning":"Lütfu ince, kullarına nazik davranan"},
 {"arabic":"الْخَبِيرُ","name":"el-Habîr","meaning":"Her şeyin iç yüzünden haberdar olan"},
 {"arabic":"الْحَلِيمُ","name":"el-Halîm","meaning":"Cezada acele etmeyen, yumuşak davranan"},
 {"arabic":"الْعَظِيمُ","name":"el-Azîm","meaning":"Azameti sınırsız olan"},
 {"arabic":"الْغَفُورُ","name":"el-Gafûr","meaning":"Bağışlaması çok olan"},
 {"arabic":"الشَّكُورُ","name":"eş-Şekûr","meaning":"Az amele çok karşılık veren"},
 {"arabic":"الْعَلِيُّ","name":"el-Aliyy","meaning":"Yüceliği mutlak olan"},
 {"arabic":"الْكَبِيرُ","name":"el-Kebîr","meaning":"Büyüklükte eşi bulunmayan"},
 {"arabic":"الْحَفِيظُ","name":"el-Hafîz","meaning":"Her şeyi koruyan"},
 {"arabic":"المُقيِت","name":"el-Mukît","meaning":"Rızık ve güç veren"},
 {"arabic":"الْحَسِيبُ","name":"el-Hasîb","meaning":"Hesap gören ve kullarına yeten"},
 {"arabic":"الْجَلِيلُ","name":"el-Celîl","meaning":"Ululuk ve heybet sahibi"},
 {"arabic":"الْكَرِيمُ","name":"el-Kerîm","meaning":"Cömertliği ve ikramı bol olan"},
 {"arabic":"الرَّقِيبُ","name":"er-Rakîb","meaning":"Her an gözeten"},
 {"arabic":"الْمُجِيبُ","name":"el-Mücîb","meaning":"Dualara karşılık veren"},
 {"arabic":"الْوَاسِعُ","name":"el-Vâsi’","meaning":"Rahmeti ve ilmi her şeyi kuşatan"},
 {"arabic":"الْحَكِيمُ","name":"el-Hakîm","meaning":"Her işi hikmetli olan"},
 {"arabic":"الْوَدُودُ","name":"el-Vedûd","meaning":"Kullarını seven ve sevilen"},
 {"arabic":"الْمَجِيدُ","name":"el-Mecîd","meaning":"Şanı ve ikramı yüce olan"},
 {"arabic":"الْبَاعِثُ","name":"el-Bâis","meaning":"Ölüleri dirilten, elçiler gönderen"},
 {"arabic":"الشَّهِيدُ","name":"eş-Şehîd","meaning":"Her şeye tanık olan"},
 {"arabic":"الْحَقُّ","name":"el-Hakk","meaning":"Varlığı ve hükmü kesin gerçek olan"},
 {"arabic":"الْوَكِيلُ","name":"el-Vekîl","meaning":"Kendisine güvenilip dayanılan"},
 {"arabic":"الْقَوِيُّ","name":"el-Kaviyy","meaning":"Kudreti eksiksiz olan"},
 {"arabic":"الْمَتِينُ","name":"el-Metîn","meaning":"Gücü sarsılmaz olan"},
 {"arabic":"الْوَلِيُّ","name":"el-Veliyy","meaning":"Dost ve yardımcı olan"},
 {"arabic":"الْحَمِيدُ","name":"el-Hamîd","meaning":"Her türlü övgüye layık olan"},
 {"arabic":"الْمُحْصِي","name":"el-Muhsî","meaning":"Her şeyi tek tek bilen ve sayan"},
 {"arabic":"الْمُبْدِئُ","name":"el-Mübdi’","meaning":"Yaratmayı ilk başlatan"},
 {"arabic":"الْمُعِيدُ","name":"el-Muîd","meaning":"Yarattıklarını yeniden dirilten"},
 {"arabic":"الْمُحْيِي","name":"el-Muhyî","meaning":"Hayat veren"},
 {"arabic":"اَلْمُمِيتُ","name":"el-Mümît","meaning":"Ölümü yaratan"},
 {"arabic":"الْحَيُّ","name":"el-Hayy","meaning":"Daima diri olan"},
 {"arabic":"الْقَيُّومُ","name":"el-Kayyûm","meaning":"Her şeyi ayakta tutan"},
 {"arabic":"الْوَاجِدُ","name":"el-Vâcid","meaning":"Dilediğini bulan, hiçbir şeye muhtaç olmayan"},
 {"arabic":"الْمَاجِدُ","name":"el-Mâcid","meaning":"Şerefi ve cömertliği büyük olan"},
 {"arabic":"الْواحِدُ","name":"el-Vâhid","meaning":"Tek ve eşsiz olan"},
 {"arabic":"الصَّمَدُ","name":"es-Samed","meaning":"Her şeyin muhtaç olduğu, kendisi muhtaç olmayan"},
 {"arabic":"الْقَادِرُ","name":"el-Kâdir","meaning":"Her şeye gücü yeten"},
 {"arabic":"الْمُقْتَدِرُ","name":"el-Muktedir","meaning":"Kudreti her şeyi kuşatan"},
 {"arabic":"الْمُقَدِّمُ","name":"el-Mukaddim","meaning":"Hikmetiyle öne alan"},
 {"arabic":"الْمُؤَخِّرُ","name":"el-Muahhir","meaning":"Hikmetiyle geriye bırakan"},
 {"arabic":"الأوَّلُ","name":"el-Evvel","meaning":"Başlangıcı olmayan ilk"},
 {"arabic":"الآخِرُ","name":"el-Âhir","meaning":"Sonu olmayan son"},
 {"arabic":"الظَّاهِرُ","name":"ez-Zâhir","meaning":"Varlığı ve delilleri açık olan"},
 {"arabic":"الْبَاطِنُ","name":"el-Bâtın","meaning":"Mahiyeti idrakin ötesinde olan"},
 {"arabic":"الْوَالِي","name":"el-Vâlî","meaning":"Kâinatı yöneten"},
 {"arabic":"الْمُتَعَالِي","name":"el-Müteâlî","meaning":"Her türlü eksiklikten yüce olan"},
 {"arabic":"الْبَرُّ","name":"el-Berr","meaning":"İyilik ve ihsanı bol olan"},
 {"arabic":"التَّوَابُ","name":"et-Tevvâb","meaning":"Tövbeleri kabul eden"},
 {"arabic":"الْمُنْتَقِمُ","name":"el-Müntakim","meaning":"Adaletiyle suçluyu cezalandıran"},
 {"arabic":"العَفُوُّ","name":"el-Afüvv","meaning":"Günahları silip affeden"},
 {"arabic":"الرَّؤُوفُ","name":"er-Raûf","meaning":"Şefkati pek çok olan"},
 {"arabic":"مَالِكُ الْمُلْكِ","name":"Mâlikü’l-Mülk","meaning":"Mülkün mutlak sahibi"},
 {"arabic":"ذُوالْجَلَالِ وَالإكْرَامِ","name":"Zü’l-Celâli ve’l-İkrâm","meaning":"Ululuk ve ikram sahibi"},
 {"arabic":"الْمُقْسِطُ","name":"el-Muksit","meaning":"Adaletle hükmeden"},
 {"arabic":"الْجَامِعُ","name":"el-Câmi’","meaning":"Dilediklerini bir araya getiren"},
 {"arabic":"الْغَنِيُّ","name":"el-Ganiyy","meaning":"Hiçbir şeye muhtaç olmayan"},
 {"arabic":"الْمُغْنِي","name":"el-Mugnî","meaning":"Dilediğini zengin ve yeterli kılan"},
 {"arabic":"اَلْمَانِعُ","name":"el-Mâni’","meaning":"Hikmetiyle engelleyen ve koruyan"},
 {"arabic":"الضَّارَّ","name":"ed-Dârr","meaning":"Hikmetiyle zarar ve sıkıntı yaratan"},
 {"arabic":"النَّافِعُ","name":"en-Nâfi’","meaning":"Fayda veren"},
 {"arabic":"النُّورُ","name":"en-Nûr","meaning":"Gökleri ve yeri aydınlatan"},
 {"arabic":"الْهَادِي","name":"el-Hâdî","meaning":"Doğru yola ileten"},
 {"arabic":"الْبَدِيعُ","name":"el-Bedî’","meaning":"Örneksiz ve benzersiz yaratan"},
 {"arabic":"اَلْبَاقِي","name":"el-Bâkî","meaning":"Varlığının sonu olmayan"},
 {"arabic":"الْوَارِثُ","name":"el-Vâris","meaning":"Her şeyin gerçek mirasçısı"},
 {"arabic":"الرَّشِيدُ","name":"er-Reşîd","meaning":"Doğru yolu gösteren"},
 {"arabic":"الصَّبُورُ","name":"es-Sabûr","meaning":"Cezada acele etmeyen, sabrı sınırsız olan"}
]
$asma$::jsonb) WITH ORDINALITY AS item(arabic text, name text, meaning text, ordinality bigint)
ON CONFLICT (order_number) DO UPDATE SET
  arabic_text = excluded.arabic_text,
  transliteration_turkish = excluded.transliteration_turkish,
  meaning_turkish = excluded.meaning_turkish,
  brief_reflection = excluded.brief_reflection;

-- The curated dua catalogue is shipped in src/lib/spiritualLibrary.ts and is
-- mirrored in full by the generated 013_spiritual_library_seed.sql migration.

CREATE OR REPLACE FUNCTION public.log_spiritual_to_journal(
  target_kind TEXT,
  target_reference_id TEXT,
  reflection_text TEXT DEFAULT NULL
)
RETURNS TABLE (journal_entry_id UUID, journal_content TEXT, xp_awarded INTEGER, daily_xp_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := auth.uid();
  entry_id UUID;
  current_content TEXT;
  label TEXT;
  line TEXT;
  link_id UUID;
  awarded_count INTEGER;
  award INTEGER := 0;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF target_kind NOT IN ('asma', 'dua') THEN RAISE EXCEPTION 'invalid_spiritual_kind'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text || current_date::text, 0));

  IF target_kind = 'asma' THEN
    IF target_reference_id !~ '^[0-9]{1,2}$' THEN RAISE EXCEPTION 'invalid_asma_reference'; END IF;
    SELECT transliteration_turkish || ' tefekkürü' INTO label
    FROM public.asma_ul_husna WHERE order_number = target_reference_id::smallint;
  ELSE
    SELECT title || CASE WHEN lower(title) LIKE '%duası' THEN ' okundu' ELSE ' duası okundu' END
    INTO label FROM public.dua_library WHERE id = target_reference_id;
  END IF;
  IF label IS NULL THEN RAISE EXCEPTION 'spiritual_reference_not_found'; END IF;

  -- Idempotency is checked before touching the journal text, so a retried
  -- request cannot append the same reflection twice or earn duplicate XH.
  IF EXISTS (
    SELECT 1 FROM public.journal_spiritual_links
    WHERE user_id = actor AND entry_date = current_date
      AND entry_kind = target_kind AND reference_id = target_reference_id
  ) THEN
    SELECT id, content INTO entry_id, current_content
    FROM public.journal_entries
    WHERE user_id = actor AND date = current_date
    ORDER BY created_at DESC LIMIT 1;
    SELECT count(*)::integer INTO awarded_count FROM public.journal_spiritual_links
    WHERE user_id = actor AND entry_date = current_date AND xp_awarded > 0;
    RETURN QUERY SELECT entry_id, current_content, 0, awarded_count;
    RETURN;
  END IF;

  SELECT id, content INTO entry_id, current_content
  FROM public.journal_entries
  WHERE user_id = actor AND date = current_date
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  line := '🕌 ' || label || CASE WHEN nullif(btrim(reflection_text), '') IS NULL THEN '' ELSE ' — ' || left(btrim(reflection_text), 1000) END;
  IF entry_id IS NULL THEN
    INSERT INTO public.journal_entries(user_id, date, content, tags)
    VALUES (actor, current_date, line, ARRAY['mescidim'])
    RETURNING id, content INTO entry_id, current_content;
  ELSE
    current_content := concat_ws(E'\n\n', nullif(current_content, ''), line);
    UPDATE public.journal_entries SET content = current_content,
      tags = CASE WHEN 'mescidim' = ANY(tags) THEN tags ELSE array_append(tags, 'mescidim') END
    WHERE id = entry_id;
  END IF;

  SELECT count(*)::integer INTO awarded_count FROM public.journal_spiritual_links
  WHERE user_id = actor AND entry_date = current_date AND xp_awarded > 0;
  IF awarded_count < 3 THEN award := 10; END IF;

  INSERT INTO public.journal_spiritual_links(user_id, journal_entry_id, entry_kind, reference_id, display_label, reflection_note, xp_awarded)
  VALUES (actor, entry_id, target_kind, target_reference_id, label, nullif(left(btrim(reflection_text), 1000), ''), award)
  ON CONFLICT (user_id, entry_date, entry_kind, reference_id) DO NOTHING
  RETURNING id INTO link_id;

  IF link_id IS NULL THEN
    award := 0;
  ELSE
    IF award > 0 THEN
      UPDATE public.profiles SET xp = xp + award WHERE id = actor;
      INSERT INTO public.xp_events(user_id, source_type, source_id, label, xp_amount)
      VALUES (actor, 'spiritual_journal', link_id, label, award)
      ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
    END IF;
  END IF;

  SELECT count(*)::integer INTO awarded_count FROM public.journal_spiritual_links
  WHERE user_id = actor AND entry_date = current_date AND xp_awarded > 0;
  RETURN QUERY SELECT entry_id, current_content, award, awarded_count;
END;
$$;

REVOKE ALL ON FUNCTION public.log_spiritual_to_journal(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_spiritual_to_journal(TEXT, TEXT, TEXT) TO authenticated;
