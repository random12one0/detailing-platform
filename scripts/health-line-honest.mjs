// CAN A PERSON TELL "CHECKED RECENTLY, ALL FINE" FROM "NOBODY HAS HEARD
// ANYTHING" ON THE BACK OFFICE'S HEALTH LINE — WITHOUT CLICKING, WITHOUT
// COLOUR, AND AT EVERY WIDTH.
//
//   node scripts/health-line-honest.mjs
//   node scripts/health-line-honest.mjs --headed
//   node scripts/health-line-honest.mjs --break=samewords   # sabotage: the words
//   node scripts/health-line-honest.mjs --break=seedmarker  # sabotage: the marker
//   node scripts/health-line-honest.mjs --break=emptyclean  # sabotage: the empty lede
//   node scripts/health-line-honest.mjs --break=dotonly     # sabotage: colour alone
//   node scripts/health-line-honest.mjs --break=wire        # sabotage: the server field
//
// Needs the dev server and `.env` loaded (`set -a; . ./.env; set +a`). It
// makes its own platform-admin account and drops it, like `admin-contrast`.
//
// ---------------------------------------------------------------------------
// THE FAULT, WHICH IS THIS REPO'S OLDEST ONE WEARING A COAT — ROADMAP 6.2a
// ---------------------------------------------------------------------------
// `job_heartbeats` is seeded at `now()` for every job, deliberately, so that a
// brand-new install does not raise an alarm about a nightly job that has
// simply not come round yet. The seed marks those rows `detail.seeded = true`
// and its own header says what that costs: **a job that has never run once
// renders exactly like a job that finished a minute ago.**
//
// So the health line said a thing was working on the strength of having heard
// nothing from it. That is a check passing having tested nothing — except a
// person is reading this one, and deciding whether to go and look.
//
// ---------------------------------------------------------------------------
// THE FIXTURE IS THE ARGUMENT. TWO ROWS, ONE TIMESTAMP.
// ---------------------------------------------------------------------------
// `zz-never-run` and `zz-just-ran` are fed **the identical `ran_at`**. The one
// and only difference between them is `detail.seeded`. A screen that ignores
// that marker cannot render them differently, so the central assertion —
// *their words differ* — is the fault itself, stated as a question.
//
// **NOTHING IS WRITTEN TO THE DATABASE.** The fixtures are injected by
// rewriting the `platform-admin` response in the browser, which costs no row,
// no cron interference, and nothing to restore if the run dies halfway. It
// tests the DISPLAY, which is the whole of 6.2a.
//
// **AND THAT IS EXACTLY WHY THE WIRE TARGET IS NOT OPTIONAL.** A check fed
// entirely on its own fiction would keep passing on the day the server stopped
// sending `detail` — and on that day every quiet row goes green again, in
// silence, which is the fault restored by the tool built to catch it. The
// first target is therefore the REAL, un-rewritten response, asked one
// question: does `detail` still arrive.
//
// ---------------------------------------------------------------------------
// THE ROWS ARE FOUND BY THE SLUG THIS SCRIPT INVENTED, NEVER BY THE SCREEN'S
// OWN `data-job-state`
// ---------------------------------------------------------------------------
// The markup carries `data-job-state`, and reading it would have been easier
// and worthless: it is the screen's own claim about the thing under test. If
// the classifier breaks, the attribute is wrong in the same direction, the
// check compares "the row it calls quiet" against "the row it calls ok", and
// agrees with the bug. **This repo's single most repeated failure is a check
// that reads the label instead of the contents.** So a row is located by the
// job slug the fixture put there, which is a fact about the input.
//
// ---------------------------------------------------------------------------
// WHAT IT ASSERTS — 8 questions at each of 5 widths, plus the wire, plus 2
// ---------------------------------------------------------------------------
//   words/differ          the two rows do not read the same
//   words/quiet-says-so   the quiet row states it, and names no time
//   words/ok-says-when    the healthy row names when it last ran
//   words/stopped-apart   a stopped job reads as neither of the other two
//   paint/quiet-painted   that sentence is on screen, not merely in the DOM
//   nocolour/words-carry  delete every dot and the rows still differ
//   empty/not-all-clear   an empty list does not print the all-clear
//   empty/says-so         it says plainly that nothing has been heard
//
// 1 wire + 5x8 + 2 canaries = **43**, fixed by the question list and never by
// what the run finds. A width whose screen never renders grades as a failure
// rather than dropping out.
//
// ---------------------------------------------------------------------------
// "WITHOUT COLOUR" IS A REAL ASSERTION HERE, NOT A GOOD INTENTION
// ---------------------------------------------------------------------------
// Andrew's condition: a colour-blind reader, and anyone holding a phone in
// sunlight, must be able to tell the two apart. `nocolour/words-carry` removes
// every `.pa-dot` from the document and asks the difference question again. It
// is not a tautology — it fails the day somebody moves the distinction into
// the dot, which is where it was.
//
// ---------------------------------------------------------------------------
// THE TWO CANARIES RUN EVERY TIME AND BOTH ARE DRIVEN FROM OUTSIDE
// ---------------------------------------------------------------------------
//   * **the-unmarked-seed** — a sixth fixture row that is a never-run job with
//     the marker STRIPPED: the pre-fix data, exactly. It must render
//     identically to `zz-just-ran`, and the comparator must SAY SO. If the
//     comparator reports a difference between two rows that are the same, it
//     is not comparing what it thinks it is and every green above it is void.
//   * **the-colour-only-difference** — the quiet row's words are overwritten
//     with the healthy row's, leaving the dot alone. This is the done-when
//     read backwards: *the two states made to look the same.* The word
//     assertions must fail. If they pass, they are not reading the words.

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE_URL || process.env.BASE || "http://localhost:5173";
const ART = join(REPO, "artifacts", "health-line-honest");
const ARGS = process.argv.slice(2);
const HEADED = ARGS.includes("--headed");
const BREAK = (ARGS.find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;

const U = process.env.SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!U || !K) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run `set -a; . ./.env; set +a` first.");
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}

