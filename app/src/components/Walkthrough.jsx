// FIRST RUN, HALF TWO: the guided walkthrough. Roadmap 2.11 step 6, stage 7.
//
// THE OWNER'S THREE CONSTRAINTS ARE THE SPECIFICATION, NOT PREFERENCES —
// screen designs §13b, quoting him: *"not have paragraphs of text… more steps
// and not try to combine any things into one step… just put some thought
// through into that."* So:
//
//   NO PARAGRAPHS      one sentence a step. The `STEPS` array below is the
//                      whole of the copy, and every entry is one clause.
//   MORE STEPS         seven, where a tour of this app could be three.
//   NEVER TWO THINGS   one ELEMENT a step. If a step needs "and", it is two
//                      steps, and that is a rule about the sentence as much
//                      as about the target.
//
// THE MECHANIC IS ONE ELEMENT AND A VERY LARGE SHADOW (component inventory
// §1c). `box-shadow: 0 0 0 9999px <the dim>` darkens everything OUTSIDE the
// box, so the box is the hole — no mask, no clip-path arithmetic, no canvas,
// no second copy of the screen, and crucially nothing is applied to the
// element being pointed at. That matters more here than anywhere else in the
// product: this runs over the LIVE dashboard with the detailer's real data,
// and a tour that restyles what it points at is showing them something else.
//
// SIX RULES CAME WITH IT, each because the obvious version gets it wrong:
//
//  1. THE LIT ELEMENT IS NOT CLICKABLE. `.tourblock` is a transparent
//     full-screen layer that eats every pointer event; you advance with this
//     component's own Next. Letting the real `+` be tapped while a caption
//     points at it opens New booking in the middle of a tour, and there is no
//     good answer for what the tour does then.
//  2. TARGETS ARE NAMED BY A STABLE ATTRIBUTE, never by position or selector
//     shape. §13b requires this be re-checked at 1180 and above, where its
//     targets have moved into a second column and the tab bar has become a
//     rail on the left edge — a live-measured rect follows them for free.
//     It is also why no sentence names a POSITION (phone pass §15): "your
//     whole month" rather than "the second button along the bottom", because
//     the bottom bar is the left rail at a desk.
//  3. A STEP WHOSE TARGET IS NOT ON THE PAGE IS SKIPPED, SILENTLY. Not a
//     nicety: this is designed for a BRAND-NEW dashboard and one of its steps
//     is "a job", which a first-run detailer does not have. The tour is six
//     steps that day and seven later, and both are correct. STAFF lose two
//     more — they have no Money and no Business — and the same line covers
//     it. It must be verified against the EMPTY dashboard, which is the
//     opposite of every other screen in this rebuild.
//  4. SCROLL THE TARGET INTO VIEW, THEN MEASURE, THEN THE BODY IS LOCKED, so
//     nothing scrolls underneath a hole that has stopped moving. The lock is
//     `Sheet.jsx`'s one, not a second mechanism. Recomputed on resize only.
//  5. ONE SENTENCE, PLACED WHERE THERE IS ROOM — under the hole when the card
//     fits between it and the bottom of the screen, over it otherwise, and
//     its left edge follows the hole's so it points at what it is talking
//     about. Measured rather than estimated: a card placed by a guessed
//     height is a card off the bottom of a 320px phone.
//  6. ESCAPE, A VISIBLE *SKIP THE TOUR*, AND IT NEVER RETURNS ON ITS OWN.
//     Re-runnable from the gear. role="dialog", focus on the card, and the
//     sentence is an aria-live region so a screen reader hears each step.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

