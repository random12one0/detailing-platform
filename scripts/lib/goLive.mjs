// SHARED BY scripts/go-live-check.mjs (read-only) AND scripts/go-live.mjs (the switch). GitHub issues #6 and #10.
//
// Everything here READS. The only writers are `setSecrets` and `stripeCall` with a non-GET method, and only
// go-live.mjs calls those, only after `--confirm-live`. No secret value is ever printed: modes are decided from the
// key's PREFIX (sk_test_ / sk_live_) and from sha256 digests, the way docs/OUTSTANDING.md proved the Connect client id.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
export const REF = "kguqylyzgyzfktkfnhjb"; // the platform's database; never the real business project
export const BACKUP_REPO = "random12one0/detailing-platform-backups";
export const API_VERSION = "2024-06-20"; // _shared/stripe.ts; a webhook endpoint is created AT a version

// Deployed secret -> its live counterpart in the local env file (STRIPE_X -> STRIPE_LIVE_X).
export const SECRETS = [
  { name: "STRIPE_SECRET_KEY", prefixes: ["sk_test_", "sk_live_"], what: "secret key" },
  { name: "STRIPE_PUBLISHABLE_KEY", prefixes: ["pk_test_", "pk_live_"], what: "publishable key" },
  { name: "STRIPE_WEBHOOK_SECRET", prefixes: ["whsec_"], what: "platform-billing webhook signing secret" },
  { name: "STRIPE_CONNECT_WEBHOOK_SECRET", prefixes: ["whsec_"], what: "Connect webhook signing secret" },
  { name: "STRIPE_CONNECT_CLIENT_ID", prefixes: ["ca_"], what: "Connect client id" },
];
export const liveName = (n) => n.replace("STRIPE_", "STRIPE_LIVE_");

// What supabase/functions/stripe-webhook/index.ts handles. Anything missing here is silently ignored there.
export const WEBHOOK_URL = `https://${REF}.supabase.co/functions/v1/stripe-webhook`;
export const PLATFORM_EVENTS = [
  "checkout.session.completed", "customer.subscription.updated", "customer.subscription.deleted",
  "invoice.paid", "invoice.payment_succeeded", "invoice.payment_failed",
];
export const CONNECT_EVENTS = [
  "account.application.deauthorized", "account.updated", "charge.refunded", "checkout.session.completed",
  "payment_intent.succeeded", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed",
];
export const PRODUCT_TAG = "dp-line"; // platform-billing finds-or-creates its Products by this tag + name

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** Load the env file into process.env without overriding anything already set. A worktree has none: use the main checkout's. */
export function loadEnv() {
  let file = path.join(ROOT, ".env");
  if (!existsSync(file)) {
    const g = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: ROOT, encoding: "utf8" });
    const main = g.status === 0 ? path.dirname(g.stdout.trim()) : "";
    if (main) file = path.join(main, ".env");
  }
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (!line || line.startsWith("#") || i < 0) continue;
    const k = line.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
  }
}

// ---- Supabase Management API ---------------------------------------------------------------------------------
const mgmt = async (p, init = {}) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}${p}`, {
    ...init, headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Management API ${init.method || "GET"} ${p} -> ${r.status}`);
  return text ? JSON.parse(text) : null;
};
/** { SECRET_NAME: sha256-digest } as the project holds it. */
export const deployedDigests = async () =>
  Object.fromEntries((await mgmt("/secrets")).map((s) => [s.name, s.value ?? s.digest ?? ""]));
export const setSecrets = (map) => mgmt("/secrets", { method: "POST", body: JSON.stringify(Object.entries(map).map(([name, value]) => ({ name, value }))) });

