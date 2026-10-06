# Who holds the back office — the declared roster

**This file is the DECLARATION. `public.platform_admins` is the fact.**
`tests/platform-admins-declared.test.mjs` compares the two and fails if they
disagree in either direction.

**A row in that table holds the whole platform**: every detailer, every
customer, suspend, impersonate, change prices. There is no narrower admin
level. So the table growing a row nobody wrote down here is the thing this
file exists to make impossible to miss.

---

## THE RULE FOR MAINTAINING THIS FILE

**Add a row to `platform_admins` → add its line here, in the same change, with
a reason and a removal condition.** Not afterwards. The check reads this file,
never the table, **because a check that reads its expectation out of the thing
it is checking can never fail** — it would agree with whatever it found,
including a row somebody added at three in the morning.

**NO PASSWORD, TOKEN OR KEY GOES IN THIS FILE.** `CLAUDE.md`'s hard rule, and
it matters more here than anywhere: this file names the two most powerful
logins in the product. **Say where a login lives, never what it is.**

---

## THE DECLARED ACCOUNTS

The machine-readable list. One address per line, nothing else on the line, and
the check parses exactly this block:

```declared-platform-admins
demo@demo.com
demo@detailplatform.com
```

### `demo@demo.com` — the master login

**Why it exists:** Andrew's own back-office login. He chose the address himself
on **2026-09-07**; the password was changed on **2026-09-09** at his ask, because
the project rejects anything under ten characters.
**It belongs to no business** — confirmed by reading `business_users`
2026-09-25: zero memberships. That is correct and deliberate. It is the platform
owner, not a detailer.
**Where the login lives:** in the `note` column of its own row, and with Andrew.
**Not in this repo, and it must not be.**
**When it goes:** its password is **guessable on purpose** while every business
in the database is a fixture. **ROADMAP 12.4 — it changes at the first real
signup, not before.** Do not remove, rename or disable it before then:
`/admin` is reached by this account in roughly sixty checks, and pulling it
early breaks the net rather than the risk.

### `demo@detailplatform.com` — the demo detailer, deliberately also an admin

**Why it exists:** Andrew's ruling, **2026-09-13** — the demo detailer is also a
platform admin so the back office can be verified independently. **Deliberate,
not an accident.** Added to the table **2026-09-20**.
**It owns one business** — the `demo-detail` fixture tenant.
**Where the login lives:** it is the seeded demo credential every browser script
signs in with; `scripts/seed-demo.mjs` sets it. **Its value is in no markdown
file and must stay that way.**
**When it goes:** ROADMAP 12.4, at the first real signup, together with the
above.

---

## WHAT IS TRUE TODAY — read, not assumed

**Read from `kguqylyzgyzfktkfnhjb` on 2026-09-25, before this file was written:**
`platform_admins` holds **exactly 2 rows**, and they are the two above. The
table has four columns — `user_id`, `email`, `note`, `created_at` — and no
narrower permission field, which is why every row here is all-or-nothing.

**ONE THING FOUND WHILE READING IT, AND IT IS NOT A ROW PROBLEM.** The `note`
column of the master login **contains that account's password in plain text.**
It is not in any repo file — `docs/VERIFIED.md` and
`docs/product-audit-2026-09-09.md` are both right that the value is in no file —
**but it is sitting in a database column, and anything holding service access
reads it.** The value is deliberately not repeated here.

### WHERE THE MASTER LOGIN LIVES — this file is the answer, and the note is not

**The address is `demo@demo.com`. The password is held by Andrew, and a copy is
in that row's own `note`.** That is the whole of what any session needs to know:
if you need to reach the back office, you ask him. **No session should ever need
the value, and none should write it anywhere.**

### AND IT WAS NOT DELETED FROM THE DATABASE TONIGHT. THAT IS DELIBERATE, AND
### THE REASON IS IN THIS REPO'S OWN STANDING RULES.

Clearing plain text out of that `note` looks like an obvious tidy-up. It is the
one tidy-up this repo has explicitly forbidden:

> `docs/standing-work.md` § 1 — **"Never re-open a decision he has made** or
> redesign something he has approved. `demo@demo.com` and its password are the
> **standing example**: a session that 'improves' it **locks him out of his own
> back office."**

**The note may be the only place that value exists.** Andrew chose the address,
asked for the password to be changed once, and that note is where the change was
recorded. **Deleting it to satisfy a rule about markdown files could take his own
back office away from him**, and nothing this session can read tells it whether
he has the value anywhere else. **That question is his and only his.**

**NEEDS ANDREW: does he hold the master login's password somewhere other than
that database note?** If yes, the note's value comes out and the reason stays —
a one-line update to one row. If no, **it stays exactly where it is** and the
right fix is the opposite direction: he puts it in his own password manager
first. **Not urgent** — nothing real is on the platform, and ROADMAP 12.4 changes
this login at the first real signup anyway, which retires the question.

**What was in scope and IS done:** the value is out of every tracked markdown
file in the repo — 8 files, 25 occurrences, 0 left, enforced from now on by
`tests/no-credentials-in-tracked-text.test.mjs`. **A database column is a different
surface with a different owner, and conflating the two is how a session talks
itself into a write nobody sanctioned.**

---

## THE CHECK WENT RED ON ITS FIRST DAY, ON A REAL ROW — 2026-09-25

**Forty minutes after this file was written with two accounts,
`tests/platform-admins-declared.test.mjs` failed:**

```
undeclared: shoot-admin@detailplatform.com
the counts agree — table 3, document 2
```

**It is real, it is a full platform admin, and it is transient.** Created
**2026-09-25 03:48**, by `scripts/shoot-admin.mjs` / `scripts/admin-account.mjs`,
which another session was running for ROADMAP 6.2a. Its own `note` says
*"Temporary — a script is looking at /admin. Removed when it finishes."*

**IT IS DELIBERATELY NOT DECLARED HERE, and the reason is the rule at the top of
this file.** Declaring it would mean this session deciding that an account it did
not create and does not own may hold the whole platform — and a declaration
written to make a run go green is the rubber stamp the check exists to prevent.
**A red that has found a live, undeclared, full-access admin on the day the check
shipped is the check working, not failing.**

**HOW THIS CLEARS:** the script removes the row when it finishes, and the check
goes green with no edit to this file. **If it is still there tomorrow, the script
did not clean up** — and that is the finding, not a documentation gap. Whoever
owns `scripts/shoot-admin.mjs` either confirms the teardown or declares the
account here with a reason and a removal condition.

**WHAT IT PROVES ABOUT THE TABLE:** a row granting every detailer, every
customer, suspend and impersonate can appear in this table **in the middle of an
ordinary night's work, from a script, with nobody deciding anything.** That is
exactly what nothing was watching for until now.

---

## WHAT THIS FILE IS NOT

It does not grant anything, and editing it changes no access. It is the written
intention that the live table is checked against. **If the check goes red, one of
the two has moved and the interesting question is which** — a row added without a
line here, or a line here for a row that is gone.
