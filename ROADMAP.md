# Roadmap — the fix queue

This is the live queue. It replaces the old build-phase roadmap, whose
still-open items are carried into Wave 11 below. That file was pruned on
2026-09-20 and lives in git history —
`git show pre-doc-prune-2026-09-16:docs/archive/roadmap-2026-09-13.md`.
The long build history stays at `docs/roadmap.md`.

**Built 2026-09-16 from two independent live-site audits:**

- `docs/audits/comprehensive-audit-2026-09.md` — scored the product 54/100 for
  selling to strangers, 67/100 for Andrew moving his own business onto it.
  Referred to below as **A1**.
- `docs/audits/fix-list-2026-09-15.md` — a route-by-route checklist.
  Referred to below as **A2**.

## The live site is current — measured, not assumed

Both audits reviewed `detailingplatform.com`. The repo's old notes claimed live
was hundreds of commits behind, which would have made most findings stale.
**It is not.** On 2026-09-16 the live bundle and a fresh local build from `HEAD`
were byte-identical:

```
live:  assets/index-CfUTS91_.js   assets/index-DrofU7fn.css
local: assets/index-CfUTS91_.js   assets/index-DrofU7fn.css
```

**So every finding below is against current code and none of it is discounted.**
It also means a push to `main` publishes. Re-measure with the two commands in
CLAUDE.md § Publishing rather than trusting this paragraph later.

## How to work this queue

1. **One item at a time, top to bottom.** Waves are ordered by what costs money
   or trust first. Don't batch.
2. **Fix, don't rebuild.** Only touch a screen for a problem named here.
3. **Verify in a real browser before ticking.** Try the case that should work
   *and* the case that should be refused. Check 1440 wide and 375 wide.
   A code change alone is not a fix.
4. **Tick the box and add one line saying how you checked it.** That line is
   what stops the next session re-doing it.
5. **When a finding turns out to be wrong, say so and strike it** — don't
   silently drop it. § Watch list below has the ones already suspect.
6. **Grep every caller before fixing.** A1's P0-02 was reported on one page and
   is actually on two; the one-guard fix covers both. Assume the same of
   anything that looks like a one-off.

---

## Wave 0 — Decisions and blockers for Andrew

Nothing below this line waits on these. They are asked once, here.

- [x] **0.1 — RESOLVED. The demo account's dual access is deliberate.**
  Andrew, 2026-09-16: *"I made one of them just be able to access both because
  I was tired of switching accounts… literally no one's on the site."*
  **So A2's 1.1 is not a defect and must not be "fixed".** A session that
  finds the audit line and not this answer will lock him out of his own back
  office, which is the exact mistake this repo has made before.
  **BUT IT IS A LAUNCH BLOCKER AND IT IS NOW TRACKED AS 12.4.** It is safe
  only while every business in the database is a fixture. The day a real
  detailer signs up, one guessable `demo123` login reads every detailer's
  customers. It comes out then, not before.

- [x] **0.2 — RESOLVED. Stripe is three days away, and sandbox works today.**
  Andrew, 2026-09-16: Stripe can be set up in three days; he is under 18 and
  expects to be limited.
  **Researched, and the limit is smaller than feared:**
  - A **Standard** Stripe account can be created at **13+**. Under 18, a legal
    guardian must be the account **owner** before it can accept charges or move
    money to a bank. **Express and Custom Connect require 18.**
  - **This platform uses Connect Standard over OAuth** — `connect-account/index.ts`
    calls `oauthToken`/`authorizeUrl`, and `pay-booking/index.ts:19` records
    `type=standard` with no application fee. **Each detailer brings their own
    Stripe account**, so their age is their own affair and none of it depends
    on Andrew's.
  - **Sandbox needs no activation at all.** Every Stripe path in this product —
    checkout, webhooks, subscription renewal, failed-payment retry, Connect
    onboarding — can be built and proved in test mode today.
  **So Wave 12 is not blocked on Andrew's birthday; it is blocked on three
  days and a parent's name on the platform account.** Build and test it all in
  sandbox meanwhile. The only thing that truly waits is taking real money.
  *Sources: Stripe [account age requirement](https://support.stripe.com/questions/age-requirement-to-create-a-stripe-account), [Connect age requirement](https://support.stripe.com/embedded-connect/questions/age-requirement-to-create-an-account), [sandboxes](https://docs.stripe.com/sandboxes).*

- [ ] **0.3 — Test data: flag, don't delete. Awaiting Andrew's yes.**
  A2's 1.3 found 15 of 16 back-office detailers are tests, plus "Smoke
  TPMOY"-style rows in the client list.
  **Why flagging beats deleting, in plain words:** about 60 automated checks
  in `tests/` work by signing into a seeded practice business and clicking
  through it — book a job, send an email, take a payment. They need those fake
  accounts to exist. Delete the fake data and roughly 60 checks stop being
  able to run, and a check that cannot run prints something that looks very
  like a pass. We would lose the safety net that catches mistakes on all 79
  items below, in exchange for a tidier list.
  **Fix:** an `is_test` flag; every list and count defaults to real accounts
  only; an unmistakable DEMO badge where a fixture is shown deliberately. Same
  clean screens, net still intact.

- [ ] **0.4 — The legal pages. A lawyer is not the only option.**
  Both audits (A1 P3-09, A2 6.6) flag that terms and privacy say Andrew wrote
  them, are not lawyer-reviewed, and are in his personal name. He asked whether
  a paid lawyer is really required.
  **It is not legally required, and there is a free path that is much better
  than what is live now:** start from a SaaS-specific template written by
  lawyers rather than from scratch, and fix the promises so they match the
  product. The live pages' real problem is not that a lawyer has not blessed
  them — it is that they **contradict the pricing page** (7.7) and **omit data
  processors the product actually uses** (7.8). Both of those are factual bugs
  we can fix for nothing.
  **Recommendation:** do 7.7 and 7.8 now for free, and get paid review only
  before charging strangers at scale. A business entity still matters more than
  the review — right now the terms are a contract with a private individual.
  *Sources: [Promise Legal SaaS ToS template](https://promise.legal/templates/terms-of-service), [ToS Lawyer's US SaaS legal checklist](https://toslawyer.com/legal-checklist-for-u-s-saas-startups-tos-privacy-dpa-sla-and-more/).*

  **CHECKED AND PARTLY CORRECTED 2026-09-20 — and the finding is not a list of
  clauses, it is one sentence.**

  > **The privacy page tells a detailer that five named companies see their
  > customers' information, and six more do.** A customer's name travels in
  > the body of a push notification and their typed address goes to an
  > address-lookup service, and nobody reading that page would know it.

  **That is not a drafting slip. It is the page being wrong about something a
  person would care about**, and it is exactly the class of defect this item
  was written for. It was found by listing every external host the edge
  functions actually call, not by re-reading the prose — the prose reads
  perfectly well and is false.

  **WHAT ACTUALLY RECEIVES DATA, beyond the five the page named.** A customer's
  typed address goes to **Geoapify** while they are typing it. The
  **coordinates of the job address** go to the **US National Weather Service**,
  rounded to four decimals — about eleven metres. Text being translated goes to
  **DeepL** or to **Google's translation service**, a second Google service
  where the page names Google only for sign-in. And the owner's phone alerts
  carry **the customer's name in the notification body**, which travels through
  **whichever push service the detailer's browser uses** — Google's, Mozilla's
  or Apple's. `api.deepl.com` never showed up in a source scan because the
  host is built from the API key.
  **The corrected heading still carries no count**, for the reason already
  recorded in that file: a number in a heading is a fact that rots, and it
  would have rotted again here, since the push vendor depends on the browser.

  **THE TERMS AGREED WITH NEITHER THE PRICING PAGE NOR THEMSELVES.**
  - **Cancelling** — §Renewals said it "is never behind an email to us";
    §Ending it said "Tell us". `/pricing` says "No phone call, no email and
    nobody to talk out of it". **The button is real**, so §Ending it was the
    wrong one, and it made leaving sound like it needed our permission.
    Corrected, with deletion separated from cancellation rather than run
    together with it.
  - **The build fee and the domain** were commitments `/pricing` had been
    making in public while the document calling itself "the whole agreement"
    never mentioned either. Both added, in the pricing page's own words.
  - **And one promise the product genuinely keeps**, verified rather than
    assumed: "the figures are copied onto your subscription and never read
    again" is true — `recurring_cents` is snapshotted at signup.

  **TWO THINGS WENT TO ANDREW AND NEITHER WAS GUESSED.**
  - **The export promise.** `/pricing` says "You export them and go"; the terms
    say "by asking"; **neither matches the product — there is no customer
    export and no photo export.** The only download is the accountant CSV of
    jobs and expenses. Build it or stop promising it, both his. **The clause is
    parked exactly as written and deliberately NOT softened**: a vague promise
    is still a promise and would be harder for the next person to spot.
  - **The `ENTITY` line.** "Andrew Dietrich, doing business as Detailing
    Platform" was never confirmed and the code has said so since it was
    written. Sole trader, DBA and LLC are three different legal persons.
    **Asked as a factual question with no recommendation attached** — which
    entity he trades as is not ours to advise on.

  **NEITHER IS URGENT THIS MORNING, AND HIS LIST SAYS SO.** Both pages are live
  and linked in the footer, so anyone can read them — but there are **zero
  paying subscriptions and one non-demo business**, measured. **Nobody has
  agreed to either document.** They block the first real signup, not today.

  **NOT DONE:** no lawyer, per Andrew's standing ruling, and no template was
  imported — every correction states something the product already does.

- [ ] **0.6 — WHAT IS RUNNING IS NOT WHAT IS COMMITTED, ON 22 OF 39 EDGE
  FUNCTIONS. Nobody knew. Found 2026-09-20.**
  **Placed in Wave 0 because it undermines every other item in this file.** A
  test that reads `supabase/functions/**` has been describing a system that is
  not the one answering requests, and any deploy of one function silently
  ships whatever else is sitting on disk beside it.

  **THE NUMBERS, MEASURED BY CONTENT.** `node scripts/deployed-inventory.mjs`
  fetches each deployed bundle from the Management API and compares it against
  this checkout. **17 functions match. 22 do not.** The gaps run from a few
  hours to **7.0 days**, and the deploys sit in two clusters: **13–14
  September** for most of them, **17 September** for three.

  **AND THE FIRST NUMBER REPORTED WAS WRONG, WHICH IS ITS OWN LESSON.** The
  session first told the manager "26 stale, some by thirteen days", from
  `check-deployed.mjs`. That script compares TIMESTAMPS and its own header says
  it cannot tell a missed deploy from the ordinary change-deploy-verify-commit
  order, which leaves the deploy stamp earlier than the commit stamp. So its
  26 means *"26 I cannot vouch for"*, not *"26 running old code"*. The real
  figures are **22 and 7.0 days**. Both scripts are correct and they answer
  different questions; only one of them answers this one.

  **ONE FILE CAUSES MOST OF IT.** `_shared/emailTemplates.ts` is stale inside
  **17 of the 22**. A shared module is bundled into every function that
  imports it, so one un-deployed edit makes seventeen functions wrong at once
  and no per-function reasoning will ever find it. The other shared modules
  behind this: `connect.ts` (5 functions), `stripe.ts` (4), `tenant.ts` (3),
  `payments.ts` (1), `weatherCache.ts` (1). **Only four functions have a stale
  `index.ts` of their own** — `cancel-booking`, `create-booking`,
  `get-booking-receipt`, `stripe-webhook`.

  **TWO THINGS IN THIS ARE WORSE THAN THE COUNT, AND THEY ARE THE REASON THE
  ITEM SITS IN WAVE 0 RATHER THAN BESIDE A DEPLOY CHORE.**

  1. **`stripe-webhook` IS RUNNING CODE THAT PREDATES THE COMMIT WHICH MADE ITS
     VERIFICATION TESTABLE.** `f243e95` lifted the two-secret check out of
     `Deno.serve` for the express purpose of letting a test run it. The running
     copy does not contain that lift. **So the test everybody trusts has been
     exercising code the gateway does not run — a green line about a system
     that does not exist**, which is the exact disease this whole project is
     about, arriving in the one function that handles Stripe's callbacks.
  2. **`platform-billing` AND `report-problem` ARE NOT "DRIFT".** They are
     running from before modules they import existed: `platform-billing` is
     missing **77 of 77** comment lines of `payments.ts`, and `report-problem`
     **441 of 477** of the 2026-09-03 `emailTemplates.ts`. **That is two
     functions that would fail unpredictably the first time anyone invoked
     them.** Not "a week behind" — behind the existence of their own
     dependencies. Nothing in this repo predicts what they do when called,
     because what they are made of is not what this repo contains.

  **THREE TIERS, BECAUSE "6.5 DAYS BEHIND" HIDES THE DIFFERENCE.** The measure
  that matters is how MUCH of the file is missing from the running bundle:

  1. **RUNNING SOMETHING GENUINELY ANCIENT.**
     - `report-problem` — **441 of 477** comment lines of `emailTemplates.ts`
       missing. It is running a copy from **before the 2026-09-03 email
       rebuild**, i.e. the old design Andrew rejected.
     - `platform-billing` — **438 of 477** of `emailTemplates.ts` and **77 of
       77** of `payments.ts`. It is running from before `payments.ts` existed
       at all, so stage-1 payment handles cannot be in it.
     - `create-business`, `stripe-webhook`, `watch-jobs` — **88 of 89** of
       `tenant.ts`. Essentially a different tenant-resolution module, which is
       the file that decides how a `business_id` is obtained.
  2. **ONE OR TWO REAL COMMITS BEHIND.** The `emailTemplates.ts` 35-of-477
     cluster — ROADMAP 2.8 (an address carrying how it was arrived at) and
     ROADMAP 14.4 (the refund instruction) — across `accept-quote`,
     `invite-user`, `plan-link`, `platform-admin`, `preview-emails`,
     `reschedule-booking`, `respond-to-booking`, `send-campaign`,
     `send-invoice`, `send-owner-reminders`. Plus `connect.ts` at 45 of 152 in
     five functions and `stripe.ts` at ~20 of 151 in four, the latter from
     `f243e95` lifting webhook verification out of `Deno.serve` so a check
     could run it — **so the running webhook does not contain the code the
     test exercises.**
  3. **HOURS, AND TRIVIAL.** `forecast` (4 comment lines), `update-booking`
     (17, and only because the other session committed to
     `emailTemplates.ts` after this one deployed).

  **WHAT THE MEASUREMENT CANNOT SEE, SAID PLAINLY.** The deployed bundle is
  TRANSPILED JavaScript with types erased, imports rewritten to absolute URLs
  and the code re-formatted, so source text cannot be compared without
  reimplementing Deno's transpiler. **Comments survive verbatim**, so comments
  are what is compared. A change that touched no comment is invisible to it:
  a renamed string, a flipped boolean, a corrected operator. **So `DIFFERS` is
  strong evidence and `matches` is weak** — "nothing I can see says
  otherwise", not "proven identical". Three wrong methods were tried and
  discarded before this one, each caught only because the tool said something
  impossible about a function deployed sixty seconds earlier. Keep an
  obviously-true case in front of you when building an instrument.

  **HOW IT HAPPENED, AS FAR AS THE EVIDENCE GOES.** Nothing in the repo
  requires a deploy, and `check-deployed.mjs` is not in CLAUDE.md's
  before-you-finish list. The 13-September cluster is one session's work that
  was committed and never pushed to the gateway; every session since has read
  the committed source and reasoned about it as if it were live.

  **Done when:** every function's deployed bundle matches this checkout, the
  inventory is clean, and something makes it stay that way — a deploy is not
  a step somebody has to remember. **Andrew decides what ships and in what
  order; deploying is gated on him.** The customer-facing hole from 3.4 — a
  dashboard cancellation telling the customer nothing — is first in that
  order.
  *Found while gating a one-file deploy for ROADMAP 3.4; the flag came before
  the deploy rather than after, which is the whole difference between a near
  miss and an incident.*

- [ ] **0.7 — The maintenance reminder has no opt-out, and the fix is a
  product question rather than a template edit. Found 2026-09-20.**
  `maintenanceDueEmail` in `_shared/emailTemplates.ts` sends *"Your Ceramic Pro
  annual inspection is due by 12 October. Book it below and we'll take care of
  it"* with a **Book it in** button, on a cron sweep, to a customer. It carries
  **no unsubscribe link and no postal address**.

  **THE FILE'S OWN HEADER SAYS THAT EMAIL IS NOT THERE.** Verbatim: *"WHAT IS
  DELIBERATELY NOT HERE: the re-book / maintenance reminder… it is the one
  email in the set whose primary purpose is MARKETING — under CAN-SPAM that
  needs an unsubscribe, a suppression list and a sending reputation the
  transactional set is exempt from. Its own roadmap item."* It is at line 1324
  of the same file, and `send-owner-reminders` sends it. The document and its
  own contents disagree, and the header is the one describing the intent.

  **WHY THIS IS NOT A TEMPLATE EDIT, AND THIS IS THE WHOLE ITEM.** The obvious
  fix is to give it the footer the campaign already has — `shell`'s `legal`
  argument takes a `mailingAddress` and an `unsubscribeUrl`, and
  `send-campaign` **refuses to send at all** when `business.mailing_address` is
  empty. Wiring that here means **the product needs a postal address from every
  detailer**, and there is no evidence it collects one: `mailing_address` is a
  column on `businesses` that the campaign feature checks and nothing in the
  setup flow appears to require. So the choices are:
  - require a postal address of every detailer, which is a new setup step and
    a new blocker on an existing feature; or
  - stop sending the maintenance reminder until that exists; or
  - establish that it is transactional rather than commercial, which is a
    judgment about the product's purpose and not one a session should make.

  **A PLACEHOLDER ADDRESS IN A LEGAL FOOTER IS THE ONE OUTCOME THAT MUST NOT
  HAPPEN**, which is why this is written up rather than fixed. **For Andrew.**
  *Found in the ROADMAP 3.4 email audit; the manager's ruling, 2026-09-20:
  write it up with the reasoning, do not fix it.*

---

## Wave 1 — Stop exposing Andrew and other people's brands

Smallest wave, highest embarrassment cost, all of it confirmed in source.

- [x] **1.1 — DONE 2026-09-16. Andrew's real payment handles are out of the demo
  business AND out of the database.** Re-seeded and verified three ways.
  **The script's own "Done when" grep was wrong, and it hid a fourth leak.**
  It searched for `andrews-detail\|andrewsdetail` — a *spelling*, not the
  behavior — so it passed while `pay_other` still read *"Apple Pay, or a check
  made out to Andrew's Auto Detail"*. That string goes on every confirmation,
  reminder and unpaid invoice the demo sends. Now
  "…made out to Coastline Auto Detailing". `scripts/seed-demo.mjs:193`.
  This is `docs/gotchas.md`'s "a grep coupled to a spelling rather than a
  behavior", caught in this file's own acceptance criteria.
  **How it was checked — three measurements, each of which fails loudly on
  zero targets rather than printing clean:**
  1. **Database, before and after.** A scan of all 16 businesses and all 16
     `business_settings` rows, 404 string fields, matching `/andrew/i` in any
     spelling. **Before the re-seed: 4 hits, all on `demo-detail`** —
     `pay_venmo=@andrews-detail`, `pay_cashapp=andrewsdetail`,
     `pay_paypal=https://paypal.me/andrewsdetail`, and the `pay_other` check
     line. **After: 0 hits, 404 fields still scanned.** The scan exits 2 if it
     finds zero businesses, so an empty database cannot read as a pass.
  2. **The email path, through the real code.** The demo's live settings row
     fed to `supabase/functions/_shared/payments.ts` → `paymentHandles()`, the
     same function every email calls. **6 handles rendered, 0 real-identity
     hits.** It exits 2 on zero handles — a clean scan of nothing is not a pass.
     No template hardcodes a handle: `grep -rni andrew supabase/functions/
     app/src` returns comments only.
  3. **A real browser, 1440x900.** Signed in as the demo owner, opened
     Business → "How you get paid", and read the five input `.value`s out of
     the DOM rather than `innerText` — `innerText` does not return an input's
     value, which is the same class of lie as gotchas.md's `<option>` entry and
     would have shown five placeholder labels and no data. Read:
     `@coastline-demo`, `coastline-demo`, `https://paypal.me/coastline-demo`,
     `(562) 555-0142`, "Apple Pay, or a check made out to Coastline Auto
     Detailing". `/andrew/i` over the whole rendered page: **false.**
  **Still open, and not part of this item:** `andrewsdetail.com` appears three
  times in `app/src` — twice as an operational note in `AdminPage.jsx:353,360`
  (the Resend sending cap is genuinely shared with his real business, so that
  warning is true and useful) and once at `LandingPage.jsx:631` as the URL in a
  mock browser bar on the marketing page. None is a payment instruction and
  none was in this item's scope. **The landing-page one is worth a decision:**
  it is a public page showing Andrew's real business domain as the example.
  *A2 1.2*

- [x] **1.2 — DONE. XPEL half 2026-09-16, the /ex5 identity 2026-09-20. Example sites claimed a real brand.**
  **Verified:** `grep -rc XPEL docs/tenant-sites/*.html` returns zero matches.
  Six strings across `t-blackline.html` and `y-kinzie.html` now read
  "Manufacturer-certified film installer" / "CERTIFIED · Film installer".
  ~~**Left open deliberately:** `/ex5` is still "Tampa Bay Auto Detail" with
  `info@tampabayautodetail.com`.~~ **RENAMED 2026-09-20 — Andrew's decision,
  and the whole item is closed now.** His call was: invent a name and a
  matching domain that are obviously not a real firm, because the page
  demonstrates the same thing either way and the question disappears for
  nothing.
  **What it is now: "Sunglade Auto Detail", `info@sungladeauto.example`.** Four
  name occurrences and four domain occurrences, in the title, the masthead
  wordmark, the top contact bar, the footer card and the copyright line. **The
  domain ends `.example` on purpose** — that suffix is reserved for examples
  and cannot be registered by anybody, so no real business can ever own it.
  Swap it for a plain `.com` if it should look conventional instead; it is one
  line.
  **The geography stayed.** Tampa Bay, St Petersburg, Clearwater and Brandon
  are places, not companies, and the page's whole layout rests on a real metro
  with real drive times. Only the business identity was invented.
  **HOW IT WAS CHECKED:** rebuilt the example sites and walked `/ex5` at
  1440x900, 768x1024, 392x844 and 320x844. Zero occurrences of the old name or
  domain in the rendered page at every width, both mailto links read
  `info@sungladeauto.example`, no horizontal overflow at 320, and the wordmark
  still breaks over two lines on the phones exactly as it did. Console clean at
  all four.
  **AND THEN THE WHOLE CLASS WAS CLOSED, SAME DAY, ON ANDREW'S RULING** — the
  first pass fixed one site and reported the rest, he measured what was
  reported, and one of them was not a maybe:
  - **`chicagoautopros.com` RESOLVES.** It is a live host, so it is somebody's
    actual business, and it was named twice in `/ex4`'s source. **It is out.**
    Both mentions were design-provenance comments rather than anything on the
    page — but comments ship with the file, and it is served at `/ex4`. The
    name now lives only in `docs/schemes/kinzie-mobile-detailing-scheme.md`,
    which is not published. **An invented name was NOT written into those
    comments**: they record where a measurement came from, and a false
    provenance note is worse than none.
  - **`/ex5`'s phone is now `(813) 555-0173`.** The old `(813) 402-7719` was a
    real Tampa area code and exchange — the same risk as a real name, pointed
    at a phone. 555-01xx is the range reserved for fiction, which the other
    four sites already used.
  - **Every example email is on `.example` now**, `/ex3` and `/ex4` included.
    Nobody can register that suffix, so the whole question is closed rather
    than narrowed one site at a time.
  - **`andrewsdetail.com` stays in `/ex1`. Confirmed by measurement, not by
    reading:** one occurrence in the served file, inside a CSS comment quoting
    Andrew's own instruction; zero in the rendered text, zero in any `href` or
    `src`. It is his own business and nothing links to it.
  - **The `/ex3` and `/ex4` business NAMES were deliberately left alone** —
    Ballantyne and Kinzie are place names, not company names, and Andrew ruled
    renaming them a bigger job than this item. Logged in `FOUND.md` as a
    question, with the general rule that needs deciding first.
  **HOW THE SECOND PASS WAS CHECKED:** rebuilt the sites and walked `/ex3`,
  `/ex4` and `/ex5` at 1440x900, 768x1024, 392x844 and 320x844. Zero
  occurrences of `chicagoautopros`, `kinziedetail.com`, `ballantynedetail.com`
  or the old Tampa number in any rendered page at any width; every `mailto`
  reads `.example` and every `tel:` is a 555 number; no horizontal overflow at
  320 on any of the three; console clean at all twelve stops.
  `/ex5` is "Tampa Bay Auto Detail" with `info@tampabayautodetail.com`; `/ex4`
  claims "XPEL certified installer".
  **Andrew, 2026-09-16:** *"those are all example sites… it was like an example
  of someone having an XPEL certification."* Understood, and the intent is
  obviously innocent.
  **The risk is not the intent, it is that these pages are public and look
  real.** XPEL is a live trademark and certifies actual installers; a public
  page claiming their certification for a business that does not exist is the
  one thing on these sites a real company could object to. "Tampa Bay Auto
  Detail" is likely a real firm's name and email domain.
  **Recommendation, and it costs nothing:** invented certification
  ("Manufacturer-trained film installer"), invented name, invented domain. The
  page demonstrates exactly the same thing and the question disappears.
  **This is Andrew's call, not a defect** — if he would rather leave them, tick
  this box with that decision written in and move on.
  *A2 1.4*

- [ ] **1.3 — Test accounts appear in production lists and counts.**
  Back office "Everyone" shows 16 rows of which 15 are tests; the client list
  carries "Smoke TPMOY" with a broken number "(555) 014-2"; "9 gone quiet"
  counts them.
  **Fix:** per 0.3 — flag, default every list and count to real only, add an
  unmistakable DEMO/TEST badge where they are shown deliberately.
  **Done when:** a support task never requires scanning test rows, and the
  "gone quiet" count drops to match real customers.
  *A1 P3-01, A2 1.3*

---

## Wave 2 — Booking truth

A customer must never be shown one price and charged another, never be handed
the wrong service, and never book a job we cannot reach.

- [ ] **2.1 — The total rises after the customer has picked the time.**
  Both audits, independently, with different numbers: $205 → $235 (A1) and
  $300 → $330 (A2). A $30 weekend rate only appears at the final breakdown.
  **Fix:** mark affected days in the calendar with "+$30" and add the line to
  the running total the moment a weekend day is selected. Keep it in the final
  breakdown too.
  **Done when:** a customer cannot leave the date/time step without having seen
  the exact final total and every automatic surcharge.
  *A1 P0-01, A2 2.3*

  **STEPPED PAST 2026-09-20 rather than picked up, and named here on purpose
  so this does not read as untouched — a session that later sees it still
  open should not re-spend the time finding out why.** The fix as written
  ("mark affected days in the calendar") needs the booking page to know WHICH
  days carry a surcharge and by how much before the customer picks one. It
  cannot: `get_public_business_profile` in
  `supabase/migrations/20260831004000_pricing_rules_and_travel_zones.sql`
  deliberately excludes `business_settings.price_rules` from what the booking
  page ever receives — that migration's own comment says publishing the rules
  "would be a second copy to keep in step" with what `calculate-booking`
  resolves server-side, and the customer "never needs to evaluate one." That
  is a real, considered decision, not an oversight.
  Building the fix as specified means one of: querying the pricing function
  once per visible calendar day (a new call shape nobody has written, and its
  own cost to prove out), or reopening the decision above to publish the
  rules after all. **Either is bigger than a single clean item and is a call
  for whoever owns that trade-off, not something to build quietly inside a
  "pick your next item" pass.** Left open rather than attempted.

- [ ] **2.2 — The summary lines do not add up to the total.**
  **Confirmed mechanism:** `supabase/functions/_shared/pricing.ts:127-128`
  rounds the *total* to a `nearest` setting while each discount line rounds
  separately at lines 270, 475, 506 and 514. A2 saw lines summing to $328 under
  a $330 total labelled "Rounded up to the nearest dollar", and a 10% member
  discount taking $275 to $245 where $247.50 was correct.
  **Fix:** round once, per line, and make the total exactly the sum of the
  displayed lines. Remove the "rounded up" note.
  **Done when:** lines sum to the total on every step across several
  combinations — with and without member rate, weekend, vehicle size, add-ons.
  This one gets a unit test against `pricing.ts`, not just a browser check.
  *A2 2.2*
  **BUILT 2026-09-20 — code-only, held for the deploy freeze rather than for
  doubt about the fix, and proven by a unit test rather than a browser
  because a browser here can't reach an unfixed deployed function anyway.**
  **THE BLOCKING QUESTION FIRST, ANSWERED BEFORE ANY LINE OF PRICING.TS WAS
  TOUCHED.** Does the live estimated total come from the edge function or a
  second implementation in `app/src`? One implementation.
  `app/src/book/steps/StepReview.jsx`'s own header states it: *"The quote
  shown here is the SERVER's (calculate-booking), never a local sum."*
  `calculate-booking` and `create-booking` both run the same
  `computeQuote` — `pricing.ts`'s own header: *"so the two can never drift
  apart."* No second money computation exists in `app/src`.
  **BUT NOT NOTHING, EITHER, AND IT MATTERS FOR THIS FIX.**
  `StepReview.jsx` already carries a dated (2026-09-11), reviewed
  CLIENT-SIDE patch for exactly this complaint — it reads the server's raw
  `site_discount`/`promo_discount`, computes the same gap this item is
  about, and folds it into the LAST discount's DISPLAYED amount so the
  customer's own screen already shows self-consistent lines today. It never
  touches `quote.total`, so the actual charge was never wrong on this
  screen — but the fold **does not cover a plan/member discount**, only
  site and promo, which is exactly the shape of Andrew's own named example.
  Not a second truth about money — the total has one source — but a second
  place handling the same rounding problem, with narrower coverage than the
  server needed. Answered before proceeding; not a stop condition.
  **TEST WRITTEN FIRST, RUN AGAINST THE UNFIXED CODE, FAILURES CAPTURED
  BEFORE ANYTHING CHANGED.** `tests/pricing-lines-sum.test.mjs` — pure unit
  test, `computeQuote` imported directly, no network, no credentials, no
  deployed function. Eight scenarios plus the item's own named example:
  with/without member rate, weekend surcharge, vehicle size, add-ons, and
  all of them at once. **5 of 9 failed on the code as it stood**, with real
  numbers, not projected ones:
  - `member rate, 10% off, nearest-$5`: **lines summed to $247, total
    charged $245 — a $2 gap, customer UNDERcharged** relative to what the
    lines said (the item's own example, reproduced exactly: `Math.round(275
    × 10 / 100) = 28`, not the precise `27.50`).
  - `site sale 10%, nearest-$5` and `promo 10% off, nearest-$5`: same $247
    vs $245, same direction, same mechanism, different line producing it.
  - `everything at once — member rate, weekend, size, add-ons, site sale,
    promo, rounding`: **lines summed to $289, total charged $290 — a $1
    gap, customer OVERcharged.** The opposite direction from the other four,
    on the same function, from the same class of bug — confirming
    Andrew's read that overcharge and undercharge are the same defect to a
    test and different things to him. Both directions are real and neither
    is rare enough to assume away.
  **THE FIX.** After `total` is computed (unchanged — still one
  `roundToNearest` call, still the business's own `nearest` setting), the
  gap between the precise pre-rounding amount and `total` is folded into
  whichever discount sits nearest the total: `promoDiscount` first, else
  `siteDiscount`, else the last adjustment line with a negative amount
  (reaching a plan/member discount, which the client-side version never
  did). Nothing folds into a positive line (a surcharge), on purpose — the
  reasoning `StepReview.jsx` already wrote down: the customer reads a
  changed DISCOUNT as their own rate being honoured; a changed SURCHARGE
  reads as the business moving the price after the fact.
  `adjustmentsTotal`/`subtotalBase`/`subtotalAfterSite` are recomputed from
  the (possibly folded) lines afterward, not left stale — `subtotal` is
  stored on the booking and read by emails and the dashboard, so it has to
  agree with the fold too, not just the total.
  **NOTHING TO FOLD IT INTO — the one case left as a sentence, on
  purpose.** A booking with rounding but no discount at all has nowhere
  server-side to put the gap either. `StepReview.jsx`'s existing "Rounded
  up/down to the nearest dollar" sentence already covers exactly this case
  correctly and needed no change.
  **ALL 9 TESTS PASS NOW**, including the item's own example, whose
  discount line now correctly reads as a $30 member discount rather than
  $28 — the rate the rounding setting actually delivered, not the one
  before an unexplained $2 vanished.
  **NOT TOUCHED, AND NAMED SO NOBODY WONDERS LATER: `StepReview.jsx`'s own
  client-side fold.** Once this ships, its `gap` will compute to 0 for
  every booking that has a site or promo discount (the server now hands it
  already-reconciled numbers) — the client logic doesn't break, it goes
  dormant, the same shape this session's CSS fix hit tonight with a dead
  `max-height` rule. Left alone rather than removed: it is still the
  correct fallback for the no-discount case, and deleting working code on
  the strength of "it won't fire often now" is not this item's job.
  **THE FREEZE HOLDS.** This is `supabase/functions/_shared/pricing.ts`, an
  edge function. Nothing here has been deployed and nothing will be without
  Andrew's word — the test is the proof because a browser cannot reach code
  that isn't live. `create-booking`/`calculate-booking` themselves were not
  edited; both already call the shared function unmodified.

- [ ] **2.3 — A far-away address is accepted with no travel charge.**
  A San Diego address went through with "Long Beach" selected, no warning and
  no "+$40 beyond 15 miles". The customer picks their own service area from a
  list, so they choose whether to pay the travel fee.
  **Fix:** derive distance from the looked-up address and apply travel cost
  automatically; remove the customer's area choice or fill it from the address;
  refuse out-of-area addresses with a phone number; don't let a booking page
  take bookings until "Where you work" is set.
  **Done when:** a far address is refused, a 15+ mile address adds the charge
  visibly, a local address goes through clean.
  *A2 2.1*

- [x] **2.4 — DONE 2026-09-19. Every booking button on all five examples now
  opens a booking path, and a certified check says so every run.**
  `scripts/example-ctas.mjs` — **PASS, 51/51 controls, 317 assertions, three
  canaries caught.** `receipts/example-ctas.json` grades it independently;
  `artifacts/example-ctas/index.html` lists every control and its verdict.
  No database, no credentials — a dev server and eight static files.

  **It was THREE files carrying the handler, not two**, and one more defect
  than the audits found. `v-goldenhour.html` runs the identical block; it
  happens to have `id="book"`, so it worked, and fixing the two without it
  would have left a third copy to drift. One replacement, byte-identical
  across all three (md5-checked before the edit).

  **AND TWO FOOTER LINKS NOBODY HAD EVER REPORTED.** `<a href="#book">Get a
  price</a>` sits in the footer of Work and Prices, pointing at an id that
  exists on neither. It throws nothing and does nothing — **the version of
  this bug a console check cannot see**, which is why the check asserts the
  LANDING rather than the absence of an exception. Repointed at the index.

  **THE SELECTION NOW TRAVELS, WHICH THE STATED FIX DID NOT ASK FOR AND
  NEEDED.** "Navigate by URL instead of scrolling" alone drops the choice, so
  "Book Express Wash" would land on Full Detail — the widget's `checked`
  default. That is 2.5 happening on ex1. The href is rewritten at bind time
  with `?svc=…`, which also restores middle-click and open-in-new-tab;
  `preventDefault` had broken those on every page, including the one where the
  scroll worked.

  **CERTIFIED BY BREAKING IT FIVE WAYS, not by reading it:**
  - `--break=reach` → `CANARY MISSED: canary · dead target`, exit 1.
  - `--break=select` → `CANARY MISSED: canary · wrong service`, exit 1.
  - `--break=quiet` → `CANARY MISSED: canary · throws`, exit 1.
    Each disabled detector let through **exactly its own** canary and no other.
  - **The pre-fix pages, re-served from `HEAD` into the gitignored build
    output**: 8 failures — six `pageerror: Cannot read properties of null
    (reading 'scrollIntoView')` on the `data-book` controls, and the two "Get
    a price" links caught by `reach` **with no error at all**. Restored and
    re-run: PASS.
  - **Two defects were in the CHECK and both were found by disbelieving it.**
    First run: all 51 controls reported `Timeout 4000ms exceeded` — discovery
    stamped its index on a probe page and the click happened on a fresh load
    that had never been stamped. Second run: 8 controls "could not be
    pressed", and every one measured **0x0 at 1440** — the phone dock on all
    five sites. It sweeps 1440x900 **and** 392x844 now, and retries after a
    scroll, because ex4's `.nav` is `opacity: 0` and translated -68px until
    the page moves. A control pressable at neither width in neither state is
    its own named failure.

  **Not fixed, logged instead — `FOUND.md`:** ex3's three `#services` links
  point at an id that does not exist (a nav item, not a booking control), and
  ex4's sticky-nav "Book a detail" paints 101x35 at 392, under the 44px floor.
  Both are real; neither is this item.

  <details><summary>The original finding</summary>

  **Confirmed in source, and it is two pages, not one.**
  `docs/tenant-sites/v-goldenhour-prices.html:1585` and
  `v-goldenhour-work.html:1568` both call
  `document.getElementById("book").scrollIntoView(...)` with no null guard, and
  `id="book"` exists **only** on `v-goldenhour.html`. So `/ex1/prices` and
  `/ex1/work` both throw `TypeError: Cannot read properties of null`. A1 found
  the prices page; nobody found `/ex1/work`.
  **Fix:** one guard — if `#book` is absent, navigate to the index page's
  booking anchor by URL instead of scrolling.
  **Done when:** every booking button on every example opens a valid booking
  path. An automated check visits every public service CTA across all five
  examples.
  *A1 P0-02*
  </details>

- [ ] **2.5 — One example hands the wrong service into booking.**
  On `/ex3/prices`, "Book this" under the $200 Interior Refreshment left the
  $500 Signature Detail selected, and Interior Refreshment was not offered at
  all in the embedded flow.
  **Fix:** one service identifier from website card through to booking
  selection. Refuse to publish a public service whose booking mapping is
  missing.
  **Done when:** the automated CTA check from 2.4 also asserts the matching
  service name and price in booking.
  *A1 P0-03*

- [x] **2.6 — DONE 2026-09-20. The year is optional, the label says so, and a refused Continue now says why on every step.**
  Size and model filled, Continue stayed dead until a year was typed; the year
  box is not marked required while the box above it is marked "(optional)".
  **Fix:** make year optional. More generally: never silently disable Continue
  — let it be pressed and highlight what is missing in plain words.
  **Done when:** the step continues without a year, and any genuinely required
  box says what it wants when Continue is pressed.

  **CORROBORATED 2026-09-19, BY A MACHINE HITTING THE SAME WALL.**
  `scripts/sweep-booking-steps.mjs` died on this step every run, so **steps
  4, 5, 6 and 7 of the booking flow had never been measured at any width.**
  Diagnosed before anything was touched: `core.js`'s `blockers()` pushes
  `no-year` and the product correctly disables Continue — **the script was
  wrong, not the page.** But the detail this item already names is exactly what
  made it invisible: the box ABOVE says *"What are you bringing? (optional)"*
  and the required one says only *"Year"*, so a reader concludes neither is
  required. A human reported that on 2026-09-12; a script reproduced it on
  2026-09-19 without knowing the item existed.
  **And the reason "no reason" is literal:** the explanation is gated on
  `yearTouched`, so a customer who never focuses the box is told nothing at
  all. The sweep's own failure line says `The page shows no reason.`
  ~~**Still open and still app/src work**~~ — **CLOSED 2026-09-20.**

  **HOW IT WAS CHECKED:** walked the real booking page on the dev server at
  1440x900, 768x1024, 392x844 and 320x844; at every one of them the year box is
  empty, Continue is pressed, and the page moves to step 4 of 7 — and the
  contact step still refuses an empty email out loud, which is what proves the
  shared button change is still doing its job. Console clean at all four,
  nothing overflowing at 320. Gates green: `booking-core` 290, `composition`
  97, `landing-pricing` 109, `route-contract` 34, 0 failed.

  **THE AUDIT'S OPTIONAL-YEAR HALF WAS SETTLED BY ANDREW ON 2026-09-20, NOT
  STRUCK.** It sat in direct conflict with his own 2026-09-14 ask, which had
  made the year required with an estimate accepted, and that conflict is why
  this item stopped halfway on its first pass rather than picking a side. His
  ruling: **make it optional** — it is a nice-to-have that helps him identify
  the car, and before this fix it was not even asked for properly. The later
  word replaces the earlier one. `core.js` no longer emits `no-year` at all,
  and `tests/booking-core.test.mjs` carries the reversal rather than a rewrite,
  so the September 14 note and its replacement are found together.

  **WHAT SHIPPED, AND NOTHING ELSE:** the year is optional; the label reads
  "Year or estimate (optional)", worded and placed like the make-and-model box
  above it so the pair reads consistently, with its Spanish key added in the
  same edit; the existing "an estimate is fine" sentence stays. The
  make-and-model box was not touched and no one-of-the-two rule was added.

  **THE SHARED HALF, WHICH IS THE BIGGER PART.** A switched-off Continue fires
  no click, so no step could ever explain a refusal on a press — each invented
  its own workaround or had none. The button is now `aria-disabled` and takes
  the press in the one place all seven steps share. **2.7 STAYS OPEN**: its
  wording gap is narrowed but its real question, whether an email should be
  required at all when no plan is attached, is a rules change nobody has ruled
  on.

  **STILL WRONG, AND IT IS 2.12's:** the "an estimate is fine" sentence has no
  Spanish and falls back to English on an otherwise Spanish step. Found here,
  left alone deliberately — 2.12 is held until the width sweep is held.
  *A1 P1-06, A2 2.4*

- [x] **2.7 — Continue is greyed out with no reason (contact step).**
  The hint says "Add your name and phone number to continue"; Continue stays
  dead until an email is added. Email may only be required when a plan is
  attached.
  **Fix:** the hint states exactly what is required in each case.
  **Done when:** the hint always matches what validation actually enforces.
  *A1 P1-06, A2 2.5*
  **DONE 2026-09-20, AND SAYING SO EXPLICITLY BECAUSE ANDREW ASKED FOR A
  RULING RATHER THAN AN ASSUMPTION.** The reported symptom was exact: the line
  under the fields read *"We'll send your confirmation here, with a link to
  change or cancel."* — a reassurance — while Continue refused because the
  email was empty. The email sentence existed but was gated on a PRESS, so a
  customer who had not pressed saw the page say everything was fine while the
  button said otherwise. **That is now impossible:** the line names whatever is
  actually blocking, from the moment it blocks, and the reassurance only
  appears when nothing is. Walked and measured — name and phone empty reads
  *"Add your name and phone number to continue."*; fill them and it reads
  *"Add your email to continue. Your confirmation goes there."*; fill that and
  the reassurance comes back with no refusal element on the page at all.
  **ONE SENTENCE AT A TIME, NOT A LIST, and that is deliberate:** the order is
  the order of the form, which is how this step has always behaved and what
  Andrew reviewed. Naming all three at once needs seven strings for the
  combinations of three fields.
  **THE RULES QUESTION UNDERNEATH IT — RULED ON 2026-09-20, AND THE RULING IS
  THE ITEM. Do not open it as a separate one.** Whether an email should be
  required at all when no plan is attached had been open since the audits.
  **EMAIL STAYS REQUIRED**, and the reason has an expiry date on it:

  > **Email is currently the ONLY way this product tells a customer anything.**
  > There is no texting yet — that is ROADMAP 3.3 and it is open. So a booking
  > without an email is a booking the customer never hears about: no
  > confirmation, no reminder, no link to change or cancel, no word when a
  > request is accepted. That is worse than a customer who has to type an
  > address into a box. — Andrew, 2026-09-20

  **REVISIT IT THE DAY 3.3 LANDS.** The moment a customer can be reached another
  way, the reason for this rule is gone and the requirement should be argued
  again rather than inherited. Anyone reading this after texting ships: the
  decision above was made when email was the only channel, and it said so.

- [ ] **2.8 — Address entry may accept unverified raw text.**
  Continue became enabled before a suggestion was selected. **A1 marks this
  "observed, submission consequence untested."**
  **Fix:** decide whether manual addresses are allowed. If not, require a
  selection. If yes, label it "Use this address anyway", keep the raw value and
  flag it for review.
  **Done when:** tests cover selected, partial, nonexistent, out-of-area,
  apartment/unit, and manually accepted addresses.
  *A1 P1-05*

  **MEASURED 2026-09-20, WHICH IS WHAT THE WATCH LIST ASKED FOR.** A1 marked
  this *"observed, submission consequence untested"*, so the consequence was
  tested before anything was designed. **One real booking was completed on
  `demo-detail`** with Andrew's standing permission — customer *"ROADMAP 2.8
  Address Test"*, booking `c4c1f0c8-b2d1-41d6-ad93-e01d89500593`, Friday 25
  September 8:00 AM, Express Wash $65, status `pending`. Both addresses on it
  are `@example.com`, which is in `send-email`'s undeliverable-domain guard, so
  **no mail was sent to anybody**. The row is deliberately left in place —
  ROADMAP 0.3, flag test data, never delete it.

  The address used: `99999 Nonexistent Parkway, Nowhere Township, ZZ 00000`.

  **1 — IT GOES THROUGH, AND IT NEVER HAD TO PASS ANYTHING.** The step's only
  rule is `!form.customerAddress?.trim()`, so any text at all satisfies it.
  Measured: Continue reads `aria-disabled="false"` with nonsense in the box
  **before the lookup has been asked anything**. Nothing calls the lookup on
  its own — `find()` runs on the Find button and on Enter, and on nothing
  else — so a customer who types and presses Continue is never checked and
  never told.

  **2 — THE PAGE IS HONEST, ONCE, AND ONLY IF ASKED.** Pressing Find on an
  address with no matches prints *"No matches. We will use the address as you
  typed it."* **That sentence is the only place in this product that knows.**

  **3 — AND THE FACT DIES ON THAT STEP.** `AddressField` calls `onChange(raw)`
  when you type and `onChange(row.label)` when you pick a suggestion — the
  same call, the same kind of string. Nothing records which happened: no field
  on the form, none in the payload, and **no column on the table**
  (`customer_address text`, and no verified/source column in any migration).

  **4 — WHAT EVERY DOWNSTREAM SURFACE SHOWS, all measured on that booking:**

  | surface | what it shows |
  |---|---|
  | review step, before pressing | `We come to you · 99999 Nonexistent Parkway…` |
  | confirmation screen | `We'll come to 99999 Nonexistent Parkway…` |
  | the customer's manage page | the same, and the word "verif" appears nowhere on it |
  | the detailer's job record | the raw address, **with a Navigate button that hands it straight to a maps URL** |
  | every email | `jobAddress()` returns the raw string — owner alert, customer confirmation, reminders |

  **5 — THE SERVER NEVER LOOKS AT IT EITHER.** `create-booking` trims and
  stores; there is no address validation server-side at all. The travel fee
  comes from a ZONE THE CUSTOMER PICKS FROM A LIST, not from the address, so an
  unresolvable address does not even move the price — which is why nothing
  else in the stack ever had a reason to notice.

  **SO THE ANSWER TO THE WATCH LIST IS: YES, IT GOES THROUGH, AND NO, NOTHING
  ANYWHERE IS MARKED.** The detailer's first sight of a made-up address is on
  the morning they drive to it.

  **ANDREW'S RULING ON THE FIX, 2026-09-20, GIVEN BEFORE IT WAS BUILT:** *"Do
  NOT refuse hand-typed addresses. People live in new builds and apartments the
  lookup has never heard of, and refusing them loses Andrew a real customer to
  protect him from a rare bad one. Instead the address has to carry the fact
  that it was never verified, all the way to wherever the detailer reads it
  before driving out. An honest label beats a locked door."* **So the fix is a
  flag that travels, not a gate** — and the measurement above says where it
  has to reach: the job record, the owner's alert, and the manage page.
  **BUILT 2026-09-20. NOT TICKED: ONE LINK IS UNPROVEN AND IT IS NOT A SMALL
  ONE.** What exists:

  * **The column.** `bookings.address_source`, migration
    `20260920010000_an_address_carries_how_it_was_arrived_at.sql`, **applied to
    `kguqylyzgyzfktkfnhjb`** and confirmed against `information_schema`:
    `text`, nullable, `check (null or 'picked' or 'typed')`. Additive — no
    backfill, no default, no existing row touched, which is what made it safe
    to run while another session was mid-measurement.
  * **The one place that can know.** `AddressField` calls `onChange(value,
    "typed")` when the customer types and `onChange(value, "picked")` when
    they take a suggestion. Those two calls were identical before, which is
    why nothing downstream could ever tell them apart.
  * **The server decides, not the page.** `create-booking` keeps the value
    only for a mobile booking with an address and only if it is one of the two
    known words; anything else stores null.
  * **Never on the quote.** The travel fee comes from a zone the customer
    picks, so the price has never depended on the address and must not start.
  * **The three surfaces:** the job record prints the line under the address
    and above the Navigate button; the owner's alert prints it under "Where";
    the manage page tells the customer, because that is the screen with a
    Change button on it. `get-booking-receipt` names the column in its
    allow-list on purpose.
  * **The unanswered-request nudge got it too**, via one shared
    `ownerWhereRow()` helper — two detailer-facing emails printing the same
    address is exactly how one of them keeps the old behaviour silently.

  **PROVEN ON A REAL SCREEN, BOTH WAYS:** the owner's alert rendered from the
  real template for a typed address and a picked one. The typed one carries
  *"Typed by hand. The address lookup found no match for it."* under the
  address; the picked one, the plain one and the request nudge carry nothing.
  The payload was checked the same way: `typed` → `typed`, `picked` →
  `picked`, an untouched box → `null`, and `address_source` is absent from the
  quote request entirely.

  **WHAT IS NOT PROVEN, PLAINLY:**

  1. **The two edge functions are NOT DEPLOYED.** `create-booking` and
     `get-booking-receipt` carry the change in source only — the deploy was
     refused by this session's own permission gate as a production deploy, and
     it was not worked around. **Until they are deployed the column is never
     written**, so a real booking still stores `null` and nothing appears on
     any screen. Everything else here is ready and waiting on that one step.
  2. **The detailer's job record was NOT SEEN.** It is behind a password
     sign-in this session does not perform. The code is written and reviewed;
     it has not been looked at on a screen, and that is a gap, not a pass.
  3. **The manage page label was NOT SEEN** for the same reason as (1) — the
     receipt function has to be deployed before the column reaches it.

  **So the honest state is: the column is live, the client records the fact,
  the templates print it, and nothing has yet carried one from end to end.**

  **WHY IT IS STUCK, IN PLAIN WORDS — AND IT IS NOT THIS ITEM'S FAULT.**
  **`create-booking` and `get-booking-receipt`** are the two functions in the
  middle. They are the pair that WRITES the column and READS it back, and both
  are running older code than what is committed here. On 2026-09-20 the other
  session found that **twenty-six edge functions are running code older than
  the repo believes**, some by thirteen days — so deploying either of these two
  would ship a fortnight of somebody else's unreviewed work alongside this
  column. **All deploys are frozen until that backlog is inventoried.** The
  freeze is not about this item.

  **THIS ITEM GOES GREEN THE MOMENT THOSE TWO SHIP.** Whoever lifts the
  freeze: deploy `create-booking` and `get-booking-receipt`, make one booking
  with an address the lookup cannot find, and read `address_source` back off
  the row. Nothing else is outstanding except looking at the job record on a
  real screen, which needs a sign-in.

- [x] **2.9 — DONE 2026-09-20. Where the business works is on step 1 now. Nothing moved.**
  Mobile address and area come at step 4, after services, add-ons and vehicle.
  ~~**Fix:** ask "Where's the car?" before vehicle details.~~
  **THE FAULT IS THAT AN OUT-OF-AREA CUSTOMER FINDS OUT LAST, NOT THAT STEP 4
  IS IN THE WRONG PLACE — Andrew's ruling, 2026-09-20**, and the reordering the
  audit proposed was refused with it: these screens work, and the bar for
  touching one is a named fault rather than a better idea. So the step keeps
  its job and the fact stops being a surprise.
  **WHAT SHIPPED:** one line at the top of step 1, above the first category —
  *"{business} comes to you, serving {area}."* **It is the sentence step 4
  already says**, the same key, so the two screens cannot drift into two
  different claims and no new string entered the catalogue. It is drawn only
  where it is true and useful: a business that does not travel has no area to
  state, and one that travels without naming an area would render "comes to
  you" with nothing in it, which tells a customer in the next county nothing.
  Both of those fall through to the page exactly as it was.
  **HOW IT WAS CHECKED:** two seeded tenants at 1440x900, 768x1024, 392x844 and
  320x844. The line reads *"Coastline Auto Detailing comes to you, serving Long
  Beach & South Bay."* at every width — one line at 1440 and 768, wrapping to
  two on both phones, no horizontal overflow at 320. Spanish needed no new key
  and renders *"va a ti. Damos servicio en…"*. Step 1 still advances to step 2.
  Console clean at all four. Gates green: `booking-core` 290, `composition` 97,
  `landing-pricing` 109, `route-contract` 34, 0 failed.
  **THE HEIGHT COST, MEASURED RATHER THAN ASSERTED:** the line is 19px on a
  desktop and 38px on a phone. On the two-category tenant at 1440x900 step 1
  was ALREADY 108px taller than the window before this change and is 127px
  after — it scrolled before and it scrolls now. On the two-service tenant the
  step still fits with the line in place. **No screen that fitted stopped
  fitting.**
  *A2 2.6*

- [x] **2.10 — DONE 2026-09-20. The plan pitch moved to after the date. Nothing about the pitch itself changed.**
  Four plan cards in a dense two-column set on the add-ons step, before a date
  is chosen.
  ~~**Fix:** move plans off the add-ons step — their own step or a linked
  page.~~ **Neither.** A separate step or a link would undo Andrew's 2026-09-13
  instruction — *"underneath the add ons, pretty big and pretty visible… not a
  button to go to the screen, but just the whole screen"* — which he gave after
  objecting TWICE that a small chip would be missed. **The fault as named is
  about WHEN, not about size or place: plans competing with add-ons before a
  date exists.** So the pitch is untouched — full width, all four plans, the
  real thing — and only the step carrying it changed, from the add-ons step to
  the first step after the date. One line.
  **MEASURED BEFORE AND AFTER, on the demo tenant's own menu:**

  | width | add-ons block | pitch on that step | step 2 total | step 2 over the screen |
  |---|---|---|---|---|
  | 1440x900 | 241px | ~~472px~~ → 0 | ~~1030px~~ → 900 | ~~130px~~ → **0** |
  | 768x1024 | 241px | ~~462px~~ → 0 | 1024px | 0 |
  | 392x844 | 211px | ~~823px~~ → 0 | ~~1320px~~ → 844 | ~~476px~~ → **0** |
  | 320x844 | 211px | ~~842px~~ → 0 | ~~1357px~~ → 844 | ~~513px~~ → **0** |

  **The pitch was FOUR TIMES the height of the add-ons it sat under on a
  phone**, and at 320 it was 842px against an 844px screen — a full phone
  screen of membership under three rows of add-ons. Step 2 is now exactly one
  screen at both phone widths, with nothing cut.
  **~~Rename the $200 plan.~~ DECLINED 2026-09-20, and this is the more
  important half.** **A plan's name is DATA, not copy** — a row in the `plans`
  table, typed by the detailer about their own business, with live
  subscriptions pointing at it. The platform renaming it means editing
  somebody's business for them, and in production it rewrites live rows.
  **It is also not wrong.** The data says every 1 month, 2 visits per month,
  $200 a month; "Monthly two-visit" describes that exactly. **The auditor read
  the chip "2 visits each time" as a per-VISIT claim when it states the plan's
  frequency** — two visits in each period, which is what the cadence chip
  beside it already says. Nothing was renamed and the seeded demo copy was left
  alone as well; re-seeding is DP Cowork's lane.
  **HOW IT WAS CHECKED:** walked the real booking flow at 1440x900, 768x1024,
  392x844 and 320x844. The pitch measures 0 on the add-ons step at every width
  and appears intact on step 6 — 472 / 462 / 823 / 842px, four plans, the same
  heading — and pressing a row there still attaches the plan: the row flips to
  "On this plan", the address bar carries the plan id, and the price bar reads
  "Monthly two-visit applied". No string changed, so no Spanish key moved.
  Console clean at all four widths. Gates green: `booking-core` 290,
  `composition` 97, `landing-pricing` 109, `route-contract` 34, 0 failed.
  **AND THE SWEEP'S EXEMPTION STILL WORKS WITHOUT A CODE CHANGE**, because it
  was keyed on the `.bk-planpitch` element rather than on a step's name. Its
  PROSE said "the add-ons step" and would have become a lie; that wording was
  corrected in the same edit.
  **Still open and not this item's:** whether "Member rate" says what joining
  costs and whether it repeats.
  *A1 P1-07, A2 2.7*

- [x] **2.11 — The last step says nothing about what happens next.**
  **Not a contradiction with A1 §12, which is about a different step.** A1
  found the reassurance sentence on the *date/time* step and asked to keep it;
  A2 wants one above the *final* button. Checked in source: `BookingPage.jsx`
  around line 806 renders "Request this time" with no adjacent sentence.
  **Fix:** one line above the button, built from the detailer's own rules:
  ~~when they reply,~~ and the change/cancel window.
  **"WHEN THEY REPLY" IS DECLINED — ANDREW, 2026-09-20. NO SUCH SETTING
  EXISTS.** The only hour in the product is `request_nudge_hours`, which
  CHASES THE DETAILER about a request they have not answered; it is not a
  promise made to the customer and nothing else in the schema is. Writing that
  sentence would have meant inventing a promise the software cannot keep,
  which is a worse defect than the silence it replaced. His words: *"writing
  that sentence would have been inventing a promise the software cannot keep,
  which is a worse defect than the silence it replaced."* **If a reply-time
  promise is ever wanted it is a NEW SETTING on the Booking rules screen and
  its own item, not a sentence this page can compose.**
  **Done when:** the line shows and reflects that business's actual settings.
  **DONE 2026-09-20.** One paragraph at the foot of the review step, above the
  price bar, branching on the SAME condition the button branches on
  (`booking_mode === "request" || attachedPlan`) so it can never disagree with
  the words on the button, and carrying `cancellation_window_hours` from the
  public profile — which `normalizeSettings` did not publish until now.
  **"When they reply" is NOT in the sentence and that is deliberate: no such
  setting exists.** `request_nudge_hours` is when the DETAILER gets chased, not
  a promise to the customer, so the line says the time is held and that an
  email follows acceptance, with no hour attached to it.
  **Verified by walking both modes to step 7 in a real browser**, at 1440x900,
  768x1024, 392x844 and 320x844, console read at each and clean:
  `demo-detail` (request, 24h) reads *"Your time is held from the moment you
  press this. You can change or cancel it yourself up to 24h before the
  appointment."* over **Request this time**; `demo-riverside` (reserve, 48h)
  reads *"Your time is booked from the moment you press this. Nobody has to
  accept it. You can change or cancel it yourself up to 48h before the
  appointment."* over **Confirm booking**. **Two different numbers off two
  different businesses is the proof it is not a literal.**
  **Broken on purpose three times.** Forcing the window to null dropped the
  change/cancel clause entirely rather than printing a number — and the FIRST
  run of that sabotage read "clean" only because Vite's hot reload had bounced
  the page back to step 1, so it was re-walked. Deleting the Spanish key and
  dropping `{hours}` from the translation were both named by
  `tests/spanish.test.mjs` § 1b and § 2b.
  **Parked, not this item's, in `FOUND.md`:** at 320 the last element on this
  step sits behind the price bar — 13px for this sentence, and 14px for the
  promo row that was last before it, so it predates the change.
  *A2 2.9*

- [ ] **2.12 — Spanish is half-translated.**
  "Weekend rate", "Member rate · 10% off", "Member rate aplicado" and "That
  code isn't one of ours" stay English. Service and add-on names stay English.
  The language choice also leaked across to a different booking link.
  **Fix:** translate every system-written line; the detailer's own typed
  service names stay as typed, which is already the rule. Scope the language
  choice per business.
  **Done when:** a full Spanish pass through all seven steps shows no
  system-written English. `node scripts/i18n-survey.mjs` is the instrument, and
  per `docs/gotchas.md` it has returned a false pass before — break it first.
  **RE-CHECKED 2026-09-20 — two of the four opening claims no longer hold, and
  one never quite did.** "That code isn't one of ours" is already wrapped in
  `t()` with a Spanish key in the booking catalogue — fixed by an earlier,
  unrelated pass, never struck here. "Member rate aplicado" traced to
  `quote.plan_name`, which is a detailer's own typed monthly-plan name; the
  rule two lines up already says typed names stay as typed, so a detailer who
  named their plan "Member rate" in English is not a bug. "Weekend rate" and
  "Member rate · 10% off" as literal strings do not exist anywhere in the
  current codebase — not found, not fixed, not confirmed gone, just not
  where this search looked. **Still open and not attempted:** the language
  leak across booking links (`dp.lang` in `lib/i18n.js` is one key for the
  whole browser, not scoped per business) is real and needs its own scoped
  fix.
  **THREE CONCRETE INSTANCES, FOUND BY LOOKING AT SPANISH SCREENS RATHER THAN
  BY THE SURVEY — 2026-09-19. Logged here, not fixed: both sweep turns were
  instrument-only.**
  1. [x] ~~**The setup banner on Today** reads "Your page isn't fully set up" and
     "and 3 more" in English beside a Spanish "Ocultar". `lib/setup.js` holds
     its copy as plain object values.~~ **FIXED 2026-09-20.** Both sentences
     and the setup wizard's own seven step-question headings were already
     wrapped in `t()` — only the Spanish keys were missing (eight added), plus
     one raw `s.text` at a fallback render site that needed the `t()` wrap
     itself. `app/src/lib/strings/appEs.js`, `app/src/screens/Today.jsx`.
  2. [x] ~~**The text-message sheet on a job record** keeps four template names
     in English on an otherwise Spanish sheet: "Running late", "Confirm
     tomorrow", "Job finished", "Ask about access" — while "On my way" beside
     them IS translated.~~ **FIXED 2026-09-20, and the "On my way" half of that
     sentence was wrong.** Read the demo tenant's actual `message_templates`
     rows: all five, "On my way" included, sit in English in the database
     right now. The real cause isn't a missing `t()` call — `label: t(d.label)`
     already runs at seed time and Spanish keys for all five have existed
     since 2026-09-12 — it's that the label is translated ONCE, at seeding,
     and never again; the demo business was seeded before those keys existed
     and nothing re-translates a stored value. Fixed at the root: the display
     label is now derived live from the stable template key on every render,
     never trusted from the stored column — fixes every already-seeded
     business, including the demo tenant, with **no database write**.
     `app/src/screens/more/MessageTemplates.jsx`.
     **`sweep-widths.mjs`'s `KNOWN_ENGLISH` entry keyed `"job record · send a
     text"` is now wrong and needs removing** — passed to the other session
     rather than edited here, since `scripts/` is their lane.
     **HOW THE SPANISH HALF WAS CHECKED, SAID PLAINLY RATHER THAN LEFT
     IMPLICIT:** Andrew confirmed both fixes render correctly in **English**
     on the real dashboard, himself, in a browser. He could not confirm the
     **Spanish** half — this build has no language override on the dashboard,
     and seeing it would mean changing the business's own stored language,
     which is a database write he had forbidden for this pass. **The Spanish
     verification rests on the session's own reading of the rendered page,
     not on a second pair of eyes** — read live in both languages at
     1440/768/392/320, console clean, quoted verbatim in commit `50b9948`.
     Worth knowing exactly which half only one person has actually seen.
  3. **The marketing pages have no Spanish at all** — `LandingPage.jsx`,
     `PricingPage.jsx` and `LegalPage.jsx` import no translation scope and
     contain zero `t("…")` calls. Not a missing string: a missing scope.
     **SPLIT IN TWO, 2026-09-20, because the two halves are not the same kind
     of open.** `scripts/sweep-widths.mjs`'s own comment already answers which:
     *"`legal.js` must never be machine-translated by anybody: it is a
     contract carrying the AB 2863 disclosures, and a translation nobody
     qualified has read is a liability rather than a feature. The marketing
     copy around it is his decision."*
     - **`terms` / `privacy` (`LegalPage.jsx` + `legal.js`): not open work, a
       closed ruling that already exists.** Never machine-translate. This half
       is done by staying undone — striking it here so nobody re-opens it as
       a gap.
     - **`landing` / `pricing` (`LandingPage.jsx` + `PricingPage.jsx`):
       genuinely undecided, and explicitly Andrew's call, not a session's.**
       Sized rather than started, using the survey's own candidate heuristic
       run directly against both files (`scripts/` untouched — copied into a
       scratch script): **278 candidates in `LandingPage.jsx`, 113 in
       `PricingPage.jsx`, 391 total.** Real count after de-duplication and a
       human pass would differ; the scale is what matters — an afternoon or
       more, not a quick pass. **Not started. Waits on his decision, in
       `FOR-ANDREW.md`.**
  4. **New booking's vehicle-condition scale (`VEHICLE_CONDITIONS` in
     `book/core.js`) reads Claro, Moderate, Heavy, Extreme on a Spanish
     dashboard** — one translated, three not. Found live by Andrew, not by
     the survey: opened New booking with `dp.lang.app=es`. **FIXED
     2026-09-20, three of four:** the catalogue confirmed it before
     touching anything — `Small`/`Medium`/`Large`/`Condition` all had keys,
     `Moderate`/`Heavy`/`Extreme` had none. Added, matching the SAME
     four-word scale's own already-shipped translation in the booking
     page's own catalogue (`lib/strings/es.js`: `"Moderate": "Moderada"`,
     `"Heavy": "Fuerte"`, `"Extreme": "Extrema"`), so a detailer typing a
     job by hand and a customer booking one read the identical word.
     `app/src/lib/strings/appEs.js`.
     **`"Light": "Claro"` — FIXED 2026-09-20, the fourth word, once the real
     question under it was answered rather than guessed at.** It had a key
     and rendered — but that key belonged to an unrelated "Dark, or light?"
     THEME toggle a few hundred lines away in the same flat catalogue
     (`lib/siteIntake.js`'s `EITHER` array, the tenant-site brief's own
     either/or questions), and "Claro" is the brightness sense, not a
     dirtiness one. `lib/strings/es.js`'s own translation of the same
     four-word scale already used `"Light": "Ligera"` instead — real
     evidence the dashboard's word was wrong, but not proof of the fix,
     since `t()` has exactly one argument (`localeStore.js:243`,
     `function t(english, vars)`) and no context or namespace to disambiguate
     with — checked, not assumed; the file's own header states it as
     principle #1 rather than an oversight.
     **What killed the ambiguity was checking what is actually STORED.**
     `screens/SiteIntake.jsx:1120-1130` — `[left, right].map(([k, label]) =>
     …)`: `k` is the slug (`"dark"`/`"light"`), carried into component state,
     `aria-pressed`, and `set(id, k)`, which is what `SiteIntake.jsx:946`
     writes into `site_intake.answers` (`supabase/migrations/
     20260910002000_site_intake.sql`: plain `jsonb`, no enum, no constraint
     naming a label). `label` reaches exactly one place, `t(label)` inside a
     `<span>` — display, never comparison. Downstream,
     `SiteIntake.jsx:774,781` — `pick("H3") === "light"` — compares the same
     slug again, and `theme.js`'s `accentTriple` never sees `H3` or a label
     at all; it takes an already-resolved ground string as a parameter. No
     edge function reads `site_intake` or `H3`. **The label is display-only
     everywhere it was checked, so the rename touches no stored answer** —
     unlike `"colour"`, this repo's own settings key that IS the stored
     value and may never be renamed (this file, Conventions section). Two
     different shapes, told apart before acting rather than after.
     **The fix: the theme picker's own words moved, the condition word did
     not.** `lib/siteIntake.js`: `"Light"` → `"Light background"`, `"Dark"` →
     `"Dark background"` (both halves of the pair, so it does not read
     asymmetric — only one side collided, but a two-word answer beside a
     one-word answer reads like an accident). `appEs.js`: the freed `"Light"`
     key now reads `"Ligera"`, sitting with the rest of the scale;
     `"Dark background"`/`"Light background"` get their own two fresh
     entries. Wording checked against `docs/screen-rules.md` and
     `docs/TASTE-NOTES.md` before landing — neither contradicts it, and
     TASTE-NOTES § 4c has Andrew using "background" as his own word for
     exactly this concept, unprompted, months before this control existed.
     **A SECOND, UNGUARDED COPY OF THE SAME LABEL FOUND ALONG THE WAY, AND
     THIS IS WORTH MORE THAN THE TWO WORDS THAT CHANGED.**
     `scripts/site-brief.mjs:134` carries its own literal copy of the same
     `EITHER` row, to print into the brief a human reads before building a
     tenant's site. It compares against the slug, same as everywhere else,
     so it was never wrong — but it DISPLAYS the label, and nothing anywhere
     keeps its copy in step with `lib/siteIntake.js`'s. Renaming only the
     source file would have left the generated brief showing the old word
     with the dashboard already showing the new one, silently, with no error
     and no test positioned to catch it — a customer would have had to
     notice a site brief that didn't match what their own screen said.
     **Fixed in the same commit as the rename, not as a separate pass**,
     since splitting one rename across two sessions is exactly how two
     copies of a string drift apart in the first place — `scripts/` lent for
     this one commit. A comment now sits on that array naming what it is and
     why a stale copy would fail silently rather than loudly.
     **THE SWEEP FOR SIBLINGS, asked for in the same turn rather than fixing
     only what was seen.** A one-off script (scratch, not committed) found
     every array literal in `app/src` shaped like an option set — `[key,
     "Label"]` tuples and `{key, label}` objects — in every file that
     imports either i18n helper, and checked each label against the
     matching catalogue: **83 files checked, 58 skipped because they import
     neither helper.** Confirmed by hand against one skip: `admin/
     AdminPage.jsx`'s own tab list matched the tuple shape but the file
     imports no i18n at all — a genuine false positive, caught before it was
     reported, not after.
     Two more found, both real, neither the same size as this one:
     - **`screens/more/Preferences.jsx`'s "which map app" control**:
       `Apple`/`Google` have keys, `Waze` does not. **Cosmetically
       harmless** — Waze is a brand name and reads the same in both
       languages either way — but it is the identical missing-key shape and
       is recorded rather than silently passed over because it happens to
       look safe today.
     - **`book/core.js`'s `paymentMethods()`**: `Venmo`/`Cash App`/`Zelle`/
       `PayPal`/`Cash` have keys, the sixth — `"Also"`, for `pay_other` —
       does not. **Not currently a live defect**: nothing in `app/src` calls
       `paymentMethods()` at all right now, so it cannot render anywhere in
       this app today. Left for whoever wires it up, or for the
       tenant-site-kit outside this sweep's reach.
     **AND ONE BIGGER GAP THE SAME SWEEP FOUND THAT IS NOT THE SAME SHAPE,
     SAID SEPARATELY SO IT IS NOT MISCOUNTED AS A THIRD SIBLING.**
     `book/core.js`'s `VEHICLE_BODY_TYPES` — the fourteen body types
     (`Coupe (2-door)`, `Sedan`, `Hatchback`, … `Oversized — lifted, dually,
     limo`) a detailer maps onto Small/Medium/Large in `screens/more/
     Catalog.jsx` — is **zero of fourteen** translated, labels and their
     `examples` subtext both, confirmed live (`t(b.label)`, `t(b.examples)`
     at `Catalog.jsx:708-709`). That is a full gap, not a partial one —
     every option reads the same wrong way rather than some looking right
     and some not — so it does not hide the way this item's own subject
     does, but it is real, it is `app/src`, and it is fourteen strings in
     one place rather than scattered. Recorded here rather than fixed,
     since it is its own piece of work, not a one-line sibling.
     **PICKED UP 2026-09-20. Checked against `es.js` first, the way
     `"Light"` was, found a real disagreement, stopped, brought it to
     Andrew rather than picking a side, and he ruled — FIXED the same
     day.** `VEHICLE_BODY_TYPES` has no customer-facing call site at all
     (the only consumer anywhere in `app/src` is `screens/more/Catalog.jsx`,
     the dashboard's own size-tier editor), so unlike the condition scale
     there was no live booking-page rendering of these fourteen words to
     match directly. But three of `DEFAULT_VEHICLE_SIZES`' own `examples`
     strings (`core.js:201-206`) already carry overlapping vocabulary in
     both catalogues, and two of those didn't agree with each other:
     `"Small SUV"` was `"SUV pequeña"` in `es.js` and `"SUV chica"` in
     `appEs.js`; `"Truck"` was `"Camioneta"` in `es.js` and `"Troca"` in
     `appEs.js`.
     **THE RULING, IN THREE PARTS, ANDREW'S OWN WORDS ON THE REASONING
     SINCE IT IS THE PART A NUMBER CANNOT CARRY:**
     1. *"Where `es.js` already has a word for the concept, the fourteen
        follow `es.js`… a detailer and a customer reading different words
        for the same vehicle is the exact disease we cured this hour with
        `Ligera`, and `es.js` is the half a paying customer reads."*
     2. *"The six with no precedent [use] neutral standard Spanish rather
        than anything regional… we have no evidence about the market these
        detailers are in, and choosing regional vocabulary on no evidence
        is inventing a fact about Andrew's customers."*
     3. *"Do not quietly fix [`\"SUV chica\"`/`\"Troca\"`] to match. Write the
        disagreement into ROADMAP.md… and put the actual question in
        `FOR-ANDREW.md`… That is a question about who his detailers are and
        only he can answer it."*
     **WHAT LANDED, `app/src/lib/strings/appEs.js`, split the way the
     ruling asked so the evidence is tellable from the judgement without
     opening anything else:**
     - **Matched — a word or the whole key already agreed in both
       catalogues:** Coupé, Sedán, Hatchback (unchanged loanword),
       "crossover" inside `Small SUV / crossover` (unchanged), "SUV grande"
       inside `Large SUV (3 rows)`.
     - **From `es.js`, by ruling, not this catalogue's own word two lines
       up:** `"SUV pequeña"` inside `Small SUV / crossover`; `"Camioneta"`
       for `Wagon` and both `Pickup` keys.
     - **New, neutral standard Spanish, no regional dialect guessed at:**
       `Convertible`, `Minivan` (kept as shipped, near-universal loanwords);
       `"cabina sencilla"` / `"cabina doble"` for the two pickup cabs
       (standard automotive terms, not slang); `"mediana"` for mid-size,
       matching the `pequeña`/`grande` pattern the two real-precedent SUV
       sizes already set; `"Deportivo o exótico"`; `"Sobredimensionado —
       elevado, doble rodada, limusina"` (`"doble rodada"` is the standard
       term for a dually, not a regionalism).
     **`"SUV chica"` AND `"Troca"` LEFT EXACTLY AS THEY WERE, ON PURPOSE,
     NOT A FIX SKIPPED.** `appEs.js`'s own `"Small SUV, crossover, wagon"`
     and `"Truck, large SUV, van"` entries (the `DEFAULT_VEHICLE_SIZES`
     examples, still live today) now deliberately disagree with the fresh
     `VEHICLE_BODY_TYPES` entries beside them — a comment sits on both
     saying so, so a reader six weeks out sees a decision, not an
     inconsistency nobody noticed. **The actual question — bring the two
     old strings into line, or move the new set the other way — is
     `FOR-ANDREW.md`'s to answer, one line, under "Waiting on you."**
     **A NAMED LEAD, NOT CHASED — the same two-copies-no-guard shape as
     `scripts/site-brief.mjs` this hour, one level down.** Each of the
     fourteen `VEHICLE_BODY_TYPES` entries also carries an `examples`
     sentence (`core.js:654-667`, e.g. `"e.g. Honda Civic coupe, Toyota
     Camry coupe"`) — car model names stay as typed, but words like
     "coupe," "regular cab," "crew cab," "dually trucks" and "limos" inside
     those sentences are the same vocabulary question this pass just
     settled, one level down, in prose rather than in a bare label. Not
     started. Whoever picks it up should start from the word choices
     above rather than re-deriving them.
     **THE SWEEP'S OWN LIMIT, SAID PLAINLY, THE WAY THIS REPO ASKS FOR IT.**
     It can only find a MISSING key. The bug in this item's own headline —
     `"Light"` colliding with the theme toggle — is a key that EXISTS and
     points at the wrong meaning, which no automated sweep here can catch:
     nothing about "the key is present" says whether it is present for the
     right reason. That has to be read, the way this one was.
     **A second, smaller instrument fault, same family:** the same sweep
     counted `"literal"` as a reused, cross-file string. Both hits were a
     code COMMENT containing the text `t("literal")` as documentation
     (`Catalog.jsx`, `Promos.jsx`), not a real call — the regex looked for
     the shape of a call and found it somewhere that meant nothing. Caught
     reading the output before it was reported, not after, but it belongs in
     this file's own running list of ways a measurement lies rather than
     staying a private correction nobody else benefits from.
     **A SECOND CROSS-FILE-STRING PASS, ON `t()`'S CALL SITES RATHER THAN
     THE CATALOGUE, FOUND ONE MORE OF THE SAME SHAPE.** `"Open"` is a field
     label (opening time, `Hours.jsx:157`, `DaySheet.jsx:423` — consistent,
     correct) **and** the button that marks a day open (`Hours.jsx:220`)
     **and** the button that opens the booking link in a new tab
     (`BookingLink.jsx:268`) — three senses sharing one entry,
     `"Open": "Abre"`, a form that fits the label loosely and is the wrong
     register for either button in a catalogue whose own convention is the
     infinitive (`Guardar`, `Cancelar`, `Cerrar`). **FIXED 2026-09-20, in
     its own commit, not the theme one — different finding, independently
     revertible.** The two button call sites moved to distinct English:
     `Hours.jsx:220` → `t("Reopen")` (new entry, `"Reopen": "Reabrir"`, no
     prior collision); `BookingLink.jsx:268` → `t("Open it")`, which needed
     **no new entry at all** — `"Open it": "Ábrelo"` already existed, used
     by the near-identical pattern at `SiteIntake.jsx:529` (an `<a
     target="_blank">` plus an `ExternalLink` icon, opening an example site)
     — the correct answer was already in the catalogue, just not reused
     here. The field-label sense (`"Open": "Abre"`) is untouched.
     `"Close"` has the same three-way shape and was checked the same way —
     label (`Hours.jsx:160`, `DaySheet.jsx:426`), a "mark day closed" button
     (`Hours.jsx:213`), and eight "close this dialog" buttons across
     `RecordHost.jsx`, `SettingsHost.jsx`, `Sheet.jsx`, `Plans.jsx`,
     `SiteIntake.jsx` (×2) and `JobPhotos.jsx` — but its shared entry,
     `"Close": "Cerrar"`, is already the infinitive, which reads acceptably
     for both a button and a label. **Left alone on purpose, flagged rather
     than changed** — a maybe carried forward costs nothing; a confident
     change nobody needed is the thing this pass was trying not to do.

  **MEASURED 2026-09-19, while sweeping the dashboard in Spanish:** the survey
  reports **76 candidate strings across 11 files**, the worst being
  `screens/SiteIntake.jsx` (21), `lib/moneyAdvanced.js` (14) and
  `lib/weather.js` (6). It calls itself a heuristic "for ordering the work, not
  for signing it off", so that is a queue and not a verdict. **Recorded here
  rather than as a new item, because this item already owns it.**
  **RE-MEASURED 2026-09-20, after the setup-banner fix: 74 candidates across 10
  files.** `lib/setup.js` dropped off the list entirely; the count otherwise
  stands. Still `app/src` work, still not this pass's to finish in full.
  *A1 P2-10, A2 2.8*

- [x] **2.13 — DONE 2026-09-20. Each category now says "optional, choose one", which is what the rule actually is.**
  ~~**Fix:** "Optional — choose one" per category, or state the real rule once
  above them.~~ Took the per-category half of A1's own suggestion; the
  state-it-above half was left alone because the intro line's absence here is a
  MEASURED height decision, not an oversight, and the footer already says
  "Choose a service to start" when nothing is picked.
  **THE WORDING WAS NOT JUST VAGUE, IT WAS FALSE.** A category's `rule` is
  `max_select` — a CAP. Nothing on this step requires a pick from any one
  category; `blockers()` asks only for at least one service in total. With two
  categories on screen, "choose one" under each told a customer they had to buy
  an interior service as well as an exterior one, which is the more expensive
  of the two readings.
  **HOW IT WAS CHECKED:** the demo tenant's own two-category menu at 1440x900,
  768x1024, 392x844 and 320x844. At every width both headings read
  "EXTERIOR · optional, choose one" and "INTERIOR · optional, choose one" on
  one line with no wrap and no overflow at 320, and picking ONE exterior
  service and pressing Continue moves to step 2 of 7 — so the page's claim and
  the page's behavior now agree. Spanish moved in the same edit and reads
  "opcional, elige uno"; the old `choose one` key was replaced rather than left
  behind, so `tests/spanish` § 1c does not gain a stale entry. Console clean at
  all four widths. Gates green: `booking-core` 290, `composition` 97,
  `landing-pricing` 109, `route-contract` 34, 0 failed.
  *A1 P2-07*

- [x] **2.14 — The promo error hides behind the sticky footer.**
  **Fix:** scroll it into view, or add bottom space.
  **Done when:** visible on a 375-wide phone without scrolling.
  *A2 2.10*
  **DOES NOT REPRODUCE ON THE CURRENT BUILD — measured 2026-09-20, AND 2.11
  IS WHY.** The error renders inside the promo block, which used to be the
  last thing on the review step; 2.11 put a sentence after it, so 83px of
  page now sits between the error and the bar. Measured at 320 with the
  worst bar the demo can produce (112px, plan attached), scrolled to the
  bottom first, which is where a phone actually is when it presses Apply:
  the error lands **56px clear of the bar and needs no scrolling**. At 392 on
  `demo-riverside` it is 50px clear.
  **TICKED 2026-09-20 BY ANDREW, WHO REPRODUCED IT HIMSELF RATHER THAN READING
  THE TABLE ABOVE.** His walk: a real booking to the last step with the
  Bi-weekly plan attached so the bar's label wraps to two lines, window shrunk
  to 320, junk promo code, Apply. *"That code isn't one of ours came back
  fully visible, well clear of the bar, and the sentence above it was clear
  too."* Exercised the way a customer hits it, at the width and the bar height
  where it would fail if it could.

- [ ] **2.15 — The sticky footer can cover the last choice.**
  **Fix:** bottom padding and a shorter footer; test with browser chrome and
  the on-screen keyboard up.
  *A1 P2-08*
  **THE ONE REAL FAULT OF THE THREE, AND IT IS FIXED — 2026-09-20.** 2.14,
  2.15 and the `FOUND.md` entry about the review step were checked for a
  shared cause before anything was touched. They have one: **`.bk-wrap`
  reserved a literal `104px + safe-b` for a bar whose height is content-driven
  and whose widest line is TEXT THE DETAILER TYPED.** Measured at 320 on
  `demo-detail`: 73px on step 1, 84px, 98px once the Back button narrows the
  eyebrow's column, and **112px on the review step**, where the wider
  "Request this time" label wraps "{plan} applied · 1 hr" onto four lines.
  112 against a 104px reserve is 8px of the last line under the bar at full
  scroll, unreachable.
  **Fixed once, in the shared place, and it DELETES the number rather than
  automating it:** `.bk` is a column, `.bk-wrap` grows into it, and `.bk-bar`
  is `position: sticky` instead of `fixed`, so the bar occupies its own
  height whatever that height is. A page with no bar — confirmation, manage,
  plans — keeps the old literal exactly, via `:has(> .bk-bar)`.
  **A ResizeObserver was written first and thrown away**: it would have kept
  the same fragile "the reserve must equal the height" relationship, and the
  browser here never advances the rendering loop, so it could not be proven.
  A fix that cannot be verified is not a fix.
  **BROKEN ON PURPOSE, as asked.** The eyebrow was replaced with a plan name
  no detailer would type — "Platinum bi-weekly maintenance and interior
  protection membership" — taking the bar to **198px, nearly double anything
  real**. With the fix the last line still clears by 26px. With the old rule
  re-created on the same page in the same second (`position: fixed` plus a
  104px reserve) the same line is **94px behind the bar**. The check catches
  the fault it is supposed to catch.
  **Verified at 1440x900, 768x1024, 392x844 and 320x844**, console clean on a
  fresh tab (two React Router v7 future-flag warnings, present on every page
  of this app and nothing else), all seven steps at 320 with the plan
  attached, and in `?lite=1`. At every width the bar stays on the floor of the
  screen, still pins while there is page to scroll, and nothing visible sits
  under it.
  **STILL NOT MEASURED, and the audit asked for it:** the on-screen keyboard.
  A phone keyboard shrinks the visual viewport, not the layout viewport, and
  no keyboard can be raised in this browser. It is the one half of this item
  nobody has proven either way.
  **LEFT OPEN ON PURPOSE — Andrew, 2026-09-20, accepting the recommendation.**
  *"A box ticked on an untestable claim is the same lie as a check that prints
  clean having tested nothing."*
  **WHAT WOULD CLOSE IT, so nobody has to work this out again:** one run on a
  real phone — not an emulated viewport — with the on-screen keyboard raised
  on the two steps that have a text box above the fold, step 4 (the address)
  and step 6 (name, phone, email). A keyboard shrinks the VISUAL viewport and
  leaves the LAYOUT viewport alone, which is why no window size reproduces it
  and why `resize_window` cannot stand in. The question to answer is whether
  the pinned bar rides up on the keyboard and covers the field being typed
  into. If it does, `window.visualViewport` is the only thing that can see it
  and the fix belongs with the bar, not with the step. **Everything else in
  this item is done and measured above.**

- [x] **DONE 2026-09-20 — the booking column had been rendering at under
  half its own declared width, on every step; the calendar's day cells are
  52 by 52 now, square, at desktop.** Found by the other session's
  booking-steps triage, 2026-09-20, root-caused on a fresh load rather than
  a resize. **The before number, so the size of this is visible without
  re-measuring anything: `.bk-wrap` rendered at 316.9px against its own
  declared `max-width` of 632px.**
  **THE CAUSE.** `.bk-wrap` (`app/src/book/booking.css`) is a flex child of
  `.bk`, which is `display: flex; flex-direction: column`. `margin: 0 auto`
  on a flex item puts AUTO margins on its CROSS axis (width, in a
  column-direction parent) — and per the flex spec, cross-axis auto margins
  absorb the leftover space and override `align-items: stretch` for that
  one item. With no `width` declared, `.bk-wrap` never stretched toward the
  `max-width` it was supposed to be centred WITHIN; it shrank to its
  content's width instead, and the margin only centred that narrow box.
  Confirmed structurally before fixing anything: `.bk-header` and
  `.bk-center`, the other two direct children of `.bk`, do not carry
  `margin: 0 auto` on themselves and do not have this fault — the max-width
  pairing that collapses lives one level deeper on `.bk-header .inner`, a
  plain block rather than a flex item, where the ordinary CSS centring rule
  applies without a flex parent's cross-axis override.
  **THE CALENDAR'S CELLS ARE DOWNSTREAM, NOT A SECOND FAULT — checked, not
  assumed.** `.bk-cal { grid-template-columns: repeat(7, 1fr) }`: proportional
  columns, no fixed pixel width anywhere in the cell's own rule. A cell's
  size is entirely a function of `.bk-wrap`'s width, which is why the file's
  own comment already expects 47px on a 360px phone column and the design
  absolute is 44px, while the measured width gave 36.4px — one fault seen
  twice, which is why the fix is the wrap, not the cell.
  **THE FIX, AND IT IS A FIX RATHER THAN A REDESIGN, SAID IN THOSE WORDS ON
  PURPOSE.** `width: 100%;` added to `.bk-wrap`, one line, restoring the
  width the stylesheet has always declared and never reached — the
  `max-width` and the `margin: 0 auto` were always correct; nothing here
  was designed narrow. **But it is not a one-screen change and should not be
  waved through as one:** `.bk-wrap` is shared by all five booking-side
  pages (`BookingPage.jsx` — all seven steps, `BookingConfirmed.jsx`,
  `ManageBookingPage.jsx`, `PlanMemberPage.jsx`, `PlansPage.jsx`), so this
  visibly widens every one of them; step 1 alone moves from 469px to 632px.
  That is why this is held for a press at four widths rather than accepted
  on the diff.
  **SPANISH, CHECKED BEFORE CALLING THIS DONE, EVEN THOUGH THE CHANGE IS
  CSS.** Swept `booking.css` for anything sized to the narrow, buggy
  measurement — no literal `316`/`317` anywhere, and every `white-space:
  nowrap` on the five steps sits on content that either shrinks the risk
  when the column widens (a mono price, a short pill, a badge) or already
  wraps its container (`.bk-plan-chips { flex-wrap: wrap }`) rather than
  overflowing. **This is a static check, not a rendered one** — it rules out
  a value hard-coded to the broken width, it does not prove Spanish copy
  looks right at 632px, which the press below still has to do.
  **ONE THING NOT TO DO, AND IT IS NAMED HERE SO NOBODY REACHES FOR IT ON A
  QUIET NIGHT — the other session's find, kept in its own words because the
  reason is the useful part.** Do not fix the day cells with the `::after`
  negative-inset trick this repo uses elsewhere for a small, isolated mark.
  Calendar cells sit adjacent with only a 5px gap; a negative inset large
  enough to reach a 44px target would extend roughly 4px into each
  neighbour, so the 21st and 22nd of the month would steal each other's
  presses and `elementFromPoint` would return the wrong date along the edge
  of every cell. On a date picker that trades a small target for a WRONG
  one, and the wrong answer here is a booking made on the wrong day. The
  grid's width is the fix; the cell was never the fault.
  **FOUR NUMBERS DECIDE WHETHER THIS WORKED, NOT WHAT THE SCREEN LOOKS
  LIKE, AND ALL FOUR ARE THE OTHER SESSION'S TO RE-MEASURE:** `.bk-wrap` at
  632px on a fresh load (not a resize); the calendar's day cells clearing
  44px; the booking-steps gate's roughly seventy tap-target findings going
  to zero; and `.bk-cal .cell`'s own `max-height: 52px` rule — already
  written, documented as engaging once a column is wide enough to want a
  cell bigger than a thumb needs — finally engaging at desktop, for the
  first time, because desktop has never actually reached that width before.
  A fix that moves the number but leaves any of these four where they were
  is not done, whatever the screen looks like.
  **Built code-only, held for the press — the other session has the browser
  tonight and is the only one who can give this a real before-and-after.**
  **ACCEPTED 2026-09-20. Andrew pressed all four numbers, not just the
  screen.** `.bk-wrap` measures **632 exactly** on a fresh load, no resize,
  against the 316.9 it was. Walked five steps as a customer — service,
  add-ons, vehicle, place, time — wider column throughout, nothing
  overflowing, nothing stranded, no line stretched into looking abandoned.
  **THE 52 IS THE BETTER HALF OF THE STORY, SO IT LEADS THIS ENTRY RATHER
  THAN THE 632.** Measured independently, in a tab neither session drove:
  `.bk-cal` at 600px, day cells **52 by 52, square.** This item's own
  comment named the file's 47px phone-width expectation; what actually
  happened at desktop is a DIFFERENT rule, `.bk-cal .cell`'s `max-height:
  52px`, written for a 600px grid and dead the entire time the grid was
  rendering at ~285px content width. **That rule was never wrong. The width
  bug kept it unreachable.** Fixing the wrap didn't just widen a grid — it
  let a second, already-correct rule start being true for the first time.
  **THE LESSON, WORTH KEEPING FOR ITS OWN SAKE:** a rule that appears to do
  nothing is not evidence the rule is dead — it can be evidence something
  upstream is lying to it. The next person who finds a CSS rule with no
  visible effect should ask what would have to be true for it to fire
  before deleting it as cruft.
  **SPANISH HELD AT THE NEW WIDTH — the thing a CSS diff alone could never
  have shown, checked live rather than assumed from the static sweep
  above.** *"Paso 5 de 7," "septiembre de 2026,"* the weekday letters *D L
  M M J V S* across the calendar header, *"Elige un día para continuar,"*
  *"Total estimado."* Nothing that used to fit one line reflowed to two.
  **TWO HONEST GAPS, KEPT IN THEIR OWN WORDS RATHER THAN ROUNDED UP TO A
  PASS.** The other session's matrix covers steps one through five at four
  widths; it does not cover steps six and seven at any width — for those
  two the correct sentence is that they have not been compared, not that
  they look fine. And at 768px the calendar block itself was not
  captured — recorded as not-captured, not as a result. **W16's twelve
  steps that do not fit stay untriaged and stay named**, unchanged by
  anything in this item.
  **THE SECOND-INSTANCE SWEEP OF `booking.css`, WRITTEN DOWN SO THE NEXT
  READER DOES NOT HAVE TO REPEAT IT.** Checked every `max-width` in the
  file against its actual parent's `display`, not assumed from the
  selector name: `.bk-wrap` was the only max-width-plus-auto-margin
  element that is itself a flex child with no `width` to let stretch
  reach it. `.bk-header .inner` and `.bk-bar .inner` carry the identical
  `max-width` + `margin: 0 auto` pairing, but their parents (`.bk-header`,
  `.bk-bar`) are plain blocks, not flex containers, so the ordinary CSS
  centring rule applies correctly there — no cross-axis override, nothing
  to collapse. `.bk-lang`'s `margin-left: auto` is a different idiom
  entirely, push-to-edge-within-a-row rather than centre-a-column. **No
  second instance in this file. Nothing else to chase.**

---

## Wave 3 — Communication proof

"Sent" is not "delivered". Today the product proves only that a send was
requested.

- [ ] **3.1 — The owner cannot tell whether emails arrived.**
  The dashboard says "Reminder sent to customer"; the back office says Resend
  delivery/bounce tracking is "confirmed possible" and not wired.
  **Fix:** store and display Resend events for `sent`, `delivered`,
  `delivery_delayed`, `bounced`, `failed`, `suppressed` and `complained`, each
  linked to message, booking, detailer and recipient. Alert on permanent
  failure. Resend documents exactly these event types for webhooks.
  **Done when:** a deliberately bounced test message appears in the back office
  with a next action, and a delivered one is visibly different from "sent".
  *A1 P0-04, § 9*
  **HALF DONE 2026-09-16 by 14.3, and the half that is left is small.** The
  events are stored and displayed: a delivered message is now visibly different
  from one merely sent (*"Delivered"* with a tick, against *"On its way"*), a
  deliberately bounced message reads *"Bounced"* in red with the provider's own
  reason, and a permanent failure raises the address banner on the customer.
  **What 3.1 still asks for that 14.3 did not build:** the same list in the
  **back office** rather than only on the client record, and the link to the
  BOOKING (the row carries business, customer, address and subject — not the
  booking id, because the relay is never told which booking it is sending
  about). `delivery_delayed` and `suppressed` are deliberately not modelled;
  `supabase/functions/resend-webhook/index.ts` says why.

- [~] **3.2 — DEFERRED by Andrew to ~Dec 2026. Email capped at 100 a day, shared with Andrew's real business.**
  Back office shows "Email today 0 of 100", and `AdminPage.jsx:360` already
  knows the cap is shared with andrewsdetail.com.
  **Fix:** paid Resend plan before any real customer goes live; alert in the
  back office as the cap approaches and on any failed send.
  *A2 3.2*

- [ ] **3.3 — Customers only ever get email, never text.**
  Settings lists confirmation, reminder and thank-you as email only, while the
  home page promises "Confirmation when they book, reminder before you drive
  out."
  **Fix:** text confirmation and a day-before reminder with "Reply C to
  confirm", each switchable by the detailer.
  **Done when:** a test booking sends a real text and a reminder fires on
  schedule.
  *A2 3.1, A2 Part 8 item 1 — A2 calls this the single biggest cut to no-shows*

- [ ] **3.4 — Review every email end to end. Nobody has ever done this.**
  Carried from the old roadmap, and it is the same job A1 § 10 asks for in its
  lifecycle matrix.
  **Done when:** confirmation, acceptance, reminder, quote, receipt,
  cancellation and reschedule have each been sent, received and read.
  *old roadmap § A*

---

## Wave 4 — State safety

- [ ] **4.1 — One tap completes a job, with no confirmation and no undo.**
  A1 marked a demo job complete by accident while exploring. This gets used
  one-handed in a driveway, and completion moves reminders, reports, money and
  customer status.
  **Fix:** confirmation showing customer, service and time, then a visible
  undo. Apply the same review to cancel, no-show, suspend, delete, waive and
  owner-invite. **The pattern already exists** — the job page's delete-behind-a
  -fold with `.btn.danger` is this product's reference for a destructive
  action (`docs/screen-rules.md`). Copy it rather than designing a second one.
  **Done when:** no consequential state change happens from one accidental tap,
  and each is recorded in an audit history.
  *A1 P0-06*

  **MEASURED FIRST, 2026-09-20 — WHAT THE TAP ACTUALLY DID.** It wrote
  `status: 'completed'` through `update-booking` on the first touch, from
  **two** screens: the card on Today, where it is the accent-filled button on
  the next job of the day, and the job record. What that press costs:
  * it does **NOT** email the customer — only a cancellation or a move does;
  * it does **NOT** silence their reminder — the reminder rule excludes
    `cancelled` and `pending`, not `completed`;
  * it **does** push the owner's phone, unlock **Finalize payment**, move the
    job into Today's "needs paying" pile, and count it as done in Money, the
    reports and the client's history;
  * and there was **no way back**: once completed the button vanishes and only
    "Didn't show up" and "Cancel the job" remain. A cancellation has
    "Un-cancel"; a completion had nothing.

  **THE UNDO NEEDED NO SERVER CHANGE, which is why this was buildable during
  the deploy freeze.** `status` is an ordinary editable field on
  `update-booking` with no transition guard, and "Un-cancel" has been writing
  `confirmed` through it all along. The way back existed everywhere except on
  the screen.

  **NOT THE DELETE PATTERN, AND THE RULES SAY WHY.** This item says to copy
  the job page's delete-behind-a-fold with `.btn.danger`.
  `docs/screen-rules.md` names that as the reference for a DESTRUCTIVE action
  and, in the same paragraph, says "Didn't show up" and "Cancel the job"
  deliberately do NOT take `--bad` because they are outcomes a detailer can
  live with. Completing a job is the commonest outcome in the product.
  Painting it as harm would weaken `--bad` everywhere it currently means
  something, and a fold would tax every correct press to stop a rare wrong
  one. **So it asks in place instead** — `components/ConfirmTap.jsx`, one
  control, both screens, no modal, because this is used one-handed in a
  driveway.

  **VERIFIED AT 1440x900, 768x1024, 392x844 AND 320x844, console clean at
  each**, signed in as the demo owner on the job record:
  the tap asks **"Mark Tom Okafor's Full Interior Detail at 9:00 AM as
  done?"** — customer, service and time, which is this item's own wording;
  "Yes, it's done" and "Not yet" both appear; the original button is gone
  while it asks, so there is nothing to double-tap through; "Not yet" puts it
  back; **and the job was still Confirmed afterwards — nothing was written.**
  On a job that was already completed, **"Not completed after all" is present
  and visible at all four widths.**

  **THE WRITE PATHS WERE THEN EXERCISED FOR REAL — permission granted
  2026-09-20, two row edits on the demo tenant, and here is what the database
  actually did rather than what was expected.** Booking
  `7dc20b29-2ed3-449f-b9b4-000cb2d833d0` (Tom Okafor, 22 September), driven
  through the real UI at 392 wide:

  | when | status | finalized_at | final_amount | updated_at |
  |---|---|---|---|---|
  | before | `confirmed` | null | null | `10:07:01.492999+00` |
  | after "Yes, it's done" | `completed` | null | null | `10:34:56.966339+00` |
  | after "Not completed after all" | `confirmed` | null | null | `10:35:57.201227+00` |

  **The row is back exactly as it was, and the only thing that moved is
  `updated_at`, which is what two writes are supposed to leave behind.**
  Completing touches NEITHER `finalized_at` NOR `final_amount` — it unlocks
  the Finalize button, it does not settle any money. Console clean through
  both presses.
  **A booking created by this session was NOT used, and the reason is worth
  knowing:** it is `pending`, so the job record offers Accept / Send a quote /
  Decline and never offers "Mark completed" at all. Accepting it first would
  have been a third row edit nobody granted.

  **AND THE PRESS FOUND SOMETHING THE REASONING HAD MISSED — see `FOUND.md`.**
  The undo is real and it works, but it is not on screen at the moment of the
  mistake: every caller of this record closes it on a change (`navigate("/app")`
  on the standalone job route, `setSelected(null)` on Today, Calendar, Money
  and Clients), so confirming a completion takes the record away with it. The
  undo is one navigation back, not one tap. **Pre-existing behaviour of all six
  call sites, not introduced here**, and not changed tonight because it is six
  screens Andrew has reviewed and nobody asked for that.

  **NOT TICKED. WHICH HALF IS DONE, WHICH IS BLOCKED, AND ON WHAT:**

  * **DONE, and proven on a real screen at four widths with the database read
    before and after:** the confirmation, the wording, and a working undo. **No
    consequential state change now happens from one accidental tap.**
  * **BLOCKED, AND THE BLOCKER IS A DEPLOY, NOT A DESIGN:** the audit history
    this item's own "done when" asks for. Nothing records who completed a job
    or when. It needs a new append-only table (a migration) **and** a write
    from `update-booking` (a deployed function), and **all deploys are frozen
    until Andrew rules in the morning**. The design is not in question and
    nothing about it is waiting on a decision — it is waiting on the freeze
    lifting. Whoever picks it up should not re-litigate the approach.
  * **NOT STARTED:** the sweep this item also asks for over cancel, no-show,
    suspend, delete, waive and owner-invite. Only completion is done.
  * **NOT SEEN:** the card on Today. It uses the same component and the same
    question, but the demo has no job on Today in a completable state, so that
    surface went unmeasured.

  **ONE OF THE TWO THINGS HAS NOW LANDED:**
  1. **The audit history** — still waiting. A new append-only table and a
     write from `update-booking`. A migration AND a deploy, so it still waits
     on the freeze. **This is the only piece left blocking 4.1.**
  2. **DONE 2026-09-20 — the record staying open on a status change.** Built
     from the fully-specified ruling in `DECISIONS.md` § *"The job record
     should stay open when a status changes"*, deferred that morning on
     timing and un-deferred that same night once the code was ready. One
     helper, `fetchBooking(id, businessId, tz)` in `useBookings.js`, re-reads
     the single row by id; every caller's `onChanged` now calls it instead of
     closing the record. **Walked all five detailer-side call sites, each
     completed then undone on the real screen with the database read before
     and after:**
     - `JobPage.jsx` (the standalone `/job/:id` route) — Elena Marsh's Sept 20
       2:00 PM booking, `e67e1499-650c-4574-a405-52ca7a197894`: `confirmed` →
       "Yes, it's done" → `completed` (`23:52:00`) → record stayed on the same
       URL → "Not completed after all" → `confirmed` (`23:55:18`).
     - `Today.jsx` and `Calendar.jsx` — verified in an earlier pass the same
       night.
     - `Money.jsx` — Elena Marsh's second Sept 20 booking,
       `af3b671e-a804-4866-9902-f8e8e7f76e22`: `completed` → "Not completed
       after all" → `confirmed` (`23:56:35`) → "Mark completed" → `completed`
       (`23:56:53`), record open throughout, notice banner shown both ways.
     - `Clients.jsx` — Aisha Rahman's Sept 27 booking,
       `1b1a4433-ee1a-4fa6-bf31-cfb9d309ca9b`, opened from her customer
       history: `confirmed` → `completed` (`23:57:48`) → `confirmed`
       (`23:58:00`), record open throughout.
     Also fixed in the same pass: the "Marked as completed" / "Marked as
     confirmed" / "Marked as not shown" / "Marked as canceled" notice was
     never once reachable before, because the old `onChanged` unmounted the
     record in the same tick it fired — it is now visible on screen (and its
     Spanish strings added to `appEs.js`), checked at 392px as well as
     desktop width.
     **`ManageBookingPage.jsx` (the customer-facing side) was correctly left
     out, and here is WHY rather than just that it is — five of six is not a
     gap.** `DECISIONS.md`'s own catalogue of the six call sites (§ "The job
     record should stay open when a status changes") shows it was never part
     of the bug: `onChanged={load}` there already re-fetches, unlike the
     other five which called `navigate(...)` or `setSelected(null)` and
     closed the record. It didn't need this fix because it never had this
     fault.
     **A SEPARATE, UNRELATED CONSOLE ERROR was seen on one tab during this
     pass, CORRECTED 2026-09-20 after Andrew asked for the exact string —
     the first claim here was wrong and this is the fix, not a second
     finding.** Verbatim: `Uncaught NotFoundError: Failed to execute
     'removeChild' on 'Node': The node to be removed is not a child of this
     node.`, thrown from `chunk-PJEEZAML.js` (a Vite dep chunk), caught by
     `ErrorBoundary`, paired with `Warning: You are calling
     ReactDOMClient.createRoot() on a container that has already been passed
     to createRoot() before.` **"Reproduces on a plain reload" was wrong.** A
     genuinely fresh tab against the (since-restarted) dev server shows none
     of it; the tab that showed it never cleared its own console buffer
     across repeated `location.reload()` calls, so the same historical
     entries kept reprinting and were mistaken for repeated reproduction. It
     happened once, on one tab, stack citing only
     `ErrorBoundary`/`Router`/`BrowserRouter`, never a file touched here.
     Not chased further; if it recurs, catch it on a clean tab before
     trusting the count.

- [x] **DONE 2026-09-16 — 4.2 Calendar download links need an authorization review.**
  The link carried a Supabase function URL, a booking id, `audience=owner` and
  an anonymous API key. **A1 proved no vulnerability** — an anon key can be
  normal in Supabase — but the endpoint's authorization is untested.
  **Fix:** test whether altering booking ids or audience exposes another
  account's data; verify row-level security and server-side authorization;
  consider signed expiring links.
  **Done when:** cross-account and altered-link tests fail safely and the
  result is written into `docs/VERIFIED.md`.
  *A1 P1-10*
  **MEASURED 2026-09-16 — the review is done and the answer is half good.**
  *Altering the booking id is safe*: a random UUID answers `404 not_found`, the
  ids are `gen_random_uuid()`, and one id only ever reaches its own booking.
  *Altering the audience is not*: `audience=owner` is a plain query word with
  **no authentication of any kind**. A GET with **no API key and no token at
  all** returned the customer's name, phone number, home address and vehicle —
  measured live against a real demo booking. The customer's own calendar link
  becomes the owner's copy by editing one word in the URL. The endpoint also
  carries no rate limit. **Tracked as 14.2 below**, which is where the fix goes.
  **FIXED 2026-09-16 under 14.2.** The flip now returns the customer's copy,
  measured on the deployed function before and after; the rate limit is on; the
  result is written into `docs/VERIFIED.md` § 14.2, which is this item's own
  "done when". The cross-account half stays as measured above — safe — and the
  new check asserts the membership is scoped to the booking's business, so it
  stays safe.

- [ ] **4.3 — Support view needs a read-only banner and an audit record.**
  "Look at their dashboard" opened a support view that appeared read-only, but
  nothing said so and nothing recorded it.
  **Fix:** "Viewing as support — read only" banner, record who opened it and
  when, block mutations server-side, provide "Return to admin".
  **Done when:** an attempted state change fails and the access appears in an
  audit history.
  *A1 P3-08, § 9*

- [ ] **4.4 — Prove multi-tenant isolation properly.**
  `tests/tenant-isolation.test.mjs` exists. Per `docs/gotchas.md`, break it on
  purpose before believing it.
  **Done when:** cross-detailer access with altered identifiers fails on every
  customer/business table and storage path, and the run is recorded.
  *A1 § 9*
  **MEASURED 2026-09-16, and the database half now passes properly.** The
  existing suite checks **five** tables. The sweep run for the health audit
  asked **all 51**, signed in as a real detailer:
  - **48 of 51 tables answered**, and **not one foreign row came back.**
  - The caller saw its **own** rows in 12 of them, so the sweep was comparing
    real data rather than refusing everything — the failure mode this suite
    has already been caught in once.
  - **Canary:** the same request with a key that should see everything found
    **63 foreign customer rows**. They exist and are findable, so "none" above
    is a refusal and not an empty database.
  - **Storage, both buckets, now covered too:** `job-photos` is private and
    every policy keys on the business-id folder prefix; `business-media` is
    public-read by design and write-scoped the same way.
  **What is still not proved, and is the real remaining work:** the sweep tests
  RLS, which is what a *browser* is held to. Edge functions run as the service
  role and bypass RLS entirely, so their authorization is hand-written. Every
  member-gated one was read and every one pairs its record lookup with
  `.eq("business_id", member.businessId)` — but that is a reading, not a test.
  **Done when** the suite sweeps all 51 tables rather than 5, and a second pass
  replays each edge function with another tenant's identifiers.

  **STILL OPEN 2026-09-20, AND DELIBERATELY NOT TICKED.** The tenant-isolation
  matrix (step 6 of the adoption sequence, `scripts/tenant-matrix.mjs`) now
  covers four boundaries — Data API tables, definer RPCs, storage objects and
  Realtime — at **77 targets, 729 assertions, 0 failures, four canaries each
  caught by its own detector**, graded by `receipt.mjs` rather than by its own
  printed verdict. That satisfies the FIRST half of this item's amended
  *Done when* and nothing of the second.

  **HOW THE FIRST HALF WAS CHECKED.** The question comes off the schema rather
  than off a list: every table in `public` is discovered at run time and a
  tenant-owned table with no seed recipe fails the run by name. Four actors —
  anonymous, owner A, staff A, and a member removed *after* signing in, whose
  JWT is still valid. Read, update, delete and forged-tenancy insert, plus a
  sentinel string that catches a leak through a view or a column nobody named.
  Storage was added because **`job_photos` passed the table sweep with its
  photographs never once fetched** — the row holds a path and the bytes sit
  behind a policy in another schema. Certified by six sabotages, all refused,
  two of which silence a single detector rather than a whole section.

  **WHAT IT DOES NOT PROVE, AND THIS CAVEAT SITS BESIDE THE WORK RATHER THAN
  UNDER IT:**

  - **The 39 edge functions are untouched. The matrix calls zero of them.**
    They run as the service role and bypass RLS *entirely*, so every policy
    proved above is simply not consulted. Their authorization is hand-written
    and has been READ, not tested — which is the exact distinction this item
    was re-specified to close. **This is the whole of what is left of 4.4.**
  - **`postgres_changes` prints `NOT DELIVERING — detector uncertified`.**
    Realtime's row-streaming does not deliver on this project at all: a
    published table with a wide-open policy, a confirmed `SUBSCRIBED`, a live
    socket proved by hearing its own broadcast back, a row inserted — and
    nothing arrived across three runs. An empty result is also what perfect
    isolation looks like, so that detector is **deliberately excluded from the
    receipt's canary gate**. It is uncovered, not clean. Harmless only while
    the publication stays empty; the publication detector fails the run the day
    anybody publishes a tenant-owned table, which forces this to be re-proved
    before anyone leans on it.
  - **A channel opened without `private: true` is authorised by nothing.**
    Proved by having a client with only the anon key and no session receive a
    signed-in user's broadcast verbatim. Nothing leaks today — the app opens
    zero channels — but it is a standing risk carried on every receipt, not a
    thing that has been fixed.
  - **Self-reported.** Every number came from runs made by the session that
    wrote the check. Not independently verified.

  **Done when** (unchanged): a second pass replays each of the 39 edge
  functions with another tenant's identifiers. Until that exists, this item is
  open and the four-boundary matrix is evidence toward it rather than
  completion of it.

  **THE EDGE FUNCTIONS ARE NOW REPLAYED — MEASURED BUT NOT CLOSED, 2026-09-20.**
  `scripts/edge-tenant-replay.mjs`, graded by `receipt.mjs`, which **refuses
  the run**. Three numbers, and the third is the one that matters:

  - **15-16 of 39 genuinely RAN.** Owner A got a 2xx out of them with its own
    tenant's identifiers, so the function was exercised rather than bounced.
    A range, not a figure — see the rate-limiter note below.
  - **23-24 still REFUSE.** A's own call never succeeded either, so their refusal
    of tenant B proves nothing at all. Grouped: **9 answered 400** (a required
    field this harness cannot synthesise), **5 carry no tenant identifier in
    their input** at all (`watch-jobs`, `refresh-weather`, `stripe-webhook`,
    `resend-webhook`, `translate-content` — cron sweeps and provider
    webhooks), **3 answered 409**, **3 answered 404**, one 500, one 401, one
    429.
  - **7 PROVED ISOLATION BY REJECTING THE OTHER TENANT**: `accept-invite`,
    `connect-account`, `delete-customer`, `invite-user`,
    `owner-push-unsubscribe`, `preview-emails`, `update-booking`. Each works for A with A's own
    identifiers and refuses B's to **all three** signed-in actors — owner,
    staff, and a member removed after signing in.

  **AND ONE OF THOSE SEVEN WAS WITHDRAWN, BECAUSE CALLING IT SENT REAL MAIL.**
  `report-problem` had proved rejection, and it is now NOT CALLED at all.
  Its recipient comes from `Deno.env.get("SUPPORT_EMAIL")`, not from the
  request, so the sink address in the body could not redirect it: the replay
  put **nine** *"Problem report · EDGEREPLAY-A-SECRET DETAIL"* messages into
  `support@detailingplatform.com`, the platform's own support inbox. No
  customer was written to and nothing else escaped, and it still should not
  have happened — the promise of that script is that its mail lands nowhere.
  The guard is **structural rather than a name**: any function whose send
  target comes from the environment or a literal instead of from the request
  is refused by the harness, because matching `report-problem` by name would
  leave the next one to be found the same way. Proving isolation there needs a
  different instrument.

  **NO LEAK WAS FOUND ON ANY PATH IT REACHED**, and nothing of B's moved for A
  that did not also move for an anonymous stranger.

  **WHY 16 AND NOT 39, AND WHY THAT IS THE HONEST NUMBER.** The first version
  of this check reported **39 functions, ok**. It was measuring the GATEWAY,
  not tenant isolation: 34 of those refused every caller, and a refusal the
  harness cannot explain is not evidence. The fix was to call each function
  TWICE by the same actor with the same shape — once at A's own tenant, once
  at B's. Only the pair says anything:

      self 2xx + cross refused  -> isolation proved by rejection
      self 2xx + cross 2xx      -> a leak
      self NOT 2xx              -> the front door is shut to A as well, so the
                                   cross refusal is meaningless. SKIP, with
                                   A's own status printed.

  **`skipped_targets` IS DECLARED AT 23 AND THE RECEIPT THEREFORE FAILS.** A
  `pass` over 23 skips would be this repo's oldest lie one level up — a check
  that passes by not running. There is no honest `skip_allowlist` to write,
  because the reason is work to do rather than a condition to wave through.

  **TWO CONTROLS, BOTH BROKEN ON PURPOSE.**
  - `--break=leak` blinds the leak comparison -> the over-privileged caller no
    longer comes back carrying B's data, the canary does not fire, and
    `receipt.mjs` refuses the run by name.
  - `--break=self` removes the front-door positive control -> all 39 become
    skips and **0** are proved by rejection, which is the proof that the self
    call is load-bearing rather than decorative.

  **THE CANARY IS AN OVER-PRIVILEGED CALLER, NOT A DEPLOYED BROKEN FUNCTION,
  AND THAT LIMIT IS NOT GLOSSED.** A function that trusts a tenant id from its
  caller would be the ideal control, and deploying one is publishing, which is
  Andrew's (0.6). So the service-role key is used instead — the same negative
  control this item's own earlier text used for the database half. It shows
  the detector can SEE tenant data in an edge-function response; it does not
  show a subtle authorization bug would be caught. It reached **5** functions.

  **THREE THINGS THE FIXTURE TAUGHT, all now in the file:** a second booking
  seeded on the same day cost `update-booking` its proof by making A's own
  call a 409, so a fixture that makes one function testable must not quietly
  make another untestable; `reschedule-booking` runs first alphabetically and
  moves A's booking into the slot `update-booking` then wanted, which is the
  battery's interference problem inside one script; and `status` is
  deliberately NOT synthesised, because it is a field whose value changes what
  the call MEANS.

  **THE RUN IS NOT PERFECTLY REPEATABLE.** Two consecutive runs gave 17/22/7
  and 16/23/7: `create-booking` is rate-limited and answers 429 when the
  replay has been run repeatedly. That is a property of the product's own rate
  limiter, not a flaw in the measurement, but a number that moves by one
  between runs should be read as such.


  **ROUND TWO — READING EACH FUNCTION'S OWN VALIDATION BRANCH, 2026-09-20.**
  Guessing values by field name got 15 of 39 through the front door and then
  stopped: the rest answered a bare `400`, which says *you are missing
  something* and not what. **So the guard that produced it is read instead.**
  Every one of these functions rejects in the same shape —
  `if (!thing) return json({ error: … }, 400)` — and the identifiers inside
  that negation ARE the required fields.

  Two things came out of that, and the second matters more than the first.

  1. **THE BODY IS BUILT FROM THE UNION** of what the function READS (the
     request shape, discovered from source) and what it INSISTS ON (the 400
     guards). Neither alone gets through the door: `owner-push-subscribe`
     takes its subscription as a nested object, so `p256dh` and `auth` never
     appeared in the destructure, while its own guard names them both.
  2. **A SKIP NOW NAMES THE FIELD RATHER THAN THE STATUS.** *"rejects on
     `domain_id`, which this harness does not supply"* is a piece of work
     somebody can pick up. *"400"* is a shrug. Where the guards name nothing
     missing, the skip says so — the refusal is then a lookup, a permission or
     a precondition on the row, which is a different kind of work.

  **THE THREE NUMBERS AFTER ROUND TWO: 15-16 RAN · 23-24 REFUSE · 7 PROVED.**

  **A RANGE, BECAUSE TWO CONSECUTIVE RUNS DISAGREED BY ONE AND THE SINGLE
  FIGURE WAS COMMITTED BEFORE THE SECOND RUN FINISHED.** One foreground run
  gave 16/23/7 and the next gave 15/24/7. The cause is the product's own rate
  limiter: `create-booking` answers **429** once the replay has been run
  repeatedly, so whether it gets through its front door depends on how recently
  somebody ran this. **The PROVED number — 7 — did not move in either run**,
  which is the one that matters, because it is the count of functions that
  demonstrably work for A and refuse B.

  Writing the single figure down first was the same error as the nine emails,
  one notch smaller: a number stated from one observation as though it were
  settled. It is a range, and the range is what goes in the file.

  **AND THE SAME LESSON COST A RESULT FOR THE THIRD TIME.** Seeding a
  `business_invites` row so `accept-invite` had a token to present made
  `invite-user` start answering 409 — it invites the sink address too, and an
  address already invited is a conflict — so a function that had PROVED it
  refuses tenant B silently became a skip. The seeded invite now uses its own
  reserved `example.com` address. **Three times in one script: a fixture that
  makes one function testable must not quietly make another untestable**, and
  the only reason it was caught each time is that the per-function line prints
  A's OWN status beside the cross-tenant one.

  **WHERE THIS STOPS, AND IT STOPS AT THE FREEZE.** Several of the remaining
  refusals need a deployed fixture to get past their own front door —
  `connect-account` and `pay-booking` want a connected Stripe account,
  `verify-domain` wants a verified domain. **That is not engineered around.**
  Deploying is Andrew's, it is already on his list, and a harness that forged
  its way past a real precondition would be proving something about the forgery
  rather than about the product.


  ---

  ### 4.4's VERDICT, AGAINST FOUR NUMBERS — **IT DOES NOT CLOSE.** 2026-09-20

  **15–16 RAN · 17–18 REFUSE · 7 PROVED · 6 OUT OF REACH · 1 NEVER CALLED.**

  - **15–16 of 39 genuinely RAN.** Owner A got a 2xx out of them using A's own
    identifiers, so the function was exercised rather than bounced at its door.
    A range, because `create-booking` is rate-limited and answers 429 once the
    replay has been run repeatedly.
  - **17–18 still REFUSE, and that is DEBT.** A's own call never succeeded
    either, so their refusal of tenant B proves nothing. Each names the field
    it rejects on where its own 400 guards name one — *"rejects on
    `domain_id`, which this harness does not supply"* — and says so plainly
    where they do not, because a lookup, a permission or a precondition on a
    row is different work from a missing argument.
  - **7 PROVED ISOLATION BY REJECTING THE OTHER TENANT**: `accept-invite`,
    `connect-account`, `delete-customer`, `invite-user`,
    `owner-push-unsubscribe`, `preview-emails`, `update-booking`. Each works
    for A with A's own identifiers and refuses B's to **all three** signed-in
    actors — owner, staff, and a member removed after signing in. **This
    number did not move across any run.**
  - **6 are OUT OF THIS CHECK'S REACH, and that is a DECISION**, kept in its
    own bucket with its own count and a written reason each: `watch-jobs`,
    `refresh-weather` (cron sweeps with no caller-supplied tenant),
    `stripe-webhook`, `resend-webhook` (provider payloads carrying the
    provider's own signature), `translate-content` (text and a language, no
    tenant). **A thing decided not to be measured and a thing that failed to
    be measured must not look the same**, or six permanent entries read as
    unfinished work for ever.
  - **1 is NEVER CALLED for safety**: `report-problem`. See below.

  **NO LEAK WAS FOUND ON ANY PATH THE REPLAY REACHED**, and nothing of B's
  moved for A that did not also move for an anonymous stranger.

  **SO IT DOES NOT CLOSE, AND THE REASON IS THE SECOND NUMBER.** Seventeen or
  eighteen functions have tenant checks that have still never been exercised.
  Seven proven out of thirty-nine is real progress from a starting point of
  *"every member-gated function was read and each paired its lookup
  correctly — but that is a reading, not a test"*, and it is not the item.
  **An open item with four honest numbers beside it is worth more than a tick.**

  **WHY THE REST CANNOT BE FINISHED TONIGHT.** Several of the remaining
  refusals need a deployed fixture to get through their own front door —
  `connect-account` and `pay-booking` want a connected Stripe account,
  `verify-domain` wants a verified domain. **Deploying is Andrew's and the
  freeze is whole**, so this was not engineered around: a harness that forged
  its way past a real precondition would be proving something about the
  forgery rather than about the product. It is on `FOR-ANDREW.md`.

  **THE OUT-OF-REACH LIST IS CHECKED, NOT BELIEVED, AND IT CAUGHT ITS AUTHOR
  ON ITS FIRST OUTING.** `send-owner-reminders` was written into it as a
  15-minute cron sweep — true of what it is FOR — and the structural check
  threw it straight back out by name: *"listed as out of reach, but it DOES
  accept a tenant-bearing field (booking_id, business_id)"*. A caller can aim
  it. An allowlist written from intent hides exactly the thing somebody
  assumed was not there. `--break=reach` empties the list and moves all six
  into the skip bucket, which is the proof it is refusable.

  **AND THAT SWITCH SENT A TENTH EMAIL, WHICH IS ITS OWN LESSON.**
  `report-problem` had been excluded by putting it in the same list, and
  `--break=reach` empties the list — so the sabotage flag removed a SAFETY
  rule and one more message reached the platform's support inbox. It now sits
  in `NEVER_CALL`, consulted first, emptied by nothing. **A `--break` exists
  to make a check fail on purpose, and a `--break` that can put mail in
  somebody's inbox is a hazard rather than a control.** Verified: the count
  stayed at ten across a full `--break=reach` run. `FOUND.md` has the incident.

  **Done when:** the 17–18 get arguments good enough to return a 2xx, so their
  refusal of B becomes evidence. The 6 out-of-reach never will, by design, and
  are excluded rather than owed. `report-problem` needs a different
  instrument.
  **Done when:** the 23 get arguments good enough to return a 2xx, so their
  refusal of B becomes evidence. **Five of them never will from here** — they
  take no tenant identifier, so there is nothing to aim. **Several of the rest
  may need a deployed fixture** (a connected Stripe account, a verified
  domain), and if they do, that is Andrew's call in the morning rather than
  something to engineer around tonight.


---

## Wave 5 — Money truth

Both audits independently reached the same conclusion here, which makes it the
most corroborated finding in the set.

- [x] **5.1 — DONE 2026-09-17, resolved by 14.7. Evidence
  `docs/VERIFIED.md` § 14.7.** The screen called unpaid work "brought in" and
  the figure derived from it "net/kept". Measured again on the demo business:
  $810 earned, $515 collected, $295 still owed, so the headline read $285 over
  a cash position of −$10.
  **Now:** headline *Earned less expenses this month*, cells *Earned* /
  *Expenses* / *Avg job* / *Jobs done*, and **Collected $515** beside **Still
  owed $295** underneath them, where $515 + $295 = $810. The back office says
  *earned*, not *taken*. Pressing *Mark paid* on the $65 job moved COLLECTED
  $515 → $580 and STILL OWED $295 → $230 with EARNED unchanged; the row was
  put back to `pending` afterwards.
  **TWO PARTS OF THIS ITEM WERE OVERRULED BY 14.7 AND THAT IS ON PURPOSE.**
  *"Net is computed from collected money only"* — no: net stays accrual,
  because the six-bar chart the headline sits on, the *vs last month* delta,
  the tour step and the accountant CSV all count work done in the period, and a
  cash-basis headline would disagree with the chart under it. So marking a job
  paid does NOT move the net; it moves the pair beside it. *"Expenses paid"* —
  no: an expense row has no paid/unpaid column, so that label would be a new
  unverifiable claim replacing an honest one. It stays *Expenses*.
  *A1 P1-01, A2 4.1 — settled by 14.7*

- [x] **5.2 — DONE 2026-09-18. Evidence `docs/VERIFIED.md` § 5.2.** The
  headline compared a part-finished period against a whole one: on the 18th of
  September the demo business read *down $903 vs $853 last month*, seventeen
  days of one month measured against thirty-one days of another. `periods.js`
  had warned against exactly this in its own header since it was written.
  **CHOSEN: TRIM, NOT HIDE.** Hiding the comparison until the period closes
  would remove it for up to 30 days at a stretch on Month and 364 on Year —
  absent on every day a detailer could act on it, present on the one day they
  could not. Trimming is also what every dashboard means by month-to-date.
  **Now:** *down $792 vs $742 at this point last month*, and the label says
  *at this point* only while the period is running — a finished period still
  compares with the whole of the one before it. Eight new labels, nine new
  Spanish keys. `previousSoFar()` in `lib/periods.js` is the one place that
  decides, so the advanced screen's own arrows move with the headline.
  Check: `tests/mid-period-comparison.test.mjs`, 87 assertions, broken on
  purpose nine ways and all nine caught.
  *A2 4.2*

- [x] **5.3 — DONE 2026-09-18. Evidence `docs/VERIFIED.md` § 5.3.**
  Receipts and invoices were not findable, and a real $195 test payment is
  what proved it rather than a reading of the code. **The payment sent nothing
  and recorded nothing** — `handleConnected()` marks the row paid and stops, so
  zero emails and zero `email_sends` rows came out of a settled card.
  **And the one button that would send a receipt was hidden on exactly the job
  that needed it**: it sat behind `canFinalize`, so a customer who paid from
  their own link before the detailer closed the job left the detailer looking
  at a record offering *Finalize payment* and no way at all to send them what
  they had just bought.
  **THE DOCUMENTS EXIST, SO THEY WERE MADE FINDABLE.** `send-invoice` builds a
  real receipt — its subject is literally `Receipt · $195 · <business>`. The
  job record now has a **Receipt** section carrying all five answers in one
  place: the page the customer opens, the button that emails it (on any job
  with a final amount, finalized or not), who it goes to, and underneath, every
  email to that address with its date and what became of it. Three actions,
  three weights — the two filled blue bars the first version stacked on a phone
  were seen at 392 and fixed.
  **ONE CLAIM WAS NARROWED, BECAUSE NOTHING SENDS IT.** The customer's paid
  screen said *"your receipt is on its way by email"*. It now says the payment
  went through and that the detailer emails the receipt when they close the
  job. It does not promise Stripe's receipt either: that is a switch inside the
  detailer's own Stripe account, off by default in test mode, and swapping one
  unkeepable claim for an uncheckable one is not a narrowing.
  **"DID IT ARRIVE" STOPS AT "ON ITS WAY", AND THAT IS ANDREW'S THREE MINUTES.**
  Re-measured this run: every email ever sent to `delivered@resend.dev`, an
  address Resend guarantees accepts instantly, is still `sent`. The endpoint is
  deployed and its secret is set; nobody has added it in Resend's own dashboard
  — `FOR-ANDREW.md` row 1.
  Check: `scripts/e2e-receipt-trail.mjs`, 6 targets, 21 assertions, which
  **makes its own payment** by driving `e2e-payment.mjs` first. Broken on
  purpose four ways and all four caught; two of the four rewrote the check
  itself before they could catch anything.
  *A1 P1-04*

- [x] **5.4 — Link-open counts disagreed between Money and Business. DONE 2026-09-18.**
  **Not a period difference — Business was simply wrong.** Measured against the
  real database: not one visit in the whole table was tagged to a link, so
  Money's "None of your links were opened" was right and Business's "1 link ·
  21 opens" was counting three wrong things at once — untagged visits, visits
  to switched-off links, and page loads instead of people. Both screens read
  `whereFrom()` now. Check `scripts/link-counts-agree.mjs`, 5 targets, 11
  assertions, broken on purpose four ways and all four caught. Evidence
  `docs/VERIFIED.md` § 5.4.
  Money says "None of your links were opened in this period"; Business says
  "1 link · 21 opens". **A2 marks this not confirmed** — may be different
  periods.
  **Fix:** if the periods differ, label them. If not, fix the count.
  *A2 4.5*

---

## Wave 6 — Recovery and monitoring

- [ ] **6.1 — There is no proved recovery path for the business's records.**
  No restore test, restore date, recovery target or outage history exists.
  Once Andrew runs his livelihood on this, losing a week of bookings is a
  business-stopping event.
  **Fix:** define backup frequency and retention, run a restore into a safe
  environment, record the last successful restore test, write a one-page
  recovery procedure, enable MFA on the production accounts. Supabase's
  production checklist covers backups, point-in-time recovery, MFA and RLS.
  **Done when:** a test copy is restored, opened and checked against a known
  set of bookings, customers and settings, with the date visible in the back
  office.
  *A1 P0-07*

  **MEASURED 2026-09-20 — AND THE ANSWER IS THAT THERE IS NO RESTORE POINT.**
  `scripts/restore-drill.mjs`, graded by `receipt.mjs`, which **fails the run**
  and will keep failing until this is fixed. One page of procedure in
  `docs/recovery.md`.

  **Nobody knew whether this database could be restored, and this file recorded
  that as an absence rather than as a measurement.** It is now a measurement:

  | | Measured |
  |---|---|
  | Supabase plan | **free** |
  | Point-in-time recovery | **off** |
  | Restorable backups listed | **0** |
  | WAL archiving | on, 8,405 segments, **0 failures**, last push minutes before the run |
  | Last successful restore test | **2026-09-20**, of a logical export |

  **If this database were lost right now, nothing the platform holds would
  bring it back.**

  **WAL ARCHIVING BEING HEALTHY IS NOT A REPRIEVE, AND IT IS THE TRAP ON THIS
  ITEM.** Those 8,405 segments with zero failures are Supabase's own
  infrastructure — it is how they move and upgrade projects. On the free plan
  nothing customer-facing is built on them: no backup to download, no point in
  time to roll to. **The archiver is green and the restore path is absent, both
  at once**, and reading the first as the second is the most dangerous
  available mistake here.

  **WHAT WAS ACTUALLY PROVED, because an item like this must not be narrowed
  until it passes.** All 52 tables of `public` — 1,786 rows — exported to a
  file, restored into a throwaway schema **by reading the rows back off disk**,
  and compared row by row: **all 52 matched**. Then one value in one restored
  row was deliberately altered and **the comparison caught it**;
  `--break=canary` skips the alteration, the canary is correctly MISSED, and
  the receipt refuses the run. So the business's records can be taken out,
  written down, put back and come back identical.

  **THREE THINGS THAT DRILL DOES NOT COVER, NAMED RATHER THAN OMITTED:**
  1. It is **not** a test of Supabase's backups. There are none to test.
  2. **`auth.users` is not in `public`.** 44 logins live in the `auth` schema:
     a copy of `public` restores the business and not the ability to sign in.
  3. **Storage files are not in the database.** 146 objects — the rows are in
     `storage.objects`, the bytes are in object storage, so a database restore
     brings back references to photos that may not exist.

  **THE FIRST RUN REPORTED TWO FAILED RESTORES AND BOTH WERE THE INSTRUMENT.**
  `bookings` and `job_heartbeats` came back with matching row counts and
  different content. They had not failed: the drill was comparing the restored
  copy against the **live** table, `job_heartbeats` is written by the cron
  sweeps every fifteen minutes, and the source moved between the export and the
  comparison. **A restore drill that compares against a moving target reports
  somebody else's write as data loss**, which is the most alarming possible way
  to be wrong. It now fingerprints each table at export time and checks the
  restore against that; live drift is printed as information and is not a
  failure. `docs/gotchas.md` has it.

  **WHAT IT WOULD COST TO FIX PROPERLY, read off Supabase's own add-on API:**
  point-in-time recovery is **$100/month** for 7 days, $200 for 14, $400 for
  28, and requires a paid plan this organisation does not have. **A paid plan
  alone turns on daily backups**, which is the cheaper half and the likely
  first step. **That is Andrew's card and his decision** — `FOR-ANDREW.md`.

  **WHAT IS STILL OPEN, AND THE ITEM STAYS OPEN BECAUSE OF IT:**
  - **The last-restore date is not visible in the back office**, which this
    item's own *done when* requires. It is a front-end change and showing it
    means publishing, which is Andrew's. **Blocked, not dropped.**
  - **A restore into a genuinely separate environment** — a Supabase branch or
    a second project — would cost money and create something inside Andrew's
    organisation. **Not done, not started, nothing put on a card.** The
    paragraph he can say yes to in ten seconds is on his list.
  - **MFA on the production accounts** is in this item's fix list and is his
    alone. On his list.

  **AND THE REAL FINDING IS THE SHAPE, NOT THE PLAN.** The only backup that
  exists is one somebody has to remember to run. **That is the same disease as
  the deploy drift wearing a third hat — the system relies on a human
  remembering, and nobody was.** Twenty-two functions drifted because nothing
  required a deploy; there are no backups because nothing requires one; and the
  interim procedure written above is itself a thing a person has to remember.
  Making it automatic needs something that runs on a schedule, which needs a
  deploy, which is behind the freeze.

  **So 6.1 does not close.** What changed is that its central question has an
  answer and a date instead of a silence, and the answer is bad: **there are no
  backups.** Andrew would far rather read that this morning than discover it
  the week he moves his real business onto this.

- [ ] **6.2 — The back office cannot prove the product is healthy.**
  Netlify connected but not read; Supabase needing wiring; email delivery not
  wired; no outage history. Successful jobs are prominent and green; missing
  monitoring is faint grey. **"No alarm" is being read as "working."**
  **Fix:** outside checks for homepage, booking start, booking availability,
  sign-in and a safe database/function path. Store incidents and recovery
  times. Show failed background jobs, not only last success. Missing monitoring
  renders amber or red. Netlify's own docs say native observability has no
  alerting and limited retention, so an external check is required.
  **Done when:** a controlled failure raises an alert, appears in incident
  history, names the affected path, and clears only after a successful check.
  *A1 P1-03, P3-07, § 9*
  **BLOCKED BY THE DEPLOY FREEZE, 2026-09-20: an alert needs something running
  to raise it, and everything that runs is behind the freeze.** Not attempted;
  naming it rather than proving it again.

- [ ] **6.3 — Alert when an active detailer's booking page cannot work.**
  No services, no coverage area, no future availability, suspended account, or
  a public error.
  *A1 § 9*
  **BLOCKED BY THE DEPLOY FREEZE, 2026-09-20: an alert needs something running
  to raise it, and everything that runs is behind the freeze.** Same one-line
  reason as 6.2. Not attempted.

- [ ] **6.4 — Weak signal and retry behavior is unknown.**
  Detailers work in driveways.
  **Fix:** test current-day viewing after signal loss, safe retry on an
  interrupted update, no duplicate bookings or duplicate actions after retry,
  and a printable next-day schedule with customer contacts as an outage
  fallback.
  *A1 § 9, § 10*

---

## Wave 7 — Sales proof

**VERIFIED AGAINST THE SOFTWARE, 2026-09-20 — the pricing page and the five
examples, read the way the legal pages were: not for prose, but for places the
page says something the product does not do.**

**THE HONEST FRAME FIRST, because it changes what every finding below is
worth: none of these pages has ever been read by somebody deciding whether to
buy.** Zero paying subscriptions, one non-demo business. **So every defect
here is still free to fix** — nobody has been misled, nobody has paid on a
wrong number, and the whole of Wave 7 is a debt that has not yet come due.

**THE ONE SENTENCE THAT SAYS WHY THIS WAVE EXISTS:**

> A stranger reading that page today would be told they get unlimited photos
> and an export, and they would get roughly one photo and no export.

**7.6 IS CONFIRMED INDEPENDENTLY AND IT IS WORSE THAN ITS OWN LINE.** The item
already records "1 GB total, 10.2 MB promised to each", from the back office.
Reading it out of the database instead — `photo_total_bytes()` is 1 GB and
`photo_tenant_share()` is 100, so the cap is 1 GB ÷ 100 — gives the same
figure, which is the useful part: two independent routes agree. **What the
item does not say is that it is ENFORCED and how small it is in practice.**
`JobPhotos.jsx` refuses the file outright — *"Photo storage is full. Remove
some photos to add more."* — and the `job-photos` bucket accepts a **single
file of up to 10 MB**. **So one photo the product is willing to take uses 98%
of that detailer's entire allowance.** A feature sold as unlimited runs out on
the first job. **Services, bookings and staff logins genuinely are unlimited;
only "photos" is false.** On Andrew's list with both ways out and no
recommendation, because the answer depends on what storage costs him.

**7.7 IS WIDER THAN RECORDED: THE EXPORT IS SOLD IN TWO PLACES.** The item
names the terms and the pricing page. It is also the **home page's** answer to
*"What happens to my customers if I cancel?"* — *"You export them and go. The
list was always yours."* That is arguably the worst of the three, because it
is the direct answer to the question a nervous detailer actually asks. There
is no customer export and no photo export; the only download is the
accountant's CSV of jobs and expenses.

**7.10's `/ex5` ENTRY IS STALE.** It calls the site "Tampa Bay" and the
question about a real company's name is already answered: it is **"Sunglade
Auto Detail"** with an address on a reserved `.example` domain. "Tampa Bay"
survives only as a place — *"Mobile detailing across Tampa Bay"* — which is a
region, not a company. Andrew's list row was closed rather than left for him
to decide something already done.

**THE EXAMPLES DO NOT OVER-PROMISE, AND THIS WAS THE QUESTION WORTH ASKING.**
A real tenant site is built bespoke by an agent following
`docs/tenant-site-kit.md`, so a hand-built example IS the product rather than
a picture of it. Every headline feature on `/examples` maps to something
`get_public_business_profile` actually returns, checked key by key:

| What an example demonstrates | What backs it |
|---|---|
| ex4's before-and-after slider | `gallery_images.before_url` / `after_url`, published from the job screen by `publishToGallery` |
| ex5's "pick your vehicle and the prices change" | `services.vehicle_size_adjustments` and `vehicle_sizes` |
| ex3's "every price on the page" | `services` with `price`, `price_is_from`, `duration_minutes` |
| ex2's step-by-step walkthrough | `services`, `faqs`, `hours` |
| ex1's Work and Prices as real tabs | a build choice; the agent writes the pages |

**And the claim on the index page holds too.** It says *"Every price and time
on these is a placeholder. On a real detailer's site each one comes live from
their own dashboard."* The examples' booking sections are indeed drawings —
annotated `data-from="core.js stepsFor(addOns)"`, with no form, no iframe and
no request — and the kit makes the live half a rule rather than an aspiration:
*"A price, service, hour or plan hard-coded into the site — **No, and this is
the one hard no.**"*

**One framing point rather than a defect:** `/examples` describes ex3 as *"in
three colors you can switch between"*, which reads as a feature of that site.
It is a design choice Andrew was offered three ways; a real tenant has one
brand colour from their dashboard. An agent could build a switcher, so nothing
is promised that cannot be delivered — but the sentence describes an artefact
of the review rather than a tenant feature.

**7.12'S BLANK SECOND IS WORSE THAN "BLANK" AND IT NEARLY PRODUCED A FALSE
FINDING.** The item records that the pricing page is blank for about a second.
**It is not blank — for that moment it shows the LIST prices**, because the
founding lookup has not answered and the code deliberately does not render a
founding price optimistically. A read taken in that window showed *"$600 a
year"* in the terms against *"$40 a month"* in the ladder — a money
contradiction inside the AB 2863 disclosure block, quoted straight from the
page, and completely untrue. Re-probing the DOM after it settled gave
`$400` / `$40` / `$50` and a `$120` worked exit fee, consistent throughout.
**`docs/gotchas.md` carries it: a page read before its data resolves will hand
you a confident contradiction between two numbers that never disagreed.**

**AND THE PAGE DOES EXPLAIN ITSELF**, which was the third question and the one
that needed evidence rather than an opinion. In reading order: *"Two plans.
Three ways to pay."* → *"FOUNDING PRICE — 3 of 3 spots left. It is locked for
the life of the account and never rises while that account stays open. When
the last one goes, this page shows the standard prices instead."* → the build
fee, the monthly, the saving → *"BEFORE YOU PAY — The terms, in full. Not a
link to a policy page. This is all of it."* → eight plain clauses including a
worked example: *"On 12 months at $40 a month, walking away halfway through
costs $120."* **The one place it can be misread** is the summary strip, where
`TO BUILD IT $499 once · THEN $40 a month · SAVE ON THE YEAR $80 a year` puts
two prices and one saving in identical formatting. The label says "SAVE ON",
so it is defensible; named for whoever owns that screen rather than changed.

**NOTHING IN `app/src` WAS EDITED.** Every finding that needs a screen change
is written down for its owner, and the two that are promises about the product
rather than wording went to Andrew.


- [x] **7.1 — ~~`/examples` looks like an internal index, not a portfolio.~~**
  A plain text list of ex1–ex5: no thumbnails, no menu, no way back, no styles,
  no phone views, no call to action. **Both audits score this the worst page in
  the product** — A1 gives it 3/10 — and note the individual examples are among
  the best-looking parts of it.
  **Fix:** screenshot cards, one desktop and one phone crop each, a plain-words
  style label, "View live example" and "Build mine like this", the normal site
  menu and footer, and no "ex1" labels in customer-facing headings.
  **Done when:** a prospect understands the range and quality without opening
  every example.
  *A1 P2-01, A2 7.1*

  **DONE 2026-09-20.** `/examples` now shows the five sites instead of listing
  them: a real screenshot of each at desktop and phone, a way back, and the ask
  at the bottom. Built entirely from `scripts/build-examples.mjs`; nothing in
  `app/src` was touched.

  **AND THE THING WORTH REMEMBERING IS NOT THE PAGE.**

  > **Two of the five example sites were not merely plain. They were broken,
  > and nobody found that until somebody tried to photograph them.**

  `ex2` was showing *"Next opening Thu 11 Sep"* — **nine days in the past**.
  `ex5`'s review score was clipped to *"FROM 8… REVIEW"*, cut off behind the
  ceramic-coating card. Both were already written down in 7.10 below. Both had
  been read past for days by everybody, including two audits that scored this
  area and a session that had just finished verifying the page's claims.

  **At thumbnail size they are the first thing the eye lands on.** Shrinking a
  page to a card is a different instrument from reading it, and it found two
  faults that reading did not. **That is an argument for the method, not just a
  result** — and it is why the captures were worth the argument about whether
  to have them at all.

  Both were fixed before anything was photographed, because photographing
  around a defect hides it rather than recording it. The date fix is not a new
  date: **a placeholder for live data must never be a specific date, because a
  specific date is wrong on every day but one.** It reads "Next opening this
  week" now, which is how the other four already phrase it.

  **THE PICTURES ARE REAL CAPTURES, AND A CHECK KEEPS THEM HONEST.**
  `scripts/capture-examples.mjs` takes them at 1440 and 392 and writes a
  fingerprint of each site's source; `scripts/example-shots-check.mjs` fails
  **by name** when a site changes after its picture was taken. They are
  committed rather than generated because **this script runs on every
  production deploy** — measured: `app/netlify.toml` runs `npm run build`,
  which `app/package.json` defines as `vite build && node
  ../scripts/build-examples.mjs`, and a deploy costs 15 Netlify credits. Ten
  page loads per paid deploy, to redraw pictures that change when one of five
  files changes, is spending Andrew's money on a thumbnail.

  **The gate was broken on purpose twice, and only the second one counts.** A
  flag that moves one fingerprint inside the check names `ex3` and only `ex3` —
  but that is a simulation, the hollow shape this repo keeps catching. So a
  **real one-byte edit** was made to `y-kinzie.html`: the gate failed naming
  **ex4 and only ex4**, and reverting restored it.

  **Verified at 1440, 768, 392 and 320 with the console read at each** — no
  horizontal overflow, no console errors, every tap target at or above 44px.
  Measuring found three more defects that would otherwise have shipped: an 8px
  overflow at 768 where the phone shot hung past the viewport, a 15px-tall link
  in the closing band, and the stat strip breaking 3-then-1 at 392.



- [ ] **7.2 — The public price explanation contradicts itself.**
  Copy says "every figure is what you pay" and "nothing is added", then allows
  condition, distance, size and add-ons to change the amount.
  **Fix:** one honest formula. Only say "nothing added" if it is literally true.
  **Done when:** a customer can explain every circumstance that changes the
  displayed amount.
  *A1 P1-09*

- [ ] **7.3 — Pricing page: the decision is below the photo, and savings look like a charge.**
  $499, $40 and $80 carry similar visual weight, so the saving reads as a third
  fee. "SAVE ON THE YEAR $80 a year" reads as if the yearly price is $80.
  **Fix:** two plain plan cards at the top; separate lines for one-time build
  cost and repeating cost; "Pay yearly: $400 (save $80)"; commitment choices in
  the card, not buried; reduce the empty booking-only area; raise terms
  contrast.
  **Done when:** in five seconds a visitor can say what each plan includes,
  what is due now and what repeats.
  *A1 P2-02, A2 6.1*

- [ ] **7.4 — The home page lists the old price first in the markup.**
  "$999 to build it, then $60/month" precedes the founding price in the page
  text, so search results and screen readers may announce the wrong price.
  **Fix:** mark the struck price as the old price so it is read as crossed out,
  or hide it from assistive technology. Founding price first.
  *A2 6.2*

- [x] ~~**7.5 — Prices count up from low numbers.**~~ **Fixed 2026-09-20.**
  "$20 to build it" and "$1/month" were visible mid-count while scrolling
  past, on both the pricing page and the home page's own pricing preview.

  **AND IT IS NOT ONLY PRICES, AND NOT ONLY THIS PAGE — 2026-09-20.** `/ex1`
  rolls its rating the same way, so for about half a second an example site
  states a **0.8 rating** for a business whose rating is 4.9. That site's own
  comment already draws the line — the roll is *"NEVER on a price — a price
  that animates reads as a price that moves"* — and the line belongs one step
  further out: **a number a stranger is weighing must not animate through
  values that are not true.** A car count climbing is decoration; a rating or
  a price climbing is a claim that changes while you read it. **The example
  sites' half was DONE first — 2026-09-20, Andrew's ruling, see 7.10** — via
  a `data-still` attribute that opts one figure out of the roll while the
  rest keep climbing. **This half reuses that same switch rather than
  inventing a second one.** `app/src/landing/thread.js`'s shared `roll()`
  now checks `data-still` exactly as the tenant-site template's inline script
  already did, and it is set on the build-fee and booking-only-monthly spans
  in both `PricingPage.jsx` and `LandingPage.jsx` — four spans, the only ones
  on the platform's own site where the animated figure is a price. The
  decorative stat counters (car count, uptime, years) are untouched and still
  climb. Verified by reading the DOM at 1440, 768 and 392px: all four spans
  render their true value the instant they are revealed, with no animation
  frame ever scheduled — `roll()` returns before `requestAnimationFrame` is
  ever called when `data-still` is present, so there is no code path left
  where a low number could appear, not just a fast one. `composition`,
  `design-contrast`, `landing-pricing` and `route-contract` still pass (143
  checks).
  *A2 6.3*

- [ ] **7.6 — "Unlimited photos" against a 1 GB cap.** The back office shows
  1 GB total, "10.2 MB promised to each". Raise the storage or change the words.
  *A2 6.4*

- [ ] **7.7 — Terms contradict pricing.** Terms say data "by asking" and close
  your account by "Tell us"; pricing says "You export them and go" and "One
  button… nobody to talk out of it".
  **Fix:** align the promises, and make sure the export and cancel buttons
  actually exist.
  **Done when:** the same promise about data access, ownership, cancellation,
  export and deletion appears on every page.
  *A1 P3-09, A2 6.5*

- [ ] **7.8 — The privacy page omits services that receive customer addresses.**
  It names Supabase, Netlify, Resend, Stripe and Google. The booking address
  search visibly credits **Geoapify** and **OpenStreetMap**, so typed addresses
  go somewhere the policy does not mention.
  **Fix:** inventory every data processor and what each receives — address,
  weather, maps, analytics, error reporting, email, hosting, storage, support.
  Separate active processors from planned ones; a future Google Business
  Profile feature is currently described as if it were live.
  **Done when:** the configuration inventory and the public policy match, and
  adding or removing a processor triggers a policy review.
  *A1 P0-05, P3-10*

- [ ] **7.9 — The home page animation delays the point.**
  Several long scrolls advance a controlled sequence with large empty black
  areas; the page is about 13 screens tall; the headline types letter by letter;
  the hero product shot is too small and dim to judge.
  **Fix:** show the headline immediately; shorten the DM demonstration to about
  one screen; a larger brighter real product crop, desktop and phone paired;
  respect reduced motion; trim repeated sections.
  **Done when:** the full point is understandable with motion disabled.
  *A1 P2-03, P2-04, A2 7.4*

- [ ] **7.10 — Example site defects. Re-measured 2026-09-20; two fixed, two
  still open, one is a disagreement.**
  **This entry described a page and a set of faults that had partly stopped
  existing**, which is the same trap 7.12 carried: an item describing a
  vanished screen sends the next person looking for a defect that was fixed,
  and they conclude the check is broken rather than the note.

  > **BOTH AUDITS SCORED THAT PAGE WORST AND NEITHER ONE FOUND ANY OF THESE;
  > THEY FOUND THAT IT WAS PLAIN. IT WAS ALSO WRONG.** Five real defects on
  > the page a stranger judges this product by — an opening nine days in the
  > past, a review score clipped in half, a tab naming the wrong city, a
  > counter flashing one year on its way to six, and a headline that appeared,
  > vanished and came back — **all five found by trying to photograph it**,
  > all five fixed and re-photographed. Plus a sixth ruled on the same day
  > (the rating), and **36 British spellings across three places nobody
  > thinks of as prose** (7.13). Scoring a page is not the same instrument as
  > using it.

  **FIXED — struck with the evidence:**
  - ~~`/ex2` Delgado: "Next opening Thu 11 Sep" is in the past.~~ **Fixed
    2026-09-20.** It now reads "Next opening this week". **A placeholder for
    live data must never be a specific date, because a specific date is wrong
    on every day but one** — the other four sites already phrased it that way.
    Found by photographing the site for 7.1; see the finding there.
  - ~~`/ex5`: the review pill is partly hidden behind the ceramic coating
    card.~~ **Fixed 2026-09-20.** `.glasscard` is absolutely positioned over a
    `.hero-row` that is in normal flow, so at a wide viewport the rating ran
    underneath it and read "FROM 8… REVIEW". The row now clears the card's
    width above 1024px, and the clearance is dropped below that breakpoint
    where the card rejoins the flow.

  **ALSO FIXED, LATER THE SAME DAY — the three small ones, each
  re-photographed as it was fixed rather than in a batch at the end:**
  - ~~`/ex2`: the tab title says "Mesa AZ" while the page says Phoenix ·
    Scottsdale · Tempe.~~ **Fixed 2026-09-20.** It now reads "…Phoenix AZ".
    Mesa was not false — it is the footer's base address and one of the five
    towns covered — but the hero, the search description and the travel rule
    all lead with Phoenix, so **the one label a stranger meets first named a
    different place from the page behind it.** Same class as an example site
    carrying a real firm's name: it reads as carelessness to the only audience
    that matters, a detailer deciding whether these people know what they are
    doing.
  - ~~`/ex1`: "1 yrs" while the counter animates.~~ **Fixed 2026-09-20.** The
    stat was one string, `6 yrs`, and the count-up parses the number and
    re-prints it each frame keeping the rest as a suffix — so on the way to
    six it printed "1 yrs". **The unit moved into the label**, which is what
    the other four sites already do. Fixing the script instead would have left
    the same trap for the next person who writes a unit inside a counter.
    Proven by sampling every frame of the roll, not by watching it once.
  - ~~`/ex2`: the headline stays faded ~5s.~~ **Fixed 2026-09-20, and the
    audit was right about the symptom while being wrong about the cause.** It
    is not a slow reveal, it is a **flash**: measured, the headline is
    readable at 19ms, **hidden again at 126ms**, and back at 451ms. The reveal
    adds its hidden state by SCRIPT on purpose, so a dead script cannot leave
    a blank page — but the script runs after the hero has painted, so it was
    hiding what the visitor was already looking at. It now skips anything
    already on screen; below the fold nothing has been seen yet, so those
    still hide and still arrive on scroll. Checked after: 16 elements still
    hidden at rest, 19 revealed after a scroll, none left hidden.
    **The same detector was run over all eight example pages and ex2 was the
    only one.**

  **STILL OPEN, re-checked and still true:**
  - `/ex3`: **hero is very tall.** Now measured rather than described: it is
    **exactly one viewport — 900px at 1440x900** — against 774px for `/ex1`.
    A full-screen hero is a defensible choice, so this is left as the
    judgment it is, with a number attached for whoever takes it.

  **AND ONE MORE FIXED THE SAME DAY, AFTER IT WAS RAISED AS A QUESTION AND
  RULED ON AS A DEFECT:**
  - ~~`/ex1` and `/ex2`: the rating counts up from 0.8.~~ **Fixed 2026-09-20.**
    The stat strip rolled every number from zero, so for about half a second
    both pages stated a **0.8 rating** for a business whose rating is 4.9.
    It was raised as a matter of taste and **Andrew ruled that it is not one**:
    *"A number that climbs from 0.8 to 4.9 while somebody reads it is not
    showing them the rating at any moment during that climb; it is showing
    them a number that is not true yet."*

    > **THE RATING AND THE "1 yrs" ARE THE SAME DEFECT WEARING DIFFERENT
    > CLOTHES** — a counter printing something untrue in passing. The only
    > reason this one felt like a look-and-feel decision is that **the end
    > state happens to be flattering.** That is not a difference in kind.

    The counts still climb; a car count is decoration. `/ex1` opts out with
    `data-still` on the rating, `/ex2` by simply not carrying `data-roll`.
    Verified by sampling every frame from navigation on all three pages that
    have a stat strip: the rating reads **exactly one value, 4.9, in every
    frame**. If Andrew wants the motion back it is one attribute, and then it
    is his choice rather than an accident.

  **AND TWO THINGS FOUND WHILE FIXING THOSE, NOT YET TOUCHED:**
  - `/ex4`: **no search description at all.** Every other example site has
    one. Nothing is wrong on the page; there is simply nothing for a search
    result or a pasted link to show.
  - **The staleness gate has a blind spot, and this pass walked into it.**
    `example-shots-check.mjs` fingerprints each site's own HTML, but `/ex3`'s
    capture also contains the colour switcher, which is **injected by
    `build-examples.mjs`** and is not fingerprinted. Correcting "Colour" to
    "Color" in that control changed what the picture should show while the
    gate went on saying "current". Caught here only because ex3 was being
    re-shot anyway. **A cheap fix exists** — hash the injected block into the
    manifest alongside the site's — but it is not built tonight.

  **AND ONE IS A DISAGREEMENT RATHER THAN A DEFECT — recorded, not resolved:**

  > ~~`/ex2`: the giant "DELGADO" lettering overlaps the headline.~~
  > **DISPUTED 2026-09-20. The pixels were deliberately left alone.**

  **The audit's reading:** an enormous outlined wordmark sits behind the
  headline and collides with it; that is an overlap defect.

  **This session's reading, and the one I believe:** it is the design working.
  `docs/TASTE-NOTES.md` § 1 describes the first of the five sites Andrew sent
  unprompted — the evidence file for his own taste — in these words:
  *"An enormous outlined wordmark sits BEHIND the hero and is cropped by the
  viewport."* **The audit called a defect the thing his own reference does on
  purpose.** At card size on `/examples` it reads as a watermark the headline
  sits on, and removing it would take character out of the site.

  **Why it is written down instead of decided:** quietly editing it out would
  be a session deciding a design question because an auditor did not recognize
  a device — and quietly leaving it would be a session deciding the audit was
  wrong. **Andrew rules.** If he says mistake, this is an item with a
  reproduction already attached; if he says deliberate, the audit entry is
  struck with a reason. Either way nobody re-derives it.

  *A1 § 4, A2 7.2, 7.3*

- [ ] **7.11 — The home page's own example is a different city from the demo.**
  Home page says "Tacoma, WA"; the demo business is Long Beach, CA.
  *A2 7.6*

- [ ] **7.12 — ~~Pricing page is blank for about a second~~, and has no
  sign-up button in the phone top bar.**
  *A2 6.7, 6.8*
  **THE OBSERVATION IS RIGHT AND THE DESCRIPTION IS WRONG — corrected
  2026-09-20.** There IS a window before the page settles; A2 saw it. **The
  page is not blank in it. It shows the LIST prices** — `$999`, `$600`, `$60`,
  `$75` — because the founding offer is fetched and the code deliberately
  renders the higher figures until it answers, rather than advertising a
  founding spot that may already be taken.

  **That is more specific and more dangerous than blankness, because a wrong
  price that looks like a price is worse than an obvious gap.** A reader in
  that window is shown real, confident, wrong numbers with nothing marking
  them provisional. It cost a false finding the same day: a read taken then
  reported *"$600 a year"* in the terms against *"$40 a month"* in the ladder,
  a money contradiction inside the AB 2863 disclosure block, quoted straight
  from the page and entirely untrue — see `docs/gotchas.md` and the Wave 7
  verification above.

  **The fix is unchanged in shape and better aimed:** the window needs to show
  nothing rather than the wrong figures, or to mark them as not yet settled.
  The sign-up button half of this item is untouched and still open.

---

- [x] **7.13 — ~~British spellings on the example sites, and nothing that
  could catch them.~~ FIXED 2026-09-20, and the check is built.**
  **Thirty-six British words were reaching a visitor across the five example
  sites — seventeen different ones.** Hood written as *bonnet* (nine times),
  fender as *wing* (four), microfiber as *microfibre* (four), sedan as
  *saloon* (three), *fortnightly* (three), *colour* and *Colourway* (three),
  and one each of *neighbour*, *neighbours*, *kerb*, *grey*, *aluminium*,
  *cancelled*, *windscreen*, *boot lid* and *at weekends*. `CLAUDE.md` names "hood" by
  name. All fixed; a rendered sweep of all eight example pages now returns
  **zero**.

  **THREE OF THEM WERE WHERE PROSE IS EASIEST TO FORGET IT LIVES:**
  - **Alt text**, which is not decoration — a screen reader says it aloud, so
    a blind visitor was being told about a *bonnet*.
  - **A control injected by the build**, not by the site file: the `/ex3`
    colour switcher, which sits in the corner of every capture and reads
    "Colour".
  - **Inside a JavaScript array**, where `"Aluminium tanks and wheels
    polished"` and `"Windscreen polished"` are service bullets that only
    render when a visitor opens the right tab. **A source scan that strips
    `<script>` strips the copy**, and a rendered scan that reads one tab
    reads one eighth of it. Both instruments were needed; each one alone
    printed clean over words the other found.

  **THE GAP: NOTHING WE RUN WOULD HAVE CAUGHT ANY OF IT.** These were found by
  reading the sites, not by a check. Every gate here measures structure,
  contrast, routes or counts. **A spelling that is wrong for the audience and
  right for a dictionary passes all of them**, and it will come back the next
  time somebody writes a page.

  **AND THE CHECK NOW EXISTS — `scripts/american-english.mjs`, approved and
  built 2026-09-20.** It reads the FINISHED page rather than the source,
  because the source was the instrument that printed clean over "Aluminium
  tanks": it walks every text node in the rendered DOM — on `/ex5` that is
  32,779 characters against the 7,551 `innerText` returns, because seven of
  the eight vehicle panels are built and hidden — plus the strings a screen
  reader says out loud.

  **THE TWO DOCUMENTED EXCEPTIONS ARE ALLOWED BY POSITION, NOT BY SPELLING,
  and that distinction is the whole check.** An exception written as "allow
  the word cancelled" would have waved through the exact sentence this was
  built to catch — `/ex5`'s *"A slot cancelled late cannot be refilled"*. So
  `cancelled` passes only as the bare status token or inside a key-ish
  attribute, and `colour` only inside a key-ish attribute.

  **IT WAS BROKEN ON PURPOSE TWICE BEFORE IT WAS TRUSTED**, and each sabotage
  aims at a different half:
  - `--break=mute` removes three words from the list. The canary stops firing
    and `receipt.mjs` refuses the receipt.
  - `--break=lax` turns the two exceptions back into spelling rules. It then
    misses "colour" in prose and "cancelled" in a sentence — which is the
    proof that the positional rule is load-bearing rather than decorative.

  The canary is **a real page, really loaded, with British prose injected into
  its live DOM** and read by the real scanner — not a flag that pretends. It
  runs both directions: seven planted words must be caught, and the bare
  "Cancelled" chip and `data-step="colour"` must NOT be.

  **IT FOUND A 37th INSTANCE ON ITS FIRST RUN, and not on an example site.**
  The platform's own pricing page said *"Cancelling stops the next charge"* —
  prose, not a database value. Fixed, along with four more the same word had
  on screens behind sign-in that the check cannot reach, each with its Spanish
  key moved in the same edit. **Three remain in developer comments and were
  left**; they are not what a customer reads.

  **WHAT IT STILL CANNOT DO, said out loud:** bare "wing" is not in the word
  list, because a wing is a real part of an American car — and bare "wing" was
  four of the original 36. It scans the 11 pages reachable without signing in;
  everything behind a login needs a seeded session and is not covered. A word
  list is maintenance, which is exactly the "grep-based check coupled to a
  spelling rather than a behavior" `docs/gotchas.md` warns about. **The
  argument for it is that here, spelling IS the behavior.**

  *Found 2026-09-20 while fixing 7.10. Not from either audit — neither
  mentions it.*

## Wave 8 — Field usability

A1 is explicit that its browser **could not simulate a real phone** and warns:
do not turn "looked narrow on desktop" into "mobile passed." A2 never checked
the dashboard or back office at phone width at all.

- [x] **8.1 — MEASURED 2026-09-19. Sweep every dashboard tab and dialog at
  1440, 392 and 320.** Today, Calendar, Money, Clients, Business, Settings and
  every pop-up. `scripts/sweep-widths.mjs` was the instrument and it was broken
  on purpose three times first.

  **THE ITEM ASKED ABOUT DIALOGS AND THE SWEEP HAD NEVER OPENED ELEVEN OF
  THEM.** The product renders fourteen `<Sheet>`s and a photo lightbox; the
  expectation file named five. **The two gear screens found on 2026-09-16 were
  missing from the QUESTION rather than from the run, and so were these** —
  new booking, Finalize payment, Send a text, Log a bulk job, and the seven
  editors behind Services & add-ons, Booking rules and How you get paid. Every
  one came out `clean` by never being asked about.

  **EVERY SINGLE FINDING IS ON A SURFACE THAT WAS NOT IN THE QUESTION.** The 84
  surfaces already being swept are clean at all three widths. The eleven new
  ones carry all eleven findings.

  **Four defects in the instrument came out of doing it:**
  - **`job record · to do` had silently stopped being measured** — caught by
    reading the expectation diff, not the run. It came off today's rail, the
    seed hangs "completed" off the hour it runs, and after 17:00 there is no
    job still to do. It now falls back to the first `Coming up` job.
  - **`job record · tomorrow` had NEVER measured anything in its life.** It
    matched a `.row-item` containing "Tomorrow", and `Today.jsx` draws that
    word as a `<p class="jw-day">` SIBLING above the rows. **Same shape as the
    setup-row eyebrow found 2026-09-16**, and its failure line advised a
    re-seed, which fixes nothing. Pointed at the real door, the sentinel
    immediately failed it: a pending request dated in the future is in
    `Coming up` too, so it was opening the record `job record · a request`
    had already measured. Deleted rather than re-aimed — `to do` covers it.
  - **A locator that reached the screen BEHIND the one being measured.**
    `getByRole("button", {name: "Finalize payment"}).first()` resolves to two
    buttons at 392 and the first is on the Today rail under the open sheet.
    Only the sheet's backdrop made it fail loudly. Both are scoped to the
    record now.
  - **`NAMED()` is the wrong matcher for a button written `+ {t("Category")}`**
    — its accessible name is "+ Category" and `NAMED()` anchors. Five dialogs
    printed NO SUCH BUTTON against five buttons plainly on screen. **The
    2026-09-08 `NAMED`/`NAMED_TEXT` bug in its FOURTH home.**

  **THE FOUR GATES, PROVED BY BREAKING SOMETHING ON PURPOSE EACH TIME:**
  - **Expected counts** — 84 → 95 at 320, 95 at 392, 94 at 1440 (1440 drops
    `Calendar · filters open`, a phone-only state above `--wrap`). The diff
    was read before it was approved, which is how the vanished `to do` was
    caught. Sabotage: one dialog deleted from the walk → `EXPECTED-COUNT GATE
    FAILED at 392px: expected 95 surfaces, measured 93 / NEVER MEASURED new
    booking / NEVER MEASURED Business · a surcharge`.
  - **A guard that could not fail** — the first draft waited for a `.sheet` to
    exist, and two of these dialogs open ON TOP of one, so the thing it waited
    for was already there. It counts sheets before and after now. Sabotage:
    the new-booking trigger repointed at the Today tab → `NOT MEASURED — the
    button was pressed and no new sheet arrived (0 open before, 0 after)`.
  - **The canary at the two new widths.** Sabotage: the canary div narrowed to
    10px → `NOT CAUGHT — CHECK missed a defect handed to it on purpose. Every
    clean line above is void.`
  - **`receipt.mjs` caught both sabotages independently**, recomputing the
    verdict rather than trusting the run: `canary did NOT fail` and `target
    counts disagree: expected 95, discovered 93`.

  **DECLARED AND DELIBERATELY NOT REACHED, said out loud in the run rather than
  left out:** the photo lightbox (`seed-demo.mjs` attaches no photos to any
  booking) and the timezone guard (the path to it writes a live setting
  mid-sweep).
  *A2 4.12, 5.7, A1 § 10*

- [x] **8.1a — DONE 2026-09-19. The eleven defects 8.1 found.**
  **Checked by:** `node scripts/sweep-widths.mjs 320 1440 392` exits **0** —
  *clean at 320, 1440, 392: nothing off the screen, nothing outside its own
  box, no boxes touching* — 284/284 surfaces (95 / 94 / 95), canary caught at
  all three widths, sentinel clean, and `node scripts/receipt.mjs` grades the
  receipt **PASS, 284/284 targets, 123,808 assertions**.

  **NINE OF THE ELEVEN WERE ONE LINE.** `.segmented` was `inline-flex` with no
  wrap and `white-space: nowrap` on its buttons, so any segmented control
  wider than its box ran off the screen instead of going to a second row.
  `flex-wrap: wrap` on that one shared rule fixed **both** the Finalize
  payment control (six options, 136px over at 392) and New booking's Vehicle
  size row (25px outside `div.grid2`) at once. **Proved by putting the defect
  back:** with `flex-wrap` removed the five New booking findings returned
  exactly as first reported, and vanished again with it restored.

  **THE 320 HALF NEEDED ITS OWN LINE, AND `flex-wrap` COULD NOT REACH IT.**
  Below 361px `.segmented` becomes a one-row grid of equal columns — a rule
  whose own comment says "three sentence-length choices" — and wrap is a flex
  property, so it does nothing to a grid. Measured, not assumed: the six
  buttons ran 23→347 in a box ending at 301 with wrap already applied. Six
  now go in two columns, **scoped with `:has(> button:nth-child(6))` so
  nothing that fits today moves** — the four-option payment-status control on
  the same sheet measures 23→297 inside 301 and keeps its single row.

  **THE THIRD WAS NOT IN THE SHEET AT ALL.** "Card payments" and "Other ways
  to pay you" are siblings in `.settings-body`, which is `display: block` with
  no gap, and both carry `margin: 0` — card one ends at 324 and card two
  starts at 324. **It touches with the sheet CLOSED too**, so
  `Business · How you get paid` reported clean over it and only
  `Business · a way to be paid` caught it; one surface seeing what its
  neighbour missed is the argument for measuring both. Fixed with a top margin
  rather than a `.group` wrapper, because
  `.settings-col > .settings-body > :last-child` selects a direct child and a
  new element between them changes something nobody asked about.

  **Also checked:** all four must-run gates green — `composition` 97/97,
  `design-contrast` 0 failures, `landing-pricing` 109/109, `route-contract`
  34/34 — and `npm run build` succeeds. Nine suites in `tests/` fail, and
  **all nine fail identically with these three files reverted**, so they are
  not from this change.

  **The eleven as first reported, kept because the measurement is the record.**
  All eleven were on dialogs that had never been opened at any width.
  | Width | Dialog | What is wrong |
  |---|---|---|
  | 392 | **Finalize payment** | the Upgrade / Add-on / Custom charge segmented control is **136px past the right edge** and 155px outside its own label; **Tip** is 47px over and **Discount** 132px over |
  | 320 | **Finalize payment** | **Discount** is 27px past the right edge |
  | 392 | **New booking** | the Vehicle size row is 6px past the right edge and **25px outside its parent**; the Small/Medium/Large control and the **Large** button go over with it |
  | 1440 | **How you get paid**, the "Add a way to be paid" sheet | two cards stacked with **0px between them** — "Card payments" runs straight into the card below, so they read as one box |
  **Done when:** `node scripts/sweep-widths.mjs 320 1440 392` is clean at all
  three and the expected-count gate still passes 95 / 94 / 95. — **met.**

- [x] **8.1b — DONE 2026-09-19. The demo cannot hold a finished job in the
  small hours, and the gate went red over it.**

  **Checked by running it at both hours, not by reasoning about one.**
  Against a database seeded as if it were 01:00, `node scripts/sweep-widths.mjs
  320 1440 392` exits **0** — `expected-count 320px: 92/95 surfaces, 3 declared
  unreachable (job record · finished, job record · finalize, job record · send
  a text), every one accounted for`, the same at 1440 and 392 — and
  `receipt.mjs` grades it **PASS, 275/275 targets, 9 skips** (three labels at
  three widths) recorded with their reasons under the allowlist that file
  already validates. Re-seeded normally, the same command exits **0** with
  **284/284, skipped_targets 0 and no allowlist at all**: the machinery is
  dormant whenever everything is reachable.

  **HOW 1am WAS SIMULATED, because "I reasoned about it" is not an answer.**
  The system clock was not touched. `Date.now()` was pinned to 01:00 business
  time **for the seed process only**, and the seed re-run. That is the right
  thing to move and not a convenience: `Today.jsx` decides a job is finished
  from its STORED status (`status === "completed"` with no `finalized_at`),
  never from the clock, and `seed-demo.mjs` decides that status with
  `hasEnded`, which is `Date.now()` against the job's end time — **so the
  reachability of these three surfaces is settled entirely by `Date.now()` at
  SEED time.** Move it and the database is the one a 1am seed writes.
  Confirmed in the database before the sweep ran: five bookings dated today,
  **all five `confirmed`**, `needsPay` = 0, and one completed-and-unpaid dated
  the 18th. **The honest limit:** the browser's own clock stayed on the real
  afternoon, so this reproduces the 1am DATA and not a 1am screen. The data is
  what the skip turns on.

  **THE MECHANISM IS THE SUBSCRIPTION ONE, NOT A SECOND ONE.** The two
  `subscription · …` surfaces print `NOT MEASURED — <reason>`, raise no
  finding, and are absent from the expectation. Same printed line, same silence
  in `found`. One thing is added: the skip is **recorded** as well as printed,
  so the gate can tell a surface that said why from one that just went missing.
  It had to be: those two labels are absent from the expectation only because
  the run that wrote it never measured them — an accident that reads like a
  decision — and **deleting these three lines from the file would also have
  made the run pass, which is the wrong fix.** After about 08:45 they are
  reachable and must be measured. The labels stay.

  **A SKIP IS A MEASUREMENT, NOT A CLAIM.** Every skip carries a probe that
  re-asks whether the surface was reachable after all, and a skip over a
  reachable surface is refused and fails the run. **Proved by sabotage:** the
  `finished` locator was pointed at a class that does not exist, so the skip
  fired while the rail row was still sitting there —

      job record · finished    SKIP REFUSED — declared unreachable, and the
                               probe found 1. A skip over a surface that was
                               there is a screen removing itself from the check.

  — and **because the skip was refused it was never recorded**, so the gate
  went on to fail it anyway: `EXPECTED-COUNT GATE FAILED at 392px: expected 95
  surfaces, measured 94 / NEVER MEASURED job record · finished`. `receipt.mjs`
  failed the same run independently on the counts. Two doors, both shut. The
  sabotage was reverted and the selector re-checked.

  **Also gated:** a label that is declared unreachable AND measured in the same
  run prints `SKIP CONTRADICTED` and fails — one of the two is wrong about the
  screen and it cannot be decided from inside the run.

  **One flake worth recording, not from this change:** the first afternoon run
  died at 320 clicking the Victor Salas row, blocked by a closing sheet's
  backdrop. It did not reproduce (95/95 at 392, then 284/284 twice). ~~The
  escape-then-`settle(700)` in the Clients block is racing the 180ms exit under
  load. Not chased here~~ — **chased and fixed 2026-09-19, and the diagnosis
  above was wrong.** `docs/gotchas.md` says to keep the reproduction when the
  explanation dies, so both stay here.

  **Instrument-only fix, no ROADMAP item of its own** (this paragraph is the
  only place it was written down, and one was not invented for it):
  - **The cause was not the animation.** Measured at 320: the client record and
    the job record are **one sheet whose contents swap**, and the first Escape
    is a BACK STEP inside it, not a close — 1 sheet before, 1 sheet three
    seconds later, 0 only after a second Escape. Two Escapes fired too close
    together lose the second one mid-transition, the sheet stays open for ever
    and the click can never land. 700ms was not too short; nothing checked
    whether the press that mattered had worked.
  - **`closeOverlay()` now dismisses until nothing is covering the page**,
    bounded at five presses, loud if it cannot get there.
  - **Each width is its own unit of work.** A throw used to end the process
    past the gate, the contact sheet and the receipt — eight minutes producing
    no verdict at all. It now aborts that width by name, the others finish, and
    everything downstream still runs.
  - **Checked by breaking both.** With the old fixed pause shrunk to 0 the race
    reproduces every time: pre-fix it ends in a `TimeoutError` stack with **no
    receipt and no contact sheet written**; with the width isolated it prints
    `WIDTH ABORTED at 320px after 41 surface(s)`, the gate says `NOT GRADED —
    the 54 it never reached are unmeasured, not clean`, both artifacts are
    written and `receipt.mjs` fails it on the counts. With `closeOverlay` and
    **zero** trailing pause it is 95/95 clean. Forcing 1440 to throw partway:
    320 and 392 both finished 95/95 and were graded, 230 surfaces measured,
    exit 1, receipt written and FAILED. Sabotage reverted; final run
    **exit 0, 284/284, 0 findings**, receipt PASS.
  - **And the first version of the fix was itself wrong, caught by the gate.**
    `closeOverlay` counted `.sheet` only, and above `--wrap` a record is
    `.col-2.record` — so at 1440 it pressed Escape **zero** times where the old
    code pressed twice, the record stayed open and the walkthrough block
    measured nothing. Seven `tour · step N` surfaces vanished with no line
    saying why, and the expected-count gate is the only reason that was not
    shipped as a clean run. Same two-container lesson as `inRecord()`, in a
    second home the same week.

  ~~**Original note, 2026-09-19.**~~ The demo cannot hold a finished job in
  the small hours, and the gate goes red over it.

  **DONE: the seed now holds one, and it cannot depend on the clock.**
  `seed-demo.mjs` gained a single row on `openDay(-1, -1)` — the most recent
  open day BEFORE today, which has ended at every hour of every day — marked
  `completed` with no `paid`, which the writer stores as
  `payment_status: pending, finalized_at: null`. The `hasEnded` rule above it
  is untouched, because it is right. **Checked against the database, not the
  screen:** one completed-and-pending booking dated 2026-09-18 while the
  business-timezone date was 2026-09-19 — dated strictly before today, so
  ended whatever the hour. 32 bookings seeded, 32 written, none refused by the
  double-booking constraint. It is also true of a real business: at one in the
  morning a detailer has yesterday's last job finished and not yet written
  down, which is the whole point of the warn-box.

  **STILL OPEN, and it is the larger half.** That rescues
  `Money · an unpaid job` only. The other three — `job record · finished`,
  `job record · finalize`, `job record · send a text` — are reached from
  **today's rail**, and a real detailer at 1am correctly has nothing finished
  on today. **So the product is right and the expectation is wrong**, and no
  seed row can fix it: overnight there is exactly ONE finished-and-unpaid job
  in the world, so any second door to it is the same record under a second
  name and the sentinel is correct to refuse it.
  **Fix:** teach the expected-count gate to accept a surface that printed a
  declared, machine-readable skip, the way the two `subscription · …`
  surfaces already sit outside the expectation. Then a surface the demo cannot
  be in the state for is absent WITH A REASON rather than absent.
  **Residual after that, worth knowing:** on the first of a month before 08:45
  the seeded row is in the previous month and Money's default period is Month,
  so `Money · an unpaid job` is out of reach for about twelve short windows a
  year. The alternative is dating a completed job in the future, which is the
  exact defect `hasEnded` exists to prevent.
  **Done when:** `node scripts/sweep-widths.mjs 320 1440 392` exits 0 at 3am
  and at 3pm. **Not yet true — it was last proved at 16:30 only.**

  ~~**Original note, 2026-09-19.**~~ `seed-demo.mjs` marks a job completed once it has
  ENDED — which is the right rule — so between midnight and the first shift
  finishing (about 08:45) there is no completed job at all. Four surfaces
  — `job record · finished`, `job record · finalize`, `job record · send a
  text` and `Money · an unpaid job` — are then unreachable and the
  expected-count gate fails naming all four, **at three widths, over a product
  nobody touched**. It was already true of two of them before 8.1 and nobody
  had hit the hour. The run now prints the cause and says to re-seed, but the
  cause is not the seed being stale — it is that a 95-surface baseline is only
  satisfiable for about 15 hours in 24.
  **Fix:** either seed one completed-and-unpaid job that does not depend on
  the clock, or teach the expected-count gate to accept a surface that printed
  a declared machine-readable skip, the way the two `subscription · …`
  surfaces already are.
  **Done when:** the same command passes at 3am and at 3pm.

- [ ] **8.2 — Real-device pass on a real iPhone and a real Android.**
  One-handed, in bright daylight, browser chrome visible, keyboard up. Cover
  the sticky footer, address suggestions, date picker, dashboard actions,
  calendar, call/text, photo upload and emergency admin use. Record where
  thumbs cannot reach and where text becomes unreadable.
  **This cannot be done from this machine.** It is Andrew's, or a phone he
  hands to somebody.
  *A1 § 10*

- [ ] **8.3 — Small grey text is unreadable outdoors.**
  Both audits, everywhere: body copy, letter-spaced all-caps micro-labels,
  progress text, tab labels, service details, warnings, "then $40/month $60",
  labels under the money numbers. In the back office, missing monitoring is
  quieter than successful jobs.
  **Fix:** raise contrast and size; simplify micro-label styles; warnings
  outrank healthy information. WCAG 2.2 wants 4.5:1 for normal text and 3:1 for
  large.
  **Done when:** `node scripts/accent-sweep.mjs` and the contrast suite pass,
  **and** it has been read outdoors — automated checks do not reproduce glare.
  *A1 P2-05, A2 7.5*

  **MEASURED 2026-09-20, AND THE NUMBERS ARE THE POINT.** Both audits listed
  this as "everywhere", which is a description rather than a list. So every
  string on every screen was measured where it is painted — **1,910 text
  elements across 32 screen/width combinations**: Today, Calendar, Money,
  Clients and Business signed in as the demo owner, plus the booking page, the
  landing page and pricing, each at 1440x900, 768x1024, 392x844 and 320x844.
  Console clean at every one.

  **EXACTLY ONE STRING IN THE PRODUCT FAILS WCAG, AND THE EXISTING GATES
  COULD NOT SEE IT.** `tests/design-contrast.test.mjs` passes and always did;
  `accent-sweep.mjs` prints SWEEP CLEAN and always did. Both measure the token
  PAIRS the system promises, and a pair does not know which surface a label
  lands on.

  | | |
  |---|---|
  | what | the time under a message bubble on the landing page, `.ld .bub .t` |
  | measured | **4.20:1** — `#7B858A` on `#1E2327`, 11px, weight 400 |
  | needed | 4.5:1 |
  | why | `--fog-2` is the documented floor for 10–13px labels and holds where it was measured — 4.90:1 on `--ink-1`, 4.59:1 on `--ink-2`. The bubble is `--ink-3`, the highest surface, where the same colour is 4.20 |
  | fixed to | `--fog` on the same surface: **5.67:1** |

  **`booking.css` already carried this exact note for its own page** — *"--fog,
  not --fog-2 … --fog-2 measures 4.20:1 there"* — and `landing.css` never got
  it. Every other `--fog-2` use on that page sits on a lower ground and passes.

  **THE INSTRUMENT IS THE REAL DELIVERABLE: `scripts/contrast-insitu.mjs`**,
  and it now carries the same discipline as everything else — a receipt, a
  declared target count (the screen/width grid, written down rather than
  counted from the run, so a walk that visits three screens fails on
  arithmetic), and a row on `CLAUDE.md`'s before-you-finish list so it runs
  without anyone remembering it exists.
  **PROVEN BY PUTTING THE DEFECT BACK IN THE STYLESHEET**, not by runtime
  trickery: reverting 8.3's one-line fix and running the check normally took
  the receipt to `FAIL contrast-insitu — 1 failure(s) recorded`, naming the
  string at 4.2:1; restoring the fix took it back to `PASS — 32/32 targets,
  1910 assertions, canary failed as required`. `--break` does the same
  sabotage from the browser side and inverts the verdict, so a run that finds
  nothing under it is the failure.
  **`sweep-widths.mjs` WAS DELIBERATELY NOT TOUCHED.** Folding this walk into
  the width sweep is the obvious move and it was refused: that instrument
  belongs to the other session and was mid-flight on its own detectors, and
  two sessions editing one measuring tool produces a tool neither can vouch
  for. This stays standalone; whoever owns the sweep can fold it in later.

  It plants a label nobody can read (2.92:1) before each walk and **prints
  VOID if its own findings do not contain it** — caught on 32 of 32 runs —
  and prints a census of how many strings each screen offered, because a
  contrast walker that matches nothing prints the same word as a clean
  product. An earlier draft of it measured Today four times while reporting
  four screens, because `?tab=` is not how this app switches; it reads the tab
  bar now.

  **OPEN FOR ONE REASON ONLY: everything buildable is built and measured, and
  the only thing left is a person standing outside in daylight looking at a
  screen.** It is a row in `FOR-ANDREW.md` — one screen, one question, thirty
  seconds — not unfinished work.

  **NOT TICKED, AND THE REASON IS IN THIS ITEM'S OWN DONE-WHEN: it has not
  been read outdoors.** Both automated halves pass — `accent-sweep.mjs` clean,
  the contrast suite clean, and now every rendered string measured. Glare is
  the half no script reproduces and it is Andrew's to do, next to a car, in
  sunlight. **If he reads it outdoors and it holds, this closes with nothing
  further to build.**

- [x] **8.4 — DONE 2026-09-19. Booking choices do not look interactive.**

  **Done when: "a user can name the selected choice without comparing shades."
  I believe that bar is met, and the reason is that the card now says its own
  state in a word.** A chosen service reads **"Express Wash  ✓ Added"** — a
  tick and a translated label beside the name, where a person reads to find out
  what the card is. No two cards have to be held side by side, and nothing
  about it depends on seeing a colour: the word survives greyscale, a
  colour-blind customer and a tenant whose accent is nearly black. The ring
  went 1px → 2px as well, but **the ring is no longer what carries the
  answer**, which is the whole point of the item.

  **Checked by looking, at 1920, 1440x900, 768x1024 and 392x844, plus
  `?lite=1`** — selected and unselected, with a disclosure open, ten
  screenshots in `artifacts/8.4/`. Reduced motion is pixel-for-pixel the same.
  `accent-sweep.mjs` **SWEEP CLEAN**; `design-contrast` 0 failures;
  `composition` 97/97, `landing-pricing` 109/109, `route-contract` 34/34,
  `booking-core` 290/290. `npm run build` succeeds. Console at every width
  carries only the two pre-existing React Router v7 future-flag warnings.

  **THE ONE THAT MATTERED, AND I NEARLY SHIPPED IT.** The "Added" badge first
  printed `--bk-accent-text` on a 16% tint of the accent. `docs/design-system.md`
  says in as many words that **a tint of the accent is a ground**, and the
  booking text variant is corrected against `--ink-0` only because the file
  printed it in two places that were both borderless rows ON the ground. This
  was a third place and a different ground. Swept across the accent extremes:
  on a **black tenant pick it measured 3.14:1**, under the 4.5:1 floor — a live
  defect for any detailer who picks a dark colour. It is `--bk-text` now:
  **11.93:1 there, 8.42:1 at its own worst** across every preset. The tint
  still carries the tenant's colour; the word no longer spends it.
  **`accent-sweep.mjs` measures the two places that already existed and would
  not have caught this**, which is worth knowing before the next badge.

  **Each item, and what it actually was:**
  - **The eye → words.** "What's included" with a chevron, a full-width 44px
    strip under the face — probed with `elementFromPoint` at centre and ±15px
    at all five viewports, 44px tall every time, so it is an easier target than
    the 46px square it replaces. **The eye was Andrew's own ask** and the code
    said so; his newer instruction supersedes it, and the trade the old comment
    defended (a worded control costs a row) is real and now spent. Written into
    the file rather than deleted.
  - **Stronger card edges** — `--bk-hairline` → `--bk-border`, this file's own
    "a line that has to be seen". **Scoped to `.selectable`**, so the read-only
    cards on confirm, manage and plans are untouched.
  - **More legible price** — 15px → 17px at weight 600. **Measured first: the
    colour was never the problem.** `--bk-text` on a card is **16.61:1**. It was
    hierarchy, so no colour token moved. Scoped to `.bk-card.selectable`;
    `.bk-price` is used by eight files and none of the others asked to shout.
  - **Stronger progress** — the rail 3px → 5px. Again measured first: the step
    label clears **6.72:1**, so "faint" was not a contrast failure either. The
    label takes `--bk-text-2` (12.31:1) **only inside `.bk-step-head`** —
    `.bk-step-label` is the section eyebrow on eight files and
    `docs/screen-rules.md` is explicit that making every eyebrow louder is the
    defect, not the fix.
  - **The duplicated bullet — and it was ONE service, not three.** The first
    pass removed "Everything in the <previous tier>" from three feature lists;
    checking the rows showed only **Wash & Wax** repeats its own description.
    The other two say something different in their descriptions, so that bullet
    is the only place the customer is told the tier builds on the one below —
    deleting it removes a fact, not a repetition. Two restored.
    **Fixed in the seed, not in the product:** a service's description and
    features are the DETAILER's own words, and `docs/gotchas.md` says a sweep
    that reaches somebody's own writing stops there — while **the seed is
    ours**. A de-duplicating rule in `StepServices.jsx` would be us editing his
    copy inside his own product.

  **Spanish done in the same edit, in the right catalogue.** The booking page
  reads `app/src/lib/strings/es.js`, NOT `appEs.js` — `appI18n.js` says the two
  scopes "neither can move the other". `"What's included" → "Qué incluye"` and
  `"Added" → "Añadido"`, both confirmed rendering on the page.

  **NOT MINE, AND PRE-EXISTING:** `scripts/sweep-booking-steps.mjs` dies at
  **step 3, the vehicle step**, on a disabled Continue. Verified by stashing
  every change in this item and re-running — **it fails identically without
  them**. Steps 1 and 2, the two this item touches, measure and pass. Not
  chased: out of scope for a named-items-only change.
  *Fixed 2026-09-19 — it was the script, never filling the required Year. See
  2.6 above. All seven steps sweep now.*

  ---

  **AND THAT SWEEP THEN CAUGHT A REGRESSION THIS ITEM CAUSED. 2026-09-19,
  measured by stashing these changes and re-running:**

  | step 1, "Pick your services" | before 8.4 | after 8.4 |
  |---|---|---|
  | 1920 | fits, 133px spare | **over by 131px** |
  | 1440 | fits, 10px spare | **over by 254px** |
  | 768 | fits, 166px spare | **over by 98px** |

  **That is the 44px "What's included" row, six services deep — 264px.** It is
  the cost of the trade this item made knowingly: the old comment defended the
  eye ON HEIGHT and said a worded control takes a row of its own, and that was
  written into the code when the eye was replaced. **What was not known then is
  the number, and the number turns a step that fitted at three widths into one
  that does not.** Add-ons moved too, by about 9px at 1920 — the 15px→17px
  price, three cards deep.
  **W16 is the rule this breaks** and the sweep reports `25 steps do not fit`
  as a standing verdict, so step 1 has joined a list rather than started one.
  **Not reverted**: the words were asked for twice, by two audits and by
  Andrew, and the done-condition of this item is met.

  **ANDREW'S DECISION, 2026-09-19: shrink the paint, keep the 44px target.**
  Applied. The row paints **27px** and the target is **45px**, held by an
  absolutely positioned `::after` that takes no part in layout —
  `docs/screen-rules.md`'s own pattern, the one it wrote for a 7px rail dot.

  **The targets TILE rather than fight**, which is the half of that rule that
  bites, and it was probed pixel by pixel rather than reasoned about: the reach
  is **9px up, 8px down**, `.bk-svc .bk-pick` gives up exactly the 9px above so
  the two boxes meet, and below, the 8px lands in the 8px card gap. Walking
  down from the paint's bottom edge at 1920: **+4..+8 hit the control, +9
  onward hit the next card's face.** No pixel belongs to both. `elementFromPoint`
  at the centre and ±15px returns the control at all four widths and in
  `?lite=1`; the face still selects at its own centre.
  **A symmetric −8px was tried first and measured 42px — under the floor.**
  That is why the inset is asymmetric, and why it was measured rather than
  assumed: a bounding rect cannot see any of this.

  | step 1 | pre-8.4 | after 8.4 | after paint/target |
  |---|---|---|---|
  | 1920 | fits, 133 spare | over 131 | **fits, 25 spare** |
  | 1440 | fits, 10 spare | over 254 | over 98 |
  | 768 | fits, 166 spare | over 98 | **fits, 58 spare** |
  | 392 | fits, 46 spare | over 218 | over 62 |

  **Two widths recovered; two did not, and the residual is exactly 108px at
  both** — six cards × 18px, which is what a worded row costs after the paint
  is as small as it can be while its target clears 44. **That is the floor of
  this trade, not a tuning failure.** Closing the last 108px means taking the
  words off a row of their own, which is the change that was asked for.
  Add-ons is **9px worse at every width** (the 15→17px price, three cards);
  left alone, on a step that overflows by 476 for a reason Andrew chose.
  **The whole flow went from 25 steps not fitting to 17.**

  **AND THE WORST NUMBER IN THE FLOW IS A DECISION, NOT A DEFECT — SAY IT OUT
  LOUD RATHER THAN QUIETLY PICKING ONE.** Add-ons overflows by **476px at 392,
  56% of the screen**, and the sweep names the culprit: `.bk-planpitch`, 472px.
  That is the monthly-plan pitch, and `BookingPage.jsx` and `PlanRows.jsx` quote
  Andrew's instruction three times — *"pretty big and pretty visible… like, just
  in the whole screen, like, not a button to go to the screen, but just the
  whole screen."* **Nothing was shrunk.** The pitch alone is more than half a
  phone screen because he asked for it to be.
  **W16 ("every step fits its screen") and that ruling were in direct conflict
  on this one step, and neither could be honoured without breaking the other.**

  **ANDREW'S DECISION, 2026-09-19: EXEMPT THE STEP, NOT THE CONTROL.** His
  reasoning, in his words: *"the plan-pitch size is a specific, deliberate,
  repeatedly-quoted design ruling from Andrew for that exact control; W16 is a
  general audit rule that predates this control. The specific instruction wins
  over the general one."*

  **So W16 IS SATISFIED, WITH ONE DOCUMENTED EXCEPTION: the add-ons step.**
  `.bk-planpitch` is untouched and stays full-screen. `sweep-booking-steps.mjs`
  reports the exemption and the reason every run rather than a failure:

      2/7 Add-ons   EXEMPT from W16 — over 476px, and .bk-planpitch is 823px of it
        Andrew's ruling, 2026-09-19: the plan pitch is full-screen by
        instruction, so this STEP is exempt and the CONTROL is untouched.
        Everything else on the step still has to fit, and does — without the
        pitch it is 347px inside the screen. ROADMAP 8.4.

  **THE EXEMPTION IS NARROW THREE WAYS, so nobody has to re-litigate this and
  nothing can hide behind it:**
  1. **It needs `.bk-planpitch` on the page.** That control is on one step and
     the measurement returns 0 for it everywhere else, so no other step can
     reach the exemption.
  2. **It is arithmetic, not a name.** The step is re-judged with the pitch's
     height discounted and everything else on it is still held to W16 to the
     pixel. Measured: without the pitch the step fits by **465px at 1920, 342
     at 1440, 498 at 768 and 347 at 392**, so no tolerance is used and none is
     needed.
  3. **It stops firing the moment anything else grows.** Proved by sabotage:
     a `min-height: 1200px` on `.bk-choices` — a different control on the same
     step — and the exemption vanished, the step reporting a plain
     `over 1089px (121% of the screen)`. Reverted.
  **And steps 1 and 3 still fail in the same run**, which is the live proof it
  has not leaked sideways.

  **`sweep-widths.mjs` needed nothing.** Checked rather than assumed: it has no
  vertical-fit check at all (zero references to W16, fit, or viewport
  overflow), no `.bk-planpitch` reference, and the customer flow's add-ons step
  is not one of its surfaces. Adding an exemption there would be a rule naming
  something nothing carries.
  **The flow now reports 14 steps not fitting, plus 3 exempt readings** — down
  from 25 before this session.

  ~~**Original, 2026-09-19.**~~
  Selection is a thin green border; the details control is a tiny eye icon;
  prices and descriptions are dim; the progress label is faint.
  **Fix:** "What's included" as text rather than an eye icon; a checkmark or
  "Added" on selected cards; stronger card edges; more legible price text; a
  stronger progress indicator. Also remove the duplicated first bullet
  ("Everything in the Express Wash" appears as both the sentence and bullet 1).
  **Done when:** a user can name the selected choice without comparing shades.
  *A1 P2-06, A2 2.11, 2.12*

- [ ] **8.5 — Keyboard, screen reader, zoom, large text and reduced motion.**

  **THE STATE OF ALL FIVE PARTS, 2026-09-20:**

  | part | state | waiting on |
  |---|---|---|
  | **8.5e** reduced motion | **CLOSED** | nothing |
  | **8.5a** keyboard | **CLOSED** | nothing |
  | **8.5c** zoom to 200% | **CLOSED** | nothing |
  | **8.5d** large text and spacing | **CLOSED**, one gap stated beside the tick | nothing |
  | **8.5b** screen reader | **OPEN.** Structural half **measured and clean across all 11 public and dashboard screens**, including the confirmation screen that is not a route. Nothing here is unworked | **A person, with a screen reader on, answering whether a booking can be finished by listening.** One row in `FOR-ANDREW.md`, thirty seconds. No instrument can close it |

  **The item stays open because 8.5b does**, and 8.5b is waiting on ears
  rather than on work.
  Never checked.
  *A1 § 10*

  **SPLIT ACCEPTED 2026-09-20, five parts, in this order. EACH CARRIES ITS
  OWN DONE-WHEN so none can be ticked on the strength of another.**

  **What was measured before the split was proposed**, predictions declared
  first: seven screens, **187 interactive elements**, two canaries on every
  screen (a button with no name, a clickable div nothing can focus), **both
  caught 7/7**. Two predictions were wrong IN THE PRODUCT'S FAVOUR — the
  calendar's day cells ARE keyboard reachable, and every one of the 187
  controls has an accessible name — and a third "finding" was the probe's own
  fault: it flagged the booking service card, a `div` with `cursor: pointer`
  that CONTAINS a `<button aria-pressed>` Tab reaches and Enter operates.
  Detector corrected, then re-run.

  **8.5e — REDUCED MOTION: THE DELAY THE `.lite` BLOCK FORGOT. DONE
  2026-09-20.**
  *Done when:* a visitor under `prefers-reduced-motion: reduce` sees a step's
  content as soon as it exists, proved on a clock that is actually advancing.
  *The defect:* `.lite` forced `animation-duration: .01ms` and never touched
  `animation-delay`. The entrance staggers children at 60, 120, 180, 240 and
  300ms and `bk-rise` is `backwards`-filled, so during the delay the element
  sits at its `from` keyframe — **opacity 0**. Somebody who asked for less
  movement got no movement AND a blank screen, the one outcome that block
  exists to prevent.
  *Fixed:* `animation-delay: 0ms !important; transition-delay: 0ms !important;`
  beside the duration it already overrode.
  *PROVED ON A RUNNING CLOCK, NOT FROM THE STYLESHEET.* The browser pane this
  project usually drives **freezes the animation clock, which is what hid this
  defect in the first place**, so it was measured in headless Chromium under
  `reducedMotion: "reduce"` after confirming the clock advanced — document
  timeline +400ms over a 400ms wait, `requestAnimationFrame` firing. Watching
  a step's second child frame by frame from the moment it appears: **opacity
  reached 1 at +82ms before the fix (6 blank frames) and +31ms after it (3
  frames — React and paint, no animation left in it).** Removing the line
  reproduced 82ms; restoring it reproduced 31ms. **Measured on the 60ms
  child** because booking step 1 has three children; the same rule removes
  **300ms** on any step with six or more. Normal motion is untouched — the
  second child still computes `0.06s` there.

  **8.5a — KEYBOARD: REACH, OPERATION, AND GETTING BACK OUT. ✓ DONE
  2026-09-20.**
  *Measured and clean:* 187 controls, all reachable, all named, no positive
  `tabindex`.
  *Done when:* focus is visibly located at every step of a Tab walk across the
  five dashboard tabs and all seven booking steps; every sheet and modal can
  be left with Escape; no walk re-enters a component it has left; and the
  order follows the reading order.

  **THE FIRST NUMBER WAS 55 AND IT WAS WRONG. CORRECTED 2026-09-20, SAME
  NIGHT, BEFORE ANYTHING WAS BUILT ON IT.**

  `elementHandle.screenshot()` captures an element's BORDER BOX, and an
  outline is painted OUTSIDE it. So every control with a perfectly good ring
  photographed identically focused and blurred, and the walk reported **55
  defective stops on a product that was drawing a ring on 53 of them.** Found
  by asking the browser what a keyboard-focused row actually computed —
  `outline: solid 3px` — instead of believing the picture. The frame is a
  page-level clip padded past the ring now.
  **THE APPROVED FIX WAS THEREFORE WRONG AND WAS NOT BUILT.** "One shared
  focus-visible rule for four classes that never got one" rested on the 55;
  those classes already have one. Building it would have added a second ring
  to controls that already draw the product's own.

  **WHAT IS ACTUALLY TRUE, after the correction: 167 stops, both canaries
  caught 6/6, ONE real defect and ONE finding that is my probe's fault.**

  **THE REAL ONE, FIXED:** `.nav-row` inside `.card.setting-card` — the twelve
  settings rows on Business. The card is `overflow: hidden` for its rounded
  corners and the row sits **1px inside that edge**, so a 2px outline at +2px
  offset lands entirely in the clipped region. **The ring computes, paints and
  cannot be seen**, which for a keyboard user is the same as not having one —
  and it is exactly the "rendered but not visible" case this part was told to
  watch for. Fixed by moving the SAME ring inside the edge
  (`outline-offset: -2px`); no new focus style was invented.

  **THE ONE I COULD NOT STAND BEHIND WAS A REAL DEFECT AFTER ALL, AND NEITHER
  OF US HAD GUESSED ITS SHAPE.** `button.bk-peek` — the last "What's included"
  on booking step 1 — sits at **y=873 while the pinned bar starts at y=827**.
  Fully inside the viewport, entirely **underneath the bar**. Nothing scrolls,
  because by every ordinary test it is visible: `scrollIntoViewIfNeeded`
  leaves it exactly where it is. `document.elementFromPoint` on its own centre
  returns the bar. **Not scrolled out of view — covered.**
  **AND THE OCCLUSION CHECK FOUND A SECOND ONE THE MOMENT IT EXISTED:**
  `button.bk-pick` — the last service card — focused under `div.total`, the
  bar's own price block.

  **FIXED WITH THE BROWSER'S OWN ANSWER:**
  `html:has(.bk > .bk-bar) { scroll-padding-bottom: calc(var(--bk-bar-clear) + 12px) }`.
  `scroll-padding-bottom` tells scrolling that the bottom of the page is
  spoken for, and the amount is **the variable ROADMAP 2.15 already keeps in
  step with the bar's real height** — not a second number that can drift.

  **TICKED 2026-09-20, ON TWO CLEAN RUNS IN A ROW**, which was the bar set for
  an instrument with this record: one clean run is just the sixth chance to be
  wrong. Both runs: 167 stops, 0 undetermined, **both canaries caught 6/6**,
  receipt `PASS — 6/6 targets, 167 assertions`.

  **HOW IT WAS CHECKED:** a real Tab walk over the five dashboard tabs and
  booking step 1, recording at every stop which element holds focus, whether
  anything on screen changes when it does (**by pixels**, in a frame padded
  past the ring, with a stability baseline and motion off), whether the
  element is in the viewport (**read the instant focus lands, before anything
  scrolls**) and whether anything is painted over it
  (**`elementFromPoint` on its own centre**).

  **THE TWO LIMITS, AND THEY TRAVEL WITH THE TICK:**
  1. **A focus ring that exists only BY ANIMATION is invisible to this walk**,
     because the walk turns animation off in order to see anything at all. Any
     clean sheet it produces is clean about rings that exist STATICALLY.
  2. **The walk sees what it can scroll to.** Controls behind a closed
     disclosure, inside a sheet nobody opened, or on a screen this walk does
     not visit are not covered by the tick — six screens were walked, not
     every screen in the product.

  **THIS PROBE WAS WRONG FIVE TIMES BEFORE IT WAS RIGHT**, and every one of
  them would have shipped as a clean sheet or a false alarm: it stopped at
  `document.body`; it stopped on a repeated description; it could not tell a
  ring from a drifting gradient; it photographed a frame too small to contain
  an outline, reporting **55 defective stops on a product that was drawing a
  ring on 53 of them**; and it could not tell "covered" from "no ring". The
  two-run bar exists because of that record.

  **The two decisions, both made before the first run:**
  1. **Pixels, not computed style.** An `outline` that paints nothing still
     reads as present in `getComputedStyle`, so each stop is photographed
     focused, blurred, and compared byte for byte.
  2. **In view is part of visible.** A ring nobody can see is not visible
     focus, so the viewport test is taken from the element's rect **the
     instant it receives focus, before any screenshot** — Playwright's own
     `elementHandle.screenshot()` scrolls an element into view, which would
     have silently repaired the fault it was looking for. **Result: zero
     stops focused out of view.** That half is clean.

  **What has no visible focus, by class rather than by instance:**

  | | where |
  |---|---|
  | `button.row-item` | every job row on Today and every client row on Clients |
  | `button.nav-row` | **every settings row on Business** — twelve of them |
  | `button.bk-pick` | every service card on the booking page |
  | `button.bk-peek` | every "What's included" disclosure beside them |
  | `summary`, and two `div`s with `tabindex` | Today and Money |

  **THE PROBE REPORTED VOID FOUR TIMES BEFORE IT REPORTED A RESULT, and its
  own canaries are what said so.** Each of these would otherwise have shipped
  as a clean sheet: it stopped at `document.body` (the first Tab after a load
  lands there — 0 stops on a screen with 25 controls); it stopped on a
  repeated DESCRIPTION, so two identical-looking buttons ended the walk; and
  **it could not tell a focus ring from a moving background** — this product's
  background animates for ever, so "focused differs from blurred" was true
  whether or not a ring existed, which is a false PASS. Fixed with a stability
  baseline (two identical shots first) and by running the walk under
  `reducedMotion: "reduce"` so the page holds still — which is only possible
  because 8.5e fixed the delay an hour earlier. Without it, 91 of 167 stops
  were undetermined.

  **THE LIMIT THAT BUYS, STATED, AND IT TRAVELS WITH THE FIX:** a focus ring
  that appears only BY ANIMATION is invisible to this walk, because the walk
  turns animation off in order to see anything at all. **So any clean sheet it
  ever produces is clean about rings that exist STATICALLY.** Nothing in this
  product animates a ring today; if something starts, this check will call it
  missing, and that is the trade that made the measurement possible at all.

  **8.5c — ZOOM TO 200%. ✓ DONE 2026-09-20.**
  *Done when:* at 200% zoom, at all four widths, nothing is clipped, no
  control is unreachable and there is no horizontal scroll — WCAG 1.4.4.

  **200% IS THE SETTING A PERSON REACHES FOR BEFORE THEY REACH FOR A SCREEN
  READER, so it is measured rather than assumed.** `scripts/zoom-walk.mjs`,
  two clean runs: **24 of 24 screen/width combinations, 676 interactive
  elements examined, 0 findings in the supported range**, receipt PASS.

  **HOW ZOOM IS EMULATED:** a 1440px window at 200% lays out as a 720 CSS px
  viewport on a 2× device, so the walk uses `viewport: 720` with
  `deviceScaleFactor: 2` — the same layout, reflow and media queries as
  pressing Ctrl and plus. `setPageScaleFactor` is PINCH zoom, which does not
  reflow, and would have measured nothing.

  **THE SUB-320 WIDTHS ARE PRINTED AND NOT COUNTED, DECLARED BEFORE THE RUN.**
  392 at 200% is 196 CSS px and 320 is 160 — both below this product's own
  320px floor. They do overflow there (up to 107px on the calendar); that is
  outside the supported range and is recorded rather than scored.

  **THE FIRST ANSWER WAS 28 FINDINGS AND ALL 28 WERE MY PROBE.** Triaged
  before any of them was reported as a defect:
  * `div.app-dots cuts off 96px` on four screens — it is `aria-hidden="true"`,
    empty and childless. **A decorative layer whose whole job is to be
    clipped**, reported back at the product as a defect.
  * five `button.cal-cell`s "covered by button." — covered by the **Today
    button in the pinned bar**, on a page that scrolls. **Covered right now is
    not unreachable**; a person scrolls and it comes out. Candidates are now
    scrolled into view and asked again, and only a control still covered after
    that is counted.

  **AND THE ZERO THAT PRODUCED WAS NOT TRUSTED EITHER.** Tightening two
  detectors took 28 findings to 0 while the only canary in the run tested the
  THIRD detector — a zero from a detector nothing has tested is exactly this
  repo's oldest failure. **There are three canaries now, one per detector**,
  planted in a validation pass of their own so they cannot pollute the
  measurement: an element that overflows only under zoom, a box with real text
  clipped sideways, and a control under a fixed lid that scrolling cannot
  clear. **All three caught on 24/24 runs, in both runs.**

  **WHAT THIS TICK DOES NOT COVER:** six screens, not every screen; and the
  sub-320 range above.

  **8.5d — LARGE TEXT AND TEXT SPACING. ✓ DONE 2026-09-20.**
  *Done when:* with the WCAG 1.4.12 overrides applied — line height 1.5×,
  paragraph spacing 2×, letter 0.12em, word 0.16em — and the root size raised,
  nothing is clipped or overlapped on any screen.

  **ZOOM SCALES EVERYTHING TOGETHER AND THIS DOES NOT**, which is why 8.5c
  passing said nothing about it: at 200% the box grows with the words, here
  the text gets taller and looser while every fixed-height box stays exactly
  where it was. `scripts/text-spacing-walk.mjs`, 24 of 24 screen/width
  combinations, 668 interactive elements, **four detectors each with its own
  planted defect, all four caught 24/24**.
  **The overrides are verified IN THE PAGE before anything is measured** —
  root `20px`, letter `1.8px`, word `2.4px`, stylesheet present — because a
  run that quietly failed to apply them would measure the ordinary product and
  call it a pass, which is the likeliest way this check could lie.

  **DETECTORS 1–3 ARE CLEAN: 0 findings.** Nothing runs off sideways, nothing
  is cut off by a box that hides its overflow, no control becomes unreachable.

  **DETECTOR 4 FOUND 62 CANDIDATES AND THEY ARE NOT DEFECTS.** All one shape:
  a small pill — the Money period chips, `Mark paid`, the calendar's
  Month/History — whose text measures 4–5px taller than its content box at
  20px root. **Photographed with and without the overrides
  (`artifacts/8-5d-large-text.png`, `8-5d-normal.png`): nothing is visibly
  wrong.** The padding absorbs it; the labels sit inside their pills in both.
  So `scrollHeight - clientHeight` on a box with visible overflow measures a
  technicality rather than anything a person sees.
  **That detector had already been narrowed once**, from 417 findings: it was
  reporting page containers "spilling 756px", which is a document taller than
  a window.

  **DETECTOR 4 WAS DROPPED AND THE GAP IS STATED HERE, WHICH IS THE
  DIFFERENCE BETWEEN A GAP WE CHOSE AND A GAP WE MISSED:**

  > **Text that overflows a box without being clipped is not measured here,
  > and closing that properly needs range-level text measurement that costs
  > more than the fault appears to be worth.**

  A reader in a month who disagrees can reopen it on evidence. Carrying a
  detector that produced 417 findings, then 62, then zero real ones would have
  made this check's number mean nothing in either direction.

  **TICKED ON TWO CLEAN RUNS** of the three detectors that earned it: 24/24
  combinations, 668 interactive elements, **0 findings**, all three canaries
  caught 24/24 in both runs, receipt PASS both times.

  **8.5b — SCREEN READER. STRUCTURAL HALF DONE 2026-09-20; NOT TICKED, AND IT
  CANNOT BE BY ANY INSTRUMENT.**
  *Done when:* every screen has landmarks, headings descend without skipping a
  level, anything that changes without a page load is announced, **AND a
  person has walked the booking flow end to end with a screen reader on.**

  **THE STRUCTURAL HALF IS MEASURED AND CLEAN ACROSS ELEVEN SCREENS — this
  item is waiting on a person, NOT on work nobody has done.**
  `scripts/screenreader-structure.mjs`: **11 of 11 screens, 48 assertions, two
  clean runs**, both canaries (a heading that skips a level, an image with no
  `alt` attribute at all) caught 11/11 in each, receipt PASS both times. Every
  public page in the product is now covered, including the one that is not a
  route.
  **The receipt refused the first version** — 16 assertions against a declared
  floor of 40 — and the fix was to COUNT the landmark and live-region
  questions that were always being asked, then DERIVE the floor from the
  declared screen count. **Deriving the floor rather than nudging it down to
  fit the answer is the difference between a gate and a rubber stamp.**
  **The receipt refused the first version** — 16 assertions against a declared
  floor of 40 — and the fix was to COUNT the landmark and live-region
  questions that were always being asked, then DERIVE the floor from the
  declared screen count. **Deriving the floor rather than nudging it down to
  fit the answer is the difference between a gate and a rubber stamp.**

  **AND IT FOUND ONE, ON THE SURFACE A STRANGER USES.** Every dashboard screen
  declares a `<main>` landmark; `App.jsx`, `JobPage.jsx`, `AdminPage.jsx`, the
  landing page, pricing and legal all render one. **The booking pages rendered
  a bare `<div>`** — so *"jump to the main content"*, the first thing a
  screen-reader user does on any page, did nothing on the booking form or the
  plans page. Fixed with `role="main"` on both (`role` rather than a tag swap:
  the class is doing the layout, and swapping the element would be a styling
  change wearing an accessibility fix's clothes). Re-measured: main=1
  everywhere, 0 findings.

  **THEN THE WALK WAS SEEDED AND THE PATTERN TURNED OUT TO BE WRONG.** Two
  more pages became reachable by handing the walk real ids — the manage screen
  on the booking this session made for 2.8, and a plan member's page on a
  seeded id. **Both were missing the landmark, as expected. Both were ALSO
  skipping a heading level, h1 straight to h3, which nothing in the pattern
  would have suggested** — fixing by pattern would have added the landmark and
  left a listener navigating by heading landing in a level that does not
  exist. **Four screens measured, a claim about nine avoided.**
  Fixed with `aria-level={2}` rather than a different tag: `.bk h3` carries a
  different size and weight from `.bk h2`, so swapping the element would have
  redesigned two reviewed screens to fix a structure problem.
  **The detector had to be corrected for that, and it is not the probe being
  bent to pass its own fix:** it read the tag and stopped, so it flagged pages
  that had just been given the right level. A screen reader uses `aria-level`
  when it is there. The canary heading carries none and is still caught 9/9
  every run, so its ability to see a real skip is unchanged and proved.

  **AND THEN THE LAST ONE WAS MEASURED TOO, WITHOUT A DATABASE WRITE.**
  `BookingConfirmed` is not a route — it is a state `BookingPage` enters after
  a submit — so it had never been looked at by anything, and it is the screen
  a customer lands on **at the moment they have just handed over their money.**
  `app/fixture-confirmed.html` mounts the real component against a fixture
  booking inside the REAL provider, the way `render-emails.mjs` renders an
  email without sending one. **Both branches walked**: a request being held
  and a booking confirmed.
  **THE PREDICTION WAS DECLARED FIRST AND IT WAS RIGHT** — no landmark, an
  h1→h3 skip, zero live regions, on both branches. Being right is not the
  point; it was still measured rather than assumed, and the canaries proved
  the probe could see before the result was believed.
  Fixed the same way as the others, then re-measured to 0 findings.
  **The fixture ships nowhere and that was checked, not claimed:** a
  production build contains `index.html` and `map.html` only, and no bundle
  references the fixture module.

  **THE FINDING UNDERNEATH THE COUNT, AND IT IS NOT A COUNT OF MISSING
  ATTRIBUTES:**

  > **The decisions in this product arrive silently for somebody who is not
  > looking at it — a price that moves, a step that refuses, a booking that
  > confirms.**

  Every one of the eleven screens reports **zero live regions at rest**.
  **One correction, in the product's favour:** the booking step's refusal line
  DOES announce, because 8.5a gave it `role="alert"` — it appears on a press
  rather than at rest, which is why a snapshot counts zero. It is the only
  one. **Written up with a scope, a cost and a recommendation as its own
  proposal in `FOUND.md` § "Four things this product does silently"**, rather
  than left in this note to be rediscovered. It lines up exactly with
  `DECISIONS.md` § *"The job record should stay open when a status changes"*,
  where *"Marked completed."* turns out never to have been readable by
  anybody. **Whether a listener can still complete a booking despite it is the
  question only a person can answer**, and it is the row in `FOR-ANDREW.md`.

  **WHY THIS STAYS OPEN: A SCREEN READER IS A PERSON LISTENING TO A MACHINE
  READ A PAGE ALOUD.** Every question that matters — does the order make
  sense, does it say something useful, can you find your way back — is about
  what a listener understands. The structural half is mechanical and is now
  clean; the half that decides whether this product is usable is in
  `FOR-ANDREW.md` as one screen, one question, thirty seconds.

  **THE PROBE'S OWN BLIND SPOT, AND IT IS WORTH MORE THAN THE NUMBER IT
  QUALIFIES:** it finds a clickable thing by its **cursor style or an `onclick`
  attribute**, so **a React handler on an element with a default cursor is
  invisible to it**. The clean sheet above is clean about what it can see and
  no more than that. Also written into `docs/gotchas.md`, because the next
  person to write an accessibility walker will reach for the same two
  signals.

---

## Wave 9 — Dashboard and back office

- [ ] **9.1 — Setup progress disagrees between the dashboard and the back office.**
  Business says "10 of 12 done"; the back office says the same account is
  "4 of 12". CLAUDE.md already states both sides are supposed to run the same
  `app/src/lib/setup.js`, so this is a live regression against a stated rule.
  **Done when:** the same account shows the same count everywhere.
  *A1 P1-02, A2 4.4*
  **DIAGNOSED 2026-09-20, AND IT IS A SHORT JOB ONCE DEPLOYS ARE UNFROZEN.**
  **The two sides genuinely do call the same `setupProgress()`** — CLAUDE.md's
  claim is true and this is not a second implementation. **The disagreement is
  in what each side FEEDS it.** `Today.jsx` and `Business.jsx` pass the whole
  business and the whole settings row; `platform-admin` sends a trimmed
  `setup_inputs` carrying only `{ setup }` out of settings and
  `{ contact_phone, contact_email }` out of the business — while most steps now
  DERIVE from the real record (Andrew's instruction, 2026-09-14). So the back
  office cannot see the evidence the dashboard can, and counts fewer.
  **The fix is to widen what `platform-admin` sends, which is an edge-function
  deploy — blocked by the freeze, not by the work.**

- [ ] **9.2 — The back office says contradictory things about one account.**
  Growth says a page "cannot take a booking" and also "the page works and
  nobody has used it". One account appears in setup-incomplete, cannot-book,
  never-booked and no-website at once.
  **Fix:** stages — Created → Configured → Bookable → First booking → Active.
  One furthest stage per account, separate warnings, one primary blocking
  reason.
  **Done when:** the counts reconcile and each account has one clear next
  action.
  *A1 P1-02, P3-04, A2 5.1*

- [x] **9.3 — The setup banner shows an empty list and "and 2 more". DONE
  2026-09-20.**
  **Fix:** show the first blocking task on its own line with a direct button.
  *A1 P2-11, A2 4.3*

  **REPRODUCED FIRST, ON THE DEMO.** With nothing blocking a booking the
  notice rendered its heading, an **empty `<ul>`**, and a fold reading *"and 3
  more"*: **0 visible items, 3 hidden**. A detailer's first thirty seconds
  with the product told them something was unfinished, showed them nothing,
  and then said *"and"*.

  **THE CAUSE:** the visible list is `stopsBooking` — the three things that
  actually stop a customer booking — and everything else sits behind the fold.
  When none of the three is missing, the list is empty and the fold's *"and N
  more"* continues a sentence that was never started.

  **FIXED:** the three still lead when they exist; when none does, **the first
  remaining step takes the line instead**, so the notice always names one
  thing to press. The fold then counts what is genuinely left after it — *"and
  3 more"* became one visible task and *"and 2 more"*, which adds up.
  **Verified at 1440x900, 768x1024, 392x844 and 320x844, console clean at
  each**, no horizontal scroll, the lead rendered as a real button at every
  width. **The blocking path is unchanged by construction**: when
  `stopsBooking` is non-empty the rendered list IS `stopsBooking`, exactly as
  before.

  **OVERLAPS 2.12, WHICH IS HELD — SAID RATHER THAN QUIETLY STEPPED AROUND.**
  The line now promoted to the front of the notice is a step NAME out of
  `lib/setup.js`, and those are the plain object values 2.12 records as
  untranslated — rendered raw at the call site, not through `t()`. "Vehicle
  types" has no Spanish entry at all; "Services", "Hours" and "Where you work"
  have entries that nothing looks up. **So on a Spanish dashboard this line
  reads English.** The defect is not new — the fold has always shown these
  same names untranslated — but 9.3 moves one of them from behind a fold to
  the most prominent line. **No string was added or changed here**, because
  fixing that copy is 2.12's job and 2.12 is held until the width sweep is.

  **AND ONE THING MEASURED THAT IS NOT THIS ITEM'S**, in `FOUND.md`: the
  task links are 19px tall on a 25px pitch, so the 44px rule cannot be met
  with the `::after` inset CLAUDE.md prescribes — neighbouring targets would
  overlap. Spacing the list out is a design decision on a reviewed screen and
  was not taken unilaterally.

- [ ] **9.4 — Calendar is hard to read at a glance.**
  Single-letter weekdays make both S days and both T days ambiguous; names
  truncate; only "Blocked" is explained; the first partial week omits blank
  cells so the grid is irregular.
  **Fix:** short weekday names, a complete rectangular month, a full status
  legend, readable selected-job detail.
  *A1 P1-08*

- [x] **DONE 2026-09-20 — 9.5 Late jobs are not flagged.** At 10pm a 2:00 PM
  job still sits under "Still to do". Mark it late and offer "Mark done" or
  "Move it".
  *A2 4.9*
  **BUILT 2026-09-20. Confirmed the
  fault before touching anything: `Today.jsx`'s own comment on `still`
  already named it — *"A job whose time has passed and was never marked
  complete stays here, which is true of it"* — true, and unflagged.
  **The fix is the flag only — "Mark done" and "Move it" are not new
  buttons.** Both already exist: tapping the row opens the record, where
  "Mark completed" and "Edit" (the time) already live in
  `BookingDetail.jsx`, proven working under 4.1 this session. Building a
  second, inline pair here would be the redesign this pass was warned away
  from — five real complaints inside 9.12 are still a redesign; one real
  complaint does not get to become two new buttons on the strength of the
  word "offer" in the original write-up.
  **The condition:** `status === "confirmed" && end_at < now` — the exact
  test `Today.jsx`'s own `lit`/`litLive` already use for "is this job still
  live," one line up (`screens/Today.jsx`, `runRows`). `status ===
  "confirmed"` on purpose, not `!== "completed"`: a `no_show` or a pending
  request sitting past its time is a resolved or a different-kind-of-waiting
  state, not "still needs doing," and flagging it *late* would be a second,
  wrong claim next to the first one this item is about.
  **The flag:** `"Late"`, leading the name in `components/JobRow.jsx`, the
  same leading-not-trailing placement `bring`/`cars` already use one line
  down and for the stated reason — truncation eats the end of a line, not
  the start. Styled in `theme.css` with `--bad`, the same token this theme
  already reserves for a resolved-bad outcome (`.pill.cancelled`,
  `.pill.no_show`) — inline text, not a pill, since a tight two-line row has
  no room for a second row of chips. Spanish added in the same edit:
  `"Late": "Atrasada"` — checked against both catalogues first, no
  collision, no existing entry for the word anywhere.
  **Scope:** `Today.jsx`'s own "Still to do" list only — `JobRow.jsx` is
  shared with `DaySheet.jsx`'s day panel, which can show any date, not just
  today, and every other caller defaults `late` to `false` and is
  unchanged. No new component, no new button, no database write, no
  deploy.
  **ACCEPTED 2026-09-20, Andrew, live, on the demo tenant.** Today's
  still-to-do list read *"5:00 PM **Late** Chris Vogel, Express Wash,
  Mobile, sixty-five dollars"* — the exact done-when this item asked for, a
  detailer reading it off the screen rather than a script asserting it.
  **Checked the negative as well as the positive:** Elena Marsh's 2:45
  booking, also past its time but `completed` and sitting in Needs payment,
  is not flagged; neither of the two settled jobs is; none of the seven
  Coming up rows is. Spanish reads `"Atrasada"`, which agrees in gender
  with `"cita"`, this product's own word for a booking — the key is not
  just present, it is the right grammatical shape for the noun it
  describes. The inline coloured word, not a badge, read as the right
  choice on a list a detailer scans rather than reads.
  **ONE LIMIT ON WHAT WAS PROVEN, THE SEED'S SHAPE RATHER THAN THE CODE'S
  FAULT, SAID PLAINLY RATHER THAN LET THE TICK IMPLY OTHERWISE.** Today had
  exactly one still-to-do job, so the one check this cannot answer for —
  two open jobs side by side, one whose time has passed and one whose has
  not, only the first reading `Late` — was never on screen to fail or pass.
  That is the case that would catch an off-by-one in the comparison.
  Elena Marsh and the seven Coming up rows are a weaker negative than that,
  because `completed` and a future `booking_date` may never reach the same
  branch the still-to-do comparison does. **Whoever's next sweep lands on a
  day with two open jobs, one already past its time, closes this for
  free — worth watching for rather than staging on purpose.**

- [ ] **9.6 — Client list has no labels.** Values appear with no headings, so
  last visit, lifetime spend and phone must be inferred. "9 gone quiet" is
  vague. Define it with an exact period and give it an action.
  *A1 P2-12*

- [ ] **9.7 — Client card is missing basics.** No Text button, no vehicle, no
  address, no "Book again". Add them; "Book again" opens New booking prefilled.
  *A2 4.7*

- [ ] **9.8 — Manual booking flashes "No active services yet" before loading.**
  Replace false empty states with a loading skeleton; only show empty after a
  completed empty response.
  *A1 P2-14*

- [x] **DONE 2026-09-20 — 9.9 New booking files "Mobile / Drop-off" under the
  VEHICLE heading.** Move it under its own "Where" heading.
  *A2 4.8*
  **FIXED in `NewBookingModal.jsx`.** The `Type` segmented control (Mobile /
  Drop-off) came out of the `Vehicle` block and now heads its own `Where`
  block — reusing the existing `t("Where")` key (`"Dónde"`, already in
  `appEs.js`, no new string needed) and matching the customer's own booking
  page, which already asks "Where should we do it?" as its own step. The
  address, travel zone and water/power fields stay under it, still
  conditional on Mobile being picked; the `Where` block itself renders
  whenever there is a Type choice to make OR an address to take, so a
  drop-off-only business still sees nothing extra and a mobile-only one still
  sees its address fields with no Type toggle, exactly as before.
  **Verified live** on the demo tenant's New booking form (a form-only
  change, no booking submitted, no database write): the Vehicle block now
  opens straight on Vehicle size with no Type control in it; a new `Where`
  section carries the Type toggle; picking Drop-off correctly hides Address
  and Travel zone under the same heading. Checked at desktop width and
  392px, and again on a genuinely fresh tab against the dev server after it
  was restarted mid-session — clean both times, console included. (The
  removeChild/createRoot line under 4.1 above turned out to be a stuck
  console buffer on one tab, not a repeating fault — see the correction
  there.)
  **ACCEPTED 2026-09-20, and by two different pairs of eyes on two different
  widths — said plainly rather than left implied, because the two halves
  are not the same kind of confirmed.** Andrew verified the desktop width
  himself. The 392px half is the other session's own measurement, not a
  second pair of eyes on top of the first: it proved the `Where` block
  actually OPENS before trusting either field inside it — a section that
  never opens has no fields to lose and would pass by absence — then
  confirmed Drop-off collapses all four fields (Type, Address, Travel zone,
  the water/power pair) and Mobile brings them back. Their run also caught,
  as a free before-picture on the way past: at 392px the English dashboard's
  vehicle-condition control already read `Light, Moderate, Heavy, Extreme`
  correctly — the exact control ROADMAP 2.12 item 4 fixed the Spanish half
  of in the same session. That screenshot is now the last picture of that
  bug.

- [ ] **9.10 — Business settings waste the right half of the screen.**
  Put a live customer-page preview there; stack below on phones.
  **Same item as 11.3's concrete half — this is the number that owns it.**
  11.3 is the vaguer "make settings feel like a product" framing and stays
  unbuilt on purpose (Andrew's ruling, 2026-09-20: not a named fault, a
  design decision that is his to make). Whoever picks this up should read
  11.3 first so the two are not built twice by two people who each think
  they own it.
  **Blocked on Andrew: what the preview should show, how it populates, and
  what it does when the data is thin.** See `FOR-ANDREW.md`.
  *A1 P2-13*

- [x] **DONE 2026-09-20 — 9.11 Booking-rule conflict needs a one-click fix.**
  The product already correctly warns that a 2-hour booking notice plus a
  24-hour change cutoff locks a new booking immediately. **Keep the
  warning** — add an example and a recommended adjustment.
  *A1 P2-15*
  In `screens/more/BookingRules.jsx`'s `window_exceeds_notice` warning (the
  existing one this item names), the original warning text is unchanged and
  two things were added:
  - **An example**, restating the same conflict as a concrete case: "the
    earliest a customer can book — {notice} from now — already falls inside
    your {change} change window, so they would have to call you the moment
    they book." Both numbers are the same `notice`/`change` the warning
    itself already computes — nothing new is read or guessed.
  - **A one-click fix**, "Allow changes until {hours} instead," derived the
    same way: `Math.floor(notice)`, so the recommended cancellation window is
    always at or under the notice period and the conflict cannot survive
    applying it. It narrows the change window rather than widening the
    notice period — the smaller of the two possible fixes, since it leaves
    how soon anyone can book untouched. Recommending 0 ("Any time") is
    treated as a real answer, not an edge case dodged, for a notice period
    under an hour.
  Clicking it only changes FORM state, same as every other control on this
  screen — Save still persists it, and the warning clears itself once the
  numbers stop conflicting, with no separate dismiss needed. Spanish strings
  added in the same edit. **Scope held to the warning; the screen's layout
  was not touched.**
  **ACCEPTED 2026-09-20, Andrew, live, desktop width, on the demo tenant,
  which already carried the exact conflict this item names — 2-hour notice
  against a 24-hour change window, nothing staged.** The warning and the
  example read exactly as written above; `duration()` formatted the numbers
  correctly ("2 hrs," not "2.0 hours" or "1 hours"); the fix button read
  "Allow changes until 2 hrs instead" — `floor(notice)` off the two numbers
  actually on screen, not a constant. Pressing it cleared the warning **and**
  moved the "Reminders and cancellations" summary row from "changes up to
  24h before" to "changes up to 2h before" in the same render — a
  consequence the diff alone would not have shown a reader, since the
  summary row reads the same `cancellation_window_hours` the fix writes.
  **Confirmed FORM-only, not persisted, by closing the panel unsaved and
  reopening it:** the row and the warning were both back at 24h, exactly as
  they were before the press. **Save was not pressed.** Andrew, in his own
  words on why: *"It would have written booking-rule settings on the tenant
  the other session is measuring against tonight, and a settings change is
  a worse thing to leave behind than a booking — it changes what every
  future run sees rather than one row."* Persisting goes through the same
  Save button every other control on this screen already uses, so that half
  is treated as covered by the screen, not independently re-proven here.
  **Not checked at phone width, for the same reason as 9.9's phone
  half — this browser floors at 598px outer**, below what a phone-width
  check needs.

- [ ] **9.12 — Back office: real detailers first, scannable, one action each.**
  Default to real accounts; replace the three-column card wall with a list —
  detailer, status, setup, last booking, earned, customers, primary warning,
  action; open detail in a side panel. "One thing needs you" is good; the
  duplicate wide card under "What to look at, in order" is not. "Money at risk"
  shows for an account that pays nothing. "Ring them" shows no phone number.
  "Booking · last one yesterday" shows for accounts with 0 customers.
  **Done when:** the owner can find the only account needing attention in under
  ten seconds.
  *A1 P3-02, P3-03, A2 5.2, 5.3, 5.6*
  **STEPPED PAST 2026-09-20, and the reason is stronger than size, so it is
  written here rather than left for size to imply: `admin/` is English-only
  by `appI18n.js`'s own scope comment, it is Andrew's own internal tool, and
  no detailer ever sees it — this is a redesign of a screen outside the
  audience the roadmap is sorted for, not merely five real complaints
  wearing a redesign's clothes. Do not pick this up on a quiet night because
  it looks meaty; it fails the first criterion before size is even asked.**

- [x] **ALREADY DONE, TICKED 2026-09-20 — 9.13 Zero data is being presented as
  proof of success.** "$0 went through it this month… it is the proof the
  product works rather than income."
  **Fix:** say plainly there is not yet enough production data to judge.
  *A1 P3-05, A2 5.4*
  **NOT BUILT TONIGHT — FOUND ALREADY BUILT**, as a side effect of the
  `AdminPage.jsx` rebuild "to Today's shape" on 2026-09-13 (ROADMAP 4.4's back
  office). The exact claim the audit quoted — that a $0 figure is "proof the
  product works" — is not in the file: `grep -i "proof"` against
  `AdminPage.jsx` returns nothing. **Read live instead of trusting the grep**,
  signed in as the demo admin: the Today tab reads *"$0 passed through the
  platform this month, but only the recurring total above is ours"*; the
  Money tab reads *"Nothing is coming in yet"* and *"$0 passed through the
  platform this month — the detailers' money, not income of ours"* and
  *"Nobody is paying yet."* Every one hedges rather than claims — the exact
  "done when" this item asks for, "zero-data states never claim validation."
  Checked on a fresh browser tab (console clean) rather than the tab this
  session had reloaded all night, per the console-buffer gotcha just written
  up in `docs/gotchas.md`. No code change made because none was needed —
  ticking a fixed item is not the same as skipping it.

- [ ] **9.14 — The owner cannot see whether the platform made money.**
  Subscription revenue is visible; hosting, database, email and domain costs
  are not. Manual cost entry is fine to start.
  *A1 P3-06*

- [ ] **9.15 — Onboarding: "Six short tours, up to 37 steps".**
  Replace with short contextual prompts tied to unfinished setup.
  *A1 P3-11*

- [ ] **9.16 — Hide the owner-only "The website business" row from detailers.**
  Depends on 0.1.
  *A2 4.11*

---

## Wave 10 — Copy

One pass, one list. All of it is the same defect: internal voice reaching
production. `CLAUDE.md` § Design already forbids it; these are the live
instances.

**A COUPLING FOUND WHILE RUNNING THIS PASS, 2026-09-20 — read before renaming
anything.** Some of this product's own user-facing strings are load-bearing
for the instruments that measure it: the width sweep opens a sheet by its
**visible text**, not by a stable selector, so renaming "Log a bulk job" to
"Add a fleet job" (10.1, applied and correct) made that screen undiscoverable
by name and the sweep reported it `NEVER MEASURED`. That is the gate working
— it named the gap rather than going quiet — but it means a copy pass has to
be cross-checked against the browser instruments before it runs, not only
against this repo's own tests. A button label, a sheet title, a tab name or a
heading a script would plausibly click by text is the shape of string to
check; plain paragraph prose is not, because nothing clicks a sentence by its
words. **The fix belongs in the check, not in reverting the string** — give
the instrument a stable hook (`data-*`, a route, a component name) instead of
a wording it is free to keep changing. Full detail: `docs/gotchas.md`.

- [x] ~~**10.1 — Remove every developer-voice string.**~~ **Done, 2026-09-20.**
  - ~~"Tallest bar $741." → remove, or a real caption~~ **Not a fault.** Already
    a real caption ("Tallest bar {peak}. The line across is zero."), fixed by
    an earlier, unrelated pass. Left alone.
  - ~~"This is the sentence that closes a sale…"~~ → "Real scarcity, not a
    tactic — the count comes from the database and drops every time somebody
    takes a spot."
  - ~~"$0 went through… it is the proof the product works…"~~ → "…not ours to
    spend" / "…it does not count as income" (two occurrences)
  - ~~"The built-in table · nothing is overridden"~~ → "Custom pricing, set
    here" / "Standard pricing"
  - ~~"Each line is asked of everybody separately…"~~ → "A detailer can appear
    on two lines at once when two different things are true about them —
    that is not the same name being counted twice."
  - "Log a bulk job" → "Add a fleet job" — the string the width sweep
    depended on by name; see the coupling note above, now this item's own
    example of it
  - ~~"Maintenance deadlines · 1 missed" → "Plan visits · 1 overdue"~~ →
    **"Visits due"**, not "Plan visits" (collides with the separate Monthly
    Plans feature) — Andrew's ruling, 2026-09-20: *"Deadline is a
    project-management word; a detailer does not have deadlines, they have
    visits that are due."* Renamed in `Business.jsx` and `more/index.js`,
    both places it lives, with all six Spanish keys moved
  - "Six short tours, up to 37 steps" → "Quick tours. Stop any time."
  - "0 of 9 bookings came through a link. Earned counts finished jobs only." →
    "…"Earned" only counts jobs you have finished."
  - "Add a way to be paidSave" — two buttons with no space between them.
    Reproduced live, not assumed from the audit: a real space character
    between the two sibling buttons fixes what gets read without moving
    anything a sighted user sees
  - Tab name "Plumbing" → "System health"
  - Raw job names `accrue-plan-visits`, `send-owner-reminders` → the same
    plain names the alert email already used ("the nightly plan-visit
    accrual", "the reminder sweep"), mirrored into the front end
  - ~~"Something watching from outside" → "External booking check"~~ →
    **"Dead man's switch"** — the suggested replacement named the wrong
    feature entirely (this is the job-heartbeat monitor, nothing to do with
    bookings). Decided by audience: `/admin` is staff-only, checked against
    every script in `scripts/*.mjs` for a literal reference (zero), so the
    precise term the code already uses stands rather than a softened one
  **Every Spanish key moved in the same edit it applied to.**
  *A1 P2-16, P3-04, P3-07, § 7, A2 4.10, 5.4*

- [x] ~~**10.2 — Cut every back-office explanation paragraph to one line.**~~
  **Done, 2026-09-20.** Thirteen paragraphs in `AdminPage.jsx` condensed from
  two sentences to one, cross-checked against the width sweep's 23
  load-bearing strings first (zero collisions — body prose isn't clicked by
  its words) and verified live at 1440/768/392/320: nothing clipped, longest
  wraps to four lines at 320 with nothing cut off. Broke two of
  `platform-admin.test.mjs`'s own checks on landing — caught immediately and
  re-pointed at the underlying fact rather than the wording (`a470f3f`).
  *A2 5.5*

---

## Wave 11 — Carried from the old roadmap

**TWO OF THREE WERE ALREADY DONE, 2026-09-20 — this section had not been
reconciled against work landed under other numbers.** Read before treating
this wave as untouched.

- [x] ~~**11.1 — Geoapify: address autocomplete, drive time and routing.**~~
  **Address autocomplete: done.** `supabase/functions/address-suggest`
  confirmed **deployed and matching this checkout** (`deployed-inventory.mjs`:
  `matches`), wired into the booking flow at `app/src/book/AddressField.jsx`,
  and attribution is already on the privacy page — *"When a customer types
  their address into your booking page, what they type goes to Geoapify."*
  **Drive time and routing: not built, and blocked.** Nothing in the
  codebase calls a routing or drive-time endpoint. Building either means a
  new or widened edge function so the API key never reaches the browser —
  the same note this item already carried — and deploys are frozen. Not
  started; overlaps Wave 13 item 1, "day view in the calendar with drive
  time between jobs," which is where it belongs when the freeze lifts.
  *old roadmap § 6, § 3*
- [x] ~~**11.2 — The vehicle picker**, on NHTSA vPIC.~~ **Done — fully built,
  shipped, tested.** `app/src/book/VehicleField.jsx` + `vehicles.json`
  (1,103 cars, static — no live call to NHTSA at request time, so no
  attribution gap the way Geoapify has one), wired into
  `book/steps/StepVehicle.jsx`, and covered by `tests/booking-core.test.mjs`.
  *old roadmap § B*
- [ ] **11.3 — The editing screens phase** — make settings feel like a product.
  **Ruled on rather than picked up, 2026-09-20, so it does not get re-opened
  by the next person who reads it as an open item.** Andrew: *"'Make settings
  feel like a product' is not a named fault, it is a feeling, and the
  standing rule is that the bar for touching a screen is a specific thing
  that is wrong rather than a better idea."* A live customer-page preview is
  a new feature with a dozen judgement calls inside it — what it shows, how
  it populates, what it does when the data is thin — and none of those have
  a right answer a session can derive. That makes it his, in a design pass
  where he can react to something built rather than a fix queue at the end
  of a day.
  **The concrete half already has its own number — see 9.10, cross-referenced
  both ways below, so it is not built twice by two people who each think they
  own it.**
  **Checked for a concrete fault hiding inside the vague half, and found
  none.** The citation itself is just "*old roadmap*", with no section
  letter the way 11.1 and 11.2 had one, and `docs/roadmap.md` has no fuller
  version of this line to mine. There is nothing here beyond the one
  sentence and 9.10's own specific ask — no second item to split out.
  **FOR-ANDREW.md carries the actual open question**, with no recommendation
  attached, because this one is not ours to recommend. *old roadmap*

---

## Wave 12 — Stripe, and the launch blockers

**Not blocked any more — see 0.2.** Every item here can be built and proved in
Stripe's sandbox today, with no activated account. What waits three days is
only taking real money, and that needs a parent named as owner of the platform
Stripe account. Detailers bring their own Standard accounts over OAuth, so
their age is not Andrew's problem.

- [ ] 12.1 Subscription billing end to end: sign-up → pay → renew → failed
  payment retries → page offline → back when paid. Sandbox proves all of it.
  *A2 5.8*
- [ ] 12.2 Real in-person card payment. Today "Card" only writes the word
  "Card" into the notes, while the home page promises "Take a card payment on
  the driveway." **Until this ships, 10.1 must change the home page wording** —
  a claim the product cannot keep is a copy bug, not a missing feature. *A2 4.6*
- [ ] 12.3 Optional deposit at booking. *A2 Part 8 item 2*
- [ ] **12.4 — Split the demo account before the first real detailer signs up.**
  Deliberate today (see 0.1) and correct while every business is a fixture.
  **The trigger is the first real signup, not a date.** At that moment one
  guessable `demo123` login can read every detailer's customers. Split it into
  a plain demo detailer and a separate owner login with a real password, and
  restore the `/admin` refusal for non-admins.
  **Done when:** the demo account is refused at `/admin` and the "The website
  business" row no longer shows in its settings. Closes A2 1.1 and A2 4.11.

---

## Wave 13 — After the fixes

In A2's stated order. Do not start these while Waves 1–10 are open.

1. Day view in the calendar with drive time between jobs. *A2 Part 8 item 3*
2. "Book again" and win-back texts for customers who have gone quiet. *item 4*
3. Before/after photos per job, optionally added to the detailer's gallery.
   *item 5*
4. **Move Andrew's own business onto the platform** as the first real account,
   once 2.3, 2.2, 3.3 and the Stripe wave are done. *item 6*

---

## Wave 14 — The health audit, 2026-09-16

Andrew's ask: *"an honest picture of whether this product's features actually
work or just look like they work — especially anything touching money,
payments, and one detailer being able to see another detailer's customers."*

Everything below was **measured against the development Supabase project**
(`kguqylyzgyzfktkfnhjb`), not read off a document. The live business project
was not touched. Where a measurement contradicts a document, the measurement
is written down and the document is named.

### What is genuinely solid — say this out loud, because it is most of it

Four separate defences, each one checked rather than assumed:

1. **One detailer cannot read another's customers through the browser.** 51
   tables, every one with row-level security **enabled and forced**. Swept all
   51 as a signed-in detailer: 48 answered, **zero foreign rows**, own rows
   visible in 12, and a canary proved 63 foreign customer rows existed to be
   leaked. See 4.4 above for the full receipt.
2. **A new table cannot be forgotten.** A database event trigger
   (`rls_auto_enable`) turns row-level security on and forces it on **every**
   table created in `public`, and a table with no policy is deny-all. That is
   why the count is 51 of 51 and not "51 of 51 so far".
3. **The back office has no shortcut into the policies.** The obvious build
   gives twenty tables an `or is_platform_admin()` escape hatch. **Zero
   policies mention it** — measured. The back office reads everything through
   one service-role function behind one `platform_admins` check instead, and
   the 404 it returns is the same for "not signed in" and "not an admin".
4. **Stored prices are correct.** Every one of the **57** bookings in the
   database reconciles: `total = subtotal − promo`, before or after the
   business's own rounding. **Zero breaks.** So A2 4.1's "the summary lines do
   not add up" (item 2.2) is about **what the customer is shown**, not about
   what is stored — fix the display, do not go looking for bad arithmetic.

The Stripe code is also careful in ways worth keeping: the amount is computed
server-side from the booking row and never taken from the browser; the webhook
verifies the signature over the raw body, refuses an event whose Stripe account
does not match the booking's connected account, and is idempotent on a unique
event id.

### 14.1 — A note the product calls "Private" is public

- [x] **DONE 2026-09-16 — the detailer's private note on a job went to anyone
  with the booking link.** The reply now carries **31 named keys instead of 66**
  and `admin_notes` is gone, measured anonymously with no API key before and
  after. Receipt `receipts/receipt-fields.json`, evidence
  `docs/VERIFIED.md` § 14.1, check `tests/receipt-fields.test.mjs` (broken on
  purpose three times first). Original report: `BookingDetail.jsx:475` prints `admin_notes` under the label
  **"Private:"**. `get-booking-receipt` is a public endpoint and selects `*`,
  so it hands the whole booking row to an anonymous caller.
  **Measured:** an anonymous GET with **no API key** returned `admin_notes` of
  `"staff note"` and `"phone booking"` — the exact strings in the database.
  It also returns `payment_notes`, `stripe_payment_intent`, `stripe_session_id`,
  `miles`, `vehicle_condition` and the internal `customer_id`, `business_id`,
  `campaign_id`, `plan_id` and `plan_member_id`.
  **Why it matters in plain words:** a detailer writes "customer was difficult,
  do not go back" in a box labelled Private, and the customer can read it.
  **Fix:** replace `select *` with a named list of the fields the receipt page
  actually draws. The function already does exactly this for
  `business_settings` — one setting exposed, the rest private — so copy that.
  **Done when:** the anonymous receipt contains no field the customer's own
  page does not render, and a test asserts the list rather than the absence.

### 14.2 — The calendar link's "owner" view has no password on it

- [x] **DONE 2026-09-16 — the calendar link's owner view had no password on
  it.** An anonymous caller with no apikey and no Authorization header who
  typed `&audience=owner` on their own confirmation link got the detailer's
  copy: `SUMMARY:Chris Vogel · Express Wash` and
  `Customer: Chris Vogel · 562-555-0447`. The same call now returns the
  **customer's** copy, line for line, measured against the deployed function
  before (v50) and after (v51). A signed-in member of that business still gets
  the private copy, and the customer's own link was never touched. The
  membership is checked against **this booking's** business, so one detailer
  cannot open another's job either. The dashboard's Calendar control had to
  stop being a link — an `<a href>` cannot send a session — so it fetches and
  hands over the file, same geometry, verified in the running app at 320, 392,
  768 and 1440 with no console errors. The endpoint also took the
  `publicCeiling` rate limit `pay-booking` has. Evidence `docs/VERIFIED.md`
  § 14.2, receipt `receipts/ics-audience.json`, check
  `tests/ics-audience.test.mjs` (broken on purpose four times first, including
  once against the real unfixed deployment). Original report:
  `booking-ics?audience=owner` is unauthenticated. `audience` is a
  plain query word. Anyone who edits it on their own confirmation link gets the
  owner's copy.
  **Measured live, anonymous, no key and no token:** name `Chris Vogel`, phone
  `562-555-0447`, address `5 Anchor Ct, San Pedro, CA`, vehicle `BMW 3 Series`.
  The customer's own version of the same link does **not** contain the phone,
  which is the point — the two views differ and nothing enforces the boundary.
  **Not a cross-tenant hole:** a random UUID answers 404 and ids are random, so
  nobody can walk the list. It is the one link, in the one inbox, that flips.
  **Fix:** the owner's view needs the owner's session, the same way every other
  owner surface does. The customer's link keeps working untouched.
  **Also:** this endpoint has **no rate limit**, unlike `pay-booking`.
  **Done when:** `audience=owner` without a member session returns the customer
  view or 404, and a test tries the flip and is refused. **Closes 4.2.**

### 14.3 — Nothing anywhere records that an email was sent

- [x] **DONE 2026-09-16 — every email the product sends now leaves a row, and
  the row says what became of it.** One `email_sends` row per attempted send,
  written by `send-email` on **all six of its exits** — including the three
  that used to be a `console.warn` or a `console.error` and nothing else — and
  updated by a new `resend-webhook` when the provider reports what happened.
  Proved on the deployed functions by invoicing a real demo booking three
  times: the platform's own send counter moved by **4** and **6** rows were
  written (the two extra are the sends that never reached the provider, which
  is the half that was silent). Then six signed webhook events: a delivery and
  a bounce each found their row, a forgery was refused **400**, a genuine
  signature six minutes old was refused **400**, an unmodelled event type was
  acknowledged, and a late `delivered` could **not** un-bounce a bounced row.
  It is drawn on the client record under **Emails** — subject, date, and
  *Delivered* / *On its way* / *Bounced* / *Not sent* with the provider's own
  reason. Verified at 1920, 1440, 768, 392 and 320 with no clipping, no
  sideways scroll and no new console errors. **The message body is not stored**
  — the migration says why. An asynchronous bounce now also raises the
  *"this address bounced"* banner that has existed since 2.20 and could only
  ever see a synchronous refusal. Evidence `docs/VERIFIED.md` § 14.3, receipt
  `receipts/email-sends.json`, checks `tests/email-sends.test.mjs` and
  `tests/svix-signature.test.mjs` (broken on purpose four times first,
  including twice against the real deployment). **Andrew has one three-minute
  job before the delivery half works in production** — `FOR-ANDREW.md`.
  Original report: there is no per-message record of any kind. Measured: no table in the
  database holds a sent email. `platform_email_days` is a daily counter for the
  quota and nothing else. `send-email` receives Resend's message id and
  **returns it to its caller without storing it**; a provider failure goes to
  `console.error`, which is a function log nobody watches and which expires.
  The only trace is a timestamp on the booking saying *we called Resend*, which
  is not the same as *it arrived*.
  **Why it matters:** a customer says "I never got the confirmation" and there
  is no way to answer. This is the mechanism behind 3.1 and it is worse than
  3.1 describes — 3.1 says the owner cannot tell; in fact **nobody** can.
  **Fix:** one `email_sends` row per send — business, booking, kind, to,
  provider id, result. Then Resend's delivery webhook on top of it.
  **Done when:** every email the product sends leaves a row, and a failed send
  is visible on a screen rather than in a log. *Extends 3.1.*

### 14.4 — A paid booking can be cancelled and nobody is told about the money

- [x] **DONE 2026-09-17 — a paid booking could be cancelled and nobody was told
  about the money.** A confirmed booking already marked paid, worth **$195**,
  was cancelled by an anonymous caller with no key of any kind and the deployed
  endpoint answered `{"success":true,"booking":{"status":"cancelled"}}` — not a
  word about the money. The same call now also answers
  `"refund":{"owed":true,"message":"You paid for this booking. Coastline Auto
  Detailing will arrange your refund directly — call 562-555-0180…"}`, and the
  **detailer** gets *"This was paid. Refund $195 from your own Stripe — the
  money went straight into your account, so we cannot send it back for you."*
  in their cancellation email and on the job. Measured against the deployed
  function before (v65) and after (v68), with an unpaid booking as the control
  answering `owed:false`.
  **The cancellation still goes ahead** — the roadmap's second option, and
  `_shared/connect.ts`'s own reasoning: a refund on a connected account is the
  detailer's to make from their own balance, so the product says so rather than
  blocking the customer. Nothing was refunded and nothing reached into the
  detailer's Stripe.
  **THERE ARE THREE CANCEL PATHS, NOT TWO.** `update-booking` carries `status`
  in its allowlist, so the detailer's own **Cancel the job** button is a third
  writer beside `cancel-booking` and `respond-to-booking`'s decline. And the
  decline branch really is reachable with money on it — `payability()` refuses
  to charge a pending request, but `update-booking` also allows setting
  `payment_status` by hand with no status guard, which is cash taken up front.
  Two of the three send the detailer no email, so the instruction is drawn off
  the ROW on the job screen and covers all three.
  Verified at 1920, 1440, 768, 392 and 320 and with `?lite=1`, nothing clipped,
  no sideways scroll, contrast 4.95:1, no console errors. Evidence
  `docs/VERIFIED.md` § 14.4, receipt `receipts/cancelled-refund.json`,
  artifacts `artifacts/cancelled-refund/`, check
  `tests/cancelled-refund.test.mjs` (broken on purpose **seven** times first,
  including once against the real unfixed deployment and once by blinding its
  own comparator). **Not done, deliberately:** a customer reopening the
  cancelled link later is told nothing — the public receipt does not carry
  `payment_status` and 14.1 narrowed it on purpose. Original report:
  `cancel-booking` does not mention money at all. Measured: the file
  contains no `payment_status`, no `refund`, no `paid`, no `stripe`. A booking
  that is `confirmed` and already `paid` — **one exists in the database right
  now** — can be cancelled by the customer from their own link, outside the
  cancellation window, and nothing refunds it, flags it, or tells the detailer
  that money is sitting in their account for work that will not happen.
  **The design intent is defensible** — `_shared/connect.ts` says a refund on a
  connected account is the detailer's to make, in their own Stripe. **The
  product never says so to anybody.**
  **Fix:** refuse online self-cancellation of a paid booking and say to call,
  or allow it and put "This was paid. Refund $X in Stripe." in front of the
  detailer, in the email and on the job.
  **Done when:** cancelling a paid booking produces a visible instruction to
  somebody, and a test proves it.

### 14.5 — Every money path is proved only by arithmetic, never by money moving

- [x] **DONE 2026-09-17 — a payment has now actually settled.** A $195 test
  booking was paid with Stripe's `4242` card on the hosted checkout page that
  `pay-booking` produced, on the detailer's own connected account
  (`acct_1UCMp1JeoZ7g84se`, test mode). Stripe delivered
  `payment_intent.succeeded` and `checkout.session.completed` to the deployed
  webhook, which marked the booking `paid` with `pi_3UGa9SJeoZ7g84se1Torfagi`
  one second later, and the **Money screen's "waiting on payment" fell from
  $490 to $295** — seen on the screen, not only in its query. Before this the
  development database held **zero** connected accounts, **zero** bookings with
  a checkout session and **zero** with a payment intent.
  **Four things were found that no document here knew:** the Connect webhook is
  live and `docs/OUTSTANDING.md` § 13 still says it is not; Stripe's *"use
  blank test account"* shortcut yields an account that can never charge, which
  makes the product look broken when it is not; Checkout opens on Link's phone
  step so the card fields are absent from the page entirely, and Stripe reports
  that as *"Payment method Required"*, which reads exactly like a decline; and
  `pay-booking`'s idempotency key makes a naive re-run impossible for 24 hours.
  Check `scripts/e2e-payment.mjs` — 6 targets, 22 assertions, receipt
  `receipts/e2e-payment.json`, artifacts `artifacts/e2e-payment/`, **broken on
  purpose seven times**, and **two of those sabotages passed, which was a
  defect in the check** — both only loosened an assertion that was already
  satisfied. They were replaced, and the assertion they exposed was rewritten.
  Evidence `docs/VERIFIED.md` § 14.5.
  **Not done, deliberately:** the connected account was attached by writing the
  row rather than through OAuth — the handshake itself was run end to end the
  same morning and works, but it yields the blank account above. Stripe's own
  `refresh` set `charges_enabled`, so that value is measured and not typed in.
  Nothing was refunded and no payout was checked. Original report:

  **566 money assertions pass and not one of them touches a network.**
  Measured by counting `fetch(` in each suite: `connect.test.mjs` 126 checks,
  `payments.test.mjs` 83, `platform-billing.test.mjs` 357 — **zero network
  calls between them.** They import the decision functions and test them
  directly, which is genuinely good work: `payability`, `amountDueCents`,
  `cardStatus` and `verifyWebhook` are all real and all correct.
  **But nothing in this repo has ever proved that a payment settles.** No test
  creates a Stripe checkout session, no test delivers a webhook to the deployed
  endpoint, no test watches a booking go from owed to paid.
  **This is the exact shape `docs/how-we-run.md` warns about**: green beside a
  thing that has never happened.
  **Fix:** one end-to-end run in Stripe's sandbox — connect a test account,
  pay a test booking with a test card, let the real webhook mark it paid, then
  check the Money screen moved. Needs no activated Stripe account (see 0.2).
  **Done when:** that run is a script, and `docs/VERIFIED.md` records it.

### 14.6 — Ten features have never run once, in any environment

- [x] **DONE 2026-09-17 — all ten tables now hold a row that a real run
  created.** Re-measured before anything was trusted, and **the list was one
  row out of date, not two**: 14.5's payment work had put a row in
  `connected_accounts` the day before, and the other **nine were still at
  zero**. The card payment 14.5 proved is real but is not one of these ten
  tables — it lands on `bookings.stripe_payment_intent` — so 14.5 moved ONE
  of these ten, not two.

  | table | was | now | how the row was made |
  |---|---|---|---|
  | `connected_accounts` | 0 | 1 | 14.5, the day before |
  | `dropoff_only_periods` | 0 | 1 | the detailer's own session; `create-booking` then refuses a mobile job on that day |
  | `booking_line_items` | 0 | 2 | an `add_on` $45 and a `custom` $30 on a finished job; `advancedMoney` moves by $75 |
  | `job_photos` | 0 | 1 | uploaded to private storage, read back byte-for-byte through a signed link |
  | `gallery_images` | 0 | 1 | uploaded to public storage, fetched as a signed-out stranger |
  | `site_intake` | 0 | 1 | answers saved, and the form resumes at the step they were left |
  | `translations` | 0 | 91 | `translate-content` for real; a signed-out customer's own RPC answers in Spanish |
  | `owner_push_subscriptions` | 0 | 1 | a real Windows push endpoint, and a booking made the device show the alert |
  | `platform_subscriptions` | 0 | 1 | $35 booking plan, card typed into Stripe Elements on our own screen, webhook turned it `active` |
  | `platform_invoices` | 0 | 9 | `LGOU3CDN-0006` was the first, $35, `paid` — Stripe's own document. Nine because every run and every sabotage that paid made one |

  **Two checks, both carrying the receipt discipline and both broken on purpose
  before they were trusted:**

  - `scripts/e2e-ten-features.mjs` — six targets, 42 assertions, receipt
    `receipts/e2e-ten-features.json`, **six sabotages, all six caught**. Needs
    credentials only, no dev server.
  - `scripts/e2e-browser-features.mjs` — three targets, receipt
    `receipts/e2e-browser-features.json`, **five sabotages, all five caught**.
    Needs the dev server and Microsoft Edge; the file's header says why Edge.

  **NO FEATURE ROW IS WRITTEN WITH THE SERVICE KEY**, and that is the point of
  both files: an admin-key insert proves the column names and skips row-level
  security, which is the half of these features no unit test touches. Every row
  above went in through the detailer's own signed-in session or through the
  product's own endpoint. Both canaries are the same negative control — **a
  signed-out stranger must be refused** — because every green here is a claim
  about WHO made the row.

  **FOUR THINGS THIS FOUND THAT NO DOCUMENT HERE KNEW:**

  1. **The Money screen counts three categories that cannot exist.**
     `moneyAdvanced.js` treats `add_on`, `upsell`, `surcharge` and `adjustment`
     as sold-at-the-job; the database's check constraint allows only `service`,
     `upgrade`, `add_on`, `custom`, `travel_fee`, `tip`, `discount`. **The
     intersection is `add_on` alone, and `FinalizeModal`'s default for a new
     line is `custom`** — so $45 added at the car the ordinary way counts as
     $0 in *"% of what you brought in was sold at the job"*. The first insert
     this repo ever attempted, with `category: "upsell"`, was refused by
     Postgres with `23514`. **Not fixed: it is a ruling about which list is
     right.** `FOUND.md`, and **14.6a below is Andrew's call.**
  2. **A headless push test needs a BRANDED browser AND a PERSISTENT profile.**
     Playwright's own Chromium refuses twice with two different errors and
     neither names the real cause — *"does not support the Push API in
     incognito mode"*, then *"push service not available"*. Edge with a
     persistent profile subscribes on Microsoft's own service first time.
  3. **PUSH DELIVERY IS VARIABLE, AND A CHECK THAT TREATS ONE MISS AS A
     DEFECT WILL LIE ABOUT THE PRODUCT.** Measured over seven runs against the
     same code: **five delivered in seconds, two delivered nothing inside
     36–60 seconds.** The misses were not the product — the run that
     followed each one, unchanged, delivered normally, and a diagnostic
     confirmed the worker was registered, active, subscribed and permitted at
     the moment nothing arrived. A first guess that stale device rows were
     starving the live one was **wrong and is recorded as wrong**: one miss
     happened with four stale rows and one with none. The wait is 60 seconds
     and a miss here is worth re-running before it is worth investigating.
  4. **A check that never pressed the button reported a broken product.** The
     first version located Pay by its text, clicked something else, and failed
     sixty seconds later with *"the subscription went active: incomplete"*.
     `Billing.jsx`'s `confirm()` opens with `if (!stripeRef.current) return;`,
     so a press that does not land produces no error, no spinner and no
     navigation. **The press is now verified, not assumed.**
  5. **And the browser check shipped three assertions that could not fail.**
     Its invoice section asked whether the business had an invoice at all,
     which a previous run's invoice satisfied — so with `--break=nopay`, where
     no payment is made and no invoice can exist, it went **green**. A fourth
     line compared a column `platform_invoices` does not have, behind an `||`
     that made it true whatever happened. **The sabotage found it; reading the
     file twice had not.** It now demands an invoice created after the run
     started, and `nopay` produces 7 red instead of 3. The same run also
     showed `wrongcustomer` failing for an unrelated reason, which does not
     count as caught and was re-run until it failed on its own assertion.

  **What is NOT covered, named rather than left implied:** neither file presses
  the buttons on `FinalizeModal`, `DaySheet`, `SiteIntake`, `Gallery` or
  `JobPhotos` — the wire call is identical but the React form is not
  exercised, and `shrink()` in `lib/photos.js` (canvas, EXIF orientation) is
  browser-only and skipped. Nothing was refunded, the subscription was not
  cancelled at the end, and no payout was checked. Evidence
  `docs/VERIFIED.md` § 14.6. Original report:

  **Measured by row count on every table.** These were at **zero**:

  | Empty table | The feature it is the evidence of |
  |---|---|
  | `connected_accounts` | A detailer taking card payments. **Never connected once.** |
  | `platform_subscriptions` | A detailer paying for this product. Never completed. |
  | `platform_invoices` | The invoice for that. Never produced. |
  | `job_photos` | Before/after photos. Never stored one. |
  | `owner_push_subscriptions` | Push alerts to the detailer's phone. Never subscribed. |
  | `gallery_images` | The detailer's gallery. Empty. |
  | `site_intake` | The "build me a website" questionnaire. Never used. |
  | `translations` | The per-business Spanish store. Empty. |
  | `booking_line_items` | Upsells added at the car — and the Money screen's "% of what you brought in was sold at the job" is computed from this, so that figure has never once been calculated against real data. |
  | `dropoff_only_periods` | Drop-off-only stretches of the calendar. Empty. |

  **Be fair about what this proves.** An empty table does not mean the code is
  broken — the Stripe Connect path in particular is carefully written and its
  unit tests are good. It means **nobody has ever driven it end to end**, so
  nobody knows. That is the honest answer to "does it work or look like it
  works": for these ten, the answer is *unknown*, and unknown has been reading
  as *works* because the screens are all there.
  **Fix:** one real run each, in order of money first. Several are one session.
  **Done when:** each table has at least one row that a person or a scripted
  run actually created, recorded in `docs/VERIFIED.md`.

### 14.6a — Which line-item categories count as "sold at the job"

- [x] **DONE 2026-09-17 — Andrew ruled, and it is one list now.** His words:
  *"anything beyond the base price — any upgrade of either package, add-on, a
  travel fee, whatever — counts as more money we made."*

  **AND THE DIAGNOSIS IN 14.6 WAS HALF WRONG, WHICH IS WORTH KEEPING.** The
  tile a detailer actually taps — *"Added on site"* on `Money.jsx` — was
  **right all along**; it held its own correct copy of the list. The wrong one
  was in `moneyAdvanced.js`, behind *"The full picture"*: its *"Sold at the
  job"*, its quoted-vs-added bar and its *"Sells an extra"* percentage. **The
  same three words meant two different figures on two screens.** The comment in
  `moneyAdvanced.js` said the two lists "move together"; they had not, and
  nobody could tell because the table was empty until 14.6 put a row in it.

  **ON THE DEMO DATA THE WRONG FIGURE WAS NEVER ON SCREEN**, because *"The full
  picture"* hides its rates below eight finished jobs and this business has six.
  A wrong number nobody can see is still wrong, and it would have appeared the
  moment a real detailer passed eight jobs.

  `ON_SITE` is now **exported from `moneyAdvanced.js` and imported by
  `Money.jsx`** — `upgrade, add_on, custom, travel_fee, discount`. A discount is
  negative and nets against the rest, as `Money.jsx` always did. A tip stays
  out: it is not a sale, it is already reported separately, and counting it
  would show the same dollar twice and break `quoted + added + tips = brought
  in`. `upsoldJobs` counts sales only, so a job whose only extra line was a
  discount is not a job you sold something on.

  **Checks, both broken on purpose first.** `tests/money-advanced.test.mjs`
  § 10 — the list is compared against the migration's own check constraint,
  **read from the SQL file rather than retyped**, a stale regex fails rather
  than passing on an empty set, and `Money.jsx` is asserted not to declare a
  list of its own. Four sabotages, all caught: restoring the impossible
  categories (5 red), giving `Money.jsx` its own copy again (1 red), counting
  tips as a sale (6 red), and breaking the migration regex so it parses nothing
  (2 red). `scripts/e2e-ten-features.mjs` § 2 now adds **an `add_on` AND a
  `custom`** and requires the figure to move by $75 — against the old code it
  reads $45 and says so by name.

  **Seen on the screen**, 1440x900 and 392x844, no console errors: BROUGHT IN
  $810, QUOTED UP FRONT $735, ADDED ON SITE **+$75**, and $735 + $75 = $810.

### 14.7 — The Money screen's overstatement, with a number

- [x] **DONE 2026-09-17 — the contradiction is settled and the words are
  fixed. Evidence `docs/VERIFIED.md` § 14.7.**

  **THE CONTRADICTION, RESOLVED OUT LOUD BEFORE ANYTHING WAS TOUCHED.**
  `app/src/screens/Money.jsx` said the accrual maths *"has to stay that way"*;
  5.1 said to compute net from collected money only. **Both were right about
  different things.** The comment was right on the maths — the six-bar chart
  the headline sits on, the *vs last month* delta, the tour step and the
  accountant CSV all count work done in the period, so a cash-basis headline
  would disagree with the chart underneath it. 5.1 was right on the words:
  *brought in* and *kept* promise the money arrived, and $295 of it had not.
  **So 5.1 wins on the labels, the comment wins on the maths** — 14.7's own
  recommendation. The comment block is rewritten to say so rather than left
  contradicting the fix.

  **RE-MEASURED AND IT HAD MOVED: $295, not $230.** All time on the demo
  business: earned $4,745, collected $4,450, owed $295, expenses $1,102, so
  the screen read $3,643 against a cash position of $3,348. The extra $65 is
  **ROADMAP 14.5's own canary booking**, `pending`, dated 2026-09-11, left in
  place and flagged per 0.3. The check therefore asserts the IDENTITY —
  accrual net minus cash equals what is owed — not a dollar amount.

  **AND YES, THE FIGURE HAD A SECOND COPY.** `Money.jsx` held its own
  `revenueIn`, expense filter, net, average job and quoted/added split, all of
  which `moneyAdvanced.js` already computed from the same rows for the advanced
  screen — 14.6a's defect with a new subject. They had begun to differ already:
  one hardens amounts with `num()`, the other used a bare `Number()` that turns
  the whole figure into `NaN`. **Worse, `moneyAdvanced.js` returned the accrual
  total under the name `collected` and the cash total under `collectedPaid`**,
  while `Today.jsx` uses `collected` for cash — so adding 5.1's *Collected*
  cell the obvious way would have shipped the overstatement under the one label
  that promises it cannot. Now `earned` / `collected` / `owed`, and every figure
  on both money screens plus the chart comes from one `advancedMoney()` call.

  **WHAT IS ON THE SCREEN:** headline *Earned less expenses this month*, cells
  *Earned* / *Expenses* / *Avg job* / *Jobs done*, then **Collected $515 and
  Still owed $295** beneath them. The back office says *earned*, not *taken*.
  Nine Spanish keys replaced eight in the same edit.

  **5.1's *Expenses paid* WAS REFUSED, ON PURPOSE.** An expense row has no
  paid/unpaid column, so that label would be a new unverifiable claim replacing
  an honest one. It stays *Expenses*.

  **Checks, broken on purpose eight ways first, all eight caught.**
  `tests/money-overstatement.test.mjs` — 48 assertions, one target per
  `payment_status` value read off the migration's constraint, canary, receipt.
  A fifth payment state fails the run and `scripts/receipt.mjs` refuses the
  receipt. Red counts: 6 / 3 / 2 / 1 / 1 / 4 / 2, plus 2 in `money-advanced`
  § 10. Seen at five widths, both languages, normal and `?lite=1`, no console
  errors.

  **5.1's DONE-WHEN WAS PRESSED, NOT ASSUMED.** *Mark paid* on the $65 job, in
  the browser: COLLECTED $515 -> **$580**, STILL OWED $295 -> **$230**, EARNED
  unchanged at $810, and the row left the *Waiting on payment* list, whose
  total went $295 -> $230. **$65 is a price no other unpaid row has** (the
  other two are $110 and $120), so the observation could only pass for the
  right reason. **The accrual net stayed $285 and that is the deviation from
  5.1, stated plainly:** 5.1 wanted net to move when a job is paid; 14.7 chose
  accrual, so what moves is the pair beside it. The demo row was set back to
  `pending` afterwards and the screen re-read at $515 / $295 — the data is
  exactly as it was found.

  **ANDREW APPROVED THE WORDING, 2026-09-18.** He was handed the choice —
  keep *Earned less expenses* as the headline label or pick different words —
  with the recommendation to keep it, and his answer was *"ur recomendation is
  good"*. **So the label is his now, not an inference**, and the next session
  to dislike it is arguing with him rather than with a guess. Nothing was
  changed on the strength of this; the screen already read that way.

  **STILL OPEN IN WAVE 5:** 5.2 (half a month compared to a whole one), 5.3
  (receipts findable) and 5.4 (link-open counts) are untouched. 5.1 itself can
  be ticked on the strength of this.
  *Superseded 2026-09-18: 5.2 is done — `docs/VERIFIED.md` § 5.2, and 5.3 is
  done — `docs/VERIFIED.md` § 5.3. 5.4 is still open.*

### 14.8 — A second back-office login nobody has written down

- [ ] **`platform_admins` holds two rows, not one.** `demo@detailplatform.com`
  is the known deliberate one (0.1, 12.4). The other is **`demo@demo.com`**,
  which belongs to no business and is not mentioned in any document in this
  repo. It holds the same full back-office access: every detailer, every
  customer, suspend, impersonate, change prices.
  **This is not a new risk today** — same as 0.1, every business is a fixture.
  It is a **sizing** correction: 12.4 says "one guessable `demo123` login" and
  there are **two** guessable logins, one of which nothing tracks.
  **Fix:** fold into 12.4 — remove or rename both before the first real signup.
  **Done when:** `platform_admins` contains exactly the accounts a document
  names, and a check fails if it grows a row nobody declared.

### 14.9 — Nine public endpoints have no rate limit

- [ ] **Measured by counting `withinLimits` in each public function.** These
  have it: `create-booking`, `pay-booking`, `plan-link`, `unsubscribe`,
  `address-suggest`, `stripe-webhook`. These do **not**: `available-slots`,
  `calculate-booking`, `validate-promo-code`, `get-booking-receipt`,
  `track-visit`, `cancel-booking`, `reschedule-booking`, `accept-quote`,
  `booking-ics`.
  **Three of those nine write** — cancel, reschedule and accept-quote change a
  booking. The others are reads, and the risk there is the project's Supabase
  invocation bill rather than data.
  **Not urgent, and say so:** every one still needs the booking's own random
  id, so this is a cost and nuisance problem, not a way in.
  **Fix:** the blunt ceiling `pay-booking` already uses — `LIMITS.publicCeiling`
  keyed on IP — on the three writes first.
  **Done when:** a loop against each of the three writes is refused, and the
  refusal is proved by running the loop.

### 14.10 — the sweep was measuring its own patience, and 1440 was mostly innocent

- [ ] **Five runs of `sweep-widths.mjs` on the afternoon of 2026-09-20, same
  account, same dev server, same seed.** 1440 truncated the guided tour to one
  block three times, walked all 33 steps once, and on the fifth **aborted the
  whole width after 84 of 125 surfaces** on `locator.click: Timeout 15000ms
  exceeded`. 392 and 320 did neither, in any of the five.
  **This is its own item because it is an instrument problem, not an inventory
  one.** Andrew, 2026-09-20: *"Folding it into the inventory work would bury a
  flaky instrument inside a finished item, and then every future 1440 result
  carries an asterisk nobody can see."*
  **Two symptoms, and whether they are one fault is unknown.** A tour that
  stops after its first tab and a width that dies on a click may share a cause
  — a click that silently misses, a tab that never finishes arriving — or may
  be unrelated. Nothing measured so far distinguishes them, and guessing is
  the tempting move.
  **The cheapest experiment is a run that does nothing else:** open the tour at
  1440 twenty times, record how many blocks it reaches each time, and take a
  screenshot of the frame where it stops. Twenty runs of one tour is a few
  minutes; a full sweep is nine.
  **Two detectors already watch for this and neither can close it.** The
  cross-width check fails whenever the tour's tab count differs by width, but
  deliberately refuses to say which width is wrong. The ledger
  (`receipts/sweep-widths-ledger.json`) counts aborts and shortfalls per width
  and fails when more than two of the last five runs did not complete — so the
  pattern becomes visible on its own, but neither one explains it.
  **Note that the ledger records 1440 as `complete` while its tour truncates**,
  because the truncated steps are accounted for as declared skips. That is
  correct and worth knowing: the two detectors answer different questions and
  only one of them is about this fault.
  **THE TWENTY-RUN EXPERIMENT IS DONE, AND THIS IS A DIFFERENT ITEM FROM THE
  ONE ABOVE — 2026-09-20, `node scripts/tour-runs.mjs 20 1440 392`.** Twenty
  cold opens of the tour at 1440, with five control runs at 392 in the same
  batch. The control completed 5/5, so the walk works and what 1440 did is
  about 1440.

  | at 1440 | runs |
  |---|---|
  | 34 steps, six blocks `5+6+6+5+6+6`, complete | **16** |
  | 31 steps, six blocks, complete | 1 |
  | 29 steps, **five** blocks — the first block never happened | 1 |
  | 11 steps, two blocks | 1 |
  | 0 steps — the card never arrived | 1 |

  **17 of 20 complete. It is not "the tour dies after its first tab."** That
  framing came from three sweep runs and no run here reproduced it. The real
  rate is roughly one in seven, and it has at least three different shapes.

  **AND THERE IS A SIGNATURE, WHICH IS THE USEFUL PART.** Both early deaths
  show a block opening on a total lower than its real one and then correcting:
  `1/5 2/5 3/5 4/5 5/5 1/3 2/6 3/6 …` — the second block announced three steps
  and had six. **2 of 20 runs grew a plan mid-block, and both of them died.
  All 17 runs without that growth completed. The 392 control grew none.**
  `Walkthrough.jsx` already documents this exact hazard beside the code that
  is supposed to prevent it — the count is meant to be taken once the screen
  has stopped arriving — so the guard exists and is incomplete at 1440.

  **WHAT IS STILL UNEXPLAINED, AND IT IS NOT THE SAME THING.** The sweep
  reports 1440 at `1 block declaring 5 = 5 steps` **consistently**, not one
  time in seven. The sweep reaches the tour after roughly eighty surfaces of
  clicking, sheets and tab switches; this script goes straight to it on a cold
  sign-in. So the sweep's truncation is a different phenomenon from the
  intermittent one measured here, and the next probe is the sweep's own tempo:
  `settle()` returns after 130ms of quiet where this script waits a flat
  second, and `TOUR_WAIT` exists on `tour-runs.mjs` to repeat these twenty runs
  at that pace.

  **THE TEMPO ARM SETTLED IT, AND THE ANSWER IS THE INSTRUMENT — 2026-09-20,
  `TOUR_WAIT=300 node scripts/tour-runs.mjs 20 1440 392`.** The same twenty
  runs, pressing *Next* 300ms after each card instead of a flat second,
  because `settle()` returns after 130ms of quiet and that is the tempo the
  sweep actually presses at:

  | arm | result |
  |---|---|
  | 1440px at 300ms, 20 runs | **20 of 20 stopped at exactly 5 steps, one block `[5]`** |
  | 392px at 1000ms, 5 control runs | 5 of 5 complete, 33 steps, six blocks |
  | 392px at 300ms, 5 runs | **0 of 5 complete**, four of them dying at 4 steps |

  **That is the sweep's own line, reproduced twenty times out of twenty:**
  `tour · the blocks  1 block(s) declaring 5 = 5 step(s); 5 walked`. And the
  short wait ends the tour at 392 as well — at 4 steps rather than 5, which is
  exactly the size of that width's first block. **The tour dies on the press
  that has to carry it to the next TAB, whenever that press comes too soon.**
  It is not a property of 1440; 1440 is simply where the sweep's timing
  happened to land.

  **SO THE ITEM SPLITS, AND THE LARGER HALF IS OURS.**

  - **The sweep's consistent truncation is the sweep.** It has been measuring
    its own patience. `settle()` is a cap on a repaint and the next block's
    card is not a repaint of this one — the fix is to wait for the next card
    to exist rather than for the page to go quiet. **Not done here: this
    session was asked to run the experiment and stop.** No sweep result about
    the tour above step 5 at 1440 was ever a fact about the product.
  - ~~**The cold-open failures are real and rare.** 2 of 20 at a full second
    between presses, both carrying the plan-growth signature — a block opening
    on a total lower than its real one, `1/3` then `2/6`. That is the product
    and it is worth fixing.~~ **STRUCK 2026-09-20. THE 2-IN-20 WAS NEVER A
    FACT ABOUT THE PRODUCT AND MUST NOT BE QUOTED AGAIN** — it was quoted
    twice in one day before it was caught.

    **The fault was the same one the sweep had, one size smaller: a card
    absent at the moment of looking was read as the tour ending.**
    `tour-runs.mjs` pressed, waited a flat second, then asked whether the
    card had gone — and a tour crossing into its next tab has no card for a
    few hundred milliseconds. Nothing about the product was being measured at
    that instant. The same script waiting for the next card to EXIST saw
    **0 of 20** short at 1440, all twenty walking the full 34 steps.

    **What that does and does not establish, because the difference is the
    whole lesson of this item.** It voids the evidence; it does not acquit the
    product. 0 of 20 cannot prove a clean walk — if the real rate were one in
    ten, twenty runs would come back empty about one time in eight. So the
    honest statement is **there is no longer any measurement suggesting a
    cold-open failure exists**, not that one has been ruled out. The
    plan-growth signature itself is also no longer fatal by construction: a
    block whose total changes mid-flight produces a CHANGED step counter,
    which is exactly what `nextCard()` treats as the next card arriving.
    **Anyone re-opening this needs a new measurement, not this number.**

  **AND NOW IT IS MEASURED IN THE SWEEP ITSELF RATHER THAN BY PROXY —
  2026-09-20, second session.** Everything above rests on one number nobody
  had ever read: *300ms* was chosen because `settle()` returns after 130ms of
  quiet. That is an inference about a line of code, not a reading of it.
  `settle()` RETURNS the milliseconds it waited and the tour walk was throwing
  that value away, so the load-bearing figure in the finding was the one
  figure never measured. It now prints — `tour · the pace`.

  **The reproduction argument was also weaker than it read.** At 1440 the
  blocks are `5+6+6+5+6+6`, so *any* death on the first tab-crossing press
  produces "5 steps, one block". Twenty out of twenty matching the sweep's
  line confirms that a tab-crossing press can be killed; on its own it does
  not confirm that TEMPO is what kills it in the sweep. Four runs of the real
  sweep at 1440 close that gap directly:

  | run | what changed | `settle()` returned | result |
  |---|---|---|---|
  | default | nothing | `223 275 260 255` **`583`** | 5 steps, 1 block |
  | canary, cap 1ms | `SWEEP_TOUR_SETTLE=1` | `21 21 22 26 21` | 5 steps, 1 block |
  | held | `SWEEP_TOUR_HOLD=1000` | same ~250, plus a 1s hold | **34 steps, 6 blocks, every one clean** |

  **The sweep's real tempo at 1440 is ~250ms, not 300ms** — 223–281ms on an
  in-tab press and 528–630ms on the press that crosses to a new tab. Holding
  a further second between presses, and changing nothing else, walks the
  whole tour. **The truncation is the sweep's patience, proved inside the
  sweep.** Reproduced three times; the clean one is 17:19:30, the other two
  carried a concurrent `app/src` edit and say so.

  **AND THE CAP IS NOT THE CEILING PEOPLE THINK IT IS.** On the held run
  `settle()` came back at `1007`, `1019` and `1001` — it hit its own 1000ms
  cap at three of the five tab crossings. So even "wait for quiet, up to a
  second" is not enough there. This is the documented
  *`settle()` cannot catch an animation that has not started yet* one level
  up: it cannot catch a CARD that has not been created yet.

  **ONE HYPOTHESIS TESTED AND KILLED, WHICH IS WHY IT IS WRITTEN DOWN.** The
  sweep trails `1/4 2/5 3/5 4/5 5/5` where the 300ms script trails
  `1/5 2/5 …` — the sweep reads the first card declaring FOUR and it corrects
  to five, which is the plan-growth signature the cold-open deaths carry. It
  looked like a second cause hiding under an identical summary line. It is
  not: the `1/4` appears in all four sweep runs **including both that walked
  the full 34 steps**, so growth on card 1 is survivable and is only the
  sweep reading the plan a beat earlier than the other script does.

  **THE CONSEQUENCE NOBODY HAD NAMED: the 1440 baseline is a record of the
  fault.** `sweep-widths.expected.json` lists `tour · step 1`–`7` at 1440 and
  1–33 elsewhere. The default run truncating at 5 **passed** the expected-count
  gate and exited 0; the held run walking the real 34 **failed** it with 27
  `NOT EXPECTED`. So at 1440 the gate has been grading the product against an
  instrument fault, and the answer it holds as correct is the broken one.
  **Do not `--write-expected` to clear this** — that writes a hold-dependent
  run in as the truth. It is fixed by fixing the walk.

  **RE-ESTABLISHED ON A STABLE TREE, AND FIVE RUNS THROWN AWAY TO DO IT —
  2026-09-20, at `c4058d3`.** The five runs above were taken between 10:07 and
  10:25 while another session was editing `app/src`; its commit landed at
  10:30:35. **Two of the five were caught mid-edit by the sweep's own
  source-change guard, and the other three simply predate the change** — so
  all five were discarded rather than averaged with what came after. A rate
  computed across two versions of the page is the same lie as a receipt that
  cannot tell stale from failed. Everything below is one tree, zero
  source-change warnings, both canaries caught.

  | arm | result |
  |---|---|
  | `TOUR_WAIT=250`, 20 runs at 1440 | **20 of 20 at 5 steps, one block `[5]`** |
  | control, 5 runs at 392 @1000ms | 5 of 5 complete, 33 steps, six blocks |
  | tempo arm, 5 runs at 392 @250ms | **0 of 5**, stopping at 4, 10, 4, 10, 4 |
  | sweep at 1440, default | pace `273 257 248 251` **`562`** — 5 steps, one block |
  | sweep at 1440, `SWEEP_TOUR_HOLD=1000` | **34 steps, six blocks**, caps of `1019`, `1007`, `1023` at the crossings |

  **250ms is the measured tempo, not the 300ms stand-in**, and it reproduces
  everything the stand-in did. The tempo arm is the load-bearing one: the same
  short wait kills the tour at 392 too, so the subject column is about pressing
  fast and not about 1440.

  **AND HERE IS THE PART THAT IS WORSE THAN A CAVEAT.** The truncated run does
  not merely fail to measure steps 6 and 7 — **it declares them unreachable**:

  ```
  tour · step @1440   5 step(s), ended on the last card it had (5 of 5)
                      — 2 inventory label(s) this dashboard cannot produce:
                        tour · step 6, tour · step 7
  ```

  A declared skip in this repo is supposed to be *a surface proved
  unreachable*. Here it is asserted off the back of a walk that died, so the
  sweep **manufactures the justification for its own fault, once per run**, and
  that is why the default run exits 0 and passes the expected-count gate. It is
  not that the baseline happens to record seven steps; it is that the
  instrument re-certifies the truncation as correct every time it runs. Any
  fix has to make that skip provable or stop it being issued.

  **Done when:** the sweep waits for the next card instead of for quiet, and a
  clean twenty-run batch at that tempo shows the tour reaching six blocks at
  1440 — **and** `tour · step 6`/`7` are no longer issued as declared skips at
  1440 — **and** `sweep-widths.expected.json` carries `tour · step 1`–`34` at
  1440 as a consequence of that walk rather than of a `SWEEP_TOUR_HOLD` run —
  **and**, separately, the plan-growth signature has a fix in
  `Walkthrough.jsx` that drops the 2-in-20 cold-open rate measurably.

### 14.11 — a check with a sanctioned word for testing nothing

- [ ] **A declared skip in this repo is supposed to mean a surface proved
  unreachable, and one of them is really just a walk that died — so the
  instrument certifies its own fault as correct on every run and the gate
  believes it. That is the disease at the level above the disease: not a check
  that tests nothing, but a check that has a sanctioned word for testing
  nothing.** Andrew's manager, 2026-09-20, on the finding in 14.10.
  **Split out of 14.10 deliberately and it is the larger item.** 14.10 is one
  instrument pressing too fast. This is about what the repo is allowed to call
  a skip, and it reaches every check that has ever declared one.

  **THE INSTANCE, SO THE RULE HAS SOMETHING TO STAND ON.** The width sweep's
  tour walk ended at step 5 at 1440 and printed:

  ```
  tour · step @1440   5 step(s), ended on the last card it had (5 of 5)
                      — 2 inventory label(s) this dashboard cannot produce:
                        tour · step 6, tour · step 7
  ```

  *This dashboard cannot produce* is a claim about the **product**. It rested
  entirely on `last.at === last.of` — the walk ended on the last card of a
  block. **At a tab boundary that is exactly what a walk that died looks
  like**, because the card there reads `5 of 5` too. So the run wrote its own
  truncation off as a property of the dashboard, once per run, and that is why
  the truncating run **exits 0 and passes the expected-count gate** while the
  complete walk fails it.

  **AND THE PART THAT MAKES IT AN ITEM RATHER THAN A BUG: THIS REPO ALREADY
  HAD THE RULE, AND THIS SITE WENT AROUND IT.** `sweep-widths.mjs` has exactly
  two places that issue a skip. One is `declareSkip(label, reason, reachable)`,
  which **re-asks a probe and refuses the skip if the surface is actually
  there** — its own comment says *"the run proves the surface was genuinely
  out of reach rather than taking the caller's word for it"*, and a refusal is
  louder than the thing it hid. The other is a bare `SKIPPED.push` in the walk
  accounting, with no probe and no way to refuse. **The correct pattern was
  forty lines away and had been for days.** Same shape as the animation fix
  that lived in `screenreader-structure.mjs` while the script measuring nothing
  but edges went without: a technique that lives in one instrument is not a
  technique the repo has.

  **THE RULE, WHICH IS THE DELIVERABLE.** A skip carries the evidence that the
  surface was **reached and refused**, or it is not a skip and the run does not
  get to pass on it. Anything that cannot produce that evidence stops being
  issued as a skip at all and becomes a finding. Three consequences worth
  writing separately:

  - **The evidence is an ACT, not a state.** `declareSkip` probes. The walk's
    evidence is that it pressed, waited the full bound, and nothing came.
    "The thing was not there when I looked" is not evidence — it is the
    sentence every dead walk also produces.
  - **A skip that cannot be refused is not a skip.** If no probe could ever
    contradict it, it is an assertion wearing a measurement's clothes.
  - **A run may not grade itself on skips it issued.** The truncating run
    passing its own gate is the whole failure in one line.

  **DONE ON THE INSTANCE, 2026-09-20.** `nextCard()` replaces the
  wait-for-quiet in both the tour walk and the four tab guides, and
  `endProved` is set only by a press whose full wait came back empty. A walk
  that stopped because the card was already gone writes **nothing** off and
  prints `ENDED WITHOUT PROOF` with the labels it refused to excuse.
  `SWEEP_TOUR_HOLD` is deleted in the same change — a switch that can make a
  check complete when the check cannot is one somebody reaches for on a bad
  afternoon.

  **THE AUDIT IS DONE — ALL 21 READ, 2026-09-20. THE HEADLINE IS THAT THE REPO
  CAME OUT BETTER THAN THE SWEEP DID.** The question asked of every one was:
  *what would have to be true for this skip to be refused, and does anything
  ask?*

  | | scripts |
  |---|---|
  | declare `skipped_targets` | **21** |
  | of those, the grader itself (`receipt.mjs`) | 1 |
  | **issuers** | **20** |
  | ever asked to prove a skip before today | **1** |
  | **never asked** | **19** |

  And what the reading found, which is not what was feared:

  | verdict | scripts | which |
  |---|---|---|
  | **Skips reach a receipt and are refusable** | 4 | `american-english`, `link-counts-agree`, `edge-tenant-replay`, `sweep-widths` |
  | **Skips reach a receipt and were NOT refusable** | **1** | **`tenant-matrix` — fixed today** |
  | Skip is an anonymous subtraction: refusable, but silent about *which* | 5 | `contrast-insitu`, `keyboard-walk`, `screenreader-structure`, `text-spacing-walk`, `zoom-walk` |
  | Reports `0`, and every skip path exits non-zero **before** a receipt exists | 10 | the four `e2e-*`, `pinned-bar`, `dashboard-notifies`, `restore-drill`, `deployed-inventory`, `example-ctas`, `example-shots-check` |

  **THE ONE REAL ONE, AND IT WAS HIDING IN PLAIN SIGHT.** `tenant-matrix.mjs`
  keeps a `skips` array, fills it with written reasons — seeds it could not
  plant, tables where B owns no row, RPCs whose arguments cannot be
  synthesised, buckets it could not write to, a realtime publication — prints
  `${skips.length} skip(s)` into its own HTML report, files every one in
  `warnings`, **and handed the grader a literal `0`.** So `receipt.mjs`'s rule
  that *skips are failures unless allowlisted with an expiry* could never fire
  on the one check in this repo that skips the most. The reasons existed the
  whole time; only the accounting lied. It now reports `skips.length`, which
  means **its receipt will fail** until somebody allowlists them with a date
  they are willing to put their name on, or removes them. That is the intended
  outcome.

  **PROVED BY BREAKING THE GRADER, NOT BY READING IT.** `tenant-matrix` writes
  to the demo tenant, so it was not run. Three probes built from its real
  receipt and fed to `node scripts/receipt.mjs <file>`: `skipped_targets: 0`
  passes every rule; `5` with no allowlist fails with *"5 target(s) skipped
  with no `skip_allowlist`"*; `5` under an allowlist dated 2020 fails with
  *"under an allowlist that expired"*. **The guard fires in both failure
  directions and stays quiet at zero.**

  **A COUNT GIVEN EARLIER IN THE SAME SESSION WAS WRONG AND IS CORRECTED
  HERE.** It claimed *five scripts issue coverage claims nothing can refuse*,
  on the strength of `skipped_targets: 0` sitting beside four identical target
  counts. Reading the code rather than the receipt line showed the ten
  `0`-reporting scripts are honest: **every `SKIPPED` path in them exits 1 or
  2 before any receipt is written**, several with the comment *"A SKIPPED RUN
  MUST NOT READ LIKE A PASSING ONE"* and one that says *"NOTHING ran and NO
  receipt was written. This is not a pass."* The wrong count was wrong in the
  direction that flattered the finding, which is the direction to distrust.

  **AN ADJACENT FINDING, RECORDED BECAUSE IT IS THE SAME DISEASE WEARING A
  DIFFERENT COAT — and it is NOT a skip, so it is not fixed here.** Three
  scripts set `expected_targets` to `rows.length` — *what this run produced* —
  and then set discovered, attempted and completed to the same variable:
  `dashboard-notifies`, `restore-drill`, `tenant-matrix`. `receipt.mjs`'s
  "the four counts must agree" rule **cannot fail for them by construction**,
  and a target that quietly vanishes takes the expectation down with it. That
  is a gate that follows the data, which CLAUDE.md already names as the thing
  that can never fail. `deployed-inventory` and `example-shots-check` do the
  same thing off a structural constant (`dirs.length`, `SITES.length`), which
  is a real floor and much weaker as a fault.

  **STILL OPEN:** the 5 anonymous-subtraction scripts need words, not
  refusability — they already fail the grader twice over when the number goes
  positive, because the four counts stop agreeing at the same moment. What
  they cannot say is **which** targets went missing or whether the run
  declined them or failed them. Not edited yet, and the reason is the rule
  this session has argued all day: **they need a browser and a dev server to
  break-test, and the other session is back in `app/src`.** Editing five
  checks I cannot run, and cannot deliberately break, would be exactly the
  unverified change this item exists to stop.

  **Done when:** every `skipped_targets` writer in `scripts/` either routes its
  skips through a probe that can refuse them or stops issuing them — **and**
  one skip per script has been refused on purpose to prove the probe fires,
  **and** `receipt.mjs` fails a receipt whose skips carry no evidence field, so
  the rule is graded rather than remembered.

---

## Release gates

From A1 § 11. Use these rather than "the wave is finished".

- **Gate A — safe private pilot.** Waves 1–4 closed or explicitly risk-accepted
  with a temporary safeguard. Every example CTA passes an automated mapping
  check. One complete booking lifecycle passes. Real-device phone pass done.
  External booking and email-failure alerts work.
- **Gate B — Andrew runs in parallel.** Money reconciles against his old
  records. Confirm/undo and audit history work. Daily export and fallback
  available. Ten real jobs complete with no lost state and no invisible missed
  message.
- **Gate C — Andrew retires the old system.** Several weeks of parallel
  operation reconcile. Restore drill passes. Weak-signal and retry pass.
  Cancellation/reschedule/quote/receipt lifecycle passes. He can recover
  tomorrow's schedule during an outage.
- **Gate D — sell to strangers.** Waves 1–8 closed. Legal pages match reality.
  `/examples` and pricing communicate without help. Admin spots failures before
  customers report them. A small group of pilot detailers has completed real
  jobs and their support failures have been addressed.

---

## Watch list — findings that may be wrong

Do not act on these without checking first. **A wrong diagnosis attached to a
real observation is still a real observation** — keep the reproduction even if
the explanation dies.

**ALL SEVEN WERE SETTLED ON 2026-09-20 and none is an open maybe any more.**
Four were struck with the evidence beside them, one was corrected because it
understated a real vulnerability, and one — P1-04 — was split: two thirds of
it have been built since the audit and the remaining third is named precisely
rather than left as a doubt. **Nothing here needs re-deriving before it can be
acted on.** Every strike keeps its observation, per the rule above.

| Item | Why it is suspect |
|---|---|
| ~~A2 1.1 demo has admin access~~ | **STRUCK — not a defect.** Andrew merged the two logins on purpose because switching accounts was annoying, and nobody is on the site. **Do not "fix" it** — that locks him out of his own back office. It comes out at the first real signup: 12.4. |
| ~~A2 4.5 link-open counts~~ | **STRUCK 2026-09-20 — the observation was real and both causes are fixed.** Money said *"None of your links were opened in this period"* while Business said *"1 link · 21 opens"*: real, and it was TWO faults at once. **The audit's guess was half right.** The periods genuinely do differ by design — `whereFrom` takes a period from Money and none from Business, because that screen has no period control — but the disagreement was a second tally: Business counted PAGE LOADS and every visit including switched-off links, where Money counted PEOPLE on live links. **Both screens read one function now** (`whereFrom`, ROADMAP 4.2) and the Business label became **"so far"** under 5.4, chosen to say *all time* without the phrase, precisely so the comparison that opened this item cannot be made wrongly. Verified by reading both call sites, not by trusting the note. |
| ~~A2 1.4 example brand names~~ | **STRUCK 2026-09-20 — not a finding, and it never needed verifying.** It is a judgment about how much a demo may borrow, and Andrew already downgraded it to a recommendation. It now sits on his list as two plain questions — the example site named after a probably-real firm, and his own domain in the marketing page's mock browser bar — each with a recommendation and a one-word answer. **Waiting on him, not on a measurement.** |
| A1 P1-04 invoices missing | **VERIFIED 2026-09-20 — two thirds built since the audit, one third genuinely missing.** The auditor opened the dialogs but never finalised a payment, so never saw what exists afterwards. Taking its *done when* a clause at a time: **"what was sent, when, to whom" — EXISTS.** `EmailTrail` on the job record and the client record, reading `email_sends` (14.3). **"did it arrive" — EXISTS BUT HAS NEVER WORKED.** Three states are drawn, and every row says *On its way* for ever because Resend's webhook has never been pointed at us. Three minutes, on Andrew's list. **"can I resend or correct it" — DOES NOT EXIST ANYWHERE.** No resend action on any screen; searched. **That third is a real gap and needs a feature plus a deploy, so it was not built.** The rest of the row is answered. |
| ~~A1 P1-05 raw address accepted~~ | **TESTED 2026-09-20 — the observation was right and the consequence is worse than it says.** It goes through, the server never looks at it, and no screen or email is marked. One real booking proved it end to end; see 2.8. |
| ~~A1 P1-10 calendar link~~ | **CORRECTED 2026-09-20 — this line understated it, and leaving it would have told the next person to stop looking.** A1 proved no vulnerability *in altering the booking id*, which is true. **A later session found a real one in the other half:** `&audience=owner` was a plain query word with no authentication, and a request with no key and no token at all returned the customer's name, phone, home address and vehicle. Fixed under 14.2. **And tonight the FIX ITSELF was verified live rather than assumed**, which nothing had done: `askedForOwner && await requireMember` is present in the running `booking-ics` bundle fetched from the gateway, not merely committed. Closed. |
| A2 2.9 vs A1 § 12 | **Already resolved — not a contradiction.** Different steps. See 2.11. |

## Do not reopen these

A1 § 12 lists things that improved during the review or should not be touched:
the home page eventually showed founding prices consistently (regression test,
not an open defect); the date/time step's "the business confirms" wording
**stays**; promo code `DEMO25` being invalid in customer booking is **not** a
bug — they are different promo systems; no route returned a 404; team
permissions and custom roles **exist** and are not missing; "Reminder sent to
customer" is good immediate feedback and stays; the booking-rule conflict
warning is correct and gets a better resolution path, not removal.

---

## Andrew's decisions — 2026-09-16, second round

**3.2 email cap — DEFERRED, and the audits' premise was wrong.** Andrew has
sent 100+ emails in a day with no failure, so the cap is not the hard wall A2
described. He is not paying ~$60 until there are customers, expected around
**December 2026**. Revisit then, not before.

**3.3 texting — ONE platform number, not one per detailer.** His words: *"I
don't need a text message for every single detailer to have their own separate
messaging software… the same with the phone number."* Exactly how Resend works
today — the platform sends, from the platform's identity, on the detailer's
behalf. **This is much cheaper and simpler than per-tenant numbers** and it
removes per-detailer A2P registration entirely.
**Provider, researched 2026-09-16:** **Telnyx at $0.0040/SMS** is the cheapest
credible option — about half Twilio's $0.0083, and Twilio's real cost is nearer
$0.011–0.013 once carrier surcharges land. **Plivo at $0.0055** is second and
mirrors Twilio's API if migration ever matters. **Recommendation: Telnyx.**
US A2P 10DLC registration is required either way — one registration, one
number, one brand. At a few hundred reminders a month this is **under $5/month**.
*Sources: [APIScout Twilio vs Plivo vs Telnyx 2026](https://apiscout.dev/guides/twilio-vs-plivo-vs-telnyx-sms-voice-api-2026), [Sinch SMS API comparison](https://sinch.com/blog/the-best-sms-api/).*

**8.2 phone testing — he has an iPhone 15 Pro Max and nothing else.** He asked
how real teams test phones they do not own. **That research is not done yet and
is now a task** — see 8.6. Do it before planning the mobile wave.

**0.4 legal — no lawyer. Andrew's ruling:** *"If you could find the templates,
then just edit them. Then we shouldn't need a lawyer."* Accepted. 7.7 and 7.8
stay as written and the template work folds into them. **A business entity is
still worth doing** and is his to start, not ours.

- [ ] **8.6 — Research how to test phones we do not own, then write the method down.**
  He has one device. Real teams do not own every phone either. Find out what
  they actually do — device farms, emulation limits, what genuinely cannot be
  caught without hardware (keyboard behavior, safe-area insets, scroll chaining,
  Safari's dynamic toolbar). **Write it into `docs/testing/` as a method, not a
  finding.** Blocks the mobile wave from being planned on guesses.

---

## Adopting the operating-system report

`docs/operating-system-report-2026-09-16.md` is the research Andrew commissioned.
**Its headline finding independently matches what this repo already knew**: the
root problem is that a check can print "clean" having tested nothing, which
makes every other process unsafe. It calls the fix **proof-carrying work** — no
green verdict without a machine-readable receipt showing targets discovered,
attempted, completed, assertions run, skips, and a deliberately broken canary
that had to fail.

**Do not adopt the whole report at once.** Its own § 6 says so, and this repo's
history of accreting process is exactly what that warning is about. Its
week-one sequence, which supersedes starting at Wave 1 of this file:

1. [x] **DONE 2026-09-16.** Tag the repo before any prune
   (`pre-doc-prune-2026-09-16`). Annotated tag on `2a10b86`, carrying the
   command to recover any pruned document: `git show
   pre-doc-prune-2026-09-16:docs/<path>`. Verified with `git tag -l -n1`.
2. [x] **DONE 2026-09-16.** The receipt schema and its validator.
   `scripts/receipt.mjs` — one file, no new dependency, because the rules that
   matter are arithmetic *between* fields (expected = discovered = attempted =
   completed) and no JSON Schema vocabulary says that without a custom keyword.
   **It never trusts the `status` a check wrote; it recomputes the verdict.**
   `node scripts/receipt.mjs` validates every receipt in `receipts/`.
   **Verified by breaking it on purpose.** `tests/receipt.test.mjs` is 13 cases,
   one per rule, each a receipt that breaks that rule and nothing else — 13/13
   pass. Then three rules were disabled in the validator (the canary rule, the
   four-counts rule, the zero-discovered rule) and the suite went to **4 failed,
   9 passed**, naming the three disabled rules plus the status-recompute case
   that depends on one of them. Restored; 13/13 again, zero `if (false)` left.
3. [x] **DONE 2026-09-16.** `sweep-widths.mjs` certified. **Five defects in the
   check itself came out of doing it, and every one of them was a screen going
   unmeasured while the run looked healthy:**
   - **Three settings rows named screens that no longer exist.** "Your colour",
     "Common questions" and "Campaign links" were renamed in the app to "Your
     color", "FAQ" and "Tracking links". Invisible *twice* in Spanish: `NAMED()`
     looks the English up in `appEs.js`, which is keyed on the current English,
     so a stale key cannot match either language.
   - **Two gear screens were never in the list at all** — "Weather warnings" and
     "Report a problem". Not missing from the run; missing from the *question*.
   - **`NAMED()` cannot click a settings row, and two call sites tried.**
     Measured with Playwright, not reasoned about:
     `getByRole("button", {name: /^(?:Notifications|Notificaciones)$/})` → **0**;
     `{name: "Notifications"}` → **1**. `NAMED()` returns an anchored regex when
     a Spanish twin exists, and a row's accessible name is its label *plus* its
     description. Both sites carried `.catch(() => {})`, so the click did
     nothing, silently, and the block went on measuring the gear index under
     nine other screens' names. This is the 2026-09-08 `NAMED`/`NAMED_TEXT` bug
     in its third home. Every other `NAMED()` caller was checked and is correct
     — they target plain buttons where anchoring is doing real work.
   - **The setup row's eyebrow is not inside the row.** "Finish setting up" is a
     `<span class="label">` in a `.tight` wrapper above the card, so
     `.nav-row` hasText "Finish setting up" could never match. Every run printed
     NO SUCH ROW and advised a re-seed — advice that fixes nothing.
   - **"Add a line" lives inside a closed `<details>`, and there are two of
     them.** `docs/gotchas.md`'s entry, inverted: a closed `<details>` still
     *measures* its children but the accessibility tree *hides* them. The sweep
     opened `.first()`, which is the wrong fold. It now opens every fold.
   **Result: 69 surfaces measured → 84, and 6 reported problems → 0.**
   **The four gates, each proved by breaking something on purpose:**
   - **Expected counts** — `scripts/sweep-widths.expected.json`, committed.
     Proved by re-introducing the `NAMED()` bug: `EXPECTED-COUNT GATE FAILED at
     320px: expected 84 surfaces, measured 83 / NEVER MEASURED gear ·
     Notifications, a line open`. Also proved in the other direction — it
     refused the 84th surface until it was approved with `--write-expected`,
     which is a separate command that refuses to grade the run that wrote it.
   - **Per-route sentinel** — two labels whose screens fingerprint alike means
     one navigation never happened and a screen was measured twice under a name
     it does not have, which comes out *clean*. Proved by disabling the settings
     row click: all 15 Business rows and all 7 gear rows collapsed to one screen
     each, and **the count gate passed** — the sentinel is the only gate that
     sees this shape.
   - **Fail on zero** — already partly present; now per width via the counts.
   - **A canary** — a `<div>` parked past the right edge on a real screen at
     every width. `canary · overflow  caught, as required`. If it is ever missed
     the run says every clean line above it is void, and fails.
   **One near-miss worth recording, because it is the exact defect this whole
   exercise is about.** The sentinel first fingerprinted *pixels* — hash the
   screenshot, same bytes means same screen. It looked elegant and it could
   never fire: this file's own header says `.app-shell::before` drifts for 54
   seconds forever, so no two screenshots of the same screen are ever identical.
   Only the deliberate sabotage found it. The fingerprint is the top layer's
   full text now, untruncated.
   **And the sentinel immediately found two real things nothing else could:**
   `Clients` and `Clients · the list` are the same screen measured twice (now
   declared in the script, by name, rather than waved through); and
   `Clients · one client` was opening **Victor Salas** — the very client the
   bounced-email block opens by name — so the ordinary-client panel had never
   been drawn. `one client` now excludes him.
4. [x] **DONE 2026-09-16.** Contact sheet and receipt.
   `artifacts/sweep-widths/index.html` — 84 figures, 84 images, 0 missing, 0
   zero-byte, failures ringed in red. `receipts/sweep-widths-320.json`, which
   `node scripts/receipt.mjs` grades: **PASS — 84/84 targets, 30,825 assertions
   against a declared floor of 336, canary failed as required.**
   The receipt learned one thing from its own first run: it printed
   `status: "fail"` beside `failures: []`, because only `say()` produces a
   per-surface finding and the fifteen other `found++` sites just print a line.
   It now captures those lines *and* reconciles the count against them, so a
   failure phrase the capture does not know shows up as an unexplained
   difference rather than as silence.
5. [x] **DONE 2026-09-19. The certified check used on ROADMAP 8.1**, which
   named `sweep-widths.mjs` as its own instrument. 320 was the only certified
   width; 1440 and 392 are certified now, each with a `--write-expected` run
   whose diff was read before approval and then a graded run. **The item asked
   about dialogs and the sweep had never opened eleven of them** — the same
   missing-from-the-question failure as the two gear screens in step 3, one
   level down. Eleven defects found, every one on a surface that was not in the
   question. Three sabotages, each caught by name. See 8.1 above.
6. [x] **DONE 2026-09-20. The tenant-isolation matrix.**
   `scripts/tenant-matrix.mjs` — **PASS, 77 targets, 729 assertions, 0
   failures, four canaries, each caught by its own detector.** All four
   boundaries the report asks for: the Data API against tables, the definer
   RPCs, storage objects and Realtime.
   `receipts/tenant-matrix.json` grades it; `artifacts/tenant-matrix/` lists
   every table and verdict. Runs against `kguqylyzgyzfktkfnhjb` on Andrew's
   2026-09-20 approval, and **refuses to run on any other project ref** —
   it creates and drops a table, so the allowed ref is named in the file that
   does the damage.

   **THE GAP IT CLOSED.** `tests/tenant-isolation.test.mjs` passes 45/0 and
   asks the leak question of **five** tables. The schema has **38** carrying a
   `business_id`. Thirty-three had never been asked. They were not missing
   from the run; they were missing from the QUESTION — the same shape as the
   two gear screens and the eleven dialogs.

   **THE QUESTION NOW COMES OFF THE SCHEMA.** Every table in `public` is
   discovered at run time. A tenant-owned table with no seed recipe fails the
   run by name — proved with `--break=recipe`: `customers: tenant-owned and
   has no seed recipe — it has never been asked about`. A new migration
   cannot add a table this file quietly ignores.

   **FOUR ACTORS, AND ONE OF THEM HAD NEVER BEEN TESTED ANYWHERE:** anonymous,
   owner A, staff A, and a **former member** — signed in while a member, then
   the membership row deleted, same still-valid JWT. Access ends immediately
   because the policies read `current_business_ids()` live. Nothing in the
   repo had asked that before.

   **THE CANARY IS A REAL TABLE WITH A REAL HOLE.**
   `public.tenant_matrix_canary` is created every run with RLS on and one
   deliberately broken policy, `for select to authenticated using (true)`,
   seeded for both tenants, and dropped in a `finally`. Verified gone after
   every run, along with both fixture tenants; `demo-detail` untouched.

   **CERTIFIED BY BREAKING IT FOUR WAYS, and the second attempt is the one
   worth recording:**
   - `--break=canary` (no leaky table) -> `CANARY MISSED … every clean line
     above is void`, exit 1.
   - `--break=leak` -> `CANARY NOT CAUGHT BY THE LEAK DETECTOR`, exit 1.
   - `--break=recipe` -> names `customers`, exit 1.
   - `--break=sentinel` -> still PASS, correctly: the leak detector is the
     canary's designated catcher. The sentinel is certified by the
     `--break=leak` run instead, where with the row comparison off it catches
     the canary **on its own**, for all three signed-in actors.

   **THE FIRST CERTIFICATION ATTEMPT WAS WORTHLESS AND LOOKED FINE.**
   `--break=leak` and `--break=sentinel` both PASSED, because a table with
   `using (true)` trips several detectors at once and "the canary was caught"
   was true no matter which one was switched off. **A negative control that
   can be caught by the wrong detector certifies nothing.** Every finding now
   carries the detector that made it and the canary must be caught by
   `leak` specifically.

   **TWO THINGS FOUND ON THE WAY, ONE REAL AND ONE MINE.**
   `platform_admin_events` carries a `business_id` AND zero policies on
   purpose, so classing it as tenant-owned made the matrix demand that owner A
   read its own audit rows — the one thing that table exists to prevent.
   **The second was a wrong finding I published and then withdrew an hour
   later, and it is the more useful of the two.** I reported that
   `connected_accounts` had a policy that could never fire because
   `authenticated` held no grant. **False.**
   `20260908001000_connected_accounts.sql` revokes the table and grants the
   columns back **one at a time**, withholding `connect_state` on purpose —
   *"a value nobody can read is a value nobody can leak."*
   `has_table_privilege` answers **false** for a column-granted table, so the
   matrix asked for `select=*`, was refused **for the columns rather than the
   rows**, and I read a column refusal as a row denial. **The two are
   indistinguishable from outside.** It uses `has_column_privilege` per column
   now and asks each table for exactly what a browser may have;
   `connected_accounts` then passes like any other table. FOUND.md carries
   the withdrawal.

   **A browser reads a table only if the role holds a grant — possibly per
   column — AND a policy lets the row through.** Keying on either alone is
   wrong, in opposite directions, one table each.


   **AND THE TIGHTEN THAT FINDING WOULD HAVE JUSTIFIED WAS CONSIDERED AND
   DECLINED, 2026-09-20.** Narrowing `connected_accounts` to owners was
   proposed and approved while the wrong finding stood, then withdrawn with
   it. Andrew, re-deciding after the correction: *"the credential column is
   already ungranted so there is nothing to leak, and what a staff member can
   see is a boolean saying whether card payments work — that is information,
   not power."* The deliberate 2026-09-08 ruling stands. **FOUND.md records
   the why, so nobody re-proposes it in a month.**

   **WHO MEASURED THIS, SAID PLAINLY.** Every number above — 71 targets, 693
   assertions, both canaries, the cleanup — came out of runs made by the
   session that wrote the check, against `kguqylyzgyzfktkfnhjb`. **It has not
   been independently verified.** The reviewer could not reach Supabase from
   where they sat and said so rather than implying otherwise; what they did
   verify by hand was the source side, and that stands. Andrew intends to look
   through the Supabase dashboard. **Until he does, treat this as a
   self-reported measurement with its working shown, not as a second pair of
   eyes** — which is exactly the distinction `receipt.mjs` exists to make
   machine-readable, and exactly the distinction a green line in a terminal
   erases if nobody writes it down.

   **EXTENDED TO THE DEFINER RPCs, 2026-09-20 — the fourth boundary, and the
   one a table matrix is structurally incapable of seeing.** A `security
   definer` function runs as its owner, so every policy proved above is never
   consulted. **PASS — 71 targets, 693 assertions, 0 failures, 0 skips, BOTH
   canaries caught, each by its own detector.**

   The surface is discovered and filtered structurally: 211 functions are
   executable by a browser role and 192 of them are `btree_gist` internals or
   trigger bodies, excluded by asking whether they belong to an EXTENSION and
   whether they return `trigger` — not by matching `gbt_%`, which is a
   spelling. **That leaves 19 real application RPCs**, each now called as
   owner A, staff A and a former member, with tenant B's identifiers.

   **THE SECOND CANARY IS A DEFINER FUNCTION THAT TRUSTS ITS CALLER'S TENANT
   ID** — `tenant_matrix_canary_rpc(p_business_id uuid)`, handing back B's
   customers to whoever asks, created and dropped inside the run. It must be
   caught by the `rpc` detector specifically, and `--break=rpc` proves it.

   **THREE DEFECTS IN THE CHECK, EVERY ONE FOUND BY THE CANARY REFUSING TO BE
   CAUGHT. Each is now a `docs/gotchas.md` entry:**

   - **PostgREST caches its schema.** The freshly created canary answered
     `404 PGRST202`, and a 404 reads exactly like an empty, correct denial. It
     issues `notify pgrst, 'reload schema'`, waits, and then **probes the
     canary for reachability** — an unreachable canary now says so instead of
     reporting a missed one. Those are opposite diagnoses: one means the
     detector is blind, the other means the run proved nothing.
   - **`create function` grants EXECUTE to PUBLIC**, so the canary was
     anon-callable too. The rule was *"an actor of A must not get more than an
     anonymous stranger"*; anon got B's rows as well, so A was getting no
     more, and **the canary came back clean while visibly returning the secret
     it was leaking**. A comparative assertion is blind exactly where both
     sides fail together. The matrix now also refuses any function handing a
     tenant's own text to an anonymous caller, against a **three-name
     allowlist with written reasons** — `--break=allowlist` empties it and all
     three become findings, which is the proof it is refusable rather than
     decorative.
   - **`get_public_business_profile_by_host` was reported `ok` having resolved
     nothing.** The fixture domain carried no `verified_at`, and both host
     endpoints filter on `d.verified_at is not null`. A fixture that cannot be
     found is a target that was never tested — the missing-recipe failure
     arriving through the argument instead of the table.

   **Five sabotages, all refused:** `--break=canary`, `--break=leak`,
   `--break=rpc`, `--break=allowlist`, `--break=recipe`. Both canaries and
   both fixture tenants verified gone afterwards, `demo-detail` untouched.

   **No leak was found in any of the 38 tenant-owned tables**, by any of the
   four actors, on read, update, delete or forged-tenancy insert.

   **EXTENDED TO STORAGE AND REALTIME, 2026-09-20 — the last two of the four
   boundaries, and step 6 is now complete.** **PASS — 77 targets, 729
   assertions, 0 failures, FOUR canaries, each caught by its own detector.**

   **WHY IT WAS NOT ALREADY FINISHED, IN ONE SENTENCE ABOUT ONE TABLE.**
   `job_photos` passed above — every actor of A refused every one of B's photo
   rows, by four detectors. **The photographs were never fetched once.** The
   row holds a `path`; the bytes live in a bucket behind a policy on
   `storage.objects` in another schema that nothing in the table matrix reads.
   A green `job_photos` reads as coverage of job photos and is coverage of
   job-photo metadata.

   **6 · STORAGE.** Buckets are discovered from `storage.buckets`, not named,
   for the same reason tables are. Three buckets each run — `business-media`,
   `job-photos` and the canary. The invariant is the RPC section's word for
   word: **an actor of A must not get more out of B's folder than an anonymous
   stranger gets.** That handles `business-media` correctly without
   special-casing it — a tenant's logo is served to the whole internet on
   purpose, so A seeing it is the product and A seeing what anon cannot is the
   defect. Per bucket: download B's file, list B's folder, list A's folder as a
   removed member, upload into B's folder, delete B's file, and confirm A can
   still reach its own. **No leak in either real bucket.**

   **THE CANARY IS A BUCKET WHOSE POLICY SCOPES TO THE BUCKET AND NOTHING
   ELSE** — the 1am mistake, where every real policy here scopes to the first
   folder segment, which is the owning business's id. Caught by
   `[storage-read]` specifically, which is the detector that proves the BYTES
   crossed rather than that a request was allowed.

   **7 · REALTIME, WHICH IS THREE MECHANISMS WEARING ONE NAME.** The
   publication decides what streams at all; RLS decides who receives it;
   and broadcast/presence is guarded by something else entirely. Asking it as
   one question covers at most a third.

   - **7a, the publication.** Zero tenant-owned tables are published, so
     nothing streams to anybody. The canary table is published on purpose, or
     that line would print identically with the query broken.
   - **7b, delivery.** **Not certified, and said plainly.** The canary table,
     published with `using (true)`, granted, `replica identity full`, owner A
     `SUBSCRIBED`, `realtime.subscription` carrying the row server-side, slot
     active, row inserted — **nothing arrived, three runs, cold slot, 15s
     each.** `postgres_changes` does not deliver on this project. An empty
     array is also what perfect isolation looks like, so the probe proves its
     own socket first by sending itself a broadcast and hearing it back; it
     did. The verdict prints `NOT DELIVERING — detector uncertified`, rides in
     `warnings`, and `realtime-stream` is **deliberately left out of the
     receipt's canary gate**. Uncovered, not clean. Nothing is exposed today —
     nothing tenant-owned is published and the app opens zero channels — but
     the day a table is published this must be re-proved first.
   - **7c, channels. THE ONE REAL FINDING OF THE NIGHT, and it is a standing
     risk rather than a live defect.** A channel opened **without**
     `private: true` is authorised by **nothing at all**. Proved by having a
     client with only the anon key and no session join a plain channel and
     receive a signed-in user's broadcast verbatim, sentinel and all. The app
     opens zero channels, so nothing leaks today. **The first
     `supabase.channel('bookings-' + businessId)` anybody writes is a
     cross-tenant channel on the day it ships**, because a business id is a
     guess away. Carried as a warning on every receipt so it cannot quietly
     stop being said. Private channels **are** closed: `realtime.messages` is
     RLS-on with zero policies and anon was refused in the same run.

   **SIX SABOTAGES, ALL REFUSED BY `receipt.mjs`, AND TWO OF THEM ARE THE ONLY
   ONES THAT PROVE ANYTHING.** `--break=storage`, `--break=realtime` and
   `--break=bucket-allowlist` are blunt: the storage canary trips three
   detectors, so silencing all three proves the canary can be missed and
   nothing about *which* detector the gate is on. That is the exact trap the
   RPC canary sprang on the first pass. So:

   - `--break=storage-read` silences **only** the byte comparison ->
     `CANARY NOT CAUGHT BY THE STORAGE-READ DETECTOR`, although `storage-list`
     and `storage-former` still trip on it.
   - `--break=realtime-pub` silences **only** the publication detector -> the
     run fails, although `[realtime-broadcast]` is caught.
   - `--break=bucket-allowlist` -> `business-media` reports as a
     `[storage-public]` finding, which is the proof the one-name allowlist is
     refusable rather than decorative.

   **A switch that turns off a whole section is a smoke test. A switch that
   turns off one detector is a certification.**

   **`min_assertions` RAISED 300 -> 700.** At 300, sections 6 and 7 could be
   deleted from the file entirely and the receipt would still pass its own
   assertion rule, because tables and RPCs alone run 693. A floor nobody raises
   is a floor that stops working.

   **TWO THINGS LEARNED THE HARD WAY, BOTH NOW IN `docs/gotchas.md`:** storage
   answers `200 []` for "denied" and for "nothing there", so every list is
   paired with a service-role count of what is actually in the folder; and
   running two copies of this script at once destroys each other's canaries
   and reads exactly like a blind detector. The teardown held through that
   collision — both canaries, the canary bucket, the publication entry, every
   planted object and both fixture tenants verified gone afterwards.

   **SELF-REPORTED, SAME AS ABOVE.** Every number here came from runs made by
   the session that wrote the check, against `kguqylyzgyzfktkfnhjb`. Not
   independently verified.

7. [~] **HALF DONE 2026-09-20. The prune is finished; the roadmap
   restructure is held.**

   **THE PRUNE — DONE.** `docs/archive/` is gone: 9 files, about 45,000 words,
   whose only remaining purpose was to be searched by a session that should be
   reading git history. **Nothing was deleted until the tag was proved to hold
   it.** All nine were compared byte for byte against
   `pre-doc-prune-2026-09-16`, and two were recovered in full as a rehearsal —
   the old rulebook at 19,861 words and a retired session brief at 3,911.

   **AND THE FIRST COMPARISON SAID FIVE OF THE NINE DIFFERED FROM THE TAG**,
   which would have meant the safety net did not hold what it claimed. It was
   the instrument: the working copies are CRLF and git's blobs are LF, so a
   checksum over the raw bytes reports a difference that is not there. Once
   carriage returns were stripped, **all nine were identical and no commit had
   touched `docs/archive/` since the tag**. Worth knowing before somebody
   checksums a file against a git blob again.

   **Two live pointers were rewritten rather than left dangling** — `CLAUDE.md`
   named the old rulebook and this file named the old roadmap. Both now carry
   the `git show` command instead of a path.

   **WHAT WAS NOT PRUNED, AND WHY.** 38 documents outside `docs/archive/` have
   no inbound reference from anywhere. **They were left alone.** Most are
   design renderings and tenant-site explorations, which exist to be LOOKED AT
   rather than searched — the criterion for pruning does not fit them. And one
   candidate proved the point: `docs/the-deploy-is-not-the-push-2026-09-08.md`
   is unreferenced and is **directly relevant to 0.6**, carrying a correction
   whose own note says *"the reasoning is the lesson"*. Deleting it on a
   reference count would have destroyed exactly the thing tonight needed.
   Per-file judgement, not a bulk rule, and not tonight.

   **THE RESTRUCTURE — HELD, and written up instead:**
   `docs/roadmap-restructure-proposal.md`. What the structure would be, what it
   buys, what it costs, what would break, and the conditions it should be done
   under. **The reason it is held is not nerve:** this is the one file both
   sessions write to, it was edited by both of them repeatedly today, and **a
   tag cannot protect a file from being concurrently rewritten** — it can only
   return a version, and what a concurrent rewrite loses is nobody's version.
   One session, a quiet tree, a fresh tag, one pass. **Andrew rules on it.**

### Still unanswered after steps 1–4

- **RESOLVED 2026-09-19: `composition` is GREEN.** 97 passed, 0 failed,
  including `11e-iii · and it leads the line, so truncation cannot eat it`.
  `app/src/components/BookingDetail.jsx` has been changed since this was
  written. The other three must-run gates are green too: `design-contrast`,
  `landing-pricing`, `route-contract` (34/34). **The paragraph below is kept
  because the reversal is the load-bearing part** — a red gate everybody was
  walking past turned out to be fixed and nobody had re-run it.
- ~~**`composition` is RED at `HEAD`, and it was red before this session.**~~
  `11e-iii · and it leads the line, so truncation cannot eat it` fails because
  `app/src/components/JobRow.jsx` contains no `Bring ${bring…}` line at all —
  the test asserts presence first, and presence is what is missing. `git diff`
  shows `app/src` untouched by this session. Either the water-and-power fact was
  dropped from the job row (commit `774bce8` is the suspect) or the test is
  stale. **CLAUDE.md lists `composition` as a must-run-before-you-finish check,
  so this is a red gate everybody has been walking past.** Not diagnosed —
  needs its own item.
- ~~**Only 320px is certified.**~~ **1440 and 392 certified 2026-09-19** (8.1).
  **1920 and 360 still are not** — each needs a `--write-expected` run and a
  read of the diff, about two and a half minutes each. Note that `--write-expected`
  REPLACES the whole file, so every width has to be in the same command.
- **The Spanish path is unmeasured.** Three of the five defects above were
  *worse* in Spanish, and nothing has run `--lite` or a Spanish sweep since.
  **SPANISH MEASURED 2026-09-19, at 392 only.** `LANG_APP=es node
  scripts/sweep-widths.mjs 392` exits **0** — 125/125 surfaces reached, clean
  geometry, canary caught, sentinel clean, and the only two `NOT MEASURED`
  lines are the declared subscription skips. The language switch was proved
  rather than assumed (`Hoy, Calendario, Dinero, Clientes, Negocio`).

  **CORRECTION, SAME DAY, AND IT IS THE INTERESTING PART: 116 OF THE 125 WERE
  SPANISH, NOT 125.** Reported as "125 in Spanish" first, which was wrong.
  Andrew opened the contact sheet and the pictures were English. **The page had
  not been overwritten** — the first NINE surfaces are English in a Spanish run
  and always have been: `dp.lang.app` is the DASHBOARD's key, the sweep applies
  it after sign-in, and the booking page, the four marketing pages and the four
  sign-in screens are all measured before that line runs. `appI18n.js` puts it
  beyond doubt: the booking page's language and this one *"neither can move the
  other"*. **AT THIS POINT IN THE SAME NIGHT, still true: the customer-facing
  half had not yet been swept in Spanish, because the sweep only set
  `dp.lang.app`.** The contact sheet printed that caveat on itself, with the
  number counted at run time.
  **SUPERSEDED LATER THE SAME NIGHT — see "THE NINE PUBLIC SURFACES: CLOSED
  AS FAR AS THE PRODUCT ALLOWS" below. `speakSpanish` was rebuilt to set
  BOTH `dp.lang` and `dp.lang.app` through `addInitScript`, before
  `ctx.newPage`, so both surfaces are there for the first paint. Five of the
  nine public surfaces — the booking page and the four sign-in screens — are
  measured in Spanish and have been since. The remaining four,
  `LandingPage.jsx`/`PricingPage.jsx`/`LegalPage.jsx`, are not unmeasured;
  they are UNDECLARABLE — they import no translation scope and contain zero
  `t("…")` calls, so there is nothing for a language switch to move. That is
  a measurement, not an assumption, and it is why they sit in
  `ENGLISH_ONLY` rather than in a failing check.**
  **CORRECTED 2026-09-20, BY ANDREW, AFTER THE OLD LINE ABOVE SENT A SESSION
  AT AN HOUR OF WORK ON A QUESTION ALREADY ANSWERED A FEW HUNDRED LINES
  DOWN.** *"That is stale, I took it as fact, and I sent a session at an
  hour of work on it."* The paragraph above is left in place rather than
  deleted, because the sequence — wrong, then fixed the same night, then
  read as current a day later — is the part worth keeping. **Do not restore
  "the customer-facing half has never been swept in Spanish" from this
  paragraph out of sympathy for how it reads; it was true for a few hours on
  2026-09-19 and has not been true since.**

  **AND THE ARTIFACTS SHARED ONE PATH ACROSS EVERY MODE.** English, Spanish and
  `--lite` all wrote `artifacts/sweep-widths/` and a receipt keyed only on the
  widths, so each run silently destroyed the last one's pictures AND its
  verdict, and nothing on the page said which mode had made it. **This is the
  timestamp-ambiguity failure from earlier the same night, one level up**, and
  it is why the Spanish claim could not be checked. Fixed generally: the mode
  is part of the identity now — `artifacts/sweep-widths{-es}{-lite}/`,
  `receipts/sweep-widths-<widths>{-es}{-lite}.json`, and the page's own title
  and `<h1>`. Three modes were then run back to back and all three survived:
  125/125 each, three folders, three receipts, all PASS.

  **A REAL TRANSLATION GAP, SEEN BY LOOKING AT THE PICTURE RATHER THAN THE
  NUMBERS:** on the Spanish Today screen the setup banner reads **"Your page
  isn't fully set up"** and **"and 3 more"** in English, next to a Spanish
  "Ocultar". `lib/setup.js` holds that copy as plain object values, which is
  the `docs/gotchas.md` case where a sweep for `t("…")` finds nothing. It
  corroborates `i18n-survey`'s flag on that file. **Belongs to 2.12**, which
  already owns Spanish coverage; it is `app/src` work and both sweep turns were
  instrument-only.

  **EVERY DEFECT THE FIRST SPANISH RUN FOUND WAS IN THE CHECK, NOT THE
  PRODUCT** — four of them, all the same family, all silent:
  - `Clients · writing to them` — the compose button was reached with a raw
    `/^Email these \d+$/`. The button carries `data-tour="compose"`; it is
    addressed by that now. **`NAMED_TEXT` could not have saved this one**: the
    catalogue key is `"Email these {count}"` and `{count}` never appears in
    rendered text.
  - `Business · Monthly plans, the QR` — `/QR code/i` against "Generar código
    QR". The Business call site forty lines up already used
    `NAMED("Generate QR code")`, which is the tell that this was a shortcut.
  - `gear · subscription, a promo code applied` — `:has-text("Remove")` is a
    CSS pseudo taking a literal, so in Spanish the apply SUCCEEDED and the
    check called it refused, printing an empty reason. A false negative.
  - **The eight `setup · step N of 12` labels translated.** The label was built
    from the form's own step line, which reads "Paso 1 de 12" — so eight
    screens were measured perfectly and filed under eight names the
    expectation has never heard of: eight NEVER MEASURED and eight NOT
    EXPECTED at once. **A label is the name of a thing, not a rendering of
    it.** It is built from the numbers now, which do not translate.

  **NONE OF THE FOUR WAS A TRANSLATION GAP**, which was worth checking: all
  three strings are correct in `appEs.js`. **And zero geometry defects in
  Spanish** — longer strings did not push anything off an edge at 392.

  **The canary and the sentinel had never been sabotage-tested under
  `LANG_APP=es`. They are now.** Canary narrowed to 10px: `NOT CAUGHT — CHECK
  missed a defect handed to it on purpose. Every clean line above is void.`
  Ordinary-client row pointed at Victor Salas: `SENTINEL FAILED: Clients · one
  client == Clients · a client whose email bounced`. Re-introducing the English
  QR locator: `NEVER MEASURED Business · Monthly plans, the QR`. All reverted;
  Spanish and English both end at 125/125, exit 0.

  **`--lite` MEASURED 2026-09-19, at 392, in English.** `node
  scripts/sweep-widths.mjs 392 --lite` exits **0** — 125/125, canary caught,
  sentinel clean, **and zero product geometry defects with motion off.**
  It found exactly one thing and it was **in the check, not the product**:
  `tour · focus on open  FOCUS IS OUTSIDE THE CAPTION CARD`. The check glanced
  at focus once, immediately. Measured both paths on the same page before
  touching anything — card and focus both arrive at **~400ms in normal AND in
  lite, identically** — so the accessibility behaviour is correct and the
  reduced-motion path simply stopped the check winning a race it had been
  winning by accident, which is the hazard this file predicted for `--lite` in
  writing. It waits on the condition now, with a timeout, **and it still fails
  when focus genuinely never arrives** — proved by pointing the predicate at a
  class that does not exist: `FOCUS IS OUTSIDE THE CAPTION CARD after 4s`.

  **The canary and the sentinel had never been sabotage-tested under `--lite`
  either. They are now** — `NOT CAUGHT … every clean line above is void`, and
  `SENTINEL FAILED: Clients · one client == Clients · a client whose email
  bounced`. All reverted.

  **THE NINE PUBLIC SURFACES: CLOSED AS FAR AS THE PRODUCT ALLOWS, 2026-09-19.**
  Five of the nine are Spanish now — the booking page and the four sign-in
  screens — so **121 of 125 surfaces are Spanish**, up from 116. The other four
  cannot be: `LandingPage.jsx`, `PricingPage.jsx` and `LegalPage.jsx` import no
  translation scope and contain **zero `t("…")` calls between them**. They are
  written in English and there is nothing to switch. Measured, not assumed, and
  declared in the sweep rather than forced. **That is a product gap and it is
  logged to 2.12.**

  **TWO KEYS, AND THEY DO NOT COMPOSE — that is the design, not a bug.**
  `dp.lang` is the customer's booking surface, `dp.lang.app` is the dashboard,
  and `appI18n.js` says they "neither can move the other" on purpose: a
  detailer previewing their own booking page in Spanish must not come back to a
  Spanish back office. The sweep sets **both**, through `addInitScript` so they
  are there for the FIRST paint — a language set after the screen is drawn
  needs a reload, and a reload is a thing to forget.

  **AND IT HAD TO BE DONE ON EVERY CONTEXT, NOT THE ONE I WAS THINKING OF.**
  The first attempt set the keys on the main context only and the four sign-in
  screens stayed English: they are measured in a SEPARATE anonymous context,
  because they are the signed-out product. **The language guard caught it on
  the very next run**, which is the argument for having written the guard
  before trusting the fix.

  **THE GUARD, WHICH IS THE PART THAT GENERALISES.** Nothing anywhere asked
  whether a run was in the language it claimed — the geometry checks do not
  read words, so a language that never applied measures exactly like one that
  did. **That is how nine surfaces were reported as Spanish while rendering
  English.** Every surface is now tallied against the catalogue for its own
  scope: how many phrases appear in Spanish against how many appear in English.
  Not a hand-picked sentence, which would be a check coupled to a spelling.
  **Proved by sabotage:** the booking key pointed at a name nothing reads —
  `book · step 1 NOT IN SPANISH — 0 translated phrase(s) on screen against 4
  untranslated`, exit non-zero, and `receipt.mjs` failed it independently.
  **Not a clean 125.**

  **STILL OPEN:** Spanish at 320 and 1440, `--lite` at 320 and 1440, and
  Spanish **and** lite together (never run).
  **AND ONE THING THE EXPECTATION FILE NOW DEPENDS ON:** it is keyed on width
  only, so a Spanish run is graded against the English labels. That is correct
  — the labels are identifiers, not copy — but nothing enforces it. The next
  label built out of rendered text will break Spanish exactly the way the setup
  steps did, and silently.
- ~~**Five `guide · …` surfaces report NOT MEASURED every run.**~~ **RESOLVED
  2026-09-19 — all five are reachable and all five are now measured.** The
  sweep goes from **284 surfaces to 375**: +30 at 320, +30 at 392, +31 at 1440
  (`guide · today` has an eighth step at desk width, where the second column
  gives it another target). `node scripts/sweep-widths.mjs 320 1440 392` exits
  0 at 125 / 125 / 125, and `receipt.mjs` grades it PASS, 375/375 targets,
  162,159 assertions.

  **The bullet's own guess — "it has been seen on this profile" — was right
  about the WHAT and wrong about the WHERE, and the where is the whole
  problem.** `App.jsx` gates a guide on `seenTours()`, which is an OR over two
  localStorage keys, and the sweep suppressed guides at sign-in by writing BOTH
  while the guide block gave back only `dp.tours`. But under that sat the far
  cause: **a `user_tours` row for the demo owner, written 2026-09-13 by
  somebody clicking through a guide while looking at the demo.** `App.jsx`
  reads that row on sign-in and calls `markTourSeen()`, which writes `dp.tour`
  straight back — so every `removeItem` the check performed was undone by the
  app a moment later, in silence.

  **Measured rather than deduced, because the two causes hide each other:**
  with the row present a guide arrived **0 of 6** times even with both keys
  cleared and a reload; with the row deleted, **6 of 6**.

  **Two fixes, and they are not interchangeable:**
  - `sweep-widths.mjs` clears **both** keys per tab. **This is the load-bearing
    one**: with it in place the guides arrive even if the row is back, because
    the row is read once on sign-in and the clear happens later in the same
    page session. Verified by re-inserting the row and re-running: 125/125.
  - `seed-demo.mjs` deletes the row on every seed. **Not needed for the sweep,
    and still right**: with the row present a person OPENING the demo sees no
    guides at all, which is a demo defect on its own, and it removes a trap —
    any future reload after the clear would silently lose all thirty surfaces
    again.

  **Checked by breaking both.** Put the single-key clear back: `EXPECTED-COUNT
  GATE FAILED at 392px: expected 125 surfaces, measured 95` with **30 NEVER
  MEASURED lines** and exit 1 — where the identical state used to print five
  polite NOT MEASURED lines and pass. The declared-skip sabotage was re-run on
  top and is still refused: `SKIP REFUSED — declared unreachable, and the probe
  found 1`, followed by the gate failing it by name anyway. Step counts are
  stable across four consecutive runs (today 7, calendar 6, money 6, clients 5,
  business 6; today 8 at 1440).
- ~~**Two `subscription · …` surfaces need `seed-demo.mjs
  --subscription=past_due` and are skipped on the ordinary demo.**~~
  **RESOLVED 2026-09-19 — the line was right about the flag and wrong about
  the shape, and both halves matter.**

  **RIGHT:** `--subscription=past_due` does reach them. **WRONG:** "skipped"
  understated it — they were in limbo, printing a bare `NOT MEASURED` that
  raised no finding and sat in no expectation, which is the state the five
  `guide · …` surfaces were in. Both are **declared skips with probes** now.

  **The exclusivity is not where it looks.** The obvious guess is that
  cancelling and past-due are mutually exclusive states of one subscription.
  They are not: `live` in `Billing.jsx` is true for a past-due subscription, so
  one seed draws the dunning box AND the cancel button, and a single
  `--subscription=past_due` run reaches both. **What they are exclusive with is
  the checkout ladder**, and that is structural — a business either has a
  subscription or it has not, and `Billing.jsx` draws the account for one and
  the rungs for the other.

  **Measured at 392 with the flag, which is what decided it:** +1 surface
  (`gear · subscription, cancelling`) against −2 (`… a plan chosen`,
  `… a promo code applied`). A net loss, and the two lost are the ladder and
  the consent tick — `seed-demo.mjs`'s own header calls that the riskiest
  geometry on the screen. **So the default seed stays**, which is also the
  truthful demo: the demo business does not pay the platform.
  **What is given up, said plainly:** the cancel confirmation and the dunning
  box are not laid out at any width on an ordinary run. The option that would
  measure everything is a SECOND signed-in business carrying a subscription —
  a second sign-in per width on a run that is already a quarter of an hour.
  Named, not built.

  **AND THE SENTINEL REFUSED THE FIRST ATTEMPT.** Making the dunning box its
  own surface produced `gear · subscription, cancelling == gear · subscription,
  past due`: identical fingerprints, because the box sits at the top of the
  account view and the rest of that screen is the same DOM. **It is a STATE of
  `gear · Your subscription`, not a screen**, so it is asserted there instead of
  counted twice. That was the sentinel's second real catch.

  **The mirror case was fixed with them:** `subscription · the rungs`, which
  prints only under `--subscription=…`, was the identical limbo shape and is
  declared too — leaving one of a pair converted is the half-fix this file
  keeps recording.

  **Checked by breaking it.** With the state seeded and both reach-locators
  broken, both declarations were refused: `SKIP REFUSED — declared unreachable,
  and the probe found 1`, twice. Reverted; default seed restored (the seed
  clears `platform_subscriptions` and `platform_invoices`, verified empty
  afterwards). Final run: **exit 0, 375/375, 125 / 125 / 125, receipt PASS,
  162,093 assertions**, and **every `NOT MEASURED` line in the output — six of
  them — matches one of the six declared skips the receipt records. No bare
  ones survive at any width.**

**What is already true here and needs no work:** `CLAUDE.md` is 192 lines
against its 200-line ceiling; the role/lane system it says to drop is already
gone; migrations are already append-only. **What it flags that this repo has
not done:** `docs/archive/` is inside the agent's search space, which the report
explicitly warns against — git history is the archive. Revisit at step 7.
