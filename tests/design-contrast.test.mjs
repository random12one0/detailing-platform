// Every text/surface pair docs/design-system.md promises, measured.
//
// Rewritten 2026-08-30 for roadmap 1.5. It used to read "Raking Light"'s
// tokens out of app/src/theme.css; it now reads "The Thread"'s out of the
// reference page, because that is where the system currently lives — app/src
// is restyled in Phase 2. When theme.css starts defining --ink-0, this file
// reads it from there instead, automatically, and the old-palette block at
// the bottom can go.
//
// The old palettes are STILL checked in the meantime. They are what the
// product actually ships today, and a floor that stops being enforced during
// a months-long migration is a floor that fails silently.
//
//   node tests/design-contrast.test.mjs
import { readFileSync } from "node:fs";

const lum = (hex) => {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const fmt = (n) => n.toFixed(2).padStart(6);
let bad = 0;
const row = (name, fg, bg, min = 4.5) => {
  if (!fg || !bg) { console.log(`skip         ${name} (token missing)`); return; }
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${fmt(r)}  ${name}  (${fg} on ${bg}, min ${min})`);
};

// ── The system ──────────────────────────────────────────────────────────
// Source of truth: theme.css once it carries the new tokens, the reference
// page until then. Same regex either way, so the switch costs nothing.
const APP = "app/src/theme.css";
const REFERENCE = "docs/design-directions/5-the-thread.html";
const appCss = readFileSync(APP, "utf8");
const SOURCE = /--ink-0\s*:/.test(appCss) ? APP : REFERENCE;
const src = SOURCE === APP ? appCss : readFileSync(REFERENCE, "utf8");
const t = (name) => src.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{6})`))?.[1];

console.log(`== "The Thread" — tokens read from ${SOURCE} ==`);
const T = {
  ink0: t("ink-0"), ink1: t("ink-1"), ink2: t("ink-2"), ink3: t("ink-3"),
  fog: t("fog"), fog2: t("fog-2"), bone: t("bone"), bone2: t("bone-2"),
  ac: t("ac"), acDeep: t("ac-deep"),
  paper: t("paper"), paperInk: t("paper-ink"), paperFog: t("paper-fog"),
};
const missing = Object.entries(T).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.error(`FAIL  tokens not found: ${missing.join(", ")}`); bad++; }

// Body text, on every ground it can sit on.
row("bone / ink-0 (the ground)", T.bone, T.ink0);
row("bone / ink-1", T.bone, T.ink1);
row("bone / ink-2 (panel)", T.bone, T.ink2);
row("bone / ink-3 (highest surface)", T.bone, T.ink3);
row("bone-2 / ink-0", T.bone2, T.ink0);
row("bone-2 / ink-2", T.bone2, T.ink2);

// Secondary prose.
row("fog / ink-0", T.fog, T.ink0);
row("fog / ink-2", T.fog, T.ink2);

// THE TIGHT ONE. --fog-2 carries every 10-13px label, so it takes the full
// 4.5 body floor and not the 3:1 large-text one. It was lifted from #6B757A
// (4.22:1) for exactly this reason. On --ink-2 it measures 4.59 — there is
// almost no headroom, so darkening it at all breaks this.
row("fog-2 / ink-0 (10-13px labels)", T.fog2, T.ink0);
row("fog-2 / ink-2 (10-13px labels)", T.fog2, T.ink2);

// The accent carries figures and links, so it is text, not decoration.
row("accent / ink-0", T.ac, T.ink0);
row("accent / ink-2", T.ac, T.ink2);

// The light band.
row("paper-ink / paper", T.paperInk, T.paper);
row("paper-fog / paper", T.paperFog, T.paper);
row("ac-deep / paper", T.acDeep, T.paper);

// Not asserted, and deliberately: --line (1.40:1) and --line-2 (1.71:1)
// against the ground. The 3:1 floor is for non-text INTERACTIVE edges; these
// are decorative hairlines separating blocks that are already separated by
// space. If a hairline ever becomes the only signal that something is
// focused or selected, it moves up here and has to clear 3:1.

