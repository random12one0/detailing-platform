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

// ROADMAP 8.19 — MILES IS A COLUMN AND IT IS NOT AN AMOUNT.
//
// The whole reason a detailer logs miles is the IRS standard-rate deduction,
// and that needs a YEAR TOTAL an accountant can see. This file is where an
// accountant looks, so this is where it belongs.
//
// **IT SITS AFTER Amount AND IT NEVER TOUCHES IT.** The one property this
// file has — the Amount column adds up to the Net figure on the screen it
// came from — is unaffected by a column in a different unit, and
// `tests/money-export.test.mjs` asserts that in as many words rather than
// leaving it to be obvious. Multiplying miles by a rate and adding it to
// Amount would be this product inventing a tax position for somebody, which
// is not ours to take.
// ROADMAP 8.17 STAGE 2B — **THIS FILE STAYS ENGLISH, AND THAT IS A DECISION
// RATHER THAN A SCREEN NOBODY GOT TO.**
//
// Three reasons, and the first is the one that decides it. **The exact bytes
// are a contract**: `tests/money-export.test.mjs` asserts this header and the
// `Job` / `Expense` / `Net` cells, because they are how the tie-out finds the
// column it is adding up. A tie-out that follows a display setting is not a
// tie-out.
//
// **It is a document that LEAVES**, handed to an accountant and opened in a
// spreadsheet months later, and what it says would otherwise depend on which
// language the detailer happened to have their phone in when they pressed
// Export. That is the `plan_visits.note` rule about a stored value, one level
// up: anything that outlives the screen stays one language.
//
// **And the FILENAME and period already are English** (`accountantFilename`),
// so translating the columns alone would produce a half-translated document,
// which is the two-language product this whole item exists to avoid.
//
// If he ever asks for a Spanish export it is a real feature — a language
// argument on `accountantCsv`, chosen at the press — and not a `t()` here.
export const HEADER = ["Date", "Type", "Description", "Customer", "Status", "Amount", "Miles"];

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
      // NULL STAYS BLANK RATHER THAN BECOMING 0. A detailer who does not log
      // miles must not hand their accountant a column of noughts that reads
      // as "I drove nowhere"; and zero is a real answer for a drop-off at
      // their own unit, so the two have to stay tellable apart.
      miles: b.miles == null ? "" : Number(b.miles),
    })),
    ...expenses.map((e) => ({
      date: e.date,
      cells: ["Expense", e.description ?? "", "", e.category ?? ""],
      // An expense is money OUT, and it carries its own sign so the column
      // sums to net rather than needing a formula the reader has to write.
      amount: -Number(e.amount ?? 0),
      miles: "",
    })),
  ];
  rows.sort((a, b) => (a.date === b.date
    ? a.cells[0].localeCompare(b.cells[0])
    : String(a.date).localeCompare(String(b.date))));
  return rows;
}

export const accountantNet = (rows) => rows.reduce((s, r) => s + r.amount, 0);

// ROADMAP 8.19. Blank rows contribute nothing, so a file with no miles logged
// totals to 0 and a file with some totals only those — which is what a
// deduction is claimed on.
export const accountantMiles = (rows) =>
  rows.reduce((s, r) => s + (r.miles === "" ? 0 : Number(r.miles) || 0), 0);

// CRLF and a trailing newline: that is what Excel expects and it costs
// nothing anywhere else.
export function accountantCsv(input) {
  const rows = accountantRows(input);
  return [
    HEADER.join(","),
    ...rows.map((r) => [r.date, ...r.cells.map(q), amount(r.amount), r.miles].join(",")),
    // THE FOOT CARRIES BOTH TOTALS AND NAMES THEM SEPARATELY. Net is money;
    // miles are miles, and a reader who sees one number under a column of
    // figures assumes it is the sum of that column — so the miles total goes
    // under the MILES column and nowhere near the Amount one.
    ["", "Net", "", "", "", amount(accountantNet(rows)), accountantMiles(rows)].join(","),
  ].join("\r\n") + "\r\n";
}

const slug = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// The business and the period live in the FILENAME rather than in a title row
// above the header, because a title row is the thing that makes a CSV stop
// parsing as a CSV — and the file is going to somebody else's software.
export const accountantFilename = (businessName, periodLabel) =>
  `${slug(businessName) || "business"}-${slug(periodLabel) || "period"}.csv`;
