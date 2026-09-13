// ---------------------------------------------------------------------------
// THE WEATHER SEAM — the US National Weather Service, `api.weather.gov`
// ROADMAP.md § FREE THIRD-PARTY SERVICES → 1 · WEATHER, built 2026-09-13.
// ---------------------------------------------------------------------------
// **EVERY REQUEST THIS PRODUCT MAKES TO THE NWS GOES THROUGH THIS FILE.** That
// is the whole point of it and it is Andrew's instruction rather than a
// preference: *their own docs warn that an API key may be introduced later*, so
// the base URL and the User-Agent live in ONE place and the day a key arrives
// it is a one-file change instead of a week of grep. Same posture
// `_shared/translate.ts` takes for the two translation providers.
//
// ── ANDREW REFUSED WEATHER ONCE, AND THIS IS THE RECONSIDERATION HE ALLOWED ──
// `docs/ideas.md` item 02, 2026-09-06: *"I feel like detailers could kind of
// figure out their schedule themselves. And I don't think there should be
// auto-blocking if it's rain or whatever."* — **declined, reconsider only if it
// turns out to be genuinely free.** The NWS is genuinely free, which is the
// exact condition he named, and he re-ordered it himself on 2026-09-13.
// **SO THE SECOND HALF OF THAT REFUSAL STILL BINDS: THIS IS READ-ONLY.** It
// tells a detailer what the sky is going to do. It does not block a slot, move
// a job, warn a customer or cancel anything, and nothing built on top of it may
// either without asking him first. A *rain-day button* is idea 39 and he
// deferred that behind SMS.
//
// ── THE USER-AGENT IS NOT POLITENESS — MEASURED, NOT ASSUMED ────────────────
//   curl -H "User-Agent:" https://api.weather.gov/points/33.7701,-118.1937
//   -> 403
// A request without one is refused outright. He named this twice.
//
// ── DO NOT SWAP IN OPEN-METEO ───────────────────────────────────────────────
// It is better documented, it looks free, and **its free tier is NON-COMMERCIAL
// ONLY while this is a commercial product.** Anybody reaching for it is
// reaching for a licence breach. The reason is recorded here, beside the code
// that would be changed, rather than only in a roadmap nobody opens.
//
// ── NO `Deno` GLOBAL, AND ONE IMPORT, ON PURPOSE ────────────────────────────
// `tests/weather.test.mjs` imports THIS FILE and runs THIS FUNCTION against a
// stubbed `fetch`, so the checks assert what the code DOES rather than how it
// is spelled — CLAUDE.md trap (k), which produced three false failures against
// correct code in one day. The single import is `retryRead`, which is itself
// import-free.
import { retryRead } from "./retryRead.ts";

const BASE = "https://api.weather.gov";

// Identifies the application and gives them somebody to contact, which is what
// their docs ask for. Changing it is a deploy, not a migration.
const USER_AGENT = "detailingplatform.com (support@detailingplatform.com)";

const HEADERS = { "User-Agent": USER_AGENT, "Accept": "application/geo+json" };

/** One forecast period, exactly the fields a screen needs and no more. */
export type Period = {
  name: string;            // "Tonight", "Sunday", "Sunday Night"
  startTime: string;       // ISO, carrying the FORECAST POINT's offset, not ours
  endTime: string;
  isDaytime: boolean;
  temperature: number;     // Fahrenheit — `units: "us"` is what they answer
  precipChance: number | null;  // percent, or null when they did not forecast one
  windSpeed: string;       // "5 to 10 mph" — their words, a range, not a number
  shortForecast: string;   // "Patchy Fog then Partly Sunny"
  detailedForecast: string;
};

/** Why there is no forecast. Three reasons, because they are three different
 *  sentences on a screen — see the block below for why that matters. */
export type Reason =
  | "bad_point"         // our own validation: not a number, or off the globe
  | "outside_coverage"  // a real NWS answer: US-only, and this is not the US
  | "unavailable";      // 5xx, network, or a 200 we cannot read — TRY AGAIN

export type Forecast =
  | { ok: true; place: string | null; periods: Period[] }
  | { ok: false; reason: Reason; status?: number };

// ---------------------------------------------------------------------------
// **THERE IS NO CHEERFUL EMPTY IN THIS FILE, AND THAT IS THE DESIGN.**
// ---------------------------------------------------------------------------
// `FOUND.md`'s seventh costume is an instrument reporting fine when it cannot
// tell, and this product has already paid for it: `available-slots` answered
// 200 with a full month and not one bookable time, and nothing on the page
// could tell that from a detailer who was simply booked solid.
//
// So `ok: true` with an EMPTY `periods` is forbidden — a 200 from the NWS
// carrying no periods is `unavailable`, not "no weather". And
// `outside_coverage` is deliberately NOT the same reason as `unavailable`: one
// means *we will never have this, stop asking*, the other means *ask again in a
// minute*. A screen that renders both as "no forecast" has thrown away the one
// fact that decides what the detailer should do next.

// **`Number("")` IS 0, AND THAT ONE FACT IS WHY THE BLANK CASE IS FIRST.**
// Caught by `tests/weather.test.mjs` § 9 and § 11 within a minute of writing
// it: without the guard, a MISSING latitude becomes 0 and a missing chance of
// rain becomes "0%" — both of them a number nobody supplied, wearing the same
// face as one somebody did.
const num = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// **FOUR DECIMAL PLACES, AND THIS IS MEASURED.**
//   /points/33.770123,-118.193765  ->  301  ->  /points/33.7701,-118.1938
// The NWS redirects anything more precise. `fetch` follows the redirect, so the
// waste is invisible and costs an extra round trip on every single call.
// Rounding here means we never make the request they refuse.
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

