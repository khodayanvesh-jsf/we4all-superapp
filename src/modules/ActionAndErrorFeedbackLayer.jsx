import React, { useState, useEffect, useRef } from "react";

export default function ActionAndErrorFeedbackLayer({ children }) {
  const [activeActionToast, setActiveActionToast] = useState(null);
  const [activeErrorBanner, setActiveErrorBanner] = useState(null);
  const [pipelineState, setPipelineState] = useState("IDLE"); // IDLE | SYNCING | SYNCED | ERROR
  const [eventLogs, setEventLogs] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toastTimerRef = useRef(null);

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

  const showActionReflection = (label, stage = "EXECUTED", detail = "") => {
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
    }, 2600);
  };

  const reportDiagnosticError = (stageLabel, title, message, fixHint = "") => {
    const errObj = {
      stage: stageLabel, // FRONTEND UI | API BRIDGE | BACKEND DB | PIPELINE
      title: String(title || "Operation Error"),
      message: String(message || "Unknown error occurred"),
      fixHint:
        fixHint ||
        "Your local state is safe. Check the Pipeline Monitor for full details.",
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Inject tactile pulse animation styles for clicked buttons and inputs
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

    // 1. Intercept window.fetch to monitor In-Between API Bridge & Backend DB Pipeline
    const origFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const rawUrl = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      const method = (args[1]?.method || "GET").toUpperCase();
      const isSyncOrBackend =
        rawUrl.includes("/api/sync") ||
        rawUrl.includes("supabase.co") ||
        rawUrl.includes("ota-manifest.json");

      if (isSyncOrBackend && method === "POST") {
        setPipelineState("SYNCING");
      }

      try {
        const res = await origFetch(...args);
        if (!res.ok && isSyncOrBackend) {
          let errBody = "";
          try {
            const cloned = res.clone();
            errBody = (await cloned.text()).slice(0, 160);
          } catch (e) {}

          // Ignore silent background GET 401/404 if Supabase anon key isn't set yet, but log it in drawer
          const isSupabaseDirect = rawUrl.includes("supabase.co");
          if (isSupabaseDirect && res.status === 401) {
            pushLog({
              category: "WARNING",
              stage: "BACKEND DB",
              title: `Supabase Auth (${res.status})`,
              detail:
                "Direct Supabase Anon Key not set or unauthorized; using Vercel /api/sync Cloud Relay instead."
            });
          } else {
            reportDiagnosticError(
              isSupabaseDirect ? "BACKEND SUPABASE DB" : "IN-BETWEEN API BRIDGE",
              `${method} ${rawUrl.split("?")[0].split("/").slice(-2).join("/")} Failed (HTTP ${res.status})`,
              errBody || `Server responded with status ${res.status} ${res.statusText}`,
              "Data is preserved in local device storage and will retry automatically."
            );
          }
        } else if (res.ok && isSyncOrBackend && method === "POST") {
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
        if (isSyncOrBackend) {
          reportDiagnosticError(
            "NETWORK / PIPELINE BRIDGE",
            `Connection Error on ${method} ${rawUrl.split("?")[0].split("/").pop() || "Server"}`,
            networkErr?.message || "Unable to reach backend server (Device Offline or DNS/CORS issue)",
            "Changes are saved locally on this device and will sync when connection restores."
          );
        }
        throw networkErr;
      }
    };

    // 2. Global Click Listener for Instant User Action Reflection
    const handleGlobalClick = (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== "function") return;
      if (target.closest("[data-we4all-monitor-ignore='true']")) return;

      const interactiveEl = target.closest(
        "button, a[href], input[type='checkbox'], input[type='radio'], [role='button']"
      );
      if (!interactiveEl) return;

      // Apply visual pulse feedback
      interactiveEl.classList.remove("we4all-action-flash");
      void interactiveEl.offsetWidth;
      interactiveEl.classList.add("we4all-action-flash");

      // Check if button is disabled
      if (interactiveEl.disabled || interactiveEl.getAttribute("aria-disabled") === "true") {
        const disabledText = (interactiveEl.innerText || interactiveEl.textContent || "Button")
          .replace(/\s+/g, " ")
          .trim();
        reportDiagnosticError(
          "FRONTEND VALIDATION",
          `Action Locked: "${disabledText.slice(0, 45)}"`,
          "This button is currently disabled because prerequisite steps (such as 5-Point KYC Checklist or Minimum Order amount) are incomplete.",
          "Complete the required fields or checklist items above to unlock this button."
        );
        return;
      }

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

      if (rawLabel && rawLabel.length >= 1 && rawLabel !== "X") {
        showActionReflection(
          rawLabel,
          "EXECUTED ✓",
          "Selection applied & state updated"
        );
      }
    };

    // 3. Global Change Listener for Dropdowns (<select>), Sliders (<input type="range">), File Uploads
    const handleGlobalChange = (e) => {
      const el = e.target;
      if (!el || !el.tagName) return;
      if (el.closest && el.closest("[data-we4all-monitor-ignore='true']")) return;

      const tag = el.tagName.toUpperCase();
      if (tag === "SELECT") {
        const selectedText = el.options?.[el.selectedIndex]?.text || el.value;
        showActionReflection(
          `Selected: ${selectedText}`,
          "SELECTION UPDATED ✓",
          "Filter / dropdown option applied immediately"
        );
      } else if (tag === "INPUT" && el.type === "range") {
        showActionReflection(
          `Slider Adjusted: ${el.value}`,
          "VALUE UPDATED ✓",
          "Live rate / distance / commission recalculated"
        );
      } else if (tag === "INPUT" && el.type === "file") {
        const fileName = el.files?.[0]?.name || "Document / Image";
        showActionReflection(
          `File Attached: ${fileName}`,
          "MEDIA LOADED ✓",
          "File processed and attached to form"
        );
      } else if (tag === "INPUT" && el.type === "checkbox") {
        showActionReflection(
          `Toggle ${el.checked ? "ENABLED ✓" : "DISABLED"}`,
          "SETTING UPDATED ✓",
          "Checkbox state updated"
        );
      }
    };

    // 4. Global Runtime Error & Unhandled Promise Rejection Listeners
    const handleRuntimeError = (event) => {
      const msg = event?.error?.message || event?.message || "Unexpected Frontend Script Error";
      const loc = event?.filename
        ? `${event.filename.split("/").pop()}:${event.lineno || 0}`
        : "React UI Thread";
      reportDiagnosticError("FRONTEND UI", `Runtime Error (${loc})`, msg);
    };

    const handleUnhandledRejection = (event) => {
      const reason =
        event?.reason?.message || String(event?.reason || "Unhandled Async Promise Error");
      reportDiagnosticError("ASYNC PIPELINE", "Unhandled Async Operation Error", reason);
    };

    // 5. Intercept window.alert so native alerts also log and reflect cleanly
    const origAlert = window.alert.bind(window);
    window.alert = (msg) => {
      const text = String(msg || "");
      if (
        text.toLowerCase().includes("invalid") ||
        text.toLowerCase().includes("error") ||
        text.toLowerCase().includes("please") ||
        text.toLowerCase().includes("wait") ||
        text.toLowerCase().includes("cannot")
      ) {
        reportDiagnosticError("USER INPUT / VALIDATION", "Validation Notice", text);
      } else {
        showActionReflection(text, "CONFIRMED ✓", "Action confirmed");
      }
    };

    document.addEventListener("click", handleGlobalClick, true);
    document.addEventListener("change", handleGlobalChange, true);
    window.addEventListener("error", handleRuntimeError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.fetch = origFetch;
      window.alert = origAlert;
      document.removeEventListener("click", handleGlobalClick, true);
      document.removeEventListener("change", handleGlobalChange, true);
      window.removeEventListener("error", handleRuntimeError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <>
      {children}

      {/* 1. INSTANT ACTION EXECUTION REFLECTION PILL (TOP CENTER) */}
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
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {activeActionToast.label}
          </span>
          <span
            style={{
              color: "#fbbf24",
              fontSize: "9px",
              whiteSpace: "nowrap"
            }}
          >
            &bull; {pipelineState === "SYNCING" ? "Syncing..." : "Reflected"}
          </span>
        </div>
      )}

      {/* 2. FRONTEND / BRIDGE / BACKEND / PIPELINE ERROR ALERT BANNER */}
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
              &#x26A0;&#xFE0F; {activeErrorBanner.stage} ALERT
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                style={{
                  background: "#334155",
                  color: "#fde047",
                  border: "none",
                  borderRadius: "6px",
                  padding: "2px 8px",
                  fontSize: "9px",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                Inspect Log
              </button>
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
          </div>
          <div style={{ fontWeight: 900, color: "#fda4af", fontSize: "12px" }}>
            {activeErrorBanner.title}
          </div>
          <div style={{ color: "#fecdd3", marginTop: "2px", wordBreak: "break-word" }}>
            {activeErrorBanner.message}
          </div>
          {activeErrorBanner.fixHint && (
            <div style={{ color: "#fde047", fontSize: "10px", marginTop: "4px", fontWeight: 700 }}>
              &#x1F4A1; {activeErrorBanner.fixHint}
            </div>
          )}
        </div>
      )}

      {/* 3. FLOATING PIPELINE & REFLECTION STATUS PILL (BOTTOM RIGHT) */}
      <div
        data-we4all-monitor-ignore="true"
        style={{
          position: "fixed",
          bottom: "62px",
          right: "10px",
          zIndex: 99980,
          fontFamily: "system-ui, sans-serif"
        }}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(!drawerOpen)}
          style={{
            background:
              pipelineState === "ERROR"
                ? "#9f1239"
                : pipelineState === "SYNCING"
                ? "#78350f"
                : "#064e3b",
            border:
              pipelineState === "ERROR"
                ? "1.5px solid #fb7185"
                : pipelineState === "SYNCING"
                ? "1.5px solid #fbbf24"
                : "1.5px solid #34d399",
            color: "#ffffff",
            padding: "5px 10px",
            borderRadius: "999px",
            fontSize: "10px",
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <span>
            {pipelineState === "ERROR"
              ? "\uD83D\uDD34"
              : pipelineState === "SYNCING"
              ? "\uD83D\uDFE1"
              : "\uD83D\uDFE2"}
          </span>
          <span>
            {pipelineState === "ERROR"
              ? "Pipeline Alert"
              : pipelineState === "SYNCING"
              ? "Syncing DB..."
              : `Live Log (${eventLogs.length})`}
          </span>
        </button>
      </div>

      {/* 4. EXPANDABLE END-TO-END ACTION & PIPELINE DIAGNOSTIC DRAWER */}
      {drawerOpen && (
        <div
          data-we4all-monitor-ignore="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            zIndex: 99999,
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
              borderRadius: "24px",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "84vh",
              display: "flex",
              flexDirection: "column",
              padding: "16px",
              color: "#f8fafc",
              fontSize: "11px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 900, color: "#34d399" }}>
                  &#x26A1; Live Action Reflection &amp; Pipeline Error Inspector
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#94a3b8" }}>
                  Monitors Frontend UI clicks, In-Between API Bridge, Backend DB &amp; Validation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                style={{
                  background: "#1e293b",
                  color: "#fda4af",
                  border: "none",
                  borderRadius: "10px",
                  padding: "6px 12px",
                  fontWeight: 900,
                  cursor: "pointer"
                }}
              >
                Close &#x2715;
              </button>
            </div>

            {/* Diagnostic Self-Test Buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "10px 0", borderBottom: "1px solid #1e293b" }}>
              <button
                type="button"
                onClick={() =>
                  showActionReflection(
                    "Simulated User Selection / Click",
                    "EXECUTED ✓",
                    "Frontend UI & Local State updated in 4ms"
                  )
                }
                style={{
                  background: "#10b981",
                  color: "#022c22",
                  border: "none",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  fontSize: "10px",
                  fontWeight: 900,
                  cursor: "pointer"
                }}
              >
                + Test Action Reflection
              </button>
              <button
                type="button"
                onClick={() =>
                  reportDiagnosticError(
                    "BACKEND SUPABASE DB",
                    "Simulated Backend DB Warning",
                    "Test diagnostic: Backend table or network latency simulated successfully.",
                    "No real error occurred — your error display pipeline works 100%!"
                  )
                }
                style={{
                  background: "#f43f5e",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  fontSize: "10px",
                  fontWeight: 900,
                  cursor: "pointer"
                }}
              >
                + Test Error Banner
              </button>
              <button
                type="button"
                onClick={() => {
                  setEventLogs([]);
                  setActiveErrorBanner(null);
                  setPipelineState("IDLE");
                }}
                style={{
                  background: "#334155",
                  color: "#cbd5e1",
                  border: "none",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  fontSize: "10px",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                Clear Log
              </button>
            </div>

            {/* Scrollable Event & Error Feed */}
            <div style={{ flex: 1, overflowY: "auto", marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {eventLogs.length === 0 ? (
                <p style={{ textAlign: "center", color: "#64748b", padding: "24px 0" }}>
                  No actions or errors recorded yet. Click any button or tab in the app to see live execution reflection!
                </p>
              ) : (
                eventLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      background:
                        log.category === "ERROR"
                          ? "rgba(136, 19, 55, 0.35)"
                          : log.category === "SYNC"
                          ? "rgba(6, 78, 59, 0.35)"
                          : "#020617",
                      border:
                        log.category === "ERROR"
                          ? "1px solid #f43f5e"
                          : log.category === "SYNC"
                          ? "1px solid #10b981"
                          : "1px solid #1e293b",
                      borderRadius: "12px",
                      padding: "8px 10px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 800 }}>
                      <span
                        style={{
                          color:
                            log.category === "ERROR"
                              ? "#fb7185"
                              : log.category === "SYNC"
                              ? "#34d399"
                              : "#fbbf24"
                        }}
                      >
                        [{log.stage}] {log.title}
                      </span>
                      <span style={{ color: "#64748b" }}>{log.time}</span>
                    </div>
                    <div style={{ color: "#cbd5e1", fontSize: "10px", marginTop: "2px" }}>
                      {log.detail}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}