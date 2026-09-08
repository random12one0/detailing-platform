# The browser jobs — the prompt for the cloud coworker

Written 2026-09-08. Paste everything below the rule into a fresh session with
the coworker that has a browser.

**IT WAS REWRITTEN ONCE BEFORE BEING SENT, AND THAT IS THE POINT.** The first
draft asked him to set up Google sign-in, submit the Google Business Profile
application and create the backup repository. **All three were already done** —
`docs/google-and-backups-2026-09-07.md`, written the same night by another
session, has the account numbers and the case reference. `docs/OUTSTANDING.md`
§5 is the rule that caught it: *check every ask against the record before it
reaches him*, because on 2026-09-08 he was handed an eight-job page of which
three were things he had already answered, and he had to say so twice.

**So the shape below is deliberate: what is genuinely left is small and
precise, and the big-sounding items are already in flight.**

---

You are working with Andrew, who owns Andrew's Auto Detail and is building
**detailingplatform.com** — software he will sell to other detailers. The
software is written, deployed and tested. What is left is a short list of
things that live in a web browser, and that is your job.

You are doing this **with him, as him**. He has never set any of this up
before, so for every step: say where to go, what to click, what to type, and
what he should be looking at when it worked. Do the parts you can do; walk him
through the parts he has to touch himself.

**Before you start any job, check its current requirements yourself.** Every
one of these services has changed its signup, its free tier or its review
process in the last year, and some of what follows was written from
documentation rather than from doing it. If a job turns out to be cheaper,
harder, differently named or newly possible, say so in your reply — that is one
of the most useful things you can hand back. Do not assume anything on this
page is still true, including the parts that say something is blocked.

**Facts you will need:**

| | |
|---|---|
| Platform site | **https://detailingplatform.com** (Netlify) |
| Code | GitHub **`random12one0/detailing-platform`** — public |
| Backups | GitHub **`random12one0/detailing-platform-backups`** — private, already created |
| Platform database | Supabase project ref **`kguqylyzgyzfktkfnhjb`** |
| His live detailing business | **andrewsdetail.com**, a separate Supabase project. **Nothing here touches it.** |
| His birthday | **2 December 2026** |
| Stripe | An account exists, **test mode**, secret key and webhook secret already set |
| Google Cloud project | `detailing-platform`, number **37262651400**, OAuth client "Detailing Platform Web" |
| Google sign-in | **already switched on and live** |
| Business Profile API | **already applied for** — support case **6-3052000042070**, 2026-09-08 |

**Where a value goes matters more than the value.** Four different places, and
the wrong one either breaks it or publishes it:

- **Supabase Edge Function Secrets** — server-side secrets. Anything that can
  charge, delete or read customer data.
  `https://supabase.com/dashboard/project/kguqylyzgyzfktkfnhjb/settings/functions`
- **GitHub repository secrets** — only on the private backups repo.
- **Netlify environment variables** — only things that are safe inside a public
  web page.
- **His password manager** — anything he will need again and nobody else should
  have.

**Do not paste a secret key into your reply or into any chat.** Set it in the
service that needs it and report the *name* you set and that it is set.
Non-secret identifiers — a Sentry DSN, a Stripe Connect client id, an email
address, a bucket name — are fine to write out, and §RETURN asks for those by
name.

---

## JOB 1 — Finish Google sign-in: two URLs, then publish

**Do not set up Google sign-in. It is done and the button is live** — the
provider answers enabled, and the code shows the button the moment it is on.
The Cloud project is `detailing-platform` (37262651400).

**What is left is that the consent screen is still in *Testing* with zero test
users**, and Google's Audience page refuses both *Publish app* and saving a
test user while the Branding page is incomplete. **The only two empty Branding
fields are the privacy policy URL and the terms of service URL.** Both pages
exist and are public:

    https://detailingplatform.com/privacy
    https://detailingplatform.com/terms

Paste them into Branding, save, then publish the app. It is a paste, not a
build — nothing in the code is wrong.

**Return:** whether the app is published, and anything the publish step asked
for that was not those two fields.

---

## JOB 2 — Prove the mailbox on the domain actually works

The platform is configured to send its own alerts to
**`andrew@detailingplatform.com`**. Nobody has confirmed that address
**receives**. Find out.

Work out where the domain's DNS lives first (registrar, Cloudflare, or
Netlify) — that decides the options and Job 4 needs the answer too.

