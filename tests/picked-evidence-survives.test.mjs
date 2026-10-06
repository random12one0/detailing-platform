// ROADMAP 14.26 — THE ONE `address_source = 'picked'` ROW LIVES WHERE A RESEED CANNOT REACH IT,
// AND THIS SUITE PUTS IT BACK IF ANYTHING EVER REMOVES IT.
//
//   node --test tests/picked-evidence-survives.test.mjs
//   PICKED_DRY=1 node --test tests/picked-evidence-survives.test.mjs   # look, never write
//   PICKED_BREAK=slug node --test tests/picked-evidence-survives.test.mjs   # sabotage, see below
//
// ---------------------------------------------------------------------------
// WHY IT EXISTS
// ---------------------------------------------------------------------------
// 2.8's tick rests on one fact: **a row exists whose `address_source` is
// `picked`**, because five of the six address cases write `typed`, so without
// that row nothing shows the column is written from the customer's choice and
// not hard-wired. The row was kept on `demo-detail`, and `seed-demo.mjs` deletes
// and recreates that business — so the row went, twice, and **nothing said
// so.** Queried 2026-10-03: zero `picked` rows in the whole database.
//
// `seed-demo.mjs` is in `scripts/`, which is closed to this lane, so the fix
// is made from the other side: **the evidence lives on a tenant the seed does
// not delete.** That is not a hope — `final-pass-fixture` (created 2026-09-13)
// and the `engine-*` / `ics-*` fixtures (2026-09-20) are still there after
// `demo-detail` was recreated on 2026-10-02. The seed has exactly one business
// delete, keyed on its own slug; test 1 reads that off the file so a future
// change to it reddens here rather than at the next reseed.
//
// ---------------------------------------------------------------------------
// WHAT IT DOES
// ---------------------------------------------------------------------------
//   1. (no credentials) the seed still deletes only its own slug, and the
//      fixture's slug is not that slug.
//   2. (credentials) the fixture tenant holds a `picked` booking. If it does
//      not, THIS SUITE CREATES IT — through the real `create-booking` function,
//      not by inserting a row, because the evidence is the SERVER storing the
//      word it was sent. `PICKED_DRY=1` forbids the write and fails instead,
//      which is how to ask "is it there right now" without changing anything.
//
// **IT WRITES TO THE LIVE PLATFORM DATABASE (`kguqylyzgyzfktkfnhjb`, the one
// with no live customers) AND REFUSES TO RUN AGAINST ANY OTHER PROJECT.** The
// writes are one fixture business, its settings, hours and one service, and one
// booking with `@example.com` addresses — which `send-email`'s undeliverable
// guard drops, so nothing is mailed to anybody. It writes nothing when the row
// already exists.
//
// ---------------------------------------------------------------------------
// BROKEN ON PURPOSE
// ---------------------------------------------------------------------------
//   * `PICKED_BREAK=slug` points the fixture at `demo-detail`, the tenant the
//     seed deletes. Test 1 must go red. It runs before anything is written.
//   * `PICKED_DRY=1` against a database with no picked row must go red on test
//     2 — it was run that way on 2026-10-06 against the zero-row state this
//     item describes, before the fixture existed.
import "./_env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SEED = readFileSync(new URL("../scripts/seed-demo.mjs", import.meta.url), "utf8");
const SEED_SLUG = (SEED.match(/const SLUG\s*=\s*"([^"]+)"/) || [])[1];
const FIXTURE_SLUG = process.env.PICKED_BREAK === "slug" ? SEED_SLUG : "address-source-evidence";
const PLATFORM_REF = "kguqylyzgyzfktkfnhjb";
// A sabotage run must never write: pointed at `demo-detail`, a healing write would
// put a stray booking on the seeded tenant (it did, once, 2026-10-06, and was removed).
const DRY = process.env.PICKED_DRY === "1" || process.env.PICKED_BREAK === "slug";

