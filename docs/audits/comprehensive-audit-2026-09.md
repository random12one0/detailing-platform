# Detailing Platform — Comprehensive Product Audit and Repair Brief

**Reviewed:** September 2026  
**Product:** [detailingplatform.com](https://detailingplatform.com)  
**Purpose:** A single handoff document for the person or agent who will turn the audit into an implementation plan.

## Read this first

This is a live-product review, not a code review. Findings are based on using the public pages, completing the booking wizard up to—but not including—submission, and using the signed-in detailer and platform-owner areas with the supplied demo account.

**Stripe is intentionally excluded from every score, priority, and recommendation.** The owner cannot officially set it up yet because of age. Its absence should not be treated as a defect in the work plan produced from this document.

The browser available for this review could not simulate a true phone-sized viewport. The product was reviewed in a narrow central layout where available, but **a real mobile-device review remains required**. Do not turn “looked narrow on desktop” into “mobile passed.”

No real customer booking was submitted. During dashboard testing, one reminder was sent to a fake/demo customer and one demo job was marked completed. The payment flow was opened but no payment was finalized.

---

## 1. Verdict

### Publishable and sellable to strangers: **54/100**

There is a real product here, not a mock-up. The individual example websites look credible, the booking flow reaches a clear final review, and the detailer dashboard contains useful day-to-day functions. It is not ready for broad, full-price selling because several failures strike directly at trust: an example-site booking button breaks, another example hands the wrong service into booking, a weekend fee appears one step late, the privacy page omits a service that visibly receives customer addresses, and the owner cannot yet see whether important messages actually arrived. A stranger sees the polished claim first and then encounters evidence that the machinery is not fully controlled. That is where sales, bookings, and referrals are lost.

### Ready for the owner to move his own business onto it: **67/100**

The dashboard is the strongest part and already covers enough of a solo detailer's working day to justify a parallel pilot: today's jobs, requests, calendar, customer history, reminders, quotes, money collection records, rules, services, and team permissions. It is not yet safe to abandon the old system. One-tap completion has no confirmation or obvious undo, the money screen calls earned-but-unpaid work “brought in,” email delivery is not proved, and recovery/monitoring is incomplete. The owner should run real but controlled jobs through it while keeping the old calendar and records as a fallback until the release gates near the end of this document pass.

### Blunt recommendation

- Do not sell it broadly yet.
- Do recruit a very small number of explicit pilot users after the priority-zero defects are fixed.
- Do start moving the owner's business onto it in parallel.
- Do not stop using the current system until booking, messaging, money, recovery, and mobile field tests pass end to end.

---

## 2. The shortest useful priority list

If only ten things are fixed, fix these in this order:

1. Show the weekend surcharge at the date and time step, before the customer continues.
2. Repair every example-site booking link and make each service hand the correct service into booking.
3. Wire message delivery, failure, bounce, and delay results into the owner back office.
4. Correct the privacy page so it lists every service that receives customer information, starting with Geoapify/OpenStreetMap address lookup.
5. Add confirmation plus undo to destructive dashboard actions, especially “Mark completed.”
6. Rename and recalculate the money screen so earned, collected, owed, expenses, and actual cash left cannot be confused.
7. Rebuild `/examples` as a visual sales gallery instead of a plain list of internal-looking links.
8. Separate real detailers from test/demo accounts in `/admin`, and fix contradictory status counts.
9. Add external health checks, outage history, failed-job history, backup/restore proof, and admin audit records.
10. Test the whole product on real phones, weak signal, and bright outdoor light before calling it production-ready.

---

## 3. Ranked defect register

The register is ordered by likely cost: lost customer bookings first, then lost sales, then mistakes that can damage the owner's livelihood, then internal inefficiency and visual polish.

### P0 — Fix before accepting money from strangers

#### P0-01 — The total increases after the customer has chosen the time

- **What was done:** Built an Interior Deep Clean booking with pet hair, a medium vehicle, heavy condition, a Long Beach mobile address, Saturday September 19 at 9:00 AM.
- **Expected:** If Saturday costs more, show the surcharge beside Saturday or immediately when Saturday is selected. The total should change while the customer is still choosing the date and time.
- **What happened:** The date/time screen showed **$205**. After continuing, the contact screen showed **$235**. Only the final breakdown explained the extra **$30 weekend rate**.
- **Why it costs money:** A late price increase feels like a bait-and-switch even when the fee is legitimate. It is likely to cause abandonment or an argument.
- **Required change:** Put “Weekend rate +$30” beside affected dates/times and update the total immediately on selection. Keep the explanation in the final breakdown too.
- **Done when:** A customer cannot leave the date/time step without having seen the exact final total and every automatic surcharge.

#### P0-02 — A public example booking button crashes instead of booking

- **What was done:** Opened `/ex1/prices` and pressed “Book Express Wash” and related booking links.
- **Expected:** Open booking with Express Wash selected, or move to a working booking section.
- **What happened:** Nothing visible happened and the URL stayed on `/ex1/prices`. The browser console reported: `TypeError: Cannot read properties of null (reading 'scrollIntoView')`.
- **Why it costs money:** The examples are the proof used to sell the platform. A prospect testing the claimed website-to-booking path sees the core promise fail.
- **Required change:** Route price-page booking buttons to an existing target. If the booking section is not on that page, use a real URL rather than trying to scroll to a missing element.
- **Done when:** Every booking button on every example opens a valid booking path and preselects the intended service where appropriate.

#### P0-03 — One example sends the wrong service into booking

- **What was done:** On `/ex3/prices`, pressed “Book this” beneath the **$200 Interior Refreshment** service.
- **Expected:** Booking opens with Interior Refreshment selected.
- **What happened:** **$500 Signature Detail** remained selected. Interior Refreshment did not appear as an available choice in the embedded booking flow.
- **Why it costs money:** A customer may book the wrong job, abandon at the price difference, or force the detailer to correct it manually.
- **Required change:** Use a single service identifier from website card through booking selection. Prevent a public service from being published if its booking mapping is missing.
- **Done when:** An automated check visits every public service CTA and verifies the matching service name and price in booking.

#### P0-04 — The owner cannot tell whether important emails were delivered

- **What was done:** Reviewed `/admin` → Plumbing and used the dashboard reminder action.
- **Expected:** See each confirmation/reminder/quote/receipt as sent, delivered, delayed, bounced, suppressed, or failed, with the affected customer and booking.
- **What happened:** The dashboard said “Reminder sent to customer,” but the back office said Resend delivery/bounce was only “confirmed possible” and not wired in. The interface proves that a send was requested, not that the customer received it.
- **Why it costs money:** A missed confirmation or reminder can become a no-show, a wasted drive, a refund dispute, or an angry customer. The owner would not know which messages failed.
- **Required change:** Store and display Resend events for `sent`, `delivered`, `delivery_delayed`, `bounced`, `failed`, `suppressed`, and `complained`. Link each event to the message, booking, detailer, and recipient. Alert the owner on permanent failures.
- **Research basis:** Resend exposes these exact event types through webhooks in its [official event documentation](https://resend.com/docs/webhooks/event-types).
- **Done when:** A deliberately bounced test message appears in the back office with a clear next action, and a delivered test message is distinguishable from merely “sent.”

#### P0-05 — The privacy page is factually incomplete

- **What was done:** Read `/privacy`, then entered an address in booking.
- **Expected:** A page claiming to list everywhere information goes should name every outside service that receives customer information.
- **What happened:** The policy names Supabase, Netlify, Resend, Stripe, and Google. The booking address search visibly credits **Geoapify** and **OpenStreetMap**, meaning the typed address is sent outside the named list, but these services are omitted.
- **Why it costs money:** This is a trust and legal-exposure issue, especially because the policy makes an unusually absolute claim.
- **Required change:** Inventory all data processors and what each receives. Add Geoapify and any other address, weather, map, analytics, error-reporting, email, hosting, storage, or support services actually used. Separate active processors from planned integrations.
- **Done when:** A code/configuration inventory and the public policy match; removing or adding a processor triggers a policy review.

#### P0-06 — Destructive job actions are too easy to trigger

- **What was done:** Pressed “Mark completed” on the fake Tom Okafor job while exploring the Today screen.
- **Expected:** A confirmation, a short undo window, or an intermediate completion/payment screen before the record changes.
- **What happened:** The job changed to completed immediately, with no obvious confirmation or undo.
- **Why it costs money:** This will be used one-handed in a driveway. A stray tap can change reminders, reports, money, and customer status.
- **Required change:** Add an explicit confirmation showing customer, service, and time, followed by a visible undo option. Apply the same review to cancel, no-show, suspend, delete, waive, and owner-invite actions.
- **Done when:** No consequential state change can happen from one accidental tap, and every such action is recorded in an audit history.

#### P0-07 — There is no proved recovery path for the business's records

- **What was done:** Reviewed the public promises, data export language, and `/admin` Plumbing.
- **Expected:** Evidence that bookings, customers, photos, settings, and financial records can be restored after an error or outage—not merely exported on request.
- **What happened:** No restore test, restore date, recovery target, or outage history was visible. The policy/terms discuss asking Andrew for a copy or deletion, but the operational back office does not prove recovery readiness.
- **Why it costs money:** Once the owner relies on this for his livelihood, losing or corrupting the week's bookings is a business-stopping event.
- **Required change:** Define backup frequency and retention, run a restore into a safe environment, record the last successful restore test, and write a one-page recovery procedure. Protect the hosting/database accounts with MFA and restricted access.
- **Research basis:** Supabase's [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod) explicitly covers backups, point-in-time recovery, load testing, MFA, row-level security, and availability; its [shared-responsibility guide](https://supabase.com/docs/guides/deployment/shared-responsibility-model) makes application access, data, schema, and third-party monitoring the customer's responsibility.
- **Done when:** A test copy can be restored, opened, and checked against a known set of bookings, customers, and settings; the result and date appear in the owner back office.

### P1 — Fix before broad sales or replacing the old system

#### P1-01 — The money screen uses words that do not match the money

- **What was done:** Marked a demo job complete and reviewed Money.
- **Expected:** Clearly separated earned work, cash actually collected, amounts still owed, expenses paid, and cash remaining.
- **What happened:** The screen showed **$785 earned/brought in**, **$433 expenses**, **$352 net/kept**, **$320 in bank**, and **$465 still owed**. Calling $785 “brought in” is wrong when $465 is unpaid. Calling $352 “kept” makes it sound like cash, while collected cash less expenses is **-$113** using the displayed numbers. The back office also called the $785 “taken.”
- **Why it costs money:** The owner could make spending, tax, or hiring decisions using money that has not arrived.
- **Required change:** Use separate labels and calculations: **Earned**, **Collected**, **Still owed**, **Expenses paid**, and **Cash left after paid expenses**. Do not let “net” visually dominate unless its definition is unambiguous.
- **Done when:** A user can reconcile the headline figures from the visible jobs/payments/expenses, and unpaid work never appears as collected cash.

#### P1-02 — Platform account status contradicts itself

- **What was done:** Compared `/admin` Growth, Detailers, and the same detailer's dashboard.
- **Expected:** One source of truth for setup progress and booking status.
- **What happened:** Growth said one booking page “cannot take a booking,” then also said “The page works and nobody has used it.” Coastline showed **4/12** setup in admin and **10/12** inside the detailer dashboard. The same detailer appeared in several problem groups without a clear primary state.
- **Why it costs money:** The owner cannot tell who needs help or what to fix first. It also makes support outreach embarrassing if the diagnosis is wrong.
- **Required change:** Define each status in plain language and calculate it once. Distinguish “page technically works,” “page is configured,” “page has availability,” and “page has received a booking.” Show one primary blocking reason plus secondary warnings.
- **Done when:** The same account has the same setup count everywhere and cannot simultaneously be described as able and unable to book.

#### P1-03 — The back office cannot prove the product is healthy

- **What was done:** Reviewed `/admin` Plumbing.
- **Expected:** Current health plus recent failures for the public site, booking flow, sign-in, database, functions, email, storage, and scheduled jobs.
- **What happened:** The page said everything reporting in was reporting in, but Netlify was connected and not read, Supabase needed wiring, email delivery was not wired, and there was no outage history. Successful current jobs were prominent; missing monitoring was faint.
- **Why it costs money:** “No alarm” is being mistaken for “working.” A booking page could fail while the owner believes the platform is healthy.
- **Required change:** Add outside checks for homepage, booking start, booking availability, sign-in, and a safe database/function path. Store incidents and recovery times. Show failed background jobs, not only last success. Make missing monitoring amber/red.
- **Research basis:** Netlify's [Observability documentation](https://docs.netlify.com/manage/monitoring/observability/overview/) provides request, latency, function, and error visibility, while noting that native alerting and long-term retention are limited; external checks and/or a log destination are still needed. Its [function view](https://docs.netlify.com/manage/monitoring/observability/reference/functions/) can identify which functions are being called and how they behave.
- **Done when:** A controlled failure raises an alert, appears in incident history, identifies the affected path, and clears only after a successful check.

#### P1-04 — The product promises receipts and invoices, but their management is not obvious

- **What was done:** Reviewed pricing claims and searched the signed-in dashboard. Opened the quote and payment dialogs but did not finalize a fake payment.
- **Expected:** An obvious place to find, resend, correct, or download quotes, invoices, and receipts.
- **What happened:** A good quote dialog and payment-recording dialog exist, but no clear invoice/receipt history or management area was found.
- **Status:** **Needs verification**, not a proven missing feature, because the payment was not finalized.
- **Required change:** Run a full test payment record and inspect all customer/owner emails and records. If documents exist, make them discoverable. If they do not, narrow the sales claim until they do.
- **Done when:** An owner can answer “What was sent, when, to whom, did it arrive, and can I resend or correct it?” without hunting.

#### P1-05 — Address entry may allow unverified raw text

- **What was done:** Typed the mobile-service address and watched the Continue button.
- **Expected:** Continue stays disabled until a valid suggestion is chosen, or the product clearly accepts and labels a manually entered address.
- **What happened:** Continue became enabled before a suggestion was selected or validation visibly completed.
- **Status:** **Observed behavior; submission consequence untested** because no booking was submitted.
- **Why it costs money:** A malformed address can cause route errors, wrong service-area decisions, or wasted travel.
- **Required change:** Decide whether manual addresses are allowed. If not, require a selected result. If yes, label it “Use this address anyway,” preserve the raw value, and flag it for review.
- **Done when:** Automated tests cover selected, partial, nonexistent, out-of-area, apartment/unit, and manually accepted addresses.

#### P1-06 — Required fields are not identified correctly

- **What was done:** Worked through vehicle and contact details.
- **Expected:** Every required field is marked before interaction and the instruction names all required information.
- **What happened:** Vehicle year was required because Continue stayed disabled, but it was not marked required. On contact details, the instruction initially said name and phone were needed, while email was also required.
- **Why it costs money:** The button appears broken when the user has filled what the page told them to fill.
- **Required change:** Mark every required field consistently and keep the instruction synchronized with validation.
- **Done when:** A first-time user can predict exactly what is missing before pressing Continue.

#### P1-07 — Recurring plans overwhelm a one-time booking

- **What was done:** Reached the add-ons step.
- **Expected:** A short decision about useful extras, with recurring plans offered only if requested or after the booking succeeds.
- **What happened:** Four recurring plan choices appeared in a dense two-column set before the customer had even chosen a date.
- **Why it costs money:** It adds a large commitment decision at the moment the customer is trying to complete a simple purchase.
- **Required change:** Replace the four cards with one optional line such as “Interested in regular maintenance?” that expands on request, or offer plans after the booking request is complete.
- **Research basis:** Nielsen Norman Group's [progressive disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/) supports showing the few important choices first and revealing secondary choices when needed.
- **Done when:** A one-time customer can move from service to vehicle without reading membership terms, while an interested customer can still find the plans.

#### P1-08 — Calendar status is hard to read at a glance

- **What was done:** Used the month calendar.
- **Expected:** Distinguish day names, job states, blocked time, requests, confirmed jobs, completed jobs, and unpaid jobs without memorizing colors.
- **What happened:** Weekdays were single letters, making both S days and both T days ambiguous. Names were truncated, job-state colors lacked a full legend, and only “Blocked” was explained. The first partial week omitted blank cells and made the grid irregular.
- **Required change:** Use short weekday names, render a complete rectangular month, show a full status legend, and show the full customer/service when selected.
- **Done when:** A new user can correctly identify every visible state without trial and error.

#### P1-09 — The public price explanation contradicts itself

- **What was done:** Read example-site pricing language.
- **Expected:** A clear distinction between fixed prices and starting prices.
- **What happened:** Copy said variations of “Every figure is what you pay” and “nothing is added,” while later copy allowed condition, distance, size, and add-ons to change the amount.
- **Why it costs money:** It creates disputes and makes the business look slippery.
- **Required change:** Use one honest formula, for example: “The selected service price is fixed for the vehicle size shown. Optional add-ons, travel outside the included area, and unusually heavy condition are shown or agreed before work begins.” Only say “nothing added” if literally true.
- **Done when:** A customer can explain every circumstance that may change the displayed amount.

#### P1-10 — Calendar download links need an authorization review

- **What was done:** Followed a calendar-file link.
- **Expected:** A short-lived or appropriately scoped link that exposes only the intended event to the intended audience.
- **What happened:** The link contained a long Supabase function URL, booking identifier, `audience=owner`, and an anonymous API key.
- **Status:** **Security review required; no vulnerability was proved.** Public anonymous keys can be normal in Supabase, but the endpoint's authorization and information exposure must be tested.
- **Required change:** Test whether changing booking IDs or audience values exposes another account's data; verify row-level security and server-side authorization; consider signed, expiring links.
- **Done when:** Cross-account and altered-link tests fail safely and the result is documented.

### P2 — Fix to improve sales conversion and daily usability

#### P2-01 — `/examples` looks like an internal index, not sales proof

- **What was done:** Opened `/examples`.
- **Expected:** A visual portfolio showing what a detailer will receive.
- **What happened:** A plain text list of ex1 through ex5 appeared, with no thumbnails, styles, industries/markets, mobile views, or clear call to action.
- **Why it costs money:** The individual examples are some of the best-looking parts of the product, but the gallery hides that work.
- **Required change:** Build a screenshot gallery with one desktop and one phone preview per design, a short style label, useful feature tags, and “View live example.” End with a direct sales CTA.
- **Done when:** A prospect understands the range and quality without opening every example.

#### P2-02 — Pricing delays the information the visitor came for

- **What was done:** Opened `/pricing` and scrolled through the page.
- **Expected:** See the two plan choices and exact costs immediately, then supporting imagery and terms.
- **What happened:** A large heading/photo came before the actual decision. In the founding offer, $499, $40, and $80 savings received similar visual weight, so the savings could look like another charge. The booking-only section had a large empty area and the lower terms were faint.
- **Required change:** Put two plain plan cards near the top. Label build fee, ongoing fee, billing choices, commitment, and savings with different visual weight. Move the image below or beside them.
- **Done when:** In five seconds, a visitor can answer what each plan includes, what is due now, and what repeats.

#### P2-03 — The homepage animation makes the explanation take too long

- **What was done:** Scrolled through “Stop booking jobs in your DMs.”
- **Expected:** Understand the problem and product in one or two normal screenfuls.
- **What happened:** Several long scrolls advanced a controlled animation, with large empty black areas and a dashboard card that could look cropped midway through the transition.
- **Why it costs money:** It delays proof and can feel broken to impatient visitors.
- **Required change:** Shorten the sequence, allow normal scrolling, keep one clear before/after demonstration, and respect reduced-motion settings. Do not add more animation elsewhere.
- **Done when:** The full point is understandable even if animation does not run.

#### P2-04 — The homepage product proof is too small and dim

- **What was done:** Viewed the hero and supporting sections.
- **Expected:** Quickly judge the quality of the websites and dashboard being sold.
- **What happened:** The sample-site image in the hero was too small/dim to inspect, and secondary gray copy repeatedly receded into the dark background.
- **Required change:** Use a larger, brighter real product crop, preferably paired desktop/phone. Raise contrast on explanatory text and labels.
- **Done when:** The main screenshot remains readable without zooming and secondary text passes the contrast target below.

#### P2-05 — Important text is too faint for driveway use

- **What was done:** Reviewed marketing, booking, dashboard, Money, admin, and settings screens.
- **Expected:** Secondary text should still be readable in bright outdoor light and at a glance.
- **What happened:** Gray body copy, letter-spaced all-caps labels, progress text, tab labels, service details, and warnings were often too small or faint. In Plumbing, missing monitoring was visually quieter than successful jobs.
- **Required change:** Increase contrast and simplify micro-label styles throughout. Warnings should look more important than healthy background information.
- **Research basis:** WCAG 2.2 guidance calls for at least **4.5:1** contrast for normal text and **3:1** for large text; see the W3C's [contrast minimum explanation](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **Done when:** Automated contrast checks pass and real users can read the screens outdoors on representative phones.

#### P2-06 — Booking choices do not look interactive enough

- **What was done:** Used service, add-on, vehicle, and condition selection.
- **Expected:** Clear card boundaries, obvious selected states, and understandable controls.
- **What happened:** Service names, prices, and descriptions were dim; the eye icon for details was tiny and unclear; selected states relied too much on subtle outline/color changes; the progress label was faint.
- **Required change:** Use “See what's included” text, stronger card backgrounds/outlines, a clear check mark, more legible price/description text, and a stronger progress indicator.
- **Done when:** Users can name the selected choice without comparing shades.

#### P2-07 — The first booking step implies both categories are required

- **What was done:** Selected only an interior service.
- **Expected:** Wording that matches the valid choice.
- **What happened:** Both Exterior and Interior said “choose one,” although choosing only Interior was allowed.
- **Required change:** Use “Optional—choose one” for each category or explain the actual rule once above the categories.
- **Done when:** The words never imply a requirement the form does not enforce.

#### P2-08 — The booking footer can cover content

- **What was done:** Scrolled the add-on/plan step.
- **Expected:** Sticky actions remain useful without hiding the last choice.
- **What happened:** The full-width sticky footer could cover lower plan-card content.
- **Required change:** Add sufficient bottom space, reduce footer height, and test on small phones with browser controls and the on-screen keyboard visible.
- **Done when:** Every field and choice can be fully read and tapped above the footer.

#### P2-09 — The booking layout wastes desktop space

- **What was done:** Used booking on a wide screen.
- **Expected:** A focused form without feeling like a phone mock-up floating in an empty page.
- **What happened:** The narrow column was clean, but surrounded by very large black margins.
- **Required change:** On wide screens, use the spare area for a persistent booking summary, trust information, what happens next, and business contact details. Keep the single-column form on phones.
- **Done when:** Wide layout adds reassurance without increasing the number of decisions.

#### P2-10 — Translation is only partial

- **What was done:** Switched the booking flow to Spanish.
- **Expected:** All customer-facing text changes language or the toggle clearly states the limits.
- **What happened:** Interface text changed, but service and add-on names remained English.
- **Required change:** Support translated business content or remove/rename the language promise until it is complete. Define fallback behavior for untranslated custom content.
- **Done when:** A Spanish-language test booking contains no unexplained English except proper names/brands.

#### P2-11 — The dashboard setup warning is too empty to act on

- **What was done:** Opened Today and inspected “Your page isn't fully set up.”
- **Expected:** Immediately see the blocking items and the next action.
- **What happened:** The collapsed banner showed an empty-looking list and “and 2 more.” Expanding revealed items such as Where you work and Messages.
- **Required change:** Show the top one or two blocking tasks in the collapsed state with direct buttons.
- **Done when:** The owner can act without expanding or hunting through settings.

#### P2-12 — Client list lacks basic labels

- **What was done:** Opened Clients.
- **Expected:** Column headings or a card structure that explains last visit, lifetime spend, and phone.
- **What happened:** Values appeared without headers, so their meaning had to be inferred. “9 gone quiet” was also vague and not clearly actionable.
- **Required change:** Add labels and define “gone quiet” using an exact period and a useful action such as “Send rebooking message.”
- **Done when:** A first-time user can correctly describe each value and what clicking the segment will do.

#### P2-13 — Business settings waste half the screen

- **What was done:** Used the Business area on desktop.
- **Expected:** Efficient use of space, particularly while editing customer-facing settings.
- **What happened:** Controls were left-heavy with a large unused right side.
- **Required change:** Put a live customer-page preview in the right column and stack it below controls on phones. Show the exact effect of service, hours, coverage, and copy changes.
- **Done when:** Editing a setting produces a visible preview without opening a separate page.

#### P2-14 — Manual booking briefly says there are no services

- **What was done:** Started a new manual booking.
- **Expected:** A loading state until services arrive.
- **What happened:** “No active services yet” flashed before the services loaded.
- **Required change:** Replace false empty states with a loading skeleton/spinner and only show “no services” after a completed empty response.
- **Done when:** Slow-network tests never display a false business problem.

#### P2-15 — The calendar's booking-rules conflict needs a stronger resolution path

- **What was done:** Reviewed Business booking rules.
- **Expected:** Conflicting rules should explain the customer consequence and offer a direct correction.
- **What happened:** The product correctly warned that two-hour booking notice combined with a 24-hour change/cancellation cutoff can immediately lock a new booking. The warning was useful but can be made more actionable.
- **Required change:** Keep the warning, state an example, and provide a one-click recommended adjustment.
- **Done when:** No conflicting rule can be saved without explicit acknowledgment.

#### P2-16 — Visible chart copy looks like an internal note

- **What was done:** Reviewed Money charts.
- **Expected:** Customer-facing labels that explain the measure and period.
- **What happened:** “Tallest bar $741” appeared like a developer/accessibility note exposed in the interface.
- **Required change:** Remove it from visible presentation or turn it into a proper caption such as “Highest day: $741 on [date]” if that information matters.
- **Done when:** No visible copy sounds like an implementation note.

### P3 — Back-office clarity and polish

#### P3-01 — Test accounts dominate the real-detailer list

- **What was done:** Opened `/admin` → Detailers.
- **Expected:** Real customers first, test data clearly separated.
- **What happened:** The default Everyone view showed 16 rows: 15 demo/test accounts and one real account. Elsewhere test accounts were excluded, making the admin inconsistent.
- **Required change:** Default to Real detailers. Put demo/test accounts behind a separate filter or environment. Add an unmistakable DEMO/TEST badge.
- **Done when:** A production support task never requires scanning test rows.

#### P3-02 — Detailer cards are too crowded to scan

- **What was done:** Scanned the Detailers page and opened Coastline.
- **Expected:** Quickly find account, state, setup, latest activity, and required action.
- **What happened:** A three-column wall of cards used tiny monospaced metrics and made real versus demo hard to distinguish.
- **Required change:** Use a list/table with: Detailer, account status, setup, last booking, earned, customers, primary warning, and action. Open details in a side panel or dedicated page.
- **Done when:** The owner can identify the only account needing attention in under ten seconds.

#### P3-03 — Admin Today repeats itself instead of resolving the issue

- **What was done:** Opened `/admin` → Today.
- **Expected:** One prioritized issue with one next action.
- **What happened:** “One thing needs you” was useful, but “What to look at, in order” repeated the urgent account in another wide card. Cards had large empty areas and did not clearly distinguish severity.
- **Required change:** Put diagnosis and action in the first card. Remove the duplicate. Use clear Critical / Needs attention / Informational levels.
- **Done when:** Every issue appears once and includes owner, impact, and next action.

#### P3-04 — Admin Growth is a wall of contradictory prose

- **What was done:** Opened Growth and followed each status group.
- **Expected:** A funnel or stage view with counts, affected accounts, and next actions.
- **What happened:** One account appeared in setup incomplete, cannot book, never booked, and no website. Explanations repeated, contradicted each other, and included internal-sounding text such as “This is the sentence that closes a sale.” Missing data was described in a “Not here yet” block.
- **Required change:** Use stages such as Created → Configured → Bookable → First booking → Active. Give each account one furthest stage, separate warnings, and an expandable account list. Remove coaching/developer slogans from production UI.
- **Done when:** The counts reconcile and each account has one clear next action.

#### P3-05 — Admin zero-state copy claims success without evidence

- **What was done:** Read the Today money summary with no paying subscriptions.
- **Expected:** A neutral zero state.
- **What happened:** Copy said `$0 went through it this month` and treated that as proof the product works.
- **Required change:** Say plainly that there is not yet subscription revenue or enough production data to judge the payment/subscription system. Stripe-related implementation remains excluded from this audit.
- **Done when:** Zero-data states never claim validation.

#### P3-06 — The owner cannot see operating profit

- **What was done:** Reviewed `/admin` → Money.
- **Expected:** Subscription revenue, refunds/credits, and the costs of running the platform.
- **What happened:** Pricing and a platform promo code were visible, but hosting, database, email, domains, and other operating costs were not.
- **Required change:** Add monthly operating costs and a simple revenue-minus-cost view. Manual cost entry is acceptable initially.
- **Done when:** The owner can answer whether the platform itself made or lost money this month.

#### P3-07 — Plumbing visually rewards success and hides absence

- **What was done:** Scanned Plumbing.
- **Expected:** Missing protection should be the loudest information.
- **What happened:** Working scheduled jobs were green and prominent. Unwired Netlify, Supabase, Resend, and outage history were faint gray. “Something watching from outside” sounded like developer shorthand.
- **Required change:** Use plain labels: “External booking check,” “Email delivery tracking,” “Database health,” and “Incident history.” Missing protection should be amber/red with an action.
- **Done when:** The most dangerous blind spot is visually first.

#### P3-08 — Support access needs clearer controls

- **What was done:** Pressed “Look at their dashboard.” The action opened a separate support view/tab and then disabled the button. The view appeared read-only during the review.
- **Expected:** Clear notice of which account is being viewed, a read-only banner, audit record, and a deliberate exit.
- **What happened:** The basic behavior worked, but the security/audit controls were not evident.
- **Required change:** Add “Viewing as support — read only,” record who opened it and when, prevent mutations, and provide “Return to admin.”
- **Done when:** Attempted state changes fail, and the access appears in an audit history.

#### P3-09 — Terms and privacy copy undermine confidence

- **What was done:** Read `/terms` and `/privacy`.
- **Expected:** Plain, internally consistent terms that sound settled enough to sell a business product.
- **What happened:** Both state that Andrew wrote them and they have not been reviewed by a lawyer. The terms say that if anything conflicts with final terms, the version “better for you” applies. Export, ownership, copy, and deletion language differs between pricing and legal pages.
- **Required change:** Have a qualified adult/professional review the documents before broad sales. Align the promises across pricing, terms, and privacy. Replace improvised conflict language with a version/date and a clear change process.
- **Done when:** The same promise about data access, domain/site ownership, cancellation, export, and deletion appears everywhere.

#### P3-10 — Planned features are mixed into current privacy language

- **What was done:** Read the processor/feature descriptions.
- **Expected:** Separate what happens today from what might happen later.
- **What happened:** A future Google Business Profile feature was described even though it was not active.
- **Required change:** Put planned integrations in a clearly labeled future section or add them only when enabled.
- **Done when:** The policy describes actual current data flows first.

#### P3-11 — Onboarding tours sound exhausting

- **What was done:** Opened Settings and saw “Six short tours, up to 37 steps.”
- **Expected:** Help at the moment it is needed.
- **What happened:** A 37-step total is likely to feel like work even if split into tours.
- **Required change:** Use short contextual prompts tied to unfinished setup, plus an optional searchable help area.
- **Done when:** A new owner can become bookable without completing a long general tour.

---

## 4. Route-by-route visual repair brief

These are visual changes that improve understanding or trust. They are not requests to decorate the product.

### `/` — Marketing home

**Keep:** The dark visual identity, direct pain-focused headline, and core “run the week” position.

**Change:**

- Shorten the scroll-controlled DM demonstration.
- Replace large empty black intervals with a compact before/after story.
- Enlarge and brighten the real product view in the hero.
- Show a desktop website and phone booking view together.
- Raise the contrast of secondary copy.
- Avoid any more animation until the page can be understood with motion disabled.

**Visual score:** 7/10.

### `/pricing`

**Keep:** Exact prices and founding offer.

**Change:**

- Put the two buying choices above the large image.
- Use separate lines for one-time build cost and repeating cost.
- Make savings visually secondary so `$80` cannot look like a third charge.
- Explain annual, commitment, and no-commitment choices in the plan card, not buried lower.
- Reduce the empty booking-only area.
- Increase terms contrast.

**Visual score:** 5/10.

### `/examples`

**Keep:** The five distinct example destinations.

**Change:**

- Replace the text list with large screenshot cards.
- Show both desktop and phone crops.
- Name the design style in normal language: clean/luxury, bold/performance, mobile-first, etc.
- Add “View live example” and “Build mine like this.”
- Do not call the items ex1, ex2, and so on in customer-facing headings.

**Visual score:** 3/10.

### Individual example sites

**Keep:** They are the best public proof and look genuinely different rather than like recolored copies.

- `/ex1` Prime: polished hero and strongest proof. Repair booking navigation.
- `/ex3` Ballantyne: clean; hero is very tall. Repair service mapping. Theme controls are acceptable in a demo but should not distract from the website itself.
- `/ex5` Tampa Bay: strong, loud identity. The review badge/pill is partly obscured by the ceramic coating card and needs spacing/z-order correction.

**Visual score:** 8/10 overall.

### `/book/demo-detail`

**Keep:** Focused central flow, running total, final itemized review, and the new sentence explaining that the business confirms the requested time by email.

**Change:**

- Show surcharges at the moment the triggering choice is made.
- Make the progress indicator readable.
- Replace the eye icon with “See what's included.”
- Strengthen selected states.
- Hide recurring plans until requested.
- Mark required fields.
- Use desktop side space for a persistent summary and reassurance.
- Prevent the sticky footer from covering content.
- Complete or narrow Spanish support.

**Visual score:** 6/10.

### `/app` — Today

**Keep:** This is the strongest working screen: jobs, expected/collected, requests, upcoming work, quick contact, navigation, weather, photos, reminders, and job actions are relevant to a detailer's day.

**Change:**

- Make unfinished setup tasks immediately actionable.
- Add confirm/undo to completion and other consequential actions.
- Increase outdoor readability of labels and secondary details.
- Preserve the focused quote/payment dialog style.

**Visual score:** 7/10; quote/payment dialogs 8/10.

### `/app` — Calendar

**Change:** Use unambiguous weekday names, full rectangular weeks, a complete state legend, and more readable selected-job detail.

**Visual score:** 6/10.

### `/app` — Money

**Change:** Fix meaning before styling. Then visually separate earned work, collected money, owed money, paid expenses, and cash remaining. Remove the visible “Tallest bar” implementation-like note.

**Visual score:** 6/10.

### `/app` — Business

**Change:** Use the empty right side for a live booking-page preview. Keep warnings near the conflicting settings and provide one-click fixes.

**Visual score:** 5/10.

### `/admin` — Today

**Change:** One issue, one card, one action. Reduce repeated wide cards and increase severity distinction.

**Visual score:** 5/10.

### `/admin` — Growth

**Change:** Replace the prose wall with a simple stage view and expandable account list. Remove internal sales/developer commentary.

**Visual score:** 4/10.

### `/admin` — Detailers

**Change:** Replace the card wall with a scannable list/table, default to real accounts, and surface one primary action.

**Visual score:** 3/10.

### `/admin` — Plumbing

**Keep:** Grouping operational systems in one place is correct.

**Change:** Make missing monitoring louder than healthy jobs; use normal business language; add incident and failure history.

**Visual score:** 6/10 for structure, lower for prioritization.

---

## 5. What a working detailer would actually want

### What is genuinely useful

- A custom site that is already connected to services and availability.
- A day view that answers who, where, when, what service, and how to contact/navigate.
- Customer history, requests, calendar, reminders, photos, quotes, and payment status in one place.
- Detailer-specific rules about vehicle, condition, travel area, timing, add-ons, and recurring maintenance.
- No commission penalty for a busy month.
- Owner and staff roles with usable permission controls.

### Where a real detailer gets frustrated and returns to the old way

- A customer says they never received the confirmation and the product cannot prove delivery.
- The money screen suggests cash is available when it is still owed.
- An accidental tap completes or cancels a job.
- A booking contains the wrong service or a bad address.
- The public site works differently from the settings the owner sees.
- The detailer has poor signal in a driveway and the day cannot be opened or updated.
- A quote, receipt, or invoice cannot be found and resent immediately.
- The platform is down and there is no paper/export/calendar fallback for the day.

### Would a customer want this booking flow?

Mostly, if they already trust the business. The final review is clear and the flow gathers relevant detail. The likely abandonment points are the crowded membership step, unexplained required fields, and the late weekend charge. I would book through it only after the weekend fee is disclosed at selection time and the public service links reliably preserve the chosen service.

---

## 6. What is missing before people should pay

### Required for a controlled paid pilot

- All public booking links and service mappings pass.
- All automatic surcharges appear before leaving date/time selection.
- Email delivery/failure/bounce tracking.
- Destructive-action confirmation and undo.
- Correct money definitions.
- Complete processor/privacy inventory.
- An external booking health check and incident alert.
- A tested backup/restore procedure.
- A real-phone pass on iPhone and Android.
- Full end-to-end booking, confirmation, reminder, reschedule, cancellation, quote, and receipt/invoice tests.

### Required before the owner drops his old system

- At least several weeks of real parallel use without lost or duplicated bookings.
- A tested outage fallback for the next day's schedule and customer contacts.
- Weak-signal behavior understood and acceptable.
- Successful export and restore drills.
- Clear audit history for admin/support actions.
- Reconciliation of earned, collected, owed, and expenses against the old records.

### Valuable later, but not a reason to delay the core pilot

- Accounting integrations.
- Route optimization.
- Rich vehicle inspection/photo workflow.
- Review-request automation.
- Deeper profit-by-job reporting.
- Broader integrations.
- Native-app polish, if the web app performs reliably on phones.

Do not respond to mature competitors by copying their entire feature lists. The near-term advantage is simpler detailer-specific software plus a genuinely good website. Reliability has to be better than breadth.

---

## 7. What is present but should be removed, hidden, or reduced

- Four recurring plan cards in the middle of a one-time booking.
- The long scroll-controlled homepage sequence.
- Test/demo accounts in the default production admin list.
- Internal-sounding copy such as “This is the sentence that closes a sale.”
- Developer-like chart text such as “Tallest bar $741.”
- Claims that zero activity proves the product works.
- Future integrations mixed into descriptions of current data use.
- Repeated admin cards describing the same issue.
- Absolute pricing language that is contradicted by condition, distance, size, or add-ons.
- Low-value all-caps micro-labels that are hard to read outdoors.

---

## 8. Competitive reality

The product is not competing only with other detailing software. It is competing with a free booking tool, general field-service suites, detailer-specific systems, and the simplicity of a phone plus calendar.

| Alternative | Current official positioning relevant to this review | Why a detailer might stay there | Detailing Platform's credible reason to switch |
|---|---|---|---|
| [Square Appointments](https://squareup.com/us/en/appointments) / [pricing](https://squareup.com/us/en/appointments/pricing) | Free subscription tier; online booking, calendar, reminders, waitlists, and rescheduling | Known brand, low entry price, mature booking | A better custom website and detailer-specific intake/rules—only if the booking experience is flawless |
| [Jobber](https://www.getjobber.com/pricing/) | Core pricing observed at $49 month-to-month, $39 with one-year commitment, or $29 billed annually; booking, quotes, invoices, website, reporting, integrations | Broad field-service workflow and integrations | A simpler solo-detailer day and a more distinctive website at a comparable ongoing cost |
| [Housecall Pro](https://www.housecallpro.com/pricing/) / [online booking](https://www.housecallpro.com/features/online-booking/) | Basic pricing observed at $79 month-to-month or $59 annually; scheduling, estimates/invoices, job costing, reviews, mobile/offline capability | Mature operations and mobile support | Less complexity and a service specifically shaped around detailing |
| [Urable](https://urable.com/) / [workflows](https://urable.com/workflows/) / [inspections](https://urable.com/inspections/) | Automotive-specific quoting/invoicing, messaging, job profit, routing, workflows, photo/video inspections | Deep automotive operations | Easier website + booking setup for a small operator who does not need the full shop system |
| [Mobile Tech RX](https://www.mobiletechrx.com/) | Scheduling, pricing, branded invoices, accounting, payments, photo documentation, reports | Established detailer/auto-reconditioning feature set | A cleaner customer-facing site and simpler solo workflow |
| Phone, texts, paper, and calendar | No software learning or monthly bill | Familiar, flexible, works around exceptions | Fewer missed inquiries, automatic availability and reminders, organized customer history, and a professional booking experience |

### The pricing problem in plain language

The **$35 booking-only plan** has to overcome Square's free tier. “No commission” is useful but not sufficient by itself. The booking must feel specifically better for detailing and save obvious time.

The **$499 build plus $40/month full-site plan** can be credible against Jobber and Housecall Pro if the websites visibly look better and the booking-to-dashboard path never breaks. The current individual examples support that story; the current `/examples` gallery and broken buttons damage it.

### Strongest defensible position

“A genuinely custom-looking website, detailer-specific booking, and a simple working-day dashboard—set up by someone who runs a mobile detailing business.”

That is narrower and more believable than claiming to replace every mature field-service tool immediately.

---

## 9. Reliability, security, and operating checklist

This section should become an explicit workstream, not leftover engineering chores.

### Messaging

- Store send request, provider message ID, recipient, booking, type, timestamp, and current delivery state.
- Process delivered, delayed, bounced, failed, suppressed, and complaint events.
- Show a customer-level communication history.
- Alert on permanent failures and give a call/text fallback.
- Test confirmation, acceptance, reminder, quote, receipt/invoice, cancellation, and reschedule messages.

### Booking health

- External check that loads a real public booking page.
- Check that at least one service and one valid availability result render for a controlled test account.
- Alert when an active detailer has no services, no coverage area, no future availability, a suspended account, or a public error.
- Track response time and failed requests.

### Application and hosting health

- Monitor homepage, examples, booking, dashboard sign-in, owner sign-in, database/function path, and photo storage.
- Keep incident start, detection, recovery, cause, and affected accounts.
- Keep failed scheduled/background job history, not only current success.
- Use Netlify request/function visibility, but add external alerting and retention because the official docs say native observability has no alerting and limited retention.

### Data protection

- Confirm RLS on every customer/business table and storage path.
- Test cross-detailer access with altered identifiers.
- Test calendar/export/download links.
- Enable MFA for production owner accounts.
- Define backup frequency/retention and run restore drills.
- Test complete account export and deletion against public promises.
- Keep production separate from test/demo data.

### Admin/support control

- Audit support-view opens, suspensions, owner invitations, role changes, exports, deletions, and manual record changes.
- Show actor, account, action, timestamp, and before/after state where meaningful.
- Make support view unmistakably read-only unless a separately authorized edit mode is intentionally designed.

### Field conditions

- Test current-day viewing after signal loss.
- Test safe retry when an update is interrupted.
- Prevent duplicate bookings or duplicate actions after retry.
- Provide a printable/downloadable next-day schedule and customer contact fallback.

---

## 10. Research and tests still required

These are gaps in the review, not assumptions about defects.

### Real-device mobile study

Use at least one smaller iPhone and one common Android phone. Test one-handed in bright daylight with normal browser controls visible. Include the on-screen keyboard, sticky footer, address suggestions, date picker, dashboard actions, calendar, customer call/text, photo upload, and admin emergency use. Record where thumbs cannot reach, content is covered, or text becomes unreadable.

### Five-customer booking test

Give five people a simple task without coaching: “Book an interior detail for Saturday morning at your address; stop before confirming.” Watch where they hesitate, misread price, miss required fields, or ask what happens next. Do not explain the interface during the task.

### Three-detailer working-day test

Ask working solo detailers to plan a day, accept a request, navigate, contact a customer, add a photo, send a reminder, complete a job, record partial payment, find money owed, reschedule, and handle a cancellation. Compare time and errors against their present method.

### Full lifecycle test matrix

Run and retain evidence for:

1. Website service CTA → correct preselected service.
2. New booking request → owner notification and customer acknowledgement.
3. Owner accepts/declines → customer receives correct result.
4. Reminder → delivered and visible in history.
5. Customer reschedules/cancels inside and outside allowed windows.
6. Quote sent → customer action → job created/updated.
7. Completion → payment status → invoice/receipt created and resent.
8. Part payment, waived amount, extra charge, discount, refund/correction.
9. Invalid/out-of-area/manual address.
10. Duplicate tap, browser back, refresh, expired link, and weak connection.
11. Export → verify completeness.
12. Backup restore → verify counts and sample records.

### Legal/data-flow inventory

Trace every form and background task to its storage and outside recipient. Include hosting, database, authentication, email, address search, maps, weather, analytics, error tracking, image storage/transformation, calendar files, support tools, and future Google integration. A lawyer or qualified professional should review the final terms/privacy language before broad sales.

### Performance and accessibility

- Test public pages and booking over slow mobile data.
- Measure time until a service can be selected and until availability appears.
- Run keyboard-only and screen-reader checks.
- Run automated contrast checks, then verify outdoors because automated checks do not reproduce glare.
- Check reduced motion.
- Check zoom and large text.

---

## 11. Release gates for the planning agent

Use these as outcome-based milestones rather than organizing the work only by page.

### Gate A — Safe private pilot

- P0-01 through P0-07 closed or explicitly risk-accepted with a temporary safeguard.
- Every example booking CTA passes an automated mapping check.
- One complete test booking lifecycle passes.
- Real-device phone pass completed.
- External booking and email-failure alerts work.

### Gate B — Owner runs in parallel

- Money screen reconciles against old records.
- Confirm/undo and audit history work.
- Daily export/fallback is available.
- At least ten real owner jobs complete with no lost state or missed message left invisible.

### Gate C — Owner can retire the old system

- Several weeks of parallel operation reconcile.
- Restore drill passes.
- Weak-signal and retry behavior passes.
- Cancellation/reschedule/quote/receipt lifecycle passes.
- Owner can recover tomorrow's schedule during an outage.

### Gate D — Sell broadly to strangers

- Priority-zero and priority-one issues closed.
- Legal/data-flow pages match reality.
- `/examples` and pricing communicate the product without assistance.
- Admin identifies failures and affected accounts before customers report them.
- At least a small group of pilot detailers has completed real jobs successfully and their support failures have been addressed.

---

## 12. Items that improved during the review or should not be reopened blindly

- **Homepage price mismatch:** An earlier pass saw standard $999/$60 pricing against the $499/$40 founding offer. On the deeper rerun, the homepage eventually showed the founding prices consistently. Treat this as a regression test, not an open defect unless it reappears.
- **Booking confirmation wording:** The date/time step now says the business confirms each booking and an email follows after acceptance. Keep this wording.
- **Promo code `DEMO25`:** It appeared in the platform-owner subscription area. It was invalid in the customer booking promo field, which does **not** prove a bug; these appear to be different promo systems.
- **No 404s:** None of the listed or reached routes returned a 404 during the review. Broken behavior still occurred on live pages.
- **Team permissions:** Owner/detailer roles and custom permissions for Money, requests, settings, and promotions exist. Do not plan them as wholly missing.
- **Reminder feedback:** “Reminder sent to customer” is useful immediate feedback. Keep it, but add delivery results later.
- **Booking-rule warning:** The product already detects a notice/cancellation conflict. Improve the resolution path rather than removing it.

---

## 13. What was actually reached

### Public routes reviewed

- `/`
- `/pricing`
- `/examples`
- `/book/demo-detail` through the final “Request this time” review, without submission
- `/terms`
- `/privacy`
- `/ex1`, `/ex1/prices`, `/ex1/work`
- `/ex2`
- `/ex3`, `/ex3/prices`
- `/ex4`
- `/ex5`

### Signed-in areas reviewed

- `/app`: Today, calendar, money, clients, business/settings, team, manual booking, quote and payment dialogs
- `/admin`: Today, Growth, Money, Detailers, Plumbing, account detail, and support dashboard view

### Not fully proved

- True phone rendering and touch behavior
- Final booking submission and all resulting emails
- Final payment save and actual invoice/receipt output
- Reschedule/cancellation customer links
- Weak/offline behavior
- Data export contents
- Backup restore
- Cross-account security/authorization
- Production load behavior

---

## 14. Test record and side effects

- Booking scenario: Interior Deep Clean $150, pet hair $40, medium vehicle +$15, heavy condition, mobile service address in Long Beach, Saturday 9:00 AM. Total changed from $205 to $235 because a $30 weekend rate appeared after the time step. Booking was not submitted.
- Spanish mode was opened; interface translated partially while service/add-on names stayed English.
- A reminder was sent to fake/demo customer Tom Okafor at a 555 number.
- Tom Okafor's fake/demo job was marked completed while testing the one-tap action.
- The final-payment dialog was opened but not saved.
- A support dashboard view was opened; it appeared read-only.
- The review used one working browser tab as requested, except the support-view control opened a second tab automatically; it was closed immediately.

---

## 15. Final instruction to the implementation-planning agent

Do not create a plan that starts with visual polish. Organize the plan in this order:

1. **Booking truth:** correct service, correct address, complete price before continuation.
2. **Communication proof:** sent is not delivered; show failures and fallbacks.
3. **State safety:** confirmations, undo, audit history, cross-account checks.
4. **Money truth:** earned is not collected; make every number reconcilable.
5. **Recovery:** outside health checks, incidents, backups, tested restore, daily fallback.
6. **Sales proof:** examples gallery, working example CTAs, clear pricing, aligned legal promises.
7. **Field usability:** real phones, outdoor contrast, weak signal, one-handed actions.
8. **Admin efficiency:** real accounts first, one status source, one issue/one action.
9. **Then polish:** whitespace, previews, labels, responsive layout, and reduced animation.

Every task should include a reproduction case, the customer/business consequence, an acceptance test, and whether it blocks private pilot, owner migration, or broad sales. Do not infer that an item is fixed because the screen looks better; retest the complete customer or operator outcome.

