export const APP_VERSION = "1.1.3";
if (typeof window !== "undefined") {
  setTimeout(() => {
    if (document.body && !document.getElementById("we4all-ver")) {
      const b = document.createElement("div");
      b.id = "we4all-ver";
      b.textContent = "WE4ALL v" + APP_VERSION;
      b.style.cssText = "position:fixed;bottom:6px;right:10px;font-size:11px;opacity:0.65;pointer-events:none;z-index:9999;font-family:sans-serif;";
      document.body.appendChild(b);
    }
  }, 500);
}
