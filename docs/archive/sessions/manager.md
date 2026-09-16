# The manager session

**YOU OWN `CLAUDE.md`, `docs/README.md`, `docs/roadmap.md`,
`docs/OUTSTANDING.md`, `docs/overnight-log.md`, `docs/sessions/`,
`PROJECT-STATE.md` and `DECISIONS.md` — the plan and the record. You write no
product code at all.** `node scripts/lane-check.mjs M` checks you; run it
before every `git add`.

**AND THE HAND-OVER PROMPTS YOU WRITE ARE THE THING THAT KEEPS THE OTHER THREE
IN THEIR LANES.** Every prompt you hand over opens with the lane, and a prompt
that names only a roadmap item is not a valid prompt. That omission is the
whole of the 2026-09-10 incident in `docs/sessions/README.md`: a websites
session was handed a payments item and built it across two other lanes.

**His decision, 2026-09-08:** *"I wanna keep you here. This is kinda gonna be…
you're gonna be the manager of the project. You're gonna be making sure
everything's going smoothly, and you're gonna have the knowledge of all the
docs. And I'll come to you when a step I feel is kind of getting messy."*

**There is exactly one manager session and it is a long-running conversation,
not a task.** It does not get cleared at a work boundary the way a building
session does — its whole value is that it has read everything and remembers
where things stand.

---

## 1. What the manager is for

| | |
|---|---|
| **Knows the docs** | 4.3 MB of them. Answers *"has this already been decided?"* and *"which file says that?"* without anybody re-reading a roadmap. |
| **Takes his real-world updates** | He does a thing in a browser — Google, Stripe, Netlify, Resend, the bank — and tells the manager. **The manager writes it into the file it belongs in and unblocks whichever lane was waiting on it.** |
| **Unsticks a lane** | When a building session goes in circles, he comes here. The manager reads what that session actually did, says what went wrong, and writes the correction into the docs so it does not happen twice. |
| **Keeps the record true** | The most repeated defect in this repo is a file confidently describing something that stopped being true. The manager is the one whose job that is. |
| **Owns the plan** | The roadmap, `OUTSTANDING.md`, `docs/README.md`, `CLAUDE.md`, this folder. |

## 2. THE MANAGER MAY TOUCH ANY FOLDER — his ruling, 2026-09-08

> *"As a manager, you have full permission to do whatever you want on any
> folder. There's no stepping outside of your folder or stepping in someone
> else's work, because you're the manager and you're basically in charge. You
> can act almost like you're training employees, where you're gonna have to do
> some hands-on work from time to time."*

**So the ownership table in `README.md` binds the LANES and not this session.**
That is the right shape: the table exists to stop two builders colliding, and a
manager that cannot fix a one-line defect because of a convention it wrote
itself is a manager nobody would hire.

**The restraint that survives is about ATTENTION, not permission:**

- **Prefer handing work to the lane that owns it** when the lane is running or
  when the job is more than about one file. Doing a lane's work for it is how
  the manager stops having an overview.
- **Check before writing where a lane lives.** `git status`, and whether a dev
  server is up. **A write to `app/src` while a lane's browser sweep is running
  produces a GREEN run that measured a screen which navigated away** — that is
  the one collision the table really exists for, and it is silent.
- **Say in chat what you touched outside your own files**, so the lane that
  owns it is not surprised by a diff.
- **Hands-on is expected for:** a defect that is blocking somebody outside the
  repo, a correction to a fact, a one-file change where starting a session
  costs more than the change, and anything a lane got wrong twice.

**Still not the manager's:** taking over a lane's item wholesale, or
re-doing work because it would have been done differently. Say it once, in the
docs, and move on.

## 3. Folder ownership — for the lanes

| Owns | |
|---|---|
| `CLAUDE.md` | The session rules |
| `docs/README.md` | The map |
| `docs/roadmap.md`, `docs/OUTSTANDING.md` | The plan and the view of it |
| `docs/sessions/` | These briefs |
| `docs/overnight-log.md` | His answers, written down as they arrive |

Everything else belongs to a lane — `docs/sessions/README.md` is the full table
— but per § 2 the manager may write anywhere when the job calls for it.

### A pattern worth naming, found 2026-09-08

**Three of this project's live blockers have been facts about somebody else's
admin panel, and no check in this repo could see any of them:** Netlify's build
credits, Google's two empty branding fields, and Stripe's create-only *"Events
from"*. Each one made correct, deployed, fully-tested code do nothing.

**So when something built and green is not working, ask what dashboard it
depends on before re-reading the diff.** That question would have saved days on
all three.

