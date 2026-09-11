# Backups — what exists, and how to restore one

**Rewritten 2026-09-10 by reading the backup repository itself and the three
releases in it.** Everything below is measured, and the measurement is named
beside it. The version of this file before today described a design that was
never built; the last section says what it got wrong and why that matters.

---

## 1 · What is running

**`random12one0/detailing-platform-backups` — PRIVATE, five files.** One
GitHub Actions workflow takes a complete copy of the database every night,
encrypts it so that GitHub itself cannot read it, and attaches it to a release.

| | |
|---|---|
| Schedule | `cron: '10 9 * * *'` — 09:10 UTC, 02:10 Pacific. Off the hour on purpose; GitHub silently delays runs booked at `:00` |
| Actually fires at | **09:23–09:24 UTC**, three nights running — a real ~13-minute queue delay, not a fault |
| Dump | `pg_dump --no-owner --no-privileges --format=custom`, run inside the `postgres:17` Docker image because the runner's client is older than the server |
| Encryption | `age -R backup-key.pub` — a public key committed in the clear. **CI holds no private key and cannot decrypt its own output** |
| Lands in | a **release asset**, never a commit. Git cannot forget a committed file, and these dumps are real customers' names, phones and home addresses |
| Retention | every backup for 30 days, plus the 1st of each month for ever |

**Measured 2026-09-10** — three green runs, and the file grows as the database
does, which is what a live dump should look like:

```
backup-2026-09-08   dump-2026-09-08.pgc.age   714,876 bytes
backup-2026-09-09   dump-2026-09-09.pgc.age   727,918 bytes
backup-2026-09-10   dump-2026-09-10.pgc.age   733,274 bytes
```

The newest was downloaded and its first bytes read: `age-encryption.org/v1`
followed by an `X25519` stanza, not `PGDMP`. **It is genuinely encrypted rather
than a dump wearing the extension.**

*(The roadmap records the 8 September asset as 714,366 bytes. The release says
714,876. Small, but the roadmap figure is wrong — one for M to correct.)*

---

## 2 · The one number that says this has never been proven

**`download_count` on all three assets is `0`.** Nobody has ever fetched a
backup, so nobody has ever decrypted one, so nobody has ever restored one.

**A backup nobody has restored is not a backup.** Roadmap 2.22 stays `[~]`
until section 4 has been run once, and that is the right call.

---

## 3 · What is NOT in these backups

**`pg_dump` copies Postgres. It does not copy Supabase Storage.** Two buckets
hold things that cannot be regenerated:

- **`job-photos`** — private. Before-and-after photographs of customers' cars,
  taken at their homes. Evidence, in the sense the permission model already
  uses: deleting one needs the `settings` permission, adding one does not.
- **`business-media`** — public. Every detailer's logo and gallery.

**A restore from these backups produces a database full of rows pointing at
files that no longer exist**, and it presents as a working dashboard with
broken images everywhere — which reads as a display bug, not as data loss. The
fix is one more step in the same workflow that lists each bucket through the
Storage API and encrypts the objects into the same release. Until it exists,
this section is the scope statement, and **a backup whose scope is undocumented
is one somebody will over-trust on the day it matters.**

**The workflow also cannot tell you WHICH database it dumped.** It refuses a
dump under 50 KB — the empty-backup-that-reports-success failure — but there is
no assertion that `bookings` is in there, and the only way to look inside is the
private key. So *"it backed up the wrong project"* is a failure mode currently
invisible to everyone. Section 4 is what closes that too: the census below
names the tables.

---

## 4 · THE RESTORE DRILL

This is roadmap 2.22's acceptance test. **Half an hour, once, on a calm day.**

### What it needs, and who has it

| | Where it is |
|---|---|
| The **age private key** | Andrew's password manager, and deliberately nowhere else. Not in CI, not in this repo, not on this machine — checked 2026-09-10 |
| A **scratch database** | Not `practice-rail` and never the live business project. `pg_restore --clean --if-exists` **drops what is already there** |
| `age` and `pg_restore` | **Neither is installed on this machine** (checked 2026-09-10; no `docker`, `psql` or `pg_dump` either) |

Both binaries are portable, no installer: `age` ships as a zip containing
`age.exe` from FiloSottile/age's releases, and `pg_restore.exe` is in the
PostgreSQL 17 Windows binaries zip. Git Bash runs the script as written.

