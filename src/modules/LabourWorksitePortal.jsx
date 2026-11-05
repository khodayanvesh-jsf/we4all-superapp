import React, { useState } from "react";
import { LABOUR_TRADE_CATEGORIES } from "../data";

export default function LabourWorksitePortal({
  mode = "worker",
  labourWorkers,
  setLabourWorkers,
  labourBookings,
  setLabourBookings,
  workers,
  setWorkers,
  bookings,
  setBookings,
  currentUser,
  onTriggerToast,
  onToast
}) {
  const resolvedWorkers = Array.isArray(labourWorkers) ? labourWorkers : (workers || []);
  const resolvedBookings = Array.isArray(labourBookings) ? labourBookings : (bookings || []);
  const updateWorkers = setLabourWorkers || setWorkers || (() => {});
  const updateBookings = setLabourBookings || setBookings || (() => {});
  const notify = onTriggerToast || onToast || (() => {});
  const [newWorkerForm, setNewWorkerForm] = useState({
    name: "",
    tradeId: "lab_mason",
    mode: "INDIVIDUAL",
    toliSize: 1,
    fullDayWage: 900,
    phone: "",
    toolsIncluded: "Trowel, Spirit Level, Measuring Tape"
  });
  const [otpInputMap, setOtpInputMap] = useState({});

  return (
    <div className="space-y-3 text-xs text-white">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-3 space-y-2">
        <h3 className="font-black text-amber-400 text-sm">
          \uD83E\uDDF1 Labour & Mistri Work-Site Adda (Daily-Wage & Toli Portal)
        </h3>
        <p className="text-[10px] text-slate-300">
          Register as an individual Mason/Helper/Hamali or a Mistri Toli group. Uses 2-Step Muster Roll OTP (Morning Start OTP + Evening Wage Release OTP).
        </p>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
          <p className="font-bold text-emerald-400">+ Register Worker / Mistri Toli in Adda</p>
          <input
            type="text"
            value={newWorkerForm.name}
            onChange={(e) => setNewWorkerForm({ ...newWorkerForm, name: e.target.value })}
            placeholder="Worker / Mistri Leader Name"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={newWorkerForm.tradeId}
              onChange={(e) => {
                const trade = LABOUR_TRADE_CATEGORIES.find((t) => t.id === e.target.value);
                setNewWorkerForm({
                  ...newWorkerForm,
                  tradeId: e.target.value,
                  fullDayWage: trade ? trade.fullDayWage : 700
                });
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-bold"
            >
              {LABOUR_TRADE_CATEGORIES.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.icon} {tc.name}
                </option>
              ))}
            </select>
            <select
              value={newWorkerForm.mode}
              onChange={(e) =>
                setNewWorkerForm({
                  ...newWorkerForm,
                  mode: e.target.value,
                  toliSize: e.target.value === "TOLI_GROUP" ? 5 : 1
                })
              }
              className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-bold"
            >
              <option value="INDIVIDUAL">Individual Worker</option>
              <option value="TOLI_GROUP">Mistri Toli Group (5+)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="number"
              value={newWorkerForm.fullDayWage}
              onChange={(e) =>
                setNewWorkerForm({ ...newWorkerForm, fullDayWage: Number(e.target.value) })
              }
              placeholder="Full-Day Wage (Rs.)"
              className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
            />
            <input
              type="tel"
              maxLength={10}
              value={newWorkerForm.phone}
              onChange={(e) => setNewWorkerForm({ ...newWorkerForm, phone: e.target.value })}
              placeholder="10-Digit Mobile"
              className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!newWorkerForm.name.trim()) return;
              const tradeObj = LABOUR_TRADE_CATEGORIES.find((t) => t.id === newWorkerForm.tradeId);
              const created = {
                id: `lab_${Date.now()}`,
                ...newWorkerForm,
                tradeName: tradeObj ? tradeObj.name : "Mason / Helper",
                status: "PENDING_ADMIN_APPROVAL", ownerUserId: currentUser?.id || null
              };
              updateWorkers([created, ...resolvedWorkers]);
              setNewWorkerForm({ ...newWorkerForm, name: "", phone: "" });
              notify(`Worker registration submitted for approval: ${created.name}.`);
            }}
            className="w-full bg-amber-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
          >
            Publish to Labour & Mistri Adda
          </button>
        </div>
      </div>

      {/* 2-Step Muster Roll Bookings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
        <h4 className="font-black text-emerald-400">
          Active Work-Site Muster Roll Bookings ({(resolvedBookings || []).length})
        </h4>
        {(resolvedBookings || []).length === 0 ? (
          <p className="text-[11px] text-slate-400 py-2">
            No active work-site bookings yet. Customers can hire workers from the Customer Portal.
          </p>
        ) : (
          resolvedBookings.map((lb) => (
            <div
              key={lb.id}
              className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2"
            >
              <div className="flex justify-between font-bold">
                <span className="text-amber-300">
                  #{lb.id} - {lb.workerName} ({lb.tradeName})
                </span>
                <span className="text-emerald-400">Rs.{lb.totalWage}/day</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Site: {lb.siteAddress} | Shift: 9:00 AM - 5:30 PM | Status: {lb.status}
              </p>

              {lb.status === "BOOKED_AWAITING_MORNING_OTP" && (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Secure morning OTP is issued by server"
                    value={otpInputMap[lb.id] || ""}
                    onChange={(e) => setOtpInputMap({ ...otpInputMap, [lb.id]: e.target.value })}
                    className="flex-1 bg-slate-900 border border-amber-400 rounded-lg p-1.5 text-center font-mono text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      notify("Morning attendance requires a server-issued, order-bound OTP. Local codes are not accepted.");
                    }}
                    disabled
                    className="bg-slate-700 text-slate-300 font-black px-3 rounded-lg cursor-not-allowed"
                  >
                    Start Shift
                  </button>
                </div>
              )}

              {lb.status === "WORK_IN_PROGRESS_ON_SITE" && (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Secure evening OTP is issued by server"
                    value={otpInputMap[lb.id] || ""}
                    onChange={(e) => setOtpInputMap({ ...otpInputMap, [lb.id]: e.target.value })}
                    className="flex-1 bg-slate-900 border border-emerald-400 rounded-lg p-1.5 text-center font-mono text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      notify("Wage release requires server-verified attendance and a confirmed payment settlement.");
                    }}
                    disabled
                    className="bg-slate-700 text-slate-300 font-black px-3 rounded-lg cursor-not-allowed"
                  >
                    Release Wage
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}