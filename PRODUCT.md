# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Detailer-owners** — independent car detailers (often solo operators) who have a bad website or none. They run their business from the dashboard at `/app`, usually on a phone, often between jobs or in daylight glare.
- **Their customers** — car owners booking a detail on the tenant's public page at `/book/:slug`, mostly on mobile, in daytime.
- **Prospects** — detailers evaluating the platform via the marketing site at `/` (detailingplatform.com).

## Product Purpose

Multi-tenant SaaS that gives an independent detailer a professional website with online booking built in. Converted from a single-business site (Andrew's Auto Detail), which still operates and is off-limits. Success right now means **launch-ready polish**: closing the open threads (transactional email does not send; the reminder sweep has no scheduler) before seeking users — not growth metrics yet. Billing is not implemented; nothing charges anyone.

## Positioning

The concrete promise: **a professional website with booking built in** — for detailers with a bad website or none. Never "streamline your workflow" or generic SaaS-speak. The audience's own register is canon (from the old site): "A tunnel wash gets the surface wet and calls it a day. A proper detail actually protects your car."

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

- **docs/design-system.md ("Raking Light") is law** for anything a person looks at. Matte near-black ground, one lit element per screen, three type voices (Anybody wide/narrow, Public Sans, DM Mono for every figure). Changes contradicting it require updating that file first — never silent drift.
- Copy rules: sentence case, plain verbs, name what people control (reminders, never cron), errors say what to fix, empty states invite action.
- Tenant accent colors pass through `app/src/lib/theme.js` (the only file computing color in JS); the identity lives in the ground, the light, and the type — untouchable by the accent.

## Evidence on Hand

- Real product with a seeded demo business on a private Netlify test deploy; a real converted business's content as canon in `reference/` (read-only).
- No testimonials, case studies, or customer counts exist — never fabricate them. The struck $900 list price is real and config-driven.
- Design-rule tests in `tests/` (composition, design-contrast, landing-pricing, route-contract) run credential-free from repo root.

## Product Principles

1. Ship the honest thing: counted offers, real prices, no invented proof, no urgency theater.
2. The database enforces what matters (isolation, double-booking, founding spots); the app can be wrong without being dangerous.
3. Judge from the rendered product, not the code — every real UX bug here was found by looking.
4. One light per screen: the interface always knows the single next action, or shows none.
5. Every rule gets a test; a rule with no test is a rule that gets broken again.

## Accessibility & Inclusion

Design-system quality floor: text ≥ 4.5:1 on its actual surface in both themes (measured by tests), non-text edges ≥ 3:1, visible 2px accent focus ring, `prefers-reduced-motion` collapses all animation, tap targets ≥ 46px, responsive 320→1440.
