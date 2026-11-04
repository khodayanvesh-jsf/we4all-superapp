import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || String(error) };
  }
  componentDidCatch(error, info) {
    console.error("WE4ALL Protected Boundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#071318", color: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
          <div style={{ background: "#0f172a", border: "2px solid #10b981", borderRadius: "24px", padding: "24px", maxWidth: "460px", width: "100%" }}>
            <h2 style={{ color: "#34d399", fontWeight: 900, fontSize: "18px", margin: "0 0 8px" }}>
              WE4ALL Auto-Recovery Shield
            </h2>
            <pre style={{ background: "#020617", color: "#fda4af", padding: "10px", borderRadius: "12px", fontSize: "11px", overflowX: "auto", textAlign: "left" }}>
              {this.state.errorMessage}
            </pre>
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
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);