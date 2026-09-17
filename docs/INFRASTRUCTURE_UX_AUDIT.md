# Infrastructure and UX audit — 16 September 2026

## Release scope and database blocker

This is a **partial infrastructure hardening release**, not a completed server-XH migration or a certification of production security.

`npx supabase projects list` returned `LegacyProjectsListUnexpectedStatusError Unauthorized`. The locally linked project is `xintudrmubjtvdbzvlao`. No production migrations were run. The earlier read-only keepalive succeeded, but an API service-role credential is not database migration/management access. The currently signed-in dashboard identity cannot access the old project; changing a token alone may not resolve project membership.

Required owner action in a local terminal (never paste a token into chat):

```powershell
npx supabase login
npx supabase projects list
```

Use an access token from the identity with access to the existing project. Once that project is visible, inspect migration history and a dry run before applying anything. Do not create a replacement project or reset the database. Ownership support has already been contacted; no evidence of deletion was established.

## A. Infrastructure findings

### XH — unresolved, high priority

- `src/store/useJourneyStore.ts`, `addXP`: directly updates `profiles.xp` from the browser. Retained until the server replacement can be migrated and tested; removing it alone would silently stop persistence while leaving the database permission open.
- `src/lib/xp.ts`, `recordXpEvent`: client chooses `xp_amount`. Its unique `(user_id, source_type, source_id)` ledger constraint prevents one repeated ledger insert, **not** arbitrary awards, new invented source IDs, or concurrent profile overwrites.
- Award callsites include JournalNotebook, SectionView, DailyWisdomWheel, focusRuntime, AwarenessView, ProfessionSchoolView, MescidimLibrary and LegacyVillageApp. Some existing spiritual/profession RPCs already award on the server; the client `addXP` calls need a transaction-by-transaction reconciliation, not a blanket extra trigger that could double-award.
- Required follow-up: server-derived award rules based on owned source records; immutable deduplicated ledger; atomic profile accumulation; revoke direct client XP/ledger writes while preserving allowed profile edits; test concurrent retries, forged amounts, cross-user access and legacy balances. Deploy schema and compatible clients together. **None of these server-authority guarantees is claimed by this PR.**

### Recovery — changed

- Generalized the community-only boundary to `SectionErrorBoundary`, wrapping each main view with a view-specific key. Navigation stays outside the boundary; changing section creates a fresh boundary.
- Uses the installed Next 16.3 `catchError`/`retry` API, not a stale `reset` convention.
- Added a self-contained `global-error.tsx` for root layout failures. Existing root `error.tsx` and branded `not-found.tsx` remain.
- Removed raw exception logging from the community boundary and XP-event writer. Recovery copy no longer promises that all data is safe without knowing save status.
- A temporary local fault-injection page verified fallback, surviving surrounding controls, and successful retry after repair. The temporary page/test were removed before the final production build; no crash endpoint is shipped. The global root fallback was compile-checked, not fault-injected in production.

### Performance — measured with limitations

Run `node scripts/audit-production.mjs` after the production build. It reports initial manifest JS chunks, including shared/error entries, deduplicated within each route. Measurements from this release's audit build:

| Route | Raw JS KiB | gzip KiB |
| --- | ---: | ---: |
| `/` | 964 | 290 |
| `/feedback` | 760 | 221 |
| `/kesif` initial loader | 750 | 217 |
| `/gizlilik` | 745 | 216 |
| `/admin/feedback` | 777 | 226 |

These are **not** full authenticated transfer sizes: lazy imports, images, CSS and third-party fonts are excluded. `/kesif` loads its graphics lazily; its initial loader size is not the village's total cost. No recognizable Three/R3F runtime markers were found in the inspected initial chunks, and the core component imports contain no Three/R3F imports. Growth stays SVG-based and remains the default home simulation.

