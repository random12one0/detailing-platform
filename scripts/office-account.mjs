// ROADMAP 9.12a step 6, slice 6a — the three detailer jobs that lived only on the
// old five-tab back office, now in the new one: "Sign up a detailer" on the
// Detailers toolbar, and "Download everything they own" and "Send an owner
// invite" in the detailer panel.
//
//   node scripts/office-account.mjs                 (dev server on :5173; no credentials)
//   node scripts/office-account.mjs --lite          (the ?lite=1 reduced-motion path)
//   node scripts/office-account.mjs --break=hidden  (sabotage: the new controls are hidden)
//   node scripts/office-account.mjs --freeze=before|after   (Andrew's frozen copies, no assertions)
//
// WRITES NOTHING ANYWHERE. There is no sign-in: a made-up session sits in the
// browser's storage, and every `platform-admin` call is answered by page.route()
// from the three made-up detailers below. So `create`, `resend_invite` and
// `export` are asked what they SEND and what the screen does with each answer,
// never whether the server does its job (that is the edge function's own suite).
//
// WHAT IT ASKS, at 1440, 392 and 320:
//   1. the toolbar has "Sign up a detailer"; it opens a sheet; Create is off until
//      name, link and an email are there; the booking link follows the name;
//      a refusal shows the server's own sentence; a success sends exactly the
//      form and shows the invite link, read-only, in a box;
//   2. the panel's "Download everything they own" sends `export` for THAT
//      detailer and hands over a file named <slug>-<date>.json; a refusal is shown;
//   3. "Send an owner invite": Send is off without an "@"; it sends
//      resend_invite with role owner for THAT detailer; an emailed invite shows
//      no link; a failed email shows the link (the old screen's rule);
//   4. nothing sideways-overflows, no two controls in the new pieces overlap,
//      every new button has 44px of real hit area (elementFromPoint), console silent.
// THE CANARY injects an overlapping copy of a new button and requires the same
// overlap probe to name it.

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
const BASE = process.env.BASE || "http://localhost:5173";
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 700 }];
const ART = "artifacts/office-account";
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

const now = new Date().toISOString();
const row = (k, name, extra) => ({
  id: `acct-${k}`, slug: `acct-${k}`, name, is_demo: false, status: "active",
  owner_email: `owner${k}@example.com`, contact_email: null, site_url: null, domain: null,
  created_at: "2026-08-01T12:00:00Z", subscription: null, bookings_total: 0, days_since_booking: null,
  last_booking_at: null, jobs_month: 0, revenue_month: 0, customers: 0,
  setup_inputs: { business: { contact_phone: "" } }, ...extra,
});
const ROWS = [
  row(1, "Harbor Shine", { owner_email: null }),           // nobody accepted the invite yet
  row(2, "Juniper Mobile Detail", {}),
  row(3, "Kestrel Auto Spa", {}),
];

