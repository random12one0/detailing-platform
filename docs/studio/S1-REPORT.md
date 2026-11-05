# Studio S1 — "Prove the wire": report

Branch `studio/s1` (worktree `C:\studio-work\s1`). First built 2026-11-04 (`d2a88b51`), then revised the same
night after an independent review (`docs/studio/S1-REVIEW.md`). Not pushed. The real database was never called,
no email was sent, nothing was downloaded. Everything runs against belt-staging's offline engine
(`demo-backend.mjs`) and the fictional Brightline Auto Care seed.

## What was built

| File | What it is |
|---|---|
| `app/site.html` | The renderer's own HTML entry. None of the dashboard's CSS, fonts or routes load. |
| `app/src/site/main.jsx` | Serves committed examples at **`/site/example/<name>`**. Each example binds to the slug `example_<name>`, which no real business can hold: the database allows only `[a-z0-9-]` (`20260827000100_tenant_core.sql`). A bare `/site/<slug>` is not served in S1. Same `.lite` motion switch as the dashboard. |
| `app/src/site/spec.js` | **The spec format and validator** (pure JS). Binding allow-list, `parseBinding`, `validateSpec(spec, profile)`, `resolve`, `bindingsOf`, `typedFact`. Details under "The validator" below. |
| `app/src/site/Site.jsx` | One `BookingBusinessProvider` (one `get_public_business_profile` read, `normalizeProfile`) feeds every section and the booking flow. It validates the spec against the live profile on every load. A refused spec, or anything that throws while drawing, shows a plain "This page is unavailable right now" page with the phone number; the reasons go to the console, not the page. It sets description, canonical and LocalBusiness JSON-LD from the profile. |
| `app/src/site/sections.jsx` | The 5 section types: hero, catalog (ticket), proof (wipe slider), visit (board), booking (the existing `BookingFlow`, embedded). Every bound element carries `data-from`, plus `data-section` / `data-part`. When the detailer is away or not set up, the booking section drops the spec's "Request a time" heading so it does not contradict the flow's message. |
| `app/src/site/site.css` | Petrol / chalk / vermilion, Newsreader + Chivo, the "job ticket" motif, one staggered hero entrance (off under reduced motion). Restyles the booking flow only through its `--bk-*` tokens. Nothing on the site paints under 12 px; booking labels and the price bar's helper text are 13 px. |
| `app/src/site/specs/brightline.json` | The Brightline spec: tokens + one page + 5 sections, no facts. Slug `example_brightline`. |
| `app/src/book/BookingPage.jsx`, `BookingConfirmed.jsx` | `embedded` mode. In embedded mode, every state (loading, not found, error, closed-until, not set up, the flow, the confirmation) uses the site's colours and an h2. The EN/ES language switch is kept. `data-booking-step` is stamped only in embedded mode, so `/book/:slug` is unchanged. |
| `app/src/book/core.js` | `normalizeSettings` passes the site-wide sale through (contract §2e). |
| `app/vite.config.js`, `app/package.json` | **The site is a second build pass** (`vite build && vite build --mode site`). The dashboard stays one `assets/index-*.js`, as four after-publish checks expect. Dev and `vite preview` middleware route `/site/*`. |
| `app/public/_redirects`, `app/netlify.toml` | `/site/*  /site.html  200` above the catch-all. |
| `app/public/examples/brightline/gallery-1.webp`, `gallery-2.webp`, `credits.json` | **One real before/after pair**: Andrew's own photograph of a black Scion FR-S (see "Pictures"). Added with `git add -f` because `app/public/examples` is gitignored. |
| `scripts/studio/example-engine.mjs` | Starts the offline engine with the Brightline seed changed in memory: slug renamed to `example_brightline`, and only the real photo pair kept active. The belt fixture file is not edited. |
| `scripts/studio/s1-check.mjs` | The browser proof: 63 checks. Writes `artifacts/studio-s1/`. |
| `tests/site-spec.test.mjs` | 14 node tests for the validator (credential-free). |
| `tests/privacy-processors.test.mjs` | `schema.org` classified as a non-processor (a vocabulary IRI, never fetched); `app/site.html` added to the scan. |

## How to run it locally

```bash
# 1. the offline engine with the example seed (prints {"ok":true,"url":"http://127.0.0.1:54390"})
cd C:/studio-work/s1
node scripts/studio/example-engine.mjs --port 54390

# 2. the app pointed at it (second terminal)
cd C:/studio-work/s1/app
VITE_SUPABASE_URL=http://127.0.0.1:54390 VITE_SUPABASE_ANON_KEY=demo-anon npx vite --port 5173

# 3. open http://localhost:5173/site/example/brightline   (and /site/example/nope for the not-found)
```

