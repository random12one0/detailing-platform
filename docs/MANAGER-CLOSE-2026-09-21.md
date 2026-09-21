# Manager close — 2026-09-21

**Read this before picking anything up.** It exists because a night's worth of
decisions lived in a chat window and nowhere else, and Andrew's bar for stopping
was explicit:

> *"nothing that only you know that Claude doesn't, that the coding, you know,
> that the database doesn't know."*

This is that. It is the manager's side of the night — the rulings, the state
changed **outside** the repo, the corrections, and what each session left on the
floor. **Everything here is either a decision that is now binding or a fact a
`git log` cannot tell you.**

---

## 1. State changed outside the repo. Git cannot see any of this.

Four things about this product are now different, and **none of them are a
commit**:

| What | Where | When | By |
|---|---|---|---|
| `bookings.travel_zone_address_mismatch` **exists** | Supabase `kguqylyzgyzfktkfnhjb` | night of 09-20 | **Andrew ran the SQL himself** |
| Resend webhook now subscribes to exactly `delivered`, `bounced`, `complained`, `failed` | Resend, endpoint `…/functions/v1/resend-webhook` | 09-21 | manager, via the Resend API |
| healthchecks.io "scheduled jobs" grace **30 min → 2 hours** | healthchecks.io | 09-21 | manager |
| Nothing was published. Nothing was pushed. | — | — | — |

**The migration being applied retires the ordering trap.** `create-booking`
always writes that key on insert, so publishing it before the column existed
would have failed **every** new booking. The column exists now. The trap is
closed; the shape of it is written up in `FOR-ANDREW.md` because it will recur
with some other column.

**The Resend change was a subscription mismatch, not a missing webhook.** The
endpoint was correct all along. It was listening for `email.delivery_delayed`,
which `resend-webhook/index.ts`'s `OUTCOME` map deliberately does not handle,
and **not** for `email.delivered`, which is the only event that can ever turn a
client record from "On its way" into "Delivered". `OUTCOME` is the spec; the
subscription now matches it exactly. **If you change `OUTCOME`, the Resend
subscription is a second place that has to change, and nothing in the repo will
tell you.**

---

## 2. Andrew's rulings. These are binding; do not re-open them.

His words are in `FOR-ANDREW.md` § Done. The operative form:

- **No marketing email, ever.** Email is receipts, reminders and alerts.
  Anything that sells goes by **text**. The "your coating is due" email is
  **off**, and the CAN-SPAM postal-address problem goes off with it. Do not
  design around a footer address; there is no marketing mail to put one in.
- **No Spanish on the home and pricing pages.** Those pages sell to detailers,
  and he sells to English speakers. The **booking page** serves customers and
  stays fully bilingual. ~390 strings deliberately not done.
- **Travel stays named, flat-fee zones.** No distance pricing — the geocoding
  and routing APIs cost money. **ROADMAP 2.3 must be rewritten to ask for the
  flag**, not left open asking for a distance feature nobody is building. The
  word-comparison mismatch flag **labels and never gates**: it does not block a
  booking and does not change a price.
- **Build the customer export.** He considers it one button; it is now a build
  item, not a question. The promise on the pricing and home pages stays worded
  as it is.
- **Flag the 15 test detailers, do not delete them.** ~60 checks sign into
  them, and a check that cannot run looks like one that passed.
- **`andrewsdetail.com` stays on the marketing page.** He is happy promoting
  it. The **mock browser bar** around it is a separate complaint — he wants a
  real screenshot from one of the sites instead, and that is a design task.
- **Job buttons stay square on a phone.** Leave it.
- **Large text: fix the booking page only.** The back office is allowed to
  scroll sideways at double text size, and the promise says so.
- **Spanish vehicle words: pick what is best for a Spanish speaker.**
  Delegated, not decided. Dashboard says "Troca"/"SUV chica", booking page says
  "Camioneta"/"SUV pequeña". **One word per idea, across both screens.**
- **Legal pages name him personally, and that is correct** until December 2026.
  Not a registered business yet; a DBA costs a filing fee and buys nothing yet.
- **Alerts:** he will not act on failure email. *"if I get an email that
  something like failed... I'm not going to do anything about it."* Alerting is
  tuned for silence-unless-real, not for completeness.

**Still genuinely open, and short:** where the age private key for the backups
lives (blocks everything about restore); "unlimited photos" on the pricing page;
what the Business-settings live preview should show; the two away-from-the-
computer checks. That is the whole list.

---

## 3. Backups — the page in this repo was wrong, and is now rewritten

`docs/recovery.md` opened with *"There is no restore point anyone can reach."*
**False.** It measured Supabase's dashboard, found nothing there, and wrote it
down as a fact about everywhere. Andrew said so before anyone checked, and he
was right.

The real pipeline: **`github.com/random12one0/detailing-platform-backups`**,
private, nightly at 02:10 Pacific, `pg_dump --format=custom` inside
`postgres:17`, refuses a dump under 50 KB, `age`-encrypted to a committed public
key, published as a release asset, pruned at 30 days keeping the 1st of each
month. Verified release by release. `docs/recovery.md` now carries the full
measurement and, more importantly, **the gaps**: nobody has ever restored one,
and the private key's location is unrecorded.

