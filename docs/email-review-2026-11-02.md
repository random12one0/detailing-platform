# Rendered email review and delivery coverage — 3.4g

The code follow-up at the end of this report resolves findings A and F and
localizes the sample inputs behind E. The original review below is retained
as the before-state; sandbox delivery is still unproven.

Reviewed November 2, 2026 (Pacific), against `0da053ddb7aab3b9a6b05954db82578f24be1cf7`.
This pass renders, reads and records evidence only. No email was sent, no
database row was changed, and nothing was pushed or deployed. It supersedes
older branch-only reports that described Spanish as unreviewed or every
template as never sent. Their sender rewrites and approval machinery were
not adopted: they are unnecessary for this read-only review.

## What was reviewed

Run from the review worktree:

```powershell
$env:TRACKED_RECEIPTS='0'
node scripts/render-emails.mjs
node scripts/render-emails.mjs --lang=es
node --input-type=module -e "import * as t from './supabase/functions/_shared/emailTemplates.ts'; console.log(Object.keys(t).filter(k=>/Email$/.test(k)&&typeof t[k]==='function'))"
```

The live module exports **18 HTML email builders**. The renderer exercises
each builder through **35 named variants per language**, yielding **70 HTML
pages and 70 plain-text alternatives**. This is coverage of every exported
builder, not a claim to exercise every optional field combination. Subject,
addressing, formatting and alert-data helpers are not additional templates.
The roster below is taken from the renderer at this revision, not an old
ROADMAP count. Each row's English and Spanish subject, HTML body and text
alternative was read. All screenshots at the three widths were also visually inspected.

Both renderer runs passed: 35 discovered/completed targets and 176 assertions
per run; the rotten-body canary triggered 3 of 4 patterns. These checks do
**not** establish American English, delivery or human approval.

## Findings

- **A — American English defect:** `customer-cancellation` says "Your booking
  is cancelled" and "has been cancelled"; `customer-restored` says "was
  cancelled"; both owner cancellation variants say "is cancelled". Three
  cancellation subjects also use "cancelled". Use **canceled** in prose and
  subjects. The bare status label and internal `cancelled` keys are a separate
  case; the repository's exception does not exempt whole sentences. The word
  list in `scripts/american-english.mjs`, applied to these finished subjects
  and text bodies, identified these four affected variants. No other listed
  British spelling was found.
- **E — English supplied content in Spanish previews:** the campaign subject
  and paragraphs remain English, while its greeting, button and opt-out are
  Spanish. These values come directly from `c.subject`/`c.message`, not missing
  translation keys. Other preserved input includes service/add-on names,
  `Mid-size SUV`, `Outer ring`, `Heavy soiling surcharge`, plan/maintenance
  names, customer/quote/payment notes, `Loyal customer`, the custom `Detailer`
  role label and the free-text payment instructions. The renderer deliberately
  supplies English to those fields in both runs. These are mixed-language
  samples, not proof of fully Spanish authored content. Fixed template prose,
  dates, labels and footers were Spanish throughout; seeded `Large`/`Small`
  became `Grande`/`Pequeño`. Do not silently translate customer or business
  input as a translation-key fix.
- **F — Stale sample invite:** its September 10 expiration precedes the review
  date. The expiration field and fallback URL render correctly; the fixture
  should use a future date before it is presented as a usable example.
- No unresolved interpolation markers, `undefined`, `NaN`, `[object Object]`,
  empty action URLs, replacement characters, empty fact values or missing
  plain-text alternatives were found. Dates/times, vehicle counts, totals,
  contact details and action labels agree with the supplied cases. The paid
  cancellation specifies a $360 refund; the invoice/receipt shows
  $345 + $30 - $15 = $360. The multi-car estimate is $839 and plan estimate
  $288. Campaign and maintenance footers contain the postal address and opt-out.

## Per-variant review and historical coverage

Every row below was reviewed in **both languages**. "Clear" means no further
issue observed in that sample; it is not inbox-client certification. E applies
where the supplied editable fields are English as described above. Every
variant is **NOT SENT ON THIS PASS — prohibited by the task**. None is labelled
intrinsically unsendable merely because it lacks a historical delivery row.

`Delivered legacy` is subject-family evidence of an older English request
email, not proof of the current bytes. `No proof` means no matching successful
send was found in the retained table. Branches sharing a subject cannot inherit
each other's coverage; family counts are shared, not added per variant.

