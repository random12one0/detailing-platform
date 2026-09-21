# Manager close — 2026-09-21

**Read this before picking anything up.** It exists because a night's worth of
decisions lived in a chat window and nowhere else, and Andrew's bar for stopping
was explicit:

> *"nothing that only you know that Claude doesn't, that the coding, you know,
> that the database doesn't know."*

This is that. It is the manager's side of the night — the rulings, the state
changed **outside** the repo, the corrections, and what each session left on the
floor. **Everything here is either a decision that is now binding or a fact a
`git log` cannot tell you.**

---

## 1. State changed outside the repo. Git cannot see any of this.

Four things about this product are now different, and **none of them are a
commit**:

| What | Where | When | By |
|---|---|---|---|
| `bookings.travel_zone_address_mismatch` **exists** | Supabase `kguqylyzgyzfktkfnhjb` | night of 09-20 | **Andrew ran the SQL himself** |
| Resend webhook now subscribes to exactly `delivered`, `bounced`, `complained`, `failed` | Resend, endpoint `…/functions/v1/resend-webhook` | 09-21 | manager, via the Resend API |
| healthchecks.io "scheduled jobs" grace **30 min → 2 hours** | healthchecks.io | 09-21 | manager |
| **16 leaked `Smoke ` customer rows removed** from `demo-detail` and `demo-riverside`; the `customers` **table** went **64 → 48 across all sixteen businesses** — *this row originally said "the demo tenant's customers count", which was wrong; see the correction directly below* | Supabase `kguqylyzgyzfktkfnhjb` | 09-21 | DP Cowork2, via the fixed `e2e-booking.mjs` sweep |
| Nothing was published. Nothing was pushed. | — | — | — |

**A TABLE COUNT WAS REPORTED AS A TENANT COUNT, AND THE ERROR IS ANDREW'S
MANAGER'S — corrected 2026-09-21 by DP Cowork2, measured not reasoned.** The
figure was given to two sessions as *"the demo tenant's `customers` count went
64 → 48"*. **48 is the whole `customers` table, across all sixteen
businesses.** Measured against `kguqylyzgyzfktkfnhjb` on 2026-09-21:
`customers` table-wide **48**, `demo-detail` **13**. Thirteen is what
`demo-detail` has and what it always had; nothing left it.

**THE CORRECTION MATTERS MORE THAN THE NUMBER, BECAUSE THE WARNING BELOW WAS
POINTED AT THE WRONG READER.** It was written to stop a later session seeing
48 and hunting a fault. But a session doing the more careful thing — checking
the **tenant** rather than the table, which is what the sentence told it to do
— would have found **13** against a remembered 64 and panicked considerably
harder, chasing a loss of fifty-one rows that never happened. **A mis-scoped
number in a warning does not merely fail to help; it aims the alarm at
whoever reads most carefully.** The manager's own standing instruction covers
it: *treat any number the manager hands you as a pointer to where to look, not
a value to code against.* This is that instruction earning its keep on the
document that contains it.

**THE 16 IS NOT A PROBLEM AND A LATER SESSION WILL THINK IT IS.** Anyone
comparing the `customers` table against a note written before 2026-09-21 will
find sixteen rows missing and go looking for a fault. There isn't one. `e2e-booking.mjs`'s cleanup deleted its own test customer by
`phone=eq.555-0111`; `create-booking` **stores a formatted phone**, so the row
reads `(555) 011-1` and the filter matched nothing. A PostgREST delete that
matches zero rows answers `204` with an empty body — **the same answer as one
that deleted exactly what it meant to** — so the residue was invisible from
the console, the exit code and the receipt. It accumulated one row per tenant
per run from 2026-09-11. The cleanup now matches on `Smoke <runId>`, the one
field the product does not reformat, and the stale sweep reclaims customers as
well as bookings; it cleared all sixteen on its first fixed run. Six more, made
by that night's own four runs, were deleted by hand and the count re-read to
prove it before the sweep ran.

**And one more write that is BY DESIGN and looks alarming.** Every
`e2e-booking` run deletes the demo tenant's `rate_hits` rows whose bucket
starts with `booking` — this is **ROADMAP 2.21**, and it is deliberate: the
script books more times in two minutes than a real customer does in a year
from one address, so without it the run starts failing at whichever booking
crosses the throttle and reports it as a broken engine. It clears rather than
exempting, so the limits stay set by what a real customer does. On 09-21 that
took the `booking%` bucket from 4 rows to 2.

