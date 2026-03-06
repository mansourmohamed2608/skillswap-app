# Mobile ↔ Frontend Parity Audit Report

> **Scope:** `mobile/app/admin/`, `mobile/app/auth/`, `mobile/app/legal/`, `mobile/app/pricing/`,  
> `mobile/app/offline/`, `mobile/app/(tabs)/`, `mobile/app/listings/`, `mobile/app/profile/`,  
> `mobile/src/i18n/en.json` vs `frontend/src/i18n/config.ts`
>
> **Methodology:** Every relevant file in both platforms was read in full and compared line-by-line.  
> **i18n note:** Frontend uses a nested TypeScript object (`config.ts`). Mobile uses a flat JSON
> (`en.json`). They are separate i18n systems — key names intentionally differ in convention.
> The gaps below flag only *missing functionality* and *keys absent from mobile en.json that the
> mobile screens need*.

---

## Severity Legend
| Level | Meaning |
|---|---|
| 🔴 CRITICAL | Security risk, legal exposure, or completely broken functionality |
| 🟠 HIGH | Feature present on web that is fully absent on mobile |
| 🟡 MEDIUM | Degraded UX, missing feedback, minor data gap |
| 🟢 LOW | Cosmetic or minor parity difference |

---

## Section 1 — Admin (`mobile/app/admin/index.tsx`)

### GAP-A01 🟠 HIGH — No per-section loading states
- **File:** [mobile/app/admin/index.tsx](mobile/app/admin/index.tsx)
- **Missing:** Frontend has four independent loading states (`usersLoading`, `auditLoading`, `analyticsLoading`, `reportsLoading`). Each section shows its own spinner. Mobile fires a single `Promise.allSettled` and shows one global loading indicator — if analytics is slow, the fast-loading user list is also blocked.
- **Fix:** Split the single load call into parallel section-scoped fetches with individual loading flags.

### GAP-A02 🟡 MEDIUM — Analytics items list never shown
- **File:** [mobile/app/admin/index.tsx](mobile/app/admin/index.tsx)
- **Missing:** Frontend `admin/page.tsx` renders a table of individual raw analytics events (`analyticsItems`). Mobile only shows the aggregate summary counts.
- **Fix:** Add an expandable raw events list inside the Analytics section, mirroring the frontend table.

### GAP-A03 🟡 MEDIUM — No error boundary / error screen
- **File:** `mobile/app/admin/` (directory)
- **Missing:** Frontend has `frontend/src/app/admin/error.tsx` with a full `RouteError` component. Mobile has no equivalent error boundary for the admin screen — an unhandled Firestore read failure leaves a blank screen.
- **Fix:** Wrap the admin screen in an `ErrorBoundary` component, and add a graceful "Failed to load" fallback UI.

### GAP-A04 🟡 MEDIUM — Missing i18n keys in mobile `en.json`
- **Keys present in frontend `config.ts` → `admin.*` but absent from mobile `en.json`:**
  - `admin.retryLoading` (frontend loads admin states with retry)
  - `admin.loadingUsers`, `admin.loadingAudit`, `admin.loadingAnalytics`, `admin.loadingReports` — frontend shows translated per-section loading labels
- **Fix:** Add these keys to `mobile/src/i18n/en.json` and `ar.json`.

---

## Section 2 — Auth (`mobile/app/auth/`)

### GAP-B01 🔴 CRITICAL — Missing Terms of Service link on signup
- **File:** [mobile/app/auth/signup.tsx](mobile/app/auth/signup.tsx)
- **Missing:** Frontend `auth/signup/page.tsx` renders a `<p>` beneath the form:  
  *"By signing up, you agree to our [Terms and Conditions]"* — using i18n keys `auth.signUp.termsPrefix` and `auth.signUp.termsLink`.  
  The mobile signup form has **no such link**. This is a legal requirement in most jurisdictions — users must be informed they are accepting terms at point of signup.
