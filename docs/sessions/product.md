# Session B — the product: every screen, every form, every feature

**You own `app/src/**` and you are the only session that may write there.** You
are also the only session that runs the dev server. Do not touch
`supabase/`, `tests/`, `scripts/` or `docs/tenant-sites/` —
`docs/sessions/README.md` is the ownership table, and
`node scripts/lane-check.mjs B` is the command that checks you. **Run it before
every `git add`.**

**AND IF THE PROMPT NAMES WORK OUTSIDE `app/src`, SAY SO AND STOP** — not a
smaller version of it, not just the part in your folder. A session opened as A
built a whole roadmap item across your lane and C's on 2026-09-10 by reasoning
past exactly this line; `docs/sessions/README.md` has the account. **The owner
can override it and often will — if he does, say so in the commit message.**

**Why this session exists, in his words, 2026-09-08:** *"I still need to
analyse and go over all of the pages that we've recently created and make
changes… cleaning up basically all the GUI to get it to how I want it to
function, including all the forms, every single page in the entire website,
giving my thoughts. And all the features."*

**So this session's job is not to invent. It is to WALK the product, screen by
screen, put each one in front of him, and change what he says to change.**

---

## 1. Set up once, at the start

```bash
node scripts/seed-demo.mjs
npm run dev --prefix app
```

Then, in a second shell, the pass that everything else depends on:

```bash
node scripts/check-deployed.mjs
```

**If that reports anything stale, STOP and say so in chat.** Session C owns the
deploys. Every screen you are about to look at reads from those functions, and
a stale one means you are testing a screen against code that is not running.

---

## 2. The rule that makes this session worth anything

**He cannot see your screen and he is reading this on a phone.**

> *"Open localhost:5173"*, *"have a look at the billing screen"* and *"check
> the email preview"* are dead ends. **A session that verifies something and
> then describes it in prose has done half the job.**

**`SendUserFile` reaches his phone. A `computer{action:"screenshot"}` does
not** — that goes to the model.

| To show him | Do this |
|---|---|
| A dashboard screen | `OUT=shots-<item> node scripts/shoot-dashboard.mjs --tab <tab>` or `--gear "<Row>"` / `--more "<Row>"` |
| The booking steps | `node scripts/sweep-booking-steps.mjs --shots=shots-<item>` |
| A public page | `node scripts/shoot-dashboard.mjs --url pricing` (drop the leading slash — Git Bash rewrites it) |

**392 first, always.** A full-page stitched PNG is rejected at 400 — the limit
is the image's HEIGHT. Send viewport-sized crops down the page.

---

## 3. The walk — every surface, in this order

Three or four screens per message, at **392 and 1440**, with the console read
at each. Ask him for his thoughts on that batch, act on them, then move on.
**Do not walk the whole product and then ask.**

### Public — what a customer or a prospect meets
- `/` the landing page · `/pricing` · `/terms` · `/privacy`
- `/book/:slug` — **all seven steps**, in both booking modes (`demo-detail` is
  request mode, `demo-riverside` is reserve), and the confirmed page
- `/book/:slug/plans` · `/plan/:memberId` · `/booking/:id` the receipt ·
  `/unsubscribe/:customerId`
- The Spanish path — the picker, and every step behind it

### The dashboard — five tabs
- Today · Calendar (month, day panel, history) · Money (three period kinds,
  the unpaid job, the expense form) · Clients (six states) · Business
- The job record, in both its states. The request queue, the request record,
  the quote sheet.

### Settings — nineteen screens through two doors
- **Thirteen on Business:** Catalog · Hours · Booking rules · Business info ·
  Appearance · Promos · Message templates · Notifications · Gallery · Reviews ·
  Monthly plans · How you get paid · Common questions · Your web address ·
  Maintenance deadlines · FAQ
- **Six behind the header gear:** Preferences · Team · Password ·
  Switch business · Your subscription · Show me around

### First run — the two things a new detailer meets
- The seven-step setup form · the walkthrough · the four tab guides

### The back office at `/admin`
- Sign in as `demo@demo.com` / `demoadmin123`. **Changed 2026-09-09 at his
  own ask** — he had forgotten it. He asked for `demo123`; the Supabase project
  refuses anything under ten characters, so that was never available.
  **Do not change it again without him asking** — a session that "improves" it
  locks him out of his own back office.

**Nineteen settings screens and fourteen first-run screens are why this is a
whole session and not an afternoon.**

---

