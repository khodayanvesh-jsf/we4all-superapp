import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [main, configText, client, app, account, pkgText, workflow] = await Promise.all([
  read("../src/main.jsx"),
  read("../capacitor.config.json"),
  read("../src/supabaseClient.js"),
  read("../src/App.jsx"),
  read("../src/modules/OwnerAccountProfile.jsx"),
  read("../package.json"),
  read("../.github/workflows/we4all-capgo-ota.yml")
]);
const config = JSON.parse(configText);
const pkg = JSON.parse(pkgText);

test("Capgo updater is installed for the Capacitor 8 runtime", () => {
  assert.equal(pkg.dependencies["@capgo/capacitor-updater"], "8.54.2");
});

test("native startup acknowledges the currently executing bundle", () => {
  assert.match(main, /CapacitorUpdater\.notifyAppReady\(\)/);
  assert.match(main, /Capacitor\.isNativePlatform\(\)/);
  assert.ok(main.indexOf("CapacitorUpdater.notifyAppReady") < main.indexOf("ReactDOM.createRoot"));
});

test("Capgo config uses safe background application and HTTPS", () => {
  const updater = config.plugins.CapacitorUpdater;
  assert.equal(updater.appId, "com.we4all.superapp");
  assert.equal(updater.autoUpdate, "atBackground");
  assert.equal(updater.httpsOnly, true);
  assert.equal(updater.keepUrlPathAfterReload, true);
});

test("OTA checks use the native Capgo channel, not a static Vercel version manifest", () => {
  assert.match(client, /CapacitorUpdater\.getLatest\(\)/);
  assert.match(client, /CapacitorUpdater\.current\(\)/);
  assert.doesNotMatch(client, /ota-manifest\.json/);
});

test("OTA installation downloads and queues a real updater bundle", () => {
  assert.match(client, /CapacitorUpdater\.download\(/);
  assert.match(client, /CapacitorUpdater\.next\(\{ id: bundle\.id \}\)/);
  const installer = client.slice(client.indexOf("export async function performZeroLossOtaUpdate("));
  assert.doesNotMatch(installer, /setInterval\(/);
  assert.doesNotMatch(installer, /localStorage\.setItem\(INSTALLED_VER_KEY, ver\)/);
  assert.match(app, /next safe app background\/relaunch/);
});

test("native app checks for OTA on launch and exposes version/update status in About App", () => {
  assert.match(app, /otaLaunchCheckStarted/);
  assert.match(app, /checkLiveCloudOtaManifest\(/);
  assert.match(app, /performZeroLossOtaUpdate\(/);
  assert.match(account, /id: "about_app", label: "ℹ️ About App"/);
  assert.match(account, /appUpdateInfo\.installedAppVersion/);
  assert.match(account, /Check for updates/);
});

test("OTA release workflow restricts channels and requires encrypted upload secrets", () => {
  assert.match(workflow, /CAPGO_API_KEY/);
  assert.match(workflow, /CAPGO_PRIVATE_KEY/);
  assert.match(workflow, /--key-data-v2/);
  assert.match(workflow, /inputs\.channel == 'production'.*refs\/heads\/main/s);
  assert.match(workflow, /inputs\.channel == 'staging'.*refs\/heads\/fix\/payment-safety-guest-default/s);
  assert.match(workflow, /inputs\.channel == 'staging'.*refs\/heads\/codex\/we4all-partner-registration-kyc-20261107/s);
  assert.match(workflow, /push:[\s\S]*branches:[\s\S]*codex\/we4all-partner-registration-kyc-20261107/);
  assert.match(workflow, /github\.event_name == 'push' && 'staging'/);
  assert.match(workflow, /CapacitorUpdater\?\.publicKey!==process\.env\.CAPGO_PUBLIC_KEY/);
  assert.doesNotMatch(workflow, /--no-key/);
});
