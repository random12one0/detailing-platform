// DO ANY TWO PIECES OF TEXT SIT ON TOP OF EACH OTHER — 2026-09-13.
//
// **ANDREW FOUND THIS CLASS OF DEFECT BY GLANCING AT A SCREENSHOT**, after two
// of us had loaded the same screen and read it. We both checked that the WORDS
// were right and neither checked that they did not overlap. An email chip sat
// five pixels on top of the sentence above it.
//
// Reading a page tells you what it SAYS. It does not tell you where anything
// IS — and a rendered result can be correct in every word and still be broken
// to look at. This is the cheapest possible instrument for the difference.
//
// ── USAGE ──────────────────────────────────────────────────────────────────
//   import { OVERLAP_PROBE, SWEEP_PROBE } from "./overlap-probe.mjs";
//   await page.evaluate(eval("(" + OVERLAP_PROBE + ")"), "#root");   // one look
//   await page.evaluate(eval("(" + SWEEP_PROBE  + ")"), "#root");   // scrolled
//
// ── THE SIX DECISIONS THAT MAKE IT WORTH ANYTHING ──────────────────────────
// **LEAF ELEMENTS ONLY, AND CONTAINMENT IS SKIPPED.** A parent always contains
// its children, so a naive pairwise pass reports the whole document.
//
// **OWN TEXT ONLY.** An element whose text all comes from a child is reporting
// its child's words, which makes every wrapper overlap its own content.
//
// **SCOPED TO THE APP ROOT.** The first run found the real defect plus one
// false positive from a browser extension's chat widget. A check with a
// permanent known-failure teaches people to ignore it.
//
// **ONE PIXEL OF SLOP.** Sub-pixel layout puts adjacent boxes a fraction into
// each other constantly; a zero threshold is the same as no check at all.
//
// **FLOATING LAYERS ARE EXCLUDED, AND SO IS EVERYTHING UNDER AN OPEN DIALOG.**
// A sticky header travelling over the content it scrolls past is the design.
//
// **A RECT IS NOT WHERE THE INK IS.** Clipping, opacity and reveal transforms
// all put a visible box around invisible text. See the four bugs below.
//
// ── FOUR BUGS IT HAD ON ITS FIRST OUTING, every one a CONFIDENT WRONG ANSWER
// rather than an error ──────────────────────────────────────────────────────
//
// **(1) IT ASKED ONLY THE ELEMENT'S OWN `position`.** A sticky header's own box
// was skipped and the text INSIDE it was not, so the header reported
// overlapping whatever it floated above. Exclusion has to be INHERITED.
//
// **(2) AN OVERLAY IS SUPPOSED TO COVER THE PAGE.** A panel opened over a list
// overlaps every row behind it by design — 22 reported overlaps on a clean
// screen. When a `[role="dialog"]` is open it BECOMES the root.
//
// **(3) THE FIRST FIX FOR (2) RETURNED `checked: 0, overlaps: []`** — a
// perfectly clean answer over nothing at all, because the dialog it narrowed to
// is itself `position: fixed`, which disqualified every descendant. **Only the
// baseline caught it: the deliberately broken page came back clean too.**
//
// **(4) A REVEAL MASK IS A VISIBLE BOX AROUND CLIPPED TEXT.** `span.mask` is
// `overflow: hidden` with its line translated out of it — visible by every
// other test and showing nothing. Sixteen of them on the landing page. Each
// rect is now cut down by every ancestor that clips.
//
// ── AND THE TRAP THAT COSTS THE MOST, because it reads as a clean page ──────
// **A HIDDEN BROWSER PANE PAUSES `requestAnimationFrame`, SO SCROLL-REVEALS
// NEVER FIRE.** The landing page holds its unrevealed copy at `opacity: 0` via
// `.ld [data-rv]`, flipped by a rAF loop. With the pane hidden, 259 elements
// carried text, 250 were visible ignoring opacity, and **76 were visible once
// opacity counted** — so a sweep reported 35 elements checked over an entire
// page and called it clean. `document.hidden` was true and 21 animations were
// "running" with none progressing.
//
// **SO: READ `checked` BEFORE YOU READ `overlaps`.** A low count is not a pass,
// it is a measurement that did not happen. `SWEEP_PROBE` strips `data-rv` for
// exactly this reason and reports how many it had to strip.
export const OVERLAP_PROBE = `(rootSelector, opts) => {
  const opacity = opts && opts.opacity === false ? false : true;
  let root = document.querySelector(rootSelector || "#root") || document.body;
  const vis = (el) => {
    try { return el.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true, opacityProperty: opacity }); }
    catch { return el.getClientRects().length > 0; }
  };
  // What is on top IS the screen — bug (2).
  const dialog = [...root.querySelectorAll('[role="dialog"]')].find(vis);
  if (dialog) root = dialog;

  // Inherited, not own — bug (1). **THE ROOT IS TESTED BEFORE ITS POSITION IS
  // READ, AND THAT ORDER IS THE WHOLE RULE** — bug (3): written the other way
  // round, a root that is itself fixed disqualifies everything inside it and
  // the probe reports a clean screen having measured none of it.
  const floats = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      if (n === root) return false;
      const p = getComputedStyle(n).position;
      if (p === "fixed" || p === "sticky") return true;
    }
    return false;
  };

  // Every clipping ancestor's box, intersected — bug (4). \`overflow\` on either
  // axis makes a clipping box on BOTH, the same fact that cropped a tap
  // target's ::after at 42px earlier in this project.
  const clipBox = (el) => {
    let b = null;
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const p = n.getBoundingClientRect();
      b = b ? { top: Math.max(b.top, p.top), left: Math.max(b.left, p.left),
                right: Math.min(b.right, p.right), bottom: Math.min(b.bottom, p.bottom) }
            : { top: p.top, left: p.left, right: p.right, bottom: p.bottom };
    }
    return b;
  };

  // **WHERE THE TEXT IS, NOT WHERE ITS BOX IS — bug (5), and it is the one that
  // produced every false positive this probe has ever reported.** A block-level
  // wrapper's rect is the whole column: \`.ld .mask > span\` is \`display: block\`,
  // so the headline "Your back office" reported a rect 493px wide when its
  // glyphs stop at 328px, and it "overlapped" a card 130px to its right.
  //
  // **TWO INSTRUMENTS READING RECTS WILL AGREE WITH EACH OTHER AND BOTH BE
  // WRONG.** Cowork's independent run and mine both flagged the \`.vs\` heading
  // over the comparison rows — 6px on \`.nm\` and 3px on \`.gt\`, which looks like
  // corroboration and is actually one shared blind spot, the two figures
  // differing only because those two are baseline-aligned at different sizes.
  // Measured as ink, there is 63px of clearance. **Agreement between
  // instruments that share a blind spot is not corroboration.**
  const inkRect = (el) => {
    let box = null;
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        box = box ? { top: Math.min(box.top, r.top), left: Math.min(box.left, r.left),
                      right: Math.max(box.right, r.right), bottom: Math.max(box.bottom, r.bottom) }
                  : { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
      }
    }
    if (!box) return null;
    const c = clipBox(el);
    if (!c) return box;
    const o = { top: Math.max(box.top, c.top), left: Math.max(box.left, c.left),
                right: Math.min(box.right, c.right), bottom: Math.min(box.bottom, c.bottom) };
    return (o.right - o.left < 1 || o.bottom - o.top < 1) ? null : o;
  };

  const ownText = (el) => [...el.childNodes]
    .filter((n) => n.nodeType === 3 && n.textContent.trim())
    .map((n) => n.textContent.trim()).join(" ");

  const items = [];
  for (const el of root.querySelectorAll("*")) {
    if (!vis(el)) continue;
    if (floats(el)) continue;
    const r = inkRect(el);
    if (!r) continue;
    items.push({ el, r, text: ownText(el).slice(0, 44), tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === "string" ? el.className : "").trim().slice(0, 26) });
  }

  const hits = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const dx = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const dy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      // **FOUR PIXELS, NOT ONE — and the reason is that a Range rect is a LINE
      // BOX rather than literal glyphs.** It carries the font's full ascent and
      // descent whether or not the characters use them: "$277" at 52px reports
      // a 69px-tall rect, and digits have neither an ascender above cap height
      // nor any descender at all. So a label sitting directly above a big
      // figure reads as 2-3px of overlap while nothing visible touches.
      // Measured instances left standing at 1-3px: the landing page's pricing
      // block (2px) and the dashboard's "Neto de este mes" over "$277" (2.5px).
      // **Andrew's ruling, and it is right: do not chase 2px on a line box.**
      if (dx > 4 && dy > 4) {
        hits.push({
          by: Math.round(Math.min(dx, dy)),
          a: a.tag + (a.cls ? "." + a.cls : "") + ' "' + a.text + '"',
          b: b.tag + (b.cls ? "." + b.cls : "") + ' "' + b.text + '"',
        });
      }
    }
  }
  return { checked: items.length, overlaps: hits };
}`;

