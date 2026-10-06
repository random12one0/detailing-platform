// NO TRACKED TEXT FILE CONTAINS A CREDENTIAL IN PLAIN TEXT.
//
// Run: node tests/no-credentials-in-tracked-text.test.mjs   (credential-free, one git call)
//
// **WAS `no-credentials-in-markdown.test.mjs` UNTIL 2026-10-06 (ROADMAP 14.25).** Its
// net was `git ls-files *.md`, so a password sitting in a `.mjs` comment passed every
// green run. The six rules are unchanged; only the POPULATION widened, to every
// tracked file that is not binary (markdown, code, JSON, SQL, HTML, CSS, YAML,
// config, text). Renamed because a check called *-in-markdown invites exactly the
// assumption that let it through. `--break=md-only` restores the old population so
// the plants in § 2 can be watched going red.
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
//   * **anything git does not track.** Not an untracked or ignored file (`.env`
//     is OUT on purpose: it is a working credential doing its job), not a commit
//     message, not a database column — and that
//     last one is not hypothetical: `platform_admins.note` holds a password in
//     plain text today, which this check would never see. ROADMAP's
//     `platform_admins` entry carries it.
//   * **a password in CODE with no digit in it.** `password: "somewordhere"`
//     matches no rule, because the three loose rules need a digit (that is what
//     keeps prose out). Measured at 1a03cdd (2026-10-06): 22 lines come back from
//       git grep -nEi -I "(password|passwd|pwd|secret|api_?key|service_?role|access_?token)w*[\"']?s*[:=]s*[\"'`][^\"'`[:space:]${}]{6,}[\"'`]" 1a03cdd -- . ':!*.md'
//     (the working tree adds this header's own example, so run it against the
//     commit). 5 are the declared fixtures below, the rest are test fixtures or UI
//     keys, and **none of the ones read matches a value in `.env`** (boolean
//     comparison, nothing printed). Not built into a rule: 22 findings to argue with
//     for little gain, and 14.25 said to keep the six rules as they are.
//   * **base64 or otherwise encoded values**, and anything over a line break.
//
// **So its honest claim is narrow: the shapes this project has actually used are
// gone from tracked text files, except the declared exceptions in § 3, and it will
// catch the next one of those.** It is
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
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
// THE SCANNER — one set of functions, used by the real tree AND by the plants
// ═══════════════════════════════════════════════════════════════════════════
// The plants in § 2 run through THESE functions, not a copy of them
// (`docs/gotchas.md` 95: a canary aimed at a copy can never bite the real thing).

// Binary by extension. Anything else is read and judged by a NUL byte, so a new
// file type is scanned by default rather than skipped by default.
const BINARY = /\.(jpe?g|png|webp|gif|ico|woff2?|ttf|otf|pdf|mp4|webm|zip)$/i;

// `--break=md-only` puts the OLD population back (markdown and nothing else).
// It exists so the plants can be shown biting: with it on, § 2's plants vanish
// from the net and the run goes red.
const BREAK_MD_ONLY = process.argv.includes("--break=md-only");

/** Which of `paths` get read. Returns the text files plus anything unreadable. */
function population(paths) {
  const files = [], unreadable = [];
  for (const f of paths) {
    if (BREAK_MD_ONLY && !f.endsWith(".md")) continue;
    if (BINARY.test(f)) continue;
    let buf;
    try { buf = readFileSync(f); } catch { unreadable.push(f); continue; }
    if (buf.includes(0)) continue;
    files.push(f);
  }
  return { files, unreadable };
}

/** Findings for one file: `{ file, line, rule, len }`. Never carries the value. */
function scanFile(f) {
  const out = [];
  readFileSync(f, "utf8").split(/\r?\n/).forEach((line, i) => {
    for (const [rule, re, needsCue] of RULES) {
      if (needsCue && !CUE.test(line)) continue;
      const m = re.exec(line);
      if (!m) continue;
      const hit = m[1] ?? m[0];
      if (allowed(line) || allowed(hit)) continue;
      out.push({ file: f, line: i + 1, rule, len: hit.length });
    }
  });
  return out;
}

