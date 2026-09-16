# SAH World privacy roadmap

Status: planning only, 16 September 2026. This document does not assert that encryption has been implemented.

## Current guarantees and limits

Supabase's managed infrastructure provides transport and storage encryption. RLS restricts ordinary authenticated API access to the user's permitted rows, but RLS is not encryption: privileged database access and application server access can read journal content, intentions, reflections and chat. SAH World is **not end-to-end encrypted**.

The browser's journey store, journal drafts and pending journal writes use localStorage, in plaintext. Account-scoped keys prevent accidental mixing; they do not protect against someone using the same browser profile, XSS, browser extensions or device access. Device/browser storage clearing can remove an unsent draft. A forced OS/process kill can lose the last debounce window; normal navigation/pagehide flushes it. A “server saved” indicator must only reflect an acknowledged database write, never local persistence alone.

Draft text and outbox payloads must never be sent to telemetry. CI screenshots/traces may contain synthetic test text only; never point the UI test suite at a user's real private data. Before releasing error tracking, test its outgoing payloads with sentinel strings placed in journal, dua reflection, task label and chat fields. Retain only allowlisted diagnostic fields, scrub URL query strings, disable DOM/session replay, and never collect application state or request/response bodies.

## Comparison and target

[Day One's end-to-end encryption](https://dayoneapp.com/features/end-to-end-encryption/) is the aspiration for personal content, not a description of today's SAH World. Our target is for sensitive plaintext to be encrypted on the device before transmission, and for Supabase/operator infrastructure to receive ciphertext without a decrypting key. User identity, entry date, record existence and reward events would still reveal some metadata; do not advertise complete anonymity.

## Phase 1 — threat model and data minimization

- Inventory journal content, moments, intention, challenge, gratitude, self-note, focus labels/reflections and spiritual notes. Decide explicitly which fields are encrypted, not only the primary textarea.
- Remove free text from operational logs, source labels in the reward ledger, monitoring and analytics. Keep only source identifiers, categories and server-computed rewards.
- Specify ownership checks, operator access procedures, retention/deletion, export behavior and browser-device privacy disclosures. Audit RLS with two accounts.
- Separate private encrypted content from activity metadata so server-side XH and aggregate routine counts never need to decrypt text.

Exit gate: reviewed threat model and negative telemetry/RLS tests.

## Phase 2 — device encryption prototype

- Use audited Web Crypto primitives with authenticated encryption (AES-GCM), fresh random nonces per write, explicit format/key versions and associated data binding user/record/field IDs.
- Generate content keys on the client. Store a protected device key using a platform-supported mechanism; putting raw keys alongside ciphertext in localStorage is not meaningful protection.
- Design unlock, screen lock, device logout and encrypted draft/outbox/export flows together. Do not send raw keys, recovery codes or passphrases to the server.
- Test tampering, wrong-account substitution, lost keys and offline editing. Obtain independent cryptographic review; do not invent a cipher.

Exit gate: independently reviewed prototype and documented residual XSS/device risks.

## Phase 3 — recovery and multiple devices

A key that never leaves one device makes another device unable to read the journal. Define an explicit user-consented pairing/recovery protocol: transfer encrypted key envelopes, use an offline recovery code or audited passphrase wrapping, and never store the unwrapped content key on the server. Explain that support cannot recover content without a user-held recovery secret. Include revocation, key rotation and lost-device workflows.

Exit gate: tested two-device pairing, recovery, revocation and failed-recovery UX.

## Phase 4 — opt-in migration

Read existing plaintext on an authenticated device, encrypt it there, upload idempotent versioned ciphertext, verify decryption before removing plaintext columns, and define backup retention. Give explicit consent and an export opportunity. Server search, AI analysis and cross-device editing need redesign; no hidden plaintext fallback. Do not destroy historical data until migration completeness is proven.

Exit gate: reversible migration in staging, independent verification, then a narrow opt-in pilot.

## Phase 5 — production rollout and ongoing review

Publish understandable privacy guarantees and limits, minimize key-carrying client code and third-party scripts, harden CSP, regression-test logs and encryption, conduct external security review, and stage rollout with recovery support. Announce E2E only after these guarantees are actually deployed and verified.
