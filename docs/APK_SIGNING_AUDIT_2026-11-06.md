# WE4ALL APK signing audit — 6 November 2026

## Executive result

The GitHub Actions workflow history contains 334 runs across the four available Actions API pages. Of these, 25 completed successfully with a `WE4ALL-debug-*.zip` APK artifact. All 25 APK artifacts were downloaded and their Android APK Signing Block v2 X.509 signing certificates were inspected.

**Result: 25 of 25 inspected APK artifacts have different SHA-256 signer fingerprints.** Each certificate subject is `CN=Android Debug, O=Android, C=US`, and each certificate validity start time corresponds closely to the individual runner build time. This is consistent with the workflow using a fresh temporary debug keystore for each GitHub-hosted runner.

No stable owner-held signing key can be identified from these 25 successful GitHub artifacts. The workflow artifact ZIPs contain `app-debug.apk` only; they do not contain the debug private keystore.

This audit does not prove which build any individual user installed, and does not cover APKs that were shared outside this workflow, manually built on a computer, downloaded from another branch/repository, or retained in expired/deleted artifacts. Do not uninstall any customer's current app based only on this inventory.

## Completed APK artifact inventory

All fingerprints below are the full SHA-256 certificate fingerprints extracted from the v2 signing block. Colons separate bytes.

| Actions run | Artifact ID | SHA-256 signer fingerprint |
|---:|---:|---|
| 334 | 13461909394 | `E9:B7:DF:A7:F3:37:41:3C:E5:47:2F:8F:DA:BC:5D:F9:48:E6:52:EA:09:21:F8:C3:C4:26:C5:B1:BA:48:E4:68` |
| 333 | 13463565260 | `3C:01:C5:AE:12:45:D6:1C:D6:80:D9:54:80:53:A5:01:24:8E:CA:44:68:03:DC:8D:30:4A:96:26:9E:DB:A0:0B` |
| 330 | 13463150283 | `41:C3:C8:58:9F:5E:17:92:11:DF:58:C0:EC:FB:5D:11:AF:F2:56:D2:F9:9A:BB:C3:49:73:83:84:9E:FD:5D:B7` |
| 329 | 13462575815 | `30:49:01:57:D8:2C:EF:0E:B7:7D:D4:BC:8B:8D:41:82:D5:77:E1:57:36:3C:EF:39:15:20:24:51:90:CB:0A:C6` |
| 321 | 13460504033 | `7F:22:A7:3C:78:80:27:F7:75:64:B6:E1:24:5D:1E:87:88:B2:6C:81:05:6B:CB:91:64:FF:86:1D:33:57:B9:F6` |
| 320 | 13462027072 | `0F:27:9C:1A:28:D9:E7:5A:E3:1E:E5:9D:A4:87:5C:BA:53:E1:EA:95:20:69:B1:88:3E:84:67:2B:EB:06:35:F8` |
| 290 | 13457543339 | `7E:8D:84:AC:0E:21:85:20:44:89:86:88:E3:A4:4A:16:83:4B:FA:6B:AD:33:CF:4D:C8:DE:DD:78:B4:96:91:F8` |
| 289 | 13457243749 | `0A:E5:9B:20:14:DC:C2:4E:C6:E5:1A:C5:9B:E1:32:B2:7E:5D:6E:47:C5:DB:3B:15:FF:77:C6:55:DA:B5:F7:73` |
| 245 | 13455604254 | `97:CE:F7:2B:23:9F:7C:2B:E1:D0:59:AF:37:A6:9C:14:A2:99:8F:54:10:BC:AF:D6:C4:BE:4A:40:D6:1D:E9:EF` |
| 173 | 13455086769 | `C8:F7:0B:9D:1A:57:6E:7C:31:C8:2F:01:F9:FE:CD:9C:75:AF:D1:D7:82:04:38:C3:C5:88:45:D4:0D:F8:52:96` |
| 172 | 13453382467 | `91:B2:81:CD:13:66:DE:62:D2:5A:46:B0:3E:E4:D4:E7:6F:25:06:6F:DD:FC:BF:D9:35:D1:80:AF:15:CD:20:E0` |
| 169 | 13454096314 | `F1:06:1E:71:6D:D8:1D:2F:8D:50:DA:C9:EF:EA:28:FB:BF:9C:7A:4C:0B:59:64:22:18:7C:24:79:15:92:CA:21` |
| 168 | 13453293310 | `23:5D:91:1C:79:91:0C:F7:CB:11:A1:DE:C6:4C:ED:06:8A:A9:4E:C0:4E:AE:BE:39:7C:6D:97:B2:68:70:47:32` |
| 78 | 13451763063 | `31:0F:25:92:76:E9:BB:F3:43:18:34:CE:7D:4C:63:63:60:6E:EC:0E:C6:F8:12:AB:A1:64:DA:09:8B:FB:1B:D9` |
| 77 | 13452188114 | `25:2E:3D:4A:2E:E6:E0:0F:C5:A8:51:EB:87:E9:D2:96:A0:51:60:F2:B4:88:E7:73:F9:C1:C9:42:41:2F:DC:E4` |
| 74 | 13451066628 | `78:BE:D1:B2:91:38:A0:64:68:B6:FA:59:A7:32:F1:45:84:14:4E:52:B1:B2:A7:40:86:53:DB:C8:F3:4A:A2:DF` |
| 73 | 13450419771 | `4D:0A:46:51:7B:BF:FD:BC:D4:37:C2:DE:F1:6E:9B:8D:F9:19:67:9E:70:84:4B:02:A6:20:D0:59:9A:4B:E5:24` |
| 42 | 13451225016 | `8C:AD:DD:C1:2F:E8:EA:6C:49:F7:08:89:CC:6B:22:CF:3E:11:B4:8A:A3:9F:B9:C6:2A:49:B2:6F:C1:A7:F7:DD` |
| 36 | 13449737672 | `DE:DE:8D:EE:34:E5:9D:8E:CD:0A:76:9F:26:3F:28:7C:63:18:43:64:B2:51:81:80:7D:5C:39:E9:BC:15:FC:0B` |
| 35 | 13449258004 | `F3:16:86:8D:BD:38:FE:B6:46:28:8C:FB:84:84:87:54:42:A7:6F:A4:38:30:ED:F6:63:B8:24:3B:3A:A5:4D:F5` |
| 32 | 13449613884 | `CC:35:B9:CD:F7:10:20:A5:5C:26:66:9A:D9:57:3D:A8:28:53:34:E2:E2:1A:96:D3:A1:DC:B0:50:FF:0E:DC:9C` |
| 30 | 13450475327 | `F6:62:AF:44:3C:F2:46:D3:68:BE:46:94:2C:D0:37:9C:8C:F3:49:BA:B6:92:61:15:C6:22:8B:CE:EF:FA:BC:9F` |
| 29 | 13449468522 | `C0:19:12:8A:A6:11:AA:54:53:91:8C:0D:6B:76:73:B4:37:B3:5E:26:11:D6:C6:B6:77:1F:5A:7B:9B:AF:E6:19` |
| 20 | 13449821024 | `6C:77:40:EC:7B:9B:11:9C:39:23:08:83:73:EC:F8:4A:70:99:62:49:31:7D:37:F9:CB:DD:E4:22:4C:47:0A:B4` |
| 18 | 13447889973 | `C6:9E:B8:F1:C5:63:BB:06:C3:82:57:6E:D4:D1:7F:2F:F9:E9:AB:0B:11:BA:59:9B:F1:D3:8A:C0:1E:2B:09:A0` |

