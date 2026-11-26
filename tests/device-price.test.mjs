// 97.50 - the price on the device while the server quote loads. It must equal
// the first three lines of the server's computeQuote, and go null whenever a
// plan, promo or extra car could move it (then the old grey wait shows).
import { test } from "node:test";
import assert from "node:assert/strict";
import { devicePrice } from "../app/src/book/core.js";

const svc = [
  { price: 100, vehicle_size_adjustments: { large: { price: 30 } } },
  { price: 50, vehicle_size_adjustments: { large: { price: 10 } } },
];
const addOns = [{ price: 15 }];
const f = (o = {}) => ({ vehicleSize: "large", extraVehicles: [], ...o });

test("services + size fee + add-ons", () => {
  assert.equal(devicePrice(f(), svc, addOns), 205);
  assert.equal(devicePrice(f({ vehicleSize: "small" }), svc, addOns), 165);
});
test("nothing chosen, plan, promo or extra car: no early figure", () => {
  assert.equal(devicePrice(f(), [], []), null);
  assert.equal(devicePrice(f(), svc, [], { planId: "p" }), null);
  assert.equal(devicePrice(f(), svc, [], { promoApplied: "X" }), null);
  assert.equal(devicePrice(f({ extraVehicles: [{ size: "small" }] }), svc, []), null);
});