In PowerShell, set the two variables first: `$env:VITE_SUPABASE_URL="http://127.0.0.1:54390"; $env:VITE_SUPABASE_ANON_KEY="demo-anon"`.
There is no `.env` in the worktree, on purpose.

The proofs (s1-check starts its own engine and Vite on free ports; about 3 minutes with the build leg):

```bash
cd C:/studio-work/s1
node --test tests/site-spec.test.mjs
node scripts/studio/s1-check.mjs            # --no-built skips the production-bundle leg
```

## Results of the last full run (after every fix)

- **`s1-check.mjs`: 63 passed, 0 failed.** By proof: P1 7, P2 3, P3 9, P4 27, P5 5, P6 5, P7 7.
- **`site-spec.test.mjs`: 14 passed, 0 failed.**
- **Repo suites:** 70 tests, 0 failed. They are: composition, design-contrast, landing-pricing, route-contract, no-credentials-in-tracked-text, every-open-item-is-citable, seo-files, spanish, push-urls-are-routes, privacy-processors (8/8; it was 7/8 on `d2a88b51`), and the booking suites booking-core, -errors-announced, -refs, -draft, -meta, business-day-97-32, closed-until, connect, fixed-furniture-is-hit-tested, receipt-fields. `var-scope-guard.mjs` is clean.
- **`npm run build`** passes, in two passes.
- **After-publish checks:**
  - `live-bundle-switches.mjs`: 0 failed, 0 unjudgeable. Run with `--break=media-off`, it goes red (1 failed), so it still catches a bad bundle.
  - `live-card-claim.mjs`: passes.
  - `live-setup-counts.mjs` and `photo-release-order.mjs` need credentials and were not run. s1-check P6 now asserts the invariant all four rely on: the built `index.html` loads exactly one JS file, `assets/index-*.js`.
- `tests/ics-audience.test.mjs` fails with and without these changes; it needs live credentials.

| # | Proof | Result |
|---|---|---|
| P1 | Dashboard edits in the offline engine show after a reload, with no rebuild | PASS. Interior reset **$185 → $205** in the menu, the hero strip and booking step 1. A hidden service disappears everywhere. "Wednesday 9 AM – 3 PM" shows. An ended sale disappears. An FAQ edit shows. |
| P2 | Typed facts and unknown bindings are refused | PASS. The live profile validates the spec. All data-from stamps are allow-listed bindings. 0 digits on the page sit outside a binding. The booking section's own title and intro are now inside that check, because the stamp moved onto the flow. Unit tests cover the rest (see "The validator"). |
| P3 | A booking through the site reaches a recorded create-booking post, and the quote equals calculate-booking | PASS. All 7 steps were walked inside the site. 1 recorded `create-booking` post. **calculate-booking 85 = on screen $85 = sent 85 = stored 85.** 1 row written, status pending. The confirmation's two links resolve. A broken booking now fails by name: "reached its confirmation" or "post recorded", with the page's own error text. Before, it showed up as a crash. |
| P4 | Real browser at 390, 768 and 1440 | PASS at all three widths: screenshots saved; 0 console errors or warnings; no horizontal overflow; one h1 and one main; axe WCAG 2.1 AA found 0 violations; nothing painted under 12 px and the booking bar at least 13 px. At 390, every hit area is at least 44 px. Every link and button outside the flow was clicked (anchors, skip link, slider, FAQ, `tel:`/`sms:`). Reduced motion: 0 running animations, 0 hidden elements. |
| P5 | Not-found, and the main app unchanged | PASS. `/site/example/nope` shows not-found. `/site/brightline` (a slug a real business could own) does **not** draw the example. `/book/<slug>` still draws its own masthead with no step stamp. The embedded flow keeps the EN/ES switch, and it works ("Elige tus servicios" → "Pick your services"). |
| P6 | Production bundle | PASS. The dashboard is one `assets/index-*.js`. The built preview serves the example with live prices, and none of the dashboard's CSS, JS or fonts load on it. Not-found works. 0 console errors. |
| P7 | States a customer meets when something is off | PASS. **Detailer away:** the booking section shows "closed until Saturday, November 14", with one h1 on the page and the site's colours, and the "Request a time" heading is hidden. **Not set up:** the same, with "isn't taking bookings online yet". **Refused spec** (the bound service group was removed from the profile): the page says "This page is unavailable right now" with a Call button, shows no internal detail, and sends the reasons to the console. |

## The validator (review §2-3), and its false-alarm choices

