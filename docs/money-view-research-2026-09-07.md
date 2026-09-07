# The advanced money view — research

Roadmap 8.8. **An owner approval gate: no code was written for this, and none
should be until he has answered § 6.** 8.9 is the build.

He asked for it twice, emphatically: an advanced money breakdown on the
DETAILER's dashboard behind a button, showing *"all the stuff I am able to
see"* on andrewsdetail.com — **"but not in the same format… thought through,
and not just plain boxes."**

That second sentence is the whole brief. The figures are settled; the shape is
the question.

---

## 1. What he actually looks at today, measured rather than remembered

`reference/frontend/src/components/RevenueAndCustomers.jsx` — 1,049 lines — IS
his live dashboard, and it is in this repo. Read line by line, it prints:

| Figure | How it is computed there |
|---|---|
| Total revenue | sum of finalised job amounts in the range |
| **Net profit** | `totalRevenue − expensesTotal` |
| Jobs completed | count |
| Avg ticket | revenue ÷ jobs |
| **Base quotes vs Extra earned at service time** | the quote against what was added on the day |
| Upsell revenue | the difference above, as its own figure |
| **Total tips · Avg tip · Tip rate** | `tipTotal`, `tipTotal / tippedJobs`, `tippedJobs / jobs × 100` |
| Revenue by month | a list, expandable to all months |
| **Hourly wage** | month by month: revenue ÷ hours, hours from `end_time − start_time`, falling back to `duration_minutes` |
| Total expenses **by category** | grouped |
| Total customers · **new vs returning** | `bookings.length > 1` |
| **Top spender** | customers sorted by spend |
| **Most popular days** | by count AND by revenue, kept separate |
| Range | This month · Last 3 months · This year · All time |

**Two details there are worth copying and one is worth refusing.**

*Worth copying:* **most popular days is TWO answers**, busiest by count and
best by revenue, and he kept them apart — a Saturday full of express washes and
a Tuesday with one ceramic coating are different facts. And **the hourly-wage
card browses month by month** on its own control, independent of the range
selector, because it is the one figure you compare against last month rather
than against a period.

*Worth refusing:* the range selector is four fixed buckets. The platform's Money
screen already has a period control with its own history, and a second,
different one on a screen behind it is two vocabularies for one idea.

---

## 2. What the platform already has

`app/src/screens/Money.jsx`, per period: **Collected · Expenses · Net · Avg job
· Jobs done · Quoted up front · Added on site**, an unpaid list, an expense
list, and the accountant CSV.

**So the platform already answers his "base vs extra" pair** — that is *Quoted
up front* and *Added on site* — and already leads on **Net rather than revenue**,
which is the better of the two choices. `Money.jsx` says so in its own comment:
*revenue is a vanity number.*

---

## 3. Genuinely missing — and every one is derivable from data already stored

| Missing | Data needed | Have it? |
|---|---|---|
| Tips: total, average, rate | `booking_line_items.category = 'tip'` | **Yes** |
| Expenses by category | `expenses.category` (already `not null`) | **Yes** |
| Hourly wage | `bookings.duration_minutes`, `start_time`/`end_time` | **Yes** |
| Revenue by month / trend | `bookings.start_at` + amounts | **Yes** |
| New vs returning | bookings per customer | **Yes** |
| Top spender | same | **Yes** |
| Most popular days | `start_at` weekday + amounts | **Yes** |

**Nothing here needs a migration.** That is the single most useful finding in
this document: 8.9 is arithmetic over rows the product already keeps, in the
shape of `lib/adminInsight.js` — pure, no React, testable without a DOM.

### The one real prerequisite

**The customer-entered tip does not exist.** Only the detailer-entered half does
(`FinalizeModal.jsx` writes a `tip` line item when the detailer types one in).
Three of his six tip figures are therefore measuring only what he remembers to
key in, and **Tip rate is the one that misleads**: `tippedJobs / jobs` reads as
*how many customers tip*, when today it means *how often I wrote a tip down*.