// target · sentence · the tab it has to be on, when it is not the one you
// are already looking at.
//
// THE ORDER IS THE ORDER THE WORK HAPPENS, and the LAST STEP IS THE LINK
// (§13b) — because that is the one thing they have to go and use, and ending
// on it leaves them on the screen it lives on.
// "day", not "today": the tab buttons each carry data-tour with their OWN
// key, so a masthead named "today" and the Today rail button would be two
// elements answering one selector, and querySelector would pick whichever
// came first in the document. Every name in this list is unique across the
// whole app, which is what makes rule 2 safe.
// ROADMAP 2.24 — ONE TOUR BECAME SIX, and the step lists are
// `docs/tour-steps-2.24.md` rather than a decision made here. The owner:
// *"it did it for the home page, and then it stopped there… every time you
// click on a new tab for the first time, there should be a full guide for
// every single thing inside of that, that's not, like, obviously
// explainable."*
//
// **THE SHELL TOUR GOT SHORTER, NOT DELETED.** Its job is now *here are the
// places, and here is the link*; everything it half-explained moved into the
// tab it belongs to. Without that a detailer meets the same sentence twice,
// which is his complaint arriving from the other side.
//
// **AND CALENDAR HAS NO TOUR AT ALL.** Every candidate step was a control
// reading its own label back — "Month / History", arrows either side of a
// month name — and the one fact that is not obvious (a day opens BESIDE the
// month rather than replacing it) is a thing you learn by pressing a day.
// A tab whose honest guide is one step does not get one, and padding this
// list to make a fifth tour is exactly the weirdness he complained about.
// ROADMAP 2.24, SECOND PASS — THE GUIDES WERE TOO SHORT TO BE GUIDES.
// His note, 2026-09-10: *"the guides were very short and didn't touch at all
// on... if you click on a date, what you get when you click on a date... they
// need to be in-depth. Like, like, six probably, you know, things showing per
// tab... analyze each tab, see what wouldn't be needing guidance, and just
// kinda have something for each thing on each tab. And make sure the wording
// is very straightforward."*
//
// **SO EVERY TAB IS FIVE TO SEVEN STEPS NOW, and the test for including one is
// unchanged: does the sentence carry a fact the control does not already say?**
// A row that reads its own label back is still left out — Business has twelve
// settings rows and stops at five of them.
//
// **AND A STEP CAN OPEN SOMETHING.** A fourth element means *press this target
// before moving on*, which is the only way a guide can explain a panel that
// does not exist until somebody presses something. It is the answer to the
// date half of his note: the calendar guide opens a day and then points inside
// it. Nothing else in the product needs it, and a step that opens something
// carries the steps after it through the plan's own presence check — see the
// filter below.
export const TOURS = {
  shell: [
    // THE FIRST STEP NAMES ITS TAB, and that is not decoration: the tour is
    // re-runnable from the gear, and the gear TAKES THE MAIN AREA — so a tour
    // started from there had no Today on the page and silently skipped its own
    // first step. Observed, not reasoned about.
    ["day", "Every morning starts here.", "today"],
    ["new", "A job booked over the phone goes in here."],
    ["business", "Everything a customer sees is set here."],
    ["link", "Send this link to a customer.", "business"],
  ],
  // THE ORDER IS THE ORDER THINGS SIT ON THE SCREEN, top to bottom, and then
  // the second column. A guide that jumps around the page is a guide somebody
  // has to keep re-finding their place in.
  today: [
    ["day", "Today's date. Everything on this screen is about this one day."],
    ["requests", "Somebody asked for a time. Nothing is booked until you answer."],
    ["figures", "How many jobs you have today, and what they should bring in."],
    // "Open", not "Tap": at 1180 and above this is a mouse, and a sentence
    // that names the GESTURE is wrong on half the widths the product
    // supports.
    ["job", "Open a job to see the car, the price and the notes — and to take payment."],
    ["wrapup", "A job you have finished. This is where the money gets written down."],
    ["ahead", "How much of the next seven days is still free."],
    ["lapsed", "People who have not been back in three months. One press writes to all of them."],
  ],
  calendar: [
    // **THE STEP THAT NEEDS DATA GOES FIRST, ON PURPOSE.** The plan waits for
    // the FIRST step's target before deciding anything, so leading with the
    // one that needs a booking makes that wait cover it.
    // **AND IT IS THE ONE STEP IN THE PRODUCT THAT PRESSES SOMETHING.** His
    // note is that the guide never said what a date DOES; the three steps
    // after this one are inside the day it opens.
    ["mode", "Two ways to look at the same bookings: a month, or a list you can search."],
    ["month", "Move through the months. Next month and last month are both here."],
    ["calgrid", "Each dot is a job. A day with a line through it is blocked off."],
    ["cell", "A day with work on it. Open one and the day appears beside the month.", null, true],
    ["dayjobs", "Everything booked that day, in order — and a button to add another."],
    ["daystate", "Block the whole day off here, or change your hours for that one day."],
  ],
  money: [
    ["period", "Week, month, year — every figure on this screen follows this."],
    // THE ONE STEP ON THIS SCREEN THAT EARNS ITS PLACE. "Net" is the single
    // word here a detailer can misread in their own favour, and the
    // consequence of misreading it is thinking they earned more than they did.
    ["net", "What is left after expenses, not what came in."],
    ["breakdown", "The same period broken down — what you collected, what you spent, your average job."],
    ["export", "One file for your accountant, covering whatever period you are looking at."],
    ["unpaid", "Work you have finished and not been paid for. Mark one paid here."],
    ["expenses", "Everything you spend. Write it down here and it comes off your net."],
  ],
  clients: [
    ["csearch", "Everybody who has ever booked you. Search by name or phone."],
    ["sort", "Sort by who comes most, who spends most, or who has not been back."],
    // THE FILTER IS PRESSED, for the same reason the calendar's day is: the
    // button the next step is about does not exist until a list has been
    // narrowed, so a guide that only TALKED about it was pointing at nothing
    // and the step was dropped every time.
    ["lapsedchip", "Show only the people who have not been in for three months.", null, true],
    ["compose", "Write to everybody on the list you are looking at, in one go."],
    ["client", "Open somebody to see every job they have booked and what they spent."],
  ],
  business: [
    // IN THE ORDER THE ROWS SIT ON THE SCREEN — "Your page", then "What you
    // sell", then "When you can be booked". Written in any other order the
    // guide walks up and down the page, which is what it did when it was
    // first built and what the screenshots caught.
    ["setup", "What is left to finish. Everything already done is live on your booking page."],
    ["domain", "The web address customers use. It works before you own a domain of your own."],
    ["catalog", "What you charge for. Nothing can be booked until there is something in here."],
    ["payments", "Cash, card, Venmo — how you want customers to pay you."],
    ["hours", "The days and times you work, and the days you are off."],
    ["link", "Send this link to a customer and they book themselves in."],
  ],
};

