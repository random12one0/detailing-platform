# The manager session

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

*Last written 2026-09-08.*

**Live site:** frozen on 6 Sep. **1,965 credits burned over 131 production
deploys against a 1,000/month plan — twice the sustainable rate, so it RECURS
every cycle unless the cadence changes (§ 17).** Credits reset **13 Sep**, and
**the git integration is CONNECTED** — the skipped builds are named
`main@<sha>` — so **on 14 Sep every push to `main` publishes again and
CLAUDE.md's "a push is not a publish" flips back with nobody editing it.**
**NO FREE ROUTE — the direct-upload idea is dead**: a production deploy is 15
credits whether or not it builds (131 x 15 = 1,965 exactly). Wait for the 13th,
or he buys credits. **But BRANCH deploys cost ZERO**, so a work branch takes
the loop off the meter and gives him a free preview URL that opens on a phone.
**Branch:** work is on `main`. `claude/superbase-access-anj1h7` is 94 behind and
dead — do not use it.
**Waiting on Google:** GBP case 6-3052000042070, filed 8 Sep, 7-10 business
days, watched at `andrewswashing@gmail.com`. **Review ONE does not read the
privacy policy** (four form fields, a legitimacy check); review TWO does, and
cannot start until one returns. **Credits reset 13 Sep, before that. So the
timing gap closes itself — DO NOT buy credits**, and nothing else user-facing
needs to ship in five days (zero detailers, not going public yet).
**Waiting on him:** `OUTSTANDING.md` § 1. **§ 12 IS ANSWERED — 2026-09-08, *"we
are gonna wait."*** No parent on the Stripe account, no parent's bank account,
no ownership transfer. Everything legal happens the week of 2 December in his
own name, exactly as `setup-steps` STEP 0 always said. **The one decision still
open is the WORK BRANCH (§ 17), and it has a deadline: on 14 Sep pushes start
publishing again.**
**Resend:** cap is REAL and account-wide, 100/day. The 117 on 8 Sep was
**entirely our own test traffic** — real customer email is ~2/day, so the
"upgrade when a detailer gets close" deferral STANDS. **Do not push the $20.**
The real issue is that his LIVE BUSINESS shares the account, so a build session
spends its allowance — the fix is a second FREE account, § 16.
**Backups:** healthcheck created (6h grace), he is pasting the URL into GitHub.
**The restore test is still the one that matters and has never been done.**
**Google Branding:** DONE — both URLs pasted 2026-09-08.
**Privacy policy:** now covers Google sign-in AND Business Profile
(`OUTSTANDING.md` § 9). **NONE of it is live** — the live page is still the
6 Sep bundle. **Deploy before submitting Google application two**, or the
reviewer reads the stale page.
**Stripe Connect:** client id set and correct. Both events subscribed
(`account.updated` + `account.application.deauthorized`). **The only thing left
is Andrew pasting `STRIPE_CONNECT_WEBHOOK_SECRET`** — deliveries are 0/0 so the
3-day disable clock is not running. **The second endpoint EXISTS**
(`we_1UDY3WJeoZO7o6EerVO73I3G`, connected accounts, API version `2024-06-20` —
the trap was avoided). Two things left, § 13: the signing secret is not set
yet (**and Stripe disables an endpoint that fails for ~3 days, so this is a
deadline once deliveries start**), and `account.application.deauthorized` is
not subscribed **while its handler is already built and tested** — one
checkbox.
**Google:** Branding cleared the blocker, *Publish app* is now enabled. Test
users still will not save — unexplained, and moot if he publishes, which needs
no review on the three basic scopes.
**Example pages:** a real bug found and fixed 2026-09-08 — `/example1` served
the app shell and `/example1/` served the page. § 15. **Live verification is
still owed after the deploy**, because `_redirects` is Netlify's file and
nothing here can exercise it.
**Lanes running:** websites (A), product (B). Build (C) not started.
