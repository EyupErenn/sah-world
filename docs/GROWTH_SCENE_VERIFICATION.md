# Botanical growth scene verification — 15 September 2026

## Implemented

- Eight-layer SVG landscape with stage-driven tree/canopy/root proportions,
  time-of-day lighting, light/dark tokens, grass, pollen and root illumination.
- Seven keyboard-operable habitats, daily activity segments, curved energy flows,
  mapped hover highlights and a 1.5-second new-record pulse.
- Existing XP thresholds and integrated activity feed remain authoritative.
  Daily buckets use seven local calendar dates, not a rolling 168-hour period.
- Desktop orbit, tablet horizontal rail, mobile stacked list; empty-week CTA,
  stable loading dimensions, reduced-motion and offscreen/hidden-tab handling.
- No new dependencies, migrations, service keys or 3D imports.

## Tests actually run

Chrome/Playwright on the actual development dashboard with isolated local guest
fixtures (one valid journal entry and one gratitude entry):

| Width | Horizontal overflow | Card/card overlap | Card/tree overlap | Habitats |
| --- | --- | --- | --- | --- |
| 1440 | none | none | none | 7 |
| 1280 | none | none | none | 7 |
| 1024 | none | none | none | 7 |
| 768 | none | none | none | 7 |
| 390 | none | none | none | 7 |
| 375 | none | none | none | 7 |

The first desktop run exposed aspect-ratio/min-height width expansion. Explicit
`width:100%; min-width:0` fixed it; the table reports the subsequent run.
Screenshots were captured at every width and in dark mode. The actual dashboard
journal navigation passed, with no uncaught browser exceptions.

A temporary **isolated production scene harness**, removed before publication,
verified adding journal and gratitude events while mounted: the relevant day
segments changed, both pulses appeared and expired, and XH updated. All seven
navigation callbacks returned the correct target. Loading retained the identical
bounding rectangle. Reduced-motion toggling and scrolling fully offscreen paused
the scene. Empty-week CTA and dormant state passed.

`node --test tests/growth-scene.cjs`: three passing tests covering date boundaries,
future exclusion, two-category data binding, vitality boundaries and levels.
Scoped ESLint and the final `npm run build` passed with zero errors. The removed
temporary test route initially left a stale generated development validator;
that generated file was removed and the clean production build passed.

## Performance scope and limitations

Lighthouse desktop performance: **97/100**, LCP **1.3s**, on the isolated
production scene harness. A three-second headless Chrome sampling recorded 181
frames, mean 16.61ms, maximum 16.90ms. These measurements are not a guarantee for
every Android device or an authenticated full-dashboard Lighthouse result.
The Lighthouse report was written successfully; its CLI subsequently encountered
a Windows EPERM error removing its temporary Chrome profile.

Standalone size estimate (TypeScript transpilation + minification, including
the adapter and activity mapper): 25,605 bytes JavaScript + 18,303 bytes CSS =
43,908 bytes, or 15,786 bytes gzip. This excludes already-shared React/Framer
and level constants, and is not a whole-application bundle measurement.

No real user's database records were created for these visual tests. The scene
uses the existing `get_my_activity_log`/Realtime integration; a two-account
production database test was not part of this visual pass. Authentication,
database policies and existing unrelated workspace changes were left untouched.
