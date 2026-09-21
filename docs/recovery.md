# Recovery — what happens if the database is lost

ROADMAP 6.1. One page. **Rewritten 2026-09-21** after the previous version of
this page was found to be wrong in its headline. What replaced it was read off
GitHub directly — the workflow file, the run history and the release list — not
recalled.

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
2. **Where the age private key lives is not recorded anywhere in this repo,**
   and this page will not guess. CI deliberately does not have it — that is
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
4. **Storage bytes are definitely not covered.** Rows in `storage.objects` are
   in the database; the job photos and logos themselves are in object storage
   and no part of this pipeline touches them. A restore brings back references
   pointing at files that may not exist. **This gap is real and survives
   everything else on this page.**

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

It covers `public` only — not `auth`, not storage bytes.

---

## What would close 6.1 properly

1. **Restore one nightly dump, end to end, into a throwaway target, and write
   down what came back.** This is the whole of the remaining risk and it costs
   nothing but an hour. It cannot start until item 2 is answered.
2. **Andrew says where the age private key is.** Blocking item 1 completely.
3. **A decision about storage bytes** — either accept that job photos are not
   backed up and say so out loud somewhere a detailer can see, or add them.
   Not started, not priced.
4. **The last-restore date is still not visible in the back office**, which
   6.1's "done when" requires. Front-end change; publishing is Andrew's.
   **Named as blocked rather than dropped.**

**Recovery point objective:** up to 24 hours (the gap between nightly runs),
assuming item 1 ever passes. **Recovery time objective:** still undefined, and
will stay undefined until somebody has actually done a restore once.
