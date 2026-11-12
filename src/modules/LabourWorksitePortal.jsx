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
  const identity = currentUser?.authUserId || currentUser?.id || "";
  const myPartnerId = currentUser?.partnerId || "";
  const myWorkerIds = useMemo(() => new Set([
    ...resolvedWorkers.filter((worker) => worker.ownerUserId === identity).map((worker) => worker.id),
    ...(myPartnerId ? [myPartnerId] : [])
  ]), [resolvedWorkers, identity, myPartnerId]);
  const visibleBookings = mode === "customer"
    ? resolvedBookings.filter((booking) => booking.customerId === identity)
    : resolvedBookings.filter((booking) => myWorkerIds.has(booking.workerId) || booking.workerUserId === identity);

  const [newWorkerForm, setNewWorkerForm] = useState({
    name: "",
    tradeId: "lab_mason",
    mode: "INDIVIDUAL",
    toliSize: 1,
    fullDayWage: 900,
    phone: "",
    toolsIncluded: "Trowel, Spirit Level, Measuring Tape"
  });
  const [customerRequestForm, setCustomerRequestForm] = useState({
    siteAddress: "",
    workDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    shift: "FULL_DAY"
  });
  const [quoteInputMap, setQuoteInputMap] = useState({});
  const [busyAction, setBusyAction] = useState("");

  const registerLabourProfile = async () => {
    if (!currentUser?.authUserId || !myPartnerId || currentUser?.role !== "labour" || currentUser?.status !== "Approved") {
      notify("Your Labour/Mistri partner application must be approved by the Founder before the public Adda profile can be published.");
      return;
    }
    const name = String(newWorkerForm.name || "").trim();
    if (!name) { notify("Enter the worker or Mistri Toli leader name."); return; }
    const trade = LABOUR_TRADE_CATEGORIES.find((item) => item.id === newWorkerForm.tradeId);
    setBusyAction("profile");
    try {
      await saveServerLabourProfile({
        partnerId: myPartnerId,
        availabilityRules: currentUser.availabilityRules || {},
        profile: { ...newWorkerForm, name, tradeName: trade?.name || "Labour / Mistri" }
      });
      const saved = {
        id: myPartnerId, partnerId: myPartnerId, ...newWorkerForm, name,
        tradeName: trade?.name || "Labour / Mistri", status: "Approved", ownerUserId: identity
      };
      updateWorkers([saved, ...resolvedWorkers.filter((worker) => worker.id !== myPartnerId)]);
      notify("Labour profile saved in the WE4ALL server directory. No SMS or payment was used.");
    } catch (error) {
      notify(error?.message || "The Labour profile was not saved.");
    } finally {
      setBusyAction("");
    }
  };

  const requestWorker = async (worker) => {
    if (!identity || currentUser?.isGuest) {
      notify("Sign in with your WE4ALL account before hiring. No request was created.");
      return;
    }
    if (!worker?.partnerId) {
      notify("This listing has no verified server partner reference. No request was created.");
      return;
    }
    const address = String(customerRequestForm.siteAddress || "").trim();
    if (!address || !customerRequestForm.workDate) {
      notify("Enter the worksite address and date.");
      return;
    }
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (customerRequestForm.workDate < today) {
      notify("The work date cannot be in the past.");
      return;
    }
    setBusyAction(worker.partnerId);
    try {
      const result = await createServerLabourEngagement({
        partnerId: worker.partnerId,
        tradeKey: worker.tradeId,
        workerCount: worker.mode === "TOLI_GROUP" ? worker.toliSize : 1,
        worksiteAddress: address,
        workDate: customerRequestForm.workDate,
        shift: customerRequestForm.shift
      });
      const id = result.engagement_id || result.id;
      if (!id) throw new Error("The server did not return a Labour request reference.");
      const booking = {
        id,
        workerId: worker.partnerId,
        workerName: worker.name,
        tradeId: worker.tradeId,
        tradeName: worker.tradeName,
        customerId: identity,
        customerName: currentUser.fullName || currentUser.name || "Customer",
        siteAddress: address,
        workDate: customerRequestForm.workDate,
        shift: customerRequestForm.shift,
        workerCount: worker.mode === "TOLI_GROUP" ? worker.toliSize : 1,
        totalWage: null,
        requestedAt: new Date().toISOString(),
        status: result.status || "requested",
        paymentStatus: result.payment_status || "pending",
        serverRecord: true
      };
      updateBookings([booking, ...resolvedBookings.filter((item) => item.id !== id)]);
      notify("Labour request saved on WE4ALL. The partner must respond with a quote. No money was collected.");
    } catch (error) {
      notify(error?.message || "Labour request failed. No booking was saved.");
    } finally {
      setBusyAction("");
    }
  };

  const respondToRequest = async (booking, decision) => {
    const quote = Number(quoteInputMap[booking.id] || booking.totalWage || newWorkerForm.fullDayWage);
    if (decision === "accept" && (!Number.isFinite(quote) || quote <= 0)) {
      notify("Enter a valid Labour quote before accepting.");
      return;
    }
    setBusyAction(booking.id);
    try {
      const result = await quoteServerLabourEngagement({
        engagementId: booking.id,
        decision,
        agreedTotalInr: decision === "accept" ? quote : null
      });
      updateBookings(resolvedBookings.map((item) => item.id === booking.id
        ? { ...item, status: result.status || (decision === "accept" ? "quoted" : "declined"), totalWage: decision === "accept" ? quote : item.totalWage, agreed_total_inr: decision === "accept" ? quote : item.agreed_total_inr }
        : item
      ));
      notify(decision === "accept"
        ? "Labour quote saved on the WE4ALL server. Customer confirmation and payment are still pending."
        : "Labour request declined on the WE4ALL server.");
    } catch (error) {
      notify(error?.message || "Your Labour response was not saved.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <div className="space-y-3 text-xs text-white">
      {mode !== "customer" && (
        <section className="bg-slate-900 border border-amber-500/40 rounded-2xl p-3 space-y-2">
          <h3 className="font-black text-amber-400 text-sm">Labour & Mistri Work-Site Adda</h3>
          <p className="text-[10px] text-slate-300">
            Six-trade directory for individual workers and Mistri Toli groups. Only a Founder-approved Labour partner can publish a server directory profile.
          </p>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
            <p className="font-bold text-emerald-400">Worker / Mistri Toli profile</p>
            <input type="text" value={newWorkerForm.name}
              onChange={(e) => setNewWorkerForm({ ...newWorkerForm, name: e.target.value })}
              placeholder="Worker / Mistri leader name"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white" />
            <div className="grid grid-cols-2 gap-1.5">
              <select value={newWorkerForm.tradeId} onChange={(e) => {
                const trade = LABOUR_TRADE_CATEGORIES.find((item) => item.id === e.target.value);
                setNewWorkerForm({ ...newWorkerForm, tradeId: e.target.value, fullDayWage: trade ? trade.fullDayWage : 700 });
              }} className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-bold">
                {LABOUR_TRADE_CATEGORIES.map((trade) => <option key={trade.id} value={trade.id}>{trade.icon} {trade.name}</option>)}
              </select>
              <select value={newWorkerForm.mode} onChange={(e) => setNewWorkerForm({ ...newWorkerForm, mode: e.target.value, toliSize: e.target.value === "TOLI_GROUP" ? 5 : 1 })}
                className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-bold">
                <option value="INDIVIDUAL">Individual worker</option>
                <option value="TOLI_GROUP">Mistri Toli group</option>
              </select>
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
