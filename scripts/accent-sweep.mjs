// Measure every tenant accent preset on every ground the dashboard paints.
//
// Written when design-system law 11 was rewritten (owner, 2026-08-30, roadmap
// 2.3 reopened): the tenant's colour now paints their DASHBOARD as well as
// their booking page, and the law states the cost plainly — "every dashboard
// screen now has to survive an arbitrary tenant colour… it has to be swept at
// the extremes". Screenshots show what it LOOKS like; this shows what it
// MEASURES, which is the half an eye cannot do.
//
//   node scripts/accent-sweep.mjs            # 12 presets + the extremes
//   node scripts/accent-sweep.mjs '#DC2626'  # one arbitrary colour
//
// Credential-free — it imports the same functions the app calls, so it cannot
// drift from what actually ships.
//
// THE HOLE THIS FOUND, on the day it was written. lib/theme.js used to correct
// the dashboard accent against --ink-0 (#0B0D0E), the ground. But a dashboard
// accent does not stay on the ground: .cal-cell.today sits in a panel on
// --ink-2, and .pill / .chip.active print --accent-text on a tinted
// panel. Those are LIGHTER, so contrast on them is LOWER than the number the
// correction guaranteed. SIX of the eight presets failed the 4.5:1 text floor
// on a panel; violet and slate failed even the 3:1 FILL floor on --ink-3.
//
// The fix was to correct against --ink-3 instead — the lightest surface an
// accent can land on, so clearing it there clears it everywhere. This script
// is what found that and is what keeps it fixed: it exits non-zero if any
// preset falls under either floor on any of the three grounds.
//
// GREW IN ROADMAP 2.4 (2026-08-30) in three ways, all of which the item asked
// for and none of which need a credential:
//   1. THE EXTREMES ARE SWEPT EVERY RUN, not only when someone remembers to
//      pass a hex. 2.4 owns "neon and near-black" — the two a preset list
//      cannot cover — so they are a fixed list here and they fail the build
//      like anything else.
//   2. Every colour prints its HUE FAMILY, so the preset list's coverage is
//      visible rather than asserted in a doc.
//   3. The classifier itself is checked against a table at the bottom. It is
//      the only runnable check `hueFamily` has, and it belongs with the sweep
//      rather than in a twelfth test file nobody runs.
import {
  PRESET_COLORS, correctAccent, accentTextFor, contrastRatio, hueFamily, brandVarsFor,
  DASHBOARD_ACCENT_BG, DASHBOARD_TEXT_TINT, dashboardTextBg,
} from "../app/src/lib/theme.js";
import { writeReceipt } from "./receipt.mjs";

// **THIS GATE WROTE NO RECEIPT AND PRINTED NO SUBJECT COUNT UNTIL 2026-09-21 -
// docs/silences.md section A.** It ended on `SWEEP CLEAN - dashboard, booking
// page and hue families`, which is the same sentence whether it compared 286
// pairs or zero. A gate that writes no receipt cannot be told apart from a
// gate that did not run, and that is this repo's single most repeated and most
// expensive failure.
const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

// **THE EXPECTATION IS DECLARED, NOT COUNTED FROM WHAT ARRIVED.**
// `PRESET_COLORS` is the APP's own list, imported from `app/src/lib/theme.js`,
// so it can change without this file noticing.
//
// **18 IS COUNTED FROM SOURCE, NOT FROM A RUN — re-derived 2026-09-21 after
// Andrew's manager set the rule.** `PRESET_COLORS` in `app/src/lib/theme.js`
// declares **12** entries and `EXTREMES` below declares **6**. The first
// version of this constant was read off a run's own output, which gives the
// same 18 today and would have followed the number DOWN the day a preset
// stopped being swept — a declaration that quietly tracks the thing it is
// supposed to be checking. The rule: a constant from the REPO is a
// declaration, because the repo is what the world is supposed to match; a
// constant from the live system or from the run's own output is not. A preset added or removed makes the two disagree and
// fails the receipt until somebody re-sweeps and moves the number deliberately.
const EXPECTED_ACCENTS = 18;
let assertions = 0;
let attempted = 0;
let completed = 0;
const receiptFailures = [];

// A tinted ground, the way color-mix(in srgb, <accent> N%, <ground>) makes it.
const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const tint = (accentHex, groundHex, p) => "#" + hex2(accentHex)
  .map((v, i) => Math.round(v * p + hex2(groundHex)[i] * (1 - p)))
  .map((v) => v.toString(16).padStart(2, "0")).join("");

