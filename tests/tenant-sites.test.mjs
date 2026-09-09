// TENANT SITES — the checks that only a COUNT can make.
//
// WHY THIS FILE EXISTS, and it is the tenth proof of the rule it enforces:
// ten mock-up pages shipped with ZERO `<img>` elements between them, every
// check in this repo stayed green, and the regression was found by a human
// looking (`docs/sessions/websites.md` § 1). **No check in this repo looked for
// the ABSENCE of something.** `composition.test.mjs` walks `app/src` and the
// reference rendering BY NAME, so `docs/tenant-sites/*.html` was held by
// nothing at all.
//
// It caught its first live regression the day it was written: the new prices
// page had no photograph on it.
//
// SCOPE: only the pages this session builds and maintains — one letter prefix
// per SITE, currently `v-` (Prime Mobile Detailing) and `w-` (Delgado Mobile
// Detailing). The twenty-one earlier mock-ups are kept as a record and are not
// retro-fitted (`docs/sessions/websites.md` § 6: do not rebuild the ten).
//
// WIDENED 2026-09-08, AND THE REASON IS THIS FILE'S OWN HEADER. The pattern was
// hard-coded `^v-` when site 1 was the only site. Site 2 was then built, this
// check ran, printed "37 checks over 3 pages, 0 failed", and had measured
// NOTHING about the new page. **A check that does not cover the thing you just
// built reads exactly like a passing one** — the sentence this file exists to
// enforce, failing on the file itself the first time a second site appeared.
// The per-site totals below are now grouped by prefix, because one aggregate
// across two sites lets one site's photographs cover another site's having
// none, which is the same hole in a different shape.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "docs/tenant-sites";
const SITE = /^([a-z])-[a-z]+(?:-[a-z]+)?\.html$/;
const files = readdirSync(DIR).filter(f => /^[vw]-.*\.html$/.test(f)).sort();
const siteOf = (f) => f[0];

let checks = 0, fails = 0;
// per SITE, never pooled: {v: {imgs, home}, w: {...}}
const per = {};
const bucket = (f) => (per[siteOf(f)] ||= { imgs: 0, home: false });
// the home page is the one with no -suffix; any tabs hang off it
const isHome = (f) => /^[a-z]-[a-z]+\.html$/.test(f);
const ok = (cond, msg) => {
  checks++;
  if (!cond) { fails++; console.log("  FAIL  " + msg); }
};

if (!files.length) {
  console.log("tenant-sites: NO [vw]-*.html PAGES FOUND — a skipped check reads exactly like a passing one.");
  process.exit(1);
}

