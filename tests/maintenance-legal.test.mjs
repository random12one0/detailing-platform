// ROADMAP 0.7 — the maintenance email gets the campaign email's legal treatment.
//
// The manager's call, 2026-10-06, on Andrew's standing instruction (DECISIONS.md,
// "0.7: the maintenance email is treated like a campaign"): it carries the
// business's postal address and the customer's own unsubscribe link, it never
// goes to an opted-out customer, and a business with NO mailing address is
// skipped with the reason recorded — never a placeholder address.
//
// The rule is EXECUTED, not read: `maintenanceVerdict` and the template are
// imported and run (node strips the types). The sweep's own wiring — that a
// skip writes a `skipped` email_sends row and never reaches the template — is
// a source check, and says so in its name.
//
// Credential-free, no network.   node --test tests/maintenance-legal.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { maintenanceVerdict, NO_ADDRESS_DETAIL } from "../supabase/functions/_shared/maintenance.ts";
import { maintenanceDueEmail } from "../supabase/functions/_shared/emailTemplates.ts";

const brand = {
  brandName: "Ridgeline Auto Detail", contactEmail: "hello@ridgeline.test",
  contactPhone: "(562) 555-0142", siteUrl: "https://detailingplatform.com/book/ridgeline",
  logoUrl: null, accent: "#38E08B", accentFill: "#38E08B", accentInk: "#04150C",
  accentDark: "#38E08B", accentFillDark: "#38E08B", accentInkDark: "#04150C",
  dropoffAddress: "22 Mill Road", googleReviewUrl: null, yelpReviewUrl: null, messages: {},
};
const ON = { email_customer_reminder: true, email_customer_maintenance_due: true };
const DANA = { email: "dana@ridgeline.test", unsubscribed_at: null, email_failed_at: null };
const ADDRESS = "PO Box 214, Lakewood CA 90713";
const UNSUB = "https://detailingplatform.com/unsubscribe/9c1f2b64-0000-4000-8000-000000000002";
const email = (over = {}, lang) => maintenanceDueEmail(brand, {
  customerName: "Dana Ortiz", label: "Ceramic Pro annual inspection", vehicle: "2021 Tacoma",
  dueOn: "October 12, 2026", daysLeft: 14, bookUrl: brand.siteUrl,
  unsubscribeUrl: UNSUB, mailingAddress: ADDRESS, ...over,
}, lang);

test("1 · a business WITH an address: it sends, with the address and the opt-out link", () => {
  const v = maintenanceVerdict({ settings: ON, customer: DANA, mailingAddress: `  ${ADDRESS} ` });
  assert.deepEqual(v, { send: true, mailingAddress: ADDRESS });
  for (const lang of ["en", "es"]) {
    const { html, text } = email({}, lang);
    assert.ok(html.includes(ADDRESS), `${lang}: the postal address is in the footer`);
    assert.ok(html.includes(`href="${UNSUB}"`), `${lang}: the customer's own unsubscribe link is a real link`);
    assert.ok(text.includes(ADDRESS), `${lang}: and the address survives into the plain-text half`);
    assert.ok(text.includes(UNSUB), `${lang}: and so does the link`);
  }
  assert.match(email({}, "en").html, /Stop getting emails like this/);
  assert.match(email({}, "es").html, /Dejar de recibir correos como este/,
    "the opt-out is in the reader's language, not English under a Spanish email");
});

test("2 · a business WITHOUT an address: no send, and a recorded reason", () => {
  for (const missing of [null, undefined, "", "   "]) {
    const v = maintenanceVerdict({ settings: ON, customer: DANA, mailingAddress: missing });
    assert.equal(v.send, false, `${JSON.stringify(missing)} is not an address`);
    assert.equal(v.reason, "no_mailing_address");
    assert.equal(v.detail, NO_ADDRESS_DETAIL);
  }
  assert.ok(NO_ADDRESS_DETAIL.length <= 200, "email_sends.detail is read in one line, capped at 200");
  assert.match(NO_ADDRESS_DETAIL, /no mailing address/);
  // AND THE TEMPLATE ITSELF REFUSES, so no caller can render a placeholder or a gap.
  assert.throws(() => email({ mailingAddress: "" }), /mailing address/);
  assert.throws(() => email({ mailingAddress: "  " }), /mailing address/);
  assert.throws(() => email({ unsubscribeUrl: "" }), /unsubscribe/);
});

test("3 · an opted-out customer gets nothing — not an email, and not a skip row either", () => {
  for (const [why, customer] of [
    ["opted out", { ...DANA, unsubscribed_at: "2026-09-01T00:00:00Z" }],
    ["bounced", { ...DANA, email_failed_at: "2026-09-01T00:00:00Z" }],
    ["no email", { ...DANA, email: "  " }],
    ["no customer row", null],
  ]) {
    for (const mailingAddress of [ADDRESS, null]) {
      assert.deepEqual(maintenanceVerdict({ settings: ON, customer, mailingAddress }),
        { send: false, reason: "unreachable" }, `${why}, address ${mailingAddress ? "set" : "missing"}`);
    }
  }
});

test("4 · the per-business switch still gates it, and off is the default", () => {
  for (const settings of [{}, { email_customer_reminder: true },
    { email_customer_maintenance_due: true }, { ...ON, email_customer_reminder: false }]) {
    assert.deepEqual(maintenanceVerdict({ settings, customer: DANA, mailingAddress: ADDRESS }),
      { send: false, reason: "switched_off" }, JSON.stringify(settings));
  }
});

test("5 · SOURCE CHECK — the sweep records the skip and never reaches the template on it", () => {
  const src = readFileSync("supabase/functions/send-owner-reminders/index.ts", "utf8");
  const v = src.indexOf("const verdict = maintenanceVerdict(");
  const tpl = src.indexOf("maintenanceDueEmail(brand,");
  assert.ok(v > 0 && tpl > v, "the verdict is asked before the email is composed");
  const skip = src.slice(v, tpl);
  assert.match(skip, /from\("email_sends"\)\.insert\(\{/, "a skip writes an email_sends row");
  assert.match(skip, /status: "skipped"/, "with the same status send-email uses for an unsent email");
  assert.match(skip, /detail: verdict\.detail/, "and the reason in words");
  assert.match(skip, /continue;\s*\}\s*const brand/, "and the skip path ends before the email is built");
  assert.match(src.slice(tpl, tpl + 700), /mailingAddress: verdict\.mailingAddress/,
    "the address in the footer is the verdict's checked one, never a fallback");
  assert.match(src.slice(tpl, tpl + 700), /unsubscribeUrl: unsubscribeUrl\(site, d\.customer_id\)/,
    "and the opt-out link is THIS customer's");
});
