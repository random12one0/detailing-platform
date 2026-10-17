// ROADMAP 97.20 — "DELETE FOR GOOD" MUST NOT LEAVE THE CUSTOMER'S EMAIL BEHIND.
//
//   PGLITE_DIR=<folder holding @electric-sql/pglite> PGLITE_REQUIRED=1 node --test tests/forget-customer-sql.test.mjs
//   BREAK=after-bookings   PGLITE_DIR=… node tests/forget-customer-sql.test.mjs  # sabotage: email step runs after the bookings lose their customer
//   BREAK=no-booking-match PGLITE_DIR=… node tests/forget-customer-sql.test.mjs  # sabotage: the owner's alert about their booking is missed
//   BREAK=no-address-match PGLITE_DIR=… node tests/forget-customer-sql.test.mjs  # sabotage: mail to their address with no customer link is missed
//   BREAK=keep-subject     PGLITE_DIR=… node tests/forget-customer-sql.test.mjs  # sabotage: "New booking: <name>" keeps the name
//
// PGlite is real PostgreSQL in WebAssembly, in-process: nothing touches the live database, and it is
// in no package.json (same arrangement as tests/campaign-share-sql.test.mjs). Without it every case
// prints NOT RUN and skips; with PGLITE_REQUIRED=1 it fails. BREAK is an env var, not a flag
// (docs/gotchas.md 104).
//
// FIXTURES, said plainly: `businesses` is an id; `customers` carries the columns the function reads;
// `bookings` the ones it writes plus a `total`; `job_photos` an id and its booking. `email_sends` is
// built FROM ITS REAL TEXT — the CREATE TABLE in 20260916010000, `booking_id` from 20260906010000 and
// `body_html` from 20261010010000 — so a column added there and missed here goes red, not quiet.
//
// THE SCENARIO: business A has Dana and Eli; business B has its own customer at Dana's SAME address.
// A's mail log holds, for Dana: (1) her confirmation, (2) the owner's "New booking: Dana Doe" alert
// about her booking, (3) mail to her address sent before it matched a customer row, in another case,
// (4) a campaign. For Eli: (5) his confirmation, (6) the owner's alert about his booking, (7) mail
// linked to Eli at Dana's address (a shared household address — his mail too). B: (8).
//
// CANARY, EVERY RUN: the same scenario on the PRE-97.20 function (20260907001000 alone) must still
// hold Dana's address, name and body — the defect reproduced. Otherwise the green is not about the fix.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeReceipt } from "../scripts/receipt.mjs";

const DIR = "supabase/migrations";
const OLD = "20260907001000_forget_customer.sql";
const MIGRATION = "20261017210000_forget_customer_forgets_their_email.sql";
const BREAK = process.env.BREAK || "";
const read = (f) => readFileSync(path.join(DIR, f), "utf8").replace(/\r\n/g, "\n");

let SQL = read(MIGRATION);
const EMAIL_STEP = /  -- 97\.20\. BEFORE[\s\S]*?get diagnostics v_emails = row_count;\n/.exec(SQL)?.[0];
assert.ok(EMAIL_STEP, "could not find the 97.20 email step in the migration");
const SABOTAGE = {
  "after-bookings": () => SQL.replace(EMAIL_STEP, "").replace("get diagnostics v_bookings = row_count;\n", `get diagnostics v_bookings = row_count;\n${EMAIL_STEP}`),
  "no-booking-match": () => SQL.replace(/      or e\.booking_id in \([\s\S]*?\n      \)\n/, ""),
  "no-address-match": () => SQL.replace("      or (e.customer_id is null and v_email is not null and lower(btrim(e.to_email)) = v_email)\n", ""),
  "keep-subject": () => SQL.replace("subject     = 'Deleted customer',", "subject     = e.subject,"),
};
if (BREAK) {
  if (!SABOTAGE[BREAK]) throw new Error(`unknown BREAK=${BREAK}; known: ${Object.keys(SABOTAGE).join(", ")}`);
  const broken = SABOTAGE[BREAK]();
  // docs/gotchas.md 102: prove the sabotage LANDED, or its result means nothing.
  if (broken === SQL) throw new Error(`BREAK=${BREAK} did not change the migration text — the sabotage did not land`);
  SQL = broken;
}

