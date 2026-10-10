# Recovery — what happens if the database is lost

ROADMAP 6.1. One page. **Rewritten 2026-09-21** after the previous version of
this page was found to be wrong in its headline. What replaced it was read off
GitHub directly — the workflow file, the run history and the release list — not
recalled.

---

## The worst day — what you actually do

**Written 2026-10-06 for Andrew, in order. Read this part; the rest of the page
is the evidence behind it.**

The worst day is: the database is gone or wrecked, and detailers cannot open
their dashboards and customers cannot book. Here is what you have to bring it
back, and what you do with each.

**What you will be working from — three things, and where each lives:**

| | Where it is | How fresh |
|---|---|---|
| **The nightly backup** — every booking, customer, setting, and probably the logins | Your private GitHub repo `detailing-platform-backups`, one locked file per night | Up to 24 hours old. **Never yet opened by anyone** — see "What is proved" below |
| **The key that unlocks it** | Your password manager. Nowhere else, on purpose | — |
| **The drill folder** — the business data, the list of accounts, and every photo | `detailing-platform-recovery` in your home folder on this computer, one folder per day the drill ran | As old as the last time somebody ran the drill. **It is the only copy of the photos anywhere** |

**Step 1 · Stop and get help.** Open a Claude session in this project and say
"the database is gone, we are doing the worst-day steps in docs/recovery.md".
Nothing you do in the first hour makes it worse, except deleting things.

**Step 2 · Get somewhere to put it back.** If the Supabase project still exists
and only the data is bad, it goes back into the same project. If the project is
gone, you make a new one in the Supabase dashboard (free) and give the session a
new access token. The session rebuilds every table from the repo's own history
of changes.

**Step 3 · Put the records back.** Download last night's file from the GitHub
repo, take the key out of your password manager, and the session walks you
through unlocking and loading it **on your computer — the key never goes into a
chat or a file.** If that file will not open (it has never been tried), the
session loads the drill folder's copy instead; that is older, but it is proved:
the drill puts it back and checks every row.

**Step 4 · Let people back in — by a password-reset email.** No password is
copied anywhere, ever (your ruling, 2026-10-06). What comes back is each
person's **account**: the same id, the same email, the same date they joined,
and which businesses they belong to. Then each person gets an email with a link
to choose a new password. Proved on a test business on 2026-10-06: the business
was deleted, its owner's login deleted, its photo deleted, and all of it came
back from the drill folder exactly, and a reset link could be made for that
owner.

