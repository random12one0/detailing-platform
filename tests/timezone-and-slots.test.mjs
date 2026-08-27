// Timezone correctness, cancellation freeing slots, and staff-usability
// checks — all against the LIVE deployed engine.
//
//   node tests/timezone-and-slots.test.mjs
//
// Covers:
//  * a cancelled or soft-deleted booking releases its slot (constraint and
//    availability both)
//  * New York and Phoenix compute the same wall-clock hours correctly
//  * Phoenix does NOT observe daylight saving (verified against Denver,
//    which shares its winter offset but not its summer one)
//  * changing a business's timezone does not corrupt existing bookings
//  * a staff session has everything its screens need to render

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
const note = (text) => console.log(`  note  ${text}`);

async function rest(method, path, { key = SERVICE, jwt, body } = {}) {
  const res = await fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: key, Authorization: `Bearer ${jwt ?? key}`,
      "Content-Type": "application/json", Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
const svc = {
  get: (p) => rest("GET", p), post: (p, b) => rest("POST", p, { body: b }),
  patch: (p, b) => rest("PATCH", p, { body: b }), del: (p) => rest("DELETE", p),
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
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const s = await r.json();
  if (!s.access_token) throw new Error(`sign-in failed for ${email}`);
  return { id: s.user.id, jwt: s.access_token };
}
const daysOut = (n) => {
  const d = new Date(Date.now() + n * 86400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};
// The instant a business-local wall clock refers to, computed independently
// of the app so the test can't inherit the app's own bug.
const localToUtcISO = (tz, dateStr, hhmm) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mi);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false, year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(new Date(guess)).map((x) => [x.type, x.value]),
  );
  const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, p.hour === "24" ? 0 : +p.hour, +p.minute);
  return new Date(guess + (guess - asIfUtc)).toISOString();
};

// ---------------------------------------------------------------------------
console.log("setup: New York, Phoenix and Denver businesses with identical hours");

const PW = "Phase2-tz-test-pw!";
const owner = await ensureUser("tz-owner@tz.test", PW);
await svc.del("/rest/v1/businesses?slug=in.(tz-ny,tz-phx,tz-den)");
const bizzes = (await svc.post("/rest/v1/businesses", [
  { slug: "tz-ny", name: "TZ New York", timezone: "America/New_York", contact_email: "ny@tz.test" },
  { slug: "tz-phx", name: "TZ Phoenix", timezone: "America/Phoenix", contact_email: "phx@tz.test" },
  { slug: "tz-den", name: "TZ Denver", timezone: "America/Denver", contact_email: "den@tz.test" },
])).data;
const NY = bizzes.find((b) => b.slug === "tz-ny");
const PHX = bizzes.find((b) => b.slug === "tz-phx");
const DEN = bizzes.find((b) => b.slug === "tz-den");

await svc.post("/rest/v1/business_users", bizzes.map((b) => ({ business_id: b.id, user_id: owner.id, role: "owner" })));
await svc.post("/rest/v1/business_settings", bizzes.map((b) => ({ business_id: b.id, slot_interval_minutes: 60, buffer_minutes: 0 })));
await svc.post("/rest/v1/business_hours", bizzes.flatMap((b) =>
  [0, 1, 2, 3, 4, 5, 6].map((wd) => ({ business_id: b.id, weekday: wd, open_time: "08:00", close_time: "18:00" }))));
const services = (await svc.post("/rest/v1/services", bizzes.map((b) =>
  ({ business_id: b.id, name: "Detail", price: 100, duration_minutes: 120 })))).data;
const svcOf = (biz) => services.find((s) => s.business_id === biz.id).id;

