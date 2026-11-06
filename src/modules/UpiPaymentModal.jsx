import React, { useMemo, useState } from "react";

/**
 * Opens a server-prepared UPI destination when one is supplied.
 *
 * IMPORTANT: launching a UPI app is not evidence of a successful payment.
 * This component intentionally has no "payment succeeded" callback. A trusted
 * payment-provider webhook/reconciliation service must update the order status.
 */
export default function UpiPaymentModal({ paymentRequest, onClose }) {
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const intent = { ok: false, amount: Number(paymentRequest?.amount || 0), payeeVpa: "", reason: "Online payments are temporarily paused to avoid paid-provider charges. No payment was started." };

  if (!paymentRequest) return null;

  const handleOpenUpi = () => {
    if (!intent.ok || launching) return;
    setLaunchError("");
    try {
      const link = document.createElement("a");
      link.href = intent.url;
      link.setAttribute("aria-hidden", "true");
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setLaunching(true);
    } catch (error) {
      setLaunching(false);
      setLaunchError("Could not open a UPI app on this device. Your order has not been marked as paid.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="we4all-payment-title"
        className="bg-slate-900 border-2 border-emerald-400 rounded-3xl max-w-sm w-full p-4 space-y-3 text-white shadow-2xl"
      >
        <div className="flex justify-between items-start gap-3 border-b border-slate-800 pb-2">
          <div>
            <h3 id="we4all-payment-title" className="font-black text-emerald-400 text-sm">
              Payments temporarily paused
            </h3>
            <p className="text-[10px] text-slate-400">{paymentRequest.title || "WE4ALL order"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex justify-between items-center gap-3">
          <div>
            <p className="text-[10px] text-slate-400">Order amount</p>
            <p className="text-lg font-black text-amber-400">
              {intent.amount === null ? "Amount unavailable" : `₹${intent.amount.toFixed(2)}`}
            </p>
          </div>
          <div className="text-right min-w-0">
            <p className="text-[10px] text-slate-400 font-bold">Payment destination</p>
            <p className="text-[11px] font-mono text-slate-200 break-all">
              {intent.payeeVpa || "Not configured"}
            </p>
          </div>
        </div>

        {!intent.ok && (
          <div className="bg-amber-950/60 border border-amber-500/60 p-3 rounded-xl space-y-1">
            <p className="text-amber-300 text-xs font-black">Online payments are temporarily disabled</p>
            <p className="text-[11px] text-amber-100/90">{intent.reason}</p>
            <p className="text-[10px] text-slate-300">
              Your order remains unpaid. WE4ALL will not send money to a placeholder or unverified UPI ID.
            </p>
          </div>
        )}

        {intent.ok && (
          <>
            <button
              type="button"
              onClick={handleOpenUpi}
              disabled={launching}
              className="w-full bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 text-slate-950 font-black py-3 rounded-2xl cursor-pointer text-xs"
            >
              {launching ? "UPI app opened" : "Open UPI app"}
            </button>
            <p className="text-[10px] text-slate-300">
              WE4ALL is operating in no-paid-services mode. Do not transfer money outside the app for this request. Orders remain unpaid and unconfirmed.
            </p>
          </>
        )}

        {launchError && (
          <p role="alert" className="bg-rose-950 border border-rose-500 text-rose-200 p-2 rounded-xl text-[11px]">
            {launchError}
          </p>
        )}

        {launching && (
          <div role="status" className="bg-sky-950/60 border border-sky-500/50 p-2 rounded-xl text-sky-200 text-[11px]">
            Payments are paused. No payment has been initiated and no order or escrow status has been changed.
          </div>
        )}
      </section>
    </div>
  );
}
