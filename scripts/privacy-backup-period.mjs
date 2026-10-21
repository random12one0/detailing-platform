// ROADMAP 97.28 — the privacy page tells a reader how long the backups keep
// what they deleted, and a phone can read it.
//
//   node scripts/privacy-backup-period.mjs [--base=http://127.0.0.1:5180] [--break=old-words]
//
// Eight targets: /privacy at 1440x900, 768x1024, 390x844 and 320x700, each in
// the normal path and ?lite=1. At each: the "How long" row holds the 30-day and
// 3-month sentence in English and in Spanish, its text is painted (opacity 1, read where the reader is
// standing — docs/gotchas.md 103), nothing scrolls sideways, and the console is
// silent. A PNG per target goes to --shots (default .tmp-97.28/png).
//
// EXECUTION PROOF, not log prose. --break=old-words serves legal.js WITHOUT
// both new sentences to every target — the original defect — and every target
// must go red on its missing disclosure. The rewrite carries an execution
// signature (`window.__backupBreak = "old-words"`) INSIDE the served module,
// and the check reads that signature back out of the running page: a launch
// failure, a blank page, or a rewrite the browser never executed cannot pass
// for a caught sabotage, because the signature would be absent (gotchas 113).
// The surrounding paragraph must still render, proving exactly one disclosure
// were removed rather than the whole row. A separate 390x844 context is the
// every-run canary. Unknown --break values exit 2 and prove nothing.
//
// A checkout with no app/.env.local renders every route blank (the settings
// modules throw without supabaseUrl and anonKey), so those two modules are
// rewritten in the browser to obviously fake placeholders — no real key is
// read or used, and the privacy page needs none. One goto per context,
// because a rewritten module is cached by the browser after the first
// navigation (docs/gotchas.md 113).
import { chromium } from "../app/node_modules/playwright/index.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";

const opt = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=").slice(1).join("=") || d;
const BASE = opt("base", process.env.BASE_URL || "http://127.0.0.1:5180");
const BREAK = opt("break", "");
const SHOTS = opt("shots", ".tmp-97.28/png");
if (BREAK && BREAK !== "old-words") { console.error(`unknown --break=${BREAK}`); process.exit(2); }
mkdirSync(SHOTS, { recursive: true });
const started_at = new Date().toISOString();
const KEEP_30 = "each night's backup is kept for 30 days";
const KEEP_3MO = "the one taken on the 1st of each month for 3 months";
const THEN_DELETED = "Then it is deleted too.";
const ES_3MO = "la del día 1 de cada mes, 3 meses";
const ES_GONE = "Después también se elimina.";
const SURROUNDING = "When an account is closed and asks to be deleted, it is deleted.";
const SIG = "old-words";
const VIEWS = [[1440, 900], [768, 1024], [390, 844], [320, 700]].flatMap(([w, h]) => [[w, h, ""], [w, h, "?lite=1"]]);

let assertions = 0, passed = 0, completed = 0;
const failures = [], transcript = [];
const say = (s) => { console.log(s); transcript.push(s); };
const check = (name, ok, detail = "") => {
  assertions++; if (ok) passed++; else failures.push(`${name}${detail ? " — " + detail : ""}`);
  say(`${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? "  (" + detail + ")" : ""}`);
};

