# What the cloud coworker came back with — 2026-09-08

**The reply to `docs/owner-setup-prompt.md`, captured here because it arrived in
a chat and a chat does not survive a `/clear`.** Every value, every correction
and every decision below is his coworker's, working in a browser with Andrew at
the keyboard. **Where it contradicts a file in this repo, it wins** — it was
measured in the actual dashboard, and the file was written from documentation.

**Read § 3 first if you are about to build anything.** Nine of the beliefs this
repo was operating on turned out to be wrong, and four of them would have sent
somebody to do work that is already done or is not needed.

---

## 1. The values, so nobody has to ask twice

| | |
|---|---|
| Google Cloud project | `detailing-platform`, number **37262651400** |
| Platform mailboxes | **andrew@** and **support@detailingplatform.com** — they already existed |
| DNS | **NS1** (`dns1/2/3/4.p07.nsone.net`) — **not Cloudflare, not Netlify, not the registrar** |
| Mail exchanger | **iCloud Mail** (`mx01/mx02.mail.icloud.com`) |
| Netlify site id | `12ee8817-34bc-4791-b68d-85c920739052`, plan `nf_team_dev` |
| Supabase org | `nhuisxnuvahjoefsrqbj`, **Free plan** |
| Stripe account | **`acct_1UCMm0JeoZO7o6Ee`** — *"Detailing platform sandbox"*, test mode |
| Backup repo | `random12one0/detailing-platform-backups`, **private, confirmed** |
| GBP support case | **6-3052000042070** |

**Supabase usage, measured:** database **33.37 MB** of 500 MB · **storage 0 GB**
· egress 0.887 GB · 31,273 edge invocations · 126 monthly active users.

**Still not done, and each needs an account created, which only he can do:**
Cloudflare R2, Sentry, the Places key, and the `ca_…` Connect client id.

---

## 2. What is switched on

- **Google sign-in: ON.** Client id begins `37262651400-iusgr84…`, which matches
  the project number. Scopes `openid`, `userinfo.email`, `userinfo.profile` —
  **0 sensitive, 0 restricted**, so sign-in itself needs no Google review.
- **Stripe Connect: ALREADY ENABLED in test mode**, with a Standard account
  present — `acct_1UCMp1JeoZ7g84se`, `type: "standard"`,
  `controller.fees.payer: "account"`, full dashboard. **That is exactly the
  design roadmap 2.20 stage 3 decided on**, confirmed from the account rather
  than from the docs.
- **Resend:** `andrewsdetail.com` (his live business) and
  **`email.detailingplatform.com`** both verified and sending, region
  `us-east-1`, receiving disabled.
- **Netlify:** deploy `6a9df606…` green, primary URL `https://detailingplatform.com`.
  Root page renders correctly, founding offer reads *3 of 3 left* with the
  struck prices.

### The one blocker on Google, and it is not code

The Audience page returns *"Your app's OAuth configuration is incomplete…
visit the Branding page"*. That greys out **Publish app** AND **silently
refuses to save test users** — two were added, Save pressed, and the list was
empty again after a reload. **Every required Branding field is filled; the only
empty ones are the privacy policy URL and the terms of service URL.**

    https://detailingplatform.com/privacy
    https://detailingplatform.com/terms

**Nobody can complete a Google sign-in until those two are pasted in** — not
even Andrew. **Do not debug the app.** Nothing in it is wrong.

---

## 3. WHERE THIS REPO WAS WRONG — nine corrections

**This is the section that changes what gets built.**

1. **Job 1 was already done, and running it again created a SECOND Google Cloud
   project.** `detailing-platform-508003` was made by a Create click and Andrew
   deleted it. A prompt that says "set up Google sign-in" costs him a cleanup.

2. **Job 2 was already done.** Both mailboxes existed before the session.

3. **DNS IS ON NS1.** The prompt said *"if the domain sits on Cloudflare, Job 3
   puts him on Cloudflare anyway"* — it does not. **Moving DNS to Cloudflare
   would be a real migration with the iCloud MX records at risk**, which is a
   very different job from creating a bucket.

