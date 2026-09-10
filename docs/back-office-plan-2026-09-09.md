# The back office, rebuilt — the plan

**Written 2026-09-09, before any code, at the owner's instruction.** He looked
at the current `/admin`, said *"honestly, I'm really disappointed with this
back office… completely scrap it, don't even try to fix anything"*, and then
asked for a plan first:

> *"I wanna go over kind of a style sheet, but also what tabs you should have,
> what features should be in there, what I should be able to view… this is
> where I'm gonna manage this business, so I need to see my income, revenue,
> maybe expenses, showing what programs I'm using, a list of all the third
> party things that are happening and stats about them, as well as downtime
> areas to track stuff. Basically everything, like how's Stripe doing. A place
> to manage everything about the website, everything that's working together, a
> place to fix anything. Also managing detailers — cancelling their plans,
> managing their plans, pausing, suspend, view their dashboard from their
> perspective."*

**Nothing here is built. This is the thing to argue with before I start.**

---

## 0 · What this screen is, and who it is for

**One user, forever: him.** That single fact changes the design more than
anything else on this page.

The detailer's dashboard is built for somebody with wet hands standing beside a
car, so it is calm, large-tapped and says one thing at a time. **The back
office is the opposite case**: one person, at a desk, who wants density,
instruments, and everything visible at once. He has said as much —

> *"The other ones were kind of background effects for the admin dashboard for
> the detailers. But my back office one is me, and personally I really like
> animations and stuff looking really good and really sleek."*

**So this screen may be dense, dark, instrument-panel-like, and heavily
animated in a way nothing else in the product is allowed to be.** That is a
deliberate divergence, not a drift.

**THE ONE THING THAT DOES NOT CHANGE, AND MUST NOT.** Every byte on this
screen comes from the `platform-admin` edge function under the service role.
**No row-level security policy anywhere may ever gain an "or a platform admin"
clause** — `tests/platform-admin.test.mjs` § 1 walks every migration and fails
if one does. The rebuild is a rebuild of the SCREEN. The server, the gate and
the audit trail are the parts that are already right.

---

## 1 · The tabs

Five. Not six, and not the current one-screen-does-everything.

| | Tab | The question it answers |
|---|---|---|
| **1** | **Now** | Is the business healthy this morning, and is anything on fire? |
| **2** | **Detailers** | Who is on the platform, how is each doing, and what can I do to them? |
| **3** | **Money** | What am I earning, what am I spending, and what is Stripe doing? |
| **4** | **Plumbing** | Is every service the product depends on actually working? |
| **5** | **Log** | What has happened, and what did I do? |

---

## 2 · Tab by tab

Each line is marked:
**✅ the data already exists** · **⚙ needs new server work** · **🔌 needs a third-party account wired up**

### Tab 1 — NOW

The screen he opens every morning and can read in four seconds.

- ✅ **Monthly recurring revenue**, large, with the change on last month
- ✅ **Detailers**: total, active, suspended, joined this month, founding spots left
- ✅ **This month across the platform**: jobs finished, money processed, customers served
- ✅ **A six-month chart** — jobs as bars, MRR as a line over them
- ✅ **A red strip that is only there when something is wrong**: a background job that has not reported, email near its daily cap, photo storage near its cap, a detailer past due, an unverified domain
- ✅ **"Needs you"** — the list that turns numbers into a to-do: past due, setup unfinished, never taken a booking, quiet 30 days, no website yet. *(These filters exist today but are buried as chips on a list.)*
- ⚙ **Signups and cancellations this month**, side by side. Signups exist; **cancellations do not — nothing records a `cancelled_at`,** which is why the current screen shows "3 joined" beside nothing. Half a pair reads as "and none left", which may be false.

### Tab 2 — DETAILERS

