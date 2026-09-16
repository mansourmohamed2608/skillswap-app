# SkillSwap Cross-Platform Stability Audit

## 1. Executive summary

Audit branch: `fix/cross-platform-stability-audit`
Branch baseline: `87a35cd fix(frontend): real chat FAB collision avoidance for card content`

The repository contains three application boundaries: a Next.js responsive/desktop client, a Firebase Functions Nest backend, and an Expo Router native client. The tracked worktree was clean at audit start. `stash@{0}: On main: local files before Codex audit` remains untouched.

Confirmed high-impact defects were found in notification rendering/routing, KYC state replacement and transport, application error interpretation, native Firebase configuration, exchange-request authorization, media Storage rules, and deployment-rule drift. Code repairs and regression coverage have been added. Final command verification is recorded below; an item is not marked `PASS` merely because its code was inspected.

One product contradiction remains deliberately unresolved: historical/current documentation says a Free user receives one listing, while the authoritative backend and current pricing configuration require an active paid membership. This is **PRODUCT DECISION REQUIRED**. The audit did not weaken or change that business rule.

## 2. Repository architecture summary

- `frontend/`: Next.js 16 / React 19 web client. It serves desktop and responsive web, uses Firebase Auth/Firestore/Storage/Realtime Database, proxies application APIs through Next route handlers, and uses Vitest.
- `backend/`: TypeScript Firebase Functions API using Nest modules, Firebase Admin, Firestore and Realtime Database. It is authoritative for KYC, membership quotas, listings, requests, chat sends, matchmaking, reviews, payments, profile mutation, moderation, and notifications.
- `mobile/`: Expo 54 / React Native app using Expo Router and Firebase client SDKs. It calls the same backend application APIs and also reads Firebase client data.
- `backend/firestore.rules`, `backend/firestore.indexes.json`, `backend/storage.rules`, and `backend/database.rules.json` are now the canonical deploy definitions. `frontend/firebase.json` points to those files; stale frontend rule copies were removed.
- There is no shared workspace package. User, listing, category, KYC, membership, request, and notification contracts are duplicated across packages; this audit made incremental contract improvements without a monorepo rewrite.

## 3. Baseline failures

### BL-001 — package-local dependencies were absent/incomplete

- Frontend `npm run lint`: initially failed because the local ESLint executable was unavailable.
- Backend lint/test: initially failed because interrupted dependencies were missing files such as `esutils/lib/utils.js`, `bs-logger/dist/index.js`, and `exit/lib/exit`.
- Mobile `npm run typecheck` / `npm test`: initially failed because package-local dependencies such as `react-native`, `lucide-react-native`, and `date-fns` were unavailable.
- Cause: package trees were absent or partially installed. A first parallel install attempt also hit Windows `ENOTEMPTY`; installs were then serialized.
- Final post-repair results are listed in sections 16 and 17.

### BL-002 — runtime integration prerequisites

- Authenticated production Firebase records, provider-backed Didit verification, Firebase Storage deployment, and native device builds require external credentials/services.
- No secret values were printed or copied into this report.

## 4. Confirmed bugs and root causes

### AUD-001 — membership/free-plan/listing contradiction

Issue: Free-tier listing entitlement conflicts with paid-membership enforcement.
Severity: P1
Status: **PRODUCT DECISION REQUIRED**
Feature: Membership / listing creation
Observed behavior: Documentation says `Free -> 1 listing`; current backend rejects listing creation without an active membership. Web also preflights inactive membership to pricing.
Expected behavior: One authoritative, documented entitlement matrix shared by backend, desktop web, responsive web, and native mobile.
Reproduction: Compare `FINAL_COMPLETION_SUMMARY.md`, `INTEGRATION_AND_TESTING.md`, `backend/src/core/membership.ts`, current plan constants/pricing, web `NewListingForm`, and mobile membership hooks.
Root cause: Product rules drifted across documentation and implementation.
Backend affected: YES
Desktop Web affected: YES
Responsive Web affected: YES
Native Mobile affected: YES
API/contract involved: listing-create authorization.
Proposed fix: Product owner must choose either one free listing or paid-only creation; then update backend first and align both clients, plan copy, tests, and migration/counter behavior.
Regression test: Backend eligibility matrix plus web/mobile error-code interpretation.
Notes: Stable `MEMBERSHIP_REQUIRED` and `LISTING_LIMIT_REACHED` codes were added without choosing the entitlement rule.

