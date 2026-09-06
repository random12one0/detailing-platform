// The landing page and the PRICING PAGE quote real money, make a scarcity
// claim and — since roadmap 2.20 stage 2 — carry disclosures California
// requires by statute. So the things that could quietly become untrue are
// worth pinning:
//
//   1. A price hardcoded in the JSX drifts from pricing.js the first time a
//      number changes, and the page then contradicts itself.
//   2. "3 of 3 left" must be COUNTED, not declared. A number typed into a
//      config file keeps advertising spots after they are taken.
//   3. A struck-through price must be a real price we actually charge —
//      never an anchor invented to make another number look smaller.
//   4. No urgency theater, and no free trial we never offered.
//   5. (2.20 stage 2) The ladder's own pricing RULES, not its figures: the
//      annual saving is a whole number of months inside the band the
//      category uses, and month-to-month's premium is inside the band a
//      no-commitment option normally carries. The founding column obeys
//      both exactly as the list column does — that is what makes $400 and
//      $50 derived rather than invented.
//   6. (2.20 stage 2) The AB 2863 disclosures are ON the page, at reading
//      size, and NOTHING is pre-selected. That is the legal half of the
//      checkout and it is presentation, so only a source check can see it.
//   7. (2.20 stage 2) The landing page's plan buttons point at /pricing.
//      One character of drift puts them back at the signup form, which is
//      the exact thing the owner objected to.
//
//   node tests/landing-pricing.test.mjs

import { readFile } from "node:fs/promises";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name} ${detail}`); }
};

const jsx = await readFile("app/src/landing/LandingPage.jsx", "utf8");
const pjsx = await readFile("app/src/landing/PricingPage.jsx", "utf8");
const main = await readFile("app/src/main.jsx", "utf8");
const cfg = await readFile("app/src/landing/pricing.js", "utf8");
const api = await readFile("app/src/lib/api.js", "utf8");

// COMMENTS OUT, BEFORE ANY CHECK READS SOURCE AS TEXT. Written 2026-09-05
// after a new check failed on its own subject's PROSE: the comment above
// `const [P, setP]` explains that a leftover `PRICING.` would be a bug, and
// the check looking for leftover `PRICING.`s found that sentence. Same trap
// as `email-brand` 7a-ii and `booking-core` § 1 — the file advertising the
// property fails the check for it.
const noComments = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/^\s*\/\/.*$/gm, "");
const jsxCode = noComments(jsx);
const pjsxCode = noComments(pjsx);
const sql = await readFile(
  "supabase/migrations/20260828001100_founding_offer_shape.sql", "utf8");
const { PRICING } = await import("../app/src/landing/pricing.js");

// What a visitor actually reads: source comments are not copy, and the
// hero's demo card quotes a fictional customer's job prices, not ours.
const copy = jsx.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\/\/.*$/gm, "");
// BOUNDED AT THE FAQ, and the bound is the point (added in roadmap 2.2).
// This slice exists to catch OUR prices typed by hand instead of read from
// pricing.js. Everything after the pricing section is a different subject:
// the questions answer "do you take a cut?" with "a $600 coating costs you
// the same as a $65 wash", which is a DETAILER's job prices — the same kind
// of illustrative figure the hero's demo card carries, and the same reason
// the slice starts where it does rather than covering the whole file. An
// unbounded slice would have forced that answer to be reworded to satisfy a
// test aimed at something else.
// THIS SLICE WAS EMPTY AND HAD BEEN SINCE IT WAS WRITTEN — found 2026-09-05.
// The section is `aria-labelledby="prh"`; this looked for `"price"`, found
// nothing, and `indexOf` returned -1, which `slice(-1, <smaller>)` turns into
// the empty string. So "no hardcoded prices in the pricing section" passed by
// having NO SUBJECTS for the whole life of the check — this repo's most
// repeated failure (email-brand 7a-ii went the same way in 2.18), in the one
// test that guards the numbers a customer is charged.
// Anchored on the section's `id` now, which is what the markup keys its own
// href off, and 1a-0 below asserts the slice is not empty ever again.
const pricingStart = copy.indexOf('className="price wrap" id="price"');
const pricingEnd = copy.indexOf('aria-labelledby="faqh"');
const pricingSection = pricingStart < 0 ? ""
  : copy.slice(pricingStart, pricingEnd > pricingStart ? pricingEnd : undefined);

// The pricing page is one long price list, so its whole body is the slice —
// there is no illustrative figure anywhere on it to bound against.
// COMMENTS ARE STRIPPED AND 7b DEPENDS ON IT: its first version matched the
// word "pre-selected" inside the comment explaining why nothing on the page
// is pre-selected. A check a comment can FAIL is a check a comment can also
// PASS, which is the worse half.
// AND THE INDENTED ONES TOO. This stripped `//` only at column 0 until
// 2026-09-05, so a comment inside the component — explaining that "$500 a
// year on $55 a month" prints an awkward saving — failed 5b as two
// hardcoded prices. A check a comment can fail is a check a comment can
// also pass, and this file already says so two lines up.
const pcopy = noComments(pjsx);