- **Fix:** Add a text row below the submit button linking to `/legal/terms`. Add i18n keys:
  ```json
  "auth.signUp.termsPrefix": "By signing up, you agree to our",
  "auth.signUp.termsLink": "Terms and Conditions"
  ```
  in both `en.json` and `ar.json`.

### GAP-B02 🟡 MEDIUM — "Remember Me" is UI-only (same gap exists on web)
- **File:** [mobile/app/auth/signin.tsx](mobile/app/auth/signin.tsx)
- **Missing:** The "Remember Me" checkbox renders fine but no `setPersistence` call is made to Firebase Auth to use `browserLocalPersistence` vs `browserSessionPersistence`. This is the same in the frontend.
- **Fix:** Shared fix for both platforms — call `setPersistence` based on the checkbox value.

### GAP-B03 🟢 LOW — No background hero image on signin/forgot-password
- **File:** [mobile/app/auth/signin.tsx](mobile/app/auth/signin.tsx), [mobile/app/auth/forgot-password.tsx](mobile/app/auth/forgot-password.tsx)
- **Missing:** Frontend renders a subtle full-page abstract background image (`opacity-5`). Mobile screens have a plain background.
- **Fix:** Add a background `ImageBackground` component with low opacity on auth screens. Use `t('auth.backgroundAlt')` for accessibility.

### GAP-B04 🟡 MEDIUM — Missing i18n keys for signup errors
- **Keys in frontend `auth.signUp.errors.*` but absent from mobile `en.json`:**
  - `auth.signUp.errors.latinName` — "Please enter your name using English letters only."
  - `auth.signUp.errors.phoneInUse` — "This phone number is already in use."
  - `auth.signUp.errors.phoneInvalid` — "Enter a valid phone number."
  - `auth.signUp.errors.sessionFailed` — "Failed to create verification session"
- Mobile signup uses raw English fallback strings for these. Add them to `en.json` and `ar.json`.

---

## Section 3 — Legal (`mobile/app/legal/`)

### GAP-C01 🟢 LOW — Legal pages are fully at parity for content
- **Files:** [mobile/app/legal/terms.tsx](mobile/app/legal/terms.tsx), [privacy.tsx](mobile/app/legal/privacy.tsx), [refund.tsx](mobile/app/legal/refund.tsx), [community.tsx](mobile/app/legal/community.tsx)
- Both mobile and frontend use `t('legal.*', { returnObjects: true })`. The `legal.*` object keys **are present** in `mobile/src/i18n/en.json` (lines 740+) matching the frontend. **Content parity is complete.**

### GAP-C02 🟢 LOW — No cross-links between legal pages
- **Missing:** No "See also: Privacy Policy" or "Back to Home" link at the bottom of mobile legal pages. Frontend legal pages similarly just render content but have header navigation.
- **Fix:** Add a bottom row with navigation links to the other legal pages and a home button.

---

## Section 4 — Pricing (`mobile/app/pricing/index.tsx`)

### GAP-D01 🟠 HIGH — Plan titles and descriptions are hardcoded in screen (i18n keys exist but unused)
- **File:** [mobile/app/pricing/index.tsx](mobile/app/pricing/index.tsx)
- **Missing:** The `pricingData` array inside the component has literal strings:
  ```typescript
  { id: 'basic', title: 'Basic Plan', desc: 'Perfect for starters', ... }
  ```
  The mobile `en.json` **does** have `pricing.plan.basic.title` and `pricing.plan.basic.desc` keys, but the screen ignores them. On Arabic device, plan names will still show English. Frontend uses `t('pricing.planTitles.basic')` (different key path but same concept).
- **Fix:** Replace hardcoded title/desc in the `pricingData` array with `t('pricing.plan.basic.title')` etc. This is a one-time fix for 4 plans.

### GAP-D02 🟠 HIGH — "Subscription required" redirect flow missing
- **File:** [mobile/app/pricing/index.tsx](mobile/app/pricing/index.tsx)
- **Missing:** Frontend `pricing/page.tsx` reads a `?sub-required=1` URL param and shows a toast: *"Please choose a plan to continue."* This communicates to the user why they were redirected to pricing. Mobile has no equivalent — users land on pricing with no context.
- **Fix:** Check `router` params on mount, show an `Alert.alert` or banner with `t('pricing.subRequiredTitle')` / `t('pricing.subRequiredBody')` if the param is present.