// The colours no curated list can contain, swept as first-class cases.
// Near-black is the one that actually moves: it has no saturation to keep, so
// it comes back a grey, and the Appearance screen says so in words.
const EXTREMES = [
  { name: "neon grn", hex: "#00FF00" },
  { name: "neon mag", hex: "#FF00FF" },
  { name: "neon cyan", hex: "#00FFFF" },
  { name: "black", hex: "#000000" },
  { name: "near-blk", hex: "#0A0A0A" },
  { name: "white", hex: "#FFFFFF" },
];

const GROUNDS = [
  ["ink-0", "#0B0D0E", "the ground — most of the dashboard"],
  ["ink-2", "#171B1E", "a panel — .cal-cell.today and .pill sit here"],
  ["ink-3", "#1E2327", "highest surface — and what the FILL is corrected against"],
];

// GROWN AGAIN IN ROADMAP 2.6. The three grounds above are all UNTINTED, and
// --accent-text is almost never printed on one: it lands on a panel that has
// been tinted with the accent itself, which is lighter than the panel and so
// gives LESS contrast than the correction just guaranteed. Same shape of hole
// as the two this script already exists for, one surface further in. Four
// sites, taken straight out of theme.css — change a percentage there and this
// fails with the number.
const TINTED = [
  [0.12, "#171B1E", ".tabbar button.active — theme.css:539"],
  [0.11, "#1E2327", ".pill.completed — theme.css:655 (.badge, its byte-identical twin, was deleted 2026-09-02)"],
  [0.15, "#1E2327", ".chip.active / .choice.on — theme.css:617, 1088"],
  [DASHBOARD_TEXT_TINT, "#1E2327", "…and the same two on HOVER — the lightest ground there is"],
];
const FILL_MIN = 3, TEXT_MIN = 4.5;

// **ANY ARGUMENT USED TO BE READ AS A COLOUR, AND A TYPO NARROWED THE SWEEP TO
// ONE - 2026-09-21.** `process.argv[2]` was taken as a hex with no validation,
// so `node scripts/accent-sweep.mjs --lite` swept a single colour named
// "custom" whose hex was the string `--lite`, compared 12 pairs instead of 288,
// and printed `SWEEP CLEAN`. Found by breaking this file on purpose: the
// sabotage flag itself was swallowed as a colour. **A gate that quietly
// measures one eighteenth of its subject on a typo is the section A disease
// with a different spelling.**
const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const argHex = positional[0];
if (argHex !== undefined && !/^#[0-9a-f]{6}$/i.test(argHex)) {
  console.error(`accent-sweep: "${argHex}" is not a colour. Pass #RRGGBB, or no argument to `
    + `sweep all ${EXPECTED_ACCENTS}. Nothing was measured.`);
  process.exit(2);
}
const colors = argHex
  ? [{ name: "custom", hex: argHex }]
  // `--break=none` sweeps nothing, which is what a broken import of
  // PRESET_COLORS would look like: the old summary line printed CLEAN for it.
  : (BREAK === "none" ? [] : [...PRESET_COLORS, ...EXTREMES]);

let failures = 0;
console.log(`accent sweep — corrected against ${DASHBOARD_ACCENT_BG}\n`);

for (const { name, hex } of colors) {
  attempted++;
  const fill = correctAccent(hex, DASHBOARD_ACCENT_BG);
  const text = accentTextFor(hex, dashboardTextBg(hex));
  const moved = fill.toLowerCase() !== hex.toLowerCase();
  const { label } = hueFamily(hex);
  console.log(`${name.padEnd(9)} ${hex}  ${label.padEnd(14)} ->  fill ${fill}${moved ? " (corrected)" : ""}   text ${text}`);

  for (const [gname, g, why] of GROUNDS) {
    const f = contrastRatio(fill, g), t = contrastRatio(text, g);
    const fok = f >= FILL_MIN, tok = t >= TEXT_MIN;
    assertions += 2;
    if (!fok || !tok) failures++;
    console.log(
      `   on ${gname}  fill ${f.toFixed(2)} ${fok ? "ok " : "FAIL"} (min ${FILL_MIN})` +
      `   text ${t.toFixed(2)} ${tok ? "ok " : "FAIL"} (min ${TEXT_MIN})   ${why}`,
    );
  }
  for (const [p, g, why] of TINTED) {
    const ground = tint(fill, g, p);
    const t = contrastRatio(text, ground), tok = t >= TEXT_MIN;
    assertions++;
    if (!tok) failures++;
    console.log(
      `   on ${ground} (${(p * 100).toFixed(0)}% of the accent over ${g})` +
      `   text ${t.toFixed(2)} ${tok ? "ok " : "FAIL"} (min ${TEXT_MIN})   ${why}`,
    );
  }
  completed++;
  console.log("");
}

