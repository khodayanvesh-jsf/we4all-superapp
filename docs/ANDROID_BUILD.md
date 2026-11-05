# Building WE4ALL Android locally

This project is a React/Vite web app packaged with Capacitor.

## Requirements
- Node.js 22 LTS (20+ may work, 22 is used in CI)
- Java 17 (Temurin recommended)
- Android Studio / Android SDK Platform and Build Tools
- Windows: PowerShell; macOS/Linux: bash

## Web build and tests
```powershell
npm ci
npm test
npm run build
```

## Sync and build a debug APK
```powershell
npx cap sync android
cd android
.gradlew.bat --no-daemon --stacktrace clean assembleDebug
```

APK output:
`android/app/build/outputs/apk/debug/app-debug.apk`

The GitHub Actions workflow runs the same test/web/Capacitor/Android debug build and uploads an artifact named `WE4ALL-debug-<commit>`.

## Release warning
The CI artifact is a debug APK for development/testing, not a Play Store or public-production release. A production APK/AAB must be built with the founder-controlled signing key stored only as protected CI secrets, verified with Android SDK signing tools, and tested for upgrade compatibility with the existing installed package. Never commit a keystore or signing password.

## Runtime configuration
Do not add Supabase service-role keys, payment secrets, OTP provider secrets or founder credentials to Vite variables or frontend code. Frontend variables are public. Keep server-only secrets in the backend hosting provider. Android package ID must remain `com.we4all.superapp` unless a deliberate migration strategy is approved.