**Recommendation: 8.9 ships the tip figures against the detailer-entered tip and
labels them honestly, or it waits.** A customer-facing tip step is its own
decision — it changes the booking flow, the confirmation email and the money
tie-out — and it is not a sub-task of a reporting screen. **This is question A
in § 6.**

---

## 4. The accountant half, which he asked for by name

The export already exists and is deliberately **one flat ledger** — a row per
job, a row per expense, expenses negative, and its Amount column adds up to the
Net on the screen it came from. That tie-out is pinned by
`tests/money-export.test.mjs`. **It is the right file and it should not be
replaced.**

What an accountant asks for that this product cannot answer today:

1. **Expense categories that map to a tax return.** The column is free text.
   A US sole trader files Schedule C, whose lines are fixed — supplies, car
   and truck, advertising, insurance, contract labour. Free text means the
   accountant re-categorises by hand every year.
2. **Mileage.** Not stored at all (idea 07, roadmap 8.19). For a mobile
   detailer this is usually the largest single deduction, and the IRS standard
   rate makes it worth more than most receipts.
3. **Cash vs accrual.** The ledger dates a job by when it happened. An
   accountant on a cash basis wants when it was PAID. The product knows both.
4. **Sales tax.** Not tracked. In California, labour on a car is generally not
   taxable but products transferred can be — a real question, and **not one to
   answer from this repo**.
5. **Contractor payments.** Staff exist as logins, not as people who get paid,
   so nothing supports a 1099.

**Recommendation: 8.9 does ONE of these — a fixed category list on expenses,
offered as a suggestion rather than a constraint** — and the rest go on the
roadmap as their own items. Mileage is already 8.19. Sales tax and 1099s are
advice this product should not be giving, and saying so is the honest answer.

---

## 5. The shape, which is what he actually asked about

*"but not in the same format… thought through, and not just plain boxes."* His
own screen is a grid of coloured stat boxes; he is asking us not to copy it.

**What the design system already forbids** rules out most of the obvious
answers: no three evenly spaced cards, no numbered markers on a non-sequence,
money set in the figure face (law 8), the accent as identity and never as
meaning (law 11b), and — the one that bites hardest here — **no charts on a
screen where every trend line is noise.** `docs/platform-admin-2026-09-04.md`
made that argument for the back office and it applies again: with a handful of
jobs a month, a sparkline is decoration.

**A shape that fits this product rather than his old one, offered for his
approval rather than built:**

- **One sentence at the top that answers the question he actually has.**
  *"You made $4,170 and kept $3,240 of it."* Net first, in words, in the figure
  face. Everything below explains that sentence.
- **Ruled rows, not boxes** — the product's own vocabulary everywhere else, and
  the thing that makes fourteen figures readable where fourteen boxes are a
  wall.
- **Three groups in the order the questions are asked:** *What came in* (jobs,
  average, quoted vs added, tips), *What went out* (expenses by category), and
  *What it was worth* (net, hourly wage).
- **The hourly wage gets its own row and its own month control**, as it does on
  his screen, because it is the figure he compares against last month.
- **Most popular days stays two answers**, busiest and best.
- **The existing period control is reused.** One vocabulary.
- **Behind the existing Money screen**, not beside it: he said *behind a
  button*, and the everyday screen should stay four figures.

---

## 6. What is needed from him before 8.9

**A. The tip figures.** Ship them against the tip the DETAILER types in and
label them as that, or leave tips out until a customer-facing tip step is
decided? (The rate figure is the one that misleads.)

**B. The shape in § 5** — one sentence, then ruled rows in three groups, no
charts. Yes, or does he want the bars?

**C. Expense categories.** Offer a fixed list an accountant recognises, as a
suggestion the detailer can ignore, or leave the field free text?

**D. Anything on his old screen he does NOT want carried over?** The list in
§ 1 is complete; it is easier to drop something now than to build it twice.

---

*No code. `docs/roadmap.md` 8.9 is the build, and it is blocked on A and B.*
