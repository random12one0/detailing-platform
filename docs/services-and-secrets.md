# Every service, every account, every secret — the cold-start register

**Written 2026-09-22.** This exists because a chat window was about to be
cleared and most of what follows had been said out loud and never written
down. Andrew's words: *"I just want to make sure Claude Code knows
everything."*

**Read this if you are picking the project up cold.** It answers: what do we
pay for, which email address is on it, where does its key live, and how do I
get a new one.

**Two rules for anyone editing this file.**

1. **A value never goes in here.** Names, locations and the page you mint a
   new one on — never the secret itself. Same rule as everywhere else.
2. **Mark anything you cannot confirm from a file or a live page as
   *unconfirmed*.** One wrong row makes the whole table untrustworthy, and a
   gap is more useful than a guess.

---

## 0. A BOUNDARY, BEFORE ANYTHING ELSE: `andrewsdetail.com` IS NOT OURS

**Our product is `detailingplatform.com`. That is the one this repo builds.**

**`andrewsdetail.com` is Andrew's own detailing business** — a separate
website with its own booking form. **This project has no access to it and no
business touching it.** It is not a tenant, not an example, and not a staging
copy. It appears in this file only because **his Zoho account added that
domain successfully while refusing ours**, which is how we know the ZeptoMail
problem is domain-specific rather than account-wide.

**Our own legal pages already exist: `detailingplatform.com/privacy` and
`detailingplatform.com/terms`.** If something needs a privacy or terms link,
those are the two, and nothing needs to be created.

> **This is written as a boundary rather than a footnote because it was got
> wrong on 2026-09-22 and Andrew had to correct it.** The two names look
> alike and one of them is a live business that is not ours to touch. **See
> also `CLAUDE.md` § Hard rules on the two Supabase projects — the same shape
> of mistake, one layer down.**

---

## 1. Which email address is on which service

**Andrew has several addresses and loses track. He has asked for this twice.**

| Service | Address | |
|---|---|---|
| **Telnyx** (texting) | `andrew@detailingplatform.com` | confirmed |
| **Supabase** (database, functions, storage today) | `andrewsauto@andrewsdetail.com` | confirmed |
| **Cloudflare** (R2 photo storage) | `Random12one0@yahoo.com` | confirmed |
| **Google Cloud project** `detailing-platform` | `ramdom12one0@gmail.com` | confirmed |
| Google Business Profile *"detailing platform"* — **the wrong one** | `ramdom12one0@gmail.com` | confirmed |
| Google Business Profile *Andrew's Auto Detail & Car Wash* — **the real one** | `andrewswashing@gmail.com` | confirmed |
| **The Google API access application** | `andrewswashing@gmail.com` | confirmed |
| **Resend** (what actually sends email today) | `andrewswashing@gmail.com` | confirmed |
| **GitHub** — account `ramdom12one0-sys` | `ramdom12one0@gmail.com` | confirmed |
| **Netlify** (hosting) | signs in **through GitHub** | confirmed |
| **Stripe** (payments) — notifications | `ramdom12one0@gmail.com` | confirmed |
| **Zoho / ZeptoMail** — org *"Detailing Platform"* | signed in **with Google** | **which Google address: unconfirmed** |
| **Symantec / FortiGuard** site-rating submissions | `andrewswashing@gmail.com` | confirmed |

**The two Google Business Profiles are a trap.** One is his real detailing
business and one is a profile called *"detailing platform"* that is not the
one the API application is about. **They are on different addresses.** The
application was filed from `andrewswashing@gmail.com` **because that account
holds the verified listing** — the other manages none and would have failed
the check.

## 2. Secrets — where they live, never what they are

**All of these are Supabase edge-function secrets on project
`kguqylyzgyzfktkfnhjb`.** Dashboard → Project Settings → Edge Functions →
Secrets. **Verified by listing the names on 2026-09-22 — 25 of them.**

| Secret | What it is for | Where a new one is minted |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`, `SUPABASE_DB_URL`, `SUPABASE_JWKS` | the project's own | Supabase → Project Settings → API |
| `RESEND_API_KEY` | sending all email today | Resend → API Keys |
| `RESEND_WEBHOOK_SECRET` | verifying Resend's delivery callbacks | Resend → Webhooks → the endpoint's signing secret |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | payments | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET` | verifying Stripe callbacks | Stripe → Developers → Webhooks → the endpoint |
| `STRIPE_CONNECT_CLIENT_ID` | detailers connecting their own Stripe | Stripe → Settings → Connect |
| `OWNER_VAPID_PUBLIC_KEY`, `OWNER_VAPID_PRIVATE_KEY`, `OWNER_VAPID_SUBJECT` | phone alerts to the detailer | generated once as a pair; **not from a dashboard** |
| `DEEPL_API_KEY` | translation | DeepL → Account → API keys |
| `GOOGLE_TRANSLATE_API_KEY` | translation fallback | Google Cloud → APIs & Services → Credentials |
| `GEOAPIFY_API_KEY` | address search on the booking page | Geoapify → My Projects |
| `PLATFORM_URL`, `PLATFORM_FROM_ADDRESS` | not secrets, configuration | — |
| **`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`** | **Cloudflare R2 photo storage. Saved 2026-09-22** | Cloudflare → R2 → **Manage R2 API Tokens** |

