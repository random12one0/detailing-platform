// ROADMAP 97.15 — THE BACK OFFICE'S "LOOK AT THEIR DASHBOARD" STILL OPENS READ-ONLY, HOLDS NO
// REFRESH TOKEN, AND ITS SESSION STOPS WORKING WHEN THE VIEW IS CLOSED OR RUNS OUT.
//
//   set -a; . ./.env; set +a
//   BASE_URL=http://localhost:5173 node scripts/support-view-ends.mjs
//   node scripts/support-view-ends.mjs --break=no-signout   # sabotage: the tab never signs out
//   node scripts/support-view-ends.mjs --freeze=before|after  # Andrew's review copies, 390 only
//
// The real back office, signed in as the demo login (which IS a platform admin, deliberately),
// opens Coastline Auto Detailing — the demo login's own business, so the session it creates is
// the demo owner's and nobody else's. The live platform-admin may be older than 97.15 (it answered
// with a link on 2026-10-17), so the impersonate answer is STOOD IN for here: the real call is
// made, its link is exchanged exactly as the new server does, and the tab is handed what the new
// server hands it — an access token and a deadline, no refresh token. The deadline is 25 seconds
// rather than 30 minutes so the expiry can be watched.
//
// WRITES, said before they happen: each opening writes one `impersonate` row to the action log
// and one Auth session for the demo owner on kguqylyzgyzfktkfnhjb. Every session it opens is
// signed out by the product (that is the thing measured) or, failing that, by the cleanup below.
//
// Per width (390x844, 768x1024, 1440x900), two scenarios: CLOSE (press Close, the token must stop
// working at Auth, and the back office's own session must not) and EXPIRE (wait out the deadline,
// the tab must show the ended page and the token must stop working). 6 targets.
// CANARY, every run: a session this script signs out itself must read as refused by the same
// probe, so a "refused" below is the probe seeing a signed-out session and not a broken probe.

import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { demoOwner } from "./lib/demoOwner.mjs";
import { writeReceipt } from "./receipt.mjs";

const REPO = process.cwd();
const { chromium } = createRequire(import.meta.url)(join(REPO, "app/node_modules/playwright/index.js"));
const BASE = process.env.BASE_URL || "http://localhost:5173";
const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY — run `set -a; . ./.env; set +a` first. NOTHING WAS MEASURED."); process.exit(3); }
if (!SUPABASE_URL.includes("kguqylyzgyzfktkfnhjb")) { console.error("SUPABASE_URL is not kguqylyzgyzfktkfnhjb. Stopping."); process.exit(3); }
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const BREAK = arg("break");
const FREEZE = arg("freeze");
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/97.15";
mkdirSync(`${SHOTS}/png`, { recursive: true });
const SIZES = FREEZE ? [[390, 844]] : [[390, 844], [768, 1024], [1440, 900]];
const EXP_S = 25;
const BIZ = "Coastline Auto Detailing";
const started_at = new Date().toISOString();
const owner = demoOwner();
const freeze = FREEZE ? (await import(pathToFileURL("C:/Users/rando/Downloads/claude/belt/freeze.mjs").href)).freeze : null;

let assertions = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) console.log(`  ok    ${name}`);
  else { failures.push(`${name} ${detail}`.trim()); console.error(`  FAIL  ${name} ${detail}`); }
};
const H = { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" };
const authStatus = async (token) => (await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { ...H, Authorization: `Bearer ${token}` } })).status;
const leftOpen = new Set(); // access tokens to sign out if the product did not

// CANARY: a session signed out by this script must read as refused.
{
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: H, body: JSON.stringify(owner) });
  const s = await r.json();
  const live = await authStatus(s.access_token);
  await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, { method: "POST", headers: { ...H, Authorization: `Bearer ${s.access_token}` } });
  const dead = await authStatus(s.access_token);
  var canaryCaught = live === 200 && dead !== 200;
  check(`canary: the probe sees a live session (${live}) and the same session signed out (${dead})`, canaryCaught);
}

