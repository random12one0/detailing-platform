// ROADMAP 97.45 - the step in the address, and the unfinished booking in the
// tab. Runs the real rules in app/src/book/core.js. Credential-free:
//
//   node --test tests/booking-draft.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearDraft, loadDraft, reachableStep, saveDraft, stepFromSearch, initialForm, stepsFor,
} from "../app/src/book/core.js";

const q = (s) => new URLSearchParams(s);
const store = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const refusing = { getItem() { throw new Error("no"); }, setItem() { throw new Error("no"); }, removeItem() { throw new Error("no"); } };

test("?step= is 1-based, clamped, and missing or junk means the first step", () => {
  assert.equal(stepFromSearch(q("?step=5"), 7), 4);
  assert.equal(stepFromSearch(q("?plan=x&step=1"), 7), 0);
  for (const s of ["", "?step=abc", "?step=0", "?step=-3"]) assert.equal(stepFromSearch(q(s), 7), 0, s);
  assert.equal(stepFromSearch(q("?step=99"), 7), 6);
});

test("an address cannot skip a step that still has an unanswered question", () => {
  const steps = stepsFor([]); // Services, Vehicle, Location, When, Details, Review
  const empty = initialForm({}, null);
  assert.equal(reachableStep(steps, 4, { form: empty, settings: {} }), 0);
  const chosen = { ...empty, serviceType: "dropoff", serviceIds: ["wash"], bookingDate: "2026-11-02", startTime: "09:00" };
  assert.equal(reachableStep(steps, 4, { form: chosen, settings: {} }), 4);
  assert.equal(reachableStep(steps, 5, { form: chosen, settings: {} }), 4, "Details unanswered stops Review");
});

test("a draft round-trips, is per page, and clears", () => {
  const s = store();
  const form = { serviceIds: ["wash"], customerName: "Mara" };
  saveDraft("/book/a", { form, promo: "TEN" }, s);
  assert.deepEqual(loadDraft("/book/a", s), { form, promo: "TEN" });
  assert.equal(loadDraft("/book/b", s), null);
  clearDraft("/book/a", s);
  assert.equal(loadDraft("/book/a", s), null);
});

test("junk in storage, or storage that throws, is never an error", () => {
  const s = store();
  s.setItem("bk.draft:/book/a", "{nope");
  assert.equal(loadDraft("/book/a", s), null);
  s.setItem("bk.draft:/book/a", JSON.stringify({ form: { serviceIds: "x" } }));
  assert.equal(loadDraft("/book/a", s), null);
  assert.doesNotThrow(() => saveDraft("/book/a", { form: { serviceIds: [] } }, refusing));
  assert.equal(loadDraft("/book/a", refusing), null);
  assert.doesNotThrow(() => clearDraft("/book/a", refusing));
});
