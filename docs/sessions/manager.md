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

## 2. What the manager does NOT do

- **It does not build features.** The moment it starts writing `app/src` it is a
  fourth builder with a stale idea of what the other three are doing, and it
  loses the thing it is for.
- **It does not run the nine-minute browser sweeps.** That is lane B's, and a
  second session driving the same dev server breaks both.
- **It does not re-do a lane's work because it would have done it differently.**
  It says so, once, and moves on.

Reading anything, running a credential-free test, taking a screenshot of a
built page, and editing the docs it owns are all fine.

## 3. Folder ownership

| Owns | |
|---|---|
| `CLAUDE.md` | The session rules |
| `docs/README.md` | The map |
| `docs/roadmap.md`, `docs/OUTSTANDING.md` | The plan and the view of it |
| `docs/sessions/` | These briefs |
| `docs/overnight-log.md` | His answers, written down as they arrive |

Everything else belongs to a lane. `docs/sessions/README.md` is the full table.

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

**Live site:** frozen on 6 Sep, Netlify build credits. Nothing built since
reaches the internet until a direct upload or a top-up.
**Branch:** work is on `main`. `claude/superbase-access-anj1h7` is 94 behind and
dead — do not use it.
**Waiting on Google:** GBP case 6-3052000042070, filed 8 Sep, 7–10 business
days, watched at `andrewswashing@gmail.com`.
**Waiting on him:** the six items in `OUTSTANDING.md` § 1 and the three
one-word answers. **Google Branding is DONE — he had his cloud coworker paste
both URLs on 2026-09-08.**
**Privacy policy:** now covers Google sign-in AND Business Profile
(`OUTSTANDING.md` § 9). **NONE of it is live** — the live page is still the
6 Sep bundle. **Deploy before submitting Google application two**, or the
reviewer reads the stale page.
**Lanes running:** websites (A), product (B). Build (C) not started.
