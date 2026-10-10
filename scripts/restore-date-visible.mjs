// ROADMAP 6.1 — IS THE DATE OF THE LAST PROVED RESTORE VISIBLE IN THE BACK
// OFFICE, AND DOES THE SCREEN REFUSE TO PRINT ONE IT WAS NOT GIVEN?
//
//   node scripts/restore-date-visible.mjs
//   node scripts/restore-date-visible.mjs --break=strip   # sabotage: the real row is removed in the browser
//
// Needs the dev server and `.env` loaded (`set -a; . ./.env; set +a`). Makes
// its own platform-admin account and drops it in a `finally`
// (`scripts/admin-account.mjs`), like `health-line-honest.mjs`.
//
// THE EXPECTED DATE IS READ FROM THE DATABASE, NEVER FROM THE PAGE. The
// `restore-drill` row of `job_heartbeats` is fetched over REST first and the
// date the screen must print is formatted from it here; a check that read the
// screen's own date back would agree with any date at all.
//
// FOUR WORLDS PER WIDTH, three of them made by rewriting the `platform-admin`
// response in the browser (nothing written to the database):
//   real   the un-rewritten response: the DB's date, its counts, and no
//          `restore-drill` row in the jobs list
//   none   the row removed: "never recorded", and NO date anywhere on the line
//   old    ran_at 120 days back AND a 60-second window: told to run it again,
//          not green — and, because that window has long passed, it would be a
//          stopped job and an alert if the screen ever treated it as a job
//
// THE CANARY, EVERY RUN: the detector that finds the date on the `real`
// render is pointed at the `none` render and must NOT find it. A detector that
// finds a date everywhere would pass `real` while proving nothing.
// `--break=strip` is the original defect — no date in the back office — and
// must turn `real` red at every width.
import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";
import { RESTORE_JOB } from "./restore-date.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE_URL || "http://localhost:5173";
const ART = join(REPO, "artifacts", "restore-date-visible");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!U || !K) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run `set -a; . ./.env; set +a` first.");
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 844 }];
const MODES = ["real", "none", "old"];
const QUESTIONS = { real: 4, none: 2, old: 3 };

const started_at = new Date().toISOString();
const failures = [], observed = [], consoleBad = [];
let assertions = 0, completed = 0, canaryCaught = 0;
const ok = (cond, id, detail) => { assertions++; if (!cond) failures.push(`${id} — ${detail}`); return !!cond; };

