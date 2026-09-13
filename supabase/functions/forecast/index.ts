// A DETAILER ASKS WHAT THE SKY IS GOING TO DO — ROADMAP.md § FREE THIRD-PARTY
// SERVICES → 1 · WEATHER, 2026-09-13.
//
// Input:  { lat, lon, business_id? }
// Output: { ok: true, place, periods[] }
//         { ok: false, reason: "outside_coverage" }            200
//         { ok: false, reason: "bad_point" }                    400
//         { ok: false, reason: "unavailable", retryable: true } 503
//
// ---------------------------------------------------------------------------
// WHY THIS IS A FUNCTION AND NOT A `fetch` FROM THE SCREEN.
// ---------------------------------------------------------------------------
// The NWS needs no key TODAY, so a browser could call it directly and this file
// would not exist. **Their own docs warn a key may arrive**, and on the day it
// does, a key called from a browser is a key anybody can read and spend — the
// identical trap ROADMAP.md § 6 records for Geoapify. Putting the seam here now
// costs one function and makes that day a deploy instead of a redesign.
//
// ---------------------------------------------------------------------------
// IT IS AUTHENTICATED, AND THAT IS NOT CEREMONY.
// ---------------------------------------------------------------------------
// Public, this is an open proxy to weather.gov running on our compute, spendable
// by anyone who finds the URL, and the NWS rate-limits by User-Agent — ours.
// `requireMember` reads the caller's own token; a stranger gets 404 rather than
// 403, the same shape every other tenant endpoint uses, because a 403 tells a
// prober the endpoint is real. **So `forecast` must NOT be added to
// `PUBLIC_FUNCTIONS` in `scripts/deploy-functions.mjs`.**
//
// ---------------------------------------------------------------------------
// WHERE THE COORDINATES COME FROM, WHICH IS THE QUESTION THIS RAISES.
// ---------------------------------------------------------------------------
// **NOTHING IN THIS PRODUCT STORES A LATITUDE — measured 2026-09-13, zero
// matches for lat/lon/geocode across every migration.** Addresses are free text
// (`bookings.customer_address`, `businesses.dropoff_address`). The NWS has no
// geocoder, and the one this project has chosen — Geoapify — is ROADMAP.md § 6
// and is explicitly not to be started yet.
//
// **THAT IS NOT A BLOCKER, BECAUSE THE BROWSER ALREADY KNOWS.** A detailer
// asking about today's weather is asking about where they are, and
// `navigator.geolocation` answers that with no service, no key and no
// attribution line. So this endpoint takes a POINT and stays out of the
// geocoding question entirely: the day an address can be turned into one, that
// is a different call in front of this one and nothing here changes.
//
// ---------------------------------------------------------------------------
// AND IT IS READ-ONLY, BY ANDREW'S OWN REFUSAL — see `_shared/weather.ts`.
// ---------------------------------------------------------------------------
// He declined weather in 2026-09-06 partly because *"I don't think there should
// be auto-blocking if it's rain or whatever."* Nothing here writes a row, holds
// a slot or messages anybody, and a later change that does needs asking first.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { json, preflight } from "../_shared/http.ts";
import { requireMember } from "../_shared/tenant.ts";
import { forecast } from "../_shared/weather.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json().catch(() => ({}));
    const businessId = String(body.business_id ?? "").trim() || null;

    const member = await requireMember(req, businessId);
    if (!member) return json({ error: "not_found" }, 404);

    const result = await forecast(body.lat, body.lon);

    if (result.ok) return json(result);

    // **THREE FAILURES, THREE STATUSES, AND THEY ARE NOT INTERCHANGEABLE.**
    // `outside_coverage` is a 200 because the request SUCCEEDED — the NWS
    // answered, and its answer is that it does not cover that place. Telling
    // the screen to retry that for ever would be the same dishonesty as an
    // empty month of bookable days. `unavailable` carries `retryable: true`,
    // the field `available-slots` already established so a page branches on a
    // field rather than on an English sentence that gets reworded later
    // (CLAUDE.md trap (k)).
    if (result.reason === "bad_point") return json(result, 400);
    if (result.reason === "outside_coverage") return json(result, 200);
    return json({ ...result, retryable: true }, 503);
  } catch (err) {
    console.error("forecast:", err);
    return json({ ok: false, reason: "error", retryable: false }, 500);
  }
});
