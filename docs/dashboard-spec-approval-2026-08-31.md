# The dashboard rebuild — the whole specification, for your yes

**Roadmap 2.11, step 6.** Steps 1 through 5 are finished and they are five
files. This is the page that stands in for reading them.

> **ANSWERED 2026-08-31 — APPROVED WITH AMENDMENTS. READ §6 FIRST.**
> Sections 2 to 5 below are the page as it was PUT to him. He reversed two
> items, corrected a third, lifted the no-schema rule and reopened the phone.
> **Every line he changed is struck or flagged in place**, but §6 is the
> authority where they disagree. **Nothing is built yet:** the phone pass at
> §6 comes first.

Your caveat on the last file — *"there's just so many words, and I think I'd
lose my mind reading that"* — is why this exists. Read this page. If a line
makes you want the detail, the file it came from is named beside it.

---

## 1. What you are approving

| Step | The file | What it settled |
|---|---|---|
| 1 | `dashboard-feature-inventory-2026-08-31.md` | **126 things** the dashboard has to hold. **You already approved this list on 2026-08-31.** |
| 2 | `dashboard-screen-research-2026-08-31.md` | **14 findings** from how the trade's own products build these screens, plus independent research. |
| 3 | `dashboard-desktop-spec-2026-08-31.md` | **The desktop layout**, which has never existed. |
| 4 | `dashboard-screen-designs-2026-08-31.md` | **All 18 screens**, every state — empty, one, many, loading, error, staff. |
| 5 | `dashboard-component-inventory-2026-08-31.md` | **Which pieces of code get written, rewritten and deleted.** 61 files become 72. |

Step 1 you have already said yes to. **The other four are what this yes
covers.**

---

## 2. What actually changes, in your words

**The desk stops being a phone.** Today's screen is 1,810 pixels tall on your
1920 monitor and 1,815 on a phone — five pixels apart across a screen five
times wider. The bar of five buttons moves to the left edge, the content goes
to 1,180 pixels wide, and five screens get a real second column. ~~**Below 1024
pixels nothing changes at all** — the phone is untouched.~~ **WITHDRAWN — this
sentence was misleading and he caught it (§6).** It meant only that no screen
grows a second column on a phone. **The phone is redesigned like everything
else.**

**A record opens beside the list instead of on top of it.** Right now clicking
a job covers the day you were reading. The research names that as the mistake.

**The job screen gets built properly for the first time.** Opening a job is 26
of the product's 126 features in one long scroll. It becomes an action bar over
six named sections, with **Call / Text / Navigate at the top** instead of four
blocks down — that is the screen you open standing at somebody's car.

**Today stops lying.** One thread instead of three. Three headings named for
the work — *Needs payment · Still to do · Done*. A paid job's dot goes green
like it already does on the calendar. **And pressing "Mark complete" stops
blanking the screen** — right now the whole day is replaced by a spinner and
redrawn.

**Things that work underneath finally get a door:** reviews customers leave
(your booking page already shows them and nothing can write one), your
Facebook / TikTok / YouTube links (the database has the columns and no screen
has the fields), and switching between two businesses on one login.
Built-with-no-screen goes from seven to three. **An FAQ page you write
yourself was the fourth — see §3b, it has a problem.**

**The colour fault gets fixed.** "Your colour" cannot change the colour in your
customers' email. Four of the twelve colours make the business name in that
email too faint to read, and picking "Sky" makes the invoice email's own title
invisible. One colour, written everywhere, with the same contrast floor as
every other surface.

**The two things you asked for on 2026-08-31 are designed:** the skippable,
resumable **setup form**, and the **guided walkthrough** built to your three
rules — no paragraphs, more steps rather than fewer, never two things in one
step. Plus the **accountant export** (jobs and expenses) on Money.

---

## 3. Eight things to look at before you say yes

*(ANSWERED — his verdict on each is the table in §6. Items 2, 3 and 7 he
reversed; 3 was wrong as written. Read them together.)*

These are the places the specification **removes something** or **goes against
something you said**. Everything else is addition. If you disagree with any of
them, say which number.

