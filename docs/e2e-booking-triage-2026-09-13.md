# `scripts/e2e-booking.mjs` — EVERY FAILURE SORTED, AND THE GREENS AUDITED TOO

**Lane C, 2026-09-13.** Andrew: *"Take it to green, or prove failure by failure
that the check is stale and the product is right, and say which is which…
Treat its passes with the same suspicion as its failures."*

**IT IS `scripts/e2e-booking.mjs`, NOT `tests/e2e-booking.test.mjs`.** No such
test file exists and none ever has. Worth saying once, because a session that
greps `tests/` for it finds nothing and may conclude the check was deleted.

---

## THE ANSWER IN ONE TABLE

Baseline at `36dd489`, on a QUIET tree — `app/src` committed, nothing modified
in ninety minutes, dev server confirmed serving current source for both files
under suspicion. **65 passed, 15 failed.**

**AFTER: 84 passed, 0 failed, 6 skipped** — the whole loop, both tenants,
`node scripts/e2e-booking.mjs`, exit 0. The suite grew from 80 subjects to 90:
two new (`the form has a name box the browser can autofill`) and eight new
(`available-slots answered for <date>`), both added by the repairs below.

| # | failure | verdict |
|---|---|---|
| 1–2 | `the review step prints a total — $105` / `$150` | **STALE CHECK. The product is right.** |
| 3–4 | `charged what the price bar printed — bar $105, row 105` | **STALE CHECK. The product is right.** |
| 5–6 | `with the name the customer typed — 140 Market Street, Long Beach, CA` | **STALE CHECK. The product is right.** |
| 7 | `the request is waiting on Today` | **DOWNSTREAM OF 5–6.** The dashboard was never at fault. |
| 8 | `the job is findable in the calendar's history` | **DOWNSTREAM OF 5–6.** |
| 9 | `it is still a live booking — pending` | **DOWNSTREAM OF 5–6.** |
| 10–15 | six email failures, three per tenant | **NEITHER. The day's tenant email allowance is spent — the reserve working.** |
| — | the "tenth", `2026-09-17 is open on the customer's calendar` | **STALE CHECK — a race inside the check itself.** The product is right. |

**NINE FAILURES, TWO ROOT CAUSES, AND BOTH ROOT CAUSES ARE A PRODUCT CHANGE
ANDREW ASKED FOR.** Nothing in the booking flow is broken. That is the whole
finding, and it is worth more than the fixes.

---

## 1 · THE MONEY FOUR — one decision, made on 2026-09-11

`app/src/lib/format.js`, in its own header: **"CENTS APPEAR WHENEVER THEY
EXIST… only $95.00 becomes $95."** The price bar renders `money(quote.total)`
(`BookingPage.jsx:701`), so it prints `$105`.

The check demanded `/^\$\d[\d,]*\.\d\d$/` — a mandatory `.00` — and compared
the database row with `` `$${Number(row.total_price).toFixed(2)}` ``. So it
printed *"bar $105, row 105"* and called them unequal. **`FOUND.md` had already
guessed this correctly** — *"a comparison reporting two equal-looking numbers as
unequal is comparing a formatted string to a number… the signature of a stale
test"*. It was.

**THE FIX IS AN IMPORT, NOT A SECOND FORMATTER.** The script now imports
`money` from `app/src/lib/format.js` — a READ of lane B's file — so there is
one rule in one place. Writing the rule out again here would have been a copy,
and the copy nobody maintains is the one that goes stale. If that file ever
stops importing under Node the script dies loudly, which is correct.

The regex allows optional cents and **still requires the comma group above
999**, because that half of the same decision is still a rule. Baselined:
`$105` `$105.00` `$1,200` `$1,200.50` `$58.50` pass; `105` `$1200` `$105.0`
`$1,20` fail.

## 2 · THE NAME FIVE — one heading, renamed on 2026-09-12

**This is the expensive one, and it is a single line.**

The script filled the first free-text field with the customer's NAME if the
step's heading matched `/reach you/i`, and with an address otherwise. On
2026-09-12 `headingFor()` in `BookingPage.jsx` deliberately became **"Your
details"** — recorded in its own comment as *"A NOUN PHRASE, NOT A QUESTION"*.

So the customer was named **"140 Market Street, Long Beach, CA"**, and:

- `with the name the customer typed` failed on **both** tenants;
- the dashboard leg searches for that name, so **the request card was not
  found** — `the request is waiting on Today`;
- Accept therefore never ran, so the row stayed `pending` — `it is still a live
  booking`;
- and the calendar's history search for the run id found no row bearing the
  name — `the job is findable in the calendar's history`.

**FOUR OF THE NINE FAILURES NAMED THE DETAILER'S DASHBOARD AND THE DASHBOARD
WAS FINE.** A failure that names the wrong subject is worse than a silent one,
because it sends the next session to the wrong screen.

