// NO TRACKED MARKDOWN FILE CONTAINS A CREDENTIAL IN PLAIN TEXT.
//
// Run: node tests/no-credentials-in-markdown.test.mjs   (credential-free, one git call)
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS: THE REPO BROKE ITS OWN HARD RULE TWENTY-TWO TIMES, FOR WEEKS
// ---------------------------------------------------------------------------
// `CLAUDE.md`, under Hard rules: **"No password, token or key goes into a
// markdown file either — say where it lives, not what it is."**
//
// On 2026-09-25 that rule was broken in **8 files, 22 occurrences** — the seeded
// demo owner's login, a superseded one beside it, and a staff login. Some of it
// had been there since early September. **Nothing had ever checked, which is the
// entire reason it lasted:** a rule with no check behind it is a preference.
//
// It was found by accident, while auditing a different table.
//
// ---------------------------------------------------------------------------
// IT MATCHES SHAPES, NOT SPELLINGS — and that distinction is the point
// ---------------------------------------------------------------------------
// The first cleanup was keyed on the three values somebody already knew about.
// **It missed a fourth account's password**, which was found by reading a line
// the cleanup had just rewritten. `docs/gotchas.md` 78 in another coat: *a
// grep-based check coupled to a spelling rather than a behavior* passes the day
// somebody writes a different password. So this file lists no secret and knows
// none.
//
// **WHAT IT MATCHES** — each rule fires on its own and reports its own name:
//
//   pair          an email address, a slash, and a token
//   assignment    a `password` / `passwd` / `pwd` / `secret` cue, then a value
//   prefix        a provider's own key prefix plus enough following characters
//                 to be a real key rather than the prefix being discussed
//   longhex       32 or more hex characters in a row
//   worddigits    a short lowercase word joined to 2-6 digits, in backticks —
//                 the `<word><digits>` family this project keeps choosing
//
// **WHAT IT CANNOT SEE, stated so nobody trusts a green further than it goes:**
//
//   * **a password that is an ordinary word or phrase** with no cue near it.
//     A file saying *the password is hunter* is invisible to every rule above.
//   * **a value split across lines**, or assembled from pieces.
//   * **whether a matched token is LIVE or long dead.** It flags the shape; a
//     person decides. That is deliberate — a superseded password in a file is
//     still a rule violation and still misleads a reader.
//   * **anything outside tracked markdown.** Not code, not JSON, not an
//     untracked file, not a commit message, not a database column — and that
//     last one is not hypothetical: `platform_admins.note` holds a password in
//     plain text today, which this check would never see. ROADMAP's
//     `platform_admins` entry carries it.
//
// **So its honest claim is narrow: the shapes this project has actually used are
// gone from tracked markdown, and it will catch the next one of those.** It is
// not proof that no secret is written down anywhere.
//
// ---------------------------------------------------------------------------
// IT DECLARES WHAT IT EXPECTS TO SCAN
// ---------------------------------------------------------------------------
// A scanner that finds nothing because it read nothing prints the same word as a
// clean repo. § 1 fails if the file list is implausibly short, and the floor is
// written down rather than derived from the run.
//
// **This lives in `tests/` and by this repo's convention a repo-wide scanner
// would live in `scripts/` with a receipt.** It is here because `scripts/` was
// another session's on the night it was written. Whoever moves it should keep the
// declared floor and the both-directions sabotage.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

// ═══════════════════════════════════════════════════════════════════════════
// THE RULES
// ═══════════════════════════════════════════════════════════════════════════
const EMAIL = String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`;
// A token that could be a secret: 6-60 chars from a credential alphabet, and it
// must carry at least one digit. Plain English words are not credentials, and
// requiring a digit is what keeps "password is guessable" out of the findings.
const SECRETISH = '(?=[A-Za-z0-9!@#$%^&*_+=./-]{0,59}[0-9])[A-Za-z0-9!@#$%^&*_+=./-]{6,60}';

const RULES = [
  // `someone@example.com / <value>` — the credential-pair shape. Specific enough
  // to stand alone: nothing else in this repo writes an address, a slash and a
  // token carrying a digit on one line.
  ["pair", new RegExp("`?" + EMAIL + "`?\\s*/\\s*`?(" + SECRETISH + ")`?"), false],
  // Provider key prefixes, each needing real length after them, so that naming a
  // prefix in prose is not a finding.
  ["prefix", new RegExp(
    "(?:sk_live_|sk_test_|rk_live_|whsec_|sb_secret_|ghp_|gho_|AKIA|xox[baprs]-)" +
    "[A-Za-z0-9_-]{16,}"), false],
  ["jwt", /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./, false],
  // **THE THREE BELOW NEED A CREDENTIAL CUE ON THE SAME LINE, and the reason is
  // measured rather than cautious.** Without one they produced **38 findings and
  // every sampled one was innocent**: `time12` and `dateLong` are function names,
  // `ebc5967` is a commit sha, a 64-character hex string is a body digest, and
  // *"the password is written into a note"* is prose ABOUT a password. **A check
  // that cries 38 is the mail guard's "cries 40" again**, and the fix is the same
  // one — ask the narrower question. The cost is a bigger blind spot, stated in
  // the header.
  ["assignment", new RegExp(
    "(?:password|passwd|pwd|passphrase)\\b[^\\n]{0,24}?" +
    "(?:\\bis\\b|:|=|->|\\bto\\b)\\s*[`\"'](" + SECRETISH + ")[`\"']", "i"), true],
  ["longhex", /\b[0-9a-f]{32,}\b/, true],
  // The `<word><digits>` family, backticked. A shape, not a spelling: it knows no
  // particular password and catches the next one of this kind.
  ["worddigits", /`([a-z]{3,12}[0-9]{2,6})`/, true],
];

