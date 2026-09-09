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

**AND A SECOND SOURCE FEEDS IT SINCE 2026-09-08: `docs/coworker-report-2026-09-08.md`** — what his cloud coworker measured in the actual dashboards. **Nine beliefs in this repo turned out to be wrong**, four of them pointing at work that is already done or is not needed, so read that file's § 3 before building anything this file lists.

---

## 1. ON HIM — and it is FIVE things, not eight

<!-- The count in this heading is a fact that rots: it has been wrong twice.
     Count the table rows rather than trusting the number. -->

**Nothing here takes more than a couple of minutes, and none of it is code.**

Everything else that was ever on his list has been answered or refused. The
page he actually reads is
https://claude.ai/code/artifact/e7683fbc-9436-48cb-ae47-c1868167205b

| | What | Why only he can | Time |
|---|---|---|---|
| **1** | ~~**Turn on Google sign-in**~~ **SWITCHED ON — measured 2026-09-08, `/auth/v1/settings` answers `google: true`, so the button is LIVE on the sign-in screen.** What is left is not the toggle: Google's Audience page refuses *Publish app* AND saving a test user while Branding is incomplete, and **the only empty fields are the privacy policy and terms URLs**. Both pages are public and render on the live site. **He pastes `https://detailingplatform.com/privacy` and `https://detailingplatform.com/terms` into the Branding page.** Not a code task and not a bug — do not chase it as one. **~~2 min~~ DONE 2026-09-08 — he had his cloud coworker paste both.** What that session then reported is § 9 below, and reading it produced one real change and three false alarms. | done |
| **2** | ~~**Does a mailbox exist on `detailingplatform.com`?**~~ **ANSWERED 2026-09-08: YES — `andrew@` and `support@`, on iCloud Mail, and they existed before anybody asked.** The DNS is on **NS1**, not Cloudflare and not Netlify. The GBP application was filed from `andrewswashing@gmail.com` anyway, because that account holds the verified listing and the form has no contact-email field. | done |
| **2b** | ~~**Read Resend's actual billing plan** — the counter may be measuring against a limit that does not exist.~~ **ANSWERED 2026-09-08, AND THE DOUBT WAS WRONG. The plan is FREE, confirmed on the billing page** — Transactional, 3,000/month at $0, no payment method on file. **Monthly 570 / 3,000 (19%, fine). DAILY 117 / 100 — ALREADY OVER, right now, and still delivering.** So the cap is REAL, Resend displays it, and **the back office's *"Emails: N of 100 today"* is correct. Do not remove or change that counter.** What it is is a SOFT limit at this level, not a hard block. **The upgrade decision is now weaker than it looked — see § 11.** | done |
| **2c** | ~~**Two things in the Stripe dashboard** — the `ca_…` client id, and the webhook endpoint told to listen to events on CONNECTED accounts, a separate setting.~~ **BOTH HALVES WERE WRONG — corrected 2026-09-08 from the dashboard.** The client id **is already set** (`STRIPE_CONNECT_CLIENT_ID`, verified in Supabase edge secrets, 8 Sep) — so that half is DONE. And **there is no such setting**: a Stripe endpoint's *"Events from"* is **CREATE-ONLY**, immutable beside the payload style and the API version, so the existing endpoint is permanently scoped to *"Your account"* and cannot be pointed at connected accounts. **It takes a SECOND endpoint, which issues a NEW signing secret** — see § 10. | see § 10 |
| **3** | **The site gallery** (roadmap 9.1) — *mostly delivered 2026-09-08* | His taste, and nobody else's. **He sent 21 links with a verdict on each on 2026-09-08** — see `docs/TASTE-NOTES.md` batch 2. That is enough to start 9.2. | done for now |
| **4** | **Two one-word answers** — a detailer's email on their site (switch? recommended), and whether the price editor should refuse an odd ladder (keep warning? recommended) | Both are business calls, not code ones. | 30 sec |
| **5** | **Is `ENTITY` right?** `app/src/landing/legal.js` now prints *"Andrew Dietrich, doing business as Detailing Platform"* at the top of `/privacy` and `/terms`. **It is a GUESS at his paperwork** — sole trader, a DBA on his own name and an LLC are three different legal persons, and only he knows which one signs. One constant, one line to change, and free to change until somebody has actually agreed to those terms. | 30 sec |

### Off his list for good — do not re-raise any of these

| Thing | Why it is closed |
|---|---|
| Stripe's business address | **He is not old enough to complete the form.** Blocked by a fact, not a preference. The no-tax fallback cannot under-collect. `overnight-log` Q19. |
| Resend $20/month | **Decided:** upgrade when a real detailer nears the cap — *"when a real detailer gets close"*, re-confirmed 2026-09-08. A 429 in OUR OWN test runs is not the trigger. Q20. ~~**But the CAP ITSELF is now in doubt.**~~ **THE CAP IS REAL — measured on the billing page 2026-09-08, and the daily figure was 117 of 100 at the time. This is BACK ON HIS LIST as § 11**, because the premise the deferral rested on has changed: the cap is being exceeded on internal traffic alone, with zero customers. |
| Referral rewards | **Skipped entirely, 2026-09-08**, until there are detailers who could refer each other. That closes what § 4 lists against roadmap 8.15 — it is not waiting on him deciding what a referral earns; he has deferred the whole feature. |
| Moving his own business onto the platform | **PARKED, and the INTENT is corrected: it is a COPY for DOGFOODING, not a cutover.** His live business keeps running and keeps taking real money throughout. **He has deliberately not shared the old project's `service_role` key — do not ask for it.** |
| A postal address on the legal pages | **Dropped entirely, his call 2026-09-08** — email only, rather than publishing a home address. |
| Supabase Pro $25/month for backups | **Refused.** Backups go to GitHub instead — see § 2. Q21. |
| Send me detailer sites you like | **Done 2026-09-08.** Twenty-one links. |
| The outage watcher | **Done and proven** 2026-09-07. A real ping reached his monitor. The *"one box left"* heading was a copy defect, not remaining work. Q22. |
| Phone landscape | Ruled out by him 2026-08-31: portrait only. Roadmap 2.16, closed unstarted. |
| Travel priced by measured distance | Refused by him. Roadmap 2.15. |

---

## 2. ~~DELEGATED TO HIS CLOUD COWORKER~~ — THE BACKUP REPO IS BUILT AND RUNNING

> **DONE 2026-09-08.** It came back from the cloud coworker as a brief rather
> than as a finished thing, and was finished here. What is below the line is
> kept because its three warnings are still the reasons it works.

**`random12one0/detailing-platform-backups` is private, holds exactly five
files, and has produced a real encrypted backup.**

| | |
|---|---|
| Release | `backup-2026-09-08` |
| Asset | `dump-2026-09-08.pgc.age`, **714,366 bytes** |
| Raw dump | 714,006 bytes — well clear of the 50 KB "this looks empty" floor |
| Proven encrypted | downloaded and read by hand: begins `age-encryption.org/v1` with an X25519 stanza, and **not** `PGDMP` |
| Schedule | 02:10 Pacific nightly, plus `workflow_dispatch` |

**Two things about getting it up are worth keeping, because both cost time and
neither is guessable:**

1. **`gh auth refresh -h github.com -s workflow` FAILED with *"not logged in to
   any hosts"* while `gh auth status` said the opposite.** The credential is in
   the Windows **keyring** and `hosts.yml` carries the host with no token in
   it, which gh 2.96's `refresh` cannot cope with. What worked was a fresh
   login carrying the scope:
   `gh auth login --hostname github.com --scopes workflow --git-protocol https --web`.
   Without `workflow`, GitHub refuses the workflow file **and the REST contents
   API answers 404 rather than 403**, which reads as a missing repository.
