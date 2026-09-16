# Research brief — how to run this project well with Claude Code

Hand this whole file to a research agent (Claude, ChatGPT deep research, or
similar). Written 2026-09-16. It deliberately does not tell the researcher what
conclusion to reach.

---

## Your task

Research, from the live web and from primary sources, how a project like the one
described below should be run when the code is written by an AI coding agent
(Claude Code specifically, but transferable advice is welcome). Come back with
concrete, opinionated recommendations — not a summary of what exists.

**Do not limit yourself to the questions below.** They are the areas we already
know we are weak in. If your research turns up something we have not thought to
ask about, that is the most valuable thing you can bring back.

Cite your sources. Where the community disagrees, say so and pick a side with a
reason. Where something changed recently, say when and what it replaced. Prefer
evidence (benchmarks, post-mortems, docs from Anthropic) over blog-post opinion,
and say which kind each recommendation rests on.

---

## The project

A SaaS product for car detailers — people who clean and detail cars, usually
one- or two-person mobile operations. A detailer signs up and gets:

- a dashboard (jobs, calendar, clients, money, settings)
- a public booking page their customers use to book and pay
- optionally a full website of their own, built for them, on their own domain
- email and SMS reminders, invoices, subscription plans, promo codes, reviews

It is multi-tenant: every detailer's data must be invisible to every other one.
There is a platform back office for the owner.

**Stack**: React + Vite front end, Supabase (Postgres, row-level security, Deno
edge functions) back end, Netlify hosting, Resend for email, Stripe for
payments. English and Spanish. Phone-first — 320px to 1440px, and detailers use
it standing next to a car.

**Scale of what exists**: roughly 60 test suites, 55 node scripts (browser
sweeps, screenshot shooters, seeders, deploy checkers, contrast auditors), a
custom design system, and about 930,000 words of markdown documentation
accumulated over a few months of near-continuous AI-driven development.

**Who runs it**: one non-programmer owner who directs the work in plain English
and reviews results by looking at screenshots and using the product. No other
engineers. Nobody reviews a pull request line by line. This is the single most
important constraint on every answer you give — any process that depends on a
human reading a diff carefully will not happen here.

**Current state**: the product substantially works. Several external audit
agents were just pointed at it and their findings are about to be turned into a
roadmap. The owner has just stripped out a system of agent "roles" and folder
ownership rules that had accumulated, and cut the main instruction file from
19,861 words to 1,481. He wants to rebuild the working method deliberately
rather than let it accrete again.

---

## Question 1 — Documentation

930,000 words of markdown is clearly wrong. Some of it is genuinely hard-won
(fifteen specific ways a browser measurement has lied to us, each of which cost
real hours). Most of it is session logs, superseded plans, and the same fact
restated in four places where three copies have quietly gone stale.

- What document set should a project of this shape actually have? Name the
  files and say what each one is for.
- What is the right home for each *kind* of knowledge: a durable architectural
  decision; a hard-won gotcha; a design rule; the current to-do list; the record
  of what has already been verified; a one-off research finding?
- How do you stop a doc set from rotting? Specifically: how do you make a stale
  line *visible* rather than trusted? We have repeatedly had a document assert
  something that stopped being true months earlier, and an agent act on it.
- Is there a defensible way to mass-archive? What is the test for "this file
  should be deleted" versus "archived" versus "kept"?
- How should CLAUDE.md relate to skills, to per-directory CLAUDE.md files, and
  to imported files? What belongs in each?
- What does current evidence say about context length and quality degradation,
  and what does that imply for how much an agent should read before it starts?

## Question 2 — How work should be sequenced

- For a backlog of audit findings across correctness, security, design and
  copy — what is the right order to attack them in, and why?
- How do you size a unit of work so one session finishes it cleanly? What are
  the signals that a task was scoped too big?
- What is current best practice on plan-before-code (Claude Code's plan mode,
  spec-driven development, EPIC, etc.)? Does it actually pay off, and for which
  kinds of task?
- How should a roadmap be structured so that an agent picking it up cold knows
  exactly what "done" means for the next item?
- How do you keep two findings from contradicting each other, and how do you
  detect it when they do?
- What is the right handoff between sessions when context runs out mid-item?

## Question 3 — Verification and quality

This is where we most want you to be specific and opinionated.

Our repeated failure mode: **a check that skips reads exactly like a check that
passes.** A width sweep once printed "clean" over 38 real findings. A test suite
passed 58 assertions while half a screen rendered in the wrong language. A
navigation sweep passed 22 screens it never actually visited.

- How do you build automated checks you can actually trust? What is the
  discipline for proving a check works before believing it?
- For a front-end product reviewed by a non-programmer: what should the
  automated visual verification loop be? Screenshots at fixed widths, console
  reads, contrast maths, accessibility audits, visual regression diffing — what
  is worth having, in what order, and what is theater?
- Where do hooks belong versus instructions in a file? Anthropic's own framing
  is that a file instruction is a request and a hook is a guarantee. Which of
  our needs should be hooks?
- What should gate a commit? What should gate a deploy?
- How do you test multi-tenant data isolation convincingly?
- How do you verify AI-written copy and translations without reading every
  string?
- What does a good "definition of done" look like for a screen, an API
  endpoint, a migration, an email?

## Question 4 — Skills, subagents, hooks, and tooling

We have these skills available and suspect we are using them badly or not at
all: `impeccable`, `ui-ux-pro-max`, `frontend-design`, `great-design`,
`ship-check`, `tastemaker`, `scrollcraft`, `ponytail` (and its audit/review
variants), `code-review`, `simplify`, `security-review`, `dataviz`,
`skill-creator`, `relay`, `loop`.

- Which of these earn their place on a project like this, and when should each
  one fire? Be willing to say "none of these, here is what you actually need."
- **What skills should we build that do not exist yet?** Think about what this
  project does over and over: verify a screen at four widths, check a string
  changed in English also changed in Spanish, audit a new component against the
  existing control kit, confirm an edge function deployed matches the repo,
  prove a migration is safe. Propose concrete skills with a sketch of what each
  would contain.
- Subagents: when is delegating to one actually better than doing the work in
  the main session? What are the failure modes?
- Hooks: what are the highest-value hooks for a project like this?
- MCP servers and connectors: which are worth wiring up for this stack
  (Supabase, Netlify, Stripe, Resend, Playwright, design tools)?
- Is there tooling outside the Claude ecosystem we should be using alongside it?

## Question 5 — Avoiding AI slop

The owner's words: he wants "actual quality, not AI slop." This has two faces
and we want both researched.

**Visually**: what specifically makes an AI-generated interface recognizable as
one in 2026? Not the list from two years ago — the current tells. What
separates a page that a real designer would defend from one that merely passes
an audit? What briefing techniques actually produce variety across multiple
generations rather than one house style in different paints?

**In code**: what makes AI-written code recognizable, and which of those traits
actually matter versus which are aesthetic complaints? Over-abstraction,
defensive boilerplate, comments restating the code, inconsistent patterns
between files written in different sessions, tests that assert the
implementation rather than the behavior. Which of these cause real bugs, and
what process catches them?

---

## What to bring back

A written report. For each area:

1. What you found, with sources.
2. A concrete recommendation for **this** project, specific enough to act on.
3. What it replaces or what we should stop doing.
4. How we would know it worked.

Rank your recommendations by expected payoff. If there is one change that
matters more than everything else combined, lead with it and say so.
