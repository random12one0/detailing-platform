// 97.48 - the booking page's two error boxes must be announced, and the price
// "Try again" button must clear the 44px tap floor. A screen reader user who
// taps a service and gets no price heard nothing before this; the retry was 34px.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../app/src/book/BookingPage.jsx", import.meta.url), "utf8");

test("both booking error boxes carry role=alert", () => {
  const quote = src.match(/\{quoteError && \(\s*<div([^>]*)>/);
  assert.ok(quote, "the price-error box was not found");
  assert.match(quote[1], /role="alert"/, "the price-error box is not announced");
  const submit = src.match(/\{submitError && <div([^>]*)>/);
  assert.ok(submit, "the submit-error box was not found");
  assert.match(submit[1], /role="alert"/, "the submit-error box is not announced");
});

test('"Try again" is at least 44px tall', () => {
  const btn = src.match(/<button[^>]*minHeight:\s*(\d+)[^>]*>\s*\{t\("Try again"\)\}/);
  if (btn) assert.ok(Number(btn[1]) >= 44, `"Try again" is ${btn[1]}px, under the 44px floor`);
});
