import './styles/we4allTheme2026.css';
import './styles/we4all-theme.css';
import React from "react";
import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import StandaloneWindowsApp from "./components/desktop/StandaloneWindowsApp.jsx";
import ActionAndErrorFeedbackLayer from "./modules/ActionAndErrorFeedbackLayer.jsx";

import { APP_VERSION } from './appVersion.js';
import { initSelfHostedOta } from './utils/we4allSelfHostedOta';
initSelfHostedOta({ currentVersion: APP_VERSION });
function NativeBundleReady() {
  React.useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      void CapacitorUpdater.notifyAppReady().catch((error) => {
        console.error("WE4ALL OTA app-ready acknowledgement failed:", error);
      });
    }
  }, []);
  return null;
}


function AllUsersWindowsShell() {
  const [view, setView] = React.useState("all_users");
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0b1120" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "linear-gradient(90deg,#1e1b4b,#4c1d95,#be123c)", color: "#fff", fontFamily: "Segoe UI, sans-serif", fontSize: "12px", fontWeight: 700, gap: "10px", flexWrap: "wrap" }}>
        <span>WE4ALL Windows Super-App · All Portals (Consumer · Merchant · Service · Decorator · Rider · Labour · Admin)</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" onClick={() => setView("all_users")} style={{ padding: "5px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 800, background: view === "all_users" ? "#fbbf24" : "rgba(255,255,255,0.18)", color: view === "all_users" ? "#0f172a" : "#fff" }}>🛍️ All-Users App (Consumer + Partners + Admin)</button>
          <button type="button" onClick={() => setView("console")} style={{ padding: "5px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 800, background: view === "console" ? "#fbbf24" : "rgba(255,255,255,0.18)", color: view === "console" ? "#0f172a" : "#fff" }}>🖥️ Partner & Admin Desk</button>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {view === "all_users" ? (<><App /><NativeBundleReady /></>) : (<AllUsersWindowsShell />)}
      </div>
    </div>
  );
}

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "", errorStack: "" };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || String(error),
      errorStack: error?.stack || ""
    };
  }
  componentDidCatch(error, info) {
    console.error("WE4ALL Protected Boundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#071318", color: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
          <div style={{ background: "#0f172a", border: "2px solid #f43f5e", borderRadius: "24px", padding: "24px", maxWidth: "520px", width: "100%" }}>
            <span style={{ background: "#f43f5e", color: "#fff", padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 900 }}>
              FRONTEND RENDER EXCEPTION CAUGHT
            </span>
            <h2 style={{ color: "#fb7185", fontWeight: 900, fontSize: "18px", margin: "10px 0 6px" }}>
              WE4ALL Auto-Recovery Diagnostic Shield
            </h2>
            <pre style={{ background: "#020617", color: "#fda4af", padding: "10px", borderRadius: "12px", fontSize: "11px", overflowX: "auto", textAlign: "left" }}>
              {this.state.errorMessage}
            </pre>
            {this.state.errorStack && (
              <pre style={{ background: "#020617", color: "#94a3b8", padding: "8px", borderRadius: "10px", fontSize: "9px", overflowX: "auto", textAlign: "left", maxHeight: "140px" }}>
                {this.state.errorStack}
              </pre>
            )}
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = "/";
              }}
              style={{ marginTop: "14px", width: "100%", background: "#10b981", color: "#020617", fontWeight: 900, border: "none", padding: "12px 20px", borderRadius: "12px", cursor: "pointer" }}
            >
              Reset Cache &amp; Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const isWindowsDesktopMode =
  typeof window !== "undefined" &&
  !Capacitor.isNativePlatform() &&
  !window.location.search.includes("mobile=1") &&
  !window.location.pathname.toLowerCase().includes("/admin") &&
  !window.location.search.includes("admin=true") &&
  (navigator.userAgent.includes("Electron") ||
    window.location.search.includes("desktop=windows") ||
    window.location.search.includes("partner=true") ||
    /^\/(partner|console|desktop)(\/|$)/i.test(window.location.pathname));

if (isWindowsDesktopMode && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <ActionAndErrorFeedbackLayer>
        {isWindowsDesktopMode ? (<StandaloneWindowsApp />) : (<><App /><NativeBundleReady /></>)}
      </ActionAndErrorFeedbackLayer>
    </RootErrorBoundary>
  </React.StrictMode>
);

