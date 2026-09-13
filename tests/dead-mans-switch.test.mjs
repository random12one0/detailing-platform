// ROADMAP 8.12 — THE DEAD MAN'S SWITCH.
//
// `job_heartbeats` has recorded when each scheduled job last finished since
// roadmap 7.3 item D, and the back office draws a line about it. **Nothing has
// ever TOLD anybody**, which makes it a monitor you have to remember to visit
// about a class of failure whose entire character is that nobody knows to
// look. `watch-jobs` is the half that tells.
//
// ---------------------------------------------------------------------------
// WHAT THIS FILE HOLDS THAT NO OTHER CHECK CAN SEE.
// ---------------------------------------------------------------------------
// **THE ALARM MUST RING ONCE.** A monitor that emails every fifteen minutes
// for the whole of an outage is a monitor whose emails go to a folder, and
// then the next real one goes there too. § 2 drives one job down and back up
// and asserts the SECOND call about the same stoppage says nothing at all —
// which is the one behaviour a source read cannot establish, because it lives
// in a single SQL statement's read-and-mark.
//
// **AND IT MUST NOT BE LOST.** The opposite failure is worse and quieter: the
// claim is written, the email fails, and the alarm never rings again for the
// rest of the outage. `release_job_alerts` is the undo and § 1 pins that the
// function calls it on a failed send.
//
// **THE WINDOW HAS ONE COPY.** `AdminPage.jsx` carried `45 minutes` and
// `36 hours` and the watcher needs the same two numbers; two copies of a
// threshold is how a screen says a job is fine while the alarm is going off.
// § 1 fails if the screen grows its own again.
//
// **AND THE THING IT CANNOT SEE ABOUT ITSELF.** The watcher runs on the same
// `pg_cron` it watches, so pg_cron stopping takes the alarm down with the jobs
// and the silence is identical to health. Only the outside ping can see that,
// it is not configured, and § 3 asserts the back office SAYS so — a monitor
// that is switched off must never look like a monitor with nothing to report.
//
//   node tests/dead-mans-switch.test.mjs      (§ 1 and § 3 are credential-free)

import "./_env.mjs";           // root .env -> process.env, before anything reads it
import { readFileSync } from "node:fs";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
// STRIP COMMENTS AND STRING LITERALS BEFORE READING SOURCE AS TEXT. This repo
// has shipped at least six checks that passed on a comment describing the very
// thing they were looking for, and two that matched a SQL `comment on column`.
const strip = (t) => t
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/^\s*--.*$/gm, "");

const MIG = read("supabase/migrations/20260907004000_dead_mans_switch.sql");
const MIGC = strip(MIG).replace(/'[^']*'/g, "''");
// The correction, 2026-09-13: `restore_job_alerts` replaces `release_job_alerts`
// and undoes a claim in both directions. A separate file because migrations are
// append-only.
const UNDOC = strip(read("supabase/migrations/20260913010000_watchdog_never_loses_a_claim.sql"))
  .replace(/'[^']*'/g, "''");
const FN = read("supabase/functions/watch-jobs/index.ts");
const FNC = strip(FN);
const ADMIN = read("app/src/admin/AdminPage.jsx");
const ADMINC = strip(ADMIN);
const PA = strip(read("supabase/functions/platform-admin/index.ts"));
const SEND = strip(read("supabase/functions/send-email/index.ts"));
const DEPLOY = strip(read("scripts/deploy-functions.mjs"));

