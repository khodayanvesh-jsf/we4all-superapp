const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("WE4ALL_DESKTOP", {
  isWindowsDesktop: true,
  platform: "win32",
  printPage: () => ipcRenderer.send("we4all:print"),
  navigateUrl: (targetPath) => ipcRenderer.send("we4all:navigate", targetPath),
  openParallelWindow: (targetPath, title) => ipcRenderer.send("we4all:parallel-window", { targetPath, title })
});