# The cloud queue — three days of work with no database and no browser

**Read `README.md` in this folder first.** It says why none of these tasks
touch a screen.

Work down the list in order. **One task per session** — start a new session
from the sidebar for each one, because the cloud has no `/clear`. Tick the box
in the same PR that does the work.

Each task below has a **PROMPT** block. Paste it whole into a new cloud
session; it is written to stand on its own.

---

## The shape of the three days

| Day | Tasks | Why in this order |
|---|---|---|
| 1 | **A**, **B** | Both are pure reading and writing. Nothing can break, and they leave two documents the rest of the queue and every later session use |
| 2 | **C**, **D** | The one real code task, while the owner is most likely to be checking his phone — and the legal content, which needs no verification at all |
| 3 | **E**, **F**, **G**, **H** | Half a feature, two chores, a design doc and a pile of tour copy. Safe to land in any order |

**If the boxes all end up ticked, `README.md` §6 says how to choose your own
work — and what you are not allowed to choose.**

**Nothing in this queue can be merged to `main`.** Every PR targets
`claude/superbase-access-anj1h7`. Several of them need a laptop session
afterwards to apply a migration or deploy a function — each task says exactly
which, and that is the sentence to put at the top of the PR.

---

## A — Collect every open thread in the repo into one list

- [ ] Done

**Why this is first.** Every document in this repo ends with a *"STILL OPEN AND
NOT CODE"* or *"what this does not do"* block — the roadmap, `DECISIONS.md`,
`PROJECT-STATE.md`, `CLAUDE.md`, and a dozen research files. **Nobody has ever
collected them.** The owner's stated bar is that he will not sell this until
everything works, and right now the list of what does not work is scattered
across ~25 files and several thousand lines. This is the single most useful
thing a session with no database and no browser can do.

**It is also the perfect cloud task**: pure reading, no network, no install,
and the answer is a document rather than a diff.

**Definition of done:** `docs/open-threads.md` exists, is grouped by kind
(blocks launch / costs money / a decision the owner owes / a known ceiling we
accepted on purpose / stale and can be deleted), and every entry names **the
file and heading it came from**. Where two documents disagree, say so — that is
the most valuable finding this task can produce. Do not fix anything.

> **PROMPT**
>
> Read docs/cloud/README.md, then CLAUDE.md.
> Task: cloud queue item A — collect every open thread in this repo into one list.
> Read the roadmap, PROJECT-STATE.md, DECISIONS.md (via its index, never end to end), CLAUDE.md and every file in docs/, and pull out every unresolved thread: "still open", "not code", "awaiting the owner", "what this does not do", "ponytail:" comments, and any two documents that contradict each other.
> Write docs/open-threads.md grouped by kind, each entry naming the file and heading it came from. Change nothing else.
> Finish with the credential-free checks in docs/cloud/README.md §2 and open a PR into claude/superbase-access-anj1h7.

---

## B — Roadmap 4.1: audit the old site for anything the rebuild dropped

- [ ] Done

**Why the cloud can do this and the laptop keeps putting it off.** It is a
long, boring, careful read of two codebases, and both are reachable: the
read-only snapshot is in `reference/`, and the live business's real repo is
**`random12one0/carwebitebooking`** — `gh` is pre-installed and authenticated
in cloud sessions, so `gh api` reads it fine.

**READ CLAUDE.md's warning about the repo name first.** This file said
`carwashweb` until 2026-09-03; that repo is real, private, and a 99-file
Emergent scaffold with none of the interesting code in it. **A session that
follows the old name finds a shell and concludes there is nothing to look at.**

**Definition of done:** `docs/old-site-audit.md` — every feature the old site
had, marked *rebuilt* / *deliberately dropped (with the decision that dropped
it)* / **missing and nobody noticed**. The third category is the whole point,
and roadmap 4.2 is waiting on it. Do not build anything.

> **PROMPT**
>
> Read docs/cloud/README.md, then CLAUDE.md, then docs/roadmap.md item 4.1.
> Task: cloud queue item B — audit the old site for anything the rebuild dropped.
> Sources: the read-only snapshot in reference/, and the live business's repo random12one0/carwebitebooking read with `gh api` (NOT carwashweb — CLAUDE.md explains why that name is a dead end).
> Produce docs/old-site-audit.md: every feature the old site has, marked rebuilt / deliberately dropped with the DECISIONS.md entry that dropped it / missing and unnoticed. Read DECISIONS.md through its index only.
> Change no code. Finish with the credential-free checks in docs/cloud/README.md §2 and open a PR into claude/superbase-access-anj1h7.

---

## C — Roadmap 2.21: the booking-page spam filter, engine only

