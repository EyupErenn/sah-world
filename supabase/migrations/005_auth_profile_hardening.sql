-- SAH World — production auth/profile hardening.
-- Keeps RLS strict: clients never choose a profile owner id.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(split_part(COALESCE(NEW.email, NEW.phone, ''), '@', 1), ''),
      'Yolcu'
    ),
    NULLIF(btrim(NEW.raw_user_meta_data->>'avatar_url'), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recovery path for a partially-created auth user. The id always comes from
-- auth.uid(); callers cannot create or overwrite another user's profile.
CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  metadata JSONB := COALESCE(auth.jwt()->'user_metadata', '{}'::jsonb);
  email_value TEXT := COALESCE(auth.jwt()->>'email', '');
  result public.profiles;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    current_user_id,
    COALESCE(
      NULLIF(btrim(metadata->>'full_name'), ''),
      NULLIF(btrim(metadata->>'name'), ''),
      NULLIF(split_part(email_value, '@', 1), ''),
      'Yolcu'
    ),
    NULLIF(btrim(metadata->>'avatar_url'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO result FROM public.profiles WHERE id = current_user_id;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

COMMENT ON FUNCTION public.ensure_my_profile() IS
  'Idempotently repairs the authenticated user profile without accepting a client-supplied owner id.';
