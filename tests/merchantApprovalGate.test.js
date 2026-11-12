import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
let PGlite = null;
try {
  ({ PGlite } = await import("@electric-sql/pglite"));
} catch {
  PGlite = null;
}

test("merchant activation requires reviewed documents and a stored signature", async () => {
  const migrations = new URL("../supabase/migrations/", import.meta.url);
  const file = (await readdir(migrations)).find((name) => name.endsWith("_we4all_require_merchant_evidence.sql"));
  const sqlText = await readFile(new URL(file, migrations), "utf8");
  if (!PGlite) {
    assert.match(sqlText, /we4all_check_merchant_application/);
    assert.match(sqlText, /Approve the merchant application in Partner Review before enabling access/);
    return;
  }
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key, raw_app_meta_data jsonb);
      create table storage.objects(bucket_id text, name text, metadata jsonb);
      create table public.we4all_partner_applications(
        id uuid primary key, user_id uuid, requested_role text, status text,
        reviewed_by uuid, reviewed_at timestamptz, application_payload jsonb
      );
      create table public.we4all_user_roles(user_id uuid, role text, status text);
      create table public.we4all_partners(owner_user_id uuid, partner_type text, approval_status text);
    `);
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
    const founder = "00000000-0000-4000-8000-000000000001";
    const applicant = "00000000-0000-4000-8000-000000000002";
    const application = "00000000-0000-4000-8000-000000000003";
    const prefix = `${applicant}/${application}/`;
    const files = Object.fromEntries(["identity","business_proof","payout_proof"].map((key) => [key, prefix + key + ".png"]));
    const signature = prefix + "signature.png";
    await db.query("insert into auth.users values ($1,$2),($3,'{}')", [founder, { we4all_role: "founder" }, applicant]);
    await db.query("insert into public.we4all_partner_applications values ($1,$2,'merchant','pending',null,null,$3)", [
      application, applicant,
      { kyc: { status: "submitted", files, terms: { accepted: true }, signature: { method: "uploaded_image", signer_name: "Fixture", path: signature } } }
    ]);
    const enableRole = () => db.query("insert into public.we4all_user_roles values ($1,'merchant','approved')", [applicant]);
    const enablePartner = () => db.query("insert into public.we4all_partners values ($1,'merchant','approved')", [applicant]);
    const approve = (reviewer) => db.query("update public.we4all_partner_applications set status='approved',reviewed_by=$1,reviewed_at=now() where id=$2", [reviewer,application]);
    const addFile = (path, mime = "image/png") => db.query("insert into storage.objects values ('we4all-partner-kyc',$1,$2)", [path,{ mimetype: mime }]);
    await assert.rejects(enableRole, /Approve the merchant application/);
    await assert.rejects(enablePartner, /Approve the merchant application/);
    await assert.rejects(() => approve(applicant), /requires a Founder or assigned administrator/);
    await assert.rejects(() => approve(founder), /merchant document is missing/);
    for (const path of Object.values(files)) await addFile(path);
    await assert.rejects(() => approve(founder), /merchant signature is missing or invalid/);
    await addFile(signature, "application/pdf");
    await assert.rejects(() => approve(founder), /merchant signature is missing or invalid/);
    await db.query("update storage.objects set metadata = '{\"mimetype\":\"image/png\"}' where name=$1", [signature]);
    await approve(founder);
    await enableRole();
    await enablePartner();
    const { rows } = await db.query("select status from public.we4all_user_roles where user_id=$1", [applicant]);
    assert.deepEqual(rows, [{ status: "approved" }]);
  } finally {
    await db.close();
  }
});
