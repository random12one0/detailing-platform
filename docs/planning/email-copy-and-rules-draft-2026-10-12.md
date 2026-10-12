# Every customer email: wording and behavior draft

Prepared October 11, 2026. Planning only. Nothing in the real project has been changed.

## Status and evidence

This uses both Andrew's cleaned-up feedback and original dictation. The original supplies details missing from the summary. Numbering follows the cleaned-up list of 27, not the older review page's numbering.

This is a proposed copy deck, not an audit of the existing code. Local project files, RTK.md, the old mockup, and the original templates could not be read with the available non-command tools. Existing wording that Andrew liked must be compared before implementation; reconstructed passages below must not silently replace approved wording. The signup contradiction is unresolved as a current-code finding; the intended behavior is proposed below. No visual mockup has been made or verified in this pass.

Square, Yelp, Google, Stripe, and FTC sources are linked at the end. Recommendations beyond Andrew's instructions are marked as proposals. Unsettled choices must not be treated as founder approval.

## Shared wording and layout

- Customer sign-off, with a real line break: `Thanks again,` followed by `[Sender first name]`. No business name in this sign-off. The footer still identifies the business. Platform and internal notifications should not pretend to be personal notes from the receiving detailer; proposed default is no personal sign-off on those notifications.
- Contact footer: `Questions? Text us at [Number].` OR `Questions? Message us at [Link].` If the detailer explicitly enables both, show both. Use an actual configured destination; never invent a number or tell customers to reply to an unmonitored address. Missing contact settings need a setup prompt and a verified fallback before sending.
- Keep dates to one or two appearances in the visible email where possible. A calendar reference should identify the date clearly, not just say Friday. Use the business's time zone; add the zone where a customer could reasonably be elsewhere.
- Plain US English and contractions. Use `charge` for the action and `charged` for a completed action. Both are American English; do not globally replace one with the other. Remove unnecessary claims that nothing was charged or owed.
- Customer details, in this order: When; Where; Vehicle; Notes; Water; Electricity. Show customer notes only, never internal staff notes. Omit empty notes. With several cars, pair each car with its work and notes.
- Water and Electricity each have their own left-hand label. Right-hand value: `We're providing` or `You're providing`, based on the actual agreement. Use `Not needed` only when true. Missing information is `Not confirmed`; lack of a customer supply does not itself prove the detailer will bring it.
- Internal details use `Water: None` and `Power: None` for confirmed lack of customer supply. Otherwise use `Available` or `Not confirmed`. Include a separate Bring row where equipment needs are known.
- Use `Where: [Address]`, with no “We'll come to you” filler.
- Price headings: `Price`, `Estimated total`, and `Paying` where applicable. Exact estimate caveat: `This is just an estimate. The price is subject to change based on vehicle condition.` This does not itself authorize a later card charge.
- Custom payment row: `[Name entered by detailer] | [Description, link, or handle entered by detailer]`. No `Other` label. Only show currently supported options, with job-appropriate instructions.
- Keep the existing change-booking buttons Andrew liked. Their destination must obey the date-request rules below.
- Remove `Automated Message` labels. Place the business identity in the footer. Promotional emails also need the appropriate mailing address and unsubscribe link.

### Reusable content blocks

These names below refer to the following exact label sets, not customer-facing headings to add automatically.

**Customer overview:** `When: [Date and time]`; `Where: [Address]`; `Vehicle: [Year, make, model]`; `Notes: [Customer notes]`; `Water: [Provider]`; `Electricity: [Provider]`.

**Price:** one row per service and add-on, paired with the correct car and amount; discounts, applicable tax, and fees when present; `Estimated total: [Amount]` or `Total: [Amount]` according to the real price status. Do not mislabel an estimate as a fixed price.

**Internal full job details:** customer name; booking reference; When; Phone; Email; Where; each Vehicle and its services/add-ons; customer Notes; Water; Power; Bring; assigned staff if applicable; estimated or agreed price with the correct label; actual payment/balance status when relevant. No `Okay to text` badge and no `Paid after the job` filler.