| Preview ID | Exported builder | EN review | ES review | Retained family evidence |
|---|---|---|---|---|
| customer-confirmation | customerConfirmationEmail | Clear | E | No proof; confirmation family 28 skipped |
| customer-request-received | customerConfirmationEmail | Clear | E | Delivered legacy: 10; 1 skipped |
| customer-reminder | customerReminderEmail | Clear | E | No proof; 15 skipped |
| customer-quote | requestDecisionEmail | Clear | E | No matching rows |
| customer-accepted | requestDecisionEmail | Clear | E | No matching rows |
| customer-declined | requestDecisionEmail | Clear | Clear | No matching rows |
| customer-receipt | invoiceEmail | Clear | E | No proof; 1 skipped |
| customer-invoice | invoiceEmail | Clear | E | No matching rows |
| customer-invoice-card | invoiceEmail | Clear | E | No matching rows; card branch cannot be inferred |
| customer-reschedule | rescheduleEmail | Clear | E | No proof; 1 skipped |
| customer-cancellation | cancellationEmail | A | Clear | No proof; customer cancellation family 2 skipped |
| customer-restored | restoredEmail | A | E | No proof; 1 skipped |
| customer-followup | followupEmail | Clear | Clear | No proof; 1 skipped |
| owner-new-booking | ownerNewBookingEmail | Clear | E | No proof; new-booking family 45 skipped |
| owner-new-request | ownerNewBookingEmail | Clear | E | No proof; request-owner family 11 skipped |
| owner-new-booking-typed | ownerNewBookingEmail | Clear | E | No proof; shares new-booking family |
| owner-new-booking-picked | ownerNewBookingEmail | Clear | E | No proof; shares new-booking family |
| owner-new-booking-carload | ownerNewBookingEmail | Clear | E | No proof; shares new-booking family |
| customer-confirmation-carload | customerConfirmationEmail | Clear | E | No proof; shares confirmation family |
| owner-reschedule | rescheduleEmail | Clear | E | No proof; 1 skipped |
| owner-cancellation | cancellationEmail | A | Clear | No proof; owner cancellation family 2 skipped |
| owner-cancellation-paid | cancellationEmail | A | Clear | No proof; shares owner cancellation family |
| owner-stale-request | staleRequestEmail | Clear | Clear | No proof; 12 skipped |
| staff-invite | inviteEmail | F | E, F | No proof; 1 skipped |
| customer-confirmation-plan | customerConfirmationEmail | Clear | E | No proof; shares confirmation family |
| customer-plan-link | planLinkEmail | Clear | E | No matching rows |
| customer-maintenance-far | maintenanceDueEmail | Clear | E | No matching rows |
| customer-maintenance-last | maintenanceDueEmail | Clear | E | No matching rows; urgency branch cannot be inferred |
| owner-plan-cancelled | planCancelledEmail | Clear | E | No matching rows |
| customer-campaign | campaignEmail | Clear | E | No matching rows; subject is free text |
| platform-payment-failed | billingEmail | Clear | Clear | No matching rows |
| platform-suspended | billingEmail | Clear | Clear | No matching rows |
| platform-build-started | buildStartedEmail | Clear | Clear | No matching rows |
| platform-build-started-nofee | buildStartedEmail | Clear | Clear | No matching rows; fee branch cannot be inferred |
| platform-new-detailer | platformAlertEmail | Clear | Clear | No proof; 1 refused |

## Read-only database evidence and its limits

The accompanying `email-delivery-coverage-2026-11-02.json` records the exact
query, query time in UTC, subject-family patterns, status counts and first/last
dates. It contains no recipients, provider IDs, raw customer subjects or bodies.
The Management API was used with `.env` credentials, pinned to
`kguqylyzgyzfktkfnhjb` and `read_only: true`; the Supabase MCP was not used.
The query was a SELECT over the entire retained `public.email_sends` table.
All 200 rows were accounted for by the recorded patterns; no unclassified
subjects remained. Historical patterns were checked against the earlier
template source (`git show '6f681160^:supabase/functions/_shared/emailTemplates.ts'`).

| Recorded status | Rows | Has provider ID | Has HTML body |
|---|---:|---:|---:|
| delivered | 10 | 10 | 0 |
| sent | 10 | 10 | 0 |
| failed | 21 | 0 | 5 |
| refused | 9 | 0 | 0 |
| skipped | 150 | 0 | 58 |

The delivered rows date from October 17 and say `Request received · <date>`:
the legacy request-received family of `customerConfirmationEmail`. The sent
rows date from September 20 and say `Problem report · <business>`; that caller
builds inline HTML in `report-problem/index.ts`, outside the exported templates.
They do not cover `platformAlertEmail`. That builder additionally has scheduled
job alerts: 20 failed, 8 refused and 10 skipped, with no successful provider row.
Owner reminders reuse the owner booking body with a separate subject: 18
skipped and 1 failed. These are distinct from the preview's new-booking cases.

