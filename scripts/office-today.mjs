// ROADMAP 9.12a plan step 2 — the new back office's Today place, in a real browser,
// at 1440, 768 and 390.
//
//   node scripts/office-today.mjs            (dev server on :5173, credentials in .env)
//   node scripts/office-today.mjs --lite     (the ?lite=1 reduced-motion path)
//   node scripts/office-today.mjs --break=blind
//
// TWO PASSES PER WIDTH. The LIVE pass reads the real platform and asks what does
// not depend on who is in it: Today is the first place, its four sections are
// there, the headline money equals what `platform_net` sent, the 12-month chart
// has 12 months and draws money OUT only for a month the server says bills were
// entered, and Needs you holds as many as the Detailers place's own "Needs you"
// chip says (capped at five). The FED pass answers the `list` call with seven
// known real accounts (four with a phone, three without, dearest to cheapest) so
// the rules that need a particular population are asked of a population that
// has one: five shown, dearest first, "2 more", Text only where there is a phone.
// Nothing is written to the database; the feed is page.route().
//
// THE CANARY injects a Text link into a no-phone item and requires the same
// inspector to name it, and pushes one month label on top of the next to require
// the overlap inspector to name that. `--break=blind` blinds the phone rule in
// the inspector, which must turn the canary red; the receipt then lands in
// receipts/office-today.sabotage.json.
//
// Signs in as a THROWAWAY platform admin, created here and deleted in a finally
// (scripts/admin-account.mjs). Do not wrap in `timeout` (docs/gotchas.md 90).

import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";
const LITE = process.argv.includes("--lite");
const ADMIN_EMAIL = "office-today-test@detailplatform.com";
const SIZES = [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }];
const ART = "artifacts/office-today";
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — nothing measured, no receipt written.");
  process.exit(1);
}
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) {
  console.error("SUPABASE_URL is not project kguqylyzgyzfktkfnhjb — refusing to run.");
  process.exit(1);
}

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

const EXPLAINERS = [
  "All 14 in one list", "Click anyone to see everything", "Tap a red number", "Bigger bubble",
  "Usage bar", "Each square is one live site", "How the business is doing", "Quiet when everything works. Loud",
];

// ONE INSPECTOR, run in the page, used by the real questions AND the canary.
const INSPECT = (blind) => {
  const out = { phoneLinks: [], overlaps: [], overflowX: false, explainers: [], oldTabs: 0, ringWords: [] };
  out.overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;
  out.oldTabs = document.querySelectorAll(".pa-tab").length;
  const text = document.body.innerText;
  out.explainers = EXPLAINERS_IN_PAGE.filter((s) => text.includes(s));
  const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const R = (el) => el.getBoundingClientRect();
  const seen = (el) => R(el).width > 0 && getComputedStyle(el).display !== "none";
  // Phone rule: judged per needs-you item. `data-has-phone` is written by the
  // script from the payload, never read from the product.
  for (const li of document.querySelectorAll(".bo-need")) {
    if (li.dataset.hasPhone === "1" || blind) continue;
    for (const a of li.querySelectorAll('a[href^="tel:"], a[href^="sms:"]')) out.phoneLinks.push(`${li.querySelector("b")?.textContent}: ${a.getAttribute("href")}`);
    for (const a of li.querySelectorAll("a, button")) if (/^(text|call)\b/i.test(a.textContent.trim())) out.phoneLinks.push(`${li.querySelector("b")?.textContent}: "${a.textContent.trim()}"`);
    if (/\bring\b/i.test(li.innerText)) out.ringWords.push(li.innerText.slice(0, 50));
  }
  // Overlap: the cells of a needs-you item, the three columns of a path line, the
  // twelve month labels.
  const groups = [...document.querySelectorAll(".bo-need")].map((n) => [...n.children]);
  groups.push(...[...document.querySelectorAll(".bo-path li")].map((n) => [...n.children]));
  groups.push([...document.querySelectorAll(".bo-mlab")]);
  groups.push([...document.querySelectorAll(".bo-stats > div")]);
  for (const g of groups) {
    const els = g.filter(seen);
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      if (hit(R(els[i]), R(els[j]))) out.overlaps.push(`${els[i].className || els[i].tagName} x ${els[j].className || els[j].tagName}`);
    }
  }
  // Text must stay inside its own box.
  out.clipped = [...document.querySelectorAll(".bo-need-t, .bo-path-l, .bo-stats dt, .bo-vs-l")]
    .filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.slice(0, 30));
  return out;
};
const inspect = (page, blind = false) => page.evaluate(`(() => { const EXPLAINERS_IN_PAGE = ${JSON.stringify(EXPLAINERS)}; return (${INSPECT.toString()})(${blind}); })()`);

