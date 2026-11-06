import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, grants, edge, client, founder, app, renderer] = await Promise.all([
  read("../supabase/migrations/20261106160224_we4all_versioned_dynamic_module_registry.sql"),
  read("../supabase/migrations/20261106160401_we4all_dynamic_modules_read_only_client_grants.sql"),
  read("../supabase/functions/we4all-module-admin/index.ts"),
  read("../src/supabaseClient.js"),
  read("../src/modules/FounderAdminSuite.jsx"),
  read("../src/App.jsx"),
  read("../src/modules/DynamicModuleRenderer.jsx")
]);

test("dynamic module registry stores versioned drafts, publish/disable states and revisions", () => {
  assert.match(migration, /create table if not exists public\.we4all_dynamic_modules/);
  assert.match(migration, /status text not null default 'draft'/);
  assert.match(migration, /version integer not null default 1/);
  assert.match(migration, /create table if not exists public\.we4all_dynamic_module_revisions/);
  assert.match(migration, /unique\(module_id,version\)/);
  assert.match(migration, /we4all_set_dynamic_module_status/);
});

test("module writes are server-only and executable HTML/script config is rejected", () => {
  assert.match(migration, /request\.jwt\.claim\.role/);
  assert.match(migration, /SERVER_ONLY_DYNAMIC_MODULE_WRITE/);
  assert.match(migration, /EXECUTABLE_MODULE_CONFIG_NOT_ALLOWED/);
  assert.match(edge, /app_metadata\?\.we4all_role !== "founder"/);
  assert.match(edge, /EXECUTABLE_MODULE_CONFIG_NOT_ALLOWED/);
});

test("clients can read published modules but cannot write module or revision tables", () => {
  assert.match(migration, /status='published' and is_public=true/);
  assert.match(grants, /revoke insert,update,delete on table public\.we4all_dynamic_modules from anon,authenticated/);
  assert.match(grants, /revoke all on table public\.we4all_dynamic_module_revisions from anon,authenticated/);
  assert.match(client, /loadPublishedDynamicModules/);
});

test("Founder console exposes draft, publish and disable actions through the server API", () => {
  assert.match(founder, /Dynamic Module Builder/);
  assert.match(founder, /saveFounderDynamicModule/);
  assert.match(founder, /handleDynamicModuleStatus/);
  assert.match(founder, /Publish/);
  assert.match(founder, /Disable/);
});

test("customer app reads and renders published dynamic modules with an allowlisted renderer", () => {
  assert.match(app, /loadPublishedDynamicModules/);
  assert.match(app, /DynamicModuleRenderer/);
  assert.match(renderer, /ACTIONS = new Set/);
  assert.doesNotMatch(renderer, /dangerouslySetInnerHTML|eval\(/);
});
