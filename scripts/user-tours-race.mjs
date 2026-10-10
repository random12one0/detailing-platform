// ROADMAP 9.24 — A FRESH SIGN-IN NO LONGER ASKS `user_tours`, SO IT CAN NO
// LONGER BE REFUSED 401.
//
//   set -a; . ./.env; set +a
//   node scripts/user-tours-race.mjs                   # dev server on :5173
//   node scripts/user-tours-race.mjs --break=old-read  # sabotage: the old read, restored in the page
//
// 9.24 was measured 2026-10-09: `App.jsx` read `user_tours` the moment
// `session.user.id` existed, beside the session rather than after it, and one
// fresh sign-in at 1440 got a 401. **9.15 (f434f1f, 2026-10-10) deleted the
// tours, and that read and the `dp.tour` device flag it wrote went with them.**
// So the fix is already in the tree; this is the done-when, asked of the
// running app rather than of the source:
//
//   - RUNS fresh sign-ins through the real form at 1440 and at 392, each in a
//     new browser context, each followed by one reload (the restored-session
//     path). Per run: ZERO `user_tours` requests (which is stronger than zero
//     401s and implies it), ZERO 401s from any `/rest/v1/` read, no
//     localStorage key naming a tour, and a console with no error or warning.
//     Counted by a RESPONSE LISTENER, never by reading the console.
//   - THE REFUSED CASE, once per width: a `user_tours` read made with a
//     mangled bearer must be counted by that same listener as a 401 — the
//     listener can see exactly the failure this item is about — and must leave
//     no tour flag behind.
//
// THE SABOTAGE IS THE ORIGINAL READ. `--break=old-read` rewrites the served
// App.jsx module so it reads `user_tours` through the app's own client as soon
// as the auth state names a user — the shape 9.15 removed — and the rewrite
// must SIGN itself in the page before either colour is believed (gotchas 102,
// 113). Whether that read 401s depends on the race, which did not reproduce
// every time even when it was live; the "zero requests" assertion reddens on
// the read itself, which is why it is the one asserted.
//
// Read-only: no writes to the database, 2 x RUNS password sign-ins (well under
// the project's 150 per 5 minutes on /token).

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)(join(REPO, "app/node_modules/playwright/index.js"));

const BASE = process.env.BASE_URL || "http://localhost:5173";
const BREAK = (process.argv.slice(2).find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
if (BREAK && BREAK !== "old-read") { console.error(`unknown --break=${BREAK}; the only one is old-read`); process.exit(2); }

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY — run `set -a; . ./.env; set +a` first.");
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}
if (!SUPABASE_URL.includes("kguqylyzgyzfktkfnhjb")) {
  console.error("SUPABASE_URL is not the platform's own project (kguqylyzgyzfktkfnhjb). Stopping.");
  process.exit(2);
}

const OWNER = demoOwner();
const RUNS = Number(process.env.RUNS || 20);
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }];
const PER_RUN = 4;
// Per run 4, per width 1 refused read, plus 1 pure canary.
const EXPECTED_ASSERTIONS = SIZES.length * (RUNS * PER_RUN + 1) + 1;

const ART = join(REPO, ".manager-shots", "9.24");
mkdirSync(ART, { recursive: true });
const failures = [], observed = [], sabotage = [], artifacts = [];
let assertions = 0;
const ok = (cond, name, detail, quiet) => {
  assertions++;
  const line = `${cond ? "PASS" : "FAIL"} ${name} — ${detail}`;
  if (!quiet || !cond) console.log(line);
  observed.push(line);
  if (!cond) failures.push(`${name}: ${detail}`);
};

// THE RULE, as a pure function so the canary bites the production rule.
const toursClean = (responses) => !responses.some((r) => r.url.includes("/rest/v1/user_tours"));
const tourKeys = () => Object.keys(localStorage).filter((k) => /tour/i.test(k));

const INJECT = `
;supabase.auth.onAuthStateChange((_e, s) => {
  const uid = s?.user?.id;
  if (uid) supabase.from("user_tours").select("user_id").eq("user_id", uid).maybeSingle().then(() => {}, () => {});
});
globalThis.__toursBreak = true;
`;

