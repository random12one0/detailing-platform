// The landing page quotes real money and makes a scarcity claim, so the
// things that could quietly become untrue are worth pinning:
//
//   1. A price hardcoded in the JSX drifts from pricing.js the first time a
//      number changes, and the page then contradicts itself.
//   2. "3 of 3 left" must be COUNTED, not declared. A number typed into a
//      config file keeps advertising spots after they are taken.
//   3. A struck-through price must be a real price we actually charge —
//      never an anchor invented to make another number look smaller.
//   4. No urgency theater, and no free trial we never offered.
//
//   node tests/landing-pricing.test.mjs

import { readFile } from "node:fs/promises";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name} ${detail}`); }
};

const jsx = await readFile("app/src/landing/LandingPage.jsx", "utf8");
const cfg = await readFile("app/src/landing/pricing.js", "utf8");
const api = await readFile("app/src/lib/api.js", "utf8");
const sql = await readFile(
  "supabase/migrations/20260828001100_founding_offer_shape.sql", "utf8");
const { PRICING } = await import("../app/src/landing/pricing.js");

// What a visitor actually reads: source comments are not copy, and the
// hero's demo card quotes a fictional customer's job prices, not ours.
const copy = jsx.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\/\/.*$/gm, "");
const pricingSection = copy.slice(copy.indexOf('aria-labelledby="price"'));

console.log("test 1: every number comes from the config");
{
  const literals = [...pricingSection.matchAll(/\$(\d[\d,]*)/g)].map((m) => m[0]);
  check("no hardcoded prices in the pricing section", literals.length === 0, literals.join(" "));
  check("the page imports the config", /import \{ PRICING \} from ".\/pricing.js"/.test(jsx));
  check("the annual saving is computed, not typed",
    /PRICING\.website\.monthly \* 12 - PRICING\.annual/.test(jsx));
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
  const struck = [...copy.matchAll(/<s className="was">([^<]*)<\/s>/g)].map((m) => m[1].trim());
  check("any struck price is the real list price, from config",
    struck.every((t) => t === "${PRICING.website.setup}"), struck.join(" | "));
  // `<s` alone also matches <span>; anchor on the real element.
  check("no struck literal numbers anywhere",
    !/<s(\s[^>]*)?>\s*\$?\d/.test(copy) && !/<del|line-through/.test(copy));
  check("the struck price only renders under the offer guard",
    struck.length === 0 || /founding && <s className="was">/.test(copy));

  check("no unearned free-trial promise", !/free days|free trial|no card/i.test(copy));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
