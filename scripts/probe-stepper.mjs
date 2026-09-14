// CAN YOU TYPE A NUMBER INTO A STEPPER, AND DOES IT SURVIVE SAVE AND RELOAD?
//
//   npm run dev --prefix app                 # the dev server must be up
//   set -a; . ./.env; set +a
//   node scripts/probe-stepper.mjs
//
// ---------------------------------------------------------------------------
// **WHY THIS EXISTS — Andrew, 2026-09-13.**
// ---------------------------------------------------------------------------
// *"I clicked the number, typed 70, pressed Save weather warnings, got
// 'Saved.', and the value was still 80. The typing went nowhere and the old
// value saved silently."*
//
// The value was a `<span>` that looked exactly like a field. Nothing rejected
// the keystrokes and nothing reported them; the save that followed wrote the
// old number and said "Saved." **The product told him it had done what he
// asked.** That is the shape of defect this file is here to catch, and no
// amount of reading the source catches it — the old markup was perfectly
// sensible code that rendered a perfectly sensible lie.
//
// ---------------------------------------------------------------------------
// **IT MUST RELOAD, AND THAT IS THE WHOLE POINT.**
// ---------------------------------------------------------------------------
// A check that types a value and reads the field back passes on a control that
// stores nothing — React state remembers it perfectly well until the page goes
// away. So every case here signs in again, walks back to the screen, and reads
// what the DATABASE gave back. Anything less would be the "skipped check reads
// exactly like a passing one" failure this repo keeps paying for.
//
// **AND IT TYPES THE WAY A PERSON DOES: click, select all, type, then press
// Save with the mouse — never Enter.** Committing on Enter alone would have
// passed this probe and still lost Andrew's value, because pressing a Save
// button blurs the field rather than submitting it.
//
// THE SKIP IS PRINTED. No credentials or no dev server means this says so and
// exits non-zero rather than quietly reporting nothing.

import "../tests/_env.mjs";
import { createRequire } from "node:module";

const BASE = process.env.BASE || "http://localhost:5173";
const EMAIL = "demo@detailplatform.com";
const PASSWORD = "demo123";   // matches scripts/seed-demo.mjs

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok    ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
};

const up = await fetch(BASE, { method: "GET" }).then((r) => r.ok).catch(() => false);
if (!up) {
  console.log(`\nSKIPPED — no dev server on ${BASE}. Run: npm run dev --prefix app`);
  process.exit(1);
}

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });

async function openWeather() {
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 20000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", EMAIL);
    await page.fill("input[type=password]", PASSWORD);
    await page.click("form button.btn.primary");
  }
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  await page.getByRole("button", { name: "Settings", exact: true }).first().click();
  await page.waitForTimeout(1000);
  await page.locator(".nav-row", { hasText: "Weather warnings" }).first().click();
  await page.waitForSelector(".stepper", { timeout: 15000 });
  await page.waitForTimeout(600);
}

const field = (row) => page.locator(".setting", { hasText: row }).locator(".stepper .num").first();

/** What the control is showing, WHATEVER ELEMENT IT IS. `inputValue()` throws
 *  on anything that is not a field, so a probe built on it CRASHES on the exact
 *  defect it exists to catch — and a crash names a Playwright method rather
 *  than naming the bug. This reads either, so the regression is reported as a
 *  failed check with the old value beside it. */
const read = async (row) => (await field(row).evaluate(
  (el) => (el.tagName === "INPUT" ? el.value : (el.textContent || "").replace(/[^0-9]/g, "")),
)).trim();

/** Type `text` into the named row, press Save WITH THE MOUSE, reload, and hand
 *  back what the database gave. `text` may be rubbish on purpose. */
async function typeSaveReload(row, text) {
  const f = field(row);
  await f.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type(String(text));
  // Blur by pressing Save, which is what a person does and what the old
  // Enter-only draft of this control would have failed.
  await page.getByRole("button", { name: /Save weather warnings/i }).first().click();
  // **WAIT FOR THE PRODUCT'S OWN "Saved.", NOT FOR A NUMBER OF MILLISECONDS.**
  // A fixed sleep raced the write on the first run of this probe and produced
  // two failures against a control that was working — the flakiest possible
  // way to report a correct product as broken, and the reason a reading has to
  // wait on the thing itself (CLAUDE.md trap (o)).
  await page.getByText("Saved.", { exact: true }).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  await openWeather();
  return await read(row);
}

await openWeather();

