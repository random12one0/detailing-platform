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
