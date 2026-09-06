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

## Roadmap 3.2(b) — closing the contract's §6 gaps

**What changed.** One migration
(`20260905001000_tenant_site_contract_gaps.sql`) and the two writing halves
that go with it.

- **§6b, the FAQ.** Its storage landed in September 2 with, in that file's own
  words, *"no writer and no reader on purpose"* — your split. The reader is now
  the public profile and the writer is a new **Common questions** settings
  screen, the ninth row `Business.jsx`'s own header designed in stage 6 and
  deliberately did not build. Sixteen settings screens now.
- **§6c, the payment handles.** Six columns that reached a customer's email and
  nothing else. On the profile now, plus `paymentMethods()` in the core so a
  site does not re-derive the order — and **nothing in the core turns a handle
  into a link**, because a wrong payment link sends somebody's money to the
  wrong person and `_shared/payments.ts` is the one place allowed to decide.
- **§6d, the closures.** Upcoming only, capped at 60, as a new `closures` key.
  A site can now *say* "closed the week of the 4th" rather than leaving a
  customer to find it in the date picker. It cannot decide whether a day is
  bookable — `available-slots` still owns that and always did.
- **§6h, credentials.** `business_branding.credentials` and
  `businesses.established_year`, with an editor on Business info. Five of the
  six real detailers studied lead with *licensed and insured* or a
  certification and the schema held none of it, so every bespoke site would
  have hard-coded it — and a lapsed certification would then live in a
  client's HTML where nothing here can see it.
- **§6e, the one thing this took AWAY.** `business_branding.social_google` and
  `social_yelp` are dropped. They shadowed the live
  `business_settings.google_review_url` / `yelp_review_url` pair and had save
  code on Business info with no input, so they had only ever been written
  empty. **Measured before dropping, not assumed:** all six rows in the
  product were null in both.

**Judgement calls made alone.**
1. **Dropped the two dead columns rather than leaving them.** A shadowing
   column is worse than a missing one — the next session to want "the Google
   review link" reads whichever it finds first and ships a page that silently
   shows nothing. It also breaks the Business info save if the code is left
   behind, which is why both moved in one change.
2. **`established_year` is its own column, not a credential entry.** "Since
   2016" goes in a masthead, an about paragraph *and* a footer; reading it out
   of a list means three places agreeing on which entry it is.
3. **A credential is `{label, detail?}` and nothing else.** The migration's
   comment allows an optional `year`, and the editor does not write one — a
   third input on a 320px screen for something `detail` already says
   ("Since 2021").
4. **`faq_enabled` stays separate from the list being empty**, and the core's
   `faqFor()` is the one function that reads both, so the flag cannot be
   forgotten at one of the two call sites a site ends up with.

**What I verified and what it printed.**
- Migration applied on the second attempt. The first failed loudly with
  `syntax error at or near "union"` — an `order by … limit` cannot sit
  directly before `union all` — and nothing ran, because the batch is parsed
  before any of it executes. Restructured to one `order by` over the union.
- The live RPC, read with the anon key exactly as a tenant site would:
  `business` now carries `established_year`, `branding` carries `credentials`
  and **no longer carries `social_google` / `social_yelp`**, `settings` carries
  `faqs`, `faq_enabled` and all six `pay_*`, and `closures` came back with the
  demo's real seeded blockout (`Equipment servicing`, 2026-09-09).
- `node tests/booking-core.test.mjs` — **164 passed, 0 failed** (147 → 164).
  New § 14 baselined: `faqFor` ignoring the switch → 1 fail, cash moved off the
  end of the payment list → 3, closures dropped from the profile → the suite
  will not even load.
- The credential-free suite, all green again: composition 74, design-contrast,
  landing-pricing 65, route-contract 27, money-export 16, email-brand 189,
  client-list 31, plans 73, setup-progress 24, campaign 16, platform-billing
  263, payments 45, booking-core 164.
- `npm run build --prefix app` — built in 4.02s, no errors.
- `seed-demo.mjs` now seeds five FAQs, three credentials and 2019 as the
  established year, **and that is not decoration**: a settings screen swept
  empty is the one state whose layout cannot go wrong, and this repo's most
  repeated finding is that such a screen prints `clean` and means nothing. The
  last FAQ is deliberately long enough to wrap at 320 with all three of its
  icon buttons still on the line.
- `sweep-widths.mjs` walks **Common questions** as of this change — added in
  the change that BUILT it, not by the item that later finds it broken.
- **`sweep-widths.mjs` — exit 0, clean at 1920, 1440, 392, 360 and 320**, 256s,
  with Common questions walked clean at both extremes.
- **`sweep-widths.mjs --lite` — exit 0, clean at all five widths.**
- **`sweep-booking-steps.mjs` — exit 0**, every step fits at all four sizes,
  every figure still identical to the recorded ones.
- **`e2e-booking.mjs` — 81 passed, 1 failed**, the same documented
  `exclude_booking_id` gap. Worth noting: it PASSED on the second tenant this
  time and failed on the first, which is the occupancy-dependence CLAUDE.md
  describes rather than anything moving.
- **Two states went unmeasured for reasons of the CLOCK, not the code**, and
  the sweep printed both rather than skipping them: `job record · to do`
  ("none on the rail at this hour" — the demo trades 08:00–18:00 and the run
  was at 23:40 local) and `job record · tomorrow` (tomorrow is a Sunday and the
  demo is closed Sundays). The job record itself WAS measured in its request
  and finished states. Pre-existing and date-dependent.

**And one thing I found by LOOKING that no check could see.** I shot the new
screen at 392 and the row was tight: the FAQ is the only list in this product
with THREE controls on a row (up, down, delete) and its text is a whole
question rather than a name, so the question fell to about 200px, wrapped to
two lines, and its answer was clamped beside three buttons. **Every check said
`clean`** — nothing was off an edge, outside its box or touching. Fixed with
six lines of CSS scoped to `.faq-rows`: on a phone the three controls take
their own line and the question takes the full width. It carries
`and (min-height: 500px)`, because the rule SPENDS height and your
portrait-only ruling says rotating a phone must change nothing — the sixth
instance of that guard, and the first written with it on the first line rather
than added afterwards. Re-shot: the question is one line and the answer gets
two full-width lines. Re-swept at 392, 360 and 320 with the full settings walk
and in the animations-off path.

**And running THAT deeper sweep turned up a real defect on your own phone width
that this item did not cause.** On Monthly plans, the *How it's priced* control
— `$ / month · $ / visit · $ up front · % off` — sits **28 pixels past the edge
of its own row at 392**. Clean at 320, clean at 360, clean at 1920, broken at
392, in both paths.

**Why nothing had ever seen it, in plain terms.** To keep sessions fast, the
fourteen settings screens are only measured at the two extreme widths, 320 and
1920 — the bet being that if a screen survives both ends it survives the
middle. And there is a special set of rules for screens narrower than 361px
that already stacks a control like this. So 392 is the exact width where the
control is too wide AND the narrow-screen rules do not reach — and it is the
width of the phone you are reading this on.

**I proved it was not mine before touching it**, by re-running the same sweep
with tonight's only other CSS rule switched off and watching it fail
identically. Then fixed it the way the file already fixes this: on a phone the
four labels take a full-width row of their own.

**This is the second time this exact shape has bitten**, and `theme.css` says
so in its own words about a different control. The rule worth carrying: *a fix
written for screens under 361px is a fix that does not exist at 392.*

**One correction to my own work while I was there.** The FAQ rule I wrote first
carried `and (min-height: 500px)`, copied from the five rules in this repo that
have it. I took it out. Those five are the opposite kind of rule, where the
guard stops a phone turning into a desk layout when you rotate it; on mine it
does literally nothing. A guard copied without its reason is decoration, and a
comment claiming a protection the code cannot give is worse than no comment.

---

## Roadmap 3.3 — a detailer's own web address

**The roadmap entry named the smaller half.** It said *"hostname→business
lookup + the Netlify alias process"* — a customer arriving on the detailer's
address. The bigger half is the other direction, found five days ago writing
the 3.1 contract: **every link the platform emails on a detailer's behalf said
detailingplatform.com**, even for a detailer on their own domain. That is the
one place a customer can see that their detailer is using somebody else's
system. Both halves shipped.

