// ROADMAP 99.1 — THE GOOGLE BUSINESS SCREEN: CONNECT, DISCONNECT, AND SAYING SO
// WHEN GOOGLE REFUSES OR THE LINK BREAKS.
//
//   set -a; . ./.env; set +a
//   node scripts/google-business.mjs                 # dev server on :5173
//   node scripts/google-business.mjs --break=silent  # sabotage: the failure sentence is removed from the served module
//
// EVERY `google-business` ANSWER IS FAKED IN THE PAGE (page.route). The function
// is not deployed and its table is not applied, so this proves the SCREEN, not
// the server — the server's rules are `tests/google-business.test.mjs`. Nothing
// is written to the database and no Google address is requested; the run
// asserts the second by watching every request the page makes.
//
// Cases, per width (1440, 392, 320, and 392 under ?lite=1), signed in as the demo
// OWNER: off / nothing connected / connect then disconnect / Google refused /
// link broken / the call itself failing; and as STAFF (the function's 404).
// Each owner case also asks the layout questions a phone gets wrong: no sideways
// page scroll, every button 44px tall, no text clipped in the card, console silent.
//
// THE SABOTAGE IS THE ORIGINAL RISK: a refusal that draws nothing. `--break=silent`
// serves GoogleBusiness.jsx with the problem sentence switched off, and signs
// the rewrite in the page; a run where it did not land or did not run exits 3.
// One `goto` per context (docs/gotchas.md 113).

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner, demoStaff } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)(join(REPO, "app/node_modules/playwright/index.js"));
const BASE = process.env.BASE_URL || "http://localhost:5173";
const BREAK = (process.argv.slice(2).find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
if (BREAK && BREAK !== "silent") { console.error(`unknown --break=${BREAK}; the only one is silent`); process.exit(2); }
if (!(process.env.SUPABASE_URL || "").includes("kguqylyzgyzfktkfnhjb")) {
  console.error("SUPABASE_URL missing or not kguqylyzgyzfktkfnhjb — run `set -a; . ./.env; set +a`. NOTHING WAS MEASURED.");
  process.exit(2);
}

const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 720 }, { w: 392, h: 844, lite: true }];
const ART = join(REPO, ".manager-shots", "99.1");
mkdirSync(ART, { recursive: true });

const status = (state, extra = {}) => ({
  available: true, state, connected: state === "connected",
  account: state === "connected" ? "test account (stub)" : null,
  connectedAt: state === "connected" ? "2026-10-10T12:00:00Z" : null, syncing: false, ...extra,
});

// ASSERTIONS PER SIZE, declared as an equality (docs/gotchas.md 98). `own` is
// what the case asserts itself; every owner case adds the four common asks.
const OWNER_CASES = { off: 3, none: 3, "connect-disconnect": 6, refused: 4, broken: 4, "call-fails": 3 };
const COMMON = 4;                 // no sideways scroll, 44px buttons, nothing clipped, console silent
const OWNER_NETWORK = 1;          // no request left the app for Google
const STAFF = 4;                  // told plainly, no buttons, console, no Google request
const CANARIES = 2;
const EXPECTED = SIZES.length * (Object.values(OWNER_CASES).reduce((n, o) => n + o + COMMON, 0) + OWNER_NETWORK + STAFF) + CANARIES;

const failures = [], observed = [], sabotage = [], artifacts = [];
let assertions = 0;
const ok = (cond, name, detail) => {
  assertions++;
  const line = `${cond ? "PASS" : "FAIL"} ${name} — ${detail}`;
  console.log(line);
  observed.push(line);
  if (!cond) failures.push(`${name}: ${detail}`);
};

// THE RULES AS PURE FUNCTIONS, so the canaries bite the production rule.
const reachedGoogle = (urls) => urls.filter((u) => {
  try {
    const h = new URL(u).hostname;
    return /(^|\.)(google|googleapis|gstatic)\.com$/i.test(h) && !/^fonts\./i.test(h);
  } catch { return false; }
});
// Andrew, 2026-10-11: "the disconnect Google button needs to have some outline on it" —
// it was `.btn.ghost`, bare text. An outline is a border at least 1px wide whose colour
// is neither transparent nor the card's own ground.
const hasOutline = (b) => b.width >= 1 && !/^(transparent|rgba\(.*,\s*0\))$/.test(b.color) && b.color !== b.ground;
const saysProblem = (text) => /Google/.test(text) && /not been changed/.test(text);