// The fact under test, from the database.
const H = { apikey: K, Authorization: `Bearer ${K}` };
const rows = await fetch(`${U}/rest/v1/job_heartbeats?job=eq.${RESTORE_JOB}&select=ran_at,detail`, { headers: H }).then((r) => r.json());
const row = rows?.[0];
if (!row) {
  console.error(`No \`${RESTORE_JOB}\` row in job_heartbeats — run \`node scripts/restore-date.mjs\` first. NOTHING WAS MEASURED.`);
  process.exit(1);
}
const EXPECT = new Date(row.ran_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const DATE_SHAPE = /\b[A-Z][a-z]{2} \d{1,2}, \d{4}\b/;
observed.push(`database: ${RESTORE_JOB} ran_at ${row.ran_at} → the screen must print "${EXPECT}", ${row.detail?.tables} tables`);

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });
const acct = await makeAdmin(U, K);
if (!acct) { console.error("could not make a platform-admin account"); process.exit(1); }
const browser = await chromium.launch();
let page;
try {
  const ctx = await browser.newContext({ viewport: { width: SIZES[0].w, height: SIZES[0].h } });
  page = await ctx.newPage();
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consoleBad.push(`${m.type()}: ${m.text().slice(0, 200)}`); });

  let MODE = "real", jobsSent = 0;
  await page.route("**/functions/v1/platform-admin", async (route) => {
    let res;
    try { res = await route.fetch(); } catch { return route.abort().catch(() => {}); }
    let body;
    try { body = await res.json(); } catch { return route.fulfill({ response: res }); }
    if (Array.isArray(body?.heartbeats)) {
      const others = body.heartbeats.filter((h) => h.job !== RESTORE_JOB);
      jobsSent = others.length;
      if (MODE === "none" || (MODE === "real" && BREAK === "strip")) body.heartbeats = others;
      if (MODE === "old") {
        body.heartbeats = [...others, {
          job: RESTORE_JOB, ran_at: new Date(Date.now() - 120 * 864e5).toISOString(),
          detail: row.detail, stale_after_seconds: 60, alerted_at: null,
        }];
      }
    }
    return route.fulfill({ status: res.status(), contentType: "application/json", body: JSON.stringify(body) });
  });

  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email]", { timeout: 25000 });
  await page.fill("input[type=email]", acct.email);
  await page.fill("input[type=password]", acct.password);
  await page.click("form button.pa-btn");
  // Signed in BEFORE the first reload, or the reload lands on the sign-in form.
  await page.waitForSelector(".pa-tab", { timeout: 25000 });

  const open = async () => {
    await page.waitForSelector(".pa-tab", { timeout: 25000 });
    const tabs = await page.$$eval(".pa-tab", (els) => els.map((e) => (e.textContent || "").trim()));
    const i = tabs.findIndex((t) => /system health/i.test(t));
    if (i < 0) throw new Error("no `System health` tab — the sign-in never went through");
    await page.click(`.pa-tab >> nth=${i}`);
    await page.waitForFunction(() => [...document.querySelectorAll(".pa-svc-n")]
      .some((e) => /last restore test/i.test(e.textContent || "")), null, { timeout: 20000 });
    // THE TAB ARRIVES WITH A STAGGERED FADE. A hit test cannot see opacity
    // (docs/gotchas.md 100), so wait for every animation to end, then measure.
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  };
  // The line, found by its NAME (the words), never by the `data-restore`
  // attribute — that is the screen's own claim about the thing under test.
  const readLine = () => page.evaluate(() => {
    const r = [...document.querySelectorAll(".pa-svc-r")]
      .find((x) => /last restore test/i.test(x.querySelector(".pa-svc-n")?.textContent || ""));
    if (!r) return null;
    r.scrollIntoView({ block: "center" });
    const v = r.querySelector(".pa-v"), b = v.getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    const jobNames = [...document.querySelectorAll(".pa-svc-r[data-job-state] .pa-svc-n")].map((e) => e.textContent.trim())
      // the jobs list always ends with the fixed "Dead man's switch" line, which is not a job row
      .filter((n) => !/dead man/i.test(n));
    return {
      value: v.textContent.trim(), desc: r.querySelector(".pa-svc-d")?.textContent.trim() ?? "",
      green: !!r.querySelector(".pa-dot.pa-ok"),
      opaque: (() => { for (let e = v; e; e = e.parentElement) if (Number(getComputedStyle(e).opacity) < 1) return false; return true; })(),
      painted: !!hit && (hit === v || v.contains(hit)) && b.width > 0,
      jobNames, body: document.body.textContent,
    };
  });
  const dateShown = (l) => !!l && l.value === EXPECT && l.painted && l.opaque;

  for (const s of SIZES) {
    const tag = `${s.w}x${s.h}`;
    await page.setViewportSize({ width: s.w, height: s.h });
    const seen = {};
    for (const m of MODES) {
      MODE = m;
      await page.reload({ waitUntil: "domcontentloaded" });
      let l = null;
      try { await open(); l = await readLine(); } catch (e) { failures.push(`${tag}/${m} — did not render: ${e.message}`); }
      seen[m] = l;
      await page.screenshot({ path: join(ART, `${tag}-${m}.png`) });
      if (!l) { assertions += QUESTIONS[m]; continue; }
      completed++;
      if (m === "real") {
        ok(dateShown(l), `${tag}/real/date`, `expected "${EXPECT}" painted on the line, saw "${l.value}" (painted ${l.painted}, opaque ${l.opaque})`);
        ok(l.desc.includes(`${row.detail?.tables} tables`), `${tag}/real/counts`, `the line does not carry the restore's ${row.detail?.tables} tables: "${l.desc}"`);
        ok(l.green, `${tag}/real/green`, "a restore four days old is not drawn as current");
        ok(!l.jobNames.some((n) => n.includes(RESTORE_JOB)) && l.jobNames.length === jobsSent, `${tag}/real/not-a-job`,
          `jobs list drew ${l.jobNames.length} rows for ${jobsSent} jobs sent: ${l.jobNames.join(", ")}`);
      } else if (m === "none") {
        ok(l.value === "never recorded", `${tag}/none/says-never`, `with no row the line said "${l.value}"`);
        ok(!DATE_SHAPE.test(l.value + " " + l.desc) && !l.green, `${tag}/none/no-date`, `with no row it still showed a date or a green dot: "${l.value}" "${l.desc}"`);
      } else {
        ok(/run the restore test again/i.test(l.desc) && !l.green, `${tag}/old/says-old`, `a 120-day-old restore was not called old: "${l.desc}" green ${l.green}`);
        ok(!l.jobNames.some((n) => n.includes(RESTORE_JOB)), `${tag}/old/not-a-job`, "the restore row was drawn as a job");
        ok(!l.body.includes(RESTORE_JOB), `${tag}/old/no-alert`, `"${RESTORE_JOB}" appears on the page — a 60-second window long passed made it an alert`);
      }
    }
    if (seen.none && !dateShown(seen.none)) canaryCaught++;
    observed.push(`${tag}: real="${seen.real?.value}" · none="${seen.none?.value}" · old green=${seen.old?.green}`);
  }
} finally {
  try { await page?.unrouteAll({ behavior: "ignoreErrors" }); } catch { /* closing anyway */ }
  try { await browser.close(); } catch { /* closing anyway */ }
  await dropAdmin(U, K, acct.id);
}