- If the mailbox works: send it a message from an outside address and confirm
  it arrives, and find out whether it can also **send**.
- If it does not: set one up and decide with him which route. Compare
  forwarding-only against a real hosted mailbox, and whether he wants to send
  from it as well as receive.

It matters because the platform's own outage alarm and dead-man's switch email
that address, and an alert nobody receives is worse than no alert.

**Return:** the address, the service, whether it sends as well as receives, the
monthly cost, and where the domain's DNS is hosted.

---

## JOB 3 — Turn the backups on. There are none running right now.

The repository is made and most of it is up. **`random12one0/detailing-platform-backups`
is private and holds `.gitignore`, `README.md`, `backup-key.pub` and
`scripts/restore.sh`. `SUPABASE_DB_URL` is already set as a repository
secret.** What is missing is the file that actually runs.

**The workflow file could not be pushed because the token lacked the
`workflow` scope**, and refreshing that scope opens a browser and needs a
human. He runs this once, in a terminal:

```
gh auth refresh -h github.com -s workflow
```

Then the file at `.github/workflows/backup.yml` goes up. Until it does,
`actions/workflows` reports **0 workflows** and **there is no backup of the
database at all** — Supabase's free plan has none of its own, so one bad
delete today is unrecoverable.

Then, in order:

1. Actions → *Nightly encrypted backup* → **Run workflow**.
2. Confirm a release tagged `backup-YYYY-MM-DD` with a `.pgc.age` asset on it.
3. **Restore it.** Download the asset, decrypt it with `scripts/restore.sh`,
   and load it into a scratch Supabase project. **A backup nobody has restored
   is not a backup** — that is the item's own acceptance test. Delete the
   scratch project afterwards.

**If the dump step fails it is almost certainly the connection string**: either
the `[YOUR-PASSWORD]` placeholder brackets were left in, or the **direct**
connection string was used instead of the **session pooler**. GitHub's runners
are IPv4-only and the direct address is IPv6, so it can never work. **Do not
ask him to paste the connection string into chat.**

Also check which secrets the repo actually holds — the encryption is an `age`
public key (`backup-key.pub`), so confirm where the matching **private** key
lives and that it is in his password manager. It is the only thing that can
ever decrypt these.

**Return:** whether the workflow is up, whether the first run went green, the
size of the dump, **whether a restore was actually performed and what it
showed**, and where the decryption key lives.

---

## JOB 4 — Cloudflare R2 for job photos

**This one is genuinely not started — there is no code for it yet**, and it is
the biggest missing feature on the list. Right now every detailer's job photos
share one 1 GB pot on Supabase's free plan, 250 MB each. R2 gives 10 GB free
and charges nothing for people looking at the images.

1. Create a Cloudflare account (or sign in, if the domain is already there).
2. **R2 → Create bucket**, named **`detailing-photos`**, location near
   California.
3. **CORS.** The browser uploads straight to the bucket, so it must allow it.
   Bucket → Settings → CORS policy: origins `https://detailingplatform.com` and
   `http://localhost:5173`, methods `GET, PUT, HEAD`, all headers, expose
   `ETag`.
4. **R2 → Manage API tokens → Create API token.** Permission **Object Read &
   Write**, scoped to that one bucket. The **Access Key ID** and **Secret
   Access Key** are shown once and never again.
5. Set all four on **Supabase Edge Function Secrets**, with exactly these names:

   | Name | Value |
   |---|---|
   | `R2_ACCOUNT_ID` | the account id on the R2 overview page |
   | `R2_BUCKET` | `detailing-photos` |
   | `R2_ACCESS_KEY_ID` | from step 4 |
   | `R2_SECRET_ACCESS_KEY` | from step 4 |

6. **Do not make the bucket public.** Job photos are customers' cars outside
   customers' houses. The code signs a short-lived link for each view.

**Return:** that all four names are set, the bucket name and location, and
whether R2 asked for a payment method — and if it did, what he put on it.

---

## JOB 5 — Stripe Connect, in test mode

**What it is:** the thing that lets a *detailer* take card payments from
*their* customers. The platform already bills detailers ($499 + $40/month) and
that works in test mode. This is the other direction and it is the largest
feature left to build.

**The design is decided and it is `Standard` Connect accounts** — the detailer
gets their own Stripe account, pays Stripe's processing fees themselves, owns
their own disputes, and the platform pays Stripe nothing and never holds their
money. Do not change this without saying why. **Standard is also the only type
whose account holder may be under 18**, which is why this can be built now.

