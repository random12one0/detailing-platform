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
| **Anything, before you finish — and especially any markdown you wrote** | `node --test tests/no-credentials-in-markdown.test.mjs`. Credential-free, one `git` call. **The hard rule below — no password in a markdown file — was being broken in 8 files and 25 occurrences on 2026-09-25, some of it for weeks, because NOTHING HAD EVER CHECKED.** It matches SHAPES rather than the values somebody happens to know: the first cleanup was keyed on three known passwords and missed a fourth account's. It names the file, the line and the rule, never the value. Its blind spot is written in its own header — read that before trusting a green |
| **Any copy change — a rename, a re-wording, a condensation** | `node scripts/label-guard.mjs`. Credential-free, one filesystem read. **45 controls are addressed by the WORDS on them, so a rename silently blinds a check** — the matcher falls back to bare English, matches nothing, and the screen goes unmeasured while every other line reads normally. The two that happened are in the script's header |
| **Anything, before you finish — and this one needs credentials** | `node scripts/deployed-inventory.mjs`. **It exits 1 and names every function that is not running this checkout.** See below; do not deploy to clear it |
| **Anything a person reads, before you finish** | `node scripts/american-english.mjs` (dev server, no credentials). **A word spelled correctly but wrong for the audience passes every other gate here.** It reads the FINISHED page, not the source — a source scan printed clean over "Aluminium tanks". The 36 that reached visitors are in the script's header |
| **Anything a person reads — copy, a colour, a class, a whole screen** | `node scripts/contrast-insitu.mjs` (dev server + seed). **The credential-free gates measure token PAIRS, and a pair does not know which surface a label lands on** — `--fog-2` is 4.90:1 on `--ink-1` and 4.20:1 on `--ink-3`. The case is in the script's header |
| Color or ground tokens | `node scripts/accent-sweep.mjs` |
| An edge function | `node scripts/deploy-functions.mjs …` then `node scripts/check-deployed.mjs` **and** `node scripts/deployed-inventory.mjs` |
| A layout | `node scripts/sweep-widths.mjs` (needs dev server + seed) |
| The job record's pinned action bar, or any container it opens in | `node scripts/pinned-bar.mjs` |
| The booking widget | `node scripts/sweep-booking-steps.mjs` |
| **Anything that prices a DAY or a TIME — the date step, the fixed bar, `price_rules`, `pricing.ts`** | `node scripts/surcharge-visible.mjs` (dev server + seed, no credentials). **A customer must never be shown one price and charged another, and the way that goes wrong here is not arithmetic — it is a correct sentence rendered where no phone can see it.** It walks the public page at five widths, tapping the first slot and the last, and asks whether the bar's RISE equals the lines the page just named, whether those lines sit above the fixed bar by hit-test, and whether their pixels are actually painted |
| **A money LABEL — a discount, a surcharge, anything whose words state a size** | `node scripts/discount-label.mjs` (dev server + seed, no credentials). **A label that states a percentage is making a claim the figure beside it has to keep**, and the two are composed in different places at different times. It asks whether a stated percentage of the job is EXACTLY the figure shown, and whether the percentage is still stated where it IS true — the second half matters, because a check that only asks the first can be satisfied by deleting every number |
| **`AddressField.jsx`, `StepLocation.jsx`, or the booking payload in `core.js`** | `node --test tests/address-source.test.mjs`. Credential-free, three filesystem reads. **`address_source` has exactly two values and five of the six cases that produce it write `"typed"`**, so a column hard-wired to `"typed"` passes almost every test you could write. This guards the one line that can produce `"picked"` and the two hops that carry it to the server |
| Anything on a customer's or booking's path | `node scripts/e2e-booking.mjs` |
| An email | `node scripts/render-emails.mjs` |
| A migration | `node scripts/db-audit.mjs` **and** `node scripts/migration-drift.mjs` |
| **Nothing — run it anyway, because a migration can silently never run** | `node scripts/migration-drift.mjs`. **There is NO applied-migrations ledger in this project** — `supabase_migrations.schema_migrations` does not exist, so nothing records which of the 92 files ever ran. This replays `supabase/migrations/` and compares each function against the live database, the way `deployed-inventory.mjs` does for edge functions. **Two migrations had never run and the multi-car feature reached nobody at any setting** (ROADMAP 8.10a). **It reads; it never applies — that is Andrew's.** **THIS LINE SAID "FUNCTIONS ONLY: it cannot see a migration that adds a table, column, policy, grant or index" UNTIL 2026-09-24, AND IT HAD BEEN WRONG SINCE 8.10b.** It now also compares **tables** (by existence), **columns** (by name, plus a type family where the type is judgeable) and **policies** (by existence) — measured, not read: run against a repo that had just added `customers.is_test`, it named that column absent and named the file that declares it. **Grants and indexes are still unbuilt** (ROADMAP 8.10c), and that is now the whole of the exclusion. The stale version mattered: a session adding a column would have read that line and not run the one check that catches an unapplied migration |
| **The tab bar, `--tabclear`, `--hit-overhang`, or any control that can come to rest under fixed furniture** | `node scripts/tabbar-clearance.mjs` (dev server + seed + credentials). **It measures the HIT AREA, never the bounding rect** — `.choice` is a 38px box that presses as 46 through a negative-inset `::after`, so a rect-only scan calls a legal control broken, and a clearance sized to the rect leaves four pressable rows under the bar while reporting itself finished. `--break=rect` is that bug, on purpose |
| **`jobWeather.js`, `useJobWeather.js`, `JobWeather.jsx`, or anything that turns an address into a point in the browser** | `node scripts/job-weather-budget.mjs` (dev server + credentials). **The job record geocodes through `address-suggest`, which is budgeted as a TYPING allowance — 60 an hour per IP, sized for a customer, spent by a detailer who is typing nothing.** It opens ten job records and then the first one again, counts the calls with the endpoint answered in the browser (no Geoapify credit, no hourly bucket touched), and asks the other half too: when a lookup IS refused, does the record say so, or does the weather strip just vanish |
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

**`docs/gotchas.md` is NINETY specific ways a measurement lies to you** — a
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
**87 → 88 on 2026-10-02, same edit again** — a line number cited thirty-nine
lines out, and a one-term grep that nearly reported the true claim beside it as
false. `grep -c "^## " docs/gotchas.md` was run before writing this, which is
the rule and is now four sittings unbroken.
**88 → 89 on 2026-10-02, same edit, same sitting** — a filter matching
`"1.3 —"` against `"11.3 —"`, which got the POPULATION wrong rather than the
verdict. Five sittings unbroken; `grep -c "^## " docs/gotchas.md` run first, as
always.
**89 → 90 on 2026-10-03, same edit** — a `finally` does not run on SIGTERM, so
wrapping a script in `timeout` defeated the teardown it was given and left a
51-table schema in the live database. Six sittings unbroken.

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

This repo holds **1,105,000 words of markdown** — measured 2026-09-21,
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
