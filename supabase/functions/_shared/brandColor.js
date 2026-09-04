// THE EMAIL'S HALF OF THE COLOUR LAW, and the one place in this repo that is
// allowed to be a second implementation of it.
//
// `app/src/lib/theme.js` is the source of truth and says so at the top: it is
// "THE ONLY FILE ALLOWED TO COMPUTE OR WRITE COLOUR FROM JS". Email cannot
// import it — an edge function is a separate Deno bundle and the Supabase CLI
// will not follow an import out of `supabase/` — so the arithmetic is
// repeated here, deliberately, and pinned: `tests/email-brand.test.mjs`
// imports BOTH files and asserts they agree on all twelve presets and on the
// four extremes. Drift is a failing test, not a surprise in somebody's inbox.
//
// It is a plain .js module with no Deno API in it for exactly that reason —
// Node runs it in the test, Deno runs it in the function.
//
// WHAT IT FIXES (roadmap 2.11 step 6 stage 6; D1 on the step 4 defect list,
// and the worst one on it). The email had TWO tenant colours and no floor on
// either:
//
//   - `secondary_color` drew a 3px rule ON the `primary_color` header band.
//     Law 11 gives a tenant ONE accent, so "Your colour" now writes the same
//     hex to both columns — and that turned the rule into the same colour on
//     itself, 1:1, invisible. The rule is drawn in the band's own INK now,
//     which is the only value guaranteed to be readable on it.
//   - The band's title was hardcoded `#ffffff`. Sunflower and Silver are real
//     presets and white on either is unreadable. The ink is measured.
//   - The brand colour was printed as WORDS on white paper — the footer name,
//     every uppercase label, every link, the totals. Four of the twelve
//     presets are under even the 3:1 floor there; Silver is 1.36:1. It is
//     corrected to 4.5:1 against the paper, the same floor every other
//     surface in the product has.
//
// THE GROUND IS WHITE HERE, WHICH IS THE ONE THING THAT IS NOT LIKE THE REST
// OF THE PRODUCT. Everything else corrects a colour by LIGHTENING it away
// from a near-black ground; on paper the same function darkens it. That falls
// out of `correctToward` reading the ground's luminance rather than assuming
// a dark one, which is why the port is the whole function and not the half
// this file happens to use.

// The email card's body. Must match the `background-color:#ffffff` on the
// inner table in emailTemplates.ts's shell().
const PAPER = "#ffffff";
// Where a colour lands when it cannot be corrected at all. Slate-900, which
// is what the templates already used for body copy.
const PAPER_FALLBACK = "#0f172a";
const MIN_ACCENT_CONTRAST = 3;
const MIN_INK_CONTRAST = 4.5;

function hexToRgb(hex) {
  const h = String(hex).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`not a hex colour: ${hex}`);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
}