async function openView(browser, [w, h], expiresIn, stub = !FREEZE || FREEZE === "after") {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const errors = [];
  ctx.on("page", (p) => {
    p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
    p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  });
  if (stub) {
    await ctx.route(`${SUPABASE_URL}/functions/v1/platform-admin`, async (route) => {
      let body = null; try { body = route.request().postDataJSON(); } catch { /* preflight */ }
      if (body?.action !== "impersonate") return route.continue();
      const res = await route.fetch();
      const j = await res.json();
      let at = j.access_token;
      if (!at && j.url) { // the older server: exchange its link the way the new one does
        const v = await fetch(`${SUPABASE_URL}/auth/v1/verify`, { method: "POST", headers: H, body: JSON.stringify({ type: "magiclink", token_hash: new URL(j.url).searchParams.get("token") }) });
        at = (await v.json()).access_token;
      }
      if (at) leftOpen.add(at);
      await route.fulfill({ status: 200, headers: { ...res.headers(), "content-type": "application/json" },
        body: JSON.stringify({ success: true, access_token: at, expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(), as: j.as }) });
    });
  }
  if (BREAK === "no-signout") {
    await ctx.route(/\/src\/lib\/supabase\.js/, async (route) => {
      const res = await route.fetch();
      const src = await res.text();
      await route.fulfill({ response: res, body: src.replace(`supabase.auth.signOut({ scope: "local" })`, "Promise.resolve({ error: null })") });
    });
  }
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', owner.email);
  await page.fill('input[autocomplete="current-password"]', owner.password);
  await page.keyboard.press("Enter");
  await page.getByText("Detailers", { exact: true }).first().click({ timeout: 30_000 });
  await page.getByText(BIZ, { exact: true }).first().click({ timeout: 30_000 });
  const [popup] = await Promise.all([
    ctx.waitForEvent("page", { timeout: 30_000 }),
    page.getByRole("button", { name: "Look at their dashboard" }).click({ timeout: 30_000 }),
  ]);
  await popup.waitForSelector(".impbar", { timeout: 45_000 });
  await popup.waitForSelector(".topbar .brand", { timeout: 30_000 });
  await popup.waitForTimeout(1200);
  const state = await popup.evaluate(() => ({
    bar: document.querySelector(".impbar")?.innerText ?? "",
    brand: document.querySelector(".topbar .brand")?.textContent ?? "",
    mode: sessionStorage.getItem("dp.preview.mode"),
    auth: JSON.parse(sessionStorage.getItem("dp.preview.auth") || "null"),
  }));
  const own = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x));
    return k ? JSON.parse(localStorage.getItem(k))?.access_token : null;
  });
  if (state.auth?.access_token) leftOpen.add(state.auth.access_token);
  return { ctx, page, popup, state, own, errors };
}

