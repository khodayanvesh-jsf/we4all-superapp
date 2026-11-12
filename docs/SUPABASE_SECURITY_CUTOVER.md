# WE4ALL Supabase security cutover plan (review only — NOT applied)

Project: bdmbziwazpuzbukazmug (we4allsuperapp, eu-north-1)

**Status:** inspection only. No live policies, grants, tables, rows, extensions or storage buckets were changed during this audit.

## Current live findings

- Public tables: public.we4all_town_state (1 row) and public.we4all_orders_ledger (0 rows).
- No recorded schema migrations; no Edge Functions; PostGIS is available but not installed.
- Both tables have RLS enabled, but anon and authenticated have broad table grants.
- we4all_orders_ledger has a public unconditional FOR ALL RLS policy (USING true, WITH CHECK true).
- we4all_town_state has public unconditional SELECT, INSERT and UPDATE policies.
- The repository's current api/sync.js accepts a whole application JSON snapshot, accepts caller-supplied Supabase URL/key, uses a process-memory fallback and can return ok: true even when database persistence failed.

This is not a secure multi-tenant application storage design. RLS enabled does not protect data when an unconditional public policy grants all rows.

## Why no immediate revoke was run

The current released app still depends on the anonymous whole-state sync path. Revoking its access before a replacement authenticated server API exists would break existing app sync, and the current state payload cannot be safely shared with every authenticated customer or partner. We must not trade a security exposure for an undocumented production outage.

## Required target architecture

1. Supabase Auth (or another trusted identity provider) issues signed sessions; the server validates the JWT and resolves the account's role/zone from server-controlled authorization data (never user-editable user_metadata).
2. The server uses a server-only secret key; no service-role/secret key is included in Vite variables, localStorage, APK assets, or requests controlled by the browser.
3. Replace we4all_town_state as a global user-data bus with domain tables for profiles, partner memberships, catalogues, inventory, carts, orders, service bookings, decor/hall bookings, dispatch, labour attendance, payments, payouts and audit events.
4. Every exposed table has RLS and grants suited to its access model. Policies use explicit TO authenticated plus ownership, membership, role and zone predicates; UPDATE policies include both USING and WITH CHECK.
5. Public product catalogue fields are separated from private contact, KYC, bank, payment and identity fields. Private object storage uses ownership-scoped paths and short-lived signed URLs.
6. Payment status, escrow, refunds and settlements are only changed by server-verified provider callbacks or authorized operations. Writes are idempotent and transactional.
7. Add migration history, restore-tested backups, audit trails, retention policies and integration tests before cutover.

## Cutover sequence

### A. Prepare and prove the replacement (no production break)

- Export/backup the two existing tables and verify the backup can be restored into a separate staging project.
- Build the authenticated server API and staging schema, plus RLS tests for every user role.
- Migrate a copy of the current state_payload into the normalized schema with a reconciliation report; do not delete or overwrite the legacy row.
- Update the app to use the new endpoints. Test customer, merchant, service provider, decorator, rider, labour and founder flows on staging.
- Confirm the old app's compatibility plan: existing v3.2.7 installs either remain isolated behind a controlled sunset window or are prompted to upgrade; do not leave a public legacy data bus indefinitely.

### B. Back up before locking legacy endpoints

The following is an illustrative DBA-reviewed SQL sequence. It is **not** executed by this document. Confirm storage/backup plan and actual names before use.

```sql
-- Use a private schema not exposed through the Supabase Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Preserve the exact current rows before changing access controls.
create table if not exists private.we4all_town_state_backup_20261106
  as table public.we4all_town_state;
create table if not exists private.we4all_orders_ledger_backup_20261106
  as table public.we4all_orders_ledger;

revoke all on private.we4all_town_state_backup_20261106
  from public, anon, authenticated;
revoke all on private.we4all_orders_ledger_backup_20261106
  from public, anon, authenticated;
```

Verify backup row counts, table definitions, primary keys and a restore into a separate staging project before proceeding.

### C. Lock public legacy access only after new API is live and verified

The following is the expected end-state for legacy tables **only after** all current clients have moved to the replacement server API. It will intentionally disable old anonymous client sync.

```sql
drop policy if exists "Allow public all we4all_orders_ledger"
  on public.we4all_orders_ledger;
drop policy if exists "Allow public read we4all_town_state"
  on public.we4all_town_state;
drop policy if exists "Allow public update we4all_town_state"
  on public.we4all_town_state;
drop policy if exists "Allow public write we4all_town_state"
  on public.we4all_town_state;

revoke all on table public.we4all_orders_ledger from anon, authenticated;
revoke all on table public.we4all_town_state from anon, authenticated;

-- The replacement server must use a server-only secret key and verified auth.
-- Do not grant direct service-role access to browser clients.
```

This sequence must be delivered as a reviewed, versioned migration with explicit rollback steps. It is not safe to apply before the replacement API and mobile client have passed staging tests.

## Verification checklist

- Anonymous requests cannot select, insert, update, delete or truncate business data.
- A customer cannot read another customer's addresses, orders, sessions or payment details.
- A partner can see only their own listings/bookings/settlements and only authorized zone data.
- Founder actions require a server-verified founder role and step-up authentication and are audit logged.
- Cross-role IDOR tests fail.
- Private KYC/bank objects cannot be fetched by another account or via permanent public URLs.
- Payment webhook signatures are validated; duplicate/out-of-order callbacks are idempotent.
- Backup restore and legacy data reconciliation are evidenced.
- Supabase security advisors and role-specific RLS integration tests pass after migration.

## Launch implication

Until this cutover is complete, do not enable public payments, KYC document uploads, escrow, automated wage release, sensitive order visibility or background rider location collection. A green Vercel preview is not evidence that database authorization is safe.
