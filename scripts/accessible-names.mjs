// THE ACCESSIBLE NAME ON EVERY CONTROL, READ THE WAY A SCREEN READER READS IT — ROADMAP 14.24 part 3.
//
//   node scripts/accessible-names.mjs [--base=URL] [--fixture] [--break=strip-date|strip-bar]
//   node scripts/receipt.mjs receipts/accessible-names.json
//
// What Narrator speaks is the browser's computed accessible name, so this reads
// it directly: the focused element's own aria snapshot carries the same name a
// screen reader announces. The check tabs through (a) the booking page's date
// step and (b) the job record's pinned action bar at 1440 and 392; for every
// focused control it records the role and the accessible name and fails on an
// empty name, a name of only "button", or a name that misses the control's own
// visible words. The verdict lives in ./lib/accessibleName.mjs, shared with
// the node suite, so the check and its canaries run the same rule the suite proves.
//
// Needs the dev server and the seeded demo business. The job screen needs the
// demo owner's session (DEMO_OWNER_PW, like every sibling script): without it
// the script stops with NOTHING WAS MEASURED rather than pretending the public
// half is the whole check.
//
// WHAT IT ASSERTS, PER (screen, width) READING
//   reached/entered  the reading got where it claims (step 5 of 7; inside .jobbar)
//   order            the tab order loops over the controls with no trap
//   coverage-*       the reading saw the controls this screen must have
//                    (date: month arrow, day cells, slot chips, bar back,
//                    bar continue, the language pair; job: Call, Text, Calendar, Reminder)
//   name             every focused control's verdict passes; the control is named by
//                    tag, class and visible words so a sabotage names its victim
//   verdicts         at least the coverage minimums produced verdicts, and all pass
//   disabled-names   the past-month arrow is disabled (out of the tab order), so its
//                    name is read directly instead of skipped as "not focused"
//   console          no error, no warning, no http 4xx/5xx while the screen stood
// plus once: three verdict canaries (handed defects the rule must refuse).
//
// --fixture, FOR A BACKEND THAT HOLDS NO PRICES OR TIMES (the belt's per-copy
// demo backend answers calculate-booking and available-slots with {}): the
// browser's two calls are answered with fixed bodies in the shape the real
// functions return (supabase/functions/calculate-booking and available-slots),
// so the walk can reach the date step at all. Only those two answers are fed;
// every name under test is still rendered by the real components. The receipt
// records fixture: true, so a fixture run never reads as a live-backend run.
//
// UNJUDGEABLE, in the receipt: a bare day number ("15") passes the letter of the
// rule — the name contains the visible words — but only a listener can say whether
// it is a USEFUL name; and whether the tab ORDER reads sensibly is a judgement,
// not a number. This check proves every control HAS a matching name, not that the
// names are good or the order is sensible.

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, writeReceipt } from "./receipt.mjs";
import {
  controlNameOk,
  controlNameVerdict,
  parseSnapshotLine,
  resolveBase,
} from "./lib/accessibleName.mjs";
import {
  countQuotes,
  pickDay,
  settle,
  stepNow,
  toCalendar,
  watchConsole,
} from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = resolveBase(process.argv.slice(2), process.env);
const FIXTURE = process.argv.slice(2).includes("--fixture");
const BREAK = (process.argv.slice(2).find((a) => a.startsWith("--break=")) || "").split("=").slice(1).join("=") || null;
if (BREAK && BREAK !== "strip-date" && BREAK !== "strip-bar") {
  console.error(`--break must be strip-date or strip-bar, not ${BREAK}`);
  process.exit(2);
}
console.log(`base: ${BASE} (set --base= or BASE= so this never silently measures another server)`);

const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }];
const SLUG = "demo-detail";
// Fixed assertions per reading: 1 reached/entered + 1 order + coverage + 1
// verdicts-present + 1 verdicts-all-pass + console (+2 disabled on date).
// Per-control name verdicts vary with the calendar, so the floor below is the
// fixed part and verdicts-present is the tripwire on the variable part.
const FIXED_PER_READING = { date: 13, job: 10 };
const MIN_VERDICTS = { date: 6, job: 4 }; // the coverage minimums, summed: every covered control yields a verdict
const MIN_CANARIES = 6;

