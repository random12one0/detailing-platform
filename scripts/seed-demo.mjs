// Seeds (or re-seeds) a realistic demo business for testing the dashboard
// on a real device. Idempotent: deletes and recreates the demo business.
//
//   node scripts/seed-demo.mjs
//
// Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (+ SUPABASE_ACCESS_TOKEN
// and SUPABASE_PROJECT_REF if the anon key isn't in the environment).

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
let ANON = process.env.SUPABASE_ANON_KEY;
if (!ANON) {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` } },
  );
  const keys = await r.json();
  ANON = keys.find((k) => k.name === "anon")?.api_key;
}

const SLUG = "demo-detail";
const TZ = "America/Los_Angeles";
const OWNER = { email: "demo@detailplatform.com", password: "DemoDetail2026!" };
const STAFF = { email: "demo-staff@detailplatform.com", password: "DemoStaff2026!" };

const H = {
  apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
  "Content-Type": "application/json", Prefer: "return=representation",
};
const get = async (p) => (await fetch(URL_ + p, { headers: H })).json();
const post = async (p, b) => {
  const r = await fetch(URL_ + p, { method: "POST", headers: H, body: JSON.stringify(b) });
  const d = await r.json().catch(() => null);
  if (r.status >= 300) throw new Error(`${p} -> ${r.status} ${JSON.stringify(d).slice(0, 200)}`);
  return d;
};
const del = (p) => fetch(URL_ + p, { method: "DELETE", headers: H });

async function ensureUser({ email, password }) {
  await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST", headers: H,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const s = await r.json();
  if (!s.access_token) throw new Error(`could not sign in ${email}: ${JSON.stringify(s)}`);
  return s.user.id;
}

// Business-local date/time helpers.
const localDate = (offsetDays) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(Date.now() + offsetDays * 86400_000));
const toUtc = (dateStr, hhmm) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mi);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, hour12: false, year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(new Date(guess)).map((x) => [x.type, x.value]),
  );
  const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, p.hour === "24" ? 0 : +p.hour, +p.minute);
  return new Date(guess + (guess - asIfUtc)).toISOString();
};
const addMinutes = (iso, mins) => new Date(new Date(iso).getTime() + mins * 60_000).toISOString();

console.log("Re-seeding the demo business…");
await del(`/rest/v1/businesses?slug=eq.${SLUG}`);

const ownerId = await ensureUser(OWNER);
const staffId = await ensureUser(STAFF);

const [business] = await post("/rest/v1/businesses", [{
  slug: SLUG,
  name: "Coastline Auto Detailing",
  timezone: TZ,
  contact_email: OWNER.email,
  contact_phone: "562-555-0180",
  dropoff_address: "1450 Marina Blvd, Long Beach, CA",
  service_area: "Long Beach & South Bay",
}]);

await post("/rest/v1/business_users", [
  { business_id: business.id, user_id: ownerId, role: "owner", email: OWNER.email },
  { business_id: business.id, user_id: staffId, role: "staff", email: STAFF.email },
]);
await post("/rest/v1/business_settings", [{
  business_id: business.id,
  buffer_minutes: 45, min_advance_minutes: 120, slot_interval_minutes: 30,
  cancellation_window_hours: 24,
  google_review_url: "https://example.com/google-review",
  yelp_review_url: "https://example.com/yelp-review",
}]);
await post("/rest/v1/business_branding", [{
  business_id: business.id,
  primary_color: "#0ea5e9", secondary_color: "#0ea5e9",
  tagline: "Showroom clean, at your door.",
  about_copy: "Family-run mobile detailing serving Long Beach since 2019.",
}]);

// Open Tue–Sat, closed Sun/Mon — so the calendar shows real closed days.
await post("/rest/v1/business_hours", [0, 1, 2, 3, 4, 5, 6].map((wd) => ({
  business_id: business.id, weekday: wd,
  open_time: wd === 0 || wd === 1 ? null : "08:00",
  close_time: wd === 0 || wd === 1 ? null : "18:00",
})));

const services = await post("/rest/v1/services", [
  { business_id: business.id, name: "Express Wash", description: "Exterior hand wash, wheels, tyre dressing.", price: 65, duration_minutes: 60, group_label: "Exterior", sort_order: 0 },
  { business_id: business.id, name: "Full Detail", description: "Interior and exterior, clay bar, wax.", price: 220, duration_minutes: 180, group_label: "Complete", sort_order: 1 },
  { business_id: business.id, name: "Interior Deep Clean", description: "Shampoo, steam, leather conditioning.", price: 150, duration_minutes: 150, group_label: "Interior", sort_order: 2 },
  { business_id: business.id, name: "Ceramic Coating", description: "Two-year protective coating.", price: 650, duration_minutes: 300, group_label: "Protection", sort_order: 3 },
]);
const addOns = await post("/rest/v1/add_ons", [
  { business_id: business.id, name: "Pet hair removal", price: 40, duration_minutes: 30, sort_order: 0 },
  { business_id: business.id, name: "Engine bay clean", price: 55, duration_minutes: 30, sort_order: 1 },
  { business_id: business.id, name: "Headlight restoration", price: 75, duration_minutes: 45, sort_order: 2 },
]);
await post("/rest/v1/promo_codes", [
  { business_id: business.id, code: "FIRST20", type: "percentage", value: 20, once_per_customer: true },
  { business_id: business.id, code: "SUMMER10", type: "percentage", value: 10, once_per_customer: false },
]);

const svc = (name) => services.find((s) => s.name === name);
const CUSTOMERS = [
  ["Marcus Webb", "562-555-0142", "marcus.webb@example.com", "1420 Pine Ave, Long Beach, CA"],
  ["Dana Ruiz", "562-555-0198", "dana.ruiz@example.com", "88 Harbor Way, Long Beach, CA"],
  ["Priya Anand", "562-555-0233", "priya.anand@example.com", "305 Cedar St, Signal Hill, CA"],
  ["Tom Okafor", "562-555-0271", "tom.okafor@example.com", "12 Lakeside Dr, Lakewood, CA"],
  ["Elena Marsh", "562-555-0310", "elena.marsh@example.com", "640 Grove Rd, Long Beach, CA"],
  ["Sam Delgado", "562-555-0355", "sam.delgado@example.com", "77 Ocean Ter, Seal Beach, CA"],
  ["Aisha Rahman", "562-555-0402", "aisha.rahman@example.com", "219 Walnut Ave, Long Beach, CA"],
  ["Chris Vogel", "562-555-0447", "chris.vogel@example.com", "5 Anchor Ct, San Pedro, CA"],
];
const customers = await post("/rest/v1/customers", CUSTOMERS.map(([name, phone, email, address]) => ({
  business_id: business.id, name, phone, email, address,
  notes: name === "Dana Ruiz" ? "Gate code 4471. Friendly dog in the yard." : null,
})));
const cust = (name) => customers.find((c) => c.name === name);

// A day the business is open (skip Sun/Mon), N days from today.
function openDay(fromOffset, direction = 1) {
  for (let i = 0; i < 20; i++) {
    const d = localDate(fromOffset + i * direction);
    const [y, m, dd] = d.split("-").map(Number);
    const wd = new Date(y, m - 1, dd).getDay();
    if (wd !== 0 && wd !== 1) return d;
  }
  return localDate(fromOffset);
}

const today = localDate(0);
const todayIsOpen = ![0, 1].includes(new Date(...today.split("-").map((v, i) => (i === 1 ? +v - 1 : +v))).getDay());
const day0 = todayIsOpen ? today : openDay(0);

// Today (or the next open day): two done, two still to come.
// Then upcoming across the next couple of weeks, plus history for the chart.
const PLAN = [
  { day: day0, time: "08:30", who: "Marcus Webb", service: "Full Detail", size: "large", status: "completed", paid: 260, addOn: "Engine bay clean" },
  { day: day0, time: "13:00", who: "Dana Ruiz", service: "Express Wash", size: "medium", status: "completed", paid: 80 },
  { day: day0, time: "15:30", who: "Priya Anand", service: "Interior Deep Clean", size: "medium", status: "confirmed", addOn: "Pet hair removal" },
  { day: openDay(1), time: "09:00", who: "Tom Okafor", service: "Full Detail", size: "medium", status: "confirmed" },
  { day: openDay(1), time: "14:00", who: "Elena Marsh", service: "Express Wash", size: "small", status: "confirmed" },
  { day: openDay(3), time: "10:00", who: "Sam Delgado", service: "Ceramic Coating", size: "large", status: "confirmed" },
  { day: openDay(6), time: "11:00", who: "Aisha Rahman", service: "Interior Deep Clean", size: "small", status: "confirmed" },
  { day: openDay(9), time: "13:30", who: "Chris Vogel", service: "Full Detail", size: "medium", status: "confirmed" },
  // History — completed, spread over previous months so the chart has shape.
  { day: openDay(-9, -1), time: "09:00", who: "Elena Marsh", service: "Full Detail", size: "medium", status: "completed", paid: 235 },
  { day: openDay(-16, -1), time: "13:00", who: "Chris Vogel", service: "Express Wash", size: "small", status: "completed", paid: 65 },
  { day: openDay(-24, -1), time: "10:30", who: "Marcus Webb", service: "Interior Deep Clean", size: "large", status: "completed", paid: 195 },
  { day: openDay(-38, -1), time: "09:30", who: "Tom Okafor", service: "Ceramic Coating", size: "large", status: "completed", paid: 700 },
  { day: openDay(-45, -1), time: "14:00", who: "Dana Ruiz", service: "Full Detail", size: "medium", status: "completed", paid: 240 },
  { day: openDay(-52, -1), time: "11:00", who: "Aisha Rahman", service: "Express Wash", size: "medium", status: "completed", paid: 80 },
  { day: openDay(-70, -1), time: "10:00", who: "Sam Delgado", service: "Full Detail", size: "large", status: "completed", paid: 265 },
  { day: openDay(-78, -1), time: "15:00", who: "Priya Anand", service: "Interior Deep Clean", size: "small", status: "completed", paid: 150 },
  { day: openDay(-100, -1), time: "09:00", who: "Marcus Webb", service: "Full Detail", size: "medium", status: "completed", paid: 220 },
  { day: openDay(-108, -1), time: "13:00", who: "Elena Marsh", service: "Express Wash", size: "small", status: "completed", paid: 65 },
  { day: openDay(-132, -1), time: "10:00", who: "Chris Vogel", service: "Ceramic Coating", size: "medium", status: "completed", paid: 650 },
  { day: openDay(-140, -1), time: "14:30", who: "Tom Okafor", service: "Express Wash", size: "large", status: "completed", paid: 95 },
];

let made = 0;
for (const p of PLAN) {
  const service = svc(p.service);
  const c = cust(p.who);
  const sizeAdj = service.vehicle_size_adjustments?.[p.size] ?? { price: 0, duration_minutes: 0 };
  const addOn = p.addOn ? addOns.find((a) => a.name === p.addOn) : null;
  const price = Number(service.price) + Number(sizeAdj.price) + (addOn ? Number(addOn.price) : 0);
  const duration = Number(service.duration_minutes) + Number(sizeAdj.duration_minutes) + (addOn ? Number(addOn.duration_minutes) : 0);
  const startAt = toUtc(p.day, p.time);

  try {
    const [b] = await post("/rest/v1/bookings", [{
      business_id: business.id,
      customer_id: c.id,
      customer_name: c.name, customer_phone: c.phone, customer_email: c.email,
      customer_address: c.address,
      start_at: startAt, end_at: addMinutes(startAt, duration),
      service_type: p.who === "Sam Delgado" ? "dropoff" : "mobile",
      vehicle_size: p.size,
      vehicle_size_fee: Number(sizeAdj.price),
      vehicle_model: { "Marcus Webb": "Ford F-150", "Dana Ruiz": "Honda Civic", "Priya Anand": "Subaru Outback", "Tom Okafor": "Tesla Model 3", "Elena Marsh": "Mini Cooper", "Sam Delgado": "Chevy Tahoe", "Aisha Rahman": "Toyota Corolla", "Chris Vogel": "BMW 3 Series" }[c.name] ?? null,
      subtotal: price, total_price: price,
      status: p.status,
      final_amount: p.paid ?? null,
      payment_status: p.paid ? "paid" : "pending",
      finalized_at: p.paid ? addMinutes(startAt, duration + 10) : null,
      customer_notes: p.who === "Priya Anand" ? "Two child seats in the back, please work around them." : null,
    }]);
    await post("/rest/v1/booking_services", [{
      business_id: business.id, booking_id: b.id, service_id: service.id,
      name_at_booking: service.name,
      price_at_booking: Number(service.price) + Number(sizeAdj.price),
      duration_at_booking: Number(service.duration_minutes) + Number(sizeAdj.duration_minutes),
    }]);
    if (addOn) {
      await post("/rest/v1/booking_add_ons", [{ business_id: business.id, booking_id: b.id, add_on_id: addOn.id }]);
    }
    made++;
  } catch (e) {
    console.warn(`  skipped ${p.who} ${p.day} ${p.time}: ${String(e.message).slice(0, 90)}`);
  }
}

// Expenses across the same months, using the five fixed categories.
const EXPENSES = [
  [0, "product", "Ceramic coating kit", 189],
  [-2, "gas", "Van fuel", 78],
  [-5, "supplies", "Microfibre towels (bulk)", 46],
  [-9, "equipment", "Pressure washer service", 120],
  [-14, "product", "Interior shampoo restock", 92],
  [-21, "gas", "Van fuel", 84],
  [-33, "supplies", "Buffing pads", 58],
  [-45, "other", "Insurance instalment", 140],
  [-62, "product", "Wax and sealant", 110],
  [-75, "gas", "Van fuel", 81],
  [-96, "equipment", "Replacement extractor hose", 65],
  [-124, "supplies", "Glass cleaner case", 39],
];
await post("/rest/v1/expenses", EXPENSES.map(([off, category, description, amount]) => ({
  business_id: business.id, date: localDate(off), category, description, amount,
  payment_method: "unspecified",
})));

// A blocked-out day so the calendar shows one.
await post("/rest/v1/blockout_dates", [{
  business_id: business.id, event_name: "Equipment servicing",
  start_date: openDay(4), end_date: openDay(4), all_day: true,
}]);

const counts = await get(`/rest/v1/bookings?business_id=eq.${business.id}&select=id`);
console.log(`
Demo business ready.
  Business : ${business.name} (slug: ${SLUG}, ${TZ})
  Bookings : ${counts.length} (${made} seeded)
  Customers: ${customers.length}   Services: ${services.length}   Expenses: ${EXPENSES.length}
  Owner    : ${OWNER.email} / ${OWNER.password}
  Staff    : ${STAFF.email} / ${STAFF.password}
`);