- ✅ Search by name, link or email
- ✅ Filters: everyone, past due, setup unfinished, no bookings ever, quiet 30 days, no website
- ✅ **The list**, with each row carrying: plan, status, revenue this month, jobs, customers, last booking, requests waiting
- ✅ **The detail panel**: their six-month chart, finished/taken/average/cancelled, last booking, subscription state, booking mode, their site and whether the domain is verified, service and promo counts, how far through setup they are *(computed by the same `lib/setup.js` the detailer sees, so the two never disagree)*
- ✅ **Private notes** about a detailer, invisible to them
- ✅ **Actions that exist today**: suspend, restore, change plan tier, resend the owner invite, set their site address, export everything about them as a file
- ⚙ **Cancel their subscription** — the server can suspend a business but cannot cancel a Stripe subscription
- ⚙ **Delete a detailer** — no action exists, and this one needs care: what happens to their customers' bookings?
- ⚙ **Their own timeline** — every admin action on that business, from the audit table, shown on their panel
- ⚙ **Contact them** — a mail link with their address, which is one line and currently absent

### Tab 3 — MONEY

**The single most important distinction on this screen, and the current one
gets it wrong by putting both figures side by side in the same style:**

> **What I earn** (subscriptions, ~$40/month each) is a completely different
> number from **what flows through the platform** (detailers' job revenue,
> thousands). The second is a proof the product works. It is not income.

- ✅ **MRR**, and broken down by plan tier
- ✅ **Money processed through the platform** this month and all time — *labelled clearly as theirs, not ours*
- ✅ **Founding spots**: how many sold, how many left, and what that locks in
- ✅ **The price table editor** — the live prices, the built-in fallback, and which is in force *(`platform_settings.prices`; null means the files, and it falls back whole rather than field by field)*
- ✅ **Promo codes**: create, switch off, see usage
- 🔌 **Stripe** — this is the biggest gap and the thing he asked about by name:
  - payouts, and when the next one lands
  - failed charges and why
  - disputes
  - subscriptions due to renew, and any that failed
  - the platform's own Stripe fees
  - *A Stripe connector is available to this project but has not been authorised. Until it is, none of this can be shown.*
- ⚙ **Expenses** — he asked for this and **nothing records it**. Supabase, Netlify, Resend, the domain, Stripe's fees. Needs a small table and a form. **Worth doing: without it, "revenue" on this screen is a number with no other side.**
- ⚙ **Profit** — the point of the two above being in the same place

### Tab 4 — PLUMBING

His words: *"a list of all the third party things that are happening and stats
about them, as well as downtime areas to track stuff… a place to manage
everything about the website, everything that's working together, a place to
fix anything."*

**One row per service. Each says: is it up, when did it last work, how much of
the quota is gone, and a link straight to its own dashboard.**

| Service | What it does for us | Status |
|---|---|---|
| **Supabase** | database, logins, file storage, the edge functions | ⚙ reachable via API — needs wiring |
| **Netlify** | serves every page; builds on push | 🔌 connector IS authorised — build credits, last deploy, bandwidth |
| **Resend** | every email the product sends | ✅ sent/failed today and the cap are already on the screen · ⚙ domain verification and monthly quota are not |
| **Stripe** | takes the money | 🔌 needs authorising |
| **Google** | the "sign in with Google" button | ⚙ nothing checks it |
| **Background jobs** | reminders, plan visits, the nightly sweeps | ✅ heartbeats exist and staleness is already computed |
| **The outside watchdog** | notices if everything above stops | ✅ the screen already knows whether one is configured |

- ✅ **Photo storage**: used against the cap, and the per-detailer allowance
- ⚙ **Uptime history** — he asked for "downtime areas to track stuff". Heartbeats record *the last time a job ran*; **nothing keeps a history**, so there is no way to answer "was it down on Tuesday". Needs a small append-only table.
- ⚙ **Fix-it actions**: re-run a sweep by hand, re-send a failed email, clear a stuck job

### Tab 5 — LOG

- ✅ **Every admin action**, from `platform_admin_events` — who, when, which business, what. *This table is already written to and has never been shown on a screen.*
- ⚙ Signups and plan changes in the same stream
- ⚙ Filter by business or by kind

---

## 3 · Viewing a detailer's dashboard — the change he asked for

**What happens today, and why he could not find it:** the button says *"Open
their dashboard"*, and pressing it warns that **you will be signed out of your
own account**, because it literally signs you out and signs you in as that
detailer's owner. He called the wording *"super confusing"* and the behaviour
wrong:

> *"I should not need to have to sign out of my admin account, but it should
> also just give me basically a preview. I shouldn't be able to do things like
> finalise payments or accidentally book stuff or accidentally click buttons
> that might be, like, oops, didn't mean to do that. Unless I click a setting.
> Maybe I should have a little checkbox that gives me restrictions — not making
> it so it hides pages, but just making it so I can't accidentally do something
> I don't want to do."*

**The proposal, in two halves:**

1. **It opens in a new tab.** Your back office stays exactly where it was, signed in, on the same detailer. Close the tab and you are back. This alone removes the "you will be signed out" warning entirely.
2. **Read-only by default, with a switch.** The dashboard draws its existing red impersonation strip, plus a toggle: **Looking · Working**. In *Looking*, every button that changes something is disabled — nothing is hidden, exactly as he asked, it simply cannot be pressed by accident. Flip to *Working* and it behaves normally.

**One thing to be honest about:** the read-only half is **accident
prevention, not a security boundary.** It lives in the browser. The real rules
stay where they are — on the server, which does not care what the screen
thinks. That is the correct division and it is worth saying out loud so nobody
later mistakes the toggle for a permission.

---

### BUILT 2026-09-09, and one thing works differently from the proposal above

He came back to the desktop and reported three faults at once, two of which
were the same fault: **the x button did nothing, Escape did nothing, and the
only way out of a detailer was reloading the page.** `useLeaving` returns an
ARRAY and the rebuilt panel destructured it as an OBJECT, so `close` was
`undefined` — which React renders without a word of complaint. Escape had
never been wired at all. Both fixed, plus clicking the dimmed area.

**And the impersonation is gone rather than reworded.** His ask:

> *"I don't want to be signed out or I don't even wanna be signing in as
> someone to view their dashboard… There should be just a way that I can view
> it just from me. Not me logging into their account to then be able to view
> their dashboard."*

**THE MECHANISM IS ONE FACT ABOUT BROWSERS: `sessionStorage` IS PER TAB.**
supabase-js keeps one session per storage key, and the dashboard used
`localStorage` — one browser, one identity, so opening a detailer's dashboard
could only ever be a REPLACEMENT. A preview tab now boots its client with
`storage: sessionStorage` and its own key (`app/src/lib/preview.js`,
`app/src/lib/supabase.js`), so the back office tab is neither read nor written
nor signed out. Closing the preview tab is the entire exit and the browser
throws the session away itself — nothing expires, nothing is cleaned up.

**WHAT DIFFERS FROM THE PROPOSAL: the tab does not follow the magic link.**
That link redirects to the edge function's own `PLATFORM_URL`, which is the
live site — so a preview opened on this machine would have landed on
production. The token is pulled out of the link and exchanged in place with
`verifyOtp`, which works on whatever origin the tab is already on. It reaches
the tab through the URL's **hash**, which browsers never send to a server.

**AND THE TAB IS OPENED ON THE CLICK, BEFORE THE AWAIT.** Opened after it, the
browser calls it a pop-up and blocks it in silence.

**THE READ-ONLY HALF IS ENFORCED AT TWO CHOKE POINTS, NOT AT 71 CALL SITES:**
the Supabase client's own `insert/update/upsert/delete`, and `callFn` in
`lib/api.js`, which is every edge-function call the dashboard makes. A screen
written next month is covered without knowing any of this exists. It is still
accident prevention and not a permission — the server is unchanged, no RLS
policy anywhere gained a platform-admin clause, and the preview session is the
detailer's own with exactly the rights it always had.

**Verified 2026-09-09** with a Playwright walk of the real flow: Escape, the x
and the dimmed area each close the panel; the preview tab lands on the
detailer's Today screen; the back office's stored session is byte-identical
before and after and survives a reload; the preview session is in
`dp.preview.auth` in the tab's own drawer; a write refuses while Looking and
the switch flips to Working. Ten checks, all green, at 1440 and 392.

---

## 4 · How it should look — the style sheet