Removed the duplicate globally loaded canvas-confetti CDN script; milestone celebration already imports the npm implementation. Main feature views remain dynamically imported. A shared persistent focus runtime still contributes to every route; safely separating this without losing ongoing sessions is a remaining optimization. Other icons still depend on the existing Tabler CDN, not a new tree-shaken icon package. Search now uses a small local SVG so its essential affordance survives CDN failure.

Core content images use the existing Next Image wrappers. Eight raw `<img>` usages remain in the retained legacy `components/hub` area; this PR does not claim repository-wide image conversion.

### Security — repository inspection, not a live database audit

The read-only audit script found 37 table declarations in tracked SQL and an explicit ENABLE RLS statement for each. This lexical check cannot prove which migrations are deployed, whether every live table is covered, or whether every policy is safe. The client-writable XP policy above is a known example of RLS being enabled but insufficient.

No recognized service-role JWT, `sb_secret_`, GitHub PAT or private-key pattern was found in the inspected tracked source/config files. Service-role environment references occur in the server-only keepalive script/workflow and SQL role grants, not client source. This is a limited pattern check, not an exhaustive secret-history scan. No secrets were printed, extracted from GitHub, or added to client code.

## B. Visual and accessibility changes

- Kept the existing botanical simulation and its layered sky, hills, organic shaded trunk/canopy/roots, grounding shadow and reduced-motion-aware sway. No replacement illustration or removal of the home scene.
- Tablet activity cards now use a visible two-column grid instead of a horizontal carousel; mobile retains the vertical list and desktop retains the surrounding nodes. Scene control has a 44px minimum target.
- Moved the first-activity button into the information column; it previously covered the small seed/sprout in the illustration.
- Fixed mobile header CSS hiding the search icon along with its label.
- Linux CI found a 375px awareness narrative overflow that Windows did not reproduce. Narrative grid children now allow shrinking and long headings wrap instead of expanding their tracks; the compact route header can wrap as well. The test reports offending element classes to diagnose any recurrence.
- Focus records start collapsed: at narrow widths the previous default overlay obscured the entire timer. The explicit records toggle still opens/closes the panel. Driving/3D code is untouched.
- Global MotionConfig respects the device reduced-motion preference; existing section transitions remain. This does not certify every legacy GSAP/custom animation.
- Replaced generic dynamic-import placeholders with shared scene/editor/timer/report/card-shaped skeletons. Initial loading of every main dynamic view uses this component. Internal background revalidation/loading states have not all been converted.
- The repository uses custom shared CSS/UI primitives, **not an installed shadcn/ui component suite**. No second conflicting design framework was introduced. A complete normalization of every dialog, input and secondary touch target is still outstanding.

## Verification and limits

Automated tests use the existing development-only guest identity and synthetic records. They do not prove production RLS, multi-user writes, appointments or server-side awards.

- Unit suite: 21 passed.
- Final isolated browser suite: 18 passed; earlier failed runs are described below.
- Production build: passed; final CI also runs the build.
- Browser coverage: home scene at 375/768/1440, seven main sections at 375 with reduced motion, search visibility, primary navigation/tab target sizes, focus records toggle, journal draft persistence, report next action, Quran URL/back/reload and ayah/hadith selection, personal/local mosque navigation.
- Added explicit 375px checks for four journal tabs, six public Quran tabs, and three personal mosque tabs. Hoca management, every profession lesson, every modal/secondary action and authenticated production writes are not covered.
- Initial overloaded run (8 workers alongside build) timed out loading lazy chunks. Test concurrency is now capped at two. A separate fault-injection run initially collided with the suite's trace output; the final suite is run in isolation. Those unsuccessful attempts are not counted as passes.
- Screenshot artifacts are in Playwright test output, not public user data. Screenshots of a local focus background may include an unrelated pre-existing workspace edit; that asset was deliberately excluded from the commit.

Deployment status is recorded in the PR and release response only after GitHub/Vercel report success. Database access remains the blocker to completing Part A's most important security requirement.
