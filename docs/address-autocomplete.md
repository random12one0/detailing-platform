# ADDRESS AUTOCOMPLETE — the Geoapify seam, and the handover to lane B

**Built 2026-09-13, lane C. ROADMAP.md § 6 is the brief and everything in it is
settled — do not reopen the attribution or the key rule.**

**THE SERVER HALF IS DONE, DEPLOYED AND PROVED. THE SCREEN IS NOT BUILT, AND
THERE IS A DECISION FOR ANDREW BEFORE IT SHOULD BE.** Read § THE LATENCY first;
it may change what gets built.

---

## WHAT EXISTS

| | |
|---|---|
| `supabase/functions/_shared/geoapify.ts` | The one module. **Nothing else in the repo may name `api.geoapify.com` or read `GEOAPIFY_API_KEY`**, and a check fails if that stops being true. |
| `supabase/functions/address-suggest/` | `POST /functions/v1/address-suggest`, public. |
| `tests/geoapify.test.mjs` | 18 credential-free + live checks, baselined by three deliberate breaks. |
| `LIMITS.addressPerIp` / `addressPerDay` | In `_shared/rateLimit.ts` with the reasoning beside them. |

### THE CONTRACT

```
POST { q, business_id?, website? }

200  { ok: true, suggestions: [ { label, line1, city, state, postcode, lat, lon } ],
       attribution: { text, openStreetMap, geoapify } }
400  { ok: false, reason: "bad_query",      retryable: false }   q shorter than 4
429  { ok: false, reason: "busy",           retryable: true  }   throttled
503  { ok: false, reason: "not_configured", retryable: false }   OUR key is missing
503  { ok: false, reason: "unavailable",    retryable: true  }   Geoapify failed
```

**`ok: true` WITH AN EMPTY ARRAY IS A REAL ANSWER** — Geoapify replied and knows
no such place. Every way of NOT knowing has its own reason, because
`available-slots` already cost this product a live defect by answering 200 with
nothing in it, and a page that cannot tell "no such street" from "we could not
ask" shows the customer the wrong sentence.

**BRANCH ON `retryable`, NEVER ON THE WORDS.** CLAUDE.md trap (k): a check — or
a screen — that names a spelling asserts how something is written, not what it
does. `reason` is for logs and for people; `retryable` is what the UI reads.

---

## THE LATENCY — AND THIS IS THE THING ANDREW ASKED TO BE TOLD ABOUT

His rule, in § 6: *"LATENCY IS A DESIGN CONSTRAINT, NOT SOMETHING TO DISCOVER
LATER. A suggestion that arrives after the customer has finished typing is worse
than none. **If the round trip turns out too slow to be usable, COME BACK AND
TELL HIM** rather than quietly putting the key in the client."*

**IT IS TOO SLOW FOR TYPEAHEAD. MEASURED 2026-09-13, ten calls back to back
against a warm isolate:**

```
2117  1963  2103  3127  2541  2096  3076  3171  2498  2104   ms
```

**And the tail is worse and is tied to the QUERY, not to a cold start.**
`"1600 Pennsylvania Ave"` — an address that matches hundreds of streets —
**exceeded six seconds on every one of four consecutive attempts**, while
`"233 S Wacker Dr"` came back in ~2s each time.

**THE SPLIT, so nobody blames the wrong leg:** the same function with a query
too short to call Geoapify answers in **760–960ms**, which is the hop to
Supabase plus three rate-limit round trips. **So the provider leg alone is
roughly 1.3–2.3 seconds, with a tail past six.** Live typeahead wants ~300ms.

**NOTHING HAS BEEN DONE ABOUT IT, ON PURPOSE.** The remedies are Andrew's to
choose between and he said he wants to make that call deliberately:

1. **A search BUTTON instead of live typeahead.** The customer types the
   address, presses *Find*, picks from five rows. Two seconds is fine for a
   thing somebody asked for and unbearable for a thing that happens while they
   type. **Costs nothing, keeps the key server-side, and is the recommendation**
   — it also spends one credit per address instead of six to eight.
