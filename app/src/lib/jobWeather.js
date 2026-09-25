// GETTING THE SKY OVER A BOOKED JOB — the fetching half. `lib/weather.js` is
// the judgement half and knows nothing about the network; this file is the
// network and holds no opinion about what is worth warning about.
//
// ---------------------------------------------------------------------------
// THE ADDRESS IS THE INPUT, AND THAT IS ANDREW'S CORRECTION — 2026-09-13.
// ---------------------------------------------------------------------------
// *"It never even needs the client's location. It just needs the address of
// where it's located at."* The first build asked the browser where the
// DETAILER was standing, which answers a question nobody had: a job booked for
// Thursday at a house nine miles away is not the sky outside the van today.
//
// A mobile job's address is the customer's; a drop-off job's is the shop's.
// Both are free text, so a point has to be found for them.
//
// ---------------------------------------------------------------------------
// **TWO CACHES, AND THEY EXPIRE DIFFERENTLY BECAUSE THEY ARE DIFFERENT KINDS
// OF FACT.** This is the whole cost story, and it is the thing to get right.
// ---------------------------------------------------------------------------
//   · A STREET DOES NOT MOVE. `dp.weather.points` maps an address to its point
//     in `localStorage` and never expires. A detailer with thirty regulars
//     spends thirty lookups on that device, once, ever.
//   · A FORECAST GOES STALE. Held in memory only, for an hour, keyed on the
//     rounded point rather than on the address — two jobs on the same street
//     are one request, and so are two jobs a mile apart, because the National
//     Weather Service forecasts a grid and not a house.
//   · AND NOTHING IS FETCHED PER ROW. `loadJobWeather` is called once with the
//     whole list; `inFlight` means ten rows sharing one address make one call
//     even when they ask at the same instant.
//
// The address lookup is metered — Geoapify's free plan is 3,000 credits a day
// SHARED BY EVERY TENANT (`_shared/rateLimit.ts`), which is why the permanent
// cache is not an optimisation here but the thing that makes the feature
// affordable at all.
//
// ponytail: the point cache is per-device. A shared server-side cache
// (`address_points`) is the upgrade if the daily ceiling ever gets close; with
// no detailers on the product it would be a table holding nothing.
//
// ---------------------------------------------------------------------------
// THE HORIZON IS REAL AND IT IS NOT AN ERROR — his instruction.
// ---------------------------------------------------------------------------
// *"Forecasts only reach about 7-14 days out — bookings past that show
// nothing, not an error and not a made-up number."* The NWS answers roughly
// seven days of ONE-HOUR periods — hourly, so the number on a row is the
// temperature at the hour the job starts rather than that half-day's high, and
// the warning is judged on the same number. A booking past the last period has
// no entry in the map this returns, and every screen renders nothing for it.
// **There is deliberately no "we don't know yet" chip**: a row that says
// nothing is honest, and a row that says *unknown* on every job three weeks out
// is a column of noise.
//
// EVERY FAILURE IS SILENCE, for the same reason. A dropped connection, a 503,
// an address Geoapify has never heard of, a detailer outside the United States
// — all of them are an absent entry. This is a courtesy line about the
// weather; an error box about it would be louder than the thing itself.
//
// ---------------------------------------------------------------------------
// **ONE FAILURE IS NOT LIKE THE OTHERS, AND SILENCE MAKES IT WORSE — the
// unnumbered Wave 14 item, measured 2026-09-24.**
// ---------------------------------------------------------------------------
// The geocode above spends the **address-TYPING** allowance: `address-suggest`
// is budgeted at **60 an hour per IP**, a number sized for a customer typing a
// street badly, and a detailer working through their own records spends one
// per address they have not looked at before. When the hour's sixty are gone
// the endpoint answers **429**, and everything below used to treat that
// exactly like a dropped connection: nothing was remembered, so **every
// further record opened spent another call that could not possibly
// succeed.** Measured on ten job records and then the first one again —
// **eleven refusals for eleven opens, with no ceiling.**
//
// **A REFUSAL IS THE ONE FAILURE THAT REPEATS ITSELF**, because it is about
// this browser's whole hour and not about this address. So it is remembered —
// briefly, and in `localStorage` rather than in this module, because the thing
// it has to survive is a detailer opening the next record, which on a deep
// link is a fresh page and a fresh module. Five minutes: long enough that
// browsing costs one call instead of one per record, short enough that the
// weather comes back on its own without anybody reloading anything.
//
// **AND IT IS THE ONE FAILURE THAT EARNS A SENTENCE.** `addressBusy()` is
// exported for the screen, so the record can say what happened where the sky
// would have been. Every other failure stays silent, for the reason above:
// only a throttle clears, so only a throttle is worth telling somebody about.
// It is NOT cached as "no such place" — a rationed hour must never become a
// permanent blank.

import { api } from "./api.js";
import { addressFault } from "../book/core.js";

const POINTS_KEY = "dp.weather.points";
const BUSY_KEY = "dp.weather.busy";
const BUSY_MS = 5 * 60 * 1000;
const FORECAST_TTL = 60 * 60 * 1000;

// The memo, in memory AND in storage: storage is what survives the next page,
// memory is what keeps working in a private window where storage throws.
let busyAt = 0;
const storedBusy = () => {
  try { return Number(localStorage.getItem(BUSY_KEY)) || 0; } catch { return 0; }
};
const markBusy = () => {
  busyAt = Date.now();
  try { localStorage.setItem(BUSY_KEY, String(busyAt)); } catch { /* private mode */ }
};

/** True while the address lookup is refusing this browser. The screen reads
 *  it to say so; `pointFor` reads it to stop asking. */
export const addressBusy = () =>
  Date.now() - Math.max(busyAt, storedBusy()) < BUSY_MS;

