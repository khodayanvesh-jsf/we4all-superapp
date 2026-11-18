const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { getActiveIndexHtml, checkAndApplyOtaUpdate } = require("./otaUpdater.cjs");

let mainWindow = null;

function getPackagedVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
    return pkg.version || "3.3.19";
  } catch {
    return "3.3.19";
  }
}

// Purpose-Built 3-Pane Windows 11 Desktop Layout for All 6 WE4ALL Portals
const WINDOWS_WORKSTATION_CSS = `
  /* Hide web top download bar inside native Windows app */
  #we4all-platform-download-bar { display: none !important; }

  /* 3-Pane Windows Workstation Frame: Left Rail (250px) | Center Module Workspace | Right Telemetry & OTA Dock (310px) */
  body {
    background-color: #020617 !important;
    padding-left: 250px !important;
    padding-right: 310px !important;
    padding-top: 38px !important;
    overflow-x: hidden !important;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif !important;
  }

  /* Expand mobile 448px container into a full Native Windows Desktop Module Canvas */
  .max-w-md, .max-w-lg, .max-w-xl {
    max-width: 100% !important;
    width: 96% !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }

  /* Multi-column desktop grids for Products, Kisan Mandi, Merchant Stock, Orders & Admin Queues */
  @media (min-width: 1100px) {
    .grid-cols-2 {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 14px !important;
    }
  }
  @media (min-width: 1440px) {
    .grid-cols-2 {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 16px !important;
    }
  }

  /* Convert mobile bottom thumb bar into a sleek centered Windows Desktop Floating Taskbar */
  nav.fixed.bottom-0, div.fixed.bottom-0 {
    left: 266px !important;
    right: 326px !important;
    max-width: 820px !important;
    margin: 0 auto 12px auto !important;
    border-radius: 16px !important;
    border: 1px solid rgba(16, 185, 129, 0.45) !important;
    background: rgba(15, 23, 42, 0.95) !important;
    backdrop-filter: blur(12px) !important;
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.75) !important;
  }

  /* Windows Top System Status Bar */
  #we4all-win-topbar {
    position: fixed;
    top: 0;
    left: 250px;
    right: 310px;
    height: 38px;
    background: linear-gradient(90deg, #0f172a 0%, #064e3b 50%, #0f172a 100%);
    border-bottom: 1px solid rgba(16, 185, 129, 0.35);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 18px;
    z-index: 99997;
    color: #e2e8f0;
    font-size: 11px;
    font-weight: 700;
  }

  /* Left Pane: Windows 6-Portal Navigation & Quick Switcher Rail */
  #we4all-win-left-rail {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 250px;
    background: linear-gradient(180deg, #064e3b 0%, #0f172a 32%, #020617 100%);
    border-right: 1px solid rgba(16, 185, 129, 0.35);
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 99998;
    color: #f8fafc;
    overflow-y: auto;
  }

  /* Right Pane: Live Backend Telemetry, POS Tools & OTA Hot-Swap Manager */
  #we4all-win-right-dock {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 310px;
    background: linear-gradient(180deg, #0f172a 0%, #020617 100%);
    border-left: 1px solid rgba(56, 189, 248, 0.3);
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 99998;
    color: #f8fafc;
    overflow-y: auto;
  }

  .win-sec-hdr {
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.9px;
    color: #94a3b8;
    margin: 10px 0 6px 4px;
  }
  .win-nav-btn {
    width: 100%;
    text-align: left;
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(148, 163, 184, 0.22);
    color: #e2e8f0;
    border-radius: 10px;
    padding: 7px 10px;
    margin-bottom: 5px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.15s ease;
  }
  .win-nav-btn:hover {
    background: rgba(16, 185, 129, 0.22);
    border-color: #34d399;
    color: #ffffff;
  }
  .win-card-box {
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 12px;
    padding: 10px;
    margin-bottom: 8px;
    font-size: 11px;
  }
`;

