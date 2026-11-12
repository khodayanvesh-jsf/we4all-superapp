import React from "react";
import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ActionAndErrorFeedbackLayer from "./modules/ActionAndErrorFeedbackLayer.jsx";

// Must run on every native launch, before network requests or app initialization.
// Capgo rolls back a candidate bundle when this acknowledgement is not received.
if (Capacitor.isNativePlatform()) {
  void CapacitorUpdater.notifyAppReady().catch((error) => {
    console.error("WE4ALL OTA app-ready acknowledgement failed:", error);
  });
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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <ActionAndErrorFeedbackLayer>
        <App />
        <NativeBundleReady />
      </ActionAndErrorFeedbackLayer>
    </RootErrorBoundary>
  </React.StrictMode>
);