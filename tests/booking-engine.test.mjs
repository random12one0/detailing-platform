// Phase 2 booking-engine test suite — exercises the DEPLOYED edge functions
// against the live platform project. Run after every engine or schema change:
//
//   node tests/booking-engine.test.mjs
//
// Covers the Phase 2 brief's required tests:
//   * two businesses' settings are independent (buffer change on one never
//     affects the other's availability — verified through the live engine)
//   * emails route to the correct business's owner with the correct
//     Reply-To and never reference the other business
//   * a booking created through the dashboard (member JWT) is subject to
//     the same validation as a customer booking
//   * uploaded photos are scoped to the correct business
// plus: pricing double-validation, promo scoping, cancel/reschedule windows.

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
let ANON = process.env.SUPABASE_ANON_KEY;

if (!URL_ || !SERVICE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!ANON) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` } },
  );
  const keys = await res.json();
  ANON = keys.find((k) => k.name === "anon")?.api_key ?? keys.find((k) => k.type === "publishable")?.api_key;
}

let passed = 0, failed = 0;
function check(name, cond, detail = "") {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name} ${detail}`); }
}

async function rest(method, pathname, { key = SERVICE, jwt, body, headers = {} } = {}) {
  const res = await fetch(`${URL_}${pathname}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${jwt ?? key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
const svc = {
  get: (p) => rest("GET", p),
  post: (p, b) => rest("POST", p, { body: b }),
  patch: (p, b) => rest("PATCH", p, { body: b }),
  del: (p) => rest("DELETE", p),
};

// Edge function caller (anon apikey, like the public site).
async function fn(name, body, jwt) {
  const res = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

async function ensureUser(email, password) {
  await rest("POST", "/auth/v1/admin/users", { body: { email, password, email_confirm: true } });
  const signin = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await signin.json();
  if (!session.access_token) throw new Error(`sign-in failed for ${email}: ${JSON.stringify(session)}`);
  return { id: session.user.id, jwt: session.access_token };
}

// A date guaranteed far in the future but inside any test horizon: N days out.
const daysOut = (n) => {
  const d = new Date(Date.now() + n * 86400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

console.log("setup: two businesses with services, hours, promos");

const PASSWORD = "Phase2-engine-test-pw!";
const userA = await ensureUser("phase2-owner-a@engine.test", PASSWORD);
const userB = await ensureUser("phase2-owner-b@engine.test", PASSWORD);

await svc.del("/rest/v1/businesses?slug=in.(engine-a,engine-b)");
const bizRes = await svc.post("/rest/v1/businesses", [
  {
    slug: "engine-a", name: "Engine Test Detailing A", timezone: "America/Los_Angeles",
    contact_email: "owner-a@engine.test", contact_phone: "555-0001", dropoff_address: "1 A St, Los Angeles, CA",
  },
  {
    slug: "engine-b", name: "Engine Test Detailing B", timezone: "America/New_York",
    contact_email: "owner-b@engine.test", contact_phone: "555-0002", dropoff_address: "2 B Ave, New York, NY",
  },
]);
const A = bizRes.data.find((b) => b.slug === "engine-a");
const B = bizRes.data.find((b) => b.slug === "engine-b");
await svc.post("/rest/v1/business_users", [
  { business_id: A.id, user_id: userA.id, role: "owner" },
  { business_id: B.id, user_id: userB.id, role: "owner" },
]);
await svc.post("/rest/v1/business_settings", [
  { business_id: A.id, slot_interval_minutes: 30, buffer_minutes: 60 },
  { business_id: B.id, slot_interval_minutes: 60, buffer_minutes: 60 },
]);
// Open every day 08:00-18:00 for both.
await svc.post(
  "/rest/v1/business_hours",
  [0, 1, 2, 3, 4, 5, 6].flatMap((wd) => [
    { business_id: A.id, weekday: wd, open_time: "08:00", close_time: "18:00" },
    { business_id: B.id, weekday: wd, open_time: "08:00", close_time: "18:00" },
  ]),
);
const svcRes = await svc.post("/rest/v1/services", [
  { business_id: A.id, name: "Full Detail A", price: 150, duration_minutes: 120 },
  { business_id: B.id, name: "Full Detail B", price: 150, duration_minutes: 120 },
]);
const serviceA = svcRes.data.find((s) => s.business_id === A.id);
const serviceB = svcRes.data.find((s) => s.business_id === B.id);
const addOnRes = await svc.post("/rest/v1/add_ons", [
  { business_id: A.id, name: "Wax A", price: 25, duration_minutes: 0 },
]);
const addOnA = addOnRes.data[0];
await svc.post("/rest/v1/promo_codes", [
  { business_id: A.id, code: "SUMMER10", type: "percentage", value: 10 },
  { business_id: B.id, code: "SUMMER10", type: "percentage", value: 20 },
]);

const D1 = daysOut(20); // clear day
const D2 = daysOut(21); // booking-conflict day
const D3 = daysOut(22); // cancel/reschedule day
const D4 = daysOut(23); // W4 restricted-day tests
const D5 = daysOut(24); // 2.8b category-cap and resource tests

// ---------------------------------------------------------------------------
console.log("test 1: per-business slot grid (interval 30 vs 60)");
{
  const a = await fn("available-slots", { business_slug: "engine-a", booking_date: D1, duration_minutes: 120 });
  const b = await fn("available-slots", { business_slug: "engine-b", booking_date: D1, duration_minutes: 120 });
  // 08:00..16:00 inclusive: 17 starts at 30-min steps, 9 at 60-min steps.
  check("A has 30-min grid (17 slots)", a.data?.slots?.length === 17, JSON.stringify(a.data));
  check("B has 60-min grid (9 slots)", b.data?.slots?.length === 9, JSON.stringify(b.data));
  check("unknown business → 404", (await fn("available-slots", { business_slug: "nope", booking_date: D1, duration_minutes: 60 })).status === 404);
}

// ---------------------------------------------------------------------------
console.log("test 2: customer booking — server-side pricing, client prices ignored");
let bookingA1;
{
  const r = await fn("create-booking", {
    business_slug: "engine-a",
    customer_name: "Cust One", customer_phone: "555-1001", customer_email: "cust1@engine.test",
    customer_address: "9 Elm St", service_type: "mobile", vehicle_size: "medium", vehicle_model: "Civic",
    service_ids: [serviceA.id], add_ons: [addOnA.id],
    booking_date: D1, start_time: "10:00",
    applied_promo_code: "SUMMER10",
    total_price: 1, subtotal: 1, promo_discount: 999, // forged client prices — must be ignored
  });
  bookingA1 = r.data?.booking;
  check("booking created", r.status === 200 && !!bookingA1?.id, JSON.stringify(r.data));
  // 150 + 15 (medium) + 25 add-on = 190 → 10% promo = 19 → 171 → round $5 → 170
  check("server-computed price (170, forged prices ignored)", bookingA1?.total_price === 170, String(bookingA1?.total_price));
  const row = await svc.get(`/rest/v1/bookings?id=eq.${bookingA1.id}&select=total_price,promo_discount,vehicle_size_fee,business_id`);
  check("stored promo discount is server's (19)", Number(row.data?.[0]?.promo_discount) === 19, JSON.stringify(row.data));
  check("stored size fee from service adjustments (15)", Number(row.data?.[0]?.vehicle_size_fee) === 15);
  const snap = await svc.get(`/rest/v1/booking_services?booking_id=eq.${bookingA1.id}&select=name_at_booking,price_at_booking`);
  check("service snapshot stored", snap.data?.[0]?.name_at_booking === "Full Detail A" && Number(snap.data?.[0]?.price_at_booking) === 165, JSON.stringify(snap.data));
}

console.log("test 3: same promo code, different business → different discount");
{
  const r = await fn("create-booking", {
    business_slug: "engine-b",
    customer_name: "Cust Two", customer_phone: "555-1002", customer_email: "cust2@engine.test",
    service_type: "dropoff", vehicle_size: "medium",
    service_ids: [serviceB.id], booking_date: D1, start_time: "10:00",
    applied_promo_code: "SUMMER10",
  });
  // 150 + 15 = 165 → 20% = 33 → 132 → round $5 → 130
  check("B's SUMMER10 gives 20% (total 130)", r.data?.booking?.total_price === 130, JSON.stringify(r.data));
}

// ---------------------------------------------------------------------------
console.log("test 4: double validation — submit re-checks what display hid");
{
  const outsideHours = await fn("create-booking", {
    business_slug: "engine-a", customer_name: "X", customer_phone: "555-1003", customer_email: "x@engine.test",
    service_type: "mobile", vehicle_size: "small", service_ids: [serviceA.id],
    booking_date: D1, start_time: "19:00",
  });
  check("outside hours → 409", outsideHours.status === 409, `${outsideHours.status} ${JSON.stringify(outsideHours.data)}`);

  const runsPastClose = await fn("create-booking", {
    business_slug: "engine-a", customer_name: "X", customer_phone: "555-1003", customer_email: "x@engine.test",
    service_type: "mobile", vehicle_size: "small", service_ids: [serviceA.id],
    booking_date: D1, start_time: "17:00", // 120min service ends 19:00 > 18:00 close
  });
  check("runs past close → 409", runsPastClose.status === 409, `${runsPastClose.status}`);

  const inBuffer = await fn("create-booking", {
    business_slug: "engine-a", customer_name: "X", customer_phone: "555-1004", customer_email: "x2@engine.test",
    service_type: "mobile", vehicle_size: "small", service_ids: [serviceA.id],
    booking_date: D1, start_time: "12:30", // A1 runs 10:00-12:15 (135min); buffer 60 → blocked until 13:15
  });
  check("inside buffer → 409", inBuffer.status === 409, `${inBuffer.status} ${JSON.stringify(inBuffer.data)}`);

  const badService = await fn("create-booking", {
    business_slug: "engine-a", customer_name: "X", customer_phone: "555-1005", customer_email: "x3@engine.test",
    service_type: "mobile", vehicle_size: "small", service_ids: [serviceB.id], // B's service on A's site
    booking_date: D1, start_time: "15:00",
  });
  check("another business's service id → 400", badService.status === 400, `${badService.status}`);
}

console.log("test 5: dashboard booking passes the SAME validation");
{
  const adminOutsideHours = await fn(
    "create-booking",
    {
      business_slug: "engine-a", customer_name: "Via Dashboard", customer_phone: "555-1006",
      service_type: "mobile", vehicle_size: "small", service_ids: [serviceA.id],
      booking_date: D2, start_time: "19:00", admin_notes: "phone booking",
    },
    userA.jwt,
  );
  check("admin outside hours → same 409", adminOutsideHours.status === 409, `${adminOutsideHours.status}`);

  const adminOk = await fn(
    "create-booking",
    {
      business_slug: "engine-a", customer_name: "Via Dashboard", customer_phone: "555-1006",
      service_type: "mobile", vehicle_size: "small", service_ids: [serviceA.id],
      booking_date: D2, start_time: "09:00", admin_notes: "phone booking",
    },
    userA.jwt,
  );
  check("admin in-hours booking (no email needed) → ok", adminOk.status === 200, JSON.stringify(adminOk.data));
  const row = await svc.get(`/rest/v1/bookings?id=eq.${adminOk.data?.booking?.id}&select=admin_notes`);
  check("admin_notes stored for member call", row.data?.[0]?.admin_notes === "phone booking");
}

// ---------------------------------------------------------------------------
console.log("test 6: buffer independence through the live engine");
{
  // Both businesses booked D2 10:00-12:00 local. (A already has 09:00-11:00
  // from test 5 — use B for the clean comparison and A for the change.)
  await fn("create-booking", {
    business_slug: "engine-b", customer_name: "Buf B", customer_phone: "555-1007", customer_email: "bufb@engine.test",
    service_type: "dropoff", vehicle_size: "small", service_ids: [serviceB.id],
    booking_date: D2, start_time: "13:00",
  });
  const bBefore = await fn("available-slots", { business_slug: "engine-b", booking_date: D2, duration_minutes: 60 });

  // Drop A's buffer to 0 (as A's owner, through RLS).
  const patch = await rest("PATCH", `/rest/v1/business_settings?business_id=eq.${A.id}`, {
    key: ANON, jwt: userA.jwt, body: { buffer_minutes: 0 },
  });
  check("A owner can change A buffer", patch.status === 200 && patch.data?.length === 1, `${patch.status}`);

  const aAfter = await fn("available-slots", { business_slug: "engine-a", booking_date: D2, duration_minutes: 60 });
  // A booked 09:00-11:00; buffer 0 closed-bounds → 11:30 is free.
  check("A: slot just after booking now offered (11:30)", aAfter.data?.slots?.includes("11:30"), JSON.stringify(aAfter.data?.slots));

  const bAfter = await fn("available-slots", { business_slug: "engine-b", booking_date: D2, duration_minutes: 60 });
  check(
    "B's availability unchanged by A's buffer change",
    JSON.stringify(bBefore.data?.slots) === JSON.stringify(bAfter.data?.slots),
    `${JSON.stringify(bBefore.data?.slots)} vs ${JSON.stringify(bAfter.data?.slots)}`,
  );
  // B booked 13:00-15:00 EST with buffer 60 → 14:00 blocked for B.
  check("B: buffered slot still hidden (14:00)", !bAfter.data?.slots?.includes("14:00"), JSON.stringify(bAfter.data?.slots));

  await rest("PATCH", `/rest/v1/business_settings?business_id=eq.${A.id}`, { key: ANON, jwt: userA.jwt, body: { buffer_minutes: 60 } });
}

// ---------------------------------------------------------------------------
console.log("test 7: min/max advance from settings");
{
  await rest("PATCH", `/rest/v1/business_settings?business_id=eq.${A.id}`, {
    key: ANON, jwt: userA.jwt, body: { min_advance_minutes: 40 * 24 * 60 }, // 40 days
  });
  const tooSoon = await fn("create-booking", {
    business_slug: "engine-a", customer_name: "X", customer_phone: "555-1008", customer_email: "x4@engine.test",
    service_type: "mobile", vehicle_size: "small", service_ids: [serviceA.id],
    booking_date: daysOut(30), start_time: "09:00",
  });
  check("30 days out rejected under a 40-day minimum", tooSoon.status === 409, `${tooSoon.status}`);
  await rest("PATCH", `/rest/v1/business_settings?business_id=eq.${A.id}`, { key: ANON, jwt: userA.jwt, body: { min_advance_minutes: 120 } });

  await rest("PATCH", `/rest/v1/business_settings?business_id=eq.${B.id}`, {
    key: ANON, jwt: userB.jwt, body: { max_advance_days: 5 },
  });
  const tooFar = await fn("create-booking", {
    business_slug: "engine-b", customer_name: "X", customer_phone: "555-1009", customer_email: "x5@engine.test",
    service_type: "dropoff", vehicle_size: "small", service_ids: [serviceB.id],
    booking_date: daysOut(30), start_time: "09:00",
  });
  check("30 days out rejected under a 5-day maximum", tooFar.status === 409, `${tooFar.status}`);
  const range = await fn("available-slots", { business_slug: "engine-b", booking_date: daysOut(30), duration_minutes: 60 });
  check("display agrees (day shows zero slots)", range.data?.slots?.length === 0, JSON.stringify(range.data));
  await rest("PATCH", `/rest/v1/business_settings?business_id=eq.${B.id}`, { key: ANON, jwt: userB.jwt, body: { max_advance_days: null } });
}

// ---------------------------------------------------------------------------
console.log("test 8: cancel & reschedule honor the cancellation window");
let bookingA3;
{
  const r = await fn("create-booking", {
    business_slug: "engine-a", customer_name: "Mover", customer_phone: "555-1010", customer_email: "mover@engine.test",
    service_type: "mobile", vehicle_size: "small", service_ids: [serviceA.id],
    booking_date: D3, start_time: "10:00",
  });
  bookingA3 = r.data?.booking;
  check("fixture booking created", !!bookingA3?.id, JSON.stringify(r.data));

  // Window bigger than the lead time → cancellation must be refused.
  await rest("PATCH", `/rest/v1/business_settings?business_id=eq.${A.id}`, {
    key: ANON, jwt: userA.jwt, body: { cancellation_window_hours: 24 * 60 }, // 60 days
  });
  const refused = await fn("cancel-booking", { booking_id: bookingA3.id });
  check("cancel inside window → 409 with call-us message", refused.status === 409 && /call|contact/i.test(refused.data?.error || ""), JSON.stringify(refused.data));
  const refusedMove = await fn("reschedule-booking", { booking_id: bookingA3.id, booking_date: D3, start_time: "15:00" });
  check("reschedule inside window → 409", refusedMove.status === 409, `${refusedMove.status}`);

  await rest("PATCH", `/rest/v1/business_settings?business_id=eq.${A.id}`, {
    key: ANON, jwt: userA.jwt, body: { cancellation_window_hours: 24 },
  });
  const moved = await fn("reschedule-booking", { booking_id: bookingA3.id, booking_date: D3, start_time: "15:00" });
  check("reschedule outside window → ok", moved.status === 200 && moved.data?.booking?.start_time === "15:00", JSON.stringify(moved.data));
  const movedBad = await fn("reschedule-booking", { booking_id: bookingA3.id, booking_date: D3, start_time: "19:00" });
  check("reschedule to invalid slot → 409", movedBad.status === 409, `${movedBad.status}`);
  const cancelled = await fn("cancel-booking", { booking_id: bookingA3.id });
  check("cancel outside window → ok", cancelled.status === 200 && cancelled.data?.booking?.status === "cancelled", JSON.stringify(cancelled.data));
  const freed = await fn("available-slots", { business_slug: "engine-a", booking_date: D3, duration_minutes: 120 });
  check("cancelled slot frees up", freed.data?.slots?.includes("15:00"), JSON.stringify(freed.data?.slots));
}

// ---------------------------------------------------------------------------
console.log("test 9: email addressing routes per business, never cross-tenant");
{
  const m = await import("../supabase/functions/_shared/emailTemplates.ts");
  const brandOf = (biz) => ({
    businessId: biz.id, slug: biz.slug, brandName: biz.name,
    contactEmail: biz.contact_email, contactPhone: biz.contact_phone,
    dropoffAddress: biz.dropoff_address, siteUrl: `https://detailplatform.com/${biz.slug}`,
    primaryColor: "#111827", headerInk: "#ffffff", accentColor: "#0b7caf",
    googleReviewUrl: null, yelpReviewUrl: null, paymentMethodsLine: null,
  });
  const aAddr = m.buildAddressing(brandOf(A), "bookings@detailplatform.com");
  const bAddr = m.buildAddressing(brandOf(B), "bookings@detailplatform.com");
  check("A mail replies to A's owner", aAddr.replyTo === "owner-a@engine.test" && aAddr.ownerTo === "owner-a@engine.test");
  check("B mail replies to B's owner", bAddr.replyTo === "owner-b@engine.test");
  check("display names carry each brand", aAddr.from.includes("Engine Test Detailing A") && bAddr.from.includes("Engine Test Detailing B"));

  const data = {
    id: "x", customerName: "C", customerPhone: "5", customerEmail: "c@x.com", customerAddress: null,
    dateStr: D1, startTime: "10:00", endTime: "12:00", serviceType: "dropoff", vehicleSize: "small",
    vehicleModel: null, customerNotes: null, serviceNames: ["S"], addOnNames: [], subtotal: 1,
    siteDiscount: 0, siteDiscountPercent: 0, promoCode: null, promoDiscount: 0, total: 1,
    receiptUrl: "https://detailplatform.com/engine-a/booking/x",
  };
  const aMail = m.customerConfirmationEmail(brandOf(A), data).html;
  check("A's email never mentions B", !aMail.includes("Engine Test Detailing B") && !aMail.includes("owner-b@engine.test") && !aMail.includes("2 B Ave"));
  check("A's email shows A's drop-off address", aMail.includes("1 A St, Los Angeles, CA"));
}