// A made-up session, far from expiring, so supabase-js reads it without asking the network.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
const user = { id: "00000000-0000-4000-8000-000000000001", email: "andrew@example.com", aud: "authenticated", role: "authenticated" };
const SESSION = {
  access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, exp, role: "authenticated", email: user.email })}.x`,
  refresh_token: "fake", token_type: "bearer", expires_in: 86400, expires_at: exp, user,
};

// The overlap/hit probes, run in the page, shared by the real questions and the canary.
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
const canary = { id: "injected-overlapping-account-button", observed_failure: false };
let completed = 0;
mkdirSync(ART, { recursive: true });
if (FREEZE) mkdirSync(SHOTS, { recursive: true });

async function openPage(size) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, acceptDownloads: true });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } }, [`sb-${REF}-auth-token`, JSON.stringify(SESSION)]);
  const page = await ctx.newPage();
  const sent = [];
  const answer = { create: "ok", export: "ok", resend_invite: "emailed" };
  await page.route(`**/auth/v1/user**`, (r) => r.fulfill({ json: user }));
  await page.route("**/functions/v1/platform-admin", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    sent.push(body);
    const no = (msg) => route.fulfill({ status: 400, json: { error: msg } });
    switch (body.action) {
      case "whoami": return route.fulfill({ json: { email: user.email } });
      case "list": return route.fulfill({ json: { rows: ROWS, totals: {} } });
      case "get": return route.fulfill({ json: { bookings: [], invoices: [], events: [] } });
      case "export":
        return answer.export === "no" ? no("Could not gather their data right now.")
          : route.fulfill({ json: { export: { business: { id: body.business_id }, customers: [] } } });
      case "resend_invite":
        if (answer.resend_invite === "no") return no("That email address is not valid.");
        return route.fulfill({ json: { invite: {
          email: body.email, emailed: answer.resend_invite === "emailed",
          expires_at: "2026-10-17T12:00:00Z", link: "https://detailingplatform.com/accept#token=FEDLINK",
        } } });
      case "create":
        if (answer.create === "no") return no("That booking link is already taken.");
        return route.fulfill({ json: { business: { id: "new-1", name: body.name, slug: body.slug },
          invite: { email: body.owner_email, emailed: true, link: "https://detailingplatform.com/accept#token=NEWLINK" } } });
      default: return route.fulfill({ json: {} });
    }
  });
  if (BREAK === "hidden") await ctx.addInitScript(() => {
    const s = () => { const st = document.createElement("style"); st.textContent = ".bo-signup-open, .bo-account { display: none !important; }"; document.head.appendChild(st); };
    if (document.head) s(); else document.addEventListener("DOMContentLoaded", s);
  });
  watchConsole(page, `${size.w}`, consoleNoise);
  await page.goto(`${BASE}/admin/office${LITE ? "?lite=1" : ""}#detailers`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bo-row", { timeout: 60000 });
  await settle(page, 1200);
  return { ctx, page, sent, answer };
}
const lastOf = (sent, action) => [...sent].reverse().find((b) => b.action === action);
const openPanel = async (page, name) => {
  await page.locator(".bo-row", { hasText: name }).first().click();
  await page.waitForSelector(".bo-panel", { timeout: 10000 });
  await settle(page, 900);
};

