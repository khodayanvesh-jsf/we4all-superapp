# WE4ALL deployment drift audit

Audit and rollout performed against the connected WE4ALL Supabase and Vercel projects on 2026-11-07.

## Source and hosting

- The prepared source is version 3.3.0 and is the selected deployment source.
- The GitHub default branch before this review reported version 3.2.7 and contained hard-coded founder login defaults plus a tracked pre-launch state backup. The reviewed branch replaces the older source, removes those defaults, and omits the tracked backup.
- The Vercel preview is built from the reviewed GitHub branch and returned HTTP 200. It has not been promoted to production.

## Supabase state

- The project has active marketplace order/payment tables and an additional unique `(provider, provider_order_id)` index. Cashfree keeps its provider-order link on the order-link row and records each captured payment by payment ID.
- The payment-event migration is recorded as `20261107061614_we4all_payment_event_verification`; the Cashfree order-link migration is `20261107061619_we4all_cashfree_payment_flow`.
- The three Cashfree functions are active: `we4all-create-cashfree-order`, `we4all-verify-cashfree-payment`, and `we4all-cashfree-webhook`.
- Existing `we4all-payment` and `we4all-razorpay-webhook` functions remain active and were not modified. No Cashfree secrets or webhook destination are configured, and no sandbox or live transaction was performed.

## Remaining release sequence

1. Remove the hard-coded founder login defaults from the GitHub default branch by reviewing and merging the prepared source. Rotate any credentials that may have been used through the owner's secure account controls.
2. Configure Cashfree sandbox credentials and webhook delivery in Supabase's secret store; never put them in browser code or source control.
3. Verify sandbox success, failure, pending, duplicate delivery, amount mismatch, webhook retry, and cancelled-order behavior.
4. Review the Vercel preview and complete any remaining Supabase function/migration rollout required by other app modules.
5. After verification, merge the reviewed source and configure approved production Cashfree credentials under owner control.

No live payment was processed and the Vercel preview was not promoted to production.