function luminance([r, g, b]) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(hexA, hexB) {
  const la = luminance(hexToRgb(hexA));
  const lb = luminance(hexToRgb(hexB));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

// Byte-for-byte the same steps as theme.js's correctToward: lightness only,
// 40 steps of 0.02, away from the ground. Hue and saturation never move, so a
// corrected colour is still recognisably the detailer's.
function correctToward(brandHex, bg, min, fallback) {
  let hex;
  try {
    hex = rgbToHex(hexToRgb(brandHex));
  } catch {
    return fallback;
  }
  if (contrastRatio(hex, bg) >= min) return hex;

  const darkBg = luminance(hexToRgb(bg)) < 0.5;
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  for (let i = 1; i <= 40; i++) {
    const nl = darkBg ? Math.min(0.95, l + i * 0.02) : Math.max(0.08, l - i * 0.02);
    const candidate = rgbToHex(hslToRgb([h, s, nl]));
    if (contrastRatio(candidate, bg) >= min) return candidate;
  }
  return fallback;
}

// What is drawn ON a fill: black or white, whichever actually contrasts, with
// the same 4.5:1 guard theme.js's accentTriple applies before it settles.
function inkFor(fillHex) {
  let ink = contrastRatio(fillHex, "#ffffff") >= contrastRatio(fillHex, "#0b1220")
    ? "#ffffff" : "#0b1220";
  if (contrastRatio(fillHex, ink) < MIN_INK_CONTRAST) {
    ink = contrastRatio(fillHex, "#ffffff") > contrastRatio(fillHex, "#000000") ? "#ffffff" : "#000000";
  }
  return ink;
}

// The three values a tenant's one colour turns into on an email.
//
//   band     the header band's fill. A background, so it takes the 3:1
//            non-text floor against the paper the card sits on — a band the
//            same colour as the page has no header.
//   bandInk  what is legible on that band: the title, and the 44px rule that
//            used to be the second brand colour.
//   onPaper  the same colour as WORDS on white — labels, links, totals,
//            the footer name. 4.5:1, because they are all small text.
export function emailBrandColors(brandHex, fallbackBand = PAPER_FALLBACK) {
  const band = correctToward(brandHex || fallbackBand, PAPER, MIN_ACCENT_CONTRAST, fallbackBand);
  return { band, bandInk: inkFor(band), onPaper: correctToward(brandHex || fallbackBand, PAPER, MIN_INK_CONTRAST, PAPER_FALLBACK) };
}

// ---------------------------------------------------------------------------
// THE DARK GROUND — roadmap 2.18, 2026-09-03.
//
// The owner looked at the rendered emails and said the obvious true thing:
// *"it looks exactly the same style as the email template i had before. and
// doesnt even match the style of the websites."* It did — a blue band on a
// white card is the shape every transactional email in the world has. The
// product's own world is The Thread: **one continuous cool-biased near-black
// ground the reader travels down**, warm bone type that is never `#fff`, and
// **one** sharp accent marking the thing that has landed.
//
// So the email gets a second pair of grounds, and this is ADDITIVE ON PURPOSE.
// `emailBrandColors` above is unchanged and still corrects against white paper,
// because `tests/email-brand.test.mjs` — 138 checks — pins it that way against
// `app/src/lib/theme.js`. A rebuild that edits that function turns a green
// suite red for a reason that has nothing to do with the rebuild.
//
// WHICH GROUND, AND WHY IT IS NOT `--ink-0`. The design system's own rule,
// arrived at three separate times and written up each time: **correct against
// the lightest surface THAT VALUE can land on**, never the one the page
// paints. The accent lands on the ground AND on a lifted panel, and the panel
// is lighter, so the panel decides. `--ink-2` `#171B1E` is the lightest
// surface anything in these templates sits on.
//
// TWO VALUES, TWO FLOORS, same as everywhere else in this product: as WORDS a
// colour is small text and takes 4.5:1; as a FILL it is a background and takes
// the 3:1 non-text minimum. For the house green they are one colour; for a
// tenant's crimson they are not.
const GROUND = "#0B0D0E";        // --ink-0, the ground everything sits on
const PANEL = "#171B1E";         // --ink-2, the lightest thing an accent lands on
const BONE = "#F2F1EC";          // --bone. Warm. NEVER #ffffff — a named tell.

// PURE BLACK AND PURE WHITE ARE INVERSION TRIGGERS, and this is the one place
// a compatibility fact reaches into the colour maths. Apple Mail — ~60% of all
// opens — leaves an email alone in dark mode UNLESS it finds `#ffffff` or
// `#000000`, which it treats as "this email has no opinion, invert it". Nudging
// one step off both values is the standard defence and it costs nothing
// measurable: `#ffffff` → `#fefefe` moves a contrast ratio by ~0.1.
//
// It is applied HERE, in the dark wrapper, and NOT in `inkFor` — that function
// is shared with the white-paper path above, which `tests/email-brand.test.mjs`
// pins across twelve presets and four extremes. The two paths do not have the
// same problem and must not share the fix.
const deTrigger = (hex) => {
  const h = String(hex).toLowerCase();
  if (h === "#ffffff" || h === "#fff") return "#fefefe";
  if (h === "#000000" || h === "#000") return "#010101";
  return hex;
};

export function emailDarkBrandColors(brandHex) {
  const seed = brandHex || BONE;
  const fill = correctToward(seed, PANEL, MIN_ACCENT_CONTRAST, BONE);
  return {
    text: deTrigger(correctToward(seed, PANEL, MIN_INK_CONTRAST, BONE)),
    fill: deTrigger(fill),
    fillInk: deTrigger(inkFor(fill)),
  };
}

export { BONE as EMAIL_BONE, GROUND as EMAIL_GROUND, PANEL as EMAIL_PANEL, PAPER, PAPER_FALLBACK };
