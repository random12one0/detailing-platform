# Translate-on-save: what LANE B owes — written 2026-09-13

**The server side is built, deployed and proved.** This file is the other half,
and Andrew asked for it as a deliverable rather than an idea in a commit message:
*"include that first-run review as part of the handover rather than leaving it as
a nice idea in a commit message — it is the thing that makes the whole design
honest."*

Lane C owns `supabase/**`, `tests/**` and `scripts/**`. Everything below is in
`app/src`, which is **lane B's and nobody else's**.

---

## 1 · What already works, so you build against it rather than around it

| | |
|---|---|
| `translate-content` edge function | deployed v3, `verify_jwt=true`. POST with the detailer's session. |
| `POST {}` | sweeps the business and translates what is missing. Call it **after a save, and do not await it.** |
| `POST { dry_run: true }` | the same report with no API calls and no writes. Use it to draw the screen. |
| `get_business_translations(slug, 'es')` | the public read: `{ english: spanish }`. `anon` may call it. |
| `translations.human_text` | the detailer's correction. `authenticated` holds update on **that column only**. |
| `business_settings.translation_reviewed_at` | null = the first-run review has never been seen. Stampable under the existing settings-permission policy — **no new grant needed**. |

Proved on the demo business: 81 of 81 strings, 2,759 of DeepL's million
characters, and a second run that made **zero** API calls because nothing
changed.

## 2 · The response, field by field

```json
{
  "ok": true, "lang": "es",
  "up_to_date": true,            // true | false | NULL
  "classified": "all",           // "all" | "incomplete"
  "unknown_paths": [],
  "translatable": 81, "translated": 81, "pending": 0, "wrote": 3,
  "providers_refused": [], "rows_refused": [],
  "usage": [ { "provider": "deepl", "period": "lifetime", "used": 2759,
               "limit": 1000000, "remaining": 997241 },
             { "provider": "google", "period": "2026-09", "used": 26,
               "limit": 500000, "remaining": 499974 } ],
  "first_run": { "needed": false, "reviewed_at": null,
                 "pairs": [ { "path": "services[].name", "english": "Express Wash",
                              "spanish": "Lavado rápido", "by": "machine" } ] }
}
```

### `up_to_date` IS THREE-VALUED AND THE THIRD VALUE IS THE POINT

Andrew's condition, 2026-09-13: *"Whatever you build to decide 'has this text
changed since we last translated it' is itself an instrument that will one day be
asked whether something is up to date. Make it fail loudly when it cannot tell,
rather than returning 'unchanged' — that is the eighth costume and I would rather
we did not add one tonight."*

- `true` — every string is classified and nothing is pending. A tick is honest.
- `false` — some strings have no translation. Show the number.
- **`null` — A FIELD REACHED THE CUSTOMER THAT NOTHING HAS CLASSIFIED, so the
  server does not know the answer.**

**A SCREEN THAT DRAWS A TICK FOR `null` HAS BROKEN THE CONTRACT.** Draw something
that says *"we cannot tell whether this page is fully translated"* and name the
paths from `unknown_paths`. It means somebody published a new field and nobody
decided whether it is prose; the fix is in lane C's
`supabase/functions/_shared/translatable.ts`, not on your screen.

The same rule applies to `ok: false` (HTTP 502, `reason: "profile_unreadable"` or
`"cache_unreadable"`): that is **not** "nothing to do".

## 3 · THE FIRST-RUN REVIEW — Andrew's condition, and the reason the feature is honest

**His words:** *"The human-edit column is only a remedy if somebody knows it
exists, and a detailer who never opens the Spanish version of their own page will
never discover that 'Ceramic Pro' came out as something absurd. So the first time
a detailer's text is translated, they get told, in their dashboard, in plain
words: their page now has a Spanish version, here is what their service names
became, and here is where to fix anything that reads wrong. Not a buried setting
and not a toast that disappears — something that persists until they have looked
at it once. After that first review it can go quiet and translate silently
forever."*

**And the asymmetry is the reason, so keep it in mind while designing:** *"A
mangled description is a bit embarrassing, a mangled brand name is on every price
they quote and every customer sees it, so the one moment of friction belongs at
the start rather than as a permanent nag."*

### What that means concretely

- **Show it when `first_run.needed === true`.** That is `translation_reviewed_at
  is null` AND at least one thing was actually translated.
