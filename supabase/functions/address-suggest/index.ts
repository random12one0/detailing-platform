// A CUSTOMER TYPES AN ADDRESS — ROADMAP.md § 6 · GEOAPIFY, 2026-09-13.
//
// Input:  { q, business_id?, website? }
// Output: { ok: true, suggestions: [...], attribution: {...} }        200
//         { ok: false, reason: "bad_query" }                          400
//         { ok: false, reason: "busy", retryable: true }              429
//         { ok: false, reason: "not_configured", retryable: false }   503
//         { ok: false, reason: "unavailable", retryable: true }       503
//
// ---------------------------------------------------------------------------
// IT IS PUBLIC, AND THAT IS THE WHOLE DIFFICULTY.
// ---------------------------------------------------------------------------
// `forecast` could be member-gated because a detailer is signed in. **The
// person typing an address is a customer on a booking page who has no account
// and never will**, so there is no token to require and gating this would
// switch the feature off for the only people who use it.
//
// So it goes in `PUBLIC_FUNCTIONS` in `scripts/deploy-functions.mjs`, and
// everything below is the price of that: a length floor, three rate limits and
// the honeypot, because a public proxy to a metered API is a bill with a URL.
//
// **THE BUDGET IS 3,000 A DAY AND IT IS SHARED BY EVERY TENANT.** One abusive
// caller does not merely cost money, it takes address help away from every
// other detailer's customers until midnight. That is why `addressPerDay` exists
// as well as the per-IP rule: the per-IP limit stops one machine, and the daily
// ceiling is what stops a hundred of them.
//
// ---------------------------------------------------------------------------
// THE DEBOUNCE IS THE CALLER'S AND CANNOT BE ANYTHING ELSE.
// ---------------------------------------------------------------------------
// Andrew: *"Every keystroke is a credit, and 3,000 a day sounds like plenty
// until one booking form burns forty of them spelling out one street."* A
// server cannot un-send a keystroke that has already arrived, so the only real
// defence is upstream. `docs/address-autocomplete.md` is the handover and it
// carries that requirement as the first thing lane B has to get right; the
// floor here (`MIN_QUERY`) and the limits below are the backstop for when it is
// got wrong, not a substitute for it.
//
// ---------------------------------------------------------------------------
// AND IT NEVER ANSWERS WITH A CHEERFUL EMPTY LIST.
// ---------------------------------------------------------------------------
// `available-slots` already cost this product a live defect by answering 200
// with no days, so a page could not tell "fully booked" from "we failed to find
// out". Every way of NOT knowing here has its own `reason` and its own status,
// and `retryable` is the field a screen branches on rather than an English
// sentence somebody later rewords (CLAUDE.md trap (k)).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { ipOf, LIMITS, looksAutomated, withinLimits } from "../_shared/rateLimit.ts";
import { ATTRIBUTION, MIN_QUERY, suggest } from "../_shared/geoapify.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json().catch(() => ({}));

    // THE HONEYPOT, FIRST AND SILENT. A bot that fills every input it finds
    // fills this one; it gets an empty answer that costs no credit and is
    // indistinguishable at the HTTP level from a street nobody has heard of.
    if (looksAutomated(body)) return json({ ok: true, suggestions: [], attribution: ATTRIBUTION });

    // THE LENGTH FLOOR COMES BEFORE THE THROTTLE, AND THE ORDER IS DELIBERATE.
    // A query under `MIN_QUERY` costs no credit and no database round trip, so
    // spending a rate-limit slot to refuse it would punish a debounced field for
    // the first three characters of every address — and answer 429 "busy" to
    // something that is not busy and never will be. Free refusals first.
    const q = typeof body.q === "string" ? body.q.trim() : "";
    if (q.length < MIN_QUERY) return json({ ok: false, reason: "bad_query", retryable: false }, 400);

    const ip = ipOf(req);

    // THREE LIMITS, AND THE THIRD IS THE ONE THAT PROTECTS EVERYBODY ELSE.
    // Checked BEFORE the provider call, so a refusal costs no credit.
    const ok = await withinLimits(supabase, [
      { bucket: "address_ip", key: ip, ...LIMITS.addressPerIp },
      { bucket: "public_ceiling", key: ip, ...LIMITS.publicCeiling },
      // A CONSTANT KEY ON PURPOSE. Every caller counts against one row, which
      // is what a shared daily budget actually is.
      { bucket: "address_day", key: "all", ...LIMITS.addressPerDay },
    ]);
    if (!ok) {
      // 429 AND `retryable: true`, because it IS — in an hour, or tomorrow. A
      // page that treats this as a dead feature would stop asking for the rest
      // of the day on one busy minute.
      return json({ ok: false, reason: "busy", retryable: true }, 429);
    }

    const result = await suggest(q);

    if (result.ok) {
      // THE ATTRIBUTION TRAVELS WITH THE DATA. Andrew asked for one copy that
      // can be moved or removed in a single edit; sending it beside the
      // suggestions means the site renders what the server says rather than a
      // sentence somebody retyped, and the day he pays or switches provider
      // this endpoint stops sending it and every site stops drawing it.
      return json({ ...result, attribution: ATTRIBUTION });
    }

    // **THREE FAILURES, THREE MEANINGS.** `bad_query` is the caller's (too
    // short) and no retry will help. `not_configured` is OURS — the key is
    // missing or empty — and a customer must never be told to try again for a
    // secret only we can set. `unavailable` is Geoapify's, and that one really
    // is worth another go.
    if (result.reason === "bad_query") return json({ ...result, retryable: false }, 400);
    if (result.reason === "not_configured") {
      console.error("address-suggest: GEOAPIFY_API_KEY is not set");
      return json({ ...result, retryable: false }, 503);
    }
    return json({ ...result, retryable: true }, 503);
  } catch (err) {
    console.error("address-suggest:", err);
    return json({ ok: false, reason: "error", retryable: false }, 500);
  }
});
