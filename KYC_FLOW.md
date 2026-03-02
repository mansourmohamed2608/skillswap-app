# KYC Verification Flow

## Overview
The app uses **Didit.me** as a third-party identity verification provider. All verification happens **externally on Didit's platform**, not within our app.

## Correct Flow

### Web App (Frontend)

1. **User Signs Up** ([SignUpForm.tsx](frontend/src/features/auth/components/SignUpForm.tsx#L128-L146))
   - User fills out signup form
   - Frontend calls `POST /api/didit/session` with `{ vendor: uid }`
   - Backend creates Didit session and returns `{ url: "https://verify.didit.me/..." }`
   - Frontend **redirects user to Didit's external verification page**

2. **User Verifies on Didit.me**
   - User completes identity verification on Didit's platform
   - Uploads ID documents, takes selfie, etc. **on Didit's site**
   - Didit processes verification (AI checks authenticity)

3. **Didit Sends Webhook** ([kyc.ts](backend/src/core/kyc.ts#L191-L250))
   - Didit calls `/api/kyc/webhook` with verification result
   - Backend validates webhook signature
   - Backend updates Firestore: `users/{uid}/kyc/status` → `{ status: 'VERIFIED' }` or `{ status: 'FAILED' }`

4. **User Returns to App**
   - Didit redirects to `/kyc/done?verificationSessionId=xxx`
   - Page listens to Firestore for status updates ([kyc/done/page.tsx](frontend/src/app/kyc/done/page.tsx))
   - Shows real-time verification status

### Alternative: Manual Verification Page

If user navigates to `/profile/verify` directly:
- Page checks current KYC status
- If not verified, shows "Start Verification" button
- Clicking button creates new Didit session and redirects to Didit

## Backend Endpoints

### `POST /api/didit/session`
**Purpose:** Create a new Didit verification session  
**Handler:** [DiditSessionController](backend/src/nest/kyc/didit-session.controller.ts)  
**Body:** `{ vendor?: string }`  
**Returns:** `{ session_id: string, url: string }`  

**What it does:**
- Calls Didit API to create verification session
- Stores session reference in Firestore: `kycReferences/{session_id}`
- Returns Didit verification URL for redirect

### `POST /api/kyc/webhook`
**Purpose:** Receive verification results from Didit  
**Handler:** [KycController](backend/src/nest/kyc/kyc.controller.ts)  
**Body:** Didit webhook payload (raw buffer)  
**Headers:** `x-didit-signature` for HMAC validation  

**What it does:**
- Validates webhook signature with `DIDIT_WEBHOOK_SECRET`
- Extracts verification result (VERIFIED/FAILED/DECLINED)
- Updates Firestore with final status
- User can't access app until status is VERIFIED

### `GET /api/kyc/status`
**Purpose:** Get current verification status  
**Query:** `?vendor={vendor}` (for pre-signup) or auth token  
**Returns:** `{ result: { status: 'PENDING' | 'VERIFIED' | 'FAILED', ... } }`

### `GET /api/kyc/sync`
**Purpose:** One-shot sync if webhook didn't arrive  
**Query:** `?sessionId={sessionId}&uid={uid}`  
**What it does:** Manually fetches decision from Didit and updates Firestore

## Required Environment Variables

### Backend
```env
DIDIT_API_KEY=your-api-key
DIDIT_WORKFLOW_ID=your-workflow-id
DIDIT_WEBHOOK_SECRET=your-webhook-secret
DIDIT_CALLBACK_URL=https://your-domain.com/api/kyc/webhook
DIDIT_BASE_URL=https://verification.didit.me
```

### Frontend
```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8765
```

## Security Features

1. **Webhook Signature Validation**
   - All webhooks are validated using HMAC-SHA256
   - Prevents fake verification results
   - Implementation: [handleDiditWebhook](backend/src/core/kyc.ts#L191)

2. **Access Control**
   - Users can't access app features until `kyc.status === 'VERIFIED'`
   - Enforced by [KycGate](frontend/src/components/auth/KycGate.tsx) component
   - Backend also validates KYC status before sensitive operations

3. **Data Privacy**
   - ID documents are **never stored** in our database
   - Didit handles all sensitive document storage
   - We only store verification status and reference ID

## Firestore Schema

### `users/{uid}/kyc/status`
```typescript
{
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'CANCELLED',
  provider: 'didit',
  referenceId: string,          // Didit session ID
  score?: number,               // Verification confidence score
  reason?: string,              // Failure reason if FAILED
  verifiedName?: string,        // Name from verified ID
  createdAt: Date,
  updatedAt: Date
}
```

### `kycReferences/{sessionId}`
```typescript
{
  uid: string,                  // User ID (set after binding)
  vendor: string,               // Temporary vendor ID (pre-signup)
  type: 'uid' | 'vendor',
  provider: 'didit',
  createdAt: Date,
  boundAt?: Date                // When vendor was bound to uid
}
```

### `kyc_temp/{vendor}` (Pre-signup only)
```typescript
{
  status: 'PENDING' | 'VERIFIED' | 'FAILED',
  provider: 'didit',
  referenceId: string,
  vendor: string,
  createdAt: Date,
  updatedAt: Date
}
```

## Common Issues

### Issue: User stuck at "PENDING" status
**Cause:** Webhook didn't arrive from Didit  
**Solution:** Use `/api/kyc/sync` endpoint to manually fetch decision

### Issue: "Failed to create verification session"
**Cause:** Missing Didit credentials  
**Solution:** Set `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID` in backend environment

### Issue: Webhook signature validation fails
**Cause:** Wrong `DIDIT_WEBHOOK_SECRET`  
**Solution:** Get correct secret from Didit dashboard

## Testing

### Local Development
1. Start emulators: `npm run dev` (backend)
2. Set `NEXT_PUBLIC_API_BASE=http://127.0.0.1:8765` (frontend .env.local)
3. Webhooks won't work locally (use `/api/kyc/sync` or dev-verify endpoint)

### Emulator-only Bypass
```typescript
POST /api/kyc/dev-verify
Body: { vendor?: string }
```
Only works when `FUNCTIONS_EMULATOR=true`. Instantly sets status to VERIFIED.

## Mobile App Notes

⚠️ **Current mobile implementation is incorrect** - it collects ID images but they're ignored by the backend.

**Correct mobile flow should be:**
1. Open Didit verification URL in WebView or external browser
2. User completes verification on Didit
3. Deep link back to app
4. Listen to Firestore for status updates

**Alternative:** Use React Native WebView with Didit SDK integration.
