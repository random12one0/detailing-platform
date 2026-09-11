# What is left

2026-09-10, at his ask: *"What's left to be built, to be changed, to be fixed,
and to be reviewed?"*

**This is the single list.** It supersedes the remaining-work sections of
`docs/status-2026-09-10.md`, which was a day old and already wrong in both
directions. Anything not here is done.

**The count: 6 bugs, 8 of his own notes, 9 unbuilt features, 15 things waiting
on him, and 3 pieces of the endgame he described.**

**UPDATED AGAIN, 2026-09-10 overnight. ALL SIX BUGS ARE FIXED, and five of his
eight walkthrough notes with them.** The bug table below carries its own
strikethroughs. What landed after the first update:

| | | |
|---|---|---|
| **The advanced money screen** | 8.9, built | *The full picture*, behind a button on Money. 22 figures in 6 groups, 4 of them drawn. Most popular packages on the everyday screen too. |
| **Where customers came from** | 4.2, reframed | On the money screen, not called a campaign any more. **And untagged visitors are counted at last** — one early-return in the booking page was the whole of "everyone gets tracked". |
| **Report a problem** | his note 6 | New gear row, its own edge function, deployed and exercised. Everything but the words is filled in server-side. |
| **How you get paid** | his note 4 | A switch per method, its field under it. |
| **The web address screen** | his note 7 | Says what to type, with the subdomain filled in, and refuses to walk an apex into a CNAME. |
| **The custom colour** | his note 2 | Sits with the swatches now. |
| **"Your own words"** | his note 3 | Says who reads it, where it lands, and that it goes out as typed. |
| **The language switch** | bug 4 | Quiet, and at the page edge. |
| **The tab guides** | 2.24, twice over | Every tab 5-8 steps; *Show me around* is one 37-step tour of all five tabs plus the settings. |

**WHAT IS LEFT OF HIS EIGHT NOTES: three.** The label sweep (1), the examples
index and its link from the landing page (5, which is the WEBSITES lane), and
the builder's checklist form (8). Everything else in § 2 is done.

---

## 1 · Broken now — six things

| | What | Where |
|---|---|---|
| 1 | ~~The pricing page's terms block is jammed against the screen edge.~~ **FIXED** — and the page was rebuilt to his *"kind of bland"* note at the same time: a photograph, the figures on it, a light band, and the annual rung marked. | `app/src/landing/PricingPage.jsx` |
| 2 | ~~The Today guide walks you onto the Business page.~~ **FIXED**, then rebuilt twice more at his ask — every tab has a 5-8 step guide, one presses a date open, and *Show me around* is now a 37-step tour of all five tabs plus the settings. | `app/src/components/Walkthrough.jsx` |
| 3 | ~~"Show me around" stops after one step.~~ **FIXED.** It was three separate faults in the end, the last of them a card positioned before it existed — it flashed in the top-left corner and froze. | same file |
| 4 | ~~The English/Spanish buttons are badly placed~~ **FIXED** — they were a solid accent fill, the loudest thing on the page, and at a desk they sat against the title in the middle of the bar. Quiet now, and at the page's own edge. | `app/src/book/booking.css` |
| 5 | ~~The password screen never asks for your current password.~~ **FIXED**, and an eye toggle was added to every password field in the product. | `app/src/screens/more/Password.jsx` |
| 6 | ~~There is no "page not found".~~ **FIXED** — `app/src/screens/NotFound.jsx`, deliberately outside the session provider. | roadmap item P |

**1.2 of his audit — the setup progress counter — is fixed**, by the rebuild
that deleted the screen it was wrong on. The audit doc still shows it open.

---

## 2 · His walkthrough notes, still open — eight

From `docs/owner-walkthrough-2026-09-10.md`. Everything else in that file is
either done or signed off.

1. **The label sweep.** Four labels were fixed; he asked for an audit of all of
   them — *"every labelling should be clear, not this weird AI naming."*
2. **The color picker sits below the example** instead of with the swatches.
3. **Notifications, "your own words"** — does not explain what it does.
4. **How you get paid.** Needs a toggle per payment method with a field behind
   each, plus an add-your-own. Today it is one cash switch and four loose text
   boxes.
5. **The examples index is too plain**, and the landing page does not link to
   it at all.
6. **Report a problem** — a way for a detailer to say "there is nowhere to put
   this", sent to him. No code anywhere.
7. **DNS instructions** on the web-address screen: one line, no record name, no
   value, nothing to copy.
8. **The builder's checklist.** `docs/tenant-site-contract.md` has the twelve
   things a site owes; what is missing is the tick-through form an agent works
   to, which is § 3 below.

---

## 3 · Not built — nine features

