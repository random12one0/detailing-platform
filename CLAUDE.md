# Detailing Platform

A booking and business-management SaaS for car detailers. Each detailer (a
"tenant") gets a dashboard, a public booking page, optionally their own website
and their own domain. React + Vite front end, Supabase (Postgres + edge
functions) back end, Netlify hosting, Resend for email, Stripe for payments.

**Andrew owns this and directs the work. There are no session roles, no lanes
and no folder ownership — that experiment ended 2026-09-16. Any session can
work anywhere in the repo.**

**Starting fresh on or after 2026-09-21? Read
`docs/MANAGER-CLOSE-2026-09-21.md` first.** A night's decisions, and four
changes to the live database, Resend and the outage watcher, were settled in a
chat window that no longer exists. That file is the only place they are
written down, and several of them are binding rulings you would otherwise
re-open. The old rulebook is no longer a file — it is in
git history, and `docs/archive/` was pruned on 2026-09-20 (step 7). If you ever
need it:

```bash
git show pre-doc-prune-2026-09-16:docs/archive/CLAUDE-2026-09-16-pre-reset.md
```

## How we work

One item at a time. Build it, verify it against the real thing, show Andrew the
evidence, check it off. Don't batch. Don't start the next item before the
current one is proven. If two documents disagree, say so out loud rather than
quietly picking one.

Andrew is not a programmer. Explain in plain words, define any term the first
time it appears, and never hand over a decision without what he needs to make
it: what the thing is, what happens either way, and your recommendation.
**Every reply is a reply card, and anything visual ends with his browser open
on it** — `docs/how-we-run.md` §§ "The reply card", "Driving the browser",
"Handing off". Five slots: a one-line headline, a **Before / After table**,
**"Look at it"** (the tabs left open and what to check — or "Nothing to look
at" plus how it was proven instead), **"Your move"**, and **"Next up"**, which
states the FIX rather than the problem: *right now it's this, we're changing
it so that, by doing this.* Andrew's asks, 2026-09-18. **It replaced the
status block and the "What's next" block** — they repeated each other and the
closing paragraph, so four sentences of news printed three times. Do not
reintroduce them.

## Backups — we built our own, so we do not pay Supabase for them

**The database IS backed up, every night, and it is working.** Andrew chose this
over Supabase's paid backups (the platform is on the free plan, so Supabase's own
dashboard shows no backups — **that is expected and is not "no backups"**). A
session that tells him the database is unbacked-up is wrong; check here first.

- **Where:** `github.com/random12one0/detailing-platform-backups` — private, must
  stay private. A GitHub Action runs nightly at **02:10 Pacific** in GitHub's
  cloud (no computer of his needs to be on), `pg_dump` of the whole database,
  `age`-encrypted, saved as a release named `backup-YYYY-MM-DD`, kept 30 days plus
  the 1st of each month for 3 months (ROADMAP 97.28, Andrew 2026-10-19; the privacy page promises it, and the private repo keeps the 1st for ever until Andrew installs `docs/ops/backup.live-copy.yml`).
- **Is it working right now?** One read-only command answers it:
  `gh run list -R random12one0/detailing-platform-backups --limit 5` (and
  `gh release list -R random12one0/detailing-platform-backups --limit 5`).
  Checked 2026-10-10: every night green from 2026-09-16 to 2026-10-09, 29
  releases on hand.
- **The one open gap:** the private key that unlocks a backup lives only in
  Andrew's password manager, by design, and nobody has confirmed it is there or
  restored a file. Never read, move, paste or regenerate that key.
  `docs/recovery.md` and `docs/ops/backups.md` § 4 have the detail.
- **Separate, and not the same thing:** the Control Room also saves a copy of
  this repo's *code history* every 12 hours to `belt\backups\*.bundle`. That is
  code, not the database.

## Commands

```bash
npm run dev --prefix app                  # dev server on :5173
npm run build --prefix app                # production bundle -> app/dist
node --test tests/*.test.mjs              # all test suites (the glob is required)
node scripts/seed-demo.mjs                # demo tenant the suites sign in as
node scripts/build-examples.mjs --dev     # example tenant sites at /ex1../ex5
node scripts/context-check.mjs            # real context usage for this session
```

**The glob on the test line is not decoration.** `node --test tests/` exits
`Cannot find module <repo>/tests` on this machine's Node — it reads the
directory as a module specifier — so the documented command looked like a
repo-wide catastrophe rather than a typo. Corrected 2026-09-20 after
`docs/VERIFIED.md` had parked it twice as "somebody's decision".
**Running all 79 at once shares one seeded database and they interfere**:
`booking-engine` fails in the battery and passes **110/0** on its own. A red
in a full run is a lead, not a verdict — re-run the suite by itself before
believing it.
**And the full battery must never run while anything else is measuring the
demo tenant** — a browser sweep, another session, a screenshot pass. Several
suites write real rows into `demo-detail` (not just their own isolated
fixtures), so a booking or a status change mid-sweep moves the surfaces being
measured and the run reports a difference that is the test battery, not the
product. Andrew hit this 2026-09-20 running this exact command during a
twenty-run width sweep; see `docs/gotchas.md`. Confirm nothing else is
watching the demo tenant first, or run only the suites that do not touch it.

Env-backed scripts need credentials loaded first, or eleven of them print
`Missing SUPABASE_URL` and it reads as a broken environment rather than as a
script that never ran:

```bash
set -a; . ./.env; set +a
```

## Verification

