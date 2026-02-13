# SkillSwap Mobile (Expo)

A minimal Expo (React Native) app that mirrors core SkillSwap flows: home, listings, listing details, create listing, requests, wishes (donate/request), and profile — wired to the same Firebase backend as the web.

## Prerequisites

- Node 18+
- Android Studio or Xcode (optional for device simulators)
- Expo CLI (installed on first run)
- Firebase project config (reuse from web)

## Setup

1. Create a `.env` file in `mobile/` with your Firebase values (prefix with EXPO_PUBLIC_):

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
# Optional: if running functions emulator locally
EXPO_PUBLIC_FUNCTIONS_BASE=http://127.0.0.1:5001/<PROJECT_ID>/us-central1
EXPO_PUBLIC_USE_EMULATORS=false
```

2. Install dependencies and run:

```powershell
# from the mobile folder
npm install
npm run start
```

3. In the Expo web UI or CLI, choose a platform (Android/iOS/web). On first run, tap "Quick sign-in" on Home to authenticate anonymously.

### Using Firebase emulators (recommended during development)

Set these in `mobile/.env` to mirror the website setup:

```
EXPO_PUBLIC_USE_EMULATORS=true
# Host for emulators
# - Android Emulator: 10.0.2.2
# - iOS Simulator: 127.0.0.1
# - Physical device on LAN: your computer's LAN IP (and start emulators bound to 0.0.0.0)
EXPO_PUBLIC_EMULATOR_HOST=10.0.2.2

# Functions emulator base (override if needed). If EXPO_PUBLIC_USE_EMULATORS=true
# and you set EXPO_PUBLIC_FIREBASE_PROJECT_ID, this is auto-derived.
# EXPO_PUBLIC_FUNCTIONS_BASE=http://10.0.2.2:5001/<PROJECT_ID>/us-central1
```

Notes:
- For physical devices, the default Firebase emulators bind to localhost and won’t be reachable. Either use Android Emulator/iOS Simulator, or run emulators with host 0.0.0.0 and use your machine’s LAN IP in `EXPO_PUBLIC_EMULATOR_HOST`.
- The app auto-connects to Auth and Firestore emulators when `EXPO_PUBLIC_USE_EMULATORS=true`.

## Troubleshooting

- Windows reserved filename “NUL”: If you see a file named `mobile/NUL` in your workspace, it’s a legacy artifact that can confuse tools on Windows. It can’t be deleted normally due to being a reserved device name. If it appears in your repo, remove it using one of these approaches:
	- In WSL or Git Bash: `git rm -f mobile/NUL` then commit.
	- From a Linux/macOS machine: delete the file and push the commit.
	- Or rename/delete via a WSL shell targeting the repo path (recommended).

- Routing not working: Ensure `babel.config.js` contains the plugin `expo-router/babel` (already added in this project).
- Type errors about `className` on React Native components: We provide UI wrappers that accept `className` and translate them to styles; use those wrappers (e.g., `Card`, `Input`, `Badge`). Avoid passing `className` directly to `View`, `Text`, etc.

## Notes

- Listings screen pulls from Firestore `listings`.
- Create listing calls the same backend endpoint used on the web (`/api/listings/create`) using your Firebase ID token.
- Requests screen reads the `requests` collection for the current user (as requester or owner).
- Wishes screens are placeholders to be wired to your domain flows.
- For local development with emulators, set `EXPO_PUBLIC_USE_EMULATORS=true` and ensure the emulators are running.
