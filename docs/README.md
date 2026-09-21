# The docs, mapped — read this before opening anything else

**Written 2026-09-08.** This repo holds **6.5 MB of markdown across 113 files
in `docs/`** — measured 2026-09-21 (`git ls-files '*.md' | xargs wc -c`;
1,105,000 words). **The figure here said 4.3 MB until then.** Nobody reads it
end to end and nothing expects you to. This file is the map: what each document
is, whether it is still TRUE, and which three you actually need for the job in
front of you.

> ## THIS MAP IS PARTIAL AND TWO OF ITS POINTERS ARE DEAD — measured 2026-09-21
>
> **63 of 113 documents in `docs/` are named here. 50 are not.** Counted by
> testing every `docs/*.md` filename against this file. **So an absence from
> this map means nothing at all** — not that the document does not exist, and
> not that it is not load-bearing. Four of the fifty are named in `CLAUDE.md`'s
> own "Where the knowledge lives" table, including the one it says to read
> first. They have rows below now; the other forty-six do not.
>
> **And two pointers in this file name documents that are not there:**
>
> | pointer | what this map says about it | the fact |
> |---|---|---|
> | `START-HERE.md` | *"READ IT FIRST"*, *"at Andrew's instruction"* | **Deleted 2026-09-16** in `5924e96`, "Reset the rulebook: drop the lane/role system, cut CLAUDE.md by 93%". Five days dead before anybody noticed. |
> | `HANDOFF-2026-09-19.md` | *"LIVE — start here"*, in the tier legend | **Never existed in git.** `git log --all --` on that path returns nothing. Not stale — never true. |
>
> **Both of them are this map's own "read this first" instruction**, which is
> the worst place in the repo for a dead link: a session following it finds
> nothing and has no way to tell whether it was deleted, renamed, or never
> written. Marked rather than removed, because which of the two happened is the
> part that teaches — one rotted, the other was wrong on the day it was typed.
>
> **A document that describes another document goes stale silently.** This is
> the fifth instance found on the night of 2026-09-20/21, and the reason the
> rows added below **quote what each document says about itself** instead of
> summarising it. A quote cannot drift without the quotation marks becoming a
> lie somebody can see.

### The four `CLAUDE.md` sends you to that were not on this map — added 2026-09-21

| File | Tier | What it says about itself |
|---|---|---|
| `docs/MANAGER-CLOSE-2026-09-21.md` | **LIVE — `CLAUDE.md` says read it first, once, before picking anything up** | *"Read this before picking anything up."* — *"It is the manager's side of the night — the rulings, the state changed **outside** the repo, the corrections, and what each session left on the floor."* Its § 1 is the only record of five changes `git log` cannot show. |
| `docs/silences.md` | **LIVE — recounted 2026-09-21** | *"The silence census — which checks can tell a pass from a did-not-run"*, opened because a check *"was found to be a check that can only fail"*. **Start at "THE CENSUS RECOUNTED", not at the table under it**; the old numbers are marked superseded rather than corrected. |
| `docs/gotchas.md` | **REFERENCE** | *"Gotchas — ways a measurement lies to you"* — *"Every one of these produced a false reading in this repo at least once. Read before trusting any browser measurement or grep-based check."* **65 entries**, counted 2026-09-21. |
| `docs/how-we-run.md` | **LIVE** | *"How we run — speed, without giving up the proof"* — *"Andrew commissioned two pieces of research. They do not carry equal weight and this file says which wins where."* 405 lines. Holds the reply-card spec and the stale-lane rule. |


**Three tiers, and the tier is the instruction:**

| Tier | Meaning |
|---|---|
| ~~`HANDOFF-2026-09-19.md`~~ | **THIS FILE NEVER EXISTED — see the banner above.** It is also in the wrong table: the other two rows are tiers, this one is a document, so a legend explaining what LIVE/REFERENCE/HISTORICAL mean opens with a row that is neither. The current handoffs are `docs/HANDOFF-2026-09-20.md` (measurement leg) and `docs/HANDOFF-2026-09-20-clients.md` (client screens). **Not the same file as `docs/HANDOFF.md`**, which is the architecture page. |
| **LIVE** | Current. Trust it, and correct it in place when you find it wrong. |
| **REFERENCE** | A finished piece of research or a spec. Still true, rarely changes, read the section you need. |
| **HISTORICAL** | An account of something that already happened. **Do not act on it.** Kept because the reasoning is why the code is the shape it is. |