**What a detailer sees now.** A new **Business → Your web address** screen:
type `book.yourdetailing.com`, press Add, press *Check it*. Once it is live,
their booking page answers at that address AND every link in every customer
email uses it — confirmations, reminders, receipts, the plan page, the opt-out.
The old detailingplatform.com link keeps working; nothing already in a
customer's inbox breaks.

**One step is yours and cannot be automated yet, and the screen says so.**
The address has to be added as an alias in Netlify before it can answer at
all, and that is a dashboard action. `docs/custom-domains.md` is the runbook —
three steps, with step 2 marked as ours. **I made the screen say that out
loud** rather than leave a detailer pressing *Check it* for ever, which is the
defect roadmap 2.11 spent a pass removing one screen over. Automating it needs
a Netlify account token behind the platform admin of roadmap 4.4.

**Judgement calls made alone.**
1. **A stored address means "a hostname that points at our app" — not "the
   detailer's website".** This is the whole item and I want it flagged. The
   receipt page, the plan page and the opt-out page are pages OUR app serves; a
   website-package detailer's bespoke site does not have them. So pointing
   those links at their main site would swap one embarrassing seam for a **404
   on a customer's own booking**, which is much worse. Hence "usually a
   subdomain" on the screen and in the runbook.
2. **The address is PROVED, not claimed.** *Check it* fetches a marker file
   from the address itself; nothing a detailer types can make that true. And
   one line of the migration stops a detailer marking their own address as
   verified — without it the check would have been decoration.
3. **The "site" argument is required everywhere rather than defaulted.** A
   default would have kept every existing line working and let one forgotten
   spot quietly keep the old seam. Required, a forgotten one produces an
   obviously broken link that an existing test already fails on.
4. **The demo's seeded address is deliberately NOT verified**, so the demo's
   emails keep pointing at the platform — a verified fake address would make
   every demo email link to a host that does not exist.

**What I verified and what it printed.**
- `node tests/custom-domains.test.mjs` — **59 passed, 0 failed** (new).
  Baselined four ways, each restored: a URL builder falling back to the global
  → 1 fail; one call site forgetting the tenant → 1; the column lock removed →
  1; the lookup no longer requiring verification → 1.
- `route-contract` **failed first and was right to** — it pins that the URL
  builders' paths match the router's routes, and the change it caught is
  exactly the one it watches for. Updated and given one more check so it can
  never go vacuous: **28 passed, 0 failed**, baselined by breaking a path.
- `node scripts/e2e-booking.mjs` — **82 passed, 0 failed**, both tenants, a
  fully clean run. (The reschedule check that failed earlier tonight passed
  here, which confirms it is the date-and-occupancy dependence CLAUDE.md
  describes rather than anything moving.)
- `node scripts/sweep-widths.mjs` — exit 0, **clean at 1920, 1440, 392, 360 and
  320**, with the new screen walked at both extremes.
- `node scripts/render-emails.mjs` — all 23 emails render, no `undefined`
  anywhere, which is the check that would catch a forgotten address.
- The two new database lookups smoke-tested with the anon key exactly as a
  browser would: an unknown host returns nothing, and a business with no
  verified address returns nothing.
- Ten edge functions redeployed; `verify-domain` is member-gated
  (`verify_jwt=true`).
- `--lite` sweep and the booking-step sweep: below.

**And a second thing found by LOOKING that no check could see.** I shot the
new screen at 392 and `book.coastlineautodetailing.example` was printing
straight over the *Check it* button beside it, with the line underneath cut off
mid-word. **Every geometry check said `clean`** — overlapping text is not
outside its parent, not past an edge and not two boxes touching. Two causes,
both fixed: a hostname has no spaces so it had nowhere to break, and this row
needed the same phone treatment the FAQ row got earlier tonight. The CSS rule
is now shared by both lists rather than copied, and re-shot it reads properly:
address on its own line, full sentence underneath, controls below.

**And a Windows trap worth recording, because it nearly cost real time.**
`perl -pi -e` rewrites a whole file with Windows line endings — **even when the
search matches nothing**, so a no-op edit still converts the file. Three files
were converted. Nothing was committed wrong (git normalises these on the way
in) but a byte-exact check would have gone red in a file I had barely touched,
which is a diagnosis this repo has already paid for twice. Worse: a scripted
edit piped through the shell sometimes arrived mangled, so the edit silently
did nothing while the command reported success — that happened three times and
twice I only caught it by grepping afterwards. Both are now written into
CLAUDE.md with the fix.

---

## Roadmap 3.4 — the build kit

**Ticked without writing a new file, and that was the whole judgement.** 3.4
and 3.2(c) describe the same thing from two different dates: *"open an agent
pointed at this repo and have it already know everything needed to build a
client's website properly"*. `docs/tenant-site-kit.md` already was that.
**Writing a second kit to satisfy the older wording is exactly the third-plan
mistake you named** — *"Isn't there already a plan. Follow the docs."*

**So I read 3.4's own list against the file and filled what was genuinely
missing**, which was worth doing:

- **`docs/references/TASTE-NOTES.md` is now on the reading list, and it is the
  best thing in it.** Your own words, verbatim, after scrolling seven sites you
  picked — the only record anywhere of how those pages MOVE, because a
  screenshot is a still. The kit's new §5b says how to read it: **for motion,
  never for look**, since those seven are software and agency sites and copying
  their look is the same mistake as copying our landing page. One line in it
  answers the "it all looks AI" problem better than anything I could write:
  *"I also like how each section looks different, you know, and they all don't
  look the same."* Every page you have rejected so far has one section shape
  repeated down the page in three colours.
- **A new §6: what a client actually gets to change** — a plain table of yes /
  check-the-contract / no, with the one hard no being a price, service, hour or
  plan typed into a site instead of read from the dashboard.
- **Two of 3.4's own bullets are out of date and the kit says so rather than
  quietly dropping them.** It asked for the design system and the landing page
  as the worked example; both predate your correction that a tenant site
  inherits our method and never our skin. The kit now tells an agent *not* to
  read the design system, and why.

**Nothing to verify beyond reading it** — it is prose pointing at files that
were all checked tonight.

**One thing 3.4 named that stays unbuilt, as its own entry always said: the
intake form** — the short set of questions a detailer answers about their
website, with examples to pick from, "because most of them will not know what
they want in the abstract". It is not scheduled and I have not scheduled it.
The kit's §6 says what to do until it exists. It and the taste pass in the
question below are the two things that would most improve a real client's
site.

---

## Roadmap 4.1 — auditing the old site for anything the rebuild dropped

**What changed.** `docs/reference-audit-2026-09-05.md`. Every one of the old
site's fourteen edge functions, twenty-six migrations and public sections read
against this platform — by NAME first and then by BEHAVIOUR, because a matching
name proves nothing. That is exactly how the campaign tables survived the
rebuild as three empty tables and got counted as kept.

**THE ONE REAL FIND, AND IT IS THE ONE THING IN TONIGHT'S WORK I MOST WANT YOU
TO SEE: there is no way to reset a password, and no way to change one either.**

- A detailer who forgets their password cannot ask for a reset link. Nothing in
  the app can send one.
- A detailer who wants to *change* their password — after sharing it with
  somebody, after a staff member leaves — has no screen to do it on.
- If somebody sent them a reset link by hand, it would sign them in and then
  give them nowhere to type a new password. That is the confusing kind of
  broken rather than the obvious kind.

**Your old site had the second half and never had the first**, and that was
fine: you were the only user and could have it done from the Supabase dashboard
if you ever needed it. **It stops being fine at the second detailer**, whose
support channel then becomes texting you at whatever hour they locked
themselves out — and the admin screen that would let you do it for them
(roadmap 4.4) is the last thing in Phase 4.

**I did NOT build it tonight, on purpose.** It is the sign-in surface, it is
the one thing in the product where a mistake locks everybody out rather than
one person, and you should know it is being added before it is. **It is one
screen and two calls — I can do it in well under an hour whenever you say go.**
It is written up as item **N** in the roadmap's unscheduled list and §A1 of the
audit.

