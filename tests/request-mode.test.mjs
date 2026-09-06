// ROADMAP 2.12 — REQUEST MODE, ACCEPT/DECLINE, AND THE QUOTE'S MONEY TIE-OUT.
// Exercises the DEPLOYED edge functions against the live platform project.
//
//   node tests/request-mode.test.mjs
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the root .env, like
// tests/booking-engine.test.mjs. Its own business (`engine-r`) so it can never
// disturb that file's fixtures.
//
// THE TWO THINGS THIS FILE EXISTS FOR, and both are facts a reader of the code
// would have to assemble from three files to be sure of:
//
//   1. A REQUEST HOLDS THE SLOT. That is the owner's own clarification
//      (docs/dashboard-desktop-spec-2026-08-31.md §8) and it is the difference
//      between this item and the much larger one it could have been. Nothing
//      in the migration says it out loud — it is true only because 'pending'
//      is absent from the exclusion constraint's WHERE clause, which is a fact
//      you establish by NOT writing something. Tests 3 and 4 are what stop a
//      later session "tidying" 'pending' into that list.
//
//   2. A QUOTE IS NOT A PRICE UNTIL THE CUSTOMER SAYS YES, and when they do,
//      THE ITEMISATION STILL ADDS UP. CLAUDE.md: a number printed is not a
//      number charged, and a number EXPORTED is the same risk one step later.
//      Test 8 is the tie-out — services + add-ons + travel + adjustments must
//      equal `subtotal`, and `subtotal` must equal `total_price`, after the
//      quote has moved the price. Baselined by deleting the price_adjustments
//      line from accept-quote/index.ts, which fails it by exactly the quote.

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
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name} ${detail}`); }
};

async function rest(method, pathname, { body, headers = {} } = {}) {
  const res = await fetch(`${URL_}${pathname}`, {
    method,
    headers: {
      apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json", Prefer: "return=representation", ...headers,
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

async function fn(name, body, jwt) {
  const res = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
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

const daysOut = (n) => {
  const d = new Date(Date.now() + n * 86400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.005;

// ---------------------------------------------------------------------------
// ROADMAP 2.21 — CLEAR THE THROTTLE THIS RUN IS ABOUT TO SPEND.
//
// `create-booking` counts bookings per address, and this books more times in
// two minutes than a real customer does in a year, from one address, all day.
// **Without it the run starts failing at whichever booking crosses the line
// and reports it as a broken engine** — which is exactly what happened to
// `booking-engine` the first time it ran after the filter shipped: a 429 in
// the middle of test 2 and thirty-two cascading failures behind it.
//
// It clears rather than exempting: the limits stay set by what a real
// customer does, and the harness pays for its own noise.
await svc.del("/rest/v1/rate_hits?bucket=like.booking%25");

console.log("setup: one business that takes requests");

const owner = await ensureUser("phase2-owner-r@engine.test", "Phase2-request-test-pw!");
await svc.del("/rest/v1/businesses?slug=eq.engine-r");
const bizRes = await svc.post("/rest/v1/businesses", [{
  slug: "engine-r", name: "Engine Test Requests", timezone: "America/Los_Angeles",
  contact_email: "owner-r@engine.test", contact_phone: "555-0003",
  dropoff_address: "3 R Rd, Los Angeles, CA",
}]);
const R = bizRes.data[0];
await svc.post("/rest/v1/business_users", [{ business_id: R.id, user_id: owner.id, role: "owner" }]);
// buffer 0 so two adjacent test days never argue with each other, and no
// rounding so every figure below is exact arithmetic rather than nearly.
await svc.post("/rest/v1/business_settings", [{
  business_id: R.id, slot_interval_minutes: 60, buffer_minutes: 0,
  price_rounding_nearest: 1, booking_mode: "reserve",
}]);
await svc.post(
  "/rest/v1/business_hours",
  [0, 1, 2, 3, 4, 5, 6].map((wd) => ({ business_id: R.id, weekday: wd, open_time: "08:00", close_time: "18:00" })),
);
const svcRes = await svc.post("/rest/v1/services", [
  { business_id: R.id, name: "Request Detail", price: 200, duration_minutes: 120 },
]);
const service = svcRes.data[0];
const addOnRes = await svc.post("/rest/v1/add_ons", [
  { business_id: R.id, name: "Wax R", price: 30, duration_minutes: 0 },
]);
const addOn = addOnRes.data[0];

const setMode = (m) => svc.patch(`/rest/v1/business_settings?business_id=eq.${R.id}`, { booking_mode: m });
const rowOf = async (id) => (await svc.get(`/rest/v1/bookings?id=eq.${id}&select=*`)).data?.[0];
const book = (date, time, phone, extra = {}) => fn("create-booking", {
  business_slug: "engine-r",
  customer_name: "Req Cust", customer_phone: phone, customer_email: `${phone}@engine.test`,
  customer_address: "9 Request Way, Los Angeles, CA",
  service_type: "mobile", vehicle_size: "small",
  service_ids: [service.id], add_ons: [],
  booking_date: date, start_time: time,
  ...extra,
});

const D1 = daysOut(30);   // reserve-mode control
const D2 = daysOut(31);   // the slot-holding pair
const D3 = daysOut(32);   // accept
const D4 = daysOut(33);   // decline, and the slot coming back
const D5 = daysOut(34);   // quote → accept-quote, the tie-out
const D6 = daysOut(35);   // the guards

// ---------------------------------------------------------------------------
console.log("\ntest 1: reserve mode is unchanged, and it is the default");
{
  const fresh = await svc.get(`/rest/v1/business_settings?business_id=eq.${R.id}&select=booking_mode`);
  check("a settings row written without the column reads 'reserve'",
    fresh.data?.[0]?.booking_mode === "reserve", JSON.stringify(fresh.data));

  const r = await book(D1, "09:00", "555-2001");
  check("booking succeeds", r.status === 200, JSON.stringify(r.data));
  check("status comes back confirmed", r.data?.booking?.status === "confirmed", JSON.stringify(r.data?.booking));
}

// ---------------------------------------------------------------------------
console.log("\ntest 2: request mode makes a booking PENDING, not confirmed");
let pendingId;
{
  await setMode("request");
  const r = await book(D2, "09:00", "555-2002");
  check("booking succeeds", r.status === 200, JSON.stringify(r.data));
  check("status comes back pending", r.data?.booking?.status === "pending", JSON.stringify(r.data?.booking));
  pendingId = r.data?.booking?.id;
  const row = await rowOf(pendingId);
  check("the row is pending in the database", row?.status === "pending", JSON.stringify(row?.status));
  check("nothing about the money changed", near(row?.total_price, 200), String(row?.total_price));
}

// ---------------------------------------------------------------------------
// THE OWNER'S CLARIFICATION, PINNED. "So someone sends a request, it will take
// up that time slot." Both halves: the exclusion constraint refuses a second
// booking, and the slot is not OFFERED either.
console.log("\ntest 3: a request HOLDS the slot — nobody else can take it");
{
  const clash = await book(D2, "09:00", "555-2003");
  check("a second booking at the same time is refused", clash.status === 409, `${clash.status} ${JSON.stringify(clash.data)}`);
  const inside = await book(D2, "10:00", "555-2004");
  check("so is one that overlaps it", inside.status === 409, `${inside.status}`);
}

console.log("\ntest 4: and available-slots does not offer it");
{
  const a = await fn("available-slots", { business_slug: "engine-r", booking_date: D2, duration_minutes: 120 });
  check("09:00 is gone from the open times", !(a.data?.slots ?? []).includes("09:00"), JSON.stringify(a.data?.slots));
}

// ---------------------------------------------------------------------------
console.log("\ntest 5: accepting");
{
  const r = await book(D3, "09:00", "555-2005");
  const id = r.data?.booking?.id;
  const unauthorised = await fn("respond-to-booking", { business_id: R.id, booking_id: id, action: "accept" });
  check("no session → 401", unauthorised.status === 401, `${unauthorised.status}`);

  const ok = await fn("respond-to-booking", { business_id: R.id, booking_id: id, action: "accept" }, owner.jwt);
  check("accept succeeds", ok.status === 200, JSON.stringify(ok.data));
  const row = await rowOf(id);
  check("the booking is confirmed", row?.status === "confirmed", String(row?.status));
  check("the price is untouched", near(row?.total_price, 200), String(row?.total_price));

  const again = await fn("respond-to-booking", { business_id: R.id, booking_id: id, action: "accept" }, owner.jwt);
  check("accepting a confirmed booking → 409", again.status === 409, `${again.status}`);
}

// ---------------------------------------------------------------------------
// A DECLINE IS A CANCELLATION PLUS ONE FACT. There is no sixth status, and the
// reason is that every existing "is this happening" filter in the product
// already reads `status <> 'cancelled'` correctly. The slot HAS to come back,
// which is the half worth a test.
console.log("\ntest 6: declining frees the slot and says who did it");
{
  const r = await book(D4, "09:00", "555-2006");
  const id = r.data?.booking?.id;
  const ok = await fn("respond-to-booking", { business_id: R.id, booking_id: id, action: "decline" }, owner.jwt);
  check("decline succeeds", ok.status === 200, JSON.stringify(ok.data));

  const row = await rowOf(id);
  check("status is cancelled", row?.status === "cancelled", String(row?.status));
  check("declined_at records that the DETAILER ended it", !!row?.declined_at, String(row?.declined_at));

  const reuse = await book(D4, "09:00", "555-2007");
  check("somebody else can now have that time", reuse.status === 200, `${reuse.status} ${JSON.stringify(reuse.data)}`);
  const slots = await fn("available-slots", { business_slug: "engine-r", booking_date: daysOut(36), duration_minutes: 120 });
  check("available-slots still answers normally", Array.isArray(slots.data?.slots));
}

// ---------------------------------------------------------------------------
console.log("\ntest 7: a quote is OFFERED, never charged");
let quotedId;
{
  const r = await book(D5, "09:00", "555-2008", { add_ons: [addOn.id] });
  quotedId = r.data?.booking?.id;
  check("the request was taken at 230 (200 + 30 add-on)", near(r.data?.booking?.total_price, 230),
    JSON.stringify(r.data?.booking));

  const bad = await fn("respond-to-booking",
    { business_id: R.id, booking_id: quotedId, action: "quote", amount: 0 }, owner.jwt);
  check("a quote of zero is refused", bad.status === 400, `${bad.status}`);

  const ok = await fn("respond-to-booking",
    { business_id: R.id, booking_id: quotedId, action: "quote", amount: 305, note: "Paint correction first." },
    owner.jwt);
  check("quote succeeds", ok.status === 200, JSON.stringify(ok.data));

  const row = await rowOf(quotedId);
  check("quoted_amount holds the new price", near(row?.quoted_amount, 305), String(row?.quoted_amount));
  check("TOTAL_PRICE IS UNCHANGED — a number printed is not a number charged",
    near(row?.total_price, 230), String(row?.total_price));
  check("the booking is still pending, so the slot is still held",
    row?.status === "pending", String(row?.status));
  check("the note is stored", row?.quoted_note === "Paint correction first.", String(row?.quoted_note));
}

// ---------------------------------------------------------------------------
// THE TIE-OUT. Accepting the quote is the ONE place quoted_amount becomes
// total_price, and the itemisation every receipt prints has to still reconcile
// to it — services + add-ons + travel + price_adjustments = subtotal = total.
console.log("\ntest 8: the customer accepts, and the receipt still adds up");
{
  const ok = await fn("accept-quote", { booking_id: quotedId });
  check("accept-quote succeeds", ok.status === 200, JSON.stringify(ok.data));

  const row = await rowOf(quotedId);
  check("the booking is confirmed", row?.status === "confirmed", String(row?.status));
  check("total_price is now the quoted price", near(row?.total_price, 305), String(row?.total_price));
  check("the quote columns are cleared", row?.quoted_amount === null && row?.quoted_at === null,
    JSON.stringify({ amount: row?.quoted_amount, at: row?.quoted_at }));

  const services = (await svc.get(`/rest/v1/booking_services?booking_id=eq.${quotedId}&select=price_at_booking`)).data ?? [];
  const servicesTotal = services.reduce((s, x) => s + Number(x.price_at_booking), 0);
  const adjustments = (row?.price_adjustments ?? []).reduce((s, a) => s + Number(a.amount), 0);
  const itemised = servicesTotal + Number(addOn.price) + Number(row?.travel_fee ?? 0) + adjustments;

  check("the difference landed as a price_adjustments line",
    (row?.price_adjustments ?? []).some((a) => near(a.amount, 75)), JSON.stringify(row?.price_adjustments));
  check("the lines add up to the subtotal", near(itemised, row?.subtotal),
    `lines ${itemised} vs subtotal ${row?.subtotal}`);
  check("the subtotal adds up to what is charged", near(row?.subtotal, row?.total_price),
    `subtotal ${row?.subtotal} vs total ${row?.total_price}`);

  const again = await fn("accept-quote", { booking_id: quotedId });
  check("accepting a quote that is no longer there → 409", again.status === 409, `${again.status}`);
}

// ---------------------------------------------------------------------------
console.log("\ntest 9: the customer can still cancel and move a request");
{
  const r = await book(D6, "09:00", "555-2009");
  const id = r.data?.booking?.id;
  const moved = await fn("reschedule-booking", { booking_id: id, booking_date: D6, start_time: "14:00" });
  check("a pending request can be rescheduled", moved.status === 200, JSON.stringify(moved.data));
  const afterMove = await rowOf(id);
  check("AND IT STAYS PENDING — moving it is not being accepted",
    afterMove?.status === "pending", String(afterMove?.status));

  const cancelled = await fn("cancel-booking", { booking_id: id });
  check("a pending request can be cancelled — this is also 'no' to a quote",
    cancelled.status === 200, JSON.stringify(cancelled.data));
  const afterCancel = await rowOf(id);
  check("and it is a customer cancellation, not a decline",
    afterCancel?.status === "cancelled" && afterCancel?.declined_at === null,
    JSON.stringify({ status: afterCancel?.status, declined_at: afterCancel?.declined_at }));
}

// ---------------------------------------------------------------------------
// A detailer typing a booking in at the counter is the person who would be
// accepting it. Making their own booking wait on themselves is a loop.
console.log("\ntest 10: a booking the DETAILER makes is never a request");
{
  const r = await fn("create-booking", {
    business_slug: "engine-r",
    customer_name: "Walk In", customer_phone: "555-2010",
    service_type: "mobile", vehicle_size: "small",
    service_ids: [service.id], add_ons: [],
    booking_date: daysOut(37), start_time: "09:00",
  }, owner.jwt);
  check("admin booking succeeds with no customer email", r.status === 200, JSON.stringify(r.data));
  check("and it is confirmed", r.data?.booking?.status === "confirmed", JSON.stringify(r.data?.booking));
}

// ---------------------------------------------------------------------------
// The four reminder RPCs said `status <> 'cancelled'`, which was a complete
// description of "not happening" before this item. Without the migration's
// change, a customer whose request was never accepted gets "your appointment
// is tomorrow" and the detailer gets nudged to go and do it.
console.log("\ntest 11: the reminder sweep ignores a request nobody accepted");
{
  const r = await book(daysOut(38), "09:00", "555-2011");
  const id = r.data?.booking?.id;
  // Make it due: no marker, and a lead time wide enough to cover the date.
  await svc.patch(`/rest/v1/business_settings?business_id=eq.${R.id}`,
    { customer_reminder_lead_minutes: 60 * 24 * 90, evening_before_enabled: false });
  const due = await rest("POST", "/rest/v1/rpc/get_bookings_due_for_reminder", { body: { target: "customer" } });
  check("the pending request is not in the customer-reminder list",
    !(due.data ?? []).some((b) => b.id === id), `${(due.data ?? []).length} rows due`);

  const nudge = await rest("POST", "/rest/v1/rpc/get_bookings_due_for_nudge", { body: {} });
  check("nor in the owner nudge list",
    !(nudge.data ?? []).some((b) => b.id === id), `${(nudge.data ?? []).length} rows due`);

  await fn("respond-to-booking", { business_id: R.id, booking_id: id, action: "accept" }, owner.jwt);
  const dueAfter = await rest("POST", "/rest/v1/rpc/get_bookings_due_for_reminder", { body: { target: "customer" } });
  check("BUT IT IS ONCE ACCEPTED — the filter is about the status, not the row",
    (dueAfter.data ?? []).some((b) => b.id === id), `${(dueAfter.data ?? []).length} rows due`);
}

// ---------------------------------------------------------------------------
console.log("\ntest 12: another business's request is not yours to answer");
{
  const other = await ensureUser("phase2-owner-r2@engine.test", "Phase2-request-test-pw!");
  const r = await book(daysOut(39), "09:00", "555-2012");
  const id = r.data?.booking?.id;
  const attempt = await fn("respond-to-booking",
    { business_id: R.id, booking_id: id, action: "accept" }, other.jwt);
  check("a stranger's JWT cannot accept it", attempt.status === 401 || attempt.status === 404,
    `${attempt.status} ${JSON.stringify(attempt.data)}`);
}

// ---------------------------------------------------------------------------
// The hole request mode's own promise creates: it says the detailer answers,
// and until 2026-09-03 nothing made them. A request for Friday that was never
// accepted just dropped off Today when Friday passed.
console.log("\ntest 13: a request nobody answered gets chased");
{
  const r = await book(daysOut(40), "09:00", "555-2013");
  const id = r.data?.booking?.id;
  await svc.patch(`/rest/v1/business_settings?business_id=eq.${R.id}`, { request_nudge_hours: 12 });

  const tooSoon = await rest("POST", "/rest/v1/rpc/get_requests_due_for_nudge", { body: {} });
  check("a request that just arrived is not chased yet",
    !(tooSoon.data ?? []).some((b) => b.id === id), `${(tooSoon.data ?? []).length} due`);

  // Age it past the window. created_at is what this one measures from, not
  // start_at — the question is how long the CUSTOMER has waited.
  await svc.patch(`/rest/v1/bookings?id=eq.${id}`,
    { created_at: new Date(Date.now() - 20 * 3600_000).toISOString() });
  const due = await rest("POST", "/rest/v1/rpc/get_requests_due_for_nudge", { body: {} });
  check("one that has sat 20 hours IS chased",
    (due.data ?? []).some((b) => b.id === id), `${(due.data ?? []).length} due`);

  // The marker is what makes the 15-minute sweep idempotent.
  await svc.patch(`/rest/v1/bookings?id=eq.${id}`,
    { owner_request_nudge_sent_at: new Date().toISOString() });
  const after = await rest("POST", "/rest/v1/rpc/get_requests_due_for_nudge", { body: {} });
  check("and only once — the marker guards it",
    !(after.data ?? []).some((b) => b.id === id));
  await svc.patch(`/rest/v1/bookings?id=eq.${id}`, { owner_request_nudge_sent_at: null });

  // 0 is the off switch, the same convention every other lead time uses.
  await svc.patch(`/rest/v1/business_settings?business_id=eq.${R.id}`, { request_nudge_hours: 0 });
  const off = await rest("POST", "/rest/v1/rpc/get_requests_due_for_nudge", { body: {} });
  check("0 hours turns it off entirely",
    !(off.data ?? []).some((b) => b.id === id), `${(off.data ?? []).length} due`);
  await svc.patch(`/rest/v1/business_settings?business_id=eq.${R.id}`, { request_nudge_hours: 12 });

  // AND IT MUST NOT CHASE A REQUEST WHOSE TIME HAS GONE. That is not something
  // to accept any more; a push saying "accept this" would be wrong.
  await svc.patch(`/rest/v1/bookings?id=eq.${id}`,
    { start_at: new Date(Date.now() - 3600_000).toISOString(),
      end_at: new Date(Date.now() - 1800_000).toISOString() });
  const past = await rest("POST", "/rest/v1/rpc/get_requests_due_for_nudge", { body: {} });
  check("a request whose time has already passed is not chased",
    !(past.data ?? []).some((b) => b.id === id), `${(past.data ?? []).length} due`);

  // An ACCEPTED booking is never in this list — it is not waiting on anybody.
  const r2 = await book(daysOut(41), "09:00", "555-2014");
  const id2 = r2.data?.booking?.id;
  await svc.patch(`/rest/v1/bookings?id=eq.${id2}`,
    { created_at: new Date(Date.now() - 20 * 3600_000).toISOString() });
  await fn("respond-to-booking", { business_id: R.id, booking_id: id2, action: "accept" }, owner.jwt);
  const accepted = await rest("POST", "/rest/v1/rpc/get_requests_due_for_nudge", { body: {} });
  check("an accepted booking is never chased",
    !(accepted.data ?? []).some((b) => b.id === id2));
}

await setMode("reserve");
await svc.del("/rest/v1/businesses?slug=eq.engine-r");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
