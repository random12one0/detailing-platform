// ROADMAP 5.4 — THE MONEY SCREEN AND THE BUSINESS SCREEN MUST NOT DISAGREE
// ABOUT THE SAME LINKS.
//
// The audit (A2 4.5) saw Money say "None of your links were opened in this
// period" while Business said "1 link · 21 opens", and marked it NOT CONFIRMED
// because the two might simply cover different stretches of time.
//
// THEY DID NOT. Measured against the real development database on 2026-09-18:
// across every business, NOT ONE row in `campaign_visits` was tagged to a
// campaign. Money was right and Business was wrong, three ways at once:
//
//   1. it counted visits belonging to NO link — the commonest row in that
//      table, somebody opening the plain booking page;
//   2. it counted visits to links that had been switched OFF, while printing
//      a count of LIVE links beside them;
//   3. it counted page loads where Money counts people.
//
// So the fix was not a label. Both screens read `whereFrom()` now, and this
// check exists to keep it that way.
//
// WHAT IT REFUSES TO ASSERT. It does not demand that any link has ever been
// opened. Nobody has made one and used it yet, so a non-zero requirement would
// go red for a reason that is not a defect — this repo's oldest failure is a
// check that skips a question quietly, and its second oldest is one that
// answers a question nobody asked.
//
//   node scripts/link-counts-agree.mjs
//   node scripts/link-counts-agree.mjs --break=untagged|inactive|loads|period
//
// The fixture targets are credential-free. The live-rows target SKIPS loudly
// without credentials and is recorded as skipped, never as passed.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { whereFrom } from "../app/src/lib/moneyAdvanced.js";
import { writeReceipt } from "./receipt.mjs";

const started_at = new Date().toISOString();
// `fileURLToPath`, NOT `new URL(...).pathname`. On Windows that property hands
// back `/D:/Users/...` with a leading slash, and the regex written to strip it
// has now been eaten twice by the shell heredocs that wrote this file — the
// same control-character trap `docs/gotchas.md` records. The helper does it
// correctly on every platform and cannot be mangled.
const ART = join(dirname(fileURLToPath(import.meta.url)), "..", "artifacts", "link-counts-agree");
const artifacts = [];
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;

let assertions = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log("  ok    " + name); return true; }
  failures.push((name + " " + detail).trim());
  console.error("  FAIL  " + name + " " + detail);
  return false;
};

// THE SABOTAGES CHANGE THE ARITHMETIC, NOT THE ASSERTION. A sabotage that only
// loosens a check which was already satisfied proves nothing. Each of these
// reinstates exactly one of the three faults the item was opened for, so the
// target that exists to catch that fault has to go red and the others should
// not.
const countFor = (rows, campaigns) => {
  if (BREAK === "untagged") {
    return rows.length;                                    // the old Business count
  }
  if (BREAK === "inactive") {
    const ids = new Set(campaigns.map((c) => c.id));        // dead links counted too
    return new Set(rows.filter((v) => v.campaign_id && ids.has(v.campaign_id))
      .map((v) => v.visitor_id)).size;
  }
  if (BREAK === "loads") {
    const ids = new Set(campaigns.filter((c) => c.is_active !== false).map((c) => c.id));
    return rows.filter((v) => v.campaign_id && ids.has(v.campaign_id)).length;
  }
  return whereFrom({ campaigns, visits: rows }).linkPeople;
};

// ---------------------------------------------------------------------------
// THE FIXTURE. One live link, one switched off, and a visit of every shape
// that has ever been miscounted. The right answer is ONE — v3, who opened the
// live flyer twice.
// ---------------------------------------------------------------------------
const CAMPAIGNS = [
  { id: "live", name: "Golf course flyer", slug: "golf", is_active: true },
  { id: "dead", name: "Spring postcard", slug: "spring", is_active: false },
];
const VISITS = [
  { campaign_id: null, visitor_id: "v1", date: "2026-09-10" },    // typed the address in
  { campaign_id: null, visitor_id: "v2", date: "2026-09-10" },    // arrived from Google
  { campaign_id: "live", visitor_id: "v3", date: "2026-09-10" },  // the flyer
  { campaign_id: "live", visitor_id: "v3", date: "2026-09-11" },  // the SAME person again
  { campaign_id: "dead", visitor_id: "v4", date: "2026-09-10" },  // last spring's postcard
];