**Two things about those emails that you need to know today, not that day:**
- **Supabase's own mailer cannot send them.** This project has no email service
  of its own set up for sign-in mail, so it uses Supabase's built-in one, which
  sends **2 an hour** and only to people on your Supabase team — not to
  detailers (read from the project's sign-in settings, 2026-10-06). So the
  session makes each person's link itself and sends it through **Resend**, the
  same service that sends booking emails. The lasting fix is free: point
  Supabase's sign-in mail at Resend (Supabase → Authentication → Emails → SMTP).
- **Each reset email uses one of the day's 100 sends, and your real business
  shares those 100.** About 45 accounts today. If that is too many for one day,
  send to the business owners first; staff can follow tomorrow.

Anyone who signs in with Google just signs in with Google again.

**Step 5 · Put the photos back.** The session uploads the drill folder's
`storage` folder to the same places. The nightly backup **does not carry
photos at all**, so anything uploaded after the last drill run is lost. That is
why the drill should be run every week, and before any risky change:

```bash
set -a; . ./.env; set +a
node scripts/restore-drill.mjs
```

**Step 6 · Reconnect the outside services — only if it is a NEW project.** The
new project has a new address and new keys, so: the function secrets
(`docs/services-and-secrets.md` lists every one and where to mint it), the
functions themselves, the website's two settings in Netlify, and the Stripe and
Resend webhook addresses. The session does each with you; the keys are yours to
paste.

**Step 7 · Check it, then say so.** Open a few booking pages, sign in as
yourself, and run the drill once. Then tell your detailers what happened in
plain words.

**What would make this day short instead of long** — and it needs your card:
a paid Supabase plan turns on daily backups that Supabase restores for you with
one button, and point-in-time recovery lets you rewind to a minute. That is one
row on `FOR-ANDREW.md`.

---

## Correction first, because the last version of this page said the opposite

The version written 2026-09-20 opened with:

> "There is no restore point anyone can reach."

**That was false when it was written.** It measured Supabase's own dashboard,
found no platform backup there, and concluded that nothing existed anywhere. It
never looked outside Supabase. A nightly backup pipeline had been running the
whole time, in a separate private repository, and Andrew said so plainly before
anyone checked:

> *"we have a GitHub connected to it for backing up. We've already dealt with
> this... I'm right, just trust me, I know I'm right."*

He was right. **The error worth keeping is not "we missed a repo" — it is that
a measurement of one place was written down as a fact about everywhere.** The
old page's Supabase numbers were all correct. Its scope was not, and nothing in
its wording admitted a scope.

---

## What actually exists

**`github.com/random12one0/detailing-platform-backups`** — private, and must
stay private. A GitHub Action, `.github/workflows/backup.yml`:

| | Measured 2026-09-21, from the workflow file and the run list |
|---|---|
| Schedule | `10 9 * * *` — 02:10 America/Los_Angeles. Deliberately off the hour; GitHub's scheduler delays `:00` jobs. |
| What it dumps | `pg_dump --no-owner --no-privileges --format=custom`, run inside the `postgres:17` image because the runner's client is older than Supabase's server |
| Which database | the connection string in the repo secret `SUPABASE_DB_URL` (project `kguqylyzgyzfktkfnhjb`) |
| Empty-backup guard | **refuses to publish a dump under 51,200 bytes** and fails the run |
| Encryption | `age -R backup-key.pub` — public key committed, **private key deliberately absent from CI** |
| Integrity check | confirms the `age-encryption.org` header is present; it cannot decrypt, and says so in a comment |
| Where it lands | a GitHub **release asset**, tag `backup-YYYY-MM-DD` |
| Retention | everything from the last 30 days, plus the 1st of each month kept forever |
| Outage watcher | pings healthchecks.io **only on success** (`if: success()`) |

**Two details in that workflow are better than they look and should not be
"tidied" away.** The dump is passed the URL as an environment variable rather
than an argument, so it never reaches the host's process list; and the URL is
`tr -d [:space:]`-trimmed and then re-masked, because GitHub's own masking
covers the secret as pasted, not the trimmed value. The comment explaining why
is worth reading before touching that step — a trailing newline in that secret
does not present as a bad secret, it presents as `database "postgres\n" does
not exist`.

### Releases present, checked one by one on 2026-09-20

`backup-2026-09-20`, `-19`, `-18`, `-17`, `-16`, **`-15` missing**, `-14`,
`-13`, `-12`, `-11`, `-10`.

### The missing night, and it is not a pipeline defect

Run **#10**, Sep 15 2026 02:24 PDT, run id `34952425209`, **failed**, 2m34s
against the same commit (`3bd5458`) that every green run before and after it
used. The error:

```
repository 'https://github.com/random12one0/detailing-platform-backups/' not found
```

That is `actions/checkout@v4` failing. **The job never reached `pg_dump`.** The
workflow was not wrong, the secret was not wrong, and nothing in the database
was involved — GitHub could not hand the runner the repo that morning. 15 runs,
14 green, and the one red is this. **So: one night has no backup and never
will, and the cause is a GitHub-side blip, not something to fix here.**

This is also, precisely, the thing Andrew described:

> *"usually it's just like a one-time thing that's not serious... if I get an
> email that something like failed or whatever, I'm not going to do anything
> about it."*

**And it alerted twice.** GitHub Actions emails on a failed run with no grace
period at all; separately, because the healthchecks ping is `if: success()`,
the nightly check went unpinged, ran out its 1-day period plus 6-hour grace at
about 15:10 UTC on the 15th, and emailed too — then emailed again on the 16th
when the next run recovered it. **One blip, three emails, nothing to do.** That
is the noise problem, and it is a property of how the two watchers are wired,
not of the backup.

---

## What is proved, and what is only assumed

**Proved:** a dump is produced nightly, it is over 50 KB, `age` wrote a real
encrypted header, and the file is published where it can be fetched again.
Eleven of them currently exist.

**Assumed and NOT proved — this is the honest gap, and it is the important
part of this page:**

1. **Nobody has ever restored one of these files.** Not once. The pipeline
   proves a backup was *written*; it proves nothing about a backup being
   *readable*. **An untested backup is a hypothesis.**
2. **CORRECTED 2026-09-21 — IT IS RECORDED, TWICE, AND THIS LINE IS WHY
   NOBODY FOUND IT.** This said *"where the age private key lives is not
   recorded anywhere in this repo"*. **It is.** `docs/ops/backups.md` § 4
   ("What it needs, and who has it") and `docs/google-and-backups-2026-09-07.md`
   § 6 — the setup session's own record — **both say the same thing in the
   same words: Andrew's password manager, and deliberately nowhere else.**
   Written 2026-09-07 and 2026-09-08, by the session that built the pipeline.

   **Andrew was asked this morning and said he does not know, that a previous
   session set it up for him, and that it is not written down anywhere. The
   third part is wrong, and this page is the reason** — it is the page
   somebody checks, and it told them to stop looking.

   **WHAT IS STILL NOT KNOWN, AND THE DISTINCTION IS THE WHOLE VALUE OF THIS
   ENTRY: a record is not a verification.** No session could have put
   anything into Andrew's password manager; at best it handed him the key and
   told him to save it. So the repo records **where it was meant to go**, and
   **nobody has ever confirmed the entry is there.** The two possibilities are
   *he saved it and has forgotten*, and *he was told to save it and did not* —
   and only Andrew can tell them apart, by opening his password manager and
   searching for it. **That is a lookup, not a hunt.**

   **SEARCHED ON HIS MACHINE 2026-09-21 AND CORRECTLY NOT FOUND**, which is
   the design working rather than a problem: no file named `key.txt`,
   `*age-key*`, `*agekey*`, `backup-key*`, `*.age`, `identity.txt` or
   `*.agekey` anywhere under his two user trees to depth 6; **no file anywhere
   in the profile containing the age secret-key header** (Desktop, Documents,
   `.config`, `.ssh`, AppData/Roaming, AppData/Local, OneDrive, Pictures,
   Videos, Music, ProgramData, `.gnupg`, and the whole `D:` working tree);
   **no checkout of the backups repo**; **no `backup-key.pub` on disk at all**;
   and **`age` is not installed**. The one header match was this session's own
   transcript, which contains the string only because the search typed it —
   *searching for a secret's header writes that header into your own log, and
   the log then matches the search.*

   **What a session may still not do:** read, write, move or paste that key,
   or generate a replacement. If it turns out to be lost, re-keying is a
   decision with money and risk in it and it goes to Andrew. CI deliberately does not have it — that is
   correct design — but *an encrypted backup whose private key cannot be found
   is not a backup*. **This is now the single most load-bearing unknown in 6.1**
   and it is on `FOR-ANDREW.md` as a question for Andrew, not as a task for a
   session. **No session may read, write, move or paste that key** under the
   standing rule about secrets.
3. **`auth` and `storage` schemas: probably included, unverified.** The dump
   passes no `-n`/`--schema` filter, so it should carry every schema the role
   can read, `auth.users` among them — which would close a gap the old page
   named as open. *Should* is doing work in that sentence. It is checkable the
   moment anyone restores one, and not before.
4. **Storage bytes are definitely not covered, and there are THREE stores,
   not two.** Rows in `storage.objects` are in the database; the files
   themselves are in object storage and no part of this pipeline touches them.
   A restore brings back references pointing at files that may not exist.
   **This gap is real and survives everything else on this page.**

   **Corrected 2026-09-21** — this item described photos and logos as though
   those were all of it. Measured against the live project:

   | store | what is in it | files today | carried by the nightly dump |
   |---|---|---|---|
   | `business-media` | logos and cover photos; **public** | **123** | **no** |
   | `job-photos` | before-and-after job photographs; private | **24** | **no** |
   | `expense-receipts` | photographs of receipts; private | **0** | **no** |

   **The third one is new, and it is the one that matters most on this page.**
   An `expenses` row carries five columns about its receipt —
   `receipt_path`, `receipt_bytes`, `receipt_width`, `receipt_height`,
   `receipt_uploaded_at` — and the image itself sits in `expense-receipts`.
   The dump carries **rows, not storage bytes**. So a restore hands a detailer
   back their expense rows, each still pointing at a photograph of a receipt,
   **and the photographs are not there.** The row will state that a receipt was
   uploaded, and give its size and its dimensions, next to a path that resolves
   to nothing.

   **Why that is not the same as losing a job photo.** A job photo is evidence
   for an occasional dispute. **A receipt is kept for a tax year, every year,
   because something outside this product requires it to exist** — so the
   window in which its absence matters is not "until the customer forgets", it
   is the whole retention period, and it is the product that told the detailer
   the receipt was safely filed.

   **The exposure is dated rather than hypothetical: `expense-receipts` holds
   zero files today.** Nothing is currently at risk. It begins the moment the
   first receipt is uploaded, which is why it is recorded here now rather than
   after. **This is a statement of what the backup does and does not carry.
   What to do about it is not this page's to say.**

   ### THE STORE IS MOVING TO CLOUDFLARE R2 — decided 2026-09-21 night

   **Recorded here because it changes what this section is about.** Andrew has
   signed up for Cloudflare R2: **10 GB free** against the 1 GB he had, and
   **no charge for downloads**, which is the part that makes other storage
   expensive. **Three buckets already exist, named to match the code
   exactly** — `job-photos`, `business-media`, `expense-receipts`. Three keys
   are saved in Supabase's edge-function secrets under the names
   `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`; **their
   location is recorded and their contents are not, and must not be.**

   **Nothing has moved. No code points at R2. This is a record, not a
   migration.**

   > **AND MOVING OFF SUPABASE STORAGE LOSES THE DATABASE-ENFORCED ISOLATION,
   > WHICH IS THE LARGEST SINGLE FACT ON THIS PAGE.**
   >
   > Today **the database itself refuses to serve one tenant another tenant's
   > photo.** That is not a rule in application code with a gap somewhere; it
   > is enforced beneath the application, and it was proved four ways.
   >
   > **R2 is a dumb bucket with no concept of a business.** The moment objects
   > live there, that guarantee is gone unless an equivalent is rebuilt in our
   > own code first.
   >
   > **So the switch is not five bucket names. It is five bucket names plus
   > re-establishing tenant isolation, and the rebuilt guard has to be correct
   > BEFORE a single real customer photo is written.**
   >
   > It is cheap today for exactly one reason — **zero photos are stored** —
   > and that discount expires at the first upload.

   **The allowance and how the cap would be enforced under R2 are written up
   separately in `docs/the-photo-allowance.md`** — including the one that
   matters here: the cap has only ever been advisory, because it is checked in
   the browser, and under R2 an unenforced cap is a bill rather than a plan
   that stops.

   **What that does NOT change:** none of these stores is in the nightly dump,
   before or after the move. R2 has its own retention story and nothing in
   this pipeline touches it. **A restore still hands back rows pointing at
   files the dump never carried**, and moving providers does not alter that.

---

## What is still true from the 2026-09-20 measurements

These were measured correctly and only the conclusion drawn from them was
wrong:

| | Measured 2026-09-20 |
|---|---|
| Supabase plan | **free** |
| Supabase point-in-time recovery | **off** |
| Supabase-side restorable backups | **0** |
| WAL archiving | on — 8,405 segments, 0 failures. **Supabase's own infrastructure, not a restore path for us.** |
| PITR pricing, from Supabase's add-on API | 7 days **$100/mo**, 14 days $200/mo, 28 days $400/mo — and it requires a paid plan |

**So the paid-plan question is no longer urgent.** It buys a *better* recovery
point (minutes instead of up to 24 hours) and a restore path that does not
depend on one person holding one key. It is no longer the difference between
having backups and having none. **That changes the recommendation on
`FOR-ANDREW.md` from "fix this" to "worth it later, on your own timetable."**

---

## The local export drill, which still works and is still useful

`scripts/restore-drill.mjs` (run 2026-09-20) exported all 52 tables of `public`
— 1,786 rows — to `artifacts/restore-drill/public-export.json`, restored it into
a throwaway schema **by reading the rows back off disk**, compared every row,
and then **deliberately corrupted one value to confirm the comparison could
fail.** All matched; the canary was caught.

That is a different instrument from the nightly pipeline and worth keeping for a
different reason: it is the thing to run **before any migration that drops or
rewrites data**, because it is immediate and local, where the nightly dump is up
to 24 hours old.

```bash
set -a; . ./.env; set +a
node scripts/restore-drill.mjs
```

**Since 2026-10-06 it also carries the logins and the files** — not
`public` only. The accounts (id, email, created date, email confirmed, how they
sign in; **never a password or a token**) and every stored file go to
`~/detailing-platform-recovery/<date>/`, outside the repository, and are judged
off disk: accounts restored and compared and every membership matched to an
account; every file checked against the size and checksum storage holds and
against the first bytes of a real PNG or JPEG. Then a fixture business is
destroyed — rows, owner login, photo — and put back from those files alone, and
a password-reset link is generated for its owner (not sent, not kept). Three
planted defects must each be caught (a row, an account, a file byte), or the
receipt refuses the run; `--break=canary`, `--break=fixture-photo` and
`--break=secret-shape` prove it, and `--break=fixture-rows` proves the
fixture comparison sees a table left out.

**Anything written after the last copy is lost, and the drill shows it.** On
2026-10-06 a scheduled job wrote a row for the test business between the export
and the "disaster", and the restore could not bring it back — because the copy
never had it. That is exactly the real worst day: the nightly backup loses up to
24 hours, the drill folder loses everything since it last ran.

---

## What would close 6.1 properly

1. **Restore one nightly dump, end to end, into a throwaway target, and write
   down what came back.** This is the whole of the remaining risk and it costs
   nothing but an hour. It cannot start until item 2 is answered.
2. **Andrew opens his password manager and confirms the entry is there.**
   Blocking item 1 completely. **This is now a two-minute lookup rather than
   an open question** — the repo has said since 2026-09-07 that it went there
   (see blocking item 2 above, corrected 2026-09-21). If it is there, this
   item closes today. **If it is not there, fifteen nightly backups cannot be
   opened by anyone, including Andrew, and 6.1 stops being a documentation
   item and becomes a live data-loss finding.**
3. **A decision about storage bytes, across all three stores** — logos and
   cover photos, job photographs, and **photographs of receipts**. None is
   carried by the nightly dump. Not started, not priced.

   **The three are not one decision, because what their absence costs
   differs.** A missing logo is re-uploaded in a minute. A missing job photo
   is evidence for a dispute nobody may ever have. **A missing receipt
   photograph is a record kept for a tax year because something outside this
   product requires it**, sitting beside an expense row that still says it was
   uploaded. Whether that is three decisions or one is not this page's call;
   what this page can say is that they are not equivalent.
4. ~~**The last-restore date is still not visible in the back office**~~ **Built
   2026-10-10:** back office → System health → Backups → "Last restore test", fed by
   `scripts/restore-date.mjs` from the drill's own receipt and proved by
   `scripts/restore-date-visible.mjs`. On the dev server; publishing is Andrew's. It
   shows the 2026-10-06 logical drill, **not** a nightly copy — item 1 still stands.

**Recovery point objective:** up to 24 hours (the gap between nightly runs),
assuming item 1 ever passes. **Recovery time objective:** still undefined, and
will stay undefined until somebody has actually done a restore once.
