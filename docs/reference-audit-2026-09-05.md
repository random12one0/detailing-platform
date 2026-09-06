# What the conversion dropped — an audit of `reference/`

**Roadmap 4.1, 2026-09-05.** The old single-business site, read file by file
against the platform, to find anything lost that nobody had written down.

**The method, so the next person can trust or repeat it.** Every one of the
old site's fourteen edge functions, twenty-six migrations and public sections
was matched against the platform by NAME and then by BEHAVIOUR — a matching
name proves nothing, which is how the campaign tables survived the conversion
as three empty tables and were counted as kept. Every claim below names the
file that was read.

**The headline: one real gap that was on no list, and it is not a feature.**
Everything else the conversion dropped was already on roadmap 4.2, and a
surprising amount that *looks* dropped was kept.

---

## A. Dropped, on no list, and it should block launch

### A1. There is no way to reset — or even change — a password

**`resetPasswordForEmail` appears nowhere in `app/src`. Neither does
`updateUser`. There is no `/reset-password` route.**

So today:

- A detailer who forgets their password **cannot ask for a reset link**.
- A detailer who wants to **change** their password — after sharing it, after
  a staff member leaves — has no screen to do it on.
- If somebody triggered a Supabase recovery email by hand, the link would land
  on the catch-all route. `detectSessionInUrl` defaults to on, so they would be
  **signed in and still unable to set a new password**, which is the confusing
  version of broken rather than the obvious one.

**The old site had half of it and that half is the part this platform is
missing the other of.** `reference/frontend/src/pages/ResetPasswordPage.jsx` is
a complete landing page: it parses the tokens out of the URL fragment, sets the
session and takes a new password. What the old site never had was a way to
*request* one — `AdminLogin.jsx` has no "forgot password" link and nothing in
that repo calls `resetPasswordForEmail`. Andrew was the only user and could ask
somebody to do it in the Supabase dashboard.

**That excuse does not survive multi-tenancy.** The moment there is a second
detailer, "email the developer" is the support channel, at whatever hour they
lock themselves out. And roadmap 4.4's platform admin — the screen that would
let the owner do it for them — is the last item in Phase 4.

**Recommended: build both halves, and they are small.** A *Forgot your
password?* link on `Auth.jsx` calling `resetPasswordForEmail`, a
`/reset-password` route lifted from the old page, and a *Change password* row
on the gear's **This device**… no — on its own, because it is about the
ACCOUNT and not the device. **It is one screen and two calls.** Written up as a
proposed roadmap item rather than built here, because it is an auth surface and
the owner should know it is being added.

---

## B. Dropped, and already on roadmap 4.2

All four of 4.2's named items are confirmed genuinely absent, with the file
that proves it. **One of them is smaller than it sounds and one is bigger.**

### B1. Google Calendar sync — genuinely a whole function
`reference/supabase/functions/create-calendar-event/index.ts` signs a JWT for a
Google service account and writes the booking into a shared calendar;
`create-booking` calls it at line 991. Needs `GOOGLE_SERVICE_ACCOUNT_JSON` and
`GOOGLE_CALENDAR_ID`. **Per-tenant this is the awkward one** — every detailer
would have to grant access to their own calendar, which is an OAuth flow rather
than a service account, so the old implementation is a reference and not a
port.

### B2. The vCard on the owner's email — SMALLER than it sounds
`reference/.../create-booking/index.ts:947-977` builds a vCard and attaches it
to the OWNER's new-booking email, so the customer lands in his phone's contacts
in one tap. **The platform already builds vCards** —
`app/src/lib/platform.js:93` — it simply never attaches one to an email, and
`sendTenantEmail` already takes `attachments`. **This is an hour's work, not a
feature**, and it is the single most-used thing in that list for a trade run
off a phone.

### B3. Owner test-booking preview — a token, not a screen
`create-booking` accepted a token that made it send every email and **persist
nothing** (`isOwnerTest`, line 965), so the owner could see exactly what a
customer receives without a fake row in the calendar. Absent from the
platform's `create-booking`. **Worth more now than it was then**: a new
detailer's first question is "what does my customer actually get", and today
the only answer is to make a real booking and delete it.

### B4. Referral / loyalty — columns, and one of them is already known dead
`reference/supabase/migrations/20260226_referral_loyalty.sql` adds
`customers.completed_washes_count`, `customers.referral_code`,
`customers.referred_by` and `bookings.referral_code_used`. **The platform has
`completed_washes_count` and roadmap 2.11 stage 5 already found it dead** — so
this is a third of a feature carried over with no writer. Either build it or
drop the column; a column nothing maintains is what this repo flags everywhere
else.

### B5. Campaign links — already corrected into 4.2 by the 3.1 contract
`track-visit`, `campaigns` and `campaign_visits` exist in the platform and
nothing calls them. On the old site they are live end to end:
`App.js:29/54` calls `trackVisit()` on every page load, `lib/campaign.js`
stores the campaign and auto-applies its promo code, `pages/CampaignLink.jsx`
is the `/:slug` landing route, and `MoreScreen.jsx:82` is the **Campaign
Links** screen that reads them back. Contract §6g has the full account.

