# What is still left — the whole list, in one place

**Written 2026-09-08 at his ask:** *"what else is on the to do list? because
there's... I feel like I've kinda given you a lot of things and interrupted you
a lot to make sure that we're keeping track of everything that we still have to
do... and write it all on docs properly."*

**THIS FILE IS A VIEW, NEVER A SECOND SOURCE OF TRUTH.** `docs/roadmap.md` is
the plan and every line here points at an item in it. It exists because that
file is 8,600 lines and the answer to *"what is left"* is currently spread
across unchecked boxes, `[~]` half-items, questions in `docs/overnight-log.md`
and things he said out loud. **A view that starts disagreeing with the roadmap
is worse than no view** — so when an item moves, move it in the roadmap first
and mirror it here in the same edit.

**HOW IT WAS BUILT, so the next session can rebuild it rather than trust it:**
every `- [ ]` and `- [~]` line in `docs/roadmap.md`, plus the unanswered
questions in `docs/overnight-log.md`, read one at a time on 2026-09-08.

```
grep -nE "^- \[( |~)\] " docs/roadmap.md
```

---

## 1. ON HIM — and it is FOUR things, not eight

Everything else that was ever on his list has been answered or refused. The
page he actually reads is
https://claude.ai/code/artifact/e7683fbc-9436-48cb-ae47-c1868167205b

| | What | Why only he can | Time |
|---|---|---|---|
| **1** | **Turn on Google sign-in** (roadmap 2.25) | A Google Cloud OAuth client on his account, then one toggle in Supabase. The button is BUILT and hides itself until the provider is on. | 10 min, free |
| **2** | **Does a mailbox exist on `detailingplatform.com`?** | Google Business Profile's application form rejects a Gmail address. One-minute answer; if no, setting it up is MINE. | 1 min |
| **3** | **The site gallery** (roadmap 9.1) — *mostly delivered 2026-09-08* | His taste, and nobody else's. **He sent 21 links with a verdict on each on 2026-09-08** — see `docs/TASTE-NOTES.md` batch 2. That is enough to start 9.2. | done for now |
| **4** | **Two one-word answers** — a detailer's email on their site (switch? recommended), and whether the price editor should refuse an odd ladder (keep warning? recommended) | Both are business calls, not code ones. | 30 sec |

### Off his list for good — do not re-raise any of these

| Thing | Why it is closed |
|---|---|
| Stripe's business address | **He is not old enough to complete the form.** Blocked by a fact, not a preference. The no-tax fallback cannot under-collect. `overnight-log` Q19. |
| Resend $20/month | **Decided:** upgrade when a real detailer nears the cap. The back office already prints *"Emails: N of 100 today"* and reddens at 80. A 429 in OUR OWN test runs is not the trigger. Q20. |
| Supabase Pro $25/month for backups | **Refused.** Backups go to GitHub instead — see § 2. Q21. |
| Send me detailer sites you like | **Done 2026-09-08.** Twenty-one links. |
| The outage watcher | **Done and proven** 2026-09-07. A real ping reached his monitor. The *"one box left"* heading was a copy defect, not remaining work. Q22. |
| Phone landscape | Ruled out by him 2026-08-31: portrait only. Roadmap 2.16, closed unstarted. |
| Travel priced by measured distance | Refused by him. Roadmap 2.15. |

---

## 2. DELEGATED TO HIS CLOUD COWORKER — the backup repo

> *"Yeah. We'll do another gap repo. I'm having a a cloud... code... cloud
> coworker do all the stuff for me."* — 2026-09-08, answering the private-repo
> question.

**HE HAS SAID YES AND IT IS NOT MINE TO BUILD.** Roadmap 2.22 is already
**written and documented** — this is the *"some stuff he needed to do for me"*
he remembered:

- the workflow: `docs/ops/backup.workflow.yml`
- the ten-minute switch-on: `docs/ops/backups.md`

**Everything that agent needs is in those two files.** Three things from this
repo that would otherwise cost an afternoon each:

1. **The destination MUST be a private repo.** `random12one0/detailing-platform`
   is **public**, a dump is real customers' names, phone numbers and home
   addresses, and git keeps a committed file after it is deleted. This was
   already the roadmap's own rule before he was asked.
2. **GitHub runners are IPv4-only and a free Supabase project's DIRECT
   connection resolves to IPv6.** Use the **session pooler on 5432**; the
   transaction pooler does not work with `pg_dump`.
3. **The workflow file is deliberately not under `.github/`.** GitHub refuses a
   push creating one unless the token carries the `workflow` scope.

**IT IS NOT DONE UNTIL ONE RESTORE HAS HAPPENED.** The item's own acceptance
test: *a backup nobody has restored is not a backup.* Restore once into a
scratch project or 2.22 stays `[~]`.

---

## 3. MINE, UNBLOCKED, IN THE ORDER I WOULD DO THEM

1. **The website research he asked for — IN FLIGHT.** All 18 sites he sent were
   opened at 1440x900 and measured on 2026-09-08 (`taste-probe.tmp.mjs`).
   Findings go in `docs/TASTE-NOTES.md`; the five sites built from them are the
   deliverable. **This is what he told me to get back to.**
2. **Roadmap 8.17 Spanish, stage 2b — PAUSED BY HIM 2026-09-07** and left
   honestly unfinished: the dashboard is translated and proven by reading it in
   a browser, but **the width sweep in Spanish has never passed at all five
   widths.** Commit `294a7eb` says so. Resume only when he says.
3. **Roadmap 9.2 — the gallery screens.** Newly unblocked by his 21 links. A
   `site_examples` table, back-office management, customer browse-and-favourite.
   **It must NOT live in this repo** — other designers' work does not go in a
   public repo.
4. **Roadmap 6.1 / 6.2 — a believable demo business** with ~3 months of
   obviously-fictional history and a reset script.
5. **Roadmap 9.5 — ten example sites at `/example1…10`.** `[~]`: the routing is
   built and shipping; what is left is replacing the pages themselves once the
   taste work lands.

## 4. BLOCKED, AND ON WHAT

| Item | Waiting on |
|---|---|
| **2.20 stage 3** — Stripe Connect, so a *detailer* can take cards | Stage 3 is the whole of what is left. It also unlocks charging for monthly plans (2.14). Needs a Stripe decision that is downstream of his age constraint. |
| **7.2** — Sentry error monitoring | **His DSN.** A free account. Not urgent while nobody is on the product. |
| **8.9** — the advanced money view | **The CUSTOMER-entered tip**, which does not exist yet — three of his six money figures are tip figures. Also two of the four questions in `docs/money-view-research-2026-09-07.md` § 6. |
| **8.15** — referral links and loyalty | **What a referral actually earns.** A month free, cash, a discount? Cannot be guessed: it comes out of his margin. |
| **8.16** — Google Business Profile | § 1 item 2, then two Google reviews in a fixed order (API access ~2 weeks, then sensitive-scope verification 3–5 days). **Build nothing until the first is answered.** |
| **5.1 / 5.2 / 5.3** — moving his real business onto the platform | **The old project's `service_role` key.** The mapping is written and tested (`tests/legacy-import.test.mjs`, 47 checks); the I/O half has never run because the key in `.env` answers 403. **Hold this until the day he wants the move** — that key reads and writes a business taking real money. |
| **7.4** — founding-offer price sanity check | Him, and only worth asking once there is a real detailer to sell to. |
| **9.3 / 9.4** — the site intake and the configurable advanced feature | 9.2. |

---

## 5. THE RULE THIS FILE EXISTS TO ENFORCE

**Check every ask against the record before it reaches him.** On 2026-09-08 he
was handed an eight-job page built from researching each external service, and
**three of the jobs were things he had already decided** — he had to say so
twice. His words: *"a lot of the stuff on this artifact ... are things that I
already answered. So, um, that's confusing."*

**A list of what he COULD do is not a list of what he still HAS to do**, and
only the record can tell them apart. The full account is `docs/overnight-log.md`
questions 19–22.
