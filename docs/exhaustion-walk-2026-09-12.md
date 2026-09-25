# The exhaustion walk — every settings screen, and how to reach it

**Written 2026-09-12 for Claude Cowork, who is walking these by hand.**

**THIS IS A ROUTE LIST, NOT A MEASUREMENT, AND THAT IS DELIBERATE.** A probe was
built for this and thrown away. His ruling, and it is the right one:

> *The exhaustion test is not a measurement. It is written in the rules as a
> test rather than a quota precisely because a count can be satisfied without
> fixing anything: splitting twelve identical rows into two blocks of six
> passes any threshold you pick and changes nothing.*

Three passes of that probe each disagreed with the screen in a different way —
it reported zero rows for Hours, one row for Reviews, and it walked the Business
index while believing it was in the gear. Every wrong reading looked exactly
like a right one. **A check that measures the wrong thing is worse than no
check**, which is this repo's oldest failure (`sweep-widths.mjs:605` printing
*clean* over 38 findings; `spanish.test.mjs` passing 58 over 141 gaps), and it
was nearly built a third time here. Nothing from it survives in the repo.

**THE REFERENCE FOR WHAT A GOOD ANSWER LOOKS LIKE IS INSIDE THIS PRODUCT:**
Booking rules, Notifications, and setup step 11 — folded summary rows that state
their own current value, in the Business tab's `.nav-row` pattern (`Folded` in
`components/controls.jsx`).

---

## How to get in

Sign in at `/app` as `demo@detailplatform.com` (password in `docs/platform-admins.md`).

Two doors, and they hold different screens. **Clicking a door's own button while
its panel is open TOGGLES it shut**, which is worth knowing before you wonder
why a row vanished.

- **The Business tab** — bottom bar / left rail, labelled **Business**. Holds
  what changes something a CUSTOMER meets.
- **The header gear** — labelled **Settings**. Holds the plumbing.

Every row below is reached by pressing the row. **Escape** closes a screen and
returns you to the index.

---

## The Business tab, in the order the rows appear

| Row you press | Source | Page is |
|---|---|---|
| Finish setting up | `components/SetupForm.jsx` | 1,479px — a launcher, not a settings screen |
| Business info | `screens/more/BusinessInfo.jsx` | 1,523px |
| Your color | `screens/more/Appearance.jsx` | 449px |
| Photo gallery | `screens/more/Gallery.jsx` | 132px (empty on the demo) |
| Reviews | `screens/more/Reviews.jsx` | 780px |
| FAQ | `screens/more/Faq.jsx` | 915px |
| Your web address | `screens/more/WebAddress.jsx` | 901px |
| Tracking links | `screens/more/Campaigns.jsx` | 469px |
| Services & add-ons | `screens/more/Catalog.jsx` | 1,390px |
| Monthly plans | `screens/more/Plans.jsx` | 1,226px |
| Maintenance deadlines | `screens/more/Maintenance.jsx` | 780px |
| How you get paid | `screens/more/Payments.jsx` | 1,289px |
| Promo codes & sale | `screens/more/Promos.jsx` | 758px |
| Hours & days off | `screens/more/Hours.jsx` | 974px |
| Booking rules | `screens/more/BookingRules.jsx` | 2,336px — **a reference screen** |

## The header gear

| Row you press | Source | Page is |
|---|---|---|
| Notifications | `screens/more/Notifications.jsx` | 1,591px — **a reference screen** |
| Message templates | `screens/more/MessageTemplates.jsx` | 535px |
| Team | `screens/more/Team.jsx` | 998px |
| Your subscription | `screens/more/Billing.jsx` | 538px |
| Your password | `screens/more/Password.jsx` | 410px |
| This device | `screens/more/Preferences.jsx` | 867px |
| Report a problem | `screens/more/ReportProblem.jsx` | 535px |
| Show me around | `components/Walkthrough.jsx` | 743px — a launcher, not a settings screen |

**The heights are content height at 1440x900 — how far the page scrolls, and
nothing more.** They are not a verdict and two screens of the same height can
read completely differently. They are here so a 2,336px page and a 410px page
are not walked with the same expectation.

## A twenty-second screen you cannot reach on the demo

`switch: [SwitchBusiness, "Switch business"]` is in `screens/more/index.js` and
is **only ever offered when the account has more than one membership**. The demo
owner has one, so it is not in either index and a walk of the demo never meets
it. `index.js` says in as many words that it is a picker rather than a form and
does not share the settings skeleton — so it is probably out of scope for this
test, but it should be a decision rather than an omission.

---

## The eleven setup steps

`/app?setup=1`. **"I'll do this later" advances without marking the step done**,
so walking the flow changes nothing about the business.

**EVERY STEP RENDERS A REAL SETTINGS SCREEN** (`lib/setup.js` § REBUILT
2026-09-10) — the fourth column of `STEPS` is a key into `screens/more/index.js`.
So a step is the same screen you met above, wrapped in the form, with a heading
and one sentence added on top. **A screen that reads as exhausting in the gear
reads as exhausting here too, and fixing it once fixes both.**

| Step | Heading | Renders |
|---|---|---|
| 1 | What do you charge for? | Services & add-ons |
| 2 | When are you open? | Hours & days off |
| 3 | Where does the work happen? | Booking rules |
| 4 | Who are you? | Business info |
| 5 | What color is yours? | Your color |
| 6 | What people say about you | Reviews |
| 7 | Questions customers ask | FAQ |
| 8 | How you get paid | How you get paid |
| 9 | Running a discount? | Promo codes & sale |
| 10 | Monthly plans | Monthly plans |
| 11 | Messages you send | Message templates — **a reference screen** |

**SO THE ELEVEN STEPS ARE ELEVEN OF THE TWENTY-ONE SCREENS.** Ten settings
screens are NOT in setup at all: Photo gallery, Your web address, Tracking
links, Maintenance deadlines, Notifications, Team, Your subscription, Your
password, This device, Report a problem. Those are only reachable through the
two indexes.
