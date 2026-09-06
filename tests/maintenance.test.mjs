// ROADMAP 2.23 — a warranty that VOIDS, not a cadence.
//
// **THE ONE NUMBER THIS FEATURE EXISTS TO PROTECT IS SOMEBODY ELSE'S $1,500.**
// Ceramic Pro requires an annual inspection by a certified installer; System X
// requires one professional service a year within about 30 days of the install
// anniversary, and **missing that window voids the warranty permanently.** A
// reminder that fires once, or a screen that says *due in 3 days* about
// something the email has already called missed, is the whole feature failing.
//
// SO THE ARITHMETIC IS TESTED AND THE TWO COPIES ARE PINNED TO EACH OTHER.
// `app/src/lib/maintenance.js` is what the screen runs and
// `supabase/functions/_shared/maintenance.ts` is what the sweep runs — a
// second copy for the wall that already forced `_shared/brandColor.js`, since
// a Deno bundle cannot import out of `app/src`. This file runs BOTH on the
// same deadlines and fails on one differing answer.
//
// Run: node tests/maintenance.test.mjs   (credential-free)

import { readFileSync } from "node:fs";
import * as app from "../app/src/lib/maintenance.js";
import * as fn from "../supabase/functions/_shared/maintenance.ts";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};
const strip = (t) => t
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

const TODAY = new Date("2026-09-06T12:00:00Z");
const day = (n) => new Date(TODAY.getTime() + n * 86_400_000).toISOString().slice(0, 10);
const D = (over) => ({ due_on: day(over.days ?? 30), repeat_months: 12, reminded_stage: 0, ...over });

// ─── 1. The two copies agree ──────────────────────────────────────────────
// A drift here means the screen and the email disagree about somebody's
// warranty, and the customer believes whichever reached them first.
console.log("1. the screen and the sweep agree");
{
  check("the stages are the same list", JSON.stringify(app.STAGES) === JSON.stringify(fn.STAGES),
    `${app.STAGES} vs ${fn.STAGES}`);
  const cases = [
    D({ days: 90 }), D({ days: 60 }), D({ days: 31 }), D({ days: 30 }), D({ days: 15 }),
    D({ days: 14 }), D({ days: 2 }), D({ days: 1 }), D({ days: 0 }), D({ days: -1 }),
    D({ days: -400 }), D({ days: 10, reminded_stage: 3 }), D({ days: 10, reminded_stage: 4 }),
    D({ days: 20, last_done_on: day(-5) }), D({ days: 20, last_done_on: day(-400) }),
    D({ days: 20, repeat_months: null, last_done_on: day(-400) }),
    D({ days: 5, cancelled_at: "2026-09-01T00:00:00Z" }),
  ];
  const bad = cases.filter((c) =>
    app.stateOf(c, TODAY) !== fn.stateOf(c, TODAY) || app.stageDue(c, TODAY) !== fn.stageDue(c, TODAY));
  check("every state and stage matches, on seventeen deadlines", bad.length === 0,
    bad.map((c) => `${c.due_on}: ${app.stateOf(c, TODAY)}/${app.stageDue(c, TODAY)} vs ${fn.stateOf(c, TODAY)}/${fn.stageDue(c, TODAY)}`).join(" | "));
}

// ─── 2. It is a DEADLINE, not a cadence ───────────────────────────────────
console.log("\n2. a date with a consequence");
{
  check("something in the future is waiting", app.stateOf(D({ days: 90 }), TODAY) === "waiting");
  check("inside the first window it is due", app.stateOf(D({ days: 60 }), TODAY) === "due");
  // NOT "OVERDUE". A warranty does not become overdue, it becomes gone — and
  // the word on the screen is the word a detailer will use on the phone.
  check("past the date it is MISSED", app.stateOf(D({ days: -1 }), TODAY) === "missed");
  check("and the row says so in days", app.saySoon(D({ days: -3 }), TODAY) === "Missed 3 days ago",
    app.saySoon(D({ days: -3 }), TODAY));
  check("today is today, not '0 days'", app.saySoon(D({ days: 0 }), TODAY) === "Due today");
  check("tomorrow is tomorrow", app.saySoon(D({ days: 1 }), TODAY) === "Due tomorrow");
  check("a cancelled one is out of it altogether",
    app.stateOf(D({ days: -30, cancelled_at: "x" }), TODAY) === "cancelled");
}

