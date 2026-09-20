# For Andrew — the things only you can do

**This is your list. Nothing on it can be done by a session.** It is accounts to
open, money to spend, names to decide, and keys to paste. Everything else in
this repo is somebody else's job.

**How it works.** When a session hits something it cannot do, it adds a row here
and *keeps going* — it does not stop and wait. So this file grows on its own,
and checking it is how you unblock work that is already built and waiting.

**Two kinds of row.** A **DO** is an action. A **DECIDE** is a question with a
recommendation attached — answer it in one line and a session picks it up.

Updated 2026-09-18.

---

## Waiting on you now

- [ ] **DO · Turn on Resend's delivery reports (about three minutes).**
  *(ROADMAP 14.3)*
  The product now keeps a record of every email it sends and shows it on the
  client's record — who it went to, and whether it arrived. The "it arrived"
  half comes from Resend telling us, and Resend only tells us if you point it
  at us, and as of 2026-09-17 **it has never been pointed at us**.
  1. In Resend, go to **Webhooks** and add an endpoint.
  2. The address is the line printed below. It is the only one; there is no
     second "real" project to do this on as well.
  3. Tick the events **delivered**, **bounced**, **complained** and **failed**.
     The others are ignored on purpose.
  4. Resend then shows you a **signing secret** starting `whsec_`. **There is
     already one set**, from when this was built and proved — so if Resend
     shows you a DIFFERENT one, it has to replace the stored one or every
     report will be refused as a forgery. Paste it into the Supabase project's
     function settings as `RESEND_WEBHOOK_SECRET`. **Do not paste it into a
     chat, a document or this file** — it is the only thing that stops a
     stranger posting fake "this address bounced" reports about your customers.
     If Resend lets you reuse the existing endpoint's secret, nothing needs
     pasting at all; tell a session and it can prove which case you are in.
  Until that is done nothing breaks: every email still leaves a row saying it
  went out. The rows simply stay at *"On its way"* instead of turning into
  *"Delivered"*.

  **Andrew sent the address on 2026-09-17 and IT IS THE RIGHT ONE. The only
  thing still missing is the three minutes in Resend.**

      https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/resend-webhook

  A session first told him this was only the "practice" address and that the
  real business needed a different one. **That was wrong and it is corrected
  here rather than quietly edited out**, because the mistake is the sort that
  sends somebody to configure the wrong thing. There is ONE project behind this
  product, and the live site runs on it: the bundle served by
  `detailingplatform.com` today was fetched and it talks to
  `kguqylyzgyzfktkfnhjb`. The other project in `CLAUDE.md`'s hard rule,
  `adtlnvihwrcqcasqcjwd`, is Andrew's **old, separate** business site
  (andrewsdetail.com, 22 tables). It does not run this product, so there is
  nothing about email tracking to install there and never was. It stays
  read-only for the reason `CLAUDE.md` gives: it takes real money today.

  **Two of the three pieces are already done, checked rather than assumed on
  2026-09-17.** The part that receives the reports is installed on the project
  (v9, one of 39), and the signing secret is set there (one of 22).

  **The third is not done, and there is a measurement rather than a guess.**
  Resend publishes an address, `delivered@resend.dev`, that always accepts mail
  instantly. **Eighteen** emails have gone to it from this product. Only
  **eight** ever turned into *"Delivered"* — and those eight are the ones a test
  reported on by hand. The other **nine are still sitting at "On its way", the
  oldest for 74 minutes.** If Resend were calling us, all eighteen would have
  flipped within seconds. So the endpoint has never been added in Resend's own
  dashboard, which is steps 1-3 above.

  **RE-MEASURED 2026-09-18, doing ROADMAP 5.3, and it is still not done.**
  The practice database was rebuilt since the last count, so the old numbers
  are gone and these are fresh: **every single email this product has sent to
  Resend’s own always-accepts test address is still sitting at “On its way”.**
  Not one has ever turned into “Delivered”. If the endpoint were added, they
  would all flip within seconds. The receipt work finished today puts the
  emails for a job right on the job’s own screen — what was sent, when, and to
  whom — and the one column that stays blank is whether it arrived. **Your
  three minutes in Resend is the only thing missing.**

  **Nothing is broken while it waits** — every email still leaves a row saying
  it went out. The rows just never learn what happened to them, which is the
  half 14.3 was built for.

- [ ] **DECIDE · Test accounts: flag them, or delete them?** *(ROADMAP 0.3)*
  The back office lists 16 detailers and 15 are fakes, plus rows like "Smoke
  TPMOY" in the client list. **Recommendation: flag, don't delete.** About 60
  automated checks work by signing into a seeded fake business and clicking
  through it. Delete the fakes and roughly 60 checks stop being able to run —
  and a check that cannot run prints something that looks very like a pass. You
  would lose the safety net for all 79 roadmap items in exchange for a tidier
  screen. Flagging gets you the same clean screens and keeps the net.
  **Answer needed: "flag" or "delete".**

