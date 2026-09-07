# SAH World — Production launch readiness audit

Last reviewed: 7 September 2026

This document records the release boundary implemented for the public launch. It is an engineering audit, not a substitute for an external penetration test or a religious/legal expert review.

## 1. Product navigation and information architecture

The authenticated product now exposes exactly seven primary destinations, in this order:

1. Odaklanma
2. Kur'an'ı Kerim Kardeşim
3. Mescidim
4. Günlük
5. Mazlum Coğrafyalar
6. Raporlarım
7. Meslek ve Ahlak Okulu

Desktop and mobile navigation use the same source array. Mobile shows the first four items directly and places the remaining three inside “Daha”; this changes presentation, not information architecture.

Previous standalone destinations were consolidated without losing data:

- Matris, Şükür and Hatalar ve Dersler are tabs inside Günlük.
- Bugünün Çarkı is a tab inside Kur'an'ı Kerim Kardeşim.
- Legacy deep links are translated to their new parent/tab destination.
- Ahiret Deposu was removed from the dashboard, command palette and primary navigation. The separately code-split `/kesif` 3D experiment remains in the repository for future work but is not linked from the core product.

## 2. Religious-source and terminology review

Every primary section now has a short, reusable source line linking to the Diyanet source used during implementation. The cited texts were checked against Diyanet's Kur'an portal and *Hadislerle İslam* pages on 7 September 2026.

- Odaklanma: Buhari, Rikak 1 — health and free time.
- Kur'an: Buhari, Fezailü'l-Kur'an 21 — learning and teaching the Qur'an.
- Mescidim: Tevbe 9:18.
- Günlük: Buhari, Rikak 18; Müslim, Müsafirin 218 — continuity in deeds.
- Farkındalık: Hud 11:112.
- Raporlarım: Haşr 59:18.
- Meslek ve Ahlak Okulu: Bakara 2:201. This replaces a commonly circulated but source-quality-disputed “itkan” wording.

Product copy consistently uses “Kur'an”, “hadis”, “tefekkür”, “niyet”, “emanet” and “ihsan” in a respectful instructional context. SAH World does not present itself as a fatwa service. Before a broad faith-community launch, an independent qualified scholar should still review the complete content library, translations and educational framing.

## 3. Authentication, authorization and RLS

Client code uses only the Supabase public/publishable key. Server actions call `auth.getUser()` before privileged work; admin actions additionally resolve the database-backed admin role. Service-role credentials occur only in the standalone GitHub Actions keep-alive process and are read from encrypted repository secrets.

Table families and enforced access boundary:

| Family | Tables | Boundary |
| --- | --- | --- |
| Private life records | `journal_entries`, `quran_notes`, `hadis_notes`, `lesson_entries`, `sukur_entries`, `eisenhower_tasks`, `tespih_log`, `focus_sessions`, `xp_events`, `weekly_insights`, `wheel_history` | `auth.uid() = user_id`; journal writes are additionally limited to the current Türkiye day where applicable. |
| Spiritual library | `asma_ul_husna`, `dua_library` | Authenticated read-only catalogue. |
| Private spiritual activity | `user_asma_reflections`, `user_dua_favorites`, `journal_spiritual_links` | Owner only. |
| Community | `groups`, `group_members`, `friendships`, `chat_messages` | Membership/participant policies; owner-only group administration; sender identity is server enforced. |
| Awareness and school catalogues | `regional_awareness_content`, `awareness_quiz_questions`, `profession_tracks`, `profession_lessons`, `mosque_events` | Authenticated published-content reads; mutations limited to database-backed admins. |
| User learning/activity | `user_quiz_attempts`, `awareness_engagement_log`, `user_profession_tracks`, `user_lesson_progress` | Owner only. |
| Qur'an companion | `hoca_profiles`, `hoca_availability`, `hoca_time_off`, `appointments`, `quran_peer_matches`, `quran_study_goals` | Public active-teacher discovery where intended; otherwise owner, teacher or direct participant only. Booking/matching writes go through validated RPC boundaries. |
| Feedback | `feedback` | User sees own submissions; admins review/update. Creation uses a validated server action/RPC boundary. |