const place = (x) => `${x.file}:${x.line}  [${x.rule}]  ${x.len} chars`;

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE FILE LIST, DECLARED
// ═══════════════════════════════════════════════════════════════════════════
console.log("1. the scan has subjects");

// Declared 2026-09-25 at 161 tracked markdown files. The floor is well below it
// so ordinary churn does not fail the run, and far above zero so a git call that
// returns nothing does.
const EXPECTED_MIN_FILES = 120;
// Declared 2026-10-06 when the net widened from markdown to every tracked TEXT
// file (ROADMAP 14.25). Discovery floors, so they stay floors (gotchas 98).
const EXPECTED_MIN_TEXT_FILES = 600;
// Every extension 14.25 names must actually be in the population, or a pattern
// that stopped matching would read as a clean tree.
const MUST_COVER = [".md", ".mjs", ".js", ".jsx", ".ts", ".json", ".yml", ".sql", ".html", ".css", ".txt"];

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split(/\r?\n/).filter(Boolean);
const { files, unreadable } = population(tracked);
const mdFiles = files.filter((f) => f.endsWith(".md"));

check(`1a it found at least ${EXPECTED_MIN_FILES} tracked markdown files`,
  mdFiles.length >= EXPECTED_MIN_FILES,
  `${mdFiles.length} files — a scan that reads nothing prints the same word as a clean repo`);
check(`1a2 it found at least ${EXPECTED_MIN_TEXT_FILES} tracked text files in all`,
  files.length >= EXPECTED_MIN_TEXT_FILES,
  `${files.length} files — markdown alone was the old net`);
const missingExt = MUST_COVER.filter((e) => !files.some((f) => f.endsWith(e)));
check("1a3 every extension 14.25 names is in the population",
  missingExt.length === 0, "none scanned: " + missingExt.join(" "));
check("1a4 no tracked file was unreadable (a skipped file reads as a clean one)",
  unreadable.length === 0, unreadable.join(", "));

let lines = 0;
const findings = [];
for (const f of files) {
  lines += readFileSync(f, "utf8").split(/\r?\n/).length;
  findings.push(...scanFile(f));
}
check("1b it read a plausible number of lines", lines >= 20000, `${lines} lines`);

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE RULES CAN FIRE — proved on invented strings, every run
// ═══════════════════════════════════════════════════════════════════════════
// None of these is a real credential. They exist so that a rule which stops
// matching cannot hide behind a clean repo. **Each sample is built from two
// pieces on purpose:** written whole, it would be a finding on this very file
// and the scanner would have to exempt itself — which is the blind spot a
// self-exemption always becomes.
console.log("\n2. every rule still fires on an invented example");