### GAP-D03 🟠 HIGH — `waitAuth` and `mustSignIn` guards missing
- **File:** [mobile/app/pricing/index.tsx](mobile/app/pricing/index.tsx)
- **Missing:** Frontend shows distinct toasts when:
  1. Auth state is not yet loaded → `pricing.waitAuth` toast
  2. User is not signed in → `pricing.mustSignIn` toast  
  Mobile calls the checkout endpoint regardless of auth state, resulting in a backend 401 error surfaced as a generic payment failure Alert.
- **Fix:** Add auth state checks before calling the checkout endpoint, with proper i18n feedback.

### GAP-D04 🟡 MEDIUM — Duration labels and period labels not translated
- **File:** [mobile/app/pricing/index.tsx](mobile/app/pricing/index.tsx)
- **Missing i18n keys in mobile `en.json`:**
  ```
  pricing.currency     — "Currency"
  pricing.duration     — "Duration"
  pricing.dur3mo       — "3 mo"
  pricing.dur6mo       — "6 mo"
  pricing.dur12mo      — "12 mo"
  pricing.per3mo       — "/3 months"
  pricing.per6mo       — "/6 months"
  pricing.perYear      — "/year"
  pricing.subRequiredTitle  — "Subscription Plan Needed"
  pricing.subRequiredBody   — "Please choose a plan to continue."
  pricing.waitAuth          — "Checking your login status..."
  pricing.mustSignIn        — "You must be signed in to choose a plan."
  pricing.checkoutPreparingTitle — "Preparing checkout"
  pricing.checkoutPreparingBody  — "Starting {{plan}} for {{duration}}."
  pricing.durationAdjustedTitle  — "Duration updated"
  pricing.durationAdjustedBody   — "{{plan}} is currently available for {{duration}} only."
  ```
- **Fix:** Add all of the above to `en.json` and `ar.json`.

### GAP-D05 🟡 MEDIUM — `checkout preparing` loading toast absent
- **File:** [mobile/app/pricing/index.tsx](mobile/app/pricing/index.tsx)
- **Missing:** Frontend shows a toast "Preparing checkout — Starting Basic for 3 months." while the checkout URL is being fetched. Mobile goes straight from button tap to `Linking.openURL()` or an error, with no intermediate feedback.
- **Fix:** Show an `ActivityIndicator` state and an informational Alert before URL redirect.

---

## Section 5 — Offline (`mobile/app/offline/index.tsx`)

### ✅ FULL PARITY — No gaps
Both platforms use identical i18n keys (`offline.title`, `offline.bodyLine1`, `offline.bodyLine2`, `offline.cached`, `offline.goHome`) and equivalent layouts.

---

## Section 6 — Tab Layout (`mobile/app/(tabs)/_layout.tsx`)

### GAP-F01 🟡 MEDIUM — No persistent bottom navigation affordance
- **File:** [mobile/app/(tabs)/_layout.tsx](mobile/app/(tabs)/_layout.tsx)
- The tab bar is intentionally hidden (`tabBarStyle: { display: 'none' }`). Navigation is purely through the header burger menu. This is a deliberate design decision, but it means mobile users have no standard persistent navigation cue. On web, the header nav bar is always visible.
- **Fix (optional):** Consider showing a minimal bottom tab bar with icons-only (no labels) for Home / Listings / Profile, or at minimum ensure the burger menu icon is always prominent.

---

## Section 7 — Listings (`mobile/app/(tabs)/listings/`)

