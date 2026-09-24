// HOW MUCH OF A CONTROL CAN ACTUALLY BE PRESSED, WHERE THE BROWSER PUT IT.
//
// Extracted 2026-09-23 from `scroller-clearance.mjs` when `bk-bar-clearance.mjs`
// needed the same measurement on a different surface. **Two checks about the
// 44px absolute with two copies of this walk is how two checks start
// disagreeing about what a control is** — the argument `bookingWalk.mjs` makes
// about the quote and the charge, one level out.
//
// Nothing here asserts anything. It reports what is on the screen; the checks
// that import it decide what is true.
//
// ---------------------------------------------------------------------------
// THE MEASUREMENT IS THE HIT AREA, NEVER THE BOUNDING RECT
// ---------------------------------------------------------------------------
// CLAUDE.md's rule is 44px of REAL hit area, and a deliberately small mark
// keeps its size and grows its target with an absolutely positioned `::after`
// at a negative inset. `.choice` is a **38px** box that presses as **45**.
//
// **A PROBE THAT WALKS THE RECT UNDER-MEASURES EVERY SUCH CONTROL BY ITS
// OVERHANG AND CALLS IT BROKEN.** ROADMAP 2.32's first probe did exactly that
// and reported 41 of 41 legal chips failing on a screen where nothing was
// wrong. So the scan runs `rect.top - overhang` to `rect.bottom + overhang`
// and **the overhang is READ off the element's own `::after`** rather than
// hard-coded: the next control to meet this will use a different inset, and a
// literal would silently stop covering it. Controls that do not use the
// pattern read an overhang of 0 and are measured on their box, which is
// correct for them.
//
// `useRect` is that bug on purpose, for the checks' `--break=rect` sabotage.

export const ABSOLUTE = 44;

/**
 * Runs INSIDE the page — pass it to `page.evaluate`.
 *
 * It must stay self-contained: no imports, no closure over anything in this
 * module, because Playwright ships its source across and nothing else comes
 * with it.
 *
 * Returns, for every visible control matching `sel`:
 *   legal      its hit area with nothing over it, taken in the middle of the
 *              screen where no fixed furniture can reach it
 *   reachable  how many of those rows survive where the browser parks it when
 *              it TAKES FOCUS — which is the case `scroll-padding-bottom`
 *              governs, and which `scrollIntoView` alone does not trigger for
 *              an element already inside the viewport
 *   lost       when rows do not survive, `elementFromPoint` names what was
 *              there instead, so "the bar did it" is read off the page rather
 *              than assumed. **An ANCESTOR in this map means a CLIP, not an
 *              occluder** — `docs/gotchas.md` #77.
 *
 * …and every scrolling ancestor on the screen, found BY BEHAVIOUR rather than
 * by class name, with what each reserves at its bottom edge.
 */
