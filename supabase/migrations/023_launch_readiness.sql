-- SAH World public-launch hardening.
-- Adds server-backed onboarding, self-service erasure, defensive input limits
-- and abuse throttles without changing or deleting existing user content.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_display_name_length;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_name_length
  CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 60) NOT VALID;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_url_length;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_url_length
  CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 2048) NOT VALID;

ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_content_length;
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_content_length CHECK (char_length(content) <= 20000) NOT VALID;
ALTER TABLE public.quran_notes DROP CONSTRAINT IF EXISTS quran_notes_text_length;
ALTER TABLE public.quran_notes ADD CONSTRAINT quran_notes_text_length CHECK (char_length(sure) <= 120 AND char_length(ayet) <= 120 AND char_length(tefsir) <= 12000 AND char_length(ders) <= 8000) NOT VALID;
ALTER TABLE public.hadis_notes DROP CONSTRAINT IF EXISTS hadis_notes_text_length;
ALTER TABLE public.hadis_notes ADD CONSTRAINT hadis_notes_text_length CHECK (char_length(metin) <= 12000 AND char_length(kaynak) <= 240 AND char_length(konu) <= 160 AND char_length(uygulama) <= 8000) NOT VALID;
ALTER TABLE public.lesson_entries DROP CONSTRAINT IF EXISTS lesson_entries_text_length;
ALTER TABLE public.lesson_entries ADD CONSTRAINT lesson_entries_text_length CHECK (char_length(title) <= 240 AND char_length(wrong) <= 12000 AND char_length(learned) <= 12000) NOT VALID;
ALTER TABLE public.sukur_entries DROP CONSTRAINT IF EXISTS sukur_entries_text_length;
ALTER TABLE public.sukur_entries ADD CONSTRAINT sukur_entries_text_length CHECK (char_length(text) <= 8000 AND char_length(nimet1) <= 1000 AND char_length(nimet2) <= 1000 AND char_length(nimet3) <= 1000) NOT VALID;
ALTER TABLE public.eisenhower_tasks DROP CONSTRAINT IF EXISTS eisenhower_task_text_length;
ALTER TABLE public.eisenhower_tasks ADD CONSTRAINT eisenhower_task_text_length CHECK (char_length(btrim(text)) BETWEEN 1 AND 500) NOT VALID;
ALTER TABLE public.user_asma_reflections DROP CONSTRAINT IF EXISTS asma_reflection_text_length;
ALTER TABLE public.user_asma_reflections ADD CONSTRAINT asma_reflection_text_length CHECK (char_length(reflection_note) <= 2000) NOT VALID;
ALTER TABLE public.journal_spiritual_links DROP CONSTRAINT IF EXISTS spiritual_link_reflection_length;
ALTER TABLE public.journal_spiritual_links ADD CONSTRAINT spiritual_link_reflection_length CHECK (reflection_note IS NULL OR char_length(reflection_note) <= 2000) NOT VALID;
ALTER TABLE public.mosque_events DROP CONSTRAINT IF EXISTS mosque_event_text_length;
ALTER TABLE public.mosque_events ADD CONSTRAINT mosque_event_text_length CHECK (char_length(btrim(title)) BETWEEN 2 AND 160 AND char_length(description) <= 5000) NOT VALID;

-- Message throttling applies to both direct and group messages, including RPC
-- inserts. It intentionally counts only the authenticated sender's own rows.
CREATE OR REPLACE FUNCTION public.enforce_chat_message_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.sender_id <> auth.uid() THEN
    RAISE EXCEPTION 'MESSAGE_IDENTITY_INVALID' USING ERRCODE = '42501';
  END IF;
  IF (SELECT count(*) FROM public.chat_messages WHERE sender_id = auth.uid() AND created_at > now() - interval '1 minute') >= 20 THEN
    RAISE EXCEPTION 'MESSAGE_RATE_LIMIT' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_message_rate_limit_trigger ON public.chat_messages;
CREATE TRIGGER chat_message_rate_limit_trigger
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_chat_message_rate_limit();

-- Quiz rows are client-submitted but owner-only under RLS. This throttle stops
-- rapid replay while preserving normal retakes during learning.
CREATE OR REPLACE FUNCTION public.enforce_quiz_attempt_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'QUIZ_IDENTITY_INVALID' USING ERRCODE = '42501';
  END IF;
  IF (SELECT count(*) FROM public.user_quiz_attempts WHERE user_id = auth.uid() AND completed_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'QUIZ_RATE_LIMIT' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quiz_attempt_rate_limit_trigger ON public.user_quiz_attempts;
CREATE TRIGGER quiz_attempt_rate_limit_trigger
  BEFORE INSERT ON public.user_quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_quiz_attempt_rate_limit();

-- A single peer request may be refreshed, but no user can fan out requests
-- indefinitely in a short period.
CREATE OR REPLACE FUNCTION public.enforce_peer_request_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.requester_id <> auth.uid() THEN
    RAISE EXCEPTION 'PEER_IDENTITY_INVALID' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' AND (SELECT count(*) FROM public.quran_peer_matches WHERE requester_id = auth.uid() AND created_at > now() - interval '1 hour') >= 12 THEN
    RAISE EXCEPTION 'PEER_RATE_LIMIT' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS peer_request_rate_limit_trigger ON public.quran_peer_matches;
CREATE TRIGGER peer_request_rate_limit_trigger
  BEFORE INSERT ON public.quran_peer_matches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_peer_request_rate_limit();

-- GDPR/KVKK-style self-service erasure. Authorization is derived exclusively
-- from auth.uid(); callers cannot select another account. Deleting auth.users
-- cascades through profiles and every user-owned table.
CREATE OR REPLACE FUNCTION public.delete_my_account(confirmation_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE actor UUID := auth.uid();
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;
  IF confirmation_text <> 'HESABIMI SIL' THEN RAISE EXCEPTION 'CONFIRMATION_REQUIRED' USING ERRCODE = '22023'; END IF;
  DELETE FROM auth.users WHERE id = actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_chat_message_rate_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_quiz_attempt_rate_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_peer_request_rate_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_account(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account(TEXT) TO authenticated;

COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Server-backed one-time launch onboarding flag.';
COMMENT ON FUNCTION public.delete_my_account(TEXT) IS 'Deletes only auth.uid() after exact confirmation; ownership cascades erase private application data.';
