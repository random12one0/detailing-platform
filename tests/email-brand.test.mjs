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
  emailDarkBrandColors,
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

// --- 7. NO TEMPLATE MAY HARDCODE A COLOUR ---------------------------------
//
// RE-POINTED IN ROADMAP 2.18 (2026-09-03), DELIBERATELY AND WITH ITS INTENT
// INTACT, because the file it used to read no longer exists in that form.
//
// The original three checks were written after 2.12 found **eleven** headlines
// hardcoding `color:#ffffff` onto a brand-coloured band — 3.01–3.76:1 on a
// 4.5:1 floor, on all fourteen colours, not one preset passing. They asserted
// facts about a white-card-under-a-coloured-band layout: that `const header =`
// blocks existed, that `${brand.headerInk}` appeared at least fourteen times,
// and that the literal `max-width:600px; background-color:#ffffff;` was
// present. **2.18 replaced that layout with the product's own near-black
// ground, so all three describe a drawing that is gone.**
//
// TWO OF THEM FAILED LOUDLY AND ONE WENT SILENTLY VACUOUS — the `const header`
// regex matched nothing, so its assertion passed by having no subjects. That
// is *a skipped check reads exactly like a passing one*, the family this repo
// has paid for more than once, and it is the reason these were rewritten
// rather than deleted with a note.
//
// THE INTENT, RESTATED FOR THE ARCHITECTURE THAT EXISTS: a colour that lands
// on a surface must have been MEASURED against that surface. The new templates
// make that checkable in a stronger form than the old ones could — every
// colour now comes from a named token or from the brand, so a literal hex in a
// template is by definition a colour nobody measured.
{
  const kit = await readFile(new URL("../supabase/functions/_shared/emailKit.ts", import.meta.url), "utf8");
  const tpl = await readFile(new URL("../supabase/functions/_shared/emailTemplates.ts", import.meta.url), "utf8");

  // 7a — NO LITERAL HEX IN THE TEMPLATES. Stronger than the old rule, which
  // banned two specific values on one specific surface. Colours live in
  // `emailKit`'s `G` (the design system's tokens) or come off the brand;
  // anything else is unmeasured by construction.
  // COMMENTS ARE STRIPPED FIRST, because this file's own prose explains the
  // rule by naming the value it bans ("warm bone, and never #ffffff") and a
  // check that fails on its own documentation gets deleted rather than fixed.
  // The subject is CODE: a literal colour a template actually renders.
  const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
  const tplCode = code(tpl);
  const strayInTemplates = [...tplCode.matchAll(/#[0-9a-fA-F]{3,8}/g)];
  check("no template hardcodes a colour", strayInTemplates.length === 0,
    `${strayInTemplates.length}: ${strayInTemplates.map((m) => m[0]).join(", ")}`);

  // 7a-ii — THE TWO ACCENT VALUES MAY NOT SWAP JOBS. This is the old "paper
  // colour on the band" defect in the shape it can take now: `accent` is
  // corrected for 4.5:1 as WORDS and `accentFill` for 3:1 as a BACKGROUND, so
  // printing the fill as text, or painting the words as a background, is a
  // colour used against a ground it was never measured on.
  const fillAsText = [...kit.matchAll(/(?<!background-)color:\$\{brand\.accentFill\}/g)];
  check("the fill value is never printed as words", fillAsText.length === 0, `${fillAsText.length}`);
  const wordsAsFill = [...kit.matchAll(/background-color:\$\{brand\.accent\}(?!Fill|Ink)/g)];
  check("the words value is never painted as a background", wordsAsFill.length === 0, `${wordsAsFill.length}`);

  // 7a-iii — AND THE CHECK MUST HAVE SUBJECTS. The predecessor of 7a-ii
  // silently matched nothing once the layout changed. These three assert that
  // the things they are about actually exist, so the next layout change fails
  // loudly instead of going quiet.
  check("the ink on an accent fill is read from the brand",
    (kit.match(/\$\{brand\.accentInk\}/g) ?? []).length >= 1,
    `${(kit.match(/\$\{brand\.accentInk\}/g) ?? []).length} uses`);
  check("the accent is still painted as a fill somewhere",
    (kit.match(/background-color:\$\{brand\.accentFill\}/g) ?? []).length >= 2,
    `${(kit.match(/background-color:\$\{brand\.accentFill\}/g) ?? []).length} uses`);
  check("the templates still draw money through the kit",
    (tpl.match(/moneyBlock\(/g) ?? []).length >= 2,
    `${(tpl.match(/moneyBlock\(/g) ?? []).length} uses`);

  // 7a-iv — THE GROUND IS THE PRODUCT'S GROUND. The old check pinned a white
  // card because that was the paper every colour had been corrected against.
  // The equivalent fact now is that the shell paints `--ink-0` and declares it
  // to the client, and that the type is warm bone rather than pure white —
  // which is both a design law and, since Apple Mail inverts on a pure value,
  // a compatibility one.
  check("the shell paints the product's own ground",
    kit.includes('bgcolor="${G.ground}"') && kit.includes('name="color-scheme" content="dark"'));
  check("the dominant type value is warm bone, never pure white",
    kit.includes('bone: EMAIL_BONE') && !/bone:\s*"#f{3,6}"/i.test(kit));
}

// 7b-ii — THE FIXED GREYS, MEASURED ON BOTH GROUNDS THEY LAND ON.
// The predecessor banned three specific sub-floor greys from the old white
// card. These are the tokens the new ground uses, and they are MEASURED rather
// than blacklisted, which is the version that cannot go stale.
{
  const GROUNDS = { ground: "#0B0D0E", panel: "#171B1E" };
  const TYPE = { bone: "#F2F1EC", "bone-2": "#CFD2CE", fog: "#939CA1", "fog-2": "#7B858A" };
  for (const [gName, g] of Object.entries(GROUNDS)) {
    for (const [tName, t] of Object.entries(TYPE)) {
      check(`${tName} on ${gName} clears 4.5:1`,
        contrastRatio(t, g) >= 4.5, contrastRatio(t, g).toFixed(2));
    }
  }
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

// 7c — THE INK ON THE BUTTON, which is a DIFFERENT ground and is measured
// rather than assumed. The whole lesson of D1 is that a colour is only safe
// against the ground it was corrected for; the button's face is the accent
// FILL and its ink is chosen against that fill specifically.
for (const [name, hex] of [...PRESET_COLORS.map((c) => [c.name, c.hex]), ...EXTREMES]) {
  const { fill, fillInk } = emailDarkBrandColors(hex);
  check(`${name}: the button's ink clears 4.5:1 on its own fill`,
    contrastRatio(fillInk, fill) >= 4.5 - 1e-9,
    `${fillInk} on ${fill} = ${contrastRatio(fillInk, fill).toFixed(2)}`);
  // Apple Mail is ~60% of opens and inverts an email that names a pure value.
  for (const [what, v] of [["fill", fill], ["ink", fillInk]]) {
    check(`${name}: the ${what} is not a pure inversion trigger`,
      !/^#(fff(fff)?|000(000)?)$/i.test(v), v);
  }
}

console.log(process.exitCode ? `\n${n} checks, some FAILED` : `\nemail-brand: ${n} checks pass`);