**It keeps the house tokens and takes its own character.** `admin.css` already
shares no rule with `theme.css`, only its colour and corner tokens, and that
stays true.

- **Ground:** the product's `--ink-0`, but the back office runs *denser* — smaller type, tighter rows, more per screen. This is a desk instrument, not a phone.
- **Type:** Archivo for everything human; **JetBrains Mono for every figure**, which is already law 8. Numbers align in columns and never reflow as they count.
- **Colour:** the house green stays the accent for *good and live*. Amber for *needs attention*, red for *broken* — semantic colour kept separate from the accent, so a red never reads as branding.
- **Layout:** a fixed top bar carrying the tabs, then one full-width working area per tab. No two-column split as the fixed skeleton — that is what makes the current screen look empty when nothing is selected. Panels open *over* the content and animate.
- **Motion — the part he actually wants:** the tab change animates, figures count up on arrival, charts draw themselves, a panel opening travels from where it was opened, and rows stagger in. He has asked for this explicitly on this screen, so it gets more than the rest of the product, not less.
- **Every screen verified by looking**, at 1920 / 1440 / 768 / 392, with the console read at each — which is how the off-centre month labels and the clipped header should have been caught before he saw them.

---

## 5 · What I would build first

1. **The shell** — top bar, five tabs, the animation system. Nothing works yet but the shape is real.
2. **Tab 1 (Now)** and **Tab 2 (Detailers)** — everything on them exists today, so they can be complete immediately.
3. **The new impersonation** — new tab, read-only toggle.
4. **Tab 5 (Log)** — the audit table already has the data and has never been shown.
5. **Tab 4 (Plumbing)** with what can be checked today; Netlify is already authorised.
6. **Tab 3 (Money)** last, because its two best parts — Stripe and expenses — are the two that need something from him first.

---

## 6 · What I need from him

1. **Authorise the Stripe connector** — without it, half the Money tab cannot exist.
2. **Expenses: does he want to type them in, or should I only show what can be read automatically?** A form he never fills in is worse than no form.
3. **Deleting a detailer — what should actually happen** to their customers' bookings and their site? This is the one action that cannot be undone and should not be designed by guesswork.
4. **Anything on this list he does not want**, so it does not get built.

---

## 7 · His answers, 2026-09-09 — recorded before they are built

### Deleting a detailer: export, hand it over, then wipe after 30 days
> *"I think they should be saved and exported to a file where I can give it to
> them. But past that, I don't want to have to store information of a past
> client. But it should be easy — let's say if they wanna come back, if they
> just give me a file, I could just add the bookings back. Maybe after thirty
> days if someone cancels, it just wipes them."*

**So the shape is: EXPORT, HAND OVER, WIPE — with a way back in.**

1. **On cancellation, everything about that business is written to one file** and offered as a download. The `export` action already builds one; this reuses it rather than inventing a second format.
2. **Thirty days later the data is deleted for good.** Not hidden, not flagged — gone, because he does not want to hold a past client's customers.
3. **The file can be read back.** This is the part that does not exist and is the real work: an IMPORT that takes an export file and rebuilds the business. Without it the export is a souvenir rather than a way back.
4. **A countdown on the detail panel** while the thirty days run, because a silent timer over somebody's data is how a deletion happens by surprise.

**Two things to decide when building it, not now:** whether the wipe is a
background job or a button he presses, and whether the thirty days start at
cancellation or at his confirmation.

### Expenses: typed in, and recurring ones repeat themselves
> *"It'd be cool if I could type in expenses, and do more than just typing in
> an expense — where it goes 'hey, this is a recurring expense' and you set a
> recurring one. Because right now I'm paying for, like, the hundred dollar a
> month one. So obviously I have to see if I'm actually making a profit."*

So: **a one-off amount, or a repeating one that keeps counting itself every
month without being re-entered.** The reason is stated and it is the whole
point of the Money tab — *am I actually making a profit* — which cannot be
answered while one side of the sum does not exist.

**Note what this means for the MRR figure:** the moment recurring costs exist,
the headline on the Now tab should be **profit**, not revenue, with revenue
and costs underneath it. A big number that ignores a known monthly cost is a
worse number than no number.

