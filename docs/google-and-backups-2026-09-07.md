# Google sign-in, the legal pages, and the backup repo — 2026-09-07

Written at the end of a session that was handed a four-task brief from an
earlier cowork session. **Two of those four tasks were already done** and the
brief did not know it, so the most useful thing in this file is the list of
what is actually left.

---

## 1. What was already true before this session started

**`/privacy` and `/terms` have existed since roadmap 7.1 (2026-09-06), are
public, and are LIVE on `main`.** The brief asked for them to be built. They
were already there, already linked from the footer of every marketing page,
and already walked by `sweep-widths.mjs`.

Careful with the obvious check: `curl https://detailingplatform.com/privacy`
returns **200 for every path**, including `/definitely-not-a-real-page`,
because Netlify serves `index.html` for the SPA's catch-all. **A 200 proves
nothing.**

~~What proves it is that `origin/main`'s `app/src/main.jsx` carries both
routes.~~ **THAT SECOND CHECK IS ALSO WRONG, and it was corrected the same day
by another session's finding: the live site does not build from GitHub
pushes.** The deployed bundle is a manual upload, so `origin/main` and
detailingplatform.com are two different facts and reading the repo answers the
wrong one.

**What actually proves it is loading the page and reading what it renders**,
which was then done. The live pages DO render — so the two URLs are genuinely
safe to give Google. What the live page also shows is that **this session's own
changes are not on it**: it still prints the literal asterisks, still says "The
four companies involved", and has no Google section and no effective date.
**Everything below is true of the repo and not yet of the live site.**

**The demo tenant's email typo was fixed in roadmap 2.5.** The brief asked for
it to be fixed and audited. `businesses.contact_email` on `demo-detail` has
been `demo@example.com` since 2026-09-04, and it was checked against the live
database this session, not against the seed file:

- 13 businesses, **none** with `detailplatform.com` in `contact_email`
- 13 `business_settings` rows, **none** with it in `notification_emails`
- `customers` where email ends `detailplatform.com`: **zero rows**
- `platform_settings.owner_email` is `andrew@detailingplatform.com`

## 2. The typo-domain grep, in full

49 hits for `detailplatform.com` (the one WITHOUT "ing") across 19 files.
**Not one of them is a code path that mails a real person.** They are:

| Where | What it is |
|---|---|
| `scripts/seed-demo.mjs`, `e2e-booking.mjs`, `shoot-dashboard.mjs`, `sweep-widths.mjs`, `spanish-dom.mjs`, `admin-account.mjs`, `final-pass.mjs` | the demo **sign-in identities** (`demo@detailplatform.com` / `demo123`, `demo-staff@…`). A login, not a mailbox. Deleting them takes the verification suite down — CLAUDE.md says so explicitly. |
| `tests/booking-engine.test.mjs`, `platform-admin.test.mjs`, `promo-checkout.test.mjs` | fixture strings inside assertions |
| `CLAUDE.md`, `DECISIONS.md`, `PROJECT-STATE.md`, `docs/roadmap.md`, `docs/overnight-log.md`, `docs/testing/*` | narrative about the bug and its fix |
| `app/src/theme.css:2651` | a comment measuring a label's width |

**The one stale claim worth knowing about**, because it is a trap for the next
session: `docs/phase2-engine-and-dashboard.md` lines 53 and 194 say *"the
placeholder domain `detailplatform.com` lives in exactly one file:
`_shared/config.ts`"* and *"replace it when the real domain is bought"*.
**That was done long ago** — `config.ts`'s `DEFAULT_PLATFORM_URL` is
`https://detailingplatform.com`. A session acting on that doc would go
"fixing" a file that is already correct.

## 3. Google sign-in is ON, and what is actually blocked

`/auth/v1/settings` answers **`google: true`** as of 2026-09-07 (measured).
CLAUDE.md's *"switched off"* entry is corrected in this commit. The button is
live on the sign-in screen right now, because `useEnabledProviders()` shows it
the moment the provider is enabled.

**What is blocked is publishing the consent screen, and it is not a code
problem.** The Audience page refuses both *Publish app* and saving a test user
while Branding is incomplete, and the only empty Branding fields are the
**privacy policy URL** and the **terms of service URL**.

Those two URLs exist and are public:

    https://detailingplatform.com/privacy
    https://detailingplatform.com/terms

**Andrew pastes them into the Google Branding page himself.** Nothing else in
this repo is in the way.

### What the privacy page now says about Google, and what it deliberately does not