2. **The first run failed and it was NEITHER cause the brief predicted** (not
   the `[YOUR-PASSWORD]` brackets, not the direct-vs-pooler mix-up — the pooler
   was already right). Postgres said `FATAL: database "postgres⏎" does not
   exist`: **the secret had been saved with a trailing newline**, which lands
   on the last path segment and becomes part of the database NAME. The workflow
   trims it now (`tr -d "[:space:]"` — a connection string has no legitimate
   whitespace) and `::add-mask::`s the trimmed value, **because it differs from
   the secret GitHub knows about and so is not covered by GitHub's own
   masking.**

**STILL OPEN, AND THE SECOND ONE IS THE ACCEPTANCE TEST:**

- ~~**`HEALTHCHECK_URL` is not set.**~~ **THE CHECK EXISTS AS OF 2026-09-08** —
  *"detailing platform - nightly backup"*, period 1 day, **grace 6 HOURS**,
  email attached. **The wide grace is deliberate and is the interesting part:**
  the scheduler's check runs a 30-minute grace, and copying that here would page
  on a merely SLOW backup rather than a failed one, because **GitHub's cron
  routinely runs late.** An alarm that cries wolf is one nobody reads — the same
  argument this repo already makes about the dead man's switch ringing once.
  **He is pasting the ping URL into GitHub as `HEALTHCHECK_URL`; the workflow
  already reads that name, so there is no code change.** (Still not the same URL
  as `platform_settings.healthcheck_url`, which watches a different job — and
  **that one is confirmed GREEN**, last ping four minutes before it was looked
  at, so job 0 is genuinely running.)
- **Nothing has ever been restored**, so 2.22 stays `[~]`. Needs a scratch
  Supabase project and the age private key, which is in his password manager
  and deliberately nowhere else — not in CI, not in this repo, not here.

---

### The original brief, kept for its three warnings

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

1. ~~**The website research**~~ **DONE 2026-09-08, and it went further than the
   brief.** All 18 sites measured (`taste-probe.tmp.mjs`), all 18 home pages
   LOOKED AT, then every site crawled page by page — **855 frames across 18
   sites, plus a 392x844 phone pass.** `docs/TASTE-NOTES.md` batch 2 is the
   result: §0–§6 measured, §A–§F visual, §G–§J phone, §K–§N inner pages,
   §O all eighteen one read each.
2. ~~**The five sites built from it**~~ **SUPERSEDED — he asked for TEN, and
   they are built.** `docs/tenant-sites/l-` through `u-`, serving at
   /example1…10. No two share a kind of ground; four have no animation at all;
   every one carries the contract's twelve and marks each managed figure
   `data-live`. Real detailer data behind them:
   `docs/tenant-site-source-data-2026-09-08.md`.
3. ~~**Roadmap 2.20 stage 3 — Stripe Connect**~~ **THE SERVER HALF IS BUILT,
   DEPLOYED AND CHECKED, 2026-09-08 — and § 4 was WRONG to call it blocked.**
   `Standard` connected accounts have no age requirement (Express and Custom
   do), and all of Connect works in test mode, so this could have been built at
   any point in the last week. `_shared/connect.ts`, `connect-account`,
   `pay-booking`, the webhook's `event.account` branch and
   `connected_accounts` — 83 credential-free checks, fifteen breaks, migration
   applied, four functions deployed, endpoints probed live. **What is left: the
   two SCREENS, one real card payment, and § 1 row 2c.**

4. **Roadmap 8.17 Spanish, stage 2b — the last unfinished verification.**
   Paused by him on 2026-09-07 so the artifact could be built; that artifact
   shipped, and on 2026-09-08 he asked to *"finish anything else that is...
   needs to be done that's on the to do list that you could do."* The dashboard
   is translated and proven by reading it in a browser; **the width sweep in
   Spanish had never passed at all five widths** (commit `294a7eb` says so).
   Running now.
5. **Roadmap 9.2 — the gallery screens.** Newly unblocked by his 21 links. A
   `site_examples` table, back-office management, customer browse-and-favourite.
   **It must NOT live in this repo** — other designers' work does not go in a
   public repo.
6. **Roadmap 6.1 / 6.2 — a believable demo business** with ~3 months of
   obviously-fictional history and a reset script.
7. ~~**Roadmap 9.5 — ten example sites**~~ **DONE 2026-09-08.** The routing was
   already built; the ten pages it serves are now the ten built on his own taste
   evidence rather than the eleven that predate it.

## 4. BLOCKED, AND ON WHAT

| Item | Waiting on |
|---|---|
| ~~**2.20 stage 3** — Stripe Connect~~ **NOT BLOCKED, AND NEVER WAS. The SERVER HALF IS BUILT, DEPLOYED AND CHECKED — 2026-09-08.** | **The age constraint in this row was wrong**: Express and Custom accounts require the holder to be 18, **`Standard` does not**, and every part of Connect works in TEST MODE with no activated account. Connect was in fact **already enabled** on the sandbox account with a Standard connected account sitting on it. What is left is the two SCREENS, one real payment, and § 1 row 2c's two dashboard settings. |
| **7.2** — Sentry error monitoring | **His DSN.** A free account. Not urgent while nobody is on the product. |
| **8.9** — the advanced money view | **The CUSTOMER-entered tip**, which does not exist yet — three of his six money figures are tip figures. Also two of the four questions in `docs/money-view-research-2026-09-07.md` § 6. |
| ~~**8.15** — referral links and loyalty~~ **CLOSED FOR NOW, 2026-09-08** | He **skipped the whole feature** until there are detailers who could refer each other. So it is not waiting on him naming a reward — it is deferred. |
| **8.16** — Google Business Profile | **Application ONE IS SUBMITTED — case 6-3052000042070, 8 Sep, 7–10 business days** (not the ~2 weeks this row said), filed from `andrewswashing@gmail.com` because that account holds the verified listing. **Quota reads 0 until it lands; a non-zero quota IS the approval.** Application two (the sensitive-scope OAuth review) correctly waits. **Build nothing until the first is answered.** Detail: `docs/coworker-report-2026-09-08.md` § 4. |
| **5.1 / 5.2 / 5.3** — moving his real business onto the platform | **The old project's `service_role` key.** The mapping is written and tested (`tests/legacy-import.test.mjs`, 47 checks); the I/O half has never run because the key in `.env` answers 403. **Hold this until the day he wants the move** — that key reads and writes a business taking real money. **AND THE INTENT IS CORRECTED, 2026-09-08: it is a COPY for DOGFOODING, never a cutover.** His live business keeps running and keeps taking money throughout, and **he has deliberately not shared the key. Do not ask for it.** |
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

---

## 6. THE ONE THAT BLOCKS HIM SEEING ANYTHING — 2026-09-08

**`detailingplatform.com` DOES NOT BUILD FROM GITHUB PUSHES, AND CLAUDE.md SAYS
IT DOES.**

He asked: *"can u make it so u dont have to sighn up to veiew rthe examples"*.
There is no sign-up gate. `/example1` returns the SPA — verified with curl,
`200`, `<title>Detailing Platform</title>` — because `_redirects` sends every
unmatched path to `index.html` and **the example pages have never been on the
live site at all.**

**Measured through the Netlify API, not assumed:**

```
  site            detailplatform-admin-test  ->  detailingplatform.com
  current deploy  6a9df606…  state: ready
  created         2026-09-06T23:23:50Z
  commit_ref      c47cfae   ("the ground, and the rail…")
  deploy_source   api        has_source_zip: true
```

