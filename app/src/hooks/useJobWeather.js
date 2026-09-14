// ONE FETCH FOR A WHOLE LIST OF JOBS, AND NEVER ONE PER ROW.
//
// This is the shape the feature needs rather than a convenience: a list screen
// calls this once with every booking it is about to draw, and hands each row
// the answer as a prop. A hook called INSIDE the row would be a lookup per
// render, which is what Andrew's *"never call per row render"* rules out and
// what a metered address lookup cannot afford.
//
// `lib/jobWeather.js` does the fetching and the caching; `lib/weather.js`
// decides what is worth saying. This file only joins them to the business's own
// settings and to React's lifecycle.
//
// **THE DEPENDENCY IS THE JOBS THEMSELVES, NOT THE ARRAY.** A list screen
// rebuilds its array on every render, so depending on the array identity would
// refetch for ever; the key below is the ids, addresses and start times, which
// is exactly what would change the answer.

import { useEffect, useMemo, useState } from "react";
import { useBusiness } from "../context/BusinessContext.jsx";
import { jobAddress, loadJobWeather } from "../lib/jobWeather.js";
import { weatherPrefs } from "../lib/weather.js";

export function useJobWeather(bookings) {
  const { business, settings } = useBusiness();
  const [weather, setWeather] = useState(() => new Map());

  const prefs = useMemo(() => weatherPrefs(settings?.weather_prefs), [settings?.weather_prefs]);

  // **`start_at`, NEVER `start_time` — and this cost an hour on the day it was
  // built.** `useBookings.withLocal` attaches `start_time` as a business-local
  // CLOCK STRING ("09:00") so screens never re-derive one, and a clock string
  // is not an instant: `Date.parse("09:00")` is NaN, every job fell outside
  // every forecast period, and the feature rendered nothing at all with no
  // error anywhere. `start_at` is the ISO timestamp the row actually holds.
  // ---------------------------------------------------------------------------
  // **THE STORED FORECAST FIRST, AND THAT IS THE WHOLE POINT — Andrew,
  // 2026-09-13.**
  // ---------------------------------------------------------------------------
  // *"Opening a booking must never make him wait for a forecast. The number is
  // just there."* `bookings.weather` is written ahead of time by the hourly
  // `refresh-weather` sweep and arrives in the SAME query that fetched the
  // booking, so a row paints with its sky already on it and there is no
  // spinner, ever.
  const stored = useMemo(() => {
    const m = new Map();
    for (const b of bookings ?? []) if (b?.id && b.weather) m.set(b.id, b.weather);
    return m;
  }, [bookings]);

  // **AND THE LIVE PATH IS THE GAP-FILLER, NOT THE MAIN ROAD.** A booking made
  // four minutes ago has not been swept yet, and a detailer who just took a job
  // over the phone should not have to wait an hour to see the weather for it.
  // Only bookings the sweep has not reached are asked about — usually none, and
  // the request that does go out lands on the SAME shared grid cache the sweep
  // fills (`_shared/weatherCache.ts`), so it costs no provider call either.
  // **AND IT ONLY ASKS ABOUT JOBS THAT COULD HAVE AN ANSWER, which is the
  // difference between a gap-filler and a loop.** A job earlier today and a job
  // three weeks out are both permanently without stored weather — nobody
  // forecasts the past, and the hourly forecast stops at about six and a half
  // days — so an unconditional "fetch what is missing" re-asked about the same
  // rows on every single page load, for ever, against a metered geocoder.
  // Measured: six requests per load on a screen where three of them could never
  // come back with anything.
  const HORIZON_MS = 6.5 * 24 * 60 * 60 * 1000;
  const jobs = useMemo(
    () => (bookings ?? [])
      .filter((b) => b && b.id && b.start_at && !b.weather)
      .filter((b) => {
        const at = Date.parse(b.start_at) - Date.now();
        return at > 0 && at < HORIZON_MS;
      })
      .map((b) => ({ id: b.id, address: jobAddress(b, business), start: b.start_at }))
      .filter((j) => j.address),
    [bookings, business],
  );
  const key = jobs.map((j) => `${j.id}|${j.address}|${j.start}`).join("~");

  useEffect(() => {
    if (!business?.id || !jobs.length) { setWeather(new Map()); return; }
    let live = true;
    // NOTHING WAITS FOR THIS. The screen has already painted; the chips arrive
    // when they arrive, and if they never do the rows are the rows.
    loadJobWeather(business.id, jobs).then((m) => { if (live) setWeather(m); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id, key]);

  // ONE MAP OUT, STORED UNDER LIVE. A row does not care which half answered,
  // and merging here rather than at four call sites is what keeps `JobRow`
  // ignorant of the whole arrangement — it still takes a period as a prop.
  const merged = useMemo(() => {
    if (!weather.size) return stored;
    const m = new Map(stored);
    for (const [id, p] of weather) m.set(id, p);
    return m;
  }, [stored, weather]);

  return { weather: merged, prefs };
}