const BASE = read("20260916010000_every_email_leaves_a_row.sql");
const EMAIL_TABLE = /create table public\.email_sends \([\s\S]*?\n\);/.exec(BASE)?.[0];
const BOOKING_COL = /alter table public\.email_sends\n  add column if not exists booking_id[^;]*;/.exec(read("20261006010000_an_email_row_knows_its_booking.sql"))?.[0];
const BODY_COL = /alter table public\.email_sends add column body_html text;/.exec(read("20261010010000_email_sends_keeps_the_body.sql"))?.[0];
assert.ok(EMAIL_TABLE && BOOKING_COL && BODY_COL, "could not find email_sends' real CREATE TABLE / booking_id / body_html text");

let PGlite = null;
if (process.env.PGLITE_DIR) {
  try { ({ PGlite } = await import(pathToFileURL(path.join(process.env.PGLITE_DIR, "node_modules/@electric-sql/pglite/dist/index.js")).href)); }
  catch (e) { console.error(`PGLITE_DIR=${process.env.PGLITE_DIR} does not hold @electric-sql/pglite: ${e.message}`); }
}
const MISSING = "NOT RUN — needs @electric-sql/pglite: `npm install @electric-sql/pglite` in a folder outside the repo, then PGLITE_DIR=<folder>";
if (!PGlite) console.error(`\n  ${MISSING}\n  (set PGLITE_REQUIRED=1 to make this a failure instead of a skip)\n`);

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DANA = "d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1", ELI = "e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1", DANA_B = "d2d2d2d2-d2d2-4d2d-8d2d-d2d2d2d2d2d2";
const BK_DANA = "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1", BK_ELI = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2", BK_B = "b3b3b3b3-b3b3-4b3b-8b3b-b3b3b3b3b3b3";
const DANA_BODY = "<p>Hi Dana Doe, see you at 12 Elm St. We will call 555-0101.</p>";
const ELI_BODY = "<p>Hi Eli Park, see you at 9 Oak Ave.</p>";
// The things about Dana no row may still hold. Her address is checked separately: row 7 is Eli's.
const DANA_TRACES = [/dana doe/i, /12 elm/i, /555-0101/];
const ROWS = [
  // n, business, customer, booking, to, subject, body, detail
  [1, A, DANA, BK_DANA, "dana@example.com", "Your booking is confirmed", DANA_BODY, "bounced: dana@example.com mailbox full"],
  [2, A, null, BK_DANA, "owner@shine.test", "New booking: Dana Doe, Sat 10am ($180)", DANA_BODY, "owner inbox note"],
  [3, A, null, null, "Dana@Example.com ", "Thanks for asking about a quote", DANA_BODY, null],
  [4, A, DANA, null, "dana@example.com", "Spring special", "<p>Dana Doe, 20% off</p>", null],
  [5, A, ELI, BK_ELI, "eli@example.com", "Your booking is confirmed", ELI_BODY, null],
  [6, A, null, BK_ELI, "owner@shine.test", "New booking: Eli Park, Sun 9am ($120)", ELI_BODY, null],
  [7, A, ELI, null, "dana@example.com", "Your receipt", ELI_BODY, null],
  [8, B, DANA_B, BK_B, "dana@example.com", "Your booking is confirmed", "<p>Hi Dana Doe (B)</p>", null],
];
const id = (n) => `00000000-0000-4000-8000-00000000000${n}`;
const q = (v) => (v === null ? "null" : `'${String(v).replace(/'/g, "''")}'`);

