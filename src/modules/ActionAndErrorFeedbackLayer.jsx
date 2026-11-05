import React, { useState, useEffect, useRef } from "react";
import { loadCloudAndLocalState, saveCloudAndLocalState } from "../supabaseClient";

export default function ActionAndErrorFeedbackLayer({ children }) {
  const [permissionsGranted, setPermissionsGranted] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("we4all_install_permissions_granted_v1") === "true";
  });

  const [checkoutAuthModal, setCheckoutAuthModal] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({ fullName: "", phone: "", pin: "" });
  const [activeActionToast, setActiveActionToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showActionReflection = (label, stage = "EXECUTED ✓") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setActiveActionToast({ label: String(label || "").slice(0, 58), stage });
    toastTimerRef.current = setTimeout(() => setActiveActionToast(null), 2300);
  };

  const handleGrantAllInstallPermissions = () => {
    try {
      localStorage.setItem("we4all_install_permissions_granted_v1", "true");
    } catch (e) {}
    setPermissionsGranted(true);
    showActionReflection("Guest Visitor Mode Enabled ✓", "READY ✓");
  };

  const isPaymentTrigger = (text) => {
    const t = String(text || "").toLowerCase().trim();
    // Allow cart building & viewing without login
    if (
      t.includes("add to cart") ||
      t === "+ add" ||
      t === "add" ||
      t.startsWith("carts (") ||
      t.includes("compare") ||
      t.includes("view cart")
    ) {
      return false;
    }
    const payWords = [
      "select upi app",
      "pay now",
      "pay &",
      "pay rs",
      "proceed to pay",
      "proceed to checkout",
      "place order",
      "confirm & pay",
      "pay visiting",
      "pay 35%",
      "pay advance",
      "phonepe",
      "google pay",
      "paytm",
      "bhim upi"
    ];
    return payWords.some((p) => t.includes(p));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleGlobalClick = (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== "function") return;
      if (target.closest("[data-we4all-monitor-ignore='true']")) return;

      const btn = target.closest("button, a[href], [role='button']");
      if (!btn) return;

      const rawLabel = (btn.innerText || btn.textContent || "").replace(/\s+/g, " ").trim();

      try {
        let boundUser = null;
        const raw = localStorage.getItem("we4all_persistent_user_session_v8");
        if (raw) boundUser = JSON.parse(raw);

        // If user is a Guest Consumer and clicks a payment button, intercept with login/registration modal!
        if ((!boundUser || boundUser.isGuest) && isPaymentTrigger(rawLabel)) {
          e.stopPropagation();
          e.preventDefault();
          setCheckoutAuthModal({ attemptedAction: rawLabel.slice(0, 40) });
          showActionReflection("Login / Registration Mandatory Before Payment", "AUTH REQUIRED 🔒");
          return;
        }
      } catch (err) {}

      if (rawLabel && rawLabel.length > 1 && rawLabel !== "X") {
        showActionReflection(rawLabel, "EXECUTED ✓");
      }
    };

    document.addEventListener("click", handleGlobalClick, true);
    return () => document.removeEventListener("click", handleGlobalClick, true);
  }, []);

  return (
    <>
      {children}

      {/* MANDATORY PRE-PAYMENT LOGIN MODAL FOR GUESTS */}
      {checkoutAuthModal && (
        <div
          data-we4all-monitor-ignore="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.94)",
            zIndex: 100005,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            fontFamily: "system-ui, sans-serif"
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "2px solid #fbbf24",
              borderRadius: "28px",
              maxWidth: "420px",
              width: "100%",
              padding: "24px",
              color: "#f8fafc",
              boxShadow: "0 25px 50px rgba(0,0,0,0.9)"
            }}
          >
            <span
              style={{
                background: "#fbbf24",
                color: "#020617",
                fontWeight: 900,
                fontSize: "10px",
                padding: "3px 10px",
                borderRadius: "999px"
              }}
            >
              🔒 MANDATORY LOGIN BEFORE PAYMENT
            </span>
            <h3 style={{ margin: "12px 0 6px", fontSize: "17px", fontWeight: 900, color: "#fff" }}>
              Log in to Complete Payment
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#94a3b8" }}>
              Your cart items are safely saved. Enter your mobile number and 4-digit PIN to process your order immediately.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              <input
                type="text"
                value={checkoutForm.fullName}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, fullName: e.target.value })}
                placeholder="Full Name *"
                style={{ background: "#020617", border: "1px solid #334155", borderRadius: "12px", padding: "11px", color: "#fff", fontSize: "12px" }}
              />
              <input
                type="tel"
                maxLength={10}
                value={checkoutForm.phone}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                placeholder="10-Digit Mobile Number *"
                style={{ background: "#020617", border: "1px solid #334155", borderRadius: "12px", padding: "11px", color: "#fff", fontSize: "12px", fontWeight: 700 }}
              />
              <input
                type="password"
                maxLength={4}
                value={checkoutForm.pin}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                placeholder="4-Digit PIN (e.g. 1990) *"
                style={{ background: "#020617", border: "1px solid #334155", borderRadius: "12px", padding: "11px", color: "#34d399", fontSize: "13px", fontWeight: 900 }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  if (!checkoutForm.phone || checkoutForm.phone.length !== 10 || checkoutForm.pin.length !== 4) {
                    alert("Please enter a 10-digit mobile number and 4-digit PIN.");
                    return;
                  }
                  const user = {
                    id: `cust_${Date.now()}`,
                    fullName: checkoutForm.fullName.trim() || "Consumer Shopper",
                    name: checkoutForm.fullName.trim() || "Consumer Shopper",
                    phone: checkoutForm.phone,
                    role: "customer",
                    portal: "customer",
                    upiId: `${checkoutForm.phone}@ybl`,
                    pin: checkoutForm.pin,
                    isGuest: false,
                    status: "Approved"
                  };
                  try {
                    localStorage.setItem("we4all_persistent_user_session_v8", JSON.stringify(user));
                  } catch (e) {}
                  const snap = loadCloudAndLocalState() || {};
                  const existingUsers = Array.isArray(snap.registeredUsers) ? snap.registeredUsers : [];
                  saveCloudAndLocalState({
                    currentUser: user,
                    registeredUsers: [user, ...existingUsers]
                  });
                  setCheckoutAuthModal(null);
                  showActionReflection("Logged In! Payment Unlocked ✓", "SUCCESS ✓");
                }}
                style={{ flex: 1, background: "#10b981", color: "#022c22", border: "none", borderRadius: "14px", padding: "12px", fontWeight: 900, fontSize: "12px", cursor: "pointer" }}
              >
                ✓ Verify &amp; Proceed to Pay Now →
              </button>
              <button
                type="button"
                onClick={() => setCheckoutAuthModal(null)}
                style={{ background: "#1e293b", color: "#cbd5e1", border: "none", borderRadius: "14px", padding: "12px", fontWeight: 800, fontSize: "12px", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIRST-INSTALL PERMISSIONS MODAL */}
      {!permissionsGranted && (
        <div
          data-we4all-monitor-ignore="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.94)",
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            fontFamily: "system-ui, sans-serif"
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "2px solid #10b981",
              borderRadius: "28px",
              maxWidth: "440px",
              width: "100%",
              padding: "22px",
              color: "#f8fafc"
            }}
          >
            <span style={{ background: "#10b981", color: "#022c22", fontWeight: 900, fontSize: "10px", padding: "3px 10px", borderRadius: "999px" }}>
              🛡️ WE4ALL FIRST-INSTALL PERMISSIONS
            </span>
            <h2 style={{ margin: "10px 0 4px", fontSize: "18px", fontWeight: 900, color: "#fff" }}>
              Allow App Permissions to Start
            </h2>
            <p style={{ margin: "0 0 14px", fontSize: "12px", color: "#94a3b8" }}>
              You start in <strong>Guest Visitor Mode</strong> where you can browse and add items or services to your cart freely. Login or registration is required only before payment.
            </p>
            <button
              type="button"
              onClick={handleGrantAllInstallPermissions}
              style={{ width: "100%", background: "#10b981", color: "#022c22", border: "none", borderRadius: "16px", padding: "13px", fontWeight: 900, fontSize: "13px", cursor: "pointer" }}
            >
              ✓ Allow &amp; Start as Guest Visitor →
            </button>
          </div>
        </div>
      )}

      {/* ACTION REFLECTION TOAST */}
      {activeActionToast && (
        <div
          data-we4all-monitor-ignore="true"
          style={{
            position: "fixed",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99990,
            background: "rgba(6, 78, 59, 0.96)",
            border: "1.5px solid #34d399",
            color: "#ecfdf5",
            padding: "8px 14px",
            borderRadius: "999px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: "system-ui, sans-serif",
            fontSize: "11px",
            fontWeight: 800,
            pointerEvents: "none"
          }}
        >
          <span style={{ background: "#10b981", color: "#022c22", padding: "2px 6px", borderRadius: "999px", fontSize: "9px", fontWeight: 900 }}>
            ⚡ {activeActionToast.stage}
          </span>
          <span>{activeActionToast.label}</span>
        </div>
      )}
    </>
  );
}
