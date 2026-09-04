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
// SHORT PASSWORDS ON PURPOSE, and this is a temporary state.
// The owner asked for a login simple enough to type on a phone (2026-08-30)
// so he can look at the dashboard on his own device. They reach the DEMO
// business only — RLS enforces tenant isolation in the database and
// tests/tenant-isolation.test.mjs proves it — so the worst a stranger who
// guesses one can do is scribble on fake data.
// **Change these before there is a single real customer.** See DECISIONS.md,
// "A guessable demo login, on purpose and temporarily".
const OWNER = { email: "demo@detailplatform.com", password: "demo123" };
const STAFF = { email: "demo-staff@detailplatform.com", password: "staff123" };

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
  // NOT `OWNER.email` — that is a SIGN-IN, and this is a MAILBOX. Found doing
  // roadmap 2.5 (2026-09-04): `notification_emails` is empty on the demo, so
  // every owner alert falls back to this address, and `detailplatform.com` is
  // a real registered domain that belongs to somebody else and has NO MX
  // record. `send-email`'s undeliverable-domain guard lets it straight
  // through — the domain looks ordinary — so a booking on the demo asked
  // Resend to deliver mail that can only hard-bounce, against the same
  // sending reputation that carries Andrew's real customers' receipts.
  // `example.com` is reserved (RFC 2606) and IS in that guard, so the demo's
  // owner alert is now skipped before it reaches the provider.
  contact_email: "demo@example.com",
  contact_phone: "562-555-0180",
  dropoff_address: "1450 Marina Blvd, Long Beach, CA",
  service_area: "Long Beach & South Bay",
}]);

await post("/rest/v1/business_users", [
  // The owner's own label and list stay empty — `owner` means everything, so
  // there is nothing to name and nothing to tick. Spelled out rather than
  // omitted because PostgREST refuses a bulk insert whose objects do not have
  // identical keys ("All object keys must match").
  { business_id: business.id, user_id: ownerId, role: "owner", email: OWNER.email, label: null, permissions: [] },
  // A NAMED ROLE WITH A REAL TICK LIST — roadmap 2.13. The demo is the only
  // business anything can sign into, so a membership left at the bare default
  // would mean the custom-role half of the Team screen is never rendered by
  // any check at any width. "Detailer" is what this trade calls the person who
  // does the work; requests is what staff already had, money is deliberately
  // OFF so the tab filter has something to actually hide.
  {
    business_id: business.id, user_id: staffId, role: "staff", email: STAFF.email,
    label: "Detailer", permissions: ["requests", "settings"],
  },
]);
await post("/rest/v1/business_settings", [{
  business_id: business.id,
  buffer_minutes: 45, min_advance_minutes: 120, slot_interval_minutes: 30,
  cancellation_window_hours: 24,
  google_review_url: "https://example.com/google-review",
  yelp_review_url: "https://example.com/yelp-review",
  // FIRST RUN, PINNED (roadmap 2.11 step 6, stage 7). `seen` so the setup
  // form never ambushes the demo — it is a fully set-up business, which is
  // the whole point of it — and `done` EMPTY so Business still carries the
  // "Finish setting up" row that `sweep-widths.mjs` opens the form from.
  // Six of the seven steps are derived from the demo's own data, so the row
  // reads "6 of 7 done" and the one hole is `where`, the only step nothing in
  // the schema can answer. Without this line the sweep loses the setup form
  // the first time somebody presses Continue on that step.
  setup: { done: [], seen: true, dismissed: false },
  // ROADMAP 2.8c. The demo carries one of each new pricing shape, because a
  // feature with no seed row is a feature nobody ever looks at — the same
  // reason roadmap 2.4 added a cancelled and a no-show booking. The travel fee
  // is set AND the areas are set, so the areas win: that is the case worth
  // seeing, and it is the one that costs height on the location step.
  travel_fee: 25,
  travel_zones: [
    { key: "long-beach", name: "Long Beach", fee: 0 },
    { key: "beyond-15", name: "Beyond 15 miles", fee: 40 },
  ],
  price_rules: [
    { label: "Weekend rate", kind: "time", weekdays: [0, 6], start_time: null, end_time: null,
      amount: 30, is_percent: false },
    { label: "Short notice", kind: "lead_time", within_hours: 24, amount: 20, is_percent: false },
  ],
  // ROADMAP 2.12, AND THIS IS A DELIBERATE CHOICE ABOUT THE DEMO RATHER THAN
  // ABOUT ANDREW. His own business reserves, and `reserve` is the schema
  // default every real tenant gets. The DEMO takes requests because it is the
  // only business `sweep-widths.mjs` can log into, and a reserve-mode demo
  // means the request queue — the whole of this roadmap item's screen work —
  // is never rendered at any width by anything. This repo has now written the
  // same finding six times: a script that cannot reach a state reports clean
  // on it. The two seeded requests below are what it walks.
  booking_mode: "request",
}]);
await post("/rest/v1/business_branding", [{
  business_id: business.id,
  primary_color: "#0ea5e9", secondary_color: "#0ea5e9",
  tagline: "Showroom clean, at your door.",
  about_copy: "Family-run mobile detailing serving Long Beach since 2019.",
}]);

