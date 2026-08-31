// Measure every tenant accent preset on every ground the dashboard paints.
//
// Written when design-system law 11 was rewritten (owner, 2026-08-30, roadmap
// 2.3 reopened): the tenant's colour now paints their DASHBOARD as well as
// their booking page, and the law states the cost plainly — "every dashboard
// screen now has to survive an arbitrary tenant colour… it has to be swept at
// the extremes". Screenshots show what it LOOKS like; this shows what it
// MEASURES, which is the half an eye cannot do.
//
//   node scripts/accent-sweep.mjs            # the eight presets
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
import { PRESET_COLORS, correctAccent, accentTextFor, contrastRatio, DASHBOARD_ACCENT_BG } from "../app/src/lib/theme.js";

const GROUNDS = [
  ["ink-0", "#0B0D0E", "the ground — most of the dashboard"],
  ["ink-2", "#171B1E", "a panel — .cal-cell.today, .pill, .badge sit here"],
  ["ink-3", "#1E2327", "highest surface — the worst case, and what is corrected against"],
];
const FILL_MIN = 3, TEXT_MIN = 4.5;

const argHex = process.argv[2];
const colors = argHex ? [{ name: "custom", hex: argHex }] : PRESET_COLORS;

let failures = 0;
console.log(`accent sweep — corrected against ${DASHBOARD_ACCENT_BG}\n`);

for (const { name, hex } of colors) {
  const fill = correctAccent(hex, DASHBOARD_ACCENT_BG);
  const text = accentTextFor(hex, DASHBOARD_ACCENT_BG);
  const moved = fill.toLowerCase() !== hex.toLowerCase();
  console.log(`${name.padEnd(8)} ${hex}  ->  fill ${fill}${moved ? " (corrected)" : ""}   text ${text}`);

  for (const [gname, g, why] of GROUNDS) {
    const f = contrastRatio(fill, g), t = contrastRatio(text, g);
    const fok = f >= FILL_MIN, tok = t >= TEXT_MIN;
    if (!fok || !tok) failures++;
    console.log(
      `   on ${gname}  fill ${f.toFixed(2)} ${fok ? "ok " : "FAIL"} (min ${FILL_MIN})` +
      `   text ${t.toFixed(2)} ${tok ? "ok " : "FAIL"} (min ${TEXT_MIN})   ${why}`,
    );
  }
  console.log("");
}

console.log(
  failures === 0
    ? "every preset clears both floors on all three grounds"
    : `${failures} ground/floor combinations under the floor — see FAIL above`,
);
process.exit(failures === 0 ? 0 : 1);
