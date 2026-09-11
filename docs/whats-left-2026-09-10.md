# What is left

2026-09-10, at his ask: *"What's left to be built, to be changed, to be fixed,
and to be reviewed?"*

**This is the single list.** It supersedes the remaining-work sections of
`docs/status-2026-09-10.md`, which was a day old and already wrong in both
directions. Anything not here is done.

**The count: 6 bugs, 8 of his own notes, 9 unbuilt features, 15 things waiting
on him, and 3 pieces of the endgame he described.**

---

## 1 · Broken now — six things

| | What | Where |
|---|---|---|
| 1 | **The pricing page's terms block is jammed against the screen edge.** His own bug, still there. | `app/src/landing/PricingPage.jsx:403` |
| 2 | **The Today guide walks you onto the Business page.** | `app/src/components/Walkthrough.jsx` |
| 3 | **"Show me around" stops after one step.** Probably the same cause as 2. | same file |
| 4 | **The English/Spanish buttons are badly placed** on a customer's booking page. | `app/src/book/LanguagePicker.jsx` |
| 5 | **The password screen never asks for your current password.** Anyone who walks up to an unlocked laptop can change it. | `app/src/screens/more/Password.jsx:47` |
| 6 | **There is no "page not found".** A mistyped address shows a sign-in form, which reads as being logged out. | roadmap item P |

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

## 6 · The order I would work in

1. **The six bugs.** They are visible, they are small, and one of them is a
   security hole.
2. **His eight notes**, heaviest first: how-you-get-paid, then the label sweep.
3. **The builder's rule set (5a)** — it unblocks the whole point of the brief.
4. **The gallery (9.2)** — the brief's missing first screen.
5. **The clicking coworker (5b)**, once the above are stable.
6. **His run (5c)**.

Everything in § 4 runs alongside and none of it is mine to finish.
