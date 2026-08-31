// Theme + brand-colour engine.
//
// THE ONLY FILE ALLOWED TO COMPUTE OR WRITE COLOUR FROM JS
// (docs/design-system.md, law 11 and §11). Everything else reads var(--…).
//
// Two changes landed here in roadmap 2.3, and both DELETED code:
//
//  1. THERE IS NO LIGHT THEME. The owner killed the dashboard's light/dark
//     switch on 2026-08-30 ("no light theme needed"). One ground, so there is
//     no mode argument, no THEME_BG map, no stored preference and no
//     `data-theme` attribute anywhere in the product.
//
//  2. THE DASHBOARD NO LONGER TAKES THE TENANT'S COLOUR. Law 11: "The house
//     accent is fixed; the tenant's accent is customer-facing only." This
//     file used to write the detailer's brand colour over --accent on the
//     dashboard root at every load. It does not any more — the dashboard is
//     one fixed house palette (the signal green), and the tenant's colour
//     appears where their CUSTOMERS see it: their booking page today, their
//     own site in phase 3. That is the owner's own reasoning, recorded in
//     docs/design-brief.md §B6b: a detailer "probably doesn't really care
//     about the admin dashboard colour scheme."
//
// What survives unchanged is the contrast correction itself, which is the
// actual value in this file: a brand colour is nudged in lightness until it
// clears its floor against the ground it will be PAINTED on, and the ink
// drawn on top of it is picked by measurement, never assumed.

// The dashboard's ground. Must match --ink-0 in theme.css, which is the
// system's own ground and now the value all three surfaces paint.
const DASHBOARD_BG = "#0B0D0E";        // --ink-0

// The house accent — fixed, not a fallback for a tenant colour. --ac.
export const HOUSE_ACCENT = "#38E08B";
// The accent at rest (--ac-deep). Used as the default SECOND brand colour a
// business starts with, so a new tenant is not handed a raw hex from a theme
// that no longer exists.
export const HOUSE_ACCENT_DEEP = "#0E5C36";

// The PUBLIC booking page's own ground and fallback accent. It is the same
// ground as the dashboard's now — every surface in the product paints
// --ink-0 — but it stays its own named constant on purpose: this one is what
// the tenant's colour is CORRECTED against, and it must track --bk-bg in
// app/src/book/booking.css, which is a different file with a different
// scope. design-contrast.test.mjs asserts that pairing.
const BOOKING_BG = "#0B0D0E";      // --ink-0
const BOOKING_ACCENT = HOUSE_ACCENT;

// Accent-vs-background must clear WCAG's non-text component minimum (3:1);
// the same colour used AS TEXT must clear the normal-text minimum (4.5:1).
const MIN_ACCENT_CONTRAST = 3;
const MIN_INK_CONTRAST = 4.5;

