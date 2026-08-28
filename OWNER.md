# For the owner — plain English

This file is for you, not for the computer. Everything else in this repo is
written for programmers. This one explains decisions in normal words, and it
is the only file where I'm allowed to use analogies instead of jargon.

**Two things live here:**

1. **Decisions waiting on you** — what I need you to decide, why it matters,
   what happens either way, and what I'd do if it were my business.
2. **When to clear the chat** — so you're not guessing.

Nothing here is urgent unless it says **URGENT**.

---

## When to clear the chat

Think of my memory during a conversation as a **whiteboard**. Everything we
say goes up on it. It's big, but it isn't infinite — and once it's crowded, I
start misreading my own handwriting. That's when I get things wrong, forget
what we already decided, or confidently describe a file that doesn't exist.

Clearing wipes the whiteboard. It does **not** wipe the filing cabinet — the
files (`CLAUDE.md`, `docs/roadmap.md`, `DECISIONS.md`, this one) survive, and
a fresh session reads them and picks up right where we left off. That's the
whole reason those files exist.

### Clear when:

- **I've finished one roadmap item and committed it.** This is the main one.
  One item, then clear. I'll tell you when I'm at that point — look for
  *"Safe to clear."*
- **I start repeating myself**, contradict something I said earlier, or
  mention a file or a decision that doesn't sound right to you.
- **You're switching to a completely different kind of job** — e.g. we've
  been doing database work and now you want to talk about how the site looks.
- **The conversation has just gone sideways** and it's easier to start over
  than to argue me back on track.

### Don't clear when:

- **I'm mid-task.** If I've deleted three files and haven't committed yet,
  clearing loses the thread of what I was doing. Ask me to finish or stop
  properly first.
- **You've told me something important that isn't written down yet.** Ask me
  to write it into a file first, then clear. If it's only in the chat, it's
  only on the whiteboard, and the whiteboard is what you're about to wipe.

**The short version:** one job per conversation. Job done and committed →
clear. It costs you nothing and it's the single best thing you can do to stop
me making things up.

---

## Decisions waiting on you

### 1. The old website's key — *my recommendation: leave it alone*

**Status:** open, not urgent, no deadline.

**What a "key" actually is here.** Your website has to talk to your database
to know what a booking is. To do that, it carries an ID card. Supabase (the
company that hosts your database) hands out two different ID cards:

| The card | Who's meant to see it | Think of it as |
|---|---|---|
| The **public** key (`anon`) | Everybody | Your street address on your sign |
| The **secret** key (`service_role`) | Only your servers, never a visitor | The key to your front door |

The one we're talking about is the **public** one. It is not a secret and was
never meant to be. **It is sitting in every visitor's web browser right now**,
on purpose. Anyone who visits andrewsdetail.com can already read it in about
four clicks. That's not a flaw — it's how the whole system is designed to work.

**So what was the actual problem?** A leftover file in this project had that
public key typed into it, sitting next to a *second* file that offered to
unlock your database's front door. Neither one was dangerous alone. Together
they were the recipe for someone creating fake bookings in your real system.

**And I checked the lock.** Before deleting anything, I looked directly at
your live database and confirmed the door was never unlocked. Nobody can
create, change, or delete anything in your real business data using that
public key. Not bookings, not customers, nothing. It can only *read* the
things your website already shows the public anyway — your prices, your
hours, your gallery. I verified this on the live system, not by guessing.

**So: should you change the key?**

*What "changing it" would mean:* Supabase issues a new one, and the old one
stops working instantly. Your live website is using the old one right now, so
your site breaks the moment you do it — until you go into Netlify, paste in
the new one, and wait for it to redeploy. That's a few minutes where a
customer trying to book gets an error.

|  | Change it | Leave it |
|---|---|---|
| **Risk you remove** | Basically none — it's public by design and I proved it can't write anything | — |
| **Risk you take on** | A few minutes of your live booking site being broken, plus a chance of pasting it wrong | None |

**What I'd do:** leave it. You'd be taking real downtime on a business that
takes real money, to hide something that's printed on your sign. What
protects you is the lock, and the lock is good — I checked.

**When that answer would change:** if you ever hear that your *secret* key
(`service_role`) got into a file, or into the chat, or onto GitHub. That one
is a genuine emergency and I'd tell you so in capital letters. This isn't
that.

**You don't have to reply.** Leaving it is already the default. Say
"rotate the key" whenever you'd like it done and I'll walk you through it
step by step.

---

## Decisions you've already made

Kept short, so you can see what you're on the hook for. The full technical
reasoning for each lives in `DECISIONS.md`.

- **2026-08-28 — Restart the design, keep the machinery.** The site's *looks*
  start over from scratch; the booking engine underneath is untouched and
  keeps working the whole time.
- **2026-08-28 — Your business becomes customer #1.** We copy Andrew's Auto
  Detail onto the platform and run both side by side. The old site keeps
  taking real bookings until you personally trust the new one.
- **2026-08-28 — Rewrite the README, save two files into git.** Housekeeping.
  Nothing you need to remember.

---

## Words I keep using

| Word | What it means for you |
|---|---|
| **Commit** | Saving a checkpoint. Every commit can be undone later. |
| **Branch** | A safe side-copy to work in. We're on one called `claude/superbase-access-anj1h7`. |
| **`main`** | The branch that *is* your live website. Anything that lands there goes public automatically. I never touch it. |
| **Push** | Uploading commits to GitHub. Saving is local; pushing is public. I don't push unless you say so. |
| **Deploy** | Putting a new version of the site on the internet where customers see it. |
| **The database (Supabase)** | Where every booking, customer and price is actually stored. |
| **RLS** | The lock on the database. It's what decides who's allowed to see or change each row. This is your real security. |
| **Migration** | A permanent change to the shape of the database — a new column, a new table. Never edited after the fact, only added to. |
| **Edge function** | A small program on a server that does the risky work (taking a booking, sending an email), so a visitor's browser is never trusted with it. |
| **Tests** | Automatic checks that shout if something broke. We run them before and after every job. |
