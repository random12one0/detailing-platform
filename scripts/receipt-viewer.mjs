// ROADMAP 9.20 — CAN A DETAILER SEE, OPEN AND REMOVE A RECEIPT, AND DOES THE
// ALLOWANCE REALLY GIVE THE SPACE BACK?
//
//   set -a; . ./.env; set +a
//   node scripts/receipt-viewer.mjs                  # dev server + DEMO_OWNER_PW
//   node scripts/receipt-viewer.mjs --break=orphan   # sabotage: the file delete never reaches storage
//   node scripts/receipt-viewer.mjs --break=nosign   # sabotage: the one signing request is refused
//   node scripts/receipt-viewer.mjs --break=gate     # sabotage: the "no settings permission" member keeps it
//   node scripts/receipt-viewer.mjs --break=keep     # sabotage: the refusal arrives reworded, so "as written" must go red
//
// WHAT IT WRITES, SAID BEFORE IT WRITES IT: per pass, three expenses on the demo
// tenant (`demo-detail`, project kguqylyzgyzfktkfnhjb) described
// `9.20 check <run>`, two with a real JPEG in `expense-receipts`, written AS THE
// OWNER through the same RLS the app uses. Every row and object it made is
// deleted again at the end — in `finally` AND on SIGINT/SIGTERM, because a
// `finally` does not run on a signal (`docs/gotchas.md` 90).
//
// Per pass (width x language) it asks: both receipts draw a thumbnail and the
// expense with none draws NOTHING; every thumbnail is a signed URL, never a key
// built in the browser; the list's URLs came in ONE request carrying both keys;
// the thumbnail and Remove each press as 44px by hit test; the full image really
// loads; Remove deletes the object AND clears the five columns AND moves the
// allowance down by exactly that file's bytes (read as the owner before and
// after); a member without the settings permission is not offered Remove; a
// server refusal is shown as the server wrote it, with nothing removed; and the
// console is clean. One canary runs every time: the grader is handed a hand-
// built URL, two signing requests and a 34px target and must fail all three.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { writeReceipt, REPO } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";
import "../tests/_env.mjs";

const req = createRequire(import.meta.url);
const { chromium } = req("./../app/node_modules/playwright/index.js");
const { createClient } = req("../app/node_modules/@supabase/supabase-js");

const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || process.env.BREAK || "";
const BASE = process.env.BASE || "http://localhost:5173";
const URL_ = process.env.SUPABASE_URL;
if (!URL_?.includes("kguqylyzgyzfktkfnhjb")) { console.error("not this platform's project — refusing"); process.exit(1); }
const OWNER = demoOwner();
const PASSES = [
  { w: 1440, h: 900, lang: "en" }, { w: 392, h: 844, lang: "en" },
  { w: 392, h: 844, lang: "es" }, { w: 320, h: 844, lang: "es" },
];
const PER_PASS = 16;
const ART = "artifacts/receipt-viewer";
mkdirSync(path.join(REPO, ART), { recursive: true });
const BUCKET = "expense-receipts";
const JPEG = readFileSync(path.join(REPO, "app/public/img/tenant-site-hero.jpg"));
// The door's own sentence (`_shared/photoDoor.ts`), which is what a refusal says.
const REFUSAL = "Removing a receipt needs the settings permission.";
const WORDS = {
  en: { open: "Open the receipt", remove: "Remove the receipt", yes: "Yes, remove it" },
  es: { open: "Abrir el recibo", remove: "Quitar el recibo", yes: "Sí, quitarlo" },
};

let assertions = 0;
const failures = [];
const artifacts = [];
const noise = [];
const check = (label, name, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${label} ${name}${detail ? " — " + detail : ""}`);
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label} ${name}${detail ? " — " + detail : ""}`);
};

