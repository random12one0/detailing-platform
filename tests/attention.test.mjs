// Who the back office says needs a look.
//
// `docs/platform-admin-audit-2026-09-06.md` Q3. **This decides what the owner
// is SHOWN**, which is a different kind of risk from a screen that draws the
// wrong colour: a threshold that is too high means a detailer whose payment
// failed never appears, and nothing anywhere says so. A list like this fails
// in exactly two ways and both are silent — it misses the thing that mattered,
// or it cries wolf until nobody reads it.
//
// Run: node tests/attention.test.mjs   (credential-free)

import { needsALook, reasonsFor, QUIET_DAYS, SETUP_FLOOR, MAX_ROWS } from "../app/src/lib/attention.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

// A tenant with nothing wrong with it: paying, booking, set up, has a site.
const FINE = {
  id: "1", name: "Fine", status: "active",
  subscription: { status: "active", cancel_at_period_end: false },
  bookings_total: 40, days_since_booking: 2,
  site_url: "https://example.com", domain: null,
  setup_inputs: {
    counts: { services: 3, addOns: 1, promos: 1, hoursOpen: true },
    branding: { primary_color: "#38E08B" },
    settings: { setup: { done: ["hours", "contact", "where"] } },
    business: { contact_phone: "555", contact_email: "a@b.c" },
  },
};
const one = (over) => ({ ...FINE, ...over });

// ─── 1. The quiet case: nothing wrong means nothing said ──────────────────
// THE MOST IMPORTANT CHECK IN THE FILE. A list that reports a healthy tenant
// is a list that gets ignored, and an ignored list is worse than none —
// because its emptiness is then read as "all fine" by nobody.
console.log("\n1. a healthy tenant is not on the list");
{
  check("1a · nothing is said about a paying, booking, set-up business",
    reasonsFor(FINE).length === 0, reasonsFor(FINE).join(", "));
  check("1b · and it does not appear at all", needsALook([FINE]).length === 0);
  check("1c · an empty list is empty, not a crash", needsALook([]).length === 0);
  check("1d · and so is no list at all", needsALook(null).length === 0);
}

// ─── 2. Money, which is the reason with somebody else's deadline ──────────
console.log("\n2. money");
{
  check("2a · a failed payment is named",
    reasonsFor(one({ subscription: { status: "past_due" } })).some((w) => /payment failed/.test(w)));
  check("2b · so is a subscription set to end",
    reasonsFor(one({ subscription: { status: "active", cancel_at_period_end: true } }))
      .some((w) => /cancelling/.test(w)));
  check("2c · a healthy subscription says nothing",
    !reasonsFor(FINE).some((w) => /payment|cancelling/.test(w)));
}

// ─── 3. Quiet vs never — two different conversations ──────────────────────
console.log("\n3. gone quiet, and never started");
{
  const never = reasonsFor(one({ bookings_total: 0, days_since_booking: null }));
  const quiet = reasonsFor(one({ days_since_booking: 40 }));
  check("3a · never booked says so in those words",
    never.some((w) => /never taken a booking/.test(w)), never.join(", "));
  check("3b · gone quiet names the number of days",
    quiet.some((w) => /no booking in 40 days/.test(w)), quiet.join(", "));

  // THEY MUST NOT BOTH FIRE. A detailer who has never booked has also not
  // booked recently, and saying both is the same fact twice — the thing this
  // repo's copy rule refuses everywhere else.
  check("3c · never-booked does not ALSO say gone quiet",
    !never.some((w) => /no booking in/.test(w)), never.join(", "));

  // THE THRESHOLD, from both sides. Too low and the list cries wolf.
  check("3d · exactly at the threshold counts",
    reasonsFor(one({ days_since_booking: QUIET_DAYS })).some((w) => /no booking in/.test(w)));
  check("3e · one day under does not",
    !reasonsFor(one({ days_since_booking: QUIET_DAYS - 1 })).some((w) => /no booking in/.test(w)));
  check("3f · and the threshold is not so low it nags a working detailer",
    QUIET_DAYS >= 14, `${QUIET_DAYS} days would report an ordinary fortnight`);

  // **A SUSPENDED BUSINESS IS NOT QUIET, IT IS SWITCHED OFF.** Reporting "no
  // booking in 60 days" about an account we suspended ourselves is the list
  // telling him about his own decision.
  const paused = reasonsFor(one({ status: "paused", bookings_total: 0, days_since_booking: 90 }));
  check("3g · a suspended business is not reported as quiet",
    !paused.some((w) => /no booking|never taken/.test(w)), paused.join(", "));
}

// ─── 4. Setup, and not nagging forever ────────────────────────────────────
console.log("\n4. setup");
{
  const bare = one({
    setup_inputs: {
      counts: { services: 0, addOns: 0, promos: 0, hoursOpen: true },
      branding: {}, settings: {}, business: {},
    },
  });
  check("4a · a business that stopped early is named, with the number",
    reasonsFor(bare).some((w) => /setup stopped at \d+ of 7/.test(w)), reasonsFor(bare).join(", "));
  check("4b · a finished-enough business is not nagged",
    !reasonsFor(FINE).some((w) => /setup stopped/.test(w)));
  // NOT "less than seven": `where` is a step many detailers never press, and
  // nagging a working business forever is how the whole list gets ignored.
  check("4c · the floor is not the full seven", SETUP_FLOOR < 7, `${SETUP_FLOOR}`);
}

// ─── 5. A site, by either route ───────────────────────────────────────────
console.log("\n5. no website");
{
  check("5a · no site and no domain is named",
    reasonsFor(one({ site_url: null, domain: null })).some((w) => /no website/.test(w)));
  check("5b · a domain alone is enough",
    !reasonsFor(one({ site_url: null, domain: "x.com" })).some((w) => /no website/.test(w)));
  check("5c · and a site alone is enough",
    !reasonsFor(one({ site_url: "https://x.com", domain: null })).some((w) => /no website/.test(w)));
}

// ─── 6. The order, and the cap ────────────────────────────────────────────
console.log("\n6. worst first, and not everything");
{
  const bad = one({
    id: "bad", subscription: { status: "past_due" },
    bookings_total: 0, days_since_booking: null, site_url: null, domain: null,
  });
  const mild = one({ id: "mild", site_url: null, domain: null });
  const list = needsALook([mild, bad]);
  check("6a · the worst is first",
    list[0].id === "bad", list.map((r) => `${r.id}:${r.why.length}`).join(", "));
  check("6b · and each row carries its own reasons", list.every((r) => r.why.length > 0));

  const many = Array.from({ length: 20 }, (_, i) =>
    one({ id: `q${i}`, site_url: null, domain: null }));
  check("6c · the list is capped", needsALook(many).length === MAX_ROWS, `${needsALook(many).length}`);
  check("6d · and the cap is a morning's work, not an inventory",
    MAX_ROWS <= 10, `${MAX_ROWS}`);
}

// ─── 7. Missing fields must not invent a reason ───────────────────────────
// The server can add or drop a field; a row that arrives half-populated must
// not produce "no booking in undefined days" on the owner's screen.
console.log("\n7. a half-populated row");
{
  const why = reasonsFor({});
  check("7a · an empty row does not throw", Array.isArray(why));
  check("7b · and never prints undefined or NaN",
    !why.some((w) => /undefined|NaN/.test(w)), why.join(", "));
  check("7c · a missing days_since_booking is not treated as 0 days",
    !reasonsFor({ bookings_total: 5 }).some((w) => /no booking in/.test(w)));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
