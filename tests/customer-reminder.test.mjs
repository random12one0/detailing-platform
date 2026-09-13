// THE CUSTOMER APPOINTMENT REMINDER — the check that would have caught the
// fact that it had never sent an email in the product's whole life.
//
// **Andrew, 2026-09-13, reading three days of real delivered mail: across 125
// messages there is no message reminding a CUSTOMER of their appointment at
// all.** Measured in the database the same morning: `customer_reminder_sent_at`
// non-null on **0 of 56 bookings ever**. The feature was fully built — template,
// both languages, per-detailer brand, two reminders, four settings — and had
// produced nothing.
//
// **A no-show costs the detailer a whole slot, so this is money.**
//
// ---------------------------------------------------------------------------
// WHY A SOURCE GREP COULD NEVER HAVE FOUND THIS, AND A UNIT TEST COULD NOT
// EITHER
// ---------------------------------------------------------------------------
// Every part of it read correctly. `customerReminderEmail` exists and renders;
// `sendCustomerReminder` exists and calls it; the sweep loops over the due
// rows; the RPC has a sensible `where` clause. The defect was in the
// RELATIONSHIP between the due-ness query and the marker write, and it needed
// the real function against the real schema to see.
//
// **SO § 1 RUNS THE REAL RPC AGAINST REAL ROWS IT CREATES AND DELETES**, and
// § 2 reads the sweep's source for the one property no query can express: that
// a marker is never written for a send that did not happen.
//
// CLAUDE.md trap (k) — a check that greps source text asserts how something is
// WRITTEN. § 2 is a source check because this repo has no Deno test runner, so
// it says so, asserts the shared helper rather than a spelling, and COUNTS its
// subjects. § 1 is not a source check at all.
//
// Run: node tests/customer-reminder.test.mjs   (needs .env)

import "./_env.mjs";

const SB_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

import { readFileSync } from "node:fs";

