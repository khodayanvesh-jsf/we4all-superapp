import React, { useState } from "react";

export default function FounderAdminSuite({
  appUpdateInfo = { currentVersion: "3.1.0", latestAvailableVersion: "3.1.0" },
  setAppUpdateInfo = () => {},
  monetizationConfig = { globalPlatformFee: 0, serviceBookingSurcharge: 0, productSpecificFee: 0 },
  setMonetizationConfig = () => {},
  geoAds = [],
  setGeoAds = () => {},
  categories = [],
  setCategories = () => {},
  merchants = [],
  setMerchants = () => {},
  products = [],
  setProducts = () => {},
  orders = [],
  serviceBookings = [],
  labourBookings = [],
  registeredUsers = [],
  onBackToApp = () => {},
  onTriggerToast = () => {}
}) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-slate-950 text-white p-4 rounded-3xl border border-amber-400/50 flex justify-between items-center shadow-xl">
        <div>
          <h2 className="font-black text-amber-400 text-sm">FOUNDER MASTER ADMIN SUITE</h2>
          <p className="text-[10px] text-slate-300">
            System Version: v{appUpdateInfo?.currentVersion || "3.1.0"} | Registered Partners: {(registeredUsers || []).length}
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToApp}
          className="bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl font-black text-xs cursor-pointer"
        >
          &larr; Back to App
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-2xl text-[10px] font-black text-white">
        {[
          { id: "overview", label: "📊 Overview" },
          { id: "partners", label: `👥 Partners (${(registeredUsers || []).length})` },
          { id: "monetization", label: "💰 Monetization" },
          { id: "ota", label: "📲 OTA & Release" }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 rounded-xl text-center cursor-pointer ${
              activeTab === tab.id ? "bg-amber-400 text-slate-950 shadow" : "hover:bg-slate-800 text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold">Total Orders</p>
            <p className="text-xl font-black text-amber-400 mt-1">{(orders || []).length}</p>
          </div>
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold">Products Listed</p>
            <p className="text-xl font-black text-emerald-400 mt-1">{(products || []).length}</p>
          </div>
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold">Service Bookings</p>
            <p className="text-xl font-black text-indigo-400 mt-1">{(serviceBookings || []).length}</p>
          </div>
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold">Verified Partners</p>
            <p className="text-xl font-black text-amber-300 mt-1">{(registeredUsers || []).length}</p>
          </div>
        </div>
      )}

      {activeTab === "partners" && (
        <div className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 space-y-3">
          <h3 className="font-black text-xs text-amber-400">Registered Partner Accounts & KYC</h3>
          {(registeredUsers || []).length === 0 ? (
            <p className="text-slate-400 py-4 text-center text-xs">No partner KYC registrations yet.</p>
          ) : (
            (registeredUsers || []).map((u) => (
              <div key={u.id} className="p-3 rounded-2xl border border-slate-800 bg-slate-950 flex justify-between items-center">
                <div>
                  <p className="font-black text-xs text-emerald-400">{u.fullName} ({u.role?.toUpperCase()})</p>
                  <p className="text-[10px] text-slate-400">Phone: +91 {u.phone} | UPI: {u.upiId}</p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-black px-2 py-1 rounded-lg">
                  KYC Verified
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "monetization" && (
        <div className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 space-y-3">
          <h3 className="font-black text-xs text-amber-400">Global Platform Monetization & Fees</h3>
          <div className="space-y-2">
            <label className="block text-[10px] text-slate-300">Global Platform Fee per Order (Rs.)</label>
            <input
              type="number"
              value={monetizationConfig?.globalPlatformFee || 0}
              onChange={(e) =>
                setMonetizationConfig({ ...monetizationConfig, globalPlatformFee: Number(e.target.value) })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => onTriggerToast("Monetization configuration saved!")}
            className="w-full bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer"
          >
            Save Monetization Rules
          </button>
        </div>
      )}

      {activeTab === "ota" && (
        <div className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 space-y-3">
          <h3 className="font-black text-xs text-amber-400">OTA Release Manager</h3>
          <p className="text-[10px] text-slate-300">Current Live Version: v{appUpdateInfo?.currentVersion || "3.1.0"}</p>
          <button
            type="button"
            onClick={() => {
              const updated = {
                ...appUpdateInfo,
                currentVersion: "3.1.1",
                latestAvailableVersion: "3.1.1"
              };
              setAppUpdateInfo(updated);
              onTriggerToast("Bumped OTA version to v3.1.1!");
            }}
            className="w-full bg-emerald-500 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer"
          >
            Publish OTA v3.1.1 Release
          </button>
        </div>
      )}
    </div>
  );
}