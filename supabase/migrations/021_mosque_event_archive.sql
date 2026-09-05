-- SAH World — Mescidim identity, secure event archive and public media bucket.
-- The first profile becomes the initial mosque archive administrator. If every
-- administrator is ever removed, the next profile created safely restores one.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END;
$$;

-- Bootstrap one administrator from the oldest profile without creating a
-- separate identity system or requiring a dashboard-only manual step.
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM public.profiles ORDER BY created_at ASC, id ASC LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin');

CREATE OR REPLACE FUNCTION public.is_mosque_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

REVOKE ALL ON FUNCTION public.is_mosque_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_mosque_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_profile_role_safely()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    NEW.role := 'user';
  ELSE
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_profile_role_safely_trigger ON public.profiles;
CREATE TRIGGER assign_profile_role_safely_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_profile_role_safely();

-- A normal authenticated profile update may never promote its own role. Role
-- changes stay a trusted server/database concern.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role_trigger ON public.profiles;
CREATE TRIGGER protect_profile_role_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

CREATE TABLE IF NOT EXISTS public.mosque_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 140),
  description TEXT NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 6000),
  event_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sohbet', 'egitim', 'yardim', 'genclik', 'ozel')),
  cover_image_url TEXT,
  gallery_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(gallery_image_urls) = 'array'),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mosque_events_date_idx
  ON public.mosque_events (event_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS mosque_events_category_date_idx
  ON public.mosque_events (category, event_date DESC);

DROP TRIGGER IF EXISTS mosque_events_updated_at ON public.mosque_events;
CREATE TRIGGER mosque_events_updated_at
BEFORE UPDATE ON public.mosque_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.mosque_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mosque_events_authenticated_read ON public.mosque_events;
CREATE POLICY mosque_events_authenticated_read
  ON public.mosque_events FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS mosque_events_admin_insert ON public.mosque_events;
CREATE POLICY mosque_events_admin_insert
  ON public.mosque_events FOR INSERT TO authenticated
  WITH CHECK (public.is_mosque_admin() AND created_by = auth.uid());

DROP POLICY IF EXISTS mosque_events_admin_update ON public.mosque_events;
CREATE POLICY mosque_events_admin_update
  ON public.mosque_events FOR UPDATE TO authenticated
  USING (public.is_mosque_admin())
  WITH CHECK (public.is_mosque_admin());

DROP POLICY IF EXISTS mosque_events_admin_delete ON public.mosque_events;
CREATE POLICY mosque_events_admin_delete
  ON public.mosque_events FOR DELETE TO authenticated
  USING (public.is_mosque_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mosque-event-photos',
  'mosque-event-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS mosque_event_photos_public_read ON storage.objects;
CREATE POLICY mosque_event_photos_public_read
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'mosque-event-photos');

DROP POLICY IF EXISTS mosque_event_photos_admin_insert ON storage.objects;
CREATE POLICY mosque_event_photos_admin_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mosque-event-photos' AND public.is_mosque_admin());

DROP POLICY IF EXISTS mosque_event_photos_admin_update ON storage.objects;
CREATE POLICY mosque_event_photos_admin_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'mosque-event-photos' AND public.is_mosque_admin())
  WITH CHECK (bucket_id = 'mosque-event-photos' AND public.is_mosque_admin());

DROP POLICY IF EXISTS mosque_event_photos_admin_delete ON storage.objects;
CREATE POLICY mosque_event_photos_admin_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mosque-event-photos' AND public.is_mosque_admin());

COMMENT ON TABLE public.mosque_events IS
  'Public-to-members archive for Bursa Technical University Sehit Astsubay Omer Halisdemir Mosque events.';
COMMENT ON FUNCTION public.is_mosque_admin() IS
  'Authorizes mosque event management from the protected profiles.role field.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'mosque-event-photos') THEN
    RAISE EXCEPTION 'mosque-event-photos bucket could not be created';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles)
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'at least one mosque archive administrator is required';
  END IF;
END;
$$;
