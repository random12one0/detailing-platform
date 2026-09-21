// THE CUSTOMER EXPORT — ROADMAP 7.7.
//
// The file a detailer is promised on three public pages and can now actually
// take away. It is not a money path, so it does not get `money-export`'s
// tie-out; what it gets instead is the two checks that matter for a file
// going into somebody else's spreadsheet: **every row has the same number of
// columns as the header**, and **a value containing a comma, a quote or a
// newline does not blow the row apart**. A customer list is free text typed
// by whoever answered the phone, so those are not hypothetical.
//
// **IT EXITS NON-ZERO FROM ITS FIRST LINE.** `tests/admin-insight.test.mjs`
// printed FAIL and exited 0 from the day it was written until 2026-09-21 —
// 57 checks that could not turn a run red. That is not being repeated here.
//
//   node tests/customer-export.test.mjs      (credential-free)

import {
  CUSTOMER_HEADER, customerRows, customersCsv, customersFilename,
} from "../app/src/lib/customer-export.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};

const TZ = "America/Los_Angeles";
const cust = (o) => ({
  name: "Marcus Webb", phone: "555-0100", email: "m@example.com",
  address: "12 Ash St", notes: "", created_at: "2026-03-04T18:00:00Z",
  unsubscribed_at: null, ...o,
});

// ─── 1 · the shape of the file ────────────────────────────────────────────
console.log("\n1. the shape of the file");
{
  const input = {
    customers: [cust({}), cust({ name: "Ann", phone: "555-0200" })],
    totals: new Map([["555-0100", { visits: 3, spend: 540.5, last: "2026-09-01" }]]),
    timezone: TZ,
  };
  const lines = customersCsv(input).trim().split("\r\n");
  check("1a · a header and one line per customer", lines.length === 3, `got ${lines.length}`);
  check("1b · CRLF, and a trailing newline", customersCsv(input).endsWith("\r\n"));
  // THE ONE THAT CATCHES A DROPPED FIELD. Adding a header without adding the
  // cell, or the reverse, shifts every column right of it in a file nobody
  // reads against the screen.
  const width = CUSTOMER_HEADER.length;
  check(`1c · every row has ${width} columns, same as the header`,
    lines.every((l) => splitCsv(l).length === width),
    lines.map((l) => splitCsv(l).length).join(", "));
}

// ─── 2 · free text does not blow the row apart ────────────────────────────
// A name with a comma in it, a note with a quote in it, an address with a
// newline in it. All three are what a real list looks like.
console.log("\n2. free text");
{
  const input = {
    customers: [cust({
      name: 'Webb, Marcus "Sonny"',
      address: "12 Ash St\nApt 4",
      notes: 'Said "no wax", gate code 1,2,3',
    })],
    totals: new Map(),
    timezone: TZ,
  };
  const csv = customersCsv(input);
  const cells = splitCsv(csv.trim().split("\r\n").slice(1).join("\r\n"));
  check("2a · still the right number of columns", cells.length === CUSTOMER_HEADER.length,
    `got ${cells.length}`);
  check("2b · the comma and the quotes survive intact",
    cells[0] === 'Webb, Marcus "Sonny"', cells[0]);
  check("2c · and so does an embedded newline",
    cells[3] === "12 Ash St\nApt 4", JSON.stringify(cells[3]));
}

// ─── 3 · somebody who has never been in ───────────────────────────────────
// **NOT A DATE-SHAPED ZERO.** A blank last visit and 1 January 1970 are
// opposite facts, and the second one is the kind a spreadsheet sorts to the
// top and a detailer acts on.
console.log("\n3. a customer with no completed job");
{
  const [r] = customerRows({ customers: [cust({})], totals: new Map(), timezone: TZ });
  check("3a · no visits", r.visits === 0);
  check("3b · no spend", r.spend === 0);
  check("3c · last visit is BLANK, not a date", r.last === "", JSON.stringify(r.last));
  const cells = splitCsv(customersCsv({ customers: [cust({})], totals: new Map(), timezone: TZ })
    .trim().split("\r\n")[1]);
  check("3d · and it prints as an empty cell", cells[8] === "", JSON.stringify(cells[8]));
}

// ─── 4 · the opt-out travels with the list ────────────────────────────────
// The moment an unsubscribe gets lost is the moment a list is moved into
// something else, and the person it is lost for never finds out until they
// are emailed again.
console.log("\n4. the opt-out");
{
  const rows = customerRows({
    customers: [cust({}), cust({ phone: "555-0300", unsubscribed_at: "2026-08-01T00:00:00Z" })],
    totals: new Map(), timezone: TZ,
  });
  check("4a · a normal customer is mailable", rows[0].marketing === "Yes");
  check("4b · an opted-out one says so", rows[1].marketing === "Opted out", rows[1].marketing);
}

// ─── 5 · the figures are joined on PHONE ──────────────────────────────────
// `summarise()` keys its map by `customer_phone`, which is what `bookings`
// carries; joining on anything else here silently produces a list where
// everybody has been in zero times.
console.log("\n5. the join");
{
  const [r] = customerRows({
    customers: [cust({ phone: "555-0100" })],
    totals: new Map([["555-0100", { visits: 7, spend: 1234.56, last: "2026-09-19" }]]),
    timezone: TZ,
  });
  check("5a · visits come through", r.visits === 7);
  check("5b · spend comes through", r.spend === 1234.56);
  check("5c · last visit comes through", r.last === "2026-09-19");
  const cells = splitCsv(customersCsv({
    customers: [cust({ phone: "555-0100" })],
    totals: new Map([["555-0100", { visits: 7, spend: 1234.5, last: "2026-09-19" }]]),
    timezone: TZ,
  }).trim().split("\r\n")[1]);
  check("5d · and spend prints to two places, with no currency symbol",
    cells[7] === "1234.50", cells[7]);
}

// ─── 6 · the filename ─────────────────────────────────────────────────────
console.log("\n6. the filename");
{
  const n = customersFilename("Coastline Auto Detailing!", new Date("2026-09-21T12:00:00Z"));
  check("6a · slugged, dated, .csv", n === "coastline-auto-detailing-customers-2026-09-21.csv", n);
  check("6b · a business with no usable name still gets a file",
    customersFilename("", new Date("2026-09-21T12:00:00Z"))
      === "business-customers-2026-09-21.csv");
}

// A CSV reader small enough to trust, because parsing the file back out is
// the only way to prove the escaping worked — asserting on the raw string
// would just be re-stating the code.
function splitCsv(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