// ---------------------------------------------------------------------------
console.log("test 10: photo uploads are scoped to the correct business");
{
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
  const upload = (jwt, key) =>
    fetch(`${URL_}/storage/v1/object/business-media/${key}`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "image/png" },
      body: png,
    });

  const own = await upload(userA.jwt, `${A.id}/gallery/test.png`);
  check("A can upload into A's folder", own.status === 200, `${own.status} ${await own.text().catch(() => "")}`);
  const cross = await upload(userA.jwt, `${B.id}/gallery/sneaky.png`);
  check("A cannot upload into B's folder", cross.status === 403 || cross.status === 400, `${cross.status}`);
  const anonUp = await fetch(`${URL_}/storage/v1/object/business-media/${A.id}/gallery/anon.png`, {
    method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "image/png" }, body: png,
  });
  check("anon cannot upload at all", anonUp.status === 403 || anonUp.status === 400, `${anonUp.status}`);
  const pub = await fetch(`${URL_}/storage/v1/object/public/business-media/${A.id}/gallery/test.png`);
  check("uploaded photo is publicly viewable", pub.status === 200, `${pub.status}`);
}

// ---------------------------------------------------------------------------
console.log("test 11: member gates on admin functions");
{
  const noAuth = await fn("update-booking", { booking_id: bookingA1.id, admin_notes: "hax" });
  check("update-booking without JWT → 401", noAuth.status === 401, `${noAuth.status}`);
  const crossTenant = await fn("update-booking", { booking_id: bookingA1.id, admin_notes: "hax" }, userB.jwt);
  check("B's owner cannot edit A's booking", crossTenant.status === 404 || crossTenant.status === 401, `${crossTenant.status} ${JSON.stringify(crossTenant.data)}`);
  const ok = await fn("update-booking", { booking_id: bookingA1.id, admin_notes: "legit note" }, userA.jwt);
  check("A's owner can edit A's booking", ok.status === 200 && ok.data?.booking?.admin_notes === "legit note", JSON.stringify(ok.data));
  const softDel = await fn("update-booking", { booking_id: bookingA1.id, soft_delete: true }, userA.jwt);
  check("soft delete sets deleted_at", softDel.status === 200 && !!softDel.data?.booking?.deleted_at);
  const still = await svc.get(`/rest/v1/bookings?id=eq.${bookingA1.id}&select=id,deleted_at`);
  check("soft-deleted row still exists", still.data?.length === 1 && !!still.data[0].deleted_at);
}