**The other result is the more useful one and it is the point of doing this
properly: sixteen things that LOOK dropped and are not.** The review-request
email, tips and upsells, the canned text messages, the vCard builder, hours
overrides, the wrap-up nudge, the $5 rounding (now settable per detailer), the
order the discounts apply in, the finalize-payment columns, every field of the
old CMS. All read in both codebases and listed with where each one lives now,
**so nobody ever audits them again and rebuilds one.**

**And it sized roadmap 4.2 for you**, which was the other thing worth having:
- **The vCard on your booking-alert email is about an hour**, not a feature.
  The platform already builds vCards and the email helper already takes
  attachments — only the attaching is missing. It is also the most useful thing
  on that list for a business run off a phone, so I would do it first.
- **Google Calendar sync is the one that needs a decision from you**, not a
  port. Your old one used a single service account for your own calendar; per
  detailer it becomes each of them granting access to theirs, which is a
  different and larger thing.
- **`completed_washes_count` on the customers table is a third of the loyalty
  feature with nothing writing it** — already flagged as dead back in roadmap
  2.11. Either the rest gets built or the column should go.

**Verified:** nothing to run — it is an audit, and every claim in it names the
file it was read from, in both codebases.

---

## Roadmap 4.2, part 1 — the contact card and "what does my customer get?"

**Two of the four things 4.2 names, both confirmed missing by last night's
audit and both now back.**

### The customer's contact card on your booking alert

Your old site attached a contact card (.vcf) to the email that told you a
booking had come in, so one tap put the customer in your phone. The rebuild
dropped it. **It is back, and it was about an hour** — the platform already
knew how to build a contact card (the *Save contact* button on a job) and the
email helper already knew how to carry an attachment; only the attaching was
missing.

It goes on **your** copy only — a customer does not need a contact card for
themselves — and only when there is a phone number or an email on it, because
a card with a name and no way to reach them wastes the tap.

### "Send me a sample" on the Notifications screen

The other thing your old site had: a way to see exactly what a customer
receives **without making a real booking and deleting it**. Press it and you
get two emails — the one your customer gets and the one you get — made up from
a sample customer but **priced from your own real services**, sent to your own
address and nobody else's, with `[Preview]` on the subject. Nothing is saved
and no time is taken out of your calendar.

**The judgement call, and I want to be straight about the trade.** The obvious
build is a flag on the booking engine that says "send the emails, skip the
save". I refused it: that is four new branches through **the single most
important function in the product** — past the slot check, the promo limit,
the customer record and the insert — every one of them a path no test walks,
to save a customer nothing. **A booking engine that is a little bit
conditional is how a booking engine starts being wrong.** So it is its own
small function that runs the same pricing engine.

**What that costs, stated honestly: the sample does not exercise the actual
saving of a booking.** It exercises everything you are really asking about —
your branding, your colour, your logo, your prices, your wording — and nothing
about whether a row lands in the database. The end-to-end test is what covers
that, and it passed 82/82 tonight.

**What I verified and what it printed.**
- `node tests/vcard.test.mjs` — **34 passed, 0 failed** (new). It also pins the
  two copies of the card-builder together: the email's and the dashboard's are
  separate files by necessity (an edge function cannot import from the app),
  so the test runs both on the same eight customers and fails if one character
  differs. Baselined by removing the escaping: 6 failures, including the
  cross-copy check.
- **A real call to the new function returned `200 {"success":true,"sent":2,"to":["demo@example.com"],"total":65}`** — signed in as the demo owner exactly
  as the dashboard does, two emails built and accepted by the relay, priced $65
  from the demo's own first service. (That address is on a reserved test
  domain, so nothing left the provider — by design, so the demos cannot damage
  the sending reputation your real business shares.)
- `node scripts/e2e-booking.mjs` — **82 passed, 0 failed**, both tenants, with
  the contact card now riding the owner alert.
- Nine credential-free suites green, including `email-brand`'s 189.

---

## Roadmap 4.2, part 2 — campaign links, and why the box is still unticked

**Your golf-course QR code works again.** Make a link on the new **Business →
Campaign links** screen, print the QR on a flyer, and whoever scans it lands on
your booking page **with the discount already applied**. You can then see that
the flyer was opened forty times and produced three bookings.

**It was 60% built and reaching nobody**, which is the interesting part. The
booking engine already knew how to attribute a booking to a campaign, the
tracking function was already written and public, and the tables already had
the right permissions. **Every single caller was missing** — nothing on the
booking page ever passed a campaign, and there was no screen to make one or
read the numbers. That is the "a surviving table is not a surviving feature"
trap the audit named, in its most complete form.

**Two judgement calls.**
1. **The discount is chosen from your existing promo codes, not typed into the
   campaign.** A campaign that invented its own code would be a second place
   discounts are defined, and the one that is not on the Promo codes screen is
   the one nobody remembers to turn off.
2. **A code somebody has already typed by hand is never overwritten** by the
   campaign's. Replacing a code a customer entered with one they never saw is
   the version of this that loses trust.

**And it closed a loose end from last night's custom-domains work.** The
booking link this screen shares — and the three other places in the dashboard
that show one — built its address from the browser's own, which is always
detailingplatform.com because that is where you sign in. So a detailer with
their own web address would have printed OUR domain on a card while every
email they send uses theirs. Now all four read the verified address.

**What I verified and what it printed.** `booking-core` **185 passed, 0
failed** (164 → 185), baselined two ways: dropping the campaign memory fails 1,
dropping the attribution from the booking fails 3. The sweep walks the new
screen — `Business · Campaign links   clean`. `sweep-widths` clean at all five
widths and in the animations-off path; `sweep-booking-steps` exit 0, every step
still fits.

**And one thing the end-to-end run taught me about the test rather than the
product.** It came back **77 passed, 0 failed** where the earlier run tonight
said 82 — no failures, five fewer checks. **Fewer checks with zero failures is
this repo's oldest trap wearing a green tick**, so I chased it: the second
business's email leg had skipped, printing *"needs SUPABASE_ACCESS_TOKEN and
SUPABASE_PROJECT_REF"* — while the FIRST business's identical leg had just
passed in the same run, so that message could not be true.

It was a rate limit. Reading Supabase's logs needs an API call, and after a
night of about twelve deploys and two migrations they started refusing. **The
message named the wrong one of the two reasons it can fail**, which is the
thing worth fixing: it says which now. Re-run on its own,
`--slug=demo-riverside` passes **39 of 39**, including both emails. Nothing was
wrong with the product.

**AND THE SAME KIND OF DEFECT CAUGHT ME A THIRD TIME TONIGHT, which is worth
more than the three fixes.** The new *Send me a sample* button had its
explanatory sentence printed straight through it — I had copied a small
negative margin that works under a text field, and a button row does not have
the margin it was cancelling. Every automated check said `clean`.

**So I built the check that would have caught all three, measured it, and
threw it away.** The width sweep's four checks all ask about an EDGE — is
something off the screen, outside its parent, scrolling sideways, touching the
box below — and **text printed on top of something is inside every edge it is
supposed to be inside.** I wrote an overlap check, narrowed it hard, and it
reported **449 problems at one width**, almost all of them boxes that overlap
while the words inside them do not. A check that cries wolf on every run is a
check people start skipping, so it is gone and the finding is written into
CLAUDE.md instead: **overlap is something only looking can catch**, which is
one more reason I screenshot every screen I touch rather than trusting a green
run.

**WHY 4.2's BOX IS STILL UNTICKED — the two that are yours to answer**, both
written up as items **O** and **P** in the roadmap's unscheduled list with a
recommendation each:

- **Google Calendar sync.** Your old one used a single Google account writing
  to a single calendar — yours. Per detailer that is not a port: each one has
  to grant us access to their own calendar, which needs a Google app review,
  a token store and a reconnect path. **My recommendation: ask whether it is
  worth it before anyone builds it**, because the cheap 80% already ships —
  every booking email carries a calendar attachment that adds the job in one
  tap. The expensive 20% is that it keeps up when a booking MOVES.