// ---- Stripe (form-encoded, like the edge functions) -----------------------------------------------------------
const flat = (o, pre = "") => Object.entries(o).flatMap(([k, v]) => {
  const key = pre ? `${pre}[${k}]` : k;
  return v && typeof v === "object" ? flat(v, key) : [[key, String(v)]];
});
export async function stripeCall(key, method, p, params = {}, idem) {
  const qs = method === "GET" && Object.keys(params).length ? `?${new URLSearchParams(flat(params))}` : "";
  const r = await fetch(`https://api.stripe.com/v1${p}${qs}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Stripe-Version": API_VERSION, ...(idem ? { "Idempotency-Key": idem } : {}),
      ...(method === "GET" ? {} : { "Content-Type": "application/x-www-form-urlencoded" }) },
    body: method === "GET" ? undefined : new URLSearchParams(flat(params)),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Stripe ${method} ${p} -> ${r.status} ${j?.error?.code || j?.error?.type || ""}`.trim());
  return j;
}
export const dpProducts = async (key) =>
  (await stripeCall(key, "GET", "/products", { limit: 100, active: true })).data.filter((p) => p.metadata?.tag === PRODUCT_TAG);

const modeOf = (key) => (key.startsWith("sk_live_") ? "LIVE" : key.startsWith("sk_test_") ? "TEST" : "unknown");

// ---- the checks ----------------------------------------------------------------------------------------------
// kind: "stripe"   = is the Stripe side live yet. Expected to be BLOCKED until go-live has run.
//       "gate"     = must pass BEFORE switching (the platform is healthy, backed up, matches the repo).
//       "customer" = must pass before the FIRST REAL CUSTOMER, but does not stop the switch or the $1 proof.
const row = (kind, title, ok, detail) => ({ kind, title, status: ok ? "PASS" : "BLOCKED", detail });
const sh = (cmd, args) => spawnSync(cmd, args, { cwd: ROOT, env: process.env, encoding: "utf8", maxBuffer: 64 << 20 });