### The steps

**1 · Take the census of the source, BEFORE anything else.** This is the
comparison the whole drill turns on, and it has to be taken from the database
the backup came from:

```bash
node scripts/db-census.mjs > census-source.txt
```

On 2026-09-10 that was **46 tables, 596 rows**, with `bookings` at 52,
`customers` at 40 and `auth.users` at 27.

**2 · Put the private key in a file.** The restore script looks in
`$HOME/.config/detailing-backup/age-key.txt`, or wherever `AGE_KEY_FILE`
points. **Do not paste it into a chat, a commit or a CI secret** — the reason
CI cannot decrypt these backups is that the key has never been anywhere a
machine could read it unattended.

**3 · Run the restore.** From a clone of the backups repo:

```bash
./scripts/restore.sh backup-2026-09-10 'postgresql://postgres:PW@HOST:5432/postgres'
```

It downloads the asset, decrypts it, prints `pg_restore --list` and waits for a
typed `yes` before writing anything.

**4 · Take the census of the restored copy and compare.** This is the step that
turns "it seemed to work" into a result:

```bash
node scripts/db-census.mjs --ref=<scratch-project-ref> > census-restored.txt
diff census-source.txt census-restored.txt
```

Only the `# census of …` header line should differ.

**`--ref=` needs a token that can reach that project, and the one in `.env`
cannot.** Measured 2026-09-10: pointed at the second existing project it
answers `403 — Your account does not have the necessary privileges`. That is
the right answer and worth keeping — **nothing in this repo can read the live
business project** — but it means the scratch project needs its own access
token in `SUPABASE_ACCESS_TOKEN` for step 4, which is a twenty-minute surprise
on the day if nobody wrote it down.

**If the restore target is a plain Postgres rather than a Supabase project**,
the census script cannot reach it at all — run the same question through
`psql` instead:

```sql
select 'public.' || c.relname,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', c.relname), false, true, '')))[1]::text::bigint
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' order by 1;
```

**5 · Write the result into the roadmap and tick 2.22.** Counts matching is the
pass. Counts differing is a finding and a much better day to have it.

### One thing that must not be done to make this easier

**Do not put the private key into GitHub Actions so the drill can run itself.**
It is the single decision that makes these backups worth having: a leaked repo,
a leaked Actions secret or a compromised account currently yields files nobody
can read. A scheduled restore test would trade that away for convenience.

---

## 5 · The alarm that is not wired up

The workflow's last step pings `HEALTHCHECK_URL` so an outage watcher knows the
backup ran. **The secret is unset, so the step does nothing** — and it does
nothing *silently*, because the guard is `if [ -n "$PING" ]` with no `else`.
That is this repository's most-repeated defect in someone else's file: a skipped
check that reads exactly like a passing one.

Five minutes on healthchecks.io fixes it. **It must be a SECOND check, not the
one `watch-jobs` already pings** — they answer different questions (*is the
scheduler alive* / *did last night's backup run*), and sharing one means a
healthy backup can silence a dead scheduler. Not the same thing as
`platform_settings.healthcheck_url` either. See `docs/ops/monitoring.md`.

---

## 6 · What this file used to say, and why it was wrong

It described a workflow encrypting with a **shared passphrase held as a CI
secret** and uploading to an Actions **artifact**, and it walked through
switching that on. None of it was ever built.

The difference is the entire security argument: a passphrase in CI means
anything that can read the secret can read every backup ever taken, and an
artifact expires on a schedule nobody chose. What exists uses a keypair whose
private half has never been on a machine, and release assets that can be pruned
deliberately.

**A session that followed the old steps would have built the weaker system
beside the working one**, pointed at the same database, with nothing anywhere
reporting that there were now two. The file is superseded rather than deleted
because that reasoning is what the correction is against; the workflow it
describes still sits at `docs/ops/backup.workflow.yml` and now opens with a
banner saying not to install it. The fuller comparison is
`docs/coworker-report-2026-09-08.md` § 3.5.

**What was true in the old file and is still true:** the session-pooler warning
(GitHub runners are IPv4-only, a free project's direct connection is IPv6, and
it fails with an error that reads exactly like a wrong password), the reason the
`workflow` token scope matters, and *"a backup nobody has restored is not a
backup"*.
