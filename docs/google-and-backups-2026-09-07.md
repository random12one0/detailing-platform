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
nothing.** What proves it is that `origin/main`'s `app/src/main.jsx` carries
both routes — checked with `git show origin/main:app/src/main.jsx`.

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

## 6. The backup repo — 4 of 5 files pushed, 1 blocked on a token scope

`https://github.com/random12one0/detailing-platform-backups` is **private**,
and now holds:

    .gitignore
    README.md
    backup-key.pub
    scripts/restore.sh        (mode 100755 — verified on the remote)

Verified on the remote tree: no `.age`, `.pgc`, `.sql`, `.dump`, `.zip`, `.pem`
or key file, and the repo is still private.

**`.github/workflows/backup.yml` could not be pushed.** The `gh` CLI token here
has scopes `gist, read:org, repo` and **not `workflow`**, so GitHub rejects it:

    refusing to allow an OAuth App to create or update workflow
    `.github/workflows/backup.yml` without `workflow` scope

The REST contents API is blocked the same way (it answers 404 rather than 403).
**Andrew runs this once, in a terminal, and the file goes up:**

    gh auth refresh -h github.com -s workflow

It opens a browser and needs a human, which is why this session could not do
it. Until then `actions/workflows` reports **0 workflows**, so the nightly job
does not exist yet and **there is no backup running.** The workflow file is
written and ready at
`scratchpad/backups/.github/workflows/backup.yml` in this session's temp dir,
and is reproduced verbatim in the brief.

**What could not be verified because of that**, and should be the first thing
done once the file is up:

- run it manually (Actions → *Nightly encrypted backup* → Run workflow)
- confirm a release tagged `backup-YYYY-MM-DD` with a `.pgc.age` asset
- if the dump step fails, it is the connection string: either the
  `[YOUR-PASSWORD]` placeholder brackets were left in, or the **direct**
  connection string was used instead of the **session pooler**. GitHub runners
  are IPv4-only and the direct connection is IPv6, so it can never work.
  **Do not ask him to paste the connection string.**

`SUPABASE_DB_URL` is already set as a repository secret and was not touched.

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
2. Andrew runs `gh auth refresh -h github.com -s workflow` → the workflow file
   goes up and there is an actual backup.
3. Andrew confirms or corrects `ENTITY` in `app/src/landing/legal.js` — it
   currently reads *"Andrew Dietrich, doing business as Detailing Platform"*
   and **is a guess at his paperwork**. Sole trader, a DBA and an LLC are three
   different legal persons.
4. Andrew answers the two questions in §7.
5. Whether to publish (this work is committed to local `main`, which is **67
   commits ahead of `origin/main`** — pushing publishes all 67).
