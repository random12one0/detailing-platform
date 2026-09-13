// THE DAY'S EMAIL ALLOWANCE, AND THE SLICE OF IT NOTHING BUT THE PLATFORM CAN
// SPEND.
//
// **Andrew, 2026-09-13:** *"The Plumbing tab shows email usage at 49 of 100 for
// today, and the test suites are spending it. If a heavy test run can exhaust
// the daily allowance then a real signup notice silently does not arrive. Work
// out whether that is true and make it impossible."*
//
// **IT WAS TRUE, AND IT HAD ALREADY HAPPENED TWICE IN A WEEK.**
// `platform_email_days` against a cap of 100:
//
//     2026-09-13   84 sent + 10 failed  =  94 attempts, by 06:55 UTC
//     2026-09-08  117 sent +  0 failed  = 117, over
//     2026-09-07  173 sent + 67 failed  = 240, two and a half times the cap
//
// There are no detailers on this product, so every one of those was ours.
//
// **THE FIX IS A RESERVE, CLAIMED BEFORE THE PROVIDER IS CALLED.** Tenant mail
// - every booking email, every reminder, everything a suite can trigger - stops
// at `email_daily_cap - email_platform_reserve`. The last slice is reachable
// only by mail the platform sends in its own name, which is the signup alert,
// billing mail and the dead man's switch.
//
// ---------------------------------------------------------------------------
// WHAT THIS FILE HAS TO PROVE, AND WHY EACH HALF NEEDS ITS OWN INSTRUMENT
// ---------------------------------------------------------------------------
// § 1 runs the REAL `claim_email_send` against the REAL row, because the whole
// point of it is that it is atomic in SQL and a JavaScript model of it would
// prove nothing about that.
//
// § 2 reads `send-email`'s source, because there is no Deno runner here. It
// asserts the ORDER of three things rather than a spelling: the claim must come
// after the two ways a send costs nothing (a reserved domain, a missing provider
// key) and before the provider is called. A claim in the wrong place is not a
// bug a value can show - it is a bug a position shows.
//
// Run: node tests/email-budget.test.mjs   (needs .env for § 1)

import "./_env.mjs";
import { readFileSync } from "node:fs";

const SB_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