// ---------------------------------------------------------------------------
console.log("\ntest 1: a cancelled booking releases its slot");
{
  const day = daysOut(30);
  const made = await fn("create-booking", {
    business_slug: "tz-ny", customer_name: "Canceller", customer_phone: "555-2001",
    customer_email: "c1@tz.test", service_type: "mobile", vehicle_size: "small",
    service_ids: [svcOf(NY)], booking_date: day, start_time: "14:00",
  });
  check("booking created at 14:00", made.status === 200, JSON.stringify(made.data).slice(0, 150));

  const before = await fn("available-slots", { business_slug: "tz-ny", booking_date: day, duration_minutes: 120 });
  check("14:00 no longer offered while booked", !before.data?.slots?.includes("14:00"), JSON.stringify(before.data?.slots));

  const cancelled = await fn("cancel-booking", { booking_id: made.data.booking.id });
  check("cancelled", cancelled.status === 200, JSON.stringify(cancelled.data));

  const after = await fn("available-slots", { business_slug: "tz-ny", booking_date: day, duration_minutes: 120 });
  check("14:00 is offered again after cancelling", after.data?.slots?.includes("14:00"), JSON.stringify(after.data?.slots));

  // And the database itself accepts a real booking in the freed slot — proof
  // the exclusion constraint honors status, not just the availability code.
  const rebook = await fn("create-booking", {
    business_slug: "tz-ny", customer_name: "Rebooker", customer_phone: "555-2002",
    customer_email: "c2@tz.test", service_type: "mobile", vehicle_size: "small",
    service_ids: [svcOf(NY)], booking_date: day, start_time: "14:00",
  });
  check("the freed slot can actually be re-booked", rebook.status === 200, JSON.stringify(rebook.data).slice(0, 150));
}

console.log("\ntest 2: a soft-deleted booking releases its slot");
{
  const day = daysOut(31);
  const made = await fn("create-booking", {
    business_slug: "tz-ny", customer_name: "Deleted", customer_phone: "555-2003",
    customer_email: "c3@tz.test", service_type: "mobile", vehicle_size: "small",
    service_ids: [svcOf(NY)], booking_date: day, start_time: "14:00",
  });
  const blocked = await fn("available-slots", { business_slug: "tz-ny", booking_date: day, duration_minutes: 120 });
  check("14:00 blocked while live", !blocked.data?.slots?.includes("14:00"));

  const del = await fn("update-booking", { business_id: NY.id, booking_id: made.data.booking.id, soft_delete: true }, owner.jwt);
  check("soft deleted", del.status === 200, JSON.stringify(del.data).slice(0, 120));

  const freed = await fn("available-slots", { business_slug: "tz-ny", booking_date: day, duration_minutes: 120 });
  check("14:00 offered again after soft delete", freed.data?.slots?.includes("14:00"), JSON.stringify(freed.data?.slots));
  const rebook = await fn("create-booking", {
    business_slug: "tz-ny", customer_name: "Rebooker2", customer_phone: "555-2004",
    customer_email: "c4@tz.test", service_type: "mobile", vehicle_size: "small",
    service_ids: [svcOf(NY)], booking_date: day, start_time: "14:00",
  });
  check("soft-deleted slot can be re-booked", rebook.status === 200, JSON.stringify(rebook.data).slice(0, 150));
  // The soft-deleted row still exists — released, not destroyed.
  const still = await svc.get(`/rest/v1/bookings?id=eq.${made.data.booking.id}&select=id,deleted_at`);
  check("the deleted booking row is still there", still.data?.length === 1 && !!still.data[0].deleted_at);
}

