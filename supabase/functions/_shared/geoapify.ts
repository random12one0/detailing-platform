// GEOAPIFY, BEHIND ONE MODULE — ROADMAP.md § 6, 2026-09-13.
//
// **NOTHING ELSE IN THIS REPO MAY NAME `api.geoapify.com` OR READ
// `GEOAPIFY_API_KEY`.** `tests/geoapify.test.mjs` § 1 fails if that stops being
// true — the same rule `_shared/weather.ts` keeps for the NWS and
// `_shared/translate.ts` keeps for the two translation providers. The day the
// plan changes, the provider changes, or the key rotates, it is one file.
//
// ---------------------------------------------------------------------------
// THE KEY NEVER REACHES A BROWSER. ANDREW WROTE THIS RULE HIMSELF.
// ---------------------------------------------------------------------------
// *"Address autocomplete fires on every keystroke, so the naive implementation
// puts the key in the browser, where anyone can read it and spend his 3,000 a
// day. Do not do that."*
//
// So it is read here, from the Supabase secret store, with `Deno.env.get`. It
// is never returned, never logged, never put in an error message, and **never
// written into anything under `app/`** — the booking page is served to the
// public and every byte of it is readable.
//
// ---------------------------------------------------------------------------
// A MISSING KEY IS A LOUD FAILURE, NOT AN EMPTY LIST.
// ---------------------------------------------------------------------------
// The seventh costume, and this repo has now paid for it twice: an instrument
// that answers "fine" when it cannot tell. An unconfigured key returning
// `{ suggestions: [] }` is a customer typing their address into a box that
// silently never helps, and nothing on the page can tell that from a street
// nobody has heard of. It answers `not_configured`, which is OUR fault and
// says so.
//
// ---------------------------------------------------------------------------
// WHAT IT DOES NOT DO.
// ---------------------------------------------------------------------------
// **No debounce.** That is the caller's, and it has to be the caller's: a
// server cannot un-send a keystroke that already cost a credit. The handover
// in `docs/address-autocomplete.md` is where that requirement lives.
//
// **No storing.** Geoapify's terms on the free plan do not permit caching
// results, and this product has nowhere to put them anyway — every address in
// it is free text a person typed.
//
// ---------------------------------------------------------------------------
// THE LATENCY, MEASURED — AND ANDREW ASKED TO BE TOLD IF IT CAME OUT LIKE THIS.
// ---------------------------------------------------------------------------
// His rule: *"LATENCY IS A DESIGN CONSTRAINT, NOT SOMETHING TO DISCOVER LATER.
// A suggestion that arrives after the customer has finished typing is worse
// than none. If the round trip turns out too slow to be usable, COME BACK AND
// TELL HIM rather than quietly putting the key in the client."*
//
// **IT IS TOO SLOW, AND IT IS NOT A COLD START.** Ten calls back to back
// against a warm isolate, 2026-09-13: 2117, 1963, 2103, 3127, 2541, 2096, 3076,
// 3171, 2498, 2104 ms. The same function with a query too short to call
// Geoapify answers in 760–960ms, so **the provider leg alone is roughly
// 1.3–2.3 seconds** and the rest is the hop to Supabase plus three rate-limit
// round trips. Typeahead wants 300ms.
//
// **NOTHING HAS BEEN DONE ABOUT IT HERE, ON PURPOSE.** The obvious remedies are
// his to choose between — a domain-restricted key called from the browser, a
// different provider, or accepting a slower search-button shape instead of
// live typeahead — and he said explicitly that he wants to make that call
// deliberately. `docs/address-autocomplete.md` § THE LATENCY carries the
// numbers and the options; **do not put the key in the client to fix this.**

const HOST = "https://api.geoapify.com";

/** US only, because the whole product is: the NWS half of § 5 is US-only too. */
const COUNTRY = "us";

/**
 * The shortest query worth a credit.
 *
 * Three characters matches half a state. The point is not precision, it is
 * that **a credit spent on "12" buys nothing** — 3,000 a day sounds like plenty
 * until one booking form burns forty of them spelling out one street, which is
 * Andrew's own sentence for why this number exists.
 */
export const MIN_QUERY = 4;

/** More than five rows is a list nobody reads, on a phone least of all. */
const LIMIT = 5;

export type Suggestion = {
  /** The one line a person recognises — what goes in the field when they pick it. */
  label: string;
  /** The parts, for a form that wants to fill more than one box. */
  line1: string;
  city: string;
  state: string;
  postcode: string;
  /** A POINT, which is the thing this product has never had. See `forecast`. */
  lat: number;
  lon: number;
};

export type Result =
  | { ok: true; suggestions: Suggestion[] }
  | { ok: false; reason: "bad_query" }
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "unavailable" };