- [ ] Done

**The one real code task in the queue, and it has no UI in it** apart from one
input the customer can never see.

**What it is:** since roadmap 2.12 a *request* holds the slot, and
`create-booking` is public with no rate limit, no captcha and no honeypot — so
filling a detailer's entire week costs a script nothing. `plan-link`'s `email`
action needs the same throttle for a different reason: it is public and it
SENDS, so an unthrottled loop is a mail-bomb from the platform's shared sending
reputation.

**Do the decision before the code.** `bookings` stores no IP, so per-IP
counting needs somewhere to live — a small table, or the existing
`visitor_id` / `track-visit` machinery. Write the reasoning into `DECISIONS.md`
first. And the exclusion constraint means **a refusal must not leave a
half-written row**; the existing 409 path for an overlapping insert is the
model for how a refusal should read.

**No captcha.** It costs the real customer more than it costs the attacker, and
W16's whole point is that a customer never fights the booking form.

**LEAVE THE ARITHMETIC WHERE A TEST CAN REACH IT.** Put the throttle's decision
function in `supabase/functions/_shared/` and pin it with a new credential-free
`tests/throttle.test.mjs`, the way `tests/plans.test.mjs` test 6 imports
`_shared/pricing.ts` directly. That test is the only verification this task can
have, so it is the task.

**What the laptop must do afterwards, and put it at the top of the PR:**
`node scripts/apply-migrations.mjs <the new file>.sql`, then
`node scripts/deploy-functions.mjs create-booking plan-link`, then
`node scripts/e2e-booking.mjs` and `node tests/request-mode.test.mjs`.
**And `/security-review` before it ships** — the roadmap says so.

> **PROMPT**
>
> Read docs/cloud/README.md, then CLAUDE.md, then docs/roadmap.md item 2.21.
> Task: cloud queue item C — build the booking-page spam filter, engine only. No captcha.
> Decide first, in DECISIONS.md, where per-IP counting lives: a small table, or the existing visitor_id / track-visit machinery. Then: an append-only migration, the throttle's decision function in supabase/functions/_shared/ so a test can import it, wiring into create-booking AND plan-link's email action, a honeypot field the booking widget leaves empty, and tests/throttle.test.mjs — credential-free, baselined BOTH ways.
> A refusal must not leave a half-written row; the existing 409 path for an overlapping insert is the model.
> You cannot apply the migration, deploy a function or run a browser here — say exactly what the laptop has to run, at the top of the PR.
> Finish with the credential-free checks in docs/cloud/README.md §2 and open a PR into claude/superbase-access-anj1h7.

---

## D — Write the terms, the privacy notice and the auto-renewal disclosure

- [ ] Done

**Roadmap 7.1, and two things have made it urgent since it was written.**
Roadmap 2.19 (2026-09-05) shipped the product's first **commercial** email,
which needs a privacy story to sit behind its opt-out. And roadmap 2.20 will
charge detailers a subscription in **California**, where **AB 2863** requires
auto-renewal terms disclosed clearly *before* billing details are taken,
express consent, and cancellation in the same medium the customer signed up in.
`docs/legal-and-tax-2026-09-04.md` already has the research; this task turns it
into words.

**CONTENT ONLY — no pages, no routes, no components.** Write
`docs/legal/terms.md`, `docs/legal/privacy.md` and
`docs/legal/auto-renewal.md`. A laptop session renders them later; that is the
part with pixels in it.

**Two things to get right.** The privacy notice covers **two different kinds of
person** — the detailer who is our customer, and the detailer's customers whose
names, phone numbers and home addresses we hold on their behalf — and
conflating them is the commonest mistake in a document like this. And it must
say plainly what the marketing opt-out does and does not stop, because
`UnsubscribePage.jsx` already promises a customer that transactional mail keeps
coming.

**Say clearly at the top of each file that it is a draft written by an agent
and has not been read by a lawyer.** The owner is 17 and in California; that
sentence is not boilerplate.

> **PROMPT**
>
> Read docs/cloud/README.md, then CLAUDE.md, then docs/legal-and-tax-2026-09-04.md and docs/payments-research-2026-09-04.md.
> Task: cloud queue item D — write docs/legal/terms.md, docs/legal/privacy.md and docs/legal/auto-renewal.md. CONTENT ONLY: no pages, no routes, no components.
> The privacy notice covers TWO kinds of person — the detailer who is our customer, and the detailer's own customers whose personal data we hold on their behalf. Keep them separate.
> It must match what the product actually does: read supabase/migrations for what is stored, supabase/functions/_shared/emailTemplates.ts for what is sent, and app/src/book/UnsubscribePage.jsx for what the marketing opt-out promises.
> The auto-renewal file is California AB 2863 applied to the $499 + $40/month in roadmap 2.20.
> Head each file with a plain sentence saying it is an agent-written draft that no lawyer has read.
> Finish with the credential-free checks in docs/cloud/README.md §2 and open a PR into claude/superbase-access-anj1h7.