---

## 8 · Things he did NOT ask for, and will want

> *"Beyond what I've just mentioned myself is being included. So I mentioned a
> few things, but more than just what I've mentioned should be included. So
> really just think about it, please."*

Ranked by how much they would change a decision he actually has to make.

### 8.1 Who is about to leave — ⚙ needs work, all the inputs exist
Every ingredient is already in the row: days since last booking, jobs trending
down, setup unfinished, no website, requests piling up unanswered. **Today
those are six separate filter chips he has to think to press.** As one ranked
list — *these three are drifting, here is why* — it becomes the reason to open
the screen at all. **With fourteen detailers, losing one is 7% of the
business.**

### 8.2 Booking conversion — ⚙ the data is already being collected
`track-visit` records visits to a booking page. **Nothing anywhere compares
visits to bookings.** How many people land on a detailer's booking page and do
not finish is the single most valuable number in the product — it is the one
that says whether the seven steps are too long, which is a question he has
already asked twice from instinct. **Also the strongest sales line there is:
"your page converts X% of visitors."**

### 8.3 Where people stall in setting up — ⚙ needs work
`setup_inputs` is already sent per detailer. Aggregated it answers: of everyone
who signed up, how many added a service, set hours, published, took a booking.
**A funnel with one step collapsing is worth more than any redesign guess.**

### 8.4 Support search — ⚙ needs a server action
A detailer emails *"my customer says they never got a confirmation."* Right now
there is no way to look that up without opening the database. **One search box
that finds a booking or a customer across every tenant** turns a twenty-minute
job into ten seconds. This is the feature he will use most and has not thought
of, because he has not had a support request yet.

### 8.5 Failed emails, by name — ✅ partly there
The screen already shows *failed: N* for today. **N is useless; the names are
not.** Which customer did not get their confirmation, and why — that is a
customer-facing failure that is currently invisible to everyone including the
detailer.

### 8.6 What detailers actually charge — ⚙ needs work
Every service and price on the platform, aggregated. **This is free market
research**: what a full detail really costs in each area, which services people
add, which nobody uses. It should shape the default catalogue offered to the
next detailer, and it is the sort of thing only a platform owner can see.

### 8.7 Tell him when something happens — ⚙ needs work
He should not have to open this screen to learn that somebody signed up, a
payment failed, or a background job stopped. **Email or push for the four
events that matter.** The email machinery already exists.

### 8.8 A "what changed" feed — ⚙ needs work
Deploys, migrations, price-table edits, in one stream. **When something breaks
the first question is always "what changed", and answering it currently means
reading git.**

### 8.9 Money out, by service — ✅ data exists
Which services earn most across the platform, and average job value by area.
Feeds pricing advice to detailers, which is a reason for them to stay.

### 8.10 The back office on a phone — ✅ free if designed in
He checks things from his phone constantly. The current screen is desk-shaped.
**Not a second design — the same one, laid out to survive 392px**, which the
rest of the product already does.

### 8.11 An accounting export — ⚙ needs work
Subscriptions in, costs out, per month, as a file. **A CPA asks for this once a
year and it takes a day to assemble by hand.**

### 8.12 Backups, and whether one would work — ⚙ needs checking
Supabase takes them; nobody has confirmed they exist or that a restore works.
**The screen should say when the last backup was.** An untested backup is a
belief, not a backup.

### 8.13 Maintenance mode — ⚙ needs work
One switch that puts every booking page into a holding state while something is
being fixed, instead of customers meeting a half-broken form.

---

## 9 · Do we need a survey first? — no, and here is the evidence

He asked:

> *"If you want, you can make an artifact that is just a super long survey with
> tons of questions… that'd be easy for me to go through instead of having to
> read a paragraph. But I don't know. Maybe we don't need that. Analyse and see
> if that's something we need, or if you think you could tackle it all by
> yourself."*

**Recommendation: no long survey. I build it and he reacts.**

