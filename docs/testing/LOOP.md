# The testing loop

A protocol for a session that does nothing but use the product as a person
would, catalogue what is wrong, fix what it can, and prove it did not break
something else. It runs until the owner stops it or until nothing testable is
left.

The owner, 2026-09-06:

> *"I want, like, an infinite loop of testing, fixing, testing, fixing…
> Testing every functionality, how it works with multiple detailers… role
> playing as a detailer, role playing as me, role playing as different
> scenarios that might happen and just kind of seeing how it handles it…
> I don't want this to be quickly thought through."*

**This file is the plan. `docs/testing/FINDINGS.md` is the catalogue.** The
loop reads this, works a pass, writes findings there, and never invents work
that is not on one of the two.

---

## 0. Why this exists, and the failure it is built against

Every automated check in this repo asks a question somebody already thought
of. **The defects the owner has actually found were all things nobody thought
to ask**, and there is a pattern in them worth stating before any scenario:

| What he found | Why no check caught it |
|---|---|
| `/admin` gave a 401 with no way in | Every test signed in first. Nobody arrived cold. |
| No *Sign in* on a phone | The layout sweep measures whether things FIT, never whether they EXIST. |
| Setup said *2 of 7* on a new business | The number was correct. It was the meaning that was wrong. |
| 28 stale edge functions | Every test read the source, none asked what was running. |

**Three of those four passed every check in the repo while being wrong.** So
the loop's job is not to run the suites — CI-shaped work already does that. Its
job is to *arrive somewhere as a person, with an intention, and notice.*

**The rule that follows: a pass is only over when the persona's INTENTION is
satisfied or provably blocked.** Not when the page rendered.

---

## 1. The protocol — one pass at a time

**A pass is one persona doing one thing.** Never two. The loop runs passes
until stopped.

```
1  PICK      the next unplayed row from §3's table. In order. No skipping.
2  SET UP    seed or reset the state that persona needs (§6).
3  PLAY      do the thing, in a browser, as them. Narrate intention, not clicks.
4  CATALOGUE every friction, risk and break into FINDINGS.md — even ones you
             are about to fix, and even ones you cannot.
5  FIX       only findings this pass produced, ranked blocks-launch first.
             Anything needing the owner is parked, never guessed.
6  PROVE     the regression gate (§7). Every time. No exceptions.
7  COMMIT    one commit per pass, naming the persona and the findings.
8  LOOP      back to 1.
```

**A finding is recorded before it is fixed.** A fix with no finding behind it
is untracked work — the drift that produced `docs/CHECKPOINT.md`'s process
note. If it turns out not to be a defect, the finding is marked `not-a-defect`
with the reasoning, never deleted.

**Never end a pass with an open question.** Park it in FINDINGS.md under
`NEEDS THE OWNER` and move to the next row.

---

## 2. Severity — the vocabulary already in use

From `docs/final-pass.md`, unchanged so the two documents can be read
together:

- **blocks-launch** — a real detailer or their customer gets stuck, or loses
  something. Fix in the same pass.
- **embarrassing** — it works and makes us look unfinished. Fix if the fix is
  understood; park if it needs taste.
- **cosmetic** — only we would notice.

Two additions this loop needs, because it is looking for things a snapshot
cannot see:

- **risk** — not broken today, breaks under a condition that will arrive.
  *A detailer at 100 photos. The 101st tenant. The first February.*
- **trap** — works correctly and will be misread by a person. *"2 of 7 done"
  was this.* These are the hardest to see and the most valuable to catch.

---

## 3. The cast, and what each of them is trying to do

Researched, not invented — sources at the foot of this file. **Each row is one
pass.** Work down the table; when it ends, start again at the top with the
state left behind by the last cycle (which is itself a test: nothing should
degrade on a second lap).

### 3a. Detailers