const WINDOWS_WORKSTATION_JS = `
  (function () {
    if (document.getElementById("we4all-win-left-rail")) return;

    // Helper: click any button or tab inside the React app matching text
    function clickAppButtonByText(patterns) {
      const buttons = Array.from(document.querySelectorAll("button, a"));
      for (const pat of patterns) {
        const found = buttons.find((b) => (b.textContent || "").toLowerCase().includes(pat.toLowerCase()));
        if (found) {
          found.click();
          return true;
        }
      }
      return false;
    }

    // Helper: quick-fill portal credentials inside the Account -> Portal Login form
    window.we4allQuickPortalFill = function (roleLabel, identifier, secret, isFounder) {
      if (isFounder) {
        clickAppButtonByText(["Admin Console", "Founder", "Admin"]);
        setTimeout(() => {
          const inputs = Array.from(document.querySelectorAll("input"));
          const userInp = inputs.find((i) => (i.placeholder || "").toLowerCase().includes("founder") || i.autocomplete === "username");
          const passInp = inputs.find((i) => i.type === "password");
          if (userInp && passInp) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeSetter.call(userInp, identifier);
            userInp.dispatchEvent(new Event("input", { bubbles: true }));
            nativeSetter.call(passInp, secret);
            passInp.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }, 250);
        return;
      }

      // Open Account tab, then Portal Login sub-tab
      clickAppButtonByText(["Account", "Profile"]);
      setTimeout(() => {
        clickAppButtonByText(["Portal Login", "Sign in"]);
        setTimeout(() => {
          const inputs = Array.from(document.querySelectorAll("input"));
          const idInput = inputs.find((i) => (i.placeholder || "").toLowerCase().includes("mobile") || (i.placeholder || "").toLowerCase().includes("email") || i.type === "tel" || i.type === "text");
          const pinInput = inputs.find((i) => i.type === "password");
          if (idInput && pinInput) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeSetter.call(idInput, identifier);
            idInput.dispatchEvent(new Event("input", { bubbles: true }));
            nativeSetter.call(pinInput, secret);
            pinInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }, 200);
      }, 200);
    };

    // 1. Top Bar
    const topBar = document.createElement("header");
    topBar.id = "we4all-win-topbar";
    topBar.innerHTML = \`
      <div>🖥️ <strong>WE4ALL Windows 11 Desktop Edition</strong> &bull; All 6 Portals Adapted for Widescreen Workstation</div>
      <div style="display:flex;gap:12px;align-items:center;">
        <span id="win-top-ota-pill" style="background:#065f46;color:#6ee7b7;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:800;">OTA: Checking...</span>
        <span style="color:#94a3b8;">Shortcuts: <strong>Ctrl+N</strong> Parallel Window &bull; <strong>Ctrl+P</strong> Print Invoice</span>
      </div>
    \`;
    document.body.appendChild(topBar);

    // 2. Left 6-Portal Navigation Rail
    const leftRail = document.createElement("aside");
    leftRail.id = "we4all-win-left-rail";
    leftRail.innerHTML = \`
      <div>
        <div style="border-bottom:1px solid rgba(52,211,153,0.3);padding-bottom:10px;margin-bottom:8px;">
          <div style="font-size:15px;font-weight:900;color:#34d399;">WE4ALL WORKSTATION</div>
          <div style="font-size:10px;color:#a7f3d0;font-weight:600;">Windows Native 6-Portal Suite</div>
        </div>

        <div class="win-sec-hdr">1. Consumer & Modules</div>
        <button class="win-nav-btn" id="win-nav-store"><span>🛒 Storefront & Categories</span><span>Home</span></button>
        <button class="win-nav-btn" id="win-nav-services"><span>⚡ 1-Hr Home Services</span><span>Book</span></button>
        <button class="win-nav-btn" id="win-nav-rides"><span>🛵 P2P Parcel & Rides</span><span>Radar</span></button>
        <button class="win-nav-btn" id="win-nav-labour"><span>👷 Labour & Mistri Adda</span><span>Hire</span></button>
        <button class="win-nav-btn" id="win-nav-orders"><span>📦 My Orders & GST Bills</span><span>Ledger</span></button>

        <div class="win-sec-hdr">2. Direct 6-Portal Switcher</div>
        <button class="win-nav-btn" style="background:linear-gradient(90deg,#f59e0b,#d97706);color:#020617;font-weight:900;border-color:#fbbf24;" onclick="window.we4allQuickPortalFill('Founder','KhodayAnvesh','We4AllFounder@2026',true)">
          <span>🛡️ 6. Founder Admin Console</span><span>Login</span>
        </button>
        <button class="win-nav-btn" onclick="window.we4allQuickPortalFill('Customer','9848011111','123456',false)">
          <span>🛍️ 1. Customer Portal</span><span>9848011111</span>
        </button>
        <button class="win-nav-btn" onclick="window.we4allQuickPortalFill('Merchant','9848022222','123456',false)">
          <span>🏪 2. Merchant POS Desk</span><span>9848022222</span>
        </button>
        <button class="win-nav-btn" onclick="window.we4allQuickPortalFill('Service','9848033333','123456',false)">
          <span>🔧 3. 1-Hr Service Portal</span><span>9848033333</span>
        </button>
        <button class="win-nav-btn" onclick="window.we4allQuickPortalFill('Captain','9848044444','123456',false)">
          <span>🛵 4. Delivery Captain</span><span>9848044444</span>
        </button>
        <button class="win-nav-btn" onclick="window.we4allQuickPortalFill('Labour','9848055555','123456',false)">
          <span>🧱 5. Labour & Mistri</span><span>9848055555</span>
        </button>

        <div class="win-sec-hdr">3. Multi-Window Desktop</div>
        <button class="win-nav-btn" id="win-spawn-parallel" style="border-color:#38bdf8;color:#7dd3fc;">
          <span>➕ Open Parallel Portal Window</span><span>Ctrl+N</span>
        </button>
      </div>

      <div style="border-top:1px solid rgba(148,163,184,0.2);padding-top:8px;font-size:10px;color:#94a3b8;">
        <div style="color:#34d399;font-weight:800;">● ADILABAD MARKET (m_393_1571)</div>
        <div>Android + Windows Synced Core</div>
      </div>
    \`;
    document.body.appendChild(leftRail);

    // 3. Right Backend Telemetry, POS & OTA Hot-Swap Dock
    const rightDock = document.createElement("aside");
    rightDock.id = "we4all-win-right-dock";
    rightDock.innerHTML = \`
      <div>
        <div style="border-bottom:1px solid rgba(56,189,248,0.3);padding-bottom:10px;margin-bottom:8px;">
          <div style="font-size:14px;font-weight:900;color:#38bdf8;">CLOUD & OTA ENGINE</div>
          <div style="font-size:10px;color:#bae6fd;font-weight:600;">Live Frontend ↔ Backend Monitor</div>
        </div>

        <div class="win-sec-hdr">Over-The-Air (OTA) Auto-Updater</div>
        <div class="win-card-box">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:#94a3b8;">Active Bundle:</span>
            <strong id="win-ota-ver" style="color:#34d399;">Checking...</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:#94a3b8;">Bundle Source:</span>
            <strong id="win-ota-src" style="color:#38bdf8;">Local</strong>
          </div>
          <div style="font-size:10px;color:#cbd5e1;margin-bottom:8px;" id="win-ota-msg">Verifying cloud release manifest...</div>
          <button id="win-btn-ota-check" style="width:100%;background:#10b981;color:#020617;border:none;border-radius:8px;padding:7px;font-size:11px;font-weight:900;cursor:pointer;">
            🔄 Check & Apply OTA Update Now
          </button>
        </div>

        <div class="win-sec-hdr">Frontend ↔ Supabase Connection</div>
        <div class="win-card-box">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:#94a3b8;">Supabase REST API:</span>
            <strong id="win-db-status" style="color:#34d399;">Checking...</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:#94a3b8;">Cloud Latency:</span>
            <strong id="win-db-latency" style="color:#fbbf24;">-- ms</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:#94a3b8;">Approved Partners:</span>
            <strong id="win-db-partners" style="color:#f8fafc;">--</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:#94a3b8;">Approved Products:</span>
            <strong id="win-db-products" style="color:#f8fafc;">--</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#94a3b8;">Active Markets:</span>
            <strong id="win-db-markets" style="color:#f8fafc;">--</strong>
          </div>
          <button id="win-btn-db-ping" style="width:100%;background:#1e293b;color:#38bdf8;border:1px solid rgba(56,189,248,0.4);border-radius:8px;padding:6px;font-size:10px;font-weight:800;cursor:pointer;">
            ⚡ Re-Verify All Backend Connections
          </button>
        </div>

        <div class="win-sec-hdr">Windows POS & Office Actions</div>
        <button class="win-nav-btn" id="win-btn-print"><span>🖨️ Print GST Bill / Export PDF</span><span>Ctrl+P</span></button>
        <button class="win-nav-btn" id="win-btn-refresh"><span>🔄 Reload Active Workspace</span><span>Ctrl+R</span></button>
      </div>

      <div style="border-top:1px solid rgba(148,163,184,0.2);padding-top:8px;font-size:10px;color:#64748b;">
        <div>Project: bdmbziwazpuzbukazmug</div>
        <div>OTA Channel: Production (SHA-256)</div>
      </div>
    \`;
    document.body.appendChild(rightDock);

    // Wire Left Rail Navigation Buttons
    document.getElementById("win-nav-store").addEventListener("click", () => clickAppButtonByText(["Home", "Shop", "Store"]));
    document.getElementById("win-nav-services").addEventListener("click", () => clickAppButtonByText(["Service", "1-Hr", "Repair"]));
    document.getElementById("win-nav-rides").addEventListener("click", () => clickAppButtonByText(["Ride", "Parcel", "P2P"]));
    document.getElementById("win-nav-labour").addEventListener("click", () => clickAppButtonByText(["Labour", "Mistri", "Adda"]));
    document.getElementById("win-nav-orders").addEventListener("click", () => clickAppButtonByText(["Orders", "History", "Bookings"]));

    document.getElementById("win-spawn-parallel").addEventListener("click", () => {
      if (window.WE4ALL_DESKTOP) window.WE4ALL_DESKTOP.openParallelWindow("WE4ALL Parallel Portal Workstation");
    });
    document.getElementById("win-btn-print").addEventListener("click", () => {
      if (window.WE4ALL_DESKTOP) window.WE4ALL_DESKTOP.printPage();
      else window.print();
    });
    document.getElementById("win-btn-refresh").addEventListener("click", () => window.location.reload());

    // Wire Live Backend Verification
    async function runBackendDiagnostics() {
      const statusEl = document.getElementById("win-db-status");
      statusEl.textContent = "Pinging...";
      if (window.WE4ALL_DIAGNOSTICS) {
        const res = await window.WE4ALL_DIAGNOSTICS.verifyBackendAndOta();
        statusEl.textContent = res.supabaseRestOk ? "ONLINE (RLS OK)" : "OFFLINE";
        statusEl.style.color = res.supabaseRestOk ? "#34d399" : "#f87171";
        document.getElementById("win-db-latency").textContent = res.latencyMs + " ms";
        document.getElementById("win-db-partners").textContent = res.partnersCount + " Verified";
        document.getElementById("win-db-products").textContent = res.catalogueCount + " Live Items";
        document.getElementById("win-db-markets").textContent = res.marketsCount + " Zones";
      }
    }
    document.getElementById("win-btn-db-ping").addEventListener("click", runBackendDiagnostics);
    setTimeout(runBackendDiagnostics, 800);

    // Wire OTA Status & 1-Click Hot-Swap Update
    async function refreshOtaStatus(triggerCheck = false, force = false) {
      if (!window.WE4ALL_DESKTOP) return;
      const msgEl = document.getElementById("win-ota-msg");
      const verEl = document.getElementById("win-ota-ver");
      const srcEl = document.getElementById("win-ota-src");
      const pillEl = document.getElementById("win-top-ota-pill");
      try {
        const info = await window.WE4ALL_DESKTOP.getOtaStatus();
        verEl.textContent = "v" + info.activeVersion;
        srcEl.textContent = info.source;
        pillEl.textContent = "OTA Ready: v" + info.activeVersion + " (" + info.source + ")";

        if (triggerCheck) {
          msgEl.textContent = "Checking cloud OTA manifest & SHA-256...";
          const res = await window.WE4ALL_DESKTOP.checkOtaUpdate(force);
          verEl.textContent = "v" + res.currentVersion;
          srcEl.textContent = res.source;
          msgEl.textContent = res.message;
          pillEl.textContent = "OTA Synced: v" + res.currentVersion;
        }
      } catch (e) {
        msgEl.textContent = "OTA check note: " + e.message;
      }
    }

    document.getElementById("win-btn-ota-check").addEventListener("click", () => refreshOtaStatus(true, true));
    setTimeout(() => refreshOtaStatus(true, false), 1200);
  })();
`;