### AUD-002 — notification profile route could fail or navigate away

Issue: Opening `/profile?tab=notifications` could hit unsafe record rendering and competing URL/tab state updates.
Severity: P0
Status: FIXED IN CODE; STATIC VERIFICATION PASS; AUTHENTICATED RUNTIME NOT VERIFIED
Feature: Notifications
Observed behavior: Reported client-side exception after using the notification bell; malformed timestamps or links could reach render-time utilities, and two effects could overwrite the requested tab.
Expected behavior: The notification tab remains selected and empty/malformed/error states never crash the app.
Root cause: tab state and URL were bidirectionally synchronized by competing effects; notification records were trusted by render code; snapshot failures had no UI state.
Backend affected: NO
Desktop Web affected: YES
Responsive Web affected: YES
Native Mobile affected: YES (malformed-record parity)
Files involved: web profile page, web/mobile notification lists, notification safety helpers.
Fix: URL-derived tab state, one tab-change writer, safe timestamp formatter, internal-link allow-list, defensive record mapping, fallback icon/type/content, snapshot error handling, and equivalent native defensive formatting.
Regression test: profile-tab normalization, malformed timestamp, unsafe link, and empty-input helpers.

### AUD-003 — KYC failure retained stale verified identity data

Issue: A failed/retried KYC attempt could display FAILED while old verified fields remained in the same document.
Severity: P0
Status: FIXED IN CODE; LIVE PROVIDER NOT VERIFIED
Feature: KYC
Root cause: KYC success/failure writes used Firestore merge semantics. Failure only updated the subdocument and could leave the root `users/{uid}.kyc` state or sensitive fields stale. Web also had no guaranteed same-origin KYC proxy and multipart proxying converted request bodies to text.
Backend affected: YES
Desktop Web affected: YES
Responsive Web affected: YES
Native Mobile affected: YES
Fix: canonical status normalization; replacement writes for current KYC attempt state; synchronized root status on pending/failure/cancel; raw document number/name/birth fields no longer persisted in the public current-status shape; verified name returned only for current VERIFIED state; already-verified resubmission guard; same-origin Next KYC proxy; binary multipart forwarding; recoverable load/retry states on web/native; KYC completion listener cleanup.
Regression test: provider-status variants, failed-state stale field removal, API base selection.
Remaining external dependency: Didit session/webhook behavior and a real authenticated upload must be verified in a configured environment.

### AUD-004 — listing/request/chat 403 responses were interpreted as subscription failures

Issue: Multiple clients treated arbitrary HTTP 403 responses as “go to pricing.”
Severity: P1
Status: PARTIAL FIX — critical listing/request/chat paths repaired
Root cause: backend exceptions frequently contained only human-readable text; several API wrappers consumed the response body manually and discarded machine-readable fields.
Fix: backend codes now distinguish KYC required/pending/failed, membership required, listing/booking/message quota, and listing creation failures. Web and mobile parsers retain top-level and Nest-nested codes. Listing, exchange-request, and chat send UI route only the relevant codes. Unknown forbidden errors remain visible instead of silently becoming subscription prompts.
Regression test: top-level and nested application-error parser tests; membership code tests.
Known limitation: older/less critical endpoints still contain message-only exceptions and are listed as contract debt rather than falsely marked complete.

### AUD-005 — exchange requests lacked self/duplicate protection

