// THE SHARED WEATHER CACHE — one grid square, one provider call, every caller.
//
// `_shared/weather.ts` is the National Weather Service seam and knows nothing
// about a database. This is the layer between it and everybody else, and it
// exists because of one sentence of Andrew's, 2026-09-13:
//
//   *"Cache by rounded location + day, NOT per booking. Twenty jobs in the same
//   town on the same day must cost ONE provider call, not twenty. This is the
//   real saving — far bigger than avoiding per-view fetches."*
//
// ---------------------------------------------------------------------------
// **EVERY PATH GOES THROUGH HERE, WHICH IS WHY THERE IS ONLY ONE CACHE.**
// ---------------------------------------------------------------------------
// The `forecast` endpoint a screen calls, and the `refresh-weather` sweep that
// fills bookings in ahead of time, are the same two lines of code below. A
// second cache beside this one is how the sweep and the screen start answering
// a detailer two different temperatures for the same hour — which is exactly
// the contradiction the display/judgement fix of the same morning was about.
//
// **A ROW IS THE WHOLE WEEK, NOT A DAY.** The NWS hourly endpoint answers ~156
// one-hour periods in a single response, so keying on (grid, day) as first
// drafted would have stored the same payload seven times and re-fetched it
// seven times. One row per grid is the same saving Andrew asked for and a
// seventh of the calls.
//
// **AND THE GEOCODE CACHE HAS NO EXPIRY.** A street does not move. Geoapify is
// the metered one — 3,000 credits a day shared by every tenant — and a browser-
// only cache meant every fresh session re-asked for every address: two
// verification runs exhausted the 60-per-hour ceiling on the day this was
// written. `address_points` is written once per address, ever.

import { supabase } from "./db.ts";
import { forecast, type Period } from "./weather.ts";
import { suggest } from "./geoapify.ts";

/** Two decimals is about a kilometre, comfortably inside one NWS grid cell —
 *  the same rounding `app/src/lib/jobWeather.js` uses on the client, and they
 *  must not drift apart or the two would cache different keys for one street. */
export const gridKey = (lat: number, lon: number) =>
  `${lat.toFixed(2)},${lon.toFixed(2)}`;

/** Ignores what does not change a place: capitals, punctuation, spacing. The
 *  client's `addressKey` is character for character this function. */
export const addressKey = (s: unknown) =>
  String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export type Point = { lat: number; lon: number };

/**
 * A point for an address from the permanent cache ONLY — never a provider call.
 *
 * `undefined` means nobody has ever resolved this address; `null` means it was
 * asked and there is no such place. ROADMAP 100.3: the public quote endpoint
 * reads this and nothing else, because `pointFor` below spends a Geoapify
 * credit on a miss that address-suggest's per-IP and per-day limits never see.
 */
export async function cachedPoint(address: unknown): Promise<Point | null | undefined> {
  const key = addressKey(address);
  if (!key) return null;
  const { data: hit } = await supabase
    .from("address_points").select("lat, lon, found").eq("key", key).maybeSingle();
  if (!hit) return undefined;
  return hit.found ? { lat: Number(hit.lat), lon: Number(hit.lon) } : null;
}

/**
 * A point for an address, from the permanent cache or from Geoapify once.
 * Spends credit outside address-suggest's limits, so only for callers that are
 * not open to the public (the `refresh-weather` sweep).
 *
 * `null` is returned for "no such place" AND for "could not ask", but only the
 * first is written down — a throttle or an outage that got remembered would be
 * a permanent blank on a real street, which is the trap the client-side cache
 * already documents.
 */
export async function pointFor(
  address: unknown,
  // **A COUNTER THAT COUNTS CREDITS, NOT ATTEMPTS.** The sweep's first version
  // reported one "geocode" per address whether the cache answered or not, which
  // said five credits spent on a run that spent none — a number that overstates
  // a meter is the same species of lie as a skipped check that prints a pass.
  spent?: { calls: number },
): Promise<Point | null> {
  const key = addressKey(address);
  if (!key) return null;

  const held = await cachedPoint(address);
  if (held !== undefined) return held;

  if (spent) spent.calls += 1;
  const r = await suggest(String(address));
  if (!r.ok) return null;                       // not asked — remember nothing
  const first = r.suggestions[0];
  if (!first) {
    await supabase.from("address_points").upsert({ key, found: false });
    return null;                                // asked, and there is no such place
  }
  await supabase.from("address_points")
    .upsert({ key, lat: first.lat, lon: first.lon, found: true });
  return { lat: first.lat, lon: first.lon };
}

export type Grid = { periods: Period[]; place: string | null; fetchedAt: string };

/** The cached week for a grid, however old. */
export async function cachedGrid(lat: number, lon: number): Promise<Grid | null> {
  const { data } = await supabase
    .from("weather_grids").select("periods, place, fetched_at")
    .eq("grid_key", gridKey(lat, lon)).maybeSingle();
  if (!data?.periods?.length) return null;
  return { periods: data.periods as Period[], place: data.place, fetchedAt: data.fetched_at };
}

/**
 * The week for a grid, fetching only if what is held is older than `maxAgeMs`.
 *
 * **A FAILED FETCH FALLS BACK TO WHAT IS HELD, HOWEVER STALE.** Three-hour-old
 * weather is a good answer; no weather because the NWS had a bad minute is not,
 * and this feature's whole failure story is silence (`lib/jobWeather.js`). The
 * caller cannot tell the two apart and does not need to — `fetchedAt` says how
 * old the answer is if anybody ever wants to show it.
 */
export async function gridWeek(
  lat: number, lon: number, maxAgeMs: number,
): Promise<Grid | null> {
  const held = await cachedGrid(lat, lon);
  if (held && Date.now() - Date.parse(held.fetchedAt) < maxAgeMs) return held;

  const fresh = await forecast(lat, lon);
  if (!fresh.ok) return held;
  const row = {
    grid_key: gridKey(lat, lon), lat, lon,
    periods: fresh.periods, place: fresh.place, fetched_at: new Date().toISOString(),
  };
  await supabase.from("weather_grids").upsert(row);
  return { periods: fresh.periods, place: fresh.place, fetchedAt: row.fetched_at };
}

/** The one-hour period covering an instant, or null past the forecast's end.
 *  Both sides are absolute milliseconds because `startTime` carries the
 *  FORECAST POINT's offset and not ours. */
export function periodAt(periods: Period[], startISO: string): Period | null {
  const at = Date.parse(startISO);
  if (!Number.isFinite(at)) return null;
  return (periods ?? []).find(
    (p) => Date.parse(p.startTime) <= at && at < Date.parse(p.endTime),
  ) ?? null;
}

/** Which address a booking's weather is about — the customer's for a mobile
 *  job, the shop's for a drop-off. The client keeps the same rule in
 *  `lib/jobWeather.js`; changing one without the other gives a detailer two
 *  forecasts for one job. */
export const jobAddress = (
  b: { service_type?: string; customer_address?: string | null },
  dropoff: string | null,
) => (b.service_type === "mobile" && b.customer_address) ? b.customer_address : dropoff;