// ── The outgoing palettes, still shipped ────────────────────────────────
if (SOURCE !== APP) {
  console.log("\n== outgoing: dashboard dark (app/src/theme.css, Phase 2 replaces) ==");
  const D = { bg: "#0F1012", surface: "#18191C", lit: "#1E2024", t: "#F0F1F2", t2: "#A3A7AC", t3: "#8B9095", ac: "#57B2E8", ok: "#4FC08D", warn: "#DCA84E", bad: "#E2705F" };
  row("text / bg", D.t, D.bg);
  row("text-2 / surface", D.t2, D.surface);
  row("text-3 / surface (labels 11px bold)", D.t3, D.surface, 3);
  row("text / surface-lit", D.t, D.lit);
  row("text-2 / surface-lit", D.t2, D.lit);
  row("accent / bg (figures, links)", D.ac, D.bg);
  row("success / surface", D.ok, D.surface);
  row("warning / surface", D.warn, D.surface);
  row("danger / surface", D.bad, D.surface);

  console.log("== outgoing: dashboard light ==");
  const L = { bg: "#E7E7E5", surface: "#F3F3F1", lit: "#FCFCFB", t: "#151515", t2: "#4A4D49", t3: "#5D605C", ac: "#0D689D" };
  row("text / bg", L.t, L.bg);
  row("text-2 / surface", L.t2, L.surface);
  row("text-3 / surface (labels)", L.t3, L.surface, 3);
  row("text / surface-lit", L.t, L.lit);
  row("text-2 / surface-lit", L.t2, L.lit);
  row("accent / bg", L.ac, L.bg);
}


