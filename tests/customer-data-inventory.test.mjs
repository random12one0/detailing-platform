// ROADMAP 97.20 — EVERY TABLE WITH A CUSTOMER-IDENTIFYING COLUMN, AND WHAT "DELETE FOR GOOD" DOES TO IT.
//
//   node --test tests/customer-data-inventory.test.mjs
//   BREAK=drop-email node tests/customer-data-inventory.test.mjs   # sabotage: forget_customer as it was before 97.20
//
// Credential-free: it reads `supabase/migrations/` and nothing else. BREAK is an env var, not a flag
// (docs/gotchas.md 104).
//
// WHY: `forget_customer` (8.11) was written before `email_sends` existed, and nothing anywhere noticed
// when a table holding a customer's address and a full copy of every email sent to them appeared nine
// days later. This replays every migration, finds every text column whose NAME looks like a person
// (email, phone, address, name, notes, caption, body, author …), and requires the set to EQUAL the
// declared list below. A new table or column that matches goes red until somebody declares it — and
// declaring it means writing down how Delete for good handles it, or why it is not a customer's.
//
// WHAT "COVERED" MEANS, per table:
//   forget:   the latest `forget_customer` definition writes or deletes `public.<table>` — checked here
//   cascade:  `<table>.<column> references public.<parent>(id) on delete cascade` — checked here, and
//             the parent must itself be `forget` or `cascade`
//   not:      not a customer's data; the reason is written down and a person judged it
//
// BLIND SPOT, stated rather than discovered: it judges column NAMES. A customer's data in a column
// named `payload` or `meta` is invisible to it, as is data outside the database (storage buckets,
// Resend's own logs). Ask whether a new column holds a person's details, not whether this went green.

import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const DIR = "supabase/migrations";
const BREAK = process.env.BREAK || "";
const PERSONISH = /email|phone|address|(^|_)name$|^name|notes?$|caption|body|author|quote$|recipient|visitor|user_agent|answers|plate|referrer|subject$|^before$|^after$/;
const TEXTY = /^(text|citext|varchar|character|jsonb|json)$/i;

// Every migration, in order: table -> column -> type; plus the latest forget_customer body.
export function inventory(files) {
  const cols = new Map();
  let forget = null;
  for (const [, raw] of files) {
    const s = raw.replace(/\r\n/g, "\n").replace(/--[^\n]*/g, "");
    for (const m of s.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\);/gi)) {
      if (!cols.has(m[1])) cols.set(m[1], new Map());
      for (const line of m[2].split("\n")) {
        const c = /^\s*([a-z_][a-z0-9_]*)\s+([a-z]+)/i.exec(line);
        if (c && !/^(constraint|primary|unique|check|foreign|exclude)$/i.test(c[1])) cols.get(m[1]).set(c[1], { type: c[2], line });
      }
    }
    for (const m of s.matchAll(/alter table (?:only )?(?:if exists )?(?:public\.)?(\w+)([^;]*);/gi)) {
      for (const a of m[2].matchAll(/add column (?:if not exists )?(\w+)\s+(\w+)([^,;]*)/gi)) {
        if (!cols.has(m[1])) cols.set(m[1], new Map());
        cols.get(m[1]).set(a[1], { type: a[2], line: a[0] });
      }
      for (const a of m[2].matchAll(/drop column (?:if exists )?(\w+)/gi)) cols.get(m[1])?.delete(a[1]);
    }
    for (const m of s.matchAll(/drop table (?:if exists )?(?:public\.)?(\w+)/gi)) cols.delete(m[1]);
    const f = /create or replace function public\.forget_customer\([\s\S]*?\$\$([\s\S]*?)\$\$/i.exec(s);
    if (f) forget = f[1];
  }
  const found = new Set();
  for (const [t, m] of cols) for (const [c, { type }] of m) if (PERSONISH.test(c) && TEXTY.test(type)) found.add(`${t}.${c}`);
  return { cols, forget, found };
}

