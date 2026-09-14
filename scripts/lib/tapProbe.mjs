// CAN A THUMB ACTUALLY HIT IT — the 44px floor, measured rather than argued.
// Written 2026-09-13, lane C, because nothing in the 58-suite battery checked
// it and a 38px close button shipped with every check green. Every weekend
// since Friday had been spent measuring these by hand, screen by screen.
//
// ── WHY A RECTANGLE IS THE WRONG INSTRUMENT ────────────────────────────────
// `getBoundingClientRect` reports the PAINT. A pseudo-element at a negative
// inset, or padding on a wrapping `<label>`, extends what a POINTER can reach
// and changes the rect not at all. This repo has already paid for that five
// times — `docs/VERIFIED.md` § 2 lists every one, and every one was a
// measurement of the ink arguing with a hit area that was fine:
//
//   .btn.sm          reads 38 by rect, answers at 44.4 — `::after{inset:-4px 0}`
//   .btn.sm.icon     reads 38x44 — PRODUCT.md's own recorded exception
//   .cal-cell        a <div>, not a button — role=button, measures 46.5
//   booking checkbox a 22px MARK inside a 44px target with a 67px label
//   Cerrar           reads 36, answers at 46
//
// So the instrument is `document.elementFromPoint`, and the question it asks
// is not "how big is this box" but "how far out from the middle of this
// control does a press still land on it".
//
// ── HOW THE REACH IS MEASURED ──────────────────────────────────────────────
// From the control's own centre, walk one pixel at a time left, right, up and
// down, asking `elementFromPoint` each step, and stop at the first pixel that
// answers something else. `reachW` is the two horizontal walks plus the centre
// pixel; `reachH` the two vertical.
//
// **THIS SUBSUMES THE PITCH PROBLEM RATHER THAN NEEDING A SECOND CHECK.** Two
// 44px targets 18px apart do not both exist — they overlap and steal each
// other's presses. A walk cannot measure through a thief: the moment a pixel
// answers the neighbour, the walk stops there. So a control this file reports
// as reaching 44 has 44 pixels nobody else is taking, which is the only form
// of the statement worth making.
//
// **AND THE CENTRE PIXEL IS ITS OWN FINDING.** If the very middle of a control
// answers something else, the control is covered and its reach is zero — that
// is reported as `covered`, not as `narrow`, because the fix is different.
//
// ── WHAT COUNTS AS A HIT ───────────────────────────────────────────────────
// The control itself, anything inside it (its own icon or span), or the
// `<label>` that presses it — `label[for=id]` or an ancestor label. A
// checkbox's label IS the control as far as a thumb is concerned, which is
// exactly the 22-inside-44 case above. A containing `<div>` is NOT: pressing
// a wrapper does nothing.
//
// ── VIEWPORT EDGES ─────────────────────────────────────────────────────────
// A walk that runs off the side of the screen is stopped by the screen, not by
// a neighbour, and nothing can steal a press that lands outside the viewport.
// Such a side is counted as satisfying the floor and the subject is counted as
// `clamped`, which is PRINTED every run — a silent allowance is how a class of
// fault disappears.
//
// ── STATED EXCEPTIONS, AND WHY THEY ARE HERE RATHER THAN IN A JUDGEMENT ────
// Two kinds, and both print every run whether or not they fire:
//
//   RECORDED   `.btn.sm.icon` at 38 wide. That is PRODUCT.md's exception and
//              it is Andrew's to reopen. This file honours it and does not
//              argue with it.
//   ARITHMETIC A month grid is seven columns wide. At a 320px screen the grid
//              is about 296px of content, so a date gets about 42px and there
//              is no arrangement of CSS that makes it 44. The floor there is
//              the COLUMN WIDTH, computed at runtime and printed with its
//              arithmetic, and the HEIGHT floor still applies in full. Calling
//              that a pass would be a lie; calling it a failure would be a
//              finding nobody can ever fix.
export const FLOOR = 44;
export const CAP = 30;   // 30 each side plus the centre = 61px, comfortably past 44