Issue: A user could request their own listing, and repeated active requests were not reserved server-side.
Severity: P1
Status: FIXED IN CODE
Feature: Connect / exchange requests
Root cause: `RequestsService.createRequest` validated listing existence, KYC, and membership, but not owner equality or an existing active request.
Backend affected: YES
Desktop/Responsive/Native affected: YES through the shared API
Fix: server-side `SELF_REQUEST_NOT_ALLOWED`; legacy active-request scan; transactionally reserved hashed `activeRequestGuards`; guard release for declined/cancelled/completed requests; stable `DUPLICATE_REQUEST`; canonical booking notification links.
Regression test: backend self-request ownership guard.
Notes: UI checks are not relied on for authorization.

### AUD-006 — authenticated home banner still said “Join Now”

Issue: Registration language was shown to authenticated users.
Severity: P2
Status: FIXED IN CODE
Fix: authenticated primary CTA is now “Post a Listing” and routes to `/listings/new`; signed-out behavior remains signup.
Regression test: authenticated and signed-out action selection.

### AUD-007 — category CTA label did not match destination

Issue: “View All Categories” routed to the generic listings browser.
Severity: P2
Status: FIXED IN CODE
Fix: the CTA now truthfully says “Browse All Listings” in English and Arabic while preserving the intended `/listings` route. Both current category section variants use one tested action contract.
Regression test: category browse destination/translation key.

### AUD-008 — category source-of-truth drift

Issue: Backend, homepage, listing form, native form, translations, and historical branch contain different category sets.
Severity: P2
Status: PARTIAL / PRODUCT SCOPE UNCLEAR
Observed behavior: homepage category links (14), web service categories (22), and the native hard-coded list can drift; the backend has no current canonical category API/module.
Historical relevance: `51c687b`, `9b7bd4c`, and `b43ad44` attempted expansion/centralization, but the “centralized” implementation still copied the list into frontend output and never established native runtime sharing.
Recommendation: define stable category IDs and a versioned read contract before migrating existing persisted strings. Do not silently port the historical labels because that changes product taxonomy and stored-data behavior.
Remaining decision: confirm the intended current taxonomy and whether categories are deploy-time constants or backend-managed data.

### AUD-009 — listing image validation/storage configuration gaps

Issue: Clients advertised a 5 MB image limit without enforcing it; native Storage bucket configuration was absent from EAS profiles; listing upload rules allowed arbitrary content/size.
Severity: P1
Status: FIXED IN CODE; LIVE STORAGE NOT VERIFIED
Fix: web/native type and 5 MB validation, correct native MIME metadata, owner-only public image rules with size/content checks, and native EAS Storage bucket values. Generic category artwork remains an intentional fallback only when no valid listing image is present or image rendering fails.
Regression test: web listing-image validation boundary/type tests.
Remaining dependency: deploy rules and perform authenticated web/native upload tests against the real bucket.

### AUD-010 — business logo upload was denied by Storage rules

Issue: Web/native uploaded to `business-logos/{uid}/...`, but current rules had no matching allow block.
Severity: P1
Status: FIXED IN CODE; LIVE STORAGE NOT VERIFIED
Fix: owner-only writes, public reads, 5 MB/image validation in the canonical rule set. Mobile EAS now includes the configured project bucket.
Historical relevance: behavior from `d9afc21`/`6fe862a` was still required and was ported with stricter validation.

### AUD-011 — frontend deploy could publish stale/weaker Firebase rules

Issue: Firebase rules were duplicated and divergent; frontend config referenced a missing `firestore.indexes.json`. Its Firestore copy allowed public `kyc_temp` reads and reads of removed/flagged records that backend rules restricted.
Severity: P0 SECURITY / DEPLOYMENT
Status: FIXED IN REPOSITORY; DEPLOYMENT NOT VERIFIED
Root cause: separate frontend/backend rule copies evolved independently.
Fix: backend rules/indexes are canonical; frontend deploy config references them; stale frontend rule copies were removed. Additional owner/type/size rules were added for listings, business logos, KYC images, event covers, and wish media.
Remaining dependency: validate Firebase CLI deployment in CI and deploy the canonical rules.

### AUD-012 — tracked backend credential environment file