**Billing details:** invoice/receipt number, business identity and contact, customer name, service date, vehicle/address, itemized work and fees, discounts/tax, total, actual payments, remaining balance. Tips and refunds shown separately when present; do not call a partial payment “Paid in full.”

## Proposed exact copy: 1–15, customer emails

Bracketed fields are replaced with real values. Shared contact/footer/sign-off rules above apply. Button labels are supplied separately from the body.

### 1. Booking confirmed

Subject: `Your booking is confirmed`

Title: `You're all set`

Body: `Hi [First name], thanks for booking. Here are the details of your booking:`

Include Customer overview, Price, estimate caveat when applicable, and Paying rows. Keep the existing view/change buttons and their styling once the original is available.

### 2. Price estimate

Subject and title: `Your estimate`

Body: `Hi [First name], here's an estimate for your detail.`

Include Customer overview where tied to a booking; Price and Paying. Exact caveat: `This is just an estimate. The price is subject to change based on vehicle condition.`

Button: `View your estimate`.

Purpose needs verification: the older review may have shown an estimate section inside #1 rather than a distinct send. Do not introduce a duplicate email merely to reach 27 sends.

### 3. Request received

Subject and title: `We got your request`

Body: `Hi [First name], thanks for your request. We'll let you know when we accept it.`

Include Customer overview with `Requested time` replacing `When`, Price marked as an estimate where appropriate, and the caveat. No hold promise, payment claim, or extra intro repeating the time.

Button: `View your request`.

### 4. Request accepted

Subject and title: `We accepted your request for [Date and time]`

Body: `Hi [First name], here are the details of your booking:`

Include Customer overview, Price, appropriate caveat, and Paying. Keep existing view/change buttons. No “You're on the calendar” filler.

### 5. Quote / price proposal

PROPOSED PURPOSE, NOT VERIFIED: the detailer proposes a different price for a pending request, based on information actually available before accepting the booking. A separate invoice handles work already completed.

Subject and title: `Here's a price for your detail`

Body: `Hi [First name], here's a quote for the work you requested. Review the details below and let us know if you'd like to go ahead.`

Include Customer overview, proposed Price, and `Note from [Detailer first name]` with the detailer's actual note. Never invent a finding about dirt or pet hair. No previous-estimate comparison. No claim that nothing was charged or that the time is held without a verified hold rule.

Button: `Review and accept`.

Closing: `Questions? Text us at [Number] and we'll talk it over.` OR `Questions? Message us at [Link] and we'll talk it over.`

OPEN: Is this an adjustable estimate or a fixed quote? If adjustable, label the amount `Estimated total` and use the shared caveat. Do not imply a guaranteed price by calling an adjustable amount final. Acceptance must state whether it also confirms the appointment.

### 6. Request declined

Subject and title: `We can't do [Date and time]`

Body: `Hi [First name], we can't do [Date and time]. Pick another day and we'll do our best to fit you in.`

Button: `Pick another day`. No payment claim.

### 7. Reminder before appointment

Subject and title: `Your detail is tomorrow at [Time]`

Body: `Hi [First name], here's a reminder about your detail tomorrow.`

Include Customer overview and one total row, accurately labeled `Estimated total` or `Total`. Use the estimate caveat if needed. No full price breakdown required here.

Heading: `Payment Options`

Each bullet: `[Payment method]: [Instructions]`. Custom method names and descriptions come directly from the detailer's settings. Do not request payment again if already paid.

Button: `View your booking`.

### 8. Time change approved / booking moved

Subject and title: `Your booking has moved`

Customer-request version: `Hi [First name], we accepted your request to move your booking. Your appointment is now [Date and time].`

Detailer-arranged version: `Hi [First name], your appointment is now [Date and time].`

Use `Everything else stays the same.` only if it is true. Include the complete updated Customer overview, Price, and Paying, including any disclosed rescheduling fee. No redundant “was” section required in this customer email.

Button: `View your booking`.

Send only after the move actually succeeds. Additional request-received and declined messages are specified below.

### 9. Booking canceled

Subject and title: `Your booking has been canceled`

Body: `Hi [First name], your booking has been canceled. We hope to see you again.`

