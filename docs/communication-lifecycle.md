# Every message this product sends — who, why, when, how — and what changes

ROADMAP **3.4b**, written 2026-10-10 against commit `49d85d67`. This is the
INVENTORY and the DECISIONS. Building any change is 3.4f; rendering and test
sends are 3.4g; how a detailer learns an email failed is already designed in
`docs/email-failure-recovery.md` (3.4e) and is not repeated here.

Andrew, 2026-10-09 (3.4): *"I actually want to spend like a good amount of time
going over all the emails and texts that get sent out that we're planning on
sending out because I feel like right now it's kind of all maybe not really
thought through the best."* This page is that pass. It finds **no message to
remove and none to merge**, and says why (§ 4, "What was considered"); it finds
one new text, one switch that eight of the twelve alerts ignore, and a list of
things that wait on texting being switched on.

**Held against the product by `node scripts/communication-lifecycle.mjs`**
(credential-free, no network). The POPULATION is read from the code — every
`*Email` template `emailTemplates.ts` exports, every push title, every function
that calls the mail or push helpers, every built-in text — and the page is asked
to name each one. Read the script's header for what it cannot see.

---

## 1. The channels

| Channel | What it is | Who it reaches | Does it leave a record? |
|---|---|---|---|
| **Email** | One relay, `send-email`, to Resend. Every attempt writes a row in `email_sends`. | Customers, the detailer, and Andrew | Yes — and Resend's webhook updates the row later |
| **Push** | A web notification to a phone or computer the detailer turned alerts on for (`owner_push_subscriptions`) | The detailer only | No |
| **Text, sent by the detailer** | The Text button on a job opens the detailer's OWN messaging app with the words filled in (`sms:` link, from the saved texts in `message_templates`) | A customer | No — it leaves from their phone and we never see it |
| **Text, sent by us** | **Does not exist.** Approved in principle 2026-10-09, parked behind carrier registration. See `TEXTING.md` and § 5. | — | — |
| **Supabase's own sign-in mail** | Password reset and, if switched on in the dashboard, sign-up confirmation. Sent by Supabase, in its wording, not by our code. | A person signing in | Not in our table |

## 2. The matrix — email

**Audience** is who receives it. **Timing** is when, in the product's own
terms. **Switch** is the detailer setting that stops it (Notifications screen);
*none* means no setting does, on purpose — § 6 says why. **Decision** is one of
KEEP, ADD, CHANGE, MERGE, REMOVE, DEFER, and the long ones are in § 4.

### Customer email