// ---------------------------------------------------------------------------
console.log("test 12: a day restricted to one service type refuses the other");
// Roadmap 2.7, W4. This was a live hole rather than a new rule:
// dropoff_only_periods reached the customer as a NOTE on the booking page and
// nothing on the way in ever read the table, so "this day is drop-off only"
// could be read and then ignored. The guard is in _shared/slotValidation.ts,
// which is where create-, reschedule- and update-booking all meet.
{
  const book = (type) => fn("create-booking", {
    business_slug: "engine-a", customer_name: "Mode Check", customer_phone: "555-0900",
    customer_email: "mode@engine.test", customer_address: "9 Test St", service_type: type,
    vehicle_size: "small", service_ids: [serviceA.id], add_ons: [],
    booking_date: D4, start_time: "10:00",
  });
  const clear = () => svc.del(`/rest/v1/bookings?business_id=eq.${A.id}&customer_phone=eq.555-0900`);
  const restrict = async (mode) => {
    await svc.del(`/rest/v1/dropoff_only_periods?business_id=eq.${A.id}&start_date=eq.${D4}`);
    if (mode) {
      await svc.post("/rest/v1/dropoff_only_periods",
        [{ business_id: A.id, start_date: D4, end_date: D4, mode }]);
    }
    await clear();
  };

  await restrict("dropoff");
  const slotsD = await fn("available-slots", { business_slug: "engine-a", booking_date: D4, duration_minutes: 120 });
  check("drop-off day reports dropoff_only", slotsD.data?.dropoff_only === true, JSON.stringify(slotsD.data));
  check("drop-off day does not report mobile_only", slotsD.data?.mobile_only === false);
  const m1 = await book("mobile"); await clear();
  check("mobile booking on a drop-off day -> 409", m1.status === 409, `${m1.status} ${JSON.stringify(m1.data)}`);
  const d1 = await book("dropoff"); await clear();
  check("drop-off booking on a drop-off day -> 200", d1.status === 200, `${d1.status} ${JSON.stringify(d1.data)}`);

  // The other direction is the half W4 added: a detailer whose unit is shut.
  await restrict("mobile");
  const slotsM = await fn("available-slots", { business_slug: "engine-a", booking_date: D4, duration_minutes: 120 });
  check("mobile-only day reports mobile_only", slotsM.data?.mobile_only === true, JSON.stringify(slotsM.data));
  const d2 = await book("dropoff"); await clear();
  check("drop-off booking on a mobile-only day -> 409", d2.status === 409, `${d2.status} ${JSON.stringify(d2.data)}`);
  const m2 = await book("mobile"); await clear();
  check("mobile booking on a mobile-only day -> 200", m2.status === 200, `${m2.status} ${JSON.stringify(m2.data)}`);

  // And with nothing set, both work, so the guard is not just refusing.
  await restrict(null);
  const free = await book("mobile"); await clear();
  check("unrestricted day still takes a mobile booking", free.status === 200, `${free.status}`);
}

