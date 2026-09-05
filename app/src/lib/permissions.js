// The tick list, in one place — roadmap 2.13.
//
// The owner asked to invite someone, "give them a name, like a customizable
// name", and tick "what permissions they should have and what they
// shouldn't". So a membership is a NAME plus a list, and `owner` still means
// everything: it is what `protect_last_owner()` protects and what
// `is_business_owner()` answers, so it was left alone.
//
// EVERY ENTRY HERE IS A GROUP OF DATABASE POLICIES, NOT A SCREEN. The list
// was derived from what the schema already gated on `is_business_owner()`
// rather than from the tabs, which is why hiding a tab is never the
// enforcement — `20260904000000_custom_roles.sql` is. This file only stops
// the dashboard offering what the database would refuse.
//
// No React in here on purpose, the same reason `setup.js` has none: the
// words below are printed on the Team screen AND in the invite email's
// sentence, and the two must not drift.

export const PERMISSIONS = [
  {
    key: "money",
    name: "Money",
    // What it opens, in the detailer's terms — never a restatement of the
    // label (CLAUDE.md, the owner's copy rule).
    help: "The Money tab, expenses, and what each customer has spent.",
    // `name` is a SWITCH LABEL and `noun` is the same permission inside a
    // sentence, which are two different jobs: "Answer requests" is right on a
    // control and produces "customers, and answer requests, settings" in a
    // list. Two words, one for each place, rather than one word doing neither
    // job well.
    noun: "the money",
  },
  {
    key: "requests",
    name: "Answer requests",
    help: "Accept, decline or quote a booking someone has asked for.",
    noun: "booking requests",
  },
  {
    key: "settings",
    name: "Settings",
    // "HOW YOU GET PAID" JOINED THE LIST IN ROADMAP 2.20 STAGE 1, AND THE
    // SENTENCE HAD TO MOVE WITH IT. `business_settings` writes ride this tick,
    // so the moment the payment handles landed on that table this tick also
    // granted "change where your customers are told to send money" — while its
    // own words still said prices and hours. That is the exact shape roadmap
    // 2.13 already fixed one screen over, where the tick said "Prices, hours…"
    // and `services.price` was writable by any member: **the tick's words are
    // the specification, and a permission that grants more than its sentence
    // says is a permission nobody has actually agreed to.** Named with the
    // screen's own words so a detailer can connect the two.
    help: "Prices, hours, booking rules, branding, how you get paid, and the business's own details.",
    noun: "the settings",
  },
  {
    key: "marketing",
    name: "Promotions",
    help: "Promo codes and campaign links.",
    noun: "promotions",
  },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// An owner has everything, always — the same fold `has_business_permission()`
// does in SQL and `can()` does in the edge functions, so no caller can write
// a check that forgets owners.
export function can(role, permissions, key) {
  return role === "owner" || (permissions ?? []).includes(key);
}

// What to call this person. An owner is an owner; anyone else is whatever
// their business decided to call them, and "Staff" only when nobody said.
export function roleName(role, label) {
  if (role === "owner") return "Owner";
  return (label || "").trim() || "Staff";
}

// The one-line summary under a member's name. Listing the ticks is the only
// honest answer — "Staff. Bookings and calendar only." stopped being true the
// moment the list became theirs to set.
//
// THE FIRST THREE ARE NOT A TICK AND ARE NOT DECORATION EITHER. The diary is
// what a membership with nothing ticked still has (`bookings`, `customers` and
// the booking children are member-level, deliberately), so a sentence that
// listed only the ticks would read "Detailer." and say nothing about the job
// this person actually does.
export function permissionSummary(role, permissions) {
  if (role === "owner") return "Everything.";
  const parts = ["bookings", "the calendar", "customers"]
    .concat(PERMISSIONS.filter((p) => (permissions ?? []).includes(p.key)).map((p) => p.noun));
  const last = parts.pop();
  return `${parts.join(", ")} and ${last}.`.replace(/^./, (c) => c.toUpperCase());
}
