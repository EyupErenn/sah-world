BEGIN;

SELECT plan(7);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'focus-user-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Focus User A"}', now(), now()),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'focus-user-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Focus User B"}', now(), now());

SELECT is((SELECT count(*)::integer FROM public.profiles WHERE id::text LIKE '20000000-%'), 2, 'auth trigger creates both focus test profiles');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

SELECT lives_ok(
  $$INSERT INTO public.focus_sessions (user_id, task_label, timer_type, planned_duration_seconds, actual_duration_seconds, started_at, ended_at, completed, xp_awarded)
    VALUES ('20000000-0000-4000-8000-000000000001', 'Kullanıcı A odağı', 'countdown', 1500, 1500, now() - interval '25 minutes', now(), true, 20)$$,
  'user can create an owned focus session'
);
SELECT throws_ok(
  $$INSERT INTO public.focus_sessions (user_id, task_label, timer_type, planned_duration_seconds, actual_duration_seconds, started_at, ended_at, completed, xp_awarded)
    VALUES ('20000000-0000-4000-8000-000000000002', 'Yetkisiz odak', 'stopwatch', 0, 300, now() - interval '5 minutes', now(), true, 4)$$,
  '42501',
  'new row violates row-level security policy for table "focus_sessions"',
  'user cannot create a focus session for another user'
);

SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT lives_ok(
  $$INSERT INTO public.focus_sessions (user_id, task_label, timer_type, planned_duration_seconds, actual_duration_seconds, started_at, ended_at, completed, xp_awarded)
    VALUES ('20000000-0000-4000-8000-000000000002', 'Kullanıcı B odağı', 'stopwatch', 0, 600, now() - interval '10 minutes', now(), true, 8)$$,
  'second user can create their own focus session'
);

SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.focus_sessions), 1, 'user can only read their own focus sessions');
SELECT lives_ok(
  $$UPDATE public.focus_sessions SET task_label = 'Güncellenmiş odak' WHERE user_id = '20000000-0000-4000-8000-000000000001'$$,
  'user can update their own focus session'
);
SELECT lives_ok(
  $$DELETE FROM public.focus_sessions WHERE user_id = '20000000-0000-4000-8000-000000000002'$$,
  'attempting to delete another user session is safely filtered by RLS'
);

SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.focus_sessions), 1, 'other user session remains after an unauthorized delete attempt');

SELECT * FROM finish();
ROLLBACK;