Launch hardening adds:

- server-side maximum lengths for major user-authored text fields;
- 20 chat messages/minute, 10 quiz attempts/hour and 12 peer requests/hour limits;
- trigger checks that reject forged sender/user identities;
- corrected schema-qualified cryptographic group-code generation;
- a self-service, exact-confirmation `delete_my_account` RPC that can delete only `auth.uid()` and relies on foreign-key cascades for private records.

The profile settings UI explains privacy, links to policy pages and exposes account deletion. It never accepts a target user id.

## 4. Input, secrets and XSS review

- User content is rendered as React text, not injected HTML; no application path uses `dangerouslySetInnerHTML` for user records.
- Client `maxLength` constraints are backed by database checks for important persisted fields.
- Remote avatars are restricted to Supabase Storage, DiceBear and Google's OAuth avatar host. Invalid teacher/avatar URLs fall back to deterministic DiceBear initials.
- No `service_role` value is present in `src/`, Next.js config or browser-bundled code.
- `.env*` remains excluded from version control. Public Supabase variables are not treated as secrets; privileged keys must remain in Vercel/GitHub encrypted settings.

## 5. Performance and resilience

- The 3D/R3F experience is isolated behind `/kesif`; the primary `SahApp` bundle does not import Three.js, R3F, `VillageCanvas` or `LegacyVillageApp`.
- Major authenticated views are loaded through dynamic imports. Report/chart and Qur'an companion code is requested only when needed.
- Active-product remote avatars use `next/image` with explicit dimensions and responsive sizing. Legacy 3D model textures remain isolated to the optional `/kesif` bundle.
- Next.js `error.tsx` and `not-found.tsx` provide recoverable branded failure states.
- Metadata includes canonical URL, Open Graph/Twitter cards, icons, robots and sitemap endpoints.
- The generated web app manifest supplies standalone display metadata, theme colors and install icons.
- GitHub Actions keep-alive runs a minimal read-only Supabase query every three days. Setup and manual verification are documented in `docs/KEEPALIVE_SETUP.md`.

The final Next.js 16 production output contains 429.9 KiB of raw, pre-compression shared framework/runtime chunks. Lazy main-product view chunks are at or below 104.0 KiB raw in the generated loadable manifest. The 1,077.2 KiB raw Three.js vendor chunk appears only in the `/kesif` loadable dependency graph and is absent from the primary app's initial manifest. These are build-artifact sizes; browser transfer sizes are lower after Vercel compression.

## 6. First-run experience

New accounts receive a three-step, skippable product tour. Completion is stored in `profiles.onboarding_completed`, with the earlier local flag retained only as a compatibility fallback. Returning and older accounts are not repeatedly interrupted.

## 7. Release verification checklist

- [x] Production `npm run build` completes with zero TypeScript errors.
- [x] Primary navigation derives from one seven-item source of truth.
- [x] Previous standalone tools are reachable inside their intended parent sections.
- [x] Self-service profile editing and exact-confirmation account deletion UI exist.
- [x] Database input/rate-limit hardening is expressed as versioned migrations.
- [x] Service-role use is isolated from the Next.js application.
- [x] SEO, social preview, manifest, privacy and terms surfaces exist.
- [x] Migrations `023`, `024` and `025` applied to production; linked database lint reports no schema errors or warnings.
- [x] Desktop and 390 × 844 mobile smoke tests completed locally across all seven sections; the Reports mobile overflow found during QA was corrected.
- [x] Three-step onboarding completed end to end through the development-only `?onboarding=preview` harness, ending at Günlük without writing production data.
- [x] Account deletion UI and exact-confirmation RPC authorization were inspected; destructive execution against the maintainer's real account was intentionally not performed.
- [ ] Repeat the non-destructive smoke suite against the final production deployment.
- [ ] Obtain independent religious-content and legal-policy review before a broad public campaign.
