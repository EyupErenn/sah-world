BEGIN;

SELECT plan(10);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-user-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"RLS User A"}', now(), now()),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-user-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"RLS User B"}', now(), now()),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-admin@example.invalid', '', now(), '{"provider":"email","providers":["email"],"role":"admin"}', '{"name":"RLS Admin"}', now(), now());

SELECT is((SELECT count(*)::integer FROM public.profiles WHERE id IN (
  '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003'
)), 3, 'auth trigger creates one profile per user');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}', true);

SELECT lives_ok(
  $$INSERT INTO public.journal_entries (user_id, date, content) VALUES ('10000000-0000-4000-8000-000000000001', current_date, 'Kullanıcı A özel kaydı')$$,
  'user can create an owned private journal entry'
);
SELECT throws_ok(
  $$INSERT INTO public.journal_entries (user_id, date, content) VALUES ('10000000-0000-4000-8000-000000000002', current_date, 'Yetkisiz kayıt')$$,
  '42501',
  'new row violates row-level security policy for table "journal_entries"',
  'user cannot write as another user'
);
SELECT is((SELECT count(*)::integer FROM public.journal_entries WHERE user_id = '10000000-0000-4000-8000-000000000002'), 0, 'user cannot read another user private rows');
SELECT is((SELECT (public.ensure_my_profile()).id), '10000000-0000-4000-8000-000000000001'::uuid, 'profile recovery binds identity to auth.uid');
SELECT is(public.is_app_admin(), false, 'normal user is not admin');

SELECT throws_ok(
  $$INSERT INTO public.feedback (user_id, type, title, message) VALUES ('10000000-0000-4000-8000-000000000001', 'suggestion', 'Doğrudan ekleme', 'Bu doğrudan ekleme RLS tarafından reddedilmelidir.')$$,
  '42501',
  'new row violates row-level security policy for table "feedback"',
  'feedback direct insert is blocked'
);
SELECT lives_ok(
  $$SELECT public.submit_feedback('suggestion', 'Güvenli geri bildirim', 'Kimlik sunucu oturumundan bağlanarak güvenli biçimde eklenir.', 5, '/feedback')$$,
  'feedback RPC accepts an authenticated user'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{}}', true);
SELECT is((SELECT count(*)::integer FROM public.feedback), 0, 'another normal user cannot read private feedback');
SELECT is(public.is_app_admin(), false, 'second normal user cannot self-elevate');

SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"role":"admin"}}', true);
SELECT is(public.is_app_admin(), true, 'protected app_metadata claim grants admin role');
SELECT is((SELECT count(*)::integer FROM public.feedback), 1, 'admin can read feedback through RLS');

SELECT * FROM finish();
ROLLBACK;