1. **The week view is a NO.** You said yes *if it can be made convenient*. It
   cannot: a week view is a seven-column time grid, which at phone width is 51
   pixels a column — no name, no time — so it would be desk-only, which is the
   burden you told me to avoid. **What replaces it:** at a desk the *month*
   boxes get big enough to write "9:00 Tom O." in, so the month reads as five
   weeks at once, with nothing new to learn. *(Step 3 §7.)*
2. ~~**The push-notification switch comes off the screen** until it works. It
   writes a setting and there is no browser code behind it at all — no
   permission prompt, nothing that could ever deliver a notification. It is one
   of your four broken things.~~ **REVERSED BY HIM — the switch stays and the
   missing browser half gets BUILT (§6).** The finding itself was correct:
   there is no service worker and nothing ever subscribes a device, so what
   alerts him today is the email switch above it.
3. ~~**The flat travel fee field on Booking rules is deleted.** It is still
   editable, still holds $25, and has not been charged since it was written.
   The real travel pricing that replaced it stays.~~
   **THIS WAS WRONG AND IS WITHDRAWN, 2026-08-31.** Checked in the code after
   he answered: `pricing.ts:135` returns your flat travel fee and
   `computeQuote` charges it. **It is live money, not a dead field.** What the
   original finding actually said is narrower — *when you have set up travel
   areas*, the flat fee no longer applies, and leaving a typeable box that does
   nothing beside them is the fault. **The change is that the box becomes a
   sentence once areas exist, and nothing is deleted.** Step 4's file
   over-stated it and this page inherited the overstatement.
4. **The second colour picker on Business info is deleted.** There are two
   colour columns in the database and that is an accident, not a choice — a
   detailer has one colour.
5. **The box at the top of Today that says "N finished jobs still need payment
   recorded" goes.** The new *Needs payment* heading says the same thing with a
   count, over the jobs it is talking about.
6. **The Business tab goes from 8 headings to 3**, and some rows move behind
   the gear in the header. The test for which is which: **a row stays on
   Business only if it changes what your customer meets.** Notifications,
   message templates, team and this-device change how the app behaves for you,
   so they go behind the gear.
7. ~~**Staff do not get a Business tab at all.** It would be two rows and the
   database refuses to let them save one of them. They already get four
   buttons rather than five.~~ **REVERSED AND MADE BIGGER (§6): he wants named
   roles with tickable permissions**, not a fixed owner/staff pair. That is a
   permissions model and a rewrite of the row-level security policies, so it is
   **its own roadmap item, 2.13** — not part of this rebuild.
8. **Monthly plans still has no screen.** It is one of the five you asked to
   bring back, and it is a real feature with a price, a term and a renewal —
   not a settings page. Designing it inside this rebuild would be inventing it
   in the margin. **It keeps its own roadmap item.**
   **CONFIRMED AND SPECIFIED BY HIM (§6): cadences** — monthly, biweekly,
   bimonthly, yearly — surfaced in the booking flow or listed on the website,
   the detailer choosing which. **And research first**, on whether the trade's
   booking systems carry plans at all. **Roadmap 2.14.**

---

## 3b. One gap I found writing this page, and it needs a yes or no

> **ANSWERED: neither (a) nor (b) exactly — he took the half of each that is
> cheapest.** *"you could definitely add stuff to the supabase… Just add a
> small bit of database now, but we could tackle FAQ later."* **The storage
> lands now; the screen waits.** And the premise under the question is gone —
> he lifted the no-schema rule entirely (§6).

**The FAQ screen you asked for has nowhere to save.** Checked in the database
today: reviews, your social links and switching businesses all already have a
place to live — that is why they are called *doors*. The FAQ has **nothing at
all**: no table, no column, nowhere. And this rebuild is meant not to touch the
database, which is one of the promises in §4 below. Steps 4 and 5 both designed
the screen and both repeated the no-database promise, and neither noticed they
were in each other's way.

It is a small hole, not a hard one, and there are two clean ways out:

