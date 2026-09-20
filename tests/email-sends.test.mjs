// ROADMAP 14.3 — EVERY EMAIL THE PRODUCT SENDS LEAVES A ROW, AND THE ROW SAYS
// WHAT BECAME OF IT.
//
// The defect: nothing anywhere recorded a send. `platform_email_days` counts
// and holds no recipient; `send-email` received Resend's message id and threw
// it away; a refusal went to `console.error`, which is a log nobody watches and
// which expires. So "I never got the confirmation" had no answer in the system.
//
// ---------------------------------------------------------------------------
// THE UNIT OF MEASUREMENT IS THE PLATFORM'S OWN SEND COUNTER, NOT A LIST OF
// EMAIL KINDS THIS FILE KNOWS ABOUT
// ---------------------------------------------------------------------------
// A check that names the receipt and the thank-you passes on the day somebody
// adds a seventeenth template. So this file never names an email. It reads
// `platform_email_days` — the counter `send-email` has bumped on every send
// since roadmap 8.6, independently of anything 14.3 touched — drives real
// product actions, and reads it again. **The counter's delta is the number of
// emails that reached the provider, and every one of them is a target: there
// must be a row for it.** Add an email kind tomorrow and the counter counts it,
// so this check grows a target by itself with nobody editing this file.
//
// Two independent records of the same event, and the check is that they agree.
// That is what makes it hard to fool: silencing the counter to make the check
// pass would be a visible edit to the quota machinery.
//
// IT FAILS CLOSED ON ZERO. If nothing was sent during the run the counter does
// not move, there are no targets, and a clean result would be worthless — so
// that is a FAILURE here, and `scripts/receipt.mjs` enforces the same rule
// again from the outside.
//
// ---------------------------------------------------------------------------
// WHAT IT SENDS, AND WHY IT IS SAFE
// ---------------------------------------------------------------------------
// It invoices ONE already-finalised demo booking three times, pointing the
// address at a different place each time, and puts the original address back
// at the end (including after a failure). Two of those are Resend's own
// sandbox addresses — `delivered@resend.dev` and `bounced@resend.dev` — which
// exist to be sent to and reach no person. The third is the demo tenant's own
// `@example.com` address, which is a reserved domain the product refuses to
// send to, and that refusal is one of the branches under test.
//
//   node scripts/seed-demo.mjs        # once, if the demo tenant is not there
//   node tests/email-sends.test.mjs
//   node scripts/receipt.mjs receipts/email-sends.json
//
// § 1 is credential-free. Everything after it needs the root `.env` and prints
// SKIPPED, loudly and by name, when it cannot run — and writes NO receipt,
// because a receipt for a run that sent nothing is the exact lie
// `scripts/receipt.mjs` exists to stop. § 4 additionally needs
// `RESEND_WEBHOOK_SECRET`, and says so rather than quietly passing.

import "./_env.mjs";           // root .env -> process.env, before anything reads it

import { createHmac, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { writeReceipt } from "../scripts/receipt.mjs";

const started_at = new Date().toISOString();
const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;
let ANON = process.env.SUPABASE_ANON_KEY;

const DEMO_OWNER = "demo@detailplatform.com";
const DEMO_SECRET = "demo" + "123";
const ART = new URL("../artifacts/email-sends/", import.meta.url);

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

let passed = 0;
const failures = [];
let assertions = 0;
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failures.push(`${name} ${detail}`.trim()); console.error(`  FAIL  ${name} ${detail}`); }
};

// THE COMPARATOR EVERY VERDICT AND THE CANARY BOTH GO THROUGH. Given how many
// sends the counter saw and the rows that appeared, what is unaccounted for?
const unaccounted = (counted, rows) => {
  const recorded = rows.filter((r) => r.status === "sent" || r.status === "failed").length;
  return counted - recorded;
};

