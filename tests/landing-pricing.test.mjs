// The landing page quotes real money, so the things that could quietly go
// wrong are worth pinning:
//
//   1. A price hardcoded in the JSX drifts from pricing.js the first time a
//      number changes, and the page then contradicts itself.
//   2. The founding offer is a REAL limit. When it fills, the section has to
//      disappear — not sit there saying "0 spots left" or leave a heading
//      with nothing under it.
//   3. No urgency theater and no crossed-out fake original prices.
//
//   node tests/landing-pricing.test.mjs

import { readFile } from "node:fs/promises";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name} ${detail}`); }
};

const jsx = await readFile("app/src/landing/LandingPage.jsx", "utf8");
// What a visitor actually reads: source comments are not copy, and the
// hero's demo card quotes a fictional customer's job prices, not ours.
const copy = jsx.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\/\/.*$/gm, "");
const pricingSection = copy.slice(copy.indexOf('aria-labelledby="price"'));
const cfg = await readFile("app/src/landing/pricing.js", "utf8");
const { PRICING } = await import("../app/src/landing/pricing.js");

console.log("test 1: every number comes from the config");
{
  // Any "$" followed by digits in the JSX is a literal price. The only
  // dollar signs allowed are the ones immediately followed by {PRICING...}.
  const literals = [...pricingSection.matchAll(/\$(\d[\d,]*)/g)].map((m) => m[0]);
  check("no hardcoded prices in the pricing section", literals.length === 0, literals.join(" "));
  check("the page imports the config", /import \{ PRICING \} from ".\/pricing.js"/.test(jsx));
  check("the annual saving is computed, not typed",
    /PRICING\.website\.monthly \* 12 - PRICING\.annual/.test(jsx));
}

console.log("\ntest 2: the founding offer is a real, removable limit");
{
  check("the block is guarded on a positive count",
    /PRICING\.founding && PRICING\.founding\.spotsLeft > 0/.test(jsx));
  check("the count is a plain config value", Number.isInteger(PRICING.founding?.spotsLeft));
  check("the config says how to retire it", /spotsLeft/.test(cfg) && /0 hides the offer/.test(cfg));
  // Nothing outside the guarded block may mention the offer, or removing it
  // would leave an orphan.
  // Every line a visitor could READ about the offer must sit inside a
  // `spotsLeft > 0` guard. (`PRICING.founding` identifier references are not
  // copy.) There are two such guarded regions — the offer block and the call
  // to action — so check proximity to a guard rather than one span.
  const guards = [...copy.matchAll(/spotsLeft > 0/g)].map((m) => m.index);
  const visible = [...copy.matchAll(/founding/gi)]
    .map((m) => m.index)
    .filter((i) => copy.slice(i - 8, i) !== "PRICING.");
  const unguarded = visible.filter((i) => !guards.some((g) => g < i && i - g < 600));
  check("every visitor-facing founding line sits inside a guard",
    guards.length > 0 && unguarded.length === 0,
    unguarded.map((i) => copy.slice(i - 40, i + 40).replace(/\s+/g, " ")).join(" | "));

  check("the call to action degrades when it is filled",
    /spotsLeft > 0\s*\?\s*"Take a founding spot"\s*:\s*"Get started"/.test(jsx.replace(/\s+/g, " ")));
}

console.log("\ntest 3: the copy stays plain");
{
  const banned = ["unlock", "supercharge", "streamline", "hurry", "act now",
                  "limited time", "don't miss", "revolutioni"];
  const hits = banned.filter((w) => new RegExp(w, "i").test(copy));
  check("no urgency theater or SaaS-speak", hits.length === 0, hits.join(", "));
  check("no crossed-out original prices", !/line-through|<s>|<del>/.test(copy));
  // The free-trial claim was placeholder copy written beside a placeholder
  // price; with setup fees on the table it is not true.
  check("no unearned free-trial promise", !/free days|free trial|no card/i.test(copy));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
