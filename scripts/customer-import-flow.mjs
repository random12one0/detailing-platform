// ROADMAP 97.40 - THE CUSTOMER IMPORT, PRESSED THROUGH ITS VISIBLE CONTROLS.
//
//   node --env-file=<repo>/.env scripts/customer-import-flow.mjs                 (stand-in, clean)
//   node --env-file=<repo>/.env scripts/customer-import-flow.mjs --break=no-guard
//   node --env-file=<repo>/.env scripts/customer-import-flow.mjs --break=no-member
//   node --env-file=<repo>/.env scripts/customer-import-flow.mjs --break=list-only-preview
//   node --env-file=<repo>/.env scripts/customer-import-flow.mjs --live          (after the publish)
//   node --env-file=<repo>/.env scripts/customer-import-flow.mjs --live --break=skip-undo
//   BASE_URL=http://127.0.0.1:5180 ... (defaults to localhost:5173)
//
// At 390x844, 768x1024 and 1440x900 it signs in as the demo owner, opens
// Clients, presses "Import customers", picks `app/public/sample-customer-import.csv`
// in the real file chooser, and checks the preview names every row (17 new by
// name, Tom Twin and Zoe Copy as duplicates, No Phone as needing a fix). It
// presses Save, checks 17 rows were stored flagged imported under ONE batch and
// the list grew by those 17, then plants a flagged test fixture IN THAT SAME
// BATCH, presses Undo, and checks exactly the 17 went: the fixture and every
// customer that was there before survive, and the list is back. A request
// carrying a forged session is refused with nothing written.
//
// TWO MODES, SAID PLAINLY.
// STAND-IN (default): the `import-customers` function is not deployed and its
// columns are not applied, so the page's calls to it are answered HERE by the
// REAL handler (`handleImportRequest` in `supabase/functions/_shared/importRules.ts`,
// the code index.ts serves, membership refusal included) against an in-memory
// customers table seeded from the list the page's own backend returns (on a belt
// job server that is the belt's local demo backend, not the real project). Its membership
// check is a stand-in that accepts ONLY the signed-in owner's own session (the
// JWT's user id) for the owner's own business. Nothing is written to any
// database. It also plants a customer the screen's list never loads (as if past
// its 200-row cap) sharing Gil Hahn's phone: the preview must still name him.
// LIVE (--live): nothing is intercepted. The deployed function, the live
// columns and live row-level security answer, on the demo business only
// (`demo-detail` on project kguqylyzgyzfktkfnhjb, refused otherwise). The
// fixture is planted and the batch is cleaned up with the service key, and the
// cleanup runs whatever happened, then is itself checked.
//
// SABOTAGES. --break=no-guard and --break=no-member remove those production
// lines (the fixture guard, the membership refusal) from the handler the
// browser's calls run: Undo takes 18 / the forged session is let in.
// --break=list-only-preview answers the preview from the screen's loaded list
// only (the old behavior): the beyond-the-list twin goes unnamed.
// --live --break=skip-undo never presses Undo: the undo questions go red and the
// cleanup must still remove the batch. An in-process canary runs every time.

import { createRequire, stripTypeScriptTypes } from "node:module";
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const req = createRequire(import.meta.url);
const { chromium } = req("./../app/node_modules/playwright/index.js");

const ARGV = process.argv.slice(2);
const LIVE = ARGV.includes("--live");
const BASE = (process.env.BASE_URL || process.env.BASE || "http://localhost:5173").replace(/\/$/, "");
const BREAK = (ARGV.find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
const BREAKS = LIVE ? ["skip-undo", "lose-save-response"]
  : ["no-guard", "no-member", "list-only-preview", "lose-save-response", "faded-preview", "no-hit-area"];
if (BREAK && !BREAKS.includes(BREAK)) { console.error(`unknown --break=${BREAK} (${LIVE ? "--live" : "stand-in"} knows ${BREAKS.join(", ")})`); process.exit(2); }
const SIZES = [{ w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }];
const SAMPLE = join(REPO, "app", "public", "sample-customer-import.csv");
const CHECK_ID = (LIVE ? "customer-import-flow-live" : "customer-import-flow") + (BREAK ? "-" + BREAK : "");
const ART_REL = `artifacts/${CHECK_ID}${BREAK ? "-sabotage" : ""}`;
const ART = join(REPO, ART_REL);
const SHOTS = "C:/Users/rando/Downloads/claude/control-room/belt/shots/97.40";
const FREEZE = ARGV.includes("--freeze") && !LIVE;
const DEV_REF = "kguqylyzgyzfktkfnhjb";
const DEMO_SLUG = "demo-detail";

// The screen's sentences, filled from the SAME templates the product keys:
// scripts/label-guard.mjs holds a check's labels against the product's wording.
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k]));
const VALID = ["Marcus Webb", "Priya Nair", "Tom Becker", "Ana Ruiz", "Sam Okafor", "June Park", "Leo Marsh",
  "Nina Fox", "Omar Haddad", "Kate Lin", "Ben Cole", "Mia Tran", "Alex Reed", "Zoe Allen", "Dan Kim", "Eve Shaw", "Gil Hahn"];
