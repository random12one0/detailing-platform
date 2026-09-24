# Knowing when something has stopped — how to switch it on

2026-09-07, roadmap 8.12. **Fifteen minutes, once, and then it watches itself.**

Everything on this page exists for one kind of problem: **the kind that makes
no noise.** A booking page that crashes gets reported by a customer within the
hour. A scheduled job that quietly stops running gets reported by nobody, ever
— the reminders simply stop going out, and the first person to notice is a
detailer who thinks the product is fine and just doesn't send reminders any
more.

This product has had that failure twice. The email relay was dead for an
entire item and the only trace was a line in a log nobody reads. The push keys
were never set, so the "send a push" code took its "not configured — skipping"
branch for the whole life of the feature. **Both were invisible from every
screen.**

---

## What is already built and needs nothing from you

**The dead man's switch runs every fifteen minutes.** It looks at when each
scheduled job last finished, and if one has stopped, it emails you once —
plainly, saying which job and how long it has been down — and emails you again
when it starts working. It will not email you twice about the same outage; an
alarm that repeats every quarter of an hour is one you route to a folder, and
then the next real one goes there too.

It goes to the address in `platform_settings.owner_email`. If that is ever
empty, the back office says **"NOBODY is being emailed"** on its health line
rather than saying nothing.

**There is one thing it cannot see, and it is the reason for step 1 below.**
The switch runs on the same scheduler as the jobs it watches. If that
scheduler stops — or the Supabase project is paused, which the free plan does
after seven days with no traffic — then the watcher stops too, and **the
silence is identical to everything being fine.** Nothing inside the database
can notice that. It takes something outside.

---

## 1 · The outside check — 5 minutes

**What it is:** a free service that expects a "still alive" message from us
every fifteen minutes and emails you when one doesn't arrive. That is the
whole idea, and it is the only thing that can tell you the whole scheduler has
died.

1. Make a free account at **[healthchecks.io](https://healthchecks.io)** (20
   checks free, no card).
2. **Add Check.** Name it `detailing platform — scheduled jobs`.
3. Set **Period** to `15 minutes` and **Grace Time** to `30 minutes`. (Period
   is how often we promise to check in; grace is how late we may be before it
   worries. Thirty minutes means one missed check-in is forgiven and two are
   not.)
4. Copy the **Ping URL** it shows you. It looks like
   `https://hc-ping.com/` followed by a long code.
5. Paste it into the database. In the Supabase dashboard → **SQL Editor**:

   ```sql
   update platform_settings set healthcheck_url = 'PASTE-THE-URL-HERE';
   ```

6. Wait fifteen minutes and refresh healthchecks.io. It should go green, and
   the back office's health line should stop saying *"NOTHING outside is
   watching the scheduler itself"*.

**Treat that URL like a password.** Anybody who has it can keep our monitoring
looking green from the outside. It is stored in the database and deliberately
never sent to the back office screen, which is only told yes or no.

---

## 2 · Is the website up — 5 minutes

The check above watches the *scheduler*. This one watches the *pages*, which
is a different question: Netlify could be serving a broken build while every
scheduled job runs perfectly.

1. Free account at **[UptimeRobot](https://uptimerobot.com)** (50 monitors
   free).
2. Add two HTTP(s) monitors, 5-minute interval:
   - `https://detailingplatform.com` — the page a new detailer meets first.
   - `https://detailingplatform.com/book/demo-detail` — a real booking page,
     which exercises the database and an edge function rather than just
     Netlify's file server. **This is the one that matters more.** The
     marketing page is static and will keep loading long after bookings have
     stopped working.
3. Alert contact: your email.

---

## 3 · Backups — 10 minutes

Separate page, already written: **[`backups.md`](./backups.md)**. It needs two
GitHub secrets from you and one file moved into `.github/workflows/`.

Nothing on this page is a substitute for it. Monitoring tells you something
broke; a backup is the only thing that undoes it.

---

## 4 · Crash reports from people's browsers — 10 minutes, and it is not built yet

Roadmap 7.2. A free **[Sentry](https://sentry.io)** project gives one value —
a "DSN", which is a URL — and with it the product can report a crash in
somebody's browser, with the personal details stripped out, instead of that
person just seeing a blank screen and closing the tab.

**It is deliberately not built until that value exists.** The whole worth of
it is the stripping-out, and a stripper nothing has ever watched work is not
something to trust with customers' addresses. Get the DSN and it is an
afternoon.

---

## What each one catches that the others do not

| | catches |
|---|---|
| The dead man's switch | one scheduled job stopped while everything else runs |
| healthchecks.io | the scheduler, the database or the whole project stopped |
| UptimeRobot | the website or the booking page stopped answering |
| Backups | none of the above — it is what undoes the damage |
| Sentry | a crash in one person's browser that nobody reports |

**They do not overlap by accident.** Each one is blind to what the next one
sees, which is why the answer is four small free things rather than one.

---

## UPDATE 2026-09-23 — § 2 is now BUILT, and not with UptimeRobot

Roadmap 6.2. **The "is the website up" check above no longer needs an account
anywhere, and step 2 is done.** `pg_cron` and `pg_net` were already installed
on this project, so the probing runs from the database itself every five
minutes and reports to the healthchecks.io account you already have, as a
third check called **`detailing platform — live site paths`**.

**It watches four paths**, and each was chosen because it can fail on its own:
the homepage (asserting the built bundle is really being served, because
`_redirects` makes *every* URL on that domain return 200), the tenant profile
the booking page loads first, the open-slots calculation, and the
authentication service answering. It carries **no credentials**, so nothing
about one person's account can trip it.

**It will not cry wolf.** A path has to fail twice in a row before anything is
said, a response that has not arrived yet is not a failure, and if nothing
could be graded at all the ping is withheld rather than sent — silence, not a
green light it did not earn.

**When it does fire, the email names the path**, because the failing paths go
in the body of the failure ping.

**Proved on the day it was built** by breaking the homepage assertion on
purpose: one failure changed nothing, the second took the check down and sent
the email, and restoring it brought the check back up. healthchecks.io
recorded it as one 22-second outage.

**What it still cannot see:** it runs inside Supabase, so if Supabase itself
stops, it stops pinging rather than reporting. That is what the twenty-minute
grace window is for — sustained silence becomes one alert instead of four.

**Sentry (§ 4) is still not built and still needs a DSN from you.**