const expected_targets = 5;
let discovered = 0, attempted = 0, completed = 0, skipped = 0;

const target = (name, fn) => {
  discovered++;
  attempted++;
  console.log("\n§ " + name);
  const before = failures.length;
  fn();
  if (failures.length === before) completed++;
};

// --- 1 ---------------------------------------------------------------------
target("A visit that belongs to no link is not a link open", () => {
  const n = countFor(VISITS, CAMPAIGNS);
  check("untagged visits are excluded", n <= 2,
    "counted " + n + "; v1 and v2 opened no link, so anything above 2 swept them in");
  check("the figure is exactly the live link's people", n === 1, "got " + n + ", expected 1");
});

// --- 2 ---------------------------------------------------------------------
target("A switched-off link's visits are not counted beside a live-link total", () => {
  const n = countFor(VISITS, CAMPAIGNS);
  const revived = countFor(VISITS, CAMPAIGNS.map((c) => ({ ...c, is_active: true })));
  check("turning the dead link back on moves the figure", revived !== n,
    "the postcard's visitor counts either way, so is_active is doing nothing");
  check("v4 is excluded while the postcard is off", n === 1, "got " + n + ", expected 1");
});

// --- 3 ---------------------------------------------------------------------
target("One person opening a link twice is one person", () => {
  const n = countFor(VISITS, CAMPAIGNS);
  const again = countFor(
    VISITS.concat([{ campaign_id: "live", visitor_id: "v3", date: "2026-09-12" }]), CAMPAIGNS);
  check("a third visit by the SAME person does not move it", again === n,
    n + " became " + again + "; that is page loads, not people");
  const other = countFor(
    VISITS.concat([{ campaign_id: "live", visitor_id: "v9", date: "2026-09-12" }]), CAMPAIGNS);
  check("a NEW person does move it", other === n + 1,
    n + " became " + other + "; a real second visitor must count");
});

// --- 4 ---------------------------------------------------------------------
// THE REGRESSION GUARD ON THE SCREEN THAT WAS ALREADY RIGHT. Money is period
// scoped and must stay so. The fix added an all-time mode to the same function,
// and a mistake there would silently make Money ignore its own period control —
// which would be a worse defect than the one being fixed.
target("Money's period control still filters, and Business's figure still does not", () => {
  const oneDay = { start: "2026-09-11", end: "2026-09-11" };
  const scoped = BREAK === "period"
    ? whereFrom({ campaigns: CAMPAIGNS, visits: VISITS }).links
    : whereFrom({ campaigns: CAMPAIGNS, visits: VISITS, period: oneDay }).links;
  const day = scoped.find((l) => l.id === "live");
  check("one day of the fixture sees one visit, not two", day.visits === 1,
    "saw " + day.visits + "; the period is being ignored");
  const all = whereFrom({ campaigns: CAMPAIGNS, visits: VISITS }).links
    .find((l) => l.id === "live");
  check("with no period the same link sees both visits", all.visits === 2,
    "saw " + all.visits + "; all-time mode is dropping rows");
});

// --- 5 ---------------------------------------------------------------------
// THE REAL ROWS — the target the audit could not settle by reading the code.
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let liveNote = "skipped — no credentials";

