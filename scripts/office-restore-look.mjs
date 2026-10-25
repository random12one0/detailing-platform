// ROADMAP 99.16 — the two safeguards the old back office had and the new one dropped,
// in a real browser at 1440, 768, 390 and 320.
//
//   node scripts/office-restore-look.mjs                    (dev server; no credentials)
//   node scripts/office-restore-look.mjs --lite             (the ?lite=1 reduced-motion path)
//   node scripts/office-restore-look.mjs --break=one-press  (sabotage: Reopen sends `restore` on the first press again)
//   node scripts/office-restore-look.mjs --break=always-on  (sabotage: "Look at their dashboard" never switches off again)
//   node scripts/office-restore-look.mjs --freeze=before|after   (Andrew's frozen copies)
//
// WRITES NOTHING ANYWHERE: a made-up session and page.route() answers for five made-up
// detailers (the office-account.mjs pattern). It asks what the screen SENDS and SHOWS, not
// what the server does.
//
// WHAT IT ASKS
//   A. RESTORE. A suspended account: the first press on "Reopen account" sends NOTHING and
//      asks "Let <name> back in?" naming the business; "Not yet" puts the button back and
//      still sends nothing; the answer sends exactly one `restore` for that business. A
//      signup waiting for its first payment is asked the same way, in its own words.
//   B. LOOK AT THEIR DASHBOARD. An account whose member list has no owner (its contact
//      email is filled in, which is what `row.owner_email` reads as — the trap): the button
//      is off, the reason is written beside it, a forced press sends no `impersonate` and
//      opens no tab. An account WITH an owner: the button is on, no reason is written, one
//      press sends one `impersonate` and opens one tab. An account whose detail could not be
//      read: the button stays on and no reason is claimed (unknown is not "no owner").
//   C. Every new control: no overlap, no sideways overflow, 44px of real hit area.
//   D. The console is silent (apart from the one 500 asked for in B).
//
// THE CANARY injects a copy of the "Look at their dashboard" button over its neighbour and
// requires the same overlap probe to name it. `--break=` switches reproduce the ORIGINAL
// defects by rewriting the served module; the run must go red naming the question it breaks.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || "";
const BREAK = arg("break");
const FREEZE = arg("freeze");
const LITE = process.argv.includes("--lite");
if (BREAK && !["one-press", "always-on"].includes(BREAK)) { console.error(`unknown --break=${BREAK}; one-press or always-on`); process.exit(2); }
const BASE = process.env.BASE_URL || process.env.BASE || "http://localhost:5173";
const SIZES = [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }, { w: 320, h: 700 }];
const ART = `artifacts/office-restore-look${BREAK ? `-${BREAK}` : ""}`;   // a sabotage keeps its own screenshots; a clean run must not overwrite them
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/99.16";
const PNGS = `${SHOTS}/png`;
// supabase-js keeps its session under `sb-<first label of the API host>-auth-token`; read the host the served app was built against.
const apiHost = await fetch(`${BASE}/src/lib/supabase.js`).then((r) => r.text())
  .then((t) => new URL(JSON.parse(`"${(t.match(/"VITE_SUPABASE_URL":\s*"([^"]+)"/) || [])[1]}"`)).hostname).catch(() => null);
const REF = apiHost ? apiHost.split(".")[0] : "kguqylyzgyzfktkfnhjb";