`email_sends` has no template ID, locale or template version/hash column.
Successful bodies are absent. Subject matching can identify a legacy family,
but cannot prove the current version, an exact branch, a locale, or a complete
sandbox batch. The shared-subject variants and configurable campaign content
remain unverified. "No matching rows" means no evidence in the retained table,
not an assertion that an email has never existed outside that history.

## Browser, design and sabotage evidence

Evidence persists under the **main checkout's** `.manager-shots/3.4g/`.
`review.mjs` serves the actual rendered files on localhost port 54834 and opens
each in Chromium. `browser-review.json` records 210 page visits, full rendered
text, links and SHA-256 hashes: every variant in both languages at 1440×900,
768×1024 and 390×844. There were zero browser console warnings/errors, wrong
document languages, empty links or horizontal overflows. Files follow
`en/<preview-id>-<width>.png` and `es/<preview-id>-<width>.png`;
`contact-1.png` through `contact-7.png` show every phone page side by side.
`contact-768-1.png` through `contact-768-7.png`, and the corresponding
`contact-1440-*` sheets, show every tablet/desktop page's central email column.
The copied HTML/text and `emails.json` manifests remain beside the screenshots.

Compared with DESIGN.md and its `docs/design-system.md` authority, using the
email-specific adaptation documented in `emailKit.ts`:

- Continuous warm paper ground, with no detached card stack: observed.
- One green accent for the appointment, amount or action; red cancellation
  labels; ruled facts and money rows: observed.
- Clear label/body/headline hierarchy and separate monospace figures: observed.
- Footer centered once, with wrapping phone columns and visible buttons: observed.
- The light-first email ground and installed email-safe fonts follow the
  documented inbox adaptation; the dashboard's dark-only rule is not applied
  to email. Renderer checks cover both palette contrast floors. Chromium does
  not reproduce Gmail transformations or Outlook's Word layout engine.

The deliberate break changed `tt("You're all set")` to `tt("undefined")` in
`emailTemplates.ts`. `git diff --numstat` proved **1 insertion / 1 deletion**;
the renderer exited 1 and named three broken confirmation variants. The full
receipt is `.manager-shots/3.4g/sabotage.txt`. The original bytes were restored,
`git diff --quiet -- supabase/functions/_shared/emailTemplates.ts` passed,
and both language renders were rerun clean. No broken preview replaced the
saved review copies. `query.mjs` reproduces the read-only coverage snapshot.

## Remaining work and unrelated observations

This review-and-record assignment is complete. The original ROADMAP item's
separate sandbox-delivery criteria remain unmet and the item must stay open.
Fix A and refresh F before calling the reviewed examples clean. E is an
authored-content limitation and should stay visible to reviewers. No production
template, sender or UI source was changed in this pass.

Outside this item's scope, source inspection found `email-review-sheet.mjs`
still declares 34 variants and lacks the `customer-restored` roster row while
the renderer produces 35. Its own population checks will reject the current
set. The prior branch's much larger sender rewrite is not required to fix it.
Mandatory deployment/migration inventory results and credential-free suite
results are recorded in the verification section below.

## Verification results

```powershell
node --test tests/composition.test.mjs tests/design-contrast.test.mjs tests/landing-pricing.test.mjs tests/route-contract.test.mjs tests/no-credentials-in-tracked-text.test.mjs tests/every-open-item-is-citable.test.mjs tests/figures-carry-their-command.test.mjs
node --env-file=C:/Users/rando/Downloads/claude/detailing-platform/.env scripts/deployed-inventory.mjs
node --env-file=C:/Users/rando/Downloads/claude/detailing-platform/.env scripts/migration-drift.mjs
```

The credential-free battery exited 0: Node reports 20 tests, 20 pass, zero
failures. `suites.txt` preserves each suite's own assertion counts. The route
suite explicitly reports generated example rewrites **NOT MEASURED** because
this worktree has no `app/dist/_redirects`; this documentation-only pass did not
build the app. It is not reported as generated-route verification.

The two read-only live inventories exited 1 on pre-existing differences:
33 of 44 deployed functions differ from this checkout, and three additional
functions were never deployed (`acknowledge-checkin`, `calendar-feed`,
`google-business`). Migration comparison found one differing function
(`is_support_session`), five missing columns (`businesses.awaiting_first_payment`,
`business_settings.calendar_feed_token`, `bookings.damage_ack_at`,
`bookings.damage_ack_photo_count`, `support_sessions.unlocked_at`) and the absent
`business_settings_feed_token_uidx` index. Complete named results persist in
`.manager-shots/3.4g/deployed-inventory.txt` and `migration-drift.txt`. Nothing
was deployed or applied to clear them. Local Chromium previews are evidence of
the pinned source, not a claim that the live deployment sends those same bytes.

## Code follow-up — November 2, 2026

