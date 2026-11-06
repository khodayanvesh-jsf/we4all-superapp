import React, { useMemo, useState } from "react";
import { uploadFileToSupabaseStorage } from "../supabaseClient";

const EMPTY_FORM = {
  name: "",
  capacity: 300,
  dailyRent: 25000,
  location: "",
  image: ""
};

export default function DecoratorPortal({
  footerTab,
  setFooterTab,
  currentUser,
  functionHalls = [],
  setFunctionHalls = () => {},
  decorators = [],
  setDecorators = () => {},
  decorBids = [],
  setDecorBids = () => {},
  onSwitchToPersonalShop,
  onTriggerToast = () => {},
  renderAccountTab = () => null
}) {
  const [hallDateInput, setHallDateInput] = useState(() => new Date().toISOString().slice(0, 10));
  const [newHallForm, setNewHallForm] = useState(EMPTY_FORM);
  const [bidFormMap, setBidFormMap] = useState({});
  const [uploading, setUploading] = useState(false);

  const ownerId = currentUser?.id || "";
  const ownerPhone = currentUser?.phone || "";
  const ownHalls = useMemo(
    () => (functionHalls || []).filter(
      (hall) => hall.ownerUserId === ownerId || (ownerPhone && hall.ownerPhone === ownerPhone)
    ),
    [functionHalls, ownerId, ownerPhone]
  );
  const ownBids = (decorBids || []).filter(
    (bid) => bid.decoratorUserId === ownerId || (ownerPhone && bid.decoratorPhone === ownerPhone)
  );
  const openRequests = (decorBids || []).filter(
    (bid) => bid.recordType === "DECOR_REQUEST" && bid.status === "OPEN_FOR_BIDS"
  );

  const addHall = () => {
    const name = newHallForm.name.trim();
    const capacity = Number(newHallForm.capacity);
    const dailyRent = Number(newHallForm.dailyRent);
    if (!name || !Number.isInteger(capacity) || capacity < 1 || !Number.isFinite(dailyRent) || dailyRent <= 0) {
      onTriggerToast("Enter a hall name, positive guest capacity and valid daily rent.");
      return;
    }
    if (!ownerId && !ownerPhone) {
      onTriggerToast("A signed-in decorator identity is required to register a hall.");
      return;
    }
    const created = {
      id: `hall_${globalThis.crypto?.randomUUID?.() || Date.now()}`,
      ...newHallForm,
      name,
      capacity,
      dailyRent,
      ownerUserId: ownerId,
      ownerPhone,
      status: "PENDING_ADMIN_APPROVAL",
      bookedDates: [],
      createdAt: new Date().toISOString()
    };
    setFunctionHalls([created, ...(functionHalls || [])]);
    setNewHallForm(EMPTY_FORM);
    onTriggerToast("Hall application saved as pending founder approval. It is not listed as available to customers yet.");
  };

  const toggleDateBlock = (hall) => {
    const existing = Array.isArray(hall.bookedDates) ? hall.bookedDates : [];
    const isBlocked = existing.some((entry) => (typeof entry === "string" ? entry : entry.date) === hallDateInput);
    const nextDates = isBlocked
      ? existing.filter((entry) => (typeof entry === "string" ? entry : entry.date) !== hallDateInput)
      : [...existing, { date: hallDateInput, status: "BLOCKED", reason: "Decorator maintenance / unavailable" }];
    setFunctionHalls((functionHalls || []).map((item) =>
      item.id === hall.id ? { ...item, bookedDates: nextDates, updatedAt: new Date().toISOString() } : item
    ));
    onTriggerToast(isBlocked ? `${hall.name}: ${hallDateInput} unblocked in this device's saved state.` : `${hall.name}: ${hallDateInput} marked unavailable in this device's saved state.`);
  };

  const submitBid = (request) => {
    const form = bidFormMap[request.id] || { title: "", price: "", features: "" };
    const title = String(form.title || "").trim();
    const price = Number(form.price);
    if (!title || !Number.isFinite(price) || price <= 0) {
      onTriggerToast("Enter a bid package and a valid amount.");
      return;
    }
    if (!ownerId && !ownerPhone) {
      onTriggerToast("A signed-in decorator identity is required to submit a bid.");
      return;
    }
    const duplicate = (decorBids || []).some((bid) =>
      bid.recordType === "DECOR_BID" &&
      bid.requestId === request.id &&
      (bid.decoratorUserId === ownerId || (ownerPhone && bid.decoratorPhone === ownerPhone))
    );
    if (duplicate) {
      onTriggerToast("You have already submitted a bid for this request. Edit the existing bid through the bid desk.");
      return;
    }
    const bid = {
      id: `bid_${globalThis.crypto?.randomUUID?.() || Date.now()}`,
      recordType: "DECOR_BID",
      requestId: request.id,
      decoratorUserId: ownerId,
      decoratorPhone: ownerPhone,
      decoratorName: currentUser?.businessName || currentUser?.fullName || "Decorator",
      title,
      price,
      features: String(form.features || "").trim(),
      status: "BID_SUBMITTED_PENDING_SERVER_REVIEW",
      createdAt: new Date().toISOString()
    };
    setDecorBids([bid, ...(decorBids || [])]);
    onTriggerToast("Bid saved to the current application state. Customer delivery and server persistence are not confirmed.");
  };

  const handlePortfolioUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      onTriggerToast("Choose an image up to 5 MB.");
      return;
    }
    if (!ownerId) {
      onTriggerToast("A signed-in decorator identity is required before adding portfolio media.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadFileToSupabaseStorage(file, `decorator-portfolio/${ownerId}`);
      if (!uploaded || uploaded === file.name || uploaded.startsWith("data:")) {
        onTriggerToast("Portfolio image was not uploaded to cloud storage. No cloud-upload success was recorded.");
        return;
      }
      const existing = (decorators || []).find((profile) => profile.userId === ownerId) || {
        id: `decorator_${ownerId}`,
        userId: ownerId,
        phone: ownerPhone,
        name: currentUser?.businessName || currentUser?.fullName || "Decorator",
        portfolioImages: []
      };
      const nextProfile = {
        ...existing,
        portfolioImages: [...(existing.portfolioImages || []), { url: uploaded, createdAt: new Date().toISOString() }]
      };
      setDecorators([nextProfile, ...(decorators || []).filter((profile) => profile.userId !== ownerId)]);
      onTriggerToast("Portfolio media URL saved to the decorator profile. Confirm private/public bucket policy before publishing.");
    } catch (error) {
      onTriggerToast(`Portfolio upload failed: ${error?.message || "unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  if (footerTab === "account") return renderAccountTab();

  return (
    <div className="space-y-3 text-xs text-white">
      <div className="bg-slate-900 p-3 rounded-2xl border border-amber-500/40 flex justify-between items-center gap-2">
        <div>
          <h3 className="font-black text-amber-400 text-xs">{currentUser?.businessName || currentUser?.fullName || "Decorator / Function Hall Desk"}</h3>
          <p className="text-[10px] text-slate-400">Hall availability · Reverse bids · Portfolio · Booking ledger</p>
        </div>
        <button type="button" onClick={onSwitchToPersonalShop} className="bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px]">Personal Shop</button>
      </div>

      {footerTab === "home" && (
        <div className="space-y-3">
          <section className="bg-slate-900 p-3 rounded-2xl border border-amber-500/40 space-y-2">
            <h4 className="font-black text-amber-300">Register a Function Hall</h4>
            <input value={newHallForm.name} onChange={(e) => setNewHallForm({ ...newHallForm, name: e.target.value })} placeholder="Function hall name" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"/>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min="1" value={newHallForm.capacity} onChange={(e) => setNewHallForm({ ...newHallForm, capacity: e.target.value })} placeholder="Guest capacity" className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"/>
              <input type="number" min="1" value={newHallForm.dailyRent} onChange={(e) => setNewHallForm({ ...newHallForm, dailyRent: e.target.value })} placeholder="Daily rent ₹" className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"/>
            </div>
            <input value={newHallForm.location} onChange={(e) => setNewHallForm({ ...newHallForm, location: e.target.value })} placeholder="Hall address / area" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"/>
            <button type="button" onClick={addHall} className="w-full bg-emerald-500 text-slate-950 font-black py-2 rounded-xl">Submit Hall for Founder Approval</button>
          </section>

          <section className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center gap-2">
              <h4 className="font-black text-amber-300">My Hall Calendar ({ownHalls.length})</h4>
              <input type="date" value={hallDateInput} onChange={(e) => setHallDateInput(e.target.value)} className="bg-slate-950 border border-amber-400 rounded-lg p-1.5 text-white"/>
            </div>
            {ownHalls.length === 0 && <p className="text-slate-400">No halls are registered to this decorator account yet.</p>}
            {ownHalls.map((hall) => {
              const dates = Array.isArray(hall.bookedDates) ? hall.bookedDates : [];
              const blocked = dates.some((entry) => (typeof entry === "string" ? entry : entry.date) === hallDateInput);
              return (
                <div key={hall.id} className="bg-slate-950 rounded-xl p-2.5 space-y-2">
                  <div className="flex justify-between gap-2"><strong>{hall.name}</strong><span className={hall.status === "Approved" ? "text-emerald-300" : "text-amber-300"}>{hall.status || "PENDING_ADMIN_APPROVAL"}</span></div>
                  <p className="text-slate-400">Capacity: {hall.capacity} · ₹{hall.dailyRent}/day · {hall.location}</p>
                  <button type="button" disabled={hall.status !== "Approved"} onClick={() => toggleDateBlock(hall)} className="w-full bg-amber-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-300 font-black py-2 rounded-lg">{blocked ? "Unblock" : "Block"} {hallDateInput}</button>
                  {hall.status !== "Approved" && <p className="text-amber-200 text-[10px]">Calendar controls unlock after founder approval.</p>}
                </div>
              );
            })}
          </section>
        </div>
      )}

      {footerTab === "bids" && (
        <section className="bg-slate-900 p-3 rounded-2xl border border-amber-500/40 space-y-2">
          <h4 className="font-black text-amber-300">Open Customer Decoration Requests ({openRequests.length})</h4>
          {openRequests.length === 0 && <p className="text-slate-400">No live customer requests are available. New requests will appear here when the customer booking workflow is connected.</p>}
          {openRequests.map((request) => {
            const form = bidFormMap[request.id] || { title: "", price: "", features: "" };
            return (
              <div key={request.id} className="bg-slate-950 rounded-xl p-3 space-y-2">
                <strong>{request.title || "Decoration request"}</strong>
                <p className="text-slate-400">{request.eventDate || "Date pending"} · {request.guestCount || "Guest count pending"} guests · {request.location || "Location pending"}</p>
                <input value={form.title} onChange={(e) => setBidFormMap({ ...bidFormMap, [request.id]: { ...form, title: e.target.value } })} placeholder="Your package / quote title" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"/>
                <input type="number" min="1" value={form.price} onChange={(e) => setBidFormMap({ ...bidFormMap, [request.id]: { ...form, price: e.target.value } })} placeholder="Your quote ₹" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"/>
                <textarea value={form.features} onChange={(e) => setBidFormMap({ ...bidFormMap, [request.id]: { ...form, features: e.target.value } })} placeholder="Included decoration / package details" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"/>
                <button type="button" onClick={() => submitBid(request)} className="w-full bg-amber-400 text-slate-950 font-black py-2 rounded-lg">Submit bid</button>
              </div>
            );
          })}
          <h4 className="font-black text-amber-300 pt-2">My submitted bids ({ownBids.length})</h4>
          {ownBids.map((bid) => <p key={bid.id} className="bg-slate-950 p-2 rounded-lg">{bid.title} · ₹{bid.price} · {bid.status}</p>)}
        </section>
      )}

      {footerTab === "portfolio" && (
        <section className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
          <h4 className="font-black text-amber-300">Decoration Portfolio</h4>
          <label className="block bg-slate-950 border-2 border-dashed border-amber-400/60 p-4 rounded-xl text-center cursor-pointer">
            <span className="font-black text-amber-200">{uploading ? "Uploading…" : "Upload portfolio photo (JPG/PNG, up to 5 MB)"}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={handlePortfolioUpload} className="hidden"/>
          </label>
          {(decorators || []).find((profile) => profile.userId === ownerId)?.portfolioImages?.map((item, index) => (
            <img key={item.url || index} src={item.url} alt="Decorator portfolio" className="w-full max-h-52 object-cover rounded-xl"/>
          ))}
        </section>
      )}

      {footerTab === "orders" && (
        <section className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
          <h4 className="font-black text-amber-300">Booking & Settlement Ledger</h4>
          {ownBids.filter((bid) => bid.paymentStatus || bid.escrowStatus).length === 0 && (
            <p className="text-slate-400">No verified escrow or settlement transactions are recorded for this account. Submitted bids are not payments.</p>
          )}
          {ownBids.filter((bid) => bid.paymentStatus || bid.escrowStatus).map((bid) => (
            <div key={bid.id} className="bg-slate-950 rounded-lg p-2"><strong>{bid.title}</strong><p>Payment: {bid.paymentStatus || "Not paid"} · Escrow: {bid.escrowStatus || "Not held"}</p></div>
          ))}
        </section>
      )}
    </div>
  );
}
