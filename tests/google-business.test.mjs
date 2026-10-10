// ROADMAP 99.1 — the Google Business link: what it may and may not do today.
//
// Credential-free: no Google, no database, no browser. It imports the edge
// function's own pure module, and reads the I/O file and the migration as text
// with comments stripped (a comment saying "never calls Google" must not be
// able to satisfy the check that no code does).
//
// THE ONE THING THIS EXISTS TO HOLD: nothing in this feature reaches a real
// Google endpoint until Andrew has seen it work on a test account (the item's
// fourth criterion), and `business.manage` is behind ROADMAP 0.15 anyway.
//
// Sabotage is an env var, not a flag (docs/gotchas.md 104):
//   BREAK=call-google   puts a fetch to googleapis.com into the scanned source
//   BREAK=let-staff-in  removes the owner-only line from the scanned source
// Each must turn its own assertion red; the run prints which.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describeLink, stubMode, stubOutcome } from "../supabase/functions/_shared/googleBusiness.ts";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};
const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(fileURLToPath(new URL(p, root)), "utf8");
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/--.*$/gm, "");

const BREAK = process.env.BREAK || "";
let fn = code(read("supabase/functions/google-business/index.ts"));
const lib = code(read("supabase/functions/_shared/googleBusiness.ts"));
const sql = code(read("supabase/migrations/20261010040000_google_business_links.sql"));
if (BREAK === "call-google") fn += '\nawait fetch("https://mybusiness.googleapis.com/v4/accounts");';
if (BREAK === "let-staff-in") fn = fn.replace(/ \|\| member\.role !== "owner"/, "");

console.log("1. nothing here can reach Google");
const GOOGLE = /\bfetch\s*\(|googleapis|accounts\.google|oauth2|business\.manage|XMLHttpRequest/i;
check("1a · the function and the shared module call no Google endpoint and no network at all",
  !GOOGLE.test(fn) && !GOOGLE.test(lib), `matched: ${(fn + lib).match(GOOGLE)?.[0]}`);
check("1b · the check has subjects — both files were read and are non-trivial", fn.length > 800 && lib.length > 400);
check("1c · the canary pattern does catch a fetch to Google", GOOGLE.test('await fetch("https://mybusiness.googleapis.com/")'));

console.log("2. who may use it");
check("2a · only an owner gets an answer, and everyone else is 404 rather than 403",
  /member\.role !== "owner"\)\s*return json\(\{ error: "not_found" \}, 404\)/.test(fn) && !/\b403\b/.test(fn));
check("2b · `start` is refused while the mode is off",
  /if \(!available\) return json\(\{ error: "not_configured" \}, 503\)/.test(fn));
check("2c · the table is closed to browsers: RLS on, every grant revoked, none given",
  /enable row level security/.test(sql) && /revoke all on public\.google_business_links from authenticated, anon/.test(sql)
  && !/\bgrant\b/i.test(sql));

console.log("3. what the screen is told");
check("3a · the mode is off unless it is exactly the word stub", !stubMode(undefined) && !stubMode("") && !stubMode("Stub") && !stubMode("live") && stubMode("stub"));
check("3b · no row is 'none', and the stub says nothing is connected", describeLink(null, true).state === "none" && !describeLink(null, true).connected);
check("3c · a connected row is connected and names its account", (() => {
  const d = describeLink({ state: "connected", account_label: "a", connected_at: "t" }, true);
  return d.connected && d.account === "a" && d.connectedAt === "t";
})());
check("3d · refused and broken are not connected, and show no account", ["refused", "broken"].every((s) => {
  const d = describeLink({ state: s, account_label: "a", connected_at: "t" }, true);
  return d.state === s && !d.connected && d.account === null && d.connectedAt === null;
}));
check("3e · a state we do not know is 'none', not a crash and not 'connected'", describeLink({ state: "weird" }, true).state === "none");
check("3f · syncing is false in every state, because nothing syncs yet",
  ["connected", "refused", "broken", "weird", null].every((s) => describeLink(s ? { state: s } : null, true).syncing === false));
check("3g · an unknown outcome word means success, the two failures are kept",
  stubOutcome("x") === "connected" && stubOutcome("refused") === "refused" && stubOutcome("broken") === "broken");

console.log(`\n${passed} passed, ${failed} failed${BREAK ? `  (BREAK=${BREAK})` : ""}`);
process.exit(failed ? 1 : 0);