// Open Tue–Sat, closed Sun/Mon — so the calendar shows real closed days.
//
// EXCEPT THAT THE CLOSED DAYS ARE DERIVED FROM TODAY, and that is the point of
// it. A demo business that is closed TODAY can only ever draw an empty Today
// screen, and that is exactly what happened: for the whole life of this
// product the busiest state of its busiest screen had never been looked at
// (docs/dashboard-architecture-2026-08-31.md §B4 row 21; roadmap 2.11 step 0
// exists to close it). So today’s weekday is dropped from the closed set.
// Five days in seven that changes nothing — closed Sunday and Monday, as
// before. On a Sunday the demo is closed Monday only; on a Monday, Sunday
// only. It is still a business with days off, the calendar still has closed
// cells to draw, and Today can always be seeded.
const TODAY = localDate(0);
// Noon UTC on the local date, so the weekday cannot slip across a DST edge.
const weekdayOf = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
const CLOSED = [0, 1].filter((wd) => wd !== weekdayOf(TODAY));

await post("/rest/v1/business_hours", [0, 1, 2, 3, 4, 5, 6].map((wd) => ({
  business_id: business.id, weekday: wd,
  open_time: CLOSED.includes(wd) ? null : "08:00",
  close_time: CLOSED.includes(wd) ? null : "18:00",
})));

// TWO CATEGORIES OF THREE, EACH PICK-ONE — reshaped in roadmap 2.8b, and the
// arrangement is not decoration. It is the owner's own menu shape ("Interior,
// Exterior… they could click one from each category"), it is what every
// measurement in docs/detailer-research-2026-08-31.md was taken against, and
// it is what `scripts/sweep-booking-steps.mjs` therefore keeps measuring.
//
// The old seed had FOUR services with FOUR distinct group_labels, so the
// migration's backfill produced four categories of one — which exercises none
// of the new rule and reads as a mistake on the booking page.
//
// Every service carries `features` now, because W21's disclosure is the thing
// that has to be looked at, and a demo with nothing behind the eye proves
// nothing. Two carry price_is_from, which is the other half of the same
// honesty: a coating quoted blind is a promise nobody can keep.
const groups = await post("/rest/v1/service_groups", [
  { business_id: business.id, name: "Exterior", sort_order: 0, max_select: 1 },
  { business_id: business.id, name: "Interior", sort_order: 1, max_select: 1 },
]);
const grp = (name) => groups.find((g) => g.name === name);

