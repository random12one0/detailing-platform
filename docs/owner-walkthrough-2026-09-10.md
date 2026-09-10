# His walkthrough, 2026-09-10 — every screen, every note

**This replaces the review-status guesswork in `docs/status-2026-09-10.md` § 3.**
That file said he had not seen the five main tabs since 30 August and had never
walked the website brief. **He had done both.** His words: *"Do you not
remember the long review that I did? I went over all of the main tabs… the
customer booking page, I went through every single step… the website brief,
I've literally walked the entire thing."*

**The lesson, and it is about how this repo records things:** review status was
inferred from which documents happened to contain his quotes. A screen he
looked at and approved without complaint leaves no written trace, so **silence
was being read as "never seen"**. Approvals have to be logged as deliberately
as complaints. That is what this file is for.

**Nothing below is fixed yet unless it says BUILT.** His instruction: *"not
just fix it by yourself, but actually go over each thing with me so we can fix
that one by one, getting each page correct."*

---

## 1 · Signed off — no changes wanted

- **Landing page**
- **Terms**, **Privacy** — *"I think those are fine."*
- **The customer's booking page**, every step
- **The five main dashboard tabs** — Today, Calendar, Money, Clients, Business
- **The website brief**, walked end to end
- **Business info**
- **Your color** — the screen itself; two label changes below
- **Photo gallery**, **Reviews**, **Campaign links**, **Maintenance deadlines**
- **Hours & days off**, **Booking rules**, **Message templates**, **Team**
- **This device** — one thing to confirm, § 4
- **The back office** — *"I'm gonna leave it be how it is"* for now

---

## 2 · Fix these — his words, and what they mean

### 2a · Wording and labels

| Where | Now | Should be |
|---|---|---|
| First-run setup, step 2 | "Anything you can add to a job?" | **"Add-ons"** |
| Settings list, and the screen | "Common questions" | **"FAQ"** — *"it's more straightforward of what it's actually for"* |
| Your color | "Any other colour" | **"Pick a custom color"** |
| Website brief, the end screen | "Got it." | Something that means something |

**And the general rule behind all four, which is the important part:** *"every
labelling should be clear, not doing this kind of weird AI naming, but actual
straightforward naming. Make sure we take an audit and make sure everything is
straightforward and not confusing."* **That is a sweep of every label in the
product, not four edits.**

### 2b · Real gaps

- **Hours in first-run setup only takes ONE open and close for all days.**
  *"There should be an open and close time for every single day. Is that not
  obvious?"* It is. The full Hours screen does days properly; the setup step
  does not.
- **Your color: the custom picker is below the example.** It should sit with
  the swatches, not underneath.
- **Your password takes no current password.** *"There should be a place for
  you to input your existing password just to check… obviously we need that."*
- **Notifications, "your own words":** the line about adding a line to the
  email does not explain what it does or what to type.
- **Services in first-run setup cannot add categories**, only bare services.

### 2c · The website brief's end screen is broken

His words: *"this page looks bugged."* Three separate faults:

1. **"Got it."** as a heading says nothing.
2. **The close X sits next to the title** instead of at the edge.
3. **The dashboard rail is visible behind it — Today, Calendar, Money, Clients,
   Business — and clicking them does nothing.** Pressing X returns to it.
   *"It should just open its own page. It shouldn't be kinda weirdly glitchy."*

### 2d · How you get paid — the layout is wrong

He had not seen this screen before. *"There's a button that says do you take
cash on the day. There should be a little toggle for everything — a toggle for
cash, for Venmo, for Cash App, PayPal, Zelle, every single type of payment
there is. They click if they take it or not. And if they do, they fill in the
details — their name or a link or whatever."* **Plus an "add your own" with a
name and a value.**

### 2e · The examples index is too plain

*"It's just a link to all the websites… a very static page. We definitely need
to make this example website site a lot prettier, like a lot prettier."*

**And it should be advertised on the landing page** — *"maybe a link at the top
that's like, look at some example websites."*

---

## 3 · The big ones

### 3a · First-run setup should fill in the whole dashboard

**Said three times, so it is the headline.** *"Everything in the admin
dashboard should be completely filled out just from that initial first-run
setup."* Reviews, FAQ, photos, socials — not the seven steps it has now.

**And he told us how to build it:** *"you could just completely reuse basically
every single GUI that's already in the admin dashboard, but have it as a form
layout where you settle a stuff, then press continue, going to every single
page."* The settings screens already exist; setup becomes a walk through them.

**With an escape at every step** — *"obviously there should be options if they
don't have anything, like you could click no, I don't have this."*

### 3b · Then the brief, auto-filled from setup

