# KYC Verification Flow

## Overview
The app uses **Didit.me** as a third-party identity verification provider. Verification is done **directly via image upload** — users upload their ID photos from inside the app and the backend calls Didit's API synchronously.

KYC is a **post-signup step**: users create their account first, then verify their identity from the profile screen.

## Flow

### 1. Account Creation (Web & Mobile)
- User fills out signup form: Full Name, Username, Email, Phone, Occupation, Country, City, Password
- Frontend calls `POST /api/user/bootstrap` (authenticated) — see [bootstrapUserAccount](frontend/src/services/api.ts) / [bootstrapUserAccountMobile](mobile/src/services/api.ts)
- Account is created; KYC status starts as `PENDING`
- User is redirected / navigated to `/profile/verify`

### 2. Identity Verification (`/profile/verify`)
- User uploads front and back photos of their National ID
- Frontend calls `POST /api/kyc/id/verify` with a `multipart/form-data` body containing `idFront` and `idBack` files
- Backend calls Didit's direct-check API with the uploaded images
- Didit returns a synchronous result (VERIFIED / FAILED / DECLINED)
- Backend updates Firestore: `users/{uid}` → `{ kycStatus: 'VERIFIED' | 'FAILED' }`
- Frontend shows the result immediately

### 3. Access Control
- A KYC gate checks the user's `kycStatus` field before allowing access to bookings, chat, and listings creation
- Users with `kycStatus === 'VERIFIED'` have full access
- Users with `kycStatus === 'FAILED'` can retry from `/profile/verify`
- Users with `kycStatus === 'PENDING'` are prompted to complete verification

## Backend Endpoint

### `POST /api/kyc/id/verify`
**Purpose:** Submit ID images for immediate Didit verification  
**Auth:** Required (Firebase ID token)  
**Content-Type:** `multipart/form-data`  
**Fields:** `idFront` (image file), `idBack` (image file)  
**Returns:** `{ status: 'VERIFIED' | 'FAILED' | 'DECLINED', message?: string }`  

**What it does:**
- Validates file types (JPEG/PNG) and sizes (max 10 MB each)
- Sends images to Didit's direct verification API
- Updates `users/{uid}.kycStatus` in Firestore
- Returns synchronous result

### `GET /api/kyc/status`
**Purpose:** Get the current KYC status for the authenticated user  
**Auth:** Required  
**Returns:** `{ result: { status: 'PENDING' | 'VERIFIED' | 'FAILED', fullName?: string, verifiedAt?: string } }`

### `POST /api/kyc/cancel`
**Purpose:** Reset a failed KYC attempt so the user can retry  
**Auth:** Required  
**Body:** `{}`  
**Returns:** `{ ok: boolean, status: string }`

## Required Environment Variables

### Backend
```env
DIDIT_API_KEY=your-api-key
DIDIT_WORKFLOW_ID=your-workflow-id
```

## Platform-Specific Details

### Web Frontend ([frontend/src/app/profile/verify/page.tsx](frontend/src/app/profile/verify/page.tsx))
- Uses `<input type="file">` (or drag-drop) to select ID images
- Validates client-side: JPEG/PNG only, max 10 MB
- Submits via `FormData` to `POST /api/kyc/id/verify`
- Shows real-time status from Firestore listener

### Mobile ([mobile/app/profile/verify/index.tsx](mobile/app/profile/verify/index.tsx))
- Uses `expo-image-picker` to select images from the camera roll
- Same file validation before upload
- Submits using `FormData` with `fetch`
- Shows result inline

## Hosted session and webhook flow

- `POST /api/didit/session` creates a hosted v3 session and stores
  `kycReferences/{sessionId}` for server-side ownership correlation.
- `DIDIT_CALLBACK_URL` (or `APP_URL + /kyc/done`) is the untrusted browser return
  destination. Query parameters on that page never establish verification.
- `POST /api/kyc/webhook` is the separate server-to-server status endpoint.
  It requires Didit's raw-body `X-Signature` HMAC, a fresh `X-Timestamp`, a
  known stored session, matching `vendor_data` when supplied, and an unused
  event ID. Invalid or duplicate deliveries cannot repeat a KYC state write.
- Direct authenticated document upload remains available at
  `POST /api/kyc/id/verify`.

The webhook destination itself is configured in the Didit console; it is not
sent as the hosted-session `callback` field.