**THE FIX IS `autocomplete`, WHICH IS WHAT THE FIELD DOES.** `StepDetails.jsx`
carries `autoComplete="name"` and `AddressField.jsx` carries
`autoComplete="street-address"`; both are behaviour a browser acts on, not
prose somebody may reword. This is CLAUDE.md trap (h) — *a check that names a
spelling is coupled to the spelling, not the behaviour* — and it is the fourth
time that trap has been paid for in this repo.

**AND IT NOW SAYS SO WHEN IT CANNOT FIND THE BOX.** A new check, `the form has
a name box the browser can autofill`, fires on the details step. Without it the
same silent substitution would come back the day the token moves, and would
again be reported as four dashboard defects.

## 3 · THE EMAIL SIX — the budget working, not a defect

Both tenants: `send-email` answered **429** with
`{"reason":"daily_cap","details":"Tenant mail has spent its share of today's
allowance. The platform's own alerts are still reserved."}`

That is `docs/email-budget.md` exactly as designed. Tenant mail stops at
`email_daily_cap - email_platform_reserve`; today's row was at 94 of 100 before
7am. The provider was never called, so *"did the provider take it"* is a
question the day cannot answer — it is **unanswerable, not answered no**.

**AND TWO OF THE THREE RED LINES CARRIED A FALSE DIAGNOSIS**, which is the part
that mattered. `the customer's email reached the provider (delivered@resend.dev)
— the relay skipped it instead, see send-email's undeliverable-domain guard`
named the **wrong guard**: `resend.dev` is not a reserved domain, and the mail
was refused a budget rather than skipped as undeliverable. A next session
reading that line would have gone to look at the domain list.

**SO IT SKIPS, LOUDLY, AND COUNTS AS NEITHER A PASS NOR A FAIL.** The run
summary now prints `N passed, N failed, N skipped`, so the suite's size is
still visible and a skip can never read as a pass — this repo's single most
repeated failure. The gate is our own function log carrying the literal
`"reason":"daily_cap"`, so a provider failure of **any** other kind still goes
red. Baselined: the gate is true on that exact log line and false on
`Resend API error 422`.

**To exercise the provider leg, run it after 00:00 UTC**, when the day rolls.

### STILL OWED AT 23:12 UTC ON 2026-09-13 — lane C, and it is owed for TWO reasons

**(1) The day had not rolled.** The run made at 15:xx local printed the same
`84 passed, 0 failed, 6 skipped`; the cap was still in place.

**(2) `app/src` WAS DIRTY THE WHOLE SESSION.** Five files uncommitted at the
last check — `App.jsx`, `components/SetupForm.jsx`, `components/Walkthrough.jsx`,
`lib/strings/appEs.js`, `screens/Business.jsx` — with lane B committing twice
during the evening. **The six legs were NOT run against a moving tree**, on
purpose; trap (f).

**WHAT TO DO NEXT, AND IT NEEDS NEITHER OF THOSE CONDITIONS ANY MORE.** The
`BASE` work done today means lane C can build its own bundle and serve it,
so the only remaining condition is the clock:

```bash
git worktree add --detach <tmp>/wt HEAD
cmd /c mklink /J <tmp>/wt/app/node_modules  <repo>/app/node_modules
set -a; . ./app/.env.local; set +a; (cd <tmp>/wt/app && npx vite build)
(cd <tmp>/wt/app && npx vite preview --port 4173 --strictPort --host 127.0.0.1) &
set -a; . ./.env; set +a
BASE=http://127.0.0.1:4173 node scripts/e2e-booking.mjs
```

**The pass condition is `90 passed, 0 failed, 0 skipped`** — the six become
real, or they name a provider failure that is not `daily_cap` and go red.
`docs/blind-browser-2026-09-13.md` § 1 is the recipe in full.

## 4 · THE TENTH IS A RACE INSIDE THE CHECK, AND IT WAS NEITHER OF THE TWO GUESSES

`FOUND.md` § THERE IS A TENTH e2e-booking FAILURE recorded
`2026-09-17 is open on the customer's calendar` failing twice at `1cf5f98` and
named two candidate causes: trap (e), two `.bk-cal` elements, and trap (f),
lane B editing during the run. **Both are wrong, and the truth was printed in
the failure's own detail all along.**

**IT IS INTERMITTENT AND IT WAS CAUGHT BOTH WAYS TODAY, SAME COMMIT, SAME
TREE.** It passed on both tenants at 13:44 and failed on the second tenant at
13:57 — on 2026-09-17, the exact date `FOUND.md` names.

**THE DETAIL IS THE EVIDENCE.** The failure prints `cell   ` — three trailing
spaces where `closed`, `today` and `selected` would go. That is an **open**
cell. The check asked two questions of the same element and got opposite
answers:

```js
await cell.count() > 0                       // false  — count() does NOT auto-wait
await cell.getAttribute("class")             // "cell   " — getAttribute() DOES
```