console.log("== booking page — DARK, restyled to \"The Thread\" in roadmap 2.1 ==");
// No longer an outgoing palette: this surface has already been restyled,
// and its tokens are the system's, scoped under .bk for the reason the
// stylesheet's header explains. The tenant's accent is NOT checked here —
// it is injected per business and corrected at runtime by lib/theme.js
// against --bk-bg, which is exactly why that ground has to be the value
// this file reads. tests for the correction itself live with theme.js.
const bk = readFileSync("app/src/book/booking.css", "utf8");
const g = (name) => bk.match(new RegExp(`--bk-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
const B = {
  bg: g("bg"), sunken: g("sunken"), card: g("card") || g("surface"), lit: g("lit"),
  t: g("ink") || g("text"), t2: g("text-2"), mut: g("muted"), bad: g("danger"),
};
// The ground the CSS paints and the ground lib/theme.js corrects the
// tenant accent against must be the same colour, or a brand colour can be
// corrected against one background and displayed on another.
const themeJs = readFileSync("app/src/lib/theme.js", "utf8");
const bookingBg = themeJs.match(/BOOKING_BG\s*=\s*"(#[0-9a-fA-F]{6})"/)?.[1];
if (!bookingBg || bookingBg.toUpperCase() !== (B.bg || "").toUpperCase()) {
  bad++;
  console.log(`FAIL         --bk-bg is ${B.bg}, lib/theme.js BOOKING_BG is ${bookingBg}`);
} else {
  console.log(`ok           --bk-bg matches lib/theme.js BOOKING_BG (${bookingBg})`);
}
row("ink / bg", B.t, B.bg);
row("ink / card", B.t, B.card);
row("ink / lit (the selected card)", B.t, B.lit);
row("ink-2 / card", B.t2, B.card);
row("muted / bg", B.mut, B.bg);
row("muted / sunken (input placeholders)", B.mut, B.sunken);
row("muted / card", B.mut, B.card);
row("muted / lit", B.mut, B.lit);
// --bad is the one token that is not in the reference page (that page has
// no error states), so the sixteen-token drift check in composition.test
// cannot cover it. It is checked against the DOCUMENT here instead.
const docBad = readFileSync("docs/design-system.md", "utf8")
  .match(/`--bad`\s*\|\s*`(#[0-9a-fA-F]{6})`/)?.[1];
if (!docBad || docBad.toUpperCase() !== (B.bad || "").toUpperCase()) {
  bad++;
  console.log(`FAIL         --bk-danger is ${B.bad}, docs/design-system.md --bad is ${docBad}`);
} else {
  console.log(`ok           --bk-danger matches docs/design-system.md --bad (${docBad})`);
}
row("danger / bg", B.bad, B.bg);
row("danger / card", B.bad, B.card);

console.log("== landing page — restyled to \"The Thread\" in roadmap 2.2 ==");
// This surface WAS an outgoing palette (--g / --p / --i, the old blue
// accent); it now carries the system, scoped under .ld for the reason
// landing.css's header explains — theme.css's :root still flips with the
// dashboard's light/dark switch until roadmap 2.3, and a prospect must not
// inherit whatever the last dashboard user picked on that device.
//
// The tokens keep the SYSTEM's names here, so this reads them the same way
// the reference page is read. The pairs below are the ones the page
// actually paints, not every combination the tokens allow.
const ld = readFileSync("app/src/landing/landing.css", "utf8");
const gl = (name) => ld.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
const Ld = {
  ink0: gl("ink-0"), ink1: gl("ink-1"), ink2: gl("ink-2"), ink3: gl("ink-3"),
  fog: gl("fog"), fog2: gl("fog-2"), bone: gl("bone"), bone2: gl("bone-2"),
  ac: gl("ac"), acDeep: gl("ac-deep"),
  paper: gl("paper"), paperInk: gl("paper-ink"), paperFog: gl("paper-fog"),
};
// ANTI-DRIFT. composition.test.mjs pins the reference page against the
// document; this pins the shipped stylesheet against both, so a colour
// cannot quietly become a slightly different colour on the way into the app.
for (const [name, want] of Object.entries({
  "ink-0": T.ink0, "ink-1": T.ink1, "ink-2": T.ink2, "ink-3": T.ink3,
  "fog": T.fog, "fog-2": T.fog2, "bone": T.bone, "bone-2": T.bone2,
  "ac": T.ac, "ac-deep": T.acDeep,
  "paper": T.paper, "paper-ink": T.paperInk, "paper-fog": T.paperFog,
})) {
  const got = gl(name);
  if (!want || !got || got.toUpperCase() !== want.toUpperCase()) {
    bad++;
    console.log(`FAIL         landing.css --${name} is ${got}, the system says ${want}`);
  }
}
console.log("ok           landing.css tokens match the system's values");
// The dark ground and the two surfaces on it.
row("bone / ink-0 (the ground)", Ld.bone, Ld.ink0);
row("bone / ink-1 (the last word)", Ld.bone, Ld.ink1);
row("bone / ink-3 (the lit card, the lead plan)", Ld.bone, Ld.ink3);
row("bone-2 / ink-0 (terms, questions)", Ld.bone2, Ld.ink0);
row("fog / ink-0 (every lede)", Ld.fog, Ld.ink0);
row("fog / ink-3 (the lit card's second line)", Ld.fog, Ld.ink3);
// The 10-13px ramp: .fine, .ix, the terms' numerals, the pin's cost label.
row("fog-2 / ink-0 (10-13px labels)", Ld.fog2, Ld.ink0);
row("fog-2 / ink-2 (10-13px labels on a panel)", Ld.fog2, Ld.ink2);
// The accent is words here — the "new booking" label, the open question's
// marker — so it takes the body floor, not the 3:1 fill one.
row("accent / ink-0", Ld.ac, Ld.ink0);
row("accent / ink-3 (the founding flag)", Ld.ac, Ld.ink3);
// The button face. #0A0D0F is written into .ld .cta rather than tokenised,
// exactly as the approved page has it, so it is asserted by hand.
row("button ink on bone (the primary call to action)", "#0A0D0F", Ld.bone);
// The light band, and the one lit row inside it.
row("paper-ink / paper", Ld.paperInk, Ld.paper);
row("paper-fog / paper", Ld.paperFog, Ld.paper);
row("paper / paper-ink (the lit comparison row)", Ld.paper, Ld.paperInk);
row("ac-deep / paper (the tick dots, non-text)", Ld.acDeep, Ld.paper, 3);
// NOT asserted from CSS, and it cannot be: the tenant-site mock puts its
// name and tagline ON a photograph. Law 9 — screenshot the text box with
// the words hidden, read the lightest pixel it is sitting on. Measured in
// roadmap 2.2 at 1440 and 392; the numbers and the method are in
// DECISIONS.md, "Roadmap 2.2".


console.log(bad ? `\n${bad} FAILURES` : "\nall pairs pass");
process.exit(bad ? 1 : 0);