const services = await post("/rest/v1/services", [
  {
    business_id: business.id, name: "Express Wash", price: 65, duration_minutes: 60,
    description: "Our quickest outside clean — in and out in an hour.",
    price_is_from: false,
    features: ["Two-bucket hand wash", "Wheels, arches and tyres", "Bug and tar removal", "Hand dry and tyre dressing"],
    group_id: grp("Exterior").id, group_label: "Exterior", sort_order: 0,
  },
  {
    business_id: business.id, name: "Wash & Wax", price: 140, duration_minutes: 120,
    description: "Everything in the Express Wash, plus protection that lasts the season.",
    price_is_from: false,
    features: ["Everything in the Express Wash", "Clay bar decontamination", "Machine-applied carnauba wax", "Glass polished inside and out", "Three-month protection"],
    group_id: grp("Exterior").id, group_label: "Exterior", sort_order: 1,
  },
  {
    business_id: business.id, name: "Ceramic Coating", price: 650, duration_minutes: 300,
    description: "A two-year coating, applied over a full paint decontamination.",
    price_is_from: true,
    features: ["Full decontamination and paint prep", "Single-stage machine polish", "Two-year ceramic coating", "Wheels and glass coated", "Aftercare kit included"],
    group_id: grp("Exterior").id, group_label: "Exterior", sort_order: 2,
  },
  {
    business_id: business.id, name: "Interior Refresh", price: 95, duration_minutes: 90,
    description: "A tidy-up for a car that is used every day.",
    price_is_from: false,
    features: ["Vacuum throughout, including the boot", "Dashboard, console and door cards wiped", "Interior glass", "Mats cleaned and dressed"],
    group_id: grp("Interior").id, group_label: "Interior", sort_order: 3,
  },
  {
    business_id: business.id, name: "Interior Deep Clean", price: 150, duration_minutes: 150,
    description: "For carpets and seats that need more than a vacuum.",
    price_is_from: true,
    features: ["Everything in the Interior Refresh", "Carpets and cloth seats shampooed", "Steam clean on vents and seams", "Leather cleaned and conditioned", "Odour treatment"],
    group_id: grp("Interior").id, group_label: "Interior", sort_order: 4,
  },
  {
    business_id: business.id, name: "Full Interior Detail", price: 220, duration_minutes: 180,
    description: "The whole cabin taken back to as-new, panel by panel.",
    price_is_from: false,
    features: ["Everything in the Interior Deep Clean", "Seats removed where possible", "Headliner spot-cleaned", "Every vent, seam and switch by hand", "Ceramic protection on plastics", "Sealant on leather"],
    group_id: grp("Interior").id, group_label: "Interior", sort_order: 5,
  },
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

// A day the business is open (skip its closed weekdays), N days from today.
function openDay(fromOffset, direction = 1) {
  for (let i = 0; i < 20; i++) {
    const d = localDate(fromOffset + i * direction);
    if (!CLOSED.includes(weekdayOf(d))) return d;
  }
  return localDate(fromOffset);
}

// day0 IS ALWAYS TODAY NOW. It used to be "today if the business is open,
// otherwise the next open day", which is how a demo whose whole job is to be
// looked at came to date its finished-and-paid jobs TOMORROW — a state that
// cannot happen in life — while Today drew "No jobs booked for today."
const day0 = TODAY;

// THE NEXT OPEN DAY AFTER day0 — and it has to be derived FROM day0, not from
// a fixed offset. The two "tomorrow" bookings below used openDay(1), which is
// the next open day after TODAY, and on a Sunday or a Monday that is the same
// Tuesday day0 already resolved to. Both rows then overlapped the day0 jobs,
// the database's double-booking constraint refused them (23P01), and the seed
// printed "skipped" and carried on — so the Today screen's TOMORROW section
// read "Nothing booked yet" every weekend, on a demo whose whole job is to be
// looked at. Found in roadmap 2.4 while re-seeding on a Sunday.
// Every upcoming day is CHAINED off the one before it rather than measured
// from today, which is what makes them provably distinct. Offsets from today
// are not: openDay walks forward past the closed Sunday and Monday, so two
// different offsets collapse onto the same open day whenever a weekend sits
// between them, and the later booking is then refused. openDay(3) hit this
// too, one day after openDay(1) was fixed.
const dayOffset = (d) =>
  Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${localDate(0)}T12:00:00Z`)) / 86400000);
const after = (d, n) => openDay(dayOffset(d) + n);
const day1 = after(day0, 1);    // tomorrow-ish
const day2 = after(day1, 2);
const day3 = after(day2, 3);
const day4 = after(day3, 3);
// Roadmap 2.12 — two open days of their own for the requests below, because
// Ceramic Coating is five hours and every earlier day already has a job on it.
// The exclusion constraint would refuse the overlap and the seed would print
// "skipped", which is how a demo quietly loses the state a whole roadmap item
// was built to show.
const day5 = after(day4, 2);
const day6 = after(day5, 2);

// What a job costs and how long it takes. One place, because the seed now has
// to know a job’s END TIME before it can decide whether that job has happened.
const quote = (p) => {
  const service = svc(p.service);
  const adj = service.vehicle_size_adjustments?.[p.size] ?? { price: 0, duration_minutes: 0 };
  const addOn = p.addOn ? addOns.find((a) => a.name === p.addOn) : null;
  return {
    service, addOn, sizeAdj: adj,
    price: Number(service.price) + Number(adj.price) + (addOn ? Number(addOn.price) : 0),
    duration: Number(service.duration_minutes) + Number(adj.duration_minutes)
      + (addOn ? Number(addOn.duration_minutes) : 0),
  };
};

// TODAY — A FULL WORKING DAY, AND ITS STATUSES ARE READ OFF THE CLOCK.
//
// Roadmap 2.11 step 0. Today had never been photographed with anything on it,
// so nothing on this screen — the rail, the ledger strip, the lit card, "Done
// and paid", the warn-box — had ever been seen carrying data.
//
// Five jobs 08:00–18:00 with 45 minutes between them, which is `buffer_minutes`
// in this business’s own settings: a customer could actually have booked this
// day, and five is therefore the BUSIEST day these settings allow, not a number
// picked to look full.
//
// Nothing below says "completed". A job is completed once it has ENDED, which
// is the only rule that cannot print a finished job in the future — the defect
// this whole change exists to remove. Consequence worth knowing: what Today
// draws depends on the hour the seed is run. Seed in the morning and the day is
// ahead of you; seed after 18:00 and it is behind you. Both are real states.
const TODAY_SHIFTS = [
  { time: "08:00", who: "Marcus Webb",  service: "Express Wash",     size: "small"  },
  { time: "09:45", who: "Dana Ruiz",    service: "Interior Refresh", size: "medium" },
  { time: "12:15", who: "Priya Anand",  service: "Express Wash",     size: "medium", addOn: "Pet hair removal" },
  { time: "14:45", who: "Elena Marsh",  service: "Interior Refresh", size: "small"  },
  { time: "17:00", who: "Chris Vogel",  service: "Express Wash",     size: "small"  },
];
const nowMs = Date.now();
const hasEnded = (p) => Date.parse(toUtc(day0, p.time)) + quote(p).duration * 60_000 < nowMs;
const endedCount = TODAY_SHIFTS.filter(hasEnded).length;
// THE TWO MOST RECENT FINISHED JOBS HAVE NO PAYMENT RECORDED, and that state
// had never existed in this seed either: every "completed" row it wrote also
// carried `finalized_at`, so `needFinalize` was always empty. That is the one
// thing Today lights (docs/dashboard-skeletons.md §6 — money not yet recorded
// outranks the next job) and the only thing that draws the warn-box, and
// neither had rendered against data in the life of the product.
const TODAY_PLAN = TODAY_SHIFTS.map((p, i) => {
  if (!hasEnded(p)) return { ...p, day: day0, status: "confirmed" };
  if (i >= endedCount - 2) return { ...p, day: day0, status: "completed" };  // finished, unrecorded
  // A tip on the first one, so "Estimated ≠ Final" appears somewhere real.
  return { ...p, day: day0, status: "completed", paid: quote(p).price + (i === 0 ? 20 : 0) };
});

// Then upcoming across the next couple of weeks, plus history for the chart.
const PLAN = [
  ...TODAY_PLAN,
  { day: day1, time: "09:00", who: "Tom Okafor", service: "Full Interior Detail", size: "medium", status: "confirmed" },
  { day: day1, time: "14:00", who: "Elena Marsh", service: "Express Wash", size: "small", status: "confirmed" },
  { day: day2, time: "10:00", who: "Sam Delgado", service: "Ceramic Coating", size: "large", status: "confirmed" },
  { day: day3, time: "11:00", who: "Aisha Rahman", service: "Interior Deep Clean", size: "small", status: "confirmed" },
  { day: day4, time: "13:30", who: "Chris Vogel", service: "Full Interior Detail", size: "medium", status: "confirmed" },
  // History — completed, spread over previous months so the chart has shape.
  { day: openDay(-9, -1), time: "09:00", who: "Elena Marsh", service: "Full Interior Detail", size: "medium", status: "completed", paid: 235 },
  { day: openDay(-16, -1), time: "13:00", who: "Chris Vogel", service: "Express Wash", size: "small", status: "completed", paid: 65 },
  { day: openDay(-24, -1), time: "10:30", who: "Marcus Webb", service: "Interior Deep Clean", size: "large", status: "completed", paid: 195 },
  { day: openDay(-38, -1), time: "09:30", who: "Tom Okafor", service: "Ceramic Coating", size: "large", status: "completed", paid: 700 },
  { day: openDay(-45, -1), time: "14:00", who: "Dana Ruiz", service: "Full Interior Detail", size: "medium", status: "completed", paid: 240 },
  { day: openDay(-52, -1), time: "11:00", who: "Aisha Rahman", service: "Express Wash", size: "medium", status: "completed", paid: 80 },
  { day: openDay(-70, -1), time: "10:00", who: "Sam Delgado", service: "Full Interior Detail", size: "large", status: "completed", paid: 265 },
  { day: openDay(-78, -1), time: "15:00", who: "Priya Anand", service: "Interior Deep Clean", size: "small", status: "completed", paid: 150 },
  { day: openDay(-100, -1), time: "09:00", who: "Marcus Webb", service: "Full Interior Detail", size: "medium", status: "completed", paid: 220 },
  { day: openDay(-108, -1), time: "13:00", who: "Elena Marsh", service: "Express Wash", size: "small", status: "completed", paid: 65 },
  { day: openDay(-132, -1), time: "10:00", who: "Chris Vogel", service: "Ceramic Coating", size: "medium", status: "completed", paid: 650 },
  { day: openDay(-140, -1), time: "14:30", who: "Tom Okafor", service: "Express Wash", size: "large", status: "completed", paid: 95 },
  // ONE CANCELLED AND ONE NO-SHOW, added in roadmap 2.4. Until then the demo
  // had NEITHER — twenty-one bookings, every one confirmed or completed — so
  // the whole family of "Cancelled" and "No-show" styling could not be seen
  // in a browser at all. That is why a red "Paid" beside a red "Cancelled"
  // survived unnoticed: the screen that would have shown it had no row to
  // show. Both are in the recent past so they land in the History list and
  // the no-show reaches the month grid. Keep them: a status with no seed row
  // is a status nobody ever looks at.
  { day: openDay(-4, -1), time: "11:30", who: "Aisha Rahman", service: "Full Interior Detail", size: "medium", status: "cancelled" },
  { day: openDay(-6, -1), time: "16:00", who: "Sam Delgado", service: "Express Wash", size: "small", status: "no_show" },
  // ROADMAP 2.12 — TWO REQUESTS, AND THEY ARE TWO BECAUSE THE CARD HAS TWO
  // STATES. The first is untouched; the second already has a quote out, which
  // is the only thing on that card the controls do not say and the only state
  // where the record shows two numbers. Both are in the FUTURE — Today's queue
  // is deliberately floored at `now`, because a request whose time has gone is
  // not something to accept.
  // They also make `pending` a status with a seed row, which is the rule
  // roadmap 2.4 wrote when it added the cancelled and the no-show: a status
  // nothing seeds is a status nobody ever looks at.
  { day: day5, time: "10:00", who: "Dana Ruiz", service: "Interior Deep Clean", size: "medium", status: "pending" },
  { day: day6, time: "08:30", who: "Marcus Webb", service: "Ceramic Coating", size: "large", status: "pending",
    quote: { amount: 780, note: "The paint needs a correction pass before the coating goes on — that's the extra." } },
];

let made = 0;
for (const p of PLAN) {
  const c = cust(p.who);
  const { service, addOn, sizeAdj, price, duration } = quote(p);
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
      // Roadmap 2.12 — a quote OFFERED, never a price charged. total_price
      // above is still what the customer asked for, which is the point.
      quoted_amount: p.quote?.amount ?? null,
      quoted_note: p.quote?.note ?? null,
      quoted_at: p.quote ? new Date().toISOString() : null,
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

// THREE REVIEWS, because the Reviews screen shipped in roadmap 2.11 step 6
// stage 6 and a screen swept with nothing on it proves nothing — the row is
// a name, a rating and somebody else’s SENTENCE, and a sentence is the thing
// that runs off the edge at 320. One long, one short, one hidden.
const REVIEWS = [
  ["Marcus T.", 5, "Google", "Booked him for a wash and wax on a car I had honestly given up on, and it came back looking better than the day I bought it. He showed up on time, worked around my street parking, and did not disappear for four hours.", true],
  ["Priya R.", 5, "In person", "Interior refresh on a car with two kids in it. Immaculate.", true],
  ["Dan W.", 4, null, "Good job on the coating, took a bit longer than quoted.", false],
];
await post("/rest/v1/testimonials", REVIEWS.map(([author, rating, source, quote, is_active], i) => ({
  business_id: business.id, author, rating, source, quote, sort_order: i, is_active,
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
  Customers: ${customers.length}   Categories: ${groups.length}   Services: ${services.length}   Expenses: ${EXPENSES.length}   Reviews: ${REVIEWS.length}
  Owner    : ${OWNER.email} / ${OWNER.password}
  Staff    : ${STAFF.email} / ${STAFF.password}
`);