let passed = 0, failed = 0, skipped = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};
const skip = (name, why) => { skipped++; console.log(`  SKIP  ${name} - ${why}`); };

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const rest = async (p, opts = {}) => {
  // `...opts` FIRST: spreading it after `headers` would let a caller's
  // `Prefer` header replace the whole object and take the apikey with it.
  const r = await fetch(`${SB_URL}/rest/v1/${p}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const t = await r.text();
  try { return { status: r.status, body: t ? JSON.parse(t) : null }; }
  catch { return { status: r.status, body: t }; }
};
const rpc = (fn, body = {}) => rest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(body) });

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE DUE-NESS QUERY, RUN FOR REAL
// ═══════════════════════════════════════════════════════════════════════════
//
// A booking is created that is unambiguously due RIGHT NOW, the RPC is asked
// whether it is due, and then each of the five things that should exclude it is
// switched on in turn. Nothing is emailed: the RPC is a `select`.
//
// **THE FIXTURE DEFEATS THE EVENING-BEFORE RULE ON PURPOSE.** That rule fires
// only for jobs starting at or before `evening_before_latest_start` (10:00 by
// default), and it sends at a wall-clock time the previous evening. A fixture
// caught by it would be due or not due depending on what time of day the suite
// happened to run. So the booking starts LATE in the business's own day, which
// puts it on the plain `start_at - lead_minutes` branch, and it is placed
// far enough out that the lead has already elapsed.
console.log("1. the RPC returns a booking that is genuinely due, and only then");

let bizId = null, custId = null, bookingId = null, restoreSettings = null;

if (!SB_URL || !KEY) {
  skip("every live check", "no SUPABASE_URL / service key in the environment");
} else {
  const biz = (await rest("businesses?slug=eq.demo-detail&select=id,timezone")).body;
  if (!biz?.length) {
    skip("every live check", "the demo-detail business is not in this project - run scripts/seed-demo.mjs");
  } else {
    bizId = biz[0].id;

    const s0 = (await rest(`business_settings?business_id=eq.${bizId}&select=customer_reminder_lead_minutes,evening_before_enabled,email_customer_reminder`)).body[0];
    restoreSettings = { ...s0 };

    // A customer of our own, so the three unreachable flags can be moved
    // without touching a seeded row anything else depends on.
    const cRes = await rest("customers", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      // `phone` is NOT NULL on `customers`. The first version of this fixture
      // omitted it, the insert 400'd, `custId` came out null, and the booking
      // was created with no customer at all - at which point the LEFT JOIN sees
      // no row, every `c.<flag> is null` is trivially true, and **the three
      // exclusion checks below were passing against a customer that did not
      // exist.** That is the repo's oldest failure in miniature, so the insert
      // is now asserted rather than assumed.
      body: JSON.stringify({ business_id: bizId, name: "Reminder Fixture", phone: "562-555-0000", email: "reminder-fixture@example.com" }),
    });
    custId = cRes.body?.[0]?.id ?? null;
    check("1z the fixture CUSTOMER was created", Boolean(custId),
      `without a customer row the three unreachable checks below assert nothing: ${JSON.stringify(cRes.body).slice(0, 220)}`);

    // **30 MINUTES OUT AGAINST A 120-MINUTE LEAD, so the send time passed 90
    // minutes ago.** The first version of this fixture put the booking SIX
    // hours out and the baseline failed: due-ness is `now >= start - lead`, so
    // a booking further away than the lead is correctly NOT yet due. The check
    // caught its own arithmetic, which is what § 1a is for.
    //
    // Evening-before is switched OFF for the fixture so that branch is not in
    // question - it sends at a wall-clock time the previous evening and would
    // make the result depend on what hour the suite happened to run.
    const start = new Date(Date.now() + 30 * 60_000);
    const end = new Date(start.getTime() + 3600_000);
    await rest(`business_settings?business_id=eq.${bizId}`, {
      method: "PATCH",
      body: JSON.stringify({ evening_before_enabled: false, customer_reminder_lead_minutes: 120, email_customer_reminder: true }),
    });

    const bRes = await rest("bookings", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        business_id: bizId, customer_id: custId,
        customer_name: "Reminder Fixture", customer_phone: "562-555-0000",
        customer_email: "reminder-fixture@example.com",
        customer_address: "1 Fixture Way, Long Beach, CA",
        start_at: start.toISOString(), end_at: end.toISOString(),
        service_type: "mobile", vehicle_size: "small",
        subtotal: 65, total_price: 65, status: "confirmed", lang: "en",
      }),
    });
    bookingId = bRes.body?.[0]?.id ?? null;

    if (!bookingId) {
      skip("every live check", `could not create the fixture booking: ${JSON.stringify(bRes.body).slice(0, 200)}`);
    } else {
      const isDue = async () => {
        const r = await rpc("get_bookings_due_for_reminder", { target: "customer" });
        return Array.isArray(r.body) && r.body.some((b) => b.id === bookingId);
      };
      const patchBooking = (p) => rest(`bookings?id=eq.${bookingId}`, { method: "PATCH", body: JSON.stringify(p) });
      const patchCustomer = (p) => rest(`customers?id=eq.${custId}`, { method: "PATCH", body: JSON.stringify(p) });
      const patchSettings = (p) => rest(`business_settings?business_id=eq.${bizId}`, { method: "PATCH", body: JSON.stringify(p) });

      // ── 1a · THE BASELINE, AND IT IS THE MOST IMPORTANT LINE IN THE FILE ──
      // **THIS IS THE INSTRUMENT BEING PROVEN.** Every exclusion below is a
      // check that the booking DISAPPEARS, and a query that returns nothing at
      // all passes all five of them while proving nothing. START-HERE § 4:
      // break the instrument on purpose before you believe it.
      check("1a a booking whose send time passed 90 minutes ago IS returned", await isDue(),
        "the RPC returned nothing for a booking whose send time passed 90 minutes ago - every exclusion below is now meaningless");

      // ── 1b · THE BUSINESS SWITCH ─────────────────────────────────────────
      // Until 2026-09-13 this was asked by the CALLER, which returned early and
      // then stamped the marker anyway. A booking of a switched-off business was
      // permanently marked *reminded*, so turning the switch on later could
      // never produce a reminder for it.
      await patchSettings({ email_customer_reminder: false });
      check("1b email_customer_reminder off removes it", !(await isDue()),
        "a business that switched customer reminders off is still being selected");
      await patchSettings({ email_customer_reminder: true });
      check("1b and switching it back on returns it", await isDue());

      // ── 1c · THE THREE WAYS A CUSTOMER IS UNREACHABLE ────────────────────
      // The same three the Clients count, `send-campaign` and the maintenance
      // reminder already ask. Without them a bad address is retried every
      // fifteen minutes until the appointment - about forty-eight sends of a
      // hundred-a-day allowance for one broken booking.
      await patchCustomer({ unsubscribed_at: new Date().toISOString() });
      check("1c an unsubscribed customer removes it", !(await isDue()));
      await patchCustomer({ unsubscribed_at: null });

      await patchCustomer({ email_failed_at: new Date().toISOString(), email_failed_reason: "fixture" });
      check("1c a bounced address removes it", !(await isDue()));
      await patchCustomer({ email_failed_at: null, email_failed_reason: null });

      await patchBooking({ customer_email: null });
      check("1c no address removes it", !(await isDue()));
      await patchBooking({ customer_email: "reminder-fixture@example.com" });
      check("1c and all three cleared returns it", await isDue());

      // ── 1d · THE MARKER ──────────────────────────────────────────────────
      await patchBooking({ customer_reminder_sent_at: new Date().toISOString() });
      check("1d a stamped booking is not returned again", !(await isDue()));

      // ── 1e · AND THE SECOND REMINDER IS ORDERED AFTER THE FIRST ──────────
      // With the first marker set (above) and the second switch on, it is due.
      // Its RPC must ALSO respect the parent switch - its body was copied from
      // the first one and had never asked.
      await patchSettings({ customer_reminder_2_enabled: true, customer_reminder_2_lead_minutes: 480 });
      const second = async () => {
        const r = await rpc("get_bookings_due_for_second_reminder");
        return Array.isArray(r.body) && r.body.some((b) => b.id === bookingId);
      };
      check("1e the second reminder is due once the first has gone", await second(),
        "the fixture is 30 minutes out with an 8h second lead and the first marker set - it should be due");
      await patchSettings({ email_customer_reminder: false });
      check("1e the PARENT switch silences the second reminder too", !(await second()),
        "email_customer_reminder off must silence both, not just the first");
      await patchSettings({ email_customer_reminder: true });
      await patchCustomer({ email_failed_at: new Date().toISOString() });
      check("1e a bounced address silences the second reminder too", !(await second()));
      await patchCustomer({ email_failed_at: null });
      await patchSettings({ customer_reminder_2_enabled: false });

      // ── 1f · A PENDING REQUEST IS NOT A BOOKING ──────────────────────────
      // ROADMAP 2.12. Telling a customer "your appointment is tomorrow" about a
      // request nobody has accepted is the defect that migration prevented.
      await patchBooking({ customer_reminder_sent_at: null, status: "pending" });
      check("1f a pending request is never reminded", !(await isDue()));
      await patchBooking({ status: "cancelled" });
      check("1f a cancelled booking is never reminded", !(await isDue()));
      await patchBooking({ status: "confirmed" });
      check("1f and confirmed returns it", await isDue());

      // ── 1g · A JOB IN THE PAST ───────────────────────────────────────────
      const past = new Date(Date.now() - 3600_000);
      await patchBooking({ start_at: past.toISOString(), end_at: new Date(past.getTime() + 3600_000).toISOString() });
      check("1g a job that has already started is not reminded", !(await isDue()));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE MARKER IS NEVER WRITTEN FOR A SEND THAT DID NOT HAPPEN
// ═══════════════════════════════════════════════════════════════════════════
//
// **THE ROOT FAULT, AND IT WAS ONE WORD.** `sendTenantEmail` returns `false`
// and does NOT throw - its own header says *"best-effort by design: an email
// failure must never fail a booking"*, which is correct on the booking path and
// exactly wrong in a reminder sweep. Every caller in `send-owner-reminders`
// ignored the boolean, so a refused send fell through to `mark()` and the
// booking was stamped *reminded* for ever.
//
// **AND IT WAS INVISIBLE IN EVERY INSTRUMENT WE HAVE**: `results` said
// `sent: true`, the heartbeat summary counted it as sent, and the Plumbing tab
// drew it as sent.
//
// This section COUNTS the send call sites rather than matching one, because a
// check that finds the one it knows about passes while a new one is written the
// old way.
console.log("\n2. every send in the sweep reports a refusal");
{
  const src = readFileSync(new URL("../supabase/functions/send-owner-reminders/index.ts", import.meta.url), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  // `sendTenantEmail` is the one call that can silently fail. Every occurrence
  // of it in this file must be wrapped.
  const calls = [...code.matchAll(/await\s+sendTenantEmail\(/g)].length;
  const wrapped = [...code.matchAll(/mustSend\(\s*\n?\s*await\s+sendTenantEmail\(/g)].length;
  check("2a there are send call sites to check at all", calls >= 4, `found ${calls}`);
  check("2b every sendTenantEmail in the sweep is inside mustSend", calls === wrapped,
    `${calls} calls, ${wrapped} wrapped - an unwrapped one marks a failed send as delivered`);

  check("2c mustSend throws rather than returning", /function mustSend[\s\S]{0,200}?throw new Error/.test(code),
    "mustSend must throw, because throwing is what reaches the catch that skips the marker");

  // The shape that matters: the send comes before the mark, inside one try.
  for (const [kind, marker] of [
    ["customer_reminder", "customer_reminder_sent_at"],
    ["customer_reminder_2", "customer_reminder_2_sent_at"],
    ["owner_reminder", "owner_reminder_sent_at"],
  ]) {
    const at = code.indexOf(`mark(b.id, "${marker}")`);
    const before = at < 0 ? "" : code.slice(Math.max(0, at - 600), at);
    check(`2d the ${kind} marker is written after its send, not before`,
      at > 0 && /await send(Customer|Owner)Reminder\(/.test(before),
      `no send found in the 600 characters before the ${marker} write`);
  }

  // The maintenance block's comment claimed a throw that had never existed.
  check("2e the maintenance reminder no longer claims sendTenantEmail throws",
    !/sendTenantEmail\s*\n?\s*\/\/\s*throws|throws on a hard failure/.test(src),
    "the comment saying `sendTenantEmail throws on a hard failure` is false and was load-bearing");
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE TEMPLATE STILL SAYS WHAT A REMINDER HAS TO SAY
// ═══════════════════════════════════════════════════════════════════════════
//
// Not a rendering test - `scripts/render-emails.mjs` and `email-brand` already
// own that. This is the three facts a reminder is USELESS without, and the
// language switch, because a Spanish customer getting an English reminder is
// the same no-show.
console.log("\n3. the reminder carries the date, the time and a way to change it");
{
  const t = readFileSync(new URL("../supabase/functions/_shared/emailTemplates.ts", import.meta.url), "utf8");
  const from = t.indexOf("export function customerReminderEmail");
  // To the NEXT top-level declaration, not to a `}` at column zero: the first
  // version of this slice looked for "\n}\n", the file has CRLF line endings,
  // and the slice came back EMPTY - at which point all four regexes below
  // matched nothing and reported four failures about a template that was
  // perfectly fine. An empty subject is as dishonest as a green one.
  const next = t.indexOf("export function", from + 10);
  const body = from < 0 ? "" : t.slice(from, next > 0 ? next : t.length);
  check("3z the template function was actually found", from > 0 && body.length > 400,
    `slice length ${body.length} - every check below is measuring nothing`);
  check("3a it is rendered in the customer's language", /T\(b\.lang\)/.test(body));
  check("3b the date and the time are in the mark block", /markBlock\(brand, \[dateLong/.test(body));
  check("3c there is a way to change or cancel", /buttonBlock\(brand[\s\S]{0,120}b\.receiptUrl\)/.test(body));
  check("3d the second reminder is the same email, not a second template",
    /second \? "reminder_2" : "reminder"/.test(body),
    "two templates for one fact is how the product grows two voices");
}

// ── clean up, whatever happened above ──────────────────────────────────────
if (SB_URL && KEY) {
  if (bookingId) await rest(`bookings?id=eq.${bookingId}`, { method: "DELETE" });
  if (custId) await rest(`customers?id=eq.${custId}`, { method: "DELETE" });
  if (bizId && restoreSettings) {
    await rest(`business_settings?business_id=eq.${bizId}`, {
      method: "PATCH", body: JSON.stringify(restoreSettings),
    });
  }
  console.log("\n  (fixture booking, fixture customer and the settings were restored)");
}

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed > 0 ? 1 : 0);
