// A BUTTON ON ITS OWN HAS AN OUTLINE — ROADMAP 99.4, from Andrew's 2026-10-11 ruling.
//
// `btn ghost` paints no border and no ground, so standing alone it is just
// words: *"if there is no outline or any bubble ... it's just text."* A ghost is
// the quiet PARTNER beside a stronger button (Cancel next to Save), or an
// icon-only glyph. Anywhere else it must be a plain `btn` (the outlined pill).
//
//   node scripts/lone-ghost.mjs                 # audit app/src
//   node scripts/lone-ghost.mjs --break=lone    # a lone ghost comes back: must go red
//   node scripts/lone-ghost.mjs --break=partner # a PARTNERED one loses its partner: must go red
//
// Credential-free. No browser, no dev server. Reads source only, so it says
// "this ghost is registered with a named partner", never "this renders well".
//
// EVERY NON-`sm` GHOST IN app/src MUST BE IN THE LEDGER BELOW, and the count is
// an EQUALITY: a new ghost fails until somebody writes down what it sits beside,
// and a ledger line whose ghost is gone fails too. `sm` is out of scope by the
// item's own wording. Families: `btn` (theme.css, transparent border), `bk-btn`
// (booking.css, `box-shadow: none`) and `bo-btn` (office.css, which paints a 1px
// ring on its ghost, so it is RINGED and asserted as such).
//
// WHAT IT CANNOT SEE, stated rather than hidden: a PARTNERED partner is matched
// by its label text inside +/-PARTNER_WINDOW lines plus "some non-ghost button
// class string is in that window"; it cannot tell that the partner is visibly
// stronger, or that both are on screen together. GLYPH means an aria-label within
// four lines of the ghost; a worded button given a stray aria-label would pass.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(REPO, "app/src");
const PARTNER_WINDOW = 22;
const MIN_DISCOVERED = 40; // a discovery FLOOR (scanner health), not the debt declaration
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);

// kind: PARTNERED (partner = text of the stronger button) | GLYPH | RINGED
// key: text found on the ghost's line or the four after it, unique per entry.
export const LEDGER = [
  // dashboard
  { file: "components/BookingDetail.jsx", key: "Open the customer's receipt page", kind: "PARTNERED", partner: "Email the receipt" },
  { file: "components/BookingDetail.jsx", key: 'label={t("Decline")}', kind: "PARTNERED", partner: "Send a quote" },
  { file: "components/BookingDetail.jsx", key: 'label={t("Cancel the job")}', kind: "PARTNERED", partner: "Edit" },
  { file: "components/CampaignModal.jsx", key: 'Go back', kind: "PARTNERED", partner: "Yes, send it" },
  { file: "components/ConfirmTap.jsx", key: "cancelLabel ??", kind: "PARTNERED", partner: "confirmLabel" },
  { file: "components/ErrorBoundary.jsx", key: "Back to the dashboard", kind: "PARTNERED", partner: "Try again" },
  { file: "components/FinalizeModal.jsx", key: 'aria-label={t("Remove")}', kind: "GLYPH" },
  { file: "components/FinalizeModal.jsx", key: "Go back", kind: "PARTNERED", partner: "Yes, finalize" },
  { file: "components/QuoteModal.jsx", key: "Go back", kind: "PARTNERED", partner: "Yes, send it" },
  { file: "screens/CreateBusiness.jsx", key: "signOutEverything", kind: "PARTNERED", partner: "Open my dashboard" },
  { file: "screens/Money.jsx", key: 'aria-label={t("Previous period")}', kind: "GLYPH" },
  { file: "screens/Money.jsx", key: 'aria-label={t("Next period")}', kind: "GLYPH" },
  { file: "screens/more/Billing.jsx", key: "Never mind", kind: "PARTNERED", partner: "Yes, cancel it" },
  { file: "screens/more/Gallery.jsx", key: 'aria-label={t("Remove")}', kind: "GLYPH" },
  { file: "screens/more/Plans.jsx", key: 'setEditPlan(null)', kind: "PARTNERED", partner: "Save plan" },
  { file: "screens/more/Plans.jsx", key: 'setEditMember(null)', kind: "PARTNERED", partner: "Log this member" },
  { file: "screens/more/Team.jsx", key: 'aria-label={t("Copy link")}', kind: "GLYPH" },
  // icon-only buttons spelled `btn icon ghost` / `btn inline ghost` + aria-label
  { file: "App.jsx", key: 'aria-label={t("New booking")}', kind: "GLYPH" },
  { file: "App.jsx", key: 'aria-label={t("Settings")}', kind: "GLYPH" },
  { file: "components/SettingsHost.jsx", key: 'aria-label={t("Back")}', kind: "GLYPH" },
  { file: "components/SetupForm.jsx", key: 'aria-label={t("Back")}', kind: "GLYPH" },
  { file: "screens/SiteIntake.jsx", key: 'aria-label={t("Remove")}', kind: "GLYPH", n: 2 },
  { file: "screens/SiteIntake.jsx", key: 'aria-label={t("Back")}', kind: "GLYPH", n: 2 },
  // booking page
  { file: "book/BookingPage.jsx", key: 'aria-label={t("Back a step")}', kind: "GLYPH" },
  { file: "book/ManageBookingPage.jsx", key: 'setMode(null)', kind: "PARTNERED", partner: "Move my booking" },
  { file: "book/ManageBookingPage.jsx", key: 'setConfirmCancel(false)', kind: "PARTNERED", partner: "Yes, cancel it" },
  { file: "book/PlanMemberPage.jsx", key: 'setConfirmEnd(false)', kind: "PARTNERED", partner: "Yes, end" },
  { file: "book/steps/StepWhen.jsx", key: 'aria-label={t("Previous month")}', kind: "GLYPH" },
  { file: "book/steps/StepWhen.jsx", key: 'aria-label={t("Next month")}', kind: "GLYPH" },
  // office (rebuild pending): .bo-btn.ghost paints a ring
  { file: "admin/office/DetailerPanel.jsx", key: "", kind: "RINGED", n: 9 },
  { file: "admin/office/OfficePage.jsx", key: "", kind: "RINGED" },
  { file: "admin/office/places/money/Bills.jsx", key: "", kind: "RINGED", n: 2 },
  { file: "admin/office/places/today/NeedsYou.jsx", key: "", kind: "RINGED" },
];

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : /\.(jsx|js)$/.test(n) ? [p] : [];
});

