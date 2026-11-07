# WE4ALL UPI payment verification path

## Decision

Cashfree is the selected provider for the first UPI checkout adapter. The customer-facing flow opens Cashfree hosted checkout with UPI enabled, where the available UPI applications are presented by Cashfree. The app does not treat a checkout callback, redirect, screenshot, UTR, or client message as payment proof.

## Server flow

1. The signed-in, approved customer asks WE4ALL to start payment for one of their pending marketplace orders.
2. The Edge Function reads the saved order total, creates a Cashfree order using server-held credentials, and records a safe provider-order link in the WE4ALL payment ledger. The payment session ID is returned only to that authenticated customer.
3. The customer completes checkout using Cashfree's UPI option.
4. Cashfree's webhook is accepted only after its signature is checked over the original timestamp and raw request body. The adapter matches the provider order, order, INR amount, and payment ID before calling the idempotent payment-processing RPC.
5. After checkout returns, the app independently asks the WE4ALL server to fetch Cashfree's payments for that order. Only a provider-reported successful payment with exact amount and INR currency can be processed as captured.
6. A cancellation capture or additional capture is recorded for refund review; this integration does not issue refunds or settle marketplace vendors.

Cashfree documents UPI payments through supported UPI apps, an order-backed hosted checkout, server-side payment status retrieval, and signed webhooks. See the implementation notes in [CASHFREE_CHECKOUT.md](CASHFREE_CHECKOUT.md).

## Other routes

| Route | Status |
|---|---|
| Cashfree checkout with UPI | Selected and implemented in source; sandbox credentials and deployment are still required for verification. |
| Generic direct UPI intent to a VPA | Retained as disabled source only; it cannot confirm payment and is not used by the checkout button. |
| PayU or acquiring-bank API | Not selected or implemented. |
| Customer-entered UTR or screenshot | Never sufficient to auto-mark an order paid. |

## Before enabling live payments

- Complete Cashfree merchant onboarding and confirm UPI collection eligibility, account terms, settlement, refund, and marketplace vendor payout arrangements.
- Supply Cashfree sandbox credentials and configure the Edge Function secrets described in `CASHFREE_CHECKOUT.md`.
- Apply the payment-event and Cashfree-order migrations, then deploy the three Cashfree functions.
- Verify sandbox success, failure, pending/late status, wrong amount, duplicate delivery, webhook retry, order cancellation, and reconciliation after a customer returns.
- Confirm Cashfree's current API version, credentials, and product setup in the merchant account before a live rollout.

## Current source state

Cashfree source code is implemented locally. The UPI app handoff and generic reconciliation foundation remain in the codebase; the checkout UI now uses Cashfree. No Cashfree secrets, merchant onboarding, database migration, Edge Function deployment, sandbox transaction, or live payment was performed. Until those owner-controlled steps are complete, payment checkout fails closed with a configuration error.