**The migration being applied retires the ordering trap.** `create-booking`
always writes that key on insert, so publishing it before the column existed
would have failed **every** new booking. The column exists now. The trap is
closed; the shape of it is written up in `FOR-ANDREW.md` because it will recur
with some other column.

**The Resend change was a subscription mismatch, not a missing webhook.** The
endpoint was correct all along. It was listening for `email.delivery_delayed`,
which `resend-webhook/index.ts`'s `OUTCOME` map deliberately does not handle,
and **not** for `email.delivered`, which is the only event that can ever turn a
client record from "On its way" into "Delivered". `OUTCOME` is the spec; the
subscription now matches it exactly. **If you change `OUTCOME`, the Resend
subscription is a second place that has to change, and nothing in the repo will
tell you.**

---

## 2. Andrew's rulings. These are binding; do not re-open them.

His words are in `FOR-ANDREW.md` § Done. The operative form:

- **No marketing email, ever.** Email is receipts, reminders and alerts.
  Anything that sells goes by **text**. The "your coating is due" email is
  **off**, and the CAN-SPAM postal-address problem goes off with it. Do not
  design around a footer address; there is no marketing mail to put one in.

  **SUPERSEDED BY ITS AUTHOR — 2026-09-21. THE RULING ABOVE IS NO LONGER
  BINDING AND IS KEPT BECAUSE THE REVERSAL IS THE LOAD-BEARING PART.**

  **Andrew has reversed it himself.** His reason, in his words: the
  no-marketing-email rule was **a last-minute decision made because he was
  too lazy to make marketing emails legal**, and he has changed his mind on
  that. So *"no marketing email, ever; email is receipts, reminders and
  alerts; anything that sells goes by text"* is **overturned**, by the only
  person who could overturn it.

  **Earlier the same morning** he had already removed half its scaffolding,
  saying he is fine putting his mailing address on marketing email — *it
  will just be small print, no one will really notice*. That amendment is
  kept above for the same reason: it is the step between the two positions.

  **Three consequences, written rather than left to be inferred:**

  1. **The `campaignEmail` question stops being a contradiction to
     resolve.** The feature is no longer against the rules. **Whether he
     wants it is still his call** — what has gone is the reason it was in
     question at all.
  2. **THE MAINTENANCE-DUE GATE STAYS EXACTLY AS IT IS. Do not soften it,
     do not default it on, do not touch it.** The reversal does not undo it,
     because the gate was never a prohibition. Before it, that email fired
     because an ordinary reminder toggle was on and **nobody had ever chosen
     to send it**; after it, it fires only if somebody deliberately turns it
     on. **That is control, not prohibition, and control is correct
     whichever way the marketing question goes.**
  3. **The missing dashboard toggle is now a real open question, and it was
     not one yesterday.** The migration deliberately gave
     `email_customer_maintenance_due` **no dashboard control**, on the
     explicit reasoning that exposing a toggle would hand back a decision
     Andrew had already made. **He has now unmade that decision**, so the
     reason for the absence has expired with the ruling that created it.
     **Open item, with that history attached. The toggle is NOT built here** —
     recording why it is missing is a different act from deciding it should
     exist.
- **No Spanish on the home and pricing pages.** Those pages sell to detailers,
  and he sells to English speakers. The **booking page** serves customers and
  stays fully bilingual. ~390 strings deliberately not done.
- **Travel stays named, flat-fee zones.** No distance pricing — the geocoding
  and routing APIs cost money. **ROADMAP 2.3 must be rewritten to ask for the
  flag**, not left open asking for a distance feature nobody is building. The
  word-comparison mismatch flag **labels and never gates**: it does not block a
  booking and does not change a price.
- **Build the customer export.** He considers it one button; it is now a build
  item, not a question. The promise on the pricing and home pages stays worded
  as it is.
- **Flag the 15 test detailers, do not delete them.** ~60 checks sign into
  them, and a check that cannot run looks like one that passed.
- **`andrewsdetail.com` stays on the marketing page.** He is happy promoting
  it. The **mock browser bar** around it is a separate complaint — he wants a
  real screenshot from one of the sites instead, and that is a design task.
- **Job buttons stay square on a phone.** Leave it.
- **Large text: fix the booking page only.** The back office is allowed to
  scroll sideways at double text size, and the promise says so.