4. **THE R2 PREMISE IS WRONG AND IT CHANGES THE PRIORITY.** This repo says job
   photos *"share one 1 GB pot"* and implies it is filling. **Measured storage
   used is 0 GB — nothing is stored at all.** R2 is still worth doing for the
   10 GB tier and free egress, but **it is not urgent, and calling it "the
   single biggest not-built-yet feature" on capacity grounds is not supported
   by the numbers.**

5. **`docs/ops/backups.md` CONTRADICTS WHAT WAS BUILT.** The doc specifies a
   symmetric `BACKUP_PASSPHRASE`; **what exists is an `age` KEYPAIR** — the
   workflow holds only the PUBLIC key, committed in the clear as
   `backup-key.pub`, so **CI can encrypt and cannot decrypt** and a leaked repo
   or leaked GitHub secret yields unreadable files. The private key is in
   Andrew's password manager and the round trip was tested. Backups are
   published as **release assets, never committed to the tree**, because git
   cannot forget a committed file and these dumps are real customer PII.
   Retention 30 days plus the 1st of each month. **Fix or delete that doc, or
   the next session rebuilds the weaker design and he ends up with two backup
   repos.**

6. **Connect did not need enabling.** See § 2.

7. **Google quotes 7–10 business days, not the "within 14" in the research** —
   and **the API access form has been REPLACED.** The old
   `support.google.com/business/contact/api_default` form now links to a
   multi-step workflow at `/business/workflow/16726127`. **There is no
   free-text contact email field any more and no separate Submit button:
   pressing Continue on the project-details step IS the submission.**

8. **The Stripe webhook has SIX events configured, not the five this repo
   lists.** `invoice.payment_succeeded` is present and undocumented. Harmless —
   `stripe-webhook` already handles it beside `invoice.paid` — but every doc
   naming five is short by one.

9. **Resend's sending domain is `email.detailingplatform.com`, a SUBDOMAIN.**
   Strictly, the root domain is *not* a verified sender. Good practice, not a
   fault — but any code or doc assuming the root domain sends is wrong.

### And a tenth, which is the one that needs a human to look

**THE 100-A-DAY RESEND CAP MAY NOT EXIST.** On 7 September the account sent
**200 emails in one day** and on 6 September **110**, all delivered, none
failed. **Both exceed the free plan's 100/day that this product's counter is
built against** — the back-office health line prints *"Emails: N of 100 today"*
and reddens at 80. So either the account is not on the free plan, or that cap
no longer works the way every file here assumes, **and the counter may be
measuring against a limit that does not exist.** The API surface available to
the coworker exposes domains and metrics but not the billing plan.
**Somebody has to open `resend.com/settings/billing` and read the plan.**

---

## 4. Waiting on somebody else

**Google Business Profile API access — application ONE of two.**

- Submitted **8 September 2026**, case **6-3052000042070**, 7–10 business days.
- **Filed from `andrewswashing@gmail.com`**, because that account holds the
  verified *Andrew's Auto Detail & Car Wash* listing. `ramdom12one0@gmail.com`
  manages **zero** Business Profiles and would have failed the check.
  **He must watch that Gmail inbox** — the form has no contact-email field and
  uses the signed-in account.
- APIs enabled: My Business Account Management, My Business Business
  Information. **Quota reads 0 until the allowlist lands; a non-zero quota is
  how you detect approval without waiting for email.**
- **The use case submitted, verbatim:** *"We are building a booking and website
  platform for independent auto detailing businesses. Each detailer connects
  their own Google Business Profile so that photos they upload and opening
  hours they change in our dashboard stay in sync with Google. We need read and
  write access to business information and media, one profile per customer, at
  low request volume."*
- **UNRESOLVED RISK, not acted on:** the application was filed by
  `andrewswashing@gmail.com` while project 37262651400 is owned by
  `ramdom12one0@gmail.com`. If Google asks the applicant to prove control of
  the project, add that address as an Owner under IAM & Admin.

**Application TWO** — OAuth verification for the sensitive `business.manage`
scope — **is not submitted and is correctly sequenced to wait.**

---

## 5. Decisions he made, so nobody re-asks