Show canceled date/time, vehicle(s), work, and address. Show real financial status separately where applicable: `Cancellation fee: [Amount]`; `Amount due: [Amount]`; `Refund issued: [Amount]` only after it was issued, or `Refund pending: [Amount]` if genuinely pending. Never state “Nothing is owed” by default.

Closing: `If you didn't ask for this, text us at [Number] and we'll sort it out.` OR `If you didn't ask for this, message us at [Link] and we'll sort it out.`

Button: `Book another detail` when booking is available.

### 10. After-job receipt

Subject: `Your receipt from [Business name]`

Title: `Paid in full` only for a fully settled job; otherwise `Your payment receipt`.

Body: `Hi [First name], thanks for having us. Here's your receipt for the detail on [Service date].`

Include Billing details. Payment row: `Paid | Card` or the actual method name. For split payments, list each method and amount. No “by card on the day.”

Button: `View receipt`.

### 11. Invoice: money still due

Subject: `Your invoice from [Business name]`

Title: `[Balance] due`

Body: `Hi [First name], thanks for having us on [Service date]. Here's your full bill.`

Include Billing details, `Amount due: [Balance]`, actual due date when set, and `Paying` rows appropriate after completion. No “Cash: On the day.” Button `Pay invoice` only if online payment works; otherwise `View invoice` plus the configured payment instructions.

### 12. Review request

Subject and title: `Thanks, [First name]`

Andrew's requested paragraph, retained for comparison: `It was good working on your car. If you're happy with how it turned out, a short review helps other people find us and takes about a minute.`

RECOMMENDED ALTERNATIVE, awaiting decision: `It was good working on your car. A short review of your experience helps other people find us and takes about a minute.`

Andrew requested equal-size Google and Yelp review buttons. Yelp expressly says not to ask for reviews, so that exact pairing is flagged, not silently approved. Recommendation: a `Leave a Google review` button; place a neutral `Find us on Yelp` link separately from the review request, if desired. Do not present a relabeled Yelp button as a way around Yelp's rule. Other review destinations can be equally sized when their rules allow requests. Send the same invitation regardless of satisfaction; never screen out unhappy customers first.

Smaller, readable gray text: `Something's not right? Text us at [Number] and we'll make it right.` OR the Message equivalent.

### 13. Plan-page link

Subject and title: `Your maintenance plan page`

Body: `Hi [First name], this link opens your [Plan name] plan. You can see your next visit, book a time, or manage your plan.`

Button: `Open your plan`.

Keep cancellation available on the destination page with any agreed commitment shown. Do not promise unrestricted free cancellation if there is an accepted early-exit fee.

### 14. Maintenance due

Subject and title: `Your [Maintenance type] is due`

Body: `Hi [First name], your [Vehicle] is due for its [Maintenance type] by [Due date]. Book a time and we'll take care of it.`

Primary button: `Book a time`.

Secondary text: `Already had it done somewhere else, or don't need these reminders?`

Secondary button: `Stop reminding me`.

Page copy: title `Stop these reminders?`; body `We'll stop reminders for [Maintenance type] on your [Vehicle]. Your bookings and plan won't change.`; optional field `Anything you'd like us to know? (Optional)`; button `Stop reminders`; confirmation `These reminders are turned off.` Optional note goes to the detailer. No note, login, or reply required to stop.

### 15. Promotional win-back

Title options for Andrew:

1. `Ready for a clean car?` — recommendation.
2. `Time for a fresh detail?`
3. `Want that just-cleaned feeling again?`
4. `Let's get your car cleaned up`

Subject uses the chosen title. Preserve the approved existing body once available. Reconstructed draft: `Hi [First name], it's been a few months since we last took care of your car. If you'd like it looking fresh again, booking takes about a minute. Just use the button below.`

Button: `Book your next detail`. Only use “a few months” when the sending rule makes it true. Include marketing unsubscribe and business mailing address.

## Proposed exact copy: 16–23, detailer and team emails

Internal notifications should be useful without opening the app. Full details below a prominent action button are intentional.

### 16. New confirmed booking