## 3a. THE WALK ALREADY HAPPENED — `docs/product-audit-2026-09-09.md`

**He did the whole pass himself on 2026-09-09, in one long message, off
`localhost:5173/map.html`.** Twenty-odd notes covering every public page, all
seven booking steps, both booking modes, the Spanish path, the plans, the
receipt, the first-run setup, the guides and the back office.

**THAT FILE IS THE QUEUE. Read it before doing anything else in this session.**
It is sorted into bugs, a copy pass, design work, features, and open questions,
with his own words kept verbatim under each — because a paraphrase of *"it
feels plain"* is worth nothing and the exact sentence is worth a lot.

**HIS INSTRUCTION WITH IT, AND IT IS THE ONE THING NOT TO GET WRONG:** *"Don't
try to fix everything at once because it's just not gonna go well. We're gonna
start fixing one screen at a time."* Take ONE item, fix it, show him, move on.

**The map that made it possible is `app/public/map.html`** — every page in the
product as a link, with real IDs, and a box that repoints them all at any host.
It is not linked from anywhere and the back-office password is deliberately not
on it.

---

## 3b. THE KIND OF NOTE HE GIVES, AND HOW TO TAKE IT

**His own examples, 2026-09-08:** *"the step-by-step stuff, I feel like it's
still lacking a little bit"* and *"make the highlight around the mouse slightly
smaller."*

**Those are two completely different notes and confusing them wastes a day.**

| | **A trim** | **A feeling** |
|---|---|---|
| Sounds like | *"slightly smaller"*, *"a bit tighter"*, *"move that up"* | *"lacking"*, *"doesn't feel right"*, *"kind of boring"* |
| What to do | **Just do it.** One value, one file, show him the before and after. Do not ask a clarifying question about a 4px change. | **Do NOT start editing.** Ask what specifically — the pace? the amount on one screen? how it moves between steps? Get one concrete thing, change that one thing, show him. |
| The failure | Turning it into a discussion | Guessing, rebuilding the whole thing, and getting a second *"still lacking"* |

**A "feeling" note is a symptom and he is not obliged to diagnose it — that is
your job.** Show him two versions rather than asking him to describe what he
wants; he picks faster than he specifies, and every one of his most useful
notes in this repo came from reacting to something rather than briefing it.

**Batch the trims, act on the feelings one at a time.** Ten small fixes can ship
in one pass and one screenshot. A "lacking" note gets its own loop.

### The one standing complaint to expect

**The booking flow's seven steps.** He has now said twice that they feel thin.
Before touching them, read the numbers `sweep-booking-steps.mjs` prints — every
step has a measured *spare room* figure and some are down to 16px on a phone.
**That budget is the detailer's, not ours**, and his own rule is that a customer
must never scroll inside a step. So *"make it feel like more"* cannot mean
*"add height"*. It means motion between steps, the sense of progress, and what
each step does with the room it already has.

---

## 4. What is actually unfinished on your side

Everything below is a real, unbuilt piece of `app/src`. Do these between
batches of his feedback, not instead of them.

**THREE OF THE FIVE BELOW WERE ALREADY BUILT — corrected 2026-09-09 by
reading the code, after the owner said *"I'm pretty sure number two and number
four are already built."* He was right, and a third was too.** Rows 2, 3 and 4
are DONE: the free SMS path (`BookingDetail.jsx:188`, prefilled `sms:` body,
iOS separator quirk handled), the review ask (`followupEmail`, sent by
`send-invoice`), and the map link (`mapsUrlFor`, the *Navigate* button, with an
Apple/Google preference). The full working is in
`docs/detailer-dashboard-audit-2026-09-06.md` § CORRECTION.
**Only rows 1 and 5 are real.** Do not re-raise 2, 3 or 4 with him.

| | What | Where it is written |
|---|---|---|
| **1** | **Stripe Connect stage 3 — the TWO SCREENS.** The server half is built, deployed and probed. What is missing is the detailer's *connect your account* screen and the customer's *pay by card* control. | `OUTSTANDING.md` § 3.3 · roadmap 2.20 |
| **2** | **The free SMS path** — a button that opens the detailer's own messaging app with the text already written. No provider, no cost, no carrier registration. Costed and recommended, never built. | `detailer-dashboard-audit-2026-09-06.md` § 3.3 |
| **3** | **The review ask** — a message the day a job is marked complete. The event already fires. | same, § 3.2 |
| **4** | **The next job's address as a map link.** | same, § 3.4 |
| **5** | **Roadmap 9.2 — the gallery**, now unblocked by his 21 links. A `site_examples` table, back-office management, customer browse-and-favourite. **The example sites themselves must NOT go in this public repo.** | roadmap 9.1/9.2 |

