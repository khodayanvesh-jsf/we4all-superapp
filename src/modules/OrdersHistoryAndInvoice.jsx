import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  cancelMarketplaceOrder,
  createCashfreeCheckoutOrder,
  listMarketplaceOrders,
  verifyCashfreeCheckoutPayment
} from "../supabaseClient";

let cashfreeSdkPromise;

function loadCashfreeSdk() {
  if (window.Cashfree) return Promise.resolve(window.Cashfree);
  if (!cashfreeSdkPromise) {
    cashfreeSdkPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-we4all-cashfree="true"]');
      const script = existing || document.createElement("script");
      const fail = () => {
        cashfreeSdkPromise = null;
        reject(new Error("Cashfree checkout could not be loaded. Check your connection and try again."));
      };
      script.addEventListener("load", () => window.Cashfree ? resolve(window.Cashfree) : fail(), { once: true });
      script.addEventListener("error", fail, { once: true });
      if (!existing) {
        script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
        script.async = true;
        script.dataset.we4allCashfree = "true";
        document.head.appendChild(script);
      }
    });
  }
  return cashfreeSdkPromise;
}

export default function OrdersHistoryAndInvoice({
  orders = [],
  serviceBookings = [],
  customerId,
  labourBookings = [],
  onCancelOrder,
  onReturnOrder,
  onOpenLiveMap,
  onTriggerToast
}) {
  const [timelineFilter, setTimelineFilter] = useState("ALL");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [marketplaceOrders, setMarketplaceOrders] = useState([]);
  const [cancellingOrderId, setCancellingOrderId] = useState("");
  const [payingOrderId, setPayingOrderId] = useState("");
  const toastRef = useRef(onTriggerToast);

  useEffect(() => {
    toastRef.current = onTriggerToast;
  }, [onTriggerToast]);

  useEffect(() => {
    let active = true;
    let hasReportedError = false;
    const refreshOrders = async () => {
      try {
        const liveOrders = await listMarketplaceOrders();
        if (active) {
          setMarketplaceOrders(liveOrders);
          hasReportedError = false;
        }
      } catch (error) {
        if (active && !hasReportedError && toastRef.current) {
          toastRef.current(error?.message || "Could not refresh server orders.");
          hasReportedError = true;
        }
      }
    };
    refreshOrders();
    const timer = window.setInterval(refreshOrders, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const displayOrders = useMemo(() => {
    const byId = new Map((orders || []).map((order) => [String(order.id), order]));
    marketplaceOrders.forEach((order) => byId.set(String(order.id), order));
    return [...byId.values()];
  }, [marketplaceOrders, orders]);

  const handleCancelMarketplaceOrder = async (order) => {
    if (!order?.serverOrderId || cancellingOrderId) return;
    setCancellingOrderId(order.serverOrderId);
    try {
      const result = await cancelMarketplaceOrder(order.serverOrderId);
      setMarketplaceOrders((current) => current.map((item) =>
        item.serverOrderId === order.serverOrderId
          ? { ...item, status: "cancelled", cancellationDuplicate: result.duplicate }
          : item
      ));
      if (onTriggerToast) {
        onTriggerToast(result.duplicate
          ? "This order was already cancelled; its stock release was already processed."
          : result.released_items > 0
            ? `Order cancelled. The server released stock for ${result.released_items} catalogue item(s).`
            : "Order cancelled. No stock reservation needed release.");
      }
    } catch (error) {
      if (onTriggerToast) onTriggerToast(error?.message || "The server could not cancel this order.");
    } finally {
      setCancellingOrderId("");
    }
  };

  const handlePayMarketplaceOrder = async (order) => {
    if (!order?.serverOrderId || payingOrderId) return;
    setPayingOrderId(order.serverOrderId);
    try {
      const checkout = await createCashfreeCheckoutOrder(order.serverOrderId);
      const Cashfree = await loadCashfreeSdk();
      const cashfree = Cashfree({ mode: checkout.mode });
      try {
        await cashfree.checkout({ paymentSessionId: checkout.paymentSessionId, redirectTarget: "_modal" });
      } catch {
        // A dismissed or interrupted checkout still gets an authoritative status check.
      }
      const verification = await verifyCashfreeCheckoutPayment(order.serverOrderId);
      const liveOrders = await listMarketplaceOrders();
      setMarketplaceOrders(liveOrders);
      const paid = liveOrders.some((item) => item.serverOrderId === order.serverOrderId && item.paymentStatus === "PAID");
      if (onTriggerToast) {
        onTriggerToast(paid && verification.verified
          ? "Cashfree confirmed payment with WE4ALL."
          : "Cashfree has not confirmed payment yet. The order remains pending; check again shortly.");
      }
    } catch (error) {
      if (onTriggerToast) onTriggerToast(error?.message || "Could not open Cashfree UPI checkout.");
    } finally {
      setPayingOrderId("");
    }
  };

  const handleDownloadPdfInvoice = (ord) => {
    if (ord.isServerManaged && (ord.paymentStatus !== "PAID" || ["cancelled", "refunded", "disputed"].includes(String(ord.status).toLowerCase()))) {
      if (onTriggerToast) onTriggerToast("A tax invoice is available only for an active order with server-verified payment.");
      return;
    }
    const printWin = window.open("", "_blank", "width=720,height=850");
    if (!printWin) {
      if (onTriggerToast) onTriggerToast("Allow pop-ups to save/print PDF Tax Invoice.");
      return;
    }
    const itemsHtml = (ord.items || [])
      .map(
        (it) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #ddd;">${it.name}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">${it.qty || 1}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">Rs.${it.price}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">Rs.${(it.price * (it.qty || 1)).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WE4ALL_Tax_Invoice_${ord.id}.pdf</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 28px; color: #111; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 12px; }
          .badge { background: #059669; color: #fff; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th { background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .totals { margin-top: 16px; text-align: right; font-size: 13px; line-height: 1.7; }
          .footer { margin-top: 32px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 11px; text-align: center; color: #555; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin:0;color:#059669;">WE4ALL VOCALFORLOCAL SUPER-APP</h2>
            <p style="margin:4px 0 0;font-size:12px;">Founder: Khoday Anvesh | Official Hyperlocal GST Tax Invoice</p>
          </div>
          <div style="text-align:right;">
            <span class="badge">${ord.isServerManaged ? "WE4ALL VERIFIED PAYMENT" : `PAID VIA ${ord.paidViaApp || "UPI"}`}</span>
            <p style="margin:6px 0 0;font-size:12px;"><strong>Invoice #:</strong> INV-${ord.id}</p>
            <p style="margin:2px 0 0;font-size:11px;"><strong>Date:</strong> ${ord.dateStr || new Date().toISOString().slice(0, 10)} ${ord.createdAt || ""}</p>
          </div>
        </div>
        <div style="margin-top:14px;font-size:12px;line-height:1.5;">
          <p><strong>Customer:</strong> ${ord.customerName || "Verified Customer"} | <strong>Delivery Address:</strong> ${ord.address || "Adilabad"}</p>
          <p><strong>Fulfilled By:</strong> ${ord.shopName || "Verified Partner"} | <strong>Status:</strong> ${ord.status}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item / Service Description</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Unit Price</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="totals">
          <div>Items Subtotal: <strong>Rs.${ord.itemsTotal || ord.grandTotal}</strong></div>
          <div>WE4ALL Platform Fee (shown before confirmation): <strong>Rs.${ord.platformFee || 0}</strong></div>
          <div>Logistics / Delivery Fee: <strong>Rs.${ord.deliveryFee || 0}</strong></div>
          <div>5% GST & Governance: <strong>Rs.${ord.gst || 0}</strong></div>
          <div style="font-size:16px;color:#059669;">Grand Total Paid: <strong>Rs.${ord.grandTotal}</strong></div>
        </div>
        <div class="footer">
          Computer Generated Official WE4ALL PDF Tax Invoice | Save as PDF or Print directly.
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  const filteredOrders = displayOrders.filter((o) => {
    const status = String(o.status || "").toLowerCase();
    if (timelineFilter === "ALL") return true;
    if (timelineFilter === "CANCELLED_RETURNED") {
      return status.includes("cancelled") || status.includes("return");
    }
    return (o.periodTag || "TODAY") === timelineFilter;
  });

  return (
    <div className="space-y-3 text-xs">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-emerald-500 text-sm">
          Orders History & PDF Tax Invoices ({displayOrders.length + (serviceBookings || []).length + (labourBookings || []).length})
        </h3>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "ALL", label: "All Time" },
          { id: "TODAY", label: "Today" },
          { id: "WEEK", label: "Last 7 Days" },
          { id: "MONTH", label: "This Month" },
          { id: "CANCELLED_RETURNED", label: "Cancelled / Returned" }
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setTimelineFilter(f.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 cursor-pointer ${
              timelineFilter === f.id
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {(filteredOrders || []).length === 0 && (serviceBookings || []).length === 0 && (labourBookings || []).length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
          No orders or bookings recorded yet. Place an order to see its server status here.
        </div>
      )}

      {serviceBookings.filter((booking) => booking.serverBookingId && booking.customerId === customerId).map((booking) => (
        <article key={booking.id} className="space-y-1 rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="font-bold text-white">{booking.providerName || "Service visit"} · {booking.status}</p>
          <p className="text-slate-300">{booking.bookedDate} · {booking.bookedSlot}</p>
          <p className="text-emerald-300">{booking.quotedTotal != null ? `Provider quote ₹${booking.quotedTotal}` : "Awaiting provider quote"}</p>
        </article>
      ))}

      {filteredOrders.map((ord) => {
        const isExpanded = expandedOrderId === ord.id;
        return (
          <div
            key={ord.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2 text-white"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-black text-emerald-400 text-xs">
                  #{ord.id} - {ord.shopName || ord.categoryName}
                </p>
                <p className="text-[10px] text-slate-400">
                  {ord.dateStr || "Today"} {ord.createdAt} | {ord.isServerManaged ? `Payment ${ord.paymentStatus}` : `Paid via ${ord.paidViaApp || "UPI"}`}
                </p>
              </div>
              <span className="font-black text-amber-300 text-sm">Rs.{ord.grandTotal}</span>
            </div>

            <div className="flex justify-between items-center text-[10px]">
              <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-emerald-300 font-bold">
                {String(ord?.status ?? "").replace(/_/g, " ")}
              </span>
              <button
                type="button"
                onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                className="text-amber-300 underline font-bold cursor-pointer"
              >
                {isExpanded ? "Hide Bill Details" : "View Full Bill & PDF Invoice"}
              </button>
            </div>

            {isExpanded && (
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-[10px]">
                <p className="font-bold text-emerald-300">Itemized Billing Summary:</p>
                {(ord.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between text-slate-300">
                    <span>
                      {it.qty || 1}x {it.name}
                    </span>
                    <span>Rs.{it.price * (it.qty || 1)}</span>
                  </div>
                ))}
                <div className="border-t border-slate-800 pt-1 space-y-0.5 text-slate-400">
                  <div className="flex justify-between">
                    <span>Items Subtotal:</span>
                    <span>Rs.{ord.itemsTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>WE4ALL Platform Fee:</span>
                    <span>Rs.{ord.platformFee || 0}</span>
                  </div>
                  {(ord.feeBreakdown || []).some((line) => Number(line.platform_fee_inr || 0) > 0) && (
                    <p className="text-slate-500">Fee details were shown before checkout confirmation.</p>
                  )}
                  <div className="flex justify-between">
                    <span>Logistics / Delivery ({ord.vehicle || "2W"}):</span>
                    <span>Rs.{ord.deliveryFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>5% GST & Governance:</span>
                    <span>Rs.{ord.gst}</span>
                  </div>
                  <div className="flex justify-between font-black text-white text-xs pt-1">
                    <span>{ord.isServerManaged && ord.paymentStatus !== "PAID" ? "Order Total:" : "Total Paid:"}</span>
                    <span>Rs.{ord.grandTotal}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {ord.isServerManaged && (ord.paymentStatus !== "PAID" || ["cancelled", "refunded", "disputed"].includes(String(ord.status).toLowerCase())) ? (
                <button type="button" disabled className="bg-slate-700 text-slate-300 font-black py-1.5 rounded-xl text-[10px]">
                  {ord.paymentStatus === "PAID" ? "Invoice unavailable for cancelled order" : "Invoice after verified payment"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDownloadPdfInvoice(ord)}
                  className="bg-amber-400 text-slate-950 font-black py-1.5 rounded-xl text-[10px] cursor-pointer"
                >
                  Download PDF Invoice
                </button>
              )}
              {ord.isServerManaged ? (
                <button type="button" disabled className="bg-slate-700 text-slate-300 font-black py-1.5 rounded-xl text-[10px]">
                  Tracking after dispatch assignment
                </button>
              ) : onOpenLiveMap && (
                <button
                  type="button"
                  onClick={() => onOpenLiveMap(ord)}
                  className="bg-emerald-500 text-slate-950 font-black py-1.5 rounded-xl text-[10px] cursor-pointer"
                >
                  Live Track & OTP ({ord.secretOtp})
                </button>
              )}
              {!ord.status.includes("CANCELLED") &&
                !ord.status.includes("DELIVERED") &&
                onCancelOrder && (
                  <button
                    type="button"
                    onClick={() => onCancelOrder(ord.id)}
                    className="bg-rose-950 border border-rose-500 text-rose-300 font-bold py-1.5 rounded-xl text-[10px] cursor-pointer"
                  >
                    Cancel Order (Rs.10 Fee)
                  </button>
                )}
              {ord.isServerManaged && ["awaiting_payment", "merchant_confirmed"].includes(String(ord.status).toLowerCase()) && ["PENDING", "FAILED"].includes(ord.paymentStatus) && (
                <button
                  type="button"
                  disabled={cancellingOrderId === ord.serverOrderId}
                  onClick={() => handleCancelMarketplaceOrder(ord)}
                  className="bg-rose-950 border border-rose-500 disabled:opacity-50 text-rose-200 font-bold py-1.5 rounded-xl text-[10px]"
                >
                  {cancellingOrderId === ord.serverOrderId ? "Cancelling…" : "Cancel Unpaid Order"}
                </button>
              )}
              {ord.isServerManaged && ["awaiting_payment", "merchant_confirmed"].includes(String(ord.status).toLowerCase()) && ["PENDING", "FAILED"].includes(ord.paymentStatus) && (
                <button
                  type="button"
                  disabled={payingOrderId === ord.serverOrderId || Boolean(payingOrderId)}
                  onClick={() => handlePayMarketplaceOrder(ord)}
                  className="bg-emerald-500 text-slate-950 disabled:opacity-50 font-black py-1.5 rounded-xl text-[10px]"
                >
                  {payingOrderId === ord.serverOrderId ? "Opening secure checkout…" : "Pay with UPI app"}
                </button>
              )}
              {ord.isServerManaged && ord.paymentStatus === "PAID" && String(ord.status).toLowerCase() !== "refunded" && (
                <button type="button" disabled className="bg-slate-700 text-slate-300 font-bold py-1.5 rounded-xl text-[10px]">
                  Refund support required
                </button>
              )}
              {ord.isServerManaged && ord.paymentStatus === "AUTHORIZED" && (
                <button type="button" disabled className="bg-slate-700 text-slate-300 font-bold py-1.5 rounded-xl text-[10px]">
                  Payment reversal support required
                </button>
              )}
              {onReturnOrder && (
                <button
                  type="button"
                  onClick={() => onReturnOrder(ord.id)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 font-bold py-1.5 rounded-xl text-[10px] cursor-pointer"
                >
                  Return / Replace Item
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
