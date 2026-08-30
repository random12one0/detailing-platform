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

  console.log("== outgoing: booking (light-first) ==");
  const bk = readFileSync("app/src/book/booking.css", "utf8");
  const g = (name) => bk.match(new RegExp(`--bk-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  const B = { bg: g("bg"), card: g("card") || g("surface"), lit: g("lit"), t: g("ink") || g("text"), mut: g("muted") };
  row("ink / bg", B.t, B.bg);
  row("ink / card", B.t, B.card);
  row("muted / card", B.mut, B.card);
  row("muted / lit", B.mut, B.lit);

  console.log("== outgoing: landing (dark only) ==");
  // FOUND 2026-08-30 while rewriting this file: every one of these used to
  // look for --bg and --panel, which landing.css has never defined — it
  // calls them --g and --p. The old test guarded each row with `if (token)`,
  // so all five silently did nothing and the landing page has had NO
  // contrast coverage since the check was written. A skipped row now says
  // so out loud, which is how this surfaced. Correct names below.
  const ld = readFileSync("app/src/landing/landing.css", "utf8");
  const gl = (name) => ld.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  const Ld = { g: gl("g"), p: gl("p"), lit: gl("lit"), i: gl("i"), i2: gl("i2"), i3: gl("i3"), ac: gl("ac"), acink: gl("acink"), ok: gl("ok") };
  row("ink / ground", Ld.i, Ld.g);
  row("ink-2 / ground", Ld.i2, Ld.g);
  row("ink-3 / ground (small labels)", Ld.i3, Ld.g, 3);
  row("ink / panel", Ld.i, Ld.p);
  row("ink-2 / panel", Ld.i2, Ld.p);
  row("ink / lit", Ld.i, Ld.lit);
  row("accent / ground", Ld.ac, Ld.g);
  row("accent / panel", Ld.ac, Ld.p);
  row("accent-ink on accent (button face)", Ld.acink, Ld.ac);
  row("success / panel", Ld.ok, Ld.p);
}

console.log(bad ? `\n${bad} FAILURES` : "\nall pairs pass");
process.exit(bad ? 1 : 0);