let assertions = 0;
const failures = [];
const consoleNoise = [];
const artifacts = [];
const observed = {};
const check = (where, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok    ${name}`); return; }
  failures.push(`${where}: ${name} ${detail}`.trim());
  console.error(`    FAIL  ${name}  ${detail}`);
};

const row = (k, name, extra) => ({
  id: `acct-${k}`, slug: `acct-${k}`, name, is_demo: false, status: "active",
  owner_email: `owner${k}@example.com`, contact_email: null, site_url: null, domain: null,
  created_at: "2026-08-01T12:00:00Z", subscription: null, bookings_total: 0, days_since_booking: null,
  last_booking_at: null, jobs_month: 0, revenue_month: 0, customers: 0,
  setup_inputs: { business: { contact_phone: "" } }, ...extra,
});
const HARBOR = "Harbor Shine", JUNIPER = "Juniper Mobile Detail", KESTREL = "Kestrel Auto Spa", LARCH = "Larch Mobile Spa", MARLIN = "Marlin Detail";
const ROWS = [
  row(1, HARBOR, {}),                                         // contact email filled in, member list has NO owner
  row(2, JUNIPER, {}),                                        // has an owner
  row(3, KESTREL, { status: "paused" }),                      // suspended by Andrew
  row(4, LARCH, { status: "paused", awaiting_first_payment: true }), // signup that never paid
  row(5, MARLIN, {}),                                         // its detail cannot be read
];
const OWNER = [{ email: "owner@example.com", role: "owner" }];
const MEMBERS = { "acct-1": [{ email: "front-desk@example.com", role: "staff" }], "acct-2": OWNER, "acct-3": OWNER, "acct-4": OWNER };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
const user = { id: "00000000-0000-4000-8000-000000000001", email: "andrew@example.com", aud: "authenticated", role: "authenticated" };
const SESSION = {
  access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, exp, role: "authenticated", email: user.email })}.x`,
  refresh_token: "fake", token_type: "bearer", expires_in: 86400, expires_at: exp, user,
};

const PROBE = (sel) => {
  const els = [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0);
  const overlaps = [], thin = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
    const a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect();
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 0.5 && h > 0.5) overlaps.push(`${els[i].textContent.trim().slice(0, 20)} x ${els[j].textContent.trim().slice(0, 20)}`);
  }
  for (const el of els.filter((e) => !e.matches(".bo-nolook"))) {   // text, not a control: no hit area to measure
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (const dy of [-21, 21]) {
      const y = cy + dy; if (y < 0 || y > innerHeight) continue;
      const hit = document.elementFromPoint(cx, y);
      if (!hit || !(el === hit || el.contains(hit))) thin.push(`${el.textContent.trim().slice(0, 24)} @${dy} hit=${hit ? (hit.className || hit.tagName) : "nothing"} y=${Math.round(y)}/${innerHeight}`);
    }
  }
  const pr = document.querySelector(".bo-panel")?.getBoundingClientRect();
  const cut = els.filter((e) => pr && (e.getBoundingClientRect().right > pr.right + 1 || e.getBoundingClientRect().left < pr.left - 1)).map((e) => e.textContent.trim().slice(0, 24));
  return { overlaps, thin, cut, overflowX: document.documentElement.scrollWidth > innerWidth + 1, n: els.length };
};
const probe = (page, sel) => page.evaluate(`(${PROBE.toString()})(${JSON.stringify(sel)})`);

let browser = null;
const canary = { id: "injected-overlapping-look-button", observed_failure: false };
let completed = 0;
mkdirSync(ART, { recursive: true });
if (FREEZE) mkdirSync(PNGS, { recursive: true });

