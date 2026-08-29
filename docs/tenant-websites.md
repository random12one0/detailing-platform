# Tenant websites — the goal, in the owner's words

**Written 2026-08-29, from the owner describing it in a session that was about
to be cleared. He asked explicitly that it be recorded so it would not be lost.
Nothing here is my idea unless it says so.**

This file is the destination. `docs/roadmap.md` Phase 3 is the route, and
item 3.4 there had an OPEN OWNER DECISION that this conversation answers.

---

## 1. The goal, quoted

> "I wanna make custom websites for each detailer."

> "Earlier we kind of thought, like, over-scoped, some cookie-cutter website.
> No. For every single person, I wanna make a custom website for them."

And how he wants to do the work:

> "My dream goal is to have, like, I could just start a new session on Claude
> Code or ChatGPT or something, connect it to my repo, and then say, like, hey,
> read this file or this folder, and it has basically all the instructions on
> how to make the website and how to connect it with the admin dashboard to
> make sure all the features are included. And then, obviously, be customizable
> to whatever I say."

> "Maybe the customer doesn't want this one feature, or the customer wants a
> new feature or something like that, or the customer wants a different look."

On where the default look comes from:

> "The default look is, like, you know how we've this planned-out website that
> we've made for our detailing platform and all the kind of research we've done
> behind it. I want that same research to be used in the website making for the
> detailers. That way we have something to build off of. But obviously it's
> gonna change with what the customers want."

And a future intake step:

> "Maybe in the future we have, like, a form that the detailers fill out that
> kinda answers questions about the website... that way it's easier for the
> detailer, like, oh, I don't really know. We give them a form that has lots of
> stuff so they could kind of choose and see examples."

---

## 2. What this settles

`docs/roadmap.md` 3.4 asked a question it could not answer itself: does the
build kit produce **a theme plus settings for one shared system**, or **a
bespoke site per client**? The roadmap's own recommendation was the shared
system, with bespoke as a priced exception.

**The owner has now answered: bespoke per client is the intent.** "For every
single person, I wanna make a custom website for them." That recommendation is
superseded and 3.4's open decision is closed.

---

## 3. The one architectural rule that makes it affordable — MY judgment, not his

The roadmap's warning against bespoke was real and it has not gone away: ten
clients could mean ten codebases to host, update and fix, alone, forever, and
an improvement to one reaches none of the others.

**What removes most of that risk is a single rule: fork the presentation,
never the engine.**

- The **engine stays central and shared** — the booking logic, the slot maths,
  the database, the edge functions, the dashboard, email, reminders. Every
  tenant site talks to the same one. A bug fixed there is fixed everywhere, and
  no client site ever contains business logic.
- The **presentation is where a site is allowed to be bespoke** — layout,
  sections, wording, imagery, palette, motion. This is the part a client
  actually perceives as "custom", and it is the cheap part to diverge.

So the build kit's real deliverable is **a documented contract**: here is how a
site asks the platform for this tenant's services, prices, hours, gallery and
availability; here is how it hands a booking back. Anything that honours that
contract can look like anything.

If that rule is kept, "custom for every client" costs a per-client design pass
and nothing else. If it is broken — if one client's site grows its own booking
logic — the maintenance ceiling the roadmap warned about arrives immediately.

**This is a recommendation, not a decision. The owner has not seen it.**

---

## 4. What the kit has to contain, from his description

A folder in this repo that a fresh coding agent can be pointed at, containing:

1. **How to build the site** — the design system (roadmap 1.5, not written
   yet), the anti-slop floor (`docs/design-knowledge.md` §1 and the
   never-defaults in `CLAUDE.md`), and the reference research with the reasons
   behind it (`docs/references/ANALYSIS.md`, `TASTE-NOTES.md`).
2. **The worked example** — `docs/design-directions/5-the-thread.html` and,
   after Phase 2, the real landing page. His words: the platform's own site is
   what tenant sites build off.
3. **How to connect it to the dashboard** — the contract in §3. Which settings
   drive which parts of the page, so a price changed in the dashboard changes
   the live site with no code edit. This is the part he singled out as a
   feature worth selling.
4. **What is customisable, and how** — adding a feature, removing one,
   changing the look, per client.
5. **Later: the intake form** — the questions a detailer answers so the agent
   has a brief, with examples to pick from, because most of them will not know
   what they want in the abstract.

Two constraints that come from elsewhere in the repo and are not negotiable:

- **Plain markdown, no tool-specific mechanism.** `CLAUDE.md`'s portability
  rule: he expects to move to OpenAI's coding agent in about a month. The kit
  must work from whichever agent he opens.
- **It carries no client content.** Everything specific to a business comes
  from tenant settings or from his per-client instructions.

`docs/roadmap.md` 3.4 also notes the kit **cannot be written before 1.5**,
because the design system it has to encode does not exist yet.

---

## 5. Why this changes the landing page, and what it does not change

He connected the two himself:

> "We don't advertise the website building enough, and that's kind of, like,
> the whole point... At first I was like, I'm just gonna sell this booking
> engine. But I'm realizing there's already a lot of those out there. So my
> main advertisement should be a custom website."

The marketing consequence is worked through in `DECISIONS.md` under
"Positioning: the website is the product" and the concrete page changes are
roadmap **1.4**. In short: the website leads, "custom, not a template" is the
line that separates us from the builders a detailer would otherwise compare us
to, and the dashboard becomes the reason the site stays current rather than the
headline.

**What it does not change:** he was explicit that the live-editing feature
should not become the main point, and that the page must not get long.

---

## 6. Open, and honest about it

1. **The tenant website does not exist yet.** Phase 3 builds it. The landing
   page already sells "a complete site under your own name", so the page is
   ahead of the product — which is normal pre-launch, but it means **the first
   customer's site has to be built by hand, by him, before the promise is
   true.** Worth him knowing plainly rather than discovering at signup.
2. **§3's fork-the-presentation rule is unreviewed.** It is the difference
   between "custom for everyone" being affordable and being a trap.
3. **The intake form is a Phase 3+ idea**, not scheduled.
4. **Pricing for bespoke work is unset.** The current $900 setup covers
   "building it with you". If every site is genuinely custom, that number is a
   business decision he has not revisited, and it is the one that decides
   whether the model works.
