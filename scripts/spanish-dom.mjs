// WHAT IS STILL ENGLISH ON A SPANISH DASHBOARD — roadmap 8.17 stage 2b.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS WHEN `i18n-survey.mjs` ALREADY REPORTS ZERO
// ---------------------------------------------------------------------------
// That script answers two questions about the SOURCE and both reached zero:
// nothing is unwrapped, and every wrapped key has a translation. The dashboard
// was still part English, and **nothing in the source was wrong**:
//
//   · `RequestCard` drew a date at a hard-coded locale — no string to wrap.
//   · A word sat raw beside two wrapped siblings, and its spelling happened to
//     be a catalogue key for a DIFFERENT screen, so the survey read it as
//     handled.
//   · A tag was assembled from two pieces neither of which is a sentence.
//
// Every one of those was found by pressing ES in a browser and READING THE
// PAGE. This is that, as a script, so the next session does not have to
// remember to look — and so it can look at fifty screens instead of four.
//
// ---------------------------------------------------------------------------
// HOW IT DECIDES SOMETHING IS ENGLISH
// ---------------------------------------------------------------------------
// **It compares the page against the CATALOGUE'S OWN KEYS.** Every English
// string the dashboard can draw is a key in `appEs.js`, so any visible text
// that equals a key — while the language is `es` and that key's Spanish is
// something else — is English that reached the screen. No language detection,
// no word lists, no guessing: the answer is already written down.
//
// It reports the ELEMENT too, because "Quote" on its own is not findable and
// `button.btn.sm` in the request card is.
//
//   node scripts/spanish-dom.mjs            # every dashboard screen
//   node scripts/spanish-dom.mjs --keep     # leave the browser open
//
// Needs the dev server and the demo login, like every other browser script.

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { watchSource, reportSourceMoved } from "./source-guard.mjs";

// Playwright lives in `app/node_modules`, and every browser script in this
// repo reaches it the same way — there is no dependency at the repo root.
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = "http://localhost:5173";
const EMAIL = "demo@detailplatform.com";
const PASSWORD = "demo123";

// THE KEYS, READ OUT OF THE CATALOGUE ITSELF. Nothing here has its own list of
// English — a second list would be the thing that goes stale.
const catalogue = (() => {
  const src = readFileSync(new URL("../app/src/lib/strings/appEs.js", import.meta.url), "utf8");
  const out = new Map();
  for (const m of src.matchAll(/^\s*"((?:[^"\\]|\\.)*)":\s*$|^\s*"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)) {
    const key = (m[1] ?? m[2] ?? "").replace(/\\"/g, '"').replace(/\\n/g, "\n");
    const val = (m[3] ?? "").replace(/\\"/g, '"').replace(/\\n/g, "\n");
    if (key) out.set(key, val);
  }
  return out;
})();

// **A KEY WHOSE SPANISH IS THE SAME WORD PROVES NOTHING.** `Zelle`, `Plan`,
// `Logo`, `15 min` are identical in both, so seeing them on a Spanish page is
// not evidence of anything. Comparing them would be the vacuous half of this
// check — a finding that is true whatever the code does.
// **AND ROWS THAT CAME OUT OF THE DATABASE ARE NOT A FINDING.** The five
// message-template names are SEEDED — in whatever language the detailer was
// reading when they first opened that screen — and are theirs to edit from
// then on. A business seeded before this item has English ones, which is
// correct: they are that detailer's own words now, and re-translating them
// would overwrite something a person may have edited.
//
// Nothing in the DOM says where a string came from, so the five are NAMED —
// the same shape as `db-audit`'s allowlists. A SIXTH is a finding.
const FROM_THE_DATABASE = new Set([
  "On my way", "Running late", "Confirm tomorrow", "Job finished",
  "Ask about access",
]);

const TELLS = new Set(
  [...catalogue]
    .filter(([k, v]) => v && v !== k && !FROM_THE_DATABASE.has(k))
    .map(([k]) => k),
);

const settle = async (page, cap = 2500) => {
  const until = Date.now() + cap;
  let quiet = 0;
  let last = "";
  while (Date.now() < until && quiet < 130) {
    const now = await page.evaluate(() => document.body.innerHTML.length).catch(() => "");
    if (now === last) quiet += 40; else { quiet = 0; last = now; }
    await page.waitForTimeout(40);
  }
};

/** Every visible text node on the page that is exactly a catalogue key. */
async function englishOn(page) {
  return page.evaluate((tells) => {
    const found = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const text = n.textContent.trim();
      if (!text || !tells.includes(text)) continue;
      const el = n.parentElement;
      if (!el || !el.offsetParent) continue;   // not drawn
      const where = `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).trim().split(/\s+/).join(".")}` : ""}`;
      found.push({ text, where });
    }
    return found;
  }, [...TELLS]);
}

const changedSince = watchSource();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
const say = (screen, hits) => {
  if (hits.length === 0) { console.log(`  ok    ${screen}`); return; }
  problems.push(...hits.map((h) => ({ screen, ...h })));
  console.log(`  FOUND ${screen} — ${hits.length}`);
  for (const h of hits.slice(0, 8)) console.log(`          ${JSON.stringify(h.text)}  in  ${h.where}`);
  if (hits.length > 8) console.log(`          … and ${hits.length - 8} more`);
};

try {
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  // **THE LANGUAGE IS SET AND THEN THE PAGE IS RELOADED, AND THE RELOAD IS
  // THE WHOLE POINT.** `makeLocale` reads the key ONCE at module scope, so
  // writing `localStorage` on a page that has already booted changes nothing
  // — the store keeps the value it detected. The first run of this script
  // did exactly that and reported 368 pieces of English, every one of them
  // the check measuring an English dashboard and calling it a finding.
  //
  // Setting it before the first render (rather than pressing the picker) is
  // still right: the picker is one control, and this is about the fifty
  // screens behind it.
  await page.evaluate(() => localStorage.setItem("dp.lang.app", "es"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click("form button.btn.primary");
  await page.waitForTimeout(2500);
  await settle(page);

  for (const [label, tab] of [
    ["Today", "today"], ["Calendar", "calendar"], ["Money", "money"],
    ["Clients", "clients"], ["Business", "business"],
  ]) {
    await page.click(`.tabbar button[data-tour="${tab}"]`).catch(() => {});
    await settle(page);
    say(label, await englishOn(page));
  }

  // The gear and every settings screen behind it.
  await page.click('button[aria-pressed][aria-label*="ettings"], button[aria-label*="ettings"]').catch(() => {});
  await settle(page);
  say("the gear", await englishOn(page));

  const rows = await page.$$eval("[data-settings-key]", (els) => els.map((e) => e.dataset.settingsKey));
  for (const key of rows) {
    const row = page.locator(`[data-settings-key="${key}"]`).first();
    if (!(await row.count())) continue;
    await row.click().catch(() => {});
    await settle(page);
    say(`gear · ${key}`, await englishOn(page));
    await page.keyboard.press("Escape");
    await settle(page, 900);
  }
} finally {
  if (!process.argv.includes("--keep")) await browser.close();
}

await reportSourceMoved(changedSince, problems.length === 0);
console.log(problems.length === 0
  ? "\nclean — no English on any Spanish screen"
  : `\n${problems.length} pieces of English on a Spanish dashboard`);
process.exit(problems.length === 0 ? 0 : 1);