// A GUIDE OF ONE STEP IS NOT A GUIDE (decision 6). On a brand-new dashboard
// three of Today's four targets do not exist and two of Clients' three do
// not, so those two tabs stay quiet until there is something to point at —
// which is right: there is nothing there to explain.
export const MIN_STEPS = 2;

const PAD = 16;    // the card's clearance from the edge of the screen
const GAP = 12;    // between the hole and the card
const HALO = 8;    // how far the hole is drawn outside the element itself
// HOW LONG "not there yet" IS ALLOWED TO LAST. A step that changes tab lands
// on a screen that fetches before it draws, and every screen in this product
// paints a spinner while it does — so a fixed frame count read a LOADING
// screen as a MISSING target and skipped a step that was about to exist.
// 12 frames is plenty once the page is quiet; the cap is what covers a
// screen that is still working.
const SETTLED_FRAMES = 12;
const GIVE_UP_MS = 1500;
// THE PLAN IS ALLOWED LONGER THAN A STEP IS, and the two are different
// questions. A step asks *is this one thing here* and 1.5s is generous. The
// plan asks *what is on this whole screen*, and a screen is three or four
// separate reads — Today's open slots for the next seven days is its own
// round trip and lands well after the day itself. Measured at 1.5s: the step
// about it was dropped from a screen that was ABOUT to have it, which is the
// defect this whole pass is fixing, arriving a second time from the other
// side. Nothing is shown while this runs but the dim, so it is a ceiling and
// not a wait: a quiet screen settles in about 200ms.
const PLAN_GIVE_UP_MS = 4000;