Added this session (`app/src/landing/legal.js`, section *"Signing in with
Google"*): the three scopes, what each is used for, that we never see the
password, the **Limited Use** sentence with the policy URL, and the revocation
link at `myaccount.google.com/permissions`.

Those three scopes are a **fact about the code**, not a guess:
`signInWithOAuth({ provider: "google" })` in `screens/Auth.jsx` passes no
`scopes` option, so Supabase asks for GoTrue's defaults — `openid`, `email`,
`profile` — which is exactly what the Cloud console has saved.

**`business.manage` is deliberately absent.** The scope is not on the consent
screen, the sync feature is not built, and the API application is still with
Google. A privacy policy describing it would be describing something that does
not exist, which is the one thing `legal.js` refuses to do. **It gets its own
paragraph the day the sync ships**, and Google's verification review for that
scope cannot be started before then anyway.

### The Business Profile application

Support case **6-3052000042070**, submitted 2026-09-08 from
`andrewswashing@gmail.com` (the account holding the verified listing).
7–10 business days. **Quota reads 0 until it is granted; a non-zero quota is
how you know.** Expect the console to report `business.manage` as "not
sensitive" while the backend still answers 403 `access_denied` to every
external user — that is the app being unverified, not a bug here.

## 4. Why the handed-over policy text was NOT shipped verbatim

The brief carried a full privacy policy and terms of service and asked for
them to go in as written. **They were not, and this is the reasoning**, because
it will come up again.

`tests/landing-pricing.test.mjs` test 10 is not decoration — it encodes three
standing decisions:

1. **10g forbids `arbitration`, `governing law`, `class action`, `warrant`,
   `indemnif`, `limitation of liability`, `jurisdiction`** in `legal.js`. The
   rule the file exists to hold: *borrowed boilerplate is worse than nothing —
   it is a promise the owner has not made, in language he cannot check.* The
   handed-over terms contain a **Governing law** section (California,
   exclusive jurisdiction) and a **warranty** disclaimer. Shipping it turns
   that test red by design, not by accident.

2. **10b-i / 10b-ii / 10b-iii pin the access disclosure** — *"Who else can see
   it — us"*, *"sold, rented or handed to an advertiser"*, and that it sits
   directly after the customers paragraph. That is the owner's own condition
   from 2026-09-06 for the back office being built at all: *"it could be
   disclosed in like the ToS or on the fine print that I do have the ability
   to see information about the detailer and their clients."* **The handed-over
   policy does not contain it.** Replacing the page wholesale would quietly
   remove a disclosure the product was built on the strength of.

3. **10h pins `two weeks` and `Nothing is deleted`**, which `/pricing` also
   prints. The handed-over terms say cancellation simply takes effect at the
   end of the billing month with no pro-rating — which **contradicts the
   twelve-month commitment and the 50%-of-remaining exit fee** that
   `pricing.js` holds (`term: { months: 12, exitFeeShare: 0.5 }`) and that
   `/pricing` discloses under California AB 2863. Two documents on the same
   site disagreeing about what leaving costs is worse than one plain-English
   page.

**So the Google-specific content was added and the rest was not.** The full
text is a real decision for Andrew to take with a lawyer, and it is a bigger
one than a paste: it would replace a page written in facts with a page written
in clauses. Nothing about Google needs it.

## 5. The asterisks bug this uncovered

`legal.js` has written emphasis as `**like this**` since the day it was
created, and `LegalPage.jsx` rendered `<dd>{words}</dd>` — the raw string.
**So /privacy printed the literal asterisks, live, on the one sentence the
owner asked to have said out loud.**

Nothing rendered it because nothing ever had to: the markup arrived with the
content and the renderer was written for plain prose. `inline()` now turns
emphasis, URLs and addresses into markup in one pass, and **checks 10k and 10l
pin that no `**` reaches a reader and that nothing is dropped on the way** —
a renderer that silently swallows a clause is worse than one that prints
asterisks, because nobody can see what is missing.

## 6. The backup repo — DONE, and it has produced a real backup

`https://github.com/random12one0/detailing-platform-backups` is **private** and
holds exactly five files:

    100644  .github/workflows/backup.yml
    100644  .gitignore
    100644  README.md
    100644  backup-key.pub
    100755  scripts/restore.sh

Verified on the remote tree: no `.age`, `.pgc`, `.sql`, `.dump`, `.zip`, `.pem`
or key file committed, and the repo is still private. `SUPABASE_DB_URL` was
already set as a repository secret and was never read or printed.

**A real run has completed and produced a real encrypted backup:**

- release `backup-2026-09-08`, asset `dump-2026-09-08.pgc.age`, **714,366 bytes**
- raw dump before encryption: **714,006 bytes** (well clear of the 50 KB floor)
- downloaded and checked by hand: the file begins `age-encryption.org/v1`
  followed by an X25519 recipient stanza, and does **not** begin `PGDMP` — so
  it is genuinely encrypted rather than a dump with a misleading extension.

### The push was blocked once, and the fix is worth recording

The `gh` token had scopes `gist, read:org, repo` and **not `workflow`**, so
GitHub refused the workflow file — and the REST contents API refused it too,
answering **404 rather than 403**, which reads as a missing repository.

`gh auth refresh -h github.com -s workflow` then failed with *"not logged in
to any hosts"* **while `gh auth status` said he was logged in.** The cause:
the credential lives in the Windows **keyring** and `hosts.yml` carries the
host entry with no token in it, which gh 2.96's `refresh` does not cope with.
**What worked was a fresh login carrying the scope:**

    gh auth login --hostname github.com --scopes workflow --git-protocol https --web

### The first run failed, and it was NEITHER cause the brief predicted

The brief said a dump-step failure would be the `[YOUR-PASSWORD]` placeholder
brackets or the direct connection string instead of the session pooler. It was
neither. Postgres answered:

    FATAL:  database "postgres
    " does not exist

**The secret had been saved with a trailing newline**, so the newline landed on
the last path segment and the database name became `postgres\n`. The connection
itself was already correct — it resolved to an IPv4 address on port 5432, which
is the session pooler.

**The workflow now trims the value rather than the secret being re-entered**,
so the value never has to be handled again and the next paste cannot break it
the same way. It is `tr -d "[:space:]"` — a connection string carries no
legitimate whitespace, a real space would be percent-encoded — and the trimmed
value is `::add-mask::`ed first, because it differs from the secret GitHub
knows about and is therefore **not covered by GitHub's own masking**.

### Two things still open on the backups

1. **`HEALTHCHECK_URL` is not set** as a repository secret, so the *"tell the
   outage watcher we finished"* step is a no-op. Without it, **a backup that
   silently stops failing loudly is a backup nobody notices has stopped** —
   the same argument roadmap 8.12 already makes about the scheduler. A
   healthchecks.io URL is five minutes. (`platform_settings.healthcheck_url`
   in Supabase is set, but that is a different check watching a different job.)
2. **Nothing has ever been restored.** README says it in as many words: until
   a restore into a throwaway project has been done and the row counts
   compared, this is an untested pipeline rather than a backup. That needs a
   scratch Supabase project and the age private key, which is in Andrew's
   password manager and deliberately nowhere else.

## 7. Two questions standing for Andrew (roadmap-adjacent, not started)

Both were recommendations in the brief that he has never actually answered, so
**neither has been built**:

1. **A detailer's email address on their public tenant site should be behind a
   switch that is OFF by default.** Published addresses get harvested by spam
   bots; phone numbers largely do not.
2. **The price editor should keep WARNING on a broken price ladder rather than
   blocking the save**, consistent with the *warn, never hard-block* rule
   already in DECISIONS.md.

---

## What is left, shortest first

1. Andrew pastes the two URLs into the Google Branding page → unblocks
   *Publish app* and test users.
2. ~~The workflow file and an actual backup.~~ **DONE 2026-09-08** — see §6.
   What is left there is a `HEALTHCHECK_URL` secret and one test restore.
3. Andrew confirms or corrects `ENTITY` in `app/src/landing/legal.js` — it
   currently reads *"Andrew Dietrich, doing business as Detailing Platform"*
   and **is a guess at his paperwork**. Sole trader, a DBA and an LLC are three
   different legal persons.
4. Andrew answers the two questions in §7.
5. ~~Whether to publish — pushing publishes all 67 commits.~~ **WRONG, and
   corrected 2026-09-08.** The legal commits are on `origin/main` already, and
   **that did not publish anything**: the live site does not build from
   pushes. So the Google paragraph, the entity line and the asterisks fix are
   in the repo and **not on the page Google will fetch.** That is fine for
   pasting the two URLs into Branding today — the pages themselves are live and
   render — but it has to be deployed before Google's later verification review
   reads the policy. **Deploying is blocked on Netlify build credits**, which is
   `docs/OUTSTANDING.md` § 6 and not this file's problem.
