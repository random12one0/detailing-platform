# ADDRESS AUTOCOMPLETE — the Geoapify seam, and the handover to lane B

**Built 2026-09-13, lane C. ROADMAP.md § 6 is the brief and everything in it is
settled — do not reopen the attribution or the key rule.**

**THE SERVER HALF IS DONE, DEPLOYED AND PROVED. THE SCREEN IS NOT BUILT AND IS
LANE B'S.** The decision that was blocking it is CLOSED: **it is a *Find*
button the customer presses once, not suggestions as they type** — Andrew,
2026-09-13. § THE FIND BUTTON is the spec; build that and nothing else.

**AND THE SENTENCE THAT MATTERS MOST IS THE FALLBACK: if the address does not
resolve, the customer still continues with whatever they typed.** Every failure
of the lookup is silent to them and *Continue* stays enabled.

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

## THE LATENCY — MEASURED, PUT TO ANDREW, AND **DECIDED**

**HIS RULING, 2026-09-13: A *FIND* BUTTON. NOT SUGGESTIONS AS YOU TYPE.** The
question below is closed. Do not reopen it, do not re-measure it to reopen it,
and do not build a typeahead.

> *"Address lookup is a Find button the customer presses once after typing, not
> suggestions as they type."*

**HIS TWO REASONS, AND THE SECOND IS THE ONE THAT SETTLES IT FOR GOOD.** The
round trip is two to three seconds warm and over six on some addresses, against
the ~300ms that typing-suggestions need, so typeahead cannot be made to work at
this latency. **And the only way to get fast is a key in the browser on a public
page, which we are not doing.** That second half is not a performance trade-off
waiting for a better provider; it is a rule about where the key lives, and it
holds however fast anything gets.

### THE MEASUREMENT THE DECISION WAS MADE ON — kept, not to be re-run

Ten warm calls back to back:

```
2117  1963  2103  3127  2541  2096  3076  3171  2498  2104   ms
```

**The tail is tied to the QUERY, not to a cold start.** `"1600 Pennsylvania
Ave"` — an address matching hundreds of streets — **exceeded six seconds on
every one of four consecutive attempts**, while `"233 S Wacker Dr"` came back in
~2s each time.

**THE SPLIT, so nobody blames the wrong leg:** the same function with a query
too short to call Geoapify answers in **760 to 960ms**, which is the hop to
Supabase plus three rate-limit round trips. **So the provider leg alone is
roughly 1.3 to 2.3 seconds.**

`docs/VERIFIED.md` § 1d carries this as a row, invalidated by nothing in this
repo.

---

## THE FIND BUTTON — THE SPEC LANE B BUILDS

**The customer types the address into the ordinary address box, presses *Find*
once, and picks from the rows that come back. That is the whole interaction.**

| | |
|---|---|
| **The field** | The address input that is already there. Unchanged: a plain text box that works with the network off. |
| **The control** | One button beside it or under it. It fires **only on a press** — never on a keystroke, never on blur, never on a timer. |
| **The result** | Up to five rows from `suggestions`. Pressing one fills the address box. |
| **Dismissing** | Pressing a row, pressing outside, or editing the box again closes the list. |

### IF THE ADDRESS DOES NOT RESOLVE, THE CUSTOMER STILL CONTINUES WITH WHATEVER THEY TYPED

**This is the load-bearing sentence in this file and it is the half that is
easiest to build wrong.** No answer, an empty answer, a failed answer, a
throttled answer, or a customer who never presses the button at all — **in every
one of those cases the address box keeps exactly what they typed and *Continue*
stays enabled.**

- **Never gate *Continue* on a picked suggestion.** The server has never
  required one and never will.
- **Never clear, rewrite or "correct" what they typed** because the lookup
  disagreed. A detailer's customer knows their own gate code, their unit number,
  and the fact that their street is not in anybody's database.
- **Never show an error that implies they must fix something.** `ok: true` with
  an empty array means *we asked and found nothing*; the right words are along
  the lines of *"No matches. We will use the address as you typed it."*, and the
  button stays pressable.
- **`not_configured` and `unavailable` say NOTHING to the customer.** A secret
  only we can set is not their problem. The button simply stops offering rows.
- **`busy` is the one worth a quiet line**, because it clears: *"Too many
  lookups right now. Try again in a moment, or just carry on."*

**BRANCH ON `retryable`, NEVER ON THE WORDS** — CLAUDE.md trap (k).

### WHAT THE BUTTON CHANGES ABOUT THE DEBOUNCE BRIEF BELOW

**Two of its four rules die with typeahead and two survive it.**

- **The debounce timer is GONE.** There are no keystroke-triggered calls left to
  debounce. Delete the idea rather than porting it.
- **The four-character floor STAYS**, as a button that is not pressable rather
  than a request that is refused. The server refuses those for free; a request
  never made is cheaper still.
- **"Never ask twice about the same string" STAYS** and is now trivial: if the
  box has not changed since the last press, re-show the rows already in hand.
- **Cancelling the in-flight request STAYS.** A customer can press *Find*, edit,
  and press again inside three seconds. At this latency answers WILL arrive out
  of order, and a stale one overwriting a fresh one is the classic autocomplete
  bug.

**AND THE BUTTON IS WHY THE BILL IS SAFE.** One press is one credit. Live
typeahead spends six to eight per address, which is what *"3,000 a day sounds
like plenty until one booking form burns forty of them spelling out one street"*
was about.

### TWO SECONDS IS LONG ENOUGH THAT A SILENT BUTTON READS AS BROKEN

Show that it is working while it is working, and re-enable it when the answer
lands. A customer who presses *Find*, gets nothing, and presses again
immediately must not conclude the control is dead.

## WHAT LANE B HAS TO GET RIGHT

### 1 · ~~THE DEBOUNCE IS YOURS~~ — SUPERSEDED BY THE FIND BUTTON, 2026-09-13

**Kept rather than deleted because two of its four rules survive and because the
REASON is still the reason.** § THE FIND BUTTON above says which two. The
original, for the record:

*"Every keystroke is a credit, and 3,000 a day sounds like plenty until one
booking form burns forty of them spelling out one street."*

**A server cannot un-send a keystroke that has already arrived.** The four-
character floor and the rate limits are a backstop for when the client gets this
wrong, not a substitute for getting it right.

- ~~**400ms after the last keystroke**, not on every one.~~ **DEAD** — there are
  no keystroke-triggered calls in a button design.
- **Never fire below four characters** — **STILL LAW**, now as a button that is
  not pressable. The server refuses those for free, but a request that is never
  made is cheaper still.
- **Cancel the in-flight request when the field changes** — **STILL LAW.** With a
  2-second round trip, answers WILL arrive out of order; a stale response
  overwriting a fresh one is the classic autocomplete bug and at this latency it
  is not an edge case.
- **Never fire again for a string you already asked about** — **STILL LAW**, and
  now trivial: re-show the rows already in hand.

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
