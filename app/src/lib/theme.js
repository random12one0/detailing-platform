// Theme + brand-color engine.
//
// Two rules, enforced here and nowhere else:
//  1. The brand color (business_branding.primary_color) applies ONLY to the
//     --accent token — buttons, active tab, links, selected states. Page and
//     card backgrounds and body text always come from the theme.
//  2. The accent is contrast-corrected against the ACTIVE theme background:
//     if the chosen color fails a minimum contrast ratio, its lightness is
//     adjusted until it passes, and the text drawn on accent surfaces
//     (--accent-ink) is picked black or white by contrast, never assumed.

const THEME_BG = { dark: "#0b1220", light: "#f4f6fa" };
const DEFAULT_ACCENT = { dark: "#38bdf8", light: "#0284c7" };

// Accent-vs-background must clear WCAG's non-text component minimum (3:1);
// text ON the accent must clear the normal-text minimum (4.5:1).
const MIN_ACCENT_CONTRAST = 3;
const MIN_INK_CONTRAST = 4.5;

// Curated presets — every one passes contrast in BOTH themes after
// correction, so a detailer can pick one and move on.
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
// until the accent clears MIN_ACCENT_CONTRAST — a light brand color gets
// darkened on a light theme, lightened on a dark theme. Falls back to the
// theme default if the color is so extreme no step passes.
export function correctAccent(brandHex, mode) {
  const bg = THEME_BG[mode];
  let hex;
  try {
    hex = rgbToHex(hexToRgb(brandHex)); // normalizes #abc and bad casing
  } catch {
    return DEFAULT_ACCENT[mode];
  }
  if (contrastRatio(hex, bg) >= MIN_ACCENT_CONTRAST) return hex;

  const darkBg = luminance(hexToRgb(bg)) < 0.5;
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  // Move lightness toward the readable side in small steps.
  for (let i = 1; i <= 40; i++) {
    const nl = darkBg ? Math.min(0.95, l + i * 0.02) : Math.max(0.08, l - i * 0.02);
    const candidate = rgbToHex(hslToRgb([h, s, nl]));
    if (contrastRatio(candidate, bg) >= MIN_ACCENT_CONTRAST) return candidate;
  }
  return DEFAULT_ACCENT[mode];
}

// --- Application -----------------------------------------------------------

// Applies theme mode + brand accent to the document root. The ONLY place
// that writes color values from JS.
export function applyTheme(mode, brandHex) {
  const m = mode === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = m;
  const accent = correctAccent(brandHex || DEFAULT_ACCENT[m], m);
  let ink = inkFor(accent);
  // Belt and braces: if ink somehow fails on the corrected accent, force the
  // stronger of the two.
  if (contrastRatio(accent, ink) < MIN_INK_CONTRAST) {
    ink = contrastRatio(accent, "#ffffff") > contrastRatio(accent, "#000000") ? "#ffffff" : "#000000";
  }
  const root = document.documentElement.style;
  root.setProperty("--accent", accent);
  root.setProperty("--accent-ink", ink);
}

// Saved per user (per browser); defaults to dark.
const themeKey = (userId) => `dp-theme:${userId || "anon"}`;
export const loadThemeMode = (userId) => {
  try {
    return localStorage.getItem(themeKey(userId)) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};
export const saveThemeMode = (userId, mode) => {
  try {
    localStorage.setItem(themeKey(userId), mode);
  } catch { /* private mode etc. — theme just won't persist */ }
};