console.log("\ntest 3: New York and Phoenix, identical wall-clock hours");
{
  const day = daysOut(32);
  const ny = await fn("available-slots", { business_slug: "tz-ny", booking_date: day, duration_minutes: 120 });
  const phx = await fn("available-slots", { business_slug: "tz-phx", booking_date: day, duration_minutes: 120 });
  check("both open 08:00 and offer the same wall-clock slots",
    JSON.stringify(ny.data?.slots) === JSON.stringify(phx.data?.slots) && ny.data?.slots?.[0] === "08:00",
    `${JSON.stringify(ny.data?.slots)} vs ${JSON.stringify(phx.data?.slots)}`);

  // Same local time, different real instants — the whole point of per-tenant
  // timezones.
  const mk = (slug, biz) => fn("create-booking", {
    business_slug: slug, customer_name: "Ten AM", customer_phone: "555-2100",
    customer_email: "t@tz.test", service_type: "mobile", vehicle_size: "small",
    service_ids: [svcOf(biz)], booking_date: day, start_time: "10:00",
  });
  const [nyB, phxB] = [await mk("tz-ny", NY), await mk("tz-phx", PHX)];
  const rows = await svc.get(`/rest/v1/bookings?id=in.(${nyB.data.booking.id},${phxB.data.booking.id})&select=id,business_id,start_at`);
  const nyStart = rows.data.find((r) => r.business_id === NY.id).start_at;
  const phxStart = rows.data.find((r) => r.business_id === PHX.id).start_at;
  check("NY 10:00 stored as the correct instant",
    new Date(nyStart).toISOString() === localToUtcISO("America/New_York", day, "10:00"),
    `${nyStart} vs ${localToUtcISO("America/New_York", day, "10:00")}`);
  check("Phoenix 10:00 stored as the correct instant",
    new Date(phxStart).toISOString() === localToUtcISO("America/Phoenix", day, "10:00"),
    `${phxStart} vs ${localToUtcISO("America/Phoenix", day, "10:00")}`);
  const hoursApart = (new Date(phxStart) - new Date(nyStart)) / 3600_000;
  check("the same local 10:00 is 3 hours apart in reality", hoursApart === 3, String(hoursApart));
}

console.log("\ntest 4: Phoenix ignores daylight saving (checked against Denver)");
{
  // Denver and Phoenix share MST in winter; Denver alone moves to MDT in
  // summer. Any code assuming "every US zone shifts" gets this wrong.
  const summer = "2027-07-15";
  const winter = "2027-01-15";
  const phxSummer = localToUtcISO("America/Phoenix", summer, "10:00");
  const denSummer = localToUtcISO("America/Denver", summer, "10:00");
  const phxWinter = localToUtcISO("America/Phoenix", winter, "10:00");
  const denWinter = localToUtcISO("America/Denver", winter, "10:00");
  // Denver is on MDT (UTC-6) in summer, so its 10:00 local happens an hour
  // EARLIER in real time than Phoenix's 10:00 MST (UTC-7).
  check("in summer Phoenix and Denver differ by an hour",
    (new Date(phxSummer) - new Date(denSummer)) / 3600_000 === 1,
    `${phxSummer} vs ${denSummer}`);
  check("in winter Phoenix and Denver are identical", phxWinter === denWinter, `${phxWinter} vs ${denWinter}`);
  check("Phoenix keeps the same UTC offset year-round",
    new Date(phxSummer).getUTCHours() === new Date(phxWinter).getUTCHours(),
    `${phxSummer} vs ${phxWinter}`);

  // The live engine agrees: booking 10:00 local on both sides of a DST
  // boundary lands on the same offset for Phoenix, a shifted one for Denver.
  const probe = async (slug, tz, dateStr) => {
    const conv = await svc.post("/rest/v1/rpc/business_local_to_utc", {
      p_business_id: slug === "tz-phx" ? PHX.id : DEN.id,
      p_local: `${dateStr}T10:00:00`,
    });
    return { db: new Date(conv.data).toISOString(), expected: localToUtcISO(tz, dateStr, "10:00") };
  };
  for (const [slug, tz, label] of [["tz-phx", "America/Phoenix", "Phoenix"], ["tz-den", "America/Denver", "Denver"]]) {
    for (const [d, season] of [[summer, "summer"], [winter, "winter"]]) {
      const { db, expected } = await probe(slug, tz, d);
      check(`${label} ${season} 10:00 converts correctly in the database`, db === expected, `${db} vs ${expected}`);
    }
  }
}

