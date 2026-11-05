# Studio S1 — "Prove the wire": report

Branch `studio/s1` (worktree `C:\studio-work\s1`). Built 2026-11-04. Not pushed. The real database was never
called and no email was sent: everything ran against belt-staging's offline engine (`demo-backend.mjs`) and the
fictional Brightline Auto Care seed.

## What was built

| File | What it is |
|---|---|
| `app/site.html` | The renderer's own HTML entry. None of the dashboard's CSS, fonts or routes load. |
| `app/src/site/main.jsx` | Reads `/site/<slug>`, picks the committed spec, mounts the site. Same `.lite` motion switch as the dashboard. |
| `app/src/site/spec.js` | **The spec format and validator** (pure JS, no React/DOM). Binding allow-list, `parseBinding`, `validateSpec(spec, profile)`, `resolve(binding, profile)`, `bindingsOf(spec)`. Refuses unknown binding shapes, ids missing from the profile, digits / `$ € £ ¢ %` in prose, and any key the schema does not name (so a spec has no field a price could go in). Fonts are a curated list. |
| `app/src/site/Site.jsx` | One `BookingBusinessProvider` (the existing one: one `get_public_business_profile` read, `normalizeProfile`) feeds every section and the booking flow. Validates the spec against the live profile on every load; a refused spec draws a "waiting on a fix" page, never a wrong site. Clear not-found for an unknown slug or business. Sets description, canonical and LocalBusiness JSON-LD (areaServed, hours, priced offers) from the profile. A `MemoryRouter` keeps the booking flow's `?step=` inside the section. |
| `app/src/site/sections.jsx` | The 5 section types: **hero** (poster: photo, headline, Book/Call/Text, area, sale, price strip), **catalog** (ticket: services with "from" prices, durations, inclusions, size ladder via the booking flow's own `vehicleSizeExtra`, add-ons, plans via `lib/plans.js`), **proof** (wipe: keyboard-operable before/after slider on a native range input, stills, reviews with their source), **visit** (board: hours with today marked, area + travel zones + drop-off, `tel:`/`sms:`, payment, FAQ), **booking** (inline: the existing `BookingFlow`, embedded). Every bound element carries `data-from`, plus `data-section` / `data-part`. |
| `app/src/site/site.css` | The look: petrol ground, chalk type, vermilion accent; Newsreader display + Chivo body; the "job ticket" motif (perforated size ladder, notched price strip); one staggered hero entrance (transform/opacity), off under reduced motion. Restyles the booking flow only through its own `--bk-*` tokens. Phone first, then 768 and 1180+. |
| `app/src/site/specs/brightline.json` | The Brightline spec (§6c shape): tokens + one page + 5 sections, 15 bindings, no facts. |
| `app/src/book/BookingPage.jsx` | `BookingFlow` exported with `embedded`: no masthead, no second h1/main, no inline brand colours, `data-booking-step`. `/book/:slug` is unchanged (checked). |
| `app/src/book/BookingConfirmed.jsx` | Same `embedded` switch for the confirmation (h2, no masthead/main). |
| `app/src/book/core.js` | `normalizeSettings` now passes the site-wide sale through (`site_discount_active/percent/label`, contract §2e). The quote still applies it server-side. |
| `app/vite.config.js`, `app/public/_redirects`, `app/netlify.toml` | Second build input; dev **and** `vite preview` middleware; `/site/*  /site.html  200` above the catch-all in both production configs. |
| `app/public/examples/brightline/gallery-1..6.webp`, `credits.json` | Example art made by `scripts/studio/make-example-art.mjs`: **drawn illustrations, not photos, not AI**, two matched before/after pairs. The folder is gitignored (`app/public/example*`), so these were added with `git add -f`. |
| `tests/site-spec.test.mjs` | 7 node tests for the validator (credential-free, 0.2 s). |
| `scripts/studio/s1-check.mjs` | The browser proof: 49 checks, writes `artifacts/studio-s1/`. |

## How to run it locally

```bash
# 1. the offline engine with the Brightline seed (prints {"ok":true,"port":54390})
cd C:/Users/rando/Downloads/claude/control-room/belt-staging
SITE_ACCEPTANCE_PLATFORM=C:/studio-work/s1 node demo-backend.mjs --port 54390 --seed fixtures/sites/brightline.seed.json

# 2. the app pointed at it (second terminal)
cd C:/studio-work/s1/app
VITE_SUPABASE_URL=http://127.0.0.1:54390 VITE_SUPABASE_ANON_KEY=demo-anon npx vite --port 5173

# 3. open http://localhost:5173/site/brightline   (and /site/nope for the not-found)
```

PowerShell: `$env:SITE_ACCEPTANCE_PLATFORM="C:\studio-work\s1"` and `$env:VITE_SUPABASE_URL="http://127.0.0.1:54390"; $env:VITE_SUPABASE_ANON_KEY="demo-anon"` before the same commands.
Without the two `VITE_` variables the app has no API to call (there is no `.env` in the worktree, on purpose).

The proofs, all in one command (starts its own engine and Vite on free ports, ~2 minutes):

```bash
cd C:/studio-work/s1
node --test tests/site-spec.test.mjs
node scripts/studio/s1-check.mjs            # add --no-built to skip the production-bundle leg
```

## The proofs and their results

Last run 2026-11-04: **`s1-check.mjs` 49 passed, 0 failed**; **`site-spec.test.mjs` 7 passed, 0 failed**.

| # | Proof | Result |
|---|---|---|
| P1 | Change dashboard data in the offline engine → reload → site shows it, no rebuild | PASS. Interior reset **$185 → $205** in the menu ticket, the hero price strip and booking step 1 (and `$185` gone). Also: hiding "Complete care" removes it everywhere; Wednesday closing at 15:00 shows "9 AM – 3 PM"; ending the sale removes both sale bands; an edited FAQ question shows. 0 console errors. |
| P2 | A spec with `$185` in a headline is refused; an unknown binding is refused | PASS (unit test): `$185` → `typed_fact` on `copy.headline`; "Open 7 days", "10% off", "£90", "Since 2019" refused; `price:302`, `gallery.best(0)`, `reviews.top(n)`, `hours.week + 1`, a wrong-kind binding → `unknown_binding`; a deleted group or photo → `missing_id`; a `price: 185` key or unknown font → refused. In the browser: the live profile validates the spec, all **34** distinct `data-from` stamps parse as allow-listed bindings, **0** digits on the page sit outside a binding. Sabotage run (headline set to "Interior reset, only $185"): the check went red (6 failures) and the site drew the refusal page instead of the site. |
| P3 | Booking through the site reaches a recorded create-booking post; quote = calculate-booking | PASS. Hero "Book a time" lands on step 1; walked all 7 steps inside the site (Services → Add-ons → Vehicle → Place (drop-off) → Time → Details → Review); "Request this time" → confirmation in the site's design. Engine recorded one `POST /functions/v1/create-booking` → 200. **calculate-booking 85 = on screen $85 = `shown_total` sent 85 = stored row 85** (Hand wash $95 less the 10% sample sale). Exactly 1 booking row, status `pending` (request mode). Confirmation links: calendar → engine `booking-ics`, receipt → `/booking/<id>` (200). |
| P4 | Real browser at 390, 768, 1440 | PASS at all three: screenshots saved; 0 console errors/warnings; no horizontal overflow (scrollWidth = width); exactly one h1 and one main; all 5 sections; axe WCAG 2.1 AA **0 violations of any impact**; at 390 every control's hit area ≥ 44 px (measured including the booking flow's `::after` hit extensions). Clicked every link and button outside the booking flow (15 at 390, 18 at 768/1440): anchors land on their section below the sticky bar, skip link (Tab + Enter), both sliders move 5 steps and the clip follows, every FAQ opens, every `tel:`/`sms:` is `562-555-0100`. Reduced motion: `.lite` on, 0 running animations, 0 hidden elements. |
| P5 | Unknown slug; main app routes unchanged | PASS. `/site/nope` → "There is no site at this address". `/book/brightline` still draws the ordinary booking page with its own masthead. |
| P6 | Production bundle | PASS. `vite build` + `vite preview`: `/site/brightline` serves with live prices; `/site/nope` not-found; the dashboard's stylesheet and Archivo/JetBrains fonts are not loaded; 0 console errors. `npm run build` in `app/` passes and `dist/_redirects` has `/site/*` on the line above the catch-all. |