const hitProbe = (page, selector) => page.evaluate((sel) => {
  const bad = [];
  for (const el of document.querySelectorAll(sel)) {
    // Bring it to the middle of the screen first: at 768 and 390 the dock is fixed
    // over the bottom of the page, and a press is judged where the person is looking.
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (const dy of [-21, 21]) {
      const y = cy + dy;
      if (y < 0 || y > innerHeight) continue;
      const hit = document.elementFromPoint(cx, y);
      if (!hit || !(el === hit || el.contains(hit))) bad.push(`${(el.textContent || el.getAttribute("aria-label") || sel).trim().slice(0, 24)} @${dy}`);
    }
  }
  return bad;
}, selector);

// Seven known real accounts, dearest to cheapest, four with a phone and three without.
const FED = (liveRows) => {
  const proto = liveRows[0];
  const names = ["Alder", "Birch", "Cedar", "Dogwood", "Elm", "Fir", "Gum"];
  const synthetic = names.map((nm, k) => {
    const cents = (7 - k) * 1000, phone = (7 - k) % 2 === 1;
    const r = structuredClone(proto);
    return {
      ...r, id: `fed-${k}`, slug: `fed-${k}`, name: `Fed ${nm}`, is_demo: false, status: "active",
      owner_email: `fed${k}@example.com`, site_url: "https://x.example", domain: null,
      subscription: { status: "active", recurring_cents: cents, bill_interval: "month", suspended_at: null, cancel_at_period_end: false },
      bookings_total: 10, days_since_booking: 40, jobs_month: 0, revenue_month: 0,
      setup_inputs: { ...r.setup_inputs, business: { ...(r.setup_inputs?.business ?? {}), contact_phone: phone ? `(616) 555-01${k}0` : "" } },
    };
  });
  return { synthetic, rows: [...liveRows.filter((r) => r.is_demo), ...synthetic] };
};

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H })).json().catch(() => ({}));
const left = (all.users ?? []).find((u) => u.email === ADMIN_EMAIL);
if (left) { await dropAdmin(URL_, KEY, left.id); console.log("deleted a leftover throwaway admin first"); }
console.log(`writing: one throwaway platform admin on ${new URL(URL_).host}, removed when this run ends`);
const acct = await makeAdmin(URL_, KEY, ADMIN_EMAIL);
if (!acct) { console.error("could not create the throwaway admin; nothing measured"); process.exit(1); }
const redact = (t) => String(t).split(acct.password).join("[password]");

