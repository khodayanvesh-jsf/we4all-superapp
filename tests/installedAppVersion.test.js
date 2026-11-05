import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const client = await readFile(new URL("../src/supabaseClient.js", import.meta.url), "utf8");
const version = await readFile(new URL("../src/appVersion.js", import.meta.url), "utf8");
const gradle = await readFile(new URL("../android/app/build.gradle", import.meta.url), "utf8");
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("installed APK version and build number are visible in the mobile shell", () => {
  assert.match(app, /INSTALLED APP v\{APP_VERSION\} · BUILD \{APP_BUILD_NUMBER\}/);
  assert.match(app, /OTA BUNDLE/);
});

test("one version source agrees with package metadata and Android native metadata", () => {
  assert.match(version, /APP_VERSION = "3\.2\.9"/);
  assert.match(version, /APP_BUILD_NUMBER = 329/);
  assert.equal(pkg.version, "3.2.9");
  assert.match(gradle, /versionCode 329/);
  assert.match(gradle, /versionName "3\.2\.9"/);
});

test("Supabase sync schema version matches the app release version", () => {
  assert.match(client, /CURRENT_SCHEMA_VERSION = "3\.2\.9"/);
  assert.match(client, /installedAppVersion: APP_VERSION/);
  assert.match(client, /currentBundleVersion/);
});

test("installed native version is distinct from OTA bundle version", () => {
  assert.match(client, /const currentVersion = APP_VERSION/);
  assert.match(client, /const currentBundleVersion = current\?\.bundle\?\.version/);
});
