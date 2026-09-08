# Nightly backups — how to switch them on

2026-09-06. Ten minutes, once, and then it runs itself.

**Why this file exists instead of the workflow just being committed:** GitHub
refuses a push that creates or edits anything under `.github/workflows/` unless
the token has the `workflow` scope, and this session's does not. **That is a
good refusal** — a token that can rewrite what runs on every push is a token
worth being careful with. So the file sits at
[`docs/ops/backup.workflow.yml`](./backup.workflow.yml) and you move it into
place once.

---

## What it does

Every night at about 2 a.m. California time it takes a complete copy of the
database, encrypts it, and keeps it for 90 days. It costs nothing: GitHub gives
2,000 free Actions minutes a month on a private repository and this uses
roughly one a night.

**Why it is needed at all:** Supabase's free plan has **no backups**. They
start on the Pro plan. Until then, one bad `delete` is unrecoverable.

---

## Switching it on

**1 · Move the file into place.**

```bash
mkdir -p .github/workflows && cp docs/ops/backup.workflow.yml .github/workflows/backup.yml
```

Then commit and push it yourself, from a terminal signed in as you.

**2 · Get the database connection string.**

Supabase dashboard → your project → **Project Settings** → **Database** →
**Connection string** → **URI**.

**Take the "Session pooler" one, not the direct one.** The direct address is
IPv6-only and a GitHub runner has no IPv6 — it fails with a network error that
reads exactly like a wrong password, which is an afternoon nobody needs.

**3 · Invent a passphrase.** Anything long and random. **Put it in your
password manager before you paste it anywhere**, because it is the only key to
every backup this will ever make, and a backup you cannot decrypt is not a
backup.

**4 · Add both as repository secrets.**

GitHub → the repo → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**:

| Name | Value |
|---|---|
| `SUPABASE_DB_URL` | the session-pooler URI from step 2 |
| `BACKUP_PASSPHRASE` | the passphrase from step 3 |

**5 · Run it once by hand.** Actions tab → *Nightly database backup* → **Run
workflow**. It should finish green in about a minute with a file attached to
the run.

---

## Why it is encrypted

The dump contains **every customer of every detailer** — names, phone numbers,
home addresses, email addresses. A GitHub artifact is private to people who can
see the repository, which is the right audience today and is one mis-click from
not being. Encrypted, the file is useless to anybody who gets it without also
having the passphrase.

---

## How it fails, on purpose

**A backup job that silently does nothing is worse than no backup job**,
because the green tick gets read as "there is a backup". So it refuses to be
quietly useless:

- Missing secrets stop the run before anything else happens.
- A dump under 20 KB is treated as a failure — a truncated or empty file is the
  failure mode that looks most like success.
- The dump must contain the `bookings` table, or the job errors. That catches
  pointing at the wrong database, which otherwise produces a perfectly valid
  backup of nothing you care about.

---

## Restoring

Write these three steps somewhere that is **not this repository**, because the
day you need them may be the day you cannot reach it.

1. Download the artifact from the Actions run and unzip it.
2. `gpg --batch --passphrase '<BACKUP_PASSPHRASE>' --decrypt backup-YYYY-MM-DD.sql.gpg > backup.sql`
3. `psql "<connection string of a FRESH project>" -f backup.sql`

**Restore into a fresh project, never over the live one.** A restore over a
running database is how a bad night becomes an unrecoverable one, and the whole
point of having this is that there is a way back.

**A restore has never been rehearsed.** The workflow can be run on demand
precisely so that the drill can happen on a calm day. **A backup nobody has
ever restored is a backup nobody should count on** — this is worth an hour, once.

---

# REVIEW OF THE BACKUP REPO HIS CLOUD SESSION BUILT — 2026-09-08

He sent `detailingplatformbackups.zip` and said: *"the ZIP is something for the
backups thing. I think there might be contacts in there, but you have to look up
to get hub or something."* Five files, no secrets among them, reviewed in full:
`.github/workflows/backup.yml`, `scripts/restore.sh`, `README.md`,
`.gitignore`, `backup-key.pub`.

**IT IS GOOD, AND FOUR OF ITS DECISIONS ARE BETTER THAN WHAT ROADMAP 2.22
SPECIFIED.** Worth naming, because the temptation on reading someone else's
work is to redo it:

1. **The workflow holds only the PUBLIC age key.** CI can encrypt and cannot
   decrypt, so a leaked repo, a leaked Actions secret or a compromised account
   yields files nobody can read. The private key never exists in CI.