// A LONG PAGE REVEALS AS YOU SCROLL, so one run at the top checks the hero and
// calls everything below it clean. This walks the page a viewport at a time and
// collects every distinct pair with the scroll position it appeared at.
//
// **IT STRIPS `data-rv` FIRST AND SAYS HOW MANY IT STRIPPED.** That attribute
// is the landing page's unrevealed state; with the browser pane hidden it never
// clears on its own (see the trap above), and a sweep against it measures a
// nearly empty page. Stripping it is exactly what the reveal does. **If
// `revealed` comes back 0 on a page you expect reveals on, the sweep is
// measuring the wrong DOM.**
export const SWEEP_PROBE = `async (rootSelector) => {
  const rv = document.querySelectorAll("[data-rv]");
  rv.forEach((e) => e.removeAttribute("data-rv"));
  await new Promise((r) => setTimeout(r, 400));
  const seen = new Map();
  let checked = 0;
  const step = Math.round(innerHeight * 0.8);
  const total = document.documentElement.scrollHeight;
  for (let y = 0; y < total; y += step) {
    scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 600));
    const o = window.__overlap(rootSelector);
    checked = Math.max(checked, o.checked);
    for (const h of o.overlaps) seen.set(h.a + "|" + h.b, { ...h, atY: y });
  }
  scrollTo(0, 0);
  return { revealed: rv.length, stops: Math.ceil(total / step),
           maxChecked: checked, overlaps: [...seen.values()] };
}`;