async function openPage(size) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } }, [`sb-${REF}-auth-token`, JSON.stringify(SESSION)]);
  const page = await ctx.newPage();
  const sent = [], popups = [];
  ctx.on("page", (p) => popups.push(p));
  // The sabotage rewrites the SERVED module, so the browser runs the original defect.
  if (BREAK) {
    await ctx.route(/\/src\/admin\/office\/DetailerPanel\.jsx/, async (route) => {
      const res = await route.fetch();
      let src = await res.text();
      if (BREAK === "one-press") src = src.replace(/onClick: \(\) => setSure\(true\)/, `onClick: () => act("restore")`);
      if (BREAK === "always-on") src = src.replace(/hasOwner === false/g, "false");
      await route.fulfill({ response: res, body: src });
    });
  }
  await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
  await page.route("**/functions/v1/platform-admin", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    sent.push(body);
    switch (body.action) {
      case "whoami": return route.fulfill({ json: { email: user.email } });
      case "list": return route.fulfill({ json: { rows: ROWS, totals: {} } });
      case "get":
        if (body.business_id === "acct-5") return route.fulfill({ status: 500, json: { error: "Could not read this one." } });
        return route.fulfill({ json: { bookings: [], invoices: [], events: [], members: MEMBERS[body.business_id] ?? [] } });
      case "impersonate": return route.fulfill({ json: { access_token: "fake", expires_at: new Date(Date.now() + 3600e3).toISOString() } });
      default: return route.fulfill({ json: {} });
    }
  });
  watchConsole(page, `${size.w}`, consoleNoise);
  await page.goto(`${BASE}/admin${LITE ? "?lite=1" : ""}#detailers`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bo-row", { timeout: 60000 });
  await settle(page, 1200);
  return { ctx, page, sent, popups };
}
const count = (sent, action, id) => sent.filter((b) => b.action === action && (!id || b.business_id === id)).length;
const openPanel = async (page, name) => {
  // A panel already open covers the list; leave it first.
  if (await page.locator(".bo-panel").count()) { await page.keyboard.press("Escape"); await page.waitForSelector(".bo-panel", { state: "detached", timeout: 5000 }).catch(() => {}); }
  await page.locator(".bo-row", { hasText: name }).first().click();
  await page.waitForSelector(".bo-panel", { timeout: 10000 });
  await settle(page, 900);
};
// A press that finds nothing to press is a failed question, not a crash that hides the other widths.
const press = (loc) => loc.click({ timeout: 3000 }).catch(() => false);
const footer = (page) => page.locator(".bo-pfoot");
const lookBtn = (page) => page.locator(".bo-panel button", { hasText: "Look at their dashboard" });
const reason = (page) => page.locator(".bo-panel .bo-nolook");

