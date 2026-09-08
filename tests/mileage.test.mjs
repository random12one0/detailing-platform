// ROADMAP 8.19 — A MILEAGE LOG PER JOB, AND "ON MY WAY" AS ONE TAP.
//
// Two small detailer-facing additions from his own answers (`docs/ideas.md`
// 06 and 07), and they share a file because they share a screen.
//
// ---------------------------------------------------------------------------
// WHAT THIS HOLDS THAT NOTHING ELSE CAN.
// ---------------------------------------------------------------------------
// **NULL IS NOT ZERO, AND THE WHOLE FEATURE TURNS ON IT.** A detailer who
// never logs a mile must not hand their accountant a column of noughts reading
// *"I drove nowhere all year"*, and 0 is a real answer — a drop-off at their
// own unit. Four places can collapse the two and every one of them is silent:
// the column's own check, the modal's state, what the modal SENDS, and the
// `!= null` guard on the record. § 1 and § 2 are those four.
//
// **AND MILES MUST NEVER BECOME MONEY.** `money-export` § 6-mi already holds
// the tie-out; what is here is the other half — that no screen adds it to a
// total. Multiplying miles by the IRS rate would be this product taking a tax
// position on somebody's behalf, and the drift would surface as an accountant
// asking why the file and the screen disagree.
//
// **THE "ON MY WAY" BUTTON IS A REAL LINK, AND THAT IS NOT A STYLE CHOICE.**
// A programmatic jump to `sms:` from the async continuation of a tap is the
// kind of thing a mobile browser blocks, and it would fail on the platform the
// feature is FOR. It is an `<a href="sms:">`, which is only possible because
// the templates load with the record. § 3.
//
//   node tests/mileage.test.mjs        (§ 1 and § 3 are credential-free)

import "./_env.mjs";           // root .env -> process.env, before anything reads it
import { readFileSync } from "node:fs";
import { accountantMiles, accountantRows } from "../app/src/lib/accountant-export.js";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const strip = (t) => t
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/^\s*--.*$/gm, "");

const MIG = strip(read("supabase/migrations/20260907006000_mileage.sql")).replace(/'[^']*'/g, "''");
const FIN = strip(read("app/src/components/FinalizeModal.jsx"));
const REC = strip(read("app/src/components/BookingDetail.jsx"));
const UPD = strip(read("supabase/functions/update-booking/index.ts"));
const EXP = strip(read("app/src/lib/accountant-export.js"));