export async function runChecks({ ownerEmail = "" } = {}) {
  const out = [];
  const add = (...a) => out.push(row(...a));
  const liveKey = process.env.STRIPE_LIVE_SECRET_KEY || "";
  const testKey = process.env.STRIPE_SECRET_KEY || "";
  const targetKey = liveKey || testKey;

  // -- gate: can we even look
  let digests = null;
  if (!process.env.SUPABASE_ACCESS_TOKEN) add("gate", "Can reach the Supabase project", false, "SUPABASE_ACCESS_TOKEN is not set, so nothing about the server could be read.");
  else if (process.env.SUPABASE_PROJECT_REF !== REF) add("gate", "Can reach the Supabase project", false, `SUPABASE_PROJECT_REF is not ${REF}. Refusing to look at any other project.`);
  else {
    try { digests = await deployedDigests(); add("gate", "Can reach the Supabase project", true, `Read ${Object.keys(digests).length} secret digests from ${REF}.`); }
    catch (e) { add("gate", "Can reach the Supabase project", false, e.message); }
  }

  // -- stripe: do we hold live keys locally
  const missing = SECRETS.filter((s) => !(process.env[liveName(s.name)] || "").trim());
  const badPrefix = SECRETS.filter((s) => process.env[liveName(s.name)] && !s.prefixes.some((p) => (p === "sk_test_" || p === "pk_test_" ? false : process.env[liveName(s.name)].startsWith(p))));
  add("stripe", "Live Stripe keys are in the local env file", !missing.length && !badPrefix.length,
    missing.length ? `Not there yet: ${missing.map((s) => liveName(s.name)).join(", ")}.`
      : badPrefix.length ? `Wrong kind of value (wrong prefix): ${badPrefix.map((s) => liveName(s.name)).join(", ")}. Live keys start sk_live_ / pk_live_.`
      : "All five are present with the right prefixes.");

  // -- stripe: which mode is each deployed secret in
  const modes = [];
  for (const s of SECRETS) {
    const test = process.env[s.name] || "", live = process.env[liveName(s.name)] || "";
    let mode, detail;
    if (!digests) { mode = "unknown"; detail = "Could not read the server's secrets."; }
    else if (!digests[s.name]) { mode = "unset"; detail = "Not set on the server at all."; }
    else if (live && digests[s.name] === sha256(live)) { mode = "live"; detail = "The server holds your live value."; }
    else if (test && digests[s.name] === sha256(test)) {
      mode = /^(sk|pk)_live_/.test(test) ? "live" : /^(sk|pk)_test_/.test(test) ? "test" : "test-era value";
      detail = `The server holds the value in your local env file (${/^(sk|pk)_/.test(test) ? test.slice(0, 8) : "no mode prefix"}).`;
    } else { mode = "unknown"; detail = "The server holds a value that matches nothing in your local env file, so its mode cannot be proven."; }
    modes.push(mode);
    add("stripe", `${s.what} on the server (${s.name}) is live`, mode === "live", `${mode.toUpperCase()}. ${detail}`);
  }
  add("stripe", "No mix of test and live on the server", new Set(modes).size === 1 && modes[0] === "live" || modes.every((m) => m !== "live"),
    modes.includes("live") && !modes.every((m) => m === "live") ? "Some secrets are live and some are not. Payments would half-work." : "No live/test mix.");

  // -- stripe: the account and the endpoints, in whichever mode the key we hold is in
  const mode = modeOf(targetKey);
  const tag = liveKey ? "checked in LIVE mode" : `checked in ${mode} mode: no live key yet`;
  if (!targetKey) add("stripe", "Stripe account can take real charges", false, "No Stripe key to ask with.");
  else {
    try {
      const a = await stripeCall(targetKey, "GET", "/account");
      add("stripe", "Stripe account can take real charges", !!liveKey && a.charges_enabled && a.payouts_enabled,
        `${tag}. charges_enabled=${a.charges_enabled}, payouts_enabled=${a.payouts_enabled}.`);
      const eps = (await stripeCall(targetKey, "GET", "/webhook_endpoints", { limit: 100 })).data.filter((e) => e.url === WEBHOOK_URL);
      for (const [label, isConnect, events] of [["platform billing", false, PLATFORM_EVENTS], ["Connect (detailers' own payments)", true, CONNECT_EVENTS]]) {
        // A Connect endpoint carries the platform's application id; an ordinary one does not.
        const e = eps.find((x) => !!x.application === isConnect && x.status === "enabled");
        const lacks = e ? events.filter((ev) => !e.enabled_events.includes("*") && !e.enabled_events.includes(ev)) : events;
        const ok = !!e && !lacks.length && e.api_version === API_VERSION;
        add("stripe", `Stripe webhook for ${label} exists with the right events`, ok && !!liveKey,
          `${tag}. ` + (!e ? `No enabled endpoint at ${WEBHOOK_URL}.` : lacks.length ? `Missing events: ${lacks.join(", ")}.`
            : e.api_version !== API_VERSION ? `Endpoint is on API version ${e.api_version}, the code needs ${API_VERSION}; the version is fixed at creation, so it needs a new endpoint.`
            : `Present, ${events.length} events, API ${API_VERSION}.`) + (ok && !liveKey ? " (Test mode is fine; the live one still has to exist.)" : ""));
      }
    } catch (e) { add("stripe", "Stripe account and webhooks can be read", false, e.message); }
  }

  // -- stripe: products. There are NO price ids: amounts are sent inline (price_data) and only a named Product is looked up.
  try {
    const t = testKey && modeOf(testKey) === "TEST" ? (await dpProducts(testKey)).map((p) => p.name) : null;
    const l = liveKey ? (await dpProducts(liveKey)).map((p) => p.name) : null;
    if (!t) add("stripe", "Stripe products exist in live mode", false, "No test key to copy the product list from.");
    else if (!l) add("stripe", "Stripe products exist in live mode", false, `No live key yet. Test mode has ${t.length} product(s) tagged ${PRODUCT_TAG}; there are no price ids to copy (amounts live in code), and go-live creates the same named products.`);
    else { const gone = t.filter((n) => !l.includes(n)); add("stripe", "Stripe products exist in live mode", !gone.length, gone.length ? `Missing in live: ${gone.join("; ")}. go-live creates them.` : `All ${t.length} match.`); }
  } catch (e) { add("stripe", "Stripe products exist in live mode", false, e.message); }

  // -- gate: backup, deployed inventory, migration drift
  const gh = sh("gh", ["run", "list", "-R", BACKUP_REPO, "--limit", "1", "--json", "conclusion,status,createdAt"]);
  try {
    const r = JSON.parse(gh.stdout)[0];
    const hrs = r ? (Date.now() - Date.parse(r.createdAt)) / 36e5 : Infinity;
    add("gate", "Last nightly backup succeeded and is recent", !!r && r.conclusion === "success" && hrs < 36,
      r ? `Last run ${r.conclusion || r.status}, ${hrs.toFixed(0)} hours ago.` : "No runs found.");
  } catch { add("gate", "Last nightly backup succeeded and is recent", false, `Could not read it (gh exit ${gh.status}). Is gh signed in?`); }

  const inv = sh(process.execPath, ["scripts/deployed-inventory.mjs"]);
  add("gate", "Every deployed function matches this checkout", inv.status === 0, (inv.stdout.split("\n").find((l) => /^(PASS|FAIL)/.test(l)) || `deployed-inventory exit ${inv.status}`).slice(0, 200));
  const drift = sh(process.execPath, ["scripts/migration-drift.mjs"]);
  add("gate", "The database matches the migrations", drift.status === 0, (drift.stdout.split("\n").find((l) => /^(PASS|FAIL)/.test(l)) || `migration-drift exit ${drift.status}`).slice(0, 200));

  // -- customer: demo admins (#10) and the Terms wording (#33)
  const lock = sh(process.execPath, ["scripts/lock-demo-admins.mjs", `--owner-email=${ownerEmail || "preflight-check@example.invalid"}`]);
  const left = (lock.stdout.match(/will remove from platform_admins: (.*)/) || [])[1] || "";
  add("customer", "The two demo admin logins are locked (issue #10)", lock.status === 0 && left.includes("neither"),
    lock.status !== 0 ? `Dry run failed: ${(lock.stderr || lock.stdout).split("\n").find(Boolean)?.slice(0, 160)}` : left.includes("neither") ? "Neither demo login is a platform admin." : `Still platform admins: ${left}.`);
  const legal = readFileSync(path.join(ROOT, "app/src/landing/legal.js"), "utf8");
  const hasDisclaimer = legal.split(/\r?\n/).some((line) =>
    !line.trimStart().startsWith("//") && /not yet reviewed by a lawyer/.test(line));
  add("customer", "Terms page no longer says it is unreviewed by a lawyer (issue #33)", !hasDisclaimer,
    hasDisclaimer ? "The Terms still say \"not yet reviewed by a lawyer\" next to an auto-renewal and an exit fee. Andrew's call: a legal read, or his own wording." : "That line is gone.");
  return out;
}

export function printChecks(rows) {
  const names = { gate: "BEFORE THE SWITCH (platform health)", stripe: "STRIPE: is it live yet (BLOCKED is normal until go-live runs)", customer: "BEFORE THE FIRST REAL CUSTOMER (not needed for the switch or the $1 proof)" };
  for (const k of ["gate", "stripe", "customer"]) {
    if (!rows.some((x) => x.kind === k)) continue;
    console.log(`\n${names[k]}`);
    for (const r of rows.filter((x) => x.kind === k)) console.log(`  [${r.status}] ${r.title}\n          ${r.detail}`);
  }
  if (!rows.some((r) => r.kind === "stripe")) return; // a partial listing (go-live shows only the health block)
  const open = (k) => rows.filter((r) => r.kind === k && r.status !== "PASS").length;
  console.log(`\nSUMMARY: ${open("gate")} platform-health item(s) blocked, ${open("stripe")} Stripe item(s) not live yet, ${open("customer")} first-customer item(s) open.`);
  console.log(open("gate") ? "NOT READY to switch. Fix the platform-health items first." : open("stripe") ? "Platform health passed. Follow docs/GO-LIVE.md to complete Stripe setup and rehearse the switch." : "Stripe is live.");
}
