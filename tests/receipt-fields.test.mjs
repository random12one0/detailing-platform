// ROADMAP 14.1 — WHAT THE PUBLIC RECEIPT IS ALLOWED TO CONTAIN.
//
// `get-booking-receipt` is reachable with no key at all: the booking's own
// unguessable uuid is the credential, because the customer reads this page
// from a link in their email and has no account. It selected `*`, so the
// anonymous answer carried the whole booking row — including `admin_notes`,
// which `app/src/components/BookingDetail.jsx:475` prints to the business
// under the label **"Private:"**.
//
// ---------------------------------------------------------------------------
// THIS ASSERTS THE LIST, NOT THE ABSENCE OF ONE NAME
// ---------------------------------------------------------------------------
// A check that says `admin_notes` is gone passes on the day somebody adds
// `internal_flag`. So the unit of measurement here is **every column the
// `bookings` table has**, and each one is a target: it is either in the
// allow-list, or it must not appear in the anonymous answer at all. Add a
// column to the table tomorrow and this check grows a target by itself.
//
// The allow-list below is also held to a second rule: every name in it must be
// drawn by the customer's own page. A field nobody renders has no business
// being sent to a stranger, however harmless it looks.
//
//   node tests/receipt-fields.test.mjs
//   node scripts/receipt.mjs receipts/receipt-fields.json
//
// § 1 and § 2 are credential-free. § 3 needs the root `.env` and prints
// SKIPPED, loudly and by name, when it cannot run — and writes NO receipt,
// because a receipt for a run that probed nothing is the exact lie
// `scripts/receipt.mjs` exists to stop.

import "./_env.mjs";           // root .env -> process.env, before anything reads it

import { readFileSync } from "node:fs";
import { writeReceipt } from "../scripts/receipt.mjs";

const started_at = new Date().toISOString();
const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const FN = "supabase/functions/get-booking-receipt/index.ts";
const PAGE = "app/src/book/ManageBookingPage.jsx";

let passed = 0;
const failures = [];
let assertions = 0;
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failures.push(`${name} ${detail}`.trim()); console.error(`  FAIL  ${name} ${detail}`); }
};

// THE LIST, WRITTEN OUT HERE AND NOT IMPORTED. The endpoint is Deno and this
// is Node, so the two copies are independent on purpose: widening the
// endpoint's list without coming here is the change that has to be visible.
const ALLOWED = [
  "id",
  "status",
  "service_type",
  "start_at",
  "end_at",
  "customer_name",
  "customer_phone",
  "customer_email",
  "customer_address",
  // **ROADMAP 14.14, added here 2026-09-24. The ENDPOINT was right and this
  // list was stale** — `address_source` arrived with ROADMAP 2.8 and nobody
  // came here. It is public for a stated reason rather than because it turned
  // up in a reply: `app/src/book/ManageBookingPage.jsx:438` renders
  // `booking.address_source === "typed"` to print *"You typed this address in
  // and our lookup had no match for it. If it's right, there's nothing to do."*
  // beside the address, and it cannot draw that without being sent the column.
  // It is the customer's own address on the customer's own booking, so there is
  // nothing here private from the reader. **Its position is not cosmetic:** § 1
  // compares name for name AND IN ORDER, so this sits where the endpoint's own
  // `BOOKING_COLUMNS` puts it — between `customer_address` and
  // `customer_notes`. `tests/address-source.test.mjs` guards the column's two
  // values separately.
  "address_source",
  "customer_notes",
  "vehicle_model",
  "vehicle_size_label",
  "vehicle_size_fee",
  "vehicle_condition",
  "subtotal",
  "total_price",
  "final_amount",
  "travel_fee",
  "travel_zone",
  "price_adjustments",
  "promo_discount",
  "applied_promo_code",
  "quoted_amount",
  "quoted_note",
  "quoted_at",
  "services",
  "add_ons",
  "vehicles",
  "booking_date",
  "start_time",
  "end_time",
];

/**
 * **WHY THIRTY-TWO, AND NOT "WHATEVER THE ENDPOINT RETURNS TODAY" — the whole
 * point of ROADMAP 14.14.**
 *
 * This file was RED at committed `HEAD` from 2026-09-23 to 2026-09-24 because
 * the endpoint returned 32 names and this list held 31. **The obvious fix was
 * to change 31 to 32, and it was refused:** a list edited to match whatever the
 * endpoint currently sends is a list that can never again report a column
 * appearing or disappearing, which is the only thing it exists to do. So the
 * side that was wrong was established first — the endpoint is right,
 * `address_source` is drawn by the customer's own page — and then the number
 * was given a reason.
 *
 * **The composition, declared rather than counted from a run:** the public
 * reply is `BOOKING_COLUMNS` (26 columns of the booking row, each one named on
 * purpose) + `EMBEDDED` (3 joined lists: services, add-ons, vehicles) +
 * `DERIVED` (3 the server computes in the business's timezone: booking_date,
 * start_time, end_time). **26 + 3 + 3 = 32.**
 *
 * A thirty-third field therefore cannot arrive quietly. It has to be added to
 * the endpoint, added here in the same position, rendered by
 * `ManageBookingPage.jsx` so § 2 passes, and **counted into the three sizes
 * below** — four places, in two languages, across two directories. That
 * friction is deliberate and it is what `SERVER_ONLY_COLUMNS` exists beside.
 */