// ── the graders, separate so the canary can be aimed at them ──────────────
const SIGNED = /\/storage\/v1\/object\/sign\/expense-receipts\/.+[?&]token=/;
export function gradeList(label, r, keys) {
  check(label, "list/both-thumbnails", r.thumbs.length === 2, `${r.thumbs.length} of 2 drawn`);
  check(label, "list/empty-case-draws-nothing", r.bare.found && r.bare.extra === 0,
    r.bare.found ? `${r.bare.extra} extra elements in the row` : "the receipt-less row is not on the screen");
  check(label, "list/signed-not-built", r.thumbs.length > 0 && r.thumbs.every((t) => SIGNED.test(t.src)),
    r.thumbs.map((t) => t.src.slice(0, 90)).join(" | ") || "nothing to read");
  // ONE PER READ OF THE LIST, NEVER ONE PER ROW. The dev build mounts the
  // screen twice (React StrictMode), so the list is read twice and signed
  // twice; what must hold is that every read of it costs exactly one signing
  // request and that request carries every key. One per row, with two rows on
  // screen, is twice as many requests as reads.
  check(label, "list/one-request-for-the-list",
    r.listReads > 0 && r.signReqs.length === r.listReads && r.signReqs.every((b) => keys.every((k) => b.includes(k))),
    `${r.signReqs.length} signing request(s) for ${r.listReads} read(s) of the list`);
  check(label, "list/thumbnail-painted", r.thumbs.length > 0 && r.thumbs.every((t) => t.natural > 0), r.thumbs.map((t) => t.natural).join(","));
  check(label, "list/thumbnail-hit-44", r.thumbs.length > 0 && r.thumbs.every((t) => t.hit.w >= 44 && t.hit.h >= 44),
    r.thumbs.map((t) => `${t.hit.w}x${t.hit.h}`).join(","));
}

const browser = await chromium.launch();
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const owner = createClient(URL_, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
{ const { error } = await owner.auth.signInWithPassword(OWNER); if (error) throw error; }
const { data: biz } = await admin.from("businesses").select("id, timezone").eq("slug", "demo-detail").single();
const run = Math.random().toString(36).slice(2, 8);
const made = { rows: [], keys: [] };

async function cleanup() {
  if (made.keys.length) await admin.storage.from(BUCKET).remove(made.keys);
  if (made.rows.length) await admin.from("expenses").delete().in("id", made.rows);
  made.rows = []; made.keys = [];
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, async () => { await cleanup(); process.exit(130); });

/** The last day of this month in the tenant's zone, so the rows sort to the top. */
function lastOfMonth() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: biz.timezone || "America/Los_Angeles" }).format(new Date());
  const [y, m] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Three expenses, two with a receipt, written as the owner. */
async function seed(tag) {
  const date = lastOfMonth();
  const rows = [];
  for (const [i, withReceipt] of [[1, true], [2, true], [3, false]]) {
    const { data, error } = await owner.from("expenses").insert({
      business_id: biz.id, amount: 1 + i / 100, category: "supplies", date, payment_method: "unspecified",
      description: `9.20 check ${run} ${tag} ${i}`,
    }).select().single();
    if (error) throw error;
    made.rows.push(data.id);
    if (withReceipt) {
      const key = `${biz.id}/${data.id}/${crypto.randomUUID()}.jpg`;
      const up = await owner.storage.from(BUCKET).upload(key, JPEG, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      made.keys.push(key);
      const { error: e2 } = await owner.from("expenses").update({
        receipt_path: key, receipt_bytes: JPEG.length, receipt_width: 1200, receipt_height: 800,
        receipt_uploaded_at: new Date().toISOString(),
      }).eq("id", data.id);
      if (e2) throw e2;
      rows.push({ ...data, receipt_path: key });
    } else rows.push(data);
  }
  return rows;
}

const used = async () => {
  const { data, error } = await owner.rpc("job_photo_budget", { p_business: biz.id });
  if (error) throw error;
  return Number((Array.isArray(data) ? data[0] : data)?.used_bytes ?? NaN);
};
const objectThere = async (key) => {
  const [b, e] = [key.slice(0, key.lastIndexOf("/")), key.slice(key.lastIndexOf("/") + 1)];
  const { data } = await admin.storage.from(BUCKET).list(b, { search: e });
  return (data ?? []).some((o) => o.name === e);
};

/** How far the press reaches from the centre, by hit test (an ::after counts). */
const HIT = (el) => {
  el.scrollIntoView({ block: "center" });
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const mine = (x, y) => { const at = document.elementFromPoint(x, y); return !!at && (at === el || el.contains(at)); };
  if (!mine(cx, cy)) return { w: 0, h: 0 };
  const reach = (dx, dy) => { let n = 0; while (n < 80 && mine(cx + dx * (n + 1), cy + dy * (n + 1))) n++; return n; };
  return { w: reach(-1, 0) + reach(1, 0) + 1, h: reach(0, -1) + reach(0, 1) + 1 };
};

let signedIn = null;
async function open(pass, { asStaff = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: pass.w, height: pass.h }, storageState: signedIn || undefined });
  const page = await ctx.newPage();
  const mine = [];
  watchConsole(page, `${pass.w}/${pass.lang}`, mine);
  const signReqs = [];
  const reads = { n: 0 };
  page.on("request", (r) => {
    if (/\/storage\/v1\/object\/sign\/expense-receipts(\?|$)/.test(r.url())) signReqs.push(r.postData() || "");
    if (r.method() === "GET" && /\/rest\/v1\/expenses\?select=\*/.test(r.url())) reads.n++;
  });
  // "A member without the settings permission": the membership read is answered
  // as staff holding `money` only. The database still answers as the owner, so
  // this isolates exactly the screen's own decision.
  if (asStaff && BREAK !== "gate") await page.route(/\/rest\/v1\/business_users\?/, async (route) => {
    const res = await route.fetch();
    const rows = await res.json();
    for (const m of rows) if (m.business_id === biz.id) { m.role = "staff"; m.permissions = ["money"]; }
    return route.fulfill({ response: res, json: rows });
  });
  if (BREAK === "nosign") await page.route(/\/storage\/v1\/object\/sign\/expense-receipts(\?|$)/, (r) => r.abort());
  if (BREAK === "orphan") await page.route(/\/storage\/v1\/object\/expense-receipts(\?|$)/, (r) =>
    r.request().method() === "DELETE" ? r.abort() : r.fallback());
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", OWNER.email);
    await page.fill("input[type=password]", OWNER.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
    signedIn = await ctx.storageState();
  }
  await page.evaluate((l) => {
    try {
      localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
      localStorage.setItem("dp.tour", "1");
      localStorage.setItem("dp.lang.app", l);
    } catch { /* private mode */ }
  }, pass.lang);
  await page.goto(`${BASE}/app/money`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  // A capped list is a silent truncation for this check: open it if it is capped.
  const more = page.locator("button.btn.sm", { hasText: /^\+\d+/ });
  if (await more.count()) { await more.first().click(); await settle(page); }
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
  await settle(page);
  return { ctx, page, mine, signReqs, reads };
}

