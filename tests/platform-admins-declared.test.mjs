// `platform_admins` CONTAINS EXACTLY THE ACCOUNTS A DOCUMENT NAMES.
//
// Run: node tests/platform-admins-declared.test.mjs
//      (§ 1 and § 2 credential-free; § 3 needs the root .env and says so)
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
// ---------------------------------------------------------------------------
// A row in `public.platform_admins` holds the whole platform: every detailer,
// every customer, suspend, impersonate, change prices. **There is no narrower
// admin level** — the table has four columns and none of them is a permission,
// so every row is all-or-nothing.
//
// The table holds **two** rows, and for a fortnight the repo's own build history
// said it held one (`docs/roadmap.md`: *"`demo@demo.com` is the ONE row in
// `platform_admins`"*). Nothing anywhere compared the table against a written
// intention, so a third row would have been noticed by nobody.
//
// **THE DECLARATION IS `docs/platform-admins.md`, AND THE CHECK READS THAT
// RATHER THAN THE TABLE.** That is the whole design. A check that derived its
// expectation from the table would agree with whatever it found — including a
// row somebody added at three in the morning — and could never fail. The
// declared list lives in a file a person edits on purpose, next to the reason
// each account exists and the condition under which it goes.
//
// **NO CREDENTIAL IS READ, PRINTED OR STORED BY THIS FILE.** It reads `email`
// only. `platform_admins.note` is deliberately never selected: the master
// login's note contains that account's password in plain text, and a check that
// printed it into a log or a receipt would put it somewhere new.
//
// ---------------------------------------------------------------------------
// IT FAILS IN BOTH DIRECTIONS, AND § 2 PROVES THAT ON EVERY RUN
// ---------------------------------------------------------------------------
// A guard that only notices a NEW row is half a guard: a declared account
// disappearing means either somebody revoked Andrew's own back office, or the
// roster is describing a world that no longer exists. Both are worth a red.
//
// `compare()` is pure and § 2 runs it against synthetic rosters — an undeclared
// row added, a declared row removed — so neither direction can rot, and **no
// sabotage ever has to touch the real table.** Nothing here writes to
// `platform_admins`, and removing a row from it is ROADMAP 12.4's job at the
// first real signup, not a test's.

import "./_env.mjs";           // root .env -> process.env, before anything reads it

import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const DOC = "docs/platform-admins.md";
const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

/**
 * The declared roster, out of the fenced `declared-platform-admins` block.
 *
 * A NAMED FENCE rather than "the first code block": a doc gains code blocks
 * over time, and a parser keyed on position would silently start reading a
 * different one. Returns null if the block is absent, so § 1 can tell a doc
 * that lost its block from a doc that declares nobody.
 */