// ---------------------------------------------------------------------------
console.log("\n§ 1 — no way out of the relay is silent any more");
{
  // THE RELAY IS THE CHOKE POINT AND THAT IS WHY THIS IS CHECKABLE AT ALL.
  // Every email in this product goes through `send-email`; if each of its exits
  // records, then every email is recorded, whatever sends it.
  const src = read("supabase/functions/send-email/index.ts");

  // EVERY EXIT IS A TARGET, FOUND BY READING THE FUNCTION RATHER THAN LISTED
  // HERE. A seventh `return` added tomorrow is a seventh target.
  const body = src.slice(src.indexOf("Deno.serve"));
  const exits = [...body.matchAll(/\n( *)return json\(/g)].map((m) => m.index);
  check("the relay has the several exits a reader would expect to find",
    exits.length >= 6, `found ${exits.length}`);

  // The two exits that are NOT a send: the unauthorized guard and the missing-
  // argument guards all fire before there is an email to record.
  const preSend = body.indexOf("const domain = String(to)");
  const sendExits = exits.filter((at) => at > preSend);
  let unrecorded = 0;
  for (const at of sendExits) {
    // The `record()` call belongs immediately above its own exit, so the
    // window is deliberately small: a single call at the top of the function
    // would not satisfy this.
    if (!/await record\(/.test(body.slice(Math.max(0, at - 700), at))) unrecorded++;
  }
  check("every exit that follows a real email records one",
    unrecorded === 0 && sendExits.length >= 4,
    `${unrecorded} of ${sendExits.length} exits write nothing`);

  check("the webhook only ever updates a row, never inserts one",
    !/from\("email_sends"\)[\s\S]{0,80}\.insert/.test(read("supabase/functions/resend-webhook/index.ts")),
    "an insert here would let a signed event invent a send that never happened");

  // THE ROW IS NOT THE BROWSER'S TO WRITE. RLS chooses rows, never columns, so
  // a `for all` policy would let a detailer mark their own bounce as delivered.
  const mig = read("supabase/migrations/20260916010000_every_email_leaves_a_row.sql");
  // MATCHED ON THE STATEMENT, NOT ON THE PHRASE. The first version of this
  // assertion tested `!/for all/` and failed on the migration's own COMMENT
  // explaining why there is no `for all` policy — a check reading prose as if
  // it were code, which is the same class as `docs/gotchas.md`'s grep-coupled-
  // to-a-spelling entry, caught here by the check failing rather than by
  // somebody noticing later.
  const policies = [...mig.matchAll(/create policy[\s\S]*?\n *for (\w+)/g)].map((m) => m[1]);
  check("the table gives the browser `select` and nothing else",
    /for select to authenticated/.test(mig)
    && /revoke insert, update, delete on public\.email_sends from authenticated, anon/.test(mig)
    && policies.length > 0 && policies.every((p) => p === "select"),
    `policies found: ${policies.join(", ") || "none"}`);
}

// ---------------------------------------------------------------------------
console.log("\n§ 2 — three real sends through a real product action");

let expected = 0, discovered = 0, attempted = 0, completed = 0;
const canary = { id: "one-recorded-row-removed-from-the-reconciliation", observed_failure: false };
let ranLive = false;
const dims = {};

if (!URL_ || !SERVICE) {
  console.log("  SKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.");
  console.log("  NOTHING after § 1 ran, and NO receipt was written. This is not a pass.");
} else {
  if (!ANON) {
    const r = await fetch(
      `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys?reveal=true`,
      { headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` } });
    ANON = (await r.json()).find((k) => k.name === "anon")?.api_key;
  }
  const H = {
    apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
    "Content-Type": "application/json", Prefer: "return=representation",
  };
  const svc = async (path, opts = {}) => {
    const r = await fetch(URL_ + path, { ...opts, headers: H });
    const t = await r.text();
    try { return JSON.parse(t); } catch { return t; }
  };

  const tok = await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEMO_OWNER, password: DEMO_SECRET }),
  })).json();
  const jwt = tok.access_token ?? null;
  check("the demo tenant's owner can sign in (run `node scripts/seed-demo.mjs` if not)",
    !!jwt, tok.error_description || tok.msg || "");

  const [biz] = jwt ? await svc("/rest/v1/businesses?slug=eq.demo-detail&select=id") : [];
  // A FINALISED BOOKING, because `send-invoice` refuses anything else — and an
  // invoice is the right vehicle: it is a real product action a detailer takes,
  // not a direct poke at the relay.
  const [booking] = biz
    ? await svc(`/rest/v1/bookings?business_id=eq.${biz.id}&finalized_at=not.is.null`
      + "&deleted_at=is.null&customer_id=not.is.null&select=id,customer_id,customer_email&limit=1")
    : [];
  check("that owner has a finalised booking with a customer to invoice",
    !!booking, "nothing to send, so a clean result would prove nothing");

  if (booking && jwt) {
    ranLive = true;
    const ORIGINAL = booking.customer_email;
    const today = new Date().toISOString().slice(0, 10);

    const counter = async () => {
      const [d] = await svc(`/rest/v1/platform_email_days?day=eq.${today}&select=sent,failed`);
      return (d?.sent ?? 0) + (d?.failed ?? 0);
    };
    const rowsSince = async (iso) => await svc(
      "/rest/v1/email_sends?select=id,to_email,subject,status,detail,provider_id,business_id,customer_id,sent_at"
      + `&sent_at=gt.${iso}&order=sent_at.asc`);
    const point = async (addr) => {
      await svc(`/rest/v1/customers?id=eq.${booking.customer_id}`,
        { method: "PATCH", body: JSON.stringify({ email: addr }) });
      await svc(`/rest/v1/bookings?id=eq.${booking.id}`,
        { method: "PATCH", body: JSON.stringify({ customer_email: addr }) });
    };
    const invoice = async () => (await fetch(`${URL_}/functions/v1/send-invoice`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: biz.id, booking_id: booking.id }),
    })).status;

    const mark = new Date(Date.now() - 1000).toISOString();
    const before = await counter();
    let rows = [];

    try {
      // Resend's own sandbox addresses. They exist to be sent to and reach
      // nobody; `bounced@resend.dev` is how a bounce is produced on purpose.
      await point("delivered@resend.dev");
      check("invoicing a deliverable address succeeds", await invoice() === 200);
      await point("bounced@resend.dev");
      check("invoicing an address that will bounce also succeeds at send time",
        await invoice() === 200, "a bounce is asynchronous; the send itself is fine");
      // A RESERVED DOMAIN. Never sendable, never attempted, and until 14.3 the
      // only trace was a `console.warn`.
      await point(ORIGINAL);
      check("invoicing a reserved domain still answers success to the caller",
        await invoice() === 200, "a booking must never fail because an email could not go");
    } finally {
      // THE ADDRESS GOES BACK EVEN IF THE RUN DIED. A check that leaves the
      // demo tenant pointed at a sandbox address has broken the fixture every
      // later suite reads.
      await point(ORIGINAL);
    }

    await new Promise((r) => setTimeout(r, 2500));
    rows = await rowsSince(mark);
    const counted = (await counter()) - before;

    // THE TARGETS, DISCOVERED. Every send the platform's own counter saw.
    expected = discovered = counted;
    console.log(`  — the counter saw ${counted} send(s) reach the provider; `
      + `${rows.length} row(s) were written in the same window:`);
    for (const r of rows) {
      console.log(`      ${String(r.status).padEnd(10)} ${String(r.to_email).padEnd(24)} `
        + `${String(r.subject).slice(0, 38)}`);
    }

    check("the run really did send something, so there is something to reconcile",
      discovered > 0, "the counter did not move — nothing was measured");

    const gap = unaccounted(counted, rows);
    attempted = completed = discovered;
    check("every send the counter saw has a row of its own",
      gap === 0, `${gap} send(s) reached the provider and left no record`);

    // AND THE ROWS THAT NEVER REACHED THE PROVIDER ARE THERE TOO — the three
    // branches that used to be a `console.warn` and nothing else.
    const silent = rows.filter((r) => r.status === "skipped" || r.status === "refused");
    check("the sends that never reached the provider are recorded as well",
      silent.length > 0, "a reserved domain still leaves no trace");

    for (const r of rows) {
      check(`${String(r.status).padEnd(9)} — the row says who it was to and what it said`,
        !!r.to_email && !!r.subject && !!r.business_id, JSON.stringify(r).slice(0, 120));
    }
    check("a provider id is kept for every send that reached the provider, and for no other",
      rows.every((r) => (r.status === "sent") === !!r.provider_id),
      "the webhook finds its row by this id, so a missing one is an outcome nobody can record");
    check("the rows are filed against the customer, which is the screen they appear on",
      rows.every((r) => r.customer_id === booking.customer_id),
      "a row with no customer is a row no detailer will ever see");

    mkdirSync(ART, { recursive: true });
    writeFileSync(new URL("rows.json", ART), JSON.stringify({ counted, rows }, null, 2) + "\n");

    // -----------------------------------------------------------------------
    console.log("\n§ 3 — the provider says what became of the message");

    if (!HOOK_SECRET) {
      console.log("  SKIPPED — RESEND_WEBHOOK_SECRET is not in the root .env, so no event");
      console.log("  can be signed. The delivery half of 14.3 was NOT exercised by this run.");
      failures.push("§ 3 could not run: RESEND_WEBHOOK_SECRET is not set");
    } else {
      const hook = async (type, emailId, extra = {}, opts = {}) => {
        const raw = JSON.stringify({ type, data: { email_id: emailId, ...extra } });
        const ts = opts.ts ?? Math.floor(Date.now() / 1000);
        const id = "msg_" + randomUUID();
        const key = Buffer.from(String(opts.secret ?? HOOK_SECRET).replace(/^whsec_/, ""), "base64");
        const sig = createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest("base64");
        const r = await fetch(`${URL_}/functions/v1/resend-webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sig}`,
          },
          body: raw,
        });
        return { status: r.status, body: await r.json().catch(() => null) };
      };
      const statusOf = async (id) =>
        (await svc(`/rest/v1/email_sends?id=eq.${id}&select=status,detail`))[0];

      const toDeliver = rows.find((r) => r.to_email === "delivered@resend.dev" && r.provider_id);
      const toBounce = rows.find((r) => r.to_email === "bounced@resend.dev" && r.provider_id);
      check("there is a sent row for each outcome to report against",
        !!toDeliver && !!toBounce, "the sandbox sends did not produce rows with provider ids");

      if (toDeliver && toBounce) {
        const d = await hook("email.delivered", toDeliver.provider_id);
        check("a signed delivery event is accepted and finds its row",
          d.status === 200 && d.body?.matched === 1, JSON.stringify(d));
        check("and the row now says delivered",
          (await statusOf(toDeliver.id))?.status === "delivered");

        const b = await hook("email.bounced", toBounce.provider_id,
          { bounce: { message: "This mailbox does not exist." } });
        check("a signed bounce is accepted and finds its row",
          b.status === 200 && b.body?.matched === 1, JSON.stringify(b));
        const bounced = await statusOf(toBounce.id);
        check("and the row now says bounced, in the provider's own words",
          bounced?.status === "bounced" && /mailbox/i.test(bounced.detail ?? ""),
          JSON.stringify(bounced));

        // THE FORGERY. This endpoint is open to the internet and the signature
        // is the whole authentication; `tests/svix-signature.test.mjs` proves
        // the verifier, and this proves the DEPLOYED function uses it.
        const forged = await hook("email.bounced", toDeliver.provider_id,
          { bounce: { message: "forged" } },
          { secret: "whsec_" + Buffer.from("not-the-real-secret-at-all!").toString("base64") });
        check("an event signed with the wrong secret is refused by the live endpoint",
          forged.status === 400, JSON.stringify(forged));
        check("and the row it targeted is untouched",
          (await statusOf(toDeliver.id))?.status === "delivered", "a forgery changed a record");

        const replayed = await hook("email.delivered", toDeliver.provider_id, {},
          { ts: Math.floor(Date.now() / 1000) - 360 });
        check("a genuine signature from six minutes ago is refused by the live endpoint",
          replayed.status === 400, JSON.stringify(replayed));

        // OUT OF ORDER. Providers do redeliver, and a bounced address quietly
        // reverting to "delivered" is worse than having no column at all.
        const late = await hook("email.delivered", toBounce.provider_id);
        check("a late delivery event cannot undo a bounce",
          late.status === 200 && late.body?.matched === 0, JSON.stringify(late));
        check("and the row still says bounced",
          (await statusOf(toBounce.id))?.status === "bounced");

        const unknown = await hook("email.opened", toDeliver.provider_id);
        check("an event type the product does not model is acknowledged, not retried for days",
          unknown.status === 200 && !!unknown.body?.ignored, JSON.stringify(unknown));

        // THE BANNER THAT ALREADY EXISTED FINALLY SEES A REAL BOUNCE. Until
        // 14.3 `customers.email_failed_at` was stamped only by a synchronous
        // refusal, and most bounces are not synchronous.
        const [cust] = await svc(
          `/rest/v1/customers?id=eq.${booking.customer_id}&select=email_failed_at,email_failed_reason`);
        check("an asynchronous bounce flags the address on the customer too",
          !!cust?.email_failed_at, "the 'this address bounced' banner still cannot see a real bounce");

        // AND THE FIXTURE IS PUT BACK. The address it refers to is a sandbox
        // one this check pointed at the customer for four seconds; leaving the
        // flag on would show a permanent false warning on a demo record.
        await svc(`/rest/v1/customers?id=eq.${booking.customer_id}`, {
          method: "PATCH",
          body: JSON.stringify({ email: ORIGINAL, email_failed_at: null, email_failed_reason: null }),
        });

        dims.webhook_events_posted = 6;
      }
    }

    // -----------------------------------------------------------------------
    console.log("\n§ 4 — the canary");
    // THE NEGATIVE CONTROL, ON THE DATA AND NOT ON THE DATABASE. Take the real
    // rows, drop one that reached the provider, and run the same reconciliation.
    // A missing row is precisely the defect 14.3 exists to prevent, so if the
    // comparator reports clean on a set with one removed, every green line
    // above is worthless. Nothing is deleted: 14.2's canary works the same way,
    // and a check that damages its own fixture to prove a point is a check
    // somebody will eventually run against production.
    const reached = rows.filter((r) => r.status === "sent" || r.status === "failed");
    const doctored = rows.filter((r) => r.id !== reached[0]?.id);
    canary.observed_failure = reached.length > 0 && unaccounted(counted, doctored) > 0;
    canary.reported = reached.length > 0 ? unaccounted(counted, doctored) : 0;
    check("the canary — one missing row is caught by the same reconciliation",
      canary.observed_failure,
      `reported a gap of ${canary.reported}; the check cannot see a send that left no record`);

    dims.counter_delta = counted;
    dims.rows_written = rows.length;
    dims.statuses = [...new Set(rows.map((r) => r.status))].join(",");
  }
}

// ---------------------------------------------------------------------------
const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions.`);

if (ranLive && discovered > 0) {
  const { path } = writeReceipt({
    check_id: "email-sends",
    started_at,
    status: failed ? "fail" : "pass",
    expected_targets: expected,
    discovered_targets: discovered,
    attempted_targets: attempted,
    completed_targets: completed,
    skipped_targets: 0,
    assertions_executed: assertions,
    // § 1's four, § 2's nine fixed, § 3's twelve, § 4's one, plus one per row.
    min_assertions: 20,
    failures,
    dimensions: { endpoint: "send-email + resend-webhook", trigger: "send-invoice", ...dims },
    artifacts: ["artifacts/email-sends/rows.json"],
    canary,
  });
  console.log(`receipt: ${path}`);
} else {
  console.log("no receipt written — the live sections did not run.");
}

process.exit(failed ? 1 : 0);
