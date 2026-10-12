// ROADMAP 9.12a step 6, slice 6e part 1 — the rebuilt back office took /admin
// outright and the sign-in door moved into OfficePage; /admin/office is gone.
//
//   node scripts/office-move.mjs                 (dev server on :5173; no credentials)
//   node scripts/office-move.mjs --lite          (the ?lite=1 reduced-motion path)
//   node scripts/office-move.mjs --break=old-screen  (sabotage: the old screen's
//       marker is served at /admin again — the defect this slice fixes)
//   node scripts/office-move.mjs --freeze=after  (Andrew's frozen After copy)
//
// WRITES NOTHING ANYWHERE. Unsigned contexts never sign in (the wrong-password
// refusal is answered by page.route() on the auth token endpoint, so no account
// is touched); signed-in contexts use a made-up session plus page.route()
// answers for `whoami`/`list`, the office-account.mjs pattern.
//
// WHAT IT ASKS, at 1440, 392 and 320:
//   A. unsigned: /admin draws the door (.bo-door, Email + Password + Sign in,
//      the old door's own words), NO old five-tab markup (.pa-top) and NO rail;
//      a wrong password shows the server's one refusal sentence and keeps the
//      typed email; the door has no overlap, no sideways overflow, 44px buttons.
//   B. signed in: /admin draws the rail (.bo-rail) with the visitor's own
//      account on it (.bo-me), no door, no .pa-top.
//   C. /admin/office draws the product's own 404 (main.nf) — never a forward —
//      with no rail, no door and no .pa-top.
// THE CANARY injects an overlapping copy of the door's Sign in button and
// requires the same overlap probe to name it.

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
if (BREAK && BREAK !== "old-screen") { console.error(`unknown --break=${BREAK}; the only one is old-screen`); process.exit(2); }
const BASE = process.env.BASE || "http://localhost:5173";
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 700 }];
const ART = "artifacts/office-move";
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/9.12a";
const REF = "kguqylyzgyzfktkfnhjb";

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
  for (const el of els) {
    if (el.matches("input")) continue;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (const dy of [-21, 21]) {
      const y = cy + dy; if (y < 0 || y > innerHeight) continue;
      const hit = document.elementFromPoint(cx, y);
      if (!hit || !(el === hit || el.contains(hit))) thin.push(`${el.textContent.trim().slice(0, 24)} @${dy}`);
    }
  }
  return { overlaps, thin, overflowX: document.documentElement.scrollWidth > innerWidth + 1, n: els.length };
};
const probe = (page, sel) => page.evaluate(`(${PROBE.toString()})(${JSON.stringify(sel)})`);

let browser = null;
const canary = { id: "injected-overlapping-door-button", observed_failure: false };
let completed = 0;
mkdirSync(ART, { recursive: true });
if (FREEZE) mkdirSync(SHOTS, { recursive: true });

const oldScreenBreak = async (ctx) => {
  if (BREAK !== "old-screen") return;
  await ctx.addInitScript(() => {
    const s = () => {
      const h = document.createElement("header");
      h.className = "pa-top";
      h.style.cssText = "position:absolute;top:0;left:0;width:10px;height:10px;";
      document.body.appendChild(h);
    };
    if (document.body) s(); else document.addEventListener("DOMContentLoaded", s);
  });
};

