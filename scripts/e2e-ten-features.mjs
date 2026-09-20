// ROADMAP 14.6 — THE FEATURES THAT HAD NEVER RUN, RUN FOR REAL.
//
//   node scripts/e2e-ten-features.mjs                 # the whole run
//   node scripts/e2e-ten-features.mjs --break=<id>    # sabotage one target
//   node scripts/receipt.mjs receipts/e2e-ten-features.json
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS, IN ONE SENTENCE
// ---------------------------------------------------------------------------
// ROADMAP 14.6 lists **ten tables at zero rows**, each the evidence of a
// feature nobody has ever driven end to end. An empty table does not mean the
// code is broken — it means the answer to *"does it work or look like it
// works"* is **unknown**, and unknown has been reading as *works* because the
// screens are all there.
//
// ---------------------------------------------------------------------------
// WHAT "A REAL RUN" MEANS HERE, BECAUSE IT IS THE WHOLE VALUE
// ---------------------------------------------------------------------------
// **NOTHING IN THIS FILE WRITES A FEATURE'S ROW WITH THE SERVICE KEY.** A row
// put there by an admin key proves the column names and nothing else — it
// skips row-level security, which is the half of these features most likely to
// be wrong and the half no unit test touches. Every feature row below is
// written by **the demo owner's own signed-in session**, over the same wire
// calls `supabase-js` makes from the dashboard, with the same anon key and the
// same JWT a detailer's browser holds.
//
// The service key appears in exactly three places, none of them a feature row:
// clearing this run's own previous fixtures, reading back what the customer's
// side did, and the rate-limit sweep `e2e-booking.mjs` already documents.
//
// **AND EVERY TARGET ASSERTS THE CONSEQUENCE, NOT ONLY THE ROW.** A row that
// nothing reads is not a feature. So the drop-off period has to make
// `create-booking` refuse a mobile job, the line item has to move the Money
// screen's "added at the job" figure, the photo's bytes have to come back
// through a signed URL, and the Spanish has to reach the customer's own
// endpoint. That is what stops this being ten inserts in a coat.
//
// ---------------------------------------------------------------------------
// WHAT THIS FILE DOES **NOT** COVER, NAMED RATHER THAN LEFT IMPLIED
// ---------------------------------------------------------------------------
// · **It does not press the buttons.** These six features are written by the
//   browser client, so the wire call is identical, but the React form around
//   it — `FinalizeModal`, `DaySheet`, `SiteIntake`, `Gallery`, `JobPhotos` —
//   is not exercised here. `shrink()` in `lib/photos.js` in particular is
//   browser-only (canvas + EXIF orientation) and is skipped: the bytes that go
//   up are a real JPEG, just not one a canvas re-encoded.
// · **`platform_subscriptions`, `platform_invoices` and
//   `owner_push_subscriptions` are not here.** They need a browser — Stripe
//   Elements' iframe and the Push API's service worker — and they are their
//   own job. Six of the ten tables are covered by this file.
//
// ---------------------------------------------------------------------------
// THE FIXTURES ARE FLAGGED AND LEFT, PER ROADMAP 0.3
// ---------------------------------------------------------------------------
// Everything this run creates is named `ROADMAP 14.6 …` or sits under a
// `roadmap-14-6/` storage folder. Each run clears its OWN previous fixtures
// first so the counts stay honest, and clears nothing else.

import "../tests/_env.mjs";           // root .env -> process.env, before anything reads it

