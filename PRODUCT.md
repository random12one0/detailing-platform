# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Detailer-owners** — independent car detailers (often solo operators) who have a bad website or none. They run their business from the dashboard at `/app`, usually on a phone, often between jobs or in daylight glare.
- **Their customers** — car owners booking a detail on the tenant's public page at `/book/:slug`, mostly on mobile, in daytime.
- **Prospects** — detailers evaluating the platform via the marketing site at `/` (detailingplatform.com).

## Product Purpose

Multi-tenant SaaS that gives an independent detailer a professional website with online booking built in. Converted from a single-business site (Andrew's Auto Detail), which still operates and is off-limits. Success right now means **launch-ready polish**: closing the open threads before seeking users, not growth metrics yet. (The two threads named here until 2026-08-31 — "transactional email does not send" and "the reminder sweep has no scheduler" — were both closed and proven in roadmap 0.2 and 0.3 on 2026-08-29. `PROJECT-STATE.md` §5 is the live list.) Billing is not implemented; nothing charges anyone.

## Positioning

**Updated 2026-08-29 by the owner. The website leads.** He reached it from the
market rather than from taste: "At first I was like, I'm just gonna sell this
booking engine. But I'm realizing there's already a lot of those out there. So
my main advertisement should be a custom website."

The concrete promise, in order of what to say first:

1. **A website and the dashboard that runs it, built for you.** One build, one
   purchase, one sentence. The owner was explicit that these are not sold
   separately: "it's combined... we're building this website and admin
   dashboard for you kinda thing" — NOT "a custom website, and it also comes
   with a dashboard", which demotes the dashboard to an accessory.
2. **The website half is custom, not a template.** This is the part that is not
   a commodity and the reason the price makes sense; every detailer gets their
   own. The dashboard half is deliberately standard for everyone. See
   `docs/tenant-websites.md`.
3. **The dashboard keeps the site current.** Change a price in your pocket and
   the site changes — no code, no waiting on a developer. **This feature is
   not the headline** — the owner was explicit about that — but it is the
   answer to what makes an agency-built site rot.
4. **Booking is a feature of the website**, not the product.
5. **The terms close it:** no commission ever, your customers are yours,
   cancel any time and your data leaves with you.

Never "streamline your workflow" or generic SaaS-speak. The audience's own
register is canon (from the old site): "A tunnel wash gets the surface wet and
calls it a day. A proper detail actually protects your car."

**Superseded:** `docs/design-directions/VERDICT.md` §3 records an earlier
answer — "the main thing we're selling is the admin dashboard with the
website". That was right about not selling car detailing and is still the
correction that matters most; the ordering within it has since moved."

## Operating Context

- Owners work outdoors and in vehicles; direct-sun legibility is a real constraint (design system: information must survive glare).
- Payment happens in person the same few ways for years (cash, card, Zelle) — recorded after the job, not processed online.
- Bookings are the unit of work: quoted, performed, finalized with payment, sometimes rescheduled/cancelled by the customer via unguessable receipt link.
- Tenant isolation is enforced in the database (RLS FORCEd), not the application. Writes of consequence go through Deno edge functions.

## Capabilities and Constraints

- React/Vite SPA in `app/` serving three surfaces from one bundle: marketing `/`, dashboard `/app/*`, booking `/book/:slug`, receipt `/booking/:id`.
- 18 Supabase edge functions; migrations in `supabase/migrations/` applied in filename order via Management API scripts.
- Founding offer is counted in the database (`founding_offer()`), never declared; the page fails closed to standard pricing.
- Pricing lives in `app/src/landing/pricing.js` only; tests enforce no hardcoded prices, no urgency theater, no free-trial claims.
- Known open threads (do not rediscover): email produces nothing in Resend (root cause unfound); pg_cron/reminder scheduling never wired; five deferred dashboard items; vCard export unverified on real Android.
- Standing constraints: develop on `claude/superbase-access-anj1h7`; `main` deploys to production; `reference/` is read-only; the old business's Supabase/Netlify/Resend are untouchable.

## Brand Commitments

- **`docs/design-system.md` ("The Thread") is law** for anything a person looks at, from 2026-08-30. One continuous cool-biased near-black ground, every section a different skeleton over it, one sharp accent (signal green `#38E08B`), two type faces — **Archivo** worked across both variable axes and **JetBrains Mono** for every figure. The reference rendering is `docs/design-directions/5-the-thread.html`, and where the document and that page disagree the page is right. Changes contradicting the system require updating that file first — never silent drift. Enforced by `tests/composition.test.mjs` and `tests/design-contrast.test.mjs`. **Not applied to `app/` yet — that is Phase 2.**
  - Replaced "Raking Light" (matte near-black, one lit element per screen, Anybody + Public Sans + DM Mono), scrapped by the owner 2026-08-28 and finished 2026-08-30. It is anti-reference only; what survived it is listed in the new file under "§11".
- Copy rules: sentence case, plain verbs, name what people control (reminders, never cron), errors say what to fix, empty states invite action.
- Tenant accent colors pass through `app/src/lib/theme.js` (the only file computing color in JS); the identity lives in the ground, the light, and the type — untouchable by the accent.

## Evidence on Hand

- Real product with a seeded demo business on a private Netlify test deploy; a real converted business's content as canon in `reference/` (read-only).
- No testimonials, case studies, or customer counts exist — never fabricate them. The struck list price is real and config-driven — **$999 since 2026-09-04, the owner's call** ("things that end in ninety nine feel more professional to me"); it was $900 before, and `docs/design-directions/5-the-thread.html` still shows $900 because that file is a SNAPSHOT of what he approved on 2026-08-30, not a live surface. Read the number from `app/src/landing/pricing.js`, never from the reference rendering.
- Design-rule tests in `tests/` (composition, design-contrast, landing-pricing, route-contract) run credential-free from repo root.

## Product Principles

1. Ship the honest thing: counted offers, real prices, no invented proof, no urgency theater.
2. The database enforces what matters (isolation, double-booking, founding spots); the app can be wrong without being dangerous.
3. Judge from the rendered product, not the code — every real UX bug here was found by looking.
4. One light per screen: the interface always knows the single next action, or shows none.
5. Every rule gets a test; a rule with no test is a rule that gets broken again.

## Accessibility & Inclusion

Design-system quality floor: text ≥ 4.5:1 on its actual surface in both themes (measured by tests), non-text edges ≥ 3:1, visible 2px accent focus ring, `prefers-reduced-motion` collapses all animation, tap targets ≥ 46px, responsive 320→1440.

**The tap-target figure has one deliberate exception and it is not drift**
(checked 2026-09-01, roadmap 2.11 step 6 stage 2): `--tap` is 46px and every
full-width control takes it, but `.btn.sm` is **38px** and is used at 28 call
sites in ten files — the job card's Navigate · Call · Text row and the job
record's action bar among them. It clears WCAG 2.2 AA target size (2.5.8,
24×24) with room; it is under the 44×44 of AAA 2.5.5, which this product does
not claim. `docs/dashboard-screen-designs-2026-08-31.md` §3 measured the row at
38px and built its whole label ceiling on that height, and raising it costs
16px of PINNED height on the narrowest screen. **Kept on purpose. Reopen it
with the owner, not in passing.**