| After changing | Run |
|---|---|
| **Anything, before you finish** | The four credential-free suites: `node --test tests/composition.test.mjs tests/design-contrast.test.mjs tests/landing-pricing.test.mjs tests/route-contract.test.mjs`. **They are test SUITES, not scripts** — run as `node scripts/<name>.mjs` they print `MODULE_NOT_FOUND` and read as a broken repo |
| **Anything, before you finish — and especially any markdown you wrote** | `node --test tests/no-credentials-in-tracked-text.test.mjs`. Credential-free, one `git` call. **Population widened from markdown-only to every tracked text file on 2026-10-06 (ROADMAP 14.25); `--break=md-only` restores the old net and turns it red — **but only run DIRECTLY, `node tests/no-credentials-in-tracked-text.test.mjs --break=md-only`; appending that flag to the `node --test` command at the start of this row does NOTHING, because `node --test` consumes every extra argument and the file's argv never sees it** (`docs/gotchas.md` 104, measured 2026-10-08: the flag-on run printed pass 1 / fail 0, the direct run 14 passed / 6 failed). The hard rule below — no password in a markdown file — was being broken in 8 files and 25 occurrences on 2026-09-25, some of it for weeks, because NOTHING HAD EVER CHECKED.** It matches SHAPES rather than the values somebody happens to know: the first cleanup was keyed on three known passwords and missed a fourth account's. It names the file, the line and the rule, never the value. Its blind spot is written in its own header — read that before trusting a green |
| **Anything, before you finish** | `node --test tests/every-open-item-is-citable.test.mjs`. Credential-free, two filesystem reads, **0.25s**. **An open item with no number is UNCHECKABLE** — every sweep here keys on the identifier, so nothing will ever report on it and nothing will say so. Two items sat unnumbered for ten days and one of them turned out to be the sharpest finding of the night the hour it got a number. It carries a discovery floor, because a parser that stops matching would otherwise read as all-clear |
| **Before handing anybody a row off the work queue** | `node --test tests/queue-rows-still-belong.test.mjs`. **2.87s**, credential-free except one row which names its credential. **A derived list rots: this one rotted in ninety minutes** and the manager was about to hand out finished work. Reports per row, declares its row count, and prints the two unverifiable rows by name rather than skipping them. ROADMAP 14.29 |
| **Any copy change — a rename, a re-wording, a condensation** | `node scripts/label-guard.mjs`. Credential-free, one filesystem read. **47 controls are addressed by the WORDS on them, so a rename silently blinds a check** — the matcher falls back to bare English, matches nothing, and the screen goes unmeasured while every other line reads normally. The two that happened are in the script's header |
| **Anything, before you finish — and this one needs credentials** | `node scripts/deployed-inventory.mjs`. **It exits 1 and names every function that is not running this checkout.** See below; do not deploy to clear it |
| **Anything a person reads, before you finish** | `node scripts/american-english.mjs` (dev server, no credentials). **A word spelled correctly but wrong for the audience passes every other gate here.** It reads the FINISHED page, not the source — a source scan printed clean over "Aluminium tanks". The 36 that reached visitors are in the script's header |
| **Anything a person reads — copy, a colour, a class, a whole screen** | `node scripts/contrast-insitu.mjs` (dev server + seed). **The credential-free gates measure token PAIRS, and a pair does not know which surface a label lands on** — `--fog-2` is 4.90:1 on `--ink-1` and 4.20:1 on `--ink-3`. The case is in the script's header |
| **Either pass document's sweep figures, or anything that counts commits or quoted fragments** | `node --test tests/sweep-methods-are-pinned.test.mjs`. Credential-free, one `git log`, **0.6s**. **It holds the two sweep methods AS CODE, because a method written as prose produced eleven figures that cannot be re-taken** — *“for each item number, `git log --grep`”* is neither the 434 unique nor the 853 summed commits it was read as. In the same document the rule that WAS written down reproduced exactly at 36. Two `PIN_CANARY=` sabotages |
| **A FIGURE — any count you are about to write into a document** | `node --test tests/figures-carry-their-command.test.mjs`. Credential-free, **3s**. **It enforces `docs/gotchas.md` 94 instead of trusting a session to remember it**, and the reason is measured: *the two people who knew the rule best broke it within an hour of writing it* — 93 was written about not editing a number to make two agree, and then 92's recorded 58 was edited to 53 to make two agree. Five buckets, a discovery floor, a canary injected every run, and **UNJUDGEABLE reported by name rather than folded into pass** |
| **`MailLog.jsx`, `.mail-scroll`, or any list bounded inside its own scroll box** | `node scripts/mail-log-scroll.mjs` (dev server + seed + credentials). **ROADMAP 3.1b, 3.1c and 3.1d are all queued on this same screen**, and the bound is load-bearing: the shared `.settings-body` behind all 24 "more" screens is itself `overflow-y: auto`, so a list that stops bounding itself puts the browser's full-height bar back across every one of them. `--break=unbound` is that regression on purpose and prints it by name. **Its 2 UNJUDGEABLE lines are not failures and must not be "fixed"** — no browser here lays out a classic scrollbar gutter, so the thumb's appearance is Andrew's eyes and is recorded as unmeasurable rather than skipped |
| **`app/src/lib/host.js`, the photo upload transport, or `FOR-ANDREW.md` step 9a1** | `node scripts/cors-rule.mjs`. Credential-free, no network, six filesystem reads. **The CORS rule Andrew pastes into Cloudflare is the only thing that decides whether an upload is allowed, and until 2026-10-09 it was a sentence saying *"your website's address"* — the product runs on SIX origins and that named one of them.** It derives the rule from the product (origins from `host.js`, methods from the three PUT call sites and `publishToGallery`'s signed GET, buckets from `photoDoor.ts`'s STORES) and reddens when the document stops matching. Eight `--break=` switches and two canaries; **both canaries are load-bearing and that is measured** — relaxing the origin rule from every-to-any made `--break=drop-www` report `0 failed` |
| **`Clients.jsx`'s client record, `forget()`, `delete-customer`, or anything that can remove a customer row** | `node scripts/fixture-not-deletable.mjs` (dev server + seed + `DEMO_OWNER_PW`). **0.3's ruling is "flag, DON'T delete" because ~60 suites sign into seeded rows — and the screen built to REVEAL a flagged fixture offered `Delete for good` on one**, two presses from a hard delete that cascades plan memberships, maintenance deadlines and photos. It asks both halves: the flagged row is refused with a reason that is PAINTED, and a real customer's record still offers the button — **the second is what keeps the first honest**, because *"no delete button found"* is also what a wrong selector, an unopened fold and a record that never opened all report. Four `--break=` switches, and `guard` reproduces the original defect itself rather than a proxy for it |
| **`.githooks/pre-push`, or how `deployed-inventory.mjs` exits or names programs** | `node tests/release-gate.test.mjs`. Credentials, read-only, about 7 minutes. Runs the push gate against stub inventories and then for real; `BREAK=lets-red-through\|all-branches` must each go red. ROADMAP 0.6d |
| Color or ground tokens | `node scripts/accent-sweep.mjs` |
| An edge function | `node scripts/deploy-functions.mjs …` then `node scripts/check-deployed.mjs` **and** `node scripts/deployed-inventory.mjs` |
| A layout | `node scripts/sweep-widths.mjs` (needs dev server + seed) |
| The job record's pinned action bar, or any container it opens in | `node scripts/pinned-bar.mjs` |
| The booking widget | `node scripts/sweep-booking-steps.mjs` |
| **Anything that prices a DAY or a TIME — the date step, the fixed bar, `price_rules`, `pricing.ts`** | `node scripts/surcharge-visible.mjs` (dev server + seed, no credentials). **A customer must never be shown one price and charged another, and the way that goes wrong here is not arithmetic — it is a correct sentence rendered where no phone can see it.** It walks the public page at five widths, tapping the first slot and the last, and asks whether the bar's RISE equals the lines the page just named, whether those lines sit above the fixed bar by hit-test, and whether their pixels are actually painted |
| **A money LABEL — a discount, a surcharge, anything whose words state a size** | `node scripts/discount-label.mjs` (dev server + seed, no credentials). **A label that states a percentage is making a claim the figure beside it has to keep**, and the two are composed in different places at different times. It asks whether a stated percentage of the job is EXACTLY the figure shown, and whether the percentage is still stated where it IS true — the second half matters, because a check that only asks the first can be satisfied by deleting every number |
| **A text box on the booking flow — adding one, removing one, or renaming its label; or § 5 of `docs/testing/phones-we-do-not-own.md`** | `node --test tests/keyboard-boxes-declared.test.mjs`. Credential-free, eleven filesystem reads, **0.2s**. **ROADMAP 2.15 closes on twenty minutes of Andrew's time on a real phone, so the WALK decides what those twenty minutes cover — and the walk was scoped from a sentence rather than from a count.** It declared *"the two steps in the whole flow with a text box"*; there are **four**, holding **eight** boxes, and the two it missed were the step this item's only reproduced fault was measured on and the step with the tallest bar in the flow. This declares all eight by hand, holds every label the walk sends him to tap against the string the product renders, and reddens when document and product stop agreeing. Sabotage is `BREAK=new-box|walk-step|label` — an env var, not a flag; `docs/gotchas.md` 104 |
| **`AddressField.jsx`, `StepLocation.jsx`, or the booking payload in `core.js`** | `node --test tests/address-source.test.mjs`. Credential-free, three filesystem reads. **`address_source` has exactly two values and five of the six cases that produce it write `"typed"`**, so a column hard-wired to `"typed"` passes almost every test you could write. This guards the one line that can produce `"picked"` and the two hops that carry it to the server |
| Anything on a customer's or booking's path | `node scripts/e2e-booking.mjs` |
| An email | `node scripts/render-emails.mjs` |
| A migration | `node scripts/db-audit.mjs` **and** `node scripts/migration-drift.mjs` |
| **Nothing — run it anyway, because a migration can silently never run** | `node scripts/migration-drift.mjs`. **There is NO applied-migrations ledger in this project** — `supabase_migrations.schema_migrations` does not exist, so nothing records which of the 92 files ever ran. This replays `supabase/migrations/` and compares each function against the live database, the way `deployed-inventory.mjs` does for edge functions. **Two migrations had never run and the multi-car feature reached nobody at any setting** (ROADMAP 8.10a). **It reads; it never applies — that is Andrew's.** **THIS LINE SAID "FUNCTIONS ONLY: it cannot see a migration that adds a table, column, policy, grant or index" UNTIL 2026-09-24, AND IT HAD BEEN WRONG SINCE 8.10b.** It now also compares **tables** (by existence), **columns** (by name, plus a type family where the type is judgeable) and **policies** (by existence) — measured, not read: run against a repo that had just added `customers.is_test`, it named that column absent and named the file that declares it. **THE NEXT SENTENCE SAID "GRANTS AND INDEXES ARE STILL UNBUILT" UNTIL 2026-10-06, AND IT WAS WRONG THE MOMENT 8.10c LANDED.** It now also compares **grants and revokes** on public tables, columns and functions (a role holds a privilege if its own entry or PUBLIC's does) and **indexes** (by name, table and uniqueness, **not the column list**), naming each difference and the file that declares it, and it counts the ones it cannot parse as UNJUDGEABLE rather than skipping them. Measured against the live database: it named the grant and index parts of the unapplied migrations, and it found `authenticated` able to write `bookings.weather` (ROADMAP 8.10d), which nothing earlier could see. **What it still cannot see is the receipt's own warning line, not this paragraph:** constraints, triggers, views, enum types, extensions, RLS enable/force state, an index's column list, default privileges, a policy's USING/WITH CHECK, a column's default or nullability. Its grant and index sabotages run on a scratch copy of the migrations (`--migrations=<dir>`), never on the live database. The earlier stale version mattered: a session adding a column would have read that line and not run the one check that catches an unapplied migration |
| **The tab bar, `--tabclear`, `--hit-overhang`, or any control that can come to rest under fixed furniture** | `node scripts/tabbar-clearance.mjs` (dev server + seed + credentials). **It measures the HIT AREA, never the bounding rect** — `.choice` is a 38px box that presses as 46 through a negative-inset `::after`, so a rect-only scan calls a legal control broken, and a clearance sized to the rect leaves four pressable rows under the bar while reporting itself finished. `--break=rect` is that bug, on purpose |
| **`jobWeather.js`, `useJobWeather.js`, `JobWeather.jsx`, or anything that turns an address into a point in the browser** | `node scripts/job-weather-budget.mjs` (dev server + credentials). **The job record geocodes through `address-suggest`, which is budgeted as a TYPING allowance — 60 an hour per IP, sized for a customer, spent by a detailer who is typing nothing.** It opens ten job records and then the first one again, counts the calls with the endpoint answered in the browser (no Geoapify credit, no hourly bucket touched), and asks the other half too: when a lookup IS refused, does the record say so, or does the weather strip just vanish |
| **`--tabclear`, `.tabscrim`, or anything that sets how far a dashboard screen's content stops above the tab bar** | `node scripts/scrim-clearance.mjs` (dev server + seed + credentials). **The fade behind the bar is `pointer-events: none`, so every hit-test gate reports the last line uncovered while it is painted over (`docs/gotchas.md` 100); ROADMAP 9.19 had it at 1.92:1 for weeks.** It reads the PIXELS: the fade's own opacity plus each text line's contrast with and without it. Red on the old 96/136 pair (`--break=old-geometry`, 20 failures), green now. Lines already under 4.5:1 with no fade are listed by name, never blamed on the scrim |
| **A keyboard path, a focus ring, or anything pinned over the page** | `node scripts/keyboard-walk.mjs` (dev server + seed). **The only instrument here that catches a control focused UNDERNEATH a fixed bar** — it is visible by every ordinary test and `scrollIntoViewIfNeeded` leaves it there. Carries two canaries and names the screens it caught them on |
| **A CSS custom property — declaring, moving, or "tidying" one** | `node scripts/var-scope-guard.mjs`. Credential-free, one filesystem read. **A `var()` on `html`/`:root` cannot see a property declared on `.bk`** — it takes its fallback forever, so the declaration is decoration and two numbers drift apart. Valid CSS, identical rendering, every browser check green |

