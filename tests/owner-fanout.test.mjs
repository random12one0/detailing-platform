// ROADMAP 97.5 — ONE BAD OWNER ADDRESS MUST NOT RE-SEND TO THE GOOD ONES.
//
// The owner reminder and the stale-request nudge used to throw on the first
// refused owner address, after earlier addresses had already been sent, so the
// booking was never marked and every 15-minute sweep sent the good address the
// same email again — and skipped the push.
//
// § 1 runs the REAL `sendToEachOwner` (node strips the types) through two
// simulated sweeps whose due-ness is the marker, exactly as the RPCs decide it.
// § 2 reads the sweep's source, because send-owner-reminders/index.ts calls
// `Deno.serve` at module scope and cannot be imported under Node: it checks
// both loops route through the helper and that the push comes after it.
//
// Credential-free. Sabotage: `BREAK=throw-first node --test tests/owner-fanout.test.mjs`
// swaps in the old throw-on-first-refusal behaviour and § 1 must go red
// (an env var, not a flag — docs/gotchas.md 104).
//
//   node --test tests/owner-fanout.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sendToEachOwner as real } from "../supabase/functions/_shared/ownerFanout.ts";

// The pre-97.5 shape: `mustSend` inside the loop throws on the first refusal.
async function throwFirst(recipients, send, what) {
  let sent = 0;
  for (const to of recipients) {
    if (!(await send(to))) throw new Error(`the email relay refused the ${what}`);
    sent++;
  }
  return { sent, failed: [] };
}
const sendToEachOwner = process.env.BREAK === "throw-first" ? throwFirst : real;

// One sweep over one booking, shaped like the owner-reminder loop: skip when
// the marker is set, send emails, push, mark; a throw leaves the marker alone.
async function sweep(state, recipients, relay) {
  if (state.marked) return;
  try {
    await sendToEachOwner(recipients, async (to) => { state.mail.push(to); return relay(to); }, "owner reminder");
    state.pushes++;
    state.marked = true;
  } catch { /* the sweep's catch: recorded as failed, marker untouched */ }
}

test("two addresses, the second always refused: a second sweep sends nothing new to the first", async () => {
  const state = { marked: false, mail: [], pushes: 0 };
  const relay = (to) => to === "good@example.com";
  await sweep(state, ["good@example.com", "bad@example.com"], relay);
  await sweep(state, ["good@example.com", "bad@example.com"], relay);
  assert.equal(state.mail.filter((t) => t === "good@example.com").length, 1, `good address emailed ${state.mail.filter((t) => t === "good@example.com").length} times over two sweeps`);
  assert.equal(state.marked, true, "the booking was never marked, so every sweep re-sends");
});

test("the owner push is sent once even when one email recipient fails", async () => {
  const state = { marked: false, mail: [], pushes: 0 };
  const relay = (to) => to !== "bad@example.com";
  for (let i = 0; i < 3; i++) await sweep(state, ["bad@example.com", "good@example.com"], relay);
  assert.equal(state.pushes, 1, `push sent ${state.pushes} times over three sweeps`);
});

test("the refused address is reported, not swallowed", async () => {
  const r = await real(["a@example.com", "b@example.com"], async (to) => to === "a@example.com", "owner reminder");
  assert.deepEqual(r, { sent: 1, failed: ["b@example.com"] });
});

test("every address refused still throws, so the marker is held and the next sweep retries", async () => {
  await assert.rejects(real(["a@example.com", "b@example.com"], async () => false, "owner reminder"), /refused the owner reminder/);
  // A send that throws (a template or language lookup) counts as refused.
  await assert.rejects(real(["a@example.com"], async () => { throw new Error("boom"); }, "x"), /refused the x/);
});

test("no addresses at all is not a failure (email off, or no contact address)", async () => {
  assert.deepEqual(await real([], async () => false, "x"), { sent: 0, failed: [] });
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
  test(`the ${name} sends through sendToEachOwner and pushes after it`, () => {
    const at = code.indexOf(start);
    assert.ok(at > 0, `${start} not found`);
    const body = code.slice(at, at + 2500);
    const fan = body.indexOf("sendToEachOwner(");
    const push = body.indexOf("sendOwnerPush(");
    assert.ok(fan > 0, "the owner emails no longer go through sendToEachOwner");
    assert.ok(body.includes(what), `the helper is not named ${what} here`);
    assert.ok(push > fan, "the push comes before the email fan-out, so a refusal still repeats it every sweep");
    assert.ok(!/for \(const to of ownerRecipients/.test(body), "a hand-written per-address loop is back");
  });
}