import { mkdirSync, writeFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
// THE PRODUCT'S OWN ARITHMETIC, IMPORTED RATHER THAN RESTATED. `advancedMoney`
// is what the Money screen calls; asking it the question here is the only way
// to prove a line item moves the figure a detailer reads.
import { ON_SITE, advancedMoney } from "../app/src/lib/moneyAdvanced.js";
// `localDate` FOR THE SAME REASON. There is no `booking_date` column — the
// dashboard derives one from `start_at` in the BUSINESS's timezone
// (`hooks/useBookings.js` § `withLocal`), and `advancedMoney` filters its
// period on that derived date. Doing the arithmetic here with the UTC instant
// would put a 5pm job on the wrong day eight months of the year.
import { localDate, money } from "../app/src/lib/format.js";

const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

// THE DEMO BUSINESS IS FOUND BY ITS SLUG, NOT BY A UUID WRITTEN DOWN HERE.
// This file carried `def6fa3f-…` until 2026-09-18, when FOUND.md caught it:
// `seed-demo.mjs` rebuilds the demo tenant and a rebuilt row gets a NEW id, so
// the constant was a dead foreign key. A reseed never changes the slug, so the
// id is resolved at run time in § 0. `e2e-payment.mjs` carries the same fix.
const SLUG = "demo-detail";   // Coastline Auto Detailing, the demo
let BIZ = null;
const TZ = "America/Los_Angeles";              // this business's own, as the row says
const OWNER = { email: "demo@detailplatform.com", password: "demo123" };
const TAG = "ROADMAP 14.6";
const FOLDER = "roadmap-14-6";

// A REAL JPEG, 160 BYTES, CARRIED HERE RATHER THAN FETCHED. Both buckets
// refuse anything that is not an image by MIME type, so a text file would be
// rejected at the door and prove nothing about the photo path. Embedding it
// keeps the check offline and keeps the bytes identical on every run, which is
// what makes the round-trip comparison below mean something.
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a"
  + "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA"
  + "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==", "base64");
// A SECOND, DIFFERENT IMAGE — one byte of payload apart, same length. This is
// only ever used by `--break=wrongbytes`, which hands the round-trip check the
// image that was NOT uploaded. A sabotage has to change what is compared.
const JPEG_OTHER = Buffer.concat([JPEG.subarray(0, JPEG.length - 4), Buffer.from([0x11, 0x22, 0xff, 0xd9])]);

// The date the drop-off-only period covers, and a neighbour it does not. Both
// are ordinary open weekdays for this business (08:00–18:00), far enough out
// that no seeded booking holds the slot.
const DROPOFF_DATE = "2026-11-04";
const FREE_DATE = "2026-11-05";
// `--break=otherday` asks the drop-off question about the day the period does
// NOT cover. The product is untouched and still refuses mobile on the 4th;
// the check is simply looking at the wrong day, and must go red for it.
const ASK_DATE = BREAK === "otherday" ? FREE_DATE : DROPOFF_DATE;

// One nonce per run, so "the answer came back" can never be satisfied by
// something an earlier run left behind.
const NONCE = `n${Date.now().toString(36)}`;
// `--break=wrongnonce` reads the intake back and compares it against a value
// nobody wrote. Same as above: what is compared changes, not how loosely.
const EXPECT_NONCE = BREAK === "wrongnonce" ? `${NONCE}-never-written` : NONCE;

let assertions = 0;
const failures = [];
const warnings = [];
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`  ok    ${name}`); return true; }
  failures.push(`${name} ${detail}`.trim());
  console.error(`  FAIL  ${name} ${detail}`);
  return false;
};