| ID | Message | Sent by | Audience | Trigger | Timing | Channel | Switch | Decision |
|---|---|---|---|---|---|---|---|---|
| **C1** | Booking confirmed | `customerConfirmationEmail`, from `create-booking` | The customer | A booking is made and lands confirmed | Immediately, inside the booking | Email | Booking confirmation (on) | KEEP |
| **C2** | Request received | `customerConfirmationEmail` with the request flag, from `create-booking` | The customer | A customer asks for a time and the detailer must answer (booking is pending) | Immediately | Email | Booking confirmation (on) | KEEP |
| **C3** | Quote accepted, now confirmed | `customerConfirmationEmail`, from `accept-quote` | The customer | The customer accepts a price the detailer sent | Immediately | Email | Booking confirmation (on) | KEEP |
| **C4** | Request answered: accepted, declined, or a price | `requestDecisionEmail`, from `respond-to-booking` | The customer | The detailer presses accept, decline or send a price on a pending request | Immediately | Email | none | KEEP |
| **C5** | Appointment reminder | `customerReminderEmail`, from `send-owner-reminders` | The customer | The reminder sweep, which runs about every 15 minutes | The evening before at 7 PM if the job starts by noon, otherwise 120 minutes before | Email | Appointment reminder (on) | KEEP |
| **C6** | Second reminder | `customerReminderEmail` with the second flag, from `send-owner-reminders` | The customer | Same sweep | 120 minutes before by default; the second reminder is off until the detailer turns it on | Email | Appointment reminder, plus its own switch (off) | KEEP |
| **C7** | Change of time | `rescheduleEmail`, from `reschedule-booking` and `update-booking` | The customer | The customer moves the job from their link, or the detailer edits the time | Immediately | Email | none | KEEP |
| **C8** | Cancellation | `cancellationEmail`, from `cancel-booking` and `update-booking` | The customer | The customer cancels from their link, or the detailer cancels | Immediately | Email | none | KEEP |
| **C9** | Receipt | `invoiceEmail`, from `send-invoice` | The customer | The detailer records payment on the job | Immediately on that press; a claim stops a second press sending it twice | Email | none | KEEP |
| **C10** | Thank-you and review request | `followupEmail`, from `send-invoice` | The customer | The same press as C9 | Immediately after C9, as a second email; best-effort | Email | Thank-you and review request (on) | KEEP |
| **C11** | Plan link | `planLinkEmail`, from `plan-link` | A plan member | They type their address on the detailer's plans page | Immediately; the page answers the same way whether or not the address is a member | Email | none | KEEP |
| **C12** | Maintenance due | `maintenanceDueEmail`, from `send-owner-reminders` | The customer | A maintenance deadline reaches a stage | 60, 30, 14 and 1 days before it is due, once each | Email | Reminder, plus Maintenance-due (off; no control turns it on) | KEEP |
| **C13** | Campaign | `campaignEmail`, from `send-campaign` | Customers the detailer picked | The detailer picks names and presses send. **Never scheduled.** | When pressed | Email | none (the act itself) | KEEP |

### Detailer email (the main address plus "Also send to")

| ID | Message | Sent by | Audience | Trigger | Timing | Channel | Switch | Decision |
|---|---|---|---|---|---|---|---|---|
| **O1** | New booking, or new request | `ownerNewBookingEmail`, from `create-booking` | The detailer | A customer books or asks | Immediately | Email, with push N1 | A new booking comes in (on) | KEEP |
| **O2** | Quote accepted | `ownerNewBookingEmail`, from `accept-quote` | The detailer | The customer accepts a price | Immediately, whatever O1's switch says, because it answers the detailer's own quote | Email, with push N2 | none | KEEP |
| **O3** | A job is coming up | `ownerNewBookingEmail` with a reminder subject, from `send-owner-reminders` | The detailer | The same sweep as C5 | Same moment as C5 | Email, with push N7 | A job is coming up (on) | KEEP |
| **O4** | Customer moved a job | `rescheduleEmail` for the detailer, from `reschedule-booking` | The detailer | The customer moves it from their link | Immediately | Email, with push N4 | none | KEEP |
| **O5** | Customer cancelled | `cancellationEmail` for the detailer, from `cancel-booking` | The detailer | The customer cancels from their link | Immediately | Email, with push N3 | none | KEEP |
| **O6** | Still waiting on you | `staleRequestEmail`, from `send-owner-reminders` | The detailer | A request has gone unanswered | After 12 hours by default (a setting; 0 turns it off), once | Email, with push N11 | The wait setting | KEEP |
| **O7** | A customer left their plan | `planCancelledEmail`, from `plan-link` | The detailer | The customer ends their plan | Immediately | Email | none | KEEP |
| **O8** | Invitation to the dashboard | `inviteEmail`, from `invite-user` and `platform-admin` | The person invited | An owner invites staff, or Andrew creates a business or resends an invite | Immediately; the link lasts 7 days | Email | none | KEEP |
| **O9** | Sample of what customers get | `customerConfirmationEmail` and `ownerNewBookingEmail` on a made-up booking, from `preview-emails` | The detailer, at their own addresses only | The detailer presses Send me a sample on the Notifications screen | When pressed; two emails; nothing is saved | Email | none | KEEP |

