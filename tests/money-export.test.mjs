// The accountant export ties out to the screen.
//
// Roadmap 2.11 step 6, stage 4. The one thing that can go wrong here without
// anybody noticing is arithmetic: the file goes to a person who will not
// check it against the Money screen, so the Amount column adding up to the
// same Net the screen prints is the property worth pinning. Everything else
// in here is quoting, which breaks loudly.
//
// Credential-free, no dev server.
//
//   node tests/money-export.test.mjs

import {
  HEADER, accountantCsv, accountantNet, accountantRows, accountantFilename,
} from "../app/src/lib/accountant-export.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

// The shape the screen hands over: completed jobs in the period, and the
// period's expenses. Deliberately awkward — a comma in a description, a
// finalized amount that overrides the quote, a job with no services.
const jobs = [
  {
    booking_date: "2026-09-01", customer_name: "Elena Marsh", payment_status: "paid",
    total_price: 90, final_amount: 95,
    services: [{ name_at_booking: "Interior Refresh" }],
  },
  {
    booking_date: "2026-09-11", customer_name: "Chris Vogel", payment_status: "pending",
    total_price: 65, final_amount: null,
    services: [{ name_at_booking: "Express Wash" }, { name_at_booking: "Wax" }],
  },
  {
    booking_date: "2026-09-04", customer_name: 'Sam "Sammy" Doyle', payment_status: "paid",
    total_price: 120, service_type: "mobile", services: [],
  },
];
const expenses = [
  { date: "2026-09-01", description: "Ceramic coating kit, 2L", category: "product", amount: 189 },
  { date: "2026-09-08", description: "Fuel", category: "travel", amount: 41.5 },
];

const rows = accountantRows({ jobs, expenses });
const csv = accountantCsv({ jobs, expenses });
const lines = csv.trimEnd().split("\r\n");

check("1 header is the six columns", lines[0] === HEADER.join(","), lines[0]);

check("2 one row per job and per expense, plus the Net row",
  lines.length === jobs.length + expenses.length + 2, `${lines.length} lines`);

check("3 rows are in date order",
  rows.map((r) => r.date).join() === "2026-09-01,2026-09-01,2026-09-04,2026-09-08,2026-09-11",
  rows.map((r) => r.date).join());

// THE ONE THAT MATTERS. 95 + 65 + 120 - 189 - 41.50 = 49.50, which is what
// the Money screen's lead figure computes for the same period from the same
// two lists (revenue of completed jobs minus expenses).
const screenNet = jobs.reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0)
  - expenses.reduce((s, e) => s + Number(e.amount), 0);
check("4 the Amount column sums to the screen's Net",
  Math.abs(accountantNet(rows) - screenNet) < 0.005, `${accountantNet(rows)} vs ${screenNet}`);
check("5 the Net row prints that same figure",
  lines.at(-1) === `,Net,,,,${screenNet.toFixed(2)}`, lines.at(-1));

check("6 an expense is negative", rows.find((r) => r.cells[0] === "Expense").amount === -189,
  String(rows.find((r) => r.cells[0] === "Expense").amount));

check("7 final_amount beats total_price",
  rows.find((r) => r.cells[2] === "Elena Marsh").amount === 95);

// A description with a comma in it must not become two columns, and a quote
// inside a name must not end the field early.
const comma = lines.find((l) => l.includes("Ceramic"));
check("8 a comma in a description is quoted",
  comma.includes('"Ceramic coating kit, 2L"'), comma);
const quoted = lines.find((l) => l.includes("Sammy"));
check("9 a quote in a name is doubled",
  quoted.includes('"Sam ""Sammy"" Doyle"'), quoted);
// Read the line the way a spreadsheet does, rather than with a regex that
// counts commas — the whole point of test 8 and 9 is that some commas are
// inside a field.
const fields = (line) => {
  const out = [""];
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted && c === '"' && line[i + 1] === '"') { out[out.length - 1] += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === "," && !quoted) out.push("");
    else out[out.length - 1] += c;
  }
  return out;
};
check("10 every row has six fields once quoting is honoured",
  lines.every((l) => fields(l).length === 6),
  lines.filter((l) => fields(l).length !== 6).map((l) => `${fields(l).length}: ${l}`).join(" | "));
check("10b the quoted fields read back whole",
  fields(comma)[2] === "Ceramic coating kit, 2L" && fields(quoted)[3] === 'Sam "Sammy" Doyle',
  `${fields(comma)[2]} / ${fields(quoted)[3]}`);

check("11 a job with no services falls back to how it was done",
  rows.find((r) => r.cells[2].startsWith("Sam")).cells[1] === "Mobile");

check("12 unpaid jobs are still in the file and say so",
  rows.find((r) => r.cells[2] === "Chris Vogel").cells[3] === "Unpaid");

check("13 the filename carries the business and the period",
  accountantFilename("Coastline Auto Detailing", "September 2026")
    === "coastline-auto-detailing-september-2026.csv",
  accountantFilename("Coastline Auto Detailing", "September 2026"));
check("14 a business named in punctuation still gets a filename",
  accountantFilename("Andrew's Auto Detail — Mobile!", "Sep 6 – 12")
    === "andrew-s-auto-detail-mobile-sep-6-12.csv",
  accountantFilename("Andrew's Auto Detail — Mobile!", "Sep 6 – 12"));

// An empty period is a valid answer, not a crash: header, no rows, Net 0.00.
const none = accountantCsv({ jobs: [], expenses: [] }).trimEnd().split("\r\n");
check("15 an empty period exports a header and a zero Net",
  none.length === 2 && none[1] === ",Net,,,,0.00", none.join(" | "));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
