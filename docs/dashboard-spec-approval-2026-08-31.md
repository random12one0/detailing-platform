# The dashboard rebuild — the whole specification, for your yes

**Roadmap 2.11, step 6.** Steps 1 through 5 are finished and they are five
files. This is the page that stands in for reading them. **Nothing is built
and nothing will be until you say so.**

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
to 1,180 pixels wide, and five screens get a real second column. **Below 1024
pixels nothing changes at all** — the phone is untouched.

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

These are the places the specification **removes something** or **goes against
something you said**. Everything else is addition. If you disagree with any of
them, say which number.

1. **The week view is a NO.** You said yes *if it can be made convenient*. It
   cannot: a week view is a seven-column time grid, which at phone width is 51
   pixels a column — no name, no time — so it would be desk-only, which is the
   burden you told me to avoid. **What replaces it:** at a desk the *month*
   boxes get big enough to write "9:00 Tom O." in, so the month reads as five
   weeks at once, with nothing new to learn. *(Step 3 §7.)*
2. **The push-notification switch comes off the screen** until it works. It
   writes a setting and there is no browser code behind it at all — no
   permission prompt, nothing that could ever deliver a notification. It is one
   of your four broken things.
3. **The flat travel fee field on Booking rules is deleted.** It is still
   editable, still holds $25, and has not been charged since it was written.
   The real travel pricing that replaced it stays.
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
7. **Staff do not get a Business tab at all.** It would be two rows and the
   database refuses to let them save one of them. They already get four
   buttons rather than five.
8. **Monthly plans still has no screen.** It is one of the five you asked to
   bring back, and it is a real feature with a price, a term and a renewal —
   not a settings page. Designing it inside this rebuild would be inventing it
   in the margin. **It keeps its own roadmap item.**

---

## 3b. One gap I found writing this page, and it needs a yes or no

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
- **Nothing below the surface** — no database, no booking engine, no emails,
  no pricing. One exception, and one open question: the email colour fault
  above is a repair rather than a feature and it lands here; the FAQ's missing
  storage is §3b and it is yours to settle.
- **Not the five tabs.** Today · Calendar · Money · Clients · Business, in that
  order — you settled it and it is not reopened.
- **Not the phone.** Every screen under 1024 pixels is what ships today plus
  the fixes listed above.
- **Request-vs-reserve, accept, quotes and deposits are not in this.** They are
  engine work and they are roadmap 2.12 and later. The screens are designed
  with a slot ready for them so nothing gets bolted on afterwards.

---

## 5. What happens the moment you say yes

It gets built **one screen at a time**, each one finished and looked at before
the next starts. **No file has named an order yet, so this is my proposal and
you can change it:**

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
6. **Business and its settings screens**, including the colour repair and the
   new Reviews screen — thirteen settings screens if the FAQ is in (§3b),
   twelve if it waits.
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

> **His answer, 2026-08-31:**
>
> *(to be filled in when he answers — an answer that lives only in the chat
> dies at the next clear)*
