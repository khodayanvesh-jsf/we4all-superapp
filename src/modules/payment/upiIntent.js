const VPA_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{1,255}@[A-Za-z0-9][A-Za-z0-9.-]{1,63}$/;

/**
 * Builds a UPI intent only when the order carries an explicitly verified VPA.
 * This is a client-side display/launch guard, not payment verification.
 * The server must still verify provider callbacks before changing order status.
 */
export function buildUpiIntent(paymentRequest) {
  const amountValue = Number(paymentRequest?.amount);
  const amount = Number.isFinite(amountValue) && amountValue > 0
    ? Number(amountValue.toFixed(2))
    : null;
  const payeeVpa = String(paymentRequest?.payeeVpa || "").trim();

  if (amount === null) {
    return { ok: false, amount: null, payeeVpa, reason: "A valid order amount is required." };
  }
  if (!VPA_PATTERN.test(payeeVpa) || paymentRequest?.payeeVpaVerified !== true) {
    return {
      ok: false,
      amount,
      payeeVpa: VPA_PATTERN.test(payeeVpa) ? payeeVpa : "",
      reason: "A verified merchant or WE4ALL payment destination has not been configured for this order."
    };
  }

  const params = new URLSearchParams({
    pa: payeeVpa,
    pn: String(paymentRequest?.payeeName || "WE4ALL").trim().slice(0, 80),
    am: amount.toFixed(2),
    cu: "INR",
    tn: String(paymentRequest?.title || "WE4ALL order").trim().slice(0, 80)
  });

  return {
    ok: true,
    amount,
    payeeVpa,
    url: `upi://pay?${params.toString()}`
  };
}
