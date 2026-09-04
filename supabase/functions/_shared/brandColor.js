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
// THE EMAIL HAS TWO GROUNDS AND BOTH ARE LIVE (roadmap 2.18). `emailBrandColors`
// corrects against the LIGHT one — what every client shows by default — and
// `emailDarkBrandColors` against the dark one, which Apple Mail swaps in under
// `prefers-color-scheme`. One function serves both because `correctToward`
// reads the ground's luminance rather than assuming a dark one: it lightens a
// colour away from near-black and darkens the same colour away from paper.
// That is why the port was the whole function rather than the half the old
// white-card design happened to use.

// THE LIGHT EMAIL'S GROUND — and it is NOT `#ffffff` any more.
//
// It was, while the email was a white card under a coloured band. Roadmap 2.18
// replaced that with The Thread's own two grounds, and pure white left with it
// for two independent reasons: the design system names `#ffffff` as a tell
// ("warm off-white, never paper white"), and **Apple Mail treats a pure value
// as permission to invert the whole email**.
//
// THE VALUE IS THE PANEL, NOT THE PAPER, AND THAT IS THE LAW BEING APPLIED
// RATHER THAN BENT. `docs/design-system.md` says to correct against "the
// lightest surface THAT VALUE can land on" — but that sentence was written for
// a DARK ground, where lighter means less contrast. **The general form is:
// correct against the surface that gives the LEAST contrast**, which on a dark
// ground is the lightest surface and on a light ground is the DARKEST one. The
// light email paints `#EFEEE7` paper and a `#E7E5DC` panel; a darkened accent
// has less room on the panel, so the panel decides.
//
// Getting this backwards is how the same defect has arrived four times.
const PAPER = "#E7E5DC";
// Where a colour lands when it cannot be corrected at all: the light design's
// dominant ink, so an uncorrectable accent reads as ordinary type rather than
// as a smudge.
const PAPER_FALLBACK = "#12161A";
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

// The three values a tenant's one colour turns into on the LIGHT email.
//
//   band     the accent as a FILL — the button face, the accent rule. A
//            background, so it takes the 3:1 non-text floor.
//   bandInk  what is legible ON that fill. Measured, never assumed.
//   onPaper  the accent as WORDS — the total, links, the footer name. 4.5:1,
//            because every one of them is small text.
//
// The names are the old white-card ones and are kept deliberately: they are
// what `tests/email-brand.test.mjs` reads, and renaming them would churn a
// hundred checks to say the same thing. What each one MEANS is above.
// PURE BLACK AND PURE WHITE ARE INVERSION TRIGGERS, and this is the one place a
// compatibility fact reaches into the colour maths. Apple Mail — ~60% of all
// opens — leaves an email alone in dark mode UNLESS it finds `#ffffff` or
// `#000000`, which it reads as "this email has no opinion, invert it". Nudging
// one step off both is the standard defence and costs nothing measurable:
// `#ffffff` → `#fefefe` moves a contrast ratio by about 0.1.
//
// **Applied to BOTH palettes.** It was in the dark wrapper only until
// 2026-09-03, and the light path reached pure white anyway — crimson's and
// violet's button ink are `#ffffff`, and a tenant who picks black gets
// `#000000` as their accent. `render-emails.mjs` asserts the absence in both.
const deTrigger = (hex) => {
  const h = String(hex).toLowerCase();
  if (h === "#ffffff" || h === "#fff") return "#fefefe";
  if (h === "#000000" || h === "#000") return "#010101";
  return hex;
};

export function emailBrandColors(brandHex, fallbackBand = PAPER_FALLBACK) {
  const band = correctToward(brandHex || fallbackBand, PAPER, MIN_ACCENT_CONTRAST, fallbackBand);
  return {
    band: deTrigger(band),
    bandInk: deTrigger(inkFor(band)),
    onPaper: deTrigger(correctToward(brandHex || fallbackBand, PAPER, MIN_INK_CONTRAST, PAPER_FALLBACK)),
  };
}

/** The light email's grounds, named so the templates and the tests agree. */
const PAPER_GROUND = "#EFEEE7";  // --paper

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
// THE EMAIL HAS TWO GROUNDS AND BOTH ARE LIVE. `emailBrandColors` above is the
// LIGHT one — what every client sees by default — and this is the DARK one,
// which Apple Mail swaps in under `prefers-color-scheme`.
//
// **Light is the default rather than dark, and that is a measured decision, not
// a taste one.** Gmail's app inverts an already-dark email and cannot be told
// not to — no meta tag, no media query, confirmed by the owner on a real
// device. Measured on our own palette: the accent as words falls to **1.99:1**
// after that inversion and the button label to **1.77:1**, against a 4.5:1
// floor. It is unfixable by palette, because inversion barely moves a
// mid-lightness accent while swinging its near-black ink to near-white.
// Light-first sidesteps it entirely: Gmail darkens a light email competently,
// which is the one thing its algorithm is actually tuned for.
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
export function emailDarkBrandColors(brandHex) {
  const seed = brandHex || BONE;
  const fill = correctToward(seed, PANEL, MIN_ACCENT_CONTRAST, BONE);
  return {
    text: deTrigger(correctToward(seed, PANEL, MIN_INK_CONTRAST, BONE)),
    fill: deTrigger(fill),
    fillInk: deTrigger(inkFor(fill)),
  };
}

export { BONE as EMAIL_BONE, GROUND as EMAIL_GROUND, PANEL as EMAIL_PANEL, PAPER, PAPER_FALLBACK, PAPER_GROUND };