// --- 1 · THE REPORTED DEFECT, EXACTLY AS HE HIT IT ------------------------
console.log("\n1 · A TYPED VALUE SURVIVES SAVE AND RELOAD — Andrew's own sequence");
{
  const before = await read("Hot above");
  ok("1a · the value is an <input>, not a <span>",
    await field("Hot above").evaluate((el) => el.tagName) === "INPUT");
  const got = await typeSaveReload("Hot above", 70);
  ok("1b · typed 70 into Hot above and 70 came back", got === "70", `was ${before}, got ${got}`);

  const got2 = await typeSaveReload("Cold below", 38);
  ok("1c · Cold below takes a typed value too", got2 === "38", `got ${got2}`);

  // THE OTHER TWO ON THIS SCREEN HAVE THE SAME SHAPE, which is why the fix went
  // into the shared control rather than into the two rows he named.
  const got3 = await typeSaveReload("Chance of rain", 55);
  ok("1d · Chance of rain takes a typed percent", got3 === "55", `got ${got3}`);
}

// --- 2 · NONSENSE IS REFUSED, NOT STORED ----------------------------------
console.log("\n2 · RUBBISH AND OUT-OF-RANGE NEVER REACH THE DATABASE");
{
  // Above the max. 125 is the ceiling on Hot above.
  const high = await typeSaveReload("Hot above", 400);
  ok("2a · 400° clamps to the maximum", high === "125", `got ${high}`);

  // The field filters letters as they are typed, so what commits is whatever
  // was already in the box — never an empty box, and never 0, which is what
  // `Number("")` would have given.
  const junk = await typeSaveReload("Hot above", "abc");
  ok("2b · letters leave the value alone", junk === "125", `got ${junk}`);

  // Below the min. 70 is the floor on Hot above.
  const low = await typeSaveReload("Hot above", 3);
  ok("2c · 3° clamps to the minimum", low === "70", `got ${low}`);
}

// --- 3 · ENTER COMMITS TOO, AND ESCAPE ABANDONS ---------------------------
console.log("\n3 · ENTER COMMITS, ESCAPE ABANDONS — both, not one");
{
  const f = field("Hot above");
  await f.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("88");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  ok("3a · Enter commits without leaving the screen",
    await read("Hot above") === "88");

  // AND ESCAPE MUST NOT TAKE THE SCREEN WITH IT. The settings panel closes on
  // Escape; the first version of this control let the key through and the whole
  // screen shut, which is a worse answer to "undo my typing" than doing
  // nothing. This case caught that.
  const g = field("Hot above");
  await g.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("99");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  ok("3b · Escape puts the old value back",
    await read("Hot above") === "88");
  ok("3c · and Escape does not close the settings screen",
    await page.locator(".stepper").count() > 0);
}

// --- 4 · THE BUTTONS STILL WORK, AND THE TARGET STILL CLEARS THE FLOOR ----
console.log("\n4 · NOTHING THAT WORKED BEFORE STOPPED WORKING");
{
  const row = page.locator(".setting", { hasText: "Hot above" }).first();
  await row.getByRole("button", { name: "More" }).click();
  await page.waitForTimeout(200);
  ok("4a · plus still nudges", await read("Hot above") === "89");
  await row.getByRole("button", { name: "Less" }).click();
  await page.waitForTimeout(200);
  ok("4b · and minus still nudges back", await read("Hot above") === "88");

  // CLAUDE.md § THE BAR: 44px of REAL hit area, probed with elementFromPoint
  // rather than read off a bounding rect (trap (n)).
  const reach = await field("Hot above").evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const hits = [0, -14, 14].map((dy) => document.elementFromPoint(cx, cy + dy) === el);
    return { h: Math.round(r.height), hits };
  });
  ok("4c · the field itself is at least 44px tall", reach.h >= 44, `${reach.h}px`);
  ok("4d · and a press 14px off centre still lands on it",
    reach.hits.every(Boolean), JSON.stringify(reach.hits));
}

// --- 5 · PUT IT BACK ------------------------------------------------------
// Andrew asked for the demo business to be left at 80. A probe that changes a
// setting and walks away has made the next person's screen lie to them.
console.log("\n5 · THE DEMO BUSINESS IS LEFT AS IT WAS FOUND");
{
  const hot = await typeSaveReload("Hot above", 80);
  ok("5a · Hot above restored to 80", hot === "80", `got ${hot}`);
  const cold = await typeSaveReload("Cold below", 40);
  ok("5b · Cold below restored to 40", cold === "40", `got ${cold}`);
  const rain = await typeSaveReload("Chance of rain", 40);
  ok("5c · Chance of rain restored to 40", rain === "40", `got ${rain}`);
}

ok("6 · no console errors at any point", errors.length === 0, errors.slice(0, 2).join(" | "));

await browser.close();
console.log(`\nprobe-stepper: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
