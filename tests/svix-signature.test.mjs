// ROADMAP 14.3 — THE WEBHOOK SIGNATURE, RUN RATHER THAN READ.
//
// `resend-webhook` is the second unauthenticated endpoint in this repo that
// WRITES, and like `stripe-webhook` its signature check is the entire
// authentication. Without it anybody could POST `email.bounced` for an address
// they do not own and have this product tell a detailer that their customer is
// unreachable — and `send-campaign` filters on that flag, so the customer would
// then quietly stop receiving anything.
//
// **THIS FILE IMPORTS `_shared/svix.ts` AND CALLS IT.** That is the whole
// reason the verifier lives in its own import-free file: a check that greps the
// source asserts how something is WRITTEN, and only one that runs it asserts
// what it DOES — CLAUDE.md trap (k), and the lesson `_shared/stripe.ts` wrote
// down after its own signature loop sat untestable inside `Deno.serve`.
// Node 24 strips the types on import, the same way `tests/campaign.test.mjs`
// already loads `_shared/emailTemplates.ts`.
//
// Credential-free: it needs no `.env`, no network and no Supabase project, so
// it runs on a bare clone.
//
//   node tests/svix-signature.test.mjs

import { createHmac, randomUUID } from "node:crypto";
import { SvixError, verifySvix } from "../supabase/functions/_shared/svix.ts";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name} ${detail}`); }
};

// A secret of the shape Resend issues. Not a real one and it never leaves this
// file: the signature scheme does not care what the bytes are.
const SECRET = "whsec_" + Buffer.from("roadmap-14-3-signing-key-32bytes").toString("base64");
const NOW = 1_757_000_000;

/** Signs a body the way Svix does, so the test drives the real scheme. */
const sign = (raw, { secret = SECRET, ts = NOW, id = "msg_" + randomUUID() } = {}) => {
  const key = Buffer.from(String(secret).replace(/^whsec_/, ""), "base64");
  const sig = createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest("base64");
  return { headers: { id, timestamp: String(ts), signature: `v1,${sig}` }, raw };
};

/** Runs the verifier and reports what happened, without throwing at the caller. */
const verify = async (raw, headers, { secret = SECRET, now = NOW, tolerance = 300 } = {}) => {
  try {
    return { ok: true, event: await verifySvix(raw, headers, secret, tolerance, now) };
  } catch (e) {
    return { ok: false, message: e.message, status: e instanceof SvixError ? e.status : null };
  }
};

const BODY = JSON.stringify({
  type: "email.bounced",
  data: { email_id: "01a0adcf-6db4-772c-b6fc-b4650423e5f2", bounce: { message: "No such mailbox." } },
});

console.log("\n§ 1 — a genuine event is accepted");
{
  const { headers, raw } = sign(BODY);
  const r = await verify(raw, headers);
  check("a correctly signed body verifies", r.ok, r.message);
  check("and it comes back parsed", r.event?.type === "email.bounced", JSON.stringify(r.event).slice(0, 80));
  // THE PREFIX IS A LABEL, NOT PART OF THE KEY. A secret pasted out of the
  // Resend dashboard without it must still work, or the first symptom is every
  // delivery event failing with "Bad signature" and nobody knowing why.
  const bare = await verify(raw, headers, { secret: SECRET.slice(6) });
  check("the `whsec_` prefix is optional", bare.ok, bare.message);
}

console.log("\n§ 2 — every way a forgery is refused");
{
  const { headers, raw } = sign(BODY);

  const wrongKey = await verify(raw, headers,
    { secret: "whsec_" + Buffer.from("a-different-key-entirely-32bytes").toString("base64") });
  check("a body signed with another secret is refused", !wrongKey.ok, "it was accepted");
  check("and that refusal is a 400", wrongKey.status === 400, String(wrongKey.status));

  // THE BODY MUST BE THE RAW TEXT. A single changed character has to fail, or
  // the signature is decoration.
  const tampered = raw.replace("No such mailbox.", "No such mailbox!");
  const r2 = await verify(tampered, headers);
  check("one character changed in the body is refused", !r2.ok, "it was accepted");

  // THE SAME JSON, DIFFERENT BYTES. A provider that pretty-prints its payload
  // signs the bytes it sent; re-serialising on our side produces the same
  // OBJECT and a different string, and the signature must fail. This is the
  // mistake that tempts somebody to "fix" the check by parsing first, which
  // removes the check. Signed pretty, offered compact.
  const pretty = JSON.stringify(JSON.parse(BODY), null, 2);
  const prettySigned = sign(pretty);
  check("the same JSON with different whitespace is refused",
    pretty !== BODY && !(await verify(BODY, prettySigned.headers)).ok, "it was accepted");
  check("and the bytes that were actually signed still verify",
    (await verify(pretty, prettySigned.headers)).ok, "a real event was refused");

  const swapped = { ...headers, id: "msg_" + randomUUID() };
  check("a valid signature replayed under a different message id is refused",
    !(await verify(raw, swapped)).ok, "it was accepted");

  // A LAST-CHARACTER DIFFERENCE. The compare is constant-time, and a
  // constant-time compare that is subtly wrong still has to say no.
  const sig = headers.signature.slice(3);
  const nudged = sig.slice(0, -2) + (sig.endsWith("A=") ? "B=" : "A=");
  check("a signature differing in its last characters is refused",
    !(await verify(raw, { ...headers, signature: `v1,${nudged}` })).ok, "it was accepted");
}

console.log("\n§ 3 — the timestamp tolerance, which cannot be checked by reading");
{
  const old = sign(BODY, { ts: NOW - 301 });
  const r = await verify(old.raw, old.headers);
  check("a genuine signature from six minutes ago is refused", !r.ok, "it was accepted");
  check("and it says so rather than saying `bad signature`",
    /tolerance/i.test(r.message ?? ""), r.message);

  const future = sign(BODY, { ts: NOW + 400 });
  check("a signature timestamped in the future is refused",
    !(await verify(future.raw, future.headers)).ok, "it was accepted");

  const edge = sign(BODY, { ts: NOW - 299 });
  check("a signature from just inside the window is accepted",
    (await verify(edge.raw, edge.headers)).ok, "a real event was refused");

  const nonsense = sign(BODY);
  check("a non-numeric timestamp is refused",
    !(await verify(nonsense.raw, { ...nonsense.headers, timestamp: "yesterday" })).ok, "it was accepted");
}

console.log("\n§ 4 — rotation, and the two ways the call can be mis-made");
{
  const { headers, raw } = sign(BODY);
  // A ROTATING SECRET MEANS MORE THAN ONE SIGNATURE ARRIVES AT ONCE. Refusing
  // the whole request because the FIRST entry is the old key would take the
  // endpoint down for the length of a rotation.
  const both = { ...headers, signature: `v1,AAAAinvalidAAAA= ${headers.signature}` };
  check("one valid signature among several is accepted", (await verify(raw, both)).ok, "it was refused");

  const none = { ...headers, signature: "v0,something-else" };
  check("a list with no v1 entry is refused", !(await verify(raw, none)).ok, "it was accepted");

  for (const missing of ["id", "timestamp", "signature"]) {
    const h = { ...headers, [missing]: null };
    const r = await verify(raw, h);
    check(`a request with no svix-${missing} header is refused`, !r.ok, "it was accepted");
  }

  // NO SECRET IS A 503, NOT A 400. Nothing is wrong with the request; the
  // endpoint is not switched on. A 400 makes the provider stop retrying an
  // event that would have been handled once somebody sets the secret.
  const unset = await verify(raw, headers, { secret: "" });
  check("an unconfigured secret is a 503 and not a refusal of the request",
    !unset.ok && unset.status === 503, `${unset.status} ${unset.message}`);
}

console.log(`\n${passed} passed, ${failed} failed.`);
process.exit(failed ? 1 : 0);
