// How many of the seven setup steps are done.
//
// Roadmap 2.11 step 6, stage 7. This number is printed in TWO places that
// must never disagree — the progress rule across the top of the setup form
// and the "Finish setting up · N of 7 done" row on Business — and component
// inventory §1b's whole ruling is about keeping them equal. It also decides
// whether an established detailer is nagged forever by a row about a thing
// they finished months ago.
//
// THE DEFECT THIS FILE EXISTS FOR, baselined below as test 2: a purely
// STORED count would open Business on a fully configured business — the
// owner's own live one — and tell it "0 of 7 done", because that business
// predates the form and has never pressed Continue on anything. Five of the
// seven steps are facts the database already holds, so completion is derived
// where it can be and stored only where it cannot.
//
//   node tests/setup-progress.test.mjs
//
// Credential-free, no browser, no dev server.

import { setupProgress, STEPS } from "../app/src/lib/setup.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? "\n        " + detail : ""}`); }
};

// A business with nothing: what `create-business` would make if it set no
// defaults at all.
const EMPTY = { business: {}, branding: {}, settings: {}, counts: { services: 0, addOns: 0, promos: 0, hoursOpen: false } };
// A business set up entirely through the settings screens, which is every
// business that existed before this form did.
const ESTABLISHED = {
  business: { contact_phone: "555-0100", contact_email: "a@b.c" },
  branding: { primary_color: "#38E08B" },
  settings: { setup: { done: [], seen: true, dismissed: false } },
  counts: { services: 6, addOns: 3, promos: 2, hoursOpen: true },
};

console.log("\ntest 1: the seven steps are seven, and each has a key, a question and a name");
{
  check("seven steps", STEPS.length === 7, `saw ${STEPS.length}`);
  const bad = STEPS.filter(([k, q, n]) => !k || !q || !n);
  check("every step is complete", bad.length === 0, bad.map((s) => s[0]).join(", "));
  const keys = new Set(STEPS.map(([k]) => k));
  check("keys are unique", keys.size === 7);
  // The order is screen designs §13a's: what you sell, when you work, who you
  // are. A detailer who quits after two steps still has a bookable page, and
  // that is only true while services come first.
  check("the order is what-you-sell first",
    STEPS.map(([k]) => k).join(",") === "services,addons,promos,hours,where,contact,colour",
    STEPS.map(([k]) => k).join(","));
}

console.log("\ntest 2: an established business is not told it has done nothing");
{
  // THE BASELINE. Delete the derivation in setupProgress and this is the test
  // that goes red — it reports 0, which is what a stored-only count does to
  // every business that predates the form.
  const p = setupProgress(ESTABLISHED);
  check("six of seven are done with nothing stored", p.count === 6, `saw ${p.count}`);
  check("the one that is not is `where`", !p.done.has("where") && p.done.size === 6,
    [...p.done].join(", "));
  check("the total is seven", p.total === 7);
}

console.log("\ntest 3: a brand-new business is told nothing is done");
{
  const p = setupProgress(EMPTY);
  check("nothing is done", p.count === 0, `saw ${p.count}: ${[...p.done].join(", ")}`);
}

console.log("\ntest 4: each derivable step is derived from its own fact, and only its own");
{
  const one = (patch) => setupProgress({ ...EMPTY, ...patch });
  check("services counts services", one({ counts: { ...EMPTY.counts, services: 1 } }).done.has("services"));
  check("add-ons count add-ons", one({ counts: { ...EMPTY.counts, addOns: 1 } }).done.has("addons"));
  check("promos count promo codes", one({ counts: { ...EMPTY.counts, promos: 1 } }).done.has("promos"));
  check("hours count an open day", one({ counts: { ...EMPTY.counts, hoursOpen: true } }).done.has("hours"));
  check("a phone alone answers contact", one({ business: { contact_phone: "1" } }).done.has("contact"));
  check("an email alone answers contact", one({ business: { contact_email: "a@b.c" } }).done.has("contact"));
  check("a colour answers colour", one({ branding: { primary_color: "#fff" } }).done.has("colour"));
  // Each of those changed exactly one fact, so each must move the count by
  // exactly one. A derivation that reached across steps would show up here.
  const single = [
    one({ counts: { ...EMPTY.counts, services: 1 } }),
    one({ counts: { ...EMPTY.counts, addOns: 1 } }),
    one({ business: { contact_phone: "1" } }),
    one({ branding: { primary_color: "#fff" } }),
  ];
  check("one fact moves the count by one", single.every((p) => p.count === 1),
    single.map((p) => p.count).join(", "));
}

console.log("\ntest 5: `where` can only ever be answered by a person");
{
  // mobile_enabled and dropoff_enabled both DEFAULT to true, so "I do both"
  // and "nobody has been asked" are the same two rows. Nothing about the
  // settings may make this step complete on its own.
  const both = setupProgress({ ...EMPTY, settings: { mobile_enabled: true, dropoff_enabled: true } });
  const mobileOnly = setupProgress({ ...EMPTY, settings: { mobile_enabled: true, dropoff_enabled: false } });
  check("both-enabled does not answer it", !both.done.has("where"));
  check("mobile-only does not answer it either", !mobileOnly.done.has("where"));
  const marked = setupProgress({ ...EMPTY, settings: { setup: { done: ["where"] } } });
  check("pressing Continue on it does", marked.done.has("where") && marked.count === 1);
}

console.log("\ntest 6: the stored list and the derived facts are a union, never a replacement");
{
  // A skipped step leaves a HOLE and the hole is the feature (§1b): skipping
  // must never mark anything done, and marking must never un-mark a derived
  // fact.
  const p = setupProgress({ ...ESTABLISHED, settings: { setup: { done: ["where"] } } });
  check("stored plus derived is all seven", p.count === 7, `saw ${p.count}`);
  const skipped = setupProgress({ ...EMPTY, settings: { setup: { done: [] } } });
  check("skipping everything marks nothing", skipped.count === 0);
  // A stored key for a step whose data was later deleted stays done: they
  // answered the question, and un-filling a segment behind somebody's back is
  // the bar disagreeing with itself.
  const stale = setupProgress({ ...EMPTY, settings: { setup: { done: ["services"] } } });
  check("a stored key survives its data going away", stale.done.has("services"));
}

console.log("\ntest 7: it survives everything the caller can hand it");
{
  // Business renders this while its counts are still loading, and a brand-new
  // business has no branding row for a moment. A throw here is a blank tab.
  const shapes = [{}, { counts: null }, { settings: null, branding: null, business: null },
    { settings: { setup: null } }, { settings: { setup: { done: null } } }];
  let threw = null;
  for (const s of shapes) { try { setupProgress(s); } catch (e) { threw = e.message; } }
  check("no shape of missing data throws", threw === null, threw ?? "");
  check("missing data means nothing is done", setupProgress({}).count === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
