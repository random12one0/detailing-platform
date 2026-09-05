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
import { createRequire } from "node:module";
import { reportSourceMoved, watchSource } from "./source-guard.mjs";
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
const BASE = "http://localhost:5173";
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
// Reviews is the twelfth and is new. There is no FAQ row: its storage
// landed and its screen deliberately did not.
const BUSINESS_ROWS = ["Business info", "Your colour", "Photo gallery", "Reviews",
  // "How you get paid" is roadmap 2.20 stage 1, and it is added in the change
  // that BUILT it rather than in the item that later finds it broken — which
  // is the whole lesson of the nine times this same gap has been recorded.
  // Its own risk is the paired Venmo / Cash App row at 320, exactly like the
  // plan form's segmented-control-beside-a-number-field.
  "Services & add-ons", "Monthly plans", "How you get paid", "Promo codes & sale",
  "Hours & days off", "Booking rules"];
// "Your subscription" is NOT in this list and that is deliberate: it is
// owner-only and it is the one settings screen whose content comes from an
// edge function rather than a table, so it is walked as its own block below
// with a wait for what the answer draws. Roadmap 2.20 stage 2.
const GEAR_ROWS = ["Notifications", "Message templates", "Team", "This device"];

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
  for (const el of document.querySelectorAll("body *")) {
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const txt = (el.textContent || "").trim().slice(0, 26);
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
    if (gap >= 0 && gap < 4) out.push(`touching       ${gap}px gap  ${name(el)} → ${name(n)}  «${txt}»`);
  }
  return [...new Set(out)];
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
      if (document.querySelector(".spinner, [data-loading]")) { last = now; continue; }
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
const appear = async (loc, ms = 6000) => {
  try { await loc.first().waitFor({ state: "attached", timeout: ms }); return true; }
  catch { return false; }
};

// --- ONE SIGN-IN, NOT FIVE --------------------------------------------------
// The form was filled in again at every width. It is the same account and the
// same session; Playwright can carry it across contexts.
let signedIn = null;

const browser = await chromium.launch();
let found = 0;
let narrow = 0;   // desktop widths whose content column is still phone-sized