const NAMED_ROWS = ["Row 19: No Phone - Missing phone", "Row 20: Tom Twin - Duplicate in this file",
  "Row 21: Zoe Copy - Duplicate in this file"];
const SAMPLE_PHONES = [...new Set(readFileSync(SAMPLE, "utf8").split(/\r?\n/).slice(1).map((l) => l.split(",")[1]).filter(Boolean))];
const FIXTURE_PHONE = "5550009999", INTRUDER_PHONE = "5550001234";
// Every phone this run can put in the table. --live refuses to start if any
// customer already carries one, so afterwards every row carrying one is ours.
const RUN_PHONES = [...SAMPLE_PHONES, FIXTURE_PHONE, INTRUDER_PHONE];

// The real handler, or the same file with one production line removed (in memory).
const RULES_URL = pathToFileURL(join(REPO, "supabase", "functions", "_shared", "importRules.ts")).href;
const MUTATIONS = {
  "no-guard": ['.eq("is_test", false)', ""],
  "no-member": ['if (!member) return json({ error: "not_found" }, 404);', ""],
};
const loadRules = async (mutation) => {
  if (!mutation) return import(RULES_URL);
  const src = readFileSync(new URL(RULES_URL), "utf8");
  const [from, to] = MUTATIONS[mutation];
  if (!src.includes(from)) throw new Error(`${mutation} mutation did not apply: the line is not in importRules.ts`);
  return import("data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(src.replace(from, to))).toString("base64"));
};
const realRules = await loadRules(null);
const rules = MUTATIONS[BREAK] ? await loadRules(BREAK) : realRules;

// In-memory customers table: only the chained calls importRules.ts makes.
class Q {
  constructor(db, table) { Object.assign(this, { db, table, f: [], below: null, ord: null, lo: 0, hi: Infinity, mode: "select", rows: null }); }
  select() { if (this.mode === "delete") this.mode = "del"; return this; }
  delete() { this.mode = "delete"; return this; }
  insert(rows) { this.mode = "insert"; this.rows = rows; return this; }
  eq(c, v) { this.f.push([c, v]); return this; }
  lt(c, v) { this.below = [c, v]; return this; }
  order(c) { this.ord = c; return this; }
  range(lo, hi) { this.lo = lo; this.hi = hi; return this; }
  then(ok, no) {
    try {
      const hit = (r) => this.f.every(([c, v]) => r[c] === v) && (!this.below || r[this.below[0]] < this.below[1]);
      if (this.table === "customer_import_locks") {
        // One claim per business, as the primary key enforces: a second answers 23505.
        if (this.mode === "insert") {
          if (this.db.locks.some((l) => l.business_id === this.rows.business_id)) return ok({ data: null, error: { code: "23505" } });
          this.db.locks.push({ locked_at: new Date().toISOString(), ...this.rows });
          return ok({ data: null, error: null });
        }
        this.db.locks = this.db.locks.filter((l) => !hit(l));
        return ok({ data: [], error: null });
      }
      if (this.mode === "insert") {
        for (const r of this.rows) this.db.rows.push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), is_test: false, imported: false, ...r });
        return ok({ data: null, error: null });
      }
      if (this.mode !== "select") {
        const gone = this.db.rows.filter(hit);
        this.db.rows = this.db.rows.filter((r) => !gone.includes(r));
        return ok({ data: gone.map((r) => ({ id: r.id })), error: null });
      }
      let out = this.db.rows.filter(hit);
      if (this.ord) out = [...out].sort((a, b) => (a[this.ord] < b[this.ord] ? -1 : 1));
      return ok({ data: out.slice(this.lo, this.hi + 1), error: null });
    } catch (e) { return no(e); }
  }
}
const makeDb = (rows = []) => {
  const db = { rows: [...rows], locks: [] };
  db.from = (t) => { if (!["customers", "customer_import_locks"].includes(t)) throw new Error("table " + t); return new Q(db, t); };
  return db;
};
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });
const preflight = () => new Response(null, { status: 204, headers: CORS });
const jwtSub = (token) => { try { return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub || null; } catch { return null; } };

const failures = [], observed = [];
let assertions = 0;
const ok = (cond, id, detail) => {
  assertions += 1;
  observed.push({ id, ok: !!cond, detail });
  if (!cond) failures.push(`${id} - ${detail}`);
  console.log(`${cond ? "  ok  " : "  FAIL"} ${id} - ${detail}`);
};

