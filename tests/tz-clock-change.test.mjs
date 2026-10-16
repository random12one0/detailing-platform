// ROADMAP 97.1 — ON THE TWO CLOCK-CHANGE SUNDAYS, MORNING BOOKINGS WERE SAVED
// AN HOUR OFF.
//
// `supabase/functions/_shared/tz.ts` turns "this date, this time, at this
// business" into the instant every booking is stored at. It used to read the
// zone's offset ONCE, at the wall time taken as UTC, and on a clock-change
// Sunday that guess sits on the other side of the change: in Los Angeles,
// 08:00 on 2026-03-08 was stored as 9:00 AM, 09:00 and 10:00 both became
// 17:00Z, and 08:00 on 2026-11-01 was stored as 7:00 AM.
//
// WHAT THIS HOLDS, credential-free and with no network:
//   1. All 24 hours of 2026-03-08, 2026-11-01 and 2026-07-15, in Los Angeles
//      and New York, round-trip to the same wall-clock time — except the one
//      hour that does not exist on a spring-forward clock (02:00-02:59), which
//      is asserted to move forward to 03:xx rather than skipped.
//   2. The repeated 01:00 hour in November resolves to the FIRST of its two
//      occurrences, and the entry's own four figures are pinned exactly.
//   3. Every caller the entry names still imports the shared function, and no
//      tracked file carries a second copy of the one-pass formula.
//
// THE CANARY IS THE ORIGINAL DEFECT, RUN EVERY TIME. The test rewrites the
// production `tz.ts` source with the old one-pass body, proves the rewrite
// landed (docs/gotchas.md 102), imports that copy, and requires the round-trip
// grid to catch it. `BREAK=one-pass` runs the whole check against that copy
// instead, which must go red; it is an environment variable, not a flag,
// because `node --test` swallows flags (docs/gotchas.md 104).
//
//   node --test tests/tz-clock-change.test.mjs
//   BREAK=one-pass node tests/tz-clock-change.test.mjs     # must fail
//   node scripts/receipt.mjs receipts/tz-clock-change.json

import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, writeReceipt } from "../scripts/receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = process.env.BREAK || "";
if (BREAK && BREAK !== "one-pass") {
  console.error(`unknown BREAK=${BREAK}; the only sabotage is BREAK=one-pass`);
  process.exit(2);
}

const TZ_PATH = join(REPO, "supabase/functions/_shared/tz.ts");
const source = readFileSync(TZ_PATH, "utf8");

// The function as it stood before 97.1, verbatim from commit 6ab49426.
const ONE_PASS = `export function localToDate(tz: string, y: number, mo: number, d: number, hh: number, mi: number): Date {
  const utcGuess = new Date(Date.UTC(y, mo - 1, d, hh, mi));
  const p = partsOf(tz, utcGuess, {
    hour12: false, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const asIfUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day),
    p.hour === "24" ? 0 : Number(p.hour), Number(p.minute), Number(p.second));
  return new Date(utcGuess.getTime() + (utcGuess.getTime() - asIfUtc));
}
`;

async function loadOnePass() {
  const broken = source.replace(/export function localToDate\([\s\S]*?\r?\n\}\r?\n/, ONE_PASS);
  if (broken === source || !broken.includes("utcGuess.getTime() - asIfUtc")) {
    throw new Error("the sabotage did not land: localToDate was not found in tz.ts to replace");
  }
  const file = join(mkdtempSync(join(tmpdir(), "tz-one-pass-")), "tz.ts");
  writeFileSync(file, broken);
  return import(pathToFileURL(file).href);
}

const fixed = await import(pathToFileURL(TZ_PATH).href);
const onePass = await loadOnePass();
const subject = BREAK ? onePass : fixed;

let assertions = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

// ---------------------------------------------------------------------------
// 1. THE GRID: 2 zones x 3 days x 24 hours = 144 conversions.
const ZONES = ["America/Los_Angeles", "America/New_York"];
const DAYS = ["2026-03-08", "2026-11-01", "2026-07-15"];
const SPRING = "2026-03-08";
const pad = (n) => String(n).padStart(2, "0");

function roundTrip(m, tz, day, hh) {
  const time = `${pad(hh)}:00`;
  const at = m.localDateTimeToInstant(tz, day, time);
  const back = `${m.dateStrIn(tz, at)} ${m.timeStrIn(tz, at)}`;
  // 02:00 on the spring-forward day does not exist on either clock, so it
  // cannot round-trip; it is required to move forward by the hour skipped.
  const want = day === SPRING && hh === 2 ? `${day} 03:00` : `${day} ${time}`;
  return { time, at, back, want };
}