const PLATFORM = "the platform's or a detailer's own data, not a customer's";
const CATALOG = "the detailer's catalog or settings, written by them, about no customer";
// THE DECLARATION. Equality, not a floor: one more or one fewer goes red (docs/gotchas.md 98).
export const DECLARED = {
  bookings: { how: "forget", cols: ["customer_name", "customer_phone", "customer_email", "customer_address", "customer_notes", "admin_notes", "payment_notes", "quoted_note", "address_source"],
    why: "anonymised in place; the money stays. payment_notes and quoted_note are the detailer's words about the payment and the quote and stay with the money; address_source is 'typed' or 'picked'" },
  customers: { how: "forget", cols: ["name", "email", "phone", "address", "notes", "email_failed_reason"], why: "the row is deleted" },
  email_sends: { how: "forget", cols: ["to_email", "body_html", "subject"], why: "97.20: blanked in place, delivery outcome kept" },
  job_photos: { how: "forget", cols: ["caption"], why: "rows deleted here, files by delete-customer first" },
  plan_members: { how: "cascade", via: "customer_id", parent: "customers", cols: ["notes"] },
  maintenance_deadlines: { how: "cascade", via: "customer_id", parent: "customers", cols: ["notes"] },
  plan_visits: { how: "cascade", via: "member_id", parent: "plan_members", cols: ["note"] },
  booking_add_ons: { how: "not", cols: ["notes"], why: "the add-on's own note as priced, the same as the catalog's; the booking it hangs on is anonymised" },
  booking_services: { how: "not", cols: ["name_at_booking"], why: "the service's name at booking time, not the customer's" },
  action_log: { how: "not", cols: ["before", "after"], why: "holds the changed field only ({status}), never the booking row — _shared/actionLog.ts says so" },
  campaign_visits: { how: "not", cols: ["visitor_id", "referrer", "user_agent"], why: "an anonymous browser that opened a campaign page; linked to no customer row" },
  testimonials: { how: "not", cols: ["author", "quote"], why: "words the detailer typed onto their own public site; linked to no customer row, removed in the site editor" },
  gallery_images: { how: "not", cols: ["caption"], why: "photos the detailer chose to publish on their public site; linked to no booking" },
  site_intake: { how: "not", cols: ["answers"], why: "the detailer's own answers about their website" },
  add_ons: { how: "not", cols: ["name", "notes"], why: CATALOG },
  services: { how: "not", cols: ["name", "notes"], why: CATALOG },
  service_groups: { how: "not", cols: ["name"], why: CATALOG },
  plans: { how: "not", cols: ["name"], why: CATALOG },
  campaigns: { how: "not", cols: ["name"], why: CATALOG },
  message_templates: { how: "not", cols: ["body"], why: CATALOG },
  blockout_dates: { how: "not", cols: ["event_name"], why: CATALOG },
  booking_hours_overrides: { how: "not", cols: ["notes"], why: CATALOG },
  business_settings: { how: "not", cols: ["notification_emails", "email_messages"], why: CATALOG },
  expenses: { how: "not", cols: ["notes"], why: "the detailer's own receipts" },
  businesses: { how: "not", cols: ["name", "contact_email", "contact_phone", "dropoff_address", "mailing_address", "closed_note"], why: PLATFORM },
  business_invites: { how: "not", cols: ["email"], why: PLATFORM },
  business_users: { how: "not", cols: ["email", "first_name"], why: PLATFORM },
  owner_push_subscriptions: { how: "not", cols: ["user_agent"], why: PLATFORM },
  platform_admin_events: { how: "not", cols: ["admin_email", "business_name"], why: PLATFORM },
  platform_admins: { how: "not", cols: ["email", "note"], why: PLATFORM },
  platform_costs: { how: "not", cols: ["note"], why: PLATFORM },
  platform_promo_codes: { how: "not", cols: ["note"], why: PLATFORM },
  platform_settings: { how: "not", cols: ["owner_email"], why: PLATFORM },
  site_probes: { how: "not", cols: ["body", "secret_name"], why: PLATFORM },
};
// address_points.key IS a street address, but its column is called `key`, so the name rule cannot see it.
// It is declared here by hand so the gap is written down; ROADMAP 97.20a is the decision it needs.
export const KNOWN_BY_HAND = { address_points: "key — a geocoded street address with no name or business; ROADMAP 97.20a" };

