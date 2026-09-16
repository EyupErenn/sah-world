# Reliability/product correction — audited scope and release gates

Date: 16 September 2026. This is an incremental journal-reliability patch, **not completion of the five-part request**.

## Initial code audit

| Part | Actual starting state | Remaining definition-of-done gap |
| --- | --- | --- |
| 1 — integrity | `useJourneyStore.addXP` updated local XP and wrote `profiles.xp`; the local migration also copied browser XP. `recordXpEvent` accepted client amounts. Journal drafts existed only in component state; save optimistically announced success. Node regression tests existed, no Playwright CI. | All-source server validation, immutable ledger and derived total; real authenticated database E2E; scrubbed operational error capture; durable writes. |
| 2 — daily core | Greeting/routine/growth/quick actions existed; view navigation used component state. | Three-item daily-first home; compact growth disclosure; refreshable/shareable tabs and Back behavior. |
| 3 — routine | Morning/evening rituals and focus/journal links existed. Quick/full awarded different amounts. | Per-user routine composition, concrete intention/task/reflection link, equal-value rewards, rest-day allowance, direct daily wisdom path. |
| 4 — useful outputs | Journal memory cards, focus reflection, reports, Quran goals, community chat and citations existed. Past journal editing was prohibited by UI and RLS. | Shared group objective, actionable reports, central Quran continuation, personal/local mosque split, truthful editorial metadata. Privacy planning was missing. |
| 5 — pilot | Groups and general feedback existed. | Opt-in cohort, narrowly allowlisted analytics, weekly usefulness feedback and selected-routine 3-of-7-day metric. |

## This patch

- Account/date/ritual-scoped drafts debounce disk writes at 600ms and flush during pagehide, visibility changes, page changes and unmount.
- The draft is hydrated before the selected page becomes editable. An actual Playwright run caught an immediate-typing race in deferred hydration; it was corrected instead of hiding the failed test.
- Journal writes persist to an account-scoped outbox before optimistic state. An in-flight old response cannot remove a newer edit. Successful upserts acknowledge the stable record ID; network failures preserve the pending write.
- A root subscription retries on reconnection and every 30 seconds, independently of whether the journal screen is mounted. Pending rows are merged into the initial fetch, not overwritten by an older server snapshot.
- UI distinguishes a device draft, sending, server-acknowledged save, pending send and storage failure. Editing after a server save changes the status back to a device draft.
- `docs/PRIVACY_ROADMAP.md` describes actual plaintext browser storage, non-E2E backend access, key management, recovery and a staged encryption migration. It is planning, not shipped cryptography.
- Added Playwright and main-push/PR CI; the first suite tests draft navigation and reload in desktop/mobile browser viewports using existing **development-only** guest mode. These are **not real authentication, XH, RLS or two-account realtime tests**.
- Updated Next.js/eslint-config-next to 16.3.5 and compatible transitive dependency patches after npm audit identified critical/high advisories. No production authentication bypass was introduced.

## Verification gates

Node tests cover failed-send reload/retry, stable identity, concurrent edit acknowledgement, account isolation, corrupt storage preservation, quota failure and draft flush. Existing recovery/growth/realtime tests must stay green. `npm run build` and the actual Playwright run are required before this patch is merged; record their final results in the PR, not assumed successes here.

Local results on the final application changes: **16/16 Node tests passed; 4/4 actual Playwright tests passed** (1440×900 desktop and 390×844 mobile Chrome viewport, navigation/reload and separate ritual drafts; no unhandled page exceptions). `npm run build` passed on Next.js 16.3.5 with all 17 pages and zero TypeScript errors. Targeted ESLint passed. `npm audit` reported zero vulnerabilities. The mobile test is browser emulation, not a physical Android-device test. No real authenticated cloud-save/XP/group result is inferred from these tests.

Security advisory references verified against the maintainer's publications: [Windows-hosted server advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [AVIF optimization advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4). Next.js and its ESLint config remain pinned to the verified patch version.

## Limits — do not call Part 1 complete

- XP still uses the old client-authoritative path in this incremental patch. Journal outbox idempotency alone is **not** reward-ledger idempotency. Server XH must be the next independent change and tested against actual source rows.
- Only `saveJournal` uses the durable outbox here. Legacy `addJournal`, spirituality RPCs, gratitude saves and other source writes still need a unified safe transaction/retry architecture.
- Existing journal RLS accepts today's inserts/updates only. An offline write crossing the Turkish midnight boundary, or a multi-device natural-key conflict, can remain pending. It is preserved but not magically accepted; a reviewed server write/RLS migration is required. Do not report every offline case as solved.
- Browser storage is not unlimited, encrypted or immune to user clearing/OS termination. Normal navigation flush is tested; abrupt process termination during the last 600ms cannot be guaranteed.
- Existing Supabase management login returned `Unauthorized` on `npx supabase projects list`. `.env.local` only has public URL/anon key. Docker is installed but its Linux engine is not running. No production migration or real two-account database test was performed with these credentials.
- Parts 2, 3, most of 4 and all of 5 remain as listed above. No Sentry/equivalent backend has been configured, and no broad feature-completion claim is warranted.

## Next server-ledger release design/gates

1. Renew management access; obtain an isolated test Supabase environment with two synthetic users, never use real private content in CI artifacts.
2. Inventory every qualifying source and current security-definer RPC. Introduce canonical `(source_table, source_id, event_type)` uniqueness and source-ownership validation. Compute reward amounts inside the database; disallow client event inserts and direct profile-XP mutations.
3. Preserve existing earned totals with an explicit, auditable migration/baseline decision, not fabricated source activity. Make cached XP a recomputable ledger sum and serialize concurrent updates. Old server RPCs must stop incrementing in parallel with ledger triggers.
4. Move every source callsite, including disabled legacy code; remove browser-XP import. Handle source-save completion, capped duration validation, deletes/edits and repeated rewards explicitly.
5. Run real auth reload, journal one-award/retry, focus recovery/completion duplicate and two-user create/join/roster/realtime E2E. Verify ledger rows and cross-user permissions, then migrate production and verify the canonical Vercel deployment before declaring Part 1 complete.