Refused in prose:
- any Unicode digit (`\p{Nd}`: １, ١), any other numeral (`\p{No}` / `\p{Nl}`: ⑱, ½, Ⅶ), any currency sign (`\p{Sc}`: ₹ ¥ ₩ ₽ ₱ …), and `%`;
- Roman numerals of two or more I/V/X letters ("VII days");
- number words: zero to twenty, the tens, hundred, thousand, million, billion, dozen, half, percent, free, dollar, buck.

Kept low on false alarms, on purpose:
- **"one" is not on the list.** It is mostly a pronoun: "no one", "one-stop", "the one place".
- **A word that ends a hyphenated compound passes.** So "hassle-free" and "streak-free" are allowed, while "five-star", "twenty-four" and "free wax" are refused.
- **L, C, D and M are not treated as Roman numerals**, so "LLC" passes.
- "feel free" is refused; the detailer would need to reword it.
- Spelled numbers can't be caught completely ("a few" passes). The critic stays the backstop.

Also refused:
- a digit in a section id, any page other than `/`, and a slug other than `example_<name>`;
- no booking section, or more than one hero or booking;
- missing core tokens (paper, ink, accent, both fonts).

Lookups are own-key only. `toString`, `constructor` and `__proto__` can no longer pass as a token, font or section type, and can't crash the validator. A crash would show the refusal page, never a blank one. Group ids are checked through the same `groupServices` call the renderer uses.

All 6 new hole tests fail against the `d2a88b51` validator; the low-false-alarm guard test passes on both versions.

## Pictures

The clip-art cars are gone. The only real photos on this machine that belong to the platform or its owner are:
- `app/public/img/Black-FRS-Before-and-After-Polish-3.jpg`, recorded in `docs/tenant-sites/y-kinzie.html` as **Andrew's own photograph, sent 2026-09-09**. An earlier session split it at row 1024 and matched the halves (scale 0.9391, offset 186.2, 33.0 px). The two halves were taken byte for byte from that file's data URIs.