/** The rows this run made, read off the screen. */
const readList = (page, rows) => page.evaluate(({ rows, HIT_SRC }) => {
  const HIT = eval(`(${HIT_SRC})`);
  const rowOf = (desc) => [...document.querySelectorAll(".body")].find((b) => b.textContent.trim() === desc)?.closest(".row");
  const thumbs = [];
  for (const r of rows.filter((x) => x.receipt_path)) {
    const btn = rowOf(r.description)?.querySelector("button.receipt-thumb");
    if (!btn) continue;
    const img = btn.querySelector("img");
    thumbs.push({ src: img?.src || "", natural: img?.naturalWidth || 0, hit: HIT(btn) });
  }
  const bareRow = rowOf(rows.find((x) => !x.receipt_path).description);
  // The row is two children: the text block and the figure. Anything more is a box.
  const extra = bareRow ? bareRow.children.length - 2 + bareRow.querySelectorAll("img, .receipt-thumb").length : 0;
  return { thumbs, bare: { found: !!bareRow, extra } };
}, { rows, HIT_SRC: HIT.toString() });

const viewerHit = (page, name) => page.evaluate(({ name, HIT_SRC }) => {
  const HIT = eval(`(${HIT_SRC})`);
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === name);
  return b ? HIT(b) : null;
}, { name, HIT_SRC: HIT.toString() });

const fullImage = (page) => page.evaluate(() => {
  const i = document.querySelector("img.receipt-full");
  return i ? { natural: i.naturalWidth, src: i.src } : null;
});

/** Console lines minus the ONE designed 404 per gear load (gotchas 120). */
const clean = (lines) => { let allowed = 1; return lines.filter((l) => !(/status of 404/.test(l) && allowed-- > 0)); };