**A push to `main` at 06:26 on 2026-09-08 created NO new deploy** — twenty
minutes later `currentDeploy` was still the 6 September one and the live bundle
hash was unchanged. **`deploy_source: "api"` with a source zip is a manual or
CLI upload, not a git-triggered build.**

**SO CLAUDE.md's "A PUSH TO `main` IS A PUBLISH — there is no second step to
forget" IS WRONG TODAY.** It was written on 2026-08-30 from an observation that
was true then. It has quietly stopped being true, and it is load-bearing: it is
why every session has assumed the live site tracks this branch. **The live site
is 75 commits behind and nothing was going to change that on its own.**

The live commit IS an ancestor of `HEAD` (`git merge-base --is-ancestor` says
yes), so no work is at risk and a deploy is a strict fast-forward.

**A DEPLOY WAS ATTEMPTED AND FAILED, and that is where this stops.** The Netlify
MCP's `deploy-site` returns a `npx @netlify/mcp --site-id … --proxy-path …`
command that zips the repo and builds it in Netlify's system. It uploaded and
then returned **`500 Internal Server Error`** from the build API. Retried once,
same result. **Not something this session can fix from here** — it needs either
the dashboard or a reconnected git integration.

### THE ACTUAL CAUSE — found 2026-09-08, and it is NOT what the section above
### first inferred

**Netlify is refusing to build because the account is out of build credits.**

```
  deploy 6aa06f7b…   state: error   skipped: true
  error_message:     "Skipped due to account credit usage exceeded"
```

**That explains everything at once** — why a push to `main` produces no deploy,
why the live site has been frozen on 6 September, and why the site's last
successful deploy was a manual upload. Every triggered build since then has
been silently SKIPPED, which from outside looks exactly like a disconnected
git integration.

**THE EARLIER INFERENCE IN THIS SECTION WAS WRONG AND IS LEFT STANDING ON
PURPOSE.** `deploy_source: "api"` on the last good deploy is real, and reading
it as "the repo is not connected" was reasonable — and it would have sent him
to reconnect a repo that is connected fine. **The evidence that settled it was
the error string on a deploy I triggered myself**, which no amount of looking
at the last SUCCESSFUL deploy would ever have produced.

**AND THE FIRST TWO ATTEMPTS FAILED FOR A DIFFERENT REASON, WHICH MASKED THIS
ONE.** They returned `500 Internal Server Error` during upload, because the
deploy tool zips the WORKING DIRECTORY and this one was **1.3 GB** — 99
gitignored screenshot folders from past sessions (`screenshots/`, `shots/`,
`shots-2.7/`, …) totalling about 700 MB. Moved to
`../_repo-shots-archive/`; the tree is 238 MB and the upload then succeeded.
**A 500 on upload and a skip on build are two different failures and the first
hid the second.**

### What he has to do — and there are three options now


1. **Deploy the PRE-BUILT files, which needs no build credits at all.** This is
   the one to try first — a direct upload skips Netlify's build system:
   ```
   npm run build --prefix app
   npx netlify deploy --prod --dir=app/dist
   ```
   It will ask him to log in once. **This session could not do it**: there is
   no Netlify token in `.env`, the CLI is not installed, and the only deploy
   route available here is the MCP's zip-and-BUILD, which is the exact thing
   the credit limit blocks.
2. **Or top up / reset the Netlify build credits.** They reset monthly on a
   free plan. Until they do, EVERY push is skipped silently — there is no
   failed-build email to notice, which is why this went unremarked for two
   days.
3. **Keep the tree slim either way.** The 1.3 GB of scratch screenshots is why
   the upload 500'd twice before it got as far as being skipped.

**Until one of those happens, nothing this session built reaches the live site**
— not the ten example pages, not the Spanish dashboard, not the booking-page
crash fix that production has been carrying since 2026-08-31.

---

## 7. ANOTHER SESSION IS WORKING IN THIS SAME REPO — 2026-09-08

**Established by evidence, not suspicion.** While this session was running,
commits appeared in the same repository that it did not make:

```
  a2d3714  13:33  Connect stage 3's server half is LIVE — deployed, probed…
  0965e4e  13:29  Connect stage 3 is checked — 83 checks, fifteen breaks…
  e6c7020  13:27  (this session — the Netlify credits finding)
  c1d3043  13:20  Connect stage 3: the webhook branch and 83 checks — WIP…
```

**Its commits sit either side of this session's.** It is doing roadmap 2.20
stage 3 (Stripe Connect), it has edited `tests/connect.test.mjs` in the working
tree, and it has rewritten CLAUDE.md's `main`-is-a-publish rule — **incorporating
the Netlify finding this session committed at 13:27, within minutes.**

**That also explains the two mystery touches** this session spent time
diagnosing: `landing/legal.js` and `landing/LegalPage.jsx` having their mtimes
moved mid-sweep, twice, on files it never opened. CLAUDE.md already warns that
*a second agent or session working in this same directory does it to you without
your knowing* — this is that, observed.

### What this session did about it

- **Left every one of their changes alone**, committed and uncommitted.
- **Wrote its own documentation into NEW files** — `tenant-sites-2026-09-08.md`
  and `sweep-locators-2026-09-08.md` — rather than appending to CLAUDE.md, which
  they had open with uncommitted edits.
- **Did not revert, restage or "tidy"** `tests/connect.test.mjs`.

### What he should know

**Two agents sharing one working tree is workable but not free.** A browser
script here takes ~9 minutes and is invalidated by any `app/src` write; the
source guard now tells a touch from a real edit, which removes the false alarms
but not the real ones. **If both sessions edit `app/src` at once, whichever is
running a sweep is measuring a page that reloaded under it.**

**The cheapest fix is a convention, not a tool:** one session owns `app/src` at
a time, and the other works in `docs/`, `scripts/` or `tests/`. That is roughly
what happened here by luck — this session was in scripts and docs while the
other was in the edge functions.

---

## 8. WHERE THE SCRATCH SCREENSHOTS WENT — 2026-09-08

**99 gitignored directories, about 700 MB**, moved to `../_repo-shots-archive/`:
`screenshots/`, `shots/`, `shots-2.4/`, `shots-2.7/`, `shots-31-b/` and the rest
of the accumulated per-item output from past sessions.

**They were moved because they broke the deploy.** The Netlify deploy tool zips
the WORKING DIRECTORY, not the git tree, so `.gitignore` does not save it — the
repo was **1.3 GB** and the upload returned `500 Internal Server Error` twice.
At 238 MB it went through (and was then skipped for build credits, § 6).

**Nothing tracked was touched.** Delete the archive whenever; the current
session's own output — `shots-taste/`, `shots-full/`, `shots-mocks/` — is still
in the repo and still gitignored, and should be moved or deleted before the next
deploy attempt for the same reason.

---

## 9. THE PRIVACY POLICY AND GOOGLE — 2026-09-08, and three of the four asks were already done

**Where this came from:** his cloud coworker pasted the two Branding URLs into
Google, then read the resulting `/privacy` page and came back with four changes
it said the policy needed before the sensitive-scope verification.

**He flagged the catch himself, and he was right:** *"that was using the
published version… and since I ran out of credits, if it's not updated."*

**IT WAS NOT UPDATED, AND THAT IS THE WHOLE EXPLANATION FOR THREE OF THE FOUR.**
Measured by downloading both bundles and grepping them rather than by opening
the page:

```
                            LIVE (index-nOASGAhD.js)   LOCAL (index-DgMEktHO.js)
  "four companies involved"          1                          0
  "The companies involved"           0                          1
  "Signing in with Google"           0                          1
  "Limited Use"                      0                          1
```

