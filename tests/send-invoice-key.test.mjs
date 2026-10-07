// ROADMAP 6.4 — A REPEATED "SEND INVOICE" LEAVES ONE EMAIL: THE CLIENT KEY'S SERVER HALF, RUN IN MEMORY.
//
//   node --test tests/send-invoice-key.test.mjs
//
// Credential-free, no network, no database, no Resend, no Deno. It loads
// supabase/functions/_shared/sendInvoiceClaim.ts (import-free, so Node 24 strips the types) and hands it an
// in-memory store whose operations are atomic the way the real table's are.
//
// WHAT IT PROVES: the state machine. A first claim goes; a second while the first is in flight is busy; a repeat of
// a key that was sent is answered as a duplicate and carries what the first answered; a key that failed may be
// retried by exactly one of two presses; one that has sat `sending` past two minutes is a crash and exactly one
// caller takes it over; a different key (a deliberate second send) and the same key on another booking both go; a
// malformed key is an error and never "no key"; and a store that cannot be used makes the answer `unavailable`
// rather than stopping the invoice. And, read as text, that `send-invoice` claims after its own checks and before
// anything is sent, releases the key on every way out, and says when nothing was deduped.
//
// WHAT IT DOES NOT PROVE: that the deployed function does it (it is not published), the real table (see
// `tests/send-invoice-key-sql.test.mjs`, on PGlite), or an email actually sent: the end-to-end two-presses case
// below drives the same claim calls the function makes with a counter standing in for Resend, and says so.
//
// BREAK IT ON PURPOSE: § 6 rebuilds the module with ONE guard removed at a time and asserts the matching probe
// goes red.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as real from "../supabase/functions/_shared/sendInvoiceClaim.ts";

const BIZ = "11111111-1111-4111-8111-111111111111";
const BOOK = "22222222-2222-4222-8222-222222222222";
const BOOK2 = "33333333-3333-4333-8333-333333333333";
const K1 = "44444444-4444-4444-8444-444444444444";
const K2 = "55555555-5555-4555-8555-555555555555";
const T0 = new Date("2026-10-06T12:00:00Z");
const minutes = (n) => new Date(T0.getTime() + n * 60_000);

/** An in-memory table. Every operation is one synchronous step inside an async function, so two callers cannot interleave inside one. */
function memoryStore(over = {}) {
  const rows = new Map();
  const id = (b, k) => `${b}|${k}`;
  const s = {
    rows, broken: false, ...over,
    async insert(biz, book, key, nowIso) {
      if (s.broken) throw new Error("relation does not exist");
      if (rows.has(id(book, key))) return false;
      rows.set(id(book, key), { state: "sending", response: null, updated_at: nowIso });
      return true;
    },
    async get(book, key) {
      if (s.broken === "get") throw new Error("boom");
      const r = rows.get(id(book, key)); return r ? { ...r } : null;
    },
    async move(book, key, from, to, nowIso, olderThanIso, response) {
      if (s.broken === "move") throw new Error("boom");
      const r = rows.get(id(book, key));
      if (!r || !from.includes(r.state)) return false;
      if (olderThanIso && !(r.updated_at < olderThanIso)) return false;
      r.state = to; r.updated_at = nowIso; if (response) r.response = response;
      return true;
    },
  };
  return s;
}