Issue: `backend/.env.skillswap-69yxi` was tracked and contained populated credential variables.
Severity: P0 SECURITY
Status: REMOVED FROM TRACKING; ROTATION REQUIRED
Fix: the file is ignored and removed from Git tracking while the local ignored copy is preserved. No value was printed.
Remaining external dependency: rotate every credential that ever appeared in the file/history, then purge historical exposure only through an explicitly coordinated history-rewrite process. This audit did not rewrite shared history.

### AUD-013 — native Realtime Database used an implicit/wrong database endpoint

Issue: Mobile Firebase configuration omitted `databaseURL` even though chat/presence use Realtime Database in `europe-west1`.
Severity: P1
Status: FIXED IN CODE; DEVICE VERIFICATION PENDING
Fix: database URL is wired through the Firebase client, Expo config, environment sync, EAS profiles, README, and example environment. Emulator choice is explicitly copied/defaulted instead of being silently enabled.
Impact: native chat and presence now target the same regional RTDB as web.

### AUD-014 — auth context/profile redirect race

Issue: immediately after Firebase sign-in, a protected page could observe context user `null` and redirect back to sign-in.
Severity: P1
Status: FIXED IN CODE
Historical relevance: `880e8ec` waited on `auth.currentUser`, but the Firebase sign-in promise already provides that state and the real lag is React context propagation; `27da1b9` reverted that ineffective wait.
Fix: protected routes treat Firebase SDK signed-in/context-null as a synchronization state and redirect only when both sources are signed out. Applied to profile, create listing, and profile verification. Mobile initializes context from `auth.currentUser` and already avoids the same startup gap.
Regression test: SDK/context timing matrix.

### AUD-015 — business team-member authorization accepted arbitrary labels

Issue: backend authorization resolves a business team member by email, while native copy asked for names and backend accepted arbitrary strings.
Severity: P1
Status: PARTIAL FIX
Fix: backend now requires normalized valid email addresses; web/native copy consistently requests email addresses.
Historical relevance: `d9afc21` also blocked common personal-email domains. Whether domain-based “business email only” is still a product requirement is **UNCLEAR**, so that policy was not restored.
Regression test: arbitrary non-email team member is rejected server-side.

### AUD-016 — broken request-completion notification destination

Issue: completion notifications linked to `/requests/{id}`, but web has no such page; the canonical route is `/bookings/{publicId}`.
Severity: P1
Status: FIXED IN CODE
Fix: all current Nest request lifecycle notifications use canonical booking public IDs. The unused legacy `backend/src/requests.ts` still demonstrates older architecture and should be deleted only in a dedicated dead-code cleanup after confirming no external import.

### AUD-017 — wish/event upload paths had no Storage allow rules

Issue: current web code uploads event covers and wish image/video media to paths not matched by Storage rules.
Severity: P1
Status: FIXED IN CODE; LIVE STORAGE NOT VERIFIED
Fix: canonical rules now allow owner writes/public reads with 5 MB image and 25 MB video validation.

### AUD-018 — native Expo packages were incompatible with the configured SDK

Issue: The native app declared Expo SDK 54 while several native modules were pinned to versions from older SDK generations, and `app.config.ts` referenced `expo-build-properties` without declaring the package.
Severity: P1
Status: FIXED IN CODE; DEVICE BUILD NOT VERIFIED
Root cause: the Expo SDK and native-module versions had been upgraded independently.
Fix: installed the missing build-properties plugin, aligned all Expo packages to Expo 54's supported versions, registered the required localization config plugin, and validated the dependency set with `expo install --check`.
Regression check: native TypeScript, Expo dependency compatibility, Expo public-config generation, and Expo Doctor.

## 5. Backend fixes

- Normalized/sanitized current KYC state and replaced stale merged attempt data.
- Kept root and subdocument KYC statuses synchronized for pending/failure/cancel.
- Added stable listing, booking, messaging, membership, quota, and KYC error codes on critical paths.
- Enforced exchange self-request and active-duplicate prevention.
- Added canonical public booking links for lifecycle notifications.
- Validated business team-member emails server-side.
- Hardened and centralized Firebase deployment rules.