*"They do the first-run setup, and then they should do the website brief after,
and basically all of the information that they set up there should be
auto-filled inside of the website brief. And obviously they could change stuff,
because maybe they don't want to show some things."*

**This is the "It is on my website" button's proper sibling** and it makes the
brief much shorter for anybody who has just done setup.

### 3c · A way for a detailer to tell us something is missing

*"At the end I want a note that gets saved and sent to me — hey, there's no
place for me to set this information. That way I can know things I'm missing
and need to add. We should definitely have a way detailers can quickly send
messages or report problems."*

### 3d · An instruction manual for the website-building agent

**His clearest statement of the risk:** *"all of the prices and everything
listed in the website can't just be straight text. They have to be connected to
the admin dashboard… I don't want it to accidentally build an FAQ and not link
it to the back end, where when they turn it off or change things, it doesn't
actually update on the website."*

**Most of this already exists** — `docs/tenant-site-contract.md` § 2 is the
twelve things a site owes, each written as *what silently stops working if the
site omits it*. What does not exist is the **checklist form** an agent works
through and ticks. That is the deliverable.

### 3e · An AI helper for detailers — he asked whether it is feasible

Answered in § 5.

---

## 4 · Questions he asked, answered

### "Is the FAQ show-on-your-website button actually hooked up?"

**Yes, half.** The switch writes a real setting to the database
(`Faq.jsx:131`), so nothing is faked and turning it off keeps the words. **What
does not exist is a website reading it** — the screen says so itself: *"They go
on your website — that part is still being built."* So the button is real and
its consumer is not. That is § 3d's whole point.

### "Is the Connect Stripe button hooked up? What does it do?"

**Yes, and it is real.** It calls `connect-account`, which hands the detailer
to Stripe's own consent screen; they approve; Stripe returns them to
`/settings/payments/connected` and the account is linked. From then on, card
money lands in **their** bank rather than ours.

**What has never happened is one real card payment through it**, and a webhook
key is unset — Stripe switches an endpoint off after about three days of
failures. Both are blocked on publishing, which is blocked until the 13th.

### "Your web address — don't they have to enter something into their DNS?"

**Yes, and you are right that the screen does not tell them how.** It has one
line — *"You point the address at us with your domain company (a CNAME
record)"* — and no record name, no value, and no idea where to type it.

**How it actually works, in plain terms.** A domain has a settings page at
whoever they bought it from — GoDaddy, Namecheap, Squarespace. One of those
settings is a **CNAME**, which means *"when somebody asks for
`book.theirshop.com`, send them to this other address instead."* They add one
line: name `book`, value our host. Then our end has to accept that name, which
is the step only we can do. Then the page's **Check it** button fetches a
marker file from the address to prove it is really pointing at us.

**You never touch their domain and never need their login.** That is the right
division and it is why the instructions matter: they are doing the one step,
and right now we do not tell them what to type.

**What is missing:** the exact record to add, per-registrar screenshots or at
least per-registrar wording, and the value to paste. **That is a real piece of
work and § 2 of this file is where it goes.**

---

## 5 · The AI helper — feasible, and here is the honest cost

*"What do you think about maybe adding a little AI bot? Something where they
ask questions and it helps them through the website. Like, hey, how do I
implement this, and it knows."*

**It is straightforward to build and it is not free.** A question and an answer
costs a fraction of a cent — call it **half a cent** for a decent answer with
enough of the product's documentation attached for it to be right. A detailer
asking ten questions in their first week costs about **five cents**. A hundred
detailers doing that is **five dollars a month.**

**The real cost is not the money, it is being wrong.** An assistant that
invents a setting that does not exist creates a support call rather than
preventing one. The way to stop that is to feed it this repo's own
documentation and have it answer only from that, saying *"I don't know, ask
Andrew"* otherwise — which is also what makes § 3c's report-a-problem button
the right partner for it.

**Recommendation: worth doing, and not next.** It is most valuable once there
are detailers asking questions. Until then it would be answering nobody.

---

## 6 · The order to work through this

His instruction was one at a time, so this is a queue rather than a plan:

1. The label sweep (§ 2a) — small, and it is a rule as much as four edits.
2. The website brief's end screen (§ 2c) — it is visibly broken.
3. How you get paid (§ 2d) — a real layout rebuild.
4. Hours per day in setup, the color picker, the password check,
   the notifications explanation (§ 2b).
5. The examples index, and a link to it from the landing page (§ 2e).
6. First-run setup rebuilt from the settings screens (§ 3a).
7. The brief auto-filled from setup (§ 3b).
8. The DNS instructions (§ 4).
9. Report-a-problem (§ 3c).
10. The builder's manual (§ 3d).
11. The AI helper (§ 5), last.
