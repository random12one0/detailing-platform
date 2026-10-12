// THE FIVE QUESTIONS ON THE BACK OFFICE'S GROWTH TAB, AS DATA. ROADMAP 9.2,
// Andrew's ruling 2026-10-06: **keep the five questions, fix the three faults
// inside them, and do not build the stages.** `docs/9-2c-stages-proposal-2026-10-06.md`
// has the reasoning; this file is where the fixes live.
//
// IT WAS A CONSTANT IN THE OLD BACK-OFFICE SCREEN AND MOVED HERE FOR ONE REASON: a screen
// file cannot be imported by a Node test, and all three faults were of the same
// shape, a sentence on the screen that said something the code behind it had
// not worked out. A sentence nobody can run cannot be proved to have stopped
// doing that. The headlines (the counts and their plurals) stay in the screen;
// the questions, the notes beside the names and the advice are here.
//
// EACH LINE IS COUNTED ON ITS OWN, NOT AS A FUNNEL — and that is still the
// decision; the old Growth tab stated it in full beside its table. A detailer can be on two lines.
//
// A ROW IS `[key, ok, note, todo]`:
//   ok(r, ctx)    true when the detailer is FINE on this line; false puts them on it
//   note(r, ctx)  a few words beside the name, or null. Only ever something the
//                 program worked out for THAT detailer
//   todo          the advice under the line. A constant sentence, so it may only
//                 say what is true of every name on the line
//   noPhoneTodo   optional. The same advice worded without a phone call, used when
//                 ANY name on the line has no number on file (ROADMAP 9.12a: the
//                 advice is one sentence for the whole line, so it may say "ring"
//                 only when every name can be rung)
// `ctx` is `{ bookabilityOf, now }`: `bookabilityOf` stays in the screen, where
// `tests/admin-insight.test.mjs` § 10 pins what it is fed, and is handed in.

import { setupProgress } from "./setup.js";
import { QUIET_DAYS, SETUP_FLOOR, phoneOf } from "./attention.js";
import { daysSince } from "./adminInsight.js";

// A SUSPENDED ACCOUNT IS SWITCHED OFF, NOT QUIET, AND NOT "NEVER BOOKED". The
// Today tab's list has said so since the day it was written (`reasonsFor` in
// `attention.js`): reporting "no booking in 60 days" about an account we
// suspended ourselves is the list telling Andrew about his own decision. This
// card did not follow it, so a paused account would have been on two lines
// that Today deliberately leaves it off. It shows once, on the "cannot take a
// booking" line, as suspended.
const suspended = (r) => r?.status === "paused";

// HOW LONG AGO THEY SIGNED UP, from the row's own `created_at`, so the setup
// line says what is known instead of what is assumed: somebody who joined an
// hour ago is on it, and "stopped" is not a word that applies to them yet.
export function signedUpNote(r, now = new Date()) {
  const d = daysSince(r?.created_at, now);
  if (d === null || d < 0) return null;
  if (d === 0) return "signed up today";
  if (d === 1) return "signed up yesterday";
  return `signed up ${d} days ago`;
}

export const STUCK = [
  ["setup",
   (r) => setupProgress(r.setup_inputs).count >= SETUP_FLOOR,
   (r, { now }) => signedUpNote(r, now),
   // **THE OLD SENTENCE ENDED "every one of these signed up and then stopped",
   // AND NOTHING CHECKED EITHER HALF.** It is gone; the age is beside each name.
   `Fewer than ${SETUP_FLOOR} of the steps are done. Ring them and finish it on the phone.`,
   `Fewer than ${SETUP_FLOOR} of the steps are done. Contact them and finish it together.`],
  ["open",
   (r, { bookabilityOf }) => bookabilityOf(r).ok,
   // THE REASON THE PROGRAM ALREADY WORKS OUT FOR THIS ACCOUNT. `bookability()`
   // has returned `reasons` since it was written, "because 'not bookable' is
   // not an instruction, the missing piece is", and this line threw them away
   // in favour of a sentence naming all three possibilities.
   (r, { bookabilityOf }) => bookabilityOf(r).reasons.join(", ") || null,
   // The old advice also said "and neither of you finds out". That is true of a
   // page with nothing to sell and false of one we suspended, and suspended
   // accounts are on this line by design, so the clause is gone.
   "A customer who tries to book gets nowhere. What is missing is beside each name. This is the most expensive thing on the page."],
  // **THIS ROW'S ADVICE IS THE ONLY ONE WITH NO LEAD FACT, AND THAT IS A
  // DECISION RATHER THAN AN OVERSIGHT — ROADMAP 9.2(b), 2026-09-21. Please do
  // not helpfully put one back.** It used to open *"The page works and nobody
  // has used it"*, and **"The page works" was a claim this row never made**:
  // it tests `bookings_total` and nothing else, while the `open` row four
  // lines up is the one that actually evaluates bookability. On an account
  // that fails both — which is every account on this screen today — the two
  // rows contradicted each other in plain English.
  //
  // The obvious repair is *"Nobody has used their page"*, which keeps the
  // house fact-then-action shape. **It was rejected, and the reason is the
  // shape argument's own limit:** the other four rows lead with a fact the
  // headline does NOT carry, and this one would only restate the count two
  // lines above it — CLAUDE.md's never-defaults name that exactly, *copy that
  // explains what the label already said*, and the cost is that the row stops
  // being read. What is left says the only thing on this row a person cannot
  // already see.
  ["first",
   (r) => suspended(r) || (r.bookings_total ?? 0) > 0,
   () => null,
   "Ask how they are telling their own customers about their booking page."],
  // **A DETAILER WHO NEVER BOOKED IS NOT QUIET, AND THIS ROW SAID HE WAS —
  // caught by loading the screen and reading it, 2026-09-13.** With no
  // bookings `days_since_booking` is null, so the plain test made every new
  // signup "has not booked in 21 days" and told Andrew *"they were taking work
  // and stopped"* about somebody who had never started. The row above already
  // owns that person and says the true thing about them. **Two rows on one
  // screen contradicting each other about one detailer is worse than either
  // row being missing** — and `lib/attention.js` has kept these two facts
  // apart since the day it was written, for exactly this reason.
  ["quiet",
   (r) => suspended(r) || (r.bookings_total ?? 0) === 0 || (r.days_since_booking ?? 9999) < QUIET_DAYS,
   () => null,
   "They were taking work and stopped. Ring them before they decide to cancel.",
   "They were taking work and stopped. Contact them before they decide to cancel."],
  ["site",
   (r) => Boolean(r.site_url || r.domain),
   () => null,
   "That one is ours rather than theirs. Build it, or tell them when it is coming."],
];

/**
 * The lines with at least one detailer on them: `{ key, todo, failing }`, where
 * `failing` is `[{ name, note }]`. The headline is the screen's, because it
 * carries the plural and the screen owns its words.
 */
export function growthLines(live, ctx) {
  return STUCK.map(([key, ok, note, todo, noPhoneTodo]) => {
    const on = live.filter((r) => !ok(r, ctx));
    return {
      key,
      todo: noPhoneTodo && !on.every((r) => phoneOf(r)) ? noPhoneTodo : todo,
      failing: on.map((r) => ({ name: r.name, note: note(r, ctx) })),
    };
  }).filter((s) => s.failing.length > 0);
}