- **Spanish vehicle words: pick what is best for a Spanish speaker.**
  Delegated, not decided. Dashboard says "Troca"/"SUV chica", booking page says
  "Camioneta"/"SUV pequeña". **One word per idea, across both screens.**
- **Legal pages name him personally, and that is correct** until December 2026.
  Not a registered business yet; a DBA costs a filing fee and buys nothing yet.
- **Alerts:** he will not act on failure email. *"if I get an email that
  something like failed... I'm not going to do anything about it."* Alerting is
  tuned for silence-unless-real, not for completeness.

### Three more, settled by Andrew the morning of 2026-09-21

**Added because all three are currently sitting in `FOR-ANDREW.md` and
`ROADMAP.md` as open checkboxes, and a future session meeting them there will
work them as open questions.** They are not. They are decided.

- **Two-factor login on Supabase and Netlify: NO, permanently.** Not
  deferred, not "later" — **decided, and not to be raised again.** It is
  currently `FOR-ANDREW.md:243` (*"DO · Turn on two-factor login…"*) and
  appears again in `ROADMAP.md:4101` and `:4177` as part of a fix list, and
  in `docs/audits/comprehensive-audit-2026-09.md:122` as a required change.
  **An audit recommending it is not the same as an open question**, and the
  audit lines can stay as the record of what was recommended; what must not
  stay is a checkbox implying somebody should go and do it.
- **The demo password in the repo: his call, and he has made it.** He knows
  it is there, does not consider it urgent, and will remove it when the first
  real detailer signs up — **roughly two months from now.** Recorded as his
  decision with his reasoning, **not as an outstanding risk**, because the
  difference decides whether the next session treats it as work. It lives in
  `scripts/seed-demo.mjs` (three sites). **Its location is named here and its
  value is not, per CLAUDE.md's rule that a secret's home goes in a document
  and never its contents.**
- **The daylight check: dropped.** He does not want it. `FOR-ANDREW.md:587`
  (*"DO · Thirty seconds outside, in daylight"*) should come off, and the
  line below about "the two away-from-the-computer checks" is now **one**.

**None of the three was edited in `FOR-ANDREW.md` or `ROADMAP.md` by this
session** — neither file is this lane. The line numbers are given so whoever
holds them can strike the boxes without re-deriving anything.

**Still genuinely open, and short:** where the age private key for the backups
lives (blocks everything about restore); "unlimited photos" on the pricing page;
what the Business-settings live preview should show; **one** away-from-the-
computer check, the other having been dropped above. That is the whole list.

---

## 3. Backups — the page in this repo was wrong, and is now rewritten

`docs/recovery.md` opened with *"There is no restore point anyone can reach."*
**False.** It measured Supabase's dashboard, found nothing there, and wrote it
down as a fact about everywhere. Andrew said so before anyone checked, and he
was right.

The real pipeline: **`github.com/random12one0/detailing-platform-backups`**,
private, nightly at 02:10 Pacific, `pg_dump --format=custom` inside
`postgres:17`, refuses a dump under 50 KB, `age`-encrypted to a committed public
key, published as a release asset, pruned at 30 days keeping the 1st of each
month. Verified release by release. `docs/recovery.md` now carries the full
measurement and, more importantly, **the gaps**: nobody has ever restored one,
and the private key's location is unrecorded.

**Sep 15 has no backup and never will.** Run `34952425209` died at
`actions/checkout@v4` with *"repository ... not found"* — GitHub could not hand
its own runner the repo. Same commit as every green run either side. **15 runs,
14 green.** Not a defect here; nothing to fix.

**That one blip produced three emails** — Actions fires instantly with no grace,
then the healthchecks nightly-backup check timed out (the ping is `if:
success()`, so a failed run stays silent), then recovered the next night. This
is why the scheduled-jobs grace went to 2 hours. **The Actions email itself has
no delay setting** and is Andrew's GitHub notification config, not ours.

---

## 4. Publishing — THE FREEZE IS LIFTED, 2026-09-21, and here are his words

**Recorded as what he said rather than as permission granted, so the next
session can check it the way this one did instead of inheriting it.** Asked
this morning whether to publish:

> *"the publish thing, yeah, sure, you could publish now, and yeah, you could
> change the order."*