try {
  browser = await chromium.launch();

  if (FREEZE) {
    const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
    const { ctx, page } = await openPage({ w: 1440, h: 900 });
    const before = FREEZE === "before";
    await freeze(page, {
      out: `${SHOTS}/${before ? "before-signup" : "after-signup"}.html`, label: before ? "Before" : "After",
      note: before ? "The new back office's Detailers list has no way to sign up a detailer; that button is only on the old screen."
        : "Sign up a detailer is now a button on the Detailers toolbar; it opens a sheet with the same form the old screen had.",
      highlight: before ? ".bo-toolbar" : ".bo-signup-open",
    });
    await openPanel(page, "Harbor Shine");
    await page.evaluate(() => document.querySelector(".bo-pscroll").scrollTo(0, 1e5));
    await settle(page, 400);
    await freeze(page, {
      out: `${SHOTS}/${before ? "before" : "after"}.html`, label: before ? "Before" : "After",
      note: before ? "A detailer who never accepted their invite: the new panel offers no way to re-send it, and no way to download their data. Both are only on the old screen."
        : "The panel now has \"Their account\": download everything they own, and send an owner invite (opened here, for a detailer with no owner yet).",
      ...(before ? { highlight: ".bo-pfoot" } : { highlight: ".bo-account" }),
    });
    if (!before) {
      // The after copy shows the invite form open, which is the situation.
      await page.locator(".bo-account button", { hasText: "Send an owner invite" }).click();
      await settle(page, 400);
      await freeze(page, { out: `${SHOTS}/after.html`, label: "After",
        note: "The panel now has \"Their account\": download everything they own, and send an owner invite (opened here, for a detailer with no owner yet).",
        highlight: ".bo-account" });
    }
    await ctx.close();
    console.log(`froze ${FREEZE} into ${SHOTS}`);
  } else {
    for (const size of SIZES) {
      const where = `${size.w}${LITE ? " lite" : ""}`;
      console.log(`\n${where}`);
      const { ctx, page, sent, answer } = await openPage(size);

      // ── 1. SIGN UP A DETAILER ──
      const opener = page.locator(".bo-signup-open");
      check(where, "the toolbar has Sign up a detailer", await opener.isVisible().catch(() => false));
      let p = await probe(page, ".bo-toolbar button");
      check(where, "toolbar: no overlap, no sideways overflow", p.overlaps.length === 0 && !p.overflowX, p.overlaps.join(" | "));
      check(where, "toolbar: Sign up a detailer has 44px of hit area", (await probe(page, ".bo-signup-open")).thin.length === 0);
      if (await opener.isVisible().catch(() => false)) {
        await opener.click();
        await page.waitForSelector(".bo-signup", { timeout: 5000 }).catch(() => {});
        await settle(page, 900);
        const create = page.locator(".bo-signup button[type=submit]");
        check(where, "Create is off on an empty form", await create.isDisabled().catch(() => false));
        await page.fill(".bo-signup input[name=name]", "Lark & Co Detail");
        check(where, "the booking link follows the name", (await page.inputValue(".bo-signup input[name=slug]")) === "lark-co-detail");
        await page.fill(".bo-signup input[name=owner_email]", "lark@example.com");
        check(where, "Create turns on with name, link and email", await create.isEnabled());
        p = await probe(page, ".bo-signup button, .bo-signup input");
        check(where, "sign-up sheet: no overlap, buttons 44px", p.overlaps.length === 0 && p.thin.length === 0, [...p.overlaps, ...p.thin].join(" | "));
        await page.screenshot({ path: `${ART}/signup-${size.w}.png` }); artifacts.push(`${ART}/signup-${size.w}.png`);

        answer.create = "no";
        await create.click();
        await page.waitForSelector(".bo-signup .bo-err", { timeout: 5000 }).catch(() => {});
        check(where, "a refused sign-up shows the server's sentence", (await page.locator(".bo-signup .bo-err").innerText().catch(() => "")).includes("already taken"));
        check(where, "a refused sign-up keeps what was typed", (await page.inputValue(".bo-signup input[name=name]")) === "Lark & Co Detail");

        answer.create = "ok";
        await create.click();
        await page.waitForSelector(".bo-signup .bo-made", { timeout: 5000 }).catch(() => {});
        const c = lastOf(sent, "create") ?? {};
        check(where, "create sends exactly the form", c.name === "Lark & Co Detail" && c.slug === "lark-co-detail" && c.owner_email === "lark@example.com"
          && c.timezone === "America/Los_Angeles" && c.contact_phone === "", JSON.stringify(c));
        const link = page.locator(".bo-signup .bo-made input[readonly]");
        check(where, "a made account shows the invite link, read-only", (await link.inputValue().catch(() => "")).includes("NEWLINK"));
        check(where, "the list was read again after the sign-up", sent.filter((b) => b.action === "list").length >= 2);
        await page.screenshot({ path: `${ART}/signup-made-${size.w}.png` }); artifacts.push(`${ART}/signup-made-${size.w}.png`);
        await page.keyboard.press("Escape");
        await page.waitForSelector(".bo-signup", { state: "detached", timeout: 5000 }).catch(() => {});
        check(where, "Escape closes the sign-up sheet", (await page.locator(".bo-signup").count()) === 0);
      }

      // ── 2 & 3. THE PANEL: EXPORT AND OWNER INVITE ──
      await openPanel(page, "Harbor Shine");
      const acct = page.locator(".bo-account");
      check(where, "the panel has a Their account section", await acct.isVisible().catch(() => false));
      if (await acct.isVisible().catch(() => false)) {
        await acct.scrollIntoViewIfNeeded();
        check(where, "a detailer with no owner says so", (await acct.innerText()).includes("Nobody has accepted"));

        answer.export = "no";
        await acct.locator("button", { hasText: "Download everything" }).click();
        await page.waitForSelector(".bo-account .bo-err", { timeout: 5000 }).catch(() => {});
        check(where, "a refused export shows the server's sentence", (await acct.locator(".bo-err").innerText().catch(() => "")).includes("Could not gather"));
        answer.export = "ok";
        const [dl] = await Promise.all([
          page.waitForEvent("download", { timeout: 8000 }).catch(() => null),
          acct.locator("button", { hasText: "Download everything" }).click(),
        ]);
        const today = new Date().toLocaleDateString("en-CA");
        check(where, "export hands over <slug>-<date>.json", dl?.suggestedFilename() === `acct-1-${today}.json`, dl?.suggestedFilename() ?? "no download");
        check(where, "export asked for THIS detailer", lastOf(sent, "export")?.business_id === "acct-1");
        check(where, "a good export clears the earlier refusal", (await acct.locator(".bo-err").count()) === 0);

        await acct.locator("button", { hasText: "Send an owner invite" }).click();
        await settle(page, 400);
        const send = acct.locator("button", { hasText: /^Send it/ });
        check(where, "Send is off without an @", await send.isDisabled().catch(() => false));
        await acct.locator("input[type=email]").fill("harbor@example.com");
        check(where, "Send turns on with an address", await send.isEnabled().catch(() => false));
        p = await probe(page, ".bo-account button, .bo-account input");
        check(where, "account section: no overlap, buttons 44px, no sideways overflow", p.overlaps.length === 0 && p.thin.length === 0 && !p.overflowX, [...p.overlaps, ...p.thin].join(" | "));
        // CANARY, at the first width: the same probe must name an injected overlap.
        if (size.w === SIZES[0].w) {
          await page.evaluate(() => {
            const b = document.querySelector(".bo-account button"), r = b.getBoundingClientRect();
            const c = b.cloneNode(true); c.dataset.canary = "1";
            // A negative margin, not position:fixed: the panel is transformed, so a fixed
            // child is placed against the panel and lands nowhere near the button.
            c.style.marginLeft = `-${r.width - 8}px`;
            b.after(c);
          });
          const cp = await probe(page, ".bo-account button, .bo-account input");
          await page.evaluate(() => document.querySelectorAll("[data-canary]").forEach((n) => n.remove()));
          canary.observed_failure = BREAK === "blind" ? false : cp.overlaps.length >= 1;
          canary.detail = `overlaps seen with one injected: ${BREAK === "blind" ? "probe blinded" : cp.overlaps.length}`;
          console.log(`    canary ${canary.observed_failure ? "CAUGHT" : "MISSED"}: ${canary.detail}`);
        }
        await page.screenshot({ path: `${ART}/panel-${size.w}.png` }); artifacts.push(`${ART}/panel-${size.w}.png`);

        answer.resend_invite = "no";
        await send.click();
        await page.waitForSelector(".bo-account .bo-err", { timeout: 5000 }).catch(() => {});
        check(where, "a refused invite shows the server's sentence", (await acct.locator(".bo-err").innerText().catch(() => "")).includes("not valid"));

        answer.resend_invite = "emailed";
        await send.click();
        await page.waitForSelector(".bo-account .bo-sent", { timeout: 5000 }).catch(() => {});
        const inv = lastOf(sent, "resend_invite") ?? {};
        check(where, "invite sends owner role for THIS detailer", inv.business_id === "acct-1" && inv.role === "owner" && inv.email === "harbor@example.com", JSON.stringify(inv));
        const sentText = await acct.locator(".bo-sent").innerText().catch(() => "");
        check(where, "an emailed invite says where it went and shows no link", sentText.includes("harbor@example.com") && !sentText.includes("FEDLINK")
          && (await acct.locator(".bo-sent input").count()) === 0, sentText);

        answer.resend_invite = "failed-email";
        await send.click();
        await page.waitForFunction(() => document.querySelector(".bo-account .bo-sent input"), null, { timeout: 5000 }).catch(() => {});
        check(where, "an invite whose email failed shows the link to send by hand",
          (await acct.locator(".bo-sent input").inputValue().catch(() => "")).includes("FEDLINK"));
      }

      // The three refusals above are 400s on purpose; each prints one http line and one
      // "Failed to load resource" line. Exactly those, and nothing else, is silent.
      const mine = consoleNoise.filter((n) => n.startsWith(`${size.w} · `));
      const planned = mine.filter((n) => /http 400 · \/functions\/v1\/platform-admin|status of 400/.test(n));
      const other = mine.filter((n) => !planned.includes(n));
      check(where, "console silent apart from the 3 refusals asked for", other.length === 0 && planned.length === 6, `${planned.length} planned; ${other.join(" | ").slice(0, 300)}`);
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
const status = failures.length === 0 && canary.observed_failure && completed === SIZES.length ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: `office-account${LITE ? "-lite" : ""}`,
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 27,
  assertion_floor: "3 widths x 27 questions (sign-up 13, panel 13: export 6, invite 7, console 1), fixed by the code; a missing control reddens its own question and its dependants are counted only when it exists, so a hidden control drops the count below the floor.",
  failures,
  artifacts,
  canary,
  warnings: [
    "Writes nothing: a made-up session and page.route() answers for three made-up detailers. Asks what the screen sends and shows, not what the server does.",
    "The look itself is not judged here; the screenshots and the frozen copies in belt/shots/9.12a are the evidence for that.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), lite: LITE, ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