**WHAT IS RUNNING IS NOT WHAT IS COMMITTED, AND YOU HAVE TO LOOK.** On
2026-09-20, **22 of 39 edge functions** were running something other than this
checkout — gaps up to 7 days, and two of them running from before modules they
import existed. Nobody knew, because **nothing in this repo ever required a
deploy to happen**, and every session in between read the committed source and
reasoned about it as though it were live. ROADMAP 0.6 has the full list.

`node scripts/deployed-inventory.mjs` fetches each deployed bundle from the
Management API and compares it against your checkout by content. **It exits 1
and prints every function by name**, because "22 functions differ" makes a
session sigh and move on, while the list answers the only question they have:
*is the one I just edited in it?* It writes a receipt, so it is graded rather
than read.

**DO NOT DEPLOY TO MAKE IT GREEN.** Publishing is Andrew's, alongside pushing
to GitHub — a function going live is publishing, and a session deciding that
for him because it would fix something is exactly the call it does not get to
make. Report what it says and leave it. The recommended shipping order lives in
`FOR-ANDREW.md`.

**Report what you observed, never "this should work."** A skipped check reads
exactly like a passing one — this repo's single most repeated failure. A guard
that skips must print that it skipped.

**Break a check on purpose before you trust it.** This repo has shipped at
least six checks that tested nothing. `sweep-widths.mjs` once printed *clean*
over 38 real findings.

**Don't edit `app/src` while a browser script is running.** Vite reloads the
page mid-run and the measurement is worth nothing while still reporting clean.
**And know which directories that protects and which it does not — measured
2026-09-20, not guessed at, after two sessions spent part of a night
serialized behind a guess about it.** Vite's watcher covers `app/src` only,
recursively, every file type — that is the whole reason the rule above
works: a walk in progress will tell you if that tree moved under it.
`docs/` and `ROADMAP.md` are outside it, so editing them cannot void a
running browser script; two sessions may work there and in `app/src` at the
same time with nothing to serialize. **`scripts/` is watched by nothing at
all.** If one session edits a script while another is running it, nothing
anywhere will say so — no reload, no warning, no error. That is the
dangerous one precisely because it is quiet: lend a `scripts/` file for one
commit rather than editing it unannounced underneath whoever owns it that
round.

**AND EVERY RULE ABOVE THIS LINE IS ABOUT FILES, WHICH IS NOT THE ONLY THING
TWO SESSIONS COLLIDE ON — 2026-09-23.** Two sessions can be perfectly
separated by directory and still be contending for the **address budget**, the
**daily email allowance**, the **demo tenant's rows** or the **`rate_hits`
table**. That collision has **no guard, no report and no failure**: the
victim's run completes, writes a receipt, and simply comes back *strange*, with
the cause minutes in the past and in the other session's pane. Two of those
non-file resources bit on the same night, and one of them put a wrong reason
into `ROADMAP.md`.

**`docs/shared-resources.md` is the one page to read before starting**, and its
rule is the amendment: **a lane statement names the public endpoints and shared
budgets a session will consume, not only the directories it will write**, and
it expires the moment either session is given something new. `docs/gotchas.md`
78 and 79 are the two measurements it came from; ROADMAP 14.16 is the item.

**`docs/gotchas.md` is ONE HUNDRED AND THIRTY-SIX specific ways a measurement lies to you** — a
closed `<details>` still measuring its children, `innerText` swallowing
`<option>` values, a backgrounded tab freezing animations, a stale dev server
serving old CSS, a grep-based check coupled to a spelling rather than a
behavior, a geometry sweep catching an exit animation mid-flight, a probe that
cannot tell a failed read from an empty one. Read it before trusting any
browser number. Every entry cost somebody real time.

**That line said "fifteen" until 2026-09-21 and the file had 65 entries** —
counted, not estimated. It was not two stale; it was fifty. **A pointer that
undersells a document by four times decides whether anybody opens it**, and
this one is the document a session is sent to before trusting a number. Count
it when you add to it.

**IT SAID "SIXTY-FIVE" AGAIN UNTIL 2026-09-23, AND THE FILE HAD 71 —
FOUND WHILE WRITING A GOTCHAS ENTRY ABOUT EXACTLY THIS FAILURE, NOT BEFORE
IT.** `grep -c "^## " docs/gotchas.md`, the same command this line's own
rule asks for, checked before editing rather than after. The number had
drifted six entries since 2026-09-21 and nobody had re-counted it in
between — this line is the same class of unreliable count its own
neighboring entry in `gotchas.md` describes: a derived tally written into
prose once and never re-run. Corrected here rather than silently, because
that is the instruction two paragraphs up.

**AND IT SAID "EIGHTY" UNTIL 2026-09-24, WHEN THE FILE HAD 80 — CORRECT ON
ARRIVAL, AND WRONG BY THREE BEFORE THE SITTING ENDED.** Entries 81, 82 and 83
were written that night, and the count was updated **in the same edit**, which
is the only version of this rule that has ever held. `grep -c "^## "
docs/gotchas.md` answers it in one command and there is no reason to guess.
**The two corrections above are kept because the pattern is the useful part:
this number goes stale every time somebody adds an entry and stops there.**