**Sep 15 has no backup and never will.** Run `34952425209` died at
`actions/checkout@v4` with *"repository ... not found"* — GitHub could not hand
its own runner the repo. Same commit as every green run either side. **15 runs,
14 green.** Not a defect here; nothing to fix.

**That one blip produced three emails** — Actions fires instantly with no grace,
then the healthchecks nightly-backup check timed out (the ping is `if:
success()`, so a failed run stays silent), then recovered the next night. This
is why the scheduled-jobs grace went to 2 hours. **The Actions email itself has
no delay setting** and is Andrew's GitHub notification config, not ours.

---

## 4. Publishing order — unchanged, and still Andrew's

22 of 39 edge functions are running code older than the repo. When he says go:

1. **Spanish emails** — labels only, lowest risk.
2. **card-declined + report-a-problem** — both currently running against parts
   that did not exist when they were deployed; unpredictable if triggered.
3. **the remaining 17** — cheapest in one pass.
4. **the payment webhook LAST and ALONE.** It touches money.

**Run `deployed-inventory.mjs` before and after.** It has never actually been
run — it reaches the Management API. It is **unproven, not skipped**. Do not
deploy something just to clear it.

---

## 5. How the sessions collided, and the rule that came out of it

**Four collisions in one night, all the manager's fault**: app/src work assigned
during a browser sweep; a test battery authorised mid-sweep; two sessions sent
at Spanish simultaneously; and "app/src is quiet" said to one session an hour
before handing app/src work to the other — its source guard fired and voided a
completed sweep.

The rule is in `docs/how-we-run.md` § *"What you say about the other tree
expires the moment you say something new"*. In short: **a lane statement is a
claim about a moment, not a fact about the repo.** Check what is out on loan the
way you'd run `git status` before trusting your memory of the tree.

`scripts/source-guard.mjs` watches `app/src` only, recursively, all file types.
`docs/` and `ROADMAP.md` are free. **`scripts/` is watched by nothing.**

---

## 6. The manager got four things wrong. Each is on the record.

Kept because the pattern matters more than the individual errors:

- **Said the backups did not exist.** Andrew: *"I'm right, just trust me, I know
  I'm right."* He was.
- **Misstated three numbers** — a 2-in-20 truncation, "a real defect at tour
  step 28", and "$3.50" for a figure that was $2. Standing instruction issued
  and still in force: **treat any number the manager hands you as a pointer to
  where to look, not a value to code against.**
- **Ticked ROADMAP 9.11 with a named unverified gap** — phone width, because
  the manager's browser pins its layout viewport at 1414 and cannot be made
  narrower. The sweep then found a real 320px regression **sitting exactly in
  that gap**. *A tick carrying a named unverified gap is still a tick, and this
  is what one costs.*
- **Declined to press Run on the SQL and on the Resend change**, and Andrew was
  right to push back: *"If there's something you could have done 100%, you
  should have just done it."* **A session that can press the button presses the
  button.** The only real exceptions are the standing ones — no credentials, no
  spending, no pushing, no publishing, no writes to `adtlnvihwrcqcasqcjwd`.

---

## 7. What each session left, verbatim from its own handoff

Both stopped at clean boundaries with nothing in flight. **Read their handoffs,
not this summary, before starting their task one.**

- **`docs/HANDOFF-2026-09-20.md`** (measurement leg). Task one: re-derive only
  the `Npx spare` figures that **gate open items** — not all 64. Open: the plans
  page's 234px advisory; the expected-count file has drifted (`Maintenance
  deadlines` → `Visits due`, tour steps 34-36) and **360px has no expectation
  recorded at all**, so it is swept ungraded.
- **`docs/HANDOFF-2026-09-20-clients.md`** (client screens / 9.11). Task one:
  re-run `sweep-widths.mjs` against current HEAD — the receipt on disk reads
  `fail` but its `git_sha` is an **ancestor** of the commit that fixed it, so it
  is **stale, not wrong**. 9.11, 9.6 and 9.7 are built and verified live and
  **none are ticked**; Andrew presses each himself.

**Queued and not started, app/src side:** the alert-email redesign (top), the
problem-report email's readability (his words: *"I feel like if I copied a debug
menu, this is what it looked like"* — wants 12-hour time and month/day/year),
the coating-email classification fact-find, the mock-browser-bar replacement,
the customer export, flagging the test detailers, the Spanish truck words, large
text on the booking page, and re-checking 9.10's false premise.

---

## 8. Standing constraints. Unchanged, and they are Andrew's, not a session's.

No push. No publish. No deploy. **No handling of any key, token, secret or
password — not creating one, not reading one out, not pasting one anywhere.**
Say where a secret lives, never what it is. No spending. **Never write to
`adtlnvihwrcqcasqcjwd`** — that is his real, live business; this repo's project
is `kguqylyzgyzfktkfnhjb`. Migrations are append-only; never edit an existing
one. `reference/` is read-only.
