# SkillSwap Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Backend Deployment (Firebase Functions)](#backend-deployment-firebase-functions)
4. [Frontend Deployment (Firebase Hosting / App Hosting)](#frontend-deployment-firebase-hosting--app-hosting)
5. [Mobile Deployment (Expo EAS)](#mobile-deployment-expo-eas)
6. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Prerequisites

### Required Tools
```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Install Expo CLI and EAS CLI globally  
npm install -g expo-cli eas-cli

# Verify installations
firebase --version  # Should be 13.x+
eas --version       # Should be 13.x+
```

### Required Accounts
- [ ] Firebase project created at https://console.firebase.google.com
- [ ] Google Cloud billing enabled for the Firebase project
- [ ] Expo account created at https://expo.dev
- [ ] Apple Developer account ($99/year) for iOS deployment
- [ ] Google Play Console account ($25 one-time) for Android deployment

---

## Environment Setup

### Backend Environment Variables
Create `backend/.env` for local development:
```bash
# Firebase
GCLOUD_PROJECT=your-firebase-project-id

# Database (PostgreSQL for payments)
POSTGRES_CONNECTION_STRING=postgres://user:pass@host:5432/skillswap?sslmode=require

# Payments (Geidea)
GEIDEA_MERCHANT_ID=your-merchant-id
GEIDEA_API_PASSWORD=your-geidea-api-password
GEIDEA_CALLBACK_URL=https://your-app.example/payments/callback
GEIDEA_BASE_URL=https://api.geidea.net
GEIDEA_WEBHOOK_SECRET=your-webhook-secret

# KYC (Didit)
DIDIT_API_KEY=your-didit-api-key
DIDIT_WORKFLOW_ID=your-workflow-id
DIDIT_CALLBACK_URL=https://your-app.example/kyc/webhook
DIDIT_BASE_URL=https://verification.didit.me
DIDIT_WEBHOOK_SECRET=your-didit-webhook-secret

# Search (Algolia)
ALGOLIA_APP_ID=your-algolia-app-id
ALGOLIA_API_KEY=your-algolia-admin-key
ALGOLIA_INDEX=listings

# Email notifications (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
SMTP_FROM=noreply@example.com

# Maps / Geo (optional)
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### Frontend Environment Variables
Create `frontend/.env.local`:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FUNCTIONS_BASE=https://skillswap-69yxi.web.app
# (Alternatively, direct Cloud Functions URL: https://europe-west3-skillswap-69yxi.cloudfunctions.net)

# AI matchmaking (server-side in Next.js)
MATCHMAKING_MODE=auto           # auto | gemini | rule
GEMINI_API_KEY=your-gemini-key  # or GOOGLE_API_KEY
```

### Mobile Environment Variables
Create `mobile/.env`:
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_FUNCTIONS_BASE=https://skillswap-69yxi.web.app
EXPO_PUBLIC_USE_EMULATORS=false
```

---

## Backend Deployment (Firebase Functions)

### Step 1: Login to Firebase
```bash
firebase login
```

### Step 2: Select Your Project
```bash
cd backend
firebase use your-project-id
# Or list projects: firebase projects:list
```

### Step 3: Set Runtime Environment Variables and Secrets
```bash
# Set runtime secrets used by backend/src/core/*
firebase functions:secrets:set DIDIT_API_KEY
firebase functions:secrets:set DIDIT_WEBHOOK_SECRET
firebase functions:secrets:set GEIDEA_API_PASSWORD
firebase functions:secrets:set GEIDEA_WEBHOOK_SECRET
firebase functions:secrets:set POSTGRES_CONNECTION_STRING
firebase functions:secrets:set ALGOLIA_API_KEY

# Non-secret runtime env vars (set in Functions runtime settings)
# DIDIT_WORKFLOW_ID, DIDIT_BASE_URL
# DIDIT_CALLBACK_URL=https://skillswap-69yxi.web.app/kyc/done
# APP_URL=https://skillswap-69yxi.web.app  <-- used as KYC callback base
# GEIDEA_MERCHANT_ID, GEIDEA_CALLBACK_URL, GEIDEA_BASE_URL
# ALGOLIA_APP_ID, ALGOLIA_INDEX
# USE_MOCK_PAYMENTS=0  <-- MUST be 0 in production
```

### Step 4: Build and Deploy
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy functions only
firebase deploy --only functions

# Or use project script (clean + build + deploy)
npm run deploy

# Or deploy everything (functions + rules + indexes)
firebase deploy
```

### Step 5: Verify Deployment
```bash
# Check function logs
firebase functions:log

# Test health endpoint (region: europe-west3, project: skillswap-69yxi)
curl https://skillswap-69yxi.web.app/api/health
# Direct Cloud Functions URL:
curl https://europe-west3-skillswap-69yxi.cloudfunctions.net/api/health
```

### Troubleshooting
```bash
# View detailed logs
firebase functions:log --only api

# Redeploy specific function
firebase deploy --only functions:api

# Check configured secrets in Google Cloud Secret Manager
# (Cloud Console > Security > Secret Manager)
```

---

## Frontend Deployment (Firebase Hosting / App Hosting)

### Option A: Firebase Hosting (Static Export)

#### Step 1: Configure for Static Export
Add to `frontend/next.config.ts`:
```typescript
const nextConfig = {
  output: 'export',  // Enable static export
  // ... rest of config
};
```

#### Step 2: Build and Deploy
```bash
cd frontend
npm install
npm run build    # Creates 'out' directory
firebase deploy --only hosting
```

### Option B: Firebase App Hosting (Recommended for Next.js SSR)

#### Step 1: Enable App Hosting
```bash
cd frontend
firebase apphosting:backends:create
```

#### Step 2: Configure apphosting.yaml
```yaml
# frontend/workspace/apphosting.yaml
runtime: nodejs20

env:
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    secret: FIREBASE_API_KEY
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    value: "your-project.firebaseapp.com"
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: "your-project-id"
    availability: [BUILD, RUNTIME]
  # Add all NEXT_PUBLIC_ variables
```

#### Step 3: Deploy via Git
App Hosting deploys automatically when you push to your configured branch:
```bash
git add .
git commit -m "Deploy to App Hosting"
git push origin main
```

#### Step 4: Check Status
```bash
firebase apphosting:backends:list
firebase apphosting:backends:get YOUR-BACKEND-ID
```

---

## Mobile Deployment (Expo EAS)

### Step 1: Configure EAS
```bash
cd mobile

# Login to Expo
eas login

# Initialize EAS (creates eas.json if not exists)
eas build:configure
```

### Step 2: Create eas.json
```json
{
  "cli": {
    "version": ">= 13.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "distribution": "store"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id"
      }
    }
  }
}
```

### Step 3: Set Environment Variables on EAS
```bash
# Set production secrets on EAS servers
eas secret:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-api-key"
eas secret:create --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "your-project-id"
# ... repeat for all EXPO_PUBLIC_ variables
```

### Step 4: Build for Android

#### Development Build (Testing)
```bash
eas build --platform android --profile development
```

#### Production Build (Play Store)
```bash
eas build --platform android --profile production
```

### Step 5: Build for iOS

#### Prerequisites
- Apple Developer Program membership
- App created in App Store Connect
- Push notification certificate configured

#### Development Build (Testing)
```bash
eas build --platform ios --profile development
```

#### Production Build (App Store)
```bash
eas build --platform ios --profile production
```

### Step 6: Submit to App Stores

#### Submit to Google Play
```bash
# First, create a service account in Google Cloud Console
# Download JSON key and save as mobile/google-play-key.json
eas submit --platform android --profile production
```

#### Submit to Apple App Store
```bash
# You'll be prompted for Apple ID credentials
eas submit --platform ios --profile production
```

### Step 7: Configure Push Notifications

#### For Android (FCM)
1. Download `google-services.json` from Firebase Console
2. Place in `mobile/` directory
3. Rebuild the app

#### For iOS (APNs)
1. Create APNs key in Apple Developer Portal
2. Upload to Firebase Console → Project Settings → Cloud Messaging
3. Enable push notifications in Xcode project capabilities

---

## Post-Deployment Checklist

### Security
- [ ] All secrets stored in Firebase Secrets Manager (not env vars)
- [ ] CORS whitelist updated with production domains only
- [ ] Webhook endpoints protected with signature verification
- [ ] Rate limiting configured on Cloud Functions
- [ ] Firebase Security Rules deployed and tested

### Monitoring
- [ ] Firebase Crashlytics enabled for mobile
- [ ] Cloud Monitoring alerts configured
- [ ] Error reporting integrated (Sentry/Firebase Crashlytics)
- [ ] Performance monitoring enabled

### Testing
- [ ] Smoke test all critical user flows
- [ ] Payment flow tested with real cards (small amounts)
- [ ] Push notifications working on all platforms
- [ ] KYC verification flow tested

### Documentation
- [ ] API documentation updated
- [ ] Runbook for common operations created
- [ ] Incident response plan documented

---

## Quick Reference Commands

```bash
# Backend
cd backend && npm run build && firebase deploy --only functions

# Frontend (Static)
cd frontend && npm run build && firebase deploy --only hosting

# Mobile Android
cd mobile && eas build --platform android --profile production

# Mobile iOS
cd mobile && eas build --platform ios --profile production

# View logs
firebase functions:log
eas build:list

# Rollback (redeploy previous version)
firebase functions:delete api --force
firebase deploy --only functions
```

---

## Support

For deployment issues:
1. Check Firebase Console logs
2. Check EAS build logs at https://expo.dev
3. Review Cloud Logging in Google Cloud Console
