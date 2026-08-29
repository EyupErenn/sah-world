-- User-specific, read-only wheel history. Content stays versioned in the app;
-- this table stores only stable identifiers and reveal timestamps.
CREATE TABLE IF NOT EXISTS public.wheel_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('verse', 'hadith')),
  content_id text NOT NULL CHECK (content_id ~ '^[a-z0-9-]{2,80}$'),
  reveal_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Europe/Istanbul')::date),
  is_daily boolean NOT NULL DEFAULT false,
  shown_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wheel_history_recent
  ON public.wheel_history(user_id, content_type, shown_at DESC);
CREATE INDEX IF NOT EXISTS wheel_history_by_day
  ON public.wheel_history(user_id, reveal_date DESC, shown_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS wheel_history_one_daily_reveal
  ON public.wheel_history(user_id, content_type, reveal_date)
  WHERE is_daily;

ALTER TABLE public.wheel_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wheel_history_select_own ON public.wheel_history;
CREATE POLICY wheel_history_select_own ON public.wheel_history
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.wheel_history FROM anon, authenticated;
GRANT SELECT ON public.wheel_history TO authenticated;

CREATE OR REPLACE FUNCTION public.record_wheel_reveal(
  requested_type text,
  requested_content_id text,
  daily_reveal boolean DEFAULT false
)
RETURNS TABLE(content_id text, shown_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  today_tr date := (now() AT TIME ZONE 'Europe/Istanbul')::date;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;
  IF requested_type NOT IN ('verse', 'hadith') THEN
    RAISE EXCEPTION 'invalid_content_type';
  END IF;
  IF requested_content_id !~ '^[a-z0-9-]{2,80}$' THEN
    RAISE EXCEPTION 'invalid_content_id';
  END IF;

  IF daily_reveal THEN
    RETURN QUERY
      SELECT h.content_id, h.shown_at
      FROM public.wheel_history h
      WHERE h.user_id = caller_id
        AND h.content_type = requested_type
        AND h.reveal_date = today_tr
        AND h.is_daily
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  ELSE
    IF (
      SELECT count(*)
      FROM public.wheel_history h
      WHERE h.user_id = caller_id
        AND h.shown_at > now() - interval '1 hour'
    ) >= 120 THEN
      RAISE EXCEPTION 'wheel_rate_limit';
    END IF;
  END IF;

  BEGIN
    RETURN QUERY
      INSERT INTO public.wheel_history(user_id, content_type, content_id, reveal_date, is_daily)
      VALUES (caller_id, requested_type, requested_content_id, today_tr, daily_reveal)
      RETURNING wheel_history.content_id, wheel_history.shown_at;
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY
      SELECT h.content_id, h.shown_at
      FROM public.wheel_history h
      WHERE h.user_id = caller_id
        AND h.content_type = requested_type
        AND h.reveal_date = today_tr
        AND h.is_daily
      LIMIT 1;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.record_wheel_reveal(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_wheel_reveal(text, text, boolean) TO authenticated;
