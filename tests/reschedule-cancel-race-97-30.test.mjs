// ROADMAP 97.30 — A RESCHEDULE RACING A CANCEL, AND WHO HEARS ABOUT A CUSTOMER'S CANCEL OR MOVE.
//
//   PGLITE_DIR=<folder holding @electric-sql/pglite> PGLITE_REQUIRED=1 node --test tests/reschedule-cancel-race-97-30.test.mjs
//
// The REAL reschedule-booking and cancel-booking handlers, imported as they are (Node strips the types), with
// each `../_shared/<mod>.ts` answered by a fake through a resolve hook (the pattern of
// tests/day-rule-refusal.test.mjs). The database half is real: `bookings` is a stand-in table in PGlite
// (Postgres in WebAssembly, in-process, no network, no account) and `move_booking_checked` is the REAL function
// text cut from migration 20261018030645 (its day-rule check stubbed to pass; that rule is 97.18's suite).
//
//   race      the customer's cancel lands between reschedule's read and its move: the cancelled booking must
//             stay where it was, stay cancelled, and nobody is told it moved
//   control   the same move with no cancel in between still moves it
//   notices   a customer's move and cancel reach every address ownerRecipients() returns, not only the
//             business's contact address
//
// Fails on the code before 97.30: the race moves the cancelled booking (the move was fenced on start_at only)
// and each notice reaches one owner address of two.

import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));

let PGlite = null;
if (process.env.PGLITE_DIR) {
  try { ({ PGlite } = await import(pathToFileURL(path.join(process.env.PGLITE_DIR, "node_modules/@electric-sql/pglite/dist/index.js")).href)); }
  catch (e) { console.error(`PGLITE_DIR does not hold @electric-sql/pglite: ${e.message}`); }
}
const REQUIRED = process.env.PGLITE_REQUIRED === "1";
const MISSING = "NOT RUN — needs @electric-sql/pglite: `npm install @electric-sql/pglite` in a folder outside the repo, then PGLITE_DIR=<folder>";
if (!PGlite) console.error(`\n  ${MISSING}\n  (set PGLITE_REQUIRED=1 to make this a failure instead of a skip)\n`);

const HANDLER = /\/supabase\/functions\/(reschedule-booking|cancel-booking)\/index\.ts\?fakes=(\w+)$/;
const asModule = (src) => ({ url: `data:text/javascript,${encodeURIComponent(src)}`, shortCircuit: true });
registerHooks({
  resolve(spec, ctx, next) {
    const parent = HANDLER.exec(ctx.parentURL ?? "");
    if (!parent) return next(spec, ctx);
    if (spec.startsWith("jsr:")) return asModule("");
    const mod = /^\.\.\/_shared\/(\w+)\.ts$/.exec(spec)?.[1];
    if (!mod) return next(spec, ctx);
    const ref = `globalThis[${JSON.stringify(parent[2])}][${JSON.stringify(mod)}]`;
    return asModule(Object.keys(globalThis[parent[2]][mod] ?? {}).map((n) => `export const ${n} = ${ref}[${JSON.stringify(n)}];`).join("\n"));
  },
});

const MIGRATION = readFileSync(root("supabase/migrations/20261018030645_booking_day_rules_lock.sql"), "utf8").replace(/\r\n/g, "\n");
const MOVE_FN = MIGRATION.slice(MIGRATION.indexOf("create or replace function public.move_booking_checked("));
const MOVE_SQL = MOVE_FN.slice(0, MOVE_FN.indexOf("$$;") + 3);
const BIZ = "00000000-0000-4000-8000-000000000001", BK = "00000000-0000-4000-8000-0000000000b1";
const OLD_START = "2030-03-12T16:00:00.000Z", OLD_END = "2030-03-12T18:00:00.000Z";
const NEW_START = "2030-03-13T17:00:00.000Z", NEW_END = "2030-03-13T19:00:00.000Z";
const OWNERS = ["owner@ridgeline.invalid", "partner@ridgeline.invalid"];
const CUSTOMER = "maya@example.invalid";

