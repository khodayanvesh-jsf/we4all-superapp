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


## First server-side checkout transaction (deployed)

- Edge Function `we4all-create-order` is deployed with JWT verification enabled.
- The Edge Function verifies the supplied access token through Supabase Auth, then confirms the caller has an approved `customer` role.
- Only after those checks does it invoke the database transaction using a server-side service-role client. The service-role key is read from Supabase-managed Edge Function environment variables and is never returned to the mobile client.
- The database function is executable only by `service_role`; anonymous and authenticated direct calls are revoked. Its search path is empty and all application objects are schema-qualified.
- It verifies the merchant is approved, validates unique catalogue item IDs and quantities, locks approved active catalogue rows, calculates price from the database, checks available stock and writes order + line items + inventory reservation atomically. Retries with the same customer/idempotency key return the existing order.
- New order status is `awaiting_payment` and payment status is `pending`. Tax and delivery fee are zero placeholders until correct merchant tax setup and live delivery quote configuration exist. The function does not mark payment complete, create a dispatch assignment, or settle a payout.
- The client helper `createMarketplaceOrder` is ready to call the Edge Function, but the customer UI checkout and merchant product-publishing flows still need to be connected to the normalized catalogue IDs/partner IDs. Do not expose the existing local checkout draft as a completed server order.


## Founder catalogue approval

Live merchant product submissions are written to `we4all_catalog_items` as `approval_status=pending`, `is_active=false`, `stock_quantity=0`. Founder Admin's Live Supabase catalogue queue calls `we4all-admin-review` actions `list_products` and `review_product`. The Edge Function checks trusted `app_metadata.we4all_role=founder`, then executes service-role-only `we4all_review_catalog_item`. Approval makes the listing active, but does not add stock; the merchant must use the server inventory adjustment flow. Rejections remain hidden. The transaction also writes an audit event.