console.log("test 1: every number comes from the config");
{
  // BORROWED FROM email-brand 7a-iii, and it is here because the check below
  // it spent its whole life measuring an empty string.
  check("1a-0 · the slice HAS subjects", pricingSection.length > 400,
    `pricing section slice is ${pricingSection.length} chars`);
  const literals = [...pricingSection.matchAll(/\$(\d[\d,]*)/g)].map((m) => m[0]);
  check("no hardcoded prices in the pricing section", literals.length === 0, literals.join(" "));
  // THE IMPORT IS NOW THE DEFAULT AND THE FALLBACK rather than the only
  // source — roadmap 4.4 stage 4 lets the owner override the table from the
  // back office — so the page reads `P`, seeded from `PRICING`.
  check("the page imports the config", /import \{ PRICING, livePricing \} from ".\/pricing.js"/.test(jsx));
  // AND NOTHING READS THE FILE DIRECTLY ANY MORE. A single `PRICING.` left
  // behind would print one number from the file beside another from the
  // database — a page that is half overridden, which is worse than either
  // table on its own and invisible until somebody overrides.
  check("every figure comes from the live table, not the file",
    !/PRICING\./.test(jsxCode.slice(jsxCode.indexOf("export default function"))),
    (jsxCode.match(/PRICING\.[a-zA-Z.]+/g) ?? []).join(", "));
  // MOVED TO THE PRICING PAGE, 2026-09-05, and this check moved with it —
  // the owner's own instruction ("you don't even need to say six hundred a
  // year paid once, because that'll be shown inside the pricing page"). The
  // sentence is still derived rather than typed, so changing `annual` still
  // changes the number of months a visitor reads.
  check("the annual saving is computed, not typed",
    /p\.monthly \* 12 - p\.annual/.test(pjsx), "expected PricingPage to derive it");
  // The page says "N months free" (2026-09-04). That sentence is only true
  // while the saving divides cleanly into whole months — at $60/mo and
  // $600/yr it is exactly 2. Set annual to $610 and the page would advertise
  // "1.8333333333333333 months free", which is the kind of defect that looks
  // like a rounding bug and is actually a pricing one.
  const monthsFree = (PRICING.website.monthly * 12 - PRICING.annual) / PRICING.website.monthly;
  check("the annual saving is a whole number of months",
    Number.isInteger(monthsFree), `${monthsFree} months`);
  check("the annual discount is inside the 15-20% band the category uses",
    monthsFree / 12 >= 0.15 && monthsFree / 12 <= 0.20,
    `${((monthsFree / 12) * 100).toFixed(1)}%`);
}