try {
  for (const pass of PASSES) {
    const label = `${pass.w}/${pass.lang}`;
    const W = WORDS[pass.lang];
    const consoleLines = [];

    // 1. The owner: list, viewer, Remove, and the allowance either side.
    const rows = await seed(label);
    const keys = rows.filter((r) => r.receipt_path).map((r) => r.receipt_path);
    let o = await open(pass);
    const list = await readList(o.page, rows);
    gradeList(label, { ...list, signReqs: o.signReqs, listReads: o.reads.n }, keys);
    await o.page.screenshot({ path: path.join(REPO, ART, `${pass.w}-${pass.lang}-list.png`), fullPage: true });
    artifacts.push(`${ART}/${pass.w}-${pass.lang}-list.png`);

    const target = rows[0];
    const thumb = o.page.locator(".row", { has: o.page.getByText(target.description, { exact: true }) }).locator("button.receipt-thumb");
    let opened = false;
    if (await thumb.count()) {
      await thumb.click();
      await o.page.waitForSelector("img.receipt-full", { timeout: 10000 }).catch(() => {});
      await o.page.waitForFunction(() => document.querySelector("img.receipt-full")?.complete, null, { timeout: 10000 }).catch(() => {});
      await settle(o.page);
      opened = true;
    }
    const full = await fullImage(o.page);
    check(label, "viewer/full-image-loads", opened && !!full && full.natural > 0 && SIGNED.test(full.src),
      full ? `natural ${full.natural}px, ${full.src.slice(0, 70)}` : "the viewer did not open");
    const rh = await viewerHit(o.page, W.remove);
    check(label, "viewer/remove-hit-44", !!rh && rh.w >= 44 && rh.h >= 44, rh ? `${rh.w}x${rh.h}` : "no Remove");
    await o.page.screenshot({ path: path.join(REPO, ART, `${pass.w}-${pass.lang}-viewer.png`) });
    artifacts.push(`${ART}/${pass.w}-${pass.lang}-viewer.png`);

    const before = await used();
    if (rh) {
      await o.page.getByRole("button", { name: W.remove, exact: true }).click();
      await o.page.getByRole("button", { name: W.yes, exact: true }).click();
      await o.page.waitForFunction(() => !document.querySelector("img.receipt-full") || document.querySelector("[role=alert]"),
        null, { timeout: 15000 }).catch(() => {});
      await o.page.waitForLoadState("networkidle").catch(() => {});
      await settle(o.page);
    }
    const after = await used();
    const gone = !(await objectThere(target.receipt_path));
    const { data: row } = await admin.from("expenses")
      .select("receipt_path, receipt_bytes, receipt_width, receipt_height, receipt_uploaded_at").eq("id", target.id).single();
    const cleared = row && Object.values(row).every((v) => v === null);
    check(label, "remove/object-deleted", gone, gone ? "the object is gone from the bucket" : "the object is STILL in the bucket");
    check(label, "remove/five-columns-cleared", !!cleared, JSON.stringify(row));
    check(label, "remove/allowance-moved-by-the-file", before - after === JPEG.length,
      `used ${before} → ${after}, expected −${JPEG.length}`);
    const relisted = await readList(o.page, rows);
    const targetThumb = await o.page.locator(".row", { has: o.page.getByText(target.description, { exact: true }) }).locator("button.receipt-thumb").count();
    check(label, "remove/row-redrawn", targetThumb === 0 && relisted.thumbs.length === 1,
      `removed row thumbs ${targetThumb}, others ${relisted.thumbs.length}`);
    consoleLines.push(...clean(o.mine));
    await o.ctx.close();

    // 2. Without the settings permission: the thumbnail opens, Remove is not offered.
    o = await open(pass, { asStaff: true });
    const second = rows[1];
    const t2 = o.page.locator(".row", { has: o.page.getByText(second.description, { exact: true }) }).locator("button.receipt-thumb");
    if (await t2.count()) { await t2.click(); await o.page.waitForSelector("img.receipt-full", { timeout: 10000 }).catch(() => {}); await settle(o.page); }
    const sFull = await fullImage(o.page);
    const offered = await o.page.getByRole("button", { name: W.remove, exact: true }).count();
    check(label, "no-settings/sees-it-but-no-remove", !!sFull && offered === 0,
      `${sFull ? "viewer open" : "viewer NOT open"}, Remove offered ${offered}`);
    await o.page.screenshot({ path: path.join(REPO, ART, `${pass.w}-${pass.lang}-no-settings.png`) });
    artifacts.push(`${ART}/${pass.w}-${pass.lang}-no-settings.png`);
    consoleLines.push(...clean(o.mine));
    await o.ctx.close();

    // 3. A refusal from the server is shown as the server wrote it, and nothing is removed.
    o = await open(pass);
    // The write that carries the remove, answered with the refusal. Only the
    // remove's own requests are touched; every read goes through untouched.
    // `--break=keep` answers it with a DIFFERENT sentence, which must go red.
    const said = BREAK === "keep" ? "Something went wrong." : REFUSAL;
    const refuse = (r) => r.fulfill({ status: 403, contentType: "application/json",
      json: { statusCode: "403", error: "Forbidden", message: said, code: "42501" } });
    await o.page.route(/\/rest\/v1\/expenses\?/, (r) => r.request().method() === "PATCH" ? refuse(r) : r.fallback());
    await o.page.route(/\/storage\/v1\/object\/expense-receipts(\?|$)/, (r) => r.request().method() === "DELETE" ? refuse(r) : r.fallback());
    await o.page.route(/\/functions\/v1\/photo-door/, refuse);
    const t3 = o.page.locator(".row", { has: o.page.getByText(second.description, { exact: true }) }).locator("button.receipt-thumb");
    if (await t3.count()) { await t3.click(); await o.page.waitForSelector("img.receipt-full", { timeout: 10000 }).catch(() => {}); await settle(o.page); }
    const u0 = await used();
    if (await o.page.getByRole("button", { name: W.remove, exact: true }).count()) {
      await o.page.getByRole("button", { name: W.remove, exact: true }).click();
      await o.page.getByRole("button", { name: W.yes, exact: true }).click();
      await o.page.waitForSelector("[role=alert]", { timeout: 10000 }).catch(() => {});
      await settle(o.page);
    }
    const alert = (await o.page.locator(".error-box[role=alert]").allTextContents()).map((s) => s.trim());
    check(label, "refused/server-sentence-as-written", alert.includes(REFUSAL), JSON.stringify(alert));
    const kept = await objectThere(second.receipt_path);
    const { data: r2 } = await admin.from("expenses").select("receipt_path").eq("id", second.id).single();
    check(label, "refused/nothing-removed", kept && r2?.receipt_path === second.receipt_path && (await used()) === u0,
      `object ${kept ? "kept" : "GONE"}, column ${r2?.receipt_path ? "kept" : "CLEARED"}`);
    await o.page.screenshot({ path: path.join(REPO, ART, `${pass.w}-${pass.lang}-refused.png`) });
    artifacts.push(`${ART}/${pass.w}-${pass.lang}-refused.png`);
    consoleLines.push(...clean(o.mine).filter((l) => !/(status of|http) 403/.test(l)));   // the 403 this run sent
    await o.ctx.close();

    check(label, "console/clean", consoleLines.length === 0, consoleLines.join(" | "));
    noise.push(...consoleLines);
    await cleanup();
  }
} finally {
  await cleanup();
  await browser.close();
}