console.log(failures === 0
  ? "dashboard: every colour clears both floors on all three grounds and all four tints"
  : `dashboard: ${failures} ground/floor combinations under the floor — see FAIL above`);

// --- the booking page, which corrects against its own grounds --------------
// The sweep above measures the DASHBOARD's values. The public booking page
// computes its own through brandVarsFor, and until roadmap 2.4 it corrected
// the fill against the ground — which left `.bk-card.selected`'s accent ring
// under the 3:1 floor on the panel it is actually drawn on for Violet (2.78),
// Slate (2.62), a black pick (2.56) and a deep navy (2.51). That ring is the
// only thing telling a customer which service they picked, so it is measured
// here every run now, on the two lifted surfaces it can land on.
if (!argHex) {
  console.log("\nbooking page — brandVarsFor, on the surfaces it paints\n");
  const BK = [
    ["bk-bg", "#0B0D0E", "the ground — where the two prices sit"],
    ["cal cell", "#111314", ".bk-cal .cell — white at 2.5% over the ground"],
    ["bk-lit", "#1E2327", ".bk-card.selected's ring — the worst case"],
  ];
  for (const { name, hex } of [...PRESET_COLORS, ...EXTREMES]) {
    const v = brandVarsFor(hex);
    const fill = v["--bk-accent"], text = v["--bk-accent-text"], ink = v["--bk-accent-ink"];
    console.log(`${name.padEnd(9)} ${hex}  ->  fill ${fill}   text ${text}   ink ${ink}`);
    for (const [gname, g, why] of BK) {
      const f = contrastRatio(fill, g), ok = f >= FILL_MIN;
      assertions++;
      if (!ok) failures++;
      console.log(`   fill on ${gname.padEnd(8)} ${f.toFixed(2)} ${ok ? "ok " : "FAIL"} (min ${FILL_MIN})   ${why}`);
    }
    // The text value is corrected against the ground on purpose — it is only
    // ever printed on borderless rows there — so it is checked only there.
    const t = contrastRatio(text, "#0B0D0E"), tok = t >= TEXT_MIN;
    assertions++;
    if (!tok) failures++;
    console.log(`   text on bk-bg    ${t.toFixed(2)} ${tok ? "ok " : "FAIL"} (min ${TEXT_MIN})   the two prices, on the ground`);
    // What is drawn ON the fill has to clear the text floor against it.
    const i = contrastRatio(fill, ink), iok = i >= TEXT_MIN;
    assertions++;
    if (!iok) failures++;
    console.log(`   ink on the fill  ${i.toFixed(2)} ${iok ? "ok " : "FAIL"} (min ${TEXT_MIN})   button and chip labels\n`);
  }
}

// --- the classifier's own check -------------------------------------------
// hueFamily decides what the dashboard CALLS a colour, so a band edge that
// drifts turns a truthful sentence into a wrong one silently. These are the
// edges worth pinning: the wrap-around at 0 degrees (a red must not come back
// "pink"), and saturation, which is what stops #0A0A0A being called "a red"
// because its hue happens to round to zero.
if (!argHex) {
  const EXPECT = [
    ["#DC2626", "red"], ["#E11D48", "red"], ["#FF0000", "red"],
    ["#EA580C", "orange"], ["#EAB308", "yellow"], ["#059669", "green"],
    ["#0D9488", "teal"], ["#0EA5E9", "blue"], ["#2563EB", "blue"],
    ["#7C3AED", "purple"], ["#DB2777", "pink"],
    ["#000000", "neutral"], ["#0A0A0A", "neutral"],
    ["#D4D7DA", "neutral"], ["#FFFFFF", "neutral"], ["#808080", "neutral"],
  ];
  assertions += EXPECT.length;
  const wrong = EXPECT.filter(([hex, want]) => hueFamily(hex).family !== want);
  for (const [hex, want] of wrong) {
    console.log(`hueFamily FAIL  ${hex} -> ${hueFamily(hex).family}, expected ${want}`);
  }
  failures += wrong.length;
  console.log(wrong.length === 0
    ? `hueFamily agrees on all ${EXPECT.length} pinned colours`
    : `${wrong.length} hue-family classifications wrong`);
}