let browser = null;
let signedIn = null;
const canary = { id: "injected-text-link-and-overlapping-month-label", observed_failure: false };
let completed = 0, monthsSeen = 0, fedItems = 0;
mkdirSync(ART, { recursive: true });
const plain = (s) => s.replace(/\s+/g, " ").trim();
try {
  browser = await chromium.launch();
  for (const size of SIZES) {
    const where = `${size.w}${LITE ? " lite" : ""}`;
    console.log(`\n${where}`);
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, storageState: signedIn || undefined });
    const page = await ctx.newPage();
    watchConsole(page, where, consoleNoise);
    let list = null;
    const nets = {};
    page.on("response", async (res) => {
      if (!res.url().includes("/functions/v1/platform-admin") || res.request().method() !== "POST") return;
      try {
        const j = await res.json();
        if (j?.rows) list = j;
        if (j?.period_month) nets[j.period_month] = j;
      } catch { /* not one we read */ }
    });
    if (!signedIn) {
      await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email]", { timeout: 40000 });
      await page.fill("input[type=email]", acct.email);
      await page.fill("input[type=password]", acct.password);
      await page.click("form button.pa-btn");
      await page.waitForSelector(".pa-top", { timeout: 40000 });
      signedIn = await ctx.storageState();
    }

    // ── LIVE PASS ───────────────────────────────────────────────────────────
    await page.goto(`${BASE}/admin/office${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".bo-sec", { timeout: 60000 });
    // Every month answered (the bars exist from the first frame, so counting them proves nothing).
    await page.waitForFunction(() => document.querySelectorAll(".bo-mcol").length === 12
      && ![...document.querySelectorAll(".bo-mcol")].some((c) => /reading$/.test(c.getAttribute("aria-label")))
      && !/Reading/.test(document.querySelector(".bo-today").innerText), null, { timeout: 40000 });
    await settle(page, 2200);

    check(where, "Today is the first place and the one it opens on", (await page.locator(".bo-nav").first().innerText()).trim() === "Today"
      && (await page.locator("h1.bo-place").getAttribute("aria-label")) === "Today");
    check(where, "the rail lists Today, Detailers, Money, System", (await page.locator(".bo-nav").allInnerTexts()).map((t) => t.replace(/\d+/g, "").trim()).join(",") === "Today,Detailers,Money,System");
    check(where, "four sections are drawn", (await page.locator(".bo-sec").count()) === 4);

    const months = Object.keys(nets).sort();
    monthsSeen = months.length;
    check(where, `twelve months of money were read (${months.length} of 12)`, months.length === 12, months.join(","));
    check(where, "the chart draws twelve months", (await page.locator(".bo-mcol").count()) === 12);

    // Money in: the headline equals the server's number for this month.
    const nowKey = months[months.length - 1], thisMonth = nets[nowKey];
    const shown = Number(((await page.locator("[data-testid=money-now]").innerText()).match(/[\d,]+/) ?? ["x"])[0].replace(/,/g, ""));
    check(where, `the headline money is the server's figure ($${Math.round((thisMonth?.revenue_cents ?? NaN) / 100)})`, shown === Math.round(thisMonth?.revenue_cents / 100), `drew ${shown}`);
    const lastText = plain(await page.locator(".bo-vs-l").innerText());
    const lastCents = nets[months[months.length - 2]]?.revenue_cents;
    check(where, "last month's figure is the server's", lastText.replace(/,/g, "").includes(`$${Math.round(lastCents / 100)}`), lastText);

    // Money OUT: a bar only where the server says bills were entered.
    const entered = months.filter((m) => nets[m]?.costs_entered).length;
    const outBars = await page.locator(".bo-mbars i.out:visible").count();
    check(where, `money out is drawn for exactly the months with bills (${outBars} bars, ${entered} months entered)`, outBars === entered);
    const key = plain(await page.locator(".bo-key").innerText());
    check(where, "months with no bill typed in say 'not entered' and never draw as zero", entered === 12 || /not entered/.test(key), key);

    // Needs you: as many as the Detailers place's own chip says, at most five.
    const liveItems = await page.locator(".bo-need").count();
    await page.locator(".bo-nav").filter({ hasText: "Detailers" }).click();
    await page.waitForSelector(".bo-fchip", { timeout: 10000 });
    const chipN = Number((await page.locator(".bo-fchip").filter({ hasText: "Needs you" }).innerText()).match(/\d+/)[0]);
    check(where, `Needs you shows the Detailers chip's ${chipN}, capped at five`, liveItems === Math.min(5, chipN), `drew ${liveItems}`);
    await page.locator(".bo-nav").filter({ hasText: "Today" }).click();
    await page.waitForSelector(".bo-sec");
    await settle(page, 900);

    // Sign-up path: five bars, real detailers only.
    const realN = (list?.rows ?? []).filter((r) => !r.is_demo).length;
    check(where, `the sign-up path has five lines, or says nobody has signed up (${realN} real)`,
      realN === 0 ? (await page.locator(".bo-path").count()) === 0 : (await page.locator(".bo-path li").count()) === 5);
    if (realN) {
      const first = plain(await page.locator(".bo-path li").first().innerText());
      check(where, "the first line counts every real detailer, not the test accounts", new RegExp(`${realN}\\s+of\\s+${realN}`).test(first), first);
    }

    let o = await inspect(page);
    observed[`${where} live`] = o;
    check(where, "no sideways overflow", !o.overflowX);
    check(where, "nothing in a row, a path line, the stats or the month labels overlaps", o.overlaps.length === 0, o.overlaps.slice(0, 3).join(" | "));
    check(where, "no text runs outside its own box", o.clipped.length === 0, o.clipped.join(" | "));
    check(where, "none of the mockup's explanation lines is on the page", o.explainers.length === 0, o.explainers.join(" | "));
    check(where, "no old tab bar on this route", o.oldTabs === 0);
    await page.screenshot({ path: `${ART}/today-${size.w}.png`, fullPage: true }); artifacts.push(`${ART}/today-${size.w}.png`);

    // CANARY 2 (overlap): the inspector must see a month label pushed onto the next.
    if (size.w === SIZES[0].w) {
      const before = (await inspect(page)).overlaps.length;
      await page.evaluate(() => { const l = document.querySelectorAll(".bo-mlab")[3]; l.style.position = "relative"; l.style.left = "60px"; l.dataset.canary = "1"; });
      const after = (await inspect(page)).overlaps.length;
      await page.evaluate(() => { const l = document.querySelector("[data-canary]"); l.style.left = ""; l.style.position = ""; delete l.dataset.canary; });
      canary.overlap = `overlaps ${before} -> ${after}`;
      canary.observed_failure = after > before;
      console.log(`    canary (overlap) ${after > before ? "CAUGHT" : "MISSED"}: ${canary.overlap}`);
    }

    // ── FED PASS ────────────────────────────────────────────────────────────
    const fed = FED(list.rows);
    const phoneOf = new Map(fed.synthetic.map((r) => [r.name, String(r.setup_inputs.business.contact_phone).trim() !== ""]));
    await page.route("**/functions/v1/platform-admin", async (route) => {
      const body = route.request().postData() || "";
      if (!body.includes('"list"')) return route.continue();
      const res = await route.fetch();
      const j = await res.json();
      await route.fulfill({ response: res, json: { ...j, rows: fed.rows } });
    });
    await page.goto(`${BASE}/admin/office${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".bo-need", { timeout: 60000 });
    await settle(page, 1500);
    await page.evaluate((m) => document.querySelectorAll(".bo-need").forEach((li) => { li.dataset.hasPhone = m[li.querySelector("b").textContent] ? "1" : "0"; }), Object.fromEntries(phoneOf));

    const names = await page.locator(".bo-need-who b").allInnerTexts();
    fedItems = names.length;
    check(where, "fed: five are shown, dearest first", names.join(",") === "Fed Alder,Fed Birch,Fed Cedar,Fed Dogwood,Fed Elm", names.join(","));
    check(where, "fed: the other two are counted, not dropped", /2 more/.test(await page.locator(".bo-more").innerText()));
    check(where, "fed: the count beside the heading is all seven", (await page.locator(".bo-label-n").first().innerText()).trim() === "7");
    const buttons = await page.locator(".bo-need").evaluateAll((els) => els.map((li) => [li.querySelector("b").textContent, li.querySelector("a")?.textContent.trim() ?? null, li.querySelector("a")?.getAttribute("href") ?? null]));
    const want = (nm) => (phoneOf.get(nm) ? "Text them" : "Email them");
    check(where, "fed: Text them only where there is a phone, Email them where there is not",
      buttons.every(([nm, label]) => label?.startsWith(want(nm))), JSON.stringify(buttons.map((b) => b.slice(0, 2))));
    check(where, "fed: a Text link is an sms: link and an Email link is a mailto: link",
      buttons.every(([nm, , href]) => (phoneOf.get(nm) ? /^sms:/.test(href) : /^mailto:/.test(href))));
    const fedCosts = plain(await page.locator(".bo-needs").innerText());
    check(where, "fed: the money at risk is printed for each, dearest first", ["$70", "$60", "$50", "$40", "$30"].every((c) => fedCosts.includes(`${c} a month`)), fedCosts.slice(0, 160));
    o = await inspect(page);
    observed[`${where} fed`] = o;
    check(where, "fed: no Text, Call or 'ring' over an account with no phone number", o.phoneLinks.length === 0 && o.ringWords.length === 0, [...o.phoneLinks, ...o.ringWords].join(" | "));
    check(where, "fed: no overlap and nothing clipped", o.overlaps.length === 0 && o.clipped.length === 0, [...o.overlaps, ...o.clipped].slice(0, 3).join(" | "));
    check(where, "fed: no sideways overflow", !o.overflowX);
    for (const [sel, name] of [[".bo-need-who", "a name"], [".bo-need .bo-btn", "a fix button"], [".bo-more", "the 'more' button"]]) {
      const bad = await hitProbe(page, sel);
      check(where, `fed: ${name} has 44px of hit area`, bad.length === 0, bad.join(" | "));
    }
    await page.screenshot({ path: `${ART}/needs-${size.w}.png`, fullPage: true }); artifacts.push(`${ART}/needs-${size.w}.png`);

    // CANARY 1 (phone): a Text link injected into a no-phone item must be named.
    if (size.w === SIZES[0].w) {
      await page.evaluate(() => {
        const li = [...document.querySelectorAll(".bo-need")].find((n) => n.dataset.hasPhone === "0");
        const a = document.createElement("a"); a.href = "sms:5550100"; a.textContent = "Text them"; a.dataset.canary = "1"; li.appendChild(a);
      });
      const c = await inspect(page, BREAK === "blind");
      await page.evaluate(() => document.querySelectorAll("[data-canary]").forEach((n) => n.remove()));
      canary.phone = `Text links seen on a no-phone item with one injected: ${c.phoneLinks.length}`;
      canary.observed_failure = canary.observed_failure && c.phoneLinks.length >= 1;
      console.log(`    canary (text link) ${c.phoneLinks.length >= 1 ? "CAUGHT" : "MISSED"}: ${canary.phone}`);
    }

    // A name opens the panel; "2 more" lands on the Detailers list filtered to Needs you.
    await page.locator(".bo-need-who").first().click();
    await page.waitForSelector(".bo-panel", { timeout: 10000 });
    const pn = await page.locator(".bo-pname").first().evaluate((e) => e.getAttribute("aria-label") || e.textContent);
    check(where, "pressing a name opens that detailer's panel", /Fed Alder/.test(pn), `panel title "${pn}"`);
    await page.keyboard.press("Escape");
    await page.waitForSelector(".bo-panel", { state: "detached", timeout: 5000 });
    await page.locator(".bo-more").click();
    await page.waitForSelector(".bo-fchip", { timeout: 10000 });
    check(where, "'2 more' opens Detailers with the Needs you chip on", (await page.locator(".bo-fchip.on").innerText()).startsWith("Needs you"));
    check(where, "...and that list holds all seven", (await page.locator(".bo-row").count()) === 7);

    completed++;
    await ctx.close();
  }
} catch (e) {
  failures.push(`run stopped: ${redact(e.message)}`);
  console.error(redact(e.stack || e.message));
} finally {
  await browser?.close();
  await dropAdmin(URL_, KEY, acct.id);
  console.log("throwaway admin deleted");
}

for (const c of consoleNoise) failures.push(`console: ${redact(c)}`);
const status = failures.length === 0 && completed === SIZES.length && canary.observed_failure ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: `office-today${LITE ? "-lite" : ""}`,
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 30,
  assertion_floor: "3 widths x at least 30 questions (live 17, fed 16; the live list has one more when a real detailer exists), fixed by the code; none is conditional on what the live platform holds except the sign-up lines, which refuse an empty population by asking its own question.",
  failures,
  artifacts,
  canary,
  warnings: [
    `Reads the LIVE platform (${monthsSeen} of 12 months of money read at the last width); the fed pass answers the list call with ${fedItems} shown of 7 known accounts through page.route(), nothing written to the database.`,
    "Signs in as a throwaway platform admin created and deleted by this run.",
    "The look itself (color, glow, motion) is not judged here; the screenshots are the evidence for that.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), lite: LITE, ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