const FORGIVEN = /React Router Future Flag Warning/;
const uniq = [...new Set(consoleBad)];
for (const c of uniq.filter((c) => !FORGIVEN.test(c))) failures.push(`console — ${c}`);
const forgiven = uniq.filter((c) => FORGIVEN.test(c));
if (forgiven.length) observed.push(`console: ${forgiven.length} React Router future-flag warning(s) FORGIVEN BY NAME`);

const targets = SIZES.length * MODES.length;
const perWidth = Object.values(QUESTIONS).reduce((a, b) => a + b, 0);
const { path } = writeReceipt({
  check_id: "restore-date-visible",
  started_at,
  status: failures.length || canaryCaught !== SIZES.length ? "fail" : "pass",
  expected_targets: targets, discovered_targets: targets, attempted_targets: targets,
  completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: SIZES.length * perWidth,
  assertion_floor: `${SIZES.length} widths x (real 4 + none 2 + old 3) = ${SIZES.length * perWidth}; a world that never renders books its questions as asked and failed.`,
  failures,
  warnings: [
    "`none` and `old` rewrite the platform-admin response in the browser; nothing is written. `real` is un-rewritten unless --break=strip.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  artifacts: SIZES.flatMap((s) => MODES.map((m) => `artifacts/restore-date-visible/${s.w}x${s.h}-${m}.png`)),
  dimensions: { expected_date: EXPECT, ran_at: row.ran_at, observed, break: BREAK, console_forgiven_by_name: forgiven },
  canary: {
    id: "the date detector, pointed at the render that has no row, must not find a date",
    observed_failure: canaryCaught === SIZES.length,
    findings: [`caught at ${canaryCaught} of ${SIZES.length} widths`],
  },
});
for (const o of observed) console.log("  " + o);
console.log(failures.length ? `FAIL  restore-date-visible — ${failures.length} finding(s)` : `PASS  restore-date-visible — ${completed}/${targets} worlds, ${assertions} assertions, canary caught ${canaryCaught}/${SIZES.length}`);
for (const f of failures) console.log("  · " + f);
console.log("receipt: " + path.replace(REPO, "").replace(/^[\\/]/, ""));
process.exit(failures.length || canaryCaught !== SIZES.length ? 1 : 0);