/** A credential cue on the line. The three loose rules above fire only with one. */
const CUE = /password|passwd|\bpwd\b|passphrase|credential|sign in|signed in|log in|logged in|\blogin\b|api key|secret key|access token|service role/i;

// Anything that marks a deliberate placeholder or a redaction. Kept SHORT on
// purpose: a broad allowlist is how a check stops checking.
const ALLOWED = [
  /\[redacted/i, /<password/i, /<secret/i, /<your/i, /YOUR_/, /\bxxx+\b/i,
  /\*{3,}/, /\bexample\.com\/?\s*$/i, /placeholder/i, /\bREDACTED\b/,
  // An env-var NAME is not a value.
  /^[A-Z][A-Z0-9_]{5,}$/,
];
const allowed = (hit) => ALLOWED.some((re) => re.test(hit));

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE FILE LIST, DECLARED
// ═══════════════════════════════════════════════════════════════════════════
console.log("1. the scan has subjects");

// Declared 2026-09-25 at 161 tracked markdown files. The floor is well below it
// so ordinary churn does not fail the run, and far above zero so a git call that
// returns nothing does.
const EXPECTED_MIN_FILES = 120;

const files = execFileSync("git", ["ls-files", "*.md"], { encoding: "utf8" })
  .split(/\r?\n/).filter(Boolean);

check(`1a it found at least ${EXPECTED_MIN_FILES} tracked markdown files`,
  files.length >= EXPECTED_MIN_FILES,
  `${files.length} files — a scan that reads nothing prints the same word as a clean repo`);

let lines = 0;
const findings = [];
for (const f of files) {
  let text;
  try { text = readFileSync(f, "utf8"); } catch { continue; }
  text.split(/\r?\n/).forEach((line, i) => {
    lines++;
    for (const [rule, re, needsCue] of RULES) {
      if (needsCue && !CUE.test(line)) continue;
      const m = re.exec(line);
      if (!m) continue;
      const hit = m[1] ?? m[0];
      if (allowed(line) || allowed(hit)) continue;
      // The finding names the place and the RULE. It does not print the value:
      // a check that echoes a secret into a log has moved it somewhere new.
      findings.push(`${f}:${i + 1}  [${rule}]  ${hit.length} chars`);
    }
  });
}
check("1b it read a plausible number of lines", lines >= 20000, `${lines} lines`);

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE RULES CAN FIRE — proved on invented strings, every run
// ═══════════════════════════════════════════════════════════════════════════
// None of these is a real credential. They exist so that a rule which stops
// matching cannot hide behind a clean repo.
console.log("\n2. every rule still fires on an invented example");

const CANARIES = [
  ["pair", "sign in as `nobody@invented.test` / `zqxwcv99`"],
  ["assignment", "the password is `nevermind77xz`"],
  ["prefix", "key sk_live_AAAAAAAAAAAAAAAAAAAA is set"],
  ["jwt", "token eyJAAAAAAAAAA.BBBBBBBBBB.CCCCCCCCCC"],
  ["longhex", "the api key 0123456789abcdef0123456789abcdef"],
  ["worddigits", "sign in with `zzqqwwx42`"],
];
for (const [want, sample] of CANARIES) {
  const [, re, needsCue] = RULES.find(([n]) => n === want);
  const fired = re.test(sample) && (!needsCue || CUE.test(sample));
  check(`2a-${want} fires`, fired, JSON.stringify(sample));
}
check("2b a redacted line is NOT a finding",
  allowed("`demo@example.test` / `[redacted: docs/platform-admins.md]`"));
check("2c an env var NAME is not a value", allowed("SUPABASE_SERVICE_ROLE_KEY"));
// WAS `ALLOWED.length <= 12` WITH 11 PATTERNS UNTIL 2026-10-02 — one unit of
// slack, in the one check whose subject is credentials. A ceiling with room in it
// means the next pattern lands without reddening anything, and the sentence this
// assertion already carried says why that is wrong: a broad allowlist is how a
// check stops checking. **An exact count cannot be grown by instalments.**
// Found by the inequality sweep over `tests/`; `docs/gotchas.md` 98.
const DECLARED_ALLOW_PATTERNS = 11;
check("2d the allowlist is EXACTLY the declared size, not merely under a cap",
  ALLOWED.length === DECLARED_ALLOW_PATTERNS,
  `${ALLOWED.length} patterns, declared ${DECLARED_ALLOW_PATTERNS} — a broad `
  + "allowlist is how a check stops checking, so this is an equality and not a "
  + "ceiling. Adding a pattern means moving this number in the same edit and "
  + "saying which real finding it was suppressing.");

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE VERDICT
// ═══════════════════════════════════════════════════════════════════════════
console.log("\n3. no tracked markdown file carries a credential");

check("3a no findings", findings.length === 0,
  findings.length
    ? `${findings.length}:\n       ${findings.join("\n       ")}\n       `
      + "Say where the login lives, never what it is — CLAUDE.md, Hard rules. "
      + "`docs/platform-admins.md` is the pattern."
    : "");

console.log(`\n   ${files.length} files · ${lines} lines · ${RULES.length} rules · `
  + `${findings.length} finding(s)`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