// ─── 1. The source, which is where three of the four properties live ──────
console.log("1. what the code has to keep being true of");
{
  // ONE STATEMENT DECIDES AND MARKS. Two statements let two overlapping runs
  // both send, and the cron that calls this is guaranteed to fire again while
  // the last call is in flight.
  const claim = MIGC.slice(MIGC.indexOf("create or replace function public.claim_job_alerts"));
  check("1a · claim_job_alerts exists", claim.length > 0 && claim.includes("returns table"));
  check("1a-ii · and it MARKS inside the same statement it selects from",
    /with[\s\S]*?update public\.job_heartbeats[\s\S]*?select /i.test(claim.slice(0, claim.indexOf("$fn$;") + 5)));
  check("1b · the condition reads both directions at once",
    /is_stale\s*<>\s*\(\s*\w+\.alerted_at is not null\s*\)/.test(claim));
  // "A job down for a week must not be reported again" is the same condition
  // read the other way, and it is asserted where it actually matters — § 2d
  // calls the deployed function twice about one stoppage. A second regex here
  // would test the same characters twice and prove nothing more.

  check("1c · both functions are service_role only",
    /revoke all on function public\.claim_job_alerts\(\) from public, anon, authenticated/.test(MIGC)
    && /revoke all on function public\.restore_job_alerts\(text\[\], text\[\]\)\s*\n?\s*from public, anon, authenticated/.test(UNDOC)
    && /grant execute on function public\.claim_job_alerts\(\) to service_role/.test(MIGC)
    && /grant execute on function public\.restore_job_alerts\(text\[\], text\[\]\) to service_role/.test(UNDOC));

  // THE UNDO. Without it a claim whose email failed is an alarm that never
  // rings again for the whole outage — the quieter and worse half.
  check("1d · a failed send re-arms what it claimed",
    /if \(!sent\) \{/.test(FNC) && /restore_job_alerts/.test(FNC));
  // **INVERTED 2026-09-13, AND THE OLD CHECK WAS ENFORCING THE BUG.** It read
  // "and it re-arms the STOPPAGES, not the recoveries" and passed for six
  // days while a real all-clear was being dropped. Andrew's ruling: a stoppage
  // with no all-clear after it is the failure that teaches him to stop opening
  // the emails, so it is not the smaller half of anything.
  check("1d-ii · in BOTH directions, because a lost all-clear is not the cheap half",
    /p_stale: stopped\.map/.test(FNC) && /p_recovered: back\.map/.test(FNC));
  check("1d-iii · and the half-undo is gone rather than sitting beside it",
    !/release_job_alerts/.test(FNC) && /drop function if exists public\.release_job_alerts/.test(UNDOC));

  // ── THE ORDERING THAT COST A REAL NOTICE, 2026-09-13 ────────────────────
  // `watch-jobs` claims the change set and then reads the address to send it
  // to. On 13 September the claim returned 200 and the settings read 504'd
  // 95 milliseconds later, so the claim was consumed, `ps` was undefined, and
  // the only "it is running again" that outage would ever produce went into a
  // console line. ~1.1% of this project's REST calls return 504 (FOUND.md), so
  // at two calls a tick that is about thirty lost claims a month.
  //
  // THIS IS A SOURCE-ORDER CHECK BECAUSE THERE IS NO OTHER INSTRUMENT: making
  // the live gateway time out on demand is not something a test can arrange.
  // § 2h below drives the *consequence* — an unsendable claim — for real.
  const claimAt = FNC.indexOf('supabase.rpc("claim_job_alerts")');
  const settingsAt = FNC.indexOf('.from("platform_settings")');
  check("1j · the address is read BEFORE the claim is consumed",
    settingsAt > 0 && claimAt > 0 && settingsAt < claimAt,
    `settings at ${settingsAt}, claim at ${claimAt}`);
  check("1j-ii · and a failed read claims nothing at all",
    /if \(psErr\) \{/.test(FNC)
    && /settings_unreadable/.test(FNC)
    && FNC.indexOf("settings_unreadable") < claimAt);
  // "No row" and "the read failed" both arrive as `data: null` from
  // `.maybeSingle()`, so without the error the function said "there is no
  // owner_email to tell" about a question it never got to ask.
  check("1j-iii · the error is read, not only the data",
    /error: psErr/.test(FNC));

  // THE WINDOW HAS ONE COPY, AND THE SCREEN IS THE ONE THAT USED TO HOLD IT.
  // `45 * 60_000` and `36 * 3_600_000` were in `AdminPage.jsx`; a threshold in
  // two places is how a screen says a job is fine while the alarm rings.
  check("1e · the back office no longer carries its own staleness windows",
    !/45 \* 60_?000/.test(ADMINC) && !/36 \* 3_?600_?000/.test(ADMINC));
  check("1e-ii · it reads the row's own window instead",
    /stale_after_seconds/.test(ADMINC));
  check("1e-iii · and the server sends it",
    /stale_after_seconds/.test(PA) && /job_heartbeats/.test(PA));

  // THE WATCHER DOES NOT WATCH ITSELF. A heartbeat of its own would be a
  // green light it wrote for itself; its liveness is the outside ping.
  check("1f · watch-jobs stamps no heartbeat of its own",
    !/note_heartbeat/.test(FNC));
  check("1f-ii · and there is no cron entry making it stamp one",
    !/note_heartbeat\('watch-jobs'\)/.test(MIGC));

  // THE PING IS BEST-EFFORT. A monitor that could fail the run it monitors
  // would be causing the outage it watches for.
  const ping = FNC.slice(FNC.indexOf("async function pingOutside"), FNC.indexOf("Deno.serve"));
  check("1g · the outside ping catches its own errors", /try \{[\s\S]*catch/.test(ping));
  check("1g-ii · and it cannot hang the function", /AbortSignal\.timeout/.test(ping));
  check("1g-iii · a missing URL is a skip, not a call",
    /if \(!url\) return false/.test(ping));

  // THE CRON. A function nothing calls is a monitor that never runs.
  check("1h · the watcher is scheduled", /cron\.schedule\(/.test(MIGC)
    && /functions\/v1\/watch-jobs/.test(MIG));
  check("1h-ii · offset from the quarter hour, so it never reads mid-write",
    /'7,22,37,52 \* \* \* \*'/.test(MIG));
  // INSIDE the set literal, not merely somewhere in the file: a name in a
  // comment further down would deploy the watcher with `verify_jwt` on, the
  // gateway would refuse pg_cron's unauthenticated post, and the whole switch
  // would do nothing at all with no error anywhere.
  const publicSet = DEPLOY.slice(DEPLOY.indexOf("PUBLIC_FUNCTIONS = new Set(["),
    DEPLOY.indexOf("]);", DEPLOY.indexOf("PUBLIC_FUNCTIONS = new Set([")));
  check("1h-iii · and it is deployed public, because pg_cron carries no key",
    publicSet.length > 50 && publicSet.includes('"watch-jobs"'));

  // THE RELAY DID NOT GET LOOSER FOR EVERYBODY. `business_id` is optional ONLY
  // for platform mail; a tenant email that lost its business id would send
  // with no name and no Reply-To and look approximately right.
  check("1i · send-email still demands a business for tenant mail",
    /if \(!business_id && !fromPlatform\)/.test(SEND));
  check("1i-ii · and the watcher sends as the platform",
    /senderName: PLATFORM_NAME/.test(FNC) && !/businessId:/.test(FNC));
}

// ─── 3. The state it ships in, said out loud ──────────────────────────────
// A feature that is switched off looks exactly like a feature with nothing to
// report. This repo's most repeated finding, and one `console.log` is the cure.
console.log("3. a monitor that is off must say so");
{
  check("3a · the server tells the screen whether anything watches from outside",
    /watch: \{ outside: Boolean\(ps\?\.healthcheck_url\) \}/.test(PA));
  // ANYBODY HOLDING THE PING URL CAN KEEP OUR MONITORING GREEN FROM THE
  // OUTSIDE, so it is write-only in effect and the screen is handed a
  // boolean. The address appears in that function exactly once, in the
  // `select` that reads it.
  check("3a-ii · and it sends the boolean, never the URL",
    (PA.match(/healthcheck_url/g) || []).length === 2
    && /select\("[^"]*healthcheck_url[^"]*"\)/.test(PA));
  // **RESPELLED 2026-09-13, NOT RELAXED.** The back office was rebuilt around a
  // "Plumbing" tab and these three read the OLD screen's identifiers, so they
  // went red on a screen that still does the job. Trap (k): a check that names
  // a spelling asserts how something is written. They now assert the state
  // machine — an idle dot and the word "none" when nothing watches from
  // outside — which is what the line has to say however it is worded.
  const pipes = ADMIN.slice(ADMIN.indexOf("function TabPipes"));
  check("3b · the back office prints it when it is not set up",
    /state\?\.watch\?\.outside \? "set up" : "none"/.test(pipes)
    && /Something watching from outside/.test(pipes));
  // NOT RED. A permanently red line is one somebody stops reading in a week,
  // and this one is true every day until he spends ten minutes on it. `pa-idle`
  // rather than `pa-bad` is exactly that distinction, in the class name.
  check("3b-ii · as an idle line rather than a permanent alarm",
    /state\?\.watch\?\.outside \? "pa-ok" : "pa-idle"/.test(pipes)
    && !/watch\?\.outside \? "pa-ok" : "pa-bad"/.test(pipes));
  // A JOB WITH NO ROW IS THE ONE CASE NEITHER HALF CAN SEE. `watch-jobs`
  // compares rows, so no row means no comparison; its own `ponytail:` comment
  // says the back office's NAMED LIST is what covers that — and the rebuilt
  // screen dropped the named list and maps `state.heartbeats` instead.
  //
  // **SO THE COMPENSATING CONTROL IS GONE AND NOTHING REPLACED IT.** This is
  // recorded rather than asserted red, because the screen is lane B's: a
  // check that fails every run about somebody else's file is a check people
  // learn to skip, which is the same disease as the alarm this suite guards.
  check("3c · the screen draws every heartbeat row the server sends",
    /\(state\?\.heartbeats \?\? \[\]\)\.map/.test(pipes));
  console.log("  NOT GUARDED  a job whose heartbeat ROW is missing is invisible —"
    + " the named list that used to draw it as stale went with the old screen."
    + " FOUND.md § THE WATCHDOG'S BLIND SPOT; lane B owns the fix.");
}

// ─── 2. The behaviour, against the deployed function ──────────────────────
// Everything above is a property of the text. The three that matter are
// properties of a RUN: it fires once, it does not fire twice, and it comes
// back. They are asked of the real function on a throwaway job row.
console.log("2. the alarm, driven up and down for real");
if (!URL_ || !SERVICE) {
  console.log("  SKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
} else {
  const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
  const rest = (p, init = {}) =>
    fetch(`${URL_}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const JOB = `test-dms-${Math.random().toString(36).slice(2, 8)}`;
  const run = () => fetch(`${URL_}/functions/v1/watch-jobs`, { method: "POST", headers: H, body: "{}" })
    .then((r) => r.json());
  const rowFor = async (job) =>
    (await rest(`job_heartbeats?job=eq.${job}&select=*`).then((r) => r.json()))[0];
  const mine = (res) => (res.changes ?? []).find((c) => c.job === JOB);

  // THE OWNER'S REAL ADDRESS IS ON THIS ROW AND A TEST MUST NOT EMAIL HIM A
  // FALSE ALARM. Swapped for Resend's own simulator — the address roadmap 0.3
  // chose for exactly this — so the send is genuinely exercised against the
  // provider and reaches nobody. Restored in the `finally` below whatever
  // happens, because leaving it would silence every real alert afterwards.
  const settingsBefore = (await rest("platform_settings?select=owner_email,healthcheck_url,email_daily_cap")
    .then((r) => r.json()))[0];

  // **UNLESS THE DAY'S EMAILS ARE GONE, IN WHICH CASE THE SIMULATOR CANNOT BE
  // REACHED EITHER AND EVERY CHECK BELOW WOULD GO RED ABOUT THE FEATURE
  // WORKING.** Resend's free plan is 100 a day across every tenant (roadmap
  // 8.6), a night of building spends them, and the switch then does exactly
  // the right thing: the send fails, `release_job_alerts` re-arms the
  // stoppage, and nothing is marked — which is the behaviour § 1d exists to
  // protect, reported as four failures.
  //
  // So on a spent day it sends to a domain `send-email` refuses as
  // undeliverable, which answers 200 without touching the provider. The path
  // is exercised end to end; what is NOT measured is the provider leg, and
  // that PRINTS rather than passing quietly.
  const today = new Date().toISOString().slice(0, 10);
  const spentRow = (await rest(`platform_email_days?day=eq.${today}&select=sent`)
    .then((r) => r.json()))[0];
  const spent = (spentRow?.sent ?? 0) >= (settingsBefore?.email_daily_cap ?? 100);
  const ALERT_TO = spent ? "watcher@example.com" : "delivered@resend.dev";
  if (spent) {
    console.log(`  NOT MEASURED  the provider leg — ${spentRow?.sent} emails sent today against a`
      + ` cap of ${settingsBefore?.email_daily_cap}. The relay is exercised, Resend is not.`);
  }
  const setSettings = (patch) =>
    rest("platform_settings?id=eq.true", { method: "PATCH", body: JSON.stringify(patch) });

  try {
    await setSettings({ owner_email: ALERT_TO });

    // THE REAL JOBS' STATE IS RECORDED FIRST AND ASSERTED UNCHANGED AT THE
    // END. This test calls the live watcher, so a genuinely stale production
    // job would be claimed by our run — which is correct behaviour and must
    // still be reported rather than silently absorbed into our own result.
    // `neq`, NOT a `like` with a `%` in it. PostgREST spells the wildcard `*`
    // and translates it; a literal `%` in a query string comes back as a
    // Cloudflare 500 **HTML page**, which arrives at `.json()` as
    // `Unexpected token '<'` and reads as the whole API being down.
    const realBefore = await rest(`job_heartbeats?select=job,alerted_at&job=neq.${JOB}`)
      .then((r) => r.json());

    // A HEALTHY JOB FIRST — the state that must produce nothing at all.
    await rest("job_heartbeats", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ job: JOB, ran_at: new Date().toISOString(), stale_after_seconds: 3600 }),
    });
    const created = await rowFor(JOB);
    // THE SETUP ASSERTS ITS OWN SUCCESS. A row that was never created makes
    // every check below trivially true about nothing.
    check("2a · the throwaway job row exists", !!created, "insert produced no row");
    check("2a-ii · and starts un-alerted", created?.alerted_at === null);

    const healthy = await run();
    check("2b · a healthy job produces no change", healthy.success === true && !mine(healthy),
      JSON.stringify(healthy).slice(0, 200));

    // NOW STOP IT. `ran_at` an hour ago against a sixty-second window is
    // unambiguously stale, and the window is the row's own — which is the
    // property 1e moved out of the screen.
    await rest(`job_heartbeats?job=eq.${JOB}`, {
      method: "PATCH",
      body: JSON.stringify({
        ran_at: new Date(Date.now() - 3_600_000).toISOString(),
        stale_after_seconds: 60,
      }),
    });
    const first = await run();
    check("2c · a stopped job is reported", mine(first)?.went === "stale",
      JSON.stringify(first).slice(0, 200));
    check("2c-ii · and the owner is actually emailed", first.emailed === true,
      "emailed was " + first.emailed);
    const claimed = await rowFor(JOB);
    check("2c-iii · the row records that he was told", !!claimed?.alerted_at);

    // THE ONE PROPERTY A SOURCE READ CANNOT ESTABLISH. The outage has not
    // ended; the same call a quarter of an hour later must say nothing.
    const second = await run();
    check("2d · the SAME stoppage is not reported twice", !mine(second),
      JSON.stringify(second).slice(0, 200));
    const still = await rowFor(JOB);
    check("2d-ii · and the original alert time is not rewritten",
      still?.alerted_at === claimed?.alerted_at);

    // AND IT COMES BACK. A switch that latches on is a switch nobody trusts
    // the second time.
    await rest(`job_heartbeats?job=eq.${JOB}`, {
      method: "PATCH",
      body: JSON.stringify({ ran_at: new Date().toISOString() }),
    });
    const back = await run();
    check("2e · a job that starts again is reported once", mine(back)?.went === "recovered",
      JSON.stringify(back).slice(0, 200));
    const cleared = await rowFor(JOB);
    check("2e-ii · and the row is disarmed for the next outage", cleared?.alerted_at === null);
    const quiet = await run();
    check("2e-iii · after which it is quiet again", !mine(quiet));

    // ── 2i · A CLAIM THE EMAIL COULD NOT CARRY MUST COME BACK ──────────────
    // The bug Andrew found on 2026-09-13 was a claim consumed with nothing
    // sent: "the reminder sweep has stopped running" with no "is running
    // again" ever after it. The cause was a 504 on the settings read, which a
    // test cannot arrange — so this drives the same CONSEQUENCE through the
    // one lever it can pull, an address the relay refuses. `sendTenantEmail`
    // answers false either way, and the question is what the row looks like
    // afterwards.
    //
    // **BOTH DIRECTIONS, AND THE SECOND IS THE ONE THAT WAS BROKEN.** The old
    // undo re-armed stoppages only, so an all-clear that failed to send was
    // gone for good. Not a reserved domain: `send-email` answers 200
    // `skipped: undeliverable_domain` for those, which is a SUCCESS and would
    // measure nothing.
    await setSettings({ owner_email: "watchdog-refused-on-purpose" });

    await rest(`job_heartbeats?job=eq.${JOB}`, {
      method: "PATCH",
      body: JSON.stringify({
        ran_at: new Date(Date.now() - 3_600_000).toISOString(),
        alerted_at: null,
      }),
    });
    const lostStop = await run();
    check("2i · an unsendable STOPPAGE is claimed but not reported sent",
      mine(lostStop)?.went === "stale" && lostStop.emailed === false,
      JSON.stringify(lostStop).slice(0, 200));
    check("2i-ii · and the row is re-armed so the next run tries again",
      (await rowFor(JOB))?.alerted_at === null);

    await rest(`job_heartbeats?job=eq.${JOB}`, {
      method: "PATCH",
      body: JSON.stringify({
        ran_at: new Date().toISOString(),
        alerted_at: new Date(Date.now() - 3_600_000).toISOString(),
      }),
    });
    const lostBack = await run();
    check("2i-iii · an unsendable RECOVERY is claimed but not reported sent",
      mine(lostBack)?.went === "recovered" && lostBack.emailed === false,
      JSON.stringify(lostBack).slice(0, 200));
    // THE WHOLE POINT. Before 2026-09-13 this read null and the all-clear was
    // lost silently — the exact thing he saw in Resend.
    check("2i-iv · and IT TOO is re-armed, which is what was lost",
      (await rowFor(JOB))?.alerted_at !== null);

    await setSettings({ owner_email: ALERT_TO });
    await rest(`job_heartbeats?job=eq.${JOB}`, {
      method: "PATCH",
      body: JSON.stringify({ ran_at: new Date().toISOString(), alerted_at: null }),
    });

    // THE OUTSIDE PING. Two of its three properties are ours and provable
    // here; the third needs his healthchecks.io URL and PRINTS rather than
    // passing, because a check that cannot reach its subject must never
    // report a tick.
    // **2f SETS THE URL TO NULL ITSELF NOW, AND THAT IS A REAL FIX RATHER THAN
    // A TIDY-UP.** It used to lean on `quiet`, a run made with whatever URL
    // happened to be in the row — which was null for the whole life of this
    // feature, so the check passed by describing the state of the world rather
    // than by arranging it. The moment the owner set a real URL (2026-09-07)
    // it went red, and the failure was the test being wrong.
    //
    // A check that only holds while a column is empty is a check that expires
    // the day the feature starts being used.
    await setSettings({ healthcheck_url: null });
    const unset = await run();
    check("2f · with no URL set, nothing is pinged and the run still succeeds",
      unset.success === true && unset.pinged === false,
      JSON.stringify(unset).slice(0, 200));

    await setSettings({ healthcheck_url: "https://127.0.0.1:1/nothing-listens-here" });
    const broken = await run();
    check("2f-ii · a ping that cannot connect does not fail the run",
      broken.success === true && broken.pinged === false,
      JSON.stringify(broken).slice(0, 200));

    // **THE THIRD PROPERTY, MEASURABLE FOR THE FIRST TIME.** It needs a real
    // outside watcher, so it printed `NOT MEASURED` from the day it was written
    // until the owner produced a Healthchecks URL — the rule this repo keeps:
    // a check that cannot reach its subject must never report a tick.
    //
    // It really does ping his monitor, which is the point: a healthy ping is
    // exactly what the scheduler sends every fifteen minutes, so this proves
    // the wiring end to end rather than proving the code compiles.
    if (settingsBefore?.healthcheck_url) {
      await setSettings({ healthcheck_url: settingsBefore.healthcheck_url });
      const live = await run();
      check("2f-iii · and a ping that SUCCEEDS is reported as pinged",
        live.success === true && live.pinged === true,
        JSON.stringify(live).slice(0, 200));
    } else {
      console.log("  NOT MEASURED  2f-iii · a ping that SUCCEEDS — needs a real"
        + " healthchecks.io URL in platform_settings.healthcheck_url"
        + " (node scripts/set-healthcheck.mjs <url>)");
    }

    // THE PRODUCTION JOBS. If one of them really is stale, our run claimed it
    // and emailed the simulator — correct, and it has to be SAID, because a
    // real stoppage discovered by a test is still a real stoppage.
    const realAfter = await rest(`job_heartbeats?select=job,alerted_at&job=neq.${JOB}`)
      .then((r) => r.json());
    const moved = realAfter.filter((r) =>
      r.alerted_at !== realBefore.find((b) => b.job === r.job)?.alerted_at);
    check("2g · no real scheduled job changed state during this run", moved.length === 0,
      moved.length ? `A REAL JOB HAS STOPPED: ${moved.map((m) => m.job).join(", ")}` : "");
  } finally {
    await rest(`job_heartbeats?job=eq.${JOB}`, { method: "DELETE" });
    await setSettings({
      owner_email: settingsBefore?.owner_email ?? null,
      healthcheck_url: settingsBefore?.healthcheck_url ?? null,
    });
    const after = (await rest("platform_settings?select=owner_email,healthcheck_url")
      .then((r) => r.json()))[0];
    // THE CLEANUP ASSERTS ITSELF. Leaving the simulator in `owner_email` would
    // silence every real alert this feature exists to send, for ever, and
    // nothing on any screen would look different.
    check("2h · the owner's real alert address is put back",
      after?.owner_email === (settingsBefore?.owner_email ?? null),
      `left as ${after?.owner_email}`);
    check("2h-ii · and the healthcheck URL with it",
      (after?.healthcheck_url ?? null) === (settingsBefore?.healthcheck_url ?? null));
    check("2h-iii · the throwaway job row is gone", !(await rowFor(JOB)));
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