### Platform mail (the sender name is the platform's)

| ID | Message | Sent by | Audience | Trigger | Timing | Channel | Switch | Decision |
|---|---|---|---|---|---|---|---|---|
| **P1** | Payment failed, or account paused | `billingEmail`, from `stripe-webhook` | The detailer, at their own contact address | Stripe reports a failed subscription payment | When Stripe tells us | Email | none | KEEP |
| **P2** | Work started, so the setup fee stops being refundable | `buildStartedEmail`, from `platform-admin` | The detailer, at their own contact address | Andrew records that work began | When recorded | Email | none | KEEP |
| **P3** | A new detailer signed up | `platformAlertEmail`, from `create-business` | Andrew | A signup commits | Immediately, after it commits | Email | none | KEEP |
| **P4** | A scheduled job stopped, or is running again | `platformAlertEmail`, from `watch-jobs` | Andrew | A scheduled job goes stale or recovers | On the change, not every minute | Email | none | KEEP |
| **P5** | A detailer reports a problem | built inline in `report-problem`, no template | Support | The detailer presses Report a problem | Immediately | Email | none | KEEP |
| **P6** | Password reset, and sign-up confirmation if switched on | Supabase Auth (`resetPasswordForEmail` and `signUp` in `Auth.jsx`) | A person signing in | They ask | Immediately | Email | none | KEEP |

## 3. The matrix — push and text

### Push to the detailer's devices

All twelve go only to the detailer. "push_enabled" is the detailer's master
switch for alerts; the "Honors" column says whether the code asks it, read from each function.

| ID | Title as it appears | Sent by | Trigger | Timing | Honors the master switch? | Decision |
|---|---|---|---|---|---|---|
| **N1** | "New booking" or "Booking request" | `create-booking` | A customer books or asks | Immediately | Yes | KEEP |
| **N2** | "Quote accepted" | `accept-quote` | The customer accepts a price | Immediately | Yes | KEEP |
| **N3** | "Booking cancelled" | `cancel-booking` | The customer cancels | Immediately | **No** | CHANGE |
| **N4** | "Booking rescheduled" | `reschedule-booking` | The customer moves the job | Immediately | **No** | CHANGE |
| **N5** | "Booking updated" | `update-booking` | Any edit to a job from the dashboard | Immediately | **No** | CHANGE, and DEFER the rest (D4) |
| **N6** | "Payment finalized" | `send-invoice` | The detailer records payment | Immediately | Yes | KEEP |
| **N7** | "Upcoming job reminder" | `send-owner-reminders` | The sweep, with O3 | Same moment as O3 | Yes | KEEP |
| **N8** | "Starting soon" | `send-owner-reminders` | A job is about to start | 30 minutes before by default | **No** | CHANGE |
| **N9** | "Wrapping up soon" | `send-owner-reminders` | A job is about to end | 20 minutes before its end by default | **No** | CHANGE |
| **N10** | "Finalize payment" | `send-owner-reminders` | A job ended and payment is not recorded | 120 minutes after the end by default; never for a job over 2 days old | **No** | CHANGE |
| **N11** | "Still waiting on you" | `send-owner-reminders` | A request has gone unanswered, with O6 | 12 hours by default | **No** | CHANGE |
| **N12** | "Today: N jobs" | `send-owner-reminders` | The morning summary | Once a day at the business's morning-summary hour (7 AM by default), only when there is at least one job. **Push only: there is no email version.** | **No** | CHANGE, and DEFER an email version (D5) |

### Text