// ---------------------------------------------------------------------------
console.log("test 13: a category's max_select is enforced on the server");
// Roadmap 2.8b, W25. The booking page applies the same rule as a courtesy —
// picking a second service in a "choose one" category swaps the first out —
// but a rule that lives only in React is a rule a stale tab, a second window
// or a hand-made request walks past. W4 (test 12) found a live hole of exactly
// that shape, which is why this one has a test on the way in.
{
  const [pickOne] = (await svc.post("/rest/v1/service_groups",
    [{ business_id: A.id, name: "Exclusive A", sort_order: 0, max_select: 1 }])).data;
  const [pickAny] = (await svc.post("/rest/v1/service_groups",
    [{ business_id: A.id, name: "Open A", sort_order: 1, max_select: null }])).data;
  const made = (await svc.post("/rest/v1/services", [
    { business_id: A.id, name: "Excl One", price: 40, duration_minutes: 30, group_id: pickOne.id },
    { business_id: A.id, name: "Excl Two", price: 50, duration_minutes: 30, group_id: pickOne.id },
    { business_id: A.id, name: "Open One", price: 20, duration_minutes: 30, group_id: pickAny.id },
    { business_id: A.id, name: "Open Two", price: 20, duration_minutes: 30, group_id: pickAny.id },
  ])).data;
  const id = (n) => made.find((x) => x.name === n).id;
  const book = (ids) => fn("create-booking", {
    business_slug: "engine-a", customer_name: "Cap Check", customer_phone: "555-0901",
    customer_email: "cap@engine.test", customer_address: "9 Test St", service_type: "mobile",
    vehicle_size: "small", service_ids: ids, add_ons: [], booking_date: D5, start_time: "10:00",
  });
  const clear = () => svc.del(`/rest/v1/bookings?business_id=eq.${A.id}&customer_phone=eq.555-0901`);

  const two = await book([id("Excl One"), id("Excl Two")]); await clear();
  check("two from a pick-one category -> 409", two.status === 409, `${two.status} ${JSON.stringify(two.data)}`);
  check("the refusal names the category", /Exclusive A/.test(two.data?.error ?? ""), two.data?.error);

  const one = await book([id("Excl One")]); await clear();
  check("one from a pick-one category -> 200", one.status === 200, `${one.status} ${JSON.stringify(one.data)}`);

  const many = await book([id("Open One"), id("Open Two")]); await clear();
  check("two from a pick-any category -> 200", many.status === 200, `${many.status} ${JSON.stringify(many.data)}`);

  // One from each is the owner's own menu shape, and the whole reason the rule
  // lives on the category rather than on the business.
  const each = await book([id("Excl One"), id("Open One")]); await clear();
  check("one from each category -> 200", each.status === 200, `${each.status} ${JSON.stringify(each.data)}`);

  for (const n of ["Excl One", "Excl Two", "Open One", "Open Two"]) {
    await svc.del(`/rest/v1/services?id=eq.${id(n)}`);
  }
  await svc.del(`/rest/v1/service_groups?business_id=eq.${A.id}`);
}

