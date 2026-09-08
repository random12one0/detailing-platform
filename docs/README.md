# The docs, mapped — read this before opening anything else

**Written 2026-09-08.** This repo holds **4.3 MB of markdown**. Nobody reads it
end to end and nothing expects you to. This file is the map: what each document
is, whether it is still TRUE, and which three you actually need for the job in
front of you.

**Three tiers, and the tier is the instruction:**

| Tier | Meaning |
|---|---|
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

| File | Tier | What it is |
|---|---|---|
| `../CLAUDE.md` | **LIVE** | Session rules. Loaded automatically into every session. **Keep it under ~70 KB** — it was 232 KB until 2026-09-08 and cost ~42,000 tokens of context before any work was read. |
| `roadmap.md` | **LIVE** | **The plan.** 8,797 lines, phases 0–9. `grep -nE "^- \[( \|~)\] " docs/roadmap.md` is the whole answer to *what is left*. Nothing gets built that is not an item here. |
| `OUTSTANDING.md` | **LIVE** | The one-page VIEW of what is left, split into *on him* / *mine* / *blocked*. A view, never a second source of truth — move it in the roadmap first. |
| `coworker-report-2026-09-08.md` | **LIVE** | What was measured in the real dashboards (Google, Stripe, Netlify, Supabase, Resend, DNS). **§ 3 lists nine things this repo believed that are wrong.** Where it contradicts another file, it wins. |

## Running a session

| File | Tier | What it is |
|---|---|---|
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

1. `../CLAUDE.md` — all of it. It is 66 KB now.
2. **This file.**
3. `roadmap.md` — only the item you are doing.
4. `OUTSTANDING.md` § 1 and § 3.
5. `coworker-report-2026-09-08.md` § 3.

That is under 100 KB and it is enough to start. Everything else is looked up
when a specific question arises, and this map is how you find which file has
the answer.