const results = [];
const browser = await chromium.launch();
try {
  for (const size of SIZES) {
    const tag = `${size[0]}x${size[1]}`;
    if (FREEZE === "before") {
      const v = await openView(browser, size, 1800, false);
      await freeze(v.popup, { out: `${SHOTS}/before.html`, label: "Before", highlight: ".impbar",
        note: "The view-as tab never says when it ends, and Close only closes the tab: the session it opened (with a refresh token) keeps working." });
      await v.ctx.close();
      break;
    }

    // CLOSE — and the scenario that also proves the view opens read-only.
    {
      const v = await openView(browser, size, 1800);
      const { state } = v;
      check(`${tag} · view-as opens their business`, state.brand.trim() === BIZ, JSON.stringify(state.brand));
      check(`${tag} · it opens read-only (Looking, nothing can be changed)`, state.mode === "look" && /Looking at .*Nothing here can be changed/s.test(state.bar), JSON.stringify(state.bar));
      check(`${tag} · the bar says when the view ends`, /until \d{1,2}(:\d\d)? (AM|PM)/.test(state.bar), JSON.stringify(state.bar));
      check(`${tag} · the tab holds NO refresh token`, !!state.auth?.access_token && state.auth.refresh_token === "none", `refresh_token=${state.auth?.refresh_token === "none" ? "none" : state.auth?.refresh_token ? "(a real one)" : "missing"}`);
      const at = state.auth?.access_token;
      check(`${tag} · its token works while the view is open`, at && await authStatus(at) === 200);
      await v.popup.screenshot({ path: `${SHOTS}/png/open-${tag}.png` });
      if (FREEZE === "after") await freeze(v.popup, { out: `${SHOTS}/after.html`, label: "After", highlight: ".impbar",
        note: "The bar now says when the view ends (30 minutes), and Close signs this view's session out, so its token stops working." });
      const closed = v.popup.waitForEvent("close", { timeout: 15_000 }).then(() => true, () => false);
      await v.popup.getByRole("button", { name: "Close" }).click();
      const didClose = await closed;
      await new Promise((r) => setTimeout(r, 800));
      const after = at ? await authStatus(at) : 0;
      check(`${tag} · Close ends the view's session: its token is refused (${after})`, after !== 200 && after !== 0, `closed tab=${didClose}`);
      if (after !== 200) leftOpen.delete(at);
      const ownStatus = v.own ? await authStatus(v.own) : 0;
      check(`${tag} · the back office's own session still works (local scope, ${ownStatus})`, ownStatus === 200);
      check(`${tag} · console clean (close)`, v.errors.length === 0, v.errors.join(" | ").slice(0, 400));
      results.push({ size: tag, scenario: "close", token_after: after, own_after: ownStatus });
      await v.ctx.close();
    }
    if (FREEZE === "after") {
      // only the ended page is still to freeze
    }

    // EXPIRE — the deadline passes with the tab open.
    {
      const v = await openView(browser, size, EXP_S);
      const at = v.state.auth?.access_token;
      const ended = await v.popup.waitForURL(/ended=expired/, { timeout: (EXP_S + 20) * 1000 }).then(() => true, () => false);
      const text = ended ? await v.popup.locator("p").first().innerText().catch(() => "") : "";
      check(`${tag} · at the deadline the tab shows the ended page`, ended && /ended/i.test(text), JSON.stringify(text));
      await v.popup.screenshot({ path: `${SHOTS}/png/ended-${tag}.png` });
      if (FREEZE === "after") await freeze(v.popup, { out: `${SHOTS}/after-ended.html`, label: "After", highlightText: "has ended",
        note: "New: when the 30 minutes run out, the tab signs itself out and says so, with a way back to the back office." });
      await new Promise((r) => setTimeout(r, 800));
      const after = at ? await authStatus(at) : 0;
      check(`${tag} · after the deadline its token is refused (${after})`, after !== 200 && after !== 0);
      if (after !== 200) leftOpen.delete(at);
      check(`${tag} · console clean (expire)`, v.errors.length === 0, v.errors.join(" | ").slice(0, 400));
      results.push({ size: tag, scenario: "expire", token_after: after });
      await v.ctx.close();
    }
  }
} finally {
  await browser.close();
  // Cleanup: anything the product failed to end is ended here (and was already reported above).
  for (const t of leftOpen) await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, { method: "POST", headers: { ...H, Authorization: `Bearer ${t}` } }).catch(() => {});
}

if (!FREEZE) {
  const expected = SIZES.length * 2;
  writeReceipt({
    check_id: "support-view-ends",
    started_at,
    status: failures.length || results.length !== expected ? "fail" : "pass",
    expected_targets: expected,
    discovered_targets: results.length,
    attempted_targets: results.length,
    completed_targets: results.filter((r) => r.token_after !== 200).length,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: 1 + SIZES.length * (8 + 3),
    assertion_floor: "structural: one canary, eight per width for opening and closing, three per width for the deadline",
    failures,
    canary: { id: "self-signed-out-session-reads-refused", observed_failure: canaryCaught },
    artifacts: SIZES.flatMap(([w, h]) => [`${SHOTS}/png/open-${w}x${h}.png`, `${SHOTS}/png/ended-${w}x${h}.png`]),
    dimensions: { break: BREAK || undefined, base: BASE, expires_in_s: EXP_S, results },
  });
}
console.log(`\n${failures.length ? "FAIL" : "PASS"} — ${assertions} assertions, ${failures.length} failed, ${results.length} of ${SIZES.length * 2} scenarios reached`);
process.exit(failures.length ? 1 : 0);
