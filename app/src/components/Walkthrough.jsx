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
const STEPS = [
  // THE FIRST STEP NAMES ITS TAB, and that is not decoration: the tour is
  // re-runnable from the gear, and the gear TAKES THE MAIN AREA — so a tour
  // started from there had no Today on the page and silently skipped its own
  // first step. Observed, not reasoned about. Saying which screen it starts
  // on makes it deterministic from wherever it was asked for.
  ["day", "Every morning starts here.", "today"],
  ["new", "A job booked over the phone goes in here."],
  // "Open", not "Tap": at 1180 and above this is a mouse, and a sentence that
  // names the GESTURE is wrong on half the widths the product supports for
  // the same reason phone pass §15 says a step must not name a position.
  ["job", "Open a job to see everything about it."],
  ["calendar", "Your whole month lives here."],
  ["money", "What you have made, month by month."],
  ["business", "Everything a customer sees is set here."],
  ["link", "Send this link to a customer.", "business"],
];

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

export default function Walkthrough({ onGo, onClose }) {
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
  const card = useRef(null);

  const close = useCallback(() => {
    // ENTRANCE AND EXIT IN THE SAME CHANGE (CLAUDE.md). The dim fades out
    // faster than it came in — law 4 — and the component stays mounted for
    // exactly that long.
    setLeaving(true);
    setTimeout(() => onClose?.(), 180);   // --t-exit
  }, [onClose]);

  const next = useCallback(() => {
    setI((n) => {
      if (n + 1 >= (plan?.length ?? STEPS.length)) { close(); return n; }
      return n + 1;
    });
  }, [close, plan]);

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
  // available when that tab's own button exists (which is what makes staff's
  // missing Money and Business fall out for free — the rail is filtered by
  // role in App.jsx and these steps point at the very buttons it removes),
  // and a step that names nothing is available when its own target is on the
  // screen we just arrived at. That second half is the empty dashboard's
  // missing job, which is the case §1c wrote this rule for.
  useEffect(() => {
    live.current.onGo?.(STEPS[0][2]);
    let on = true;
    let tries = 0;
    const tick = () => {
      if (!on) return;
      const there = (name) => !!document.querySelector(`[data-tour="${name}"]`);
      // Nothing can be decided until the screen the tour starts on is drawn.
      if (!there(STEPS[0][0]) && ++tries <= 90) { requestAnimationFrame(tick); return; }
      setPlan(STEPS.filter(([k, , t]) => (t ? there(t) : there(k))));
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
  const live = useRef({ next, onGo, close });
  live.current = { next, onGo, close };

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
      role="dialog" aria-modal="true" aria-label="Guided tour">
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
        <span className="label">{i + 1} of {(plan ?? STEPS).length}</span>
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
        <div aria-live="polite"><p className="body tourline" key={i}>{sentence}</p></div>
        <div className="btnrow">
          <button className="btn sm inline ghost" onClick={close}>Skip the tour</button>
          <button className="btn sm inline primary" onClick={next}>
            {i + 1 === STEPS.length ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
