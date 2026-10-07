// ROADMAP 7.18 — EVERY `.ld` MARKETING PAGE CARRIES THE PHONE NAV.
//
//   node --test tests/ld-pages-carry-the-nav.test.mjs
//
// Credential-free. Reads app/src/landing/*.jsx and app/src/main.jsx as text;
// no browser, no dev server.
//
// WHY: 7.4, 7.11 and 7.12 were each "one page had the fix and the other did
// not", and every one was found by a person opening the second file.
// `tests/landing-pricing.test.mjs` § 11 reads LandingPage.jsx alone, so it could
// not have said "PricingPage.jsx has no burger" even in principle. Below 470px
// `.lk` links are hidden by CSS, so a page with no burger and no `#navmenu` has
// a wordmark and nothing to press.
//
// WHAT IT ASKS, per page whose root element carries class `ld`:
//   1. a `.burger` button,
//   2. an `id="navmenu"` element,
//   3. a `Sign in` link INSIDE that menu.
// The pages are DISCOVERED, so a fourth `.ld` page checks itself by existing.
// The sign-up pill is deliberately not asked about: PricingPage omits it on
// purpose and nothing here needs it.
//
// **IT IS RED TODAY, ON PURPOSE, AND THAT IS THE ITEM'S OWN DONE-WHEN.**
// `LegalPage.jsx` has no burger and no `#navmenu`, so `/terms` and `/privacy`
// are named below. Fixing it is app/src and is a separate step; the check was
// to exist and fail first (the order 8.10b used). A run that does NOT name both
// URLs against the repo as it stands is a broken check, not a passing one —
// section 4 asserts the discovery floor and the sabotage, and section 5 reads
// the real result.
//
// ponytail: regex over source, not a DOM. A burger rendered by a helper
// component would be invisible to it; if that ever happens, this check goes
// red on a page that is fine, which is the safe direction to be wrong in.

import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const DIR = "app/src/landing";
const read = (p) => readFileSync(p, "utf8");

/** `.ld` pages, discovered: any landing/*.jsx with a root `className="ld …"`. */
export function ldPages(files) {
  return Object.keys(files).filter((f) => /className=\{?[`"]ld[\s"`]/.test(files[f]));
}

/** What a page is missing, as plain phrases. Empty means it carries the nav. */
export function missingNav(src) {
  // The JSX comments inside the component are prose, and several of them
  // QUOTE `id="navmenu"` and "Sign in" while describing the very thing that is
  // absent. Strip them or the check reads the apology as the feature.
  const code = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const out = [];
  if (!/className="burger"/.test(code)) out.push("a .burger button");
  const at = code.indexOf('id="navmenu"');
  if (at < 0) out.push('an id="navmenu" menu');
  else {
    // From the menu's opening tag to the first closing </div> after it.
    const menu = code.slice(at, code.indexOf("</div>", at) + 6);
    if (!/>\s*Sign in\s*</.test(menu)) out.push("a Sign in link inside the menu");
  }
  return out;
}

/** Which URLs does main.jsx serve from each landing file? */
export function routesFor(mainSrc) {
  const comp = {};
  for (const m of mainSrc.matchAll(/import\s+(\w+)\s+from\s+"\.\/landing\/(\w+\.jsx)"/g)) comp[m[1]] = m[2];
  const byFile = {};
  for (const m of mainSrc.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(\w+)/g)) {
    const f = comp[m[2]];
    if (f) (byFile[f] ??= []).push(m[1]);
  }
  return byFile;
}

const files = Object.fromEntries(
  readdirSync(DIR).filter((f) => f.endsWith(".jsx")).map((f) => [f, read(`${DIR}/${f}`)]),
);
const routes = routesFor(read("app/src/main.jsx"));

test("ROADMAP 7.18 — every .ld page carries burger, #navmenu and a Sign in link", async (t) => {
  await t.test("1 · discovery floor: the three known pages are found by their class, not a list", () => {
    const found = ldPages(files).sort();
    assert.ok(found.length >= 3, `found ${found.length} .ld page(s): ${found.join(", ")}`);
    for (const f of ["LandingPage.jsx", "LegalPage.jsx", "PricingPage.jsx"]) assert.ok(found.includes(f), `${f} not discovered`);
  });

  await t.test("2 · SABOTAGE — the checker sees each piece removed from a page known to be whole", () => {
    const whole = files["LandingPage.jsx"];
    assert.deepEqual(missingNav(whole), [], "LandingPage is the page the others were copied from");
    assert.deepEqual(missingNav(whole.replace('className="burger"', 'className="x"')), ["a .burger button"]);
    assert.deepEqual(missingNav(whole.replaceAll('id="navmenu"', 'id="x"')), ['an id="navmenu" menu']);
    // Only the Sign in INSIDE the menu counts: the one in the bar must not satisfy it.
    const at = whole.indexOf('id="navmenu"');
    const cut = whole.slice(0, at) + whole.slice(at).replace(/>Sign in</, ">Log in<");
    assert.deepEqual(missingNav(cut), ["a Sign in link inside the menu"]);
  });

  await t.test("3 · the route map reaches /terms and /privacy through LegalPage.jsx", () => {
    assert.deepEqual([...(routes["LegalPage.jsx"] ?? [])].sort(), ["/privacy", "/terms"]);
  });

  await t.test("4 · THE REAL RESULT — no .ld page is missing any of the three, and the URLs are named when one is", () => {
    const lines = [];
    for (const f of ldPages(files).sort()) {
      const miss = missingNav(files[f]);
      if (miss.length) lines.push(`${f} (${(routes[f] ?? ["no route found"]).join(", ")}) is missing ${miss.join(" and ")}`);
    }
    assert.equal(lines.length, 0, `\n  ${lines.join("\n  ")}\n  Below 470px a phone visitor on those URLs has a wordmark and nothing else to press.`);
  });
});
