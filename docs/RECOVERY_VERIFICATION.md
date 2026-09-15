# Recovery and legacy-data compatibility — 15 September 2026

## Findings and changes

- Confirmed reproducible startup exception: a legacy gratitude row without
  `nimets` throws in the shared search index (`undefined.join`). Because the
  index runs at application startup, this can replace the entire app with its
  route error fallback. Normalization now runs at persistence hydration and
  server/import boundaries. Valid record IDs, content and optional fields are
  retained; missing arrays/text fields get safe defaults. Unknown dates remain
  historical rather than generating recent activity or XP.
- Null collections, partial matrix quadrants, legacy journal `text`, malformed
  scalar values and absent focus fields are handled at that same read boundary.
- Unknown RPC activity categories previously reached unchecked CATEGORY_META
  lookups. Unsupported categories/invalid dates are excluded from the rendered
  activity feed without changing server records.
- The recovery button used brand variables scoped to `.core-app`, but the error
  route sits outside that element. Added explicit high-contrast fallback styles.
- Switched recovery to the installed Next.js `retry` API (refresh + boundary
  reset), with a separate full-page reload button. Neither action clears data.

## Verification

- Seven Node tests pass, including a test that first reproduces the original
  legacy-row TypeError, then verifies normalization preserves text/ID and allows
  the same data to render. Null collections, date fallbacks, optional fields,
  gratitude slot positions, preferences, unknown categories and growth tests pass.
- Scoped ESLint passed. Final `npm run build` passed with zero errors and no
  temporary test route in the route list.
- Local browser guest session: homepage and existing journal data render;
  reports render counts/calendar/category distribution; Mescidim, Quran
  Companion onboarding, profession school, awareness and focus screens load.
  This is an opening/navigation smoke check, not every feature's mutation flow.
- A temporary route deliberately threw an error to exercise the actual Next.js
  boundary. The retry button had white text and an indigo/violet gradient;
  clicking it returned to the working route. Temporary route removed afterward.

## Scope and honesty

The screenshot alone does not expose the user's original exception stack. The
legacy-row crash is reproduced and fixed, but cannot be asserted as the only
possible cause of that screenshot. No production journal/other personal records
were inspected, edited or deleted. No database migrations or auth changes.
This is not a claim that every possible error in the application is eliminated.
