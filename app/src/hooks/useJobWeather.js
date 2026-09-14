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
  const jobs = useMemo(
    () => (bookings ?? [])
      .filter((b) => b && b.id && b.start_at)
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

  return { weather, prefs };
}