// ─── 3. Met is DERIVED, never stored ──────────────────────────────────────
// A stored status goes wrong the moment somebody backdates a service — and
// backdating is the ordinary case here, because the detailer records the
// inspection after doing it.
console.log("\n3. met is derived");
{
  check("a service inside the run-up meets it",
    app.stateOf(D({ days: 20, last_done_on: day(-5) }), TODAY) === "met");
  check("one from the PREVIOUS cycle does not",
    app.stateOf(D({ days: 20, last_done_on: day(-400) }), TODAY) === "due",
    "a year-old inspection is what the new deadline is asking to replace");
  check("a one-off is met by anything on or before the date",
    app.stateOf(D({ days: 20, repeat_months: null, last_done_on: day(-400) }), TODAY) === "met");
  check("and a service after the date meets it too",
    app.isMet(D({ days: -5, last_done_on: day(-1) }), TODAY),
    "done late is still done, and the row must stop shouting");
  // The proof is the other half of a warranty claim, so a met row says WHEN.
  check("a met row shows the date it was done",
    app.saySoon(D({ days: 20, last_done_on: day(-5) }), TODAY) === `Done ${day(-5)}`);
}

// ─── 4. The escalation ────────────────────────────────────────────────────
console.log("\n4. it fires more than once, and never twice");
{
  check("nothing fires outside the first window", app.stageDue(D({ days: 90 }), TODAY) === null);
  check("60 days out fires stage 0", app.stageDue(D({ days: 60 }), TODAY) === 0);
  check("31 days out is still stage 0", app.stageDue(D({ days: 31, reminded_stage: 1 }), TODAY) === null);
  check("30 days out fires stage 1", app.stageDue(D({ days: 30, reminded_stage: 1 }), TODAY) === 1);
  check("14 days out fires stage 2", app.stageDue(D({ days: 14, reminded_stage: 2 }), TODAY) === 2);
  check("the day before fires stage 3", app.stageDue(D({ days: 1, reminded_stage: 3 }), TODAY) === 3);
  // A SWEEP RUNS EVERY FIFTEEN MINUTES. Without this the customer gets
  // ninety-six emails a day.
  check("a stage already sent never fires again",
    app.stageDue(D({ days: 30, reminded_stage: 2 }), TODAY) === null);
  // **A CUSTOMER'S FIRST WORD FROM US ABOUT THEIR WARRANTY MUST NEVER BE
  // THREE EMAILS AT ONCE.** A deadline added eight days out is at stage 2, not
  // stage 0 with two to catch up on.
  check("a deadline added inside the window starts where the DATE is",
    app.stageDue(D({ days: 8, reminded_stage: 0 }), TODAY) === 2,
    "otherwise the 60- and 30-day letters both arrive on the way past");
  check("nothing fires once it is missed", app.stageDue(D({ days: -1 }), TODAY) === null,
    "the warranty is gone; another email is only cruelty");
  check("nothing fires once it is met",
    app.stageDue(D({ days: 5, last_done_on: day(-2) }), TODAY) === null);
  check("and nothing fires on a cancelled one",
    app.stageDue(D({ days: 5, cancelled_at: "x" }), TODAY) === null);
}