**That is the whole of what was lifted.** Still standing, unchanged and his:
**no push, no credentials, no writes to `adtlnvihwrcqcasqcjwd`, and the
payment webhook last and alone.**

**A session asked for this before acting, and that was right.** The written
rule in § 8 and in `CLAUDE.md` says publishing is Andrew's own press, and a
manager's summary is not a substitute for it. `FOR-ANDREW.md:287` still
carried an open `DECIDE` box for the publish order at the moment the freeze
lifted, which is exactly how a stale document looks when a live decision has
overtaken it.

### THE SHARED MODULES RIDE ALONG — established from the tooling, not assumed

**`_shared` cannot be deployed on its own and is not a stage.**
`scripts/deploy-functions.mjs:102` excludes it from the deployable list
entirely. Each deploy uploads that function's `index.ts` with `../_shared/`
rewritten to `./_shared/`, **plus every file in the whole `_shared` tree** —
`sharedFiles` is computed once, above the loop, and all **33** files are
appended to every function.

**So each function carries the entire shared tree as it stands on disk at the
moment that function is deployed.** Two consequences, and they are the whole
of the ordering question:

- **Every stage carries an identical copy, provided the tree does not move
  mid-publish.** Verified by hashing it before the first deploy —
  **`3044bdf2b590828b`, 33 files** — and re-checking before each stage. If it
  moves, later stages ship a different shared copy than earlier ones and the
  estate splits silently. That is the real hazard, and it is live: another
  session committed to `_shared` twice on the morning of the 21st.
- **The estate is split until the last stage lands, and that is inherent.**
  `_shared/emailTemplates.ts` is imported by **16** functions; a function
  keeps its old copy until it is itself redeployed. Not a fault — a property
  of per-function deploys, written down so nobody reports it as one.

### The order, re-cut against 33 — the count moved because we moved it

22 of 39 was the figure when this was written; 24 the night of the 20th; **33
of 39 at the moment publishing began**, because last night's own commits
changed the checkout, not the deployments. **Use what `deployed-inventory`
says when you start, never what a document says.**

### THE PUBLISHING LOG — what actually went out, in order

| stage | what | result |
|---|---|---|
| **0 · before** | `deployed-inventory` | **33 of 39 differing, 6 matching.** Receipt committed at `3b9f4d5` as the before |
| **1 · Spanish email labels** | **`send-invoice` only**, version **70** | **GREEN.** Predicted 32 differing / 7 matching before running; measured **32 / 7**, `send-invoice` moved to matching. `check-deployed` agrees — it is absent from that run's 35 stale names |
| **2 · `report-problem`, alone** | version **15** | **DEPLOYED AND GREEN — but the check still calls it differing, and no deploy can ever clear that.** See below |

| **3a · `send-owner-reminders`, alone and first** | version **78** (was 77, deployed 2026-09-13) | **GREEN.** 31 differing / 8 matching, `send-owner-reminders` moved to matching |
| **3b · `get-booking-receipt`** | v**60** | GREEN — 30 / 9 |
| **3c · `create-booking`** | v**83** | GREEN — 29 / 10, and `e2e-booking` **91 passed / 0 failed**, legs `13·13·13·13`, canary caught |
| **3d · `platform-admin`** | v**60** | GREEN — 28 / 11 |
| **4 · the remaining 26, one pass** | 26 functions | 28 / 11 → **5 / 34** |
| **4.5 · `platform-billing`, ALONE** | v**59** | deployed; the residual difference is a phantom, below |
| **5 · the payment webhook, LAST AND ALONE** | `stripe-webhook` v**46** (was 45, 2026-09-13) | deployed with nothing else in flight. Liveness: an unsigned POST is **refused with HTTP 400**, not a crash |
| **6 · after-inventory, pre-fix walker** | — | **34 matching / 5 differing — and all 5 deployed 0h earlier, so all 5 were phantoms** |
| **6b · after-inventory, CORRECTED walker** | — | **39 / 39 MATCHING, 0 differing, status `pass`, exit 0 — the first passing run in this check's life** |

**ALL 39 FUNCTIONS NOW RUN THIS CHECKOUT.** The estate went from **33 of 39
wrong** to **0**.

### THE WALKER FIX, AND WHY IT WAITED UNTIL AFTER STAGE 6

**`import type` is erased by the compiler, so the module it names is never in
the deployed bundle.** `sharedFor()` followed it anyway, so
`deployed-inventory` hunted for comment text in files the bundle legitimately
cannot contain — reporting **five** perfectly current functions as differing,
at 0h old, **for ever, at every version.**

