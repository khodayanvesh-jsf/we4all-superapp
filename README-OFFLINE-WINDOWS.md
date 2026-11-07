# WE4ALL — Offline Desktop Development Copy

Source exported from GitHub repository `khodayanvesh-jsf/we4all-superapp`.

- Branch: `fix/payment-safety-guest-default`
- Exact source commit: `d1e2c44910162b3e1d9f8f171c56b93c516ca6c9`
- App version in this source: `3.3.0`, Android build number `330`
- Android package ID: `com.we4all.superapp`

## Open in Visual Studio Code

1. Extract this ZIP to a normal folder, for example `C:\WE4ALL`.
2. Open Visual Studio Code → **File → Open Folder** → choose `C:\WE4ALL`.
3. Open **Terminal → New Terminal**.

## Required tools

For web development: Node.js 22 LTS (20+ may work), npm, and Visual Studio Code.
For Android APK builds: Java 21 (Temurin recommended), Android Studio and Android SDK Platform/Build Tools.

## First-time setup (internet required once)

The ZIP intentionally does not contain `node_modules`. Run once from the project root:

```powershell
npm ci
```

This downloads dependencies from `package-lock.json`. After dependencies are installed, local UI/code work can run without internet:

```powershell
npm run dev -- --host 127.0.0.1
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). Stop with `Ctrl+C`.

Check code and build:

```powershell
npm test
npm run build
```

The source snapshot is development code, not a certified production release. Check the latest GitHub Actions result before distributing a new APK.

## Supabase configuration

Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key. The code has fallback values for the current project, but local environment variables are easier to manage.

Only these public frontend variables belong in Vite:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never place a Supabase secret/service-role key, SMS/payment secrets, Founder credentials, Capgo private key, or Android keystore/password in `.env.local`, React code, an APK, or this source folder. Keep server credentials in the relevant backend/provider secret manager.

## Offline versus online capabilities

**Can work offline once dependencies are installed:** editing source in VS Code, local Vite UI preview, local code tests that do not call remote services, and building the static web bundle.

**Requires internet and configured services:** Supabase login and shared records, Edge Functions, live catalogue/order sync, verified payments/webhooks, SMS OTP, Capgo OTA download/checks, GitHub Actions, Vercel, maps/location and other remote APIs.

WE4ALL is not currently a fully offline-first marketplace. A local preview or locally cached data is not proof that a real order/payment/booking has completed.

## Build Android debug APK (Windows)

From the project root:

```powershell
npm ci
npm test
npm run build
npx cap sync android
cd android
.\gradlew.bat --no-daemon --stacktrace clean assembleDebug
```

Output: `android\app\build\outputs\apk\debug\app-debug.apk`.
This is a test APK. GitHub Actions debug APK artifacts have been found to use different signing certificates between runs. Do not rely on debug APKs for customer upgrades.

## Direct APK signing and OTA

WE4ALL is shared directly as an APK; Google Play is not required. Android still requires the same signing certificate for in-place app upgrades. Read:
- `docs/APK_SIGNING_AUDIT_2026-11-06.md`
- `docs/GITHUB_DEBUG_APK_MIGRATION.md`
- `docs/CAPGO_OTA_RELEASE.md`

Do not create a new signing key until the existing-user migration plan is approved and any owner-held key has been searched for. Protect the permanent keystore and back it up offline in two secure places. Never commit it.

Capgo OTA can update compatible web assets only after an updater-enabled signed native APK is installed and Capgo channels/credentials are configured. Native plugin or permission changes require a new APK signed with the same permanent key.

## Included backend and workflow source

- `supabase/migrations/` — database migrations.
- `supabase/functions/` — sync, Founder review and customer order Edge Functions.
- `tests/` — automated regression tests.
- `.github/workflows/` — CI, APK release, OTA and source-export workflows.

The new marketplace schema and initial customer order transaction are foundations. Not all seven portals are connected to complete live transaction APIs. Payments, bookings, dispatch, labour attendance and settlements still require implementation, provider configuration and end-to-end testing.

## Production safety

This is a development branch snapshot. The PR remains a draft. Do not overwrite the production site or distribute a new APK to customers until tests, authentication, order/payment flows, signing continuity and device-upgrade tests pass.