All of it works in test mode:

1. In the existing Stripe dashboard, **Test mode on**.
2. **Connect → Enable Connect.** It asks for a platform profile: what the
   platform does, who the users are, and whether the platform handles payments
   — **it does not; the connected accounts do**.
3. **Connect → Settings.** Set the platform's public name, icon, brand colour
   and support address. This is what a detailer sees on Stripe's own screen
   when they connect, so it should read *Detailing Platform*.
4. Find the **Connect client id** — it starts `ca_`. Not a secret.
5. Register the **OAuth redirect URI**, exactly:
   `https://detailingplatform.com/settings/payments/connected`
   Stripe compares it character for character, so a trailing slash is a
   failure.
6. Report which of these the account has in test mode: Standard accounts,
   hosted onboarding, and where the Connect webhook endpoint is configured.

Set the client id on **Supabase Edge Function Secrets** as
`STRIPE_CONNECT_CLIENT_ID`.

**Return:** the `ca_` client id, that Connect is on in test mode, the redirect
URI it accepted, and anything the platform profile asked for that could not be
answered yet.

---

## JOB 6 — Sentry

**What it is:** it emails him when the software breaks for a real detailer,
instead of him hearing about it when they phone. Free at 5,000 errors a month.
Nothing is built for this yet — the code waits on the DSN.

1. https://sentry.io → sign up → create an organisation.
2. Create a **project**, platform **React**. A second one for the server side
   (**Deno**) is worth having — decide with him; one is fine to start.
3. Copy the **DSN**. It is not a secret: it ships inside the public website by
   design.
4. In project settings, turn **on** the setting that scrubs personally
   identifying data before storage, and report what it is called now.
5. Decide with him whether **Session Replay** is on. It records what a detailer
   saw on screen — powerful, and a privacy decision rather than a technical
   one.

**Return:** the DSN in full, the org slug, the project slug(s), whether
scrubbing is on and what it is called, and the Session Replay decision.

---

## JOB 7 — Chase the Google Business Profile application

**Do not submit it. It is already in.** Support case **6-3052000042070**,
submitted 2026-09-08 from `andrewswashing@gmail.com`, the account that holds
the verified listing. Google says 7–10 business days.

- **Quota is how you know.** In the Google Cloud console the Business Profile
  APIs read **0** until it is granted; a non-zero quota is the grant.
- Check the case for any reply, and answer anything Google has asked.
- **Expect the console to say `business.manage` is "not sensitive" while the
  backend answers `403 access_denied` to every external user.** That is the app
  being unverified, not a bug — do not send anyone chasing it as a code
  problem.
- The **second** review, OAuth verification for that scope, cannot start until
  the sync feature exists. Note it, do not start it.

**Return:** the state of the case, the current quota figure, and anything
Google has asked for.

---

## JOB 8 — Check the things that are already running

Report what you find even when it is fine.

1. **Netlify** — a deploy went out on 2026-09-08 with 71 commits in it.
   Confirm the latest build is green and the site loads. Then confirm
   `https://detailingplatform.com/example1` through `/example10` and
   `/examples` all load — those are the ten example detailer sites he asked
   for. **A 200 proves nothing on this site**: it serves the app's HTML for
   every path, including nonsense ones, so check that the page really is what
   it should be.
2. **Resend** — confirm `detailingplatform.com` is a verified sending domain
   with its DNS records in place, and report the plan and the daily send limit.
   The product shows detailers a counter against that limit, so the number
   matters. It is currently 100 a day across every tenant and that has been hit
   during testing.
3. **Supabase** — confirm the project is on the free plan and report the
   database size and storage used against the free limits.
4. **Stripe** — confirm `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are
   still set on Supabase Edge Function Secrets, and that the webhook endpoint
   still points at
   `https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/stripe-webhook` with
   these five events: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`, `invoice.payment_failed`.
5. **The platform's own watchdog** — `platform_settings.healthcheck_url` is
   empty, which means **nothing outside is watching whether the scheduled jobs
   are alive**. If they stop, the alarm stops with them and the silence looks
   exactly like health. A free uptime service that accepts a ping URL fixes it
   in five minutes; `docs/ops/monitoring.md` is the write-up. Set one up and
   report the URL, which then goes in that setting.

---