### GAP-G01 🟠 HIGH — No category filter chips
- **File:** [mobile/app/(tabs)/listings/index.tsx](mobile/app/(tabs)/listings/index.tsx)
- **Missing:** Frontend `ServicesHeaderAndFilters` renders a row of category pill/chip buttons (Graphic Design, Web Development, Tutoring, etc.) allowing one-tap category filtering. Mobile has only a free-text search `TextInput` — no category browsing.
- **Fix:** Add a horizontally scrollable row of `TouchableOpacity` chip filters above the FlatList, using the `listings.categories.*` i18n keys.

### GAP-G02 🟠 HIGH — No status filter (Open / Completed / All)
- **File:** [mobile/app/(tabs)/listings/index.tsx](mobile/app/(tabs)/listings/index.tsx)
- **Missing:** Frontend has a toggle to filter listings by status (open / completed). The i18n keys `listings.filter_open`, `listings.filter_completed`, `listings.filter_all` **are present in mobile en.json** but are never used in the listings screen.
- **Fix:** Add a 3-segment control above the list that applies a `status` filter to the query.

### GAP-G03 🟠 HIGH — Listing creation category is a plain TextInput
- **File:** [mobile/app/(tabs)/listings/new.tsx](mobile/app/(tabs)/listings/new.tsx)
- **Missing:** Frontend `listings/form` uses a `<Select>` dropdown populated with `listings.categories.*` values. Mobile has a plain `TextInput` for category — users must type a category slug exactly, inviting typos and inconsistent data.
- **Fix:** Replace the category `TextInput` with a `Picker` or a modal-based list populated from the categories in `en.json`. Add `listings.categoryPlaceholder` to `en.json`:
  ```json
  "listings.categoryPlaceholder": "Select a category..."
  ```

### GAP-G04 🟡 MEDIUM — No location error granularity on new listing
- **File:** [mobile/app/(tabs)/listings/new.tsx](mobile/app/(tabs)/listings/new.tsx)
- **Missing i18n keys** (frontend `listings.form.*` location keys absent from mobile `en.json`):
  ```
  listings.form.locationUnsupported
  listings.form.locationReadFailed
  listings.form.locationPermissionDenied
  listings.form.locationUnavailable
  listings.form.locationTimeout
  listings.form.locationUnknownError
  listings.form.locationCapturedWithAddress   — "GPS location selected: {{location}}"
  ```
  Mobile shows a single generic Alert on any geo error; frontend shows contextual messages per error code.
- **Fix:** Map Expo Location error codes to distinct i18n keys and add them to `en.json`.

### GAP-G05 🟡 MEDIUM — No post-create navigation to new listing
- **File:** [mobile/app/(tabs)/listings/new.tsx](mobile/app/(tabs)/listings/new.tsx)
- **Missing:** After a successful create, mobile shows `Alert.alert` with the new listing's ID then stays on the form. Frontend redirects to the new listing's detail page. Users on mobile have no quick way to view what they just created.
- **Fix:** Navigate to `/listings/[id]` after a successful create.

### GAP-G06 🟡 MEDIUM — Missing listing form i18n keys
- **Keys in frontend `listings.form.*` absent from mobile `en.json`:**
  ```
  listings.form.offerSection        — "Service You Offer"
  listings.form.requestSection      — "Service You Want in Exchange"
  listings.form.offerTitlePlaceholder
  listings.form.requestTitlePlaceholder
  listings.form.offerDescriptionPlaceholder
  listings.form.requestDescriptionPlaceholder
  listings.form.exchangeTypeLabel
  listings.form.exchangeTypePlaceholder
  listings.form.exchangeTypeService / exchangeTypeProduct / exchangeTypeMoney
  listings.form.requestedProductNameLabel / requestedProductNamePlaceholder
  listings.form.requestedProductDetailsLabel / requestedProductDetailsPlaceholder
  listings.form.requestedAmountLabel / requestedAmountPlaceholder
  listings.form.requestedCurrencyLabel / requestedCurrencyPlaceholder
  listings.form.imageFormatsHint    — "JPG, PNG, or WEBP. Max 5MB."
  listings.form.completeOfferedDetails
  listings.form.completeRequestedServiceDetails
  listings.form.requestedProductNameRequired
  listings.form.requestedAmountInvalid
  listings.form.requestedCurrencyRequired
  listings.form.locationRequired
  listings.new.authRequiredTitle / authRequiredDescription / authRequiredRedirect / authRequiredButton
  ```

