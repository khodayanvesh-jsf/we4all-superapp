import React, { useState } from "react";
import { uploadFileToSupabaseStorage } from "../supabaseClient";

export default function DecoratorPortal({
  footerTab,
  setFooterTab,
  currentUser,
  functionHalls = [],
  setFunctionHalls = () => {},
  decorBids = [],
  setDecorBids = () => {},
  onSwitchToPersonalShop,
  onTriggerToast,
  renderAccountTab
}) {
  const [hallDateInput, setHallDateInput] = useState("2026-11-05");
  const [newHallForm, setNewHallForm] = useState({
    name: "Sri Venkateswara Function Hall",
    capacity: 800,
    dailyRent: 25000,
    location: "Adilabad Bypass Road",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=300&auto=format&fit=crop&q=80"
  });

  const [bidForm, setBidForm] = useState({
    title: "Royal Floral Mandap & LED Stage",
    price: 24000,
    features: "Fresh Imported Orchids + Warm Amber LED Truss + Maharaja Sofa"
  });

  if (footerTab === "account") {
    return renderAccountTab();
  }

  return (
    <div className="space-y-3 text-xs text-white">
      {/* DECORATOR HEADER */}
      <div className="bg-slate-900 p-3 rounded-2xl border border-amber-500/40 flex justify-between items-center gap-2">
        <div>
          <h3 className="font-black text-amber-400 text-xs">
            {currentUser?.fullName || "Royal Event Decor & Function Halls"}
          </h3>
          <p className="text-[10px] text-slate-400">
            Function Hall Calendar, Live Bids & Decor Portfolio Escrow
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToPersonalShop}
          className="bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer shrink-0"
        >
          Personal Shop
        </button>
      </div>

      {/* TAB 1: HALL CALENDAR ("home") */}
      {footerTab === "home" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-amber-500/40 space-y-2.5">
            <div className="flex justify-between items-center">
              <h4 className="font-black text-amber-400 text-xs">
                1. Function Hall Availability & Date Blocking
              </h4>
              <input
                type="date"
                value={hallDateInput}
                onChange={(e) => setHallDateInput(e.target.value)}
                className="bg-slate-950 border border-amber-400 rounded-xl p-1.5 text-white font-bold text-[10px]"
              />
            </div>
            <p className="text-[10px] text-slate-300">
              Select a date to check booking status or block dates for maintenance/weddings.
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">Sri Venkateswara Function Hall</span>
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[9px] font-black">
                  AVAILABLE ON {hallDateInput}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Capacity: 800 Guests | Rent: Rs.25,000/day | Adilabad Bypass Road
              </p>
              <button
                type="button"
                onChange={() => {}}
                onClick={() => onTriggerToast(`Date ${hallDateInput} successfully blocked for booking!`)}
                className="w-full bg-amber-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
              >
                Block Date ({hallDateInput}) for Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE BIDS ("bids") */}
      {footerTab === "bids" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-amber-500/40 space-y-2.5">
            <h4 className="font-black text-amber-400 text-xs">
              2. Customer Decoration Requests & Competitive Bids ({decorBids.length})
            </h4>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <p className="font-bold text-white text-[11px]">
                Event Request #ENV-8841: Wedding Reception (Nov 5, 2026)
              </p>
              <p className="text-[10px] text-slate-400">
                Customer: Rajesh Verma | Venue: Collectorate Function Hall, Adilabad
              </p>

              <div className="space-y-1 pt-1">
                <label className="block text-[9px] text-slate-400">Your Competitive Bid Package (Rs.):</label>
                <input
                  type="text"
                  value={bidForm.title}
                  onChange={(e) => setBidForm({ ...bidForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-[10px]"
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    value={bidForm.price}
                    onChange={(e) => setBidForm({ ...bidForm, price: Number(e.target.value) || 0 })}
                    className="bg-slate-900 border border-amber-400/50 rounded-lg p-1.5 text-amber-300 font-bold text-[10px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerToast(`Submitted bid of Rs.${bidForm.price} to customer!`);
                    }}
                    className="bg-amber-400 text-slate-950 font-black py-1.5 rounded-lg text-[10px] cursor-pointer"
                  >
                    Submit Bid to Customer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PORTFOLIO ("portfolio") */}
      {footerTab === "portfolio" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-amber-500/40 space-y-2.5">
            <h4 className="font-black text-amber-400 text-xs">
              3. Decorator Setup Portfolio & Photo Showcase
            </h4>
            <p className="text-[10px] text-slate-400">
              Upload photos of past stage designs and floral setups to attract more customers.
            </p>
            <label className="block bg-slate-950 border-2 border-dashed border-amber-400/60 p-4 rounded-xl text-center cursor-pointer">
              <span className="font-black text-amber-300 text-[11px]">
                Tap to Upload Setup Photo (.jpg/.png)
              </span>
              <input type="file" accept="image/*" onChange={() => onTriggerToast("Portfolio photo uploaded!")} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* TAB 4: ESCROW LEDGER ("orders") */}
      {footerTab === "orders" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-amber-500/40 space-y-2.5">
            <h4 className="font-black text-amber-400 text-xs">
              4. Decorator & Hall Escrow Ledger
            </h4>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <p className="text-[9px] text-slate-400">Total Escrow Bookings</p>
                <p className="font-black text-amber-400 text-sm">Rs.45,000</p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <p className="text-[9px] text-slate-400">Net Payout (After 5% GST)</p>
                <p className="font-black text-emerald-400 text-sm">Rs.42,750</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}