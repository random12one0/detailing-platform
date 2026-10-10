// Walk every dashboard screen and the booking page at a narrow width and
// report the two failures the owner's walkthrough was made of.
//
// Written in roadmap 2.6 because that item asks for something no other script
// could do: "a full 392px sweep of every screen is how to find it, or rule it
// out" (W15). Screenshots show what a screen LOOKS like; this says whether
// anything is off the edge, which is the half an eye keeps missing — three of
// six token chips were 66px, 183px and 278px past the right edge of a phone
// and nobody had noticed in three sessions of looking at that screen.
//
// TWO CHECKS, one per complaint he actually made:
//   past-viewport   an element whose right edge is off the screen (W12/W13/
//                   W14/W15 — "cut off to the right")
//   past-parent     an element whose right edge is outside its own PARENT's
//                   content box, even though the screen still contains it.
//                   ADDED IN ROADMAP 2.9, and it is the check that item wished
//                   had existed: the time fields and the segmented control had
//                   been 19px and 11px outside their card at 360 for two
//                   roadmap items, and the card's own 18px of padding swallowed
//                   the difference, so nothing ever crossed the viewport edge
//                   and this script kept saying clean. A CLEAN SWEEP MEANT
//                   NOTHING WAS OFF THE SCREEN, NOT THAT NOTHING WAS OFF ITS
//                   BOX. Baselined against the pre-2.9 commit at 360, where it
//                   reports all four failures and nothing else.
//   self-clipped    an element that scrolls sideways inside itself, which is
//                   the same thing wearing a scrollbar nobody can see
//   touching        two boxes stacked with under 4px between them (W7/W11 —
//                   "the boxes touch"), because a box with no gap under it
//                   reads as part of the box below
//   dead-width      ADDED IN ROADMAP 2.11 STEP 3. At >= 1180px the content
//                   column must be at least MIN_DESK_COL wide. The four checks
//                   above are all "is something outside its box", and at a
//                   desktop width they are trivially satisfied by a narrow
//                   column with empty screen either side: baselined before it
//                   was written, this script reported CLEAN on all 18 screens
//                   at both 1920 and 1440 with a 724px column on a 1920
//                   monitor. Adding the wide widths without this check would
//                   have bought a gate that stays green whether or not the
//                   desktop layout is ever built, which is the mistake at the
//                   top of DECISIONS.md — a check that cannot see the common
//                   failure looks exactly like a check that passes.
//
//   node scripts/sweep-widths.mjs --lite         # the same, through ?lite=1
//   node scripts/sweep-widths.mjs                # 1920, 1440, 392, 360, 320
//   node scripts/sweep-widths.mjs 320            # just the PRODUCT.md floor
//   node scripts/sweep-widths.mjs 392 360 1440   # any list
//
// 320 JOINED THE DEFAULT IN ROADMAP 2.9, the item that made it pass. It was an
// argument you had to remember while it was failing on purpose; PRODUCT.md
// promises 320 -> 1440, so the floor is now swept every time rather than when
// somebody thinks to ask for it.
//
// 1920 AND 1440 JOINED THE DEFAULT IN ROADMAP 2.11 STEP 3, and they carry the
// verification HEIGHTS (1080 and 900) rather than the phone's 844 — a screen
// that fits 900px of laptop is the question, and 844 is not that question.
// docs/dashboard-desktop-spec-2026-08-31.md is what they check against.
//
// EXITS NON-ZERO if it finds anything, so it can gate a change. Needs the dev
// server on :5173 (npm run dev --prefix app) and the seeded demo business,
// same as scripts/shoot-dashboard.mjs — it signs in through the real form.
//
// navigator.share is STUBBED IN on purpose. Chrome on Windows has it and a
// headless browser does not, and that difference is the whole of W14: the
// Share button it adds is what pushed Open off the screen. A sweep that does
// not stub it closes a real bug as "does not reproduce".
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { reportSourceMoved, watchSource } from "./source-guard.mjs";
import { checkLabels } from "./label-guard.mjs";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

// Started BEFORE the browser opens, so anything saved from here on is a
// mid-run edit. `source-guard.mjs` explains why that matters.
const changedSince = watchSource();

const WIDTHS = (process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number));
// ?lite=1 is the reduced-motion path. It has its own stylesheet rules, so a
// layout that holds in one can fail in the other; sweep-booking-steps.mjs has
// carried this flag since 2.7 and this script needed a scratch copy without it.
const LITE = process.argv.includes("--lite") ? "?lite=1" : "";
// --only <substring> measures just the screens whose label contains it, e.g.
// `--only Clients`. FOR ITERATING, NEVER FOR SIGNING OFF: the full run is the
// check, and this is the difference between a 20-second answer and an
// eight-minute one while you are still changing things.
const ONLY = (() => { const i = process.argv.indexOf("--only"); return i > -1 ? process.argv[i + 1] : null; })();
const TIMING = process.argv.includes("--timing");
const SIZES = WIDTHS.length ? WIDTHS : [1920, 1440, 392, 360, 320];
// ---------------------------------------------------------------------------
// TWO TIERS, ADDED 2026-09-03 BECAUSE THE OWNER ASKED WHY A SESSION TAKES AS
// LONG AS IT DOES, and this script is the single biggest block of it.
//
// The cost is widths x states, and it was 5 x 56 = 280 measurements every run.
// His own proposal was "two full sweeps and three quick ones", and that is
// almost exactly what this is — the refinement is WHICH states, rather than
// which widths, get the short version.
//
// FULL_WIDTHS get everything, and they are the two EXTREMES. 320 is
// PRODUCT.md's promise and where narrow overflow lives; 1920 is his own
// monitor and the only place dead-width can be seen. **Every width-specific
// defect in DECISIONS.md was found at an extreme** — the 360 pair in roadmap
// 2.9, the 320 floor, dead-width at 1920 — which is the evidence this bet is
// made on rather than a feeling about it.
//
// MEASURED, 2026-09-03: a deep width costs ~67s and a core-only one ~24s, so
// the long tail is ~43s per width. Five deep is 335s; this is ~205s.
//
// At the other two widths only the CORE runs: the booking page, the five tabs,
// the job record, the request card and the screens with real content. What is
// skipped there is the long tail — the twelve settings screens, the gear, the
// setup form's seven steps and the tour's seven — which are simple forms in
// one shared container, and if one of them breaks it breaks at the floor or in
// dead width, both of which are still swept.
//
// `--all` restores the exhaustive walk, and it is not optional after a change
// to `theme.css`, `SettingsHost` or anything else every screen shares: this
// tiering is a bet that the long tail is uniform, and a change to what they
// SHARE is exactly the bet losing.
const ALL = process.argv.includes("--all");
const widthMs = [];
const FULL_WIDTHS = new Set([1920, 320]);
// True while this width should walk the long tail as well as the core.
let deep = true;
/* **WHICH WIDTHS ACTUALLY WALKED DEEP, RECORDED RATHER THAN ASSUMED.**
   `FULL_WIDTHS` is {1920, 320}, so 1440, 392 and 360 run CORE ONLY unless
   `--all` is passed - and they say so in their own section header. The
   expectation file does NOT record the mode it was written in, so a core
   run of 41 surfaces was being graded against a deep expectation of 155
   and reported as a 114-surface shortfall. **Nothing was silently
   skipping. A number written in one mode was being enforced in another**,
   which is this repo's own subject: a figure recorded once, without the
   context that made it true, and compared later against something it was
   never about. Measured 2026-10-03: `--all` takes 1440 from 41 to 122. */
const RAN_DEEP = new Map();
const BASE = process.env.BASE || "http://localhost:5173";
// The verification heights, not the phone's. 1080 is his monitor; 900 is the
// laptop and the shortest screen this product is checked against.
//
// PHONE LANDSCAPE WAS MEASURED, AND THEN RULED OUT BY THE OWNER, 2026-08-31.
// He asked for it in the morning -- "if you shrink a page or you'll not full
// screen it or goes to landscape" -- so roadmap 2.11 step 4b measured 844x390
// and it is genuinely broken: the tab bar covers the first job, the month
// shows 1.3 of 5 weeks, a settings sheet shows 20% of its form, and the
// sign-in card with an error on it sits 25px past the bottom edge. He then
// reversed himself and closed it: "lets not have a horizontal phone setup,
// only portrait... no need and will only be making things harder."
//
// So there is no 844 here: not in SIZES, no height special case, and the
// `short-screen` check written for it was removed rather than left dormant.
// PORTRAIT ONLY. The numbers above are kept in
// docs/dashboard-phone-pass-2026-08-31.md so that nobody measures them again
// and files them as a new discovery. DO NOT re-add without asking him.
//
// One thing that outlived it and is worth knowing: every check below asks
// about the RIGHT-HAND edge, so this script cannot see a bottom-edge failure
// at any size. That was always true; landscape is only where it would have
// bitten first.
const heightFor = (w) => (w >= 1900 ? 1080 : w >= 1024 ? 900 : 844);

// --- dead-width, and the one line that arms it -----------------------------
// FLIPPED TO `true` IN ROADMAP 2.11 STEP 6, 2026-09-01, in the same change that
// shipped the shell: .app-main takes --wrap (1180px) at >= 1024 and the tab bar
// becomes the vertical rail, so the content column is 1,148px at both desktop
// widths against the 724px it was at every width before. While this was false
// the measurement PRINTED every run and did not count, so the failure was
// visible without leaving a standing gate red before the layout it gates
// existed. It gates now: a regression back to a narrow column fails the sweep.
// docs/dashboard-desktop-spec-2026-08-31.md §6b and §10.
const DESKTOP_SPEC_BUILT = true;
const BP_SPLIT = 1180;   // --wrap; where the desktop spec's second column engages
const MIN_DESK_COL = 1000; // the spec requires 1180; 1000 is the floor that says "a desktop layout exists"
// FOURTEEN SETTINGS SCREENS BEHIND TWO DOORS. It was twelve until roadmap
// 2.14 added Monthly plans to Business and thirteen until roadmap 2.20 added
// "How you get paid"; the count in a comment is the fourth
// stale-number family this repo has caught, so the list below is the
// authority and this sentence follows it.
// From roadmap 2.11 step 6 stage 6.
// It was ELEVEN behind one, and the count and the door both had to move or
// this script would report clean on eighteen screens while never opening the
// four that had been re-homed and the one that is new. That is the family of
// failure at the top of DECISIONS.md: a skipped check reads exactly like a
// passing one.
//
// BUSINESS holds what changes what a CUSTOMER meets; the GEAR holds the
// plumbing. "Maps, calendar & contacts" is called "This device" now.
// Reviews is the twelfth and is new.
//
// "COMMON QUESTIONS" IS ROADMAP 3.2(b), added in the change that BUILT it.
// This comment said "there is no FAQ row: its storage landed and its screen
// deliberately did not" from stage 6 until then. Its own geometry risk is the
// row of THREE icon buttons beside a two-line question — up, down, delete —
// which is one more control on a `.row-item` than anything else in the
// product, and 320 is where that is decided. The demo is seeded with a
// deliberately long question for exactly that reason: a screen swept empty
// prints `clean` and means nothing.
// "YOUR WEB ADDRESS" IS ROADMAP 3.3, added in the change that BUILT it. Its
// own geometry risk is the numbered three-step list that only exists while a
// domain is added and unverified — a state behind a state, which is the gap
// this file records ten times. `seed-demo.mjs` seeds exactly that row so the
// list is drawn at every width rather than measured as an empty screen.
// "CAMPAIGN LINKS" IS ROADMAP 4.2, added in the change that built it. Its own
// geometry risk is the row: a campaign nobody has opened prints a SENTENCE
// rather than two numbers ("Nobody has opened it yet"), beside a worded button
// and an icon button, which is why the demo seeds one of each and why this
// screen is on `.rows-stack`.
// **THREE OF THESE NAMED SCREENS THAT NO LONGER EXIST — found 2026-09-16.**
// "Your colour", "Common questions" and "Campaign links" were renamed in the
// app to "Your color", "FAQ" and "Tracking links". This list was not, so every
// run since printed three NO SUCH ROW lines and three settings screens went
// unopened at every width. They were invisible TWICE in Spanish: `NAMED()`
// looks the English up in `appEs.js`, which is keyed on the CURRENT English,
// so a stale key returns the bare English string and cannot match either.
// The check was coupled to a spelling rather than to a behavior —
// `docs/gotchas.md`, and the reason the expected-count gate below now exists.
const BUSINESS_ROWS = ["Business info", "Your color", "Photo gallery", "Reviews", "FAQ",
  "Your web address", "Tracking links",
  // "How you get paid" is roadmap 2.20 stage 1, and it is added in the change
  // that BUILT it rather than in the item that later finds it broken — which
  // is the whole lesson of the nine times this same gap has been recorded.
  // Its own risk is the paired Venmo / Cash App row at 320, exactly like the
  // plan form's segmented-control-beside-a-number-field.
  // "Visits due" joined 2026-09-06 with roadmap 2.23, in the change that built
  // it, as "Maintenance deadlines". Its own geometry risk is the `.pair` at
  // the bottom of the form — a date input beside a number input, which is the
  // same shape that breaks first on the plan form at 320.
  //
  // **RE-POINTED 2026-09-20, AND THE WARNING WAS TWELVE LINES ABOVE IT.** The
  // other session renamed the row to "Visits due" and moved `"Visits due":
  // "Visitas pendientes"` into `appEs.js` in the same edit — its half was
  // correct and committed. This array kept the old English, so `NAMED_TEXT()`
  // looked up a key `appEs.js` no longer has, got the bare stale English back,
  // matched nothing, and the screen went unmeasured. The comment at the top of
  // this array already describes exactly that — *"a stale key returns the bare
  // English string and cannot match either… invisible TWICE in Spanish"* — and
  // the array went stale again anyway. **A warning above a list does not keep
  // the list current; only a check that fails does**, and the expected-count
  // gate is what failed, by name.
  "Services & add-ons", "Monthly plans", "Visits due", "How you get paid", "Promo codes & sale",
  "Hours & days off", "Booking rules"];
// "Your subscription" is NOT in this list and that is deliberate: it is
// owner-only and it is the one settings screen whose content comes from an
// edge function rather than a table, so it is walked as its own block below
// with a wait for what the answer draws. Roadmap 2.20 stage 2.
// "Your password" joined 2026-09-06 with the item that built it — the way
// back in after a forgotten password, ranked *blocks launch* by roadmap
// 7.3's final pass. Its own geometry risk is small (two fields and a
// button); it is here because a settings screen this list does not name is a
// screen no width ever opens.
// **"Weather warnings" AND "Report a problem" JOINED 2026-09-16, and until
// then NO WIDTH HAD EVER OPENED EITHER.** They are not renames — they are two
// settings screens that shipped and were never added here, so they were not
// missing from the run, they were missing from the QUESTION. "Declare the
// universe" is the first rule in the operating-system report's § "Discipline
// for trusting a check", and this line is what it means: a screen this array
// does not name is a screen no width ever measures, and nothing anywhere
// prints a word about it.
// "Emails we sent" JOINED 2026-10-08 — ROADMAP 3.1. A new settings screen that
// no width sweep walks is the unmeasured-screen failure this file exists for,
// and the row is one line. `scripts/mail-log.mjs` asks the questions ABOUT it;
// this walks its geometry alongside the other seven.
const GEAR_ROWS = ["Notifications", "Emails we sent", "Message templates", "Weather warnings", "Team",
  "Your password", "This device", "Report a problem"];

// Runs in the page. Boxes are the things with an edge — two of those touching
// is the defect; two paragraphs touching is just text.
const CHECK = () => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  // `.dashed` came out of this list in roadmap 2.11 step 6 stage 6, in the
  // same change that deleted the class: a matcher naming something nothing
  // carries reads as covering a case it can no longer find.
  const boxy = (el) => el.matches(".card, .sunken, .setting-card, .bk-card");
  const name = (el) => el.tagName.toLowerCase()
    + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "");
  // AN ELEMENT AN ANCESTOR ALREADY CLIPS CANNOT BE OFF THE SCREEN, because
  // nobody can see the part that is. Added 2026-09-05 with the pricing page,
  // which is the FIRST page carrying the landing surface's `.ground` that
  // this script has ever walked: two drifting lights at 76vmax and a dot
  // lattice at inset -8% each reported ~150px past the right edge at 320,
  // inside a `position: fixed` layer with `overflow: hidden` over them.
  // Three false positives, and a false positive is not a smaller problem
  // than a false negative here — a check that cries wolf on every run is a
  // check somebody starts passing over, and then it stops being read at all.
  // This CANNOT hide a real defect: a defect is content sticking out where
  // it can be seen, and clipped is the definition of cannot be.
  const clipped = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (/hidden|clip/.test(getComputedStyle(a).overflowX)) return true;
    }
    return false;
  };
  // **DOES THE PAGE SCROLL SIDEWAYS AT ALL — added 2026-09-07, and until then
  // this script asked every question about a horizontal edge EXCEPT the one a
  // person actually experiences.** Every check below is about ONE element:
  // past the viewport, past its parent, scrolling inside itself. A decorative
  // `::after` that sticks out of a card whose ancestors are all
  // `overflow: visible` is past NOTHING — pseudo-elements are not in
  // `querySelectorAll`, its parent chain never clips, and no single box is
  // ever outside another — **while the overflow propagates all the way to
  // `html` and the phone really can be dragged off its own layout.** The lit
  // card's accent bloom did exactly that at 392 and every run said `clean`.
  // `geometry.mjs`, the admin shooter's own copy of these questions, has had
  // this line from the day it was written; the primary instrument did not.
  // It is FIRST because when it fires it is the summary of whatever the
  // element checks below are about to say, and often of something they cannot
  // say at all.
  // **COUNT THE QUESTIONS, NOT JUST THE ANSWERS.** `out.length` is how many
  // things were WRONG; on a good screen it is zero and says nothing at all
  // about whether anything was asked. The receipt needs the other number.
  let asked = 1; // the page-scrolls question, asked once per surface
  const drag = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  if (drag > 1) out.push(`page-scrolls   +${drag}px  the whole page can be dragged sideways`);
  for (const el of document.querySelectorAll("body *")) {
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const txt = (el.textContent || "").trim().slice(0, 26);
    // TWO QUESTIONS PER VISIBLE ELEMENT: is its right edge past the viewport,
    // and is it past its own parent (or, with no parent box, scrolling inside
    // itself). The touching question below is per PAIR, so it counts its own.
    asked += 2;
    const past = Math.round(r.right - vw);
    if (past > 1 && !clipped(el)) out.push(`past-viewport  +${past}px  ${name(el)}  «${txt}»`);
    // Outside its own parent's content box. Skipped where the answer would be
    // a lie rather than a defect: a parent that scrolls sideways on purpose, a
    // parent with no box at all (`display: contents` — .bk-step is one, and it
    // was this check's only false positive), and anything positioned out of
    // flow, which is meant to leave its parent.
    const par = el.parentElement;
    if (par && par !== document.body) {
      const pr = par.getBoundingClientRect();
      const pcs = getComputedStyle(par);
      const inner = pr.right - parseFloat(pcs.paddingRight) - parseFloat(pcs.borderRightWidth);
      const overP = Math.round(r.right - inner);
      if (overP > 1 && pr.width > 0 && !/auto|scroll/.test(pcs.overflowX)
          && pcs.position === "static" && cs.position === "static") {
        out.push(`past-parent    +${overP}px  ${name(el)} in ${name(par)}  «${txt}»`);
      }
    }
    // An ellipsis is a DESIGNED truncation — it says out loud that there is
    // more, and .nav-row .now is built that way on purpose. A scroller with
    // `scrollbar-width: none` says nothing, which is the actual defect.
    else if (el.scrollWidth - el.clientWidth > 1
             && /auto|scroll|hidden/.test(cs.overflowX)
             && cs.textOverflow !== "ellipsis") {
      out.push(`self-clipped   +${el.scrollWidth - el.clientWidth}px  ${name(el)}  «${txt}»`);
    }
    if (!boxy(el)) continue;
    const n = el.nextElementSibling;
    if (!n || !n.getClientRects().length || !boxy(n)) continue;
    const gap = Math.round(n.getBoundingClientRect().top - r.bottom);
    asked++;
    if (gap >= 0 && gap < 4) out.push(`touching       ${gap}px gap  ${name(el)} → ${name(n)}  «${txt}»`);
  }
  // THE PER-ROUTE SENTINEL'S RAW MATERIAL — what was actually on screen, as
  // text rather than as pixels. See `say()` for why it is not a screenshot.
  //
  // It fingerprints the TOPMOST LAYER, not the page: most of what this script
  // measures is a sheet or a tour card over a screen that does not change
  // underneath it, so a fingerprint of the whole page makes every sheet
  // identical to the screen behind it.
  //
  // UNTRUNCATED, and that is the whole difference between this and the first
  // version. Truncated to 400 characters it reported four healthy pairs as the
  // same screen, because two different clients' sheets share their first 400
  // characters of chrome and differ further down.
  const layers = [...document.querySelectorAll(".sheet, [role='dialog'], .modal")]
    .filter((el) => el.getClientRects().length);
  const scope = layers.length ? layers[layers.length - 1] : (document.getElementById("root") || document.body);
  const sig = [
    location.pathname + location.search,
    layers.length ? `layer${layers.length}:${scope.className}` : "page",
    scope.querySelectorAll("*").length + "el",
    (scope.innerText || "").replace(/\s+/g, " ").trim(),
  ].join(" ¶ ");
  return { rows: [...new Set(out)], asked, sig };
};

// --- SETTLE, NOT SLEEP ------------------------------------------------------
// WHY THIS EXISTS, 2026-09-02: this script spent 463 seconds per run, and
// roughly three quarters of that was `waitForTimeout`. Thirty-five fixed
// sleeps of 400-3200ms, times five widths, times two paths (normal and
// `?lite=1`) — most of them waiting 1.7 seconds for a screen that had finished
// painting in 250ms. The owner asked why a one-screen task takes an hour, and
// this was the largest single answer.
//
// THE REPLACEMENT MUST NOT BE FASTER BY MEASURING EARLIER. That is this
// repo's own worst failure mode — "a skipped check reads exactly like a
// passing one" — so `settle` waits for three things and takes the OLD number
// as a CAP rather than as a value:
//
//   1. no DOM mutation for 130ms (React has finished committing),
//   2. no FINITE animation still running — the arrival stagger translates a
//      child 14px down for up to 580ms, and the parent-box check would read
//      that as an element outside its own box. Infinite ones are excluded on
//      purpose: `.app-shell::before` drifts for 54 seconds forever and the
//      page is not "loading" while it does,
//   3. no `.spinner` in the DOM — a screen that is still fetching is quiet in
//      the two senses above and is exactly what must not be measured.
//
// Returns the milliseconds it actually took, so `--timing` can print where
// the run went.
let settled = 0, slept = 0;
const settle = async (page, cap = 2000) => {
  slept += cap;
  const ms = await page.evaluate(async (cap) => {
    const t0 = performance.now();
    const QUIET = 130;
    let last = performance.now();
    const obs = new MutationObserver(() => { last = performance.now(); });
    obs.observe(document.documentElement, {
      subtree: true, childList: true, attributes: true, characterData: true,
    });
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    try {
      for (;;) {
        await frame();
        const now = performance.now();
        if (now - t0 >= cap) return Math.round(now - t0);
        // `.spinner` OR `[data-loading]` — a screen whose content comes from an
      // edge function is QUIET while it waits: no spinner, no animation, a
      // still DOM, and settle() returns on a card that says "Checking…".
      // shoot-dashboard.mjs sent the owner a photograph of a loading line
      // because of exactly this (2026-09-05). The attribute costs no pixels
      // and every browser script in this repo waits for it now.
      // **`.bk-spinner` WAS MISSING AND THE BOOKING PAGE IS THE ONE THAT USES
      // IT - measured 2026-09-13, lane C.** The customer-facing flow spells its
      // loading mark `bk-spinner` in seven places (`BookingPage`, `StepWhen`,
      // `PlansPage`, `PlanMemberPage`, `ManageBookingPage`, `UnsubscribePage`),
      // and a CSS-animated spinner mutates NOTHING, so the DOM went quiet in
      // 130ms and this returned on a page holding three elements and no text.
      // `sweep-widths` then printed `book . step 1  clean` at all five widths,
      // for every run this repo has ever done. The comment above is about
      // exactly this failure and the fix it chose never reached the booking
      // flow.
      if (document.querySelector(".spinner, .bk-spinner, [data-loading]")) { last = now; continue; }
        const busy = document.getAnimations().some((a) => {
          if (a.playState !== "running") return false;
          const t = a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming();
          return !t || t.iterations !== Infinity;
        });
        if (!busy && now - last >= QUIET) return Math.round(now - t0);
      }
    } finally { obs.disconnect(); }
  }, cap);
  settled += ms;
  return ms;
};