- [ ] **DECIDE · `/ex5` is called "Tampa Bay Auto Detail".** *(ROADMAP 1.2)*
  It is a public example site using what is probably a real firm's name and
  email domain. The XPEL half is already fixed. **Recommendation: invent a name
  and a domain** — the page demonstrates exactly the same thing and the question
  disappears. Costs nothing. **Answer needed: "rename" or "leave it".**

- [ ] **DECIDE · `andrewsdetail.com` is on the public marketing page.**
  `LandingPage.jsx:631` shows your real business domain in a mock browser bar as
  the example. Two other mentions in `AdminPage.jsx` are operational notes that
  are true and useful, and should stay. **Recommendation: swap the landing-page
  one for an invented domain.** **Answer needed: "swap" or "leave it".**

---

## Scheduled — not blocked, just not yet

- [ ] **DO · Open the Stripe account. December 2026, your 18th birthday.**
  Yours, not a parent's — confirmed 2026-09-16. Target: live about three months
  from now.
  **Nothing is waiting on this.** Every Stripe path in the product — checkout,
  webhooks, subscription renewal, failed-payment retry, Connect onboarding —
  can be built and proved in **test mode** today, and that work is not blocked.
  Each detailer connects **their own** Stripe account, so their age is their own
  affair and none of it depends on yours.
  **When you do it, what we will need from you:** the publishable key, the
  secret key, and two webhook signing secrets (one for platform billing, one for
  connected accounts). Paste them into `.env` — never into chat.

- [ ] **DO · Sign up for text messaging, and register the number.** *(ROADMAP 3.3)*
  **Telnyx, at $0.0040 a message** — about half of Twilio's real cost once
  carrier surcharges land. One platform number for everybody, not one per
  detailer, which is what you asked for and is much cheaper and simpler.
  At a few hundred reminders a month this is **under $5/month**.
  **The slow part is US A2P 10DLC registration** — a one-time carrier
  registration that can take days to weeks. One registration, one number, one
  brand. **Start it before you need it.**
  **When you do it, what we will need:** the Telnyx API key and the phone
  number. `.env`, not chat.

- [ ] **DO · Decide a business name and set up the entity.**
  Right now your terms and privacy pages are a contract with you personally,
  rather than with a company. This matters more than a lawyer does — and you
  already ruled that we edit lawyer-written templates rather than hire one, so
  the wording work is ours. **The name and the entity are yours.**

- [ ] **DO · The paid email plan — around December 2026, not before.** *(ROADMAP 3.2)*
  Roughly $60. **The audits were wrong about this being urgent**: they assumed a
  hard daily wall, and you have sent 100+ in a day with no failure. Revisit when
  there are real customers.

- [ ] **DO · Netlify build credits, if publishing matters.**
  Credits ran out once and the state has flipped twice without anybody noticing.
  A production deploy costs 15 credits; **a deploy preview costs zero and is a
  real link you can open on your phone**, so most work needs no credits at all.

- [ ] **DECIDE · The job record's action bar looks different on a phone's
  slide-up panel, and that was my call rather than yours.** *(FOUND.md, the
  pinned-bar entry)*
  On the job page and at a desk, the box holding Call / Text / Navigate is now
  a rounded card lined up with the cards under it — the thing you asked for on
  2026-09-18. **On a phone, when you tap a job out of a list, the same box is
  still a full-width band with square corners.** I left it that way on purpose:
  there it runs wall to wall across the panel's own top edge, and a rounded
  corner cut out of a wall looks like a mistake.
  **To see it:** open Money on your phone, tap any job under *Waiting on
  payment*, and look at the top of the panel that slides up.
  **My recommendation: leave it.** It reads as that panel's own header rather
  than as a box sitting in it. Say the word and I'll round it to match the
  other two — it is a two-line change and the check already measures it.
  *Not blocking anything. Answer whenever you next look at a phone.*

---

## Done

- [x] **Stripe ownership decided — 2026-09-16.** You, not a parent. December.
- [x] **No lawyer for the legal pages — 2026-09-16.** *"If you could find the
  templates, then just edit them."* Accepted; the rewrite is ours.
- [x] **Texting is one platform number, not one per detailer — 2026-09-16.**
- [x] **The demo account's dual access is deliberate — 2026-09-16.** You set it
  up that way on purpose. **It must not be "fixed".** It comes out before the
  first real detailer signs up, and it is tracked as ROADMAP 12.4 — not before.
