// THE CUSTOMER EXPORT — ROADMAP 7.7, and Andrew's ruling in
// `docs/MANAGER-CLOSE-2026-09-21.md` § 2: *"Build the customer export. He
// considers it one button; it is now a build item, not a question."*
//
// **IT EXISTS BECAUSE THREE PUBLIC PAGES ALREADY PROMISED IT.** `/pricing`
// and the home page's answer to *"what happens to my customers if I cancel"*
// both say **"You export them and go"**; the terms say a copy is available
// **"by asking"**. The only download in the product was the accountant's CSV
// of jobs and expenses, which carries no customer list, no phone numbers and
// no addresses. **The promise came first and was unkept for the whole life of
// those pages.** This makes it true rather than making it quieter.
//
// **SEPARATE FROM `accountant-export.js` ON PURPOSE, and not out of tidiness.**
// That file is a money path with a tie-out test (`tests/money-export.test.mjs`)
// asserting its Amount column sums to the net figure printed on the screen it
// came from. This is a people path. Putting customer columns inside the file
// whose entire job is to add up is how that property quietly stops holding.
//
// ── THE ONE THING THAT WOULD HAVE MADE THIS A SUBSET ─────────────────────
// **IT MUST DO ITS OWN READ, AND THE CALLER MUST NOT HAND IT THE SCREEN.**
// `Clients.jsx` holds at most `ROW_CAP` — **200** — rows, and re-queries with
// a `name/phone ilike` filter whenever the search box has anything in it. An
// export built from what that screen is holding would hand a detailer with
// 400 customers **half their list**, and a detailer who had typed a search
// **their search results**, both without a word of warning. A file that looks
// complete and is not is worse than no file, because nobody checks a
// spreadsheet against a database.
//
// `exportedCustomerCount` below exists so the caller can print what it
// actually wrote rather than what it meant to write.
//
// ── WHAT IS AND IS NOT IN IT ─────────────────────────────────────────────
// The customer list with every field the row holds, plus the three figures
// the Clients screen computes from bookings — visits, spend and last visit —
// because a customer list that cannot answer *"who is my best customer"* is
// the subset the pages do not promise. **Photos are NOT in it**, and there is
// still no photo export anywhere in this product; `/pricing` promises those
// too and that half remains unkept. Said here rather than left to be
// discovered.

import { localDate } from "./format.js";
import { amount, q, slug } from "./accountant-export.js";

export const CUSTOMER_HEADER = [
  "Name", "Phone", "Email", "Address", "Notes",
  "First seen", "Jobs", "Spent", "Last visit", "Marketing email",
];

// The rows before they are text, so a test can assert the arithmetic without
// parsing CSV back out — the same reason `accountantRows` exists.
export function customerRows({ customers = [], totals = new Map(), timezone } = {}) {
  return customers.map((c) => {
    const t = totals.get(c.phone) ?? { visits: 0, spend: 0, last: null };
    return {
      name: c.name ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
      // The date the ROW was made, which is not the date of their first job —
      // `Clients.jsx` carries that same warning about `customers.created_at`.
      // The column is named "First seen" rather than "Customer since" so it
      // does not claim to be the other thing.
      firstSeen: c.created_at ? localDate(c.created_at, timezone) : "",
      visits: t.visits,
      spend: t.spend,
      // Blank, never a date-shaped zero: somebody who has booked and not yet
      // been is not somebody who came on 1 January 1970.
      last: t.last ?? "",
      // **THE OPT-OUT TRAVELS WITH THE LIST.** A detailer who exports this and
      // loads it into something else is the exact moment an unsubscribe gets
      // lost, and the person it gets lost for never finds out until they are
      // emailed again. One column costs nothing.
      marketing: c.unsubscribed_at ? "Opted out" : "Yes",
    };
  });
}

export function customersCsv(input) {
  const rows = customerRows(input);
  return [
    CUSTOMER_HEADER.join(","),
    ...rows.map((r) => [
      q(r.name), q(r.phone), q(r.email), q(r.address), q(r.notes),
      r.firstSeen, r.visits, amount(r.spend), r.last, r.marketing,
    ].join(",")),
  ].join("\r\n") + "\r\n";
}

/** What was actually written, for the caller to print. */
export const exportedCustomerCount = (input) => customerRows(input).length;

// The business name and the date in the FILENAME rather than a title row,
// for the reason `accountantFilename` records: a title row above the header
// is the thing that stops a CSV parsing as a CSV, and this file is going into
// somebody else's software.
export const customersFilename = (businessName, today = new Date()) =>
  `${slug(businessName) || "business"}-customers-${today.toISOString().slice(0, 10)}.csv`;
