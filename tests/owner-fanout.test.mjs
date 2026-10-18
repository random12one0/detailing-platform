// ROADMAP 97.5 — ONE BAD OWNER ADDRESS MUST NOT RE-SEND TO THE GOOD ONES.
//
// The owner reminder and the stale-request nudge used to throw on the first
// refused owner address, after earlier addresses had already been sent, so the
// booking was never marked and every 15-minute sweep sent the good address the
// same email again — and skipped the push.
//
// § 1 runs the REAL `sendToEachOwner` and `requireOwnerReached` (node strips
// the types) through simulated sweeps whose due-ness is the marker, exactly as
// the RPCs decide it. § 2 reads the sweep's source, because
// send-owner-reminders/index.ts calls `Deno.serve` at module scope and cannot
// be imported under Node: it checks both paths route through the helpers, in
// the order emails → push → reached-check → mark.
//
// Credential-free. Two sabotages, env vars rather than flags (docs/gotchas.md 104):
//   BREAK=throw-first  the pre-97.5 shape: throw on the first refused address.
//                      The two acceptance-criteria tests must go red.
//   BREAK=email-only   the first 97.5 version: a delivered push does not count,
//                      so a one-address business gets no push while email is
//                      down (the review finding). The one-address test must go red.
//
//   node --test tests/owner-fanout.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireOwnerReached as realReached, sendToEachOwner as realFan } from "../supabase/functions/_shared/ownerFanout.ts";

const BREAK = process.env.BREAK ?? "";
const fan = BREAK === "throw-first"
  ? async (recipients, send) => {
    let sent = 0;
    for (const to of recipients) {
      if (!(await send(to))) throw new Error("the email relay refused it");
      sent++;
    }
    return { sent, failed: [] };
  }
  : realFan;
const reached = BREAK === "email-only"
  ? (r, what) => realReached({ ...r, pushed: 0 }, what)
  : realReached;

// One sweep over one booking, in the order the function runs it: skip when
// marked; emails; push (counted only if a device took it); reached-check;
// mark. A throw is the sweep's catch: recorded as failed, marker untouched.
async function sweep(state, recipients, relay, devices = 1) {
  if (state.marked) return;
  try {
    const { sent } = await fan(recipients, async (to) => { state.mail.push(to); return relay(to); });
    state.pushes++;
    reached({ addresses: recipients.length, sent, pushed: devices }, "owner reminder");
    state.marked = true;
  } catch { /* marker untouched */ }
}
const fresh = () => ({ marked: false, mail: [], pushes: 0 });
const count = (state, to) => state.mail.filter((t) => t === to).length;

test("two addresses, the second always refused: a second sweep sends nothing new to the first", async () => {
  const state = fresh();
  const relay = (to) => to === "good@example.com";
  await sweep(state, ["good@example.com", "bad@example.com"], relay);
  await sweep(state, ["good@example.com", "bad@example.com"], relay);
  assert.equal(count(state, "good@example.com"), 1, `good address emailed ${count(state, "good@example.com")} times over two sweeps`);
  assert.equal(state.marked, true, "the booking was never marked, so every sweep re-sends");
});

test("the owner push is sent once even when one email recipient fails", async () => {
  const state = fresh();
  const relay = (to) => to !== "bad@example.com";
  for (let i = 0; i < 3; i++) await sweep(state, ["bad@example.com", "good@example.com"], relay);
  assert.equal(state.pushes, 1, `push sent ${state.pushes} times over three sweeps`);
});

test("review finding: ONE address, always refused, push delivered — the push goes exactly once", async () => {
  const state = fresh();
  for (let i = 0; i < 3; i++) await sweep(state, ["only@example.com"], () => false);
  assert.equal(state.pushes, 1, `push sent ${state.pushes} times over three sweeps while email was down`);
  assert.equal(state.marked, true, "a delivered push reached the owner, so the nudge must be marked");
});

test("every address refused and no device took the push: not marked, so the next sweep retries", async () => {
  const state = fresh();
  await sweep(state, ["a@example.com", "b@example.com"], () => false, 0);
  assert.equal(state.marked, false, "marked although nothing reached the owner");
  assert.throws(() => realReached({ addresses: 2, sent: 0, pushed: 0 }, "owner reminder"), /refused the owner reminder/);
});

test("the refused address is reported, not swallowed; a send that throws counts as refused", async () => {
  assert.deepEqual(await realFan(["a@example.com", "b@example.com"], async (to) => to === "a@example.com"), { sent: 1, failed: ["b@example.com"] });
  assert.deepEqual(await realFan(["a@example.com"], async () => { throw new Error("boom"); }), { sent: 0, failed: ["a@example.com"] });
});

test("no addresses at all is not a failure (email off, or no contact address)", () => {
  assert.doesNotThrow(() => realReached({ addresses: 0, sent: 0, pushed: 0 }, "x"));
});

const src = readFileSync(new URL("../supabase/functions/send-owner-reminders/index.ts", import.meta.url), "utf8");
const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("the sweep source was actually read", () => {
  assert.ok(code.length > 4000, `${code.length} bytes — every check below measures nothing`);
});

for (const [name, start, what] of [
  ["owner reminder", "async function sendOwnerReminder", '"owner reminder"'],
  ["stale request nudge", "for (const b of requestDue.data", '"stale request nudge"'],
]) {
  test(`the ${name} runs emails, then push, then the reached-check`, () => {
    const at = code.indexOf(start);
    assert.ok(at > 0, `${start} not found`);
    const body = code.slice(at, at + 2500);
    const f = body.indexOf("sendToEachOwner(");
    const p = body.indexOf("sendOwnerPush(");
    const r = body.indexOf("requireOwnerReached(");
    assert.ok(f > 0, "the owner emails no longer go through sendToEachOwner");
    assert.ok(p > f, "the push comes before the email fan-out");
    assert.ok(r > p, "the reached-check runs before the push, so an all-refused send skips the push again");
    assert.ok(body.slice(r, r + 200).includes(what), `the reached-check is not named ${what} here`);
    assert.ok(/pushed/.test(body.slice(r, r + 200)), "the reached-check ignores the push");
    assert.ok(!/for \(const to of ownerRecipients/.test(body), "a hand-written per-address loop is back");
  });
}