async function prepare(page, oldWords) {
  await page.route(/\/src\/lib\/(supabase|api)\.js/, async (route) => {
    const res = await route.fetch();
    const body = (await res.text())
      .replace(/import\.meta\.env\.VITE_SUPABASE_URL/g, '"https://placeholder.invalid"')
      .replace(/import\.meta\.env\.VITE_SUPABASE_ANON_KEY/g, '"placeholder-anon"');
    await route.fulfill({ response: res, body });
  });
  if (oldWords) await page.route(/\/src\/landing\/legal\.js/, async (route) => {
    const res = await route.fetch();
    const text = await res.text();
    // Remove exactly the two backup-disclosure sentences, then sign the served module so
    // the page must prove it executed THIS rewrite (not a cached original).
    const body = text
      .replace(/"\*\*Anything deleted, a whole account or one[^"]*Then it is deleted too\./, "\"")
      + `\n;window.__backupBreak=${JSON.stringify(SIG)};\n`;
    if (body === text) throw new Error("old-words rewrite did not land — refusing to judge (docs/gotchas.md 102)");
    if (body.includes(KEEP_3MO)) throw new Error("old-words rewrite left the disclosure in place — refusing to judge");
    if (body.includes(ES_GONE)) throw new Error("old-words rewrite leaked spanish into legal.js — refusing to judge");
    if (!body.includes(SURROUNDING)) throw new Error("old-words rewrite took the surrounding paragraph too — refusing to judge");
    await route.fulfill({ response: res, body });
  });
  // The Spanish sentence lives in the catalogue module, not legal.js: blank
  // exactly its value, so the sabotage models the pre-97.28 page (neither
  // sentence) while the surrounding catalogue stays valid JavaScript.
  if (oldWords) await page.route(/\/src\/lib\/strings\/es\.js/, async (route) => {
    const res = await route.fetch();
    const esText = await res.text();
    const esBody = esText.replace(/"\*\*Todo lo eliminado[^"]*Después también se elimina\./, "\"");
    if (esBody === esText) throw new Error("old-words rewrite did not land on es.js");
    if (esBody.includes(ES_GONE)) throw new Error("old-words rewrite left the spanish disclosure in place");
    await route.fulfill({ response: res, body: esBody });
  });
}

async function measure(browser, [w, h, q], oldWords, shotTag = "") {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage(), logs = [];
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && logs.push(m.text()));
  page.on("pageerror", (e) => logs.push(e.message));
  await prepare(page, oldWords);
  try {
    await page.goto(BASE + "/privacy" + q, { waitUntil: "networkidle" });
    const row = page.locator(".legalrow", { hasText: "How long" });
    await row.scrollIntoViewIfNeeded({ timeout: 15000 });
    // The reveal fades in over about a second; wait for it to SETTLE rather
    // than reading a mid-fade frame (docs/gotchas.md 119, 122). A row that never
    // reaches 1 is still measured and reported.
    await page.waitForFunction((el) => getComputedStyle(el).opacity === "1", await row.elementHandle(), { timeout: 5000 }).catch(() => {});
    const r = await row.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return { text: el.textContent, opacity: getComputedStyle(el).opacity, left: b.left, right: b.right,
               sideways: document.documentElement.scrollWidth > innerWidth };
    });
    const sig = await page.evaluate(() => window.__backupBreak || null).catch(() => null);
    const shotName = shotTag || `privacy-${w}x${h}${q ? "-lite" : ""}${oldWords ? "-oldwords" : ""}`;
    await page.screenshot({ path: `${SHOTS}/${shotName}.png` });
    return { ...r, sig, logs };
  } finally { await ctx.close(); }
}