async function probes(mod) {
  const P = {};
  const kinds = async (store, now, key, book = BOOK) => (await mod.claim(store, now, BIZ, book, key)).kind;
  P.noKey = (await kinds(memoryStore(), T0, undefined)) === "nokey" && (await kinds(memoryStore(), T0, null)) === "nokey";
  P.badKey = (await Promise.all(["abc", "", 5, {}, K1 + "x", "not-a-uuid-at-all-nope"].map((k) => kinds(memoryStore(), T0, k)))).every((x) => x === "bad");
  { const s = memoryStore(); P.firstGoes = (await kinds(s, T0, K1)) === "go"; P.secondInFlightIsBusy = (await kinds(s, minutes(0.5), K1)) === "busy"; }
  { const s = memoryStore(); await mod.claim(s, T0, BIZ, BOOK, K1); await mod.settleSent(s, T0, BOOK, K1, true);
    const c = await mod.claim(s, minutes(10), BIZ, BOOK, K1); P.sentIsDuplicate = c.kind === "duplicate" && c.thankYouSent === true;
    const s2 = memoryStore(); await mod.claim(s2, T0, BIZ, BOOK, K1); await mod.settleSent(s2, T0, BOOK, K1, false);
    P.duplicateCarriesFalse = (await mod.claim(s2, minutes(1), BIZ, BOOK, K1)).thankYouSent === false; }
  { const s = memoryStore(); await mod.claim(s, T0, BIZ, BOOK, K1); await mod.settleFailed(s, T0, BOOK, K1);
    const two = await Promise.all([mod.claim(s, minutes(1), BIZ, BOOK, K1), mod.claim(s, minutes(1), BIZ, BOOK, K1)]);
    P.failedRetriedByExactlyOne = two.filter((c) => c.kind === "go").length === 1 && two.filter((c) => c.kind === "busy").length === 1; }
  { const s = memoryStore(); await mod.claim(s, T0, BIZ, BOOK, K1);
    P.freshSendingIsBusy = (await kinds(s, minutes(1.9), K1)) === "busy";
    const two = await Promise.all([mod.claim(s, minutes(3), BIZ, BOOK, K1), mod.claim(s, minutes(3), BIZ, BOOK, K1)]);
    P.staleTakenByExactlyOne = two.filter((c) => c.kind === "go").length === 1; }
  { const s = memoryStore(); const CAP = "ABCDEFAB-ABCD-4BCD-8BCD-ABCDEFABCDEF";
    P.oneKeyInEitherCase = (await kinds(s, T0, CAP)) === "go" && (await kinds(s, minutes(0.1), CAP.toLowerCase())) === "busy"; }
  { const s = memoryStore(); await mod.claim(s, T0, BIZ, BOOK, K1); await mod.settleSent(s, T0, BOOK, K1, true);
    P.newKeyGoes = (await kinds(s, minutes(5), K2)) === "go";
    P.otherBookingGoes = (await kinds(s, minutes(5), K1, BOOK2)) === "go"; }
  { P.unavailableNotThrown = (await kinds(memoryStore({ broken: true }), T0, K1)) === "unavailable";
    const s = memoryStore(); await mod.claim(s, T0, BIZ, BOOK, K1); s.broken = "get";
    P.unavailableOnReadFailure = (await kinds(s, minutes(1), K1)) === "unavailable"; }
  { const s = memoryStore({ broken: "move" });
    P.settleNeverThrows = (await mod.settleSent(s, T0, BOOK, K1, true)) === false && (await mod.settleFailed(s, T0, BOOK, K1)) === false; }
  return P;
}

test("1 · every property of the state machine holds on the real module", async () => {
  const P = await probes(real);
  const red = Object.entries(P).filter(([, v]) => v !== true).map(([k]) => k);
  assert.deepEqual(red, [], "properties that do not hold: " + red.join(", "));
  assert.ok(Object.keys(P).length >= 15, "the probe list shrank");
});

test("2 · two presses at once, then a third later, send ONE invoice and answer the others (the function's own sequence, a counter for Resend)", async () => {
  const s = memoryStore();
  let sent = 0;
  // Mirrors `send-invoice`: claim, send on go / nokey / unavailable, settle.
  const press = async (key, now) => {
    const c = await real.claim(s, now, BIZ, BOOK, key);
    if (c.kind === "duplicate") return { status: 200, duplicate: true };
    if (c.kind === "busy") return { status: 409 };
    sent++; await new Promise((r) => setTimeout(r, 5));
    if (c.kind === "go") await real.settleSent(s, now, BOOK, key, true);
    return { status: 200 };
  };
  const both = await Promise.all([press(K1, T0), press(K1, T0)]);
  assert.equal(sent, 1, "two presses of one intent sent more than one email");
  assert.deepEqual(both.map((r) => r.status).sort(), [200, 409]);
  const later = await press(K1, minutes(30));
  assert.deepEqual([later.duplicate, sent], [true, 1], "a repeat after the first landed must be answered, not sent");
  await press(K2, minutes(31));
  assert.equal(sent, 2, "a deliberate second send takes a new key and goes");
  const oldClient = await press(undefined, minutes(40)); const again = await press(undefined, minutes(41));
  assert.equal(sent, 4, "no key is the old behaviour: every press sends");
  assert.deepEqual([oldClient.status, again.status], [200, 200]);
});

test("3 · a failed send releases the key, so the retry the failure asked for goes through", async () => {
  const s = memoryStore();
  assert.equal((await real.claim(s, T0, BIZ, BOOK, K1)).kind, "go");
  await real.settleFailed(s, T0, BOOK, K1);
  assert.equal((await real.claim(s, minutes(1), BIZ, BOOK, K1)).kind, "go");
});