function declaredFrom(markdown) {
  const m = /```declared-platform-admins\r?\n([\s\S]*?)```/.exec(markdown);
  if (!m) return null;
  return m[1].split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/**
 * **THE COMPARATOR.** Pure, so § 2 can prove it fails both ways without a
 * database and without touching anything.
 *
 * `undeclared` is the dangerous direction — a row holding the whole platform
 * that nobody wrote down. `missing` is the other one, and it is not benign.
 */
function compare(declared, actual) {
  const d = new Set(declared.map((e) => e.toLowerCase()));
  const a = new Set(actual.map((e) => e.toLowerCase()));
  return {
    undeclared: [...a].filter((e) => !d.has(e)).sort(),
    missing: [...d].filter((e) => !a.has(e)).sort(),
    ok: [...a].filter((e) => !d.has(e)).length === 0
      && [...d].filter((e) => !a.has(e)).length === 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE DECLARATION IS READABLE AND SAYS SOMETHING
// ═══════════════════════════════════════════════════════════════════════════
console.log("1. the declared roster parses out of the document");

const doc = read(DOC);
const declared = declaredFrom(doc);

check("1a the document still carries a `declared-platform-admins` block",
  declared !== null,
  "without it there is no declaration and every verdict below would be vacuous");
check("1b it declares at least one account", (declared?.length ?? 0) >= 1,
  `${declared?.length ?? 0} declared — zero declared is a failure, never a pass`);
check("1c every declared line looks like an address", (declared ?? []).every((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
  JSON.stringify((declared ?? []).filter((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))));
check("1d no duplicate declarations", new Set((declared ?? []).map((e) => e.toLowerCase())).size === (declared ?? []).length);
// The roster is worthless as a control if it does not say when each account
// goes — that is the half ROADMAP 12.4 depends on.
for (const e of declared ?? []) {
  check(`1e \`${e}\` has a section and a removal condition in the doc`,
    doc.includes(`### \`${e}\``) && /When it goes:/.test(doc.split(`### \`${e}\``)[1]?.slice(0, 1400) ?? ""),
    "a declared account with no reason and no exit condition is a rubber stamp");
}
// CLAUDE.md's hard rule, asserted rather than trusted, on the one file whose
// subject is the two most powerful logins in the product.
check("1f the document states the no-credential rule it has to follow",
  /NO PASSWORD, TOKEN OR KEY GOES IN THIS FILE/.test(doc));

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE COMPARATOR FAILS IN BOTH DIRECTIONS — synthetic, every run
// ═══════════════════════════════════════════════════════════════════════════
console.log("\n2. broken on purpose, both ways, without touching the real table");

const ROSTER = ["a@example.com", "b@example.com"];

const clean = compare(ROSTER, ["a@example.com", "b@example.com"]);
check("2a a table matching the roster passes", clean.ok === true, JSON.stringify(clean));

// DIRECTION ONE — the dangerous one. A row nobody declared.
const added = compare(ROSTER, [...ROSTER, "intruder@example.com"]);
check("2b an UNDECLARED row fails", added.ok === false && added.undeclared.includes("intruder@example.com"),
  JSON.stringify(added));

// DIRECTION TWO — a declared account gone. Either somebody revoked Andrew's own
// back office, or the roster describes a world that no longer exists.
const removed = compare(ROSTER, ["a@example.com"]);
check("2c a MISSING declared row fails", removed.ok === false && removed.missing.includes("b@example.com"),
  JSON.stringify(removed));

check("2d both at once fails, and names both", (() => {
  const r = compare(ROSTER, ["a@example.com", "intruder@example.com"]);
  return !r.ok && r.undeclared.length === 1 && r.missing.length === 1;
})());
// Case: Postgres stores what it was given, and a roster typed in another case
// must not read as an intruder.
check("2e case differences are not treated as different accounts",
  compare(["A@Example.com"], ["a@example.com"]).ok === true);
// The canary for the comparator itself: a constant `ok: true` would pass 2a and
// fail 2b/2c; a constant false would do the reverse. Both are covered above,
// which is why 2a is not decoration.
check("2f an empty table against a non-empty roster fails rather than passing quietly",
  compare(ROSTER, []).ok === false && compare(ROSTER, []).missing.length === 2);

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE LIVE TABLE
// ═══════════════════════════════════════════════════════════════════════════
console.log("\n3. the live table, read against the declaration");

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !SERVICE) {
  console.log("  SKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.");
  console.log("  NOTHING in § 3 ran. This is not a pass. Run: set -a; . ./.env; set +a");
} else {
  // `email` ONLY. `note` holds a password in plain text and is never selected.
  const res = await fetch(`${URL_}/rest/v1/platform_admins?select=email`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  const rows = await res.json().catch(() => null);
  check("3a the table answered", res.status === 200 && Array.isArray(rows), `${res.status}`);

  if (Array.isArray(rows)) {
    const actual = rows.map((r) => r.email).filter(Boolean);
    // ZERO ROWS DISCOVERED IS A FAILURE. An empty read looks identical to a
    // clean one through any comparison that only asks about extras.
    check("3b it returned rows to compare", actual.length >= 1,
      `${actual.length} rows — zero discovered is a failure, never a pass`);

    const verdict = compare(declared ?? [], actual);
    check("3c no account holds the back office without being declared",
      verdict.undeclared.length === 0,
      `undeclared: ${verdict.undeclared.join(", ")} — add it to ${DOC} with a reason `
      + "and a removal condition, or find out who added it");
    check("3d every declared account is still there",
      verdict.missing.length === 0,
      `declared but absent: ${verdict.missing.join(", ")} — either it was revoked `
      + `(check nobody has been locked out of /admin) or ${DOC} is describing a world that has moved`);
    check("3e the counts agree", actual.length === (declared ?? []).length,
      `table ${actual.length}, document ${(declared ?? []).length}`);

    console.log(`\n   declared ${(declared ?? []).length} · in the table ${actual.length} · `
      + `undeclared ${verdict.undeclared.length} · missing ${verdict.missing.length}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
// **`process.exitCode`, NOT `process.exit()` — and the difference was measured.**
// With `process.exit()` this file printed `18 passed, 0 failed` and then exited
// **127**, aborting inside libuv (`!(handle->flags & UV_HANDLE_CLOSING)`) because
// the exit raced the still-closing `fetch` handle from § 3 on this platform.
// **A check whose body says 0 failed and whose exit code says catastrophe is read
// by every runner as a failure**, and by a person as a pass. Setting the code and
// letting the process end on its own lets the socket close first.
process.exitCode = fail ? 1 : 0;
