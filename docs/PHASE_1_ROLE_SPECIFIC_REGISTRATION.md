# Phase 1 — role-specific registration

## Changes

- Added role-specific application fields for product merchants, home service providers, decorators/function halls, delivery captains, and labour partners.
- Added validation for required trade/shop/vehicle fields, Mistri Toli minimum size, hall capacity, and non-negative numeric values.
- Saves role details in the pending partner application payload. It does not save bank credentials or bind a payment gateway.
- Clears role-specific values and any previously requested OTP when the applicant switches roles.
- Replaced the four-character area limit with a 100-character address/area field.
- Added progress guidance and a plain-language notice that payment account setup is a later step.

## Verification

- `npm test`: 85 passed, 0 failed.
- `npm run build`: passed. Vite emitted a chunk-size advisory for the 697.59 kB main bundle.
- `npx cap sync android`: passed; web assets and Capgo plugin synchronized.
- Android debug APK: not built. The Gradle wrapper could not download Gradle 8.14.3 because network access to `services.gradle.org` is unavailable in this environment.
- No Supabase migration/function or Vercel deployment was performed in this phase.

## Remaining integration gates

- The connected repository candidate branch does not contain the archived KYC/signature source in this package; do not overwrite or promote that branch without reconciling the full source tree.
- The inspected live Supabase project does not list the private KYC bucket or `we4all-submit-partner-kyc` function. KYC upload remains unavailable until the reviewed migration and function are applied to a reconciled staging environment and tested.
- The current production Vercel deployment is from a different `main` commit than this source snapshot. This local build has not been deployed.
- Merchant payment account binding remains intentionally deferred.