// --- THE CANARY -----------------------------------------------------------
// **WHAT COULD SILENTLY BREAK HERE IS THE DETECTOR, NOT THE COLOURS.** Every
// line above is `contrastRatio(x, y) >= FLOOR`. If `contrastRatio` started
// returning 21 for everything, or the floors were read as 0, every pair would
// clear and the sweep would print CLEAN over a product that had gone black on
// black. Nothing above can notice that, because a passing comparison and a
// broken comparison produce the same output.
//
// So the run is handed a pair that CANNOT legally pass - a colour against
// itself, contrast exactly 1.00 - through the same call and the same floor
// constants. **If that clears the floor, every green line above is void.**
const CANARY_GROUND = "#0B0D0E";
const canaryRatio = contrastRatio(CANARY_GROUND, CANARY_GROUND);
const canaryFloors = BREAK === "blind" ? [0, 0] : [FILL_MIN, TEXT_MIN];
const canaryCaught = !(canaryRatio >= canaryFloors[0]) && !(canaryRatio >= canaryFloors[1]);
assertions += 2;
console.log("");
console.log(`canary  ${CANARY_GROUND} on itself -> ${canaryRatio.toFixed(2)}  `
  + (canaryCaught
    ? `caught: below both floors (${FILL_MIN} / ${TEXT_MIN}), so the comparison can fail`
    : "NOT CAUGHT — a pair at 1.00 cleared the floor, so every line above is void"));

// --- SUBJECT COUNTS, AND ZERO IS A FAILURE --------------------------------
if (EXPECTED_ACCENTS !== colors.length && !argHex) {
  receiptFailures.push(`ACCENT COUNT MOVED: the app offers ${colors.length} accent(s) `
    + `(PRESET_COLORS + EXTREMES) and EXPECTED_ACCENTS declares ${EXPECTED_ACCENTS}. `
    + `A preset added or removed has not been swept by anybody - re-sweep and move the `
    + `number deliberately.`);
}
if (colors.length === 0) {
  receiptFailures.push("ZERO ACCENTS WERE SWEPT. Nothing was compared against any floor, "
    + "so this run proves nothing. This is NOT a clean sweep.");
}
if (completed === 0) {
  receiptFailures.push("ZERO ACCENTS REACHED A VERDICT, so no ground or tint was measured.");
}
if (failures > 0) {
  receiptFailures.push(`${failures} ground/floor combination(s) are under the floor — see FAIL above`);
}

// --- THE RECEIPT, so this is GRADED rather than read ----------------------
// It ended on `SWEEP CLEAN` and exited 0, and that sentence was identical
// whether it compared 286 pairs or none. Now the count is on the receipt and
// `receipt.mjs` grades it, which is the only thing that tells a run that
// examined everything from a run that did not happen.
const { path: receiptPath } = writeReceipt({
  check_id: "accent-sweep",
  started_at,
  status: receiptFailures.length === 0 && canaryCaught ? "pass" : "fail",
  expected_targets: argHex ? 1 : EXPECTED_ACCENTS, // declared above, before the run
  discovered_targets: colors.length,               // what the app actually offers
  attempted_targets: attempted,                    // accents this run walked
  completed_targets: completed,                    // accents that reached a verdict
  skipped_targets: 0,
  assertions_executed: assertions,
  // The real run makes 286; a floor just under it means losing a whole section
  // fails the receipt rather than shrinking it quietly.
  min_assertions: 250,
  failures: receiptFailures,
  artifacts: ["scripts/accent-sweep.mjs"],
  warnings: BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : [],
  dimensions: {
    grounds: GROUNDS.map((g) => g[0]),
    tinted_sites: TINTED.length,
    floors: { fill: FILL_MIN, text: TEXT_MIN },
    corrected_against: DASHBOARD_ACCENT_BG,
  },
  canary: {
    id: "a colour on itself scores 1.00 and must be refused by both floors",
    observed_failure: canaryCaught,
    caught_by: canaryCaught ? ["contrast-floor"] : [],
    findings: canaryCaught
      ? [`[contrast-floor] ${CANARY_GROUND} on itself measured ${canaryRatio.toFixed(2)} and was `
        + `refused by both floors, so a failing comparison is one this run can actually make`]
      : [`[contrast-floor] NOT CAUGHT — ${canaryRatio.toFixed(2)} cleared the floor, so every `
        + `"ok" above is a comparison that cannot fail and this run proves nothing`],
  },
});

// The only line that speaks for the whole run. Every section above reports its
// own half, and a per-section "all clear" printed before the next section runs
// is how a green-looking sweep hides a red one.
console.log("");
const clean = receiptFailures.length === 0 && canaryCaught;
console.log(clean
  ? `SWEEP CLEAN — ${completed} accent(s), ${assertions} comparisons, canary caught. Receipt ${receiptPath}`
  : `SWEEP FAILED — ${receiptFailures.length} problem(s), canary ${canaryCaught ? "caught" : "MISSED"}. Receipt ${receiptPath}`);
for (const f of receiptFailures) console.log("  · " + f);
process.exit(clean ? 0 : 1);
