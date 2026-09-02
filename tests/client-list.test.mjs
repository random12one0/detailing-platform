// The Clients list's arithmetic.
//
// Roadmap 2.11 step 6, stage 5. Three of the four things in
// app/src/lib/client-list.js decide something a person then acts on — what a
// screen prints as the last time somebody was in, which customers count as
// "gone", and who ends up on the end of a group text — and until stage 5 all
// of it lived inside a React component where nothing could reach it.
//
// PART B ROW 6 IS THE REASON THIS FILE EXISTS: "last visit" could print a
// FUTURE date, because it read the newest row of a history without asking
// whether the job had happened. Test 1 is that defect, baselined.
//
// Credential-free, no dev server, no browser.
//
//   node tests/client-list.test.mjs

import {
  LAPSED_DAYS, agoWords, arrange, daysBetween, summarise,
} from "../app/src/lib/client-list.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

const TZ = "America/Los_Angeles";
const TODAY = "2026-09-02";
// Noon UTC-ish instants so the local-date conversion is never on a boundary.
const at = (d) => `${d}T20:00:00.000Z`;   // 1pm in Los Angeles

// ─── 1. summarise ─────────────────────────────────────────────────────────
{
  const rows = [
    { customer_phone: "555-0001", end_at: at("2026-08-12"), total_price: 90, final_amount: 95 },
    { customer_phone: "555-0001", end_at: at("2026-05-04"), total_price: 220, final_amount: null },
    { customer_phone: "555-0002", end_at: at("2026-09-01"), total_price: 65, final_amount: 65 },
  ];
  const m = summarise(rows, TZ);
  check("visits are counted per phone", m.get("555-0001").visits === 2, JSON.stringify(m.get("555-0001")));
  check("final_amount wins over total_price when set",
    m.get("555-0001").spend === 315, `got ${m.get("555-0001").spend}, want 95 + 220`);
  check("total_price is used when final_amount is null",
    m.get("555-0002").spend === 65, `got ${m.get("555-0002").spend}`);
  check("last visit is the MOST RECENT of them",
    m.get("555-0001").last === "2026-08-12", m.get("555-0001").last);
  check("a row with no phone is skipped rather than keyed under undefined",
    summarise([{ customer_phone: null, end_at: at("2026-01-01"), total_price: 10 }], TZ).size === 0);
  check("the instant is converted to the BUSINESS's local date, not the machine's",
    summarise([{ customer_phone: "x", end_at: "2026-09-03T04:00:00.000Z", total_price: 0 }], TZ)
      .get("x").last === "2026-09-02",
    "4am UTC on the 3rd is still the 2nd in Los Angeles");
}

// ─── 2. daysBetween and agoWords ──────────────────────────────────────────
{
  check("daysBetween counts calendar days", daysBetween("2026-08-12", "2026-09-02") === 21);
  check("daysBetween crosses a year", daysBetween("2025-09-02", "2026-09-02") === 365);
  check("no visit reads as Never", agoWords(null, TODAY) === "Never");
  check("today reads as Today", agoWords("2026-09-02", TODAY) === "Today");
  // A job that ended this morning but is dated tomorrow cannot happen once the
  // query filters on end_at — this pins what the WORDS do if it ever did.
  check("a future date does not read as a past visit",
    agoWords("2026-09-09", TODAY) === "Today", agoWords("2026-09-09", TODAY));
  check("one day back is Yesterday", agoWords("2026-09-01", TODAY) === "Yesterday");
  check("three days back is days", agoWords("2026-08-30", TODAY) === "3 days ago");
  check("six days is still days", agoWords("2026-08-27", TODAY) === "6 days ago");
  check("seven days becomes one week", agoWords("2026-08-26", TODAY) === "1 week ago");
  check("21 days is three weeks", agoWords("2026-08-12", TODAY) === "3 weeks ago");
  check("28 days becomes a month", agoWords("2026-08-05", TODAY) === "1 month ago");
  check("120 days is four months", agoWords("2026-05-05", TODAY) === "4 months ago");
  check("a year is a year, singular", agoWords("2025-09-02", TODAY) === "1 year ago");
  check("two years is plural", agoWords("2024-09-02", TODAY) === "2 years ago");
}

// ─── 3. arrange — the sorts and the lapsed filter ─────────────────────────
const customers = [
  { id: "a", name: "Recent Rita", phone: "555-0001" },
  { id: "b", name: "Big Spender Bo", phone: "555-0002" },
  { id: "c", name: "Gone Greg", phone: "555-0003" },
  { id: "d", name: "Never Nell", phone: "555-0004" },   // booked, never completed
];
const totals = new Map([
  ["555-0001", { visits: 3, spend: 300, last: "2026-09-01" }],
  ["555-0002", { visits: 2, spend: 900, last: "2026-08-20" }],
  ["555-0003", { visits: 1, spend: 80, last: "2026-01-15" }],
]);
const names = (rows) => rows.map((r) => r.c.name);

{
  check("Recent puts the most recent visit first",
    names(arrange(customers, totals, { sort: "recent", today: TODAY }))
      .join("|") === "Recent Rita|Big Spender Bo|Gone Greg|Never Nell",
    names(arrange(customers, totals, { sort: "recent", today: TODAY })).join("|"));

  check("Most spent orders by lifetime spend",
    names(arrange(customers, totals, { sort: "spent", today: TODAY }))[0] === "Big Spender Bo");

  const away = names(arrange(customers, totals, { sort: "away", today: TODAY }));
  check("Longest away leads with the oldest visit", away[0] === "Gone Greg", away.join("|"));
  // The half that is a judgment call rather than an ordering: somebody who has
  // NEVER been in has not "been away a long time", so they do not lead a sort
  // whose question is "who has not been back".
  check("Longest away puts NEVER last, not first", away.at(-1) === "Never Nell", away.join("|"));
  check("Recent also puts NEVER last",
    names(arrange(customers, totals, { sort: "recent", today: TODAY })).at(-1) === "Never Nell");

  const lapsed = names(arrange(customers, totals, { lapsed: true, today: TODAY }));
  check("the chip keeps only people not seen in 3 months",
    lapsed.join("|") === "Gone Greg|Never Nell", lapsed.join("|"));
  check("somebody seen 13 days ago is not lapsed", !lapsed.includes("Recent Rita"));

  // THE BOUNDARY, because this list becomes the recipients of a text message.
  const onTheDay = new Map([["555-0009", { visits: 1, spend: 10, last: "2026-06-04" }]]);
  const edge = [{ id: "e", name: "Edge Eddie", phone: "555-0009" }];
  check(`exactly ${LAPSED_DAYS} days is lapsed`,
    daysBetween("2026-06-04", TODAY) === 90
      && arrange(edge, onTheDay, { lapsed: true, today: TODAY }).length === 1,
    `daysBetween is ${daysBetween("2026-06-04", TODAY)}`);
  const dayBefore = new Map([["555-0009", { visits: 1, spend: 10, last: "2026-06-05" }]]);
  check(`${LAPSED_DAYS - 1} days is NOT lapsed`,
    arrange(edge, dayBefore, { lapsed: true, today: TODAY }).length === 0);

  check("arrange does not mutate the list it was given",
    customers[0].name === "Recent Rita");
  check("a customer with no row in totals still appears, at zero",
    arrange(customers, totals, { today: TODAY }).find((r) => r.c.id === "d").spend === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
