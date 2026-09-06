# Overnight log — started 2026-09-05

One entry per roadmap item. What changed, what was verified and what it
actually printed, every question parked for the owner, every judgement call
made alone. **This file is the report; the transcript is not.**

Working branch: `claude/superbase-access-anj1h7`. Nothing merges or pushes to
`main`. Nothing touches the live business project.

---

## Roadmap 3.2(a) — the headless booking core

**What changed.** `app/src/book/core.js` is new: 29 exports, no React, no
markup, no CSS, and no `import` statement of any kind, so it drops into a
tenant's own site whatever that site is built on. It carries the step
sequence, the profile's fallbacks, the tenant's own defaults, the service
group rules, the mode limit, the vehicle-size arithmetic, the calendar, which
times a customer can actually have, the step gating, the two payloads that
carry money, and what the device remembers. Plus a transport: the four public
edge functions and the one public RPC, which is the entire server surface a
booking form needs.

**The judgement call, and it is the one that decides whether this item was
worth doing.** The obvious build is a new module beside the page. I wired the
page THROUGH it instead — `BookingPage.jsx` lost ~200 lines, the four public
calls in `lib/api.js` now go through the core's transport, and
`BookingBusinessContext`, `StepServices`, `StepVehicle` and `StepWhen` all
call it. **A core the product does not itself run is a core that rots**, and
the next person to find it wrong is a client's agent, not us. The cost is a
wider blast radius on this one change; the checks below are what pay for it.

**One structural change I made alone.** Three `useEffect`s applied the
tenant's defaults (service type, travel zone, vehicle size) as the profile
arrived. They are one effect now, latched in a ref. The reason is not
tidiness: the old guards were "is this field still empty", and `"small"` is
both a legitimate vehicle size AND the fallback, so once the defaults live in
`initialForm` a guard cannot tell "still unset" from "the tenant's first size
really is small". It cannot overwrite anything a customer typed — the page
draws a spinner until the moment it fires.

**What I verified and what it printed.**
- `node tests/booking-core.test.mjs` — **147 passed, 0 failed** (new file).
- Baselined by breaking what it guards, eight ways, each restored after:
  exclusive category stops clearing → 1 fail; `booking_mode` falls back to
  `request` → 2; the day leaves the quote key → 1; `has_water_electric` stops
  being written → 2; the category cap drops the newest instead of the oldest →
  2; `modeLimitFor` stops naming the service → 1; `offersBothModes` forgets
  `modeLimit` (the roadmap 2.5 bug) → 1; the remembered customer stops being
  scoped to a slug → 1. Restored: 147 / 0.
- **Two of its own checks were vacuous on their first run and that is worth
  recording**: § 1 reads `core.js` as text to prove it imports nothing and
  touches no Vite env, and the file's own header says *"no React, no
  `import.meta.env`"* in prose — so the check failed on the sentence promising
  the thing it checks for. It strips comments first now.
- `npm run build --prefix app` — built in 5.05s, 1954 modules, no errors.
- The credential-free suite, all green: composition 74, design-contrast all
  pairs, landing-pricing 65, route-contract 27, money-export 16, email-brand
  189, client-list 31, plans 73, setup-progress 24, campaign 16,
  platform-billing 263, payments 45.
- `node scripts/sweep-booking-steps.mjs` — exit 0, **"every step fits at
  1920x1080, 1440x900, 768x1024, 392x844"**, 55 measurements. **Every spare-room
  figure is identical to the ones CLAUDE.md records** — step 1 is 10px spare at
  1440x900 and 47px at 392, step 4 is 74px and 52px, step 3 is 111px and 118px
  — which is the strongest evidence available that this was a lift and not a
  rewrite. The two `scrolls` lines (the plans page at 197px, the member page at
  36px) are measured-but-not-gated by design and were the same before.
- `node scripts/e2e-booking.mjs` — **81 passed, 1 failed**, both tenants, and
  the one failure is the pre-existing non-regression CLAUDE.md already names:
  *"the booked day is offered to move within"*, because `available-slots` has no
  `exclude_booking_id` (unscheduled item F). Everything the change could
  plausibly have broken passed: the booking landed, matched what the price bar
  printed, both emails reached the provider, the slot was held, Accept worked
  on the dashboard, reschedule and cancel worked from the receipt, and **no
  console errors anywhere in the loop** on either tenant. The reserve-mode
  tenant printed *"Confirm booking"* and the request-mode one *"Request this
  time"*, so the branch that reads `booking_mode` still reads it.

---

## Questions parked for the owner

*(appended as they arise — nothing here blocks the next item)*

---

## Judgement calls made alone

*(appended as they arise)*

---