| | What | Note |
|---|---|---|
| 9.2 | **The gallery of sites he likes** — a table, a back-office manager, and browse-and-favourite in the brief | His 21 links exist as prose and nowhere else. This is screen one of the brief. |
| 9.4 | **A live "next opening" band** on a tenant site | Exists as static markup in one example page; no product feature behind it. |
| 8.9 | **The advanced money view** | Blocked on a customer-entered tip, which does not exist. |
| 6.1 | **The demo business's own marketing site** | Blocked on taste. |
| 6.2 | **Three months of fictional history + a reset script** | The seed exists; the reset does not. |
| 2.25 | **The sign-in screen redesign** | Google sign-in is live; the screen itself was never redesigned. |
| 7.2 | **Sentry** — error alerts | Needs his account. |
| — | **SMS** of any kind | No item, no code. |
| — | **Google Calendar sync**, **referrals**, **deposits per service**, **Tap to Pay** | All either skipped by him or blocked on Stripe Connect finishing. |

---

## 4 · Waiting on him — fifteen

**Money and accounts**

1. One real card payment through a connected Stripe account — nothing proves it works until somebody pays.
2. The Stripe webhook signing secret.
3. A Stripe account in a parent's name.
4. Netlify credits — **publishing is dead until 13 September**, and that gates 1, the Google submission, and anything he wants to see on the real address.
5. Sentry account.
6. UptimeRobot and healthchecks.io accounts.

**Proving what is already built**

7. The backup restore test — needs the private key and a health-check URL. **A backup nobody has restored is not a backup.**
8. The old project's access key, for moving his real business over. *He has deliberately not shared it. It is listed, not asked for.*

**Decisions**

9. The founding-offer price sanity check.
10. Should a detailer's email show on their site by default.
11. Should an odd price ladder be refused or only warned about.
12. Is the legal entity name right.
13. Two or three detailer sites whose look he likes, to unblock 6.1.

**Dates**

14. Google Business Profile — first review due about 17–22 September.
15. Merging to `main`, which is a publish.

**And one security item that is open and should not stay open:** a service-role
key is in public git history and has never been rotated (`PROJECT-STATE.md` §6).

---

## 5 · The endgame he described

Three things, in this order.

### 5a · The website builder's rule set

*"The builder needs an instruction manual on how to properly connect the
website to the admin dashboard, making sure nothing is left out. I don't want
it to accidentally build an FAQ and not link it to the back end, where when
they turn it off or change things, it doesn't actually update on the
website."*

**Half of it exists.** `docs/tenant-site-contract.md` § 2 is the twelve things a
tenant site owes, each written as *what silently stops working if the site
omits it* — which is exactly his fear, already enumerated. What does not exist
is **the checklist an agent ticks**, and the rule that a site **asks and never
computes**: every price from `calculate-booking`, every open time from
`available-slots`, every FAQ and review and photo from the profile call.

### 5b · The clicking coworker

*"A prompt for a Chrome extension to go through the entire website clicking
around — click every single thing and double check that every button does what
it should do."*

Buildable, and the shape matters: it needs **a list of every screen, a list of
every control on it, and what each control should do** — otherwise it clicks
things and reports "no errors", which is the failure this repo has recorded
many times. `app/public/map.html` plus the settings addresses added on 09-10
are most of the first list.

### 5c · His run as a new customer

*"I'm gonna role-play as a new customer, set up my thing, take the form, and
see how it goes."*

**This is the real acceptance test and it should be last**, because it exercises
signup → first-run setup → the brief → a brief file → a built site, and every
one of those has to work before the run means anything.

---

## 9 · TWO SUITES ARE RED AND NEITHER IS NEW — found 2026-09-10 overnight

Every suite in the repo was run. Everything passes except two, and BOTH WERE
ALREADY FAILING BEFORE the overnight work — verified by checking out the tree
from before it and running them there, which gave the identical counts.

| Suite | Red | What it is about |
|---|---|---|
| `platform-admin` | **46 of 159** | The back office at `/admin` — the sign-in page, what a signed-out visitor sees, what a non-admin gets. |
| `password-reset` | **3 of 29** | The reset page and the settings screen refusing a short password, and the three sign-in selectors five scripts depend on. |

**The password one smells like the 10-character rule** that went in on
2026-09-10 — the checks may still be asserting eight. **The back-office one is
46 checks and needs somebody to look**, not a guess. Neither is in the product
a detailer touches, which is why neither is in § 1.

---

## 8 · ONE ACCOUNT, BOTH DOORS — his instruction, 2026-09-10

*"Once I create my account — I'm gonna start from scratch — I want the account
to be able to access the admin dashboard, the back office thing. I don't want
to have two accounts so I can cycle through them. I just want one account. But
I'll make that account later."*