Subject and title: `New booking: [Customer name]`

Body: `[Customer name] booked [Service summary] for [Date and time].`

Button near top: `Open Job`. Include Internal full job details and `Estimated total` where appropriate. No accept/decline instructions for a booking already confirmed; pending bookings use #17.

### 17. Request waiting for you

Subject and title: `New request: [Customer name]`

Body: `[Customer name] wants [Date and time]. Accept, decline, or send a different price.`

If the real system holds the slot, retain `The time is held until you answer.` only when that accurately describes its expiration rule. Otherwise state the actual expiry, or omit the sentence pending verification.

Button: `Open Job`. Include Internal full job details.

### 18. Tomorrow's appointment

Subject: `Tomorrow: [Customer name] at [Time]`

Title: `Tomorrow's appointment`

Body: `[Customer name] is booked for [Time] tomorrow.`

Button: `Open Job`. Include Internal full job details. Never title this “New booking.”

### 19. Nobody answered a request

Subject and title: `[Customer name] is waiting on your reply`

Body: `It's been 24 hours since [Customer name] sent a request, and it still needs your response. Accept, decline, or send a different price.`

Button: `Open Job`. Include the same full details as #17. Send once when 24 hours have elapsed, only while the request is still actionable. If delivery is delayed substantially, use `This request still needs your response` rather than a misleading precise age. Do not send for accepted, declined, withdrawn, expired, or past appointments. Requests for sooner than 24 hours need a separate expiry/urgency rule; the reminder must not revive them.

### 20. Request to move booking

Subject and title: `[Customer name] requested a new time`

Body: `[Customer name] would like to move their booking. Review the requested time and any applicable rescheduling fee.`

Button immediately below: `Open Job`.

Rows: `Current time: [Date and time]`; `Requested time: [Date and time]`; `Reason: [Optional customer note]`; `Rescheduling fee: [Applicable amount or None]`.

Follow with Internal full job details. The requested time must never replace the confirmed time in the job details until approved. Do not also send an automatic “customer moved the booking” notification.

### 21. Booking canceled, internal

Subject and title: `Booking canceled: [Customer name]`

Body: `[Customer name]'s booking for [Service summary] has been canceled.`

Button: `Open Job`. Include Internal full job details; `Canceled by: [Customer / Staff name]`; reason if supplied; and applicable fee, payment, and refund status. Preserve the canceled job's details instead of replacing them with an “open slot” message.

### 22. Plan ended, internal

Subject and title: `[Customer name]'s plan has ended`

Body: `The [Plan name] plan has ended. Existing bookings are still on your calendar.`

Rows: Customer; Phone; Email; Plan; all linked Vehicles; Member since; Ended; Ended by; optional Reason; Completed visits; Minimum visits when applicable; actual Early cancellation fee and its payment status.

Button: `Open plan`. The existing-bookings sentence assumes the recommended rule below is adopted. A cancellation scheduled for later needs `Plan cancellation scheduled` with an effective date, not an immediate “ended” notice. Do not promise they can rejoin on identical terms.

### 23. Team member setup

Subject and title: `You're on the team at [Business name]`

Body: `[Business name] added you as a [Role]. You'll use the app to see your jobs and your schedule.`

Button: `Set up your account`.

Show the real invitation expiry if applicable. This is a staff invitation, not a new detailer-business signup. Preserve other approved copy once the original is available.

## Proposed exact copy: 24–27, platform messages

Use verified platform support contact, not the detailer's customer contact settings. No made-up subscription prices. Andrew's references to $35 and $1,000 are context, not verified current pricing or evidence that $1,000 is recurring.

### 24. Platform payment failed

Subject and title: `Your payment didn't go through`

Body: `Hi [First name], we couldn't collect your [Amount] payment for Detailing Platform. Update your payment method to keep your account running.`

Rows: Amount due; Payment method with masked card details; Next attempt only if actually scheduled; Account restriction date.

Follow-up: `If payment isn't resolved by [Restriction date], new bookings will stop. You'll still be able to finish existing jobs and collect their payments.`

Button: `Update payment method`.

