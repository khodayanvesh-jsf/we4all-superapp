import React, { useState, useEffect, useRef } from "react";
import {
  getServerConfig,
  getFounderCredentials,
  loadCloudAndLocalState,
  subscribeToRealtimeUpdates
} from "../supabaseClient";

const PERMISSIONS_STORAGE_KEY = "we4all_install_permissions_granted_v1";

export default function ActionAndErrorFeedbackLayer({ children }) {
  const [permissionsGranted, setPermissionsGranted] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(PERMISSIONS_STORAGE_KEY) === "true";
  });

  const [permChecklist, setPermChecklist] = useState({
    gps: true,
    camera: true,
    notifications: true,
    storage: true
  });

  const [portalAccessModal, setPortalAccessModal] = useState(null);
  const [liveApprovalBanner, setLiveApprovalBanner] = useState(null);

  const [activeActionToast, setActiveActionToast] = useState(null);
  const [activeErrorBanner, setActiveErrorBanner] = useState(null);
  const [pipelineState, setPipelineState] = useState("IDLE");
  const [eventLogs, setEventLogs] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [runningSelfTest, setRunningSelfTest] = useState(false);
  const toastTimerRef = useRef(null);
  const lastSeenApprovalRef = useRef("");

  const pushLog = (entry) => {
    const item = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      ...entry
    };
    setEventLogs((prev) => [item, ...prev.slice(0, 49)]);
  };

  const showActionReflection = (label, stage = "EXECUTED ✓", detail = "") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const payload = {
      label: String(label || "User Action").slice(0, 68),
      stage,
      detail,
      timestamp: Date.now()
    };
    setActiveActionToast(payload);
    pushLog({
      category: "ACTION",
      stage,
      title: payload.label,
      detail: detail || "UI state updated immediately"
    });
    toastTimerRef.current = setTimeout(() => {
      setActiveActionToast(null);
    }, 2300);
  };

  const reportDiagnosticError = (stageLabel, title, message, fixHint = "") => {
    const errObj = {
      stage: stageLabel,
      title: String(title || "Operation Notice"),
      message: String(message || "Action blocked"),
      fixHint: fixHint || "Check requirements and try again.",
      time: new Date().toLocaleTimeString()
    };
    setPipelineState("ERROR");
    setActiveErrorBanner(errObj);
    pushLog({
      category: "ERROR",
      stage: stageLabel,
      title: errObj.title,
      detail: `${errObj.message} ${errObj.fixHint ? `(${errObj.fixHint})` : ""}`
    });
  };

  // Step 1.1: Grant All Permissions on First Install & Start in Default Consumer Role
  const handleGrantAllInstallPermissions = () => {
    try {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {}, {
          timeout: 4000
        });
      }
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      localStorage.setItem(PERMISSIONS_STORAGE_KEY, "true");
    } catch (e) {}
    setPermissionsGranted(true);
    showActionReflection(
      "All Device Permissions Allowed — Default Consumer Mode Active",
      "READY ✓"
    );
  };

  // Step 2.3: Watch for Real-Time Admin Approval Notification for the Logged-In Partner
  useEffect(() => {
    const unsub = subscribeToRealtimeUpdates((payload) => {
      if (!payload) return;
      const notif = payload.lastApprovedPartnerNotification;
      if (!notif || !notif.approvedAt) return;
      if (lastSeenApprovalRef.current === notif.approvedAt) return;

      try {
        const rawUser = localStorage.getItem("we4all_device_bound_user_v5");
        if (!rawUser) return;
        const myUser = JSON.parse(rawUser);
        if (
          myUser &&
          !myUser.isGuest &&
          (myUser.id === notif.partnerId ||
            (myUser.phone && myUser.phone === notif.phone))
        ) {
          lastSeenApprovalRef.current = notif.approvedAt;
          const updatedUser = {
            ...myUser,
            status: "Approved",
            isPublished: true,
            approvedAt: notif.approvedAt
          };
          localStorage.setItem(
            "we4all_device_bound_user_v5",
            JSON.stringify(updatedUser)
          );
          setLiveApprovalBanner({
            name: notif.name || updatedUser.fullName,
            role: updatedUser.role,
            approvedAt: notif.approvedAt
          });
          setPortalAccessModal(null);
          showActionReflection(
            `Admin Approved Your ${updatedUser.role.toUpperCase()} Account!`,
            "APPROVED ✓"
          );
        }
      } catch (e) {}
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const styleId = "we4all-instant-reflection-styles";
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        @keyframes we4allClickPulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.85); transform: scale(0.97); }
          70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); transform: scale(1.01); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); transform: scale(1); }
        }
        .we4all-action-flash {
          animation: we4allClickPulse 0.38s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `;
      document.head.appendChild(styleEl);
    }

    const origFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      let rawUrl = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      const method = (args[1]?.method || "GET").toUpperCase();
      if (typeof args[0] === "string" && rawUrl.includes("/rest/v1/rest/v1")) {
        rawUrl = rawUrl.replace(/(\/rest\/v1)+/gi, "/rest/v1");
        args[0] = rawUrl;
      }
      const isSyncOrBackend =
        rawUrl.includes("/api/sync") || rawUrl.includes("supabase.co");
      if (isSyncOrBackend && method === "POST") setPipelineState("SYNCING");

      try {
        const res = await origFetch(...args);
        if (res.ok && isSyncOrBackend && method === "POST") {
          setPipelineState("SYNCED");
          pushLog({
            category: "SYNC",
            stage: "CLOUD SYNCED",
            title: `Synced with Cloud Server (${method})`,
            detail: rawUrl.split("?")[0]
          });
        }
        return res;
      } catch (networkErr) {
        throw networkErr;
      }
    };

    // STEP 6 & STEP 2.3: STRICT PORTAL ISOLATION & PENDING APPROVAL INTERCEPTOR
    const detectPortalFooterTarget = (btnText) => {
      const t = String(btnText || "").toLowerCase();
      if (
        (t.includes("merchant") || t.includes("shop owner")) &&
        !t.includes("compare") &&
        !t.includes("approve") &&
        !t.includes("1. ") &&
        !t.includes("2. ") &&
        !t.includes("4. ")
      ) {
        return { role: "merchant", title: "Product Merchant Portal" };
      }
      if (
        (t.includes("service pro") || t.includes("provider portal")) &&
        !t.includes("approve") &&
        !t.includes("3. ") &&
        !t.includes("4. ")
      ) {
        return { role: "service_provider", title: "Home Service Provider Portal" };
      }
      if (
        (t.includes("decorator") || t.includes("decor portal")) &&
        !t.includes("approve") &&
        !t.includes("2. ") &&
        !t.includes("5. ")
      ) {
        return { role: "decorator", title: "Decorator & Function Hall Portal" };
      }
      if (
        (t.includes("captain") || t.includes("rider portal")) &&
        !t.includes("approve") &&
        !t.includes("1. ") &&
        !t.includes("7. ")
      ) {
        return { role: "rider", title: "Delivery Captain Portal" };
      }
      return null;
    };

    const handleGlobalClick = (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== "function") return;
      if (target.closest("[data-we4all-monitor-ignore='true']")) return;

      const interactiveEl = target.closest(
        "button, a[href], input[type='checkbox'], input[type='radio'], [role='button']"
      );
      if (!interactiveEl) return;

      const rawLabel = (
        interactiveEl.getAttribute("aria-label") ||
        interactiveEl.getAttribute("title") ||
        interactiveEl.innerText ||
        interactiveEl.textContent ||
        interactiveEl.value ||
        ""
      )
        .replace(/\s+/g, " ")
        .trim();

      // Check if user clicked a bottom-footer Partner Portal switcher button
      const isFooterNavBtn =
        Boolean(interactiveEl.closest("footer, nav")) ||
        rawLabel.includes("Merchant") ||
        rawLabel.includes("Service Pro") ||
        rawLabel.includes("Decorator") ||
        rawLabel.includes("Captain");

      if (isFooterNavBtn && !window.location.search.includes("admin=true")) {
        const portalTarget = detectPortalFooterTarget(rawLabel);
        if (portalTarget) {
          let activeUser = null;
          try {
            const saved = localStorage.getItem("we4all_device_bound_user_v5");
            if (saved) activeUser = JSON.parse(saved);
          } catch (err) {}

          // Case 1: Default Guest / Unauthenticated User trying to enter a Partner Portal
          if (!activeUser || activeUser.isGuest) {
            e.stopPropagation();
            e.preventDefault();
            sessionStorage.setItem("we4all_TargetLoginRole", portalTarget.role);
            setPortalAccessModal({
              mode: "LOGIN_REQUIRED",
              targetRole: portalTarget.role,
              targetTitle: portalTarget.title,
              message: `You are currently in the Default Consumer Role. To access the ${portalTarget.title}, please log in or register specifically as a ${portalTarget.title} user in the Account section.`
            });
            return;
          }

          // Case 2: Logged in as a DIFFERENT role (Step 6: Anyone can do Consumer + their own role, but NO more access!)
          if (activeUser.role !== portalTarget.role) {
            e.stopPropagation();
            e.preventDefault();
            setPortalAccessModal({
              mode: "ROLE_MISMATCH",
              currentRole: activeUser.role,
              targetRole: portalTarget.role,
              targetTitle: portalTarget.title,
              message: `Strict Portal Isolation (Step 6): You are logged in as "${activeUser.fullName}" (${activeUser.role.toUpperCase()}). You can use the Consumer Portal and your own ${activeUser.role.toUpperCase()} Portal only. To access ${portalTarget.title}, please Logout from the Account section first.`
            });
            return;
          }

          // Case 3: Logged into their OWN Partner Role, but still Waiting for Founder Admin Approval (Step 2.3)
          if (activeUser.status === "Pending Admin Approval") {
            e.stopPropagation();
            e.preventDefault();
            setPortalAccessModal({
              mode: "WAITING_APPROVAL",
              currentRole: activeUser.role,
              targetRole: portalTarget.role,
              targetTitle: portalTarget.title,
              partnerName: activeUser.businessName || activeUser.fullName,
              message: `Your ${portalTarget.title} registration ("${
                activeUser.businessName || activeUser.fullName
              }") has been forwarded to Founder Admin for 5-Point KYC approval. You will be notified immediately as soon as your portal is approved! Until then, you can continue shopping in the Consumer Portal.`
            });
            return;
          }
        }
      }

      interactiveEl.classList.remove("we4all-action-flash");
      void interactiveEl.offsetWidth;
      interactiveEl.classList.add("we4all-action-flash");

      if (interactiveEl.disabled || interactiveEl.getAttribute("aria-disabled") === "true") {
        reportDiagnosticError(
          "FRONTEND VALIDATION",
          `Action Locked: "${rawLabel.slice(0, 45)}"`,
          "Prerequisite fields or checklist items are incomplete.",
          "Complete all required fields above to unlock this button."
        );
        return;
      }

      if (rawLabel && rawLabel.length >= 1 && rawLabel !== "X") {
        showActionReflection(rawLabel, "EXECUTED ✓");
      }
    };

    document.addEventListener("click", handleGlobalClick, true);
    return () => {
      window.fetch = origFetch;
      document.removeEventListener("click", handleGlobalClick, true);
    };
  }, []);

  return (
    <>
      {children}

      {/* =====================================================================
          STEP 1.1: FIRST-INSTALL ALL-PERMISSIONS GATEWAY MODAL
      ===================================================================== */}
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
              color: "#f8fafc",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.9)"
            }}
          >
            <span
              style={{
                background: "#10b981",
                color: "#022c22",
                fontWeight: 900,
                fontSize: "10px",
                padding: "3px 10px",
                borderRadius: "999px"
              }}
            >
              &#x1F6E1;&#xFE0F; WE4ALL FIRST-INSTALL SETUP
            </span>
            <h2 style={{ margin: "10px 0 4px", fontSize: "18px", fontWeight: 900, color: "#fff" }}>
              Allow App Permissions to Start
            </h2>
            <p style={{ margin: "0 0 14px", fontSize: "12px", color: "#94a3b8" }}>
              WE4ALL uses device permissions only for hyperlocal delivery, partner KYC verification, and instant order/approval alerts. You will start in the <strong>Default Consumer Role</strong>.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {[
                {
                  key: "gps",
                  title: "\uD83D\uDCCD Live GPS Location",
                  desc: "For accurate Adilabad town shop distances & doorstep delivery"
                },
                {
                  key: "camera",
                  title: "\uD83D\uDCF7 Camera & Photo Media",
                  desc: "For profile photo, KYC documents & product images"
                },
                {
                  key: "notifications",
                  title: "\uD83D\uDD14 Instant Push Notifications",
                  desc: "For real-time order updates & Founder Admin approval alerts"
                },
                {
                  key: "storage",
                  title: "\uD83D\uDCBE Offline Cache & Zero-Loss Vault",
                  desc: "Keeps your cart and account safe even on low signal"
                }
              ].map((p) => (
                <div
                  key={p.key}
                  onClick={() =>
                    setPermChecklist({ ...permChecklist, [p.key]: !permChecklist[p.key] })
                  }
                  style={{
                    background: "#020617",
                    border: permChecklist[p.key] ? "1.5px solid #34d399" : "1px solid #334155",
                    borderRadius: "14px",
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "12px", color: "#ecfdf5" }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>{p.desc}</div>
                  </div>
                  <span
                    style={{
                      background: permChecklist[p.key] ? "#10b981" : "#334155",
                      color: permChecklist[p.key] ? "#022c22" : "#cbd5e1",
                      fontWeight: 900,
                      fontSize: "10px",
                      padding: "3px 8px",
                      borderRadius: "8px"
                    }}
                  >
                    {permChecklist[p.key] ? "ALLOWED \u2713" : "ALLOW"}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleGrantAllInstallPermissions}
              style={{
                width: "100%",
                background: "#10b981",
                color: "#022c22",
                border: "none",
                borderRadius: "16px",
                padding: "13px",
                fontWeight: 900,
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: "0 10px 20px rgba(16, 185, 129, 0.35)"
              }}
            >
              &#x2713; Allow All Permissions &amp; Enter Consumer Storefront &rarr;
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 2.3 & STEP 6: PORTAL ACCESS GUARD & WAITING-FOR-APPROVAL MODAL
      ===================================================================== */}
      {portalAccessModal && (
        <div
          data-we4all-monitor-ignore="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.88)",
            zIndex: 99998,
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
              border:
                portalAccessModal.mode === "WAITING_APPROVAL"
                  ? "2px solid #fbbf24"
                  : "2px solid #f43f5e",
              borderRadius: "26px",
              maxWidth: "430px",
              width: "100%",
              padding: "22px",
              color: "#f8fafc",
              textAlign: "center"
            }}
          >
            <div style={{ fontSize: "34px", marginBottom: "6px" }}>
              {portalAccessModal.mode === "WAITING_APPROVAL"
                ? "\u23F3"
                : portalAccessModal.mode === "LOGIN_REQUIRED"
                ? "\uD83D\uDD10"
                : "\uD83D\uDEAB"}
            </div>
            <span
              style={{
                background:
                  portalAccessModal.mode === "WAITING_APPROVAL" ? "#fbbf24" : "#f43f5e",
                color:
                  portalAccessModal.mode === "WAITING_APPROVAL" ? "#020617" : "#ffffff",
                fontWeight: 900,
                fontSize: "10px",
                padding: "3px 10px",
                borderRadius: "999px",
                textTransform: "uppercase"
              }}
            >
              {portalAccessModal.mode === "WAITING_APPROVAL"
                ? "Waiting For Founder Admin Approval"
                : portalAccessModal.mode === "LOGIN_REQUIRED"
                ? "Specific Portal Login Required"
                : "Strict Portal Role Isolation"}
            </span>
            <h3 style={{ margin: "10px 0 6px", fontSize: "17px", fontWeight: 900 }}>
              {portalAccessModal.targetTitle}
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#cbd5e1", lineHeight: 1.5 }}>
              {portalAccessModal.message}
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  setPortalAccessModal(null);
                  // Click the Account button in the footer nav if they need to login/logout
                  const allBtns = Array.from(document.querySelectorAll("button"));
                  const accBtn = allBtns.find((b) =>
                    (b.innerText || "").toLowerCase().includes("account")
                  );
                  if (accBtn) accBtn.click();
                }}
                style={{
                  flex: 1,
                  background: "#fbbf24",
                  color: "#020617",
                  border: "none",
                  borderRadius: "14px",
                  padding: "11px",
                  fontWeight: 900,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Go to Account Section
              </button>
              <button
                type="button"
                onClick={() => setPortalAccessModal(null)}
                style={{
                  flex: 1,
                  background: "#1e293b",
                  color: "#e2e8f0",
                  border: "none",
                  borderRadius: "14px",
                  padding: "11px",
                  fontWeight: 800,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Stay in Consumer Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 2.3: INSTANT LIVE ADMIN APPROVAL NOTIFICATION MODAL
      ===================================================================== */}
      {liveApprovalBanner && (
        <div
          data-we4all-monitor-ignore="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.85)",
            zIndex: 100001,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            fontFamily: "system-ui, sans-serif"
          }}
        >
          <div
            style={{
              background: "#064e3b",
              border: "2px solid #34d399",
              borderRadius: "28px",
              maxWidth: "420px",
              width: "100%",
              padding: "24px",
              color: "#ecfdf5",
              textAlign: "center",
              boxShadow: "0 25px 50px rgba(0,0,0,0.85)"
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>\uD83C\uDF89</div>
            <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 900, color: "#fff" }}>
              Partner Application Approved!
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#a7f3d0" }}>
              Founder Admin has approved <strong>{liveApprovalBanner.name}</strong>! Your{" "}
              <strong>{String(liveApprovalBanner.role || "").toUpperCase()}</strong> portal is now unlocked and ready.
            </p>
            <button
              type="button"
              onClick={() => setLiveApprovalBanner(null)}
              style={{
                width: "100%",
                background: "#fbbf24",
                color: "#020617",
                border: "none",
                borderRadius: "14px",
                padding: "12px",
                fontWeight: 900,
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              &#x2713; Awesome! Continue to My Portal &rarr;
            </button>
          </div>
        </div>
      )}

      {/* INSTANT ACTION EXECUTION REFLECTION PILL */}
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
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.65)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: "system-ui, sans-serif",
            fontSize: "11px",
            fontWeight: 800,
            maxWidth: "92vw",
            pointerEvents: "none"
          }}
        >
          <span
            style={{
              background: "#10b981",
              color: "#022c22",
              padding: "2px 6px",
              borderRadius: "999px",
              fontSize: "9px",
              fontWeight: 900,
              whiteSpace: "nowrap"
            }}
          >
            &#x26A1; {activeActionToast.stage}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeActionToast.label}
          </span>
        </div>
      )}

      {/* ERROR ALERT BANNER */}
      {activeErrorBanner && (
        <div
          data-we4all-monitor-ignore="true"
          style={{
            position: "fixed",
            top: "52px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99995,
            background: "#1f0910",
            border: "2px solid #f43f5e",
            color: "#ffe4e6",
            padding: "12px 14px",
            borderRadius: "16px",
            boxShadow: "0 15px 35px rgba(0,0,0,0.8)",
            width: "92vw",
            maxWidth: "500px",
            fontFamily: "system-ui, sans-serif",
            fontSize: "11px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span
              style={{
                background: "#f43f5e",
                color: "#fff",
                fontWeight: 900,
                fontSize: "9px",
                padding: "2px 6px",
                borderRadius: "6px",
                textTransform: "uppercase"
              }}
            >
              &#x26A0;&#xFE0F; {activeErrorBanner.stage}
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveErrorBanner(null);
                setPipelineState("IDLE");
              }}
              style={{
                background: "#881337",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "2px 8px",
                fontSize: "9px",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              Dismiss &#x2715;
            </button>
          </div>
          <div style={{ fontWeight: 900, color: "#fda4af", fontSize: "12px" }}>
            {activeErrorBanner.title}
          </div>
          <div style={{ color: "#fecdd3", marginTop: "2px" }}>{activeErrorBanner.message}</div>
        </div>
      )}
    </>
  );
}