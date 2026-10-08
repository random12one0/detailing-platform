// ROADMAP 2.15a — THE SERVER REFUSES AN OVER-LONG TENANT NAME, IN WORDS, BEFORE THE DATABASE DOES.
//
//   node --test tests/name-length.test.mjs
//   Credential-free. Imports one module and RUNS it, plus four source reads.
//
// ---------------------------------------------------------------------------
// WHAT IT IS FOR
// ---------------------------------------------------------------------------
// `20261007010000_tenant_string_lengths.sql` bounds five name columns at 60. A violated CHECK is
// Postgres `23514`, which Supabase hands back naming the constraint — so without a server-side
// refusal the sentence a detailer meets at signup is
// *"new row for relation \"businesses\" violates check constraint \"businesses_name_len\""*.
// `_shared/nameLimit.js` is the words; this file is the proof that the words are reached.
//
// ---------------------------------------------------------------------------
// AND IT IS ABOUT ONE WRITER, WHICH IS A FINDING RATHER THAN A SMALL SCOPE
// ---------------------------------------------------------------------------
// `grep -rn 'from("businesses")' supabase/functions` with its following line shows **exactly one
// `insert`** — `_shared/newBusiness.ts` — reached by both ways a business can exist
// (`create-business` at signup, `platform-admin`'s `create` in the back office). **The other four
// names in 2.15a are written straight from the browser** (`Catalog.jsx:247/248/266/267/289/290`,
// `Plans.jsx:211/212`) under RLS, with no edge function anywhere in the path. There is no server
// sentence to add for those without routing catalog writes through a function, which is a much
// larger change and is not this item's. § 4 asserts that split so it cannot drift quietly.
//
// ---------------------------------------------------------------------------
// THE SABOTAGES RUN A MUTATED COPY OF THE REAL MODULE, NOT A COPY OF ITS RULE
// ---------------------------------------------------------------------------
// `docs/gotchas.md` 95: a canary aimed at a copy of the logic proves nothing about the logic.
// § 7 reads the module's own source, changes one expression, and imports the result from a
// `data:` URL — so the thing executed is production code with a defect in it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkName, NAME_MAX } from "../supabase/functions/_shared/nameLimit.js";

const MODULE = "supabase/functions/_shared/nameLimit.js";
const WRITER = "supabase/functions/_shared/newBusiness.ts";
const CALLERS = ["supabase/functions/create-business/index.ts", "supabase/functions/platform-admin/index.ts"];
const MIGRATION = "supabase/migrations/20261007010000_tenant_string_lengths.sql";
const read = (p) => readFileSync(p, "utf8");
const letters = (n, ch = "a") => ch.repeat(n);