> **`TELNYX_API_KEY` DOES NOT EXIST, AND MUST NOT BE CREATED YET.**
>
> It was described in conversation as an empty named box waiting to be
> filled. **It is not there at all** — checked by name on 2026-09-22 and
> confirmed independently against the dashboard page.
>
> **Do not create it as a placeholder, and do not mint a real one either.**
> A Telnyx key is account-level, so one *could* be minted today without a
> number — but **a key sitting unused for months is a liability with no
> benefit**, and minting it later takes a minute. An empty *named* secret is
> worse again: it is the thing a later session sees and tries to fill in.
> When there is genuinely something to use it for, it is minted at
> **Telnyx → API Keys**. See "What can be built without paying" below.

**A count that two readings disagree on, recorded rather than picked.** The
Management API listed **25** names on 2026-09-22; the dashboard page was read
as **24**. The difference has not been chased and nothing depends on it — it
is noted because a register that quietly rounds one of two disagreeing numbers
is the fault this repo names most often.

## 3. Cloudflare R2 — the photo store

**Chosen 2026-09-21.** 10 GB free against the 1 GB we had, and **downloads
cost nothing**, which is the part that makes other providers expensive. Past
the free tier, about **1.5¢ per GB per month**.

- Account id **`3ebc9f9dfd8b21c849e43fcd9e22887c`**
- S3 endpoint **`https://3ebc9f9dfd8b21c849e43fcd9e22887c.r2.cloudflarestorage.com`**
- **Three buckets already exist and are named to match the code exactly:**
  `job-photos`, `business-media`, `expense-receipts`

**The allowance, and why it is not 10 yet, is in
`docs/the-photo-allowance.md`.** So is the enforcement design and the two ways
the cap fails silently. **Read that before touching photo storage.**
*(Superseded 2026-10-10: the allowance IS 10 now — see the next block.)*

### 3a. LIVE SINCE 2026-10-10 — the switch-over, and where the domain's DNS lives now

**`detailingplatform.com`'s DNS moved from Netlify DNS to Cloudflare on
2026-10-10.** Registrar is **Spaceship** (`Random12one0@yahoo.com`'s Spaceship
account; renews 2027-08-27). Nameservers are now **`joselyn.ns.cloudflare.com`
and `yew.ns.cloudflare.com`** (were `dns1-4.p07.nsone.net`). Zone is on
Cloudflare's **Free** plan in the same account as R2. **The website is still
hosted on Netlify** — only the address book moved.

- **11 records, copied one for one from Netlify and checked against both sets of
  nameservers before and after the switch.** Every record is **DNS only (grey
  cloud) — do NOT turn the orange proxy on** for `@` or `www`: they CNAME to
  `detailplatform-admin-test.netlify.app` and Netlify must keep serving and
  renewing the certificate itself. The rest: iCloud mail (2 MX, `apple-domain`
  and SPF TXT, `sig1._domainkey` CNAME), `_dmarc` TXT, and the sending
  service's `send.email` / `rsend.email` CNAMEs and `resend._domainkey.email` TXT.
- **A new DNS record now goes in Cloudflare**, not Netlify. The old Netlify DNS
  zone was left in place (unused) on purpose; deleting it is optional.
- **`media.detailingplatform.com` is bound to `business-media`** as an R2 custom
  domain (min TLS 1.2). It is the value of the functions secret
  **`R2_MEDIA_BASE`**, and it is written into every logo/gallery row's
  `image_url`, so **it must never change.**
- **CORS** is set on all three buckets: GET + PUT, header `Content-Type`, from
  `detailingplatform.com`, `www.`, `localhost:5173`, `127.0.0.1:5173`,
  `*.netlify.app`, `*.netlify.live`.
- **Published 2026-10-10:** `photo-door`, `delete-customer`, `photo-reconcile`;
  nightly reconcile cron at 03:40 UTC with a 60 s timeout; allowance 1 → 10 GB.
- **Proved, not assumed:** `scripts/photo-door-deployed.mjs` 6/6 PASS (11/11
  canaries), `scripts/r2-public-base.mjs` 5 PASS + 1 UNJUDGEABLE until a real
  logo exists, `scripts/photo-release-order.mjs` 0 failed,
  `deployed-inventory` 41/41 match, `migration-drift` PASS.

