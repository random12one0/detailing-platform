// DOES THE DASHBOARD TELL THE CUSTOMER? — ROADMAP 3.4, findings 1 and 2.
//
//   set -a; . ./.env; set +a
//   node scripts/dashboard-notifies.mjs
//   node scripts/receipt.mjs receipts/dashboard-notifies.json
//
// ---------------------------------------------------------------------------
// WHAT IT IS FOR
// ---------------------------------------------------------------------------
// `update-booking` is, by its own first line, the ONE write path for dashboard
// changes. Until 2026-09-20 it imported no email template and called no
// sender, so a detailer who cancelled a job from the dashboard — or moved it
// to another day — told the customer **nothing**. Both emails existed and were
// good; they were reachable only from the endpoints the CUSTOMER drives.
//
// This asks the deployed function the question directly: press the buttons a
// detailer presses, then read `email_sends` and see what came out.
//
// ---------------------------------------------------------------------------
// THE HALF THAT MAKES IT WORTH RUNNING — WHAT MUST **NOT** SEND
// ---------------------------------------------------------------------------
// A check that only proves "cancelling sends a cancellation" would pass just as
// well against a function that emails on EVERY save. The fix's actual claim is
// narrower and is the part that will silently regress:
//
//   * an edit that touches neither the status nor the time sends NOTHING
//   * `status: "cancelled"` sent twice sends ONE email, not two
//   * a move to the same instant is not a move
//   * a cancel and a move in one call sends the cancellation ONLY
//
// Those four are the reason the fix reads the ROW's before and after instead of
// the payload, and all four are asserted below. Three of them are assertions
// that something did NOT happen, which is the shape this repo has been caught
// by before — so each one carries a POSITIVE CONTROL in the same run: the same
// booking, the same actor, the same endpoint, one field different, and an
// email that must appear. A silent mailer passes every negative assertion here
// and fails every positive one.
//
// ---------------------------------------------------------------------------
// THE CANARY, AND THE FIRST VERSION OF IT WAS HOLLOW
// ---------------------------------------------------------------------------
// The first attempt had a `--break=payload` flag that asserted the second
// cancel sent nothing and called that "the canary fired". **That is the same
// assertion the ordinary run already makes, relabelled.** It is not a negative
// control at all: it hands the check no defect, so it cannot demonstrate the
// check would notice one. Caught while writing the summary, not by the run.
//
// THE HOLE IT LEFT IS THE ONE THAT MATTERS. Three of the four claims above are
// "no email arrived", and an email-counting check that is looking at the wrong
// table, filtering on the wrong business, or simply not waiting long enough
// reports "no email arrived" every single time. **Then every green line is
// void and the silence is the instrument's, not the product's.**
//
// So the canary MAKES A SECOND CANCELLATION REALLY HAPPEN: the booking is put
// back to `confirmed` behind the endpoint's back and cancelled again, which is
// a genuine second cancel of the same booking by the same actor. **The
// `double-send` detector must see it.** If it does not, this check cannot tell
// one email from two, and the line above it — "the same cancel sent a second
// time → nothing" — was never evidence of anything.
//
// And the chain that gives closes the original question: a payload-driven
// implementation would send on the second identical cancel; this check is
// proved able to see a second cancellation when one truly occurs; so a
// payload-driven implementation would have been caught here.
//
// ---------------------------------------------------------------------------
// THE FOUR SABOTAGE SWITCHES, AND WHAT EACH ONE PROVES
// ---------------------------------------------------------------------------
//   --break=canary  the booking is not put back to `confirmed`, so the final
//                   cancel is not a transition, nothing sends, and the canary
//                   is correctly MISSED. Counts stay 7 7 7 7 — which is the
//                   point: the counts and the canary are independent guards.
//   --break=step    a declared step is dropped from the judged list while the
//                   run still performs it. 7 6 7 6, and it names the step as
//                   undeclared.
//   --break=skip    the mirror: the step stays declared and does not run.
//                   7 7 6 6, and it names the step as never reaching a
//                   verdict. This is the `missedSteps` branch.
//   --break=none    the run does not happen at all. 7 7 0 0, and the receipt
//                   exists — which before 2026-09-21 it did not. Makes no
//                   network call and writes nothing anywhere.
//
// Not built: a switch that empties `EXPECTED_STEPS`. That guard can only trip
// if somebody deletes a constant by hand, and firing it would cost a full
// fixture cycle of real writes to demonstrate a consequence `--break=none`
// already demonstrates. Named here rather than left to be noticed missing.
//
// ---------------------------------------------------------------------------
// NOTHING REACHES A PERSON
// ---------------------------------------------------------------------------
// Every recipient is `delivered@resend.dev`, the address Resend publishes that
// always accepts and delivers nowhere (FOR-ANDREW.md). The fixture business and
// its booking are created and destroyed inside the run.

