-- SAH World — Morning/evening journal rituals, quick entries and cached weekly insights.

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS ritual_type TEXT,
  ADD COLUMN IF NOT EXISTS entry_mode TEXT NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS niyet_text TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS beklenen_zorluk_text TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gratitude_text TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS xp_awarded INTEGER NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.journal_entries ADD CONSTRAINT journal_ritual_type_check
    CHECK (ritual_type IS NULL OR ritual_type IN ('sabah', 'aksam'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entry_mode_check
    CHECK (entry_mode IN ('quick', 'full'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.journal_entries ADD CONSTRAINT journal_xp_awarded_check
    CHECK (xp_awarded BETWEEN 0 AND 50);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_user_day_ritual
  ON public.journal_entries(user_id, date, ritual_type)
  WHERE ritual_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS journal_entries_ritual_analytics
  ON public.journal_entries(user_id, date DESC, ritual_type, entry_mode);

CREATE TABLE IF NOT EXISTS public.weekly_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  insight_text_array TEXT[] NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);
CREATE INDEX IF NOT EXISTS weekly_insights_user_week
  ON public.weekly_insights(user_id, week_start_date DESC);
ALTER TABLE public.weekly_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS weekly_insights_select_own ON public.weekly_insights;
CREATE POLICY weekly_insights_select_own ON public.weekly_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.generate_weekly_insights(target_week_start DATE DEFAULT NULL)
RETURNS SETOF public.weekly_insights
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := auth.uid();
  week_start DATE := COALESCE(target_week_start, date_trunc('week', (now() AT TIME ZONE 'Europe/Istanbul')::date)::date);
  week_end DATE;
  current_count INTEGER := 0;
  previous_count INTEGER := 0;
  quick_count INTEGER := 0;
  morning_count INTEGER := 0;
  evening_count INTEGER := 0;
  current_mood NUMERIC;
  previous_mood NUMERIC;
  best_day TEXT;
  best_mood NUMERIC;
  worst_day TEXT;
  worst_mood NUMERIC;
  most_label TEXT;
  most_count INTEGER;
  least_label TEXT;
  least_count INTEGER;
  high_sleep_energy NUMERIC;
  low_sleep_energy NUMERIC;
  high_sleep_days INTEGER;
  low_sleep_days INTEGER;
  result_lines TEXT[] := '{}';
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  week_end := week_start + 6;

  SELECT count(*), count(*) FILTER (WHERE entry_mode='quick'),
         count(*) FILTER (WHERE ritual_type='sabah'), count(*) FILTER (WHERE ritual_type='aksam'), avg(mood)
    INTO current_count, quick_count, morning_count, evening_count, current_mood
  FROM public.journal_entries
  WHERE user_id=actor AND date BETWEEN week_start AND week_end;

  SELECT count(*), avg(mood) INTO previous_count, previous_mood
  FROM public.journal_entries
  WHERE user_id=actor AND date BETWEEN week_start-7 AND week_start-1;

  IF current_count < 3 THEN
    result_lines := ARRAY[
      CASE WHEN current_count = 0 THEN 'Bu hafta henüz günlük kaydı oluşmadı; tek bir cümle bile ritmini görünür kılmak için yeterli.'
           ELSE 'Bu hafta ' || current_count || ' kayıt oluşturdun. Birkaç kayıt daha biriktiğinde ruh hâli ve enerji örüntülerini güvenle yorumlayabileceğiz.' END,
      CASE WHEN current_count > 0 THEN morning_count || ' sabah, ' || evening_count || ' akşam ritüeli tamamlandı; hızlı kayıtların sayısı ' || quick_count || '.'
           ELSE 'Sabah niyetini veya akşam muhasebeni kaydettiğinde bu özet yalnızca gerçek verilerinden oluşacak.' END
    ];
  ELSE
    SELECT CASE extract(isodow from date)::int WHEN 1 THEN 'Pazartesi' WHEN 2 THEN 'Salı' WHEN 3 THEN 'Çarşamba' WHEN 4 THEN 'Perşembe' WHEN 5 THEN 'Cuma' WHEN 6 THEN 'Cumartesi' ELSE 'Pazar' END, avg(mood)
      INTO best_day, best_mood FROM public.journal_entries
      WHERE user_id=actor AND date BETWEEN week_start AND week_end AND mood IS NOT NULL
      GROUP BY date ORDER BY avg(mood) DESC, date ASC LIMIT 1;
    SELECT CASE extract(isodow from date)::int WHEN 1 THEN 'Pazartesi' WHEN 2 THEN 'Salı' WHEN 3 THEN 'Çarşamba' WHEN 4 THEN 'Perşembe' WHEN 5 THEN 'Cuma' WHEN 6 THEN 'Cumartesi' ELSE 'Pazar' END, avg(mood)
      INTO worst_day, worst_mood FROM public.journal_entries
      WHERE user_id=actor AND date BETWEEN week_start AND week_end AND mood IS NOT NULL
      GROUP BY date ORDER BY avg(mood) ASC, date ASC LIMIT 1;

    result_lines := array_append(result_lines,
      'Bu hafta ' || current_count || ' günlük kaydı oluşturdun: ' || morning_count || ' sabah, ' || evening_count || ' akşam ritüeli' ||
      CASE WHEN quick_count > 0 THEN ' ve ' || quick_count || ' hızlı kayıt.' ELSE '.' END);
    IF best_day IS NOT NULL THEN
      result_lines := array_append(result_lines, 'Ruh hâlin en yüksek ' || best_day || ' günüydü (' || round(best_mood,1) || '/5)' ||
        CASE WHEN worst_day IS NOT NULL AND worst_day <> best_day THEN '; en düşük ortalama ' || worst_day || ' günüydü (' || round(worst_mood,1) || '/5).' ELSE '.' END);
    END IF;
    IF previous_count >= 2 AND current_mood IS NOT NULL AND previous_mood IS NOT NULL THEN
      result_lines := array_append(result_lines, CASE
        WHEN current_mood > previous_mood + .25 THEN 'Ortalama ruh hâlin önceki haftaya göre yükseldi (' || round(previous_mood,1) || ' → ' || round(current_mood,1) || ').'
        WHEN current_mood < previous_mood - .25 THEN 'Ortalama ruh hâlin önceki haftaya göre geriledi (' || round(previous_mood,1) || ' → ' || round(current_mood,1) || '); bunu bir yargı değil, kendine yaklaşmak için bir işaret olarak görebilirsin.'
        ELSE 'Ortalama ruh hâlin önceki haftaya yakın ve dengeli kaldı (' || round(current_mood,1) || '/5).' END);
    END IF;
  END IF;

  WITH category_counts(label, amount) AS (
    VALUES
      ('Günlük', (SELECT count(*) FROM public.journal_entries WHERE user_id=actor AND date BETWEEN week_start AND week_end)),
      ('Kur’an', (SELECT count(*) FROM public.quran_notes WHERE user_id=actor AND date BETWEEN week_start AND week_end)),
      ('Hadis', (SELECT count(*) FROM public.hadis_notes WHERE user_id=actor AND date BETWEEN week_start AND week_end)),
      ('Matris', (SELECT count(*) FROM public.eisenhower_tasks WHERE user_id=actor AND done AND (coalesce(completed_at,created_at) AT TIME ZONE 'Europe/Istanbul')::date BETWEEN week_start AND week_end)),
      ('Hatalar ve Dersler', (SELECT count(*) FROM public.lesson_entries WHERE user_id=actor AND date BETWEEN week_start AND week_end)),
      ('Şükür', (SELECT count(*) FROM public.sukur_entries WHERE user_id=actor AND date BETWEEN week_start AND week_end)),
      ('Mescidim', (SELECT count(*) FROM public.journal_spiritual_links WHERE user_id=actor AND entry_date BETWEEN week_start AND week_end)),
      ('Odaklanma', (SELECT count(*) FROM public.focus_sessions WHERE user_id=actor AND (ended_at AT TIME ZONE 'Europe/Istanbul')::date BETWEEN week_start AND week_end))
  )
  SELECT label, amount INTO most_label, most_count FROM category_counts ORDER BY amount DESC, label LIMIT 1;
  WITH category_counts(label, amount) AS (
    VALUES
      ('Günlük', (SELECT count(*) FROM public.journal_entries WHERE user_id=actor AND date BETWEEN week_start AND week_end)),
      ('Kur’an', (SELECT count(*) FROM public.quran_notes WHERE user_id=actor AND date BETWEEN week_start AND week_end)),
      ('Hadis', (SELECT count(*) FROM public.hadis_notes WHERE user_id=actor AND date BETWEEN week_start AND week_end)),
      ('Matris', (SELECT count(*) FROM public.eisenhower_tasks WHERE user_id=actor AND done AND (coalesce(completed_at,created_at) AT TIME ZONE 'Europe/Istanbul')::date BETWEEN week_start AND week_end)),
      ('Hatalar ve Dersler', (SELECT count(*) FROM public.lesson_entries WHERE user_id=actor AND date BETWEEN week_start AND week_end)),
      ('Şükür', (SELECT count(*) FROM public.sukur_entries WHERE user_id=actor AND date BETWEEN week_start AND week_end)),
      ('Mescidim', (SELECT count(*) FROM public.journal_spiritual_links WHERE user_id=actor AND entry_date BETWEEN week_start AND week_end)),
      ('Odaklanma', (SELECT count(*) FROM public.focus_sessions WHERE user_id=actor AND (ended_at AT TIME ZONE 'Europe/Istanbul')::date BETWEEN week_start AND week_end))
  )
  SELECT label, amount INTO least_label, least_count FROM category_counts ORDER BY amount ASC, label LIMIT 1;
  IF current_count >= 3 AND most_count > 0 AND array_length(result_lines,1) < 4 THEN
    result_lines := array_append(result_lines, 'En çok ' || most_label || ' alanında hareket ettin (' || most_count || ' kayıt); ' || least_label || ' alanı bu hafta ' || CASE WHEN least_count=0 THEN 'henüz sessiz kaldı.' ELSE least_count || ' kayıtta kaldı.' END);
  END IF;

  SELECT avg(energy) FILTER (WHERE sleep >= 7), avg(energy) FILTER (WHERE sleep < 7),
         count(*) FILTER (WHERE sleep >= 7), count(*) FILTER (WHERE sleep < 7)
    INTO high_sleep_energy, low_sleep_energy, high_sleep_days, low_sleep_days
  FROM public.journal_entries WHERE user_id=actor AND date BETWEEN week_start AND week_end AND sleep IS NOT NULL AND energy IS NOT NULL;
  IF current_count >= 3 AND high_sleep_days >= 2 AND low_sleep_days >= 2 AND abs(high_sleep_energy-low_sleep_energy) >= 1 AND array_length(result_lines,1) < 4 THEN
    result_lines := array_append(result_lines, 'Bu haftaki kayıtlarında 7 saat ve üzeri uyuduğun günlerde enerjin ' ||
      CASE WHEN high_sleep_energy > low_sleep_energy THEN 'daha yüksekti' ELSE 'daha düşüktü' END || ' (' || round(high_sleep_energy,1) || ' / ' || round(low_sleep_energy,1) || ').');
  END IF;

  INSERT INTO public.weekly_insights(user_id, week_start_date, insight_text_array, generated_at)
  VALUES(actor, week_start, result_lines[1:4], now())
  ON CONFLICT(user_id, week_start_date) DO UPDATE SET insight_text_array=excluded.insight_text_array, generated_at=excluded.generated_at;
  RETURN QUERY SELECT * FROM public.weekly_insights WHERE user_id=actor AND week_start_date=week_start;
END $$;

REVOKE ALL ON FUNCTION public.generate_weekly_insights(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_weekly_insights(DATE) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.weekly_insights FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_my_activity_log(from_date DATE DEFAULT NULL, to_date DATE DEFAULT NULL)
RETURNS TABLE(id TEXT, category TEXT, label TEXT, detail TEXT, xp_amount INTEGER, occurred_at TIMESTAMPTZ, source_view TEXT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
  WITH bounds AS (SELECT coalesce(from_date,current_date-365) starts,coalesce(to_date,current_date) ends,auth.uid() actor), events(id,category,label,detail,xp_amount,occurred_at,source_view,user_id,activity_date) AS (
    SELECT j.id::text,'journal'::text,
      CASE WHEN j.entry_mode='quick' THEN '⚡ Hızlı kayıt' WHEN j.ritual_type='sabah' THEN '🌅 Sabah Niyeti' WHEN j.ritual_type='aksam' THEN '🌙 Akşam Muhasebesi' ELSE 'Günlük sayfası kaydedildi' END,
      coalesce(nullif(left(coalesce(nullif(j.content,''),nullif(j.niyet_text,'')),120),''),'Günün düşünceleri kaydedildi'),j.xp_awarded,j.created_at,'journal'::text,j.user_id,j.date FROM public.journal_entries j
    UNION ALL SELECT q.id::text,'quran','Kur’an notu eklendi',concat_ws(' · ',nullif(q.sure,''),nullif(q.ayet,'')),35,q.created_at,'quran',q.user_id,q.date FROM public.quran_notes q
    UNION ALL SELECT h.id::text,'hadis','Hadis notu eklendi',concat_ws(' · ',nullif(h.konu,''),nullif(h.kaynak,'')),30,h.created_at,'hadis',h.user_id,h.date FROM public.hadis_notes h
    UNION ALL SELECT e.id::text,'matrix','Görev tamamlandı',e.text,25,coalesce(e.completed_at,e.created_at),'matrix',e.user_id,(coalesce(e.completed_at,e.created_at) AT TIME ZONE 'Europe/Istanbul')::date FROM public.eisenhower_tasks e WHERE e.done
    UNION ALL SELECT l.id::text,'lessons','Bir deneyimden ders çıkarıldı',l.title,25,l.created_at,'lessons',l.user_id,l.date FROM public.lesson_entries l
    UNION ALL SELECT s.id::text,'sukur','Şükür kaydı eklendi',coalesce(nullif(s.text,''),concat_ws(' · ',nullif(s.nimet1,''),nullif(s.nimet2,''),nullif(s.nimet3,''))),20,s.created_at,'sukur',s.user_id,s.date FROM public.sukur_entries s
    UNION ALL SELECT f.id::text,'focus','Odaklanma oturumu tamamlandı',f.task_label||' · '||greatest(1,round(f.actual_duration_seconds/60.0))::text||' dk',f.xp_awarded,f.ended_at,'focus',f.user_id,(f.ended_at AT TIME ZONE 'Europe/Istanbul')::date FROM public.focus_sessions f WHERE f.actual_duration_seconds>0
    UNION ALL SELECT jsl.id::text,'mescidim',CASE WHEN jsl.entry_kind='dua' THEN 'Dua günlüğe kaydedildi' ELSE 'Esmâ tefekkürü kaydedildi' END,jsl.display_label,jsl.xp_awarded,jsl.created_at,'mescidim',jsl.user_id,jsl.entry_date FROM public.journal_spiritual_links jsl
    UNION ALL SELECT ulp.id::text,'profession','Meslek ve Ahlak dersi tamamlandı',pt.profession_name||' · '||pl.title,pl.xp_reward,ulp.completed_at,'profession-school',ulp.user_id,(ulp.completed_at AT TIME ZONE 'Europe/Istanbul')::date FROM public.user_lesson_progress ulp JOIN public.profession_lessons pl ON pl.id=ulp.lesson_id JOIN public.profession_tracks pt ON pt.id=pl.track_id
    UNION ALL SELECT uqa.id::text,'awareness','Farkındalık testi tamamlandı',CASE uqa.geography WHEN 'filistin' THEN 'Filistin' ELSE 'Doğu Türkistan' END||' · '||uqa.score::text||'/10',uqa.xh_awarded,uqa.completed_at,'awareness',uqa.user_id,(uqa.completed_at AT TIME ZONE 'Europe/Istanbul')::date FROM public.user_quiz_attempts uqa
    UNION ALL SELECT x.id::text,'mescidim',x.label,'Manevî pratik kaydı',x.xp_amount,x.created_at,'mescidim',x.user_id,(x.created_at AT TIME ZONE 'Europe/Istanbul')::date FROM public.xp_events x WHERE x.source_type NOT IN ('journal','journal_detail','quran','hadis','matrix','lessons','sukur','focus','spiritual_journal','profession_lesson','awareness_quiz')
  ) SELECT events.id,events.category,events.label,events.detail,events.xp_amount,events.occurred_at,events.source_view FROM events,bounds WHERE events.user_id=bounds.actor AND events.activity_date BETWEEN bounds.starts AND bounds.ends ORDER BY events.occurred_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_my_activity_log(DATE,DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_activity_log(DATE,DATE) TO authenticated;
