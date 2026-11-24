const { app, BrowserWindow, Menu, shell, session } = require("electron");

const BASE_URL = "https://we-4-all-super-app.vercel.app";
const PARTNER_URL = `${BASE_URL}/partner`;
const ADMIN_URL = `${BASE_URL}/admin`;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: "WE4ALL Super-App (All Users · Partners · Admin)",
    backgroundColor: "#020617",
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });

  // Allow geolocation & notifications for live GPS map pin picker
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(["geolocation", "notifications", "media", "clipboard-read"].includes(permission));
  });

  // Open external links (Google Maps, WhatsApp, PDFs) in default Windows browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(BASE_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
    if (code === -3) return;
    mainWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(`
        <body style="margin:0;background:#020617;color:#e2e8f0;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;">
          <div style="max-width:420px;padding:28px;border-radius:20px;background:#0f172a;border:1px solid #4f46e5;">
            <h2 style="margin:0 0 8px;color:#fff;">WE4ALL Console Offline</h2>
            <p style="font-size:13px;color:#94a3b8;">Could not reach live cloud (${desc}). Check internet connection and retry.</p>
            <button onclick="location.href='${PARTNER_URL}'" style="margin-top:14px;padding:10px 20px;border:none;border-radius:10px;background:#4f46e5;color:#fff;font-weight:800;cursor:pointer;">Retry Connection</button>
          </div>
        </body>
      `)}`
    );
  });

  const menu = Menu.buildFromTemplate([
    {
      label: "Workspaces",
      submenu: [
        { label: "🏪 Partner Console (Merchants & Services)", accelerator: "CmdOrCtrl+1", click: () => mainWindow.loadURL(PARTNER_URL) },
        { label: "🛡️ Founder Admin Console", accelerator: "CmdOrCtrl+2", click: () => mainWindow.loadURL(ADMIN_URL) },
        { label: "📱 Consumer Storefront", accelerator: "CmdOrCtrl+3", click: () => mainWindow.loadURL(BASE_URL) },
        { type: "separator" },
        { label: "🖨️ Print Invoice / Page", accelerator: "CmdOrCtrl+P", click: () => mainWindow.webContents.print({ silent: false, printBackground: true }) },
        { label: "🔄 Reload Live Cloud", accelerator: "CmdOrCtrl+R", click: () => mainWindow.reload() },
        { type: "separator" },
        { role: "quit", label: "Exit WE4ALL Console" }
      ]
    },
    { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
    { label: "View", submenu: [{ role: "zoomIn" }, { role: "zoomOut" }, { role: "resetZoom" }, { type: "separator" }, { role: "togglefullscreen" }] }
  ]);
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL(BASE_URL);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });