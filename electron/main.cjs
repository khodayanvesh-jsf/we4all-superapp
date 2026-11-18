const { app, BrowserWindow, Menu, shell, ipcMain, dialog, session } = require("electron");
const path = require("path");

const LIVE_WEB_CONSOLE_URL = "https://we-4-all-super-app.vercel.app";
let mainWindow = null;

// Non-intrusive Windows Desktop Command Dock (Does NOT alter internal module UI)
const WINDOWS_DOCK_CSS = `
  body {
    padding-left: 230px !important;
    background-color: #020617 !important;
  }
  /* Keep module UI 100% intact and centered by default, or expand smoothly when Widescreen toggle is active */
  body.we4all-win-widescreen .max-w-md {
    max-width: 1180px !important;
    width: 95% !important;
  }
  #we4all-win-dock {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 230px;
    background: linear-gradient(180deg, #064e3b 0%, #0f172a 38%, #020617 100%);
    border-right: 1px solid rgba(16, 185, 129, 0.35);
    color: #f8fafc;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 14px 12px;
    z-index: 99998;
    user-select: none;
    box-shadow: 6px 0 24px rgba(0, 0, 0, 0.5);
  }
  #we4all-win-dock .dock-brand {
    border-bottom: 1px solid rgba(52, 211, 153, 0.25);
    padding-bottom: 10px;
    margin-bottom: 10px;
  }
  #we4all-win-dock .dock-title {
    font-size: 14px;
    font-weight: 900;
    color: #34d399;
    letter-spacing: 0.3px;
  }
  #we4all-win-dock .dock-sub {
    font-size: 10px;
    color: #a7f3d0;
    margin-top: 2px;
    font-weight: 600;
  }
  #we4all-win-dock .dock-sec-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #94a3b8;
    font-weight: 800;
    margin: 8px 0 5px 4px;
  }
  #we4all-win-dock button.dock-btn {
    width: 100%;
    text-align: left;
    background: rgba(15, 23, 42, 0.78);
    border: 1px solid rgba(148, 163, 184, 0.22);
    color: #e2e8f0;
    border-radius: 10px;
    padding: 8px 10px;
    margin-bottom: 5px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  #we4all-win-dock button.dock-btn:hover {
    background: rgba(16, 185, 129, 0.2);
    border-color: #34d399;
    color: #ffffff;
  }
  #we4all-win-dock button.dock-btn-admin {
    background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
    border-color: #fbbf24;
    color: #020617;
    font-weight: 900;
  }
  #we4all-win-dock button.dock-btn-admin:hover {
    background: #fbbf24;
    color: #020617;
  }
  #we4all-win-dock .dock-footer {
    border-top: 1px solid rgba(148, 163, 184, 0.2);
    padding-top: 8px;
    font-size: 10px;
    color: #64748b;
  }
`;

const WINDOWS_DOCK_JS = `
  (function() {
    if (localStorage.getItem("we4all_win_widescreen") !== "false") {
      document.body.classList.add("we4all-win-widescreen");
    }

    if (!document.getElementById("we4all-win-dock")) {
      const dock = document.createElement("aside");
      dock.id = "we4all-win-dock";
      dock.innerHTML = \`
        <div>
          <div class="dock-brand">
            <div class="dock-title">WE4ALL WINDOWS</div>
            <div class="dock-sub">Live Web Console &bull; Adilabad</div>
          </div>

          <div class="dock-sec-label">Web Console Navigation</div>
          <button class="dock-btn dock-btn-admin" id="win-btn-admin">
            <span>Founder Admin Console</span>
            <span>/admin</span>
          </button>
          <button class="dock-btn" id="win-btn-home">
            <span>All 5 Partner & User Portals</span>
            <span>Home</span>
          </button>

          <div class="dock-sec-label">Multi-Window Workstation</div>
          <button class="dock-btn" id="win-btn-parallel-admin">
            <span>+ Separate Admin Window</span>
            <span>New</span>
          </button>
          <button class="dock-btn" id="win-btn-parallel-portal">
            <span>+ Separate Portal Window</span>
            <span>New</span>
          </button>

          <div class="dock-sec-label">Desktop Tools & View</div>
          <button class="dock-btn" id="win-btn-layout">
            <span>Toggle Widescreen / Mobile Fit</span>
            <span>View</span>
          </button>
          <button class="dock-btn" id="win-btn-print">
            <span>Print / Export PDF Invoice</span>
            <span>Ctrl+P</span>
          </button>
          <button class="dock-btn" id="win-btn-reload">
            <span>Sync Live Cloud Ledger</span>
            <span>Ctrl+R</span>
          </button>
        </div>

        <div class="dock-footer">
          <div style="color:#34d399;font-weight:800;margin-bottom:2px;">● LIVE CLOUD CONNECTED</div>
          <div>Supabase: bdmbziwazpuzbukazmug</div>
          <div>Market: m_393_1571 (Adilabad)</div>
        </div>
      \`;
      document.body.appendChild(dock);

      document.getElementById("win-btn-admin").addEventListener("click", () => {
        if (window.WE4ALL_DESKTOP) window.WE4ALL_DESKTOP.navigateUrl("/admin");
        else window.location.href = "/admin";
      });
      document.getElementById("win-btn-home").addEventListener("click", () => {
        if (window.WE4ALL_DESKTOP) window.WE4ALL_DESKTOP.navigateUrl("/");
        else window.location.href = "/";
      });
      document.getElementById("win-btn-parallel-admin").addEventListener("click", () => {
        if (window.WE4ALL_DESKTOP) window.WE4ALL_DESKTOP.openParallelWindow("/admin", "WE4ALL Founder Admin Console (Isolated Session)");
      });
      document.getElementById("win-btn-parallel-portal").addEventListener("click", () => {
        if (window.WE4ALL_DESKTOP) window.WE4ALL_DESKTOP.openParallelWindow("/", "WE4ALL Partner / Customer Portal (Isolated Session)");
      });
      document.getElementById("win-btn-layout").addEventListener("click", () => {
        const isWide = document.body.classList.toggle("we4all-win-widescreen");
        localStorage.setItem("we4all_win_widescreen", isWide ? "true" : "false");
      });
      document.getElementById("win-btn-print").addEventListener("click", () => {
        if (window.WE4ALL_DESKTOP) window.WE4ALL_DESKTOP.printPage();
        else window.print();
      });
      document.getElementById("win-btn-reload").addEventListener("click", () => {
        window.location.reload();
      });
    }
  })();
`;