Everything else on hand was ruled out: screenshots, an apparently generated cut-out of a detailer, or Unsplash photos (licensed, but not the owner's).

So the example has **one real pair**:
- It is the hero (after half) and the full-width wipe slider (16:9).
- It is captioned "Example: the platform owner's own work, not this sample shop's."
- The seed's other three photos are switched off rather than filled with stand-ins.

`credits.json` records all of this. **Andrew should confirm the FR-S photo is his before any public use; the filename reads like a web upload.**

## Screenshots

In `C:\studio-work\s1\artifacts\studio-s1\` (gitignored; regenerated on every run):
- `site-390.png`, `site-768.png`, `site-1440.png`, plus the `-fold` versions (first screen only);
- `edited-390.png`, taken after the P1 dashboard edits;
- `booking-step-1…6-390.png`, `booking-review-390.png` and `booking-done-390.png`;
- `state-away-390.png`, `state-not-set-up-390.png`, `state-refused-390.png` and `not-found-390.png`;
- `results.json`.

My design pass on this set:
- The real photo carries the first screen at all three widths.
- At 1440 the hero photo now spans exactly the copy column, from the sale band to the bottom of the price strip.
- The sale shows once.
- The closed states read cleanly.

## Not done, or worth knowing

- **Andrew must confirm the FR-S photo is his** before public use.
- **There is one photo pair**, so the gallery is one slider. More real photos (J5) remain the biggest lift for the premium feel.
- **Bundle:** `site-*.js` is 157 KB gzip (React, router, the booking flow and supabase-js). That is under the 170 KB ceiling, but close.
- **When the detailer is away or not set up**, the hero and nav still offer "Book". The booking section explains why it is closed, but the hero doesn't change yet.
- **The full grader (`site-grade.mjs`) was not run.** Its G0 expects 10 to 14 sections, and S1 has 5 by design. Its G5 would flag `booking.css`'s own `box-shadow`/`background` transitions, which predate this work.
- **The offline engine publishes the whole settings row**, while the real RPC whitelists fields (review §7). Every field the site reads is in the real list today, but this was not changed (it is belt-staging code).
- **The renderer's own microcopy** ("Book a time", "Hours" and so on) is English in the components, not in the spec.
- **Commit `120bb7db` deleted the four clip-art files by a staging mistake**, one commit before `3a8fee13` added the real pair. Between the two, the example pointed at photos with no files. Both commit messages say so.
- Nothing was pushed. The live repo and its `main` were not touched.

## Commits

| Commit | What it did |
|---|---|
| `d2a88b51` | S1 as first built |
| `83c9faab` | B1: second build pass; the dashboard is one `index-*.js` again; s1-check guard fixed |
| `d48c60ad` | B2: `schema.org` classified in the privacy check |
| `8bd59eb2` | Validator holes (review §2-3) |
| `120bb7db` | Fix-soon items (review §4-7) |
| `3a8fee13` | Pictures: the real before/after pair |
| `ceb4ad70` | The booking heading steps aside when booking is closed |

---

# Studio S2 — the connection check: report

Branch `studio/s1` again (commits `d4e7e26a`, `5414eab7` and this report), 2026-11-05 overnight. Not pushed. The
real database was never called and nothing was sent. STUDIO-SPEC.md §2c layers 2 and 3, §7 row S2.

## What was built

| File | What it is |
|---|---|
| `scripts/studio/studio-check.mjs` | **The connection check**, one command. Starts the offline engine in-process with a snapshot of the site's business (`--seed`; default the Brightline example, the only business there is), draws the revision (`--spec`; default `specs/brightline.json`) headless through the real renderer, and writes a tick list (`--out`, JSON) plus one line per tick (`--jsonl` for the Studio). `--shot` saves the first screen at 390 (the Studio's thumbnail). About 18 seconds. |
| `scripts/studio/booking-walk.mjs` | The booking walk that s1-check already had, moved into one place so s1-check and studio-check walk the same way. It now also reads the time chips the page offered. |
| `tests/studio-check.test.mjs` | Runs the real check four times: whole (all green, exit 0), and with the wire cut three ways, each of which must go red **first on the right line**. |
| `app/src/site/main.jsx` | `/site/preview`, **dev server only**: draws a revision handed in from outside. Two doors: the Studio page posts `{type:"studio-spec"}` (accepted only from a parent on 127.0.0.1 / localhost / [::1], or an origin in `VITE_STUDIO_ORIGINS`), or the check sets `window.__STUDIO_SPEC__`. The production build has no such route (s1-check P6 proves it). |
| `app/src/site/spec.js`, `Site.jsx` | `validateSpec(spec, profile, { live: true })` on a customer's visit: **a photo the detailer deleted drops out of its slot instead of taking the whole site down**. Saving a revision still refuses a missing photo, and a missing service or group still refuses live. Found by the check itself: the Brightline hero is pinned to its one photo, so "remove one photo" made the whole page "unavailable". |

## The ticks (ids are stable; the Studio and the test use them)

| id | What it proves |
|---|---|
| `copy` | The business was copied into a private test copy (services, photos, reviews, days of hours counted). |
| `valid` | The revision passes `validateSpec` against that copy (strict: every bound id must exist). |
| `drawn` | The renderer drew every section of the revision, one h1, not the refused page. |
| `stamps` | **Layer 2.** Every `data-from` stamp on the page shows what the profile says: a price stamp shows that price, a name stamp that name, a group lists its services, a photo stamp draws that photo, `gallery.best(n)` draws exactly those, `reviews.top(n)` those reviews, `hours.week` every day's line, `contact.phone` leads to that number, the sale its percent, the area, add-ons, plans, FAQ and payment methods by name. |
| `price` | One shown price raised by $5 in the copy; after one reload every stamp for it and its booking card show the new price and none the old. |
| `hide` | One unpinned service hidden; no stamp for it and no booking card offers it. (Its name may still appear inside another service's wording, e.g. Complete care includes an "Interior reset".) |
| `hours` | One day's hours changed (Saturday, else the first open day): the hours board shows the new line, not the old. |
| `photo` | One photo the page shows removed: no stamp or picture of it remains, and the page still draws. |
| `review` | A review added (first in the detailer's order): it shows. |
| `stamps-after` | Layer 2 again after all five changes, against the changed profile. |
| `quote` | On a fresh copy, a practice booking through the site: on-screen total = `calculate-booking` = `shown_total` sent = stored total. |
| `slots` | The time chips offered on the picked day = `slotsForType(available-slots answer, service type)`, the same rule the flow uses. |
| `post` | Exactly one `create-booking` post, and one booking row, in the copy. |
| `console` | No console error or warning across every load. |
| `thrown` | The copy is closed, and no request from the page went anywhere but this laptop (fonts excepted). |

When the page does not draw, the lines after `drawn` say "not tried: the site did not draw" at once instead of timing out.

## Results of the last runs

- `node scripts/studio/studio-check.mjs`: **15 of 15 green**, 18 s. Lines it could not reach (when the page does not draw) carry `skipped: true`. Hand wash $95 → $100 shown in 2 places and on booking step 1; Interior reset hidden; Saturday 9 AM – 5 PM → 10 AM – 3 PM; the one photo removed (the hero draws without it); a review added; 46 stamps / 31 connections checked before, 35 / 23 after; practice booking $85 = calculate-booking = stored; 15 times offered = available-slots' 15.
- `node --test tests/studio-check.test.mjs`: **4 of 4 pass** (63 s):
  - whole wire: all 15 green, exit 0;
  - `--break=missing-id` (the menu points at a group the dashboard lacks): first red is `valid`;
  - `--break=wrong-stamp` (the page claims Hand wash's price is Interior reset's): first red is `stamps` ("shows $95, the dashboard says $185");
  - `--break=frozen-price` (the page keeps the prices it first drew, a site holding its own copy): first red is `price`.
- `s1-check.mjs` (full, with the built leg): **64 passed, 0 failed** (63 before, plus "built bundle has no /site/preview").
- `tests/site-spec.test.mjs`: 15 of 15 (one new: the `live` rule for deleted photos).
- The repo suites listed under S1 plus site-spec: 86 of 86.

## Not done, or worth knowing

- **The snapshot is the example's.** For a real detailer, "a snapshot of the site's business" means reading their dashboard rows into a seed file; `--seed <file>` takes one, but nothing writes it yet (that needs the database, S3+ says no database tonight).
- The check runs at 390 only. The full grader (`site-grade.mjs`, all widths, Lighthouse, critics) is still separate.
- `/site/preview` trusts any page on this laptop to hand it a spec. That is deliberate (the Studio's origin and port can change), and the spec is still validated like any other; a production build has no such route.
- The `hide` test reads booking cards by their first words; a future card layout that puts something before the service name would need the selector updated.

## S2 after the review (`REVIEW-S2-S3.md`, 2026-11-05 afternoon)

Commits `1d000f07` (check) and `f8bcf12c` (renderer side of the S3 fixes). This supersedes the tick table above
where they differ.

- **S2-1, done.** The check no longer moves one fact of each kind. It changes **every** bound fact in the test copy
  to a new value no other fact has, then reloads:
  - every price (all above every old price, all different), name, description, length, inclusion and size price;
  - add-ons, plans and the sale;
  - the area and its zones, the phone, every question and the payment notes;
  - every day's hours (closed days are opened);
  - every photo and every review.

  Each `data-from` stamp is then judged twice, against its own new value and against its old one, which must be
  gone. Values only count whole (`$95` is not found inside `$950`), and case is ignored. Hiding a service, removing a
  photo and adding a review come after a second reload. Ticks are now 20, in plain words (`--plan` prints them):
  copy, valid, drawn, stamps, prices, words, extras, contact, hours, photos, reviews, hide, photo, review,
  stamps-after, quote, slots, post, console, thrown.
- **New break tests.** `freeze-others` (every price frozen except the first) and `same-price` (two services cost the
  same, and the page shows one's price in the other's place) both go **red on `prices`**. These were the reviewer's
  two "15 of 15 green" pages. `frozen-price` is red on `prices`, `wrong-stamp` on `stamps`, `missing-id` on `valid`.
- **S2-2, done.** With no test copy, or a revision that does not fit it, the check stops at once. It writes one red
  line, and every later line is "not tried". It takes 0.5 s, with no 30 s wait, and "drawn" needs at least one
  section. A test covers it.
- **Results:** `studio-check.mjs` 20 of 20 green in about 17 s. `tests/studio-check.test.mjs` 7 of 7 (whole wire,
  5 cuts, no copy). `s1-check.mjs` 64 of 64.
- **Not done:** S2-4 (an empty frame left after a photo is removed is not yet asserted) and S2-5 (one stamp checker
  shared with G0) are later work, as the review says.

## S2 leftovers (2026-11-05 evening)

Commit `16164a88`.

- **S2-4, done.** After a photo is removed, no picture frame may be left empty: no `figure`, photo or gallery slot,
  or wipe slider without a picture, and no picture that failed to load. The new `--break=empty-frame` leaves one,
  and the check goes red first on `photo`.
- **S2-5, done.** One stamp checker, `belt-staging/site-stamps.mjs`, is shared with the site grader's G0. Of the two
  it is the stricter: whole values per binding, plus old-value checks. `studio-check.mjs` imports it from
  `STUDIO_BELT`, and the Studio passes its own folder.
  - **Until `night/studio-tab` is in belt-staging `main`,** a hand run needs `STUDIO_BELT=C:/studio-work/studio-tab`.
    Without it the check stops with a plain message naming the missing file.
- **Results:**
  - `tests/studio-check.test.mjs` passes 8 of 8 (whole wire, 6 cuts, no copy).
  - `studio-check.mjs` is 20 of 20 green.
  - `s1-check.mjs` passes 64 of 64.
