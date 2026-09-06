// ROADMAP 2.21 — the small spam filter, and the reasons it is shaped this way.
//
// **SINCE ROADMAP 2.12 A REQUEST HOLDS THE SLOT.** `create-booking` is public
// by design and had no rate limit, no captcha and no honeypot, so filling a
// detailer's entire week cost a script nothing — and every held slot is a real
// customer turned away. That is what this item is for; the other three
// endpoints are volume problems rather than disclosure ones.
//
// THE BEHAVIOUR WAS PROVEN AGAINST THE DEPLOYED FUNCTIONS (twelve tries from
// one phone: `200 409 409 409 409 409 409 409 409 409 429 429`; a filled
// honeypot answering 200 with no row written). **What this file holds is the
// half a live probe cannot see** — that a member is exempt, that the check
// runs before anything is written, that the throttled answer on `plan-link` is
// byte-identical to its other refusals, and above all that `stripe-webhook`
// never gains a per-caller rule.
//
// Run: node tests/spam-filter.test.mjs   (credential-free)

import { readFileSync } from "node:fs";
import { looksAutomated, LIMITS } from "../supabase/functions/_shared/rateLimit.ts";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};
const strip = (t) => t
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
const read = (f) => readFileSync(f, "utf8");
// The import line mentions `withinLimits` too, and counting CALLS is the
// whole point of three checks below — the first version counted the import
// as a second call and failed on files that were correct.
const calls = (src) => (src.replace(/^import .*$/gm, "").match(/withinLimits\(/g) ?? []).length;

const booking = strip(read("supabase/functions/create-booking/index.ts"));
const planLink = strip(read("supabase/functions/plan-link/index.ts"));
const unsub = strip(read("supabase/functions/unsubscribe/index.ts"));
const hook = strip(read("supabase/functions/stripe-webhook/index.ts"));
const shared = strip(read("supabase/functions/_shared/rateLimit.ts"));
const migration = read("supabase/migrations/20260906007000_rate_limits.sql");
const core = strip(read("app/src/book/core.js"));
const step = strip(read("app/src/book/steps/StepDetails.jsx"));

// ─── 1. The honeypot ──────────────────────────────────────────────────────
console.log("1. the honeypot");
{
  check("a filled field looks automated", looksAutomated({ website: "http://spam.example" }));
  check("an empty one does not", !looksAutomated({ website: "" }) && !looksAutomated({ website: "   " }));
  check("a missing one does not", !looksAutomated({}),
    "a tenant site that leaves the field out must not have every booking dropped");

  // IT IS IN THE CORE, so a tenant site that builds its own form gets it for
  // free by using this payload. A spam filter a bespoke form can forget is a
  // spam filter one tenant does not have.
  check("the core's payload carries it", /website: form\.website \|\| ""/.test(core));
  check("and the form has a resting value for it", /website: "",/.test(core));

  // HIDDEN THE WAY A SCREEN READER ALSO UNDERSTANDS. A field parked
  // off-screen is one an assistive-technology user CAN reach and be confused
  // by — and refusing a real customer's booking for using a screen reader
  // would be far worse than the problem this prevents.
  check("the field is hidden from everybody, not just from eyes",
    /name="website"/.test(step) && /aria-hidden="true"/.test(step)
      && /tabIndex=\{-1\}/.test(step) && /\bhidden\b/.test(step),
    "off-screen positioning leaves it reachable by a screen reader");
  // A browser that helpfully fills a field called "website" from a saved
  // profile turns a real customer into a dropped booking.
  check("and the browser is told not to fill it", /autoComplete="off"/.test(step));

  // A REFUSAL A SCRIPT CAN SEE IS A REFUSAL IT CAN TUNE AGAINST.
  check("a filled honeypot answers success and writes nothing",
    /looksAutomated\(body\)[\s\S]{0,220}return json\(\{ success: true, booking: null \}\)/.test(booking));
}

// ─── 2. Where the check happens ───────────────────────────────────────────
console.log("\n2. before anything is written");
{
  // "A refusal must not leave a half-written row" — this item's own
  // instruction, and the exclusion constraint makes a half-written booking an
  // occupied slot nobody owns.
  // THE IMPORT LINE IS AT THE TOP OF THE FILE, so `indexOf("withinLimits")`
  // is always the import and both of these passed with the whole block moved
  // to the END of the function. **Found by baselining, not by reading** — the
  // check looked exactly right. Imports are dropped before the positions are
  // compared.
  const flow = booking.replace(/^import .*$/gm, "");
  const at = (needle) => flow.indexOf(needle);
  // TWO CHECKS IN TWO PLACES. The ceiling counts EVERY call and is at the
  // top; the booking limits are at the last moment before a slot is taken,
  // because **the threat is holding SLOTS and only a created booking holds
  // one.** Counting refusals looked stricter and was wrong twice over: a
  // script posting rubbish holds nothing, and `booking-engine` — which
  // deliberately exercises a dozen refusals — spent the whole budget on
  // bookings that were never made and then reported a 429 as a broken engine.
  check("the ceiling is at the top, before any work",
    at("publicCeiling") > -1 && at("publicCeiling") < at("await validateSlot"));
  check("and the booking limits are at the last moment",
    at("LIMITS.bookingPerIp") > at("await validateSlot"),
    "counting a refusal punishes a caller for a slot they never took");
  check("and before the insert",
    at("withinLimits(") > -1 && at("withinLimits(") < at('.from("bookings")'),
    `${at("withinLimits(")} vs ${at('.from("bookings")')}`);

  // A DETAILER TYPING IN THE MORNING'S PHONE BOOKINGS is the one caller who
  // legitimately looks like a script, and they are already verified against
  // `business_users` for THIS business.
  // BOTH BLOCKS, NAMED SEPARATELY. Matching "`!member` … somewhere later a
  // `withinLimits`" passed with the exemption stripped off the SECOND one,
  // because the first block still satisfied it — found by baselining, and it
  // is the same shape as the ordering check two lines up.
  check("a member is exempt from the ceiling",
    /if \(!member\) \{[\s\S]{0,700}publicCeiling/.test(booking),
    "the one caller who legitimately looks like a script");
  check("and from the booking limits",
    /if \(!member && !await withinLimits\(/.test(booking),
    "a detailer typing in the morning's phone bookings is not an attack");

  check("it is keyed on the phone and the address",
    /bucket: "booking:ip"[\s\S]{0,200}bucket: "booking:phone"/.test(booking));
  // Digits only, so "(555) 000-1111" and "5550001111" are one caller.
  check("and the phone is normalised to digits", /customer_phone[^)]*\)\.replace\(\/\\D\/g, ""\)/.test(booking));
  check("the refusal is a 429 with a sentence a person could act on",
    /429\)/.test(booking) && /Give it a few minutes/.test(booking));
}

// ─── 3. The three that are volume problems, not disclosure ones ───────────
console.log("\n3. the other three");
{
  // plan-link ANSWERS IDENTICALLY EITHER WAY BY DESIGN. A different answer
  // when throttled would tell a caller their address was worth throttling.
  check("plan-link's throttled answer is its ordinary one",
    /if \(!allowed\) return ok;/.test(planLink) && !/429/.test(planLink),
    "a 429 here leaks that the address was worth rate-limiting");
  check("and only the action that SENDS is throttled",
    calls(planLink) === 1,
    "the other two actions are keyed on an unguessable UUID and need nothing");

  check("unsubscribe gets the blunt ceiling and nothing designed for it",
    /bucket: "public:ip"[\s\S]{0,80}publicCeiling/.test(unsub)
      && calls(unsub) === 1);

  // THE ONE THING THAT MUST NOT BE DONE. Every legitimate event arrives from
  // Stripe's address range IN BURSTS — a subscription cycle is four or five
  // events in a second — and throttling those means a payment that succeeded
  // is never recorded, which presents as a paying detailer's page going dark.
  check("stripe-webhook has the ceiling",
    /bucket: "public:ip"[\s\S]{0,80}publicCeiling/.test(hook));
  check("and NOTHING keyed on anything Stripe controls",
    !/bucket: "(?!public:ip)/.test(hook)
      && !/event\.[a-z_]+[\s\S]{0,60}withinLimits/.test(hook)
      && calls(hook) === 1,
    "a per-caller rule here turns a burst of real events into a page going offline");
  check("the ceiling is far above any burst Stripe produces", LIMITS.publicCeiling.limit >= 300);
}

// ─── 4. The counter ───────────────────────────────────────────────────────
console.log("\n4. the counting");
{
  // CHECK-THEN-INCREMENT IS A RACE, and on the one endpoint somebody is
  // deliberately hammering it is the race that will be lost.
  check("the decision is made by the write itself",
    /on conflict \(bucket, key, window_start\)[\s\S]{0,120}returning hits into v_hits/.test(migration),
    "read-then-write lets two requests both spend the last slot");
  check("a refused attempt is counted too",
    /return v_hits <= p_limit;/.test(migration),
    "otherwise a loop over the limit costs the attacker nothing to keep running");
  // Nothing to count against is not the same as being over the limit.
  check("a missing key is allowed rather than refused",
    /if p_key is null or btrim\(p_key\) = ''[\s\S]{0,900}return true;/.test(migration),
    "a missing forwarded-for header must not lock out a real customer");
  // The busier the abuse, the more expensive a log-and-count would be.
  check("old rows are cleaned up on the way past, per key",
    /delete from public\.rate_hits[\s\S]{0,140}key = btrim\(p_key\)/.test(migration),
    "and only this caller's, so the cost is bounded by their own history");

  check("the table is unreachable from a browser",
    /alter table public\.rate_hits force  ?row level security/.test(migration)
      && !/create policy[^;]*rate_hits/.test(migration));
  check("and the function is service-role only",
    /revoke all on function public\.rate_take\(text, text, integer, integer\) from public, anon, authenticated/.test(migration));

  // IT FAILS OPEN. A throttle that refuses real customers when the database
  // hiccups has become the outage it was meant to prevent.
  check("a broken counter lets the booking through",
    /catch \(e\) \{[\s\S]{0,120}console\.error\("rate_take threw"/.test(shared)
      && /return true;\n\}/.test(shared.replace(/\r\n/g, "\n")),
    "everything that must never fail open lives somewhere else");
}

// ─── 5. The numbers ───────────────────────────────────────────────────────
console.log("\n5. the numbers a real customer never reaches");
{
  // A family booking two cars back to back is ordinary; the limits have to be
  // above every real behaviour anybody could name.
  check("a household can book more than twice from one phone", LIMITS.bookingPerPhone.limit >= 5);
  check("a shop tablet can take a morning's walk-ins", LIMITS.bookingPerIp.limit >= 20);
  check("asking twice for a plan link that went to spam is fine", LIMITS.planLinkPerEmail.limit >= 3);
  // The fixed window lets a caller burst across a boundary and get up to twice
  // the limit — assumed in the numbers rather than papered over.
  check("every window is an hour, so the doubling is bounded",
    Object.values(LIMITS).every((l) => l.windowSeconds === 3600));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