- **(a) Build the FAQ in Phase 3 instead**, when the tenant websites — the
  pages that would actually *show* an FAQ — get built. Nothing else in this
  specification changes; the Business tab has eight rows instead of nine until
  then. **Nothing is lost, only later.**
- **(b) Add the small piece of database now** and build the screen in this
  item. It is an addition, not a change to anything that already works, so it
  is safe — but the detailer would be writing answers that **nothing displays
  yet**, because the page that shows them is Phase 3. That is the exact
  problem this whole rebuild is trying to shrink: things that work with no
  screen, now in reverse.

**My recommendation is (a).** You approved the FAQ as a capability, not as a
this-month thing, and writing answers into a page nobody can read yet is work
your detailers would do twice.

---

## 4. What is NOT changing

- **No colours, no fonts, no look.** That was your *"the look stays"*.
- ~~**Nothing below the surface** — no database, no booking engine, no emails,
  no pricing.~~ **WITHDRAWN BY HIM (§6): *"do as much with the back end as you
  want."*** The rule came from the roadmap's own wording and he did not know it
  was there. **Emails, pricing and the email colour repair are cleared to
  change now**, and the FAQ gets its storage.
- **Not the five tabs.** Today · Calendar · Money · Clients · Business, in that
  order — you settled it and it is not reopened. **He reopened it in principle
  and then closed it on his own condition (§6):** they were derived from the
  five questions a detailer's day contains, not inherited from the old
  dashboard, and the derivation is `dashboard-architecture-2026-08-31.md` §3a.
- ~~**Not the phone.** Every screen under 1024 pixels is what ships today plus
  the fixes listed above.~~ **WITHDRAWN — this is the line he objected to
  (§6).** What was true in it: no second column below 1024. What was false in
  it: *"what ships today"*. **The phone is designed from scratch too**, and
  that pass happens before any code.
- **Request-vs-reserve, accept, quotes and deposits are not in this.** They are
  engine work and they are roadmap 2.12 and later. The screens are designed
  with a slot ready for them so nothing gets bolted on afterwards.

---

## 5. What happens the moment you say yes

It gets built **one screen at a time**, each one finished and looked at before
the next starts. **No file has named an order yet, so this is my proposal and
you can change it:**

0. **The phone pass** — every screen's phone form re-decided from scratch,
   because he is right that *"what ships today"* is not a design decision.
   **This is the next session and it is the only thing before code.**
1. **The shell and Today, together.** The shell is the part every screen shares
   — the button bar turning vertical at a desk, the wider column, and the one
   piece of code that decides whether a record opens beside a list or over it.
   It has to land with the first screen rather than before it, or there is
   nothing to look at. Today goes with it because it is the screen you open
   forty times a day and it carries four of the fixes.
2. **The job record** — the most work in the specification.
3. **Calendar**, where the desk gets the written-out month.
4. **Money**, including the accountant export.
5. **Clients.**
6. **Business and its settings screens**, including the colour repair, the new
   Reviews screen and the rebuilt push switch. **Twelve settings screens** —
   the FAQ's storage lands but its screen waits (§3b).
7. **First run** — the setup form and the walkthrough. Last on purpose: a tour
   of screens that are still changing would be rewritten six times.

Each screen is photographed at 1920, 1440x900, 768x1024 and 392x844, the
browser console is read at every size, and the automatic layout check runs at
five widths. Three design documents that outrank these designs get corrected in
the same change rather than left quietly disagreeing with them, and the layout
check's desktop measurement — which prints today and does not yet count —
starts counting.

**How long:** this is the largest item on the roadmap. Expect several sessions,
one screen or one group of screens each, with something visible to look at at
the end of every one.

---

## 6. Your answer

Say **yes** and it starts. Say **yes except number N** and that part gets
redesigned first. Say **no to the whole thing** and it stays a specification.

**And §3b needs an (a) or a (b)** — it is the one thing here I cannot settle
for you, because it is about when, not about how.

### HIS ANSWER, 2026-08-31 — APPROVED WITH AMENDMENTS

**He approved it and amended it in the same breath.** Two of the eight he
reversed, one he corrected me on, one he expanded into a bigger feature, and he
lifted a standing rule that has shaped four steps of this specification.

