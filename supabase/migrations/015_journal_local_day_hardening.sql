-- SAH World — Keep journal boundaries aligned with the product's Turkish day.

DROP POLICY IF EXISTS journal_update_today ON public.journal_entries;
DROP POLICY IF EXISTS journal_delete_today ON public.journal_entries;
CREATE POLICY journal_update_today ON public.journal_entries FOR UPDATE
  USING (auth.uid() = user_id AND date = (now() AT TIME ZONE 'Europe/Istanbul')::date)
  WITH CHECK (auth.uid() = user_id AND date = (now() AT TIME ZONE 'Europe/Istanbul')::date);
CREATE POLICY journal_delete_today ON public.journal_entries FOR DELETE
  USING (auth.uid() = user_id AND date = (now() AT TIME ZONE 'Europe/Istanbul')::date);

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
  local_today DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF target_kind NOT IN ('asma', 'dua') THEN RAISE EXCEPTION 'invalid_spiritual_kind'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text || local_today::text, 0));
  IF target_kind = 'asma' THEN
    IF target_reference_id !~ '^[0-9]{1,2}$' THEN RAISE EXCEPTION 'invalid_asma_reference'; END IF;
    SELECT transliteration_turkish || ' tefekkürü' INTO label FROM public.asma_ul_husna WHERE order_number = target_reference_id::smallint;
  ELSE
    SELECT title || CASE WHEN lower(title) LIKE '%duası' THEN ' okundu' ELSE ' duası okundu' END INTO label FROM public.dua_library WHERE id = target_reference_id;
  END IF;
  IF label IS NULL THEN RAISE EXCEPTION 'spiritual_reference_not_found'; END IF;
  SELECT id, content INTO entry_id, current_content FROM public.journal_entries
    WHERE user_id = actor AND date = local_today ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF entry_id IS NULL THEN
    INSERT INTO public.journal_entries(user_id, date, content, tags)
      VALUES (actor, local_today, '', ARRAY['mescidim']) RETURNING id, content INTO entry_id, current_content;
  END IF;
  INSERT INTO public.journal_spiritual_links(user_id, journal_entry_id, entry_date, entry_kind, reference_id, display_label, reflection_note, xp_awarded)
    SELECT actor, entry_id, local_today, target_kind, target_reference_id, label, nullif(left(btrim(reflection_text), 1000), ''),
      CASE WHEN (SELECT count(*) FROM public.journal_spiritual_links WHERE user_id=actor AND entry_date=local_today AND xp_awarded>0) < 3 THEN 10 ELSE 0 END
    ON CONFLICT (user_id, entry_date, entry_kind, reference_id) DO NOTHING RETURNING id, journal_spiritual_links.xp_awarded INTO link_id, award;
  IF link_id IS NOT NULL AND award > 0 THEN
    UPDATE public.profiles SET xp = xp + award WHERE id = actor;
    INSERT INTO public.xp_events(user_id, source_type, source_id, label, xp_amount)
      VALUES (actor, 'spiritual_journal', link_id, label, award) ON CONFLICT DO NOTHING;
  ELSE award := 0; END IF;
  SELECT count(*)::integer INTO awarded_count FROM public.journal_spiritual_links WHERE user_id=actor AND entry_date=local_today AND xp_awarded>0;
  RETURN QUERY SELECT entry_id, current_content, award, awarded_count;
END $$;

REVOKE ALL ON FUNCTION public.log_spiritual_to_journal(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_spiritual_to_journal(TEXT, TEXT, TEXT) TO authenticated;