For an account with a hosted main website, add: `Your hosted website will also go offline.` Only state “insufficient funds” if the payment provider actually supplied that reason. Never hard-code “sixth payment” or retry dates. Keep already-approved wording where it conveys these facts accurately.

### 25. Account restricted / site offline

Subject and title: `Your account is restricted`

Body: `Hi [First name], your platform payment is still overdue. Your booking page is offline, and you can't create or accept new bookings. You can still manage existing jobs, finish the work, and collect outstanding payments.`

Hosted-website addition, only when actually disabled: `Your hosted website is also offline.`

Closing: `Update your payment method and pay the overdue balance to restore access. Your existing bookings and records haven't been deleted.`

Button: `Resolve payment`.

Send when restrictions are actually in force. Don't claim the website is offline before that succeeds.

### 26. We started your website

Subject and title: `We started your website`

Body: `Hi [First name], we've started working on your website. You don't need to do anything right now. We'll let you know when there's something for you to look at.`

Send when work actually starts, not merely when an account is created. Preserve other approved wording after comparison with the original.

### 27. New signup, to Andrew

PROPOSED PURPOSE: owner visibility into an unfinished signup, not an announcement of a live business. Whether the current product incorrectly enables bookings cannot be determined from the email alone.

Subject and title: `New account: [Business name]`

Body: `[Owner name] created an account for [Business name]. They haven't started a paid subscription. Their booking page isn't live.`

Rows: Owner; Business; Email; Signed up; `Subscription: Not started`; `Booking page: Not live`.

Button: `View account` leading to Andrew's private account record. No public booking-page button. If setup is incomplete, omit unknown business details instead of inventing them.

Separate paid-activation notification: subject `Subscription started: [Business name]`; body `[Business name] has started a paid subscription.` Show actual page state separately: `Booking page: Live` only after publication, otherwise `Booking page: Setup incomplete` or `Not published`.

Alternative: omit unfinished-signup emails and notify Andrew only on paid activation. Recommended if unfinished signups do not require his attention.

## Functional requirements for the future builder

### A. Customer date changes

Founder requirements: approval even when instant booking is enabled; one outstanding move request; optional detailer-set fee; easy correction of address/contact information.

Proposed sequence:

1. Customer opens the booking's secure management page and chooses Request a new time. Show current appointment and available alternatives.
2. Show the fee policy accepted with the booking and exact applicable fee before submission. Preserve that version of the policy. A newly enabled fee cannot silently be applied to an earlier booking.
3. Submission creates a pending request. Keep the original appointment confirmed and occupied. Do not charge or move anything at this step. Proposed default: do not reserve the proposed second slot while awaiting review; explain that it is subject to availability.
4. Only one request may be pending per booking. Allow withdrawal; after withdrawal the customer can make another request. Do not allow several simultaneous date requests.
5. Send #20 to the detailer. Customer acknowledgement: title `We got your request to move your booking`; body `Hi [First name], we'll let you know when we've reviewed your requested time. Your booking is still set for [Current date and time].`; rows Current time and Requested time, with no third repeat of the original date in the layout; button `View your request`.
6. The detailer sees old/new dates, complete job details, and the applicable fee; can approve, decline, or offer another time. Fee waiver is allowed and recorded.
7. At approval, recheck availability, duration, staff, travel requirements, current booking state, and whether the customer withdrew or canceled. Save the move and free the old slot together so a partial failure cannot lose the appointment. If unavailable, do not silently substitute another time.
8. Any newly proposed fee or counteroffer requires the customer's acceptance before moving. Proposed default is add an already-agreed fee to the job bill after approval; upfront collection is a separate policy choice, not assumed.
9. After a successful move, replace outdated reminders and send #8. Repeated clicks or delivery retries must not create duplicate moves, fees, or messages.
10. On decline, preserve the original booking. Customer title `We couldn't approve the new time`; body `Hi [First name], we couldn't move your booking to the requested time. Your appointment is still set for [Current date and time].`; include requested time separately and preferred contact sentence.
11. If the booking is canceled, completed, or its original start time arrives, resolve the pending request as no longer actionable. No old approval link can move it afterward. Send a clear status notice where the customer otherwise expects an answer.
12. Corrections to contact information, notes, or an address typo can be saved directly and should notify the detailer where operationally relevant. A different service location may alter travel, availability, or price: show it as a proposed material change instead of silently treating relocation as a typo. This boundary needs Andrew's decision.

