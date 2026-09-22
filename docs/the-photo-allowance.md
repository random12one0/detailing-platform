# The photo allowance, and how it would actually be enforced

**Written 2026-09-21 night. Nothing here is built.** No code, no migration,
nothing deployed, and the allowance number has deliberately **not** been
changed. This is the design and the arithmetic, so that when somebody does
build it there is nothing left to work out.

---

## 1. What is already right. Do not rebuild any of it.

The existing design is correct and this job should end with **one number
changing and a guard being added** — not a rewrite.

| already built | what it does |
|---|---|
| `photo_total_bytes()` | reads **one column** and turns it into bytes |
| `photo_tenant_share()` | the divisor. Returns **100** — one hundredth each |
| `platform_settings.photo_total_gb` | **the one number.** Currently **`1`** |
| `job_photo_budget(business)` | used bytes, cap bytes, photo count, for one detailer |
| `photo_store_state()` | used against total, and **committed** against real — the whole-platform view |
| `app/src/lib/photo-rules.js` | shrink, budget words, `roomFor()` |

**The reasoning is already written down** in
`supabase/migrations/20260906011000_photo_share.sql` and
`20260906011100_photo_total_column.sql`, better than it would be repeated
here. **Read those before changing anything in this area.**

**Verified at source rather than assumed, 2026-09-21:** the live
`photo_total_bytes()` reads `platform_settings.photo_total_gb` — the column,
not the older JSON key — and falls back to `1`. All four functions exist.
**`job_photos` holds 0 rows and 0 bytes.**

## 2. The number

**Today:** 1 GB ÷ 100 = **10.24 MB each**. A photo after `shrink()` is roughly
200–400 KB, so that is **about 47 photos per detailer**.

**After the move to R2:** the free tier is 10 GB. 10 ÷ 100 = **102.4 MB
each** — between **260 and 500** photos depending on size, **call it 340**.
**Ten times what a detailer has today**, and comfortably enough for a solo
operator doing before-and-afters.

### DO NOT SET `photo_total_gb` TO 10 YET

**This is the important part and it is easy to get wrong by being helpful.**

**The file's own rule is that the total must describe storage that actually
exists.** Right now **not one byte goes to R2**. Setting the number tonight
would put an allowance on a detailer's screen that the platform cannot keep —
**which is the exact fault `20260906011000_photo_share.sql` was written to
remove.** Its own comment says a default that promises storage that does not
exist yet is the fault, not a convenience.

> **`photo_total_gb` changes from 1 to 10 in the SAME commit that switches
> uploads to R2. Not one commit earlier.** If you are reading this and
> uploads still go to Supabase, the number is correct at 1 and must stay
> there.

## 3. The hole: the cap has never actually been enforced

**`roomFor()` runs in the browser, and nothing else checks anything.**

Supabase's storage policies enforce **who** may touch a file. They have never
enforced **how much**. So the cap has always been **advisory**: anything that
does not go through our own upload button is unlimited.

**Under Supabase that was survivable, because the plan simply stops.** Under
R2 it is **a bill, and a bill with no ceiling on it.**

**So the cap has to be enforced where the upload is AUTHORISED, not where the
button is drawn.**

## 4. The shape to build — design only

**The browser must never hold R2 credentials.** That is the fixed point
everything else follows from.

1. **An edge function mints a presigned upload URL, and it is the one and
   only door.** No other path to R2 exists. If a second one is ever added,
   the cap stops meaning anything again, quietly.
2. **That function checks the business id itself.** R2 has no equivalent of
   Supabase's `foldername` policy — **this is the database-enforced isolation
   that the move loses, rebuilt in code.** It is the loudest warning in
   `docs/recovery.md` and in `FOR-ANDREW.md`, and it is not optional: without
   it, one detailer can reach another's photographs.
3. **In the same call it reads `job_photo_budget()` for that business** and
   refuses over the cap — with a message a detailer can act on, not an error
   code. Something they can do something about: what they have used, what the
   limit is, and that deleting old job photos frees it.

**One door, two questions at that door: is this your business, and do you
have room.**

## 5. Two traps, named because both fail silently

### Trap one — the cap becomes infinite rather than failing

`job_photo_budget()` sums `job_photos.bytes`. **If bytes stop landing in that
column, the sum reads zero, and a cap compared against zero does not refuse
anybody. It silently becomes unlimited.**

That is this repo's most familiar failure — **a number that quietly becomes
nothing instead of becoming wrong** — and it would surface as a bill rather
than as an error.

**So the row and the upload have to be one transaction, or the row has to
win.** An object in the bucket with no row behind it is invisible to every
check we have.

### Trap two — the client cannot be trusted for the size

**The byte count must not be whatever the client claims, because the client is
the thing being limited.** A browser that under-reports its upload size buys
itself unlimited storage.

**Verify against the size R2 reports for the stored object, and reconcile to
that.** The claimed size may be used to refuse early — it must never be what
gets recorded.

## 6. A periodic reconcile, so drift is a number rather than a surprise

**Sum the real object sizes under each business's prefix in R2 and compare
them to that business's `job_photos` sum.**

Any difference is one of: an object with no row, a row with no object, or a
recorded size that does not match the stored one. **All three are invisible
today and all three would first appear as an invoice.**

The point is not to fix drift automatically. **The point is that it shows up
as a number somewhere on a schedule**, which is the difference between
noticing in a week and noticing in a quarter.

## 7. The cost curve, so this never has to be agonised over again

Past the free 10 GB, R2 is about **a cent and a half per gigabyte per month**,
and **downloads are free** — which is the part that makes other providers
expensive.

**A hundred detailers at 200 MB each is 20 GB. Ten of those gigabytes are
free, so the bill is about fifteen cents a month.**

> **Being more generous later costs almost nothing, and it is one number.**
> That sentence is the whole reason this does not need to be optimised now.
