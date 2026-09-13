// THE PIN BETWEEN THE PRODUCT'S PRICE FORMATTER AND EMAIL'S COPY OF IT.
//
// `app/src/lib/format.js` is the one place a price is spelled. Email had to
// break that rule for the same wall that forced `_shared/brandColor.js`: an
// edge function is a separate Deno bundle and the Supabase CLI will not follow
// an import out of `supabase/`. So `_shared/emailKit.ts` repeats the rule, and
// this file is the reason that is allowed — it imports BOTH and asserts they
// agree, value for value.
//
// WHAT IT WOULD HAVE CAUGHT, which is why it is a test and not a comment:
// until 2026-09-13 `emailKit.money` was `toFixed(2)`, so a job whose booking
// page said **$150** produced an email saying **$150.00**, and **$1,200** on
// the page came out **$1200.00** in the inbox. Two spellings of one price, one
// on the screen and one in the customer's mail, and nothing in the repo could
// see it — every email check read the rendered output, which was internally
// consistent, and no check had ever compared the two formatters.
//
// Credential-free. Run it from the repo root.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { money as appMoney } from "../app/src/lib/format.js";
import { money as mailMoney } from "../supabase/functions/_shared/emailKit.ts";

let n = 0;
let skipped = 0;
const check = (name, cond, detail = "") => {
  n++;
  if (!cond) {
    console.error(`FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
    process.exitCode = 1;
  }
};

// --- 1 · THE TWO FORMATTERS AGREE, VALUE FOR VALUE -------------------------
//
// Not a spelling check. Both functions are CALLED and their outputs compared,
// so a change to either side that is not made to the other is red here.
//
// The table is every shape a price takes in this product: whole dollars, a
// half, a stray cent, the comma boundary either side, a negative (the Money
// screen's net-negative week), zero, and the junk a null column produces.
const VALUES = [
  0, 1, 5, 9.99, 45, 58.5, 95, 99.5, 100, 149.99, 150, 220, 345,
  999, 999.5, 1000, 1200, 1234.56, 5000, 12025, 1234567.89,
  0.004, 0.005, 0.01, 0.1, 0.125,
  -0.5, -40, -133, -189, -1200.75,
  null, undefined, "", "150", "58.50", NaN,
];

for (const v of VALUES) {
  const a = appMoney(v);
  const b = mailMoney(v);
  check(`1 · money(${JSON.stringify(v)}) agrees`, a === b, `app ${a} vs email ${b}`);
}

// --- 1b · AND THE SUBJECTS WERE ACTUALLY COMPARED --------------------------
// Trap: a green line over zero subjects reads exactly like a pass. Count.
check("1b · the table was walked", n >= VALUES.length, `${n} comparisons over ${VALUES.length} values`);
check("1b · both formatters are real functions",
  typeof appMoney === "function" && typeof mailMoney === "function");

// --- 2 · THE RULE ITSELF, STATED AS BEHAVIOUR ------------------------------
//
// Asserted on the EMAIL side, because that is the copy that drifts. These are
// the three properties `format.js`'s own header commits to, and each one is a
// real failure this product has shipped.
check("2a · cents only when there are cents", mailMoney(95) === "$95", mailMoney(95));
check("2b · a cent that exists is never hidden", mailMoney(58.5) === "$58.50", mailMoney(58.5));
check("2c · a comma above 999", mailMoney(1200) === "$1,200", mailMoney(1200));
check("2d · the sign goes before the symbol", mailMoney(-189) === "-$189", mailMoney(-189));
check("2e · and before the symbol with cents too", mailMoney(-189.5) === "-$189.50", mailMoney(-189.5));
check("2f · rounds to the cent", mailMoney(0.005) === "$0.01", mailMoney(0.005));
check("2g · a missing figure is zero, not NaN", mailMoney(null) === "$0", mailMoney(null));

// --- 3 · NO THIRD SPELLING REACHES A PERSON -------------------------------
//
// `_shared/platformBilling.ts` holds its own cents-based formatter — it takes
// Stripe's integer cents rather than dollars, so it cannot be the same
// function. It must still produce the same SPELLING. Source-read rather than
// imported because that file reaches `npm:stripe`; so the rule asserted is the
// one that matters and not the punctuation: it must group and it must drop
// whole-dollar cents.
{
  const src = await readFile(new URL("../supabase/functions/_shared/platformBilling.ts", import.meta.url), "utf8");
  const code = src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  check("3a · platformBilling's money groups with toLocaleString", /toLocaleString\("en-US"/.test(code));
  check("3b · and prints cents only when there are cents",
    /minimumFractionDigits:\s*c\s*%\s*100\s*\?\s*2\s*:\s*0/.test(code),
    "a fixed 2 here is the same defect in a different file");
}

// --- 4 · AND NOWHERE ELSE IN THE EDGE LAYER SPELLS A PRICE BY HAND ---------
//
// The three push-notification bodies that used `toFixed(2)` were the sites
// that made this a customer-visible split in the first place. This walks every
// function file and fails on a `toFixed(2)` sitting next to a dollar sign.
{
  const dir = new URL("../supabase/functions/", import.meta.url);
  const { readdir } = await import("node:fs/promises");
  const files = [];
  const walk = async (u) => {
    for (const e of await readdir(u, { withFileTypes: true })) {
      const child = new URL(e.name + (e.isDirectory() ? "/" : ""), u);
      if (e.isDirectory()) await walk(child);
      else if (/\.(ts|js)$/.test(e.name)) files.push(child);
    }
  };
  await walk(dir);
  check("4 · the walk actually read files", files.length > 30, `${files.length} files`);
  let hand = 0;
  for (const f of files) {
    const src = await readFile(f, "utf8");
    const code = src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
    for (const m of code.matchAll(/\$\$\{[^}]*toFixed\(2\)|\$\{[^}]*toFixed\(2\)[^}]*\}\s*\)?/g)) {
      // Only a `$` immediately before the interpolation is a price.
      if (/\$\$\{/.test(m[0])) { hand++; console.error(`FAIL  4 · hand-spelled price in ${f.pathname}: ${m[0]}`); }
    }
  }
  check("4 · no `$${…toFixed(2)}` anywhere in the edge layer", hand === 0, `${hand} found`);
}

console.log(process.exitCode
  ? `\nmoney-format: ${n} checks, some FAILED`
  : `\nmoney-format: ${n} checks pass, ${skipped} skipped`);
