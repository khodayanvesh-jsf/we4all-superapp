# WE4ALL: migrate from GitHub debug APK to permanent direct APK signing

## Verified old APK
The artifact `WE4ALL-debug-1b48b3bf7fa5c12cc3ec8a8b04a4cc5aa662d7e8` from GitHub Actions run `42128617872` was inspected.
- APK signing subject: `CN=Android Debug, O=Android, C=US`
- SHA-256 certificate fingerprint: `30490157D82CEF0EB77DD4BC8B8D4182D577E157363CEF391520245190CB0AC6`
- Certificate validity began on 5 November 2026, at the time of that CI build.
- The ZIP artifact contains only `app-debug.apk`; it does not contain the runner's debug private keystore.

A public certificate can verify an APK but cannot sign a later APK. The private key is not derivable from the certificate. The GitHub runner's temporary debug keystore was not persisted, so this exact artifact cannot receive an in-place upgrade signed with a new long-term release key.

## Recommended one-time transition
1. Keep the old APK available. Do not ask users to uninstall yet.
2. Generate one permanent Android release keystore only after confirming that no persistent prior key exists:
   ```bash
   keytool -genkeypair -v -keystore we4all-release.jks -alias we4all -keyalg RSA -keysize 2048 -validity 10000
   ```
3. Back up the keystore offline in two secure locations. Do not commit it or send it through chat.
4. Add GitHub Environment `android-release` secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
5. Merge the reviewed release branch into `main` only after its checks pass and the owner has approved the transition.
6. Run the signed APK workflow on `main`. Install the result on a spare test phone first, verify package ID `com.we4all.superapp`, versionCode `329`, versionName `3.2.9`, and inspect the signing fingerprint.
7. Because this certificate differs from the old GitHub debug certificate, users with the old debug APK will need to uninstall that app before installing the release APK under the same package ID. Uninstalling may erase local-only app data. Before doing this, provide a backup/export path and ensure users can sign back into accounts; never promise that local-only data is preserved automatically.
8. After the new release APK is installed, all later APK updates must be signed with the same permanent keystore. Capgo OTA can then update compatible web assets without APK reinstall; native plugin/permission changes still require another APK signed with this same key.

## No Play Store
WE4ALL is an APK-distribution app. Google Play is not required. The GitHub workflow builds a signed APK artifact only and does not publish to Play.

## Capgo settings
Use the dedicated [Supabase staging procedure](SUPABASE_OTA_STAGING.md) for the OTA candidate. Match the Android signing certificate before an in-place upgrade.

## Important limit
This migration plan is based on the inspected artifact from run `42128617872`. If customers received an APK from a different Actions run, inspect that exact APK too: GitHub-hosted runner debug signing certificates can differ from run to run.