### B. Cancellation and rescheduling fees

Founder requirement: detailer can enable cancellation fees and optional rescheduling fees.

Proposed settings: enabled/disabled; notice cutoff in hours; flat amount or percentage; clearly defined percentage base; maximum fee; separate cancellation and rescheduling policies. Defaults are off until configured and disclosed. No invented recommended dollar amount.

1. Show the applicable policy before booking confirmation and retain the customer's acceptance, wording, date, and policy version.
2. When canceling, show the resulting fee before final confirmation. Let the detailer waive it for weather, business-initiated cancellations, or other exceptions. No fee for the business canceling as the recommended default.
3. A confirmed cancellation frees the slot and stops appointment reminders even if a fee remains unpaid. Unpaid money stays as an amount due; it must not make a canceled appointment look active.
4. Collect from a saved card only when the stored payment authorization covers the charge. Otherwise issue a payment request using supported methods. An email's estimate caveat or a texting checkbox is not payment authorization.
5. Keep fees, prior payments, refunds, and amount due as separate amounts. Never claim “refunded” before a refund is actually initiated. No duplicate fee on repeated requests.
6. Proposed default: no charge for a declined or withdrawn move request, or an initial booking request never accepted. Apply at most the relevant approved fee for an action; no automatic stacking of a move fee and cancellation fee for the same cancellation.
7. Exact amounts, notice cutoffs, collection timing, and any exceptional plan/cancellation overlap remain decisions. Applicable business-location rules need checking before enabling fee terms; this document does not establish their enforceability everywhere.

Comparable product: Square supports disclosed cancellation policies, cutoff windows, flat/percentage charges, and staff discretion. It does not dictate our chosen policy.

### C. Maintenance-plan commitments

Founder requirements: configurable minimum number of details, possible early-exit fee, detailer can edit/end plans for customers, linked vehicles visible in notifications. The dictation also floated a fee even after the minimum; preserve that as an open option, not a settled rule.

Recommended starting policy: no minimum by default; optional minimum completed visits and a clearly disclosed early-exit fee; no exit fee after the minimum. Allow cancellation requests at any time instead of hiding the cancellation control.

1. Before joining, show included cars, frequency, price, minimum qualifying visits, what counts as a visit, cancellation terms, and a worked example of any early-exit fee. Obtain acceptance.
2. Recommended count: only completed qualifying details; canceled appointments do not count. OPEN: does a two-car appointment count as one visit or two details? Define this explicitly in the plan.
3. Show completed and remaining visits on the plan page. Do not calculate liability from undefined future prices. Andrew's “half the remaining details” is an example to discuss, not an approved formula.
4. On cancellation, show the effective date and applicable agreed fee. After the minimum, recommended default is free cancellation. Unpaid balances and the plan's ended status remain separate.
5. Detailers can edit a customer's plan, waive a fee, or end it on their behalf, with a reason recorded. Increasing a commitment or changing accepted price/fee terms requires customer agreement; never reset visit progress silently.
6. Recommended default: ending a plan stops future plan-generated visits but leaves already confirmed bookings intact. Show those appointments and their prices clearly. Canceling them is a separate action; no hidden repricing or double fee.
7. Send #22 with all linked cars. If ending at a future date, notify of scheduled cancellation now and actual ending once, at the effective date. Customer also needs a matching plan-ended confirmation or scheduled-end confirmation, using the same facts and preferred contact method.
8. Check applicable renewal/cancellation rules for supported locations before launching commitments. Jurisdiction and billing structure are unknown here.

### D. Platform overdue-payment lockdown

Founder requirement: after two weeks of failed payment, disable new business while allowing completion of existing work; disable the platform-hosted main website too, when purchased. The precise proposed deadline is 14 days after the first failed renewal payment, shown in the notice. Initial unpaid signup is handled separately below.

