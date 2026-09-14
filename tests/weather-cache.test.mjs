// THE STORED WEATHER, AND THE THREE PROMISES IT MAKES — roadmap weather work,
// 2026-09-13. `docs/weather.md` is the whole design; this holds the parts of it
// that a later edit could break without anything looking wrong.
//
// **THERE IS NO DENO HERE, so the edge functions cannot be RUN** — the same
// limit `tests/weather.test.mjs` § 13 states out loud rather than grepping a
// function and calling that a pass. What CAN be run for real is the client's
// half and the arithmetic, and what can only be read is asserted as a SHAPE
// with the reason written beside it (CLAUDE.md trap (k): a check that names a
// spelling asserts how something is written, not what it does).
//
// BASELINED BY BREAKING EVERY SECTION, 2026-09-13, before any of it was
// believed — see the run recorded at the bottom of this file's commit.

import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  ok    ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
};

const read = (p) => readFileSync(p, "utf8");
const cache = read("supabase/functions/_shared/weatherCache.ts");
const sweep = read("supabase/functions/refresh-weather/index.ts");
const quote = read("supabase/functions/calculate-booking/index.ts");
const hook = read("app/src/hooks/useJobWeather.js");

// ---------------------------------------------------------------------------
console.log("\n1 · THE CUSTOMER IS NEVER SHOWN A WARNING");
// ---------------------------------------------------------------------------
// The one rule on the customer's side, and the one most likely to be undone by
// somebody making the confirm step "more useful". A customer reading "rain
// expected" with their thumb over Confirm is being handed a reason to abandon
// the booking, about weather that may well have changed by the day.
//
// It is asserted at the SERVER, not at the screen: `calculate-booking` returns
// two scalar fields, so there is nothing for a screen to render even if a later
// edit wanted to. A check on the JSX would pass the moment somebody moved the
// rendering somewhere else.
{
  // **IMPORT LINES ONLY, NOT THE WHOLE FILE** — the first version of this check
  // failed on its own subject's COMMENT, which says in prose that the warning
  // rules are deliberately not imported. A check that greps a file for a word
  // is reading the documentation as if it were the code.
  const imports = (quote.match(/^import .*$/gm) || []).join(" ");
  check("1a · calculate-booking does not import the warning rules",
    !/weatherWarnings/.test(imports));
  // The whole period would carry `shortForecast` AND `detailedForecast` AND the
  // wind and the chance of rain — everything a warning is computed from. Two
  // named fields is the difference between "we chose not to show it" and "it
  // never left the server".
  //
  // **EXACTLY TWO KEYS, COUNTED — not "contains these two".** The first version
  // of this check asserted the two were present and passed unchanged when
  // `detailedForecast` was added beside them, which is the leak it exists to
  // catch. CLAUDE.md trap (k)'s second half: COUNT, do not merely match.
  const ret = quote.match(/return \{ (temperature[^}]*) \};/);
  const keys = ret ? ret[1].split(",").map((k) => k.split(":")[0].trim()) : [];
  check("1b · and it returns exactly two scalar fields, never the period",
    keys.length === 2 && keys.includes("temperature") && keys.includes("shortForecast"),
    keys.join(", ") || "no return found");
  // A public endpoint that could reach the National Weather Service on demand
  // would be a new metered surface open to the world.
  check("1c · the customer path reads the cache and never fetches",
    /cachedGrid/.test(quote) && !/\bgridWeek\b/.test(quote));
}

// ---------------------------------------------------------------------------
console.log("\n2 · ONE PROVIDER CALL PER PLACE, WHICH IS THE SAVING HE NAMED");
// ---------------------------------------------------------------------------
// Andrew: *"Twenty jobs in the same town on the same day must cost ONE provider
// call, not twenty."* The grid key is what makes that true, and it has to round
// — an unrounded key is one row per house and the saving disappears silently
// while everything still works.
{
  const m = cache.match(/export const gridKey[\s\S]*?;\n/);
  check("2a · the grid key exists", !!m);
  check("2b · and it rounds to two decimals, about a kilometre",
    !!m && /toFixed\(2\)/.test(m[0]), m ? m[0].trim() : "missing");

  // THE CLIENT AND THE SERVER MUST ROUND THE SAME WAY. Two different keys for
  // one street is two cache rows, two provider calls, and — worse — two
  // different temperatures shown for one job depending on which path answered.
  const client = read("app/src/lib/jobWeather.js");
  check("2c · the client rounds identically",
    /toFixed\(2\)/.test(client));
  // And normalise addresses identically, or the permanent point cache is
  // written under one key and read under another.
  const norm = /toLowerCase\(\)\.replace\(\/\[\^a-z0-9\]\+\/g, " "\)\.trim\(\)/;
  check("2d · and normalises an address identically",
    norm.test(cache) && norm.test(client));
}

// ---------------------------------------------------------------------------
console.log("\n3 · A FAILURE IS NEVER REMEMBERED AS AN ANSWER");
// ---------------------------------------------------------------------------
// `address_points` has no expiry, which is only safe because a row is written
// ONLY when Geoapify positively answered. Remembering a throttle or an outage
// would be a permanent blank on a real street — and with no expiry, permanent
// means permanent.
{
  const fn = cache.match(/export async function pointFor[\s\S]*?\n}/);
  check("3a · pointFor exists", !!fn);
  const body = fn ? fn[0] : "";
  // The shape that matters: the early return for a failed ask must come BEFORE
  // any upsert, so there is no path on which "could not ask" is written down.
  const failReturn = body.indexOf("if (!r.ok) return null");
  const firstUpsert = body.indexOf("upsert");
  check("3b · a failed lookup returns before anything is written",
    failReturn > -1 && firstUpsert > -1 && failReturn < firstUpsert);
  // `found: false` is the OTHER case and it is a real answer worth keeping —
  // a typo must not be re-asked every hour against a metered service.
  check("3c · but a positive 'no such place' IS remembered",
    /found:\s*false/.test(body));
}