// The screen's own content: the owner's card, or the staff sentence. NOT `.settings-body`,
// which a phone does not have (docs/gotchas.md 110).
const CARD = ".card:has(> .section-title)";
const SCREEN = `${CARD}, :text("Only the owner can connect Google")`;

async function signIn(page, acct) {
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", acct.email);
    await page.fill("input[type=password]", acct.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
}

// Leaves for Today first, so each case mounts the screen afresh and asks `status`
// again WITHOUT a reload: a reload would run the cached original of a rewritten
// module and void the sabotage (docs/gotchas.md 113).
async function openScreen(page) {
  await page.locator(".tabbar >> text=Today").first().click();
  await page.waitForTimeout(400);
  await page.locator(".tabbar >> text=Business").first().click();
  const row = page.locator('.nav-row[data-settings-key="google"]');
  await row.waitFor({ state: "visible", timeout: 15000 });
  // The tab may come back with the screen still open; pressing its row again would close it.
  await page.waitForTimeout(500);
  if (!(await page.locator(SCREEN).count())) await row.click();
  try { await page.locator(SCREEN).first().waitFor({ timeout: 15000 }); }
  catch (e) { await page.screenshot({ path: join(ART, "open-failed.png") }); console.error("open failed at", page.url(), (await page.locator("body").innerText()).slice(0, 200)); throw e; }
  await page.waitForTimeout(700);
}

async function layout(page, tag, shot) {
  const m = await page.evaluate(() => {
    const card = document.querySelector(".card > .section-title")?.parentElement;
    const btns = [...card.querySelectorAll("button.btn")]
      .map((b) => Math.round(b.getBoundingClientRect().height));
    const clipped = [card, ...card.querySelectorAll("*")]
      .filter((e) => (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== "visible")
        || e.getBoundingClientRect().right > innerWidth + 1)
      .map((e) => e.className || e.tagName);
    return { sideways: document.documentElement.scrollWidth - innerWidth, btns, clipped, card: !!card };
  });
  ok(m.card && m.sideways <= 0, `${tag}/no-sideways-scroll`, m.card ? `page is ${m.sideways}px wider than the window` : "the card never drew");
  ok(m.btns.every((h) => h >= 44), `${tag}/buttons-44px`, `button heights: ${m.btns.join(",") || "none"}`);
  ok(m.clipped.length === 0, `${tag}/nothing-clipped`, m.clipped.length ? `clipped: ${m.clipped.join(", ")}` : "none");
  await page.screenshot({ path: join(ART, `${shot}.png`) });
  artifacts.push(`.manager-shots/99.1/${shot}.png`);
}

const browser = await chromium.launch();
try {
  for (const { w, h, lite } of SIZES) {
    const size = `${w}${lite ? "-lite" : ""}`;
    for (const acct of [{ label: "owner", ...demoOwner() }, { label: "staff", ...demoStaff() }]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const consoleLines = [], urls = [];
      page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") consoleLines.push(m.text()); });
      page.on("request", (r) => urls.push(r.url()));

      // What `google-business` answers next. Mutated by each case.
      const fake = { mode: "stub", state: "none", fail: false, next: null, calls: [] };
      await page.route("**/functions/v1/google-business", async (route) => {
        const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "content-type": "application/json" };
        if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
        if (acct.label === "staff") return route.fulfill({ status: 404, headers: cors, body: '{"error":"not_found"}' });
        const { action } = JSON.parse(route.request().postData() || "{}");
        fake.calls.push(action);
        if (fake.fail && action !== "status") return route.fulfill({ status: 500, headers: cors, body: '{"error":"server_error"}' });
        if (action === "start") fake.state = fake.next || "connected";
        if (action === "disconnect") fake.state = "none";
        return route.fulfill({ status: 200, headers: cors, body: JSON.stringify(status(fake.state, { available: fake.mode !== "off" })) });
      });

      let sab = null;
      if (BREAK) {
        sab = { tag: `${acct.label}/${size}`, landed: 0, ran: false };
        sabotage.push(sab);
        await page.route("**/src/screens/more/GoogleBusiness.jsx*", async (route) => {
          const res = await route.fetch();
          let body = await res.text();
          const needle = "PROBLEM[link.state] &&";
          sab.landed = body.split(needle).length - 1;
          body = "globalThis.__gbBreak = true;\n" + body.replace(needle, "false &&");
          await route.fulfill({ response: res, body, headers: { ...res.headers(), "cache-control": "no-store" } });
        });
      }

      await page.goto(`${BASE}/app${lite ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
      await signIn(page, acct);
      const body = () => page.locator(CARD).innerText();
      const btn = (name) => page.locator(`${CARD} button.btn`, { hasText: name });

      if (acct.label === "staff") {
        await openScreen(page);
        const tag = `staff/${size}`;
        const txt = await page.locator("body").innerText();
        ok(/Only the owner can connect Google/.test(txt), `${tag}/told-plainly`, txt.slice(0, 80).replace(/\s+/g, " "));
        ok((await page.locator("button.btn", { hasText: /^(Connect|Disconnect)/ }).count()) === 0, `${tag}/no-buttons`, "no Connect or Disconnect offered");
        await page.screenshot({ path: join(ART, `staff-${size}.png`) });
        artifacts.push(`.manager-shots/99.1/staff-${size}.png`);
        // The function's own 404 for a non-owner is a designed answer; the browser logs it once per load.
        ok(consoleLines.every((l) => /404/.test(l)), `${tag}/console-only-the-designed-404`, `${consoleLines.length} line(s): ${consoleLines.slice(0, 2).join(" | ")}`);
        ok(reachedGoogle(urls).length === 0, `${tag}/no-google-request`, `${reachedGoogle(urls).join(", ") || "none"} of ${urls.length} requests`);
      } else {
        const run = async (id, setup, fn) => {
          Object.assign(fake, { mode: "stub", state: "none", fail: false, next: null, calls: [] });
          setup?.();
          consoleLines.length = 0;
          await openScreen(page);
          await fn();
          const tag = `owner/${size}/${id}`;
          await layout(page, tag, `${id}-${size}`);
          // A 500 we faked ourselves logs one "Failed to load resource"; that is the case, not a defect.
          const real = consoleLines.filter((l) => !(id === "call-fails" && /Failed to load resource.*500/.test(l)));
          ok(real.length === 0, `${tag}/console-silent`, `${real.length} line(s)${real.length ? ": " + real.slice(0, 2).join(" | ") : ""}`);
        };

        await run("off", () => { fake.mode = "off"; }, async () => {
          const t = await body(); const tag = `owner/${size}/off`;
          ok(/not switched on yet/.test(t), `${tag}/says-not-on`, t.slice(0, 60).replace(/\s+/g, " "));
          ok((await btn(/^Connect/).count()) === 0, `${tag}/no-connect-button`, "none offered");
          ok((await btn("Disconnect").count()) === 0, `${tag}/no-disconnect-button`, "none offered");
        });

        await run("none", null, async () => {
          const tag = `owner/${size}/none`;
          ok((await btn("Connect Google").count()) === 1, `${tag}/connect-offered`, "one Connect Google button");
          ok((await btn(/^Disconnect/).count()) === 0, `${tag}/nothing-to-disconnect`, "none offered");
          ok(!saysProblem(await body()), `${tag}/no-problem-box`, "no error shown on a fresh screen");
        });

        await run("connect-disconnect", null, async () => {
          const tag = `owner/${size}/connect-disconnect`;
          await btn("Connect Google").click();
          await page.locator(`${CARD} .pill.completed`).waitFor({ timeout: 10000 });
          const t = await body();
          ok(/Connected to test account/.test(t), `${tag}/shows-connected`, t.slice(0, 70).replace(/\s+/g, " "));
          ok(/not sent to Google yet/.test(t), `${tag}/says-nothing-syncs-yet`, "the not-in-step line is on screen while syncing is false");
          ok((await btn("Disconnect Google").count()) === 1 && (await btn(/^Connect/).count()) === 0, `${tag}/disconnect-offered`, "Disconnect shown, Connect gone");
          const edge = await btn("Disconnect Google").evaluate((b) => {
            const s = getComputedStyle(b);
            return { width: parseFloat(s.borderTopWidth), color: s.borderTopColor, ground: getComputedStyle(b.closest(".card")).backgroundColor };
          });
          ok(hasOutline(edge), `${tag}/disconnect-outlined`, `border ${edge.width}px ${edge.color} on ${edge.ground}`);
          await page.screenshot({ path: join(ART, `connected-${size}.png`) });
          artifacts.push(`.manager-shots/99.1/connected-${size}.png`);
          page.once("dialog", (d) => d.accept());
          await btn("Disconnect Google").click();
          await btn("Connect Google").waitFor({ timeout: 10000 });
          const t2 = await body();
          ok(!/Connected to/.test(t2) && (await btn(/^Disconnect/).count()) === 0, `${tag}/back-to-nothing`, "connected row gone, nothing left to disconnect");
          ok(fake.calls.filter((c) => c === "start").length === 1 && fake.calls.includes("disconnect"), `${tag}/one-start-one-disconnect`, fake.calls.join(","));
        });

        for (const failure of ["refused", "broken"]) {
          await run(failure, () => { fake.state = failure; }, async () => {
            const tag = `owner/${size}/${failure}`;
            const t = await body();
            ok(saysProblem(t), `${tag}/says-so-in-plain-words`, t.slice(0, 110).replace(/\s+/g, " "));
            ok(!/Connected to/.test(t), `${tag}/does-not-claim-connected`, "no connected row");
            ok((await btn("Connect again").count()) === 1, `${tag}/can-try-again`, "Connect again offered");
            ok((await btn("Disconnect Google").count()) === 1, `${tag}/can-remove-it`, "Disconnect offered");
          });
        }

        await run("call-fails", null, async () => {
          const tag = `owner/${size}/call-fails`;
          fake.fail = true;
          await btn("Connect Google").click();
          await page.locator(`${CARD} .error-box`).waitFor({ timeout: 10000 });
          const t = await body();
          ok(/Could not reach Google just now\. Nothing was changed/.test(t), `${tag}/plain-sentence`, t.slice(-90).replace(/\s+/g, " "));
          ok((await btn("Connect Google").count()) === 1, `${tag}/still-offers-connect`, "state unchanged");
          ok(!/Connected to/.test(t), `${tag}/does-not-claim-connected`, "no connected row after a failed press");
        });

        ok(reachedGoogle(urls).length === 0, `owner/${size}/no-google-request`, `${reachedGoogle(urls).join(", ") || "none"} of ${urls.length} requests`);
      }

      if (sab) {
        sab.ran = await page.evaluate(() => globalThis.__gbBreak === true);
        if (sab.landed !== 1 || !sab.ran) {
          console.error(`SABOTAGE DID NOT TAKE at ${sab.tag}: replaced ${sab.landed} of 1, ran ${sab.ran}. Proves nothing (gotchas 102, 113).`);
          process.exitCode = 3;
        }
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

// ── THE CANARIES ──────────────────────────────────────────────────────────
const c1 = reachedGoogle(["https://mybusiness.googleapis.com/v4/accounts"]).length === 1
  && reachedGoogle(["https://fonts.googleapis.com/css"]).length === 0;
ok(c1, "canary/google-host", "a business API request is caught; a font request is not");
const c2 = saysProblem("Connect again") === false && saysProblem("Google did not accept the link. Your Google listing has not been changed.") === true;
ok(c2, "canary/problem-sentence", "a bare button label is not a problem sentence; the real one is");

if (assertions !== EXPECTED) failures.push(`assertion count ${assertions} != declared ${EXPECTED} — a run that never reached a case`);

const targets = SIZES.length * 2;
const verdict = failures.length ? "fail" : "pass";
const { path } = writeReceipt({
  check_id: "google-business",
  started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  status: verdict,
  expected_targets: targets, discovered_targets: targets, attempted_targets: targets, completed_targets: targets, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: EXPECTED,
  assertion_floor: `${SIZES.length} sizes x (6 owner cases + staff + network) + ${CANARIES} canaries = ${EXPECTED}, asserted as an EQUALITY (docs/gotchas.md 98).`,
  failures,
  warnings: [
    "Every google-business answer is faked in the page; the function and its table are not deployed/applied, so the SERVER is proved only by tests/google-business.test.mjs.",
    "UNJUDGEABLE: how the screen LOOKS (spacing, weight, colour). Screenshots are in .manager-shots/99.1/ for Andrew's eyes; this run measures overflow, tap height, clipping and words only.",
    "Dev server only; the published bundle does not have this screen.",
  ],
  artifacts,
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}${s.lite ? "-lite" : ""}`), cases: Object.keys(OWNER_CASES), item: "99.1", break: BREAK },
  canary: { id: "google-host+problem-sentence", observed_failure: c1 && c2 },
  sabotage, observed,
});
console.log(`receipt: ${path}`);
console.log(`\n${verdict.toUpperCase()} — ${assertions} assertions, ${failures.length} failed`);
if (failures.length && !process.exitCode) process.exitCode = 1;
