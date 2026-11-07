# WE4ALL order cancellation and stock release

This module lets the verified customer who placed an order cancel it, or its approved merchant decline it, while the order is unpaid. The database changes the order status, releases recorded stock reservations, and writes an audit event in one transaction.

## State and access rules

- Only the order's customer or its approved merchant can cancel it.
- Orders in `awaiting_payment` or `merchant_confirmed` can be cancelled while payment is `pending` or `failed`.
- Payment-authorized or paid orders and accepted/later fulfillment states are blocked. The system does not claim a void, refund, or stock release for an authorized or paid order.
- Each reservation release has a unique idempotency key. Repeated cancellation requests return the existing cancelled state and do not add stock twice.
- The function updates only `we4all_orders`, `we4all_catalog_items`, `we4all_inventory_movements`, and `we4all_audit_events` within the transaction; clients cannot call its database function directly.

## Source files

- `supabase/migrations/20261106185518_we4all_order_cancellation_stock_release.sql`
- `supabase/functions/we4all-cancel-order/index.ts`
- `supabase/config.toml`
- `src/supabaseClient.js`
- `src/modules/OrdersHistoryAndInvoice.jsx`
- `src/modules/MerchantPortal.jsx`

## Deployment note

Apply the prior marketplace and merchant-confirmation migrations first, then apply this migration and deploy `we4all-cancel-order` with JWT verification enabled. This is source-only work; the database was not changed and the function was not deployed. Paid order refunds still require a payment provider and verified refund callback.