export function loadSources() {
  const m = new Map();
  for (const p of walk(SRC)) m.set(relative(SRC, p).replace(/\\/g, "/"), readFileSync(p, "utf8"));
  return m;
}

const CLASS_RE = /className[=:]\s*\{?\s*[`"']([^"'`$\n]*)/g;
const BUTTONS = new Set(["btn", "bk-btn", "bo-btn"]);

/** Every non-`sm` ghost: { file, line (1-based), family, lines[] }. */
export function discover(sources) {
  const out = [];
  for (const [file, text] of sources) {
    const lines = text.split(/\r?\n/);
    lines.forEach((ln, i) => {
      for (const m of ln.matchAll(CLASS_RE)) {
        const t = m[1].split(/\s+/).filter(Boolean);
        const family = t.find((x) => BUTTONS.has(x));
        if (family && t.includes("ghost") && !t.includes("sm")) out.push({ file, line: i + 1, family, lines });
      }
    });
  }
  return out;
}

// A non-ghost button class string anywhere in the window.
const hasStrongButton = (w) => [...w.matchAll(CLASS_RE)].some((m) => {
  const t = m[1].split(/\s+/);
  return t.some((x) => BUTTONS.has(x)) && !t.includes("ghost");
});
const near = (g, a, b) => g.lines.slice(Math.max(0, g.line - 1 - a), g.line + b).join("\n");