| # | Who | What they are trying to do | What it is really testing |
|---|---|---|---|
| D1 | **Brand-new solo mobile detailer**, signed up an hour ago, nothing set up | Get to a bookable page today | First-run, setup order, empty states, whether the product tells them what is missing |
| D2 | **Established solo mobile detailer** (this is the owner's own shape) | Run a normal Tuesday: check the day, do a job, take the money | The daily loop. Speed, not features |
| D3 | **Ceramic coating / PPF specialist** | Sell a £1,500 coating, register the warranty, book the annual inspection | Maintenance deadlines, add-ons, quotes, whether a high-value job is treated differently from a wash |
| D4 | **Detailer with one employee** | Send staff to a job without giving away the books | Permissions, staff invite, what staff can and cannot see |
| D5 | **Shop / drop-off detailer**, no mobile work | Take bookings to an address customers come to | Whether the product assumes mobile. Service-type handling |
| D6 | **Fleet / commercial detailer** | Handle a dealership booking ten cars | Repeat customers, bulk, whether anything assumes one car per booking |
| D7 | **Interior-only or single-service detailer** | Sell one thing well | Whether a catalog of one looks broken |
| D8 | **Seasonal detailer** in a snow region | Nothing booked for six weeks in January | Empty money screens, lapsed-customer prompts, whether the product implies failure |
| D9 | **A detailer who quits half-way through setup**, comes back in three weeks | Resume | Whether the product remembers, and whether the nag is still right |
| D10 | **A detailer who does everything by phone** and never opens a laptop | The entire product at 392px, one-handed | The phone IS the product. Anything desk-only is a finding |

### 3b. Their customers

| # | Who | What they are trying to do | What it is really testing |
|---|---|---|---|
| C1 | **Cold visitor from an Instagram bio**, on a phone | Understand what this costs, and book | The booking page as a stranger meets it. Friction, clicks, clarity |
| C2 | **Someone who wants a price, not a booking** | Ask a question | The quote path. Whether "I'm not ready" has anywhere to go |
| C3 | **Apartment dweller, no outdoor tap or power** | Book a mobile detail | Whether the page asks before it promises |
| C4 | **Someone rescheduling at 9pm the night before** | Move it | The manage-booking link, cancellation windows, what the detailer is told |
| C5 | **A no-show** | (nothing) | What the detailer's morning looks like. Deposit behaviour |
| C6 | **A returning customer** | Book the same thing again | Whether the product remembers the car, the address, the preferences |
| C7 | **Somebody on a bad connection** | Complete a booking | Double-submits, lost state, whether a slow network makes two bookings |

### 3c. The owner — him

| # | What he is trying to do | What it is really testing |
|---|---|---|
| O1 | Sign a new detailer up by hand and get them live | The back office's create + invite path end to end |
| O2 | Answer *"is this working for them?"* about a specific detailer | Whether the back office answers it without a database |
| O3 | Chase a failed payment | Subscription states, what he can actually do about one |
| O4 | Answer a detailer asking *"can you see my customers?"* | Whether the privacy page and the product agree |
| O5 | Raise photo storage after connecting R2 | Whether a setting he owns is actually reachable and takes effect |
| O6 | Find out something broke before a detailer tells him | Heartbeats, needs-a-look, whether silence means healthy |

### 3d. The adversary — a pass that is not role-play

| # | The attempt | Must be true |
|---|---|---|
| A1 | Detailer A tries to reach detailer B's data, by URL and by API | Nothing. Not one row |
| A2 | A staff member tries to reach money they were not given | Refused by the database, not only hidden by the screen |
| A3 | A signed-out stranger tries every authenticated route | 404 or a login. Never a stack trace, never data |
| A4 | A customer edits a booking id in a URL | Their own booking only |
| A5 | The booking page is hammered by a script | The spam filter holds, and a real customer still gets through |

---

## 4. The dimension every pass varies

Each pass picks **one** and states which. Over a full lap all of them are hit.

1. **Width** — 1920, 1440, 392, 320. The phone is not the afterthought.
2. **State** — empty / one / many / too many. *One is not the same as many.*
3. **Time** — first thing, mid-job, evening, month end, New Year's Day, a DST
   change, February 29th.
4. **Permission** — owner / staff-with-money / staff-without / signed out.
5. **Tenancy** — alone, and with a second detailer present who must never be
   visible. **Two tenants is not a variant of one; it is the whole product's
   promise.**
6. **Network** — normal, slow, dropped mid-action.
7. **Motion** — animations on, and `--lite`.

---

## 5. Multi-detailer testing is a first-class pass, not a checkbox

`seed-two-tenants.mjs` exists and `tenant-isolation` covers the API. **What
has never been done is two detailers signed in, in two browsers, at the same
time.** Every lap must include one pass that:

- signs in as detailer A and detailer B in separate browser contexts,
- has A create, edit and delete things while B is looking at the same screens,
- checks that **no name, figure, count, customer or booking of A's ever
  appears in B's** — including in a stale cache, a total, or a chart,
- and checks the reverse.

**A leak here is the only defect in this product that ends it.** Everything
else is a bad morning.

---

## 6. Setting up state

- `node scripts/seed-demo.mjs` — the seeded demo (31 bookings, four plans).
- `node scripts/seed-two-tenants.mjs` — two tenants, for §5.
- `node scripts/final-pass.mjs` — builds a throwaway brand-new business and
  deletes it after. **This is the D1 machine** and already walks as owner and
  as staff.
- A persona needing state none of those make gets a small script in
  `scripts/`, committed, so the next lap can reproduce it.

**Never seed by hand in a browser.** State nobody can rebuild is a finding
nobody can re-check.

---

## 7. The regression gate — run after EVERY fix, no exceptions

```
node scripts/check-deployed.mjs          # is what is running what is in the repo
for f in tests/*.test.mjs; node $f       # 23 credential-free
<with .env>  the 8 database-backed suites
node scripts/e2e-booking.mjs             # 82 checks, both demo tenants
node scripts/sweep-booking-steps.mjs
node scripts/sweep-widths.mjs            # ~5 min — background it
node scripts/render-emails.mjs
```

**Three rules learned the hard way, all of which have cost this project time:**

1. **Never edit anything under `app/src` while the sweep runs.** It discards
   its own results, correctly. Cost so far: four wasted runs.
2. **Deploy before re-running the database-backed suites.** Until you deploy,
   they were green against the old copy.
3. **Background the long checks and write prose while they run.** Never sit
   idle, never edit source.

---

## 8. Fix, park, or refuse

| The finding | What the loop does |
|---|---|
| A defect with an understood fix | Fix it, in the pass that found it |
| Needs a key, a credential, a card, an account | **Park.** Never guess, never stub |
| Needs the owner's taste | **Park**, with a recommendation and the two or three options |
| Correct behaviour that reads wrong (`trap`) | Fix the *reading* — the words, the order, the emphasis. Never the number |
| Would need a new feature | Record as a roadmap candidate. **Do not build it** |

**Every fix carries a check that fails without it**, and that check is
baselined by breaking what it guards — this repo has found four vacuous checks
that way, three of them in one day.

---

## 9. When it stops

**On the owner's word**, or when a full lap of §3 produces no new
blocks-launch or embarrassing finding that the loop can act on.

Then it writes ONE report — `docs/testing/REPORT.md`:

1. **What is left for him to do**, each with the exact thing that unblocks it.
   This is the section he reads first, so it goes first.
2. What was fixed, one line each, grouped by persona.
3. What was found and deliberately not fixed, with the reason.
4. What is verified, with the numbers that were actually printed.
5. **The ideas** — §10.

---

## 10. The improvement brainstorm — the last thing, not the first

The owner asked for ideas to make the product better, *"using more third party
apps and whatnot as long as everything's free."*

**It comes last on purpose.** A list of new features written before the
testing is a wish list; written after ten laps of using the product as ten
people, it is evidence. The brainstorm must cite the findings that motivate
each idea, and anything with a cost is named with its cost.

Ground rules: free tier only, no new dependency where a platform feature
exists, and nothing that adds a second source of truth for something the
product already knows.

---

## 11. Guardrails — these do not expire

- **Never write to the live business Supabase project** (`adtlnvihwrcqcasqcjwd`,
  Andrew's real customers). Read-only, and only when a task needs it.
- **Never deploy to the `andrewsauto` Netlify site** (andrewsdetail.com).
- **`main` is the deploy.** Pushing it publishes to detailingplatform.com.
  That is normal now — but it means a broken push is a broken live site, so
  the gate in §7 runs before the push, not after.
- **Do not rebuild the three pages in `docs/tenant-sites/`** and do not use
  them as a taste reference.
- **No new roadmap items built without being written down first.**
- **Never delete a finding.** Mark it, explain it, keep it.

---

## 12. How a pass is written up

One block per pass in `FINDINGS.md`, appended, never rewritten:

```
## Pass 014 · D3 ceramic specialist · width 392 · 2026-09-07
Intention: sell a coating, register the warranty, book the annual inspection.

F-041  blocks-launch  The maintenance deadline cannot be set from the job.
       Reproduce: …   Fixed: yes, <commit>   Check: tests/…
F-042  trap           "Due in 30 days" and the email say different days.
       Reproduce: …   Fixed: yes, <commit>   Check: …
F-043  needs-owner    A coating warranty needs the installer's certificate
       number on the receipt. Which certificate, and does it go on the
       customer's copy? — parked.

Regression: 23 + 8 suites green, e2e 82/82, sweep clean, functions current.
```

---

Sources for the personas: [Ceramic Pro aftercare and warranty
terms](https://ceramicpro.com/aftercare-2-2/), [warranty registration
requirements](https://detailsupreme.com/benefits-of-registering-your-ceramic-coating-warranty/),
[booking friction and no-shows](https://www.reservio.com/blog/tips/online-booking-mistakes),
[what small crews break on](https://solvpro.com/feeds/blog/best-practices-field-crews-small-construction),
[mobile vs shop and specialist service mixes](https://getdetaild.com/services/).