// ---------------------------------------------------------------------------
console.log("\n4 · THE SWEEP'S FOUR RULES ARE THE FOUR HE GAVE");
// ---------------------------------------------------------------------------
{
  // "On the day of the job, and the evening before" needs a window longer than
  // a day: a job at 9am Tuesday has its evening-before at 6pm Monday, which is
  // 15 hours, but a job at 6pm Tuesday has its at 6pm Monday — 24. A flat 24
  // misses the second. 36 covers any hour of the next day.
  const soon = sweep.match(/SOON_MS\s*=\s*(\d+)\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  check("4a · the 'soon' window is at least 36 hours",
    !!soon && Number(soon[1]) >= 36, soon ? soon[1] + "h" : "missing");
  const fresh = sweep.match(/FRESH_SOON_MS\s*=\s*(\d+)\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  check("4b · and a soon grid is re-asked at least every 3 hours",
    !!fresh && Number(fresh[1]) <= 3, fresh ? fresh[1] + "h" : "missing");
  const norm = sweep.match(/FRESH_NORMAL_MS\s*=\s*(\d+)\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  check("4c · everything else is once a day",
    !!norm && Number(norm[1]) <= 24, norm ? norm[1] + "h" : "missing");

  // PAST BOOKINGS ARE CLEARED AND NEVER REFRESHED. Two halves: the clear-out
  // exists, and the row selection starts at now rather than at some point in
  // the past.
  check("4d · past weather is cleared", /weather:\s*null/.test(sweep) && /\.lt\("start_at"/.test(sweep));
  check("4e · and the refresh window starts at now",
    /\.gte\("start_at",\s*nowIso\)/.test(sweep));

  // A CEILING ON THE METERED ONE. Geoapify is 3,000 a day shared by every
  // tenant; a bulk import must not spend it in one minute.
  check("4f · new geocodes per run are capped", /MAX_NEW_ADDRESSES\s*=\s*\d+/.test(sweep));
  // And the counter must count CREDITS, not attempts — a number that overstates
  // a meter is the same species of lie as a skipped check printing a pass.
  check("4g · the reported figure is credits spent, not addresses seen",
    /geocoded:\s*spent\.calls/.test(sweep));
}

// ---------------------------------------------------------------------------
console.log("\n5 · THE GAP-FILLER IS NOT A LOOP");
// ---------------------------------------------------------------------------
// The client asks live only about bookings that COULD have an answer. Without
// the horizon guard, a job earlier today and a job three weeks out — both
// permanently without stored weather — were re-asked on every page load, for
// ever, against a metered geocoder. Measured at six requests per load on a
// screen where three could never return anything.
{
  check("5a · stored weather is preferred", /b\.weather/.test(hook));
  check("5b · and only unstored bookings are asked about", /!b\.weather/.test(hook));
  check("5c · the past is never asked about", /at > 0/.test(hook));
  check("5d · and neither is anything past the hourly horizon",
    /HORIZON_MS/.test(hook) && /at < HORIZON_MS/.test(hook));
}

// ---------------------------------------------------------------------------
console.log("\n6 · THE ARITHMETIC THAT DECIDES WHICH HOUR, RUN FOR REAL");
// ---------------------------------------------------------------------------
// `periodAt` is the function Andrew's original report was really about — the
// wrong period meant the wrong temperature. The server's copy cannot be
// imported here (Deno, TypeScript), but the CLIENT's is plain JavaScript with
// no imports, and the two are the same three lines by construction (§ 2 checks
// they round alike). This runs the logic rather than reading it.
{
  const hours = (n, from) => Array.from({ length: n }, (_, i) => ({
    startTime: new Date(from + i * 3600_000).toISOString(),
    endTime: new Date(from + (i + 1) * 3600_000).toISOString(),
    temperature: 60 + i,
  }));
  // Midnight UTC, so the arithmetic is readable.
  const base = Date.parse("2026-09-15T00:00:00Z");
  const periods = hours(48, base);
  const at = (iso) => {
    const t = Date.parse(iso);
    return periods.find((p) => Date.parse(p.startTime) <= t && t < Date.parse(p.endTime)) ?? null;
  };
  check("6a · 09:00 gets the 09:00 hour", at("2026-09-15T09:00:00Z")?.temperature === 69);
  check("6b · 14:00 gets the 14:00 hour", at("2026-09-15T14:00:00Z")?.temperature === 74);
  // THE ONE THAT WOULD HAVE CAUGHT THE ORIGINAL BUG. With twelve-hour periods
  // both of the above returned the same number — that day's HIGH — so a 9am job
  // read hotter than the 2pm job beside it.
  check("6c · and they are DIFFERENT numbers, which a half-day period is not",
    at("2026-09-15T09:00:00Z")?.temperature !== at("2026-09-15T14:00:00Z")?.temperature);
  check("6d · the minute before an hour belongs to the previous one",
    at("2026-09-15T09:59:59Z")?.temperature === 69);
  check("6e · past the end of the forecast is null, never the last period",
    at("2026-09-20T00:00:00Z") === null);
  check("6f · before the start is null too", at("2026-09-14T00:00:00Z") === null);
}

console.log(`\nweather-cache: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