try {
  browser = await chromium.launch();

  if (FREEZE) {
    const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
    const before = FREEZE === "before";
    const tag = before ? "before" : "after", label = before ? "Before" : "After";
    // Pair 1 — Restore.
    let { ctx, page } = await openPage({ w: 1440, h: 900 });
    await openPanel(page, KESTREL);
    if (!before) { await footer(page).locator("button", { hasText: "Reopen account" }).click(); await settle(page, 500); }
    await page.evaluate(() => document.querySelector(".bo-pscroll").scrollTo(0, 1e5));
    await settle(page, 400);
    await freeze(page, {
      out: `${SHOTS}/${tag}.html`, label,
      note: before ? "A suspended account: pressing \"Reopen account\" lets them back in at once. The old screen asked first, and a stray tap here puts a suspended detailer's booking page live."
        : "Pressing \"Reopen account\" now asks \"Let Kestrel Auto Spa back in?\" first, with \"Yes, let them back in\" and \"Not yet\". Nothing is sent until the answer.",
      highlight: ".bo-pfoot",
    });
    await ctx.close();
    // Pair 2 — Look at their dashboard, on an account with no owner.
    ({ ctx, page } = await openPage({ w: 1440, h: 900 }));
    await openPanel(page, HARBOR);
    await lookBtn(page).scrollIntoViewIfNeeded();
    await settle(page, 400);
    await freeze(page, {
      out: `${SHOTS}/${tag}-look.html`, label,
      note: before ? "Harbor Shine has a contact email but nobody has accepted the owner invite. \"Look at their dashboard\" is on anyway, and pressing it opens a tab and then fails."
        : "The button is switched off for an account with no owner, and the reason is written under it, pointing to \"Send an owner invite\".",
      highlight: ".bo-contact",
    });
    await ctx.close();
    console.log(`froze ${tag} into ${SHOTS}`);
  } else {
    for (const size of SIZES) {
      const where = `${size.w}${LITE ? " lite" : ""}`;
      console.log(`\n${where}`);
      const { ctx, page, sent, popups } = await openPage(size);
      const shot = async (name) => { const f = `${ART}/${name}-${size.w}.png`; await page.screenshot({ path: f }); artifacts.push(f); };

      // ── A. RESTORE — a suspended account ──
      await openPanel(page, KESTREL);
      const reopen = footer(page).locator("button", { hasText: "Reopen account" });
      check(where, "A1 a suspended account offers Reopen account", (await reopen.count()) === 1);
      await press(reopen);
      await settle(page, 500);
      const q = (await footer(page).locator(".bo-sure p").first().textContent({ timeout: 3000 }).catch(() => "")) || "";
      check(where, "A2 the first press sends nothing", count(sent, "restore") === 0, `restore sent ${count(sent, "restore")}`);
      check(where, "A3 it asks, naming the business", q.includes(`Let ${KESTREL} back in?`), JSON.stringify(q));
      const yes = footer(page).locator("button", { hasText: "Yes, let them back in" }), no = footer(page).locator("button", { hasText: "Not yet" });
      check(where, "A4 the question has a Yes and a Not yet", (await yes.count()) === 1 && (await no.count()) === 1);
      // The question is taller than the button it replaced, so it can land past the scroller's bottom edge; a hit area is judged at rest.
      await page.evaluate(() => document.querySelector(".bo-pscroll").scrollTo(0, 1e5));
      await settle(page, 300);
      let p = await probe(page, ".bo-pfoot button");
      check(where, "A5 the question: no overlap, no sideways overflow, nothing cut, 44px hit area", p.overlaps.length === 0 && !p.overflowX && p.cut.length === 0 && p.thin.length === 0, [...p.overlaps, ...p.cut, ...p.thin].join(" | "));
      await shot("restore-asks");
      await press(no);
      check(where, "A6 Not yet puts the button back and sends nothing",
        (await reopen.count()) === 1 && (await footer(page).locator(".bo-sure").count()) === 0 && count(sent, "restore") === 0);
      await press(reopen);
      await press(yes);
      await settle(page, 600);
      check(where, "A7 the answer sends exactly one restore for THIS business",
        count(sent, "restore") === 1 && count(sent, "restore", "acct-3") === 1, JSON.stringify(sent.filter((b) => b.action === "restore")));

      // ── A. RESTORE — a signup waiting for its first payment ──
      await openPanel(page, LARCH);
      const live = footer(page).locator("button", { hasText: "Put live without payment" });
      check(where, "A8 a signup that never paid offers Put live without payment", (await live.count()) === 1);
      await press(live);
      await settle(page, 500);
      const q2 = (await footer(page).locator(".bo-sure p").first().textContent({ timeout: 3000 }).catch(() => "")) || "";
      check(where, "A9 it asks first, naming the business, and sends nothing", q2.includes(LARCH) && count(sent, "restore", "acct-4") === 0, JSON.stringify(q2));
      await press(footer(page).locator("button", { hasText: "Not yet" }));
      check(where, "A10 Not yet sends nothing", count(sent, "restore", "acct-4") === 0);

      // ── B. LOOK AT THEIR DASHBOARD — no owner ──
      await openPanel(page, HARBOR);
      const hb = lookBtn(page);
      await reason(page).first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
      check(where, "B1 no owner (contact email filled in): the button is off", await hb.isDisabled().catch(() => false));
      const why = (await reason(page).first().textContent().catch(() => "")) || "";
      check(where, "B2 the reason is written beside it", /Nobody has accepted the owner invite yet/.test(why) && /Send an owner invite/.test(why), JSON.stringify(why));
      await hb.scrollIntoViewIfNeeded();
      await hb.click({ force: true, timeout: 3000 }).catch(() => {});
      await settle(page, 400);
      check(where, "B3 a forced press sends no impersonate and opens no tab", count(sent, "impersonate") === 0 && popups.length === 0, `sent ${count(sent, "impersonate")}, tabs ${popups.length}`);
      check(where, "B4 the Their account note says the same thing", (await page.locator(".bo-account .bo-dim").first().textContent().catch(() => "")).includes("Nobody has accepted the owner invite yet"));
      p = await probe(page, ".bo-contact button, .bo-contact a, .bo-nolook");
      check(where, "B5 the contact row with the reason: no overlap, no sideways overflow, nothing cut, 44px hit area", p.overlaps.length === 0 && !p.overflowX && p.cut.length === 0 && p.thin.length === 0, [...p.overlaps, ...p.cut, ...p.thin].join(" | "));
      await shot("look-off");
      if (size.w === SIZES[0].w) {
        await page.evaluate(() => {
          const b = [...document.querySelectorAll(".bo-contact button")].find((x) => x.textContent.includes("Look at their dashboard")), r = b.getBoundingClientRect();
          const c = b.cloneNode(true); c.dataset.canary = "1"; c.style.marginLeft = `-${r.width - 8}px`; b.after(c);
        });
        const cp = await probe(page, ".bo-contact button");
        await page.evaluate(() => document.querySelectorAll("[data-canary]").forEach((n) => n.remove()));
        canary.observed_failure = cp.overlaps.length >= 1;
        canary.detail = `overlaps seen with one injected: ${cp.overlaps.length}`;
        console.log(`    canary ${canary.observed_failure ? "CAUGHT" : "MISSED"}: ${canary.detail}`);
      }

      // ── B. LOOK AT THEIR DASHBOARD — has an owner ──
      await openPanel(page, JUNIPER);
      const jb = lookBtn(page);
      check(where, "B6 an owner exists: the button is on and no reason is written", (await jb.isEnabled().catch(() => false)) && (await reason(page).count()) === 0);
      await press(jb);
      await page.waitForTimeout(800);
      check(where, "B7 one press sends one impersonate for THIS business and opens one tab",
        count(sent, "impersonate") === 1 && count(sent, "impersonate", "acct-2") === 1 && popups.length === 1, `sent ${count(sent, "impersonate")}, tabs ${popups.length}`);
      for (const pp of popups) await pp.close().catch(() => {});

      // ── B. LOOK AT THEIR DASHBOARD — the detail could not be read ──
      await openPanel(page, MARLIN);
      await page.waitForFunction(() => /Could not read/.test(document.querySelector(".bo-panel")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => {});
      check(where, "B8 detail unreadable: the button stays on and no reason is claimed", (await lookBtn(page).isEnabled().catch(() => false)) && (await reason(page).count()) === 0);

      // The 500 in B8 is on purpose: one http line and one "Failed to load resource" line. Exactly those are allowed.
      const mine = consoleNoise.filter((n) => n.startsWith(`${size.w} · `));
      const planned = mine.filter((n) => /http 500 · \/functions\/v1\/platform-admin|status of 500/.test(n));
      const other = mine.filter((n) => !planned.includes(n));
      check(where, "D the console is silent apart from the one 500 asked for", other.length === 0, other.join(" | ").slice(0, 300));
      observed[where] = { calls: sent.map((b) => b.action) };
      completed++;
      await ctx.close();
    }
  }
} catch (e) {
  failures.push(`crashed: ${e.message}`);
  console.error(e);
} finally {
  if (browser) await browser.close();
}

if (FREEZE) process.exit(failures.length ? 1 : 0);
const QUESTIONS = 19;
const status = failures.length === 0 && canary.observed_failure && completed === SIZES.length ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: `office-restore-look${LITE ? "-lite" : ""}${BREAK ? `-${BREAK}` : ""}`,   // one receipt per sabotage
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * QUESTIONS,
  assertion_floor: `${SIZES.length} widths x ${QUESTIONS} questions (restore 10, look 8, console 1), fixed by the code.`,
  failures,
  artifacts,
  canary,
  warnings: [
    "Writes nothing: a made-up session and page.route() answers for five made-up detailers. Asks what the screen sends and shows, not what the server does.",
    "The tab 'Look at their dashboard' opens is counted, not read: what the preview tab does with the token is scripts/support-view-ends.mjs, which needs credentials and a live run.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), lite: LITE, ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