---

## Section 8 — Profile (`mobile/app/(tabs)/profile/`)

### GAP-H01 🔴 CRITICAL — Notifications never marked as read
- **File:** [mobile/app/(tabs)/profile/index.tsx](mobile/app/(tabs)/profile/index.tsx)
- **Missing:** Frontend `profile/page.tsx` calls `markNotificationsRead(unreadIds)` (line 170) whenever the user switches to the Notifications tab. This fires a `PATCH /users/me/notifications/read` API request that sets `isRead: true` in the database.  
  Mobile loads notifications via `onSnapshot` and displays them correctly, but **never calls any read-marking endpoint**. Notification badges will never clear, and the backend `isRead` field stays false indefinitely.
- **Fix:** Add `markNotificationsRead` to mobile's `services/api.ts` (or a new `notifications.ts` service) and call it when the notifications tab is selected, mirroring the frontend pattern.

### GAP-H02 🟠 HIGH — KYC retry on profile navigates to verify screen only (no new session)
- **File:** [mobile/app/(tabs)/profile/index.tsx](mobile/app/(tabs)/profile/index.tsx)
- **Present on mobile:** A "Retry Verification" button is shown for `FAILED / DECLINED / CANCELLED` statuses.  
- **Gap:** The button only calls `router.push('/profile/verify')`. It does NOT start a new KYC session (call backend `POST /kyc/start`). Frontend's `retryKyc()` function calls the backend to create a new Didit session URL and redirects to it. On mobile, the user lands on the verify form but there is no active session — any submission will fail silently.
- **Fix:** Create a `retryKyc()` service function in mobile that calls the backend start endpoint (same as the one in `frontend/src/services/api.ts`), obtains the redirect URL, and opens it with `Linking.openURL`. Show loading state with `t('profile.kyc.retryLoading')`.

### GAP-H03 🔴 CRITICAL — KYC verify screen accepts any file type and any file size
- **File:** [mobile/app/(tabs)/profile/verify.tsx](mobile/app/(tabs)/profile/verify.tsx)
- **Missing vs `frontend/src/app/profile/verify/page.tsx`:**
  1. **File type validation:** Frontend validates `['image/jpeg','image/jpg','image/png','image/webp','application/pdf']` and rejects anything else. Mobile uses `ImagePicker` with no MIME type check.
  2. **File size check:** Frontend rejects files > 5 MB with a clear error. Mobile has no size limit — users can upload 50 MB images, causing backend timeouts or silent failures.
- **Fix:**
  ```typescript
  // After ImagePicker result:
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  if ((info as any).size > 5 * 1024 * 1024) {
    Alert.alert(t('profile.verify.fileTooLargeTitle'), t('profile.verify.fileTooLargeBody'));
    return;
  }
  ```

### GAP-H04 🟡 MEDIUM — Verify screen does not show `documentNumber`
- **File:** [mobile/app/(tabs)/profile/verify.tsx](mobile/app/(tabs)/profile/verify.tsx)
- **Missing:** Frontend shows `Document No.: {{number}}` when KYC status is VERIFIED. Mobile only shows `verifiedName`. The document number is useful for users to confirm which ID was verified.
- **Fix:** Read `status.documentNumber` from the KYC status and display it when status is VERIFIED.