async function world({ cancelBeforeMove = false } = {}) {
  const db = new PGlite();
  await db.exec(`
    create table public.bookings (
      id uuid primary key, business_id uuid not null, status text not null, start_at timestamptz not null,
      end_at timestamptz not null, deleted_at timestamptz, customer_name text, customer_email text,
      customer_phone text, service_type text, total_price numeric, subtotal numeric, lang text,
      payment_status text, deposit_amount numeric, amount_paid numeric);
    create function public.booking_day_rules_check(uuid, timestamptz, timestamptz, uuid) returns void
      language sql as $$ select $$;
    ${MOVE_SQL}`);
  await db.query(`insert into bookings (id, business_id, status, start_at, end_at, customer_name, customer_email,
    customer_phone, service_type, total_price, subtotal, lang) values ($1,$2,'confirmed',$3,$4,'Maya Ortiz',$5,
    '(555) 010-2000','mobile',150,150,'en')`, [BK, BIZ, OLD_START, OLD_END, CUSTOMER]);
  // PostgREST hands timestamps back as strings, so the handlers see strings.
  const row = (r) => r && Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]));
  const sends = [], pushes = [];
  const supabase = {
    from(table) {
      const where = [], args = [];
      let patch = null;
      const b = {
        select() { return b; }, maybeSingle() { return b; }, single() { return b; },
        eq(c, v) { args.push(v); where.push(`${c} = $${args.length}`); return b; },
        is(c, v) { if (v !== null) throw new Error("fake .is() supports null only"); where.push(`${c} is null`); return b; },
        update(p) { patch = p; return b; },
        then(ok, bad) {
          const run = async () => {
            let sql = `select * from ${table} where ${where.join(" and ")}`;
            if (patch) {
              const keys = Object.keys(patch);
              sql = `update ${table} set ${keys.map((k, i) => `${k} = $${args.length + i + 1}`).join(", ")} where ${where.join(" and ")} returning *`;
              args.push(...keys.map((k) => patch[k]));
            }
            const { rows } = await db.query(sql, args);
            return { data: row(rows[0]) ?? null, error: null };
          };
          return run().then(ok, bad);
        },
      };
      return b;
    },
    rpc(name, a) {
      return {
        maybeSingle: async () => {
          if (name !== "move_booking_checked") return { data: null, error: { code: "PGRST202", message: name } };
          // THE RACE: the customer's cancel commits after reschedule read the booking and before it moves it.
          if (cancelBeforeMove) await db.query(`update bookings set status = 'cancelled' where id = $1`, [a.p_id]);
          try {
            const { rows } = await db.query(`select * from public.move_booking_checked($1, $2, $3::jsonb, $4, $5)`,
              [a.p_id, a.p_business, JSON.stringify(a.p_patch), a.p_from_start ?? null, a.p_from_status ?? null]);
            return { data: row(rows[0]) ?? null, error: null };
          } catch (e) { return { data: null, error: { code: e.code, message: e.message } }; }
        },
      };
    },
  };
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const business = { id: BIZ, name: "Ridgeline Auto Detail", timezone: "America/Los_Angeles", contact_phone: null, contact_email: OWNERS[0] };
  const settings = { cancellation_window_hours: 24, notification_emails: OWNERS };
  const fakes = {
    db: { supabase },
    http: { json, preflight: () => new Response(null, { status: 204 }) },
    rateLimit: { ipOf: () => "fixture", LIMITS: { publicCeiling: {} }, withinLimits: async () => true },
    tenant: { businessById: async () => business, getSettings: async () => settings },
    pricing: { servicesForBooking: async () => [] },
    slotValidation: { dayRuleRefusal: () => null, validateSlot: async () => ({ ok: true, startAt: new Date(NEW_START), endAt: new Date(NEW_END) }) },
    email: {
      buildBrand: async () => ({ contactEmail: business.contact_email }),
      // The real rule (_shared/email.ts): the configured list, else the contact address.
      ownerRecipients: (biz, s) => (s.notification_emails?.length ? [...new Set(s.notification_emails)] : biz.contact_email ? [biz.contact_email] : []),
      extraVehiclesFor: async () => [], recipientLang: async () => "en", sendTenantEmail: async (m) => { sends.push(m); },
    },
    emailTemplates: {
      rescheduleEmail: (_b, _d, _o, _t, owner) => ({ subject: owner ? "Moved (owner)" : "Moved", html: "", text: "" }),
      cancellationEmail: (_b, _d, owner) => ({ subject: owner ? "Cancelled (owner)" : "Cancelled", html: "", text: "" }),
    },
    i18n: { T: () => (k) => k },
    connect: { refundOwed: () => ({ owed: false }), refundInstruction: () => null },
    emailKit: { money: (n) => `$${n}` },
    ownerPush: { sendOwnerPush: async (_b, p) => { pushes.push(p); } },
    config: { receiptUrl: () => "" },
    tenantSite: { siteFor: async () => "" },
    tz: await import("../supabase/functions/_shared/tz.ts"),
  };
  const bookingNow = async () => row((await db.query(`select * from bookings where id = $1`, [BK])).rows[0]);
  return { fakes, sends, pushes, bookingNow };
}