1. At the first failed renewal, record one grace-period start and send #24. Retries follow actual payment-provider settings. Further failures or editing the card do not reset the grace period.
2. Before the deadline, show what will stop and the exact date. Do not promise a retry that is not scheduled.
3. At the deadline, check actual unresolved payment state. If still overdue, disable public booking and all ways to create, accept, import, duplicate, or automatically generate new appointments. Staff accounts and direct links must obey the same rules.
4. Preserve an identifiable set of already confirmed bookings. Allow viewing their details, necessary customer communication, corrections, rescheduling of those same jobs, completion, final prices, existing-work invoices, payments, receipts, and refunds. Do not allow changing the customer or adding unrelated new work to bypass the restriction.
5. Keep customer management/payment links and necessary job messages working. An outstanding initial request is not an existing confirmed job; recommended default is it cannot be accepted during restriction. Tell the customer when it expires or is declined instead of leaving a false promise.
6. Pause promotions, new plan enrollment and generation of new plan visits, business configuration changes unrelated to finishing work, and other growth tools. Do not keep charging customers for newly generated plan services that cannot be delivered; prepaid obligations need explicit handling.
7. Keep billing recovery, login/security, support, account closure, access to existing financial records and necessary exports available. “Everything else locked” must not prevent paying the platform or resolving existing customer money.
8. If the platform hosts the paid custom website, replace it with a neutral unavailable page. Do not expose the detailer's billing problem publicly or delete site files. A domain/DNS change must not break unrelated email or customer job/payment links. No claim of hosting an independently hosted website.
9. Send #25 when restrictions actually apply. As remaining jobs finish, no new jobs become allowed; remaining debt collection, refunds, records, and account controls still work.
10. Restore access only after verified payment resolves the required overdue balance or Andrew records an explicit exception. Updating card details alone is insufficient. Do not republish anything the detailer independently took offline before restriction.
11. OPEN: whether subscription invoices continue accumulating while restricted. Recommended discussion before launch: define the ongoing billing terms clearly rather than equating restriction with subscription cancellation.

Stripe supports configurable retries and several final subscription states. Its subscription status alone is not proof that every invoice is paid; apply the product's explicit balance/access policy.

### E. Signup versus paid activation: resolving #27

An account, a reserved page address, a private preview, and a live booking page are different things. The confusing email proves unclear wording; it does not prove which one currently exists.

Recommended intended sequence:

1. Account created: save owner/business setup. Permit private setup and preview if desired. Public booking and manual creation/acceptance of real jobs stay disabled.
2. A reserved page address must not open an active public booking form. Label it `Reserved address` only if that is useful internally; omit it from Andrew's signup email by default.
3. Pending, failed, or abandoned first payment does not activate booking. Returning from a checkout page is not payment proof.
4. Verify successful first payment and the appropriate subscription access. Check setup readiness and any explicit publishing choice. Only then allow publication and new bookings. A signed-in preview cannot accept real customer submissions.
5. Send account-created and paid-activation owner notices as separate events, once each. Website construction starts only on the actual order/work-start rule, not the generic signup event.
6. If a free trial is deliberately offered, that is a separate access policy Andrew must choose. No trial is assumed from this transcript. The signup message must say “trial” and show the actual page state rather than implying an unpaid live page by accident.

Required investigation when project reading is available: account creation path; initial subscription/payment checks; public page publication checks; all new-booking entry points; owner notification trigger and link destination. Read CLAUDE.md, ROADMAP.md, DECISIONS.md and applicable local instructions first. Then determine whether #27 is a wording issue, an access bug, or an intentional trial that conflicts with Andrew's expectation.

### F. Reminder opt-out and contact settings

1. “Stop reminding me” targets the named vehicle and maintenance reminder, not the booking or paid plan.
2. Opening the link displays the confirmation page; no state change just from an email security scanner opening it. Confirming stops reminders immediately. The note is optional and may be sent separately without delaying opt-out.
3. Cancel queued reminders too. Repeated confirmation is harmless. Send the detailer the vehicle, reminder type, customer identity, and optional note, with no invented reason when blank.
4. Marketing emails have their own unsubscribe mechanism. Do not make a customer provide a reason or sign in to stop marketing.
5. Remove the permission badge from internal emails as requested, while retaining existing automated-message consent checks and opt-outs. Removing UI wording does not grant blanket permission for every type of text.