- **Backups:** private GitHub repo, **not** Supabase Pro. He declined the
  $25/month explicitly, and accepted the switch to asymmetric encryption once
  the reasoning was explained.
- **Resend:** staying on the current plan. The upgrade happens *"when a real
  detailer gets close"*, not before.
- **Stripe business address: off the list permanently, not deferred.** It needs
  personal details he cannot submit yet. The no-tax fallback stands and cannot
  under-collect.
- **Referral rewards: skipped entirely** until there are detailers who could
  refer each other.
- **Migrating his own business onto the platform: PARKED, and the INTENT is
  corrected.** It is a **COPY for dogfooding, NOT a cutover** — his existing
  detailing business keeps running and keeps taking real money throughout. **He
  has deliberately not shared the old project's `service_role` key. Do not ask
  for it.**
- **Legal pages:** he accepted **dropping the postal address entirely** (email
  only) rather than publishing a home address.

### Still unanswered, and all three are one-liners

1. **`ENTITY` in `app/src/landing/legal.js`** currently reads *"Andrew Dietrich,
   doing business as Detailing Platform"* and **is a guess at his paperwork.**
   A sole trader, a DBA and an LLC are three different legal persons, and this
   is printed on the public terms.
2. **A detailer's email address on their public site behind a switch, off by
   default?** Recommended yes — published addresses get harvested, phone
   numbers largely do not.
3. **Should the price editor keep WARNING on a broken price ladder rather than
   blocking the save?** Recommended keep warning, consistent with *warn, never
   hard-block* in DECISIONS.md.

---

## 6. December, researched

**EIN — IRS, online, FREE, issued IMMEDIATELY** at the end of the session; you
print the confirmation letter on the spot. **Must be completed in one sitting,
cannot be saved.** Tool hours (Eastern): Mon–Fri 6am–1am, Sat 6am–9pm, Sun
6pm–midnight. Needs the responsible party's SSN or ITIN and a US principal
place of business. IRS warns: *"You never have to pay a fee for an EIN."*
Nothing has changed since September.

**Lakewood CA business licence** — apply online at `lakewood.hdlgov.com`, or in
person at City Hall's Administrative Services counter near the Clark Avenue
entrance.
- **FEE IS NOT PUBLISHED.** *"Payment is not collected when you apply. You will
  be notified of the amount due once your application is approved."* So the
  cost cannot be known in advance, and neither can the processing time.
- **CORRECTION: the page does NOT say you must phone first.** That number is
  offered as assistance, not a required step —
  562-866-9771 ext. 2622, BusinessLicensing@Lakewoodca.gov.
- **The one genuinely unresolved December item:** the page says nothing about a
  home-occupation permit for a home-based online software business. That needs
  the phone call.

**Stripe activation** — *"verify your business"* at
`dashboard.stripe.com/account/onboarding`. KYC: business name and website,
support email, phone and address, support site URL, statement descriptor,
identity details for the responsible party, and a bank account. **Two things
worth knowing now:**
- **The business origin country CANNOT be changed after activation.** Getting
  it wrong means a whole new account.
- **The support ADDRESS is required and is shown publicly** on card statements
  and receipts. **That is the same wall as the Stripe Tax origin address, and
  it does not go away in December just because the date arrives** — he needs an
  address he is willing to publish.
Stripe does not publish a verification duration.

**Business bank account — TREAT AS UNRESEARCHED.** Only a shallow pass was
done and no individual bank's current requirements were verified. The general
pattern for a sole proprietor is EIN + SSN + government ID, plus a DBA filing
where the account is in a trading name. Needs a proper pass before December.

---

## 7. What this leaves for a session in this repo

Nothing in § 3 is a code change on its own. What it changes:

- **Do not build R2 as an urgency.** Correction 4.
- **Fix `docs/ops/backups.md` before anybody reads it.** Correction 5.
- **Somebody must read Resend's actual plan** before trusting the emails-today
  counter. § 3's tenth.
- **The `ca_…` client id and the connected-account webhook setting** are what
  roadmap 2.20 stage 3 still needs from the dashboard.
- **Do not re-raise** anything in § 5.
