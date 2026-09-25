// THE SINK IS THE DEFAULT — a suite cannot spend Andrew's daily email
// allowance by accident.
//
// Run: node tests/mail-sink.test.mjs        (credential-free; runs on a bare clone)
//
// ---------------------------------------------------------------------------
// WHAT THIS ASSERTS AND WHY IT IS NOT A SPELLING CHECK
// ---------------------------------------------------------------------------
// Andrew, 2026-09-13: *"Reserving twenty a day is a mitigation, not a fix. On
// 7 September the suites attempted 240 against a cap of 100. Make a fake
// transport the default for every suite, so a test can only send real mail
// when it explicitly asks to, and make the suite that needs a real send say so
// out loud."*
//
// **THE FREE LIST IS READ OUT OF `send-email/index.ts`, NEVER COPIED HERE.**
// The relay's reserved-domain exit is the fake transport; a second list in this
// file would be a check that asserts a convention instead of the mechanism, and
// would pass happily the day somebody narrowed the relay's regex. Trap (k):
// *a check that greps source text asserts how something is WRITTEN.* So this
// file lifts the two actual regex literals out of that source and RUNS them
// against every domain it finds.
//
// **AND IT COUNTS SUBJECTS.** § 4 fails if the scan finds implausibly few
// files, addresses, comments or logins, because a green line over zero
// subjects reads exactly like a pass - this repo's most repeated failure.
//
// ---------------------------------------------------------------------------
// IT USED TO CRY 40, AND 39 OF THOSE COST NOTHING — ROADMAP 14.20, 2026-09-24
// ---------------------------------------------------------------------------
// The first version read every file in `tests/` and `scripts/` **line by line
// as raw text**, matched any `@domain`, and asked only whether the domain was
// reserved. It stripped no comments and could not tell a recipient from a
// login. So it reported **40 findings of which at least 39 could not cause a
// send** - 24 were the demo owner's sign-in, 10 were addresses written inside
// prose comments explaining why that address was safe, and 2 were `===`
// comparisons reading a row back.
//
//   **A guard that cries 40 is a guard nobody reads, and the day a real
//   undeclared recipient appears it is item 41 in a list everybody has learned
//   to walk past.**
//
// That is the same disease as a check that stays silent: both buy silence. So
// this version does two things the first did not.
//
// **1 · IT STRIPS COMMENTS, IN PLACE.** `codeOnly()` replaces every comment
// character with a space and keeps every newline, so the text keeps its exact
// length, its exact columns and its exact line numbers - a finding still points
// where it pointed. § 2b asserts that invariant rather than trusting it,
// because a stripper that quietly ate code would move real recipients into the
// free bucket and nothing would say so.
//
// **2 · IT CLASSIFIES BY ROLE, AND THE DEFAULT IS "RECIPIENT".** Anything the
// classifier does not positively recognise is reported. A guard whose unknown
// case is "free" gets narrower every time somebody writes something new.
//
//   free   COMMENT     the address is not in the code at all
//   free   LOGIN       `password`/`secret` within one line of it. An address
//                      typed into a password form, or held beside a password
//                      in an OWNER/ADMIN constant, is a credential. Supabase's
//                      `mailer_autoconfirm` is on and no custom SMTP is set, so
//                      a fixture sign-in sends nothing - `tests/_mail.mjs`
//                      records the live proof.
//   free   READ        `=== "addr"` / `!== "addr"`. A comparison reads a row
//                      back; it cannot send to it.
//   free   DECLARED    `realMail(...)` or a `mail-sink: why` comment.
//   FAIL   RECIPIENT   everything else.
//
// **THE CEILING, NAMED RATHER THAN HIDDEN.** The LOGIN rule is a one-line
// proximity test, not a parse. A genuine recipient written within one line of
// the word "password" would be freed. That was accepted over a per-file
// allowlist, which is the thing this file's own header spends a paragraph
// refusing. If it ever bites, the upgrade is to require the address and the
// password to be arguments of the same call.
//
// **§ 2a IS THE ANSWER TO "WHAT DID YOU BREAK ON PURPOSE".** Four synthetic
// lines run through the classifier before it is pointed at the repo: an
// undeclared recipient that must be CAUGHT, and a comment, a login and a
// comparison that must all pass. A guard that cannot fail and a guard that
// flags everything are the same useless thing, and those four lines prove it is
// neither, on every run, not once on the day it was written.
//
// ---------------------------------------------------------------------------
// HOW TO DECLARE A REAL SEND
// ---------------------------------------------------------------------------
// Either wrap it - `realMail("delivered@resend.dev", "why")`, which PRINTS -
// or, for an address that is not a recipient at all (a From: header, an
// argument to a pure function), put `mail-sink: <why>` in a comment on the
// same line or the line above.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const root = fileURLToPath(new URL("../", import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE FREE LIST COMES OUT OF THE RELAY
// ═══════════════════════════════════════════════════════════════════════════
console.log("1. the reserved-domain exit is read out of send-email itself");