**IT ALREADY WORKS THAT WAY AND NOTHING NEEDS BUILDING.** Being a platform
admin is a row in `platform_admins` keyed on the user; owning a business is a
row in `business_members`. They are separate facts about the same person, so
one login can be both — signing in lands on HIS dashboard, which is right, and
the back office is a door off it: the gear grows a row called *The website
business* for an admin and shows it to nobody else.

**WHAT HAS TO HAPPEN THE DAY HE MAKES IT, and it is one line of SQL:** insert
his new user id into `platform_admins`, then delete the `demo@demo.com` row.
That demo row is the master login today and it is a launch blocker in its own
right — the password is `demo`, on the account that can read every detailer.
Doing both in one edit is what keeps the back office reachable and stops it
being reachable by anybody who guesses.

---

## 7 · The two he asked about on 2026-09-10

### 7a · "Have we built the advanced money thing yet?" — NO, and it is waiting on four answers from him

Roadmap **8.9**. The research is done (`docs/money-view-research-2026-09-07.md`)
and found the useful thing: **nothing on the missing list needs a database
change.** Tips are already rows, expenses already carry a category, and every
booking already has a duration — so the build is arithmetic over what the
product already keeps, in the shape of `lib/adminInsight.js`.

**What is missing against his own live dashboard:** net profit, tips in every
form, hourly wage, expenses by category, revenue by month and its trend, new
versus returning customers, top spender, most popular days. The platform
already answers *quoted up front* and *added on site*, and Money already leads
on net rather than revenue.

**IT IS BLOCKED, AND THE BLOCK IS HIM, NOT THE WORK.** § 6 of the research file:

| | The question, in plain words | Recommendation |
|---|---|---|
| **A** | Three of his six money figures are tip figures, and the only tip the product knows about is the one the DETAILER types in after the job. Ship those figures against that and label them honestly, or leave tips out until customers can add one themselves? | **Ship them labelled**, because "tips I wrote down" is still his real money. The one to leave out is *tip rate* — it reads as "how many customers tip" and means "how often I remembered to write one down". |
| **B** | One sentence at the top, then ruled rows in three groups, no charts — or does he want the bars? | **Ruled rows.** He has said twice he does not want "plain boxes", and a chart under ten customers is noise. |
| **C** | Expense categories: offer a list an accountant recognises, or leave it free text? | **Offer the list**, ignorable. It is the one accountant-facing thing worth doing here. |
| **D** | Anything on his old screen he does NOT want carried over? | Cheaper to drop now than build twice. |

A and B are the two that actually stop the build.

### 7b · "The Yelp and Google link tracking" — MOSTLY BUILT, under another name, with three real gaps

It was saved, and it is roadmap **4.2**: `app/src/screens/more/Campaigns.jsx`,
reached from **Business → Campaign links**. What exists today:

- **A custom link per source.** Give it a name, get `…/book/<you>?c=<name>`.
  Put one on Yelp, one on Google, one on a flyer.
- **Clicks and bookings, per link**, read back as two integers on the row.
- **A discount that applies itself** when somebody arrives through the link,
  which is the half he originally asked for on a QR code.
- **The same-browser join he described.** `visitorIdFor()` in
  `app/src/book/core.js` writes a random id into that browser's storage, so a
  scan on Tuesday and a booking on Friday are one story rather than two. It is
  not an identity — nothing is looked up by it, it goes to no third party, and
  clearing site data is a complete opt-out.

**THE THREE GAPS, and the first one is the one he actually described:**

1. **Untagged visitors are NOT tracked at all.** `BookingPage.jsx:155` returns
   early unless there is a `?c=` on the address — so "everyone automatically
   gets tracked" is false today. The server side already accepts an organic
   visit (`track-visit` writes `campaign_id: null`); it is the browser that
   never calls it. **This is the smallest of the three and the biggest in
   effect.**
2. **`referrer` is recorded and nothing ever reads it.** The column is written
   on every campaign visit, so "they came from google.com" is already in the
   database with no screen behind it. Without gap 1 fixed it is nearly empty.
3. **No conversion RATE and no repeat-visitor view.** Two integers per row was
   a deliberate choice — *was the flyer worth it* is two numbers — but "40
   clicks, 3 bookings, 7.5%" is the sentence he actually said, and unique
   visitors versus visits is one query away once gap 1 lands.

**And it is presented as flyers and QR codes**, not as Yelp and Google. A
Yelp/Google pair offered by default on that screen is copy, not code.

---

## 6 · The order I would work in

1. **The six bugs.** They are visible, they are small, and one of them is a
   security hole.
2. **His eight notes**, heaviest first: how-you-get-paid, then the label sweep.
3. **The builder's rule set (5a)** — it unblocks the whole point of the brief.
4. **The gallery (9.2)** — the brief's missing first screen.
5. **The clicking coworker (5b)**, once the above are stable.
6. **His run (5c)**.

Everything in § 4 runs alongside and none of it is mine to finish.
