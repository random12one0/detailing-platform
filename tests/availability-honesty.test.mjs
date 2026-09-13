// AN EMPTY CALENDAR MUST NOT BE A SUCCESSFUL ANSWER — 2026-09-13
//
// Andrew hit this live on `demo-detail`: three month requests in a row came
// back `200`, `success: true`, and **not one bookable day**, then the identical
// request was fine minutes later and could not be reproduced in eight tries.
// The customer sees a calendar where nothing is selectable, with no error, and
// nothing on the page can tell that from a detailer who is fully booked.
//
// **THE CAUSE WAS NOT A TRANSIENT NETWORK. IT IS STRUCTURAL AND IT COULD FIRE
// AGAIN ON THE NEXT REQUEST.** `_shared/tenant.ts`'s `getSettings` read
// `const { data } = await supabase…` — the error destructured away — so a 504
// (about 1.1% of this project's PostgREST calls; `FOUND.md` § THE "GATEWAY
// TIMEOUT" IS OUR OWN CATCH BLOCK) gave `data === null`, which this function
// could not tell from a business with no settings row, so it returned the
// defaults. Those defaults say `mobile_enabled: null` and
// `dropoff_enabled: null` — right for a business nobody has set up — and in
// `available-slots` they make `isDropoff && isMobile` true for every slot in
// the grid, which skips every one.
//
// So the intermittency is the 1.1%, and the empty month is deterministic once
// it fires. `FOUND.md`'s rule applies: "it was failing intermittently" invites
// a reader to wait and see; this one says what makes it happen.
//
// ---------------------------------------------------------------------------
// WHAT INSTRUMENT EACH SECTION USES, BECAUSE THEY ARE NOT THE SAME STRENGTH
// ---------------------------------------------------------------------------
// § 1 RUNS THE REAL CODE. `_shared/retryRead.ts` has no imports and Node 24
// strips types, so `readFailed` and `isReadFailure` are imported and called —
// behaviour, not spelling.
//
// § 2 IS A SOURCE CHECK AND CANNOT BE ANYTHING ELSE HERE. The functions it
// guards import `npm:@supabase/supabase-js` through `_shared/db.ts`, which is a
// Deno specifier Node cannot resolve, and there is no Deno on this machine. So
// it is stated plainly rather than dressed up: it asserts that no read on the
// booking path destructures `data` without also taking `error`, it COUNTS the
// reads it inspected rather than merely matching, and every exemption is named
// with its reason. CLAUDE.md trap (k) is the warning this is written against —
// a source check asserts how something is WRITTEN — and the mitigation used
// here is the count: if a file's read count changes, this fails and somebody
// has to look.
//
// § 3 IS LIVE AND OPTIONAL. Given credentials it asks the real endpoint for a
// month and asserts the demo business has bookable days. It would have caught
// the symptom 1.1% of the time, which is why it is the weakest of the three and
// is last.
//
// BASELINED BY BREAKING WHAT IT GUARDS, per FOUND.md's rule and on a committed
// tree so the revert is `git checkout --`. The breaks are in this file's commit
// message.

import { readFileSync } from "node:fs";
import { isReadFailure, readFailed } from "../supabase/functions/_shared/retryRead.ts";

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; } else { fail++; console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
};
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

// --- 1 · THE THIRD OUTCOME EXISTS AND IS TELLABLE APART ---------------------
// A row, no row, and "we could not find out". The third one is what this whole
// item is about, and a caller can only answer honestly if it can recognise it.
{
  const e = readFailed("business_settings", { message: "Gateway Timeout" });
  ok("1a · readFailed returns an Error", e instanceof Error);
  ok("1b · it names the table it could not read", /business_settings/.test(e.message), e.message);
  ok("1c · it carries the original message", /Gateway Timeout/.test(e.message), e.message);
  ok("1d · isReadFailure recognises it", isReadFailure(e) === true);

  // The distinction that decides whether the customer is told to try again.
  ok("1e · a plain Error is NOT a read failure", isReadFailure(new Error("boom")) === false);
  ok("1f · a TypeError is NOT a read failure", isReadFailure(new TypeError("x.split")) === false);
  ok("1g · null and undefined are safe to ask about",
    isReadFailure(null) === false && isReadFailure(undefined) === false);

  // A non-object error must not crash the thrower — a fetch rejection can be a
  // string, and the one place this runs is a catch block.
  ok("1h · a string error still produces a message",
    /nope/.test(readFailed("bookings", "nope").message));
  ok("1i · an errorless null still produces a message",
    typeof readFailed("bookings", null).message === "string");
}

