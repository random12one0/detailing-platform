// THE THREE GEOMETRY QUESTIONS, liftable — so a screen `sweep-widths.mjs`
// cannot reach still gets asked them.
//
// **`/admin` is in no geometry sweep in this repo**, and that is a large part
// of why it was the screen nobody had looked at. `sweep-widths.mjs` walks `/`,
// `/app`, `/book/:slug`, `/pricing`, `/terms` and `/privacy`; the back office
// is none of those, and it cannot simply be added — that script signs in as
// the demo DETAILER and this screen needs a `platform_admins` row.
//
// So the questions come to the script that CAN get in. They are the same
// three, because they are the ones that have caught real defects here:
//
//   1. is anything past the right edge of the viewport
//   2. is anything outside its own parent's box — the one that found two
//      defects the viewport question could not see, because a card's padding
//      hides a child 19px outside it while it is still on screen
//   3. does the page scroll sideways
//
// WHAT IT DELIBERATELY DOES NOT ASK is whether two boxes OVERLAP.
// `sweep-widths.mjs` records why: a narrowed intersection check still
// reported 449 problems at 392px alone, almost all of them boxes that overlap
// while the words inside them do not — and a check that cries wolf on every
// run is a check somebody starts skipping. Overlap stays a LOOKING check.

export const GEOMETRY_PROBE = () => {
  const out = [];
  const vw = document.documentElement.clientWidth;

  // THE ERROR BOUNDARY FIRST, and this is the check that makes the rest
  // trustworthy. Every question below is about GEOMETRY, and geometry has
  // nothing to say about whether the screen is the one you asked for: four
  // short lines of "That didn't load" are not past any edge, so a crash
  // measures CLEAN. `sweep-widths.mjs` learned that the expensive way — it
  // printed `the gear   clean` over a screen that had crashed — and this is
  // the same guard in its smallest form.
  const stop = [...document.querySelectorAll("h1, h2")]
    .find((h) => /didn.t load|went wrong|Page not found/i.test(h.textContent || ""));
  if (stop) return ["CRASHED OR REFUSED — " + stop.textContent.trim()];

  const named = (el) => {
    const cls = typeof el.className === "string" ? el.className.split(/\s+/)[0] : "";
    return el.tagName.toLowerCase() + (cls ? "." + cls : "");
  };

  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    if (r.right > vw + 1) {
      out.push(named(el) + " is " + Math.round(r.right - vw) + "px past the right edge");
    }

    const p = el.parentElement;
    if (p && p !== document.body && p !== document.documentElement) {
      const pcs = getComputedStyle(p);
      // A PARENT THAT CLIPS CANNOT BE ESCAPED FROM, so a child outside it is
      // invisible rather than a defect. Skipping those is a false-POSITIVE
      // fix, not a hole: a defect is content sticking out where it can be
      // SEEN, and clipped is the definition of cannot be.
      const clips = /hidden|auto|scroll|clip/.test(pcs.overflowX + " " + pcs.overflowY);
      const pr = p.getBoundingClientRect();
      if (!clips && pr.width > 0) {
        const over = Math.max(r.right - pr.right, pr.left - r.left);
        if (over > 2) out.push(named(el) + " sits " + Math.round(over) + "px outside " + named(p));
      }
    }
  }

  if (document.documentElement.scrollWidth > vw + 1) {
    out.push("the page scrolls sideways by " + (document.documentElement.scrollWidth - vw) + "px");
  }
  return [...new Set(out)].slice(0, 8);
};

// Runs the probe and prints what it found. Returns how many problems, so the
// caller can decide the exit code — a measurement that cannot fail a run is a
// measurement nobody reads.
export async function measure(page, label) {
  const problems = await page.evaluate(GEOMETRY_PROBE);
  if (problems.length) {
    console.log("        " + label + ": " + problems.length + " problem(s)");
    for (const p of problems) console.log("          " + p);
  }
  return problems.length;
}