### GAP-H05 🔴 CRITICAL — All `profile.verify.*` i18n keys absent from mobile `en.json`
- **File:** [mobile/src/i18n/en.json](mobile/src/i18n/en.json)
- The verify screen uses hardcoded English strings / raw Alert calls. None of the `profile.verify.*` keys from the frontend exist in mobile `en.json`. On Arabic locale, every message on the verify screen will appear in English.
- **Missing keys (add to both `en.json` and `ar.json`):**
  ```
  profile.verify.title
  profile.verify.currentStatus
  profile.verify.verifiedAs            — "Verified as: {{name}}"
  profile.verify.documentNumber        — "Document No.: {{number}}"
  profile.verify.fullNameLabel
  profile.verify.nationalIdLabel
  profile.verify.nationalIdPlaceholder
  profile.verify.uploadFront
  profile.verify.uploadBack
  profile.verify.frontPreviewAlt
  profile.verify.backPreviewAlt
  profile.verify.uploadHint
  profile.verify.uploadRule1
  profile.verify.uploadRule2
  profile.verify.uploadRule3           — "Accepted formats: JPG, PNG, WEBP, PDF (max 5MB each)"
  profile.verify.submit
  profile.verify.submitting
  profile.verify.invalidName
  profile.verify.fileTooLargeTitle
  profile.verify.fileTooLargeBody
  profile.verify.invalidFileTypeTitle
  profile.verify.invalidFileTypeBody
  profile.verify.missingFilesTitle
  profile.verify.missingFilesBody
  profile.verify.successTitle
  profile.verify.successBody
  profile.verify.failedTitle
  profile.verify.failedBody
  profile.verify.inReviewTitle
  profile.verify.inReviewBody
  profile.verify.errorTitle
  profile.verify.errorBody
  profile.verify.pendingBody
  profile.verify.backToProfile
  profile.verify.verifiedBody
  profile.verify.status.verified
  profile.verify.status.failed
  profile.verify.status.pending
  profile.verify.status.in_review
  ```

### GAP-H06 🟠 HIGH — Profile edit: no interactive cover photo crop
- **File:** [mobile/app/(tabs)/profile/edit/index.tsx](mobile/app/(tabs)/profile/edit/index.tsx)
- **Missing:** Frontend uses `CoverCropperDialog` (a lazy-loaded modal with pan/zoom) to let users position their cover photo before upload. Mobile does a blind `ImageManipulator.manipulateAsync(resize: 1600×400)` — the image is resized but never cropped interactively. Users lose the ability to choose which part of their photo to use.
- **Fix:** Integrate a React Native crop library (e.g., `react-native-image-crop-picker` or `expo-image-manipulator` with a custom crop preview) for cover photo selection. Add `profile.cropper.*` keys to mobile `en.json`:
  ```
  profile.cropper.title    — "Adjust cover photo"
  profile.cropper.zoom     — "Zoom"
  profile.cropper.cancel   — "Cancel"
  profile.cropper.save     — "Save Crop"
  ```

### GAP-H07 🟡 MEDIUM — Profile edit: no inline location hint with tone
- **File:** [mobile/app/(tabs)/profile/edit/index.tsx](mobile/app/(tabs)/profile/edit/index.tsx)
- **Missing:** Frontend shows an inline `<p>` below the location field with colour-coded tone (neutral = grey, warning = amber, success = green). Mobile shows an `Alert.alert` on geo failure, with no passive hint text.
- **Missing i18n keys** for mobile `en.json`:
  ```
  profile.edit.locationUnsupported
  profile.edit.locationUnavailable
  profile.edit.locationTimeout
  profile.edit.locationUnknownError
  profile.edit.locationCaptured        — "GPS location selected"
  profile.edit.locationCapturedWithAddress — "GPS location selected: {{location}}"
  profile.edit.locationPermissionDenied
  profile.edit.locationReadFailed
  ```
- **Fix:** Add a `<Text>` component below the location field that displays the current geo hint. Map Expo Location error codes to the appropriate i18n key.

### GAP-H08 🟡 MEDIUM — Profile edit: missing error-state i18n keys
- **Keys in frontend `profile.edit.*` absent from mobile `en.json`:**
  ```
  profile.edit.errorLoad           — "Failed to load profile"
  profile.edit.errorNotSignedIn    — "You must be signed in to edit your profile."
  profile.edit.errorMissingPasswordFields
  profile.edit.errorPasswordMismatch
  profile.edit.errorUpdateFailed
  profile.edit.usernameHelp        — "This name is used when sharing your profile (must be unique)."
  profile.edit.coverHelp           — "Recommended size: 1600×400 (4:1). After selecting, you can crop it."
  profile.edit.cancelPasswordChange
  profile.edit.changePassword
  ```

