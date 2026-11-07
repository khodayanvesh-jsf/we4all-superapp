# WE4ALL server-backed merchant order confirmation

This module connects single-merchant customer checkout to the existing marketplace order tables, lets an approved merchant confirm availability through a server function, and exposes the resulting status to the customer and merchant order screens.

## Flow

1. Checkout accepts only signed-in customer accounts and catalogue item IDs linked to one merchant. The client sends item IDs and quantities; the database calculates item prices and reserves available stock.
2. New orders start with `status = awaiting_payment` and `payment_status = pending`. Checkout uses a per-attempt idempotency key and retries reuse that key.
3. The merchant order list reads orders through the existing participant RLS policies. The merchant confirmation function verifies the user JWT, approved merchant role, partner ownership, and current order state before changing the status.
4. A pending order becomes `merchant_confirmed`; this confirms availability only. When a trusted payment integration sets `payment_status = paid`, merchant confirmation advances the order to `accepted`. The function never marks payment as paid.
5. Customer and merchant screens refresh server order records every 15 seconds. Customer invoices remain disabled until the server reports `payment_status = paid`. Live tracking remains disabled until a dispatch assignment exists.

## Source files

- `supabase/migrations/20261106183804_we4all_merchant_order_confirmation.sql`
- `supabase/functions/we4all-merchant-confirm-order/index.ts`
- `supabase/config.toml`
- `src/supabaseClient.js`
- `src/App.jsx`
- `src/modules/MerchantPortal.jsx`
- `src/modules/OrdersHistoryAndInvoice.jsx`

## Apply and deploy later

This package contains source only. Before deployment, verify the earlier marketplace migrations are present in the target database, then apply this migration and deploy `we4all-merchant-confirm-order`. Keep `verify_jwt = true`; the function also uses Supabase's authenticated-user context and server-side database client. Do not expose service-role credentials in the app bundle.

This module does not configure a payment provider or webhook. Orders can be created and acknowledged, but they remain unpaid until an independently verified payment integration updates the payment record. It also supports one merchant per checkout; split multi-merchant carts are not implemented here.