function attachWorkstationEnhancements(win) {
  win.webContents.on("did-finish-load", () => {
    win.webContents.insertCSS(WINDOWS_WORKSTATION_CSS).catch(() => {});
    win.webContents.executeJavaScript(WINDOWS_WORKSTATION_JS).catch(() => {});
  });
}

function loadActiveBundle(win) {
  const packagedVer = getPackagedVersion();
  const active = getActiveIndexHtml(app, packagedVer);
  win.loadFile(active.indexPath);
}

function createParallelWindow(customTitle = "WE4ALL Parallel Portal Workstation") {
  const partitionName = "persist:we4all_win_slot_" + Date.now();
  const childWin = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: customTitle,
    backgroundColor: "#020617",
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      partition: partitionName,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  attachWorkstationEnhancements(childWin);
  loadActiveBundle(childWin);
}

function buildWindowsMenu(win) {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Open Parallel Portal Window (Isolated Session)",
          accelerator: "CmdOrCtrl+N",
          click: () => createParallelWindow("WE4ALL Parallel Portal Workstation")
        },
        {
          label: "Print GST Tax Invoice / Export PDF",
          accelerator: "CmdOrCtrl+P",
          click: () => win.webContents.print({ printBackground: true })
        },
        { type: "separator" },
        { role: "quit", label: "Exit WE4ALL Windows Workstation" }
      ]
    },
    {
      label: "OTA Updates & Cloud",
      submenu: [
        {
          label: "Check & Apply Over-The-Air (OTA) Update Now",
          accelerator: "CmdOrCtrl+U",
          click: async () => {
            try {
              const res = await checkAndApplyOtaUpdate(app, getPackagedVersion(), true);
              loadActiveBundle(win);
              dialog.showMessageBox(win, {
                type: "info",
                title: "WE4ALL OTA Updater",
                message: res.message,
                detail: "Active Version: v" + res.currentVersion + "\nSource: " + res.source + "\nSHA-256: " + (res.sha256 || "Verified")
              });
            } catch (e) {
              dialog.showErrorBox("OTA Update Check", e.message);
            }
          }
        },
        {
          label: "Reload Workstation",
          accelerator: "CmdOrCtrl+R",
          click: () => loadActiveBundle(win)
        }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "togglefullscreen", label: "Toggle Fullscreen (F11)" },
        { role: "zoomIn", label: "Zoom In (Ctrl++)" },
        { role: "zoomOut", label: "Zoom Out (Ctrl+-)" },
        { role: "resetZoom", label: "Reset Zoom (Ctrl+0)" },
        { type: "separator" },
        { role: "toggleDevTools", label: "Developer Diagnostics" }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1520,
    height: 920,
    minWidth: 1150,
    minHeight: 740,
    title: "WE4ALL VocalForLocal Super-App — Windows 11 Desktop Workstation",
    backgroundColor: "#020617",
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  buildWindowsMenu(mainWindow);
  attachWorkstationEnhancements(mainWindow);
  loadActiveBundle(mainWindow);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:") || url.startsWith("upi:")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

ipcMain.on("we4all:print", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win) win.webContents.print({ printBackground: true });
});

ipcMain.on("we4all:parallel-window", (_event, payload) => {
  createParallelWindow(payload?.title || "WE4ALL Parallel Portal Workstation");
});

ipcMain.handle("we4all:ota-status", () => {
  return getActiveIndexHtml(app, getPackagedVersion());
});

ipcMain.handle("we4all:ota-check", async (event, force) => {
  const res = await checkAndApplyOtaUpdate(app, getPackagedVersion(), Boolean(force));
  if (res.updated) {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win) setTimeout(() => loadActiveBundle(win), 400);
  }
  return res;
});

app.whenReady().then(() => {
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});