let passed = 0, failed = 0, skipped = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};
const skip = (name, why) => { skipped++; console.log(`  SKIP  ${name} - ${why}`); };

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const rest = async (p, opts = {}) => {
  const r = await fetch(`${SB_URL}/rest/v1/${p}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const t = await r.text();
  try { return { status: r.status, body: t ? JSON.parse(t) : null }; }
  catch { return { status: r.status, body: t }; }
};
const rpc = (fn, body = {}) => rest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(body) });

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE CLAIM
// ═══════════════════════════════════════════════════════════════════════════
console.log("1. the reserve is real and only the platform can reach it");

const today = new Date().toISOString().slice(0, 10);
let restoreSettings = null, restoreDay = null;

if (!SB_URL || !KEY) {
  skip("every live check", "no SUPABASE_URL / service key in the environment");
} else {
  try {
    const ps = (await rest("platform_settings?select=email_daily_cap,email_platform_reserve&limit=1")).body?.[0];
    if (!ps) {
      skip("every live check", "no platform_settings row in this project");
    } else {
      restoreSettings = { ...ps };
      const day = (await rest(`platform_email_days?day=eq.${today}&select=claimed,sent,failed,refused,refused_platform`)).body?.[0];
      // **RESTORED WHATEVER HAPPENS, and that matters more here than in most
      // fixtures: this is the row the Plumbing tab draws and the number the
      // provider's limit is measured against. A suite that leaves it wrong has
      // broken the instrument it was checking.**
      restoreDay = day ? { ...day } : null;

      // A small cap and a small reserve, so the loop below is four calls rather
      // than a hundred. The arithmetic is the same at any size and this keeps
      // the suite off the provider's real numbers for as short a time as
      // possible.
      await rest("platform_settings?id=eq.true", { method: "PATCH", body: JSON.stringify({ email_daily_cap: 5, email_platform_reserve: 2 }) });
      const setClaimed = (n) => rest(`platform_email_days?day=eq.${today}`, { method: "PATCH", body: JSON.stringify({ claimed: n }) });
      const readClaimed = async () => (await rest(`platform_email_days?day=eq.${today}&select=claimed`)).body?.[0]?.claimed ?? null;
      const claim = async (platform) => (await rpc("claim_email_send", { p_platform: platform })).body;

      // Make sure the row exists at all, then zero it.
      await rpc("note_email_send", { p_ok: true });
      await setClaimed(0);

      // ── 1a · THE BASELINE. An always-false claim passes every refusal check
      // below and proves nothing, so the first thing asserted is that it says
      // YES when it should.
      check("1a a claim on an empty day is allowed", (await claim(false)) === true,
        "the claim refused the first email of the day - every refusal below is now meaningless");
      check("1a and it counted", (await readClaimed()) === 1);

      // ── 1b · TENANT MAIL STOPS AT cap - reserve ─────────────────────────
      await setClaimed(2);
      check("1b tenant mail is allowed at 2 of a 3-email tenant budget", (await claim(false)) === true);
      check("1b and refused at 3", (await claim(false)) === false,
        "tenant mail must stop at email_daily_cap minus email_platform_reserve");

      // ── 1c · A REFUSED CLAIM COSTS NOTHING ──────────────────────────────
      // It never reached the provider, so charging it would make tomorrow's
      // arithmetic wrong as well as today's - and would ratchet the number up
      // every time a suite retried.
      const before = await readClaimed();
      await claim(false);
      check("1c a refused claim does not consume the day", (await readClaimed()) === before,
        `claimed went ${before} -> ${await readClaimed()} on a refusal`);

      // ── 1d · THE RESERVE IS ONLY REACHABLE BY THE PLATFORM ──────────────
      // **This is the whole answer to his question.** At exactly the point
      // where a test run has spent everything it is allowed to, the signup
      // alert still goes out.
      check("1d platform mail IS allowed where tenant mail was refused", (await claim(true)) === true,
        "the signup alert must survive a heavy test run - this is the entire point of the reserve");
      check("1d and platform mail is refused at the FULL cap", await (async () => {
        await setClaimed(5);
        return (await claim(true)) === false;
      })(), "past the provider's own limit nothing may be claimed, platform or not");
      check("1d and a tenant is still refused there", await (async () => {
        await setClaimed(5);
        return (await claim(false)) === false;
      })());

      // ── 1e · A RESERVE OF ZERO IS THE OLD BEHAVIOUR ─────────────────────
      // Not a special case in the code: `cap - 0` is `cap`. Asserted because
      // somebody will one day set it to zero and should get exactly the
      // product that existed before this change, not an edge case.
      await rest("platform_settings?id=eq.true", { method: "PATCH", body: JSON.stringify({ email_platform_reserve: 0 }) });
      await setClaimed(4);
      check("1e with no reserve, tenant mail reaches the full cap", (await claim(false)) === true);
      check("1e and stops there", (await claim(false)) === false);

      // ── 1f · A REFUSAL IS COUNTED, IN ITS OWN COLUMN ────────────────────
      // Not counting it at all would make a day where real mail was turned
      // away look exactly like a quiet day - the silent failure this whole
      // item is about, reintroduced one level down.
      const readCol = async (c) => (await rest(`platform_email_days?day=eq.${today}&select=${c}`)).body?.[0]?.[c] ?? null;
      await rest("platform_settings?id=eq.true", { method: "PATCH", body: JSON.stringify({ email_platform_reserve: 2 }) });
      await setClaimed(5);
      const r0 = await readCol("refused"), rp0 = await readCol("refused_platform");
      await claim(false);
      check("1f a tenant refusal is counted in `refused`", (await readCol("refused")) === r0 + 1);
      check("1f and not as a platform refusal", (await readCol("refused_platform")) === rp0);
      await claim(true);
      check("1f a PLATFORM refusal is counted in both", (await readCol("refused")) === r0 + 2 && (await readCol("refused_platform")) === rp0 + 1,
        "refused_platform above zero is the emergency - the reserve itself is exhausted");
      const f0 = await readCol("failed");
      await claim(false);
      check("1f and no refusal touches `failed`", (await readCol("failed")) === f0,
        "failed belongs to the provider; a sweep retrying every 15 minutes would otherwise pour hundreds into it");
    }
  } finally {
    if (restoreSettings) await rest("platform_settings?id=eq.true", { method: "PATCH", body: JSON.stringify(restoreSettings) });
    if (restoreDay) await rest(`platform_email_days?day=eq.${today}`, { method: "PATCH", body: JSON.stringify(restoreDay) });
    if (restoreSettings) console.log("  (the cap, the reserve and today's counts were put back)");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE RELAY CLAIMS IN THE RIGHT PLACE
// ═══════════════════════════════════════════════════════════════════════════
console.log("\n2. send-email claims after the free exits and before the provider");
{
  const src = readFileSync(new URL("../supabase/functions/send-email/index.ts", import.meta.url), "utf8");
  // THE SUBJECT COUNT. Every check under this line is a NEGATIVE, and a
  // negative over an EMPTY file is true. Measured 2026-09-13 by truncating
  // every product source file to zero bytes: 2 of them stayed green over
  // nothing. Asserting the bytes is what stops a read that silently returned
  // an empty string from reading as a clean bill.
  check("2a-0 the relay source was actually read", src.length > 4000, `${src.length} bytes`);


  const at = (needle) => src.indexOf(needle);
  const claimAt = at("claim_email_send");
  const resendAt = at("https://api.resend.com/emails");
  const domainAt = at("undeliverable_domain");
  const keyAt = at("no_provider_key");

  check("2z all four landmarks are present", claimAt > 0 && resendAt > 0 && domainAt > 0 && keyAt > 0,
    `claim ${claimAt}, resend ${resendAt}, domain ${domainAt}, key ${keyAt} - a missing one makes every order check below vacuous`);

  // **THE ORDER IS THE ASSERTION.** A claim above the reserved-domain exit
  // would have every `.test` and `example.com` fixture in the repo spending a
  // budget it never touches, which inverts the fix; a claim below the fetch
  // would be a counter rather than a gate.
  check("2a the reserved-domain exit comes BEFORE the claim", domainAt < claimAt,
    "fixtures on .test / example.com cost the provider nothing and must cost the budget nothing");
  check("2b the missing-key exit comes BEFORE the claim", keyAt < claimAt,
    "an environment with no provider key sends nothing and must spend nothing");
  check("2c the claim comes BEFORE the provider call", claimAt < resendAt,
    "claiming after the send is a counter, not a gate - that is what note_email_send already was");

  // `fromPlatform` is the discriminator and it already existed. Asserting the
  // VARIABLE rather than the string `sender_name`, per trap (k).
  check("2d the claim is told whether this is platform mail",
    /claim_email_send",\s*\{\s*p_platform:\s*fromPlatform\s*\}/.test(src),
    "without fromPlatform the reserve protects nothing in particular");

  // The refusal has to be loud, must not blame the customer, and must show up
  // in the day's numbers.
  // **STRIPPED OF COMMENTS FIRST.** The first version of 2g searched the raw
  // slice for `markAddress` and failed on the comment that says markAddress is
  // deliberately NOT called - a check reading the prose that explains it rather
  // than the code that does it.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const cAt = code.indexOf("claim_email_send");
  const rAt = code.indexOf("https://api.resend.com/emails");
  const refusal = code.slice(cAt, rAt);
  check("2e a refusal is logged with the recipient", /console\.error\([^)]*BUDGET[\s\S]{0,200}to,/.test(refusal),
    "the defect Andrew named is a silent one - a refusal nobody can see is the same defect");
  // **NOT `note(false)`, AND THAT IS THE ASSERTION.** `failed` means the
  // provider rejected it; a budget refusal never reached the provider. It also
  // could not survive a sweep - a refused reminder retries every fifteen
  // minutes, and that would have poured hundreds into the one number Andrew
  // reads. The refusal is counted by `claim_email_send` in its own column.
  check("2f a refusal is NOT counted as a provider failure", !/note\(false\)/.test(refusal),
    "failed belongs to the provider - a refusal that never reached it must not land there");
  check("2y the refusal block was actually sliced", cAt > 0 && rAt > cAt && refusal.length > 200,
    `slice length ${rAt - cAt} - every check below is measuring nothing`);
  check("2g a refusal does not stamp the customer", !/markAddress\(/.test(refusal),
    "our own cap has never been the customer's address being wrong - testing loop F-025");
  check("2h a refusal answers 429 with a reason and retryable",
    /reason: "daily_cap"/.test(refusal) && /retryable: true/.test(refusal) && /\}, 429\)/.test(refusal));

  // A claim that ERRORS must not stop mail. A counter is never allowed to be
  // the reason a booking's confirmation does not go out.
  check("2i a failed claim sends anyway", /claimAllowed = true;/.test(src) && /sending anyway/.test(src),
    "fail-open on the claim itself; the provider's own 429 is still the backstop");
  check("2j the rpc error is read rather than assumed", /const \{ data, error \} = await supabase\.rpc\("claim_email_send"/.test(src),
    "reading only `data` turns a PostgREST 504 into null, which is not false, which is 'allowed' by accident");
}

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed > 0 ? 1 : 0);