## 4. Telnyx — texting. Account paid, brand submitted, nothing can send yet

**State as of the night of 2026-09-21:**

| | |
|---|---|
| Account | **PAID** (went Pretrial → Trial by connecting GitHub) |
| 10DLC brand | **"Andrew's Auto Detail & Car Wash"** |
| Brand id | `4b2001a0-c7e7-ede3-76fa-a67ec4841df8` |
| TCR id | `BMKZFBT` |
| Registered | 21 Sep 2026 |
| Status | **VERIFIED** — Andrew entered the phone code. *(Recorded as "Pending verification" earlier on 2026-09-22 from a page that had not been refreshed.)* |
| Type | **Sole Proprietor — no EIN and no SSN needed** |
| Paid | **$4**, one-off |
| **Campaign** | **FILLED IN, NOT SUBMITTED, NOT PAID — parked at the payment step** |

### The campaign form is already complete. Do not fill it in again.

**Everything below is entered and saved. It is waiting at the payment step
and nowhere else**, so anyone picking this up should **resume it, not rebuild
it**:

- **Use cases:** Customer Care and Account Notification
- **Vertical:** Professional Services
- **A full opt-in description**, written
- **Keywords:** STOP, HELP, START
- **Three auto-replies**, written
- **Two sample messages**, written
- **Every attribute question answered**
- **Compliance links** pointing at `detailingplatform.com/privacy` and
  `detailingplatform.com/terms` — **ours, and both already exist**

**The carrier terms preview showed all carriers qualifying, with no manual
review**, and a **T-Mobile ceiling of 1,000 messages a day.**

**Costs after that:** campaign review **$15**, then **$2/month**; a phone
number is about **$1/month**. That buys roughly a thousand texts a day.

> ### THE REST OF TELNYX IS DELIBERATELY DEFERRED. IT IS NOT UNFINISHED WORK.
>
> **Andrew's decision, 2026-09-22.** He does not want to start paying
> anything monthly while he is **not publishing yet and does not have the
> business running**. So the **campaign ($15 + $2/month)** and the **number
> (~$1/month)** wait until launch — and the **API key waits with them, but
> for a different reason: it is not blocked.** A Telnyx key is account-level
> and could be minted today. It waits because **there is no point holding an
> unused credential for three months**, and minting it later takes a minute.
>
> **The $4 brand fee was a one-off and is already spent.** That is why the
> registration looks half-done: it is paid for and parked, on purpose.
>
> **If you are reading this weeks later and see a VERIFIED brand with a
> campaign form that is complete but never submitted: that is the expected
> state.** The brand is done and paid; the campaign is deliberately parked at
> the payment step. **Do not submit it, and do not start a subscription, to
> tidy up something that looks unfinished. It is not unfinished — it is
> waiting.**

### WHAT CAN BE BUILT WITHOUT PAYING, AND WHAT CANNOT

**Andrew's question, 2026-09-22: can texting be fully wired up and ready, so
that the day he activates, texts start flowing?** Mostly yes — and the part
that is *not* yes is the part worth knowing.

**Free, unblocked, and doable at any time:**

- **The phone verification** — the six-digit code. Costs nothing.
- **The API key itself** — a Telnyx key is account-level and can be minted
  without a number.
- **The messaging profile** — `DetailingPlatform` already exists and is on.
- **All of our own code.** The send function, the inbound webhook, the opt-out
  state, the per-message row. **None of it costs a cent and none of it is
  blocked by anything.**

**Costs money, and therefore waits:**

- **The campaign** — $15 review, then $2/month.
- **A number** — about $1/month.

> ### ⚠ ACTIVATION IS NOT A SWITCH, AND THIS IS THE PART HE DOES NOT KNOW
>
> **The campaign is reviewed by the carriers' registry, not by Telnyx.** That
> is an outside body on its own schedule, and it is **days to a couple of
> weeks**, not minutes. **A number cannot send until the campaign it is
> attached to has cleared.**
>
> **So "I will turn it on when I launch" does not work if launch day is the
> day he starts.** The registration has to be **started before the day he
> wants to send**, or launch day is spent waiting on somebody else's queue.
>
> **UNCONFIRMED: the exact review time.** It was not verified against
> Telnyx's own documentation on the night this was written. **Whoever picks
> this up should check it rather than quote this page** — the shape of the
> warning holds either way, but the number in it is second-hand.

**REVISIT CLOSER TO DECEMBER** — Andrew's own instruction and his own
timeframe. At that point the order is: **verify the phone code, start the
campaign, wait for it to clear, then buy the number and attach it.**