**AND THEN IT HELD, TWICE, WHICH IS WORTH ONE LINE SO NOBODY ADDS A FOURTH
CORRECTION ASSUMING IT DRIFTED AGAIN.** 83 → 84 → 85 across 2026-09-24, each
number moved in the same edit as the entry that caused it, by two different
sessions. **A session about to “fix” this line should run
`grep -c "^## " docs/gotchas.md` first** — one command, and this session drafted
a paragraph claiming the line had gone stale again before that command showed it
had not.
**84 on 2026-09-24, in the same edit as the entry** — a cron job writing to
the rows a check is measuring. Counted with the command above, not estimated.
**87 → 88 on 2026-10-02, same edit again** — a line number cited ninety-six
lines out (**that figure said thirty-nine until 2026-10-02; see 93**), and a
one-term grep that nearly reported the true claim beside it as
false. `grep -c "^## " docs/gotchas.md` was run before writing this, which is
the rule and is now four sittings unbroken.
**88 → 89 on 2026-10-02, same edit, same sitting** — a filter matching
`"1.3 —"` against `"11.3 —"`, which got the POPULATION wrong rather than the
verdict. Five sittings unbroken; `grep -c "^## " docs/gotchas.md` run first, as
always.
**89 → 90 on 2026-10-03, same edit** — a `finally` does not run on SIGTERM, so
wrapping a script in `timeout` defeated the teardown it was given and left a
51-table schema in the live database. Six sittings unbroken.
**90 → 91 on 2026-10-03, same edit** — `ROADMAP.md` and `docs/roadmap.md` reuse
item numbers, so a `git log --grep` for an item answers about the wrong
document; a date floor at 2026-09-12 removed 21 of 101 hits. Seven sittings
unbroken.
**91 → 92 on 2026-10-03, same edit** — a seventy-line note citing line numbers
inside the file it was being inserted into, wrong by exactly seventy. Eight
sittings unbroken.
**92 → 93 on 2026-10-02, same edit** — a correct measurement discarded because
the operator asserted a different number, and the write-up recorded the TOOL as
broken to make the two agree. Nine sittings unbroken.
**96 → 97 on 2026-10-02, same edit** — `git checkout HEAD -- <path>` destroyed an
hour of uncommitted work, after the same command on the same file had been safe
twice in the same sitting. **The two safe uses are what make it feel safe.**
Twelve sittings unbroken.
**97 → 98 on 2026-10-02, same edit** — a declaration compared with an inequality
carries slack; 10 found in `tests/`, 8 correctly floors, 1 converted, 1 split
because it was answering two questions. Thirteen sittings unbroken.
**98 → 99 on 2026-10-07, same edit** — verification that exists only as a
live URL is not transferable, measured when the manager's Chrome could not
reach `localhost:5173`; visual claims now ship as screenshot FILES under
`.manager-shots/`. Fourteen sittings unbroken.
**99 → 100 on 2026-10-07, same edit** — a hit test answers *"can this be
pressed"*, never *"can this be read"*: `.tabscrim` is `pointer-events: none`, so
`elementFromPoint` reported the calendar legend uncovered while it was painted
over at 1.47:1. Fifteen sittings unbroken; `grep -c "^## " docs/gotchas.md` run
before writing this, as the rule says.
**100 → 101 on 2026-10-07, same edit, same sitting** — `node --experimental-strip-types --check file.ts` exits **0 on a file with `(((` injected** and **1
on a valid file**, so its exit code says nothing; `module.stripTypeScriptTypes()` is the parser
that actually throws. **It had been written into ROADMAP 9.18 (d) as evidence the night
before**, and that entry is corrected rather than quietly edited. Sixteen sittings unbroken.
**93 → 94 on 2026-10-02, same edit** — 44 recorded figures re-run, 5 survived; a
number with no command and no revision beside it is a memory. Ten sittings
unbroken.
**94 → 96 on 2026-10-02, same edit, two entries** — **95**, a canary aimed at an
assertion that changed shape keeps passing while testing nothing, and the run goes
green with the sabotage switched on; **96**, a background task killed at its cap
can stop a commit between the tree and the ref, so *Running* is not evidence the
commit happened. Eleven sittings unbroken.

## Hard rules

