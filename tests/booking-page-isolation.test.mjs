// Two businesses that disagree about everything, exercised through the
// EXACT endpoints the public booking page uses — the get_public_business_
// profile RPC with the anon key, and the calculate/slots/create edge
// functions. Neither may leak into the other.
//
// Seed both first:  node scripts/seed-two-tenants.mjs
//                   node tests/booking-page-isolation.test.mjs

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
let ANON = process.env.SUPABASE_ANON_KEY;
if (!ANON) {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` } },
  );
  const keys = await r.json();
  ANON = keys.find((k) => k.name === "anon")?.api_key ?? keys.find((k) => k.type === "publishable")?.api_key;
}

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name} ${detail}`); }
};

// Exactly what the browser does: anon key, no session.
const rpc = async (slug) => {
  const res = await fetch(`${URL_}/rest/v1/rpc/get_public_business_profile`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_slug: slug }),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};
const fn = async (name, body) => {
  const res = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};
const svc = async (path) =>
  (await fetch(URL_ + path, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json();

const A = "demo-riverside";   // red, mobile-only, 2 services, New York
const B = "demo-ironclad";    // green, drop-off-only, 7 services, Phoenix

// Internal ids, read with the service role only so the test can check WHERE
// a row landed. The page itself never sees these.
const idOf = async (slug) =>
  (await (await fetch(`${URL_}/rest/v1/businesses?slug=eq.${slug}&select=id`,
    { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json())[0]?.id;

console.log("setup: fetch both public profiles the way the page does");
const a = (await rpc(A)).data;
const b = (await rpc(B)).data;
const idA = await idOf(A);
const idB = await idOf(B);
if (!a?.business || !b?.business) {
  console.error("Seed first: node scripts/seed-two-tenants.mjs");
  process.exit(1);
}

// ---------------------------------------------------------------------------
console.log("test 1: identity — each page is the business in its own URL");
{
  check("A is Riverside", a.business.name === "Riverside Mobile Detail", a.business.name);
  check("B is Ironclad", b.business.name === "Ironclad Ceramic Studio", b.business.name);
  check("A and B are different businesses", a.business.slug !== b.business.slug);
  // The public profile deliberately does NOT carry the internal business id.
  // The slug is the only handle a customer ever gets, and every write path
  // resolves the business server-side from that slug, so a page cannot be
  // pointed at another tenant by editing an id in the payload.
  check("no internal business id is exposed to the page", a.business.id === undefined,
    JSON.stringify(Object.keys(a.business)));
  check("A carries its own timezone", a.business.timezone === "America/New_York", a.business.timezone);
  check("B carries its own timezone", b.business.timezone === "America/Phoenix", b.business.timezone);
  check("A's phone is A's", a.business.phone === "(555) 201-4477" || a.business.contact_phone === "(555) 201-4477",
    JSON.stringify({ p: a.business.phone, cp: a.business.contact_phone }));
}

console.log("test 2: branding — clashing colours stay on their own page");
{
  check("A is red", a.branding?.primary_color?.toLowerCase() === "#dc2626", a.branding?.primary_color);
  check("B is green", b.branding?.primary_color?.toLowerCase() === "#059669", b.branding?.primary_color);
  check("A's tagline is A's", a.branding?.tagline === "We come to your driveway", a.branding?.tagline);
  check("B's tagline is B's", b.branding?.tagline === "Coatings, correction, glass", b.branding?.tagline);
}

console.log("test 3: catalogue — 2 services vs 7, no overlap at all");
{
  check("A lists exactly 2 services", a.services?.length === 2, String(a.services?.length));
  check("B lists exactly 7 services", b.services?.length === 7, String(b.services?.length));
  const aNames = new Set(a.services.map((s) => s.name));
  const bNames = new Set(b.services.map((s) => s.name));
  const shared = [...aNames].filter((n) => bNames.has(n));
  check("no service name appears on both", shared.length === 0, shared.join(", "));
  const aIds = new Set(a.services.map((s) => s.id));
  const overlap = b.services.filter((s) => aIds.has(s.id));
  check("no service ID appears on both", overlap.length === 0);
  check("A has 1 add-on, B has 2", a.add_ons?.length === 1 && b.add_ons?.length === 2,
    `${a.add_ons?.length} / ${b.add_ons?.length}`);
  check("B's group labels came through", new Set(b.services.map((s) => s.group_label)).size === 3);
  check("A's services carry no group label", a.services.every((s) => !s.group_label));
}

console.log("test 4: settings — contradicting rules stay contradictory");
{
  check("A is mobile-only", a.settings.mobile_enabled === true && a.settings.dropoff_enabled === false);
  check("B is drop-off-only", b.settings.mobile_enabled === false && b.settings.dropoff_enabled === true);
  check("A asks about water and electric", a.settings.ask_water_electric === true);
  check("B does not", b.settings.ask_water_electric === false);
  check("A charges a travel fee", Number(a.settings.travel_fee) === 25, String(a.settings.travel_fee));
  check("B charges none", Number(b.settings.travel_fee) === 0, String(b.settings.travel_fee));
  check("A needs 24h notice", Number(a.settings.min_advance_minutes) === 1440, String(a.settings.min_advance_minutes));
  check("B needs 2h", Number(b.settings.min_advance_minutes) === 120, String(b.settings.min_advance_minutes));
  check("A books on the hour", Number(a.settings.slot_interval_minutes) === 60);
  check("B books on the half hour", Number(b.settings.slot_interval_minutes) === 30);
  check("A cancellation window 48h", Number(a.settings.cancellation_window_hours) === 48);
  check("B cancellation window 12h", Number(b.settings.cancellation_window_hours) === 12);
  check("A runs a site discount", a.settings.site_discount_active === true);
  check("B does not", !b.settings.site_discount_active);
  check("B publishes a drop-off address", !!b.business.dropoff_address, String(b.business.dropoff_address));
  check("A publishes none", !a.business.dropoff_address, String(a.business.dropoff_address));
}

console.log("test 5: pricing — a service ID from one business is refused by the other");
{
  const aSvc = a.services[0], bSvc = b.services[0];

  const own = await fn("calculate-booking", { business_slug: A, service_ids: [aSvc.id], vehicle_size: "small" });
  check("A can price its own service", own.status === 200 && own.data?.quote?.total > 0,
    `${own.status} ${JSON.stringify(own.data).slice(0, 160)}`);

  // The attack: hand B's slug A's service id. It must not price it.
  const crossed = await fn("calculate-booking", { business_slug: B, service_ids: [aSvc.id], vehicle_size: "small" });
  const priced = Number(crossed.data?.quote?.total ?? 0);
  check("B refuses to price A's service", crossed.status !== 200 || priced === 0,
    `${crossed.status} total=${priced}`);

  const crossed2 = await fn("calculate-booking", { business_slug: A, service_ids: [bSvc.id], vehicle_size: "small" });
  const priced2 = Number(crossed2.data?.quote?.total ?? 0);
  check("A refuses to price B's service", crossed2.status !== 200 || priced2 === 0,
    `${crossed2.status} total=${priced2}`);

  // A's site discount must apply to A and never to B.
  check("A's quote carries A's site discount", Number(own.data?.quote?.site_discount ?? 0) > 0,
    JSON.stringify(own.data?.quote).slice(0, 200));
  const bOwn = await fn("calculate-booking", { business_slug: B, service_ids: [bSvc.id], vehicle_size: "small" });
  check("B's quote carries no site discount", Number(bOwn.data?.quote?.site_discount ?? 0) === 0,
    JSON.stringify(bOwn.data?.quote).slice(0, 200));
}

console.log("test 6: availability — each business's own hours and rules");
{
  const start = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);
  const end = new Date(Date.now() + 17 * 86400_000).toISOString().slice(0, 10);

  const sa = await fn("available-slots", { business_slug: A, start_date: start, end_date: end, duration_minutes: 210 });
  const sb = await fn("available-slots", { business_slug: B, start_date: start, end_date: end, duration_minutes: 90 });
  check("A returns days", sa.status === 200 && !!sa.data?.days, `${sa.status}`);
  check("B returns days", sb.status === 200 && !!sb.data?.days, `${sb.status}`);

  const openA = Object.entries(sa.data.days).filter(([, d]) => (d.slots ?? []).length > 0);
  const openB = Object.entries(sb.data.days).filter(([, d]) => (d.slots ?? []).length > 0);
  check("A has some open days", openA.length > 0, String(openA.length));
  check("B has some open days", openB.length > 0, String(openB.length));

  // A works Mon–Fri, B works Tue–Sat. Sunday is closed for both; Monday is
  // open for A and closed for B; Saturday the reverse. Weekday computed in
  // each business's OWN zone, which is the point.
  const dowIn = (date, tz) => new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" })
    .format(new Date(`${date}T12:00:00Z`));
  const aDows = new Set(openA.map(([d]) => dowIn(d, "America/New_York")));
  const bDows = new Set(openB.map(([d]) => dowIn(d, "America/Phoenix")));
  check("A never opens on a Saturday", !aDows.has("Sat"), [...aDows].join(","));
  check("B never opens on a Monday", !bDows.has("Mon"), [...bDows].join(","));
  check("A never opens on a Sunday", !aDows.has("Sun"), [...aDows].join(","));
  check("B never opens on a Sunday", !bDows.has("Sun"), [...bDows].join(","));

  // A books on the hour, B on the half hour.
  const aTimes = openA.flatMap(([, d]) => d.slots);
  const bTimes = openB.flatMap(([, d]) => d.slots);
  check("every A slot lands on the hour", aTimes.every((t) => t.endsWith(":00") || t.endsWith(":00:00")),
    aTimes.slice(0, 5).join(","));
  check("B offers at least one half-hour slot", bTimes.some((t) => t.startsWith(t.slice(0, 2)) && /:30/.test(t)),
    bTimes.slice(0, 5).join(","));
}

console.log("test 7: booking — a booking made on one page belongs only to it");
{
  const start = new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10);
  const end = new Date(Date.now() + 19 * 86400_000).toISOString().slice(0, 10);
  const svcA = a.services[1]; // the 75-minute one, easiest to place
  const slots = await fn("available-slots", {
    business_slug: A, start_date: start, end_date: end, duration_minutes: svcA.duration_minutes,
  });
  const day = Object.entries(slots.data.days).find(([, d]) => (d.slots ?? []).length > 0);

  if (!day) {
    check("A had an open slot to book", false, "no open days returned");
  } else {
    const [date, info] = day;
    const created = await fn("create-booking", {
      business_slug: A,
      customer_name: "Isolation Test", customer_phone: "555-7788",
      customer_email: "isolation@booking.test",
      customer_address: "12 Test Row",
      service_type: "mobile", vehicle_size: "small",
      service_ids: [svcA.id], add_ons: [],
      booking_date: date, start_time: info.slots[0],
      has_water_electric: true,
    });
    check("a customer can book on A", created.status === 200 && !!created.data?.booking?.id,
      `${created.status} ${JSON.stringify(created.data).slice(0, 200)}`);

    const id = created.data?.booking?.id;
    if (id) {
      const row = (await svc(`/rest/v1/bookings?id=eq.${id}&select=business_id,service_type,total_price`))[0];
      check("it is filed under A", row?.business_id === idA, `${row?.business_id} vs ${idA}`);
      check("it is not filed under B", row?.business_id !== idB);

      // B must not be able to reach it, even knowing the id: the receipt
      // endpoint is the only public read path and it returns the booking's
      // OWN business, never the one asking.
      const receipt = await fn("get-booking-receipt", { id });
      check("the receipt names A, not B", receipt.data?.business?.slug === A,
        JSON.stringify(receipt.data?.business).slice(0, 160));

      // The mode A allows is mobile; B only allows drop-off. A booking made
      // on A must not be re-typed by B's rules.
      check("the booking kept A's service type", row?.service_type === "mobile", row?.service_type);

      await fetch(`${URL_}/rest/v1/bookings?id=eq.${id}`, {
        method: "DELETE", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
      });
    }
  }

  // Booking B's way on A's page must be rejected: A does not do drop-off.
  const wrongMode = await fn("create-booking", {
    business_slug: A,
    customer_name: "Wrong Mode", customer_phone: "555-0000", customer_email: "wm@booking.test",
    service_type: "dropoff", vehicle_size: "small",
    service_ids: [a.services[0].id], add_ons: [],
    booking_date: new Date(Date.now() + 6 * 86400_000).toISOString().slice(0, 10),
    start_time: "09:00",
  });
  check("A refuses a drop-off booking (it is mobile-only)", wrongMode.status !== 200,
    `${wrongMode.status} ${JSON.stringify(wrongMode.data).slice(0, 160)}`);
}

console.log("test 8: the public profile leaks nothing private");
{
  const json = JSON.stringify(a);
  check("no expenses in the public profile", !/expense/i.test(json));
  check("no promo codes in the public profile", !/promo_code/i.test(json));
  check("no customer records in the public profile", !/customer_phone|customer_email/i.test(json));
  check("no member emails in the public profile", !/business_users|"role"/i.test(json));

  // A slug that does not exist must return nothing, not the last one asked for.
  const ghost = await rpc("no-such-business-anywhere");
  check("an unknown slug returns nothing", !ghost.data || ghost.data === null || !ghost.data.business,
    JSON.stringify(ghost.data).slice(0, 120));

  // Anon must not be able to read the tables directly, only through the RPC.
  const direct = await fetch(`${URL_}/rest/v1/services?select=*`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  const rows = await direct.json().catch(() => null);
  check("anon cannot read the services table directly",
    !Array.isArray(rows) || rows.length === 0, `${direct.status} ${JSON.stringify(rows).slice(0, 120)}`);

  const directB = await fetch(`${URL_}/rest/v1/business_settings?select=*`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  const rowsB = await directB.json().catch(() => null);
  check("anon cannot read business_settings directly",
    !Array.isArray(rowsB) || rowsB.length === 0, `${directB.status} ${JSON.stringify(rowsB).slice(0, 120)}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