// ---------------------------------------------------------------------------
console.log("test 14: a REQUIRED resource blocks the booking on the server");
// Roadmap 2.8b, W22 — his own ask: "an option that blocks the booking if the
// customer can't supply what that detailer needs." The guard is in
// _shared/slotValidation.ts beside W4's, because that is where create-,
// reschedule- and update-booking meet. 'ask' must NOT block: knowing what to
// load in the van is the point, and a detailer who turns asking on would
// otherwise start refusing half their customers.
{
  const setNeed = (water, power) => svc.patch(
    `/rest/v1/business_settings?business_id=eq.${A.id}`,
    { water_requirement: water, power_requirement: power },
  );
  const book = (extra) => fn("create-booking", {
    business_slug: "engine-a", customer_name: "Tap Check", customer_phone: "555-0902",
    customer_email: "tap@engine.test", customer_address: "9 Test St", service_type: "mobile",
    vehicle_size: "small", service_ids: [serviceA.id], add_ons: [],
    booking_date: D5, start_time: "14:00", ...extra,
  });
  const clear = () => svc.del(`/rest/v1/bookings?business_id=eq.${A.id}&customer_phone=eq.555-0902`);

  await setNeed("required", "ask");
  const noWater = await book({ has_water: false, has_power: true }); await clear();
  check("required water, answered no -> 409", noWater.status === 409, `${noWater.status} ${JSON.stringify(noWater.data)}`);

  const yesWater = await book({ has_water: true, has_power: false }); await clear();
  check("required water, answered yes -> 200 (power only asked)", yesWater.status === 200, `${yesWater.status} ${JSON.stringify(yesWater.data)}`);

  await setNeed("ask", "ask");
  const asked = await book({ has_water: false, has_power: false }); await clear();
  check("merely asked, answered no -> 200", asked.status === 200, `${asked.status} ${JSON.stringify(asked.data)}`);

  // Drop-off is never blocked: the customer supplies nothing, the detailer is
  // standing in their own shop.
  await setNeed("required", "required");
  const drop = await book({ service_type: "dropoff", has_water: false, has_power: false }); await clear();
  check("drop-off ignores the resource rule -> 200", drop.status === 200, `${drop.status} ${JSON.stringify(drop.data)}`);

  // And the answers are stored as two facts, not one — which is the whole
  // point of splitting has_water_electric.
  await setNeed("ask", "ask");
  const stored = await book({ has_water: true, has_power: false });
  const row = await svc.get(`/rest/v1/bookings?id=eq.${stored.data?.booking?.id}&select=has_water,has_power,vehicle_size_label`);
  check("has_water and has_power stored separately",
    row.data?.[0]?.has_water === true && row.data?.[0]?.has_power === false, JSON.stringify(row.data));
  // W9's snapshot: a detailer who renames a size must not corrupt the record
  // of jobs already done.
  check("the vehicle size LABEL is snapshotted",
    typeof row.data?.[0]?.vehicle_size_label === "string" && row.data[0].vehicle_size_label.length > 0,
    JSON.stringify(row.data));
  await clear();
}