## 6. Desktop Web fixes

- Stable URL-driven profile tabs and defensive notification rendering.
- Recoverable notification/KYC loading failures.
- Correct KYC proxy base and binary multipart forwarding.
- Error-code-specific listing/request/chat behavior.
- Authenticated homepage CTA and truthful category CTA.
- Listing image file validation.
- Protected-route auth synchronization handling.

## 7. Responsive Web fixes

The same web components serve responsive viewports. Changes preserve the existing responsive tab grid, bottom navigation spacing, safe-area CSS, and recent chat-FAB collision-avoidance code. No major redesign or feature hiding was performed. Runtime viewport verification at 390x844 and 430x932 is recorded as NOT VERIFIED unless an executed browser run is listed below.

## 8. Native Mobile fixes

- Defensive notification records/timestamps.
- KYC status retry/error states and consistent failure navigation.
- Listing/request errors preserve machine-readable codes.
- Listing images validate type/size and retain MIME metadata.
- Team-member UI asks for emails.
- Storage bucket and regional Realtime Database URL are present in EAS profiles.
- Environment sync propagates database URL and explicit emulator state.
- Chat/listing flows route current KYC failures to verification.
- Expo packages now match the installed SDK 54 compatibility matrix, including required config plugins.

## 9. Historical branch findings

No backup commit was merged, rebased, or cherry-picked.

| Previous commit | Feature | Present in current code before audit | Still required | Conflict risk | Recommended action |
|---|---|---|---|---|---|
| `880e8ec` | Wait for Firebase auth before profile redirect | NO (reverted) | YES, differently | HIGH; waits on SDK state, not React context | Protect destinations using SDK + context state. Implemented. |
| `27da1b9` | Revert auth wait | YES | NO as a standalone feature | HIGH if earlier commit restored | Keep revert; use destination synchronization. Implemented. |
| `d9afc21` | Domain business emails + logo rules | PARTIAL | Logo/valid email YES; domain ban UNCLEAR | MEDIUM; domain ban can lock out users | Restore syntax enforcement and secure logo access only. Implemented. |
| `6fe862a` | Backend business-logo rule | NO | YES | LOW | Port with type/size validation. Implemented. |
| `1deb5ac` | `.appspot.com` bucket + explicit emulators | PARTIAL | Explicit flag YES; old hostname UNCLEAR | HIGH; wrong bucket risk | Keep current configured bucket; explicit emulator opt-in. Implemented except live validation. |
| `f56ecce` | Mobile EAS Storage bucket | NO | YES | MEDIUM; historical hostname differs | Add current project bucket to every EAS profile. Implemented. |
| `51c687b` | Expanded marketplace categories | PARTIAL | UNCLEAR | MEDIUM/HIGH; persisted taxonomy | Confirm taxonomy before porting. |
| `9b7bd4c` | Backend category constant exposed to web build | NO | Contract YES; exact coupling UNCLEAR | HIGH; no native sharing and build-path coupling | Prefer versioned API/IDs or deliberate shared package. |
| `b43ad44` | Portfolio/business profile + category corrections | PARTIAL/mostly replaced | Business profile YES | MEDIUM | Preserve current profile, repair logo/email, document presentation gap. Implemented. |

## 10. Cross-platform parity gaps resolved

- Notification records and invalid timestamps no longer assume perfect Firestore data on either client.
- Listing creation clients preserve backend KYC/membership/quota codes.
- Exchange requests and chat sends use the same critical KYC error semantics.
- Listing image limits and allowed media types are aligned between web, native, and Storage rules.
- Business team-member input is described as emails on both clients and enforced by backend.
- Native Storage and Realtime Database settings align with current web production configuration.

## 11. Remaining parity gaps

- Category definitions remain duplicated and require a taxonomy decision.
- Business profile display is richer on web than native (logo/description/custom categories presentation).
- Some non-critical API endpoints still use message-only forbidden errors.
- Responsive/browser and physical native-device flows require runtime verification with configured services.
- The native package has no independent unit-test runner; `npm test` aliases TypeScript checking.

