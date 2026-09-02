// THE PIN BETWEEN THE PRODUCT'S COLOUR ENGINE AND THE EMAIL'S COPY OF IT.
//
// `app/src/lib/theme.js` says at the top that it is "THE ONLY FILE ALLOWED TO
// COMPUTE OR WRITE COLOUR FROM JS", and it means it — every drift bug this
// repo has paid for came from a second place doing the same arithmetic
// slightly differently. Email had to break that rule: an edge function is a
// separate Deno bundle and the Supabase CLI will not follow an import out of
// `supabase/`. So `supabase/functions/_shared/brandColor.js` repeats it, and
// this file is the reason that is allowed — it imports BOTH and asserts they
// agree, colour for colour, on the twelve presets and on the four extremes no
// preset list can cover.
//
// Credential-free, like composition / design-contrast / money-export /
// client-list. Run it from the repo root.
//
// WHAT IT WOULD HAVE CAUGHT, which is the point of writing it rather than a
// comment: D1 on step 4's defect list. "Your colour" wrote `primary_color`
// and `secondary_color` as two independent hexes; the email drew a 3px rule
// in the second ON a band of the first, and once law 11 made them one colour
// that rule became the same colour on itself — 1:1, invisible. Four of the
// twelve presets also printed the business name under even the 3:1 floor on
// white paper. Tests 3 and 4 below are those two failures, stated as floors.

import assert from "node:assert/strict";
import {
  emailBrandColors, contrastRatio, PAPER, PAPER_FALLBACK,
} from "../supabase/functions/_shared/brandColor.js";
import { PRESET_COLORS, contrastRatio as themeContrast } from "../app/src/lib/theme.js";

let n = 0;
const check = (name, cond, detail = "") => {
  n++;
  if (!cond) {
    console.error(`FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
    process.exitCode = 1;
  }
};

// The extremes accent-sweep.mjs uses, for the same reason it uses them: a
// preset list cannot cover what a detailer types into the custom picker.
const EXTREMES = [
  ["neon", "#00FF00"], ["pure black", "#000000"],
  ["near-black", "#0A0A0A"], ["pure white", "#FFFFFF"],
];
const ALL = [...PRESET_COLORS.map((c) => [c.name, c.hex]), ...EXTREMES];

// --- 1. The two implementations agree on the maths they share --------------
for (const [name, hex] of ALL) {
  const a = contrastRatio(hex, PAPER);
  const b = themeContrast(hex, PAPER);
  check(`${name}: both files measure the same contrast on paper`,
    Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
}

// --- 2. The band is a band ------------------------------------------------
// It is the only place the detailer's colour appears at size in an email, and
// a band the same value as the card it sits on is not a header. 3:1, the
// non-text floor every other fill in the product takes.
for (const [name, hex] of ALL) {
  const { band } = emailBrandColors(hex);
  const r = contrastRatio(band, PAPER);
  check(`${name}: the header band clears 3:1 on the paper`, r >= 3 - 1e-9, `${r.toFixed(2)}:1`);
}

// --- 3. THE 1:1 RULE, WHICH IS D1 ITSELF ----------------------------------
// The band's title and its 44px rule are both drawn in `bandInk`, so both are
// measured against the band rather than assumed to be white or to be a second
// brand colour. 4.5:1 because the title is text.
for (const [name, hex] of ALL) {
  const { band, bandInk } = emailBrandColors(hex);
  const r = contrastRatio(band, bandInk);
  check(`${name}: the band's own ink clears 4.5:1 on it`, r >= 4.5 - 1e-9, `${r.toFixed(2)}:1`);
  check(`${name}: the rule on the band is not the band`, band.toLowerCase() !== bandInk.toLowerCase());
}

// --- 4. Words on white ----------------------------------------------------
// Labels, links, the footer name and the totals. All small text on the card,
// so 4.5:1 — the floor the dashboard and the booking page already have and
// the email did not.
for (const [name, hex] of ALL) {
  const { onPaper } = emailBrandColors(hex);
  const r = contrastRatio(onPaper, PAPER);
  check(`${name}: the brand colour as words on paper clears 4.5:1`, r >= 4.5 - 1e-9, `${r.toFixed(2)}:1`);
}

// --- 5. Correction moves lightness only -----------------------------------
// The whole reason a corrected colour is still the detailer's colour. If this
// ever fails, the port has diverged from theme.js's `correctToward` in the
// one way that would not show up as a contrast failure.
const hueOf = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return null;
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? ((b - r) / d + 2) : ((r - g) / d + 4);
  return Math.round(h * 60) % 360;
};
for (const [name, hex] of PRESET_COLORS.map((c) => [c.name, c.hex])) {
  const { onPaper } = emailBrandColors(hex);
  if (onPaper === PAPER_FALLBACK) continue;   // gave up; nothing to compare
  const a = hueOf(hex), b = hueOf(onPaper);
  check(`${name}: correcting for paper keeps the hue`,
    a === null || b === null || Math.abs(a - b) <= 2, `${a} -> ${b}`);
}

// --- 6. A missing colour still sends ---------------------------------------
// buildBrand passes the house default when a business has no branding row.
// It must not throw and must not produce "undefined" in a style attribute.
for (const bad of [null, undefined, "", "not a colour", "#12"]) {
  const c = emailBrandColors(bad);
  check(`a ${JSON.stringify(bad)} colour still yields three hexes`,
    [c.band, c.bandInk, c.onPaper].every((v) => /^#[0-9a-f]{6}$/i.test(v)), JSON.stringify(c));
}

console.log(process.exitCode ? `\n${n} checks, some FAILED` : `\nemail-brand: ${n} checks pass`);