let loads = 0;
async function call(fn, w, body) {
  const key = `__fakes97_30_${++loads}`;
  globalThis[key] = w.fakes;
  let served = null;
  globalThis.Deno = { env: { get: () => undefined }, serve: (h) => { served = h; } };
  await import(`${pathToFileURL(root(`supabase/functions/${fn}/index.ts`)).href}?fakes=${key}`);
  if (typeof served !== "function") throw new Error(`${fn} did not call Deno.serve`);
  const res = await served(new Request("https://fixture.invalid/", { method: "POST", body: JSON.stringify(body) }));
  return { status: res.status, data: await res.json() };
}
const MOVE = { booking_id: BK, booking_date: "2030-03-13", start_time: "10:00" };
const ownerSends = (w) => w.sends.filter((m) => m.to !== CUSTOMER).map((m) => m.to).sort();

test("97.30 · a reschedule racing a cancel never moves the cancelled booking", { skip: !PGlite && !REQUIRED && MISSING }, async () => {
  assert.ok(PGlite, MISSING);
  assert.match(MOVE_SQL, /p_from_status/, "move_booking_checked was not cut from the migration");
  const w = await world({ cancelBeforeMove: true });
  const r = await call("reschedule-booking", w, MOVE);
  const b = await w.bookingNow();
  assert.equal(b.status, "cancelled");
  assert.equal(b.start_at, OLD_START, "the cancelled booking was moved");
  assert.equal(r.status, 409, JSON.stringify(r.data));
  assert.equal(w.sends.length + w.pushes.length, 0, "a move notice went out for a cancelled booking");
});

test("97.30 · control: with no cancel in between the move still lands", { skip: !PGlite && !REQUIRED && MISSING }, async () => {
  assert.ok(PGlite, MISSING);
  const w = await world();
  const r = await call("reschedule-booking", w, MOVE);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal((await w.bookingNow()).start_at, NEW_START);
});

test("97.30 · a customer's move and cancel reach every address ownerRecipients() returns", { skip: !PGlite && !REQUIRED && MISSING }, async () => {
  assert.ok(PGlite, MISSING);
  const moved = await world();
  assert.equal((await call("reschedule-booking", moved, MOVE)).status, 200);
  assert.deepEqual(ownerSends(moved), [...OWNERS].sort(), "reschedule owner notice");
  const cancelled = await world();
  const r = await call("cancel-booking", cancelled, { booking_id: BK });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal((await cancelled.bookingNow()).status, "cancelled");
  assert.deepEqual(ownerSends(cancelled), [...OWNERS].sort(), "cancel owner notice");
});