| Its ask | Verdict |
|---|---|
| Add the three things Google sign-in gives us | **Already in the source since 2026-09-07.** |
| Add the Limited Use disclosure | **Already there**, with the policy URL and the revoke link. |
| Make the companies list read five, not four | **Already done, and done better** — the heading carries NO count at all now, because *a count in a heading is a fact that rots.* |
| Add the Business Profile paragraph | **GENUINELY MISSING, and now added.** |

### The one real change, and why the file's own rule had to bend

`legal.js` carried a deliberate, reasoned comment refusing to describe the
Business Profile sync: `business.manage` is not on the consent screen, the
feature is not built, and *"describing it here would be describing something
that does not exist, which is the one thing this file refuses to do."*

**That rule is right and it was wrong here, for a reason that lives outside the
codebase.** The API application filed on 2026-09-08 — case 6-3052000042070 —
**describes the sync in its own use case, verbatim.** So a Google reviewer now
reads that sentence and then opens this page, and a privacy policy that never
mentions Business Profile data is a mismatch **with the application it is being
read against.** That is a closed support case, and no amount of correctness
inside this repo would have caught it.

**The honesty rule is kept by saying so in the paragraph**: it opens by stating
the feature is not switched on, and describes what WILL happen rather than what
does — which is what a disclosure is for, and is why Google wants it before
granting a scope rather than after.

`EFFECTIVE` moved to 8 September 2026, because the words moved.

### THE PART THAT IS NOT DONE

**None of it is live.** The live `/privacy` still says *"The four companies
involved"* and has no Google section at all — it is the 6 September bundle, and
§ 6 is why. **So the policy Google would read TODAY is the one the coworker
read**, and every fix above reaches nobody until the deploy is unblocked.

**Sequence this correctly:** deploy first, then submit application two. Filing
the sensitive-scope verification against the stale page is the rejection this
whole entry exists to avoid.

---

## 10. STRIPE CONNECT'S WEBHOOK — a setting that does not exist, and dead code nobody could see

**Came from his cloud coworker, 2026-09-08, verified in the Stripe dashboard.**
It corrects this file, `CLAUDE.md` and the roadmap at once, and it found a
defect no check in this repo could ever have found.

### The fact

**A Stripe webhook endpoint's *"Events from"* is CREATE-ONLY.** It cannot be
edited afterwards — not in the dashboard, not through the API. It sits with the
payload style and the API version as immutable metadata on the endpoint.
`we_1UCMpdJeoZO7o6Eenofj0orr` is permanently scoped to **"Your account"**.

### What that means, and it is worse than a wrong instruction

**Roadmap 2.20 stage 3's routing was DEAD CODE.** `stripe-webhook` branches on
`event.account` — present on an event from a connected account, absent on one
about our own — and that branch was written, reviewed, pinned by
`tests/connect.test.mjs` § 6, deployed, and **could never once have run**,
because the only registered endpoint by construction never sends that field.

**Nothing in this repo could have caught it.** Every test that reads the source
passes. The function is deployed and current. `check-deployed` is green. The
defect is entirely in a dashboard this codebase cannot see — which is the same
shape as the Netlify build credits in § 6 and the Google branding fields in § 1.
**Three of this project's live blockers have now been facts about somebody
else's admin panel.**

### What was done here

**The code change, because a second endpoint issues its OWN signing secret** —
that is the half the correction did not reach. A connected event signed with
the new secret fails verification against `STRIPE_WEBHOOK_SECRET` and comes
back 400, and the symptom is the worst available: **card payments silently
never recorded, beside a perfectly healthy billing endpoint.**

- `_shared/stripe.ts` gains `connectWebhookSecret()`, reading
  **`STRIPE_CONNECT_WEBHOOK_SECRET`** — the name is now fixed in code, so it is
  no longer a decision anybody has to make.
- `stripe-webhook` **tries both secrets in turn.** Deliberately *tried* rather
  than *chosen*: picking the key from an unverified `event.account` is
  arguably safe and is a sentence somebody has to reason about correctly every
  time they read it. Two HMACs is nothing.
- Kept **separate** from `STRIPE_WEBHOOK_SECRET`, which the live billing
  endpoint uses and which is untouched.
- Empty is not an error — it means Connect's webhook is not on yet.
- `connect.test.mjs` § 7: eight checks, three of them behavioural, all four
  breaks caught, restored run 91/0.
- **Deployed.** Four functions went stale on the `_shared` change
  (`connect-account`, `pay-booking`, `platform-billing`, `stripe-webhook`);
  all four redeployed, all 32 current, suites re-run against the running
  copies, and the live endpoint still answers **400** to an unsigned POST.

### WHAT IS ON HIM — and it is two things now, not two settings

**Not created yet as of 2026-09-08 — partially configured, then abandoned
cleanly. Nothing saved, nothing to clean up.** Create it with EXACTLY this:

| Field | Value |
|---|---|
| Event destination scope | **Connected accounts** |
| **API version** | **`2024-06-20` — DO NOT ACCEPT THE DEFAULT.** See the trap below. |
| Events | `account.updated`, `account.application.deauthorized`, `checkout.session.completed`, `payment_intent.succeeded` |
| Destination | webhook endpoint, the same function this repo already deploys: `<SUPABASE_URL>/functions/v1/stripe-webhook` |
| Then | copy its **NEW** signing secret into Supabase edge secrets as **`STRIPE_CONNECT_WEBHOOK_SECRET`** — that exact name, the code reads it. **Leave `STRIPE_WEBHOOK_SECRET` alone**; the live billing endpoint uses it. |

### THE TRAP, and it would have cost a day

**Stripe's create-endpoint form defaults the API version to
`2026-08-26.dahlia`. The existing endpoint, and every line of this code, is
`2024-06-20`.** An endpoint is registered AT a version and Stripe renders every
event to that version's shape, so a second endpoint on the default sends
**differently-shaped payloads for the same events**.

**AND IT PASSES EVERY CHECK IN THIS REPO**, because they all run against the
pinned shape. It fails only in production, quietly. **This repo has already
measured that exact damage once**: at `2024-06-20` an invoice carries `charge`;
at a newer version it does not, so the decline reason went silently null and
the email stopped printing the one line a detailer can act on.

**`2024-06-20` IS in the dropdown. It is just not the default.**

**The code now checks itself**, so if this is ever got wrong the logs say so in
one line instead of never — `event.api_version` against the pinned constant. It
**logs and does not reject**: a 400 makes Stripe retry for three days and then
disable the endpoint, which turns a wrong-shaped payment record into no record
at all.

### And two events were added, one of them at his recommendation

- **`account.application.deauthorized`** — his suggestion, and he was right not
  to add it unilaterally, because it needed handler code. Without it **the
  platform never learns a detailer left**: the row keeps saying connected and
  `pay-booking` keeps offering a card button routing to an account that has
  revoked us. The customer meets that failure at the car.
- **`account.updated`** was on the event list **and `handleConnected` returned
  early on it** — it would have been delivered and done nothing. `charges_enabled`
  is Stripe's answer and is re-read rather than remembered, so without it a
  detailer Stripe later restricts keeps a card button that fails for everyone.

Both are handled and deployed (`stripe-webhook` v27).

**Already done, do not redo:** `STRIPE_CONNECT_CLIENT_ID` is set and verified.
The sandbox account has OAuth enabled with
`https://detailingplatform.com/settings/payments/connected` as the default
redirect URI.

### WHICH ACCOUNT THE KEY BELONGS TO — answered 2026-09-08, by evidence

**`acct_1UCMm0JeoZO7o6Ee`, the sandbox. So the client id already set is the
right one.**

