// ROADMAP 97.29 — EVERY ROW, NOT THE FIRST 1,000.
//
// PostgREST answers one request with at most 1,000 rows and says nothing about
// the rest, so an unpaged `select` is a silent truncation: Money read ten years
// of bookings oldest first and the NEWEST jobs were the ones cut. This walks
// `.range()` until a short page comes back.
//
// `build` must return a FRESH query each call, ordered down to something
// UNIQUE (end the order with `id`): offsets over a tied order are not stable
// between requests, so a row can land on two pages and its neighbour on none.
// Anything time-based in the query (a "now" cutoff) must be captured once,
// outside `build`, or the floor moves between pages.
//
// Answers `{ data, error }` like the query it replaces. A page that fails
// returns the error and NO data — a half-read list must not look like a whole one.
//
// ponytail: stops at the first page shorter than PAGE, so it is correct only
// while the server's per-request cap (Supabase `max_rows`, 1,000) is >= PAGE.
// If that cap is ever lowered, lower PAGE to match.
//
// No imports on purpose: `tests/read-all-97-29.test.mjs` runs it in node.
export const PAGE = 1000;

export async function readAll(build, size = PAGE) {
  const data = [];
  for (let from = 0; ; from += size) {
    const r = await build().range(from, from + size - 1);
    if (r.error) return { data: null, error: r.error };
    data.push(...(r.data ?? []));
    if ((r.data?.length ?? 0) < size) return { data, error: null };
  }
}
