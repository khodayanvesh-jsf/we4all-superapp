# WE4ALL UPI app handoff

## Customer flow

Marketplace orders show **Pay with UPI app**. The button starts an authenticated Cashfree checkout session from the saved server order, loads Cashfree's hosted checkout SDK, and presents Cashfree's UPI options. WE4ALL does not hard-code one UPI app or trust the SDK's browser callback as proof of payment.

After checkout, the app asks the server to query Cashfree's payment status. The order changes to paid only after the server verifies a successful payment, exact INR amount, and matching Cashfree order. If Cashfree still reports pending or does not confirm the payment, the app refreshes the order and tells the customer it remains pending.

The generic direct `upi://pay` endpoint is retained only as disabled legacy source. It is not used by the checkout button, has no configured payee VPA, and cannot verify receipt of funds.

## Payment safety

- Cashfree API credentials remain server-side as Edge Function secrets.
- The payment session ID is returned only to the authenticated order owner and is not saved in the exposed transaction payload.
- Cashfree webhooks are authenticated over the raw request body and timestamp before event parsing.
- Both webhook and post-checkout verification use the same idempotent payment ledger processor.
- A transaction can require manual refund review after a cancelled order or duplicate capture; refund and vendor settlement operations are not implemented in this adapter.

## Source status

Source only. No credentials, Cashfree account, database migration, Edge Function deployment, sandbox transaction, or live payment is configured/performed. See [CASHFREE_CHECKOUT.md](CASHFREE_CHECKOUT.md) for owner setup and deployment requirements.