const browser = await chromium.launch();
const totals = {};
try {
  for (const { w, h } of SIZES) {
    totals[w] = { toursRequests: 0, tours401: 0, rest401: 0, runs: 0 };
    for (let i = 1; i <= RUNS; i++) {
      const tag = `${w}/run${String(i).padStart(2, "0")}`;
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const consoleBad = [];
      page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consoleBad.push(m.text().slice(0, 160)); });
      const responses = [];
      page.on("response", (r) => { if (r.url().includes("/rest/v1/")) responses.push({ url: r.url(), status: r.status() }); });

      let landed = 0;
      if (BREAK) {
        await page.route("**/src/App.jsx*", async (route) => {
          const res = await route.fetch();
          const body = await res.text();
          landed = body.includes('from "/src/lib/supabase.js"') ? 1 : 0;
          await route.fulfill({ response: res, body: body + INJECT, headers: { ...res.headers(), "cache-control": "no-store" } });
        });
      }

      await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
      if (!(await page.locator("input[type=email]").count())) throw new Error(`${tag}: a fresh context was already signed in`);
      await page.fill("input[type=email]", OWNER.email);
      await page.fill("input[type=password]", OWNER.password);
      await page.click("form button.btn.primary");
      await page.waitForSelector(".tabbar", { timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);
      if (BREAK) {
        const ran = await page.evaluate(() => globalThis.__toursBreak === true);
        sabotage.push({ tag, landed, ran });
        if (!landed || !ran) {
          console.error(`SABOTAGE DID NOT TAKE at ${tag}: landed ${landed}, ran ${ran}. This run proves nothing (gotchas 102, 113).`);
          process.exitCode = 3;
        }
      }
      // The restored-session path: same context, the stored session, a new page load.
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector(".tabbar", { timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);

      const tours = responses.filter((r) => r.url.includes("/rest/v1/user_tours"));
      const r401 = responses.filter((r) => r.status === 401);
      const keys = await page.evaluate(tourKeys);
      totals[w].toursRequests += tours.length;
      totals[w].tours401 += tours.filter((r) => r.status === 401).length;
      totals[w].rest401 += r401.length;
      totals[w].runs++;
      ok(toursClean(responses), `${tag}/no-user_tours-request`, `${tours.length} request(s), statuses ${JSON.stringify(tours.map((r) => r.status))}`, true);
      ok(r401.length === 0, `${tag}/no-rest-401`, `${r401.length} of ${responses.length} REST responses were 401`
        + (r401.length ? `: ${r401.slice(0, 2).map((r) => r.url.split("/rest/v1/")[1].slice(0, 60)).join(" | ")}` : ""), true);
      ok(keys.length === 0, `${tag}/no-tour-flag`, `localStorage tour keys: ${JSON.stringify(keys)}`, true);
      ok(consoleBad.length === 0, `${tag}/console-clean`, `${consoleBad.length} error/warning line(s)`
        + (consoleBad.length ? `: ${consoleBad.slice(0, 2).join(" | ")}` : ""), true);

      // THE REFUSED CASE, on the last run of each width: the listener must SEE a
      // user_tours 401, and nothing may turn it into a device flag.
      if (i === RUNS) {
        await page.screenshot({ path: join(ART, `signed-in-${w}.png`) });
        artifacts.push(`.manager-shots/9.24/signed-in-${w}.png`);
        const before = responses.length;
        await page.evaluate(async ({ url, key }) => {
          await fetch(`${url}/rest/v1/user_tours?select=user_id`, { headers: { apikey: key, Authorization: "Bearer not-a-token" } });
        }, { url: SUPABASE_URL, key: SUPABASE_ANON_KEY });
        await page.waitForTimeout(500);
        const seen = responses.slice(before).filter((r) => r.url.includes("/rest/v1/user_tours"));
        const after = await page.evaluate(tourKeys);
        ok(seen.length === 1 && seen[0].status === 401 && after.length === 0, `${w}/refused-read-seen-and-flag-untouched`,
          `listener saw ${seen.length} user_tours response(s) ${JSON.stringify(seen.map((r) => r.status))}; tour keys after: ${JSON.stringify(after)}`);
      }
      await ctx.close();
    }
    const t = totals[w];
    console.log(`${w}: ${t.runs}/${RUNS} sign-ins, user_tours requests ${t.toursRequests}, user_tours 401s ${t.tours401}, REST 401s ${t.rest401}`);
  }
} finally {
  await browser.close();
}

// THE CANARY: the production rule must call a user_tours 401 unclean.
const c = toursClean([{ url: `${SUPABASE_URL}/rest/v1/user_tours?select=user_id`, status: 401 }]);
ok(!c, "canary/user_tours-401", "a user_tours 401 must NOT read as clean");

if (assertions !== EXPECTED_ASSERTIONS) {
  failures.push(`assertion count ${assertions} != declared ${EXPECTED_ASSERTIONS} — a run that never reached a width`);
}

const targets = SIZES.length * RUNS;
const reached = Object.values(totals).reduce((n, t) => n + t.runs, 0);
const status = failures.length ? "fail" : "pass";
const { path } = writeReceipt({
  check_id: "user-tours-race",
  started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  status,
  expected_targets: targets,
  discovered_targets: reached,
  attempted_targets: reached,
  completed_targets: reached,
  skipped_targets: targets - reached,
  assertions_executed: assertions,
  min_assertions: EXPECTED_ASSERTIONS,
  assertion_floor: `2 widths x (${RUNS} sign-ins x ${PER_RUN} + 1 refused read) + 1 canary = ${EXPECTED_ASSERTIONS}, asserted as an EQUALITY (docs/gotchas.md 98).`,
  failures,
  artifacts,
  warnings: [
    "Dev server only (React.StrictMode). The live domain runs whatever was last published; until 9.15 is published it still makes the old read.",
    "The original 401 was a race that did not reproduce every time; zero requests is asserted because a read that never happens cannot be refused.",
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), runs_per_width: RUNS, totals, item: "9.24", break: BREAK },
  canary: { id: "user_tours-401", observed_failure: !c },
  sabotage, observed,
});
console.log(`receipt: ${path}`);
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, ${reached} of ${targets} sign-ins reached`);
if (failures.length && !process.exitCode) process.exitCode = 1;