async function openAnon(size) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
  await oldScreenBreak(ctx);
  const page = await ctx.newPage();
  await page.route("**/auth/v1/token**", (r) =>
    r.fulfill({ status: 400, json: { error: "Invalid login credentials" } }));
  await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
  watchConsole(page, `${size.w}`, consoleNoise);
  await page.goto(`${BASE}/admin${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bo-door", { timeout: 30000 });
  await settle(page, 1000);
  return { ctx, page };
}

async function openSigned(size) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
  await oldScreenBreak(ctx);
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } }, [`sb-${REF}-auth-token`, JSON.stringify(SESSION)]);
  const page = await ctx.newPage();
  await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
  await page.route("**/functions/v1/platform-admin", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    if (body.action === "whoami") return route.fulfill({ json: { email: user.email } });
    if (body.action === "list") return route.fulfill({ json: { rows: [], totals: {} } });
    if (body.action === "get") return route.fulfill({ json: { bookings: [], invoices: [], events: [] } });
    return route.fulfill({ json: {} });
  });
  watchConsole(page, `${size.w}`, consoleNoise);
  await page.goto(`${BASE}/admin${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bo-rail", { timeout: 60000 });
  await settle(page, 1200);
  return { ctx, page };
}

try {
  browser = await chromium.launch();

  if (FREEZE) {
    const { freeze, differs } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
    const { ctx, page } = await openSigned({ w: 1440, h: 900 });
    await freeze(page, {
      out: `${SHOTS}/after-office-move.html`, label: "After",
      note: "The back office itself is now at /admin: the same rail (Today, Detailers, Money, System) with the visitor's own account on it. The old five-tab screen is gone from this address.",
      highlight: ".bo-rail",
    });
    const same = await differs(page, `${SHOTS}/before-office-move.html`, `${SHOTS}/after-office-move.html`);
    console.log(`froze after into ${SHOTS} (differs=${same})`);
    await ctx.close();
  } else {
    for (const size of SIZES) {
      const where = `${size.w}${LITE ? " lite" : ""}`;
      console.log(`\n${where}`);

      // ── A. UNSIGNED: THE DOOR ──
      {
        const { ctx, page } = await openAnon(size);
        const door = page.locator(".bo-door");
        check(where, "unsigned: /admin draws the sign-in door", await door.isVisible().catch(() => false));
        const words = (await door.innerText().catch(() => "")) || "";
        check(where, "unsigned: the door keeps the old door's words",
          words.includes("This is the platform") && words.includes("Sign in"), words.slice(0, 120));
        check(where, "unsigned: no old five-tab markup (.pa-top) is served",
          (await page.locator(".pa-top").count()) === 0);
        check(where, "unsigned: no rail before signing in",
          (await page.locator(".bo-rail").count()) === 0);
        // Overlap is asked of the two fields plus the submit button only: the
        // eye toggle sits INSIDE its password field on purpose (the old door's
        // own design, kept word for word), so asking it against its field
        // would fail a deliberate control. It stays in the 44px probe below.
        const p = await probe(page, ".bo-door input, .bo-door button[type=submit]");
        check(where, "door: no overlap, no sideways overflow",
          p.overlaps.length === 0 && !p.overflowX, [...p.overlaps, p.overflowX ? "overflow-x" : ""].join(" | "));
        check(where, "door: every button has 44px of hit area",
          (await probe(page, ".bo-door button")).thin.length === 0);
        // CANARY, at the first width: the same probe must name an injected overlap.
        if (size.w === SIZES[0].w) {
          await page.evaluate(() => {
            const b = document.querySelector(".bo-door button[type=submit]"), r = b.getBoundingClientRect();
            const c = b.cloneNode(true); c.dataset.canary = "1";
            c.style.marginLeft = `-${r.width - 8}px`;
            b.after(c);
          });
          const cp = await probe(page, ".bo-door input, .bo-door button[type=submit]");
          await page.evaluate(() => document.querySelectorAll("[data-canary]").forEach((n) => n.remove()));
          canary.observed_failure = BREAK === "blind" ? false : cp.overlaps.length >= 1;
          canary.detail = `overlaps seen with one injected: ${BREAK === "blind" ? "probe blinded" : cp.overlaps.length}`;
          console.log(`    canary ${canary.observed_failure ? "CAUGHT" : "MISSED"}: ${canary.detail}`);
        }
        await page.screenshot({ path: `${ART}/door-${size.w}.png` }); artifacts.push(`${ART}/door-${size.w}.png`);

        // Refusal path: answered locally, nothing written, no account touched.
        await door.locator("input[type=email]").fill("nobody@example.com");
        await door.locator("input[type=password]").fill("wrong-password");
        await door.locator("button[type=submit]").click();
        await page.waitForSelector(".bo-door .bo-err", { timeout: 8000 }).catch(() => {});
        check(where, "refusal: a wrong password shows the one refusal sentence",
          ((await page.locator(".bo-door .bo-err").innerText().catch(() => "")) || "").includes("That email and password do not match."));
        check(where, "refusal: the typed email is kept",
          (await door.locator("input[type=email]").inputValue().catch(() => "")) === "nobody@example.com");
        check(where, "refusal: still the door, no rail",
          (await page.locator(".bo-rail").count()) === 0 && await door.isVisible().catch(() => false));
        await page.screenshot({ path: `${ART}/door-refused-${size.w}.png` }); artifacts.push(`${ART}/door-refused-${size.w}.png`);
        const mine = consoleNoise.filter((n) => n.startsWith(`${size.w} · `));
        observed[where] = { anonConsole: mine.length };
        await ctx.close();
      }

      // ── B + C. SIGNED IN: THE RAIL, AND THE DEAD ADDRESS ──
      {
        const { ctx, page } = await openSigned(size);
        check(where, "signed in: /admin draws the rail", await page.locator(".bo-rail").isVisible().catch(() => false));
        check(where, "signed in: no door once inside", (await page.locator(".bo-door").count()) === 0);
        check(where, "signed in: no old five-tab markup (.pa-top) is served",
          (await page.locator(".pa-top").count()) === 0);
        const me = (await page.locator(".bo-me").innerText().catch(() => "")) || "";
        check(where, "signed in: the rail carries the visitor's own account",
          me.includes("Andrew"), me.replace(/\n/g, " ").slice(0, 80));
        await page.screenshot({ path: `${ART}/rail-${size.w}.png` }); artifacts.push(`${ART}/rail-${size.w}.png`);

        await page.goto(`${BASE}/admin/office${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("main.nf", { state: "attached", timeout: 30000 }).catch(() => {});
        await settle(page, 800);
        check(where, "dead address: /admin/office draws the product's own 404",
          (await page.locator("main.nf").count()) > 0);
        const leftover = (await page.locator(".bo-rail").count()) + (await page.locator(".bo-door").count()) + (await page.locator(".pa-top").count());
        check(where, "dead address: no rail, no door, no old markup there", leftover === 0, `${leftover} leftover`);
        await page.screenshot({ path: `${ART}/dead-${size.w}.png` }); artifacts.push(`${ART}/dead-${size.w}.png`);

        const mine = consoleNoise.filter((n) => n.startsWith(`${size.w} · `));
        const planned = mine.filter((n) => /http 400 · \/auth\/v1\/token|status of 400/.test(n));
        const other = mine.filter((n) => !planned.includes(n));
        check(where, "console silent apart from the asked-for refusal",
          other.length === 0, `${planned.length} planned; ${other.join(" | ").slice(0, 300)}`);
        observed[where] = { ...(observed[where] || {}), calls: "whoami+list via route" };
        completed++;
        await ctx.close();
      }
    }
  }
} catch (e) {
  failures.push(`crashed: ${e.message}`);
  console.error(e);
} finally {
  if (browser) await browser.close();
}

if (FREEZE) process.exit(failures.length ? 1 : 0);
const status = failures.length === 0 && canary.observed_failure && completed === SIZES.length ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: `office-move${LITE ? "-lite" : ""}`,
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 16,
  assertion_floor: "3 widths x 16 questions (door 6, refusal 3, rail 4, dead address 2, console 1), fixed by the code; a missing door or rail reddens its own question and its dependants are counted only when it exists, so a moved-back marker drops the count below the floor.",
  failures,
  artifacts,
  canary,
  warnings: [
    "Writes nothing: unsigned contexts never sign in (the refusal is answered locally); signed-in contexts use a made-up session and page.route() answers. Asks what the screen draws, not what the server does.",
    "The look itself is not judged here; the screenshots and the frozen copies in belt/shots/9.12a are the evidence for that.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), lite: LITE, ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