## Additional messages required by the proposed flows

The 27-item review list need not equal the final number of sends. Date-request receipt, date-request decline/counteroffer, customer plan-end confirmation, scheduled plan ending, and paid-activation owner notice need coverage. Reuse an existing template where appropriate, but never omit a state simply to preserve the count. Conversely, #2 might be a section rather than a separate email; verify before implementing.

## Checks for the builder and next visual review

- Compare all 27 entries against existing templates and Andrew's approved sections, including subject, hidden inbox preview text, body, buttons, plain-text version, and footer.
- Search customer-facing copy for charge/charged in context, British spelling, reply instructions, repeated dates, and estimate promises. Read-only planning here did not perform that site-wide audit.
- Test one/multiple cars; no/long notes; each water/power state; custom payment names; estimates versus agreed prices; split payments/refunds/balances; unavailable contact settings; missing review destinations; hosted and unhosted accounts.
- For date changes test conflict, withdrawal, cancellation during review, duplicate approval, simultaneous requests, counteroffer, declined fee, and stale links.
- For lockdown test direct links, staff access, manual booking, imports, recurring visits, finishing an old job, customer payment, website availability, and restoration after actual payment.
- Read app/src/theme.css and original email screen before building the phone review mockup. Provide every email plus conditional versions and per-email notes. Render and inspect 1440×900, 768×1024, and 390×844; compare with DESIGN.md; fix console errors/warnings. No visual verification has occurred in this draft.

## Sources checked October 11, 2026

- [Square: cancellation and prepayment policies](https://squareup.com/help/us/en/article/5493-manage-booking-cancellations-and-prepayment-policies) — comparable cutoff windows, disclosed fees, flat/percentage options, and staff discretion. Our exact rules remain a product decision.
- [Yelp: Don't Ask for Reviews](https://www.yelp-support.com/article/Don-t-Ask-for-Reviews?l=en_US) — businesses should not solicit Yelp reviews. Conflicts with the requested Yelp review button.
- [Google: prohibited and restricted content](https://support.google.com/business/answer/7400114) — prohibits discouraging negative reviews or selectively soliciting positive reviews. Neutral invitations to all customers are the recommendation.
- [Stripe: subscription lifecycle](https://docs.stripe.com/billing/subscriptions/overview) — signup, first payment, ongoing subscription state, and unpaid access are distinct; active status need not mean every invoice was paid.
- [Stripe: payment retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries) — configurable retry periods, exceptions where payment cannot be retried, and final states. A two-week product grace period must be explicitly implemented and communicated.
- [FTC: CAN-SPAM business guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) — commercial email needs truthful identification, a valid physical address, and an opt-out mechanism. Honor marketing opt-outs promptly; the guide specifies no later than 10 business days. This design proposes immediate suppression.

## Decisions to settle through conversation

1. Quote email: a proposal before accepting a request, or a price revision on an already confirmed job? Is acceptance enough to confirm the time, and is the amount fixed or still an estimate?
2. Reviews: neutral Google review invitation with Yelp kept separately, instead of asking for a Yelp review?
3. Move requests: retain original slot; proposed new slot unreserved until approval; accepted fees added to final bill, or collected before approval?
4. Fees: notice window, flat/percentage calculation, and waiver rules. What material address changes require review?
5. Plans: minimum counted per visit or per car; early-exit formula; treatment of existing booked visits; any charge after the minimum?
6. Billing: exact 14-day deadline and whether subscription billing continues while restricted.
7. Signup: no live booking before first successful payment; whether Andrew wants unfinished-signup notices at all.
8. Promo title: recommended `Ready for a clean car?`.

These are not all questions to ask Andrew at once. Start with the quote's purpose, which he explicitly found confusing, and work through the rest while reviewing the emails one by one.
