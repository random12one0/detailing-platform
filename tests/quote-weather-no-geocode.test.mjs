// ROADMAP 100.3 — the public quote endpoint spent the shared Geoapify day
// outside address-suggest's limits (audit R1-02).
//
//   node --test tests/quote-weather-no-geocode.test.mjs
//   QUOTE_BREAK=geocode node tests/quote-weather-no-geocode.test.mjs   # must go red
//
// Credential-free: no network, no database, no Geoapify credit. The break is an
// ENV VAR, not a flag: `node --test` swallows extra arguments (gotcha 104).
//
// THE DEFECT: `calculate-booking`'s confirmWeather called `pointFor`, which
// geocodes any address not in `address_points` through `suggest()` with no
// address-specific limit, and the booking page re-quotes on each keystroke of
// an address edit. Each never-seen address cost one credit and one cache row.
//
// WHAT IT ASKS, running the REAL calculate-booking handler over the REAL
// weatherCache.ts (only `supabase`, `suggest` and `forecast` are stand-ins):
// ten quotes with ten never-seen addresses call the provider ZERO times and
// write ZERO `address_points` rows; and an address that IS cached still gets
// its weather line, so the fix did not just switch the feature off.
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const BREAK = process.env.QUOTE_BREAK || "";
if (BREAK && BREAK !== "geocode") { console.error(`Unknown QUOTE_BREAK=${BREAK}. Known: geocode.`); process.exit(2); }

const IMPORTS = /^import\s+(?:"[^"\n]+"|[\s\S]*?\sfrom\s+"[^"\n]+")\s*;\s*$/gm;
const ts = (path) => stripTypeScriptTypes(readFileSync(path, "utf8"));

// A stand-in database: two tables, the four calls weatherCache makes.
const rows = { address_points: new Map(), weather_grids: new Map() };
const KEY_COL = { address_points: "key", weather_grids: "grid_key" };
const supabase = {
  from(table) {
    let val;
    return {
      select() { return this; },
      eq(_c, v) { val = v; return this; },
      maybeSingle: async () => ({ data: rows[table].get(val) ?? null }),
      upsert: async (row) => { rows[table].set(row[KEY_COL[table]], row); return { error: null }; },
    };
  },
};
let providerCalls = 0;
const suggest = async (q) => { providerCalls++; return { ok: true, suggestions: [{ lat: 34.05, lon: -118.24, label: q }] }; };
const forecast = async () => { throw new Error("the quote must never fetch a forecast"); };

globalThis.__wc = { supabase, suggest, forecast };
const cache = await import("data:text/javascript;base64," + Buffer.from(
  "const { supabase, suggest, forecast } = globalThis.__wc;\n" +
  ts("supabase/functions/_shared/weatherCache.ts").replace(IMPORTS, ""),
).toString("base64"));
const tz = await import("data:text/javascript;base64," + Buffer.from(ts("supabase/functions/_shared/tz.ts")).toString("base64"));

const BUSINESS = { id: "tenant-a", slug: "quote-proof", timezone: "America/Los_Angeles", dropoff_address: null };
let handler;
{
  let src = ts("supabase/functions/calculate-booking/index.ts").replace(IMPORTS, "");
  if (BREAK === "geocode") {
    const broken = src.replace("await cachedPoint(address)", "await pointFor(address)");
    if (broken === src) throw new Error("sabotage did not land");
    src = broken;
  }
  const deps = {
    ...cache, Deno: { serve(fn) { handler = fn; } }, supabase,
    json: (data, status = 200) => ({ status, data }), preflight: () => ({ status: 204 }),
    businessBySlug: async () => BUSINESS, getSettings: async () => ({ price_rounding_nearest: 0, buffer_minutes: 0 }),
    resolveServices: async () => [{ id: "s1", name: "Wash", price: 100, duration_minutes: 60 }],
    resolveAddOns: async () => [], resolvePromo: async () => null, resolvePlan: async () => null,
    resolveVehicles: () => [{}], resolveTravel: async () => ({ fee: 0, zone: null }),
    whenContextFor: () => ({}), matchPriceRules: () => [], planInputFor: () => null,
    computeQuote: () => ({ basePrice: 100, sizeAdd: 0, addOnsTotal: 0, travelFee: 0, adjustmentLines: [],
      subtotalBase: 100, siteDiscount: 0, subtotalAfterSite: 100, promoDiscount: 0, total: 100, totalDurationMinutes: 60 }),
    localDateTimeToInstant: tz.localDateTimeToInstant, weekdayOf: tz.weekdayOf,
    withinLimits: async () => true, ipOf: () => "fixture", LIMITS: { publicCeiling: {} },
  };
  new Function(...Object.keys(deps), src)(...Object.values(deps));
  if (!handler) throw new Error("calculate-booking handler did not load");
}
const quote = async (address) => {
  const r = await handler({ method: "POST", headers: new Headers(), json: async () => ({
    business_slug: BUSINESS.slug, service_ids: ["s1"], service_type: "mobile",
    booking_date: "2026-11-02", start_time: "10:00", customer_address: address,
  }) });
  if (r.status !== 200) throw new Error(`calculate-booking answered ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
};

let failed = 0;
const check = (name, ok, got = "") => { console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : ` - got ${got}`}`); if (!ok) failed++; };

console.log("1 · never-seen addresses cost nothing");
for (let i = 0; i < 10; i++) await quote(`${100 + i} Never Seen St, Springfield`);
check("1a · ten quotes made zero provider calls", providerCalls === 0, String(providerCalls));
check("1b · and wrote zero address_points rows", rows.address_points.size === 0, String(rows.address_points.size));

console.log("2 · a cached address still gets its weather line");
rows.address_points.set(cache.addressKey("1 Known Ave"), { key: "1 known ave", lat: 34.05, lon: -118.24, found: true });
rows.weather_grids.set(cache.gridKey(34.05, -118.24), { grid_key: "34.05,-118.24", place: "LA", fetched_at: new Date().toISOString(),
  periods: [{ startTime: "2026-11-02T00:00:00-08:00", endTime: "2026-11-03T00:00:00-08:00", temperature: 71, shortForecast: "Sunny" }] });
const known = await quote("1 Known Ave");
check("2a · weather is { 71, Sunny }", known.weather?.temperature === 71 && known.weather?.shortForecast === "Sunny", JSON.stringify(known.weather));
check("2b · still with zero provider calls", providerCalls === 0, String(providerCalls));

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exitCode = failed ? 1 : 0;
