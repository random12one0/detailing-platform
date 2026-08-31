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
// --ink-2, and .pill / .badge / .chip.active print --accent-text on a tinted
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
  ["ink-2", "#171B1E", "a panel — .cal-cell.today, .pill, .badge sit here"],
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
  [0.11, "#1E2327", ".pill.completed / .badge.completed — theme.css:655, 915"],
  [0.15, "#1E2327", ".chip.active / .choice.on — theme.css:617, 1088"],
  [DASHBOARD_TEXT_TINT, "#1E2327", "…and the same two on HOVER — the lightest ground there is"],
];
const FILL_MIN = 3, TEXT_MIN = 4.5;

const argHex = process.argv[2];
const colors = argHex
  ? [{ name: "custom", hex: argHex }]
  : [...PRESET_COLORS, ...EXTREMES];

let failures = 0;
console.log(`accent sweep — corrected against ${DASHBOARD_ACCENT_BG}\n`);

for (const { name, hex } of colors) {
  const fill = correctAccent(hex, DASHBOARD_ACCENT_BG);
  const text = accentTextFor(hex, dashboardTextBg(hex));
  const moved = fill.toLowerCase() !== hex.toLowerCase();
  const { label } = hueFamily(hex);
  console.log(`${name.padEnd(9)} ${hex}  ${label.padEnd(14)} ->  fill ${fill}${moved ? " (corrected)" : ""}   text ${text}`);

  for (const [gname, g, why] of GROUNDS) {
    const f = contrastRatio(fill, g), t = contrastRatio(text, g);
    const fok = f >= FILL_MIN, tok = t >= TEXT_MIN;
    if (!fok || !tok) failures++;
    console.log(
      `   on ${gname}  fill ${f.toFixed(2)} ${fok ? "ok " : "FAIL"} (min ${FILL_MIN})` +
      `   text ${t.toFixed(2)} ${tok ? "ok " : "FAIL"} (min ${TEXT_MIN})   ${why}`,
    );
  }
  for (const [p, g, why] of TINTED) {
    const ground = tint(fill, g, p);
    const t = contrastRatio(text, ground), tok = t >= TEXT_MIN;
    if (!tok) failures++;
    console.log(
      `   on ${ground} (${(p * 100).toFixed(0)}% of the accent over ${g})` +
      `   text ${t.toFixed(2)} ${tok ? "ok " : "FAIL"} (min ${TEXT_MIN})   ${why}`,
    );
  }
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
      if (!ok) failures++;
      console.log(`   fill on ${gname.padEnd(8)} ${f.toFixed(2)} ${ok ? "ok " : "FAIL"} (min ${FILL_MIN})   ${why}`);
    }
    // The text value is corrected against the ground on purpose — it is only
    // ever printed on borderless rows there — so it is checked only there.
    const t = contrastRatio(text, "#0B0D0E"), tok = t >= TEXT_MIN;
    if (!tok) failures++;
    console.log(`   text on bk-bg    ${t.toFixed(2)} ${tok ? "ok " : "FAIL"} (min ${TEXT_MIN})   the two prices, on the ground`);
    // What is drawn ON the fill has to clear the text floor against it.
    const i = contrastRatio(fill, ink), iok = i >= TEXT_MIN;
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
  const wrong = EXPECT.filter(([hex, want]) => hueFamily(hex).family !== want);
  for (const [hex, want] of wrong) {
    console.log(`hueFamily FAIL  ${hex} -> ${hueFamily(hex).family}, expected ${want}`);
  }
  failures += wrong.length;
  console.log(wrong.length === 0
    ? `hueFamily agrees on all ${EXPECT.length} pinned colours`
    : `${wrong.length} hue-family classifications wrong`);
}

// The only line that speaks for the whole run. Every section above reports its
// own half, and a per-section "all clear" printed before the next section runs
// is how a green-looking sweep hides a red one.
console.log("");
console.log(failures === 0
  ? "SWEEP CLEAN — dashboard, booking page and hue families"
  : `SWEEP FAILED — ${failures} problems, see FAIL above`);
process.exit(failures === 0 ? 0 : 1);
