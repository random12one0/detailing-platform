// The accessible-name verdict for ROADMAP 14.24 part 3.
//
// Part 3's pass line: every control on the booking page's date step and the
// job record's pinned action bar announces a name that matches what is written
// on it. What Narrator speaks is the browser's accessible name, which the
// browser check (scripts/accessible-names.mjs) reads through the focused
// element's own aria snapshot — the same computation a screen reader speaks.
// This module is only the PASS/FAIL over that computed name, so the browser
// check, its canaries and the node suite all run the same rule.
//
// A control FAILS when:
//   - its name is empty (nothing is announced, or only the role is), or
//   - its name is the role read back as the name ("button" and nothing else), or
//   - its name does not contain the control's own visible words.
// An icon-only control (the month arrows) has no visible words, so the third
// rule is vacuous for it and its aria-label passes on the first two alone.
//
// "Contains" is WORD for word, not letter for letter: a day cell showing "3"
// that announces "Monday, October 13" fails, and so does "1" announced as
// "October 10" (review 2026-10-24; the first version used a substring match and
// passed both). A time stays one word ("9:05"), so "9" never matches "9:05".
// ONE allowance, and the check prints it rather than folding it in: a visible
// word of two or three LETTERS (a language code, EN / ES) may match the start of
// a name word ("English", "Español"). Numbers and longer words match whole.

const normalize = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[\s_]+/g, " ")
    .trim();

const wordsOf = (s) => normalize(s).split(/[^\p{L}\p{N}:]+/u).filter(Boolean);
const isAbbrev = (w) => /^\p{L}{2,3}$/u.test(w);

/**
 * @param {string} name the browser-computed accessible name
 * @param {string} visible the control's own visible words ("" when icon-only)
 * @returns {{ ok: true, abbreviations?: string[] } | { ok: false, reason: string }}
 */
export function controlNameVerdict(name, visible) {
  const nw = wordsOf(name);
  if (!nw.length) return { ok: false, reason: "empty-name" };
  if (nw.every((w) => w === "button")) return { ok: false, reason: "button-only" };
  const abbreviations = [];
  for (const w of wordsOf(visible)) {
    if (nw.includes(w)) continue;
    if (isAbbrev(w) && nw.some((x) => x.startsWith(w))) { abbreviations.push(w); continue; }
    return { ok: false, reason: "name-misses-visible" };
  }
  return abbreviations.length ? { ok: true, abbreviations } : { ok: true };
}

/** True when the verdict passes; the shape the check and the suite share. */
export const controlNameOk = (name, visible) => controlNameVerdict(name, visible).ok;

/** Server address precedence: CLI flag, environment, default. A reviewer
 * passing --base= must never silently measure another server. */
export function resolveBase(argv, env) {
  const flag = (argv || []).map(String).find((a) => a.startsWith("--base="));
  if (flag) return flag.slice("--base=".length);
  if (env && env.BASE) return env.BASE;
  return "http://localhost:5173";
}

/**
 * Parse one accessible-name snapshot line, e.g. `- button "Call":` or
 * `- link "Call":\n  - /url: tel:1`. Returns { role, name }, or null when the
 * line carries no named control (plain text nodes have no quoted name).
 */
export function parseSnapshotLine(line) {
  const first = String(line || "").split("\n")[0];
  const m = first.match(/-\s+(\S+)\s+"((?:[^"\\]|\\.)*)"/);
  if (!m) return null;
  return { role: m[1], name: m[2].replace(/\\"/g, '"') };
}
