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

import { readFileSync } from "node:fs";

// Comments out before anything reads source as text — this repo has been
// caught seven times in two days by a check failing, or passing, on the prose
// that explains it.
const strip = (t) => t
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
const read = (f) => readFileSync(f, "utf8");

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


// ─── 4. The first run survives being interrupted ──────────────────────────
// ROADMAP 7.3's FINAL PASS, findings 2 and 4 — both fixed 2026-09-06, and both
// are about what a screen does when the person does not follow the path.
console.log("\n4. the first run, when nobody follows the path");
{
  const app = strip(read("app/src/App.jsx"));
  const form = strip(read("app/src/components/SetupForm.jsx"));
  const today = strip(read("app/src/screens/Today.jsx"));

  // FINDING 2. `setup.seen` was written when the form MOUNTED, so tapping a
  // rail button in the first ten seconds dismissed it, marked it done with,
  // and took the tour that follows it away for ever. It is written on CLOSE
  // now — which is what the mount-write was reaching for anyway: a form
  // somebody FINISHED must not reopen tomorrow, and one they walked away from
  // is not finished.
  check("4a · the form is marked seen when it CLOSES, not when it appears",
    /const close = useCallback\(\(\) => \{[\s\S]{0,160}patchSetup\(\{ seen: true \}\)/.test(form)
      && !/useEffect\(\(\) => \{[\s\S]{0,200}patchSetup\(\{ seen: true \}\)/.test(form),
    "on mount, one tab press loses the whole first run");
  check("4b · and it is still marked exactly once",
    /if \(!marked\.current\) \{ marked\.current = true;/.test(form));
  check("4c · the form still wins when it is genuinely unfinished",
    /!settings\.setup\?\.seen && !settings\.setup\?\.dismissed[\s\S]{0,120}setFirstRun\("setup"\)/.test(app));
  // The latch used to be set BEFORE the branch that needs `settings`, so a
  // settings fetch answering one tick after the business did meant an owner
  // got no first run at all — silently, and only sometimes.
  check("4d · the decision waits for what it reads, and only for that",
    /if \(role === "owner" && !settings\) return;[\s\S]{0,60}started\.current = true;/.test(app),
    "staff may never be allowed to read settings, so gating both on it removes their tour");
  // FINDING 4. Copy, Open and a QR code, with nothing saying the page behind
  // them has no services on it — the first thing the product invited a new
  // detailer to do was share a link that cannot take a booking.
  check("4e · Today does not offer the booking link with nothing to book",
    /sellable === 0 \?/.test(today) && /Nobody can book yet/.test(today),
    "a caveat under a Copy button is a caveat nobody reads");
  check("4f · it offers the way out of that instead",
    /onSetup\?\.\(\)/.test(today) && /Finish setting up/.test(today));
  // ONE COUNT, NOT `setupProgress`. Business prints "N of 7" and needs six
  // reads for it; the question here is the narrower one that actually decides
  // whether the link works, on the screen a detailer opens every morning.
  check("4g · and asks the one question that decides it, not all seven",
    /from\("services"\)[\s\S]{0,160}count: "exact", head: true/.test(today)
      && !/setupProgress/.test(today),
    "a third copy of the seven-step arithmetic here would be six queries for a sentence");
  check("4h · the link comes back on its own once there is a service",
    /\) : \([\s\S]{0,220}<BookingLink/.test(today));
}


// ─── 5. Roadmap 2.24: a guide on every tab ────────────────────────────────
// The owner: *"it did it for the home page, and then it stopped there."* Four
// of the shell tour's seven steps were signposts pointing at tabs, so it
// explained one screen and named the other four.
console.log("\n5. a guide on every tab");
{
  const wt = read("app/src/components/Walkthrough.jsx");
  const app = strip(read("app/src/App.jsx"));
  const src = strip(wt);

  // EVERY TARGET MUST EXIST SOMEWHERE. A `data-tour` name no screen carries is
  // a step silently dropped from every plan — the tour still runs, one caption
  // shorter, and nothing anywhere says so. This is the vacuity guard for the
  // step lists themselves.
  const names = [...src.matchAll(/\["([a-z]+)", "/g)].map((m) => m[1]);
  check("5a · the step lists have subjects", names.length >= 10, `${names.length}`);
  const markers = new Set();
  for (const f of ["App.jsx", "screens/Today.jsx", "screens/Money.jsx", "screens/Clients.jsx",
                   "screens/Business.jsx", "components/BookingLink.jsx"]) {
    for (const m of read(`app/src/${f}`).matchAll(/data-tour=(?:"([a-z]+)"|\{key === "([a-z]+)"|\{rowIndex === 0 \? "([a-z]+)")/g)) {
      markers.add(m[1] ?? m[2] ?? m[3]);
    }
  }
  // The rail's five tab buttons carry `data-tour={t.key}`, which is where
  // `today`, `calendar`, `money`, `clients` and `business` come from.
  for (const k of ["today", "calendar", "money", "clients", "business"]) markers.add(k);
  const orphans = names.filter((n) => !markers.has(n));
  check("5b · every step points at a marker some screen actually carries",
    orphans.length === 0, orphans.join(", "));

  // ONE ELEMENT, ONE NAME. `Walkthrough.jsx`'s own header: two elements
  // answering one selector is a silently wrong target, and the same is true of
  // one element answering two names — it would be lit twice in one tour.
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  check("5c · no name is used by two steps", dupes.length === 0, dupes.join(", "));

  // CALENDAR HAS NO GUIDE, and that is decision 6 rather than an omission:
  // every candidate step was a control reading its own label back.
  check("5d · Calendar has no guide at all", !/^\s{2}calendar: \[/m.test(src),
    "padding a fifth tour to be tidy is the weirdness he complained about");

  // THE SHELL TOUR GOT SHORTER, NOT DELETED, or a detailer meets the same
  // sentence twice — his complaint arriving from the other side.
  const shell = src.slice(src.indexOf("shell: ["), src.indexOf("today: ["));
  check("5e · the shell tour is four steps", (shell.match(/\["/g) ?? []).length === 4,
    `${(shell.match(/\["/g) ?? []).length}`);
  check("5f · and still ends on the link", /\["link", [\s\S]{0,80}\],\s*\],/.test(src),
    "screen designs §13b: it is the one thing they have to go and use");

  // ONE KEY HOLDING A LIST, not five keys — and the old single key is still
  // read, so a browser that has seen the shell tour is not shown it twice the
  // day this ships.
  check("5g · one key holds the set", /TOURS_KEY = "dp.tours"/.test(app)
    && /JSON\.stringify\(\[\.\.\.new Set/.test(app));
  check("5h · and the old key still counts as having seen the shell",
    /localStorage\.getItem\(TOUR_KEY\) \? \[\.\.\.new Set\(\[\.\.\.list, "shell"\]\)\]/.test(app));

  // NEVER TWO OVERLAYS. The shell tour's own steps move tabs, and the setup
  // form is the same problem one screen earlier.
  check("5i · a guide never fires while the first run is up",
    /if \(!firstRun && TOURS\[t\.key\] && !tourSeen\(t\.key\)\)/.test(app));
  // NOT `!gear`: pressing a tab is how you LEAVE the gear, so reading it there
  // reads the state the press is ending.
  check("5j · and is not blocked by the gear it is leaving",
    !/!firstRun && !gear && TOURS/.test(app));

  // DECISION 6, and the half that matters: leaving for want of steps must not
  // mark it seen, or a detailer whose Today is empty today never gets it.
  check("5k · a guide of one step does not run",
    /tour !== "shell" && kept\.length < MIN_STEPS/.test(src));
  check("5l · and leaves without being marked seen",
    /onEmpty=\{\(\) => setTabTour\(null\)\}/.test(app)
      && /onClose=\{\(\) => \{ markTourSeen\(tabTour\)/.test(app));

  // The plan drops absent targets, so the button on the last step has to read
  // the PLAN's length — it said "Next" and then closed, which reads as the
  // tour breaking.
  check("5m · the last step says Done, however short the plan is",
    /i \+ 1 === \(plan \?\? STEPS\)\.length \? "Done"/.test(src));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