Implemented in `C:/belt-jobs/claude-3.4g-fix`, based on `2db828fc`.
Finding A is fixed in the cancellation and restored builders: sentences,
subjects and cancellation preheaders use **canceled**. The matching English
keys in `_shared/strings/es.ts` changed in the same patch; their Spanish
values are unchanged. None of those keys occurs in `appEs.js`, and
`emailKit.ts` uses the shared dictionary rather than a separate Spanish table.
Internal `cancelled` keys and the exempt bare status label remain intact.

Finding F now derives the sample invite expiration from `daysOut(7)` on each
render. This pass shows November 9 in both languages. The URL remains a dummy
preview URL; no invitation was created. For E, the renderer supplies Spanish
authored sample content in Spanish runs: campaign subject/message, services,
add-ons, custom size, travel/surcharge labels, plans, maintenance, notes,
loyalty reason, custom role and payment instructions. Proper names, models,
addresses and payment handles are preserved. Seeded `Large`/`Small` still
exercise the product's built-in size translation. Product behavior continues
to preserve customer/business authored text, including English campaign text
inside a Spanish frame; this is not a translation-policy change.

Reproduction commands, run with `TRACKED_RECEIPTS=0`:

```powershell
node scripts/render-emails.mjs
node scripts/render-emails.mjs --lang=es
# Serve artifacts/email-preview at EXAMPLES_BASE, then:
$env:EXAMPLES_BASE='http://127.0.0.1:54835/en'
node scripts/american-english.mjs --emails=artifacts/email-preview
# Evidence tools live under the main checkout, not this worktree:
$proof='C:/Users/rando/Downloads/claude/detailing-platform/.manager-shots/3.4g/fix'
node "$proof/check-fixtures.mjs"
node "$proof/review.mjs"
```

Both before renders and both final renders passed: every exported builder,
35/35 variants and 176 assertions per language. The American English check's
new email mode uses its existing word list and positional exceptions, reading
finished HTML plus subjects and plain-text lines. Before: 16 occurrences in
the four reported variants; after and after restoration: 35/35 pages, 3,090
assertions, zero occurrences. Its canary caught all seven planted words and
did not flag the exempt status/key. Deliberately restoring the bad headline
`Your booking is cancelled` produced exit 1 and two findings naming
`customer-cancellation` (HTML and text). `sabotage-diff.txt` proves the single
line edit; `sabotage-numstat.txt` records the working-tree diff. The saved fixed
bytes were restored, both languages re-rendered, and the style check rerun.
`check-fixtures.mjs` also verified both future invite dates, every Spanish
preview's former English samples, and preservation of authored English by the
Spanish campaign frame.

Evidence is under the main checkout's `.manager-shots/3.4g/fix/`: before,
after, sabotage and final command logs/receipts; `browser-review.json`; and
`en/<preview-id>-<width>.png` / `es/<preview-id>-<width>.png`. The browser pass
visited all 210 pages at 1440×900, 768×1024 and 390×844, with zero console
warnings/errors, invalid links, wrong document languages or horizontal
overflows. All 21 `contact-<width>-<1..7>.png` sheets were visually inspected.
Against `DESIGN.md` and the inbox adaptation in `emailKit.ts`: continuous warm
paper, one green action/amount accent, red cancellation labels, ruled records,
separate words/monospace figures, hierarchy, centered footer and phone wrapping
remain intact. No additional visual correction was needed.

The credential-free battery recorded above was rerun: 20/20 Node tests pass
(`suites.txt`); `node scripts/label-guard.mjs` passes (`label-guard.txt`).
Read-only `deployed-inventory.mjs` and `migration-drift.mjs` were rerun with
main's `.env`: the same 33/44 differing programs, three never deployed, one
differing database function, five missing columns and one absent index remain.
Their named logs are in this follow-up evidence directory. Generated example
rewrites remain NOT MEASURED in the route suite; no app build was needed for
these shared email templates. The previously reported stale review-sheet
roster is outside this patch and remains unresolved.

**Later publish required.** The changed cancellation/restored functions are
called by `cancel-booking` and `update-booking`. The shared-dependency walk in
`check-fixtures.mjs` records all 18 programs carrying either changed shared
module in `publish-carriers.json`: `accept-quote`, `cancel-booking`,
`create-booking`, `create-business`, `invite-user`, `plan-link`,
`platform-admin`, `platform-billing`, `preview-emails`, `report-problem`,
`reschedule-booking`, `respond-to-booking`, `send-campaign`, `send-invoice`,
`send-owner-reminders`, `stripe-webhook`, `update-booking`, `watch-jobs`.
The renderer's fixture changes are local only. Nothing was sent, deployed,
pushed or written to the database. The belt was left stopped. Land with
`--keep-open`: the sandbox-delivery acceptance criteria remain unmet.