// A key that ignores what does not change a place: capitals, punctuation and
// the number of spaces. "123 Oak St., Apt 4" and "123 oak st apt 4" are one
// lookup and one credit.
const addressKey = (s) =>
  String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const readPoints = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(POINTS_KEY) ?? "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch { return {}; }
};

const writePoint = (key, value) => {
  try {
    const all = readPoints();
    all[key] = value;
    localStorage.setItem(POINTS_KEY, JSON.stringify(all));
  } catch { /* private mode, or full — the lookup simply happens again */ }
};

// In-memory mirrors so a screen that renders twice does not touch storage
// twice, plus the in-flight maps that collapse concurrent askers onto one call.
const points = new Map();
const forecasts = new Map();
const inFlightPoint = new Map();
const inFlightForecast = new Map();

/** `{lat, lon}`, or null when there is no answer worth waiting for. `null` is
 *  remembered ONLY when the service positively said it knows no such place —
 *  a throttle or an outage must not turn into a permanent blank. */
async function pointFor(address) {
  const key = addressKey(address);
  if (!key) return null;
  if (points.has(key)) return points.get(key);

  const stored = readPoints()[key];
  if (stored !== undefined) {
    const v = Array.isArray(stored) ? { lat: stored[0], lon: stored[1] } : null;
    points.set(key, v);
    return v;
  }

  // THE ONE CALL THIS FILE CAN DECLINE TO MAKE. Everything above answers from
  // a cache; this is the point where an hour that is already spent would be
  // spent again, once per record, for as long as the detailer keeps working.
  if (addressBusy()) return null;

  if (inFlightPoint.has(key)) return inFlightPoint.get(key);
  const job = (async () => {
    try {
      // The slug is ignored by this endpoint (`book/core.js`) — it takes `q`
      // and nothing else, because anything in `website` is read as a bot.
      const r = await api.addressSuggest(null, address);
      const hit = r?.ok ? (r.suggestions ?? [])[0] : null;
      if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lon)) {
        const v = { lat: hit.lat, lon: hit.lon };
        points.set(key, v);
        writePoint(key, [hit.lat, hit.lon]);
        return v;
      }
      if (r?.ok) { points.set(key, null); writePoint(key, null); }
      return null;
    } catch (err) {
      // `addressFault` is the booking form's own reading of this endpoint's
      // refusal — one place decides what 429 means, and a screen that branches
      // on it never has to match an English sentence.
      if (addressFault(err) === "busy") markBusy();
      return null;
    }
    finally { inFlightPoint.delete(key); }
  })();
  inFlightPoint.set(key, job);
  return job;
}

// FOUR DECIMAL PLACES IS WHAT THE NWS ACCEPTS (`_shared/weather.ts`), but the
// CACHE rounds to two — about a kilometre, comfortably inside one forecast
// grid cell. Two houses on the same street must not be two requests.
const gridKey = (p) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;

async function periodsFor(businessId, point) {
  const key = gridKey(point);
  const held = forecasts.get(key);
  if (held && Date.now() - held.at < FORECAST_TTL) return held.periods;

  if (inFlightForecast.has(key)) return inFlightForecast.get(key);
  const job = (async () => {
    try {
      const r = await api.forecast(businessId, point.lat, point.lon);
      const periods = r?.ok && r.periods?.length ? r.periods : null;
      // A failure is NOT cached. `outside_coverage` never stops being true, but
      // it costs one request per hour per grid to re-learn it and the
      // alternative is a second expiry rule for one case.
      if (periods) forecasts.set(key, { at: Date.now(), periods });
      return periods;
    } catch { return null; }
    finally { inFlightForecast.delete(key); }
  })();
  inFlightForecast.set(key, job);
  return job;
}

/** The period covering an instant, or null when the forecast does not reach
 *  that far. `startTime` carries the FORECAST POINT's offset, not ours, which
 *  is why both sides are compared as absolute milliseconds. */
function periodAt(periods, startISO) {
  const at = Date.parse(startISO);
  if (!Number.isFinite(at)) return null;
  return (periods ?? []).find(
    (p) => Date.parse(p.startTime) <= at && at < Date.parse(p.endTime),
  ) ?? null;
}

/**
 * One pass over a whole list. `jobs` is `[{ id, address, start }]`.
 * Returns a `Map` of booking id -> forecast period; a job with no address, no
 * point, or a date past the forecast is simply absent.
 */
export async function loadJobWeather(businessId, jobs) {
  const out = new Map();
  if (!businessId) return out;

  const wanted = (jobs ?? []).filter((j) => j.id && j.address && j.start);
  if (!wanted.length) return out;

  // Distinct addresses first, so the geocode pass is one call per PLACE rather
  // than one per job — a detailer with a regular customer has the same address
  // on twenty rows.
  const byAddress = new Map();
  for (const j of wanted) {
    const k = addressKey(j.address);
    if (!byAddress.has(k)) byAddress.set(k, { address: j.address, jobs: [] });
    byAddress.get(k).jobs.push(j);
  }

  await Promise.all([...byAddress.values()].map(async ({ address, jobs: theirs }) => {
    const point = await pointFor(address);
    if (!point) return;
    const periods = await periodsFor(businessId, point);
    if (!periods) return;
    for (const j of theirs) {
      const p = periodAt(periods, j.start);
      if (p) out.set(j.id, p);
    }
  }));

  return out;
}

/** Which address a booking's weather is actually about. A mobile job happens
 *  at the customer's address; a drop-off job happens at the shop. */
export const jobAddress = (booking, business) =>
  (booking?.service_type === "mobile" && booking?.customer_address)
    ? booking.customer_address
    : (business?.dropoff_address ?? null);