## 12. Security findings

- P0: tracked credential environment file removed from tracking; credential rotation remains mandatory.
- P0: divergent deploy rules could expose `kyc_temp` and removed/flagged content; canonical backend rules now prevent frontend drift.
- P1: arbitrary public uploads on listing/business paths are now constrained to owner, MIME type, and size.
- P1: self and duplicate exchange requests are rejected by backend.
- Non-breaking audit updates removed all reported critical production advisories from Backend and Frontend. Remaining production audit counts are Backend 16 (3 high, 12 moderate, 1 low), Frontend 54 (7 high, 47 moderate), and Native 31 (3 critical, 11 high, 15 moderate, 2 low). Remaining Backend findings require breaking Nest/Nodemailer/Firebase Admin upgrades; Frontend findings are concentrated in Genkit/OpenTelemetry tooling; Native critical findings are transitive through Expo/Metro tooling and require a separately tested SDK/toolchain upgrade. No `--force` update was applied.
- Existing positive controls found: server-only listing writes, participant-only request reads, server-only KYC status writes, chat participant checks, block checks, self-message prevention, review ownership/duplicate checks, and admin-only moderation data.
- Do not treat Firebase web API keys as server secrets; actual provider/payment/webhook credentials must remain in Secret Manager/runtime env.

## 13. Environment/deployment findings

- Local ignored `frontend/.env.local` points at historical project `backdup-333cf`; production App Hosting/current fallback/EAS configuration points at `skillswap-69yxi`. The ignored local file was not committed or overwritten.
- Mobile previously lacked `EXPO_PUBLIC_FIREBASE_DATABASE_URL` and EAS Storage bucket values; repaired.
- Native dependencies were aligned to the Expo SDK 54 compatibility matrix; `expo-build-properties` and the localization config plugin are now declared.
- Frontend KYC now has a same-origin API route; explicit `NEXT_PUBLIC_API_BASE` remains supported.
- Emulator connections now require explicit `true` or `1`; production profiles set false.
- `.env.example` files now document frontend/native public configuration without real credentials.
- CI still names its Firebase service-account secret `FIREBASE_SERVICE_ACCOUNT_BACKDUP_333CF` even though deployment targets `skillswap-69yxi`. Renaming requires coordinated GitHub secret setup; it was not changed blindly.
- CI deploys Functions only; canonical Firestore/Storage/RTDB rules still need an explicit authenticated deployment step/process.

## 14. Profile/settings/chat information architecture findings

- The floating web chat control is unambiguously user-to-user messaging: it opens conversations and links to `/chat`; support remains a separate `/support` destination. Recent collision-avoidance behavior was preserved.
- Profile contains public identity/services/KYC/membership/notifications; edit profile changes identity/business fields; Settings remains application/account preferences. No evidence justified a major navigation redesign.
- Header, bottom-nav, direct listing actions, and public profile actions converge on current profile/chat routes. Runtime active-state and keyboard/safe-area checks remain part of viewport/device verification.

## 15. Tests added

- Frontend: profile tab URL normalization and query preservation.
- Frontend: malformed notification timestamp and unsafe link handling.
- Frontend: auth SDK/context redirect timing.
- Frontend: authenticated/signed-out homepage CTA and category browse destination.
- Frontend: listing image MIME/size validation.
- Frontend: KYC API base routing.
- Frontend: top-level and Nest-nested application error code parsing.
- Backend: KYC status normalization and stale sensitive-field removal.
- Backend: membership/listing/booking/message error codes.
- Backend: self-request ownership guard.
- Backend: business team member must be an email.

## 16. Tests executed

