import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const client = await readFile(new URL("../src/supabaseClient.js", import.meta.url), "utf8");
const version = await readFile(new URL("../src/appVersion.js", import.meta.url), "utf8");
const gradle = await readFile(new URL("../android/app/build.gradle", import.meta.url), "utf8");
const capacitor = JSON.parse(await readFile(new URL("../capacitor.config.json", import.meta.url), "utf8"));
const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("installed APK version and build number are visible in the mobile shell", () => {
  assert.match(app, /INSTALLED APP v\{APP_VERSION\} · BUILD \{APP_BUILD_NUMBER\}/);
  assert.match(app, /OTA BUNDLE/);
});

test("one version source agrees with package metadata and Android native metadata", () => {
  const appVersion = version.match(/APP_VERSION = "([^"]+)"/)?.[1];
  const appBuild = version.match(/APP_BUILD_NUMBER = (\d+)/)?.[1];
  assert.ok(appVersion && appBuild);
  assert.equal(pkg.version, appVersion);
  assert.equal(lock.version, appVersion);
  assert.equal(lock.packages[""].version, appVersion);
  assert.equal(gradle.match(/versionCode (\d+)/)?.[1], appBuild);
  assert.equal(gradle.match(/versionName "([^"]+)"/)?.[1], appVersion);
});

test("Android uses bundled assets and keeps the installed application ID", () => {
  assert.equal(capacitor.webDir, "dist");
  assert.equal(capacitor.server?.url, undefined);
  assert.equal(capacitor.android.allowMixedContent, false);
  assert.equal(gradle.match(/applicationId "([^"]+)"/)?.[1], capacitor.appId);
});

test("Supabase sync schema and installed release versions are tracked separately", () => {
  assert.match(client, /CURRENT_SCHEMA_VERSION = "3.3.0"/);
  assert.match(client, /installedAppVersion: APP_VERSION/);
  assert.match(client, /currentBundleVersion/);
});

test("installed native version is distinct from OTA bundle version", () => {
  assert.match(client, /const currentVersion = APP_VERSION/);
  assert.match(client, /const currentBundleVersion = current\?\.bundle\?\.version/);
});