console.log("\ntest 2: the founding offer is counted, not declared");
{
  // The cap and the remaining count must NOT live in the front end.
  check("pricing.js carries no spot count",
    !/spotsLeft|left\s*:/.test(cfg) && !/total\s*:\s*\d/.test(cfg));
  check("the page asks the server for the offer", /api\.foundingOffer\(\)/.test(jsx));
  check("the API calls the counting function", /rpc\("founding_offer"\)/.test(api));

  // Fail CLOSED: a failed lookup must show standard pricing, never a spot
  // we cannot prove is free.
  check("a failed lookup closes the offer",
    /catch\([^)]*\)\s*=>\s*\{[^}]*setOffer\(\{ total: 0, left: 0 \}\)/.test(jsx),
    "expected the catch to set left to 0");
  check("the guard requires a positive remaining count",
    /const founding = offer && offer\.left > 0;/.test(jsx));

  // Nothing a visitor can READ about the offer may sit outside that guard.
  const guards = [...copy.matchAll(/founding \?|founding &&/g)].map((m) => m.index);
  const visible = [...copy.matchAll(/founding (price|spot|pricing)/gi)].map((m) => m.index);
  const unguarded = visible.filter((i) => !guards.some((g) => g < i && i - g < 700));
  check("every visitor-facing founding line sits inside the guard",
    visible.length > 0 && unguarded.length === 0,
    unguarded.map((i) => copy.slice(i - 40, i + 40).replace(/\s+/g, " ")).join(" | "));
}

console.log("\ntest 3: the count is safe to expose");
{
  check("the function is security definer", /security definer/i.test(sql));
  check("it returns counts, not rows",
    /jsonb_build_object/.test(sql) && !/select \*/i.test(sql));
  check("anonymous visitors may call it", /grant execute on function public\.founding_offer\(\) to anon/i.test(sql));
  check("the underlying settings table is not granted", !/grant .*on table.*platform_settings/i.test(sql));
}

console.log("\ntest 4: the copy stays plain and true");
{
  const banned = ["unlock", "supercharge", "streamline", "hurry", "act now",
                  "limited time", "don't miss", "revolutioni"];
  const hits = banned.filter((w) => new RegExp(w, "i").test(copy));
  check("no urgency theater or SaaS-speak", hits.length === 0, hits.join(", "));

  // A struck price is allowed ONLY when it is the real list price being
  // replaced by a real discount — never a literal typed in to look big.
  // TWO list prices are struck, not one (roadmap 2.2): the founding offer
  // discounts the build fee AND the monthly, and the approved page strikes
  // both. Each must still be a real price out of pricing.js.
  const struck = [...copy.matchAll(/<s className="was">([^<]*)<\/s>/g)].map((m) => m[1].trim());
  const LIST = ["${P.website.setup}", "${P.website.monthly}"];
  check("any struck price is the real list price, from config",
    struck.length > 0 && struck.every((t) => LIST.includes(t)), struck.join(" | "));
  // `<s` alone also matches <span>; anchor on the real element.
  check("no struck literal numbers anywhere",
    !/<s(\s[^>]*)?>\s*\$?\d/.test(copy) && !/<del|line-through/.test(copy));
  check("the struck price only renders under the offer guard",
    struck.length === 0 || /founding && <s className="was">/.test(copy));

  check("no unearned free-trial promise", !/free days|free trial|no card/i.test(copy));
}

// ══ ROADMAP 2.20 STAGE 2 — THE PRICING PAGE ═══════════════════════════

console.log("\ntest 5: the pricing page reads every figure from the config");
{
  check("5a · the page slice HAS subjects", pcopy.length > 3000, `${pcopy.length} chars`);
  const literals = [...pcopy.matchAll(/\$(\d[\d,]*)/g)].map((m) => m[0]);
  check("5b · no hardcoded prices anywhere on it", literals.length === 0, literals.join(" "));
  check("5c · it imports the config", /import \{ PRICING, livePricing \} from ".\/pricing.js"/.test(pjsx));
  check("5c-ii · and reads the live table everywhere, not the file",
    !/PRICING\./.test(pjsxCode.slice(pjsxCode.indexOf("export default function"))),
    (pjsxCode.match(/PRICING\.[a-zA-Z.]+/g) ?? []).join(", "));
  // THE TERM AND THE FEE ARE MONEY TOO. The checkout will charge what this
  // page prints, so a typed "12 months" or a typed "half" is the same class
  // of defect as a typed price — worse, because it is the half a customer
  // disputes.
  check("5d · the term comes from the config", /P\.term\.months/.test(pjsx));
  check("5e · the exit fee comes from the config", /P\.term\.exitFeeShare/.test(pjsx));
}