// ─── 5. The next one ──────────────────────────────────────────────────────
console.log("\n5. rolling it forward");
{
  check("twelve months later, same day", app.nextDue({ repeat_months: 12 }, "2026-10-12") === "2027-10-12");
  check("six months later", app.nextDue({ repeat_months: 6 }, "2026-10-12") === "2027-04-12");
  // POSTGRES'S OWN MONTH CLAMP, for the same reason `lib/plans.js` matches it:
  // a date that disagrees with the database is a deadline that moves when
  // somebody edits it.
  check("31 January plus one month is 28 February", app.nextDue({ repeat_months: 1 }, "2027-01-31") === "2027-02-28");
  check("and in a leap year, the 29th", app.nextDue({ repeat_months: 1 }, "2028-01-31") === "2028-02-29");
  check("a one-off never comes round again", app.nextDue({ repeat_months: null }, "2026-10-12") === null);
}

// ─── 6. What the product refuses to invent ────────────────────────────────
console.log("\n6. the detailer's own words");
{
  const screen = strip(readFileSync("app/src/screens/more/Maintenance.jsx", "utf8"));
  const email = strip(readFileSync("supabase/functions/_shared/emailTemplates.ts", "utf8"));
  const sweep = strip(readFileSync("supabase/functions/send-owner-reminders/index.ts", "utf8"));
  const migration = readFileSync("supabase/migrations/20260906008000_maintenance_deadlines.sql", "utf8");

  // THE CUSTOMISABLE PART HE ASKED FOR. A dropdown of coating brands would be
  // this product deciding which manufacturers exist.
  check("the label is typed, never picked from a list we wrote",
    /placeholder="e\.g\. Ceramic Pro annual inspection"/.test(screen)
      && !/<option[^>]*>Ceramic Pro/.test(screen));
  // A warranty is a contract between the customer and a manufacturer, and a
  // sentence we invent about what it covers is one we cannot stand behind.
  check("the email adds nothing to what the detailer typed",
    !/warranty will be void|you will lose|covers/i.test(email.slice(email.indexOf("maintenanceDueEmail"))));

  // NOT SMUGGLED INTO THE CADENCE FIELDS — considered and rejected in the
  // research, and roadmap 2.14 shipped without it on purpose.
  check("it is its own table, not a plan",
    /create table if not exists public\.maintenance_deadlines/.test(migration)
      && !/plan_members|plans\b/.test(migration.replace(/^--.*$/gm, "")));
  // Open, met and missed are all derivable; only "the detailer says it no
  // longer applies" is not.
  check("there is no stored status", !/\bstatus\b/.test(migration.replace(/^--.*$/gm, "")),
    "a stored status is a second answer that goes wrong the moment a service is backdated");

  // THE SAME SWITCH THAT SILENCES EVERY OTHER CUSTOMER REMINDER. A product
  // that decides an email is too important to be switched off has stopped
  // being theirs.
  check("a detailer who turned customer email off gets silence here too",
    /if \(!settings\.email_customer_reminder\) continue;/.test(sweep));
  // The same three ways to be unreachable the Clients count and send-campaign
  // already ask about (roadmap 2.20). A fourth opinion is how they drift.
  check("and the three ways to be unreachable are all asked",
    /!customer\?\.email \|\| customer\.unsubscribed_at \|\| customer\.email_failed_at/.test(sweep));
  // A bounced relay must not silently spend the stage — that is a warranty
  // lost because one email failed at four in the morning.
  // SCOPED TO THE MAINTENANCE BLOCK. `sendTenantEmail` appears six times
  // earlier in this file for the other reminders, so comparing whole-file
  // positions compared the stamp against a send in a different loop — it
  // passed with the two swapped. Found by baselining, like the last three.
  // AND THE SLICE STARTS AT THE LOOP, NOT AT THE TEMPLATE NAME — the first
  // `maintenanceDueEmail` in the file is the IMPORT at the top, so slicing
  // there is slicing the whole file and the first `sendTenantEmail` in it
  // belongs to a different reminder. **Third time this exact shape has been
  // caught tonight**, and every time by baselining rather than by reading.
  const block = sweep.slice(sweep.indexOf("const stage = stageDue(d);"));
  check("the stage is stamped only after a successful send",
    block.indexOf("reminded_stage: stage + 1") > block.indexOf("await sendTenantEmail"),
    "a bounced relay must not spend the stage — that is a warranty lost to one failed email");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
