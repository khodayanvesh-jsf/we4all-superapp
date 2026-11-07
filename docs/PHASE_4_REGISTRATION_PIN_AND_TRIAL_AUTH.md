# Phase 4 — registration, PIN sign-in, and trial OTP

## User flows

- The public role list is read from `we4all_registration_roles`, which the Founder controls in Admin Console → Admin Credentials & Data Server. Only defined roles exist; there is no “Other” option. Consumer registration is required to remain enabled.
- Registration validates the role fields, sends a phone OTP, verifies it with Supabase Auth, then saves the new 6-digit PIN as the Supabase Auth password. Normal login uses the phone number and PIN. OTP is available for first-time PIN setup and PIN recovery.
- Partner applications remain pending until the existing private KYC, required document, terms, signature, checklist, and Founder review flow completes.
- Native Android/iOS biometric confirmation is optional and requires the user to enable it in account security. It is applied after PIN sign-in; PIN remains the fallback. Web preview does not claim biometric support.
- Founder credential updates are in the authenticated Admin Console and require an AAL2/TOTP session. The Founder can update the Supabase sign-in email and a 12+ character password; email changes require confirmation. Founder role assignment remains server-managed. Do not use a short PIN as the Founder password or as a substitute for TOTP.

## No-SMS trial mode

The Edge Function `we4all-trial-otp-auth` generates a random six-digit code server-side and keeps only a peppered hash. Codes expire after two minutes, allow at most five verification attempts, and are limited to three requests per phone per hour. Verification consumes the challenge atomically before creating a confirmed Supabase user and issuing a session.

The client reveals the code only if its preview build uses `VITE_WE4ALL_TRIAL_OTP_MODE=true`. The server function is disabled unless all of these server-side settings are present:

- `WE4ALL_TRIAL_OTP_ENABLED=true`
- `WE4ALL_TRIAL_OTP_ENV=preview`
- `WE4ALL_TRIAL_OTP_PEPPER` set to a unique random secret of at least 32 characters

Use dummy identities and test data in this mode. The code is returned to the same device because there is no SMS provider, so it does **not** prove phone ownership. The admin review Edge Function blocks approval of partner accounts created this way. Disable the trial flags and configure a real phone verification provider before real users are registered. Never commit the pepper or server service-role key.

## Deployment order and verification limits

1. Apply migrations `20261107180000_we4all_trial_otp_auth.sql` and `20261107180100_we4all_registration_role_controls.sql` to a staging database only after the schema baseline is reconciled.
2. Deploy `we4all-trial-otp-auth` with its server-only trial secrets, `verify_jwt=false`, and enable the Vite flag only for a private preview build.
3. Test OTP expiry, reuse, attempt/rate limits, account creation, PIN login, partner KYC, Founder role toggles, and MFA-protected credential changes.
4. Build and test on physical Android/iOS devices with biometrics enrolled; a browser preview cannot verify native biometric hardware.
5. Turn trial OTP off before any real-user launch. Payment gateway work remains deferred.

The source changes are prepared for review. The database migration and Edge Function are not deployed to Supabase, since its migration history still needs reconciliation and no staging branch has been created.