console.log("\ntest 6: the ladder's RULES, not its figures");
{
  // Every figure is checked against the RULE that produced it, so the owner
  // can move a price and be told whether the ladder still makes sense —
  // rather than being told the number changed, which he already knows.
  const ladders = [
    ["list", PRICING.website.monthly, PRICING.annual, PRICING.monthToMonth],
    ["founding", PRICING.founding.monthly, PRICING.founding.annual, PRICING.founding.monthToMonth],
  ];
  for (const [name, monthly, annual, m2m] of ladders) {
    const monthsFree = (monthly * 12 - annual) / monthly;
    check(`6a · ${name}: the annual saving is a whole number of months`,
      Number.isInteger(monthsFree), `${monthsFree} months`);
    check(`6b · ${name}: the annual discount is inside the 15-20% band`,
      monthsFree / 12 >= 0.15 && monthsFree / 12 <= 0.20,
      `${((monthsFree / 12) * 100).toFixed(1)}%`);
    // 20-30% is the category's premium for carrying no commitment. Under it
    // the committed plan stops being worth committing to; over it the page
    // starts arguing that the monthly price was inflated all along.
    const premium = (m2m - monthly) / monthly;
    check(`6c · ${name}: month-to-month's premium is inside the 20-30% band`,
      premium >= 0.20 && premium <= 0.30, `${(premium * 100).toFixed(1)}%`);
    check(`6d · ${name}: the ladder is in order — up front cheapest, m2m dearest`,
      annual / 12 < monthly && monthly < m2m,
      `${(annual / 12).toFixed(2)} / ${monthly} / ${m2m}`);
  }
  // A DISCOUNT THAT IS NOT A DISCOUNT IS THE SCARCITY CLAIM GOING UNTRUE.
  for (const k of ["setup", "monthly", "annual", "monthToMonth"]) {
    const list = k === "annual" ? PRICING.annual
      : k === "monthToMonth" ? PRICING.monthToMonth : PRICING.website[k];
    check(`6e · founding ${k} is genuinely below the list price`,
      PRICING.founding[k] < list, `${PRICING.founding[k]} vs ${list}`);
  }
}

console.log("\ntest 6b: the founding saving is VISIBLE, not only stated");
{
  // THE OWNER'S ASK, 2026-09-05: *"it should visually show like the discount
  // price vs the regular price for the founder spots."* He was looking at the
  // three rungs, and he was right about an inconsistency INSIDE this page: the
  // build fee one section above already strikes its list price, and the three
  // figures underneath it did not — so the page taught the reader that a
  // struck price is how a discount looks, and then stopped doing it.
  //
  // THE RULE IS THE LANDING PAGE'S AND IT DOES NOT SOFTEN HERE: a struck price
  // is only ever a REAL list price the product charges somebody. An anchor
  // typed in to make the other number look smaller is the thing this check
  // exists to make impossible.
  const struck = [...pcopy.matchAll(/<s className="was">([^<]*)<\/s>/g)].map((m) => m[1].trim());
  const LIST = [
    "${listP.setup}", "${listP.annual}", "${listP.monthly}", "${listP.monthToMonth}",
  ];
  check("6b-i · the page strikes a list price at all", struck.length >= 4, `${struck.length} struck`);
  check("6b-ii · every struck price is a real list figure from the config",
    struck.length > 0 && struck.every((t) => LIST.includes(t)), struck.join(" | "));
  check("6b-iii · nothing struck is a literal number",
    !/<s(\s[^>]*)?>\s*\$?\d/.test(pcopy) && !/<del|line-through/.test(pcopy));
  // AND ONLY WHILE A REAL DISCOUNT IS LIVE. With the spots gone the page shows
  // standard prices, and a strike still drawn there would be an invented
  // saving on the one page a customer reads before paying.
  check("6b-iv · every strike is behind the founding guard",
    (pcopy.match(/<s className="was">/g) ?? []).length
      === (pcopy.match(/founding && <s className="was">/g) ?? []).length,
    "an unguarded strike would advertise a discount nobody is getting");
  // ALL THREE RUNGS, not just the one somebody remembered. The middle rung is
  // the one carrying the commitment, so it is also the one a reader studies.
  for (const fig of ["annual", "monthly", "monthToMonth"]) {
    check(`6b-v · the ${fig} rung shows what it is discounted from`,
      pcopy.includes(`<s className="was">$\{listP.${fig}}</s>`), fig);
  }
}

