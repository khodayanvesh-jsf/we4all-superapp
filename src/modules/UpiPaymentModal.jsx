import React, { useState } from "react";

const UPI_APPS = [
  { id: "phonepe", name: "PhonePe", badge: "Fastest in Adilabad", icon: "" },
  { id: "gpay", name: "Google Pay (GPay)", badge: "Zero-MDR Instant", icon: "" },
  { id: "paytm", name: "Paytm UPI", badge: "Instant Wallet/UPI", icon: "" },
  { id: "bhim", name: "BHIM NPCI Official", badge: "Direct Bank UPI", icon: "" },
  { id: "cred", name: "CRED Pay", badge: "Cashback UPI", icon: "" }
];

export default function UpiPaymentModal({
  paymentRequest,
  userBankDetails,
  onClose,
  onPaymentSuccess
}) {
  const [launchingApp, setLaunchingApp] = useState(null);
  if (!paymentRequest) return null;

  const handlePayWithApp = (app) => {
    setLaunchingApp(app.name);
    const upiUri = `upi://pay?pa=we4all.escrow@sbi&pn=${encodeURIComponent(
      "WE4ALL Adilabad Escrow"
    )}&am=${paymentRequest.amount}&cu=INR&tn=${encodeURIComponent(paymentRequest.title)}`;

    try {
      const link = document.createElement("a");
      link.href = upiUri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {}

    setTimeout(() => {
      setLaunchingApp(null);
      onPaymentSuccess(app.name);
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-emerald-400 rounded-3xl max-w-sm w-full p-4 space-y-3 text-white shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <div>
            <h3 className="font-black text-emerald-400 text-sm">Select UPI Payment App</h3>
            <p className="text-[10px] text-slate-400">{paymentRequest.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer"
          >
            X
          </button>
        </div>

        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex justify-between items-center">
          <div>
            <p className="text-[10px] text-slate-400">Payable Amount (Zero-MDR)</p>
            <p className="text-lg font-black text-amber-400">Rs.{paymentRequest.amount}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-emerald-300 font-bold">Linked UPI ID</p>
            <p className="text-[11px] font-mono text-slate-200">
              {userBankDetails?.upiId || "khodayanvesh@ybl"}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {UPI_APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => handlePayWithApp(app)}
              className="w-full p-2.5 rounded-2xl border border-slate-800 bg-slate-950 hover:border-emerald-400 flex items-center justify-between cursor-pointer transition"
            >
              <div className="flex items-center gap-2 text-left">
                <span className="text-base">{app.icon}</span>
                <div>
                  <p className="text-xs font-bold text-white">{app.name}</p>
                  <p className="text-[9px] text-slate-400">{app.badge}</p>
                </div>
              </div>
              <span className="bg-emerald-500 text-slate-950 font-black px-2.5 py-1 rounded-xl text-[10px]">
                Pay Rs.{paymentRequest.amount}
              </span>
            </button>
          ))}
        </div>

        {launchingApp && (
          <div className="bg-amber-500/20 border border-amber-400 p-2 rounded-xl text-center text-amber-300 text-xs font-bold animate-pulse">
            Opening {launchingApp} & Verifying NPCI UPI Transaction...
          </div>
        )}
      </div>
    </div>
  );
}