**Six such imports exist in `_shared`** and they reach further than they look:
`create-business` and `watch-jobs` do not mention `tenant.ts` anywhere and
were being judged against it through `email.ts` and `slotValidation.ts`.

**The count was corrected on the way: it read as ONE phantom before stage 4
and FIVE after.** Not a change in the code — before stage 4 `tenant.ts`
genuinely differed almost everywhere, and **a real fault was masking the
phantom ones.** Fixing the real differences is what made them visible.

**Proved in both directions before it was believed:**

| | |
|---|---|
| phantom clears | `report-problem` no longer judged against `emailTemplates.ts`; `create-business` and `watch-jobs` no longer against `tenant.ts` |
| **counter-canary — a real dependency must survive** | `send-invoice` **keeps** `emailTemplates.ts` and `report-problem` **keeps** `tenant.ts`, both direct imports. **A fix that simply blinded the walker would pass the first test and fail this one** |

**It was deliberately not applied during the run.** Changing the instrument
while it is the only thing reporting whether a publish worked is how a clean
run and a broken measurement become indistinguishable.

### THE BEFORE-INVENTORY CANNOT BE RE-READ, AND THAT IS ITSELF A FINDING

The instruction was to re-read **both** inventories through the corrected
walker so the pair is comparable. **The after was re-read. The before cannot
be, and saying so is better than manufacturing a comparison.** Two reasons,
both structural:

- **The before-state no longer exists.** All 39 functions have since been
  deployed; there is nothing left to measure.
- **The receipt did not record enough to recompute it.** Stage 0's committed
  receipt (`3b9f4d5`) carries only `matching` and `differing` **name lists** —
  `has per-file detail: false`. Without which file differed for each function,
  the phantom cannot be separated from the real after the fact.

**And the honest reading is that the two numbers were never the same kind of
number.** The before-count of **33 differing was real** — `tenant.ts` and
`pricing.ts` had genuinely moved that morning. The phantoms were not hiding
inside that 33; they only became visible once the real differences were
published away. **A receipt that recorded which files differed, not just which
functions, would have made this answerable.** Named, not built.

**STAGE 3 IS RUN ONE AT A TIME, with a check between each** — manager's
ruling: four at once costs four suspects and a bisect, and one of the four
changes what a live cron does to real inboxes.

**Why `send-owner-reminders` went first, ahead of where a cron would normally
sit:** until it was live the **eight-day-old** copy was firing every fifteen
minutes — `send-owner-reminders-sweep`, `*/15 * * * *`, confirmed active in
`cron.job` — and could still send a customer a sales email for a service they
never bought. **That exposure was real and already realised, not
theoretical:** it fired once, on 2026-09-20, subject *"System X five-year
warranty · yearly professional service is due Wednesday, October 14, 2026"*.

**The ordering paid off, and it was checked rather than assumed.** Before
deploying: `business_settings.email_customer_maintenance_due` exists, boolean,
`NOT NULL`, default **false**, and **all 16 businesses hold false**. The
database really was ahead of the function.

**HOW 3a WAS VERIFIED, INCLUDING THE HALF THAT WAS NOT.** Invoked directly:
`{"success":true,"count":0,"summary":{}}`, **zero** new rows in
`email_sends`. That proves the maintenance-due email did not fire. **It does
NOT prove ordinary reminders still fire** — `count: 0` means nothing was due,
and a did-not-run looks exactly like a pass, which is this repo's oldest
fault. What closes it is the diff rather than the run: **stripped of
comments, the entire change to this function is one line** —
`if (!settings.email_customer_maintenance_due) continue;` — **and it sits
inside the maintenance block.** The reminder path is untouched, and the
function executed end-to-end under the new bundle across all seven RPCs
without throwing. **Labelled honestly: the negative is proved by running, the
positive by reading. No reminder was observed being sent.**

**STAGE ORDER CHANGED MID-RUN, 2026-09-21, by Andrew's manager.**
`platform-billing` — which is what `card-declined` always meant — was moved
out of stage 2 into **its own stage 4.5, alone, immediately before the payment
webhook**, on the reasoning that a function which charges people does not ride
along in a low-risk batch. **Stage 2 is therefore `report-problem` alone**,
and is written that way so it does not read as a stage that quietly lost one.
Andrew's ruling on the webhook is untouched: last, alone, nothing in flight.

