// LAUNCH STEP (ROADMAP 12.4, GitHub issue #10): TAKE THE BACK OFFICE AWAY FROM THE TWO GUESSABLE DEMO LOGINS.
//
//   node --env-file=.env scripts/lock-demo-admins.mjs --owner-email=<the real owner address>           # dry run, changes nothing
//   node --env-file=.env scripts/lock-demo-admins.mjs --owner-email=<the real owner address> --apply    # does it
//
// Run it from the MAIN checkout (it rewrites that checkout's `.env`), about a week before the first real
// detailer is invited. Until then both demo logins stay as they are: ~60 browser checks sign in as them.
//
// WHAT --apply DOES, IN THIS ORDER (so there is never a moment with no admin):
//   1. Makes sure the real owner login exists (created with a random password if new, which goes into `.env`
//      as PLATFORM_OWNER_PW and is never printed; use "Forgot password" to choose your own) and is in
//      `platform_admins`.
//   2. Removes `demo@demo.com` and `demo@detailplatform.com` from `platform_admins` (this also deletes the
//      plaintext password note on the first row).
//   3. Gives both demo accounts a new random password, and bans `demo@demo.com` (it belongs to no business).
//      `demo@detailplatform.com` stays a plain demo detailer; its new password replaces DEMO_OWNER_PW in `.env`
//      so seed-demo and the browser scripts keep working.
//   4. Reads `platform_admins` back and exits non-zero unless the owner is in and both demos are out.
// Afterwards: edit the roster block in docs/platform-admins.md to match, and run
//   node --test tests/platform-admins-declared.test.mjs ; node scripts/admin-refuses.mjs
//
// No password or token is ever printed. Only touches project kguqylyzgyzfktkfnhjb.

import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REF = "kguqylyzgyzfktkfnhjb";
const DEMOS = ["demo@demo.com", "demo@detailplatform.com"];  // mail-sink: the two demo owners' login names; read back to find their accounts, never a recipient
const ENV_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").split("=").slice(1).join("=");
const APPLY = process.argv.includes("--apply");
const OWNER = arg("owner-email").trim().toLowerCase();

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing - run with node --env-file=.env");
if (process.env.SUPABASE_PROJECT_REF !== REF || !URL_.includes(REF)) throw new Error(`refusing: not project ${REF}`);
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(OWNER) || DEMOS.includes(OWNER)) {
  throw new Error("pass --owner-email=<a real address that is not one of the demo logins>");
}

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const call = async (p, init = {}) => {
  const r = await fetch(URL_ + p, { ...init, headers: H });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${init.method || "GET"} ${p} -> ${r.status} ${JSON.stringify(body).slice(0, 160)}`);
  return body;
};
// 72-byte bcrypt limit: "A1!" + one UUID.
const rnd = () => `A1!${randomUUID()}`;
const users = async () => (await call("/auth/v1/admin/users?per_page=1000")).users ?? [];
const admins = async () => call("/rest/v1/platform_admins?select=user_id,email");

function setEnv(name, value) {
  let s = readFileSync(ENV_FILE, "utf8");
  const line = `${name}=${value}`;
  s = new RegExp(`^${name}=.*$`, "m").test(s) ? s.replace(new RegExp(`^${name}=.*$`, "m"), () => line) : `${s.replace(/\s*$/, "\n")}${line}\n`;
  writeFileSync(ENV_FILE, s);
}

const before = await admins();
const all = await users();
const byEmail = (e) => all.find((u) => (u.email || "").toLowerCase() === e);
console.log(`platform_admins now: ${before.map((a) => a.email).join(", ")}`);
console.log(`owner ${OWNER}: ${byEmail(OWNER) ? "account exists" : "account will be created"}`);
console.log(`will remove from platform_admins: ${DEMOS.filter((e) => before.some((a) => a.email === e)).join(", ") || "(neither is in it)"}`);
if (!APPLY) { console.log("DRY RUN - nothing changed. Add --apply to do it."); process.exit(0); }

// 1. the owner first
let owner = byEmail(OWNER);
if (!owner) {
  const pw = rnd();
  owner = await call("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email: OWNER, password: pw, email_confirm: true }) });
  setEnv("PLATFORM_OWNER_PW", pw);
}
if (!before.some((a) => a.user_id === owner.id)) {
  await call("/rest/v1/platform_admins", { method: "POST", body: JSON.stringify([{ user_id: owner.id, email: OWNER, note: "Platform owner, real login. Added by scripts/lock-demo-admins.mjs." }]) });
}

// 2 + 3. the demos
for (const email of DEMOS) {
  const u = byEmail(email);
  if (!u) continue;
  await call(`/rest/v1/platform_admins?user_id=eq.${u.id}`, { method: "DELETE" });
  const pw = rnd();
  const patch = { password: pw, email_confirm: true, ...(email === "demo@demo.com" ? { ban_duration: "876000h" } : {}) };
  await call(`/auth/v1/admin/users/${u.id}`, { method: "PUT", body: JSON.stringify(patch) });
  if (email === "demo@detailplatform.com") setEnv("DEMO_OWNER_PW", pw);
}

// 4. read it back
const after = await admins();
const ok = after.some((a) => a.email === OWNER) && DEMOS.every((e) => !after.some((a) => a.email === e));
console.log(`platform_admins after: ${after.map((a) => a.email).join(", ")}`);
console.log(ok ? "OK: owner is in, both demo logins are out. Now update docs/platform-admins.md." : "FAILED: read-back does not match.");
process.exit(ok ? 0 : 1);