// Each entry: what it matches, the floor it takes instead, and who decided.
// PRINTED EVERY RUN by the caller, fired or not.
export const EXCEPTIONS = [
  {
    id: "btn.sm.icon",
    match: ".btn.sm.icon",
    w: 38,
    why: "PRODUCT.md's recorded 38px exception for the small icon button; its ::after extends the HEIGHT only, on purpose",
    who: "Andrew — his to reopen, nobody else's",
  },
  {
    id: "seven-column-grid",
    match: ".cal-cell, .bk-cal .cell",
    grid: 7,
    why: "a month is seven columns wide, so the widest a date can be is the grid's own content width divided by seven; below about 310px of grid that is under 44 and no CSS can change it. The HEIGHT floor still applies in full",
    who: "arithmetic, computed at runtime and printed with the numbers",
  },
];

// Runs IN THE PAGE. Self-contained on purpose — Playwright stringifies it, so
// it may not close over anything in this module.
export const TAP_PROBE = ({ floor, cap, exceptions }) => {
  const VW = document.documentElement.clientWidth;
  const VH = document.documentElement.clientHeight;
  const out = {
    subjects: 0, probes: 0, clamped: 0, exempted: 0,
    skipped: { invisible: 0, noBox: 0, offscreen: 0 },
    findings: [], fired: {},
  };
  const SEL = [
    "button", "a[href]", "input:not([type=hidden])", "select", "textarea", "summary",
    "[role=button]", "[role=tab]", "[role=switch]", "[role=checkbox]", "[role=radio]",
    "[role=menuitem]", "[role=option]", "[role=link]",
  ].join(",");

  const seen = (el) => (el.checkVisibility
    // NO `opacityProperty`. Trap (d): a background tab pauses the arrival
    // keyframe, so every `section.tight` sits at opacity 0 for ever and an
    // opacity-aware check calls the whole screen invisible.
    ? el.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true })
    : true);

  const name = (el) => {
    if (!el) return "(nothing)";
    const cls = (typeof el.className === "string" && el.className)
      ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
    const lbl = (el.getAttribute && el.getAttribute("aria-label")) || "";
    const txt = ((el.textContent || "").trim().replace(/\s+/g, " ") || lbl).slice(0, 40);
    return el.tagName.toLowerCase() + cls + (txt ? ' "' + txt + '"' : "");
  };

  // The <label> that presses it, if there is one. A wrapping <div> is not one.
  const activator = (el) => {
    if (el.id) {
      try {
        const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (l) return l;
      } catch { /* an id CSS.escape cannot express */ }
    }
    return el.closest("label");
  };

  const owns = (el, act, at) => !!at && (at === el || el.contains(at)
    || (act && (at === act || act.contains(at))));

  // Walk out one pixel at a time until a press stops landing on the control.
  // Returns how far it got and whether the SCREEN stopped it rather than a
  // neighbour.
  const walk = (el, act, cx, cy, dx, dy) => {
    for (let d = 1; d <= cap; d++) {
      const x = cx + dx * d, y = cy + dy * d;
      if (x < 0 || y < 0 || x > VW - 1 || y > VH - 1) return { d: d - 1, clamped: true };
      out.probes++;
      if (!owns(el, act, document.elementFromPoint(x, y))) return { d: d - 1, clamped: false };
    }
    return { d: cap, clamped: false };
  };

  // **WHEN SOMETHING IS OPEN OVER THE PAGE, THAT THING IS THE PAGE.** A
  // guided tour is SUPPOSED to take every press: walking the gear's "Show me
  // around" row reported 18 controls whose centre answered `div.tourblock`,
  // and every one of them was the tour working exactly as designed. The same
  // is true of a dialog. `overlap-probe.mjs` made this decision first and for
  // the same reason — a check with a permanent known-failure is a check people
  // learn to scroll past.
  //
  // AND IT MUST NOT SILENTLY MEASURE NOTHING. If an overlay is up, it becomes
  // the root and the subject count is the overlay's own controls, which the
  // `no-subjects` guard below still holds to a floor.
  // `[role=dialog]` WITHOUT `[open]`, because `[open]` is an attribute of the
  // `<dialog>` ELEMENT and this product does not use one. The back office's
  // open-detailer drawer is `<div class="pa-open" role="dialog">` with a
  // `.pa-scrim` over everything behind it, and the first version of this
  // selector missed it: 62 findings on one screen, every one of them the scrim
  // doing its job. The ROLE is the honest handle — it is what a screen reader
  // reads and what the product means.
  const overlay = document.querySelector(".tourblock, [role=dialog], dialog[open], [role=alertdialog]");
  const root = overlay || document;
  out.scopedTo = overlay ? "an open overlay — the page beneath it is not the subject" : null;
  const all = [...root.querySelectorAll(SEL)];
  for (const el of all) {
    if (!seen(el)) { out.skipped.invisible++; continue; }
    el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) { out.skipped.noBox++; continue; }
    const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    if (cx < 0 || cy < 0 || cx > VW - 1 || cy > VH - 1) { out.skipped.offscreen++; continue; }
    out.subjects++;

    const act = activator(el);
    out.probes++;
    const atCentre = document.elementFromPoint(cx, cy);
    if (!owns(el, act, atCentre)) {
      out.findings.push({
        check: "covered", el: name(el),
        detail: "its own centre (" + cx + ", " + cy + ") answers " + name(atCentre)
          + " — the press never reaches it",
      });
      continue;
    }

    const L = walk(el, act, cx, cy, -1, 0), R = walk(el, act, cx, cy, 1, 0);
    const U = walk(el, act, cx, cy, 0, -1), D = walk(el, act, cx, cy, 0, 1);
    if (L.clamped || R.clamped || U.clamped || D.clamped) out.clamped++;
    // A side the SCREEN stopped is a side nothing can steal, so it satisfies.
    const side = (s) => (s.clamped ? cap : s.d);
    const reachW = side(L) + side(R) + 1;
    const reachH = side(U) + side(D) + 1;

    // --- the floors this subject actually takes ---------------------------
    let floorW = floor, floorH = floor, why = null;
    for (const ex of exceptions) {
      if (!el.matches(ex.match)) continue;
      out.fired[ex.id] = (out.fired[ex.id] || 0) + 1;
      if (ex.w) { floorW = ex.w; why = ex.id + ": width floor " + ex.w; }
      if (ex.grid) {
        // THE ARITHMETIC, COMPUTED HERE AND CARRIED INTO THE REPORT.
        const grid = el.parentElement;
        const gw = grid ? grid.getBoundingClientRect().width : r.width * ex.grid;
        const col = gw / ex.grid;
        if (col < floor) {
          floorW = Math.floor(col) - 1;   // a pixel of rounding slack
          why = ex.id + ": the grid is " + Math.round(gw) + "px over " + ex.grid
            + " columns = " + col.toFixed(1) + "px a column, so " + floor
            + " is arithmetically impossible; the floor here is the column";
        }
      }
      if (why) out.exempted++;
    }

    if (reachW < floorW) {
      out.findings.push({
        check: "narrow", el: name(el),
        detail: reachW + "px of reach across (rect " + Math.round(r.width) + "px), floor "
          + floorW + (why ? " [" + why + "]" : ""),
      });
    }
    if (reachH < floorH) {
      out.findings.push({
        check: "short", el: name(el),
        detail: reachH + "px of reach down (rect " + Math.round(r.height) + "px), floor "
          + floorH + (why ? " [" + why + "]" : ""),
      });
    }
  }

  // A SCREEN THAT MEASURED ALMOST NOTHING IS NOT A CLEAN SCREEN. This repo has
  // shipped a sweep that passed 22 screens it never visited; the only defence
  // is to count the subjects and say so out loud when the count collapses.
  // An overlay legitimately holds one or two controls (Next, Skip), so the
  // floor there is 1. On a whole screen it is 3.
  if (out.subjects < (overlay ? 1 : 3)) {
    out.findings.push({
      check: "no-subjects", el: overlay ? "(the open overlay)" : "(the screen)",
      detail: "only " + out.subjects + " pressable controls were found — " + all.length
        + " matched the selector, " + out.skipped.invisible + " invisible, "
        + out.skipped.noBox + " with no box, " + out.skipped.offscreen + " off screen. "
        + "A screen this empty is an instrument that did not arrive, not a screen that passed.",
    });
  }
  return out;
};

