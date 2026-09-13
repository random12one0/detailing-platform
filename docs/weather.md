# WEATHER — the US National Weather Service

**Built 2026-09-13, lane C.** `ROADMAP.md` § FREE THIRD-PARTY SERVICES →
1 · WEATHER is the spec; this is what exists and how to check it.

**Tier: LIVE.**

---

## WHAT IS BUILT, AND WHAT IS DELIBERATELY NOT

| | |
|---|---|
| `supabase/functions/_shared/weather.ts` | the only file in this repo that names `api.weather.gov` |
| `supabase/functions/forecast/index.ts` | POST `{ lat, lon, business_id? }`, member-gated |
| `tests/weather.test.mjs` | 49 checks against a stubbed `fetch`, baselined by six breaks |
| `scripts/probe-forecast.mjs` | the live NWS and the deployed endpoint, 16 checks |

**NO SCREEN DRAWS IT YET.** `app/src` is lane B's and a screen is lane B's
deliverable. The handover is § THE SCREEN below.

---

## THE THREE RULES, AND NONE OF THEM IS A PREFERENCE

### 1 · THE USER-AGENT IS REQUIRED. MEASURED, NOT ASSUMED.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "User-Agent:" \
  https://api.weather.gov/points/33.7701,-118.1937
# 403
```

Andrew named this twice. `tests/weather.test.mjs` § 1 asserts the header reaches
**every** request the module makes, not that the string appears in the file —
the module makes two calls and a header set on only the first works in testing
and fails on the grid lookup.

### 2 · ONE MODULE HOLDS THE HOST, BECAUSE A KEY MAY ARRIVE

Their own docs warn of it. § 12 of the test walks `supabase/functions` and
`app/src` and **fails if more than one file names `api.weather.gov`** — so the
day a key arrives it is one file, not a week of grep.

### 3 · OPEN-METEO IS BANNED AND THE REASON IS IN THE CODE

It is better documented and it looks free. **Its free tier is non-commercial
only and this is a commercial product.** § 12c fails if `open-meteo.com` is
called from anywhere. The ban notice in `weather.ts` names it in prose, which is
why that check asks for the **host**, not the word.

---

## THE ANSWER SHAPE — three failures, three sentences

```
{ ok: true,  place: "Long Beach, CA", periods: [...] }            200
{ ok: false, reason: "bad_point" }                                400
{ ok: false, reason: "outside_coverage" }                         200
{ ok: false, reason: "unavailable", retryable: true }             503
```

**`outside_coverage` IS NOT `unavailable`, AND COLLAPSING THEM IS THE BUG THIS
PRODUCT KEEPS SHIPPING.** The NWS is US-only and answers 404 for anywhere else;
that is a real answer meaning *stop asking*. `unavailable` means *ask again in a
minute*. A screen that renders both as "no forecast" has thrown away the one
fact that decides what to do next. `retryable` is the field to branch on — the
same contract `available-slots` already established, because an English sentence
gets reworded and a field does not (CLAUDE.md trap (k)).

**AND `ok: true` WITH ZERO PERIODS IS IMPOSSIBLE.** A 200 from the NWS carrying
no periods is `unavailable`. FOUND.md's seventh costume, and `available-slots`
answered a full month with no bookable times for exactly this reason.

---

## WHERE THE COORDINATES COME FROM — the question this raises

**NOTHING IN THIS PRODUCT STORES A LATITUDE.** Measured 2026-09-13: zero matches
for latitude / longitude / geocode across every migration. Addresses are free
text (`bookings.customer_address`, `businesses.dropoff_address`). The NWS has no
geocoder, and the one this project has chosen — Geoapify — is `ROADMAP.md` § 6
and is explicitly not to be started yet.

**THAT IS NOT A BLOCKER.** A detailer asking about the weather is asking about
where they are, and `navigator.geolocation` answers that with no service, no key
and no attribution line. The endpoint takes a POINT and stays out of the
geocoding question entirely; the day an address can be turned into one, that is
a different call in front of this one and nothing here changes.

---

## IT IS READ-ONLY, AND THAT IS ANDREW'S OWN REFUSAL

`docs/ideas.md` item 02, 2026-09-06 — **he declined weather**: *"I feel like
detailers could kind of figure out their schedule themselves. And I don't think
there should be auto-blocking if it's rain or whatever."* — *reconsider only if
it turns out to be genuinely free.*

**The NWS is genuinely free, which is the exact condition he named**, and he
re-ordered the work himself on 2026-09-13. **The second half of the refusal
still binds.** Nothing here blocks a slot, moves a job, warns a customer or
cancels anything, and nothing built on top of it may either without asking him.
A *rain-day button* is idea 39 and he deferred that behind SMS.

---

## THE SCREEN — lane B's, not built

The endpoint is live and proved. What is owed is one read-only thing on the
dashboard, and three notes for whoever builds it:

1. **Get the point from `navigator.geolocation`**, once, with the permission
   prompt behind a control the detailer pressed. Cache it; it does not move.
2. **Three failures, three sentences.** `outside_coverage` says we only cover
   the US and offers no retry. `unavailable` says *couldn't load the forecast,
   try again* and offers one. `bad_point` should never reach a screen.
3. **`precipChance` can be `null`**, which is not 0. "They did not forecast a
   chance of rain" and "a 0% chance of rain" are different sentences.

---

## HOW TO CHECK IT

```bash
node tests/weather.test.mjs                 # 49, no credentials, no network
node scripts/probe-forecast.mjs             # the live NWS
set -a; . ./.env; set +a
node scripts/probe-forecast.mjs             # ...and the deployed endpoint
```

**The two are not interchangeable.** The stub proves the failure ladder, which a
live API will not perform on demand. The probe proves the shape we map is the
shape they still send — a renamed field keeps working and quietly prints an
empty string, which only a live call can see. **The probe prints its skip
loudly** when there are no credentials, because a skipped check reads exactly
like a passing one.

**Proved live 2026-09-13:** 49/49 stubbed, 16/16 live and deployed (Long Beach
14 periods; London `outside_coverage`; 999,999 `bad_point`; no session 404; a
member 200).

---

## ONE THING MEASURED THAT IS EASY TO MISS

```
/points/33.770123,-118.193765  ->  301  ->  /points/33.7701,-118.1938
```

**The NWS redirects anything more precise than four decimal places.** `fetch`
follows it, so getting this wrong is invisible and costs an extra round trip on
every call. `weather.ts` rounds before asking; § 3a of the test holds it.
