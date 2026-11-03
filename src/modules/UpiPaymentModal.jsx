import React, { useState } from "react";

const UPI_APPS = [
  { id: "phonepe", appName: "PhonePe UPI", badge: "Instant Zero-MDR", icon: "\uD83D\uDFE3" },
  { id: "gpay", appName: "Google Pay (GPay)", badge: "Direct Bank UPI", icon: "\uD83D\uDD35" },
  { id: "paytm", appName: "Paytm UPI", badge: "Fast Wallet & Bank", icon: "\uD83D\uDFE6" },
  { id: "bhim", appName: "BHIM / CRED UPI", badge: "NPCI Official", icon: "\uD83D\uDFE2" }
];

export default function UpiPaymentModal({ paymentRequest, userBankDetails, onClose, onPaymentSuccess }) {
  const [selectedUpiApp, setSelectedUpiApp] = useState("phonepe");
  const [launchingIntent, setLaunchingIntent] = useState(false);
  if (!paymentRequest) return null;

  const handleLaunchUpiAndPay = (app) => {
    setSelectedUpiApp(app.id);
    setLaunchingIntent(true);
    setTimeout(() => {
      setLaunchingIntent(false);
      if (onPaymentSuccess) onPaymentSuccess(app.appName);
    }, 650);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-emerald-400 rounded-3xl max-w-sm w-full p-4 space-y-3 text-xs text-white shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <h3 className="font-black text-emerald-400 text-sm">Select UPI App to Pay</h3>
          <button type="button" onClick={onClose} className="bg-slate-800 px-2.5 py-1 rounded-xl font-bold cursor-pointer">X</button>
        </div>
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex justify-between items-center">
          <div>
            <p className="text-[10px] text-slate-400">{paymentRequest.title}</p>
            <p className="text-lg font-black text-amber-400">Rs.{paymentRequest.amount}</p>
            <p className="text-[9px] text-emerald-300">Linked UPI: {userBankDetails?.upiId || "khodayanvesh@ybl"}</p>
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-lg text-[9px] font-black">0% MDR</span>
        </div>
        <div className="space-y-1.5">
          {UPI_APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => handleLaunchUpiAndPay(app)}
              className={`w-full p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer ${selectedUpiApp === app.id ? "border-emerald-400 bg-emerald-500/15" : "border-slate-800 bg-slate-950"}`}
            >
              <div className="flex items-center gap-2.5 text-left">
                <span className="text-base">{app.icon}</span>
                <div>
                  <p className="font-black text-white text-xs">{app.appName}</p>
                  <p className="text-[9px] text-slate-400">{app.badge}</p>
                </div>
              </div>
              <span className="bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded-xl text-[10px]">
                Pay Rs.{paymentRequest.amount}
              </span>
            </button>
          ))}
        </div>
        {launchingIntent && (
          <div className="bg-amber-400/20 border border-amber-400 p-2 rounded-xl text-center text-amber-300 font-black animate-pulse">
            Verifying UPI Transaction &amp; Locking Escrow...
          </div>
        )}
      </div>
    </div>
  );
}