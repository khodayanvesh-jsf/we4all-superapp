# WE4ALL online testing setup — Windows / VS Code

## Local setup
1. Extract the source and open the project root in VS Code.
2. Copy `.env.example` to `.env.local`.
3. Keep only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the frontend environment file. Never put a Supabase secret/service-role key into a Vite variable.
4. Run:
```powershell
npm ci
npm test
npm run dev
```

## First live test sequence
The current live database has no customer profiles, approved merchant profiles, catalogue items or orders. Use only phone numbers and merchant details you control for testing.
1. Register a customer using Supabase SMS OTP. The Auth trigger creates the customer profile and approved customer role.
2. Register a merchant. Its application remains pending.
3. Use the provisioned Founder Admin account to approve that merchant application. The backend review creates its `we4all_partners` row.
4. Sign in again as the approved merchant. The app resolves the server-created `partnerId`.
5. Submit a product. It is saved in `we4all_catalog_items` as pending with zero stock. The Founder product-approval UI is still a remaining module.
6. After product approval, update stock in the Merchant Stock tab. The server writes the new quantity and `we4all_inventory_movements` record.
7. Sign in as the customer, refresh the store and add the approved, in-stock product.
8. Checkout is limited to one merchant. Server-side price/stock validation creates a shared order with `awaiting_payment` and payment `pending`.

## Current limits
- Payment capture/refunds/payouts are not connected. No real payment is taken by this flow.
- Order acceptance, rider dispatch, GPS and delivery OTP remain disabled until their server modules are finished.
- Booking, decorator/hall and labour transactions remain future modules.
- Founder product approval UI remains to be implemented.
- `we4all-media` is public-read. Use it only for public listing images; private KYC/bank documents need a separate private bucket and RLS policies.

## Safe test
Use one owner-controlled customer, one approved test merchant, one listing and a small quantity. Inspect the order and inventory rows in Supabase Table Editor. Never accept real money or promise live delivery until payment and dispatch modules pass end-to-end testing.