**The one rule that governs all of it:** the most repeated defect in this
repository is *a file confidently describing something that stopped being
true*. Nine wrong beliefs were found in one pass on 2026-09-08; fifteen check
counts were wrong in another. **Measure, then correct the file, and say IN the
file how you measured it.**

---

## Start here — the four that decide what you do

> **UPDATED 2026-09-13, and this map is no longer the first thing to read.**
> **`START-HERE.md` is**, at Andrew's instruction, because the four files a
> session was being told to read first measure **49,131 words** together — about
> 95% of a clear threshold, spent before any work, and paid again at every clear.
>
> | File | Tier | What it is |
> |---|---|---|
> | ~~`START-HERE.md`~~ | **DELETED 2026-09-16 in `5924e96` — see the banner above. Read `CLAUDE.md` instead.** It carried 1,730 words of what changes what a session DOES: the lanes, the clearing protocol, the 44px tap floor and its `::after` exception, prove-your-instrument, what is frozen, what is settled about translation. One-line pointers to the long files for when the work touches them. |
> | `VERIFIED.md` | **LIVE — read BEFORE measuring anything** | The checked-off ledger. A row is un-proven by a CHANGE, never by age: `git diff --name-only <row commit>..HEAD -- <row paths>`, and empty output means do not re-measure. Its § 2 is five findings Andrew reported and withdrew — never re-report those. |
> | `ECONOMY.md` | **LIVE** | Nine rules for spending his usage. Check the ledger before the product; write a finding once; read the smallest thing that answers the question; clear at a section, never at the ceiling. |

> **UPDATED 2026-09-11 by a truth pass.** Twenty-five docs had appeared since
> this map was written and none were on it, including three of the four status
> files. **The read order below is now five files, not four**, and the status
> files are scoped against each other so that two of them no longer both claim
> to be "the single list".

| File | Tier | What it is |
|---|---|---|
| `../CLAUDE.md` | **LIVE** | Session rules. Loaded automatically into every session. **Keep it under ~70 KB** — it was 232 KB until 2026-09-08 and cost ~42,000 tokens of context before any work was read. |
| `roadmap.md` | **LIVE** | **The plan.** 8,797 lines, phases 0–9. `grep -nE "^- \[( \|~)\] " docs/roadmap.md` is the whole answer to *what is left*. Nothing gets built that is not an item here. |
| `OUTSTANDING.md` | **LIVE** | The one-page VIEW of what is left, split into *on him* / *mine* / *blocked*. A view, never a second source of truth — move it in the roadmap first. |
| `CHECKPOINT.md` | **LIVE — read it FIRST** | Where we are today, one page, overwritten never appended. **Trust nothing in it dated more than two days ago** — the version before 2026-09-11 claimed the live site matched the local build and had been false for five days and 246 commits. |
| `whats-left-2026-09-10.md` | **LIVE** | **The single list FOR THE PRODUCT** — bugs, his walkthrough notes, unbuilt features, the two red suites (§ 9). |
| `review-2026-09-10.md` | **LIVE** | **His own words on all 63 pages.** 15 of 17 done and HE ticked each; 13 and 16 open. Its § FOUND WHILE DOING THE ABOVE carries seven `scripts/`+`tests/` faults that only a build session may fix. |
| `coworker-report-2026-09-08.md` | **LIVE** | What was measured in the real dashboards (Google, Stripe, Netlify, Supabase, Resend, DNS). **§ 3 lists nine things this repo believed that are wrong.** Where it contradicts another file, it wins. |
| `tenant-sites-diagnosis-2026-09-09.md` | **LIVE** | **Why the websites fail, corrected.** The failure is THINNESS, not slop — his own reframe. Supersedes the photograph-only reading. |
| `DEVICE-INVENTORY.md` | **LIVE** | The twenty-one devices a tenant site can carry, each from a site he picked, each with **when NOT to** use it. A page ships with ten or more. |
| `status-2026-09-10.md` | **SUPERSEDED for remaining work** | Its successor says so. **§ 3 — what he has never personally reviewed — is still its own thing.** |
| `whats-left`/`OUTSTANDING`/`CHECKPOINT`/`status` | — | **Four status docs. They are scoped against each other in `OUTSTANDING.md`'s header. Read that boundary before adding a fifth.** |

## Running a session