test("ROADMAP 2.15a — a name over the cap is refused in words, by the server", async (t) => {
  await t.test("1 · sixty in, sixty-one out, and the refusal names the number", () => {
    assert.equal(NAME_MAX, 60);
    assert.deepEqual(checkName(letters(60)), { ok: true, value: letters(60) });
    const no = checkName(letters(61));
    assert.equal(no.ok, false);
    assert.match(no.error, /at most 60 characters/,
      "“too long” leaves a person deleting characters one at a time to find out how many");
    assert.doesNotMatch(no.error, /char_length|businesses_name_len|23514|null|undefined/,
      "a refusal is read by a detailer: no column, no constraint, no SQL state");
  });

  await t.test("2 · it trims first, because the trimmed value is what gets stored", () => {
    const r = checkName(`   ${letters(60)}   `);
    assert.equal(r.ok, true, "sixty characters with whitespace round them must still fit");
    assert.equal(r.value, letters(60), "the caller stores THIS value, so trimming is part of the decision");
    assert.equal(checkName("   ").ok, false, "whitespace is not a name");
    assert.equal(checkName("").ok, false);
    assert.equal(checkName(null).ok, false);
    assert.equal(checkName(undefined).ok, false);
    assert.match(checkName(null).error, /required/);
  });

  await t.test("3 · CODE POINTS, NOT `.length` — the server must never be stricter than the column", () => {
    // `char_length` counts characters. `.length` counts UTF-16 units, and an emoji is two of them.
    // A 60-UNIT name is 30 characters: the database would store it, so the server must accept it.
    // FORTY, not thirty. Thirty is 60 UTF-16 units exactly, and `> 60` lets 60 through — so a
    // sabotage aimed at this rule passed against a correct-looking fixture that could not bite.
    // Forty is 80 units and 40 characters: the column accepts it, a `.length` server refuses it.
    const emoji = "\u{1F697}".repeat(40);
    assert.equal(emoji.length, 80, "the fixture is not what this case claims");
    assert.equal([...emoji].length, 40);
    assert.equal(checkName(emoji).ok, true,
      "the server refused a name the column would have accepted — a refusal with no authority behind it");
    // And the bilingual case, which is the one that actually happens.
    const spanish = "á".repeat(60);
    assert.equal(checkName(spanish).ok, true, "sixty accented characters are sixty characters");
    assert.equal(checkName("Detallado Rápido de Automóviles").ok, true);
    // 61 code points is still 61, accents or not.
    assert.equal(checkName("á".repeat(61)).ok, false);
  });

  await t.test("4 · SOURCE — one insert, both callers through it, and the guard before it", () => {
    const writer = read(WRITER);
    const guard = writer.indexOf("checkName(input.name)");
    const insert = writer.indexOf('.insert({');
    assert.ok(guard > 0, "newBusiness.ts must call checkName");
    assert.ok(insert > guard, "the guard must run BEFORE the insert, or the database answers first");
    for (const c of CALLERS) {
      const src = read(c);
      assert.match(src, /createBusinessRow\(/, `${c} must create a business through the shared function`);
      assert.doesNotMatch(src, /from\("businesses"\)\s*\n?\s*\.insert\(/,
        `${c} inserts into businesses directly, which walks around the guard`);
    }
  });

  await t.test("5 · the module, the column and the five capped boxes all say 60", () => {
    const sql = read(MIGRATION);
    const bounds = [...sql.matchAll(/char_length\(name\) between 1 and (\d+)/g)].map((m) => Number(m[1]));
    assert.equal(bounds.length, 5, `expected five bounded columns, found ${bounds.length}`);
    for (const b of bounds) {
      assert.equal(b, NAME_MAX, "the column and the server disagree, so one of them is unreachable");
    }
    // THE BOXES, PINNED BY THEIR OWN TEXT. An earlier version of this case asserted that NO
    // `maxLength` in these files was anything but 60, and went red on `maxLength={4}` — the
    // "Detailing since" year box at `BusinessInfo.jsx:292`, which is correct and has nothing to do
    // with names. **A check that fails on a legitimate neighbour is a check somebody switches off.**
    const CAPPED = [
      ["app/src/screens/more/Plans.jsx", "value={planForm.name} maxLength={60}"],
      ["app/src/screens/more/Catalog.jsx", "value={editing.form.name} maxLength={60}"],
      ["app/src/screens/more/BusinessInfo.jsx", "value={biz.name} maxLength={60}"],
    ];
    for (const [f, snippet] of CAPPED) {
      assert.ok(read(f).includes(snippet),
        `${f} no longer caps its name box at ${NAME_MAX} (looked for: ${snippet}). The box, the `
        + "server and the column have to agree, and this is the box half");
    }
    // Catalog.jsx holds TWO of them in one shared editor: groups, and services/add-ons.
    assert.equal(
      [...read("app/src/screens/more/Catalog.jsx").matchAll(/value=\{editing\.form\.name\} maxLength=\{60\}/g)].length,
      2, "Catalog.jsx should carry the cap on both of its name editors");
    // AND THE TWO THAT HAVE NONE: printed, not failed. Adding them is Lane A's file and 2.15a
    // specifies them; a guard that skips must say so rather than going quiet.
    for (const f of ["app/src/screens/CreateBusiness.jsx", "app/src/admin/AdminPage.jsx"]) {
      // THE WHOLE ELEMENT, NOT THE TEXT AFTER `value=`. The first version read forward from
      // `value={name}` to the next `>`, and `AdminPage.jsx:990` writes `maxLength` BEFORE `value`,
      // so it reported a capped box as NOT CAPPED - a false negative that reads exactly like the
      // gap it was written to watch. Caught 2026-10-08 when Lane A capped it and this still said
      // otherwise.
      const box = read(f).split("<input").map((c) => "<input" + c.split(">")[0])
        .find((c) => /value=\{(?:form\.)?name\}/.test(c));
      assert.ok(box, `${f}: the business-name input was not found at all, so this gap is unmeasured`);
      const cap = box.match(/maxLength=\{(\d+)\}/);
      if (!cap) console.error(`  NOT CAPPED (expected — specified for Lane A under 2.15a): ${f}`);
      else assert.equal(Number(cap[1]), NAME_MAX, `${f} caps its name box at ${cap[1]}, not ${NAME_MAX}`);
    }
  });

  await t.test("6 · SOURCE — the module is plain .js so this file can run it, and reads nothing", () => {
    const mod = read(MODULE);
    assert.doesNotMatch(mod, /^import /m, "it must stay dependency-free: a node test imports it directly");
    assert.doesNotMatch(mod, /Deno\.|fetch\(|createClient/, "no runtime, no network, no client");
    assert.match(mod, /\[\.\.\.value\]\.length/, "the code-point count is the rule § 3 is about");
  });

  // ── BROKEN ON PURPOSE: FOUR, ONE PER PATH ──────────────────────────────
  // The first runs a mutated copy of the REAL module. The other three mutate the REAL callers'
  // text. Each asserts the source changed before its verdict is believed.
  const mutate = (src, from, to) => {
    const out = src.replace(from, to);
    assert.notEqual(out, src, `the sabotage did not apply: ${from}`);
    return out;
  };

  await t.test("7 · `.length` instead of code points refuses a name the column would accept", async () => {
    const broken = mutate(read(MODULE), "[...value].length", "value.length");
    const url = "data:text/javascript," + encodeURIComponent(broken);
    const { checkName: brokenCheck } = await import(url);
    const emoji = "\u{1F697}".repeat(40); // 80 UTF-16 units, 40 characters — see § 3
    assert.equal(brokenCheck(emoji).ok, false,
      "the UTF-16 count accepted it, so this sabotage proves nothing about § 3");
    // AND THE TELL: it is right about every ASCII name, which is every name in the live database.
    assert.equal(brokenCheck(letters(60)).ok, true);
    assert.equal(brokenCheck(letters(61)).ok, false);
  });

  await t.test("8 · the guard removed from the writer is seen", () => {
    const broken = mutate(read(WRITER), "const checked = checkName(input.name);", "const checked = { ok: true, value: String(input.name || \"\").trim() };");
    assert.equal(broken.includes("checkName(input.name)"), false, "the writer still calls the guard");
  });

  for (const c of CALLERS) {
    await t.test(`9 · ${c.split("/")[2]} inserting a name directly is seen`, () => {
      const broken = mutate(read(c), "createBusinessRow(", 'supabase.from("businesses")\n        .insert(');
      assert.match(broken, /from\("businesses"\)\s*\n?\s*\.insert\(/,
        "the sabotage did not produce a direct insert, so § 4's second half is untested");
      assert.doesNotMatch(broken, /createBusinessRow\(/,
        "the caller still reaches the shared function, so the sabotage is not a bypass");
    });
  }
});
