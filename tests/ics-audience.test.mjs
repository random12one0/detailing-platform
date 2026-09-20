// ROADMAP 14.2 — WHO IS ALLOWED TO SEE THE OWNER'S COPY OF A CALENDAR FILE.
//
// `booking-ics` serves two versions of the same job. The customer's copy is
// deliberately reachable with nothing but the booking's unguessable uuid — the
// person clicking it came from an email and has no account. The owner's copy
// adds the customer's full name, their phone number and their private note,
// and `audience` was a plain query word: anyone who edited their own
// confirmation link got it. Measured anonymously against the DEPLOYED function
// on 2026-09-16 with no apikey and no Authorization header — name
// `Chris Vogel`, phone `562-555-0447`. That measurement is kept beside this
// file's own output at `artifacts/ics-audience/BEFORE-anonymous-owner.txt`.
//
// ---------------------------------------------------------------------------
// THE UNIT OF MEASUREMENT IS "EVERY LINE THE OWNER SEES AND THE CUSTOMER DOES
// NOT", AND THAT IS THE WHOLE POINT
// ---------------------------------------------------------------------------
// A check that says "the phone number is gone" passes on the day somebody adds
// the customer's email address to the owner's description. So this file never
// names a field. It fetches the owner's copy WITH a session and the customer's
// copy WITHOUT one, subtracts the second from the first, and every remaining
// line is a target: the anonymous flip must contain none of them. Add an
// owner-only line to the endpoint tomorrow and this check grows a target by
// itself, with nobody editing this file.
//
// IT FAILS CLOSED ON ZERO. If the two copies ever come back identical the
// subtraction yields nothing, and "nothing leaked" would then be true and
// worthless — so a run that finds no owner-only lines is a FAILURE here, not a
// pass. `scripts/receipt.mjs` enforces the same rule a second time.
//
// IT WRITES NOTHING. It signs in as the demo tenant's owner — the account
// every other suite in this repo signs in as — and reads. A check that has to
// reset somebody's password to run is a check that can break the thing it is
// measuring.
//
//   node scripts/seed-demo.mjs        # once, if the demo tenant is not there
//   node tests/ics-audience.test.mjs
//   node scripts/receipt.mjs receipts/ics-audience.json
//
// § 1 is credential-free. § 2 and § 3 need the root `.env` and print SKIPPED,
// loudly and by name, when they cannot run — and write NO receipt, because a
// receipt for a run that probed nothing is the exact lie receipt.mjs exists
// to stop.

import "./_env.mjs";           // root .env -> process.env, before anything reads it

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { writeReceipt } from "../scripts/receipt.mjs";

const started_at = new Date().toISOString();
const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
let ANON = process.env.SUPABASE_ANON_KEY;

// The demo tenant's owner, exactly as `scripts/e2e-booking.mjs` and the width
// sweeps sign in. Seeded by `scripts/seed-demo.mjs`; not a secret and not a
// recipient of any mail.
const DEMO_OWNER = "demo@detailplatform.com";
const DEMO_SECRET = "demo" + "123";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const FN = "supabase/functions/booking-ics/index.ts";
const ART = new URL("../artifacts/ics-audience/", import.meta.url);

let passed = 0;
const failures = [];
let assertions = 0;
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failures.push(`${name} ${detail}`.trim()); console.error(`  FAIL  ${name} ${detail}`); }
};

// THE COMPARATOR EVERY VERDICT AND THE CANARY BOTH GO THROUGH. Given the
// owner-only lines and a body, which of them did that body contain?
const leaked = (ownerOnlyLines, body) => ownerOnlyLines.filter((l) => body.includes(l));

// DTSTAMP is the moment the file was generated and UID carries the audience
// suffix; neither is private and both differ between two fetches of the same
// booking, so neither is part of the comparison.
const meaningful = (ics) => ics.split(/\r?\n/)
  .filter((l) => l.trim() && !l.startsWith("DTSTAMP:") && !l.startsWith("UID:"));