console.log("\ntest 7: the AB 2863 disclosures are on the page");
{
  // California requires the auto-renewal terms, the commitment and the
  // early-exit fee to be CLEAR AND CONSPICUOUS before billing details are
  // taken, and this page is where "before" happens. Every item below is a
  // sentence a customer must be able to read, so a page that quietly loses
  // one is a page it is no longer lawful to put a checkout behind — and
  // nothing else in this repo can see that, because it is presentation
  // rather than arithmetic.
  // SCOPED TO THE DISCLOSURE LIST, not to the page — found by baselining.
  // Deleting the exit fee from the terms failed NOTHING, because the phrase
  // also appears in the ladder rung that carries the term, so the check was
  // satisfied by a sentence somewhere else entirely. A disclosure that is
  // only in a sales pitch is not a disclosure: AB 2863 wants it where a
  // customer reads the terms, and "somewhere on the page" is how a later
  // layout change quietly moves one out of the list without failing this.
  const terms = pcopy.slice(pcopy.indexOf("<dl>"), pcopy.indexOf("</dl>"));
  check("7a-0 · the disclosure list HAS subjects", terms.length > 1500,
    `terms list slice is ${terms.length} chars`);
  const lower = terms.toLowerCase();
  const must = {
    "auto-renewal": /renews automatically|renews by itself/,
    "the renewal frequency": /once a year|every month/,
    "what will be charged": /what you will be charged/,
    "the commitment": /commitment/,
    "the early-exit fee": /half of the months still to run/,
    "how to cancel": /how you cancel/,
    "that cancelling is one button": /one button in your own account/,
    "that the build fee is separate": /build fee is separate/,
    "what a failed payment costs": /if a payment fails/,
  };
  for (const [what, re] of Object.entries(must)) {
    check(`7a · the page states ${what}`, re.test(lower), "not found");
  }
  // NOTHING IS PRE-SELECTED — the first item in the FTC's Adobe complaint.
  // The page has no selection state at all, which is how it cannot have a
  // default; a session that "improves" the ladder into a radio group with a
  // sensible default fails here, which is the point of writing it this way.
  check("7b-i · no pre-selected control",
    !/defaultChecked|defaultValue=|\bselected\b/.test(pcopy));
  check("7b-ii · no selection state that could be defaulted",
    !/useState\([^)]*(term|plan|selected)/i.test(pcopy));
  // "Most popular" on a product with no customers is a pre-selection in
  // disguise AND a claim we cannot substantiate.
  // The WHOLE page, not the terms list: a badge would sit on the ladder.
  check("7b-iii · no recommendation badge",
    !/most popular|recommended|best value|our pick/i.test(pcopy));
  // The disclosures may not be fine print. `.fine` is this stylesheet's 13px
  // --fog-2 ramp; the terms are 16px on --bone-2 on purpose.
  check("7c · the terms are not set in the fine-print ramp",
    !/className="fine"[\s\S]{0,120}(renews|cancel|commitment|exit fee)/i.test(pcopy));
}