// 320x844 is the narrowest supported width — CLAUDE.md § Design.
const SIZES = [
  { w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 768, h: 1024 },
  { w: 392, h: 844 }, { w: 320, h: 844 },
];

const NEVER = "zz-never-run", JUST = "zz-just-ran", STOP = "zz-stopped", CAN = "zz-canary-unmarked";

/* THE ONE TIMESTAMP BOTH ROWS SHARE. Computed once per render so the two are
   bit-identical: any difference the screen draws has to come from `seeded`. */
function fixtures() {
  const now = new Date().toISOString();
  const old = new Date(Date.now() - 10 * 864e5).toISOString();
  const mark = BREAK === "seedmarker" ? {} : { seeded: true };
  return [
    { job: NEVER, ran_at: now, detail: mark, stale_after_seconds: 2700, alerted_at: null },
    { job: JUST, ran_at: now, detail: {}, stale_after_seconds: 2700, alerted_at: null },
    { job: STOP, ran_at: old, detail: {}, stale_after_seconds: 2700, alerted_at: null },
    // The canary: a never-run job with no marker. Pre-fix data, on purpose.
    { job: CAN, ran_at: now, detail: {}, stale_after_seconds: 2700, alerted_at: null },
  ];
}

const TIME_WORDS = /\bran\b|\bago\b|\bnever\b|\d+\s*(min|hour|day)/i;
const SAYS_QUIET = /not reported|nothing has been heard|never reported|nothing heard/i;
const ALL_CLEAR = /everything that reports in is reporting in/i;
const SAYS_NONE = /nothing is reporting in at all|no job has been heard|not one scheduled job/i;
/* THE LEDE IS ONLY PRINTED WHEN NOTHING ELSE IS ALARMING — a suspended
   detailer or a full photo store hides it — so a check that looked only there
   would go red on a healthy product for an unrelated reason. The ROW is
   unconditional, and `SAYS_NONE` matches its description. */