| File | Tier | What it is |
|---|---|---|
| `weather.md` | **LIVE** | The NWS seam — api.weather.gov, the required User-Agent, the one-module rule, the three honest failures, and why no screen draws it yet. Built 2026-09-13. |
| `verification.md` | **LIVE** | The whole battery, every trap in it, and a lot of PRODUCT facts filed here by accident. Split out of CLAUDE.md 2026-09-08. Grep it before concluding a behaviour is undocumented. |
| `standing-work.md` | **LIVE** | What to do when the roadmap has nothing unblocked. The `/loop` queue, the owner's standing permissions, the stop rule. |
| `sessions/` | **LIVE** | The three parallel session briefs — websites, product, build. One line each to start. |
| `HANDOFF.md` | **LIVE** | Architecture in one page, environment variables, how to run everything. The file to hand a brand-new machine or agent. **Its branch and deploy lines are stale — CLAUDE.md § Ground rules is right.** |
| `CHECKPOINT.md` | **LIVE (but restate before trusting)** | "Where are we", overwritten each checkpoint. Written 2026-09-06 and it says so; two of its own claims were false within the hour. |
| `cloud/README.md` + `cloud/QUEUE.md` | **LIVE** | For a session running in the cloud: no database, no browser, no credentials. The owner starts one with *"Follow docs/cloud/README.md."* |
| `verification-speed-2026-09-02.md` | **REFERENCE** | Why a session takes an hour and the measured fix. Read once. |

## Design and websites

| File | Tier | What it is |
|---|---|---|
| `TASTE-NOTES.md` | **LIVE — outranks every other taste claim** | The owner's own words on 26 sites he chose, plus every one of them opened, measured, and looked at at two widths. **§ BATCH 2 is the brief.** |
| `tenant-site-contract.md` | **LIVE** | § 2 is the twelve things a tenant site owes, each written as *what silently stops working if you omit it*. Non-negotiable. |
| `tenant-site-kit.md` | **LIVE** | The pointer a fresh agent is handed to build ONE detailer's site. A pointer, never a summary. |
| `design-system.md` | **LIVE — but for OUR product only** | "The Thread". **Never read it for a tenant site**; a site built from it comes out as our landing page recoloured, and the owner rejected exactly that. |
| `design-knowledge.md` | **LIVE** | The anti-slop floor, researched 2026-09-07. A FLOOR, not a direction. |
| `tenant-sites/*.html` | **REFERENCE — rejected** | Twenty-one built pages. **The owner does not like any of the current ten** (2026-09-08). Structural range only; never the taste reference. |
| `tenant-sites-2026-09-08.md` | **HISTORICAL** | What each of the ten mock-ups was trying to be. Useful for *why*, not for *what next*. |
| `tenant-site-source-data-2026-09-08.md` | **REFERENCE** | Real detailer prices and services behind the mock-ups. |
| `tenant-site-intake*.md`, `tenant-site-briefs-*.md`, `tenant-site-research-*.md`, `tenant-websites.md` | **REFERENCE** | The intake form, the briefs, the research, and the owner's own words on what he is selling. |
| `design-directions/` | **HISTORICAL** | Phase 1's five candidates. **`5-the-thread.html` is still the reference rendering and outranks `design-system.md` where they disagree.** The other four are spent. |
| `references/` (ANALYSIS, TASTE-NOTES, APPLE-READ, DESIGN-BRIEF) | **REFERENCE** | Batch 1's seven sites, read at code level. |
| `where-to-find-site-references-2026-09-07.md` | **REFERENCE** | Where to go and look at detailer sites. |
| `design-references/` | **EMPTY** | Intentionally. **No inspiration images are stored in this repo** — the screenshots live in `../_repo-shots-archive/shots-taste/` (180 frames, 18 sites, desktop + phone). |

## The dashboard

| File | Tier | What it is |
|---|---|---|
| `dashboard-spec.md` | **REFERENCE** | What the dashboard is supposed to be. |
| `dashboard-phone-pass-2026-08-31.md` | **LIVE for phones** | Overrides the screen designs wherever the two disagree about a phone. |
| `dashboard-skeletons.md` | **REFERENCE** | The arrival budget (§4) is still enforced. |
| `dashboard-*-2026-08-31.md` (architecture, screen-designs, component-inventory, feature-inventory, desktop-spec, screen-research, spec-approval) | **HISTORICAL** | Roadmap 2.11's design record, ~380 KB. Built and shipped. Read a section only when you need to know *why* a screen is shaped a certain way. |
| `dashboard-spec-gap-report.md`, `ux-audit.md`, `detailer-dashboard-audit-2026-09-06.md`, `platform-admin-audit-2026-09-06.md` | **REFERENCE** | Gap lists. **Check each line against the code before acting — a gap list rots exactly like a check count.** |
| `final-pass.md`, `testing/LOOP.md`, `testing/REPORT.md`, `testing/FINDINGS.md` | **REFERENCE** | The testing protocol and one lap of it. |
| `ideas.md` | **LIVE** | Fifty ideas with the owner's verdict on each. `[~]` means he said yes and no roadmap item exists yet — **write the item first**. |

