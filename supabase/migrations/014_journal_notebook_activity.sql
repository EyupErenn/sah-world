-- SAH World — Structured journal notebook and unified private activity trail

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS moments TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS self_note TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.eisenhower_tasks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE public.eisenhower_tasks
SET completed_at = created_at
WHERE done AND completed_at IS NULL;

DROP TRIGGER IF EXISTS journal_entries_updated_at ON public.journal_entries;
CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Journal history is permanent: only today's page can be edited or removed.
DROP POLICY IF EXISTS journal_update ON public.journal_entries;
DROP POLICY IF EXISTS journal_delete ON public.journal_entries;
CREATE POLICY journal_update_today ON public.journal_entries FOR UPDATE
  USING (auth.uid() = user_id AND date = current_date)
  WITH CHECK (auth.uid() = user_id AND date = current_date);
CREATE POLICY journal_delete_today ON public.journal_entries FOR DELETE
  USING (auth.uid() = user_id AND date = current_date);

CREATE OR REPLACE FUNCTION public.get_my_activity_log(
  from_date DATE DEFAULT NULL,
  to_date DATE DEFAULT NULL
)
RETURNS TABLE(
  id TEXT,
  category TEXT,
  label TEXT,
  detail TEXT,
  xp_amount INTEGER,
  occurred_at TIMESTAMPTZ,
  source_view TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT COALESCE(from_date, current_date - 365) AS starts,
           COALESCE(to_date, current_date) AS ends,
           auth.uid() AS actor
  ), events AS (
    SELECT j.id::text AS id, 'journal'::text AS category, 'Günlük sayfası kaydedildi'::text AS label,
      COALESCE(NULLIF(left(j.content, 120), ''), 'Günün düşünceleri kaydedildi') AS detail, 25::integer AS xp_amount,
      j.created_at AS occurred_at, 'journal'::text AS source_view, j.user_id AS user_id, j.date AS activity_date
    FROM public.journal_entries j
    UNION ALL
    SELECT q.id::text, 'quran', 'Kur’an notu eklendi',
      concat_ws(' · ', NULLIF(q.sure, ''), NULLIF(q.ayet, '')), 35,
      q.created_at, 'quran', q.user_id, q.date
    FROM public.quran_notes q
    UNION ALL
    SELECT h.id::text, 'hadis', 'Hadis notu eklendi',
      concat_ws(' · ', NULLIF(h.konu, ''), NULLIF(h.kaynak, '')), 30,
      h.created_at, 'hadis', h.user_id, h.date
    FROM public.hadis_notes h
    UNION ALL
    SELECT e.id::text, 'matrix', 'Görev tamamlandı', e.text, 25,
      COALESCE(e.completed_at, e.created_at), 'matrix', e.user_id,
      (COALESCE(e.completed_at, e.created_at) AT TIME ZONE 'Europe/Istanbul')::date
    FROM public.eisenhower_tasks e WHERE e.done
    UNION ALL
    SELECT l.id::text, 'lessons', 'Bir deneyimden ders çıkarıldı', l.title, 25,
      l.created_at, 'lessons', l.user_id, l.date
    FROM public.lesson_entries l
    UNION ALL
    SELECT s.id::text, 'sukur', 'Şükür kaydı eklendi',
      COALESCE(NULLIF(s.text, ''), concat_ws(' · ', NULLIF(s.nimet1, ''), NULLIF(s.nimet2, ''), NULLIF(s.nimet3, ''))), 20,
      s.created_at, 'sukur', s.user_id, s.date
    FROM public.sukur_entries s
    UNION ALL
    SELECT f.id::text, 'focus', 'Odaklanma oturumu tamamlandı',
      f.task_label || ' · ' || greatest(1, round(f.actual_duration_seconds / 60.0))::text || ' dk',
      f.xp_awarded, f.ended_at, 'focus', f.user_id,
      (f.ended_at AT TIME ZONE 'Europe/Istanbul')::date
    FROM public.focus_sessions f WHERE f.actual_duration_seconds > 0
    UNION ALL
    SELECT jsl.id::text, 'mescidim',
      CASE WHEN jsl.entry_kind = 'dua' THEN 'Dua günlüğe kaydedildi' ELSE 'Esmâ tefekkürü kaydedildi' END,
      jsl.display_label, jsl.xp_awarded, jsl.created_at, 'mescidim', jsl.user_id, jsl.entry_date
    FROM public.journal_spiritual_links jsl
    UNION ALL
    SELECT ulp.id::text, 'profession', 'Meslek ve Ahlak dersi tamamlandı',
      pt.profession_name || ' · ' || pl.title, pl.xp_reward, ulp.completed_at,
      'profession-school', ulp.user_id,
      (ulp.completed_at AT TIME ZONE 'Europe/Istanbul')::date
    FROM public.user_lesson_progress ulp
    JOIN public.profession_lessons pl ON pl.id = ulp.lesson_id
    JOIN public.profession_tracks pt ON pt.id = pl.track_id
    UNION ALL
    SELECT uqa.id::text, 'awareness', 'Farkındalık testi tamamlandı',
      CASE uqa.geography WHEN 'filistin' THEN 'Filistin' ELSE 'Doğu Türkistan' END || ' · ' || uqa.score::text || '/10',
      uqa.xh_awarded, uqa.completed_at, 'awareness', uqa.user_id,
      (uqa.completed_at AT TIME ZONE 'Europe/Istanbul')::date
    FROM public.user_quiz_attempts uqa
    UNION ALL
    SELECT x.id::text, 'mescidim', x.label, 'Manevî pratik kaydı', x.xp_amount,
      x.created_at, 'mescidim', x.user_id,
      (x.created_at AT TIME ZONE 'Europe/Istanbul')::date
    FROM public.xp_events x
    WHERE x.source_type NOT IN ('journal','quran','hadis','matrix','lessons','sukur','focus','spiritual_journal','profession_lesson','awareness_quiz')
  )
  SELECT events.id, events.category, events.label, events.detail, events.xp_amount,
         events.occurred_at, events.source_view
  FROM events, bounds
  WHERE events.user_id = bounds.actor AND events.activity_date BETWEEN bounds.starts AND bounds.ends
  ORDER BY events.occurred_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_activity_log(DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_activity_log(DATE, DATE) TO authenticated;

-- Spiritual actions now stay in the read-only activity trail instead of being
-- mixed into the user's own free-writing field. Existing journal prose is kept.
CREATE OR REPLACE FUNCTION public.log_spiritual_to_journal(
  target_kind TEXT,
  target_reference_id TEXT,
  reflection_text TEXT DEFAULT NULL
)
RETURNS TABLE (journal_entry_id UUID, journal_content TEXT, xp_awarded INTEGER, daily_xp_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor UUID := auth.uid(); entry_id UUID; current_content TEXT; label TEXT;
  link_id UUID; awarded_count INTEGER; award INTEGER := 0;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF target_kind NOT IN ('asma', 'dua') THEN RAISE EXCEPTION 'invalid_spiritual_kind'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text || current_date::text, 0));
  IF target_kind = 'asma' THEN
    IF target_reference_id !~ '^[0-9]{1,2}$' THEN RAISE EXCEPTION 'invalid_asma_reference'; END IF;
    SELECT transliteration_turkish || ' tefekkürü' INTO label FROM public.asma_ul_husna WHERE order_number = target_reference_id::smallint;
  ELSE
    SELECT title || CASE WHEN lower(title) LIKE '%duası' THEN ' okundu' ELSE ' duası okundu' END INTO label FROM public.dua_library WHERE id = target_reference_id;
  END IF;
  IF label IS NULL THEN RAISE EXCEPTION 'spiritual_reference_not_found'; END IF;
  SELECT id, content INTO entry_id, current_content FROM public.journal_entries
    WHERE user_id = actor AND date = current_date ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF entry_id IS NULL THEN
    INSERT INTO public.journal_entries(user_id, date, content, tags)
      VALUES (actor, current_date, '', ARRAY['mescidim']) RETURNING id, content INTO entry_id, current_content;
  END IF;
  INSERT INTO public.journal_spiritual_links(user_id, journal_entry_id, entry_kind, reference_id, display_label, reflection_note, xp_awarded)
    SELECT actor, entry_id, target_kind, target_reference_id, label, nullif(left(btrim(reflection_text), 1000), ''),
      CASE WHEN (SELECT count(*) FROM public.journal_spiritual_links WHERE user_id=actor AND entry_date=current_date AND xp_awarded>0) < 3 THEN 10 ELSE 0 END
    ON CONFLICT (user_id, entry_date, entry_kind, reference_id) DO NOTHING RETURNING id, journal_spiritual_links.xp_awarded INTO link_id, award;
  IF link_id IS NOT NULL AND award > 0 THEN
    UPDATE public.profiles SET xp = xp + award WHERE id = actor;
    INSERT INTO public.xp_events(user_id, source_type, source_id, label, xp_amount)
      VALUES (actor, 'spiritual_journal', link_id, label, award) ON CONFLICT DO NOTHING;
  ELSE award := 0; END IF;
  SELECT count(*)::integer INTO awarded_count FROM public.journal_spiritual_links WHERE user_id=actor AND entry_date=current_date AND xp_awarded>0;
  RETURN QUERY SELECT entry_id, current_content, award, awarded_count;
END $$;

REVOKE ALL ON FUNCTION public.log_spiritual_to_journal(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_spiritual_to_journal(TEXT, TEXT, TEXT) TO authenticated;
