# WE4ALL Windows source sync and local backup

The current review source is version **3.3.1** on branch `codex/we4all-offline-sync`. It builds on the shop/rider and accounts/OTA draft branches. The installed APK, production database and live website may still be on older versions. Nothing here publishes a release or changes production data.

## One-click Windows setup

Install [Git for Windows](https://git-scm.com/download/win), [Node.js 22](https://nodejs.org/), and Visual Studio Code. Download this repository's source ZIP once, extract it fully, then double-click **`offline\Sync-WE4ALL.cmd`**. The script clones the current review source to `Documents\WE4ALL-Workspace` and runs `npm ci`. It prints the exact Git commit. Open that workspace folder in VS Code.

For later updates, double-click the same command again from the updated workspace's `offline` folder. It fetches the selected branch and applies a fast-forward only. Local edits stop the sync with an explanation; save or commit them first. It does not switch your branch, replace another folder, or delete uncommitted files. If you prefer stable approved code after merge, run `offline\Sync-WE4ALL.ps1 -Branch main -Destination "$HOME\Documents\WE4ALL-Stable"` in PowerShell; keep the two copies separate.

The GitHub Actions **Export WE4ALL offline source package** workflow also creates a commit-stamped ZIP and SHA-256 checksum on every push to this review branch and to `main`. Download from **Actions → Export WE4ALL offline source package → latest successful run → Artifacts**. This ZIP contains a source snapshot without Git history; use the sync command for future pulls. Artifacts expire after 30 days; the repository remains the long-term source.

## Work and test

In the cloned workspace, run `npm run dev` and open the localhost address printed by Vite. Run `npm test`, `npm run build`, and `npx cap sync android` when you change the Android web bundle. A debug APK also needs Java 21, Android SDK, and `cd android; .\gradlew.bat assembleDebug`. A customer upgrade APK requires the same permanent signing certificate as their installed app; a debug build is not an in-place replacement.

The source clone includes `src/`, `android/`, `supabase/migrations/`, `supabase/functions/`, `supabase/config.toml`, `tests/`, workflow files, and the npm lockfile. The script copies `.env.example` to the ignored `.env.local` on first setup only. Set the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` values there if the sample key is a placeholder. Only public frontend values belong there. Do not put a service-role key, database password, Founder password, SMS/payment secret, OTA signing key, or Android keystore in Git, `.env.local`, the frontend, or an APK.

Git source sync does **not** download live users, documents, product records, secret values, provider accounts, deployed functions, or database content. The frontend needs internet to use online Supabase services. A local development UI can run without internet after `npm ci`, but online sign-in, market sync, order dispatch and OTA checks cannot.

## Back up live Supabase data to your Windows computer

Install Supabase CLI and Docker Desktop, sign in with `supabase login`, then run `offline\Backup-WE4ALL-Data.ps1` from a PowerShell terminal in the workspace. The CLI will ask for a database password when linking if needed. If bucket discovery fails, supply every bucket explicitly: `offline\Backup-WE4ALL-Data.ps1 -Buckets @("we4all-media","we4all-partner-kyc")`. These are the two buckets observed in the connected project on 10 November 2026; include any subsequently created buckets too. The script creates `Documents\WE4ALL-Backups\we4all-YYYYMMDD-HHMMSS` with schema, data, roles, Storage objects and a SHA-256 manifest. A failed step leaves an explicitly incomplete snapshot.

These dumps contain personal and authentication records. Store the backup on a Windows encrypted drive with access limited to you; keep a separate encrypted external copy. Do not commit it, upload it to a public folder, or share it in chat. The CLI uses Git-tracked migrations/functions as source, but server-side secrets, Auth provider settings, DNS, payment/provider consoles and signing keys must be recorded and backed up separately in a password manager. Database exports and Storage downloads are snapshots, not automatic two-way sync. Test restoration in a separate Supabase project before depending on them. Do not restore a database snapshot into production without a reviewed migration plan.

### What is synchronized

| Item | Windows copy | Update mechanism |
| --- | --- | --- |
| Web, Android, SQL migrations and Edge Function source | Yes | Git fast-forward from chosen branch |
| npm dependencies | Reinstalled locally | `npm ci` from lockfile |
| Public Supabase endpoint/key | Local `.env.local` | First-run template, review when changed |
| Live database records and uploaded object bytes | Separate local snapshot | Run backup again after changes |
| Server secrets, provider dashboards, signing keys | Owner-managed private backup | Never stored in Git/source ZIP |
| OTA updates and signed installable APK | Not produced by source sync | Separate verified release process |