// --- 2 · NO READ ON THE BOOKING PATH THROWS ITS ERROR AWAY ------------------
// Source check. See the header for why, and for what the count is doing.
{
  // COMMENTS ARE STRIPPED FIRST, and the reason is that this check found its
  // own first fault: the prose above `getSettings` quotes the broken line it
  // replaced, and a scan over raw text read the documentation as the defect. A
  // check that cannot tell code from a comment about code will eventually fail
  // on a file somebody only documented.
  const code = (src) =>
    src.split("\n")
      .map((line, i) => [i + 1, line])
      .filter(([, line]) => !/^\s*(\/\/|\*|\/\*)/.test(line));

  // `const { … data … }` with no `error` in the same destructure is the bug.
  // Written as a property of the shape rather than as one spelling, so
  // `{ data }`, `{ data: svcs }` and `{ data, status }` are all caught.
  const isRead = (line) => /const\s*\{[^}]*\bdata\b[^}]*\}\s*=/.test(line);

  // THE ONE EXEMPTION, NAMED WITH ITS REASON. `requireMember` has the same
  // fault: a 504 on its `business_users` read returns null and the caller
  // answers 401, so a detailer is spuriously told they are not a member. It is
  // NOT fixed here because making it throw changes every admin function's answer
  // from 401 to 500 at once, which is a wider blast radius than one night's work
  // should take. It is recorded in `FOUND.md` instead, and it is listed here so
  // that fixing it makes this check fail and the stale entry gets deleted with
  // it — an allowlist that outlives its subject is how a known bug becomes an
  // unknown one.
  const EXEMPT = [
    ["const { data: rows } = await q;",
      "requireMember — a failed read becomes a false 401; see FOUND.md, not fixed on purpose"],
  ];

  const files = [
    // 5: getSettings, businessBySlug, businessById, auth.getUser, requireMember.
    ["_shared/tenant.ts", "../supabase/functions/_shared/tenant.ts", 5],
    ["available-slots/index.ts", "../supabase/functions/available-slots/index.ts", 1],
  ];
  let exemptSeen = 0;
  for (const [label, path, expected] of files) {
    const lines = code(read(path)).filter(([, l]) => isRead(l));
    ok(`2 · ${label} · ${expected} destructured reads inspected`, lines.length === expected,
      `found ${lines.length}; if the file legitimately gained or lost a read, read the new one and update this number`);
    const bad = [];
    for (const [n, line] of lines) {
      if (/\berror\b/.test(line)) continue;
      const hit = EXEMPT.find(([text]) => line.includes(text));
      if (hit) { exemptSeen++; continue; }
      bad.push(`${n}: ${line.trim()}`);
    }
    ok(`2 · ${label} · every read not on the allowlist takes its error`, bad.length === 0, bad.join(" | "));
  }
  ok("2x · the one allowlisted read is still there", exemptSeen === EXEMPT.length,
    `${exemptSeen} of ${EXEMPT.length} found — if it was fixed, delete it from EXEMPT and from FOUND.md`);
}

// --- 3 · THE FIVE READS AND THE FALLBACK, AS THE FILES NOW STAND ------------
{
  const slots = read("../supabase/functions/available-slots/index.ts");
  const tenant = read("../supabase/functions/_shared/tenant.ts");

  // Count, do not match: five parallel reads plus the services read is six, and
  // a sixth parallel read added without a retry is the regression this catches.
  const retries = (slots.match(/retryRead\(/g) ?? []).length;
  ok("3a · all six of available-slots' reads are retried", retries === 6, `found ${retries}`);

  // ASSERT THE FIVE NAMES AND THE THROW, NOT ONE SPELLING OF THE CALL. The
  // first version of this check looked for `readFailed("bookings"` and failed on
  // correct code, because the five are thrown through a `[table, result]` list
  // and a loop. That is CLAUDE.md trap (k) caught in the act, in a file whose
  // header warns about it.
  for (const table of ["bookings", "blockout_dates", "dropoff_only_periods",
    "booking_hours_overrides", "business_hours"]) {
    ok(`3b · a failed ${table} read is named`, new RegExp(`"${table}"`).test(slots));
  }
  ok("3b · and each is thrown as a read failure", /throw readFailed\(table, r\.error\)/.test(slots));
  ok("3c · a non-answer is a 503 and says retryable, not a 500",
    /retryable \? 503 : 500/.test(slots) && /retryable,/.test(slots));
  ok("3d · an empty day range is a 400, never an empty success",
    /if \(!days\.length\)/.test(slots));

  ok("3e · getSettings throws rather than returning the defaults",
    /if \(error\) throw readFailed\("business_settings"/.test(tenant));
  ok("3f · the defaults it used to fall back to still say null for both modes",
    /mobile_enabled: null/.test(tenant) && /dropoff_enabled: null/.test(tenant));
  ok("3g · an unresolvable slug is still null, and a failed read is not",
    /if \(error\) throw readFailed\("businesses"/.test(tenant)
      && /return \(data as Business\) \?\? null;/.test(tenant));
}

// --- 4 · LIVE, IF CREDENTIALS ARE PRESENT ----------------------------------
// SKIPPING IS PRINTED. CLAUDE.md's most repeated failure is that a skipped
// check reads exactly like a passing one.
{
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log("  SKIP  4 · live availability — no SUPABASE_URL / SUPABASE_ANON_KEY "
      + "(run `set -a; . ./.env; set +a` first)");
  } else {
    const slug = process.env.DEMO_SLUG || "demo-detail";
    const today = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date());
    const post = (body) => fetch(`${url}/functions/v1/available-slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify(body),
    });

    const res = await post({ business_slug: slug, duration_minutes: 60, start_date: today, end_date: `${today.slice(0, 7)}-28` });
    const j = await res.json().catch(() => null);
    const days = j?.days ?? {};
    const keys = Object.keys(days).length;
    const bookable = Object.values(days).filter((d) => (d?.slots ?? []).length > 0).length;
    ok("4a · a month request answers 200", res.status === 200, `status ${res.status}`);
    ok("4b · it returns a day for every date asked about", keys > 0, `${keys} days`);
    // THE ASSERTION THAT IS THE WHOLE POINT: the demo business is open, so a
    // month with zero bookable days is the defect, not a fully booked diary.
    ok("4c · the demo business has bookable days", bookable > 0,
      `${bookable} of ${keys} days have times — zero is the empty-calendar defect`);

    const bad = await post({ business_slug: slug, duration_minutes: 60, start_date: `${today.slice(0, 7)}-28`, end_date: today });
    ok("4d · a reversed range is a 400, not an empty success", bad.status === 400, `status ${bad.status}`);

    const nobody = await post({ business_slug: "no-such-business-xyz", duration_minutes: 60, booking_date: today });
    ok("4e · an unknown slug is still 404", nobody.status === 404, `status ${nobody.status}`);
  }
}

console.log(`\navailability-honesty: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