- **It must PERSIST.** Not a toast, not a snackbar, not a settings row nobody
  opens. It stays until they have looked once.
- **It shows `first_run.pairs`** — English beside Spanish, most brand-sensitive
  first: service names, add-on names, plan names, group names, then the tagline.
  Lane C's `REVIEW_PATHS` decides that order; the server already sorts it.
  **It is deliberately NOT every string** — fourteen names a detailer can read is
  the point, two hundred FAQ sentences is a wall.
- **Each row needs a way to correct the Spanish**, writing `human_text` on the
  matching row. A human edit is never overwritten by a later automatic pass —
  that is enforced by the schema, three ways, so you do not have to defend it.
- **Dismissing it stamps `translation_reviewed_at`**, after which it never
  appears again. Going quiet is the specified behaviour, not a compromise.
- **Plain words, the product's own voice.** No "seamless", no exclamation marks.
  The "Your web address" settings screen is the writing to match.

### One thing to get right in the copy

The business name is **never** translated — Andrew, 2026-09-13: *"we translate
what a business SAYS, never what it is CALLED."* The database refuses it, along
with the slug, a custom domain and a promo code. **So do not write copy that
implies their business name was translated**, and do not offer to "fix" it.
Service and plan names ARE translated, and those are what the card shows.

## 4 · The gauge

`usage` carries both providers. Two honest-reporting rules:

- **It is ADVISORY and it should read as advisory.** Exhaustion is decided by the
  provider's own error, never by our counter, so a wrong number here can only
  mis-draw a bar — it can never stop a translation.
- **If an entry comes back as `{ provider, unreadable: "..." }` instead of
  numbers, say so rather than drawing an empty bar.** An empty bar reads as
  "plenty left", which is the opposite of "we could not read it".
- DeepL's million is a **lifetime** allowance that expires; Google's half-million
  **renews monthly**. The `period` field is `"lifetime"` or `"YYYY-MM"`, so the
  screen can say which kind it is rather than implying both reset.
- Reconciling DeepL against its own free `/v2/usage` is possible and would be
  better than trusting our count — if you do it, **the bar must name which number
  it is showing.**

## 5 · Where to call it

Every place a detailer saves prose a customer reads. Today that is
`screens/more/Catalog.jsx:243` (services and add-ons) plus the screens that write
`business_settings.faqs`, `vehicle_sizes`, `travel_zones` and
`business_branding`.

- **Fire and forget.** The save has already succeeded; a translation failure must
  never surface as a save error.
- **Send no text.** The body carries nothing but `{}` — the function re-reads
  everything from the public profile, which is the same document the customer's
  page receives. Do not pass strings.
- **A missed call site is not a defect that rots.** The sweep covers the whole
  business, so the next save from anywhere catches it up. Do not build a
  per-field message.

## 6 · The customer's side — a SEPARATE lookup, never merged into `es.js`

`localeStore.js`'s `t()` is `table[english] || english`, which is exactly the
shape `get_business_translations` returns. **But tenant prose needs its own
function — call it `tx()` — over the tenant catalogue only.**

**Merging the two tables would silently rewrite a detailer's words.** A detailer
who names a service "Travel" would pick up the product catalogue's "Traslado";
your own handover of 2026-09-12 recorded that as correct-today behaviour
precisely because service names never reach `t()`. Keep it that way.

The English fallback costs no code: a string with no row is simply absent from
the map, so `tx(s)` returns `s`. That is how "when both providers are exhausted
the customer silently sees the detailer's English" is satisfied — by construction
rather than by an error path somebody has to remember.

## 7 · The one check that is owed and could not be written here

Andrew asked for **a test that fails if the business name ever differs between
the English and the Spanish rendering of the same page.**

The **data half exists**: `tests/translations.test.mjs` § 3b, § 3b-ii and § 3i —
the database refuses such a row, and § 3i audits every business for one. That
guard earned itself within the hour: baselining it dropped the trigger, two rows
were written, and the public read served a translated business name under two
green checks until the audit was added.

The **render half cannot be written until `tx()` exists**, because there is no
Spanish rendering of tenant prose to compare yet. **It belongs in this lane's
change, not as a follow-up** — load the booking page at `?lang=es` and at `?lang=en`
and assert the business name is byte-identical in both. Note `CLAUDE.md` trap
(c): `pushState` does not re-render the router's host, so navigate properly or
the check passes 22 screens it never visited.
