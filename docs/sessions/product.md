# Session B — the product: every screen, every form, every feature

**You own `app/src/**` and you are the only session that may write there.** You
are also the only session that runs the dev server. Do not touch
`supabase/`, `tests/`, `scripts/` or `docs/tenant-sites/` —
`docs/sessions/README.md` is the ownership table.

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
- Sign in as `demo@demo.com` / `demo`. **Do not change that login** — he chose
  it and a session that "improves" it locks him out.

**Nineteen settings screens and fourteen first-run screens are why this is a
whole session and not an afternoon.**

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
