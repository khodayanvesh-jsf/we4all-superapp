# WE4ALL payment event verification

## Step 7 scope

This module adds a server-side, provider-neutral path for accepting verified payment outcomes for marketplace orders. It records the signed event, makes repeated provider event IDs idempotent, checks the order reference and exact amount in paise, updates the order/payment state, and records an audit event. Customer invoices for server-managed orders remain unavailable until the server reports verified payment.

This migration and endpoint remain the provider-neutral event-processing layer. The Cashfree adapter uses Cashfree's native signature verification and server status API, then invokes this same database processor directly. The generic relay endpoint remains available for a future provider that can authenticate payment outcomes. See `docs/CASHFREE_CHECKOUT.md` and `docs/UPI_APP_HANDOFF.md`.

## Signed event contract

The upstream provider adapter must first validate the provider's native webhook signature. It then sends this normalized JSON object to `POST /functions/v1/we4all-payment-webhook`:

```json
{
  "schemaVersion": 1,
  "provider": "provider-key",
  "eventId": "provider-event-id",
  "eventType": "payment.captured",
  "issuedAt": 1794000000,
  "orderId": "00000000-0000-4000-8000-000000000000",
  "orderReference": "WE4ALL-ORDER-REFERENCE",
  "paymentId": "provider-payment-id",
  "providerOrderId": "provider-order-id",
  "amountPaise": 12500,
  "currency": "INR"
}
```

`eventType` is `payment.captured` or `payment.failed`. `providerOrderId` can be `null`. `amountPaise` must be a positive integer and exactly match the server order total. `issuedAt` is a Unix timestamp in seconds; events older than five minutes or more than five minutes in the future are rejected.

The adapter signs the exact UTF-8 request body bytes with HMAC-SHA256 using the shared `WE4ALL_PAYMENT_WEBHOOK_SECRET` and sends `x-we4all-signature: v1=<64 hex characters>`. Retries must be signed with a fresh `issuedAt`. The edge function compares signatures before parsing values into the database RPC. Provider event IDs are deduplicated by `(provider, eventId)`.

## Server configuration

Configure these as Supabase Edge Function secrets, never in frontend variables or source control:

```text
WE4ALL_PAYMENT_PROVIDER
WE4ALL_PAYMENT_WEBHOOK_SECRET
```

The secret must contain at least 32 bytes. `WE4ALL_PAYMENT_PROVIDER` must match the normalized `provider` field. The endpoint returns `503` if these values are missing or invalid. The endpoint has JWT verification disabled because the external caller is authenticated by the HMAC in the handler; keep the handler signature check enabled.

## Response and order behavior

- `200`: verified event processed or recognized as a duplicate.
- `202`: signature is valid and event was stored, but the order or payment reference needs reconciliation.
- `400`, `401`, `413`: malformed event, invalid/stale signature, or oversized request.
- `503`: payment webhook is not configured.
- `500`: the database operation failed; the sender should retry with a fresh timestamp and the same event ID.

Captured events set the payment transaction to `captured` and the order to `paid`. A capture after cancellation is flagged `CAPTURED_AFTER_CANCELLATION_REFUND_REVIEW_REQUIRED`; this module does not send a refund. Failed events cannot downgrade an already-paid order. Invoices for cancelled, refunded, or disputed server orders are blocked in the app.

## Deployment checklist

1. Cashfree is selected for the first UPI checkout adapter. Complete merchant onboarding and configure its server-only secrets as described in `docs/CASHFREE_CHECKOUT.md`.
2. Review and apply the payment-event migration and Cashfree order-link migration when the authenticated order backend is ready.
3. Deploy the Cashfree order, status-verification, and native webhook functions.
4. Verify event deduplication, amount/reference matching, delayed failure after capture, and capture-after-cancellation review in sandbox before enabling live payments.

None of these deployment steps were performed for this source step. No provider credentials, admin credentials, or live customer payment data are included here.
