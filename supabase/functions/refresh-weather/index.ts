// THE WEATHER SWEEP — fills every upcoming booking's own hour in, ahead of
// time, so a row paints with its forecast already on it.
//
// Andrew's goal, 2026-09-13: *"opening a booking must never make him wait for a
// forecast. The number is just there."*
//
// Runs hourly (`20260913010000_weather_cache.sql`) and refuses most of the
// work. The cadence is HERE rather than in the cron expression because every
// rule he gave is a question about one row, which a cron expression cannot ask:
//
//   · **Beyond the provider's range → store nothing.** Not a placeholder, not a
//     guess. `periodAt` simply finds no period and the column stays null, which
//     is what every screen already renders as silence.
//   · **Inside the range → once a day.**
//   · **On the day of the job, and the evening before → again.** *"That is when
//     it actually changes someone's plans, so it must be current."*
//   · **Past bookings → never refresh**, and their stored weather is cleared.
//
// ---------------------------------------------------------------------------
// **IT STORES A PREDICTION, NOT A FACT — which is the correction to his design
// and the reason this file exists at all.**
// ---------------------------------------------------------------------------
// He proposed fetching once at booking time and keeping it. A job booked three
// weeks out has no real forecast, and that captured number would still be there
// on the morning of the job, confidently wrong. So nothing here is written
// once: every value is overwritten by the next run that finds it due.
//
// **ONLY PG_CRON MAY START IT (ROADMAP 97.3).** Public at the gateway because
// the scheduler has no session, so the call must carry `x-cron-secret`
// (`_shared/cronAuth.ts`). Before that, anyone could make it write every
// tenant's bookings.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { cronRefusal } from "../_shared/cronAuth.ts";
import { gridKey, gridWeek, jobAddress, periodAt, pointFor } from "../_shared/weatherCache.ts";

// THE HORIZON. The NWS hourly endpoint answers about 156 one-hour periods —
// six and a half days — so a booking further out than this has nothing to be
// given. Seven rather than six is deliberate: `periodAt` decides the real edge
// per booking, and a window that stopped short would leave the last day of real
// forecast unwritten.
const HORIZON_DAYS = 7;

// TWO AGES, AND THE SHORT ONE IS HIS "day of, and the evening before". A grid
// with a job inside 36 hours is worth re-asking every three hours; everything
// else is a day. 36 covers the evening before a job at any hour of the next
// day, which a flat 24 would not.
const SOON_MS = 36 * 60 * 60 * 1000;
const FRESH_SOON_MS = 3 * 60 * 60 * 1000;
const FRESH_NORMAL_MS = 24 * 60 * 60 * 1000;

// **A CEILING ON GEOCODES PER RUN, BECAUSE THAT IS THE METERED ONE.** Geoapify
// is 3,000 credits a day shared by every tenant. An address resolves ONCE and
// is remembered for ever (`address_points`), so a steady week costs a handful;
// this only bites the first run after a bulk import, which then finishes on the
// next hour's run rather than spending a day's allowance in one minute.
const MAX_NEW_ADDRESSES = 60;

type Row = {
  id: string;
  business_id: string;
  start_at: string;
  service_type: string | null;
  customer_address: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  const refused = cronRefusal(req);
  if (refused) return refused;

  try {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const until = new Date(now + HORIZON_DAYS * 86_400_000).toISOString();

    // PAST BOOKINGS FIRST, AND THIS IS THE TIDYING HALF. Andrew: *"Old weather:
    // yes, clear it out. But be honest about why — it is a tidiness job, not a
    // space one; the rows are tiny."* So it is one statement, it runs before
    // anything expensive, and nothing elaborate was built for it. A finished
    // job's forecast is not history worth keeping: it was a guess about a day
    // that has now happened.
    const { count: cleared } = await supabase
      .from("bookings")
      .update({ weather: null, weather_at: null }, { count: "exact" })
      .lt("start_at", nowIso)
      .not("weather", "is", null);

    const { data: rows, error } = await supabase
      .from("bookings")
      .select("id, business_id, start_at, service_type, customer_address")
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .gte("start_at", nowIso)
      .lte("start_at", until)
      .order("start_at", { ascending: true });
    if (error) return json({ error: error.message }, 500);
    const bookings = (rows ?? []) as Row[];
    if (!bookings.length) return json({ ok: true, cleared: cleared ?? 0, bookings: 0 });

    // A drop-off job's weather is the SHOP's, so the businesses in play are
    // read once rather than per booking.
    const bizIds = [...new Set(bookings.map((b) => b.business_id))];
    const { data: bizRows } = await supabase
      .from("businesses").select("id, dropoff_address").in("id", bizIds);
    const dropoff = new Map((bizRows ?? []).map((b) => [b.id, b.dropoff_address ?? null]));

    // ── ADDRESSES → POINTS ────────────────────────────────────────────────
    // Distinct addresses, so a regular customer on twenty rows is one lookup —
    // and after the first run, no lookup at all.
    const byAddress = new Map<string, Row[]>();
    for (const b of bookings) {
      const a = jobAddress(b, dropoff.get(b.business_id) ?? null);
      if (!a) continue;
      if (!byAddress.has(a)) byAddress.set(a, []);
      byAddress.get(a)!.push(b);
    }

    const spent = { calls: 0 };
    const points = new Map<string, { lat: number; lon: number }>();
    for (const address of byAddress.keys()) {
      if (spent.calls >= MAX_NEW_ADDRESSES) break;
      const p = await pointFor(address, spent);
      if (p) points.set(address, p);
    }

    // ── POINTS → GRIDS ────────────────────────────────────────────────────
    // **THE SAVING HE NAMED.** Every address that rounds to the same ~1km
    // square is one provider call, whoever booked it and whatever day it is.
    const grids = new Map<string, { lat: number; lon: number; soonest: number; rows: Row[] }>();
    for (const [address, theirs] of byAddress) {
      const p = points.get(address);
      if (!p) continue;
      const k = gridKey(p.lat, p.lon);
      const g = grids.get(k) ?? { lat: p.lat, lon: p.lon, soonest: Infinity, rows: [] };
      for (const b of theirs) {
        g.rows.push(b);
        g.soonest = Math.min(g.soonest, Date.parse(b.start_at));
      }
      grids.set(k, g);
    }

    let fetched = 0, written = 0;
    for (const g of grids.values()) {
      const soon = g.soonest - now < SOON_MS;
      const week = await gridWeek(g.lat, g.lon, soon ? FRESH_SOON_MS : FRESH_NORMAL_MS);
      if (!week) continue;
      if (Date.parse(week.fetchedAt) > now - 60_000) fetched += 1;

      for (const b of g.rows) {
        // **NULL IS A REAL ANSWER AND IT IS WRITTEN AS ONE.** A booking past the
        // end of the hourly forecast gets its column cleared rather than left
        // holding last week's guess about a day that has since moved out of
        // range — the same reason nothing is stored at booking time.
        const period = periodAt(week.periods, b.start_at);
        await supabase.from("bookings")
          .update({ weather: period, weather_at: new Date().toISOString() })
          .eq("id", b.id);
        written += 1;
      }
    }

    return json({
      ok: true,
      cleared: cleared ?? 0,
      bookings: bookings.length,
      addresses: byAddress.size,
      grids: grids.size,
      geocoded: spent.calls,   // GEOAPIFY CREDITS SPENT, not addresses seen
      fetched,
      written,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