---

## 5. Before you finish, every time

```bash
node tests/composition.test.mjs
node tests/design-contrast.test.mjs
node tests/landing-pricing.test.mjs
node tests/route-contract.test.mjs
node scripts/sweep-widths.mjs            # then --lite
node scripts/sweep-booking-steps.mjs
node scripts/e2e-booking.mjs
```

**Start the long one, write PROSE while it runs, then read the result. Never
edit `app/src` while a browser script is open** — Vite reloads the page and the
run finishes green having measured a screen that navigated away. `source-guard`
names the file afterwards; that is the only reason anybody finds out.

**Two things the sweeps cannot see, and both have shipped defects:**

1. **Text painted on top of a control.** Every check that script owns asks
   about an EDGE, and overlapping text is inside every edge it should be
   inside. It called the same defect `clean` three times in one night. **Only
   looking finds it.**
2. **A bottom-edge failure anywhere except the booking page.**

`docs/verification.md` has the whole battery and every trap in it.

---

## THE COPY RULES HE HAS NOW STATED TWICE IN ONE DAY — 2026-09-11

**Both came out of him reading a sentence aloud and disliking the SOUND of
it, and both bind every screen this session touches.**

### 1 · A TITLE IS NEVER A SENTENCE

*"where customers come from… it just feels like an AI title… no title should
be a sentence. Like 'how you get paid', that's a sentence. Figure out a way to
explain it without being a sentence."*

A row in a settings list, a section heading, a block label — all of them are
NOUN PHRASES. **Tracking links**, not *Where customers come from*.
**Location**, not *Where you are going*. **Services**, not *What they are
having done*. If the label needs a verb to make sense, the verb belongs in the
sentence underneath, not in the label.

**HE NAMED "How you get paid" HIMSELF AND IT IS STILL THERE.** That is review
item 16, the product-wide language pass, which stays unassigned until the
per-screen work is done — a sweep landing while five screens are being
rewritten conflicts with every one of them. **Do not sweep it early; do not
let it be forgotten either.**

### 2 · PROSE THAT READS LIKE AN INSTRUCTION, NOT LIKE WRITING

**THIS ONE COST TWO ATTEMPTS AND THE SECOND REJECTION IS THE INSTRUCTIVE
ONE.** The Monthly plans blurb was *"What you offer on a rhythm. You agree the
price and the dates with the customer yourself — this remembers them and tells
you who is owed a visit."* He read it aloud: *"that sentence is so obviously
AI."*

It was replaced with *"We never charge anyone — you take the money your own
way. This keeps count of who is owed a visit."* **He rejected that too, for
the same reason**: *"it sounds like AI… just to spin it in a way that doesn't
sound like a poem or like it's trying to be creative in some way. Just sound
like it's trying to be as straightforward and informative as possible. Anyone
reading that could instantly understand what this is for."*

**SO THE FAULT WAS NEVER THE CONTENT. IT WAS THE VOICE.** The second draft
carried a different fact and the same devices, which is why it failed
identically. A session that reads only the first rejection will do what this
one did: rewrite one flourish into another flourish and believe it has
finished.

**What both drafts did that he is objecting to, named so it can be checked:**

- an **em dash** holding two clauses in tension
- a **rhetorical opener** — *"What you offer on a rhythm"*, *"We never charge
  anyone"* — a phrase whose job is to sound good before it informs
- **parallel structure** and balanced clauses
- any sentence whose **shape** is doing work the facts should do

**What to write instead:** short declarative sentences. One fact each. Full
stops rather than dashes. Start with the verb or the subject, never with a
flourish. It should read like the instruction on a form.

The replacement that stands: *"Set up the plans you sell. This page tracks who
is on each one and how many visits they still have coming. You collect payment
yourself."*

### 3 · AND RULE 2 DOES NOT REPEAL THE OLDER RULE ABOVE IT

*Copy that explains what the label already said* is still banned (CLAUDE.md,
his rule of 2026-09-01). Plain is not the same as more. The Members blurb on
Monthly plans was deleted outright rather than rewritten, because it was the
heading plus a restatement of the chip three lines below it. **Ask the two
questions in order: does this sentence add a fact the control does not carry,
and if it does, is it written like an instruction?**