// ---------------------------------------------------------------------------
console.log("\n§ 1 — the endpoint asks who is calling before it answers as the owner");
{
  const src = read(FN);
  check("the owner's copy is gated on a membership check, not on a query word",
    /requireMember\(req, booking\.business_id\)/.test(src),
    "nothing verifies the caller against this booking's business");
  check("`audience` is decided after that check and not read straight off the URL",
    !/const audience = url\.searchParams/.test(src),
    "`audience` is still taken from the query string unchallenged");
  check("the membership is scoped to THIS booking's business",
    !/requireMember\(req\)/.test(src) && !/requireMember\(req, *null/.test(src),
    "an unscoped check would let one detailer open another detailer's job");
  // ROADMAP 14.2's "Also": the endpoint had no ceiling, unlike `pay-booking`.
  check("the blunt public ceiling is applied, the same one `pay-booking` uses",
    /withinLimits\(supabase, \[\{ \.\.\.LIMITS\.publicCeiling, bucket: "booking-ics"/.test(src),
    "no rate limit; a loop can spend the project's invocations");
  // The browser side of the same fix: `icsUrl` builds a plain <a href>, and an
  // href cannot carry a session. The owner's copy must not be reachable that
  // way from the app at all — only through the fetch that sends the token.
  const api = read("app/src/lib/api.js");
  check("`icsUrl` defaults to the customer's copy, so a forgotten argument is safe",
    /icsUrl = \(bookingId, audience = "customer"\)/.test(api),
    "the default is still `owner`");
  check("no screen links to the owner's copy with an <a href>",
    !/icsUrl\([^)]*"owner"/.test(read("app/src/components/BookingDetail.jsx")
      + read("app/src/book/ManageBookingPage.jsx")
      + read("app/src/book/BookingConfirmed.jsx")),
    "an href to audience=owner is back, and an href cannot carry a session");
}

// ---------------------------------------------------------------------------
console.log("\n§ 2 — the deployed endpoint, three ways");

let expected = 0, discovered = 0, attempted = 0, completed = 0;
const probed = [];
const canary = { id: "the-owner-copy-itself-run-through-the-comparator", observed_failure: false };
let ranLive = false;

if (!URL_ || !SERVICE) {
  console.log("  SKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.");
  console.log("  NOTHING in § 2 or § 3 ran, and NO receipt was written. This is not a pass.");
} else {
  if (!ANON) {
    const r = await fetch(
      `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys?reveal=true`,
      { headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` } });
    ANON = (await r.json()).find((k) => k.name === "anon")?.api_key;
  }

  // SIGN IN FIRST, then let the session decide which booking to probe. Picking
  // the booking first and hunting for somebody who can see it is how a check
  // ends up measuring a business nobody is a member of.
  const tok = await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEMO_OWNER, password: DEMO_SECRET }),
  })).json();
  const jwt = tok.access_token ?? null;
  check("the demo tenant's owner can sign in (run `node scripts/seed-demo.mjs` if not)",
    !!jwt, tok.error_description || tok.msg || "");

  // Read through the OWNER'S OWN SESSION, not the service key. Row-level
  // security then guarantees the booking really does belong to a business this
  // session is a member of, which is the premise the whole comparison rests on.
  const asMember = async (path) => (await fetch(URL_ + path, {
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}` },
  })).json();

  let booking = null;
  if (jwt) {
    const rows = await asMember("/rest/v1/bookings?select=id,business_id,customer_name,customer_phone,"
      + "customer_notes&customer_phone=not.is.null&deleted_at=is.null&status=neq.cancelled&limit=1");
    booking = Array.isArray(rows) ? rows[0] : null;
  }
  check("that owner has a booking carrying a customer phone number to probe",
    !!booking, "no such row, so a clean result would prove nothing");

  if (booking && jwt) {
    ranLive = true;
    const get = async (qs, headers = {}) => {
      const res = await fetch(`${URL_}/functions/v1/booking-ics?id=${booking.id}${qs}`, { headers });
      return { status: res.status, body: await res.text() };
    };

    // 1. The owner, signed in. 2. The customer, anonymous. 3. THE FLIP: the
    //    customer's own link with `&audience=owner` typed on the end and no
    //    credential of any kind — not even an apikey.
    const asOwner = await get("&audience=owner", { apikey: ANON, Authorization: `Bearer ${jwt}` });
    const asCustomer = await get("");
    const flipped = await get("&audience=owner");

    mkdirSync(ART, { recursive: true });
    writeFileSync(new URL("owner-signed-in.ics", ART), asOwner.body);
    writeFileSync(new URL("customer-anonymous.ics", ART), asCustomer.body);
    writeFileSync(new URL("AFTER-anonymous-owner.ics", ART), flipped.body);

    check("the owner's copy still answers 200 for a signed-in member",
      asOwner.status === 200, `${asOwner.status}`);
    check("the customer's link still answers 200 with no credential at all",
      asCustomer.status === 200, `${asCustomer.status} — the customer's own link must not break`);
    check("the flipped link answers 200 rather than an error page",
      flipped.status === 200, `${flipped.status}`);

    // EVERY OWNER-ONLY LINE IS A TARGET, discovered by subtraction rather than
    // named here.
    const ownerLines = meaningful(asOwner.body);
    const customerLines = meaningful(asCustomer.body);
    const ownerOnly = ownerLines.filter((l) => !customerLines.includes(l));
    expected = discovered = ownerOnly.length;
    console.log(`  — ${discovered} line(s) the owner sees and the customer does not:`);
    for (const l of ownerOnly) console.log(`      ${l.slice(0, 110)}`);

    // FAIL CLOSED ON ZERO. Two identical copies would make every assertion
    // below vacuously true.
    check("the two copies really do differ, so there is something to withhold",
      discovered > 0, "owner and customer copies are identical — nothing was measured");
    check("the owner's copy is the one carrying the customer's phone number",
      asOwner.body.includes(booking.customer_phone),
      "the signed-in owner did not get the private copy, so the yardstick is wrong");

    for (const line of ownerOnly) {
      attempted++;
      check(`the flip withholds — ${line.slice(0, 64)}`,
        !flipped.body.includes(line), "handed to an anonymous caller");
      completed++;
    }

    // The same verdict on the raw values rather than on whole lines, so a
    // reformatted description cannot slip past a line-for-line comparison.
    check("the customer's name is not in the anonymous flip",
      !flipped.body.includes(`Customer: ${booking.customer_name}`),
      flipped.body.match(/DESCRIPTION[^\r\n]*/)?.[0] ?? "");
    check("the customer's phone number is not in the anonymous flip",
      !flipped.body.includes(booking.customer_phone), "the phone number came back");
    if (booking.customer_notes) {
      check("the customer's own note is not in the anonymous flip",
        !flipped.body.includes(booking.customer_notes), "the note came back");
    } else {
      check("(this booking carries no customer note, so none was withheld)", true);
    }
    check("the flip is the customer's copy, line for line",
      JSON.stringify(meaningful(flipped.body)) === JSON.stringify(customerLines),
      "it is neither the owner's copy nor the customer's, so something else changed");

    probed.push({
      booking: booking.id,
      owner_only_lines: discovered,
      flipped_status: flipped.status,
      leaked: leaked(ownerOnly, flipped.body).length,
    });

    // -----------------------------------------------------------------------
    console.log("\n§ 3 — the canary");
    // THE NEGATIVE CONTROL. Hand the comparator the OWNER's copy in place of
    // the anonymous one. That body contains every owner-only line by
    // definition, so a comparator that is looking must report all of them. If
    // this comes back clean, every green line in § 2 is worthless.
    const caught = leaked(ownerOnly, asOwner.body);
    canary.observed_failure = discovered > 0 && caught.length === discovered;
    canary.reported = caught.length;
    check("the canary — the owner's own copy is caught by the same comparator",
      canary.observed_failure,
      `reported ${caught.length} of ${discovered}; the comparator cannot see what it exists to catch`);
  }
}

// ---------------------------------------------------------------------------
const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions.`);

if (ranLive && discovered > 0) {
  const { path } = writeReceipt({
    check_id: "ics-audience",
    started_at,
    status: failed ? "fail" : "pass",
    expected_targets: expected,
    discovered_targets: discovered,
    attempted_targets: attempted,
    completed_targets: completed,
    skipped_targets: 0,
    assertions_executed: assertions,
    // § 1's six, § 2's nine fixed, § 3's one, plus one per owner-only line.
    min_assertions: 16 + expected,
    failures,
    dimensions: {
      endpoint: "booking-ics",
      flip: "audience=owner with no apikey and no Authorization",
      bookings_probed: probed.length,
      owner_only_lines: discovered,
    },
    artifacts: [
      "artifacts/ics-audience/owner-signed-in.ics",
      "artifacts/ics-audience/customer-anonymous.ics",
      "artifacts/ics-audience/AFTER-anonymous-owner.ics",
      "artifacts/ics-audience/BEFORE-anonymous-owner.txt",
    ],
    canary,
  });
  console.log(`receipt: ${path}`);
} else {
  console.log("no receipt written — the live sections did not run.");
}

process.exit(failed ? 1 : 0);