const grid = [];
for (const tz of ZONES) for (const day of DAYS) for (let hh = 0; hh < 24; hh++) {
  const r = roundTrip(subject, tz, day, hh);
  grid.push({ tz, day, time: r.time, stored: r.at.toISOString(), reads_back: r.back });
  check(`${tz} ${day} ${r.time} round-trips`, r.back === r.want, `stored ${r.at.toISOString()}, reads back ${r.back}, want ${r.want}`);
}

// Distinct hours must be distinct instants an hour apart (bar the skipped one).
for (const tz of ZONES) for (const day of DAYS) {
  const rows = grid.filter((g) => g.tz === tz && g.day === day).map((g) => Date.parse(g.stored));
  const steps = rows.slice(1).map((t, i) => (t - rows[i]) / 3_600_000);
  // Spring: 02:00 and 03:00 are the same instant. Fall: 01:00 (the first) to 02:00 is two real hours.
  const want = (h) => (day === SPRING && h === 3 ? 0 : day === "2026-11-01" && h === 2 ? 2 : 1);
  const bad = steps.map((s, i) => [s, i + 1]).filter(([s, h]) => s !== want(h));
  check(`${tz} ${day} hours are one hour apart`, bad.length === 0, `steps ${JSON.stringify(steps)}`);
}

// ---------------------------------------------------------------------------
// 2. THE ENTRY'S OWN FIGURES, AND THE REPEATED HOUR.
const LA = "America/Los_Angeles";
const at = (tz, d, t) => subject.localDateTimeToInstant(tz, d, t).toISOString();
check("2026-03-08 08:00 LA is 15:00Z (was 9:00 AM)", at(LA, "2026-03-08", "08:00") === "2026-03-08T15:00:00.000Z", at(LA, "2026-03-08", "08:00"));
check("2026-03-08 09:00 LA is 16:00Z", at(LA, "2026-03-08", "09:00") === "2026-03-08T16:00:00.000Z", at(LA, "2026-03-08", "09:00"));
check("2026-03-08 10:00 LA is 17:00Z, not the same instant as 09:00", at(LA, "2026-03-08", "10:00") === "2026-03-08T17:00:00.000Z" && at(LA, "2026-03-08", "09:00") !== at(LA, "2026-03-08", "10:00"), at(LA, "2026-03-08", "10:00"));
check("2026-11-01 08:00 LA is 16:00Z (was 7:00 AM)", at(LA, "2026-11-01", "08:00") === "2026-11-01T16:00:00.000Z", at(LA, "2026-11-01", "08:00"));
check("2026-11-01 01:30 LA is the FIRST 1:30 (PDT, 08:30Z)", at(LA, "2026-11-01", "01:30") === "2026-11-01T08:30:00.000Z", at(LA, "2026-11-01", "01:30"));
check("2026-03-08 02:30 LA moves forward to 03:30 PDT (10:30Z)", at(LA, "2026-03-08", "02:30") === "2026-03-08T10:30:00.000Z", at(LA, "2026-03-08", "02:30"));
check("localToDate itself agrees with the wrapper", subject.localToDate(LA, 2026, 11, 1, 8, 0).toISOString() === "2026-11-01T16:00:00.000Z");

// ---------------------------------------------------------------------------
// 3. EVERY CALLER STILL USES IT, AND NO SECOND COPY OF THE MATHS.
const CALLERS = [
  ["supabase/functions/_shared/slotValidation.ts", /import \{[^}]*\blocalDateTimeToInstant\b[^}]*\} from "\.\/tz\.ts"/],
  ["supabase/functions/create-booking/index.ts", /import \{[^}]*\blocalDateTimeToInstant\b[^}]*\} from "\.\.\/_shared\/tz\.ts"/],
  ["supabase/functions/reschedule-booking/index.ts", /from "\.\.\/_shared\/slotValidation\.ts"/],
  ["supabase/functions/available-slots/index.ts", /import \{[^}]*\blocalDateTimeToInstant\b[^}]*\} from "\.\.\/_shared\/tz\.ts"/],
  ["supabase/functions/calculate-booking/index.ts", /import \{[^}]*\blocalDateTimeToInstant\b[^}]*\} from "\.\.\/_shared\/tz\.ts"/],
  ["app/src/components/BulkJobModal.jsx", /import \{[^}]*\blocalDateTimeToInstant\b[^}]*\} from "\.\.\/\.\.\/\.\.\/supabase\/functions\/_shared\/tz\.ts"/],
  ["scripts/seed-demo.mjs", /import \{[^}]*\blocalDateTimeToInstant\b[^}]*\} from "\.\.\/supabase\/functions\/_shared\/tz\.ts"/],
];
for (const [file, re] of CALLERS) {
  check(`${file} imports the shared conversion`, re.test(readFileSync(join(REPO, file), "utf8")));
}
// pricing.ts takes the function as a parameter (it is handed tz.ts's by
// create-booking, calculate-booking and preview-emails), so it must not import
// or define its own.
const pricing = readFileSync(join(REPO, "supabase/functions/_shared/pricing.ts"), "utf8");
check("pricing.ts receives localDateTimeToInstant rather than defining one",
  /localDateTimeToInstant: \(tz: string, d: string, t: string\) => Date/.test(pricing)
  && !/function localDateTimeToInstant|function localToDate/.test(pricing));

