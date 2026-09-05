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

## 3. The one architectural rule that makes it affordable — CONFIRMED

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

**CONFIRMED by the owner, 2026-08-29: "Fork the presentation over the engine
— yeah, that's what I meant. Custom for everyone. That's confirmed."** It is
now the rule, not a proposal.

His own description of where the line falls, which is more specific than the
rule above and should be read with it:

> "The back-end basic part of the websites are all gonna stay the same. That's
> cookie cutter — basically in the prompt that kinda tells it how to set up the
> back end to work with, you know, the Supabase and the Resend and all the
> stuff that we've already set up. But the front end is what gets fully
> customised for each detailer."

And the constraint that stops "custom front end" meaning "anything at all":

> "Obviously you still gotta have, like, a lot of the features of the admin
> dashboard need some features on the website to work."

So the contract is two-way and it is not optional. The dashboard exposes
things — services, prices, hours, gallery, availability, bookings — and a
tenant site is only finished when it implements the pieces those features need
in order to function. A site may look like anything; it may not omit the parts
the dashboard drives. That list is what roadmap 3.1 has to enumerate.

On the starting point:

> "When we first start, it's still gonna have that kind of information of a
> good website design, to kinda default off of — the research we've been doing
> for the landing pages. It could be the same kind of default for the website
> for the client."

So the kit ships a **default** built from `docs/references/` and the finished
design system, and per-client work diverges from it. A client site is not
designed from nothing each time.

**READ THE QUOTE ABOVE, NOT THIS PARAGRAPH — corrected by him 2026-09-05.** He
said *"that same **research**"*, and the paragraph above turned it into a
default LOOK. The first page built from that reading was the platform's own
landing page recoloured, and he rejected it on sight: *"it shouldn't look
exactly like our landing page, it should genuinely be different. Different
colors fonts aesthetic… what I meant by default using our design, I more meant
like the mentality of how we do things. The scrolling, the inspo etc."* **What
a client site inherits is the METHOD — the research habit, the anti-slop floor,
the motion mentality, the copy rule, verify-by-looking — and never the skin.**
A default look is the cookie-cutter site §1 already rejected. Full reasoning
and the evidence from six real detailers' sites:
`docs/tenant-site-research-2026-09-05.md`.

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
"Positioning: what we sell is the pair" and the concrete page changes are
roadmap **1.4**.

**And he corrected me on it the same day, which matters more than the original
framing:**

> "The website with the admin dashboard is kind of the seller. Like, it's
> combined. It's not like, here's a custom website with you, also comes with
> the admin dashboard. No. So we're building this website and admin dashboard
> for you kinda thing. Obviously the admin dashboard's cookie cutter, but I
> don't want that to be lost."

So it is **one build, sold as one thing** — not a website with the software
thrown in. "We build you a website and the dashboard that runs it" rather than
"a custom website, and it comes with a dashboard". The custom half and the
standard half are both part of the promise; only the custom half is what
distinguishes it from the booking tools he is trying not to be compared to.

**What it does not change:** he was explicit that the live-editing feature
should not become the main point, and that the page must not get long.

---

## 6. Open, and honest about it

1. ~~The page is ahead of the product.~~ **RAISED AND DISMISSED by the owner,
   2026-08-29, correctly.** I flagged that the landing page sells a website
   Phase 3 has not built, and that the first client's site would therefore be
   hand-built. He answered: *"We're not selling to customers until literally
   every single thing is completely finished. So that's not a flag. Phase 3, we
   will build it, and then the first customer site will be built by our bot."*
   Nothing is sold before Phase 3 ships, so there is no window in which the
   page promises something that does not exist, and no hand-built first site.
   Kept here only so the concern is not re-raised by a later session.
2. ~~§3's fork-the-presentation rule is unreviewed.~~ **Confirmed by the owner
   the same day.** See §3.
3. **The intake form is a Phase 3+ idea**, not scheduled.
4. **Pricing for bespoke work is unset.** The current $900 setup covers
   "building it with you". If every site is genuinely custom, that number is a
   business decision he has not revisited, and it is the one that decides
   whether the model works.