for (const f of files) {
  const html = readFileSync(join(DIR, f), "utf8");
  const body = html.slice(html.indexOf("<body"));

  // 1 · PHOTOGRAPHS ARE A SITE-LEVEL RULE, NOT A PAGE-LEVEL ONE.
  //     This check first demanded an <img> on EVERY page, and the owner read
  //     the result back at me: "even on a pricing page there should probably
  //     be no images — why is our image supposed to be about the pricing?"
  //     A check that FORCES decoration is worse than no check, and A2 was
  //     never a rule about pages — it was a rule about a site that shows no
  //     work. DEVICE-INVENTORY I1. The site total is asserted after the loop.
  const imgs = (body.match(/<img\b/g) || []).length;
  bucket(f).imgs += imgs;
  if (isHome(f)) bucket(f).home = true;

  // 2 · ABOVE THE FOLD, ON THE HOME PAGE. "A photograph at scale" is a claim
  //     about the FOLD — k-cedar's recorded failure, and it recurred here.
  //     A cheap proxy, and no substitute for looking, but it fails loudly
  //     when a hero photo is pushed under sections of type.
  if (isHome(f)) {
    ok(imgs > 0, `${f}: the HOME page carries no <img> at all (device A2)`);
    if (imgs > 0) {
      const first = body.indexOf("<img");
      ok(first < body.length * 0.5,
         `${f}: first <img> is ${Math.round(first / body.length * 100)}% down the body — the photograph is not near the top`);
    }
  }

  // 3 · NO GREY PLACEHOLDER BOXES. CLAUDE.md § Design: "never a grey
  //     placeholder box." l-tidewater shipped four empty rectangles.
  ok(!/placeholder|\bcoming soon\b/i.test(body.replace(/placeholder="[^"]*"/g, "")),
     `${f}: looks like it carries a placeholder box`);

  // 4 · THE GROUND IS NOT A FLAT FILL (device A1). A page whose body/ground
  //     background is a single colour with no gradient, image or texture.
  ok(/gradient|background-image|\.motes|url\("data:image/.test(html),
     `${f}: the ground looks like a flat fill — no gradient, image or texture found`);

  // 5 · EVERY MANAGED FIGURE NAMES ITS ENDPOINT. "A number PRINTED is not a
  //     number CHARGED", and here the two numbers would live in two different
  //     codebases with nothing able to see both.
  const dollars = (body.match(/\$[0-9][0-9,.]*/g) || []).length;
  if (dollars > 0) {
    ok(/data-from=/.test(body),
       `${f}: prints ${dollars} money figure(s) and carries no data-from anywhere`);
  }

  // 6 · ONE BOOKING AREA (tenant-site-contract §2n). His note: "there's three
  //     different booking areas, which I'm confused by."
  const forms = (body.match(/<form\b/g) || []).length;
  const rails = (body.match(/class="bk-rail"/g) || []).length;
  ok(forms + rails <= 1,
     `${f}: ${forms} <form> + ${rails} booking rail — a page gets ONE booking area`);

  // 7 · THE SITE SELLS DETAILING, NOT THE WEBSITE (design-knowledge § COPY
  //     AND NAMING rule 6). His most important note.
  const text = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  for (const phrase of [
    "booking takes", "book in a minute", "live availability",
    "our booking system", "powered by", "online booking system",
  ]) {
    ok(!new RegExp(phrase, "i").test(text),
       `${f}: advertises the website rather than the detailing — "${phrase}"`);
  }

  // 9 · THE H1 SAYS WHAT THE BUSINESS DOES. His rule, 2026-09-08, on a
  //     headline that read "Paint, after dark": *"What the hell does that
  //     mean… it's too creative. It's too startup. It's too AI AI looking.
  //     The first bold thing should be explaining what this is."*
  //     **The rule was already written — playbook § 3 rule 4 — and the build
  //     broke it anyway**, which is this repo's own finding about rules with
  //     no test. This is the testable half: an absolute with a right answer.
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ""])[1]
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (isHome(f)) {
    // BASELINED AND FOUND TOO WEAK ON THE FIRST TRY: this list originally
    //     included bare "paint", so the exact headline he rejected —
    //     "Paint, after dark" — PASSED. A material is not a service. The list
    //     is SERVICES only, and the check was re-baselined against that
    //     headline until it failed.
    ok(/detailing|detail|correction|coating|ceramic|wash|valet|polish/i.test(h1),
       `${f}: the <h1> names no trade word — "${h1}". It has to say what the ` +
       `business does, not evoke it.`);
  }

  // 10 · SOMETHING STAYS NO MATTER WHERE YOU ARE. His rule for EVERY site:
  //     "there should be some sort of sticky top bar. Or it doesn't have to be
  //     the top. It could be top, it could be bottom, it could be on the side."
  ok(/position:\s*(sticky|fixed)/.test(html),
     `${f}: nothing on this page is sticky or fixed — a reader 5,000px down ` +
     `has no way to act`);

  // 11 · AND overflow-x:hidden ON html OR body SILENTLY DISABLES IT. Measured
  //     on this very page: the header was `position:sticky` and rode away,
  //     because overflow-x:hidden makes the document a scroll container and
  //     sticky then sticks to a box that never scrolls. `clip` does not.
  //     THE FIX FOR ONE RULE HERE BROKE ANOTHER, and only he noticed.
  ok(!/(?:^|[^-\w])(?:html|body)[^{]*\{[^}]*overflow-x:\s*hidden/.test(html),
     `${f}: overflow-x:hidden on html or body — this disables position:sticky. ` +
     `Use overflow-x:clip, or contain the overflow on the element that causes it.`);

  // 8 · THE NAME CARRIES THE TRADE (rule 1). Of the eighteen sites he sent,
  //     the only crafted name is a designer's demo with no customers.
  const title = (html.match(/<title>([^<]*)<\/title>/) || [, ""])[1];
  ok(/detail|auto|car|wash|valet|spa/i.test(title),
     `${f}: <title> names no trade word — "${title}"`);
}

// The site as a whole still owes real photography — this is the guard that
// would have caught the ten pages with zero <img> between them.
for (const [key, s] of Object.entries(per)) {
  ok(s.imgs >= 5, `site "${key}-" carries only ${s.imgs} image(s) across its pages`);
  ok(s.home, `site "${key}-" has no home page (${key}-<name>.html)`);
}

console.log(`tenant-sites: ${checks} checks over ${files.length} page(s) in `
  + `${Object.keys(per).length} site(s) [${Object.keys(per).join(", ")}], ${fails} failed`);
process.exit(fails ? 1 : 0);