// Curated presets. Every one is corrected before it is painted, so a
// detailer can pick one and move on.
//
// STILL THE OLD EIGHT, and that is a known gap rather than a decision:
// docs/design-system.md "What this file does NOT settle" item 3 says the
// owner chose "a curated four to six, customer-facing only" and nobody has
// picked which four to six. Roadmap 2.4 needs them. Left alone here because
// narrowing the list is his call, not a side effect of a restyle.
export const PRESET_COLORS = [
  { name: "Sky", hex: "#0ea5e9" },
  { name: "Ocean", hex: "#2563eb" },
  { name: "Forest", hex: "#059669" },
  { name: "Ember", hex: "#ea580c" },
  { name: "Crimson", hex: "#dc2626" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Gold", hex: "#ca8a04" },
  { name: "Slate", hex: "#475569" },
];

// --- Color math (WCAG relative luminance / contrast) -----------------------

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
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

// Text color for anything drawn ON the accent: black or white, whichever
// actually contrasts. Never assumed from the theme.
export function inkFor(accentHex) {
  return contrastRatio(accentHex, "#ffffff") >= contrastRatio(accentHex, "#0b1220")
    ? "#ffffff"
    : "#0b1220";
}

// Nudge lightness (hue and saturation untouched) away from the background
// until the accent clears the given minimum — a light brand color gets
// darkened on a light theme, lightened on a dark theme. Falls back to the
// theme default if the color is so extreme no step passes.
function correctToward(brandHex, bg, min, fallback) {
  let hex;
  try {
    hex = rgbToHex(hexToRgb(brandHex)); // normalizes #abc and bad casing
  } catch {
    return fallback;
  }
  if (contrastRatio(hex, bg) >= min) return hex;

  const darkBg = luminance(hexToRgb(bg)) < 0.5;
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  // Move lightness toward the readable side in small steps.
  for (let i = 1; i <= 40; i++) {
    const nl = darkBg ? Math.min(0.95, l + i * 0.02) : Math.max(0.08, l - i * 0.02);
    const candidate = rgbToHex(hslToRgb([h, s, nl]));
    if (contrastRatio(candidate, bg) >= min) return candidate;
  }
  return fallback;
}

// A brand colour as a FILL — a button face, a selected day, a ring. WCAG's
// non-text minimum (3:1) keeps it as close to the owner's choice as
// legibility allows. Corrected against whichever ground it will be painted
// on; the caller says which, because getting that wrong is the exact bug
// this file exists to prevent.
export function correctAccent(brandHex, bg = BOOKING_BG) {
  return correctToward(brandHex, bg, MIN_ACCENT_CONTRAST, HOUSE_ACCENT);
}

// The same colour used AS WORDS — a running total, a link, a status line.
// Small text takes 4.5:1, so it is pushed further from the brand where it
// has to be. Crimson (#DC2626) is a real preset and measures 3.27:1 on the
// ground: it passes as a fill and fails as type. That is why there are two.
export function accentTextFor(brandHex, bg = BOOKING_BG) {
  return correctToward(brandHex, bg, MIN_INK_CONTRAST, HOUSE_ACCENT);
}

// The booking page's accent, as CSS custom properties. This is the ONE
// policy for public pages: the ground is the booking page's own, fixed and
// independent of any dashboard state, and the accent is corrected against
// THAT ground — the one the page actually paints.
//
// No mode argument: this surface is dark, full stop (owner, 2026-08-30). If
// a bespoke tenant site ever turns out light, roadmap phase 3 reopens it and
// the ground comes back as a parameter.
export function brandVarsFor(brandHex) {
  const brand = brandHex || BOOKING_ACCENT;
  const accent = correctAccent(brand, BOOKING_BG);
  let ink = inkFor(accent);
  if (contrastRatio(accent, ink) < MIN_INK_CONTRAST) {
    ink = contrastRatio(accent, "#ffffff") > contrastRatio(accent, "#000000") ? "#ffffff" : "#000000";
  }
  return {
    "--bk-accent": accent,
    "--bk-accent-ink": ink,
    "--bk-accent-text": accentTextFor(brand, BOOKING_BG),
    "--bk-bg": BOOKING_BG,
  };
}

// The ground a tenant's colour is previewed against in the dashboard's
// Appearance screen. Exported so that screen does not have to know a hex:
// what it is showing is what the CUSTOMER will see, and the customer sees
// it on the booking page, not here.
export const CUSTOMER_BG = BOOKING_BG;

// --- Application -----------------------------------------------------------

// NOTHING TO APPLY ANY MORE, AND THAT IS THE POINT. This function used to
// set data-theme on <html> and write three colour custom properties over the
// dashboard's tokens at every load. There is one ground now (no light theme)
// and one fixed house accent (law 11), so both jobs are gone and the tokens
// in theme.css are the whole story. Deleting the call sites rather than
// leaving an empty function is deliberate: an applyTheme() that does nothing
// is an invitation to start putting things back in it.
//
// The dashboard's ground is exported for anything that needs to measure
// against it — nothing does today.
export { DASHBOARD_BG };