`StepWhen.jsx` paints no grid at all until `available-slots` answers
(`!loading && days !== null`, and gating on the ANSWER rather than the flag is
correct and deliberate). So on a slow answer there are **zero** cells at the
instant `count()` is asked, and the `getAttribute()` a few milliseconds later
waits, finds the grid, and reports a perfectly good cell. **A `settle()` long
enough this morning is too short on a slower one.**

Trap (e) does not apply: only the second `.bk-cal` contains `.cell` at all; the
weekday header holds `.bk-dow`. Trap (f) does not apply either: `app/src` was
committed and untouched for ninety minutes on every run here.

**FIXED BY WAITING FOR THE GRID** — `until(() => cell.count() > 0, 20000)` —
and the no-cell branch now says *"available-slots never painted a grid"*
instead of "no cell", which is the difference between naming the endpoint and
naming nothing. **The calendar was never changed and never needed to be.**

## 5 · THE GREENS — one hollow pass, and it was the double-booking guard

The instruction was to treat the passes with the same suspicion as the
failures, after eighteen of `platform-admin`'s 118 turned out to be checking
text a broken `strip()` had already eaten. **One was found here.**

```js
const slotsOn = async (date) => { … return r.data?.slots ?? []; };
```

**`?? []` turned every failure of `available-slots` into an empty list**, and
two checks read a MISSING time as proof of something:

- `08:00 is no longer offered (a request holds its slot)` — `!free.includes(TIME)`
- `and 09:00 is taken` — `!after.includes(MOVED)`

**Those two are the double-booking guard**, and both go green on a list that
came back empty because the call died. The one check reading a PRESENT time —
`the cancelled time is offered again` — was safe throughout, which is exactly
why this survived: half the leg really was testing.

**AND IT IS NOT THEORETICAL.** Lane C queue item 2 is Andrew hitting this same
endpoint answering **200 with no days at all**, three months running, on a live
tenant. `FOUND.md` § THE "GATEWAY TIMEOUT" IS OUR OWN CATCH BLOCK puts roughly
**1.1%** of this project's REST calls at 504.

`slotsOn` now asserts its own read — `available-slots answered for <date>` —
once, where the call is made, instead of being read as green ticks downstream.

**The other greens that were looked at and are sound:** `page.textContent()`
throws rather than returning empty when a selector is missing, so the
business-name checks cannot pass vacuously; the console-error collector is
wired to both `console` and `pageerror` before the first navigation;
`the cancelled time is offered again` reads a positive; and `/cancelled/i` does
not match "cancellation", so the cancel check is not satisfied by a policy line.

---

## WHAT THIS RUN FOUND THAT IS NOT A FAILURE AND IS NOT LANE C's TO FIX

**THE EMAILS PRINT `$150.00` WHERE THE PAGE PRINTED `$150`.** The subject line
the run captured is literally
`New booking · … · Thursday, September 17, 2026 ($150.00)`, sent from a page
that had just shown `$150`.

`supabase/functions/_shared/emailKit.ts:154` is a **second money formatter**:

```ts
export const money = (n: number) => `$${(Math.round(Number(n) * 100) / 100).toFixed(2)}`;
```

The 2026-09-11 decision says *cents only when there are cents* and that it was
*"safe to apply everywhere at once"*. It reached the app and not the emails.
**It is a real divergence on the most-read money figure in the product** — the
one a customer sees in their inbox seconds after seeing the other one.

**NOT FIXED HERE, DELIBERATELY.** It changes every money figure in every email,
needs `deploy-functions.mjs` plus `check-deployed.mjs` plus a re-render of the
email fixtures, and folding it into this commit would hide it. **It is lane C's
folder but it is its own item.** Nineteen edge functions import `money`.

---

## HOW THE FIXED SCRIPT WAS BASELINED

Per `docs/BAR.md`: an instrument nobody has broken on purpose is worth less
than no instrument.

| what | broken on purpose with | what actually happened |
|---|---|---|
| the total's shape | `105`, `$1200`, `$105.0`, `$1,20` | each rejected; `$105` `$105.00` `$1,200` `$1,200.50` `$58.50` accepted |
| the cap gate | `Resend API error 422` in place of the `daily_cap` log line | gate false, so the two provider checks run and go red |
| **the name box** | the selector changed to `autocomplete=name-BROKEN`, run against `demo-detail` | **RED**, naming the selector AND the step: *"no .bk-field input[autocomplete=name] on the step headed Your details"*. Continue then greyed out, exactly as a real missing name would. |
| **`slotsOn`** | the endpoint changed to `available-slotsBROKEN`, run against `demo-detail` | **THREE RED**, each printing `HTTP 404 — {"code":"NOT_FOUND"…}`. **Before this fix the same dead endpoint produced ONE failure and left both double-booking guards green.** That is the hollow pass, demonstrated rather than argued. |

The file was diffed back to the green version after each break; both breaks are
reverted and `node --check` passes.
