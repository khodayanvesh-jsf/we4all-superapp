# WE4ALL Phase 2: Partner KYC and approvals

## Delivered in the local source package

- Partner application forms use role-specific required details for merchants, service providers, decorators, riders, and labour partners.
- KYC uploads now use role-specific evidence checklists. Rider applications require identity, driving licence, vehicle registration, and payout identity evidence; other roles request identity, role/business evidence, and payout identity evidence.
- Applicants can select files or use a mobile camera capture input. PDF, JPEG, PNG, and WebP files are accepted up to 10 MB each.
- The workflow supports typed names, a drawn signature, or an uploaded signature image. Payment gateway binding and payouts remain separate and are not activated by submitting payout identity evidence.
- A private `we4all-partner-kyc` storage bucket and owner-scoped storage policies are prepared in a timestamped SQL migration.
- `we4all-submit-partner-kyc` verifies the signed-in applicant, pending application ownership, exact role-specific file list, storage folder, uploaded objects, terms acceptance, and signature method before recording the KYC submission.
- Founder review creates expiring signed links for private evidence and requires a five-item review checklist. The SQL approval gate verifies required documents and leaves terms approval disabled until final terms are published.
- The submit function checks that the application is still pending when it saves, and returns a conflict if review changed it during upload.

## Verification completed

- `npm test`: 86 tests passed.
- `npm run build`: passed. Vite reports a 699.94 kB minified application bundle, above its 500 kB advisory threshold.
- `npx cap sync android`: passed; the built web assets and Capgo updater were copied into the Android project.

## Deployment state and prerequisites

This phase is prepared locally; it has not been applied to the live Supabase project or deployed to production. The live project previously inspected did not have the private KYC bucket or submit function, and the repository candidate differs from this source package. Applying this migration without reconciling the complete live schema and admin function could break production review flows.

Before a staging rollout, reconcile the source against the current repository branch, apply the migration to a staging Supabase project, deploy the submit and updated admin-review functions with JWT verification enabled, test signed uploads and signed review links using test accounts, and capture a backup. Production rollout follows only after those checks pass. Final partner terms must replace the trial draft before approvals are enabled.

Payment merchant binding remains deferred until the remaining application connections and requirements are complete, as requested.