| Package | Command | Result |
|---|---|---|
| Frontend | `npm run lint` | PASS — 0 errors; 199 warnings |
| Frontend | `npm run typecheck` | PASS |
| Frontend | `npm test` | PASS — 15 files, 159 tests |
| Frontend | `npm run build` | PASS — Next.js 16.3.5, 34 routes |
| Backend | `npm run lint` | PASS — 0 errors; 604 warnings |
| Backend | `npm run typecheck` | PASS |
| Backend | `npm test -- --runInBand` | PASS — 8 suites, 141 tests |
| Backend | `npm run build` | PASS |
| Mobile | `npm test` (`npm run typecheck`) | PASS |
| Mobile | `npx expo install --check` | PASS — dependencies up to date for SDK 54 |
| Mobile | `npx expo config --type public --json` | PASS |
| Mobile | `npx expo-doctor` | PASS — 18/18 checks |
| Git | `git diff --check` | PASS — line-ending notices only |

## 17. Build results

- Backend: PASS (`tsc` production build).
- Frontend: PASS (Next.js 16.3.5 production build).
- Native: no store/device build script exists; TypeScript, Expo dependency compatibility, and public-config generation pass.
- Browser viewport runs (390x844, 430x932, 1440x900): NOT VERIFIED; no configured E2E script/server fixture is present in the clean branch.

## 18. Remaining external integration dependencies

- Rotate credentials from the formerly tracked backend environment file.
- Deploy and validate canonical Firebase rules/indexes.
- Verify authenticated Firebase Storage uploads for listings, business logos, KYC, wishes, and events.
- Exercise Didit success/failure/cancel/webhook flows with provider credentials.
- Exercise production Realtime Database chat/presence on a native device/EAS build.
- Run responsive/desktop authenticated browser smoke tests against a configured environment.

## 19. Remaining product-owner decisions

1. **Free listing contract:** one listing without paid membership, or paid-membership-only listing creation?
2. **Category taxonomy/source:** which stable IDs and labels are authoritative, and should the source be an API or shared package?
3. **Business email domains:** accept any valid email, or reject personal email providers as the historical branch did?

## 20. Known limitations

- Static/unit/build checks cannot prove external Firebase/Didit/payment availability.
- Production dependency audits still report advisories whose available fixes require major framework/toolchain upgrades; exact counts and ownership are recorded in Security findings.
- Existing persisted documents may contain historical KYC fields; current reads no longer expose them and new current-state writes replace them, but destructive bulk cleanup was intentionally not performed.
- `backend/src/requests.ts` is legacy message-string architecture not imported by the current Nest API. It was documented rather than deleted without a separate dead-code confirmation.
- No product rule, persisted category string, or shared Git history was rewritten to make tests pass.

## Feature matrix

| Feature | Backend | Desktop | Responsive Web | Native Mobile | Status |
|---|---|---|---|---|---|
| Auth | FIXED | FIXED | FIXED | PARTIAL | static checks pass; configured runtime pending |
| Profile | PARTIAL | PARTIAL | PARTIAL | PARTIAL | runtime not verified |
| Portfolio/business profile | FIXED | PARTIAL | PARTIAL | PARTIAL | presentation parity gap documented |
| Membership | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PRODUCT DECISION REQUIRED |
| Listings | FIXED | FIXED | FIXED | FIXED | static checks pass; live Storage runtime pending |
| Listing Images | FIXED | FIXED | FIXED | FIXED | live Storage NOT VERIFIED |
| Categories | NOT APPLICABLE | PARTIAL | PARTIAL | PARTIAL | taxonomy decision required |
| KYC | FIXED | FIXED | FIXED | FIXED | provider flow NOT VERIFIED |
| Connect/Requests | FIXED | FIXED | FIXED | FIXED | static checks pass; authenticated runtime pending |
| Matchmaking | PARTIAL | PARTIAL | PARTIAL | PARTIAL | inspected; runtime not verified |
| Chat | FIXED | PARTIAL | PARTIAL | FIXED | RTDB/device NOT VERIFIED |
| Notifications | FIXED | FIXED | FIXED | FIXED | authenticated runtime pending |
| Settings | NOT APPLICABLE | PARTIAL | PARTIAL | PARTIAL | runtime not verified |
| Reviews | FIXED | PARTIAL | PARTIAL | PARTIAL | inspected; runtime not verified |