// The one-pass signature is `guess + (guess - asIfUtc)`: a value plus its own
// difference from the formatted reading. Searched in every tracked source file.
const tracked = execSync("git ls-files -- \"*.ts\" \"*.js\" \"*.jsx\" \"*.mjs\"", { cwd: REPO, encoding: "utf8" })
  .split("\n").filter((f) => f && !f.startsWith("reference/") && f !== "tests/tz-clock-change.test.mjs");
const SECOND_COPY = /([\w.()]+)\s*\+\s*\(\s*\1\s*-\s*asIfUtc\s*\)/;
const copies = tracked.filter((f) => { try { return SECOND_COPY.test(readFileSync(join(REPO, f), "utf8")); } catch { return false; } });
check(`no tracked file carries the one-pass formula (${tracked.length} files searched)`, copies.length === 0 && tracked.length > 500, copies.join(", "));
check("the search pattern recognises the original formula", SECOND_COPY.test(ONE_PASS));

// ---------------------------------------------------------------------------
// THE CANARY — the original one-pass function, run through the same grid.
const canaryMisses = [];
for (const tz of ZONES) for (const day of DAYS) for (let hh = 0; hh < 24; hh++) {
  const r = roundTrip(onePass, tz, day, hh);
  if (r.back !== r.want) canaryMisses.push(`${tz} ${day} ${r.time} -> ${r.back}`);
}
const canary = {
  id: "tz-one-pass-offset-restored",
  observed_failure: canaryMisses.length > 0,
  caught: canaryMisses.length,
  examples: canaryMisses.slice(0, 6),
};
check("the canary — the old one-pass function fails the round-trip grid", canary.observed_failure);

// ---------------------------------------------------------------------------
const failed = failures.length;
for (const f of failures) console.log(`FAIL ${f}`);
console.log(`\n${assertions - failed} passed, ${failed} failed, ${assertions} assertions${BREAK ? ` (BREAK=${BREAK})` : ""}.`);
console.log(`canary: the old one-pass function failed ${canaryMisses.length} of ${grid.length} conversions`);

const EXPECTED = ZONES.length * DAYS.length * 24;
// Every conversion and what it read back, so a person can look; a sabotage run
// writes its own file and never overwrites the clean one.
const artifact = `artifacts/tz-clock-change/grid${BREAK ? ".sabotage" : ""}.json`;
mkdirSync(join(REPO, "artifacts/tz-clock-change"), { recursive: true });
writeFileSync(join(REPO, artifact), JSON.stringify({ break: BREAK || null, failures, grid }, null, 2) + "
");
const { path } = writeReceipt({
  check_id: "tz-clock-change",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: EXPECTED,
  discovered_targets: grid.length,
  attempted_targets: grid.length,
  completed_targets: grid.length,
  skipped_targets: 0,
  assertions_executed: assertions,
  // 144 round-trips + 6 spacing + 7 figures + 8 callers + 2 copy searches + 1 canary.
  min_assertions: 168,
  assertion_floor: "structural: the grid is 2 zones x 3 days x 24 hours and every other assertion is a fixed list, so the count cannot vary between runs",
  failures,
  dimensions: {
    roadmap: "97.1",
    zones: ZONES,
    days: DAYS,
    nonexistent_hour: "02:00-02:59 on 2026-03-08 moves forward to 03:xx",
    ...(BREAK ? { break: BREAK } : {}),
    files_searched_for_second_copy: tracked.length,
  },
  artifacts: [artifact],
  canary,
});
console.log(`receipt: ${path}`);

process.exit(failed ? 1 : 0);
