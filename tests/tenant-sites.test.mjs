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
// SCOPE: only the pages this session builds and maintains — the `v-` set. The
// twenty-one earlier mock-ups are kept as a record and are not retro-fitted
// (`docs/sessions/websites.md` § 6: do not rebuild the existing ten).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "docs/tenant-sites";
const files = readdirSync(DIR).filter(f => /^v-.*\.html$/.test(f)).sort();

let checks = 0, fails = 0, siteImgs = 0;
// the home page is the one with no -suffix; the tabs hang off it
const isHome = (f) => /^v-[a-z]+\.html$/.test(f);
const ok = (cond, msg) => {
  checks++;
  if (!cond) { fails++; console.log("  FAIL  " + msg); }
};

if (!files.length) {
  console.log("tenant-sites: NO v-*.html PAGES FOUND — a skipped check reads exactly like a passing one.");
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
  siteImgs += imgs;

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

  // 8 · THE NAME CARRIES THE TRADE (rule 1). Of the eighteen sites he sent,
  //     the only crafted name is a designer's demo with no customers.
  const title = (html.match(/<title>([^<]*)<\/title>/) || [, ""])[1];
  ok(/detail|auto|car|wash|valet|spa/i.test(title),
     `${f}: <title> names no trade word — "${title}"`);
}

// The site as a whole still owes real photography — this is the guard that
// would have caught the ten pages with zero <img> between them.
ok(siteImgs >= 5, `the v- site carries only ${siteImgs} image(s) across ${files.length} pages`);
ok(files.some(isHome), "no home page (v-<name>.html) found among the v- pages");

console.log(`tenant-sites: ${checks} checks over ${files.length} page(s), ${fails} failed`);
process.exit(fails ? 1 : 0);
