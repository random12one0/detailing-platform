# WEATHER — the US National Weather Service

**Built 2026-09-13, lane C — and extended the same day into the STORED,
REFRESHED form Andrew asked for.** `ROADMAP.md` § FREE THIRD-PARTY SERVICES →
1 · WEATHER is the original spec; **§ B below is the design that supersedes the
"NOT BUILT" half of this file**, and it is the part to read first if you are
here about what a detailer or a customer actually sees.

**Tier: LIVE.**

---

## WHAT IS BUILT, AND WHAT IS DELIBERATELY NOT

| | |
|---|---|
| `supabase/functions/_shared/weather.ts` | the only file in this repo that names `api.weather.gov` |
| `supabase/functions/forecast/index.ts` | POST `{ lat, lon, business_id? }`, member-gated |
| `tests/weather.test.mjs` | 54 checks against a stubbed `fetch`, baselined by six breaks |
| `supabase/functions/_shared/weatherCache.ts` | the shared cache every path reads — § B |
| `supabase/functions/refresh-weather/index.ts` | the hourly sweep that fills bookings in — § B |
| `tests/weather-cache.test.mjs` | 27 checks on the stored half, baselined by six breaks |
| `scripts/probe-forecast.mjs` | the live NWS and the deployed endpoint, 16 checks |

~~**NO SCREEN DRAWS IT YET.**~~ **SUPERSEDED THE SAME DAY — screens draw it
now**, on every booking row, inside the job record, and on the customer's own
confirm step. § THE SCREEN below is the handover that was owed and is kept for
its three notes, two of which were followed and one of which was overtaken:
**the point does NOT come from `navigator.geolocation`.** Andrew's correction:
*"It never even needs the client's location. It just needs the address of where
it's located at."* A job on Thursday at a house nine miles away is not the sky
outside the van today.

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

~~**NOTHING IN THIS PRODUCT STORES A LATITUDE.**~~ **IT DOES NOW —
`address_points`, § B.** Geoapify was started on 2026-09-13 and the geocode is
cached permanently, which is what makes this affordable. The paragraph below was
true when written and the reasoning in it is why the endpoint still takes a
POINT rather than an address. Measured 2026-09-13: zero matches
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
node tests/weather.test.mjs                 # 54, no credentials, no network
node tests/weather-cache.test.mjs           # 27, the stored half
node tests/weather-warnings.test.mjs        # 29, the judgement half
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

**Proved live 2026-09-13:** 54/54 stubbed, 16/16 live and deployed (Long Beach
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

---

# B · STORED AND REFRESHED — the design Andrew asked for, 2026-09-13

Written 2026-09-13, to Andrew's design, with the one correction he asked for and
the provider limits he asked to have written down.

---

## 1 · What a person sees

**A detailer sees the weather on EVERY booking, always.** His words:

> *"I still wanted to show the weather for every day. I just wanted [the
> warning] to be, like, extra… every single one I want to see kind of the
> weather, like, it'll be sunny, cloudy, rainy, the temperature at the specific
> time that I'm going in the specific location."*

So every row carries a condition icon and a temperature. A warning is an extra
layer on top of that, never a replacement for it.

**A warned row is a different SHAPE, not just a brighter one** — a pill it did
not have, and the glyph inverted into a filled disc. Colour and shape, never
colour alone. It is still a booking, not a banner: 20px of disc on a 56px row.
**Not `--bad`** — CLAUDE.md § SCREEN RULES reserves that for *this destroys
something*, and rain on Thursday is not destruction.

**Six warning kinds, six different glyphs**, one per toggle on the Weather
settings screen: too hot, too cold, rain, storm, snow, wind. Hot and cold shared
a plain thermometer until he said *"separate graphics and icons for each one"* —
two warnings that draw identically are one warning to somebody scanning.

**A CUSTOMER SEES THE CONDITION AND THE TEMPERATURE AND NOTHING ELSE.** No
warnings, ever, on the confirm step. The warnings help a detailer plan his day;
showing somebody "rain expected" with their thumb over Confirm is an invitation
to abandon the booking. `calculate-booking` returns two fields —
`{ temperature, shortForecast }` — so the warnings are not filtered out on the
customer's side, they never arrive.

---

## 2 · The one correction to the design

Andrew proposed: *fetch once when the booking is created, keep it, never fetch
again.*

**That cannot work, because a forecast is not a fact — it is a prediction that
changes.** A job booked three weeks out has no real forecast at all, and a
number captured at booking time would still be sitting there, confidently wrong,
on the morning of the job. His own alternative in the same breath — *"or maybe
fetches once a day"* — is the correct one.

**So everything stored is a CACHE THAT REFRESHES, never a write-once value.**
That is why every row carries `fetched_at` and not `created_at`.

---

## 3 · Where it lives

| Thing | Table / column | Expires |
|---|---|---|
| Address → point | `address_points` | **Never.** A street does not move. |
| A grid's whole week of hourly periods | `weather_grids` | Refetched when stale; the row is replaced. |
| The one hour a booking happens in | `bookings.weather` | Overwritten by each sweep; cleared once the job is in the past. |

**`bookings.weather` is what makes a row instant.** It arrives in the same query
that fetched the booking, so a row paints with its sky already on it and there is
no spinner, ever — which was the whole ask.

**`weather_grids` is the saving.** One row is one ~1km square holding the whole
week, so twenty jobs in one town on one day are ONE provider call — and so are
twenty jobs there across three different detailers. Neither table mentions a
business: the sky over a street is the same sky for everyone who drives to it.