#### The eight, as he answered them

| # | His answer | Status |
|---|---|---|
| 1 | Week view | **Confirmed no.** *"let's just not do a week deal and just keep the month that we've been doing."* |
| 2 | Push switch | **REVERSED — keep it.** *"it works since it's been working for me."* See the correction below: **it does not, and what alerts him today is email.** |
| 3 | Travel fee | **REVERSED — and the item was wrong anyway.** *"yes, we should have a travel fee."* He then described **mile radii measured from the address**, which is new. |
| 4 | One colour picker | **Confirmed.** *"this should only be one color picker for the business."* |
| 5 | Today's payment box | **Confirmed.** *"Yep."* |
| 6 | Business 8 headings → 3 | **Not answered directly**, and it survives — see the tab bar below. |
| 7 | Staff | **REVERSED AND EXPANDED into custom permissions.** Not fixed owner/staff: invite someone, give the role **a name you choose**, and **tick which permissions they get.** |
| 8 | Monthly plans | **He wants them, with cadences** — monthly, biweekly, bimonthly, yearly — shown in the booking area or listed on the website, the detailer choosing which. **And he asked for research first:** do the trade's booking systems carry plans at all? |

#### The rule he lifted, which is the biggest thing in his answer

> *"I don't know why there was a rule that did not edit the back end. You could
> 100% edit the back end however much you want… We got tables if we need to.
> Yeah. Do as much with the back end as you want."*

**The no-schema constraint on roadmap 2.11 is withdrawn by the owner.** It came
from the roadmap's own wording — *"It does NOT mean touching the schema, the
engine or the booking flow"* — and four steps of specification were written
inside it. **Emails, pricing and the email colour repair are explicitly cleared
to change now.** The FAQ is the exception he scoped himself: **add the storage
now, build the screen later.**

#### What he does NOT want inherited, which is the opposite of what that rule protected

> *"right now, the dashboard's kinda getting based off of the look of our front
> end. I don't want it to be getting based off of the look of our current
> dashboard… just forget that the old dashboard even existed, but it should be
> based off of the design of our current landing page."*

**The floor is the landing page, not the old dashboard.** That is already the
law — `docs/design-system.md` is derived from
`docs/design-directions/5-the-thread.html`, the landing page he approved, and
`DESIGN.md` says the page wins where the two disagree. **Nothing changes; it is
confirmed.** What he is refusing is *structural* inheritance from the old
dashboard, and that is the next two entries.

#### The tab bar is reopened in principle and closed on evidence

> *"we shouldn't even be worrying about, like, oh, you know, you can't do it how
> the old admin dashboard does it… we might have five tabs. We might have six.
> We might have two."* — then, in the same answer: *"it looks like we've already
> decided the tabs that we're gonna have. And as long as that's the best order
> and amount, then that's fine."*

**His condition is the test, and the five tabs pass it.** They were not kept
because the old dashboard had them.
`dashboard-architecture-2026-08-31.md` §3a derives them from **the five
questions a detailer's day contains**, before looking at our own tabs at all —
then compares against six competitor products. Four of the five landed where the
product already was; the fifth (More → Business) changed *because* of the
derivation. §3b states why not four (no two of the questions merge honestly) and
why not six (a phone tab bar holds five, and law 1 would owe a sixth skeleton).
**Kept, and the reasoning is shown rather than asserted.**

#### The phone is reopened, and part of that is this page's wording

> *"Don't get what 'not the phone' means. the phone is changing, that the whole
> admin dashboard is changing both with desktop and phone."*

**§4's line "Not the phone" was misleading and is withdrawn.** What step 3 meant
by it is narrow and true: **no screen grows a second column below 1024px**, so
the desktop work cannot damage the phone. What it reads as — and what he read it
as — is *the phone keeps the old dashboard*, which was never the plan: the job
record, Today's rail and headings, Business, Clients' columns and every empty
state change **on the phone first.**

