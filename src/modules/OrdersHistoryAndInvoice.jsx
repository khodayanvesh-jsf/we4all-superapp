import React, { useState } from "react";

export default function OrdersHistoryAndInvoice({ orders = [], serviceBookings = [], onCancelOrder, onReturnOrder, onOpenLiveMap, onTriggerToast }) {
  const [timelineFilter, setTimelineFilter] = useState("ALL");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const handleDownloadPdfInvoice = (ord) => {
    const win = window.open("", "_blank", "width=720,height=800");
    if (!win) {
      if (onTriggerToast) onTriggerToast("Allow popups to download/print your PDF Tax Invoice.");
      return;
    }
    const rows = (ord.items || []).map((it) => `<tr><td style="padding:8px;border:1px solid #cbd5e1;">${it.name}</td><td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">${it.qty || 1}</td><td style="padding:8px;border:1px solid #cbd5e1;text-align:right;">Rs.${it.price}</td><td style="padding:8px;border:1px solid #cbd5e1;text-align:right;">Rs.${(it.price || 0) * (it.qty || 1)}</td></tr>`).join("");
    win.document.write(`<html><head><title>Invoice_${ord.id}</title></head><body style="font-family:Arial,sans-serif;padding:24px;color:#0f172a;"><h2>WE4ALL ADILABAD OFFICIAL TAX INVOICE</h2><p><strong>Order ID:</strong> #${ord.id} | <strong>Date:</strong> ${ord.dateStr || "2026-11-04"} | <strong>Status:</strong> ${ord.status}</p><p><strong>Customer:</strong> ${ord.customerName} | <strong>Address:</strong> ${ord.address}</p><table style="width:100%;border-collapse:collapse;margin-top:12px;"><thead><tr style="background:#f1f5f9;"><th style="padding:8px;border:1px solid #cbd5e1;text-align:left;">Item / Service</th><th style="padding:8px;border:1px solid #cbd5e1;">Qty</th><th style="padding:8px;border:1px solid #cbd5e1;text-align:right;">Price</th><th style="padding:8px;border:1px solid #cbd5e1;text-align:right;">Total</th></tr></thead><tbody>${rows}</tbody></table><h3 style="text-align:right;margin-top:16px;color:#047857;">Grand Total Paid: Rs.${ord.grandTotal}</h3><script>window.print();</script></body></html>`);
    win.document.close();
  };

  const filteredOrders = orders.filter((o) => {
    if (timelineFilter === "CANCELLED_RETURNED") return o.status === "CANCELLED_BY_USER" || o.status === "RETURN_REQUESTED";
    if (timelineFilter === "TODAY") return !o.periodTag || o.periodTag === "TODAY";
    return true;
  });

  return (
    <div className="space-y-2.5 text-xs text-white">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-emerald-400">Orders History &amp; PDF Invoices ({filteredOrders.length + serviceBookings.length})</h3>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {[
          { id: "ALL", label: "All Time" },
          { id: "TODAY", label: "Today" },
          { id: "WEEK", label: "Last 7 Days" },
          { id: "MONTH", label: "This Month" },
          { id: "CANCELLED_RETURNED", label: "Cancelled/Returned" }
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setTimelineFilter(f.id)}
            className={`px-2.5 py-1 rounded-full text-[9px] font-black shrink-0 cursor-pointer ${timelineFilter === f.id ? "bg-emerald-400 text-slate-950" : "bg-slate-900 text-slate-400 border border-slate-800"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredOrders.map((ord) => (
        <div key={ord.id} className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-black text-emerald-400">#{ord.id} &bull; {ord.shopName || "Local Store"}</span>
              <p className="text-[10px] text-slate-400">{ord.dateStr || "2026-11-04"} &bull; {ord.status.replace(/_/g, " ")}</p>
            </div>
            <span className="font-black text-amber-300">Rs.{ord.grandTotal}</span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-[10px] text-amber-300 font-mono">Doorstep OTP: {ord.secretOtp}</span>
            <button
              type="button"
              onClick={() => setExpandedOrderId(expandedOrderId === ord.id ? null : ord.id)}
              className="text-[10px] text-teal-300 underline font-bold cursor-pointer"
            >
              {expandedOrderId === ord.id ? "Hide Bill" : "Full Bill & PDF Invoice"}
            </button>
          </div>
          {expandedOrderId === ord.id && (
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-[10px]">
              {(ord.items || []).map((it, idx) => (
                <div key={idx} className="flex justify-between text-slate-300">
                  <span>{it.qty || 1}x {it.name}</span>
                  <span>Rs.{(it.price || 0) * (it.qty || 1)}</span>
                </div>
              ))}
              <div className="border-t border-slate-800 pt-1 flex justify-between font-bold text-emerald-400">
                <span>Grand Total (Incl. Delivery &amp; 5% GST)</span>
                <span>Rs.{ord.grandTotal}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button type="button" onClick={() => handleDownloadPdfInvoice(ord)} className="bg-amber-400 text-slate-950 font-black py-1.5 rounded-lg cursor-pointer">
                  \uD83D\uDCC4 Download PDF Invoice
                </button>
                <button type="button" onClick={() => onOpenLiveMap && onOpenLiveMap(ord)} className="bg-teal-400 text-slate-950 font-black py-1.5 rounded-lg cursor-pointer">
                  \uD83D\uDDFA\uFE0F Live Route Map
                </button>
                <button type="button" onClick={() => onCancelOrder && onCancelOrder(ord.id)} className="bg-rose-950 text-rose-300 border border-rose-600 font-bold py-1 rounded-lg cursor-pointer">
                  Cancel Order
                </button>
                <button type="button" onClick={() => onReturnOrder && onReturnOrder(ord.id)} className="bg-slate-800 text-slate-200 font-bold py-1 rounded-lg cursor-pointer">
                  Return / Replace
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {serviceBookings.map((sb) => (
        <div key={sb.id} className="bg-slate-900 p-3 rounded-2xl border border-indigo-500/40 space-y-1.5">
          <div className="flex justify-between font-bold">
            <span className="text-indigo-300">Service #{sb.id} &bull; {sb.providerName || sb.maskedId}</span>
            <span className="text-emerald-400">Rs.{sb.finalServiceBill || sb.escrowVisitingAmount}</span>
          </div>
          <p className="text-[10px] text-slate-300">Slot: {sb.bookedDate} ({sb.bookedSlot}) | Happy Code: <strong className="text-amber-300">{sb.happyCode}</strong></p>
        </div>
      ))}
    </div>
  );
}