// CANARY, every run: undo with the fixture guard removed must take the fixture.
const canary = await (async () => {
  const broken = await loadRules("no-guard");
  const db = makeDb([{ id: "fx", business_id: "b", imported: true, import_batch_id: "batch", is_test: true },
    { id: "r1", business_id: "b", imported: true, import_batch_id: "batch", is_test: false }]);
  const { removed } = await broken.undoImportBatch(db, "b", "batch");
  return { id: "no-guard-undo-takes-the-fixture", observed_failure: removed === 2 && !db.rows.some((r) => r.id === "fx"),
    detail: `guard removed: undo removed ${removed} of 2, fixture ${db.rows.some((r) => r.id === "fx") ? "survived" : "deleted"}` };
})();
console.log(`canary ${canary.id}: ${canary.detail}`);

const PER_WIDTH = LIVE ? 26 : 27; // live has no beyond-the-list question; both modes check their cleanup
const EXPECTED_ASSERTIONS = SIZES.length * PER_WIDTH;

// LIVE ONLY: the service client, the verified demo target, and no leftovers.
let svc = null, LIVE_BIZ = null;
async function liveTarget(ownerSub) {
  const url = process.env.SUPABASE_URL || "";
  if (!url.includes(DEV_REF)) throw new Error(`SUPABASE_URL is not project ${DEV_REF}; --live refuses to run anywhere else`);
  const { createClient } = req("../app/node_modules/@supabase/supabase-js");
  svc = createClient(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: biz, error } = await svc.from("businesses").select("id, slug").eq("slug", DEMO_SLUG).maybeSingle();
  if (error || !biz) throw new Error(`could not find the ${DEMO_SLUG} business: ${error?.message || "no row"}`);
  const { data: mem, error: memErr } = await svc.from("business_users").select("user_id").eq("business_id", biz.id).eq("user_id", ownerSub);
  if (!mem?.length) throw new Error(`the signed-in demo owner (user ${String(ownerSub).slice(0, 8)}) is not a member of ${DEMO_SLUG}${memErr ? ": " + memErr.message : ""}`);
  const probe = await svc.from("customers").select("id").limit(1).eq("imported", true);
  if (probe.error) throw new Error(`NOT LIVE YET: customers.imported does not answer (${probe.error.message}); apply 20261125130000_customer_import_flag.sql first`);
  const runKeys = new Set(RUN_PHONES.map(realRules.normPhone));
  const { data: all, error: allErr } = await svc.from("customers").select("id, name, phone").eq("business_id", biz.id);
  if (allErr) throw new Error(`could not read ${DEMO_SLUG}'s customers: ${allErr.message}`);
  const left = all.filter((r) => runKeys.has(realRules.normPhone(r.phone)));
  if (left?.length) throw new Error(`${left.length} customer(s) on ${DEMO_SLUG} already carry a sample phone (${left.map((r) => r.name).join(", ")}): an earlier run left them; remove them before re-running`);
  LIVE_BIZ = biz.id;
}