### THE VERIFIER CAN REPORT A PERFECTLY CURRENT FUNCTION AS DIFFERING — 2026-09-21

**Found by stage 2 failing a prediction.** `report-problem` was deployed from
the frozen tree, came back **version 15, 0h old**, and `deployed-inventory`
still listed it as differing on **one** file: `_shared/emailTemplates.ts`.
Predicted 31 differing / 8 matching; measured **32 / 7**.

**The deploy was fine. The check is wrong, and it is wrong in a way that
deploying can never fix.**

`_shared/email.ts:10` reads `import type { TenantBrand } from
"./emailTemplates.ts"`. **A type-only import is erased at compile time**, so
`emailTemplates.ts` is never in the deployed bundle for a function that
reaches it only through that line. But `sharedFor()` counts it as a
dependency, so the check reads the file off disk, looks for its comments in
the bundle, and finds none — **for ever, at every version.**

**Proved by the contrast, not by reasoning alone:** `send-invoice` imports
`emailTemplates.ts` **directly**, so it is genuinely in that bundle, and
`send-invoice` **matches**. Same file, same frozen tree, minutes apart — in
the bundle when really imported, absent when only a type.

**Scale, measured rather than feared: exactly ONE function is a pure false
positive today** — `report-problem`, whose only differing file is that one.
Every other differing function has a real cause, overwhelmingly
`_shared/tenant.ts`: **9** differ on it alone and it appears in nearly every
other set.

> **A PREDICTION FOR STAGE 6, WRITTEN DOWN NOW SO IT IS NOT DISCOVERED AS A
> FAILURE LATER: the after-inventory will NOT reach 39 matching.**
> `report-problem` will still read differing, and any function whose last
> remaining difference is a type-only-imported file will too. **A non-zero
> after-count is not a failed publish.**

**NOT FIXED DURING THE RUN, AND THAT IS DELIBERATE.** The fix is one
condition in `scripts/lib/sharedDeps.mjs` — do not follow `import type` — and
that file is in this lane. **But changing the verifier in the middle of the
run it is verifying would mean the before-inventory and the after-inventory
were produced by two different instruments**, which destroys the one
comparison the whole publish is built on. It is fixed after stage 6, broken on
purpose first, and both inventories re-read afterwards.

**Stage 1 was ONE function, and that is worth knowing before anyone reads
"Spanish emails" as a group.** The change (`b509671`) touched
`_shared/emailTemplates.ts`, `_shared/strings/es.ts` and **one** function,
`send-invoice`. The two shared files ride along with every later deploy, so
the other **15** importers of `emailTemplates.ts` keep their old copy until
they are themselves redeployed.

### STAGE 2 NAMES A THING THAT DOES NOT EXIST, AND THE REAL ONE MAY BE STAGE 5

**`card-declined` is not a function.** There is no such directory in
`supabase/functions/`, and the string appears in exactly two places in the
whole repository — `FOR-ANDREW.md:291` and **line 257 of this file**. Two
documents have been carrying a publishing instruction naming something that
has never existed in code.

**And the reason that matters is not the name.** Tracing what a declined card
actually touches:

- `_shared/emailTemplates.ts:1303` holds the declined-card amount.
- **`stripe-webhook/index.ts` is the function that fires on a failed
  charge** — `invoice.payment_failed`, and the `failure_message` a person
  reads. **That is the payment webhook: stage 5, last and alone.**
- `platform-billing/index.ts:133` separately renders *"your card was
  declined"* for the platform's own billing of detailers.

**So stage 2 as written would either pull a piece of the payment webhook
forward out of its ruling, or it means `platform-billing` and has always
been written down under the wrong name.** Not guessed at here. Stopped and
handed back, because the one thing the publishing order exists to prevent is
the money path moving early.

### BOTH NAMES ON THE OLD STAGE-2 LINE WERE WRONG, AND THE OLD LINE IS KEPT

**The line read: `card-declined + report-a-problem`. Neither is a function.**
Kept here in its old form rather than silently replaced, **because somebody
may be holding a note that still says `card-declined` and has to be able to
recognise it.**

