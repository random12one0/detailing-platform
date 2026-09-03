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
import { readFile } from "node:fs/promises";
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

// --- 7. NO TEMPLATE MAY HARDCODE A COLOUR ONTO THE HEADER BAND -------------
// Roadmap 2.12, and it is the D1 defect one line further on. Stage 6 gave the
// band a measured ink and used it for the brand NAME and the 44px rule — and
// every template's own header block went on painting its headline
// `color:#ffffff` and its small label `color:#e2e8f0` onto that same band.
//
// MEASURED BEFORE FIXING, because "it looks white-ish" is not a finding:
// white on the corrected band is **3.01–3.76:1 on all fourteen colours**, and
// #e2e8f0 is 2.44–3.05:1, against the 4.5:1 text floor. Not one preset passed.
// Sky's band is #0d9edf and its headline was 3.01:1.
//
// The buttons are deliberately NOT included: they are white on `onPaper`,
// which is corrected for 4.5:1 against white paper, and they measure
// 4.50–4.96:1. Test 7c asserts that rather than trusting it — the whole
// lesson of D1 is that a colour is only safe against the ground it was
// corrected for, and these two are different grounds.
//
// 7a is a SOURCE check rather than a colour one, because that is the only
// form that stops the next template being written the same way.
{
  const src = await readFile(new URL("../supabase/functions/_shared/emailTemplates.ts", import.meta.url), "utf8");
  // Every remaining literal white must be a button or the card, i.e. followed
  // by a background-color of its own.
  // Every legitimate remaining white is on a ground of its OWN — a button
  // (`background-color:` right after it) or the pill and the card, which name
  // their own background earlier in the same style string. Anything else is a
  // colour landing on the band without having been measured against it.
  const stray = [...src.matchAll(/(?<!background-)color:#(?:ffffff|e2e8f0)\b(?!; background-color:)/g)]
    .filter((m) => !/background-color:\$\{brand\.accentColor\}[^"]*$/.test(
      src.slice(Math.max(0, m.index - 220), m.index)));
  check("no template paints a hardcoded colour on the header band",
    stray.length === 0, `${stray.length} left: ${stray.map((m) => m[0]).join(", ")}`);
  // 7a-ii — THE OTHER HALF, and the one that measured worst: a colour
  // corrected for WHITE PAPER printed ON the band. "Invoice / Receipt" and the
  // owner email's own first line were `brand.accentColor` on `brand.band` —
  // **1.20 to 1.57:1 on all twelve presets**, which is D1's "the same colour
  // on itself" wearing different clothes. `accentColor` belongs on paper.
  const headers = [...src.matchAll(/const header =[\s\S]*?`;/g)].map((m) => m[0]).join("\n");
  const onBand = [...headers.matchAll(/(?<!background-)color:\$\{brand\.accentColor\}/g)];
  check("no header block prints the PAPER colour on the band",
    onBand.length === 0, `${onBand.length} left`);
  check("the band's ink is still read from the brand",
    (src.match(/\$\{brand\.headerInk\}/g) ?? []).length >= 14,
    `${(src.match(/\$\{brand\.headerInk\}/g) ?? []).length} uses`);
  // The card is white and must stay white — it is paper, not a band, and a
  // regex written for the headers took it out once already.
  check("the card itself is still white paper",
    src.includes("max-width:600px; background-color:#ffffff;"));
}

// 7b — the floor itself, on every preset and every extreme.
for (const [name, hex] of [...PRESET_COLORS.map((c) => [c.name, c.hex]), ...EXTREMES]) {
  const { band, bandInk } = emailBrandColors(hex);
  check(`${name}: the header's ink clears 4.5:1 on its own band`,
    contrastRatio(bandInk, band) >= 4.5,
    `${bandInk} on ${band} = ${contrastRatio(bandInk, band).toFixed(2)}`);
}

// 7b-ii — THE FIXED GREYS, which are not the tenant's colour and were under
// the floor anyway. Measured while looking at the quote email: the fine print
// was **2.40:1** on the info card and 2.56:1 on paper, and the small labels
// were 4.46:1 — a hair under, which is the kind of number nobody catches by
// eye. They carry real sentences ("Nothing is charged until you say yes",
// "This total is an estimate"), so they are text and take the text floor.
// Read from the source so a new template cannot reintroduce the old values.
{
  const src = await readFile(new URL("../supabase/functions/_shared/emailTemplates.ts", import.meta.url), "utf8");
  for (const dead of ["#94a3b8", "#64748b", "#a8b4c0"]) {
    check(`the sub-floor grey ${dead} is gone from the templates`, !src.includes(dead));
  }
  // Both grounds, because the same grey is printed on the white card and on
  // the #f4f8fb info card, and only the fainter one decides.
  for (const grey of ["#687281", "#63738a", "#6a7179"]) {
    for (const ground of ["#ffffff", "#f4f8fb"]) {
      check(`${grey} clears 4.5:1 on ${ground}`,
        contrastRatio(grey, ground) >= 4.5, contrastRatio(grey, ground).toFixed(2));
    }
  }
}

// 7c — and the button's white, which is a DIFFERENT ground and is fine.
for (const [name, hex] of PRESET_COLORS.map((c) => [c.name, c.hex])) {
  const { onPaper } = emailBrandColors(hex);
  check(`${name}: white on the button still clears 4.5:1`,
    contrastRatio("#ffffff", onPaper) >= 4.5,
    `${contrastRatio("#ffffff", onPaper).toFixed(2)}`);
}

console.log(process.exitCode ? `\n${n} checks, some FAILED` : `\nemail-brand: ${n} checks pass`);
