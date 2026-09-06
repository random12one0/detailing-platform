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
