-- SAH World — private Pomodoro/focus session ledger.
-- Each user can only access their own sessions. Journal links are restricted
-- to the same user's entries by application logic and row ownership policies.

CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_label TEXT NOT NULL CHECK (char_length(trim(task_label)) BETWEEN 1 AND 120),
  timer_type TEXT NOT NULL CHECK (timer_type IN ('countdown', 'stopwatch')),
  planned_duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (planned_duration_seconds BETWEEN 0 AND 43200),
  actual_duration_seconds INTEGER NOT NULL CHECK (actual_duration_seconds BETWEEN 0 AND 43200),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  linked_journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded BETWEEN 0 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS focus_sessions_user_started_idx
  ON public.focus_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS focus_sessions_user_ended_idx
  ON public.focus_sessions(user_id, ended_at DESC);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS focus_sessions_select_own ON public.focus_sessions;
DROP POLICY IF EXISTS focus_sessions_insert_own ON public.focus_sessions;
DROP POLICY IF EXISTS focus_sessions_update_own ON public.focus_sessions;
DROP POLICY IF EXISTS focus_sessions_delete_own ON public.focus_sessions;

CREATE POLICY focus_sessions_select_own ON public.focus_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY focus_sessions_insert_own ON public.focus_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY focus_sessions_update_own ON public.focus_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY focus_sessions_delete_own ON public.focus_sessions
  FOR DELETE USING (auth.uid() = user_id);
