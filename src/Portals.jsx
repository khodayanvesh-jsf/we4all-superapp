import React, { useState } from 'react';
import { REJECTION_REASONS } from './data';

// ============================================================================
// [COMPONENT-01] FOUNDER ORIGINAL PHOTO EMBLEM BADGE
// ============================================================================
export function FounderLogoBadge({ logoUrl, onUploadLogo, size = 'sm' }) {
  const isLarge = size === 'lg';
  return (
    <div className="flex items-center gap-2.5">
      <label
        title="Click to upload your original Founder photo"
        className={`relative rounded-full border-2 border-amber-400 ring-2 ring-emerald-500/60 bg-gradient-to-b from-[#07262c] to-[#03090c] flex flex-col items-center justify-center overflow-hidden shadow-lg cursor-pointer shrink-0 ${
          isLarge ? 'w-24 h-24' : 'w-9 h-9'
        }`}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="WE4ALL Founder Khoday Anvesh"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-1">
            <span className={`font-black text-amber-400 tracking-tighter ${isLarge ? 'text-xs' : 'text-[7px]'}`}>
              WE4ALL
            </span>
            <span className={`font-extrabold text-emerald-300 ${isLarge ? 'text-[9px]' : 'text-[5px]'}`}>
              FOUNDER
            </span>
          </div>
        )}
        {isLarge && (
          <div className="absolute bottom-0 inset-x-0 bg-black/80 py-0.5 text-center border-t border-amber-400/50">
            <p className="text-[7px] font-black text-amber-300 leading-none">WE4ALL FOUNDER</p>
            <p className="text-[6px] font-bold text-white leading-none">BY KHODAY ANVESH</p>
          </div>
        )}
        {onUploadLogo && (
          <input type="file" accept="image/*" onChange={onUploadLogo} className="hidden" />
        )}
      </label>
      {!isLarge && (
        <div className="leading-tight">
          <div className="font-black text-amber-400 text-[11px] tracking-wide">
            WE4ALL <span className="text-emerald-300">SUPER-APP</span>
          </div>
          <div className="text-[8px] font-bold text-slate-300">FOUNDER • KHODAY ANVESH</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// [COMPONENT-02] NATIVE SMARTPHONE BEZEL WITH PERSISTENT 5-TAB FOOTER & LOGOUT
// ============================================================================
export function MobilePhoneShell({
  title,
  badge,
  phoneOS = 'ANDROID',
  footerTab,
  onSelectFooterTab,
  cartCount = 0,
  ordersCount = 0,
  onLogout,
  children
}) {
  return (
    <div
      className={`w-full max-w-[405px] mx-auto bg-[#071318] border-[7px] shadow-[0_25px_70px_-15px_rgba(16,185,129,0.28)] overflow-hidden flex flex-col min-h-[820px] max-h-[870px] relative transition-all ${
        phoneOS === 'IOS'
          ? 'rounded-[52px] border-slate-700 ring-2 ring-slate-400/20'
          : 'rounded-[42px] border-slate-800/90 ring-2 ring-emerald-500/20'
      }`}
    >
      {/* Top Status Bar (Clean Mobile Header - No Server Clutter) */}
      <div className="bg-[#040b0e] px-4 py-2 flex justify-between items-center text-[10px] text-slate-300 border-b border-emerald-950/80 select-none shrink-0">
        <span className="font-extrabold text-amber-400 tracking-wide flex items-center gap-1.5 truncate max-w-[160px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          {title}
        </span>
        {phoneOS === 'IOS' ? (
          <div className="w-16 h-3.5 bg-black rounded-full border border-slate-800 flex items-center justify-end px-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
        ) : (
          <div className="w-3 h-3 bg-black rounded-full border border-slate-700" />
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-teal-300 font-semibold truncate max-w-[90px]">{badge}</span>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Logout / Lock Device"
              className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 px-1.5 py-0.5 rounded text-[8px] font-black cursor-pointer"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Viewport */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-[#071318] via-[#09181F] to-[#050E12]">
        {children}
      </div>

      {/* Persistent 5-Option Bottom Footer Bar (Visible Across App Screens) */}
      {onSelectFooterTab && (
        <div className="bg-[#040b0e] border-t border-slate-800 px-2 py-1.5 grid grid-cols-5 gap-1 text-[9px] font-extrabold shrink-0">
          {[
            { id: 'home', icon: '🏠', label: 'Home' },
            { id: 'services', icon: '🔧', label: 'Services' },
            { id: 'orders', icon: '📦', label: 'Orders', badge: ordersCount },
            { id: 'carts', icon: '🛒', label: 'Carts', badge: cartCount },
            { id: 'account', icon: '👤', label: 'Account' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectFooterTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                footerTab === tab.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-sm leading-none">{tab.icon}</span>
              <span className="mt-0.5">{tab.label}</span>
              {tab.badge > 0 && (
                <span className="absolute top-0.5 right-2 bg-amber-400 text-slate-950 text-[8px] font-black px-1 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Bottom OS Hardware Bar */}
      <div className="bg-black py-1.5 px-8 flex justify-around items-center text-slate-500 text-[9px] shrink-0">
        {phoneOS === 'ANDROID' ? (
          <>
            <span>◁</span>
            <span className="w-2.5 h-2.5 rounded-full border border-slate-500" />
            <span className="w-2.5 h-2.5 border border-slate-500 rounded-xs" />
          </>
        ) : (
          <div className="w-24 h-1 bg-slate-600 rounded-full" />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// [PORTAL-02] CLASSIC PRODUCT MERCHANT PORTAL
// Requirement 1.1: Mandatory Merchant Confirmation Popup (ORDER_PLACED_MERCHANT_POPUP)
// where Merchant verifies stock, adds Heavy Transport / Labor Fee & pushes Final Bill.
// ============================================================================
export function MerchantPortal({
  phoneOS,
  currentUser,
  orders,
  onSimulateIncomingOrder,
  onMerchantConfirmBill,
  onMerchantDispatchAlert,
  stockItems,
  setStockItems,
  categories,
  newProdForm,
  setNewProdForm,
  pendingSubCategories,
  setPendingSubCategories,
  rejectedItems,
  onSwitchToPersonalShop,
  onOpenAccountSettings,
  onLogout
}) {
  const [merchantTab, setMerchantTab] = useState('orders'); // 'orders' | 'stock' | 'add_brand'

  return (
    <MobilePhoneShell
      title="WE4ALL Merchant Desk"
      badge="Product Store"
      phoneOS={phoneOS}
      onLogout={onLogout}
    >
      {/* Merchant Header & Personal Shopping Interoperability */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
        <div>
          <h2 className="text-xs font-black text-emerald-400">
            {currentUser?.fullName || 'Sri Laxmi Supermart'}
          </h2>
          <p className="text-[9px] text-slate-400 uppercase">
            PRODUCT MERCHANT • CUSTOMER DETAILS MASKED
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onOpenAccountSettings}
            className="bg-slate-800 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-xl text-[9px] font-bold cursor-pointer"
          >
            👤 PIN/Bio
          </button>
          <button
            onClick={onSwitchToPersonalShop}
            className="bg-slate-800 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded-xl text-[9px] font-bold cursor-pointer"
          >
            🛍️ Personal Shop
          </button>
        </div>
      </div>

      {/* Merchant Navigation Tabs */}
      <div className="grid grid-cols-3 gap-1 text-[10px] bg-slate-900 p-1 rounded-xl">
        <button
          onClick={() => setMerchantTab('orders')}
          className={`py-1.5 rounded-lg font-extrabold cursor-pointer ${
            merchantTab === 'orders' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
          }`}
        >
          Orders ({orders.length})
        </button>
        <button
          onClick={() => setMerchantTab('stock')}
          className={`py-1.5 rounded-lg font-extrabold cursor-pointer ${
            merchantTab === 'stock' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
          }`}
        >
          Stock Manual
        </button>
        <button
          onClick={() => setMerchantTab('add_brand')}
          className={`py-1.5 rounded-lg font-extrabold cursor-pointer ${
            merchantTab === 'add_brand' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
          }`}
        >
          + Add Brand
        </button>
      </div>

      {/* TAB 1: MANDATORY MERCHANT CONFIRMATION POPUP & PACKING DISPATCH */}
      {merchantTab === 'orders' && (
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-white">Active Customer Product Orders</h3>
            <button
              onClick={onSimulateIncomingOrder}
              className="bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-xl text-[9px] font-extrabold cursor-pointer"
            >
              + Simulate Order
            </button>
          </div>
          {orders.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-6">
              No active product orders right now. Standing by for customer checkout.
            </p>
          ) : (
            orders.map((ord) => (
              <div
                key={ord.id}
                className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-[11px] space-y-2"
              >
                <div className="flex justify-between font-bold">
                  <span className="text-emerald-400">{ord.id}</span>
                  <span className="text-amber-300">Total: ₹{ord.grandTotal}</span>
                </div>
                <p className="text-[10px] text-slate-300">
                  <strong>Drop Area:</strong> {ord.address} | <strong>OTP:</strong> ****
                </p>
                <p className="text-[10px] text-slate-400">
                  {ord.items.map((i) => `${i.name} x${i.qty}`).join(', ')}
                </p>

                {/* STEP 1: MERCHANT CONFIRMATION POPUP */}
                {ord.status === 'ORDER_PLACED_MERCHANT_POPUP' && (
                  <div className="space-y-2 pt-2 border-t border-slate-800 bg-slate-950 p-2.5 rounded-xl">
                    <p className="text-[10px] font-bold text-amber-300">
                      🔔 New Order Confirmation Popup (Verify Stock & Add Transport/Labor):
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-white">
                      <div>
                        <label className="text-[9px] text-slate-400">Heavy Transport (₹)</label>
                        <input
                          type="number"
                          defaultValue={0}
                          onChange={(e) => (ord.heavyTransportFee = Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400">Labor Fee (₹)</label>
                        <input
                          type="number"
                          defaultValue={0}
                          onChange={(e) => (ord.laborFee = Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        onMerchantConfirmBill(ord.id, ord.heavyTransportFee, ord.laborFee)
                      }
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-1.5 rounded-xl text-xs cursor-pointer"
                    >
                      ✓ Verify Stock & Send Final Bill to Customer
                    </button>
                  </div>
                )}

                {ord.status === 'MERCHANT_CONFIRMED_WAIT_PAYMENT' && (
                  <div className="bg-amber-950/50 border border-amber-500/40 p-2 rounded-xl text-[10px] text-amber-300 font-bold">
                    ⏳ Final Bill (₹{ord.grandTotal}) sent! Waiting for Customer UPI payment...
                  </div>
                )}

                {/* STEP 2: PACKING APPROVAL -> ALERTS DELIVERY CAPTAIN */}
                {ord.status === 'PAYMENT_DONE_PACKING_STARTED' && (
                  <button
                    onClick={() => onMerchantDispatchAlert(ord.id)}
                    className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-2 rounded-xl text-xs cursor-pointer shadow"
                  >
                    📦 Approve Packing & Alert Delivery Captain →
                  </button>
                )}

                {ord.status === 'READY_FOR_PICKUP_AGENT_ALERTED' && (
                  <p className="text-[10px] text-teal-300 font-bold">
                    📡 Delivery Captain Alerted! Waiting for Captain pickup token acceptance...
                  </p>
                )}

                {ord.status === 'OUT_FOR_DELIVERY_LIVE_MAP' && (
                  <p className="text-[10px] text-emerald-400 font-bold">
                    🏍️ Picked Up by {ord.riderName}! Live GPS Route Tracking Active.
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: ADVANCED STOCK & INVENTORY MANUAL */}
      {merchantTab === 'stock' && (
        <div className="space-y-2.5 text-white">
          <h3 className="text-xs font-bold text-emerald-400">📦 Inline Stock & Price Manual</h3>
          {stockItems.map((item, idx) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl flex flex-col gap-2"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                <span className="font-extrabold text-xs">{item.name}</span>
                <button
                  onClick={() => setStockItems(stockItems.filter((i) => i.id !== item.id))}
                  className="text-rose-400 text-[9px] font-bold cursor-pointer"
                >
                  Remove
                </button>
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="flex-1 flex items-center bg-[#03080b] border border-slate-700 rounded-lg px-2 py-1">
                  <span className="text-slate-400 text-[10px] pr-1">₹</span>
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => {
                      const updated = [...stockItems];
                      updated[idx].price = Number(e.target.value);
                      setStockItems(updated);
                    }}
                    className="w-full bg-transparent text-emerald-300 font-bold text-xs outline-none"
                  />
                  <span className="text-slate-500 text-[9px]">/ {item.unit}</span>
                </div>
                <button
                  onClick={() => {
                    const updated = [...stockItems];
                    updated[idx].inStock = !updated[idx].inStock;
                    setStockItems(updated);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer ${
                    item.inStock ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.inStock ? '✓ In Stock' : '✕ Out'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SUBMIT NEW BRAND TO FOUNDER ADMIN */}
      {merchantTab === 'add_brand' && (
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2.5 text-xs text-white">
          <h4 className="font-bold text-amber-300">+ Submit New Product Brand for Approval</h4>
          <select
            value={newProdForm.categoryId}
            onChange={(e) => setNewProdForm({ ...newProdForm, categoryId: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Brand & Product Name (e.g., Fortune Oil)"
            value={newProdForm.subCategoryBrand}
            onChange={(e) => setNewProdForm({ ...newProdForm, subCategoryBrand: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2"
          />
          <button
            onClick={() => {
              if (!newProdForm.subCategoryBrand.trim()) return;
              setPendingSubCategories([
                ...pendingSubCategories,
                {
                  id: `ps_${Date.now()}`,
                  zoneId: 'adilabad',
                  categoryId: newProdForm.categoryId,
                  subCategoryBrand: newProdForm.subCategoryBrand,
                  shopName: newProdForm.shopName,
                  distanceKm: 1.1,
                  image: newProdForm.image,
                  status: 'pending',
                  variants: newProdForm.variants.map((v, i) => ({
                    ...v,
                    id: `v_${Date.now()}_${i}`
                  }))
                }
              ]);
              setNewProdForm({ ...newProdForm, subCategoryBrand: '' });
            }}
            className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
          >
            Submit to Founder Admin
          </button>
          {rejectedItems.length > 0 && (
            <div className="bg-rose-950/60 border border-rose-500 p-2 rounded-lg text-rose-200 text-[10px]">
              <p className="font-bold">⚠️ Rejected by Founder:</p>
              {rejectedItems.map((r) => (
                <p key={r.id}>• {r.subCategoryBrand}: {r.rejectReason}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </MobilePhoneShell>
  );
}

// ============================================================================
// [PORTAL-03] DEDICATED SERVICE PROVIDER PORTAL
// Requirement 2.7 & 2.8: Visiting fee held on platform until service is completed
// and Consumer's 4-Digit Happy Code is Geo-Fence Verified at Customer Location!
// ============================================================================
export function ServiceProviderPortal({
  phoneOS,
  serviceAppointments,
  setServiceAppointments,
  serviceProviders,
  onSwitchToPersonalShop,
  onOpenAccountSettings,
  onTriggerToast,
  onLogout
}) {
  const [tab, setTab] = useState('bookings'); // 'bookings' | 'slots'
  const [happyCodeInputs, setHappyCodeInputs] = useState({});

  // Geo-Fence Verification Handler (Validates provider is within <= 50m of customer address)
  const handleGeoFenceCheckIn = (apptId) => {
    setServiceAppointments(
      serviceAppointments.map((a) =>
        a.id === apptId ? { ...a, geoFenceVerified: true, distanceMeters: 18 } : a
      )
    );
    onTriggerToast('📍 GPS Geo-Fence Verified (18m from Customer Doorstep)! Happy Code Input Unlocked.');
  };

  // Validate Happy Code & Release Visiting Fee Escrow
  const handleVerifyHappyCode = (appt) => {
    if (!appt.geoFenceVerified) {
      alert('Geo-Fence Lock: You must verify your GPS arrival at the customer location before entering the Happy Code!');
      return;
    }
    const entered = (happyCodeInputs[appt.id] || '').trim();
    if (entered === appt.happyCode) {
      setServiceAppointments(
        serviceAppointments.map((a) =>
          a.id === appt.id
            ? {
                ...a,
                status: 'COMPLETED_HAPPY_CODE_VERIFIED',
                escrowStatus: 'RELEASED_TO_PROVIDER_WALLET'
              }
            : a
        )
      );
      onTriggerToast(`🎉 Happy Code Verified at Customer GPS! Visiting Fee (₹${appt.visitingFee}) Released from Platform Hold!`);
    } else {
      alert(`Invalid Happy Code! Please ask the customer for the 4-digit Happy Code shown on their order screen (${appt.happyCode}).`);
    }
  };

  return (
    <MobilePhoneShell
      title="WE4ALL Service Provider"
      badge="Geo-Fence Escrow"
      phoneOS={phoneOS}
      onLogout={onLogout}
    >
      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
        <div>
          <h2 className="text-xs font-black text-indigo-400">Service Professional Desk</h2>
          <p className="text-[9px] text-slate-400 uppercase">
            VISITING FEE HELD UNTIL GEO-FENCED HAPPY CODE
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onOpenAccountSettings}
            className="bg-slate-800 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-xl text-[9px] font-bold cursor-pointer"
          >
            👤 PIN/Bio
          </button>
          <button
            onClick={onSwitchToPersonalShop}
            className="bg-slate-800 text-indigo-300 border border-indigo-500/40 px-2 py-1 rounded-xl text-[9px] font-bold cursor-pointer"
          >
            🛍️ Personal Shop
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 text-[10px] bg-slate-900 p-1 rounded-xl">
        <button
          onClick={() => setTab('bookings')}
          className={`py-1.5 rounded-lg font-extrabold cursor-pointer ${
            tab === 'bookings' ? 'bg-indigo-500 text-white' : 'text-slate-400'
          }`}
        >
          Service Bookings ({serviceAppointments.length})
        </button>
        <button
          onClick={() => setTab('slots')}
          className={`py-1.5 rounded-lg font-extrabold cursor-pointer ${
            tab === 'slots' ? 'bg-indigo-500 text-white' : 'text-slate-400'
          }`}
        >
          1-Hr Availability Slots
        </button>
      </div>

      {tab === 'bookings' && (
        <div className="space-y-3 text-white text-xs">
          {serviceAppointments.length === 0 ? (
            <p className="text-slate-400 text-center py-6 text-[11px]">
              No active service bookings. Book a service from Customer Services tab.
            </p>
          ) : (
            serviceAppointments.map((appt) => (
              <div
                key={appt.id}
                className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-3 space-y-2 text-[11px]"
              >
                <div className="flex justify-between font-bold">
                  <span className="text-indigo-300">
                    {appt.id} • {appt.serviceCategory}
                  </span>
                  <span className="text-amber-300">
                    {appt.date} • {appt.slot}
                  </span>
                </div>

                {/* Privacy Masking Check */}
                <p className="text-[10px] text-slate-300">
                  <strong>Booked Location:</strong> {appt.address}
                </p>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between items-center text-[10px]">
                  <span>
                    Visiting Fee: <strong>₹{appt.visitingFee}</strong>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-black text-[9px] ${
                      appt.escrowStatus === 'RELEASED_TO_PROVIDER_WALLET'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    }`}
                  >
                    {appt.escrowStatus === 'RELEASED_TO_PROVIDER_WALLET'
                      ? '✓ RELEASED TO WALLET'
                      : '🔒 ON HOLD AT PLATFORM'}
                  </span>
                </div>

                {appt.status !== 'COMPLETED_HAPPY_CODE_VERIFIED' && (
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    {/* STEP 1: GEO-FENCE CHECK-IN AT CUSTOMER LOCATION */}
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <div>
                        <p className="text-[10px] font-bold text-teal-300">
                          Step 1: Customer GPS Geo-Fence Check
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {appt.geoFenceVerified
                            ? `✓ Verified inside Geo-Fence (${appt.distanceMeters}m from Customer)`
                            : 'Must be <= 50m of customer address to unlock Happy Code'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleGeoFenceCheckIn(appt.id)}
                        className={`px-2.5 py-1 rounded-lg font-black text-[9px] cursor-pointer ${
                          appt.geoFenceVerified
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-teal-400 text-slate-950'
                        }`}
                      >
                        {appt.geoFenceVerified ? '📍 Geo-Verified' : '📍 Verify GPS'}
                      </button>
                    </div>

                    {/* STEP 2: ENTER CUSTOMER 4-DIGIT HAPPY CODE */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-slate-400 block font-bold">
                        Step 2: Enter Customer 4-Digit Happy Code (Valid Only After Geo-Fence):
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          maxLength={4}
                          disabled={!appt.geoFenceVerified}
                          placeholder={
                            appt.geoFenceVerified
                              ? 'Enter 4-Digit Happy Code'
                              : 'Lock: Verify Geo-Fence First'
                          }
                          value={happyCodeInputs[appt.id] || ''}
                          onChange={(e) =>
                            setHappyCodeInputs({ ...happyCodeInputs, [appt.id]: e.target.value })
                          }
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-white font-mono text-xs"
                        />
                        <button
                          onClick={() => handleVerifyHappyCode(appt)}
                          className={`px-3 py-1.5 rounded-xl font-black text-[10px] cursor-pointer ${
                            appt.geoFenceVerified
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          Verify Happy Code
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {appt.status === 'COMPLETED_HAPPY_CODE_VERIFIED' && (
                  <div className="bg-emerald-950/70 border border-emerald-400 p-2 rounded-xl text-emerald-300 font-bold text-[10px] text-center">
                    ✅ Service Completed & Geo-Fenced Happy Code Verified! ₹{appt.visitingFee} Released.
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'slots' && (
        <div className="space-y-2 text-white text-xs">
          <h3 className="font-bold text-indigo-300">🕒 Active 1-Hour Service Intervals</h3>
          {serviceProviders.map((sp) => (
            <div key={sp.id} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <p className="font-bold">{sp.providerName}</p>
              <p className="text-[10px] text-emerald-400">Visiting Fee: ₹{sp.visitingFee}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                {sp.availableSlots.map((s) => (
                  <span key={s} className="bg-indigo-950 text-indigo-200 px-2 py-0.5 rounded text-[9px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </MobilePhoneShell>
  );
}

// ============================================================================
// [PORTAL-04] DECORATOR & FUNCTION HALL PORTAL
// Requirement 3.1: Decorators CANNOT place orders from their portal (only bid on
// consumer broadcasts). Function Hall owners manage their live Hall Schedule Calendar
// so consumers immediately see date availability clarity.
// ============================================================================
export function DecoratorAndHallPortal({
  phoneOS,
  eventDate,
  advancePercentage,
  decorBids,
  setDecorBids,
  biddingStatus,
  setBiddingStatus,
  selectedWinningBid,
  functionHalls,
  setFunctionHalls,
  onSwitchToPersonalShop,
  onOpenAccountSettings,
  onTriggerToast,
  onLogout
}) {
  const [tab, setTab] = useState('hall_calendar'); // 'hall_calendar' | 'bidding_desk' | 'escrow'
  const [myBidAmount, setMyBidAmount] = useState('19200');
  const [myBidReason, setMyBidReason] = useState('Includes floral welcome arch + 4 warm LED spotlights');
  const [calendarDateInput, setCalendarDateInput] = useState('2026-11-05');

  // Toggle Date Availability in Function Hall Schedule
  const handleToggleHallDate = (hallId, dateStr) => {
    setFunctionHalls(
      functionHalls.map((h) => {
        if (h.id !== hallId) return h;
        const isBooked = h.bookedDates.includes(dateStr);
        const updatedDates = isBooked
          ? h.bookedDates.filter((d) => d !== dateStr)
          : [...h.bookedDates, dateStr];
        return { ...h, bookedDates: updatedDates };
      })
    );
    onTriggerToast(`🗓️ Updated Function Hall availability schedule for ${dateStr}!`);
  };

  return (
    <MobilePhoneShell
      title="WE4ALL Hall & Decor Desk"
      badge="Schedule & Bids"
      phoneOS={phoneOS}
      onLogout={onLogout}
    >
      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
        <div>
          <h2 className="text-xs font-black text-amber-400">Function Hall & Decorator Desk</h2>
          <p className="text-[9px] text-slate-400 uppercase">
            NO ORDER CREATION BY DECORATOR • SCHEDULE & BID ONLY
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onOpenAccountSettings}
            className="bg-slate-800 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-xl text-[9px] font-bold cursor-pointer"
          >
            👤 PIN/Bio
          </button>
          <button
            onClick={onSwitchToPersonalShop}
            className="bg-slate-800 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded-xl text-[9px] font-bold cursor-pointer"
          >
            🛍️ Personal Shop
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 text-[10px] bg-slate-900 p-1 rounded-xl">
        <button
          onClick={() => setTab('hall_calendar')}
          className={`py-1.5 rounded-lg font-extrabold cursor-pointer ${
            tab === 'hall_calendar' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
          }`}
        >
          Hall Schedule
        </button>
        <button
          onClick={() => setTab('bidding_desk')}
          className={`py-1.5 rounded-lg font-extrabold cursor-pointer ${
            tab === 'bidding_desk' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
          }`}
        >
          Bid on Requests
        </button>
        <button
          onClick={() => setTab('escrow')}
          className={`py-1.5 rounded-lg font-extrabold cursor-pointer ${
            tab === 'escrow' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
          }`}
        >
          {advancePercentage}% Escrow
        </button>
      </div>

      {/* TAB 1: FUNCTION HALL LIVE AVAILABILITY SCHEDULE MANAGER */}
      {tab === 'hall_calendar' && (
        <div className="space-y-3 text-white text-xs">
          <div className="bg-amber-950/40 border border-amber-500/40 p-2.5 rounded-2xl text-[10px]">
            <h3 className="font-bold text-amber-300 text-xs">
              🏛️ Function Hall Availability Schedule Manager
            </h3>
            <p className="text-slate-300 mt-0.5">
              Block or unblock dates on your hall calendar so consumers immediately see real-time availability clarity.
            </p>
          </div>

          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-300 font-bold">Select Date to Manage:</span>
            <input
              type="date"
              value={calendarDateInput}
              onChange={(e) => setCalendarDateInput(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg p-1 text-white text-xs"
            />
          </div>

          {functionHalls.map((hall) => {
            const isBlocked = hall.bookedDates.includes(calendarDateInput);
            return (
              <div
                key={hall.id}
                className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">{hall.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {hall.capacity} • ₹{hall.pricePerDay}/day
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-black text-[9px] ${
                      isBlocked
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {isBlocked ? `BOOKED (${calendarDateInput})` : `AVAILABLE (${calendarDateInput})`}
                  </span>
                </div>
                <div className="text-[9px] text-slate-400">
                  Blocked Dates: {hall.bookedDates.length > 0 ? hall.bookedDates.join(', ') : 'None'}
                </div>
                <button
                  onClick={() => handleToggleHallDate(hall.id, calendarDateInput)}
                  className={`w-full py-1.5 rounded-xl font-black text-[10px] cursor-pointer ${
                    isBlocked ? 'bg-emerald-400 text-slate-950' : 'bg-rose-600 text-white'
                  }`}
                >
                  {isBlocked
                    ? `✓ Mark ${calendarDateInput} Available for Consumers`
                    : `🔒 Block ${calendarDateInput} as Booked`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: ANONYMOUS REVERSE-BIDDING ON CONSUMER BROADCASTS ONLY */}
      {tab === 'bidding_desk' && (
        <div className="space-y-2.5 text-white text-xs">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-2.5">
            <p className="text-[10px] text-amber-300 font-bold">
              🔒 Strict Rule: Decorators cannot create orders. You can only submit anonymous quotes on active consumer Decor Cart broadcasts.
            </p>
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-300">Consumer Event Date: {eventDate}</span>
              <span className="text-emerald-400">Escrow: {advancePercentage}%</span>
            </div>
            <input
              type="number"
              placeholder="Quote Amount in INR (e.g. 19200)"
              value={myBidAmount}
              onChange={(e) => setMyBidAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white"
            />
            <textarea
              rows={2}
              placeholder="Inclusions (e.g. Welcome arch + 4 LED spotlights)"
              value={myBidReason}
              onChange={(e) => setMyBidReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white"
            />
            <button
              onClick={() => {
                if (!myBidAmount || isNaN(myBidAmount)) return;
                setDecorBids([
                  {
                    id: `bid_${Date.now()}`,
                    maskedVendor: `Verified Decorator #${decorBids.length + 1} (Masked)`,
                    price: Number(myBidAmount),
                    features: myBidReason
                  },
                  ...decorBids
                ]);
                setBiddingStatus('BROADCASTED');
                onTriggerToast('⚡ Anonymous quote sent to Consumer Decor Cart Bidding Window!');
              }}
              className="w-full bg-amber-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
            >
              Submit Anonymous Bid on Consumer Broadcast →
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: MILESTONE ESCROW STATUS */}
      {tab === 'escrow' && (
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-2 text-xs text-white">
          <h3 className="font-bold text-emerald-400">🔒 35% / 85% Escrow Settlement Ledger</h3>
          <p className="text-[10px] text-slate-300">Status: {biddingStatus}</p>
          {selectedWinningBid ? (
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[10px]">
              <p>Total Package: ₹{selectedWinningBid.price}</p>
              <p className="text-amber-300">
                Advance ({advancePercentage}%): ₹
                {Math.round((selectedWinningBid.price * advancePercentage) / 100)}
              </p>
              <p className="text-teal-300">
                Balance ({100 - advancePercentage}% due 5 hrs prior): ₹
                {selectedWinningBid.price -
                  Math.round((selectedWinningBid.price * advancePercentage) / 100)}
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-slate-400">Waiting for consumer to lock winning quote.</p>
          )}
        </div>
      )}
    </MobilePhoneShell>
  );
}

// ============================================================================
// [PORTAL-05] DELIVERY CAPTAIN PORTAL
// Requirement 1.2: As soon as Captain accepts delivery pickup token, Live GPS Route Map
// displays on Captain screen: Captain Current Location -> Merchant Shop -> Consumer Drop!
// ============================================================================
export function DeliveryCaptainPortal({
  phoneOS,
  riders,
  activePartnerId,
  setActivePartnerId,
  orders,
  onAcceptPickupToken,
  riderOtpInput,
  setRiderOtpInput,
  onVerifyDeliveryOtp,
  onSwitchToPersonalShop,
  onOpenAccountSettings,
  onLogout
}) {
  const currentPartner = riders.find((r) => r.id === activePartnerId) || riders[0];

  return (
    <MobilePhoneShell
      title="WE4ALL Captain Radar"
      badge={`🔋 ${currentPartner.batteryPct}% • GPS`}
      phoneOS={phoneOS}
      onLogout={onLogout}
    >
      <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-white">
        <div>
          <h2 className="text-xs font-black text-teal-300">Delivery & Bike Taxi Radar</h2>
          <p className="text-[9px] text-slate-400">LIVE ROUTE MAP • OTP MASKED UNTIL DOORSTEP</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onOpenAccountSettings}
            className="bg-slate-800 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-xl text-[9px] font-bold cursor-pointer"
          >
            👤 PIN/Bio
          </button>
          <button
            onClick={onSwitchToPersonalShop}
            className="bg-slate-800 text-teal-300 border border-teal-500/40 px-2 py-1 rounded-xl text-[9px] font-bold cursor-pointer"
          >
            🛍️ Personal Shop
          </button>
        </div>
      </div>

      {/* Captain Selector */}
      <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 flex justify-between items-center text-white">
        <select
          value={activePartnerId}
          onChange={(e) => setActivePartnerId(e.target.value)}
          className="bg-slate-950 text-amber-300 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-700 outline-none"
        >
          {riders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.vehicleType === '2W' ? '🏍️' : '🛺'} {r.name} (★{r.rating})
            </option>
          ))}
        </select>
        <span className="text-[9px] text-emerald-400 font-bold">{currentPartner.currentGps}</span>
      </div>

      {/* Active Dispatch Queue & Live 3-Point GPS Map */}
      <div className="space-y-2.5 text-white">
        {orders.length === 0 ? (
          <p className="text-[11px] text-slate-400 py-8 text-center">
            No active dispatches. Standing by in Adilabad.
          </p>
        ) : (
          orders.map((ord) => (
            <div
              key={ord.id}
              className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-[11px] space-y-2.5"
            >
              <div className="flex justify-between font-bold">
                <span className="text-emerald-400">{ord.id}</span>
                <span className="text-amber-300">Earn ₹{ord.deliveryFee} (100%)</span>
              </div>
              <p className="text-[10px] text-slate-300">
                <strong>Merchant Pickup:</strong> {ord.shopName || 'Sri Laxmi Supermart'}
              </p>
              <p className="text-[10px] text-slate-300">
                <strong>Consumer Drop:</strong> {ord.address}
              </p>

              {ord.status === 'READY_FOR_PICKUP_AGENT_ALERTED' && (
                <button
                  onClick={() => onAcceptPickupToken(ord.id)}
                  className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl text-xs cursor-pointer shadow"
                >
                  ✓ Accept Delivery & Launch Live Route Map →
                </button>
              )}

              {/* REQUIREMENT 1.2: LIVE GPS ROUTE MAP (CAPTAIN -> MERCHANT -> CONSUMER) */}
              {ord.status === 'OUT_FOR_DELIVERY_LIVE_MAP' && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-teal-500/50 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-teal-300">
                      <span>🗺️ LIVE 3-POINT GPS NAVIGATION</span>
                      <span className="animate-pulse text-emerald-400">● GPS LIVE</span>
                    </div>
                    <div className="text-[9px] text-slate-300 space-y-1 pl-1 border-l-2 border-emerald-400">
                      <p>
                        <strong>1. Captain Start:</strong> {currentPartner.currentGps}
                      </p>
                      <p>
                        <strong>2. Merchant Pickup:</strong> {ord.shopName || 'Sri Laxmi Supermart, Subhash Nagar'}
                      </p>
                      <p>
                        <strong>3. Consumer Drop:</strong> {ord.address}
                      </p>
                    </div>
                    <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-700 mt-1">
                      <iframe
                        title="Captain Live Route Map"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src="https://maps.google.com/maps?q=19.6641,78.5320&t=m&z=15&output=embed"
                        allowFullScreen
                      />
                    </div>
                  </div>

                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Enter 4-Digit Consumer Doorstep OTP"
                    value={riderOtpInput}
                    onChange={(e) => setRiderOtpInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-white font-mono"
                  />
                  <button
                    onClick={() => onVerifyDeliveryOtp(ord.id)}
                    className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl text-xs cursor-pointer"
                  >
                    ✓ Verify Doorstep OTP & Complete Delivery
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </MobilePhoneShell>
  );
}

// ============================================================================
// [PORTAL-06] DESKTOP FOUNDER ADMIN WEB SUITE & SILENT MONETIZATION ENGINE
// Requirement 2.10 & 2.11: Admin can silently impose any fee/charge on any
// category, service, product, or Prime membership in the Monetization Section.
// ============================================================================
export function FounderAdminWebSuite({
  founderLogoUrl,
  onUploadFounderPhoto,
  founderTab,
  setFounderTab,
  onReturnToMobile,
  monetizationConfig,
  setMonetizationConfig,
  categories,
  setCategories,
  serviceCategories,
  products,
  setProducts,
  merchants,
  serviceProviders,
  decorators,
  registeredUsers,
  functionHalls,
  orders,
  serviceAppointments,
  pendingMerchants,
  setPendingMerchants,
  pendingSubCategories,
  setPendingSubCategories,
  splitScreens,
  setSplitScreens,
  onLaunchMultiPhone,
  onJumpToFlow,
  onCreateDynamicCategory
}) {
  const [adminDbTab, setAdminDbTab] = useState('merchants');
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏪');

  return (
    <div className="min-h-screen bg-[#040c10] text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 border-b border-emerald-950 px-6 py-3.5 flex flex-wrap justify-between items-center gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <FounderLogoBadge
            logoUrl={founderLogoUrl}
            onUploadLogo={onUploadFounderPhoto}
            size="sm"
          />
          <label className="bg-amber-400/15 border border-amber-400/50 text-amber-300 px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer">
            📷 Upload Original Founder Photo
            <input
              type="file"
              accept="image/*"
              onChange={onUploadFounderPhoto}
              className="hidden"
            />
          </label>
        </div>
        <button
          onClick={onReturnToMobile}
          className="bg-emerald-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs cursor-pointer shadow"
        >
          📱 Return to Clean Mobile App
        </button>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="space-y-2">
          {[
            { id: 'monetization', label: '💰 Monetization Engine', count: 'Silent Fees' },
            { id: 'testing', label: '📱 Multi-Phone Sandbox', count: `${splitScreens.length} Phones` },
            { id: 'flow_tester', label: '🧭 1-Click Flow Tester', count: 'QA Switcher' },
            {
              id: 'approvals',
              label: '🛡️ Approvals & New Categories',
              count: pendingMerchants.length + pendingSubCategories.length
            },
            { id: 'database', label: '🗄️ Classified Master Database', count: '7 Tables' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFounderTab(tab.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition border cursor-pointer ${
                founderTab === tab.id
                  ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">
                {tab.count}
              </span>
            </button>
          ))}
        </aside>

        <main className="lg:col-span-3 space-y-6">
          {/* TAB 1: MONETIZATION SECTION (SILENT BACKEND FEE CONTROL ON ANY CATEGORY/SERVICE/PRODUCT) */}
          {founderTab === 'monetization' && (
            <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 space-y-5 text-xs">
              <div>
                <h2 className="text-base font-extrabold text-amber-400">
                  💰 Founder Monetization Engine (Silent Backend Fee Governance)
                </h2>
                <p className="text-slate-300 mt-0.5">
                  Initially ₹0 across the platform. Impose or update flat (₹) or percentage (%) fees on any category, service, product, or Prime membership at any time without prior notice.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <p className="font-bold text-emerald-400">Global Consumer Platform Fee (₹)</p>
                  <input
                    type="number"
                    value={monetizationConfig.consumerFlatFee}
                    onChange={(e) =>
                      setMonetizationConfig({
                        ...monetizationConfig,
                        consumerFlatFee: Number(e.target.value)
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-bold"
                  />
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <p className="font-bold text-indigo-400">Service Provider Visiting Cut (₹)</p>
                  <input
                    type="number"
                    value={monetizationConfig.serviceVisitFeeCut}
                    onChange={(e) =>
                      setMonetizationConfig({
                        ...monetizationConfig,
                        serviceVisitFeeCut: Number(e.target.value)
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-bold"
                  />
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <p className="font-bold text-amber-400">Merchant Commission (%)</p>
                  <input
                    type="number"
                    value={monetizationConfig.merchantPct}
                    onChange={(e) =>
                      setMonetizationConfig({
                        ...monetizationConfig,
                        merchantPct: Number(e.target.value)
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-bold"
                  />
                </div>
              </div>

              {/* Per-Category & Per-Service Silent Fee Overrides */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-white">
                  Per-Category & Per-Service Surcharge Overrides (₹ Added Silently to Checkout):
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[...categories, ...serviceCategories].map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800"
                    >
                      <span className="font-bold text-slate-200">
                        {cat.icon} {cat.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">₹</span>
                        <input
                          type="number"
                          value={monetizationConfig.categoryFees[cat.id] || 0}
                          onChange={(e) =>
                            setMonetizationConfig({
                              ...monetizationConfig,
                              categoryFees: {
                                ...monetizationConfig.categoryFees,
                                [cat.id]: Number(e.target.value)
                              }
                            })
                          }
                          className="w-20 bg-slate-950 border border-slate-700 rounded-lg p-1 text-right text-emerald-400 font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-PHONE TESTING SANDBOX */}
          {founderTab === 'testing' && (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-extrabold text-emerald-400">
                    📱 5-Phone Multi-Portal Testing Sandbox
                  </h2>
                  <p className="text-xs text-slate-300">
                    Watch Customer, Merchant, Service Provider, Decorator/Hall, and Captain sync live side-by-side.
                  </p>
                </div>
                <button
                  onClick={onLaunchMultiPhone}
                  className="bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs cursor-pointer shadow"
                >
                  Launch All 5 Phones Side-by-Side →
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {splitScreens.map((phone, idx) => (
                  <div
                    key={phone.id}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-700 relative"
                  >
                    <p className="text-[10px] text-slate-400">Phone {idx + 1}</p>
                    <p className="text-xs font-extrabold text-emerald-300 capitalize">
                      {StringString((phone?.role ?? "customer") ?? "").replace('_', ' ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: 1-CLICK PORTAL & FLOW SWITCHER (HIDDEN FROM PUBLIC MOBILE HEADER) */}
          {founderTab === 'flow_tester' && (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 space-y-4 text-xs">
              <h2 className="text-base font-extrabold text-emerald-400">
                🧭 1-Click Portal & Screen Flow Switcher (Admin/QA Only)
              </h2>
              <p className="text-slate-300">
                Public mobile headers are kept 100% clean. Use this Admin QA bench to open any role portal:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: 'customer', label: '1. Customer Super-App' },
                  { id: 'merchant', label: '2. Product Merchant Portal' },
                  { id: 'service_provider', label: '3. Service Provider Portal' },
                  { id: 'decorator', label: '4. Decorator & Hall Portal' },
                  { id: 'rider', label: '5. Delivery Captain Radar' },
                  { id: 'split', label: '6. All 5 Phones Side-by-Side' },
                  { id: 'auth', label: '7. Security Vault (PIN / Biometric Login)' }
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onJumpToFlow(b.id)}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl hover:border-emerald-400 text-left font-bold text-emerald-300 cursor-pointer"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: APPROVALS & DYNAMIC CATEGORY CREATOR (AUTO-CREATES ISOLATED CART) */}
          {founderTab === 'approvals' && (
            <div className="space-y-6 text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                <h2 className="text-sm font-bold text-teal-300">
                  ➕ Create New Dynamic Category (Auto-Creates Isolated Cart)
                </h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-16 bg-slate-950 border border-slate-700 rounded-xl p-2 text-center text-white"
                  />
                  <input
                    type="text"
                    placeholder="New Category Name (e.g. Organic Bakery)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  />
                  <button
                    onClick={() => {
                      if (!newCatName.trim()) return;
                      onCreateDynamicCategory(newCatName.trim(), newCatIcon);
                      setNewCatName('');
                    }}
                    className="bg-emerald-400 text-slate-950 font-black px-4 rounded-xl cursor-pointer"
                  >
                    + Create Category & Isolated Cart
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CLASSIFIED MASTER DATABASE */}
          {founderTab === 'database' && (
            <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 space-y-4 text-xs">
              <h2 className="text-base font-extrabold text-amber-400">
                🗄️ Classified Master Database (7 Tables)
              </h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'merchants', label: `1. Merchants (${merchants.length})` },
                  { id: 'service_providers', label: `2. Service Providers (${serviceProviders.length})` },
                  { id: 'decorators', label: `3. Decorators (${decorators.length})` },
                  { id: 'users', label: `4. Consumers (${registeredUsers.length})` },
                  { id: 'catalog', label: `5. Stock Catalog (${products.length})` },
                  { id: 'halls', label: `6. Function Halls (${functionHalls.length})` },
                  { id: 'orders', label: `7. Orders & Bookings (${orders.length + serviceAppointments.length})` }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setAdminDbTab(t.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                      adminDbTab === t.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}