export const MEASURE = ({ sel, useRect }) => {
  const px = (v) => (v && v.endsWith("px") ? parseFloat(v) : 0);
  const overhang = px(getComputedStyle(document.documentElement)
    .getPropertyValue("--hit-overhang").trim()) || 0;

  const overhangOf = (el) => {
    if (useRect) return { top: 0, bottom: 0 };
    const a = getComputedStyle(el, "::after");
    if (!a || a.content === "none" || a.position !== "absolute") return { top: 0, bottom: 0 };
    return { top: Math.max(0, -px(a.top)), bottom: Math.max(0, -px(a.bottom)) };
  };

  const name = (el) => (el.closest(".tabbar") ? "nav.tabbar"
    : el.closest(".tabscrim") ? ".tabscrim"
      : el.closest(".bk-bar") ? "bk-bar"
        : (String(el.className || "").split(" ")[0] || el.tagName));

  const rows = (el, top, bottom, x) => {
    let n = 0;
    const lost = {};
    for (let y = Math.ceil(top); y <= Math.floor(bottom); y++) {
      if (y < 0 || y >= innerHeight) { lost.offscreen = (lost.offscreen || 0) + 1; continue; }
      const hit = document.elementFromPoint(x, y);
      if (hit && (hit === el || el.contains(hit))) { n++; continue; }
      const who = hit ? name(hit) : "nothing";
      lost[who] = (lost[who] || 0) + 1;
    }
    return { n, lost };
  };

  const scrollers = [];
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (!/(auto|scroll)/.test(cs.overflowY)) continue;
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    if (el === document.scrollingElement) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 40) continue;
    scrollers.push({
      cls: String(el.className || el.tagName).slice(0, 40),
      reserved: px(cs.scrollPaddingBottom),          // `auto` parses to 0, which is the truth
      raw: cs.scrollPaddingBottom,
      bottom: Math.round(r.bottom), clientH: el.clientHeight, scrollH: el.scrollHeight,
    });
  }

  const out = [];
  let hidden = 0;
  // **THE TALLY HAS TO RECONCILE, AND IT DID NOT — 2026-09-23.** This walk was
  // extracted from `scroller-clearance.mjs` and the fold count moved 29 -> 27
  // on an unchanged page. Nothing graded moved with it, which is exactly why it
  // was nearly waved through. `matched` is the raw selector count and `dropped`
  // is what neither list claims: matched = visible + hidden + dropped, by
  // reason, every run. A control that leaves the population silently is the
  // same fault as a skip that reads like a pass.
  //
  // **WHAT IS KNOWN AND WHAT IS NOT, said separately on purpose.** KNOWN: the
  // total is invariant at 41 on Booking rules, the VISIBLE count is invariant
  // at 12, and the two that moved went from `hidden` to `tiny` — both of which
  // mean "not measured", so nothing graded moved and no control was lost. NOT
  // KNOWN: why the order of the walk decides which bucket they land in. The
  // obvious theory — that the whole-document `getComputedStyle` above forces a
  // style flush that collapses a stale rect — **was tested and is wrong**:
  // running that walk by hand against the same page changes neither count.
  // Left recorded rather than explained, because a guessed mechanism written
  // down as fact is worse than an open question.
  const matched = document.querySelectorAll(sel).length;
  const dropped = { tiny: 0, inBar: 0 };
  for (const el of document.querySelectorAll(sel)) {
    const r0 = el.getBoundingClientRect();
    if (r0.width < 8 || r0.height < 8) { dropped.tiny++; continue; }
    if (el.closest(".tabbar") || el.closest(".bk-bar")) { dropped.inBar++; continue; }   // the bars' own buttons
    // A control inside a closed fold keeps a bounding rect while nothing of it
    // is on the screen — `docs/gotchas.md`'s oldest entry. Counted, never
    // silently dropped.
    if (typeof el.checkVisibility === "function"
      && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) { hidden++; continue; }

    const o = overhangOf(el);

    el.scrollIntoView({ block: "center", inline: "nearest" });
    const rc = el.getBoundingClientRect();
    const legal = rows(el, rc.top - o.top, rc.bottom + o.bottom,
      Math.round(rc.left + rc.width / 2)).n;

    // FOCUS, NOT scrollIntoView ALONE. An element already inside the viewport
    // is "visible" to that call even with something painted over it, so it
    // scrolls nothing and a canary cannot bite. Focus is the trigger
    // `scroll-padding-bottom` governs and what a keyboard user does.
    el.scrollIntoView({ block: "end", inline: "nearest" });
    if (typeof el.focus === "function") el.focus({ preventScroll: false });
    const rn = el.getBoundingClientRect();
    const got = rows(el, rn.top - o.top, rn.bottom + o.bottom,
      Math.round(rn.left + rn.width / 2));

    out.push({
      text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 16).replace(/\s+/g, " "),
      rectH: Math.round(rc.height), overhang: o.top + o.bottom,
      legal, reachable: got.n, lost: got.lost,
      top: Math.round(rn.top), bottom: Math.round(rn.bottom),
    });
  }

  const bar = document.querySelector(".bk-bar, .tabbar");
  return {
    controls: out, hidden, overhang, scrollers, matched, dropped,
    bar: bar
      ? {
        cls: String(bar.className || "").split(" ")[0],
        position: getComputedStyle(bar).position,
        height: Math.round(bar.getBoundingClientRect().height),
        top: Math.round(bar.getBoundingClientRect().top),
      }
      : null,
  };
};