// ── the function, read as text ──────────────────────────────────────────────────────────────────────────
const FN = "supabase/functions/send-invoice/index.ts";
const wiring = (src) => {
  const at = (needle) => src.indexOf(needle);
  return {
    imported: /import \{ claim, type ClaimStore, settleFailed, settleSent \} from "\.\.\/_shared\/sendInvoiceClaim\.ts"/.test(src),
    afterChecks: at("await claim(claimStore") > at('error: "no_customer_email"'),
    beforeBuild: at("await claim(claimStore") < at("const business = (await businessById") && at("await claim(claimStore") < at("await sendTenantEmail"),
    duplicateAnswered: /attempt\.kind === "duplicate"\) return json\(\{ success: true, duplicate: true/.test(src),
    busy409: /attempt\.kind === "busy"\) return json\(\{ error: "in_progress" \}, 409\)/.test(src),
    badKey400: /attempt\.kind === "bad"\) return json\(\{ error: "idempotency_key must be a UUID" \}, 400\)/.test(src),
    releasedOnFailure: (src.match(/await settleFailed\(claimStore/g) ?? []).length === 2,
    settledOnSuccess: at("await settleSent(claimStore") > at('error: "email_failed"') && /thank_you_sent: thankYouSent, \.\.\.\(notDeduped/.test(src),
    saysNotDeduped: /idempotent: false/.test(src),
  };
};

test("4 · send-invoice claims after its own checks and before building or sending, releases on both failures, and says when nothing was deduped", () => {
  const w = wiring(readFileSync(FN, "utf8"));
  const wrong = Object.entries(w).filter(([, v]) => v !== true).map(([k]) => k);
  assert.deepEqual(wrong, [], "wiring that is wrong: " + wrong.join(", "));
});

test("5 · canary: the wiring reader sees each piece removed", () => {
  const src = readFileSync(FN, "utf8");
  assert.equal(wiring(src.replace("await claim(claimStore, new Date(), member.businessId, booking.id, body.idempotency_key)", "{ kind: 'nokey' }")).afterChecks, false);
  assert.equal(wiring(src.replace(/await settleFailed\(claimStore, new Date\(\), claimedBooking, claimedKey\);\n      return json\(\{ error: "email_failed"/, 'return json({ error: "email_failed"')).releasedOnFailure, false);
  assert.equal(wiring(src.replace("thank_you_sent: thankYouSent, ...(notDeduped", "thank_you_sent: thankYouSent, ...(other")).settledOnSuccess, false);
  assert.equal(wiring(src.replace("idempotent: false", "x: 1")).saysNotDeduped, false);
  assert.equal(wiring(src.replace('attempt.kind === "duplicate"', 'attempt.kind === "dup"')).duplicateAnswered, false);
});

// ── 6 · break it on purpose ─────────────────────────────────────────────────────────────────────────────
const dir = mkdtempSync(path.join(tmpdir(), "send-invoice-key-"));
let n = 0;
async function build(from, to) {
  const src = readFileSync("supabase/functions/_shared/sendInvoiceClaim.ts", "utf8");
  assert.equal(src.split(from).length, 2, "the sabotage did not apply: " + from);
  const file = path.join(dir, `claim-${++n}.ts`);
  writeFileSync(file, src.replace(from, () => to));
  return import(pathToFileURL(file).href);
}
const SABOTAGE = [
  ["a malformed key reads as no key", "if (!validKey(key)) return { kind: \"bad\" };", "if (!validKey(key)) return { kind: \"nokey\" };", ["badKey"]],
  ["a capital key is a second key", "key = key.toLowerCase();", "", ["oneKeyInEitherCase"]],
  ["a sent key is sent again", "if (row.state === \"sent\") return { kind: \"duplicate\", thankYouSent: row.response?.thank_you_sent === true };", "if (row.state === \"sent\") return { kind: \"go\" };", ["sentIsDuplicate", "duplicateCarriesFalse"]],
  ["the first answer is not carried", "thankYouSent: row.response?.thank_you_sent === true", "thankYouSent: false", ["sentIsDuplicate"]],
  ["a failed key is taken by everyone", "return (await store.move(bookingId, key, [\"failed\"], \"sending\", nowIso)) ? { kind: \"go\" } : { kind: \"busy\" };", "return { kind: \"go\" };", ["failedRetriedByExactlyOne"]],
  ["a stale send is never taken over", "(await store.move(bookingId, key, [\"sending\"], \"sending\", nowIso, cutoff)) ? { kind: \"go\" } : { kind: \"busy\" }", "false ? { kind: \"go\" } : { kind: \"busy\" }", ["staleTakenByExactlyOne"]],
  ["every in-flight send is taken over", "(await store.move(bookingId, key, [\"sending\"], \"sending\", nowIso, cutoff)) ? { kind: \"go\" } : { kind: \"busy\" }", "{ kind: \"go\" }", ["freshSendingIsBusy", "secondInFlightIsBusy", "staleTakenByExactlyOne"]],
  ["an unusable store throws", "  } catch {\n    return { kind: \"unavailable\" };\n  }", "  } finally { }", ["unavailableNotThrown", "unavailableOnReadFailure"]],
  ["a failed settle throws", "try { return await store.move(bookingId, key, [\"sending\"], \"failed\", now.toISOString()); }\n  catch { return false; }", "return await store.move(bookingId, key, [\"sending\"], \"failed\", now.toISOString());", ["settleNeverThrows"]],
];

test("6 · each guard removed alone turns its own probe red", async () => {
  for (const [name, from, to, expect] of SABOTAGE) {
    const mod = await build(from, to);
    const P = await probes(mod).catch(() => ({ __threw: false }));
    const red = Object.entries(P).filter(([, v]) => v !== true).map(([k]) => k);
    if (P.__threw === false) { assert.ok(expect.some((e) => /unavailable|settle/.test(e)), `${name}: the probes threw but were not expected to`); continue; }
    for (const e of expect) assert.ok(red.includes(e), `${name}: expected "${e}" to go red, red was [${red.join(", ")}]`);
  }
});