type Fetcher = (url: string, init?: { headers: Record<string, string> }) => Promise<Response>;

/** GET with the User-Agent, retried on 5xx and on a network failure only.
 *  Reuses `retryRead`'s proven backoff rather than growing a second one — a
 *  weather GET is a read, and its 400ms/800ms wait outlasts a transient blip
 *  without pushing the caller past its own limit. */
async function get(url: string, f: Fetcher) {
  return await retryRead(`weather ${url}`, async () => {
    try {
      const res = await f(url, { headers: HEADERS });
      // `error` is what `retryRead` branches on; `status` is what decides
      // whether it tries again. A 404 is a final answer and is returned once.
      return { res, error: res.ok ? null : new Error(`HTTP ${res.status}`), status: res.status };
    } catch (err) {
      // A thrown fetch carries no status at all, and `retryRead` needs one to
      // see this as transient. 503 is the honest reading of "the network did
      // not answer", and it is our label rather than theirs.
      return { res: null as Response | null, error: err, status: 503 };
    }
  });
}

/**
 * The forecast for one point, or an honest reason there is not one.
 *
 * Two calls, because that is the shape of the NWS: `/points/{lat},{lon}` hands
 * back the URL of the grid square the point falls in, and the forecast hangs
 * off that. The grid never moves for a given point, so the first call is the
 * one worth caching the day anybody measures that it matters.
 * ponytail: no cache, two calls per forecast. Add one keyed on the rounded
 * point if a screen ever asks per job rather than once per day.
 *
 * `fetchImpl` exists so the test can run this function for real against a
 * stub. Nothing in the product passes it.
 */
export async function forecast(
  lat: unknown,
  lon: unknown,
  fetchImpl?: Fetcher,
): Promise<Forecast> {
  const f = fetchImpl ?? (globalThis.fetch as Fetcher);
  const la = num(lat), lo = num(lon);
  // OUR OWN VALIDATION, BEFORE THEIRS. Sending 999,999 to the NWS gets a 404
  // that is indistinguishable from "we do not cover Canada", and those two must
  // never reach a screen as the same sentence.
  if (la === null || lo === null || la < -90 || la > 90 || lo < -180 || lo > 180) {
    return { ok: false, reason: "bad_point" };
  }

  const point = await get(`${BASE}/points/${round4(la)},${round4(lo)}`, f);
  if (point.error || !point.res) {
    // 404 here is THEIR answer and it means US-only. Anything else is ours to
    // apologise for.
    return {
      ok: false,
      reason: point.status === 404 ? "outside_coverage" : "unavailable",
      status: point.status,
    };
  }

  let props: Record<string, unknown>;
  try {
    props = ((await point.res.json()) as { properties?: Record<string, unknown> })?.properties ?? {};
  } catch {
    return { ok: false, reason: "unavailable", status: point.status };
  }

  const url = typeof props.forecast === "string" ? props.forecast : "";
  // A 200 that does not carry a forecast URL is a shape we do not understand,
  // which is a failure to find out — not an absence of weather. And it must be
  // THEIR host: the URL we are about to fetch came out of a response body, so
  // anything else is a redirect we did not choose.
  if (!url.startsWith(`${BASE}/`)) return { ok: false, reason: "unavailable", status: point.status };

  // "Long Beach, CA" — their words for where the grid square actually is, which
  // is worth showing because it is often not the town the detailer typed.
  const rel = (props.relativeLocation as { properties?: { city?: string; state?: string } } | undefined)
    ?.properties;
  const place = rel?.city && rel?.state ? `${rel.city}, ${rel.state}` : null;

  const fc = await get(url, f);
  if (fc.error || !fc.res) return { ok: false, reason: "unavailable", status: fc.status };

  let periods: unknown;
  try {
    periods = ((await fc.res.json()) as { properties?: { periods?: unknown } })?.properties?.periods;
  } catch {
    return { ok: false, reason: "unavailable", status: fc.status };
  }
  if (!Array.isArray(periods) || periods.length === 0) {
    return { ok: false, reason: "unavailable", status: fc.status };
  }

  return { ok: true, place, periods: periods.map(shape) };
}

// Their row, our fields. `probabilityOfPrecipitation` is an OBJECT whose
// `value` is legitimately null, so it is read as three states and never
// flattened to 0 — "a 0% chance of rain" and "they did not forecast one" are
// different things to print.
function shape(p: unknown): Period {
  const r = (p ?? {}) as Record<string, unknown>;
  const pop = (r.probabilityOfPrecipitation ?? {}) as { value?: unknown };
  return {
    name: String(r.name ?? ""),
    startTime: String(r.startTime ?? ""),
    endTime: String(r.endTime ?? ""),
    isDaytime: r.isDaytime === true,
    temperature: num(r.temperature) ?? 0,
    precipChance: num(pop.value),
    windSpeed: String(r.windSpeed ?? ""),
    shortForecast: String(r.shortForecast ?? ""),
    detailedForecast: String(r.detailedForecast ?? ""),
  };
}