// ── THE BASELINE ───────────────────────────────────────────────────────────
// One deliberate fault per check, applied to a REAL control on a REAL screen
// rather than to an injected box. `docs/START-HERE.md` § 4: a green result
// from an instrument nobody has broken is worth less than no result, because
// it stops the search.
//
// Each break returns a sentence naming what it did, so the report can say what
// it expects to see go red — and each is undone by a reload.
export const BREAKS = {
  // SHRINK THE REAL THING. The tab bar's own buttons, to 20px.
  short: () => {
    const s = document.createElement("style");
    s.id = "tap-break";
    s.textContent = ".tabbar button, .rail button { min-height: 20px !important; height: 20px !important; padding-block: 0 !important }"
      + ".tabbar button::after, .rail button::after { content: none !important }";
    document.head.appendChild(s);
    return "the tab buttons squeezed to 20px tall";
  },
  // `flex: 0 0 18px` AND `max-width`, NOT `width`. The first version of this
  // break set `width: 18px` on `.tabbar button` and the check reported BLIND
  // against a check that works: the tab buttons are flex children, so `width`
  // is a BASIS and not a floor and they stayed full size — the break was the
  // fault not happening. `theme.css` § 1522 records that exact trap about
  // `.settings-head > .btn.icon`, which read 41.9px at 320 in Spanish for the
  // same reason. **The instrument's own instrument can be wrong, which is why
  // the baseline prints what it did rather than only whether it saw.**
  narrow: () => {
    const s = document.createElement("style");
    s.id = "tap-break";
    s.textContent = ".tabbar button, .rail button { flex: 0 0 18px !important; min-width: 0 !important; max-width: 18px !important; padding-inline: 0 !important; overflow: hidden !important }"
      + ".tabbar button::after, .rail button::after { content: none !important }";
    document.head.appendChild(s);
    return "the tab buttons squeezed to 18px wide";
  },
  // A LAYER OVER THE WHOLE SHELL. Inside `.app-shell`, which carries
  // `isolation: isolate` — a probe appended to <body> paints above the shell
  // and would prove nothing about a real overlap.
  covered: () => {
    const d = document.createElement("div");
    d.id = "tap-break";
    d.className = "deliberate-cover-probe";
    d.style.cssText = "position:fixed;inset:0;z-index:99";
    (document.querySelector(".app-shell") || document.body).appendChild(d);
    return "a transparent sheet laid over the whole shell";
  },
  // **THE ONE THAT PROVES THE ::after CREDIT IS REAL AND NOT ASSUMED.** It
  // changes nothing about any control's paint — it removes ONLY the
  // pseudo-element — so the rects are identical before and after and a
  // rect-based instrument sees nothing at all. `.segmented button` and `.chip`
  // are painted 36px and reach 45 through `::after { inset: -4px 0 }`
  // (`docs/VERIFIED.md` § 3), so taking the pseudo-element away must drop them
  // to 36 and report them. If it does not, this file is reading rectangles
  // with extra steps and every green run it has ever printed is worthless.
  //
  // Reported under `short`, because that is the check it proves.
  short_after: () => {
    const s = document.createElement("style");
    s.id = "tap-break";
    s.textContent = ".chip::after, .segmented button::after, .choice::after, .btn.sm::after { content: none !important }";
    document.head.appendChild(s);
    return "the ::after hit-area extensions removed from .chip / .segmented button / .choice / .btn.sm — no paint changes, so every rect is identical";
  },
  "no-subjects": () => {
    const s = document.createElement("style");
    s.id = "tap-break";
    s.textContent = "button, a[href], input, select, textarea, summary, [role=button] { display: none !important }";
    document.head.appendChild(s);
    return "every control on the screen hidden";
  },
};
