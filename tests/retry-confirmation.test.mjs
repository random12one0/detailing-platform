// ROADMAP 100.2 — A RETRY'S CONFIRMATION SCREEN SHOWS WHAT A FRESH ONE SHOWS.
//
// After a dropped connection the second press gets the duplicate answer (only
// id, start_at and status, ROADMAP 97.2/97.64), and `retryConfirmation`
// (app/src/book/core.js) fills the rest in from what the page sent. Its output
// must equal the `booking` object create-booking's fresh path returns for the
// same call (create-booking/index.ts, `return json({ success: true, booking`).
// On a split two-car booking that call is car 1 alone, priced at car 1's own
// figure — the retry screen showed the whole carload's total instead.
//
// Credential-free, no network. Runs the production functions from core.js.
//
//   node --test tests/retry-confirmation.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { bookingRequests, retryConfirmation } from "../app/src/book/core.js";

const ID = "6f1c2b9e-3d4a-4e5f-8a7b-0c1d2e3f4a5b";
const form = {
  serviceIds: ["service-a"], addOnIds: [], serviceType: "dropoff", vehicleSize: "sedan",
  bookingDate: "2026-10-31", startTime: "10:00",
  customerName: "Maria Lopez", customerPhone: "(555) 012-3456", customerEmail: "maria@example.invalid",
};
const answer = { id: ID, start_at: "2026-10-31T17:00:00.000Z", status: "confirmed" };

// What the fresh path returns for that call: business-time date and times,
// that call's own quote total, the manage link for the id, the status.
const fresh = (total, end) => ({
  id: ID, booking_date: "2026-10-31", start_time: "10:00", end_time: end,
  total_price: total, receipt_url: `/booking/${ID}`, status: "confirmed",
});
const shape = (b) => Object.fromEntries(Object.keys(fresh()).map((k) => [k, b[k]]));

test("one car: the retry screen equals the fresh one", () => {
  const quote = { total: 185, total_duration: 60, per_vehicle: null };
  const [p] = bookingRequests(form, { quote });
  assert.deepEqual(shape(retryConfirmation(answer, p, quote)), fresh(185, "11:00"));
});

test("two cars on different days: car 1's own price and length, not the carload's", () => {
  // calculate-booking on a split: total is the sum, total_duration is ONE car's
  // (pricing.ts "NOT the sum"), per_vehicle carries each car's own figure.
  const quote = { total: 405, total_duration: 60, single_vehicle_duration: 60,
    per_vehicle: [{ total: 185, durationMinutes: 60 }, { total: 220, durationMinutes: 90 }] };
  const split = { ...form, splitDays: true,
    extraVehicles: [{ size: "suv", model: "", date: "2026-11-02", time: "09:00" }] };
  const payloads = bookingRequests(split, { quote });
  assert.equal(payloads.length, 2);
  assert.deepEqual(shape(retryConfirmation(answer, payloads[0], quote)), fresh(185, "11:00"));
});

test("a stranger's repeat (no id) still gets a whole date, times and price, and no link", () => {
  const quote = { total: 185, total_duration: 60 };
  const [p] = bookingRequests(form, { quote });
  const { id, ...noId } = answer;
  const b = retryConfirmation(noId, p, quote);
  assert.equal(b.id, undefined);
  assert.equal(b.receipt_url, null);
  assert.ok(!Number.isNaN(new Date(`${b.booking_date}T12:00:00`).getTime()));
  assert.equal(b.start_time, "10:00");
  assert.equal(b.end_time, "11:00");
  assert.equal(b.total_price, 185);
});
