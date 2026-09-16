# Practical outcomes — scoped Part 4 improvements

## What changes

- Reports show one explicit, tappable next action before the statistics. Selection uses the last seven days of actual journal/activity data, excludes future activity, and supplies a sensible first-entry action when empty. No clinical diagnosis, mandatory spiritual habit or higher reward for longer writing is implied. Existing weekly insights remain available below.
- Mescidim defaults to the personal-practice area regardless of city. Vakitler/zikir, Esma and dua remain personal tools. BTU's mosque identity and event archive appear only after deliberately selecting the separate local-community area. Both scopes and their existing tabs are URL-addressable; Back/refresh restores selection. Existing awareness-to-dua session hints remain compatible.
- Daily continuation checks an upcoming own-student appointment within seven days before an unfinished Quran goal, after active focus/local journal continuation. It distinguishes pending from confirmed. Queries use the existing typed schema and RLS; no elevated credentials enter the browser.

## Verification / explicit limits

New Playwright cases exercise empty reports' CTA and personal/local scope separation, dua refresh and Back, with desktop/mobile projects and uncaught-page-error assertions. These use the existing development-only guest view, **not real authenticated users**. Actual production appointment retrieval, ownership/RLS and source-driven report recommendations with real accounts still require authenticated test verification.

This release does not implement the server XH ledger, group weekly goals, journal past-edit RLS, routine preferences/rest tokens, editorial review fields, error-tracking backend or pilot analytics. Those remain outstanding. No production migration or private record mutation is performed here. Supabase support has received the ownership-access investigation request; API availability is verified independently but management access remains unavailable.