All 25 fingerprints are distinct.

## Audit coverage and limits

- Queried all four pages of the repository's 334 Actions runs.
- The 25 successful runs that produced the current named debug-APK artifact were downloaded and inspected.
- Each artifact was a ZIP containing `app-debug.apk`, with no persistent private debug keystore.
- The certificate was read from the Android APK Signing Block v2 X.509 certificate and fingerprinted using OpenSSL.
- This inventory covers artifacts retained and available at the time of this audit. It cannot show which artifact a particular user actually installed.
- APKs shared outside these Actions runs must be checked independently.

## Safe verification from a user's actual phone

Do not uninstall or update the installed application during this audit. Use a read-only package pull with Android Debug Bridge (ADB) on a trusted computer with USB debugging temporarily enabled:

1. Connect the phone by USB and approve the computer prompt.
2. Run:
   ```bash
   adb devices
   adb shell pm path com.we4all.superapp
   ```
3. The command returns one or more `package:/data/app/.../base.apk` paths (and possibly split APK paths). Copy the exact `base.apk` path from that output:
   ```bash
   adb pull "/data/app/PASTE_THE_RETURNED_PATH/base.apk" user-installed-we4all.apk
   ```
   Use the exact path shown by `pm path`; do not type the example path literally.
4. Run Android SDK Build Tools on that pulled copy:
   ```bash
   apksigner verify --verbose --print-certs user-installed-we4all.apk
   ```
5. Record the signer certificate SHA-256 digest. It is public certificate information, not a private key.

Alternative: ask one or more users to send the exact original APK file they installed (not a screenshot). On a trusted computer run the same `apksigner verify --print-certs` command against that file.

## How to interpret the result

- If the user's fingerprint equals one of the 25 fingerprints above, the old Actions debug private key was not preserved in the artifact. A new release signing key cannot update that app in place. A one-time uninstall/reinstall may be required, and local-only app data may be deleted.
- If the user's fingerprint is different from all 25, do not uninstall. It may be a locally generated build signed by a persistent key. Search the original build computer, backup drives and original developer for the matching `.jks` / `.keystore` and passwords. If that original keystore is found, it may be possible to preserve in-place upgrades.
- If users have multiple fingerprints, there is no single signer that can update every installation. Plan a controlled migration cohort by cohort, with account reauthentication and data export/backup before uninstall.
- Never try to derive a private key from a certificate or use an APK signing bypass.

## Recommended migration path

1. Collect the fingerprint from one representative device per distribution cohort (at minimum: owner/admin, merchant, rider, and customer if they received separate APKs).
2. Compare each to this inventory.
3. Search owner-controlled computers and backups for an existing matching release keystore before generating anything.
4. If no persistent key is found, approve one permanent release keystore and create two offline backups.
5. Build the Capgo-enabled release APK with that permanent key; verify the fingerprint and install/upgrade it on test devices.
6. Where signatures differ, provide a data backup/export route and reauthentication before one-time uninstall/reinstall. Check Supabase account data separately; do not assume local cart/cache/preferences automatically migrate.
7. From the permanent-key APK onward, keep the signing identity stable for all APK updates. Capgo then supports compatible web-bundle OTA updates.

## Safety hold

No new release keystore has been generated. No user APK has been replaced. No customer should be instructed to uninstall until actual installed fingerprints are collected and local/cloud data recovery has been tested.