| the old name | what it actually is |
|---|---|
| **`card-declined`** | **`platform-billing`** — no function has ever carried the name `card-declined`; it appears in exactly two markdown files and nowhere in code. `platform-billing/index.ts:133` renders *"your card was declined"* for the platform's own billing of detailers |
| **`report-a-problem`** | **`report-problem`** — off by one word, and enough to make a copy-paste deploy fail |

**That one line named two functions and got both wrong**, which means it had
never been checked against `ls supabase/functions/` in its life. The same
correction is owed to `FOR-ANDREW.md:291`, which is **not this lane** and is
being carried across by the manager.

### THE ORDER WAS CHANGED MID-RUN, BY THE MANAGER, ON 2026-09-21

**Recorded so a reader comparing any other copy of this order against this one
finds the difference explained rather than having to work out which is stale.**

`platform-billing` was moved **out of stage 2** and given **its own stage,
4.5, immediately before the payment webhook and alone.** The manager's
reasoning, and it is explicitly *not* a weakening of Andrew's ruling:

> the payment webhook still goes last, still alone, still nothing else in
> flight. What changed is that the reason behind that ruling was applied to
> the function that turned out to share the property. **A thing that charges
> people does not ride along in a low-risk batch because a document once put
> it there.** If publishing it is unremarkable, the cost is one extra stage.
> If it is not, it is found with nothing else moving.

**So stage 2 is `report-problem` ALONE** — stated that way on purpose, so a
stage that used to hold two things does not read as one that quietly lost one.

### The order as it now stands

1. **Spanish email labels** — `send-invoice` only. **DONE, version 70.**
2. **`report-problem`, alone.** Running against parts that did not exist when
   it was deployed; unpredictable if triggered.
3. **`create-booking`, `get-booking-receipt`, `platform-admin`,
   `send-owner-reminders`** — Andrew's approved reorder. The first three
   unblock finished roadmap items waiting only on being live;
   `send-owner-reminders` puts the coating-email gate into force, which is
   the one that can otherwise reach a real customer.
4. **everything remaining**, in one pass.
5. **`platform-billing`, ALONE** — stage 4.5, the money path that was hiding
   under the wrong name.
6. **the payment webhook LAST and ALONE.** It touches money. Untouched by any
   of the above; this is Andrew's and it is not being reinterpreted.
7. **`deployed-inventory` again**, and keep that receipt beside the before.

**Run `deployed-inventory.mjs` before and after** — and **it is no longer
unproven.** It had never been executed when this was written; it has now run
repeatedly, including as the stage-0 before-state at `3b9f4d5`. **Use what it
says at the moment you start, never what this document says**: the figure has
been 22, then 24, then 33, and each time the earlier number was still sitting
in a file. Do not deploy something just to clear it.

---

## 5. How the sessions collided, and the rule that came out of it

**Four collisions in one night, all the manager's fault**: app/src work assigned
during a browser sweep; a test battery authorised mid-sweep; two sessions sent
at Spanish simultaneously; and "app/src is quiet" said to one session an hour
before handing app/src work to the other — its source guard fired and voided a
completed sweep.

The rule is in `docs/how-we-run.md` § *"What you say about the other tree
expires the moment you say something new"*. In short: **a lane statement is a
claim about a moment, not a fact about the repo.** Check what is out on loan the
way you'd run `git status` before trusting your memory of the tree.

`scripts/source-guard.mjs` watches `app/src` only, recursively, all file types.
`docs/` and `ROADMAP.md` are free. **`scripts/` is watched by nothing.**

---

## 6. The manager got five things wrong. Each is on the record.

*(Four when this was written. The fifth was found and corrected the same day,
by the session it had been handed to — see the last bullet. The count is
updated rather than left at four, because this repo has already paid for a
pointer that undersold its own document.)*

Kept because the pattern matters more than the individual errors:

- **Said the backups did not exist.** Andrew: *"I'm right, just trust me, I know
  I'm right."* He was.
- **Misstated three numbers** — a 2-in-20 truncation, "a real defect at tour
  step 28", and "$3.50" for a figure that was $2. Standing instruction issued
  and still in force: **treat any number the manager hands you as a pointer to
  where to look, not a value to code against.**
- **Ticked ROADMAP 9.11 with a named unverified gap** — phone width, because
  the manager's browser pins its layout viewport at 1414 and cannot be made
  narrower. The sweep then found a real 320px regression **sitting exactly in
  that gap**. *A tick carrying a named unverified gap is still a tick, and this
  is what one costs.*