import { createHash } from "node:crypto";
import { writeReceipt } from "./receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const KEEP = process.argv.includes("--keep");

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
let ANON = process.env.SUPABASE_ANON_KEY;

if (!URL_ || !SERVICE || !TOKEN || !REF) {
  console.error("SKIPPED — needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,");
  console.error("          SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.");
  console.error("          Nothing was measured. Run: set -a; . ./.env; set +a");
  process.exit(1);
}

// This script CREATES A BUSINESS AND SENDS MAIL. CLAUDE.md § Hard rules names
// the real business database and says to stop on any project that is not the
// platform's own, so the allowed ref is named in the file that does the thing.
const ALLOWED = "kguqylyzgyzfktkfnhjb";
if (REF !== ALLOWED) {
  console.error(`REFUSING — this script writes and sends mail, and ${REF} is not ${ALLOWED}.`);
  process.exit(2);
}

// THE ONLY ADDRESS THIS FILE MAY EVER USE. Resend always accepts it and
// delivers it nowhere; anything resembling a person's inbox is a defect.
const SINK = "delivered@resend.dev";

const sql = async (text) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: text }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : [];
};

if (!ANON) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${TOKEN}` } });
  const keys = await res.json();
  ANON = keys.find((k) => k.name === "anon")?.api_key ?? keys.find((k) => k.type === "publishable")?.api_key;
  if (!ANON) { console.error("No anon key for project"); process.exit(1); }
}

const rest = async (method, path, { key = SERVICE, jwt, body, prefer } = {}) => {
  const r = await fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${jwt ?? key}`,
      "Content-Type": "application/json",
      Prefer: prefer ?? "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: r.status, data, text };
};

const failures = [];
// **THE EXPECTATION IS DECLARED HERE, NOT PRODUCED BY THE RUN - 2026-09-21,
// docs/silences.md section B, the last of the five.** All four target counts
// were `rows.length`, so this check declared it expected exactly as many steps
// as it happened to finish. A run that threw after three steps reported three
// targets, three completed, and four counts in perfect agreement.
//
// These seven are the claim this file makes. Six of them are the fix's actual
// narrow claim - three of those are assertions that something did NOT happen,
// each with a positive control beside it - and the seventh is the canary. **A
// step that stops running has to be a failure, not a smaller run**, which is
// only possible if the list is written down before the run rather than
// collected during it.
const EXPECTED_STEPS = [
  "a detailer moves the job to another day",
  "an edit that touches neither status nor time",
  "a move to the time it is already at",
  "a detailer cancels the job",
  "the same cancel sent a second time",
  "canary · a real second cancellation",
  "put back and moved again — the mailer is still alive",
];
// `--break=step` drops one declared step, which is what a step that silently
// stopped running looks like from the receipt.
const DECLARED_STEPS = new Set(
  BREAK === "step" ? EXPECTED_STEPS.slice(0, -1) : EXPECTED_STEPS);

const rows = [];
const warnings = [];
let assertions = 0;
const say = (m) => failures.push(m);

const SLUG = "dash-notify-fixture";
let biz = null, owner = null, bookingId = null;
const canaryDetectors = [];

