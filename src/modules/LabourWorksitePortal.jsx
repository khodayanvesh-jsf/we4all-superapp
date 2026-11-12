import React, { useMemo, useState } from "react";
import { LABOUR_TRADE_CATEGORIES } from "../data";
import {
  createServerLabourEngagement,
  quoteServerLabourEngagement,
  saveServerLabourProfile
} from "../supabaseClient";

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
  const myWorkerIds = new Set(
    resolvedWorkers.filter((worker) => worker.ownerUserId === currentUser?.id).map((worker) => worker.id)
  );
  const visibleBookings = mode === "customer"
    ? resolvedBookings.filter((booking) => booking.customerId === currentUser?.id)
    : resolvedBookings.filter((booking) => myWorkerIds.has(booking.workerId) || booking.workerUserId === currentUser?.id);
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
  const [customerRequestForm, setCustomerRequestForm] = useState({
    siteAddress: "",
    workDate: new Date().toISOString().slice(0, 10),
    shift: "FULL_DAY"
  });

  return (
    <div className="space-y-3 text-xs text-white">
      {mode !== "customer" && (
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

      )}

      {mode === "customer" && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-3 space-y-2">
          <h3 className="font-black text-emerald-300">Find Labour & Mistri Teams</h3>
          <p className="text-[10px] text-slate-300">
            Requests are sent to the worker for confirmation. Attendance and wage release remain pending until secure server verification is available.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2">
            <input
              value={customerRequestForm.siteAddress}
              onChange={(e) => setCustomerRequestForm({ ...customerRequestForm, siteAddress: e.target.value })}
              placeholder="Worksite full address *"
              className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
            />
            <input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={customerRequestForm.workDate}
              onChange={(e) => setCustomerRequestForm({ ...customerRequestForm, workDate: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
            />
            <select
              value={customerRequestForm.shift}
              onChange={(e) => setCustomerRequestForm({ ...customerRequestForm, shift: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
            >
              <option value="FULL_DAY">Full day · 9:00 AM–5:30 PM</option>
              <option value="HALF_DAY">Half day</option>
            </select>
          </div>
          {resolvedWorkers.filter((worker) => ["Approved", "ACTIVE", "AVAILABLE_AT_ADDA"].includes(worker.status)).map((worker) => (
            <div key={worker.id} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center gap-2">
              <div>
                <p className="font-bold text-white">{worker.name}</p>
                <p className="text-[10px] text-slate-400">{worker.tradeName} · {worker.mode === "TOLI_GROUP" ? `Toli of ${worker.toliSize}` : "Individual"}</p>
                <p className="text-[10px] text-emerald-300">₹{Number(worker.fullDayWage || 0).toLocaleString("en-IN")} / day</p>
              </div>
              <button
                type="button"
                disabled={resolvedBookings.some((b) => b.workerId === worker.id && b.customerId === currentUser?.id && !["CANCELLED","REJECTED","WAGE_RELEASED_COMPLETED"].includes(b.status))}
                onClick={() => {
                  if (!currentUser || currentUser.isGuest || !currentUser.authUserId) {
                    notify("Sign in before requesting a worker. Your request has not been created.");
                    return;
                  }
                  if (!customerRequestForm.siteAddress.trim() || !customerRequestForm.workDate) {
                    notify("Enter the worksite address and date before requesting a worker.");
                    return;
                  }
                  if (customerRequestForm.workDate < new Date().toISOString().slice(0, 10)) {
                    notify("The work date cannot be in the past.");
                    return;
                  }
                  const booking = {
                    id: `LAB-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
                    workerId: worker.id,
                    workerName: worker.name,
                    tradeId: worker.tradeId,
                    tradeName: worker.tradeName,
                    customerId: currentUser.id,
                    customerName: currentUser.fullName || currentUser.name || "Customer",
                    siteAddress: customerRequestForm.siteAddress.trim(),
                    workDate: customerRequestForm.workDate,
                    shift: customerRequestForm.shift,
                    totalWage: Number(worker.fullDayWage || 0) * (customerRequestForm.shift === "HALF_DAY" ? 0.5 : 1),
                    requestedAt: new Date().toISOString(),
                    status: "REQUESTED_PENDING_WORKER_CONFIRMATION",
                    attendanceVerification: "NOT_STARTED",
                    wagePaymentStatus: "NOT_PAID"
                  };
                  updateBookings([booking, ...resolvedBookings]);
                  notify("Worker request saved in this app state and awaiting worker response. Server notification, attendance and payment are not confirmed.");
                }}
                className="bg-emerald-500 disabled:bg-slate-700 text-slate-950 disabled:text-slate-300 font-black px-3 py-2 rounded-lg text-[10px]"
              >
                Request worker
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 2-Step Muster Roll Bookings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
        <h4 className="font-black text-emerald-400">
          Active Work-Site Muster Roll Bookings ({(visibleBookings || []).length})
        </h4>
        {(visibleBookings || []).length === 0 ? (
          <p className="text-[11px] text-slate-400 py-2">
            No active work-site bookings yet. Customers can hire workers from the Customer Portal.
          </p>
        ) : (
          visibleBookings.map((lb) => (
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
                Site: {lb.siteAddress} · Work date: {lb.workDate || "Not set"} · Shift: {lb.shift || "FULL_DAY"} · Status: {lb.status}
              </p>

              {mode !== "customer" && lb.status === "REQUESTED_PENDING_WORKER_CONFIRMATION" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateBookings(resolvedBookings.map((booking) =>
                        booking.id === lb.id
                          ? { ...booking, status: "WORKER_ACCEPTANCE_RECORDED_PENDING_SERVER", workerRespondedAt: new Date().toISOString() }
                          : booking
                      ));
                      notify("Worker response saved locally. Customer notification and booking confirmation require server sync.");
                    }}
                    className="bg-emerald-500 text-slate-950 font-black px-3 py-2 rounded-lg text-[10px]"
                  >
                    Confirm availability
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateBookings(resolvedBookings.map((booking) =>
                        booking.id === lb.id
                          ? { ...booking, status: "REJECTED_BY_WORKER", workerRespondedAt: new Date().toISOString() }
                          : booking
                      ));
                      notify("Request marked declined in the current app state. Server notification is not confirmed.");
                    }}
                    className="bg-rose-700 text-white font-black px-3 py-2 rounded-lg text-[10px]"
                  >
                    Decline
                  </button>
                </div>
              )}

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
            <div className="grid grid-cols-2 gap-1.5">
              <input type="number" min="0" max="100000" value={newWorkerForm.fullDayWage}
                onChange={(e) => setNewWorkerForm({ ...newWorkerForm, fullDayWage: Number(e.target.value) })}
                placeholder="Full-day wage ₹" className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white" />
              {newWorkerForm.mode === "TOLI_GROUP" && <input type="number" min="5" max="100" value={newWorkerForm.toliSize}
                onChange={(e) => setNewWorkerForm({ ...newWorkerForm, toliSize: Number(e.target.value) })}
                placeholder="Group size" className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white" />}
            </div>
            <input type="text" maxLength={500} value={newWorkerForm.toolsIncluded}
              onChange={(e) => setNewWorkerForm({ ...newWorkerForm, toolsIncluded: e.target.value })}
              placeholder="Tools included" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white" />
            <button type="button" disabled={busyAction === "profile"} onClick={registerLabourProfile}
              className="w-full bg-amber-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-300 font-black py-2 rounded-xl">
              {busyAction === "profile" ? "Saving to WE4ALL…" : "Publish approved Labour profile"}
            </button>
          </div>
        </section>
      )}

      {mode === "customer" && (
        <section className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-3 space-y-2">
          <h3 className="font-black text-emerald-300">Find Labour & Mistri Teams</h3>
          <p className="text-[10px] text-slate-300">
            Choose an approved individual or Toli. The request is saved online; the worker must quote/accept. No paid OTP, payment or wage release is triggered.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2">
            <input value={customerRequestForm.siteAddress} onChange={(e) => setCustomerRequestForm({ ...customerRequestForm, siteAddress: e.target.value })}
              placeholder="Worksite full address *" className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" />
            <input type="date" min={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })} value={customerRequestForm.workDate}
              onChange={(e) => setCustomerRequestForm({ ...customerRequestForm, workDate: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" />
            <select value={customerRequestForm.shift} onChange={(e) => setCustomerRequestForm({ ...customerRequestForm, shift: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white">
              <option value="FULL_DAY">Full day · 9:00 AM–5:30 PM</option>
              <option value="HALF_DAY">Half day</option>
            </select>
          </div>
          {resolvedWorkers.filter((worker) => worker.status === "Approved" && worker.partnerId).map((worker) => (
            <div key={worker.partnerId} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center gap-2">
              <div className="min-w-0">
                <p className="font-bold text-white">{worker.name}</p>
                <p className="text-[10px] text-slate-400">{worker.tradeName} · {worker.mode === "TOLI_GROUP" ? "Toli of " + worker.toliSize : "Individual"}</p>
                <p className="text-[10px] text-emerald-300">Indicative ₹{Number(worker.fullDayWage || 0).toLocaleString("en-IN")} / day · final quote by partner</p>
                {worker.toolsIncluded && <p className="text-[9px] text-slate-400">Tools: {worker.toolsIncluded}</p>}
              </div>
              <button type="button" disabled={busyAction === worker.partnerId || resolvedBookings.some((booking) => booking.workerId === worker.partnerId && booking.customerId === identity && !["cancelled","declined","rejected","WAGE_RELEASED_COMPLETED"].includes(booking.status))}
                onClick={() => requestWorker(worker)} className="bg-emerald-500 disabled:bg-slate-700 text-slate-950 disabled:text-slate-300 font-black px-3 py-2 rounded-lg text-[10px]">
                {busyAction === worker.partnerId ? "Submitting…" : "Request worker"}
              </button>
            </div>
          ))}
          {resolvedWorkers.filter((worker) => worker.status === "Approved" && worker.partnerId).length === 0 &&
            <p className="text-[10px] text-slate-400">No approved Labour/Mistri partners are listed in your zone yet.</p>}
        </section>
      )}

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
        <h4 className="font-black text-emerald-400">Work-Site Muster Roll ({visibleBookings.length})</h4>
        {visibleBookings.length === 0 ? (
          <p className="text-[11px] text-slate-400 py-2">No server-backed worksite requests yet.</p>
        ) : visibleBookings.map((booking) => (
          <div key={booking.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between font-bold gap-2">
              <span className="text-amber-300">#{booking.id} · {booking.workerName || booking.tradeName || "Labour partner"}</span>
              <span className="text-emerald-400">{booking.totalWage ? "₹" + booking.totalWage : "Quote pending"}</span>
            </div>
            <p className="text-[10px] text-slate-400">Site: {booking.siteAddress || "Address pending"} · Date: {booking.workDate || "Not set"} · Shift: {booking.shift || "FULL_DAY"} · Status: {booking.status}</p>
            {mode !== "customer" && ["requested", "REQUESTED_PENDING_WORKER_CONFIRMATION"].includes(booking.status) && (
              <>
                <input type="number" min="1" value={quoteInputMap[booking.id] || booking.totalWage || newWorkerForm.fullDayWage}
                  onChange={(e) => setQuoteInputMap({ ...quoteInputMap, [booking.id]: e.target.value })}
                  placeholder="Your Labour quote ₹" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-[10px]" />
                <div className="flex gap-2">
                  <button type="button" disabled={busyAction === booking.id} onClick={() => respondToRequest(booking, "accept")}
                    className="flex-1 bg-emerald-500 disabled:bg-slate-700 text-slate-950 disabled:text-slate-300 font-black px-3 py-2 rounded-lg text-[10px]">
                    {busyAction === booking.id ? "Saving…" : "Accept & submit quote"}
                  </button>
                  <button type="button" disabled={busyAction === booking.id} onClick={() => respondToRequest(booking, "decline")}
                    className="bg-rose-700 disabled:bg-slate-700 text-white font-black px-3 py-2 rounded-lg text-[10px]">Decline</button>
                </div>
              </>
            )}
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2">
              <p className="text-[9px] text-amber-200">Muster roll attendance (morning start + evening verification): secure server OTP workflow is not yet enabled. No local code is accepted.</p>
              <p className="text-[9px] text-amber-200">Wage release: disabled until dual attendance and verified settlement exist. This request remains unpaid.</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