for (const w of SIZES) {
  // A width the caller asked for BY NUMBER is always deep — `sweep-widths 1440`
  // is somebody asking a question about 1440, and answering a narrower one
  // than they asked is the "a skipped check reads like a passing one" family.
  deep = ALL || WIDTHS.length > 0 || FULL_WIDTHS.has(w);
  const widthStart = Date.now();
  console.log(`\n══ ${w}px ══${deep ? "" : " core only, --all for everything "}════════════════════════════════`);
  const ctx = await browser.newContext({
    viewport: { width: w, height: heightFor(w) }, deviceScaleFactor: 1,
    ...(signedIn ? { storageState: signedIn } : {}),
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: () => Promise.resolve(), configurable: true });
  });
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
  const say = async (label) => {
    if (ONLY && !label.toLowerCase().includes(ONLY.toLowerCase())) return;
    const broken = await page.evaluate(() => /That didn't load/.test(document.body.innerText));
    if (broken) {
      // textContent, not innerText: the reason lives inside a CLOSED <details>,
      // which innerText correctly reports as invisible — and an empty reason
      // beside the word CRASHED is the least useful half of this message.
      const why = await page.evaluate(() =>
        (document.querySelector("details")?.textContent ?? "").replace("Technical detail", "").trim());
      console.log(`${label.padEnd(24)} CRASHED — the error boundary is on screen: ${why}`);
      found++;
      return;
    }
    const rows = await page.evaluate(CHECK);
    found += rows.length;
    console.log(`${label.padEnd(24)} ${rows.length ? "\n  " + rows.join("\n  ") : "clean"}`);
  };
  // The sheet opens at a 56vh peek. Pull it to full so the rest of the screen
  // is laid out and measurable, not just the part currently on screen.
  const grow = async () => {
    await page.evaluate(() => { const s = document.querySelector(".sheet"); if (s) s.style.height = "92vh"; });
    await settle(page, 400);
  };

  await page.goto(`${BASE}/book/demo-detail${LITE}`, { waitUntil: "domcontentloaded" });
  await settle(page, 3200);
  await say("book · step 1");

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

  await page.goto(`${BASE}/app${LITE}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", "demo@detailplatform.com");
    // Must match scripts/seed-demo.mjs, same as shoot-dashboard.mjs.
    await page.fill("input[type=password]", "demo123");
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
    // Kept for the remaining widths. The FIRST width still signs in through
    // the real form, so the sign-in path is still exercised every run.
    signedIn = await ctx.storageState();
  }
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

  for (const t of ["Today", "Calendar", "Money", "Clients", "Business"]) {
    await page.getByRole("button", { name: t, exact: true }).first().click();
    await settle(page, 1700);
    await say(t);
  }

  // THE JOB RECORD IS A SCREEN AND WAS NEVER SWEPT. 26 of the product's 126
  // capabilities live on it, it is reached from four places, and until
  // roadmap 2.11 step 6 stage 2 rebuilt it nothing here had ever opened it —
  // so "clean" said nothing about the widest object in the app. Two jobs,
  // because the record's shape depends on the job's state: the LIT card is a
  // finished, unpaid job (Finalize payment, no Mark completed) and the first
  // plain row is one still to do (Mark completed, no money action).
  await page.getByRole("button", { name: "Today", exact: true }).first().click();
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
      await page.getByRole("button", { name: "Today", exact: true }).first().click();
      await settle(page, 1400);
      await page.locator(".reqcard").first().getByRole("button", { name: "Quote", exact: true }).click();
      await settle(page, 1300);
      await grow();
      await say("send a quote");
      await page.keyboard.press("Escape");
      await settle(page, 700);
    }
  }

  await page.getByRole("button", { name: "Today", exact: true }).first().click();
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
  for (const [label, sel] of [["job record · finished", ".dayrail .row-item.landed"],
                              ["job record · to do", ".dayrail .row-item:not(.landed)"]]) {
    const job = page.locator(sel).first();
    if (!(await job.count())) { console.log(`${label.padEnd(24)} none on the rail at this hour — see Tomorrow below`); continue; }
    await job.click();
    await settle(page, 1500);
    await grow();
    await say(label);
    await page.keyboard.press("Escape");
    await settle(page, 700);
  }

  // TOMORROW'S FIRST JOB — a confirmed booking that has not happened, which is
  // the record shape the rail cannot promise at every hour. Reached the way a
  // detailer reaches it: the Tomorrow row below --wrap, the second column's
  // list above it.
  {
    await page.getByRole("button", { name: "Today", exact: true }).first().click();
    await settle(page, 1400);
    // TWO DOORS, AND NEITHER IS GUARANTEED — count before clicking. A
    // `.first().click()` on an empty locator throws after 15s and takes the
    // WHOLE remaining pass with it, which is the most expensive way this
    // script can fail: four widths lost to a missing row. It cost a timed run
    // on 2026-09-03. Nothing in here may assume the demo's shape.
    const tomorrowRow = page.locator(".row-item", { hasText: "Tomorrow" }).first();
    const deskRow = page.locator(".col-2 .settled-row").first();
    let opened = false;
    if (await tomorrowRow.count()) {
      await tomorrowRow.click();
      await settle(page, 1400);
      await grow();
      const inSheet = page.locator(".sheet .row-item, .sheet .card [role=button]").first();
      if (await inSheet.count()) {
        await inSheet.click();
        await settle(page, 1400);
        await grow();
        opened = true;
      }
    } else if (await deskRow.count()) {
      await deskRow.click();
      await settle(page, 1500);
      opened = true;
    }
    if (opened) await say("job record · tomorrow");
    else console.log("job record · tomorrow".padEnd(24) + "no tomorrow to open (is the demo seeded?)");
    await page.keyboard.press("Escape");
    await settle(page, 700);
    await page.keyboard.press("Escape");
    await settle(page, 500);
  }

  // MONEY IS FIVE PERIODS, A RECORD AND A MODAL, AND THE SWEEP ONLY EVER SAW
  // ONE OF THEM — the same gap as the job record before stage 2 and the
  // calendar before stage 3. Clicking the tab measured the current month with
  // nothing open, so the period control (the one row on this screen that has
  // to hold ONE LINE at a desk and wrap 3 + 2 on a phone), the unpaid job and
  // the expense form had never been laid out at any width. The three kinds
  // below are the ones that change the row's width: "6 months" is the widest
  // label, "Week" the widest period LABEL ("Aug 30 – Sep 5"), and Lifetime is
  // the one that draws no stepper at all.
  await page.getByRole("button", { name: "Money", exact: true }).first().click();
  await settle(page, 1600);
  for (const k of ["Week", "6 months", "Lifetime"]) {
    const chip = page.getByRole("radio", { name: k, exact: true });
    if (!(await chip.count())) { console.log(`Money · ${k}`.padEnd(24) + "NO SUCH PERIOD"); found++; continue; }
    await chip.first().click();
    await settle(page, 1500);
    await say(`Money · ${k}`);
  }
  await page.getByRole("radio", { name: "Month", exact: true }).first().click();
  await settle(page, 1500);
  {
    const owed = page.locator(".card", { hasText: "Mark paid" }).first();
    if (await owed.count()) {
      await owed.locator("[role=button]").first().click();
      await settle(page, 1500);
      await grow();
      await say("Money · an unpaid job");
      await page.keyboard.press("Escape");
      await settle(page, 700);
    }
    const add = page.getByRole("button", { name: "Add", exact: true });
    if (await add.count()) {
      await add.first().click();
      await settle(page, 1200);
      await grow();
      await say("Money · add an expense");
      await page.keyboard.press("Escape");
      await settle(page, 700);
    }
  }

  // THE CALENDAR IS THREE SCREENS AND THE SWEEP ONLY EVER SAW ONE. Until
  // roadmap 2.11 step 6 stage 3 this script clicked the Calendar tab, measured
  // the month, and moved on — so the day (four capabilities, three editors
  // that expand in place) and the history (a filter bar, a ruled list with
  // columns, month rules) were never opened at any width. Same family as the
  // job record before stage 2 and as `dead-width`: a check that never reaches
  // a thing reports exactly like a check that reached it and found nothing.
  await page.getByRole("button", { name: "Calendar", exact: true }).first().click();
  await settle(page, 1500);
  {
    // The 2nd cell of the demo month carries two jobs; the panel opens under
    // the grid at every width now, so there is no sheet to grow.
    const cell = page.locator(".cal-cell").nth(1);
    if (await cell.count()) {
      await cell.click();
      await settle(page, 1600);
      await say("Calendar · a day");
      // The three state cards are the day's own editors and each expands in
      // place (W1). An unopened editor is a check that never reached it.
      for (const label of ["Block this day", "Hours", "How this day works"]) {
        const card = page.locator(".daypanel .card", { hasText: label });
        if (!(await card.count())) continue;
        await card.first().click();
        await settle(page, 900);
        await say(`Calendar · day, ${label}`);
        await card.first().click();
        await settle(page, 500);
      }
      await page.locator(".daypanel .x").first().click();
      await settle(page, 600);
    }
  }
  await page.getByRole("button", { name: "History", exact: true }).first().click();
  await settle(page, 2200);
  await say("Calendar · history");
  {
    // The nine chips are behind one control below --wrap and in the second
    // column above it, so the open filter bar is a phone-only state.
    const filter = page.getByRole("button", { name: "Filter" });
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
  await page.getByRole("button", { name: "Clients", exact: true }).first().click();
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
    const b = page.getByRole("radio", { name: s, exact: true });
    if (!(await b.count())) continue;
    await b.first().click();
    await settle(page, 600);
    await say(`Clients · sorted by ${s}`);
  }
  {
    const chip = page.getByRole("button", { name: "Not seen in 3 months" });
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
        const write = page.getByRole("button", { name: /^Email these \d+$/ });
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
  const client = page.locator(".rows.cols.clients .row-item").first();
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
      await page.keyboard.press("Escape");
      await settle(page, 700);
    }
    await page.keyboard.press("Escape");
    await settle(page, 700);
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

  const walk = async (label, rows) => {
    for (const key of rows) {
      const row = page.locator(".nav-row", { hasText: key });
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
    console.log(`${"the long tail".padEnd(24)} skipped at ${w} — ${BUSINESS_ROWS.length + GEAR_ROWS.length} settings screens, the gear, setup x7, tour x7`);
    await ctx.close();
    widthMs.push([w, Date.now() - widthStart]);
    continue;
  }

  await page.getByRole("button", { name: "Business", exact: true }).first().click();
  await settle(page, 1400);

  // THE QR IS BEHIND A BUTTON, SO IT IS A STATE THIS SCRIPT HAS TO ENTER.
  // Added with it (2026-09-02). Opening Business and measuring the index says
  // nothing about a 200px white plate and a two-button row that only exist
  // after a click — which is the finding stage 6 hit four times over on the
  // job record, the calendar, Money and Clients, and the reason its own
  // settings rows are walked rather than assumed.
  const qr = page.getByRole("button", { name: "Generate QR code" });
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
  await page.locator(".nav-row", { hasText: "Monthly plans" }).first().click().catch(() => {});
  await settle(page, 1300);
  const addPlan = page.getByRole("button", { name: "Add a plan" });
  if (await appear(addPlan)) {
    await addPlan.first().click();
    await settle(page, 800);
    await say("Business · Monthly plans, the plan form");
  } else { console.log(`${"the Add a plan button".padEnd(24)} NO SUCH BUTTON`); found++; }
  const logMember = page.getByRole("button", { name: "Log a member" });
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
  const plansQr = page.getByRole("button", { name: /QR code/i });
  if (await plansQr.count()) {
    await plansQr.first().click();
    await settle(page, 900);
    await say("Business · Monthly plans, the QR");
  }
  // Escape, not the tab — the same reason the Notifications block below gives.
  await page.keyboard.press("Escape");
  await settle(page, 800);

  // THE SECOND DOOR. The gear is a destination rather than an overlay, so it
  // takes the main area and its own index has to be measured too — until
  // this stage every one of these screens was reached from one list and four
  // of them have moved.
  await page.getByRole("button", { name: "Settings", exact: true }).first().click();
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
  await page.getByRole("button", { name: "Notifications" }).first().click().catch(() => {});
  await settle(page, 1200);
  const addLine = page.getByRole("button", { name: "Add a line" });
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
  await page.getByRole("button", { name: "Team" }).first().click().catch(() => {});
  await settle(page, 1200);
  const change = page.getByRole("button", { name: "Change" });
  // The member list is a database read too — same race, same fix as the two
  // plan buttons above. `count()` is taken AFTER the wait, because the block
  // wants the LAST member rather than the first.
  const changes = (await appear(change)) ? await change.count() : 0;
  if (changes > 0) {
    await change.nth(changes - 1).click();
    await settle(page, 700);
    await say("gear · Team, a role open");
  } else { console.log(`${"the Change button".padEnd(24)} NO SUCH BUTTON`); found++; }
  await page.getByRole("button", { name: "Settings", exact: true }).first().click().catch(() => {});
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
  await page.getByRole("button", { name: "Settings", exact: true }).first().click().catch(() => {});
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
    } else {
      console.log(`${"subscription · the rungs".padEnd(24)} NOT MEASURED — this demo has a subscription. Re-seed without --subscription to see the ladder and the consent tick.`);
    }

    const cancel = page.locator("[data-billing-cancel]");
    if (await cancel.count()) {
      await cancel.first().click();
      await settle(page, 800);
      await grow();
      await say("gear · subscription, cancelling");
    } else {
      console.log(`${"subscription · cancelling".padEnd(24)} NOT MEASURED — no live subscription on this demo. node scripts/seed-demo.mjs --subscription=past_due`);
    }

    if (!(await page.locator("[data-billing-dunning]").count())) {
      console.log(`${"subscription · past due".padEnd(24)} NOT MEASURED — nothing is overdue on this demo. node scripts/seed-demo.mjs --subscription=past_due`);
    }
    await page.keyboard.press("Escape");
    await settle(page, 800);
  } else {
    console.log(`${"Your subscription".padEnd(24)} NO SUCH ROW (gear) — owner-only, so a staff session is expected to miss it`);
    found++;
  }

  // FIRST RUN — THE SETUP FORM'S SEVEN STEPS AND THE WALKTHROUGH'S SEVEN,
  // added 2026-09-02 with roadmap 2.11 step 6 stage 7. It is the same finding
  // this script has now made six times: a screen nothing enters reports
  // exactly like a screen that was entered and found clean. These two are the
  // worst case of it, because NEITHER IS REACHABLE BY CLICKING A TAB — the
  // form is behind a row that only exists while setup is unfinished, and the
  // tour is behind a row in the gear. Every step is a different screen: step 1
  // carries a list that grows with the tenant, step 5 is a single control with
  // most of a phone under it, step 7 is a whole settings screen embedded, and
  // the tour's caption is a 340px fixed box that has to fit a 320px phone.
  //
  // NOTHING HERE WRITES. The form is walked with "I'll do this later", which
  // is the skip path; Continue is the one that commits and is never pressed.
  // `seed-demo.mjs` pins the demo at "6 of 7 done" so the row it opens from is
  // always there.
  await page.getByRole("button", { name: "Business", exact: true }).first().click();
  await settle(page, 1400);
  // WAIT FOR THE ROW RATHER THAN ASSUME IT, and the reason is a real property
  // of the screen: Business renders its rows immediately with "…" summaries
  // and fills them in when one round trip returns, and the resume row is the
  // one that is ABSENT until then rather than merely unfilled. `settle()`
  // cannot see that — there is no spinner and the DOM goes quiet — so the
  // click below raced the fetch and reported NO SUCH ROW. It bit in `--lite`
  // first, because everything settles sooner with no animations running.
  const finish = page.locator(".nav-row", { hasText: "Finish setting up" });
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
      await say(`setup · ${line.replace(/ · .*/, "").toLowerCase()}`);
      const later = page.getByRole("button", { name: "I'll do this later" });
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

  await page.getByRole("button", { name: "Settings", exact: true }).first().click();
  await settle(page, 1400);
  const tourRow = page.locator(".nav-row", { hasText: "Show me around" });
  if (!(await tourRow.count())) {
    console.log(`${"the tour row".padEnd(24)} NO SUCH ROW`);
    found++;
  } else {
    await tourRow.first().click();
    await settle(page, 1800);
    // The tour is six steps on an empty dashboard and seven on a seeded one
    // (a step whose target is absent skips itself), so the loop asks whether
    // the card is still there rather than counting to a fixed number.
    // THE ONE THING IN THIS SCRIPT THAT IS NOT ABOUT AN EDGE, and it is here
    // rather than in a suite of its own because the tour is already open, the
    // browser is already logged in, and the alternative is a SECOND
    // login-dependent browser test for two assertions.
    //
    // It exists because the walkthrough overlay says aria-modal="true" and
    // its rule 1 says the lit element is not clickable, and BOTH of those
    // were false when it was built: a backdrop stops a pointer and stops
    // nothing else, so Tab walked into the dashboard behind the dim. Two
    // React defects hid the fix twice (an effect keyed on an inline callback
    // re-ran its own cleanup; a `visibility: hidden` card cannot take focus).
    // Nothing this script otherwise measures could see any of it — a tour
    // with no keyboard behaviour photographs perfectly. One width is enough:
    // the trap has no layout in it.
    if (w === 392) {
      const inCard = async () => page.evaluate(() =>
        !!document.querySelector(".tourcard")?.contains(document.activeElement));
      if (!(await inCard())) {
        console.log(`${"tour · focus on open".padEnd(24)} FOCUS IS OUTSIDE THE CAPTION CARD`);
        found++;
      }
      for (let k = 0; k < 5; k++) {
        await page.keyboard.press("Tab");
        await settle(page, 200);
        const a = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;   // the browser's own cycle stop
          return document.querySelector(".tourcard")?.contains(el) ? null
            : (el.tagName + "." + el.className).slice(0, 50);
        });
        if (a) { console.log(`${"tour · tab escapes".padEnd(24)} ${a}`); found++; break; }
      }
    }

    for (let k = 1; k <= 7; k++) {
      if (!(await page.locator(".tourcard").count())) break;
      await say(`tour · step ${k}`);
      await page.locator(".tourcard button.primary").click();
      await settle(page, 1000);
    }
  }

  await ctx.close();
  widthMs.push([w, Date.now() - widthStart]);
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
await reportSourceMoved(changedSince, !found);
process.exit(found ? 1 : 0);