**The evidence is this session.** Every genuinely useful correction he has given
came from REACTING to something on a screen — *"the cards are all on one side"*,
*"the headline reappears then fades"*, *"why is it just explaining what the
pictures are"*, *"these are super low res"*. **Not one came from him being asked
what he wanted in the abstract.** `docs/sessions/product.md` § 3b already
records this as the rule for handling his notes: *"he picks faster than he
specifies."*

A fifty-question survey asks him to imagine a screen he has not seen, which is
the one thing he is slowest at, and it would take longer to fill in than the
build would take to look at.

**What replaces it: a short list of real forks, each attached to something he
can see, asked when it comes up rather than all at once.** Two of the four are
already answered (deletion, expenses). The remaining ones are in § 6.

---

## 10 · His answers to § 8, and one new tab item — 2026-09-09

**He approved all thirteen** — *"you said there's other thirteen ideas, I think
just add all of them"* — and singled out four as *"I love that idea"* /
*"that's good too"* / *"that's cool too"*: **who is about to leave**, **booking
conversion**, **support search**, **failed emails by name**, and **what
detailers actually charge**.

### 10.1 An email viewer — ✅ CONFIRMED POSSIBLE, and better than he hoped
> *"I wanna have on my back office dashboard just a way to view the emails that
> are getting sent out — a preview of what it looks like and what was sent out.
> Because I constantly find myself checking Resend and looking at it. I don't
> know why, I'm just curious. But I think that would reaffirm, oh yeah, it got
> sent. Maybe some information like delivered or bounced. I don't know if that's
> possible to get from the API."*

**It is. Checked against the live account, 2026-09-09**, not assumed. The API
returns, per email: **recipient, subject, delivery status, timestamp**, and —
fetched by id — **the full HTML body**, which means the preview he wants is a
real preview of the real email rather than a re-render of a template.

So the panel is: a list of what went out, filterable, each row opening the
actual message as the customer received it, with its status beside it. **This
replaces a habit he already has** (opening Resend to check), which is the best
possible reason to build something.

### 10.2 AND IT IMMEDIATELY FOUND A LIVE PROBLEM — see § 11

---

## 11 · FOUND WHILE CHECKING THE EMAIL API: the reminder sweep is flapping

**Not a feature request. This is happening right now.**

Reading the last 40 emails to answer a question about the API turned up this,
alternating, for the last two days:

```
  "The reminder sweep has stopped running"   08:22
  "The reminder sweep is running again"      08:37
  "The reminder sweep has stopped running"   13:52
  "The reminder sweep is running again"      14:04
  ... twelve or more complete cycles in about forty hours
```

**The configuration, read rather than guessed:**

- `send-owner-reminders` is scheduled by `pg_cron` every **15 minutes**
  (`*/15 * * * *`, `20260829000000_reminder_sweep_cron.sql`)
- its heartbeat goes stale after **2700 seconds — 45 minutes**
  (`job_heartbeats.stale_after_seconds`)
- so it already tolerates **two consecutive missed runs** before it alarms

**Which means the alarm is not hair-trigger — three or more runs in a row are
genuinely being missed, several times a day.**

**Two candidate causes, and the first is much more likely:**

1. **The project is going to sleep.** `kguqylyzgyzfktkfnhjb` is the development
   platform project. A dormant Supabase project suspends, which takes `pg_cron`
   with it; the next request wakes it and the sweep resumes. **The recovery
   pattern fits this exactly** — it comes back shortly after somebody touches
   the project, and the quiet gaps are longest overnight.
2. Genuine cron unreliability.

**Why it matters even though nothing is lost:**

- **Alarm fatigue.** A dead man's switch that cries twelve times a day is one
  he will stop reading — and it is the only thing watching the sweeps.
- **It is eating the email cap.** ~24 messages a day against a 100/day
  platform cap, for no information.
- **It makes the Plumbing tab's case.** "Last ok: 4 minutes ago" is true and
  useless; **the history is the diagnosis**, and nothing keeps one. § 8's
  uptime-history item stopped being a nice-to-have the moment this turned up.

**NOT FIXED, and deliberately so:** `supabase/` belongs to another lane, and
the fix is a judgement call between raising the window, changing the schedule,
keeping the project awake, and suppressing repeats — which is his call, not a
session's.
