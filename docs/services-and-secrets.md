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

> **`TELNYX_API_KEY` DOES NOT EXIST YET.** It was described as an empty named
> box waiting to be filled. **It is not in the list** — checked by name on
> 2026-09-22. When one is needed it is minted at **Telnyx → API Keys** and
> added under that name.

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

## 4. Telnyx — texting. Account paid, brand submitted, nothing can send yet

**State as of the night of 2026-09-21:**

| | |
|---|---|
| Account | **PAID** (went Pretrial → Trial by connecting GitHub) |
| 10DLC brand | **"Andrew's Auto Detail & Car Wash", SUBMITTED** |
| Brand id | `4b2001a0-c7e7-ede3-76fa-a67ec4841df8` |
| TCR id | `BMKZFBT` |
| Registered | 21 Sep 2026 |
| Status | **Pending verification** |
| Type | **Sole Proprietor — no EIN and no SSN needed** |
| Paid | **$4** |
| Blocking step | **a six-digit code was texted to Andrew's mobile. Until that clears, no campaign can exist** |

**Costs after that:** campaign review **$15**, then **$2/month**; a phone
number is about **$1/month**. That buys roughly a thousand texts a day.

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
