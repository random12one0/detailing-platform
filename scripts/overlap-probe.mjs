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
// USAGE — it exports a probe you run inside the page:
//
//   import { OVERLAP_PROBE } from "./overlap-probe.mjs";
//   const found = await page.evaluate(eval("(" + OVERLAP_PROBE + ")"), "#root");
//
// **LEAF ELEMENTS ONLY.** A parent always contains its children, so comparing
// every element against every other reports the whole document as overlapping.
// What matters is two pieces of text that are not related by containment.
//
// **AND IT IS SCOPED TO THE APP ROOT.** Cowork's first run found the real
// defect plus one false positive from a browser extension's own chat widget.
// Anything outside our own tree is not ours and must not be reported, or the
// check grows a permanent known-failure that teaches people to ignore it.
// ── TWO BUGS THIS PROBE HAD ON ITS FIRST OUTING, both found by running it on a
// screen with a panel open (the back office's business record), 2026-09-13.
// Recorded because each produced a CONFIDENT WRONG ANSWER rather than an error:
// 22 overlaps reported on a screen with none.
//
// **(1) IT ONLY ASKED THE ELEMENT'S OWN `position`.** A sticky header's own box
// was skipped and the text INSIDE it was not, so the page's header reported
// overlapping whatever it was floating above. The exclusion has to be
// inherited: walk the ancestors.
//
// **(2) AN OVERLAY IS SUPPOSED TO COVER THE PAGE.** A panel opened over the
// list overlaps every row behind it by design, and reporting that is reporting
// the feature. When something is genuinely on top — a `[role="dialog"]` — the
// only question worth asking is whether IT overlaps itself, so it becomes the
// root for that run.
export const OVERLAP_PROBE = `(rootSelector) => {
  let root = document.querySelector(rootSelector || "#root") || document.body;
  const vis = (el) => {
    try { return el.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true }); }
    catch { return el.getClientRects().length > 0; }
  };
  // WHAT IS ON TOP IS THE SCREEN. Anything behind an open dialog is covered on
  // purpose, so comparing across the two answers a question nobody asked.
  const dialog = [...root.querySelectorAll('[role="dialog"]')].find(vis);
  if (dialog) root = dialog;
  // Inherited, not own — see (1) above.
  //
  // **THE ROOT IS TESTED BEFORE ITS POSITION IS READ, AND THAT ORDER IS THE
  // WHOLE RULE — bug (3), 2026-09-13.** Written the other way round, a root
  // that is ITSELF fixed — which every dialog in this product is — disqualified
  // every element inside it, and the probe returned \`checked: 0, overlaps: []\`.
  // **It reported a perfectly clean screen while measuring nothing at all**,
  // which is this repo's single most repeated failure wearing yet another
  // costume. It was caught only because the baseline ran: the deliberately
  // broken page came back clean too, and a check that cannot fail on purpose
  // has not passed.
  const floats = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      if (n === root) return false;
      const p = getComputedStyle(n).position;
      if (p === "fixed" || p === "sticky") return true;
    }
    return false;
  };
  // A LEAF THAT CARRIES ITS OWN WORDS. An element whose text all comes from a
  // child is that child's text, not its own, and counting both makes every
  // parent overlap its child.
  const ownText = (el) => [...el.childNodes]
    .filter((n) => n.nodeType === 3 && n.textContent.trim())
    .map((n) => n.textContent.trim()).join(" ");

  const items = [];
  for (const el of root.querySelectorAll("*")) {
    if (!vis(el)) continue;
    const text = ownText(el);
    if (!text) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    // A fixed or sticky element is SUPPOSED to travel over the page — a header
    // that covers the content it scrolls past is the design, not a defect. The
    // test is on the ANCESTORS as well as the element, or the header is skipped
    // and the words inside it are not.
    if (floats(el)) continue;
    items.push({ el, r, text: text.slice(0, 48), tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === "string" ? el.className : "").trim().slice(0, 30) });
  }

  const hits = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      // Containment is not overlap: a caption inside a card is not a defect.
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const dx = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const dy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      // **ONE PIXEL OF SLOP.** Sub-pixel layout puts adjacent boxes a fraction
      // into each other constantly; a zero threshold reports the whole page and
      // is the same as no check at all.
      if (dx > 1 && dy > 1) {
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
