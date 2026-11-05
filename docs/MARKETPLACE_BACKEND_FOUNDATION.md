# WE4ALL marketplace backend foundation

Live Supabase migrations (project `we4allsuperapp`):
- `20261105231605_we4all_marketplace_operational_foundation`
- `20261105231651_we4all_marketplace_rls_policy_consolidation`

These are additive, backward-compatible migrations. The legacy town-state/order-ledger tables and existing account data were not deleted or rewritten.

## Domain model added

| Domain | Tables | Initial access model |
|---|---|---|
| Partner registry | `we4all_partners` | Owner can create/read only; status defaults pending and cannot be self-approved |
| Merchant catalogue | `we4all_catalog_items` | Public can read approved/active items; owner manages own listings; stock/approval fields are server-controlled |
| Inventory ledger | `we4all_inventory_movements` | Server-only write ledger with idempotency key |
| Customer orders | `we4all_orders`, `we4all_order_items` | Participant-only reads; all writes must use an authenticated server transaction |
| Service / decorator / hall bookings | `we4all_bookings` | Customer may submit a pending request against an approved matching partner; price/status lifecycle server-controlled |
| Rider dispatch | `we4all_dispatch_jobs` | Customer and assigned rider may read; assignment, OTP and state changes server-only |
| Labour | `we4all_labour_engagements`, `we4all_labour_attendance` | Customer may request; attendance and wage-release writes server-only |
| Payments | `we4all_payment_transactions`, `we4all_payment_webhook_events` | Customer/partner participant reads; provider callback and payment state writes server-only |
| Audit | `we4all_audit_events` | Server-only writes; no public or authenticated raw access |

## Security rules

- RLS is enabled on every new public table.
- No user can self-approve a partner, catalogue listing, payment, order, dispatch assignment or wage settlement.
- Order, inventory, dispatch, attendance, payment, webhook and audit ledgers have no direct authenticated insert/update grants.
- Business and finance mutations must be implemented in server-controlled Edge Functions or RPCs with validated user JWTs, idempotency, transaction boundaries and provider verification.
- Multiple participant SELECT policies were consolidated into one policy per table/action.
- Existing legacy tables with RLS and no policy remain deliberately deny-by-default. Do not reintroduce broad public policies.

## Not yet production-connected

The current React portals still need their UI handlers migrated from in-memory arrays/local state to these database APIs. The migrations do not by themselves implement checkout, payment gateway webhooks, stock reservations, time-slot locking, rider dispatch, GPS or wage payouts. Those flows must be added and tested before the corresponding portal is enabled for live transactions.
