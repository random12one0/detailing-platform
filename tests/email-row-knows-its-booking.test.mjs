// ROADMAP 3.1 — THE BOOKING ID SURVIVES ALL THREE HOPS TO THE DELIVERY ROW.
//
// Run: node --test tests/email-row-knows-its-booking.test.mjs
//      Credential-free. Filesystem reads only. No network, no database.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS — the fault it guards has no symptom
// ---------------------------------------------------------------------------
// 3.1 wants the delivery list "linked to message, booking, detailer and
// recipient". 14.3 built three of the four and its entry says why the fourth
// was missing: *"the relay is never told which booking it is sending about."*
//
// A booking email travels **sender -> `sendTenantEmail` -> the `send-email`
// relay -> `record()` -> `email_sends`**, and the id can be dropped at any of
// those hops **with no symptom whatsoever**. The email still sends. The row is
// still written. The status still goes `sent` and then `delivered`. The only
// difference is a null in one column, on a screen that does not exist yet —
// which is the precise shape of a fault nobody finds for a month.
//
// **`_shared/email.ts` already carries this warning about `extraVehiclesFor`,
// and it is there because a hand-written caller list in this repo was short by
// one.** So this file does not hold a list of senders. It DISCOVERS them.
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS, AND WHY "OMITTED" HAS TO BE A LEGITIMATE ANSWER
// ---------------------------------------------------------------------------
// Most tenant email is not about a booking: the invite to a new user, the
// detailer's campaign to a whole list, a plan link, the platform's own
// dead-man's switch and its billing mail. A null `booking_id` is CORRECT for
// all of those, exactly as a null `business_id` is correct for platform mail.
//
// **So a missing argument cannot be read as a bug, and a count of sites cannot
// decide it either.** The no-booking senders are declared BY NAME below, which
// is the `gotchas.md` 98 rule: a declaration of what is deliberately absent is
// an equality on a named set, never a tally. A sender leaving that list is
// ordinary work; **one arriving uninvited is the finding** — it means a new
// email was wired up and nobody asked which booking it was about.
//
// ---------------------------------------------------------------------------
// WHAT IT CANNOT DO, said plainly
// ---------------------------------------------------------------------------
// **This is a SOURCE check and it proves nothing about the running system.**
// There is no Deno on this machine — `_shared/email.ts` records that no type
// error anywhere in `supabase/` is currently caught by anything — and the
// migration has not been applied, so the column does not exist in the live
// database yet. A green run here means the three hops are wired in the
// CHECKOUT. Whether they are wired in what is DEPLOYED is
// `scripts/deployed-inventory.mjs`'s question, and whether the column exists is
// `scripts/migration-drift.mjs`'s. Both are reported with this item and both
// say no.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const FN = "supabase/functions";
const RELAY = `${FN}/_shared/email.ts`;
const SENDER = `${FN}/send-email/index.ts`;
const MIGRATION = "supabase/migrations/20261006010000_an_email_row_knows_its_booking.sql";

// Guards the DISCOVERY, not the backlog: 28 call sites when written. Few or zero
// means the `sendTenantEmail(` scan stopped matching, and every assertion below
// would then pass over nothing.
const CALL_SITE_FLOOR = 20;

// DECLARED BY NAME, NOT COUNTED — the senders whose mail is about no booking.
// A name leaving this list is ordinary work. A name ARRIVING is the finding.
const NO_BOOKING = [
  "create-business",      // the welcome mail for a brand-new tenant
  "invite-user",          // an invitation to a person, not about a job
  "plan-link",            // the subscription link and its cancellation notice
  "platform-admin",       // us writing to a detailer, about their account
  "preview-emails",       // the template previewer, addressed to a sink
  "report-problem",       // a detailer telling us something is wrong
  "send-campaign",        // one message to a whole customer list
  "stripe-webhook",       // platform billing mail
  "watch-jobs",           // the dead man's switch, about our own plumbing
];

// Sites inside a no-booking sender that ARE about a booking, or the reverse.
// `send-owner-reminders` sends three booking reminders and one maintenance
// nudge; the nudge is about a due date on a vehicle, not about an appointment.
const PER_SITE_EXCEPTIONS = {
  "send-owner-reminders": 1,   // the maintenance reminder, correctly null
};

const CANARY = process.env.BOOKING_ID_CANARY === "1";

/** Every `sendTenantEmail(` call site, discovered from the source. */
function callSites() {
  const out = [];
  for (const dir of readdirSync(FN)) {
    const path = `${FN}/${dir}/index.ts`;
    let text;
    try { text = readFileSync(path, "utf8"); } catch { continue; }
    text.split(/\r?\n/).forEach((line, i) => {
      if (!line.includes("sendTenantEmail(")) return;
      out.push({ fn: dir, line: i + 1, text: line, passes: /bookingId\s*:/.test(line) });
    });
  }
  if (CANARY) out.push({ fn: "create-booking", line: 0, text: "await sendTenantEmail({ businessId: x })", passes: false });
  return out;
}