async function run() {
  rmSync(ART, { recursive: true, force: true });
  mkdirSync(ART, { recursive: true });

  const acct = await makeAdmin(U, K);
  if (!acct) throw new Error("could not make a platform-admin account");

  const failures = [], observed = [], canaries = [], missed = [], consoleBad = [];
  let assertions = 0;
  const ok = (cond, id, detail) => {
    assertions++;
    if (!cond) failures.push(`${id} — ${detail}`);
    return !!cond;
  };

  /* ══ THE TEARDOWN GOES IN A `finally`, AND THIS COST A REAL FINDING ═══════
     The first version of this script called `dropAdmin` on the line after
     `browser.close()`, with nothing catching a throw in between — exactly the
     shape `admin-contrast.mjs` already carries a `ponytail:` comment about.
     **Two runs crashed there on the night this was written** (a viewport key
     it got wrong, and a route still in flight at close), and each one left a
     live row in `platform_admins` behind: an undeclared account that can read
     every tenant through the back office.

     DP Cowork2's new check caught it inside the hour and refused to allowlist
     it, which is the correct call and the reason it is written down here.
     `shoot-admin.mjs` never had this bug — its teardown has always been in a
     `finally`; it was blamed for a while and it was not the cause.

     **A FIXTURE THAT OUTLIVES ITS TASK IS THE REPO'S OWN SUBJECT WEARING A
     THIRD COAT**: a temporary thing that looks permanent, sitting under a red
     check that people eventually learn to scroll past. The cleanup now runs
     whether this finishes, fails, or throws on line one of the browser work.
     `--crash-after-signin` exists to prove it, and is how it was proved. */
  const browser = await chromium.launch({ headless: !HEADED });
  let ctx, page;
  try {
  ctx = await browser.newContext({ viewport: { width: SIZES[0].w, height: SIZES[0].h } });
  page = await ctx.newPage();

  page.on("console", (m) => {
    const t = m.type();
    if (t === "error" || t === "warning") consoleBad.push(`${t}: ${m.text().slice(0, 200)}`);
  });

  // ── THE INTERCEPT. `MODE` is read at request time, so the same page can be
  //    re-rendered against a different world without a new context. ─────────
  let MODE = "real";             // "real" | "three" | "empty"
  let lastReal = null;
  await page.route("**/functions/v1/platform-admin", async (route) => {
    // A REQUEST STILL IN FLIGHT WHEN THE BROWSER CLOSES THROWS FROM HERE, and
    // an unhandled rejection kills the process AFTER the measurements are in
    // and BEFORE the receipt is written — a run that did the work and reported
    // nothing. `unrouteAll` below is the fix; this is the belt.
    let res;
    try { res = await route.fetch(); } catch { return route.abort().catch(() => {}); }
    let body;
    try { body = await res.json(); } catch { return route.fulfill({ response: res }); }
    if (!body || !("heartbeats" in body)) {
      return route.fulfill({ status: res.status(), contentType: "application/json", body: JSON.stringify(body) });
    }
    if (MODE === "real") {
      if (BREAK === "wire") {
        body.heartbeats = (body.heartbeats ?? []).map(({ detail, ...rest }) => rest);
      }
      // **AFTER THE SABOTAGE, NEVER BEFORE IT, AND THIS LINE WAS THE WRONG WAY
      // ROUND.** `lastReal` was captured first, so `--break=wire` stripped
      // `detail` from what the browser received while the assertion went on
      // reading the untouched copy — and the sabotage PASSED. The one target
      // that exists to stop this check grading its own fiction was doing
      // precisely that, and only breaking it on purpose said so. `lastReal` is
      // now what the page was actually handed.
      lastReal = body.heartbeats;
    } else {
      body.heartbeats = MODE === "empty" ? [] : fixtures();
    }
    // **NOT `{ response: res, body }`.** Inheriting the upstream headers carries
    // `content-encoding` with them, so the browser tries to gunzip a plain JSON
    // string, `call()` throws, and the screen renders with no state at all —
    // which looks exactly like a width that failed to draw. Status and type
    // only.
    return route.fulfill({ status: res.status(), contentType: "application/json", body: JSON.stringify(body) });
  });

  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email]", { timeout: 25000 });
  await page.fill("input[type=email]", acct.email);
  await page.fill("input[type=password]", acct.password);
  await page.click("form button.pa-btn");
  await page.waitForSelector(".pa-tab", { timeout: 25000 });

  /* WAIT FOR THE THING, NEVER FOR A DURATION. The first version of this slept
     1200ms after each reload and three of the five widths came back "did not
     render" — a race the check reported as a product fault, in its own words,
     at three widths out of five. `docs/gotchas.md` has this shape several
     times over; it is embarrassing to add another instance while building the
     instrument that is supposed to catch them. */
  const openHealth = async (expect) => {
    await page.waitForSelector(".pa-tab", { timeout: 20000 });
    const tabs = await page.$$eval(".pa-tab", (els) => els.map((e) => (e.textContent || "").trim()));
    const i = tabs.findIndex((t) => /system health/i.test(t));
    if (i < 0) throw new Error("no `System health` tab — the sign-in never went through");
    await page.click(`.pa-tab >> nth=${i}`);
    await page.waitForSelector(".pa-svc", { timeout: 20000 });
    if (expect) {
      await page.waitForFunction(
        (w) => [...document.querySelectorAll(".pa-svc-n")].some((e) => (e.textContent || "").includes(w)),
        expect, { timeout: 20000 },
      );
    }
  };
  await openHealth();

  // Proves the `finally` above. Throws where the two real crashes threw: after
  // the admin row exists and before anything tidies it.
  if (ARGS.includes("--crash-after-signin")) throw new Error("deliberate crash, proving the teardown runs");

  // ── TARGET 1 · THE WIRE. The only un-rewritten measurement here. ─────────
  {
    const rows = lastReal ?? [];
    const withDetail = rows.filter((h) => h && typeof h.detail === "object" && h.detail !== null).length;
    ok(rows.length > 0 && withDetail === rows.length, "wire/detail-present",
      `platform-admin returned ${rows.length} heartbeat row(s), ${withDetail} carrying \`detail\`. `
      + "Without that field the screen cannot tell a seeded row from a real run and every quiet "
      + "row silently goes green — this check would keep passing on its own fixtures.");
    const seeded = rows.filter((h) => h?.detail?.seeded === true).map((h) => h.job);
    observed.push(`wire: ${rows.length} job(s) live, ${withDetail} carry \`detail\``
      + (seeded.length ? `, still seeded (never run): ${seeded.join(", ")}` : ", none still seeded"));
    await page.screenshot({ path: join(ART, "wire-real-screen.png") });
  }

  // How a row reads, located by the slug the fixture put there.
  const readRow = (slug) => page.evaluate((s) => {
    const row = [...document.querySelectorAll(".pa-svc-r")]
      .find((r) => (r.querySelector(".pa-svc-n")?.textContent || "").includes(s));
    if (!row) return null;
    const v = row.querySelector(".pa-v");
    const d = row.querySelector(".pa-svc-d");
    const rect = v?.getBoundingClientRect();
    let hit = false;
    if (rect && rect.width && rect.height) {
      const el = document.elementFromPoint(Math.round(rect.left + rect.width / 2), Math.round(rect.top + rect.height / 2));
      hit = !!el && (el === v || v.contains(el) || el.contains(v));
    }
    const cs = v ? getComputedStyle(v) : null;
    return {
      value: (v?.textContent || "").trim(),
      desc: (d?.textContent || "").trim(),
      all: (row.textContent || "").trim(),
      dot: row.querySelector(".pa-dot")?.className || "",
      painted: !!(rect && rect.width > 0 && rect.height > 0 && hit
        && cs && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0),
    };
  }, slug);

  /* LET THE ENTRANCE FINISH BEFORE ASKING WHETHER ANYTHING IS VISIBLE.
     `.pa-in > *` runs `pa-arrive`, which starts at `opacity: 0` and is
     staggered 40ms per child. Reading `opacity` inside that window says a
     painted sentence is invisible — and it did: the first version of this
     check went red on `empty/says-so` at 1440x900 and NOWHERE ELSE, a width
     whose stagger happened to land under the read. **A geometry sweep
     catching an entrance mid-flight is a `docs/gotchas.md` entry, and it
     arrived here as a product fault at one width out of five**, which is
     exactly how that class of bug presents.

     Infinite animations (`.pa-load`) never settle, so only finite running
     ones are awaited and the whole wait is capped. */
  const settle = () => page.evaluate(() => Promise.race([
    Promise.all(document.getAnimations()
      .filter((a) => a.playState === "running"
        && Number.isFinite(a.effect?.getComputedTiming?.().endTime))
      .map((a) => a.finished.catch(() => {}))),
    new Promise((r) => setTimeout(r, 2500)),
  ]));

  const stripDots = () => page.evaluate(() => {
    document.querySelectorAll(".pa-dot").forEach((d) => d.remove());
  });
  const rewriteQuietAsHealthy = (a, b) => page.evaluate(({ a, b }) => {
    const find = (s) => [...document.querySelectorAll(".pa-svc-r")]
      .find((r) => (r.querySelector(".pa-svc-n")?.textContent || "").includes(s));
    const from = find(b), to = find(a);
    if (!from || !to) return false;
    to.querySelector(".pa-v").textContent = from.querySelector(".pa-v").textContent;
    to.querySelector(".pa-svc-d").textContent = from.querySelector(".pa-svc-d").textContent;
    return true;
  }, { a, b });

  for (const size of SIZES) {
    const tag = `${size.w}x${size.h}`;
    await page.setViewportSize({ width: size.w, height: size.h });

    // ── THE THREE-STATE SCREEN ────────────────────────────────────────────
    MODE = "three";
    await page.reload({ waitUntil: "domcontentloaded" });
    await openHealth(NEVER);
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle();

    // `--break=samewords` and `--break=dotonly` are applied to the LIVE page
    // rather than to a source file: nothing in `app/src` is edited while a
    // browser script is running (CLAUDE.md), and a sabotage that needs an edit
    // is a sabotage nobody runs.
    if (BREAK === "samewords") await rewriteQuietAsHealthy(NEVER, JUST);
    if (BREAK === "dotonly") {
      await page.evaluate(() => document.querySelectorAll(".pa-svc-r .pa-v, .pa-svc-r .pa-svc-d")
        .forEach((e) => { e.textContent = ""; }));
    }

    const never = await readRow(NEVER), just = await readRow(JUST), stop = await readRow(STOP);
    if (!never || !just || !stop) {
      failures.push(`${tag} — the three-state screen did not render (never=${!!never} just=${!!just} stopped=${!!stop}). `
        + "A width that never drew is a failure, never a skip.");
      assertions += 8;
      continue;
    }
    // Viewport frame, not fullPage: fullPage paints a position: fixed element in the wrong place (ROADMAP 9.11d).
    await page.screenshot({ path: join(ART, `${tag}-three-states.png`) });

    ok(never.value !== just.value, "words/differ",
      `${tag}: both rows were handed the SAME \`ran_at\` and differ only by \`detail.seeded\`, `
      + `and both read "${just.value}". Nothing has been heard from one of them.`);
    ok(SAYS_QUIET.test(never.value + " " + never.desc) && !TIME_WORDS.test(never.value),
      "words/quiet-says-so",
      `${tag}: the never-reported row reads "${never.value}" / "${never.desc.slice(0, 70)}" — it must `
      + "say it has not reported, in words, and must not name a time it did not run at.");
    ok(/ago/i.test(just.value), "words/ok-says-when",
      `${tag}: the healthy row reads "${just.value}" — it must say when it last finished.`);
    ok(stop.value !== never.value && stop.desc !== never.desc, "words/stopped-apart",
      `${tag}: a stopped job reads "${stop.value}" and a never-reported one "${never.value}". `
      + "Three states, not two — merged, the screen cannot say which kind of trouble it is in.");
    ok(never.painted, "paint/quiet-painted",
      `${tag}: the sentence is in the DOM and is not on screen (painted=${never.painted}). `
      + "docs/gotchas.md — a present element is not a visible one.");

    if (size.w === SIZES[0].w) {
      // ── CANARY 1 · the pre-fix row, and the comparator asked about it. ───
      const canRow = await readRow(CAN);
      const same = !!canRow && canRow.value === just.value;
      canaries.push(`the-unmarked-seed: unmarked never-run reads "${canRow?.value}", healthy reads `
        + `"${just.value}" — comparator says ${same ? "SAME" : "DIFFERENT"}`);
      if (!same) {
        missed.push("CANARY MISSED: the-unmarked-seed — two rows with the same timestamp and no "
          + "marker were reported as DIFFERENT. The comparator is not reading what it thinks it is.");
      }
      // ── CANARY 2 · the two states made to look the same, on purpose. ─────
      const before = await readRow(NEVER);
      await rewriteQuietAsHealthy(NEVER, JUST);
      const after = await readRow(NEVER);
      await page.screenshot({ path: join(ART, "canary-words-made-same.png") });
      const caught = after.value === just.value && !(after.value !== just.value)
        && !(SAYS_QUIET.test(after.value + " " + after.desc) && !TIME_WORDS.test(after.value));
      canaries.push(`the-colour-only-difference: quiet row rewritten from "${before.value}" to `
        + `"${after.value}", dot left as "${after.dot}" — word assertions ${caught ? "FAILED as required" : "still passed"}`);
      if (!caught) {
        missed.push("CANARY MISSED: the-colour-only-difference — the quiet row's words were replaced "
          + "with the healthy row's and the word assertions still passed. They are not reading the words.");
      }
      // Put the screen back before the colour question.
      await page.reload({ waitUntil: "domcontentloaded" });
      await openHealth(NEVER);
      await settle();
      if (BREAK === "samewords") await rewriteQuietAsHealthy(NEVER, JUST);
    }

    // ── COLOUR REMOVED. Last on this screen: it deletes nodes. ────────────
    await stripDots();
    const nDot = await readRow(NEVER), jDot = await readRow(JUST);
    ok(nDot && jDot && nDot.all !== jDot.all, "nocolour/words-carry",
      `${tag}: with every dot deleted the two rows read identically ("${nDot?.all?.slice(0, 60)}"). `
      + "The difference lives in a 7px mark, which a colour-blind reader and a phone in sunlight "
      + "both lose.");
    // Viewport frame, not fullPage: fullPage paints a position: fixed element in the wrong place (ROADMAP 9.11d).
    await page.screenshot({ path: join(ART, `${tag}-no-dots.png`) });

    // ── THE EMPTY SCREEN ─────────────────────────────────────────────────
    MODE = "empty";
    await page.reload({ waitUntil: "domcontentloaded" });
    await openHealth("No job is reporting");
    await settle();
    if (BREAK === "emptyclean") {
      await page.evaluate((s) => {
        const p = document.querySelector(".pa-sub");
        if (p) p.textContent = s;
        document.querySelectorAll(".pa-svc-r").forEach((r) => {
          if (/No job is reporting/i.test(r.textContent || "")) r.remove();
        });
      }, "Everything that reports in is reporting in.");
    }
    const emptyText = await page.evaluate(() => document.body.innerText);
    const saidNone = await page.evaluate((re) => {
      const rx = new RegExp(re, "i");
      const el = [...document.querySelectorAll(".pa-sub, .pa-svc-d, .pa-svc-n, .pa-v")]
        .find((e) => rx.test(e.textContent || ""));
      if (!el) return false;
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0;
    }, SAYS_NONE.source);
    // Viewport frame, not fullPage: fullPage paints a position: fixed element in the wrong place (ROADMAP 9.11d).
    await page.screenshot({ path: join(ART, `${tag}-empty.png`) });

    ok(!ALL_CLEAR.test(emptyText), "empty/not-all-clear",
      `${tag}: no job reported at all and the screen printed the all-clear. `
      + "An all-clear earned by nobody having spoken is the whole of 6.2a.");
    ok(saidNone, "empty/says-so",
      `${tag}: with an empty list the screen must state plainly, and visibly, that nothing has been `
      + "heard from. It did not.");

    observed.push(`${tag}: never="${never.value}" · healthy="${just.value}" · stopped="${stop.value}" `
      + `· empty lede said-nothing-heard=${saidNone}`);
  }

  } finally {
    // NEVER THROWS, AND RUNS ON EVERY PATH. `unrouteAll` first: a request in
    // flight when the browser closes rejects from the route callback, which
    // is one of the two crashes that left a row behind.
    try { await page?.unrouteAll({ behavior: "ignoreErrors" }); } catch { /* closing anyway */ }
    try { await browser.close(); } catch { /* closing anyway */ }
    await dropAdmin(U, K, acct.id);
  }

  // A dev-server console error or warning is a defect — CLAUDE.md § Design.
  /* **A GUARD THAT SKIPS MUST PRINT THAT IT SKIPPED.** React Router's two
     future-flag warnings fire on every screen in this app, in dev only, from
     the router's own setup — nothing to do with this item, and silencing them
     in `main.jsx` would be a rewrite of something that works. They are
     forgiven BY NAME and printed on every run, pass or fail, so nobody
     mistakes the allowance for silence. Anything else is a defect. */
  const FORGIVEN = /React Router Future Flag Warning/;
  const uniq = [...new Set(consoleBad)];
  const forgiven = uniq.filter((c) => FORGIVEN.test(c));
  for (const c of uniq.filter((c) => !FORGIVEN.test(c))) failures.push(`console — ${c}`);
  if (forgiven.length) {
    observed.push(`console: ${forgiven.length} React Router future-flag warning(s) FORGIVEN BY NAME `
      + "— dev-only, router setup, present before this item and not silenced by it");
  }

  const targets = 1 + SIZES.length * 2;
  const { path, receipt } = writeReceipt({
    check_id: "health-line-honest",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status: failures.length || missed.length ? "fail" : "pass",
    expected_targets: targets,
    discovered_targets: targets,
    attempted_targets: targets,
    completed_targets: targets,
    skipped_targets: 0,
    assertions_executed: assertions + 2,
    min_assertions: 1 + SIZES.length * 8 + 2,
    assertion_floor:
      "1 wire question + 5 widths x 8 questions (differ, quiet-says-so, ok-says-when, stopped-apart, "
      + "quiet-painted, words-carry, not-all-clear, says-so) + 2 canaries = 43. Structural: fixed by "
      + "the question list, never by what the run finds — a width whose screen never renders books "
      + "its 8 as failures rather than dropping out, so the count cannot fall.",
    failures: [...failures, ...missed],
    warnings: [
      "The fixtures are injected by rewriting the `platform-admin` response IN THE BROWSER. Nothing is "
      + "written to `job_heartbeats`, no cron is disturbed and there is nothing to restore if this dies "
      + "halfway. It measures the DISPLAY, which is all of 6.2a.",
      "Because of that, target 1 is the real un-rewritten response and asks whether `detail` still "
      + "arrives. On the day the server stops sending it, every quiet row goes green in silence and "
      + "the other 42 assertions would keep passing on this script's own fiction.",
      "Rows are located by the job slug this script invented, never by the `data-job-state` attribute "
      + "the markup carries — that attribute is the screen's own claim about the thing under test.",
      "It proves the two states are TOLD APART. It does not prove the wording is the best wording; "
      + "that is Andrew's call and the screenshots are there for it.",
    ],
    artifacts: [
      "artifacts/health-line-honest/wire-real-screen.png",
      "artifacts/health-line-honest/canary-words-made-same.png",
      ...SIZES.flatMap((s) => [
        `artifacts/health-line-honest/${s.w}x${s.h}-three-states.png`,
        `artifacts/health-line-honest/${s.w}x${s.h}-no-dots.png`,
        `artifacts/health-line-honest/${s.w}x${s.h}-empty.png`,
      ]),
    ],
    dimensions: {
      sizes: SIZES.map((s) => `${s.w}x${s.h}`),
      observed, canaries, sabotage: BREAK,
      console_errors_and_warnings: uniq.slice(0, 10),
      console_forgiven_by_name: forgiven,
    },
    canary: {
      id: "the-colour-only-difference",
      observed_failure: missed.length === 0,
      problems: missed,
    },
  });

  for (const line of observed) console.log("  " + line);
  for (const c of canaries) console.log("  canary " + c);
  console.log("");
  const bad = failures.length + missed.length;
  if (bad) {
    console.log(`FAIL  health-line-honest — ${bad} finding(s)`);
    for (const f of [...failures, ...missed]) console.log("  · " + f);
  } else {
    console.log(`PASS  health-line-honest — ${receipt.completed_targets} targets, `
      + `${receipt.assertions_executed} assertions, both canaries caught`);
  }
  console.log("receipt: " + path.replace(REPO + "\\", "").replace(REPO + "/", ""));
  process.exit(bad ? 1 : 0);
}

run().catch((e) => {
  console.error("health-line-honest could not run: " + e.message);
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
});