const EXPECTED_PUBLIC_FIELDS = 32;
const EXPECTED_SHAPE = { BOOKING_COLUMNS: 26, EMBEDDED: 3, DERIVED: 3 };

/** The comparator every verdict in § 3 and the canary both go through. */
const offenders = (bookingKeys) => bookingKeys.filter((k) => !ALLOWED.includes(k));

// ---------------------------------------------------------------------------
console.log("\n§ 1 — the endpoint's own list is the list this file knows about");
{
  const src = read(FN);
  const arrayNamed = (name) => {
    const m = new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(src);
    return m ? [...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]) : null;
  };
  const columns = arrayNamed("BOOKING_COLUMNS");
  const embedded = arrayNamed("EMBEDDED");
  const derived = arrayNamed("DERIVED");
  check("the three arrays that make up the public list are all present",
    !!(columns && embedded && derived),
    `columns=${columns?.length} embedded=${embedded?.length} derived=${derived?.length}`);

  // **THE DECLARED SHAPE, CHECKED BEFORE THE LISTS ARE COMPARED.** Without
  // this, the two lists agreeing at 31 or at 33 would read exactly like the two
  // lists agreeing at 32 — which is how this file came to be red for a day over
  // a column that should have been in it. The sizes are written down, so a
  // field added to one array and mirrored here still has to move a number
  // somebody has to justify.
  for (const [name, want] of Object.entries(EXPECTED_SHAPE)) {
    const got = { BOOKING_COLUMNS: columns, EMBEDDED: embedded, DERIVED: derived }[name];
    check(`the endpoint's \`${name}\` still holds ${want} name(s)`, got?.length === want,
      `it holds ${got?.length} — if this is intended, change EXPECTED_SHAPE and say why`);
  }
  check(`this file expects ${EXPECTED_PUBLIC_FIELDS} public fields and lists that many`,
    ALLOWED.length === EXPECTED_PUBLIC_FIELDS,
    `ALLOWED holds ${ALLOWED.length} — the declared total and the list disagree`);

  const theirs = [...(columns ?? []), ...(embedded ?? []), ...(derived ?? [])];
  // **AND IT SAYS WHERE THEY DIVERGE, not just that they do — found 2026-09-24
  // by sabotage.** Moving one name to a different position while keeping all 32
  // went red correctly and reported *"endpoint has 32, this file expects 32:
  // only there [], only here []"* — both counts equal and both set differences
  // empty, because the fault was ORDER and a set difference cannot see order. A
  // check that goes red without saying what is wrong sends the next person
  // looking for a missing column that is not missing.
  const firstDivergence = () => {
    const n = Math.max(theirs.length, ALLOWED.length);
    for (let i = 0; i < n; i++) {
      if (theirs[i] !== ALLOWED[i]) {
        return `first difference at position ${i}: endpoint has `
          + `${JSON.stringify(theirs[i] ?? null)}, this file has ${JSON.stringify(ALLOWED[i] ?? null)}`;
      }
    }
    return "no positional difference";
  };
  check("the endpoint's list matches this file's, name for name and in order",
    JSON.stringify(theirs) === JSON.stringify(ALLOWED),
    `endpoint has ${theirs.length}, this file expects ${ALLOWED.length}: `
    + `only there [${theirs.filter((k) => !ALLOWED.includes(k))}], `
    + `only here [${ALLOWED.filter((k) => !theirs.includes(k))}] — ${firstDivergence()}`);

  // THE TWO WAYS THE WHOLE ROW GOT OUT, BOTH SHUT. A narrowed select still
  // leaks if the reply spreads the row, because the select has to keep three
  // columns the server itself needs.
  const selectBody = (/const BOOKING_SELECT = `([\s\S]*?)`;/.exec(src) ?? [])[1] ?? "";
  check("the select names its columns and no longer asks for `*`",
    selectBody.length > 0 && !selectBody.includes("*"), JSON.stringify(selectBody.slice(0, 80)));
  check("the reply is built from the list rather than spread from the row",
    !/\.\.\.booking,/.test(src), "`...booking` is back in the reply");

  // THE THREE THE SERVER READS AND MUST NEVER SEND. Naming them here means
  // moving one into the public list is a two-file change, not a typo.
  for (const k of ["business_id", "booking_group_id", "payment_status"]) {
    check(`\`${k}\` is selected for the server and kept out of the public list`,
      new RegExp(`SERVER_ONLY_COLUMNS = \\[[^\\]]*"${k}"`).test(src) && !ALLOWED.includes(k));
  }
}