async function fixture(fn) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create function public.set_updated_at() returns trigger language plpgsql as $f$ begin new.updated_at = now(); return new; end $f$;
    create table public.businesses (id uuid primary key);
    create table public.customers (id uuid primary key, business_id uuid not null references public.businesses(id) on delete cascade,
      name text not null, email text, phone text, address text);
    create table public.bookings (id uuid primary key, business_id uuid not null references public.businesses(id) on delete cascade,
      customer_id uuid references public.customers(id), customer_name text, customer_phone text, customer_email text,
      customer_address text, customer_notes text, admin_notes text, total numeric not null);
    create table public.job_photos (id uuid primary key default gen_random_uuid(), business_id uuid not null, booking_id uuid);
    ${EMAIL_TABLE}
    ${BOOKING_COL}
    ${BODY_COL}
    insert into public.businesses values ('${A}'), ('${B}');
    insert into public.customers values
      ('${DANA}', '${A}', 'Dana Doe', 'dana@example.com', '555-0101', '12 Elm St'),
      ('${ELI}', '${A}', 'Eli Park', 'eli@example.com', '555-0202', '9 Oak Ave'),
      ('${DANA_B}', '${B}', 'Dana Doe', 'dana@example.com', '555-0101', '12 Elm St');
    insert into public.bookings values
      ('${BK_DANA}', '${A}', '${DANA}', 'Dana Doe', '555-0101', 'dana@example.com', '12 Elm St', 'gate 4471', 'dog in yard', 180),
      ('${BK_ELI}', '${A}', '${ELI}', 'Eli Park', '555-0202', 'eli@example.com', '9 Oak Ave', null, null, 120),
      ('${BK_B}', '${B}', '${DANA_B}', 'Dana Doe', '555-0101', 'dana@example.com', '12 Elm St', null, null, 90);
    insert into public.job_photos (business_id, booking_id) values ('${A}', '${BK_DANA}'), ('${A}', '${BK_ELI}');
    insert into public.email_sends (id, business_id, customer_id, booking_id, to_email, subject, body_html, detail, status) values
      ${ROWS.map(([n, b, c, bk, to, s, body, d]) => `('${id(n)}', '${b}', ${q(c)}, ${q(bk)}, ${q(to)}, ${q(s)}, ${q(body)}, ${q(d)}, 'delivered')`).join(",\n      ")};
  `);
  await db.exec(fn);
  return db;
}
const mail = async (db) => Object.fromEntries((await db.query(
  `select id, business_id, customer_id, booking_id, to_email, subject, body_html, detail, status, provider_id from public.email_sends order by id`,
)).rows.map((r) => [Number(r.id.slice(-1)), r]));
const holdsDana = (r) => DANA_TRACES.filter((rx) => [r.to_email, r.subject, r.body_html, r.detail].some((v) => v && rx.test(v)));
const holdsDanaAddress = (r) => /dana@example\.com/i.test(`${r.to_email} ${r.detail ?? ""} ${r.body_html ?? ""}`);

test("97.20 · after forget_customer no email_sends row holds the customer's address, name or body; everyone else's mail is untouched", { skip: PGlite || process.env.PGLITE_REQUIRED === "1" ? false : MISSING }, async () => {
  assert.ok(PGlite, `PGLITE_REQUIRED=1 and ${MISSING}`);
  const started_at = new Date().toISOString();
  const log = [];
  const failures = [];
  let assertions = 0;
  const check = (name, ok, detail = "") => {
    assertions++;
    log.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
    if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  };

  // CANARY: the pre-97.20 function on the same scenario must leave Dana in the mail log.
  const old = await fixture(read(OLD));
  const oldRes = (await old.query(`select public.forget_customer('${A}', '${DANA}') r`)).rows[0].r;
  const oldMail = await mail(old);
  const OLD_ROWS = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ ...oldMail[n], sent_at: `2026-10-1${n}T17:00:00.000Z` }));
  const leaked = [1, 2, 3, 4].filter((n) => holdsDana(oldMail[n]).length || holdsDanaAddress(oldMail[n]));
  const canaryCaught = oldRes.ok === true && leaked.length === 4;
  log.push(`CANARY pre-97.20: rows still holding Dana ${JSON.stringify(leaked)} (want [1,2,3,4])`);
  await old.close();

  const db = await fixture(`${read(OLD)}\n${SQL}`);
  const before = await mail(db);
  const res = (await db.query(`select public.forget_customer('${A}', '${DANA}') r`)).rows[0].r;
  const after = await mail(db);

  // R2 — nothing of Dana's left in any row of the table.
  for (const n of [1, 2, 3, 4, 5, 6, 7]) {
    const hits = holdsDana(after[n]);
    check(`row ${n}: holds none of Dana's name, phone, street or body`, hits.length === 0, hits.map(String).join(", "));
  }
  for (const n of [1, 2, 3, 4]) {
    check(`row ${n}: holds no copy of the email`, after[n].body_html === null, String(after[n].body_html).slice(0, 60));
    check(`row ${n}: no longer linked to a customer`, after[n].customer_id === null);
    check(`row ${n}: keeps its delivery outcome`, after[n].status === "delivered" && after[n].booking_id === before[n].booking_id);
  }
  for (const n of [1, 3, 4]) check(`row ${n}: sent to her, holds no address of hers`, !holdsDanaAddress(after[n]) && after[n].to_email === "Deleted customer", after[n].to_email);
  check("row 2: the owner's alert keeps the OWNER's address and note", after[2].to_email === "owner@shine.test" && after[2].detail === "owner inbox note", `${after[2].to_email} / ${after[2].detail}`);

  // R4 — every other customer's mail, in this business and the other, byte for byte.
  for (const n of [5, 6, 7, 8]) check(`row ${n}: another customer's mail is unchanged`, JSON.stringify(after[n]) === JSON.stringify(before[n]));

  // The rest of the function is the 8.11 function, unchanged.
  const bk = Object.fromEntries((await db.query(`select id, customer_id, customer_name, customer_email, customer_address, admin_notes, total from public.bookings`)).rows.map((r) => [r.id, r]));
  check("her booking is anonymised and keeps its money", bk[BK_DANA].customer_id === null && bk[BK_DANA].customer_name === "Deleted customer" && bk[BK_DANA].customer_email === null && bk[BK_DANA].admin_notes === null && Number(bk[BK_DANA].total) === 180, JSON.stringify(bk[BK_DANA]));
  check("Eli's booking and B's booking are untouched", bk[BK_ELI].customer_name === "Eli Park" && bk[BK_B].customer_name === "Dana Doe");
  const photos = (await db.query(`select booking_id from public.job_photos`)).rows.map((r) => r.booking_id);
  check("her photo row is gone and Eli's stays", photos.length === 1 && photos[0] === BK_ELI, JSON.stringify(photos));
  const custs = (await db.query(`select id from public.customers order by id`)).rows.map((r) => r.id);
  check("her customer row is gone, Eli's and B's stay", custs.length === 2 && !custs.includes(DANA), JSON.stringify(custs));
  check("the result counts what it did", res.ok === true && res.bookings_anonymised === 1 && res.photos_deleted === 1 && res.emails_forgotten === 4, JSON.stringify(res));

  // Still refuses a customer of another business, and still belongs to the service role alone.
  const cross = (await db.query(`select public.forget_customer('${A}', '${DANA_B}') r`)).rows[0].r;
  check("a customer of another business is not_found and B's mail is untouched", cross.ok === false && JSON.stringify((await mail(db))[8]) === JSON.stringify(before[8]));
  const g = (await db.query(`select has_function_privilege('authenticated', 'public.forget_customer(uuid, uuid)', 'execute') a,
    has_function_privilege('anon', 'public.forget_customer(uuid, uuid)', 'execute') n, has_function_privilege('service_role', 'public.forget_customer(uuid, uuid)', 'execute') s`)).rows[0];
  check("only the service role may call it", !g.a && !g.n && g.s, JSON.stringify(g));
  await db.close();

  // The exact rows left behind, for the browser check (scripts/mail-log-forgotten.mjs feeds them to the mail log).
  const ART = `artifacts/forget-customer-sql/results${BREAK ? `.sabotage-${BREAK}` : ""}.txt`;
  mkdirSync(path.dirname(ART), { recursive: true });
  writeFileSync(ART, `break: ${BREAK || "none"}\n${log.join("\n")}\n`);
  const artifacts = [ART];
  if (!BREAK) {
    const rows = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ ...after[n], sent_at: `2026-10-1${n}T17:00:00.000Z` }));
    writeFileSync("artifacts/forget-customer-sql/business-a-mail-after.json", JSON.stringify(rows, null, 2) + "\n");
    artifacts.push("artifacts/forget-customer-sql/business-a-mail-after.json");
    // What the PRE-97.20 function left: the browser check's sabotage feeds these to the mail log.
    writeFileSync("artifacts/forget-customer-sql/business-a-mail-before-fix.json", JSON.stringify(OLD_ROWS, null, 2) + "\n");
    artifacts.push("artifacts/forget-customer-sql/business-a-mail-before-fix.json");
  }

  const EXPECTED = 34;
  writeReceipt({
    check_id: "forget-customer-sql",
    started_at,
    status: failures.length || !canaryCaught ? "fail" : "pass",
    expected_targets: 8,
    discovered_targets: Object.keys(after).length,
    attempted_targets: Object.keys(after).length,
    completed_targets: Object.keys(after).length,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: EXPECTED,
    failures,
    assertion_floor: "structural: a fixed list of checks over eight fixed email_sends rows",
    artifacts,
    canary: { id: "pre-97.20-forget-customer", observed_failure: canaryCaught },
    dimensions: { break: BREAK || undefined, migration: MIGRATION, emails_forgotten: res.emails_forgotten, canary_rows_leaking: leaked.length },
  });
  console.log(log.join("\n"));
  assert.ok(canaryCaught, `canary: the pre-97.20 function left ${leaked.length} of 4 of Dana's rows holding her data, want 4`);
  assert.equal(assertions, EXPECTED, `ran ${assertions} assertions, expected ${EXPECTED}`);
  assert.deepEqual(failures, []);
});