const relay = readFileSync(path.join(root, "supabase/functions/send-email/index.ts"), "utf8");
const guardLine = relay.split(/\r?\n/).find((l) => l.includes(".test(domain)"));
check("1z the relay still has a domain guard to read", Boolean(guardLine),
  "without it every check below is vacuous and the sink may not exist at all");

// The two `/.../` literals are sliced out by hand rather than matched with a
// regex: a regex that finds a regex needs doubled backslashes, and doubling
// them is exactly the kind of transcription this check exists to avoid.
const literals = [];
for (const part of (guardLine ?? "").split(".test(domain)")) {
  const end = part.lastIndexOf("/");
  if (end <= 0) continue;
  const start = part.lastIndexOf("/", end - 1);
  if (start < 0) continue;
  const body = part.slice(start + 1, end);
  if (body) literals.push(new RegExp(body));
}
check("1a both reserved-domain patterns were lifted, not one", literals.length === 2,
  `found ${literals.length} — a partial lift would call a charged domain free`);

const isFree = (domain) => literals.some((re) => re.test(domain));

// Baseline the lifted patterns against known answers before trusting them.
check("1b the lifted patterns call fixture.test free", isFree("fixture.test"));
check("1c ...and example.com free", isFree("example.com"));
check("1d ...and detailplatform.com CHARGED", !isFree("detailplatform.com"));
check("1e ...and resend.dev CHARGED", !isFree("resend.dev"));

// ═══════════════════════════════════════════════════════════════════════════
// 2 · EVERY ADDRESS IN tests/ AND scripts/ IS FREE, FREE BY ROLE, OR DECLARED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Every comment character replaced by a space, every newline kept. Length,
 * columns and line numbers all survive, so a match found in the raw text can
 * be looked up at the same index here to ask "is this in the code?".
 *
 * Strings are copied through first, so a `//` inside `"http://localhost"` is
 * not a comment. Same shape as `scripts/setup-inputs-contract.mjs`'s own
 * stripper, written for the same reason on 2026-09-23 - copied rather than
 * shared, because a test importing from a script another session owns is the
 * quiet collision `CLAUDE.md` warns about.
 */
function codeOnly(js) {
  let out = "", i = 0;
  while (i < js.length) {
    const c = js[i], d = js[i + 1];
    if (c === "/" && d === "/") {
      while (i < js.length && js[i] !== "\n") { out += " "; i++; }
      continue;
    }
    if (c === "/" && d === "*") {
      out += "  "; i += 2;
      while (i < js.length && !(js[i] === "*" && js[i + 1] === "/")) {
        out += js[i] === "\n" ? "\n" : " "; i++;
      }
      if (i < js.length) { out += "  "; i += 2; }
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const q = c; out += c; i++;
      while (i < js.length && js[i] !== q) {
        if (js[i] === "\\") { out += js[i]; i++; if (i >= js.length) break; }
        out += js[i]; i++;
      }
      if (i < js.length) { out += q; i++; }
      continue;
    }
    out += c; i++;
  }
  return out;
}