- **Referral / loyalty: what does a referral actually earn?** Your old site had
  the columns and no logic — nothing ever granted anything — and one of those
  columns came across here and has been dead ever since. Does the new customer
  get a discount, the existing one a credit, or both? How much? Is there a
  "every fifth wash" count? **One paragraph from you and it is a normal build.
  If the answer is "not yet", say so and I will drop the dead column**, because
  a column nothing maintains is exactly what this repo flags everywhere else.

---

## Roadmap 4.4 stage 1 — your own dashboard for managing detailers

**The thing you asked for in your own words** — *"I need to have a dashboard
myself where I can manage all of the detailers… I don't really know what
features I need"* — and the specification that answered it
(`docs/platform-admin-2026-09-04.md`) is now partly built.

**Go to `/admin`.** You get four numbers across the top (businesses, how many
are not suspended, what you are earning a month, founding spots left), a
searchable list of every detailer with the four filters the spec named, and —
when you tap one — their setup progress, how they take bookings, their people,
their own web address, **a free-text notes box**, and the actions.

**The actions, each one there because the alternative is me editing the
database by hand for you:** suspend or restore (their booking page goes dark,
nothing is deleted — the same mechanism the unpaid-card work already built),
mark or release a founding spot, and **open their dashboard as them** — which
the research says is the single biggest time-saver in any back office. *"My
Tuesday hours aren't showing"* becomes thirty seconds instead of a
twenty-message thread.

**The security is the part I want you to know about, because it is the one
screen where a mistake shows every detailer's data to the wrong person.**

- **Who is allowed in is a row in the database**, not a setting in the browser
  and not something in a config file. A detailer signed in and typing the
  address gets **"Page not found"** — I proved that live, not by reasoning:
  the demo owner's account gets a 404 from the server.
- **It says "not found" rather than "you are not allowed"** on purpose. The
  second one tells a curious person that the page exists and that one row is
  all that stands between them and it.
- **I refused the easy way to build it.** The quick version tells the database
  "or let an admin see everything" on all twenty tables. It works immediately
  and it puts a hole in twenty places that are otherwise provably locked to one
  business — one typo later and a detailer sees somebody else's customers.
  Instead the back office reads *nothing* directly; it all comes through one
  gated function. **The test walks every database change in the repo and fails
  if anybody ever adds that shortcut.**
- **Opening somebody's dashboard is written down before it happens — who, when,
  whose — and if the record cannot be written the action does not happen.**
  Everywhere else a failed log is just a note in the server log; here it is the
  whole point. If a detailer ever asks "were you looking at my numbers?", you
  want a record rather than a memory. You can see that history on their page.
- **Your notes on a detailer are yours.** The detailer cannot see them, they
  are not on their website, and the test proves no screen they can open reads
  them.

**One thing you need to do before you can use it: you do not have an account on
the platform yet.** There are no real users on the project at all — only test
ones. Sign up at detailingplatform.com and tell me, and I will add you as an
admin (one line). I did **not** make the demo login an admin, deliberately:
that password is `demo123` and it is on the live site, so making it an admin
would put every detailer's data behind it.

**What I verified and what it printed.** `tests/platform-admin.test.mjs` —
**34 passed, 0 failed** — baselined three ways, each restored: adding the
cross-tenant shortcut to one policy fails it, making the audit optional fails
it, letting the screen read the database directly fails it. Four of its checks
were **test** bugs on the first run, and two of those were the same
comment-matching trap I hit earlier tonight — a check failing on the sentence
that promises the very thing it checks. The screen itself: measured clean at
1440, 392 and 320, **no console errors**, and the live calls returned real data
(14 businesses, the demo's setup showing *6 of 7* — the same number the
detailer sees on their own screen, because both run the same function).

**Still to build (stage 3):** the website columns.

---

## Roadmap 4.4 stage 3 — the website column

**What changed.** Each detailer's page in the back office now has **their
website** on it: the address, when it was last touched, and whether a custom
address is pointed at their booking page. There is a new filter on the list —
**No website yet** — which is really a work queue, because you build these by
hand.

**Where the facts came from, and the one judgement call.** You asked for four
things: do they have a site, what is its address, is a custom domain pointed at
it, and when was it last touched. **Only the third already existed** — roadmap
3.3 built that table last night. The other three are facts about work done
outside the product, so they are two new columns on the business.

**I deliberately did not reuse the custom-domain field for the address.** That
field means something narrower than it sounds: a web address that points AT
this app, which is how a customer's receipt stops saying detailingplatform.com.
A detailer's actual website can live anywhere. Putting one in the other's box
would point a customer's own booking link at a page that does not exist — the
exact failure last night's item warns about — so they are two separate lines on
the screen and a check now fails if the site button ever writes to that table.

**A record you can edit is not a record**, so the detailer can read both new
columns and write neither (the same lock roadmap 3.3 put on "verified"), and
"last touched" is stamped by the server rather than typed into a box.

**What I verified, and what it printed.** Live as the seeded admin account:
saving a bare `ridgelineautodetail.com` stored `https://ridgelineautodetail.com`
(without the `https://` an address in a link is treated as relative — it would
have opened `/admin/ridgelineautodetail.com`, which fails by going somewhere
plausible rather than by erroring); rubbish returned **400 "That is not a web
address."**; clearing it put the field back to empty; and the audit line
recorded the address it had before, which needed one more column in the
lookup — the first version logged `from: null` every time.
`tests/platform-admin.test.mjs` **40/40** with six new checks, **each one
baselined by breaking the thing it guards**, `composition` 74/74,
`custom-domains` 59/59, `booking-core` 185/185, build clean.

**And LOOKING caught what the measurement could not, for the fourth time
tonight.** Every width measured clean — but the greyed example address in the
empty box read as a real value, sitting directly above the line saying *No
website yet*, so the screen appeared to argue with itself. The placeholder is
dimmed now.

**No questions parked.**

---

## Roadmap 4.4 stage 2 — signing somebody up at their shop, and resending a stuck invite

**What changed.** Two buttons on `/admin`, and one shared definition behind
them. **Create and invite** takes a name, a booking address, the owner's email
and a timezone, makes the business, and emails that person their invite.
**Resend invite** on any business's page makes a fresh link and sends it again.
Before tonight the first was a line of SQL typed into a console and the second
meant opening the accounts table.

**The judgement call: I did not copy the signup code.** "What a new business
is" lived in one place — the signup function — because signing up was the only
way one could ever exist. Adding a second way is exactly how two kinds of
business quietly start to differ: one created by hand with no settings row
shows a dashboard of blanks, one with no opening hours has a booking page
nobody can book. **Neither of those breaks loudly.** So both doors now call the
same `_shared/newBusiness.ts`, which also gives a new business a working week
(Mon–Fri, 9–5, weekends closed) from its first second — not because that is
right for every detailer, but because a booking page with no open days looks
identical to a broken one, and that is a poor thing to hand somebody at their
own counter.

**The one thing that helper refuses to do is pick the owner.** At signup the
person is standing there with an account; from the back office they may have no
account at all. That is why the invite is the other half of this and not a
separate feature.

**What I verified, and what it printed.** Both actions run live as the seeded
admin account:
- `create` → `200 {"success":true,"business":{…"slug":"inperson-gh9d2"…}}`
- `resend` → `200 {"success":true,"invite":{"email":"delivered@resend.dev",
  "link":"https://detailingplatform.com/invite/9502c185…","emailed":true}}`
- the test business deleted afterwards → `204`, then the list came back empty.

`tests/platform-admin.test.mjs` **34/34**, `tests/composition.test.mjs`
**74/74**, `npm run build` clean. The new form measured at **1440 clean, 392
clean, 320 clean, no console errors**, and I looked at the screenshots rather
than trusting the geometry check — that check cannot see text printed on top of
a button, which it proved three times earlier tonight.

**No questions parked.**

---

## Roadmap 4.4 stage 4 — your own prices, editable without a developer