// ---------------------------------------------------------------------------
console.log("test 15: a category that IS the whole booking");
// Roadmap 2.8c, and the owner asked for it. `max_select` counts inside ONE
// category, so a complete package alone in its own category never trips it
// while the customer also buys the parts from the next category along. A real
// menu (Oregon Detail Co) made that concrete: $1,645 booked for work a $625
// package already contained, reproduced on the running app before this existed.
{
  const [pkg] = (await svc.post("/rest/v1/service_groups",
    [{ business_id: A.id, name: "Complete A", sort_order: 0, max_select: 1, is_exclusive: true }])).data;
  const [part] = (await svc.post("/rest/v1/service_groups",
    [{ business_id: A.id, name: "Parts A", sort_order: 1, max_select: 1, is_exclusive: false }])).data;
  const made = (await svc.post("/rest/v1/services", [
    { business_id: A.id, name: "The Lot", price: 625, duration_minutes: 30, group_id: pkg.id },
    { business_id: A.id, name: "Just Inside", price: 320, duration_minutes: 30, group_id: part.id },
  ])).data;
  const id = (n) => made.find((x) => x.name === n).id;
  const book = (ids) => fn("create-booking", {
    business_slug: "engine-a", customer_name: "Excl Check", customer_phone: "555-0903",
    customer_email: "excl@engine.test", customer_address: "9 Test St", service_type: "mobile",
    vehicle_size: "small", service_ids: ids, add_ons: [], booking_date: D5, start_time: "11:00",
  });
  const clear = () => svc.del(`/rest/v1/bookings?business_id=eq.${A.id}&customer_phone=eq.555-0903`);

  const both = await book([id("The Lot"), id("Just Inside")]); await clear();
  check("the package plus a part -> 409", both.status === 409, `${both.status} ${JSON.stringify(both.data)}`);
  check("the refusal names the category", /Complete A/.test(both.data?.error ?? ""), both.data?.error);

  const alone = await book([id("The Lot")]); await clear();
  check("the package on its own -> 200", alone.status === 200, `${alone.status} ${JSON.stringify(alone.data)}`);

  const partOnly = await book([id("Just Inside")]); await clear();
  check("a part on its own -> 200", partOnly.status === 200, `${partOnly.status} ${JSON.stringify(partOnly.data)}`);

  for (const n of ["The Lot", "Just Inside"]) await svc.del(`/rest/v1/services?id=eq.${id(n)}`);
  await svc.del(`/rest/v1/service_groups?business_id=eq.${A.id}`);
}