console.log("\ntest 8: the plan buttons lead to the pricing page");
{
  // THE DEFECT THIS PREVENTS IS THE ONE THE OWNER NAMED: "when you say take
  // founding spot, that shouldn't bring you to a sign up or a payment
  // screen." Every plan button on the landing page went straight to
  // /app?plan=… until 2026-09-05, and putting one back is one word of drift.
  check("8a · /pricing is a served route", /<Route path="\/pricing"/.test(main));
  const planHrefs = [...jsx.matchAll(/href="(\/app\?plan=[^"]*)"/g)].map((m) => m[1]);
  check("8b · no landing-page button goes straight to the signup form",
    planHrefs.length === 0, planHrefs.join(" "));
  const toPricing = (jsx.match(/href="\/pricing/g) || []).length;
  check("8c · the landing page points at /pricing", toPricing >= 4, `${toPricing} links`);
  // Sign in is the one that must NOT move: somebody with an account is not
  // shopping.
  check("8d · sign in still goes to the app", /href="\/app">Sign in</.test(jsx));

  // A REVEAL ON A CONDITIONALLY-RENDERED NODE IS INVISIBLE FOR EVER, and it
  // shipped on this page's first run (2026-09-05). thread.js collects its
  // revealables with ONE querySelectorAll at mount and that list is STATIC,
  // so a node React adds LATER — when the founding lookup answers — is never
  // given `.in` and sits at opacity 0. The founding strip, which carries the
  // whole scarcity claim, was invisible.
  // NOTHING ELSE IN THIS REPO CAN SEE IT: `?lite=1` reveals everything, so
  // the lite path looked right; an opacity-0 element still has a full box, so
  // the width sweep measured it and printed clean; and no contrast test can
  // measure a colour nobody is ever shown. Put the `data-rv` on a wrapper
  // that is always mounted.
  for (const [name, src] of [["the landing page", jsx], ["the pricing page", pjsx]]) {
    const bad = [...src.matchAll(/\{founding && \(?\s*\n?\s*<[^>]*data-rv/g)].map((m) => m[0]);
    check(`8e · ${name}: no reveal sits on a node the offer lookup adds`,
      bad.length === 0, bad.map((b) => b.replace(/\s+/g, " ")).join(" | "));
  }
}


// ══ ROADMAP 6.2 — A DEMO MUST NOT CONSUME A FOUNDING SPOT ═════════════
// The page PRINTS `founding_offer()`'s answer, so a seeded business inside
// that count tells every visitor a spot is gone. Harmless while nobody has
// signed up; **a false scarcity claim the day a real detailer takes the
// second** — the exact class of statement test 7b already refuses ("most
// popular" with no customers).
console.log("\ntest 9: the founding count ignores demo businesses");
{
  const { readdirSync, readFileSync } = await import("node:fs");
  const migrations = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
  // THE LAST DEFINITION WINS, because these files are append-only and are
  // applied in order. Reading the first one would pin a rule a later
  // migration has already replaced — which is how a check keeps passing about
  // code nothing runs.
  const lastDefining = (needle) => {
    let out = null;
    for (const f of migrations) {
      const sql = readFileSync(`supabase/migrations/${f}`, "utf8");
      if (!sql.includes(needle)) continue;
      // BOUNDED TO THE FUNCTION'S OWN BODY. Slicing to the end of the file
      // was the first version and it was VACUOUS: `founding_offer` and
      // `claim_founding_spot` live in the same migration, so 9b passed on
      // 9c's text with `not is_demo` deleted from the count. Found by
      // baselining, not by reading — the check looked right.
      const body = sql.slice(sql.lastIndexOf(needle));
      const end = body.indexOf("$$;");
      out = end === -1 ? body : body.slice(0, end);
    }
    return out;
  };
  const offer = lastDefining("create or replace function public.founding_offer()");
  const claim = lastDefining("create or replace function public.claim_founding_spot(");
  check("9a · the count has a definition to read", !!offer && !!claim);
  check("9b · the remaining count ignores demos",
    /plan_tier = 'founding'[\s\S]{0,120}not is_demo/.test(offer ?? ""));
  // THEY MUST MOVE TOGETHER. A count that excludes demos beside a claim that
  // does not would advertise a spot and then refuse it, which is worse than
  // either being wrong alone.
  check("9c · and so does the claim, or the page offers a spot the claim refuses",
    /plan_tier = 'founding'[\s\S]{0,120}not is_demo/.test(claim ?? ""));
  const seed = readFileSync("scripts/seed-demo.mjs", "utf8");
  check("9d · the seeded demo says it is one",
    /is_demo:\s*true/.test(seed) && /is_demo:\s*true/.test(readFileSync("scripts/seed-two-tenants.mjs", "utf8")));
  // The demo stays FOUNDING on purpose (roadmap 2.20 stage 2): a strike is
  // only drawn on a founding account, so seeded standard the whole treatment
  // would be measured nowhere.
  check("9e · and is still founding, so the struck prices stay the swept state",
    /plan_tier:\s*"founding"/.test(seed));
}


// ══ ROADMAP 7.1 — /terms, /privacy, and the support policy ════════════
console.log("\ntest 10: the two documents and the support line");
{
  const { readFileSync } = await import("node:fs");
  const legal = readFileSync("app/src/landing/legal.js", "utf8");
  const legalPage = readFileSync("app/src/landing/LegalPage.jsx", "utf8");
  const brand = readFileSync("supabase/functions/_shared/platformBrand.ts", "utf8");

  check("10a · both routes exist and are public",
    /path="\/terms"/.test(main) && /path="\/privacy"/.test(main)
      && !/Wrapped><LegalPage/.test(main),
    "a visitor deciding whether to sign up is exactly who reads these");

  // THE SUPPORT CONTACT IS A SECOND COPY, for the wall that already forced two
  // price tables: a Deno bundle cannot import out of `supabase/`. Same
  // permission, same price — a test that pins them equal.
  const emailIn = (src) => (src.match(/support@[a-z.]+/) ?? [])[0];
  const phoneIn = (src) => (src.match(/\(\d{3}\) \d{3}-\d{4}/) ?? [])[0];
  check("10b · the support address matches the one the emails send from",
    emailIn(legal) && emailIn(legal) === emailIn(brand), `${emailIn(legal)} vs ${emailIn(brand)}`);
  check("10c · and so does the phone number",
    phoneIn(legal) && phoneIn(legal) === phoneIn(brand), `${phoneIn(legal)} vs ${phoneIn(brand)}`);

  // A POLICY, NOT A LINK. "Contact us" under a footer says nothing about who
  // picks it up or how long you wait, which is the whole question somebody
  // handing over a business is asking.
  check("10d · the footer carries the support policy and both documents",
    /SUPPORT_LINE/.test(jsx) && /href="\/terms"/.test(jsx) && /href="\/privacy"/.test(jsx));
  check("10e · and the line says how long an answer takes",
    /same working day/i.test(legal), "a promise with no time in it is not a policy");

  // THE SENTENCE THAT MAKES THESE HONEST. The roadmap calls them placeholders
  // and says the owner supplies real legal text later; a reader who finds that
  // out at the bottom has read the whole thing on a wrong assumption.
  check("10f · both pages say a lawyer has not seen this yet, at the TOP",
    /NOT_YET_LAWYERED/.test(legalPage)
      && legalPage.indexOf("NOT_YET_LAWYERED", legalPage.indexOf("<main")) < legalPage.indexOf("<dl"),
    "it is above the sections, not a footnote");

  // THE RULE THE FILE EXISTS TO HOLD. Borrowed boilerplate is worse than
  // nothing: it is a promise the owner has not made, in language he cannot
  // check. Every line in there is a fact about what this product does.
  const invented = ["arbitration", "governing law", "class action", "warrant",
                    "indemnif", "limitation of liability", "jurisdiction"];
  // COMMENTS OUT FIRST — and this failed on its own file's header, which says
  // in as many words that boilerplate "about arbitration and governing law" is
  // what the file refuses to contain. **Seventh instance of that trap in two
  // days.** A check reading source as text reads the prose explaining it too.
  const hits = invented.filter((w) => new RegExp(w, "i").test(noComments(legal)));
  check("10g · nothing is invented that nobody has decided", hits.length === 0, hits.join(", "));

  // The commitments these pages restate are ones `/pricing` already PRINTS, so
  // restating them invents nothing — but they must not drift apart.
  check("10h · the terms restate the printed promises rather than new ones",
    /two weeks/i.test(legal) && /Nothing is deleted/i.test(legal)
      && /two weeks/i.test(pcopy) && /nothing is deleted/i.test(pcopy),
    "the dunning promise is on the pricing page too, and the two must say the same thing");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