---

## C. Looks dropped, and is not — checked so nobody re-audits it

Every row here was read in both codebases. **This list is the point of doing
the audit properly**: each of these would otherwise be "found missing" by a
future session and rebuilt.

| The old site had | Where it is in the platform |
|---|---|
| **The review-request / thank-you email** (`_shared/followupEmail.ts`) | `emailTemplates.ts:586` `followupEmail`, sent by `send-invoice:162` behind `settings.email_customer_followup`, with the tenant's own Google and Yelp links instead of Andrew's hardcoded ones |
| **Tips and upsells at payment time** (`booking_line_items`, `lib/lineItems.js`) | `booking_line_items` exists with a `tip` category; written by `FinalizeModal.jsx:67`, read by `Money.jsx:159` and `send-invoice` |
| **Canned SMS to the customer** (`lib/messages.js`) | `BookingDetail.jsx:157` builds an `sms:` link with the message pre-filled, plus a *Write my own*; `Clients.jsx:187` does the group version |
| **The vCard itself** | `app/src/lib/platform.js:93` `buildVCard` / `saveContact`. Only the EMAIL ATTACHMENT is missing — see B2 |
| **Hours overrides** (`booking_hours_overrides`) | Same table name, read by `available-slots:159` and `slotValidation.ts:240` |
| **The owner wrap-up nudge** | `bookings.owner_wrapup_nudge_sent_at` and `get_bookings_due_for_wrapup_nudge`, driven by `send-owner-reminders:154` |
| **Rounding the total to $5** (`roundToNearest5`) | `pricing.ts:56` `roundToNearest(value, nearest)`, per-tenant via `business_settings.price_rounding_nearest`, with 0 meaning no rounding — a superset |
| **The discount ORDER** (site sale → plan → promo → round) | Preserved in `computeQuote`, with plan and price rules now riding `price_adjustments` |
| **Finalize payment** (`final_amount`, `payment_status`, `finalized_at`, `payment_notes`) | All four columns exist (`20260827000200_tenant_data.sql:256`) and `FinalizeModal.jsx` writes them |
| **`business_info` (the CMS singleton)** | Split into `businesses` + `business_branding` + `business_settings`, which is what multi-tenancy required. Every field is accounted for; `social_yelp`/`social_google` were the two that ended up duplicated, and roadmap 3.2(b) dropped the dead copies |
| **`packages` + `add_ons` with `features` / `notes`** | `services` and `add_ons`, both with `features` and `notes`, both on the public profile |
| **FAQ** | Roadmap 3.2(b) — stored, exposed and editable |
| **Push notifications** | `owner-push-subscribe` / `-unsubscribe` / `sw.js`, confirmed working on a real device 2026-09-02 |
| **The booking receipt page** (`pages/BookingReceipt.jsx`) | `book/ManageBookingPage.jsx`, which also reschedules and cancels |
| **Blockouts and drop-off-only periods** | Same two tables, driving `available-slots` |
| **`.ics` calendar attachment** | `booking-ics` edge function |

**And the whole of `reference/frontend/src/admin/`** — the old dashboard — is
deliberately not compared. The owner's instruction, 2026-08-31: *"forget that
the old dashboard even existed."* Its FEATURES were inventoried in
`dashboard-feature-inventory-2026-08-31.md`; its structure is not a reference
for anything.

---

## D. Old marketing-page sections — Phase 3's business, not a gap

`reference/frontend/src/components/sections/` holds the old home page:
`Hero`, `Services`, `ServiceOptions`, `Gallery`, `Reviews`, `FAQ`,
`MeetTheOwner`, `TrustBar`, `WhyChooseDetail`, `YouTubeVideos`,
`DiscountBanner`, `CampaignBanner`, `BookCTA`, `StickyBookNow`, `Footer`.

**These are not platform features and must not be turned into any.** Every one
is content a tenant site draws from the profile, and the tenant-site contract
already enumerates which. Two notes worth carrying into a client build:

- **`MeetTheOwner`** is `business_branding.about_copy` plus a photo. Covered.
- **`YouTubeVideos` is hardcoded to Andrew's own playlist** and there is no
  column for it. Research §3 did not find video sections on the six real
  detailer sites either, so this is **his** feature rather than the trade's —
  worth a column only if a client asks. Recorded so nobody treats it as a
  missing platform feature.

---

## E. What this audit changes

1. **A2 does not exist — password reset is the only genuine new find**, which
   is itself the most useful result: the conversion was more complete than the
   roadmap's "beyond the known list" wording assumed.
2. **Roadmap 4.2's list is confirmed correct and gains sizing**: B2 (the vCard
   attachment) is an hour and should be done first; B1 (Google Calendar) is the
   one that needs a design decision about OAuth per tenant, not a port.
3. **`customers.completed_washes_count` needs a decision** — build the loyalty
   half that writes it, or drop the column.
4. **Nothing in section C should ever be re-audited.** That is what this file
   is for.