const CHROME_PATH = process.env.CHROME_PATH || "";
let canaryCaught = false;
const browser = await chromium.launch(CHROME_PATH ? { executablePath: CHROME_PATH } : {});
try {
  for (const view of VIEWS) {
    const [w, h, q] = view, at = `${w}x${h}${q}`;
    try {
      const r = await measure(browser, view, BREAK === "old-words");
      completed++;
      const hasDisclosure = r.text.includes(KEEP_30) && r.text.includes(KEEP_3MO) && r.text.includes(THEN_DELETED);
      const hasEspanol = r.text.includes(ES_3MO) && r.text.includes(ES_GONE);
      const surroundingIntact = r.text.includes(SURROUNDING) && r.text.includes("How long");
      check(`${at} · How long states the 30-day and 3-month backup period`, hasDisclosure, (r.text || "").slice(-240));
      check(`${at} · How long states the period in spanish too`, hasEspanol, (r.text || "").slice(-240));
      check(`${at} · the row is painted where the reader stands`, r.opacity === "1", `opacity ${r.opacity}`);
      if (!BREAK) {
        check(`${at} · no unfinished rewrite executed here`, r.sig === null, `signature ${r.sig}`);
      } else {
        check(`${at} · the rewrite that removed it provably executed`, r.sig === SIG, `signature ${r.sig}`);
      }
      check(`${at} · exactly one disclosure removed: the surrounding paragraph still renders`, surroundingIntact, (r.text || "").slice(-240));
      check(`${at} · inside the screen, no sideways scroll`, r.left >= 0 && r.right <= w && !r.sideways, `${r.left}..${r.right} of ${w}`);
      check(`${at} · console silent`, r.logs.length === 0, r.logs.join(" | "));
    } catch (e) { failures.push(`${at}: ${e.message.split("\n")[0]}`); say(`FAIL ${at}: ${e.message.split("\n")[0]}`); }
  }
  // CANARY, every run: the pre-97.28 words, missing the disclosure but signed,
  // at the phone width, on its own screenshot path. It exercises the same
  // presence detector as the targets: a clean pass requires the detector to
  // report the disclosure present on every target AND to report it missing
  // here, with the executed signature. Under --break the same missing
  // disclosure is already failing every target above.
  canaryCaught = false;
  const c = await measure(browser, [390, 844, ""], true, `privacy-canary-390x844${BREAK ? "-oldwords" : ""}`);
  canaryCaught = !c.text.includes(KEEP_3MO) && !c.text.includes(ES_GONE) && c.text.includes(SURROUNDING) && c.sig === SIG;
  say(`${canaryCaught ? "ok  " : "FAIL"} canary · the pre-97.28 words are called missing, with an executed signature`);
} finally { await browser.close(); }

const failed = assertions - passed + (completed < VIEWS.length ? VIEWS.length - completed : 0);
say(`\n${completed} of ${VIEWS.length} targets, ${passed} of ${assertions} passed${BREAK ? `  (--break=${BREAK}: MUST be red)` : ""}`);
const txt = BREAK ? `receipts/privacy-backup-period.sabotage-${BREAK}.txt` : "receipts/privacy-backup-period.txt";
writeFileSync(txt, [`privacy-backup-period ${new Date().toISOString()} base=${BASE} break=${BREAK || "none"}`, ...transcript].join("\n") + "\n");
const shots = VIEWS.map(([w, h, q]) => `${SHOTS}/privacy-${w}x${h}${q ? "-lite" : ""}${BREAK ? "-oldwords" : ""}.png`);
shots.push(`${SHOTS}/privacy-canary-390x844${BREAK ? "-oldwords" : ""}.png`);
const seen = [...new Set(shots)];
writeReceipt({
  check_id: BREAK ? `privacy-backup-period-${BREAK}` : "privacy-backup-period",
  started_at,
  status: failures.length || completed < VIEWS.length || !canaryCaught ? "fail" : "pass",
  expected_targets: VIEWS.length, discovered_targets: VIEWS.length, attempted_targets: VIEWS.length, completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: VIEWS.length * 7,
  assertion_floor: "7 checks at each of 8 targets (4 widths x normal and ?lite=1): english disclosure presence, spanish disclosure presence, paint, injection state (absent clean / executed sabotage), exactly-one removal, geometry, console; every check() unconditional.",
  canary: { id: "old-words", observed_failure: canaryCaught, what: "legal.js served without the backup sentence, but with an executed in-page signature, is reported missing at 390x844 while the surrounding paragraph still renders" },
  failures,
  artifacts: [txt, ...seen],
  dimensions: { roadmap: "97.28", break: BREAK || null, base: BASE },
  warnings: ["The Supabase settings are fake placeholders rewritten in the browser; the privacy page calls no API."],
});
process.exit(failed || !canaryCaught ? 1 : 0);
