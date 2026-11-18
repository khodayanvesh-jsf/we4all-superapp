const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("WE4ALL_DESKTOP", {
  isWindowsDesktop: true,
  platform: "win32",
  printPage: () => ipcRenderer.send("we4all:print"),
  openParallelWindow: (title) => ipcRenderer.send("we4all:parallel-window", { title }),
  checkOtaUpdate: (force) => ipcRenderer.invoke("we4all:ota-check", Boolean(force)),
  getOtaStatus: () => ipcRenderer.invoke("we4all:ota-status")
});