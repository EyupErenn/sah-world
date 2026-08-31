-- Journal history stays immutable: clients may only create today's rituals.
DROP POLICY IF EXISTS journal_insert ON public.journal_entries;
DROP POLICY IF EXISTS journal_insert_today ON public.journal_entries;
CREATE POLICY journal_insert_today ON public.journal_entries FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND date = (now() AT TIME ZONE 'Europe/Istanbul')::date
  );