async function signIn(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const backends = new Set();
  page.on("request", (r) => { if (/\/(auth|rest)\/v1\//.test(r.url())) backends.add(new URL(r.url()).host); });
  await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", demoOwner().email);
    await page.fill("input[type=password]", demoOwner().password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
  const state = await ctx.storageState();
  await ctx.close();
  const auth = state.origins.flatMap((o) => o.localStorage).find((i) => /auth-token$/.test(i.name));
  const sub = auth ? jwtSub(JSON.parse(auth.value).access_token || "") : null;
  if (!sub) throw new Error("signed in, but no session token was found in the browser's storage");
  // --live must be measuring the real project through the page itself, not a
  // dev server wired to a local stand-in backend (the belt's job servers are).
  if (LIVE && ![...backends].some((h) => h.startsWith(DEV_REF + "."))) throw new Error(`the page at ${BASE} talks to ${[...backends].join(", ") || "no backend"}, not project ${DEV_REF}; run --live against a dev server on the real project`);
  return { state, sub };
}

async function runWidth(browser, { state, sub }, size, completed) {
  const tag = `${size.w}`;
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, storageState: state, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleIssues = [];
  let forging = false;
  page.on("console", (m) => {
    if (!["error", "warning"].includes(m.type())) return;
    if (forging && /status of (401|404)/.test(m.text())) return; // the forged request below, refused on purpose
    consoleIssues.push(`${m.type()}: ${m.text().slice(0, 160)}`);
  });
  page.on("pageerror", (e) => consoleIssues.push("pageerror: " + e.message.slice(0, 160)));

  let db = null, bizId = LIVE ? LIVE_BIZ : null, fnUrl = LIVE ? `${process.env.SUPABASE_URL}/functions/v1/import-customers` : null;
  const calls = [];
  page.on("request", (r) => {
    if (!/\/functions\/v1\/import-customers/.test(r.url()) || r.method() !== "POST" || forging) return;
    calls.push({ action: (r.postDataJSON() || {}).action, signed: jwtSub((r.headers()["authorization"] || "").replace(/^Bearer\s+/i, "")) === sub });
  });
  if (!LIVE) {
    await page.route(/\/rest\/v1\/customers\?/, async (route) => {
      const u = new URL(route.request().url());
      const biz = (u.searchParams.get("business_id") || "").replace(/^eq\./, "");
      const isListRead = route.request().method() === "GET" && u.searchParams.get("select") === "*" && biz
        && u.searchParams.get("order") === "created_at.desc" && !u.searchParams.has("or");
      if (!isListRead) return route.continue();
      if (!db) { db = makeDb(await (await route.fetch()).json()); bizId = biz; }
      // `_beyondList` rows exist in the table but sit past the screen's 200-row read.
      const rows = db.rows.filter((r) => r.business_id === biz && !r._beyondList).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, Number(u.searchParams.get("limit") || 200));
      return route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(rows) });
    });
    await page.route(/\/functions\/v1\/import-customers/, async (route) => {
      const r = route.request();
      fnUrl = r.url();
      if (!db) return route.fulfill({ status: 503, headers: CORS, body: "list not read yet" });
      const body = r.postData() || "";
      // --break=list-only-preview: the old behavior, judging against the loaded list only.
      if (BREAK === "list-only-preview" && r.method() === "POST" && (JSON.parse(body || "{}").action === "preview")) {
        const keys = new Set(db.rows.filter((x) => !x._beyondList).flatMap((x) => [`p:${realRules.normPhone(x.phone)}`, `e:${realRules.normEmail(x.email)}`]));
        const res = realRules.classify(JSON.parse(body).rows, keys);
        return route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify({ ...res, total: JSON.parse(body).rows.length }) });
      }
      const res = await rules.handleImportRequest(new Request(r.url(), { method: r.method(), headers: r.headers(), body: r.method() === "POST" ? body : undefined }), {
        db, json, preflight,
        // Stand-in for `requireMember`: ONLY the signed-in owner's session, for the owner's business.
        requireMember: async (rq, businessId) => {
          const tok = (rq.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
          return jwtSub(tok) === sub && businessId === bizId ? { userId: sub } : null;
        },
      });
      // --break=lose-save-response: the save happens, its answer never arrives.
      if (BREAK === "lose-save-response" && JSON.parse(body || "{}").action === "commit") { await res.text(); return route.fulfill({ status: 502, headers: CORS, body: "answer lost on purpose" }); }
      return route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: await res.text() });
    });
  } else if (BREAK === "lose-save-response") {
    await page.route(/\/functions\/v1\/import-customers/, async (route) => {
      if ((route.request().postDataJSON() || {}).action !== "commit") return route.continue();
      await (await route.fetch()).text(); // the deployed function saves; the page never hears back
      return route.fulfill({ status: 502, headers: CORS, body: "answer lost on purpose" });
    });
  }
  const rowsNow = async () => {
    if (!LIVE) return (db?.rows || []).filter((r) => r.business_id === bizId);
    const { data, error } = await svc.from("customers").select("id, name, phone, imported, import_batch_id, is_test, business_id").eq("business_id", bizId);
    if (error) throw error;
    return data;
  };

  let batch = null;
  try {
    await page.goto(BASE + "/app/clients", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Clients" }).waitFor({ timeout: 30000 });
    const countText = async () => (await page.locator("h1.display + p.quiet").first().innerText()).trim();
    const countOf = async () => Number((/(\d+)\s+people/.exec(await countText()) || [])[1] ?? NaN);
    await page.waitForLoadState("networkidle").catch(() => {}); // "Nobody yet" is also the pre-load text
    await page.waitForFunction(() => /\d+ people|1 person|Nobody yet/.test(document.querySelector("h1.display + p.quiet")?.textContent || ""), null, { timeout: 30000 });
    const before = await countOf();
    const beforeRows = await rowsNow();
    const beforeIds = new Set(beforeRows.map((r) => r.id));
    ok(bizId && Number.isFinite(before) && beforeRows.length > 0, `${tag}-list-read`, `${LIVE ? "live" : "stand-in"} customers of the owner's business: ${beforeRows.length}, masthead "${await countText()}"`);
    const listCounts = async () => Object.fromEntries(await Promise.all(VALID.map(async (n) => [n, await page.getByText(n, { exact: true }).count()])));
    const baseline = await listCounts();
    // Rows fade in as they scroll into view, and a full-page picture never
    // scrolls, so walk the page once before every picture.
    const revealAll = () => page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); }
      await new Promise((r) => setTimeout(r, 600));
      scrollTo(0, 0);
    });
    const pickSample = async () => {
      const [chooser] = await Promise.all([page.waitForEvent("filechooser", { timeout: 10000 }),
        page.getByRole("button", { name: "Import customers" }).click()]);
      await chooser.setFiles(SAMPLE);
    };
    // PAINTED, not merely in the page (a DOM count passes for hidden text):
    // scrolled to the middle of the window, fully opaque up its ancestor chain
    // once any fade-in settles, and the topmost element where its text starts.
    const painted = (loc) => loc.first().evaluate(async (el) => {
      el.scrollIntoView({ block: "center" });
      for (const t0 = Date.now(); ;) {
        const r = el.getBoundingClientRect();
        let o = 1;
        for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); o *= s.visibility === "hidden" || s.display === "none" ? 0 : +s.opacity; }
        const top = document.elementFromPoint(r.x + Math.min(r.width / 2, 12), r.y + r.height / 2);
        const why = r.width < 1 || r.height < 1 ? "no size" : o < 0.99 ? `opacity ${o.toFixed(2)}`
          : !(top && (top === el || el.contains(top))) ? `covered by ${top ? top.tagName.toLowerCase() + "." + top.className : "nothing"}` : "";
        if (!why || Date.now() - t0 > 2500) return why;
        await new Promise((res) => setTimeout(res, 100));
      }
    }, null, { timeout: 5000 }).catch((e) => "not found: " + e.message.split("\n")[0]);
    // PRESSABLE: enabled, and the button itself answers 22px above and below its
    // centre as well as at it - 44px of real hit area, an ::after inset counting.
    const pressable = (loc) => loc.first().evaluate(async (el) => {
      el.scrollIntoView({ block: "center" });
      await new Promise((res) => setTimeout(res, 400));
      const r = el.getBoundingClientRect(), cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      const misses = [-21.5, 0, 21.5].filter((dy) => { const t = document.elementFromPoint(cx, cy + dy); return !(t && (t === el || el.contains(t))); });
      return el.disabled ? "disabled" : misses.length ? `not pressed at ${misses.join(", ")}px from its centre (box ${Math.round(r.height)}px tall)` : "";
    }, null, { timeout: 5000 }).catch((e) => "not found: " + e.message.split("\n")[0]);
    // --break=no-hit-area: the small buttons lose the ::after that makes 38px press as 48px.
    if (BREAK === "no-hit-area") await page.addStyleTag({ content: "button.btn.sm::after { content: none !important; }" });
    const importWhy = await pressable(page.getByRole("button", { name: "Import customers" }));
    ok(!importWhy, `${tag}-import-pressable`, importWhy || "Import customers answers across 44px");

    // Press "Import customers" and choose the sample in the real file chooser.
    await pickSample();
    const summary = page.getByText(fill("{picked}: {count} new, {dups} duplicates, {bad} need fixing",
      { picked: "sample-customer-import.csv", count: 17, dups: 2, bad: 1 }));
    const summaryShown = await summary.waitFor({ timeout: 15000 }).then(() => true, () => false);
    // --break=faded-preview: every preview row stays in the page but paints nothing,
    // which is exactly what a DOM count cannot tell from a shown row.
    if (BREAK === "faded-preview") await page.evaluate((starts) => { for (const p of document.querySelectorAll("p")) if (starts.some((s) => p.textContent.startsWith(s))) p.style.opacity = "0"; },
      [...VALID.map((n) => n + " · "), ...NAMED_ROWS]);
    const summaryWhy = summaryShown ? await painted(summary) : "never appeared";
    ok(!summaryWhy, `${tag}-preview-summary`, summaryWhy ? `preview summary not painted: ${summaryWhy}` : "preview says 17 new, 2 duplicates, 1 need fixing, painted on screen");
    const missingNew = [];
    for (const n of VALID) { const why = await painted(page.getByText(new RegExp(`^${n} · `))); if (why) missingNew.push(`${n} (${why})`); }
    ok(missingNew.length === 0, `${tag}-preview-names-17`, missingNew.length ? `not painted: ${missingNew.join(", ")}` : "all 17 new customers painted by name and phone");
    const missingRows = [];
    for (const r of NAMED_ROWS) { const why = await painted(page.getByText(r, { exact: true })); if (why) missingRows.push(`${r} (${why})`); }
    ok(missingRows.length === 0, `${tag}-preview-names-dups-and-bad`, missingRows.length ? `not painted: ${missingRows.join(" | ")}` : NAMED_ROWS.join(" | ") + ", each painted");
    ok(calls.length === 1 && calls[0].action === "preview" && calls[0].signed, `${tag}-preview-asked-server`,
      `calls so far: ${calls.map((c) => c.action + (c.signed ? "+owner-session" : "-not-owner")).join(", ") || "none"}`);
    const saveBtn = page.getByRole("button", { name: fill("Save {count} customers", { count: 17 }) });
    const saveWhy = await pressable(saveBtn);
    ok(!saveWhy, `${tag}-save-button`, saveWhy ? `Save 17 customers: ${saveWhy}` : "Save 17 customers answers across 44px");
    const cancelWhy = await pressable(page.getByRole("button", { name: "Cancel" }));
    ok(!cancelWhy, `${tag}-cancel-pressable`, cancelWhy ? `Cancel: ${cancelWhy}` : "Cancel answers across 44px");
    const sb = await saveBtn.boundingBox(), cb = await page.getByRole("button", { name: "Cancel" }).boundingBox();
    ok(sb && cb && Math.abs(sb.x - cb.x) < 1 && Math.abs(sb.x + sb.width - (cb.x + cb.width)) < 1 && cb.y >= sb.y + sb.height,
      `${tag}-save-cancel-aligned`, sb && cb ? `Save ${Math.round(sb.x)}-${Math.round(sb.x + sb.width)}, Cancel ${Math.round(cb.x)}-${Math.round(cb.x + cb.width)} below it` : "a button was not found");
    ok((await rowsNow()).length === beforeIds.size, `${tag}-preview-saves-nothing`, `rows before Save: ${(await rowsNow()).length} (was ${beforeIds.size})`);
    await revealAll();
    await page.evaluate(() => window.scrollTo(0, 0));
    // fullPage is safe here: scrolled to the top first, where full-page and viewport frames agree (tests/fullpage-frames-lie.test.mjs 1e).
    await page.screenshot({ path: join(ART, `${tag}-1-preview.png`), fullPage: true });
    if (FREEZE && size.w === 390) {
      const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/control-room/belt/freeze.mjs");
      await freeze(page, { out: `${SHOTS}/after.html`, label: "After",
        note: "Clients now has Import customers. The sample file previews before anything is saved: 17 new customers named, 2 duplicates and 1 row needing a fix, each by row.",
        highlightText: "17 new, 2 duplicates, 1 need fixing" });
    }

    const commitRes = page.waitForResponse((r) => /\/functions\/v1\/import-customers/.test(r.url()) && (r.request().postDataJSON() || {}).action === "commit", { timeout: 20000 });
    await saveBtn.click();
    batch = (await (await commitRes).json().catch(() => ({}))).batch_id || null;
    if (BREAK === "lose-save-response") throw new Error("the save's answer was lost on purpose; cleanup must still find what it saved");
    const saved = await page.getByText(fill("Saved {count} customers", { count: 17 })).waitFor({ timeout: 15000 }).then(() => true, () => false);
    ok(saved, `${tag}-saved-message`, saved ? "Saved 17 customers" : "no 'Saved 17 customers' message");
    const added = (await rowsNow()).filter((r) => !beforeIds.has(r.id));
    const batches = new Set(added.map((r) => r.import_batch_id));
    ok(added.length === 17 && added.every((r) => r.imported === true && r.is_test === false) && batches.size === 1 && batches.has(batch),
      `${tag}-stored-17-flagged-one-batch`, `${added.length} stored, ${added.filter((r) => r.imported === true).length} flagged imported, ${batches.size} batch id(s), matches the answer: ${batches.has(batch)}`);
    ok(VALID.every((n) => added.some((r) => r.name === n)) && !added.some((r) => ["Tom Twin", "Zoe Copy", "No Phone"].includes(r.name)),
      `${tag}-stored-the-right-17`, "the 17 named rows, none of Tom Twin / Zoe Copy / No Phone");
    const undoBtn = page.getByRole("button", { name: "Undo this import" });
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Undo this import" && !b.disabled), null, { timeout: 15000 }).catch(() => {}); // busy until the list reloads
    const undoWhy = await pressable(undoBtn);
    ok(!undoWhy, `${tag}-undo-button`, undoWhy ? `Undo this import: ${undoWhy}` : "Undo this import answers across 44px after Save");
    await page.waitForFunction((n) => (document.querySelector("h1.display + p.quiet")?.textContent || "").includes(`${n} people`), before + 17, { timeout: 15000 }).catch(() => {});
    const afterSave = await countOf();
    ok(afterSave === before + 17, `${tag}-count-up-17`, `masthead ${before} -> ${afterSave}`);
    const savedCounts = await listCounts();
    const notListed = VALID.filter((n) => savedCounts[n] !== baseline[n] + 1);
    ok(notListed.length === 0, `${tag}-list-shows-17`, notListed.length ? `not one more row after Save: ${notListed.join(", ")}` : "each of the 17 names has one more row in the list");
    await revealAll();
    await page.evaluate(() => window.scrollTo(0, 0));
    // fullPage is safe here: scrolled to the top first, where full-page and viewport frames agree (tests/fullpage-frames-lie.test.mjs 1e).
    await page.screenshot({ path: join(ART, `${tag}-2-saved.png`), fullPage: true });
    if (FREEZE && size.w === 390) {
      const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/control-room/belt/freeze.mjs");
      await freeze(page, { out: `${SHOTS}/after-saved.html`, label: "After",
        note: "After Save: 17 customers added and the count went up by 17. Undo this import takes back exactly that batch.",
        highlight: "button:has-text('Undo this import')" });
    }

    // A flagged test fixture planted IN THE SAME BATCH: Undo must leave it.
    const fixture = { business_id: bizId, name: "Fixture Same Batch", phone: FIXTURE_PHONE, email: null,
      imported: true, import_batch_id: batch, is_test: true };
    let fixtureId = null;
    if (LIVE) {
      const { data, error } = await svc.from("customers").insert(fixture).select("id").single();
      if (error) throw new Error("could not plant the fixture: " + error.message);
      fixtureId = data.id;
    } else {
      fixtureId = "fixture-same-batch-" + tag;
      db.rows.push({ id: fixtureId, created_at: new Date(0).toISOString(), ...fixture });
    }
    if (BREAK !== "skip-undo") await undoBtn.click();
    const undoneText = await page.getByText(/Import undone - \d+ removed/).first().textContent({ timeout: 15000 }).catch(() => "");
    ok(undoneText.trim() === "Import undone - 17 removed", `${tag}-undo-message`, `"${undoneText.trim() || "(no undo message)"}"`);
    const leftover = (await rowsNow()).filter((r) => !beforeIds.has(r.id));
    ok(leftover.length === 1 && leftover[0].id === fixtureId, `${tag}-fixture-survives`,
      `rows left beyond the original list: ${leftover.length > 3 ? `${leftover.length} rows` : leftover.map((r) => r.name).join(", ") || "none (the fixture was deleted)"}`);
    const nowIds = new Set((await rowsNow()).map((r) => r.id));
    ok([...beforeIds].every((id) => nowIds.has(id)), `${tag}-originals-survive`, `all ${beforeIds.size} customers that were there before are still there`);
    await page.waitForFunction((n) => (document.querySelector("h1.display + p.quiet")?.textContent || "").includes(`${n} people`), before, { timeout: 15000 }).catch(() => {});
    const afterUndo = await countOf();
    ok(afterUndo === before, `${tag}-count-back`, `masthead ${afterSave} -> ${afterUndo} (fixtures are hidden by default)`);
    ok(!(await undoBtn.isVisible().catch(() => false)), `${tag}-undo-gone`, "Undo button gone after the batch was undone");
    const undoneCounts = await listCounts();
    const stillListed = VALID.filter((n) => undoneCounts[n] !== baseline[n]);
    ok(stillListed.length === 0, `${tag}-list-back`, stillListed.length ? `row count not back after Undo: ${stillListed.join(", ")}` : "the list is back to its own rows for all 17 names");
    await revealAll();
    await page.evaluate(() => window.scrollTo(0, 0));
    // fullPage is safe here: scrolled to the top first, where full-page and viewport frames agree (tests/fullpage-frames-lie.test.mjs 1e).
    await page.screenshot({ path: join(ART, `${tag}-3-undone.png`), fullPage: true });

    // A forged session asking to write into the owner's business is refused, with nothing written.
    const rowsBeforeForge = (await rowsNow()).length;
    forging = true;
    const forged = await page.evaluate(async ({ url, biz, anon, phone }) => {
      // Built at run time: a token-shaped literal in source trips the credential scan.
      const part = (o) => btoa(JSON.stringify(o)).replace(/=+$/, "");
      const headers = { "content-type": "application/json", Authorization: `Bearer ${part({ alg: "HS256" })}.${part({ sub: "forged" })}.forged` };
      if (anon) headers.apikey = anon;
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify({ action: "commit", business_id: biz, rows: [{ name: "Intruder", phone }] }) });
      return r.status;
    }, { url: fnUrl, biz: bizId, phone: INTRUDER_PHONE, anon: LIVE ? process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY : null });
    await page.waitForTimeout(400); // the refusal's console line arrives after the fetch resolves
    forging = false;
    const rowsAfterForge = await rowsNow();
    ok([401, 404].includes(forged) && rowsAfterForge.length === rowsBeforeForge && !rowsAfterForge.some((r) => r.name === "Intruder"),
      `${tag}-forged-session-refused`, `forged session answered ${forged}; rows ${rowsBeforeForge} -> ${rowsAfterForge.length}`);

    if (!LIVE) {
      // A customer the screen's list never loads (past its 200-row read) sharing
      // Gil Hahn's phone: the preview must still name him, from the server.
      db.rows.push({ id: "beyond-list-" + tag, business_id: bizId, name: "Gil Hahn (older record)", phone: "555-0116", email: null,
        imported: false, import_batch_id: null, is_test: false, created_at: new Date(0).toISOString(), _beyondList: true });
      await pickSample();
      const beyondRow = fill("Row {row}: {name} - {reason}", { row: 18, name: "Gil Hahn", reason: "Already a customer" });
      const beyond = await page.getByText(beyondRow, { exact: true }).waitFor({ timeout: 15000 }).then(() => true, () => false);
      const beyondSummary = await page.getByText(fill("{picked}: {count} new, {dups} duplicates, {bad} need fixing",
        { picked: "sample-customer-import.csv", count: 16, dups: 3, bad: 1 })).count();
      ok(beyond && beyondSummary === 1, `${tag}-beyond-list-twin-named`,
        beyond ? `a match outside the loaded list is named: ${beyondRow} (16 new, 3 duplicates)` : "Gil Hahn was offered as new although a customer outside the loaded list has his phone");
      await page.getByRole("button", { name: "Cancel" }).click();
      db.rows = db.rows.filter((r) => !r._beyondList);
    }
    ok(calls.filter((c) => c.action !== "preview").length === 2 && calls.every((c) => c.signed),
      `${tag}-calls-signed`, `the page's own calls: ${calls.map((c) => c.action + (c.signed ? "+owner-session" : "-not-owner")).join(", ")}`);
    ok(consoleIssues.length === 0, `${tag}-console`, consoleIssues.length ? consoleIssues.join(" | ") : "no console errors or warnings");
  } finally {
    // Cleanup runs whatever happened, in both modes, and is itself checked. It
    // never needs the save's answer: this run's rows are found by the phones only
    // it uses (RUN_PHONES), and every batch they carry goes with them.
    try {
      const runKeys = new Set(RUN_PHONES.map(realRules.normPhone));
      const isOurs = (r) => runKeys.has(realRules.normPhone(r.phone));
      const mine = (await rowsNow()).filter(isOurs);
      const batches = [...new Set(mine.map((r) => r.import_batch_id).filter(Boolean))];
      const isRun = (r) => isOurs(r) || batches.includes(r.import_batch_id);
      if (LIVE) {
        for (const b of batches) await svc.from("customers").delete().eq("business_id", bizId).eq("import_batch_id", b);
        if (mine.length) await svc.from("customers").delete().eq("business_id", bizId).in("id", mine.map((r) => r.id));
      } else if (db) db.rows = db.rows.filter((r) => !(r.business_id === bizId && isRun(r)));
      const left = (await rowsNow()).filter(isRun);
      ok(left.length === 0, `${tag}-cleanup`, `found ${mine.length} row(s) of this run in ${batches.length} batch(es)` +
        `${batch ? "" : ", without the save's answer"}; ${left.length} remain`);
    } catch (e) { ok(false, `${tag}-cleanup`, "cleanup failed: " + e.message.split("\n")[0]); }
    await ctx.close();
  }
  completed.push(tag);
}

