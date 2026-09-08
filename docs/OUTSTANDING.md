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
| **2b** | **NEW — read Resend's actual billing plan** at `resend.com/settings/billing`. **The account sent 200 emails on 7 Sep and 110 on 6 Sep, all delivered** — both above the 100/day free cap this product's counter is built against. So either he is not on the free plan, or **the back office's *"Emails: N of 100 today"* is measuring against a limit that does not exist.** The coworker's API access shows domains and metrics but not the plan. | 1 min |
| **2c** | ~~**Two things in the Stripe dashboard** — the `ca_…` client id, and the webhook endpoint told to listen to events on CONNECTED accounts, a separate setting.~~ **BOTH HALVES WERE WRONG — corrected 2026-09-08 from the dashboard.** The client id **is already set** (`STRIPE_CONNECT_CLIENT_ID`, verified in Supabase edge secrets, 8 Sep) — so that half is DONE. And **there is no such setting**: a Stripe endpoint's *"Events from"* is **CREATE-ONLY**, immutable beside the payload style and the API version, so the existing endpoint is permanently scoped to *"Your account"* and cannot be pointed at connected accounts. **It takes a SECOND endpoint, which issues a NEW signing secret** — see § 10. | see § 10 |
| **3** | **The site gallery** (roadmap 9.1) — *mostly delivered 2026-09-08* | His taste, and nobody else's. **He sent 21 links with a verdict on each on 2026-09-08** — see `docs/TASTE-NOTES.md` batch 2. That is enough to start 9.2. | done for now |
| **4** | **Two one-word answers** — a detailer's email on their site (switch? recommended), and whether the price editor should refuse an odd ladder (keep warning? recommended) | Both are business calls, not code ones. | 30 sec |
| **5** | **Is `ENTITY` right?** `app/src/landing/legal.js` now prints *"Andrew Dietrich, doing business as Detailing Platform"* at the top of `/privacy` and `/terms`. **It is a GUESS at his paperwork** — sole trader, a DBA on his own name and an LLC are three different legal persons, and only he knows which one signs. One constant, one line to change, and free to change until somebody has actually agreed to those terms. | 30 sec |

### Off his list for good — do not re-raise any of these

| Thing | Why it is closed |
|---|---|
| Stripe's business address | **He is not old enough to complete the form.** Blocked by a fact, not a preference. The no-tax fallback cannot under-collect. `overnight-log` Q19. |
| Resend $20/month | **Decided:** upgrade when a real detailer nears the cap — *"when a real detailer gets close"*, re-confirmed 2026-09-08. A 429 in OUR OWN test runs is not the trigger. Q20. **But the CAP ITSELF is now in doubt — see row 2b above; the counter may be measuring against a limit that does not exist.** |
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

- **`HEALTHCHECK_URL` is not set**, so the "tell the outage watcher" step is a
  no-op and a backup that stops will stop silently — the same argument roadmap
  8.12 makes about the scheduler. Five minutes on healthchecks.io. (Not the
  same URL as `platform_settings.healthcheck_url`, which watches a different
  job.)
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
