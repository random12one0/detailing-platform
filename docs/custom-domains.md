# Putting a detailer on their own web address

**Roadmap 3.3, 2026-09-05.** The runbook for the one step in this feature that
is not code and cannot be done from the app: **adding the address as an alias
on our own hosting.**

Everything else is built. A detailer types the address on
**Business → Your web address**, points it at us with their domain company,
and presses *Check it*. Between those two, somebody has to do §2 below, and
until Phase 4's platform admin exists that somebody is the owner.

---

## What it changes, in plain words

Today every detailer's booking page is `detailingplatform.com/book/their-name`,
and **every link in every email the platform sends on their behalf says so** —
the "view, change or cancel" link on a confirmation, the reminder, the receipt,
the plan page, the opt-out at the bottom of a marketing email. That is the one
place a customer can see that the detailer is using somebody else's system.

With an address of their own, all of those become `book.theirdetailing.com/…`
instead. Nothing else changes: it is the same pages, the same booking, the same
database.

---

## The three steps

### 1. The detailer adds the address (they do this)

**Business → Your web address**, type it, press *Add this address*. It appears
in the list as *Not answering yet*.

**It should almost always be a subdomain — `book.theirdomain.com`.** Their main
address usually already points at a website of their own, and one address
cannot serve two things. A detailer with no website at all can use their apex
if they want to; everything below works either way.

### 2. We add it to Netlify (only the owner can do this)

Netlify → the platform site → **Domain management → Add a domain alias** →
type the same address → Save.

Netlify then shows the DNS record it wants. **Copy that record for step 3** —
it is normally a CNAME pointing at `<site-name>.netlify.app`, and Netlify
issues the HTTPS certificate on its own once DNS resolves.

**Why this cannot be automated yet, and what it would take:** it is an API call
to Netlify with an account token. That token would have to live as a function
secret and the call would have to be gated behind the platform-admin screen
that does not exist until roadmap 4.4. Doing it by hand for the first handful
of detailers is minutes; doing it with a token nobody is watching is a bigger
surface than the feature is worth today.

### 3. The detailer points the address at us (they do this)

At their domain company — GoDaddy, Namecheap, Squarespace, whoever sold them
the address:

| Type | Name | Value |
|---|---|---|
| CNAME | `book` | the value Netlify showed in step 2 |

Then, back on **Your web address**, press **Check it**.

DNS can take anything from two minutes to a few hours to spread. A failed check
is almost always "not yet", not "wrong" — press it again later.

---

## What "Check it" actually does

It is not a tick-box. `verify-domain` **fetches `https://<the address>/platform-host.txt`
from the address itself** and requires a marker back that only this app serves
(`app/public/platform-host.txt`).

**This is the check that matters, and it is worth understanding why.** From the
moment an address is verified, the platform writes it into every one of that
detailer's customer emails. If the address does not actually reach us, every
one of those links is a 404 — **which is worse than the seam this feature
removes**, because a customer who cannot open their own booking has lost it.
Nothing a detailer can type into a form makes a hostname serve our marker file;
only step 2 and step 3, both done, do.

`verified_at` is revoked from `authenticated` at column level in the migration,
so a detailer cannot stamp their own row and skip the proof. Row-level security
chooses which ROWS somebody may write; it says nothing about which COLUMNS.

---

## Once it is live

- The detailer's booking page answers at **the root** of that address — a
  customer typing it off a business card gets the booking form, not our
  marketing page.
- Every emailed link uses it. `business_canonical_host` picks **the earliest
  verified address** if there is more than one, so the emails are always
  internally consistent.
- The old `detailingplatform.com/book/their-name` **keeps working**. It is the
  same app; nothing is redirected and no existing link a customer already has
  is broken.

## Taking it away

Delete the row on the settings screen and every link goes back to
detailingplatform.com on the next email sent. **Also remove the alias in
Netlify**, or the address keeps resolving to a booking page the platform no
longer advertises.

---

## If it does not work

| What you see | What it means |
|---|---|
| *did not answer* | DNS has not spread, or the CNAME is wrong or missing. Step 3. |
| *answered, but it is not pointing at this app yet* | Something is serving that address, but it is not us — usually their existing website. Use a subdomain instead. |
| *answered 404* | Step 2 has not been done: Netlify does not know the address. |
| *is already set up on an account* | The address is verified on another business. Addresses are unique across the platform. |

**And one thing to check before blaming any of the above:**
`app/public/platform-host.txt` has to be in the DEPLOYED build. It is served
ahead of the single-page-app catch-all because Netlify serves a real file
before it applies a rewrite — but only if the file is actually there.
