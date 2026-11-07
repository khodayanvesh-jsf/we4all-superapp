# WE4ALL Cashfree checkout module

## What is in source

- `we4all-create-cashfree-order`: verifies the signed-in approved customer and order, creates a server-priced Cashfree order with UPI selected, and returns a session for hosted checkout.
- `we4all-verify-cashfree-payment`: fetches payment attempts from Cashfree server-to-server and processes only a successful INR payment whose amount matches the saved order.
- `we4all-cashfree-webhook`: verifies Cashfree's `x-webhook-signature` using the exact raw request body and `x-webhook-timestamp`, checks the linked order/amount, then sends a normalized event to the existing idempotent payment processor.
- `we4all_record_cashfree_order`: server-only database function that saves the provider-order link and excludes the payment session ID from the transaction payload.
- Marketplace order history: opens Cashfree hosted checkout and refreshes order state from WE4ALL after the checkout returns.

## Required Edge Function secrets

Set these in the Supabase project secret store. Never add them to frontend `.env` variables, source files, screenshots, or this document.

```text
CASHFREE_CLIENT_ID=<merchant app id>
CASHFREE_CLIENT_SECRET=<merchant secret>
CASHFREE_ENV=sandbox
CASHFREE_API_VERSION=2026-01-01
```

`CASHFREE_ENV` is `sandbox` for test credentials or `production` for approved live credentials. The source defaults to sandbox if it is unset. Both checkout endpoints fail closed if credentials or a valid environment are missing. The webhook URL is derived from `SUPABASE_URL`.

## Database and function rollout

1. The payment-event migration is recorded remotely as `20261107061614_we4all_payment_event_verification`.
2. The Cashfree order-link migration is recorded remotely as `20261107061619_we4all_cashfree_payment_flow`.
3. `we4all-create-cashfree-order`, `we4all-verify-cashfree-payment`, and `we4all-cashfree-webhook` are deployed and active.
4. Configure Cashfree's webhook delivery to the `we4all-cashfree-webhook` function URL and enable payment success/failure notifications.
5. Confirm the deployed frontend uses the Cashfree checkout UI and the correct Supabase project.

The create-order endpoint sends Cashfree `payment_methods: "upi"`; verify this option and the API version in the merchant's current account configuration before deployment. Customer phone is required to create the provider order. The checkout UI uses Cashfree's hosted web SDK, so validate the experience in the target mobile browser or app shell.

## Sandbox verification checklist

Run these only after credentials and deployment are provided by the project owner:

- Approved customer can pay only their own eligible pending order; another user's order is denied.
- Cashfree sandbox opens UPI checkout with the order's exact server-calculated INR amount.
- Success becomes paid only after signed webhook or authenticated Cashfree status retrieval.
- Pending, failed, malformed, wrong amount, wrong currency, unknown provider order, and invalid signature never mark the order paid.
- Duplicate webhook is idempotent; webhook retries are safe.
- Closing checkout and returning later allows server status reconciliation.
- A payment arriving after cancellation or an extra capture surfaces the refund-review state.

## Current rollout status

The two migrations and three functions are deployed to the connected Supabase project. Cashfree credentials and webhook delivery are not configured, and no sandbox or live transaction has been performed. The Vercel preview is built from the reviewed branch; it has not been promoted to production. Easy Split/vendor settlement, refunds, payout/reconciliation screens, receipts, and production commercial approval remain separate owner/product work. This source adapter only collects and verifies a marketplace order payment.

## Provider references

- [Cashfree UPI payments](https://www.cashfree.com/upi-payment-gateway/)
- [Cashfree web checkout](https://www.cashfree.com/devstudio/preview/pg/web/checkout)
- [Cashfree webhook signature verification](https://www.cashfree.com/devstudio/preview/pg/tools/webhookVerification)
- [Cashfree Easy Split overview](https://www.cashfree.com/docs/api-reference/payments/latest/split/easy-split-overview)
