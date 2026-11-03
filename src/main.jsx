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
    console.error("WE4ALL Runtime Error Caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#04090e",
            color: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center"
          }}
        >
          <h2 style={{ color: "#34d399", fontWeight: 900, fontSize: "18px" }}>
            WE4ALL v3.0.1 Auto-Recovery
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "12px", maxWidth: "420px", margin: "8px 0 16px" }}>
            {this.state.errorMessage}
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = "/";
            }}
            style={{
              background: "#10b981",
              color: "#020617",
              fontWeight: 900,
              border: "none",
              padding: "12px 24px",
              borderRadius: "12px",
              cursor: "pointer"
            }}
          >
            Clear Cache & Open WE4ALL Storefront
          </button>
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