-- Focus accountability and reflection metadata. Every row remains protected by
-- the owner-only RLS policies created in 007_focus_sessions.sql.
ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS intention_text TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS interruption_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_away_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS focus_quality_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS post_session_note TEXT NOT NULL DEFAULT '';

ALTER TABLE public.focus_sessions
  DROP CONSTRAINT IF EXISTS focus_sessions_intention_length,
  DROP CONSTRAINT IF EXISTS focus_sessions_interruption_count_check,
  DROP CONSTRAINT IF EXISTS focus_sessions_total_away_check,
  DROP CONSTRAINT IF EXISTS focus_sessions_quality_check,
  DROP CONSTRAINT IF EXISTS focus_sessions_note_length;

ALTER TABLE public.focus_sessions
  ADD CONSTRAINT focus_sessions_intention_length CHECK (char_length(intention_text) <= 280),
  ADD CONSTRAINT focus_sessions_interruption_count_check CHECK (interruption_count BETWEEN 0 AND 10000),
  ADD CONSTRAINT focus_sessions_total_away_check CHECK (total_away_seconds BETWEEN 0 AND 43200),
  ADD CONSTRAINT focus_sessions_quality_check CHECK (focus_quality_rating IS NULL OR focus_quality_rating BETWEEN 1 AND 5),
  ADD CONSTRAINT focus_sessions_note_length CHECK (char_length(post_session_note) <= 600);

CREATE INDEX IF NOT EXISTS focus_sessions_user_history_idx
  ON public.focus_sessions(user_id, ended_at DESC, task_label);

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
    UNION ALL SELECT f.id::text,'focus','Odaklanma oturumu tamamlandı',f.task_label||' · '||greatest(1,round(f.actual_duration_seconds/60.0))::text||' dk'||CASE WHEN f.focus_quality_rating IS NULL THEN '' ELSE ' · '||f.focus_quality_rating::text||'/5 kalite' END||CASE WHEN f.interruption_count=0 THEN ' · kesintisiz' ELSE ' · '||f.interruption_count::text||' kesinti' END||CASE WHEN f.post_session_note='' THEN '' ELSE ' · '||left(f.post_session_note,120) END,f.xp_awarded,f.ended_at,'focus',f.user_id,(f.ended_at AT TIME ZONE 'Europe/Istanbul')::date FROM public.focus_sessions f WHERE f.completed OR f.actual_duration_seconds>=600
    UNION ALL SELECT jsl.id::text,'mescidim',CASE WHEN jsl.entry_kind='dua' THEN 'Dua günlüğe kaydedildi' ELSE 'Esmâ tefekkürü kaydedildi' END,jsl.display_label,jsl.xp_awarded,jsl.created_at,'mescidim',jsl.user_id,jsl.entry_date FROM public.journal_spiritual_links jsl
    UNION ALL SELECT ulp.id::text,'profession','Meslek ve Ahlak dersi tamamlandı',pt.profession_name||' · '||pl.title,pl.xp_reward,ulp.completed_at,'profession-school',ulp.user_id,(ulp.completed_at AT TIME ZONE 'Europe/Istanbul')::date FROM public.user_lesson_progress ulp JOIN public.profession_lessons pl ON pl.id=ulp.lesson_id JOIN public.profession_tracks pt ON pt.id=pl.track_id
    UNION ALL SELECT uqa.id::text,'awareness','Farkındalık testi tamamlandı',CASE uqa.geography WHEN 'filistin' THEN 'Filistin' ELSE 'Doğu Türkistan' END||' · '||uqa.score::text||'/10',uqa.xh_awarded,uqa.completed_at,'awareness',uqa.user_id,(uqa.completed_at AT TIME ZONE 'Europe/Istanbul')::date FROM public.user_quiz_attempts uqa
    UNION ALL SELECT x.id::text,'mescidim',x.label,'Manevî pratik kaydı',x.xp_amount,x.created_at,'mescidim',x.user_id,(x.created_at AT TIME ZONE 'Europe/Istanbul')::date FROM public.xp_events x WHERE x.source_type NOT IN ('journal','journal_detail','quran','hadis','matrix','lessons','sukur','focus','spiritual_journal','profession_lesson','awareness_quiz')
  ) SELECT events.id,events.category,events.label,events.detail,events.xp_amount,events.occurred_at,events.source_view FROM events,bounds WHERE events.user_id=bounds.actor AND events.activity_date BETWEEN bounds.starts AND bounds.ends ORDER BY events.occurred_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_activity_log(DATE,DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_activity_log(DATE,DATE) TO authenticated;