## JOB 9 — Four answers only he can give

These are questions, not tasks. Get an answer to each, in his own words.

1. **`ENTITY` in the legal pages currently reads *"Andrew Dietrich, doing
   business as Detailing Platform"* — and that is a guess at his paperwork.**
   A sole trader, a DBA and an LLC are three different legal persons, and this
   is printed on the public terms. Confirm or correct it.
2. **Should a detailer's email address on their public site be behind a switch
   that is off by default?** Published addresses get harvested by spam bots;
   phone numbers largely do not. Recommended: yes, off by default.
3. **Should the price editor keep WARNING when a detailer types a price ladder
   that does not make sense, rather than refusing to save it?** Recommended:
   keep warning — the rest of the product warns rather than blocks.
4. **Address autocomplete on the booking page** — a customer types three
   characters and picks their address instead of typing it wrong. Google's
   monthly credit covers this volume many times over. If he wants it: a browser
   API key **restricted to the detailingplatform.com referrer and to the Places
   API only** — an unrestricted key on a public page is the one way this costs
   money. The key is public by design.

**Return:** his answer to each, quoted where the wording matters, plus the
Places key if he wants it.

---

## JOB 10 — The December list

These are tied to the week of **2 December 2026**. Do not do them now, but
**find out what each actually requires today**, because the answers on file
were written from documentation in September and he should not meet a new form
on the day.

- **Stripe activation** — identity, business details, bank account. What does
  the activation form ask for now, and how long does verification take?
- **Lakewood, CA business licence** — apply at
  https://www.lakewoodca.gov/Business/Start-and-Grow-a-Business/Apply-for-a-business-license,
  and they ask you to phone first: **(562) 866-9771 ext. 2622**. Current fee,
  and what a home-based online software business has to supply.
- **An EIN** from the IRS — free and online. How long does it take now?
- **A business bank account** — what does a sole proprietor with an EIN need to
  open one, and which banks charge nothing?

**Return:** for each, what it requires today, what it costs, how long it takes,
and anything that has changed since September.

---

## §RETURN — how to reply when it is done

Write **one message** back, in this exact shape. It is read by the session that
writes the code, and every value below turns into a line of it.

```
## DONE
One line per job that is finished, saying what proves it.

## VALUES
PLATFORM_EMAIL_ADDRESS     = 
DNS_HOSTED_AT              = 
R2_BUCKET                  = 
R2_LOCATION                = 
SENTRY_DSN                 = 
SENTRY_ORG                 = 
SENTRY_PROJECTS            = 
STRIPE_CONNECT_CLIENT_ID   = 
STRIPE_CONNECT_REDIRECT_URI= 
HEALTHCHECK_PING_URL       = 
PLACES_API_KEY             = (or "not doing")

## SECRETS SET (names only, never the values)
Supabase Edge Function Secrets: ...
GitHub secrets on detailing-platform-backups: ...

## SETTINGS THAT ARE NOW ON
Google consent screen: published / still testing
Stripe Connect (test mode): on / off, account type
Sentry PII scrubbing: on / off, and what it is called now
Sentry Session Replay: on / off — his decision
Resend plan and daily limit:
Supabase plan, database size, storage used:

## THE BACKUP
Workflow up: yes / no
First run: green / red, and the dump size
RESTORE PERFORMED: yes / no — and what it showed
Decryption key lives:

## WAITING ON SOMEBODY ELSE
Google Business Profile case 6-3052000042070 — state, quota figure, next check.
Anything else in a queue.

## HIS FOUR ANSWERS
One per question in Job 9, quoted.

## WHAT I COULDN'T FINISH, AND WHY
Be specific. Name the screen, the button and what it said. If something needs a
document, a payment method, an age, an address or a phone call, say exactly
which one and what it wanted.

## WHERE THE DOCS WERE WRONG
Anything on this page that turned out to be out of date, renamed, differently
priced, or no longer true — including anything I said was blocked that was not.
This is the most valuable section: the repo is written from these facts and
will be corrected from your answer.

## DECEMBER
For each of the four: what it requires today, cost, how long.
```

**One more thing.** If a service asks for something he does not have, do not
work around it silently and do not stop the whole list — move to the next job,
finish everything else, and put the exact requirement in *WHAT I COULDN'T
FINISH*. The code on the other end can be written for nine of these and
switched on later, but only if the tenth is described precisely rather than as
"it didn't work".