test("14.26 · 1 — the seed deletes only its own tenant, and the fixture is not it", () => {
  assert.ok(SEED_SLUG, "could not read `const SLUG = \"…\"` out of scripts/seed-demo.mjs — the file's shape changed; fix this read, do not loosen it");
  const businessDeletes = SEED.match(/del\(\s*`\/rest\/v1\/businesses[^`]*`/g) || [];
  assert.equal(businessDeletes.length, 1,
    `scripts/seed-demo.mjs now has ${businessDeletes.length} deletes against /rest/v1/businesses; it had exactly one. Another delete may reach the fixture.`);
  assert.match(businessDeletes[0], /slug=eq\.\$\{SLUG\}/,
    `the seed's business delete is no longer keyed on its own slug: ${businessDeletes[0]}`);
  assert.notEqual(FIXTURE_SLUG, SEED_SLUG,
    `the fixture slug is "${FIXTURE_SLUG}", the tenant the seed deletes and recreates — evidence kept there dies at the next reseed (ROADMAP 14.26)`);
});

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const haveCreds = Boolean(URL_ && KEY);
if (!haveCreds) console.log("SKIPPED 14.26 · 2 — no SUPABASE_URL / service key. This is NOT a pass: the live row was not checked.");

async function rest(method, path, body) {
  const res = await fetch(`${URL_}/rest/v1${path}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  assert.ok(res.ok, `${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function anonKey() {
  if (process.env.SUPABASE_ANON_KEY) return process.env.SUPABASE_ANON_KEY;
  const r = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` } });
  const keys = await r.json();
  return keys.find((k) => k.name === "anon")?.api_key ?? keys.find((k) => k.type === "publishable")?.api_key;
}

const pickedRows = (bizId) => rest("GET", `/bookings?business_id=eq.${bizId}&address_source=eq.picked&select=id,customer_address,address_source`);

test("14.26 · 2 — the fixture tenant holds a booking whose address_source is picked", { skip: !haveCreds && "no credentials — see the SKIPPED line above" }, async () => {
  assert.ok(URL_.includes(PLATFORM_REF), `SUPABASE_URL is not the platform project ${PLATFORM_REF}; refusing to read or write. Stop and ask.`);

  let [biz] = await rest("GET", `/businesses?slug=eq.${FIXTURE_SLUG}&select=id`);
  let rows = biz ? await pickedRows(biz.id) : [];

  if (!rows.length) {
    assert.ok(!DRY, "PICKED_DRY=1 and the fixture tenant holds NO picked booking — this is the fault ROADMAP 14.26 describes, and a plain run of this suite repairs it");
    console.log("  healing: the picked row is missing; creating the fixture and booking it through create-booking");
    if (!biz) {
      [biz] = await rest("POST", "/businesses", [{
        is_demo: true, slug: FIXTURE_SLUG, name: "Address Source Evidence (fixture, do not delete)", timezone: "America/Los_Angeles",
        contact_email: "owner@example.com", contact_phone: "555-0100", dropoff_address: "1 Evidence St, Long Beach, CA",
      }]);
    }
    if (!(await rest("GET", `/business_settings?business_id=eq.${biz.id}&select=business_id`)).length) {
      await rest("POST", "/business_settings", [{ business_id: biz.id, slot_interval_minutes: 30, buffer_minutes: 30, mobile_enabled: true, dropoff_enabled: true }]);
    }
    if (!(await rest("GET", `/business_hours?business_id=eq.${biz.id}&select=weekday`)).length) {
      await rest("POST", "/business_hours", [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ business_id: biz.id, weekday, open_time: "08:00", close_time: "18:00" })));
    }
    let [service] = await rest("GET", `/services?business_id=eq.${biz.id}&select=id&limit=1`);
    if (!service) [service] = await rest("POST", "/services", [{ business_id: biz.id, name: "Evidence Wash", price: 65, duration_minutes: 60 }]);

    const day = new Date(Date.now() + 21 * 86400_000).toISOString().slice(0, 10);
    const res = await fetch(`${URL_}/functions/v1/create-booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: await anonKey() },
      body: JSON.stringify({
        business_slug: FIXTURE_SLUG,
        customer_name: "ROADMAP 14.26 Evidence", customer_phone: "555-0101", customer_email: "evidence@example.com",
        customer_address: "5000 East Ocean Boulevard, Long Beach, CA", address_source: "picked",
        service_type: "mobile", vehicle_size: "medium", vehicle_model: "Civic",
        service_ids: [service.id], booking_date: day, start_time: "10:00",
      }),
    });
    const text = await res.text();
    assert.equal(res.status, 200, `create-booking refused the evidence booking: ${res.status} ${text.slice(0, 300)}`);
    rows = await pickedRows(biz.id);
  }

  assert.ok(rows.length >= 1, "the fixture tenant still has no picked booking after the repair — create-booking is not storing the word it was sent, which is the fault 2.8 exists to catch");
  assert.equal(rows[0].address_source, "picked");
});