async function run() {
  rmSync(ART, { recursive: true, force: true });
  mkdirSync(ART, { recursive: true });
  const started = new Date().toISOString();
  const browser = await chromium.launch();
  const completed = [];
  try {
    const owner = await signIn(browser);
    if (LIVE) await liveTarget(owner.sub);
    for (const s of SIZES) {
      console.log(`\n${s.w}x${s.h}`);
      try { await runWidth(browser, owner, s, completed); } catch (e) { ok(false, `${s.w}-ran`, "width aborted: " + e.message.split("\n")[0]); }
    }
  } finally { await browser.close(); }
  if (!BREAK && !LIVE) {
    mkdirSync(join(SHOTS, "png"), { recursive: true });
    for (const s of SIZES) for (const f of ["1-preview", "2-saved", "3-undone"]) {
      try { copyFileSync(join(ART, `${s.w}-${f}.png`), join(SHOTS, "png", `${s.w}-${f}.png`)); } catch {}
    }
  }
  const status = failures.length || assertions !== EXPECTED_ASSERTIONS || !canary.observed_failure ? "fail" : "pass";
  const { path } = writeReceipt({
    check_id: CHECK_ID,
    started_at: started,
    status,
    expected_targets: SIZES.length,
    discovered_targets: SIZES.length,
    attempted_targets: SIZES.length,
    completed_targets: completed.length,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: EXPECTED_ASSERTIONS,
    assertion_floor: `${SIZES.length} widths x ${PER_WIDTH} questions; fixed by the question list, asserted as an equality.`,
    failures,
    warnings: [LIVE
      ? `LIVE: the deployed import-customers function, live columns and row-level security on ${DEMO_SLUG} (${DEV_REF}); the fixture was planted and each batch removed with the service key.`
      : "STAND-IN: the import-customers function is NOT deployed and its migration is NOT applied (Andrew's publish). The browser's preview, Save "
        + "and Undo are answered in this script by the REAL handleImportRequest (importRules.ts) against an in-memory customers table seeded from the list "
        + "the page's own backend returned, with a membership stand-in accepting only the signed-in owner's session; nothing is written to any database. Live "
        + "function, live columns and live row-level security are proved only by --live after the publish."],
    artifacts: SIZES.flatMap((s) => ["1-preview", "2-saved", "3-undone"].map((f) => `${ART_REL}/${s.w}-${f}.png`))
      .filter((rel) => { try { return readFileSync(join(REPO, rel)).length > 0; } catch { return false; } }),
    dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), base: BASE, mode: LIVE ? "live" : "stand-in", sample: "app/public/sample-customer-import.csv", item: "97.40", break: BREAK },
    canary,
    observed,
  });
  console.log(`receipt: ${path}`);
  console.log(`\n${status.toUpperCase()} - ${assertions} of ${EXPECTED_ASSERTIONS} assertions, ${failures.length} failed, ${completed.length} of ${SIZES.length} widths completed`);
  process.exit(status === "pass" ? 0 : 1);
}

run().catch((e) => { console.error(e.message || e); console.error("NOTHING WAS MEASURED. This is not a pass."); process.exit(2); });