/** Returns { findings[], matched: n, found[] } for the given sources. */
export function audit(sources) {
  const found = discover(sources);
  const cap = LEDGER.map((e) => ({ ...e, left: e.n ?? 1 }));
  const findings = [];
  let matched = 0;
  for (const g of found) {
    const win = near(g, 0, 4);
    const e = cap.find((c) => c.left > 0 && c.file === g.file && (c.key === "" || win.includes(c.key)));
    const at = `${g.file}:${g.line}`;
    if (!e) { findings.push(`${at} — a non-sm ghost that is not in the ledger. Standing alone it reads as bare words: make it a plain \`btn\`, or register it with the stronger button beside it.`); continue; }
    e.left--;
    if (e.kind === "PARTNERED") {
      const w = near(g, PARTNER_WINDOW, PARTNER_WINDOW);
      if (!w.includes(e.partner)) findings.push(`${at} — ledger says it is PARTNERED by "${e.partner}", which is not within ${PARTNER_WINDOW} lines.`);
      else if (!hasStrongButton(w) && !w.includes("confirmClassName")) findings.push(`${at} — no non-ghost button class string within ${PARTNER_WINDOW} lines.`);
      else matched++;
    } else if (e.kind === "GLYPH") {
      if (!/aria-label/.test(win)) findings.push(`${at} — ledger says GLYPH (icon-only) but there is no aria-label on it.`);
      else matched++;
    } else matched++;
  }
  for (const c of cap) if (c.left > 0) findings.push(`ledger line is stale: ${c.file} "${c.key}" expected ${c.left} more ghost(s) than the source has.`);
  return { findings, matched, found };
}

const mutate = (sources, file, from, to) => {
  const next = new Map(sources);
  const before = next.get(file);
  if (!before || !(from instanceof RegExp ? from.test(before) : before.includes(from))) throw new Error(`sabotage did not land: ${file} has no ${from}`);
  next.set(file, before.replace(from, to));
  return next;
};

const started_at = new Date().toISOString();
const sources = loadSources();
const real = audit(sources);

// CANARY — always run: a lone ghost injected in memory must be reported.
const canarySources = new Map(sources);
canarySources.set("canary/Lone.jsx", '<button className="btn ghost" onClick={go}>Alone</button>\n');
const canaryCaught = audit(canarySources).findings.some((f) => f.startsWith("canary/Lone.jsx:1"));

let used = sources;
if (BREAK === "lone") {
  // The 99.4 fix undone: Preferences' reset goes back to bare words.
  used = mutate(sources, "screens/more/Preferences.jsx", /className="btn"(\s+onClick=\{\(\) => setPrefs\(defaultPrefs)/, 'className="btn ghost"$1');
} else if (BREAK === "partner") {
  used = mutate(sources, "book/ManageBookingPage.jsx", 't("Move my booking")', 't("Go")');
} else if (BREAK) { console.error(`unknown --break=${BREAK}`); process.exit(2); }
const res = BREAK ? audit(used) : real;

const ringOk = /\.bo-btn\.ghost\s*\{[^}]*inset 0 0 0 1px/.test(readFileSync(join(SRC, "admin/office/office.css"), "utf8"));
const failures = [
  ...res.findings,
  ...(ringOk ? [] : ["office.css: .bo-btn.ghost no longer paints an inset 1px ring — the RINGED ledger lines are no longer true."]),
  ...(canaryCaught ? [] : ["the canary lone ghost was not reported — this check is blind"]),
  ...(res.found.length < MIN_DISCOVERED ? [`only ${res.found.length} ghosts discovered, below the floor of ${MIN_DISCOVERED} — the scanner is broken`] : []),
];
const expected = LEDGER.reduce((n, e) => n + (e.n ?? 1), 0);
console.log(`ghosts discovered ${res.found.length} of ${expected} in the ledger; ${res.matched} verified; canary ${canaryCaught ? "caught" : "MISSED"}${BREAK ? `; SABOTAGE --break=${BREAK}` : ""}`);
for (const f of failures) console.log("  FAIL " + f);
const { path } = writeReceipt({
  check_id: "lone-ghost",
  started_at,
  status: failures.length === 0 ? "pass" : "fail",
  expected_targets: expected,
  discovered_targets: res.found.length,
  attempted_targets: res.found.length,
  completed_targets: res.matched,
  skipped_targets: 0,
  assertions_executed: res.found.length + 2,
  min_assertions: MIN_DISCOVERED,
  failures,
  artifacts: ["scripts/lone-ghost.mjs"],
  warnings: [],
  dimensions: { families: "btn, bk-btn, bo-btn", ...(BREAK ? { break: BREAK } : {}) },
  canary: {
    id: "a lone `btn ghost` injected into a scratch file",
    observed_failure: canaryCaught,
    caught_by: ["source scan"],
    findings: [canaryCaught ? "canary/Lone.jsx:1 reported" : "NOT reported — this check is blind"],
  },
});
console.log(`receipt ${path}`);
process.exit(failures.length ? 1 : 0);