> ### AND TEXTING IS PARKED BY ANDREW'S OWN DECISION
>
> **He wants to settle what the messages actually say before anything is
> built.** That is the reason it is stopped — not the money, not the
> registration, not any technical blocker. **The wording comes first.**
>
> **The design for it is in `TEXTING.md`, which is the other session's lane.**
> Do not build from this file; that one is where the thinking lives.

**No reminder exists and none is wanted.** Andrew was explicit that the
December revisit lives **in this file and nowhere else**. Nothing is scheduled
and nothing will chase him about it — **this line is the whole mechanism.**
Do not helpfully add a reminder, a calendar entry or a check that nags.

**Do not create the API key now.** It is free and it would work — but a key
sitting unused for three months is a liability with no benefit, and it takes
one minute later.

### The order it unblocks in, whenever he decides to launch

**Step 1 is DONE. The next step is the first one that costs money.**

1. ~~**Verify the phone**~~ — **done.** The brand is **VERIFIED**.
2. **Submit the campaign** — the form is already filled in and parked at the
   payment step. **$15, then $2/month.**
3. **Buy a number** — about $1/month.
4. **Mint `TELNYX_API_KEY`** and add it to the Supabase secrets.
5. **Build the send path and point the messaging profile's webhook at it** —
   the webhook stays empty until this exists.

**Steps 2 onward are the paid ones and are the part he has deferred. Step 1
is free and is the gate.**

**A messaging profile called `DetailingPlatform` already exists and is
switched on**, with **zero numbers** attached and **no webhook**.

> **The webhook stays empty on purpose.** There is nothing to point it at
> until a receiving function exists. Do not fill it in to tidy it up.

## 5. Google Business Profile API — one gate passed, one not started

| | |
|---|---|
| Access request | **submitted 21 Sep 2026** |
| Case | **`9-7552000041929`** — 7–10 business days |
| Filed from | `andrewswashing@gmail.com` |
| Google Cloud project number | **`37262651400`** |
| Quota now | **0 requests/minute — so NOT approved** |
| How approval is detected | **the quota goes to 300.** No email needed |

> **THE SECOND GATE HAS NOT BEEN STARTED BY ANYBODY: the OAuth consent-screen
> verification for the sensitive `business.manage` scope.** The access request
> above does not cover it. `docs/google-business-profile-research-2026-09-07.md`
> identified it correctly and is right about it; that page's *other* premise —
> that everything waits on a mailbox — **has expired**, because
> `andrew@detailingplatform.com` exists.

## 6. Email — split decided, half of it blocked

**Today, Resend sends everything, and its free limit is already being
exceeded** — "100% of your daily" and "200% of your daily" warnings sit in the
business inbox dated 6 and 7 September.

**The decision:** **ZeptoMail** for the 17 transactional emails at $2.50 per
10,000 with no monthly fee, **Resend's free tier kept for campaigns** —
because **ZeptoMail bans marketing mail outright and will cut the account
off for it.** Splitting also means a spam-flagged campaign cannot drag booking
confirmations down with it.

**BLOCKED, and not at our end.** Zoho refuses to add `detailingplatform.com`
*or* `email.detailingplatform.com`, answering only *"Domain could not be
added. Please contact support@zeptomail.com"* — while `andrewsdetail.com`
adds fine **on the same account**, so it is that domain rather than the
account or the plan. **Support has been emailed. There is no API token until
a domain verifies**, so nothing can be built against it.

## 7. The domain is unrated, which is why some networks block it

Symantec confirmed `detailingplatform.com` is **unrated** in those words —
which is what gets a site blocked on school and office networks.

- **Symantec** — categorisation request **submitted**, as *Business/Economy* +
  *Office/Business Applications*
- **FortiGuard** and **Palo Alto** — forms filled in, **waiting on Andrew**,
  because both end in a human check he has to clear himself

## 8. There is a daily automated check. Do not rebuild it.

**A scheduled job runs at 09:00 Pacific every day** and reads the
`andrewswashing@gmail.com` inbox for:

- the Google case `9-7552000041929`
- the Zoho/ZeptoMail support reply
- the Symantec / FortiGuard / Palo Alto categorisation replies
- anything from Telnyx

**Confirmed 2026-09-22 by reading the sent folder rather than trusting a
note: the Gmail connector really is on `andrewswashing@gmail.com`.**

**So nobody needs to watch those inboxes by hand, and nobody should build a
second watcher.**

## 9. Decided, not built

**These are commitments, not ideas.** They are on `ROADMAP.md` so they cannot
evaporate as intentions.

- **Move photo storage to R2**, with the allowance going to 10 GB **in the
  same change** — `docs/the-photo-allowance.md`
- **The SMS send path and the Telnyx webhook** — nothing exists yet, and the
  webhook field stays empty until it does
- **The 10DLC campaign registration** — blocked on the six-digit code
- **The OAuth consent-screen verification** for `business.manage`
