// Two businesses that disagree about everything, for testing the public
// booking page. Chosen so that ANY leak between them is visible rather than
// subtle: opposite brand colours, opposite service modes, two services vs
// seven, opposite coasts, and booking rules that contradict each other.
//
//   node scripts/seed-two-tenants.mjs
//
// Idempotent — deletes and recreates both.

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const H = {
  apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
  "Content-Type": "application/json", Prefer: "return=representation",
};
const post = async (p, b) => {
  const r = await fetch(URL_ + p, { method: "POST", headers: H, body: JSON.stringify(b) });
  const d = await r.json().catch(() => null);
  if (r.status >= 300) throw new Error(`${p} -> ${r.status} ${JSON.stringify(d).slice(0, 300)}`);
  return d;
};
const del = (p) => fetch(URL_ + p, { method: "DELETE", headers: H });

const TENANTS = [
  {
    slug: "demo-riverside",
    name: "Riverside Mobile Detail",
    timezone: "America/New_York",
    contact_phone: "(555) 201-4477",
    contact_email: "hello@riverside.test",
    service_area: "Greater Riverside",
    dropoff_address: null,
    branding: { primary_color: "#dc2626", tagline: "We come to your driveway" },
    settings: {
      mobile_enabled: true, dropoff_enabled: false,
      ask_water_electric: true, travel_fee: 25,
      slot_interval_minutes: 60, buffer_minutes: 45,
      min_advance_minutes: 1440, max_advance_days: 30,
      cancellation_window_hours: 48,
      site_discount_active: true, site_discount_percent: 10, site_discount_label: "New customer 10% off",
    },
    // Two services. A small menu must look deliberate, not broken.
    services: [
      { name: "Full Mobile Detail", price: 240, duration_minutes: 210, description: "Inside and out, at your place.", sort_order: 0 },
      { name: "Express Wash & Vac", price: 95, duration_minutes: 75, description: "A quick reset between details.", sort_order: 1 },
    ],
    addOns: [{ name: "Pet hair removal", price: 45, duration_minutes: 30 }],
    hours: [1, 2, 3, 4, 5].map((d) => ({ weekday: d, open_time: "08:00", close_time: "17:00" })),
  },
  {
    slug: "demo-ironclad",
    name: "Ironclad Ceramic Studio",
    timezone: "America/Phoenix",
    contact_phone: "(555) 909-3120",
    contact_email: "front@ironclad.test",
    service_area: null,
    dropoff_address: "1180 W Kiln Rd, Tempe",
    branding: { primary_color: "#059669", tagline: "Coatings, correction, glass" },
    settings: {
      mobile_enabled: false, dropoff_enabled: true,
      ask_water_electric: false, travel_fee: 0,
      slot_interval_minutes: 30, buffer_minutes: 15,
      min_advance_minutes: 120, max_advance_days: 120,
      cancellation_window_hours: 12,
      site_discount_active: false,
    },
    // Seven services across three group labels — the flat-list-of-any-length
    // case, and the grouped-headings case, in one tenant.
    services: [
      { group_label: "Paint correction", name: "One-Step Polish", price: 450, duration_minutes: 300, sort_order: 0 },
      { group_label: "Paint correction", name: "Two-Step Correction", price: 850, duration_minutes: 600, sort_order: 1 },
      { group_label: "Paint correction", name: "Three-Step Show Finish", price: 1400, duration_minutes: 900, sort_order: 2 },
      { group_label: "Coatings", name: "2-Year Ceramic", price: 900, duration_minutes: 420, sort_order: 3 },
      { group_label: "Coatings", name: "5-Year Ceramic", price: 1600, duration_minutes: 540, sort_order: 4 },
      { group_label: "Glass & trim", name: "Glass Coating", price: 180, duration_minutes: 90, sort_order: 5 },
      { group_label: "Glass & trim", name: "Trim Restoration", price: 220, duration_minutes: 120, sort_order: 6 },
    ],
    addOns: [
      { name: "Engine bay detail", price: 120, duration_minutes: 60 },
      { name: "Headlight restoration", price: 140, duration_minutes: 75 },
    ],
    hours: [2, 3, 4, 5, 6].map((d) => ({ weekday: d, open_time: "07:00", close_time: "16:00" })),
  },
];

for (const t of TENANTS) {
  await del(`/rest/v1/businesses?slug=eq.${t.slug}`);
  const biz = (await post("/rest/v1/businesses", [{
    slug: t.slug, name: t.name, timezone: t.timezone,
    // ROADMAP 6.2 — a demo is never counted against the founding cap. These
    // two are standard-tier today, so it changes nothing yet; marking them is
    // what stops the next person who makes one founding from quietly telling
    // every visitor a spot is gone.
    is_demo: true,
    contact_phone: t.contact_phone, contact_email: t.contact_email,
    service_area: t.service_area, dropoff_address: t.dropoff_address,
  }]))[0];

  await post("/rest/v1/business_branding", [{ business_id: biz.id, ...t.branding }]);
  await post("/rest/v1/business_settings", [{ business_id: biz.id, ...t.settings }]);
  await post("/rest/v1/services", t.services.map((s) => ({ business_id: biz.id, is_active: true, ...s })));
  await post("/rest/v1/add_ons", t.addOns.map((a) => ({ business_id: biz.id, is_active: true, ...a })));
  await post("/rest/v1/business_hours", t.hours.map((h) => ({ business_id: biz.id, ...h })));

  console.log(`${t.slug.padEnd(16)} ${t.name.padEnd(28)} ${t.branding.primary_color}  ${t.services.length} services  ${t.timezone}`);
}
console.log("\n/book/demo-riverside  and  /book/demo-ironclad");
