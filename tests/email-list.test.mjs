// ROADMAP 3.1, server half — the back office's email list action.
//
// Run: node --test tests/email-list.test.mjs
//      Credential-free. Imports one module and runs it against an IN-MEMORY
//      client; reads platform-admin's source once for the gate position.
//
// WHAT THIS PROVES: the query's ordering, its status filter, its limit, the row
// shape the screen was built against, and that a missing table, a missing
// booking_id column and any other read error each come back as an ERROR and
// never as an empty list. WHAT IT DOES NOT PROVE: that PostgREST accepts the
// `businesses(name)` embed, that the deployed function is this one, or a real
// row — `email_sends.booking_id` is not in the live database until Andrew
// applies 20261006010000, and platform-admin is not published.
//
// THE SABOTAGES RUN IN-PROCESS: the same assertions are run against a client
// that lies in one specific way, and each must go red. A green suite whose
// checks cannot fail is the failure this repo keeps shipping.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  emailList, emailListRequest, EMAIL_STATUSES, EMAIL_LIST_MAX,
  EMAIL_TABLE_MISSING, EMAIL_BOOKING_MISSING, EMAIL_READ_FAILED,
} from "../supabase/functions/_shared/emailList.js";

const FUNCTION = readFileSync("supabase/functions/platform-admin/index.ts", "utf8");
const MIGRATION = readFileSync("supabase/migrations/20260916010000_every_email_leaves_a_row.sql", "utf8");

const BUSINESSES = { b1: { name: "Shine Co" }, b2: { name: "Gloss Bros" } };
const SENDS = [
  { id: "a1", business_id: "b1", subject: "Confirmed", to_email: "x@y.com", status: "delivered", detail: null, sent_at: "2026-10-05T10:00:00Z", booking_id: "k1" },
  { id: "a2", business_id: "b2", subject: "Reminder", to_email: "p@q.com", status: "bounced", detail: "mailbox full", sent_at: "2026-10-06T09:00:00Z", booking_id: null },
  { id: "a3", business_id: null, subject: "Heartbeat", to_email: "me@us.com", status: "sent", detail: null, sent_at: "2026-10-04T08:00:00Z", booking_id: null },
  { id: "a4", business_id: "b1", subject: "Invite", to_email: "z@z.com", status: "failed", detail: "refused", sent_at: "2026-10-06T09:00:00Z", booking_id: null },
];

/** An in-memory stand-in for the one chain the module uses. `lie` breaks one thing on purpose. */
function fake({ rows = SENDS, error = null, hasBooking = true, lie = null } = {}) {
  return {
    from(table) {
      assert.equal(table, "email_sends", "the list reads email_sends and nothing else");
      const st = { cols: "", filter: null, order: [], limit: Infinity };
      const q = {
        select(c) { st.cols = c; return q; },
        in(col, vals) { assert.equal(col, "status"); if (lie !== "ignore-filter") st.filter = vals; return q; },
        order(col, o) { if (lie !== "ignore-order") st.order.push([col, o?.ascending !== false]); return q; },
        limit(n) { if (lie !== "ignore-limit") st.limit = n; return q; },
        then(res, rej) {
          if (error) return Promise.resolve({ data: null, error }).then(res, rej);
          if (!hasBooking && /booking_id/.test(st.cols)) {
            return Promise.resolve({ data: null, error: { code: "42703", message: "column email_sends.booking_id does not exist" } }).then(res, rej);
          }
          let out = rows.filter((r) => !st.filter || st.filter.includes(r.status));
          for (const [col, asc] of [...st.order].reverse()) {
            out = [...out].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1));
          }
          out = out.slice(0, st.limit).map((r) => ({ ...r, businesses: r.business_id ? BUSINESSES[r.business_id] : null }));
          if (lie === "swallow-empty") out = [];
          return Promise.resolve({ data: out, error: null }).then(res, rej);
        },
      };
      return q;
    },
  };
}