**What changed.** *What we charge* on `/admin`: the eleven figures behind the
pricing page and the checkout, in one form. Saving them changes what the next
detailer is offered, everywhere at once — the marketing page, the pricing page,
the price a card is charged and the sentence somebody ticks when they buy.
**Everybody already paying keeps the price they agreed to**, because every
figure is copied onto their subscription the day they buy and is never read
again.

**Why this one setting and not a settings screen.** Your words on 2026-09-05
were *"everything that could be a changeable fact should be linked to
Supabase"*, and the honest answer from the audit was that almost nothing in
this product qualifies — most of what looks like a setting is a rule. **The
prices are the exception, and for a better reason than convenience:** they are
typed out twice on purpose (once for the website, once for the part that talks
to the card machine, because the two halves cannot share a file), and about 260
checks exist purely to keep the two copies identical. **One row in the database
makes them one number.**

**The safety net, which is the part I would want you to know.** Leaving the
form blank — or a number that makes no sense, or the database being
unreachable — all mean exactly one thing: **the built-in prices, which are what
the product charged yesterday.** It never uses half of your table and half of
the file; one bad figure discards the whole thing. And there is a **Back to the
built-in prices** button, which is a real one press undo.

**What I verified, and what it printed.** Live, end to end:
- saving `$900 / $55 / $550 / $69` and the founding column at `$450 / $35 /
  $350 / $44` → the public pricing page then printed **every one of them**,
  including the sentences it works out for itself: *"$420 over 12 months"*,
  *"walking away halfway through costs $105"*, and the build-fee paragraph.
  **Nothing was left at the old price.**