// ---------------------------------------------------------------------------
// GUARDS. A SKIPPED RUN MUST NOT READ LIKE A PASSING ONE.
// ---------------------------------------------------------------------------
if (!URL_ || !SERVICE || !ANON) {
  console.error("\nSKIPPED — needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY in the root .env.");
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) {
  console.error(`\nREFUSED — ${URL_} is not the development project. This script writes rows and uploads files.`);
  console.error("NOTHING ran and NO receipt was written.");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// THE THREE WAYS TO TALK TO THE SERVER, KEPT APART ON PURPOSE
// ---------------------------------------------------------------------------
/** Admin. Fixtures and read-back ONLY — never a feature's own row. */
const svc = async (path, init = {}) => {
  const res = await fetch(URL_ + path, {
    ...init,
    headers: {
      apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json", ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
};

let TOKEN = null;
/** THE DETAILER'S OWN SESSION. Every feature row below goes through this. */
const own = async (path, init = {}) => {
  const res = await fetch(URL_ + path, {
    ...init,
    headers: {
      apikey: ANON, Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json", ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
};

/** The public, signed-out caller — a customer's browser. */
const anon = async (path, init = {}) => {
  const res = await fetch(URL_ + path, {
    ...init,
    headers: { apikey: ANON, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
};

const fn = (name, payload, who = own) =>
  who(`/functions/v1/${name}`, { method: "POST", body: JSON.stringify(payload) });

// ===========================================================================
console.log(`\nROADMAP 14.6 — the features that had never run${BREAK ? `   [SABOTAGE: ${BREAK}]` : ""}`);
console.log(`  project ${URL_}`);
console.log(`  nonce   ${NONCE}`);

const ART = new URL("../artifacts/e2e-ten-features/", import.meta.url);
mkdirSync(ART, { recursive: true });
const artifacts = [];
const keep = (name, data) => {
  writeFileSync(new URL(name, ART), typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n");
  artifacts.push("artifacts/e2e-ten-features/" + name);
};

// Six targets, named up front. `expected` never comes from counting what was
// found — that is the arithmetic `receipt.mjs` exists to check.
const TARGETS = ["dropoff", "upsell", "jobphoto", "gallery", "intake", "translations"];
const expected_targets = TARGETS.length;
let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "a-signed-out-stranger-must-not-be-able-to-write-these-rows", observed_failure: false };

// Where each target stood before it ran, so the receipt carries the "was zero"
// this whole item is about.
const before = {};
for (const t of ["dropoff_only_periods", "booking_line_items", "job_photos",
  "gallery_images", "site_intake", "translations"]) {
  const r = await fetch(`${URL_}/rest/v1/${t}?select=*`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Prefer: "count=exact", Range: "0-0" },
  });
  before[t] = Number((r.headers.get("content-range") || "*/0").split("/")[1]) || 0;
}
keep("row-counts-before.json", before);
console.log("  before  " + Object.entries(before).map(([k, v]) => `${k}=${v}`).join("  "));

/** A section is finished only if NOTHING has failed anywhere yet. */
const failedAt = () => failures.length;
const finish = (marker) => { if (failures.length === marker) completed++; };

try {
  // -------------------------------------------------------------------------
  console.log("\n§ 0 — the demo owner signs in, and everything below is that session");
  const signin = await anon("/auth/v1/token?grant_type=password", {
    method: "POST", body: JSON.stringify(OWNER),
  });
  TOKEN = signin.body?.access_token || null;
  if (!TOKEN) {
    console.error("  FAIL  the demo owner could not sign in — run `node scripts/seed-demo.mjs`");
    throw new Error("no owner session; nothing below could be a real run");
  }
  console.log("  ok    signed in as the detailer");

  // THE DEMO'S ID, READ FROM THE SLUG RATHER THAN WRITTEN DOWN. A missing demo
  // is a failed run here, not a confusing foreign-key error five sections later.
  const bizRow = await svc(`/rest/v1/businesses?select=id,name&slug=eq.${SLUG}`);
  BIZ = bizRow.body?.[0]?.id ?? null;
  if (!BIZ) throw new Error(`no business with slug "${SLUG}" in ${URL_} — run node scripts/seed-demo.mjs`);
  console.log(`  ok    demo business ${bizRow.body[0].name} ${BIZ}`);

  // CLEAR ONLY WHAT THIS CHECK MADE LAST TIME. Fixtures are flagged, never
  // deleted wholesale — ROADMAP 0.3. Everything here is matched on this file's
  // own tag or folder.
  await svc(`/rest/v1/dropoff_only_periods?business_id=eq.${BIZ}&reason=like.${encodeURIComponent(TAG + "%")}`,
    { method: "DELETE" });
  await svc(`/rest/v1/booking_line_items?business_id=eq.${BIZ}&label=like.${encodeURIComponent(TAG + "%")}`,
    { method: "DELETE" });
  await svc(`/rest/v1/job_photos?business_id=eq.${BIZ}&path=like.${encodeURIComponent("%" + FOLDER + "%")}`,
    { method: "DELETE" });
  await svc(`/rest/v1/gallery_images?business_id=eq.${BIZ}&image_url=like.${encodeURIComponent("%" + FOLDER + "%")}`,
    { method: "DELETE" });
  // AND THE BOOKING A SABOTAGE RUN LEAVES BEHIND. `--break=otherday` asks the
  // drop-off question about a day the period does not cover, so `create-booking`
  // correctly ACCEPTS the mobile job it was supposed to refuse — and a real
  // booking is then sitting on a real calendar day. Soft-deleted, not removed,
  // per ROADMAP 0.3, and it drops out of every screen's own query.
  await svc(`/rest/v1/bookings?business_id=eq.${BIZ}`
    + `&customer_name=eq.${encodeURIComponent(TAG + " MOBILE")}&deleted_at=is.null`,
    { method: "PATCH", body: JSON.stringify({ deleted_at: new Date().toISOString() }) });

  // -------------------------------------------------------------------------
  console.log("\n§ 1 — dropoff_only_periods: a drop-off-only day the customer's side obeys");
  discovered++; attempted++;
  let mark = failedAt();
  {
    const made = await own("/rest/v1/dropoff_only_periods", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        business_id: BIZ, start_date: DROPOFF_DATE, end_date: DROPOFF_DATE,
        mode: "dropoff", reason: `${TAG} ${NONCE}`,
      }),
    });
    keep("dropoff-row.json", made.body);
    check("the detailer's own session created the period", made.status === 201 && Boolean(made.body?.[0]?.id),
      `${made.status} ${JSON.stringify(made.body).slice(0, 160)}`);

    // CONSEQUENCE ONE — the customer's slot endpoint says so, unprompted.
    const slots = await fn("available-slots", {
      business_slug: SLUG, duration_minutes: 120, booking_date: ASK_DATE, service_type: "mobile",
    }, anon);
    keep("dropoff-slots.json", { asked: ASK_DATE, ...slots.body });
    check(`${ASK_DATE} comes back drop-off only`, slots.body?.dropoff_only === true,
      JSON.stringify(slots.body).slice(0, 160));
    check("and it offers a customer no mobile time at all",
      Array.isArray(slots.body?.mobile_slots) && slots.body.mobile_slots.length === 0,
      JSON.stringify(slots.body?.mobile_slots));

    // CONSEQUENCE TWO — and the way IN refuses, which is the hole ROADMAP 2.7
    // W4 was written about: the note used to be advice the engine ignored.
    // The rate-limit sweep is `e2e-booking.mjs`'s, for its reason: this books
    // from one address more often than a real customer does in a year.
    await svc("/rest/v1/rate_hits?bucket=like.booking%25", { method: "DELETE" });
    const svcRow = await svc(`/rest/v1/services?business_id=eq.${BIZ}&select=id&is_active=eq.true&limit=1`);
    const serviceId = svcRow.body?.[0]?.id;
    const tryMobile = await fn("create-booking", {
      business_slug: SLUG, customer_name: `${TAG} MOBILE`, customer_phone: "562-555-0146",
      customer_email: "roadmap-14-6@example.com", customer_address: "1 Test St, Seal Beach, CA",
      service_type: "mobile", vehicle_size: "medium", service_ids: [serviceId],
      booking_date: ASK_DATE, start_time: "10:00",
    }, anon);
    keep("dropoff-refusal.json", { asked: ASK_DATE, status: tryMobile.status, body: tryMobile.body });
    check("a customer booking a MOBILE job on it is refused", tryMobile.status === 409,
      `${tryMobile.status} ${JSON.stringify(tryMobile.body).slice(0, 160)}`);
    check("and the refusal says why in the detailer's words",
      /drop-off only/i.test(String(tryMobile.body?.error || "")),
      String(tryMobile.body?.error || "").slice(0, 120));
  }
  finish(mark);

  // -------------------------------------------------------------------------
  console.log("\n§ 2 — booking_line_items: an upsell added at the car, and the Money screen sees it");
  discovered++; attempted++;
  mark = failedAt();
  let upsellAmount = 0;
  {
    // A REAL COMPLETED JOB OF THIS BUSINESS, not a fixture of our own. The
    // figure under test is a SHARE of what was brought in, so it only means
    // something against the jobs actually in the period.
    const jobs = await svc(`/rest/v1/bookings?select=id,status,final_amount,total_price,start_at`
      + `&business_id=eq.${BIZ}&deleted_at=is.null&status=eq.completed&order=start_at.desc&limit=1`);
    const job = jobs.body?.[0];
    check("there is a finished job to add it to", Boolean(job?.id), JSON.stringify(jobs.body).slice(0, 160));
    if (!job?.id) throw new Error("no completed job in the demo business — run `node scripts/seed-demo.mjs`");

    // TWO LINES, AND THE SECOND ONE IS THE POINT.
    //
    // `add_on` $45 is the category that has always been counted. `custom` $30
    // is the FINALIZE FORM'S OWN DEFAULT, and until Andrew's ruling on
    // 2026-09-17 it was counted as **zero** — `moneyAdvanced.js` was looking
    // for `add_on, upsell, surcharge, adjustment`, three of which the database
    // refuses outright, while `Money.jsx` kept its own correct copy of the
    // list. Same words on two screens, two different figures.
    //
    // **SO THE $75 BELOW IS THE RULING, EXPRESSED AS A NUMBER.** Against the
    // old code this section reads $45 and goes red. A check that only ever
    // added an `add_on` could not tell the two versions apart, which is exactly
    // why the first version of this section did not.
    upsellAmount = 75;                      // 45 add-on + 30 custom charge
    const made = await own("/rest/v1/booking_line_items", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify([
        {
          business_id: BIZ, booking_id: job.id, category: "add_on",
          label: `${TAG} engine bay ${NONCE}`, amount: 45,
        },
        {
          business_id: BIZ, booking_id: job.id, category: "custom",
          label: `${TAG} pet hair ${NONCE}`, amount: 30,
        },
      ]),
    });
    keep("line-item-row.json", made.body);
    check("the detailer's own session added the line", made.status === 201 && Boolean(made.body?.[0]?.id),
      `${made.status} ${JSON.stringify(made.body).slice(0, 160)}`);

    // CONSEQUENCE — the Money screen's own arithmetic, asked the screen's way.
    // `Money.jsx` reads bookings + expenses + booking_line_items and hands all
    // three to `advancedMoney`; the period is the job's own month.
    const d = localDate(job.start_at, TZ);
    const period = { start: d.slice(0, 8) + "01", end: d };
    const raw = await svc(`/rest/v1/bookings?select=id,status,final_amount,total_price,start_at`
      + `&business_id=eq.${BIZ}&deleted_at=is.null`);
    const rows = { body: (raw.body || []).map((b) => ({ ...b, booking_date: localDate(b.start_at, TZ) })) };
    const li = await svc(`/rest/v1/booking_line_items?select=booking_id,category,amount,quantity`
      + `&business_id=eq.${BIZ}`);
    // SABOTAGE `noitems`: hand the screen's arithmetic NO line items while the
    // row really is in the database. This stands in for a Money screen that
    // stopped reading the table — the exact defect that would make the "% sold
    // at the job" figure a decoration. It changes WHAT is summed.
    const withItems = advancedMoney({
      bookings: rows.body || [], expenses: [],
      lineItems: BREAK === "noitems" ? [] : (li.body || []), period,
    });
    const without = advancedMoney({
      bookings: rows.body || [], expenses: [],
      lineItems: (li.body || []).filter((r) =>
        r.booking_id !== job.id || !["add_on", "custom"].includes(r.category)),
      period,
    });
    keep("money-with-and-without.json", {
      period, onSite_with: withItems.onSite, onSite_without: without.onSite,
      upsellRate: withItems.upsellRate, upsoldJobs: withItems.upsoldJobs,
    });
    check(`"added at the job" counts this job`, withItems.upsoldJobs >= 1, String(withItems.upsoldJobs));
    check(
      `the figure is exactly ${money(upsellAmount)} higher than without those two lines`,
      Math.round((withItems.onSite - without.onSite) * 100) === upsellAmount * 100,
      `it is ${money(withItems.onSite - without.onSite)} higher`
      + ` — $45 means the "custom" charge is being counted as zero again`,
    );
    // ANDREW'S RULING, 2026-09-17, ASSERTED RATHER THAN TRUSTED. *"Anything
    // beyond the base price — any upgrade of either package, add-on, a travel
    // fee, whatever — counts as more money we made."* This says so against the
    // list the product actually uses, so a later edit to it has to come past
    // here. `tests/money-advanced.test.mjs` § 10 holds the rest of the rule.
    for (const c of ["upgrade", "add_on", "custom", "travel_fee"]) {
      check(`a "${c}" line counts as sold at the job`, ON_SITE.has(c));
    }
    check("and a tip does not, because a tip is not a sale", !ON_SITE.has("tip"));
  }
  finish(mark);

  // -------------------------------------------------------------------------
  console.log("\n§ 3 — job_photos: a before photo stored, and the bytes come back");
  discovered++; attempted++;
  mark = failedAt();
  {
    const jobs = await svc(`/rest/v1/bookings?select=id&business_id=eq.${BIZ}`
      + `&deleted_at=is.null&status=eq.completed&order=start_at.desc&limit=1`);
    const bookingId = jobs.body?.[0]?.id;
    check("there is a finished job to hang the photo on", Boolean(bookingId), JSON.stringify(jobs.body).slice(0, 160));
    const path = `${BIZ}/${FOLDER}/${NONCE}.jpg`;

    // THE UPLOAD IS THE DETAILER'S SESSION AGAINST STORAGE RLS, which is the
    // half a unit test cannot reach: the policy only lets a member write under
    // their OWN business's folder.
    const up = await fetch(`${URL_}/storage/v1/object/job-photos/${path}`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${TOKEN}`, "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: JPEG,
    });
    check("the detailer's own session uploaded the file", up.status === 200, String(up.status));

    const made = await own("/rest/v1/job_photos", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        business_id: BIZ, booking_id: bookingId, kind: "before",
        path, bytes: JPEG.length, width: 1, height: 1, caption: `${TAG} ${NONCE}`,
      }),
    });
    keep("job-photo-row.json", made.body);
    check("and recorded it against the job", made.status === 201 && Boolean(made.body?.[0]?.id),
      `${made.status} ${JSON.stringify(made.body).slice(0, 160)}`);

    // CONSEQUENCE — the bucket is PRIVATE, so the only way to see the photo is
    // a signed URL. That is what the dashboard draws, and it is the leg that
    // would fail silently if the policy were wrong.
    const sign = await own(`/storage/v1/object/sign/job-photos/${path}`, {
      method: "POST", body: JSON.stringify({ expiresIn: 60 }),
    });
    const signed = sign.body?.signedURL;
    check("a signed link can be minted for it", Boolean(signed), JSON.stringify(sign.body).slice(0, 160));
    const got = signed ? await fetch(`${URL_}/storage/v1${signed}`) : { status: 0, arrayBuffer: async () => new ArrayBuffer(0) };
    const bytes = Buffer.from(await got.arrayBuffer());
    // SABOTAGE `wrongbytes`: compare against the image that was NOT uploaded.
    // Same length, one different byte — so a length check would not notice and
    // only a real comparison can.
    const wanted = BREAK === "wrongbytes" ? JPEG_OTHER : JPEG;
    check("the link serves the file", got.status === 200, String(got.status));
    check(`the ${JPEG.length} bytes that came back are the ones that went up`,
      bytes.equals(wanted), `${bytes.length} bytes, ${bytes.equals(JPEG) ? "same" : "different"} content`);
    // The private bucket must stay private, and this is the cheapest place to
    // say so out loud rather than assuming it.
    const openly = await fetch(`${URL_}/storage/v1/object/public/job-photos/${path}`);
    check("and the same path is NOT readable without the link", openly.status !== 200, String(openly.status));
  }
  finish(mark);

  // -------------------------------------------------------------------------
  console.log("\n§ 4 — gallery_images: a photo on the public site, fetched as a stranger");
  discovered++; attempted++;
  mark = failedAt();
  {
    const key = `${BIZ}/${FOLDER}/gallery-${NONCE}.jpg`;
    const up = await fetch(`${URL_}/storage/v1/object/business-media/${key}`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${TOKEN}`, "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: JPEG,
    });
    check("the detailer's own session uploaded the photo", up.status === 200, String(up.status));

    const publicUrl = `${URL_}/storage/v1/object/public/business-media/${key}`;
    const made = await own("/rest/v1/gallery_images", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ business_id: BIZ, kind: "single", image_url: publicUrl }),
    });
    keep("gallery-row.json", made.body);
    check("and put it in the gallery", made.status === 201 && Boolean(made.body?.[0]?.id),
      `${made.status} ${JSON.stringify(made.body).slice(0, 160)}`);

    // CONSEQUENCE — this bucket is public BY DESIGN (a logo has to load on a
    // booking page), so the proof is a signed-out fetch of the row's own URL.
    // SABOTAGE `wrongbytes` points it at a key nothing ever uploaded.
    const askFor = BREAK === "wrongbytes" ? publicUrl.replace(NONCE, `${NONCE}-never-uploaded`) : publicUrl;
    const seen = await fetch(askFor);
    const bytes = Buffer.from(await seen.arrayBuffer());
    check("a stranger can load the URL the row carries", seen.status === 200, `${seen.status} ${askFor.slice(-40)}`);
    check("and gets the photo that was uploaded", bytes.equals(JPEG), `${bytes.length} bytes`);
  }
  finish(mark);

  // -------------------------------------------------------------------------
  console.log("\n§ 5 — site_intake: the website questionnaire, answered and read back");
  discovered++; attempted++;
  mark = failedAt();
  {
    const answers = {
      A1: `${TAG} ${NONCE}`,
      "A1::n": "Written by the check, not by a person at a keyboard.",
      F3: ["Card", "Cash"],
    };
    const made = await own("/rest/v1/site_intake?on_conflict=business_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        business_id: BIZ, answers, step: 3, updated_at: new Date().toISOString(),
      }),
    });
    keep("site-intake-row.json", made.body);
    check("the detailer's own session saved the answers",
      (made.status === 200 || made.status === 201) && Boolean(made.body?.[0]),
      `${made.status} ${JSON.stringify(made.body).slice(0, 160)}`);

    // CONSEQUENCE — the form resumes where it was left, which is the whole
    // reason `step` and `answers` are stored rather than posted somewhere.
    const back = await own(`/rest/v1/site_intake?select=answers,step,submitted_at&business_id=eq.${BIZ}`);
    const row = back.body?.[0];
    check("it reads back the answer that was typed", row?.answers?.A1 === `${TAG} ${EXPECT_NONCE}`,
      String(row?.answers?.A1));
    check("a multi-choice answer survives as a list",
      Array.isArray(row?.answers?.F3) && row.answers.F3.length === 2, JSON.stringify(row?.answers?.F3));
    check("it resumes at the step they left", row?.step === 3, String(row?.step));
    // A HALF-ANSWERED DRAFT IS NOT A BRIEF, and the column exists to keep them
    // apart. Nothing here presses the last button, so it must still be null.
    check("and it is still a draft, not a submitted brief", row?.submitted_at === null, String(row?.submitted_at));
  }
  finish(mark);

  // -------------------------------------------------------------------------
  console.log("\n§ 6 — translations: the detailer's own words, reaching a Spanish customer");
  discovered++; attempted++;
  mark = failedAt();
  {
    // THE REAL ENDPOINT, NOT A DRY RUN. It sweeps the whole business, hashes
    // every string and asks DeepL (then Google) only for the gaps — so the
    // FIRST run spends characters and later runs spend none. That is why the
    // assertion below is about what a customer receives rather than about how
    // many rows this particular call wrote.
    const ran = await fn("translate-content", { lang: "es" });
    keep("translate-content.json", ran.body);
    check("translate-content answered", ran.status === 200 && ran.body?.ok === true,
      `${ran.status} ${JSON.stringify(ran.body).slice(0, 200)}`);
    check("no provider refused the work",
      Array.isArray(ran.body?.providers_refused) && ran.body.providers_refused.length === 0,
      JSON.stringify(ran.body?.providers_refused));

    const rows = await svc(`/rest/v1/translations?select=source_text,machine_text,lang`
      + `&business_id=eq.${BIZ}&lang=eq.es&limit=500`);
    const stored = Array.isArray(rows.body) ? rows.body : [];
    check("this business now has Spanish stored", stored.length > 0, `${stored.length} rows`);

    // CONSEQUENCE — the CUSTOMER'S OWN ENDPOINT. `book/core.js` calls
    // `get_business_translations(slug, lang)` from a signed-out page; that is
    // the only path by which any of this reaches a person.
    // SABOTAGE `english`: ask for `en`, which is the key the SOURCE is stored
    // under, so the table has nothing to answer with and the customer gets the
    // detailer's English. It changes which language is compared, not how
    // loosely — and every assertion below has to notice.
    const lang = BREAK === "english" ? "en" : "es";
    const table = await anon("/rest/v1/rpc/get_business_translations", {
      method: "POST", body: JSON.stringify({ p_slug: SLUG, p_lang: lang }),
    });
    const map = (table.body && typeof table.body === "object") ? table.body : {};
    const pairs = Object.entries(map).filter(([k, v]) => typeof v === "string" && v && v !== k);
    keep("customer-spanish.json", { asked: lang, entries: Object.keys(map).length, sample: pairs.slice(0, 6) });
    check(`a signed-out customer asking for "${lang}" gets a table back`,
      Object.keys(map).length > 0, `${Object.keys(map).length} entries`);
    check("and at least one of the detailer's sentences is not English any more",
      pairs.length > 0, `${pairs.length} differ from the source`);
    // WE TRANSLATE WHAT A BUSINESS SAYS, NEVER WHAT IT IS CALLED. The database
    // refuses such a row outright; this says so on the customer's side too.
    check("the business's NAME was not translated",
      !Object.prototype.hasOwnProperty.call(map, "Coastline Auto Detailing"),
      "the name is in the customer's table");
  }
  finish(mark);

  // -------------------------------------------------------------------------
  console.log("\n§ 7 — THE CANARY: a signed-out stranger must not be able to write any of this");
  // NOT A TARGET. This is the negative control, and it is the one that decides
  // whether anything above is EVIDENCE. Every row this check created is
  // offered as proof that THE DETAILER did it — which means nothing if the
  // same insert works with no session at all. If a stranger can write the
  // table, the six greens above prove only that the columns exist.
  {
    const asStranger = await anon("/rest/v1/dropoff_only_periods", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        business_id: BIZ, start_date: "2026-12-24", end_date: "2026-12-24",
        mode: "dropoff", reason: `${TAG} CANARY ${NONCE}`,
      }),
    });
    keep("canary-stranger-write.json", { status: asStranger.status, body: asStranger.body });
    // SABOTAGE `canary`: stand in a product whose tables are open to anybody.
    // The canary then reports that it did not fail, and `receipt.mjs` refuses
    // the whole run — every green target beside a blind canary is worthless.
    const strangerGotIn = BREAK === "canary" ? true : asStranger.status < 300;
    canary.observed_failure = !strangerGotIn;
    console.log(canary.observed_failure
      ? `  ok    the stranger was refused (${asStranger.status}) — so the rows above are the detailer's own`
      : `  FAIL  a signed-out stranger wrote the row (${asStranger.status}) — nothing above proves who did it`);
    if (!canary.observed_failure) {
      failures.push("the canary passed: a signed-out stranger could write a feature's row");
      // Do not leave a stranger's row behind if one really got in.
      await svc(`/rest/v1/dropoff_only_periods?reason=like.${encodeURIComponent(TAG + " CANARY%")}`,
        { method: "DELETE" });
    }
  }
} catch (err) {
  failures.push(`the run stopped: ${err.message}`);
  console.error(`\n  FAIL  ${err.message}`);
}