// The canary: a hand-built URL, two signing requests and a 34px target must all fail.
const keep = { a: assertions, f: failures.length };
gradeList("canary", {
  thumbs: [{ src: `${URL_}/storage/v1/object/expense-receipts/x/y.jpg`, natural: 10, hit: { w: 34, h: 34 } },
    { src: `${URL_}/storage/v1/object/expense-receipts/x/z.jpg`, natural: 10, hit: { w: 34, h: 34 } }],
  bare: { found: true, extra: 0 }, signReqs: ["a", "a"], listReads: 1,
}, ["a"]);
const canaryCaught = failures.length >= keep.f + 3;
failures.splice(keep.f);
assertions = keep.a;

const expected = PASSES.length * PER_PASS;
const lines = [`${assertions} assertions (declared ${expected}), ${failures.length} failed`, ...failures,
  `canary the-built-url: ${canaryCaught ? "caught" : "MISSED"}`, ...noise.map((n) => "console: " + n)];
console.log(lines.join("\n"));
const txt = `${ART}/report${BREAK ? `.${BREAK}.sabotage` : ""}.txt`;
writeFileSync(path.join(REPO, txt), lines.join("\n") + "\n");
artifacts.push(txt);
const okRun = failures.length === 0 && canaryCaught && assertions === expected;
const { path: rp, receipt } = writeReceipt({
  check_id: "receipt-viewer", started_at, status: okRun ? "pass" : "fail",
  expected_targets: PASSES.length, discovered_targets: PASSES.length, attempted_targets: PASSES.length,
  completed_targets: PASSES.length, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: expected,
  assertion_floor: "every pass runs the same sixteen checks unconditionally, so the count is 16 per pass or the run stopped; okRun separately requires the exact declared total",
  failures, warnings: [], artifacts,
  dimensions: { passes: PASSES.map((p) => `${p.w}x${p.h}/${p.lang}`), break: BREAK || null },
  canary: { id: "the-built-url", observed_failure: canaryCaught },
});
console.log("receipt: " + path.relative(REPO, rp) + " (" + receipt.status + ")");
process.exit(okRun ? 0 : 1);