/**
 * ONE ROUND TRIP, AND IT ANSWERS HONESTLY OR NOT AT ALL.
 *
 * `ok: true` with an empty array is a real answer — Geoapify replied and knows
 * no such place. Every way of NOT knowing has its own reason, because a page
 * that cannot tell "no such street" from "we could not ask" will show the
 * customer the wrong sentence.
 */
export async function suggest(query: unknown): Promise<Result> {
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length < MIN_QUERY) return { ok: false, reason: "bad_query" };

  const key = Deno.env.get("GEOAPIFY_API_KEY");
  // Not `!key` alone: a secret set to the empty string is a configuration
  // mistake that would otherwise reach Geoapify as a 401 and be reported as
  // "unavailable", sending somebody to look at the provider's status page.
  if (!key || key.trim() === "") return { ok: false, reason: "not_configured" };

  const url = new URL("/v1/geocode/autocomplete", HOST);
  url.searchParams.set("text", q.slice(0, 120));
  url.searchParams.set("filter", `countrycode:${COUNTRY}`);
  url.searchParams.set("limit", String(LIMIT));
  url.searchParams.set("format", "json");
  url.searchParams.set("apiKey", key);

  const t0 = Date.now();
  let res: Response;
  try {
    // SIX SECONDS IS A BACKSTOP, NOT A BUDGET — and the difference matters,
    // because the measured round trip does not fit inside a typeahead budget at
    // all (see THE LATENCY, below). Four seconds was tried first and cut off
    // real answers: every one of ten warm calls came back in 2.0–3.2s, so a
    // four-second ceiling turns a slow success into `unavailable`, which is a
    // lie about whose fault it is. This number exists only to stop a hung
    // socket holding the function open.
    res = await fetch(url, { signal: AbortSignal.timeout(6_000) });
  } catch (e) {
    // The URL carries the key, so it must never be logged. The message alone.
    console.error("geoapify: request failed after", Date.now() - t0, "ms:", (e as Error).name, (e as Error).message);
    return { ok: false, reason: "unavailable" };
  }

  if (!res.ok) {
    // Status only, for the same reason — and a 401 here means the key is wrong
    // rather than absent, which `not_configured` would misreport.
    console.error("geoapify: refused with", res.status, "after", Date.now() - t0, "ms");
    return { ok: false, reason: "unavailable" };
  }

  let body: { results?: unknown[] };
  try {
    body = await res.json();
  } catch {
    console.error("geoapify: answered with something that is not JSON");
    return { ok: false, reason: "unavailable" };
  }

  const rows = Array.isArray(body.results) ? body.results : [];
  return { ok: true, suggestions: rows.map(shape).filter((s): s is Suggestion => s !== null) };
}

/**
 * ONE ROW, REDUCED TO WHAT A FORM NEEDS.
 *
 * A row without a point is dropped rather than returned with zeroes: `0, 0` is
 * a real place in the Atlantic, and a silent zero is how a wrong answer travels
 * further than a missing one.
 */
function shape(row: unknown): Suggestion | null {
  const r = (row ?? {}) as Record<string, unknown>;
  const lat = Number(r.lat);
  const lon = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const line1 = [str(r.housenumber), str(r.street)].filter(Boolean).join(" ");
  const city = str(r.city) || str(r.county);
  const state = str(r.state_code) || str(r.state);
  const postcode = str(r.postcode);

  // `formatted` is Geoapify's own one-line rendering and it is the one a person
  // recognises. The fallback is assembled only when they did not send one.
  const label = str(r.formatted)
    || [line1, city, [state, postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  if (!label) return null;

  return { label, line1, city, state, postcode, lat, lon };
}

/**
 * THE ATTRIBUTION, AND IT IS SETTLED — ROADMAP.md § 6.
 *
 * Andrew read Geoapify's terms himself and chose the STRICT reading: it is
 * mandatory on the free plan, and their terms do not say where it goes. **The
 * words are exact, both names are links, and it belongs in the footer of the
 * DETAILER'S public site — not on our own platform pages.** He corrected that
 * second point explicitly and asked for it written down rather than remembered.
 *
 * **IT LIVES HERE SO THERE IS ONE COPY.** He asked for it to be movable or
 * removable in a single edit if he pays or switches provider, and a sentence
 * retyped into five tenant sites is not that. The OpenStreetMap half follows
 * the DATA rather than the provider, so switching away from Geoapify does not
 * necessarily escape it — which is why the two halves are one string here and
 * not two settings.
 */
export const ATTRIBUTION = {
  text: "Address and map data © OpenStreetMap contributors, via Geoapify",
  openStreetMap: "https://www.openstreetmap.org/copyright",
  geoapify: "https://www.geoapify.com/",
} as const;
