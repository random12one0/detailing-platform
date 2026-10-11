// 99.2a: the actual email formatter and all 34 rendered branches, in BOTH languages.
// No credentials, database, email provider or paid service. Uses local previews.
// node scripts/email-dates.mjs
// --break=hours|year|minutes rewrites emailKit in a throwaway source copy, then
// renders those real templates. The assertions themselves are never rewritten.
// --break=missing drops one discovered preview to prove the population guard.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "../app/node_modules/playwright/index.mjs";
import { dateLong } from "../app/src/lib/format.js";
import { writeReceipt, REPO } from "./receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = process.argv.find(a => a.startsWith("--break="))?.slice(8) || "";
if (BREAK && !["hours", "year", "minutes", "missing"].includes(BREAK)) throw new Error("Unknown break");
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/99.2";
const WIDTHS = [[390, 844], [1440, 900], [768, 1024], [392, 844], [320, 844]];
const EXPECTED_EMAILS = 34; // deliberate declaration, not the directory's own size
const EXPECTED_TARGETS = 2 + EXPECTED_EMAILS * 2;
const failures = [], artifacts = [], observations = [];
let assertions = 0, discovered = 2, attempted = 2, completed = 2;
const check = (name, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
};
const badDateTime = s => /\b\d{1,2}:00\s*(?:AM|PM)\b|\b\d{4}-\d{2}-\d{2}\b/.test(s);
let scratch, browser;
try {
  let sourceRoot = REPO;
  if (BREAK && BREAK !== "missing") {
    scratch = mkdtempSync(path.join(tmpdir(), "dp-email-dates-"));
    cpSync(path.join(REPO, "supabase/functions/_shared"), path.join(scratch, "supabase/functions/_shared"), { recursive: true });
    mkdirSync(path.join(scratch, "scripts"));
    for (const file of ["render-emails.mjs", "receipt.mjs"]) cpSync(path.join(REPO, "scripts", file), path.join(scratch, "scripts", file));
    const kitFile = path.join(scratch, "supabase/functions/_shared/emailKit.ts");
    const before = readFileSync(kitFile, "utf8");
    let after = before;
    if (BREAK === "hours") after = before.replace('m === 0 ? "" :', 'false ? "" :');
    if (BREAK === "minutes") after = before.replace('m === 0 ? "" :', 'true ? "" :');
    if (BREAK === "year") after = before.replace('weekday: "long", month: "long"', 'weekday: "long", year: "numeric", month: "long"');
    if (after === before) throw new Error("Sabotage did not land");
    writeFileSync(kitFile, after);
    sourceRoot = scratch;
  }
  const kit = await import(pathToFileURL(path.join(sourceRoot, "supabase/functions/_shared/emailKit.ts")).href);
  const times = [["00:00", "12 AM"], ["00:05", "12:05 AM"], ["11:00", "11 AM"], ["11:59", "11:59 AM"], ["12:00", "12 PM"], ["12:01", "12:01 PM"], ["18:00", "6 PM"], ["18:15", "6:15 PM"], ["23:59", "11:59 PM"], ["18:00:00", "6 PM"]];
  for (const [time, wanted] of times) check(`time ${time}`, kit.formatTime12hr(time) === wanted, kit.formatTime12hr(time));
  const dates = [["2026-09-17", "Thursday, September 17"], ["2026-10-03", "Saturday, October 3"], ["2026-12-31", "Thursday, December 31"], ["2027-01-01", "Friday, January 1"]];
  for (const [date, wanted] of dates) {
    check(`English date ${date}`, kit.formatDateLong(date) === wanted, kit.formatDateLong(date));
    for (const lang of ["en", "es"]) check(`${lang} page/email date agrees ${date}`, kit.formatDateLong(date, lang) === dateLong(date, lang));
  }
  browser = await chromium.launch({ headless: true });
  for (const lang of ["en", "es"]) {
    const out = path.join(REPO, "email-preview", `99-2-${lang}${BREAK ? `-${BREAK}` : ""}`);
    const render = spawnSync(process.execPath, [path.join(sourceRoot, "scripts/render-emails.mjs"), `--lang=${lang}`, `--out=${out}`], { cwd: REPO, encoding: "utf8" });
    if (render.status !== 0) throw new Error(`Rendering ${lang} failed: ${render.stderr}`);
    const logFile = `receipts/email-dates${BREAK ? `.${BREAK}.sabotage` : ""}.${lang}.txt`;
    writeFileSync(path.join(REPO, logFile), render.stdout + render.stderr);
    artifacts.push(logFile);
    const index = readFileSync(path.join(out, "index.html"), "utf8");
    let files = readdirSync(out).filter(f => f.endsWith(".html") && f !== "index.html").sort();
    if (BREAK === "missing") files = files.slice(1);
    discovered += files.length;
    check(`${lang} discovered all previews`, files.length === EXPECTED_EMAILS, `${files.length} of ${EXPECTED_EMAILS}`);
    check(`${lang} subjects use readable dates and times`, !badDateTime(index.replace(/<[^>]*>/g, "")));
    for (const file of files) {
      attempted++;
      const text = readFileSync(path.join(out, file.replace(/\.html$/, ".txt")), "utf8");
      check(`${lang}/${file} plain-text date/time`, !badDateTime(text));
      for (const [width, height] of WIDTHS) {
        const context = await browser.newContext({ viewport: { width, height } });
        const page = await context.newPage();
        const consoleErrors = [];
        page.on("console", msg => { if (["warning", "error"].includes(msg.type())) consoleErrors.push(msg.text()); });
        page.on("pageerror", err => consoleErrors.push(err.message));
        await page.goto(pathToFileURL(path.join(out, "index.html")).href);
        await page.locator(`a[href="${file}"]`).click();
        const body = await page.locator("body").innerText();
        const label = `${lang}/${file}@${width}`;
        check(`${label} has real email content`, body.trim().length > 100);
        check(`${label} language`, await page.locator("html").getAttribute("lang") === lang);
        check(`${label} readable date/time`, !badDateTime(body));
        check(`${label} fits horizontally`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        check(`${label} console`, consoleErrors.length === 0, consoleErrors.join("; "));
        if (file === "customer-confirmation.html") {
          const expectedDate = lang === "en" ? "Thursday, September 17" : dateLong("2026-09-17", "es");
          check(`${label} actual appointment`, body.includes(expectedDate) && body.includes("10 AM") && body.includes("1:30 PM") && !body.includes("2026"));
          if (!BREAK && [390, 768, 1440].includes(width)) {
            mkdirSync(SHOTS, { recursive: true });
            const shot = `${SHOTS}/confirmation-${lang}-${width}.jpg`;
            await page.screenshot({ path: shot, type: "jpeg", quality: 90, fullPage: true });
            artifacts.push(shot);
          }
          if (!BREAK && lang === "en" && width === 390) {
            const { freeze, differs } = await import(pathToFileURL("C:/Users/rando/Downloads/claude/belt/freeze.mjs").href);
            await freeze(page, { out: `${SHOTS}/after.html`, label: "After", note: "The date has no year; 10 AM is shorter and 1:30 PM keeps its exact minutes.", highlightText: "10 AM" });
            check("before and after visibly differ", await differs(page, `${SHOTS}/before.html`, `${SHOTS}/after.html`));
            writeFileSync(`${SHOTS}/where.json`, JSON.stringify({ what: "Email dates lose the year and whole hours lose :00; exact minutes stay.", url: pathToFileURL(path.join(out, file)).href, how: "Open the email preview list, then Customer - booking confirmed.", situation: "A confirmed booking from 10 AM to 1:30 PM on Thursday, September 17." }, null, 2));
          }
        }
        await context.close();
      }
      completed++;
    }
    observations.push(`${lang}: ${files.length} of ${EXPECTED_EMAILS} emails at ${WIDTHS.map(v => v[0]).join("/")}`);
  }
} catch (err) {
  failures.push(err.message);
} finally {
  await browser?.close();
  if (scratch) {
    // mkdtemp creates only our copy, inside the OS temp folder. Never remove REPO.
    if (!path.resolve(scratch).startsWith(path.resolve(tmpdir()) + path.sep) || !path.basename(scratch).startsWith("dp-email-dates-")) throw new Error("Unsafe cleanup target");
    rmSync(scratch, { recursive: true, force: true });
  }
}
const canaryCaught = badDateTime("Thursday, September 17, 2026 at 10:00 AM")
  && badDateTime("2026-09-17 at 10 AM") && !badDateTime("Thursday, September 17 at 10 AM - 1:30 PM");
const receipt = writeReceipt({ check_id: "email-dates", started_at, status: failures.length ? "fail" : "pass", expected_targets: EXPECTED_TARGETS, discovered_targets: discovered, attempted_targets: attempted, completed_targets: completed, skipped_targets: 0, assertions_executed: assertions, min_assertions: 1700, failures, artifacts, dimensions: { break: BREAK, languages: ["en", "es"], widths: WIDTHS.map(v => v[0]), scope: "Local email formatting only; no live send, consent, channel routing, or relative dates." }, canary: { id: "old whole-hour and ISO dates", expected: "fail", observed: canaryCaught ? "fail" : "pass", caught: canaryCaught } });
console.log(observations.join("\n"));
console.log(`${discovered} of ${EXPECTED_TARGETS} targets; ${assertions} assertions; ${failures.length} failures`);
for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Receipt ${receipt.path}`);
if (failures.length || !canaryCaught) process.exitCode = 1;