---

## E — Roadmap 2.23: the maintenance deadline, arithmetic and schema half

- [ ] Done

**Half a feature, and it is the half the cloud can actually do.** A coating
warranty **voids** — *"before 12 October, or something the customer paid $1,500
for is gone"* — which is a different thing from a plan's cadence, and roadmap
2.14 built cadences without it.

**Follow the split roadmap 2.14 already proved.** The arithmetic goes in
`app/src/lib/` with no React in it (like `plans.js` and `client-list.js`), so
`tests/warranty.test.mjs` can import it with no browser. That test is this
task's only possible verification, so write it first and baseline it both ways.

**Build:** the append-only migration, the arithmetic module, the escalating
reminder's email template in `_shared/emailTemplates.ts` with its case added to
`scripts/render-emails.mjs`, and the test.

**DO NOT BUILD THE SCREEN.** Where a detailer sets a deadline, and where it
appears, is a design decision that needs `impeccable` and five screenshot
widths. Leave it, and say in the PR that you left it.

**What the laptop must do afterwards:** apply the migration, deploy whatever
sweep sends the reminder, and design and build the screen.

> **PROMPT**
>
> Read docs/cloud/README.md, then CLAUDE.md, then docs/roadmap.md item 2.23 and docs/plans-research-2026-09-04.md round 2 §2.
> Task: cloud queue item E — the maintenance-deadline feature's non-visual half.
> Build: an append-only migration, the arithmetic in app/src/lib/warranty.js with NO React in it (same split as plans.js and client-list.js), the escalating-reminder email template in supabase/functions/_shared/emailTemplates.ts with its case added to scripts/render-emails.mjs, and tests/warranty.test.mjs — credential-free, baselined both ways.
> A deadline VOIDS something; it is not a cadence. Read what roadmap 2.14 built before adding anything next to it.
> DO NOT BUILD ANY SCREEN — that needs design skills and five screenshot widths this environment does not have. Say in the PR that you left it.
> Finish with the credential-free checks in docs/cloud/README.md §2 and open a PR into claude/superbase-access-anj1h7.

---

## F — Correct every stale number in CLAUDE.md, and the missing page metadata

- [ ] Done

**Two chores in one session.** Both are small, both are verifiable here, and
the first one makes every future session cheaper.

**F1 — the counts.** CLAUDE.md quotes a check count for most test suites, and
**four of them have gone stale so far** — the file says so itself. Every script
prints its own figure. Run all thirteen credential-free checks, correct every
number in CLAUDE.md against what actually printed, and add one line naming the
scripts that print their own count so the next session reads the output rather
than the prose.

**F2 — roadmap 7.5.** `app/index.html` has no meta description and no Open
Graph tags, so every link to detailingplatform.com shared anywhere renders as a
bare URL. This is `<head>` content, not layout, so it is inside the cloud's
limits. **Flag the OG image as an open question rather than inventing one** —
there is no artwork for it, and CLAUDE.md's imagery rule says ask rather than
settle.

> **PROMPT**
>
> Read docs/cloud/README.md, then CLAUDE.md.
> Task: cloud queue item F, two chores.
> F1: run all thirteen credential-free checks listed in docs/cloud/README.md §2, then correct every check-count number in CLAUDE.md against what actually printed. Four have gone stale before. Add one line naming which scripts print their own count.
> F2: roadmap 7.5 — give app/index.html a meta description and Open Graph tags. Read app/src/landing/LandingPage.jsx for the real positioning words rather than writing new ones. Do NOT invent an OG image; flag it as a question for the owner.
> Finish with the credential-free checks and open a PR into claude/superbase-access-anj1h7.

---

## G — Roadmap 2.22: the free database backup, designed but not switched on

- [ ] Done

**The owner said "maybe", not "build it"** — so this session designs it and
writes the files disabled, and he decides.

**What is already known and must not be re-derived:** the free Supabase plan
has **no backups at all**; Supabase's own advice for free projects is
`supabase db dump` kept off-site; and **GitHub runners are IPv4-only while a
free project's direct connection resolves to IPv6, so the SESSION pooler on
port 5432 is required — the transaction pooler does not work with `pg_dump`.**
That last one costs an afternoon if you do not know it.

