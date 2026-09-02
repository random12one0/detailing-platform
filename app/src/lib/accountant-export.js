// The accountant export — roadmap 2.11 step 6, stage 4 (feature row 40).
//
// "Jobs and expenses, nothing more" was his answer to Q4, so this is ONE FLAT
// LEDGER rather than two tables: a row per completed job, a row per expense,
// expenses negative, sorted by date. A flat file is what a spreadsheet can
// pivot and what an accountant can read without being told how, and it has
// one property two stacked tables do not — THE AMOUNT COLUMN ADDS UP TO THE
// NET FIGURE PRINTED ON THE SCREEN IT CAME FROM.
//
// That tie-out is the whole reason this file is separate from the screen: it
// is a money path, so it gets a check that fails when the arithmetic drifts
// (tests/money-export.test.mjs). CLAUDE.md's rule is "a number PRINTED on a
// screen is not a number that is CHARGED" — travel_fee was drawn on the
// booking page for the whole life of the quote engine without ever being in
// it. An export is the same shape of risk one step later: a file the owner
// hands to someone who will not check it against the screen.

const q = (v) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// Plain numbers, no "$": a currency symbol makes the column text in every
// spreadsheet that opens this, and the point of the file is that it adds up.
const amount = (n) => (Math.round(Number(n || 0) * 100) / 100).toFixed(2);

export const HEADER = ["Date", "Type", "Description", "Customer", "Status", "Amount"];

// The rows, before they are text — so the test can assert the arithmetic
// without parsing CSV back out again.
export function accountantRows({ jobs = [], expenses = [] }) {
  const rows = [
    ...jobs.map((b) => ({
      date: b.booking_date,
      cells: [
        "Job",
        (b.services ?? []).map((s) => s.name_at_booking).filter(Boolean).join(" · ")
          || (b.service_type === "mobile" ? "Mobile" : "Drop-off"),
        b.customer_name ?? "",
        b.payment_status === "paid" ? "Paid" : "Unpaid",
      ],
      amount: Number(b.final_amount ?? b.total_price ?? 0),
    })),
    ...expenses.map((e) => ({
      date: e.date,
      cells: ["Expense", e.description ?? "", "", e.category ?? ""],
      // An expense is money OUT, and it carries its own sign so the column
      // sums to net rather than needing a formula the reader has to write.
      amount: -Number(e.amount ?? 0),
    })),
  ];
  rows.sort((a, b) => (a.date === b.date
    ? a.cells[0].localeCompare(b.cells[0])
    : String(a.date).localeCompare(String(b.date))));
  return rows;
}

export const accountantNet = (rows) => rows.reduce((s, r) => s + r.amount, 0);

// CRLF and a trailing newline: that is what Excel expects and it costs
// nothing anywhere else.
export function accountantCsv(input) {
  const rows = accountantRows(input);
  return [
    HEADER.join(","),
    ...rows.map((r) => [r.date, ...r.cells.map(q), amount(r.amount)].join(",")),
    ["", "Net", "", "", "", amount(accountantNet(rows))].join(","),
  ].join("\r\n") + "\r\n";
}

const slug = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// The business and the period live in the FILENAME rather than in a title row
// above the header, because a title row is the thing that makes a CSV stop
// parsing as a CSV — and the file is going to somebody else's software.
export const accountantFilename = (businessName, periodLabel) =>
  `${slug(businessName) || "business"}-${slug(periodLabel) || "period"}.csv`;