2. **A domain-restricted key in the browser.** Geoapify supports restricting a
   key to an origin, which is the answer he already named as possible. It cuts
   the hop entirely and would be fast. It also puts a spendable key on a public
   page, and the restriction is the only thing standing between it and his
   3,000 a day.
3. **A different provider.** Not investigated. It would be a change inside
   `_shared/geoapify.ts` and nothing else, which is the whole reason that file
   is a seam.

**DO NOT PICK 2 WITHOUT ASKING HIM.** That is the exact thing his instruction
forbids doing quietly.

---

## WHAT LANE B HAS TO GET RIGHT

### 1 · THE DEBOUNCE IS YOURS AND IT CANNOT BE ANYWHERE ELSE

*"Every keystroke is a credit, and 3,000 a day sounds like plenty until one
booking form burns forty of them spelling out one street."*

**A server cannot un-send a keystroke that has already arrived.** The four-
character floor and the rate limits are a backstop for when the client gets this
wrong, not a substitute for getting it right.

- **400ms after the last keystroke**, not on every one.
- **Never fire below four characters** — the server refuses those for free, but
  a request that is never made is cheaper still.
- **Cancel the in-flight request when the field changes.** With a 2-second round
  trip, answers WILL arrive out of order; a stale response overwriting a fresh
  one is the classic autocomplete bug and at this latency it is not an edge case.
- **Never fire again for a string you already asked about.**

### 2 · THE ATTRIBUTION GOES IN THE DETAILER'S FOOTER, NOT OURS

Settled by Andrew, and he asked for it written down rather than remembered:

- **One small greyed line in the FOOTER of the DETAILER'S public website.**
- **Not on our own platform pages.** He corrected this explicitly.
- The words exactly: **"Address and map data © OpenStreetMap contributors, via
  Geoapify"**, with **both names linked**.
- **ONE COMPONENT, ONE PLACE.** It must be movable or removable in a single edit
  if he pays or switches provider.

**IT IS ALREADY ONE COPY AND YOU SHOULD NOT TYPE IT AGAIN.** The endpoint sends
it in `attribution` beside every successful answer, so the site renders what the
server said. `tests/geoapify.test.mjs` § 3c fails if a second copy of that
sentence appears anywhere in `supabase/`, `app/` or `docs/tenant-sites/`.

**The OpenStreetMap half follows the DATA, not the provider**, so switching away
from Geoapify does not necessarily escape it. That is why the two halves are one
string and not two settings.

### 3 · NEVER REMOVE THE FIELD, AND NEVER BLOCK ON IT

`CLAUDE.md` § SCREEN RULES: *"Never remove a field because software filled it
in. Prefill it and let the person correct it."*

**The address box is a plain text input that works with the network off.**
Suggestions are an accelerator on top of it. Concretely:

- `not_configured` and `unavailable` mean **the box keeps working and says
  nothing**. A customer must never be told to try again about a secret only we
  can set.
- `busy` is the one worth a quiet line, because it clears.
- **A customer who ignores every suggestion and types their own address must be
  able to book.** The server never requires a picked suggestion and never will.

### 4 · THE POINT IS THE INTERESTING PART

Each suggestion carries `lat` and `lon`. **Nothing in this product has ever
stored a latitude** — measured 2026-09-13, zero matches across every migration —
which is why `forecast` takes a point from `navigator.geolocation` instead.

**Storing one is a MIGRATION and therefore lane C's, and it is not built.** If a
screen wants to keep the point (weather at the customer's address, travel-zone
matching, a map), say so and it gets a column. **Do not smuggle it into an
existing text field.**

---

## WHAT IS DELIBERATELY NOT BUILT

- **No caching.** Geoapify's free plan does not permit storing results, and this
  product has nowhere to put them: every address in it is free text.
- **No geocoding of addresses already in the database.** That is a different
  call with a different cost, and nothing has asked for it.
- **No `business_id` use.** The endpoint accepts it and ignores it. It is there
  so a future per-tenant budget does not change the contract.