| ID | Message | Sent by | Audience | Trigger | Timing | Channel | Decision |
|---|---|---|---|---|---|---|---|
| **T1** | *On my way* | The detailer, from their own phone | The customer | The detailer taps the On my way button on the job | When tapped | Text, detailer-sent | KEEP |
| **T2** | *Running late* | Same | The customer | The detailer picks it from Text on the job | When picked | Text, detailer-sent | KEEP |
| **T3** | *Confirm tomorrow* | Same | The customer | The detailer picks it | When picked | Text, detailer-sent | KEEP |
| **T4** | *Job finished* | Same | The customer | The detailer picks it | When picked | Text, detailer-sent | KEEP |
| **T5** | *Ask about access* | Same | The customer | The detailer picks it | When picked | Text, detailer-sent | KEEP |
| **T6** | *Booking confirmed* | Same | The customer | The detailer picks it when C1 did not land (the failed-email signal in 3.4e S1 offers it) | When picked | Text, detailer-sent | ADD |
| **T7** | Automatic texts: booking confirmed, appointment reminder, change of time, cancellation, on my way, and a text when a booking email fails | **Us**, through a texting provider | The customer | The same triggers as C1, C5, C7, C8, T1 and the failed-email signal | The same moments as their emails | Text, sent by us | DEFER |
| **T8** | Anything that sells, by text (offers, rebooking, maintenance nudges) | **Us** | A customer who opted in to this specifically | A detailer-chosen send, never automatic | When sent | Text, sent by us | DEFER |

## 4. What changes, what waits, and what does not move

Every non-KEEP row above is decided here. **None of these is built by this
page**; 3.4f builds the ones marked for it, after Andrew's answers in § 7.

| # | Rows | Decision | What and why |
|---|---|---|---|
| **D1** | T6 | **ADD** | A built-in *Booking confirmed* text, so a detailer whose C1 email bounced has one tap to send the same news by text. `message_templates` has five built-in texts and none confirms a booking, so the fallback 3.4e designs would otherwise open an empty box. Costs nothing per use: it leaves from the detailer's phone. Built in 3.4f. |
| **D2** | C1 to C10 | **ADD** | The four failure signals S1 to S4 and the call-or-text fallbacks in `docs/email-failure-recovery.md`. They add no message; they tell the detailer when one did not arrive. Their approval is Andrew's three answers there. Built in 3.4f. |
| **D3** | N3, N4, N5, N8 to N12 | **CHANGE** | The master alerts switch is ignored by eight of the twelve pushes. A detailer who turned alerts off on the Notifications screen still gets a push on every other phone or computer they had alerts on when a customer cancels or moves a job, when any job is edited, before a job starts, near its end, when payment is unrecorded, when a request is unanswered, and each morning. (Turning the switch off removes only the device they are holding.) N1, N2, N6 and N7 ask the switch first; these eight never did. **Recommendation: make all eight ask it.** It is one check in each of four functions, and it makes the switch mean what its label says. Built in 3.4f. |
| **D4** | N5 | **DEFER** | "Booking updated" fires on every edit made from the dashboard, with no check of who made it, so the person who just pressed Save is told they changed their own job. The lines read cannot tell an edit by the owner from an edit by a staff member. Wait for the back-office and staff redesign Andrew has asked for, then send it only to the people who did not make the change. Until then D3 is the only change. |
| **D5** | N12 | **DEFER** | The morning summary is a push and nothing else. A detailer without alerts on a device never receives it, though the Notifications screen describes it as "Your day's jobs, sent once each morning." An email version is easy and costs one email per business per day. Decide it with the rest of the email budget once there are real detailers; today there are none, and the allowance is shared (`docs/email-budget.md`). |
| **D6** | T7, T8 | **DEFER** | All automatic texting waits for texting to be set up. Nothing can send yet: the carrier campaign is filled in but not submitted or paid, the consent checkbox is not on the booking page, the privacy page says nothing about texts, and no provider key exists (`TEXTING.md`, `docs/services-and-secrets.md` § 4). **When it is built, the rule is already set:** the booking-related texts (the first six in T7) go only to people who ticked the consent box, which is unchecked by default; T8 needs a separate opt-in and is never automatic. |
| **D7** | C1 to C4, C7 to C9 | **KEEP, no new switch** | Eight customer emails have no off switch. That is deliberate: each answers something the customer or the detailer just did, and a customer who booked and heard nothing would assume it failed. The blurb "Turning one off stops the email, not the booking" is true of the three that do have switches. Not touched. |