## Money, legal, ops

| File | Tier | What it is |
|---|---|---|
| `setup-steps-2026-09-04.md` | **LIVE — this is the legal checklist** | Go here, click this, why. Everything legal happens in one week in December. |
| `legal-and-tax-2026-09-04.md` | **REFERENCE** | The reasoning behind it: which states to call, sales tax, entity choice. Two of its conclusions were revised in `setup-steps` and the newer one wins. |
| `pricing-2026-09-04.md`, `payments-research-2026-09-04.md`, `plans-research-2026-09-04.md`, `money-view-research-2026-09-07.md` | **REFERENCE** | The research behind what we charge and how money moves. |
| `ops/backups.md` | **WRONG — fix or delete before reading** | Specifies a symmetric passphrase; what was actually built is an `age` keypair. Correction 5 in the coworker report. |
| `ops/monitoring.md`, `ops/backup.workflow.yml` | **LIVE** | The outage watcher and the backup workflow. |
| `custom-domains.md` | **LIVE** | The runbook for pointing a detailer's own address at this app. |

## Accounts of what happened

| File | Tier | What it is |
|---|---|---|
| `../DECISIONS.md` | **LIVE — start at its INDEX** | 1.0 MB, 135 sections. Every judgment call and why. **Never read from the top.** A decision you did not find is worse than one nobody wrote down. |
| `../PROJECT-STATE.md` | **HISTORICAL, append-only** | 427 KB. One section per session since 2026-08-28. Sections 1–7 are a state briefing; everything after is a journal. **Read § 1–7, then only the section for the item you are touching.** |
| `overnight-log.md` | **LIVE** | 179 KB. Every open question put to the owner, and his answers. **An answer sitting unread here is the cheapest work in the building.** |
| `owner-walkthrough-2026-08-30.md`, `timeline-2026-09-04.md`, `google-and-backups-2026-09-07.md`, `the-deploy-is-not-the-push-2026-09-08.md`, `sweep-locators-2026-09-08.md`, `migration-plan-2026-09-06.md`, `reference-audit-2026-09-05.md` | **HISTORICAL** | One session each. |
| `email-research-2026-09-03.md`, `email-clients-2026-09-03.md`, `detailer-research-2026-08-31.md`, `detailer-menu-shapes-2026-08-31.md`, `google-business-profile-research-2026-09-07.md`, `tenant-site-intake-research-2026-09-07.md` | **REFERENCE** | Research, done once, still true. |
| `owner-setup-prompt.md` | **SPENT** | The brief handed to the cloud coworker. Its answer is `coworker-report-2026-09-08.md`, and **§ 3 of that report says three of this file's jobs were already done** — running it again cost the owner a cleanup. Do not re-issue it. |
| `phase1-database.md`, `phase2-engine-and-dashboard.md`, `design-brief.md`, `design-system-analysis.md`, `tour-steps-2.24.md`, `dashboard-skeletons.md` | **HISTORICAL** | Superseded by what shipped. |

---

## If you are new, read exactly this

1. **`CHECKPOINT.md`** — one page, and it tells you what is red today.
2. `../CLAUDE.md` — all of it. It is ~67 KB.
3. **This file.**
4. `roadmap.md` — only the item you are doing.
5. `whats-left-2026-09-10.md` if you are building product;
   `OUTSTANDING.md` § 1 if you are touching anything outside the code.

## The docs not listed above

**Twenty-five files are not in this map and that is a known gap, not an
oversight to fix blindly.** Most are HISTORICAL by the tiers above — the seven
`dashboard-*-2026-08-31.md` design records, the tenant-site research rounds,
`platform-admin-2026-09-04.md`. **The live ones that matter are all in the
tables above.** If you find yourself relying on a file that is not listed here,
that is a signal to check its date before its contents.

That is under 100 KB and it is enough to start. Everything else is looked up
when a specific question arises, and this map is how you find which file has
the answer.