**Not measured directly, and the reasoning is what makes it trustworthy:** that
account's endpoint shows **49 successful deliveries this week and 0 failures.**
Those events exist only because the app created Checkout Sessions, and a key
belonging to the parent account would have routed its events to the parent's
endpoints instead. **The deliveries are the evidence; the key is the sandbox's.**

**It is INFERENCE, and good inference — record it as that rather than as a
measurement.** The direct check remains one line, and only the account id
should ever be reported from it:

```
curl -s https://api.stripe.com/v1/account -u "$STRIPE_SECRET_KEY:" | grep -o '"id": *"[^"]*"'
```

**This session cannot run it** — the key is a Supabase edge secret rather than
anything in `.env`, and reading it back was correctly refused. Worth running if
the key is ever to hand; anything other than `acct_1UCMm0JeoZO7o6Ee` means the
client id is wrong for the key in use.

---

## 11. RESEND'S CAP IS REAL — and that reopens a decision he had closed

**Measured on the billing page, 2026-09-08.** The earlier doubt in row 2b is
withdrawn; **the coworker corrected its own guess, which is the right instinct
and is why this entry can be trusted.**

| | |
|---|---|
| Plan | **Free**, confirmed — Transactional, 3,000/month at $0, **no payment method on file** |
| Monthly | **570 / 3,000** — 19%, fine |
| Daily | **117 / 100 — ALREADY OVER**, and still delivering |

**So the 100/day cap exists, Resend displays it, and the product's own
*"Emails: N of 100 today"* counter is measuring against a real limit. DO NOT
remove or change that counter.** It is a **soft** limit at this level rather
than a hard block — which is exactly why nobody noticed.

> ### CORRECTED THE SAME DAY — THE DEFERRAL STANDS, AND THIS SECTION WAS WRONG
>
> **Measured by DOMAIN, which is the cut nobody had taken:**
>
> | | today (117) | 30 days (527) |
> |---|---|---|
> | `email.detailingplatform.com` | **117** | **470** — platform and test traffic |
> | `andrewsdetail.com` | 0 | 57 — his real business, ~15 bookings |
>
> **So the daily figure is real, and it is entirely OUR OWN test traffic.**
> Real customer email runs about **2 a day**. At ~4 emails a booking, reaching
> 100/day organically means **~25 bookings a day across every tenant**, which
> is a long way off.
>
> **The paragraphs below were written before that cut and are withdrawn. His
> original decision — upgrade when a real detailer gets close — was right and
> is unchanged. DO NOT push him to spend the $20.** What made the argument look
> weak was counting a build session's traffic as if it were demand.
>
> **The real finding is § 16**, and $20 does not fix it.

### ~~Why this is his decision again, and not a build task~~ — WITHDRAWN, see above

He closed this on 2026-09-08: upgrade *"when a real detailer gets close"*, and
a 429 in our own test runs is not the trigger. **That reasoning rested on a
premise that has now changed.** The cap is being exceeded **on internal traffic
alone, with zero customers on the product.** Resend is choosing not to enforce
today and is under no obligation to keep choosing that.

**What it costs if they do start enforcing:** the transactional set spends about
five emails a booking, so the first thing to stop is **booking confirmations** —
and `docs/verification.md` already records what that looks like from outside.
It does not present as an email problem. It presents as *"the booking page is
broken."*

**The recommendation: this is not urgent, and it stops being deferrable the day
a real detailer signs up.** $20/month buys the daily cap going away. Nothing
needs deciding this week; what changed is that *"our test runs don't count"* is
no longer a complete answer, because the runs are already over the line.

---

## 12. STRIPE WILL BE OPENED IN A PARENT'S NAME — and this REVERSES `setup-steps` STEP 0

**Reported 2026-09-08.** Stripe's minimum age is 13, and an account holder under
18 **requires a guardian as the legal account owner** before the account can
accept charges or pay out. So:

- The Stripe account is opened with **a parent as the legal account owner**.
- The **business bank account is opened in the parent's name to match**, because
  Stripe requires the payout bank to match the account holder.
- When ownership later transfers, **the order is fixed and is not negotiable**:
  **(1)** Stripe Support updates the account holder, **(2)** THEN payouts are
  repointed to the new bank account. The other order is a name mismatch and a
  payout hold.

### THIS CONTRADICTS A DECISION MADE FOUR DAYS AGO, AND BOTH HALVES MATTER

`docs/setup-steps-2026-09-04.md` **STEP 0** says, in as many words:

> *"**No dad on the Stripe account.** He opens it himself at 18. The support
> question this file used to open with is now moot — there is no guardian, so
> there is nothing to transfer and nothing to ask."*

**And STEP 4 of that same file says the transfer is the expensive part**: that a
Stripe account cannot move between legal entities, so a handover means *"new
EIN, new bank account, NEW STRIPE ACCOUNT — every subscriber re-enters their
card."* **That single sentence is why the LLC was considered at all.**

**The new report says the handover is a support ticket.** Those two can both be
true of DIFFERENT things — updating the *representative* on one legal entity is
a support ticket; moving between two legal *persons* is a new account — and
**which one this is depends on whether the parent's sole proprietorship becomes
Andrew's, or stays and merely changes who signs.** Nobody here has established
which.

### ANSWERED 2026-09-08: **"we are gonna wait."**

> **HE DECIDED TO WAIT.** No Stripe account opened in a parent's name, no
> business bank account in a parent's name, and no ownership transfer to
> sequence later. **Everything legal happens in the week of 2 December, in his
> own name** — which is what `docs/setup-steps-2026-09-04.md` STEP 0 already
> says, so **that file is no longer contradicted and its flag can come off.**
>
> **What this closes:** the guardian-owner plan, the handover ordering (Stripe
> Support first, then payouts), and the disagreement about whether a handover
> costs a support ticket or a whole new account. **None of it happens, so none
> of it needs resolving.**
>
> **What stays true regardless:** the code must never hardcode the account
> holder, the business name on receipts, or payout details —
> `tests/connect.test.mjs` § 9 holds that, and it is worth keeping whether or
> not an ownership change ever occurs.
>
> **And it leaves `ENTITY` simpler.** § 1 row 5 asks whether *"Andrew Dietrich,
> doing business as Detailing Platform"* is right. With no parent on the
> paperwork, **that guess is now probably correct** — confirm it with the CPA
> in December rather than changing it now.

### ~~THE QUESTION FOR HIM, AND THE RECOMMENDATION IS "WAIT"~~ — he chose wait

**Why open it now with a parent, rather than in December in his own name?**

**Nothing in the build needs it.** Stripe **test mode** requires no activation,
no identity check and no guardian — that is already established, is why the
whole payments feature exists today, and is written into STEP 0. There are zero
customers, and he has said twice he is not going public until the build is
finished. **He turns 18 on 2 December: under three months.**

**So opening it early buys nothing and adds an ownership transfer whose cost
this repo and this report disagree about.** Waiting gives one account, one
owner, no transfer, no ambiguity.

**What would change the recommendation:** a reason to take real money before
December that nobody here knows about. If there is one, opening in a parent's
name is the correct way to do it and the ordering above is the thing to get
right.

**Until he answers, `setup-steps-2026-09-04.md` STEP 0 stays as written**, with
a pointer here. **Do not edit that file to match this one** — it records a
decision, and a decision that changed gets a second entry rather than a quiet
rewrite.

### WHAT IT MEANS FOR THE CODE — nothing, and that is now enforced

The standing constraint is right: **nothing may hardcode or assume the account
holder, the business name on receipts, or the payout bank.** Checked
2026-09-08 across all of `app/src` and `supabase/functions`:

- **Zero** references to a statement descriptor, an account holder, a routing
  number or a payout bank, anywhere.
