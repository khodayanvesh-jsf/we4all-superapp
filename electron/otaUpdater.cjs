const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const CLOUD_BASE = "https://we-4-all-super-app.vercel.app";

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchBuffer(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error("HTTP " + res.statusCode + " from " + url));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

function getOtaCacheDir(app) {
  return path.join(app.getPath("userData"), "ota-cache");
}

function getActiveIndexHtml(app, packagedVersion) {
  const cacheDir = getOtaCacheDir(app);
  const stateFile = path.join(cacheDir, "ota-state.json");
  const cachedIndex = path.join(cacheDir, "current", "index.html");

  if (fs.existsSync(stateFile) && fs.existsSync(cachedIndex)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      if (state.version && state.version.localeCompare(packagedVersion, undefined, { numeric: true }) >= 0) {
        return { indexPath: cachedIndex, activeVersion: state.version, source: "OTA-CACHE", sha256: state.sha256 || "" };
      }
    } catch {}
  }
  return {
    indexPath: path.join(__dirname, "..", "dist", "index.html"),
    activeVersion: packagedVersion,
    source: "PACKAGED-EXE",
    sha256: "builtin"
  };
}

async function checkAndApplyOtaUpdate(app, packagedVersion, forceDownload = false) {
  const manifestBuf = await fetchBuffer(CLOUD_BASE + "/ota-manifest.json?t=" + Date.now());
  const manifest = JSON.parse(manifestBuf.toString("utf8"));
  const currentInfo = getActiveIndexHtml(app, packagedVersion);

  const isNewer = manifest.version.localeCompare(currentInfo.activeVersion, undefined, { numeric: true }) > 0;
  const hashChanged = manifest.sha256 && currentInfo.sha256 !== manifest.sha256 && currentInfo.source === "OTA-CACHE";

  if (!isNewer && !hashChanged && !forceDownload) {
    return {
      updated: false,
      currentVersion: currentInfo.activeVersion,
      remoteVersion: manifest.version,
      source: currentInfo.source,
      sha256: manifest.sha256,
      message: "Up to date on v" + currentInfo.activeVersion
    };
  }

  // Download ota-bundle.zip
  const zipBuf = await fetchBuffer(CLOUD_BASE + "/ota-bundle.zip?t=" + Date.now());
  const actualSha = crypto.createHash("sha256").update(zipBuf).digest("hex");

  if (manifest.sha256 && actualSha.toLowerCase() !== manifest.sha256.toLowerCase()) {
    throw new Error("OTA SHA-256 integrity mismatch! Expected " + manifest.sha256 + " got " + actualSha);
  }

  const cacheDir = getOtaCacheDir(app);
  const zipPath = path.join(cacheDir, "ota-bundle.zip");
  const extractDir = path.join(cacheDir, "current");

  fs.mkdirSync(cacheDir, { recursive: true });
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(extractDir, { recursive: true });
  fs.writeFileSync(zipPath, zipBuf);

  // Extract using built-in Windows tar.exe or PowerShell Expand-Archive
  try {
    execFileSync("tar.exe", ["-xf", zipPath, "-C", extractDir]);
  } catch {
    execFileSync("powershell.exe", ["-NoProfile", "-Command", `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`]);
  }

  // Rewrite root-relative /assets/ paths to ./assets/ for local file:// execution
  const extractedIndex = path.join(extractDir, "index.html");
  if (fs.existsSync(extractedIndex)) {
    let html = fs.readFileSync(extractedIndex, "utf8");
    html = html
      .replace(/src="\/assets\//g, 'src="./assets/')
      .replace(/href="\/assets\//g, 'href="./assets/')
      .replace(/src="\/ota-client\.js"/g, 'src="./ota-client.js"');
    fs.writeFileSync(extractedIndex, html, "utf8");
  }

  const state = {
    version: manifest.version,
    buildNumber: manifest.buildNumber,
    sha256: actualSha,
    appliedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(cacheDir, "ota-state.json"), JSON.stringify(state, null, 2), "utf8");

  return {
    updated: true,
    currentVersion: manifest.version,
    remoteVersion: manifest.version,
    source: "OTA-CACHE",
    sha256: actualSha,
    message: "OTA Update v" + manifest.version + " verified & applied!"
  };
}

module.exports = { getActiveIndexHtml, checkAndApplyOtaUpdate };