# Daily core / URL navigation — incremental release

This release implements a bounded portion of the five-part reliability correction, not the whole request. Server-authoritative XH remains the highest-priority outstanding gate; Supabase management access currently returns Unauthorized. No production database schema is changed by this release.

## Changes

- The primary home has exactly three modules: one small suggested action, continuation, and brief progress. Suggestions derive from today's journal; continuation checks active focus, account-scoped local journal content, then an unfinished Quran goal. Upcoming-appointment continuation is not implemented yet.
- Growth is explicitly disclosed and lazy-loaded. The full existing growth dashboard is retained at `/?view=growth`, not removed.
- Primary views, four journal tabs and Quran tabs use allowlisted query parameters and native browser history. Refresh and Back preserve the selected area without fetching the entire page again. Wisdom mode/archive filters are also URL-addressable.
- Today's ayah/hadith can be opened directly or via the existing three-step wheel. Both reveal the same existing daily selection and use the same existing saving/reward path; no extra reward mechanism is added. That reward path still requires the server-ledger correction.
- Quran introductory video/virtue sections appear only on its introductory tab; interactive tabs start with their own compact heading. The study heading reflects an actual goal where present.

## Verification scope

Playwright exercises the development-only guest UI, not real authenticated production accounts: three-module home, deferred illustration, tab refresh/Back, direct daily wisdom and draft persistence. Desktop/mobile projects capture screenshots/traces on failure and assert no uncaught page errors. Authenticated goal fetching, ledger assertions and two-account community realtime remain unverified and must not be represented as passing.

No DB migration, claim of complete Parts 1–5, real Android-device test, shared group goals, rest tokens or pilot analytics is included here. See RELIABILITY_CORRECTION_STATUS.md for outstanding release gates.
