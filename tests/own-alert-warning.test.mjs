// ROADMAP 3.4f S3 — the warning when the detailer's OWN alert address is not
// receiving. Credential-free: the production rule, the server's own recipient
// function (types stripped and run, never a copy), and filesystem reads.
//
// Run: node --test tests/own-alert-warning.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { alertAddresses, ownAlertBroken, UNDELIVERABLE } from "../app/src/lib/mailWarning.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// Every stored status (the table's check constraint), declared with an
// EQUALITY so an eighth status cannot arrive unjudged.
const EXPECT = {
  delivered: false, sent: false, bounced: true, complained: false,
  failed: false, refused: false, skipped: true, // skipped only as F6, below
};

test("the population is the table's seven statuses", () => {
  const sql = read("supabase/migrations/20260916010000_every_email_leaves_a_row.sql");
  const m = sql.match(/status\s+in\s*\(([^)]*)\)/i);
  assert.ok(m, "could not find the status check in the migration");
  const statuses = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
  assert.deepEqual(statuses, Object.keys(EXPECT).sort());
});

test("each status warns (or does not) about an alert address", () => {
  for (const [status, broken] of Object.entries(EXPECT)) {
    const detail = status === "skipped" ? UNDELIVERABLE : null;
    assert.equal(ownAlertBroken({ status, detail }), broken, status);
  }
  assert.equal(ownAlertBroken(null), false, "no email yet is not a failure");
  assert.equal(ownAlertBroken({ status: "skipped", detail: "email is not switched on for this deployment" }), false, "F7 is ours, not their address");
});

test("the made-up-address detail is the words the relay actually stores", () => {
  assert.ok(read("supabase/functions/send-email/index.ts").includes(`"${UNDELIVERABLE}"`));
});

test("the browser's alert list is the server's alert list", () => {
  const src = read("supabase/functions/_shared/email.ts");
  const m = src.match(/export function ownerRecipients[\s\S]*?\r?\n}\r?\n/);
  assert.ok(m, "ownerRecipients not found in _shared/email.ts");
  const js = stripTypeScriptTypes(m[0].replace("export ", ""));
  const server = new Function(`${js}; return ownerRecipients;`)();
  const cases = [
    ["a@x.com", []], ["a@x.com", null], ["a@x.com", ["b@x.com"]], ["a@x.com", [" b@x.com ", "b@x.com", ""]],
    [null, []], ["", ["  "]], ["a@x.com", ["c@x.com", "b@x.com"]],
  ];
  for (const [contact, list] of cases) {
    assert.deepEqual(alertAddresses(contact, list),
      server({ contact_email: contact }, { notification_emails: list }), JSON.stringify([contact, list]));
  }
});

test("both screens draw it, and Today's button can reach Notifications", () => {
  for (const f of ["app/src/screens/Today.jsx", "app/src/screens/more/Notifications.jsx"]) {
    const s = read(f);
    assert.match(s, /useOwnAlertBounces\(\)/, f);
    assert.match(s, /data-own-alerts=/, f);
  }
  assert.match(read("app/src/screens/Today.jsx"), /onGo\?\.\("notifications"\)/);
  assert.match(read("app/src/App.jsx"), /dest === "notifications"\) \{ setGearScreen\(dest\)/);
});

test("every sentence has Spanish with the same placeholder", () => {
  const es = read("app/src/lib/strings/appEs.js");
  const keys = [
    "Booking alerts to {to} are not arriving. Fix the address in Notifications.",
    "Booking alerts to {to} are not arriving. Change it on Business info, or add a working address below.",
    "Booking alerts to {to} are not arriving. Remove it below and add the right one.",
  ];
  const ui = read("app/src/screens/Today.jsx") + read("app/src/screens/more/Notifications.jsx");
  for (const k of keys) {
    assert.ok(ui.includes(`"${k}"`), `not on a screen: ${k}`);
    const at = es.indexOf(JSON.stringify(k) + ":");
    assert.ok(at >= 0, `no Spanish for: ${k}`);
    const value = es.slice(at + k.length + 3).match(/"([^"]+)"/)[1];
    assert.ok(value.includes("{to}"), `Spanish lost {to}: ${value}`);
  }
});