let assertions = 0;
const failures = [], canaries = [], sabotage = [], observed = [], artifacts = [];
const ok = (cond, name, detail) => {
  assertions++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name} — ${detail}`);
  if (!cond) failures.push(`${name}: ${detail}`);
};

// One focused control: the role and accessible name the way the browser computes
// them (the same computation a screen reader speaks), plus the visible words the
// verdict is checked against and a stable description for the record.
async function readControl(page) {
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const raw = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || "";
    return {
      tag: el.tagName.toLowerCase(),
      cls: String(raw).replace(/\s+/g, " ").slice(0, 80),
      text: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 60),
      aria: el.getAttribute("aria-label"),
    };
  });
  if (!info) return null;
  let snapText = "";
  try {
    snapText = await page.locator(":focus").ariaSnapshot({ timeout: 5000 });
  } catch (e) {
    return {
      ...info,
      role: "(snapshot failed)",
      name: "",
      snapError: String(e).split("\n")[0].slice(0, 160),
      desc: describe(info),
    };
  }
  const parsed = parseSnapshotLine(snapText);
  return {
    ...info,
    role: parsed ? parsed.role : "(no role)",
    name: parsed ? parsed.name : "",
    snapError: null,
    desc: describe(info),
  };
}

const describe = (info) =>
  `${info.tag}${info.cls ? "." + info.cls.split(" ").slice(0, 2).join(".") : ""} text=${JSON.stringify(info.text)}`;

// Tab until the order cycles; every newly focused control is read once (revisits
// prove the order loops with no trap, and are counted, not re-asserted). With
// stayIn, phase one tabs until the region is entered and never stops before that;
// phase two collects inside it. Returns { controls, visits, entered } in order.
async function tabWalk(page, { cap = 400, stayIn = null } = {}) {
  const controls = [];
  const seen = new Map();
  let visits = 0, repeats = 0, lastKey = "", outsiders = 0, entered = !stayIn;
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (let i = 0; i < cap; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(40);
    const c = await readControl(page);
    const key = c ? `${c.role}|${c.name}|${c.tag}|${c.text}` : "body";
    if (key === "body" || key === lastKey) {
      if (++repeats >= 3) break;
      continue;
    }
    repeats = 0;
    lastKey = key;
    if (stayIn) {
      const inside = await page.evaluate(
        (sel) => { const el = document.activeElement; return !!(el && el.closest && el.closest(sel)); },
        stayIn
      );
      if (!inside) {
        if (entered && ++outsiders >= 2) break;
        continue;
      }
      entered = true;
      outsiders = 0;
    }
    visits++;
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    if (n === 1) controls.push(c);
    if (n === 3 && seen.size > 3) break; // looped twice with no trap: reachable and stable
  }
  return { controls, visits, entered };
}

function checkControls(reading, controls, must) {
  ok(controls.length > 0, `${reading}/visited`,
    controls.length ? `${controls.length} controls tabbed to` : "no control was ever focused — nothing was tested");
  const verdicts = [];
  for (const c of controls) {
    if (c.snapError) {
      ok(false, `${reading}/name`, `${c.desc} — accessible-name snapshot failed: ${c.snapError}`);
      verdicts.push({ desc: c.desc, ok: false });
      continue;
    }
    const v = controlNameVerdict(c.name, c.text);
    ok(v.ok, `${reading}/name`,
      v.ok
        ? `${c.role} ${JSON.stringify(c.name)} matches ${JSON.stringify(c.text.slice(0, 30))} (${c.desc})`
        : `${c.desc} — role ${c.role}, name ${JSON.stringify(c.name)}: ${v.reason}`);
    verdicts.push({ desc: c.desc, ok: v.ok });
  }
  for (const [label, found] of must) {
    ok(found > 0, `${reading}/coverage-${label}`,
      found > 0 ? `${found} seen` : `no ${label} control was tabbed to`);
  }
  return verdicts;
}

// The two answers --fixture supplies. Every weekday from tomorrow is open at
// three times; the quote is one hour at $65, the shape calculate-booking sends.
async function feedFixture(page) {
  await page.route(/\/functions\/v1\/calculate-booking/, (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ success: true, weather: null, quote: {
      base_price: 65, vehicle_size_fee: 0, add_ons_total: 0, travel_fee: 0, travel_zone: null,
      adjustments: [], subtotal_before_discounts: 65, site_discount: 0, site_discount_percent: 0,
      site_discount_label: null, subtotal: 65, promo_code: null, promo_discount: 0, total: 65,
      plan_id: null, plan_name: null, total_duration: 60, buffer_minutes: 0, vehicle_count: 1,
      per_vehicle: null, single_vehicle_duration: 60,
    } }),
  }));
  await page.route(/\/functions\/v1\/available-slots/, async (route) => {
    let body = {};
    try { body = JSON.parse(route.request().postData() || "{}"); } catch { /* empty ask */ }
    const days = {};
    const today = new Date().toISOString().slice(0, 10);
    const start = body.start_date || body.booking_date || today;
    const end = body.end_date || start;
    for (let d = new Date(start + "T12:00:00Z"); d.toISOString().slice(0, 10) <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const open = key > today && d.getUTCDay() !== 0 && d.getUTCDay() !== 6;
      days[key] = {
        open, slots: open ? ["09:00", "10:00", "13:00"] : [], dropoff_slots: [], dropoff_only: false,
        mobile_slots: [], mobile_only: false, hours: open ? { open: "09:00", close: "17:00" } : null,
      };
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, days }) });
  });
}

async function dateReading(ctx, w, h) {
  const page = await ctx.newPage();
  if (FIXTURE) await feedFixture(page);
  countQuotes(page); // toCalendar's advance waits on quote answers, not on time
  const noise = [];
  watchConsole(page, String(w), noise);
  await page.goto(`${BASE}/book/${SLUG}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bk-card.selectable", { timeout: 30000 });
  await settle(page);
  await toCalendar(page);
  const day = await pickDay(page, "weekday");
  await page.locator(".bk-cal .cell", { hasText: new RegExp(`^${day}$`) }).last().click();
  await page.locator(".bk-slots .bk-chip").first().waitFor({ state: "attached", timeout: 10000 });
  await settle(page);
  const at = await stepNow(page);
  // The entry names the calendar step "step 5": the steps live in ./steps and the
  // calendar R1 means is the date step, "Step 5 of 7".
  ok(!!at && at.n === 5 && at.of === 7, `${w}/date/reached`,
    at ? `date step reads "Step ${at.n} of ${at.of}" after picking day ${day}` : "no step label on the date step");
  if (BREAK === "strip-date") {
    await page.evaluate(() => {
      const cell = document.querySelector(".bk-cal .cell:not(.closed):not(.empty)");
      if (cell) { cell.textContent = ""; cell.setAttribute("aria-label", ""); }
    });
    await settle(page, 400);
  }
  const { controls, visits } = await tabWalk(page);
  ok(visits >= controls.length && controls.length > 0, `${w}/date/order`,
    `${visits} tab stops over ${controls.length} unique controls — the order loops with no trap`);
  const named = { month: 0, day: 0, slot: 0, back: 0, cont: 0, lang: 0 };
  for (const c of controls) {
    if (/previous month|next month|mes anterior|mes siguiente/i.test(c.aria || "")) named.month++;
    else if (c.role === "button" && /^\d{1,2}$/.test(c.text)) named.day++;
    // A slot reads as a bare time ("9 AM", "9:05 PM" — time12, never translated),
    // which keeps the multi-car "Car 1 · …" chips and the EN/ES language chips out.
    else if (/^\d{1,2}(:\d{2})? [AP]M$/i.test(c.text)) named.slot++;
    else if (/back a step|retroceder/i.test(c.text) || /back a step|retroceder/i.test(c.aria || "")) named.back++;
    else if (c.text === "Continue" || c.text === "Continuar") named.cont++;
    if (/^(EN|ES)$/.test(c.text)) named.lang++;
  }
  const verdicts = checkControls(`${w}/date`, controls, [
    ["month-arrow-next", named.month],
    ["day-cells", named.day],
    ["slot-chips", named.slot],
    ["bar-back", named.back],
    ["bar-continue", named.cont],
    ["language", named.lang],
  ]);
  ok(verdicts.length >= MIN_VERDICTS.date, `${w}/date/verdicts-present`,
    `${verdicts.length} verdicts recorded (floor ${MIN_VERDICTS.date}, the coverage minimums summed)`);
  ok(verdicts.every((v) => v.ok), `${w}/date/verdicts-all-pass`,
    verdicts.every((v) => v.ok) ? "every recorded verdict passes" : "a recorded verdict fails (see name= lines above)");
  // The past-month arrow is correctly disabled on the current month, so Tab never
  // lands on it — but a screen-reader browser still finds it, so its name is read
  // directly rather than skipped as "not focused".
  const dis = page.locator(".bk-cal-block button:disabled");
  const disCount = await dis.count();
  ok(disCount >= 1, `${w}/date/disabled-prev`,
    disCount >= 1 ? "the past-month arrow is disabled and out of the tab order" : "no disabled month arrow found");
  const disNames = [];
  for (let i = 0; i < disCount; i++) {
    const snap = await dis.nth(i).ariaSnapshot({ timeout: 5000 }).catch(() => "");
    const parsed = parseSnapshotLine(snap);
    disNames.push(parsed ? parsed.name : "");
  }
  const disVerdicts = disNames.map((dname) => controlNameVerdict(dname, ""));
  ok(disVerdicts.every((v) => v.ok), `${w}/date/disabled-names`,
    disVerdicts.every((v) => v.ok)
      ? `disabled arrows named ${disNames.map((d) => JSON.stringify(d)).join(", ")} (read directly)`
      : `a disabled arrow's name fails: ${disNames.map((d) => JSON.stringify(d)).join(", ")}`);
  if (BREAK === "strip-date") {
    const victim = controls.find((c) => !controlNameOk(c.name, c.text));
    sabotage.push({ width: w, screen: "date", break: BREAK, landed: !!victim, victim: victim ? victim.desc : null });
    if (!victim) {
      console.error(`SABOTAGE DID NOT LAND at ${w}: stripping a day cell's label still passed`);
      process.exit(2);
    }
    console.log(`  sabotage landed at ${w} on ${victim.desc}`);
  }
  const shot = `${ART}/date-${w}.png`;
  await page.screenshot({ path: join(REPO, shot) });
  const trace = `${ART}/date-${w}.trace.json`;
  const listed = controls.map((c) => ({ role: c.role, name: c.name, text: c.text, desc: c.desc }));
  writeFileSync(join(REPO, trace), JSON.stringify({ width: w, screen: "date", day, controls: listed }, null, 1) + "\n");
  artifacts.push(shot, trace);
  observed.push({ width: w, screen: "date", day, controls: listed });
  ok(noise.length === 0, `${w}/date/console`,
    noise.length ? noise.slice(0, 3).join(" | ") : "0 errors, 0 warnings, 0 http 4xx/5xx since the page opened");
  await ctx.close().catch(() => {});
}