const CANARIES = [
  ["pair", "sign in as `nobody@invented.test` / `" + "zqxwcv99`"],
  ["assignment", "the password is `" + "nevermind77xz`"],
  ["prefix", "key sk_live_" + "AAAAAAAAAAAAAAAAAAAA is set"],
  ["jwt", "token eyJ" + "AAAAAAAAAA.BBBBBBBBBB.CCCCCCCCCC"],
  ["longhex", "the api key " + "0123456789abcdef" + "0123456789abcdef"],
  ["worddigits", "sign in with `" + "zzqqwwx42`"],
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

// ── THE PLANTS (ROADMAP 14.25) ─────────────────────────────────────────────
// The rules above were proved on strings. **This proves the NET**: a credential
// -shaped literal is written into a `.mjs`, a `.json` and a `.yml`, the real
// `population()` and `scanFile()` are run over them, and each must come back
// naming its own file and line. The planted values are throwaways that exist
// nowhere else. `--break=md-only` turns this section red, which is the proof it
// bites.
const scratch = mkdtempSync(join(tmpdir(), "cred-plants-"));
const PLANTS = [
  ["plant.mjs", "// padding\nconst note = 'sign in with `" + "zzqqwwx42` to look';\n", 2],
  ["plant.json", '{\n  "a": 1,\n  "note": "the password is `' + 'nevermind77xz`"\n}\n', 3],
  ["plant.yml", "a: 1\nb: 2\nc: 3\nnote: sk_live_" + "AAAAAAAAAAAAAAAAAAAA\n", 4],
];
try {
  const paths = PLANTS.map(([name, body]) => {
    const p = join(scratch, name);
    writeFileSync(p, body);
    return p;
  });
  const planted = population([...tracked.slice(0, 5), ...paths]);
  for (const [i, [name, , wantLine]] of PLANTS.entries()) {
    const got = planted.files.includes(paths[i]) ? scanFile(paths[i]) : [];
    check(`2e plant in ${name} goes RED and names its line`,
      got.length >= 1 && got.every((x) => x.file === paths[i]) && got.some((x) => x.line === wantLine),
      got.length ? got.map(place).join("; ") : "the plant was not even in the population");
  }
  // Removed, then green: the same population with the plants gone.
  for (const p of paths) rmSync(p);
  const after = population(paths.filter((p) => existsSync(p)));
  check("2f plants removed: nothing left to find", after.files.length === 0);
} finally { rmSync(scratch, { recursive: true, force: true }); }

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE VERDICT
// ═══════════════════════════════════════════════════════════════════════════
// Two classes of known hit, each an EXACT count keyed by file and rule, so a
// new hit in the same file still reddens, and a hit that goes away reddens too
// until its line here is removed (gotchas 98: declared debt is an equality).
// The value is never written here and is never printed.
//
//  FIXTURE — an account the test creates for itself, on the fake database, in a
//  business it deletes again. Checked 2026-10-06 against every value in `.env`
//  (boolean only, nothing printed): **none matches**, so none opens a real login.
//  Moving them to env would break `ensureUser`, which signs back in with the
//  same password after a 422 "already exists".
//
//  OPEN — a real login, in a file, waiting on a ruling. Printed on every run
//  so a green cannot be read as a clean tree.
const DECLARED = [
  ["tests/booking-engine.test.mjs", "assignment", 1, "FIXTURE"],
  ["tests/tenant-isolation.test.mjs", "assignment", 1, "FIXTURE"],
  ["tests/staff-roles.test.mjs", "assignment", 3, "FIXTURE"],
];
console.log("\n3. no tracked text file carries a credential");

const rest = [];
const used = new Map();
for (const x of findings) {
  const k = `${x.file}\t${x.rule}`;
  const d = DECLARED.find(([f, r]) => `${f}\t${r}` === k);
  if (d) used.set(k, (used.get(k) ?? 0) + 1); else rest.push(x);
}
const stale = DECLARED.filter(([f, r, n]) => (used.get(`${f}\t${r}`) ?? 0) !== n)
  .map(([f, r, n]) => `${f} [${r}] declared ${n}, found ${used.get(`${f}\t${r}`) ?? 0}`);

check("3a no undeclared findings", rest.length === 0,
  rest.length
    ? `${rest.length}:\n       ${rest.map(place).join("\n       ")}\n       `
      + "Say where the login lives, never what it is — CLAUDE.md, Hard rules. "
      + "`docs/platform-admins.md` is the pattern."
    : "");
check("3b every declared exception still holds EXACTLY (remove a line when its hit is fixed)",
  stale.length === 0, stale.join("; "));
for (const [f, r, n] of DECLARED.filter(([, , , k]) => k === "OPEN")) {
  console.log(`  OPEN ${f} [${r}] x${n} — a real login in a tracked file; FOR-ANDREW.md has the row`);
}

console.log(`\n   ${files.length} files (${mdFiles.length} markdown) · ${lines} lines · `
  + `${RULES.length} rules · ${findings.length} finding(s) · `
  + `${findings.length - rest.length} declared`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