### GAP-H09 🟡 MEDIUM — Profile: notification tab uses fallback strings
- **File:** [mobile/app/(tabs)/profile/index.tsx](mobile/app/(tabs)/profile/index.tsx)
- The Notifications tab renders with `t('profile.active_listings') || 'Active Listings'` — the `||` fallbacks mean missing key warnings are silently swallowed. The following keys are used with fallbacks but should be proper entries in `en.json`:
  ```
  profile.active_listings      — "Active Listings"
  profile.no_active            — "No active listings"
  profile.past_exchanges       — "Past Exchanges"
  profile.no_past              — "No completed exchanges yet"
  profile.reviews_about        — "Reviews About You"
  profile.no_reviews           — "No reviews yet"
  profile.your_notifications   — "Your Notifications"
  ```
  Frontend uses `profile.tabs.activeListings`, `profile.yourActiveListings`, etc. — the naming convention differs, which is acceptable, but the mobile keys must exist in `en.json`.

### GAP-H10 🟢 LOW — Profile: KYC status not normalised
- **File:** [mobile/app/(tabs)/profile/index.tsx](mobile/app/(tabs)/profile/index.tsx)
- Mobile reads raw `data?.status` from Firestore (`'APPROVED'`, `'DECLINED'`, `'IN_REVIEW'`, etc.). Frontend has a `normalizeKycStatus()` helper that maps all status variants (e.g., `'APPROVED'` → `'VERIFIED'`) to a canonical set. If the KYC provider changes a status string, mobile will silently show the wrong badge.
- **Fix:** Extract a `normalizeKycStatus(raw: string): string` utility in `mobile/src/lib/` matching the frontend implementation.

### GAP-H11 🟢 LOW — Public profile: tab state not URL-synced
- **File:** [mobile/app/(tabs)/profile/index.tsx](mobile/app/(tabs)/profile/index.tsx)
- Frontend syncs the active tab to `?tab=` query param, enabling deep-linking. Mobile does not persist tab selection at all — back navigation from a sub-screen always returns to the first tab.
- **Fix:** Use `router.setParams({ tab: selectedTab })` and read it on mount.

---

## Section 9 — i18n Global Gaps

### Summary of i18n naming convention
| Platform | Format | Example |
|---|---|---|
| Mobile (`en.json`) | flat snake_case | `"admin.access_denied"` |
| Frontend (`config.ts`) | nested camelCase object | `admin: { accessDenied: "..." }` |

These are **deliberately different systems** — keys do not need to match across platforms. The gaps below are keys that mobile **screens actually call** (or should call) but that are **missing from mobile `en.json`**.

### GAP-I01 🔴 CRITICAL — `profile.verify.*` entirely missing (see GAP-H05 above)
35 keys absent. The verify screen renders hardcoded English strings even in Arabic locale.

### GAP-I02 🔴 CRITICAL — `auth.signUp.termsPrefix` / `auth.signUp.termsLink` missing (see GAP-B01)

### GAP-I03 🟠 HIGH — `pricing.*` keys missing
16 keys absent from mobile `en.json` (see GAP-D04 above). Pricing UI labels, duration toggles, and error messages will fall back to undefined/blank in Arabic locale.

### GAP-I04 🟠 HIGH — `profile.cropper.*` missing (see GAP-H06)
4 keys needed for a future cover crop implementation.

### GAP-I05 🟠 HIGH — `profile.edit.*` location + error keys missing (see GAP-H07, GAP-H08)
~15 keys absent. Location feedback on profile edit is entirely un-translated.

### GAP-I06 🟡 MEDIUM — `listings.form.*` missing keys (see GAP-G06)
~25+ form field label and validation keys absent from mobile `en.json`.