// -- the endpoint under test -------------------------------------------------
const callUpdate = (jwt, payload) =>
  fetch(`${URL_}/functions/v1/update-booking`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(async (r) => ({ status: r.status, text: (await r.text()).slice(0, 300) }));

/** Every send recorded for this fixture business, newest last. */
const sendsFor = async (businessId) =>
  (await sql(`select subject, to_email, status
                from public.email_sends
               where business_id = '${businessId}'
               order by sent_at`));

/**
 * WHAT ARRIVED SINCE THE LAST LOOK — and both halves are asserted every time.
 * `expect` names the subjects that MUST appear; anything else that appears is
 * a finding in its own right, because "it sent the right email" and "it sent
 * only the right email" are different claims and the second is the one a
 * double-send breaks.
 */
async function delta(businessId, before) {
  // The send is relayed through another function, so it lands a moment late.
  for (let i = 0; i < 10; i++) {
    const now = await sendsFor(businessId);
    if (now.length !== before.length) return now.slice(before.length);
    await new Promise((r) => setTimeout(r, 1500));
  }
  return [];
}

try {
  // **THE BREAK THAT MATTERS FOR A GATE IS THE ONE WHERE IT DOES NOT RUN.**
  // It throws here, as the first statement inside the try and before any
  // request, so this sabotage makes no network call and creates nothing. What
  // it exercises is the `catch` below: a run that produced no verdict at all
  // still files a receipt, instead of leaving the last green one to speak for
  // it. Counts come out `7 7 0 0`.
  if (BREAK === "none") throw new Error("--break=none: the fixture was never created");
  console.log("1 · fixture");
  // A business that offers nothing to the public and has one booking on it.
  await rest("DELETE", `/rest/v1/businesses?slug=eq.${SLUG}`);
  const made = await rest("POST", "/rest/v1/businesses", {
    body: [{
      is_demo: true, slug: SLUG, name: "DASHBOARD NOTIFY FIXTURE",
      timezone: "America/Denver", contact_email: SINK,
    }],
  });
  if (made.status !== 201) throw new Error(`fixture business: ${made.status} ${made.text}`);
  biz = made.data[0];
  // **THE SETTINGS ARE SPELLED OUT, NOT DEFAULTED.** A bare fixture answered
  // `409 Mobile service is not available` to every move, and all three of this
  // check's positive controls reported ERROR — which is the honest outcome and
  // is also how a check quietly stops testing anything if somebody later reads
  // those 409s as "the guard refused it". The gate this endpoint runs is the
  // full booking gate: service type, hours, advance notice, horizon, per-day
  // cap. Every one of them is set here so a failure can only be the email.
  await rest("POST", "/rest/v1/business_settings", {
    body: [{
      business_id: biz.id,
      mobile_enabled: true,
      dropoff_enabled: true,
      min_advance_minutes: 0,
      max_advance_days: 365,
      max_bookings_per_day: 50,
      buffer_minutes: 0,
      slot_interval_minutes: 30,
      cancellation_window_hours: 0,
    }],
  });
  // OPEN EVERY DAY, so the run does not depend on which weekday it happens on
  // — `docs/gotchas.md` § "A screen that only exists for part of the day will
  // fail a gate over nothing" is this same trap wearing a calendar.
  await rest("POST", "/rest/v1/business_hours", {
    body: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      business_id: biz.id, weekday, open_time: "07:00", close_time: "19:00",
    })),
  });

  // An owner who can call the endpoint.
  const email = "dash-notify-owner@isolation.test";
  const password = "Dashboard-notify-test-pw!";
  await rest("POST", "/auth/v1/admin/users", { body: { email, password, email_confirm: true } });
  const signIn = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());
  if (!signIn.access_token) throw new Error(`sign-in failed: ${JSON.stringify(signIn).slice(0, 200)}`);
  owner = { id: signIn.user.id, jwt: signIn.access_token };
  await rest("POST", "/rest/v1/business_users",
    { body: [{ business_id: biz.id, user_id: owner.id, role: "owner" }] });

  // The booking a detailer is about to act on. Far enough out that no
  // cancellation window or advance-notice rule can refuse the move.
  const day = new Date(Date.now() + 40 * 86400_000).toISOString().slice(0, 10);
  const bk = await rest("POST", "/rest/v1/bookings", {
    body: [{
      business_id: biz.id, customer_name: "Dashboard Fixture",
      customer_phone: "555-0100", customer_email: SINK,
      start_at: `${day}T17:00:00Z`, end_at: `${day}T19:00:00Z`,
      service_type: "mobile", status: "confirmed",
      vehicle_size: "medium", vehicle_size_label: "Medium",
      subtotal: 200, total_price: 200,
    }],
  });
  if (bk.status !== 201) throw new Error(`fixture booking: ${bk.status} ${bk.text}`);
  bookingId = bk.data[0].id;
  console.log(`    business ${biz.id}`);
  console.log(`    booking  ${bookingId} on ${day}, every recipient is ${SINK}`);

  const step = async (name, payload, expectSubjects, detector) => {
    const before = await sendsFor(biz.id);
    const res = await callUpdate(owner.jwt, { business_id: biz.id, booking_id: bookingId, ...payload });
    if (res.status !== 200) {
      say(`${name}: update-booking answered ${res.status} — the step never ran (${res.text})`);
      rows.push({ step: name, verdict: "ERROR", detail: `${res.status} ${res.text}` });
      console.log(`    ${name.padEnd(46)} ERROR ${res.status}`);
      return [];
    }
    const got = expectSubjects.length ? await delta(biz.id, before) : await (async () => {
      // A "nothing must arrive" step has to WAIT before it can claim silence,
      // or it is only measuring that the relay is slower than the assertion.
      await new Promise((r) => setTimeout(r, 6000));
      const now = await sendsFor(biz.id);
      return now.slice(before.length);
    })();

    const subjects = got.map((g) => g.subject);
    const missing = expectSubjects.filter((want) => !subjects.some((s) => s.startsWith(want)));
    const extra = subjects.filter((s) => !expectSubjects.some((want) => s.startsWith(want)));

    assertions++;
    if (missing.length) say(`${name}: [${detector}] expected ${JSON.stringify(missing)} and nothing like it was sent (got ${JSON.stringify(subjects)})`);
    assertions++;
    if (extra.length) say(`${name}: [${detector}] sent mail nobody asked for: ${JSON.stringify(extra)}`);
    assertions++;
    for (const g of got) {
      if (g.to_email !== SINK) say(`${name}: [recipient] a send went to ${g.to_email}, which is not the sink address`);
    }

    const ok = !missing.length && !extra.length;
    rows.push({ step: name, verdict: ok ? "ok" : "WRONG", detail: JSON.stringify(subjects) });
    console.log(`    ${name.padEnd(46)} ${ok ? "ok" : "WRONG"}  ${JSON.stringify(subjects)}`);
    return got;
  };

  console.log("\n2 · what must be sent");
  // POSITIVE CONTROL FOR THE MOVE. If this is silent, every "nothing arrived"
  // assertion below is measuring a dead mailer rather than a correct guard.
  const newDay = new Date(Date.now() + 47 * 86400_000).toISOString().slice(0, 10);
  await step("a detailer moves the job to another day",
    { booking_date: newDay, start_time: "09:00" },
    ["Your booking has been rescheduled"], "reschedule");

  console.log("\n3 · what must NOT be sent");
  await step("an edit that touches neither status nor time",
    { admin_notes: "just a note" }, [], "quiet-edit");
  await step("a move to the time it is already at",
    { booking_date: newDay, start_time: "09:00" }, [], "same-instant");

  console.log("\n4 · cancelling, and cancelling again");
  await step("a detailer cancels the job",
    { status: "cancelled" }, ["Your booking has been cancelled"], "cancel");
  // A payload-driven implementation sends a second cancellation here; a
  // row-driven one knows the booking was already cancelled.
  await step("the same cancel sent a second time",
    { status: "cancelled" }, [], "double-send");

  console.log("\n5 · the canary — a second cancellation that REALLY happens");
  // See the header. Every "nothing arrived" above is worthless unless this
  // check can be shown to see a second cancellation when there is one. The
  // booking goes back to `confirmed` behind the endpoint's back, so the next
  // cancel is a genuine cancelled→confirmed→cancelled transition.
  if (BREAK !== "canary") {
    await rest("PATCH", `/rest/v1/bookings?id=eq.${bookingId}`,
      { body: { status: "confirmed" }, prefer: "return=minimal" });
  }
  const before = await sendsFor(biz.id);
  const res = await callUpdate(owner.jwt,
    { business_id: biz.id, booking_id: bookingId, status: "cancelled" });
  const got = res.status === 200 ? await delta(biz.id, before) : [];
  const caught = got.some((g) => String(g.subject).startsWith("Your booking has been cancelled"));
  assertions++;
  if (caught) canaryDetectors.push("double-send");
  rows.push({
    step: "canary · a real second cancellation",
    verdict: caught ? "caught (canary)" : "MISSED (canary)",
    detail: JSON.stringify(got.map((g) => g.subject)),
  });
  console.log(`    ${"canary · a real second cancellation".padEnd(46)} `
    + (caught
      ? "caught by [double-send]"
      : `NOT CAUGHT — this check cannot tell one email from two, so every `
        + `"nothing arrived" above is void (update-booking answered ${res.status})`));

  console.log("\n6 · the guard's own positive control");
  // The booking is cancelled now. Put it back and move it, so the run ends
  // having proved the mailer is still alive after all the silence above — the
  // half that turns "nothing arrived" from a dead relay into a real guard.
  await rest("PATCH", `/rest/v1/bookings?id=eq.${bookingId}`,
    { body: { status: "confirmed" }, prefer: "return=minimal" });
  const lastDay = new Date(Date.now() + 54 * 86400_000).toISOString().slice(0, 10);
  // `--break=skip` leaves this step DECLARED and stops it running, which is
  // the `missedSteps` side of the comparison. `--break=step` proves the other
  // side — a step that runs without being declared — so between them both
  // directions of the declared-versus-ran comparison are exercised. Until
  // this flag existed `missedSteps` was written and never demonstrated, and
  // docs/silences.md said so rather than letting it be found as a surprise.
  if (BREAK !== "skip") {
    await step("put back and moved again — the mailer is still alive",
      { booking_date: lastDay, start_time: "11:00" },
      ["Your booking has been rescheduled"], "liveness");
  }

} catch (err) {
  // **A CRASH BEFORE `writeReceipt` LEAVES THE LAST GREEN RECEIPT ON DISK, AND
  // IN THE RECEIPTS DIRECTORY THAT IS INDISTINGUISHABLE FROM A RUN THAT NEVER
  // HAPPENED.** Until 2026-09-21 this file had a `finally` and no `catch`,
  // with four `throw`s inside the try — one of them in `sql()`, which every
  // step calls twice — so a single bad answer from the Management API killed
  // the process and the previous run's `pass` stood in for the missing one.
  //
  // Same fault, same fix as `restore-drill.mjs` (`bf55bb9`, docs/silences.md
  // § B). The message is the error's own text rather than a name read off a
  // list, so the receipt records WHAT CHANGED and not merely that something
  // did. The `finally` below still runs, so the fixture is still destroyed.
  failures.push(`THE RUN DID NOT FINISH: ${err?.message ?? String(err)}. Everything `
    + "recorded here is as far as it got, not a result.");
} finally {
  if (!KEEP && biz) {
    await rest("DELETE", `/rest/v1/businesses?slug=eq.${SLUG}`);
  }
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// WHICH VERSION ANSWERED — and the field says what the run SAW, never what it
// assumed. This check presses the DEPLOYED `update-booking`, and on 2026-09-21
// `deployed-inventory.mjs` named it among 24 functions not running this
// checkout. So a green here certifies the function that is LIVE, and for a
// while nothing said so: the console, the exit code and the receipt were all
// silent about which code had answered, and every reader supplied the
// committed source from their own head.
//
// **AN ABSENT FIELD READS AS NOTHING TO REPORT, WHICH IS THE SAME LIE IN
// SMALLER PRINT.** So every path writes the field. If the bundle cannot be
// identified the field says that, and says why, and the reason is promoted to
// a warning so it is visible from the summary rather than only from the JSON.
//
// It deliberately does NOT claim whether the deployed bundle equals this
// checkout. That comparison is `deployed-inventory.mjs`'s job, it needs the
// shared-module assembly and the sanitiser, and a second implementation of it
// here would be a second thing to keep true. This records an identity.
const deployedIdentity = async () => {
  const get = (p) => fetch(`https://api.supabase.com/v1/projects/${REF}/functions/update-booking${p}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } });
  try {
    const metaRes = await get("");
    if (!metaRes.ok) return `NOT IDENTIFIED — metadata fetch answered ${metaRes.status}`;
    const meta = await metaRes.json();
    const when = new Date(Number(meta.updated_at)).toISOString().slice(0, 16).replace("T", " ");
    const bodyRes = await get("/body");
    if (!bodyRes.ok) {
      return `v${meta.version}, deployed ${when}Z — BODY NOT READ, fetch answered ${bodyRes.status}`;
    }
    const body = await bodyRes.text();
    const sha = createHash("sha256").update(body).digest("hex").slice(0, 12);
    return `v${meta.version}, deployed ${when}Z, body sha256 ${sha}, ${body.length} bytes`;
  } catch (e) {
    return `NOT IDENTIFIED — ${e?.message ?? String(e)}`;
  }
};
const deployedVersion = await deployedIdentity();
if (!/^v\d+.*sha256/.test(deployedVersion)) {
  warnings.push(`the deployed update-booking could not be fully identified: ${deployedVersion}`);
}

// Completed counts the declared steps that actually reached a verdict; a step
// that errored or never ran is not completed, whatever `rows` happens to hold.
const ran = new Set(rows.filter((r) => r.verdict !== "ERROR").map((r) => r.step));
const stepsCompleted = [...DECLARED_STEPS].filter((st) => ran.has(st)).length;
const missedSteps = [...DECLARED_STEPS].filter((st) => !ran.has(st));
const undeclaredSteps = [...ran].filter((st) => !DECLARED_STEPS.has(st));
if (DECLARED_STEPS.size === 0) {
  failures.push("NO STEPS WERE DECLARED, so there is no expectation to judge this run "
    + "against and it proves nothing.");
}
if (stepsCompleted === 0) {
  failures.push("ZERO DECLARED STEPS COMPLETED. Nothing was asserted about what the "
    + "dashboard sends. This is NOT a clean run.");
}
if (missedSteps.length) {
  failures.push(`${missedSteps.length} declared step(s) never reached a verdict: `
    + `${missedSteps.join(", ")}. A step that stops running is a failure, not a smaller run.`);
}
if (undeclaredSteps.length) {
  failures.push(`${undeclaredSteps.length} step(s) ran that are not declared: `
    + `${undeclaredSteps.join(", ")}. Add them to EXPECTED_STEPS deliberately.`);
}
const canary = {
  id: "a second cancellation that really happens · the double-send detector must see it",
  // CAUGHT BY [double-send] SPECIFICALLY, and it is the control that makes the
  // rest of the run mean anything: three of the claims above are "no email
  // arrived", which is also what a check looking at the wrong table, filtering
  // on the wrong business or not waiting long enough says every single time.
  //
  // `--break=canary` skips putting the booking back to `confirmed`, so the
  // final cancel is not a transition, nothing is sent, and the canary is
  // correctly MISSED — which is the proof that this control is load-bearing
  // rather than a line that goes green whatever happens.
  observed_failure: canaryDetectors.includes("double-send"),
  caught_by: canaryDetectors,
  findings: canaryDetectors.includes("double-send")
    ? ["[double-send] a genuine second cancellation was seen, so the silences above are the product's and not the instrument's"]
    : ["[double-send] NOT CAUGHT — this check cannot tell one email from two"],
};

const status = failures.length === 0 && canary.observed_failure ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "dashboard-notifies",
  started_at,
  status,
  // Four numbers from four places, so they can disagree.
  expected_targets: EXPECTED_STEPS.length, // declared above, before the run
  discovered_targets: DECLARED_STEPS.size, // the list this run is judged against
  attempted_targets: rows.length,          // steps that produced any row at all
  completed_targets: stepsCompleted,       // declared steps that reached a verdict
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 15,
  failures,
  artifacts: ["scripts/dashboard-notifies.mjs"],
  warnings: [
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    ...warnings,
  ],
  dimensions: {
    project: REF,
    endpoint: "update-booking",
    // What answered this run. Never omitted; see `deployedIdentity` above.
    endpoint_deployed: deployedVersion,
    recipient: SINK,
    steps: rows.map((r) => `${r.step}: ${r.verdict}`),
  },
  canary,
});

// PRINTED ABOVE THE VERDICT, NOT BELOW IT. A caveat sitting under a number is
// read by nobody at the moment they are trusting that number.
console.log(`\nanswered by the DEPLOYED update-booking: ${deployedVersion}`);
console.log("  (whether that equals this checkout is deployed-inventory.mjs's question, not this one's)");
console.log(`\n${status.toUpperCase()} — ${rows.length} steps, ${assertions} assertions, `
  + `${failures.length} failure(s). Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