Repo tests run after the change, all green: composition, design-contrast, landing-pricing, route-contract,
no-credentials-in-tracked-text, every-open-item-is-citable, seo-files, spanish, push-urls-are-routes, and every
suite that imports the booking code (booking-core, booking-errors-announced, booking-refs, business-day-97-32,
closed-until, connect, fixed-furniture-is-hit-tested, receipt-fields); `var-scope-guard.mjs` clean.
`tests/ics-audience.test.mjs` fails **with and without these changes** (its live sections need credentials).

## Screenshots (`C:\studio-work\s1\artifacts\studio-s1\`, regenerated by every run, gitignored)

`site-390.png`, `site-768.png`, `site-1440.png` (full page) and `site-390-fold.png`, `site-768-fold.png`,
`site-1440-fold.png` (first screen); `edited-390.png` (after the five dashboard edits); `booking-step-1-390.png`
… `booking-step-6-390.png`, `booking-review-390.png`, `booking-done-390.png`; `not-found-390.png`; `results.json`
(every check with its measured detail).

## Not done, or worth knowing

- **Images are drawn illustrations**, honestly labelled; J5's licensed photos are still owed. The seed's own
  captions say "licensed asset pending", and the site prints captions as data.
- **Bundle:** the site's shared JS chunk is **157 KB gzip** (React, router, the booking flow and supabase-js,
  which `lib/api.js` pulls in), plus 8 KB for the site itself — under the 170 KB Polished ceiling but close.
  Splitting supabase-js out of the public booking path is the lever if it grows.
- **The full grade (`site-grade.mjs`) was not run.** Its G0 needs a `#site-contract` block with 10–14 sections
  (Polished tier, J11) and S1 has 5 sections by design. Its G5 would also flag the existing booking flow's own
  `box-shadow`/`background` transitions in `booking.css` — a product-wide question, not changed here.
- **Renderer microcopy** ("Book a time", "Hours", "Talk to us", "Base" on the size ladder, …) is English in the
  section components, not in the spec. Fine for S1; the Studio will want it as spec copy or `t()`.
- The business **name** is drawn from the profile in the site chrome; it is not one of the allow-listed
  bindings (the list was kept exactly as STUDIO-SPEC §6c gives it).
- The sticky booking price bar appears in mid-section in the *full-page* screenshots only — that is how a
  full-page capture paints `position: sticky`; in a real scroll it sits on the bottom of the screen.
- `/site/<slug>` only knows the committed Brightline spec; specs from a revisions table are S3.
- Nothing was pushed; the live repo and its `main` were not touched.