// `tour` names which of the six lists to run. It defaults to the shell so
// the gear's *Show me around* keeps meaning what it meant.
export default function Walkthrough({ tour = "shell", onGo, onClose, onEmpty }) {
  useAppLocale();
  const STEPS = TOURS[tour] ?? TOURS.shell;
  const [i, setI] = useState(0);
  const [box, setBox] = useState(null);
  const [leaving, setLeaving] = useState(false);
  // WHICH OF THE SEVEN THIS DASHBOARD ACTUALLY HAS, worked out once before
  // the first step is drawn. Rule 3 skips a step whose target is not there,
  // and that alone is enough to run the tour correctly — but not to COUNT it.
  // Measured on a staff login: the tour ran four steps while the card said
  // "of 7" the whole way, because Money, Business and the booking link are
  // all absent for that role and each was only discovered as it was reached.
  // A count that promises seven and delivers four is worse than no count, and
  // the owner's own constraint is that this feel like MORE short steps rather
  // than fewer long ones — which is the thing the count exists to say.
  const [plan, setPlan] = useState(null);
  const [place, setPlace] = useState(null);   // {top,left} for the card
  // WHICH STEP IS ON SCREEN, readable from the mount-only planning loop above
  // — which is allowed to lengthen the plan, but only ahead of this.
  const iRef = useRef(0);
  iRef.current = i;
  const card = useRef(null);

  const close = useCallback(() => {
    // ENTRANCE AND EXIT IN THE SAME CHANGE (CLAUDE.md). The dim fades out
    // faster than it came in — law 4 — and the component stays mounted for
    // exactly that long.
    setLeaving(true);
    setTimeout(() => onClose?.(), 180);   // --t-exit
  }, [onClose]);

  // **THE TOUR PRESSES IT, AND THAT IS NOT A HOLE IN RULE 1.** Rule 1 says the
  // LIT element is not clickable — a detailer must not be able to open New
  // booking from underneath the dim, because there is no good answer for what
  // the tour does next. Here the tour knows exactly what happens next: the
  // step after this one is about the thing that just opened. It presses on the
  // way OUT of the step rather than on the way in, so the hole is measured
  // before the panel changes the layout under it.
  //
  // **AND IT PRESSES OUTSIDE THE STATE UPDATER.** It was inside `setI` first,
  // which React runs DURING RENDER — so pressing the day called Calendar's own
  // setState from inside Walkthrough's render and the console said so:
  // *"Cannot update a component (Calendar) while rendering a different
  // component (Walkthrough)"*. It worked, which is the dangerous part.
  const next = useCallback(() => {
    const steps = plan ?? STEPS;
    if (steps[i]?.[3]) document.querySelector(`[data-tour="${steps[i][0]}"]`)?.click();
    if (i + 1 >= steps.length) { close(); return; }
    setI(i + 1);
  }, [close, plan, STEPS, i]);

  // The body is frozen for the whole tour, and this is Sheet.jsx's lock
  // rather than a second one. `overflow: hidden` stops a FINGER; it does not
  // stop scrollIntoView, which is why the two can coexist.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // THE PLAN. Go to the first step's screen, wait for it, then keep the steps
  // whose target this dashboard actually has: a step that names a TAB is
  // available when that tab's own button exists (which is what makes an
  // unticked membership's missing Money and Business fall out for free — the
  // rail is filtered by PERMISSION in App.jsx since roadmap 2.13, and these
  // steps point at the very buttons it removes),
  // and a step that names nothing is available when its own target is on the
  // screen we just arrived at. That second half is the empty dashboard's
  // missing job, which is the case §1c wrote this rule for.
  useEffect(() => {
    // ONLY THE SHELL TOUR MOVES TABS. A tab guide is already on the screen
    // it is about — it was started BY arriving there — and calling `onGo`
    // with an undefined tab would send the shell somewhere it did not ask
    // to go.
    if (STEPS[0][2]) live.current.onGo?.(STEPS[0][2]);
    let on = true;
    let tries = 0;
    let steady = 0;
    let seen = -1;
    let shown = null;
    const t0 = performance.now();
    const tick = () => {
      if (!on) return;
      const there = (name) => !!document.querySelector(`[data-tour="${name}"]`);
      // Nothing can be decided until the screen the tour starts on is drawn.
      if (!there(STEPS[0][0]) && ++tries <= 90) { requestAnimationFrame(tick); return; }
      // A STEP THAT OPENS SOMETHING CARRIES THE ONES AFTER IT. The calendar's
      // day panel does not exist until a date is pressed, so its three steps
      // would be dropped here for having no target — and with them the whole
      // point of the guide. They are kept when the step that opens them is
      // kept, and dropped with it when the month has no work on it at all.
      let opened = false;
      const kept = STEPS.filter(([k, , t, opens]) => {
        const ok = opened || (t ? there(t) : there(k));
        if (ok && opens) opened = true;
        return ok;
      });
      // DECISION 6 — A GUIDE OF ONE STEP IS NOT A GUIDE. On a dashboard with
      // nothing on it three of Today's targets are absent, and one lonely
      // caption over an empty screen is the weirdness this whole item is
      // about. **It leaves WITHOUT being marked seen**, so the guide arrives
      // the first day there is something to point at — which is the honest
      // reading of "there is nothing there to explain": not never, yet.
      //
      // The shell tour is exempt: it points at the rail and the link, which
      // every dashboard has.
      // **AND THE COUNT IS TAKEN ONCE THE SCREEN HAS STOPPED ARRIVING.** This
      // decided the whole plan on the first frame the FIRST target existed —
      // and every screen in this product paints its figures, its lists and its
      // settings rows a beat after that, from three separate reads. So a guide
      // was planned against a half-drawn screen, most of its steps were ruled
      // out for targets that appeared 200ms later, and a tab whose survivors
      // fell below the floor showed NOTHING AT ALL. That is his report —
      // *"when I went to money, clients, and business, nothing popped up"* —
      // and it got worse the more steps a guide had, which is the direction
      // this change moves in. Same two instruments the step measurer uses: a
      // count that has stopped growing, and no spinner on the page.
      const waiting = !!document.querySelector(".spinner");
      if (waiting || kept.length !== seen) { seen = kept.length; steady = 0; }
      else steady += 1;
      const settled = steady >= SETTLED_FRAMES;
      const out_of_time = performance.now() - t0 > PLAN_GIVE_UP_MS;

      // **AND THE PLAN KEEPS GROWING AFTER IT IS SHOWN.** A settle is a QUIET
      // GAP, and a quiet gap is not the same thing as a finished screen:
      // measured on Today, the day and its jobs go quiet for a fifth of a
      // second while the count of free slots in the next seven days is still
      // in flight, so the step about it was ruled out by a screen that was
      // about to have it. Waiting long enough to be sure would put a second
      // of blank dim in front of every guide, which is a worse thing to fix it
      // with. So the first settle SHOWS the guide and the loop keeps looking
      // until the cap: a step that turns up late is spliced in, and the count
      // on the card goes up by one.
      // **ONLY EVER AHEAD OF WHERE THEY ARE STANDING.** A plan is replaced
      // only when every step up to and including the one on screen is the same
      // step it already was — otherwise a late arrival could renumber the
      // sentence somebody is reading.
      if (settled || out_of_time) {
        if (!shown) {
          // The floor is judged at the CAP, never at the first quiet gap: a
          // guide dropped for having one step is not coming back, and that is
          // too final a decision to make off a fifth of a second.
          if (kept.length >= MIN_STEPS || tour === "shell") { shown = kept; setPlan(kept); }
          else if (out_of_time) { live.current.onEmpty?.(); return; }
        } else if (kept.length > shown.length
          && kept.slice(0, iRef.current + 1).every((st, n) => st === shown[n])) {
          shown = kept;
          setPlan(kept);
        }
      }
      if (!out_of_time) { requestAnimationFrame(tick); return; }
      return;
    };
    tick();
    return () => { on = false; };
  }, []);

  // THE CALLBACKS GO IN A REF, AND THAT IS NOT TIDINESS — it is the fix for
  // two separate defects, both observed rather than reasoned about.
  // `onGo` and `onClose` are inline arrows in App.jsx, so they are a new
  // identity on EVERY render. In a dependency array that makes an effect
  // re-run on every render, and both effects below break when it does: the
  // measuring one re-scrolls and re-measures forever, and the focus one runs
  // its cleanup — which restores focus to wherever it was when that render
  // started — so focus was being yanked back out of the card, and the trap
  // silently did nothing. Both effects are therefore mount-only and read the
  // current callbacks through here.
  const live = useRef({ next, onGo, close, onEmpty });
  live.current = { next, onGo, close, onEmpty };

  // ESCAPE OUT, AND TAB STAYS IN. The second half is not decoration: this
  // element says `aria-modal="true"`, which tells a screen reader the rest of
  // the page is inert, and rule 1 says the lit element is not clickable. A
  // backdrop stops a POINTER and stops nothing else — without this, Tab walks
  // straight into the dashboard behind the dim and Enter presses the very
  // control the caption is pointing at, which is the outcome rule 1 exists to
  // prevent. Sheet.jsx hit exactly this on 2026-09-01 and this is its fix,
  // not a second one: watch where focus LANDS and refuse to let it settle
  // outside, which is blind to the whole class of "is this really focusable"
  // question (a closed <details> being the one that caught it there).
  useEffect(() => {
    const returnTo = document.activeElement;
    const back = { current: false };
    const onKey = (e) => {
      if (e.key === "Escape") live.current.close();
      if (e.key === "Tab") back.current = e.shiftKey;
    };
    const onFocusIn = (e) => {
      const p = card.current;
      if (!p || p.contains(e.target)) return;
      const list = [...p.querySelectorAll("button:not([disabled])")];
      (list.length ? (back.current ? list[list.length - 1] : list[0]) : p).focus();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      // Back where you were — the gear row that asked for the tour.
      if (returnTo instanceof HTMLElement && document.contains(returnTo)) returnTo.focus();
    };
  }, []);

  const [key, sentence, tab] = (plan ?? STEPS)[i] ?? STEPS[0];

  // FIND, SCROLL, MEASURE — and give up rather than hang. A step that has to
  // change tab first has a target that does not exist for a frame or two, and
  // a step whose target does not exist at all (no job yet; staff, who have no
  // Money tab) has to be skipped rather than waited on. Twelve frames is the
  // whole of that distinction: about 200ms, self-limiting, no timer.
  useEffect(() => {
    if (tab) live.current.onGo?.(tab);
    let on = true;
    let tries = 0;
    const t0 = performance.now();
    const tick = () => {
      if (!on) return;
      const el = document.querySelector(`[data-tour="${key}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "auto" });
        // One more frame so the rect is read AFTER the scroll has landed.
        requestAnimationFrame(() => {
          if (!on) return;
          const r = el.getBoundingClientRect();
          setBox({
            top: r.top - HALO, left: r.left - HALO,
            width: r.width + HALO * 2, height: r.height + HALO * 2,
          });
        });
        return;
      }
      // Two ways to give up, and they answer different questions. No spinner
      // and twelve quiet frames means the screen has finished and the target
      // genuinely is not on it — the empty dashboard's missing job, or a tab
      // staff do not have. The millisecond cap is the backstop for a screen
      // that never settles at all.
      const waiting = !!document.querySelector(".spinner");
      if ((!waiting && ++tries > SETTLED_FRAMES) || performance.now() - t0 > GIVE_UP_MS) {
        // The safety net, not the mechanism: `plan` above has already ruled
        // out everything this dashboard does not have. Reaching here means a
        // target that WAS there when the plan was made is not there now.
        live.current.next();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
    return () => { on = false; };
  }, [key, tab]);

  // Recompute on resize only (§1c rule 4) — nothing else moves while the body
  // is frozen.
  useEffect(() => {
    const onResize = () => {
      const el = document.querySelector(`[data-tour="${key}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setBox({ top: r.top - HALO, left: r.left - HALO, width: r.width + HALO * 2, height: r.height + HALO * 2 });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [key]);

  // FOCUS FOLLOWS THE CARD, and it waits for the card to be PLACED — it
  // cannot be done in the measuring pass above, because that pass needs the
  // card in the DOM to read its height.
  //
  // THE CARD IS HIDDEN WITH `opacity: 0` RATHER THAN `visibility: hidden`,
  // AND THAT IS THE WHOLE OF WHETHER THIS WORKS. A `visibility: hidden`
  // element cannot take focus, so this call ran and did nothing and left
  // focus on <body> for the entire tour. It was written that way first, and
  // it LOOKED fixed: in the normal path the style is off the element by the
  // time this fires. In `?lite=1` it is not, and the sweep caught it there —
  // 200ms after the tour opened the card still computed `hidden` while
  // already carrying its top and left. An opacity-0 element is focusable and
  // measurable, so there is no ordering left to get wrong.
  const focusedFor = useRef(null);
  useEffect(() => {
    if (!place || focusedFor.current === i) return;
    focusedFor.current = i;
    card.current?.focus();
  }, [place, i]);

  // The card is measured, not estimated. Under the hole when it fits between
  // the hole and the bottom of the screen; over it otherwise, clamped into
  // the viewport for the one case where neither has room — a hole taller than
  // the screen, where there is nowhere else for it to go.
  useLayoutEffect(() => {
    const el = card.current;
    if (!el || !box) return;
    const h = el.offsetHeight;
    const w = el.offsetWidth;
    const under = box.top + box.height + GAP;
    const over = box.top - GAP - h;
    // Under the hole, over the hole, or — when the hole is most of the
    // screen and neither fits — the bottom edge. §1c wrote two branches and
    // said "no third case"; MEASURED, there is one, and it is the day rail:
    // a 665px hole on an 844px phone leaves 98px above and 80px below, and
    // the card is 130px. Pinning it to the TOP there covers the first job,
    // which is the thing the sentence is about. The bottom is the half of a
    // tall list nobody reads first.
    const top = under + h + PAD <= window.innerHeight ? under
      : over >= PAD ? over
        : window.innerHeight - h - PAD;
    const left = Math.min(Math.max(PAD, box.left), Math.max(PAD, window.innerWidth - w - PAD));
    setPlace({ top, left });
  }, [box]);

  // Nothing is drawn until the plan is known — a dim with no hole in it, for
  // the frame or two it takes, is the tour looking broken on the way in.
  if (!plan) return null;

  return (
    <div className={`tourblock${leaving ? " leaving" : ""}`}
      role="dialog" aria-modal="true" aria-label={t("Guided tour")}>
      {box && (
        <div className="spotlight" style={{
          top: box.top, left: box.left, width: box.width, height: box.height,
        }} />
      )}
      <div ref={card} className="tourcard" tabIndex={-1}
        style={place ? { top: place.top, left: place.left } : { opacity: 0 }}>
        {/* The count is the "more steps rather than fewer" constraint made
            visible — it is what tells someone the tour is seven short things
            rather than an unknown number of long ones. */}
        <span className="label">{t("{n} of {total}", { n: i + 1, total: (plan ?? STEPS).length })}</span>
        {/* THE LIVE REGION IS THE WRAPPER, NOT THE SENTENCE, and the two are
            not interchangeable: a screen reader announces content INSERTED
            into a region it is already watching, and `key` below replaces the
            <p> on every step. With aria-live on the <p> itself the region
            being watched is destroyed and rebuilt each time, which announces
            nothing in several readers. The wrapper never moves.
            `key` is what makes the sentence remount and replay its own
            arrival — without it React swaps the text node and the step lands
            with no motion at all, which on an overlay that is otherwise
            perfectly still reads as a glitch rather than as a change. */}
        <div aria-live="polite"><p className="body tourline" key={i}>{t(sentence)}</p></div>
        <div className="btnrow">
          <button className="btn sm inline ghost" onClick={close}>{t("Skip the tour")}</button>
          <button className="btn sm inline primary" onClick={next}>
            {/* THE PLAN'S LENGTH, NOT THE LIST'S. A step whose target is
                absent is dropped from the plan, so on a dashboard missing
                one this said "Next" on the last step and then closed —
                which reads as the tour breaking. Harmless while every
                dashboard had all seven; per-tab guides make a short plan
                the ordinary case. */}
            {i + 1 === (plan ?? STEPS).length ? t("Done") : t("Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