// ---------------------------------------------------------------------------
// WHAT THE TABLES SAY NOW. The whole item is a row count, so the receipt
// carries the before and after rather than a sentence about them.
const after = {};
for (const t of Object.keys(before)) {
  const r = await fetch(`${URL_}/rest/v1/${t}?select=*`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Prefer: "count=exact", Range: "0-0" },
  });
  after[t] = Number((r.headers.get("content-range") || "*/0").split("/")[1]) || 0;
}
keep("row-counts-after.json", after);
console.log("\n  after   " + Object.entries(after).map(([k, v]) => `${k}=${v}`).join("  "));
for (const [t, n] of Object.entries(after)) {
  assertions++;
  if (n > 0) console.log(`  ok    ${t} is no longer empty (${n})`);
  else { failures.push(`${t} is still at zero rows`); console.error(`  FAIL  ${t} is still at zero rows`); }
}

const status = failures.length === 0 && completed === expected_targets ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "e2e-ten-features",
  started_at,
  status,
  expected_targets,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  // Declared here and held to it. 30 is what a clean run executes; lowering it
  // is a visible diff somebody has to justify.
  min_assertions: 37,
  failures,
  artifacts,
  warnings: BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`, ...warnings] : warnings,
  dimensions: {
    business: BIZ,
    nonce: NONCE,
    rows_before: before,
    rows_after: after,
    // The four of the ten this file does not cover, named in the receipt so a
    // reader cannot mistake six for ten.
    not_covered: ["platform_subscriptions", "platform_invoices", "owner_push_subscriptions"],
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expected_targets} targets, ${assertions} assertions, `
  + `${failures.length} failure(s). Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