// ---------------------------------------------------------------------------
console.log("\n§ 2 — every allowed name is something the customer's page draws");
{
  const page = read(PAGE);
  for (const field of ALLOWED) {
    check(`the page renders \`${field}\``,
      new RegExp(`booking\\.${field}\\b`).test(page),
      "nothing renders it, so a stranger has no reason to receive it");
  }
}

// ---------------------------------------------------------------------------
console.log("\n§ 3 — the deployed endpoint, called anonymously with no key");

let discovered = 0, attempted = 0, completed = 0;
const probed = [];
const canary = { id: "admin_notes-added-back-to-a-real-reply", observed_failure: false };

if (!URL_ || !SERVICE) {
  console.log("  SKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.");
  console.log("  NOTHING in § 3 ran, and NO receipt was written. This is not a pass.");
} else {
  const svc = async (path) => (await fetch(URL_ + path, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  })).json();

  // The rows worth probing are the ones carrying a real private note, so a
  // clean answer means the note was withheld and not that there was none.
  const rows = await svc(
    "/rest/v1/bookings?select=*&admin_notes=not.is.null&deleted_at=is.null&limit=3",
  );
  const haveRows = Array.isArray(rows) && rows.length > 0;
  check("there is at least one booking carrying a private note to probe",
    haveRows, "no row has admin_notes, so a clean receipt would prove nothing");

  if (haveRows) {
    // EVERY COLUMN IS A TARGET. Read off a real row, so a migration that adds
    // a column adds a target here without anybody editing this file.
    const columns = Object.keys(rows[0]);
    discovered = columns.length;
    check("the booking row has the number of columns a real table has",
      discovered >= 40, `only ${discovered} columns came back`);

    for (const row of rows) {
      // NO `apikey` HEADER AT ALL. This is the whole point: the uuid is the
      // only credential, so the request carries nothing else.
      const res = await fetch(`${URL_}/functions/v1/get-booking-receipt?id=${row.id}`);
      const body = await res.json().catch(() => null);
      check(`${row.id.slice(0, 8)} — the receipt still answers 200`, res.status === 200, `${res.status}`);
      check(`${row.id.slice(0, 8)} — and it is really this booking`,
        body?.booking?.id === row.id, JSON.stringify(body).slice(0, 160));

      const keys = Object.keys(body?.booking ?? {});
      const extra = offenders(keys);
      const missing = ALLOWED.filter((k) => !keys.includes(k));
      check(`${row.id.slice(0, 8)} — the reply carries nothing outside the list`,
        extra.length === 0, `sent as well: ${extra.join(", ")}`);
      check(`${row.id.slice(0, 8)} — and carries every name on it`,
        missing.length === 0, `never arrived: ${missing.join(", ")}`);
      check(`${row.id.slice(0, 8)} — the private note's own text is nowhere in the reply`,
        !JSON.stringify(body).includes(row.admin_notes), `"${row.admin_notes}" came back`);
      probed.push({ id: row.id, keys: keys.length, extra, missing });
    }
    attempted = discovered;
    completed = discovered;

    // THE NEGATIVE CONTROL. Take the last real reply, put `admin_notes` back
    // into it, and run the same comparator. If it still reports clean, every
    // green line above is worthless.
    const doctored = [...Object.keys(rows.at(-1)).filter((k) => ALLOWED.includes(k)), "admin_notes"];
    canary.observed_failure = offenders(doctored).length > 0;
    canary.reported = offenders(doctored);
    check("the canary — a reply with `admin_notes` put back is caught",
      canary.observed_failure, "the comparator cannot see the field it exists to catch");
  }
}

// ---------------------------------------------------------------------------
const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions.`);

if (URL_ && SERVICE && discovered > 0) {
  const { path } = writeReceipt({
    check_id: "receipt-fields",
    started_at,
    status: failed ? "fail" : "pass",
    expected_targets: discovered,
    discovered_targets: discovered,
    attempted_targets: attempted,
    completed_targets: completed,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: ALLOWED.length + 8,
    failures,
    dimensions: { endpoint: "get-booking-receipt", auth: "none", bookings_probed: probed.length },
    artifacts: ["artifacts/receipt-fields"],
    canary,
  });
  console.log(`receipt: ${path}`);
} else {
  console.log("no receipt written — § 3 did not run.");
}

process.exit(failed ? 1 : 0);
