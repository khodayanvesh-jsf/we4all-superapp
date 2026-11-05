# WE4ALL Supabase Connection

## What is connected

- Browser client: `@supabase/supabase-js` using the project URL and publishable key.
- Authentication: Supabase Phone OTP (SMS); no local PIN or browser-generated OTP is used.
- Session restoration: every restored user is revalidated with `supabase.auth.getUser()`.
- Per-user cloud backup: the authenticated app calls the `we4all-sync` Edge Function.
- Backend sync: `supabase/functions/we4all-sync/index.ts` uses `@supabase/server` 1.9.2 with `auth: "user"`, validates the bearer JWT, and reads/writes only the caller's `we4all_user_state` row.
- RLS: profiles, account state, role records, partner applications, and media uploads are owner-scoped.
- Legacy global API: `/api/sync` is retired and returns HTTP 410. Legacy state/order rows are preserved, but direct anonymous access is revoked.

## Frontend environment

Copy `.env.example` to `.env.local` for local development and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

For Vercel, add the same two values in Project Settings → Environment Variables for Preview and Production, then redeploy. These are publishable frontend values; they are not secrets.

## Secret-key handling

A Supabase secret key was pasted into a chat during setup. Treat that key as exposed and rotate/delete it in Supabase Project Settings → API Keys immediately. It has not been added to source, the browser bundle, or this repository. Do not use `VITE_SUPABASE_SECRET_KEY`. Edge Functions receive managed server-side secrets from Supabase. The current sync function uses the verified user's RLS-scoped client and does not need the secret key for account-state operations.

## Phone OTP prerequisite

Enable Phone under Supabase Authentication → Sign In / Providers and configure an SMS provider and template. Until the provider is enabled and configured, the app will surface the provider error returned by Supabase; it will not invent or display an OTP.

## Data boundaries and remaining production work

The original `we4all_town_state` snapshot has been preserved (one legacy row; 28 top-level keys at audit time) and its public access revoked. It is not automatically assigned to a user because its historical records have no reliable owner identity.

The current cloud backup stores each signed-in user's app state in a private row. It does **not** yet provide cross-user marketplace sharing for products, merchant inventory, service bookings, orders, dispatch jobs, financial settlements, or Founder approval. Those workflows need normalized shared tables and server-side business transitions; do not treat the per-user JSON backup as a production multi-merchant transaction ledger.

Partner applications are stored as pending records. Automatic partner approval is intentionally not granted. A secure Founder review endpoint and provisioning of the trusted Founder Auth role are still required before partner applications can be approved from the app.