if (!URL_ || !KEY) {
  discovered++;
  skipped++;
  console.log("\n§ The two screens describe the same real rows");
  console.log("  SKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.");
  console.log("  NOTHING was read. This is not a pass.");
} else {
  const get = async (path) => {
    const r = await fetch(URL_ + "/rest/v1/" + path,
      { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
    if (!r.ok) throw new Error(path + " → " + r.status);
    return r.json();
  };
  const businesses = await get("businesses?select=id,slug&limit=500");
  const allCampaigns = await get("campaigns?select=id,business_id,is_active&limit=2000");
  const allVisits = await get("campaign_visits?select=campaign_id,visitor_id,business_id&limit=5000");

  discovered++;
  attempted++;
  const before = failures.length;
  console.log("\n§ The two screens describe the same real rows");
  let disagreements = 0;
  let withLinks = 0;
  const rows = [];
  for (const b of businesses) {
    const cps = allCampaigns.filter((c) => c.business_id === b.id);
    if (cps.length === 0) continue;
    withLinks++;
    const cvs = allVisits.filter((v) => v.business_id === b.id);
    const businessSays = countFor(cvs, cps);
    // What MONEY draws from the same rows, all time: a link is listed only if
    // it is live and somebody opened it, or it produced a booking. When that
    // list is empty Money prints "None of your links were opened".
    const moneySaysNone = whereFrom({ campaigns: cps, visits: cvs }).links
      .filter((l) => (l.active && l.people > 0) || l.bookings > 0).length === 0;
    rows.push([b.slug.padEnd(28),
      String(cps.filter((c) => c.is_active).length).padStart(3) + " live link(s)",
      String(cvs.length).padStart(5) + " visit row(s)",
      "Business: " + (businessSays === 0 ? "not opened yet" : businessSays + " people"),
      "Money: " + (moneySaysNone ? "none opened" : "some opened"),
    ].join("  |  "));
    if (moneySaysNone !== (businessSays === 0)) {
      disagreements++;
      console.error("  · " + b.slug + ": Business says " + businessSays
        + ", Money says " + (moneySaysNone ? "none opened" : "some opened"));
    }
  }
  check("no business has the two screens disagreeing", disagreements === 0,
    disagreements + " disagree of " + withLinks + " with links");
  // ZERO DISCOVERED TARGETS IS A FAILURE, NEVER A PASS. A run against a
  // database where nobody has made a link would otherwise print a clean sweep
  // over nothing at all.
  check("at least one business with a link was examined", withLinks > 0,
    "no business has a tracking link; this run proved nothing");
  // SOMETHING A PERSON CAN OPEN. `receipt.mjs` refuses a receipt with no
  // artifact — correctly: a run whose only trace is a verdict is a run nobody
  // can audit. This is one line per business with a link, both screens side by
  // side, which is the whole question this item asked.
  const file = join(ART, "what-each-screen-says.txt");
  const rule = "-".repeat(110);
  mkdirSync(ART, { recursive: true });
  writeFileSync(file, [
    "ROADMAP 5.4 - what the Money screen and the Business screen say about the",
    "same links, read from the real database on " + started_at,
    rule,
    rows.length ? rows.join("\n") : "NO BUSINESS HAS A TRACKING LINK - this run proved nothing.",
    rule,
    withLinks + " businesses with links, " + disagreements + " disagreements.",
    "A disagreement is one screen saying a link was opened while the other says none was.",
    "",
  ].join("\n"));
  artifacts.push(file);
  liveNote = withLinks + " businesses with links, " + disagreements + " disagreements";
  if (failures.length === before) completed++;
}

// ---------------------------------------------------------------------------
// THE CANARY IS THE DEFECT ITSELF. The old Business arithmetic — count every
// row in `campaign_visits` — is run against the same fixture, and every green
// verdict above is void unless it is SEEN to disagree with the truth.
// ---------------------------------------------------------------------------
const oldWay = VISITS.length;
const truth = whereFrom({ campaigns: CAMPAIGNS, visits: VISITS }).linkPeople;
const canaryFailed = oldWay !== truth;
console.log("\n§ Canary — the old count says " + oldWay + ", the truth is " + truth);
check("the canary disagrees, so this check can see the defect it was written for",
  canaryFailed, "the old arithmetic agreed with the new one; every green above is void");

const status = failures.length === 0 && completed + skipped === expected_targets ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "link-counts-agree",
  started_at,
  status,
  expected_targets,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: skipped,
  assertions_executed: assertions,
  // Declared here and held to it. 9 is what a credential-free run executes,
  // 11 with the live rows; lowering it is a visible diff somebody must justify.
  min_assertions: 9,
  failures,
  artifacts,
  warnings: BREAK ? ["run with --break=" + BREAK + "; this receipt is a sabotage, not a result"] : [],
  dimensions: { sabotage: BREAK || null, live_rows: liveNote },
  canary: { id: "old-business-count-every-row", observed_failure: canaryFailed },
});

console.log("\n" + status.toUpperCase() + " — " + completed + "/" + expected_targets
  + " targets, " + skipped + " skipped, " + assertions + " assertions, "
  + failures.length + " failure(s). Receipt " + path);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