**Two rules that are not negotiable.** The destination must be **private and
encrypted** — the dump is real customers' names, phone numbers and home
addresses, and a public repo would be the worst single thing that could happen
to this product. And **a backup nobody has restored is not a backup**: the
runbook must include one real restore into a scratch project, and that restore
is the laptop's job.

**Write the workflow with `workflow_dispatch` only — no `schedule:` trigger.**
Turning it on is the owner's call and needs a secret he has to add.

> **PROMPT**
>
> Read docs/cloud/README.md, then CLAUDE.md, then docs/roadmap.md item 2.22.
> Task: cloud queue item G — design the free nightly database backup and write the files DISABLED.
> Produce: docs/backup-plan.md (where the dump lands and why, what it costs, and a restore runbook), and .github/workflows/backup.yml with workflow_dispatch ONLY and no schedule: trigger.
> Known and not to be re-derived: the free plan has no backups; GitHub runners are IPv4-only so the SESSION pooler on port 5432 is required and the transaction pooler does not work with pg_dump; the destination must be private and encrypted because the dump is real customers' home addresses.
> End the PR with the two things the owner has to decide: whether to turn it on, and where the dump goes.
> Finish with the credential-free checks in docs/cloud/README.md §2 and open a PR into claude/superbase-access-anj1h7.

---

## H — Roadmap 2.24: write every step of the per-tab guide, as words

- [ ] Done

**The owner asked for this on 2026-09-05**, about the walkthrough that already
exists: *"it did it for the home page, and then it stopped there. And it was a
little weird… every time you click on a new tab for the first time, there
should be a full guide for every single thing inside of that."*

**THE SLOW HALF OF THAT ITEM IS WRITING THE STEPS, AND IT IS ALL WORDS.** Each
step is one target and one sentence. Working out which controls on Calendar,
Money, Clients and Business need a sentence — and which are already obvious
from their own label — is a careful read of five screens' JSX, which is exactly
what this environment is good at. **The overlay itself is a screen and is not
this environment's work.**

**READ `app/src/components/Walkthrough.jsx`'s header before writing a word.**
Its six rules and the owner's three constraints are the specification: one
sentence a step, one ELEMENT a step, more steps rather than fewer, no sentence
naming a position or a gesture, and a step whose target is absent is skipped.

**AND THE RULE THIS ITEM ADDS IS THE ONE HE JUST GAVE: only what is NOT
obviously explainable.** A step that points at a button and reads the button's
label back is the thing he called weird. It is his own copy rule from
2026-09-01 — *does the sentence add a fact the control does not already
carry?* — applied to a tour. **Expect to delete more candidate steps than you
keep.**

**Definition of done:** `docs/tour-steps-2.24.md` — for each of the five tabs,
an ordered list of steps, each with the `data-tour` name (say whether it exists
in the JSX today or has to be added), the one sentence, and whether the target
is always present or conditional. Plus a short section on the one question the
item cannot dodge: **what a guide does about states behind a click** — a
Clients guide that stops at the list has the same shape as his complaint, but
the lit element is deliberately not clickable, so either the guide advances the
screen itself or it only covers the resting screen. Give a recommendation.

**Write no code.** Not the overlay, not the `data-tour` attributes.

> **PROMPT**
>
> Read docs/cloud/README.md, then CLAUDE.md, then docs/roadmap.md item 2.24 and the whole header comment of app/src/components/Walkthrough.jsx.
> Task: cloud queue item H — write docs/tour-steps-2.24.md, the step lists for a per-tab guide. WORDS ONLY: no overlay, no data-tour attributes, no JSX.
> For each of the five tabs, read the screen's JSX and list the steps: the data-tour name (existing or needed), one sentence, and whether the target is always there.
> Obey Walkthrough.jsx's six rules and the owner's three constraints, and apply his newest one: a step only exists if its sentence adds a fact the control's own label does not already carry. Expect to cut more candidates than you keep.
> Include a recommendation on states behind a click — a Clients guide that stops at the list repeats the complaint, but the lit element is deliberately not clickable.
> Finish with the credential-free checks in docs/cloud/README.md §2 and open a PR into claude/superbase-access-anj1h7.

---

## If the queue runs out

**`README.md` §6 is the permission and the limits — read it before you choose
anything.** Three tests every self-chosen task must pass, a ranked list of what
to reach for, a short list of what is off limits whatever the reasoning, and a
stop rule for when the cloud-shaped work has genuinely run out.

Two shortcuts worth knowing before you get there:

- **Do not start roadmap 2.20** (taking money). Stripe keys, webhooks and two
  screens, and `security-review` is not optional on any stage of it.
- **Extending A is almost always the best spare session.** An open-threads list
  is worth exactly its accuracy, and a second pass checking each entry against
  the current code beats a new task nobody can verify.
