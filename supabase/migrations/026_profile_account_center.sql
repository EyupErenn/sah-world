-- Professional account centre: cross-device preferences + private avatar writes.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_preference TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT
    '{"focus":true,"prayer":false,"community":true}'::jsonb;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_theme_preference_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_theme_preference_check
  CHECK (theme_preference IN ('light', 'dark', 'system'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_notification_preferences_object_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_notification_preferences_object_check
  CHECK (jsonb_typeof(notification_preferences) = 'object');

COMMENT ON COLUMN public.profiles.theme_preference IS
  'User interface theme preference, synchronized across devices.';
COMMENT ON COLUMN public.profiles.notification_preferences IS
  'Non-sensitive notification channel preferences synchronized across devices.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS user_avatars_public_read ON storage.objects;
CREATE POLICY user_avatars_public_read
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'user-avatars');

DROP POLICY IF EXISTS user_avatars_owner_insert ON storage.objects;
CREATE POLICY user_avatars_owner_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS user_avatars_owner_update ON storage.objects;
CREATE POLICY user_avatars_owner_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND owner_id = auth.uid()::text
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND owner_id = auth.uid()::text
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS user_avatars_owner_delete ON storage.objects;
CREATE POLICY user_avatars_owner_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND owner_id = auth.uid()::text
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