// A domain, not a whole address: `promo-${tag}@detailplatform.com` is a
// template literal and no address regex would see it. The join is what
// matters — trap: *measure the render, then find what produced it.*
const AT = /@([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+)/g;
const DECLARED = /realMail\(|mail-sink:/;
// Not `\b`-anchored: `_` is a word character, so `DEMO_SECRET` has no boundary
// before `SECRET` and `\bsecret\b` would miss the two files that name it that
// way.
const PASSWORD = /password|passwd|secret|pwd/i;
// `=== "addr"` — the quote may be any of the three, and the address sits some
// way into the literal, so the tail of the text BEFORE the match is what is
// tested.
const COMPARISON = /[=!]==?\s*["'`][^"'`]*$/;

/**
 * The role of one address occurrence. `codeLines` is the comment-stripped
 * file, `rawLines` the original; `n` is the 0-based line the match was on,
 * `col` its index in that line, `raw` the matched `@domain` text.
 *
 * Returns "comment" | "declared" | "login" | "read" | "recipient".
 * **The default is "recipient".**
 */
function roleOf(codeLines, rawLines, n, col, raw) {
  const code = codeLines[n] ?? "";
  if (code.slice(col, col + raw.length) !== raw) return "comment";
  if (DECLARED.test(rawLines[n] ?? "") || DECLARED.test(rawLines[n - 1] ?? "")) return "declared";
  const window = [codeLines[n - 1] ?? "", code, codeLines[n + 1] ?? ""].join("\n");
  if (PASSWORD.test(window)) return "login";
  if (COMPARISON.test(code.slice(0, col))) return "read";
  return "recipient";
}

// ───────────────────────────────────────────────────────────────────────────
// 2a · THE CLASSIFIER IS BROKEN ON PURPOSE, FOUR WAYS, ON EVERY RUN
// ───────────────────────────────────────────────────────────────────────────
console.log("\n2a. the classifier's own four canaries, before it is pointed at the repo");

const CANARY_DOMAIN = "canary-real.example-not.com";
const CANARIES = [
  ["recipient", `await sendInvoice({ to: "escapee@${CANARY_DOMAIN}" });`],
  ["comment", `// a note that mentions hidden@${CANARY_DOMAIN} in prose`],
  ["login", `const OWNER = { email: "boss@${CANARY_DOMAIN}", password: "x" };`],
  ["read", `const hit = rows.find((r) => r.to_email === "seen@${CANARY_DOMAIN}");`],
];
for (const [want, line] of CANARIES) {
  const codeLines = codeOnly(line).split("\n");
  const m = [...line.matchAll(AT)][0];
  const got = m ? roleOf(codeLines, [line], 0, m.index, m[0]) : "NO MATCH";
  check(`2a-${want} a ${want} is classified ${want}`, got === want, `got ${got} — ${line}`);
}
check("2a-z the canary domain is one the relay calls CHARGED", !isFree(CANARY_DOMAIN),
  "if it were free the four above would prove nothing about a charged address");

// ───────────────────────────────────────────────────────────────────────────
// 2b · THE REPO
// ───────────────────────────────────────────────────────────────────────────
console.log("\n2b. every address in tests/ and scripts/ is free, free by role, or declared");

const files = [];
for (const dir of ["tests", "scripts"]) {
  for (const f of readdirSync(path.join(root, dir))) {
    if (f.endsWith(".mjs")) files.push(path.join(dir, f).split(path.sep).join("/"));
  }
}

let seen = 0, free = 0, declared = 0, inComment = 0, logins = 0, reads = 0;
let lengthKept = true;
const undeclared = [];

for (const rel of files) {
  if (rel === "tests/mail-sink.test.mjs" || rel === "tests/_mail.mjs") continue;
  const src = readFileSync(path.join(root, rel), "utf8");
  const code = codeOnly(src);
  if (code.length !== src.length) lengthKept = false;
  const rawLines = src.split(/\r?\n/);
  const codeLines = code.split(/\r?\n/);
  rawLines.forEach((line, i) => {
    for (const m of line.matchAll(AT)) {
      const domain = m[1].toLowerCase();
      // Not an address: a decorator, a scoped npm package, a rate like `10@s`.
      if (!/\.[a-z]{2,}$/.test(domain)) continue;
      seen++;
      if (isFree(domain)) { free++; continue; }
      switch (roleOf(codeLines, rawLines, i, m.index, m[0])) {
        case "comment": inComment++; continue;
        case "declared": declared++; continue;
        case "login": logins++; continue;
        case "read": reads++; continue;
        default: undeclared.push(`${rel}:${i + 1}  @${domain}`);
      }
    }
  });
}

check("2b-z the stripper substituted rather than removed", lengthKept,
  "a comment-stripped file that changed length has moved every column after it, "
  + "so a line number is a guess and a real recipient can land in the free bucket");

check("2b no undeclared charged address anywhere in tests/ or scripts/", undeclared.length === 0,
  undeclared.length
    ? `${undeclared.length}:\n       ${undeclared.join("\n       ")}\n       `
      + "Each of these can cause a send. Use sink(\"tag\") from tests/_mail.mjs, "
      + "or declare it with realMail(...) or a `mail-sink: why` comment."
    : "");

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE HELPER STILL DOES WHAT THE SUITES ASSUME
// ═══════════════════════════════════════════════════════════════════════════
console.log("\n3. the helper's own two promises");

const { sink, realMail, SINK_DOMAIN } = await import("./_mail.mjs");
check("3a the sink domain is one the relay calls free", isFree(SINK_DOMAIN), SINK_DOMAIN);
check("3b sink() produces a free address", isFree(sink("Any Tag").split("@")[1]), sink("Any Tag"));
let threw = false;
try { realMail("x@y.com"); } catch { threw = true; }
check("3c realMail refuses to spend real mail without a stated reason", threw);

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE INSTRUMENT COUNTED SOMETHING
// ═══════════════════════════════════════════════════════════════════════════
// Each floor here is a bucket that CANNOT legitimately be empty in this repo.
// A classifier that quietly stopped recognising a role would look exactly like
// a clean run without them.
console.log("\n4. the scan actually scanned");
check("4a it read the whole of tests/ and scripts/", files.length >= 90, `${files.length} files`);
check("4b it found addresses to classify", seen >= 100, `${seen} occurrences`);
check("4c at least one real send is declared rather than banned outright", declared >= 1,
  `${declared} declared — if this is 0 the check has become a ban and somebody will delete it`);
check("4d it is still seeing addresses inside comments", inComment >= 5,
  `${inComment} in comments — this repo explains its addresses in prose; 0 means `
  + "the stripper has stopped stripping and every one of them is about to be reported");
check("4e it is still recognising fixture logins", logins >= 15,
  `${logins} logins — the demo owner signs in from most of the browser scripts; `
  + "0 means the role rule has broken and the 40-finding flood is back");

console.log(`\n   ${files.length} files · ${seen} address occurrences · ${free} free · `
  + `${inComment} in comments · ${logins} logins · ${reads} read-back · `
  + `${declared} declared · ${undeclared.length} undeclared`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