### What was considered and NOT done

- **Merging C9 and C10** (receipt and thank-you in one email). Not merged. The
  two have separate switches, so a merged email would either let the review ask
  silence the receipt or make the switch lie. The receipt carries a money table
  the customer may need for their records; the thank-you is a nudge. They also
  go out in the same press, so a detailer with a review link gets two emails
  where one might do. **Revisit when text exists:** the review ask is the
  natural first thing to move to a text a day after the job, and then C10 can
  be dropped for those who opted in. Until then, KEEP both.
- **Merging O1 and O3.** They already share one layout (`ownerNewBookingEmail`)
  with a different subject. Two triggers, one template is as merged as they
  need to be.
- **Removing any email.** Each one answers an event with a different trigger,
  a different recipient, or a different switch. Every template the file exports is reached from at least one caller above
  (17 at `49d85d67`, by `grep -cE "^export function [a-zA-Z]+Email\(" supabase/functions/_shared/emailTemplates.ts`;
  the roadmap's "16" is stale). `maintenanceDueEmail` is reachable
  but gated off by a standing ruling.
- **Dropping the duplicate email-plus-push on O1 to O6.** The push is for
  reaching a detailer who is in a car; the email is the record that survives a
  phone being replaced. They are meant to overlap, and 3.4e adds the signal
  for when the email half fails.

## 5. Rulings this page must not reopen

- **Marketing email is allowed** (Andrew reversed his own ban), and is always a
  detailer-chosen send (C13). **The maintenance-due gate stays exactly as it
  is** (C12): off by default, no control turns it on, mailing address required.
- **Texting is happening.** It is not a false claim and not cancelled; it is
  waiting on setup. The reminder to finish it is in `FOR-ANDREW.md`.
- **No Spanish on the home and pricing pages; the booking page stays fully
  bilingual.** Customer emails follow the booking's language; detailer and
  platform emails follow the recipient's dashboard language (3.4 fault 4).
- **Sales text needs its own consent**, separate from the appointment-texts
  box. That is a legal point, not a design one, and it is stated in § 4 (D6)
  so the build cannot quietly fold the two together.

## 6. Why some rows have no switch

The Notifications screen offers three switches for the customer and two for the
detailer. Everything else in the matrix has none, and that is a decision, not an
omission: **an email that answers an action the person just took is not
optional**, because silence reads as failure. That covers C4, C7, C8, C9, C11,
O2, O4, O5, O7, O8 and every platform row. The three that are switchable are
the ones that arrive on their own (C1/C2/C3 confirm, C5/C6 remind, C10 asks).

## 7. What Andrew decides before 3.4f builds

D1 and D2 follow from 3.4e. D3 is a recommendation Andrew can overrule. The
others are deferrals, recorded so they are not rediscovered. The only new
yes-or-no here is **D3** (make the eight pushes that ignore the alerts switch
respect it). It is a DECIDE row in `FOR-ANDREW.md`.

## 8. How this page was checked

`node scripts/communication-lifecycle.mjs` reads the product, once, into plain
data, and fails if any of these is not in the matrix above: every `*Email`
function `emailTemplates.ts` exports; every push title any function sends;
every function folder that sends mail or push; every built-in text; and the
two Supabase Auth calls. It also fails if a matrix row has an empty cell, a
decision outside the six words, or a non-KEEP decision with no entry in § 4.
Three canaries run every time (`--break=drop-template`, `new-push`,
`blank-cell`); each must turn its own rule red.

**Not checked, because the repo cannot see it:** the wording of Supabase's own
sign-in mail (set in its dashboard), and whether Stripe sends its own receipts
to a detailer for a subscription payment (a Stripe dashboard setting).
