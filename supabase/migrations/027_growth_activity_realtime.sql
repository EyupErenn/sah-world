-- The dashboard growth diagram listens only to the signed-in user's rows.
-- Existing owner-only RLS remains authoritative for all Realtime payloads.
DO $$
DECLARE
  relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'journal_entries',
    'quran_notes',
    'hadis_notes',
    'eisenhower_tasks',
    'lesson_entries',
    'sukur_entries',
    'focus_sessions',
    'journal_spiritual_links',
    'user_lesson_progress'
  ]
  LOOP
    IF to_regclass(format('public.%I', relation_name)) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = relation_name
      )
    THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', relation_name);
    END IF;
  END LOOP;
END;
$$;