function injectDesktopShell(win) {
  win.webContents.on("did-finish-load", () => {
    win.webContents.insertCSS(WINDOWS_DOCK_CSS).catch(() => {});
    win.webContents.executeJavaScript(WINDOWS_DOCK_JS).catch(() => {});
  });
}

function loadConsoleTarget(win, targetPath = "/") {
  const fullLiveUrl = LIVE_WEB_CONSOLE_URL + (targetPath.startsWith("/") ? targetPath : "/" + targetPath);
  win.loadURL(fullLiveUrl).catch(() => {
    // Automatic offline fallback to local bundled dist/index.html if internet is disconnected
    const localIndex = path.join(__dirname, "..", "dist", "index.html");
    win.loadFile(localIndex);
  });
}

function createParallelWindow(targetPath = "/", customTitle = "WE4ALL Parallel Portal Window") {
  // Uses a fresh isolated partition so you can log into Merchant in Window 1 and Founder Admin in Window 2 simultaneously
  const partitionName = "persist:we4all_slot_" + Date.now();
  const childWin = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 920,
    minHeight: 680,
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
  injectDesktopShell(childWin);
  loadConsoleTarget(childWin, targetPath);
}

function buildWindowsMenu(win) {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Open Parallel Portal Window (Isolated Login)",
          accelerator: "CmdOrCtrl+N",
          click: () => createParallelWindow("/", "WE4ALL Parallel Portal Window")
        },
        {
          label: "Open Parallel Founder Admin Window",
          accelerator: "CmdOrCtrl+Shift+A",
          click: () => createParallelWindow("/admin", "WE4ALL Founder Admin Console")
        },
        { type: "separator" },
        {
          label: "Print / Save GST Invoice as PDF",
          accelerator: "CmdOrCtrl+P",
          click: () => win.webContents.print({ printBackground: true })
        },
        { type: "separator" },
        { role: "quit", label: "Exit WE4ALL Windows App" }
      ]
    },
    {
      label: "Web Console Navigation",
      submenu: [
        {
          label: "Go to Storefront & All 5 Partner Portals (/)",
          accelerator: "CmdOrCtrl+1",
          click: () => loadConsoleTarget(win, "/")
        },
        {
          label: "Go to Founder Admin Console (/admin)",
          accelerator: "CmdOrCtrl+2",
          click: () => loadConsoleTarget(win, "/admin")
        },
        { type: "separator" },
        {
          label: "Reload Live Web Console",
          accelerator: "CmdOrCtrl+R",
          click: () => win.reload()
        }
      ]
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Widescreen / Standard App Width",
          accelerator: "CmdOrCtrl+W",
          click: () => win.webContents.executeJavaScript('document.getElementById("win-btn-layout")?.click();')
        },
        { role: "togglefullscreen", label: "Toggle Fullscreen (F11)" },
        { role: "zoomIn", label: "Zoom In (Ctrl++)" },
        { role: "zoomOut", label: "Zoom Out (Ctrl+-)" },
        { role: "resetZoom", label: "Actual Size (Ctrl+0)" },
        { type: "separator" },
        { role: "toggleDevTools", label: "Developer Console" }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1420,
    height: 900,
    minWidth: 960,
    minHeight: 700,
    title: "WE4ALL VocalForLocal Super-App — Live Windows Web Console",
    backgroundColor: "#020617",
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  buildWindowsMenu(mainWindow);
  injectDesktopShell(mainWindow);
  loadConsoleTarget(mainWindow, "/");

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(LIVE_WEB_CONSOLE_URL)) {
      return { action: "allow" };
    }
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

ipcMain.on("we4all:navigate", (event, targetPath) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win) loadConsoleTarget(win, String(targetPath || "/"));
});

ipcMain.on("we4all:parallel-window", (_event, payload) => {
  createParallelWindow(payload?.targetPath || "/", payload?.title || "WE4ALL Parallel Window");
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