// The checks, as one function, so a sabotage can be run through exactly them.
async function assertList(client) {
  const all = await emailList(client, { action: "email_list", limit: 100 });
  assert.equal(all.status, 200);
  assert.deepEqual(all.body.rows.map((r) => r.id), ["a4", "a2", "a1", "a3"], "newest first, ties by id descending");
  assert.deepEqual(Object.keys(all.body.rows[0]).sort(),
    ["booking_id", "business_name", "detail", "id", "sent_at", "status", "subject", "to_email"], "exactly the contract's eight fields");
  assert.equal(all.body.rows.find((r) => r.id === "a3").business_name, null, "platform mail has no business");
  assert.equal(all.body.rows.find((r) => r.id === "a1").business_name, "Shine Co");
  assert.equal(all.body.rows.find((r) => r.id === "a1").booking_id, "k1");
  assert.equal(all.body.rows.find((r) => r.id === "a2").booking_id, null);

  const bad = await emailList(client, { limit: 100, statuses: ["bounced", "failed"] });
  assert.deepEqual(bad.body.rows.map((r) => r.id), ["a4", "a2"], "statuses restricts to those states");

  const two = await emailList(client, { limit: 2 });
  assert.equal(two.body.rows.length, 2, "limit is honoured");
}

test("ROADMAP 3.1 — email_list server action", async (t) => {
  await t.test("1 · the honest client passes every check", async () => { await assertList(fake()); });

  await t.test("2 · the request is checked, not coerced", () => {
    assert.deepEqual(emailListRequest({}), { ok: true, limit: 100, statuses: null });
    assert.equal(emailListRequest({ limit: 9999 }).limit, EMAIL_LIST_MAX, "a huge limit is capped");
    for (const limit of [0, -1, 12.5, "100", NaN]) assert.equal(emailListRequest({ limit }).ok, false, `limit ${limit}`);
    for (const statuses of ["bounced", [1], ["bounced", "exploded"], {}]) assert.equal(emailListRequest({ statuses }).ok, false);
    assert.deepEqual(emailListRequest({ statuses: ["failed", "failed"] }).statuses, ["failed"]);
  });

  await t.test("3 · a bad request is a 400 and reads nothing", async () => {
    const c = { from() { throw new Error("must not query"); } };
    assert.equal((await emailList(c, { limit: 0 })).status, 400);
    assert.deepEqual((await emailList(c, { statuses: [] })).body, { rows: [] }, "no states means no rows, without a query");
  });

  await t.test("4 · THE BOOKING COLUMN NOT YET APPLIED is its own sentence, never an empty list", async () => {
    const r = await emailList(fake({ hasBooking: false }), { limit: 100 });
    assert.equal(r.status, 500);
    assert.equal(r.body.error, EMAIL_BOOKING_MISSING);
    assert.equal(r.body.rows, undefined, "an error body carries no rows array");
  });

  await t.test("5 · a missing table, and any other failure, each answer an error", async () => {
    for (const code of ["42P01", "PGRST205"]) {
      const r = await emailList(fake({ error: { code, message: "x" } }), {});
      assert.equal(r.status, 500); assert.equal(r.body.error, EMAIL_TABLE_MISSING);
    }
    const r = await emailList(fake({ error: { code: "57014", message: "timeout" } }), {});
    assert.equal(r.body.error, EMAIL_READ_FAILED);
    // a different missing column must not be blamed on the booking migration
    const o = await emailList(fake({ error: { code: "42703", message: "column email_sends.detail does not exist" } }), {});
    assert.equal(o.body.error, EMAIL_READ_FAILED);
    for (const e of [EMAIL_TABLE_MISSING, EMAIL_BOOKING_MISSING, EMAIL_READ_FAILED]) {
      assert.doesNotMatch(e, /\.$/, "a fragment: the screen supplies the full stop");
    }
  });

  await t.test("6 · the statuses it accepts are the table's own CHECK list", () => {
    const m = MIGRATION.match(/status in \(([^)]+)\)/)[1].split(",").map((s) => s.trim().replace(/'/g, ""));
    assert.deepEqual([...EMAIL_STATUSES].sort(), [...m].sort());
  });

  await t.test("7 · OWNER-ONLY: the branch sits after the platform_admins gate and hands over the service client", () => {
    const gate = FUNCTION.indexOf('if (!admin) return json({ error: "Not found" }, 404)');
    const branch = FUNCTION.indexOf('if (action === "email_list")');
    assert.ok(gate > 0 && branch > gate, "email_list is dispatched after the 404 gate");
    assert.equal(FUNCTION.split('action === "email_list"').length - 1, 1, "wired once");
    assert.match(FUNCTION, /import \{ emailList \} from "\.\.\/_shared\/emailList\.js"/);
    assert.match(FUNCTION, /await emailList\(supabase, body\)/);
  });

  await t.test("8 · SABOTAGE — each lie is caught by the checks aimed at it", async () => {
    for (const lie of ["ignore-filter", "ignore-order", "ignore-limit", "swallow-empty"]) {
      await assert.rejects(() => assertList(fake({ lie })), `${lie} must turn the checks red`);
    }
  });
});
