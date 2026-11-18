(function () {
  const SUPA_URL = "https://bdmbziwazpuzbukazmug.supabase.co";
  const SUPA_KEY = "sb_publishable_nNPwaseb81B8V05aVwmleg_JkBVNvzl";
  const OTA_MANIFEST_URL = "https://we-4-all-super-app.vercel.app/ota-manifest.json";

  // Hide web top download bar when running inside installed Windows .EXE or Android .APK
  window.addEventListener("DOMContentLoaded", () => {
    const isNativeAndroid = Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    const isWindowsExe = Boolean(window.WE4ALL_DESKTOP && window.WE4ALL_DESKTOP.isWindowsDesktop);
    const dlBar = document.getElementById("we4all-platform-download-bar");
    if (dlBar && (isNativeAndroid || isWindowsExe)) {
      dlBar.style.display = "none";
    }
  });

  // Expose global Frontend <-> Backend & OTA diagnostic verifier for both Android and Windows
  window.WE4ALL_DIAGNOSTICS = {
    async verifyBackendAndOta() {
      const start = performance.now();
      const results = {
        timestamp: new Date().toISOString(),
        platform: window.WE4ALL_DESKTOP?.isWindowsDesktop ? "Windows Desktop (.EXE)" : (window.Capacitor?.isNativePlatform?.() ? "Android Native (.APK)" : "Web / PWA"),
        supabaseRestOk: false,
        partnersCount: 0,
        catalogueCount: 0,
        marketsCount: 0,
        latencyMs: 0,
        otaManifest: null
      };
      try {
        const headers = { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY };
        const [pRes, cRes, mRes, otaRes] = await Promise.all([
          fetch(SUPA_URL + "/rest/v1/we4all_partners?select=id&approval_status=eq.approved", { headers }),
          fetch(SUPA_URL + "/rest/v1/=*", { headers }),
          fetch(SUPA_URL + "/rest/v1/we4all_markets?select=id", { headers }),
          fetch(OTA_MANIFEST_URL + "?t=" + Date.now()).catch(() => null)
        ]);
        results.latencyMs = Math.round(performance.now() - start);
        if (pRes.ok && mRes.ok) {
          const [pData, cData, mData] = await Promise.all([pRes.json(), cRes.ok ? cRes.json() : Promise.resolve([]), mRes.json()]);
          results.supabaseRestOk = true;
          results.partnersCount = Array.isArray(pData) ? pData.length : 0;
          results.catalogueCount = Array.isArray(cData) ? cData.length : 0;
          results.marketsCount = Array.isArray(mData) ? mData.length : 0;
        }
        if (otaRes && otaRes.ok) {
          results.otaManifest = await otaRes.json();
        }
      } catch (e) {
        results.error = e.message;
      }
      return results;
    }
  };
})();