- **Two Supabase projects, and until 2026-09-19 this rule named only one of
  them — the one this repo cannot reach.**
  - **`kguqylyzgyzfktkfnhjb` is this platform's own database, and it is fully
    usable — read and write, no restrictions.** It is what `.env` points at,
    what every script here writes to, and **what `detailingplatform.com`
    itself runs on** (measured: the live bundle's own Supabase host). Andrew,
    2026-09-19: *"This project has no live customers, no anything… it's just
    we've been developing so far. Everything on there is just fake accounts
    and whatnot."* So a seed, a fixture, a migration or a temporary table is
    fine here. **Say what you are about to write before you write it** — the
    public site reads this database, so a mistake is visible, even though
    nobody's money is in it.
  - **`adtlnvihwrcqcasqcjwd` is the presumed real business database —
    andrewsdetail.com, Andrew's actual detailing business. Never write to it.**
    **Its identity is NOT confirmed.** Andrew is certain the real business has
    its own separate project and is not certain of the ref; he believes it has
    no Claude connector at all. This ref is the leading candidate because it is
    the one this rule has always named. Treat it as strong caution, not as
    fact: **if you ever find yourself connected to a project that is not
    `kguqylyzgyzfktkfnhjb`, stop and ask**, whatever its ref.
  - The access token in `.env` can currently see **only**
    `kguqylyzgyzfktkfnhjb` — verified 2026-09-19 against the Management API's
    project list. That is a fact about today's token, not a safety mechanism.
  - **AND THAT IS ONE OF TWO CREDENTIAL PATHS. THE OTHER ONE REACHES HIS REAL
    BUSINESS — measured 2026-09-21.** The Supabase **MCP connector** is a
    different credential from `.env`, and it lists
    **`adtlnvihwrcqcasqcjwd`** — the live business — **and `practice-rail`,
    and NOT `kguqylyzgyzfktkfnhjb`.** So the token in `.env` cannot reach the
    business you must never write to, and the connector cannot reach the one
    you are working on: **a session that reaches for the connector believing
    it points at this platform is one `project_id` away from writing to
    Andrew's real business, and that project is the FIRST row it returns.**
    Use `.env` and the Management API for this repo's database; if a connector
    call is the only way to do something, check its project list first. **A
    rule that describes one of two credential paths reads as complete**, which
    is why this line exists.
- **COMMIT WITH EXPLICIT PATHS: `git commit <path> …`, never a bare
  `git commit`.** Staging by name is NOT enough, and this is why: **a commit
  takes the whole index**, so anything another session has already staged goes
  in with yours. It happened twice on 2026-09-20 in both directions — one
  session's commit carried another's roadmap edits, and a commit that ran
  `git add` on three files by name still swept up two receipts somebody else
  had staged. Naming the paths on the commit line bypasses the index entirely.
  **And read back the staged CONTENT before you commit** — `git diff --cached`,
  not `--name-only`.

  **THE FIRST VERSION OF THIS RULE SAID `--name-only` AND IT WAS NOT ENOUGH.**
  Corrected 2026-09-20, the same day it was written, because the other session
  proved it: **its four file names were exactly right while another session's
  content sat in the index underneath them.** A name tells you which file is
  staged. It does not tell you *which version* of that file, or whose edits
  are in it. That session only caught it on the next commit's diff, after the
  wrong content had already gone in.

  It happened to this session too, in the other direction: the index was
  holding a **pre-edit copy of `ROADMAP.md`** whose name looked perfectly
  ordinary and whose content would have reverted a night's write-up.
  `--name-only` shows `ROADMAP.md` either way.

  **The rule is recorded here as it was improved rather than quietly
  replaced**, because the reason the first version failed is the useful part:
  it is the same mistake as a check that counts its targets without looking at
  them. *Tested rather than believed: the index was read back empty, one path
  was committed, and the other session's two dirty files were confirmed still
  untouched afterwards — a test that proved the explicit-path half and says
  nothing about the read-back half, which is exactly how the gap survived.*

  **AND NOW THE THIRD VERSION, BECAUSE EXPLICIT PATHS FIX CROSS-FILE
  CONTAMINATION AND DO NOTHING ABOUT SAME-FILE — 2026-09-20, the same day
  again.** `git commit <path>` takes the **working tree** copy of that path.
  So naming `ROADMAP.md` keeps the *other* session's other files out of your
  commit, and sweeps up whatever they have half-written **inside ROADMAP.md
  itself**. The rule written this morning reads as though it closed the hole.
  It closed one wall of it.

  **Caught before it wrote, and here is how.** A session read back its own
  `ROADMAP.md` diff before committing and found it about to **delete six lines
  of another session's item 11.3** — its working copy was stale, so the other
  session's addition showed up as a deletion. Nothing in the file name said
  so; only the content did.

  **And the same file crossed in the other direction in the same hour, which
  is the part worth reading twice.** That session's own skip-audit block —
  seventy lines, written and not yet committed — was swept into the other
  session's commit `4932774` by exactly this mechanism. That commit was then
  **amended into `a47a9bc`, which dropped the block out of history
  altogether.** It survived only because it was still sitting in the working
  tree. **A swept-up edit is not merely misattributed; it can be silently
  destroyed by the next amend.**

  **THE RULE, and it costs nothing:** **`ROADMAP.md` is edited and COMMITTED
  in the same turn. Never leave it dirty between turns.** Before editing it,
  check whether it is already dirty — `git status --porcelain ROADMAP.md`. If
  it is, and the changes are not yours, **STOP and say so.** Do not commit
  around them and do not commit through them. That shrinks the window from
  hours to seconds without anybody asking permission for every edit. The same
  applies to any long shared document two sessions both append to —
  `DECISIONS.md`, `FOUND.md`, `FOR-ANDREW.md`, `docs/VERIFIED.md`.

  **AND THE FOURTH VERSION, BECAUSE THE READ-BACK STEP WAS OPENING THE WINDOW
  THE RULE EXISTS TO CLOSE — 2026-09-21.** `git diff --cached` only shows
  something once it is staged, so obeying version two meant running `git add`
  first. **`git add` puts your file in the shared index.** From that moment
  until your commit lands, any other session running a bare `git commit`
  takes your file with theirs — which is the exact contamination the whole
  rule was written to stop. **The rule was manufacturing the hazard it
  warns about, in its own verification step.**

  **THE FIX IS ONE WORD SHORTER AND TOUCHES NOTHING:** read the content back
  with **`git diff <path>`**, not `git diff --cached <path>`. It compares the
  working tree against `HEAD` and prints **byte-for-byte the same content**
  for a file you were about to stage, while **never touching the index**. The
  file is never shared, so the window never opens. `git commit <path>` then
  takes the working-tree copy exactly as before.

  ```bash
  git diff ROADMAP.md          # read the CONTENT, index untouched
  git commit ROADMAP.md -m "…" # takes the working tree, not the index
  ```

  **ONE CASE THIS DOES NOT COVER, FOUND BY HITTING IT TWENTY MINUTES AFTER
  WRITING THE RULE: A FILE GIT HAS NEVER SEEN.** `git commit <path>` answers
  *"pathspec … did not match any file(s) known to git"* for an untracked
  file, and `git diff <path>` prints nothing for one, because there is no
  `HEAD` copy to compare against. **A new file has to be `git add`ed, so for
  new files the index window is unavoidable.** Do not pretend otherwise and
  do not let it push you back to staging everything:

  ```bash
  git add receipts/new-thing.json && git commit scripts/x.mjs receipts/new-thing.json -m "…"
  ```

  **One command, so the window is the width of a commit rather than the width
  of composing a message** — which is the part that actually took minutes in
  the incident above. Read a brand-new file's content with `cat`; there is
  nothing to diff it against anyway.

  **This session did it wrong an hour before writing this**, which is how the
  cost is known rather than argued: it ran `git add` on three paths purely to
  read them back, and left them in the index while it composed a commit
  message. Nothing went wrong, because the other session happened not to
  commit in those seconds. **That is luck, not a safeguard**, and a rule whose
  compliance step depends on luck is not a rule.

  **Four versions, all kept, because the shape of the correction is the
  lesson.** `--name-only` missed *which version* of a file was staged.
  Explicit paths missed *the other session's edits inside your file*. The
  read-back missed that **verifying safely and staying out of the way are two
  different requirements, and the obvious command does only the first.** All
  three are the same failure this repo keeps meeting: **a check that reads
  the label instead of the contents** — and this last one adds the sharper
  version of it, **a check whose own act of looking changes the thing it is
  looking at.** A rule corrected three times in the open is one the next
  session will actually read.
- **SIZE A BULK PROSE DELETION BEFORE YOU WRITE IT, NOT AFTER.** Cutting from
  a heading or a list item to "the next one like it" is how a whole section
  leaves with the row you meant to remove: on 2026-09-21 that swallowed
  `FOR-ANDREW.md`'s Recorded block — **182 lines instead of 51**, taking a
  survey, a correction and three settled decisions out of the document Andrew
  was about to open. Nothing was committed and it came back from `HEAD`, which
  is luck rather than a safeguard. **A deletion that overruns is
  indistinguishable from one that worked, because both leave a file that
  parses and still looks finished** — no error, no red check, nothing to
  notice. So say how many lines you expect before you cut, refuse the write
  when the block is bigger than that, and look again. It is the same failure
  as a check that reads the label instead of the contents, one level out: the
  edit succeeded, and nobody asked what else it took.
- **BEFORE CHANGING A SHARED VARIABLE, FIND OUT WHETHER A PREVIOUS ITEM
  ALREADY DECIDED NOT TO.** A default on a token, a CSS custom property, a
  constant every screen reads — changing it is never local, and the reason it
  holds an awkward value is often that somebody already looked.
  **`--bk-bar-clear` is the worked example, 2026-09-20.** It reserves 104px for
  a fixed bar, is overridden to 26px on pages that HAVE the bar, and therefore
  applies its full 104px **only to the four pages with no bar at all**. That
  reads as an obvious one-line fix. It is not: `booking.css:115` records that
  roadmap 2.15 kept the old literal deliberately *"so the confirmation screen,
  the manage screen and the plans page are untouched by this change."*
  **Repeating a change a previous item chose not to make, without saying why it
  is safe now, is how a deferred decision becomes an accidental one.** The cost
  is not the four surfaces — it is that **nobody can tell afterwards whether it
  was overturned or forgotten.** So either say in the commit why it is safe
  now, or hand it over as a scoping question. A narrower per-page patch is
  usually worse, not better: it hides the decision inside an exception to the
  very variable that exists to stop numbers drifting.
  `docs/booking-steps-triage-2026-09-20.md` § "THE HANDOVER" has the full case.
- **EVERY REALTIME CHANNEL IS PRIVATE. NO EXCEPTIONS.** Any
  `supabase.channel(...)` must be opened with
  `{ config: { private: true } }`, and the first session to write one is the
  one this rule is for — **the fault does not exist until that line is
  written, and at that moment it is already shipped.**

  **This is measured, not asserted. Proved 2026-09-21 by
  `scripts/tenant-matrix.mjs`:** a client holding only the **anon key, with no
  session at all**, joined a channel opened without `private: true` and
  **received tenant B's message verbatim** — the detector only fires when B's
  own sentinel string arrives intact. **A channel without `private: true` is
  authorised by NOTHING.** The topic name is the only thing separating two
  tenants, and a business id is a guess away, so
  `supabase.channel('bookings-' + businessId)` is a cross-tenant channel on
  the day it ships.

  **Private channels ARE closed, and that was proved in the same run** —
  `realtime.messages` is RLS-on with zero policies, and the anonymous client
  was refused with `CHANNEL_ERROR … Unauthorized`. So the fix costs one config
  object; there is nothing to design.

  **The app opens zero channels today, which is exactly why this is a rule and
  not a finding.** Nothing is exposed right now. There is no bug to point at,
  no screen to check, and no test that will go red — so the only thing that
  can stop it is a session reading this before it writes the line.
  `receipts/tenant-matrix.json` carries the standing-risk note on every run.
- **BEFORE YOU WRITE A FIGURE INTO ANY DOCUMENT, READ `docs/gotchas.md` 94.**
  **A recorded number carries the command that produced it AND the revision it
  was taken at, or it is not a measurement — it is a memory.** Ratified
  2026-10-02 after **44 recorded figures were re-run and 5 survived**: 8 are
  simply false on pages that read as evidence, and 31 cannot be re-taken at all.
  **All eight false ones were correct when written** and reproduce exactly at the
  commit of the line stating them — so the fault is not carelessness, it is that
  a bare count stops being checkable the moment anything moves.

  **The only figure in either pass document that survived by design is the one
  written with its revision beside it.** The second-best form is a **proportion**
  — *62 of 62*, *all seven* — which survives its population changing. **Never
  publish a bare count.**

  **And when a number genuinely cannot be re-taken, say so in those words rather
  than inventing an approximate command** — the scope was never recorded, it is a
  judgement rather than a count, the instrument is gone, or it is
  **unrepeatable by construction** (a measurement of a FIRST reading, which a
  re-run destroys rather than repeats). That last one is an honest property, not
  a defect, and must not be counted as one.

- **WHEN YOU CHANGE THE SHAPE OF AN ASSERTION, RE-RUN EVERY CANARY AIMED AT IT
  IN THE SAME EDIT, AND SAY IN THE COMMIT THAT YOU DID.** `docs/gotchas.md` 95.
  **Measured, not feared:** a declared equality was relaxed to a monotonic floor
  — the right fix, because the figure moved on every commit — and that silently
  disarmed the sabotage aimed at it, because the sabotage moves the count UP and
  a floor only sees DOWN. **The sabotaged run reported 7 passed, 0 failed with
  the defect switched on**, and printed the inflated figure in its own report
  while calling itself green. Equality→floor, exact→range, count→presence and
  deep-equal→subset all do this.

  **A canary must also be aimed at PRODUCTION CODE, never a copy.** The rule
  under test lived inside its caller and the assertion had its own inline copy of
  the regex, so the sabotage could not reach it. Lifting the function out is what
  made it bite again.

- **A BACKGROUND TASK SHOWING `Running` IS NOT EVIDENCE ITS COMMIT HAPPENED.**
  `docs/gotchas.md` 96. A task killed at its thirty-minute cap can be stopped
  between writing the tree and updating the ref. **Confirm with
  `git log --oneline -1` against the message you expected.**

- **BEFORE `git checkout HEAD -- <path>`, RUN `git status --porcelain <path>` AND
  REQUIRE IT TO BE EMPTY (or to be only the thing you are undoing).**
  `docs/gotchas.md` 97. **It destroyed an hour of uncommitted work on 2026-10-02**,
  having been used safely on the same file twice earlier in the same sitting — the
  command reverts the PATH to HEAD, not your last change, and on the safe runs
  there was nothing else between them. **The loss leaves nothing that looks
  wrong**: the file parses and the check goes green, which is what success looks
  like.

  **And the mitigation that made it cost minutes instead of the sitting: make any
  multi-line change to a shared document with a SAVED SCRIPT rather than by
  hand.** Re-running four scratchpad scripts restored everything. A hand-edited
  document has no undo once the working tree is gone.

- **A DECLARATION OF HOW MUCH DEBT EXISTS IS ASSERTED WITH AN EQUALITY, NEVER AN
  INEQUALITY.** `docs/gotchas.md` 98. A bare count, an allowlist size, a
  known-skip tally — **a ceiling with room in it means the next one lands with
  nothing going red**, which is how 196 came to sit over an actual 192. **A
  DISCOVERY FLOOR is the opposite and must stay a floor**: finding more surfaces
  than expected is not a fault, and converting one reddens the run every time the
  repo grows.

  **And if a constant is doing both jobs, split it rather than choosing.**
  `EXPECTED_ROWS` guarded a parser *and* declared a row count; a floor was right
  for the first and wrong for the second, so either choice was half wrong.

- **Migrations are append-only.** Never edit an existing one.
- **Never commit `app/.env.production` or any credential.** No password, token
  or key goes into a markdown file either — say where it lives, not what it is.
- **`reference/` is read-only.** It is the old site, kept as canon.
- Consequential writes go through edge functions, not the browser client.
- Working branch is `main`. Ask before merging anything large into it.

## Conventions that break the defaults

- **American English in everything a person reads** — color, license, check,
  odor, tires, hood, parking lot. Two exceptions that are data rather than
  spelling: `"cancelled"` is the database's own value across five tables, and
  `"colour"` is a setup-step key stored on every business. Renaming either
  breaks live data.
- **Changing an English string means changing its Spanish key in the same
  edit.** `app/src/lib/strings/appEs.js` is keyed on the English text, so a
  renamed string silently falls back to English with no error anywhere.
  `node scripts/i18n-survey.mjs` finds them afterwards.
- **`app/src/book/core.js` has no `import` statements of any kind** and must
  stay that way — it is the booking rules, droppable into a tenant's own site
  built on anything. `tests/booking-core.test.mjs` enforces it by reading the
  file as text. New booking rules go in there; the page calls them.
- **Reach for `app/src/components/controls.jsx` before writing a component.**
  `Setting`, `Switch`, `Segmented`, `DurationChoice`, `Stepper`, `MoneyField`,
  `HourChoice`, `Group`, `PasswordInput`, `Folded`.
- **One formatter each.** `app/src/lib/format.js` holds `money`, `time12`,
  `duration`, `dateLong`, `localDate`, `localTime`. There is still no phone
  formatter; when one is needed it goes there.
- **Two to five mutually exclusive choices is a segmented control, never a
  native `<select>`.** A mapped or searchable list (the timezone picker) is
  exempt and the test already knows.

## Design

`docs/design-system.md` is the system. The reference rendering is
`docs/design-directions/5-the-thread.html`, and where the document and that
page disagree, the page is right.

Absolutes:

- **44px of real hit area.** A deliberately small mark (a 7px rail dot, a color
  swatch) keeps its size and grows its target with an absolutely positioned
  `::after` negative inset. A bounding rect cannot measure this — probe with
  `elementFromPoint`, and check the pitch too, or two 32px targets 18px apart
  steal each other's presses.
- **Verify by looking**: screenshot 1920 / 1440x900 / 768x1024 / 392x844, read
  the console at each, in the normal path and `?lite=1`. 320px is the narrowest
  supported width and `sweep-widths.mjs` sweeps it by default.
- **Phones first — Andrew, 2026-10-10.** 70-80% of looks at this product are on a phone. Design every
  screen at 390px first, then widen; the phone shows everything the laptop shows, nothing is cut by an
  edge or oddly sized, and "nothing overlaps" is the floor, not the bar. `DECISIONS.md`, "Phones first".
- **A phone stays portrait.** Rotating it changes nothing — every `min-width`
  breakpoint that spends height carries `and (min-height: 500px)`.
- **Anything that opens, animates in, and ships its exit in the same change.**
  `.split > .col-2` already carries `column-in`/`column-out`;
  `hooks/useLeaving.js` is the exit. Don't invent a second mechanism.
- **Never-defaults**: Inter/Roboto/Arial/system-ui/Space Grotesk as a design
  choice, purple-blue gradients on white, three evenly spaced cards, numbered
  markers on non-sequences, "modern and clean" copy, and copy that explains
  what the label already said.
- **Plain, direct voice.** Short declarative sentences, one fact each. No
  exclamation marks, nothing "seamless" or "effortless". The writing already in
  this product — the "Your web address" screen, the FAQ answers — is the target.
- **Never a gray placeholder box.** An Unsplash connector is wired up. If it
  can't find the right shot, ask Andrew — he would rather go source an image
  than have the work limited by what is to hand.

`docs/screen-rules.md` is Andrew's own rulings from reviewing about 35 screens:
the exhaustion test, section eyebrows, field sizing, the destructive-action
pattern. Read it before calling a screen finished. **The em-dash rules are in
`docs/gotchas.md`, not here** — three parts, starting "THE EM DASH HAS THREE
SHAPES AND THREE TREATMENTS." This line pointed at screen-rules.md, which
contains the word "dash" only inside "dashboard"; corrected 2026-09-20 after
the other session went looking for the rule before accusing a screen of
breaking it and found it was not where CLAUDE.md said.

`docs/TASTE-NOTES.md` is what he actually likes, from sites he sent unprompted.
It outranks any inference about his taste written anywhere else.

## Where the knowledge lives

This repo holds **1,297,000 words of markdown** — measured 2026-10-03,
`git ls-files '*.md' | xargs cat | wc -w`, which answers in one command. **This
line said 1,105,000 and before that 930,000**; the real figure was **1,297,037**
when it was last run, so it had drifted ~192,000 words — about 17% — in twelve
days. **Both corrections are kept because the pattern is the point: this is a
derived tally written into prose, which `docs/gotchas.md` 91 is about, and it
goes stale every time anybody writes anything.** Run the command rather than
trusting the number. Nobody
`git ls-files '*.md' | xargs cat | wc -w`. **This line said 930,000.** Nobody
reads it end to end.
Open a long file only when the work touches its subject.

| File | What it is |
|---|---|
| `docs/MANAGER-CLOSE-2026-09-21.md` | **Read this first, once, before picking anything up.** Andrew's rulings from the 20th in binding form; the four things that changed OUTSIDE the repo that night, which `git log` cannot show you; the backups correction; the publishing order; and what each session left on the floor |
| `docs/README.md` | The map — **and it covers 63 of the 113 documents in `docs/`, measured 2026-09-21, so an absence from it means nothing.** Two of its pointers named files that were not there: `START-HERE.md`, deleted 2026-09-16, and `HANDOFF-2026-09-19.md`, which never existed in git. Both are marked in place; the four files this table names that were missing from it now have rows |
| `PROJECT-STATE.md` | Full state briefing; §1–7 only, the rest is a journal |
| `docs/BATCHES.md` | **The running order — start here.** The open items cut into session-sized batches, each marked lane A (`app/src`) or B (not), with the model it deserves |
| `ROADMAP.md` | **The live fix queue.** What each item is and why. Ordered by risk, not by size |
| `FOR-ANDREW.md` | **Andrew's own list** — accounts to open, keys to paste, calls to make. A session that hits a blocker adds a row and keeps going |
| `docs/how-we-run.md` | How we work: the speed research folded into the operating-system report, and the five places it contradicts a decision Andrew already made |
| `docs/audits/` | The two September 2026 live-site audits the queue is built from |
| `docs/roadmap.md` | The long build history |
| `FOUND.md` | Known problems parked, not yet fixed |
| `DECISIONS.md` | Every judgment call and why. **Start at its index** — it is 186,000 words |
| `docs/VERIFIED.md` | What has been proven, when, and at which commit |
| `docs/gotchas.md` | How measurements lie |
| `docs/silences.md` | **Which checks can tell a pass from a did-not-run, and which cannot.** **RECOUNTED 2026-09-21 — start at "THE CENSUS RECOUNTED", not at the old table under it.** 28 of 76 scripts now write a receipt `receipt.mjs` grades, all 28 carry a canary, 21 carry a `--break=` sabotage switch; section A's 7 ungraded gates and section B's 5 hollow receipts are **all closed**, and every receipt now records the commit it started on as well as the one it finished on. **The old numbers — 33, 21, 7, 5 — are kept and marked rather than corrected, because the reversal is the load-bearing part.** It also carries the night's honest headline: the open count went **UP, 56 → 60**, because four already-shipped faults became visible for the first time. Read it before trusting any check's silence — and it says which entries were proved by running them and which were only read |
| `docs/screen-rules.md` | Screen-level design rulings |
| `docs/tenant-site-kit.md` | The brief for building a client's own website |
| `docs/services-and-secrets.md` | **Every third-party service, which of Andrew's email addresses is on it, and where each key lives — never its value.** Written 2026-09-22 because a chat window holding most of it was about to be cleared. Also the live state of Telnyx, the Google application, the blocked ZeptoMail domain and the daily 09:00 Pacific inbox check that nobody should rebuild |
| `docs/the-photo-allowance.md` | What a detailer's photo limit is, why the number is still 1 GB until uploads actually move, and how the cap would be enforced once R2 is the store — **including the two ways it fails silently** |

Appending to `DECISIONS.md` means adding your line to its index in the same
edit — `node scripts/decisions-index.mjs` exits 1 if you forget. Mark
superseded entries rather than deleting them; the reversal is usually the
load-bearing part.

## Publishing

**A push to `main` runs the release gate first (ROADMAP 0.6d).** `.githooks/pre-push`
runs `deployed-inventory.mjs` and REFUSES the push, naming each program, when the
server is not running this checkout or the check could not run; `SHIP_WITH_DRIFT=1 git
push` is Andrew's override and it never publishes anything. It is switched on per
checkout with `git config core.hooksPath .githooks` (this one is on; a fresh clone is
not). `node tests/release-gate.test.mjs` proves it: credentials, read-only, about 7
minutes, and its first line reddens if the hook is not switched on here.

A push to `main` may or may not publish. Netlify build credits ran out, and the
state has flipped twice without anybody editing the note that claimed it.
**Measure it rather than believing a document:**

```bash
curl -s https://detailingplatform.com/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'
npm run build --prefix app && ls app/dist/assets/*.js
```

Same hash means a push publishes. A different hash means publishing is blocked.
`curl` cannot answer it any other way — `_redirects` sends every unmatched path
to `index.html`, so every URL on that domain returns 200, including ones that
do not exist.

A production deploy costs 15 credits; a **branch deploy or deploy preview costs
zero**, and a preview is a real URL Andrew can open on his phone.

The example tenant sites are a localhost thing: `build-examples.mjs --dev`,
then `localhost:5173/ex1` … `/ex5`.
**101 → 102 on 2026-10-08, same edit** — a sabotage whose scripted edit silently never matched;
the file was untouched and the run's `pass 18 / fail 0` was an ordinary clean run, which is the
same output a caught sabotage produces. **Prove the break landed with `git diff --numstat` before
believing either colour.** Found by the supervisor, on itself, while verifying 0.11 slice 4.
Seventeen sittings unbroken; `grep -c "^## " docs/gotchas.md` run before writing this.

**102 → 103 on 2026-10-08, same edit** — a reveal that is *reversible by design* reads as
`opacity: 0` from the top of the page, so nine of `/terms`'s eleven clauses measured as blank on a
page that was rendering perfectly. **It is the INVERSE of the reveal entry already in this file and
that entry's rule makes it worse**: waiting for `opacity === "1"` waits for ever. Read a reversible
reveal from where the reader is standing, and measure the TAIL separately. Found while verifying
ROADMAP 0.4's one added clause, and nearly written up as a defect in that clause.
Eighteen sittings unbroken; `grep -c "^## " docs/gotchas.md` run before writing this, and again
after, which is how the 103 above is a count rather than an increment.

**103 → 104 on 2026-10-08, same edit** — `node --test <file> --break=x` does not pass the flag to
the file: node consumes every extra argument and the child's argv is just `[node, <file>]`, so a
test-file sabotage switched on the obvious way is switched off, and prints the same green a caught
one prints. **Two switches already in `tests/` read `process.argv`, and one of them is named in the
verification table above.** Nineteen sittings unbroken; `grep -c "^## " docs/gotchas.md` run before
writing this and again after, so the 104 above is a count rather than an increment.

**104 → 105 on 2026-10-08, same edit** — a sabotage can be "caught" by a gate's STATUS RULE rather
than by any assertion: the pre-fix `/examples` gate printed `FAIL` under `--break=inject` while
finding nothing at all, because a non-empty unrecognized `--break=` reds its status expression.
**The spec's own acceptance test — *"it must fail on a gate without the fix"* — is therefore
satisfied by the broken gate**, and a session confirming its own fix reads that red as success.
Certify on the FINDINGS LIST (1 naming ex3, against 0), never on the verdict word. Found while
certifying ROADMAP 7.10. Twenty sittings unbroken; `grep -c "^## " docs/gotchas.md` run before
writing this and again after, so the 105 above is a count rather than an increment.


**109 → 111 on 2026-10-09, same edit, two entries, both by the supervisor and both found while proving
ROADMAP 3.1a's scrollbar.** **110**, *"does the page overflow at all"* is not the test for *"a native bar
drawn across this design"* — the document overflows by 12px at 1440 and 78px at 392 on a screen that is
correct, and the first version of the check printed a **false defect at both widths** over a list whose own
box holds 2,298px and 3,284px of scroll; the fix is a comparison (page overflow < the list's own scrollable
height) rather than any invented pixel budget. It also carries the two traps underneath it: `scrollHeight >
clientHeight` is not *"this scrolls"*, and `.settings-body` does not exist at 392, so the assertion reddened
on a **missing element** rather than a wide one. **111**, the no-overlap report rounded what the rule
compared — a caught red printed *"tightest gap 0px"* over a real -0.02px, so its own evidence said it should
have passed. Relaxing that rule to a -0.5px tolerance is the equality-to-floor move 95 warns about, so
`the-stacked-rows` was written and run **in the same edit**. Twenty-four sittings unbroken;
`grep -c "^## " docs/gotchas.md` run before writing this and again after, so the 111 above is a count rather
than an increment.

**107 → 109 on 2026-10-09, same edit, two entries, both by the supervisor and both found on ONE
number** — ROADMAP 2.1b's booking total. **108**, a `:not([aria-pressed=true])` locator with
`.nth(i)` in a loop re-resolves against a list the previous click just shortened, so the label
printed is not the element clicked; **109**, "the text stopped changing" returns on the
**pre-update plateau**, which is byte-identical to a settled reading. **Both printed the same false
defect — *"the price did not move"* at two widths — over a page pricing correctly**, and the second
appeared only after the first was fixed. A false defect is the direction that gets working code
"fixed". The fix in both cases is to ask the thing that knows: verify the click's `aria-pressed`
flipped, and settle on the request count rather than on the rendering. Twenty-three sittings
unbroken; `grep -c "^## " docs/gotchas.md` run before writing this and again after, so the 109
above is a count rather than an increment.

**106 → 107 on 2026-10-08, same edit** — `page.waitForSelector` defaults to `state: "visible"`, and
Playwright's "visible" means a non-empty bounding box, so **a loading container is invisible for
exactly the interval in which it is true**: the wait timed out at all five widths and printed a
finding about the PRODUCT — *"the list is NOT marked busy"* — on a screen that was marked busy for
1.8 seconds every time. `state: "attached"` is the whole fix. **It fails toward a FALSE DEFECT**,
which is the rarer direction in this file and the one that gets working code "fixed". Found while
building `scripts/mail-log.mjs` for ROADMAP 3.1. Twenty-two sittings unbroken;
`grep -c "^## " docs/gotchas.md` run before writing this and again after, so the 107 above is a
count rather than an increment.

**105 → 106 on 2026-10-08, same edit** — a selector chosen from the WORD in somebody's claim rather
than from their picture. `/ex2` has two wordmarks; `.brand` is the obvious one and the wrong one, and
measuring it refuted a true 42px overlap cleanly at five widths with no error and no console noise.
The real element is the `aria-hidden` `.ghost` watermark, and against it the original figure
reproduces to the pixel. **A refutation deserves more scepticism than a confirmation**, because
confirming costs nothing and refuting overwrites a correct record. Found by the supervisor, on
itself, while re-checking ROADMAP 7.10. Twenty-one sittings unbroken; `grep -c "^## " docs/gotchas.md`
run before writing this and again after, so the 106 above is a count rather than an increment.

**111 → 112 on 2026-10-09, same edit, by the supervisor** — the photo cap is checked in two
callers that weigh DIFFERENT BYTES: `JobPhotos` the original file, `receipts.js` the shrunk blob.
A 1×1 PNG padded to 2 MB breaches the first and legitimately FITS through the second, so a correct
refusal that never fired printed as *"the product shows no refusal"* — **8 false defects of 22, at
both widths and in both languages, over a screen composing the sentence perfectly.** The fix that
generalises is not the fixture: it is asking the sheet's own label whether it holds the file before
pressing Save. Twenty-five sittings unbroken; `grep -c "^## " docs/gotchas.md` run before writing
this and again after, so the 112 above is a count rather than an increment.

**112 → 113 on 2026-10-09, same edit** — a scripted rewrite can land in the response and still not be what
EXECUTED: `route.fetch()` performs its request through the BROWSER, so the ORIGINAL lands in the browser's
cache and the next navigation runs it with **no request to intercept**. Measured `served 1, executed 1` on
navigation one and `served 1, executed 0` on navigation two, so a flag-gated branch was pressed on a document
running the untouched module and printed a **false defect at three widths**. **It survives a 102 check, because
102 asks whether the EDIT landed and this asks whether it RAN** — sign the rewrite and read the signature out
of the page. `cache-control: no-store` does not close it and neither does `Network.setCacheDisabled`;
Chromium's per-renderer memory cache sits outside both, so the fix is one `goto` per context. Found by this
session, on itself, building 0.11b's browser gate. Twenty-six sittings unbroken; `grep -c "^## " docs/gotchas.md`
run before writing this and again after, so the 113 above is a count rather than an increment.

**113 → 115 on 2026-10-09, same edit, and the pointer above was TWO stale rather than one.** 114 was added
by another session without moving the line, which is the exact drift this line's own rule is about, and the
0.11bb write-up had already spotted it and left it. 115 is `innerText` returning what CSS RENDERED: `.label`
is `text-transform: uppercase`, so an assertion comparing a composed sentence against `innerText` printed
**six false defects** over a screen rendering it correctly, and Playwright's own `hasNotText` filter in the
same block was reading `textContent` and getting it right. `grep -c "^## " docs/gotchas.md` run before
writing this and again after, so the 115 above is a count rather than an increment — and the pointer at the
top of this file was corrected in the same edit, which is the half that keeps going undone.

**115 → 116 on 2026-10-09, same edit** — a negated character class bounding a list truncates on the
first delimiter *inside* a quoted value: `[^\]]*` over `PLATFORM_HOSTS` stopped at the `]` in
`"[::1]"` and read **four hosts of five**, after which every rule reported cleanly on the four and the
run's own evidence line printed `4 hosts` in exactly the tone it printed `5` after the fix. **A count
a check derives from its own parse cannot validate that parse.** Found twice in one minute, the second
time as a bucket resolver that looked in one file, resolved **2 of 3** and printed *"names all 2
buckets"* as a PASS over a three-bucket table. `grep -c "^## " docs/gotchas.md` run before writing this
and again after, so the 116 above is a count rather than an increment.

**116 → 117 on 2026-10-09, same edit, by the supervisor** — a caught sabotage writes the same
`"status": "fail"` a real defect does, and it is the LAST thing on disk.
`receipts/mail-log-scroll.json` stood at `fail` with two credible failures over **ROADMAP 3.1a, which
is ticked and correct** — re-run clean it is 20 assertions, 0 failed — and the only trace of why was
`dimensions.break: "unstyled"` nine lines down. `r2-public-base.json` was in the same state.
**A sabotage red beats every honest receipt before it and invites a session to "fix" working code.**
Fixed at the shared writer: a receipt recording a `dimensions.break` now lands in
`receipts/<name>.sabotage.json`, so one guard covers all 28 graded checks — **and a check that
forgets to record its break still clobbers its own receipt, silently.** Twenty-seven sittings
unbroken; `grep -c "^## " docs/gotchas.md` run before writing this and again after, so the 117 above
is a count rather than an increment.

**117 → 118 on 2026-10-10, by the supervisor, committing a predecessor's entry that sat uncommitted** — a
control-character guard that splits a CRLF file on `"\n"` finds character 13 on every line, so its real
finding drowned in a permanent red. The entry had been written and left in the working tree with this pointer
unmoved, which is the drift this line exists to stop. `grep -c "^## " docs/gotchas.md` run before and after.

**118 → 119 on 2026-10-10, same edit, same supervisor** — a computed colour read straight after a runtime
class change is the transition's first frame, so a sabotage that re-added `primary` printed PASS with the
defect on; settled 800ms, it went red at both widths. `grep -c "^## " docs/gotchas.md` run before and after.

**119 → 120 on 2026-10-10, same edit** — the one red 404 a console shows that is not a failure: the gear's
`platform-admin` `whoami` for a non-admin, once per page load, designed and unsilenceable. Recorded so nobody
re-files ROADMAP 9.17; `scripts/gear-whoami.mjs` holds the count at one. `grep -c "^## " docs/gotchas.md` run
before and after.

**120 → 121 on 2026-10-10, entry by another session (`806e4274`), pointer moved by the supervisor** — a
receipt's `git_sha` can describe the tree BEFORE the fix it proves; 9.19, 9.26 and 9.25 all did it the same
day. The entry landed without this line moving. `grep -c "^## " docs/gotchas.md` run before writing this: 121.

**121 → 122 on 2026-10-10, same edit, by the supervisor** — a label "shown" by width and visibility can be mid-fade and paint
nothing; one copy of 9.12b's own screenshots had no labels under a 72/0 run. The pointer at the top of this file said 120 and
is now 122. `grep -c "^## " docs/gotchas.md` run before and after.

**122 → 123 on 2026-10-11, same edit, by the supervisor** — a frozen review copy keeps the inline geometry JavaScript measured, so it is
only true at its capture width; Andrew's real phone showed the office tab highlight 19-25px off its tab. `freeze.mjs` now pins the copy's
viewport to the capture width. The pointer at the top of this file moved in the same edit. `grep -c "^## " docs/gotchas.md` run before and after: 123.

**123 → 124 on 2026-10-11, same edit** — a viewport line is ignored inside an iframe, and the control room shows frozen copies in one, so
123's pin did not reach the copy Andrew opens (still 19/13.5/24.7px off at 360/412/430). `grep -c "^## " docs/gotchas.md` run before and after: 124.


**128 → 130 on 2026-10-13, same supervision edit.** Entry 128 was already present
while the pointer still named 127. Added separate-readable-artifact and dump-provenance
findings, then recounted with `rg -c '^## ' docs/gotchas.md` before and after.

**130 → 131 in the same supervision, 2026-10-13.** Missing bash made valid
revisions read as fabricated. The suite now refuses before judging them.
`rg -c '^## ' docs/gotchas.md` run after the entry and this pointer edit.

**131 → 132 on 2026-10-15, supervision.** A proof under an excluded folder written
inside a job's worktree never reaches the main checkout, so hashing the main copy
refuted 99.11's correct fix. `rg -c '^## ' docs/gotchas.md` run before and after: 132.

**132 → 133 on 2026-10-16, supervision.** A whole-file crash in a credential-less live test changed
its message because the internet answered with HTML instead of JSON, and the belt held a passed
security fix (97.2) for it. `grep -c "^## " docs/gotchas.md` run before and after: 133.

**133 → 134 on 2026-10-18, supervision.** `node --test` silently drops a missing file when another
file in the same run exists, so a batched run printed `pass 22 / fail 0` over a guard that was never
there. `grep -c "^## " docs/gotchas.md` run before and after: 134.

**134 → 135 on 2026-10-18, supervision (fourth pass).** A gitignored `app/public/ex3` dev copy, older
than 97.92, made `ex3-reveal-race.mjs` print 78 false defects over a correct fix; the check now refuses
by name. `grep -c "^## " docs/gotchas.md` run before and after: 135.
