# Realtime subscription crash — 2026-09-15

## Confirmed cause

User supplied the production exception:
`cannot add postgres_changes callbacks for realtime:activity-log-<user> after subscribe()`.

The installed Supabase Realtime SDK returns the existing channel when a topic
matches. `JournalNotebook` calls `useActivityLog` twice (selected day and memory
range). Both hooks used `activity-log-${user.id}`. The second effect attempted
to register handlers on the first effect's subscribed channel, throwing into
the route error boundary. Asynchronous channel removal also made rapid remounts
unsafe. This is distinct from the legacy-data normalization in PR #37.

## Changes

- Each effect setup owns a uniquely named channel, including remounts; handlers
  are installed before subscribe. Existing cleanup removes only that channel.
- Activity feeds retain independent date-range queries and all 11 table filters.
  Late events after cleanup no longer schedule activity refreshes.
- Apply the same ownership rule to group chat, direct chat and Quran peer chat,
  which had the same fixed-topic lifecycle risk.
- No database migration, data deletion, authentication change or RLS change.
  Topics are not access controls; existing filters and server RLS still apply.
- Two simultaneous activity consumers intentionally use two channels. Each is
  released on unmount; a shared fan-out/cache could reduce channel count later.

## Verification

`node --test tests/realtime-ownership.cjs tests/recovery.cjs tests/growth-scene.cjs`
passed all 10 tests. The new tests use the actual installed Realtime SDK, with
network connection disabled and synthetic identities, and cover:

1. Exact original exception reproduced with the old shared-topic pattern.
2. Two independent subscriptions, asynchronous removal and immediate remount.
3. Actual activity-hook effect setup/cleanup with two date ranges, all 11
   per-user filters, refresh fan-out, user change and late-event cancellation.

The hook test uses a lightweight React effect harness, not a browser session.
`npm run build` passed, including TypeScript and all 17 generated pages.
The affected user's authenticated browser has not been retested by the agent;
the original exception was supplied by the user. Do not equate deployment
success or an unauthenticated login-page check with that end-to-end test.