Both tables have RLS forced and **no policies at all** — the strongest statement
available, and the same one `platform_admins` makes. `bookings.weather` and
`weather_at` are readable by a detailer and `revoke`d from `authenticated` for
UPDATE, because a record its subject can edit is not a record.

---

## 4 · When it refreshes

`refresh-weather` runs **hourly** (`pg_cron`, minute 7) and refuses most of the
work. The cadence is in the function, not the cron expression, because every
rule is a question about one row:

| Case | What happens |
|---|---|
| Booking past the forecast range | **Nothing is stored.** No placeholder, no guess. |
| Inside the range | Refetched if the grid's copy is over **24 hours** old. |
| A job within **36 hours** | Refetched if over **3 hours** old — this is "the day of, and the evening before". |
| Booking in the past | Never refreshed, and its stored weather is **cleared**. |

36 rather than 24 because it has to cover the evening before a job at any hour
of the next day.

The clear-out is a **tidiness job, not a space one** — Andrew said so himself and
it is one SQL statement. The rows are tiny; nothing elaborate was built for it.

A screen that asks directly (`forecast`) reads the same `weather_grids` row and
accepts anything under **3 hours** old, so a whole office looking at the same day
is one provider call.

---

## 5 · The provider limits, and the headroom

### Geoapify — address → point

**3,000 credits per DAY, shared by every tenant** (free plan). This is the one
that actually bites, and it did: on the day this was written, two verification
runs exhausted the **60-per-hour-per-IP** ceiling in `_shared/rateLimit.ts`,
because the point cache was per-browser and every fresh session re-geocoded every
address.

**With `address_points`, an address costs one credit ONCE, ever.** The steady-
state cost of the weather feature in Geoapify credits is therefore **zero** — it
only pays for addresses nobody in the system has ever seen. The sweep caps itself
at **60 new addresses per run**, so a bulk import spreads over hours instead of
spending a day's allowance in a minute.

Measured on the demo business, 2026-09-13:

| Run | Geoapify credits | NWS calls | Time |
|---|---|---|---|
| First (cold cache) | 5 | 4 | 21.3s |
| Third (warm cache) | **0** | 1 | 2.4s |

### National Weather Service — point → forecast

**No API key, no quota, no published numeric rate limit.** `api.weather.gov`
asks for a real `User-Agent` (we send one; `tests/weather.test.mjs` § 1 fails if
that stops being true) and for sane caching rather than a fixed ceiling. It is a
US government service and it is free.

**So the honest statement is: there is no published number to sit inside, and
the discipline is caching rather than rationing.** What we can size is our own
rate:

- Cost per hourly run = **distinct ~1km grid squares with a booking in the next
  7 days**, and only those whose copy is stale.
- A detailer working one metro area is roughly **3–8 grids**.
- At 100 tenants that is ~500 grids, refreshed once a day plus a second pass for
  the squares with a job inside 36 hours — call it **≈750 requests a day**, or
  about **31 an hour** across the whole platform.

That is a small, steady, well-behaved load for a service built for public
consumption, and it does not grow with the number of BOOKINGS — only with the
number of distinct PLACES. Twenty jobs in one town remain one call.

**The number to watch is grids, not bookings.** If `refresh-weather`'s `grids`
figure ever climbs into the thousands, the next move is to widen the rounding
(two decimals → one) rather than to slow the cadence, because the cadence is what
makes the day-of forecast trustworthy.

---

## 6 · The files

| File | What it is |
|---|---|
| `supabase/functions/_shared/weather.ts` | The NWS seam. Knows no database. **Hourly endpoint, never the twelve-hour one** — see § 7. |
| `supabase/functions/_shared/weatherCache.ts` | The shared cache. Every path goes through it. |
| `supabase/functions/refresh-weather/index.ts` | The hourly sweep. |
| `supabase/functions/forecast/index.ts` | What a detailer's screen asks when a booking has not been swept yet. |
| `supabase/functions/calculate-booking/index.ts` | The customer's two neutral fields. Cache-only; never calls a provider. |
| `app/src/lib/weather.js` | The judgement half — which facts earn a warning, under this detailer's thresholds. |
| `app/src/components/JobWeather.jsx` | The chip and the record line. |
| `app/src/hooks/useJobWeather.js` | Stored first, live only for the gaps. |

---

## 7 · Two traps already paid for

**THE HOURLY FORECAST, NEVER THE TWELVE-HOUR ONE.** `properties.forecast`
answers twelve-hour periods whose `temperature` is that half-day's HIGH. Andrew
found it: a 9 AM job read 82° and the 2 PM job beside it read 77° — hotter in the
morning than the afternoon, which is backwards. Neither number was the
temperature at the hour of the job. `properties.forecastHourly` is the fix and
there is deliberately **no fallback** to the twelve-hour URL, because falling
back silently restores the day high. `tests/weather.test.mjs` § 14 holds both
halves.

**THE NUMBER SHOWN AND THE NUMBER JUDGED ARE ONE NUMBER.** Whatever a row
prints, a hot warning may only sit beside it when that printed figure is at or
above the detailer's own threshold. `tests/weather-warnings.test.mjs` § 8 holds
it from the judgement side. (The "77° · Too hot" Andrew first reported was **not**
a bug — he had set his threshold to 70 himself to check the feature worked. The
check stays anyway; the invariant is worth holding.)

**A GAP-FILLER MUST NOT BECOME A LOOP.** The client asks live only about
bookings that are in the future AND inside the ~6.5-day hourly horizon. Without
that guard, a job earlier today and a job three weeks out — both permanently
without stored weather — were re-asked on every single page load, for ever,
against a metered geocoder. Measured at six requests per load on a screen where
three could never return anything.