- Emails carry `PLATFORM_NAME` — a **brand** string — never a legal person.
- **The single hardcoded legal identity is `ENTITY`** in
  `app/src/landing/legal.js`: one constant, one line, printed at the top of
  `/privacy` and `/terms`. It **cannot** come from Stripe — it is who signs the
  terms of service, not who holds a merchant account.

**`tests/connect.test.mjs` § 9 now holds all three**, so an ownership change
stays a settings change rather than becoming a deploy. Both breaks caught.

**AND `ENTITY` AND THE STRIPE ACCOUNT HOLDER ARE THE SAME QUESTION.** § 1 row 5
asks whether *"Andrew Dietrich, doing business as Detailing Platform"* is right.
**If a parent is the legal owner of the account taking the money, the entity on
the public terms is probably the parent too.** Answer them together, and answer
them before anybody has agreed to those terms — after that it is a change of
contract rather than a change of text.

---

## 13. THE SECOND WEBHOOK ENDPOINT IS CREATED — 2026-09-08

**Done, and the version was set correctly.**

| | |
|---|---|
| Destination | `we_1UDY3WJeoZO7o6EerVO73I3G` — *"detailing platform - connected accounts"* |
| Account | `acct_1UCMm0JeoZO7o6Ee` (the sandbox — matches the key, § 10) |
| Events from | **Connected accounts** |
| API version | **`2024-06-20`** — matched to the existing endpoint, **not** the `2026-08-26.dahlia` default. **The trap was avoided.** |
| Listening to | `account.updated` — **one event** |
| URL | `https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/stripe-webhook` |
| Deliveries | Total 0 / Failed 0 |

### TWO THINGS LEFT, AND THE FIRST IS A DEADLINE RATHER THAN A TASK

**1. `STRIPE_CONNECT_WEBHOOK_SECRET` is not set yet.** Until it is, this
endpoint delivers and the function rejects — correctly, and that is expected
rather than a bug. **But it is not free to leave.** Stripe retries a failing
delivery for about three days and then **disables the endpoint**, and a
disabled endpoint looks exactly like one that was never created. It is
harmless while deliveries read 0/0; **the clock starts with the first
connected-account event.**

**2. ~~`account.application.deauthorized` is NOT subscribed.~~ ADDED 2026-09-08 —
the endpoint reads *"Listening to: 2 events"*.** His coworker had held it back
until the handler existed and was checked; that condition was met, and he acted
on it without being asked again. **Nothing is left on this row.** The paragraph
below is kept because it is why the event matters.

**~~2.~~ Why it matters — the handler for it is already built.** He left it off deliberately, because the checks had
been verified against a specific event set. **That reasoning was right and the
condition is now met:** the handler shipped on 2026-09-08 with `connect.test.mjs`
§ 8 covering it, including the trap that `data.object` on that event is the
APPLICATION rather than the account.

**So it is one checkbox on the endpoint, and it should be added.** Without it
the platform never learns a detailer disconnected: the row keeps saying
connected and `pay-booking` keeps offering a card button routing to an account
that has revoked us. **We now have the exact inverse of the bug this whole
thread started with** — then it was an event with no handler; now it is a
handler with no event.

**FIRST THING TO CHECK once the secret is in:** that endpoint's *Event
deliveries* tab. Anything other than 0 failed means the secret is wrong or the
function did not pick it up.

---

## 14. ITEM 3 OF HIS COWORKER'S LIST IS THE STALE PAGE AGAIN — no action

**Reported:** *"Privacy policy has NO Google section and does not list Google
among its four named companies."*

**True of the live page, and it has been fixed in the source since 2026-09-07.
This is the same observation § 9 already records, made again, for the same
reason: the live site is the 6 September bundle.**

That is not a criticism of the report — **reading the live page is the correct
thing to do**, and a session that only reads source would have missed the
Business Profile gap that § 9 found. It is a warning about a specific trap this
project now has: **while the deploy is frozen, every observation of the live
site is an observation of 6 September.** Check the bundle hash before filing
anything as a defect:

```
curl -s https://detailingplatform.com/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'
```

**Everything in that item is already done** — the Google sign-in section, the
Limited Use disclosure, the Business Profile paragraph, and the companies list
(which carries no count at all now, deliberately, because a count in a heading
rots).

**The action is the deploy, and it is the same action as items 4, § 6 and § 9.**

---

## 15. THE EXAMPLE PAGES — one real bug, and it was not the reported one

**Reported:** *"/example1../example10 and /examples do not resolve… two bugs:
the pages are missing, and unknown routes show a login form."*

**Three separate things were true, and only one of them was new.**

> **HE WITHDREW THE "MISSING PAGES" HALF HIMSELF, 2026-09-08:** *"I reported
> the example pages as missing. They are not… the evidence I had (an invented
> route rendering the sign-in screen) proved a catch-all existed, not that the
> pages were absent."* **That is the correct reading of his own evidence and it
> is worth more than the report it corrects** — the same inference this repo
> has made wrongly three times, caught by the person who made it.

**(a) The unknown-route sign-in screen is REAL and already tracked** as roadmap
item **P**, found independently on 2026-09-08 with the same diagnosis. Two
sessions reaching it separately is confirmation rather than duplication. It
needs his yes on the wording of a not-found page, not on the work.

**(b) The pages are not "missing".** They are built, real, 24 KB each, and land
in `dist/example1/index.html`. They are absent from the live site because they
were committed on **7 September** and the live bundle is **6 September** — the
deploy again. *(A commit message on 7 Sep says roadmap 9.5 "is deployed". It
was not: Netlify silently skipped the build. That line is itself an example of
what this file keeps warning about.)*

**(c) AND THERE IS A REAL BUG UNDER BOTH OF THEM — measured with `vite preview`
against the actual build:**

```
  /example1/            Northlight Detail — mobile detailing, Portland OR
  /example1             Detailing Platform          <- the app shell
  /example1/index.html  Northlight Detail
```

**One slash.** Each page is a DIRECTORY, so `/example1` matches no file, falls
through to `/* /index.html 200`, and serves the SPA — which, having no 404
route, draws the sign-in form. **And `/example1` without the slash is the URL he
asked for**, quoted in `build-examples.mjs`'s own header.

**Fixed:** the build now prepends eleven 200-rewrites to `dist/_redirects`,
above the catch-all, because that file is first-match-wins.
`tests/route-contract.test.mjs` holds the ordering and prints **NOT MEASURED**
rather than passing when `dist` is absent.

**STILL OWED, AND NO CHECK HERE CAN DO IT:** `_redirects` is Netlify's file and
`vite preview` does not read it. **Load `/example1` on the live site after the
next deploy.** It would probably have worked anyway — Netlify's *Pretty URLs*
setting does this redirect by default — but that is a setting in an admin panel
nothing here can read, and this project has now been bitten three times by
exactly that.

---

## 16. THE RESEND ACCOUNT IS SHARED WITH HIS LIVE BUSINESS — and that is the real issue

**Found 2026-09-08 by measuring sends per domain.** It is not the $20, and § 11
is corrected: the deferral stands.

**One free Resend account carries three things**: his live business
(`andrewsdetail.com`, real customers, real money), the platform
(`email.detailingplatform.com`), and every future tenant. **The 100/day
allowance is ACCOUNT-WIDE.**

### The consequence, and it is the only one that touches real money

**A heavy build session here spends his LIVE BUSINESS's daily allowance.** On
2026-09-08 the test traffic alone was 117 of 100. Resend did not enforce — it
is a soft limit at this level — but it is their choice, not a guarantee, and
**the blast radius is a real customer of Andrew's Auto Detail not getting their
booking confirmation.**