2. **Backups are RELEASE ASSETS, not commits.** Git never forgets — a dump
   committed to the tree is in history for ever, so "delete the old backups" is
   not a thing you can do, and a repo made public by accident later would
   publish every customer record ever backed up. Releases can be deleted.
   **This is a strictly better answer than 2.22's, which said only "private and
   encrypted".**
3. **It refuses to publish a dump under 50 KB.** *An empty backup that reports
   success* is the exact failure this repo keeps rediscovering under another
   name — a skipped check reading like a passing one.
4. **It uses `postgres:17` in Docker** because the runner's client is older than
   the server, and passes the URL as an env var rather than an argument so it
   never reaches the host's process list.

The restore script is equally careful: it prints `pg_restore --list` and demands
a typed `yes` before writing, and the README says plainly that until one restore
has happened this is *"an untested pipeline, not a backup"* — which is 2.22's
own acceptance test, independently arrived at.

## THE ONE REAL GAP: THE PHOTOS ARE NOT IN THE DATABASE

**`pg_dump` backs up Postgres. It does not back up Supabase Storage.**

This product has two buckets and both hold things that cannot be regenerated:

- **`job-photos`** — private. Before-and-after photographs of customers' cars,
  taken at their homes. **Evidence, in the sense CLAUDE.md already uses**: it is
  why deleting one needs the `settings` permission while adding one does not.
- **`business-media`** — public. Every detailer's logo and gallery.

**A restore from these backups would produce a database full of rows pointing at
files that no longer exist**, and the failure would present as a working
dashboard with broken images everywhere — which reads as a display bug rather
than as data loss.

**Recommendation, and it is small:** one more step in the same workflow that
lists each bucket through the Storage API and copies the objects, encrypted into
the same release. It is the same shape as the dump step. **Until it exists, the
README should say what is NOT covered** — a backup whose scope is undocumented
is one somebody will over-trust on the day it matters.

## THE ONE THING THAT WILL PROBABLY BREAK ON FIRST RUN

The README says: *"Use a read-only database role if you make one. A backup job
has no business being able to write."* **The instinct is right and the
consequence is a failed backup.**

`pg_dump` issues `SET row_security = off`. A role that is neither the table
owner nor `BYPASSRLS` then hits *"query would be affected by row-level security
policy for table …"* and the dump aborts. **Every table in this product has RLS
on** — that is the whole tenant-isolation design, and `db-audit.mjs` fails the
build if one does not.

**So: run it with the project's own `postgres` role first and confirm a real
dump lands.** If a dedicated role is wanted later it needs `BYPASSRLS`
explicitly, which is most of the privilege the read-only role was meant to
avoid — so the honest trade is to keep `postgres` and keep the secret tight.

**And the connection string must be the SESSION POOLER on 5432**, which the
README already says. The reason, from roadmap 2.22: **GitHub runners are
IPv4-only and a free project's direct connection resolves to IPv6**; the
transaction pooler does not work with `pg_dump`.

## ONE SMALLER NOTE: GIVE IT ITS OWN HEALTHCHECK

`HEALTHCHECK_URL` should be a **second** check on healthchecks.io, not the one
`watch-jobs` already pings. They answer different questions — *is the scheduler
alive* and *did last night's backup run* — and a single check means a healthy
backup can silence a dead scheduler.

## WHAT IS LEFT FOR HIM, IN ORDER

1. **Create the repo PRIVATE** — `detailing-platform-backups`. Push the four
   files. The workflow only runs once it is at `.github/workflows/`.
2. **Generate the age keypair** (`age-keygen -o age-key.txt`). **Check the
   public key in that file matches `backup-key.pub`** —
   `age1y6elkrdjp7j5v559224eujq3qvz5ufvtk0d6eqwxuf5p60tewfaqsg4xk2`. If it does
   not, whoever generated it kept the private half and every backup would be
   unreadable by him. **Regenerate both rather than assume.**
3. **Store the private key in his password manager AND offline.** Nobody can
   recover it. This is the one irreversible step on the page.
4. **Set `SUPABASE_DB_URL`** to the session-pooler string, then run the workflow
   by hand (`workflow_dispatch`) rather than waiting for 02:10.
5. **Restore into a throwaway project and compare row counts.** Until that has
   happened roadmap 2.22 stays `[~]`, and it should.

**NONE OF THIS IS MINE TO DO** — he said his cloud coworker is handling it, and
the repo, the secret and the key are all on his accounts.