**But his instruction goes further than step 4 went, and that is a real gap.**
Step 4 describes several phone forms as *"what ships today"*. Under *forget the
old dashboard existed*, "unchanged" is not a design decision — it is the absence
of one. **Every screen's phone form gets a from-scratch pass before any of it is
built.** That is the next session's work and it is the only thing standing
between here and code.

#### Request-vs-reserve

> *"it should be built into the design of the admin dashboard, but the actual
> technologies behind it doesn't need to be designed now."*

**Exactly what step 4 did** — the day screen carries the accept state, the slot
is designed and built empty, and roadmap 2.12 fills it. Confirmed, no change.

#### The sizes he wants it to work at

> *"base it off of, like, a normal iPhone dimension, Samsung dimension, and then
> the desktop, like, laptop… and then also if you shrink a page or you'll not
> full screen it or goes to landscape. It should be able to modify and move
> around and not losing the information."*

Measured against what is already checked: **a current iPhone is 393×852 and a
current Samsung is 360×800** — both sit inside the sweep's existing 392 / 360 /
320, and the laptop is 1440×900. **What is NOT checked is landscape**, and it is
the one genuinely new requirement in that paragraph: a phone on its side is
about **844×390**, which is 390px of HEIGHT — shorter than anything this product
has ever been measured at. `sweep-widths.mjs` gains it.

---

### The two things he believes that the code does not support

Both were checked rather than argued with, and both change what gets built.

**1. The phone push notifications do not exist, and what alerts him is email.**
He said *"it works since it's been working for me."* The server half is complete
and good — VAPID keys, `web-push`, `owner_push_subscriptions`, and
`sendOwnerPush()` called from `create-booking`. **The browser half is absent
entirely:** there is no service worker file anywhere in `app/`, no
`PushManager.subscribe`, no permission prompt, and nothing ever calls
`owner-push-subscribe`. So the subscriptions table is empty and `sendOwnerPush`
returns `sent: 0` every time. **What actually reaches him today is the switch
directly above it in the same group — *"A new booking comes in"*, which is an
email.** His own live business also runs on a different codebase entirely
(`carwashweb`), which is the likelier source of anything he is seeing.
**Decided rather than re-asked, because his instruction was "keep it":** the
switch stays and **the missing browser half gets built**, so the thing he
believes he has becomes true. **One constraint he needs to know: on an iPhone,
web push only works once the page has been added to the Home Screen.** That is
Apple's rule, not ours.

**2. He already has a travel fee, and multiple travel areas with their own
fees.** He said *"yes, we should have a travel fee"*, and item 3 of this page had
just told him it was being deleted. **It was not dead:** `pricing.ts:135` returns
the flat fee and `computeQuote` charges it — that is what roadmap 2.8c fixed —
and **travel areas already exist**, `[{key, name, fee}]`, each with its own
price, which the customer picks on the booking page. **What he described that
does NOT exist is the automatic part:** mile radii measured from the customer's
address. The migration says why in its own comment — *"NOT geocoded distance: we
have no way to measure one"*. **Measuring one needs a map service**, which means
an account, a per-lookup cost, and every customer address being sent to a third
party. **That is its own roadmap item and its own decision**, written up as one
rather than smuggled into the rebuild.

---

### What his answer costs, honestly

**Three of his asks are not dashboard drawing at all**, and each becomes its own
roadmap item rather than swelling 2.11 until it never lands:

- **Custom roles and permissions.** Today `business_users.role` is a two-value
  check constraint, `('owner','staff')`, and **the whole database enforces it**
  through `is_business_owner()` in row-level security policies across the money,
  settings and marketing tables. Named roles with tickable permissions means a
  permissions model, every one of those policies rewritten, and the screen. It is
  a good idea and it is not a week.
- **Monthly plans with cadences.** `monthly_plans` exists but is **only a
  discount** — name, description, percentage or amount, active. No cadence, no
  sign-up, no recurring bookings. His version needs all three, plus the research
  he asked for.
- **Travel by measured distance**, above.

**And one is 2.11's own work, now that the schema rule is lifted:** the email
colour repair, already agreed and now unblocked to do properly.

**The one thing between here and code is the phone pass.** Everything else on
this page stands as written or is amended above.

