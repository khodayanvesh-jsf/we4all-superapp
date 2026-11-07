# WE4ALL deployment drift audit

Audit performed against the connected WE4ALL Supabase and Vercel projects on 2026-11-07. This is a read-only comparison; no remote changes were made.

## Source and hosting mismatch

- The prepared source bundle is version 3.3.0 and contains the Cashfree checkout adapter.
- The connected GitHub default branch currently reports version 3.2.7. The Vercel deployment is linked to that GitHub source, not to this extracted source bundle.
- The current GitHub source contains hard-coded founder login defaults. Do not publish that branch unchanged. Remove the defaults, verify the current owner authentication path, and rotate any credentials that may have been used.
- The current GitHub order-history screen does not contain the server-backed marketplace checkout UI from the prepared source.

## Supabase state

- The connected project has marketplace order/payment tables, but its migration history stops before the local merchant-confirmation, cancellation, payment-event, and Cashfree-order migrations.
- The project has active `we4all-payment` and `we4all-razorpay-webhook` functions. Their presence is separate from this Cashfree implementation; no Razorpay function was modified or removed.
- The live payment ledger has a unique `(provider, provider_order_id)` index. Cashfree capture events therefore leave that ID on the order-link row and store the captured payment row by payment ID.
- The Cashfree functions and migrations in this package have not been deployed or applied. No Cashfree secrets or sandbox transaction were configured by this work.

## Release sequence

1. Choose the canonical app source: merge the prepared 3.3.0 project into the connected repository or explicitly keep the existing 3.2.7 source.
2. Remove the hard-coded founder login defaults and rotate potentially exposed credentials through the owner's secure account controls.
3. Install project dependencies and complete a build plus integration checks against a Supabase staging project and Cashfree sandbox account.
4. Apply the pending migrations and deploy the Cashfree functions to staging; configure Cashfree webhook delivery and verify payment, failure, duplicate, amount mismatch, and cancellation cases.
5. Only after those checks, make the single reviewed GitHub/Vercel release and then configure live payment credentials under owner control.

No production code, database schema, secrets, or payment configuration was changed during this audit.