const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort().map((f) => [f, readFileSync(`${DIR}/${f}`, "utf8")]);
if (BREAK === "drop-email") {
  // docs/gotchas.md 102: the sabotage must LAND — drop 97.20's migration so the 8.11 body is the latest.
  const i = files.findIndex(([f]) => f === "20261017210000_forget_customer_forgets_their_email.sql");
  if (i < 0) throw new Error("BREAK=drop-email did not land: 97.20's migration is not in the list");
  files.splice(i, 1);
} else if (BREAK) throw new Error(`unknown BREAK=${BREAK}; known: drop-email`);

const declaredSet = (d) => new Set(Object.entries(d).flatMap(([t, e]) => e.cols.map((c) => `${t}.${c}`)));
const diff = (found, declared) => ({
  undeclared: [...found].filter((x) => !declared.has(x)).sort(),
  gone: [...declared].filter((x) => !found.has(x)).sort(),
});
const forgets = (body, t) => new RegExp(`(update|delete from)\\s+public\\.${t}\\b`, "i").test(body ?? "");

test("discovery floor: the parser still reads the schema it is judging", () => {
  const { cols, forget, found } = inventory(files);
  assert.ok(cols.size >= 63, `parsed ${cols.size} tables, expected at least 63 — the parser stopped matching`);
  assert.ok(found.size >= 60, `found ${found.size} customer-like columns, expected at least 60`);
  assert.ok(forget, "no `create or replace function public.forget_customer` found in any migration");
  for (const t of Object.keys(KNOWN_BY_HAND)) assert.ok(cols.has(t), `${t} is declared by hand but no longer exists`);
});

test("every customer-identifying column is declared, and nothing declared has vanished", () => {
  const { undeclared, gone } = diff(inventory(files).found, declaredSet(DECLARED));
  assert.deepEqual(undeclared, [], `NEW customer-like column(s) with no declaration — add each to DECLARED with how "Delete for good" handles it: ${undeclared.join(", ")}`);
  assert.deepEqual(gone, [], `declared but no longer in the schema: ${gone.join(", ")}`);
});

test("every table declared as handled by forget_customer IS written by its latest definition", () => {
  const { forget } = inventory(files);
  const missing = Object.entries(DECLARED).filter(([t, e]) => e.how === "forget" && !forgets(forget, t)).map(([t]) => t);
  assert.deepEqual(missing, [], `the latest forget_customer never updates or deletes: ${missing.join(", ")}`);
});

test("every table declared as cascading really cascades from a covered parent", () => {
  const { cols } = inventory(files);
  for (const [t, e] of Object.entries(DECLARED).filter(([, e]) => e.how === "cascade")) {
    const line = cols.get(t)?.get(e.via)?.line ?? "";
    assert.match(line, new RegExp(`references public\\.${e.parent}\\(id\\) on delete cascade`, "i"), `${t}.${e.via} does not cascade from ${e.parent}: ${line.trim()}`);
    assert.ok(["forget", "cascade"].includes(DECLARED[e.parent]?.how), `${t} cascades from ${e.parent}, which is not itself covered`);
  }
  for (const e of Object.values(DECLARED)) if (e.how === "not") assert.ok(e.why, "a `not` entry needs its reason");
});

test("CANARY: a new table with a customer column, and a forget_customer that forgets email_sends, both go red", () => {
  const extra = [...files, ["29991231000000_canary.sql", "create table public.sms_sends (\n  id uuid primary key,\n  to_phone text not null\n);"]];
  assert.deepEqual(diff(inventory(extra).found, declaredSet(DECLARED)).undeclared, ["sms_sends.to_phone"], "the canary table was not caught");
  const old = files.filter(([f]) => f !== "20261017210000_forget_customer_forgets_their_email.sql");
  assert.equal(forgets(inventory(old).forget, "email_sends"), false, "the pre-97.20 forget_customer reads as covering email_sends");
});
