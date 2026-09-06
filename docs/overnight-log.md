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

---

## Judgement calls made alone

*(appended as they arise)*

---