- the detailer's own billing screen with the same override: **$3500 a month
  charged, $5500 struck through, $45000 build fee** — and the consent sentence
  they tick regenerated to match (*"$450 once for the build and $35 every month
  after that"*).
- typing rubbish → **400, "Those prices do not add up — every figure must be a
  number, and only the setup fee may be zero."**
- pressing *Back to the built-in prices* → back to `$4000 / $6000 / $49900`
  exactly.
- a detailer trying it → **404**, the same as every other admin action.

`platform-billing` **283/283** (twenty new checks, four of them baselined by
breaking what they guard), `landing-pricing` **67/67**, `platform-admin`
**40/40**, `composition` 74/74, build clean, and `/admin` measured clean at
1440/392/320 with no console errors in both states.

**Two judgement calls I made alone.**
1. **The form warns and never refuses.** Your ladder has two rules — a year up
   front is two months free, and month-to-month costs 25% more — and if you
   type numbers that break them, the screen says so and still saves. They are
   your prices and your positioning ($999 rather than $900 was your own call);
   a form that will not save a number you chose is a form you stop using.
2. **Nothing is seeded into the database.** The row starts empty, so the files
   stay in charge until you deliberately change something. Copying the current
   prices in would have created a third place the same numbers live, and the
   moment the files changed it would be the stale one that wins.

**And one real defect the override let me find.** The pricing page WORKS OUT
the saving rather than having "two months free" typed into it — which is what
keeps that sentence true when a price changes — but with a year price that is
not a whole number of months it printed `2.909090909090909`. It rounds to one
decimal now, and the warning in the editor tells you exactly what the page will
say (*"the pricing page will say '2.9 months free'"*). Nothing was ever
mispriced; the sentence just stopped sounding like it meant it.

**One question parked — question 3 below.**

---

## Roadmap 5.1 — moving your own business onto the platform

**What changed.** The program that copies your old site's data into the
platform: `scripts/import-legacy.mjs`, the rules it follows in
`scripts/legacy-map.mjs`, 47 checks over those rules, and a plain-language plan
in `docs/migration-plan-2026-09-06.md`.

**I could not run it, and that is the honest headline.** The key in this repo
opens the PLATFORM's database and answers **403** for the old site's. So the
program has never touched real data. **Question 4 below is the one thing it
needs from you.**

**So I split it in the way that makes the untested half harmless.** A plumbing
failure is loud — a refused login, a run that stops. **A mapping failure
imports perfectly and is wrong**: every job seven hours early, a discount
charged as an extra, a total that no longer adds up. You would have to
disbelieve your own records to notice. So all the *rules* live in one file that
needs no database at all, and that file is fully tested; the part that fetches
and inserts is deliberately thin.

**The one that would have bitten.** Your old bookings store a date and a time
and **no timezone**, because that site only ever served you. This platform
stores an exact moment. Read them the wrong way and every job in eight months
of history moves seven or eight hours — a five o'clock job lands on the
next day. Six of the checks are about nothing else, including one that proves a
January booking sits an hour further from UTC than a July one, which is exactly
what a lazier version gets wrong.

**Three more I found and refused to paper over:**
- **Your old add-ons table did two jobs** — real extras, and discounts. On
  the platform an add-on is something a customer PAYS for, so a $25 discount
  imported as an add-on charges the next customer $25. Those rows are refused
  and listed by name.
- **Your old monthly plans do not convert.** An old plan is a discount with no
  price; a plan here needs a cadence and what the member pays. They are
  different objects, and anyone on one would be moved across by hand.
- **Old booking links keep working.** Where both databases use the same kind of
  id I kept it, so every `/booking/…` link you have ever emailed a customer
  opens the right job on the new platform — and re-running the import
  updates rows instead of doubling your history.

**What I verified, and what it printed.** `tests/legacy-import.test.mjs`
**47/47**, and **four of them baselined by breaking what they guard**: reading
the date and time as UTC fails 5 checks, dropping the discount's label fails 1,
copying the promo twice fails 2 (including the one that proves the total still
adds up), and removing the vocabulary guard fails 1. The program's four
refusals were exercised for real — no business named, an unknown business,
a business that already has bookings, and a source database that is not the old
site — each printing a sentence that says what to do rather than a stack
trace.

**Roadmap 5.2 and 5.3 are yours and I skipped them:** 5.2 is you using the
platform daily for a week, and 5.3 points andrewsdetail.com at it, which its
own text says happens only on your sign-off.

---

## Roadmap 6.2 — the demo stops eating one of your three founding spots

**What changed.** Your landing page and pricing page print how many founding
spots are left, counted from the accounts themselves rather than typed in — so
it can never advertise a spot that is gone. **The demo business was being
counted.** Every visitor has been told *"2 of 3 left"* when three are.

**Why it mattered less than it will.** Nobody has signed up, so today it is an
understatement that costs nothing. The day a real detailer takes the second
spot, the page says one is left while two are — and a scarcity claim that is
not true is exactly the kind of sentence the pricing page refuses everywhere
else (it has no "most popular" for the same reason).

**The fix, and the small judgement call in it.** A new *this is a demo* mark on
the business, which the count ignores — rather than excluding the demo by its
web address inside the database, which would break silently the moment a second
demo exists or the first is renamed. Roadmap 6.1 is a second demo. **The demo
still shows the founding prices**, which is deliberate: the crossed-out
"regular price" you asked for only appears on a founding account, so seeded any
other way it would be photographed nowhere.

**And "a reset script proven to restore exact state", which the roadmap asks
for, is now actually proven.** *Exact* is impossible on purpose — every date is
worked out from today, so the demo always has a today and a tomorrow — but the
SHAPE is: the same number of bookings, customers, services, plans and expenses
every time. The seed now reads back what it wrote and **stops with an error**
if anything is short. It used to print the numbers, and a printed number on a
green run is one nobody reads: a half-finished seed printed a smaller figure
and the word "ready" in the same breath, and the first thing you'd notice is a
screen that looks empty for no reason.

**What I verified, and what it printed.** After the change,
`founding_offer()` answers **`{"left":3,"total":3}`** with the demo still
marked founding. Five new checks in `landing-pricing` (**72/72**), and
**baselining caught one of them being useless** — the check that the COUNT
ignores demos was reading the text of the function next to it, so it passed
with the rule deleted. It reads only its own function now. The seed's own check
was baselined too: expecting one expense too many prints *"expenses: wrote 12,
meant 13"* and stops.

**Roadmap 6.1 — the demo's own website — is the one thing here I did not
build**, and it is question 0 below: three attempts at a detailer site have
passed every check in this repo and you still said they look AI, so a fourth
guess is not the answer.

---

## Roadmap 7.1 — a terms page, a privacy page, and a support line

**What changed.** `/terms` and `/privacy` exist, and every page on the
marketing side now carries one line at the bottom saying how to reach a person
and how long an answer takes, with both documents beside it.

**The judgement call, and it is the whole item.** The roadmap calls these
placeholders and says you supply real legal text later. **The obvious build is
two pages of borrowed boilerplate** — arbitration, governing law, limitation of
liability — **and I refused it.** Those are promises you have not made, in
language neither of us can check, sitting on a public page under your name.
A check now fails if any of those words ever appear.

**So every line is something this product actually does**, and most of it is
already printed on your pricing page: the twelve-month plan, the exit fee, two
weeks of retries before a page goes offline, nothing ever deleted. Writing
those down invents nothing, and a check pins that the two pages keep saying the
same thing. The privacy page is the honest list of where information goes:
Supabase, Netlify, Resend, Stripe, and nobody else — and that card numbers
never reach us at all, which is true and is worth a visitor knowing.

**Both pages say, at the top, that a lawyer has not seen them yet.** At the top
rather than the bottom, because somebody who finds that out at the end has read
the whole thing on a wrong assumption. When you have the real text, it drops
into one file.

**The footer line is a policy rather than a "contact us" link** — who picks it
up and how long you wait is what somebody handing over their business actually
wants to know. It says: *"Questions and problems go to one person, and you get
an answer the same working day."* **If that is not the promise you want to
make, it is one line to change** — `SUPPORT_LINE` in
`app/src/landing/legal.js`.

**What I verified, and what it printed.** Both pages measured **clean at 1440,
392 and 320** with **no console errors**, and I checked something a screenshot
cannot show: every section on both pages reaches full opacity after a scroll.
This surface has shipped a section before that stayed invisible for ever and
passed every check in the repo, so it is now asked directly — `unrevealed 0` at
all three widths. Six new checks (`landing-pricing` **80/80**), three of them
baselined by breaking what they guard, and the width sweep walks both pages
from now on. `composition` 74/74, build clean.

**One thing found on the way that cost time and is now written down:** on this
machine files that come from git are stored with different invisible
line-ending characters than files I write, and the tool I was using to check
could not see the difference. An edit that plainly matched the file failed
three times before that was the answer.

---

## Roadmap 7.5 — what Google and a shared link show

**What changed.** The site had no description and no share card at all: Google
wrote its own snippet out of whatever it found, and a link you texted somebody
appeared as a bare web address with no picture, no title and no sentence. Both
are now there.

**None of it is a layout problem, which is why nothing in this repo had ever
noticed.** Every check here asks about pixels.

**The words are your positioning in your own order** — the website first, the
dashboard as half of the same thing rather than an extra. *"A custom website
for one detailing business, and the dashboard that runs it. Your prices, your
hours and your customers live in the same place, and changing one on your phone
changes the site."* A check now fails if anyone ever puts "seamless",
"all-in-one" or "streamline" in there.

**I deliberately did not make a share IMAGE.** The card is set to the kind that
shows no picture, because the kind that shows one draws an empty grey box when
there isn't one. Inventing a logo tonight would be a brand decision made by a
machine, on a product that has no logo on purpose. **When you want one, it is
one image and one line.**

**And one honest limit, so nobody reports it as a bug later.** One file
describes all three kinds of page here, so **a detailer texting their booking
link to a customer gets OUR card, not theirs** — an advert for us on their
message. It cannot be fixed from inside the app: the thing that reads those
cards never runs the code that knows whose page it is. It is written up as item
Q in the roadmap's unscheduled list, and my recommendation there is to do it
when the first real tenant site exists, because the same piece of work covers
both.

**What I verified.** Six new checks (`landing-pricing` **86/86**), three
baselined by breaking what they guard — including one that fails if an image
is ever added without changing the card type, in both directions. The tags
survive the production build (checked in `app/dist/index.html`, not just the
source).

**Roadmap 7.2 (error monitoring) and 7.4 (your pricing sanity check) I
skipped**, both for the reason written in their own lines: 7.2's whole value is
proving that private details are stripped before anything is sent, and it needs
a key only you can make — **ten minutes and a free account**. 7.4 says OWNER in
its first word; two things have changed in your favour since it was written,
though: the founding count now reads **3 of 3** rather than 2, and you can
change every price yourself from the back office.

---

## Roadmap 7.3 — the final pass, as a brand-new detailer and as staff

**What changed.** `scripts/final-pass.mjs` and `docs/final-pass.md`. The script
builds its own throwaway business on the platform, signs in as a new owner and
as a staff member at both sizes, walks every screen either of them can reach,
photographs it, and deletes the business and both logins again.

**Why not the demo.** Everything else in this repo tests against a business
with 31 bookings, 13 customers and four plans. **What a real detailer meets on
their first morning is the opposite of that**, and a screen that looks good
full and blank empty is a screen nobody has ever seen the way its first user
will.

### The one thing that would stop a real customer

**There is no way to reset a password.** No "forgot your password" on the
sign-in screen, and nothing in the app that can send a reset. A detailer who
forgets theirs cannot get back in, and the only fix is you editing the
database. It was already written down but never ranked — **this is the single
finding from the whole pass that blocks going live**, and it will happen to the
first person who signs up and comes back two weeks later. Supabase already does
the sending; it needs a link, a page and one row in the settings.

### Three that work but make us look unfinished

1. **One tap in the first ten seconds can lose the whole first-run
   experience.** New detailers get the seven-step setup form and then the
   guided tour — I confirmed both work. But tapping any button along the bottom
   *while the form is open* closes it for good, and the tour then never
   arrives. Both are still findable afterwards (*Finish setting up* on
   Business, *Show me around* in the settings) but neither is offered again.
   The fix is small: only mark it "seen" when they actually finish it.
2. **An empty dashboard is mostly empty screen on a laptop.** Clients at
   laptop size stops 260 pixels down a 900-pixel window. On a phone it reads
   fine. The words are good — *"No customers yet — they appear on their own
   when bookings come in."* — it is the proportion.
3. **Today offers your booking link before there is anything to book.** Copy,
   Open and a QR code, with nothing saying the page has no services on it yet.
   The booking page itself is honest (*"hasn't listed any services online
   yet"*, no crash), so nobody is misled for long — but the first thing we
   invite a new detailer to do is share a link that cannot take a booking. I
   would put the same *Finish setting up* row on Today.

### And what was right

Both rails exactly as designed (five tabs for you, three for staff), the
settings rows right for each, **no console errors anywhere**, the empty booking
page honest, and the setup form running all seven steps into the tour.

**Nothing here is fixed yet** — 7.3's job is the list, ranked, and the fixes
are decisions about scope you have not made. `docs/final-pass.md` has the whole
thing with what I would do about each.

---

## The password reset — the one thing the final pass said would stop a customer

**What changed.** Three things that did not exist at all:
- **"I forgot my password"** on the sign-in screen.
- **`/reset`**, where the emailed link lands.
- **"Your password"** in the settings, for changing it while signed in.

**Why I built it tonight rather than parking it.** The final pass an hour
earlier found exactly one thing that would stop a real detailer using the
product, and this was it: someone who forgot their password could not get back
into their own business, and the only fix was you editing the database by hand.
That is not a support answer.

**What I verified, and what it printed.** I made a real reset link — the same
one Supabase would have emailed — and used it in a browser:
- it landed on the new page and offered the form;
- two passwords that did not match were refused: *"Those two do not match."*;
- saving took me **straight into the dashboard**, signed in;
- signing in again from scratch with the new password: **OK**;
- **opening the same link a second time said "That link has expired"** rather
  than failing when you press save. That is the ordinary second case — a reset
  link works once, and some email systems follow links before you do.
- changing the password from the settings screen worked, and the next sign-in
  used the new one.

No console errors, clean at 1440, 392 and 320.

**Three decisions worth knowing about.**
1. **The message never says whether the address exists.** It says *"If we have
   an account for that email, the link is on its way."* Saying "no account with
   that email" would turn the sign-in form into a way of finding out which of a
   list of addresses is one of our customers.
2. **Staff can change their own password**, with no permission needed. A
   password belongs to the person, not the business — and staff are exactly the
   people who get handed one by somebody else and should change it.
3. **Both screens ask for it twice.** The problem being fixed is being locked
   out, and a typo in a new password locks you out again — from the page that
   was supposed to be the way back.

---

## Fixing two of the things the final pass found

**What changed.** Two of the three "embarrassing" findings from a few hours
earlier.

**1. A new detailer can no longer lose their whole first run with one tap.**
The seven-step setup form was being marked "done with" the instant it
appeared — so tapping any button along the bottom to have a look around closed
it, and the guided tour that follows it never came, that day or ever. It is
marked done with when you actually CLOSE it now. Walked the whole sequence to
be sure: first sign-in shows the form, tapping a tab leaves it alone, **the
next sign-in has it waiting again**, walking through it hands over to the tour,
and after that you are never asked again.

**The first version of this fix was worse, and the checks caught it.** I made
the tour appear for any owner whose device had not seen it — which fixed the
finding and also showed a six-step tour to established detailers on every new
phone or browser. The width sweep failed at its first screen because of it. The
version that shipped touches nobody who has already finished setting up.

**2. Today no longer offers your booking link before anything can be booked.**
With no services on the page it now says *"Nobody can book yet — your page has
no services on it"* and offers **Finish setting up**; the link comes back by
itself the moment you add one service. I deliberately did not put a warning
next to the Copy button — a caveat under a button is a caveat nobody reads.

**What I verified, and what it printed.** Both states in a real browser
(*"Nobody can book yet…"* with nothing listed, the booking link with one
service listed), the row opens the setup form, **no console errors**, and the
sweep clean at every width. Eight new checks, baselined by putting the old
behaviour back.

**And one small thing found by looking rather than measuring:** the first
version of that new line was cut off on a phone — *"…and your link start…"* —
so it is shorter now. The geometry check called it clean, because a truncated
line is inside its box.

**The third finding I left**, and it is the biggest job of the three: an empty
dashboard leaves most of a laptop screen blank. That is a design question about
what those screens should show a detailer who has nothing yet, and it is worth
your eye rather than my guess.

---

## A customer can now move their booking an hour later

**What changed.** When a customer opens their own booking to change the time,
the day they are already on is offered properly. It was not before: **their own
booking was counted as something in the way of itself.** If the job filled most
of what was left of that day, the day showed as fully booked *to the person who
holds the only booking on it* — so they could move to another day, but not an
hour later, which is the thing people actually want.

**Why nobody spotted it.** It only bites when the job is long enough to swallow
the rest of the day, so it depends on the date and on how busy that day already
is. The end-to-end check caught it on one day and passed on the same code the
day before, and it was written down but never fixed.

**What I verified, and what it printed.** A five-and-a-half hour job at 8am on
a day that runs 8 till 6:
- counting its own booking: **0 free times** — the day cannot be moved within
  at all;
- excluding it: **10 free times**, including its own 8am back.
A malformed id changes nothing, and the booking is still checked on the way in,
so nothing can be moved into a slot somebody else has.

**And fixing it broke the check that found it — which is worth knowing.** The
end-to-end run asserted "the old time is free again" after a move. That was
only ever true because the picker could not offer a nearby time: the booking
was blocking its own neighbourhood. Now the nearest offer is usually the next
half hour, and a booking that moves from 8:00 to 8:30 makes 8:00 genuinely
unbookable — a new job starting there would run into it. **The assumption
broke, not the product.** The check now asks the question it always meant, and
the full run is **82 of 82 on both demo businesses**, which is the first time
it has been completely green since that finding was written down.

---

## A detailer who gets stuck now has somewhere to go

**What changed.** One line in the settings, above Sign out: *"Stuck on
something? One person answers, same working day."* with your support address
beside it.

**Why it needed doing.** There was no help text, no address and no way to ask a
question from anywhere inside the dashboard. Earlier tonight I put a support
line in the footer of the marketing page — which is the one page a detailer
never looks at again after they sign up.

**Why it is a line and not a row.** A row that opens a page to show one email
address is a row that wastes the tap it cost. And no help centre, no ticket
form, no chat widget: you have fewer than ten customers, and the honest answer
to "where do I go" is your inbox.

**One thing to know: that promise is now printed in two places.** *"An answer
the same working day"* is on the marketing page and inside the product. If that
is not the promise you want to make, it is one line —
`app/src/lib/support.js` — and both change together.

**What I verified.** The line reads correctly at 392 and 320, the address is
the same one your emails send from (a check now fails if the two ever drift),
no console errors, sweep clean.

---

## A detailer can take their data with them now

**What changed.** **Export everything** on a business's page in your back
office. One press hands you a file with everything that business owns:
customers, bookings, prices, hours, plans, expenses, photos, their invoices
from us. The demo came out as **31 tables, 31 bookings, 13 customers, 88 KB**.

**Why it needed doing.** Two promises were unkept. Your terms page — written a
few hours ago — says a detailer's customer list and history belong to them and
they can have a copy by asking, and nothing could produce one. **And this is
the answer to a "delete my data" request**, which is the one legal letter that
arrives without warning: you cannot hand something over or wipe it if you
cannot see all of it in one place.

**The decision that makes it stay correct.** It does not use a list of tables I
typed out. It asks the database which tables belong to a business and exports
those. **A list would go stale the first time we add a table — and silently**:
the export would succeed, the file would look complete, and the missing part
would be discovered by the person who no longer has their copy. This way, a
table added next month is in next month's export with nobody remembering.

**Two things are yours and deliberately stay out of it:** the record of what
you did to their account (including if you ever signed in as them), and your
own private note about them. Their invoices from us **are** in it — what they
paid you... paid *us*, rather, is their record too, and it is the half an
accountant asks for.

**What I verified, and what it printed.** The export ran as the admin account
(31 tables), a detailer asking for it got **404**, nobody at all got **401**,
and **a signed-in admin's own browser calling the underlying function directly
got 403** — the same floor the rest of that screen stands on. The download
works in a real browser and saves as `their-address-2026-09-06.json`. Every
export is written into the log with the size, never the contents.

**And pressing the button found something nothing else could have.** Every
confirmation message on that screen — *"Saved."*, *"Suspended"*, *"Invite sent
to…"* — was being drawn and wiped in the same instant by the refresh that
followed it. **The actions all worked; the sentence saying so was never on
screen long enough to read.** Fixed, and there is now a check for it.

---

## If the automatic jobs stop, you now find out

**What changed.** Two things run on a schedule without anybody watching: the
sweep that sends your morning alerts and reminders (every fifteen minutes), and
the nightly job that credits monthly-plan members with the visit they are owed.
**If either stopped, nothing anywhere would have said so** — the first sign
would be a detailer mentioning their alerts went quiet, or a plan member
noticing they are short a wash.

Your back office now carries one line under the four numbers: *"Reminders ran 4
minutes ago · Plan visits ran 9 hours ago"*. It turns red the moment either one
is overdue.

**This has already bitten this product twice**, which is why it was worth an
hour: the email service was dead for an entire stretch of the build and the
only trace was a line in a log nobody reads, and the push-notification keys had
never been set, so that feature silently did nothing for its whole life.

**Two decisions worth knowing.**
1. **The stamp is written by the job itself, not by the scheduler.** The
   scheduler's own task is "send a request", which succeeds the instant the
   request goes out — stamping there would tell you the alarm clock works and
   nothing about whether anybody got up. The one that broke before was the
   second half.
2. **The line is shown whether or not anything is wrong.** A warning you only
   ever see when it is angry is one you cannot tell apart from a warning that
   stopped working. And a job that has *never* reported counts as broken,
   because that is also what it looks like if somebody deletes the table.

**What it cannot tell you**, said plainly because the difference matters: it
knows a job RAN, not that every email got through. A single bounced email must
never stop a booking, so that stays best-effort. What it catches is the job not
running at all — the failure that had no witness.

**What I verified, and what it printed.** Three states, by looking: healthy
(*"ran just now"*, quiet), stopped two hours ago (**red**, *"Reminders LAST RAN
2 hours ago"*), and never reported (**red**, *"Plan visits have never
reported"*). Ten new checks, three baselined by breaking what they guard. And
the first version said *"Reminders LAST RAN today"*, which is a sentence with
no information in it about something that runs four times an hour.

---

## The questions to ask a detailer before building their site

**What changed.** `docs/tenant-site-intake.md` — the twelve questions you ask
somebody who has just bought a website, and the reasoning for each.

**The thing that makes it worth having.** You said most detailers *"will not
know what they want in the abstract"*, and the obvious version of this is a
questionnaire asking for their services, prices and hours. **That would be
asking them to type their business in twice** — they already did it in their
dashboard — **and it would create a second copy that goes stale the day they
change a price on their phone**, which is the one thing we promise them.

So every question in it is one the database cannot answer: how they started,
what they refuse to do, what they are proud of that a customer would not know,
what annoys them about their current site, and what they actually want somebody
to DO on it. That last one has a real consequence — if the honest answer is
*"ring me"*, the site is shaped around a phone number and the booking form is
secondary.

**The half I did not build, on purpose.** You asked for questions *with
examples to choose from*. The three example pages we have passed every check in
this repo and you still said they look AI — so putting them in front of a
paying detailer would be asking them to pick from three things we already know
are wrong. **That is question 0 below**, and it is the one thing that unblocks
this.

**And it is a document rather than a screen** because there is no website
customer yet, and a screen with an empty examples section is half a feature.

---

## Questions parked for the owner

*(nothing here blocks the next item — I kept going)*

## Roadmap 3.2(c) — the kit brief

**What changed.** `docs/tenant-site-kit.md` — the file a fresh coding agent is
pointed at to build one client's website.

**It is a POINTER, not a summary, and that was the main decision.** Your own
rule when a session started writing a third plan: *"Isn't there already a plan.
Follow the docs."* So it is a reading order, the decisions already made, and
the three things that are not optional when verifying — no fact in it has a
second home. A kit that restates the contract is a second copy of the
contract, and the older one then goes stale without anybody noticing.

**Its §5 exists because of your verdict on the three pages, and it is the part
I most want to be right about.** It says plainly that
`docs/tenant-sites/a-shop.html`, `b-van.html` and `c-volume.html` are the
**structural** range — three section skeletons, three worlds, one of them light
— and are **NOT the taste reference**, in your own words: *"All 3 look very ai
and not even like the vibe for detailing but it's fine for now."* It says why
(a list of NEVERS cannot produce a vibe) and what would settle it (two or three
detailer sites whose vibe you like, a sentence each). An agent handed that file
cannot mistake those pages for a template.

It also carries the two things a bespoke site most needs to be told: **a site
never prints a price it worked out itself**, and the reassurance under that —
`create-booking` recomputes every quote server-side, so a bespoke form
**cannot mis-charge and cannot double-book**. The worst it can do is offer a
slot the server then refuses, which is exactly why the availability rules are
in the core.

**Nothing to verify beyond reading it** — it is prose, and every file it points
at was checked above. Roadmap 3.2 is ticked; `PROJECT-STATE.md` has the full
account.

---

### 0. The one that actually blocks a real client's site — two or three detailer sites you like

**This is the most valuable five minutes you could spend on Phase 3**, and it
is the only thing in this list I would ask for before anything else.

**What it is.** You said the three example pages *"look very ai and not even
like the vibe for detailing"*, and you were right. They pass every mechanical
check this repo owns — every banned font, every contrast floor, every width —
which is the finding: **a list of things never to do cannot produce a vibe.**
Meanwhile there IS a file of your own taste notes in the repo
(`docs/references/TASTE-NOTES.md`) and it is genuinely useful — but it is about
seven software and agency sites, not detailers.

**What I need from you: two or three real detailer websites whose *feel* you
like, and one sentence each on why.** Not "make it look like this" — the
sentence is the part that transfers. Even *"this one feels expensive and the
photos are huge"* is enough to work from; the three attempts so far had nothing
of yours to aim at.

**What happens if you don't.** Nothing breaks — the structure, the contract,
the booking form and the kit are all sound and are what a site is built
against. But a fourth attempt at the LOOK would be a fourth guess, and two
guesses have already been spent. **My recommendation: send the links whenever
you next see one you like, one at a time is fine.** I will write them into a
taste file for this trade and the next page starts from your taste instead of
from a list of nevers.

### 1. Should a detailer's own email address go on their website? (contract §6f)

**What it is.** Every tenant site reads one function that hands it everything
public about the business — name, phone, hours, prices. It hands over the
**phone number and not the email address**, so a site's "contact us" section
can print a number to call and no address to write to.

**Why it was left alone rather than just switched on.** An email address
published in plain text on a public page gets harvested by spam bots within
days; a phone number mostly does not. That is a business decision about your
detailers' inboxes, not a schema one, so I did not make it.

**Three ways it can go:** publish it for everybody; add a *Show my email on my
website* switch so each detailer chooses; or decide the booking form IS the
contact form and never publish it.

**My recommendation: the switch**, defaulted OFF. It costs one migration and
one row on a settings screen, it lets a detailer who wants to be emailed be
emailed, and nobody gets their inbox published without asking for it. Say
"switch" and I will build it.

### 2. Campaign links — a working feature the rebuild dropped (contract §6g, roadmap 4.2)

**What it is.** On your own site today, a link with a tag on the end — the one
you print on a golf-course QR code — is remembered when somebody lands, and the
discount code attached to it is filled in for them automatically when they
book. The tables for it still exist in this product and **nothing calls them.**

**No decision needed to keep going** — I have left it alone and it is already
written into roadmap 4.2, where the screen that reads the numbers back
belongs. The reason I am flagging it: a tenant site is the natural place to
call it from, so if you want it, 3.2 is cheaper than 4.2 for the half that
lives on the site. **My recommendation: leave it for 4.2.** A site that writes
rows no screen ever shows is a half-feature, and the contract already refused
that once.

### 3. Should the price editor refuse a ladder that breaks your own two rules?

**What this is.** Your pricing has two rules baked into the words on the page:
a year paid up front is **two months free**, and month-to-month costs **25%
more** because there is no commitment. `$600` and `$75` are those rules applied
to `$60`, and the founding column's `$400` and `$50` are the same rules applied
to `$40`. Nothing is hard-coded — the page *works out* the saving and prints
it.

**So if you type a year price that is not ten months' worth, the page does not
lie — it just says something odd.** With `$55` a month and `$500` a year it
prints *"2.9 months free"* instead of *"2 months free"*. Nothing is broken and
nobody is overcharged; it simply stops being a round, confident sentence.

**What happens either way.** Leave it as I built it: the editor prints a line
telling you what the rules would give and saves whatever you typed. Or I make
it refuse — you would then have to keep the ladder in step, and the page can
never say "2.9 months free".

**My recommendation: leave it warning.** They are your prices, and you have
already overruled a "sensible" number once for a good reason ($999 rather than
$900 because it reads more professional). A form that refuses your own decision
is a form you stop trusting. If you would rather it refused, say **"refuse"**
and it is a ten-minute change.

### 4. The old site's database key — the one thing blocking the move

**What this is.** To copy your bookings, customers and history onto the
platform, the program has to be able to READ the old site's database. The key
saved in this project only opens the new one; the old one refuses it. The key I
need is on the old project's own settings page, under API — the
"service role" one.

**What happens if you send it.** I run the copy in report-only mode first: it
prints how many customers, how many bookings, what it refused and why, and
changes nothing. You read that, and only then do we run it for real.
**Nothing is ever written to the old site** — it is read-only there, and
your live bookings carry on exactly as they are.

**What happens if you don't.** Nothing breaks; the platform simply starts
empty when you switch, and eight months of history stays on the old site.

**My recommendation: send it when you are ready to start using the platform
yourself, not before.** It is a full-access key, so paste it into the terminal
for the one command rather than into a file — and if you would rather not
hand it over at all, the alternative is you running the two commands yourself
from the plan in `docs/migration-plan-2026-09-06.md`.

---

## Judgement calls made alone

*(appended as they arise)*

---
