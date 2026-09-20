# Recovery — what happens if the database is lost

ROADMAP 6.1. One page. Written 2026-09-20, from measurements rather than from
intentions; every number here came out of `node scripts/restore-drill.mjs`.

---

## The headline, and it is bad

**Nobody knew whether this database could be restored, and the roadmap recorded
that as an absence rather than as a measurement.** It is now measured, and the
answer is:

> **There is no restore point anyone can reach.** If the database were lost
> right now, nothing the platform holds would bring it back.

| | Measured 2026-09-20 |
|---|---|
| Supabase plan | **free** |
| Point-in-time recovery | **off** |
| Restorable backups listed | **0** |
| WAL archiving | on — 8,405 segments, **0 failures**, last push minutes ago |
| Last successful restore test | **2026-09-20** (of a logical export — see below) |
| Recovery point objective | **undefined. In practice: everything since the last manual export.** |
| Recovery time objective | undefined |

**WAL archiving being healthy is not a reprieve.** Those 8,405 segments are
Supabase's own infrastructure — it is how they move and upgrade projects. On
the free plan there is no customer-facing restore built on them: no backup to
download, no point in time to roll to, nothing in the dashboard. The archiver
being green and the restore path being absent are both true at once, and
mistaking the first for the second is the most dangerous reading of this page.

**This is fine today and stops being fine the day Andrew moves his real
business onto it.** There are no real customers on this database; CLAUDE.md
records his own words. The risk is entirely about the future.

---

## What has actually been proved

`scripts/restore-drill.mjs`, run 2026-09-20:

1. Exported **all 52 tables of `public` — 1,786 rows — to a file**
   (`artifacts/restore-drill/public-export.json`, 1.2 MB).
2. Restored that file into a throwaway schema, **reading the rows back off
   disk** rather than copying table to table, because the claim being tested is
   that the written-down artifact is enough.
3. Compared **every row** of all 52 tables against the export. **All matched.**
4. Then deliberately altered one value in one restored row. **The comparison
   caught it.** Without that step, "every table matched" is also what a
   comparison looking at the wrong thing says.

**So: the business's records can be taken out, written down, put back, and come
back identical.** That is a real capability and it is the basis of the interim
procedure below.

---

## What that does NOT cover — three gaps, named

1. **It is not a test of Supabase's backups.** There are none to test.
2. **`auth.users` is not in `public`.** 44 logins live in the `auth` schema. A
   copy of `public` restores the business and **not the ability to sign in** —
   every detailer and staff member would have to be re-invited or re-created.
3. **Storage files are not in the database.** 146 objects: the rows are in
   `storage.objects`, the bytes are in object storage. A database restore
   brings back the *references* to job photos and logos, pointing at files that
   may not be there.

---

## The interim procedure, until Andrew decides on backups

**To take a backup today:**

```bash
set -a; . ./.env; set +a
node scripts/restore-drill.mjs
```

It writes `artifacts/restore-drill/public-export.json`. **Copy that file
somewhere off this machine.** It is the whole of `public` and it is 1.2 MB.

**To restore from it**, the drill's own section 3 is the procedure: create the
tables, then `json_populate_recordset` each table's array back in. The script
does exactly this every run, so it is executable documentation rather than a
description.

**Do this before any migration that drops or rewrites data**, which is the one
moment the absence of a platform backup actually bites.

**What the procedure cannot do:** bring back logins, or the bytes behind
job photos. See the three gaps.

---

## What would fix it properly, and what it costs

**Measured from Supabase's own add-on API on 2026-09-20:**

| Option | Price | What it buys |
|---|---|---|
| Point-in-time recovery, 7 days | **$100/month** | Roll the database to any moment in the last week |
| PITR, 14 days | $200/month | Same, two weeks |
| PITR, 28 days | $400/month | Same, four weeks |

**PITR also requires a paid plan**, which this organisation does not have — it
is on `free`. The base plan's price is not exposed through the API and is not
quoted here rather than being half-remembered; it is on Supabase's pricing page.

**Moving to a paid plan alone also turns on daily backups**, which is the
cheaper half of the answer and probably the right first step. **That is
Andrew's decision and his card**, and it is on `FOR-ANDREW.md`.

**MFA on the production accounts is also 6.1's, and also his alone.** Nothing
in this repo can enable it.

---

## What is still open on 6.1

- **The last-restore date is not visible in the back office**, which 6.1's
  "done when" requires. That is a front-end change, and making it visible means
  publishing, which is Andrew's. **Named as blocked rather than dropped.**
- A restore into a genuinely separate environment — a Supabase branch or a
  second project — **would cost money and would create something inside
  Andrew's organisation.** Not done, not started, not priced onto anything. The
  paragraph he needs is on his list.