console.log("\ntest 5: changing a business's timezone");
{
  const day = daysOut(33);
  const made = await fn("create-booking", {
    business_slug: "tz-phx", customer_name: "Mover", customer_phone: "555-2200",
    customer_email: "m@tz.test", service_type: "mobile", vehicle_size: "small",
    service_ids: [svcOf(PHX)], booking_date: day, start_time: "09:00",
  });
  const before = (await svc.get(`/rest/v1/bookings?id=eq.${made.data.booking.id}&select=start_at,end_at`)).data[0];
  note(`before: stored instant ${before.start_at} (09:00 Phoenix local)`);

  // Move the business to New York.
  const moved = await svc.patch(`/rest/v1/businesses?id=eq.${PHX.id}`, { timezone: "America/New_York" });
  check("timezone change accepted", moved.status === 200, `${moved.status}`);

  const after = (await svc.get(`/rest/v1/bookings?id=eq.${made.data.booking.id}&select=start_at,end_at`)).data[0];
  check("existing booking's stored instant is UNCHANGED (no corruption)",
    after.start_at === before.start_at && after.end_at === before.end_at,
    `${before.start_at} -> ${after.start_at}`);

  // Its LOCAL time now reads in the new zone — the same real moment, shown
  // differently. This is the behavior to know about, not a bug.
  const receipt = await fn("get-booking-receipt", { id: made.data.booking.id });
  note(`after: same instant now displays as ${receipt.data?.booking?.start_time} New York local`);
  check("the same instant now displays in the new zone", receipt.data?.booking?.start_time === "12:00", String(receipt.data?.booking?.start_time));

  // Future availability follows the new zone immediately.
  const slots = await fn("available-slots", { business_slug: "tz-phx", booking_date: daysOut(34), duration_minutes: 120 });
  check("future availability still opens at the business's 08:00 local", slots.data?.slots?.[0] === "08:00", JSON.stringify(slots.data?.slots));

  // A bad zone is refused outright, so this can never be corrupted by a typo.
  const bad = await svc.patch(`/rest/v1/businesses?id=eq.${PHX.id}`, { timezone: "America/Los_Angles" });
  check("an invalid timezone is rejected by the database", bad.status >= 400, `${bad.status}`);
  await svc.patch(`/rest/v1/businesses?id=eq.${PHX.id}`, { timezone: "America/Phoenix" });
}

console.log("\ntest 6: a staff session has everything its screens need");
{
  const staff = await ensureUser("tz-staff@tz.test", PW);
  await svc.post("/rest/v1/business_users", [{ business_id: NY.id, user_id: staff.id, role: "staff", email: "tz-staff@tz.test" }]);

  const biz = await rest("GET", "/rest/v1/businesses?select=id,name,timezone,dropoff_address,contact_phone", { key: ANON, jwt: staff.jwt });
  check("staff can read the business timezone (calendar renders)", biz.data?.[0]?.timezone === "America/New_York", JSON.stringify(biz.data));
  check("staff can read the business name and address (job cards render)",
    !!biz.data?.[0]?.name && biz.data?.[0]?.dropoff_address !== undefined);

  const settings = await rest("GET", "/rest/v1/business_settings?select=*", { key: ANON, jwt: staff.jwt });
  check("staff still gets zero settings rows", (settings.data ?? []).length === 0);

  const bookings = await rest("GET", "/rest/v1/bookings?select=id,start_at,end_at,status,customer_name", { key: ANON, jwt: staff.jwt });
  check("staff sees bookings with real timestamps", (bookings.data ?? []).length > 0 && !!bookings.data[0].start_at, String((bookings.data ?? []).length));

  const branding = await rest("GET", "/rest/v1/business_branding?select=primary_color", { key: ANON, jwt: staff.jwt });
  check("staff can read branding (theme accent renders)", branding.status === 200);

  const svcRead = await rest("GET", "/rest/v1/services?select=id,name,duration_minutes", { key: ANON, jwt: staff.jwt });
  check("staff can read services with durations (new booking works)", (svcRead.data ?? []).length > 0);

  // The staff booking flow goes through the edge functions, which read
  // settings with the service role — so no staff settings access is needed.
  const slots = await fn("available-slots", { business_slug: "tz-ny", booking_date: daysOut(35), duration_minutes: 120 }, staff.jwt);
  check("staff can load available slots (settings read server-side)", (slots.data?.slots ?? []).length > 0, JSON.stringify(slots.data).slice(0, 120));
  const quote = await fn("calculate-booking", {
    business_slug: "tz-ny", service_ids: [svcOf(NY)], add_ons: [], vehicle_size: "small",
  }, staff.jwt);
  check("staff can get a price quote", quote.data?.quote?.total > 0, JSON.stringify(quote.data).slice(0, 120));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
