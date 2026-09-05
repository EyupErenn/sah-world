-- SAH World — Kur'an-ı Kerim Kardeşim: teachers, atomic booking, peer matching
-- and a private study goal. All appointment timestamps use timestamptz; recurring
-- teacher hours are interpreted in Europe/Istanbul.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'hoca'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quran_level TEXT,
  ADD CONSTRAINT profiles_quran_level_check CHECK (
    quran_level IS NULL OR quran_level IN ('beginner', 'alphabet', 'fluent', 'helper')
  );

CREATE OR REPLACE FUNCTION public.is_quran_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
$$;

REVOKE ALL ON FUNCTION public.is_quran_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_quran_admin() TO authenticated;

CREATE TABLE public.hoca_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 100),
  title TEXT NOT NULL DEFAULT 'Kur''an Öğreticisi' CHECK (char_length(btrim(title)) BETWEEN 2 AND 100),
  bio TEXT NOT NULL DEFAULT '' CHECK (char_length(bio) <= 1200),
  specialties TEXT[] NOT NULL DEFAULT '{}',
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_placeholder BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hoca_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hoca_id UUID NOT NULL REFERENCES public.hoca_profiles(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes SMALLINT NOT NULL DEFAULT 30 CHECK (slot_duration_minutes IN (20, 30, 40, 45, 60, 90)),
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  specific_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_time < end_time),
  CHECK ((is_recurring AND specific_date IS NULL) OR (NOT is_recurring AND specific_date IS NOT NULL))
);

CREATE TABLE public.hoca_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hoca_id UUID NOT NULL REFERENCES public.hoca_profiles(id) ON DELETE CASCADE,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 240),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_datetime < end_datetime)
);

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hoca_id UUID NOT NULL REFERENCES public.hoca_profiles(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  topic_notes TEXT NOT NULL DEFAULT '' CHECK (char_length(topic_notes) <= 600),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT CHECK (cancellation_reason IS NULL OR char_length(cancellation_reason) <= 300),
  CHECK (scheduled_start < scheduled_end)
);

CREATE TABLE public.quran_peer_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message TEXT NOT NULL DEFAULT '' CHECK (char_length(message) <= 400),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CHECK (requester_id <> helper_id),
  UNIQUE (requester_id, helper_id)
);

CREATE TABLE public.quran_study_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 240),
  progress_percent SMALLINT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX hoca_availability_lookup_idx ON public.hoca_availability (hoca_id, day_of_week, specific_date);
CREATE INDEX hoca_time_off_lookup_idx ON public.hoca_time_off (hoca_id, start_datetime, end_datetime);
CREATE INDEX appointments_hoca_start_idx ON public.appointments (hoca_id, scheduled_start);
CREATE INDEX appointments_student_start_idx ON public.appointments (student_id, scheduled_start);
CREATE INDEX quran_peer_participants_idx ON public.quran_peer_matches (requester_id, helper_id, status);

CREATE TRIGGER hoca_profiles_updated_at BEFORE UPDATE ON public.hoca_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER quran_study_goals_updated_at BEFORE UPDATE ON public.quran_study_goals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.protect_appointment_identity()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') AND (
    NEW.id IS DISTINCT FROM OLD.id OR NEW.hoca_id IS DISTINCT FROM OLD.hoca_id OR
    NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.scheduled_start IS DISTINCT FROM OLD.scheduled_start OR
    NEW.scheduled_end IS DISTINCT FROM OLD.scheduled_end OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'APPOINTMENT_IDENTITY_PROTECTED' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_appointment_identity_trigger BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.protect_appointment_identity();

CREATE OR REPLACE FUNCTION public.owns_hoca(target_hoca UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hoca_profiles
    WHERE id = target_hoca AND user_id = auth.uid()
  ) OR public.is_quran_admin()
$$;