### GAP-I07 🟡 MEDIUM — `listings.categoryPlaceholder` missing
Used in `(tabs)/listings/new.tsx` but absent from `en.json`. Shows blank in category input placeholder.

### GAP-I08 🟡 MEDIUM — `errorPage.*` entirely missing
Frontend `errorPage.loadFailed`, `errorPage.title`, `errorPage.tryAgain`, `errorPage.goHome`, `errorPage.errorPrefix` have no mobile equivalents. Mobile error states use raw English strings.

### GAP-I09 🟡 MEDIUM — `profile.kyc.retryLoading` / `profile.kyc.startFailed` / `profile.kyc.viewStatus` missing
Mobile has `profile.kyc.retry` and `profile.kyc.cancel` but is missing loading/failure state keys that the frontend uses:
```
profile.kyc.retryLoading   — "Starting…"
profile.kyc.startFailed    — "Failed to start verification"
profile.kyc.viewStatus     — "View status page"
```

### GAP-I10 🟡 MEDIUM — `auth.signUp.errors.*` is partially missing (see GAP-B04)

### GAP-I11 🟢 LOW — `admin.loadingUsers` / `admin.loadingAudit` / etc. missing (see GAP-A04)

---

## Carry-Over Gaps (from prior audit session)

These were identified in the previous session but not yet fixed:

| ID | Severity | File | Description |
|---|---|---|---|
| PREV-01 | 🟠 HIGH | [mobile/app/(tabs)/listings/index.tsx](mobile/app/(tabs)/listings/index.tsx) | Missing `listings.filter_open` / `filter_completed` filter UI (keys exist, never used) |
| PREV-02 | 🟠 HIGH | Chat screens | `chat.list.emptyTitle`, `chat.list.emptyBody`, `chat.list.conversationFallback`, `chat.list.newChat` keys missing from `en.json` |
| PREV-03 | 🟠 HIGH | Chat screens | `chat.detail.online`, `chat.detail.offline`, `chat.detail.unavailable` keys missing |
| PREV-04 | 🟡 MEDIUM | Wishes | `wishes.notFound`, `wishes.loadFailed` keys missing |
| PREV-05 | 🟡 MEDIUM | Matchmaking | `matchmaking.panel.noLiveMatchesDesc` wording differs |
| PREV-06 | 🟡 MEDIUM | Home | Mobile uses `getWishes` for community section; frontend uses `getFeaturedWishes` |

---

## Prioritised Fix Order

```
Priority 1 (Legal + Security — do these first):
  GAP-B01  Terms of Service link on signup
  GAP-H01  markNotificationsRead never called
  GAP-H03  KYC verify: no file type/size validation
  GAP-H05  All profile.verify.* i18n keys absent

Priority 2 (Core feature gaps):
  GAP-H02  KYC retry doesn't start a new session
  GAP-G01  No category filter chips on listings browse
  GAP-G02  No status filter on listings browse
  GAP-G03  Category field is plain text on new listing
  GAP-D01  Pricing plan titles hardcoded (i18n keys exist)
  GAP-D02  subRequired redirect flow missing

Priority 3 (UX quality):
  GAP-D03  waitAuth / mustSignIn guards
  GAP-G05  Post-create navigation to new listing
  GAP-H06  Interactive cover photo crop
  GAP-H07  Inline location hint on profile edit
  GAP-A01  Per-section loading states in admin

Priority 4 (i18n completeness):
  GAP-I03  pricing.* 16 keys
  GAP-I05/I06  profile.edit + listings.form keys
  GAP-D04  Duration/period label keys
  All remaining PREV-* carry-overs

Priority 5 (Polish):
  GAP-B03  Background image on auth screens
  GAP-C02  Cross-links on legal pages
  GAP-H10  KYC status normalisation
  GAP-H11  Profile tab URL sync
  GAP-F01  Bottom nav affordance consideration
```

---

*Report generated by full file-by-file read of all listed areas. Last read: `frontend/src/i18n/config.ts` (complete), `mobile/src/i18n/en.json` (complete).*