// ─── 1. Null is not zero, in all four places it could be collapsed ────────
console.log("1. not logged and zero are different answers");
{
  check("1a · the column allows null and is whole miles",
    /add column if not exists miles integer/.test(MIG) && !/miles numeric/.test(MIG));
  // THE TYPO GUARD. The realistic failure is an ODOMETER READING typed into a
  // box asking for a trip; without a ceiling that one row is the year.
  check("1a-ii · and a ceiling stops an odometer reading becoming the year",
    /miles >= 0 and miles <= 2000/.test(MIG));

  // THE MODAL'S STATE IS A STRING. A number would collapse "" into 0 the
  // first time somebody cleared the box.
  check("1b · the field's state can be empty",
    /useState\(booking\.miles == null \? "" : String\(booking\.miles\)\)/.test(FIN));
  check("1b-ii · and empty is sent as null, not 0",
    /miles: miles\.trim\(\) === "" \? null : Math\.round\(Number\(miles\)\)/.test(FIN));

  // THE RECORD'S GUARD. `{booking.miles && …}` would hide exactly the zero
  // that is a real answer, and print every other row — silently.
  check("1c · the record tests for null, never for truthiness",
    /booking\.miles != null &&/.test(REC) && !/\{booking\.miles &&/.test(REC));

  // AND THE EXPORT. Blank for not-logged, 0 for zero.
  check("1d · the export writes blank for not-logged",
    /miles: b\.miles == null \? "" : Number\(b\.miles\)/.test(EXP));
}

// ─── 2. Miles are a record, never money ───────────────────────────────────
console.log("2. it is a tax record and not a total");
{
  check("2a · the edge function will accept the field at all", /"miles",/.test(UPD));

  // NO SCREEN MULTIPLIES IT. A rate anywhere in `app/src` is this product
  // deciding somebody's tax position.
  const IRS = /0\.6[0-9]|\bmileageRate\b|MILEAGE_RATE|miles\s*\*/;
  for (const [name, src] of [["the finalize modal", FIN], ["the record", REC], ["the export", EXP]]) {
    check(`2b · ${name} never multiplies miles by anything`, !IRS.test(src));
  }
  check("2b-ii · the check has subjects — all three files were read",
    FIN.length > 500 && REC.length > 500 && EXP.length > 500);

  // AND THE COLUMN SAYS SO OUT LOUD, so the next person to read the schema
  // does not have to infer it.
  check("2c · the column's comment says it is never money",
    /never money/i.test(read("supabase/migrations/20260907006000_mileage.sql")));

  // THE ARITHMETIC, run rather than read.
  const rows = accountantRows({
    jobs: [
      { booking_date: "2026-09-01", total_price: 100, miles: 24 },
      { booking_date: "2026-09-02", total_price: 100, miles: 0 },
      { booking_date: "2026-09-03", total_price: 100 },
    ],
    expenses: [{ date: "2026-09-02", amount: 50 }],
  });
  check("2d · only logged miles are totalled", accountantMiles(rows) === 24,
    String(accountantMiles(rows)));
  check("2d-ii · a real zero is kept as 0, not turned into blank",
    rows.some((r) => r.miles === 0));
  check("2d-iii · and an unlogged job stays blank",
    rows.filter((r) => r.miles === "").length === 2);
}

// ─── 3. "On my way" in one tap ────────────────────────────────────────────
console.log("3. one tap, the detailer's own words, and only where it applies");
{
  // A REAL LINK. A fetch-then-navigate would be blocked by the very browsers
  // this feature exists for.
  check("3a · the button is an anchor with an sms: href",
    /<a className="btn sm" data-on-my-way="" href=\{smsHref\(filled\(onMyWay\.body\)\)\}>/.test(REC));

  // WHICH IS ONLY POSSIBLE BECAUSE THE TEMPLATES LOAD WITH THE RECORD.
  check("3a-ii · the templates load on mount rather than on the picker",
    /useEffect\(\(\) => \{[\s\S]{0,400}from\("message_templates"\)/.test(REC));
  check("3a-iii · so opening the picker is no longer a round trip",
    /const openTextPicker = \(\) => setPickingText\(true\)/.test(REC));

  // THE DETAILER'S OWN WORDING. Falling back to the shipped default would
  // send a customer a sentence the detailer thinks they replaced.
  // The callback parameter is NOT pinned to a name — roadmap 8.17 renamed it
  // `t`->`x` because `t` is the translator now, and this went red on a change
  // that took nothing away. The back-reference is what keeps it honest: the
  // row it tests has to be the row it found.
  check("3b · it uses the row, never DEFAULT_TEMPLATES",
    /templates\.find\(\((\w+)\) => \1\.key === "on_my_way"\)/.test(REC)
    && !/DEFAULT_TEMPLATES/.test(REC));
  check("3b-ii · and it is not drawn until that row is in hand",
    /\{onMyWay &&/.test(REC));

  // ONLY WHERE THE SENTENCE IS TRUE. On a drop-off the customer comes to the
  // detailer, so "I'm on my way" is the wrong thing to send.
  // **SCOPED TO THE BUTTON'S OWN GUARD, BECAUSE THE FILE-WIDE VERSION WAS
  // VACUOUS.** `service_type === "mobile"` appears three times in this record
  // for unrelated reasons, so the first version of this check passed with the
  // whole condition deleted — baselining caught it, reading it did not. It
  // reads the one expression that gates the anchor now.
  const guard = REC.slice(REC.indexOf("{onMyWay"), REC.indexOf("data-on-my-way"));
  check("3c · the check has a subject — the button's guard was found",
    guard.length > 10 && guard.length < 400, `${guard.length} chars`);
  check("3c-ii · not on a drop-off job", /service_type === "mobile"/.test(guard));
  check("3c-iii · and not without a number to send it to",
    /customer_phone/.test(guard));

  // THE PRESET ITSELF STILL EXISTS. This whole item is "put the EXISTING
  // preset on a button" — a check that passes with the preset renamed would
  // be testing a button that opens an empty message.
  const T = read("app/src/lib/templates.js");
  check("3d · the on_my_way preset is still there to be found",
    /key: "on_my_way"/.test(T) && /I'm on my way/.test(T));
}

// ─── 4. The database, asked rather than read ──────────────────────────────
console.log("4. what the column actually refuses");
if (!URL_ || !SERVICE) {
  console.log("  SKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
} else {
  const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
  const rest = (p, init = {}) =>
    fetch(`${URL_}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const [biz] = await rest("businesses?slug=eq.demo-detail&select=id").then((r) => r.json());
  const [row] = await rest(
    `bookings?business_id=eq.${biz?.id}&deleted_at=is.null&select=id,miles&limit=1`,
  ).then((r) => r.json());
  check("4a · the check has a subject — a demo booking was found", !!row?.id);
  if (row?.id) {
    const before = row.miles;
    const set = (v) => rest(`bookings?id=eq.${row.id}`, {
      method: "PATCH", body: JSON.stringify({ miles: v }),
    }).then((r) => r.status);
    try {
      check("4b · a sensible trip is accepted", await set(37) < 300);
      const [after] = await rest(`bookings?id=eq.${row.id}&select=miles`).then((r) => r.json());
      check("4b-ii · and stored as a whole number", after?.miles === 37);
      check("4c · zero is accepted, because it is a real answer", await set(0) < 300);
      check("4d · null is accepted, because not logged is not zero", await set(null) < 300);
      // THE ONE THAT MATTERS: an odometer reading.
      check("4e · an odometer reading is refused", await set(187432) >= 400);
      check("4e-ii · and so is a negative", await set(-5) >= 400);
    } finally {
      await rest(`bookings?id=eq.${row.id}`, {
        method: "PATCH", body: JSON.stringify({ miles: before ?? null }),
      });
      const [back] = await rest(`bookings?id=eq.${row.id}&select=miles`).then((r) => r.json());
      check("4f · the demo booking is put back as it was",
        (back?.miles ?? null) === (before ?? null));
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