REVOKE ALL ON FUNCTION public.owns_hoca(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_hoca(UUID) TO authenticated;

ALTER TABLE public.hoca_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoca_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoca_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_peer_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_study_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY hoca_profiles_public_read ON public.hoca_profiles FOR SELECT TO authenticated USING (is_active OR user_id = auth.uid() OR public.is_quran_admin());
CREATE POLICY hoca_profiles_owner_update ON public.hoca_profiles FOR UPDATE TO authenticated USING (public.owns_hoca(id)) WITH CHECK (public.owns_hoca(id));
CREATE POLICY availability_public_read ON public.hoca_availability FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.hoca_profiles hp WHERE hp.id = hoca_id AND hp.is_active));
CREATE POLICY availability_owner_insert ON public.hoca_availability FOR INSERT TO authenticated WITH CHECK (public.owns_hoca(hoca_id));
CREATE POLICY availability_owner_update ON public.hoca_availability FOR UPDATE TO authenticated USING (public.owns_hoca(hoca_id)) WITH CHECK (public.owns_hoca(hoca_id));
CREATE POLICY availability_owner_delete ON public.hoca_availability FOR DELETE TO authenticated USING (public.owns_hoca(hoca_id));
CREATE POLICY time_off_owner_all ON public.hoca_time_off FOR ALL TO authenticated USING (public.owns_hoca(hoca_id)) WITH CHECK (public.owns_hoca(hoca_id));
CREATE POLICY appointments_participant_read ON public.appointments FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.owns_hoca(hoca_id));
CREATE POLICY appointments_hoca_update ON public.appointments FOR UPDATE TO authenticated USING (public.owns_hoca(hoca_id)) WITH CHECK (public.owns_hoca(hoca_id));
CREATE POLICY peer_participant_read ON public.quran_peer_matches FOR SELECT TO authenticated USING (requester_id = auth.uid() OR helper_id = auth.uid());
CREATE POLICY peer_requester_delete ON public.quran_peer_matches FOR DELETE TO authenticated USING (requester_id = auth.uid() AND status = 'pending');
CREATE POLICY quran_goals_own_all ON public.quran_study_goals FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Admin-only user search and teacher role assignment. Email never enters public tables.
CREATE OR REPLACE FUNCTION public.admin_search_quran_users(search_text TEXT)
RETURNS TABLE (id UUID, display_name TEXT, email TEXT, avatar_url TEXT, role TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.is_quran_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT p.id, p.display_name, u.email::TEXT, p.avatar_url, p.role
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
  WHERE char_length(btrim(search_text)) >= 2
    AND (p.display_name ILIKE '%' || btrim(search_text) || '%' OR u.email ILIKE '%' || btrim(search_text) || '%')
  ORDER BY p.created_at ASC LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_quran_role(target_user_id UUID, next_role TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_name TEXT;
BEGIN
  IF NOT public.is_quran_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501'; END IF;
  IF target_user_id = auth.uid() THEN RAISE EXCEPTION 'SELF_ROLE_CHANGE_DENIED' USING ERRCODE = '22023'; END IF;
  IF next_role NOT IN ('user', 'hoca') THEN RAISE EXCEPTION 'INVALID_ROLE' USING ERRCODE = '22023'; END IF;
  UPDATE public.profiles SET role = next_role WHERE id = target_user_id RETURNING display_name INTO target_name;
  IF target_name IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF next_role = 'hoca' THEN
    INSERT INTO public.hoca_profiles (user_id, display_name, title, bio, specialties, is_active)
    VALUES (target_user_id, target_name, 'Kur''an Öğreticisi', 'Kur''an-ı Kerim öğretiminde öğrencilere rehberlik etmektedir.', ARRAY['Yeni Başlayanlar'], true)
    ON CONFLICT (user_id) DO UPDATE SET is_active = true, display_name = EXCLUDED.display_name;
  ELSE
    UPDATE public.hoca_profiles SET is_active = false WHERE user_id = target_user_id;
  END IF;
  RETURN next_role;
END;
$$;

-- Private slot computation. Appointment details are never exposed through this API.
CREATE OR REPLACE FUNCTION public.compute_hoca_slots(target_hoca_id UUID, target_date DATE)
RETURNS TABLE (slot_start TIMESTAMPTZ, slot_end TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT candidate AS slot_start, candidate + make_interval(mins => ha.slot_duration_minutes) AS slot_end
  FROM public.hoca_availability ha
  CROSS JOIN LATERAL generate_series(
    (target_date + ha.start_time) AT TIME ZONE 'Europe/Istanbul',
    ((target_date + ha.end_time) AT TIME ZONE 'Europe/Istanbul') - make_interval(mins => ha.slot_duration_minutes),
    make_interval(mins => ha.slot_duration_minutes)
  ) candidate
  WHERE ha.hoca_id = target_hoca_id
    AND ((ha.is_recurring AND ha.day_of_week = EXTRACT(DOW FROM target_date)::SMALLINT)
      OR (NOT ha.is_recurring AND ha.specific_date = target_date))
    AND candidate > now()
    AND NOT EXISTS (
      SELECT 1 FROM public.hoca_time_off hto
      WHERE hto.hoca_id = target_hoca_id
        AND tstzrange(hto.start_datetime, hto.end_datetime, '[)') && tstzrange(candidate, candidate + make_interval(mins => ha.slot_duration_minutes), '[)')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments ap
      WHERE ap.hoca_id = target_hoca_id AND ap.status IN ('pending', 'confirmed')
        AND tstzrange(ap.scheduled_start, ap.scheduled_end, '[)') && tstzrange(candidate, candidate + make_interval(mins => ha.slot_duration_minutes), '[)')
    )
  ORDER BY slot_start
$$;

CREATE OR REPLACE FUNCTION public.get_hoca_available_slots(target_hoca_id UUID, target_date DATE)
RETURNS TABLE (slot_start TIMESTAMPTZ, slot_end TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.hoca_profiles WHERE id = target_hoca_id AND is_active) THEN RETURN; END IF;
  RETURN QUERY SELECT * FROM public.compute_hoca_slots(target_hoca_id, target_date);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_hoca_available_days(target_hoca_id UUID, month_date DATE)
RETURNS TABLE (available_date DATE, slot_count BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT d::DATE, count(s.slot_start)
  FROM generate_series(date_trunc('month', month_date)::DATE, (date_trunc('month', month_date) + interval '1 month - 1 day')::DATE, interval '1 day') d
  CROSS JOIN LATERAL public.compute_hoca_slots(target_hoca_id, d::DATE) s
  GROUP BY d ORDER BY d;
END;
$$;

CREATE OR REPLACE FUNCTION public.book_hoca_appointment(target_hoca_id UUID, target_start TIMESTAMPTZ, notes TEXT DEFAULT '')
RETURNS public.appointments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE created public.appointments; chosen_end TIMESTAMPTZ; viewer UUID := auth.uid(); local_date DATE;
BEGIN
  IF viewer IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;
  IF char_length(btrim(coalesce(notes, ''))) > 600 THEN RAISE EXCEPTION 'NOTES_TOO_LONG' USING ERRCODE = '22023'; END IF;
  IF (SELECT count(*) FROM public.appointments WHERE student_id = viewer AND status IN ('pending','confirmed') AND scheduled_start > now()) >= 5 THEN
    RAISE EXCEPTION 'UPCOMING_LIMIT' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.hoca_profiles WHERE id = target_hoca_id AND user_id = viewer) THEN RAISE EXCEPTION 'SELF_BOOKING_DENIED' USING ERRCODE = '22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(target_hoca_id::TEXT || target_start::TEXT, 0));
  local_date := (target_start AT TIME ZONE 'Europe/Istanbul')::DATE;
  SELECT slot_end INTO chosen_end FROM public.compute_hoca_slots(target_hoca_id, local_date) WHERE slot_start = target_start LIMIT 1;
  IF chosen_end IS NULL THEN RAISE EXCEPTION 'SLOT_UNAVAILABLE' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.appointments (hoca_id, student_id, scheduled_start, scheduled_end, status, topic_notes)
  VALUES (target_hoca_id, viewer, target_start, chosen_end, 'confirmed', btrim(coalesce(notes, ''))) RETURNING * INTO created;
  RETURN created;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_hoca_appointment(target_appointment_id UUID, reason TEXT DEFAULT '')
RETURNS public.appointments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item public.appointments; viewer UUID := auth.uid(); can_manage BOOLEAN;
BEGIN
  SELECT * INTO item FROM public.appointments WHERE id = target_appointment_id FOR UPDATE;
  IF item.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  can_manage := public.owns_hoca(item.hoca_id);
  IF viewer <> item.student_id AND NOT can_manage THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE = '42501'; END IF;
  IF item.status NOT IN ('pending','confirmed') THEN RAISE EXCEPTION 'NOT_CANCELLABLE' USING ERRCODE = 'P0001'; END IF;
  IF viewer = item.student_id AND NOT can_manage AND item.scheduled_start <= now() + interval '2 hours' THEN
    RAISE EXCEPTION 'CANCELLATION_WINDOW' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.appointments SET status = 'cancelled', cancelled_at = now(), cancellation_reason = left(btrim(coalesce(reason,'')),300)
  WHERE id = target_appointment_id RETURNING * INTO item;
  RETURN item;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_quran_appointments()
RETURNS TABLE (
  id UUID, hoca_id UUID, student_id UUID, scheduled_start TIMESTAMPTZ, scheduled_end TIMESTAMPTZ,
  status TEXT, topic_notes TEXT, created_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT, hoca_name TEXT, hoca_title TEXT, hoca_photo TEXT,
  student_name TEXT, student_avatar TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT ap.id, ap.hoca_id, ap.student_id, ap.scheduled_start, ap.scheduled_end, ap.status,
    ap.topic_notes, ap.created_at, ap.cancelled_at, ap.cancellation_reason,
    hp.display_name, hp.title, hp.photo_url, student.display_name, student.avatar_url
  FROM public.appointments ap
  JOIN public.hoca_profiles hp ON hp.id = ap.hoca_id
  JOIN public.profiles student ON student.id = ap.student_id
  WHERE ap.student_id = auth.uid() OR public.owns_hoca(ap.hoca_id)
  ORDER BY ap.scheduled_start DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.browse_quran_helpers()
RETURNS TABLE (id UUID, display_name TEXT, avatar_url TEXT, xp INTEGER, quran_level TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT p.id, p.display_name, p.avatar_url, p.xp, p.quran_level
  FROM public.profiles p WHERE p.quran_level = 'helper' AND p.id <> auth.uid()
  ORDER BY p.xp DESC LIMIT 40;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_quran_peer_request(target_helper_id UUID, request_message TEXT DEFAULT '')
RETURNS public.quran_peer_matches LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item public.quran_peer_matches; viewer UUID := auth.uid();
BEGIN
  IF viewer IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;
  IF viewer = target_helper_id OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_helper_id AND quran_level = 'helper') THEN RAISE EXCEPTION 'INVALID_HELPER' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.quran_peer_matches (requester_id, helper_id, message)
  VALUES (viewer, target_helper_id, left(btrim(coalesce(request_message,'')),400))
  ON CONFLICT (requester_id, helper_id) DO UPDATE SET status = 'pending', message = EXCLUDED.message, created_at = now(), responded_at = NULL
  RETURNING * INTO item;
  RETURN item;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_quran_peer_match(target_match_id UUID, accept_request BOOLEAN)
RETURNS public.quran_peer_matches LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item public.quran_peer_matches;
BEGIN
  UPDATE public.quran_peer_matches SET status = CASE WHEN accept_request THEN 'accepted' ELSE 'declined' END, responded_at = now()
  WHERE id = target_match_id AND helper_id = auth.uid() AND status = 'pending' RETURNING * INTO item;
  IF item.id IS NULL THEN RAISE EXCEPTION 'MATCH_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  RETURN item;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_quran_peer_matches()
RETURNS TABLE (id UUID, partner_id UUID, partner_name TEXT, partner_avatar TEXT, direction TEXT, status TEXT, message TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT m.id,
    CASE WHEN m.requester_id = auth.uid() THEN m.helper_id ELSE m.requester_id END,
    p.display_name, p.avatar_url,
    CASE WHEN m.requester_id = auth.uid() THEN 'sent' ELSE 'received' END,
    m.status, m.message, m.created_at
  FROM public.quran_peer_matches m
  JOIN public.profiles p ON p.id = CASE WHEN m.requester_id = auth.uid() THEN m.helper_id ELSE m.requester_id END
  WHERE m.requester_id = auth.uid() OR m.helper_id = auth.uid()
  ORDER BY m.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_search_quran_users(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_quran_role(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.compute_hoca_slots(UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_hoca_available_slots(UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_hoca_available_days(UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.book_hoca_appointment(UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_hoca_appointment(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_quran_appointments() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.browse_quran_helpers() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_quran_peer_request(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_quran_peer_match(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_quran_peer_matches() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_search_quran_users(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_quran_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hoca_available_slots(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hoca_available_days(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_hoca_appointment(UUID, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_hoca_appointment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_quran_appointments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.browse_quran_helpers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_quran_peer_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_quran_peer_match(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_quran_peer_matches() TO authenticated;

-- Safe sample: it is intentionally not attached to a real auth identity.
INSERT INTO public.hoca_profiles (id, user_id, display_name, title, bio, specialties, is_active, is_placeholder)
VALUES (
  '7ca2b35d-8c4f-4d62-9c91-1f4898e7c201', NULL, 'İmam Hatip Ramazan Hoca', 'İmam Hatip',
  'Kur''an-ı Kerim öğretmenliği yapmaktadır. Bu örnek profil, yönetici tarafından gerçek bilgilerle güncellenmek üzere hazırlanmıştır.',
  ARRAY['Tecvid', 'Mahreç', 'Yeni Başlayanlar'], true, true
);

INSERT INTO public.hoca_availability (hoca_id, day_of_week, start_time, end_time, slot_duration_minutes)
VALUES
  ('7ca2b35d-8c4f-4d62-9c91-1f4898e7c201', 1, '18:00', '20:00', 30),
  ('7ca2b35d-8c4f-4d62-9c91-1f4898e7c201', 3, '18:00', '20:00', 30),
  ('7ca2b35d-8c4f-4d62-9c91-1f4898e7c201', 6, '10:00', '12:00', 30);

COMMENT ON TABLE public.hoca_profiles IS 'Quran teacher directory. The Ramazan Hoca row is an explicitly marked placeholder, not a fabricated person record.';
COMMENT ON FUNCTION public.book_hoca_appointment(UUID, TIMESTAMPTZ, TEXT) IS 'Atomically validates and books one Europe/Istanbul availability slot under an advisory lock.';
