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
// files or addresses, because a green line over zero subjects reads exactly
// like a pass - this repo's most repeated failure.
//
// ---------------------------------------------------------------------------
// HOW TO DECLARE A REAL SEND
// ---------------------------------------------------------------------------
// Either wrap it - `realMail("delivered@resend.dev", "why")`, which PRINTS -
// or, for an address that is not a recipient at all (a login, a From: header,
// an argument to a pure function), put `mail-sink: <why>` in a comment on the
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
// 2 · EVERY ADDRESS IN tests/ AND scripts/ IS FREE OR DECLARED
// ═══════════════════════════════════════════════════════════════════════════
console.log("\n2. every address in tests/ and scripts/ is free or declared");

const files = [];
for (const dir of ["tests", "scripts"]) {
  for (const f of readdirSync(path.join(root, dir))) {
    if (f.endsWith(".mjs")) files.push(path.join(dir, f).split(path.sep).join("/"));
  }
}

// A domain, not a whole address: `promo-${tag}@detailplatform.com` is a
// template literal and no address regex would see it. The join is what
// matters — trap: *measure the render, then find what produced it.*
const AT = /@([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+)/g;
const DECLARED = /realMail\(|mail-sink:/;

let seen = 0, free = 0, declared = 0;
const undeclared = [];

for (const rel of files) {
  if (rel === "tests/mail-sink.test.mjs" || rel === "tests/_mail.mjs") continue;
  const lines = readFileSync(path.join(root, rel), "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(AT)) {
      const domain = m[1].toLowerCase();
      // Not an address: a decorator, a scoped npm package, a rate like `10@s`.
      if (!/\.[a-z]{2,}$/.test(domain)) continue;
      seen++;
      if (isFree(domain)) { free++; continue; }
      if (DECLARED.test(line) || DECLARED.test(lines[i - 1] ?? "")) { declared++; continue; }
      undeclared.push(`${rel}:${i + 1}  @${domain}`);
    }
  });
}

check("2a no undeclared charged address anywhere in tests/ or scripts/", undeclared.length === 0,
  undeclared.length
    ? `${undeclared.length}:\n       ${undeclared.join("\n       ")}\n       `
      + "Use sink(\"tag\") from tests/_mail.mjs, or declare it with realMail(...) "
      + "or a `mail-sink: why` comment."
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
console.log("\n4. the scan actually scanned");
check("4a it read the whole of tests/ and scripts/", files.length >= 90, `${files.length} files`);
check("4b it found addresses to classify", seen >= 100, `${seen} occurrences`);
check("4c at least one real send is declared rather than banned outright", declared >= 1,
  `${declared} declared — if this is 0 the check has become a ban and somebody will delete it`);

console.log(`\n   ${files.length} files · ${seen} address occurrences · `
  + `${free} free · ${declared} declared · ${undeclared.length} undeclared`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