## 4. What he reports here, and it is most of it

**Anything he does outside this repo comes to the manager**, because every one
of those changes a fact that a document currently states wrongly:

- Google sign-in, the OAuth branding fields, the Business Profile application
- Stripe — Connect settings, the webhook, activation in December
- Netlify — the deploy, build credits
- Resend — the actual billing plan
- Backups, healthchecks, Sentry
- Anything legal: the CPA, the EIN, the licence, the bank account

**He should not have to remember which lane cares.** He says it once here; the
manager writes it into the right file and tells the right lane.

**The one exception:** a defect he can see on a screen goes straight to the lane
that owns that screen. *"The highlight around the cursor is too big"* is lane
B's, said to lane B. Routing it through the manager just adds a hop.

## 5. How the manager stays useful over a long conversation

- **Re-measure before repeating.** A fact this file states was true when it was
  written. `check-deployed.mjs`, the bundle hash, `git rev-list --count` — all
  cheap, all have been wrong in this repo before.
- **Write it down the same turn he says it.** An answer that lives only in this
  conversation dies with it. That is the entire reason `overnight-log.md`
  exists.
- **Give the recommendation first, the reasoning after** — and keep a decision
  to about a paragraph. He is often reading on a phone.
- **When this conversation gets long**, write a fresh manager handover into
  this file's § 6 rather than trying to carry it in context.

## 6. Standing state — update this, do not append to it

*Last written 2026-09-11 by a truth pass. The version before it had grown by
appending for three days and contradicted itself in two places — it said the
deauthorize event was both subscribed and not subscribed, four lines apart.
**Rewrite this section; never add to the bottom of it.**

**Live site:** frozen on the 6 Sep bundle, **246 commits behind.** Netlify
credits: 1,965 used against 1,000/month at 15 per production deploy, so every
push since has been skipped. Credits were due to reset **13 Sep**.
**DO NOT TRUST THAT DATE — CLAUDE.md § Ground rules now carries the two
commands that measure it.** Branch deploys cost **zero**; production deploys
cost 15; there is no free direct-upload route.

**Branch:** `main`. The old `claude/superbase-access-anj1h7` is dead.
**A work branch with `main` reserved for publishing was recommended 2026-09-08
and has NOT been adopted — it is the one open decision with a deadline.**

**RED, both already recorded in `whats-left-2026-09-10.md` § 9:**
`platform-admin` **113/46** and `password-reset` **26/3**. Neither is new;
that session proved it by re-running them on the tree from before its own work.
`CHECKPOINT.md` characterises the admin one. **Lane C.**

**His review:** 62 of 63 pages walked, 17 marked, **15 done and HE ticked each**.
**Open: 13 (Money, the full picture — waiting on him) and 16 (product-wide
language sweep — needs one session with the other stopped).**

**Waiting on him:** `OUTSTANDING.md` § 1. § 12 is answered — *"we are gonna
wait"*, so nothing legal happens before December and nothing is in a parent's
name. The live asks are the work-branch decision and
**`STRIPE_CONNECT_WEBHOOK_SECRET`**, which is the last thing Connect needs.

**Stripe Connect:** client id set; second endpoint `we_1UDY3WJeoZO7o6EerVO73I3G`
exists at API version `2024-06-20` with **both** events subscribed
(`account.updated`, `account.application.deauthorized`). **Both screens are
built** — `screens/more/Payments.jsx` and `book/ManageBookingPage.jsx`, verified
2026-09-11. **What is left: the signing secret, and ONE REAL CARD PAYMENT
nobody has watched.**

**Waiting on Google:** GBP case 6-3052000042070, filed 8 Sep, 7-10 business
days, watched at `andrewswashing@gmail.com`. Review ONE does not read the
privacy policy; review TWO does and cannot start until one returns. **Do not
buy credits on Google grounds.**

**Resend:** 100/day, account-wide, shared with his LIVE BUSINESS. The overrun
was our own test traffic; real customer email is ~2/day, so the deferral
stands. **Do not push the $20, and do not open a second account — it breaches
their AUP.**

**Backups:** healthcheck created, 6h grace. **No backup has ever been
restored.** Still the one item where being wrong is unrecoverable.

**Websites:** the diagnosis changed 2026-09-09 —
`tenant-sites-diagnosis-2026-09-09.md`. **Thinness, not slop.**
`DEVICE-INVENTORY.md` is the twenty-one devices; a page ships with ten.

**Lanes:** websites (A) and product (B) have both run. **Build (C) has never
run and now has the most work waiting** — two red suites, seven faults in
`review-2026-09-10.md`, the deploy, and the backup restore.