`docs/HANDOFF.md` has listed *"the platform shares the live business's Resend
account"* as an open thread since 2026-08-29. This is what that thread costs.

### ~~THE FIX IS A SECOND FREE ACCOUNT~~ — WRONG, AND DANGEROUSLY SO

> **WITHDRAWN 2026-09-08, HOURS AFTER IT WAS WRITTEN. DO NOT CREATE A SECOND
> RESEND ACCOUNT.** It would breach Resend's Acceptable Use Policy, quoted
> verbatim:
>
> > *"Users are expressly forbidden from creating or using an account or
> > multiple accounts with the aim of circumventing any quotas or limits
> > imposed by our service."*
>
> **The stated purpose — separating so platform traffic stops consuming the
> business's allowance — IS quota circumvention by that definition**, and
> Andrew would own both accounts.
>
> **AND THE FAILURE MODE IS THE ONE THING THIS WHOLE THREAD HAS BEEN
> PROTECTING.** `andrewsdetail.com` runs on that account. **An AUP suspension
> takes out real customer booking confirmations on the revenue-generating
> business** — strictly worse than the problem it was solving. A recommendation
> whose downside is the thing you were guarding is not a cheap fix; it is a
> bigger version of the risk wearing a smaller price tag.
>
> **A SECOND DOMAIN WAS NEVER GOING TO WORK EITHER**, and this half of the
> reasoning was also wrong: Resend's own docs say the **"rate limit is per
> team, not per API key or per domain."** The quota is 100/day and
> 3,000/month, resetting at **midnight UTC, not rolling.**
>
> **It becomes legitimate LATER**, if the platform is ever its own legal
> entity — then a separate account under that entity is a separate business
> rather than a second account of the same one. Not available now, and it is
> the same legal question as § 12 and § 1 row 5.

### THE TWO OPTIONS THAT ARE ACTUALLY AVAILABLE

**1. SEND LESS OFTEN — free, ours, and it addresses the cause.** Not a dry run:
the log-reading proof stays exactly as it is. The change is **how often the
sending suites fire.** Eleven suites book, and every booking sends about five
emails; `e2e-booking` walks two tenants and books, reschedules and cancels on
each. **That battery belongs to a checkpoint, not to a commit.** The rule is
now in the session briefs.

**2. RESEND PRO, $20/month — and the justification is NOT the one we both
rejected.** § 11 stands: real customer volume is ~2/day and there is no
capacity argument. **This is insurance, and the axis matters** — Pro removes
the **DAILY** cap, which is the one actually binding, so a build session can no
longer threaten his live business's booking confirmations. **His call.**

**MY RECOMMENDATION: do 1 now, and let 1 decide whether 2 is needed.** Option 1
is free and fixes the cause; option 2 buys certainty on top of it. **And the
trigger for spending the $20 should change.** *"When a real detailer gets
close"* was a capacity trigger and capacity is not the risk. The honest
triggers are: **the first time a real send is refused**, or **the first build
day that still passes 100 after option 1**. The back-office counter is what
reports both — that is what it is for.

**The third option is not available yet.** If the platform ever becomes its own
legal entity, a Resend account under that entity is a separate business rather
than a second account of the same one, and the AUP problem disappears. **That
is the same legal question as § 12 and § 1 row 5**, and it is one more reason
to answer them together.

### AND THE COUNTER WAS MEASURING TWO DIFFERENT POPULATIONS — fixed

His coworker read this as *"the product shows each detailer N of 100"* and
warned it would eventually tell a paying detailer their sending was nearly used
up. **Checked: no detailer ever sees it.** The line lives only in
`app/src/admin/AdminPage.jsx`, behind `/admin`, which answers **404** to
everybody who is not a platform admin. That half is a false alarm.

**But there IS a defect underneath, and it is the OPPOSITE of the one
reported.** `sent` comes from `platform_email_days` — a table in THIS project —
so it counts what the PLATFORM sent, while the cap is the ACCOUNT-WIDE
allowance. Different populations. **So it UNDER-reports, which is the unsafe
direction.** On 8 Sep the business sent 0 and the two agreed, which is why
nobody could have noticed; over 30 days it was 470 against 57, so a busy
Saturday can read comfortable while the account is at its limit.

**Fixed by making the label true rather than by making the number
account-wide** — the latter means the back office reaching into a different
Supabase project for a status line. It now reads **"Platform emails: N of 100
today"**, and the four-fifths warning says the allowance is shared with
`andrewsdetail.com` so the account may be higher. `platform-admin` 14c-ii-b and
14c-ii-c hold both; both breaks caught.

**When the second account exists, the two populations are the same again and
the word can come back out.**

### On the "dry-run mode" suggestion — recommend against

Making the suites assert on the payload without calling Resend would stop the
spend, **and it would delete the one thing `e2e-booking`'s email leg exists to
prove.** That leg reads the edge functions' own logs to confirm the provider
really accepted the send, because `sendTenantEmail` is best-effort by design —
a dead relay is a `console.error` inside a function, invisible from every
screen and every other suite. **That is exactly how the roadmap 0.3 defect
survived.** A dry run would have passed against a relay that was refusing
everything.

**The separate account gets the saving without the loss.**

---

## 17. WHY THE DEPLOY BROKE, WITH THE ARITHMETIC — and it recurs unless the cadence changes

**Read from the Netlify dashboard, 2026-09-08.** § 6 inferred build credits
from an error string; this is the account itself.

| | |
|---|---|
| Plan | **Personal — 1,000 credits/month** |
| Consumed | **1,965 credits across 131 PRODUCTION DEPLOYS** |
| Remaining | **1.1** plan credits (98.3 "operational" credits exist and Netlify says they cannot be spent on production deploys) |
| Auto recharge | **Disabled** |
| Billing period | 14 Aug – 13 Sep · **RESETS 13 SEPTEMBER** |
| Last published | `main@c47cfae`, 6 Sep 4:23 PM |
| Since | `main@7cd5864`, `main@df0628c`, `main@HEAD` — all *"Skipped due to account credit usage exceeded"* |

### THE FINDING THAT MATTERS MOST IS NOT THE OUTAGE

**~15 credits a deploy × 131 deploys = 1,965 against a 1,000 allowance. The
sustainable rate is about 66 production deploys a billing period, and the
current cadence is twice that.** So this is not a one-off: **it recurs every
cycle** unless the cadence changes. It is a real constraint on how the loop
works, not a footnote.

### AND IT CORRECTS `CLAUDE.md` — THE GIT INTEGRATION IS CONNECTED

**Those skipped builds are named `main@<sha>`.** Netlify only names a deploy
after a commit when it received the git event and created a deploy for it — a
disconnected repo produces no record at all. **So *"a push is not a publish"*
is a fact about the BILLING PERIOD, not about the wiring**, and it flips back
on **14 September with nobody editing anything**. That is exactly the failure
mode the rule it replaced was warning about, now on a schedule.

### THE OPTIONS, AND WHAT I WOULD DO

**The problem is that every commit to `main` publishes, and `main` is now the
working branch.** It did not used to be — the original design had a work branch
with `main` reserved for publishing, and that broke down when the branch went
stale and work moved across.

| | Option | Cost |
|---|---|---|
| **A** | **A work branch again**, merged to `main` only when a publish is wanted. Restores the original design, and the staleness that killed it last time is self-correcting: you merge in order to publish. | One merge per publish. **No config, no dashboard setting, and no failure mode.** |
| B | A `[build] ignore` command in `netlify.toml` that skips unless the commit message carries a marker. In-repo and versioned. | **Its failure mode is "nothing ever deploys again"**, which is indistinguishable from today's outage, and it cannot be tested until credits reset. |
| C | Turn off auto-publishing in the Netlify dashboard. | A setting in an admin panel nothing here can read — **the exact shape that has now bitten this project four times.** |