// ---------------------------------------------------------------------------
console.log("test 16: a service carries its own availability");
// Roadmap 2.8c. Two rules that could only ever be said about a BUSINESS or a
// DATE before: a ceramic coating needs a garage, so it cannot be done at the
// customer's address; and a service may only be offered on some weekdays.
// Both live in _shared/slotValidation.ts beside W4's and W22's, which is where
// create-, reschedule- and update-booking meet.
{
  const [garage] = (await svc.post("/rest/v1/services", [{
    business_id: A.id, name: "Garage Only", price: 100, duration_minutes: 60,
    allows_mobile: false, available_weekdays: [2, 3],
  }])).data;
  const book = (type, date) => fn("create-booking", {
    business_slug: "engine-a", customer_name: "Avail Check", customer_phone: "555-0904",
    customer_email: "avail@engine.test", customer_address: "9 Test St", service_type: type,
    vehicle_size: "small", service_ids: [garage.id], add_ons: [], booking_date: date, start_time: "13:00",
  });
  const clear = () => svc.del(`/rest/v1/bookings?business_id=eq.${A.id}&customer_phone=eq.555-0904`);
  // A Tuesday and a Thursday, both far enough out to be free.
  const onDow = (dow) => { const d = new Date(); d.setDate(d.getDate() + 26); while (d.getDay() !== dow) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
  const tue = onDow(2), thu = onDow(4);

  const mob = await book("mobile", tue); await clear();
  check("a drop-off-only service refuses mobile -> 409", mob.status === 409, `${mob.status} ${JSON.stringify(mob.data)}`);
  check("and it names the service", /Garage Only/.test(mob.data?.error ?? ""), mob.data?.error);

  const wrongDay = await book("dropoff", thu); await clear();
  check("a Tuesday/Wednesday service refuses a Thursday -> 409", wrongDay.status === 409, `${wrongDay.status} ${JSON.stringify(wrongDay.data)}`);

  const ok = await book("dropoff", tue); await clear();
  check("drop-off on a Tuesday -> 200", ok.status === 200, `${ok.status} ${JSON.stringify(ok.data)}`);

  // The DISPLAY half computes the same two rules independently — that is the
  // double-validation pattern, and a greyed-out day has to agree with a
  // refused booking or the customer meets the refusal at submit.
  const slots = await fn("available-slots", {
    business_slug: "engine-a", duration_minutes: 60,
    start_date: tue, end_date: thu, service_ids: [garage.id],
  });
  const days = slots.data?.days ?? {};
  check("available-slots closes the days the service is not offered on",
    Object.entries(days).every(([d, v]) => [2, 3].includes(new Date(`${d}T12:00:00`).getDay()) || !v.open),
    JSON.stringify(Object.keys(days).map((d) => `${d}:${days[d].open}`)));
  check("available-slots offers no mobile slots for a drop-off-only service",
    Object.values(days).every((v) => (v.mobile_slots ?? []).length === 0),
    JSON.stringify(Object.values(days).map((v) => v.mobile_slots?.length)));

  await svc.del(`/rest/v1/services?id=eq.${garage.id}`);
}

// ---------------------------------------------------------------------------
console.log("test 17: travel and time-based surcharges reach the price");
// Roadmap 2.8c, and the first assertion is a REGRESSION TEST for a live bug:
// business_settings.travel_fee was printed on the booking page ("+$25" on the
// "We come to you" card) and computeQuote had no travel input at all, so the
// customer was shown a surcharge their Estimated total never contained.
{
  const setPricing = (patch) => svc.patch(`/rest/v1/business_settings?business_id=eq.${A.id}`, patch);
  const price = (extra) => fn("calculate-booking", {
    business_slug: "engine-a", service_ids: [serviceA.id], add_ons: [], vehicle_size: "small", ...extra,
  });
  const onDow = (dow) => { const d = new Date(); d.setDate(d.getDate() + 26); while (d.getDay() !== dow) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

  await setPricing({ travel_fee: 25, travel_zones: [], price_rules: [], price_rounding_nearest: 0 });
  const base = (await price({ service_type: "dropoff" })).data?.quote;
  const mobile = (await price({ service_type: "mobile" })).data?.quote;
  check("drop-off is not charged travel", Number(base.travel_fee) === 0, JSON.stringify(base));
  check("THE FLAT TRAVEL FEE IS ACTUALLY CHARGED NOW",
    Number(mobile.travel_fee) === 25 && Number(mobile.total) === Number(base.total) + 25,
    `${base.total} vs ${mobile.total}`);

  // Areas supersede the flat fee — the customer picks one and its fee applies.
  await setPricing({
    travel_zones: [{ key: "near", name: "In town", fee: 0 }, { key: "far", name: "Out of town", fee: 40 }],
  });
  const near = (await price({ service_type: "mobile", travel_zone: "near" })).data?.quote;
  const far = (await price({ service_type: "mobile", travel_zone: "far" })).data?.quote;
  check("a travel area replaces the flat fee", Number(near.travel_fee) === 0, JSON.stringify(near));
  check("and each area carries its own", Number(far.travel_fee) === 40, JSON.stringify(far));
  check("the area's NAME comes back for the receipt", far.travel_zone === "Out of town", far.travel_zone);

  // The two rule kinds the trade's own software sells.
  await setPricing({
    travel_zones: [],
    price_rules: [
      { label: "Weekend rate", kind: "time", weekdays: [0, 6], start_time: null, end_time: null, amount: 30, is_percent: false },
      { label: "Short notice", kind: "lead_time", within_hours: 24, amount: 20, is_percent: false },
    ],
  });
  const weekday = (await price({ service_type: "dropoff", booking_date: onDow(3), start_time: "10:00" })).data?.quote;
  const weekend = (await price({ service_type: "dropoff", booking_date: onDow(6), start_time: "10:00" })).data?.quote;
  check("a weekday gets no weekend rate", (weekday.adjustments ?? []).length === 0, JSON.stringify(weekday.adjustments));
  check("a Saturday does", (weekend.adjustments ?? []).some((a) => a.label === "Weekend rate" && a.amount === 30),
    JSON.stringify(weekend.adjustments));
  check("and it reaches the total", Number(weekend.total) === Number(weekday.total) + 30,
    `${weekday.total} vs ${weekend.total}`);

  // No date yet is the state the price bar is in from step 1 to step 4. A rule
  // that cannot be evaluated must not apply — guessing would mean the price
  // moving DOWN when the customer picks a day, which reads as a bait.
  const undated = (await price({ service_type: "dropoff" })).data?.quote;
  check("with no date chosen, no time rule applies", (undated.adjustments ?? []).length === 0,
    JSON.stringify(undated.adjustments));

  // A CLOCK-DEPENDENT CHECK, FIXED 2026-09-02 WHILE DOING ROADMAP 2.12 — it
  // failed against an unchanged pricing path at 22:31 local and passed at
  // 15:00. `Date.now() + 20h` then `.slice(0, 10)` yields a DATE, and 10:00
  // local on that date is anywhere from 14 to 44 hours away depending on the
  // hour the suite is run; past 24 the rule correctly does not apply and the
  // check correctly failed. The assertion is "a lead-time rule fires inside
  // its window", and the window is ours to choose, so it is widened past the
  // worst case rather than the date being computed more cleverly.
  const rushRules = [
    { label: "Weekend rate", kind: "time", weekdays: [0, 6], start_time: null, end_time: null, amount: 30, is_percent: false },
    { label: "Short notice", kind: "lead_time", within_hours: 96, amount: 20, is_percent: false },
  ];
  await setPricing({ travel_zones: [], price_rules: rushRules });
  const tomorrow = new Date(Date.now() + 20 * 3600_000).toISOString().slice(0, 10);
  const rush = (await price({ service_type: "dropoff", booking_date: tomorrow, start_time: "10:00" })).data?.quote;
  check("a job booked inside the notice window gets the short-notice fee",
    (rush.adjustments ?? []).some((a) => a.label === "Short notice"), JSON.stringify(rush.adjustments));

  // THE WHOLE POINT of the shared engine: what the widget quotes is what the
  // booking is charged and what the row stores.
  const sat = onDow(6);
  await setPricing({ travel_zones: [{ key: "far", name: "Out of town", fee: 40 }] });
  const quoted = (await price({ service_type: "mobile", travel_zone: "far", booking_date: sat, start_time: "09:00" })).data?.quote;
  const made = await fn("create-booking", {
    business_slug: "engine-a", customer_name: "Price Check", customer_phone: "555-0905",
    customer_email: "price@engine.test", customer_address: "9 Test St", service_type: "mobile",
    travel_zone: "far", vehicle_size: "small", service_ids: [serviceA.id], add_ons: [],
    booking_date: sat, start_time: "09:00",
  });
  check("the booking is created", made.status === 200, `${made.status} ${JSON.stringify(made.data)}`);
  check("the charged total equals the quoted total",
    Number(made.data?.booking?.total_price) === Number(quoted.total),
    `quoted ${quoted.total}, charged ${made.data?.booking?.total_price}`);
  const row = await svc.get(`/rest/v1/bookings?id=eq.${made.data?.booking?.id}&select=travel_fee,travel_zone,price_adjustments`);
  check("travel and every surcharge are SNAPSHOTTED on the booking",
    Number(row.data?.[0]?.travel_fee) === 40
      && row.data?.[0]?.travel_zone === "Out of town"
      && (row.data?.[0]?.price_adjustments ?? []).some((a) => a.label === "Weekend rate"),
    JSON.stringify(row.data?.[0]));

  await svc.del(`/rest/v1/bookings?business_id=eq.${A.id}&customer_phone=eq.555-0905`);
  await setPricing({ travel_fee: null, travel_zones: [], price_rules: [], price_rounding_nearest: 5 });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