// --- WAIT FOR THE CONTROL, DO NOT COUNT IT ------------------------------
// `settle()` is a cap on a REPAINT. It is not a wait for a network round
// trip, and `?lite=1` makes that worse rather than better: with nothing
// animating the DOM goes quiet sooner, so settle returns earlier. Anything a
// Supabase read draws — Monthly plans, Team's members, the Clients list, the
// pricing page's founding strip — has to wait for the element itself.
//
// AT MODULE SCOPE, AND THAT IS THE POINT OF THIS MOVE (2026-09-05). It was
// declared inside the width loop immediately above the settings walk, so a
// `const`'s temporal dead zone put it out of reach of every caller earlier in
// the same loop — the Clients block two hundred lines above it, and then the
// pricing block six hundred lines above that. The helper written to fix this
// race has now twice been unreachable at a site that still had it. Nothing in
// it closes over anything, so there was never a reason for it to be in there.
// ROADMAP 8.17 STAGE 2B — A CONTROL ADDRESSED BY ITS WORDS, IN EITHER
// LANGUAGE.
//
// This script names sixteen controls by the text on them, and every one of
// those names changes when the dashboard is Spanish — the first run under
// `LANG_APP=es` timed out on the word "Today" and took the whole sweep with
// it. That is the family CLAUDE.md already records twice (the auth form's
// selectors, the booking page's `.bk-chip`): **a script that reaches for a
// WORD breaks the day the word changes, and a translation changes every
// word.**
//
// The fix is not a `data-testid` on sixteen controls — that is a product
// change made for a test's convenience, and this repo has refused that trade
// before. It is to accept EITHER name, read from the catalogue the product
// itself ships. One helper, no product edit, and it keeps working when a
// translation is corrected.
//
// The RAIL is different and is addressed by `data-tour` instead: those five
// buttons already carry a stable attribute for the guided tour, so there is
// nothing to look up.
const APP_ES = (() => {
  try {
    const src = readFileSync(new URL("../app/src/lib/strings/appEs.js", import.meta.url), "utf8");
    return new Map([...src.matchAll(/^\s*"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)]
      .map((m) => [m[1].replace(/\\"/g, '"'), m[2].replace(/\\"/g, '"')]));
  } catch (e) {
    // **NEVER SILENT AGAIN.** This catch returned an empty Map for the whole
    // life of the feature and the cause was `readFileSync is not defined` — the
    // import was simply missing. An empty catalogue makes NAMED() fall back to
    // English for EVERY control, so `LANG_APP=es` looked like it was supported
    // and could never once have completed. A swallowed ReferenceError that
    // degrades a whole feature to a no-op is this repo's oldest failure shape
    // wearing its best disguise: the code reads correctly and does nothing.
    console.error(`SPANISH CATALOGUE DID NOT LOAD — every locator will use English: ${e}`);
    return new Map();
  }
})();

// **THE CUSTOMER'S CATALOGUE, WHICH IS A DIFFERENT ONE — 2026-09-19.**
// `lib/i18n.js` is the booking surface and `lib/appI18n.js` is the dashboard,
// and `appI18n.js` says in as many words that the two keys "neither can move
// the other" — deliberately, so a detailer previewing their own booking page
// in Spanish does not come back to a Spanish back office. **That design is the
// reason this sweep measured nine surfaces in English while reporting Spanish:
// it only ever set the dashboard's key.** Loaded the same way, and the same
// refusal below if it is empty.
const BOOK_ES = (() => {
  try {
    const src = readFileSync(new URL("../app/src/lib/strings/es.js", import.meta.url), "utf8");
    return new Map([...src.matchAll(/^\s*"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)]
      .map((m) => [m[1].replace(/\\"/g, '"'), m[2].replace(/\\"/g, '"')]));
  } catch (e) {
    console.error(`BOOKING SPANISH CATALOGUE DID NOT LOAD: ${e}`);
    return new Map();
  }
})();

// And say so out loud when it is empty in a run that asked for Spanish, because
// "0 entries" is the difference between a Spanish sweep and an English one
// wearing a Spanish label.
if (process.env.LANG_APP === "es" && APP_ES.size === 0) {
  console.error("REFUSING TO PRETEND: LANG_APP=es but the catalogue is empty.");
  process.exit(1);
}

/** A button by its English name, matching the Spanish one too. */
/** A control's accessible name, matching the Spanish one too.
 *
 *  Returns the plain English string when there is no translation (so an
 *  untranslated control is matched exactly as before), and an ANCHORED regex
 *  over both when there is. Playwright ignores `exact` for a regex, which is
 *  why the anchors are in the pattern — dropping them would make every one of
 *  these a substring match, and `Add` would start matching `Add a plan`. */
const rx = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NAMED = (english) => {
  const es = APP_ES.get(english);
  if (!es || es === english) return english;
  return new RegExp(`^(?:${rx(english)}|${rx(es)})$`);
};

/** The same idea for `hasText`, WITHOUT the anchors.
 *
 *  **`hasText` is a SUBSTRING match and `name` is not**, so handing it NAMED()'s
 *  anchored pattern asks for a row whose entire text is the label — and a
 *  `.nav-row` carries the label, its description and a chevron. In English this
 *  was invisible because a plain STRING passed to `hasText` already matches as a
 *  substring; the anchors only appeared when the value became a regex.
 *
 *  Found 2026-09-08 on the first Spanish run after NAMED() was repaired:
 *  nineteen settings rows still reported NO SUCH ROW, having swapped one wrong
 *  matcher for another. **Two matchers that look interchangeable and are not.** */
const NAMED_TEXT = (english) => {
  const es = APP_ES.get(english);
  if (!es || es === english) return english;
  return new RegExp(`(?:${rx(english)}|${rx(es)})`);
};
/* ══ `clickOnStillGround` WAS HERE AND IT IS GONE — 2026-10-03 ══════════════
   It paused infinite animations around one click, on the strength of a census
   that named `ground-drift` as moving the tab bar. **That attribution was
   wrong and the second census disproved it.**

   The first census read `effect.target`, which for a PSEUDO-ELEMENT animation
   reports the ORIGINATING element - so `ground-drift` looked like an animation
   on `DIV.app-shell`, an ancestor of the tab bar. It is not. It runs on
   `.app-shell::before` (`effect.pseudoElement === "::before"`), and that box is
   `position: fixed; z-index: -2; pointer-events: none` — theme.css:1048. It is
   behind the content and cannot move it.

   Measured rather than argued, second time: the tab bar's bounding box across
   SIXTY consecutive animation frames yields **one distinct box**, to three
   decimal places, with `ground-drift` running. It does not move. And
   `elementFromPoint` at the button's centre returns the button.

   **So the guard was tolerance with no defect behind it**, which is the thing
   this file exists to refuse, and keeping it would have meant every future
   green here was partly bought by not looking. The 1920 abort is UNATTRIBUTED
   again. What survives is narrower and worth having: the bar is stable in the
   steady state, so whatever made it unstable was TRANSIENT, in the window just
   after the setup form closes — a finite animation mid-flight, not an infinite
   one. That is a hypothesis and it is written here as one. */

const appear = async (loc, ms = 6000) => {
  try { await loc.first().waitFor({ state: "attached", timeout: ms }); return true; }
  catch { return false; }
};

// --- ONE SIGN-IN, NOT FIVE --------------------------------------------------
// The form was filled in again at every width. It is the same account and the
// same session; Playwright can carry it across contexts.
let signedIn = null;

// **EVERY LABEL THIS CHECK NAMES MUST STILL EXIST IN THE PRODUCT — 2026-09-20,
// ROADMAP 14.14, and it is the guard whose absence produced a confident wrong
// finding today.** `NAMED_TEXT("X")` looks X up in `appEs.js` and, when the
// catalogue has no entry, **silently falls back to the bare English X**. That
// fallback cannot tell two very different things apart:
//
//   - X is deliberately untranslated, so English is correct; and
//   - X was RENAMED, so this array is stale and the pattern matches nothing.
//
// The second is what happened: the row became "Visits due", this array still
// said "Maintenance deadlines", and the run reported the surface as never
// measured. That output was true. What was NOT true was the diagnosis built on
// top of it — a second, ad-hoc check grepped the catalogue **for the same
// stale string**, found nothing, and was read as confirming a missing
// translation on a row that was correctly translated all along.
//
// So the guard is not about Spanish. It is about the array being current:
// a label this file names that no longer exists in `app/src` is a screen no
// width will ever open again, and nothing downstream can tell that apart from
// a screen that is genuinely absent.
//
// `--labels-only` runs just this and exits, so it can be proved without a
// browser. `SWEEP_LABEL_CANARY=1` injects a label that cannot exist.
const NAMED_LABELS = [...BUSINESS_ROWS, ...GEAR_ROWS,
  ...(process.env.SWEEP_LABEL_CANARY === "1" ? ["A row that has never existed"] : [])];
// ONE IMPLEMENTATION, TWO ENTRY POINTS. `scripts/label-guard.mjs` audits every
// check in the repo and is the gate; this call is the same code guarding this
// file's own row list at the top of a run, so a stale label is named here
// rather than three hundred surfaces later.
const { stale: STALE_LABELS, dynamic: DYNAMIC_LABELS } = checkLabels(NAMED_LABELS);
if (STALE_LABELS.length) {
  console.log(`
STALE LABELS — ${STALE_LABELS.length} of ${NAMED_LABELS.length} row label(s) this check `
    + `names no longer appear anywhere in the product. A renamed row does not fail loudly:`);
  console.log(`  the matcher falls back to the bare English, matches nothing, and the screen goes`);
  console.log(`  unmeasured while every other line reads normally. Re-point these, do not delete them.`);
  console.log(`  This is a hole in the QUESTION, not a screen that failed to load:`);
  for (const l of STALE_LABELS) console.log(`    NO LONGER IN THE PRODUCT  ${l}`);
} else {
  console.log(`${"labels".padEnd(24)} all ${NAMED_LABELS.length} row label(s) still exist in the product`);
}
for (const l of DYNAMIC_LABELS) console.log(`${"labels".padEnd(24)} NOT VERIFIABLE — ${l} is built at run time`);
if (process.argv.includes("--labels-only")) process.exit(STALE_LABELS.length ? 1 : 0);

const browser = await chromium.launch();
let found = STALE_LABELS.length;
// **THE RUN'S OWN SUBJECT COUNT.** `docs/START-HERE.md` s 4: count subjects
// every run rather than merely matching. `found` counts PROBLEMS, so on a good
// day it is zero and says nothing at all about whether anything was looked at.
// These two say how much there was to look at.
let probed = 0, surfaces = 0;
let narrow = 0;   // desktop widths whose content column is still phone-sized

// --- CERTIFICATION ---------------------------------------------------------
// Step 3 of ROADMAP.md § "Adopting the operating-system report". Everything in
// this block exists because THIS script is the one the report names: it printed
// `clean` over 38 real findings. The four checks above answer "is anything in
// the wrong place". None of them answers the question that actually went wrong:
// **did this run look at everything it was supposed to look at?**
//
//   expected counts   a committed list of every surface a full run must measure
//   sentinels         two labels with the same fingerprint = one was not reached
//   fail on zero      already partly here; now per width as well as per run
//   a canary          a defect handed to the finder on purpose, which it must
//                     catch, or its clean verdict on everything else is void
//   a receipt         the numbers, written down, graded by `receipt.mjs`
import { writeReceipt } from "./receipt.mjs";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { demoOwner } from "./lib/demoOwner.mjs";
import { ordinal } from "./lib/ordinal.mjs";
import { addSkip, probeEvidence } from "./lib/skipEvidence.mjs";

const STARTED = new Date().toISOString();

// **EVERY CONTEXT, NOT THE ONE YOU WERE THINKING OF — 2026-09-19.** The first
// version of this set the keys on the main context only, and the four sign-in
// screens stayed English: they are measured in a SEPARATE anonymous context,
// because they are the signed-out product. The language guard caught it on the
// very next run — `the way in NOT IN SPANISH — 0 translated phrase(s) against
// 5 untranslated` — which is the whole argument for having written the guard
// before trusting the fix.
//
// `addInitScript`, so the keys are there for the FIRST paint; a language set
// after the screen is drawn needs a reload to take, and a reload is a thing to
// forget.
const speakSpanish = async (context) => {
  if (!LANG_ES) return;
  await context.addInitScript(() => {
    try {
      localStorage.setItem("dp.lang", "es");       // the customer's booking surface
      localStorage.setItem("dp.lang.app", "es");   // the detailer's dashboard
    } catch { /* private mode */ }
  });
};

// **THE FOUR SURFACES THAT CANNOT BE SPANISH, AND IT IS THE PRODUCT'S DOING.**
// `LandingPage.jsx`, `PricingPage.jsx` and `LegalPage.jsx` import no
// translation scope and contain ZERO `t("...")` calls between them — they are
// written in English and there is nothing to switch. Measured, not assumed.
// Forcing a language onto them would prove nothing; naming them stops the
// language check calling four correct screens broken, and stops the next
// person believing the sweep covers them.
const ENGLISH_ONLY = new Set(["landing", "pricing", "terms", "privacy"]);

// **PRODUCT TRANSLATION GAPS THIS SWEEP HAS SEEN, NAMED RATHER THAN FIXED.**
// These are `app/src` faults and the sweep turns were instrument-only, so they
// are logged to ROADMAP 2.12 ("Spanish is half-translated"), which already owns
// Spanish coverage and already names `i18n-survey.mjs` as its instrument. They
// are declared here so the run can be honest without being permanently red —
// and the entry is REFUSED the day the gap closes, so the list cannot become a
// place defects go to be forgotten.
// **EMPTY, AND THAT IS A RESULT RATHER THAN A DEFAULT — 2026-09-20.** It held
// one entry: `job record · send a text`, declaring four message-template names
// as English on an otherwise Spanish sheet. Those names are translated now, so
// **the entry was STALE, not load-bearing** — it protected no screen and
// removing it removes no coverage. The difference matters, because in the
// source a declaration that guards a surface and one that is merely old look
// identical, and the next person cannot tell them apart without being told.
//
// It was not removed on anybody's word. The refusal below is what proved it:
// the Spanish sweep printed `GAP CLOSED — declared as a known English patch
// and it is Spanish now (5 translated against 0)` and raised a finding, on a
// run against regenerated demo data where the surface was actually reachable.
// An earlier attempt reported `NOT MEASURED — no finished job on today's rail`
// and would have removed the entry on the strength of a surface nobody saw.
const KNOWN_ENGLISH = new Map([]);

// A surface is judged against the catalogue for ITS OWN scope: the booking
// page is the customer's (`lib/i18n.js`), everything else is the dashboard's
// (`lib/appI18n.js`). Using one catalogue for both would score the booking
// page against strings it never renders.
// **THE SURFACES A SPANISH RUN MUST POSITIVELY CERTIFY — 2026-09-20, ROADMAP
// 14.15.** Everything below this line is a check that can only FAIL. It says
// nothing when a surface is correctly Spanish, and it says nothing when a
// surface holds no catalogue phrase at all — and those two silences are
// identical in the log. So no run has ever ASSERTED that the customer's half
// renders Spanish; runs have only failed to assert that it does not.
//
// That gap matters most on exactly these five, because they are the surfaces
// a person who is not our customer yet sees first, and because the customer
// scope is a DIFFERENT key: `dp.lang` for the booking page and the way in,
// `dp.lang.app` for the dashboard. `speakSpanish()` sets both — but "sets the
// key" and "the screen came out Spanish" are two claims, and only one of them
// has ever been checked.
//
// The four marketing pages are deliberately absent: they import no translation
// scope and contain zero `t()` calls, so there is nothing to certify. That is
// `ENGLISH_ONLY`, measured rather than assumed.
const LANG_CERTIFY = ["book · step 1", "the way in", "the way in · new account",
  "the way in · reset", "the way in · parked"];
const LANG_SEEN = new Map();

const langCheck = (label, sig) => {
  if (ENGLISH_ONLY.has(label)) return;
  const cat = label.startsWith("book") ? BOOK_ES : APP_ES;
  let en = 0, es = 0;
  // **WHICH PHRASES, NOT JUST HOW MANY — 2026-09-20.** `appEs.js` is keyed on
  // the English string, so one English word with two senses collapses to one
  // entry: `"Light"` is `"Claro"` because a tenant site's Dark/Light theme
  // toggle reached that key first, and the New booking form's soiling scale
  // then shows a detailer the word for *pale*. A surface can therefore come
  // out "Spanish" on a word that means something else entirely — a pass this
  // certification would give and should not. Recording the matched phrases is
  // what lets a run SAY whether it leaned on one of those, instead of a
  // reader having to assume it did not.
  const hits = [];
  for (const [k, v] of cat) {
    if (k === v || k.length < 8 || k.includes("{")) continue;
    if (sig.includes(v)) { es++; hits.push(v); }
    else if (sig.includes(k)) en++;
  }
  if (LANG_ES && LANG_CERTIFY.includes(label)) LANG_SEEN.set(label, { es, en, hits });
  // A surface with nothing the catalogue knows either way says nothing about
  // the language, and must not be turned into a finding: a QR plate and a
  // month grid are mostly not words.
  if (es === 0 && en === 0) return;
  const bad = es === 0 || en > es;
  const known = KNOWN_ENGLISH.get(label);
  // **A KNOWN PRODUCT GAP IS DECLARED, NOT SILENCED — and the declaration can
  // be refused.** Same shape as `declareSkip`: if the surface turns out to be
  // translated after all, the entry is stale and saying nothing would let this
  // list rot into a permanent excuse. That is the failure mode of every
  // allowlist ever written.
  if (known && !bad) {
    console.log(`${label.padEnd(24)} GAP CLOSED — declared as a known English patch and it is Spanish `
      + `now (${es} translated against ${en}). Remove it from KNOWN_ENGLISH.`);
    found++;
    return;
  }
  if (!bad) return;
  if (known) {
    console.log(`${label.padEnd(24)} PARTLY ENGLISH, KNOWN — ${known}`);
    return;
  }
  console.log(`${label.padEnd(24)} NOT IN SPANISH — ${es} translated phrase(s) on screen against `
    + `${en} untranslated. This run asked for Spanish and this surface did not get it.`);
  found++;
};

// **THE RECEIPT COULD NOT SEE MOST OF THIS SCRIPT'S FAILURES — found on its own
// first certified run, 2026-09-16.** It printed `status: "fail"` beside
// `failures: []`, because only `say()` returns a per-surface finding; the
// fifteen other places that raise `found++` — NOT MEASURED, NO SUCH ROW, NO
// SUCH BUTTON, CRASHED — print a line and vanish. A receipt that says "failed"
// and cannot say what failed is a receipt nobody can act on.
//
// Wrapping the logger costs five lines and no call-site changes. It IS matched
// on wording, which is the coupling `docs/gotchas.md` warns about — so the
// wording is not trusted: the run reconciles `LOUD.length` against the counter
// afterwards and reports the discrepancy. **A new failure phrase this pattern
// does not know shows up as an unexplained difference, not as silence.**
const LOUD = [];
{
  const real = console.log;
  console.log = (...a) => {
    const line = a.join(" ");
    if (/NOT MEASURED|NO SUCH ROW|NO SUCH BUTTON|CRASHED|NOT CAUGHT|GATE FAILED|SENTINEL FAILED|WIDTH ABORTED|SKIP REFUSED|SKIP CONTRADICTED|NOT GRADED/.test(line)) {
      LOUD.push(line.trim().replace(/\s+/g, " "));
    }
    real(...a);
  };
}
const EXPECTED_PATH = new URL("./sweep-widths.expected.json", import.meta.url);
/* ══ THE EXPECTATION IS KEYED BY MODE, AND UNTIL 2026-10-03 IT WAS NOT ═════
   `FULL_WIDTHS` is {1920, 320}: every other width runs CORE ONLY unless
   `--all` is passed, and says so in its own section header. The expectation
   file recorded 154-155 surfaces per width with **no record of which mode
   that number came from**, so a 41-surface core run at 1440 was graded
   against a 155-surface DEEP expectation and reported as a 114-surface
   shortfall in the product.

   **NOTHING WAS SKIPPING. A NUMBER WRITTEN IN ONE MODE WAS BEING ENFORCED IN
   ANOTHER** - the same failure as a stale count in prose, one file along.
   Measured rather than argued: `--all` at 1440 takes it from 41 to 122.

   `widths` keeps its meaning - the DEEP walk - so every number already in the
   file stays true and nothing has to be re-blessed. `widths_core` is the new
   sibling. Each is written only by a run in its own mode, so the union and
   `--drop-missing` discipline above applies per mode rather than across the
   two, which is the only way a core run can never narrow a deep baseline. */
const EXPECTED_KEY = () => (ALL ? "widths" : "widths_core");
const MODE_NAME = () => (ALL ? "deep" : "core");
/** The expectation map for the mode a given width actually ran in. */
const expectedMap = (doc, w) => (RAN_DEEP.get(w) ? (doc.widths || {}) : (doc.widths_core || doc.widths || {}));
const WRITE_EXPECTED = process.argv.includes("--write-expected");

// **THE LEDGER — WHETHER A WIDTH IS FLAKY IS ARITHMETIC, NOT A MEMORY.**
//
// 1440 aborted once and truncated its tour three times in five runs on
// 2026-09-20, and every one of those runs reported itself honestly and in
// isolation. Nothing anywhere held the five together, so a broken instrument
// read as a bad afternoon — and the only person who could see the pattern was
// whoever happened to have watched all five.
//
// **IT FAILS ON A RATE, NEVER ON ONE BAD RUN.** Andrew, 2026-09-20: *"one
// abort is noise, four out of five is a broken instrument, and only a count
// can tell those apart."* Failing on a single abort would make every transient
// timeout a red line somebody learns to re-run past, which is the same disease
// as a receipt that cannot tell stale from broken.
//
// The window is the last five runs per width and the bar is MORE THAN TWO of
// them bad. Five and three because that is the smallest window in which
// "usually fine, occasionally not" and "usually broken" are different shapes.
const LEDGER_PATH = new URL("../receipts/sweep-widths-ledger.json", import.meta.url);
const LEDGER_WINDOW = 5;
const LEDGER_MAX_BAD = 2;
// Rows for ONE width, oldest first. Pure, so the canary below can feed it a
// history that never happened and check the answer.
const ledgerVerdict = (rows) => {
  const win = rows.slice(-LEDGER_WINDOW);
  const bad = win.filter((r) => r.outcome !== "complete");
  return {
    runs: win.length,
    bad: bad.length,
    // **UNDER FIVE RUNS IT DOES NOT JUDGE, AND IT SAYS SO.** A guard that
    // skips silently reads exactly like a guard that passed.
    judged: win.length >= LEDGER_WINDOW,
    broken: win.length >= LEDGER_WINDOW && bad.length > LEDGER_MAX_BAD,
    outcomes: win.map((r) => r.outcome),
  };
};

// `SWEEP_LEDGER_CANARY=1` — fabricated histories through the SHIPPED function,
// before any browser starts, so the check costs five seconds rather than nine
// minutes. Each case names the shape it stands for.
if (process.env.SWEEP_LEDGER_CANARY === "1") {
  const C = (name, outcomes, want) => {
    const v = ledgerVerdict(outcomes.map((o) => ({ outcome: o })));
    const ok = v.broken === want.broken && v.judged === want.judged;
    console.log(`${ok ? "ok  " : "FAIL"}  ${name.padEnd(34)} ${outcomes.join(",").padEnd(46)} `
      + `judged=${v.judged} broken=${v.broken} (${v.bad}/${v.runs} bad)`);
    return ok;
  };
  const all = [
    C("five clean runs", ["complete", "complete", "complete", "complete", "complete"], { judged: true, broken: false }),
    C("one abort is noise", ["complete", "complete", "aborted", "complete", "complete"], { judged: true, broken: false }),
    C("two bad is still noise", ["complete", "aborted", "complete", "short", "complete"], { judged: true, broken: false }),
    C("three bad is broken", ["complete", "aborted", "short", "complete", "aborted"], { judged: true, broken: true }),
    C("four of five is broken", ["aborted", "aborted", "short", "complete", "aborted"], { judged: true, broken: true }),
    C("three runs is not enough", ["aborted", "aborted", "aborted"], { judged: false, broken: false }),
    C("only the last five count", ["aborted", "aborted", "aborted", "aborted", "complete", "complete", "complete", "complete", "complete"], { judged: true, broken: false }),
  ];
  console.log(`\nLEDGER CANARY — ${all.filter(Boolean).length}/${all.length} cases as expected. `
    + `No browser was started and nothing was measured.`);
  process.exit(all.every(Boolean) ? 0 : 1);
}
// **ONE PATH PER MODE, NOT ONE PATH — 2026-09-19, and it took Andrew opening
// the page to catch it.** Every mode wrote to `artifacts/sweep-widths` and to a
// receipt keyed only on the WIDTHS, so an English run and a Spanish run of the
// same width overwrote each other's pictures AND each other's verdict. The
// contact sheet on screen was whichever ran last, and nothing on the page said
// which mode it was — **the same ambiguity that made the screenshots
// untrustworthy earlier the same night, one level up.**
//
// A mode that cannot be told apart from another mode in the artifacts is a
// mode nobody can check. The suffix is part of the identity, so it goes in the
// directory, the receipt id and the page title.
// **A KNOB THAT CAN MANUFACTURE A PASSING RUN MUST NOT OUTLIVE THE EXPERIMENT
// IT WAS BUILT FOR.** `SWEEP_TOUR_HOLD` held the tour walk at a slower tempo
// to prove the truncation was this script's own impatience. It proved it, the
// real fix landed, and it is gone — a switch that makes a check complete when
// the check cannot is a switch somebody reaches for on a bad afternoon. While
// it existed it had to be part of `MODE`, because its first four runs went
// into the ledger labelled `default` and two of them claimed a completion the
// sweep could not produce. `docs/gotchas.md` keeps that lesson, not the knob.
const MODE = `${process.env.LANG_APP === "es" ? "-es" : ""}${LITE ? "-lite" : ""}`;
const ART = `artifacts/sweep-widths${MODE}`;
// WHAT THE CONTACT SHEET CALLS ITSELF. A page that does not say which run made
// it is a page somebody reads as whichever run they were thinking of.
const LANG_ES = process.env.LANG_APP === "es";
const MODE_WORDS = [LANG_ES ? "Spanish" : "", LITE ? "reduced motion (?lite=1)" : ""]
  .filter(Boolean).join(", ");
// The measured record: one row per surface the run actually looked at.
const CERT = [];
// **A SURFACE THE DEMO CANNOT BE IN THE STATE FOR — ROADMAP 8.1b, 2026-09-19.**
//
// The two `subscription · …` surfaces have done this since they were written:
// print `NOT MEASURED — <reason>`, raise NO finding, and be absent from the
// expectation. **That is the mechanism this reuses, and nothing here is a
// second one** — the only thing added is that the skip is now RECORDED rather
// than only printed, so the expected-count gate can tell a surface that
// declared why it was unreachable from one that just went missing.
//
// **WHY THE SUBSCRIPTION SHAPE COULD NOT SIMPLY BE COPIED.** Those two labels
// are absent from `sweep-widths.expected.json` because the run that wrote it
// never measured them, so nothing anywhere says they are ALLOWED to be absent —
// it is an accident that reads like a decision. The three below are different:
// after about 08:45 they are reachable and must be measured, and before it they
// cannot exist. Deleting them from the expectation would be a screen that
// stopped being checked, which is the sentence the expectation file's own note
// warns about.
//
// **A SKIP MUST NOT BECOME A QUIET WAY TO NEVER BE MEASURED**, which is the
// whole risk of adding one. So a skip is not a claim, it is a MEASUREMENT: the
// caller hands over a probe, the probe re-asks whether the surface was
// reachable after all, and a skip declared over a reachable surface is REFUSED
// and fails the run. A declaration nobody can disprove is worth nothing.
const SKIPPED = [];
// **A WIDTH THAT DIED PARTWAY.** Separate from `SKIPPED` on purpose and not a
// second skip mechanism: a declared skip is a surface PROVED unreachable, and
// this is the opposite — nobody knows what those surfaces would have said.
// It exists so the gate can report "this width stopped" instead of printing
// ninety NEVER MEASURED lines that all have one cause.
let ATTEMPTING = null;   // the surface `say()` is on; read by the abort handler
const ABORTED = [];
let assertions = 0;
const canaries = [];
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

// **THE NEGATIVE CONTROL.** A `<div>` deliberately parked past the right edge,
// handed to `CHECK` on a real screen. If `CHECK` does not report it, `CHECK` is
// not looking, and every `clean` this run printed means nothing — so the run
// fails loudly rather than quietly succeeding. Report § "Discipline", rule 6.
const CANARY_CLASS = "sweep-canary-deliberate-overflow";
const runCanary = async (page, w) => {
  await page.evaluate((cls) => {
    const d = document.createElement("div");
    d.className = cls;
    d.textContent = "canary";
    // Static position, in flow, on `body` so no ancestor can clip it — the
    // three conditions under which `CHECK` is entitled to stay silent.
    d.style.cssText = "position:static;display:block;height:14px;background:#f00;"
      + `width:${document.documentElement.clientWidth + 400}px`;
    document.body.appendChild(d);
  }, CANARY_CLASS);
  const { rows } = await page.evaluate(CHECK);
  const caught = rows.some((r) => r.includes(CANARY_CLASS));
  await page.evaluate((cls) => document.querySelector("." + cls)?.remove(), CANARY_CLASS);
  canaries.push({ width: w, caught });
  console.log(`${"canary · overflow".padEnd(24)} ${caught
    ? "caught, as required — the finder is looking at " + w + "px"
    : "NOT CAUGHT — CHECK missed a defect handed to it on purpose. Every clean line above is void."}`);
  if (!caught) found++;
  return caught;
};

for (const w of SIZES) {
  // A width the caller asked for BY NUMBER is always deep — `sweep-widths 1440`
  // is somebody asking a question about 1440, and answering a narrower one
  // than they asked is the "a skipped check reads like a passing one" family.
  deep = ALL || WIDTHS.length > 0 || FULL_WIDTHS.has(w);
  const widthStart = Date.now();
  RAN_DEEP.set(w, deep);
  console.log(`\n══ ${w}px ══${deep ? "" : " core only, --all for everything "}════════════════════════════════`);
  // **ONE WIDTH'S ACCIDENT USED TO END THE RUN — ROADMAP 8.1b's flake,
  // 2026-09-19.** A click that timed out at 320 threw out of this loop, past
  // the gate, past the contact sheet and past the receipt: **three widths of
  // work produced no artifact and no verdict at all**, and the output ended in
  // a Playwright stack rather than in a number. This file's own Tomorrow block
  // calls that the most expensive way it can fail.
  //
  // So a width is its own unit of work now. It still FAILS — loudly, by name,
  // and the run exits non-zero — but the other widths finish and everything
  // downstream still runs on what was measured. **The catch must never make a
  // width look complete:** the abort is recorded, the gate reports it, and the
  // receipt's four counts no longer agree, so `receipt.mjs` fails it too
  // without being told to.
  //
  // `ctx` is a `let` above the `try` for one reason: the handler has to close
  // the browser context. A leaked context per aborted width is how a long run
  // runs the machine out of memory.
  let ctx = null;
  try {
  ctx = await browser.newContext({
    viewport: { width: w, height: heightFor(w) }, deviceScaleFactor: 1,
    ...(signedIn ? { storageState: signedIn } : {}),
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: () => Promise.resolve(), configurable: true });
  });
  // **BOTH LANGUAGE KEYS, BEFORE ANY PAGE RENDERS — 2026-09-19.**
  //
  // The dashboard's key was set with the tour flags, a hundred lines below and
  // AFTER sign-in, so the nine surfaces measured before that point — the
  // booking page, the four marketing pages and the four sign-in screens — were
  // English in every "Spanish" run. And `dp.lang` was never set at all: it is
  // the CUSTOMER's key, a different scope on purpose, and nothing here knew it
  // existed.
  //
  // `addInitScript` rather than a `page.evaluate` after load, because the
  // question is what the page renders on its FIRST paint. Setting a language
  // after the screen is drawn needs a reload to take, and a reload is a thing
  // to forget.
  await speakSpanish(ctx);
  const page = await ctx.newPage();
  // NOTHING WAITS THIRTY SECONDS. The default makes a run that has gone wrong
  // look like a run that is being thorough, and this script is minutes long
  // even when it is healthy — a stall has to announce itself.
  page.setDefaultTimeout(15000);
  // A CRASHED SCREEN MEASURES CLEAN, AND THAT IS THE OLDEST FAILURE SHAPE IN
  // THIS REPO WEARING NEW CLOTHES (roadmap 2.13, 2026-09-04). A one-word
  // mistake took the gear's whole index down; `ErrorBoundary` caught it and
  // drew four short lines, and four short lines are not off the right edge,
  // not outside their parent, not scrolling sideways and not stacked without
  // a gap — so every check this script owns passed on a screen that did not
  // exist. It printed "the gear   clean" and then reported the twelve rows
  // beneath it as NO SUCH ROW, which reads like a renamed control rather than
  // a crash. The boundary's own heading is the cheapest possible tell.
  // **TWO BUGS LIVED IN FOUR CALL SITES HERE AND THEY HID EACH OTHER —
  // 2026-09-12.**
  //
  // (1) `say` INCREMENTS `found` ITSELF and returns nothing, so four call sites
  //     written as `await say(...)` added `undefined` — making `found`
  //     NaN from the first sign-in screen onward. `NaN` is falsy, so the verdict
  //     printed "clean" and `process.exit(found ? 1 : 0)` exited 0. **This tool
  //     reported success no matter what it measured**, and one run printed 38
  //     real geometry findings above that word.
  // (2) Those same four calls passed a SECOND ARGUMENT, a different page, and
  //     `say` never had a second parameter. It measured the outer `page` every
  //     time, so the four screens behind the sign-in form were never measured at
  //     all — including on runs that did report problems.
  //
  // The second is why the first survived: the four calls that broke the counter
  // were also the four that measured nothing, so no finding ever came out of
  // them to contradict the word "clean".
  const say = async (label, target = page) => {
    // **THE SURFACE BEING ATTEMPTED, SET BEFORE ANYTHING CAN THROW.** An abort
    // used to report only the TIMEOUT and a count: "after 28 surface(s) -
    // locator.click: Timeout 15000ms exceeded". That names the instrument's own
    // symptom, never the thing it died on, so four widths printed an identical
    // sentence and nobody could tell whether they died in the same place.
    /* **SWEEP_SHORT_CANARY=1 : THE OTHER HALF OF THE NEGATIVE CONTROL.**
       An abort and a SHORT run fail differently and have to be proved
       separately: an abort throws and is caught, while a short width walks to
       the end having quietly not visited things. This drops one surface at one
       width without erroring, which is exactly what the real shortfall looks
       like, and the expected-count gate must then REFUSE that width rather
       than count its remaining surfaces. ROADMAP 9.11c. */
    if (process.env.SWEEP_SHORT_CANARY && w === 320 && /Money . Lifetime/.test(label)) return;
    ATTEMPTING = label;
    /* **AND CLEARED WHEN THE SURFACE IS DONE**, because leaving it set made the
       abort line say "ON SURFACE X ... the last one to complete was X" - the
       same name twice, which reads as "it died measuring X" when what actually
       happened is that it died in the NAVIGATION after X. The 1920 abort said
       `setup · step 8 of 12` twice and the real failure was a tab click two
       sections later. A label that is almost right is worse than none. */
    /* **--break=abort : THE NEGATIVE CONTROL ON THE TWO CHANGES ABOVE.**
       With no abort left in the run, nothing proves that an aborting width
       is excluded from the verdict or that its surface gets named - a guard
       whose trigger never fires is a decoration. This throws on one surface
       at one width - the shape a real abort had - and the run must
       then go RED rather than short. ROADMAP 9.11b. */
    if (process.env.SWEEP_ABORT_CANARY && w === 1440 && /history/i.test(label)) {
      /* **THE MESSAGE SAYS IT IS SYNTHETIC, AND THE FIRST VERSION DID NOT.**
         It used to fabricate a Playwright call log ending `<div
         class="tourblock"> intercepts pointer events` - plausible, specific,
         and completely invented. A manager reading the run quoted it back as
         evidence of a real cause and went to theme.css to check the overlay,
         because nothing in the line said it came from a canary. **A sabotage
         that imitates a real diagnosis is a lie the check tells about
         itself.** */
      throw new Error("SWEEP_ABORT_CANARY: deliberate synthetic abort, NOT a real failure."
        + " No call log follows, because nothing actually timed out.");
    }
    if (ONLY && !label.toLowerCase().includes(ONLY.toLowerCase())) return;
    const broken = await target.evaluate(() => /That didn't load/.test(document.body.innerText));
    if (broken) {
      // textContent, not innerText: the reason lives inside a CLOSED <details>,
      // which innerText correctly reports as invisible — and an empty reason
      // beside the word CRASHED is the least useful half of this message.
      const why = await target.evaluate(() =>
        (document.querySelector("details")?.textContent ?? "").replace("Technical detail", "").trim());
      console.log(`${label.padEnd(24)} CRASHED — the error boundary is on screen: ${why}`);
      found++;
      return;
    }
    // **(3) `clean` OVER A BLANK PAGE - measured 2026-09-13, lane C.** This
    //     script was run against a production bundle built from a tree whose
    //     `app/src` and `app/public` were blanked to zero bytes: an empty
    //     `#root`, no stylesheet, nothing on screen. It printed
    //     `book . step 1  clean`, `landing  clean`, `pricing  clean`,
    //     `terms  clean` and `privacy  clean` - FIVE green verdicts over
    //     nothing - before the sign-in wait finally threw. `CHECK` is a
    //     FINDER, so no elements means no findings means the word `clean`,
    //     and the only lines that told the truth were the three named
    //     sub-checks that count their own rungs and rows.
    //
    //     So `say` counts its own subject now. A surface with no elements and
    //     no text in it was not measured, and saying so costs one line.
    const seen = await target.evaluate(() => {
      const r = document.getElementById("root") || document.body;
      return { els: r.querySelectorAll("*").length, text: (r.innerText || "").trim().length, peek: r.innerHTML.slice(0, 120).replace(/\s+/g, " ") };
    });
    if (!seen.els || !seen.text) {
      console.log(`${label.padEnd(24)} NOT MEASURED - the page rendered nothing (${seen.els} elements, ${seen.text} characters) :: ${seen.peek || "(empty)"}`);
      found++;
      return;
    }
    probed += seen.els; surfaces++;
    // **EVERY ENTRANCE JUMPED TO ITS END BEFORE THE GEOMETRY IS READ —
    // 2026-09-20, and it cost a whole item to find out why.**
    //
    // `tour · step 28` was reported as `past-parent +14px p.body.tourline in
    // div` at 392 and 320, reproduced four runs running. There is no overflow.
    // `theme.css` has `@keyframes step-fwd { from { transform: translate3d(
    // 14px, 0, 0); } }` on that exact paragraph, `getBoundingClientRect()`
    // reports the TRANSFORMED box, and a caption read during its entrance is
    // 14px to the right of where it lives. Measured both ways by
    // `scripts/tour-caption.mjs`: the keyframe replayed and paused gives
    // `matrix(1, 0, 0, 1, 14, 0)` and +14px; the same caption with its
    // animations finished is 302 wide inside a box 302 wide, flush, at both
    // widths and in `?lite=1`.
    //
    // **`settle()` IS NOT ENOUGH AND CANNOT BE.** It returns once nothing is
    // running and the DOM has been quiet — and an element re-keyed by React
    // starts its animation on a LATER frame than the mutation that created it,
    // so the quiet it waits for happens in the gap before the entrance begins.
    // Waiting longer is not the fix either: that is a race being tuned rather
    // than removed.
    //
    // So the geometry is read from a page whose animations are over, which is
    // the only state in which an edge comparison means anything.
    // `screenreader-structure.mjs` has done this since it was written; this
    // file, which measures nothing BUT edges, did not.
    await target.evaluate(() => document.getAnimations().forEach((a) => {
      // An infinite animation — the drifting ground — has no end to jump to,
      // and `finish()` on one throws. It also never settles, which is why
      // `settle()` excludes it too.
      try {
        const t = a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming();
        if (!t || t.iterations !== Infinity) a.finish();
      } catch { /* an animation that cannot be finished is one we leave alone */ }
    }));
    const { rows, asked, sig } = await target.evaluate(CHECK);
    // **AND IS IT ACTUALLY IN THE LANGUAGE THIS RUN CLAIMS?** Nothing asked
    // that until 2026-09-19, which is how nine surfaces were reported as
    // Spanish while rendering English: the geometry checks do not read words,
    // so a language that never applied measures exactly like one that did.
    //
    // Counting, not sampling: how many strings the catalogue knows appear in
    // their SPANISH form, against how many appear in their English form. One
    // hand-picked sentence would be a check coupled to a spelling, which is
    // this file's most-repeated finding; a tally over the whole surface is a
    // check on the BEHAVIOUR.
    if (LANG_ES) langCheck(label, sig);
    found += rows.length;
    assertions += asked;
    // THE CONTACT SHEET'S FRAME — step 4 of the report's week-one sequence. A
    // number in a log is not something a person scans; eighty-three pictures on
    // one page are. Taken BEFORE the findings print, so a failing surface always
    // has its own picture sitting beside its own complaint.
    //
    // **AND THE PICTURE IS ALSO THE SENTINEL.** The first version of that check
    // fingerprinted the DOM — pathname, headings, the first 400 characters of
    // the topmost layer — and reported four healthy pairs as the same screen,
    // because the text it could reach was identical while the screens plainly
    // were not (136KB, 102KB and 98KB of visibly different PNG). A check that
    // fires on a healthy run is a check somebody scrolls past.
    //
    // Two labels whose screens rendered to the SAME BYTES are the same screen.
    // That is not a heuristic about the DOM, it is the thing a person would
    // compare, and it needs no code of its own — the bytes were already here.
    // ponytail: the viewport, not the full page. Two long screens that differ
    // only below the fold would fingerprint alike; switch to `fullPage: true`
    // if that ever turns out to be a real case rather than a theoretical one.
    const shot = `${ART}/${w}/${String(CERT.length).padStart(3, "0")}-${slug(label)}.png`;
    mkdirSync(`${ART}/${w}`, { recursive: true });
    const png = await target.screenshot({ path: shot }).catch(() => null);
    // A surface with no screenshot gets a fingerprint that can collide with
    // nothing. It is already a failure by other means; it must not become a
    // false sentinel hit on top.
    const pixelPrint = png ? createHash("sha1").update(png).digest("hex") : `unshot-${CERT.length}`;
    const fingerprint = createHash("sha1").update(sig).digest("hex");
    CERT.push({ width: w, label, elements: seen.els, asked, findings: rows, fingerprint, pixelPrint, sig, shot });
    ATTEMPTING = null;
    console.log(`${label.padEnd(24)} ${rows.length ? "\n  " + rows.join("\n  ") : "clean"}`);
  };
  // The sheet opens at a 56vh peek. Pull it to full so the rest of the screen
  // is laid out and measurable, not just the part currently on screen.
  // **CLOSING A PANEL IS A THING TO WAIT FOR, NOT A NUMBER OF MILLISECONDS —
  // ROADMAP 8.1b's flake, fixed 2026-09-19.**
  //
  // A full run died at 320 clicking the Victor Salas row: `<div
  // class="sheet-backdrop">…</div> intercepts pointer events`. The block before
  // it pressed Escape twice with `settle(page, 700)` after each.
  //
  // **AND THE CAUSE IS NOT THE ONE THE SYMPTOM SUGGESTS.** `settle()` being a
  // cap on a quiet DOM rather than a wait for a thing is this file's oldest
  // lesson, so "a 180ms exit animation raced a 700ms pause" is the obvious
  // reading — and it is wrong, because Playwright then retries a blocked click
  // for fifteen seconds and would have won. **Measured instead, at 320:**
  //
  //   client record open :  1 sheet  "Marcus Webb (562) 555-0142…"
  //   job opened         :  1 sheet  "Marcus Webb Thursday, October…"
  //   Escape, +3000ms    :  1 sheet  "Marcus Webb (562) 555-0142…"
  //   second Escape      :  0 sheets
  //
  // **The client record and the job record are ONE sheet whose contents swap,
  // and the first Escape is a BACK STEP inside it, not a close.** So the old
  // code's real fault was assuming one press per open thing: press two Escapes
  // too close together and the second lands mid-transition and is lost, the
  // sheet stays open for ever, and the click after it can never land. The
  // 700ms was not too short — the SECOND press was the one that mattered and
  // nothing checked whether it had worked.
  //
  // So this asks for the state the next click actually needs — **nothing
  // covering the page** — and keeps dismissing until it has it. Bounded, and
  // loud rather than patient if it cannot get there: an overlay that will not
  // go is a finding, because every measurement after it is of a screen with
  // something on top.
  //
  // The 900ms inside the loop is a bound on ONE transition, not an assumption
  // that the job is done — the loop re-asks the real question every time round.
  // **AND IT HAS TO KNOW BOTH CONTAINERS — caught by the expected-count gate,
  // 2026-09-19, one run after this helper was written.** The first version
  // counted `.sheet` only. Above `--wrap` a record is not a sheet, it is
  // `.col-2.record` (`RecordHost` chooses), so at 1440 this saw zero sheets and
  // pressed Escape **zero times** where the old code pressed it twice — the
  // client record stayed open for the rest of the width and the walkthrough
  // block later measured nothing at all. Seven `tour · step N` surfaces went
  // missing with no line anywhere saying why, and **the only reason it was not
  // shipped as a clean run is the gate counting them**. Same two-container
  // lesson as `inRecord()` in the job-record block, in a second home the same
  // week.
  const OVERLAY = ".sheet, .col-2.record";
  const closeOverlay = async (after = 300, presses = 5) => {
    for (let i = 0; i < presses; i++) {
      if (!(await page.locator(OVERLAY).count())) { await settle(page, after); return true; }
      await page.keyboard.press("Escape");
      await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 0,
        OVERLAY, { timeout: 900 }).catch(() => {});
    }
    const left = await page.locator(OVERLAY).count();
    if (left) {
      console.log(`${"an overlay would not close".padEnd(24)} NOT MEASURED — ${left} panel(s) still open `
        + `after ${presses} Escapes; everything measured after this is behind one`);
      found++;
      await settle(page, after);
      return false;
    }
    await settle(page, after);
    return true;
  };

  const grow = async () => {
    await page.evaluate(() => { const s = document.querySelector(".sheet"); if (s) s.style.height = "92vh"; });
    await settle(page, 400);
  };
  // A NESTED SHEET IS INSIDE ITS PARENT'S DOM, so `querySelector(".sheet")`
  // returns the RECORD and not the dialog that opened on top of it —
  // `Sheet.jsx`'s own focus comment says so. `grow()` is left exactly as it
  // was, because changing it would change what all 84 already-certified
  // surfaces measure; this is its sibling and only `openSheet` calls it.
  const growAll = async () => {
    await page.evaluate(() => document.querySelectorAll(".sheet").forEach((s) => { s.style.height = "92vh"; }));
    await settle(page, 400);
  };

  // **A DIALOG IS A SURFACE, AND TWELVE OF THEM HAD NEVER BEEN NAMED — 2026-09-18,
  // ROADMAP 8.1.** That item asks for "every dashboard tab and dialog … and
  // every pop-up", and the expectation file answered with five: the day sheet,
  // the expense form, the quote, the campaign compose and the two plan forms.
  // The product renders **fourteen** `<Sheet>`s plus a photo lightbox.
  //
  // This is the "two gear screens were never in the list" defect from step 3 of
  // the report's week-one sequence, one shape along: those screens were missing
  // from the QUESTION rather than from the run, and so were these. A dialog
  // nobody names comes out clean in exactly the same way.
  //
  // **ESCAPE CLOSES BOTH.** `Sheet.jsx` binds its Escape handler to `window`,
  // not to its own panel, so every open sheet hears the same keypress and a
  // dialog opened on top of the job record takes the record with it. Hence
  // `close: false` where the caller needs the parent to survive, and hence the
  // job-record block below re-opens the record rather than assuming it is still
  // there — an assumption is how a measurement of the wrong screen gets a name.
  // **`appear()` WAITS FOR `attached`, NOT `visible`, AND THAT IS NOT A
  // MISTAKE IN IT — it is the wrong instrument HERE.** A trigger that exists
  // and cannot be pressed passed this guard, and the click behind it then hung
  // for fifteen seconds and threw, which took the whole remaining sweep with
  // it: four widths lost to one hidden `<span>`. That is the most expensive
  // way this file can fail and its own Tomorrow block says so in as many
  // words. So this one asks for `visible`, and it CATCHES — a dialog that
  // cannot be opened is a finding, never the end of the run.
  // **THE DECLARED SKIP.** Same printed line as the two `subscription · …`
  // surfaces, same silence in `found` — and one addition: `reachable` is
  // re-asked here, so the run proves the surface was genuinely out of reach
  // rather than taking the caller's word for it.
  //
  // `reachable()` returns a COUNT, not a boolean, so the refusal can say what
  // it found. Anything above zero and the skip is refused: that is a caller
  // claiming a screen could not be reached while it was sitting there, which
  // is exactly the silent-skip failure this whole certification exists to
  // stop, and it has to be louder than the thing it was hiding.
  const declareSkip = async (label, reason, reachable) => {
    const n = await reachable().catch(() => 0);
    if (n > 0) {
      console.log(`${label.padEnd(24)} SKIP REFUSED — declared unreachable, and the probe found ${n}. `
        + `A skip over a surface that was there is a screen removing itself from the check.`);
      found++;
      return false;
    }
    addSkip(SKIPPED, { width: w, label, reason, evidence: probeEvidence(n) });
    console.log(`${label.padEnd(24)} NOT MEASURED — ${reason}`);
    return true;
  };

  const openSheet = async (label, trigger, { close = true, ms = 1200 } = {}) => {
    const reachable = await trigger.first().waitFor({ state: "visible", timeout: 6000 })
      .then(() => true).catch(() => false);
    if (!reachable) {
      console.log(`${label.padEnd(24)} NO SUCH BUTTON — no visible trigger, so this dialog was never opened`);
      found++;
      return false;
    }
    // **COUNT THE SHEETS BEFORE AND AFTER, NEVER `appear(".sheet")`.** The
    // first draft of this guard waited for a `.sheet` to exist, and two of
    // these dialogs open ON TOP of a sheet — so the thing it waited for was
    // already on screen before the click and the guard could not fail. A guard
    // that cannot fail is this repo's subject arriving inside the instrument
    // written to check for it (`docs/gotchas.md`, and step 2 of the report's
    // own sequence). One more sheet than there was is the only wording that
    // means the dialog opened.
    const before = await page.locator(".sheet").count();
    const pressed = await trigger.first().click({ timeout: 8000 })
      .then(() => true).catch((e) => { console.log(`${label.padEnd(24)} NOT MEASURED — the trigger would not take a `
        + `click: ${String(e).split("\n")[0]}`); found++; return false; });
    if (!pressed) return false;
    await settle(page, ms);
    const arrived = await page.waitForFunction(
      (n) => document.querySelectorAll(".sheet").length > n, before, { timeout: 5000 },
    ).then(() => true).catch(() => false);
    if (!arrived) {
      console.log(`${label.padEnd(24)} NOT MEASURED — the button was pressed and no new sheet arrived `
        + `(${before} open before, ${await page.locator(".sheet").count()} after)`);
      found++;
      return false;
    }
    await growAll();
    await say(label);
    if (close) { await page.keyboard.press("Escape"); await settle(page, 700); }
    return true;
  };

  await page.goto(`${BASE}/book/demo-detail${LITE}`, { waitUntil: "domcontentloaded" });
  await settle(page, 3200);
  await say("book · step 1");
  // THE CANARY GOES HERE AND NOWHERE ELSE: on the first surface of every width,
  // on a page that is always present, before anything else can have gone wrong.
  // A negative control at the END of a run is a control that a crash skips —
  // and a crashed run is exactly when you most need to know the finder works.
  await runCanary(page, w);

  // THE LANDING PAGE, and it had NEVER BEEN MEASURED BY ANYTHING until
  // 2026-09-05 — the page a visitor meets first, and the only surface in the
  // product no script had ever opened. It went in beside the pricing page
  // because that is the item that noticed, and it was measured before being
  // added rather than after: clean at all five widths, so adding it changes
  // no verdict today and catches the next change to it.
  await page.goto(`${BASE}/${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
  await settle(page, 2600);
  await say("landing");

  // THE PRICING PAGE (roadmap 2.20 stage 2). Public, no session, so it is
  // measured here beside the booking page rather than after the sign-in.
  //
  // ADDED IN THE CHANGE THAT BUILT IT, which is the only part of this worth
  // a comment: nine of the states in this file were added by the LATER item
  // that found them broken. It is also the first thing a visitor who presses
  // any plan button on the landing page now sees.
  //
  // The ladder is what this measures. It is three rows of a sentence, a mono
  // figure and a button, and it changes shape twice on the way down to 320 —
  // so a clean run at 1440 says nothing about it. The founding strip only
  // exists while spots remain, so its absence is PRINTED rather than skipped:
  // a page measuring one section short is byte-identical to one measuring
  // clean.
  await page.goto(`${BASE}/pricing${LITE}`, { waitUntil: "domcontentloaded" });
  // THE STRIP IS A SUPABASE READ AND THE LADDER IS NOT, so they are waited
  // for differently. `appear()` rather than settle-then-count on the strip:
  // it lost that race at the FIRST width of the first full run and printed
  // NOT MEASURED, which is the `else` doing exactly the job it was added for.
  await appear(page.locator(".rung"));
  await appear(page.locator(".offerbar"));
  await settle(page, 2400);
  await say("pricing");
  const rungs = await page.locator(".rung").count();
  if (rungs !== 3) {
    console.log(`${"pricing · the ladder".padEnd(24)} NOT MEASURED — expected 3 rungs, found ${rungs}`);
    found++;
  }
  if (!(await page.locator(".offerbar").count())) {
    console.log(`${"pricing · the offer".padEnd(24)} NOT MEASURED — no founding strip. Either the lookup lost a race or all three spots are taken; public.founding_offer() answers it.`);
  }

  // ROADMAP 7.1 — /terms and /privacy, walked in the change that built them.
  // They are prose in a two-column grid that collapses at 640, a width this
  // list does not visit, so what is watched here is the 320 floor and the
  // desk's 15rem term column. **Their rows reveal on SCROLL** — eight or nine
  // sections is more than a fold — and an unrevealed node still has a full
  // box, so the count below asks whether the sections EXIST rather than
  // whether they are visible; the reveal itself is the one thing this script
  // cannot see (`data-rv`, roadmap 2.20 stage 2).
  for (const doc of ["terms", "privacy"]) {
    await page.goto(`${BASE}/${doc}${LITE}`, { waitUntil: "domcontentloaded" });
    await appear(page.locator(".legalrow"));
    await settle(page, 1200);
    await say(doc);
    const rows = await page.locator(".legalrow").count();
    if (rows < 5) {
      console.log(`${(doc + " · the sections").padEnd(24)} NOT MEASURED — expected the ruled list, found ${rows} rows`);
      found++;
    }
  }

  // ── THE WAY IN, AT THIS WIDTH ─────────────────────────────────────────
  // A throwaway signed-out context, because the block below only meets the
  // sign-in form on the FIRST width — every later one restores the saved
  // session and goes straight to the dashboard. See the note down there.
  {
    const anon = await browser.newContext({
      // `heightFor(w)`, the same rule the main context uses — 1080 at 1920 and
      // 900 at a laptop, never the phone's 844 at a desk width.
      viewport: { width: w, height: heightFor(w) }, deviceScaleFactor: 1,
    });
    await speakSpanish(anon);
    const p2 = await anon.newPage();
    p2.setDefaultTimeout(15000);
    try {
      await p2.goto(`${BASE}/app${LITE}`, { waitUntil: "domcontentloaded" });
      await p2.waitForSelector("input[type=email]", { timeout: 20000 });
      await settle(p2);
      await say("the way in", p2);
      const make = p2.locator("form button.btn").filter({ hasText: NAMED_TEXT("Create an account") });
      if (await make.count()) {
        await make.click();
        await settle(p2);
        await say("the way in · new account", p2);
      } else {
        console.log(`${"the way in · new account".padEnd(24)} NOT MEASURED — no "Create an account" button`);
        found++;
      }
      const forgot = p2.locator("form button.btn").filter({ hasText: NAMED_TEXT("I already have an account") });
      if (await forgot.count()) await forgot.click();
      const reset = p2.locator("form button.btn").filter({ hasText: NAMED_TEXT("I forgot my password") });
      if (await reset.count()) {
        await reset.click();
        await settle(p2);
        await say("the way in · reset", p2);
      } else {
        console.log(`${"the way in · reset".padEnd(24)} NOT MEASURED — no "I forgot my password" button`);
        found++;
      }
      // ── ROADMAP 8.18 — THE SIGN-IN SCREEN WITH SOMEBODY PARKED ────────
      // A STATE, not a page: it only exists when another account is signed in
      // on this browser, which no walk can reach. Written into the same
      // change that built it, because this repo has now found the same gap a
      // dozen times — *the script walks NAVIGATION, and a state you reach by
      // pressing something INSIDE a screen is not navigation.*
      //
      // Two rows on purpose: one address long enough to be the real risk at
      // 320, and one short, so the card is measured at both extremes.
      await p2.evaluate(() => {
        const row = (id, email) => ({
          userId: id, email, access_token: "x", refresh_token: "y",
          business: null, parked_at: Date.now(),
        });
        try {
          localStorage.setItem("dp.accounts", JSON.stringify([
            row("sweep-1", "a-very-long-address-for-the-320-floor@northsidedetailco.example"),
            row("sweep-2", "ana@cedar.example"),
          ]));
        } catch { /* private mode */ }
      });
      await p2.reload({ waitUntil: "domcontentloaded" });
      await p2.waitForSelector("input[type=email]", { timeout: 20000 });
      await settle(p2);
      if (await p2.locator("[data-parked-accounts]").count()) {
        await say("the way in · parked", p2);
      } else {
        // A GUARD THAT SKIPS MUST PRINT. Six measurements vanishing is
        // byte-identical to six measurements passing.
        console.log(`${"the way in · parked".padEnd(24)} NOT MEASURED — no [data-parked-accounts] block`);
        found++;
      }
    } catch (e) {
      console.log(`${"the way in".padEnd(24)} NOT MEASURED — ${String(e.message).slice(0, 80)}`);
      found++;
    } finally {
      await anon.close();
    }
  }

  await page.goto(`${BASE}/app${LITE}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    // **THE WAY IN, MEASURED — roadmap 2.25, and until this block NOTHING in
    // this repo had ever looked at it.** This script has walked past the
    // sign-in form on every run since it was written: it fills the two fields
    // and presses the button, which exercises the PATH and measures none of
    // the geometry. It is the first screen anybody meets, it is the one a
    // detailer lands on from a password-reset email, and it is the only screen
    // in the product that was never swept at any width.
    // **AND IT IS MEASURED AT EVERY WIDTH, WHICH TOOK A SECOND CONTEXT.**
    // The obvious place is right here, and right here it runs ONCE: the first
    // width signs in through the real form and every later width restores the
    // saved session, so `input[type=email]` is on screen exactly one time in
    // a five-width run. **A layout measured at one width is the thing this
    // whole script exists to disbelieve.** So the page is walked in a
    // throwaway signed-out context of its own, per width, and this block —
    // which is genuinely signed out — is where that happens.
    await page.fill("input[type=email]", "demo@detailplatform.com");  // mail-sink: a dashboard login, never a recipient
    // Must match scripts/seed-demo.mjs, same as shoot-dashboard.mjs.
    await page.fill("input[type=password]", demoOwner().password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
    // Kept for the remaining widths. The FIRST width still signs in through
    // the real form, so the sign-in path is still exercised every run.
    signedIn = await ctx.storageState();
  }
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  // ROADMAP 8.17 STAGE 2B — `LANG=es` SWEEPS THE SPANISH DASHBOARD, and the
  // reason it is worth a flag is a MEASUREMENT rather than a worry: Spanish
  // runs longer than English word for word, and this product supports a
  // 320px floor where a settings row already puts its control under its
  // words. A translation that overflows is a layout defect the catalogue
  // cannot see and the DOM check cannot either — it reads TEXT, and text
  // that is off the edge is still text.
  //
  // Default English, so every existing baseline in CLAUDE.md keeps meaning
  // what it says.
  const lang = process.env.LANG_APP === "es" ? "es" : "en";
  await page.evaluate((lang) => {
    try {
      localStorage.setItem("dp.lang.app", lang);
    } catch { /* private mode */ }
  }, lang);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  await settle(page, 2200);

  // Once per width, not once per screen — every dashboard screen is inside the
  // same container, so eighteen copies of one fact would only be noise.
  if (w >= BP_SPLIT) {
    const col = await page.evaluate(() => {
      const m = document.querySelector(".app-main");
      if (!m) return null;
      const cs = getComputedStyle(m);
      return Math.round(m.getBoundingClientRect().width
        - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    });
    if (col !== null && col < MIN_DESK_COL) {
      const line = `dead-width     ${MIN_DESK_COL - col}px short  .app-main content is ${col}px in a ${w}px viewport`;
      narrow++;
      if (DESKTOP_SPEC_BUILT) { found++; console.log(`  ${line}`); }
      else console.log(`  ${line}  (not gating until DESKTOP_SPEC_BUILT)`);
    }
  }

  // **ADDRESSED BY `data-tour`, NEVER BY NAME — roadmap 8.17 stage 2b.**
  // The rail said "Today" until the dashboard learned Spanish, where it says
  // "Hoy", and a name-based locator then times out for fifteen seconds on
  // the FIRST tab and takes the whole run with it. Same family as the auth
  // form and the booking page's `.bk-chip`: a script that reaches for a WORD
  // breaks the day the word changes, and a translation changes every word.
  // The label stays in the list because it is what the output is read by.
  for (const [key, t] of [["today", "Today"], ["calendar", "Calendar"],
    ["money", "Money"], ["clients", "Clients"], ["business", "Business"]]) {
    await page.locator(`.tabbar button[data-tour="${key}"]`).first().click();
    await settle(page, 1700);
    await say(t);
  }

  // **NEW BOOKING — the one dialog reachable from every dashboard screen, and
  // it had never been opened at any width.** It is the detailer taking a job
  // over the phone, so it is the most-used form in the product after the
  // customer's own, and its geometry risk is the tallest in the app: a service
  // picker, an add-on list, a date, a time and an address field in one column.
  // Addressed by `data-tour`, never by the aria-label, for the reason the tab
  // loop above gives — the label translates and a name-based locator then
  // stalls fifteen seconds on the first width.
  await openSheet("new booking", page.locator('[data-tour="new"]'), { ms: 1500 });

  // THE JOB RECORD IS A SCREEN AND WAS NEVER SWEPT. 26 of the product's 126
  // capabilities live on it, it is reached from four places, and until
  // roadmap 2.11 step 6 stage 2 rebuilt it nothing here had ever opened it —
  // so "clean" said nothing about the widest object in the app. Two jobs,
  // because the record's shape depends on the job's state: the LIT card is a
  // finished, unpaid job (Finalize payment, no Mark completed) and the first
  // plain row is one still to do (Mark completed, no money action).
  await page.locator(`.tabbar button[data-tour="today"]`).first().click();
  await settle(page, 1400);

  // ROADMAP 2.12 — THE REQUEST QUEUE AND THE QUOTE SHEET, and adding them
  // moved the two selectors below. `.card.attend` used to mean "the lit job";
  // since 2.12 a waiting request outranks everything else on this screen
  // (docs/dashboard-skeletons.md §6), so on the seeded demo `.card.attend` is
  // now a REQUEST card and the old selector would have quietly measured a
  // different object under the same label — a rename with no error, which is
  // the worst kind. The rail's own cards are addressed through `.dayrail` now.
  //
  // The quote sheet is behind a button, so it is a state this script has to
  // ENTER, exactly like the booking link's QR plate: measuring Today says
  // nothing about a form that only exists after a tap. `seed-demo.mjs` pins
  // two requests so the queue is always there.
  {
    const req = page.locator(".reqcard").first();
    if (!(await req.count())) {
      console.log("request queue".padEnd(24) + "NO REQUESTS (is the demo seeded in request mode?)");
      found++;
    } else {
      await req.locator("[role=button]").first().click();
      await settle(page, 1500);
      await grow();
      await say("job record · a request");
      await page.keyboard.press("Escape");
      await settle(page, 700);
      // Back to Today, then the quote sheet from the card's own button.
      await page.locator(`.tabbar button[data-tour="today"]`).first().click();
      await settle(page, 1400);
      // ADDRESSED BY ATTRIBUTE, NOT BY NAME — 2026-09-08. Under `LANG_APP=es`
      // this timed out at the FIRST width and took the whole sweep with it,
      // which is why the Spanish run had never once completed. The button's
      // words change twice over: "Quote" becomes "Re-quote" the moment a quote
      // exists, and both translate. `data-quote` has none of those problems and
      // is the same remedy the five rail buttons already use.
      const quoteBtn = page.locator('.reqcard [data-quote]').first();
      if (!(await appear(quoteBtn))) throw new Error("NO QUOTE BUTTON on any request card");
      await quoteBtn.click();
      await settle(page, 1300);
      await grow();
      await say("send a quote");
      await page.keyboard.press("Escape");
      await settle(page, 700);
    }
  }

  await page.locator(`.tabbar button[data-tour="today"]`).first().click();
  await settle(page, 1400);
  // TWO JOB STATES, AND WHICH DOOR THEY ARE BEHIND MOVED IN 2.12. They used to
  // be "the lit card" and "the first row"; a waiting request now takes the lit
  // treatment, so both are rows on the rail and they are told apart by the
  // rail NODE — `.landed` is a job that has finished, which on this seed means
  // finished and unpaid (Finalize payment, no Mark completed).
  //
  // WHICH OF THE TWO EXISTS DEPENDS ON THE CLOCK, and that was always true —
  // `seed-demo.mjs` reads every "completed" off the hour it is run, so a
  // morning sweep has no finished job and an evening one has no job still to
  // do. The old pair papered over it: its "to do" selector was bare
  // `.row-item`, which in the evening matched a FINISHED job and measured the
  // same record twice under two labels. Tomorrow is the door that is open at
  // any hour, so the still-to-do record comes from there instead.
  //
  // **AND "TO DO" STOPPED BEING MEASURED AT ALL — caught 2026-09-18 by reading
  // the expectation diff rather than the run.** The sweep at 23:23 printed
  // `none on the rail at this hour — see Tomorrow below` and carried on, so
  // the label simply left the file: a screen that quietly stops being checked,
  // which is the exact sentence the expectation file's own note warns about.
  // And the Tomorrow it defers to has never once opened (see below), so the
  // deferral pointed at nothing.
  //
  // `[data-tour="comingup"]` is the door that is open at every hour — the
  // confirmed jobs on the days after this one. The rail is still preferred
  // when the hour provides one, because a job on TODAY is the shape a detailer
  // meets most; the fallback only decides whether this label exists.
  const comingUp = page.locator('[data-tour="comingup"] .row-item');
  for (const [label, sel] of [["job record · finished", ".dayrail .row-item.landed"],
                              ["job record · to do", ".dayrail .row-item:not(.landed)"]]) {
    let job = page.locator(sel).first();
    if (label.endsWith("to do") && !(await job.count()) && await comingUp.count()) {
      console.log(`${"".padEnd(24)}(nothing still to do on today's rail at this hour — using the first Coming up job)`);
      job = comingUp.first();
    }
    if (!(await job.count())) {
      // **NAME THE CAUSE, BECAUSE THIS ONE READS AS A PRODUCT REGRESSION AND
      // IS NOT — measured the hard way at 00:07 on 2026-09-19.** A sweep run
      // in the small hours finds an EMPTY rail: `Today.jsx` draws a job as
      // finished from its STORED status (`status === "completed" && no
      // finalized_at`), `seed-demo.mjs` marks a job completed only once it has
      // ENDED, and before the first shift of the day finishes nothing has.
      // The gate was right, the product was untouched, and three surfaces went
      // NEVER MEASURED at three widths.
      //
      // **`finished` DECLARES A SKIP; `to do` DOES NOT.** `to do` has a real
      // fallback two lines up — the first `Coming up` job, which exists at
      // every hour — so if it still cannot be measured something is actually
      // wrong and it must fail. A skip is only honest where the state cannot
      // exist, and for a job still to do it always can.
      if (label.endsWith("finished")) {
        await declareSkip(label,
          "no finished job on today's rail yet. A job is finished once it has ENDED, so before "
          + "the first shift of the day completes this state cannot exist (ROADMAP 8.1b)",
          () => page.locator(".dayrail .row-item.landed").count());
        continue;
      }
      console.log(`${label.padEnd(24)} NOT MEASURED — nothing on today's rail and nothing coming up. `
        + `If the demo was seeded on an earlier DAY, that is the whole reason: re-seed `
        + `(node scripts/seed-demo.mjs) and run again.`);
      found++; continue;
    }
    await job.click();
    await settle(page, 1500);
    await grow();
    await say(label);
    await page.keyboard.press("Escape");
    await settle(page, 700);
  }

  // **THE JOB RECORD'S OWN TWO SHEETS.** `Finalize payment` is where a
  // detailer takes the money and `Send a text` is the message picker, and both
  // open ON TOP of the record — the only two-deep overlay in the product, and
  // the one place a 92vh sheet sits inside another 92vh sheet at 320. Neither
  // had ever been laid out at any width.
  //
  // ONE RECORD-OPEN EACH, on purpose. Escape reaches every sheet at once (see
  // `openSheet`), so the record is gone after the first dialog closes and
  // carrying on would measure whatever Today drew instead, under this label.
  // **SCOPED TO THE RECORD, AND THIS IS NOT A TIDINESS POINT — it is the
  // measured reason the first attempt at this block could not run, 2026-09-18.**
  // `getByRole("button", { name: "Finalize payment" }).first()` resolves to
  // TWO buttons at 392: the record's own, and the one on the Today rail card
  // SITTING BEHIND THE OPEN SHEET. Playwright reported both visible and
  // `.first()` was the one underneath — the sheet's backdrop is the only
  // reason it failed loudly instead of pressing a control on a screen nobody
  // was looking at and filing the result under this label.
  //
  // `.sheet` below --wrap, `.col-2.record` above it: `RecordHost` chooses, so
  // a scope that names only one of them measures nothing at the other half of
  // the widths — which is the same skipped-check-reads-like-a-passing-one
  // shape one level down.
  const inRecord = () => page.locator(".sheet, .col-2.record").last();
  for (const [label, btn] of [
    ["job record · finalize", () => inRecord().getByRole("button", { name: NAMED("Finalize payment") })],
    ["job record · send a text", () => inRecord().getByRole("button", { name: NAMED("Text"), exact: true })],
  ]) {
    await page.locator(`.tabbar button[data-tour="today"]`).first().click();
    await settle(page, 1400);
    // `.landed` is a finished, unpaid job — the only state that draws Finalize
    // payment. The same record carries Text, so one door serves both.
    const job = page.locator(".dayrail .row-item.landed").first();
    if (!(await job.count())) {
      // BOTH OF THESE OPEN FROM THE FINISHED JOB'S RECORD, so they are
      // unreachable for exactly the reason it is — one condition, three
      // surfaces, and each says so for itself rather than one of them
      // speaking for the other two.
      await declareSkip(label,
        "no finished job on today's rail yet, and this dialog opens from that record. Before the "
        + "first shift of the day completes there is nothing to finalize (ROADMAP 8.1b)",
        () => page.locator(".dayrail .row-item.landed").count());
      continue;
    }
    await job.click();
    await settle(page, 1500);
    await grow();
    await openSheet(label, btn(), { close: false });
    await page.keyboard.press("Escape");
    await settle(page, 700);
  }

  // **TOMORROW'S FIRST JOB: DELETED 2026-09-18, AFTER IT FINALLY RAN.**
  //
  // This block existed to measure "a confirmed booking that has not happened"
  // and it had NEVER MEASURED ANYTHING — it looked for a `.row-item` whose
  // text contained "Tomorrow", and `Today.jsx` draws that word as a `<p
  // class="jw-day">` SIBLING above the rows. Same shape as the 2026-09-16
  // setup-row eyebrow: the word is not inside the thing being matched, so no
  // seed and no width could ever have made it match, and its failure line
  // asked whether the demo was seeded.
  //
  // Pointed at the real door — `[data-tour="comingup"]` — **the sentinel
  // immediately failed it at 320 and 1440**: `upcoming` in `Today.jsx` filters
  // on date and `status !== "cancelled"`, so a pending REQUEST dated in the
  // future is in that list too, and being the furthest out it is the last row.
  // The block was opening the same record `job record · a request` had already
  // measured, under a second name. That is the collision the sentinel was
  // built for, on its first real outing.
  //
  // It is deleted rather than re-aimed because its subject is already covered:
  // `job record · to do` above now falls back to the FIRST "Coming up" job, so
  // a confirmed booking that has not happened is measured at every hour and by
  // name. A second selector picking its way around a request card would be a
  // surface kept alive for the sake of the line in the expectation file.

  // MONEY IS FIVE PERIODS, A RECORD AND A MODAL, AND THE SWEEP ONLY EVER SAW
  // ONE OF THEM — the same gap as the job record before stage 2 and the
  // calendar before stage 3. Clicking the tab measured the current month with
  // nothing open, so the period control (the one row on this screen that has
  // to hold ONE LINE at a desk and wrap 3 + 2 on a phone), the unpaid job and
  // the expense form had never been laid out at any width. The three kinds
  // below are the ones that change the row's width: "6 months" is the widest
  // label, "Week" the widest period LABEL ("Aug 30 – Sep 5"), and Lifetime is
  // the one that draws no stepper at all.
  // COME BACK FROM WHATEVER THE JOB-RECORD BLOCK LEFT OPEN. That block ends on
  // an open record in the second column, and arriving at Money with it still up
  // is why the period control was not there: the tab press lands, the screen
  // says Money, and the record is still holding the column the control is in.
  await page.keyboard.press("Escape");
  await settle(page, 500);
  await page.locator(`.tabbar button[data-tour="money"]`).first().click();
  // THE PERIOD CONTROL IS DRAWN AFTER THE MONEY READ, so `settle()` is the
  // wrong instrument for it — a cap on a repaint, never a wait for a network
  // round trip. This block was settle-then-count until 2026-09-06 and it lost
  // the race at 1440 in a full run, printing **NO SUCH PERIOD three times**,
  // which reads as three renamed controls rather than as one slow query.
  // Third instance of exactly this in this file (Monthly plans, Team, and now
  // Money) — `appear()` is the tool and it is at module scope for this reason.
  // A GUARD THAT SKIPS MUST PRINT. This was a bare `await appear(...)` whose
  // result nothing read, so a period control that never arrived stayed silent
  // here and surfaced fifteen seconds later as a click timeout on a DIFFERENT
  // line — pointing the next session at the wrong place entirely.
  if (!(await appear(page.getByRole("radio", { name: NAMED("Month"), exact: true })))) {
    console.log("Money · the period control".padEnd(24)
      + "NOT MEASURED — no Month radio; the money read may still be in flight");
  }
  await settle(page, 1600);
  for (const k of ["Week", "6 months", "Lifetime"]) {
    const chip = page.getByRole("radio", { name: NAMED(k), exact: true });
    if (!(await chip.count())) { console.log(`Money · ${k}`.padEnd(24) + "NO SUCH PERIOD"); found++; continue; }
    await chip.first().click();
    await settle(page, 1500);
    await say(`Money · ${k}`);
  }
  // CONDITIONAL, BECAUSE A MISSING CONTROL MUST NOT KILL THE RUN. This line
  // threw and took the whole Spanish sweep down twice — after the guard above
  // had ALREADY printed that the control was absent. A sweep that dies at the
  // first width measures nothing at the other four, and this repo's rule is
  // that a check is a diagnosis and never a gate.
  const monthChip = page.getByRole("radio", { name: NAMED("Month"), exact: true });
  if (await monthChip.count()) {
    await monthChip.first().click();
    await settle(page, 1500);
  }
  {
    const owed = page.locator(".card", { hasText: NAMED_TEXT("Mark paid") }).first();
    if (await owed.count()) {
      await owed.locator("[role=button]").first().click();
      await settle(page, 1500);
      await grow();
      await say("Money · an unpaid job");
      await page.keyboard.press("Escape");
      await settle(page, 700);
    }
    const add = page.getByRole("button", { name: NAMED("Add"), exact: true });
    if (await add.count()) {
      await add.first().click();
      await settle(page, 1200);
      await grow();
      await say("Money · add an expense");
      await page.keyboard.press("Escape");
      await settle(page, 700);
    }
    // **LOG A BULK JOB — the second dialog on this screen, and the sweep only
    // ever knew about the first.** It sits at the very bottom of Money, below
    // the figures, so it is also the control most likely to be reached with a
    // thumb on a phone. Its form is a count beside a money field on one row,
    // which is the shape that breaks first at 320 — the same shape the plan
    // form's own comment names.
    // **THIS LINE IS FIRST AID AND NOT THE FIX, AND THE DIFFERENCE IS THE
    // FINDING — 2026-09-20.** `c4058d3` renamed this control from *"Log a bulk
    // job"* to *"Add a fleet job"* in an ordinary copy pass, moved the Spanish
    // key in the same edit exactly as `CLAUDE.md` requires, and still took a
    // whole screen out of this sweep — because the sweep opens that sheet by
    // the WORDS ON IT. Changing the words here restores the measurement and
    // changes nothing about why it broke.
    //
    // **THE REAL ANSWER IS A TEST ID OR A SHARED CONSTANT.** Until this sheet
    // is addressed by something that does not change when the copy changes,
    // **every copy change in this product is one rename away from blinding a
    // check** — and `FOUND.md` lists the twenty-three English strings across
    // `scripts/*.mjs` that are load-bearing in exactly this way. The gate
    // caught this one by name and failed the run rather than going quiet,
    // which is the only reason it cost minutes instead of weeks. That is luck
    // held in place by one gate, not a property of the design.
    //
    // The inventory label keeps its old spelling on purpose: it is the name of
    // a SURFACE in the expectation file, not the name of the button, and
    // renaming it would drop a screen out of the baseline to cure a red.
    await openSheet("Money · log a bulk job",
      page.getByRole("button", { name: NAMED("Add a fleet job") }));
  }

  // THE CALENDAR IS THREE SCREENS AND THE SWEEP ONLY EVER SAW ONE. Until
  // roadmap 2.11 step 6 stage 3 this script clicked the Calendar tab, measured
  // the month, and moved on — so the day (four capabilities, three editors
  // that expand in place) and the history (a filter bar, a ruled list with
  // columns, month rules) were never opened at any width. Same family as the
  // job record before stage 2 and as `dead-width`: a check that never reaches
  // a thing reports exactly like a check that reached it and found nothing.
  await page.locator(`.tabbar button[data-tour="calendar"]`).first().click();
  await settle(page, 1500);
  {
    // The 2nd cell of the demo month carries two jobs; the panel opens under
    // the grid at every width now, so there is no sheet to grow.
    // **`:not(.other)`, found 2026-10-10 by 9.15a's run.** Since 9.4 the blank
    // squares before the 1st are `.cal-cell.other`, aria-hidden and never
    // visible. October 2026 starts on a Thursday, so `.cal-cell` nth(1) was a
    // blank and the click waited 15s and aborted the width.
    const cell = page.locator(".cal-cell:not(.other)").nth(1);
    if (await cell.count()) {
      await cell.click();
      await settle(page, 1600);
      await say("Calendar · a day");
      /* **THE PANEL HAS TO BE OPEN BEFORE ITS EDITORS CAN BE MISSING, AND
         NOBODY WAS ASKING.** All three editors printed "no such editor on this
         day" at EVERY width, at every run - a sentence about the DEMO DATA.
         Measured 2026-10-03 at 320: every one of the first twelve calendar
         cells opens a panel carrying all three editors. They were reachable
         the whole time. What was not happening was the panel opening, which
         the walk never checked, so a failure of this script to click was
         reported for ten days as a property of the tenant’s calendar.
         `say()` above measures whatever is on screen and is happy either way.
         So: wait for the panel, and if it does not come, say THAT. */
      const dayPanel = page.locator(".daypanel");
      await dayPanel.first().waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
      if (!(await dayPanel.count())) {
        await cell.click();
        await settle(page, 1600);
        await dayPanel.first().waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
      }
      const panelOpen = (await dayPanel.count()) > 0;
      if (!panelOpen) {
        console.log("Calendar · day".padEnd(24)
          + "NOT MEASURED — `.daypanel` never appeared after two clicks on the cell. "
          + "That is THIS SCRIPT failing to open the day, not the day being empty.");
        found++;
      }
      // The three state cards are the day's own editors and each expands in
      // place (W1). An unopened editor is a check that never reached it.
      for (const label of ["Block this day", "Hours", "How this day works"]) {
        // NAMED, because these are the day's own editors and every one of them
        // translates — addressed in English they were skipped in Spanish, and
        // the `continue` below made that look exactly like a clean run.
        const card = page.locator(".daypanel .card", { hasText: NAMED_TEXT(label) });
        if (!(await card.count())) {
          console.log(`Calendar · day, ${label}`.padEnd(24) + (panelOpen ? "NOT MEASURED — the panel is open and carries no such editor" : "NOT MEASURED — the panel never opened, so nothing can be said about this editor"));
          found++; continue;
        }
        await card.first().click();
        await settle(page, 900);
        await say(`Calendar · day, ${label}`);
        await card.first().click();
        await settle(page, 500);
      }
      /* **THE CLOSE BUTTON MAY SIMPLY NOT BE THERE.** All three editors
         above report "no such editor on this day" when the day is empty, so a
         `.first().click()` on a locator matching nothing is a guaranteed
         15-second abort rather than a finding. */
      const dayClose = page.locator(".daypanel .x");
      if (await dayClose.count()) {
        await dayClose.first().click();
        await settle(page, 600);
      } else {
        console.log("Calendar · day, close".padEnd(24) + "NOT MEASURED — the day panel was not open");
      }
    }
  }
  await page.getByRole("button", { name: NAMED("History"), exact: true }).first().click();
  await settle(page, 2200);
  await say("Calendar · history");
  {
    // The nine chips are behind one control below --wrap and in the second
    // column above it, so the open filter bar is a phone-only state.
    const filter = page.getByRole("button", { name: NAMED("Filter") });
    if (await filter.count()) {
      await filter.first().click();
      await settle(page, 700);
      await say("Calendar · filters open");
      await filter.first().click();
      await settle(page, 400);
    }
    const row = page.locator(".rows.cols.history .row-item").first();
    if (await row.count()) {
      await row.click();
      await settle(page, 1500);
      await grow();
      await say("Calendar · history job");
      await page.keyboard.press("Escape");
      await settle(page, 700);
    }
  }

  // AND THE CLIENTS BLOCK IS THE SIXTH PLACE, FOUND 2026-09-04 BY A NEW CHECK
  // REFUSING TO GO QUIET.
  //
  // Every state below is drawn from a Supabase read, and this block opened
  // with `settle()` then `count()` — the exact race the paragraph above
  // describes, in the one block nobody re-checked when that lesson landed.
  // **In `--lite` it lost at THREE of five widths**, and it lost SILENTLY:
  // every state here is guarded by `if (await ...count())`, so the sorts, the
  // lapsed filter, the compose sheet, the client record and the job from its
  // history all just did not happen, and the run printed
  // `Clients · the list   clean` and moved on. Six measurements vanishing is
  // indistinguishable from six measurements passing.
  //
  // **It was found only because roadmap 2.20 added a state that says NOT
  // MEASURED instead of skipping.** That is the whole argument for the else
  // branch on the bounced client below, and for writing one on the next state
  // added anywhere in this file: *a check that skips reads exactly like a
  // check that passes* is this repo's most repeated finding, and a guard that
  // prints is the cheapest possible cure.
  // CLIENTS' OTHER SCREENS — added 2026-09-02, roadmap 2.11 step 6 stage 5,
  // and it is the same gap a FOURTH time: clicking the Clients tab opened one
  // client sheet and measured nothing else, so the sort, the lapsed filter and
  // the job reached from a client's own history had never been opened at any
  // width. The list is also the one in the product whose LAYOUT changes when a
  // record opens — full-bleed until then (§8) — so the closed state and the
  // open state are two different measurements of the same screen.
  await page.locator(`.tabbar button[data-tour="clients"]`).first().click();
  await settle(page, 1600);
  // THE ONE LINE THAT FIXES ALL SIX. Everything below depends on the list
  // having been drawn, so waiting for a row here is what makes the guards
  // below mean "this control is missing" again instead of "the database had
  // not answered yet".
  if (!(await appear(page.locator(".rows.cols.clients .row-item")))) {
    console.log(`${"Clients".padEnd(24)} NO ROWS — the list never drew`);
  }
  await say("Clients · the list");
  for (const s of ["Most spent", "Longest away"]) {
    const b = page.getByRole("radio", { name: NAMED(s), exact: true });
    if (!(await b.count())) {
      console.log(`Clients · sorted by ${s}`.padEnd(24) + "NOT MEASURED — no such sort control");
      found++; continue;
    }
    await b.first().click();
    await settle(page, 600);
    await say(`Clients · sorted by ${s}`);
  }
  {
    const chip = page.getByRole("button", { name: NAMED("Not seen in 3 months") });
    if (await chip.count()) {
      await chip.first().click();
      await settle(page, 700);
      await say("Clients · not seen in 3 months");
      // THE COMPOSE SHEET — roadmap 2.19, and it is the same gap CLAUDE.md
      // records under half a dozen different ordinals: *the script walks
      // NAVIGATION, and a state you reach by pressing something INSIDE a
      // screen is not navigation.* Added in the change that BUILT it, not by
      // the item that later finds it broken.
      // It is the narrowest thing on this screen: two fields, a paragraph of
      // fine print and a WRAPPING WALL OF NAME CHIPS, one per recipient — and
      // a chip wall is the control most likely to run past an edge at 320.
      {
        // **BY ATTRIBUTE, NOT BY THE WORDS — the first Spanish run, 2026-09-19.**
        // `/^Email these \d+$/` is a raw English regex and the button says
        // "Enviar correo a estos 5" in Spanish, so this whole block was skipped
        // and `Clients · writing to them` went NEVER MEASURED. **Not a
        // translation gap — `appEs.js` carries "Email these {count}" correctly;
        // the CHECK was the monolingual one.** And `NAMED_TEXT` could not have
        // saved it either: the catalogue key holds `{count}`, which never
        // appears in rendered text. `data-tour="compose"` was already on the
        // button and has none of these problems.
        const write = page.locator('[data-tour="compose"]');
        if (await write.count()) {
          await write.first().click();
          await settle(page, 900);
          await say("Clients · writing to them");
          await page.keyboard.press("Escape");
          await settle(page, 600);
        }
      }
      await chip.first().click();
      await settle(page, 500);
    }
  }
  // The client record is where W7/W8 lived.
  //
  // **NOT `.first()`, AND THE SENTINEL IS WHAT FOUND IT — 2026-09-16.** The
  // bounced-client block below opens Victor Salas by name, and the first row of
  // the list IS Victor Salas, so these two measurements fingerprinted
  // identically: the same sheet, measured twice, under two names, both clean.
  // The block below even predicted it — *"the odds of that being the first row
  // are nobody's to control"* — and nothing in this script could see that the
  // odds had come in. An ordinary client and a bounced client are two different
  // panels and only one of them was ever being drawn.
  const client = page.locator(".rows.cols.clients .row-item")
    .filter({ hasNot: page.locator("text=Victor Salas") }).first();
  if (await client.count()) {
    await client.click();
    await settle(page, 1600);
    await grow();
    await say("Clients · one client");
    // A job opened from a client's history takes the same column the client
    // was in, which is a state neither screen owns by itself.
    const job = page.locator(".record .rows .row-item, .sheet .rows .row-item").first();
    if (await job.count()) {
      await job.first().click();
      await settle(page, 1500);
      await grow();
      await say("Clients · a job from the history");
      // **THESE TWO CLOSES ARE WHAT THE VICTOR SALAS CLICK BELOW WAS RACING.**
      // Both were `Escape` then `settle(page, 700)`; the block below then
      // clicked into a backdrop that had not finished leaving and the whole
      // run died at the first width. `closeOverlay()` waits for the thing
      // rather than for a while — see its own note.
      await closeOverlay(400);
    }
    await closeOverlay(400);
  }
  // THE CLIENT WHOSE ADDRESS BOUNCED — roadmap 2.20, and it is a SECOND
  // measurement of the same screen rather than a nicety. The record above is
  // opened with `.first()`, so the bounce line is drawn on exactly one client
  // in the seed and the odds of that being the first row are nobody's to
  // control. This is the tenth time this file has had to say it: *a state you
  // reach by pressing something INSIDE a screen is not navigation* — and the
  // added twist here is that this state belongs to ONE ROW of a list the walk
  // already visits, which looks covered and is not.
  // It is also the longest string on that panel: a two-line red sentence
  // under a button that is already the widest thing in the column.
  {
    const bounced = page.locator(".rows.cols.clients .row-item", { hasText: "Victor Salas" });
    if (await bounced.count()) {
      await bounced.first().click();
      await settle(page, 1500);
      await grow();
      await say("Clients · a client whose email bounced");
      await page.keyboard.press("Escape");
      await settle(page, 700);
    } else {
      // NOT SILENCE. A seed that stops carrying this row would otherwise make
      // the whole state vanish from the sweep while it still printed clean,
      // which is this repo's most-repeated failure wearing a new hat.
      console.log(`${"Clients · bounced".padEnd(24)} NOT MEASURED — no bounced client in the seed`);
    }
  }

  // A SETTINGS SCREEN IS NO LONGER A SHEET, and the walk needed no change for
  // it: below --wrap it is a page that REPLACES the index, at or above --wrap
  // it is the second column and the index stays put. Escape closes it at both
  // widths (SettingsHost), so the next row click lands either way, and
  // `grow()` no-ops where there is no sheet to drag.
  // A CONTROL THAT ONLY EXISTS AFTER A DATABASE READ NEEDS A WAIT, NOT A
  // SETTLE — roadmap 2.19, and it is this script's own lesson arriving in a
  // third place.
  //
  // `settle()` is a CAP on a repaint; the header of `sweep-booking-steps.mjs`
  // already says in as many words that it is not a wait for a network round
  // trip. Monthly plans and Team's member list both draw their buttons only
  // after Supabase answers, so `settle(...)` followed by `count()` is a race —
  // and **`?lite=1` makes it MORE likely, not less**, because with no
  // animations running the DOM goes quiet sooner and settle returns earlier.
  //
  // IT LOST THE RACE ABOUT HALF THE TIME AND PRINTED `NO SUCH BUTTON`, which
  // reads as a renamed control rather than as a timing failure — the same
  // family as the crash that printed `clean` until `say()` learned to look for
  // the error boundary. Found because roadmap 2.19 added two reads to Today
  // and the extra latency tipped it over; the race was already there.
  //
  // **IT IS DECLARED WAY ABOVE NOW, AND THAT MOVE IS THE FIX FOR A SIXTH
  // PLACE.** It used to be declared here, immediately before the settings
  // walk -- and a `const` is in its own temporal dead zone above that line, so
  // the CLIENTS block two hundred lines earlier could not have called it even
  // if somebody had thought to. See its new home for what that cost.

  // **A SETTINGS ROW IS NOT A PLAIN BUTTON, AND `NAMED()` CANNOT CLICK ONE —
  // measured 2026-09-16 with Playwright, not reasoned about.**
  //
  //   getByRole("button", { name: /^(?:Notifications|Notificaciones)$/ })  ->  0
  //   getByRole("button", { name: "Notifications" })                      ->  1
  //   locator(".nav-row", { hasText: /Notifications|Notificaciones/ })     ->  1
  //
  // `NAMED()` returns an ANCHORED regex whenever the label has a Spanish twin,
  // and a settings row's accessible name is its label PLUS its description —
  // "Notifications ⏎ 5 of 5 emails on". Anchored, that matches nothing. Both
  // call sites carried `.catch(() => {})`, so the click did nothing, quietly,
  // and the block went on to look for controls on a screen it had never opened.
  //
  // **THIS IS THE 2026-09-08 BUG IN ITS THIRD HOME.** The header at `NAMED_TEXT`
  // records it for `hasText`; the same two-matchers-that-look-interchangeable
  // mistake was still live for `getByRole({ name })`, and only on rows rather
  // than on buttons — which is why every other `NAMED()` caller in this file is
  // correct and must stay anchored ("Change" must not match "Change your
  // sign-in password").
  //
  // `walk` already had the right mechanism. This is `walk`'s first line, made
  // callable on its own, and it is LOUD rather than silent: a row that is not
  // there is a finding, because every measurement after it is of the wrong
  // screen.
  const openRow = async (key, ms = 1200) => {
    const row = page.locator(".nav-row", { hasText: NAMED_TEXT(key) });
    if (!(await appear(row))) {
      console.log(`${("the " + key + " row").padEnd(24)} NO SUCH ROW — everything measured after this is the wrong screen`);
      found++;
      return false;
    }
    await row.first().click();
    await settle(page, ms);
    return true;
  };

  const walk = async (label, rows) => {
    for (const key of rows) {
      // NAMED, or NINETEEN SETTINGS SCREENS GO UNMEASURED IN SPANISH — which is
      // exactly what happened on the first Spanish run that got this far: the
      // sweep printed "clean at all five widths" AND nineteen NO SUCH ROW lines
      // in the same output. The geometry verdict was true of the screens it
      // opened and silent about the ones it never reached.
      const row = page.locator(".nav-row", { hasText: NAMED_TEXT(key) });
      if (!(await row.count())) { console.log(`${key.padEnd(24)} NO SUCH ROW (${label})`); found++; continue; }
      await row.first().click();
      await settle(page, 1600);
      await grow();
      await say(`${label} · ${key}`);
      await page.keyboard.press("Escape");
      await settle(page, 800);
    }
  };

  // ---- THE LONG TAIL: 28 of the 56 states, and the half that is skipped at
  // 1440 and 360. Everything above this line runs at every width.
  if (!deep) {
    console.log(`${"the long tail".padEnd(24)} skipped at ${w} — ${BUSINESS_ROWS.length + GEAR_ROWS.length} settings screens, the gear, setup x7`);
    continue;
  }

  await page.locator(`.tabbar button[data-tour="business"]`).first().click();
  await settle(page, 1400);

  // THE QR IS BEHIND A BUTTON, SO IT IS A STATE THIS SCRIPT HAS TO ENTER.
  // Added with it (2026-09-02). Opening Business and measuring the index says
  // nothing about a 200px white plate and a two-button row that only exist
  // after a click — which is the finding stage 6 hit four times over on the
  // job record, the calendar, Money and Clients, and the reason its own
  // settings rows are walked rather than assumed.
  const qr = page.getByRole("button", { name: NAMED("Generate QR code") });
  if (await qr.count()) {
    await qr.first().click();
    await settle(page, 1200);
    await say("Business · the QR code");
  } else { console.log(`${"the QR button".padEnd(24)} NO SUCH BUTTON`); found++; }

  await walk("Business", BUSINESS_ROWS);

  // MONTHLY PLANS' TWO FORMS ARE THE NINTH INSTANCE OF THE SAME GAP, and this
  // one was added in the change that BUILT the screen rather than in the item
  // that later finds it broken (roadmap 2.14). Walking to the screen measures
  // two lists and two buttons; the plan form is nine controls including a
  // segmented control beside a number field, and the member form is two
  // drop-downs, a date and a money field on one row — which is the shape that
  // breaks at 320, not the list above it.
  await page.locator(".nav-row", { hasText: NAMED_TEXT("Monthly plans") }).first().click().catch(() => {});
  await settle(page, 1300);
  const addPlan = page.getByRole("button", { name: NAMED("Add a plan") });
  if (await appear(addPlan)) {
    await addPlan.first().click();
    await settle(page, 800);
    await say("Business · Monthly plans, the plan form");
  } else { console.log(`${"the Add a plan button".padEnd(24)} NO SUCH BUTTON`); found++; }
  const logMember = page.getByRole("button", { name: NAMED("Log a member") });
  if (await appear(logMember)) {
    await logMember.first().click();
    await settle(page, 800);
    await say("Business · Monthly plans, the member form");
  } else { console.log(`${"the Log a member button".padEnd(24)} NO SUCH BUTTON`); found++; }
  // AND THE PLANS PAGE'S OWN QR PLATE (roadmap 2.14 step 3). It is the same
  // `BookingLink` already swept on Business, so this looks redundant — and it
  // is not: the block sits under two lists and two buttons here rather than at
  // the top of a short screen, and a 33-module code opening below all of that
  // is a different measurement. The rule that keeps arriving is that a state
  // behind a button is not navigation, and this one is behind a button on a
  // screen that did not have it yesterday.
  // NAMED, LIKE THE BUSINESS ONE FORTY LINES UP. `/QR code/i` is English and
  // the button reads "Generar código QR" in Spanish, so this surface went
  // NEVER MEASURED on the first Spanish run. Same component, same string, and
  // the other call site had it right all along — which is the tell that this
  // was a shortcut rather than a decision.
  const plansQr = page.getByRole("button", { name: NAMED("Generate QR code") });
  if (await plansQr.count()) {
    await plansQr.first().click();
    await settle(page, 900);
    await say("Business · Monthly plans, the QR");
  }
  // Escape, not the tab — the same reason the Notifications block below gives.
  await page.keyboard.press("Escape");
  await settle(page, 800);

  // **SEVEN MORE SETTINGS DIALOGS, AND `walk()` COULD NOT HAVE FOUND ONE OF
  // THEM.** `walk()` opens a settings row, measures the screen and leaves.
  // Three of those fourteen screens carry editors behind a button — the same
  // "a state behind a button is not navigation" rule that put Monthly plans'
  // two forms above and the QR plate before them — and nothing had ever
  // pressed any of them.
  //
  // They are the forms a detailer actually types into: what a service costs,
  // what an add-on is, how a vehicle size is described, what a travel area
  // charges, what a surcharge does, and how he gets paid. Each is a column of
  // fields inside a sheet inside a settings screen, and 320 is where that
  // decides.
  //
  // **ADDRESSED THROUGH THEIR HEADING, NOT BY INDEX.** Two of these buttons
  // say the single word "Add" on the same screen — add-ons and vehicle sizes —
  // so `.nth(0)` and `.nth(1)` would work today and would silently swap the
  // moment somebody reorders the page. `has:` scopes each one to the `<h3>`
  // above it, which is the thing that actually names it.
  //
  // **AND `NAMED()` IS THE WRONG MATCHER FOR EVERY ONE OF THEM — the 2026-09-08
  // bug in its FOURTH home, found here 2026-09-18.** These buttons are written
  // `+ {t("Category")}`, so their accessible name is "+ Category". `NAMED()`
  // anchors (`^(?:Category|Categoria)$`) the moment a Spanish twin exists, and
  // an `exact: true` string is anchored too — five dialogs printed NO SUCH
  // BUTTON against five buttons that were plainly on screen. `NAMED_TEXT()`
  // with no `exact` is the substring form, which is what a label sitting
  // beside a "+" needs. The heading scope is what keeps it honest: two of
  // these buttons say only the word "Add".
  const byHeading = (heading, label) =>
    page.locator(".row", { has: page.locator("h3", { hasText: NAMED_TEXT(heading) }) })
      .getByRole("button", { name: NAMED_TEXT(label) });

  // **BACK TO THE INDEX THROUGH ANOTHER TAB, AND BOTH HALVES OF THAT WERE
  // MEASURED RATHER THAN ASSUMED, 2026-09-18.**
  //
  // Draft one assumed the Monthly plans block above had left the Business
  // index on screen. It had not: a settings screen REPLACES the main area
  // rather than opening over it, its single Escape closes the plan form and
  // leaves you standing inside Monthly plans, and all three rows below printed
  // NO SUCH ROW — seven dialogs unmeasured, announced only by a line that
  // reads like a renamed control. `walk()` gets away with one Escape because
  // it opens exactly one thing per row.
  //
  // Draft two pressed the Business tab, which is a NO-OP while Business is
  // already the lit tab, so all three printed NO SUCH ROW a second time and
  // the fix looked like the problem. Probed both ways: two Escapes gets back
  // (15 nav-rows, heading "Business") and so does Today → Business. The bounce
  // is the one that does not have to know how many things are open.
  const toBusinessIndex = async () => {
    await page.locator(`.tabbar button[data-tour="today"]`).first().click();
    await settle(page, 1200);
    await page.locator(`.tabbar button[data-tour="business"]`).first().click();
    await settle(page, 1500);
  };
  for (const [row, dialogs] of [
    ["Services & add-ons", [
      // AN EXISTING SERVICE, NOT A NEW ONE. The add form opens empty; the edit
      // form opens with the seeded name, description, features box, price and
      // duration in it, and an empty form is this file's own definition of a
      // screen swept blank.
      ["Business · a service", () => page.locator("button.menu-name").first()],
      ["Business · a category", () => byHeading("Services", "Category")],
      ["Business · an add-on", () => byHeading("Add-ons", "Add")],
      ["Business · a vehicle size", () => byHeading("Vehicle sizes", "Add")],
    ]],
    ["Booking rules", [
      ["Business · a travel area", () => page.getByRole("button", { name: NAMED_TEXT("Add an area") })],
      ["Business · a surcharge", () => page.getByRole("button", { name: NAMED_TEXT("Add a surcharge") })],
    ]],
    // A2 4.12 NAMES THIS SCREEN BY NAME — "the bottom menu was already seen
    // covering content at medium width" — and until now the sweep measured the
    // screen and never the sheet that opens over it.
    ["How you get paid", [
      ["Business · a way to be paid", () => page.getByRole("button", { name: NAMED("Add a way to be paid") })],
    ]],
  ]) {
    await toBusinessIndex();
    if (!(await openRow(row, 1600))) continue;
    for (const [label, trigger] of dialogs) await openSheet(label, trigger());
  }
  await toBusinessIndex();

  // **THE TWO DIALOGS THIS RUN DOES NOT REACH, SAID OUT LOUD RATHER THAN LEFT
  // OUT.** Naming a surface it cannot measure is the whole point of the
  // expectation file; a silent omission is the defect this certification
  // exists to stop. Neither raises a finding, because neither is a defect in
  // the product — both are gaps in the demo and in what a sweep may safely do.
  //
  //   the photo lightbox   `JobPhotos` draws a full-screen `role="dialog"`
  //                        over a job's photos. `seed-demo.mjs` attaches no
  //                        photos to any booking, so there is nothing to open.
  //                        Fix belongs in the seed, not here.
  //   the timezone guard   `TimezoneChangeGuard` only appears after the
  //                        timezone is CHANGED and Save is pressed. The guard
  //                        itself writes nothing, but the path to it edits a
  //                        live setting on the demo business mid-sweep, which
  //                        is a mutation this script has never made and should
  //                        not start making inside a geometry check.
  console.log(`${"declared, not reached".padEnd(24)} the photo lightbox (no photos in the seed) and the `
    + `timezone guard (needs a settings write) — 2 dialogs named and deliberately unmeasured`);

  // THE SECOND DOOR. The gear is a destination rather than an overlay, so it
  // takes the main area and its own index has to be measured too — until
  // this stage every one of these screens was reached from one list and four
  // of them have moved.
  await page.getByRole("button", { name: NAMED("Settings"), exact: true }).first().click();
  await settle(page, 1400);
  await say("the gear");
  await walk("gear", GEAR_ROWS);

  // NOTIFICATIONS' "YOUR OWN WORDS" EDITOR IS A STATE BEHIND A BUTTON, and
  // walking to the screen does not enter it (roadmap 2.18, 2026-09-03).
  //
  // Twelve rows each collapse to an "Add a line" button; the textarea, the
  // preset chips and the Done/Clear row only exist after a click. **A clean
  // measurement of the Notifications screen says nothing at all about the
  // shape those controls take** — which is the same finding as the QR plate
  // above it, the job record, the calendar's day panel, Money's periods,
  // Clients' list and first run. **It keeps arriving because the script walks
  // NAVIGATION, and a state you reach by pressing something inside a screen is
  // not navigation.**
  //
  // Guarded rather than assumed: staff never see Notifications, and a future
  // layout may rename the button. A missing button is reported, not skipped —
  // silently measuring nothing is how this gap survived six times.
  await openRow("Notifications");
  // **THE BUTTONS ARE INSIDE A CLOSED `<details>` — found 2026-09-16, and it is
  // `docs/gotchas.md`'s own entry running the other way.** That entry warns
  // that a closed `<details>` STILL MEASURES its children; the accessibility
  // tree is the opposite, and hides them. `Notifications.jsx:351` renders an
  // "Add a line" button outside the fold only for a message kind that already
  // HAS a line, and the demo seeds none — so every kind sat in the fold, the
  // a11y tree held no such button, and the run printed NO SUCH BUTTON on a
  // screen that was working. Open the fold first: that is what a person does.
  // AND `.first()` OPENED THE WRONG ONE. There are TWO folds on this screen —
  // "When these reach you" and "12 other emails you can add a line to" — and
  // the buttons are in the second. Open EVERY fold rather than guessing which:
  // a closed `<details>` anywhere on a screen is content no width has measured,
  // and the geometry inside one is exactly where this script's four checks earn
  // their keep. Set `open` rather than click it: no race, no ordering, and the
  // native element fires its own toggle either way.
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
  await settle(page, 600);
  const addLine = page.getByRole("button", { name: NAMED("Add a line") });
  if (await addLine.count() > 0) {
    await addLine.first().click();
    await settle(page, 700);
    await say("gear · Notifications, a line open");
  } else { console.log(`${"the Add a line button".padEnd(24)} NO SUCH BUTTON`); found++; }
  // ESCAPE, NOT THE GEAR. Pressing the header gear again LEAVES the gear
  // entirely (it is aria-pressed, a destination toggled in and out), which is
  // right at the end of this block and wrong in the middle of it: the Team
  // walk below then looks for a row on a screen it just closed and reports
  // NO SUCH BUTTON, which reads like a renamed control. Escape is what `walk`
  // uses to come back to the index.
  await page.keyboard.press("Escape");
  await settle(page, 900);

  // TEAM'S ROLE EDITOR IS THE EIGHTH INSTANCE OF THE SAME GAP (roadmap 2.13).
  // A member row shows a name and one sentence; the role's own name field and
  // its four permission switches only exist after pressing "Change", and that
  // opened card is the tallest thing on this screen by some way. Added in the
  // change that built it rather than in the roadmap item that finds it broken.
  // The demo seeds two members — an owner and a "Detailer" — so there is
  // always a second "Change" whose card carries the ticks; the first belongs
  // to the owner, whose editor is deliberately shorter (nothing to tick).
  await openRow("Team");
  const change = page.getByRole("button", { name: NAMED("Change") });
  // The member list is a database read too — same race, same fix as the two
  // plan buttons above. `count()` is taken AFTER the wait, because the block
  // wants the LAST member rather than the first.
  const changes = (await appear(change)) ? await change.count() : 0;
  if (changes > 0) {
    await change.nth(changes - 1).click();
    await settle(page, 700);
    await say("gear · Team, a role open");
  } else { console.log(`${"the Change button".padEnd(24)} NO SUCH BUTTON`); found++; }
  await page.getByRole("button", { name: NAMED("Settings"), exact: true }).first().click().catch(() => {});
  await settle(page, 1000);

  // THE SUBSCRIPTION SCREEN, AND IT IS TWO DIFFERENT SCREENS — roadmap 2.20
  // stage 2, added in the change that built it.
  //
  // WITH NO SUBSCRIPTION it is the three rungs, a price breakdown and the
  // consent tick, whose generated sentence — four clauses naming the build
  // fee, the monthly, the twelve months and the exit fee — sits beside a 22px
  // checkbox. That paragraph next to that box at 320 is the riskiest geometry
  // this item added, and it is the state the DEFAULT seed produces because it
  // is also the truthful one: the demo business does not pay the platform.
  //
  // WITH ONE it is the account: the facts list, the card, the invoice list,
  // the cancel confirmation and — when the seed is `past_due` or `suspended` —
  // an error box carrying an action, which is CSS this item added.
  //
  // BOTH ARE MEASURED AND ONLY ONE PER RUN, so the other PRINTS rather than
  // being skipped, naming the exact command that would show it. A skipped
  // check reads exactly like a passing one; one console.log is the whole cure.
  //   node scripts/seed-demo.mjs --subscription=past_due
  await page.getByRole("button", { name: NAMED("Settings"), exact: true }).first().click().catch(() => {});
  await settle(page, 1000);
  const billingRow = page.locator('[data-settings-key="billing"]');
  if (await appear(billingRow)) {
    await billingRow.first().click();
    // A SUPABASE-BACKED EDGE FUNCTION, not a table read — settle() is a cap on
    // a repaint and is not a wait for a network round trip, which this script
    // has now learned three times. Wait for something the answer draws.
    await appear(page.locator('[data-billing-rung], .facts'));
    await settle(page, 1400);
    await grow();
    await say("gear · Your subscription");

    const rung = page.locator('[data-billing-rung="annual-monthly"]');
    if (await rung.count()) {
      // THE TICK'S OWN STATE. The breakdown and the consent paragraph only
      // exist after a rung is pressed — the tenth-and-something instance of
      // "a state you reach by pressing something INSIDE a screen is not
      // navigation", added here in the change that built it.
      await rung.first().click();
      await settle(page, 900);
      await grow();
      await say("gear · subscription, a plan chosen");

      // ── A PROMO CODE APPLIED — roadmap 8.14, added in the change that
      // built it, and it is the same gap this file has now recorded a dozen
      // times: **the script walks NAVIGATION, and a state you reach by
      // pressing something inside a screen is not navigation.**
      //
      // The applied state changes every figure in the breakdown, adds a
      // saving line and rewrites the whole consent paragraph — the one that
      // sits beside a 22px checkbox and is the riskiest geometry on this
      // screen. `DEMO25` is seeded by `seed-demo.mjs` and STACKS WITH
      // FOUNDING, because the demo is founding and a refused code would
      // measure the screen it had just measured.
      //
      // **`settle()` IS A CAP ON A REPAINT AND IS NOT A WAIT FOR A NETWORK
      // ROUND TRIP**, and this block is where that was walked into: with
      // nothing animating the DOM goes quiet while the request is in flight,
      // and the first shot of this state was the BUSY one — a screen that
      // reads exactly like a button that does nothing. It waits for the
      // outcome, which is either the button saying Remove or a sentence
      // saying why not.
      const promoField = page.locator("[data-billing-promo]");
      if (await promoField.count()) {
        await promoField.first().fill("demo25");
        await page.locator("[data-billing-promo-apply]").first().click();
        // **`:has-text()` IS A CSS PSEUDO AND TAKES A LITERAL, so this asked for
        // the English word and got nothing in Spanish — the apply SUCCEEDED and
        // the check called it refused, printing an empty reason because there
        // was no error to read.** A false negative, not a product fault:
        // `appEs.js` has "Remove" -> "Quitar". `.filter({ hasText })` takes the
        // two-language regex this file already builds.
        const applyBtn = page.locator("[data-billing-promo-apply]");
        await applyBtn.filter({ hasText: NAMED_TEXT("Remove") })
          .or(page.locator("[data-billing-promo-said]"))
          .first().waitFor({ timeout: 15_000 }).catch(() => {});
        await settle(page, 900);
        // A GUARD THAT SKIPS MUST PRINT. If the code was refused the figures
        // are unchanged and this block measures nothing — which is
        // byte-identical to it passing.
        const applied = await applyBtn.filter({ hasText: NAMED_TEXT("Remove") }).count();
        if (!applied) {
          const why = await page.locator("[data-billing-promo-said]").textContent().catch(() => "");
          console.log(`${"subscription · promo".padEnd(24)} NOT MEASURED — DEMO25 was refused ("${(why || "").trim()}"). node scripts/seed-demo.mjs`);
        } else {
          await grow();
          await say("gear · subscription, a promo code applied");
        }
      } else {
        console.log(`${"subscription · promo".padEnd(24)} NOT MEASURED — no promo field on the checkout`);
      }
    } else {
      // THE MIRROR OF THE TWO BELOW, and the same treatment. It only prints
      // under `--subscription=...`, so it is not what the default run trips
      // over — but it is the identical limbo shape and leaving one of the pair
      // converted would be the half-fix this file keeps recording. Both labels
      // are declared, because both states live behind the same ladder.
      for (const gone of ["gear · subscription, a plan chosen", "gear · subscription, a promo code applied"]) {
        await declareSkip(gone,
          "this demo HAS a subscription, so `Billing.jsx` draws the account instead of the checkout "
          + "ladder and there are no rungs to press. Re-seed without --subscription to measure the "
          + "ladder and the consent tick (ROADMAP 8.1b)",
          () => page.locator('[data-billing-rung="annual-monthly"]').count());
      }
    }

    // **THE LAST TWO LINES IN LIMBO, AND THE EITHER/OR UNDER THEM — measured
    // 2026-09-19, not assumed.**
    //
    // These two printed a bare `NOT MEASURED` on every run: no finding, no
    // entry in the expectation, nothing counting them. That is the state the
    // five `guide · …` surfaces were in, and it is where a real gap lives
    // longest.
    //
    // **THEY ARE NOT MUTUALLY EXCLUSIVE WITH EACH OTHER.** That was the first
    // guess and it is wrong: `seed-demo.mjs --subscription=past_due` produces
    // BOTH at once — `live` in `Billing.jsx` is true for a past-due
    // subscription, so the account view draws the cancel button, and the
    // dunning box draws above it. Run and checked.
    //
    // **WHAT THEY ARE EXCLUSIVE WITH IS THE CHECKOUT LADDER**, and that is
    // structural rather than incidental: a business either has a subscription
    // or it does not, and `Billing.jsx` draws the account for one and the
    // rungs for the other. **Measured at 392 with the flag:** +1 surface
    // (`gear · subscription, cancelling`) and −2 (`… a plan chosen` and
    // `… a promo code applied`), a net loss, and the two lost are the ladder
    // and the consent tick — which `seed-demo.mjs`'s own header calls the
    // riskiest geometry on this screen.
    //
    // **SO THE DEFAULT SEED STAYS AND THESE TWO DECLARE THEMSELVES.** It is
    // also the truthful demo: the demo business does not pay the platform.
    // The alternative that would measure everything is a SECOND signed-in
    // business carrying a subscription, which is a second sign-in per width on
    // a run that is already a quarter of an hour. Named here rather than
    // built.
    //
    // A skip, not a printed line: `declareSkip` re-asks with a probe, so
    // seeding the state makes the declaration fail rather than pass quietly.
    const cancel = page.locator("[data-billing-cancel]");
    if (await cancel.count()) {
      await cancel.first().click();
      await settle(page, 800);
      await grow();
      await say("gear · subscription, cancelling");
    } else {
      await declareSkip("gear · subscription, cancelling",
        "this demo has no subscription, so there is nothing to cancel. The default seed is "
        + "deliberately unsubscribed — it draws the checkout ladder instead, which is two surfaces "
        + "rather than one. `node scripts/seed-demo.mjs --subscription=past_due` swaps which half is "
        + "measured (ROADMAP 8.1b)",
        () => page.locator("[data-billing-cancel]").count());
    }

    // **AND THE DUNNING BOX WAS NEVER A SURFACE, EVEN WHEN IT WAS THERE.**
    // This was a bare presence check with no `else`: under `--subscription=
    // past_due` the box rendered and NOTHING measured it, so the one run that
    // could have laid it out at 320 passed over it in silence. It says its own
    // name now, which is what makes the skip below the real alternative to a
    // real measurement rather than to nothing.
    // **AND IT IS NOT A SCREEN OF ITS OWN — THE SENTINEL PROVED IT, 2026-09-19.**
    // First attempt made it a surface, and the run came back
    // `gear · subscription, cancelling == gear · subscription, past due`:
    // identical fingerprints, because the dunning box sits at the TOP of the
    // account view and everything else on that screen is the same DOM. It is a
    // STATE OF `gear · Your subscription`, which is already measured with the
    // box on it — so a second `say()` would be one screen counted twice under
    // two names, which is exactly what the sentinel exists to refuse.
    //
    // So when it is there this is a positive assertion about a surface that WAS
    // measured, and when it is not it is a declared skip. Neither is a bare
    // `NOT MEASURED` that counts nothing and declares nothing.
    if (await page.locator("[data-billing-dunning]").count()) {
      const level = await page.locator("[data-billing-dunning]").first().getAttribute("data-billing-dunning");
      console.log(`${"gear · subscription, past due".padEnd(24)} on \`gear · Your subscription\` above `
        + `(dunning level "${level}") — a state of that screen, not a screen of its own, so it is `
        + `measured there rather than counted twice`);
    } else {
      await declareSkip("gear · subscription, past due",
        "nothing is overdue on this demo, and nothing can be: the default seed writes no "
        + "subscription at all, so there is no payment to fail. Same either/or as the cancel "
        + "button above (ROADMAP 8.1b)",
        () => page.locator("[data-billing-dunning]").count());
    }
    await page.keyboard.press("Escape");
    await settle(page, 800);
  } else {
    console.log(`${"Your subscription".padEnd(24)} NO SUCH ROW (gear) — owner-only, so a staff session is expected to miss it`);
    found++;
  }

  // FIRST RUN — THE SETUP FORM'S STEPS, added 2026-09-02 with roadmap 2.11
  // step 6 stage 7. It is the same finding this script has now made six
  // times: a screen nothing enters reports exactly like a screen that was
  // entered and found clean. This is the worst case of it, because IT IS NOT
  // REACHABLE BY CLICKING A TAB — the form is behind a row that only exists
  // while setup is unfinished. Every step is a different screen: step 1
  // carries a list that grows with the tenant, step 5 is a single control with
  // most of a phone under it, step 7 is a whole settings screen embedded.
  // (The guided tour walked here too until ROADMAP 9.15 retired the tour and
  // 9.15a retired its walk.)
  //
  // NOTHING HERE WRITES. The form is walked with "I'll do this later", which
  // is the skip path; Continue is the one that commits and is never pressed.
  // `seed-demo.mjs` pins the demo at "6 of 7 done" so the row it opens from is
  // always there.
  await page.locator(`.tabbar button[data-tour="business"]`).first().click();
  await settle(page, 1400);
  // WAIT FOR THE ROW RATHER THAN ASSUME IT, and the reason is a real property
  // of the screen: Business renders its rows immediately with "…" summaries
  // and fills them in when one round trip returns, and the resume row is the
  // one that is ABSENT until then rather than merely unfilled. `settle()`
  // cannot see that — there is no spinner and the DOM goes quiet — so the
  // click below raced the fetch and reported NO SUCH ROW. It bit in `--lite`
  // first, because everything settles sooner with no animations running.
  // **THE EYEBROW IS NOT INSIDE THE ROW — found 2026-09-16.** "Finish setting
  // up" is a `<span class="label">` ABOVE the card; the `.nav-row` itself reads
  // "Next: <step>" over "N of M done". So `.nav-row` hasText "Finish setting up"
  // could never match, and every run printed NO SUCH ROW and told the reader to
  // re-seed — advice that fixes nothing, on a demo that was seeded correctly.
  // Anchored on the CARD that carries the eyebrow, then its row, which keeps
  // `NAMED_TEXT` and its Spanish twin and survives the next rename of the step.
  const finish = page.locator(".tight", { has: page.locator(".label", { hasText: NAMED_TEXT("Finish setting up") }) })
    .locator(".nav-row");
  await finish.first().waitFor({ timeout: 10000 }).catch(() => {});
  if (!(await finish.count())) {
    console.log(`${"the setup row".padEnd(24)} NO SUCH ROW (re-run scripts/seed-demo.mjs)`);
    found++;
  } else {
    await finish.first().click();
    await settle(page, 1700);
    // It RESUMES at the first unfinished step, so walk back to the start
    // first. Bounded rather than while(true): a Back that never disables is a
    // defect, not a reason to hang the sweep.
    const back = page.locator(".settings-head .btn.icon").first();
    for (let k = 0; k < 8 && await back.isEnabled(); k++) {
      await back.click();
      await settle(page, 500);
    }
    // LABELLED BY THE FORM'S OWN STEP LINE, not by the loop counter, and
    // guarded on the button existing rather than waiting 30s for it. The
    // first version counted 1..7 and clicked blind: when the walk back to
    // step 1 did not land where it assumed, every label was wrong by the same
    // offset AND the last click closed the form, after which the run hung on
    // a button that no longer existed. A walk that names what it is looking
    // at cannot drift, and one that checks before it clicks cannot hang.
    for (let k = 0; k < 8; k++) {
      const line = await page.locator(".setupform .label").first().textContent().catch(() => null);
      if (!line) break;                       // the form is gone
      // **THE LABEL MUST NOT TRANSLATE, AND IT DID.** The form's own step line
      // reads "Step 1 of 12" in English and "Paso 1 de 12" in Spanish, so a
      // Spanish run measured all eight screens and filed them under eight names
      // the expectation has never heard of: eight NEVER MEASURED and eight NOT
      // EXPECTED, for eight screens that were measured perfectly well.
      // **A label is the name of a thing, not a rendering of it.** The NUMBERS
      // are the part that does not translate, so they are what the label is
      // built from — still read off the form rather than counted by the loop,
      // which is what the note above is protecting.
      const nums = (line.match(/\d+/g) || []);
      await say(nums.length >= 2
        ? `setup · step ${nums[0]} of ${nums[1]}`
        : `setup · ${line.replace(/ · .*/, "").toLowerCase()}`);
      const later = page.getByRole("button", { name: NAMED("I'll do this later") });
      if (!(await later.count())) break;
      await later.click();
      await settle(page, 800);
    }
    // IT HAS ALREADY CLOSED ITSELF on the last "later" of step 7, so wait for
    // that rather than clicking its X — and the difference is not pedantry.
    // `count()` then `click()` is a race against the 180ms the form spends
    // LEAVING: count says 1, the element unmounts, and the click then waits
    // for something that will never come back. That is what stalled a whole
    // ?lite=1 run at width 1. Every wait below is bounded.
    await page.locator(".setupform").waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
    const x = page.locator(".setupform .x");
    if (await x.count()) await x.click({ timeout: 5000 }).catch(() => {});
    await settle(page, 700);
  }

  } catch (e) {
    // NAMED, COUNTED AND CARRIED — never swallowed. `found++` is what makes the
    // process exit non-zero; the line is what tells somebody which width and
    // how far it got, because "it crashed" and "it crashed after four
    // surfaces" are different problems.
    const done = CERT.filter((c) => c.width === w).length;
    /* **THE FIRST LINE OF A PLAYWRIGHT TIMEOUT IS THE LEAST USEFUL LINE IN IT.**
       `locator.click: Timeout 15000ms exceeded` is the same sentence whether the
       target never existed, was invisible, or was sitting under an overlay - and
       the line that tells them apart is further down the call log:
       `<div class="tourblock"> intercepts pointer events`. Four widths printed
       the useless line four runs running. The interesting lines are kept. */
    const rawErr = String((e && e.message) || e);
    const why = rawErr.split("\n")
      .filter((l) => /Timeout|intercepts pointer|waiting for|not visible|resolved to/.test(l))
      .slice(0, 4).map((l) => l.replace(/\u001b\[[0-9]+m/g, "").trim()).join(" | ")
      || rawErr.split("\n")[0];
    ABORTED.push({ width: w, measured: done, error: why, surface: ATTEMPTING, after: CERT.filter((c) => c.width === w).slice(-1)[0]?.label ?? null });
    found++;
    const lastDone = CERT.filter((c) => c.width === w).slice(-1)[0]?.label ?? "nothing";
    console.log(ATTEMPTING
      ? `
WIDTH ABORTED at ${w}px MEASURING «${ATTEMPTING}» — the ${ordinal(done + 1)} — ${why}`
      : `
WIDTH ABORTED at ${w}px BETWEEN SURFACES, after «${lastDone}» completed (the ${ordinal(done)}). `
        + `It was navigating, not measuring — ${why}`);
    console.log(`  The other widths carry on. Everything ${w}px did not reach is unmeasured, not clean.`);
  } finally {
    // BOTH EXITS AND THE ABORT COME THROUGH HERE, which is the point: the
    // shallow-width `continue` above used to close the context itself and a
    // throw closed nothing at all.
    await ctx?.close().catch(() => {});
    widthMs.push([w, Date.now() - widthStart]);
  }
}

await browser.close();
// ALWAYS PRINTED, not just under --timing. The owner asked where the minutes
// go and the honest answer was "nobody measured"; a script whose runtime is
// the biggest single cost in a session should say what it spent, every run.
{
  const total = widthMs.reduce((acc, [, ms]) => acc + ms, 0);
  console.log(`\n${(total / 1000).toFixed(0)}s: ` + widthMs.map(([w, ms]) => `${w}px ${(ms / 1000).toFixed(0)}s`).join(" · "));
}
if (TIMING) {
  console.log(`waited ${(settled / 1000).toFixed(1)}s where the old fixed sleeps would have waited ${(slept / 1000).toFixed(1)}s`);
}
// **THE COUNTER IS CHECKED BEFORE IT IS BELIEVED — 2026-09-12.** `found` was
// NaN for months and every reader of this script took the word that came out
// the other side. A verdict computed from a number nobody validated IS the
// failure, so the number is validated: a non-finite count is loud and exits 2,
// which is neither "clean" nor "problems" and cannot be mistaken for either.
if (!Number.isFinite(found)) {
  console.error(`\nINSTRUMENT BROKEN: the problem counter is ${found}, not a number. `
    + `Nothing this run printed can be trusted — a non-finite count reads as "clean".`);
  process.exit(2);
}
console.log(found
  ? `\n${found} problem${found === 1 ? "" : "s"} — see above`
  : `\nclean at ${SIZES.join(", ")}${LITE ? " (?lite=1)" : ""}: nothing off the screen, nothing outside its own box, no boxes touching`);
// A "clean" that silently swallowed a dead-width reads as proof the desktop
// layout is fine. It is not proof of anything until DESKTOP_SPEC_BUILT.
if (narrow && !DESKTOP_SPEC_BUILT) {
  console.log(`  ...but the content column is still narrow at ${narrow} desktop width${narrow === 1 ? "" : "s"}`
    + ` — see dead-width above. That is roadmap 2.11's desktop layout, not yet built.`);
}
// UNCONDITIONAL, AND THAT IS THE WHOLE POINT — baselining proved the first
// version wrong. A reload mid-walk makes states quietly fail to OPEN, and a
// state that never opened has no geometry to be wrong, so it reads as a pass:
// the baseline run reloaded, lost two states and still printed `clean`.
// A false clean is worse than a failure, because nothing makes anybody look.
/* ══ AN ABORTED WIDTH CONTRIBUTES NOTHING TO THE VERDICT ═══════════════════
   Run 2026-10-02: four of five widths aborted on their 29th surface and this
   script still printed a summary over the 153 surfaces they HAD reached, out
   of 463 expected. **A result over a third of its own coverage is the exact
   failure this repo keeps paying for** - `sweep-widths.mjs` is itself the file
   CLAUDE.md names for once printing *clean* over 38 real findings.

   The 28 surfaces an aborted width reached are not WRONG. They are unusable,
   which is different and is the whole point: nobody can tell from them whether
   the width is healthy, because the run never got far enough to say. So they
   are dropped from every count below and kept in the contact sheet, where a
   person can look at them knowing what they are. ROADMAP 9.11b. */
const ABORTED_W = new Set(ABORTED.map((a) => a.width));
// Widths the expected-count gate refused: core-only against a deep number,
// or short within their own mode. Filled by the gate, which runs below, so
// `JUDGED` is recomputed there rather than frozen here.
const UNJUDGED_W = new Set();
const JUDGED = CERT.filter((c) => !ABORTED_W.has(c.width));
if (ABORTED_W.size) {
  const dropped = CERT.length - JUDGED.length;
  console.log(`
${dropped} measurement(s) from ${ABORTED_W.size} aborted width(s) are DROPPED FROM THE`
    + ` VERDICT - ${[...ABORTED_W].join(", ")}px. They are in the contact sheet and they are not`
    + " clean, not dirty, and not a result: the width never finished, so nothing it reached can"
    + " say whether it is healthy.");
  if (!JUDGED.length) {
    console.log("NO WIDTH COMPLETED. There is no verdict to give and this run proves nothing.");
  }
}
console.log(`\n${surfaces} surface(s) reached, ${probed} element(s) probed, ${assertions} question(s) asked`);
console.log(`${JUDGED.length} of those ${CERT.length} measurement(s) count toward the verdict` + (ABORTED_W.size ? " — the rest belong to widths that never finished" : " — every width finished"));

// ===========================================================================
// CERTIFICATION — the four gates that turn the word "clean" into a claim worth
// reading. Step 3 of ROADMAP.md § "Adopting the operating-system report".
// ===========================================================================

// 0 · THE EVIDENCE FOR THE CHOICE OF FINGERPRINT, on request only.
if (process.argv.includes("--dump-fingerprints")) {
  writeFileSync(`${ART}/fingerprints.json`, JSON.stringify(
    CERT.map((c) => ({ label: c.label, dom: c.fingerprint.slice(0, 12), pixel: c.pixelPrint.slice(0, 12), sigLen: c.sig.length })), null, 2) + "\n");
  console.log(`fingerprints   ${ART}/fingerprints.json`);
}

// 1 · THE SENTINEL. Two different labels whose screens rendered to IDENTICAL
// PIXELS means one of those navigations did not happen, and the previous screen
// was measured twice — once under a name it does not have. **Nothing above can
// see this**, because the second measurement is of a real, working screen: it
// comes out CLEAN, and the reader is told a screen passed that was never
// opened. That is the precise shape of the `NAMED()` defect found on
// 2026-09-16, where two silent `.catch(() => {})` clicks meant nine screens
// were never reached and the run reported on the gear index nine times over.
{
  const byPrint = new Map();
  for (const c of CERT) {
    const key = `${c.width}::${c.fingerprint}`;
    if (!byPrint.has(key)) byPrint.set(key, []);
    byPrint.get(key).push(c.label);
  }
  // A walk that returns to an index between screens re-measures that index
  // under the SAME label, which is honest. Only DIFFERENT labels sharing one
  // screen are the defect.
  // ONE DECLARED RE-MEASUREMENT, and it is declared HERE rather than waved
  // through by a looser rule. The tab walk measures the Clients list as
  // "Clients"; the Clients block re-clicks the same tab, waits for a row to
  // actually draw, and measures it as "Clients · the list". They are the same
  // screen and both are worth keeping — the walk's is early and races the
  // database, the block's is guarded — so the honest thing is to name the pair
  // rather than to soften the check that found it or to delete a measurement.
  // A pair listed here is a pair somebody looked at. Nothing else gets a pass.
  const DECLARED_SAME = [["Clients", "Clients · the list"]];
  const declared = (labels) => DECLARED_SAME.some((pair) => {
    const set = new Set(labels);
    return set.size === pair.length && pair.every((l) => set.has(l));
  });
  const collisions = [...byPrint.values()]
    .filter((v) => new Set(v).size > 1)
    .filter((v) => !declared(v));
  if (collisions.length) {
    console.log(`\nSENTINEL FAILED: ${collisions.length} set(s) of screens that are one screen under several names.`);
    console.log("  Each was measured and reported above; at most one of them was actually opened.");
    for (const v of collisions) console.log(`  ${[...new Set(v)].join("  ==  ")}`);
    found += collisions.length;
  } else if (CERT.length) {
    console.log(`sentinel      ${byPrint.size} distinct screen(s) behind ${CERT.length} measurement(s) — no two names share a screen`);
  }
}

// 2 · THE EXPECTED COUNT — the gate this script has never had, and the one that
// would have caught the three renamed rows and the two never-listed gear
// screens found on 2026-09-16. Every one of those printed a loud line while the
// run's total quietly shrank, and NOTHING COMPARED THE TOTAL TO ANYTHING.
{
  const perWidth = {};
  for (const c of CERT) (perWidth[c.width] ??= []).push(c.label);

  if (WRITE_EXPECTED) {
    // A SEPARATE COMMAND, ON PURPOSE — report § "Discipline", rule 8: the thing
    // that compares against a baseline must never also approve a new one. This
    // flag rewrites the expectation and refuses to grade the run.
    // **THIS COMMAND ADDS. IT DOES NOT SUBTRACT - 2026-09-20, and it used to
    // do both in the same file write.**
    //
    // Run on 2026-09-20 to add the twenty-six tour steps nobody had ever
    // measured, it produced `+26 / -6` per width. The twenty-six were the
    // point. The six were `job record - finished`, `finalize` and `send a
    // text` - labels the gate comment below says must never leave this file,
    // because after about 08:45 they are reachable again - and `guide - today
    // 5, 6, 7`, the steps a quiet dashboard cannot produce, **whose deletion
    // is precisely the move Andrew had refused two hours earlier.** At 1440 it
    // also dropped `tour - step 6` and `7`, which would have written a
    // truncated tour into this file as the correct answer.
    //
    // A run only ever sees what it could reach today. Writing that set
    // WHOLESALE means every declared skip, every quiet dashboard and every
    // truncated walk silently narrows the question - so the one command meant
    // to make the gate stronger was the fastest way to make it worthless.
    // Andrew's test, written up in DECISIONS.md: *widening the question to
    // cover screens nobody was checking makes the gate stronger; narrowing it
    // to fit an awkward answer makes it worthless.*
    //
    // So this writes the UNION, names every addition, and names every label it
    // is KEEPING that this run did not reach. A real removal - a screen that
    // genuinely no longer exists - needs `--drop-missing`, which prints each
    // one, because deleting a line from this file is how a screen stops being
    // checked for ever.
    const DROP_MISSING = process.argv.includes("--drop-missing");
    // **THE PRIOR AND THE OUTPUT ARE BOTH THE KEY FOR THE MODE THIS RUN IS
    //   IN**, so a core run can never narrow a deep baseline and a deep run
    //   can never inflate a core one. The union and `--drop-missing` rules
    //   above are unchanged; they now apply per mode rather than across both.
    const priorDoc = existsSync(EXPECTED_PATH)
      ? JSON.parse(readFileSync(EXPECTED_PATH, "utf8")) : {};
    const prior = existsSync(EXPECTED_PATH)
      // **PER WIDTH, LIKE THE OUTPUT.** Reading `prior` from the global mode key
      // while writing per width NARROWED the deep baseline: 320 walks deep even
      // in a default run, its prior was looked up in the empty `widths_core`,
      // and the union came out as this run alone - 154 surfaces became 149.
      // A baseline silently losing five screens is the file's own stated
      // nightmare, produced by the fix for a different version of it. Caught by
      // reading the regenerated file instead of the success message.
      ? Object.fromEntries(SIZES.map((w2) => [String(w2),
        ((RAN_DEEP.get(w2) ? priorDoc.widths : priorDoc.widths_core) || {})[String(w2)] || []]))
      : {};
    const merged = {};
    let addedN = 0, keptN = 0, droppedN = 0;
    for (const w2 of new Set([...Object.keys(prior), ...Object.keys(perWidth)])) {
      const was = prior[w2] || [];
      const now = perWidth[w2] || [];
      const gains = now.filter((l) => !was.includes(l));
      const misses = was.filter((l) => !now.includes(l));
      // A width this run did not visit keeps its list untouched - otherwise
      // `--write-expected 392` would delete every other width's screens.
      merged[w2] = perWidth[w2]
        ? [...(DROP_MISSING ? was.filter((l) => now.includes(l)) : was), ...gains]
        : was;
      // **AND IT SAYS NOTHING ABOUT A WIDTH IT DID NOT SWEEP.** The first
      // version of this loop treated every label of an unvisited width as
      // "not reached this run" and printed 250 KEPT lines for two widths that
      // were never opened - a true sentence about nothing, burying the 26
      // lines that were the entire point of the command.
      if (!perWidth[w2]) {
        console.log(`    ${String(w2).padStart(5)}px  not swept by this run - all ${was.length} label(s) carried through untouched`);
        continue;
      }
      for (const l of gains) console.log(`  + ${String(w2).padStart(5)}px  ${l}   ADDED - measured this run, never in the question before`);
      for (const l of misses) {
        if (DROP_MISSING) console.log(`  - ${String(w2).padStart(5)}px  ${l}   DROPPED - --drop-missing was passed`);
        else console.log(`    ${String(w2).padStart(5)}px  ${l}   KEPT - not reached this run; a label that leaves this file is a screen nobody checks again`);
      }
      addedN += gains.length;
      keptN += DROP_MISSING ? 0 : misses.length;
      droppedN += DROP_MISSING ? misses.length : 0;
    }
    writeFileSync(EXPECTED_PATH, JSON.stringify({
      note: "Every surface a full sweep must measure, per width. Regenerate with "
        + "`node scripts/sweep-widths.mjs <widths> --write-expected`, which ADDS what the run "
        + "found and KEEPS what it did not reach. READ THE DIFF: a label that disappears from "
        + "this file is a screen that stopped being checked, and only --drop-missing removes one.",
      written_at: new Date().toISOString(),
      // Both keys are always written: the one this run owns, rebuilt, and the
      // other carried through untouched. Dropping the sibling would delete a
      // whole mode's baseline, which is this file's own warning one level up.
      /* **KEYED PER WIDTH BY THE MODE THAT WIDTH ACTUALLY RAN IN, not by the
         global `--all`.** `FULL_WIDTHS` is {1920, 320}, so those two walk DEEP
         even in a default run - and the first version of this filed their deep
         numbers under `widths_core` because the FLAG was off. Nothing read
         them, since `expectedMap` sends a deep width to `widths`, so it was a
         baseline that looked authoritative and was never consulted: a number
         recorded under the wrong name, which is the fault this whole change
         exists to remove, reappearing inside the fix for it. Caught by reading
         the diff, which is what the file's own note asks for. */
      widths: Object.fromEntries(Object.entries(merged)
        .filter(([w2]) => RAN_DEEP.get(Number(w2)))
        .concat(Object.entries(priorDoc.widths || {}).filter(([w2]) => !(w2 in merged) || !RAN_DEEP.get(Number(w2))))),
      widths_core: Object.fromEntries(Object.entries(merged)
        .filter(([w2]) => RAN_DEEP.get(Number(w2)) === false)
        .concat(Object.entries(priorDoc.widths_core || {}).filter(([w2]) => !(w2 in merged) || RAN_DEEP.get(Number(w2)) !== false))),
    }, null, 2) + "\n");
    console.log(`\nEXPECTATION REWRITTEN in ${MODE_NAME()} mode (key ${EXPECTED_KEY()}): ${addedN} added, ${keptN} kept that this run did not reach, ${droppedN} dropped.`);
    console.log(`This run was NOT graded against it - read the diff before committing.`);
    // **AND WIDEN ONLY WHERE BOTH LANGUAGES AGREE — 2026-09-20, Andrew's
    // manager, after a Spanish run and an English run disagreed by four
    // surfaces for four unrelated reasons.** This file is ONE baseline shared
    // by every mode, so whichever run last held `--write-expected` decides
    // what the product is expected to be. That is how the 1440 list came to
    // record a truncated tour as correct in the first place.
    //
    // The rule: run English AND Spanish, and add only what both reached. A
    // baseline written from one language is a fact about that run, not about
    // the product.
    //
    // **And where they legitimately differ, that is a FINDING, never a number
    // to average.** A surface one language can reach and the other cannot is
    // either a missing string, a stale label in this file, or a real screen
    // that only renders in one locale — three different problems, and all
    // three are invisible the moment somebody splits the difference.
    console.log(`Widen only where BOTH languages reached it. A surface one language has and the`);
    console.log(`other does not is a finding, not a number to average - see docs/gotchas.md.`);
  } else if (ONLY) {
    console.log(`\nexpected-count gate SKIPPED — \`--only ${ONLY}\` measures a subset on purpose.`);
  } else if (!existsSync(EXPECTED_PATH)) {
    console.log("\nEXPECTED-COUNT GATE: no expectation file exists. Nothing compared the surfaces this "
      + "run measured against the surfaces it should have measured. Create it with --write-expected.");
    found++;
  } else {
    const doc = JSON.parse(readFileSync(EXPECTED_PATH, "utf8"));
    for (const w of SIZES) {
      const expected = expectedMap(doc, w)[String(w)];
      const got = perWidth[w] || [];
      if (!expected) {
        console.log(`\nEXPECTED-COUNT GATE: ${w}px has no expectation recorded — it was swept ungraded.`);
        found++;
        continue;
      }
      // **A DECLARED SKIP IS ACCOUNTED FOR; A SILENT ABSENCE IS NOT — ROADMAP
      // 8.1b.** This is the whole point of RECORDING the skip rather than only
      // printing it. A label missing from a run that declared why, at this
      // width, and whose probe agreed it was unreachable, is accounted for.
      // Every other missing label is still NEVER MEASURED and still fails.
      //
      // **THE EXPECTATION KEEPS THE LABEL.** Deleting these three lines from
      // the file would also have made the run pass, and it is the wrong fix:
      // after about 08:45 they are reachable and must be measured, and a label
      // that leaves that file is a screen nobody checks again.
      // A WIDTH THAT ABORTED IS NOT NINETY FINDINGS, IT IS ONE. Listing every
      // label it never reached buries the one fact that matters under its own
      // consequences — and the abort already counted itself where it happened,
      // so counting the unreached surfaces again would be the same failure
      // charged twice.
      const died = ABORTED.find((a) => a.width === w);
      if (died) {
        console.log(`expected-count ${w}px: NOT GRADED — the width aborted after `
          + `${died.measured} of ${expected.length} surfaces (${died.error}). `
          + `The ${expected.length - died.measured} it never reached are unmeasured, not clean.`);
        continue;
      }
      /* **A CORE RUN IS GRADED AGAINST THE CORE BASELINE NOW.** Until
         2026-10-03 there was only one baseline, written from a DEEP walk, and
         a core run of 41 surfaces was held to it and reported as a
         114-surface shortfall. The two modes have their own keys, so the only
         thing left to refuse is a mode with NO baseline recorded - which is
         ungraded rather than failed, and names the command that fixes it. */
      if (!expected.length) {
        UNJUDGED_W.add(w);
        console.log(`
EXPECTED-COUNT ${w}px: NOT GRADED - no ${RAN_DEEP.get(w) ? "deep" : "core"}`
          + ` baseline is recorded for this width. Write one with \`node scripts/sweep-widths.mjs`
          + ` ${w}${RAN_DEEP.get(w) ? " --all" : ""} --write-expected\`, then READ THE DIFF. Its`
          + ` ${got.length} measurement(s) are out of the verdict rather than counted as a shortfall.`);
        continue;
      }
      const skippedHere = new Set(SKIPPED.filter((k) => k.width === w).map((k) => k.label));
      const missingAll = expected.filter((l) => !got.includes(l));
      const declared = missingAll.filter((l) => skippedHere.has(l));
      const missing = missingAll.filter((l) => !skippedHere.has(l));
      const extra = got.filter((l) => !expected.includes(l));
      // DECLARED UNREACHABLE AND MEASURED ANYWAY is a contradiction the run has
      // to say out loud — one of the two is wrong about the screen, and which
      // one it is cannot be decided from here.
      const both = got.filter((l) => skippedHere.has(l));
      if (both.length) {
        found += both.length;
        console.log(`SKIP CONTRADICTED at ${w}px: declared unreachable AND measured — ${both.join(", ")}`);
      }
      if (!missing.length && !extra.length) {
        console.log(`expected-count ${w}px: ${got.length}/${expected.length} surfaces`
          + (declared.length
            ? `, ${declared.length} declared unreachable (${declared.join(", ")}), every one accounted for`
            : ", every one accounted for"));
        continue;
      }
      /* **AND A WIDTH THAT IS SHORT WITHIN ITS OWN MODE IS REFUSED, NOT
         MERELY COUNTED.** Before this, a deep width that reached 122 of 155
         contributed all 122 to the verdict and added 33 to the problem count,
         so a green could still be assembled out of a walk that missed a fifth
         of the screen. Same rule as an abort: a run that did not get to the
         end cannot say the end is healthy. */
      UNJUDGED_W.add(w);
      found += missing.length + extra.length;
      console.log(`\nEXPECTED-COUNT GATE FAILED at ${w}px: expected ${expected.length} surfaces, measured ${got.length}`
        + (declared.length ? `, ${declared.length} declared unreachable` : ""));
      for (const l of missing) console.log(`  NEVER MEASURED  ${l}`);
      // An extra surface is not a bug; an UNREVIEWED extra surface is. It has to
      // be added to the expectation deliberately, by somebody who looked at it.
      for (const l of extra) console.log(`  NOT EXPECTED    ${l}   (new? --write-expected, then read the diff)`);
    }
  }
}

// 2b-ii · **DID THE CUSTOMER'S HALF ACTUALLY COME OUT IN SPANISH?** — 2026-09-20,
// ROADMAP 14.15. Only runs under `LANG_APP=es`, and it is a POSITIVE
// assertion: every surface in `LANG_CERTIFY` must be seen, and must hold more
// translated phrases than English ones. A surface that was never reached is a
// finding, not an absence; a surface the catalogue recognised nothing on is a
// finding too, because "no Spanish and no English" is exactly what a page
// rendering neither looks like, and until now it passed in silence.
if (LANG_ES) {
  console.log("");
  // **THE HOOK THAT BREAKS IT.** `SWEEP_LANG_CANARY=1` forgets one certified
  // surface, which is the exact shape of a surface the run never reached. The
  // block below must call that NOT CERTIFIED and raise a finding — if it
  // prints five SPANISH lines with the canary set, it is reporting the list
  // rather than the measurement, which is the failure this whole block was
  // written to stop one level down.
  if (process.env.SWEEP_LANG_CANARY === "1") LANG_SEEN.delete(LANG_CERTIFY[0]);
  for (const label of LANG_CERTIFY) {
    const seen = LANG_SEEN.get(label);
    if (!seen) {
      console.log(`lang · ${label.padEnd(24)} NOT CERTIFIED — this surface was never reached, so this run `
        + `says nothing about whether the customer's half speaks Spanish`);
      found++;
    } else if (seen.es === 0 && seen.en === 0) {
      console.log(`lang · ${label.padEnd(24)} NOT CERTIFIED — the catalogue recognised nothing on it `
        + `(0 translated, 0 English). A page rendering neither looks exactly like this, and it used to pass`);
      found++;
    } else if (seen.es > seen.en) {
      // The soiling scale and the theme toggle share `"Light"`. If a
      // certification ever rests on one of these, the run says so out loud
      // rather than letting the count speak for it.
      const COLLISIONS = ["Claro", "Oscuro"];
      const leaned = (seen.hits || []).filter((h) => COLLISIONS.includes(h));
      console.log(`lang · ${label.padEnd(24)} SPANISH — ${seen.es} translated phrase(s) against ${seen.en} English`
        + (leaned.length ? `  ⚠ INCLUDES A KNOWN AMBIGUOUS KEY: ${leaned.join(", ")} — do not count this surface `
          + `until that key is settled` : ""));
      if (leaned.length) found++;
    } else {
      console.log(`lang · ${label.padEnd(24)} NOT SPANISH — ${seen.es} translated against ${seen.en} English. `
        + `\`dp.lang\` is the customer's key and it was set; the screen did not follow`);
      found++;
    }
  }
}

// 2c · THE LEDGER — one line per width per run, so flakiness is a number.
//
// Everything above this point describes THIS run. A width that aborts, or
// quietly comes up short, says so honestly and then the run ends and the fact
// goes with it. Five such runs in an afternoon are five separate bad
// afternoons unless somebody is keeping count, and on 2026-09-20 nobody was:
// 1440 aborted once and truncated its tour three times, and the pattern lived
// only in one session's memory of having watched it happen.
//
// **A MODE IS ITS OWN HISTORY.** `?lite=1` and the Spanish pass measure
// different pages, so mixing their outcomes into one window would let a
// healthy default mode hide a broken lite one and vice versa.
if (!ONLY && !WRITE_EXPECTED) {
  const measuredBy = {};
  for (const c of CERT) measuredBy[c.width] = (measuredBy[c.width] || 0) + 1;
  const want = existsSync(EXPECTED_PATH)
    ? JSON.parse(readFileSync(EXPECTED_PATH, "utf8")) : {};
  const rows = existsSync(LEDGER_PATH)
    ? (JSON.parse(readFileSync(LEDGER_PATH, "utf8")).runs || []) : [];
  const sha = (process.env.GIT_SHA || "").slice(0, 8);
  for (const w of SIZES) {
    const died = ABORTED.find((a) => a.width === w);
    // Mode-matched, like the gate: the ledger decides `short` against the
    // number for the mode this width actually ran in, never the other one.
    const expected = (expectedMap(want, w)[String(w)] || []).length;
    const measured = measuredBy[w] || 0;
    const declared = SKIPPED.filter((k) => k.width === w).length;
    // **THREE OUTCOMES AND NO FOURTH.** `short` is the quiet one and the
    // reason this ledger is not just a crash log: a width that reached every
    // screen it could name is complete, a width that died is aborted, and a
    // width that simply came up one screen shy is neither and is exactly what
    // nobody notices twice.
    const outcome = died ? "aborted"
      : (expected && measured + declared < expected) ? "short"
      : "complete";
    rows.push({
      at: new Date().toISOString(), sha, width: w, mode: MODE || "default",
      outcome, measured, declared, expected,
      ...(died ? { error: died.error } : {}),
    });
  }
  // Keep it small on purpose: forty rows per width is eight windows of five,
  // which is more history than any question here needs.
  const trimmed = [];
  for (const w of new Set(rows.map((r) => r.width))) {
    for (const m of new Set(rows.filter((r) => r.width === w).map((r) => r.mode))) {
      trimmed.push(...rows.filter((r) => r.width === w && r.mode === m).slice(-40));
    }
  }
  trimmed.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  writeFileSync(LEDGER_PATH, JSON.stringify({
    note: "One row per width per run. `outcome` is complete | short | aborted. A width fails "
      + "on a RATE, never on one bad run: more than " + LEDGER_MAX_BAD + " bad in the last "
      + LEDGER_WINDOW + " runs of the same mode. One abort is noise; four of five is a broken "
      + "instrument, and only a count can tell those apart.",
    updated_at: new Date().toISOString(),
    window: LEDGER_WINDOW,
    max_bad: LEDGER_MAX_BAD,
    runs: trimmed,
  }, null, 2) + "\n");
  console.log("");
  for (const w of SIZES) {
    const mine = trimmed.filter((r) => r.width === w && r.mode === (MODE || "default"));
    const v = ledgerVerdict(mine);
    const tail = v.outcomes.join(" ");
    if (!v.judged) {
      console.log(`ledger ${String(w).padStart(5)}px  NOT JUDGED — ${v.runs} run(s) on record, `
        + `${LEDGER_WINDOW} needed before a rate means anything. So far: ${tail}`);
      continue;
    }
    if (v.broken) {
      console.log(`\nLEDGER: ${w}px IS A BROKEN INSTRUMENT — ${v.bad} of its last ${v.runs} runs `
        + `did not complete: ${tail}`);
      console.log(`  One bad run is noise and this is not one bad run. Every measurement this `
        + `width has reported recently is worth what its worst run is worth, and no single run `
        + `above can tell you that.`);
      found++;
      continue;
    }
    console.log(`ledger ${String(w).padStart(5)}px  ${v.bad} of the last ${v.runs} runs `
      + `did not complete (${tail}) — under the bar of more than ${LEDGER_MAX_BAD}`);
  }
}

// 3 · THE CONTACT SHEET — one page carrying every screen this run looked at.
// A count in a log is not something a person scans. Seventy pictures are.
if (CERT.length) {
  const esc = (t) => String(t).replace(/[<>&]/g, (m) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[m]));
  const figures = CERT.map((c) => `<figure class="${c.findings.length ? "bad" : "ok"}">
  <img loading="lazy" src="${c.shot.replace(ART + "/", "")}" alt="${esc(c.label)}">
  <figcaption><b>${esc(c.label)}</b><span>${c.width}px · ${c.elements} elements · ${c.asked} questions</span>
  ${c.findings.length ? `<ul>${c.findings.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
  </figcaption></figure>`).join("\n");
  writeFileSync(`${ART}/index.html`, `<!doctype html>
<meta charset="utf-8">
<title>Width sweep ${SIZES.join(", ")}${MODE_WORDS ? " " + MODE_WORDS : ""}</title>
<style>
  :root { --ink:#e9e6df; --bg:#14140f; --ok:#4a7357; --bad:#c4502f; }
  body { background:var(--bg); color:var(--ink); margin:0; padding:26px;
         font:13px/1.55 ui-monospace,"SF Mono",Menlo,Consolas,monospace; }
  h1 { font-size:19px; font-weight:600; margin:0 0 6px; letter-spacing:-.01em; }
  .meta { opacity:.55; margin-bottom:26px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:16px; }
  figure { margin:0; border:1px solid #2b2b23; border-radius:5px; overflow:hidden; background:#1a1a14; }
  figure.bad { border-color:var(--bad); }
  figure.ok { border-left:3px solid var(--ok); }
  img { width:100%; display:block; border-bottom:1px solid #2b2b23; background:#000; }
  figcaption { padding:8px 10px; }
  figcaption span { opacity:.5; display:block; font-size:11px; }
  ul { margin:6px 0 0; padding-left:15px; color:#ff9d84; font-size:11px; }
</style>
<h1>Width sweep — ${SIZES.join(", ")}px${MODE_WORDS ? " · " + MODE_WORDS : ""}</h1>
${LANG_ES ? `<p class="note">Spanish throughout, including the booking page and the sign-in screens — both language keys are set before the first paint (<code>dp.lang</code> for the customer’s surface, <code>dp.lang.app</code> for the dashboard), and every surface here is checked against its own catalogue rather than assumed. The ${ENGLISH_ONLY.size} exceptions are ${[...ENGLISH_ONLY].join(", ")}: those pages import no translation scope and contain no translatable strings at all, so there is nothing to switch — a product gap, logged to ROADMAP 2.12, not something this run can force.</p>` : ""}
<div class="meta">${STARTED} · ${CERT.length} surfaces · ${assertions} questions asked · ${found} finding(s)
 · canary: ${canaries.map((c) => `${c.width}px ${c.caught ? "caught" : "MISSED"}`).join(", ") || "none run"}</div>
<div class="grid">
${figures}
</div>
`);
  console.log(`contact sheet  ${ART}/index.html`);
}

// 4 · THE RECEIPT. `scripts/receipt.mjs` recomputes the verdict from these
// numbers and never trusts the word this script printed.
{
  const expectedTotal = (() => {
    if (ONLY || WRITE_EXPECTED || !existsSync(EXPECTED_PATH)) return CERT.length;
    const doc = JSON.parse(readFileSync(EXPECTED_PATH, "utf8"));
    return SIZES.reduce((n, w) => n + (expectedMap(doc, w)[String(w)]?.length ?? 0), 0);
  })();
  // **THE FOUR COUNTS STILL HAVE TO AGREE — ROADMAP 8.1b.** `receipt.mjs`
  // refuses a receipt where expected, discovered, attempted and completed are
  // not the same number, and it is right to: discovering 16 and completing 3 is
  // how a sweep reports clean over 38 findings. A declared skip therefore comes
  // OFF the expected total and is carried in `skipped_targets`, which that file
  // already understands — "skips are failures unless allowlisted" is its own
  // rule and is reused here rather than replaced.
  //
  // **THE ALLOWLIST EXPIRES ON PURPOSE.** The claim being allowlisted is not
  // "these three are optional" — it is "a job is finished once it has ENDED, so
  // before the first shift of the day completes this state cannot exist". That
  // is a claim about the product that could stop being true, and an expiry is
  // what makes somebody re-read it instead of inheriting it.
  // **ONLY A SKIP THE EXPECTATION WAS COUNTING COMES OFF THE TOTAL — 2026-09-19.**
  // The three job-record labels are in `sweep-widths.expected.json`, so when
  // they are skipped the run really did measure one fewer thing than it owed
  // and `expected_targets` has to drop or the four counts stop agreeing. The
  // two `gear · subscription, …` labels are NOT in that file and never were:
  // the default demo cannot produce them at all, so they were never owed.
  // Subtracting those as well would make expected 373 against 375 discovered
  // and `receipt.mjs` would fail a run that did everything asked of it — the
  // gate crying wolf, which is the failure this file has written down twice.
  // They are still reported in `skipped_targets` and still carry their reason.
  const owed = (() => {
    if (ONLY || WRITE_EXPECTED || !existsSync(EXPECTED_PATH)) return new Set();
    const doc = JSON.parse(readFileSync(EXPECTED_PATH, "utf8"));
    const set = new Set();
    for (const w of SIZES) for (const l of expectedMap(doc, w)[String(w)] || []) set.add(`${w}|${l}`);
    return set;
  })();
  const countedSkips = SKIPPED.filter((k) => owed.has(`${k.width}|${k.label}`)).length;
  const reachableTotal = expectedTotal - countedSkips;
  /* **THE GATE RUNS AFTER `JUDGED` IS BUILT, SO THE SET IS RE-TAKEN HERE.**
     `JUDGED` above drops aborted widths; the expected-count gate then refuses
     two more kinds - a core-only width held to a deep number, and a width
     short within its own mode - and those refusals land in `UNJUDGED_W`
     afterwards. Reading `JUDGED` straight into the receipt would have let a
     refused width keep contributing its surfaces, which is the whole fault
     this pair of changes exists to stop, surviving one scope further in. */
  const JUDGED_FINAL = JUDGED.filter((c) => !UNJUDGED_W.has(c.width));
  if (UNJUDGED_W.size) {
    console.log(`
${JUDGED.length - JUDGED_FINAL.length} further measurement(s) from `
      + `${UNJUDGED_W.size} width(s) the expected-count gate REFUSED are out of the verdict: `
      + `${[...UNJUDGED_W].join(", ")}px.`);
  }
  console.log(`VERDICT STANDS ON ${JUDGED_FINAL.length} of ${CERT.length} measurement(s).`
    + (JUDGED_FINAL.length ? "" : " NOTHING IS JUDGED; this run proves nothing."));
  const { path: rp } = writeReceipt({
    check_id: `sweep-widths-${SIZES.join("-")}${MODE}`,
    started_at: STARTED,
    status: found ? "fail" : "pass",
    expected_targets: reachableTotal,
    // **`JUDGED`, NOT `CERT`** - a width that aborted contributes none of its
    // partial measurements. With `CERT` the receipt read 153 discovered against
    // 463 expected and the arithmetic rule in `receipt.mjs` was the only thing
    // standing between this run and a verdict over a third of its coverage.
    // Now an all-aborting run discovers ZERO and fails closed on the rule that
    // exists for exactly it: *a check that discovered nothing has proved nothing*.
    discovered_targets: JUDGED_FINAL.length,
    attempted_targets: JUDGED_FINAL.length,
    completed_targets: JUDGED_FINAL.length,
    skipped_targets: SKIPPED.length,
    ...(SKIPPED.length ? {
      skip_allowlist: {
        reason: "Surfaces the demo cannot be in the state for at the hour this ran. Each one "
          + "declared its own reason in the output and each was probed again before the skip was "
          + "accepted — a skip over a reachable surface is refused and fails the run (ROADMAP 8.1b).",
        expires: "2027-01-01",
        skipped: SKIPPED,
      },
    } : {}),
    assertions_executed: assertions,
    // The floor. Four geometry questions per surface is the least a real
    // measurement of a real screen can involve — well under a healthy run, and
    // far above anything a blank page or a crashed screen could produce.
    min_assertions: Math.max(1, CERT.length * 4),
    failures: (() => {
      const geometry = CERT.filter((c) => c.findings.length)
        .map((c) => ({ target: c.label, width: c.width, findings: c.findings }));
      const geometryCount = CERT.reduce((n, c) => n + c.findings.length, 0);
      const other = found - geometryCount;
      if (other <= 0) return geometry;
      // The count is authoritative; the captured lines are the evidence for it.
      // If the capture missed some, `captured` is short of `count` and says so
      // in the receipt rather than rounding the difference away.
      return [...geometry, {
        target: "(not a per-surface geometry finding)",
        count: other,
        captured: LOUD,
        why: other === LOUD.length
          ? "screens this run could not reach or measure — every one is printed above"
          : `${other} problem(s) raised, ${LOUD.length} line(s) captured. The capture pattern `
            + "does not know every phrase this script prints; read the run output.",
      }];
    })(),
    dimensions: {
      viewports: SIZES,
      locales: [`${LANG_ES ? "es" : "en"}${LITE ? "?lite=1" : ""}`],
      identities: ["demo-detail-owner"],
    },
    artifacts: [`${ART}/index.html`],
    warnings: [],
    canary: {
      id: CANARY_CLASS,
      observed_failure: canaries.length > 0 && canaries.every((c) => c.caught),
      per_width: canaries,
    },
  });
  console.log(`receipt        ${rp.split(/[\\/]/).slice(-2).join("/")}   —  validate: node scripts/receipt.mjs`);
}

// **AND ZERO SURFACES IS A BROKEN INSTRUMENT, NOT A CLEAN RUN.** A run that
// measured nothing has to say so louder than a run that measured everything
// and found nothing.
if (!surfaces) { console.log("NOTHING WAS MEASURED - that is a broken run, not a pass."); found++; }
await reportSourceMoved(changedSince, !found);
process.exit(found ? 1 : 0);