- **Declined to press Run on the SQL and on the Resend change**, and Andrew was
  right to push back: *"If there's something you could have done 100%, you
  should have just done it."* **A session that can press the button presses the
  button.** The only real exceptions are the standing ones — no credentials, no
  spending, no pushing, no publishing, no writes to `adtlnvihwrcqcasqcjwd`.
- **Gave a whole-table count as a tenant count** — *"the demo tenant's
  `customers` count went 64 → 48"*, said to two sessions and written into § 1
  of this file. **48 is the `customers` table across all sixteen businesses;
  `demo-detail` holds 13 and always did.** Owned by the manager, corrected in
  § 1 on 2026-09-21 by DP Cowork2 and re-measured there. **It is the same
  shape as the three misstated numbers above** — a number handed over in
  conversation carries no scope, and the scope is the half that fails
  silently. **It was the most dangerous of the five**, because it went into
  the one document every session is told to read first, and the more careful
  check it invited — look at the tenant rather than the table — was the one
  that would have made the panic worse.

---

## 7. What each session left, verbatim from its own handoff

Both stopped at clean boundaries with nothing in flight. **Read their handoffs,
not this summary, before starting their task one.**

- **`docs/HANDOFF-2026-09-20.md`** (measurement leg). Task one: re-derive only
  the `Npx spare` figures that **gate open items** — not all 64. Open: the plans
  page's 234px advisory; the expected-count file has drifted (`Maintenance
  deadlines` → `Visits due`, tour steps 34-36) and **360px has no expectation
  recorded at all**, so it is swept ungraded.
- **`docs/HANDOFF-2026-09-20-clients.md`** (client screens / 9.11). Task one:
  re-run `sweep-widths.mjs` against current HEAD — the receipt on disk reads
  `fail` but its `git_sha` is an **ancestor** of the commit that fixed it, so it
  is **stale, not wrong**. 9.11, 9.6 and 9.7 are built and verified live and
  **none are ticked**; Andrew presses each himself.

**Queued and not started, app/src side:** the alert-email redesign (top), the
problem-report email's readability (his words: *"I feel like if I copied a debug
menu, this is what it looked like"* — wants 12-hour time and month/day/year),
the coating-email classification fact-find, the mock-browser-bar replacement,
the customer export, flagging the test detailers, the Spanish truck words, large
text on the booking page, and re-checking 9.10's false premise.

### Three head-only notes, added 2026-09-21 — none of these is in any file otherwise

**From the client-screens session, volunteered unprompted:**

- **Roadmap 4.5's probe scripts no longer exist.** They lived in a session
  temp directory, never in `scripts/`, so they vanish with the session.
  **Whoever builds 4.5 should rebuild from the six requirements written into
  that ROADMAP entry rather than hunting for code that is not there.** A
  session that goes looking will find nothing and cannot tell that from
  looking in the wrong place.
- **That session took no baseline of the tenant at its start.** Its
  "left as found" rests on the counts matching afterwards and on its scripts
  never submitting a form — **not on a before-and-after diff.** It also
  created auth sessions for the demo user across roughly a dozen throwaway
  browser contexts; those are the only rows it caused anywhere and they are
  not tenant data. **A session declaring its own proof thinner than it
  sounds, at six in the morning, with nobody asking.** It had an immediate
  effect: the round that followed took a baseline before its first run
  *because of this note*, and that baseline is what turned its own
  as-you-found-it from an assertion into a `diff` — `docs/silences.md`,
  § "THE TENANT WAS LEFT AS FOUND, AND THIS TIME THERE IS A BASELINE".
- **Its browser pane had no signed-in session, and it did not type the
  password in.** It took the evidence from the script and drew the measured
  hit bands onto the screen instead — **better evidence and no credential
  handled.** Nobody instructed that. Recorded because § 8's rule is written
  as a prohibition, and this is what the rule looks like when it is treated
  as a design constraint rather than an obstacle.

---

## 8. Standing constraints. Unchanged, and they are Andrew's, not a session's.

No push. No publish. No deploy. **No handling of any key, token, secret or
password — not creating one, not reading one out, not pasting one anywhere.**
Say where a secret lives, never what it is. No spending. **Never write to
`adtlnvihwrcqcasqcjwd`** — that is his real, live business; this repo's project
is `kguqylyzgyzfktkfnhjb`. Migrations are append-only; never edit an existing
one. `reference/` is read-only.