test("ROADMAP 3.1 — an email row knows which booking it is about", async (t) => {
  const sites = callSites();

  await t.test("0 · the scan found the senders (discovery floor)", () => {
    assert.ok(
      sites.length >= CALL_SITE_FLOOR,
      `discovered ${sites.length} sendTenantEmail call sites, floor ${CALL_SITE_FLOOR}. `
      + "FEW OR ZERO IS A BROKEN SCAN, never a product with no email — and every "
      + "assertion below would pass over an empty list. Check the "
      + "`sendTenantEmail(` spelling and the `supabase/functions/*/index.ts` shape "
      + "before touching this floor.",
    );
  });

  await t.test("1 · HOP ONE — the relay helper accepts and forwards the booking", () => {
    const src = readFileSync(RELAY, "utf8");
    assert.match(src, /bookingId\?\s*:\s*string\s*\|\s*null/,
      `${RELAY} must declare an optional bookingId on sendTenantEmail's options`);
    assert.match(src, /booking_id:\s*opts\.bookingId/,
      `${RELAY} declares bookingId but must also put it in the POST body as `
      + "booking_id — a field accepted and then dropped is the worst of the three "
      + "hops, because the call sites all look correct");
  });

  await t.test("2 · HOP TWO — the relay function reads it off the request", () => {
    const src = readFileSync(SENDER, "utf8");
    assert.match(src, /booking_id\s*[,}]/,
      `${SENDER} must destructure booking_id from the request body`);
    assert.match(src, /booking_id:\s*typeof booking_id === "string"/,
      `${SENDER} must normalise booking_id rather than trusting the body — a `
      + "non-string would be handed to the insert and fail the whole row");
  });

  await t.test("3 · HOP THREE — it reaches the insert", () => {
    const src = readFileSync(SENDER, "utf8");
    const insert = src.slice(src.indexOf('from("email_sends").insert({'));
    assert.ok(insert.length > 50, "could not find the email_sends insert");
    assert.match(insert.slice(0, 900), /booking_id:\s*bookingId/,
      "the email_sends insert must carry booking_id. **This is the hop with no "
      + "symptom**: every other part of the system behaves identically whether "
      + "this line is present or not, and the only difference is a null column");
  });

  await t.test("4 · the migration adds the column, and is append-only", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    assert.match(sql, /alter table public\.email_sends/,
      "the migration must alter email_sends");
    assert.match(sql, /add column if not exists booking_id uuid/,
      "the migration must add booking_id");
    assert.match(sql, /references public\.bookings\(id\) on delete set null/,
      "on delete set null, NOT cascade — the email was still sent and its outcome "
      + "is still true after the booking is removed. The migration header has the "
      + "reasoning; `customer_id` made the same choice.");
    assert.doesNotMatch(sql, /drop (column|table)/i,
      "migrations here are append-only — a drop in this file is the one thing it "
      + "must never contain");
  });

  await t.test("5 · EVERY booking sender passes the booking id", () => {
    const missing = sites
      .filter((s) => !NO_BOOKING.includes(s.fn))
      .filter((s) => !s.passes)
      .map((s) => `${s.fn}/index.ts:${s.line}`);
    const allowed = Object.entries(PER_SITE_EXCEPTIONS)
      .flatMap(([fn, n]) => Array.from({ length: n }, () => fn));
    const unexplained = missing.filter((m) => {
      const fn = m.split("/")[0];
      const i = allowed.indexOf(fn);
      if (i >= 0) { allowed.splice(i, 1); return false; }
      return true;
    });
    assert.deepEqual(
      unexplained, [],
      "a sender that is about a booking does not pass bookingId, so its delivery "
      + "row will carry a null and the back-office list will simply not show that "
      + "email. **Nothing else about the send changes, which is why this needs a "
      + "check rather than a test run.** Add `bookingId:` at the call site, or — "
      + "if the mail really is about no booking — add the sender to NO_BOOKING or "
      + "PER_SITE_EXCEPTIONS with a comment saying which message it is.",
    );
  });

  await t.test("6 · the no-booking senders are still exactly the declared ones", () => {
    const named = [...new Set(sites.map((s) => s.fn))];
    const stale = NO_BOOKING.filter((fn) => !named.includes(fn));
    assert.deepEqual(
      stale, [],
      "NO_BOOKING names a sender that no longer calls sendTenantEmail. Declared "
      + "by NAME rather than counted (gotchas 98) so this is visible: remove it "
      + "in the same edit as whatever removed the sender.",
    );
  });

  await t.test("7 · the canary is wired", () => {
    if (!CANARY) {
      assert.equal(sites.filter((s) => s.line === 0).length, 0,
        "no synthetic call site should exist without BOOKING_ID_CANARY=1");
      return;
    }
    assert.fail("BOOKING_ID_CANARY=1 — unreachable, because section 5 must fail "
      + "first on the synthetic booking sender that passes no bookingId");
  });
});