**Recommendation: A, and it is stronger than the table above argues — measured
2026-09-08.** Netlify's credit doc: **"Deploy Previews or branch deploys | 0
credits"**, and **failed deploys and rollbacks bill nothing.** Only a
SUCCESSFUL PRODUCTION deploy costs 15.

**So a work branch does not RATION the budget — it takes the loop off the meter
entirely.** 131 chargeable deploys become about one per publish. **That is a
structural fix rather than a discipline one**, which also answers the objection
that killed the branch last time: there is no ongoing restraint for anybody to
maintain, and no way to forget it.

**AND IT UNLOCKS SOMETHING THIS PROJECT HAS BEEN WORKING AROUND SINCE
2026-09-05.** A branch deploy is a **real URL, free, and it opens on his
phone.** The whole apparatus in `CLAUDE.md`'s first section — screenshot
everything, never ask him to look at `localhost` — exists because he cannot
reach a dev server from a phone on remote desktop. **A free branch preview is
strictly better than a screenshot for anything he needs to SCROLL or PRESS**,
and nothing in this repo has ever used one. Screenshots stay right for "does
this look correct"; a preview URL is the answer for "try it".

**THE REAL BUDGET IS ~64 PRODUCTION DEPLOYS A CYCLE, not 66.** 1,000 / 15 = 66,
less about 36 credits drawn from the same pool this period by bandwidth (22.7),
web requests (10.5) and compute (3).

### THE GOOGLE TIMING RISK — DE-ESCALATED 2026-09-08. RECOMMENDATION: WAIT.

> **His coworker withdrew its own framing, and the reasoning holds: the two
> Google reviews inspect different things.**
>
> - **Review ONE** (Business Profile API access, case 6-3052000042070) asked
>   for four things on the form — the verified Business Profile, the project
>   number, the company website, the use case. **No privacy policy, no terms.**
>   It is a legitimacy check on the applicant.
> - **Review TWO** (OAuth verification for the sensitive `business.manage`
>   scope) is the one that **reads the privacy policy** and wants the Limited
>   Use disclosure and Search Console domain ownership.
>
> **Review two cannot start until the scope is added, which waits on review one
> returning (~17–22 Sep). Credits reset 13 Sep.** So the corrected policy is
> live several days before the review that actually reads it begins.
>
> **CONFIDENCE, as he stated it:** high on which review checks the policy,
> lower on whether Google glances at the site during review one. **The
> mitigating fact is real** — `/privacy` and `/terms` serve substantive working
> pages today, just the 6 September versions without the Google section. A
> reviewer who looks finds a real policy, not a dead link.
>
> **AND THE "what would change it" TEST WAS RUN, 2026-09-08: nothing
> user-facing needs to ship in five days.** 104 commits are unpublished and the
> surface is wide, but **there are zero detailers on the product**, he has said
> twice he is not going public until the build is finished, and first sales
> calls are ~8 December. **The only audience for the live site this week is him
> and possibly a Google reviewer.**
>
> **And publishing early would actively cost something on one item:** the ten
> example pages are the ones he rejected, and the websites lane is rebuilding
> them. Shipping them now puts work he dislikes on a public URL days before it
> is replaced.
>
> **So: wait for the 13th. Do not buy credits on Google grounds, and there is
> no other ground.**

### ~~THE GOOGLE TIMING RISK — and a top-up is probably not needed~~ — superseded above

Google's review is ~17–22 Sep and credits reset 13 Sep, so a prompt deploy on
the 13th lands the corrected privacy policy first. **But Google may fetch at any
point in the review, and today they would find the 6 September page — no Google
section, no Limited Use disclosure.** That is the rejection § 9 exists to avoid.

> **WRONG — WITHDRAWN 2026-09-08, and it was written against a billing model
> Netlify no longer uses.** Their credit doc: *"each successful production
> deploy consumes 15 credits"*, and **build minutes are no longer calculated on
> credit-based plans.** So `netlify deploy --prod --dir` is a PRODUCTION DEPLOY
> and is charged the same 15 credits — *"runs no build"* saves nothing, because
> **the build was never the billed unit.** It would be refused exactly as the
> git deploys were.
>
> **The arithmetic confirms it exactly: 131 × 15 = 1,965**, which is the figure
> on the billing page to the credit. Every credit went on deploy COUNT.
>
> **So there is NO free route to publishing to detailingplatform.com before
> 13 September.** Two answers only: wait for the reset, or buy credits. § 17.

**~~He has been told he can buy a top-up. He probably does not need to.~~** A
**direct upload of pre-built files runs no build** — true, and irrelevant:

```
npm run build --prefix app
npx netlify deploy --prod --dir=app/dist
```

**~~That is § 6 option 1 and it has never been tried.~~ SUPERSEDED, not
untried — see the correction above.** It is charged 15 credits like any other
production deploy, and there are 1.1 left. **Do not spend time on it.**

---

## 18. THE LOOP SPENDS METERED THIRD-PARTY BUDGET AND HAS NEVER COUNTED IT

**His coworker's line, 2026-09-08, and it is the one worth keeping:** *"the same
systemic issue as the 131 Netlify production deploys in one billing cycle — a
high-frequency loop spending metered third-party budget."*

**Two vendors, two overruns, one cause, found a week apart and diagnosed
separately as if they were unrelated.** They are the same thing:

| | Overrun | Cause |
|---|---|---|
| Netlify | **1,965 credits / 1,000** — 2x | deploy on every commit |
| Resend | **117 sends / 100 a day** | five emails a booking, on every run of eleven suites |

**Neither was noticed until it caused an outage**, and Netlify's was invisible
for two days because a skipped build sends no failure email.

### The inventory, so this stops being a surprise

*Netlify and Resend read from their dashboards 2026-09-08; Supabase measured by
the cloud coworker the same day.*

| Service | Limit | Where we stand | Verdict |
|---|---|---|---|
| **Netlify** | 1,000 credits/mo | **1,965 used, 1.1 left**, resets 13 Sep | **OVER, 2x. Recurs.** § 17 |
| **Resend daily** | 100/day | **117**, ~all test traffic | **OVER. The binding axis.** § 16 |
| Resend monthly | 3,000/mo | 527 | Fine — 18% |
| Supabase database | 500 MB | 33.37 MB | Fine — 7% |
| Supabase egress | 5 GB | 0.887 GB | Fine |
| Supabase edge invocations | 500,000/mo | 31,273 | Fine — 6% |
| Supabase MAU | 50,000 | 126 | Fine |
| Supabase storage | 1 GB | **0 GB** | Fine, and see the coworker report § 3 correction 4 — the "photos are filling it" premise was never true |

**So it is exactly two meters, both on the two services with a per-PERIOD
allowance rather than a per-total one.** Supabase is comfortable on every axis
and needs nothing. **A general anxiety about free tiers would have been wrong;
the specific measurement is what is useful.**

### The rule that comes out of it

**A high-frequency loop must not spend a metered budget on every iteration.**
Both fixes are the same shape — move the expensive thing from *every commit* to
*a checkpoint*:

- **Deploys** belong to a publish, not to a push. § 17.
- **The full email-sending battery** belongs to a checkpoint, not to a commit.
  The credential-free suites cost nothing and stay per-change.

**And the meters get read rather than assumed.** Both overruns were found by
somebody opening a dashboard, and neither was visible from inside this repo —
the fourth, fifth and sixth instances of the pattern in `docs/sessions/manager.md`
§ 3. **A session that has been booking all day should say so**; the back office
prints the email figure and Netlify prints the credit one.