async function jobReading(browser, w, h) {
  let owner;
  try {
    const mod = await import(pathToFileURL(join(REPO, "scripts/lib/demoOwner.mjs")).href);
    owner = mod.demoOwner();
  } catch (e) {
    console.error(`${String((e && e.message) || e).split("\n")[0]}\nNOTHING WAS MEASURED. This is not a pass.`);
    process.exit(2);
  }
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const noise = [];
  // The one forgiven 404 (docs/gotchas.md 120): a signed-in non-admin opening the
  // back office asks platform-admin whoami and is answered with a bare 404. The
  // job screen is not the back office, so the filter below forgives it BY URL and
  // BY COUNT and only there — any other 4xx still fails the console assertion.
  const knownWhoami = (m) => /^http 404 · .*whoami/.test(m);
  watchConsole(page, String(w), noise);
  let jobId = "";
  page.on("response", async (r) => {
    if (jobId || !/\/rest\/v1\/bookings\?/.test(r.url()) || r.request().method() !== "GET") return;
    try {
      const rows = await r.json();
      const row = (Array.isArray(rows) ? rows : [rows]).find(
        (b) => b && b.id && b.status === "confirmed" && b.customer_phone && b.customer_email && !b.deleted_at
      );
      if (row) jobId = row.id;
    } catch { /* not our payload */ }
  });
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", owner.email);
    await page.fill("input[type=password]", owner.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
  for (let i = 0; i < 40 && !jobId; i++) await page.waitForTimeout(250);
  ok(!!jobId, `${w}/job/found`,
    jobId ? `a confirmed job with a phone was listed (${jobId.slice(0, 8)}…)` : "no usable job row came back");
  if (!jobId) {
    await ctx.close().catch(() => {});
    return;
  }
  await page.goto(`${BASE}/job/${jobId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".jobbar", { timeout: 30000 });
  await settle(page, 1200);
  if (BREAK === "strip-bar") {
    await page.evaluate(() => {
      const bar = document.querySelector(".jobbar");
      const btn = bar && [...bar.querySelectorAll("button")].find((b) => /Text/.test(b.textContent || ""));
      if (btn) btn.textContent = "";
    });
    await settle(page, 400);
  }
  const { controls, visits, entered } = await tabWalk(page, { stayIn: ".jobbar" });
  ok(entered, `${w}/job/entered`,
    entered ? "the tab order entered the pinned action bar" : "the tab order never entered .jobbar — the bar was not inspected");
  if (!entered) {
    await ctx.close().catch(() => {});
    return;
  }
  ok(visits >= controls.length && controls.length > 0, `${w}/job/order`,
    `${visits} tab stops over ${controls.length} unique bar controls — the order loops with no trap`);
  const named = { call: 0, text: 0, calendar: 0, reminder: 0 };
  for (const c of controls) {
    if (c.tag === "a" && c.text === "Call") named.call++;
    else if (c.tag === "button" && c.text === "Text") named.text++;
    else if (c.text === "Calendar") named.calendar++;
    else if (c.text === "Reminder") named.reminder++;
  }
  const verdicts = checkControls(`${w}/job`, controls, [
    ["bar-call", named.call],
    ["bar-text", named.text],
    ["bar-calendar", named.calendar],
    ["bar-reminder", named.reminder],
  ]);
  ok(verdicts.length >= MIN_VERDICTS.job, `${w}/job/verdicts-present`,
    `${verdicts.length} verdicts recorded (floor ${MIN_VERDICTS.job}, the coverage minimums summed)`);
  ok(verdicts.every((v) => v.ok), `${w}/job/verdicts-all-pass`,
    verdicts.every((v) => v.ok) ? "every recorded verdict passes" : "a recorded verdict fails (see name= lines above)");
  if (BREAK === "strip-bar") {
    const victim = controls.find((c) => !controlNameOk(c.name, c.text));
    sabotage.push({ width: w, screen: "job", break: BREAK, landed: !!victim, victim: victim ? victim.desc : null });
    if (!victim) {
      console.error(`SABOTAGE DID NOT LAND at ${w}: emptying the Text button still passed`);
      process.exit(2);
    }
    console.log(`  sabotage landed at ${w} on ${victim.desc}`);
  }
  const shot = `${ART}/job-${w}.png`;
  await page.screenshot({ path: join(REPO, shot) });
  const trace = `${ART}/job-${w}.trace.json`;
  const listed = controls.map((c) => ({ role: c.role, name: c.name, text: c.text, desc: c.desc }));
  writeFileSync(join(REPO, trace), JSON.stringify({ width: w, screen: "job", job: jobId.slice(0, 8), controls: listed }, null, 1) + "\n");
  artifacts.push(shot, trace);
  observed.push({ width: w, screen: "job", job: jobId.slice(0, 8), controls: listed });
  const other = noise.filter((m) => !knownWhoami(m) && !/Failed to load resource: the server responded with a status of 404/.test(m));
  const known = noise.filter(knownWhoami);
  ok(other.length === 0 && known.length <= 1, `${w}/job/console`,
    other.length ? other.slice(0, 3).join(" | ") : `0 unexpected; ${known.length} known back-office whoami 404 (gotchas 120)`);
  await ctx.close().catch(() => {});
}

let ART = ".manager-shots/14.24";

async function run() {
  mkdirSync(join(REPO, ".manager-shots", "14.24"), { recursive: true });
  // Sabotage artifacts live apart from clean ones: a clean rerun must never
  // overwrite a sabotage run's screenshots and traces (docs/gotchas.md 125).
  ART = BREAK ? `.manager-shots/14.24-sabotage-${BREAK}` : ".manager-shots/14.24";
  mkdirSync(join(REPO, ART), { recursive: true });
  const launchOpts = process.env.CHROME_EXE
    ? { executablePath: process.env.CHROME_EXE, args: ["--no-sandbox"] }
    : {};
  const browser = await chromium.launch(launchOpts);
  try {
    for (const { w, h } of SIZES) {
      console.log(`\n== date ${w}x${h}`);
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      await dateReading(ctx, w, h);
    }
    for (const { w, h } of SIZES) {
      console.log(`\n== job ${w}x${h}`);
      await jobReading(browser, w, h);
    }
  } finally {
    await browser.close();
  }

  // The verdict canaries run through the same rule the readings use. The three
  // handed defects are the receipt's canary: the rule must refuse every one.
  const mustPass = [["15", "15"], ["Previous month", ""], ["Text", "Text"]];
  for (const [name, visible] of mustPass) {
    ok(controlNameOk(name, visible), "guard/verdict-must-pass",
      `name ${JSON.stringify(name)} vs visible ${JSON.stringify(visible)} must pass`);
  }
  const handed = [["", "15", "empty-name"], ["button", "Continue", "button-only"], ["10:00 AM", "Choose this", "name-misses-visible"]];
  for (const [name, visible, id] of handed) {
    const v = controlNameVerdict(name, visible);
    const flagged = !v.ok && v.reason === id;
    canaries.push({ name: id, flagged });
    ok(flagged, "canary/verdict",
      `handed defect ${id} (name ${JSON.stringify(name)} vs ${JSON.stringify(visible)}) must be refused, got ${v.ok ? "pass" : v.reason}`);
  }

  const status = failures.length ? "fail" : "pass";
  const { path } = writeReceipt({
    // One receipt per sabotage, so strip-bar never overwrites strip-date's.
    check_id: BREAK ? `accessible-names-${BREAK}` : "accessible-names",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status,
    expected_targets: SIZES.length * 2,
    discovered_targets: SIZES.length * 2,
    attempted_targets: SIZES.length * 2,
    completed_targets: SIZES.length * 2,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: SIZES.length * (FIXED_PER_READING.date + FIXED_PER_READING.job) + MIN_CANARIES,
    assertion_floor:
      "2 widths x (13 date + 10 job) + 6 rule guards/canaries = 52; per-control name verdicts run above it, and verdicts-present (6 date, 4 job) is the tripwire on that variable part.",
    failures,
    warnings: [],
    artifacts,
    dimensions: {
      base: BASE,
      widths: SIZES.map((s) => `${s.w}x${s.h}`),
      ...(BREAK ? { break: BREAK } : {}),
      fixture: FIXTURE,
      owner_session: process.env.DEMO_OWNER_PW ? "DEMO_OWNER_PW from the environment" : "none",
      chrome: process.env.CHROME_EXE ? "system chrome via CHROME_EXE" : "playwright default",
    },
    canary: { id: canaries[0] && canaries[0].name, observed_failure: canaries.every((c) => c.flagged) },
    canaries,
    unjudgeable: [
      "usefulness — a bare day number passes the letter of the rule (the name holds the visible words); only a listener can say whether it suffices.",
      "tab order — every control here is reachable and named; whether the order reads sensibly is a judgement, not a number.",
    ],
    sabotage,
    observed,
  });
  console.log(`\nreceipt: ${path}`);
  console.log(`${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
}

export { readControl, tabWalk, checkControls, controlNameOk, controlNameVerdict, parseSnapshotLine, resolveBase };

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  run().catch((e) => {
    console.error(e);
    console.error("NOTHING WAS MEASURED. This is not a pass.");
    process.exit(2);
  });
}
