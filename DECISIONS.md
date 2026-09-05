# Decisions Log

Judgment calls made while working autonomously, per the Phase 2 brief —
each picked as the option easiest to change later.

<!-- INDEX:START — checked by `node scripts/decisions-index.mjs`. Add a section
     to this file and add its line here, or that check fails the build. Find
     things by HEADING TEXT, not by line number: headings are stable, line
     numbers move every time anyone appends. -->

## Read this before you go digging

**This file is over 11,000 lines and nobody reads it end to end — including the
agent that wrote most of it.** That is the problem this index exists to fix.
Do not read the whole file. Find the two or three sections that touch what you
are about to change, read *those* in full, and move on. A decision you did not
find is worse than one that was never written down, because it looks like
diligence.

### The five that have actually cost sessions

Each one is a mistake this project has already paid for, and the first three
were made more than once.

1. **A tint of the accent is a ground.** The tenant's colour has been
   corrected against the wrong background *three separate times* — roadmap
   2.3, 2.4 and 2.6 — and the error is identical every time: the ground was
   named from the stylesheet's surface tokens, while the value was actually
   landing on something built out of the accent. Before touching any colour
   read *Roadmap 2.4*, *Roadmap 2.3, reopened* and *Roadmap 2.6*, then run
   `node scripts/accent-sweep.mjs`.
2. **Verify by looking, in a real browser, at his widths.** Two sections exist
   only because a bug survived code review and screenshots taken at the wrong
   size — *Test at HIS screen size, not yours* and *He asked whether we
   actually look at the screens*. 1920 is his monitor, 392 is his phone, and
   `node scripts/sweep-widths.mjs` is the automated half.
3. **A skipped check reads exactly like a passing one.** Five contrast rows
   guarded by an always-false `if` "passed" for weeks by doing nothing. See
   *A skipped check reads exactly like a passing one* and *Baseline a new
   check against the last known-good version*.
4. **Never measure a transformed element with `getBoundingClientRect`.** This
   design animates by transform almost everywhere, so a rect is a scaled box,
   not a layout box. Design-system law 12, and it came from a real bug.
5. **The owner has already decided a great deal — do not re-propose it.** See
   *Owner decisions*, *The owner's answers of 2026-08-30* and *The owner
   walked the whole product*. Re-opening a settled call wastes his time and
   reads as not having done the reading.

### If you are about to touch this, read these

| About to touch | Sections to read |
|---|---|
| **Any colour, accent or contrast** | Roadmap 2.4 · Roadmap 2.3, reopened · Roadmap 2.6 · ANSWERED: the dashboard DOES take the tenant's colour · The new design system |
| **The customer booking page `/book/:slug`** | **Roadmap 2.14, step 3 — the plan surfaces, and why nothing was added to a step** · **Roadmap 2.5 — the smoke test, and the single-mode crash it found; run `node scripts/e2e-booking.mjs`** · Roadmap 2.1 · The customer booking page is dark · Roadmap 2.6 · Roadmap 2.7 · Roadmap 2.8b · Roadmap 2.4, the last piece |
| **The dashboard `/app`** | **Roadmap 2.11, step 6, stage 2 — the job record, and the two defects the specification had already described** · **Roadmap 2.11, step 6, stage 1 — what is BUILT, and what stage 1 deliberately left** · **Roadmap 2.11, step 4b first if it is the PHONE — it overrides step 4 there, and PHONES ARE PORTRAIT ONLY** · **Roadmap 2.11, step 4 — it is the current design of every screen** · Roadmap 2.11, step 5 (which components, and what a list is) · Roadmap 2.11, step 3 (desktop) · Roadmap 2.3 · Roadmap 2.3, reopened · Roadmap 2.6 · Roadmap 2.7 · Roadmap 2.8b · Phase 2 · Phase 2 follow-ups |
| **The marketing page `/`** | Roadmap 2.2 · Positioning: what we sell is the pair · Building 1.4 · Building the marketing rewrite · Cutting a section · His four instructions on the rewrite |
| **Anything animated** | Ease the beat, not the hold · The load-in animation is too slow · Roadmap 2.3, reopened · Roadmap 1.3, the rebuild |
| **Spacing, layout, or anything at phone width** | **Roadmap 2.11, step 6, stage 1 (a grid row is as tall as its tallest item — a flat DOM cannot carry a second column)** · **Roadmap 2.11, step 4b — PHONES ARE PORTRAIT ONLY and rotating one must change nothing; landscape is a HEIGHT problem and the sweep is blind to it** · Roadmap 2.6 · Test at HIS screen size, not yours |
| **A test, a check, or a measuring script** | Roadmap 2.11, step 6, stage 2 (the job record had never been swept at all; and a pinned thing must be tested at the height that SCROLLS) · Roadmap 2.11, step 6, stage 1 (`DESKTOP_SPEC_BUILT` is armed; the rotation guard was THREE places, not the two the file listed — grep the breakpoint) · Roadmap 2.11, step 4b (a green check that could not see the failure — the THIRD time; and why the check written for it was DELETED rather than left dormant) · Roadmap 2.11, step 5 (what `composition.test.mjs` test 1 must assert) · A skipped check reads exactly like a passing one · Baseline a new check against the last known-good version · Never measure a transformed element with getBoundingClientRect |
| **`main`, deploying or publishing** | The owner put the redesign on `main` and published it · ANSWERED: Netlify does auto-publish `main` |
| **Keys, RLS, the public repo, or the live business** | Phase 0 — 0.4 deployment sanity · Abuse check on the live project · Roadmap 0.1 cleanup · A guessable demo login |
| **Email or reminders** | **Roadmap 2.18, step 1 — what the trade actually sends, and the SOURCE-SHAPE trap in `email-brand.test.mjs`** · Every email headline in the product was under the contrast floor · Roadmap 2.11, step 6, stage 6 (`brandColor.js`, the one allowed second implementation) · Phase 0 — 0.2 email · Test deployment and later fixes |
| **Signup or a new tenant's first run** | Signup · Phase 2 follow-ups |
| **The design system itself** | The new design system · Roadmap 1.3, the rebuild · Phase 1 — reference analysis · Design system (August 2026), for history only |
| **Anything he may already have ruled on** | Owner decisions · The owner's answers of 2026-08-30 · The owner walked the whole product · Removed on purpose · Four threads from the owner before clearing |

### Everything in here, oldest first

**Phase 2 and earlier — the original build**

- **Phase 2** — the first batch: no dashboard spec existed, overlap edits became hard rejections, vehicle pricing moved per-service.
- **Phase 2 follow-ups** — the spec turned up; the missing `.ics` file, theming, staff accounts.
- **Test deployment and later fixes** — the private Netlify test site, and what it is and is not for.
- **Design system (August 2026)** — the OLD system, "Raking Light". Anti-reference only; it was replaced in 1.5. Read *The new design system* instead unless you want the history.
- **Signup (August 2026)** — two screens, not a wizard, and what `create-business` seeds so a new booking page works immediately.
- **Removed on purpose** — features cut from the old site. **Superseded by the next entry**: he wants them all back.
- **Owner decisions (2026-08-28)** — he reversed those removals. Full parity with the old business, rebuilt as per-tenant features.

**Phase 0 — plumbing, security, email**

- **Roadmap 0.1 cleanup** — the old project was never opened to anonymous writes; proven with read-only queries, not assumed.
- **Phase 0 — 0.2 email** — root cause: the from-address was Resend's shared sandbox sender, deliverable only to the account owner. No code was at fault.
- **Phase 0 — 0.4 deployment sanity + a security finding** — **the repo is PUBLIC and a live service-role key sits in its history.** Still open; he will rotate when the build work settles.
- **Abuse check on the live project** — was that key ever used? No sign of it, proven read-only without ever presenting the key to anything.

**Phase 1 — choosing the look**

- **Phase 1 — 1.1/1.2 the design brief** — built the instrument and asked the questions; nothing visual was invented ahead of him.
- **Phase 1 — 1.2 answered** — he declined every defect offered. B3 reframed the whole brief.
- **Phase 1 — Part C answered** — he refused to rank the screens ("I do want all of them") and gave an expressiveness budget instead.
- **Phase 1 — reference analysis** — seven sites read at code level. `TASTE-NOTES.md` is his own words on how pages MOVE and is the primary evidence.
- **Four threads from the owner before clearing** — the Apple framing was wrong, and the correction is load-bearing.
- **Phase 1.3 — four directions** — Apple read at code level first; four directions built, all rejected.
- **Roadmap 1.3, the rebuild — direction 5, "The Thread"** — the direction that won, and why split-stage was killed.
- **Ease the beat, not the hold** — distribution across a scroll must be linear; the easing belongs inside each beat.
- **Never measure a transformed element with getBoundingClientRect** — design-system law 12, from a real bug.
- **Test at HIS screen size, not yours** — a rail with 40px of travel on his 1920 monitor. A process lesson worth more than its fix.
- **"Something feels a little missing" — the likely answer** — he was right: the page has no proof on it, and there is none to invent.
- **Removing the owner section** — and why its word-brightening mechanic was deliberately not re-homed.
- **His four instructions on the rewrite** — including which table row is ours rather than the deck's.
- **Building the marketing rewrite** — what was mine versus his approved deck, and one pre-ship blocker.
- **The owner's review of the repointed page** — the iPhone check passed; four decisions, all his.
- **Building 1.4** — the judgment calls made while turning the positioning into a page.
- **Positioning: what we sell is the pair** — **read the correction at the end of that section first;** he amended the framing the same day.
- **Cutting a section** — measure what the length is actually made of before choosing what to cut.
- **Baseline a new check against the last known-good version** — a checker that fails a known-good build is measuring the wrong thing.
- **The new design system** — roadmap 1.5. "The Thread" is law, and the reference page outranks the document.
- **A skipped check reads exactly like a passing one** — five contrast rows silently did nothing for weeks.
- **The owner's answers of 2026-08-30** — 1.4 approved, and no light theme.

**Phase 2 — applying the look**

- **The customer booking page is dark** — asked separately from the dashboard, and decided on positioning rather than taste.
- **Roadmap 2.1** — the booking page restyled. The first surface in `app/` to carry the system.
- **Roadmap 2.2** — the landing page ported. A transplant of the approved rendering, not an interpretation.
- **The owner put the redesign on `main` and published it** — his instruction, overriding the standing rule for that one action.
- **ANSWERED: Netlify does auto-publish `main`** — settled by pushing it and watching the live site change. **A push to `main` IS a publish.**
- **Roadmap 2.3** — the dashboard restyled, and the four things it deleted. The one surface with no reference page to copy.
- **ANSWERED: the dashboard DOES take the tenant's colour** — the opposite of the way 2.3 had built it.
- **The load-in animation is too slow** — a precise report from him: the ground was fine, the panels were not.
- **A guessable demo login, on purpose and temporarily** — and why removing the sign-in page would achieve nothing.
- **He asked whether we actually look at the screens** — yes, and it is a standing expectation, not a one-off question.
- **Roadmap 2.3, reopened** — three things he sent back. The three defects found on the way are the part worth reading.
- **The owner walked the whole product** — twenty-seven items and two decisions; his verdict on the design was positive.
- **Roadmap 2.4** — making almost any colour work everywhere. **Law 11b was born here: the accent is identity, never meaning.**
- **Roadmap 2.4, the last piece** — the manage page drew four identical pills and had no first thing.
- **Roadmap 2.6** — the clipping and spacing half of the walkthrough, plus design-system law 15 and a third accent-ground fix.
- **DECISIONS.md got an index** — why this file has a map, why the hooks are hand-written, and why nothing was deleted.
- **Roadmap 2.7** — the features half of the walkthrough. W16 got an instrument, W1 was not where the roadmap pointed, and W4 turned out to be a live hole rather than a feature.
- **Roadmap 2.8** — how other detailers actually work. **Two of the five open items needed no migration at all, and the owner's W22 premise turned out backwards.**
- **Roadmap 2.8b** — building the five. **Step 1’s tightest screen is 1440x900, not the phone, and the vehicle-size ceiling is four rather than six.**
- **The owner asked whether the categories were actually researched** — they were, and he found a hole: a complete package and its own components in different categories can both be booked. **$1,645 for $625 of work, reproduced.**
- **Roadmap 2.8c** — building the six he asked for. **The travel fee had been displayed and never charged since the quote engine was written.**
- **The owner's answers to 2.8, and the one that overruled the research** — he was the sixth menu shape. **Five menus rule shapes IN; they cannot rule the rest OUT.** Carries the measured step-1 ceiling: his own menu overflows by 119px.
- **Roadmap 2.9 — the 320px floor** — four failures were one failure, and **two of them were already overflowing their card at 360 where the sweep could not see them.** A clean sweep means nothing is off the SCREEN, not off its box.
- **The owner reopened the dashboard's architecture** — the five tabs and the More screen are a copy of his own admin page; 2.10 rethinks WHERE things live and explicitly not how they look.
- **Roadmap 2.10 — the architecture proposal** — four of the five tabs survived a from-scratch derivation; **"what you sell" is top-level in five of six trade products and is a chevron inside our Settings screen.** Also: the push switch has no client and does nothing.
- **Roadmap 2.10, part B — the owner widened it to every screen** — he chose "Business" and delegated the rest. **There is no desktop layout: one 724px column at every width, and History is 3,619px tall on a 1440 monitor AND on a phone.** Plus a composition test that cannot see the failure it exists to catch.
- **Roadmap 2.11 — he asked for the dashboard from scratch** — desktop gets a real SPECIFICATION, and the rebuild is sequenced inventory → research → spec → screens → components → his approval → build. ~~One question is open~~ **ANSWERED: the look stays.**
- **"The look stays" — what that actually fences off** — his words, and then his own follow-up ("just the colors and fonts, right?"). **It is not: the ground, the accent-is-never-meaning rule, the motion budget and the accessibility floors ride along with it.** Three buckets, in roadmap 2.11.
- **Roadmap 2.11, steps 0–2 — the day is seeded and the list is written** — 118 capabilities from five sources, and **Today had never been looked at with anything on it.** Five new defects the empty screen was hiding, the worst being that **“Your colour” cannot change the colour customers see in their email** — four of twelve presets under the contrast floor, and “Sky” draws the invoice title 1:1.
- **His answers to the inventory's seven** — all seven the same day, and **three answered bigger than they were asked.** Q1 overruled the recommendation (a setup FORM plus a separate guided tour); **Q5 became roadmap 2.12** — a switch between a booking that RESERVES and a booking that is a REQUEST. And the caveat that matters more than any answer: **the file was too long for him to read.**
- **Roadmap 2.11, step 3 — the desktop specification, and a "no" he asked for** — two derived breakpoints and **five screens given five DIFFERENT wide forms**, because "list left, panel right" five times is law 1's own named failure. **Calendar stays ONE column and Part B's approved "month beside the day" was overruled by measuring it** (a split cell is 104px; one column is 163px). **The week view is ruled NO**, with the month cell as its replacement. And the sweep grew a fifth check because the four it had reported CLEAN at 1920 with a 724px column.
- **Roadmap 2.11, step 4 — every screen designed, and three defects fixed on paper** — the three were **re-measured in a live browser** before being designed against (three rails not one; a finished job wearing the "ahead" node; a paid job wearing the tenant's accent where the calendar uses the fixed green). **A fourth was found by looking and nothing had named it: leaving Today and coming back throws the whole day away and redraws it**, and `reload()` does the same after every "Mark complete". The label fix is a **deletion** — two runs collapse into one — and **one question deleted itself by reading the schema instead of asking him.**
- **Roadmap 2.11, step 5 — the component inventory, and three rulings** — **twelve new files, one deleted, and nothing invented.** History's and Clients' column-carrying row is ruled **one CSS chassis with two call sites, not a React component and not a new “table”** — which spends bucket 2's one permitted vocabulary addition on nothing, deliberately. That ruling also settles **2.10's declined decision 7**: `composition.test.mjs` test 1's allowance becomes per-CALLER, not per-component, which is the half that makes it able to see the failure it exists to catch. Plus the setup form's progress rule (**a segment fills when a step is COMPLETED, never when it is passed** — otherwise the bar and Business's “3 of 7 done” are two numbers that disagree) and the walkthrough's spotlight (**one element and a 9999px shadow**, verified against the EMPTY dashboard rather than the demo). **Three things found by counting: `--wrap` has never existed in `theme.css`, `.badge` is seven dead rules duplicating `.pill`, and two settings-screen counts in the files above are off by one.**

- **Roadmap 2.11, step 6 — how the approval was ASKED, and a build order nobody had written** — a SIXTH file for a man who said there were too many words, and the reason it is not a contradiction: the five files each have a one-pager, but none of them is a layer ACROSS the five, and the ask and his answer would otherwise live only in a chat the next `/clear` destroys. **It is organised around the eight things the specification TAKES AWAY or contradicts him on, not around what it adds**, numbered so a partial no costs him three words. **A build order is proposed because no other file has one** — the shell ships WITH Today rather than before it (a session whose deliverable cannot be looked at, on a project verified by looking), and first run is last. And one claim in the draft was false until `theme.css` was opened: Today's payment panel is not an orange warning box, because **there is no amber in this system.**

- **Roadmap 2.11, step 6 — his answer, and the two claims that did not survive contact with the code** — **APPROVED WITH AMENDMENTS the same day.** He **lifted the no-schema rule** that four steps of specification were written inside — *"I don't know why there was a rule that did not edit the back end"* — and what he actually wants fenced off is the opposite thing: the OLD DASHBOARD's structure, with the landing page's look kept. **Two of this session's own claims died on contact with the code:** Today's "orange warning box" (there is no amber in the system) and the "dead" travel fee (`pricing.ts:135` charges it — a field dead in ONE CONFIGURATION is not a dead field). **He reversed the push removal on a belief the code does not support** — there is no service worker at all, so the EMAIL is what reaches him — and the right answer was to build the missing half rather than re-ask. **The tab bar was closed on his own condition by SHOWING the derivation** rather than re-running it. **Three asks became roadmap 2.13, 2.14 and 2.15** instead of swelling this item, and **phone landscape (844x390) is wired but deliberately not armed**, same shape as `DESKTOP_SPEC_BUILT`. **Then two clarifications from him closed 2.15 unstarted** — he refused automatic travel calculation and the alternative he described (*"the customer just ticks… are you outside of ten mile range"*) is `travel_zones`, already shipped — and confirmed his push sighting was his OWN business's dashboard, a different product entirely. **Three wrong claims in one session, all from trusting a document over the code it described.**

- **Roadmap 2.11, step 4b — the phone re-decided, and he ruled it portrait-only** — the owner rejected *"below 1024 nothing changes"*, so **every screen’s phone form was decided again from nothing**; "unchanged" was not an allowed answer. **He then reversed his own morning ask and ruled phones PORTRAIT ONLY** — and the reversal is the load-bearing part: *"when someone flips their phone over sideways, I don’t want it to completely readjust."* **That is not "do nothing" — the dashboard readjusts today**, because `theme.css`’s `min-width: 700px` and `560px` rules fire on a sideways phone (844px wide) and turn a settings sheet into a desk panel showing 20% of its form. Both gain `min-height: 500px`. *A layout decision that spends height must ask about height.* **The finding that outlived the withdrawn landscape work:** `sweep-widths.mjs 844` reported CLEAN on a viewport where the sign-in card sits 25px past the bottom — every check it owns asks about the RIGHT edge. **The four portrait decisions:** only the lit job is a card (five identical 289px cards is our own named slop tell); a settings screen becomes a page; Today’s ledger panel becomes one row of figures; a Clients row drops the email for spend and last visit. **And the process lesson: a whole landscape layout was built before he saw a sentence of it.**

- **Roadmap 2.11, step 6, stage 1 — the shell and Today built, and the grid row that made a flat DOM impossible** — the first code in the rebuild. **`DESKTOP_SPEC_BUILT` is `true`** and the content column went 724 -> **1,144px**; Today went **1,810 -> 1,006px at 1440x900** and **2,500 -> 1,103px at 392**. **Three things a later session would otherwise re-derive the hard way:** a grid row is as tall as its tallest item, so the second column sharing row 1 with the masthead pushed the ledger 264px down the page and there is no way to span an unknown number of IMPLICIT rows — the primary column has to be one element and the stagger has to look one level deeper; the rail's `animation: none` override has to sit AFTER the stagger block it overrides, because both selectors are (0,3,0) and source order decides; and **the rotation guard was THREE places, not the two the phone pass listed** — the calendar cell's own 700px rule spends height too. **The list was the bug, not the rule: a file naming two instances of a pattern invites a session to fix two and stop.** **And exercising the record's new container found two defects on `/job/:id`** — the page a push notification opens: losing the `<Sheet>` took its only way back, and every exit from it went to `/`, **the marketing site**, because the dashboard is `/app`. The second predates the rebuild and was only findable by PRESSING the control the first one added. **And the hook fix had to be finished on its other two callers** — Calendar showed September's marks under an August heading with nothing saying so, which is worse than the spinner it replaced: *fixing the shared function is right, and it is only half the fix if the callers each had to answer it.* Also: **two sessions were given this same prompt and both wrote to the tree**, so the collision and how it was resolved are recorded here rather than dying in a chat.

- **Roadmap 2.11, step 6, stage 2 — the job record, and two defects the specification had already described** — the 340-line single scroll became an action bar over five named sections, and the bar is **PINNED**. **`position: sticky` because the record has THREE containers** (a sheet, the desk's second column, `/job/:id`) and it is the one mechanism that behaves in all three without any of them knowing about the others — but **`top: 0` alone stuck the bar 18px down**, because a sticky box may not leave its CONTAINING BLOCK and for a child of `.sheet-body` that is the CONTENT box, 16px inside the scrollport. **Only visible at the 56vh peek a phone opens at** — every screenshot script here pulls the sheet to 92vh, where the record nearly fits and the bar never sticks: *a pinned thing has to be tested at the height that scrolls, not the height that is convenient to photograph.* **TWO LIVE DEFECTS, both of which the specification had already described in the present tense without anyone noticing it was a bug report:** *Finalize payment* only ever appeared while a job was `confirmed`, so the record behind Today's *Needs payment* card **had no way to take the payment**; and **nobody has ever seen “Reminder sent to customer.”**, because all four callers close the record on any change. **A specification can describe a bug and read as a design; building it is what surfaces that, not reading it.** Also: **the job record had never been swept at all** — same family as the always-false contrast rows and `dead-width` — and *at most one accent fill* on the record turned out to be a consequence of the statuses rather than a rule to enforce. **And walking it with a KEYBOARD found a defect that was never about this screen: `Sheet.jsx` says `aria-modal="true"` and did not trap focus, on all eleven sheets** — tabbing out of the record went through four job rows before it reached the sheet's own Close. Fixed in the shared component. **A closed `<details>` lies about its contents** (`getClientRects()`, a 46px box and a live `offsetParent` all say visible; only `checkVisibility()` says false), which is why the trap watches where focus LANDS instead of computing which control is last.

- **Roadmap 2.11, step 6, stage 3 — the calendar, and a signature move that had never once run** — Month, the day and History. **The one to carry: Today's staggered arrival has been DEAD since the shell shipped** — the reveal block's second form reads `.app-main > .group > .col-1 > *` and a split screen's root is `.split`, so `.col-1` **is** a `.group` rather than a child of one and the selector matched nothing. **Nothing in the product could report it**: a stagger that never runs looks exactly like a screen that has finished arriving, and the screenshot scripts photograph the end state on purpose. Found by reading the COMPUTED `animation-name` on the live screen. *A mechanism whose failure mode is SILENCE needs a check that asserts it RAN, not one that asserts the screen looks right* — third member of the `dead-width` family. **The day does NOT go through `RecordHost`**: it is not a record, it never opens beside its list, and it must not open over the grid it is read against, so it opens inline BELOW at every width — the only panel in the product that does. `DaySheet` takes an `inline` prop instead of losing its sheet, because Today's *Tomorrow* still wants one. **The day and the history had never been swept at all** — the tab was, the other two screens were not, which is stage 2's finding one stage later. **An `auto` amount column made a ruled list ragged** (every row is its own grid, so `$65.00` and `$235.00` gave the fr columns different widths and *what* started 4px apart); `display: contents` is what lets one markup be two cells on a phone and five columns at a desk. **`useBookings` swallowed its error**, so a failed read drew an empty month, an empty day and an empty Money period with nothing saying so — fixed in the hook AND finished on all three callers. **And `composition.test.mjs` test 1's rewrite passed against the exact commit it was written to catch** on its first attempt, because `[^)]` cannot cross a callback's own `(b) =>`; baselined both ways now. Also: Escape closes the record at BOTH widths, guarded on there being no modal over it.
- **Roadmap 2.11, step 6, stage 4 — Money, the accountant export, and a chart nobody had measured** — The zero line (−$114 and +$114 drew the IDENTICAL bar), and a second defect only measuring found: **the bars themselves were 1.51:1 and 1.68:1** against the ground, under law 9's 3:1 non-text floor, which every previous reading had treated as being about EDGES — a bar is the graphical object the content is IN. Raising them cost the selection something and it was MEASURED rather than left as a worry — the lit bar is 3.74:1 against the ground on Slate and the dim ones 3.18, **1.18:1 between them** — so selection gained two cues that are not hues: the column behind the bar is TINTED and the period's LABEL is lit, and the tint was then checked the other way (the lit bar still clears 3.04:1 against its own tinted column). **The 60/40 chart is right only once there is a loss** — six winning bars over 48px of reserved emptiness made the rule read as a gap, so it is 72px until a bucket loses money. **The export is a FLAT ledger because that makes it checkable**: the Amount column adds up to the Net on the screen, pinned by `tests/money-export.test.mjs`, baselined both ways. **Three layout numbers in step 4 were written before the control existed** and all three lost to a measurement (1.35/1 not 1.2/1; the export on its own row; the segmented wrap ending at 700 **with the rotation guard — its fourth site**). **"Waiting on payment" was answering a period question** — switching Month→Week changed who owed you money. **`loadExtras` swallowed all three of its errors**, which is `useBookings`'s stage 3 defect in the file next door: `const { data } =` destructures the error away, and it is written that way to keep the line short. **THE OWNER OVERRULED STEP 4 §4**: the day opens BESIDE the month at ≥1180 in a fixed 420px column, `--wrap` lifts to 1720 for that one screen via `:has()`, and the month keeps its written cells only while the grid is ≥1,024px — so at 1440 it becomes marks while the day is open, which is the trade he named.
- **Roadmap 2.11, step 6, stage 5 — Clients, the client record, and three of his own corrections** — The one screen with NO PANEL and the one record with NO CONTAINER, both built: `RecordHost` gained a `bare` prop rather than the `ClientRecord.jsx` the inventory predicted, because a component with one caller extracted to satisfy a prediction is the abstraction this repo's rules forbid. **The list is full-bleed only while no client is open** — every other split screen has something to put in column two and this one does not, so an always-on grid left 465px permanently dead INSIDE the content column. **Law 1's "History and Clients must not be the same shape" is answered by structure**: History has a time axis (status marks, month rules, money last), Clients has none (search first, sort only, phone last). **Part B rows 6 and 18 are struck** — last visit could print a future date because it never asked whether the job had happened. **THE LIST READ SWALLOWED ITS ERROR, the THIRD site of `const { data } = await`** after `useBookings` and `loadExtras`. And three owner corrections that arrived with the prompt: **the Money period control's 3 + 2 wrap** (five cells of two sizes; now equal columns, and 4px of padding rather than 6 is the whole difference between one line and two at 392), **"Export for my accountant" -> "Export"** on the period line — *a label names what the control DOES, never who the result is for* — and **the ground's two lights now carry the tenant's colour**, mixed into them rather than added as a third light, with the alphas untouched, because more light moves every floor measured against the ground.
- **Roadmap 2.11, step 6, stage 6 — Business, the twelve settings screens, and three repairs** — `More.jsx` is deleted. **The admission test is in the CODE**: a row belongs on Business only if it changes what a CUSTOMER meets, otherwise it goes behind the header gear — eight rows in three groups, four behind the gear. **The gear is a DESTINATION, not an overlay**, so `SettingsHost` decides page-or-column once for both doors and a settings screen is never a sheet again. **Staff get THREE rail buttons** (two files said four; the number was inherited from before Business was also taken from them). **TWELVE settings screens, not thirteen** — the FAQ’s storage landed and its screen did not, so there is no row for it, because a row that opens nothing is the very defect this stage repairs. **D1, the colour repair, was TWO defects**: one colour now writes both columns AND the email had no floor at all — a 3px rule at 1:1 on its own band, a hardcoded white title, and the brand colour as words on white at 1.36:1 for Silver; fixed in `_shared/brandColor.js`, **the one place in this repo a second implementation of the colour maths is allowed**, with `tests/email-brand.test.mjs` as the price. **PUSH: the browser half is built and the SERVER half was not live either** — the VAPID secrets had never been set, so `sendOwnerPush` had been skipping for its whole life; **and the owner confirmed the same day that a notification actually arrives on a real device — first delivery in the life of the feature.** The lesson is the shape: it was dead in TWO places at once and neither announced itself, so a feature can be complete in five places and dead because of a sixth nobody listed. **Reviews has a door** and says out loud that the words go to the Phase 3 websites rather than implying they are live. Plus the booking link drawn twice on one phone, a heading’s arrow 700px from its words, a truncated page title, a `disabled` prop that was dropped, a CSS rule that lost silently, and `memberships?.[0]`. **The QR is a question for him, not a refusal.**
- **The QR code, and the motion rule he asked to have confirmed** — Both answers to stage 6’s two questions, 2026-09-02. **He said yes to the QR and specified a better shape than the design had**: a *Generate QR code* BUTTON that is replaced by what it makes, not a permanently-drawn code — most visits to that block are to copy the link. `qrcode-generator` (zero dependencies, unlike `qrcode`), and **the dependency argument was settled by verifiability, not size**: there is no way to check a hand-rolled QR SCANS, which is the `travel_fee` family. **Black on white with a 4-module quiet zone on a near-black product, and law 11 does not reach it** — a machine-readable object is not a surface; the canvas is 1,110px and the screen shows 200, because saving the screen-sized one is what makes a QR useless on a card. `tests/qr-scans.test.mjs` **decodes the pixels back with a DIFFERENT library than wrote them** and pins `QUIET`/`PX` to the component; baselined at 6 failures with the quiet zone removed. **And the motion complaint had already stuck — roadmap 2.17, with his words in full.** What his re-statement added: **it is a DESK problem** (below `--wrap` `.sheet` already animates both ways), and **it must bind NEW work now rather than when 2.17 is scheduled** — that gap is CLOSED, the standing rule is in `dashboard-skeletons.md` §4 and `CLAUDE.md`, and what is left in 2.17 is the retrofit. Stage 6 itself added two more instant-opens to that list.
- **Roadmap 2.11, step 6, stage 7 — first run, and the count that lied for a whole role** — The setup form and the walkthrough, kept two because he insisted. **The seventh step is *Your colour*, and no design file names it**: §13a lists six areas while every other file says seven segments, and the seventh falls out of Business's own admission test minus the two a detailer cannot answer on their first morning. **Completion is DERIVED where the database can answer it** — §1b rules that filled means completed so the bar and Business's row agree, and the half it does not say is that five of the seven are facts the schema already holds; without that, every business that predates the form would be told it had done nothing. **`where you work` is the one nothing can derive**, because `mobile_enabled` and `dropoff_enabled` both default to true and "I do both" is byte-identical to "nobody has been asked". **The tour's COUNT lied for a whole role**: rule 3 skips an absent target correctly and cannot count, so a staff login ran four steps saying "of 7" throughout — the plan is resolved once now, before the first step is drawn (7 owner, 6 empty dashboard, 4 staff). **The focus trap was THREE defects and only a keyboard could see any of them**: a backdrop stops a POINTER and nothing else; the effect depended on an inline `onClose` so its own cleanup kept yanking focus back out; and the caption is `visibility: hidden` until placed, and **a hidden element cannot take focus**, so "focus moves to the caption card" had never once happened. **Pinning the actions had to have NO breakpoint** — the guarded `min-height: 500px` rule CLAUDE.md requires would have MOVED the buttons on rotation, which is the owner's ruling broken by the clause written to respect it. Plus: six editors written and *Your colour* reused whole (the other six settings screens end in a Save button, and a step whose Continue does not save throws away what was typed); a THIRD caption placement because the day rail is a 665px hole on an 844px phone; a fixed frame budget that read a LOADING screen as a MISSING target; the tour skipping its own first step when started from the gear; and "centred exactly once" spent a second and last time. **Verified on a business signed up and created through the real forms**, because §1c asks for the empty dashboard and the demo cannot answer it.

- **The copy pass — the owner's rule against explaining what the label already said** — his instruction, 2026-09-01, and he named the instance: *"Mobile — we go to them"* on the job record. *"No duh… it thinks that humans can't think, or it feels the need to explain literally every single thing."* **The test: does the sentence add a fact the control does not already carry?** Twenty-four sites swept across the dashboard, the booking page and the way in. **The half that stops the rule becoming its own mistake is what STAYED** — *"Picking another swaps it"*, *"Past bookings keep it"*, *"Timing is set in Booking rules"*: the rule is against restatement, not against explanation, and a session that reads it as "delete help text" will strip the sentences that were doing work. The durable form lives in `docs/design-system.md` § Never-defaults and in CLAUDE.md.

- **Roadmap 2.12 — request mode, accept/decline and quotes, and the sixth status that was not written** — the mode switch is one column and one line in `create-booking`; **what took the thinking was what NOT to add.** A request holds its slot because `pending` is absent from the exclusion constraint's WHERE clause — a fact established by not writing something, and therefore invisible to a reader and unprotected by anything but a test. **A decline is `cancelled` plus `declined_at`, not a sixth status**, because twelve places in this codebase already ask `status <> 'cancelled'` and every one is right about a declined request; a sixth would have meant editing all twelve to say the same thing twice, with the first one anybody forgot leaving a declined request still holding a slot. **A quote is offered, never charged** — `quoted_amount` is its own column and only the customer moves it to `total_price`, and accepting it lands the difference as a `price_adjustments` line so the receipt still reconciles, which is the `travel_fee` family one step later. **Three things the new status broke that nothing announced:** the four reminder RPCs would have emailed “your appointment is tomorrow” about a request nobody accepted, the manual Reminder button did the same by hand, and `sweep-widths.mjs`'s `.card.attend` selector silently changed meaning because a waiting request now takes the lit treatment — a rename with no error. **The demo takes requests now**, deliberately: it is the only business the sweep can log into, so a reserve-mode demo means the whole of this item's screen work is never rendered at any width. **Three questions stand for him** — quotes exist only on requests, a request whose time has passed is chased by nothing, and the demo no longer shows his own model.

- **Every email headline in the product was under the contrast floor, and it was found by rendering one** — roadmap 2.12, while looking at the new quote email. Stage 6's D1 fix gave the header band a MEASURED ink and used it for the brand name and the 44px rule; **every template's own headline went on hardcoding `color:#ffffff`** onto that same band. Measured: **3.01–3.76:1 on all fourteen colours**, the small label 2.44–3.05:1, against a 4.5:1 text floor — **not one preset passed.** Worse on the invoice, where *“Invoice / Receipt”* printed the PAPER colour on the band at **1.20–1.57:1**, which is D1's “the same colour on itself” wearing different clothes. **`email-brand.test.mjs` passed throughout**, because it pinned `brandColor.js` against `theme.js` and never looked at what the templates DID with the answer — *a test can verify the arithmetic and still be blind to the drawing.* Also three fixed greys under the floor (fine print at 2.40:1) that were nothing to do with the tenant's colour. **The finding underneath: two of the eleven bad lines were written that same hour, by copying the template above them** — a defect in a pattern reproduces itself into every new instance until somebody renders one and looks.

- **Roadmap 2.18, step 1 — what the trade's booking systems actually send** — the six-product sweep he asked for by name, before any template was drawn. **Three of the four questions came back cheaper than the item assumed.** The "you're next in the queue" email does not exist anywhere: what the trade sends is **on-my-way, and it is SMS in all four products that have it** — we already have it as a message template, so that gap is closed and must not be reopened as an email. **Our reminder SCHEDULE is already better than four of the six** (we carry Square's offset shape and Housecall Pro's clock-time shape at once) and nobody has ever shown it to the owner, because it lives in Booking rules. **Content is the lopsided one: five of six give the detailer WORDS, one gives a DESIGN** — and even Zenbooker, the permissive one, renders the invoice's itemisation as a single variable the editor cannot open, which is our own `money-export` rule arrived at independently. **"Premade templates" in this trade means WORDING, not looks**: not one of the six offers a choice of visual designs for a transactional email, and where design galleries exist they are marketing email behind a paywall that applies the brand automatically anyway. **Two real gaps: a payment receipt separate from the invoice (five of six; ours calls a paid job an invoice), and the tenant's LOGO** — `business_branding.logo_url` is already uploaded and drawn on three customer pages and `buildBrand()` has never read it. **The thing that will bite: `email-brand.test.mjs` is partly a SOURCE-SHAPE test** — 7a, 7a-ii and 7b-ii read `emailTemplates.ts` as text and assert facts about a file a rebuild deletes, so "rebuilt from scratch" and "keeps passing 138 checks" are in tension and the checks must be re-pointed deliberately, never dropped. **AND THE MISSING INSTRUMENT WAS BUILT IN THE SAME SESSION AND FOUND A LIVE MONEY DEFECT ON ITS FIRST RUN** — `scripts/render-emails.mjs` (no new dependency; Node 24 strips the types, so it reads the SAME `emailTemplates.ts` the edge function runs). **The invoice's printed column does not reach the invoice's printed total whenever a promo code was used**, by exactly the promo: its charge rows sum to `subtotalBase` (services + add-ons + travel + `price_adjustments`, BEFORE the site sale and BEFORE the promo) while its total is `final_amount` = `total_price`, which is PAST both and rounded — **neither discount and neither the rounding is drawn anywhere**, so the gap is `siteDiscount + promoDiscount + rounding`. **`bookings.subtotal` is `subtotalAfterSite` and is NOT what the rows add up to**, which is what makes this look like one bug and be three. **This is the `travel_fee` family in the same file, one comment below the fix for its twin** — *a fix that names one instance of a pattern fixes one instance.* Eleven suites missed it because `money-export` ties out the ACCOUNTANT EXPORT and `booking-engine` test 17 ties out the QUOTE ENGINE — **a tie-out is only a tie-out for the document it names.** It is an ASSERTION now, failing on purpose, not a note. **And `reference/`'s copy has the same shape, so the omission was INHERITED — question 5 is whether we may read `carwashweb` to see if his LIVE business sends invoices that do not add up.** Full working, counts and sources: `docs/email-research-2026-09-03.md`. **Five questions stand for him; two block the build and the fifth should not wait for it.**

- **Roadmap 2.18 — his answers, and the look he rejected** — he opened the rendered emails and said they look like the template he already had and nothing like the site. **Half communication failure, half real finding, and they separate cleanly**: those were the EXISTING emails, handed over as a before-image without the word BEFORE next to the picture — but the finding stands anyway, because a coloured band above a white card is the on-distribution default `design-knowledge.md` §1 exists to prevent. **"Premade templates" turned out to mean an EDITOR** — *"they can choose whats in it and what order"* — which overrules the research's five-of-six count and is **the 2.8 pattern for the second time: research rules shapes IN, it cannot rule them OUT.** What survives the overrule is the half that was never about freedom — **`moneyBlock` is the one block the editor may not open**, which is where Zenbooker independently drew the same line. **So a template is an ARRAY OF BLOCKS**, decided before porting rather than after, because a 50-line HTML literal cannot have an editor over it at any price. **Reminders: no cap** — *"as many as we want"* — which turns a second marker column into a `booking_reminders_sent` row per (booking, rule). **The world is built on two emails and deliberately NOT wired up**: `emailKit.ts` + `emailsNew.ts`, the edge functions still send the old ones, `email-brand` still green at 138 on the old file. **The type law survived even though the faces did not** — an email cannot load Archivo, but the system's rule was *one face for words, one for figures*, and that ports intact; **when a constraint kills a rule's implementation, ask what the rule was FOR before recording it unmeetable.** Colour engine EXTENDED not edited (`emailDarkBrandColors`, corrected against `--ink-2` because the accent lands on a lifted panel — the fourth time this project has learned *correct against the lightest surface that value can land on*).

- **Roadmap 2.18 — the look approved, the editor scrapped, and will it work everywhere** — *"Also it looks good"*, then *"scrap the custom email editor thing / make it a lot more simple"* — **his own idea from one message earlier, reversed inside the same session.** **NOTHING HAD TO BE TORN OUT, and that is the carryable part**: the session had built the blocks and stopped at two rendered templates, so **the stopping point chosen to get the LOOK approved cheaply was the same one that made the reversal free** — when an item has a subjective half and a mechanical half, render the subjective half first and stop; the approval gate doubles as a rollback point. The blocks survive with a new justification: **the plain-text half of every email is a second pass over the same block list**. **Reminders: he delegated the number and the answer is TWO, second off by default** — Jobber caps at two and nobody offers three, the useful pair for this trade is the evening before and two hours out, and **a third costs deliverability for the receipt**, which is shared reputation. **The compatibility research holds**: Apple Mail (~60%) leaves a dark email alone unless it finds pure `#ffffff`/`#000000`, **full inversion mirrors BRIGHTNESS and preserves HUE** (checked specifically — the guides' "flips brand colours to their opposites" would have meant a green button arriving magenta), and light-on-light cannot happen because every colour is declared on the element that shows it, so ground and type flip together. Worst case is a light version of the same email, still readable; **the `mix-blend-mode` Gmail hack was deliberately NOT used.** Three changes came out of it — pure black/white made unreachable in a tenant's colour (**both were genuinely reachable**), `bgcolor` beside every background property, and **the logo onto a bone plate because a detailer's logo is dark-on-transparent and was invisible on `--ink-0`, which nothing in this repo could ever have measured.** **AND THE FINDING THAT IS NOT ABOUT DARK MODE: every email is sent HTML-ONLY, with no plain-text part** — a spam-filter signal on every email including the receipt, found by following "will it work globally" past the templates into the sender. Gmail's 102KB clip threshold MEASURED at 9–10KB. Full working: `docs/email-clients-2026-09-03.md`. **Honest limit: nothing has been opened in a real email client yet.**

- **Roadmap 2.18 — the port: all twelve rebuilt, wired, and the invoice made to add up** — the old ~530-line `emailTemplates.ts` is gone, all eight edge functions send the rebuilt emails, `email-brand` is **186 checks** (was 138). **The file kept its PATH and most export names on purpose** — rebuilding the RENDERING was the item, and changing `BookingEmailData` at the same time would have meant rewriting every call site's query too. **`reconcile(lines, total)` is the guarantee that replaced a promise**: the invoice bug could have been three pushes in `send-invoice`, but that is the fix 2.8c already applied once and it did not generalise — so both money templates now pass their lines through one function that draws any remainder as its own line. **It was load-bearing immediately: `bookings` HAS NO `site_discount` COLUMN**, and the first draft of the fix referenced `booking.site_discount` → `undefined` → the line silently never draws. **A fix that reads as a fix and does nothing**, caught only by checking the schema instead of assuming it. **The plain-text half is DERIVED, one `htmlToText` rather than twelve twins that drift** — now the main thing the block architecture buys. **Re-pointing `email-brand`: two source checks failed loudly and one went SILENTLY VACUOUS** (`const header =` matched nothing, so it passed by having no subjects) — rewritten stronger (no literal hex anywhere in the templates; the two accent values may not swap jobs) plus **7a-iii, which asserts the checks HAVE subjects** so the next layout change fails loudly. **AND THE BASELINING FOUND A REAL BUG: a raw backspace (0x08) in the regex source** left by the script that wrote the test — `/…{3,8}\x08/` can never match, invisible in every editor and in `sed`, only visible under `od -c`. **A check written to prevent silent vacuity was itself silently vacuous on its first run.** Still not done: the settings surface, the two-reminder schema, and **nothing has been opened in a real email client.**

- **Roadmap 2.18 — the live-business read, and the invoice stopped doing arithmetic** — he authorised the read, and it produced a RETRACTION. **CLAUDE.md names the wrong repo**: `carwashweb` is a 99-file Emergent scaffold last pushed 2026-02-01 with no invoice code at all; the live business is **`random12one0/carwebitebooking`**. **And its invoice ADDS UP** — both its finalize modal and its `send-invoice` exclude the promo, so they agree with each other. **The bug was INTRODUCED by our port, not inherited**, which is the opposite of what the earlier entry today concluded from reading only the row-building. *A defect diagnosed by reading the code that DRAWS a number is half a diagnosis; the other half computes it.* (What the live site does have: `roundToNearest5` rounds the total but not the rows, so up to $2.50 of drift, and a fresh finalize defaults to LIST price, so a promo customer is charged full unless the owner adjusts — visible on screen, his call.) **THE INVOICE NOW COPIES WHAT WAS FINALIZED INSTEAD OF RE-DERIVING IT, on his instruction** — *"just have it copy exactly what was calculated on what you finalized… I don't get why there has to be math"* — and he was describing the root cause, not a preference: `send-invoice` was rebuilding the bill from five sources and hoping their sum matched a `final_amount` computed in another file, which is why 2.8c patched travel in and 2.18 still found the promo missing. **Now it prints `total_price` + the finalize lines, which is `final_amount`'s own definition, so the column cannot disagree with the total.** ~45 lines deleted; the work is still NAMED but no longer priced, because per-service prices are not what was charged. `reconcile` stays as a guard that should never fire. **And the re-book email is MANUAL with a dashboard nudge, his call** — a human picks the recipients, nothing sends itself, which removes most of the CAN-SPAM machinery the research had costed.

- **Roadmap 2.18 — the last two pieces, and the first real send** — the second reminder and "your own words" are built, and four emails were sent to his actual inbox. **The second reminder is TWO COLUMNS, NOT a `booking_reminders_sent` table — a same-day reversal of this file**: a per-(booking, rule) table was right while the count was open-ended and became wrong the moment he capped it at two, because a general table then buys extensibility nobody asked for at the price of a join in the hottest RPC in the product. **Its own RPC, not a `target`**, because `get_bookings_due_for_reminder` carries the EVENING-BEFORE rule and a second reminder inheriting it means two evening sends racing on one marker; it also refuses to run before the first has, and excludes `pending` for 2.12's reason. **"Your own words" is one jsonb column and NO `{{placeholders}}`** — the email already greets the customer and states their date, vehicle and address, so a token would be the owner's own never-default; the absence is the feature, and it removes everything there is to typo or validate. Escaped BEFORE newlines become `<br>`, never after. **THE SEND FOUND TWO THINGS.** `send-email` compares against the `SUPABASE_SERVICE_ROLE_KEY` **Supabase injects into the function**, and this project has migrated — so it wants `SUPABASE_SECRET_KEY` (`sb_secret_…`) while the root `.env` still holds the legacy JWT under the old name; **legacy → flat 401, which reads exactly like a revoked key.** And four emails, not seventeen: different SHAPES only, because duplicates spend a sending reputation shared with the live business. **AND A DELETION THAT WAS WRONG:** `buildAddressing` was removed as dead code and is not — `booking-engine` test 9 uses it to pin TENANT ISOLATION, and the check for callers had grepped `supabase/functions/` while the caller sat in `tests/`. ***A symbol used only by its test still has a user, and the test is usually pinning the thing that matters most.***

- **Roadmap 2.18 — the emails go LIGHT-FIRST, because Gmail proved the dark ones broken** — he opened the four test sends on real devices: Apple Mail correct in both modes, **Gmail's dark mode inverts an already-dark email and cannot be told not to.** The research had PREDICTED this and concluded the worst case was "readable" — **that conclusion was reasoning, not measurement, and it was wrong.** Measured by applying Gmail's actual transform to our palette: the accent as words **10.07:1 → 1.99:1**, the button's ink **10.88:1 → 1.77:1**. Unreadable, not off-brand. **Unfixable by palette**, because inversion barely moves a mid-lightness accent while swinging its near-black ink from L≈8% to L≈92% — checked on four accents, all fail. So the design moved: **light inline by default, dark behind `prefers-color-scheme`**, both palettes being The Thread's own (`--paper` and `--ink-0` — the light band already existed). Apple Mail still shows the dark design; Gmail now darkens a LIGHT email, which is the one thing its algorithm is tuned for. **The new failure mode it introduces, and the check written for it: the dark palette applies BY CLASS, so an element setting a colour inline without a class stays light inside a dark email — invisible to any contrast check, because both values are individually fine.** `render-emails.mjs` walks the rendered output and caught six on its first run. Also found: **pure white was still reachable in the LIGHT path** (crimson's and violet's button ink), which is Apple Mail's own inversion trigger — the very thing that would have made Apple Mail behave like Gmail. **AND THE SPAM ANSWER: authentication is FINE and identical on both domains** (DKIM, SPF on the sending subdomain, DMARC `p=none`) — what differs is **reputation**: his business domain has months of engaged mail, the platform subdomain has almost none, and the two sit on different Resend pools (SES versus Resend's newer own-MTA). One real gap: the ROOT `detailingplatform.com` has no SPF record at all. `List-Unsubscribe` deliberately NOT added — a customer who unsubscribes stops receiving their own receipts.

- **Roadmap 2.17 — motion and shape as a house style** — the retrofit of *anything that opens, animates in*, plus the squircle. **The LIST was five, and it was found by MEASURING rather than by reading the stylesheet**: `document.getAnimations()` on the live dashboard 120ms after each click reported *nothing running but the ground's 54-second drift* for the job record, the client record, the settings column through **both** doors, the calendar's day panel, and every screen's RESTING second column — which had never animated even on first paint. **One selector fixed all five** (`.split > .col-2`), because they are the same object: the thing that lives beside the list. **It comes from its own SIDE, 14px on X at 180ms**, not from the top like the screen's `arrive` — an object animates from where it came from, and 420ms on a record you open forty times a day is the gate his acceptance test forbids. **THE ROADMAP WAS WRONG ABOUT THE GEAR**: it already animates, via the screen stagger, and giving it a second entrance would be two animations on the same 420ms. **The calendar was the odd one out and it was THE WRONG ELEMENT MOVING** — picking a day swapped `.group` for `.split.calday`, React discarded the month and rebuilt it, so `arrive` re-ran on the thing you were already looking at while the panel you asked for arrived dead. *"It's almost like I refresh the page"*, diagnosed. **The fix is a stable container, not a nicer animation.** **THREE DEFECTS THE MEASUREMENT CAUGHT THAT READING WOULD NOT:** a `:has()` nested inside a `:has()` is INVALID and browsers drop the whole selector silently — the calendar split correctly and never widened, costing the month 540px at 1920; two `<aside>`s in one slot are RECONCILED rather than remounted, so the settings screen's entrance never fired until they were keyed apart; and pressing the open day again toggles it closed down a path that skipped the exit. **THE SQUIRCLE IS ONE TOKEN AND IT DEGRADES**: `corner-shape: squircle` is Chrome/Edge 139+ and **NOT Safari or Firefox** (measured from webstatus.dev and MDN compat, 2026-09-03), and an unsupported browser draws the `border-radius` already there — so his iPhone shows today's corners until WebKit ships it, **which is the one thing he has to agree to**. A Houdini paint worklet is Chromium-only TOO, so it costs a JS paint pass to reach exactly the same browsers; an SVG mask reaches Safari but clips the 1px hairline this system draws on nearly every surface. **PANELS AND INSETS ONLY** — a superellipse at a 100px radius is a lozenge and at 50% a blob, so pills, dots and rings keep `round`. **STILL HIS CALL: the 1440 reflow.** With a day open the month goes 1,144px → 836px and its cells stop writing job names; lowering the 1,640 threshold was measured and rejected by LOOKING — at 836px a cell is 115px and *"8:00 AM Marcus W."* renders as *"8:00 AM Mar…"*.

- **The booking sweep had been passing by luck, and it cost a session to find out** — `sweep-booking-steps.mjs` failed on about half its runs during roadmap 2.17, in the same minute as an unrelated CSS change, and looked exactly like that change's fault. **It was not, and the thing that proved it was a CONTROL RUN**: revert the suspect, run again, watch it fail identically. One run, and it should have been the first one. **Two races underneath, both the same shape.** The script picked calendar days by INDEX against a live locator — and choosing a day re-renders the calendar, greying out every day that cannot hold the chosen service, which is correct product behaviour — so `days.count()` fell to 0 and the walk gave up after ONE day. **It had never actually walked more than one day in its life**: while TODAY still had a free slot it exited on the first iteration, and it started failing at ~22:00 local when the demo's own 08:00–18:00 trading day closed. *A test that passes on its first try every time is not the same as a test that works.* The second race was one level up — the month's open days come from an availability call, so enumerating them right after `settle()` could read an empty grid and conclude the business was shut. **`settle()` is a CAP, and a fine one on a repaint; it is not a wait for a network round trip**, which is the general form of both. Fixed by addressing days by their DATE and re-querying after every render (the same "address a node, never a position" lesson the day rail already taught), and by waiting for the grid before reading it. `SLOTPROBE=1` now prints the day walk and every slots response, because the diagnosis was invisible without it.

- **Roadmap 2.17, second pass — he walked it and found the hole: a SWAP is a third kind of motion** — the retrofit covered a screen ARRIVING and a thing OPENING, and missed the case he cared most about: *"if I switch between one booking and I click another one, it just instantly changes… **the GUI kind of doesn't really change, but the actual text inside of it changes**."* That last clause is the definition. **It overrules a decision made earlier the same day**, which had deliberately skipped the exit on replacement to avoid putting 180ms between a tap and the thing tapped for — right about the CONTAINER, wrong to conclude the CONTENTS should not move either. `.swap` + a React key, opacity and a 4px blur at `--t-exit`; it dissolves rather than travels, because nothing moved. **THE BLUR IS A NEW PROPERTY AGAINST LAW 4 AND IT IS SCOPED, not loosened.** **The trap, and it caught two different fixes: a swap must not be a direct child of `.col-1`** — the arrival selector is (0,4,0) and beats `.swap`, so Money re-ran `arrive` on every period change, which IS the "page refresh" feeling he was complaining about. **The first fix was a specificity override, and it won the fight and broke a different law**: on first paint the swapped blocks dissolved in 180ms while their siblings rose over 420ms, so the screen arrived at two speeds and its tail landed EARLY. Both states measured with `getAnimations()`, neither read. The answer was MARKUP — nest the swap so the outer element keeps its arrival slot. ***Winning a cascade fight is not the same as being right.*** **And the month now travels with the panel**: killing the remount was not enough, because `.app-main`'s max-width and the grid's track list still snapped 270px with no transition — both are transitionable, `display` is not, so the closed state became a 0px second track instead of `display: block`, and both ends key on `:not(.leaving)` so closing is one 180ms gesture rather than two. **Three vacuous checks were found by BASELINING, all the same shape**: an `||` across independent subjects is not a check on either of them, and a `src.includes("swap")` was satisfied by the word appearing in its own explanatory comment. **A raw backspace (0x08) got into a regex through a shell heredoc for the SECOND time in this repo** — CLAUDE.md already records that exact trap from 2.18.

- **Roadmap 2.17, third pass — replacing the dissolve he rejected** — he looked at the dissolve and turned it down flat: *"it just looks like a page refresh… **And I'm sorry if I steered you to that. I wasn't trying to.** … it doesn't look fluid."* **His own earlier *"a little dissolve or a blur"* is what produced it, he withdrew it himself, and every surviving copy of that sentence now carries the retraction beside it** — deleting a retracted hint is how it gets re-derived from a fourth file nobody checked. He also refused to specify the replacement on purpose (*"I'm not gonna give you an animation idea"*) and floated a second hint he withdrew in the same breath. **THE TRANSFERABLE PART: design against the DIAGNOSIS, not the complaint.** Designing against *"it looks like a page refresh"* produces a shorter dissolve, which is the same defect in less time. The diagnosis is that **a page reload IS a whole block changing opacity at once**, so a uniform cross-fade reproduces a reload's optical signature however brief it is — **the fault was the UNIFORMITY, not the duration and not the blur**, and the corroboration was already in the repo: every motion he has approved moves its parts on different timelines. **So `.swap` now carries no animation at all** (it is a marker plus a React key) and `.swap > *` runs the screen's own `arrive` for `--t-exit`, staggered 20ms, capped at 160ms — no new keyframe, duration, distance or property, giving ONE entrance shape at three scales. **The blur is gone and law 4 goes back to transform-and-opacity-only: the rejected version was also the one that needed a law bent for it.** The ladder runs EIGHT deep rather than five because most of the Clients list sits below the fifth row and a cap at five leaves the majority moving as one plane. **`composition` 8e-i-b fails on ANY rule targeting `.swap`, which is deliberately stricter than the defect** — the flat plane coming back would arrive looking like a tidy-up, one selector instead of ten — and 8e-vii counts DISTINCT delays, because a stagger that collapses to one beat is a uniform fade wearing ten selectors. **Then `impeccable critique` found two defects the clean measurement could not: a clean `getAnimations()` reading tells you what IS animating, not whether it SHOULD be.** The pinned action bar was inside the swap — six buttons pixel-identical between any two jobs, travelling on every switch, on the record's primary tap target — and `RecordHost` had already pulled the CLOSE BUTTON out for that exact reason, so **furniture opting out is the rule's other half, not an exception**. And Money's 620ms chart tail, first recorded as measured-and-left because no SELECTOR can separate a swap from first paint, is fixed: `Money.jsx` can see it in three lines, and "three lines" is not a reason to ship the one defect on the one screen he named. **The flag's first version was correct-looking and did nothing, which is the most reusable part**: recomputed per render it went true then false on the very next render (the reload setting `refreshing`), and **removing `animation: none` from a live element STARTS the animation** — plausible code, unchanged behaviour, the class gone before anyone could inspect it, and only `getAnimations()` able to see it. Latched per period now. **And `theme.css` had claimed the opposite since the chart was written** (*"a month switch snaps, deliberately"*), which had never been true.

- **The corner got smaller rather than more universal** — the two asks turned out to be one edit. The owner asked for "a squircle design that doesn't rely on the browser knowing what it is… that will work universally", and separately said that what he actually liked in a browser-extension preview was that **the radius got smaller**: *"more blocky with still being rounded off… but not, like, super blocky, like the casual AI blocky, just a little bit less rounded."* **There is no universal superellipse worth its cost** — both routes were costed before he asked and neither was re-opened. But **the visible difference between a true squircle and the plain rounded corner every browser already draws is PROPORTIONAL TO THE RADIUS**, measured by rendering one corner at 4x and counting pixels rather than reasoning: 34 differ at 18px, 14 at 12px, 7 at 10px, 3 at 8px. **So tightening the radii IS the universal fix**, cutting the Chromium-only difference by 59% on panels and 79% on insets with no mask, no worklet and no JavaScript. `--r-panel` 18 -> 12 and `--r-inset` 12 -> 8, ratio held at 3:2, `booking.css` moved in the same edit. **The tab switcher came off `--r-pill` onto its own `--r-nav: 16px`** — he named it specifically — **with its buttons at `calc(var(--r-nav) - 5px)`, which is arithmetic and not taste**: the bar's padding is 5px and concentric corners have to be 5px apart or the gap pinches. **12px was tried on the bar and rejected BY LOOKING** at 392 and 1440: a 460x54 floating bar at 12px stops reading as an object over the ground and starts reading as a strip welded to the bottom. **AND THE LANDING PAGE JOINED THE SAME DAY, closing roadmap 2.17** — it had six ad-hoc radii and no tokens, and the APPROVED REFERENCE RENDERING moved with it and is now swept as its own surface, because where that page and the document disagree the PAGE is right and a page that drifts from the stylesheet quietly becomes the wrong authority. **Both files were rewritten from ONE table keyed on the VALUE, not the selector**: a selector-keyed first attempt silently applied 13 of 15 edits to one file and 11 of 15 to the other, because they spell their selectors in two dialects. **And both complications were real**: `corner-shape` does not inherit (the hero card's highlight) and has no effect on `clip-path` (the comparison row's reveal) — the second is a 3-pixel difference at 8px, *which is exactly why it would have survived a look.* **Pills did not move** — Apple squircles cards and keeps capsules as capsules, and nobody asked for every button to become a rectangle. **And `composition` 8a had to learn the new token**, because a radius token missing from that check is the one surface the pairing rule silently stops covering.

- **Roadmap 2.5 — the smoke test, and a white screen that was live on `main`** — the loop is fine; what was broken was **a configuration nothing in this repo had ever rendered**. `StepLocation.jsx` took `modeLimit` as a prop from `BookingPage.jsx` and never destructured it, and the only branch that reads it is the one a business offering ONE of mobile and drop-off renders — **`ReferenceError`, error boundary, total booking outage for that tenant, live on `main` since 2026-08-31 (`1ed5084`, roadmap 2.8c).** The demo enables both modes, so every script, screenshot and sweep in this project's history had drawn the other branch, and the mobile-only seed existed the whole time with nothing walking it. **The same line hid the feature's other half**: `both` was computed here WITHOUT `modeLimit` while `BookingPage`'s `bothModes` includes it and feeds the heading, so the *“Ceramic Coating has to be done at our place”* message that file exists to print was unreachable in every configuration that did not crash. ***A derived value computed twice is one bug wearing two costumes.*** **`scripts/e2e-booking.mjs` is rewritten** (82 checks, two tenants, ~3 min) and is in CLAUDE.md's verification list — it had been dead since before 2026-08-31 and the script was never the problem, the absence of a caller was. **It is the only thing in this repo that presses Confirm**; `sweep-booking-steps.mjs` measures heights and stops ON the review step. **Also fixed: the demo was mailing a parked domain** — `contact_email` was `demo@detailplatform.com`, a SIGN-IN reused as a MAILBOX, with no MX record and not covered by `send-email`'s reserved-domain guard, so every demo booking asked Resend to deliver a guaranteed hard bounce against the reputation Andrew's real customer mail shares. **The emails are proven to the PROVIDER, not an inbox** (`delivered@resend.dev`), because best-effort sending means only the edge-function logs can see a dead relay — the 0.2 failure mode exactly.

- **Roadmap 2.13 — custom roles and permissions** — he asked to *"invite someone, and you could give them a name, like a customizable name… and you could also check out, like, there should be options on what permissions they should have"*, and the obvious reading — replace `business_users.role` with a permission set — **is wrong because of a TRIGGER**. `protect_last_owner()` refuses to remove or demote the last owner *including for the service role*, and a permission set has no last-anything, so dissolving `owner` takes that trigger's subject away from it. **`role` is untouched and `owner` still means everything**; what is new is that a NON-owner carries its own `label` and `permissions text[]`. **The four permissions were DERIVED from the schema** — each one is a group of policies that was ALREADY owner-only — because a list invented from the tab bar names screens, and the database has never gated on a screen. **The vocabulary is closed by a CHECK CONSTRAINT**: a typo'd permission grants nothing and looks exactly like one that was never ticked. **`has_business_permission()` folds the owner in**, so every policy asks one question and no check can forget owners. **"Team" is deliberately NOT a tick** — whoever hands out permissions can hand themselves every other one, and making that safe needs a grant lattice nobody asked for. **`requests` is the one permission that TAKES AWAY** (staff have had it since 2.12), so every existing staff row and live invite is backfilled with it: nobody's dashboard did less the day this shipped. **A SECOND migration was needed because the tick did not mean its own words** — it says "Prices, hours…" and `services.price` and `business_hours` were `*_tenant_all`, writable by any member since before there were two roles; unreachable through the UI is not the same as untrue, and RLS is the enforcement here. SELECT stays open to every member (a member must read `services` to take a booking at all). **`monthly_plans` does not exist and roadmap 2.14 is wrong about it** — created in `tenant_data.sql:51`, dropped nine hours later in `phase2_cleanup_and_storage.sql:16`. **The role editor is a SWAP, the first site built under that rule rather than retrofitted into it** — the card does not move, its contents are replaced, so it costs no entrance, no exit and no `useLeaving`. **And `sweep-widths.mjs` reported a CRASHED SCREEN as "clean"**: one missing word took the gear index down, `ErrorBoundary` drew four short lines, and four short lines are not off the edge, not outside their parent, not scrolling and not ungapped — **every check this script owns is about GEOMETRY, and geometry has nothing to say about whether the screen is the one you asked for.** `say()` now looks for the boundary first. **Also: a python rewrite silently turned twelve files CRLF**, and the first symptom was a byte-exact check failing in a file this item had barely touched.

- **Roadmap 2.14, step 1 — plans a customer can sign up to** — he asked for plans with cadences and asked for the research first, by name. **The six-product panel was not enough for this one** and seven real detailing businesses' own plan pages were sampled beside it, because the question *"in the flow or beside it"* is about what a detailer PUBLISHES, and the products only say what is possible. **The finding that decides the build: the sale and the schedule are two different acts and nobody joins them** — not one of the seven schedules visits at sign-up, Car Detox sells through a checkout and then *phones* you, ZS takes a phone number and a person books visit one. So generating the next N bookings on sign-up, the obvious design, is not a thing the trade does — **and `bookings_no_overlap` would refuse it anyway**, at a moment nobody is watching. **The second finding is ours, not theirs: WE TAKE NO MONEY.** Every plan in the sample that charges, charges a stored card; there is no Stripe, no card on file and no payment capture in this repo, and `bookings.payment_status` is a flag the detailer sets by hand — so *"$150/month, cancel anytime"* on a page while cash is collected on the day is **the travel-fee defect in a new place**. **Placement: beside the flow, 7 of 7 detailers and 5 of 6 products**, and the single in-flow product (Zenbooker) is a cleaning tool selling a REPEAT, not a plan — conflating those two is the main way this item could go wrong. **His own question answered: most booking systems do NOT carry a plan** (5 of 6 repeat a job, 2 of 6 have a plan object, 0 of 6 sell one in a booking form), so running plans is not unusual but selling them inside the booking form would be. **The recommended shape adds almost no machinery — a sign-up is a REQUEST**, the rail 2.12 already built, and recurrence is a nudge to book the next visit rather than a scheduler. **The placement is deliberately NOT a per-detailer toggle** (a second layout to build and sweep for a shape no evidence supports) while the wording, cadence and price shape are entirely the detailer's — all three price shapes appear in the sample, so forcing one excludes real businesses. **Four questions stand for the owner**, all schema-changing, each with a recommendation.

- **Taking money, and roadmap 2.14 round 2** — he asked for payment and for a deeper plans pass in the same breath, and **the first job was splitting them: there are TWO money problems and only one is about plans.** **MONEY IN** is detailers paying him ($499 + $40/month, recurring, *"I'm not gonna do it manually"*); **MONEY THROUGH** is a detailer's customers paying the detailer. **He must never hold the second**, because holding other people's revenue means owning their chargebacks and answering for a detailer who did not turn up — **and Stripe Connect `Standard` avoids all of it at $0 to the platform**, read from Stripe's own fee-payer table rather than inferred: a `type=standard` account defaults to the connected account paying, Stripe *"[doesn't] charge any Connect fees to it or to your platform"*, and processing, **dispute** and Invoicing/Subscriptions fees all land on the detailer. The $2/active-account and 0.25% + 25¢ payout fees apply only if the PLATFORM handles pricing. **He corrected a finding from the first pass and the correction matters**: the old site's *"Cash, Cash App, PayPal, Venmo & Zelle"* was never a checkout, it is a list and *"I just have them scan my code"* — so **stage 1 is putting those handles into settings and onto the invoice**, which costs nothing, charges 0%, and makes today's real behaviour official. **On plans, the trade's own practice overruled the obvious build twice.** Six plan shapes exist and **they are not six features — they are four fields** (cadence, contents, price shape, term), and cadence is not a fixed list. **The trade does not use contracts and advertises against them** — six of ten plan pages sell *"no contracts, cancel anytime"*, early-termination fees are the GYM industry's answer, and **the tools that actually work are PAUSE and SKIP**, because most breakage is a month somebody could not do rather than defection; **we could not enforce a penalty anyway, since we take no money.** **The "requirement" he meant has a real example and it is not a cadence**: ceramic coating warranties VOID without documented annual maintenance (System X, within ~30 days of the anniversary), which needs a **deadline, an escalating reminder and a last-done stamp** — and **none of the six panel products does it**, which is the one place a detailing-specific product beats Jobber outright. **We log plans, the detailer runs them — for now** — because five of seven detailers manage them by conversation, **real subscriptions cost a SUPPORT burden rather than a code one** (a customer charged for a month nobody showed up for complains to whoever sent the email), and **logging is a strict subset of billing so nothing is thrown away** — provided the **ledger of visits owed and used exists from day one**, or adding billing later is a rewrite. **And "free" was measured rather than assumed: Supabase's free plan has NO BACKUPS AT ALL** and Resend's allows **ONE domain and 100 emails a day** — ~$45/month of real fixed cost, covered by the second detailer, and the same moment plans become worth having.

- **He is 17 and in California, and both facts changed the payment plan** — he volunteered them, nobody had asked, and **every consequence below was checked against a primary source rather than reasoned about.** **Stripe says yes with a parent**: Standard accounts are **13+**, and under 18 *"a legal guardian must assume the role of owner of your account before your account can accept charges and funds can be transferred"* — so **the build is unblocked and LAUNCH is not**, and **stage 3 is untouched** because Express and Custom Connect require 18 while **Standard does not** and the detailers are adults anyway. **California starts taxing SaaS on 1 January 2027 (SB 122, signed 2026-06-29) and does not today**, he has California nexus from his first sale, and **Stripe Tax calculates but does not file** — so the merchant-of-record premium that round 1 called premature has an expiry date on it: **84¢ per detailer per month to make CDTFA filings somebody else's job**, decided by November, because switching after a hundred subscribers means every one re-enters a card. **His twelve-month lock-in with an early-cancellation fee collides with AB 2863**, California's amended auto-renewal law: disclosure before billing details, express affirmative consent, and **cancellation in the same medium they signed up in** — a term and a fee are legal, **routing the exit through him is not.** And **§6700 makes it worse for him specifically**: a minor may contract *subject to the power of disaffirmance*, and adults contract with a minor at their own risk, so **an early-termination fee is the hardest term he could pick to enforce.** **The replacement is the plans research's own strongest finding aimed at his own pricing: discount the annual PREPAY.** Money already taken binds structurally, so *"pay for the year, get two months free"* buys the same twelve months with **nothing to chase, no ARL friction and better cash.** **He also asked whether he thinks about invoices wrongly — he does not, and 2.18 had already fixed it**: `invoiceEmail` branches on `payment_status`, so paid prints *Receipt / Paid in full* and unpaid prints *Invoice / Amount due*, **which sharpens stage 1 to putting payment handles on the UNPAID branch only.** **He decided plans are LOGGED, not billed** — arriving at option A himself and listing cadence, tier, percent and bundle unprompted — **and his customer-accounts idea got a verdict: good idea, one step early**, because everything it buys comes from a LINK, the pattern `/booking/:id` and 2.12's quote acceptance already rely on, while an account puts **a second kind of human** into an auth system holding only detailers and staff and has no right answer to *"whose customer are they"* when someone uses two detailers. **He overruled the recommendation on non-payment** (their site goes down) and **his Resend correction moved the real ceiling to 100 emails a day.**

- **"Should I just start with Paddle?" — no, and the reason had not been checked by anyone** — **neither Paddle nor Lemon Squeezy does marketplace payouts**, so money-through is Stripe Connect regardless and the real question is *"Paddle AND Stripe, or just Stripe"*: two dashboards and two webhook sets for a business whose support desk is one person. **And Paddle's Acceptable Use Policy prohibits *"human services that are not related to a software offering"*, which his $499 hand-built website may well be** — their call, not ours, and *"you cannot sell your main up-front product here"* is a worse day than a tax return. **The tax benefit is also smaller than it looks because he sells in ONE STATE**: a merchant of record earns its 2 extra points across forty states, and a California business selling to California detailers has one registration and one filing schedule. **So Stripe, and register with CDTFA when the law starts** — a sharpening of round 2's "decide by November", with the trigger now being *selling outside California* rather than a date. **The early-exit fee came BACK ON, and his counter-argument was right**: he proposed Adobe's exact model (annual term, billed monthly, half the remainder on early cancellation) and **the FTC sued Adobe in June 2024 over the PRESENTATION, not the fee** — pre-selecting the plan, burying the commitment in hover-icons, obstructing cancellation — so it ships with neither plan pre-selected, the term and fee in plain text at the price's own size, an explicit tick, and a one-click cancel that charges the fee to the card on file. **With a card on file the fee collects itself, so "he is badly placed to chase it" mostly dissolves; what survives is the CHARGEBACK**, whose defence is that same disclosure. **His trade knowledge moved a build decision for the second time in two sessions**: detailers *"don't leave a client's house until it's paid"*, so the unpaid invoice is a rare page and round 2 was aiming at it — **his own old site already printed the payment methods on the CONFIRMATION email**, which is where they belong, and never on a receipt. **Refunds: setup fee non-refundable once work begins, current month not refunded, and the setup fee and the exit fee are two separate arguments** that must not be merged. **And one small thing ships beside the Resend free plan he is keeping: make a REJECTED SEND VISIBLE** — the cap is not the risk, the silence is.

- **Selling nationwide, and an idea that had to be refused** — the reasoning under the Stripe decision broke, and one thing he asked for is a data leak. *"I'm primarily gonna be selling anywhere in America… if I sell in California, that could potentially be my competition."* **Round 3's "he sells in one state, so the tax is simple" was load-bearing and is now wrong**, and it is marked rather than quietly rewritten. **The threshold that bites is TRANSACTIONS, not revenue**: $100k into a state is ~208 subscribers at $40, but **200 transactions is ~17 subscribers**, because each monthly charge is a separate sale — **except that 17+ states have now dropped the transaction test entirely**, ~14–20 still apply it, and SaaS is taxable in only ~26. **So the exposure is CONCENTRATION, not reach**: a hundred customers spread two per state is nowhere near anything, forty in Texas is a registration. **The recommendation survives for the non-tax reasons** (no merchant of record can pay the detailers; Paddle may refuse the $499) **but the tax problem is now worth instrumenting** — Stripe Tax at the first out-of-state sale, 0.5%, because **it warns before a nexus threshold is crossed**, which converts an invisible creeping exposure into an alert. **The merchant-of-record question re-opens on a concrete trigger, not a date: registered in three or more states, or a warning about a state he has never filed in.** **His "type your email and it shows you" must NOT be built as described** — it is address enumeration, and anyone could learn whether their neighbour uses this detailer — **the safe twin is one word different: email IN, LINK OUT**, which is a third caller of the pattern `/booking/:id` and 2.12's quote acceptance already use. **And the cheapest 90% of "auto-detect" is the BROWSER remembering the last customer on that device**, since most people rebook on the same phone. **Moving the contact step first was declined as a default** because the step budgets were measured (1440x900, 10px spare on step 1) and a reorder means retaking all of them — **show recognition at the top of step 1 instead.** **His own dashboard was already roadmap 4.4 and is now specified** (`docs/platform-admin-2026-09-04.md`): the test for every screen is *what will he otherwise do by hand at 11pm with a SQL query*, impersonation is the biggest time-saver and must be logged, and it **splits — suspend rides along with billing, the list follows, the site columns wait for Phase 3.** **Pricing: three ways to pay**, with month-to-month the most expensive because he carries the risk, and **the setup fee is $999 as of this session** — his call, his reason, verified in a browser.

- **Pricing, the legal setup, and being told to stop re-opening a closed decision** — he pushed back with *"why do you keep mentioning Paddle? Aren't we just sure on Stripe?"* and **he was right**: it was decided in round 3 and then re-opened twice with "triggers", which reads as indecision and made him re-read the same argument three times. **The question is shut, and the rule that came out of it is worth more than the answer: a session that finds a reason to reconsider a settled decision writes it in the file and keeps working — it does not put the choice back in front of him.** **On pricing, the finding is that he is charging too LITTLE**: a custom site alone is $500–$5,000 from a freelancer and $10k+ from an agency, Housecall Pro is $59/month for software with NO website, and ongoing site upkeep alone benchmarks at $50–$200/month — **so the fix for "make it feel like a good deal" is not a lower number, it is putting the alternative on the page**, and his real differentiator (he edits their site whenever they ask) is currently invisible. **$600/year turns out to be exactly "2 months free" (16.7%), the industry-standard discount** — the most common figure in the category — **so change the WORDS, not the number**, because months-free converts better than dollars or percentages. **Three founding spots, kept**: one is an anecdote rather than an offer, three buys three references and three portfolio sites, and three at $40 covers the ~$45/month of fixed costs. **The best answer on sales tax is not software, it is his calling list** — SaaS is untaxed in ~25 states, and since he cold-calls he can choose them, which means **nothing to calculate, register or file anywhere**; Numeral's free nexus monitoring is the safety net, and Stripe Tax only goes on when a state actually needs it. **California is the one state that creates an obligation immediately** (he lives there; SB 122 lands 1 Jan 2027), which agrees with his own competition-based reason for skipping it — **but the rule is "prefer the untaxed states, never turn away a good customer over paperwork."** **Business setup: sole proprietorship, NOT a California LLC** — $70 to file then **$800 every year regardless of revenue, first-year exemption expired in 2024**, against ~$1,440 of founding-year revenue; **and the LLC decision belongs to his dad**, who already carries the liability by owning the payment account. **A minor CAN be an LLC member in California** (the state sets no age; Texas does) — the problem is contracts, and the standard fix is a manager-managed LLC with the parent as manager. **And two things he asked for turned out to already exist**: Resend emails at 80% and 100% of quota, so the alerting half needs no work, and his own admin dashboard was already roadmap 4.4. **He also told us the 4.4 paragraph was unreadable** — *"I have no idea what this whole paragraph means"* — which is CLAUDE.md's own plain-language rule being broken, and it is fixed in place with both versions kept.

- **The setup checklist, and the LLC advice reversing on one fact about Stripe** — he locked the pricing (*"I like that pricing. Lock all that in."*) and asked for the legal side as something followable: *"go here, click these links, this is what I have to do, this is why."* **`docs/setup-steps-2026-09-04.md`.** **The finding that changed a recommendation: a Stripe account CANNOT move between legal entities** — same entity, ownership transfers to a new individual; different entity, Stripe requires a new account. **So a sole proprietorship in his dad's name means every subscriber re-enters their card on his 18th birthday**, while an LLC hands over as one document with the entity, EIN, bank account and Stripe account all intact. **The earlier "skip the LLC" was decided on the $800 California franchise tax alone, and cost alone was the wrong basis** — the number to weigh it against is not $1,440 of founding revenue, it is what asking fifty subscribers to re-enter a card costs in cancellations. **Hence step 0 of the checklist, which is the question nobody had asked: how many months until he turns 18?** Under six, wait and set everything up in his own name — no LLC, no handover, ever. Longer, the $800 is buying a migration he does not have to do. **His Lakewood experience was correct and it applies here too:** the city's code requires the licence applicant **and the person principally in charge** to be over 18, so his dad applies — and the city asks you to phone before they issue an application, which makes **one five-minute call the fastest way to confirm every assumption on the page.** **Stripe Tax answered exactly:** it is ONE switch for the account, not per customer; once on it reads each customer's address automatically; **but it only charges tax where a REGISTRATION has been added, and returns zero otherwise** — so a Texas detailer signing up tomorrow is charged $0 tax and that is CORRECT. **Take the customer.** **And he is already earning ~$2,000/month detailing**, which is past the $400 self-employment threshold — **the most urgent item on the list is about the business he already runs, not this one.** **Shipped alongside: the annual line now reads "2 months free"** rather than "$120 less", still derived from config, with two new `landing-pricing` checks pinning the claim — whole months, and inside the category's 15–20% band — **baselined at `annual: 610`, which prints "1.8333333333333333 months free".**

- **The pricing page, and his "set it up right" idea turning out to be mostly correct** — he asked for the plan buttons to land on **a pricing page rather than a signup form** (*"that shouldn't bring you to a sign up or a payment screen"*), which is right for a customer who has not yet chosen between three ways to pay — **and that page is where California's AB 2863 disclosures legally have to sit**, before billing details are taken, so it is the load-bearing half of the checkout rather than decoration in front of it. **He is also right that the landing page's annual line becomes redundant once it exists — but the ORDER matters: the line stays until the page ships**, or the only mention of the annual option disappears before its replacement. **On the structure question he pushed back with an instinct that turned out to be sound**: put his dad only where an adult is genuinely required, and transfer nothing later. **Checked, and most of it holds** — the IRS sets **no minimum age for an EIN** (the parent is named "responsible party", a role changed later by form rather than by re-issuing the EIN), there is no age rule for being a sole proprietor, and **only three things actually need an adult: the Lakewood licence, the bank account and Stripe.** **So the entire LLC question reduces to one free Stripe support ticket** — is the account's legal entity HIM with a guardian attached, in which case 18 removes the guardian and costs nothing, or his DAD, in which case 18 is a new account and every subscriber re-enters a card. **Stripe's public wording (*"a legal guardian must assume the role of owner"*) does not answer it and their docs are silent on turning 18, so this is asked rather than guessed — and asked BEFORE the account exists**, because that is the one order that cannot be undone cheaply. **And he was right about Stripe Tax: turn it on from day one.** Stripe's own pricing page says fees are incurred *"only for transactions in jurisdictions where you have an active tax registration"* — **no registrations, no cost, no monthly minimum** — so enabling it early removes a thing to remember at no price.

- **2 December 2026 is the date the whole plan turns on, and it is his birthday** — told 2026-09-04, three months out, and it **collapses the structure question rather than answering it**: no LLC, no dad on the Stripe account, no guardian, no handover, and **the support ticket the setup file opened with is moot**, because a guardian only exists if an account is opened before 18. **He worked most of it out himself** — sole proprietor alone, EIN alone, licence at 18, a temporary joint bank account swapped later — **and he is right about the bank detail in particular: changing a payout account in Stripe is a settings change that touches no customer, no subscription and no stored card.** **The build is unaffected because Stripe TEST MODE needs no activated account**, so payments can be written and tested now and activated the week of the 2nd. **THE ESTIMATE, measured rather than guessed (`docs/timeline-2026-09-04.md`): eleven consecutive days of work, 214 commits, 104 of them touching code, 28 roadmap items closed and 23 open — and 18–27 sessions of work left before he could sell.** On three honest paces the software lands **late September, mid-to-late October, or late November** — **all of them before 2 December.** **So the software is not the constraint; his birthday is, and the first sales call is realistically the week of 8 December.** **What that slack is FOR: Phase 5**, putting his own detailing business on the platform and running it in parallel — free, needs no legal setup, and it is the best bug-finder available, so that on the first cold call he is selling something he has used daily for six weeks. **Five named risks could move it**, and the honest one is that **the discovery rate has not slowed** — the same eleven days turned up a live white-screen crash, an invoice that never added up and eleven under-floor email headlines, none of which were on any list beforehand.

- **Roadmap 2.14, step 2 - the plans a detailer logs, and the ledger that makes billing additive later** - three tables, one settings screen and the arithmetic in a file a test can reach. **The shape was HIS**, decided in round 3 after four rounds of research: a plan is LOGGED, never sold and never billed by us. **The load-bearing decision is where the two halves of the ledger live**, and it is not the obvious one: OWED is append-only rows in `plan_visits`, but USED is a column on `bookings` (`plan_member_id`) rather than a second ledger row - **because cancellation already works there.** Twelve places in this codebase ask `status <> 'cancelled'` and every one of them is already correct about a plan visit that was called off; a `used` row in a ledger would have needed a thirteenth rule and a compensating row nobody would remember to write. **Pause is a DATE, not a flag** (`accrue_from`): accruing from `started_on` would backfill every visit the pause was meant to skip the moment the member came back, which is the opposite of what pause means to the customer who asked for it. **`on delete no action`, not `restrict`, on `plan_members.plan_id`** - both refuse to delete a plan somebody is on, but deleting a BUSINESS cascades to both tables in one statement in an order Postgres does not promise, and `seed-demo.mjs` takes that path on every run. **The auto-link is a TRIGGER because there are three writers** (the public booking page, the dashboard's New booking modal, and the seed), and its imprecision is stated rather than hidden: a member who books something the plan does not cover has it counted, because `booking_services` rows are written after the booking and a BEFORE INSERT trigger cannot see what was bought. **No new permission key** - `plans` writes ride `settings` (an offer with a price, exactly the catalog's test), `plan_members` and `plan_visits` ride `money` (what somebody pays, exactly what `can("money")` already hides on Clients) - **and that pairing is the one thing in this item put to the owner rather than decided.** **`composition` caught a real design error rather than a technicality**: both lists were cards, and a member list grows with the business - they are ruled rows now, with one editor open at a time replacing the list. **And two defects came out of LOOKING at it, neither of which any check in this repo could see**: the member editor never named the person it was about, and "No plans yet. Most detailers start with one..." was painted before the first read returned - the "a failed read must not look like an empty business" rule one state earlier, because the same sentence is equally untrue while loading. **A FOURTH PRICE SHAPE ARRIVED THE SAME DAY, because he asked whether a detailer is locked into a kind of plan and the answer was checked by putting ELEVEN real shapes on the screen rather than by reading the schema back to him.** Ten rendered correctly; **a prepaid block had to be entered as a MONTHLY price**, so "$1,999 for the year" printed as "$1999.00 a month". `price_kind` gained `'total'` — one value on an axis that already existed, not a column — and the same eleven rows showed that **a twelve-month term was printing nowhere on the screen that lists what you offer.** `term_months` stays SEPARATE from `price_kind`: a prepaid year is usually a twelve-month term, but a prepaid block of ten visits has no end date, and merging them makes one of the two unsayable. **What step 2 deliberately does NOT do is the customer's half** - the booking page's plan buttons, the welcome-back line, the remembered browser and the "your plan" link - and the reason it is a separate step is that all four are on the booking page, whose step budgets are measured to 10px.


- **Roadmap 2.14, step 3 - the customer's half of plans, and the four decisions that kept it inside a measured budget** - the booking page's plan buttons, the recognition, the remembered browser, the "your plan" link and the email nudge. **The organising constraint was arithmetic, not taste: step 1 has TEN PIXELS of spare room at 1440x900 and that budget is the detailer's catalogue.** So the plans live on a page of their own (`/book/:slug/plans`, which is also what 7 of 7 sampled detailers and 5 of 6 products do), the door to them rides the row the progress rail and "Step 1 of 7" already share, and the recognition the owner asked for is spent on TWO LINES THAT WERE ALREADY DRAWN - step 1's heading becomes *"Welcome back, Marcus"* or *"Let's set up your Bi-weekly maintenance"*, and the price bar's eyebrow says which plan moved the number. **Every step's spare room is identical to before the item.** **The plan's effect on the price is ONE function in `_shared/pricing.ts` and it rides `price_adjustments`** - the array every receipt, email and invoice already itemises - rather than a `plan_discount` column that would have needed adding to nine render paths and forgetting in a tenth. **The rule: the plan governs the SERVICES, extras and travel are always extra, and a percentage comes off the whole job.** **A plan sign-up is a REQUEST in either booking mode**, because the sale and the schedule are two acts and the detailer has to agree somebody is on their plan - but an existing member booking their own covered visit is not held up, which is why `create-booking` asks whether they are already a member rather than keying off the plan alone. **The owner's "type your email and it shows you" was built as its safe twin, EMAIL IN / LINK OUT** - the version he described is address enumeration, and the endpoint answers identically whether or not the address is a member. **His customer-account idea shipped as a LINK** (`/plan/:memberId`, the membership UUID as the credential, the third caller of a pattern this product already used twice) rather than as a second kind of human in `auth.services`. **A defect fixed on the way through that predates this item: a NEGATIVE `price_adjustments` line printed as a positive CHARGE in every email** - `moneyBlock` draws by `kind`, not by sign - which `accept-quote` could already reach whenever a detailer quoted UNDER the estimate. **And the plans page was built as four boxed cards first and rejected on sight of its own screenshot**: four identical full-width panels each ending in a full-width button repeating the name above it, which is `docs/design-knowledge.md` §1's tell and the owner's copy rule in one. The ruled list that replaced it is the composition law's own answer and cost 96px a plan against 190px.
- **Roadmap 2.19 — a manual re-book email, and the machinery a MANUAL send still needs** — the owner ruled that nothing sends itself: a human picks the names and presses the button, and the reminder is a ROW ON A SCREEN rather than an email to him. What the roadmap entry understated is that CAN-SPAM classifies a message by its PRIMARY PURPOSE, never by what pressed send — so *“we haven’t seen you in a while”* needs a working opt-out and a postal address whether a person or a cron job sent it. **What the manual design removes is the SCHEDULING, not the statute.** So: `customers.unsubscribed_at`, a public two-step opt-out page (a one-click GET link would be pressed by Gmail’s prefetcher and every corporate link scanner, silently opting people out of businesses they still want to hear from), `businesses.mailing_address` as its own field because a mobile detailer has no unit, and a **50-recipient cap** that is ours rather than the law’s — the platform’s whole Resend allowance is **100 emails a day across every tenant**, and one unbounded campaign could stop bookings confirming. **The compose surface selects nobody**: Clients already knew who had lapsed, so the sheet is handed a list a human narrowed and its only job is the words. **And the demo had ZERO lapsed customers**, so the “not seen in 3 months” block `sweep-widths.mjs` has walked at five widths since 2026-09-02 was measuring an empty screen and printing clean — the seventh instance of *a skipped check reads exactly like a passing one*, found by asking the database rather than by reading the sweep’s output. **And it exposed a RACE in `sweep-widths.mjs` that is older than the item**: Monthly plans and Team draw their buttons only after Supabase answers, and both were measured with `settle()` + `count()` — a cap on a repaint, never a wait for a round trip — which `?lite=1` makes WORSE because a page with no animations goes quiet sooner. It printed `NO SUCH BUTTON`, which reads as a renamed control. **A control run proved it was ours, a bisect blamed a file, and a `console.log` probe then passed with that file in place** — which is what a race looks like from the outside. Also recorded there: `campaigns`/`campaign_visits` are tracked marketing LINKS and have nothing to do with this feature, and the opt-out is NOT tamper-proof against the tenant, which is a stated ceiling.

- **Roadmap 2.20, stage 1 — the detailer's own payment handles** — the half of "taking money" that needs no processor, no key and no webhook: the detailer types their Venmo, Cash App, PayPal, Zelle and cash, and the customer's emails print them. **The scope in the roadmap is ROUND 3's and it contradicts round 2's, which is still quoted in three files**: round 2 said the UNPAID INVOICE ONLY; round 3 moved it to the confirmation and the reminder as well, on the owner's own trade knowledge (*"they don't leave a client's house until it's paid"*), because the unpaid invoice is a rare document. **The receipt still carries nothing** — that is his complaint about his old site and it is the point of the branch. **A FIFTH email carries them and the roadmap's wording would have missed it**: in request mode the ACCEPTED-request email is the confirmation, so following "the confirmation and the reminder" literally gives every request-mode tenant handles on no email at all. **A link is built only from a plain username or a pasted `https:` URL** — a wrong payment link sends money to the wrong person and is invisible from every screen — so a phone number, an email address or `javascript:` is printed and not linked, and a typed Zelle handle never links because Zelle has no username to build a link FROM — though a URL the detailer PASTES links in any field, which the module's own header denied until a security review ran the code instead of reading the comment. **No preview on the settings screen and no QR upload**, both refused with reasons. **Two defects came out of LOOKING**: the paired Venmo/Cash App row clips a handle at 392, and a payment handle is the one value where reading half is reading none; and the Business row summary was truncated to "…something els…". **Its other half shipped too: a rejected email send is now a fact about the CUSTOMER rather than an entry in a log** — `customers.email_failed_at`, stamped by `send-email` and **cleared by the next successful send**, because an opt-out is permanent and a bounce must not be, or a detailer who fixes a typo is told forever that the address they corrected is broken. The three places that ask *can we email this person* now agree, and only `send-campaign`'s is enforcement. **And adding the seeded bounce to the width sweep with an `else` that prints `NOT MEASURED` uncovered a race OLDER than the item**: the whole Clients block was `settle()` + `count()`, so in `--lite` six of its measurements had been silently ceasing to exist at three of five widths. *A guard that skips is byte-identical to a guard that passes; give every new one an `else`.*
- **Roadmap 2.20, stage 2 — the pricing page, and why it is not decoration** — the owner's *"that shouldn't bring you to a sign up"*, built as `/pricing`. **The page is the legally load-bearing half of the checkout**: California's AB 2863 wants the auto-renewal terms, the twelve-month commitment and the early-exit fee clear and conspicuous BEFORE billing details are taken, so eight disclosures sit in a definition list at reading size rather than in a fine-print ramp. **The three ways to pay are a ruled LADDER and that shape is a legal decision, not a visual one** — three cards side by side invites a highlighted middle, which is a pre-selection in everything but name and the first item in the FTC's Adobe complaint; there is no selection state on the page at all, so nothing can be defaulted. **Each rung's headline figure is what leaves the BANK**, never an effective monthly. **The tick is deliberately at the checkout and not here** — consent must be stored with the subscription, and consent gathered on a marketing page and carried through a signup flow is consent that can be lost. **The founding ladder is DERIVED**: $400 and $50 follow the list ladder's own two rules (2 months free, +25% for no commitment), and the test pins the RULES rather than the figures. **Three of the four defects it produced were invisible to every check this repo had** — the test's own pricing-section slice had been EMPTY since it was written, a `data-rv` on a node the offer lookup adds can never reveal and left the scarcity claim at opacity 0 in the normal path only, and the width sweep reported three false positives on the landing ground the first time it ever walked a page carrying one. **And `appear()` was unreachable at its new caller for the SECOND time** — a `const` inside the width loop — so it is at module scope now.
- **Roadmap 2.25 — Google sign-in was already built, and two of his three asks were already done** — he asked for a better sign-up screen, login/sign-up buttons on the landing page and Google sign-in; **checking the repo and the live project first turned a three-part build into a one-part one**. `Auth.jsx` already calls `signInWithOAuth`, already carries Google's marque, and already asks GoTrue's `/auth/v1/settings` so the button cannot appear before the provider is on — and that endpoint answers `google: false`, so it is a Supabase toggle plus a Google Cloud OAuth client, which is HIS ten minutes and not code. The landing nav already has both buttons; what is true is the WORDING. **The real work is the screen**, which is built from the dashboard's chrome while everything before it is the landing world — and the trap is `theme.css` being global, which is why nine class names on the landing page are already renamed.

- **Working from the cloud while the owner is away (2026-09-05)** — what a Claude Code web session can and cannot do on THIS repo, settled by reading the docs rather than guessing: no `.env` in the clone and no Supabase on the sandbox allowlist, so **no database**; no Playwright browsers and a blocked CDN, so **no browser and therefore no screens**; and the user-level design skills are not there either. What survives is measured — **all ten credential-free checks run on a bare clone with no `npm install`**, plus the production build and `gh`. He starts a session with one memorised sentence, *“Follow `docs/cloud/README.md`”*, so **that file’s first block is a complete brief and anything a cloud session must know goes in it rather than in a message.** § 6 is its bounded permission to choose its own work when the queue empties: three tests (can it be finished here, can it be CHECKED here — name the check or write a document instead — and would he recognise it as the next thing), a ranked list, an off-limits list no reasoning overrides, and a **stop rule**: two self-chosen sessions producing only documents means the cloud-shaped work has run out.

- **Roadmap 2.20, stage 2 — the checkout, the billing page and what a failed card does** — the half the pricing page left open: Stripe Checkout in subscription mode, the express affirmative tick, the detailer's own billing page behind the gear, and the dunning the page now promises in print. **The organising decision is that the page PRINTS and the server CHARGES, and one pure module does both** — `_shared/platformBilling.ts` is the second copy of the price table this repo allows (a Deno bundle cannot import out of `supabase/`) and it is pinned value by value, because this is the first place *a number printed is not a number charged* is literally true rather than a metaphor. **Every price is SNAPSHOTTED on the subscription row and never re-read**, since recomputing an exit fee from a later config turns $240 into $360; **consent stores the WORDS rather than a boolean**, because the sentence is what answers a chargeback, and it is GENERATED by the same function that stores it so the screen cannot promise something else. **Suspension needed no new mechanism**: `businesses.status = 'paused'` already darkens the public booking page while leaving an existing customer's receipt page and the whole dashboard intact — roadmap 4.4's suspend, built once. **Inline `price_data` rather than Stripe product ids** so the amount lives in this repo instead of another company's admin panel, and **no Stripe SDK** — a hundred lines of form encoding, one fetch and the webhook HMAC. **The portal is pinned to the card-update flow** so cancelling cannot bypass the exit fee, and the cancel button stays one press behind one confirm. **The webhook's signature IS its authentication** (public, `verify_jwt=false`, raw body, timestamp tolerance, an insert-first idempotency lock), and **an unknown Stripe status maps to NULL** rather than defaulting either way. **Five things it found, three of them invisible to every check in the repo**: the consent sentence rendered as an uppercase micro-label, a chosen rung that looked identical to the two nobody picked, *"Next charge"* printed on a date last week, a check that passed with the sentence deleted from the email because the hidden preheader also said it, and a TypeScript parameter property that made the whole signature check unimportable by Node. **AND IT HAS SINCE TALKED TO STRIPE — he opened a test account the same day.** A real Checkout paid with 4242, and a TEST CLOCK run that took a second tenant from past_due to suspended with its booking page genuinely offline. Stripe's own page printed $539 today then $40 a month, which is the tie-out closing in the real world. **Four things fell out of it that no reading would have produced, two of them bugs**: Stripe's default end-of-dunning is a CANCELLATION rather than `unpaid` (so a row could say `canceled` while the page was dark and the screen said nothing — `suspended_at` outranks the word now); `invoice.charge` is an ID, so the decline reason was ALWAYS null and the email never printed the line a detailer can act on; the pinned API version turned out to be load-bearing, because at the account's newer default an invoice carries neither `charge` nor `payment_intent`; and Stripe Tax refuses the whole session without a head office address, which is a third dashboard setting this item has refused to let be load-bearing. **And the owner, reading a screenshot on his phone, found the tenth thing: the founding saving was STATED in prose and not SHOWN — an inconsistency inside `/pricing`, where the build fee one section above already struck its list price and the three rungs under it did not. Both surfaces strike now, the dashboard needed a server change to do it (`summary` resolves quotes to one column), and the rule is unchanged everywhere: a struck price is a real price the product charges somebody, never an anchor.** **The `impeccable` audit scored the screen 23/40 and found nine things; the two that mattered most were rules this repo already had in writing — on a phone the twelve-month commitment was ellipsised out of existence by `.row-item .sub`'s `nowrap`, which no check here can see because clipped text has a normal box, and all three rung sentences opened by restating the label above them. Two of its findings were refused with reasons, and one of those (structure the consent, do not leave it as a 63-word paragraph) is a real question standing for the owner.**

<!-- INDEX:END -->

## Phase 2

- **`docs/dashboard-spec.md` does not exist in the repo.** The brief said to
  build to it, but it was never committed. The dashboard was built from the
  brief's own requirements plus the old admin's screen structure (which
  already matches the five specified tabs). If the spec turns up, diff the
  built dashboard against it.

- **`cancel-booking` / `reschedule-booking` were rewritten from scratch.**
  The old project had them deployed, but their code was never committed to
  git (and the old Supabase project is off-limits), so there was nothing to
  assess. The new ones use the same access model as the public receipt page
  (the unguessable booking UUID) plus the per-business
  `cancellation_window_hours`; inside the window the customer is told to
  call.

- **Vehicle-size pricing is now per service, and it sums.** The old system
  charged one flat surcharge per booking (+$15 medium / +$30 large),
  implemented three separate times. The new `services.vehicle_size_adjustments`
  puts the adjustment on each service (a big vehicle adds time and cost to
  each job performed on it), and the pricing engine is the single
  implementation. A detailer who wants the old behavior sets the adjustment
  on one service and zero on the rest.

- **Admin overlap edits are now hard-rejected, not warned.** The old
  update-booking deliberately allowed the owner to double-book with a
  warning. Phase 1's database exclusion constraint (per the Phase 1 brief:
  "the database must make this impossible regardless of what the application
  does") makes that physically impossible, so a conflicting admin move
  returns a clear error instead. If deliberate double-booking matters later,
  it needs a schema-level change (e.g. an allow_overlap flag excluded from
  the constraint).

- **Minimum advance notice now applies to every day, not just today.** The
  old 2-hour rule only ran for same-day bookings (a 2-hour setting can't
  reach past midnight anyway). With per-business values that can be days
  long, the rule is now "no slot closer than X minutes from now," which is
  what a big value obviously intends.

- **No hours = closed.** The old available-slots fell back to Andrew's
  hardcoded weekly schedule when the business_hours table had no row. A
  platform can't guess another business's hours, so a weekday without a row
  is closed until the owner sets hours.

- **Owner reminder emails reuse the owner-notification layout** with an
  "Upcoming job" subject, rather than porting the old separate reminder
  template — same information, one less template to maintain.

- **Booking line items write directly to the database** (RLS-scoped), while
  the final amount/payment status go through update-booking. Line items
  don't affect scheduling or conflict rules — they're settings-style child
  rows — so they follow the brief's "don't over-engineer settings writes"
  rule.

- **The reminder sweep needs a scheduler.** The old pg_cron job was created
  in the Supabase dashboard and never committed. The new send-owner-reminders
  function is idempotent (marker-guarded) and deployed verify_jwt:false like
  the old one; schedule it every 15 minutes (Supabase Dashboard → Cron, or
  pg_cron + pg_net) when going live. Not wired up in SQL because the
  function URL/key don't belong in a migration.

- **Email/push provider keys are not configured yet.** send-email logs and
  skips when RESEND_API_KEY is unset; owner push skips without VAPID keys.
  Set `RESEND_API_KEY`, `OWNER_VAPID_PUBLIC_KEY`, `OWNER_VAPID_PRIVATE_KEY`,
  `OWNER_VAPID_SUBJECT` as function secrets when going live. All mail sends
  from `bookings@detailplatform.com` (one config constant) with the
  tenant's own Reply-To.

- **Multi-business users are supported by the schema but not the dashboard
  UI.** business_users allows one login in many businesses; the dashboard
  currently uses the first membership. A business switcher is a later,
  additive feature.

## Phase 2 follow-ups (visual direction, theming, staff accounts)

- **`docs/dashboard-spec.md` is now in the repo** (supplied directly and
  committed). The gap report against it is in
  `docs/dashboard-spec-gap-report.md`.

- **No `.ics` / add-to-calendar file exists in the new build.** The old app
  had one (`reference/frontend/src/lib/ics.js`); it was not ported, and the
  spec asks for an "add to calendar" button on the job detail page. It is
  listed as a gap, not a timezone defect — there is no wrong timezone in it
  because there is no file. When it is built it must stamp times with the
  business's IANA zone (`DTSTART;TZID=`), not a UTC offset.

- **`businesses.timezone` defaults to `America/Los_Angeles`.** It is the one
  remaining hardcoded zone in non-test code, and only as a column default
  for a business created without one. Signup should always set it
  explicitly; changing the default to something neutral is a one-line
  migration if preferred.

- **Per-employee job assignment and per-employee availability are
  deliberately deferred.** The availability engine answers "is the BUSINESS
  free," not "is a specific person free," and changing that is a significant
  piece of work not needed for launch. The schema does not foreclose it: a
  later `bookings.assigned_user_id` (nullable, FK to business_users) plus a
  per-user hours/blockout table can be added additively, and
  `_shared/slotValidation.ts` takes its inputs from settings rather than
  hardcoding a single calendar, so a per-person branch slots in there.

- **Staff can read `services` and `add_ons`.** They need the catalog to
  create a booking. They cannot WRITE it (catalog edits sit behind the
  owner-only Services screen and, at the database, the tenant policy plus
  the owner-only More section). If read access to pricing should also be
  owner-only, that is a one-line policy change — but staff then cannot book
  for a walk-in.

- **`business_settings` is owner-only to READ, not just write.** The brief
  said staff cannot see business settings; the strict reading (zero rows,
  not just a hidden screen) is what is enforced. Consequence: a staff
  session cannot see the booking rules, so any future staff-facing screen
  needing e.g. the slot interval must get it from an edge function rather
  than a direct query.

- **Theme choice is stored per user in the browser (localStorage), not in
  the database.** It is a personal display preference, and keeping it
  client-side avoids a write on every toggle. It therefore does not follow a
  user to a different device. Moving it to a `business_users.theme_mode`
  column later is additive.

- **Brand color is stored raw; correction happens at render time.** What is
  saved in `business_branding.primary_color` is exactly what the owner
  picked (so the booking page and the dashboard agree on one value), and
  `app/src/lib/theme.js` adjusts its lightness per theme only when it fails
  contrast. Nothing is silently rewritten in the database.

- **The last-owner trigger needed a cascade exception.** As first written it
  also blocked deleting a whole business (the cascade into `business_users`
  tripped the guard). Fixed in `20260827003100_last_owner_cascade_fix.sql`:
  the check is skipped when the parent business row is already gone.

## Test deployment and later fixes

- **A private test deployment exists on Netlify**
  (`detailplatform-admin-test.netlify.app`), built from the working branch,
  with a seeded demo business. It is for device testing only — not for real
  customers, and the demo credentials are shared in chat, so treat anything
  in that business as public.

- **The Netlify site is deployed from an uploaded build of `app/`, not wired
  to the GitHub repo.** Re-deploying is a manual step (the deploy command in
  `docs/phase2-engine-and-dashboard.md`). Connecting the repo for automatic
  branch deploys is worth doing before this is used regularly.

- **`.env.production` must not be committed in `app/`.** Vite loads it after
  `.env.local`, so its presence silently overrides local development config.
  Netlify supplies the build env from its own dashboard variables instead.

- **The old `.ics` emitted floating times** (no `TZID`), which a calendar
  client interprets in the VIEWER's zone — a 10am Los Angeles job showed as
  10am wherever the customer was. The port fixes this rather than
  reproducing it.

- **`expenses.payment_method` is written as "unspecified"** by the three-tap
  flow. The column is from the old schema and the spec's flow doesn't ask
  for it; drop the column or start collecting it, but it shouldn't stay
  half-used forever.

- **Signup has an edge function but no UI.** `create-business` enforces the
  timezone requirement; there is no sign-up screen yet, so businesses are
  still created by script for now. The screen belongs with the public site
  work.

## Design system (August 2026)

- **docs/design-system.md is law for UI work.** "Raking Light": matte dark
  ground where one thing per screen is lit (accent bar + bloom + lifted
  surface). Three voices — Anybody (wide titles / narrow tracked labels),
  Public Sans prose, DM Mono for every figure. Dark is the home theme;
  light is the disciplined daytime mode with a tinted bar and no bloom.
- **Composition varies with content, the theme doesn't.** Cards are for
  objects, not sections; enumerations are ruled lists, money is a receipt,
  sequences are rails, headline stats are bare mono figures. Two adjacent
  blocks with the same treatment should be the same kind of thing.
- **Accent correction is two-tier.** Fills correct to 3:1 (--accent);
  accent-as-text corrects to 4.5:1 (--accent-text). Small text colored with
  --accent is a bug. tests/design-contrast.test.mjs measures the promises.
- **Routes:** marketing at `/`, dashboard at `/app/*` (legacy `/*`
  catch-all kept for bookmarks), booking `/book/:slug`, receipts
  `/booking/:id`. tests/route-contract.test.mjs ties these to the email
  builders in config.ts, whose fallback is now detailingplatform.com.
- **Landing prices live in `app/src/landing/pricing.js`,** not in the JSX:
  website + booking $900 setup / $60 month (or $600/year), booking page
  only $35/month, founding $499 setup / $40 month.

- **The founding offer is COUNTED, not declared.** `platform_settings`
  holds the cap and `businesses.plan_tier = 'founding'` marks an account;
  `public.founding_offer()` (SECURITY DEFINER, granted to anon) returns
  `{total, left}` and nothing else — a visitor can read the number without
  reading a row. Mark a founding customer with
  `update businesses set plan_tier = 'founding' where slug = '<slug>';`
  and change the cap with `update platform_settings set founding_total = n;`.
  A churned account releases its spot. The page **fails closed**: if the
  count cannot be read, it shows standard pricing and makes no scarcity
  claim at all.

- **The struck $900 is honest.** It is the real, current list price,
  rendered only while a real founding discount is live and only from
  config — never a literal typed in to make another number look smaller.
  `tests/landing-pricing.test.mjs` enforces exactly that, plus: no
  hardcoded prices, no founding copy outside the guard, no urgency
  theater, and no free-trial claim.

- **Landing motion** lives in `app/src/landing/motion.jsx`: the opening
  sequence waits on the display font (no typeface swap mid-headline), a
  specular sweep crosses the headline, Anybody's width axis opens as
  headings arrive, figures count up, the demo card holds the cursor, and
  the rail draws. All transform/opacity; `prefers-reduced-motion` lands
  every element on its final state immediately; a failsafe reveals content
  if an observer never fires. The ambient glow is capped at 0.35 opacity
  because it tints the ground behind text and therefore enters the
  contrast maths.

- **The "30 free days" copy is gone.** It was written beside the
  placeholder price and no such trial was ever offered; with setup fees it
  would have been a false claim. Billing is still not implemented — nothing
  charges anyone yet.

## Signup (August 2026)

- **Signup is two screens, not a wizard:** email + password, then business
  name, booking link and timezone. `create-business` seeds settings,
  branding and a Mon–Fri 9–5 week, so a new booking page has open days
  from the moment it exists. Services are left empty — that is the first
  thing the owner does.

- **Email confirmation is OFF** (`mailer_autoconfirm = true`). "Straight
  into the dashboard" is incompatible with a confirmation round trip, and
  the project has no custom SMTP — Supabase's built-in mailer is rate
  limited to a handful an hour. The cost is that email addresses are
  unverified; revisit when a real sending domain exists.

- **Founding pricing is granted by the database, never by the client.**
  `?offer=founding` is a REQUEST; `claim_founding_spot()` takes a lock on
  the settings row, counts what is taken and only then marks the business,
  so the query string cannot mint founding accounts and two simultaneous
  signups cannot both take the last spot.

- **A user with no business lands in business creation,** not on the old
  "This login isn't linked to a business yet" dead end. That is also where
  a Google sign-in for a new account arrives.

## Removed on purpose (per the brief — don't be surprised they're gone)

- **Monthly plans** — permanent discount with no billing behind it. Table
  dropped, pricing engine no longer knows about them.
- **Referral / loyalty system** — zero live rows, manual redemption.
  Columns dropped, email blurb removed.
- **Google Calendar sync** — needs per-tenant OAuth; separate project.
- **Owner "test booking" preview mode** in create-booking — the old
  owner_access_token no-persist path. The dashboard's real create flow (with
  admin notes) replaces it; a preview mode can return later if missed.
- **The old dead functions** (`tz-debug-temp`, `create-booking-backup`,
  `admin-selftest`, `hyper-task`, fitness-app functions) — never ported;
  they only ever existed deployed, not in git.
- **vCard attachment on owner emails** — small nicety from the old owner
  notification, dropped in the port; easy to re-add to the templates module
  if missed.

## Owner decisions (2026-08-28)

- **Everything "Removed on purpose" above comes back.** The owner wants
  full parity with the old business: monthly plans, referral/loyalty,
  Google Calendar sync, the owner test-booking preview, and the vCard
  attachment are to be re-added — but redesigned as per-tenant,
  configurable platform features ("in a way that will be best for
  detailers in the future"), not ports of the single-business versions.
  Before building, audit `reference/` for anything else dropped silently.
- **Andrew's Auto Detail becomes tenant #1.** Migrate a copy of its data
  from the old project (`adtlnvihwrcqcasqcjwd` — the owner has authorized
  reads), run both sites in parallel, and cut the domain over only when
  the owner trusts the platform. Nothing on the old site is decommissioned
  until then. This doubles as the feature-parity test.
- **Tenant URL tiers.** Booking-only customers live at
  `detailingplatform.com/book/:slug`. Website-package customers get their
  own custom domain (Netlify domain alias + a `custom_domain` →
  business lookup, to be built before the first website customer).
- **Tenants need full websites, not just booking pages** — home, services,
  gallery, about, reviews, FAQ, contact — built entirely from tenant
  configuration. This is the largest remaining build and a prerequisite
  for the demo business.
- **The visual design restarts from scratch (2026-08-28).** "Raking
  Light" was picked from a handful of renders before the owner's design
  research existed; the owner has un-settled it. The backend is kept;
  every surface gets a new visual world chosen in a proper direction
  round (references → distinct rendered directions → owner pick →
  documented system → rewritten design tests). Until the new system is
  written, docs/design-system.md is evidence of the old look, not a
  contract — see DESIGN.md and docs/roadmap.md Phase 1.

## Roadmap 0.1 cleanup (2026-08-28)

- **The old project was never opened to anonymous writes — proven, not
  assumed.** `temp_enable_inserts.sql` sat in the repo root offering to
  create `"Allow anonymous inserts for testing"` on `bookings`
  (`TO anon WITH CHECK (true)`), and nobody knew whether it had ever been
  run. Three read-only queries against `adtlnvihwrcqcasqcjwd` settle it:
  no `INSERT` policy exists for `anon` on any table in `public`; no policy
  by that name exists; `bookings` carries exactly one policy,
  `bookings_admin_all` (`{authenticated}`, `ALL`, guarded by
  `is_active_admin()`); RLS is enabled on all 22 public tables. The broad
  `anon` table grants visible in `information_schema` are the Supabase
  default and grant nothing without a permitting policy. **No fix was
  needed on the live project, and the question is closed.**
- **`.gitconfig` was deleted although roadmap 0.1 does not name it.** Same
  Emergent provenance as `.emergent/`; it set the commit author to
  `emergent-agent-e1 <github@emergent.sh>`. Removing it changes no
  behaviour — git reads `.git/config`, and the effective author was
  already the owner's.
- **README.md was rewritten rather than left or deleted (owner's call).**
  It was 24 KB describing the old single-business site, carried its own
  "this README is stale" banner, and was the only file outside the
  deletion set linking to `ADMIN_SETUP.md`. Now 41 lines: what the repo
  is, and a pointer table into the docs that are actually maintained.
- **`PROJECT-STATE.md` and `PRODUCT.md` are now tracked (owner's call).**
  Both existed only on the owner's machine, yet `CLAUDE.md` orders every
  new session to read `PROJECT-STATE.md` first — a fresh clone would not
  have had it. Neither contains a credential.
- **OPEN — owner only: rotate the old project's anon key.** Deleting
  `create_sample_bookings.js` removed the committed JWT from HEAD but not
  from git history, where it stays recoverable (ref
  `adtlnvihwrcqcasqcjwd`, expires 2036). Rotating is a write against a
  live money-taking system, so it is the owner's action. Severity is low:
  an anon key is designed to be public-facing, and the check above proves
  it grants no write access to any table.

## Phase 0 — 0.2 email

- **Email's root cause found: `PLATFORM_FROM_ADDRESS` is Resend's shared
  sandbox sender.** The secret is set to `onboarding@resend.dev`. Resend
  restricts that address — it is shared by every account on the platform —
  to the account owner's *own* address, whatever domains the account has
  verified. Every send to any other recipient is rejected at validation
  with HTTP 403 `validation_error`, verbatim:

  > "You can only send testing emails to your own email address
  > (andrewswashing@gmail.com). To send emails to other recipients, please
  > verify a domain at resend.com/domains, and change the `from` address to
  > an email using this domain."

  Evidence: Supabase `function_logs` for project `kguqylyzgyzfktkfnhjb`,
  2026-08-28 07:01Z, ~20 occurrences across the booking test runs, each
  paired with the relay's own `send-email relay failed:` line. The
  rejection happens *before* Resend creates an email record, which is
  exactly why the Resend dashboard showed nothing at all — not a bounce,
  not a failed send. Nobody had read the function logs; the error had been
  printing all along.

- **No code is at fault, and nothing was edited.** The logs prove the whole
  chain is healthy up to Resend's validation: the relay's service-role auth
  passes, the business lookup resolves, the payload builds, and the API key
  authenticates (an invalid key returns `401`/`API key is invalid`, which
  is not what we see). The `email_customer_confirmation` and
  `email_owner_new_booking` gates are `true` for all 14 businesses, so the
  send is attempted, not skipped. One value is wrong; the code around it is
  correct.

- **The blocker is that `detailingplatform.com` is not a verified sender.**
  The Resend account (`andrewswashing@gmail.com`) has exactly one verified
  domain: `andrewsdetail.com`, verified 2026-03-02, sending enabled — the
  live business's domain. So `PLATFORM_FROM_ADDRESS` cannot simply be
  flipped to `bookings@detailingplatform.com` today; that would fail with a
  domain-not-verified error instead. Verifying the platform domain is DNS
  work on a production domain and is the owner's call. **OPEN — owner.**

- **Noted, not acted on: the platform shares the live business's Resend
  account.** The same account sends Andrew's Auto Detail's real customer
  mail. Platform test sends, seed runs and future tenants' mail would
  accumulate against that account's reputation and suppression list. Worth
  a separate account for the platform before real tenants exist; flagged,
  not decided.

- **Both domains use Netlify DNS** (`nsone.net` nameservers), so adding
  Resend's verification records is done in the Netlify DNS panel, not at a
  registrar. Read-only `nslookup` check, 2026-08-28.

- **Fixed and proven 2026-08-29.** Owner verified the subdomain
  `email.detailingplatform.com` in Resend (DKIM + two SPF CNAMEs, all
  verified); `PLATFORM_FROM_ADDRESS` now reads
  `bookings@email.detailingplatform.com`, and the default in
  `_shared/config.ts` was corrected to match — it previously named the
  **bare** domain `detailingplatform.com`, which is not a verified sender,
  so deleting the secret would have re-broken mail. Seven functions
  redeployed. Proof: a booking created through `create-booking` exactly as
  the public widget does it produced a customer confirmation to the owner's
  inbox, status **delivered** in Resend's log, plus the owner-notification
  to the demo tenant's contact address. The proof booking was then deleted
  from the demo tenant.

- **The existing Resend API key was kept; no new key was needed.** The 403
  had always been about the sender, never the key, so the key already had
  the access required. An owner-pasted key was declined rather than written
  into infrastructure, and flagged for revocation because pasting put it in
  a chat transcript.

- **`scripts/deploy-functions.mjs` did not run on Windows.** It built its
  root path with `new URL(...).pathname`, which yields `/D:/...`; `readdir`
  then resolved that against the drive as `D:\D:\...` and the script died
  before deploying anything. Now `fileURLToPath`. This is a
  moved-to-a-local-machine bug — the script had only ever run in the Linux
  sandbox.

- **OPEN — the local `.env` service-role key is stale.** It is not the value
  the edge functions hold: calling `send-email` directly from a script
  returns the relay's own 401. It still authenticates to PostgREST, so the
  mismatch hides until something calls a function that gates on the key.
  Function-to-function calls are unaffected (they read their own env), which
  is why production works. Refresh it from the Supabase dashboard before
  trusting the 7 credentialed test suites.

## Phase 0 — 0.4 deployment sanity (partial) + a security finding

- **The GitHub repo `random12one0/detailing-platform` is PUBLIC**
  (`"visibility": "public"`, unauthenticated API check 2026-08-29). Nothing
  in the docs said so, and the 0.1 write-up's severity reasoning assumed
  "recoverable from git history" meant *locally* recoverable. It does not:
  it means readable by anyone.

- **`backend/.env` was committed on 2026-02-01 and is still in the public
  history** (4 commits, reachable from `main`; deleted from HEAD only).
  It carried, in plaintext:
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (both for the LIVE
  business project `adtlnvihwrcqcasqcjwd`), `RESEND_API_KEY`,
  `GOOGLE_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `MONGO_URL`, `OWNER_EMAIL`.
  Emergent-era file; predates the platform conversion.

- **The serious one is the service-role key.** Decoded header/payload:
  `ref=adtlnvihwrcqcasqcjwd`, `role=service_role`, `exp=2036-02-01`. A
  service-role key bypasses RLS entirely — it is full read/write on the
  database that takes the live business's real customer bookings and money.
  Every prior note in this repo discussed only the **anon** key, which is
  publishable by design and was proven harmless by the 0.1 policy check.
  That reasoning does not transfer to this key. **Not verified as still
  live** — attempting to exercise a leaked credential was correctly blocked,
  and was not worked around. Treat as compromised until rotated.

- **The leaked Resend key appears already rotated.** Its commit is
  2026-02-01 07:25Z; the oldest API key now in the Resend account
  (`CarWash`) was created the same day at 21:06Z, ~14 hours *later*, and the
  leaked value matches none of the three current keys. Most likely replaced
  the same day. Low priority, but confirm rather than assume.

- **`GOOGLE_CLIENT_SECRET` should be treated as compromised** — cannot be
  validated read-only, and OAuth client secrets do not expire on their own.

- **OPEN — owner, and it needs care, not a click.** Rotating the live
  project's JWT secret invalidates BOTH the anon and service-role keys at
  once, which breaks the live booking site until the new anon key is rebuilt
  into its frontend and redeployed. That is a coordinated change on a
  money-taking system, so it is the owner's call and their sequencing.

- **Deployment (roadmap 0.4, partially answered).** `detailingplatform.com`
  is served by the Netlify project **`detailplatform-admin-test`** (site id
  `12ee8817-…`). Its current production deploy is git-linked: `branch=main`,
  `context=production`, `manual_deploy=false`, with a real
  `commit_ref`/`commit_url` into the GitHub repo. So HANDOFF was right and
  the older DECISIONS note about manual uploads is stale: **`main` builds to
  production.** Caveat: that deploy's `deploy_source` is `"api"`, so it was
  triggered through the API rather than observed firing from a bare `git
  push` — the repo linkage is proven, the push trigger is not yet.
- **A stray deploy from this working directory would hit production.**
  `.netlify/state.json` here pins `siteId` to the production site, so
  `netlify deploy --prod` run in this folder publishes to
  detailingplatform.com regardless of branch. Worth knowing before anyone
  runs a deploy command casually.

- **The local `.env` service-role key is deliberate, not a leak (owner,
  2026-08-29).** The owner put it there so sessions can drive Supabase
  directly — migrations, edge functions, queries — instead of handing them
  back dashboard steps. It is for the PLATFORM project
  `kguqylyzgyzfktkfnhjb`, the file is gitignored, and it has never been
  committed (verified). Do not flag it. It is unrelated to the exposed key.

- **The two service-role keys are not the same key.** Decoded side by side
  2026-08-29: local `.env` → `ref=kguqylyzgyzfktkfnhjb` (the platform beta);
  public git history `backend/.env` → `ref=adtlnvihwrcqcasqcjwd` (the live
  business, andrewsdetail.com). Different projects, different keys. The
  owner's intent covers the first; the second is an Emergent-era accident
  and the exposure stands.

- **Netlify auto-publishes on push (owner-confirmed, 2026-08-29).** The
  owner states Netlify is linked to git and every publish to git updates the
  site — which matches the git-linked production deploy observed on the
  Netlify side. Roadmap 0.4's central question is answered: **pushing to
  `main` deploys to production.** The working directory's
  `.netlify/state.json` pinning the production site remains a separate
  hazard for anyone running a manual deploy command here.

## Abuse check on the live project (2026-08-29, read-only)

Question asked by the owner: **was the exposed service-role key ever
actually used?** Answered without ever presenting the leaked key to
anything — every check below runs through the owner's own legitimate
Supabase access.

- **The key is still valid today, and that is now proven rather than
  assumed.** The anon key sitting in the public git history is
  byte-for-byte identical to the project's *current* anon key
  (`get_publishable_keys`, 2026-08-29). Both tokens carry
  `iat=1769922897` — 2026-02-01 05:14:57Z, the moment the project was
  created — and both are signed by the same JWT secret. Rotating that
  secret reissues both keys with a new `iat`; it has not happened. So the
  leaked `service_role` token (`exp=2085498897` → 2036-02-01) is live.

- **No evidence it has been used by anyone but the owner's own apps.**
  Findings, each with the source that supports it:
  - `pg_stat_statements` covers the **entire** exposure window and has not
    lost a single entry: `stats_reset = 2026-02-01 05:15:31Z` (project
    birth), `pg_postmaster_start_time = 2026-02-01 05:17Z` (never
    restarted since), and 3075 of a possible 5000 entries used, so nothing
    has been evicted. Every distinct SQL statement ever run on this
    database is still listed.
  - Of those, the 168 executed as `service_role` are all PostgREST-shaped
    application queries against the booking tables (plus `forge_*` and
    storage — see below). **No** reconnaissance or exfiltration
    fingerprint: no `information_schema` sweep, no `pg_read_file`, no
    `COPY`, no DDL, no bulk `SELECT customers.*` dump.
  - `auth.audit_log_entries` runs back to 2026-02-05 (1340 rows) and
    contains exactly **one** action ever taken as `service_role`:
    `user_signedup` at 2026-02-05 01:54:53Z, which is the creation of the
    owner's own `andrewswashing@gmail.com` account during setup.
  - `auth.users` holds two accounts, both the owner's, both from
    2026-02-05. No planted user, none banned, none deleted.
  - `pg_roles` is stock Supabase — no attacker-created role.
  - No foreign tables, and no planted `SECURITY DEFINER` function: the 11
    functions in `public` are all the app's own.
  - The public-facing RLS policies are still read-only SELECTs. The
    anonymous-INSERT policy from `temp_enable_inserts.sql` is still absent,
    confirming the 0.1 check.
  - One `cron.job` exists — the legitimate `send-owner-reminders-sweep`.
    Nothing else is scheduled.
  - Storage holds 2 buckets and 2 objects, all from the owner's own
    unrelated `forge` project.
  - API/edge logs corroborate the visible window (traffic is real visitors,
    Googlebot/AhrefsBot, and the Supabase edge runtime) but retention only
    reaches back to roughly June 2026 — 2026-08-01 returns rows,
    2026-03-01 returns none — so logs cannot speak for Feb–May.

- **What this evidence cannot prove.** `pg_stat_statements` records
  statement *shapes*, not rows or arguments: a read that happens to use the
  same query shape the app already uses is invisible in it. A pure
  data-read through PostgREST that mimicked the app's own calls would
  therefore leave no distinguishable trace, and the API logs that would
  have shown it are gone for the first four months of exposure. The honest
  verdict is **no sign of misuse, not a guarantee of none** — every
  durable, tamper-relevant surface (users, roles, schema, functions,
  policies, cron, storage) is clean, and every destructive or
  privilege-escalating use of the key would have shown up in one of them.

- **Side finding, unrelated to the leak:** this live business database was
  also used for the owner's personal `forge` fitness app (its `forge_*`
  tables have since been dropped; two storage buckets remain). Anything
  reachable with the leaked key covered that data too.

### 0.3 — the proof

Proven 2026-08-29 on the demo tenant (`demo-detail`), mailing only Resend's
`delivered@resend.dev` simulator, never a real address.

Method: the real job runs `*/15`, so a second job with the identical body was
scheduled at `* * * * *` to exercise the same mechanism on a one-minute
cadence, then removed. What was unproven was pg_cron → pg_net → edge function
firing unattended, not the parsing of a cron expression — and `*/15` is the
expression already running 1,255 times on the live site.

| Tick (UTC) | Function response | What it means |
|---|---|---|
| 01:25:00 | **500** `{"error":"JWT issued at future"}` | first call after deploy — see below |
| 01:26:00 | 200 `count:0, summary:{}` | nothing due, nothing sent |
| 01:27:00 | 200 `count:2, {owner_reminder_sent:1, customer_reminder_sent:1}` | **the scheduled run sent a real reminder** |
| 01:28:00 | 200 `count:0, summary:{}` | **no duplicate** — same booking, next tick, silent |

- **A reminder really sends, on schedule, untouched by hand.** Booking "ZZ
  Cron Proof C" was stamped `owner_reminder_sent_at 01:27:00.792` /
  `customer_reminder_sent_at 01:27:01.23` by the scheduler. Both emails show
  **delivered** in the Resend log at 01:27:00.881 and 01:27:01.325
  ("Upcoming job — ZZ Cron Proof C" and "Reminder: your appointment").
- **No duplicates.** The 01:28 tick returned `count:0` and C's stamps were
  unchanged. The marker guard holds.
- **No reminders for cancelled bookings.** "ZZ Cron Proof B", cancelled but
  timed to be due, kept both stamps `null` across all four runs and produced
  no mail. It is also absent from `get_bookings_due_for_reminder` while a
  confirmed booking at the same offset is present.
- **The response body carries no booking ids**, confirming the security fix
  is live in the deployed function, not just in source.

- **OPEN — the sweep can fail silently, and did once.** The 01:25 run
  returned 500 `JWT issued at future` from inside the function and sent
  nothing; the three following runs succeeded unchanged, and the keys in use
  have `iat` 2026-08-26 (comfortably past), so this reads as clock skew on a
  cold container on the first invocation after a deploy rather than a bad
  credential. Impact is bounded by the design: the sweep is idempotent and
  due-ness is recomputed every run, so a failed tick delays reminders by up
  to 15 minutes and never loses them. Nothing alerts anyone when a tick
  fails, though — worth an alert before real tenants depend on it.

- Cleanup: the one-minute job was unscheduled, both proof bookings deleted,
  and `cron.job` now holds exactly one active job,
  `send-owner-reminders-sweep` at `*/15 * * * *`. All 11 test suites pass —
  the four credential-free ones and the seven that hit the real project,
  which is what clears the new bookings trigger of breaking anything.

## Phase 1 — 1.1/1.2 the design brief (2026-08-29)

Both items are OWNER-gated, so this session built the instrument and asked
the questions rather than producing anything visual. `docs/design-brief.md`
holds them; `docs/design-references/` is where reference images go. No
direction was invented, sketched or hinted at — roadmap 1.3 explicitly comes
after the answers, and a direction proposed before the references exist would
anchor the owner's choice to my guess.

Judgment calls in how the brief is written:

- **The "feeling" question is asked with real-world anchors, not
  adjectives.** B2 offers Snap-on/Milwaukee, a high-end independent garage, a
  banking app, a barbershop/tattoo studio, Apple. `docs/design-knowledge.md`
  §1 is explicit that "modern and clean" *is* the slop — an adjective answer
  would produce five directions that are secretly the same one. Five named
  brands produce five genuinely different starting points, which is what 1.3
  requires.
- **An anti-reference is requested, not optional.** Costs the owner ten
  seconds and rules out a whole region of the space. Cheapest signal in the
  brief.
- **B1 forces a ranking of the three audiences.** Marketing page, dashboard
  and booking page want opposite things (bold vs. fast vs. warm); refusing to
  rank them is how a design lands bland. `design-knowledge.md` §4 already
  holds an OPINION that the booking page carries the most weight — the owner
  gets to overrule it, but only if asked directly.
- **B5 asks about sunlight and customer age** because they are facts only the
  owner has and they constrain the design harder than taste does. Direct sun
  on a phone is the strongest argument against a dark ground, and the old
  system was matte near-black. Guessing this wrong wastes all of Phase 2.
- **B6 confirms per-tenant accent colour survives.** Every visual decision
  has to remain legible after a stranger recolours it (neon green, near
  black). If the owner wants that taken away the design space widens a lot,
  so it is worth confirming before, not after.
- **B4 offers to keep parts of the old look.** The owner called for a
  complete restart, but "restart" and "hate every part of it" are not the
  same statement, and the three fonts / dark ground / one-lit-element rule
  are separable. Default if unanswered: throw it all out.
- **No screenshots of the old look were produced.** They would only be
  evidence for B3, which the owner has already formed an opinion on — they
  use the product. Offered rather than assumed.

### Tooling checked while 1.1/1.2 wait (2026-08-29)

1.3 has to render mockups and be verified by looking at them, so the path was
tested before it is needed rather than during:

- **Playwright had no browser binary on this machine** — `chromium.launch()`
  failed with "Executable doesn't exist". Fixed with
  `npx playwright install chromium` (114 MB, machine-local, no repo change —
  `playwright` was already a devDep). Re-tested: launches and screenshots.
- **`npm run dev` works** — Vite 5.4.21 on `localhost:5173`, `/` returns 200.
  `app/.env.local` supplies the config; there is no `app/.env`.
- Two screenshots of the CURRENT landing page (392 px and 1440x900) were
  taken and sent to the owner as evidence for B3, so "what bothered you about
  the old look" can be answered against a picture instead of memory. They are
  scratch files, not committed — the old look is already recorded in
  `docs/design-system.md`.

### Sign-off rule tightened (2026-08-29, owner correction)

The 1.1/1.2 handover gave the owner a next-session prompt *and* told them the
session was not safe to clear. They caught the contradiction: a prompt in the
chat reads as "you are done, go clear", so pairing it with "don't clear yet"
issues two opposite instructions. CLAUDE.md now states that the prompt and
"Safe to clear." are one signal that never appears by halves, and that a
session blocked on the owner ends with the ask alone — the sign-off comes
after their answer has been written into a file, not before.

Worth naming the real hazard: had the owner acted on the prompt instead of
the sentence, they would have cleared with the brief still blank and the next
session would have opened on 1.3 with nothing to design from.

## Phase 1 — 1.2 answered (2026-08-29)

Owner answered Part B by voice; recorded in `docs/design-brief.md`. Five of
six landed, and two of them change the shape of 1.3 more than expected.

- **B3 reframes the whole brief.** Every specific defect offered — too dark,
  too cold, too plain, hard to read, didn't look worth the money — was
  declined. The old look was "one of the better looks I've seen it create."
  The single complaint is that it "still kinda looked like it was made by
  AI", and the ask is "a fresh start with more thinking behind it."
  **Consequence: competence is the failure mode, not the target.** A
  direction that is merely well-executed reproduces the exact thing being
  rejected. `docs/design-knowledge.md` §1 is promoted from background reading
  to the pass/fail test, and each direction in 1.3 has to carry a stated
  argument for why it looks the way it does — the owner asked for visible
  thinking, so the reasoning ships with the mockups.
- **B2's "no"s are weak, its "yes" is strong.** Apple was the only anchor
  named without hesitation. Snap-on/Milwaukee and barbershop/tattoo were
  declined, but the owner also said they could not picture those looks — so
  those are "I don't know what that is" as much as "I don't want it", and
  they are not treated as hard exclusions. High-end independent garage was
  never resolved either way; it stays live and gets settled with images in
  1.3 rather than with another question the owner cannot answer from words.
  This is why 1.3 shows pictures: the question format itself was the limit.
- **The Apple answer carries a trap worth naming now.** That look is carried
  by world-class photography and large empty space; our hardest tenant is a
  new detailer with two services and no photos, which §4 of design-knowledge
  calls the real product. An honest Apple direction is the most likely to
  collapse into a blank page there. Kept, with the requirement that at least
  one direction is proven EMPTY rather than fully configured.
- **B5 removes the strongest argument against dark.** Sunlight is not a
  constraint — the dashboard is used before and after a job, not out in the
  sun mid-detail. Dark is therefore judged on merit, not ruled out by
  conditions. Customer age is genuinely spread (18 to old, no skew), so
  neither youth-app conventions nor senior-optimised oversizing apply;
  hierarchy and honest contrast have to do that work.
- **B4: nothing is kept.** `docs/design-system.md` is anti-reference only.
- **B6: no existing brand at all**, so a wordmark is in scope rather than a
  constraint to work around.

Two questions returned to the owner rather than assumed:

- **B1 was a badly-asked question and is my error, not theirs.** "Whose
  experience wins" assumed the owner would picture three screens competing
  for effort. Re-asked as B1b with a shop analogy (front window / back office
  / counter) and a recommendation: favour the booking page, because it runs
  the customers' money AND doubles as the thing shown in a sales call.
- **B6b, the per-tenant accent colour, was not answered** and is not safe to
  assume — it decides whether every visual choice must survive a stranger
  picking neon green. Recommendation given: keep it but narrow it to a
  curated set, which preserves the "your site, your colour" selling line and
  removes the failure mode. Nothing is designed around either answer yet.

## Phase 1 — Part C answered, and one constraint removed (2026-08-29)

- **B1b: the owner refused the ranking and gave a better one.** "I do want
  all of them", and specifically pushed back on the premise that a screen
  being out of the way excuses not making it good. What they gave instead is
  an expressiveness budget: landing page gets the most ambitious visual and
  scroll work, booking page gets real step-to-step motion and is "definitely
  more visually appealing" than the dashboard, dashboard gets things loading
  and popping in but **no scroll animation** ("could get annoying") and
  "don't overdo it". The governing sentence for the dashboard is theirs:
  **"the design that is visually appealing needs to be convenient"** —
  convenience sets the shape and beauty is built around it, which is not the
  same as making it plain. Recorded in the brief as a table because it is a
  per-surface contract that Phase 2 will be held to.
- **The failure mode this creates for 1.3, named now:** a direction that
  sings on the landing hero and dies on the dashboard Today screen has failed
  half the test, and it is the easiest failure to mistake for success,
  because the landing hero is what gets looked at first.
- **B6b: curated colours, and smaller than proposed.** "A few or a couple" —
  narrower than my eight-to-twelve; read as roughly four to six, settled once
  a direction exists. Free-form picking is gone.
- **The big one — retinting is now confined to customer-facing surfaces.**
  Unprompted, the owner said the detailer "probably doesn't really care about
  the admin dashboard colour scheme"; the accent is about what their
  customers see. **So the dashboard gets one fixed house palette and does not
  have to survive retinting at all.** `docs/design-knowledge.md` §4 called
  per-tenant retinting the hardest visual problem here and the highest-risk
  code, precisely because failures stay invisible until a specific customer
  signs up. This removes it from the largest and most token-dense surface and
  reduces it to a handful of known colours on two screen types — small enough
  to test exhaustively rather than hope about. Biggest single constraint
  lifted in the whole brief. Flagged as an assumption in the brief rather
  than treated as settled: if the dashboard is meant to carry a light touch
  of tenant colour after all, that must be said before 2.3.
- **Anti-reference recorded: Kōpiko**, an artisan bakery subscription page.
  Pasted as an image, not saved to disk (checked — the paste is not written
  anywhere findable), so it is recorded by a detailed description of what is
  actually on the page: one enormous cream wordmark as the entire hero, flat
  dark-brown ground, two colours total, the buying form as a small editorial
  order form, numbered steps, and no middle of the type hierarchy. **The
  owner gave no reason** — "i dont like this one" — so those traits are
  recorded as observations and explicitly must not be quoted back as their
  objection. Valuable because it sits close to a boutique/editorial direction
  we might otherwise have proposed, and shares the huge-display-type move.
- **Owner idea parked in the roadmap under Phase 3**, not started: a reusable
  instruction set / agent for building tenant websites, dashboard-wired and
  customisable per client. They deferred it themselves. Filed against 3.1
  rather than as its own item, since it cannot be specified before the tenant
  pages and settings are.

## Phase 1 — reference analysis (2026-08-29)

Seven sites, twenty screenshots looked at one by one, seven codebases fetched
and read. Written to `docs/references/`: `TASTE-NOTES.md` (the owner's verbatim
words, pasted in chat and put on disk because they were the only record of how
the pages MOVE), `ANALYSIS.md` (per-site, 1,669 lines), `DESIGN-BRIEF.md` (the
ranked conclusions). No app code was touched and nothing was implemented.

Method notes worth keeping:

- **Screenshots are not where the brief said they were.** They are flat in
  `screenshots/` with timestamp filenames, not `docs/references/<domain>/`. The
  site mapping was established by looking at all twenty in order and is the
  table at the top of `ANALYSIS.md`. They are cited by filename throughout.
  **Left untracked deliberately — 21 MB of other people's sites in a PUBLIC
  repo is a one-way door.** Owner decision below.
- **Two greps would have produced wrong answers and are recorded as such.**
  `framer-motion` returns zero on finseo because the package renamed to
  `motion`; it is identifiable only by internals like `motionComponentSymbol`.
  And riangle's smooth scroll is not Lenis, which a library-name grep would
  have implied — it is GSAP's paid ScrollSmoother.
- **One thing was not found and is recorded as not found:** riangle's
  cursor-following triangle. Three.js is confirmed present and draws it, but
  the pointer→rotation code could not be isolated in the minified bundle —
  every `lerp` hit resolved to Three's own `Vector2.lerp`, every pointer event
  to GSAP's Observer. No implementation was guessed.

Findings that change what we build:

- **The owner praised the typeface on riangle and sharplink independently,
  and both set Archivo.** He did not know they matched. That is the strongest
  convergent signal in the exercise and Archivo goes into 1.3 as the working
  display face.
- **His #1 stated preference is contradicted by his own choices.** subscrr
  built smooth scroll, shipped it, and turned it off behind
  `const SMOOTH_SCROLL = false` with a comment saying native is faster and less
  viscous; finseo never had it; he called both good. riangle gates it behind
  `(pointer: fine)` so it never runs on a phone. `DESIGN-BRIEF.md` recommends
  dropping it as a priority and settling it empirically at the end, because it
  is a question about feel that cannot be answered from evidence alone.
- **His one hard no now has a number.** momentolegal pins for `end: "+=1830%"`
  — 18.3 viewport heights — to pan one horizontal list. sharplink pins for 1.5
  and assembles an entire section. webtactics' rail is 5 viewport heights of
  plain CSS `position: sticky`. That bracket produces a testable rule for the
  new design system: a pin declares its length and must deliver a section's
  worth of content; ceiling 2 viewport heights, or 5 for a rail; never capture
  vertical touch.
- **Scroll weight was never the problem.** webtactics has the heaviest smooth
  scroll of all seven (`lerp: 0.065`, `wheelMultiplier: 0.75`, and it runs on
  touch) and he loved it. Pin length is the variable, not viscosity.
- **Two engineering patterns outrank every visual idea here.** riangle's
  device tier (`poster`/`still`/`full` from WebGL2, `saveData`, `deviceMemory`,
  `hardwareConcurrency`, plus a runtime FPS governor) is a shipped answer to
  our mid-range Android constraint in about fifteen lines. webtactics'
  `.wt-lite` class gives every entrance animation a CSS end state, so "all
  motion off" is one class on `<html>` rather than a code path. The
  counter-example is in the same set: gustavobatista switches its hero off by
  user-agent sniff for Samsung Internet, the default browser on Samsung
  Androids — our audience.
- **The texture he asked for is not on the site he found it on.**
  gustavobatista's grain is a Three.js particle-and-fog scene and it uses
  `mix-blend-mode` zero times. What he described is a tiling noise PNG or SVG
  turbulence at low opacity with a blend mode — a few kilobytes, no JS. It is
  ranked #2 precisely because no reference does it.
- **The central conflict is named rather than averaged.** He named Apple as
  his confident anchor in B2 and reacted most strongly to webtactics here.
  Those are opposite aesthetics — four effects versus twenty-four, and a 5–10×
  cost difference. `DESIGN-BRIEF.md` refuses to split it and instead requires
  1.3 to build both, with the quiet one carrying one extraordinary detail and
  the dense one shown EMPTY, because that is where density fails.

**OPEN — owner decision: commit the screenshots or not.** They are the evidence
`ANALYSIS.md` cites by filename, they are 21 MB, and the repo is public. Once
committed they are in the history permanently. Recommendation: leave them out
and keep a local copy; the analysis quotes what matters and the sites are all
still live. Nothing depends on the answer.

## Four threads from the owner before clearing (2026-08-29)

### 1. The Apple framing was wrong, and the correction is load-bearing

`DESIGN-BRIEF.md` had posed Apple (restrained) against webtactics (maximal) and
asked the owner to choose. He rejected the axis: "Apple does have some really
cool scrolling effects, especially when they release new products… there's some
middle ground that we could find. I don't want super plain." And on webtactics:
"I know that was completely overdone… I just really enjoyed that website, and I
still wanted some characteristics from it."

He is right. Apple's product-launch pages are among the most scroll-
choreographed on the web — scrubbed sequences, pinned assembly. What they are
restrained in is **decoration**, not motion. So the axis is not quiet-vs-loud,
it is **where the expressiveness is spent**: Apple spends all of it on the
product; webtactics spends it on the studio's own skill, across two dozen
effects. The middle ground he is describing has a name — **maximum
choreography, minimum decoration** — and Conflict 1 was rewritten around it.

**The idea this produces, which is the best to come out of the whole
exercise:** a car is a product too. A hero that scrubs a car from filthy to
finished as the visitor scrolls is Apple's technique aimed at the thing our
customers actually buy, it is footage a detailer already generates every
working day, and no generator produces it by accident — which is the
"it looked AI-made" complaint answered directly.

Two consequences recorded rather than assumed: the pinned hero moves from
"dropped on cost" to "budgeted, because it is the centre of the design", still
bound by the pin discipline the analysis derived; and scroll-scrubbed video
needs an isolated feasibility test on a throttled CPU before anything depends
on it, since it usually needs an image sequence rather than a video element.

**Flagged honestly: Apple's pages have NOT been read at the code level**, unlike
the seven references. The reframe is reasoned from his description and from what
those pages visibly do. Reading one properly is now the first task of 1.3.

### 2. Imagery — the Unsplash connector works, and the owner is a resource

He mentioned the connector and added: "I don't want you to be limited to what
you have. Obviously, I'm a person that could go online and do whatever."

Verified rather than assumed: `search_photos` for "car detailing" returns 4,832
results including real photos of cars being washed. Recorded as a standing rule
in `CLAUDE.md` alongside the existing never-a-grey-box rule, with the part that
matters — **ask him** when the connector cannot find the right shot. His offer
is more valuable than the connector and would otherwise be forgotten at the next
clear.

### 3. The tenant-site build kit is now a real roadmap item (3.4)

Previously a parked note. He described it properly: open an agent pointed at
this repo and have it already carry the reference research and why each site was
liked, the anti-slop floor, the finished design system, and the landing page as
the worked example — with the platform's own landing page as the DEFAULT that
tenant sites inherit, and per-client instructions layered on top.

Three constraints follow from things already decided, and are written into the
item: it is a **markdown brief in the repo**, not a skill or agent definition,
because of the portability rule below; it carries no client content, since 3.2
requires tenant sites to be built from configuration; and it cannot be written
before 1.5, because the design system it must encode does not exist yet.

### 4. Portability — the migration is close to free today, and the rule is to keep it that way

He expects to move to OpenAI's coding agent in roughly a month.

Audited rather than speculated about. **The only tool-specific file in the
entire repo is `.claude/settings.json`**, which contains nothing but a
permissions allowlist and is trivially replaceable. Every durable decision —
all 20-plus knowledge files including `CLAUDE.md`, `DECISIONS.md`,
`PROJECT-STATE.md`, the roadmap and everything in `docs/` — is plain markdown
that any coding agent can read. The only naming friction is that OpenAI's agent
looks for `AGENTS.md` where Claude looks for `CLAUDE.md`; that is a copy or a
symlink on the day, not a project.

So the migration is not a task to plan, it is a property to preserve. Written
into `CLAUDE.md` as a standing rule: nothing that matters may live in a
tool-specific mechanism — no skills, no hooks, no assistant-side memory. This
also retroactively justifies the habit already in force of writing every thread
to a file before clearing.

### The build-kit question the owner asked, actually answered (2026-08-29)

He asked whether his "open an agent and have it build a client's website" idea
had been answered. It had been *filed* (roadmap 3.4) and not answered — filing
is not answering, and the item hid a fork that the roadmap currently straddles.

**The fork:** 3.2 says tenant sites are built "entirely from tenant
configuration — zero hardcoded content", i.e. one shared codebase filled with
each client's data. His description is an agent that *builds a website* per
client, i.e. a separate site each time. Those are different products with
different economics, and only one of them scales for a solo operator:

- Shared system + theme: one codebase, improvements reach every client at once,
  near-zero cost per client after the first. Ceiling is that every site shares
  its bones.
- Bespoke per client: unlimited freedom, but every site is its own thing to
  host, update and fix forever, and nothing propagates. Ten clients is ten
  codebases maintained by one person.

**Recommendation recorded in 3.4:** the kit's default output is a **theme plus
settings for the shared system**; bespoke code is the priced exception, sold
through the website-package tier that 3.3 already assumes. The retint work, the
curated four-to-six palette and the alternating-ground system give real visual
range without forking the codebase — which is exactly why those rank where they
do in `docs/references/DESIGN-BRIEF.md`.

Not asked as a blocking question: it changes 3.1's plan and what 3.2 must
expose as settings, and neither starts for a long time. Flagged in the roadmap
at the point where it will actually bite.

### Screenshots: owner decided (2026-08-29)

Do not commit them. `screenshots/` added to `.gitignore` rather than merely
left untracked, because sessions here routinely use `git add -A` and one of
them would eventually have swept 21 MB into a public repo's permanent history.
The comment in `.gitignore` records why. Closes the open item above.

## Phase 1.3 — four directions (2026-08-29)

### Apple was read at the code level first, and it changed the plan

The roadmap made this the mandatory first task of 1.3 and it earned its place.
Eight product pages read, the iPhone 17 Pro page in full, assets probed by byte
range. Written up in `docs/references/APPLE-READ.md`. Three findings changed
what got built:

- **Apple's dominant technique is play-on-approach, not scroll-scrubbing.**
  Play-on-approach: 8 of 8 pages. Scrub: 3 of 8, once or twice each, and
  absent entirely from the flagship iPhone 17 Pro page. `DESIGN-BRIEF.md`
  Conflict 1 assumed the reverse. So the scrub was demoted from "the
  direction" to "one budgeted sequence in one direction", and the cheap
  technique got used in two.
- **Apple's scrub is never pinned and is never the hero.** Progress maps onto
  ordinary scroll. That dissolves Conflict 3 ("a hero that transforms" versus
  "scrolling that doesn't take you anywhere") — they are not the same
  mechanism after all.
- **Apple does no device tiering whatsoever** — zero `saveData`,
  `deviceMemory`, `hardwareConcurrency`, `effectiveType`. Their whole
  degradation strategy is a per-element load timeout plus a designed still
  frame. This directly contradicts `DESIGN-BRIEF.md`'s recommendation to adopt
  riangle's tier system. Not settled here; recorded for 1.5, with the
  recommendation being Apple's approach plus riangle's fps governor only.

### Four, not five

Five variations on one idea would reproduce the exact complaint that started
the redesign (`design-brief.md` B3: it read as machine-made). Four with
genuinely separate arguments beat five with overlapping ones, and the roadmap
allows three to five. One skill each for three of them, per the roadmap's own
rule; the fourth is built from the Apple read rather than a skill, because at
that point the evidence had more to say than another skill would.

### The empty state is in all four, not one

The prompt asked for any dense direction to be shown empty. All four are,
because all four are photograph-dependent to some degree and the brief calls
the empty state the real product. Direction 2 goes further and makes the empty
case its hero.

### Direction 4 pins, and says so on screen

`APPLE-READ.md` proves Apple does not pin its scrubs. Direction 4 does, because
the owner's lead idea is specifically a *hero* that transforms, and at scroll 0
there is no approach to map progress onto. Rather than hide that, it follows
the `DESIGN-BRIEF.md` pin rule: it declares its length in the hero itself
("held for 1.4 screens"), stays under the 2-screen ceiling, delivers a whole
beat inside the hold, and sets `touch-action: pan-y`. An earlier draft printed
"nothing is pinned", which was simply false; the claim was corrected, not the
build.

### A glow was cut from direction 1 on its own argument

The design hook flagged a jade glow on the seam as the AI-default "cool" look.
It was right, and more to the point it contradicted direction 1's own claim to
a near-zero decoration budget. All four glows removed; the seam is a hard edge.

### Orange stayed out

`design-brief.md` records the owner ruling out orange on subscrr. A sodium-
amber accent was drafted for direction 1 and dropped for that reason. Direction
3's butter yellow is deliberately a yellow, not an orange; if it reads as
orange to the owner, that is a reason to reject direction 3 and worth saying.

### The design hook's font findings were taken, not argued with (2026-08-29)

Fraunces (direction 3) and Instrument Sans (direction 2) were flagged as faces
each new wave of AI-generated interfaces converges on. On this project that is
pass/fail rather than advisory — `design-brief.md` B3 records that the *only*
thing wrong with the old look was that it read as machine-made — so both were
replaced. Fraunces → **Petrona**, which carries a true 100–900 axis and so made
the headline's weight extreme stronger, not weaker; Instrument Sans →
**Familjen Grotesk**.

Two more findings from the same pass, both fixed rather than suppressed:

- **All four directions animated `padding` or `margin` on hover**, several via a
  bare `transition: .18s ease` that silently means `all`. Those are layout
  properties and they re-flow the page every frame, on the mid-range Android
  this product's audience actually holds. Every transition now names its
  properties and moves `transform` instead.
- **Direction 3's ground was a radial colour wash**, which is the glowing-shadow
  tell drawn as a gradient. It is now a linear light-fall at identical hue and
  chroma with only lightness moving.

**Nothing was added to the repo to silence the checker.** An `ignore-value`
entry would have created `.impeccable/config.json`, and `CLAUDE.md`'s
portability rule says the only tool-specific file in this repo is
`.claude/settings.json`. Fixing kept that true.

## Roadmap 1.3, the rebuild — direction 5, "The Thread" (2026-08-29)

### Split stage was demoted from the page's grammar to a two-section beat

`BUILD-BRIEF.md` §2 chose split stage — two columns held in tension for the
whole page. The owner's answer killed it: *"throughout the entire website no
one scroll area, one page looked the same — as you scroll everything morphs
into different layouts and different stuff, and that's what I liked about it,
so use that."* Two columns top to bottom is one layout repeated, which is the
opposite of that. He also capped the comparison himself at *"only like a couple
sections"*.

He did NOT reject the comparison — the risk flagged in §2 ("there is a real
chance he reads it as before/after again") resolved as: he reads it as
before/after, and he is fine with that for about two sections. So the grammar
is what §1 Q7 had already derived from his two favourite sites — one continuous
ground, every section a different structure over it — and the split is two of
those structures. Written up in `BUILD-BRIEF.md` §7, which overrides §2 of the
same file.

### No third-party JavaScript at all, which is how the GSAP licence question closed

`ANALYSIS.md` left an open question: ScrollSmoother and SplitText are GSAP Club
plugins and must not ship unaudited in a product we sell. Rather than read the
licence, the page ships none of it — no GSAP, no ScrollTrigger, no
ScrollSmoother, no SplitText, no Lenis, no Three.js. The weighted scroll is
~30 lines, the line mask is CSS `clip-path`, the sticky rail is
`position: sticky` the way webtactics does it. All the script on the page is
smaller than Lenis alone. Nothing to license, nothing to audit, and one fewer
thing for the next agent to inherit.

The weighted scroll moves the REAL scroll position rather than translating a
wrapper. That matters here specifically: two sections are built on
`position: sticky`, and a translated wrapper breaks sticky.

### Archivo, on the strongest single piece of evidence in the reference set

The owner said "I like the font" about riangle.com and "font is also good"
about sharplink.com, independently, not knowing both set **Archivo**
(`ANALYSIS.md` §2). It carries wdth 62–125 and wght 100–900 in one family,
which is the weight-and-width extreme `design-knowledge.md` §1 asks for.
JetBrains Mono carries every figure — riangle's mono-numerals-as-a-system idea,
which suits a product full of prices, times and counts. Their nav numbering was
NOT copied: four links are not a sequence.

### Near-monochrome with one green, and the reasoning is by elimination

Direction 4 was *"the one that I like visually the most"* and had no brand
colour at all, so the ground is near-black graphite with bone as the dominant.
The single accent is a signal green: orange was ruled out by name on subscrr,
and he flagged his own lean toward blue as *"kind of typical AI"*. Green is
also semantically true here — it marks confirmed and money, nothing else. The
neutral ramp is biased cool so a pure mid-grey never appears.

**`ui-ux-pro-max`'s palette and type output stay rejected**, as disclosed in
`BUILD-BRIEF.md` §5: it returned a light "calendar blue + available green"
system with Fira Code / Fira Sans, and Outfit / Inter / Roboto from its
typography domain. Those are the on-distribution answers this project bans.
What was taken is its structural guidance, not its taste.

### The always-on animation is a requirement, not a flourish

The owner raised it unprompted and it was not in any brief: *"I don't want it
to look like a static page, and also I want some consistent animation, an
animation that's constantly looping itself."* Two loops ship — the rotating
tail on the headline (webtactics' mechanic, values quoted from its source) and
a slow light on the ground.

The risk is real and worth naming: an always-running animation is the fastest
way to make a page feel cheap. The constraints that keep it from being that —
both loops are slow, neither sits under body copy, and both stop dead under
`prefers-reduced-motion`, per webtactics' own comment that a looping `<h1>` is
the single most disruptive thing on a page for that visitor.

### Deposits: verified rather than assumed

`VERDICT.md` said to remove every mention and to confirm what the engine
actually does. `grep -rni deposit` over `app/src` and `supabase` returns zero
matches — the booking engine has no deposit concept at all. Not a copy problem;
there is nothing to reconcile in Phase 2 either.

### A static file cannot know the founding count, so it does not pretend to

The live landing page reads the founding-spot count from the database and fails
CLOSED, so a spot already taken is never advertised. A standalone direction file
has no database. Inventing "3 of 10 left" would be an invented statistic, which
is on the never-defaults list, so direction 5 shows standard pricing only and
says why in a code comment.

### The rail's scroll cost is derived, not chosen

Written first at a fixed 260vh, the horizontal rail cost 2.6 screens of scroll
at 1440 and moved the track **34 pixels** — a reproduction of the owner's one
stated hard no (*"a lot of scrolling that doesn't really take you anywhere"*).
The fix was not a better guess: the wrapper's height is computed from the
track's actual travel, so the exchange rate holds at every viewport instead of
being correct only at the width it was eyeballed on. Same principle applied to
the collapse at the end of the pinned section — the dashboard moves into the
space the thread vacates, measured in script, so no scroll is ever spent on a
half-empty screen.

### The `.in` class collided with itself

The reveal state class and the layout classes `.strip .in` / `.band .in` were
the same string, so an element became a two-column grid the moment it revealed.
Found by looking, not by reading. The layout class is now `.duo`. Worth
recording as a rule for whoever builds this for real: **a state class and a
layout class must never share a name**, because the bug only appears after the
animation runs and never in the markup.

### Round two and three: what his review changed (2026-08-29)

He reviewed the built page — "so much better" — and then tested it on an
iPhone. Five corrections plus two mobile bugs. The reasoning worth keeping:

**A blanket reveal failsafe was deleting the animation it was meant to
protect.** He said elements below the fold "aren't just kinda there, it kind of
animates in" — they were not animating at all. A 4-second timer revealed every
element on the page whether or not it had been reached, so four seconds after
load the whole document was in its end state. The IntersectionObserver AND the
failsafe are both gone, replaced by one pending list checked in the scroll
frame that already runs: an element reveals when its top crosses 82% of the
screen and at no other time, and because it is a comparison rather than an
event it cannot be skipped by fast scrolling or an anchor jump. **General rule:
a safety net that fires on a timer will eventually fire during normal use. Make
the net a property of the same check that does the work, not a race against
it.**

**The scroll weight had two knobs and he was describing both.** "It slowed down
slower... if you scroll it kinda went down a little more" is distance per
gesture AND length of tail. Distance 1.0 → 1.22; lerp 0.11 → 0.055 (webtactics'
territory, and webtactics is the site he liked most). The floor is real:
`ANALYSIS.md` records gustavobatista's `scrub: 2` as "detached from the input".

**The pin was the wrong mechanism for a phone, and the fix was to drop it
rather than patch it.** He reported the pinned section "just doesn't work on
iPhone. It glitches out." The two iOS Safari failure classes were both present:
a sticky element sized in viewport units, and scroll progress measured against
a viewport height that changes as the URL bar hides and returns — which also
fired `resize` on nearly every gesture, re-measuring the flight paths
mid-flight. The phone now does not pin at all; progress comes from the block's
own pass through the viewport, which is riangle's `SCRUB_TRIGGER` and which
`ANALYSIS.md` already called the safe form (`pin:!0` appears zero times in that
site's code). Supporting changes: `svh` for any surviving viewport unit, resize
gated on WIDTH only, an `orientationchange` branch.

**This is disclosed as unverified.** There is no iPhone here. Removing sticky
and viewport-unit arithmetic removes the known failure classes and the
replacement is the mechanism his own favourite site uses — but that is
reasoning, not observation, and `CLAUDE.md` says report what was observed.

**Hover-only states are a piece of the design half the audience cannot see.**
His fix, and it is the right one: on a device that cannot hover, the row
nearest the middle of the screen lights itself as you scroll. Gated on
`!(hover: hover)` so a desktop keeps hover and the two never fight. Worth
generalising in 1.5: **any hover treatment needs a scroll-position equivalent,
or it does not exist on a phone.**

**The founding offer is real data, not a mockup number.** `founding_total
integer not null default 3` in migration `20260828001000` matches his "first
three people get $499", so "3 of 3 left" is the true launch state. The live
page reads the remaining count from the database and fails CLOSED; a static
file has no database, which is why it states the starting figure rather than an
invented midpoint.

**Copy is provisional by agreement.** "I think in the future we'll kind of
critique the actual text on the page. For now, this is a good layout." Recorded
so nobody treats the current wording as approved — it is mostly carried from
`app/src/landing/LandingPage.jsx` and only "Stop booking jobs in your DMs" has
his explicit approval.

### Round four: reversible reveals, and the rule that makes them safe (2026-08-29)

He asked for entrance animations to replay when you scroll back down, and
then raised the objection to his own request before I could: someone landing
halfway down the page must not find text missing because they never scrolled
past it.

**One rule satisfies both, and it is the only thing consulted: an element is
hidden only while its top is still below 82% of the screen height.** Not
whether it has ever been seen, not scroll direction, not a "played" flag. Every
element at or above that line is in its end state, including everything
scrolled off the top — so a reload, a `#hash` link or a restored scroll
position all render correctly by construction rather than by a fallback.

That is the general principle worth keeping: **a reveal system that stores
"has this been shown" has to be rescued when the assumption breaks; one that
derives visibility from position alone has nothing to rescue.** The earlier
version stored it and needed a 4-second blanket timer as the rescue — which
then broke the animation instead (see round two).

Positions are cached at measure time, not read per frame. 42 elements ×
`getBoundingClientRect` per scroll frame is a layout read the mid-range Android
target does not need to pay. `sizeRail()` runs before the cache, because it
sets a wrapper height that moves everything below it.

### When a layout stops pinning, delete the scroll height with it

The mobile blank space he reported was `#threadWrap` at 2,363px around a 984px
section — 1,379px of nothing, about 1.6 phone screens. Cause: a
`.thread-wrap{height:280vh}` left at the end of the mobile media block from the
version that still pinned on phones, sitting after the `height:auto` that was
meant to replace it.

**A pin is two things — the sticky element and the tall wrapper that pays for
it.** Removing the first and leaving the second leaves an empty room behind,
and it is invisible in the diff because both lines look deliberate. Worth a
check in 1.5 when this is rebuilt for real.

### A caption is not an explanation

He read the `$520` section and asked "what is that actually about? I don't get
that section" — and misread "before 6 am" as "six PM", which is its own
evidence. The copy was *"Demo Saturday, before 6 am / Nothing was retyped"*: a
caption for someone who already knew what they were looking at, answering a
question the page had never asked.

Rewritten to name the figure in its first line and point back at the thread the
four jobs came from. The sample-data label the honesty rule requires survives,
but as a quiet mono line rather than as the section's headline — labelling
something as a demo is not the same as explaining what it is.

**This is the first concrete instance of the copy pass he has already
scheduled** ("in the future we'll critique the actual text on the page"), and
it suggests the right test for that pass: every section has to answer "what am
I looking at" before it answers anything else.

## Ease the beat, not the hold (2026-08-29)

A scroll-pinned section that plays several beats has two separate timing
questions, and collapsing them into one is a trap worth naming.

- **How the beats are DISTRIBUTED across the hold** — this must be linear.
  Each beat gets an equal share of the scroll.
- **How each beat PLAYS** — this is where the easing goes.

The first attempt at pacing the thread eased the whole hold with a strong
ease-in-out and then carved each message out of the eased value. A strong
ease-in-out is nearly flat at both ends, so everything between its ends
happens at once: measured, four messages landed 0.10–0.18 of a screen apart
inside a three-screen hold, with about a screen of dead air at either end.
That is worse than the problem it was meant to fix.

**Rule: distribute linearly, ease individually.**

Related, from the same round and from the `animate` skill's own table: a
message leaving while a row arrives is an **exit and an entrance**, which
takes an ease-out — not the ease-in-out that "movement on screen" suggests.
The rail's pan is the other case: constant motion, which takes **linear**, and
gets its gentleness from the stillness budgeted at each end of the hold rather
than from a curve.

### And a locked section needs the page to get heavier

Weighted scrolling banks a whole gesture and eases toward it, so one trackpad
flick can bank more than an entire pinned beat and deliver the user to the far
side having seen none of it. Measured: a 2,880px flick cleared all four
messages.

Two mechanisms fixed it, and both are needed:

- inside a pinned range, a wheel notch carries **half** as far;
- the smoothing may not run more than **0.55 of a screen** ahead of the real
  position.

The range starts a third of a screen BEFORE the pin, so you decelerate into
the lock rather than arriving at full speed. After: the same flick moves 1.30
screens and clears one message of four.

**This only helps a desktop.** The weighted scroll is fine-pointer only, and
native touch momentum cannot be capped without hijacking the gesture, which
would be worse. On a phone the defence is pacing alone — which is why the
holds are budgeted in screens rather than pixels.

## Never measure a transformed element with getBoundingClientRect (2026-08-29)

A rail step carries `transform:scale(.95 + .05 * var(--near))` so the one in
the middle grows. The pan distance was computed from
`steps[0].getBoundingClientRect().width`, which returns the **transformed**
box — so an inactive step measured 1012px instead of its real 1064, every
step-advance came out 5% short, and the error compounded: step two landed 50px
right of centre, step three 104px.

`offsetLeft` and `offsetWidth` are layout values and no transform touches
them. The pitch is now `steps[1].offsetLeft - steps[0].offsetLeft`, which is
also immune to however `gap` happens to resolve.

**The rule: if an element can be transformed, do not measure it with a method
that includes the transform.** This page animates by transform almost
exclusively, so the trap is everywhere in it — the bubbles, the rows, the
steps, the floating cards. Anything that measures one of them for layout
purposes wants `offsetLeft` / `offsetWidth`, not a bounding rect.

The one deliberate exception: the message-to-row flight distances DO use
bounding rects, and correctly — they need where things are on screen right
now, not where the layout says they belong.

## Test at HIS screen size, not yours (2026-08-29)

A process lesson worth more than the fix it came from.

The horizontal rail had a step width capped at 560px. On a 1920 monitor —
which is what the owner uses — three steps plus their gaps came to exactly one
screen, so the section had **40 pixels** of travel and pinned for 0.04 of a
screen. It had been like that since the day it was built.

Every check run against it had used 1440, 768 and 392, because those are the
three viewports `CLAUDE.md` names. At 1440 the fault was present but mild
enough to look intentional (396px of travel), and at 392 it looked fine. **The
one width where it was obviously broken was the only width never tested, and
it is the width he actually looks at the page on.**

Two things follow, and both are general:

1. **The three named viewports are a floor, not a ceiling.** Add the owner's
   own screen to any check where the failure mode is "there is not enough
   content to fill the viewport" — those bugs get BETTER on small screens and
   worse on large ones, so a phone-first check will never find them.
2. **When he reports something, take the measurement at his conditions before
   forming a theory.** I diagnosed this as an iOS pinning fault twice and
   removed the pin on phones to fix it. The pin was never the problem. One
   measurement at 1920 would have shown it immediately.

Related and worth keeping: his report *"the page where it says one, two, and
three, and it kinda, like, stopped your scroll doesn't work anymore"* means
*the section that used to stop your scroll has stopped doing so* — a report
that a feature was MISSING. It was read as *the pinning is broken, remove it*,
and the pin was removed. **When a report is ambiguous between "X is broken" and
"X is gone", ask, or check whether X still happens at all before deleting X.**

## "Something feels a little missing" — the likely answer (2026-08-29)

He ended his round-eleven review with: *"Something feels a little missing, but
I think it's... I don't know. I think I'm kind of overthinking it."* He was not
overthinking it, and it is worth naming so it can be decided deliberately
rather than nagging at him.

**The page has no proof on it.** Not by accident — the marketing deck ruled it
out explicitly in its own header: "Not on this page: invented testimonials,
customer counts, logos, statistics, or a money-back guarantee." That is the
right call, because every one of those would have to be invented today; there
are no customers yet.

The page carried ONE piece of proof that did not have to be invented — the
owner's own story, "I detail cars, I built this for my own shop first" — and
that section was removed the same day, on his instruction. What survives is a
single line under the hero button.

So the shape of the answer is: **the page argues well and proves nothing.**
Every other section is a claim about what the product does. Nothing on it says
anyone has ever used it, because nobody has.

Three honest ways to close it when he wants to, in order of how soon they are
possible:

1. **His own business as the proof.** Andrew's Auto Detail runs on this. That
   is a real, checkable claim available today and it needs no customer — it is
   the section that was just cut, in some form.
2. **The demo business** (roadmap Phase 6) — a working site and dashboard a
   prospect can open and click, which is proof by demonstration rather than by
   assertion.
3. **Real testimonials** after Phase 5, when there are real tenants. Not
   available and not to be faked.

Recorded rather than acted on: he did not ask for a change, and option 1 means
reversing a decision he made hours earlier. Do not re-propose it unprompted —
raise it if he mentions the feeling again.

## Removing the owner section, and why its mechanic was not re-homed (2026-08-29)

He decided the fork: *"Remove the owner section."* Removed in full.

**The word-brightening mechanic went with it and was deliberately not moved
elsewhere.** This is the one place a standing rule of his and a design
principle point in opposite directions, so the reasoning is recorded rather
than left to be re-litigated:

- His rule says motion is not spendable, and a mechanic that has nowhere to
  live is a question for him rather than a silent deletion.
- But that rule exists to stop a page quietly flattening across a rewrite.
  The failure it guards against is losing motion by ACCIDENT. Re-homing a
  mechanic into a section that does not want it fails the same goal by a
  different route: an effect with no reason to be there is decoration, which
  `docs/design-knowledge.md` §1 names as a tell.
- Word-brightening suits a person talking, read at speaking pace. There is no
  first-person copy left on the page. The hero has a typewriter already; the
  closing line is eleven centred words.

So it was cut, and the count still went UP over the rewrite as a whole:
thirteen mechanics before the marketing deck, seventeen after. If he wants it
back, the honest way is to give it something to say, not somewhere to sit.

Recoverable in full from commit `6c6f412`, which is what matters if the
section becomes its own About page later. The claim it carried survives in
the hero's sub-line, so removing the section did not remove the
differentiator.

## His four instructions on the rewrite, and the one still open (2026-08-29)

- **The $520 section was removed** on his instruction. Its count-up mechanic
  survives on the pricing figures, so the motion inventory did not shrink.

- **All competitor pricing removed** — see the closed blocker below.

- **One table row is mine, not the deck's**: "A Facebook page". The table
  stopped being about what you PAY and became about what you're USING, and a
  Facebook page is what most of this audience is actually using — the FAQ's
  own first answer says so. Flagged rather than slipped in; one line to
  remove if he disagrees.

- **The owner section was reformatted, not moved.** He said he is *thinking*
  of removing it or giving it its own page, which is not a decision, so
  nothing was moved or deleted. What was done is the part he did decide —
  "reformatting it like an about me or about the owner type thing" — which
  is a signature block at the end, the thing that separates an about section
  from a sales section written in first person.

  **DECIDED SAME DAY: "Remove the owner section." It is gone.** He was given
  the fork and a recommendation against removing it; he chose removal, which
  is his call to make and is now the record. Do not re-propose it.

  The recommendation that was weighed, kept only as the reasoning: keep a
  SHORT version on the landing page and put the long one on an About page
  later. The reason is that "built by a detailer, for his own shop" is the
  single claim on this page no competitor can copy — a booking startup cannot
  say it — so removing it entirely spends the strongest differentiator to
  save one screen. But a full about section does belong on its own page, and
  a separate page is a Phase 3 shape anyway: this direction file is one page
  with no routing, so a second page is not something to invent here.

  Note that the photograph and the placeholder copy are blockers on that
  section wherever it ends up, so answering this does not remove them.

## Building the marketing rewrite: what was mine, and one pre-ship blocker (2026-08-29)

The copy is the owner's approved deck and is used verbatim. These are the
calls that were not in it.

- **The page grew from 9.47 screens to 12.72 at 1440.** "The page must not get
  longer" was his instruction twice during 1.4; the deck he has since approved
  adds three sections, and "whatever it comes back with, we have to adapt to
  it" is the later instruction. So the growth is sanctioned, not overlooked.
  Recorded because a later session reading only the 1.4 note would try to cut
  it back.

- **His motion rule was met by addition, not by preservation alone.** Thirteen
  mechanics went in and sixteen came out; skeletons went from eight to twelve
  and no two sections share one. The three new sections each got a mechanic of
  their own rather than inheriting one, because a new section carrying no
  motion is how a page quietly flattens across a rewrite even when nothing was
  explicitly deleted.

- **A second light ground was added, which the deck did not ask for.** With
  three sections appended to the back half, one light band left eight dark
  screens in a row. The comparison table takes it. Ground rhythm is structure,
  which his rule assigns to me; if he dislikes it, it is one property.

- **The FAQ uses `<details>`, not a hand-rolled accordion.** No JavaScript, no
  ARIA to get wrong, keyboard and screen-reader behaviour for free, and it
  works if every script on the page fails.

- **"Questions." as a heading is mine.** The deck gives that section an
  eyebrow and eight pairs and no title, and a section with no heading is a
  hole in the document outline. It is a label, not a claim.

- **The $520 strip was KEPT although the deck omits it.** See the roadmap and
  README; it is an open question for him, not a decision I took. Kept rather
  than cut because his rule is that a mechanic is not spent silently, and
  because it is the payoff of the section the deck marks "unchanged".

- **No photograph of the owner was invented.** The deck asks for one of him
  working. A stock photo of a stranger under a first-person paragraph naming
  his real business would be a picture of someone who is not him, presented as
  him, on a page selling that business. Nothing was substituted; the section
  ships as type until he supplies the image, and the two-column CSS is written
  and waiting.

### ~~⚠ PRE-SHIP BLOCKER: four competitor price ranges~~ — CLOSED SAME DAY
### by his instruction to remove them; kept below as the reasoning

**RESOLVED 2026-08-29.** He instructed: *"let's not like directly say
competitor pricing but just have it be like an our thing is an improvement
from all of these services."* Every competitor figure is off the page — the
table's cost column is gone and the pricing section's line was reworded. Our
own price stays, because that one is ours to state. Nothing left to verify.
The original entry follows because the reasoning is worth keeping: it is the
argument for why a competitor's price is a different KIND of claim from
everything else on a marketing page.

### ⚠ PRE-SHIP BLOCKER (now closed): four competitor price ranges are on the
### page and none of them are verified

Section 7's comparison table prints, from the deck: "Per lead, booked or not"
(Yelp, Thumbtack), "$70–$250 a month" (detailing software), "$2,000–$5,000,
then again for changes" (a site you paid for once). The pricing section
repeats the software range.

**This reverses an earlier decision in this same file.** During 1.4 the call
was recorded as "No competitor price is printed on the page — the $2,000–8,000
range is research, not a number this page can stand behind." The deck
overrides it, and the owner approved the deck, so it is built. But the deck
imposes its own condition and that condition is not yet met:

> "Verify all four price ranges against their own pricing pages before this
> ships. Understate rather than overstate."

Two of the four are not fixed prices at all — Yelp and Thumbtack sell leads at
auction — which is why that row states a MODEL rather than a figure, and that
is the safe form for it. The other two are checkable and have not been
checked.

**Nothing here may reach the real landing page until each row is verified
against the source's own pricing page.** This is a direction file, so the
claims are not public yet; roadmap 2.2 is where they become public, and 7.3 is
the final pass that must catch it if 2.2 does not. Printing a competitor's
price wrongly is the one claim on this page that a third party, rather than a
customer, would object to.

## The owner's review of the repointed page, and the rule it sets (2026-08-29)

He reviewed the 1.4 page on his iPhone and answered the three questions that
were put to him. All four items below are HIS decisions, not proposals.

### 1. The iPhone works. The 1.3 blocker is closed.

> "iPhone check everything looks good."

The pinned section was rebuilt in 1.3 so phones never pin, and that could not
be proved without an iPhone. It is proved. **Do not re-open it.** He added one
defect: *"there's still some slight little glitch when you scroll all the way
down to the bottom, but very minor."* Reproduced at 392x844 and fixed — see
`docs/design-directions/README.md` "Round seven".

### 2. Photography is approved, in principle and not only for the mock

> "I'm definitely not against it... a lot of the websites that I was really
> kinda referencing off of have tons of photos... it just needs to elevate
> the website."

So the page's no-photography rule was a **means, not an end**. VERDICT.md §3
banned car photography because the four rejected directions used it to sell
car detailing, and we sell software — that reasoning still holds for the
landing page's own subject. It never meant the product must be sold on type
alone. One photograph is now in the tenant-site mock, which is the place it is
unambiguously correct: photos of their own work are what a detailer's site is
made of. **Whether photography appears anywhere ELSE on the page is deferred
to the marketing rework in §4, not settled here** — that pass may move or
delete the sections it would go in.

### 3. The new hero is WORSE than the old one, in his judgment

> "it's a little bit worse than what I liked before. I kinda liked the...
> 'stop booking jobs in your DMs' or whatever, that would change through."

This is a straight conflict, and it should be recorded as one rather than
resolved quietly. Roadmap 1.4 REQUIRES the hero to lead with the website —
that requirement comes from his own positioning change, argued from the
market. His taste prefers the line the positioning displaced. Both are his.

**Nothing was reverted.** He did not ask for a revert; he asked to wait for
§4, which is the arbiter he chose. So "Your website is currently a Facebook
page." stands as PROVISIONAL. If the marketing pass does not resolve it, the
question to put to him is whether the old line can head the page while the
website still leads the offer — which is roughly what the current thread
section already does one screen lower.

### 4. THE STANDING RULE: the marketing research decides the words and the
### running order; it does not get to spend the motion

He is running the page's full text through a separate marketing AI and will
paste its recommendations back.

> "whatever it comes back with, we have to adapt to it."

and, in the same breath:

> "I don't want us to lose any of that cool animations and scrolling effects
> that we have. We just might have to change them up, you know, switch them,
> the order, maybe completely, you know, redo some of them."

**So the constraint on that rework is: copy and section order are the
marketing pass's to change, freely and including completely. The motion is
not spendable. Every mechanic on the page survives in some form — the
messages becoming the schedule, the weighted scroll, the reveals, the
horizontal rail, the light band, the always-on ground, the rotating tail.**
They may be re-pointed at different content, re-ordered, re-timed or rebuilt,
but the count must not go down because a new copy deck was easier to lay out
flat. If a recommended section genuinely has nowhere for a mechanic to live,
that is a question for him, not a silent deletion.

Two practical notes for whoever picks this up:

- The text he pasted into the marketing tool is every visible string on the
  page, in reading order. It can be regenerated at any time by walking the
  rendered DOM — it is not a file that has to be kept in sync.
- The mechanics are documented section by section at the top of
  `docs/design-directions/5-the-thread.html` and in README.md "Eight
  sections, eight skeletons". Read that BEFORE re-laying-out the page, so
  the rework knows what it is carrying.

## Building 1.4: the judgment calls made while repointing the page (2026-08-29)

The positioning itself is the section below this one. These are the calls made
while turning it into a page, recorded because none of them were spelled out in
the roadmap and a later session would otherwise have to re-decide them.

- **The hero names both halves by DIVIDING them between the headline and the
  object, not by cramming both into one sentence of display type.** The
  headline is the website ("Your website is currently a Facebook page."); the
  floating card beside it is, and always was, the dashboard's own job card; the
  lede states the pair explicitly. The roadmap's named trap was fixing the
  under-selling of the website by demoting the dashboard, and a headline that
  tried to carry both nouns would have subordinated one of them by word order
  alone. Splitting them across the two halves of the hero makes them equal by
  construction rather than by phrasing.

- **The rotating tail was kept and re-aimed rather than replaced.** It is a
  mechanic he named as liked. What rotates is now what a detailer has instead
  of a website, which is the gap the offer closes — the same device doing the
  new job.

- **The headline's type size is now derived from a measurement, not a taste
  call.** The new tails are longer than the old, and the old size overflowed
  the column at both ends of the range. The widths were measured at seven
  viewport widths before anything was changed, and the fix is split: the size
  clamp handles the desktop end, and the FONT'S WIDTH AXIS handles the phone
  end so the headline keeps its size there. Recorded because "make the text
  smaller" was the obvious move and it was the wrong one — a variable font has
  a second dial and this is exactly what it is for.

- **Section 5 was REPLACED, not extended.** He said twice that the page must
  not get longer. A phone-shaped booking widget became a browser window
  containing a website with the booking panel inside it; the window is
  landscape where the panel was portrait, so the section costs the same height.
  This is also why no "here is your website" section was ADDED — the page has
  the same eight sections it had.

- **No competitor price is printed on the page.** The reframed $900 sets the
  offer against "a template you fill in yourself" and "an agency that charges
  again every time a price changes", with no figure attached to the agency.
  The $2,000–8,000 range recorded in the positioning section is research we
  did, not a number this page can stand behind if a detailer challenges it.

- **The tenant-site mock carries NO photograph, and that is a question for the
  owner rather than a decision.** The page has no image on it anywhere, and
  CLAUDE.md bans grey placeholder boxes, so a photo-shaped hole was never an
  option; adding real stock photography would change a look he has already
  approved and was not on the 1.4 list. Not done unilaterally in either
  direction. The risk if it stays as it is: the page now leads with "we build
  you a website" and shows a website with no pictures, and pictures of their
  own work are what a detailer thinks a website IS.

- **A pre-existing bug was fixed at its root rather than patched at the
  symptom.** In the reduced-motion path the dashboard rendered "0 jobs · $0 ·
  nothing booked" above four fully visible job rows. Reproduced on the
  committed file before any 1.4 edit. The `setSummary(JOBS.length, TOTAL)`
  call that exists to prevent exactly this was being overwritten a moment
  later, because the scroll LISTENER is attached only when `!LITE` but
  `ready()` calls `onScroll()` once unconditionally — one scrub frame at
  progress 0. The fix skips the entire scrub loop in LITE rather than
  re-ordering the two calls, because every other scrub was also running once
  and writing values that `.lite` CSS then had to override.

- **"Start free" was removed from the nav because it was untrue.** There is no
  free tier. `tests/landing-pricing.test.mjs` already enforces "no unearned
  free-trial promise" — but it scans `app/src/landing/LandingPage.jsx`, and
  this is a static direction file, so nothing was watching it. Worth knowing
  for 1.5: the design tests being rewritten there cover the app, and the
  direction files are outside their reach.

- **Section 6's "no designer" was removed because it contradicted the pricing
  card.** The card now says the fee is what it costs to have the site built for
  you. Both claims cannot stand. The honest version is that the booking-only
  tier is self-serve and the website tier is built with them, which is what
  the lede now says.

## Positioning: what we sell is the pair (2026-08-29)

**Read the correction at the end of this section first — the owner amended the
framing the same day, and the amendment is the operative version.**

The owner asked me to do the marketing thinking rather than hand it back —
"I'm not a marketer, so actually I want you to do the thinking of what would
be best advertised." This is that, with the reasoning exposed so it can be
argued with.

### The observation he made, and why it is correct

> "At first I was like, I'm just gonna sell this booking engine. But I'm
> realizing there's already a lot of those out there. So my main advertisement
> should be a custom website."

He is right, and the reason is pricing power. Booking software is a commodity
category with free entrants — Square Appointments, Setmore, Calendly, Acuity,
Booksy. **Lead with booking and the buyer files us next to free.** $900 setup
plus $60 a month reads as expensive for "a booking tool" and cheap for "a
website built for me". Same product, same price, opposite reaction, decided
entirely by which noun goes first.

### Where the offer actually sits

A detailer who wants a website has three real options today:

| | What it costs | What it costs them |
|---|---|---|
| Wix / Squarespace | ~$20–30/mo | **They do the work**, and the result looks like they did |
| An agency or freelancer | $2,000–8,000 | Good result, slow, and every price change is an email and a wait |
| A Facebook page, a Yelp listing, nothing | free | It is what most of them have |

Our offer is in the gap: **an agency-quality outcome, none of the DIY labour,
and it stays editable afterwards.** That last clause is the part neither
alternative has — the DIY site is editable but bad, the agency site is good but
frozen.

### The ordering, and why

1. **The website.** Tangible, picturable, high perceived value. It is what
   they would have to spend thousands on otherwise.
2. **"Custom, not a template."** This one line decides which category the buyer
   mentally files us in. Without it we are compared to Wix and lose on price;
   with it we are compared to an agency and win on every axis. It has to be
   explicit, not implied.
3. **The dashboard is why it stays current** — not the headline. He was
   explicit: "don't make that the main point." It is the answer to the agency's
   weakness, so it belongs immediately after the custom-build claim and
   nowhere near the top.
4. **Booking**, as a feature of the site rather than the product.
5. **The terms** — no commission, your customers are yours, cancel any time.

### What this changes on the page, and what it must not

**Must change:** the hero leads with the website, not with booking; the section
currently titled "What your customers see" becomes the tenant website itself
rather than only the booking widget; one ruled row is added for editing from
the dashboard; and the $900 is reframed as *what it costs to have a site built
for you* rather than as a fee to get started.

**"Stop booking jobs in your DMs" survives**, but moves down to head the thread
section — which is literally what that section shows. It stops being the
promise and becomes the pain, which is the job it was always doing.

**Must not:** get longer (his instruction), make live-editing the headline (his
instruction), or add a feature list for a site that Phase 3 has not built yet.

### CORRECTION, same day: it is ONE build, not a website with extras

The owner amended the framing above, and this is the operative version:

> "The website with the admin dashboard is kind of the seller. Like, it's
> combined. It's not like, here's a custom website with you, also comes with
> the admin dashboard. No. So we're building this website and admin dashboard
> for you kinda thing. Obviously the admin dashboard's cookie cutter, but I
> don't want that to be lost."

The ordering above is right; the *grammar* was wrong. "A custom website — and
it comes with a dashboard" makes the dashboard an accessory, and he does not
want it demoted, even though it is the standardised half. **The sentence is
"we build you a website and the dashboard that runs it", as one purchase.**

Practically, on the page: the hero names both. The website is what makes the
offer uncommon and so it leads the sentence; the dashboard is in the same
sentence, not in a later section that reads as a bonus. Only the live-editing
*feature* stays out of the headline — that was his earlier instruction and it
still holds. Do not fix the under-selling of the website by creating the same
problem for the dashboard in the other direction.

### The honesty flag I raised, and why he was right to dismiss it

I flagged that the page sells a tenant website Phase 3 has not built, and that
the first customer's site would have to be hand-built. He answered:

> "We're not selling to customers until literally every single thing is
> completely finished. So that's not a flag. Phase 3, we will build it, and
> then the first customer site will be built by our bot."

He is right and the flag is withdrawn. There is no window in which the page
promises something that does not exist, because nothing is sold before Phase 3
ships — and the first client site is produced by the build kit (3.4), which is
the entire point of building the kit. Recorded because a later session reading
only the paragraph above would otherwise re-raise it.

Everything on the page is real today or will be before anything is sold: the
dashboard, the booking engine, the price, the founding count. Nothing invented
was added to support the new positioning and nothing should be.

## Cutting a section: measure what the length is made of first (2026-08-29)

The owner said the page was too long and chose "cut a section". The candidates
this repo had already written down — the comparison table, or folding the
questions — came from round fourteen's own closing note, which was written
without ever measuring what each section costs.

Measured (`offsetTop`/`offsetHeight`, screens, at 1920/1440/392): the two
LOCKED sections were **8.07 of the 14.44 screens at his monitor width — 56% of
the page**. Everything a reader reads came to 6.4 screens. The two named
candidates were 0.84 and 0.73 screens: cutting either buys **5%**, which he
would not have felt, and it would have spent a section for nothing.

The 01/02/03 rail was the outlier at **4.07 screens to advance three cards
sideways twice** — about 2 screens per beat, against the thread's 0.75 for
four messages. Most of that was fixed cost rather than earned: a full screen
of sticky stage plus 0.8 of budgeted stillness before any travel happens at
all. **A locked section's floor is ~1.8 screens whatever it contains**, which
is the number to check before adding another one.

**Rule: before cutting for length, measure every section's scroll cost at the
owner's own width. The advice in a previous round's write-up is not evidence.**
This is round twelve's lesson ("test at HIS screen size") reappearing as a
documentation problem rather than a CSS one — a stale note in a file is as
capable of sending a session the wrong way as a stale measurement is.

### Carrying the sentence, not just deleting the section

The rail's lede was doing two jobs, and both had to survive the cut: it
answered "is this going to be a project", and its second half is what stops
the pricing card ("we build it for you") contradicting section 4 — a
contradiction found and fixed in round six. It is now term 01 of the pricing
list. **When deleting a section, check what its copy is load-bearing FOR, not
just whether it reads well where it is.**

### What the cut bought beyond the screens

The rail's heading and lede were the only elements on the page revealed by a
pin rather than by approach, which forced an `inRailHead` exception into the
reveal sweep. With the section gone the page is uniformly reveal-driven with
no exceptions. A rule with no exceptions is worth more than the mechanic that
required one.

## Baseline a new check against the last known-good version (2026-08-29)

The reveal-sweep checker written for the cut reported 136 stranded elements,
which read as "the cut broke the reveals". It had not. Run against the
COMMITTED page — which round fourteen had verified as clean — the same checker
reported 110.

**A checker that fails a known-good version is measuring the wrong thing, and
that is cheaper to discover than to debug.** The fault was the definition: it
counted any element merely overlapping the viewport, when the page's own rule
is that an element arrives once its top crosses 82% of the screen. Everything
between 82% and the bottom edge is correctly still hidden.

**Rule: before believing a new measurement about a change, run it against the
version before the change.** Two numbers are diagnosable; one is not.

## The new design system, and what it deliberately leaves open (2026-08-30)

Roadmap 1.5. `docs/design-system.md` is now **"The Thread"**, replacing
"Raking Light". Three choices inside it are worth recording as choices rather
than as facts.

**The reference page outranks the document.** The file says plainly that
where `docs/design-system.md` and `docs/design-directions/5-the-thread.html`
disagree, the page is right and the document is stale. That is unusual — a
system file normally outranks an implementation — and it is deliberate: the
page is the artefact the owner reviewed and approved through fifteen rounds,
and the document is a description of it written afterwards. A description
that can overrule the thing it describes is how a system quietly stops
matching what shipped.

**The tests measure the reference page, not `app/src`.** `app/` has not been
restyled — that is the whole of Phase 2 — so a test asserting the new tokens
against `theme.css` would fail for months, and CLAUDE.md requires the four
credential-free tests to pass at the end of every session. A test suite that
is expected to fail is a test suite nobody reads. `design-contrast` therefore
reads `theme.css` **if it defines `--ink-0`** and the reference page
otherwise, so the switch happens by itself the moment Phase 2 lands the
tokens, with no edit. The outgoing palettes stay checked in the meantime,
because they are what actually ships today and a floor that stops being
enforced during a long migration fails silently.

**The device-tier question is closed, not deferred.** The roadmap parked it
for 1.5. The answer is Apple's, per `docs/references/APPLE-READ.md`: never
ask what the device is, ask whether the thing arrived. No `deviceMemory`, no
`hardwareConcurrency`, no user-agent tiering — guessing quality from hardware
buys less than a load timeout, and its failure mode is blacklisting a browser
by name. The defence is `.lite` (one code path, the same CSS the animation
targets), `prefers-reduced-motion` routed into it, and the rule that nothing
is ever hidden behind an animation. An fps governor is the one piece worth
borrowing from riangle later, when something measured drops frames — not now,
with no WebGL anywhere on the page.

**What it does NOT settle, and why that is not a gap.** Direction-inventing
is banned from 1.5 onward, so three things are named at the end of the file
instead of being decided by a session: whether a light theme exists at all,
which colours the tenant's curated four-to-six are, and the dashboard's own
section skeletons. The light theme is the interesting one — the evidence
points at dropping it (sunlight is not a constraint per `design-brief.md`
§B5, a second theme doubles every contrast check and every retint test, and
the identity is the dark ground), but a toggle exists today and removing it
is a visible takeaway. **Recommendation on the record: drop it, keep the
light band as the only light surface.** His call, and it is the first
question of Phase 2 rather than a blocker for 2.1.

## A skipped check reads exactly like a passing one (2026-08-30)

`tests/design-contrast.test.mjs` had five rows for the landing page, each
guarded by `if (Ld.i && Ld.bg)`. `landing.css` has never defined `--bg` or
`--panel` — it calls them `--g` and `--p` — so every one of those guards was
false and **all five rows silently did nothing.** The landing page has had no
contrast coverage at all for as long as the check has existed, and the suite
reported "all pairs pass" the whole time.

Found only because the rewrite made a skipped row print `skip (token
missing)` instead of vanishing. Corrected to the real token names: ten pairs
now, all passing — so it was a coverage hole rather than a live defect, which
is luck and not vindication.

**Rule: a check that cannot find its input must say so out loud.** Silently
skipping turns a hole into a green tick, and a green tick is worse than no
test because it stops anyone looking. Any guard of the form "only assert if
the value was found" needs an `else` that prints or fails.

## The owner's answers of 2026-08-30: 1.4 approved, no light theme

Three things closed in one message: *"changed the pin, i approve it for now
and yea no light theme needed."*

**1.4 is approved.** "For now" is his own qualifier and it is recorded as
written — the page is approved as the direction and the build, with copy
still provisional by prior agreement (the sections the marketing deck did not
touch have never been through him). Roadmap 1.4 is ticked; phase 1 is closed.

**The artifact's share pin is moved**, so the shared link now serves the
current page rather than a frozen earlier round. That had been silently
serving stale versions to him on his phone since round six.

**There is no light theme.** The dashboard's light/dark switch goes. The
reasoning was put to him and is on the record: sunlight is not a constraint
(`design-brief.md` §B5), a second theme doubles every contrast check and
every tenant-accent retint test for as long as the product exists, and the
identity is the dark ground. The cost — anyone who prefers a light UI loses
it — was stated before he answered.

**Nothing was ripped out today, and that is deliberate.** `app/` still ships
"Raking Light", where light mode works correctly. Deleting it before the new
dashboard exists would take a working feature away from a product that has
not yet gained its replacement, for no benefit — the saving is in *future*
work not done, not in code removed now. **The removal belongs to roadmap
2.3**, and the four places it touches are scoped in `docs/design-system.md`
so the session that does it does not have to rediscover them.

### The trap in this answer, and why it is not being treated as settled

His answer is about the DASHBOARD's toggle, because that is what he was
shown. **It does not decide the customer booking page**, which is a
separate surface and is deliberately light-first today:
`app/src/book/BookingBusinessContext.jsx` says *"a customer arriving from a
text message shouldn't inherit whatever theme the last dashboard user
picked"*, and `booking.css` grounds it on `--bk-bg: #E7E7E5`.

That comment is an argument about not inheriting a stranger's preference. It
survives whichever ground wins and it does not choose one. Reading "no light
theme" as "the booking page is now dark" would be **taking a decision he was
never asked**, on the single highest-traffic customer-facing screen in the
product — exactly the failure mode the "ask, do not infer" rule in this file
exists for. It is the first question of roadmap 2.1 and it is his.

## The customer booking page is dark (2026-08-30)

Asked separately from the dashboard toggle, because his "no light theme"
answer did not cover it and inferring it would have been taking a decision he
was never put. **His answer: dark, like everything else.**

The argument that decided it is the positioning rather than taste: the page
claims the booking form is built INTO the detailer's website, not a link off
to somewhere else — that containment is made as a shape in section 3 of the
reference page, not as a sentence. A light form sitting inside a dark site
breaks the claim on sight.

**What survives from the old light-first decision.** The comment in
`app/src/book/BookingBusinessContext.jsx` — *"a customer arriving from a text
message shouldn't inherit whatever theme the last dashboard user picked"* —
is still correct and still binding. It was never an argument for light; it is
an argument against inheriting a stranger's preference. The page keeps its
own fixed ground, independent of any dashboard state. Only the colour of that
ground changed. **Do not delete that comment while restyling; re-point it.**

**Revisit in Phase 3, and only then.** The third option offered and declined
for now was "follow the detailer's own site" — dark for a dark site, light
for a light one — which is the truest reading of "a custom website for every
detailer". It was declined because Phase 3 has not built any tenant sites, so
there is nothing to follow yet and it would be building a mechanism against
an imaginary input. When the first bespoke sites exist and one of them is
light, this is the decision to reopen.

### Consequence for 2.1

`app/src/book/booking.css` grounds on `--bk-bg: #E7E7E5` and mirrors the old
system under `--bk-*`. That mirror is now the new tokens, dark. The tenant
accent still passes through `app/src/lib/theme.js` — which stays the only
file computing colour in JS — but `brandVarsFor(..., "light")` at
`BookingBusinessContext.jsx` becomes the dark mode, and `THEME_BG` /
`DEFAULT_ACCENT` in `theme.js` collapse to single values along with the
dashboard toggle in 2.3. The contrast test's "outgoing: booking (light-first)"
block goes when the tokens do.

## Roadmap 2.1 — the booking page restyled, and what it cost (2026-08-30)

The first surface in `app/` to actually carry "The Thread". Files touched:
`app/src/book/booking.css` (rewritten), `BookingPage.jsx`, `StepWhen.jsx`,
`StepReview.jsx`, `BookingConfirmed.jsx`, `ManageBookingPage.jsx`,
`BookingBusinessContext.jsx`, `app/src/lib/theme.js`, `app/index.html`, and
the booking block of `tests/design-contrast.test.mjs`.

The light-first comment in `BookingBusinessContext.jsx` was **re-pointed, not
deleted**, as the decision above requires: the page still carries its own
fixed ground independent of dashboard state — only the colour changed.

### The accent had to split in two, and this is a system-level rule

`brandVarsFor` now returns **`--bk-accent-text` as well as `--bk-accent`**,
and the stylesheet says plainly: never use `--bk-accent` on words.

The reason is measured, not stylistic. `correctAccent` clears the **3:1**
non-text floor, which is right for a button fill, a selected day or a ring.
But this page also sets the running total, the "PROMO applied" line and the
phone link IN the accent, and small text takes **4.5:1**. Crimson `#DC2626` —
a real entry in `PRESET_COLORS` and the live accent of `demo-riverside` —
measures **3.27:1** on `--ink-0`: it passes as a fill and fails as type. The
text variant runs the same correction at the 4.5 floor and comes back
`#E04040` (4.62:1) for that tenant, and is identical to the fill for accents
with headroom.

The dashboard already had this distinction (`accentTextFor` → `--accent-text`)
and the booking page simply never used it. **Any surface that prints the
tenant's colour as words needs the text variant — that includes every tenant
site built in Phase 3.**

`correctToward` took `(hex, mode, min)` and now takes `(hex, bg, min,
fallback)`, because the booking page's ground is no longer one of the
dashboard's two. `BOOKING_BG` (`#0B0D0E`) and `BOOKING_ACCENT` (`#38E08B`)
are named constants in `theme.js`, kept separate from `THEME_BG` /
`DEFAULT_ACCENT` on purpose: those still describe the dashboard, which ships
the outgoing palette until 2.3. **`design-contrast` now asserts that
`BOOKING_BG` and `--bk-bg` are the same colour**, because correcting an
accent against one ground and painting it on another is a silent failure.

### The system had no error colour — that hole is now closed, not flagged

The first pass reused `#E2705F` locally and flagged the gap. That was leaving
a hole for 2.3 to fall into on eleven settings screens, so it was chased
instead: **`--bad: #E2705F` is now a named token in
`docs/design-system.md` § Tokens**, under "The one warm value".

It was NOT invented. A grep of the approved reference page found **no red in
it at all** — it is a marketing page with no error states, so there was
nothing to derive from and nothing to contradict. `#E2705F` is the value the
product already ships in the outgoing dashboard palette: continuity rather
than a new decision. On the new ground it measures **6.23:1 on `--ink-0`**
and **5.54:1 on `--ink-2`**, and it is the only warm value anywhere in the
system, so it can never be mistaken for the accent.

It is the one token that is not in the reference page, so it is exempt from
`composition`'s sixteen-token drift check; `design-contrast` now asserts the
stylesheet and the document agree on its value instead. **If the owner wants
a different red, `docs/design-system.md` is the single place to change it and
the test will fail until the stylesheet follows.**

### Two traps found by looking, worth not re-learning

- **`font-variation-settings` inherits and beats `font-weight`.** It was set
  on `.bk` as `"wdth" 100, "wght" 400` — harmless-looking, since that is
  Archivo's default instance — and it silently pinned every descendant to
  weight 400: every `<strong>`, every 500-weight price, every selected chip.
  Confirmed in the browser, not guessed. It is gone from `.bk`; the roles
  that need an axis set both explicitly. **2.2 and 2.3 must not re-add it to
  a root element.**
- **The price bar intermittently failed to paint at all** — the whole strip,
  CTA included — while the DOM reported it present at the right rect. It was
  `backdrop-filter: blur(16px)` on a fixed bar sitting over the fixed
  `mix-blend-mode: overlay` grain layer; removing the filter fixed it every
  time. The bar is now solid `--bk-bg`. Whether or not that reproduces on a
  phone, the primary control on a customer-facing page does not ship on a
  compositing trick, and translucency at 88% bought almost nothing.

### Mechanics deliberately not carried, per law 3

- **The drifting dot lattice.** It is a landing-page mechanic: there the
  ground is mostly empty and the lattice is what makes it a surface rather
  than a colour. Here the ground is never empty — a ruled list, a
  seven-column calendar and a slot grid sit on it — and a 46px lattice behind
  a seven-column grid reads as moire. Law 2 is carried by the drifting light,
  which is the layer above it in the system's own order of cost.
- **The pointer light and the buttons' radial sheen.** Both need a rAF
  pointer listener and both are fine-pointer-only; this is the most
  phone-first surface in the product. The hover lift stays.
- **No `--t-exit` token.** Nothing on this page animates out — a step's
  content unmounts when the step changes, and holding the old step mounted so
  it could leave is real machinery for a transition nobody watches.

The one orchestrated moment is the step's staggered rise: `bk-rise`, keyed on
the step index in `BookingPage.jsx` so React hands back a fresh element and
the CSS animation re-runs. No observer, no rAF, nothing to fail. The wrapper
is `display: contents`, so it changes the motion and nothing about the layout.
Verified with every animation and transition force-disabled: the page reads
completely, so nothing is hidden behind an animation.

### Smaller fixes made on the way, all found by looking

- **The masthead and the price bar sat 16px left of every card edge** at 768
  and up: `.bk-wrap`'s `max-width` included its own padding and the two
  `.inner` elements' did not. One `--bk-col` token now defines the content
  width for all three.
- `.bk-grid2` (the phone/email pair in `StepDetails`) was **used in JSX and
  never defined in CSS** — the fields had been stacking at every width.
- The month header was an `<h2>` at the same size and weight as the step's
  own question two lines above it, and being centred it won. Demoted.
- The calendar's month nav, weekday row and grid are now one `.bk-cal-block`,
  for the same reason `.bk-step-head` exists — the wrap's 26px flex gap was
  opening voids inside what is one control.
- `.cell.today` was styled and commented in the old CSS but **no code ever
  set the class**. Now set, and scoped `:not(.closed)` so a ring never
  appears on a day that cannot be booked.
- A disabled primary button was the accent at 38% opacity, which kept enough
  presence to read as pressable while its dark ink faded into it. Disabled
  primaries go neutral, so the accent only appears when the action is live.
- Money in `BookingConfirmed` and `ManageBookingPage` was a plain `<strong>`,
  not `.bk-price` — law 8 says every figure is monospaced.
- `ManageBookingPage`'s destructive buttons set `borderColor` inline, dead
  since buttons now ring with `box-shadow`; converted.
- Six dead classes and three unused tokens deleted.

### A screenshot trap, so the next session does not chase it

**In the in-app browser pane, a screenshot of a SCROLLED page paints every
`position: fixed` element offset downward by exactly `scrollY`.** It looks
like a hard seam across the page and like the price bar has vanished. It is
the capture path, not the CSS: a plain magenta fixed `div` with no animation,
blend or `will-change` reproduces it exactly, while `getBoundingClientRect()`
reports the correct viewport rect for all of them. Judge fixed elements from
an unscrolled capture. (This is separate from the `backdrop-filter` bar
above, which was real and is fixed.)

Also: while the pane is hidden, CSS animations are throttled, so a screenshot
taken shortly after a step change catches the reveal mid-flight and reads as
"the content is invisible". Front the tab, or finish the finite animations
first via `document.getAnimations()`.

### What 2.1 leaves open

1. ~~**The system has no error colour.**~~ **Closed in this session** — see
   above. `--bad: #E2705F` is in the system file and enforced.
2. **`?lite=1` does not exist in `app/`.** The reference page has `.lite` on
   its root; the shipped app has never implemented that flag, on any page.
   `prefers-reduced-motion` IS handled here and was verified. The flag is a
   Phase 2 gap, not a 2.1 gap — raise it in 2.2, which is the page the
   reference was actually built as.
3. **`index.html` requests five font families**, not two: Archivo and
   JetBrains Mono for this page, plus Anybody / Public Sans / DM Mono, which
   the landing page and the dashboard still ship. It drops back to two when
   2.2 and 2.3 land. Stated in the file itself so it is not mistaken for the
   intended state.
4. **`<meta name="theme-color">` is still `#0F1012`**, the outgoing
   dashboard ground, against this page's `#0B0D0E`. One shared tag, one
   value, four units apart — invisible in practice. It moves in 2.3.
5. **The Review step prints "Estimated total" twice** — once at the foot of
   the receipt, once in the price bar directly below it, which is visible
   together on a desktop. **Looked at and deliberately kept, not left open:**
   a receipt that does not foot to a total is not a receipt, and a running
   total that disappears on the last step is worse than one that repeats. The
   two only coincide on one step at one width. Noted so a later pass does not
   "fix" it by deleting the wrong one.

### What was actually looked at

Every one of the six steps, the confirmation screen, the receipt/manage page
including its reschedule and cancel-confirm states, the not-found screen and
a forced error block — at **392, 768, 1440 and 1920** — across three real
demo tenants chosen for their differences: `demo-detail` (four services in
four groups, both service modes, sky `#0EA5E9`), `demo-riverside` (**two**
services, no groups, mobile-only, travel fee, site discount, crimson
`#DC2626` — the empty-state case the roadmap names), and `demo-ironclad`
(seven services in three groups, drop-off only, forest `#059669`). A real
booking was created end to end and then opened on its own receipt page.
Console clean at every width apart from two pre-existing React Router v7
future-flag warnings. `composition` 22/22, `design-contrast` all pairs,
`landing-pricing` 18/18, `route-contract` 18/18.

## Roadmap 2.2 — the landing page ported, and what the port had to change (2026-08-30)

The reference rendering `docs/design-directions/5-the-thread.html` **is** this
page — the owner approved it as this page over fifteen rounds of corrections —
so this was a transplant, not an interpretation. Its markup became
`app/src/landing/LandingPage.jsx`, its stylesheet became
`app/src/landing/landing.css` scoped under `.ld`, and its script became
`app/src/landing/thread.js`. The old `motion.jsx` is gone; so is
`app/public/img/booking-page-example.png`, which existed only for the section
the new page replaces.

**The port is faithful by measurement.** The page comes out at **10.41 screens
at 1920, 11.26 at 1440 and 14.14 on a phone** — the same three numbers the
approved page measured. Nine sections, nine skeletons, and every mechanic: the
message-to-row transfer, the pinned hold that prints its own cost, the two
light bands, the wipe on the comparison table, the count-ups, the rotating
tail, the weighted scroll, the pointer light, the parallax, the tilt, the
native disclosures.

### The four things the port had to decide, and why

1. **The tokens live under `.ld`, not on `:root`.** The system file said Phase
   2 would move them into `theme.css` unchanged. It cannot yet: `theme.css`
   puts its tokens on `:root` and `:root` still flips with the dashboard's
   light/dark switch until 2.3 removes it, so a prospect would inherit
   whatever the last dashboard user picked on that device. Same reason 2.1
   scoped the booking page under `.bk`. **The system file was corrected rather
   than the code contorted** — `docs/design-system.md` § Tokens now says where
   the values actually live and flags the one-`:root` question for 2.3.
   Unlike the booking page these keep the system's own names (`--ink-0`,
   `--fog`, `--ac`): nothing is injected per tenant here, so there is nothing
   to prefix around, and identical names keep a diff against the reference
   readable.

2. **Nine class names were renamed, and this is the one thing a later reader
   will not guess.** `theme.css` is global and loads first; its class rules
   apply inside `.ld` for every property the landing rules do not themselves
   declare. Nine names collided, and two were live bugs on the first render:
   `.btn` carries `width:100%` for the phone-first dashboard, which stretched
   the nav's pill across the whole bar, and `.lit` carries an `::after`
   gradient and a 3px accent bar that would have been drawn over the hero
   card. So the landing page uses `.cta`, `.litcard`, `.getsheet`, `.ruled`,
   `.tile`, `.fig`, `.pip`, `.substack` and `.softlink`. The ninth,
   `.quiet` → `.softlink`, was harmless on specificity today and was renamed
   anyway: "harmless today" is the reasoning the other eight exist to stop
   having to do.

   **The rule the renames leave behind, written into `landing.css`'s
   header:** no selector in `theme.css` may be able to match an element on
   this page. Seven names are still shared — `sm`, `wrap`, `block`, `on`,
   `nm`, `n`, `lead` — and each is safe because `theme.css` only ever uses
   it in a compound anchored on something it owns (`.btn.sm`, `.dot.block`,
   `.figure.lead`, `.cal-cell .n`, `.settled-row .nm`). The header carries
   the one-line grep that checks a new name. It is documented rather than
   tested because the precise invariant is "no theme rule can reach in",
   and a naive same-name test would fail on all seven of those and be
   ignored within a week.

   The alternative was a block of "un-declare what leaked" rules. It was
   rejected because it can only ever list the leaks somebody thought of, and
   because `theme.css` still has `[data-theme="light"]` blocks that could
   redefine any of those names later — a landing page whose card lightens
   because of a dashboard preference is precisely what the `.ld` scope
   exists to prevent. Renaming ends the whole class of bug instead of
   patching today's instances. It costs a slightly less literal diff against
   the reference, which is why it is written down here.

3. **`overflow-x` is `clip`, not `hidden`.** The reference sets it on `<body>`,
   where the viewport is the scroll container and `position:sticky` keeps
   working. On a scoped `<div>`, `hidden` would make `.ld` its own scroll
   container and the pinned thread section would stop sticking. `clip` cuts
   the overhang — the lit comparison row's negative margins — without creating
   one.

4. **The bubble container is built in JavaScript, not rendered by React.** The
   thread is re-parented between the left column and the dashboard as the
   layout crosses 820px. React must never be asked to remove a node that has
   been moved out from under it, so `#thread` is created in `thread.js` and
   only React-created hosts are ever handed back. The job rows go into a
   container React renders once and never re-renders. Verified against
   StrictMode's deliberate double-mount: four bubbles, four rows, one thread.

### `?lite=1` — built, and it took a rule with it

It now lives in `app/src/main.jsx`, at the app root, before React renders, so
the class is on `<html>` for the first paint. `?lite=1` and
`prefers-reduced-motion` both route into it — the system's single-code-path
rule. **`booking.css`'s own `@media (prefers-reduced-motion)` block was
swapped for `.lite` in the same session**, because leaving it would have been
exactly the second implementation that rule forbids, and it would have been
the one that rots: `?lite=1` never reached the booking page before today.
Nothing is lost by the swap — both pages are React, so a visitor with no
JavaScript has no page either way. Confirmed: `?lite=1` on `/book/:slug` now
gives `animation-duration: 1e-05s` and the step still reads.

### The font claim in the roadmap was wrong, and no family could be dropped

Roadmap 2.2 said to "drop the three this item stops using". It assumed the
landing page and the dashboard each owned a share of Anybody / Public Sans /
DM Mono. They do not: `app/src/theme.css` uses **all three** on its own, in
`--f-display` / `--f-body` / `--f-num`. Restyling the landing page therefore
freed none of them, and removing any would have left the dashboard in a
fallback face. All three go together in 2.3, and `app/index.html` drops from
five families to two in one edit. Corrected in the roadmap, in 2.3's own
entry, and in `index.html`'s comment so it is not re-derived.

### What was measured, not eyeballed

- **Text on the photograph (law 9).** The tenant-site mock puts a name and a
  tagline on a real photo, so CSS cannot answer it. The text boxes were
  screenshotted with the words hidden and the lightest painted pixel read
  back through a canvas: at **1440** the headline sits on `#36383a` and
  measures **10.41:1**, the sub-line on `#16191b` at **12.74:1**; at **392**
  they are **9.24:1** and **12.61:1**. The floor for the headline is 3:1
  (large bold) and for the sub-line 4.5:1.
  **A wrong first measurement is worth recording**, because the next person
  will make it: measuring the text BLOCK's box returns 1.34:1, because that
  box includes 34px of padding above the words where the scrim's gradient is
  still transparent. Measure the words' own boxes, and hide the words rather
  than the block — the scrim on the block is the thing doing the work.
- **The reveal sweep, down and back up**, at 1440 and 392, stopping every
  viewport height: **nothing readable was ever left hidden**, and 720 (1440)
  and 891 (392) elements were still hidden below the arrival line across the
  walk, which is the proof the reveal was not simply switched off. The
  criterion is "top above 82% of the screen", not "fully on screen" — an
  element sitting in the bottom 18% has not been reached yet and is supposed
  to be hidden. Checking it the other way produces false alarms.
- **The FAQ's height change re-caches positions (law 5).** Every question was
  toggled, the page grew, and the footer and the last terms still arrived
  correctly at the bottom.
- The photo ships as `app/public/img/tenant-site-hero.jpg` (41 KB, 840x270,
  Unsplash / Deniz Demirci / `dlJelFmdpOc`) rather than the reference's
  inline data URI. Same bytes; the data URI existed only because the artifact
  host's CSP blocks external images, and a real deploy would rather cache the
  file than inline it into the JS bundle.

### The tests that grew, and why each one had to

- **`landing-pricing`**: its "no hardcoded prices" slice ran from the pricing
  section to the end of the file, which now includes the questions — and one
  answer says "a $600 coating costs you the same as a $65 wash". Those are a
  DETAILER's job prices, the same kind of illustrative figure the hero's demo
  card carries, not ours. The slice is bounded at the FAQ rather than the copy
  reworded to satisfy a test aimed at something else. It also now allows two
  struck list prices, because the founding offer discounts the build fee AND
  the monthly and the approved page strikes both. 18/18.
- **`design-contrast`**: the "outgoing: landing" block read `--g` / `--p`,
  which no longer exist, so every row would have printed `skip` and the page
  would have had no coverage again — the exact hole found in 1.5. Replaced
  with the real pairs, plus a token-drift check that pins `landing.css`'s
  thirteen values against the system's. The booking and landing blocks were
  also lifted OUT of the `if (SOURCE !== APP)` guard they sat inside: that
  guard is about the OUTGOING dashboard palettes, and when 2.3 makes
  `theme.css` define `--ink-0` it would have silently switched off the
  coverage for two restyled surfaces.
- **`composition`**: the two-face rule now runs against `landing.css` and
  `booking.css`, not only the reference page — this is the file's own "as
  Phase 2 lands, REFERENCE grows to include the app's own stylesheet" note,
  honoured one surface at a time. A stack can be written inline or held in a
  token, so the check matches on the quoted family name rather than on the
  property. 24 checks now, all passing.

### What 2.2 leaves open

1. **`<meta name="theme-color">` is still `#0F1012`**, the outgoing dashboard
   ground, where two of the three surfaces now paint `#0B0D0E`. Four units
   apart and invisible in practice. It moves in 2.3, which is the item that
   owns the last surface still using that value.
2. **Three font families are still requested and still needed.** See above —
   they leave with `theme.css` in 2.3, together.
3. **Mid-range Android is still unmeasured.** This page is the heaviest thing
   the product renders: a pinned scrub, a backdrop-filter, a grain layer and
   two drifting lights. Nothing uses WebGL and every scrub writes one CSS
   variable per frame, so the risk is low, but nobody has put a thumb on a
   cheap Android. The system names an fps governor as the thing to add when
   something measured drops frames — measured, not assumed.
4. **The nav's "Sign in" and every call to action are full page loads**, not
   router navigations: they are plain `<a href="/app">`, as they were before
   this item. That is deliberate — the dashboard is a different context and
   the landing page tears its motion down cleanly either way — but it means
   the SPA-unmount path is defensive rather than exercised. StrictMode's
   double-mount is what proves it works today.

### What was actually looked at

The whole page walked in viewport-sized steps at **1920, 1440, 768 and 392**,
in the normal path and at `?lite=1`, down and back up; the console read at
every width in both paths (clean apart from the two pre-existing React Router
v7 future-flag warnings); the booking page re-checked at 392 and 1440 to
confirm 2.1's surface was not disturbed; the dashboard loaded, with and
without `?lite=1`. `composition` 24/24, `design-contrast` all pairs,
`landing-pricing` 18/18, `route-contract` 18/18.

## The owner put the redesign on `main` and published it (2026-08-30)

**His instruction, in full: "put it on main and git."** Said immediately after
being shown what each half meant and being recommended to do only the first.
He chose both. This overrides the standing ground rule in `CLAUDE.md` — "NEVER
commit or merge to `main`" — for this action; that rule is his, and so is the
override.

### What he was told before he decided

He asked why detailingplatform.com and GitHub did not look like the page on
`localhost:5173`. The answer was three copies at three different dates:

| Where | State before this |
|---|---|
| this machine | everything, through roadmap 2.2 |
| GitHub, branch `claude/superbase-access-anj1h7` | last pushed **2026-08-28** — 62 commits behind |
| GitHub `main` → detailingplatform.com | `30ae438`, also 2026-08-28 — the OLD landing page |

Confirmed by loading the live site, not inferred: it served the pre-redesign
page, blue accent and all ("Not a page builder. Not a directory listing.").

Two separate things were put to him, with a different recommendation on each:

1. **Push the branch** — a backup, invisible to the public. Recommended,
   because five sessions of work existed on one computer only and a disk
   failure would have taken all of it. The 62 commits were scanned for
   credentials first; the only matches were old audit documents *describing* a
   vulnerability, and those were being deleted rather than added.
2. **Merge to `main`** — publishes to the public site. **Recommended
   against, for now**, on two grounds he has therefore accepted by
   proceeding:
   - **The dashboard is still the old look.** Roadmap 2.3 has not run. A
     visitor meets the new marketing page, presses "Get started", and lands in
     an app that looks like a different product.
   - **Billing charges nobody.** "Take a founding spot" leads to a signup that
     cannot take money.

   Neither is a defect in what shipped; both are consequences of publishing
   mid-phase, which is his call to make.

### What was done

Branch pushed first, then `main` fast-forwarded to it (63 commits, no merge
commit — `main` had nothing the branch did not) and pushed. All four
credential-free suites were re-run immediately before: composition 24/24,
design-contrast all pairs, landing-pricing 18/18, route-contract 18/18. The
session then switched back to the working branch, so `main` is not where the
next item is built.

### The rule, as it now stands

`main` is still production and the default is still to work on the branch and
leave it alone. What has changed is only that it is no longer 63 commits
behind: `main`, the branch and this machine are the same commit. **Do not
merge to `main` on your own initiative — ask.** He can say yes, as he did
here, and that is the whole mechanism.

### This also answered the deploy question the roadmap has carried since 0.1

`docs/HANDOFF.md` said Netlify auto-publishes `main`; an older DECISIONS note
said deploys were manual uploads, and PROJECT-STATE listed the disagreement as
unresolved. Pushing `main` settled it by observation — see the note recorded
immediately below this section.

## ANSWERED: Netlify does auto-publish `main` (2026-08-30)

Open since roadmap 0.1 and listed in PROJECT-STATE §6 under "what I don't
understand": `docs/HANDOFF.md` said Netlify auto-publishes `main`, an older
DECISIONS note said deploys were manual uploads, and nobody had tested it.

**Settled by observation.** `main` was pushed to GitHub and nothing else was
done — no upload, no dashboard visit, no CLI. The live site rebuilt and
republished on its own within a few minutes. HANDOFF was right; the manual-
upload note is history.

**So the operational fact is: a push to `main` is a publish.** There is no
second step to forget and no second step to protect you. That is why the
default stays "work on the branch and ask before merging".

### The live site was then verified, not assumed

Checked against the deployed production build, which is minified and does not
run React's development double-mount, so it is not the same artifact that was
tested locally:

- **1920, 1440, 768 and 392**: page heights 11243 / 10130 / 11809 / 11938 —
  identical to the local build and to the approved reference page.
- Four message bubbles, four job rows, one thread at every width — the
  script's mount is correct without StrictMode to shake it out.
- Archivo resolving as the display face; prices settling on `$499` and `$35`
  from `pricing.js`; the founding badge reading `3 of 3 left` from the
  database.
- **No console errors and no HTTP response >= 400 at any width.**
- `?lite=1` on the live site: class set, tiles read `4/$520`, nothing hidden.
- **The tenant-site photograph loads: 200, `image/jpeg`, 41,478 bytes,
  natural size 840x270.** Worth recording how this looked wrong first: at
  scroll 0 it reports `naturalWidth 0`, because it is `loading="lazy"` and
  sits six screens down. That is the attribute working, not a broken path —
  scroll to it and it fetches. Do not "fix" a 0x0 lazy image that has never
  been scrolled to.

## Roadmap 2.3 — the dashboard restyled, and the four things it deleted (2026-08-30)

The last surface. 2.1 and 2.2 both had the approved rendering
`docs/design-directions/5-the-thread.html` to copy from; **the dashboard had
no reference page and no worked skeleton**, which `docs/design-system.md`
said plainly was where the system would actually be tested. The plan was
written before any code, in `docs/dashboard-skeletons.md`, and that is the
file to read before changing a shape in `app/src/theme.css`.

### What the dashboard IS, in the system's terms

The landing page's idea is that a detailer's Saturday already exists,
scattered, and the product sorts it; its signature move is four text messages
resolving into four rows of a schedule. **The dashboard is what they resolve
into** — the far end of the same thread. Two things follow. It is the
destination, not a second marketing page, so it is quieter and denser with no
scroll choreography. And the green keeps its meaning without needing a new
one: on the landing page it marks a booking arriving, here it marks a job
finished and paid.

**The signature move is the thread, drawn.** Today's jobs hang off one
continuous hairline with a node each — hollow while the job is ahead, a solid
`--ac` disc once it has landed. It is the only rail in the product, it cost a
wrapper class and two pseudo-elements, and it is what makes Today
unmistakable at a glance. Tomorrow is deliberately NOT on it: the point of
the rail is that the day ends.

### The five skeletons (law 1)

Today the only **rail**, Calendar the only **grid**, Money the only **chart**,
Clients the only screen with **no panel on it**, More the only screen **made
of panels**. Each shape follows from what the screen holds rather than being
applied to it.

**The eleven settings screens share one skeleton on purpose** — a form in a
sheet. They are modal panels reached one at a time and a person never sees
two of them together; law 1 governs what is on screen at once. What varies
between them is internal structure, which follows their content.

### The class API was kept, and that was the biggest single decision

`theme.css` was rewritten end to end, but **every class name in it stayed**.
Thirty components and roughly three hundred call sites read `--surface`,
`--text-muted`, `.card`, `.chip`, `.label`; renaming them to the system's own
token names would have produced a several-thousand-line diff that changed no
pixel and buried the ones that mattered. So the sixteen system tokens are
defined on `:root` under their own names, and a short ROLES block maps the old
names onto them. That block is now the only place in the app where a role and
a colour value meet.

### Four deletions, each because the system has fewer things than the old one

1. **`.stripe` is gone.** The roadmap handed it forward undecided — *"probably
   keep the job it does; the shape is 2.3's call."* Looked at: its one
   remaining use was `Money.jsx`'s waiting-on-payment list, where it sat
   **inside a `.card`**, so it was literally "an accent bar on a rounded
   card", a named never-default — and where every row has the same status, so
   the colour it carried was information nobody needed. Its real job,
   status-without-reading on Today, is done better by the thread node.

2. **`--success` and `--warning` are gone.** The system has one accent and one
   warm value and says so twice; a second green beside `--ac` and an amber
   beside it is a four-hue palette, which is the "timid, evenly distributed"
   failure `design-knowledge.md` §1 names. **The five booking statuses are
   carried by two hues and three shapes instead**: confirmed is a hollow
   `--bone-2` ring (just what is next), completed/paid a solid `--ac` disc (it
   landed), pending a hollow `--fog` ring, cancelled a solid `--bad` disc, and
   no-show a hollow `--bad` ring — the same colour as cancelled with a
   different shape, because they are the same outcome reached two ways. The
   pill beside the mark still says the word, so colour is never alone. A
   blocked day on the calendar is a solid `--fog` disc: a day you marked off
   is a decision, not an error.

3. **`.warn-box` stopped being a warning.** Its one real use is *"N more
   finished jobs still need payment recorded"* — a thing to DO, not an error,
   and already a `<button>`. It is drawn as a control now: a panel, a
   `--line-2` edge, `--bone` text, the accent only on its marker.

4. **The light theme, and the tap-duration token.** The old file had a 90ms
   `--dur-tap` for press feedback. A press now scales with **no transition at
   all**, so contact is instant in both directions — better feedback than a
   fast transition was, and one fewer number to keep in step with the
   system's four.

### The light theme took five places, not the four that were scoped

`docs/design-system.md` listed `theme.css`, `lib/theme.js`,
`more/Appearance.jsx` and the per-user preference key. The fifth was
**`context/BusinessContext.jsx`**, which held the `themeMode` state and made
the `applyTheme` call — it is the thing that actually *set* `data-theme`, and
it was not on the list. Worth recording because the same shape of miss is
likely again: the file that *stores* a setting is easy to scope, the file that
*applies* it is the one that gets forgotten. There is no `data-theme` anywhere
in the product now, and `:root` carries `color-scheme: dark`, which is what
makes native controls, scrollbars and date pickers come back dark for free —
a win that only became available once there was one ground.

### The rule that fell out of looking: a fill is an action, a tint is a selection

Not planned; found in the screenshots. Hours renders **five** solid green day
chips beside a solid green "Apply to 5 days", and Calendar's History view
stacks **three** chiprows — a solid selection would have lit nine things on
one screen and made the accent the loudest thing on a settings form. So:

- **A solid accent fill means an action (`.btn.primary`), a fact (today's
  date disc, a switch that is on) or a job that has landed (a thread node).**
- **Anything merely SELECTED gets the tint** — `--ac` at 15%, an `--ac`
  border, `--accent-text` words. `.chip.active` and `.choice.on`.

It reads better, and it is the system's "one sharp accent used sparingly"
rather than a contradiction of it. A disabled `.btn.primary` also stopped
being the accent at 42% opacity, which on this ground is a muddy dark green
that reads as a *different colour* rather than as an unavailable one; it goes
neutral instead.

### The dashboard no longer takes the tenant's colour — law 11, and an unanswered question

`lib/theme.js` used to write the detailer's brand colour over `--accent` on
the dashboard root at every load. It does not any more. Law 11 says the house
accent is fixed and the tenant's is customer-facing only, and that is the
owner's own reasoning, recorded unprompted in `docs/design-brief.md` §B6b: a
detailer *"probably doesn't really care about the admin dashboard colour
scheme"*, the accent is about what their **customers** see.

**But that brief flagged it as an assumption and asked for it to be confirmed
"before 2.3", and it never was.** It is asked now rather than treated as
settled. Implemented the law's way in the meantime, because that is what is
written down; the change back is small if he wants it.

The screen carries the consequence honestly instead of hiding it.
"Appearance" is now **"Your colour"**, its More row reads *"Shown on your
booking page"*, and the screen shows a **live preview on the booking page's
own ground** — the corrected fill, the ink measured against that fill, and
the accent-as-words value, all from `brandVarsFor`, the same function the
booking page itself calls, so the preview cannot drift from the page. Without
it, picking a colour and seeing nothing change would read as broken.

The More row's swatch also shows the **corrected** colour now rather than the
raw hex out of the database: that row is a summary of a setting, and the
setting's effect is what the customer sees after correction.

### Found while verifying, and fixed: Promos crashed the whole app

`screens/more/Promos.jsx` used `<Segmented>` and never imported it. Opening
**Promo codes & sale** threw `ReferenceError: Segmented is not defined` and
took the app down. Pre-existing, nothing to do with the restyle, and it had
survived because **nobody had ever walked all eleven settings screens in a
browser** — which is exactly what this item's verification routine is for.

### Two other things the screenshots caught

- **A `.card` inside a `.sheet` did not lift.** Both are `--ink-2`, so every
  settings panel was reading as an outline rather than an object. One rule
  fixes it everywhere: `.sheet-body .card` takes `--surface-lit`. Inputs stay
  on `--ink-1`, so a form still sinks INTO a card that sits on a sheet —
  three levels, three values, in the order the eye expects. Catalog and Team
  additionally wrapped their cards in another `.card`, which no surface value
  can rescue; those wrappers became plain containers, and their card lists
  got a `.tight` so they stopped butting into one striped block.
- **The calendar left a third of the screen empty at 768 and 1440.** The "not
  enough content to fill the viewport" failure the system names, and it is
  worse on a wide screen, never better. Cells go from 56px to 88px at ≥700px,
  which fills it and makes a day a bigger tap target for the day sheet at the
  same time.

Clients also had **no masthead** — the only one of the five tabs with no
identity and no count, opening straight into a search field. It has one now,
and the count is the thing an owner actually wants from that tab at a glance.

### Where the tokens live now — the question 2.2 left for this item

All sixteen are on `:root` in **`app/src/theme.css`**.
`tests/design-contrast.test.mjs` was written to switch its source to that file
the moment it defines `--ink-0`, so it did, by itself, and the
outgoing-palette blocks stopped running.

**The other two scopes stay.** `.bk` and `.ld` were introduced because `:root`
flipped with the light/dark switch and a customer must not inherit a dashboard
preference. That reason is gone with the switch. Two that are not: each file
being self-contained is what makes it diffable against the reference
rendering, and `theme.css` is still a global sheet. `design-contrast` pins all
three sets against each other, so they cannot drift apart.

### The leak bit this session too, on the live marketing page

Not a theoretical risk. The day rail's first name was `.thread`, declared bare
in `theme.css`. **`landing.css` already owns `.thread`** — it is the class on
the messages-becoming-a-schedule element, the approved page's own signature
move. Because `theme.css` is global, that bare rule reached straight into it
and gave the marketing page a 26px left pad, a one-pixel rail and a seven-pixel
node on every child. Reproduced in the browser before touching anything
(`paddingLeft: "26px"`, `railWidth: "1px"`, a node `box-shadow` on the first
child), renamed to `.dayrail`, and re-checked: `paddingLeft: "0px"`,
`position: static`, `content: none` on both pseudo-elements.

**So the grep has become a test.** `tests/composition.test.mjs` now has a
check called *"theme.css cannot reach into a scoped sheet"*: it parses every
selector in `theme.css`, keeps the ones whose WHOLE form is a single class
(anything anchored on an ancestor or a second class cannot match over there),
and fails if `landing.css` or `booking.css` uses that name. `landing.css`'s
header has prescribed exactly this grep since 2.2 and nobody ran it — which is
the argument for a test rather than a note, and it is the standing rule in
that file: a test is for a rule that has already been broken by hand.

It immediately found a second one: **`booking.css` used `.line.muted`**, and
`theme.css` declares a bare `.muted`. That one was inert — the two font sizes
and the two greys happen to be the same values today, and every visible string
sits in a `<span>` the booking sheet colours itself — **which is exactly why it
would have stayed invisible until one of them changed.** Renamed to
`.line.dim`.

`.lite` is excluded from the check by name, and deliberately: it is the
app-wide degradation class, set on `<html>` in `main.jsx`, and reaching every
surface is its entire job.

### A note in `landing.css` was wrong, and 2.3 is where that shows

It said the nine class renames *"all goes away in roadmap 2.3, when theme.css
stops being the outgoing system."* **They do not.** The leak has nothing to do
with `theme.css` being the OLD system and everything to do with it being a
GLOBAL one, imported by `main.jsx` on every route. It was rewritten onto The
Thread and every bare selector in it still reaches into `.ld` and `.bk` for
any property those sheets do not declare themselves. The renames and the grep
in that header stay load-bearing. Scoping the sheet would mean putting a class
on the app shell, the auth screen, the invite page, the job page and the sheet
portal — a bigger and riskier change than the nine renames it would undo. Not
done, and not obviously worth doing; the header now says so, and so does
`theme.css`'s.

### What was verified, by looking

Signed in as the seeded demo owner against real data, through the real
sign-in form:

- **All five tabs at 1920 / 1440x900 / 768x1024 / 392x844**, full-page.
- **All eleven settings screens at all four widths** — 44 screenshots.
- **The whole set again with `?lite=1`**, which renders identically: nothing
  on this surface is hidden behind an animation, and only the ground's drift
  and the bars' arrival stop.
- **Console read at every width.** Clean apart from two React Router v7
  future-flag warnings that predate this work and are unrelated to it.
- **One unexplained thing, recorded rather than swept up:** a single HTTP 409
  appeared at 1920 during the FIRST settings sweep and never again — not in
  three later full sweeps, roughly a hundred and fifty more page loads. Every
  write on those screens is behind a Save button that nothing pressed, so the
  most likely explanation is a duplicate upsert racing the sheet's close. It
  is written down because "I saw it once and could not reproduce it" is the
  honest state, not because it is known to be a defect.
- **The two PUBLIC pages re-checked afterwards**, because the sheet that was
  rewritten is global and reaches both. The landing page measures
  **11243 / 10130 / 11809 / 11938** at the four widths — byte-for-byte the
  numbers DECISIONS.md records for the deployed production build in 2.2, so
  the rewrite moved nothing there. Console clean and no response ≥ 400 on
  either page.

The tenant-accent retint sweep is deliberately NOT part of this item: the
dashboard's palette is fixed now (law 11), so there is nothing here to
retint. That check belongs to the booking page and to 2.4.

**The demo business was re-seeded to do this** (`scripts/seed-demo.mjs`,
which deletes and recreates `demo-detail` on the PLATFORM project only), and
three of its bookings were shifted onto the current date so Today had a real
day on it rather than an empty state. The empty state was looked at too,
before the re-seed, and reads as calm rather than unfinished.

## ANSWERED: the dashboard DOES take the tenant's colour (2026-08-30)

The question roadmap 2.3 handed the owner, answered the same day, the
opposite way to how 2.3 built it.

**His words:** *"I think that we should have them be able to customize their
admin dashboard accent color, because I think that the majority of accent
colors will work. You know, I mean, it's just with black, so almost anything
goes with black or a darker colour."*

So a detailer picks one colour and it paints their booking page, their site
**and their own dashboard**. `docs/design-system.md` law 11 has been rewritten
to say so — the system file is updated first, never silent drift.

**Why the old reading existed, and why it was still right to ask.** It came
from his own earlier remark that a detailer *"probably doesn't really care
about the admin dashboard colour scheme"* (`docs/design-brief.md` §B6b),
which that file flagged as an assumption and told a later session to confirm
**before** 2.3. Nobody did. 2.3 implemented the written law, said plainly in
the handover that it had never been confirmed, and asked. That is the process
working: the assumption surfaced, got a real answer, and the answer cost one
conversation instead of a retrofit.

**His reasoning is sound and worth keeping.** A near-black ground is
forgiving: almost any hue clears contrast against `#0B0D0E` once
`lib/theme.js` has nudged its lightness. The old law's real argument was never
"it will look bad" — it was cost: every dashboard screen now has to survive an
arbitrary tenant colour, which `docs/design-knowledge.md` §4 calls the hardest
visual problem in the product, because the failures stay invisible until a
specific customer signs up. That cost is now accepted, and it is bounded by
two things that already exist: the curated four-to-six set (still unpicked),
and the correction in `lib/theme.js`.

**What has to be built is written out step by step in `docs/roadmap.md` under
2.3 (b)** — it is not started. The short version: `applyTheme` was deleted in
2.3 and needs an equivalent back; `BusinessContext` has to call it; and
`theme.css` writes `var(--ac)` directly in about thirty places that must
become `var(--accent)` or `var(--accent-text)` depending on whether the colour
is a FILL or is used AS WORDS. That distinction is law and it is the whole
reason there are two values — crimson `#DC2626` is a real preset and it passes
as a fill while failing as text on this ground.

**One thing that does NOT change:** `#38E08B` stays the house default — what a
business that has picked nothing gets, and what the marketing page uses. The
marketing page keeps reading `--ac` and must not be retinted.

## The load-in animation is too slow (2026-08-30)

**His words:** *"When the page loads, the page animations and loading, it's
perfect, but the GUIs just take a little too much time to, like, you know, go
up and do the load-in animation. So if you can make that just a little
speedier."*

Read carefully, because it is a precise report: **the ground and the page as a
whole are right; the ARRIVAL of the screen's elements is not.** So this is not
"turn the motion down" — law 3 says motion is not spendable — it is one
duration being wrong for this surface.

What he is feeling is `app/src/theme.css`'s `@keyframes arrive`: it runs for
`--t-reveal`, which is **950ms**, with a 55ms stagger up to 210ms, so the last
element on a screen settles roughly **1.16 seconds** after the screen appears.
`bar-rise` (the Money chart) and `sheet-in` (every settings panel) run at the
same 950ms.

950ms is the system's value and it was right where it came from: the marketing
page, where a reveal is tied to scrolling and the reader is travelling. A
dashboard screen is not travelled, it is opened — forty times a day — and
there the entrance should not be the slowest thing on it.

Not fixed yet. Roughly 380–450ms with a ~40ms stagger is the target, and the
system's own `--t-exit` is already 420ms. **Whatever value is chosen goes into
`docs/design-system.md` § Motion with its reason**, because law 4 forbids
ad-hoc durations and a number changed quietly in a stylesheet is exactly that.

## A guessable demo login, on purpose and temporarily (2026-08-30)

The owner tried to look at the dashboard on the live site and on his phone and
met a sign-in page. He asked either to remove the sign-in page for now, or for
a simple login he could type.

**Removing it is not an option that does anything**, and the reason is worth
writing down so it is not re-proposed: the dashboard shows one business's real
rows, and the database — not the app — decides who may read them. RLS is
FORCEd on every table. With no session there is no identity, so every query
returns zero rows; a dashboard with the sign-in page taken off is not an open
dashboard, it is an empty one. The sign-in page is not a gate in front of the
data, it is what makes the data exist.

**So: a simple login instead.** The seeded demo owner's password was changed
from `DemoDetail2026!` to **`demo123`**, and the staff account to
`staff123`. `scripts/seed-demo.mjs` was updated to match, so re-running the
seed no longer silently restores the long ones. Proven by signing in through
the real form at 392px.

    demo@detailplatform.com / demo123     (owner — sees everything)
    demo-staff@detailplatform.com / staff123   (staff — no Money tab)

**The blast radius, measured rather than assumed:** these reach the DEMO
business only. Tenant isolation is enforced in the database and
`tests/tenant-isolation.test.mjs` proves it, so the worst a stranger who
guesses one can do is scribble on fake data in `demo-detail`. That is
acceptable for a temporary testing login on a pre-revenue product and it is
not acceptable once there is a single real customer. **Change them before
then.** The note is also in `scripts/seed-demo.mjs` beside the values.

## He asked whether we actually look at the screens, and the answer is yes (2026-08-30)

*"You are screenshotting every single page and looking back on it, right?
Because that's a major thing — you guys are able to visualise it instead of
just looking at the code, that way you could fix any errors."*

Confirmed to him, and recorded here because it is a standing expectation
rather than something 2.3 happened to do. Every screen is opened in a real
browser and looked at, at **1920 / 1440x900 / 768x1024 / 392x844**, in the
normal path and `?lite=1`, with the console read at each width. 2.3 did that
for all five tabs and all eleven settings screens — 44 screenshots for the
settings sheets alone, then the whole set again in `.lite`.

It is not ceremony, and 2.3 is the evidence: **two real defects were found
that way and neither was findable by reading code.** The Promos screen crashed
the whole app on open — a missing import that had survived because nobody had
ever walked all eleven settings screens in a browser. And the day rail leaked
onto the LIVE marketing page, because the class name it was given belonged to
that page already.

`scripts/shoot-dashboard.mjs` exists so this is repeatable rather than
re-invented each time; it is documented in `docs/HANDOFF.md` §4b.

---

## Roadmap 2.3, reopened — the three things the owner sent back (2026-08-30)

He looked at the restyled dashboard and returned three items. All three are
now done. Three defects and one design-system contradiction were found on the
way, and those are the part worth reading.

### (a) The load-in was too slow — a tool's reveal is not a page's

*"the GUIs just take a little too much time to go up and do the load-in
animation. So if you can make that just a little speedier."*

`app/src/theme.css` now defines its own `--t-reveal: 420ms` and
`--t-exit: 180ms`, with the stagger down from 55ms to 40ms. **The last element
on a screen settles at 580ms, against 1160ms before** — measured in the
browser, not calculated. Written up in `docs/design-system.md` § Motion, "The
dashboard's own reveal", because law 4 says a duration choice goes into the
system with its reason and not into a stylesheet quietly.

**Why this is not a fifth duration.** Both numbers already exist in the
system — 420 is `--t-exit`, 180 is `--t-hover` — so nothing was invented, and
every surface already defines its own copy of these tokens (`landing.css`
under `.ld`, `booking.css` as `--bk-*`). The 950ms reveal is the LANDING
page's number and it is untouched there; verified by reading the computed
`--t-reveal` on `/` after the change (still 950ms). The curve is not
per-surface and never will be.

`--t-exit` had to come down with it, and that also fixed a pair that was
already inverted: the sheet backdrop faded IN at `--t-hover` (180ms) and OUT
at `--t-exit` (420ms), so leaving took longer than arriving.

### (b) The dashboard takes the tenant's accent — law 11, in code

`applyDashboardAccent()` is back in `app/src/lib/theme.js` (the old
`applyTheme` minus the `data-theme` half, which stays dead — there is one
ground). `BusinessContext` calls it on load, on every change to
`branding.primary_color`, and **with null on unmount**. Every one of the ~30
`var(--ac)` uses in `theme.css` became `var(--accent)`; `--ac` stays as the
house default that `--accent` falls back to, and the marketing page's `--ac`
was not touched.

**The 30-way fill-vs-text split the roadmap describes turned out to be "all
fills."** The 2.3 rewrite had already routed every *text* use through
`--accent-text`. Checked line by line rather than assumed.

**The unmount call is not tidiness.** `theme.css` is a GLOBAL sheet and
`landing.css` defines no `--accent*` of its own, so a colour left on `<html>`
would follow a signed-in user out to the public marketing page. Verified in
the browser: on `/` the inline properties are gone and `--accent` computes
back to `#38E08B`.

#### The defect this found: the correction ground was the wrong ground

**`lib/theme.js` corrected the accent against `--ink-0`, and that guarantees a
floor on `--ink-0` and nowhere else.** A dashboard accent does not stay on the
ground: `.cal-cell.today` sits in a panel, and `.pill` / `.badge` /
`.chip.active` / `.choice.on` print `--accent-text` on a tinted panel. Those
surfaces are lighter, so contrast on them is LOWER than the number just
guaranteed.

Sweeping the eight presets: **six of them under the 4.5:1 text floor on a
panel, and violet and slate under even the 3:1 FILL floor on `--ink-3`.**

Fixed by correcting against `--ink-3`, the lightest surface an accent can land
on — every one of these colours is lighter than every ground, so clearing the
floor there clears it on all the darker ones. One correction, guaranteed
everywhere. It costs almost nothing: **the house green does not move at all**
and six of the eight preset fills are unchanged.

`scripts/accent-sweep.mjs` is new, credential-free, imports the same functions
the app calls, prints all three grounds, and **exits non-zero** if this ever
comes back.

**The booking page deliberately did NOT follow.** Checked rather than assumed:
`booking.css` prints `--bk-accent-text` in exactly two places and both are
borderless rows sitting directly on the ground. Correcting that page against
`--ink-3` would push every tenant colour further from the owner's pick on the
surface their customers see, to buy a floor it already clears.

#### A second defect: stale tenant state survived sign-out

`BusinessContext.reload()`'s two "no tenant" exits cleared only `business`,
leaving `branding`, `settings`, `role` and `firstName` behind. Invisible until
the dashboard started wearing the tenant's colour — then signing out left the
last detailer's colour on the sign-in screen, and signing in as a different
one wore their predecessor's colour until the fetch returned. Fixed at the
shared point (`clearTenant()`), not in the accent effect. Verified by signing
out in a real browser: the inline properties clear and `--accent` falls back
to `#38E08B`.

#### OPEN, and it is the owner's: Crimson reads as the error colour

Law 11 makes one sentence in `docs/design-system.md` false. `--bad` `#E2705F`
was "the only warm value anywhere in the system, so it can never be confused
with the accent" — true only while the accent was fixed green. Corrected for
text, **Crimson lands at `#E55B5B`, ΔE 11.4 from `--bad`**: the same colour to
a glance. A *paid* pill and a *cancelled* pill on one screen would then be the
same red meaning opposite things. Ember measures ΔE 35.9 and is fine; Crimson
is the only one at risk.

**Not fixed in code on purpose.** The fix is to drop Crimson from the presets,
which is the owner's open "curated four to six" decision (roadmap 2.4). A
second red invented to dodge it is the exact failure mode
`design-knowledge.md` §2 names. The system file now records the collision
instead of the false claim.

### (c) Every screen IS opened and looked at — and the tool was broken

Confirmed, and the standing routine ran again: 1920 / 1440x900 / 768x1024 /
392x844, console read at each, normal path and `?lite=1`, plus the retint
sweep under crimson, violet, gold and slate. Console is clean apart from two
pre-existing React Router v7 future-flag warnings.

**`scripts/shoot-dashboard.mjs` could not sign in.** The demo login was
simplified to `demo123` in commit `1f3f945` and this script kept
`DemoDetail2026!`, so the one tool that opens the dashboard at all was dead.
Fixed, with a comment naming `seed-demo.mjs` as the file it must match. It
also gained `--accent <PresetName>`, which picks the colour through the REAL
screen (More > Your colour > the swatch) rather than writing the database, so
it proves the save and the live retint and not just the stylesheet.

#### A third defect, found only by reading the live cascade

The sheet backdrop is rendered inside `.app-main > .group` rather than in a
portal, so the screen-reveal rule `.app-main > .group > *` — specificity
(0,2,0) — beat `.sheet-backdrop`'s own (0,1,0) `animation: backdrop-in`. **The
full-screen dark overlay was running `arrive`: sliding up 14px and fading in
on a 160ms staggered delay** instead of fading straight in. Pre-existing; the
duration change halved it but did not cause or cure it.

Fixed with `:not(.sheet-backdrop)` on the reveal rule **and on the five
stagger rules** — `animation-delay` is a separate property with its own
cascade, and excluding it from one but not the other left the overlay fading
correctly and still 160ms late. Chosen over raising the backdrop's specificity
to tie at (0,2,0), because a tie decided by source order is one reorder away
from silently coming back.

**This was invisible in the stylesheet and invisible in a screenshot.** It was
found by reading `getComputedStyle(...).animationName` on a live open sheet.
Worth repeating on anything inside `.app-main > .group` that is not content.

### Screens

`shots/23b-final/` — five tabs and three settings sheets at four widths.
`shots/23b/` — the four retint extremes and the `?lite=1` pass.

---

## The owner walked the whole product, and answered both open questions (2026-08-30)

Full record, in his words: `docs/owner-walkthrough-2026-08-30.md`. Two
decisions and about twenty-seven feedback items. His overall verdict on the
design was positive — *"how good it looks so far. I really like the design"* —
so everything below is refinement, not rejection.

### He published, and told us why the stakes are low

*"Now you could publish this to the website."* Merged and pushed to `main`.

The reasoning is worth keeping because it answers every future publish
question: *"no one knows about it, only me. And it's not going out until
everything's finished. So in reality, it's not like something bad should
happen if we don't publish, but it's nice for me to be able to view it
anywhere."*

**So detailingplatform.com is his private preview, not a launched product.**
That is a different thing from what the earlier notes assumed when they
weighed "publishing mid-phase" as a risk. The rule in CLAUDE.md does not
change — still ask before merging — but the expected answer, and the reason,
are now on the record.

### Do NOT drop Crimson — and the curated four-to-six is dead

This reverses the recommendation this session put to him.

*"those eight colors were chosen by AI. They weren't by me, so I really don't
care about them. But I do want to have a good amount of color choices for
detailers, because a lot of detailers' color is probably red. So I don't think
you [should drop it] — maybe find some way around that."*

**The business fact the code did not know: red is a common colour for a
detailing business.** Pruning reds from the preset list prunes real customers.
So the plan inverts — MORE coverage, not less:

1. Research which colours real detailers and small businesses actually use.
2. A hue-family classifier in `lib/theme.js` (reds, oranges, yellows, greens,
   blues, purples, whites), so *"almost every single color in the world will
   work."*
3. Break the status signals' dependence on colour, so a red accent stops
   colliding with `--bad`.

Now roadmap 2.4 item 3, in three parts.

**The measurement that prompted the original recommendation still stands** —
Crimson corrected for text is `#E55B5B`, ΔE 11.4 from `--bad` `#E2705F`. The
number did not change; the response to it did. Do not let a future session
"rediscover" the number and re-propose dropping red.

### He explicitly removed his own authority from the fix

*"maybe we switch that color, or maybe you warn the detailer, or make it more
obvious that it's cancelled with words or sizing or something. You figure that
out. Don't use my word in any way to kind of decide your decision."*

That is an instruction, not modesty, and it is unusual enough to honour
precisely: he listed three candidate fixes and then said not to weight them
because he said them. The analysis is already done and is recorded in
`docs/design-system.md` § "The one warm value" and in the walkthrough file, so
it does not get re-derived:

- **Pills and badges are already safe.** They print "Paid" and "Cancelled" as
  words, so colour is reinforcement, not the message.
- **The exposed surfaces are the ones with no text** — `.dot.completed` /
  `.dot.cancelled` (7px circles) and the calendar's `.marks`. That is where a
  fix has to land, and it is a **WCAG 1.4.1** obligation regardless of the
  accent, so it is worth doing even for a tenant who picks blue.
- **The system already owns the vocabulary.** `docs/dashboard-skeletons.md`
  uses hollow versus solid for "ahead" versus "landed"; a third form for
  "cancelled" is a smaller invention than a new colour.
- **Rotating `--bad` off red is the option to be most careful with.**
  Red-for-error is a stronger and more universal convention than any tenant's
  brand colour. Moving it trades a convention every user knows for one only
  this product knows.
- **Never invent a second red.** That is the failure mode
  `design-knowledge.md` §2 names by name. It is now written into the system
  file as law.

### The walkthrough itself — 27 items, none started

Split into roadmap **2.6** (clipping and spacing — small, checkable, and the
screenshot routine already catches this class), **2.7** (features — calendar
ranges, Money time ranges, and a booking-widget pass organised around his one
general rule that every step should fit without scrolling), and **2.8**
(research how other detailers actually work).

**2.8 exists because three separate items are the same gap:** the product is
modelled on his business and he knows it. The water-and-electricity question
on the booking page was built for him specifically, because he has no water
tank or generator, and he says most detailers do. Several 2.7 build decisions
depend on that research, so it runs first.

**The one caveat that governs half of 2.6:** he was on a Windows phone
emulator, not a real phone, and flagged it himself. Every "cut off to the
right" item must be reproduced at 392x844 before it is treated as a bug.
`scripts/shoot-dashboard.mjs` already shoots that width.

**The best-argued single item he gave** is the hover bug (W24): hovering an
already-selected option darkens it, which reads as un-selecting it. A selected
element's hover has to move in the same direction as its selected state, not
against it. That one needs no research and no decision.

## Roadmap 2.4 — making almost any colour work everywhere (2026-08-30)

The item the owner set in D2: stop the tenant's accent colliding with the
system's status colours, without dropping red from the palette. Three parts —
research the colours real detailers use (3a), classify an arbitrary colour into
a hue family (3b), and break the status signals' dependence on colour (3c).
He removed his own authority from 3c's shape: *"You figure that out. Don't use
my word in any way to kind of decide your decision."*

**Then he corrected the framing mid-session, and the correction is the most
important thing in this entry.** See "The owner's rule" below.

### 3a — the preset list, built from evidence instead of taste

**Twelve presets, up from eight.** The eight that were there carried no
authority — *"those eight colors were chosen by AI… I really don't care about
them"* — but he was explicit that the COVERAGE matters, and that a curated
four-to-six is the wrong direction.

The evidence, and it is worth keeping because it settles the argument that
started this item:

- **A 46-brand car-care sample** (1000logos, "Most Famous Car Detailing Brands
  and Logos"), counted by hue: **red 22 of 46 (48%)**, black/grey ~43% (almost
  always as the neutral, not the accent), **blue 11 of 46 (24%)**, yellow/gold
  6 (13%), orange 4 (9%), purple 2 (4%), **green 0**.
- **General logo-colour studies** for the small-business baseline: blue
  37–40%, black/grey 28–31%, red 23–29%, yellow/gold ~15% (Fortune 500 and
  Fortune Global 500 samples).
- **Detailing-specific convention:** white, silver and metallic accents, and
  deep navy or charcoal paired with gold for premium positioning.

**What that changes.** Red is the most common colour in this trade by a
distance — twice blue. Pruning the reds would have pruned roughly half the
addressable market, so the owner's business instinct was right, and now it has
a number behind it. **Green being 0 of 46 also means the house green is a real
differentiator** rather than an arbitrary pick.

The twelve, hue-ordered so the swatch row reads as a spectrum: Crimson, Rose,
Ember, Sunflower, Gold, Forest, Teal, Sky, Ocean, Violet, Slate, Silver. Four
are new (Rose, Sunflower, Teal, Silver); the eight that were there all survived,
because every one of them clears both floors.

**WHY THERE IS NO DEEP NAVY AND NO DEEP GARNET, though both are real detailing
brand colours.** `correctToward` moves lightness only. Measured: navy `#1E3A8A`
paints `#4269D6` and garnet `#9B1C1C` paints `#D72727` — each collapses onto a
brighter preset already in the list. Two swatches that paint the same colour
are worse than one. The custom picker plus `describeAccent()` covers those
detailers instead, in words.

**The swatch row became a 6-column grid** rather than a wrapping flex row:
twelve wrapped as eleven-plus-one at 1440, which reads as a mistake. 6x2 fits
every width down to 392.

### 3b — `hueFamily()` and `describeAccent()` in `lib/theme.js`

His framing: *"there's a group of reds and oranges and blues and greens and
yellows, whites and purples… even though obviously they're a different color
technically, they're that same type of color… basically make sure that almost
every single color in the world will work."*

`hueFamily(hex)` returns a family key and a human label. Nine families: red,
orange, yellow, green, teal, blue, purple, pink, and neutral. Saturation below
0.10 is neutral, which is what stops `#0A0A0A` being called "a red" because its
hue rounds to zero. It classifies the colour AS PICKED, which is the same
answer as the colour as painted, because correction never changes hue.

**It deliberately does NOT gate any styling** — see 3c. Its job is
`describeAccent()`, one live sentence on the Appearance screen saying what the
colour is and what was done to it. That replaced a fixed paragraph which said a
pale colour "may look slightly deeper than the one you chose" — backwards, since
the ground is dark and it is DARK colours that get lightened. Someone who types
in their deep navy and gets royal blue now finds out why.

**Its own check lives in `scripts/accent-sweep.mjs`**, which pins sixteen
colours against their expected family. It earned its keep immediately: the
first version had three bands mislabelled (`#EA580C` came back "yellow",
`#EAB308` "lime", `#059669` "teal") and the check caught all three.

**The sweep also grew the extremes 2.4 owns** — neon green, neon magenta, neon
cyan, pure black, near-black and pure white are swept on every run now, not
only when someone remembers to pass a hex. All clear both floors. Pure black
paints `#707070` as a fill and `#8A8A8A` as text.

### 3c — the decision: form, unconditionally

**Three options were on the table, in his words: switch the colour, warn the
detailer, or "make it more obvious that it's cancelled with words or sizing or
something."**

**Chosen: a form vocabulary that always holds, for every tenant, plus his own
rule below. Rejected: switching `--bad`, and warning the detailer.**

Switching `--bad` is already forbidden by law ("never invent a second red") and
trades a convention every user knows for one only this product knows. Warning
the detailer moves the problem onto the customer and leaves the product broken
for anyone who clicks past it.

**The measurement that decided the shape.** The premise everyone had been
working from — "red accents collide with the error red" — is only a third of
the problem. Measured on the shipped markup, ΔE against the mark each collides
with:

| Accent | Collides with | ΔE | Both were |
|---|---|---|---|
| silver `#D4D7DA` | "booked" ring, `--bone-2` | **8.5** | hollow rings |
| deep red -> `#E26666` | `--bad` | **8.5** | — |
| Crimson -> `#E55B5B` | `--bad` | **11.4** | solid discs |
| near-black -> `#707070` | "blocked", `--fog` | **17.1** | solid discs |
| Slate -> `#5C6E87` | "blocked", `--fog` | **21.8** | solid discs |

Three of the five have nothing to do with red. **A silver accent is exactly as
bad as a red one.** So a fix conditional on `hueFamily() === "red"` would have
left most of the problem in place, and would have been a code path six tenants
in seven never exercise. One rule that always holds beats a branch that
sometimes fires.

**It also disposes of "drop Crimson" for good.** A deep red typed into the
custom picker corrects to `#E26666`, ΔE 8.5 from `--bad` — *closer* than
Crimson's 11.4. The preset list was never the lever.

**The vocabulary** (`docs/dashboard-skeletons.md` §5b is the table): circles
are jobs — hollow ahead, solid landed; a bar is a job that did not happen;
squares are facts about the DAY. `--bad` left the calendar entirely. Confirmed
and pending merged into one mark, because on a month grid both mean "booked,
nothing has happened yet" and keeping them apart cost a third hollow ring
distinguished by hue alone.

**Two things were found while doing it and are worth carrying forward.**

- **`.dot.cancelled` — the roadmap's flagship collision site — is unreachable.**
  `Calendar.jsx` filters cancelled out of the month grid and `Today.jsx` filters
  it out of the rail. The rule was styled for a mark that never renders.
- **The legend decoded four of seven marks.** Pending and no-show had no legend
  entry at all, so a red no-show dot sat on the month grid meaning nothing to
  anybody. It decodes all five now.

**`.ring` kept the accent and did not go neutral.** Making it a square is what
fixes its collision with "booked"; dropping it to `--fog` on top of that was
tried and looked worse — a hollow grey square beside a solid grey square is a
1px hole apart at 7px. Checked in a browser at 6x.

**Pills and badges: filled means it happened, outlined means it did not.** They
were never a 1.4.1 failure — they print the word — but under a red accent
"Completed" and "Cancelled" were the same red, and that is the common case, not
the edge one. The tint is the difference now, which is the system's own
hollow-versus-solid vocabulary one level up.

### THE OWNER'S RULE: the accent is identity, never meaning

**Said mid-session, and it is the better answer.** Full quote in
`docs/owner-walkthrough-2026-08-30.md` -> D3. The short version: *"the paid
should always be green because that's just kind of paid. Money green is all
kind of cohesive… the accent colour is more like the mark complete button or
the calendar highlight — what day it is — and the outline for month, and the
colour theming on the money page."*

It is now `docs/design-system.md` **law 11b**. Two kinds of colour:

- **`--accent*` carries IDENTITY** and follows the tenant: actions,
  navigation, selection, focus, today's disc, the selected day, chart bars, the
  "it landed" node.
- **`--ac` green and `--bad` red carry MEANING** and are fixed for every
  tenant: paid / money up / it worked, and cancelled / no-show / error /
  destructive.

**Why this is better than what was being built.** The form work makes a red
accent *survivable*. His rule makes the collision *not exist* for the pair that
matters, because "Paid" is no longer red at all. Both shipped: the forms also
cover the silver and near-black cases, which his rule does not touch.

**He said "there might be other places that that rule applies to also", and
that was taken as an instruction to extend it.** Four sites he did not name:

- **`.delta.up`** was `--accent-text`, so a red-branded detailer got a red ▲
  beside a red ▼ — the two directions of the Money screen's headline saying the
  same thing in the same colour. Now green up, red down.
- **`.ok-box`** was accent-tinted, so under a red accent it was identical to
  the `.error-box` above it — the two states of one message, indistinguishable.
  Now green.
- **Money's `tone="good"` figure** ("Added on site") — money earned. Now green.
- **`.badge.paid`**, which mirrors `.pill.paid`.

**The judgment call inside the rule, recorded so it is not re-derived:
*completed* stays on the accent while *paid* moves to green.** A finished job is
not money; "mark complete" is his own example of an accent-side control; and
the Today rail's landed node is the one place the detailer's colour appears on
the screen they open every morning, so moving it to green would put the house
colour back on their main screen — exactly what law 11 was rewritten to stop.
The residual is that under a red accent "Completed" (filled) and "Cancelled"
(outlined) are both red, carried by the fill difference and the words. It is a
one-line change in `theme.css` if that reading is rejected.

**`grep 'var(--ac)'` in `theme.css` finds every fixed-meaning site.** That
file's token block used to say "below here there is no `var(--ac)` left". That
rule is now exactly inverted and the comment says so.

**A collision the rule could have INTRODUCED was checked, and it does not
exist.** Moving paid to a fixed green puts two greens side by side for a
green-branded tenant: Forest's accent-as-text `#05A070` against the money green
`#38E08B`. Measured ΔE **29.3** — comfortably separable, against the ~8–11 that
reads as the same colour. Teal is 46.5; every other preset is 46 or more.
Looked at as well, in the History list under a Forest accent: "Completed" deep
green and "Paid" mint green are clearly two pills, and both mean compatible
things anyway, unlike the paid/cancelled pair.

### Two defects found on the way, both in the demo seed

Neither is 2.4's subject; both were fixed because they block LOOKING at the
product, which is how this project verifies visual work.

- **The demo had no cancelled and no no-show booking** — twenty-one rows, every
  one confirmed or completed. So the entire "Cancelled" / "No-show" family of
  styling could not be seen in a browser at all, which is why a red "Paid"
  beside a red "Cancelled" survived unnoticed. One of each added. *A status
  with no seed row is a status nobody ever looks at.*
- **The seed silently dropped bookings on weekends.** `openDay(1)` is the next
  open day after TODAY, and the demo business is closed Sunday and Monday, so
  on a Sunday it resolved to the same Tuesday `day0` had already resolved to.
  Both "tomorrow" rows then overlapped the day0 jobs, the double-booking
  constraint refused them (23P01), and the script printed "skipped" and carried
  on — so the Today screen's TOMORROW section read "Nothing booked yet" every
  weekend. `openDay(3)` had the same bug one day further out. Every upcoming
  day is now CHAINED off the one before it rather than measured from today,
  which is what makes them provably distinct. 22 of 22 seed now; it was 20.

### Verified

`composition` 26, `design-contrast`, `landing-pricing` 18, `route-contract` 18,
and `accent-sweep` (18 colours x 3 grounds x 2 floors, plus 16 hue-family
pins) all pass. Screenshotted at 1920 / 1440 / 768 / 392 under Crimson, Silver
and the house default, normal path and `?lite=1`; the marks were also inspected
at 6x, and the History list was walked under Crimson to see a green "Paid"
beside an outlined red "Cancelled" on one screen. Console at every width carries
only the two pre-existing React Router v7 future-flag warnings, which predate
this item.

### A LIVE defect on the customer-facing booking page, found while checking

The sweep measures the DASHBOARD's values. The booking page computes its own
through `brandVarsFor`, against its own ground — so none of the work above had
actually checked it. Checking it found the 2.3 bug still live on the public
page, which is the one a paying customer sees.

**`.bk-card.selected` draws its accent ring on
`linear-gradient(166deg, var(--bk-lit), var(--bk-sunken))`.** The top of that
gradient is `--ink-3`. `.bk-cal .cell.today` rings a cell painted
`rgba(255,255,255,.025)` over the ground. Both are LIFTED, and the fill was
corrected against `--ink-0`. Measured on `--bk-lit`:

| Accent | Ring contrast | Floor |
|---|---|---|
| Violet `#7C3AED` | **2.78:1** | 3:1 |
| Slate `#475569` | **2.62:1** | 3:1 |
| a black pick | **2.56:1** | 3:1 |
| a deep navy | **2.51:1** | 3:1 |

**That ring is the only thing telling a customer which service they picked.**
Violet and Slate are shipped presets, so this was not hypothetical.

**The fix, and the rule it clarifies.** The booking page now corrects its two
values against two DIFFERENT grounds: the FILL against `--ink-3` because rings
land on panels, the TEXT against `--ink-0` because the only two places it is
printed are borderless price rows on the ground (checked in 2.3, re-checked
here). `accentTriple()` gained an optional `textBg`, defaulting to `bg` so the
dashboard is unchanged. **The rule is not "one ground per page" — it is
"correct against the lightest surface THAT VALUE can land on".**

A side effect worth knowing: the booking fill and the dashboard fill are now
corrected against the same ground, so a tenant's colour paints identically on
both surfaces. That is an improvement, not a coincidence to preserve.

**`scripts/accent-sweep.mjs` now measures the booking page every run** — fill
on the ground, on the calendar cell and on `--bk-lit`; text on the ground; and
the ink ON the fill. The check was proved to work by reverting the ground: it
exits 1 and prints exactly those four numbers. The script's final line is now
the only one that speaks for the whole run, because a per-section "all clear"
printed before the next section runs is how a green sweep hides a red one.

**Both swatch previews were re-pointed at `brandVarsFor`** (Appearance's twelve
circles and More's nav-row dot). They used `correctAccent(hex, CUSTOMER_BG)`,
which after this change paints a colour the page never uses. One function, no
drift — which is the rule that file already stated for the preview card.

Verified live: `/book/demo-detail` under Violet now injects
`--bk-accent: #8243ee` (3.01:1 on `--bk-lit`) instead of the raw `#7c3aed`
(2.78:1), with `--bk-accent-text` unchanged at `#955ff0`.

### Still open in 2.4, NOT done in this session

- **The customer cancel/reschedule page's composition** — its three stacked
  full-width buttons carry no hierarchy. It is the non-colour half of 2.4 and
  it was never started. Its *colour* is fine: the cancelled state there is
  carried by the word "Cancelled" and a line-through on the date, so it has no
  colour-alone dependence to fix. `booking.css` itself was not edited — the
  booking fix above is entirely in `lib/theme.js`, which is the only file
  allowed to compute colour.
- **`a { color: var(--accent-text); text-decoration: none; }`** in `theme.css`
  is a latent 1.4.1 hazard: a link identified by colour alone. Chasing it found
  **one LIVE instance and it is fixed** — the booking confirmation page's
  *"Questions? Call &lt;number&gt;"*, a prose link inside a `<p>` marked only by
  the tenant's accent. `booking.css` now underlines links inside `.bk-muted`
  and `.bk-body` prose and explicitly exempts `.bk-btn`, which reads as a
  button already. It matters most for the accents nearest the prose around
  them: a Silver accent `#D4D7DA` against `--bk-muted` `#939CA1` is 1.9:1,
  under the 3:1 a colour-only link would need.
  **What is still flagged and NOT fixed is the DASHBOARD's `a` rule.** Every
  anchor there is classed as a button except one, `BookingDetail.jsx:292`,
  which is a card — underlining a card would be wrong, so there is nothing to
  fix yet. It becomes real in Phase 3, when tenant sites have prose.

## Roadmap 2.4, the last piece — the manage page had no first thing (2026-08-30)

`/booking/:id` — the page a customer reaches from the confirmation email to
move or cancel an appointment — drew **four** identical full-width pills in a
column: *Add to my calendar*, *Change the time*, *Cancel this booking*, *Call
&lt;number&gt;*. The roadmap said three; it was one short, because the last one
only draws when the business has a phone number on file, which the demo tenant
does.

**The root cause was structural, not stylistic, and it is worth naming because
it will recur.** The buttons were direct children of `.bk-wrap`, which is
`display: flex; flex-direction: column; gap: 26px` — the page's SECTION gap.
Every button therefore inherited a section's worth of space above it *and*
carried its own `marginTop: 10`, so the four of them read as four page-level
blocks rather than as one set of choices. That is the "five identical
full-width stacked sections" tell (`docs/design-knowledge.md` §1) arriving by
accident: nobody chose it, the container did.

**What it is now: one group, three weights.**

| Weight | Control | Why |
|---|---|---|
| Filled, the tenant's accent | Change the time | The page's own header says it exists to stop the detailer's phone ringing for "can I move my Tuesday?". That is the primary, and it is an *action*, which law 11b puts on the accent side. |
| Ringed | Add to my calendar | Useful, not the reason you came. |
| Ringless, sharing a row under a hairline | Cancel this booking · Call … | The two ways *out* — one destructive, one human. The rule is the line between doing something WITH the booking and doing something INSTEAD of it. |

New in `booking.css`: `.bk-actions` (the group and its tighter internal
rhythm), `.bk-exits` (the row, which stacks below 440px because a phone number
and "Cancel this booking" cannot share a line that narrow), and
`.bk-btn.danger` with a `.bare` variant. `.danger` also replaced the same
inline `boxShadow + color` style that had been copied into the JSX twice.

**The destructive control lost its ring, and that was the point.** The trigger
that OPENS the question and the button that ANSWERS it are not the same act:
the confirmation step keeps the full red ring, the trigger is bare and takes
the ring back on hover. Its red stays — law 11b fixes `--bad` to destructive,
and it is the one colour on this page the tenant does not own. Colour is not
carrying it alone either: it keeps its `<X>` icon, and `.bk :focus-visible`
paints a 2px accent outline, which was screenshotted rather than assumed.

### The red-on-red adjacency: measured, and left alone

Making "Change the time" an accent fill puts a red-branded tenant's identity
colour in the same view as the red destructive control — the exact adjacency
law 11b exists to prevent, and the reason item 3c pulled `--bad` out of the
calendar. So it was measured before it was accepted. CIE76 ΔE against `--bad`
`#E2705F`, on the corrected fill each preset actually paints:

| | ΔE | | ΔE |
|---|---|---|---|
| Crimson `#dc2626` | **31.9** | Gold | 45.9 |
| Rose `#e11d48` | **30.8** | Slate | 64.9 |
| Ember `#ea580c` | **35.9** | Silver | 59.6 |
| Sunflower | 61.1 | Ocean | 105.6 |

The collisions item 3c judged real were **ΔE 8.5** (a Silver accent against the
"booked" ring) and **17.1** (near-black against the blocked-day grey). The
worst case here is 1.8x the larger of those and 3.7x the smaller. `hueFamily()`
does put Crimson, Rose and `--bad` in the same band — but they differ in form
as well as distance (a solid 48px fill against bare text, with a rule between
them), and a red `.bk-btn.primary` already ships on this same page in the
reschedule and cancelled states. **No colour was changed.** If the owner looks
at a crimson tenant and disagrees, the one-line answer is to drop `--bad` from
the trigger and leave it on the confirmation button, which is what 3c did to
the calendar.

### A live defect fixed on the way

With the cancellation window closed, the note explaining that changes are
locked already prints whatever contact the business has — and a "Call
&lt;same number&gt;" button was drawn directly beneath it. The same number,
twice, in a row. **Checked at the source rather than assumed:**
`receiptBusiness.phone` comes from `get-booking-receipt` and `business.phone`
from the public-profile RPC, and both read `businesses.contact_phone`, so
there is no shape of the data where the note is empty and that button is not.
The whole exits row now goes when the window closes.

### What was looked at, and how

`scripts/shoot-manage.mjs` is new — `shoot-dashboard.mjs` signs in and walks
the owner's side, and nothing reached the page the CUSTOMER lands on. Its
states are branches on data, not clicks, so it takes a booking id per state.

Walked at **1920 / 1440x900 / 768x1024 / 392x844**, console clean at every
width, normal path and `?lite=1`: the default state, mid-reschedule, the
cancel confirmation, cancelled, and the locked window — that last one reached
by temporarily setting the demo tenant's `cancellation_window_hours` to 200
and putting it back to 24. Retinted through the tenant's real
`business_branding` row at three extremes and restored to `#eab308`: Crimson
(a saturated red fill), Silver (a near-white fill with dark ink) and
near-black (which corrects to a mid-grey fill — bright enough not to read as
the disabled treatment, which is darker and has muted text). The booking page,
which shares the same stylesheet, was re-shot at two widths and is unchanged.
All four credential-free tests and `scripts/accent-sweep.mjs` pass.

### One thing observed and deliberately not fixed

The page ends around y=570 on a 1920x1080 screen, so the lower half is bare
ground — and this change made it about 100px *shorter*, because three weights
take less room than four equal ones. It is left alone: this is a phone page
reached from a text message, its approved sibling the booking page has the
same shape, the ground's drifting light means it is not a dead screen (law 2),
and the only way to "fill" it would be filler. Flagged to the owner rather
than solved, because "not enough content at 1920" is a named hazard in this
repo and silently ignoring it is how it gets ignored twice.

### What was NOT done, and why

No test was added for "a column of identical full-width buttons". The check
would have to count sibling elements across JSX to mean anything, which is
brittle in a way the existing 26 checks are not — they read stylesheets and
markup for facts, not for shapes. The rule went into
`docs/design-system.md` § Composition instead, where the never-defaults live.

### Two things checked during the above and found NOT to be findings

Recorded so they are not re-discovered and re-argued.

**`.bk-btn`'s default ring measures 1.71:1 against the ground** (`--line-2`
`#333B40` on `#0B0D0E`), which is under law 9's 3:1 for non-text interactive
edges. It is not a finding: the ring is a secondary affordance on a control
whose own label runs 19.48:1, so the boundary is not what identifies the
button. It is also pre-existing on every secondary button on the booking page,
not something this item introduced. The new tiers were measured too and both
clear the text floor comfortably — the bare destructive label `#E2705F` at
**6.23:1** and the ghost `#939CA1` at **6.97:1**, with the accent fill at
10.16:1 as a non-text edge.

**"Keep my booking" appeared bone-coloured rather than muted in the first
confirmation screenshots.** It is `.bk-btn.ghost:hover`, not a defect:
Playwright leaves the pointer where it clicked, and the confirmation panel that
replaces the exits row puts a different button under that exact spot. Measured
with the pointer parked off-canvas it is `#939CA1`, as designed.
`scripts/shoot-manage.mjs` now moves the mouse to (2,2) before every shot, so
the artifact cannot come back.

---

## Roadmap 2.6 — the owner's walkthrough, the clipping and spacing half (2026-08-31)

Eight of his items, every one reproduced at 392x844 in a real browser before
anything was edited, per the emulator caveat he wrote himself. The outcomes are
recorded item by item in `docs/owner-walkthrough-2026-08-30.md`; what follows is
the judgment behind them.

- **The emulator caveat cuts BOTH ways, and one item proves it.** The
  instruction was "reproduce it or close it", and read literally that would
  have closed **W14** as a phantom: the Open button does not overflow in a
  headless browser. It overflows when `navigator.share` exists, which adds a
  third button — Chrome on Windows has it, every real phone has it, and a
  headless Chromium does not. With it stubbed in, Open ends 24px off a 392px
  screen, exactly as he described. **The right question was never "is this
  broken in my browser" but "what did HIS browser render."** Anything that
  reads the caveat as licence to dismiss reports is reading it wrong.

- **Seven of eight reproduced; the eighth reproduced somewhere else.** W7, W8,
  W11, W12, W13, W14 and W15 all reproduced at 392. **W24 did not reproduce
  where the roadmap said to look** — `.chip.active` and `.choice.on` in
  `theme.css` were already scoped away from their selected state, so nothing
  darkened there. The bug was real and on the CUSTOMER-facing booking page:
  `.bk-card.selectable:hover` had no `:not(.selected)` and carries one more
  selector than `.bk-card.selected`, so hovering an already-chosen service
  replaced its accent ring and its lift with a grey hairline. His description
  was accurate; the location in the roadmap was a guess and it was wrong.

- **The shared cause was fixed once, not eight times.** Both spacing items
  (W7, W11) and the Team clipping (W15) came from the same habit: children
  dropped into a container with no flow of its own, and flex children left
  free to refuse to shrink. So `.card.row.between` — the "what it is on the
  left, what you can do to it on the right" shape, which has **eight call
  sites** — now wraps and tells its two halves which one gives; and the two
  screens got the system's own flow containers instead of margins. Catalog
  and the two modals were never reported broken and are unchanged on screen:
  the rule only fires when the content genuinely does not fit.

- **The client's three stats lost their boxes rather than gaining a gap.**
  W7 asked for spacing and W8 asked for less bulk, and one change answers
  both: three related facts are an enumeration, and the composition rule's
  answer to an enumeration is a ruled list. The new `.facts` device has no
  boxes at all, so there is no gap left to get wrong, and it is the Clients
  tab's own skeleton besides.

- **`.row-item`'s `padding-left` question, open since 2.3, is ANSWERED — and
  the 2.3 note was right to reject the obvious rewrite.** Translating the row
  is genuinely not equivalent, because it slides the chevron too and the row
  drifts away from its destination instead of toward it. Translating the
  **text** is equivalent: measured, the words move 6px, the row's box does not
  move, the chevron does not move, and `.txt` keeps its width — so the ellipsis
  point no longer shifts either, which the padding version did. Layout
  animation gone, effect identical or better. The design hook now reports one
  finding on `theme.css` instead of two, and the survivor (`.sheet`'s height
  transition) is the one already documented as deliberate.

- **THE ACCENT-TEXT GROUND, ONE SURFACE FURTHER IN — a live defect found
  while doing W24, and fixed.** Applying law 15 meant raising the tint on a
  selected chip's hover, which meant measuring what its label sits on. It sits
  on `--ink-3` **mixed with the accent itself**, and `--accent-text` was
  corrected against plain `--ink-3`. So the floor bought by the correction did
  not hold where the value is actually printed. Measured over the twelve
  presets and the six extremes, four sites failed 4.5:1 — a selected chip and
  a selected choice at **3.92 worst**, `.pill.completed` / `.badge.completed`
  at 4.13, the selected tab at 4.46 — with **nine presets plus black and
  near-black under the floor**. `lib/theme.js` now corrects the text against
  `dashboardTextBg()`, the ground at its lightest (the selected tint while
  hovered, 20%); worst case after the fix is 4.52:1 and six colours do not
  move at all. `scripts/accent-sweep.mjs` measures all four tinted grounds
  every run and exits 1 if the two numbers drift apart — proven by setting the
  tint to 0 and watching it fail.
  **This is the third time the same mistake has been made in this file's
  history** (2.3 corrected against the ground, 2.4 corrected the booking fill,
  2.6 this), and the pattern is identical every time: the ground was named
  from the stylesheet's SURFACE tokens while the value was landing on
  something built out of the accent. The design system now says it in one
  line — **a tint of the accent is a ground.**

- **Two things law 15 deliberately does NOT do.** A hover already scoped away
  from the selected state is not broken — it does not move against the
  selection — so `.bk-chip.selected` and `.bk-cal .cell.selected` were left
  alone. Brightening them was tried and rejected on a measurement: those are
  solid accent FILLS, and for a very dark tenant accent the corrected fill is a
  mid grey carrying WHITE ink, so brightening it drops that label from 4.95:1
  to **3.84:1**. A card can intensify because its selection is a ring; a fill
  cannot without moving a floor. Separately, `.cal-cell.selected` turned out to
  be **dead CSS** — nothing in the app ever sets it — so it did not get a hover
  either; a rule for a state that never renders is speculative code. The dead
  rule is left in place with a comment saying so.

- **The 320px floor is REAL, MEASURED and DEFERRED to roadmap 2.9.** After the
  fixes the sweep is clean at 392 and 360 on every dashboard screen and on the
  booking page. At 320 five things still clip. It is deferred rather than
  fixed because it is not one of his items, not one of the four verification
  widths, and not the width he was looking at — and because each of the five
  needs its own layout decision, which is a body of work rather than a
  follow-through. **PRODUCT.md claims "responsive 320→1440", so that claim is
  currently false**; 2.9 is what makes it true, and the exact list is in it.

- **A 409 was logged once and never came back.** The first sweep recorded one
  `409` response with no other detail. Two later walks of the same path with
  the network logged produced no 4xx or 5xx at all. Most likely the probe's own
  doing — it clicked `.card button` blind on the Clients tab and may have hit a
  Save twice. Recorded rather than chased further; if it reappears it has a
  note waiting.

- **`ship-check` found one thing the sweeps could not, and it is not a 2.6
  item.** Focus rings: 215 focusable controls across every changed screen were
  tabbed through and all 215 show one, including the Promos checkbox whose
  markup was rewritten. Contrast: every text node on all eleven changed screens
  was measured against its real composited ground at 392 and all clear AA —
  which together with `accent-sweep`'s twelve presets and six extremes across
  seven grounds is the whole surface. What it DID turn up is
  `app/index.html`: **no meta description, no Open Graph tags**, on a site that
  is published. Filed as roadmap 7.5 rather than fixed here, because the copy
  is a positioning decision and the OG image needs the owner — there is no
  logo, by design.

---

## DECISIONS.md got an index, because nobody was reading it (2026-08-31)

The owner's ask, after 2.6: *"maybe there's information in there that we don't
need anymore, or we could just have, like, kind of a thing at the top that
every agent reads at the start… so that way it doesn't have to go digging
through the entire file."* He also set the priority explicitly — *"time's not
that big of an issue. My main concern is just the accuracy"* — and told me to
make the call rather than hand it back.

- **The problem is real and measurable.** This file was 218KB, about 54,000
  tokens. A cold session's whole mandatory reading is roughly 20–25k tokens, so
  reading this file would have been more than doubling it. Nothing did. **The
  2.6 session searched it and appended to it without ever reading the body**,
  which is the honest description of what "too long" had turned into: a file
  where knowledge goes to be safely forgotten. It looks like diligence and
  performs like a cleared chat, only slower.
- **Clearing between items STAYS, and this is what makes it work.** Compacting
  was considered and rejected: the summary is lossy, *I* pick what survives,
  and nobody can audit what I dropped. Files can be checked. The decider is
  portability — the owner expects to move to OpenAI's coding agent in about a
  month, so a compacted conversation ports as nothing while markdown ports for
  free. See the portability rule in `CLAUDE.md`.
- **The index is written by hand, and that is deliberate.** Generating it was
  tried first: pull each section's first bold run as its hook. It produced
  entries like "four", "40 pixels" and "`docs/dashboard-spec.md` is now in the
  repo". **A wrong hook is worse than no index** — it is a lie in the one place
  a session trusts — so the hooks are written by someone who read the section.
- **What the script does instead is refuse to let it rot.**
  `scripts/decisions-index.mjs` checks two things and nothing else: every `##`
  section appears in the index, and no index entry names a section that is
  gone. It exits 1 either way. Proven both directions: it passes on 48
  sections, and appending an unindexed section makes it fail. Matching is on
  the heading's opening clause, so the index can keep listing the short form of
  a long heading; it errs toward passing on purpose, because its job is to
  catch a forgotten section, not to police wording.
- **Nothing was deleted, and superseded entries were MARKED instead.** He
  floated deleting what is no longer needed and it is the wrong move here: the
  value of a decisions log is largely in its reversals. "Removed on purpose"
  reads as dead weight until you notice the next entry is the owner putting all
  of it back — delete the first and the second stops making sense. The index
  labels it superseded and points forward. That rule is now in `CLAUDE.md`.
- **The index leads with the five mistakes that have actually cost sessions**,
  not with a table of contents. Three of them have been made more than once —
  the accent-ground error alone in 2.3, 2.4 and 2.6 — so the highest-value
  thing at the top of this file is not "what is in here" but "what you are
  about to get wrong".
- **Watched, not fixed: `docs/roadmap.md` is 73KB and heading the same way.**
  It is not acute yet, because sessions arrive knowing which item they want and
  items are findable by number. If a session ever starts guessing which phase a
  thing lives in, it needs the same treatment.


## Roadmap 2.7 — the owner's walkthrough, the features half

Closed 2026-08-31. W1, W2, W3, W4, W5, W6, W16, W17, W18, W19, W20, W23 and
W26. W9, W10, W21, W22 and W25 were left for 2.8 on purpose — see the last
section here. The item-by-item record with the measurements is
`docs/owner-walkthrough-2026-08-30.md`, which is still the primary source; what
follows is only the judgment calls.

### W16 got an instrument before it got a fix

*"A good general rule is that everything should be able to fit without having
to scroll anywhere. Each step, you shouldn't have to scroll down or up."*

A rule with no instrument is a preference. `sweep-widths.mjs`, written in 2.6,
answers "is anything off the RIGHT edge"; nothing answered "is anything off the
BOTTOM", and those are different questions with different fixes — the right edge
is one element too wide, the bottom edge is the whole step's budget.

`scripts/sweep-booking-steps.mjs` walks the flow at all four verification sizes,
fills it in as a customer would, and reports the overflow per step plus the
three tallest blocks when it fails. **Baseline: 8 of 12 step-views overflowed,
worst 222px — 26% of a phone screen.** Without that number the first instinct
(and the wrong one) is to start shaving gaps at the bottom of whatever screen
you happen to be looking at.

**Two things about the script are worth keeping.**

- **It reports the SPARE ROOM, not just the failures.** "Fits" is only true of
  the business that was measured. A detailer with two more services than the
  demo is a different page, and the headroom is what says how much more the
  layout can take. That number is what made the ceiling below visible.
- **It reads the flow rather than assuming it.** W19 made the step list BUILT
  (add-ons only get a step where a business has any), so a script that assumes
  six steps silently measures the wrong screen. It reads "STEP n OF m" off the
  page and drives each step by what that step actually asks for.

**1440x900 was the only size that failed after both of his were clean.** 392x844
is his phone and 1920x1080 is his monitor, and fixing those two left step 1
55px past the bottom on a 1440x900 laptop — the SHORT screen, 180px less height
than 1920 carrying the same desktop masthead. The masthead's own comment says
why it grows: "a 60px bar above a centred column leaves the top third of a 1920
screen empty." That reasoning is about height and the gate only checked width.
It is `(min-width: 1000px) and (min-height: 950px)` now. **The lesson is that
the four verification widths are four SIZES, and the short one is where a
height budget breaks.**

### The honest ceiling: step 1 is the tenant's, not ours

Steps 2–7 have 90–500px of room. **Step 1's height is the detailer's
catalogue**, and with the demo's four services it has 18px of room on a phone —
a fifth service breaks it. W16 cannot be true in the absolute for a list whose
length the tenant controls, and pretending otherwise would mean either deleting
information a customer needs or shaving the layout until the next detailer
breaks it again.

**The lever that actually raises the ceiling is W21** — his "little eye" control
that folds a service's full contents out of the card — and W21 is one of the
five waiting on 2.8's research, which is a good reason it is sequenced there.
Recorded here so a later session does not rediscover the 18px and go hunting for
gaps to shave.

**The headroom by size, so nobody has to re-measure to know where they stand:
1920 has 125px, 768x1024 has 158px, a phone has 18px, and 1440x900 has ONE.**

**That 1px is a decision, and the alternative was tried and rejected.** The
tenant's tagline is 23px, and hiding it on a laptop as well as on a phone would
have bought comfortable room at 1440x900. It is not worth it: the tagline is the
tenant's own line on the tenant's own page, the height-gated masthead padding
already buys 38px there on its own, and margin bought this way is spent the
moment the detailer adds a fifth service. **Suppressing tenant identity to
protect a limit the tenant's own catalogue controls is the wrong trade** — the
phone is the one screen where the tagline genuinely does not fit, and that is
the only place it is hidden. Both halves were measured, not reasoned.

**And the class was nearly the wrong one.** `.tagline` is reused by the manage
page for "Your booking", a page LABEL rather than marketing, so the first
version of the phone rule hid the customer's receipt subtitle too. It is
`.tagline.brand` now. Grep a class before writing a rule against it — the same
lesson `landing.css`'s header has been carrying for two roadmap items.

### W20 was ours to call, and his own doubt is why

He asked for Back beside Continue, stuck to the page, and then immediately
doubted it against W17: *"I might [be wrong] if we do an estimated time. Figure
out what it looks best."*

Measured, it is not close. As a block at the foot of the column, Back cost 48px
plus the 26px section gap above it — **74px of the budget on every step but the
first** — and W16, which he stated as the general rule, is what this whole item
is organised around. It also reaches now: at the bottom of a scroll, Back was
the one control you had to scroll to find.

His doubt does not survive contact with where W17 actually went. The estimated
time rides the bar's EYEBROW, beside the words "Estimated total", not beside the
figure: the figure is the thing being decided on and the one mono number in the
bar, so a second number next to it would make two leads. The bar is
`[← icon] [ESTIMATED TOTAL · 3 HRS / $220] [Continue]` and nothing is crowded.

### W1 was not where the roadmap pointed

The roadmap read W1 as the calendar CELL. **The cell has been a whole-box
`<button>` since the day sheet was built**, so on that reading the item was
already finished and would have been closed as "does not reproduce" — the same
failure mode W14 nearly had in 2.6, arrived at from the opposite direction.

His sentence names the panel FIRST — "clicking a date opens a panel with Block
this day, Set hours and Drop-off only" — and only then says "you should be able
to click anywhere in that box". The box is one of the three cards INSIDE that
panel, and "that specific little button" is the Set / switch on its right.

**One thing a whole-card tap deliberately will not do is UNDO.** Clearing a
blockout, a set of hours or a restriction stays on its own explicit control. A
300px target that silently unblocks a day is a worse bug than the one W1 is
about, and the asymmetry is the point rather than an oversight.

### W3's range is N rows, not a second end on the row

`blockout_dates` and `dropoff_only_periods` already had `start_date` and
`end_date`, so W2 and W4 were fields on a form. `booking_hours_overrides` is
keyed one row PER DATE (`unique (business_id, date)`), and the temptation is to
give it a range the way its siblings have one.

It writes N rows instead, and that is the table doing what it was built for: an
override is a fact about ONE DAY, the weekly schedule is the thing that speaks
in patterns, and clearing one day later must not disturb the others. The write
is capped at 366 days because the field is a free `<input type=date>` and a
mistyped year would otherwise ask for 36,000 upserts.

### W4 was a live hole wearing a feature request

He asked for the drop-off-only control to follow the detailer's own settings.
Building it meant reading `dropoff_only_periods`, and reading it turned up
this: **the table reached the customer as a NOTE on the booking page and
nothing else.** Nothing on the way IN ever looked at it. A customer could read
"This day is drop-off only" and book a mobile job anyway, and the detailer
found out on the day.

The guard went into `_shared/slotValidation.ts` rather than into
`create-booking`, because `reschedule-booking` and `update-booking` move a
booking's date with exactly the same freedom and had exactly the same hole.
One guard where all three meet — the same reasoning that put the reminder
re-arm on a table trigger in phase 0 rather than inside `reschedule-booking`.

The `mode` column is `dropoff` or `mobile`, defaulting to `dropoff` so every
existing row keeps the meaning it was written with. **The table's name is now
half wrong and it is staying**: renaming it would touch the dashboard, the
slots function and the booking page for no behaviour, and migrations here are
append-only.

**The customer-facing half is that a restricted day stays OPEN in the calendar
rather than going grey.** Filtering it to nothing would have been simpler and
says only "closed"; opening it says which way the day is restricted and that
going back a step fixes it. Either way `validateSlot` is the gate.

### W6: what "the standard online" turned out to mean

He was explicit about not wanting an invention — *"whatever is the standard
online for the different amount of ranges"* — so `app/src/lib/periods.js` is a
list of borrowed conventions with the reasoning written next to each:

- **The comparison is the SAME period one step back.** This week vs last week,
  this year vs last year. Comparing a part-finished week against a whole one is
  the classic wrong number.
- **Six months and a year ROLL off the current month**, not calendar halves and
  not a fiscal year. A detailer has no fiscal year.
- **The week starts Sunday**, matching both calendars already in the product.
- **Lifetime does not step**, because there is only one of it, and it charts by
  YEAR — every other kind charts itself, but "the last six lifetimes" is not a
  thing.

**Lifetime was anchored to `businesses.created_at` first and read $0.00 with
three years of takings on the screen behind it.** The row is created when the
detailer signs up; their HISTORY can be older, because bookings get seeded,
imported and back-dated. The account's birthday is not the business's. It
reaches back ten years now, the same as the Calendar's "Everything" filter, so
the two screens agree about what "all" means.

**Two defects that a month-only screen could never have shown, both found by
looking at the result rather than by reading the diff:**

- `money()` printed `$-189.00` for a net-negative week. Nothing was wrong with
  the arithmetic — the minus was inside the amount instead of in front of it,
  and it reads as a corrupted figure rather than a loss. Fixed in the one
  formatter, so every caller gets it.
- **The bar chart plotted `Math.abs(value)`, so a $189 LOSS drew the identical
  bar to a $189 win.** Survivable while the screen only ever showed months;
  not once a week is selectable, where "expenses, no completed jobs yet" is a
  normal Tuesday. Negative bars are the fixed `--bad` red now, carrying
  selection the same way the positive ones do — dim either side, full strength
  for the one you are on. That is law 11b rather than a new mechanic: money
  moving is MEANING, and it is the same red `.delta.down` already used.

### Why five items were left unbuilt

W9, W10, W21, W22 and W25 are not deferred out of time pressure. Each one
decides a SHAPE that roadmap 2.8's research exists to fix: what fields a
service needs (W9), whether add-ons group or reorder (W10), how a service shows
its full contents (W21), which on-site resources a detailer must have (W22),
and whether packages exclude each other (W25). Every one of them is a schema
question, and 2.8 is explicitly sequenced before them in the roadmap — "do this
BEFORE the parts of 2.7 that depend on it, not after."

Building them now would freeze a guess into a migration, and migrations here
are append-only. W22 is the sharpest case: the water-and-electricity question
exists in the product *because of his own business*, and he is the one who said
most detailers are not like him. Guessing a second time is the failure mode
this ordering was designed to avoid.

### The class-name leak caught one more, and the test earned its keep

W18's group label was called `.bk-step-label.group`, and `tests/composition.test.mjs`
test 4b failed on it inside a minute: **`theme.css` declares `.group` bare and
`theme.css` is GLOBAL**, so the name would have reached into the booking page
and made the label a 26px-gap flex column. It is `.bk-group` now. This is the
tenth rename in that family and the first one a human did not have to find.

### What W4 broke elsewhere, and what found it

Giving `dropoff_only_periods` a `mode` changed the meaning of a table four
other places already read, and three of them were wrong the moment the
migration landed. None of it showed up in a test; it came from asking "who
else reads this" after the feature worked.

- **The month grid's ring was hard-labelled "Drop-off only"** in both the cell
  tooltip and the legend, so a mobile-only day would have been marked with a
  plain lie. **It is ONE mark for both restrictions now** and the tooltip says
  which; the legend reads "One type only". A second FORM was the obvious move
  and it is the wrong one: `docs/dashboard-skeletons.md` §5b makes the marks
  form-first precisely so no two that can share a cell share a shape, and
  inventing a sixth form to split a distinction the day sheet spells out one
  tap away buys nothing.
- **The dashboard's new-booking modal and the customer's reschedule page both
  offered every time the business had open**, including the ones
  `validateSlot` was now going to refuse. Not a data risk — the gate holds —
  but a form you fill in and then get a 409 from is the same defect W4 fixed,
  one screen over. Both filter now, through `slotsForType()` in `lib/api.js`:
  one function beside the call whose payload it interprets, rather than the
  same three lines in three screens.
- **`scripts/e2e-booking.mjs` walked the flow by COUNTING Continue clicks**,
  and W19 inserted a step. Riverside, the tenant it books at, has an add-on —
  so the script was a step behind for its whole run and typed a street address
  into the vehicle-model field. It advances by HEADING now, which survives the
  next inserted step too. Two of its field fills were also targeting `input`
  by index and had phone and email the wrong way round; they target by type
  now. **Flagged honestly: that script's chromium path is Linux-only, so this
  change is reasoned, not run.** The same technique is exercised on every run
  of `sweep-booking-steps.mjs`.

The pattern worth keeping: **a column added to a shared table is a change to
every reader of that table, and the readers do not announce themselves.** The
grep that found all four was `dropoff_only` across `app/src` and
`supabase/functions`, and it took a minute.

**And a fifth, from asking the same question about `settings` rather than about
the table.** W4's card is hidden for a business that only works one way, which
means it reads `business_settings` — and **staff never see
`business_settings` at all.** The policy is owner-only to READ and it returns
staff zero rows rather than an error (PROJECT-STATE §6, "future staff screens
must use edge functions"). So a staff member's `settings` is null forever, and
treating the unknown as "both" would have printed *"Mobile and drop-off both
bookable"* to the one person the app cannot check that claim for — on a
mobile-only business, simply false.

The split is on where the fact comes from. **An existing restriction always
shows**, to staff included: it is a row in `dropoff_only_periods`, which they
can read, and it is worth knowing before they load the van. **The "both
bookable" resting state only shows to someone who can see the settings behind
it.** Verified by signing in as each: the owner gets three cards, the staff
account gets two, and with a mobile-only period set on the day the staff
account gets all three and reads "Mobile only — no drop-offs".

The general form, and it is worth carrying into Phase 3's tenant sites: **a
zero-row RLS read is indistinguishable from "the answer is no". Any default
applied to it is a claim, and the honest default is to say nothing.**

## Roadmap 2.8

**Research, not a build.** The five items 2.7 left open — W9, W10, W21, W22,
W25, plus the W27 thread — were all questions about what a detailer's
catalogue and constraints actually look like, and the reason they were held
back is that a guess would have been frozen into an append-only migration.
The full record is `docs/detailer-research-2026-08-31.md`: five real detailing
businesses' published menus and booking flows, one long thread of working
detailers talking to each other, three trade software vendors, and the trade's
pricing guides. What follows is only the judgment calls.

**Five menus is not a survey, and the file says so in its second paragraph.**
That matters more than it looks: the questions being asked are all of the form
"is our shape normal, possible, or impossible", which five real catalogues can
answer and a statistic could not. Anything that would have needed a real
sample size was left undecided rather than dressed up.

### Two of the five were misfiled as schema work

This is the finding that changes the most work. **W10 (add-on grouping or
reordering) and W21 (a service's full details) need no migration at all.**
`add_ons.sort_order` and `services.features` have both existed since the
foundation migration, the Catalog query already orders by `sort_order`, and
**no UI anywhere writes either one.** Both items are screens over columns that
are already there.

The lesson generalises past these two: the schema was built ahead of the UI in
several places, and "this needs a migration" was assumed rather than checked.
Grep the migration before sizing a catalogue item.

### W10 is reordering, and the groups he asked about would be wrong

He offered both — *"groups maybe… or maybe you could reorder stuff"* — and the
evidence picks one. Real add-on lists are short: 3, 6, 7 and 9 items across the
menus studied, and **not one of them groups.** Nine items under a single
heading is what the largest looked like. A groups table would be building for
a detailer none of the five resemble.

**The asymmetry with services is deliberate and worth writing down**, because
it looks like an inconsistency and is not: services DO group in the wild
(interior / exterior / protection / complete), `services.group_label` already
exists, and step 1 already renders it as a heading. Add-ons do not group and
should not get the same column.

### W21 is a live trap, and its ordering is not negotiable

`StepServices.jsx` renders `services.features` inline on the booking card,
capped at five entries. That is harmless today for exactly one reason: nothing
writes the field. **The moment W9 ships an editor for it, every tenant who
fills it in breaks W16 on step 1.**

Roadmap 2.7 measured step 1 at 18px of phone headroom with four services and
no inclusion lists. The menus studied run 5 to 10+ bullets per package. So the
rule is: **the disclosure control ships before or with the features editor,
never after.** That is not a preference and it is not the owner's call — it is
the difference between shipping a feature and shipping an overflow.

It is also why 2.7 named W21 as the lever for step 1's ceiling. It is the only
item that makes a card's height independent of how much the detailer wrote in
it.

### W22: the owner's premise was backwards, and saying so is the point

He added the *"I can provide access to water and an outlet"* question **for
himself**, believing he was the unusual one — no tank, no generator, and
*"most detailers do."* The research says the opposite: most working mobile
detailers use the customer's tap and the customer's outlet, ask when booking,
and report customers almost never object. Tanks appear as rarely-used backups
or as kit for commercial sites with no tap, and the businesses that ARE
self-sufficient sell it as a premium differentiator — which only works if it
is not the norm.

**So the customisation he asked for is smaller than he feared.** What varies is
not whether to ask; it is which resource, and what happens when the answer is
no.

The second-order finding is the one that sets the shape: **water and power are
independent.** A rinseless operator needs neither; a coating specialist working
in a customer's garage needs power and no hose. One boolean —
`business_settings.ask_water_electric`, `bookings.has_water_electric` — cannot
express either case on either side.

Decided: `water_requirement` and `power_requirement`, each `not_needed` /
`ask` / `required`, both defaulting to `ask` so no tenant's booking page
changes on migration day; `has_water` and `has_power` on bookings, nullable so
"not asked" stays distinguishable from "no". Two columns and two columns, no
new table, and it covers all three of his asks plus the electricity-only case
he named.

**The block goes in `_shared/slotValidation.ts`.** W4 in roadmap 2.7 found a
hole of exactly this shape — `dropoff_only_periods` reached the customer as a
note on the page and nothing on the way in ever read it, so a customer could
read the rule and book against it anyway. A `required` resource enforced only
by grey-ing out a React button is that bug a second time.

### W25 is one boolean, and the reason is where the exception falls

Four of the five real menus are pick-one. The fifth is genuinely multi-select —
but it is a shop whose **entire** menu is a la carte, not a shop that mixes
exclusive tiers with combinable items in one list. **That is what makes it one
setting rather than a per-service flag or a per-group rule**:
`business_settings.services_single_select`, recommended default on.

`group_label` is free text on the service rather than a groups table, so
group-level exclusivity would have meant a new table to hang the rule on. The
`services` / `add_ons` split we already have is the trade's own split — a
package plus extras — and it does not need a second mechanism layered on it.

### W9's honest answer is that the price is a floor, not a price

**All five menus publish a from-price or a range**, and the trade guides give
the same reason: condition decides labour hours and detailers price after
seeing the vehicle. Part of that spread is vehicle size, which we model. The
part we cannot express is that the number is a starting point. One boolean,
`services.price_is_from`, changes what the figure claims without changing any
arithmetic — it is owner decision 3 because it changes what a customer reads.

**The only schema-blocking part of W9 is the vehicle classes**, and it is
blocking for a specific reason: `bookings.vehicle_size` is a CHECK constraint
pinned to `('small','medium','large')`, so adding a class is a migration.
`services.vehicle_size_adjustments` is jsonb and would not have cared. Three is
below the trade norm of five — our "large" is doing the work of a pickup and a
full-size van, which are not the same job — but going to five adds setup work
for every tenant and touches every stored booking, so it is his call, and it is
the one of the four that gets more expensive the longer it waits.

Two more real gaps were found and deliberately left: **a service that cannot be
done mobile** (coatings need a garage; we model mobile-vs-drop-off per business
and per date, and the missing third level is per service), and **cure/hold
time**, which a single `duration_minutes` and a single contiguous slot cannot
express. Neither is named by an owner item. Deposits are the trade's standard
answer to no-shows and are blocked on billing, which charges nobody.

### W27: he was right, and three of the four gaps close for free

Real forms collect four things we do not. Parking/access notes — our "Anything
we should know?" box already covers it, a placeholder word rather than an item.
"How did you find us?" — we have campaigns, visits and `referral_code_used`,
which is a stronger instrument than a self-reported dropdown. Structured
year/make/model — every real form asks, but **nothing in this product would
read it**, and four fields of step height against W16 buys nothing; the one
free-text box stays until something needs the parts. Interior condition is the
one real gap, it is owner decision 4, and it pairs with the from-price: a
starting price is honest only if the detailer is told what they are driving to.

### Nothing was built, and that was the call

2.8 is a research item; the five builds are 2.7's. **Three of the four owner
decisions change the migration**, and migrations here are append-only, so
writing one before he answers would have meant guessing — which is the exact
failure this item exists to prevent. What was written instead is the migration
in full as a specification, plus a build order, so the next session does not
re-derive either.

## The owner's answers to 2.8, and the one that overruled the research

He answered all four decisions on 2026-08-31, the same day they were asked.
Two came back different from the recommendation, and **one of those replaced a
conclusion this project's own research had reached** — which makes it the most
useful entry in the item.

### He was the sixth menu, and five was not enough to find that out

The research studied five real detailing menus and concluded W25 was one
boolean on the business: four of the five let a customer pick exactly one
service, the fifth was wholly a la carte, so the split looked like a per-BUSINESS
property. That reasoning is sound and it is still in
`docs/detailer-research-2026-08-31.md`, marked superseded rather than deleted.

**It was wrong because his own business is a shape the five did not contain.**
Interior packages, exterior packages, and add-ons — *"they could click one from
each category."* One business-level boolean cannot express that: pick-one stops
him selling an interior AND an exterior, and pick-any restores the exact overlap
W25 exists to remove.

**The lesson is about the sample, not about the answer.** The research file
opens by saying five menus is not a survey; what that warning did NOT say
clearly enough is the specific failure mode. **Five real menus are enough to
rule shapes IN — "this is normal, this is possible" — and are not enough to
rule the remaining ones OUT.** Every conclusion of the form "so the rule can
live at level X" was quietly an exhaustiveness claim the sample could not carry.
The one detailer whose menu we can interrogate properly is the owner, and he
was not in the sample.

Worth carrying into Phase 3: when research narrows a shape, state which
direction the evidence runs. "Four of five did X" supports "X must be
possible"; it does not support "nothing else happens".

### The rule lives on the category, and the pattern is borrowed, not invented

Decided: a `service_groups` table — `name`, `sort_order`, and **`max_select`**
— with `services.group_id` pointing into it. `max_select = 1` is pick one,
`null` is pick any.

This is the restaurant point-of-sale **modifier group**, which has solved
exactly this problem for decades: a group of choices with a minimum and a
maximum number of selections, where "choose one" is min 1 max 1 and "choose
any" is an unbounded max. Toast, Lightspeed and the delivery platforms that
sync to them all model it that way. The trade's own menu-building advice
independently describes the same architecture for detailers — interior
services, exterior services, bundled packages, a la carte — and says explicitly
not to force customers into one pattern.

**`min_select` is deliberately NOT built.** The POS systems need a minimum
because a burrito has no equivalent of "the order must contain something"; we
already have that rule globally — a booking needs at least one service — and
nothing in the evidence needs a per-category minimum. It can be added later
without disturbing anything.

**`max_select` is an integer rather than a two-way switch** even though the
editor is a two-way switch today. Same storage, same UI, and an integer never
needs a second migration if "up to two" ever appears. Migrations here are
append-only, so cheap generality in a column type is worth taking where cheap
generality in code would not be.

### Why a table, when a jsonb blob would have been smaller

The cheaper shape was an ordered `[{name, max_select}]` on `business_settings`,
matched to the existing `services.group_label` text by name. It was rejected on
one failure mode: `group_label` is free text typed per service, so **retyping a
label creates a second category with no rule attached, which falls back to
pick-any.** That is a live customer-facing booking page silently reverting to
the behaviour W25 exists to remove, on a money path, with nothing to notice it.

A category is a thing the detailer creates, names and orders. It gets a row.
`group_label` is kept — append-only — and the migration backfills one group per
distinct label per business with `max_select` null, so no booking page changes
behaviour on the day it runs.

### Vehicle sizes: he chose customisable, and he was better evidenced than we were

The research recommended five fixed classes. He said the detailer should define
their own list, and **his answer is better supported by our own evidence than
the recommendation was**: of the menus studied, one uses twelve vehicle classes
and one uses five. Twelve and five is a range, not a norm, and "five" was the
median of a sample of two dressed up as a standard.

The blocker is unchanged and is the reason this was the schema-blocking part of
W9: `bookings.vehicle_size` is a CHECK constraint listing three values.
`services.vehicle_size_adjustments` is jsonb keyed by size name and
`_shared/pricing.ts` looks the key up rather than switching on it, so the
pricing engine never cared.

**One thing that is not optional: snapshot the label on the booking.**
`vehicle_size_fee` is already snapshotted and `booking_services` snapshots price
and duration, for the same reason — a detailer who renames or deletes a size
must not rewrite the record of jobs already done. Without
`bookings.vehicle_size_label`, last month's invoice starts printing a key that
no longer resolves.

### The measurement his answer forced, and it is the biggest finding of 2.8

Roadmap 2.7 wrote that W16 "cannot be true in the absolute for a list the
detailer controls" and left it as a principle. His answer on categories made it
concrete enough to measure, so it was measured — at 392x844, against the
running dev server and the seeded demo, by restructuring step 1's DOM into his
menu shape in the live page. Same CSS, same box model, no data changed.

| | |
|---|---|
| today: 4 services, 4 category headings | fits, **18px spare** |
| one service card | **97px** |
| one category heading | **17px** |
| **his menu: 2 categories, 3 services each** | **119px OVER** |
| the same, with the description folded off the card | **18px spare** (card 74px) |

**The owner's own real menu does not fit step 1 on a phone today**, and the
thing that fixes it is one change: the face of a service card becomes its name,
its price and its length, and the description joins the inclusion list behind
W21's control.

That is a change to what the research file originally said — W21 was written up
as being about `features` alone. **It is also a change in sequencing**: W21
stops being a sibling of the categories work and becomes its prerequisite,
because it is the only one of the five items that takes height OFF step 1 and
every other one adds.

The vehicle step has the same shape now that sizes are tenant-defined: 238px
spare, 79px per size card, so **six sizes fit a phone and the seventh does
not.** Past six it needs something denser than cards — a dropdown, which
`composition.test.mjs` permits above four options, the 2-to-4 range being the
segmented-control rule.

**The general form, and it is the third time this project has met it:** a
number measured against the demo business is a fact about the demo business.
Step 1's 18px, and now step 3's 238px, are the tenant's budget rather than
ours, and the honest question is never "does it fit" but "how much of it does
the detailer get to spend".


## Roadmap 2.8b — building the five, and three numbers that moved

The research (`docs/detailer-research-2026-08-31.md`) and the owner's four
answers left nothing to decide about *shape*. What follows is the calls made
while building it, and — more useful — the three measured numbers this project
had written down that turned out to be wrong once the code existed.

### The order was not a preference and it held

W21's disclosure shipped first, before the `features` editor, because
`StepServices.jsx` rendered that column inline and an editor without a
disclosure arms a step-1 overflow for every tenant who fills it in. Built in
that order, and the prediction was exact: a service card is **74px** on a
phone with its description folded away, against 97px with it. The owner's own
menu — two categories of three, which the demo seed now is — fits step 1 with
**47px spare at 392x844**.

### Step 1's binding screen is 1440x900, not the phone

This is the correction that matters most, and it was found only by running
`sweep-booking-steps.mjs` at **all four** verification sizes rather than at
the one every note about this item talked about.

A service card is **84px** at 1440x900 and 74px at 392x844 — `.bk-card`'s
padding is `clamp(15px, 3.6vw, 20px)`, so a desktop card is 10px taller — and
900px is the shortest screen we verify. Six services in two categories was
**19px OVER** there while the phone had 28px spare.

The fix was copy, not layout. With every category label printing "· choose
one", the step's intro sentence ("Choose one from each category you want…")
said what the screen already said three times, and it cost 19px on a desktop
and 38px on a phone because it wrapped. It is dropped wherever the categories
carry the rule and kept wherever they do not — a business with no categories
still needs to be told how many it may take. 1440x900 now has **10px spare**.

**So the next thing to break step 1 is a seventh service, and it breaks on a
laptop before it breaks on a phone.** Every previous note in this repo says
the phone is the constraint. It is not, any more.

### The vehicle-size ceiling is FOUR, and the research's six was not wrong when it was taken

2.8 measured step 3 at 238px spare, 79px per size card, and concluded six.
That measurement was taken before W27's condition question existed — and W27
lands on the same step, costing 120px. Re-measured with it in:

| sizes | 392x844 | 1440x900 |
|---|---|---|
| 4 | fits, 39px spare | fits, 23px spare |
| 5 | **over by 40px** | **over by 66px** |

So four cards, and a drop-down from five. Two things worth keeping from this:

- **The ceiling landed on the line the design system had already drawn.** A
  choice of two to four is a segmented control; anything longer is a list
  (`composition.test.mjs` test 2). The measurement and the law agreed without
  being made to, which is the only reason a `<select>` appears on this page at
  all.
- **A ceiling measured before a sibling feature lands is a ceiling with an
  expiry date.** Both numbers in this repo were honestly measured; the later
  one is real. Any note quoting a spare-room figure should say what was on the
  step when it was taken.

### The category rule swaps rather than refuses

`max_select = 1` could have disabled the other cards in the category. It
doesn't: tapping a second service in a "choose one" category swaps the first
out. A control that does nothing when pressed reads as broken, and the owner's
original W25 complaint was about being *confused* by step 1 — an unexpected
swap would have been the same complaint in a new costume. So the label states
the rule ("EXTERIOR · choose one") **before** anything is tapped, and the swap
is then the behaviour it promised.

Written as a cap, not a boolean, throughout — `siblings.length - cap` — so
"up to two" is already implemented if a detailer ever wants it.

### Both server guards were built as guards, not as validation

W4 in roadmap 2.7 found a rule the customer could read on the booking page and
book straight past, because nothing on the way in ever read the table. Both of
2.8b's new rules had the same shape available to them, so both are enforced in
the edge function and both have a test:

- **The category cap** is in `create-booking`, which is the only path that ever
  writes `service_ids`. `resolveServices` now selects `group_id` — in
  `_shared/pricing.ts`, so calculate- and create-booking still resolve services
  through exactly one implementation.
- **The water/power block** is in `_shared/slotValidation.ts` beside W4's, as
  the research directed.

`tests/booking-engine.test.mjs` tests 13 and 14 prove both, and test 14
deliberately proves the negatives too: "just ask" must NOT block (a detailer
who turns asking on would otherwise start refusing half their customers), and
a drop-off job is never blocked because the customer supplies nothing there.

**One deliberate narrowing, recorded because the research's wording is wider.**
The resource guard reads two OPTIONAL parameters, and reschedule-booking and
update-booking pass neither. It is genuinely at the junction — but unlike W4's
rule, which varies by DATE and so has to be re-checked every time a booking
moves, a resource answer does not change when a date does. Re-checking it on
reschedule would mean that a detailer switching to "must have" locks every
existing customer out of moving their own appointment, which punishes the
customer for a change made after they booked. The parameter is there; the two
callers that are not setting the answer do not pass it, and the guard skips.

### Deactivate moved off the Catalog row, and measurement is why

The reorder arrows (W10) need two 38px controls per row. A 392px row cannot
also hold "Deactivate". Rather than shrink anything, activate/deactivate moved
into the editor sheet, where it also belongs on its own merits: reordering is
something you do to the LIST; active is a property of the thing, and the sheet
is what edits properties. It costs one extra tap on a rare action, and it made
a previously impossible action possible.

### `group_label` is still written, and that is not an oversight

Every service save writes `group_id` **and** `group_label` (the chosen
category's name). The migration is append-only, the old column is what the
public-profile RPC's fallback reads, and `StepServices` prefers `group_id` and
falls back to the label so a service written before the migration still
appears under its heading. Same pattern for `has_water_electric`, which is
written as `has_water && has_power` alongside the two new columns: everything
deployed before 2.8b still reads the old one. Neither is retired until nothing
reads it.

### The disclosure is a real button, so the card stopped being one

`.bk-card` on the services step was a `<div role="button">`. Putting a second
control inside it would have been interactive content nested in interactive
content — the one thing `role="button"` must not contain, and some screen
readers never reach it. So the service card is a plain box now, holding two
real `<button>`s: the face (which carries `aria-pressed` and the service name
as its label) and the eye (`aria-expanded` + `aria-controls`). The padding
moved off the card and onto the controls, or half the card would have stopped
being a target.

Two consequences worth knowing before touching it:

- **The name is a `<span>`, not an `<h3>`.** A heading is flow content and a
  `<button>` may only contain phrasing content, so `<button><h3>` is invalid
  HTML. `.bk-h3` carries the h3's own type rules. It reads better anyway: an
  `aria-pressed` button labelled with the service name says more than a heading
  sitting beside a click target.
- **Only `.bk-svc` did this.** The extras, the vehicle sizes and the two
  location cards are still single-action cards and were left alone — there is
  no second control in them to nest.

The panel opens as a zero-height grid row (`grid-template-rows: 0fr → 1fr`)
rather than unmounting, so it opens and closes on one easing with no JS
measuring, and `visibility` rides along so the words are out of the
accessibility tree while they are out of sight. Clipped text a screen reader
still announces is worse than no disclosure at all. The inner `<div>` is
load-bearing: a grid item's own padding sits outside the row height, so
padding on the animated element leaves the card 40px taller while shut.

### Two defects were found underneath this item, and neither was ours

**Saving ANY settings screen threw you out of it, and had done since the
dashboard was built.** `BusinessContext.reload()` set `loading = true`, and
`App.jsx` renders a full-screen spinner while that is true — which unmounts
every screen, including whatever sheet you were standing in. Six callers do
this; Booking rules, Appearance and Business info all bounced the detailer
back to the More list on Save. It was invisible enough to survive the owner’s
whole walkthrough because it happens at the END of those flows. The vehicle
size editor writes on every arrow press, so it turned a wart into something
unusable, which is how it was found.

Fixed at the root rather than in six callers: `loading` now means "we do not
know who the tenant is yet", not "a refetch is in flight". It is keyed on the
user id, not on a bare boolean, because a DIFFERENT user signing in genuinely
has to show the spinner or the new tenant briefly wears the old one’s data.
Verified both ways: Booking rules Save now keeps its sheet open; sign-out and
sign-in still show the spinner.

**`scripts/e2e-booking.mjs` cannot run on this machine and has not been able
to for some time.** It hardcodes `/opt/pw-browsers/chromium-1194/...` and a
`/tmp/claude-0/-home-user-detailing-platform/...` scratch path — a Linux
container that no longer exists. It is NOT in CLAUDE.md’s verification list
and nothing depends on it, so it was left alone rather than fixed blind in an
item it has nothing to do with. **Roadmap 2.5 is the smoke test, and this is
the script it will reach for**, so the note is there too.

**The general form, and it is now the fourth time this project has met it:** a
number measured against one screen is a fact about that screen. 2.6 learned it
about widths, 2.7 about the demo's four services, 2.8 about the tenant's
catalogue — and 2.8b about which of the four verification sizes is actually
the tightest, which turned out not to be the one anybody was watching.


## The owner asked whether the categories were actually researched, and found a hole

He asked the same day 2.8b shipped: was the category system researched, will
it work for all detailers, and does it need a rule where choosing from one
category stops you choosing from another.

**The first answer had to be an admission.** 2.8b did no research of its own —
it built what roadmap 2.8's research specified, which studied five real menus.
That file's own second paragraph says five menus can rule shapes IN and cannot
rule the remaining ones OUT, and that limit had already cost this project once:
his own business was a sixth shape the sample missed. He was poking at the same
limit, and he was right to.

The new research is `docs/detailer-menu-shapes-2026-08-31.md` — five more real
menus (ten now) plus what Zenbooker, Square Appointments, Toast and Thryv
actually expose as settings.

### The hole is real, and it was reproduced rather than argued

**Oregon Detail Co** — a real shop — publishes *Full Detail Packages*,
*Interior Detailing* and *Exterior Detailing* as three separate categories.
Built in our system with each set to "customers pick one", which is the honest
way to describe each of them alone, a customer can select the $625 complete
package **and** the $320 interior **and** the $700 exterior: $1,645 for work
the first one already contains.

That menu was loaded onto the demo and put through the real page and the real
function on 2026-08-31. The page allowed all three. The price bar read
**$1,645.00 · 15 hrs**. `create-booking` returned 409 the first time — but for
*"that service would run until 23:00, past our 18:00 close"*, the hours guard,
which runs after the category check. With the durations shortened so the day
fits, the same three services **booked successfully at $1,645**.

Neither half of the enforcement sees it, and neither is broken: `max_select`
counts inside ONE category and there is exactly one service in each. The
relation it cannot express lives between categories.

**It is roadmap 2.7's W25 complaint, one level up.** He ticked "Full Detail"
and "Interior" together and found it confusing; the system built to stop that
reproduces it as soon as a detailer files their packages tidily.

### Pairwise "category A excludes category B" was rejected, and it is his idea that replaces it

His words were the pairwise shape, and rejecting the mechanism is not rejecting
the point. Two reasons, both from evidence:

- **Nothing in this market exposes it.** Zenbooker's modifier group has a name,
  a description, Required and Multi-Select — and nothing else. Square
  Appointments has one business-wide *"Allow multiple services to be booked
  online"*, off by default. Toast has min/max per group and *nested* modifiers
  that drill down, never sideways. Thryv does make services incompatible, but
  it **derives** that from what they already are (same location, staff,
  availability) and the business never hand-configures a pair.
- **It does not scale for the detailer.** Xclusive Detailing Customs runs six
  categories; saying "one service, please" would take thirty pairwise
  decisions at setup.

**Recommended instead: one boolean per category — "choosing from this category
is the whole booking."** Selecting anything inside it clears everything else.
It covers every shape in the ten menus, including two our current model cannot
express:

| Menu | Expressed how |
|---|---|
| Atlanta, SBL, Felix | one category, pick one — works today |
| **Oregon Detail Co** | mark *Full Detail Packages*. Interior and Exterior stay combinable, which is what that shop wants |
| **Xclusive**, one service overall from six categories | mark all six. Six checkboxes, not thirty pairs |
| **The owner's** | mark nothing — Interior and Exterior stay one-each, exactly as 2.8b built |
| à la carte | no categories, or pick-any — works today |

A business-level *"can they book more than one service"* switch was the other
candidate, copying Square. It handles Xclusive and the four one-service menus
and is simpler — but it is too blunt for Oregon Detail, which wants a
standalone interior and a standalone exterior combined, just never with the
complete package. The per-category switch does both; the business-level one
cannot.

**Not built without him.** It costs every detailer one more setting to read
past and it changes what a customer can do — the same test the four decisions
in roadmap 2.8 were handed over on. Roadmap 2.8c holds it.

### The general form, and it is the fifth time

A rule measured against one level of the structure is a fact about that level.
`max_select` is correct about what it counts. What it could not see was the
level above it — and nothing in the code was wrong, which is exactly why a
test would not have found it and a real menu did.


## Roadmap 2.8c — building the six, and the money bug underneath the pricing

The owner read the research and said "build everything". Six things, three
migrations, applied and verified one phase at a time. The design decisions are
in `docs/detailer-menu-shapes-2026-08-31.md`; what follows is what the building
turned up.

### The travel fee was displayed and never charged

**`business_settings.travel_fee` printed "+$25" on the booking page's "We come
to you" card, and `computeQuote` had no travel input at all.** It reached a
booking only as a hand-added `booking_line_items` row at finalize time. So the
customer was shown a mobile surcharge that the Estimated total underneath it
did not contain, on a money path, and had been since the quote engine was
written.

Found while scoping the distance pricing rather than by any test, because
every test asserted that the engine did what the engine did. `tests/booking-engine.test.mjs`
test 17 now asserts the fee is in the total, which is a regression test for a
bug that shipped.

### Travel areas are named, not measured

Zenbooker prices travel by "service territory". We have no geocoding and no
distance anywhere in the product, so a faithful copy was never available. The
built version is the detailer's own list of areas — `[{key, name, fee}]` on
`business_settings`, the same shape as `vehicle_sizes` — and the customer picks
theirs on the location step.

That is not a compromise so much as what the trade already does: a small mobile
business quotes "in town / out past the bypass", not miles. It is also the only
version that works without asking every customer for an address we can resolve.
Where a detailer sets no areas, the flat fee applies exactly as before.

### Surcharges join the SUBTOTAL, before the discounts

The order is now: services + size + add-ons + travel + surcharges → site-wide
sale % → promo → round. Travel and the surcharges go in *before* the discounts
rather than after, and the reason is worth stating: a weekend rate is part of
what the job costs, so "10% off" should come off the whole of it. Adding them
afterwards would mean a promo silently stopped applying to part of the bill,
which is the kind of thing a customer notices and nobody can explain.

Percentages are taken against everything before any surcharge, so two rules
that both apply do not compound in whichever order they happen to sit in.

### A rule that cannot be evaluated does not apply

The price bar is on screen from step 1, and the customer does not pick a day
until step 5. So for most of the flow a time-based rule has nothing to test
against, and `matchPriceRules` returns nothing for it.

The alternative — guessing, or defaulting to the surcharge — was rejected on
one argument: a price that goes DOWN when the customer picks a day reads as a
bait. Going up is a surcharge appearing with the fact that caused it, which is
what the review step's named line is for. **A rule with no day and no time
window still applies always**, because that is a flat surcharge and a
legitimate thing to want.

### Three things went wrong, and each one is a rule

**The travel-area picker put step 4 six pixels past the bottom of a phone.**
Fixed by cutting a line that restated the step's own heading — "How would you
like this done?" sitting under "Where should we do it?". That is the identical
cut, for the identical reason, as step 1's intro line in 2.8b, which is now
twice that the height was won back from copy rather than from layout. When a
step overflows, look for the sentence that is already on the screen before
touching a gap.

**The flat travel fee kept printing "+$25" beside areas charging $0 and $40.**
A different, wrong price directly above the right one. Adding a feature left
the thing it superseded on screen — worth checking for, because the sweep
measures height and nothing measures "is this number still true".

**`composition.test.mjs` test 1 caught cards-in-cards** in the two new settings
lists. It was right: they sit inside a `Setting`, which is already a card, so
they are boxes in boxes at one surface value — the same note Catalog's own
container carries. Both are `.row-item` ruled rows now. The test was not
contorted around.

### The emails and the invoice stopped adding up, and that had to be fixed too

The subtotal now contains travel and every surcharge, so a confirmation email
listing "Express Wash $65" above "Subtotal $105" had $40 unexplained between
them, and `send-invoice` — which builds its rows from `booking_services`,
`booking_add_ons` and `booking_line_items` — dropped both entirely. The
invoice's bottom line was still right, because that is `final_amount`, what was
actually collected; the itemisation above it simply did not reconcile.

Both itemise now. **A total that does not add up to its own lines is worse than
no itemisation**, because it looks like arithmetic and is not.

### Where each rule is enforced, and why it is the same three places every time

Four rules have now been added to `_shared/slotValidation.ts` — W4's drop-off
guard, W22's water and power, and 2.8c's per-service weekdays and service type
— and the argument has not changed since W4 found a restriction the customer
could read on the page and book straight past. It is where create-, reschedule-
and update-booking meet.

The per-service rules ARE passed by reschedule and update, unlike W22's
resource answers, and the difference is the reason: a resource answer does not
change when a date moves, and a weekday rule is *about* the date. Rescheduling
a Tuesday-only service to a Thursday has to be refused.

`available-slots` computes the same two rules again, independently, so the
calendar greys out exactly what the gate would refuse. That is the
double-validation pattern the file's own header describes: the two agree
because the rules are the same, not because they share code.

## Roadmap 2.9 — the 320px floor

PRODUCT.md has said "responsive 320→1440" since it was written and the product
did not keep it. Roadmap 2.6 measured four failures at 320 and deferred them on
purpose — none was one of the owner's items, and none is visible at any of the
four verification sizes. This is that item. `node scripts/sweep-widths.mjs 320`
exits 0 now, and 320 went into the script's default list.

**Four decisions collapsed into one.** The item was written as "each needs its
own layout decision", and after measuring all four on the running app they are
the same decision: below 361px a settings sheet gives a control **244px**, and
two of anything will not share 244px. So the fix is one media block in
`app/src/theme.css` (§ THE 320 FLOOR) whose whole content is *pairs stack*.
Nothing above 360px changed; 1920, 1440x900, 768x1024 and 392 render
identically, which was checked rather than assumed.

**The measurements, taken on the running app, not reasoned about:**

| what | wanted | had |
|---|---|---|
| `.grid2`, two fields | 288px | 244px |
| `.day > .times`, two time fields and "to" | 303px | 244px (and **284px at 360**) |
| `.segmented`, three sentence labels | 295px | 244px (and **284px at 360**) |
| `.btnrow`, three small buttons | 298px | 280px |
| `.swatch-row`, 6 x 44 | 304px | 282px |

**THE FINDING WORTH MORE THAN THE FIX: a clean sweep means nothing is off the
SCREEN, not that nothing is off its box.** Two of the four were already
overflowing their card at 360px — the time fields by 19px, the segmented
control by 11px — and the card's own 18px of padding absorbed it, so neither
ever crossed the viewport edge that `sweep-widths.mjs` watches. 360 has been
reported clean for two roadmap items with both of these broken inside it. They
were found by walking each element and comparing its right edge with its
parent's content box, in a throwaway script — and the throwaway became the
sweep's third check, `past-parent`, because it turned out to be quiet. **It was
baselined against the pre-2.9 commit before being trusted**, per this file's own
rule about new checkers: at 360 on that commit it reports exactly the four
failures and nothing else, and on the fixed code it is silent at 392, 360 and
320 in both paths. Its one false positive was a parent with `display: contents`
(`.bk-step`), which has no box to be outside of; parents that scroll sideways on
purpose and elements positioned out of flow are skipped for the same reason.
`sweep-widths.mjs` also gained `--lite`, which `sweep-booking-steps.mjs` has had
since 2.7 and whose absence here cost this session a scratch copy of the whole
script.

**Why each of the five went the way it did:**

- **Time fields stack, and the 12-hour display stays.** The roadmap offered
  "stack, or lose the 12-hour display". Chromium will not draw
  `input[type=time]` under 138px, so two of them plus "to" cannot share a
  244px line at any spacing — and the alternative was to strip the AM/PM from
  the one screen a detailer reads in daylight. Stacked, "to" stops saying
  which field is which, so each field took its own word: **Opens / Closes**.
  Third item running where the lever was COPY rather than layout.
- **The segmented control goes full width and wraps, it does not become a
  `<select>`.** The design system's composition rule is explicit that two to
  four exclusive choices is a segmented control, and the reason is that a
  segmented control cannot express the invalid state. At 320 the three columns
  are 77px and "They come to me" sets on three lines; `text-wrap: balance`
  makes the rag even. Ugly is acceptable, a dropped rule is not. Vertical
  stacking was rejected because it would have applied to every segmented
  control in the app, including "Apple / Google / Waze", which fits fine.
- **Three small buttons lose padding, not labels.** `.btn.sm` carries 18px a
  side; three of them across is 108px of padding in a 280px row. They are
  stretched to equal widths by `flex: 1` anyway, so dropping to 8px changes
  nothing about how they look — it just stops them shoving each other off the
  card. Icons and words both stay.
- **The palette is 4x3, not smaller circles.** Six columns fit only by
  shrinking the swatch from 44px to about 40px, and 44 is already under the
  46px tap floor the accessibility section names. Twelve is a whole rectangle
  either way, which is the property the existing comment on `.swatch-row` was
  protecting.
- **A FIFTH thing was fixed, and the sweep never saw it.** A `Setting` with
  its control on the right kept 96px for its explanation and printed
  "Replaced by / your travel areas / below — each / area sets its own / fee."
  Nothing clipped, so nothing was reported; it was found in a screenshot. Below
  361px a setting puts its control under its words. **A switch is exempt** —
  46px costs the sentence nothing, and a toggle sitting under its own label
  reads as a second setting rather than as this one's control.

**One structural change, deliberately small.** `Hours.jsx` wraps each time
field in `.tfield` with a `.tlab` beside it. Above 360px the wrapper shares
space exactly as the bare input did and the labels are `display: none`, so the
desktop row is untouched; it exists only so the fields can carry their own
words below the breakpoint.

**320 joined the default sweep.** While it was failing on purpose it had to be
an argument somebody remembered to type. A promise in PRODUCT.md deserves a
gate that runs itself, so `node scripts/sweep-widths.mjs` with no argument is
now 392, 360 and 320. Pass widths to ask a different question.

## The owner reopened the dashboard's architecture

Asked on 2026-08-31, in the same message that queued roadmap 2.9. His point:
the five bottom tabs and the eleven settings sheets behind More are a copy of
the admin page he built for his own business, "made not with much thought into
it", and the product needs the layout a detailer would want rather than the one
Andrew happens to have. He asked for it to be put on the list rather than done
on the spot, and it is **roadmap 2.10**, with his own words quoted in full
there.

**What is and is not reopened, because this is the part a cold session will get
wrong.** The LOOK is not reopened: `docs/design-system.md` is still law and the
skill-collision rule still bars every direction-generating skill. What is
reopened is the INFORMATION ARCHITECTURE — which tabs exist, whether five is
the right number, what belongs on each, and how More is grouped, ordered and
named. A thing can move to a different screen in 2.10 without changing what it
looks like when it gets there.

**It is sequenced as research → written proposal → owner approves → a separate
build item**, which is the shape 2.8 → 2.8b already proved on this project. No
code changes in 2.10 itself. **And the constraint he stated twice is that the
current dashboard is the anti-reference** — the tabs get derived from what a
detailer does in a day, then compared with what we have, rather than
rearranged from it.

## Roadmap 2.10 — the architecture proposal

Research and a written proposal only; **nothing in `app/` changed**, and the
owner approves before any code. The deliverable is
`docs/dashboard-architecture-2026-08-31.md`. Judgment calls made while writing
it:

- **The derivation was run before the comparison, and the result is reported
  honestly rather than dressed up as a bigger change.** A detailer's day
  contains five recurring questions plus one thing that is not a question
  (how the app behaves for me). Questions 1–4 land exactly on Today, Calendar,
  Money and Clients. **Four of five tabs survive untouched**, and saying so was
  more useful than manufacturing novelty — the roadmap asked for it explicitly,
  and a proposal that moved everything would have been a worse answer, not a
  bolder one.

- **The finding the whole proposal turns on is a comparison, not an opinion.**
  Jobber's "More" holds nine things and **not one of them changes what a
  customer sees**; Housecall Pro puts the same class of thing behind a gear.
  Ours holds the menu, the prices, the hours, the promo codes, the photos, the
  colour and the booking link. Separately, **"what you sell" is a top-level
  destination in five of six trade products** — Housecall Pro gives it a tab
  called Price Book, Zenbooker lists Services first — while ours is one row in
  the second group of a screen called Settings, and is our largest file
  (`Catalog.jsx`, 614 lines).

- **The fifth tab is named "Your page" and the name is doing work.**
  "Business" was the safer word and was rejected: a broad name is how a junk
  drawer starts, which is the exact failure being fixed. "Your page" buys an
  admission test for free — *a row belongs here only if it changes what a
  customer meets on your page* — and that rule is worth more than the
  re-grouping, because it is what stops More re-forming under a new name.

- **Settings moved to a header gear rather than keeping a sixth tab.** Two
  reasons, and the second is the binding one: a phone tab bar holds five, and
  **design-system law 1 gives every screen a different skeleton** — there are
  exactly five skeletons and a sixth tab would owe the system a sixth. The
  proposal needs none: "Your page" inherits the panels skeleton More gives up,
  and the Settings sheet is the "form in a sheet" all eleven sheets already
  are. The trade is split here (Housecall Pro and Square use an icon, Jobber
  keeps a More tab), so it is named as a real risk rather than as settled.

- **Booking rules was NOT split, and that is the one place laziness won on
  purpose.** It is the largest sheet (541 lines, four sections) and it does two
  unrelated jobs — where you work and what travel costs, versus when you can be
  booked. Splitting it costs a habit for a payoff its own internal headings
  already half-deliver, and splitting it later costs exactly the same. Offered
  to the owner as decision 4 with that reasoning rather than done.

- **Clients was re-conceived rather than removed.** A phone book does not earn
  a slot in a five-button bar, but Customers is 6 of 6 in the trade, so the
  answer was to give it a job: sort and filter by last visit, lifetime value
  and "not seen in three months" — which needs **no schema**, since every
  figure comes from `bookings`, and which is already the agreed deferred item.
  **Automated re-book nudges were explicitly refused**: they need a
  last-contacted column, a scheduler decision and a spam judgment, and that is
  a feature rather than an architecture.

- **The weak evidence was labelled and confined to ordering.** The day-in-the-
  life write-ups and the vendor claims about follow-up are marketing-adjacent,
  so they were used only to ORDER an item that was already agreed, never to
  justify one. The six-product table carries a source-strength line per column
  — Jobber STRONG (its own help centre names the bottom bar), fieldd WEAKEST
  (marketing pages) — because navigation is the part of a product a vendor
  documents worst, and a table that hid that would read as six equal
  observations.

- **`campaigns` / `track-visit` was left deliberately unplaced.** It is half an
  attribution feature with no interface, it is a report rather than a page
  setting or a Money figure, and inventing a sixth destination for something
  nobody has asked for is the exact mistake 2.10 exists to undo. Recorded in
  §6 as unsettled rather than filed somewhere plausible.

- **No inbox, and the slot is not reserved.** Messages is top-level in four of
  six products and we have none — but two-way texting needs a dedicated
  number, carrier registration and a per-message cost. That is a business
  decision and a build, not a tab. Named so it is not rediscovered as an
  oversight.

**Three defects found while taking the inventory, none of them fixed here
because this item changes no code:**

1. **The push-notification switch does nothing.** `Notifications.jsx` offers
   "Push notifications on your phone", it writes `push_enabled`, and
   `send-owner-reminders` genuinely calls `sendOwnerPush` when it is on — but
   there is **no client code anywhere in `app/`**: no service worker, no
   `PushManager`, no call to `owner-push-subscribe`, no permission prompt. No
   device is ever registered, so nothing is ever delivered. Three edge
   functions and the whole `/job/:id` route ("what a push-notification tap
   opens") exist for a feature with no front end. Either the subscription gets
   written or the switch comes off until it does.
2. **Staff are shown "Your colour" and the database refuses the save.** The
   row is flagged not-owner-only in `More.jsx`, `Appearance.jsx` has no role
   check, and `business_branding` is member-READ / owner-WRITE.
3. **A staff member's entire More screen is two rows** — "Your colour" (broken,
   above) and "This device". A tab slot for two rows, one of which lies.

**And four tables have no interface at all:** `testimonials`, `campaigns` +
`campaign_visits`, `monthly_plans`, `business_domains`. Three of the four are
things the owner has already said come back or are coming (see *Owner
decisions* and roadmap 3.3), so the proposal gives each a named home rather
than leaving them to be rediscovered.

**Nothing was verified in a browser, because nothing was built.** The two
measurements the proposal defers — the header carrying a business name, a `+`
and a gear at 320px, and the new tab's scroll depth — belong to the build item
and are called out there.

## Roadmap 2.10, part B — the owner widened it to every screen

He answered the five decisions and widened the item in the same message
(2026-08-31): *"The layout / redesign was more than just the order of the tabs
but of every GUI and how things look and are laid out, going through every
single GUI tab page whatnot."* **Decision 2 he answered himself — "I think
business is a better name" — and delegated the other four.** Part B of
`docs/dashboard-architecture-2026-08-31.md` is the screen-by-screen pass, and
**two new decisions (§B6) are open.** Still no code.

- **His answers, recorded:** fifth tab = **"Business"**; delete More (yes);
  Clients becomes the bring-people-back screen, manual only (yes); Booking
  rules stays one sheet (no split); `+` in the header (yes, measure 320 first).

- **CHOOSING "BUSINESS" COST SOMETHING AND THE COST IS WRITTEN DOWN, not
  argued with.** "Your page" was recommended because the name itself refused
  anything a customer could not see — the admission test came free with the
  label. "Business" admits anything, which is the exact property that let
  "More" fill up. So the rule is now stated explicitly in the file instead of
  being carried by the name: *a row belongs on Business only if it changes
  what a customer meets; if it changes how the app behaves for the detailer it
  goes behind the gear; anything that is neither is a new destination or is
  not built.* Without that sentence in a file, "Business" is "More" renamed
  and this item recurs.

- **"How things look" was read as composition and layout, not as a new visual
  world**, and the reading is stated at the top of the file so a cold session
  cannot take Part B as licence. The design system is still law, the
  skill-collision rule still holds, and Part B proposes no colour, face, token
  or motion. What it does change is which container a thing is in, how many of
  them there are, and what a screen does at a width nobody designed it for.
  **If that reading is wrong he will say so; guessing the wider reading would
  have re-opened a direction he has already approved and praised.**

- **THE BIGGEST FINDING OF THE WHOLE ITEM CAME OUT OF PART B, NOT PART A:
  there is no desktop layout at all.** `.app-main` is 760px and the content
  column 724px at **every** width from 768 up — measured, not estimated. The
  proof that it is a real cost rather than an aesthetic complaint is that two
  pages are the same HEIGHT on a monitor as on a phone: More is 1,620px at
  1920 and 1,626px at 392, and Calendar's History is **3,619px at 1440 and
  3,619px at 392, identical to the pixel.** Sixty per cent of his own 1920
  monitor is unused. Proposed as three cheap moves (grow the column where
  content is tabular; two columns on the three screens with two readings; let
  rows show the columns they already compute) rather than a second design,
  with law 1 as the constraint: a skeleton may have a wide form, but it must
  stay the same skeleton. **It is decision 6, and it is recommended LAST** —
  it is the only stage that adds work rather than moving it, and every other
  stage is easier to do narrow and then widen.

- **A test was found that cannot see the failure it exists to catch, and that
  is decision 7.** `composition.test.mjs` test 1 enforces "records are lists,
  cards are objects" by matching a `.map(...)` whose callback contains a
  `className` with `card` **in the same file**. Calendar's History maps onto
  `<BookingCard>` — a component, no className in `Calendar.jsx` — and
  `BookingCard.jsx` is itself on the ALLOWED list. **So any screen may render
  an unbounded list of cards through a component and pass.** History does: 18
  bookings, 18 cards, 3,619px. This is the *"a skipped check reads exactly
  like a passing one"* family in a new shape — not a check that was skipped, a
  check that is blind to the common violation — and the recommendation is to
  fix the test in the same change as the screen, because fixing either alone
  lets it return.

- **The audit was done by LOOKING, and one claim was withdrawn because of it.**
  68 screenshots at 1920/1440x900/768x1024/392x844 via `shoot-dashboard.mjs`,
  plus four surfaces that script cannot reach driven by hand. On seeing
  "Small / Medium / Large" in the New booking modal the first conclusion was
  that the owner's own form ignores W9's tenant-defined vehicle sizes — **and
  the code says otherwise**: it reads `settings.vehicle_sizes` and falls back
  only when the tenant has defined none. Checked before it was written down.
  **The neighbouring claim survived the same check and is real:** the modal
  renders services as a flat chip wrap with no categories and no `max_select`,
  while `create-booking` enforces both on the server — so the owner can fill
  the form in and be refused with *"Please choose just one service from
  Exterior."* Same shape as roadmap 2.7's W4: a rule that lived on the
  customer's page and not on the gate the owner goes through.

- **Twenty-one findings are tabled in §B4 and NONE is fixed**, because the item
  changes no code. Five are live defects rather than composition: the push
  switch, the staff colour row, the New booking rule gap, the superseded
  travel-fee field that is still editable (in a product that has already
  shipped a travel fee it printed and never charged), and a "Last visit" that
  can print a future date.

- **Six patterns were named rather than only their instances**, because the
  pattern is cheaper to fix and stops the instances returning: an empty state
  that repeats itself; one action with three doorways; records drawn as cards;
  a group heading that owns one row; a control that is shown and cannot work;
  and the phone layout shipped to the monitor unchanged.

- **A gap in the demo data is recorded as a gap, not worked around.** Today is
  a Monday and the demo business is closed Sunday and Monday, so the Today
  screen could only be photographed EMPTY — and the seed puts "completed and
  paid" jobs on tomorrow's date, which cannot happen in life. **The busiest
  state of the busiest screen in the product has still never been looked at.**
  The build item should seed a realistic day before it starts, or it will
  redesign Today from its emptiest state.

- **A footnote on the index checker, because it is the third blind-spot story
  in one session.** `scripts/decisions-index.mjs` **passed before this
  section's index line was written**, and it was right to: `key()` compares
  only a heading's opening clause — up to the first em-dash, colon, comma or
  bracket — so "Roadmap 2.10, part B" reduces to "Roadmap 2.10", which the
  index already contained. Its own comment says it *"errs toward passing on
  purpose"*, so this is a documented tolerance rather than a bug, and nothing
  was changed. **What is worth knowing is the shape:** a SECOND section whose
  opening clause matches an existing one is invisible to that check. The index
  line was written by hand regardless, per CLAUDE.md.

## Roadmap 2.11 — he asked for the dashboard from scratch

Same message that answered 2.10's last two decisions (2026-08-31). He took
decision 6 (*"desktop should get an actual layout specified just for
desktop"*), declined decision 7, and then replaced what would have been
2.10's build item with something larger: *"create the entire admin dashboard
from scratch… forget everything about it… know every single aspect of all the
features that's gonna be in the admin dashboard, and then create it from
scratch… I wanna do it properly, from the start. Because last time the admin
dashboard was created, it was good, but it was just kind of created."* The
item, the order and the skills are `docs/roadmap.md` 2.11.

- **HIS "I DON'T LIKE THE QUESTION" WAS TAKEN AT FACE VALUE AND HE WAS RIGHT.**
  Decision 7 asked him to rule on the internals of a test. That is a craft
  decision, not an owner decision, and putting it on his list was the mistake
  — not his refusal to answer it. **The finding is unaffected and does not go
  away:** `composition.test.mjs` test 1 still cannot see a card rendered
  through a component, and History still draws 18 records as 18 cards. It is
  now settled inside 2.11 step 5, where the component inventory decides once
  what a list is and what a card is, and the test is written to match.
  **Nobody re-asks him.** The general lesson is worth more than the instance:
  CLAUDE.md says never hand him a decision without what he needs to make it —
  the unstated other half is **never hand him a decision that was never his**.

- **THE ONE QUESTION THAT IS GENUINELY HIS IS ASKED AND NOT GUESSED.** He said
  *"using the correct direction"*, and *direction* is this project's word for
  the visual world. Reading (A): the design system stands and the SCREENS are
  rebuilt on it. Reading (B): the visual direction reopens too. **They are
  different projects** — (B) would re-open something he approved after fifteen
  rounds of his own corrections and then praised (*"I really like the
  design"*), and DECISIONS.md's own list of the five costly mistakes has
  "do not re-propose what he has decided" at number five. **But (A) guessed
  wrongly means the whole rebuild sits on a foundation he wanted revisited.**
  So the item is WRITTEN for (A), with the reasons on the record, and the
  question sits at the top of it in a form a cold session cannot miss — rather
  than being resolved silently either way. If he answers (B), step 0 becomes a
  direction round and nothing else in the plan changes.

- **"From scratch" was scoped rather than taken literally, and the scope is
  written into the item.** Taken literally it would re-derive the tab bar he
  approved hours earlier, and re-open the schema, the quote engine and the
  booking flow — none of which he was talking about. What it means here: the
  SCREENS, their components, their layout and their desktop form. What is
  carried in as settled: 2.10 Part A's architecture (five tabs — Today,
  Calendar, Money, Clients, **Business** — a gear for plumbing, `+` in the
  header), decision 6's yes, and Part B's 21 findings as the list of what not
  to reproduce.

- **The order was designed around the phrase he used — "know every single
  aspect… and THEN create it from scratch".** That sequence is the whole
  point, so step 1 is a complete feature inventory that HE approves before a
  single screen is designed, drawn from five sources: what the dashboard does
  today; what has a table or an edge function and no UI (`testimonials`,
  `campaigns`, `monthly_plans`, `business_domains`, owner push); what he has
  already said comes back (monthly plans, referral/loyalty, calendar sync, the
  test-booking preview, the vCard); what Phase 3's tenant websites will need
  the dashboard to run; and what the trade's six products carry that we do
  not. **You cannot lay out a dashboard around features you have not listed**
  — and that, not the redrawing, is the difference between this and "the same
  thing again".

- **Research is step 2 because 2.10 only did half of it.** 2.10 researched
  NAVIGATION — which tabs, in what order. It never researched how an
  individual SCREEN should work: the day view, the job record, the money
  screen, the client record, dense list design, desktop dashboard layout.
  Same discipline as 2.8 and 2.10 — vendors' own documentation rather than
  review sites, source strength marked per claim, counts rather than
  impressions, and what the sample cannot tell you written down.

- **The desktop spec is step 3 and it is a SPECIFICATION, because that is the
  word he used.** Not breakpoints bolted onto the phone layout. And it carries
  a condition that is easy to drop: **`scripts/sweep-widths.mjs` grows the
  desktop widths in the same item**, or the desktop layout is the only part of
  this product that nothing automatically checks — which is how the 360px
  parent-box defects survived two roadmap items.

- **Nothing is built before step 6 and he approves the whole specification
  first.** This is 2.8 → 2.8b and 2.10 → 2.11 again: research, a written file,
  his answer, then a build. It is the shape that has worked twice on this
  project, and it is the shape he named when he said he wanted it done
  properly from the start.

## "The look stays" — what that actually fences off

He answered 2.11's open question on 2026-08-31 with *"The look stays"*, and
then asked the question that mattered more: *"but that means like just the
colors and like fonts stuff like that right"*. **It does not, and the gap
between those two sentences is exactly the ambiguity that would have been
re-litigated at every screen** — so the boundary is written out in roadmap
2.11 in three buckets instead of resting on the phrase "the look".

- **The phrase was doing more work than he thought, and telling him so was the
  whole job.** "The look" in this repo is the design system, and the system
  carries four things beyond colour and type: the single dark ground (law 14
  — he killed the light theme himself), the tenant-accent rules (law 11b — the
  accent is identity, never meaning; paid is always the fixed green), the
  motion budget (law 3 — one staggered reveal per screen, no scroll
  choreography), and the accessibility floors. **Left as "the look", a later
  session would have read it as "colours and fonts" — his own words — and
  quietly reopened three laws he never meant to touch.**

- **Bucket 2 exists because a frozen vocabulary would have been the wrong
  answer.** The composition set (lit card, quiet card, ruled list, receipt,
  rail, bare figures, sunken panel) is fixed IN KIND but may GROW — the
  desktop specification will very likely want a table, which is not in the set
  — and the growth happens once, deliberately, at step 5's component
  inventory, with `docs/design-system.md` updated first. What is banned is the
  thing that actually goes wrong: each screen inventing its own fourth kind of
  list. **Saying "the vocabulary is frozen" would have been simpler and would
  have forced the rebuild to either break the rule or ship a worse desktop.**

- **Law 1 was flagged to him rather than filed under "the look", because it is
  the one fixed rule that constrains the REBUILD rather than the styling.**
  One continuous ground, every screen a structurally different skeleton — it
  is why Today is the only rail, Calendar the only grid, Money the only chart,
  Clients the only screen with no panel. At step 4 that forbids two tabs that
  resemble each other even where that is the easy answer. **It stands, with
  the recommendation to keep it**: it is what stops five tabs collapsing into
  five stacks of identical rounded boxes, which is a failure this product has
  already had once (`docs/ux-audit.md` G3, and Clients was the proof).

- **Bucket 3 is deliberately everything else, and it is where "from scratch"
  means what he said it means:** which block each screen uses and how many,
  what is on each screen in what order at what weight, every layout on both
  phone and desktop, and every state — empty, one, twelve, loading, error,
  staff. A blank page, on a foundation that is not.


## Roadmap 2.11, steps 0–2 — the day is seeded and the list is written

2026-08-31. Steps 0, 1 and 2 of the six. Nothing past step 1's gate has started:
**he approves the feature inventory before a single screen is designed**, which
is that step's entire reason for existing. Files:
`docs/dashboard-feature-inventory-2026-08-31.md`,
`docs/dashboard-screen-research-2026-08-31.md`. Briefing: PROJECT-STATE.md §6i.

- **THE PREREQUISITE WAS NOT PAPERWORK, AND IT PAID FOR ITSELF IN ONE MINUTE.**
  The roadmap made "seed a realistic day" step 0 on the argument that Today had
  only ever been photographed empty. Within a minute of Today having jobs on it,
  `sweep-widths.mjs` — which had been green for two roadmap items — reported a
  job card's three action buttons **6px outside their own card at 392 and 18px
  at 320.** The row only exists on a job card, and no job card had ever been on
  a swept screen. **A check cannot see a component that never renders**, which
  is the same family as this file's "a skipped check reads exactly like a
  passing one" and the 360px parent-box defects: the instrument was fine and the
  fixture was starving it.

- **THE BTNROW FIX WAS TAKEN EVEN THOUGH 2.11 BUILDS NO CODE BEFORE STEP 6, AND
  THE REASON IS THE GATE RATHER THAN THE BUG.** The rule about no code is about
  the REBUILD. What happened here is that a step-0 change turned a standing
  verification gate red; leaving it red means every later session in this item
  cannot tell its own regressions from this one. Two rules in `theme.css`, and
  they are visually inert above 360px because the buttons are `flex: 1` and were
  already stretching to equal thirds — padding only sets the MINIMUM, and
  `min-width: auto` on a flex item is what stopped the row shrinking past it.
  **Roadmap 2.9 had measured this exact row** (".btnrow three sm buttons 298px
  wanted / 280 there") **and fixed only the width it could see**, ≤360, because
  the only place it could observe the row was the Clients sheet. The padding rule
  moved out of that media query; the 320 rule went to 4px padding and a 4px
  gutter. **Measured after: 291px in 292px at 392, 219px in 220px at 320 — 1px
  of spare room at both, and that is a real ceiling worth quoting, not a pass.**

- **THE SEED'S FIX IS A RULE, NOT A DATE.** Two halves. The demo's closed days
  are now `[Sun, Mon]` minus today's weekday, so the business always trades
  today while still having days off and closed calendar cells — five days in
  seven nothing changes at all. And **no seeded row says "completed"**: a job is
  completed once it has ENDED, compared against the clock at seed time. That is
  the only rule that cannot produce the thing Part B row 21 complained about, a
  job finished and paid on a future date. **The cost is stated rather than
  hidden: what Today draws now depends on the hour the seed is run.** Seed in
  the morning and the day is ahead of you; seed after 18:00 and it is behind
  you. Both are real states and neither is a lie.

- **FIVE JOBS IS NOT A NUMBER THAT WAS CHOSEN TO LOOK BUSY.** 08:00–18:00 with
  45 minutes between jobs, which is this business's own `buffer_minutes`, so a
  customer could actually have booked the day the seed writes. Five is therefore
  the busiest day these settings ALLOW. A seed that ignored its own buffer would
  be showing a day the booking engine would refuse.

- **THE STATE THAT HAD NEVER EXISTED.** Every "completed" row the old seed wrote
  also carried `finalized_at`, so `Today.jsx`'s `needFinalize` was always an
  empty array. That single fact meant **the lit card — the whole of
  `dashboard-skeletons.md` §6's "money not yet recorded outranks the next job"
  — and the warn-box had never once rendered against data** in the life of the
  product. The seed now leaves the two most recent finished jobs unrecorded.
  Same lesson as roadmap 2.4's cancelled and no-show rows: **a status with no
  seed row is a status nobody ever looks at.**

- **THE EMAIL COLOUR DEFECT IS THE COSTLIEST MISTAKE IN THIS FILE'S OWN INDEX,
  IN A FOURTH PLACE.** "A tint of the accent is a ground" has been paid for in
  2.3, 2.4 and 2.6. This one is worse in kind, because it is not a wrong ground
  — it is a surface with **no floor at all**. `primary_color` and
  `secondary_color` swap roles between the app and an email: in the app
  `primary_color` IS the tenant's accent, and in
  `_shared/emailTemplates.ts` it is the dark band behind the business name while
  `secondary_color` is the accent — the confirmation button, every section
  label, the site link, and the invoice email's own title. "Your colour" writes
  only `primary_color`; `secondary_color` is reachable only from an
  `<input type="color">` on *Business info*; and `create-business` inserts a
  branding row with **both columns null.** Measured today against the twelve
  presets on the colour screen: white on the header band is under WCAG's 3:1
  large-text floor for **Silver 1.45:1, Sunflower 1.92:1, Sky 2.77:1 and Gold
  2.94:1**, and a tenant who picks **Sky** — the platform's own default and the
  demo's colour — gets the invoice email's title drawn in `#0ea5e9` on a
  `#0ea5e9` band. **1:1. The same colour on itself.** `accent-sweep.mjs` does
  not reach email and there is nothing else that would.

  **Not fixed here, and deliberately NOT put in front of him**, which is the
  judgment worth recording. It looks like an owner question — "is your brand
  colour one colour or two?" — and it is not one, because **law 11 already says
  a tenant has ONE accent.** The second picker on Business info is a schema
  column that grew a field, not a choice the product is offering. So the fix is
  craft: one colour written to both columns, the email path given the same
  contrast floor as every other surface, and `accent-sweep.mjs` grown to reach
  it. That is the other half of "never hand him a decision that was never his" —
  **a defect big enough to feel like a decision is still a defect.**

- **THREE OF THE FIVE NEW DEFECTS ARE DELIBERATELY NOT PATCHED, AND THAT IS THE
  RIGHT CALL RATHER THAN A DEFERRAL.** Today's "NEXT UP" over a job that
  finished four hours ago, the rail drawing a finished job as "ahead", and a
  paid job's rail node taking the tenant accent where the calendar's takes the
  fixed green. Each is a symptom of one thing: **the rail has two states and the
  day now has three.** Patching the label, or the class, or the colour
  separately would be three edits to a screen that step 4 rebuilds anyway, and
  each would settle by accident a question step 5 is supposed to settle on
  purpose — what a completed-but-unpaid job IS. Recorded with measurements
  instead.

- **THE INVENTORY'S THREE NUMBERS ARE WORTH MORE THAN ITS 118 ROWS.** 23 of the
  118 are about one job, and that object lives in a single 340-line sheet with
  no structure — which the research then independently confirmed is unlike
  every product that documents its own job screen (3 of 3 use tabs or named
  sections). 37 are configuration, nearly a third of the product, and it is what
  a customer meets — the number behind Part A's Business tab. And 7 have a
  working back end and no working front end, three of the four things Phase 3's
  websites are missing being among them. **A rebuild that redraws the 98 working
  rows and leaves those seven where they are has done the redrawing without the
  thinking**, which is exactly the complaint the owner made about the first
  dashboard.

- **THE COUNTS WERE WRONG IN THE FIRST DRAFT AND THE FIX IS WORTH RECORDING,
  BECAUSE IT IS THE FAILURE THIS FILE WARNS ABOUT ELSEWHERE.** The prose summary
  was written from memory of the table rather than from the table — "92 work,
  6 broken, 9 with no screen" against an actual 98 / 4 / 6 — and it was caught
  only by counting the rows mechanically afterwards. **A summary that disagrees
  with its own table is worse than no summary**, for the same reason a stale
  index is worse than none: the owner reads the summary and never counts the
  table. Every count in the inventory, PROJECT-STATE §6i, the roadmap and this
  entry is now the mechanical count, and where two counts of the same thing are
  both legitimate — six rows marked `no screen` versus seven things with no
  working front end — the file states both and says why they differ instead of
  picking one.

- **THE RESEARCH SAMPLE IS SMALLER THAN 2.10'S AND SAYS SO.** 2.10 could say "6
  of 6" about navigation because all six products publish their top-level nav.
  **Only three publish anything at screen level** (Jobber, Housecall Pro,
  Zenbooker), so every count in step 2's file is out of three. Two pages would
  not surrender their body and are marked MEDIUM rather than quoted as if they
  had. And the honest limit is written into the file: **none of the three is a
  mobile detailer**, none publishes a design rationale, and **every one of them
  assumes employees** — Jobber's Home opens with a clock-in button — so roughly
  a third of what those home screens carry is irrelevant to a solo operator.

- **F14 IS ONE SENTENCE AWAY FROM RE-OPENING SOMETHING HE APPROVED, AND IS
  WRITTEN TO PREVENT THAT.** Every product in the sample uses a different
  navigation shape on desktop than on a phone; Housecall Pro states it outright.
  Ours draws the phone's bottom tab bar unchanged at 1920. **Part A settled
  WHICH five destinations exist and in what order and that does not move.** What
  F14 raises is where the bar is DRAWN above the desktop breakpoint — a
  question Part A never asked, squarely inside decision 6, and belonging to step
  3. It also collides with the `+` and the gear having just moved into the
  header, so step 3 has to specify the header for both shapes at once.

- **NN/g GAVE THE REBUILD TWO THINGS IT COULD NOT HAVE GOT FROM COMPETITORS.**
  A ceiling on list-entry indicators — more than 2–3 unique ones clutters a
  listing page, and our booking card carries four families (mobile/drop-off tag,
  status pill, paid pill, rail node) before its four buttons — which is the
  card-versus-list question of declined decision 7 with a number attached. And
  the rule that a record should open BESIDE its list rather than over it,
  because a modal hides the reference data. **Our whole dashboard opens records
  in modal sheets.** Right on a phone, the named mistake at 1920, and
  independent corroboration for decision 6 that Part B reached on its own.


## His answers to the inventory's seven (2026-08-31)

Same day. He approved the 117-row list and answered every question, which took
the inventory to 126. Files: `docs/dashboard-feature-inventory-2026-08-31.md`
§9 (his words, in full) and §2j (the nine rows they added). PROJECT-STATE §6i.

- **THE CAVEAT IS WORTH MORE THAN ANY OF THE ANSWERS, AND IT IS A PROCESS
  FAILURE OF MINE.** *"I kind of went through the specifications of each
  feature, but I didn't read every single word because there's just so many
  words, and I think I'd lose my mind reading that. But if it's just what we've
  already had established, then it's fine."* He approved a document he could not
  finish reading, **on trust that it contained nothing invented** — and it did
  not, because every row carries a source tag and everything new was quarantined
  in §9 by design. But trust is not the same as approval, and the fix is not to
  write less: it is that **a file he has to APPROVE needs a top layer he can
  actually read.** §0a is now that layer — the whole file on one screen. CLAUDE.md
  already says chat messages must be understandable to a non-programmer; this
  extends it: **a document that asks him for a decision is a chat message that
  happens to live in a file.**

- **Q1 OVERRULED THE RECOMMENDATION, AND THE RECOMMENDATION WAS TOO CAUTIOUS.**
  "Empty states, not a wizard" was proposed on the grounds that a wizard is the
  thing people abandon. He asked for **a setup form** covering everything in
  Settings the booking page needs — *"they could, like, skip stuff or enter it
  later"* — **and separately a guided walkthrough of the dashboard.** The
  skippability is exactly what defuses the objection the recommendation was
  built on, and he supplied it unprompted. **His three constraints on the guide
  are the specification, not preferences:** *"not have paragraphs of text… more
  steps and not try to combine any things into one step… just put some thought
  through into that."* A guide that breaks those is worse than no guide, and he
  said so before it existed. **Two rows, not one — the form and the tour are
  different products and building them as one is how the form becomes a wizard.**

- **Q5 IS THE ANSWER THAT CHANGED THE MOST, AND HE ASKED A BETTER QUESTION THAN
  THE ONE PUT TO HIM.** Quotes were offered and deferred with a recommendation
  of "not in this rebuild". He answered past it: *"that kind of brings up a
  whole new kind of opinion… there should be kind of a switch"* — does a
  booking RESERVE the slot, or is it a REQUEST the detailer accepts?
  **Reserve-on-booking is Andrew's own model and it is currently baked in for
  every tenant on the platform**, which nobody had noticed was a tenant choice
  at all. That is a bigger finding than quotes and it came from him.

  **It is roadmap 2.12 rather than part of 2.11, and the line is not
  bureaucratic.** It needs a per-business setting, a booking that is held rather
  than reserved, an accept/decline path, and — the hard part — availability that
  behaves differently per mode: **in request mode two requests can want the same
  slot, which the `bookings_no_overlap` exclusion constraint currently forbids
  outright.** None of that is layout. **But it stays on the inventory**, because
  he named where the accept action goes (*"the page that the detailer uses their
  bookings on"*), so **2.11 step 4 designs the day screen WITH an accept state
  and 2.12 fills it in.** This is the exact thing step 1 exists to prevent: a
  screen designed around a feature nobody listed gets it bolted on later.

- **Q7 WAS A WORRY, NOT A QUESTION, AND WORRIES GET ANSWERED RATHER THAN HANDED
  BACK.** *"I don't wanna have a huge database because I don't wanna store their
  photos on my end."* **He already does.** Gallery images have gone to the
  `business-media` Supabase bucket — per-business folder, 10 MB cap, public
  read — since Phase 2, so before-and-after photos are the same mechanism
  pointed at a booking. Measured rather than reassured: a compressed pair is
  ~1.6 MB, a busy detailer books ~1,560 jobs a year, so **~2.5 GB per detailer
  per year** against Supabase Pro's **100 GB included** and **$0.0213/GB/month**
  beyond it (checked 2026-08-31). **Ten detailers use a quarter of the included
  storage in year one, and a further 100 GB would cost about $2.13 a month.**
  CLAUDE.md's rule is never to hand him a decision without what he needs to make
  it; the corollary is that **when the missing thing is a number, go and get the
  number.**

- **Q3 IS THE ONLY CONDITIONAL ROW ON THE LIST AND IT IS MARKED THAT WAY ON
  PURPOSE.** *"If you could find a way to have a week view that's convenient and
  doesn't make it a burden, then sure."* That is not a yes. **A conditional yes
  read as a yes is how features nobody wanted get built**, so row 31 carries the
  status `conditional`, step 3 tries it against the desktop layout — where the
  month may already sit beside the selected day, which could make it redundant —
  and if it cannot be made good, **it does not ship and the file records why.**

- **Q6 WAS PARKED BY HIM AND IS DELIBERATELY NOT A ROW.** *"That might be a
  later kind of decision because payment and whatever, I may get to later."*
  Nothing is designed around deposits; the only obligation on step 4 is not to
  make them impossible. **Two things were recorded for when he returns**, both
  unasked-for and both short: the routing he described — customers pay him, he
  pays the detailer — is the normal marketplace pattern and is done with Stripe
  Connect **without the platform ever holding the funds**, which is what keeps
  him out of money transmission; and deposits are the strongest answer to
  no-shows, which is the loss the trade research names.

- **THE EMAIL COLOUR FIX GOT A GO-AHEAD IT WAS NOT ASKING FOR.** The defect was
  deliberately kept off his list as craft rather than a decision (see the entry
  above). He answered it anyway and widened it: *"we should work on the emails
  and other places where colors should apply. We should have it work and adapt
  based off of what color the detailer chooses."* **"Other places" is the
  operative phrase** — it is an instruction to go looking for the rest, not just
  to fix email. So the fix carries a condition: **`accent-sweep.mjs` grows to
  cover the email path in the same change**, or the floor exists on paper only,
  which is this file's oldest recurring failure.

- **THREE OF SEVEN ANSWERED BIGGER THAN ASKED, AND THAT IS A SIGNAL ABOUT HOW TO
  ASK HIM THINGS.** Q1, Q5 and Q7 all came back larger or reframed. The pattern:
  **the questions he expands are the ones about how a detailer actually works**,
  and the ones he answers narrowly (Q3, Q4) are about software. Ask him about
  the trade and he supplies the requirement; ask him about the product and he
  delegates. That is the same lesson as roadmap 2.8, where his own menu shape
  overruled five researched ones.

## Roadmap 2.11, step 3 — the desktop specification, and a "no" he asked for

**2026-08-31.** The deliverable is
`docs/dashboard-desktop-spec-2026-08-31.md`. Nothing was built. What follows is
the judgment, not the spec — read the file for what the layout actually is.

- **THE MEASUREMENT THAT SHAPED EVERYTHING WAS THE ONE NOBODY HAD TAKEN.** Part
  B proved there is no desktop layout using More and History; step 1 added
  Today. **Calendar had never been measured at all, and it is the worst of the
  four:** at 1920 the month grid is 7 × 99.14px cells that **end at y≈790, with
  290px of black BELOW them** as well as 1,196px beside them. **It is the only
  screen in the product that is short and narrow at the same time**, and that
  single fact is why Calendar's desktop form is the one screen that stays ONE
  column.

- **THE SPLIT THAT WAS REJECTED, AND WHY IT IS THE INTERESTING ONE.** Part B
  proposed "the month beside the selected day". Measured against real numbers it
  does not work: a two-column Calendar leaves the grid about 760px, which is a
  **104px cell** — still too small to write a name into, so the split buys a day
  panel by spending the width on nothing. **One column at 1,180 gives a 163px
  cell, which holds `9:00 Tom O.` three times over.** The selected day opens
  INLINE beneath the grid instead. That still satisfies F11 — its concern is
  that the reference data stays visible, and the month does — and a side column
  is not the only way to meet it. **An approved proposal was overruled by
  measuring it**; recorded because Part B's three moves have been treated as
  settled elsewhere and one of them is not.

- **FIVE SCREENS GOT FIVE DIFFERENT WIDE FORMS ON PURPOSE, AND THAT IS THE WHOLE
  DIFFICULTY OF THE ITEM.** The default desktop answer is "list left, panel
  right", and applying it five times is exactly the failure law 1 exists to
  name: five screens sharing a skeleton. Today is 1.7/1 with *the future* on the
  right; Calendar · Month is one column; History is 1.7/1 with the record; Money
  is 1.2/1 and is F7's two destinations drawn as two columns; Clients is
  full-bleed and its record is **ruled rows with no panel**, because Clients is
  the only screen in the product with no panel on it and a right-hand card would
  end that; Business is the ONLY screen weighted toward its right column, 1/1.9,
  because there the left is an index and the right is the work.

- **THE NAVIGATION ANSWER IS "THE SAME PILL, TURNED VERTICAL", AND THE REJECTED
  ALTERNATIVE MATTERS.** F14 says every product in the sample changes navigation
  shape on desktop. The conventional answer is a 220px sidebar with labels
  beside icons — and `theme.css:525` already says in its own comment that the
  floating pill exists because it is *"what stops the dashboard reading as a
  default mobile app shell."* That argument does not stop being true at a desk.
  So the rail is the same component with `flex-direction: column`: same glass,
  blur, radius, active fill, 44px buttons. **F14 asked for a different SHAPE,
  not a different vocabulary.** And **the header does not change at either
  width** — the `+` and the gear were approved into it days ago, and a rail that
  stole them back would make the header mean two things at two widths.

- **THE BREAKPOINTS ARE DERIVED, WHICH IS THE ONLY REASON THERE ARE TWO.** 1024
  is where the rail costs 120px of inset and still leaves 880px of content — 156
  MORE than today, so the rail can never cost width, and both phone-shaped
  verification sizes sit below it. 1180 is `--wrap`, a token the design system
  has had all along and the dashboard is the only surface ignoring, and it is
  exactly where a 637px primary + 320px secondary + 24px gap fit. **A breakpoint
  that equals a layout token is one nobody has to look up.**

- **THE WEEK VIEW IS A NO, AND A CONDITIONAL YES IS WHY IT NEEDED A RULING
  RATHER THAN A SHRUG.** His words were *"if you could find a way to have a week
  view that's convenient and doesn't make it a burden, then sure"* — row 31, the
  only `conditional` row on the inventory. Four reasons it does not ship, and
  the first decides it: **seven day-columns in 356px of phone content is 51px a
  column**, which carries neither a name nor a time, so a week view is
  desk-only — and desk-only is his own definition of a burden. It is also a
  second grid on the only screen that is a grid; and the demo's month, an honest
  one built in step 0, holds **9 jobs across 5 days** to fill a 70-cell grid.
  **The answer is only defensible because of what replaces it:** the desktop
  month cell writes its jobs out, which is a week view five times over, in the
  view he was already in, with nothing changed on the phone. **The condition
  that would overturn it is written down** — a detailer with a crew — so this is
  a no with its own reversal attached rather than a quiet drop.

- **THE SWEEP NEEDED MORE THAN THE TWO WIDTHS THE ROADMAP ASKED FOR, AND
  BASELINING IS WHAT SHOWED IT.** Run before any edit, `sweep-widths.mjs`
  reported **CLEAN on all 18 screens at both 1920 and 1440** — with a 724px
  column on a 1920 monitor. All four of its checks ask "is something outside its
  box", and a narrow column with empty screen either side satisfies every one of
  them. **Adding the widths alone would have bought a green gate that stays
  green whether or not the desktop layout is ever built**, which is this file's
  oldest recurring failure: a check that cannot see the common failure looks
  exactly like a check that passes. So a fifth check, `dead-width`, measures the
  content column at 1180 and above and reports it short of 1,000px. It says
  **"276px short"** at both desktop widths today.

- **AND IT IS ARMED BY ONE CONSTANT RATHER THAN SHIPPED RED.**
  `DESKTOP_SPEC_BUILT` is `false`; while false, `dead-width` **prints its
  measurement every run and does not count toward the exit code**, and the
  summary line carries a sentence saying so, because a bare "clean" that
  swallowed it would read as proof the desktop layout is fine. The alternative —
  a genuinely failing gate — would sit red from now until step 6, and CLAUDE.md's
  own reasoning from step 0 is that leaving a standing layout gate red poisons
  every session in between. The alternative on the other side — adding the
  widths and no check — is the failure above. **One line, flipped in the same
  change that ships the layout**, is the smallest thing that is honest in both
  directions, and step 6's definition of done names it so it cannot be
  forgotten.

- **HIS REQUEST-VS-RESERVE CLARIFICATION MADE ROADMAP 2.12 SMALLER, AND IT
  ARRIVED IN A CHAT MESSAGE.** He said a request **still takes up the time
  slot** — two customers cannot request the same time — and that the difference
  between the modes is **the promise made to the customer**, not the calendar's
  mechanics. Roadmap 2.12 had called the opposite reading its hard part: "in
  request mode a slot is not taken, so two requests can want the same time,
  which the exclusion constraint currently forbids." **That problem does not
  exist.** The constraint is untouched, availability is identical in both modes,
  and what remains is a setting, a status, an accept/decline action and
  different wording on the customer's page and email. Written into roadmap 2.12,
  inventory §9 Q5 and spec §8, **with the harder reading struck rather than
  deleted** so nobody re-derives it as new work.

- **ONE QUESTION WAS HANDED TO STEP 5 RATHER THAN ANSWERED HERE.** Clients and
  History both want a ruled list whose rows carry columns at desktop width. The
  recommendation is that this is the existing *ruled list* widening — same
  hairlines, same rhythm, only the row's internal layout differs by width —
  rather than a new "table" in the composition vocabulary. But bucket 2 says the
  vocabulary is added or refused **at step 5, deliberately and once**, and step 5
  is already where card-versus-list is being settled (2.10's declined decision
  7). **Ruling there is cheaper than ruling twice.**

## Roadmap 2.11, step 4 — every screen designed, and three defects fixed on paper

**One new file: `docs/dashboard-screen-designs-2026-08-31.md`.** Nothing is
built. Step 5 (components) is next; step 6 is where he approves the whole
specification and only then does code start. **Nothing is waiting on him.**

**THE THREE DEFECTS WERE RE-MEASURED IN A REAL BROWSER BEFORE BEING DESIGNED
AGAINST, AND THAT IS THE PART WORTH KEEPING.** Steps 1–3 named them from
reading; this step opened the running app with the seeded day on it and read
the computed styles:

- **`railCount: 3`** — three `.dayrail` elements on one screen, where
  `dashboard-skeletons.md` §2 specifies one continuous hairline.
- **Both completed job cards draw `rgb(11,13,14)` with a `rgb(207,210,206)`
  inset ring** — the hollow "this job is ahead" node, on jobs that finished at
  4:15 PM and 6:00 PM.
- **The three settled rows draw `rgb(14,165,233)`** — `#0ea5e9`, the tenant's
  own accent — where the calendar's `.dot.paid` draws `--ac` `#38E08B`. Law
  11b, in one component and not the other.
- And the labels: **"NEXT UP" over a job that ran 2:45–4:15 PM and is marked
  *Completed*.**

**THE LABEL FIX IS A DELETION, NOT A REWORDING, AND THAT IS THE decision.**
"Next up" and "Later today" collapse into **one** run called *Still to do*.
They were never two kinds of work — they were one kind split by a clock the
ordering already respects, and the split is precisely what made the label lie.
The first row of that run **is** the next job and is lit when nothing needs
payment, so the treatment now says "this one" where a heading used to say it
wrongly. Three runs, each named for the work: **Needs payment · Still to do ·
Done.**

**AND THE WARN-BOX GOES WITH IT.** It exists to say *"N more finished jobs
still need payment recorded"* — which is the *Needs payment* run with its
count in its own label. One fact, one place; Part B row 10's family.

**A FOURTH DEFECT WAS FOUND BY LOOKING, AND NOTHING HAD NAMED IT.** Leaving
Today and returning replaces `.app-main`'s only child with `.center` carrying a
spinner — **the whole day is thrown away and redrawn.** Observed with a
MutationObserver, not reasoned: `["group|kids=3", "center|kids=1"]`. And
`useBookings.reload()` sets `loading` true, so **the same replacement happens
after "Mark complete" and after "Finalize payment"** — the day disappears and
re-arrives, staggered animation and all, as a reward for finishing a job.
Three screens currently do three different things while loading. **§1a of the
new file is one rule for all of them:** first paint may spin; every load after
that leaves the screen standing and dims only what is changing.

**THE STATES ARE DEFINED ONCE, AND THAT IS WHY THE FILE IS READABLE.** Empty,
one, many, loading, error and staff are written as a table at the top; a screen
below only says what *differs*. Eighteen screens × six states restated in full
would be the file he already told us he cannot read.

**THE REQUEST QUEUE IS DESIGNED, EMPTY, AND DELIBERATELY NOT ON THE RAIL.**
Roadmap 2.12 fills it in. It sits above the rail because the rail is *today's
day* and a request can be for any date — the same reason
`dashboard-skeletons.md` §2 already refuses to run the rail through tomorrow.
**Two consequences recorded so 2.12 does not re-derive them:** a waiting
request outranks unrecorded money in the one-lit-thing order (a request has a
customer waiting on the answer and goes stale; money you already hold does
not), and **a request needs no new calendar mark** — it draws the hollow circle
a confirmed booking draws, which is the merge §5b made on purpose.

**THE JOB RECORD GOT THE MOST WORK, BECAUSE F4 SAID SO.** 26 of 126
capabilities on one object, in a 340-line single scroll, reached from four
places, and the one screen nobody has ever redesigned. It becomes **an action
bar over six named sections** — sections rather than Jobber's tabs, because a
tab strip inside a sheet inside a phone is a second navigation on a screen that
already has one, and because tabs hide state on a screen whose job is scanning.
**The action bar moving to the top is the single largest change in the file**:
Call / Text / Navigate currently sit under a heading called *Contact*, four
blocks down, on the screen you open standing at the car.

**ONE QUESTION DELETED ITSELF BY BEING LOOKED UP.** "May a staff member record
a payment?" was about to be handed to him. `20260827003000_staff_roles.sql`
already answers it — staff have **bookings, calendar and customers**, and the
database returns zero rows from `expenses`, `business_settings`, `promo_codes`
and `campaigns`. `update-booking` has no role gate. **So staff may finalize a
payment and may not read the books**, which is coherent, and there was nothing
to ask. Recorded because the near-miss is the lesson: check the schema before
spending his attention. **What the file does add is a sentence it will not let
anyone forget — a UI that hides a figure from staff is a courtesy, not a
control.**

**THREE FILES THAT OUTRANK THIS ONE GET UPDATED AT STEP 6, AND NONE OF IT IS
SILENT** (CLAUDE.md's rule):

1. **`docs/design-system.md` law 11b's table — one word.** "The 'it landed'
   node" is ambiguous between *finished* and *paid*, and that ambiguity is what
   produced the defect. It splits: `--accent` carries the **completed** node,
   `--ac` the **paid** one. **The paragraph under it stands and is answered
   rather than overruled** — it worried that greening the node would take the
   tenant's colour off the screen they open every morning; under this design
   the accent is still on every unpaid-finished node, the lit bloom and every
   button.
2. **`dashboard-skeletons.md` §6** — the lit order gains "a booking waiting to
   be accepted" above "money not recorded".
3. **`dashboard-desktop-spec-2026-08-31.md` §4a — one table row.** *Block this
   day / Hours / How this day works* were listed as modals at every width. They
   expand **in place**, at both widths, because that is the owner's own W1
   instruction and turning them into modals at a desk would undo it to satisfy
   a table. The spec's actual point — they are not records and take no second
   column — is untouched.

**AND FOUR DOORS WERE BUILT FOR THINGS THE DATABASE ALREADY HOLDS**, which is
what stops this rebuild being "the same thing redrawn": **Reviews** (the
`testimonials` table the booking page already reads and nothing writes), the
three **social links** with columns and no fields, an **FAQ** he asked for, and
**Switch business** for an account with more than one membership. The list went
from seven with no door to three, and **each of the three has a stated reason
rather than an omission** — monthly plans are a feature with a price and a
term rather than a settings screen, the custom domain is roadmap 3.3, and
campaigns stay deliberately unplaced because inventing a sixth destination for
a half-built feature is how a five-tab bar becomes six.


## Roadmap 2.11, step 5 — the component inventory, and three rulings

`docs/dashboard-component-inventory-2026-08-31.md`, 2026-08-31. **Nothing is
built.** Step 6 is his approval gate and is the next thing that needs him.
This step is bookkeeping over what step 4 named — no design skill ran against
it, per the roadmap's own table row.

**THE SHAPE OF THE ANSWER: twelve new files, one deleted, nothing invented.**
Sixty-one source files become seventy-two. Sixteen components are untouched,
fifteen are rewrites of things already there, `BookingCard` is kept and
narrowed from five callers to two, and `More.jsx` is the only deletion.

- **RULING 1 — History's row and Clients' row are ONE shape, and it is CSS,
  not a component.** Step 4 §17 handed this forward with 2.10's declined
  decision 7 riding on it. Three parts. **(i) The vocabulary gains nothing.**
  The desktop specification §9 nominated a **table** and it is refused: what
  these screens need is the hairline, the row rhythm and the tap height
  `.rows` / `.row-item` already have, with the row's *interior* going from a
  stacked pair to N columns above 1024. The container does not change, so
  there is no new container. Bucket 2's one permitted addition — *"at step 5,
  deliberately and once"* — **is spent on nothing, on purpose**, and the
  vocabulary stays at seven. **(ii) The chassis is `.rows.cols` plus two
  column templates in `theme.css`**, three lines apart, rather than a
  `<ListRow columns={...}>`. The reasoning is the point: a component that
  takes a column list IS a generic table primitive, and a generic table
  primitive is the eighth screen inventing a fourth kind of list arriving
  through the front door instead of by accident. Two CSS rules cannot be
  imported. **(iii) Each screen writes its own row markup**, because History
  carries a status mark and a month rule and Clients carries neither, and
  sharing them would mean a prop that switches half a row off.

- **AND THAT RULING SETTLES DECLINED DECISION 7, WHICH IS WHY IT WAS PARKED
  HERE.** `composition.test.mjs` test 1 matches a `.map(...)` whose callback
  contains a `className` with `card` **in the same file**, and
  `BookingCard.jsx` sits on a GLOBAL allowed list — so `Calendar.jsx` maps
  eighteen bookings onto `<BookingCard>` and passes. The rewrite is two
  changes and **the second is the one that matters: the allowance is keyed to
  `file > component`, not to component.** `Today.jsx > BookingCard` and
  `DaySheet.jsx > BookingCard` are allowed with reasons; `Calendar.jsx` and
  `Clients.jsx` are not. Making it per-component and not per-caller would
  leave the hole exactly where it is. `docs/design-system.md` § Composition
  gains the sentence that makes it enforceable — **"a card rendered from a
  list through a component is still a card"** — at step 6, not silently.

- **RULING 2 — the setup form's progress rule, and it is a data question
  dressed as a visual one.** Seven segments, `--hairline` track, `--accent`
  fill. **A segment fills in when a step is COMPLETED, never when it is
  passed.** Step 4 §13a made setup skippable on his own words AND made
  Business carry *"Finish setting up · 3 of 7 done"*; if the bar painted
  position, a detailer who skipped seven times would watch it fill and then be
  told nothing is done. One number, both places. **A skipped step is a hole in
  the bar and the hole is the feature** — which is also why it is segmented
  rather than one continuous fill, since a continuous bar cannot express a
  gap. Filled and empty differ in fill, not hue, so it adds nothing to the
  1.4.1 surface. Ceiling stated: **~31px a segment at 320 with seven steps;
  past about ten steps the words are doing all the work.**

- **RULING 3 — the walkthrough's spotlight is one element and a 9999px
  shadow.** `box-shadow: 0 0 0 9999px` dims everything OUTSIDE the element's
  box, so the box is the hole: one element, one `getBoundingClientRect()`, no
  mask, no `clip-path` arithmetic, no second copy of the dashboard to keep in
  sync, and **it never touches the styles of the thing it points at** — which
  matters because it runs over the live screen with real data. Six rules come
  with it, and **the third is the one a later session would otherwise find the
  hard way: it must be verified against the EMPTY dashboard, not the seeded
  demo.** Step 4's own step list includes *"a job"*, and a first-run detailer
  has none — so the tour is six steps that day and seven later, and both are
  correct. Targets are found by a `data-tour` attribute rather than by
  position, which is what makes the step list survive a target moving into a
  second column at 1180.

- **ONE RULE REORGANISES MORE CODE THAN ANY OF THE THREE: a record renders its
  content, and its container is the caller's.** It is the mechanical
  consequence of the desktop spec §4a, and it was not obvious until the
  components were counted: **eleven `<Sheet>` call sites across ten files
  render their own container today**, and four of them are records that above
  1180 have to open beside a list instead. `Sheet.jsx` itself does not change
  — four things stop BEING a sheet and start being HOSTED in one, through one
  ~20-line `RecordHost`. Six call sites each writing their own width check is
  how the 320 floor got fixed on one screen and not its neighbour twice
  already.

- **THREE FINDINGS THAT CAME FROM COUNTING, WHICH IS WHAT THIS STEP IS FOR.**
  **(a) `--wrap` has never existed in `theme.css`** — the desktop
  specification names its breakpoint after it, and the token lives in
  `landing.css:115` scoped to `.ld`. Two stylesheets must not each hold their
  own copy of a layout number. **(b) `.badge` is seven dead rules** — zero
  users anywhere in `app/src` or `supabase/`, and a byte-for-byte duplicate of
  `.pill`, which every screen actually uses. **The coupling to
  `accent-sweep.mjs` was checked rather than assumed, and the first answer was
  wrong**: the sweep does not lose a row, because it never had a `.badge` one —
  `accent-sweep.mjs:78` measures a single surface and labels it *".pill.completed
  / .badge.completed"*, the two being the same declaration. What deleting
  `.badge` actually leaves is **five comments that would become false**
  (`accent-sweep.mjs:19`, `:65`, `:78`; `lib/theme.js:42`, `:68`), corrected in
  the same change. No measurement moves and the sweep still exits 0.
  **(c) Two counts are off by one** — step 4 §11 is titled *"twelve of them"*
  and lists thirteen, and the desktop spec §4a's *"all eleven"* is the same
  slip a step earlier. There are **thirteen** settings screens; Switch
  business is a fourteenth destination and is not one of them, because it is a
  picker and does not share the settings skeleton. **Both were corrected at
  source in this session rather than only reported** — a wrong count that is
  merely written down somewhere else is how it survives — and each correction
  carries a dated note saying step 5 made it.

- **AND A FOURTH THING THE COUNT TURNED UP, WHICH IS THE FAMILIAR FAMILY IN A
  NEW PLACE.** `sweep-widths.mjs:90` holds a `MORE` array of **eleven
  settings-screen titles** and walks each one. Reviews and FAQ would simply not
  be visited, and the sweep would report CLEAN across eighteen screens having
  never opened two of them — *"a skipped check reads exactly like a passing
  one"*, in the script that exists to stop that. **It also opens all eleven
  from one door**, and §10 moves the plumbing behind the gear, so it needs two
  routes rather than one. The same eleven is quoted in CLAUDE.md's own
  description of the script and becomes thirteen with the build.

- **`.dashed` DIES, AND ITS DELETION HAS A SIDE EFFECT WORTH THE SENTENCE.**
  Step 4 §1a leaves no shape for a dashed box to be — an empty section is not
  drawn and an empty screen is one sentence and one way forward — so the class
  and its seven uses go. `sweep-widths.mjs`'s `boxy()` matcher lists `.dashed`
  among the things with an edge; once nothing carries the class that matcher
  is harmlessly matching nothing, which is the "a skipped check reads like a
  passing one" family in miniature. Step 6 takes it out of the selector in the
  same change.

- **ONE THING WAS CONSIDERED AND REFUSED, RECORDED SO IT IS A DECISION RATHER
  THAN AN OVERSIGHT: `Calendar.jsx` is NOT split into Month and History.**
  They are two rows in the law-1 register behind one chip toggle in one
  294-line file, and the rebuild grows both. The split was argued for — two
  desktop layouts, two verification targets, step 6 building one screen at a
  time — and refused on the repo's own evidence: the `mode` branch already
  separates them cleanly and this codebase's norm is 500–600 line screens
  (`BookingRules` 541, `Catalog` 614). **The trigger that reverses it is
  written down:** if either mode needs its own scroll or sticky container,
  split then, in that change.

## Roadmap 2.11, step 6 — how the approval was ASKED, and a build order nobody had written

*2026-08-31. Nothing built. `docs/dashboard-spec-approval-2026-08-31.md` is the
only new file; step 6 is the owner's gate and he has not answered yet.*

- **A SIXTH FILE WAS WRITTEN FOR A MAN WHO SAID THERE WERE TOO MANY WORDS, AND
  THAT IS NOT THE CONTRADICTION IT LOOKS LIKE.** Steps 1–5 are five files of
  ~200KB. Each already carries a §0a one-pager, written precisely because of
  his caveat on the inventory — *"there's just so many words, and I think I'd
  lose my mind reading that."* What did not exist was a layer **across** the
  five: he cannot approve "the specification" by reading five separate
  summaries and doing the joining himself. The approval page is one screen and
  it names the file behind every line, so it replaces the reading rather than
  adding to it. **The alternative that was rejected was putting it only in
  chat** — his answer, and the ask itself, would then live in a conversation
  that the next `/clear` destroys, which is CLAUDE.md's own rule about threads
  that exist only in chat. §6 of the page is a blank block his answer goes in.

- **IT IS ORGANISED AROUND WHAT THE SPECIFICATION TAKES AWAY, NOT WHAT IT
  ADDS.** An addition does not need his attention — he can meet it when it
  ships and ask for it to change. A **removal** is the class of change he has
  already reversed once in this project (the five removals of 2026-08-28), and
  a removal he did not notice in a 200KB specification is a removal he meets
  as a surprise in a finished screen. So §3 is eight numbered items, each of
  which either deletes something visible or goes against something he said:
  the week view (the one outright contradiction of an answer of his), the push
  switch, the travel-fee field, the second colour picker, Today's payment box,
  Business's headings, staff's Business tab, and monthly plans still having no
  door. **They are numbered so he can answer "yes except 4" without writing a
  paragraph** — the cheapest possible shape for a partial no.

- **A BUILD ORDER IS PROPOSED, AND THE REASON IT IS IN THIS FILE IS THAT NO
  OTHER FILE HAS ONE.** Checked before writing it: steps 3, 4 and 5 contain no
  build order, and the roadmap says only "screen at a time". Two judgments in
  it are worth keeping:
  - **The shell ships WITH Today, not before it.** The vertical rail, `--wrap`,
    `useWide` and `RecordHost` are shared plumbing that every screen needs, and
    the tempting order is to land them first. That would be a session whose
    deliverable cannot be LOOKED at, on a project whose verification rule is
    looking. Today is also the screen carrying four of the fixes and the one he
    opens forty times a day.
  - **First run is last.** The setup form and the walkthrough point at the
    other screens. Built early, the walkthrough's step list is rewritten once
    per screen that lands after it.

- **ONE CLAIM IN THE DRAFT WAS FALSE AND WAS CAUGHT BY OPENING THE STYLESHEET.**
  The page described Today's *"N finished jobs still need payment recorded"*
  panel as an **orange warning box** — the obvious thing to call it, and wrong.
  `theme.css:755` carries a comment saying the opposite in its own words:
  *"NOT a warning any more… There is no amber in this system and inventing one
  for a to-do would be the third hue."* It is a bordered panel, `--surface`,
  with the accent on its marker only. **Described to him by what it says
  instead of by a colour it does not have.** The general lesson is the small
  one this repo keeps re-learning: a summary written for a non-technical reader
  is still a claim about the code, and it gets checked like one.

- **AND CHECKING THE SUMMARY AGAINST THE SCHEMA FOUND A HOLE FOUR STEPS OF
  DESIGN WALKED PAST.** The approval page called the FAQ one of the four
  "doors", so the claim was checked rather than copied: `grep -i faq
  supabase/migrations/` returns **nothing**, and `business_branding` has no
  column for it. **The FAQ has no storage at all** — and step 1's own inventory
  §5 says exactly that (*"no table, no screen"*) before steps 3, 4 and 5 lost
  it. **Step 4 §17 and step 5 §4 each assert "touches no schema" on a document
  that designs a screen requiring one.**
  **The word "door" is what hid it.** Reviews, the three social links and Switch
  business are doors onto storage that already exists and is unreachable; the
  FAQ is a door onto nothing. Grouped under one heading in three files, four of
  the four read as the same kind of thing. **A collective noun that is true of
  three items out of four is a defect in a specification**, and it survived
  because every later file inherited the grouping instead of the four rows.
  **It is a WHEN question, not a HOW question, so it went to the owner** rather
  than being decided — §3b of the approval page, with the recommendation that
  the FAQ ships in Phase 3 beside the tenant website that would display it,
  because building it now means a detailer writing answers nothing renders,
  which is this item's own "built with no door" problem inverted. **Both spec
  files carry a dated correction at the exact sentence that was wrong**, so a
  build session cannot re-inherit the contradiction from whichever file it
  opens first.

## Roadmap 2.11, step 6 — his answer, and the two claims that did not survive contact with the code

*2026-08-31, the same day the ask went to him. Approved with amendments.
Nothing built. His answer is §6 of `docs/dashboard-spec-approval-2026-08-31.md`.*

- **HE LIFTED THE NO-SCHEMA RULE, AND IT WAS NEVER HIS.** *"I don't know why
  there was a rule that did not edit the back end. You could 100% edit the back
  end however much you want."* The rule came from roadmap 2.11's own text —
  *(b) it does NOT mean touching the schema, the engine or the booking flow* —
  written to keep "from scratch" from becoming a rewrite of the product.
  **Four steps of specification were written inside a constraint the owner did
  not know existed and did not want.** It is struck at source rather than only
  noted, in the roadmap and in CLAUDE.md, because the failure mode is silent: a
  session inheriting it from an older file does LESS than he asked for and
  never surfaces why. **The lesson is about self-imposed constraints
  generally** — a rule the product invents for good reasons still has to be
  visible to the person it constrains, or it hardens into a fact.

- **AND THE THING HE ACTUALLY WANTED PROTECTED IS THE OPPOSITE OF WHAT THAT
  RULE PROTECTED.** *"forget that the old dashboard even existed, but it should
  be based off of the design of our current landing page."* The no-schema rule
  fenced off the BACK END; what he wants fenced off is the old dashboard's
  STRUCTURE, and what he wants kept is the landing page's LOOK — which is
  already law (`design-system.md` derives from
  `design-directions/5-the-thread.html`, and `DESIGN.md` says the page wins).
  **Both halves of his sentence were already true or already wanted; the rule
  in the middle was the only thing in the way.**

- **THE PUSH SWITCH: HE REVERSED THE REMOVAL ON A BELIEF THE CODE DOES NOT
  SUPPORT, AND THE RIGHT ANSWER WAS TO MAKE THE BELIEF TRUE.** *"it works since
  it's been working for me."* Checked: the server half is complete — VAPID,
  `web-push`, `owner_push_subscriptions`, `sendOwnerPush()` from
  `create-booking` — and **the browser half does not exist at all**: no service
  worker file in `app/`, no `PushManager.subscribe`, no permission prompt,
  nothing calling `owner-push-subscribe`. The table is therefore empty and
  `sendOwnerPush` returns `sent: 0` on every booking. **What reaches him is the
  switch immediately above it in the same group — "A new booking comes in", an
  email** — and his live business runs on `carwashweb` besides, a different
  codebase entirely. **Not re-asked**: he said keep it, so the switch stays and
  the missing half gets built, which is the only reading of "keep it" that is
  not a lie on a screen. **Carried forward because it will bite: on iOS, web
  push requires the page to be added to the Home Screen first.** Apple's rule,
  not a defect to debug.

- **THE TRAVEL FEE: THE SECOND WRONG CLAIM THIS SESSION, AND IT WAS INHERITED
  RATHER THAN INVENTED.** The approval page told him the flat travel fee was a
  dead field being deleted. **It is charged** — `pricing.ts:135` returns it,
  `computeQuote` adds it, which is exactly what roadmap 2.8c fixed and what
  CLAUDE.md's own money rule commemorates. **Part B row 5 was precise:** the
  field is superseded *when travel areas exist*, and the fault is a typeable box
  sitting beside the areas that replaced it; the change is that it becomes a
  sentence. **Step 4 §11 dropped the condition** — "superseded flat travel fee
  is deleted… no longer charged" — and this page inherited it. **A field that is
  dead in ONE CONFIGURATION is not a dead field**, and flattening the condition
  turned a live money path into a proposed deletion, on the one product that has
  already shipped a fee it printed and never charged. Corrected at both sites.
  **Both of this session's wrong claims were caught the same way: by opening the
  file the claim was about.** The first was Today's "orange warning box"
  (`theme.css` says there is no amber in this system); the second was this. A
  summary written for a non-technical reader is still a claim about the code.

- **THE TAB BAR WAS REOPENED AND CLOSED WITHOUT SPENDING HIS TIME, BECAUSE HE
  GAVE THE TEST HIMSELF.** He said not to keep five tabs merely because the old
  dashboard had them, then: *"as long as that's the best order and amount, then
  that's fine."* **The answer is evidence, not reassurance:**
  `dashboard-architecture-2026-08-31.md` §3a derives the five destinations from
  the five questions a detailer's day contains **before looking at our own tabs
  at all**, then compares six products; four landed where the product already
  was and the fifth (More → Business) changed *because* of the derivation. §3b
  argues why not four and why not six. **Answered by showing the derivation
  rather than re-running it** — re-deriving would have cost a session and
  produced the same five.

- **"NOT THE PHONE" WAS HALF A WORDING BUG AND HALF A REAL GAP, AND SEPARATING
  THEM IS THE DECISION.** He read *"Not the phone: every screen under 1024px is
  what ships today"* as *the phone keeps the old dashboard*. **What it meant is
  narrow and true** — no screen grows a second column below 1024, which is the
  guarantee that makes the desktop work additive — and it is withdrawn as
  written. **But his instruction goes further than step 4 actually went:** step 4
  describes several phone forms as "what ships today", and under *forget the old
  dashboard existed*, **an unchanged screen is the absence of a decision rather
  than a decision.** So this is not merely reassurance either. **Step 4b, the
  phone pass, re-decides every screen's phone form from scratch**, and it is the
  only thing before code.

- **THREE ASKS BECAME THEIR OWN ROADMAP ITEMS RATHER THAN SWELLING 2.11**, which
  is the shape that has worked twice on this project (2.8 → 2.8b). **2.13**
  custom roles and permissions — `business_users.role` is a two-value check
  constraint and the enforcement is in RLS through `is_business_owner()` across
  the money, settings and marketing tables, so named roles with tickable
  permissions is a permissions model plus every one of those policies; the item
  carries the one thing that must survive it, `protect_last_owner()`, a trigger
  that binds even the service role. **2.14** plans with cadences — and **he
  asked for the research first himself**, which is step 1 of the item;
  `monthly_plans` exists but is ONLY a discount, with no cadence, no enrolment
  and no recurring booking, so "monthly plans come back" was never a door onto
  an existing feature and step 4 §15 was right. **2.15** travel by measured
  distance — everything downstream is built and the only missing capability is
  address → distance, which needs a map service; **the item states the decision
  it owes him (cost, and customer addresses leaving the product) and the cheap
  middle path: measure when the lookup works, fall back to the customer picking
  their area when it does not.**

- **PHONE LANDSCAPE IS THE ONE NEW CHECK, AND IT IS DELIBERATELY NOT ARMED.**
  Of the sizes he named — *"a normal iPhone dimension, Samsung dimension, and
  then the laptop… and if you shrink a page or it goes to landscape"* — a
  current iPhone (393x852) and Samsung (360x800) are **already inside 392 / 360
  / 320**, and the laptop is 1440x900. **Landscape was the only gap.**
  `heightFor()` now special-cases **844 → 390**, and 390px of height is shorter
  than any viewport this product has ever been measured at, which puts the day
  rail, a `.sheet` pinned to 92vh and the bottom tab bar into the same 390px.
  **It is NOT in the default list**, on this repo's own rule about baselining a
  new check against a known-good version: step 4b both baselines it and has to
  satisfy it, and arming it now would hand the next session a red gate with no
  baseline against a phone layout that is about to be redrawn. **Same shape as
  `DESKTOP_SPEC_BUILT`, and named as such so it is a pattern rather than a
  coincidence.**

- **THE FAQ CAME BACK AS HALF OF EACH OPTION, AND HIS SPLIT IS CHEAPER THAN
  EITHER.** Offered (a) wait for Phase 3 or (b) add storage and build it now, he
  took *"add a small bit of database now, but we could tackle FAQ later"* —
  **storage in 2.11, screen later.** It costs nothing to add the table while the
  schema is open and it avoids a detailer writing answers nothing renders.
  **Settings screens are therefore TWELVE, not thirteen** — the third correction
  to that count in three sessions, which is itself the argument for the count
  living in one place.

- **HIS TWO CLARIFICATIONS AFTER THE FIRST SIGN-OFF, AND ONE OF THEM CLOSED A
  ROADMAP ITEM THE SAME DAY IT WAS WRITTEN.**

  **The push sighting was his OWN business's dashboard, which CONFIRMS the
  finding rather than contradicting it.** *"I'm seeing it worked on my admin
  dashboard. Not the one that we're building, but the one for my business. So
  I'm saying we shouldn't remove notifications because I know that it's
  possible."* **There was never a disagreement about this codebase** — he was
  arguing from proof that phone notifications are achievable, against removing
  the capability. The outcome is unchanged (the switch stays, the missing
  browser half gets built) and the reasoning is now his rather than inferred.
  **Worth keeping as a pattern:** an owner saying "it works" about a feature
  may be reporting a DIFFERENT system he owns. `carwashweb` is a separate
  product with a separate database and separate deploys, and it is the thing he
  uses daily. **Check which product a report is about before treating it as
  evidence about this one.**

  **AND HE REFUSED AUTOMATIC TRAVEL CALCULATION, WHICH CLOSED 2.15 UNSTARTED —
  BECAUSE THE ALTERNATIVE HE DESCRIBED WAS ALREADY BUILT.** Given the costs of
  the automatic part (a map service, a per-lookup fee, every customer address
  leaving the product) he said: *"we don't need to do that for the automatic
  part… I don't wanna do automatic calculations. Or if we want, we can have the
  customer check themselves… are you outside of, like, ten mile range, and they
  just click something."* **That is `travel_zones`, shipped in roadmap 2.8c.**
  The detailer names their own areas and prices each; the customer picks one on
  the booking page from *"Which area are you in?"*, every option showing its own
  surcharge (`StepLocation.jsx:107-122`); the fee joins the quote and is
  snapshotted to `bookings.travel_fee` / `travel_zone`. **His literal example —
  two areas, "Within 10 miles" free and "Outside 10 miles" charged — is a
  configuration, not a feature request.**
  **The item is kept and marked closed rather than deleted**, per this file's
  own rule that a reversal is usually the load-bearing part: *detect the miles
  automatically* is the obvious next idea and will be proposed again by someone
  who has not seen this. **It was put to him with its costs and he said no**,
  and the condition that reopens it is his own words rather than an inference —
  *"if there's someone to do it for free"*. A cost preference, not a rejection
  of the capability.
  **The wider lesson, and it is the third time in two sessions:** the fastest
  route to a correct answer about travel was reading `StepLocation.jsx` and
  `pricing.ts` rather than the specification files that described them. **Three
  wrong claims this session — the "orange" warn-box, the "dead" travel fee, and
  a roadmap item for a feature that already existed — and all three came from
  trusting a document over the code it described.**

## Roadmap 2.11, step 4b — the phone re-decided, and he ruled it portrait-only

**The owner's rejection of *"below 1024 nothing changes"* opened this step, and
it is bigger than the sentence he objected to.** Step 4 describes five screens'
phone form as *"what ships today"*, *"exactly what ships"* and *"the sheet, as
today"*. Under his own instruction — *"forget that the old dashboard even
existed"* — **an unchanged screen is the absence of a decision, not a
decision**, so every screen was decided again from nothing in
`docs/dashboard-phone-pass-2026-08-31.md`. Where the answer came out the same,
the reason is written down and the screen earned it; "unchanged" was not an
allowed answer anywhere.

**HE THEN RULED THE PHONE PORTRAIT-ONLY, REVERSING HIS OWN ASK FROM THE SAME
MORNING, AND THE REVERSAL IS THE LOAD-BEARING PART.** Answering the step 6
approval page he had asked landscape to survive — *"if you shrink a page or
you'll not full screen it or goes to landscape. It should be able to modify and
move around and not losing the information."* That put it in scope and it was
measured. He then closed it, twice, and the second time was the precise one:

> *"Let's not have a horizontal phone setup, only portrait. Because yeah, no
> need and will only be making things harder."*
> *"I'm just seeing the landscape from film because I don't want the detailer
> that actually rotates the phone, then the whole screen rotates and it's kind
> of annoying… for the phone version, it should always just stay portrait. Now
> obviously on the desktop, it'll give you whatever the size of the desktop is
> … but when someone flips their phone over sideways, I don't want it to
> completely readjust."*

**HE IS NOT ASKING FOR LANDSCAPE TO BE IGNORED. HE IS ASKING FOR IT TO CHANGE
NOTHING, AND THAT IS A DIFFERENT INSTRUCTION WITH A DIFFERENT COST.** A session
that reads it as "do nothing" will ship the bug. **The dashboard readjusts on
rotation today and nobody chose it:** `theme.css:1067` (`min-width: 700px`) says
*"on a wide screen the sheet stops being a sheet and becomes a panel"*, and **a
sideways phone is 844px wide, so it counts as a wide screen** — a settings
screen becomes a centred desk panel at `86vh` of 390px = **335px, showing 276px
of Business info's 1,365px form, 20%.** `theme.css:1182` (`min-width: 560px`)
reorders a day's time row for the same reason. **Both gain
`and (min-height: 500px)` at step 6.** One clause, two places; the desktop is
untouched because a desk screen is taller than 500px; 500 is chosen because a
phone is 800–852 tall upright and 360–393 sideways and nothing real sits
between. **The generalisation worth keeping: a layout decision that spends
height must ask about height.**

**AND THE HONEST LIMIT, WRITTEN DOWN SO IT IS NOT PROMISED LATER.** The guard
stops the layout *changing*; it does not make a short screen tall. Sideways is
still a 390px window and still a lot of scrolling. **He accepted that trade
explicitly** — the annoyance he named was the readjusting, not the cramping.
**A true orientation lock is not available to a web page**: it needs a web app
manifest and a Home Screen install, **Android honours it and iPhone ignores
it**, and there is no manifest in `app/` at all. Worth one line if the
push-notification work lands (it already needs a Home Screen install on
iPhone); not worth creating a manifest for on its own.

**WHAT THE RULING WITHDREW, all of it designed and then taken back out:** a
left rail on short screens, sideways column-pairing, full-bleed sheets
sideways, a shorter calendar cell sideways, **`844` in `sweep-widths.mjs`'s
default sizes, and the `short-screen` check written for it.** The check was
**removed rather than left dormant behind a flag** — the `DESKTOP_SPEC_BUILT`
pattern is for a check whose subject is coming, and this one's subject is not.
A check nothing triggers is a check that rots.
**`docs/dashboard-phone-pass-2026-08-31.md` §20 keeps every measurement** so
that nobody re-measures landscape in six months and files it as a discovery;
that section says outright that it is a record, not a plan.

**ONE FINDING SURVIVED THE WITHDRAWAL AND IS WORTH MORE THAN THE LANDSCAPE WORK
WAS.** `sweep-widths.mjs 844` was baselined before the width was added, as
CLAUDE.md requires, and **reported CLEAN on all 18 screens** — of a viewport
where the tab bar covers the first job, the month shows 1.3 of 5 weeks, a
settings sheet shows 20% of its form, and **the sign-in card with an error on
it is 399px in a 390px viewport, 25px past the bottom, "Create an account"
clipped.** Every check that script owns asks about the **right-hand edge**. It
cannot see a bottom-edge failure at any size, and that was always true —
landscape is only where it would have bitten first. `sweep-booking-steps.mjs`
is the script that asks the bottom question, and it asks it only of the booking
page.

**THE FOUR PORTRAIT DECISIONS THAT ARE THE ACTUAL DELIVERABLE:**

- **Only the lit job is a card.** A five-job day draws **five identical 289px
  cards** — word for word a named tell in this project's own
  `design-knowledge.md` §1. The rest become one row each: **the rail region
  1,522px → ~633px, and the day 3.4 screens → a projected 1.7** — but the
  number that matters is what sits above the tab bar at y=785: **the lit card
  and three rows, against one whole job of five.** It also makes *one thing
  lit* a matter of FORM rather than colour, which is what the marks vocabulary
  exists for and what keeps law 11b from having to work harder. The actions are
  not lost — step 4 put an action bar at the top of the job record precisely so
  Call / Text / Navigate are one tap from any row.
- **A settings screen becomes a page, not a sheet.** Four reasons and none is
  taste: the row's `›` chevron promises a push and delivers a peek; a sheet
  with an inner scroller inside a scrolling page is **two scrollers**;
  *Services & add-ons* is four lists inside a 640px floating box at every
  width; and **step 4 §10 already moved this direction at the desk.**
  `dashboard-skeletons.md` §3's justification survives word for word — it
  allows twelve screens to share one skeleton because *"they are modal panels
  reached one at a time"*, and **reached one at a time is still true of a
  page.**
- **Today's 112px sunken ledger panel becomes one row of three bare figures**,
  moving the first job 318 → ~262px. **The masthead is deliberately not cut** —
  it is the type contrast that keeps these screens off the default-app-shell
  shape, and cutting it would be a move toward the generic, not away.
- **A Clients row drops the customer's EMAIL** — the least useful fact about a
  customer to a detailer holding a phone — for **lifetime spend and last
  visit**. That is step 4's *"shows what it already calculates and currently
  hides"* made concrete.

**WHAT WAS DELIBERATELY LEFT ALONE, WHICH IS THE OTHER HALF OF "FROM
SCRATCH".** The five tabs and their order (derived and approved; re-deriving
wastes his time). The floating pill — `theme.css:525` says it is *"what stops
the dashboard reading as a default mobile app shell"*, it is thumb-reachable,
and it costs 8% of an 844px screen. The month grid on a phone, because the
obvious alternative, an agenda list, cannot draw an empty day, a closed day or
a blocked one — which is the screen's whole question. The centred sign-in card,
which is where *"centred exactly once"* is spent. **Each is confirmed with its
reason rather than inherited, and that distinction is the entire point of the
step.**

**ROADMAP 2.16 WAS OPENED AND CLOSED BY THE SAME RULING.**
`sweep-booking-steps.mjs 844x390`: **all eight steps of the CUSTOMER's booking
page overflow, the worst by 467px — 120% of the screen, on step 1.** W16 is the
owner's rule that a customer never scrolls inside a step, and he has now scoped
the shape it applies to: **W16 is a portrait rule.** Closed unstarted with its
numbers kept, because `.bk-choices` being a tall single column on a wide short
screen is the obvious "bug" to spot and it has been ruled not-a-bug.

**THE PROCESS LESSON, AND IT COST REAL WORK THIS SESSION.** A landscape layout
was designed in full before he was shown a single sentence of it — the rail,
the pairing rules, a shorter calendar cell, a new check, and a roadmap item.
All of it followed correctly from his own morning instruction, and **all of it
was withdrawn by one clarifying sentence the same day.** The tell was in the
original quote: *"it should be able to modify and move around and not losing
the information"* is ambiguous between *adapt to the shape* and *survive the
shape without changing*, and the second reading is both cheaper and what he
meant. **When an instruction about behaviour has a cheap reading and an
expensive one, put the fork to him in one sentence before building the
expensive one.**


## Roadmap 2.11, step 6, stage 1 — the shell and Today built, and the grid row that made a flat DOM impossible

**2026-09-01.** The first code in the dashboard rebuild. The approval page's
§5 build order puts the shell and Today together on purpose — plumbing alone
has nothing to look at, on a project whose own rule is that visual work is
verified by LOOKING — and that is what shipped.

### What was built

`theme.css` gains `--wrap: 1180px` and `--topbar-h: 61px`; the `>= 1024` block
that insets the shell 120px, lets `.app-main` take `--wrap`, and turns the tab
bar into a vertical glass pill rail (the same component, `flex-direction:
column` — not a 220px sidebar, which `theme.css`'s own note argues against);
`.split` / `.col-1` / `.col-2`; `.ledger`; the rail's three node states;
`.record`; `.refreshing`. `hooks/useWide.js` and `components/RecordHost.jsx`
are new, `BookingDetail` stops rendering its own `<Sheet>`, and `App.jsx`
carries the `+` that is now the only door to a new booking. `Today.jsx` is
rewritten.

### The measurements, before and after

| | Before | After |
|---|---|---|
| `.app-main` content column, 1920 and 1440 | 724px | **1,144px** |
| Today's document height, 1440x900 | 1,810px | **1,006px** (required <= 1,200) |
| Today's document height, 392x844 | ~2,500px | **1,103px** (projected ~1,265) |
| `.dayrail` elements | 3 | **1** |
| A finished job's node | hollow "ahead" ring | solid `--accent` |
| A paid job's node | `#0ea5e9`, the tenant accent | `--ac` `#38E08B` |
| Today's ledger, 392 / 320 | 112px sunken panel | **75px / 98px**, bare figures |

Sweep clean at 1920 / 1440 / 392 / 360 / 320 in both the normal and `?lite=1`
paths; the four credential-free tests and `accent-sweep.mjs` pass.

### 1. A FLAT DOM CANNOT CARRY A SECOND COLUMN, AND THIS COST THE MOST TIME

The split was built first as a flat list of children — `.group.split` with the
masthead, the ledger, the rail and the aside as siblings — because the
screen's staggered arrival reads `.app-main > .group > *`, and wrapping the
primary column costs it its beats. **It renders wrong, and the reason is the
grid model itself:** a grid row is as tall as its tallest item, so the second
column placed at `grid-row: 1` made row 1 as tall as ITSELF (264px) and pushed
the ledger a fifth of a screen down the page. Seen in a screenshot, not
reasoned about.

**And there is no way out of it.** `grid-row: 1 / -1` resolves `-1` against
the EXPLICIT grid, which has no rows when only columns are declared; `span 99`
creates 99 implicit rows and 98 gaps; `grid-template-rows: repeat(20, auto)`
does the same with `row-gap` applied to every empty track. Absolute
positioning gives up `position: sticky`, which is the one thing the second
column actually needs.

**So `.col-1` wraps, and the stagger block gained a second selector on every
line**, with a comment saying the two are one rule and changing one alone is
what would rot. That duplication is the price, and it is named rather than
hidden.

### 2. THE RAIL'S `animation: none` HAS TO SIT AFTER THE RULE IT OVERRIDES

Making the rail one element would have collapsed the day into a single stagger
slot — the signature move lost to a bug fix, which law 3 forbids — so the
stagger moved INSIDE the rail. The override was written next to `.dayrail`,
several hundred lines above the stagger block. **Both selectors are (0,3,0),
so source order decides, and the override silently lost.** It lives with the
block it overrides now, and both places carry a comment saying why.

The beats: the rail is the group's third child, so it starts at that child's
80ms slot and steps **20ms rather than 40**, which buys five distinct beats
inside the same 160ms ceiling instead of two. **The budget is unchanged — the
last element still settles by ~580ms.**

### 3. THE ROTATION GUARD WAS THREE PLACES, NOT TWO

`docs/dashboard-phone-pass-2026-08-31.md` §2a names two width-only media
queries that fire on a sideways phone: the sheet rule at `min-width: 700px`
and the day-row rule at `560px`. **Grepping the breakpoint instead of trusting
the list found a third** — the calendar cell's own `min-width: 700px` rule,
which takes a month cell from 56px to 88px. It SPENDS HEIGHT on a width-only
question, which is the exact shape §2a names, so rotating the phone made the
month grid taller on the shortest screen in the product.

**The lesson is about the list, not the rule: a file that names two instances
of a pattern invites a session to fix two and stop.** Verified at 844x390:
both guarded queries report `false` while a bare `(min-width: 700px)` reports
`true`, the settings sheet is still bottom-anchored and full-width
(`align-items: flex-end`, bottom radius 0) rather than a centred 640px panel,
and the calendar cell is still 56px.

### 4. THE RELOAD FIX WENT IN `useBookings`, NOT IN `Today`

Leaving Today and coming back replaced the screen with a spinner, and so did
*Mark complete* and *Finalize payment*, because `reload()` sets the same
`loading` flag the screens answer with a spinner. **Three screens read this
hook and all three had it**, so the flag split in two there — `loading` is the
first paint of a mount, `refreshing` is every read after it — rather than each
screen growing its own version. Calendar and Money get the fix without being
touched, which is the point of fixing it where the callers route through.

### 5. WHAT STAGE 1 DELIBERATELY DID NOT DO

- **The job record is still the 340-line single scroll.** It opens BESIDE the
  list at >= 1180 now (`RecordHost`), which is desktop spec §5a and NN/g's
  F11, but the action-bar-over-six-named-sections redesign is **stage 2**.
  Nobody should read §5a as finished.
- **`.dashed` and `.badge` did not die**, and `sweep-widths.mjs`'s `boxy()`
  selector still lists `.dashed`. Today's two uses are gone; the other five
  belong to screens that have not been rebuilt yet, and deleting the class now
  would leave those screens with a hole where a shape used to be. **Both
  deletions land with the last screen that uses them**, and the `boxy()` edit
  goes in the same change so the matcher never points at nothing.
- **`.rows.cols` was not added.** It has no caller until History and Clients
  (stages 3 and 5), and a stylesheet block with no user is the same debt as a
  check with nothing to trigger it.
- **The header's GEAR was not added.** The `+` was, because Today's own
  full-width *New booking* button dies with it and the door would otherwise be
  lost. The gear's menu is `GearMenu.jsx`, which does not exist until Business
  (stage 6), and adding a gear now would mean two doors onto `More.jsx`'s
  plumbing in the middle of a rebuild.
- **TWO INTERIM STATES THE SHELL CREATES, both of them correct and both of them
  easy to misread as finished or as a bug:**
  - **Calendar's month grid is 1,144px wide now and still draws DOTS.** The
    shell gave it the width for free (the desktop spec §5b's whole argument is
    that this screen keeps one column so the width goes into the cells), but
    writing *"9:00 Tom O."* into a cell, the legend that lists only what is on
    the month shown, `.cal-cell.selected` and the inline day panel are all
    **stage 3**. A wide grid of dots is the shell working, not §5b shipped.
  - **There are TWO doors to a new booking right now** — the header `+` and
    Calendar's own button. Step 5 §3d already has that button on the death
    list; it dies with Calendar in stage 3. Today's went with Today's rebuild
    because that is the screen this stage owns.
- **The open-slots figure stays on Booking rules AS WELL AS landing on
  Today.** The specification calls it "stranded" there, but on that screen it
  answers *"did that setting do what I wanted"* and on Today it answers *"what
  does the near future look like"*. Two questions, one number, and no file
  asked for the deletion.

### 6. TWO SESSIONS WERE GIVEN THIS PROMPT AND BOTH WROTE TO THE TREE

A second Claude session (`claude-9d`) was started on the same prompt and was
editing the same working tree; it noticed `theme.css` changing under it and
asked. **Recorded because the resolution is reusable:** it stood down without
reverting — a `git checkout` of "its" files would have taken this session's
work with them — and its `RecordHost.jsx` + `jobRecordProps` +
`BookingDetail`-loses-its-`<Sheet>` work was **kept rather than reverted**,
after being read, because it is exactly the shell plumbing the approval page
names as stage 1 and it had already avoided the regression that would have
justified dropping it: Calendar, Clients and Money keep an explicit `<Sheet>`,
so nothing changes on the three screens this stage does not build.

**The general rule: on a collision, the session that is further along keeps
the tree, the other writes nothing further and does NOT revert, and whatever
survives is read in full before it is adopted.**

### 7. TWO DEFECTS ON `/job/:id` THAT ONLY EXISTED BECAUSE SOMETHING WAS EXERCISED

`BookingDetail` losing its own `<Sheet>` is right, and it cost this page the
`X` in that sheet's header. **`JobPage` had `onClose` wired to the dashboard
and nothing on screen that could call it** — a job opened from a push
notification was a dead end. It now draws a *Dashboard* control above the
name.

**And pressing that control found the second one, which predates the rebuild
entirely: every way out of this page went to `/`, which is the MARKETING
SITE.** `main.jsx` maps `/` to `LandingPage` and the dashboard to `/app`, and
`JobPage` had four `navigate("/")` calls — the close, the change handler, and
the not-found screen's own *"Go to dashboard"* button, which did not go to the
dashboard. A detailer who opened a job from a notification and pressed
anything landed on the sales page for the product they already own.

**Neither was findable by reading, and that is the point.** The first needed
the page rendered; the second needed the control PRESSED. It had never been
pressed because until this change the record's own sheet swallowed the close,
so the route underneath it was never taken. **A code path with no way to reach
it is not a working path — it is an unmeasured one.**

### 8. AND THE HOOK FIX HAD TO BE FINISHED ON ITS OTHER TWO CALLERS

Splitting `loading` from `refreshing` in `useBookings` stopped Calendar and
Money replacing themselves with a spinner — but they did not READ `refreshing`,
so walking to another month showed **September's marks under an August
heading** for as long as the read took, with nothing saying so. **That is worse
than the spinner it replaced**, and it was introduced by fixing the hook
without finishing the callers.

One class and one `aria-busy` on each screen's root, the same as Today.
Verified with a MutationObserver — the instrument step 4 used to find the
original defect — on a month change:

```
before   ["group|kids=3", "center|kids=1"]     the screen thrown away
after    ["group refreshing|kids=2", "group|kids=2"]   nothing removed
```

**The rule this is an instance of: fixing something in the shared function is
right, and it is only half the fix if the callers each had to answer it.**


## Roadmap 2.11, step 6, stage 2 — the job record, and two defects the specification had already described

**2026-09-01.** Stage 2 of the approval page's §5 build order. 26 of the
product's 126 capabilities live on this one object, it is reached from four
places, and it was a 340-line single scroll with the phone buttons four blocks
down under a heading called *Contact*. Step 4 §3 redrew it as **an action bar
over named sections**; the phone pass §4 kept the shape, confirmed the sheet
on merits and **pinned the bar**. This is what that cost and what it found.

### The bar is pinned with `position: sticky`, and `top: 0` was not enough

Sticky rather than a fixed header, and rather than lifting the bar into
`RecordHost`: **the record has three containers** — a sheet below `--wrap`,
the desk's second column at or above it, and the `/job/:id` page, which has no
container at all — and sticky is the one mechanism that behaves in all three
without any of them knowing about the others. Lifting the bar into the host
would have meant the host knowing what kind of record it is holding, which is
exactly the coupling `RecordHost` exists to avoid.

**Then it did not work, and the reason is worth carrying.** `position: sticky;
top: 0` inside `.sheet-body` stuck the bar **18px below** the scrollport, and a
line of the record slid through the band above it. A sticky box may not leave
its **containing block**, and for a child of `.sheet-body` that is the
element's *content* box — the sheet's own 16px of top padding puts it 16px
below the padding box the scrollport actually is. The fix is that the sheet
hands its top padding to its first child, and only when a record is in it
(`.sheet-body:has(> .jobbar)`). `.record-body` needed none of it: it has no
padding, so its content box **is** its scrollport, and the bar lands flush.

**And it is only visible at the height a phone actually opens at.** The sheet
opens at a 56vh peek; pulled to 92vh — which is what every screenshot script in
this repo does, so the rest of the screen is measurable — the whole record
nearly fits, the bar never has to stick, and the bug does not happen.
**A pinned thing has to be tested at the height that scrolls, not the height
that is convenient to photograph.**

### Two defects, and both were already written down as design

Neither was found by reading the code. Both were found by building the screen
the specification describes and noticing that the product did not do it.

1. **"A job finished and unpaid — *Finalize payment* is the primary action and
   the record is what Today's lit card opens into" was FALSE.** The record
   showed *Finalize payment* only while `status === "confirmed"`. Finalizing
   sets `status = "completed"`, and Today's *Needs payment* run is
   `completed && !finalized_at` — so **the record you reach by tapping the one
   card on Today that says a job needs paying had no way to take the payment.**
   The record now uses the card's own condition, so the two cannot disagree.
   It also answers the design's *"a job in the future has no Finalize
   payment"* for free: a future job cannot be completed.
2. **Nobody has ever seen "Reminder sent to customer." or "Invoice +
   thank-you sent."** All four callers wire `onChanged` to *reload the list AND
   close the record*, which is right for a status change and wrong for a send.
   Both messages were written into a panel that was already gone. `act()` takes
   a `changed` flag now and the two email actions pass `false` — neither writes
   to the booking (checked in `send-invoice` and `send-owner-reminders`; the
   `customer` target writes nothing), so there is nothing to reload either.
   **It matters more from this stage on, because *Reminder* is one tap in the
   pinned bar rather than a full-width button most of a screen down.**

**The shape both share: a specification can describe a bug in the present
tense and read as a design.** Nothing in step 4 §3 said "this is broken" — it
said what the screen should do, and the screen did not do it. The way that
surfaces is building it, not reading it.

### At most one accent fill, and it is a consequence rather than a rule

The design system's *three or more actions take three weights* put a filled
*Mark completed* in **What happened** while **The money** already had a filled
*Finalize payment*, which would be two accent fills on one record and against
law 11's *one accent, spent on the single action that moves the screen
forward*. **It resolves itself:** *Mark completed* exists only while the job is
not completed and *Finalize payment* only once it is, so the two can never
share a screen. Same for *Email invoice*, which replaces *Finalize payment*
after finalizing. *Didn't show up* is ringed, *Cancel the job* ringless — a
destructive choice weighted the same as a convenience is a hazard.

### Four smaller calls, recorded so they are not re-litigated

- **"Change the time or details" is the section NAME and its button says
  *Edit*.** The section title took the words today's button carried; a heading
  over a single control repeating it is a section that says everything twice.
- **The address moved into *The job*.** It lived under the *Contact* heading
  the action bar replaced, and it is the *where* — so it sits under the line
  it qualifies.
- **The money section prints *How they paid* from `payment_notes`**, which
  Finalize payment has always written and which no screen in the product has
  ever shown. The payment STATE is the pill, which is pinned and therefore
  always on the page; a second copy of that word would have been the
  duplication, not the fix.
- **Photos is designed and not built** (row 126) and draws nothing. Five
  sections on the screen against the design's six, which §1a already permits.

### The record was never swept, and that is the third instance of a family

`sweep-widths.mjs` walked every dashboard screen, all eleven settings sheets
and the client sheet — and **never opened a job record**. So "clean at five
widths" was silent about the widest object in the app, on the screen that
carries a fifth of its capabilities. It walks two jobs in two states now (the
lit card is finished-and-unpaid, the first plain row is still-to-do), because
the record's shape depends on the job's. **Same family as the always-false
contrast rows and as `dead-width`: a check that never reaches a thing reports
exactly like a check that reached it and found nothing.**

### Walking the record with a keyboard found two more, one of them not about this screen at all

A pinned bar is a keyboard question, so the record was tabbed through in a real
browser rather than reasoned about. Two findings, both measured:

1. **`scroll-margin-top`, because a browser scrolls a focused control into the
   SCROLLPORT and knows nothing about what is stuck over the top of it.**
   Shift-tabbing backwards put *Finalize payment* and *Didn't show up*
   underneath the bar, focus ring and all. Fixed with `scroll-margin-top:
   10rem` on everything after the bar — **and on their descendants, which was
   the second half of the same measurement**: every control down there is
   inside a card rather than a sibling of the bar, so the sibling selector
   alone changed nothing. The bar measures 109px at 320, 392 and 1440;
   overshooting only scrolls a little further than it had to.
2. **`Sheet.jsx` says `aria-modal="true"` and did not trap focus — on all
   eleven sheets in the product, not just this one.** Opening a sheet left
   focus on the page behind it, and tabbing forward out of the job record went
   through four job rows and *Tomorrow* before it reached the sheet's own
   *Close*. The body-overflow freeze that has always been there stops the
   MOUSE scrolling past a sheet; nothing stopped the keyboard, so the markup
   and the behaviour disagreed. **Fixed in the shared component**, because
   eleven call sites each getting their own answer is the failure mode this
   repo already has a name for. Not `<dialog showModal()>`, which gives
   trapping for free: the height is dragged, the backdrop is ours, and the top
   layer would take the exit animation and the peek with it.

**A third thing the pinning changed, found by using it:** a confirmation used
to scroll away with the record and now sits in the one part of the screen that
never moves, so *"Reminder sent to customer."* would have eaten 44px of the bar
for the rest of the session. **The notice clears itself after six seconds; an
error does not** — an error is a thing you still have to do something about,
and it clears on the next action. Verified: the message appears in the bar at
3.5s with the record still open, and is gone by 11.5s.

**And one finding kept rather than fixed, so it stops being rediscovered:**
`PRODUCT.md` states a 46px tap-target floor and `.btn.sm` is **38px**, at 28
call sites in ten files — the job card's Navigate · Call · Text row and this
record's action bar among them. It clears WCAG 2.2 AA target size (2.5.8,
24×24) with room and is under AAA 2.5.5's 44×44, which this product does not
claim; step 4 §3 measured the row at 38px and built its whole label ceiling on
that height; and raising it costs 16px of PINNED height on the narrowest
screen. **Kept, and `PRODUCT.md` now names the exception** rather than stating
a floor the product does not keep. Reopen it with the owner, not in passing.

**And the trap was written twice.** The first version computed the first and
last focusable and wrapped at the ends, and it let exactly one stop escape.
**A closed `<details>` lies about its contents:** the disclosure's hidden
*Remove from records* button reports `getClientRects().length === 1`, a 46px
box and a live `offsetParent`, because the browser hides it with
`content-visibility` rather than `display` — `checkVisibility()` is the only
one of the four that says false. The version that shipped does not ask which
control is last at all: it watches where focus LANDS and refuses to let it
settle outside the panel, which is shorter and blind to the whole class of
question. **A sheet opened from a sheet is inside that sheet's DOM, so the two
never fight over focus.**

### Two things left standing on purpose

- **On the desk, *Finalize payment* appears twice** — once on Today's lit card
  and once in the record open beside it. That is inherent to a record opening
  BESIDE its list rather than over it (F11): the list item stays on screen.
  Considered and kept; the alternative is a card that changes shape when it is
  selected, which is worse.
- **Marking a job complete from the record closes the record**, so taking the
  payment afterwards means reopening it — one extra tap. That is the callers'
  `onChanged` policy, not the record's, and changing it means the four callers
  re-selecting from a reloaded list or showing a stale `booking` prop. It is
  the same two-step the product already has on Today's card. Left for the
  stages that rebuild those callers (3-5).

## Roadmap 2.11, step 6, stage 3 — the calendar, and a signature move that had never once run

**Stage 3 of seven.** Month, the day, and History — one tab, two modes and a
panel under one of them. The designs are
`docs/dashboard-screen-designs-2026-08-31.md` §4-6 and
`docs/dashboard-phone-pass-2026-08-31.md` §5-7.

### The one to carry: Today's staggered arrival was dead, and nothing could see it

`theme.css`'s reveal block reads
`.app-main > .group > *` **and** `.app-main > .group > .col-1 > *`. Stage 1
added the second form when the primary column had to be wrapped, and **it
matched nothing**: a split screen's ROOT is `.split`, so the real markup is
`.app-main > .split > .group.col-1 > *` — `.col-1` **is** a `.group` rather
than a child of one. Every child of Today's primary column has been arriving
with `animation-name: none` since the day the shell shipped, on the one screen
the signature move exists for.

**Nothing in the product could report it.** A stagger that never runs looks
exactly like a screen that has already finished arriving; there is no error, no
console line, no layout difference, and the screenshot scripts photograph the
end state on purpose. It was found by reading the **computed** `animation-name`
on the live screen, which is the only place a selector that matches nothing is
visible at all — the stylesheet reads correctly either way.

**Same family as `dead-width` and the always-false contrast rows, and it is the
third member now.** The lesson is not "check your selectors": it is that
**a mechanism whose failure mode is silence needs a check that asserts it RAN**,
not one that asserts the screen looks right. Fixed by pointing both forms and
the `.lite` form at `.split`.

### The day is not a record, so it does not go through RecordHost

`RecordHost` decides one thing: a sheet below `--wrap`, the second column at or
above it. **A day answers neither.** It does not open beside its list, because
the list is a seven-column grid and taking a column off it is what §4 spends
its whole argument refusing; and it must not open OVER the grid, because the
month is the thing you read the day *against*. So it opens **inline, directly
beneath the grid, at every width** — the only place in the product where
selecting something opens a panel below rather than over or beside it.

`DaySheet` therefore takes an `inline` prop rather than losing its `<Sheet>`
outright: **Today's *Tomorrow* row still wants the sheet**, and it is right
there — there is no grid behind that one to cover. One component, two
containers, and the caller says which, which is the same rule `RecordHost`
carries one level up.

**On a phone the panel scrolls its week to the top** rather than the page
staying put: `scrollIntoView({ block: "start" })` on the cell, plus
`scroll-margin-top` on `.cal-cell` equal to the sticky top bar, because a
browser scrolls a target flush to the viewport edge and knows nothing about
what is fixed over it. At a desk both are already in view, so it does not fire
— `useWide` used for exactly what `hooks/useWide.js` says it is for.

**And at a desk the panel takes the width as a SECOND THING.** Month is the one
screen deliberately not split, so the panel under it inherits 1,144px, and a
job row that wide puts the customer's name at one end of the screen and their
money at the other. The day holds two different things — what is booked, and
what is true of the day — so the panel splits 1.35/1 at 1180. That is the
desktop specification's own rule ("width buys a second thing; it does not
stretch the first thing") applied one level down from the page.

### The month grid was swept; the day and the history never had been

`sweep-widths.mjs` clicked the Calendar tab, measured the month, and moved on.
**Four capabilities and a whole second mode had never been opened at any
width** — the day's three editors write `blockout_dates`,
`booking_hours_overrides` and `dropoff_only_periods`, and History carries a
filter bar, a ruled list and month rules. Exactly the gap stage 2 found on the
job record, one stage later. **A check that never reaches a thing reports
identically to a check that reached it and found nothing**, and a tab is not a
screen when the tab has three of them. The sweep opens all of it now.

### A fixed amount column, because `auto` made a ruled list ragged

Every `.row-item` is its own grid, so an `auto` final column sizes to that
row's own total: a row saying `$65.00` gave the two `fr` columns 4px more than
one saying `$235.00`, and the *what* column started at **572px on some rows and
576px on others**. In a list whose entire purpose is that you scan down it.
92px fixed, right-aligned — `money()` writes no thousands separator, so that
holds `$12345.00`.

**And `display: contents` is what makes the row one markup at both widths.**
The date and the service share one line-2 cell on a phone and are two separate
columns at a desk. Rather than render either twice, `.c-sub` wraps them and
then stops being a box at 1024, so its children become grid items of the row
itself.

### A failed read used to look exactly like an empty month

`useBookings` destructured `error` away and returned `data ?? []`, so a dropped
connection drew **an empty month, an empty day and an empty Money period** with
nothing saying so. Fixed in the hook, because all three screens had it — and
**finished on all three callers in the same change**, which is stage 1's own
lesson about the other half of a shared fix. The last good data stays drawn and
the message goes above it: a month you can still read is worth more than a
blank one that is also wrong.

### Things kept deliberately, so they are not found again as oversights

- **The day's *Add a job* survives.** Step 5's §12 names three New-booking
  doors and says the header `+` is the one doorway; two of the three carried no
  date and are dead. This one carries THIS day, which is the capability the
  other two never had — deleting it would cost a real thing to satisfy a
  count. Demoted from a full-width filled button to a `.btn.sm` beside the
  jobs: a control, not a door.
- **A no-show still counts toward a month rule's total**, because
  `status !== "cancelled"` is the rule the totals bar has always used and this
  stage did not reopen it. It is a money question, not a layout one; the note
  is here so the next person to ask knows it was inherited rather than chosen.
- **`.dashed` loses two of its seven users** (the day's *Nothing booked.* and
  History's empty state, both now one sentence). The class and
  `sweep-widths.mjs`'s `boxy()` selector die together, at the last one.

### A staff member saw two panels with nothing in them

Step 4 §5 and the phone pass §6 both say a staff member gets the day's jobs and
not its state cards. **The code drew them anyway** — measured on the seeded
staff session, `demo-staff@detailplatform.com`: *Block this day / Bookings
allowed as normal* and *Hours / Your normal hours for this weekday*, with
**zero controls inside either**. Two panels stating a default and offering
nothing to do about it, which §1a forbids on its own and which the owner's copy
rule forbids again.

**Narrowed rather than obeyed literally, and the narrowing is the decision.**
"Not drawn" would also hide an existing blockout or restriction from the person
driving to the job, and `DaySheet` has carried the argument against that since
roadmap 2.7: an existing restriction comes from a table staff CAN read and is
worth their knowing before they load the van. So it is **per card, not per
section** — an owner can always set one, a staff member only ever sees one that
IS set, and the *This day* heading is absent when none of the three is. Both
design files carry the amendment.

**It was only findable by signing in as the other role.** Everything else in
this stage was verified as the owner, and the owner's view of those two cards
is correct and always has been.

### Escape closes the record at both widths now

A sheet has always taken Escape, so below `--wrap` the job record did and above
it the same record did not — the seam `RecordHost` exists to hide, showing
through. It answers the key at both widths now, **guarded on there being no
open `.sheet-backdrop`**: a form you commit (Finalize payment, the text
picker) opens as a modal on top of the record, and without the guard one press
would dismiss the modal and the record under it together.

### composition.test.mjs test 1 was rewritten, and its first version passed against the commit it was written to catch

The rule the component inventory §1a settled: **an unbounded `.map(…)` may not
render a component whose own file draws a `.card` at its root, unless that
(file, component) pair is allowed with a stated reason.** The old test matched
only a literal `className` containing `card` inside the callback, and kept a
flat allow-set of filenames — with `BookingCard.jsx` on it, correctly, as the
file that DEFINES the card. That allowance then covered every CALLER, which is
how `Calendar.jsx` mapped eighteen bookings onto `<BookingCard>` and passed
while drawing 3,942px of stacked cards.

**The rewrite was baselined both ways, and the first attempt failed that
baseline.** Run against the pre-stage-3 `Calendar.jsx` it reported `ok`: the
caller regex used `[^)]{0,90}` to cross from `.map(` to the component name, and
a callback's own parameter list contains a `)`, so it could not reach past
`(b) =>` — which is how every real caller in this repo is written.
`[\s\S]{0,90}?` fixes it. **A check that has not been shown to fail is not
evidence of anything**, and this one had a passing green light on the exact
commit it exists to catch.

`Clients.jsx > BookingCard` is allowed **with the reason written as "NOT
SETTLED — stage 5 rebuilds Clients and this line goes with it"**, so the
allowance names its own expiry rather than looking like a decision.

## The copy pass — the owner's rule against explaining what the label already said

**His instruction, 2026-09-01, and he named the instance himself:** the job
record printed *"Mobile — we go to them"*. *"No duh. You don't need to say
that, and it just looks bad… it thinks that humans can't think, or it feels
the need to explain literally every single thing, which just gets annoying and
cluttered. Now I'm not saying to never explain anything."*

**The test that came out of it: does the sentence add a fact the control does
not already carry?** If not, it goes. Twenty-four sites across the dashboard,
the booking page and the way in — the durable form of the rule is in
`docs/design-system.md` § Never-defaults and in CLAUDE.md, which is where it
will survive a `/clear` and a move to another coding agent.

**What went**, as a shape rather than a list: a switch called *"A new booking
comes in"* explained with *"So you know before they do."*; a three-way choice
between *I go to them* and *They come to me* with each option defined
underneath it; *"Saved."* extended into *"Saved. This dashboard and your
booking page use it straight away."*; three section blurbs restating their own
headings; and two paragraphs of platform explanation where one clause does it.

**What stayed, and this is the half that stops the rule becoming its own
mistake.** *"Picking another swaps it."* — swapping is not visible from the
label. *"Past bookings keep it."* — the consequence of hiding a service is
genuinely not obvious. *"One reminder before the job. Timing is set in Booking
rules."* — it names where the other half lives. **The rule is against
restatement, not against explanation**, and a session that reads it as "delete
help text" will strip the sentences that were doing work.

**Nothing on the landing page changed.** Its copy was already written to this
standard and the owner approved that page; the register he objected to is a
dashboard and settings problem, which is where it was fixed.

## Roadmap 2.11, step 6, stage 4 — Money, the accountant export, and a chart nobody had measured

Stage 4 of the approval page's seven: the Money screen and the export he asked
for in §9 Q4. **The owner also reopened the calendar in the same prompt**, so
the desk day panel is here rather than in stage 3, and it is his decision
rather than a design one.

**THE CHART WAS THE POINT, AND IT WAS TWO DEFECTS RATHER THAN ONE.** Step 4
named the first: `.bars` was `align-items: flex-end` with `height: |value|`,
so **−$114 and +$114 drew the identical bar** and only the colour separated
them — the WCAG 1.4.1 failure the calendar's marks were rewritten to remove,
sitting on the one chart in the product. A win stands on a 1px rule now and a
loss hangs below it, one scale for both directions so a bar can never draw
past its own half.

The second was only findable by measuring: **the bars themselves were 1.51:1
and 1.68:1 against the ground** — `--fog` at 26% and `--bad` at 34%. The
system's own law 9 puts non-text at 3:1, and every previous reading of that
law had been about *edges*: a ring, a fill, a focus outline. **A bar is the
graphical object the content is IN.** 60% and 65% clear it at 3.18:1 and
3.21:1. **And raising the floor cost the selection something**, which is the
part worth carrying: a corrected tenant accent is only guaranteed to clear the
same 3:1 fill floor, so on the darkest presets a lit bar and a dim one could
now measure alike — selection carried by hue alone, which is the failure this
whole rewrite is about. **And it was measured rather than left as a worry: the
lit bar is 3.74:1 against the ground on Slate against 3.18 for the dim ones —
1.18:1 between them, and 1.27:1 on Crimson.** So selection gained two cues that
are not hues: the column behind the bar is TINTED (the system's own "selection
is tinted; a fill is an action or a fact") and the period's LABEL is lit. Then
the tint was checked the other way, because a tint of the accent is a ground
and that is the first of the five mistakes this file opens with: the lit bar
still clears **3.04:1 against its own tinted column** on the worst preset.

**THE 60/40 SPLIT IS RIGHT ONLY ONCE THERE IS A LOSS.** The phone pass fixed
the chart at 120px with the zero line at 60% of it. Built exactly that and
looked: six winning bars over 48px of reserved emptiness, and the rule read as
a gap rather than as an axis — the *"not enough content to fill the viewport"*
shape one level down, on a 120px box. **The chart is 72px with the rule on its
floor until a bucket loses money**, then 120px with the line at 60%. The
height is data-driven, which is honest: it grows for the one thing it exists
to show.

**THE EXPORT IS A FLAT LEDGER, AND THAT IS WHY IT CAN BE CHECKED.** "Jobs and
expenses, nothing more" could have been two tables in one file. One flat
ledger — a row per completed job, a row per expense carrying its own minus
sign — has a property two tables do not: **the Amount column adds up to the
Net figure printed on the screen it came from.** `tests/money-export.test.mjs`
asserts that tie-out and is baselined both ways (flip the expense sign and
three checks fail). CLAUDE.md's rule is *a number PRINTED is not a number
CHARGED*; `travel_fee` was drawn on the booking page for the whole life of the
quote engine without ever being in it. **An export is the same risk one step
later** — a file handed to somebody who will never check it against the
screen. It lives in `lib/`, not in the screen, so a credential-free node test
can import it.

**Its words are *"Export for my accountant"*, not step 4's *"Send this month
to my accountant"*.** *This month* is already on the line above it, which is
his own copy rule; and *send* would be a lie at a desk, where the file
downloads. On a phone it goes to the share sheet, which does send, and
*export* covers both. A download is invisible on a desk, so the button says
where the file went afterwards — a fact the label does not carry.

**THREE MEASUREMENTS OVERRULED THREE LINES OF THE DESIGN, AND ALL THREE ARE
THE SAME MISTAKE: A LAYOUT NUMBER WRITTEN BEFORE THE CONTROL EXISTED.**

1. **1.35 / 1, not 1.2 / 1.** At 1.2 the primary column is 609px and the
   period control on one line — which the same section asks for — is 607px for
   *"September 2026"* and 622px for *"Sep 2026 – Feb 2027"*. A line that holds
   for four of five period kinds and breaks on the fifth is not one line.
2. **The export takes its own row rather than sitting beside the period
   label**, for the same reason one step further along.
3. **The segmented control's wrap ends at 700, not at `--wrap`.** The five
   chips are 367px of content: a 392px phone gives 356 and wraps 3 + 2 as the
   phone pass decided, but a 768px tablet gives 748, where five 230px segments
   read as a navigation bar. **With `and (min-height: 500px)` — the fourth
   site of the rotation guard**, found by grepping the breakpoint, which is
   the lesson stage 1 left about the third.

**AND THREE THINGS THE DESIGN DID NOT ASK ABOUT, FOUND BY BUILDING IT.**

1. **"Waiting on payment" was answering a period question.** The unpaid list
   was filtered out of the same window the chart uses, so **switching from
   Month to Week changed who owed you money** and last month's unpaid job
   disappeared from the one screen that exists to chase it. Who owes you is
   not a period question. It is its own read now, with no dates on it.
2. **`loadExtras` swallowed all three of its errors** — `data ?? []` turned a
   dropped connection into *"no expenses, nothing outstanding, nothing sold on
   site"*. This is `useBookings`'s stage 3 defect, in the file next door, and
   it is worth naming as a pattern rather than a bug: **`const { data } =`
   destructures the error away, and every one of these was written that way to
   keep the line short.**
3. **The expenses read stopped at TODAY rather than at the end of the
   period.** `to` is clamped to today so the chart does not read a month that
   has not happened; an EXPENSE can legitimately be dated forward inside the
   current month — a supply order, an insurance instalment — and clamping this
   read too made it invisible on the screen whose job is to list it.

**THE CALENDAR: HE OVERRULED STEP 4 §4, AND THE PARAGRAPH HE OVERRULED WAS
ARGUING AGAINST AN UNMEASURED COST.** His words: *"the calendar kind of has
these huge blocks that take up the entire desktop space, and you have to
scroll down… maybe shrink it a little, and have the information that is below
it on one of the sides. We have the space."* Step 4 said the month *"must not
be split: a second column takes the width straight back off the cells"*, which
is true and was weighed against nothing — **at 1440x900 with a day open the
page was 1,284px against a 900px screen**, so the panel began 20px below the
fold and every control on it was a scroll away, on the screen whose whole
purpose is that the month stays visible.

**What ships: a fixed 420px second column, not a ratio.** Everywhere else in
this product the second column holds a record or a filter list and can take a
share of the width; here the first column is a seven-column GRID whose cell
width decides whether the month can write itself out, so the panel takes what
it needs and the month keeps the rest. **The month writes its jobs out while
the grid is ≥1,024px** — the width it has at `--wrap` today — and falls back
to marks below that, with the legend growing to decode them, which is why the
legend, the cells and the grid's class all read **one** flag. On his 1920
monitor nothing is lost; on a 1440 laptop the month becomes marks for as long
as the day is open, which is the trade he named.

**`--wrap` lifts to 1720 for this one screen, and that is not "stretching the
first thing".** The desktop spec's rule is that width buys a second thing. The
grid is the same 1,144px it has at every desktop width today; the extra screen
goes to the new column. `.app-main:has(> .split.calday)` rather than a class
threaded through `App.jsx`, because a screen cannot reach its own container
and a prop for one rule is a second mechanism.

**A JOB OPENED FROM THE DAY REPLACES THE DAY.** Two panels cannot share one
grid cell, and a record belongs beside the list it came from — which, on this
screen, is the day panel. Closing the record puts the day back. It is the same
answer History already gives when a job replaces its filter column.

**WHAT WAS LEFT, ON PURPOSE.** A no-show still counts toward a month rule's
total (stage 3's note, still a money question rather than a layout one);
`document.title` is still "Detailing Platform" on every route (stage 2's
finding, still product-wide); the month grid is still 30 tab stops (stage 3's
note, still a change to the cell's interaction model). **And at 1440x900 the
month loses its written cells while the day is open** — that is the cost of
his own trade, it is stated here so nobody finds it and files it as a bug, and
the fix if he ever wants it is a wider `--wrap` on that screen, not a
different layout.

## Roadmap 2.11, step 6, stage 5 — Clients, the client record, and three of his own corrections

*2026-09-02. Stage 5 of the approval page's seven, plus three things he sent
with the prompt that are not stage 5 at all.*

### The screen

**Law 1 gives Clients two properties nothing else in the product has: it is
the only screen with no panel on it, and §9 makes its record the only record
with no container.** Both shipped, and the second one needed a decision.

`docs/dashboard-component-inventory-2026-08-31.md` §3c predicted a new file,
`components/ClientRecord.jsx`, and gave a reason: *"it has to render into a
column with no card around it; it cannot stay inline in `Clients.jsx`'s
sheet."* **That reason dissolved the moment the record stopped being a
sheet.** `Clients.jsx` renders `RecordHost` directly now, so its rows already
sit in a column; what was actually needed was for `RecordHost` to be able to
draw no box. It gained a `bare` prop — `.record.bare` drops border, background
and padding and keeps everything that is BEHAVIOUR (the height cap, the body
that scrolls so the list beside it stays put). **A component with one caller,
extracted to satisfy a prediction, is the abstraction this repo's own rules
forbid.** The inventory row is marked NOT BUILT with this reasoning rather
than deleted.

**THE LIST IS FULL-BLEED ONLY WHILE NO CLIENT IS OPEN, and that took a rule of
its own.** Every other split screen puts something in the second column when
no record is open — History its filters, Money its unpaid list, the calendar
its day — so `.split`'s always-on grid is right for them. This screen has
nothing to put there and law 1 forbids the panel that would fill it, so the
grid left **465px of the content column permanently empty**: the `dead-width`
failure one level down, inside the column rather than beside it.
`.split.clients:not(:has(> .col-2))` drops to one column. `:has()` rather than
a class, because the condition IS "is there a second column" and React already
answers that by rendering one.

**AND THE FOUR COLUMNS WERE RE-PROPORTIONED AFTER LOOKING AT THEM.** Built to
step 4 §8's own order first — name · last visit · spend · phone, all
left-aligned — and at 1920 the name started at x=448 with the last phone
number **290px short of the hairline's own end**. Everything bunched in the
middle of a 1,144px rule, which is the *"not enough content to fill it"* shape
inside a row. The figure and the phone are right-aligned now so the row ends
where the line ends. **The general form is worth carrying: a full-bleed row
has to be pinned at BOTH ends, or the width it gained shows up as a hole.**

### Law 1's actual question, and how it is answered

**"History and Clients must not become the same shape"** — and both use
`.rows.cols`, which the component inventory §1a settled as one chassis with
two column templates. What keeps them apart is STRUCTURE:

| | History | Clients |
|---|---|---|
| What it lists | events | people |
| Time axis | month rules carrying a month's total | none |
| Per-row mark | a status dot | none |
| First control | a search field and nine filter chips | a search field, then a sort and one chip |
| The row ends with | the money, right-aligned — you are scanning a ledger | the phone, right-aligned — the row's last job is to let you act on the person |

Written into `docs/dashboard-skeletons.md`'s register so the next session does
not re-derive it.

### The defects the build found

1. **Part B row 6 — "last visit" could print a future date.** It read the
   first row of a newest-first history without asking whether the job had
   happened. It is now the most recent completed job whose `end_at` has
   passed, computed once for the whole list rather than per opened record — so
   the fix reaches the ROW, which is where the design put the figure.
2. **THE LIST READ SWALLOWED ITS ERROR, AND THAT IS THE THIRD SITE.**
   `const { data } = await q` destructures the error away, and it turned a
   dropped connection into *"No customers yet — they appear on their own when
   bookings come in"* — the most reassuring possible way to be wrong.
   `useBookings` carried it until stage 3 and `loadExtras` until stage 4.
   **Three files, three stages, one line each.** It is written this way every
   time because it keeps the line short. **Grep for `const { data } = await`
   before writing a new read.**
3. **`completed_washes_count` on `customers` is dead.** It exists in the
   schema and nothing in the product maintains it. The two figures come from
   one query of the business's completed-and-ended bookings, aggregated by
   phone in the browser — the same shape Money's *Lifetime* already has, and
   fine at a detailer's volume.

### His three corrections, which arrived with the prompt

**1. The Money period control's 3 + 2 wrap.** *"The bar that says week, month,
six month, year and lifetime kinda looks funky… there's three on top, two on
the bottom, and they're spaced out weirdly."* It is measurable rather than a
matter of taste: `flex: 1 0 28%` let each ROW share itself out, so the top
three were 110px and the bottom two 168px — **five cells of two different
sizes inside one control**. It is a grid of equal columns now, which is what
§ THE 320 FLOOR already does for a segmented control that will not fit. **And
4px of side padding rather than 6 is the whole difference between one line and
two**: at 392 the cell is 67.2px and *"6 months"* sets 55.4px against the
55.2px that 6px leaves it. **It wrapped by two tenths of a pixel, and every
cell then took the taller row.** 39.6px tall now against 55.2.

**2. "Export for my accountant" → "Export".** *"They may go by a different
name. Maybe they're not even exporting for the accountant, they're exporting
for some separate reason. It's weird to have a button that says exclusively
export for my accountant. And it takes up an entire line, which, screen space
is valuable."*

**The rule it produces, and it is new: a label names what the control DOES,
never who the result is for.** A use case is the detailer's business; naming
one narrows a button that was never narrow. This is a sibling of his
2026-09-01 rule (*copy that explains what the label already said*) and it is
not the same rule — that one is about redundancy, this one is about
presumption. **Both are now in `docs/design-system.md` § Never-defaults.**

He also asked for the button to stop taking a row. It rides the period line
now, `margin-left: auto`, which **overrules step 4 §7's "chips left, stepper
and label right" on one line at a desk** — arithmetic: at the 1.35fr column
the control is 367px, the stepper and label 202, the button 100 and the gaps
24, which is 693px in 628. Breaking **after the control** keeps the period's
name beside the button that exports that period and gives the desk the same
two rows the phone has. **At 768 all four now fit on one line, which they did
not before.**

**A COPY SWEEP WAS RUN FOR THE SAME SHAPE ELSEWHERE, because he asked.** Every
button and link label in the app, every `Setting` label, every `help=` and
`blurb=`, and every standalone JSX text node in the dashboard screens.
**Nothing else in the product names a use case in a control's label.** The
2026-09-01 copy pass is why: every remaining help sentence adds a fact its
label does not carry. Two were looked at and kept, with the reason:
*"Reset to what this device suggests"* (Preferences) names what it resets TO,
which is the non-obvious half, and *"Add a note or change the date"*
(ExpenseModal) names what is behind the fold, which a bare *"More"* would not.

**3. The ground's lights carry the tenant's colour.** *"The background kinda
has this dark and then it kinda glows… should that change with the hue of the
color that they chose? I think that'd be cool for the entire background to
have a pop of the color they chose… I don't want it to just be straight their
color. It should be a little diffused, have some white in it."*

**The load-bearing decision is that the colour is MIXED INTO the two existing
lights and THE TWO ALPHAS DID NOT MOVE.** A third light, or more alpha on
these, is more light: the ground under the corner rises, and every floor
measured against the ground is measured against a value that no longer holds
there. **It was built at 8.5% / 7% first and the numbers said no.** Money's
dim bar and losing bar measure **3.07:1 and 3.05:1 against the LIT CORNER** —
not the 3.18 / 3.21 stage 4 took against the bare token — so the margin over
the 3:1 non-text floor was **0.05**, and the extra alpha spent it: 2.98 and
2.94 on a pure-white accent, **3.01 and 2.99 on Silver, which is a real
preset.**

At the original 7% / 5.5% the tint costs the floor nothing it did not already
lack. Measured across the twelve presets and the four extremes:

| | Before | After |
|---|---|---|
| Chart bars on the lit corner, worst case | 3.07 / 3.05 | **3.04 / 3.02** (pure white; 3.07 / 3.03 on Silver) |
| Ten of the twelve presets | 3.07 / 3.05 | **higher** — a corrected accent is darker than the near-white it is mixed into |
| `--bone` on the lit corner, worst case | 15.11:1 | **14.96:1** |
| `--bone` on the lit corner, best case | 15.11:1 | **15.97:1** |

**And the chart is not on that corner at either verification width** — at 392
and at 1440 it falls outside both gradients' 66% falloff — so those are the
worst point on the SCREEN rather than the bar's own.

**Law 11b is not in play**: the ground is identity, not meaning. Nothing about
paid / cancelled / error moved.

### Measured after

| | |
|---|---|
| `sweep-widths.mjs` | clean at 1920 / 1440 / 392 / 360 / 320, normal and `?lite=1` — **and it opens six Clients screens now, against one** |
| Console at 1920 / 1440 / 768 / 392 | nothing but the two pre-existing React Router v7 future-flag warnings |
| `composition` · `design-contrast` · `landing-pricing` · `route-contract` · `money-export` · **`client-list` (31, new)** · `decisions-index` · `accent-sweep` | all pass |
| Clients' arrival | `arrive @0 / 40 / 80 / 120ms` on `.col-1`'s children at 1440 and 392, every one `none` under `?lite=1` — asserted on the COMPUTED `animation-name`, which is stage 3's lesson |
| Keyboard | Tab reaches a client row with a 2px accent ring, Enter opens the record, Escape closes it and returns to the list |
| Money's period control at 392 | 39.6px tall, five equal 67.2px cells, one line |

### Left open

- **The list reflows from 1,144px to 651px when a client opens**, which is the
  cost of full-bleed. The chrome above it does NOT move (the search field
  keeps a 520px cap), so the jump is the list alone. **It belongs to roadmap
  2.17**, which he opened for exactly this complaint on the calendar — *"it's
  almost like I refresh the page."*
- **The three carried forward since stage 2 are still carried**: `document.title`
  is "Detailing Platform" on every route; the month grid is 30 tab stops; a
  no-show still counts toward a month rule's total.

---

## Roadmap 2.11, step 6, stage 6 — Business, the twelve settings screens, and three repairs

**Stage 6 of seven.** `screens/More.jsx` is deleted; `screens/Business.jsx`,
`components/GearMenu.jsx`, `components/SettingsHost.jsx`,
`screens/more/index.js`, `screens/more/Reviews.jsx`,
`screens/more/SwitchBusiness.jsx`, `app/public/sw.js`, `app/src/lib/push.js`,
`supabase/functions/_shared/brandColor.js`, `tests/email-brand.test.mjs` and
one migration are new. **Nothing is waiting on the owner except one question
he has not been asked yet — the QR — and one thing only he can do, which is
tap the push switch on a real phone.**

### The admission test, and why it is in the code rather than only in a file

> **A row belongs on Business only if it changes what a CUSTOMER meets. If it
> changes how the app BEHAVES for the detailer, it goes behind the gear.**

Step 4 §10 wrote it and said, correctly, that without it "Business" is "More"
with a better name in six months. So it is repeated at the top of
`screens/Business.jsx` — the file somebody will be looking at when they are
about to add a row is not the design document.

**Eight rows in three groups, four behind the gear.** Eight headings for
eleven rows becomes three for eight. The four that moved — Notifications,
Message templates, Team, This device — moved because they fail the test, not
because the screen was long.

### The gear is a DESTINATION, and the smaller design won

The obvious build was a sheet from the header holding a menu, with its screens
opening inside it. That is a **second container mechanism for one set of
screens**, and those four would then be sheets at a desk — the exact thing
this stage exists to end. Rendering the gear where a tab renders means
`SettingsHost` decides page-or-column once, for both doors, and pressing the
gear again returns you to the tab you were on rather than to Today.

`App.jsx` holds it as a boolean beside `tab`, not as a sixth tab: no tab is
lit while it is open, because a lit *Today* over a settings screen is the
shell telling you where you are not.

### Twelve, not thirteen, and no FAQ row

The owner split the FAQ himself on 2026-08-31: storage in 2.11, screen later.
`20260902001000_faq_storage.sql` adds `business_settings.faqs` and
`faq_enabled` (jsonb + boolean, the same reasoning `travel_zones` and
`vehicle_sizes` carry — small, ordered, entirely tenant-defined, never the
target of a foreign key). **There is no Business row for it**, and that is not
tidiness: a row that opens nothing is the push switch's own defect wearing a
different label, on the one screen where that defect is being repaired.

**Twelve settles a count three files disagreed about.** The phone pass §12 was
right; step 4 §11 said "twelve" in its title and listed thirteen.

### Staff get THREE rail buttons, and two files said four

Screen designs §10 says plainly *"staff do not get a Business tab"* and then
counts *"four rail buttons, not five"*. Both cannot be true: staff already had
no Money. The sentence is the load-bearing half and the number was inherited
from desktop spec §5f, written while staff still had Business. **Today ·
Calendar · Clients, plus the gear**, which keeps Message templates, This
device and the account block — which §10 itself names as what a staff session
can actually use. Both files are corrected.

### THE COLOUR REPAIR (D1), and the one place a second implementation is allowed

The worst defect on step 4's list, and it was two defects wearing one name.

**One colour, written to both columns.** Law 11 gives a tenant ONE accent.
`business_branding.secondary_color` was a schema accident: nothing in the
dashboard or on the booking page ever read it, and the one thing that did was
the email. `Appearance` now writes the same hex to both, and `BusinessInfo`'s
colour pickers are gone — **both of them, not the one the inventory row
named**. That row said "the second colour picker", meaning the second SCREEN
offering one; with `Appearance` writing both columns this screen had no
business writing either. Keeping them in step matters: a business that never
opened Business info would otherwise have kept a stale second colour forever.

**And the email had no floor at all.** Three failures, all fixed in
`supabase/functions/_shared/brandColor.js`:

| | Before | After |
|---|---|---|
| The 3px rule on the header band | `secondary_color` on a band of `primary_color` — **1:1 once they are one colour** | the band's own ink |
| The band's title | hardcoded `#ffffff` — unreadable on Sunflower or Silver | measured, black or white, with the same 4.5:1 guard `accentTriple` applies |
| The brand colour as WORDS on white | uncorrected; Silver measures **1.36:1** | corrected to 4.5:1 against the paper |

**The band is corrected to 3:1 against the paper too**, because it is the only
place the detailer's colour appears at size in an email and a near-white band
on a white card is not a header.

**THIS IS THE ONE PLACE IN THE REPO A SECOND IMPLEMENTATION OF THE COLOUR
MATHS IS ALLOWED**, and the permission has a price attached. `lib/theme.js`
says it is "THE ONLY FILE ALLOWED TO COMPUTE OR WRITE COLOUR FROM JS", and it
means it — every drift bug here came from two places doing the same arithmetic
slightly differently. Email cannot import it: an edge function is a separate
Deno bundle and the Supabase CLI will not follow an import out of `supabase/`.
So the port exists, it is a plain `.js` module with no Deno API in it **on
purpose** — Node runs it in the test, Deno runs it in the function — and
`tests/email-brand.test.mjs` (97 checks) imports BOTH and asserts they agree on
the twelve presets and the four extremes. **Drift is a failing test, not a
surprise in somebody's inbox.**

**One trap this uncovered:** `scripts/deploy-functions.mjs` uploaded only
`_shared/*.ts`. A `.js` shared module would have been silently left out, and
`email.ts` would have failed at RUNTIME — every function that sends mail —
rather than at deploy. Fixed in the same change.

### THE PUSH REPAIR, and a second half nobody had checked either

The owner reversed step 4 §11's "withdraw the switch" on 2026-08-31: *"the
push switch STAYS and its missing browser half gets built."*

Built: `app/public/sw.js` (a `push` handler and a `notificationclick` that
reuses an open tab rather than opening a fifth dashboard),
`app/src/lib/push.js`, three callers on `api`, and a `probe` branch on
`owner-push-subscribe` that serves the VAPID **public** key.

**Three judgments in there worth keeping.**

1. **The permission prompt is asked LAST**, after the worker is registered and
   the server has handed over a key. A browser gives one prompt per decision;
   a detailer who is asked and then hits a missing key has spent it, and
   "Allow" is wired to nothing until they dig into browser settings.
2. **The key is served, not built in.** A `VITE_` variable would be a second
   copy of something that already lives beside its private half as a function
   secret. It is a public key — a browser holding it is the entire point.
3. **The switch reads THIS DEVICE, not the database.** `push_enabled` is a
   business-wide preference the edge functions check before sending; whether
   this phone is registered is a fact about this browser. Drawing the second
   from the first is what made the old switch a lie. Unsupported, blocked and
   off each get their own sentence, because they look identical on a switch
   and the middle one cannot be fixed by tapping harder.

**AND THE SERVER HALF WAS NOT LIVE EITHER.** `OWNER_VAPID_PUBLIC_KEY` /
`_PRIVATE_KEY` / `_SUBJECT` were **never set** on the platform project, so
`sendOwnerPush` had been taking its "VAPID keys not configured — skipping"
branch for its entire life. Every document in this repo describes the server
side as working; nobody had listed the secrets. A P-256 keypair was generated
with Node's own `crypto` and set on `kguqylyzgyzfktkfnhjb` (the platform's
project — never the live business).

**VERIFIED END TO END — THE OWNER CONFIRMED IT THE SAME DAY.** The automated
half went as far as it could: the worker registers and activates, `/sw.js` is
served as `text/javascript` and is in `dist/`, the deployed probe returns an
87-character base64url key, and the BLOCKED branch renders correctly in a
browser that denies. **The GRANTED branch was always going to need a person**
— headless Chromium reports `Notification.permission === “denied”
unconditionally and `grantPermissions` does not change it, and a headed
browser will not launch in this environment. So it was handed to him as the
one thing only he could do, he tapped the switch, and his answer was
*“works”*. **First delivery in the life of the feature.**

**THE LESSON IS THE SHAPE OF THE FAILURE, NOT THE FIX.** Push had a table,
three edge functions, a whole `/job/:id` route built for the tap, a switch on
a settings screen, and every document in this repo describing the server side
as working. It was dead in TWO places at once, and neither announced itself:
no client code at all, and three unset secrets behind a `console.warn` inside
an edge function. **A feature can be complete in five places and dead because
of a sixth that nobody listed.** If push ever goes quiet, check the secrets
before anything else — that failure is invisible from the dashboard.

### THE REVIEWS DOOR, and the honest thing it says

`testimonials` has existed since the first tenant migration,
`get_public_business_profile` returns the active ones, and
`BookingBusinessContext` puts them on the booking page's context. Nothing
could ever write one.

**The screen is the door. It is not a display**, and the screen says so rather
than implying otherwise. The booking page READS them and does not DRAW them:
its steps are on a measured height budget (W16 — step 1 has 10px spare at
1440x900), so a block of quotes cannot be dropped into one. The tenant
websites are where they were always going. **A screen that collected words and
implied they were live somewhere would be the push switch again one screen
over**, which is why the blurb names the destination.

**Hide, never delete, is the default.** `is_active` is what the public read
filters on, and a review is somebody else's words about a job that happened;
taking one down should not destroy it. Delete stays and asks first.

### Six more things, all found by building or by measuring

1. **THE BOOKING LINK WAS DRAWN TWICE ON ONE PHONE SCREEN.** `SettingsHost`
   rendered its resting second column at every width; below `--wrap` `.split`
   is not a grid, so it simply stacked under the index — beneath the copy the
   caller had already put there. **Guarded on `wide` now.** Found in a
   screenshot, not by reasoning about the markup.
2. **`.row.between` IS WRONG FOR A HEADING WITH NO BOX.** Catalog's category
   heading threw its own reorder arrow 700px away from the words it moves —
   the "not enough content to fill it" shape inside a row, which is what stage
   5 had to fix on a Clients row. A control sits beside what it acts on; a
   SERVICE's arrow stays right because that row is a card and has an edge.
3. **A SETTINGS PAGE'S TITLE IS NOT A TAB MASTHEAD.** At `--t-display` (30px
   on a phone) "Services & add-ons" beside a 44px back control came back as
   "Services & add-o…". `--t-title` fits the longest of the twelve at 320. A
   truncated TITLE is the one string on a screen nobody should have to guess.
4. **`Switch` TOOK A `disabled` PROP AND DROPPED IT.** The bare form honoured
   it; the row form did not render it at all. Invisible until a switch got a
   state it must refuse to leave — push, when the browser has blocked the
   site. **A switch that looks live and does nothing is this stage's own
   defect one level down.**
5. **`.clamp2` DID NOTHING AS WRITTEN.** `.row-item .sub` is two selectors and
   sets `white-space: nowrap`, so it won. A rule that loses silently is
   indistinguishable from a rule that is not there — the same family as a
   skipped check reading like a passing one.
6. **`BusinessContext` COULD ONLY EVER OPEN THE FIRST BUSINESS.**
   `memberships?.[0]`, with a comment saying switching came later. The
   database has supported two per account since the staff-roles migration.
   The chosen one is a **localStorage fact about the DEVICE** — the same
   person can have the van's tablet on one and their laptop on the other, and
   a server-side "current business" would fight them for it.

### One arrow per row, and what that actually means

Part B row 17 named "2 arrows per row" as the defect. Up-only, absent on the
first row, is what shipped: **moving a row above the one before it reaches
every order a pair of arrows reaches**, and two 34px buttons on every row of
the longest list in the product is more furniture than list. `above` is passed
as an INDEX rather than a direction, because a service's neighbour on the
screen is the previous one in its CATEGORY, which is not always the previous
one in the flat list.

### The QR, which is a question and not a refusal

Step 4 §10 asks for the booking link "larger, with its QR" as the second
column's resting content. **It is not built.** A QR encoder is Reed-Solomon
and a bit matrix, not a few lines, so it means a dependency — and this repo
does not add one unasked. Without it the resting column is short at 1440x900.
That is honest rather than dead (it is the same shape Money's and Today's
second columns have, and it becomes the settings screen the moment a row is
pressed), but the QR is the thing that would make it pay for itself. **The
owner has the question in the handoff.**

### Deletions

`.dashed` (one caller left by now — it became a plain sentence) and `.badge`
(seven rules, zero users, byte-identical to `.pill`). `boxy()` in
`sweep-widths.mjs` lost `.dashed` in the same change, and the five comments
across `accent-sweep.mjs` and `lib/theme.js` that named `.badge` were
corrected. **No measurement moved and `accent-sweep` still exits 0** — that
coupling was checked rather than assumed, because CLAUDE.md requires it.

### Measured after

`sweep-widths.mjs` clean at 1920 / 1440 / 392 / 360 / 320, normal and
`?lite=1`. Console at all four verification widths: nothing but the two
pre-existing React Router v7 future-flag warnings. `composition` ·
`design-contrast` · `landing-pricing` · `route-contract` · `money-export` ·
`client-list` · **`email-brand` (97, new)** · `decisions-index` ·
`accent-sweep` all pass.

---

## The QR code, and the motion rule he asked to have confirmed

**Both from the owner on 2026-09-02**, answering the two things stage 6 handed
him. They are unrelated to each other and to stage 6's own scope, and they are
recorded together because they arrived in one message.

### 1. The QR — he said yes, and he specified the SHAPE

> *"Yeah. Probably just a QR code generator. You click generate QR code and it
> just pops up with the one that you could copy, save to your files, whatnot."*

**That is not the design's version and his is better.** Step 4 §10 wanted the
QR drawn permanently as the resting content of Business's second column. He
described an ACTION: a button, and the code appears when you ask for it. Most
visits to that block are to copy the link, so drawing a QR every time was
paying for a thing nobody asked for on that visit — and it made the QR the
largest object on a screen that is an index.

**So: a full-width *Generate QR code* button that is REPLACED by what it
makes.** Once the code is on the screen the button would be a control that
does nothing, and the two actions under the image — Save, Copy image — are
what is left to do with it.

**`qrcode-generator`, and the dependency argument was settled by
verifiability rather than by size.** A QR is Reed-Solomon over GF(256) plus
mask selection — 250-odd lines, not a few — and the thing that decided it is
that **there is no way to check a hand-rolled one SCANS.** That is the
`travel_fee` family: a number printed on a screen that was never charged. The
library has **zero dependencies of its own**, which `qrcode` (the more obvious
pick) does not — it pulls `pngjs`, `yargs` and `dijkstrajs`, all Node-only, to
support a file-writing API a browser never calls.

**FIVE THINGS ABOUT THE RENDERING, AND FOUR OF THEM ARE THE DIFFERENCE BETWEEN
A QR AND A PICTURE OF ONE.**

1. **Black on white with a 4-module quiet zone, on a near-black product.** A
   scanner finds a code by contrast and by its margin. Painting it in the
   tenant's accent on the dashboard ground would match the product and fail to
   scan, which is the one outcome worse than not building it. **Law 11 does
   not reach here** — the accent paints identity, and this is a
   machine-readable object that happens to sit on a surface.
2. **The canvas is 1,110px and the screen shows 200.** What SAVES is the big
   one. Saving what is on the screen is the mistake that makes a QR useless at
   the only size that matters — a card, a van panel, a window sticker.
3. **It is drawn in an effect, not in the click handler.** The canvas is only
   in the DOM after the state flips, so painting in the handler paints
   nothing.
4. **Its own line, never a third button beside Copy and Open.** Walkthrough
   W14 is the measured ceiling: three buttons across at 392 put *Open* 24px
   past the edge, which is why *Share* already takes its own line.
5. **The QR's copy button says "Copy image".** The button eight lines above it
   also says *Copy* and copies the LINK. Two controls with one label on one
   card, doing different things, is the label failing at its only job.

**AND ONE SENTENCE WAS WRITTEN AND THEN DELETED**, which is the owner's own
copy rule doing its work: *"Point a phone at it and it opens your booking
page."* The block is headed **Your booking page**, the address is printed two
rows above, and everybody knows what a QR code is. It added no fact the
controls did not already carry.

**`tests/qr-scans.test.mjs` IS THE POINT OF THE WHOLE EXERCISE.** It renders
the code exactly as `BookingLink.jsx` renders it, reads the canvas pixels back,
and **decodes them with a different library than the one that wrote them**
(`jsqr`, a devDependency — an independent implementation). It passes only if
the string that comes out is the string that went in. It also checks the quiet
zone is light, that the saved size is printable, and **that `QUIET` and `PX`
still match the component** — otherwise every other check is measuring a code
the product does not draw, which is a check that has quietly stopped testing
the thing it names.

**Baselined against a deliberate defect**, as this repo requires: with the
quiet zone set to 0 it reports **6 failures**, and clean again once restored.

### 2. The motion complaint — he asked whether it had stuck. It had.

> *"Can you add this for the next kind of code cleanup? And I said this before,
> so maybe it's already there. I just wanna confirm that it stuck — that
> throughout the site, there's multiple points where stuff just kinda pops into
> place, and there's no fluid animation… It's for desktop. Desktop's the
> majority of the things where you click something in the calendar, you click a
> booking, whatever, and it just instantly pops."*

**It was already roadmap 2.17**, opened 2026-09-01 with his words in full,
three named complaints and the principle. **Nothing needed re-deriving.** But
his re-statement carried two things the item did not have, and one of them was
a real gap:

**(a) IT IS A DESK PROBLEM, in his own words.** 2.17 named two desk instances
without ever saying that the desk is where the whole class lives. Below
`--wrap` `.sheet` carries `sheet-in` and `sheet-out`, so the phone is mostly
right already; at a desk a record, a day panel, a settings column and a picker
all simply appear. **That narrows the audit to `--wrap` and above.**

**(b) THE GAP, AND IT IS CLOSED: he wants it binding on NEW work now, not when
2.17 is scheduled.** *"Keep that in mind when we build future things so it's
already there."* A roadmap item does not stop the next session shipping
another instant-open — and stage 7 is first-run, which is nothing but things
that open. **So the standing rule was written immediately, into the two files
a session actually reads before building**: `dashboard-skeletons.md` §4 (the
motion budget, where the cap it sits beside lives) and `CLAUDE.md`'s Design
section. *Anything that opens, animates in; a new component ships its entrance
AND its exit in the change that builds it.* **What is left in 2.17 is the
retrofit.**

**The distinction that keeps this from contradicting the budget it sits in**,
and it has to be stated or somebody will read the two as a conflict: the budget
above it governs a screen's **arrival** — one stagger on first paint and no
more. This governs a thing you **opened**. It appeared because somebody
clicked, and it has to come from somewhere.

**And the list is longer than the three 2.17 names — stage 6 added two more on
the day he said it**: a settings screen entering the second column, and the
gear taking the main area. Neither has any motion at a desk. That is *"multiple
points"* confirmed rather than a new complaint, and it is written into 2.17 so
the audit starts from a list rather than from three examples.

## Roadmap 2.11, step 6, stage 7 — first run, and the count that lied for a whole role

**The last stage, so 2.11 is closed.** Two things the owner insisted stay two
— a stepped setup form and a separate guided walkthrough — and every judgment
call under them.

### The seventh step, because no design file names it

Screen designs §13a lists SIX areas the form collects: business info, hours,
services, add-ons, booking rules, promo codes. Component inventory §1b, the
phone pass §14 and §13a's own resume row all say **seven**. Services and
add-ons are one settings screen and two questions, which reconciles five of
the difference and leaves one.

**The seventh is *Your colour*, and it is derived rather than invented.** The
form collects what the BOOKING PAGE needs, which is the same test Business's
own eight rows pass (*what a CUSTOMER meets*). Business has eight; two of them
cannot be answered on a detailer's first morning — Photo gallery needs photos
they have not uploaded, Reviews needs customers they have not served. Eight
minus two, with the catalog split into its two questions, is seven:

> services · add-ons · promo code · hours · where you work · your details ·
> your colour

**The order is §13a's order** — what you sell, then when you work, then who
you are — so a detailer who quits after two steps still has a bookable page.

### Completion is DERIVED where the database can answer it

§1b's ruling is that a segment fills when a step is **completed**, never when
it is passed, precisely so the bar and Business's *"N of 7 done"* cannot
disagree. That ruling is right and it is only half of the question.

**The other half only appears once you have a business that predates the
form.** A business with three services has finished the services step whether
or not it has ever seen this screen — and every business on the platform is in
that position, including the owner's own. A purely stored count would open
Business on a fully configured business and tell it *0 of 7 done*, which is
both false and insulting.

So `setupProgress()` **asks the data first**: services, add-ons and promo codes
by count, hours by whether any day is open, contact by phone-or-email, colour
by `branding.primary_color`. The stored list in `business_settings.setup.done`
carries only what nothing else can answer, and it is only ever appended to.

**`where you work` is the one step that can never be derived, and that is a
fact about the schema.** `mobile_enabled` and `dropoff_enabled` both default
to `true`, so *"I do both"* and *"nobody has been asked"* are byte-identical.
It is the only step that stays open until a person answers it — correct, since
it changes what the booking page asks the customer — and it is why the seeded
demo reads **6 of 7 done** and the row on Business does not disappear for an
established detailer until they answer it once.

### One jsonb column, three facts, and a backfill that is the whole safety of it

`business_settings.setup` is `{done, seen, dismissed}` — the same
small/ordered/tenant-only shape that `faqs` and `travel_zones` argued for, and
for the same reasons. `seen` is written **by the form on the way in**, not by
whatever opened it, because both doors lead to the same component; without it
the form is a first run every morning, since finishing all seven steps does
not set it.

**The migration marks every business that already exists as seen**, and that
line is doing more work than it looks. Without it the form would open itself
on the next sign-in for every detailer on the platform — including the demo
that every verification script drives, which would have made a clean sweep
impossible to take. First run has already happened for them.

### Six editors written, one reused, and the split is not arbitrary

*Your colour* renders `screens/more/Appearance.jsx` **whole**: it commits on
the tap that picks a swatch, has no Save button, carries the corrected-colour
preview and the "what you picked, in words" sentence, and duplicating any of
that would be a second implementation of the one thing this repo has a rule
about.

**The other six settings screens all END in a Save button**, and that is
exactly why they are not reused. §13a says *each step commits on leaving it*.
A step that renders `Hours.jsx` and then offers Continue has two commit
gestures on one screen, and the one the person presses is the wrong one — they
type their hours, press Continue, and the hours are gone. So the form holds
one `draft` object and one `commit()` with a branch per step, and **Continue
is the write**. Skip is not.

That also puts every write for first run in one function where it can be read
against the schema, which is the same argument `lib/accountant-export.js`
makes about the money column.

### The tour's count lied for a whole role, and rule 3 could not have caught it

§1c rule 3 — *a step whose target is not on the page is skipped, silently* —
is right, and it runs the tour correctly on an empty dashboard. **It cannot
count the tour.** Measured on the demo's staff login: four steps delivered
while the caption said *"of 7"* the whole way, because Money, Business and the
booking link are all absent for that role and each absence was only discovered
as it was reached. A count that promises seven and delivers four is worse than
no count at all, and the count exists to carry the owner's own constraint —
*more steps rather than fewer*.

**So the plan is resolved once, before the first step is drawn.** A step that
names a TAB is available when that tab's own button exists — which makes
`App.jsx`'s role filter do the work for free, since those steps point at the
very buttons it removes — and a step that names nothing is available when its
own target is on the screen the tour starts on. Measured: **7** for an owner
with jobs, **6** on the empty dashboard (the missing one is *a job*, §1c's own
example), **4** for staff. Rule 3 stays as the safety net for a target that
was there when the plan was made and is not there now.

### The focus trap was three defects, and only a keyboard could see any of them

`aria-modal="true"` tells a screen reader the rest of the page is inert, and
rule 1 says the lit element is not clickable. **A backdrop stops a POINTER and
stops nothing else**: `Tab` walked straight into the dashboard behind the dim,
and `Enter` on the tab button the caption was pointing at would have navigated
away mid-tour — the exact outcome rule 1 exists to prevent. This is
`Sheet.jsx`'s defect from stage 2, one screen over, and its fix is reused
rather than reinvented: watch where focus LANDS and refuse to let it settle
outside.

**Adding the trap did nothing, twice, and both reasons are React rather than
CSS.**

1. The effect depended on `close`, which depends on `onClose` — an inline
   arrow in `App.jsx`, so a new identity on every render. The effect therefore
   tore down and re-ran constantly, and its cleanup restores focus to wherever
   it was when that render started. **The trap was fighting itself.** Both
   effects in the file are mount-only now and read their callbacks through a
   ref.
2. The caption is `visibility: hidden` until it has been measured and placed,
   so it does not flash at 0,0. **A hidden element cannot take focus.** The
   "focus moves to the caption card" call in §1c rule 6 had never once worked,
   and nothing on screen could show it. Focus is now taken in an effect that
   waits for the placement.

**The transferable part: an overlay's keyboard behaviour is invisible to every
check this repo owns.** `sweep-widths.mjs` measures boxes, the contrast tests
measure colours, and a screenshot shows a tour that looks perfect. A `Tab`
walk is the only instrument, and it found three separate bugs in ten seconds.

### The fix that looked fixed, and only `?lite=1` disagreed

The focus trap above was verified with a real `Tab` walk and passed. It was
also still broken, and the sweep found it — in the `?lite=1` path only.

`sweep-widths.mjs` gained two keyboard assertions with stage 7 (focus is
inside the caption card on open; five Tabs never land outside it), and they
went red on the reduced-motion pass while the normal pass stayed green.
**Measured: 200ms after the tour opened, the caption card already carried its
top and left and still computed `visibility: hidden`.** The card is hidden
until it has been measured and placed so it does not flash at 0,0, and a
`visibility: hidden` element cannot take focus — so "focus moves to the
caption card" was a race that the normal path happened to win and the lite
path happened to lose.

**It is `opacity: 0` now**, which is focusable and measurable, so there is no
ordering left to get wrong in either path.

**The transferable part is about the CHECK, not the CSS.** A keyboard walk in
one path is one sample of a timing-dependent behaviour. This repo already
knows that shape — *"a check that measures the page too early looks exactly
like a check that passes"* — and `--lite` turns out to be a second sample of
it for free, because removing every animation changes when things settle. The
two assertions live in `sweep-widths.mjs` rather than in a suite of their own:
the tour is already open there and the browser is already signed in, and the
alternative was a second login-dependent browser test for two lines.
Baselined — removing the `focusin` listener reports *tour · tab escapes*.

### Three smaller things that were only findable by running it

**The tour started on the wrong screen from its own second door.** It is
re-runnable from the gear, and the gear TAKES the main area — so a tour
started there had no Today on the page and silently skipped its first step,
which is rule 3 working perfectly and producing a wrong answer. The first step
names its tab now, which makes the tour deterministic from wherever it was
asked for.

**A fixed frame budget read a LOADING screen as a MISSING target.** Twelve
frames is plenty once a screen is quiet and nothing at all while it is
fetching, and every screen in this product paints a spinner while it does. The
give-up test asks whether a `.spinner` is on the page — the same signal
`sweep-widths.mjs`'s own `settle()` uses, and the same distinction: *measuring
too early looks exactly like measuring and finding nothing.*

**The caption needed a THIRD placement and §1c says "no third case".** At
392x844 the day rail is a **665px** hole with 98px above it and 80px below,
for a 130px card. Clamping to the top covers the first job, which is what the
sentence is about; the third branch pins it to the bottom edge, which is the
half of a long list nobody reads first.

### Pinning the actions had to have NO breakpoint, and the missing one is the decision

One question a step means most steps do not fill a screen — the *Where does
the work happen?* step is a heading and a three-way control, and a Continue
that stopped a third of the way down read as a page that had failed to finish
loading. The actions are pinned to the bottom of the frame, which is also the
thumb.

The obvious implementation was `@media (max-width: 1023px) and (min-height:
500px)` — CLAUDE.md's own guard, required of any layout decision that spends
height, and this is its sixth site. **It is wrong here.** A rule that fires
only in portrait means rotating a phone MOVES the buttons, which is the
owner's 2026-08-31 ruling being broken by the very clause written to respect
it. `.app-main:has(> .setupform)` becomes a flex column and `.setupfoot` takes
`margin-top: auto`, at every width. **The same rule at every size cannot
change on rotation** — which is the first time the answer to that question has
been "no breakpoint" rather than "a guarded one".

### Centred exactly once, spent a second time

The form is capped at 560px — §13a's *"a stepped form that widened would just
put more air around one question"* — and §13a does not say what the other
620px of a desk column do. A 560px column pinned to the LEFT of a 1,144px one
at 1920 is the "not enough content to fill the viewport" failure this project
already has a rule about, so it is centred.

That is the second and last spend of the design system's *"centred exactly
once"*, and the justification is the one §14 of the screen designs already
gives for the first: **these are the only screens in the product with exactly
one thing on them.** Sign-in and a stepped form. Nothing else may take it.

### The shell rules the setup form inherits, which no design file predicted

It takes the main area exactly as the gear does, so stage 6's two gear rules
apply to it unchanged and were only noticed by looking at a screenshot: **no
tab is lit while it is up** — a lit Today over a form you are not on is the
shell saying where you are not — and **pressing a tab is a way out of it.**
*Skippable at any point* has to include the bar that is already on the screen.

### Motion: the standing rule's first outing

CLAUDE.md's rule since 2026-09-02 — *anything that opens, animates in; a new
component ships its entrance AND its exit in the change that builds it.* This
stage is almost entirely things that open, and it is the first work bound by
it.

- **The form's ENTRANCE is the screen's existing staggered arrival.** It is a
  `.group` directly under `.app-main`, so its children already take the one
  orchestrated arrival the whole dashboard uses. Adding a second would be two
  animations running the same 420ms. **Its exit is its own** because nothing
  else provides one: opacity and 8px down at `--t-exit`, then unmount — which
  is `Sheet.jsx`'s leaving-then-unmount pattern, not a second mechanic.
- **A step arrives from the direction it was travelling**, transform and
  opacity, at `--t-exit` (180ms) rather than `--t-reveal` (420ms). A step
  change is a thing somebody does seven times in two minutes and 420ms there
  is a gate, which is the owner's own acceptance test: *fluid and connected,
  without being in the way of productivity.* Keyframes rather than a
  transition because React replaces the element on each step, so there is no
  previous value to retarget from.
- **The spotlight TRAVELS between targets rather than cutting**, because the
  point of a spotlight is that it is the same light moving. A transition, not
  keyframes — the target can change before the last move has finished and a
  transition retargets from where it is. The properties are named rather than
  `all`: four of them, on one fixed element with no children.
- **The dim uses `--overlay`**, the product's existing sheet backdrop value,
  rather than the `color-mix` §1c wrote. One dim in the product.
- **`.lite` covers all of it**, which is the app-wide reduced-motion path and
  needed no new media query.

### The progress rule's track is decoration, and that was measured before it was claimed

1.4.11 asks 3:1 of a graphical object required to understand the content.
**Measured: `--hairline` is 1.40:1 on the ground and `--line-2` would be
1.71** — no neutral in this system reaches 3:1 there, and the only token that
would (`--fog-2`) draws a 2px rule across the top of the form that reads as
ALREADY FULL, which is worse than faint.

**It does not need to, and the reason is which mark carries the fact.** The
information is *which steps are done*, and that is carried by the FILLED
segments — the tenant's accent as a fill on the ground, gated at 3:1 for every
preset by `accent-sweep.mjs`, and 11.32:1 for the house green. An empty
segment says "not done" by ABSENCE, and the gap between two filled marks is
legible because the marks are. The current step is also named in words
underneath, which is §1b's own accessible form of "you are here".

**And the keyboard was walked rather than assumed.** Focus lands on the step's
own heading when a step changes — a new question is a new heading, and nothing
else on the screen moves to say so — then the three inputs, then *I'll do this
later*, *Continue* and the quit line, each with the 2px accent ring. The *Add
this service* button is `disabled` while the name is empty and is correctly
out of the tab order.

### Verified on a genuinely new business, which the demo cannot answer

§1c says the walkthrough *"must be verified against the EMPTY dashboard, not
the seeded demo, which is the opposite of every other screen in this
rebuild"*. So an account was signed up through the real form and a business
created through `CreateBusiness`, and first run watched end to end:

- the setup form opened itself at step 1 with **two of seven segments already
  filled** — `create-business` gives a new business Mon–Fri 9–5 and the
  account's own email, and both of those are true, so deriving them is
  correct rather than a false positive;
- all seven steps were skipped in turn and not one of them blocked;
- the tour then ran **six** steps over the empty dashboard, the missing one
  being *a job* — §1c's own example, arrived at without being staged;
- Business afterwards carried *"Finish setting up · 2 of 7 done"*;
- after a reload neither came back on its own.

The business and its auth account were deleted afterwards.

**And every write was followed into the database rather than trusted.** The
seven steps were run once with real values against the demo and each row read
back: the service, the add-on and the promo code exactly as typed; seven
`business_hours` rows with four days open and the other three present with
null times — the invariant the slot engine depends on, which distinguishes
*"we don't work Sundays"* from *"hours were never set up"*; `contact_phone`
and `contact_email`; `mobile_enabled` true with `dropoff_enabled` false for
*"I go to them"*; and all seven keys in `setup.done`. The demo was re-seeded
afterwards, and `seed-demo.mjs` now pins its first-run state so the row the
sweep opens the form from is always there.


## Roadmap 2.12 — request mode, accept/decline and quotes, and the sixth status that was not written

Roadmap 2.12, built 2026-09-02. The owner's answer to 2.11's question 5, plus
his own clarification of it the following day, which is the sentence the whole
shape of this item hangs off:

> *"I didn't mean that if they choose to approve bookings… some could book two
> of the same slots. So someone sends a request, it will take up that time
> slot… one is just a little bit more guaranteed than the other."*

**Both modes hold the slot. Only the promise differs.** Availability is
identical either way, and everything below follows from that.

### The switch

`business_settings.booking_mode`, `reserve` | `request`, **default `reserve`**
— and the default is a decision, not a convenience: flipping an existing
business to `request` would change what its customers are told, mid-flight,
without anybody choosing it. It lives at the top of the Booking rules screen,
above *What you offer*, because it changes what every other rule on that screen
means.

`create-booking` reads it in one line. **An admin booking is never a request**:
the detailer typing one in at the counter is the person who would be accepting
it, so a request made by a member is confirmed.

### The fact that is true because nothing was written

**A request holds its slot, and the exclusion constraint was not touched.**
`bookings_no_overlap` excludes rows `where status <> 'cancelled'`; `pending` is
not `cancelled`, so a request is inside it and a second customer is refused
with no change at all. `available-slots` and `slotValidation` both filter the
same way, so a requested time is not even offered.

**That is a load-bearing fact established by NOT doing something**, which means
a reader of the migration cannot see it and a later session tidying `pending`
into one of those three filters would silently make requests double-bookable.
`tests/request-mode.test.mjs` tests 3 and 4 exist for that and nothing else.

### Why there is no `declined` status

A decline is `status = 'cancelled'` plus a new `declined_at` timestamp.

The alternative was a sixth status value. It was rejected by counting: **twelve
places in this codebase ask "is this booking still happening" as
`status <> 'cancelled'`** — two edge-function queries, the exclusion
constraint, `useBookings`, Today twice, Calendar three times, DaySheet,
BusinessInfo and Money's sum. Every one of them is **already correct** about a
declined request, because a declined request is not happening and its slot is
free. A sixth status would have meant editing all twelve to say the same thing
twice, and the first one anybody forgot would be a declined request still
holding a time nobody can book.

What `cancelled` cannot carry is WHO ended it, and that is the one thing
`declined_at` stores. The job record prints it — *"You declined this request."*
— because a column nothing prints is a column nobody can trust.

### A quote is offered, never charged

`quoted_amount`, `quoted_note`, `quoted_at`. A quote never writes
`total_price`. Only `accept-quote`, called by the customer from the link in
their email, moves one to the other.

**And when it moves, the itemisation still has to add up.** The confirmation
email and the invoice both print services, add-ons, travel and
`price_adjustments` and then a total. Moving `total_price` on its own would
leave the customer a receipt whose lines are short by exactly the size of the
quote — the same shape as the travel fee that was drawn on the booking page and
never charged (roadmap 2.8c). So the difference lands as a `price_adjustments`
line, which every surface that itemises already reads, and `subtotal` moves
with it. **`tests/request-mode.test.mjs` test 8 is the tie-out, baselined by
deleting that line: it then fails by exactly the quote (230 of lines against a
305 subtotal).**

Saying NO to a quote is the ordinary `cancel-booking`. A customer who will not
pay the quoted price is cancelling their booking — the slot frees, the detailer
is emailed — so there is no second decline path and one less place to get the
constraint wrong.

### Three things the new status broke, none of which announced itself

1. **The four `get_bookings_due_for_*` RPCs.** All four said
   `status <> 'cancelled'`, which was a complete description of "not happening"
   until this item existed. A pending request would have got the customer *"your
   appointment is tomorrow"* for an appointment nobody had accepted, and got the
   detailer nudged to go and do it. All four now say
   `not in ('cancelled', 'pending')`.
2. **The manual Reminder button** did the same thing by hand, past the RPCs
   entirely. Guarded in `send-owner-reminders` — in the FUNCTION, not only in
   the UI, because a guard that only hides a button leaves the hole open to
   anything else that ever calls it.
3. **`sweep-widths.mjs` measured a different object under the same label.** Its
   "job record · finished" step opened `.card.attend`, meaning "the lit job";
   since a waiting request now takes the lit treatment
   (`dashboard-skeletons.md` §6), that selector resolves to a REQUEST card on
   the seeded demo. **A rename with no error** — the run stays green while
   measuring the wrong thing. Both rail selectors are now addressed through
   `.dayrail` and by rail node.

   Fixing it exposed something older: the "to do" selector was bare
   `.row-item`, which in the evening matched a FINISHED job, so the script had
   been measuring the same record twice under two labels for as long as the
   demo has read its statuses off the clock. Tomorrow's first job is the door
   that is open at every hour, and it is swept now.

### What is lit, and what that costs

`dashboard-skeletons.md` §6 put a waiting request above unrecorded money, and
Today now implements it: when `requests.length > 0`, **`lit` is null** and the
rail draws no card at all. **The cost, stated because somebody will meet it
before they find the note:** while a request waits, the finished-and-unpaid job
loses its one-tap *Finalize payment* on Today and becomes a row. The action is
still one tap away inside the record. The order is the design's, and the
argument for it is that a customer who does not know whether they are booked
outranks money the detailer already holds.

### The demo takes requests now

`seed-demo.mjs` sets `booking_mode: "request"` and seeds **two** pending
requests — one plain, one already quoted, because those are the two states the
card has.

**This is a decision about the DEMO, not about Andrew.** His own business
reserves, and `reserve` is what every real tenant gets. But the demo is the only
business `sweep-widths.mjs` can log into, and a reserve-mode demo means the
request queue — the whole of this item's screen work — is never rendered at any
width by anything. **This repo has now written the same finding six times:** a
script that cannot reach a state reports clean on it. The sweep walks the
request record and the quote sheet as their own labelled steps.

### Two collisions with existing rules, both resolved in the file rather than quietly

- **`composition.test.mjs` test 1** flagged Today for mapping records onto a
  card. It is allowed as `Today.jsx > RequestCard`, with the reason written
  next to it: `dashboard-screen-designs-2026-08-31.md` §2 designed this queue
  and said *"one card"* in those words, and every row carries its own Accept,
  Quote and Decline — the Money.jsx allowance's reasoning exactly. **The
  ceiling is real and is stated in `Today.jsx`:** twelve unanswered requests
  would be twelve cards, and the answer then is a ruled list with the first one
  open, not a shorter card.
- **The screen designs put the request queue underneath the rail between 1024
  and 1180.** It is built above the ledger there instead — the phone's own
  position — for two reasons, the second deciding it: one fewer arrangement to
  maintain, and §1b says the first request is the lit object, which a position
  below the rail contradicts by putting it under the fold at 1100px. Written
  into §2 rather than left as a silent divergence.

### Three things found by looking, after the code worked

All three were invisible in the code and obvious in a screenshot:

- **Two accent-filled Accept buttons** the moment two requests were on one
  screen. Only the lit card's Accept is filled now, the same expression
  `BookingCard` already used for *Mark complete*.
- **The job record said "Quoted $165.00"** one line above *Send a quote*. That
  line is the price the CUSTOMER was shown; this item had just given the word
  "quote" the opposite meaning. On a request it reads *"They asked for"*.
- **A confirmation tick over the words "we're holding your time"** on the
  customer's screen. A tick means done and a request is not; it is a clock.

And one that only the customer's page could show: **two filled buttons**, the
quote's *Accept* and the page's own *Change the time*. While a quote is out,
the reason the page is open is the price.

### A clock-dependent test fixed on the way past

`tests/booking-engine.test.mjs`'s short-notice check failed against an entirely
unchanged pricing path at 22:31 local and passed at 15:00.
`Date.now() + 20h` then `.slice(0, 10)` yields a DATE, and 10:00 local on that
date is anywhere from 14 to 44 hours away depending on the hour the suite runs;
past 24 the rule correctly does not apply. The window is the test's to choose,
so it is widened to 96 hours rather than the date being computed more cleverly.
**A gate that is red at some hours and green at others is worse than a gate
that is red**, because the next session assumes it is theirs.

### The stale-request nudge, built 2026-09-03 — and it is the FIFTH of its kind

He approved question 2, so a request that has sat unanswered now chases the
detailer with a push AND an email.

**It invents nothing.** `bookings` already carried four `*_nudge_sent_at`
markers, `business_settings` four lead times, and `send-owner-reminders`
already looped one RPC per kind. This is a fifth of exactly that shape, so the
15-minute sweep, the marker-guard that makes it idempotent, the
reset-on-reschedule trigger and the manual mode all work on it unchanged.

**Three things about it are deliberately unlike the other four.**

1. **It is measured from `created_at`, not `start_at`.** The other four all ask
   "how close is this job"; this one asks **how long has the customer been
   waiting**, which is a different clock and the only one that makes sense for
   a request.
2. **The unit is HOURS.** The other four are minutes because they fire inside
   an hour of a job. A detailer thinking about an unanswered request thinks
   "sometime today", so the presets are Never / 2h / 6h / 12h / 1 day, and the
   default is **12 hours** — a request that arrives in the evening is chased in
   the morning rather than at midnight, and somebody who answers within half a
   day does not need nagging.
3. **It sends an email as well as a push.** The other three nudges are push
   only, and they can be, because they fire about a job the detailer is already
   thinking about. This one can fire on a quiet Tuesday about a request that
   arrived while the phone was in a pocket, and **request mode's whole promise
   is that the detailer answers** — a notification nobody sees is the feature
   not working.

**And what it must NOT do, which is the guard worth keeping:** it does not
chase a request whose time has already passed. That is not something to accept
any more, and a push saying *"accept this"* about yesterday would be worse than
silence. `tests/request-mode.test.mjs` test 13 pins all six behaviours —
too-soon, due, once-only, the off switch, the past guard, and that an accepted
booking is never in the list.

**The setting only appears in request mode.** A reserve-mode detailer can never
have a request, so the row would be a control that can never do anything —
the same reasoning as the Calendar's *Waiting* chip.

### Staff can answer requests, and that is a default rather than a ruling

Verified rather than assumed, on the staff demo login: staff get their three
rail buttons — Today, Calendar, Clients — and Today carries the request queue
with a working Accept. `respond-to-booking` uses `requireMember`, which does not
distinguish owner from staff.

**It is the right default for the roles that exist today.** Staff run the diary;
a staff-only day where nobody can accept a request is worse than a staff member
accepting one. **Roadmap 2.13 is where it becomes a tick box** — that item
replaces `business_users.role` with a permission set, and "can answer requests"
is one of the permissions it will have to name.

### He asked whether there are no animations yet — measured, and he is half right

> *"There's still no animations on the page, but is that just because we
> haven't gone to that stage yet?"*

**Read from the COMPUTED style on the live dashboard rather than answered from
the stylesheet**, because this project has already shipped an arrival animation
that was dead for a whole stage and looked exactly like a finished screen
(stage 3's finding).

**What IS running.** The screen's staggered arrival fires on every tab change —
`arrive`, 420ms, at 0 / 40 / 80 / 120 / 160ms delays, measured 120ms after a
Calendar click with the delays visible on the elements. Buttons, chips and
calendar cells carry 180ms hover transitions. The rail's job rows translate
their text. Below `--wrap` a sheet animates in and out.

**What is NOT, and it is exactly what he is seeing.** At a desk, opening a job
record produced **no new animation at all** — the second column simply appears.
The report 120ms after opening one shows only the screen's own arrival
(unchanged from before the click) and hover transitions. Same for the day
panel, a settings column and a picker.

**That is roadmap 2.17 and it is already scoped in his own words** — *"it is a
DESK problem"* — and CLAUDE.md already binds NEW components to ship an entrance
and an exit, which is why 2.12's request card has one. **What is left in 2.17
is the retrofit, and it is a LIST rather than the two he happened to name.**

### ~~THREE QUESTIONS STANDING FOR THE OWNER~~ — ANSWERED, ALL THREE, 2026-09-03

**He took the recommendation on all three**, and on question 1 he gave the
reason, which is worth more than the answer:

> *"The final pricing is usually done when you're there, and you can see the
> current person. Most of the time you don't really get quoted digitally. Now
> with the request thing — yeah, you send them the quote, but it's really gonna
> be based off of your pricing, not as much as the person's car."*

**That settles what a quote IS in this product, and it is narrower than the
word suggests.** A digital quote prices the JOB from the detailer's own price
list; the car is priced in person, on arrival. So a quote belongs on a request —
where the detailer is answering someone who has not been seen yet — and it does
NOT need to reach into the pricing engine, the vehicle condition, or a booking
already agreed. **A later session tempted to grow quotes into an estimating tool
should read that quote first.** `bookings.final_amount` and Finalize payment are
where the car's own price lands, and that has always been true.

**Question 2 approved: the stale-request nudge is built** — see below.
**Question 3 needed nothing**: he did not object to the demo taking requests.

Recorded below as originally asked, because the reasoning that produced them is
what makes his answers legible.

1. **Quotes exist only on a request.** A reserve-mode detailer — which is
   Andrew, and the default for every tenant — cannot send one at all. His
   words put quotes on "the accept page", so this is a faithful reading, but it
   means the feature is invisible to most of the product. The alternative is a
   quote on any future booking, which is a price change on a booking the
   customer already thinks is settled, and that is a bigger question than it
   looks.
2. **Nothing chases a request that went stale.** Today's queue is floored at
   `now`, so a request whose time has passed leaves the screen. It stays
   `pending`, on the calendar, behind the *Waiting* filter, and nothing
   notifies. `dashboard-skeletons.md` §6 says a request "goes stale on its
   own"; nothing acts on that yet.
3. **The demo now shows the request flow rather than his own.** The reasoning
   is above and it is about the sweep, but he opens that demo, and it is his
   product's shop window.


## Every email headline in the product was under the contrast floor, and it was found by rendering one

Roadmap 2.12, 2026-09-02. Not part of the item; found while checking that the
four NEW emails it adds actually look like anything.

### What was wrong

`shell()` paints the header band `brand.primaryColor` and, since roadmap 2.11
step 6's D1 fix, draws the brand NAME and the 44px rule in `brand.headerInk` —
*"what is legible ON that band — measured, never assumed."*

**Every template's own header block then hardcoded `color:#ffffff` for its
headline and `color:#e2e8f0` for the small label above it.** The fix had
covered the two lines `shell()` owns and stopped one line short of the eleven
the templates own.

**Measured on the twelve presets and the two dark extremes:**

| | contrast on the corrected band | floor |
|---|---|---|
| headline, `#ffffff` | **3.01 – 3.76 : 1** on all fourteen | 4.5 |
| small label, `#e2e8f0` | **2.44 – 3.05 : 1** on all fourteen | 4.5 |
| *"Invoice / Receipt"*, `brand.accentColor` | **1.20 – 1.57 : 1** on all twelve | 4.5 |
| the buttons, `#ffffff` on `accentColor` | 4.50 – 4.96 : 1 | fine, left alone |

**Not one preset passed the first two.** The third is worse and is D1 exactly:
`accentColor` is the tenant's colour corrected for **white paper**, and it was
being printed on the **band** — a colour is only safe against the ground it was
corrected for, which is the lesson this repo has now paid for four times.

### Why nothing caught it

`tests/email-brand.test.mjs` — 97 checks, written in stage 6 for precisely this
surface — **passed throughout.** It pins `brandColor.js` against `theme.js` and
asserts the three returned colours clear their floors. It never looked at what
the templates DID with the answer. **A test can verify the arithmetic and still
be blind to the drawing.** Same family as `dead-width` and the always-false
contrast rows: the check was real, it just could not see this failure.

It is 138 checks now. Test 7a reads the SOURCE for a hardcoded colour in a
header block — that is the only form that stops the next template being written
the same way — 7a-ii refuses a paper colour on the band, 7b asserts the floor
per preset, and 7c asserts the buttons are fine rather than trusting it.
Baselined by putting one `#ffffff` and one `accentColor` back: both fail.

### Three greys, nothing to do with the tenant

Measured in the same pass, and they are plain palette defects rather than the
colour engine: the fine print `#94a3b8` is **2.40:1** on the info card and
2.56:1 on paper, and the small labels `#64748b` are **4.46:1** — a hair under,
which is the number nobody catches by eye. They carry real sentences
(*"Nothing is charged until you say yes"*, *"This total is an estimate"*), so
they are text and take the text floor. Darkened along their own hue to the
first value that clears 4.5:1 on the FAINTER of the two grounds: `#687281`,
`#63738a`, `#6a7179`.

### The finding worth carrying

**Two of the eleven bad lines were written that same hour** — the request
header and `requestDecisionEmail`'s — by copying the template directly above
them. **A defect that lives in a pattern reproduces itself into every new
instance until somebody renders one and looks at it.** The rendering took about
four minutes: `esbuild --bundle` the template module, call it with a real brand
object, write the HTML, open it. Nothing in the repo did that before, which is
why eleven of these accumulated.

The other half is that the first render used **made-up field names** for the
brand object and produced a white band, which looked like a much bigger bug
than the real one. **Check the harness against the interface before believing
what it draws** — `TenantBrand` is `primaryColor` / `headerInk` / `accentColor`,
and nothing warns you when a template literal interpolates `undefined`.

## Roadmap 2.18, step 1 — what the trade's booking systems actually send

2026-09-03. The owner asked for the emails deleted and rebuilt, and he asked
for the research first, by name. This is the research; **nothing in `app/` or
`supabase/` changed.** The file is `docs/email-research-2026-09-03.md` and it
carries the tables, the per-claim source strength and the URLs. What follows is
the judgment, not the evidence.

**The panel is the same six products 2.10 and 2.14 used** — Jobber, Housecall
Pro, Zenbooker, Square Appointments, Urable, Mobile Tech RX — deliberately, so
counts are comparable across roadmap items instead of a new panel each time.
**The two detailing-specific products are the two with the worst public
documentation** (Urable's help centre is behind a login, Mobile Tech RX has one
public lesson page), so their rows establish that a feature exists and never
how it is configured. That is marked in the file rather than averaged away.

### Three of the four questions came back cheaper than the item assumed

**The "you're next in the queue" email does not exist, anywhere.** What the
trade actually sends is **on-my-way**, and it is **SMS in all four products
that have it** — Housecall Pro, Zenbooker, Urable, Mobile Tech RX — with no
exceptions and no email version offered by anyone. The reason is obvious once
seen: it has to land in the ten minutes before somebody turns into a driveway,
and email is the wrong pipe. **We already have it, as the `on_my_way` message
template.** So that gap is closed, and the reason is written down specifically
so a later session does not add an on-my-way EMAIL and believe it has closed
something.

**Our reminder schedule is already better than four of the six.** We carry
Square's shape (an offset before the start) and Housecall Pro's shape (a clock
time on the previous day, with a latest-start cutoff) *at the same time*, per
business, timezone-correct. Nobody has ever shown the owner this, because it
lives on Booking rules and the Notifications screen only says *"Timing is set
in Booking rules."* **Half of "multiple options for when emails get sent out"
is a discoverability problem, not a build.**

**A review request is not missing either** — `followupEmail` is one of the most
universal kinds in the set, five of six. What we lack is the **delay**: Jobber
and Urable let the detailer choose how long after completion it goes; ours
fires the instant payment is recorded.

### The one that is genuinely lopsided, and the finding underneath it

**Five of six give the detailer WORDS. One of six gives them a DESIGN.** Jobber,
Square, Urable, Mobile Tech RX and (barely) Housecall Pro all offer an editable
message body plus variables inside a frame the product owns. Zenbooker alone
offers layout, colours, images, buttons and footer.

**And Zenbooker still does not give them the money.** Its invoice itemisation is
a single variable — `{{invoice.line_items}}`, `{{invoice.pricing_summary}}` —
that renders itself and cannot be opened. Jobber says the same thing in its own
words: the payment section is added by Jobber and is not editable. **The most
permissive product in the category independently arrived at our own
`money-export` rule** — a number printed is not a number charged — and drew the
line in exactly the same place. That is the strongest single piece of evidence
on the page, because it is two parties reaching one answer without talking.

**So the recommendation is a fixed frame we own with named editable slots**
(subject, one or two prose blocks), the itemisation never a slot, and **the
mechanism reused rather than invented**: `message_templates` + `templates.js` +
`MessageTemplates.jsx` already do this for SMS, chips-instead-of-braces and
live preview included, and that screen's own header comment already names the
email gap as real. Two editors for one job would be two answers to one
question.

### "Premade templates" means WORDING, and the evidence is one-sided

Not one of the six offers a choice of visual designs for a transactional email.
Every product has exactly one look, with the business's logo and colour dropped
into it. **Where prebuilt design templates exist at all, they are marketing
email in a separate paid tier** — Jobber's Campaigns at $29/month — and even
those "already include your logo and brand colors", i.e. the gallery applies
the brand automatically rather than offering a choice of looks. Meanwhile every
appearance of the word "template" in a transactional settings screen means a
message body: Jobber's "templates for email and text", Urable's "save your
favorite scripts", Mobile Tech RX's "default text templates". The trade's own
artefact is a paragraph you copy — Jobber publishes an article of eight of them.

**He will recognise prewritten wordings.** A gallery of looks is a different and
much larger feature, and guessing wrong in either direction is expensive, so it
is question 1 for him rather than a decision taken here.

### Two real gaps, and one of them is nearly free

**A payment receipt separate from the invoice — five of six.** Ours makes one
email do both jobs: `invoiceEmail` is titled and subject-lined as an *invoice*
and is sent from `send-invoice` after the money has already been taken, so a
customer receives a bill for something they have paid. That is a framing defect
rather than a missing feature, and the fix is the same itemisation with a
different headline and one line saying what was paid and how. **But splitting it
doubles the number of places that arithmetic is drawn**, which is the
`money-export` class again and needs its own tie-out.

**The logo, and this is the cheapest item on the page.**
`business_branding.logo_url` exists, detailers already upload one on Business
info, and it is drawn on the booking page, the confirmation page and the manage
page. **`buildBrand()` has never read it**, so it has never appeared in an
email — the band prints the business name as text and nothing else. One column,
one `<img>`, one fallback. Square's own documentation describes the pattern we
are a single field away from.

**Recommend the logo on the PAPER, not on the band.** A logo is an arbitrary
PNG somebody uploaded, so its contrast against the tenant's coloured band
cannot be measured the way every other colour in this product is. White paper
is safe for every logo anyone will ever upload; the band is a guess that
`accent-sweep` and `email-brand` are both structurally unable to check. Put to
him as question 4, with that recommendation.

### The re-book reminder is a different animal wearing the same clothes

Four of six have it. **All four keep it in a separate paid tier** — Jobber's
Campaigns, Housecall Pro's Email Automations app, Urable's service-anniversary
follow-up, Mobile Tech RX's text blast — and the pricing is not the reason. It
is the only email in the whole set whose primary purpose is **marketing**, so
under CAN-SPAM it needs an unsubscribe, a suppression list and a sending
reputation the transactional ones are exempt from. **Recommend its own roadmap
item.** Putting it in the same file as the confirmation is how the confirmation
ends up needing an unsubscribe link.

**The same rule constrains the editor**, which is the non-obvious half: a
detailer who types *"20% off ceramic coating this month"* into the reminder's
prose slot has reclassified a transactional email as a commercial one. Square
warns its own users in exactly those terms — *"don't include marketing or
promotional material in your custom notifications"* — and our screen should say
it in plainer words.

### The thing that will silently waste a session

**`tests/email-brand.test.mjs` is partly a SOURCE-SHAPE test, and "rebuilt from
scratch" collides with it head-on.** Of the 138 checks (confirmed passing at
the start of this session, alongside composition's 26):

- 1–6, 7b and 7c are **arithmetic**. They measure through `brandColor.js`,
  never look at a template, and will keep passing untouched.
- **7a, 7a-ii and 7b-ii read `emailTemplates.ts` as text.** They assert that
  `const header =` blocks exist, that `${brand.headerInk}` appears at least
  fourteen times, that the literal `max-width:600px; background-color:#ffffff;`
  is present, and that three specific greys never come back.

Those three are asserting facts about a file a rebuild deletes. **Their intent
is right and must survive; their pointers must move, deliberately and in the
same commit** — CLAUDE.md's rule that a test and a real design decision
colliding means the file changes first and never silently. **A rebuild that
quietly drops 7a is how the D1 defect returns**: 7a exists to stop the *next*
template being written with a hardcoded white on the band, and a rebuild is
precisely "the next template". This is the same family as *a test can verify
the arithmetic and still be blind to the drawing* — one step further along,
where the test that learned to look at the drawing is pointed at a drawing that
no longer exists.

### The instrument that does not exist

**Nothing in this repo renders an email for a human to look at.** No preview
script, no fixture, no screenshot path — the only way anyone has ever seen one
is by triggering a real send, and 2.12 found eleven under-floor headlines the
first time somebody bothered. For an item whose acceptance test is *"make them
look the best"*, that is the missing measuring stick, and it is the same gap
`sweep-widths.mjs` filled for the dashboard. A script that renders all twelve
to HTML from fixture data is small and makes the visual half checkable at all.
**Build it before the templates, not after** — the 2.12 write-up already says
the render took four minutes and that nothing in the repo did it.

### Four questions stand for the owner; two block the build

1. **Premade templates — wording or looks?** Recommend wording. Blocks.
2. **How many reminders?** Ours sends one; Jobber caps at two; nobody offers
   three. Recommend building the second. Blocks, because it is a migration:
   each send is guarded by exactly one marker column
   (`customer_reminder_sent_at`), so a second reminder needs a second marker
   and a second lead setting, not a bigger number.
3. **The re-book / maintenance reminder** — recommend its own item. Does not
   block.
4. **Logo on the band or on the paper?** Recommend paper. Does not block.

### The instrument got built, and it found a live money defect on its first run

The research above names "nothing in this repo renders an email for a human to
look at" as the missing measuring stick. **It was built in the same session** —
`scripts/render-emails.mjs` — and the reason it is worth a section of its own is
what happened when it was run.

**No new dependency, and that decided the shape.** 2.12's one-off used
`esbuild --bundle` to get at the templates; a permanent script that needs a
build step is a script that rots. **Node 24 strips TypeScript types itself**, so
this imports `_shared/emailTemplates.ts` directly and reads **the same file the
edge function runs** rather than a bundle or a copy. That is only possible
because that module is dependency-free on purpose — its own header says so, and
the reason given there was testability under plain Node. That decision paid out
here, two roadmap items later.

**THE INVOICE'S COLUMN DOES NOT REACH THE INVOICE'S TOTAL, and never has.**
Rendered and looked at: rows of $285 + $35 + $40 + $25 + $20, a $30 tip,
**Subtotal $405, Tip $30, Total paid $395.** $405 + $30 is $435. **$40 is
missing and nothing on the page mentions it** — it is the customer's promo code,
which the *confirmation* email drew correctly as `-$40.00` an hour before.

**The mechanism, and it is three holes rather than one.** `send-invoice/index.ts`
builds its charge rows from services, add-ons, travel and `price_adjustments`,
which sum to `subtotalBase` — **before the site sale and before the promo**. It
takes `totalPaid` from `bookings.final_amount`, which is `total_price`, **past
both and rounded**, plus the finalize extras. **Neither discount, and neither
the rounding, is drawn anywhere on the invoice**, so the printed column misses
the printed total by `siteDiscount + promoDiscount + rounding`. `b.promoDiscount`
is even passed into `invoiceEmail`; the template never reads it, and
`siteDiscount` is hardcoded to `0` on the way in.

**The detail that hides it: `bookings.subtotal` is NOT what the rows add up
to.** `create-booking` writes `quote.subtotalAfterSite` there — already past the
site sale — so the two figures are equal only when no sale is running, which is
the case in the demo and in the fixture. **A session that reads the row loop as
"this is the subtotal" will fix the promo, watch the number close, and leave the
site sale broken.**

**This is the `travel_fee` family and the resemblance is textual.**
`send-invoice`'s own comment, written when travel had this bug in 2.8c, reads:
*"the bottom line was still right (it is final_amount, what was actually
collected) but the itemisation above it did not add up to anything."* That
sentence describes the promo today, in the same file, under a comment
announcing the fix for its twin. **A fix that names one instance of a pattern
fixes one instance** — the same lesson the rotation guard taught (three places,
not two) and the sweep taught (`.card.attend`), now in money.

**Why eleven test suites missed it.** `money-export.test.mjs` ties out the
ACCOUNTANT EXPORT. `booking-engine.test.mjs` test 17 ties out the QUOTE ENGINE.
Both are real tie-outs and both are about a different document. **Nothing has
ever asserted that the invoice's printed column reaches the invoice's printed
total** — which is the one piece of arithmetic the person who paid will actually
check, because it is the only one they can see. **A tie-out is only a tie-out
for the document it names.**

**It is an ASSERTION now, not a paragraph, and that is deliberate.** A paragraph
is what the travel fee had. `render-emails.mjs` computes the totals the way
`send-invoice` computes them and **exits 1 while the column does not close**; it
fails today on purpose, and the rebuild is what makes it pass.

**NOT PATCHED, and the reasoning matters more than the choice.** The fix belongs
in `send-invoice` — which survives the rebuild, unlike the template — but
inside the invoice/receipt split that this same roadmap item performs, because
patching now means re-deriving the same arithmetic days later against a
different set of rows. The failing check is what makes forgetting impossible,
and it is a stronger guarantee than a done diff would be. **Nobody is receiving
these**: detailingplatform.com is his private preview and billing charges
nobody.

**AND THE HALF THAT IS NOT OURS.**
`reference/supabase/functions/send-invoice/index.ts` — the read-only snapshot of
his LIVE business's old site — **has the same shape**: it pushes an explicit
negative row for a *monthly plan* discount and pushes nothing for
`promo_discount`, and that site does have promo codes. **So the omission was
inherited by the port, not introduced by it.** What is NOT established, and must
not be assumed either way, is whether the live `carwashweb` still matches the
snapshot and whether its own `final_amount` path — it recomputes from base items
rather than from `total_price` — closes the gap another way. **That is a READ of
a different repo against a live business, which CLAUDE.md allows and which this
session did not take on its own initiative beyond the snapshot already in this
repo.** It is question 5 for him, it does not block 2.18, and it should not wait
for it: if it reproduces, real customers of Andrew's Auto Detail have been
receiving invoices that do not add up whenever they used a promo code.

**The transferable finding, and it is the one to carry:** the research file
predicted the instrument was missing and treated that as a documentation gap.
It was a live defect the whole time. **"Nothing here can look at X" and "X is
fine" are the same observation until somebody looks** — which is 2.12's *a test
can verify the arithmetic and still be blind to the drawing*, one level up: the
drawing nobody had ever drawn.

## Roadmap 2.18 — his answers, and the look he rejected

2026-09-03, immediately after the step-1 research was handed over. Three
things came back, and two of them overrule what the research recommended.

### 1. He rejected the look, and he was right

His words, having opened the two rendered emails:

> *"one thing i though you werrte gonna make the email from scratch it looks
> exactly the saem sytle as the email template i had before. and doesnt even
> macth the style of the wwebsites and all the stuff. liek come on."*

**Half of this was a communication failure and half was a real finding, and
they need separating because only one of them is a defect in the product.**

The rendered emails he was looking at were the **existing** ones — the whole
point of `render-emails.mjs` was to see what the product sends today, and the
handover said "as a customer receives it today". It said it once, in a caption,
under a heading about a money bug. **A before-image handed over without the
word BEFORE in the same breath as the picture reads as the deliverable**, and
the fix is on the sending side, not his.

**The finding underneath it stands on its own and did not depend on the
misunderstanding.** Those emails genuinely do not carry The Thread: a coloured
band above a white card is the shape of every transactional email ever sent,
which makes it precisely the on-distribution default `docs/design-knowledge.md`
§1 exists to prevent. The research file had this and buried it — it treated
"make them look the best" as a design job to schedule rather than as a defect
already shipped, and it wrote three paragraphs about what could not be done
(webfonts) before saying what could.

### 2. "Premade templates" means an EDITOR, not prewritten wording

The research recommended a fixed frame with two or three prose slots, on a
count: five of the six products give the detailer words, one gives a design.
**He asked for the sixth.**

> *"i will probobly be makign custome emails for each customer. but by scutom i
> mean they can choose whats in in and what order ect. we can make a email
> editor page i think that would be cool. bascily a way for hte customer to
> customze the look wordsa and thgings of the email."*

**This is the 2.8 pattern for the second time and it is worth naming as a
pattern rather than an event.** That item researched five real detailer menus,
recommended a shape, and he overruled it by being the sixth menu — the entry is
*"The owner's answers to 2.8, and the one that overruled the research"*, and its
lesson was written down as **research rules shapes IN; it cannot rule them
OUT.** Six products not offering a block editor is evidence that a block editor
is unusual. It is not evidence that it is wrong, and he is building the product
he wants to sell, not the median of the category.

**What survives the overrule, and it is the load-bearing half:** Zenbooker, the
one product that DOES give a design editor, still renders the invoice's
itemisation as a single variable the editor cannot open. That finding was never
about how much freedom to give — it was about **which one block must be
uneditable**, and it applies exactly as hard now. `moneyBlock` is not
reorderable, not editable, and not deletable.

**So the architecture is BLOCKS**, decided here: a template is an ARRAY of
self-contained `<tr>` renderers, not a bespoke layout. Reordering is reordering
an array; switching a block off is filtering it; changing the words is swapping
one string. **A template built as one 50-line HTML literal cannot have an editor
over it at any price**, which is why the shape had to be settled before the
other ten were ported rather than after.

### 3. Reminders — no cap

> *"yeah we can have as many emails as we want i mean i dont care."*

The research asked whether to build a second reminder and noted Jobber caps at
two. **He removed the cap rather than answering the question**, which makes the
schema decision the important one: a per-booking marker column does not
generalise, so this becomes a `booking_reminders_sent` row per (booking, rule)
and a list of reminder RULES on the business rather than one lead time. **Two
booleans and a second integer would have been the answer to the question he was
asked, and it is not the answer to the question he gave back.**

### What was built on the strength of it, and what was deliberately not

**BUILT: the world, on two emails, so he can approve it before ten more are
poured into it.** `_shared/emailKit.ts` (the ground, the blocks, the shell) and
`_shared/emailsNew.ts` (confirmation/request, receipt/invoice), rendered by
`scripts/render-emails-new.mjs`.

**NOT WIRED UP, ON PURPOSE.** The edge functions still send the old templates
and `tests/email-brand.test.mjs` is still green on the old file at 138. **The
swap is one commit after he says yes**, and doing it before he has looked would
mean either porting ten templates into a world he rejects, or re-pointing the
138-check test twice.

**How The Thread survives an inbox, since this is the question the whole item
turns on.** One continuous near-black ground rather than a card — free, and it
is most of the difference. Warm bone `#F2F1EC`, never `#ffffff`, which the
system names as a tell. Hairline rules instead of boxes, because *a collection
of records is a ruled list* and an itemised total is the cleanest case of that
law in the product. One accent, marking the thing that has landed.

**AND THE TYPE LAW SURVIVES EVEN THOUGH THE FACES DO NOT.** An email cannot
load a webfont, so Archivo and JetBrains Mono are gone and Arial is the only
honest stack. But the system's actual rule is *one face for everything that is
words, one face for every figure* — and that shape ports intact to
Arial + a monospace stack. **The faces were never the law; the split was.**
Worth carrying: when a constraint kills the specific implementation of a design
rule, ask what the rule was FOR before recording it as unmeetable.

**Two defects found by looking at the first render, both fixed in the same
pass**, which is the routine working as intended rather than a footnote: the
services were listed once as prose and again in the money table with prices
beside them — the owner's own copy rule (*does this block add a fact the one
below it does not already carry?*) broken in layout form — and the eyebrow was
painted in the accent 100px above the accent mark, which is the scatter the
one-accent law exists to prevent. The eyebrow is `--fog-2` now, which is what
the type scale assigns an 11px label anyway.

**The colour engine was EXTENDED, not edited.** `emailDarkBrandColors()` is a
new export beside `emailBrandColors()`, which is untouched — 138 checks pin
that function against `app/src/lib/theme.js` and a rebuild that edits it turns
a green suite red for reasons that have nothing to do with the rebuild. The new
one corrects against **`--ink-2` `#171B1E`**, not `--ink-0`, because the accent
lands on a lifted panel as well as on the ground and *correct against the
lightest surface that value can land on* is the rule this project has now
learned four separate times. Verified on the house green and on crimson, a real
preset that fails as text where it passes as a fill.

### Still open after this

Ten templates to port, the editor screen itself, the schema for reminder rules,
the wiring, and the re-pointing of `email-brand`'s three source-shape checks
onto the new file. **And the invoice's missing promo row is now a REBUILD
requirement rather than a patch** — `render-emails-new.mjs` asserts the lines
reach the total and the rebuilt receipt carries the discount, so the fix ships
with the port instead of before it.

## Roadmap 2.18 — the look approved, the editor scrapped, and will it work everywhere

2026-09-03, same day, third exchange. Three decisions and one reversal.

### He approved the look, and scrapped the editor he had asked for

> *"Also it looks good."*
> *"Also scrap the custom email editor thing. / make it a lot more simple."*

**The editor was his own idea one message earlier**, and the reversal came
inside the same session — which is worth recording precisely, because the two
messages read as contradictory to anyone who finds only one of them.

**NOTHING HAD TO BE TORN OUT, and that is the part worth carrying rather than
the reversal itself.** The session had built the block architecture and stopped
at two rendered templates; no editor screen, no schema, no `email_templates`
table, no settings rows. **The stopping point that was chosen to get the LOOK
approved cheaply is the same stopping point that made the reversal free.** The
general form: when a large item has a subjective half and a mechanical half,
render the subjective half first and stop — the approval gate doubles as a
rollback point.

**The blocks survive the scrap, and their justification changes.** They were
built as an editor substrate; they are now simply how the templates are
assembled, and they still earn their place for two reasons that have nothing to
do with an editor. Four templates come out shorter and consistent with each
other than four hand-written HTML literals would. And **the plain-text half of
every email is a second pass over the same block list rather than eleven
hand-written twins** — which matters now that HTML-only sending has been found
to be a real defect (below).

**What "a lot more simple" resolves to, and it is the research's own
recommendation arrived at from the other side**: the design is ours and fixed;
the detailer gets an on/off switch per email, one optional message of their own
per email, and a choice of prewritten wordings. That is what five of the six
products in the sweep do. **The research recommended it, he overruled it, he
reversed, and it landed back on the count.** The lesson is not "the research was
right" — it is that the overrule cost two rendered emails and a day's thinking
rather than a shipped editor, because the shape was proven before it was built.

### Reminders: he delegated the number

> *"ima do as many emails as you recommend."*

**Recommended: TWO customer reminders per appointment, the second one off by
default.** Reasoning, in order of weight:

1. **Jobber caps at two and nobody in the sweep offers three.** The category
   leader having a hard ceiling is stronger evidence than the median.
2. **Two is the useful pair for this trade specifically** — the evening before
   (so the car is moved, the driveway is clear, the tap is findable) and about
   two hours out (so nobody is asleep or at work). A third has no job.
3. **A third reminder costs deliverability for every other email.** Nagging is
   what generates spam complaints, and a sender reputation is shared across the
   receipt, the confirmation and the quote. The invoice going to junk is a
   worse outcome than a missed appointment.
4. **He said "as many as we want" and then "make it a lot more simple" one
   message later.** Two rules with sensible defaults is simple; an unbounded
   list of reminder rules is a small scheduling product.

**It still needs the schema the unbounded version needed** — a
`booking_reminders_sent` row per (booking, rule) rather than
`customer_reminder_sent_at` — because two markers is where a boolean column
stops generalising, and the second one costs nothing once the first exists.

### The compatibility research: it holds, and it found a defect that is not about dark mode

Full working: `docs/email-clients-2026-09-03.md`.

**The dark design survives.** Apple Mail is ~60% of opens and leaves an email
alone unless it finds pure `#ffffff`/`#000000`. Gmail desktop leaves it alone;
Gmail Android's engine respects explicitly-set backgrounds; **Gmail's iOS app is
the one real risk** and can fully invert an already-dark section. Outlook
Windows inverts and is ~4%, skewed to offices rather than to car owners.

**The failure everyone fears cannot happen here, structurally rather than
luckily.** Light-on-light needs one of the two values to flip without the other;
every colour in these templates is declared on the element that shows it, so an
inversion engine flips ground and type together. **And full inversion mirrors
BRIGHTNESS while preserving HUE** — this was worth checking specifically,
because more than one guide says inversion "flips brand colours to their
opposites", which would mean a green button arriving magenta. It does not.

So the worst case is **a light version of the same email, correct hue, every
ratio still passing** (a contrast ratio is symmetric under a brightness flip).
Not the design; entirely readable. **The `mix-blend-mode` hack that forces the
dark rendering through Gmail was deliberately NOT used**: it wraps every piece
of text in two extra elements, it half-applies badly, and what it buys is
"looks dark rather than light in one client" rather than "readable rather than
unreadable".

**THREE CHANGES CAME OUT OF IT.** Pure black and white are now unreachable in a
tenant's colour (`#ffffff` → `#fefefe`), applied in the dark wrapper only and
never in `inkFor`, which the 138-check paper suite pins — **both values were
genuinely reachable**, a tenant picking white got `#ffffff` as their accent and
crimson's button ink was `#ffffff`. `bgcolor` attributes sit beside every
background property, because Outlook's Word engine reads the attribute and a
dark design that loses its ground is the one truly unreadable outcome. And
**the logo went onto a bone plate**, which is a straight defect the research
direction surfaced rather than a dark-mode subtlety: a detailer's logo is
almost always dark artwork on transparent, because it was made for a white
website, and on `--ink-0` it is invisible. **Nothing in this repo could ever
detect that** — an arbitrary PNG's contrast cannot be measured, which is the
same reason the logo was kept off a tenant-coloured band. Rendered with the
worst case and looked at, because a code path nobody has drawn is a code path
nobody has checked, and that is the third time this session.

**AND THE FINDING THAT IS NOT ABOUT DARK MODE AT ALL: every email in the
product is sent HTML-ONLY.** `send-email/index.ts` builds its Resend payload
with `html` and no `text`. An HTML-only message with no plain-text alternative
is a long-standing spam-filter signal, and it applies to **every** email
including the receipt — the one that must never land in junk. **Found by asking
"will it work globally" and following the question past the templates into the
sender**, which is where the question actually lived.

**Gmail's 102KB clipping threshold was MEASURED, not assumed**: the rebuilt
emails are 9–10KB. Two orders of magnitude of headroom.

**One real "globally" gap named and not fixed:** `formatDateLong` is hardcoded
`toLocaleDateString("en-US")`. The product is US-only and its timezone handling
assumes it, so this is a marker for whoever adds a second country.

**The honest limit, and it is stated in the file rather than buried:** nothing
has been opened in a real email client. Research plus a browser is not Outlook's
Word engine, the Gmail iOS app, or Apple Mail's dark pass. **A real send to a
Gmail, an Outlook and an iCloud address, in both modes, is twenty minutes and
is what turns "should work" into "does work"** — which is CLAUDE.md's standing
rule, and this does not meet it yet.

## Roadmap 2.18 — the port: all twelve rebuilt, wired, and the invoice made to add up

2026-09-03, on *"do whataver u want and is best"*. The look was approved and
the editor scrapped, so what was left was the mechanical half. It is done:
`_shared/emailTemplates.ts` is a new file, the old ~530-line one is gone, all
eight edge functions send the rebuilt emails, and `email-brand` is **186 checks**
where it was 138.

### The old file was replaced, not renamed around

`emailTemplates.ts` keeps its **path and most of its export names**, and that
was the decision that kept the diff small: eight edge functions import from it,
and `BookingEmailData` is a shape they already assemble. **Rebuilding the
RENDERING was the item.** Changing the data contract at the same time would have
meant rewriting every call site's query as well as its render, for no gain.
Only `TenantBrand` moved, because the colour set genuinely changed —
`primaryColor`/`headerInk`/`accentColor` (a band, its ink, and words on white)
became `accent`/`accentFill`/`accentInk` plus `logoUrl`.

### `reconcile()` — the guarantee that replaced a promise

The invoice bug could have been fixed with three pushes in `send-invoice`. It
was not, because **that is the fix that was already applied once and did not
generalise**: 2.8c added travel and surcharge rows to this exact file, under a
comment saying the itemisation had not added up, and the promo was left out —
*a fix that names one instance of a pattern fixes one instance.*

So the reconciliation is **structural** instead. `reconcile(lines, total)` in
`emailKit.ts` takes the lines a template is about to draw and the total it is
about to print, and appends the remainder as its own line when they disagree by
a cent or more. Both money templates run through it. **"Did the caller remember
to itemise everything" stops being something anyone has to remember.**

**AND IT TURNED OUT TO BE LOAD-BEARING IMMEDIATELY, WHICH IS THE PART WORTH
CARRYING.** The plan was to push a site-sale row alongside the promo — and
`bookings` **has no `site_discount` column.** The amount is baked into
`subtotal` at booking time (`create-booking` writes `quote.subtotalAfterSite`)
and the settings it came from may have changed since, so the invoice cannot
attribute it. **The first draft of the fix referenced `booking.site_discount`,
which is `undefined`, so `Number(undefined) > 0` is false and the line silently
never draws** — a fix that reads as a fix and does nothing, caught only because
the schema was checked rather than assumed. `reconcile` draws it as one honest
*"Discount applied"* line. **An unexplained gap is the defect; a line that says
a discount was applied is not.**

The three holes and where each is now answered: the **promo** is itemised by
name (`promo_discount` and `applied_promo_code` are real columns); the **site
sale** and the **rounding** are drawn by `reconcile`, because neither is
recoverable from the booking row. Storing the sale amount on the booking is a
migration and its own item.

### The plain-text half is DERIVED, and that is the whole argument for it

`htmlToText()` — one function, not twelve twins. Twins drift, and the first
time somebody edits one and not the other they disagree about a price. It reads
well only because the blocks are structural: every row is a `<tr>` and every
figure sits in its own cell, so "label | value, one per line" falls out of the
markup rather than being reconstructed from it. **This is now the main thing the
block architecture buys, and it is a better reason than the editor it was built
for.**

### Re-pointing `email-brand` — and the check that caught itself going quiet

The three SOURCE-SHAPE checks (7a, 7a-ii, 7b-ii) described a white-card layout
that no longer exists. **Two failed loudly and one went silently vacuous** — the
`const header =` regex matched nothing, so its assertion passed by having no
subjects. That is *a skipped check reads exactly like a passing one*, and it is
why they were rewritten rather than deleted with a note.

Restated for the architecture that exists, and in a **stronger** form than the
originals could take: the old 7a banned two specific hex values on one specific
surface; the new one bans **any literal hex in the templates at all**, because
every colour now comes from a named token or from the brand, so a literal is by
definition a colour nobody measured. 7a-ii became "the two accent values may
not swap jobs" — printing `accentFill` (corrected 3:1 as a background) as words,
or painting `accent` (corrected 4.5:1 as words) as a background, is the old
"paper colour on the band" defect in the only shape it can still take. And
**7a-iii asserts the checks HAVE SUBJECTS** — that `accentInk` is used, that the
accent is painted as a fill somewhere, that `moneyBlock` is still called —
specifically so the next layout change fails loudly instead of going quiet.

**BASELINED BOTH WAYS, and the baselining is what found the real bug.** The
first version of 7a passed while a literal `#ffffff` sat in the file, and the
reason was **a raw backspace character (0x08) in the regex source**, left by the
script that wrote the test: `/#[0-9a-fA-F]{3,8}\x08/` can never match. It was
invisible in every editor and in `sed` output, and only showed up under `od -c`.
**A check written to prevent silent vacuity was itself silently vacuous on its
first run.** Fixed, then re-baselined by injecting a real colour into a template
(fails) and by swapping the fill value into a `color:` (fails).

The stripped-comments detail matters too: the check scans **code**, not prose,
because this file's own documentation explains the rule by naming the value it
bans — and a check that fails on its own documentation gets deleted rather than
fixed.

### What the port did NOT do

The simple settings surface (an on/off switch per email, one optional message
of the detailer's own, prewritten wordings), the two-reminder schema
(`booking_reminders_sent` per (booking, rule)), and storing the site-sale amount
on the booking. **And nothing has been opened in a real email client** — that is
still the one claim this work cannot make.

## Roadmap 2.18 — the live-business read, and the invoice stopped doing arithmetic

2026-09-03. Three things, and the first is a correction to something this file
said earlier today about his real business.

### THE LIVE BUSINESS DOES NOT HAVE THE BUG. I SAID IT PROBABLY DID.

He authorised the read. Two corrections came out of it.

**FIRST, CLAUDE.md NAMES THE WRONG REPO.** It says the live business is
`carwashweb`. That repo exists, is private, and was last pushed **2026-02-01**;
it is a 99-file Emergent scaffold (`backend/server.py`, `frontend/src/App.js`)
with **no invoice code, no Supabase functions and no promo codes**. The live
code is **`random12one0/carwebitebooking`** (pushed 2026-08-26), which has
`supabase/functions/send-invoice/index.ts` and
`frontend/src/admin/modals/FinalizePaymentModal.jsx` and matches the `reference/`
snapshot. **A session that follows CLAUDE.md to `carwashweb` finds a shell and
concludes there is nothing there.**

**SECOND, AND THIS IS THE CORRECTION THAT MATTERS: its invoice adds up.** The
earlier entry today said the omission was *"inherited by the port rather than
introduced by it"*, on the strength of `reference/`'s row-building not pushing a
promo row. **That was a conclusion drawn from half the trace.** Following
`final_amount` to where it is computed finishes it:

- `FinalizePaymentModal.buildBaseItems` builds from packages + vehicle size +
  the monthly-plan discount + add-ons, and `computeTotal` is
  `baseSum + adjSum → roundToNearest5`. **The promo is not subtracted.**
- `send-invoice` builds its rows from the same set — packages, add-ons, the
  monthly-plan discount, line items — and also does not include the promo.

**Both sides exclude it, so they agree with each other.** The live invoice's
column reaches its own total. **Our platform's did not, because our
`final_amount` starts from `total_price` — which IS post-promo — while our rows
were rebuilt from pre-discount parts. The bug was INTRODUCED by the port, not
inherited.** I told him the opposite this morning; this is the retraction.

**What the live site does have is smaller and worth him knowing anyway:**
`roundToNearest5` rounds the total but not the rows, so its printed column can
be off by up to $2.50. And separately — not a bug, a behaviour — a fresh
finalize starts from **list prices**, so a customer who used a promo code
defaults to the full amount unless the owner adjusts. The modal shows the
difference against `booking.total_price` on screen, so it is visible and his to
decide; it is named here because nobody has looked at it deliberately.

**The lesson, and it is the same one this project keeps paying for:** a defect
diagnosed by reading the code that DRAWS a number is half a diagnosis. The other
half is the code that COMPUTES it, and the two were in different files and
different languages.

### The invoice stopped doing arithmetic, on his instruction, and he was right

> *"I feel like it's so much simpler than it could be. We don't need to
> recalculate everything again when we send out the email. When you click
> finalize payment, it knows the total price and it has all the stuff you just
> put in. Just have it copy exactly what was calculated on what you finalized
> inside of the website. I don't get why there has to be math."*

**He is describing the root cause, not a preference.** `send-invoice` was
rebuilding the customer's bill out of five separate sources — snapshotted
services, original add-ons, `travel_fee`, `price_adjustments`, then the finalize
line items — and hoping their sum matched `final_amount`, which is computed in a
completely different file. **It never did, and the gap moved every time somebody
added a price feature**: 2.8c patched travel and surcharges in, 2.18 found the
promo still missing, and the site sale was unreachable because its amount is not
stored anywhere.

**Every one of those fixes was arithmetic applied to the wrong shape.**

The shape now: `FinalizeModal` computes `final_amount = booking.total_price +
Σ(line items)`, so the invoice prints **exactly those terms** — `Booking total`,
then each finalize line, then the total. **The column cannot disagree with the
total, because it IS the total's own definition.** Services, add-ons, travel,
adjustments, promo, site sale and rounding are all already inside `total_price`,
which is the figure the customer agreed to and which their confirmation email
itemises.

**The work is still NAMED on the invoice; it just no longer carries prices**,
because per-service prices are not what was charged. That distinction is the
whole fix: *re-itemising a number that was never in doubt is a chance to be
wrong about it, taken once per feature.*

**`reconcile()` stays, demoted to a guard.** With rows defined as the total's
own terms it should never fire; if it ever does, something edited line items
without updating `final_amount`, and a visible line is better than a silent gap.

**Roughly 45 lines of row-building deleted**, and with them the reason this file
had been wrong twice.

### The re-book email: MANUAL, with a nudge — his answer, and it is better

> *"Don't have one that automatically messaged on the email. Just have it, like,
> the business person whoever is running it could send out email to someone that
> they want. And maybe, like, remind deals. Like, hey, do you want to send out
> email to some of your old people?"*

The research recommended this be its own roadmap item because an automated
re-book campaign is **marketing** email — CAN-SPAM unsubscribe, a suppression
list, a sending reputation. **His answer removes most of that cost by removing
the automation**: a human picks the recipients and presses send, and the
dashboard's only job is to *notice* and *ask*.

**Two properties worth writing down before anyone builds it.** A human-initiated
message to a named past customer of a business they have used is much closer to
transactional than a scheduled blast, so the legal machinery shrinks. And the
**nudge is a dashboard prompt, not an email** — nothing new is sent
automatically, which is exactly the line he drew.

**This replaces the "automated re-book campaign" item.** The Clients screen
already knows who has lapsed (`tests/client-list.test.mjs`, 31 checks, and the
lapsed filter is *"who ends up on the end of a group text"*) — so the selection
half exists and what is missing is a compose-and-send surface plus the prompt.

## Roadmap 2.18 — the last two pieces, and the first real send

2026-09-03. *"Okay, dude. These two. And, also… send some emails to me so I
could check it out."* Both built; four emails sent to his inbox.

### The second reminder: TWO COLUMNS, NOT A TABLE — a same-day reversal

Earlier today this file said a second reminder needs a
`booking_reminders_sent` row per (booking, rule), because a marker column
"does not generalise". **That was correct while the count was open-ended and
became wrong the moment he capped it.** He said *"as many as we want"*, then
*"as many as you recommend"*, and the recommendation is **two**.

**Once the count is fixed at two, a general table buys extensibility nobody
asked for at the price of a join in the hottest RPC in the product.** So:
`customer_reminder_2_enabled`, `customer_reminder_2_lead_minutes`, and
`bookings.customer_reminder_2_sent_at`. If a third is ever wanted, THAT is when
the table earns its place — and the migration says so.

**It is its own RPC, `get_bookings_due_for_second_reminder`, not a `target` on
the existing one, and the reason is load-bearing.**
`get_bookings_due_for_reminder` carries the **evening-before rule**: when that
fires, the reminder goes at a wall-clock time on the previous day rather than
an offset before the start. **A second reminder must not inherit it** — a
business running both settings would otherwise get two evening-before sends
racing on one marker, which is the same class of bug as a shared selector
meaning two things.

**And it refuses to run before the first has:** `customer_reminder_sent_at is
not null`. On a job booked an hour out, both lead times can come due in the
same sweep, and a "second" reminder arriving first is worse than no second
reminder. **Also `status <> 'pending'`** — the 2.12 rule that a request nobody
accepted must never be told "your appointment is tomorrow"; the first RPC
excludes it and a new one that forgot would reopen exactly that hole.

**The switch nests, deliberately.** `email_customer_reminder` is "does this
business remind customers at all" and silences both; `customer_reminder_2_enabled`
only adds the second. A detailer who turns reminders off and still receives the
second one would be the switch lying, which this product has shipped once
already (the push toggle that registered nothing).

### "Your own words": one paragraph per email, and no placeholders

The simple version of what he asked for, and it is what five of the six
products in the sweep do. `business_settings.email_messages jsonb`, keyed by
template name, rendered by one `ownWords()` helper into the panel block so it
reads as an aside from the business rather than another sentence from us.

**ONE JSONB COLUMN, NOT A TABLE.** A dozen optional strings with no per-row
lifecycle, read on one code path. A table would bring an id, a timestamp, two
RLS policies and a join to fetch a paragraph; `business_settings` already has
the policies and is already loaded everywhere this is needed.

**NO `{{placeholders}}`, AND THAT IS THE INTERESTING DECISION.** The SMS
templates have them because a text IS the whole message and has to carry the
name. These paragraphs sit inside an email that **already** greets the customer
by name and states their date, vehicle and address — so a second
"Hi {{customer_name}}" is the owner's own never-default, *copy that explains
what the screen already said*. Leaving tokens out means nothing to typo,
nothing to validate, and no `findBadTokens` equivalent to write. **The absence
is the feature.**

**Escaped before newlines become `<br>`, not after.** The other order lets a
detailer's paragraph inject markup into every email they send.

**The prewritten wordings are a constant in `app/src/lib/emailMessages.js`, not
schema.** "Premade templates" turned out to mean wording rather than looks, and
a wording you can pick and then edit needs no storage of its own — it is a
button that fills a textarea.

### THE EMAILS WERE ACTUALLY SENT, AND TWO THINGS CAME OUT OF DOING IT

`scripts/send-test-emails.mjs --to=…` renders the real templates and posts them
through the **real relay**, so the `text` part, the From line, the Reply-To and
the tenant lookup are exercised rather than simulated. **`--to` is required with
no default**, because a script that mails somebody when run bare eventually
mails the wrong person.

**1. THE RELAY WANTS `SUPABASE_SECRET_KEY`, NOT THE LEGACY SERVICE-ROLE JWT.**
`send-email` compares the caller's bearer token against the
`SUPABASE_SERVICE_ROLE_KEY` **that Supabase injects into the function's own
environment**, and this project has migrated to the new key format — so what
the platform injects is the `sb_secret_…` value, while the root `.env` still
holds the legacy JWT under the old name. Measured: legacy → `401 Unauthorized`,
`sb_secret_…` → `400 …are required`, i.e. past the gate. **A flat 401 reads
exactly like a revoked key or a broken relay**, and it sent the first run down
the wrong path entirely. The script tries the secret key first and falls back,
so it works against a migrated project and an unmigrated one.

**2. FOUR, NOT SEVENTEEN.** Each is a different SHAPE — the mark-and-facts
layout, the money column, the single-figure layout, the owner's decide-now
layout. Sending all of them buries the differences in an inbox **and spends
sending reputation on duplicates**, which matters here because the platform and
the live business share one Resend account.

### AND A DELETION THAT WAS WRONG, CAUGHT BY THE ENV-BACKED SUITE

The rebuild deleted `buildAddressing` as dead code. **It was not dead:
`tests/booking-engine.test.mjs` test 9 uses it**, and what that test pins is
**tenant isolation** — A's mail replies to A's owner, B's to B's, and A's email
never mentions B. The platform sends every business's mail from one verified
address, so the display name and the Reply-To are the *only* things separating
two tenants' email.

**The check for callers was a grep of `supabase/functions/` and the caller was
in `tests/`.** Restored, with that written above it. ***A symbol used only by
its test still has a user, and the test is usually pinning the thing that
matters most.***

The same test's brand fixture still named the old colour fields
(`primaryColor`/`headerInk`/`accentColor`), which are now ignored — updated
rather than left, because a harness that disagrees with its interface renders
`undefined` and looks like a bug in the code under test. That is 2.12's lesson
for the second time in one item.

## Roadmap 2.18 — the emails go LIGHT-FIRST, because Gmail proved the dark ones broken

2026-09-03, after the owner opened the four test sends on real devices. Two
findings from him, and the first one reversed a decision made the same day.

### He tested it properly, and the dark design failed on Gmail

> *"So it looks good in dark and light mode iCloud… but on the Gmail, it does
> reverse it when I have dark mode activated… it darkened the green somehow.
> The format and everything was good. It's just the colors on Gmail."*

**The research had predicted this and the build shipped anyway.**
`docs/email-clients-2026-09-03.md` names Gmail's iOS app as "the one real risk"
and says the meta tags do not stop it — then concludes the worst case is "a
light version of the same email, correct hue, every ratio still passing,
entirely readable". **That conclusion was reasoning, not measurement, and it
was wrong.**

MEASURED PROPERLY THIS TIME, by applying Gmail's actual transform (an HSL
lightness flip, hue preserved) to our own palette:

| | before | after Gmail |
|---|---|---|
| accent as words on the ground | 10.07:1 | **1.99:1** |
| ink on the accent button | 10.88:1 | **1.77:1** |
| the 11px labels | 5.16:1 | 3.68:1 |

Against a 4.5:1 floor. **The total and the button label become unreadable.**
Not off-brand — unreadable.

**AND IT IS UNFIXABLE BY PALETTE, which is why the design moved instead of the
colours.** Inversion barely shifts a mid-lightness accent (green L≈55% → 45%)
while swinging its near-black ink from L≈8% to L≈92%, so a high-contrast pair
becomes light-on-mid-green. Checked across four accents including crimson and
violet: every one fails. There is no accent that survives being flipped in one
direction while its ink flips in the other.

**There is also no switch.** Gmail ignores `color-scheme`, `supported-color-schemes`
and `prefers-color-scheme` alike — the answer to his *"is there some way to tell
Gmail it's already in dark mode"* is no, and that is documented behaviour rather
than something to work around.

### So: light by default, dark behind `prefers-color-scheme`

Both palettes are the design system's own — `--paper` `#EFEEE7` ("warm
off-white, never paper white") and `--ink-0` for dark. **The light band was
already in The Thread; nothing was invented.** The coverage is strictly better
than dark-first:

| | light mode | dark mode |
|---|---|---|
| **Apple Mail** (~60% of opens) | our light design | **our dark design** |
| **Gmail** (~29%) | our light design | Gmail's own darkening of a light email — the one thing its algorithm is tuned for |
| **Outlook Windows** (~4%) | our light design | our light design |

**He still gets the dark design on the client he was admiring it in.**

**HOW IT DEGRADES, and this is the part that had to be got right.** Every colour
is written INLINE as its light value, so a client that strips `<style>` — and
several do — shows a complete, correct light email. The dark palette is ONE
`<style>` block keyed on the media query, overriding by class with
`!important`. **Nothing depends on that block surviving.** Confirmed
accidentally and usefully: the local preview pane strips `<style>` entirely and
rendered the light design perfectly.

**THE FAILURE MODE THIS INTRODUCES, and the check written for it.** The dark
palette is applied BY CLASS, so an element that sets a colour inline and forgets
its class **stays light inside a dark email** — and no contrast check can see
it, because both values are individually fine. `render-emails.mjs` now walks the
rendered output and fails on any tag carrying an inline colour without a class.
It caught six on its first run, all of them `<strong>` and `<span>` colours
inside prose strings in the templates.

### Two more things the change turned up

**Pure white was still reachable in the LIGHT path.** `deTrigger` had been
applied to the dark wrapper only; crimson's and violet's button ink are
`#ffffff`, and a tenant picking black gets `#000000`. Both are Apple Mail's
inversion trigger — **the very thing that would have made Apple Mail behave like
Gmail.** Now applied to both palettes and asserted in both.

**The `email-brand` shell checks needed re-pointing again, one day after the
last time.** They pinned `bgcolor="${G.ground}"` and `ink: EMAIL_BONE` — facts
about the dark-first shell. Rewritten to pin what is true now: the shell paints
the LIGHT ground inline, declares BOTH schemes, ships **exactly one** dark
override block, and **neither palette names a pure value.** 189 checks.

### The spam finding: authentication is fine, reputation is not

> *"One major problem, though, is that currently it went to my spam folder…
> because my Andrews detail one doesn't go to spam."*

**Checked both domains rather than guessed**, which settles it:

| | `email.detailingplatform.com` (ours) | `andrewsdetail.com` (his) |
|---|---|---|
| DKIM | present | present |
| SPF on the sending subdomain | present | present |
| DMARC | `p=none` | `p=none` |
| Resend infrastructure | `forge.rmta.net`, hardcoded shared IPs | `feedback-smtp.us-east-1.amazonses.com` |

**Authentication is not the problem — the two are configured the same.** Two
real differences: the domains sit on **different Resend sending pools** (his on
the long-established SES one, the platform on Resend's newer own-MTA pool), and
far more importantly **his domain has months of real, engaged mail to real
people while the platform subdomain has sent almost nothing.** Gmail weighs
sender history heavily, and a first-ever message from an unknown domain to a
personal Gmail account is a textbook cold-start classification.

**One genuine gap found: `detailingplatform.com` (the ROOT) has no SPF record at
all.** It does not affect these sends — they come from the subdomain, which has
one — but a domain that never says what may send for it is a weaker domain, and
`v=spf1 -all` on the root is free.

**What was NOT done, deliberately: a `List-Unsubscribe` header.** It is a
legitimate-sender signal and it is the wrong tool here — these are transactional
emails, and a customer who unsubscribes stops receiving their own receipts.
Gmail's one-click requirement applies to bulk senders, which this is not.

## Roadmap 2.17 — motion and shape as a house style

### The audit was a MEASUREMENT, and it is why the list was five and not three

The roadmap named three complaints and warned the list was longer. It was, but
not in the direction anyone guessed — and the method is the transferable part.

`document.getAnimations()` was read on the live dashboard at 1920, **120ms after
each click**, and filtered down to what was actually running. Not the
stylesheet. This repo has now shipped two animations that were dead in the
cascade and looked exactly like finished screens (Today's whole arrival in step
6, another in stage 3), so reading a selector is not evidence that anything
moves.

What it reported before any code was written — in every case *nothing running
but the ground's 54-second drift and a hover transition*:

| Opened at a desk | Reached from |
|---|---|
| `.col-2.record` — a job | Today, Calendar month, Calendar history, Money |
| `.col-2.record.bare` — a client | Clients |
| `.col-2.settings-col` | Business **and** the gear |
| `.split.calday > .col-2` — the day panel | Calendar month |
| `.col-2` resting content | Today, Money, Calendar history |

**The fifth is the one nobody had named**, and it is the reason one selector
covers the whole list: every desk screen staggered its LEFT column in and left
the right one sitting there, on first paint as well as on open. They are one
object — the thing beside the list — so `.split > .col-2` is the rule.

**AND THE ROADMAP WAS WRONG ABOUT THE GEAR.** It listed "the gear taking the
main area" as arriving with no motion; it runs `arrive` on its index, because
`GearMenu` renders a `.split` directly under `.app-main` and the screen's own
stagger catches it. Adding an entrance would have been two animations running
the same 420ms — the mistake stage 7 already documented for the setup form.
*A list of defects written from reading is a list of hypotheses.*

### It comes from its own side, and that is not a second motion system

`arrive` travels 14px on Y because a screen is read downward. A record travels
14px on X because **the column edge is where it came from**. Same curve, same
distance, same transform-and-opacity-only rule, pointed at the axis the object
actually moved along.

**180ms (`--t-exit`), not 420ms (`--t-reveal`)**, and that is his own acceptance
test doing the work: *"without being in the way of actual productivity"*. 420 is
right for a screen you meet once and is a gate on a record you open forty times
a day — the same distinction stage 7 drew for the walkthrough's step changes.
**No new duration and no new distance were invented.**

**The exit needed a state, because React unmounts.** `Sheet.jsx` has carried the
pattern since it was written; by the third caller it became
`hooks/useLeaving.js`, which is also where the 180 now lives instead of being
written out in two files each carrying a comment saying it must track
`--t-exit`. **A number duplicated with a warning attached is a number that
drifts.**

**AND THE EXIT IS SKIPPED ON REPLACEMENT.** Clicking job B while job A is open
keeps the element mounted, so nothing re-triggers and the content changes in
place. Playing A out before B in would put 180ms between a tap and the thing
tapped for, which is the acceptance test failing.

### The calendar: the wrong element was moving

His complaint was *"it's almost like I refresh the page when I click on
something. I don't want everything to disappear and come back."* That is a
literal description of what the code did.

`Calendar.jsx` rendered `.group` with nothing open and `.split.calday` with a
day open. Two different elements, so React discarded the month subtree and
rebuilt it — measured: `arrive` re-ran on the whole left column, while the day
panel that had just been asked for animated not at all. **The thing you were
already looking at was the thing that moved.**

The fix is a **stable container**, not a nicer animation. The wrapper is now
rendered at every desk width and collapses to `display: block` when there is no
second column (`:not(:has(> .col-2))`, the idiom `.split.clients` already uses).
Proved rather than asserted: the `.cal-grid` node was stamped with a dataset
attribute before the click and the stamp survives it.

### Three defects the measurement caught that reading would not have

1. **A `:has()` MAY NOT CONTAIN ANOTHER `:has()`.** The widening rule was
   written `.app-main:has(> .split.calday:has(> .col-2))`, which is invalid, so
   the browser dropped the whole selector **silently**. The grid split
   correctly and the page never widened — at 1920 the month went to 696px
   instead of *gaining* room to 1,236px. Caught by logging `.app-main`'s own
   width before and after the click. *A CSS rule that is thrown away looks
   exactly like a CSS rule that is satisfied.*
2. **Two `<aside>`s in one slot are RECONCILED, not remounted.** The open
   settings screen and the resting content are both
   `<aside class="col-2 settings-col">` in the same position, so React swapped
   their children and no entrance fired — while the gear's resting column,
   three lines away, animated correctly. Keyed apart. Same family as the
   `.card.attend` rename the sweep caught: the right element, silently meaning
   something else.
3. **Pressing the open day again toggles it closed**, and that path called
   `setDay(null)` directly, skipping the exit. The one way of putting the day
   away that does not touch the panel was the one way that skipped its
   animation.

### The squircle: one token, and the honest cost is Safari

**`corner-shape: squircle`, set once beside the radii.** A `border-radius`
corner is a circular arc — curvature jumps from zero to maximum where the
straight edge ends. Apple's is a superellipse, where it ramps.

**Support, measured 2026-09-03 from `api.webstatus.dev` and MDN's
browser-compat-data rather than assumed:** Chrome / Chrome Android / Edge
**139+** (shipped 2025-08-05); Safari **no** (Technology Preview only); Firefox
**no**; Baseline **limited**.

**It is additive, which is the whole argument.** A browser that does not know
the property draws the `border-radius` that is already there — no fallback, no
feature query, no second corner language. **The cost he has to accept: at a
Chrome desk he sees squircles and on his iPhone he does not**, because every
iOS browser is WebKit. It resolves itself when WebKit ships, with no release
from us.

**Both alternatives were costed and rejected, and one of them for a reason that
is not obvious.** A **Houdini paint worklet is Chromium-only too** —
`CSS.paintWorklet` is Chrome 65+, never Firefox (bugzil.la/1302328), never
Safari (webkit.org/b/190217) — so it costs a JS paint pass per element to reach
**exactly the same browsers as the free property**. Do not re-propose it on
rediscovering that `corner-shape` is Chromium-only; that is the same fact. An
**SVG mask** is the only route that reaches Safari and it is the expensive one:
a mask composite on `.card`, `.chip`, `.cal-cell` and `.row-item` — hundreds of
elements on one calendar month — and it **clips the 1px `--hairline` this system
draws on nearly every surface**, so it is a border rewrite as well as a corner
one.

**PANELS AND INSETS ONLY, and that is the design.** A superellipse at a 100px
radius is a lozenge and at 50% it is a blob, so every pill, dot, ring, avatar
and spinner would change shape. Apple squircles cards and app icons; its
capsules stay capsules. Verified on the live page: `.card` and `.sunken` compute
`squircle`, `.btn` and `.tabbar` compute `round`, and with every animation
frozen the corner crop still differs from the `round` one — so it is genuinely
rasterised and not a no-op.

### STILL HIS CALL: the 1440 reflow, and a third option that was measured and died

With a day open at 1440x900 the month goes **1,144px → 836px** and `writes`
flips off, so cells stop carrying `9:00 AM Tom O.` and go back to dots. At 1920
nothing is lost — the month *gains* room, 1,144px → 1,236px, and keeps its
words.

**A third option was tried before handing him the two: lower the 1,640
threshold so the month keeps its words at 1440 with the day open.** Built,
screenshotted, and rejected **by looking**. At 836px a cell is 115px, and the
lines render `8:00 AM Mar…`, `9:45 AM Da…`, `12:15 PM Pr…` — the time survives
and the name does not, which is worse than a dot because it looks like data
rather than a mark. `text-overflow: ellipsis` means **no overflow check can
ever see this**; the only instrument is a screenshot
(`shots-2.17/1440-calendar-day-WORDS.png`).

So the two options in the roadmap stand, they are still not equal, and the
remount — which was most of the *"refresh the page"* feeling — is gone from
both.

## The booking sweep had been passing by luck

Found 2026-09-03, during roadmap 2.17, and the process half is worth more than
the fix.

### What it looked like

`node scripts/sweep-booking-steps.mjs` — the W16 gate, the script that decides
whether a customer ever has to scroll inside a booking step — started failing
on roughly half its runs, with a raw Playwright timeout:

```
locator.click: Timeout 30000ms exceeded.
  - waiting for locator('.bk-chip').first()
```

It failed in the same minute as an unrelated change to `booking.css`, and the
obvious reading was that the change had broken it.

### What proved it innocent, and it took one run

**A control.** Revert the suspect change, run the script again, and watch it
fail *identically*. That is one run and it should have been the first one
rather than the fifth; instead the change was re-applied, re-reverted, the demo
was re-seeded, and the edge function was queried by hand — all of it downstream
of an assumption nobody had tested.

***When a check fails next to a change, run the check without the change before
you do anything else.*** A green control indicts the diff; a red one exonerates
it, and both answers cost the same.

### The two races underneath, which are the same shape twice

**1 · Days were picked by INDEX against a live locator.**

```js
const days = page.locator(".bk-cal .cell:not(.closed):not(.empty)");
for (let i = 0; i < (await days.count()); i++) { await days.nth(i).click(); ... }
```

Choosing a day re-renders the calendar — every day that cannot hold the chosen
service greys out, which is **correct product behaviour**. So after the first
click `days.count()` fell to 0, the loop condition failed at `i = 1`, all three
months reported no open cells, and the throw landed on a locator instead of on
the cause.

**AND IT HAD NEVER WALKED MORE THAN ONE DAY IN ITS LIFE.** While today still
had a free slot the loop exited on the first iteration and never reached the
bug. It began failing at ~22:00 local — when the demo's own trading day
(08:00–18:00) closed and the first day stopped having slots. *A check that
succeeds on its first attempt every time has never exercised its retry, and is
not the same as a check that works.* Same family as the always-false `if` and
the selector that matched nothing: **a skipped path reads exactly like a
passing one.**

**2 · The grid was read before it existed.** A month's open days come from an
availability call, so enumerating them straight after `settle()` could read an
**empty** grid and conclude the business was shut. Visible only with the
network log next to the day log: `month 0 open:` with nothing after it, and two
`available-slots` 200s arriving immediately afterwards.

**The general form of both, and it is the transferable line: `settle()` is a
CAP.** It is a fine cap on a repaint and it is not a wait for a network round
trip. Where the thing being waited for comes off the wire, wait for the thing.

### The fix

Days are collected as DATES and clicked by their own label, re-querying after
every render and skipping any that have since greyed out — the same *address a
node, never a position* rule the day rail already taught this repo. The grid is
waited for before it is read. The failure now says what happened in a sentence
instead of naming a locator. And **`SLOTPROBE=1` prints the day walk and every
`available-slots` response**, because none of the above was visible without it
and the next person should spend ten seconds on this rather than an hour.

Verified: three consecutive clean full runs, plus `--lite`.

## Roadmap 2.17, second pass — the owner walked it

> **⚠ SUPERSEDED IN PART, SAME DAY: the DISSOLVE below was rejected by the
> owner on sight** — *"it just looks like a page refresh… I'm sorry if I
> steered you to that. I wasn't trying to."* Everything else in this section
> stands (the month's travel, the cascade lesson, the baselining findings).
> **The dissolve does not.** His earlier *"a little dissolve or a blur"* is
> quoted approvingly below and is exactly what he has now withdrawn — read
> PROJECT-STATE.md, "THE DISSOLVE IS REJECTED", before acting on any quote in
> this section. Kept rather than deleted because the reversal is the
> load-bearing part.

He looked at the retrofit on his own machine (27" 1080p, so 1920x1080) and went
through it item by item. Most of it he liked — *"a lot of stuff kinda has that
nice animation that you added, so that's good"*. What follows is what he
didn't, and every one of them was reproduced by measurement before it was
touched.

**And his monitor answered the question the first pass left open.** The 1440
calendar reflow was put to him as a decision; he reported *"when I go to the
calendar, I see the names just fine"*, which is the 1920 case where nothing is
lost. Left as it is.

### A SWAP is a third kind of motion, and it was the real gap

The first pass covered a screen ARRIVING and a thing OPENING. He found the
third:

> "The only one that I don't like — there's no animation of, like, if I switch
> between one booking and I click another one, it just instantly changes…
> maybe like a little dissolve or a blur. You figure out a nice quick animation
> for switching between stuff where, like, **the GUI kind of doesn't really
> change, but the actual text inside of it changes**."

**⚠ *"a little dissolve or a blur"* IS WITHDRAWN — he took it back the next
day and apologised for it. Only the bolded clause survives.** Kept here because
deleting a retracted hint is how it gets re-derived from a file nobody checked.
See *Roadmap 2.17, third pass — replacing the dissolve he rejected*.

**That last clause is the definition.** Nothing arrived and nothing left; a
frame stayed exactly where it was and everything inside it was replaced.

**IT OVERRULES A DECISION FROM EARLIER THE SAME DAY.** The retrofit skipped the
exit on replacement, reasoning that playing record A out and record B in puts
180ms between a tap and the thing tapped for. **That was right about the
container** — which is why the panel still does not leave and come back — and
**wrong to conclude the contents should not move either.** A dissolve costs
nothing in delay because the new content is on screen at frame one; only its
opacity is travelling.

Three sites, one mechanism: the job record (`RecordHost`), Money's figures when
the period changes, and the Clients list when the sort changes. He named all
three.

### The trap, which caught two different fixes

**A swap must not be a direct child of `.col-1`.** The screen's arrival
selector is `.app-main > .split > .col-1 > *` at (0,4,0) and `.swap` is
(0,1,0), so the arrival wins: Money re-ran `arrive` on every period change — a
420ms staggered LIFT, which is precisely the *"page refresh thing"* he was
complaining about rather than the dissolve he asked for. `getAnimations()`
reported `anim:arrive on div.swap`, which is the whole diagnosis in one line.

**The first fix was a specificity override. It won the fight and broke a
different law.** With `.swap` forced to win, first paint became: heading and
control rising over 420ms on a 0/40ms stagger, and the two swapped blocks
dissolving in 180ms with no delay. The screen arrived at **two speeds**, and
its tail landed EARLY — the mirror image of the defect the 40ms stagger exists
to prevent. Measured on Money's first paint, not reasoned about.

**The answer was markup, not cascade.** The swap goes on an INNER wrapper, so
the outer element keeps its place in the arrival and the inner one dissolves
only when its key changes. On first paint both run and the inner is invisible,
because its parent is fading up from zero over the same window. No override, no
delay reset, one arrival preserved, and eight lines of tricky CSS deleted.

***Winning a cascade fight is not the same as being right.*** The override made
the symptom go away and moved the damage somewhere nobody was looking.

### The month travels with the panel now

Killing the remount in the first pass was necessary and not sufficient:

> "You didn't animate the calendar. So the calendar, like, instantly shifts
> over with a quick snap… the out animation is good, but the calendar just
> snaps back into place."

Measured at his size: opening a day moved the month grid **270px left** and
grew it **1,144px → 1,236px**, with no transition on either. The small thing
animated and the big thing beside it did not.

**Two properties carry the move.** `.app-main`'s `max-width` (the block is
centred, so widening it moves the left edge) and `.split.calday`'s track list
(the space the panel opens into). Both are transitionable. **`display` is
not** — which is why the closed state stopped being `display: block` and became
a **0px second track**. That change forced `tests/composition.test.mjs` 8d-ii
to be re-pointed at the invariant (*with nothing open the month takes the whole
width*) rather than at the old spelling of it.

**Both ends key on `:not(.leaving)`**, so the month starts back as the panel
starts leaving. Without that the close is 180ms of panel followed by 180ms of
month — 360ms, and it reads as two events. Found by measuring the close and
seeing only `column-out` running.

**One artifact, measured and accepted:** the panel's heading re-wraps from two
lines to one over the last ~20px of the open. Visible at 10x slow motion,
**~18ms at real speed**. Both alternatives are worse — pinning the panel's
width makes it overflow the viewport during the open, and animating the month's
own track instead makes every cell re-truncate its text.

### Baselining found three vacuous checks, all the same shape

Every new check was mutated to prove it could fail. Three could not:

1. **`src.includes("swap")`** was satisfied by the word *swap* appearing in the
   comment that explains the swap. A check whose only subject is its own
   documentation.
2. **An `||` across two Money sites** meant unwrapping one left the other
   answering for it.
3. **An `||` across Money and Clients** in the wrapper check, same failure.

***An OR across independent subjects is not a check on either of them.*** Each
site is now named and asserted separately.

**And a raw backspace (0x08) got into a regex through a shell heredoc, for the
SECOND time in this repo** — CLAUDE.md already records that exact trap from
roadmap 2.18, and it happened again anyway because `\b` in a bash heredoc is a
backspace, not a word boundary. Visible only under `cat -A`. **The fix that
sticks is not to write regexes through heredocs**: every patch in the rest of
this session was written to a file and applied with Python.

**The baseline harness itself was the fourth instance.** Written first as bash,
it used `cp` to Git Bash's `/tmp` while native Python read a path that did not
exist — so every mutation silently failed to apply and every run reported a
clean pass. **A baseline harness that cannot fail is the exact defect it exists
to catch.** Rewritten in one language, and every mutation now asserts it
changed the file before anything runs.

## Roadmap 2.17, third pass — replacing the dissolve he rejected

The dissolve shipped in the second pass, he looked at it, and he turned it
down flat:

> "The dissolve that you created is horrible in the terms of… it just looks
> like a page refresh. Yeah. So the dissolve wasn't it. **And I'm sorry if I
> steered you to that. I wasn't trying to.** … Same with it today when I switch
> it. It's, like, this kind of harsh fade in… **it doesn't look fluid**."

Nothing was changed that day — *"don't do anything yet. Stop."* This section is
what replaced it on 2026-09-04.

### The two withdrawn hints, and why they are still quoted

**His own earlier message is what produced the dissolve** — *"maybe, like, a
little dissolve or a blur"* — and it is still sitting in `docs/roadmap.md`,
`docs/design-system.md` and in the section above this one. He withdrew it
himself and apologised for it, which is as clear as a retraction gets, but
**a session that finds the earlier quote and not the retraction rebuilds the
rejected thing and can cite him for it.** So every surviving copy of that
sentence now carries the withdrawal beside it rather than being deleted: a
deleted retraction is how the idea gets re-derived from a fourth file nobody
thought to check.

**And he declined to specify the replacement, on purpose:** *"I'm not gonna
give you an animation idea. You should figure out the animation idea."* He
floated *"maybe a text that went down and faded up"* and pulled it back in the
same breath — **a second withdrawn hint, not a spec.** Building either one
literally repeats the mistake that produced the first.

### Designing against the diagnosis, not the complaint

**This is the transferable part of the whole item.** Designing against *"it
looks like a page refresh"* produces a shorter dissolve, or one without a blur,
which is the same defect in less time — and it would have been defensible,
because it answers every word he said.

The diagnosis is one sentence: **a page reload IS a whole block changing
opacity at once.** A uniform cross-fade of a content block therefore reproduces
the exact optical signature of a reload, however brief it is and whatever
filter rides along with it. **The fault was the UNIFORMITY — not the duration
and not the blur**, even though the blur is the thing his hint named and the
duration is the thing an instinct reaches for first.

The corroboration was already in the repo and cost nothing to check: **every
motion in this product he has approved moves its parts on different timelines.**
The screen's arrival steps 0/40/80/120/160ms. The day rail steps inside itself.
**Nothing he has ever approved fades as a single flat plane.**

### What it is now: the screen's own arrival, one level down

`.swap` carries **no animation at all** — it is a marker plus a React `key`,
and the key is what mounts new children so their animation runs. `.swap > *`
runs `arrive` for `--t-exit`, staggered **20ms**, capped at **160ms**.

**No new keyframe, no new duration, no new distance and no new property.** 14px
is `arrive`'s and `step-fwd`'s, 180ms is `--t-exit`, 20ms is the day rail's
step, 160ms is the arrival's own ceiling. **The product has ONE entrance shape
at three scales now** — a screen (420/40), a rail inside a screen (420/20), a
block's parts (180/20) — which is the only reading of *"a keynote for the
entire site"* that produces a system rather than a pile of animations.

**The blur is gone and law 4 goes back to transform-and-opacity-only.** The
written exception it needed left with it. That is worth noticing on its own:
**the rejected version was also the one that needed a law bent for it.**

**The ladder runs eight deep, and it is the one number not simply borrowed.**
Both ladders it copies cap at the fifth child — right for a screen with five
sections and a rail with five jobs. The Clients list is the longest thing that
swaps here and most of it sits *below* the fifth row, so a cap at five would
leave the majority of that list moving as one plane: the rejected fault, on the
screen where it would be most visible.

**And this section had to reverse a sentence the design system stated as a
principle.** It said *"nothing moved, so nothing slides — a 14px translate here
would be the frame lying about what happened."* The frame still does not move,
does not leave and does not come back. **What travels is new content resolving
into place, which is what `arrive` has always meant.** The old sentence was
reasoning from the hint rather than from the object.

### The check that holds it is stricter than the defect

`composition` 57 → **59**. The interesting one is **8e-i-b, which fails on ANY
rule targeting `.swap` at all** — not merely on an animation there. The narrow
version would have to guess at every spelling of the same defect
(`animation:`, `animation-name:`, a shorthand inside a media query, a
`transition` doing the same job), and **the flat plane coming back would arrive
looking like a tidy-up: one selector instead of ten.** A future rule that
genuinely needs to style `.swap` fails this check and has to read the comment
first, which is the point.

**8e-vii counts DISTINCT delays rather than the presence of a ladder**, because
a stagger that collapses to one beat is a uniform fade wearing ten selectors —
the vacuity family this item has now hit five times.

All five new or changed checks were baselined both ways **by a Python harness
that asserts each mutation actually changed the file before running anything**,
which is the second pass's own lesson from the bash harness that could not
fail. Two mutations trip a sibling check as well as their own; that is reported
rather than tuned away.

### What the review found that the measurement could not

The build measured clean — `getAnimations()` said the right things were running
at the right beats on all three surfaces. It went through `impeccable critique`
anyway, and that found two real defects. **A clean animation reading tells you
what IS animating, not whether it SHOULD be**, and that is the whole value of
the second pass.

**1 · The pinned action bar was animating.** `.jobbar` is a child of
`.record-body`, so it sat inside the swap: six buttons that are pixel-identical
between any two jobs, travelling 14px on every switch, on the record's primary
tap target, forty times a day. **`RecordHost` already pulled the CLOSE BUTTON
out of the swap for exactly this reason** — the action bar is the same object
one level down, and it was missed only because it is a *child* of the swapped
element rather than a *sibling* of it. **Furniture opting out is the rule's
other half rather than an exception to it**: a swap means *the words changed*,
and static chrome behaving like content is the purest page-refresh tell there
is. The test for the next one: *would this control be pixel-identical in the
record you just came from?*

**2 · The chart is fixed rather than accepted.** This section originally
recorded Money's 620ms tail as measured-and-left, on the grounds that no
selector can separate a swap from a first paint. That is true of CSS and it was
being used to close the question — `Money.jsx` can see it in three lines, and
the note admitted as much while deferring it. **Three lines is not a reason to
ship the one defect on the one screen he named.** `.bars.replacing` now says
so, and the chart no longer animates twice: it still takes its beat as a
`.swap` part, and what stops is the second animation on top of the first —
which is the mistake this repo already recorded for the gear.

**3 · And the flag's first version was correct-looking and did nothing. This is
the most reusable thing in the item.** Written as a comparison recomputed on
every render, it was true on the render that changed the period and **false on
the very next one** — the reload finishing sets `refreshing`, which re-renders.
The class went on and straight back off. **Removing `animation: none` from a
live element STARTS the animation**, so the chart re-rose exactly as before
while the code read as a correct fix, and the class was already gone by the
time anyone could inspect the DOM. `getAnimations()` at 120ms is the only
instrument that could see it. The verdict is latched per period now, not
derived per render.

**4 · The eight-deep ladder's written justification was overclaiming**, and the
number was right anyway. It said a cap at five would leave "the majority" of
the Clients list moving as one plane; `ROW_CAP` is 200, so eight leaves a
majority too. **The cap is a BUDGET, not a claim that every row is distinct** —
what it buys is that the TOP of the list cascades, and it stops at eight
because 160ms is where the screen's own arrival stops. The wording was
corrected rather than the ladder.

**What the review did NOT change, deliberately.** The blank tail — the bottom
of a switched record is empty for up to 160ms — is the same thing the screen's
own arrival does, and is what "resolving top-down" costs; the alternative is
the flat plane he rejected. And switching faster than ~150ms restarts the
keyframes from zero so the tail never lands: real, equally true of the
dissolve, and fixing it means abandoning the remount that makes a swap a swap.

**And `theme.css` had claimed the opposite of all of this since the chart was
written:** *"a month switch snaps, deliberately: animating bars between two
different months implies a continuity that is not there."* **It had never been
true** — the bars have always re-animated on a period change. Corrected in
place. *A comment that describes an intention rather than the behaviour is
worse than no comment, because it sends the next session hunting a bug that is
not there.*

### Verified

- `getAnimations()` at 1920, 120ms after each click, on all three surfaces.
  The job record switch: **15 parts** on `arrive` at
  0/20/40/60/80/100/120/140/160ms and **no `column-in`**, so the panel holds
  still exactly as it did. Money: figures at 0/20/40/60/80, ledger at 0/20/40.
  Clients: **eight** rows at 0…140, one beat each.
- Frame-stepped by pausing the animations and seeking: at **90ms** the record's
  top half is drawn and its lower half is still empty; at **180ms** nearly all
  of it is in. That is a block filling top-down rather than a plane fading, and
  it is the difference the whole item turns on.
- `?lite=1`: nothing running, rows at `opacity: 1`, `transform: none`.
- Full `--all` sweep at five widths, **clean, 356s**; `--lite` clean, 209s.
- Nine credential-free suites, `accent-sweep`, `qr-scans`: all pass.

## The corner got smaller rather than more universal

The owner asked for two things on 2026-09-04 and they turned out to be one
edit. That is the whole entry.

> "For the squircles, do, like, your best to make a squircle design that
> doesn't rely on the browser knowing what it is… that will work universally.
> And when I used a browser extension to preview what it looked like — what I
> liked is, the day menu and other menus, the main difference is it just made
> the radius smaller, so more blocky with still being rounded off. I think I
> like the blockiness more, but not, like, super blocky, like the casual AI
> blocky, but just a little bit less rounded. And more specifically, just on
> the tab switcher, the corner radiation should be smaller. But just do
> whatever you think will look well and doesn't look like AI."

### The universal squircle does not exist, and it stopped mattering

Both routes were costed in roadmap 2.17 before he asked, and neither was
re-opened: a Houdini paint worklet is Chromium-only too, so it buys a JS paint
pass to reach exactly the browsers `corner-shape` already reaches; an SVG mask
reaches Safari and clips the 1px hairline this system draws on nearly every
surface.

**What is true instead was measured rather than argued.** The difference
between a true squircle and the plain rounded corner every browser already
draws is proportional to the radius. One corner, rendered at 4x, pixels counted
in a 60x60 crop:

| Radius | Pixels differing between `round` and `squircle` |
|---|---|
| 24px | 71 |
| 18px | 34 |
| 14px | 20 |
| 12px | 14 |
| 10px | 7 |
| 8px | 3 |

**So tightening the radii IS the universal fix.** Panels 18 -> 12 and insets
12 -> 8 cut the Chromium-only difference by 59% and 79%. A Safari user and a
Chrome user are now looking at practically the same corner, with no mask, no
worklet and no JavaScript. *The thing he liked and the thing he asked for were
the same change* — which is only visible if you take the diagnosis apart
instead of building the thing that was named.

### What moved, and what deliberately did not

- **Panels 18 -> 12, insets 12 -> 8, and the RATIO HELD.** Both pairs are 3:2,
  so a panel still reads as the parent of an inset; only the scale moved.
- **`booking.css` moved in the same edit.** One corner language or two, and
  § Layout already calls two worse than not doing this at all.
- **The tab switcher came off `--r-pill` onto its own `--r-nav: 16px`**, which
  he named specifically. It was a capsule: 27px domes on a phone, a lozenge at
  a desk.
- **Its buttons are `calc(var(--r-nav) - 5px)`, and that is arithmetic.** The
  bar's padding is 5px, so an inner corner must be 5px tighter or the two
  curves are not parallel and the gap pinches at the corners. `calc()` means
  the inner number cannot drift when the outer one moves.
- **PILLS DID NOT MOVE.** Buttons and state chips are still 100px. He named
  menus and the tab switcher; Apple — his own reference — squircles cards and
  keeps capsules as capsules. Turning every button into a rounded rectangle is
  a different decision nobody has asked for, and *"do whatever you think will
  look well"* is not a licence to widen the ask.

### 12px on the bar was tried and rejected by looking

The tidy answer was to give the tab bar `--r-panel` and its buttons
`--r-inset`, which would have added no new token at all. Rendered at 392 and
1440 and put side by side, it was wrong: **a 460x54 floating bar at 12px stops
reading as an object over the ground and starts reading as a strip welded
across the bottom** — the exact failure `theme.css`'s own note on that
component was written to avoid. 16px keeps it floating and is still 84px less
round than it was. **One new token, bought by a screenshot rather than by an
argument.**

### And the check had to learn the new token

`composition` 8a pairs every `--r-panel` / `--r-inset` corner with
`corner-shape` and forbids it on pills. `--r-nav` would have sat outside the
subject set — **a new radius token that is not named in that check is the one
surface the pairing rule silently stops covering**, and an unpaired token looks
exactly like a finished one. The regex reads `(panel|inset|nav)` now, and it
was baselined by unpairing the tab bar: exactly 8a-ii fails.

### And then the landing page joined, which closed roadmap 2.17

He answered the standing question with *"just do whatever is needed."* `/` had
**six ad-hoc radii (18, 16, 13, 12, 11, 10) and no tokens at all** — the *by
habit rather than by role* tell — on the page a visitor meets FIRST. It now
carries `--ld-r-panel: 12px`, `--ld-r-inset: 8px` and `--ld-corner`: the
product's own values, so pressing *Get started* no longer changes the corner
under the visitor mid-click.

**THE APPROVED REFERENCE RENDERING MOVED IN THE SAME EDIT AND IS NOW A SWEPT
SURFACE.** `docs/design-directions/5-the-thread.html` holds the same twelve
corners, and CLAUDE.md says that where it and the design document disagree
**the page is right** — so a page that drifts from the stylesheet quietly
becomes the wrong authority, which is worse than a stale document.

**BOTH FILES WERE REWRITTEN FROM ONE TABLE KEYED ON THE VALUE, NOT THE
SELECTOR, and that is the transferable part.** The first attempt matched
selector names and **silently applied 13 of 15 edits to one file and 11 of 15
to the other** — they spell their selectors differently (`.ld .tile` against
`.sunken`, spaced against minified). The mapping IS "these six values become
two", so the VALUE is the subject; the rewrite asserts exactly twelve corners
per file and fails loudly otherwise. *When two files hold the same content in
two dialects, key the edit on the thing that is the same.*

**THE TWO COMPLICATIONS RAISED WHEN THIS WAS ONLY MEASURED WERE BOTH REAL.**
`corner-shape` **does not inherit**, so the hero card's full-bleed highlight —
which takes `border-radius: inherit` — would have stayed a round rect inside a
squircled card and sat proud of the corner it lights. And `corner-shape` **has
no effect on `clip-path`**, so the comparison row's reveal had to take the
token itself or it wipes a different shape than it draws. **At 8px that second
one is a 3-pixel difference, which is exactly why it would have survived a
look** — it was fixed because it was found by reading the file, not by
screenshotting the result.

`composition` 8a sweeps **four** surfaces now (72 checks), each baselined by
unpairing one corner. Verified at 1920 / 1440 / 768 / 392 with the console read
at each.

## Roadmap 2.5 — the smoke test, and a white screen that was live on `main`

The loop works. What was broken was a **configuration nothing in this repo had
ever rendered**, and the shape of that is the whole entry.

**`scripts/e2e-booking.mjs` was dead and is rewritten.** It had pointed at a
Linux Playwright path and a container scratch directory since before
2026-08-31, and nothing noticed because it was in no list anything runs. It is
now 82 checks over two tenants and it is in CLAUDE.md's verification list,
which is the half that stops it rotting again — the script was never the
problem, the absence of a caller was.

**IT IS THE ONLY THING IN THIS REPO THAT PRESSES THE BUTTON.**
`sweep-booking-steps.mjs` walks all seven steps of the booking page and stops
ON the review step, because it measures heights. So Confirm — the one action
the product exists for — had been exercised at the API level by
`booking-engine` and through the UI by **nothing at all**. That is not a gap
anybody chose; it is what a test written to answer one question looks like when
it is also the only test on the screen.

**THE DEFECT: `ReferenceError: modeLimit is not defined`, a white screen on
step 4 for every business offering only ONE of mobile and drop-off.**
`BookingPage.jsx` passes `modeLimit` to `StepLocation.jsx`; `StepLocation`
never destructured it, and the only branch that reads it is the one a
single-mode business renders. Live on `main` since 2026-08-31 (`1ed5084`,
roadmap 2.8c). For such a tenant it is a **total booking outage** — the form
dies at the address step and the customer meets the error boundary. The demo
enables both modes, so every script, screenshot and sweep in this repo's
history had rendered the other branch. **The mobile-only seed
(`demo-riverside`) existed the whole time and nothing walked it**, which is why
the new script walks two tenants rather than one and why that is not a
nice-to-have.

**The same line hid the feature's other half, and this is the more interesting
failure.** `both` was computed inside `StepLocation` as
`mobile_enabled && dropoff_enabled`, while `BookingPage`'s own `bothModes` is
the same expression `&& !modeLimit` and feeds the step's HEADING. So a business
with both modes on and a service that allows only one got the narrowed heading
sitting over two choice cards — and the *"Ceramic Coating has to be done at our
place"* line that file was written to print was **unreachable in every
configuration that did not crash**. Roadmap 2.8c built that message; it had
never once been on a screen. ***The same duplicated expression both crashed the
page and made the feature it guarded dead — a derived value computed twice is
one bug wearing two costumes, and the fix is to take the prop that was already
being passed.***

**The second finding: the demo was asking Resend to deliver mail that could
only bounce.** `businesses.contact_email` for the demo was
`demo@detailplatform.com` — **a sign-in reused as a mailbox**.
`notification_emails` is empty, so `ownerRecipients` falls back to it, and that
domain is registered to somebody else and has **no MX record**. `send-email`'s
undeliverable-domain guard covers reserved domains (`.test`, `.invalid`,
`example.com`) and this one looks perfectly ordinary, so it went straight
through — against the same sending reputation that carries Andrew's real
customers' receipts. Now `demo@example.com`, in `seed-demo.mjs` and on the live
row. ***A login and a mailbox are two different facts that happen to be spelled
the same way; a seed that stores one under the other will send mail to it.***

**HOW THE EMAIL LEG SEES ANYTHING AT ALL.** `sendTenantEmail` is best-effort by
design — *an email failure must never fail a booking* — so a dead relay is a
`console.error` inside an edge function and is invisible from every screen and
every other suite. That is exactly how the 0.2 defect survived: mail was 403ing
for every customer and the dashboard looked fine. The only instrument that can
see it is the project's own logs, so the script reads `function_edge_logs` and
`function_logs` through the Management API. Without
`SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROJECT_REF` the leg prints **skip**, never
pass — a check that cannot run must not look like one that did.

**Proven to the PROVIDER, not to an inbox, and the distinction is deliberate.**
The customer address is Resend's `delivered@resend.dev` simulator — roadmap
0.3's own choice for the same reason — so the send genuinely posts to Resend
and a non-2xx fails the run, at no cost to a shared reputation. Whether a mail
client RENDERS it is `send-test-emails.mjs` plus a person, which 2.18 did on
2026-09-03. Two different questions, two different instruments.

**Three script bugs that all looked like product bugs, kept because the shape
repeats.** `bookings` stores `start_at timestamptz` and has no `booking_date`
or `start_time` column — every local date in this product is derived in the
business's zone — and asking PostgREST for one returns a 42703 that reads
exactly like *"the booking was never made"*. A `settle()` after pressing **Move
my booking** reads the OLD row, because there is no spinner on that page and
`settle()` is a cap on a repaint, not a wait for a round trip — the same lesson
`sweep-booking-steps.mjs` already carries, arriving from a new direction. And
Continue is gated on the server quote, so reading `isEnabled()` the instant a
card is clicked reports a working step as broken. **All three failed loudly and
all three were mine; the control for that is to distrust the harness before the
product when the product is the thing under test.**

**AND THE OBVIOUS FOLLOW-UP WAS ASKED AND ANSWERED: there are no others.**
Every `<Component prop={…}>` in `app/src` was compared against that
component's own parameter list. The only props passed and not taken are
React's own `key`, ten times, which is correct. `modeLimit` was the single
instance in the codebase. There is no linter in this project — five runtime
dependencies and no ESLint — so this class of bug has nothing standing
between it and a customer except somebody rendering the branch.

**WHAT IS NOT COVERED, ON PURPOSE.** No seeded business has a service that
narrows the mode, so the message above is still rendered by nothing automated.
Seeding one is two lines — but it puts a new sentence on step 4, which has 39px
of spare height at 392 (W16), so it needs a `sweep-booking-steps.mjs`
re-measure and belongs with the next change to that step's budget rather than
here. It is written into the roadmap item so it is not rediscovered as new.

**HIS ANSWER ON PUBLISHING, 2026-09-04, and it is a STANDING PERMISSION rather
than a one-off.** Asked whether to put the crash fix on `main`:

> *"btw no detailers are using this yet. im not ging public umtill eveything is
> cpmpleaye. but yes we can publish if we need to"*

Three facts in one sentence, and the first two change how the third reads.
**There are no detailers on the product at all** — not "few", none — so a
booking-page crash on the live site harms nobody today, and the urgency this
item's ask implied was wrong. **He is not going public until the build is
finished**, which he has now said twice (2026-08-30, 2026-09-04). And
**publishing is authorised when it is needed**, with the judgment of whether it
is needed delegated.

**So it was NOT merged, and that is the answer to his condition rather than a
deferral.** Nothing needs it: no user can meet the crash, the fix is on the
branch, and putting 66 commits onto his private preview mid-build changes the
thing he checks his own work against for no gain. **The next session that has a
reason to publish does not need to ask again** — it needs to say why it is
needed. What was done instead is the thing that WAS overdue: the branch was
pushed, because 21 commits (all of roadmap 2.17, 2.18 and 2.5) existed only on
this machine, and pushing the branch deploys nothing.

## Roadmap 2.13 — custom roles and permissions

### The word `owner` survived, and that is the design rather than an omission

His ask reverses 2.11's staff design: *"right now, the owner kinda chooses this
person's an owner, this person's a staff, and we set the rules. They should set
the rules… invite someone, and you could give them a name, like a customizable
name, and you could also check out, like, there should be options on what
permissions they should have and what they shouldn't have."*

The obvious reading is "replace `business_users.role` with a permission set".
**That reading is wrong, and the reason is a trigger.** `protect_last_owner()`
fires before every update and delete on `business_users` and refuses to remove
or demote the last `role = 'owner'` — **including for the service role**, which
is what makes "a business nobody can administer" genuinely unreachable rather
than merely unlikely. A permission set has no last-anything: dissolving `owner`
into four booleans takes that trigger's subject away from it, and the
replacement would have to be a fresh invariant written from scratch over an
array column, on a live database, in the same change as a new screen.

So `role` is untouched — two values, same check constraint, same trigger,
same `is_business_owner()`. **What is new is that a NON-owner is no longer one
fixed shape**: the membership carries `label` (their own word for the role) and
`permissions text[]` (what they ticked). `owner` still means everything, always.

**This is also the smallest diff that answers what he actually asked for.** He
asked to name a role and tick its abilities. He did not ask to be able to give
away the thing that makes him the owner.

### The four permissions were DERIVED from the schema, not invented

`money`, `marketing`, `settings`, `requests`. Every one of them is the key to a
group of policies that already existed as an owner-only group before this item
started — the tables `20260827003000_staff_roles.sql` tightened, plus the
`requests` capability 2.12 handed staff by default. Nothing was named because it
sounded like a feature.

That matters more than it sounds. A permission list invented from the tab bar
would have produced "Calendar", "Clients", "Today" — names that describe
screens, which the database has never gated on and which hiding a tab does not
enforce. **The list had to be the shape of the enforcement or the ticks would
be decoration.**

**The vocabulary is closed by a CHECK CONSTRAINT** (`permissions <@ array[…]`),
because a typo'd permission grants nothing and looks exactly like a permission
that was never ticked — the "a skipped check reads like a passing one" family,
one table over. `invite-user` filters the same list on the way in, so a bad
value from a client is dropped rather than 500ing the invite.

### `has_business_permission()` folds the owner in, on purpose

```sql
where … and (role = 'owner' or p_permission = any(permissions))
```

Every re-pointed policy then asks ONE question instead of two, and **there is
no way to write a permission check that forgets owners** — which is precisely
the mistake that would show up as a detailer locked out of their own money
screen, on a Sunday, with no way to fix it. The edge functions' `can()` and the
front end's `can()` fold it the same way, and `tests/staff-roles.test.mjs`
test 11 asserts the owner's own list is EMPTY and that they read everything
anyway.

### Managing the team is deliberately NOT a tick box

The obvious fifth permission is "Team", and it is a trap: whoever can hand out
permissions can hand themselves every other one. Making it safe needs a grant
lattice — you may only give what you already hold — which is a real feature
nobody has asked for, on a product whose largest tenant has one owner and one
staff member. Invites, membership and permission changes stay
`is_business_owner()`. Test 13 pins it from the other side: a member cannot
grant themselves a permission and cannot rename their own role.

### `requests` is the one permission that TAKES AWAY, which is why the migration backfills

The other three grant something a staff member never had. `requests` removes
something they have had since 2.12 — `respond-to-booking` uses `requireMember`
and does not distinguish the roles. So the migration writes
`permissions = '{requests}'` onto every existing `staff` row and every live
`staff` invite: **the day this shipped, nobody's dashboard did less than it did
the day before.** Test 14 baselines both halves — 403 without the tick, accepted
with it — and the 403 case was baselined by deleting the gate and redeploying,
which failed exactly three checks.

### The settings tick did not mean what its own words said, and that needed a second migration

The screen tells a detailer that `settings` covers *"Prices, hours, booking
rules, branding and the business's own details."* The first migration made that
true of `business_settings`, `business_branding`, `businesses` and
`business_domains` — **and prices and hours are in none of those.**
`services.price`, `business_hours`, `blockout_dates`, `gallery_images` and five
others were `*_tenant_all` from `20260827000200_tenant_data.sql`: writable by
ANY member, since long before there were two roles.

**It was not reachable, and that is not the same as not being true.** Staff have
had no Business tab since 2.11, so nothing in the dashboard offered it. But RLS
is the enforcement in this product, a browser is not the only client, and what
changed today is that a detailer is now SHOWN a tick box and told what it
controls. A promise printed on a settings screen that the database does not keep
is *"a number PRINTED is not a number CHARGED"* one table over.

`20260904001000_catalog_behind_settings.sql` splits each of those policies in
two: **SELECT stays open to every member** — load-bearing, because a member must
read `services` to take a booking at all, and DaySheet shows them an existing
blockout because it is worth their knowing before they load the van — and the
three writing verbs move behind `settings`. The storage bucket moved with them,
through a set-returning helper rather than a uuid cast, because casting an
arbitrary object path to uuid inside a policy is an error waiting for the first
file that lands outside a business folder and **Postgres does not promise to
evaluate a guard before the cast beside it.**

**`monthly_plans` is not in that list and roadmap 2.14 is wrong about it.** The
migration failed on it: the table was created in `tenant_data.sql:51` and
DROPPED nine hours later in `phase2_cleanup_and_storage.sql:16`. 2.14's "what
exists, so nobody re-derives it" paragraph cites it as real, which is exactly
where the next session will look. Corrected in the roadmap.

### The role editor is a SWAP, and it is the first site built under that rule rather than retrofitted into it

A member card shows a name and one sentence; pressing *Change* replaces those
with a name field and four switches. The reflex is "a thing that opens", which
under CLAUDE.md costs an entrance, an exit, `useLeaving` and a delayed unmount.
**It is not one.** The card does not move, does not leave and does not come
back — its contents are replaced, which is the owner's own third kind of motion
in his own words: *"the GUI kind of doesn't really change, but the actual text
inside of it changes."* So it is `.swap` plus a React key: no new keyframe, no
new duration, no hook, and the parts arrive on their own 20ms beats.

`composition` 8e-iv and 8e-vi carry it, and 8e-iv passes for a reason worth
naming: the wrapper that keeps a swap off `.col-1` is the member's own `.card`,
so the guarantee arrives for free instead of needing a bare `<div>`.

### The sweep reported a CRASHED SCREEN as "clean", and that is the oldest failure in this repo wearing new clothes

A one-word mistake — `settings` dropped from GearMenu's destructure while
adding `can` beside it — took the entire gear index down. `ErrorBoundary`
caught it and drew four short lines, and **four short lines are not off the
right edge, not outside their parent, not scrolling sideways, and not stacked
without a gap.** Every check `sweep-widths.mjs` owns passed. It printed

```
the gear                 clean
Notifications            NO SUCH ROW (gear)
```

— which reads like a renamed control, not a crash, and the run then died 40
lines later on an unrelated timeout that looked like the real fault.

`say()` now checks for the boundary's own heading before measuring anything and
prints `CRASHED — the error boundary is on screen: <reason>`. Baselined by
re-breaking GearMenu: it fires. **The reason comes from `textContent` and not
`innerText`, because it lives inside a CLOSED `<details>` — which `innerText`
correctly reports as invisible, and an empty reason beside the word CRASHED is
the least useful half of the message.**

This is the same lesson as the always-false `if` and the vacuous regex, in its
most general form yet: **every check in this script asks a question about
GEOMETRY, and geometry has nothing to say about whether the screen is the one
you asked for.**

### What the ticks do NOT do, and the one thing left with him

**`money` does not hide a job's PRICE from the diary, and never did.**
`bookings` is member-level by design — the diary is what a membership with
nothing ticked still has — so Today prints *EXPECTED $455.00* and a price
beside every job to a role with no `money` tick, and so does the job record.
**Not a regression** (staff saw exactly this before 2.13) and **not a lie**
(the tick says "The Money tab, expenses, and what each customer has spent",
which is what it does). But a detailer may reasonably assume otherwise, and
**the fix is a product decision rather than a bug fix** — a helper who takes
payment on the day needs the number — so it went to him rather than being
guessed at.

**A custom role cannot invite anybody**, which means there is no way to
delegate "add the new hire" without making that person an owner. If he wants
it, the thing to build is the grant lattice, not a `team` tick.

**Reusable role DEFINITIONS were considered and not built.** He described
per-person naming — *"invite someone, and you could give them a name"* — and a
`roles` table shared across people is the more "proper" model for a business
with fifteen staff, which nobody in this trade has. Per-membership columns
answer what he asked and do not foreclose the table: a later `role_id` can
point at a definition without touching what exists.

### A python rewrite silently converted twelve source files to CRLF

Patching the front end with `python -c "open(p,'w').write(s)"` reads LF and
writes `os.linesep`, which on Windows is `\r\n`. Every file went from LF to
CRLF, git's autocrlf hid it from `git status`, and the FIRST symptom was
`composition` 8e-iv failing on **Clients.jsx — a file this item had barely
touched** — because that check is a literal `includes()` of a two-line needle
containing `\n`.

It is the same shape as the raw backspace this repo has now hit twice: **an
invisible byte change that turns a green check red somewhere unrelated, and
sends the next session looking at the wrong diff.** Normalised back with a
binary read/write. If a byte-exact check fails in a file you did not mean to
change, `cat -A` it before reading the logic.

## Roadmap 2.14, step 1 — plans a customer can sign up to

The research is `docs/plans-research-2026-09-04.md`. This is the judgment: what
was decided about how to look, what the evidence changes, and what is left for
him.

### The panel was not enough, so seven real plan pages were sampled beside it

2.10 and 2.18 both used the same six products, and keeping that panel is what
makes counts comparable across items. **But the question this item asks is
about what a detailer PUBLISHES**, not about what a product can be configured
to do, and six vendors' help centres cannot answer it: a product that *supports*
recurrence tells you nothing about whether anyone puts it on their booking page.

So the panel answers question 1 (does the capability exist) and **seven real
detailing businesses' own plan pages answer question 2** (where the plan lives),
with one detailer forum thread for how the trade prices them. Same two-tier
split 2.8 used, for the same reason.

**The bias is stated in the file rather than averaged away, and it is large.**
Every one of the seven was found by searching for detailing membership pages, so
all seven have a plan and publish it. **This method cannot say how many
detailers run plans at all** — it says what the ones who do actually do. That is
enough for the two design questions and not enough for a "most detailers…"
claim, and no such claim is made.

### The finding that decides the build: the sale and the schedule are two acts

His sentence assumes one — *"it'll show up in the booking area"*, the customer
picks a plan and the visits follow. **Not one of the seven does that.** Car
Detox sells the membership through a checkout and then *phones* the customer to
agree a day; ZS Clean takes a phone number and says a team member will *"help
set up your first visit"*; Mint members *"schedule your service visit online
every month"* themselves; Visual pre-schedules only after a conversation. The
two products with a plan object generate it from something a human sold — an
accepted quote (Urable) or an emailed agreement (Housecall Pro).

**So the expensive half of the obvious design — create the next N bookings when
somebody signs up — is not something the trade does.** It also happens to be the
half our own schema fights: `bookings_no_overlap` is a GiST exclusion constraint
enforced by the database, so a batch of future visits fails on the first real
collision, in a job nobody is watching, and "skip the ones that conflict" means
a plan customer silently loses a month.

**The one product that does auto-schedule from the flow is Zenbooker, and it is
a cleaning tool.** Cleaning is the trade where a repeat is a chore on a fixed
rhythm; a Zenbooker recurring option is a REPEAT, not a plan — no membership, no
benefits, just a frequency with an optional discount. **Conflating a recurring
series with a plan object is the main way this item could go wrong**, which is
why the research file separates the two columns and counts them apart.

### The second finding is ours, not theirs: we take no money

Every plan in the sample that charges, charges a stored card. This repo has **no
payment processing of any kind** — no Stripe, no card on file, no capture;
`bookings.payment_status` is a flag the DETAILER sets by hand in
`FinalizeModal.jsx`, and `expenses.payment_method` is his own bookkeeping.

**A plan here can be an arrangement, a cadence and a price. It cannot be a
subscription.** A page reading *"$150/month, cancel anytime"* while the money is
still collected in person on the day is a number PRINTED that is not a number
CHARGED — the travel-fee defect in a new place, and this time it would be on the
customer-facing page. Whatever ships says plainly who takes the money and when.

### Placement: beside the flow, and deliberately not a toggle

7 of 7 detailers and 5 of 6 products put the plan on its own surface. Making
that a per-detailer choice — *"in the booking area, or just listed on the
website"*, which is how he phrased it — buys a second layout to design, build,
sweep at five widths and keep honest, **for a placement no evidence supports.**
The wording, the cadence and the price shape ARE his detailers' to choose, and
all three price shapes appear in the sample (a monthly amount, a per-visit
amount, a percentage off), so forcing one of the three excludes real businesses.
**That is the split: the detailer owns the offer, the product owns where it
sits.** If a real detailer asks for it in the flow, that is the moment to build
it.

### The recommended shape is mostly things that already exist

A sign-up is a **request** — ask, hold the slot, the detailer accepts — which is
2.12's rail and is exactly what the phone call does in five of the seven
businesses. Recurrence is a **nudge to book the next visit** on the existing
owner-nudge rail, which is what all seven actually do and the only version the
exclusion constraint cannot break. The discount lands where discounts already
land, so the receipt still reconciles.

**Deliberately not built:** subscription billing (there is nothing to bill
with), auto-created future visits, a customer plan portal, and the placement
toggle. **Billing is a platform-wide decision, not a plan feature** — when card
processing arrives it changes deposits, invoices and Money too.

### Two corrections to other files

**Phase 4.3, *"Monthly plans — needs a design conversation first: the old one
was a discount with no billing behind it"*, is the same feature as 2.14** and
predates it. It should be closed into this item once the shape is settled rather
than left to be rediscovered as a separate build.

And `monthly_plans` is still gone — created in `tenant_data.sql:51`, dropped
nine hours later in `phase2_cleanup_and_storage.sql:16`. **This is the third
file to record that**, and it is recorded again here because the roadmap item
carried the opposite claim for a week.

## Taking money, and roadmap 2.14 round 2

The research is `docs/payments-research-2026-09-04.md` and the second half of
`docs/plans-research-2026-09-04.md`. This is the judgment.

### The first job was splitting one question into two

He asked for payment and for a deeper plans pass in the same message, and the
sentence that matters is *"at least I need a way for my customers to pay me"*
followed by *"my clients the detailers need to pay me and I'm not gonna do it
manually."* **Those are two different businesses.**

- **MONEY IN** — detailers paying him, $499 setup and $40/month, recurring. His
  own revenue, and the one he refuses to chase by hand.
- **MONEY THROUGH** — a detailer's customers paying the detailer.

**Answering them as one question produces the wrong architecture**, because the
right answer to the first is "be the merchant" and the right answer to the
second is "never be the merchant."

### He corrected the first pass, and the correction changed stage 1

The first research said the old site listed *"Cash, Cash App, PayPal, Venmo &
Zelle"*. He sharpened it: **that is a list, not a checkout** — *"I just have
them like scan my code or whatever for which one they choose. No payment ever
goes through my site."*

**That correction is the whole of stage 1.** Putting a detailer's own payment
handles into settings and printing them on the invoice **makes what he already
does official, costs nothing, charges 0%, and needs no processor.** It was not
in the plan before he said that sentence, and it is now the first thing built —
because the cheapest true version of *"an official way to pay me"* is the one he
is already using, written down.

### Connect Standard, and the reason is liability rather than price

If money for a detail lands in the platform's account and is paid out, the
platform holds other people's revenue, owns their chargebacks, and answers for a
detailer who did not turn up. **Nothing about this product needs that.**

Stripe's own fee-payer documentation, read rather than assumed: a
`type=standard` connected account defaults to the **account** paying, and in
that mode Stripe *"collects fees directly from your connected account. We don't
charge any Connect fees to it or to your platform."* Processing fees, **dispute
fees** and Invoicing/Subscriptions fees all sit on the detailer. The **$2 per
monthly active account** and **0.25% + 25¢ per payout** on Connect's pricing
page apply only where the PLATFORM handles pricing, which we would not.

**So the cheapest option and the safest option are the same option**, which does
not happen often enough to pass up. **And it is what makes real plan billing
possible later at no platform cost**, because a subscription on a connected
account is billed to that account.

### Why NOT a merchant of record, stated so it is not re-proposed

Paddle and Lemon Squeezy cost 5% + 50¢ against Stripe's ~4.1% all-in on a $40
charge, and what the extra buys is **US sales-tax registration and filing**.
Software is taxable in some form in 26 states. **But economic nexus is typically
$100k or 200 transactions PER STATE**, so at $40/month another state needs ~208
detailers before it applies. **Paying 6.3% from the first sale to insure against
a problem that starts at ~200 customers is buying the wrong thing early.** What
he genuinely owes is his own state, and that is an accountant's question — the
$499 setup fee may be taxable where the subscription is not.

### The work in stage 2 is the failure path, not the checkout

Stripe Checkout in subscription mode is a hosted page and a webhook. **Failed
payments are 20–40% of all SaaS churn** — people who want to keep paying whose
card expired. The trade's practice is 3–4 retries over 10–14 days, a 3–7 day
grace period, then **pause rather than cancel**, with hard cancellation after
~30 days. **That is the same suspend mechanism roadmap 4.4 needs, so it gets
built once**, and the recommended shape punishes the right person: the
dashboard goes read-only while **the public booking page keeps working**, because
taking it down punishes the detailer's customers, who did nothing.

**And the real cost of stage 2 is support, not code.** Today nobody can be
wrongly charged, because nobody is charged. From the day this ships, a double
charge or a charge after cancelling is an email that becomes a chargeback if it
goes unanswered.

### On plans, the trade overruled the obvious build twice

**First: six plan shapes exist and they are not six features.** Frequency plan,
tiered membership, visit bundle, prepaid block, discount membership and
coating-protection programme all fall out of **four fields — a cadence, what's
included, how it's priced, whether there is a term.** Cadence is not a fixed
list (weekly through annual, and Tang advertises *"custom schedules — just
ask"*), and **price can vary by VEHICLE SIZE**, which we nearly have already.

**Second: the anti-breakage feature is not a contract, it is a pause.** Six of
ten plan pages advertise *"no contracts, cancel anytime"* **as a selling
point**. Early-termination fees and minimum terms are the GYM industry's answer,
and detailing has visibly rejected them. What the sample does use is **one free
skip a year** (ZS) and **pause while you travel** (Tang), because **most
breakage is a month somebody could not do, not defection.** **And we could not
enforce a penalty regardless — we take no money.** A detailing product shipping
cancellation fees would be selling the thing its market advertises against.

**The requirement he asked about has a real example, and it is not a cadence.**
Ceramic coating warranties **void** without documented annual maintenance —
System X within about 30 days of the install anniversary, *"and missing the
window voids the warranty for good"* — plus washing every 2–4 weeks. That needs
a **deadline with a date, an escalating reminder, and a record of when the last
qualifying service happened**, because the warranty claim depends on proving it.
**None of the six panel products does this.** It is the clearest opportunity
found so far to be plainly better than Jobber, and it deserves its own small
item rather than being smuggled into a cadence field.

### We log plans; the detailer runs them — and the ledger is why that is safe

Five of seven detailers manage plans by conversation. Real subscriptions cost a
**support burden rather than a code one**, and it lands in the wrong place: a
customer charged for a month the detailer never showed up for complains to
whoever sent the email. **Logging is a strict subset of billing, so nothing
built now is thrown away** — but only on one condition, and it is the load-
bearing part of this decision: **a plan has a cadence, and a MEMBER has a ledger
of visits owed and used.** With the ledger, adding billing later is adding a
charge against something that already balances. Without it, billing is a
rewrite. **Housecall Pro's own dashboard corroborates it** — its most useful
list is *"Unscheduled Visits"*, which exists precisely because the sale and the
schedule are two acts, this research's first finding rendered as a screen.

**Its seven plan statuses were deliberately NOT copied.** Seven states are what
a product with billing behind it needs; **ours needs three — active, paused,
ended** — and inventing four more that nothing can transition between is a
screen telling a lie.

### "Free" was measured, and it is not free

**Supabase's free plan includes no backups at all** (500 MB, two projects, pause
after 7 days without requests); daily backups start on **Pro at $25/month**.
**Resend's free plan is 3,000 emails a month, 100 A DAY, and ONE domain** — and
that one-domain limit is the actual blocker under 2.18's still-open "separate
Resend account for the platform" thread. At ~5 emails a booking, 100 a day is
~20 bookings across every tenant.

**So ~$45/month of fixed cost the day this has real tenants — covered by the
second detailer.** The useful framing: **payments have no fixed cost at all**
(every fee is a slice of money that moved), while the free tier stops being
appropriate at roughly the same moment plans become worth having.

## He is 17 and in California, and both facts changed the payment plan

He volunteered both — *"So I live in California, uh, and, you know, I'm under
eighteen. I hope this won't hurt anything"* — and nobody had asked. **Every
consequence here was checked against a primary or near-primary source**, because
this is the one area of the project where being confidently wrong costs him
money or a legal problem rather than a bad screen.

**Neither fact blocks the build. Both change what launch looks like.**

### Stripe says yes, with a parent

Stripe's own support pages: the minimum age for a **Standard** account is
**13**, and under 18 *"a legal guardian must assume the role of owner of your
account before your account can accept charges and funds can be transferred to
your bank account"* — with the guardian's name, date of birth, last four of
their SSN, address and a consent statement.

**So the platform's own Stripe account needs an adult on it before it takes a
single payment, and nothing else waits.** He can build and test the whole thing.

**The important part is what this does NOT break.** Express and Custom Connect
accounts require 18; **Standard does not**, and the detailers are adults with
their own Stripe accounts. **The round-1 architecture survives his age
unchanged**, which is worth stating plainly because the reflex on hearing "under
18" is to assume the payments design has to be redrawn.

### California taxes this product from 1 January 2027, and not before

**SB 122, signed 29 June 2026**, applies sales and use tax to prewritten
software and SaaS *"transferred on tangible media, transferred electronically,
or accessed remotely"*, from 1 January 2027. Until then California has not taxed
electronically delivered software. **Custom software stays exempt**, which is
worth remembering when Phase 3's bespoke sites are priced — they may not be the
same product as the subscription.

He is a California business selling to California customers, so **he has nexus
from his first sale** and the $40 becomes taxable on that date.

**This puts an expiry date on round 1's "merchant of record is premature".** It
was premature against a $100k-per-state nexus threshold he will not reach. It is
not premature against a statute with a date on it. **Stripe Tax calculates at
0.5% per transaction and monitors thresholds, but filing runs through outside
partners** — so Stripe leaves him registering with CDTFA and filing returns, at
seventeen, with a parent. **A merchant of record makes that obligation belong to
someone else for 84¢ per detailer per month.**

**Decision: start on Stripe, choose by November 2026.** California does not tax
it until January, Stripe is cheaper and simpler to build against, and he will
have few enough subscribers before then that moving them is an email. **After a
hundred subscribers, switching means every one of them re-enters a card**, which
is why this has a date rather than a "revisit sometime".

### His lock-in idea is the one thing here that had to be argued with

He proposed a twelve-month commitment paid monthly with an early-cancellation
fee, and an exit that runs through him: *"if they contact me, I could figure out
the best way."*

**California's Automatic Renewal Law as amended by AB 2863 (in force 1 July
2025)** requires clear and conspicuous disclosure of the auto-renewal **before**
billing information is taken, **express affirmative consent**, and
**cancellation in the same medium the customer signed up in** — and prohibits
contract wording that undermines a consumer's understanding of those rights.

**A term and a fee are not illegal. Making himself the only door out is.**

**And Family Code §6700 makes it worse for him than for an adult founder:** a
minor may contract *subject to the power of disaffirmance*, and the standing
rule is that adults contract with a minor at their own risk. **He has picked the
single hardest term to enforce, from the weakest position to enforce it.**

**So the recommendation is not "drop the commitment" — it is to get the same
twelve months from the other direction: discount the annual PREPAY.** This is
the plans research's own strongest finding turned around and pointed at his own
pricing: **money already taken binds structurally and needs no enforcement at
all.** *"Pay for the year, get two months free"* produces the same year, with
nothing to chase, no auto-renewal-law friction, and better cash — which is what
a business at this stage actually needs. **If he still wants the monthly
version, it is buildable; it needs the disclosure, the tick and a working cancel
button, and some fees will simply never be collected.**

### He was right about invoices, and the fix was already shipped

*"Am I thinking of invoices the wrong way?"* — because his old site's invoice
listed accepted payment methods **after** the customer had paid. **He is right
that it is odd, and 2.18 already fixed it here without anyone connecting the
two:** `invoiceEmail` branches on `payment_status` — paid gives *Receipt* and
*Paid in full*, unpaid gives *Invoice* and *Amount due* — and the file carries a
comment about the old behaviour, a *"document headed 'invoice' for money it had
already taken."*

**That sharpens stage 1 rather than changing it: the payment handles go on the
UNPAID branch only.** Printing them on a receipt would rebuild the exact thing
he finds weird about his own site — **which is the second time in two sessions
that his instinct about his own trade corrected a plan.**

### Two corrections he made to this research, both accepted

- **Resend: he has two domains, uses only his own, and sends all tenant mail
  himself.** So the one-domain limit is not the constraint and the earlier
  framing was wrong. **The real ceiling is 100 emails a day** — roughly twenty
  bookings across every tenant at five emails each — **and a rejected send is
  invisible**, because `sendTenantEmail` is best-effort so a booking never fails
  over an email.
- **Backups: his "make another Supabase account and back it up ourselves" is
  Supabase's own advice**, which tells free-plan projects to export with
  `supabase db dump` and keep off-site copies. Roadmap 2.22. **His "no problems
  in over a year" is true and is not evidence** — nothing has been under load and
  nobody else's customers have been in it.

### Recorded as his call, over the recommendation

**Non-payment takes the whole thing down**, public booking page included:
*"if they just stop paying, then yes, their site will go down."* The consequence
was named once and not argued: their customers' bookings already exist, and
those customers lose the page they cancel and reschedule from, so the calls land
on a detailer who is already having a bad week. **A grace period before the
public page goes dark costs nothing to build if he ever wants it.**

**And plans belong to a vehicle or a person at the DETAILER's discretion** —
his answer — implemented as **one nullable vehicle column on the plan member**,
so a detailer who thinks in cars and one who thinks in people are both right.

### The customer-accounts idea: good, one step early

He asked directly — *"tell me if this is a bad idea or not"* — about plan
customers signing in with Google, seeing their plan, cancelling, and a *"log in
or continue as guest"* choice on the booking page.

**Everything he wants from it comes from a link, and this product already leans
on that pattern twice:** `/booking/:id`, where the UUID *is* the credential and
every cancellation and reschedule already happens, and 2.12's quote acceptance
from an email. A **"your plan" link** carries what they are on, when they are
next due, a cancel button and a book button that brings the plan with it — **and
it satisfies California's same-medium cancellation rule for free.**

**The account is expensive for four reasons, in order of weight:** it introduces
**a second kind of human** into an auth system that holds only detailers and
staff, with the public booking page deliberately outside `BusinessProvider` and
2.13 having just finished making permissions coherent — the failure mode is a
customer reaching a dashboard; **"whose customer are they"** has no right answer
when one person uses two detailers on the platform, and a question with no right
answer usually means the feature is early; passwords are a permanent obligation
over names, phone numbers and addresses; and **"log in or continue as guest"
costs bookings**, against W16, the owner's own rule that a customer never fights
the form.

**It becomes right when a customer needs something a single link cannot
carry** — several vehicles, a year of history, an outstanding balance — and by
then the page exists, so **adding a login in front of it is much smaller than
inventing both together.**

## "Should I just start with Paddle?" — no, and the reason had not been checked

He asked whether to begin on a merchant of record so the sales-tax filing is
never his problem, and — the useful half of the question — **whether they also
do the Connect-style split so a detailer's money goes straight to the detailer.**

### They do not, and that reframes the whole question

**Neither Paddle nor Lemon Squeezy does marketplace payouts.** They are merchant
of record for *your own* product sales; splitting a payment and paying a third
party is precisely what Stripe Connect exists for, and they cannot match it.

**So money-through is Stripe either way.** The choice was never "Paddle or
Stripe" — it is **"Paddle AND Stripe, or just Stripe"**: two dashboards, two
webhook sets, two failure modes and two reconciliations, for a product whose
entire support desk is one person who is also in school.

### And Paddle may not accept the product he most needs to sell

Paddle's Acceptable Use Policy prohibits *"human services that are not related
to a software offering (e.g., pure consulting or advisory services…)"*. **His
$499 is building somebody a website by hand.** Whether that reads as related to
the SaaS — it is onboarding onto it — or as a prohibited human service **is
Paddle's judgment, not ours**, and their policy is silent on setup and
implementation fees.

**Being told after launch that the up-front product cannot be sold through the
payment provider is a worse day than filing a tax return**, which is the thing
the merchant of record was supposed to prevent.

### The tax benefit is small because he sells in one state

**This is what actually decides it.** A merchant of record earns its extra two
points when you are selling into forty states and twenty countries — dozens of
registrations, dozens of filing calendars, each with its own thresholds.

**He is a California business whose first customers are California detailers.**
From 1 January 2027 that is **one registration and one filing schedule** — the
simplest sales-tax situation that exists. **84¢ per detailer per month, forever,
plus a second payment system, plus a policy risk on his main product, to avoid
one state's returns is the wrong trade.**

**Decision: Stripe, and register with CDTFA when California's law starts.** This
sharpens round 2 rather than reversing it — the November review still happens,
but **the condition that would flip it is selling meaningfully outside
California**, not the calendar.

### The early-exit fee came back on, because his counter-argument was right

Round 2 recommended against it. He pushed back, and correctly.

He proposed Adobe's exact model — an annual term billed monthly, with half the
remaining months owed on early cancellation — and **the FTC sued Adobe over that
plan in June 2024.** The complaint is worth reading precisely, because **it is
not about the fee existing.** It is that Adobe **pre-selected the plan by
default**, **buried the commitment and the fee in fine print and hover-over
icons**, and **put roadblocks in front of cancelling.**

**So the fee is fine and the presentation is the entire risk**, which makes the
FTC complaint a build checklist: neither plan pre-selected, the term and fee in
the plan's own plain text at the size of the price, a separate explicit tick
(AB 2863 requires affirmative consent anyway), and a cancel button that stays
one click — the fee charged at that moment to the card on file.

**And his rebuttal of "you are badly placed to collect it" was right.** With a
card on file the fee collects itself; refusal is not the path. **What survives
is the chargeback** — a customer telling their bank the charge was unexpected —
**and the defence against that is the same disclosure list.** So the objection
does not disappear, it converts into a presentation requirement.

**Build month-to-month AND annual-paid-monthly, and keep the discounted prepay
as a third option.** He is right that a monthly-feeling commitment is a
different product from a lump sum, and *"guaranteed at least half the year"* is
a real answer to a real problem.

### His trade knowledge moved a build decision, for the second time in two sessions

*"They don't leave a client's house until it's paid… the amount of times someone
marks something finalized and it's not paid is, like, zero percent."*

**If that is right, the UNPAID invoice is a rare document and round 2's "put the
payment handles on the unpaid branch" was aiming at a page almost nobody sees.**
And his own old site had already solved it: `create-booking/index.ts:776` prints
*"Payments accepted: Cash, Cash App, PayPal, Venmo & Zelle"* **in the
CONFIRMATION email** — before the job, when it is useful.

**So stage 1 is the confirmation and the reminder, plus the unpaid invoice, and
never the receipt.** The first session found his old invoice was wrong; this one
found the confirmation was right all along. **Both corrections came from him
knowing his trade, not from the research.**

### Refunds, and one thing about his dad's account

**Setup fee non-refundable once work begins** — he is delivering custom work
against it and the work is front-loaded — **the current month is not refunded**,
and **the setup fee and the exit fee are two separate arguments.** *"They
already paid for the website"* justifies keeping the setup fee; it does not
justify the remaining months, which is what the term is for. Merging them makes
both weaker. A written policy is a floor, not a cage: he can always refund
someone anyway, and what the policy buys is winning the dispute when he does
not.

**And one thing said once rather than repeated:** *"technically it's my dad that
signed up"* is the normal arrangement and exactly what Stripe asks for — **and
it means his dad is the business** for chargebacks, refunds and the 2027 CDTFA
registration. He should know what he is agreeing to, not just sign it.

### One small thing ships beside the free Resend plan he is keeping

He is staying on the free tier for now and is probably right that twenty
bookings a day across every tenant is not this year's problem. **The addition is
not capacity, it is visibility: make a rejected send show up somewhere he
looks.** A booking never fails because an email did — that is deliberate — so
the cap being hit produces no symptom until a customer says they never got their
confirmation. **Staying on the free plan makes this worth more, not less.**

## Selling nationwide, and an idea that had to be refused

Three things arrived together: he sells across America and deliberately not
locally, he needs his own dashboard, and he had an idea for recognising
returning customers.

### The reasoning under the Stripe decision broke, and the decision held anyway

> *"I'm primarily gonna be selling anywhere in America. I'm not thinking of
> selling in California… if I sell in California, that could potentially be my
> competition."*

**Round 3 argued against a merchant of record partly because "he sells in one
state, so the tax is one registration and one return." That premise is now
false, and it is marked rather than rewritten**, because a reader who finds the
conclusion without the correction will trust reasoning that no longer applies.

**What replaces it.** Two nexus thresholds matter, and **the one that bites is
transactions, not revenue**: $100,000 into a single state is ~208 subscribers at
$40/month, but **200 transactions is about 17 subscribers**, since each monthly
charge is a separate sale and seventeen customers billed for a year is 204.

**Three things keep that from being alarming.** **17 states and counting have
eliminated the transaction test** — Alaska, Utah, Illinois, Kentucky among them
— **roughly 14 to 20 still apply it**, and **SaaS is taxable in only about 26
states** at all. **So the real variable is CONCENTRATION rather than reach.** A
hundred customers spread two per state trips nothing. Forty in Texas is a
registration.

**And California inverts.** He has physical-presence nexus because he lives
there, but **nexus only matters where there is a sale** — avoiding California
customers avoids California sales tax entirely, even after SB 122. His
*"Northern California is fine"* means a few, taxable from 1 January 2027.
**California income tax on the business is owed regardless and is a different
tax; conflating the two is how this gets confusing later.**

**The decision survives on the two structural reasons, which have nothing to do
with tax**: no merchant of record can pay the detailers, so Connect is Stripe
regardless; and Paddle's acceptable-use policy may refuse the $499 hand-built
website. **What changes is that the tax exposure is now worth instrumenting
rather than ignoring: Stripe Tax at the first out-of-state sale**, 0.5%, chosen
not for the calculation but because **it monitors nexus per state and warns
before a threshold is crossed** — an invisible, creeping legal exposure turned
into an alert.

**And the merchant-of-record question is re-opened with a trigger instead of a
date: three or more state registrations, or a warning about a state he has never
filed in.** Before that the extra 84¢ per detailer per month buys nothing.
After it, it buys the only thing it was ever for.

### "Type your email and it shows you" is address enumeration

He asked for a way around customers forgetting their booking link, and proposed
that typing an email address bring up their details and plan.

**Built as described, anyone can type any address** — a neighbour, an ex, a
competitor — and learn whether that person uses this detailer and what they pay.
**It is the kind of defect that is obvious only once it is live.**

**The safe version is one word different: email IN, LINK OUT.** They type an
address, we email them their link, the page displays nothing, and it says the
same thing whether or not the address belongs to a customer. **This is not a new
mechanism — it is a third caller of the pattern this product already relies on
twice**: `/booking/:id`, where the UUID *is* the credential and every
cancellation already happens, and 2.12's quote acceptance. **The same link round
3 chose over customer accounts.**

**And the cheapest ninety percent of what he wanted needs no lookup at all: let
the BROWSER remember.** Most people rebook on the phone they booked on. Remember
the last customer's name, email and phone on that device, pre-fill the contact
step, and **if that customer is on a plan we know it before they type
anything** — which is the "auto-detect" he was describing. It fails safely: a
new device behaves exactly as today.

**Moving the contact step to the front was declined as a default**, and the
reason is measurement rather than taste: **the step budgets were measured**
(2.7 and 2.8c; the binding screen is 1440x900 with 10px of spare room on step
1), **so a reorder means retaking every one of them** — and asking for a phone
number before showing a price is the order that makes a stranger close the tab.
**Show recognition at the top of step 1 instead.** If he wants the reorder
anyway it is his product, but as a deliberate item with the budgets re-measured,
not as a side effect of the plans build.

### His own dashboard was already in the plan, and is now specified

*"I need to have a dashboard myself where I can manage all of the detailers…
I don't really know what features I need."* **It is roadmap 4.4**, which he had
not seen — reasonable, for something in Phase 4 of a 3,700-line file. Specified
in `docs/platform-admin-2026-09-04.md`.

**The test that decides every screen in it: what will he otherwise do by hand,
at 11pm, with a SQL query, while a detailer waits on a text message?** Anything
that fails that test is a dashboard for looking at, and those rot.

**Three findings worth keeping out of the spec and here:** *open their dashboard
as them* is the single biggest time-saver in any back office **and must be
logged every time**, because it is also the action that will look worst if it is
ever questioned; **the completeness signal already exists** in `lib/setup.js`'s
seven-step progress and inventing a second one is how two numbers start
disagreeing; and **the item should split rather than wait** — suspend rides
along with 2.20's billing, the list follows when he can no longer hold his
customers in his head, and the site columns wait for Phase 3 because that is
when there are sites.

### Pricing, and one change made

**Three ways to pay**: month-to-month (new, and **the most expensive, because he
carries all the risk**), annual-paid-monthly (**today's $40 founding / $60
list**, gaining the term and the fee), and annual-paid-up-front (**already on
the page as `PRICING.annual`**). The only new number is month-to-month, where a
20–30% no-commitment premium gives $49 founding / $79 list with his own
ends-in-9 preference applied. **Annual-paid-monthly is the visual middle and
still not pre-selected** — pre-selection is the first thing the FTC named in the
Adobe complaint.

**And the setup fee is $999, done this session on his instruction** — *"things
that end in ninety nine feel more professional to me."*

## Pricing, the legal setup, and being told to stop re-opening a closed decision

### The correction that matters most is about how decisions are handled

> *"Why do you keep mentioning Paddle? Aren't we just sure on Stripe?"*

**He is right and this is the transferable part of the whole exchange.** The
merchant-of-record question was decided in round 3, then re-opened in round 3's
own conclusion with a "November review", then re-opened again in round 4 with a
"concrete trigger". **Each re-opening was defensible on its own and the effect
was that he read the same argument three times and concluded nothing had been
decided.**

**The rule: a session that finds a reason to reconsider a settled decision
records it in the file and keeps working. It does not put the choice back in
front of him.** A decision reopened without new information is not diligence, it
is the cost of diligence with none of the benefit. **The Stripe answer is shut**,
and the two reasons behind it are structural rather than circumstantial: no
merchant of record can pay the detailers, and Paddle's acceptable-use policy may
refuse the $499 hand-built website.

### He is charging too little, and the fix is not a smaller number

`docs/pricing-2026-09-04.md`. He asked whether $999 was right and whether he
should charge less to make it feel like a good deal.

**Against the field, $999 is at the bottom.** A custom site is **$500–$5,000**
from a freelancer, **$2,000–$8,000** for anything professional, **$10,000+**
from an agency. **$60/month is below Housecall Pro's $59 for software with no
website at all**, and **ongoing upkeep of a custom site benchmarks at $50–$200 a
month on its own** — more than his entire monthly fee.

**So going lower would not make it a better deal, it would make it a less
credible one.** A detailer comparing a $999 quote against a $3,000 agency quote
reads a very low number as a difference in seriousness, and he has no case
studies yet to argue otherwise. **What makes it feel like a good deal is the
comparison being visible on the page** — and **his actual differentiator, that
he edits their site whenever they ask, is currently almost invisible.** Nobody
else in the comparison table does that at any price.

**Raise the list price after three sites exist to point at.** That is a decision
with evidence; today's would not be.

### The annual price was already textbook and nobody had noticed

$60 × 12 = $720; the annual plan is $600; **the saving is $120, which is 16.7%
— exactly two months free.** The industry-standard SaaS annual discount is
**15–20%, most commonly 17%, framed as "2 months free"** — below 15% moves
nobody and above 30% signals the monthly price was inflated.

**He landed on the standard by accident, so the number does not change. The
words do:** *"2 months free"* converts better than *"save $120"* or *"save
17%"*, because a month is easier to picture than a percentage.

### Three founding spots

One is an anecdote rather than an offer — no urgency, and he cannot say
"our founding customers" about a single person. **Three buys three references,
three genuinely different sites for the portfolio the list price depends on, and
covers the platform's ~$45/month of fixed costs.** It is also already the
database default, and the count is computed rather than typed, so nothing has to
change. **When the third goes, the offer closes** — raising the cap quietly is
visible on the page and somebody will notice.

### The best sales-tax tool is his calling list, not software

`docs/legal-and-tax-2026-09-04.md`. He asked whether tax could be automatic and
which states to skip, and **those turn out to be the same question.**

**SaaS is taxable in 26 states and untaxed in about 25 — and because he
cold-calls, he chooses.** A calling list of Florida, Georgia, North Carolina,
Michigan, Missouri, Virginia, New Jersey and Nevada means **nothing to
calculate, nothing to register, nothing to file, anywhere.** Not less paperwork.
None.

**The safety net is free: Numeral's nexus monitoring has no time limit** and
warns as a state's threshold approaches — which is precisely what he asked for
(*"is there any way I could just track it automatically"*). **Stripe Tax (0.5%)
only goes on when a state actually needs it**, and filings are ~$75 each.

**California is the one state that creates an obligation immediately** — he
lives there, so nexus is automatic, and SB 122 makes SaaS taxable on 1 January
2027. **That agrees with the reason he already had for skipping it: a California
detailer is a competitor.** Two independent reasons pointing the same way is
usually a decision.

**And the guardrail against over-optimising: never turn away a good customer
over sales tax.** It is collected FROM the customer and costs him only
paperwork. **Prefer the untaxed states when choosing who to call; accept anyone
who says yes.**

### Sole proprietorship, not a California LLC

**A California LLC is $70 to file and then $800 every year in franchise tax,
regardless of revenue or activity — and the first-year exemption expired in
2024.** Founding-year revenue at three customers is about $1,440. **The fee
would take more than half of it.**

**And the decision is not really his.** His dad owns the payment account, so his
dad already carries the liability an LLC would limit. **It is his dad's call,
and it should be made before the first paying customer rather than after.**

**If they do form one, the under-18 part has a standard answer**: California's
LLC law sets no minimum age for a member or organizer — unlike Texas — and **the
real obstacle is contracts**, since a minor's signature does not reliably bind.
The fixes are a multi-member LLC with the parent signing, a manager-managed LLC
with the parent as manager, or a filed statement of authority.

### Two things he asked for already existed

**Resend already emails at 80% and 100% of quota, on every plan**, so the
alerting half of that item needs no work — what is left is the narrower case of
a send rejected for some other reason, which no quota alert covers. **And his
own admin dashboard was already roadmap 4.4**; he had simply never seen it,
which is fair for something in Phase 4 of a 3,700-line file.

### And the writing failed him once

> *"You said that you insist on the impersonation gets logged every time. I have
> no idea what that means. I have no idea what this whole paragraph means."*

**That is CLAUDE.md's first rule being broken** — plain language, define the
term the first time. The paragraph was written for the next agent and handed to
the owner unchanged. **Both versions are kept in the roadmap now**, the precise
one for whoever builds it and a plain one underneath, because deleting the
technical version would cost the build and deleting the plain one repeats the
mistake. **The reference
rendering still shows $900 and that is correct**: it is a snapshot of what he
approved on 2026-08-30, not a live surface. `PRODUCT.md` now says to read the
price from `pricing.js` and never from that file, because the design system's
"where they disagree, the page is right" rule is about DESIGN and would be
actively wrong applied to a price.

## The setup checklist, and the LLC advice reversing on one fact about Stripe

He locked the pricing — *"I like that pricing. Lock all that in."* — and asked
for the legal side as something he could actually follow: *"go here, click these
links, this is what I have to do, this is why. Because I've never done this and
I don't know any of it."* That is `docs/setup-steps-2026-09-04.md`.

### The fact that reversed a recommendation

**A Stripe account cannot move between legal entities.** Within the same entity,
ownership transfers to a new individual — invite them as an Administrator, then
transfer in Business settings. **Between entities, Stripe almost always requires
a new account.**

**So the two structures are not "cheap versus expensive". They are "one document
versus a migration."**

- **Sole proprietorship in his dad's name:** on his 18th birthday the business
  becomes a different legal person. New EIN, new bank account, **a new Stripe
  account with every subscriber re-entering their card**, a new city licence,
  and customer agreements re-signed.
- **LLC with both of them:** his dad assigns his membership interest. **Same
  entity, same EIN, same bank, same Stripe account, same subscribers, nothing
  re-signed.**

**The earlier "sole proprietorship, skip the LLC" was decided on the $800
California franchise tax against ~$1,440 of founding-year revenue, and that was
the wrong comparison.** The right one is what asking fifty subscribers to
re-enter a card costs in cancellations — **which is exactly the cost used, two
exchanges earlier, to argue against ever switching payment providers. The same
argument was available and was not applied to the structure question.**

### Which produced the question nobody had asked

**Step 0 of the checklist: how many months until he turns 18?**

- **Under about six:** wait. Keep building, do not launch paid subscriptions,
  set everything up in his own name the week he turns 18. **No LLC, no
  dad-entity, no handover ever** — and the product is not finished anyway.
- **Longer:** the LLC is probably worth it, and it is a CPA question rather than
  a table.

**Neither answer wastes anything** — the licence, the EIN, the bank account and
the tax monitor are identical in both worlds.

### His Lakewood experience was correct, and it applies here too

He had been told he could not get a business licence for his detailing business
because of his age, and assumed it might be different for something online.
**It is not.** Lakewood's municipal code requires the applicant — **and "the
manager or other person principally in charge of the operation"** — to be over
eighteen. **His dad applies and is named as the person in charge.**

**And the city asks you to phone before it hands over an application**, which
makes **one five-minute call the fastest way to confirm every assumption in that
document.** The number is in the checklist.

### Stripe Tax, answered precisely

He asked whether it is automatic or something flipped on per customer. **It is
one switch for the account, not per customer. Once on it reads each customer's
address by itself. But it only charges tax where a REGISTRATION has been added,
and returns zero everywhere else.**

**So a detailer in Texas signing up tomorrow is charged $0 in tax, and that is
correct** — he is not registered in Texas and is nowhere near its threshold.
**The guidance he needed was "take the customer"**, and a registration only ever
happens after the free monitor warns that a threshold is close.

### The most urgent item is about the other business

He mentioned in passing that he makes around **$2,000 a month detailing**. **That
is self-employed income well past the $400 self-employment-tax threshold, and
being under 18 exempts nobody.** So the first question for the CPA is not about
this product at all. **Recorded because it arrived as an aside and would
otherwise die with the conversation.**

### Shipped in the same session

**The annual line now reads "2 months free"** instead of "$120 less than paying
monthly". The saving is unchanged and is the industry-standard 16.7%; only the
framing moved, because a month is easier to picture than a subtraction.
**Still derived from the config**, so it cannot go stale, and **`landing-pricing`
grew two checks that pin the claim**: the saving must be a **whole number of
months**, and the discount must sit inside the **15–20% band**. **Baselined by
setting `annual: 610`, which makes the page advertise *"1.8333333333333333
months free"*** — a defect that reads like a rounding bug and is actually a
pricing one.

## The pricing page, and his "set it up right" idea turning out to be mostly correct

### The plan buttons should not land on a signup form

> *"When you say take founding spot, that shouldn't bring you to a sign up or a
> payment screen. That should take you to a pricing page… it shows basically all
> my options and all the different things, and they click the one that they
> want."*

**Right, and for a reason that got stronger the moment the pricing structure
grew.** The landing page's plan buttons currently go to
`/app?plan=website&offer=founding` — a signup form. **A customer who has not yet
chosen between three ways to pay is not ready for a form**, and once
month-to-month, annual-paid-monthly and annual-up-front all exist, the landing
page cannot carry them without becoming a pricing table pretending to be a hero
section.

**And the page is not decoration in front of the checkout — it is the legally
load-bearing half of it.** California's AB 2863 requires the auto-renewal terms,
the twelve-month commitment and the early-exit fee to be **clear and conspicuous
before billing information is taken.** That is this page. Neither plan
pre-selected — the first item in the FTC's Adobe complaint — and an explicit tick
before payment.

**He is also right that the landing page's annual line becomes redundant once it
exists. The ORDER is the part worth writing down: the line stays until the page
ships.** Removing it first would delete the only place the annual option is
mentioned, in exchange for nothing.

### His structure instinct was sound, and it survives checking

> *"I feel like there's gotta be a way that I don't need an LLC but I could
> transfer stuff over to me. I just have to set it up right — like, I don't set
> it up as my dad being there, but for the things that need his age, I do it."*

**That is the correct strategy and most of it works.** The list of things that
genuinely require an adult is shorter than it looks:

- **Being a sole proprietor: no minimum age.** It can be his.
- **An EIN: the IRS sets no minimum age either.** A parent is named as
  *responsible party*, which is **a role on a form, not ownership**, and it can
  be changed later without re-issuing the EIN.
- **The Lakewood licence, a bank account, and Stripe: an adult is required.**

**So three roles, not a whole business, and at 18 those three come off.**

### Which reduces the entire LLC question to one free support ticket

**Stripe's published wording is *"a legal guardian must assume the role of owner
of your account"*, and their documentation says nothing about turning 18.** That
single ambiguity is the whole decision:

- **Legal entity is HIM, guardian attached** → 18 removes the guardian, the
  account continues, **the LLC is unnecessary and the $800 a year is saved.**
- **Legal entity is his DAD** → 18 means a new account and every subscriber
  re-enters a card, and the LLC earns its fee.

**So it is asked, not guessed** — the exact wording to send is in
`docs/setup-steps-2026-09-04.md` — **and it is asked BEFORE the account is
opened**, because that is the one ordering mistake here that cannot be undone
cheaply. **This is the same shape as every good finding in this project: the
expensive decision turned out to rest on one checkable fact, and checking it is
free.**

### And he was right about Stripe Tax

> *"Should I turn on Stripe Tax from the start? There's no point in not having
> it on."*

**Confirmed from Stripe's own pricing page: fees are incurred *"only for
transactions in jurisdictions where you have an active tax registration."***
**With no registrations it costs nothing**, there is no monthly minimum, and
there is no charge for merely having it enabled.

**So it goes on with the first subscription and is never thought about again** —
which is exactly what he has been asking for since he first raised tax: not a
cheaper answer, an answer he cannot forget to apply.

## 2 December 2026 is the date the whole plan turns on, and it is his birthday

He answered step 0 of the setup checklist: **he turns 18 on 2 December 2026**,
three months out.

### It collapses the structure question rather than answering it

Every branch of the LLC-versus-sole-proprietorship argument existed because the
business would have to start in his dad's name and later become his. **At three
months' distance it does not have to start in anybody's name.**

- **No LLC.** The $800 a year was buying a clean handover; there is no handover.
- **No guardian on Stripe.** A guardian only exists if an account is opened
  before 18, so **the support ticket the setup file opened with is moot.**
- **No licence or EIN in his dad's name**, and no form later to undo either.

**He worked most of this out himself**, and one detail he got right is worth
keeping because it is the kind of thing that sounds risky and is not:
**changing the payout bank account on a Stripe account is a settings change.**
It touches no customer, no subscription and no stored card. *"I just set it up on
my Stripe account as a new bank account and set it to go there"* — correct.

**And the build is unaffected**, which is the part that makes waiting free:
**Stripe test mode needs no activated account and no verified identity**, so the
entire payments integration can be written and tested now, with activation the
week of the 2nd.

### The estimate, measured rather than guessed

`docs/timeline-2026-09-04.md`. **From git history: eleven consecutive days
(25 August – 4 September), 214 commits, 104 of them touching `app/`,
`supabase/`, `scripts/` or `tests/`.** Roadmap: **28 items closed, 23 open.**

**The repository's first 137 commits are from January and February and are the
Emergent scaffold this project was converted from — not this work.** Anyone
measuring from the initial commit gets an eight-month project instead of an
eleven-day one.

**Remaining before he could sell: 18–27 sessions**, sized item by item rather
than counted, because item size varies from an afternoon (2.16, closed unstarted)
to four days (2.11).

| Pace | Software finished |
|---|---|
| The last eleven days continuing | late September |
| Realistic with school and detailing | mid-to-late October |
| A slow stretch | late November |

**All three land before 2 December.** **So the software is not the constraint.
His birthday is**, and the first sales call is realistically **the week of
8 December**, once the December setup week is done.

### What the slack is for, and it is worth more than the features it displaces

**Phase 5 — his own detailing business on the platform, running in parallel.**
It needs no legal setup, costs nothing, and is **the best bug-finder in the
plan**: real customers, real money, every day. Five to six weeks of it means
that on the first cold call he is selling a product he has used daily since
October, with a month of real bookings behind it. **That beats any feature still
on the list.**

He asked not to count his own testing, which is fair — **but the gap between
"software done" and "legally able to sell" exists regardless.** The only choice
is what fills it.

### The risk that is easiest to forget

**The discovery rate has not slowed.** The same eleven days turned up a
white-screen crash live on `main` for four days, an invoice column that had never
added up, eleven email headlines under the contrast floor, and a booking page
double-bookable in one configuration. **None of those were on any list
beforehand, and there is no reason to think the next eleven days find nothing.**
The estimate above contains no allowance for them, which is why the middle
scenario rather than the fast one is the one to plan against.

## Roadmap 2.14, step 2 - the plans a detailer logs

Step 1 was the research (`docs/plans-research-2026-09-04.md`, four rounds). This
is the first code. **The owner decided the shape himself** and it is worth
restating before anything else, because every decision below falls out of it:

> *"we need a way for the detailer within the app to log this customer as a
> monthly plan, and they could set all the settings - if it's weekly, biweekly,
> monthly, which tier it is, or if it's a percent discount, if it's a bundle."*

**The plan is LOGGED. It is never sold by us and never billed by us.** We take
no money, so there is no card, no charge, no dunning and no status implying one.

### What shipped

- `supabase/migrations/20260904002000_plans.sql` - `plans`, `plan_members`,
  `plan_visits`, `bookings.plan_member_id`, an auto-link trigger, an accrual
  function and a nightly `pg_cron` job.
- `app/src/lib/plans.js` - the arithmetic, no React in it.
- `app/src/screens/more/Plans.jsx` - the settings screen, thirteenth of
  thirteen, on Business under *What you sell*.
- `tests/plans.test.mjs` - 51 checks, baselined both ways.
- `scripts/seed-demo.mjs` - three plans and four members, and the grants come
  from the real accrual function rather than hand-written rows.
- `scripts/sweep-widths.mjs` - the row, and **both of its forms**, which are
  the ninth instance of the same gap and the first time it has been added in
  the change that built the screen rather than in the item that finds it broken.

### Six plan shapes, four fields, one table

The research found six shapes across ten real detailers' plan pages, and the
useful finding was that **they are not six features**. Every one falls out of a
cadence, what is included, how it is priced, and whether there is a term:

| Shape | How it is expressed |
|---|---|
| Frequency plan | a cadence, one visit |
| Visit bundle | a cadence, `visits_per_period > 1` |
| Tiered membership | several plans with different names and prices |
| Prepaid block | `price_kind = monthly` plus `term_months` |
| Discount membership | **no cadence at all**, `price_kind = percent_off` |

**Cadence is a count and a unit, not a list.** The sample uses weekly through
annual and Tang advertises *"custom schedules - just ask"*; a drop-down of four
would be wrong for somebody. **Both columns NULL is a real answer**, not a
missing one - a member rate with no schedule is two of the ten pages.

### The decision that mattered: where the two halves of the ledger live

The owner's own non-negotiable, from round 2: *a member has a ledger of visits
owed and used*, or adding billing later is a rewrite. The obvious build is one
ledger table with `granted` and `used` rows. **It is the wrong shape, and the
reason is a fact about this codebase rather than about ledgers.**

- **OWED is rows** - `plan_visits`, append-only, `delta` rather than a count so
  a skip is a row instead of an edit. Nothing is ever updated, which is what
  makes it something a charge could be posted against later.
- **USED is a column on `bookings`** - `plan_member_id`. **Because cancellation
  already works there.** Twelve places in this codebase ask
  `status <> 'cancelled'` and every one of them is already right about a plan
  visit that was called off. A `used` row in a ledger would have needed a
  thirteenth rule, and a compensating `+1` row that somebody eventually forgets
  to write.

`tests/plans.test.mjs` pins that directly: a cancelled booking gives the visit
back, and a soft-deleted one does not count either.

### Pause is a DATE, not a flag

`plan_members.accrue_from` exists separately from `started_on`, and the
distinction is the whole of pause. Accruing from `started_on` would **backfill
every visit the pause was supposed to skip** the moment the member came back -
the opposite of what pause means to the customer who asked for it. Resuming
moves `accrue_from` to today; nothing else touches it.

Pause and skip are here at all because **the trade does not use contracts and
advertises against them** - six of ten sampled plan pages sell "no contracts,
cancel anytime" as a feature, and we could not enforce a penalty anyway.
`term_months` records what was agreed and nothing acts on it.

### Three things in the schema that are not obvious from reading it

1. **`on delete no action`, not `restrict`, on `plan_members.plan_id`.** Both
   refuse to delete a plan somebody is on. But deleting a BUSINESS cascades to
   both tables in one statement, in an order Postgres does not promise -
   `restrict` is checked the instant the row goes and errors; `no action` is
   checked at the end of the statement, by which time there are no orphans.
   `seed-demo.mjs` deletes the demo business on every single run.
2. **The auto-link is a TRIGGER because there are three writers** - the public
   booking page, the dashboard's New booking modal, and the seed - and a rule
   that lives in one of them is a rule the other two break. **Its imprecision
   is stated rather than hidden**: a member who books something the plan does
   not cover has that job counted against the plan, because `booking_services`
   rows are written AFTER the booking and a BEFORE INSERT trigger cannot see
   what was bought. The correction is a human one and it exists.
3. **`plan_members_one_live` is the one line that assumes a plan belongs to a
   PERSON.** Research section 6 says it belongs to a VEHICLE - Visual prices
   "per vehicle each visit" - and `customers` has no vehicles. When they
   arrive, **that index is what moves**, and nothing else in the file cares.

### Permissions: no new key, and this is the one thing put to the owner

`plans` writes ride `settings` (a plan is an offer with a price, which is
exactly the test `20260904001000_catalog_behind_settings.sql` applied to
services). `plan_members` and `plan_visits` ride `money` (what somebody pays,
which is exactly what `can("money")` already hides on Clients).

Adding a fifth key means editing a check constraint on two tables,
`permissions.js` and the Team screen - and roadmap 2.13's own rule is that
every permission names a group of policies that predated it. **So no key was
added on a guess, and the pairing is the open question for the owner.** The
demo's "Detailer" role has `settings` but not `money`, which is a live example:
they can define a plan and cannot log who is on one.

### What `composition` caught, and it was a design error rather than a rule

Both lists were cards. **A card is for a small set of objects you act on one at
a time, and a member list grows with the business** - the same failure as
Calendar's eighteen `BookingCard`s. They are ruled rows now (`.rows.cols`, the
Clients grammar), with **one editor open at a time replacing the list** rather
than opening inside a row, which also means no card is ever mapped over. No
allowance was added to the test.

### Two defects that only LOOKING found

Neither is reachable by any check in this repo, and both came out of the 1920
and 1440 screenshots:

- **The member editor never named the person it was about.** The customer
  picker only renders while logging somebody new, so editing an existing member
  was five controls about a nameless person.
- **"No plans yet. Most detailers start with one..." was painted before the
  first read returned.** It is the "a failed read must not look like an empty
  business" rule one state earlier - **the same sentence is equally untrue
  while loading**, and a detailer with three plans met it on every open.

One more came from 320: the "how often" number box was squeezed to about 40px
by its own flex row and its digit disappeared behind the padding. A control
showing nothing at all, on the width PRODUCT.md promises.

### What step 2 deliberately does not do

The customer's half - the plan buttons on the booking page, the welcome-back
line at the top of step 1, the remembered browser, the "your plan" link and the
email nudge - is **step 3**, and it is separate for a reason rather than for
length: all of it lands on the booking page, whose per-step budgets are
**measured** (roadmap 2.7 and 2.8c, binding screen 1440x900 with 10px spare on
step 1). It is one item's worth of work with its own instrument
(`sweep-booking-steps.mjs`) and its own tie-out (`booking-engine` test 17,
because **a plan price shown and not charged by `computeQuote` is the
travel-fee defect for the third time**).

### The owner asked whether a detailer is locked into a kind of plan, and one shape could not be said

He read the screenshots and asked the right question:

> *"I just wanna confirm... the person able to customize the monthly plan
> however they want. If it's, like, a package that has a set set things that
> come with it, if it's, like, set price, if it's a percent off, if it's,
> like, a... if there's tiers to it... We're not locked into a certain type of
> monthly plan. Right?"*

**It was answered by putting eleven real plan shapes into the demo and
LOOKING**, rather than by reading the schema back to him — tiers
(Silver / Gold / Platinum), a prepaid year, a weekly two-visit fleet plan, an
annual coating check-up, a quarterly, an every-five-weeks-three-visits, and the
three already seeded. **Ten of the eleven rendered correctly and one printed a
lie.**

**A PREPAID BLOCK HAD TO BE ENTERED AS A MONTHLY PRICE**, so *"$1,999 for the
year"* came out as **"$1999.00 a month"** — neither what the detailer means nor
what the customer pays. It is one of the six shapes the research itself found
(CarDetailing2Go's yearly tiers, Deluxe's prepaid credits that *"never
expire"*), and step 2 had shipped without it because `price_kind` was written
from the three shapes that appeared most often.

**The fix is one value on an axis that already existed**, not a column:
`price_kind` gains `'total'` (`20260904003000_plan_price_up_front.sql`), the
segmented control goes to four options — which is exactly `controls.jsx`'s
stated ceiling — and `priceWords` gains a branch.

**The other three shapes he named were already there, and it is worth writing
down which mechanism carries each**, because the answer is not obvious from the
form: a **package's contents** are the plan's own description in the detailer's
words; **tiers** are several plans, which is how five of the ten sampled
detailers actually publish them; a **percentage** is `percent_off`.

**A SECOND DEFECT CAME OUT OF THE SAME ELEVEN ROWS: the term was printing
nowhere.** A twelve-month commitment is a property of the OFFER, and the row
that lists what you offer did not carry it — it had been dropped when the
member count moved out of the figure column. `termWords()` says it in the words
a person uses ("1-year term", not "12-month term") and it sits before the
member count, because the count is usage rather than offer.

**`term_months` IS STILL SEPARATE FROM `price_kind` AND MUST STAY SO.** A
prepaid year is usually a twelve-month term, and collapsing the two would be
tempting — but a detailer can sell a prepaid block of ten visits with no end
date, and **"paid up front" is a fact about the money while a term is a fact
about the commitment.** Merging them makes one of the two unsayable, which is
the exact defect this entry exists to record.

**FOUR HONEST LIMITS SURVIVE, and none of them was hit by the eleven shapes:**
a customer can be on **one plan at a time** (`plan_members_one_live`, the index
that assumes a plan belongs to a person rather than a vehicle); a bundle of
**different kinds of visit** — CarDetailing2Go's *"1 Diamond + 1 Gold"* — is
described in words while the count is just "2 visits"; **price by vehicle size**
is not a plan field, though it needs no field today because a member's price is
snapshotted and editable, so the detailer types the right number per person;
and **what's included is prose**, not a link to catalog rows —
`included_service_ids` exists on the table with no UI, because the thing that
needs it is step 3's booking-page button.


## Roadmap 2.14, step 3 - the customer's half of plans

Step 2 gave the detailer a plan to define and a member to log. This is what a
CUSTOMER meets, and all of it lands on the booking page — which is why it was
a separate step. **Everything below was decided against a measured number
rather than a preference.**

### The constraint that shaped every decision

**Step 1 has ten pixels of spare room at 1440x900** (`sweep-booking-steps.mjs`,
roadmap 2.7 and 2.8c), and that spare room is the DETAILER'S — their seventh
service is what spends it, not our seventh idea. Round 4 of the research said
so explicitly and the owner approved it. So the question for every part of this
item was not "where does this look best" but "what does it cost in pixels", and
three answers came out of that:

1. **The plans live on a page of their own** — `/book/:slug/plans`. It is also
   what the evidence says: 7 of 7 sampled detailers publish plans on a
   `/membership` page and 5 of 6 products keep a plan beside the flow. A plan
   section inside step 1 would have been over the bottom of a laptop before a
   detailer had written a word.
2. **The door to it rides a row that was already drawn** — the line the
   progress rail and *"Step 1 of 7"* share. It appears on step 1 only, because
   somebody on step 5 has decided and offering them a plan there is a way out
   of a form they are most of the way through. **It cost 3px on its first
   measurement** — a 13px link in a row whose height was set by 11px type — and
   the line box is pinned to 13px with a padding/margin pair for the touch
   target, which took it back to zero. *A control that is free in principle is
   not free until it is measured.*
3. **The recognition the owner asked for is spent on two lines that already
   exist.** He asked for a welcome at the top of step 1 — *"a welcome message
   would be cool"* — and a new line there is 39px on the tightest screen in the
   product. Step 1's HEADING is one line either way and is the top of the step:
   it becomes *"Welcome back, Marcus"* for a device we remember, or *"Let's set
   up your Bi-weekly maintenance"* for somebody who pressed a plan button.
   The price bar's eyebrow — already a drawn line — says *"Bi-weekly
   maintenance applied"* in place of *"Estimated total"*, which puts the plan's
   name beside the number it moved, the strongest place in the product to make
   a price promise.

**Every step's spare room is identical to before the item**: 10px on step 1 at
1440x900, 47px at 392x844, and so on down. The plan-attached step 1 has 25px at
392 (its heading wraps to two lines) and the same 10px at 1440.

**THE NAME WINS WHERE THERE IS ONE.** The heading has three states and the
owner's own sentence is the third: *"Welcome back, Marcus — your Bi-weekly plan
applies"* is the NAME in the heading and the PLAN in the price bar, not one or
the other. A stranger arriving straight from a plan button has no name, so they
get the plan — the only half of that sentence that is true of them.
`sweep-booking-steps.mjs` walks all three, because a returning member is the
ordinary case for this whole feature and it must not be the unmeasured one.

### The price: one function, and it rides a rail that already exists

**`planLineFor` in `_shared/pricing.ts` is the only thing in this product that
knows what a plan does to a price**, and `computeQuote` pushes its result into
`adjustmentLines`. That is the whole integration.

**A `plan_discount` column was the obvious build and it is wrong.** The plan
discount has to appear on the review step's receipt, in the confirmation email,
in the reminder, on the manage page, on the invoice, in the accountant export
and in `bookings.price_adjustments` — nine render paths, of which a new field
would have reached eight. `price_adjustments` is a labelled amount that every
one of them already draws, and it is the same rail `accept-quote` lands a quote
difference on.

**The rule, and it is stated because what a plan covers is prose:**

| `price_kind` | what it takes off |
|---|---|
| `percent_off` | that percentage of the WHOLE job — that is what *"10% off every visit"* says on every plan page in the sample |
| `per_visit` | brings the SERVICES to the plan's rate; never adds, so a plan rate above the list price takes nothing off |
| `monthly` / `total` | the services are already paid for, on the month or up front |

**Add-ons and travel are always extra.** The plan governs the services it is a
plan for. The imprecision is real and named: `plans.description` is prose, so
this cannot know a member's wash plan does not cover a ceramic coating. The
correction is the same human one the auto-link trigger already relies on — and
it is why the next decision matters.

### A sign-up is a request, in either booking mode

**Pressing a plan button ends as a `pending` booking even for a business whose
ordinary bookings confirm themselves.** The research's opening finding is that
the sale and the schedule are two acts and nobody joins them — five of the
seven sampled detailers set a new member up by TALKING to them — so asking to
join is a thing somebody has to agree to. It is also the honest reading of the
price: the plan rate on that quote is only true once the detailer agrees the
customer is on the plan.

**An existing member booking their own covered visit is NOT a sign-up and must
not be held up.** That is the only reason `create-booking` asks the database
whether this customer is already an active member of this plan rather than
keying off `plan` alone. `tests/booking-engine.test.mjs` test 18 pins it on a
reserve-mode business, which is the assertion that fails if somebody
"simplifies" it back to the mode check.

### Email in, link out — and why his own version was not built

He asked for *"they just type in their email and it'll automatically show
them"*. **That is address enumeration**: anyone could type a neighbour's
address and learn whether they use this detailer and what they pay. The safe
twin is one word different — the address goes IN, the link goes OUT by email,
and nothing is displayed. **`plan-link`'s `email` action returns the same body
for an unknown business, a malformed address and a stranger**, and the only
thing that varies is whether a message is sent.

### The account he asked about shipped as a link

Round 3 answered his customer-account idea with *"good idea, one step early"*.
`/plan/:memberId` is that page: what they are on, how many visits are waiting,
when the next is due, a cancel button and a book button that carries the plan.
**The membership UUID is the credential**, which makes this the third caller of
a pattern the product already leans on twice (`/booking/:id` and 2.12's quote
acceptance) rather than a second kind of human in `auth.users`. Cancelling is
`status = 'ended'` plus `ended_on`; the ledger stays, and the partial unique
index only counts live rows, so they can join again tomorrow. **The detailer is
emailed when somebody leaves**, or a member would quietly vanish from the
visits-owed list with no event anywhere.

**The page computes nothing.** `plan-link` returns the two raw halves of the
ledger and the page calls `ledgerFor` from `app/src/lib/plans.js` — the
implementation `tests/plans.test.mjs` holds. The owed figure is the one number
this whole feature exists to print and it does not get a second implementation.

### Two things found on the way that were older than this item

**A negative `price_adjustments` line printed as a positive CHARGE in every
email.** `moneyBlock` draws by `kind`, not by sign, so a −$120 plan line showed
as $120 owed while the total was $120 lower — a column that silently stops
adding up, which is the exact family as the invoice that missed by the promo.
It was already reachable before this item: `accept-quote` pushes a *"Quoted
discount"* line whenever a detailer quotes UNDER the original estimate. Fixed
where every adjustment reaches the page, in `quoteLines`.

**`.bk-btn` labels could wrap.** The plans page's email row is an input at
`width: 100%` beside an inline button, and the input took the space and folded
*"Send it"* onto two lines inside a pill. The review step's promo row has had
the same shape since roadmap 2.7 and survived only because *"Apply"* is short.
`white-space: nowrap` and `flex-shrink: 0`, on the class rather than the case.

### The plans page was built twice, and the screenshot is the argument

**It shipped first as four boxed cards, each ending in a full-width button
reading "Ask about <the name written 40px above it>".** That is
`docs/design-knowledge.md` §1's "five identical full-width stacked sections"
and the owner's own copy rule in the same component. It was replaced by a
**ruled list** — the design system's own composition law, *a collection of
records is a ruled list, never a stack of cards* — where the ROW is the button.
It is still "one button per plan", which is what he asked for.

It also cost 96px a plan instead of 190px, which took the page from 311px past
the bottom of a laptop to fitting with 24px to spare. **The design law and the
measurement agreed, which is usually the sign the law is right.**

**The plans page and the member page are measured but NOT gated** in
`sweep-booking-steps.mjs`. W16 is the owner's rule about STEPS —
*"each step, you shouldn't have to scroll down or up"* — because scrolling
inside a form you are halfway through is what loses a booking. A catalogue of
plans is a page, its length is the detailer's, and all ten plan pages in the
research sample scroll. The number is still printed, because "it scrolls" and
"it scrolls by 600px" are different facts.

### What this step does not do

**Price by vehicle size, a plan per vehicle, and the coating-warranty deadline
are all still not built** — the same four limits step 2 recorded, unchanged.

**AND ONE NEW EDGE, STATED SO NOBODY REDISCOVERS IT AS A BUG: somebody
SWITCHING plans.** A customer who is an active member of plan A and presses
plan B's button gets a booking with `plan_id = B` (what they asked for, and
what the price was quoted from) and `plan_member_id` pointing at their live A
membership (whose ledger the visit comes off, because that is the plan they are
actually on). Both are true statements and neither is a mistake — and it
arrives as a REQUEST with *"Plan · B"* on the card, so the detailer is the one
who decides whether to move them. `plan_members_one_live` means they cannot be
on both at once, which is what makes "whose ledger" answerable at all.
**`included_service_ids` still has no UI**: step 3 was named as the thing that
needed it, and it turned out not to — the plan button starts the ordinary flow
and the customer picks what they want, which is what the auto-link trigger's
stated ceiling already assumes. Narrowing the discount to covered services is a
change to make when a detailer complains, not before.

## Roadmap 2.19 — "want to email some of your old customers?"

**2026-09-05.** The owner decided the shape of this on 2026-09-03 and his
sentence is the whole specification:

> *"Don't have one that automatically messaged on the email. Just have it,
> like, the business person whoever is running it could send out email to
> someone that they want. And maybe, like, remind deals. Like, hey, do you
> want to send out email to some of your old people? I don't know."*

**Nothing sends itself. The nudge is a row on a screen.** Both halves of that
were already written into the roadmap and neither was reopened.

---

### 1. What already existed, and what was actually missing

**Half the item was built in September 2026 and nobody had noticed.** The
Clients screen has known who has lapsed since roadmap 2.11 step 6 stage 5;
`app/src/lib/client-list.js` holds the arithmetic, `tests/client-list.test.mjs`
is 31 checks on it, and the screen already offered *"Text these 12"* off the
back of the filter. **What was missing was somewhere to write to them and a
prompt that asks the question.** So the compose surface selects nobody: it is
handed a list a human already narrowed and its only job is the words and the
send.

**The one change to the selection was widening WHEN the action row appears.**
It used to require the chip. A set narrowed by TYPING A NAME is as much a
chosen set as one narrowed by the chip — and the owner's ask is *"someone that
they want"* — so a detailer writing to three people searches for them rather
than unticking two hundred. One condition (`lapsed || search`) covers both
controls, because both cut the same list.

---

### 2. THE PART THE ROADMAP ENTRY UNDERSTATED, AND IT IS THE LOAD-BEARING ONE

The roadmap says a human picking named recipients is *"much closer to
transactional, so most of that machinery goes away."* **The scheduling
machinery goes away. The statute does not.**

**CAN-SPAM classifies a message by its PRIMARY PURPOSE, not by what pressed
send.** *"We haven't seen you in a while, come back"* is a commercial message
whether a person or a cron job sent it, and every commercial message needs:

- **a working opt-out**, honoured for at least 30 days after the send, and
- **a valid physical postal address** in the message itself.

There is no version of this feature without both. They are built:

| | |
|---|---|
| The opt-out flag | `customers.unsubscribed_at` — a timestamp, so the date of the decision survives |
| The opt-out page | `/unsubscribe/:customerId` + the public `unsubscribe` edge function |
| The address | `businesses.mailing_address`, its own field on Business info |
| Where they appear | `shell`'s optional `legal` argument, in the footer, on this template ONLY |

**THE OPT-OUT IS TWO STEPS AND THAT IS THE WHOLE REASON IT IS A PAGE.** A bare
link that unsubscribed on load gets pressed by things that are not people:
Gmail prefetches, and corporate link scanners and antivirus proxies open every
URL in an incoming message. Each one would quietly opt a customer out of a
business they still want to hear from, and nobody would ever find out. So the
link only READS (`action: "get"`) and a human presses the button that writes
(`action: "set"`).

**IT MUST NOT BE THE `dropoff_address`.** A mobile detailer has no unit — the
owner's own business is mobile — so that field is empty for exactly the people
this product is for, and a PO box or a private mailbox is the ordinary answer.
Separate column, separate field, printed on nothing else.

**AND THE OPT-OUT DOES NOT STOP TRANSACTIONAL MAIL.** A confirmation, reminder
or receipt for a booking the customer made is exempt and must still reach them
— unsubscribing from marketing must never become a way to stop finding out when
the detailer is arriving. `tests/campaign.test.mjs` asserts both directions:
the campaign carries the two lines, and a booking confirmation carries neither.

---

### 3. THE CAP IS OURS, NOT THE LAW'S — AND IT IS ABOUT BOOKINGS, NOT SPAM

`send-campaign` sends at most **50** recipients per press, sequentially, with a
550ms gap.

**The gap is Resend's rate limit** (2 requests a second; this is the only place
in the repo that ever sends in a loop, and a burst would start 429-ing at the
third recipient — failing sends nobody would ever look for).

**The cap is the free plan's daily allowance.** Resend free is 3,000 emails a
month and **100 A DAY across every tenant on the platform**, and the
transactional set spends about five per booking. One unbounded campaign could
eat the day and make bookings stop confirming — a far worse failure than a
capped campaign, and it would present as "the booking page is broken." **It
goes up when the platform has its own Resend account**, which is roadmap 2.18's
open thread and is priced in 2.20.

---

### 4. THE DEMO HAD NO LAPSED CUSTOMERS, WHICH IS THE FINDING RATHER THAN THE FIX

Every one of the demo's eight customers had a booking in the last few days, so
`arrange(..., { lapsed: true })` returned an **empty list**. That means the
`Clients · not seen in 3 months` block `sweep-widths.mjs` has walked at five
widths since 2026-09-02 was measuring a screen with nothing on it — and
printing `clean`.

**It is the same family as every other entry in CLAUDE.md's verification
section: a skipped check reads exactly like a passing one.** The chip's list,
both action buttons, the compose sheet and Today's prompt are all downstream of
that list having rows in it, so none of them could have been seen at any width.
Found by asking the database what the filter returns, not by reading the
sweep's output.

**Five new customers were seeded rather than eight existing ones moved
backwards**, because the recency of those eight is what Today, the calendar,
Money and the plans all draw: pushing one into the past to make this state
exist would take four other states away. One has **no email address** (the
ordinary case in this trade, and the only reason *"text those ones instead"* is
ever drawn), one has **opted out** (the only row the filter has anything to
exclude), and one has a **long name**, because the compose sheet lists
recipients as wrapping chips and the longest one is what decides whether that
wall fits at 320.

---

### 5. Where it landed

| | |
|---|---|
| The migration | `20260904005000_campaign_emails.sql` — three columns, each a legal or product floor |
| The email | `campaignEmail` in `_shared/emailTemplates.ts`, the 13th template and the only commercial one |
| The legal footer | `shell(brand, blocks, preheader, legal?)` in `_shared/emailKit.ts` — optional, so no other template gained a byte |
| The send | `supabase/functions/send-campaign/` — session, `marketing` permission, three recipient rules |
| The opt-out | `supabase/functions/unsubscribe/` + `app/src/book/UnsubscribePage.jsx` |
| The compose surface | `app/src/components/CampaignModal.jsx` — a `<Sheet>` at every width |
| The prompt | the last row on Today, `app/src/screens/Today.jsx` |
| Pinned by | `tests/campaign.test.mjs` (16 checks) and `tests/route-contract.test.mjs` (24 to 27) |

**Four smaller calls worth knowing:**

- **The subject is also the headline.** A detailer typing this is writing one
  sentence about why they are getting in touch; making them type it twice is
  how a compose form gets abandoned halfway.
- **The greeting is ours and the words are theirs.** A detailer writing to
  fourteen people cannot write fourteen names, and the name is most of what
  separates this from a blast. Their paragraph is escaped BEFORE its newlines
  become `<br>` — the order `ownWords` already uses, and the wrong order looks
  identical while letting one typed message inject markup into every copy.
- **The prompt goes quiet for 30 days after a send** (`businesses.last_campaign_at`,
  stamped by the function). A prompt that never goes quiet becomes wallpaper,
  and this one sits under the day's work rather than over it: people who have
  not been back are not today's work, and a marketing row above the rail would
  be the product interrupting a detailer's morning.
- **`last_campaign_at` is on `businesses`, not `business_settings`**, because
  since roadmap 2.13 that table needs the `settings` permission and the prompt
  belongs to whoever holds `marketing`. A member given promotions and nothing
  else would have found the row invisible.

**Verified by running it, not by reasoning about it.** A real send through
Resend's `delivered@resend.dev` simulator, with the edge-function logs read to
prove `send-email` was actually reached (`sent: 1, no_email: 1,
unsubscribed: 1`); the opt-out pressed, and the same campaign re-sent to
confirm the newly opted-out customer was excluded (`sent: 0, unsubscribed: 2`);
both bad-id shapes 404.

### 6. A RACE IN `sweep-widths.mjs` THAT 2.19 EXPOSED RATHER THAN CAUSED

**The first full `--lite` run of this item failed at 320 with `the Add a plan
button NO SUCH BUTTON` — and the same block passed when run in isolation.** It
took a control run to sort out, and the control is the part worth copying.

**WHAT THE CONTROL SAID.** Stashing this item's source and re-running the same
five-width `--lite` sweep passed. So the failure was ours. Bisecting one file
at a time landed on `Today.jsx` — and then, on the very next run with a
`console.log` probe added, **it passed with `Today.jsx` in place.** That is the
signature of a race, not a defect: adding five `await`s of probe work was
enough to change the outcome.

**THE ACTUAL FAULT IS OLDER THAN THIS ITEM AND IS IN THE SCRIPT.** Monthly
plans and Team's member list both draw their buttons only after Supabase
answers, and both were measured with `settle(page, N)` followed by
`.count()`. **`settle()` is a CAP on a repaint — `sweep-booking-steps.mjs`'s
own header already says in as many words that it is not a wait for a network
round trip.** And `?lite=1` makes it *worse*, not better: with no animations
running the DOM goes quiet sooner, so settle returns earlier and the count is
taken before the rows exist.

**2.19's contribution was two extra Supabase reads on Today**, which added
enough latency to push it over about half the time. The race was already there
and a full `--lite` sweep-widths run appears not to have been taken since
roadmap 2.14 added those buttons.

**The fix is a helper, `appear(locator)`, that WAITS for the control instead of
counting it**, used at all three sites. And the reason it mattered enough to
chase: **the failure printed `NO SUCH BUTTON`, which reads as a renamed
control** — the same family as the crash that printed `clean` until `say()`
learned to look for the error boundary.

**Two process notes, both of which cost time here:**

- **`git stash` on Windows with `core.autocrlf=true` rewrites the working tree
  to CRLF on the way back**, and `composition` 8e-iv is a byte-exact
  `includes()` containing `\n` — so popping the control's stash turned a green
  suite red in a file the item had not touched. CLAUDE.md already records this
  shape for scripted Python edits; **`git stash pop` is a second way in.** Fix
  is `sed -i 's/\r$//'` on the files with real changes and `git checkout --` on
  the ones where only the line endings moved.
- **A flaky failure is worth one probe before one theory.** Three plausible
  explanations were written down and all three were wrong; a `console.log` of
  the page's URL, heading and node counts answered it in one run — and answered
  it by *passing*, which was itself the finding.

### 7. TWO SCHEMA FACTS A NEXT SESSION WOULD GET WRONG

- **`campaigns` and `campaign_visits` ARE NOT THIS FEATURE.** They have existed
  since `20260827000200_tenant_data.sql` and they are tracked marketing LINKS —
  a slug, a destination and an optional promo code, counted by the `track-visit`
  edge function. Nothing in roadmap 2.19 touches them, and a session that finds
  `campaigns` and assumes it is the email history will wire the wrong table.
  **This item deliberately has no history table at all.**
- **THE OPT-OUT IS NOT TAMPER-PROOF AGAINST THE TENANT, and that is a stated
  ceiling rather than an oversight.** `customers_tenant_all` is `for all to
  authenticated` scoped to the business, so any member can update any column on
  their own customers — including clearing `unsubscribed_at`. The alternative is
  making one column on a tenant's own customer record un-writable by that
  tenant, which needs a trigger and a second story about who may correct a
  mistake. **What the product guarantees is that `send-campaign` honours the
  flag**; what it cannot guarantee is that a detailer will not go around it,
  which is true of every CRM.

## Working from the cloud while the owner is away

**2026-09-05.** He is away from his machine for a few days and does not want the
project to stop. The ask had three parts and each one turned into a rule.

### 1. WHAT THE CLOUD CAN DO WAS SETTLED BY LOOKING, NOT BY GUESSING

Read from Anthropic's own documentation rather than assumed, because the
answer removes most of this project's work:

- **`.gitignore` line 96 (`*.env`) means a cloud clone has no credentials**,
  and `*.supabase.co` is not on the sandbox's default network allowlist either
  — that list is package registries, GitHub and the big cloud SDKs. **So: no
  database, no migration, no function deploy, and none of the eight env-backed
  suites.**
- **Playwright's browsers are not in the image and their CDN is blocked.** No
  width sweep, no booking-step sweep, no screenshots. **Therefore no screens**,
  because CLAUDE.md's rule that visual work is verified by LOOKING has no
  escape hatch.
- **The user-level skills are not there** — `impeccable` and the rest live in
  his `~/.claude`, not the repo — which is a second, independent reason the
  queue has no design work in it.

**What survives is more than it sounds, and one measured fact makes it
usable: not one of the ten credential-free checks imports anything outside
`node:` and this repo, so they all run on a bare clone with no `npm install`
at all.** Plus `npm run build --prefix app`, and `gh`, which reaches the old
site's repo — the thing roadmap 4.1 has been waiting for.

### 2. HE STARTS A SESSION WITH ONE MEMORISED SENTENCE, SO THE FILE CARRIES EVERYTHING

He said it plainly: *"I don't want a thing that I have to copy and paste. It's
going to be simple. So I'm gonna be like, hey, read this file."*

So the opening is **"Follow `docs/cloud/README.md`."** and that file's FIRST
BLOCK is a complete brief rather than an introduction: read the limits, read
CLAUDE.md, take the first unticked task in `QUEUE.md`, do one, tick it, PR it,
stop. **The consequence for every future session is the load-bearing part:
anything a cloud session needs to know goes in that file and nowhere else.**
There is no follow-up message coming, because he is not at a keyboard.

**Seven tasks, three days, and the ordering is deliberate**: two pure-reading
tasks first (nothing can break, and they leave two documents the rest of the
queue uses), the one real code task on day two when he is most likely to glance
at his phone, and chores and a design doc on day three.

### 3. IT MAY CHOOSE ITS OWN WORK, AND THE LIMITS ARE THE WHOLE POINT

He asked whether it could *"analyze and do itself and kinda know its
limitations and continue."* Yes — bounded. `README.md` §6:

**Three tests, all three required, written down before starting.** Can it be
FINISHED here (if done needs a database, a browser or his answer, it cannot —
and that is not a reason to ship a worse version). Can it be CHECKED here —
**name which of the thirteen checks would go red if the work were wrong, and if
the honest answer is "none", write a document instead of a change.** And would
he RECOGNISE it as the next thing: it must trace to a roadmap line, an entry in
`open-threads.md`, or a `ponytail:` comment. **Never invent a feature** — he is
not there to say no.

**A ranked list of what to reach for** (blocking non-code threads; a check that
cannot see its own failure; a documented fact a script can prove stale; a
`ponytail:` ceiling actually reached; reading work the roadmap already asks
for), **and a short off-limits list that no reasoning overrides**: any screen,
stylesheet or animation; anything touching a payment key, a webhook or roadmap
2.20; `main`; editing an existing migration; a new dependency; a second task in
one session.

**AND A STOP RULE, which is the part most likely to be needed:** if two
self-chosen sessions in a row produce only documents and no verified change,
stop choosing and say so at the top of `QUEUE.md`. That pattern means the work
which fits the environment has run out, and **three days of documents nobody
asked for is worse than two days of work and a quiet Sunday.**

**Whatever it chooses gets appended to `QUEUE.md` as a ticked entry** with what
it did, which check covers it, and what the laptop still has to run. The queue
is the record of what happened while he was away; a task that exists only in a
session transcript is a task he will never find.

## Roadmap 2.20, stage 1 — the detailer's own payment handles

**The owner's ask was two different problems and this is the half that needs no
processor.** *"At least I need a way for my customers to pay me."* Money IN
(detailers paying him, $999 + $60/month) is stage 2 and cannot go live before
2 December, when he turns 18 and can open a Stripe account. Money THROUGH (a
detailer's customers paying the detailer by card) is stage 3 and needs Connect.
**Stage 1 is neither**: the detailer types the handles they already read out at
the door — Venmo, Cash App, PayPal, Zelle, cash, anything else — and the
customer's emails print them. No key, no webhook, no fee, and **it is the only
option that costs a detailer 0%.**

### The scope in the roadmap is ROUND 3's, not round 2's, and the two disagree

**Round 2 concluded "the payment handles go on the UNPAID branch only".** Round
3 of `docs/payments-research-2026-09-04.md` §4 then moved them, on the owner's
own knowledge of his trade rather than on any research: *"they don't leave a
client's house until it's paid… the amount of times someone's gonna mark
something finalized and it not be paid is, like, zero percent chance almost."*
**If that is right, the unpaid invoice is a rare document and round 2 was
aiming at a page almost nobody sees.** His old site already had it in the
better place and nobody had noticed —
`reference/supabase/functions/create-booking/index.ts:776` prints *"Payments
accepted: Cash, Cash App, PayPal, Venmo & Zelle"* in the **confirmation**
email, before the job, when it is actually useful.

**So stage 1 is the confirmation and the reminder AND the unpaid invoice.** The
round-2 sentence is still quoted in three files and reads like a complete
specification on its own; this entry exists so the next session that finds it
does not build the narrower thing. Same shape as the dissolve the owner
withdrew: *a session that finds the earlier quote and not the correction
rebuilds the rejected thing and can cite him for it.*

### The receipt is the whole point of the branch

`invoiceEmail` has branched on `payment_status` since roadmap 2.18: paid draws
a **Receipt / Paid in full**, unpaid draws an **Invoice / Amount due**. The
handles go on the second and never on the first, because printing "here's how
to pay me" on a document for money already handed over is the exact thing the
owner finds weird about his own old site: *"even on my invoice it says 'here's
the payments we accept', which is so weird since they already paid."*

### A FIFTH email carries them, and the roadmap's sentence would have missed it

"The confirmation and the reminder" is true of a **reserve**-mode tenant. In
**request** mode the customer's first email says *"we're holding your time"* and
its own note says nothing is charged — so the handles are not on it. **The
accepted-request email is that tenant's confirmation**, and it carries them
instead. Following the roadmap's wording literally would have given every
request-mode business payment handles on no email at all, and nothing on any
screen would have shown it. `tests/payments.test.mjs` §3 pins all five
placements and all four refusals.

### Six columns, not a JSONB list

`business_settings` already carries a feature per column group
(`site_discount_active/percent/label`), a check constraint can hold the length,
and the settings screen is six plain fields rather than the add-a-row editor a
list would need. The trade is that a seventh method means a migration; the old
site's own list was exactly these five plus cash, and `pay_other` is free text
for anyone who takes something else. **The 120-character limit is a trust
boundary, not tidiness** — every value is typed by a detailer and printed in a
ruled label/value list that a 500-character "handle" would destroy.

### A link is only built when it can be built correctly

**A wrong payment link is worse than no link.** It sends somebody's money to the
wrong person, or it 404s and makes the detailer look like they are not a real
business — and neither failure is visible from any screen in this product.
`supabase/functions/_shared/payments.ts` therefore links only two shapes: a
plain username matching `^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$`, and a pasted
`https:` URL with no character in it that could close the attribute it lands in.
Everything else — a phone number, an email address, a full name, `http://`,
`javascript:` — is **printed exactly as typed and not linked**. The sigil and
the link stand or fall together, because `@(303) 555-0142` is not a Venmo
handle and printing one says the detailer does not know their own details.
**Zelle never links at all**: it lives inside a bank's own app and is reached by
phone number or email, so there is no web address to send anyone to.

**This is the second human-typed string in the product to reach an email**
(the first is `campaignEmail`'s body, which is why `tests/campaign.test.mjs`
exists). Two independent defences: the module refuses to build the href, and
`emailTemplates.ts` escapes both the handle and the href where every other
escape in the product lives. The module returns DATA, never HTML, so there is
no second place to forget.

### What was deliberately NOT built

**No live preview of the emailed list on the settings screen**, which is the
obvious build. It would mean a second copy of `payments.ts` inside `app/` —
exactly the second-implementation problem CLAUDE.md allows in one place only
(`brandColor.js`, and only because a Deno bundle cannot import out of
`supabase/`). The two facts a preview would have carried are carried by the
per-field placeholders and by one sentence instead. **Business.jsx's row
summary is presence only** for the same reason: a summary answers "is anything
set", never "what does it render as".

**No QR upload.** The roadmap's *"what he already does — hold up a QR code —
becomes official"* reads as a goal, not a component, and a QR is strictly worse
than a handle in an email: **you cannot scan a code with the phone that is
displaying it.** A tappable Venmo link is the same act with one fewer device.

### Two things LOOKING at it changed, and neither was visible in the code

**The paired Venmo / Cash App row was unpaired after measuring it.** At 392 two
`.grid2` fields leave 155px each, which holds `@andrews-detail` and clips
anything longer into a scroll inside the box. Every other paired field in this
product holds a value you can recognise half of; **a payment handle is the one
kind of value where reading half of it is the same as reading none**, because
the detailer is checking it character by character against another app. Same
finding as `Reviews.jsx`: a pair that does not survive 392 is not a pair.

**The Business row summary named all six and was truncated to "Venmo, Cash App,
PayPal, Zelle, something els…".** `.now` is one clamped line. It names two and
counts the rest now — and the two it names are the two the email prints first,
so the row and the email agree.

**And the help sentence had been placed under PayPal, where it read as a
caption about PayPal** — the `@` and the `$` it explains belong to the two
fields above that one. It sits under the *Apps* heading now, which is the shape
`controls.jsx`'s own `Group` blurb already uses.

### The security review: nothing exploitable, two things worth fixing

**No injection reaches the email.** Nineteen hostile inputs across all four
text fields — `"><script>`, `' onmouseover='`, `javascript:`, `data:`,
`HTTPS://`, `https:/\/`, NUL, an embedded newline, a backtick, an RTL override,
percent-encoding — every one produced `href: null` or a benign `https:` href,
and a full rendered confirmation carried no raw tag, no attribute break and no
handler in any tag. `esc()` not covering the single quote is harmless here
because every attribute on the path is double-quoted and the only things
interpolated into one are `esc(r.href)` and a hex from the colour engine.
**The six columns are covered by `business_settings`'s existing
`has_business_permission(business_id, 'settings')` policies** — RLS is
row-level, so a migration that adds columns needs no new policy — and
`get_public_business_profile` builds its `settings` key from a 21-field
allowlist that does not include them. No cross-tenant path: `buildBrand` is
always called with `getSettings(business.id)` for the same business, and the
write policy's `USING` and `WITH CHECK` both require the permission on that
`business_id`.

**What it did surface is a copy defect with teeth.** `business_settings` writes
ride the `settings` tick, so the moment the handles landed on that table the
tick also granted *"change where your customers are told to send money"* —
while its own sentence still read *"Prices, hours, booking rules, branding and
the business's own details."* **A permission that grants more than its sentence
says is a permission nobody has actually agreed to**, and this is the same
shape roadmap 2.13 already fixed one screen over, where the tick said "Prices,
hours…" and `services.price` was writable by any member. The sentence names it
now. **No new permission key** — the vocabulary is deliberately closed
(CLAUDE.md: there is no `team` tick and that is on purpose), and a detailer who
can change their prices can change where the money goes.

**And it caught `payments.ts`'s own header lying about its code.** The header
said *"Zelle never links at all"*; the pasted-URL branch runs before the
per-service lookup, so `pay_zelle = "https://…"` does link. **The behaviour is
right and the comment was wrong** — the real rule is that exactly two things
are linked, a username on a service whose URL shape we know and a URL the
detailer pasted themselves. Both halves are pinned by tests now. The test had
said "Zelle never links" and passed, because it only ever tried a phone number:
*a check that cannot reach a case reads exactly like a check that passes*, in a
check written this same session.

### The other half: a rejected send is a fact about the customer

**Round 3 §6 asked for one small thing beside the handles: make a rejected send
visible.** `sendTenantEmail` is best-effort by design — an email failure must
never fail a booking — so a provider rejection was a `console.error` inside an
edge function, invisible from every screen, and **the first symptom was a
customer saying they never got their confirmation.**

**IT WENT ON THE CUSTOMER, NOT INTO A LOG, AND THAT IS THE DECISION.** A
rejected send is almost always a bad email address, and a bad email address is
a fact about the *customer* rather than about the mail system. A "failed
emails" screen is the obvious build and is worse: **a place you have to
remember to visit, about a problem you only ever care about one person at a
time.** Drawn under the address on the client sheet — the only place in this
product that prints a customer's email — and it names the phone number as the
alternative, because that button is directly above it.

**IT STAMPS ON A 4xx AND NOT ON A 5xx.** A 4xx is the provider refusing this
address; a 5xx is the provider having a bad day. Stamping the second would put
*"this address bounced"* on every customer emailed during a Resend outage —
false about all of them, and **the fastest possible way to teach a detailer to
ignore the flag.** The send still fails and is still logged either way; it is
simply not the customer's fault. Both paths were observed against the deployed
function rather than reasoned about: a malformed address came back with
Resend's own words on the customer row, and a real send through the public
`plan-link` action cleared it again.

**THE ASYMMETRY WITH `unsubscribed_at` IS THE WHOLE DESIGN.** The two columns
are deliberately the same shape, and they differ in exactly one way: **an
opt-out is permanent until a human undoes it; a bounce clears itself on the
next successful send.** A human pressed the opt-out; the provider told us the
other. A detailer who corrects a typo must not be told forever that the address
they just fixed is broken — a flag that is wrong more often than right becomes
a flag people learn to ignore, and then it is worse than nothing.

**THREE PLACES ALREADY ASKED "CAN WE EMAIL THIS PERSON" AND NOW ASK IT
CORRECTLY** — Clients' `emailable` count, `CampaignModal`'s, and
`send-campaign`'s `eligible` filter. **Only the last is enforcement**; the two
counts are courtesy, because a caller can post ids straight at the function.
Re-mailing an address the provider has already refused spends **the platform's
shared sending reputation**, which is the exact resource the 50-per-press cap
exists to protect. **Nobody is quietly dropped**, which is the compose sheet's
own standing rule: the bounced count is reported beside the no-address and
opted-out ones, and someone who is both opted out and bounced is counted once —
otherwise the sheet prints more excluded people than it has.

`tests/payments.test.mjs` § 6 writes the reachability predicate out once so the
three cannot drift apart, which is how `emailable` came to need its own comment
in the first place. Baselined: ignoring the bounce fails 2.

**AND THE STATE HAD TO BE SEEDED AND SWEPT OR IT WAS UNREACHABLE CODE.** The
client record is opened by `sweep-widths.mjs` with `.first()`, so the bounce
line is drawn on exactly one row of a list the walk already visits — which
**looks covered and is not**. That is the tenth instance of *a state you reach
by pressing something INSIDE a screen is not navigation*, in its most
deceptive form yet: not a screen nobody opens, but one row of a screen
everybody opens. Victor Salas is seeded bounced, the sweep opens him by name,
and a seed that stops carrying that row prints `NOT MEASURED` rather than
passing quietly.

**The matching is exact on the address rather than case-folded**, and that is
marked with a `ponytail:` comment rather than hidden: every caller passes an
address read back out of the row it would update, so the two agree by
construction; a `lower()` comparison needs an RPC or a functional index and can
wait for a real mismatch.

**WHAT IS STILL NOT DONE: the job record does not print a customer's email at
all**, so there is nowhere to put the line there. If it ever gains one, it
belongs there too.

### The best thing this item produced was a race it did not cause

The bounced client went into `sweep-widths.mjs` with an `else` branch that
prints `NOT MEASURED` instead of skipping quietly. **On the first `--lite` run
that line fired at three of five widths**, and the cause was not the new state.

**The whole Clients block opens with `settle()` then `count()`** — the race this
repo already documents for Monthly plans and Team's member list, sitting in the
one block nobody re-checked when that lesson landed. `settle()` is a cap on a
repaint, never a wait for a network round trip, and **`?lite=1` makes it worse
rather than better** because with nothing animating the DOM goes quiet sooner.
Every state in the block is guarded by `if (await ...count())`, so when the read
had not returned, **six measurements did not fail — they ceased to exist**: the
two sorts, the lapsed filter, the compose sheet, the client record and the job
opened from its history. The run printed `Clients · the list   clean` and moved
on, at three of five widths, in the reduced-motion path that CLAUDE.md
specifically says to run before believing any timing fix.

**Nothing in this repo could have reported that, because a guard that skips is
byte-identical to a guard that passes.** The only reason it surfaced is that one
new state was written to say so out loud. **That is the transferable rule and it
is cheaper than any of the fixes it competes with: when you add a state to a
browser script, give its `if` an `else` that names what did not run.** One
`console.log`.

**The mechanical footnote is its own small lesson.** `appear()` — the helper
written for exactly this race — was declared immediately before the settings
walk, and a `const` is in its own temporal dead zone above that line. So the
Clients block, two hundred lines earlier, **could not have called it even if
somebody had thought to.** The cure written for a bug was out of scope of the
site that still had it. It is declared once, high up, now.

### What still needs the owner, and what is still open

- ~~**A rejected send is still invisible.**~~ **BUILT — see the section above.**
  The first pass of this entry left it, on the reasoning that *where a detailer
  sees it* was a screen decision. That was under-scoping rather than judgment:
  it is one line under an address the client sheet already draws, not a screen.
  **The only genuine remainder is that the JOB record does not print a
  customer's email at all**, so there is nowhere to put it there.
- **Nothing tells a detailer their handle did not become a link.** The rule is
  stated once on the screen; nothing checks their typing. A validation hint
  needs the module the app cannot import, so the honest options are a preview
  that costs a second implementation, or an edge function that answers it.
  Neither is worth building until a real detailer has typed a handle in.


## Roadmap 2.20, stage 2 — the pricing page

Written 2026-09-05. Stage 2 is the checkout; this is the half in front of it,
and the owner asked for it in his own words:

> *"When you say take founding spot, that shouldn't bring you to a sign up or
> a payment screen. That should take you to a pricing page… it shows basically
> all my options and all the different things, and they click the one that
> they want."*

### It is not decoration in front of a checkout

Every plan button on the landing page went straight to
`/app?plan=website&offer=founding`, which is a signup form. Somebody who has
not yet chosen between three ways to pay is not ready for one. That is his
complaint and it would have been enough on its own.

**But the statute is the reason this page has to exist before the checkout
does, rather than after it.** California's **AB 2863**, in force 1 July 2025,
requires the auto-renewal terms, any minimum term and any early-cancellation
fee to be **clear and conspicuous BEFORE billing details are taken**. There is
no billing detail on this page, which is exactly why it is where "before"
happens. **A session that treats this as the pretty page in front of the real
one will move a disclosure onto the checkout and break the ordering the law
cares about.**

### Nothing is pre-selected, and the LADDER is how that is guaranteed

The FTC sued Adobe in June 2024 over an early-termination fee, and it sued
over the **presentation**: a pre-selected plan, the commitment buried in fine
print and hover icons, and an obstructed cancellation. The fee itself was
never the problem. So the three items the complaint named are the three things
this page is built around.

**Three cards side by side would have been the obvious layout and it is the
wrong one twice over.** It is a named anti-slop tell
(`docs/design-knowledge.md` §1), and — the reason that actually decided it —
**it is the layout that invites a highlighted middle.** A highlighted middle
is a pre-selection in everything but name. So the three ways to pay are a
**ruled ladder**: three rows of equals, nowhere to put a badge, and nothing to
stack the deck with.

**There is no selection state on the page at all.** Each option is its own
link. That is stronger than "we chose a sensible default of none", because
there is no default to drift: a later session cannot accidentally reintroduce
one without first inventing the state to hold it, and `tests/landing-pricing`
7b fails if it does. There is no *"most popular"* either — with no customers
it is both a pre-selection in disguise and a claim we cannot substantiate.

**The roadmap said "annual-paid-monthly should be the visual middle".** It is,
and "visual middle" is read here as POSITION only. It is second of three
because the ladder runs cheapest-per-year to dearest, which is also where it
would sit if nobody had an opinion.

### The headline figure is what leaves the bank

The pricing research's ladder is expressed as effective monthlies — $50 / $60 /
$75 — and putting **$50/mo** on a plan that takes $600 in one payment is the
small dishonesty this whole page is a correction to. So each rung's big mono
figure is the actual charge: **$600 a year**, **$60 a month**, **$75 a
month**.

**The saving is stated in MONTHS FREE, and that is not only the locked
framing — it is the only one that works for both price columns.** $600 on $60
is two months free; $400 on $40 is two months free. As effective monthlies
they are $50 and **$33.33**, and a founding visitor would have met a repeating
decimal on the page that exists to make the offer feel considered.

### The founding ladder is derived, not decided

`docs/pricing-2026-09-04.md` locked `$999 / $60 / $600 / $35` and added
month-to-month at `$75`. It also names founding equivalents in passing —
$400 / $40 / $50 — and those are **not a second set of opinions**: they are
the list ladder's own two rules applied to the founding monthly. Two months
free ($480 − $400 = $80 = 2 × $40) and a 25% no-commitment premium
($40 → $50).

**So the test pins the RULES rather than the figures**, in both columns: the
annual saving must be a whole number of months inside the 15–20% band the
category uses, the month-to-month premium must be inside the 20–30% band, the
ladder must be in order, and every founding price must be genuinely below its
list price. The owner can move a number and be told whether the ladder still
makes sense, rather than being told the number changed.

### The tick is at the checkout, on purpose

The roadmap says *"an explicit tick before payment"* and there is no tick on
this page. **That is a decision and not an omission.** Express affirmative
consent has to be captured and STORED with the subscription at the moment of
purchase; consent collected on a marketing page and then carried through a
signup flow is consent that can be lost, and a record of consent that cannot
be produced later is worth nothing. The DISCLOSURE is what the statute
requires before billing details, and the disclosure is here in full.

### The page now promises dunning behaviour nothing implements

*"We try the card again over the following two weeks and email you each time.
If it still has not gone through after that, the site goes offline until it is
paid. Nothing is deleted."*

That is round 3's research (3–4 retries over 10–14 days, then pause rather
than cancel) joined to the owner's own ruling on non-payment (*"if they just
stop paying, then yes, their site will go down"*). **It was a plan; it is a
printed promise now.** The checkout that lands next is bound by it, and that
is written into the roadmap rather than left in this file.

### Four defects, and three of them no existing check could see

**1. The test's own pricing-section slice had been empty since it was
written.** It looked for `aria-labelledby="price"`; the section is
`aria-labelledby="prh"`, so `indexOf` returned −1 and
`slice(-1, <something smaller>)` returns the empty string. *"No hardcoded
prices in the pricing section"* passed by having **no subjects** for the whole
life of the check — in the one test guarding the numbers a customer is
charged. Identical in shape to `email-brand` 7a-ii in 2.18. It is anchored on
the section's own `id` now and has a HAS-SUBJECTS assertion above it, which is
the pattern 2.18 already established and this file failed to apply everywhere.

**2. A `data-rv` on a conditionally-rendered node can never reveal.**
`thread.js` collects its revealables with ONE `querySelectorAll` at mount, and
that returns a **static** NodeList. The founding strip renders only when the
offer lookup answers — after mount — so it was in no list, was never given
`.in`, and sat at **opacity 0 permanently**. The element carrying the entire
scarcity claim was invisible.

**Nothing in this repo could have caught it**, and that is the part worth
keeping:

- `?lite=1` reveals everything, so the lite path looked correct;
- an opacity-0 element still has a full box, so `sweep-widths.mjs` measured it
  and printed `clean`;
- no contrast test can measure a colour nobody is ever shown.

**The landing page has never had this bug by luck rather than by rule** — its
founding flag and lock line sit inside `.plan`, which is unconditional and
carries the `data-rv` itself. The rule is now a check (`landing-pricing` 8e)
and it is run against both pages: **put the reveal on a wrapper that is always
mounted.**

**3. The founding strip lost the settle-then-count race** at the first width
of the very first full sweep, and it was caught **only** because its `if` had
an `else` printing `NOT MEASURED` — the rule this file added on 2026-09-04,
doing its job eight days later. `settle()` is a cap on a repaint and never a
wait for a round trip.

**And fixing it needed `appear()` HOISTED, which is the second time that
helper has been unreachable at a site that had the race it was written for.**
It was declared inside the width loop, immediately above the settings walk, so
a `const`'s temporal dead zone put it out of reach of every earlier caller —
the Clients block two hundred lines above it in 2026-09-04, and now the
pricing block six hundred lines above that. It closes over nothing, so there
was never a reason for it to be inside the loop. **It is at module scope now
and cannot happen a third time.**

**4. `sweep-widths.mjs` cried wolf on the landing ground.** The pricing page is
the first page carrying `.ld`'s `.ground` that this script has ever walked, and
the two drifting lights (76vmax) and the dot lattice (inset −8%) each measured
~150px past the right edge at 320 — inside a `position: fixed` layer with
`overflow: hidden` over them. `past-viewport` now skips anything an ancestor
already clips horizontally.

**That weakens nothing**: a defect is content sticking out where it can be
SEEN, and clipped is the definition of cannot be. What it prevents is the
check reporting three false positives on every run, which is how a check stops
being read at all — and a check nobody reads is the same as no check.

### What was deliberately left

**The landing page had never been swept by anything, and this item closed
that.** The width sweep walks the dashboard and the booking page; `/` is
neither, so the page a visitor meets FIRST had never been measured. The first
draft of this section argued for leaving it — a pre-existing gap belongs to an
item that can act on what it reports — and that argument was wrong in the
cheapest possible way: **measuring it took two minutes.** It came back clean at
all five widths with the sweep's own four checks, so adding it was one line
that changes no verdict today and catches the next change to that page.
**The transferable half: "this gap belongs to a later item" is a decision that
should be made AFTER measuring, not instead of it.** Deferring a fix is
reasonable; deferring the measurement that would tell you whether there is
anything to fix is just not looking.

**And `?term=` reaches `/app` where nothing reads it.** The pricing page hands
the chosen term forward so the choice survives the step after it; `Auth.jsx`
already switches to "create an account" on the presence of `plan`, and the
checkout is what will read `term`.


## Roadmap 2.25 — two of the three asks were already built

Written 2026-09-05, answering the owner mid-session:

> *"can we put on the list to improve the sign up / log in page cuz it looks
> pretty buns. also we should have a log in and sign up button for the landing
> page. also add google log in support"*

**Checking the repo and the live project before writing anything turned a
three-part build into a one-part one**, and that is the whole reason this
section exists — the next session to pick 2.25 up would otherwise build Google
sign-in a second time.

**Google sign-in is fully written and switched off.** `app/src/screens/Auth.jsx`
has `withGoogle()` calling `supabase.auth.signInWithOAuth({ provider:
"google" })`, Google's own marque as inline SVG in their brand colours because
their guidelines require it be shown as issued, and `useEnabledProviders()`,
which reads GoTrue's `/auth/v1/settings` so **the button appears the moment
Google is enabled and never before** — no rebuild, and no button leading to
*"provider is not enabled"*. **Measured on the day he asked: that endpoint
returns `google: false`, with `email` the only provider on.**

So it is not a code task. It is a Google Cloud OAuth client pasted into
Supabase → Authentication → Providers, which needs his Google account and is
about ten minutes. **The one thing to verify once it is on, rather than
assume:** a Google sign-up produces a session with no business, and `App.jsx`
is supposed to route that to business creation. The email path does; nothing
has ever exercised the OAuth path.

**The landing page already has both buttons** — *Sign in* → `/app` and
*Get started* → `/pricing`. What is true in his complaint is the **wording**:
"Get started" does not read as "sign up", and the two do not look like a pair.
A label and treatment decision, not a missing feature.

**The screen itself is the real item and he is right about it.** `Auth.jsx` is
built from `theme.css`'s `.card`, `.field` and `.btn` — the DASHBOARD's
chrome — while everything a prospect meets up to that moment is the landing
world. It is the one screen where the two surfaces meet, and it is the last
impression before somebody hands over money.

**Two traps are written into the roadmap entry rather than left to be
rediscovered.** `theme.css` is GLOBAL and reaches into `.ld`; nine class names
on the landing page are already renamed to survive that, and the list is in
`landing.css`'s header. And **`Auth.jsx` is the screen `sweep-widths.mjs` signs
in through on every run**, addressing `input[type=email]`,
`input[type=password]` and `form button.btn.primary` by selector — a rename
that misses those turns every browser check in the repo red at once, printing
`NO SUCH BUTTON`, which reads as a product bug rather than a harness one.

## Roadmap 2.20, stage 2 — the checkout, the billing page and what happens when a card fails

2026-09-05. The half of stage 2 the pricing page left open: a detailer can now
buy a subscription, see what they pay, change the card and cancel — and the
product knows what to do when the card stops working. **Nothing has ever talked
to Stripe**, because there is no Stripe account yet; everything below is built,
tested and looked at, and switched off behind one environment variable.

### The organising decision: the page prints and the server charges, and one function does both

This repo's oldest rule is *a number PRINTED on a screen is not a number that
is CHARGED*, and it has always been a metaphor — the "charge" was a row in
`bookings` that a detailer typed. **This is the first place it is literally
true.** `/pricing` prints $600 / $60 / $75; `lineItemsFor()` hands Stripe an
amount; and between them sat nothing but a person reading two files.

So three things are arranged to make disagreement structurally impossible
rather than merely unlikely:

1. **`_shared/platformBilling.ts` is the only place a plan becomes money**, and
   it is pure — no Deno, no Supabase, no fetch — so `tests/platform-billing.test.mjs`
   imports the same module the edge functions run and ties every rung, founding
   and list, to the money on the wire.
2. **It is the SECOND copy of the price table and that is allowed exactly here.**
   A Supabase edge function is its own Deno bundle and the CLI will not follow
   an import out of `supabase/` — the same wall that forced `_shared/brandColor.js`
   to duplicate `lib/theme.js`. CLAUDE.md permits one such copy and charges a
   test for the permission; this is the second, and the price is the same.
3. **The screen does no arithmetic about money at all.** The billing screen asks
   `platform-billing`'s `summary` action for every figure, the consent sentence
   and what cancelling costs today. There were three ways to arrange that — a
   third copy of the price table inside `app/`, an import across the
   `app/` → `supabase/` boundary (which works, and is strange), or asking the
   server — and only the last one produces the words on the screen and the words
   in the database from the SAME CALL to the SAME FUNCTION.

`summary` needs no Stripe key. That is what let the whole screen be built and
verified in a browser months before there is an account to attach it to.

### Every price is snapshotted on the row, and the exit fee is why

`pricing.js` is what the page prints TODAY. The founding ladder ends when three
spots are gone; the list price will move. A subscriber's price is fixed at the
moment they agreed to it — pricing.js's own header already promised that — so
`setup_cents`, `recurring_cents`, `term_months` and `exit_fee_share` are copies
taken at checkout and never re-read from anywhere.

**The exit fee is the case that makes it sharp.** It is arithmetic on money we
take off somebody: half of the months still to run. Computing it from a later
config is how a $240 fee becomes $360 — a charge nobody was shown, on a card,
with a chargeback at the end of it.

### The consent stores the WORDS, not a boolean

AB 2863 wants express affirmative consent before billing details are taken.
`platform_subscriptions.consent_text` holds the sentence that was on the screen.

**A `true` in a database proves somebody ticked something. The sentence they
ticked is what answers a chargeback**, which is the entire reason an
early-exit fee is defensible at all — the FTC's June 2024 complaint against
Adobe was about the PRESENTATION of an identical fee, never about the fee.

**And the sentence is generated from the snapshot rather than typed into the
screen.** `consentSentence()` names all four things the statute wants said out
loud — that it renews by itself, how often, how much, and what leaving costs —
and the screen prints its output while the server stores its output. A
hand-written sentence on the checkout is one config change away from promising
$40 while charging $60. All the browser sends is that the box was ticked; the
server refuses without it, because the tick is a statutory requirement rather
than a disabled button.

### Suspension was already built and is one column

The pricing page now promises, in print: *"the site goes offline until it is
paid. Nothing is deleted."* The obvious build is a suspension mechanism. There
already is one.

`businessBySlug` and `get_public_business_profile` both filter on
`status = 'active'`, so `businesses.status = 'paused'` darkens the PUBLIC
booking page. `businessById` has no such filter, so **a customer who already
booked keeps the page they cancel and reschedule from** — which is better than
the roadmap feared when it worried about "the phone calls landing on a detailer
already having a bad week". And the dashboard is reached by MEMBERSHIP, not by
status, so the detailer keeps every screen and every row.

Roadmap 4.4's platform-admin "suspend" is the same column. Built once, as the
research asked. The webhook guards it in both directions — it only pauses a
business that is `active` and only reactivates one it paused — so an admin's
own reasons for that column cannot be overwritten by a card.

### Inline `price_data`, not Stripe product ids

The conventional build creates Products and Prices in the Stripe dashboard and
stores their ids. It is also how a checkout starts charging a number nobody in
this repo can see: the id reads `price_1Abc…` and what it costs lives in another
company's admin panel.

Inline `price_data` means the amount on the card comes from this file, which
comes from `pricing.js`, which is what the page printed — one chain, testable
end to end. **The side benefit is the one that matters for this owner: it is
zero Stripe dashboard setup to get wrong on a Sunday.** The cost is that
Stripe's reporting groups by product NAME rather than by id, which is a
reporting inconvenience against a correctness guarantee.

### The Stripe portal is deliberately crippled to one flow

Stripe's hosted customer portal does card updates, invoices and cancellation
with no code. Cancellation is the problem: from the portal it would skip the
early-exit fee and skip our own `canceled_at`, so the row and the reality drift
apart in the one place they must not.

`flow_data: { type: "payment_method_update" }` pins the session to the card and
returns them here. **The cancel button stays ours, and stays one press behind
one confirm** — the fourth item on the FTC's Adobe list, and the thing AB 2863
actually requires. The exit fee is printed BEFORE the press: discovering it
afterwards is the complaint, not the fee.

### No Stripe SDK, and no new dependency

`_shared/stripe.ts` is about a hundred lines: form encoding, one `fetch`, and
the webhook signature. The SDK's value is types and retries, and an edge
function making three calls gets neither. This repo's entire frontend
dependency list is four packages on purpose.

**The one part worth reading twice is `flatten()`.** Stripe takes
form-urlencoded with bracketed paths, and **it does not reject a parameter it
does not recognise** — it stores what it understood. A mis-nested
`line_items[0][price_data][unit_amount]` is a checkout session that succeeds
with no amount on it. Section 9 of the test encodes the real payload and reads
the amounts back out of the wire format.

### The webhook: the signature is the entire authentication

`stripe-webhook` is the only public, unauthenticated endpoint in this repo that
WRITES. Stripe has no bearer token to present, so it is deployed with
`verify_jwt=false` — otherwise Supabase's gateway rejects every event before
the function runs and **the whole dunning mechanism silently does nothing**: a
subscription goes unpaid for two weeks, no booking page ever goes offline, and
there is no error anywhere.

Which makes the signature load-bearing. Without it, anyone on the internet can
POST `invoice.paid` and grant themselves a free subscription, or POST
`customer.subscription.deleted` and take a competitor's booking page down. Two
things beyond the MAC matter and both are easy to leave out:

- **The RAW body.** `JSON.parse` then `JSON.stringify` reorders keys and drops
  whitespace, and the signature is over BYTES. A handler that parses before
  verifying verifies nothing. The test asserts the file contains
  `await req.text()` and never `await req.json()`.
- **The timestamp.** Without a tolerance a captured request replays for ever.

**And every handler is safe to run twice.** Stripe retries until it gets a 2xx
and redelivers even after one, so `stripe_events` is a lock and the INSERT is
what takes it — a primary-key conflict means somebody else has this event.
Doing the work first and recording afterwards is the version that suspends a
business twice or charges an exit fee twice. On a genuine failure the claim is
RELEASED, so Stripe's own retry can do the work rather than skipping it as a
duplicate.

**A 2xx on anything we cannot handle**, because a 500 on an event this file
does not care about makes Stripe retry it for three days and then disable the
endpoint.

### An unknown Stripe status maps to NOTHING

Stripe has eight subscription statuses; the product has five words a detailer
would recognise, closed by a check constraint. `ourStatus()` returns **null**
for anything it has never heard of, and the caller keeps what it had.

That is not defensiveness for its own sake. **Defaulting an unknown status to
`active` gives the product away; defaulting it to `suspended` takes a paying
detailer's booking page down because Stripe shipped a feature we do not use.**
Neither is a guess worth making, and a new status is a thing Stripe adds
without asking.

### Two emails, and the first the platform has ever sent in its own name

Every one of the thirteen existing templates is a detailer speaking to somebody.
These two are us telling a detailer their card stopped working.

**Stripe can send failed-payment emails and should.** But that is a checkbox in
another company's dashboard, and `/pricing` now prints *"we email you each
time"* as a term of the contract — a promise resting on a setting nobody in
this repo can read is a promise resting on nothing. Stripe's copy is the belt
and ours is the braces. **The suspension half Stripe cannot send at all**: it
knows a subscription went unpaid and knows nothing about a booking page going
dark.

Three consequences, all small and all necessary:

- **`_shared/platformBrand.ts`** builds a `TenantBrand` for the platform, so
  every block in `emailKit.ts` works unchanged. A second brand TYPE would have
  meant a second set of blocks, which is how twelve consistent templates become
  thirteen that drift. **It takes `siteUrl` as an argument** rather than
  importing `config.ts`, which reads `Deno.env` at module scope and would make
  every email unrenderable from Node.
- **`send-email` gained a `sender_name` branch.** An email from *"Ridgeline
  Auto Detail"* telling Ridgeline their own card failed reads as phishing. The
  same flag also stops the send being recorded against a CUSTOMER: a billing
  email goes to the detailer, and stamping a bounce because their contact
  address happens to match a customer of their own would put "this address
  bounced" on a row it says nothing about.
- **It goes to `businesses.contact_email`, never `notification_emails`.** That
  list is where BOOKING alerts go, and a detailer may well have pointed it at a
  shared inbox or a member of staff. A declined card is not their team's
  business.

### Where the past-due state is drawn, and why it is on Today

The research asked for a state that is *"visible and annoying but not
destructive"*. A suspended booking page is otherwise **invisible from every
screen a detailer uses** — the dashboard keeps working perfectly while nobody
can book.

So it is a box at the top of the first screen they open, and it is the one thing
on Today that is not about today. It costs the screen nothing on the days it
says nothing, and it is null for staff and for every business without a
subscription, which is all of them today. `.error-box` gained the `.actions`
slot `.warn-box` already had, because until now an error box was always a dead
end — right for "that save failed", wrong for "your booking page is offline",
which has exactly one thing to do about it.

The gear row carries the same fact in its summary and takes `.nav-row.blocking`,
the class Business already uses for an unfinished setup step.

### Five things it found, and only two of them were in the code

1. **The consent sentence rendered as unreadable small caps.** It was wrapped in
   `<label className="field">`, and `label.field > span` is the uppercase,
   0.22em-tracked, muted micro-label every settings field in the product uses.
   So the one sentence on the screen that has to be READ — and that gets quoted
   back in a card dispute — was set as an eyebrow. **No check in this repo
   could have seen it**: the geometry was clean, the contrast was fine, the
   words were correct. Only looking found it. `.confirm-box` is the house
   pattern for exactly this and was already there.
2. **A chosen rung looked identical to the two nobody picked.** `theme.css` has
   no `aria-pressed` styling at all — `.nav-row[aria-current]` was the only
   selected-state language in the system — so a detailer arriving from
   `/pricing` with a term already chosen had the price breakdown below as the
   only evidence of their own choice. Fixed with the same two tokens as the nav
   row, because a second visual language for "selected" is how a design system
   stops being one.
3. **"Next charge" on a date last week.** Stripe leaves `current_period_end`
   where it was while it retries, so a past-due account read *Next charge —
   September 2* with September 2 behind it, and the cancel confirmation offered
   *"you keep everything until"* the same past date. **The date was right and
   the word in front of it was wrong.** Visible only by seeding a past-due
   subscription and looking at it.
4. **A check that passed with the sentence deleted from the email.** *"Nothing
   has been deleted"* is the sentence that stops a detailer whose page went dark
   assuming their customer list went with it — and the check asserting it was
   testing the HTML, where the hidden PREHEADER says it too. Deleting it from
   the body left the check green. It is pointed at the plain-text half now,
   which `htmlToText` strips the preheader out of. **Found by baselining, not
   by reading** — the same family as `landing-pricing` 1 and `email-brand`
   7a-ii, in a fourth place.
5. **`StripeError` could not be imported by the test.** It used a TypeScript
   PARAMETER PROPERTY (`constructor(msg, readonly status: number)`), and Node's
   type STRIPPING only removes annotations — it cannot transform one. The
   credential-free suite would have been unable to pin the signature check that
   is the only thing between a public webhook and the open internet. **Anything
   under `_shared/` that a test or `render-emails.mjs` imports must stay
   strippable and must not touch `Deno` at module scope.**

### What is deliberately not built

- **Plan switching.** A detailer on month-to-month cannot move to annual without
  cancelling and starting again. It is proration, a new term start and a new
  consent, and nobody has asked for it.
- **A dunning countdown.** The screen never prints "2 of 4 tries left". Stripe
  owns the retry schedule (a dashboard setting), so a product that counts them
  out loud lies the day somebody changes it. `dunning_attempts` is still
  stored, because the number is worth having when a detailer is on the phone.
- **A resume that refunds the exit fee.** Cancelling and un-cancelling twice in
  a week would otherwise be a free loop. The screen says so before the press.

### What the security review found, and where it looked first

Everything it was pointed at first came back clean and the reasoning is worth
keeping: the webhook verifies the RAW body before anything parses it, with a
real timestamp tolerance and a constant-time compare, and the first database
write happens strictly after verification so an unsigned POST cannot even
consume an event id; `requireMember` filters on `user_id` AND `business_id`, so
a caller passing a business they are not a member of gets a 401 rather than
somebody else's subscription; `founding`, `plan`, `term` and the consent are
all decided server-side; the three tables have no write policy at all; and the
new email escapes every untrusted value exactly as the other thirteen do.

**What it found was a ROUTING mistake in the part that looked finished, and it
bit in both directions.** `cancel` raises a ONE-OFF Stripe invoice for the
early-exit fee, and it carries `metadata.business_id`, so the webhook resolved
it to a business exactly as it would a renewal:

- **Paying an exit fee cleared the whole dunning state and brought a SUSPENDED
  booking page back online with the subscription still unpaid.** Cancel, pay
  $240, serve customers again while owing $600.
- **And a manual invoice has no retry schedule, so `next_payment_attempt` is
  null on its FIRST failure** — the exact signal that means "the two weeks are
  up". A fully paid detailer whose card expired while cancelling had their
  booking page taken offline immediately and was emailed *"your site is
  offline"*. That one needs no attacker at all.

The fix tests the invoice's own `subscription` field rather than its metadata,
so it covers the next one-off somebody adds without reading this. **A one-off
is still mirrored onto the receipts list** — it is a real charge — it simply
cannot move the account's state.

**The second finding is the one worth carrying into other work, because this
item had already made the argument and then not applied it to itself.** The
portal's lock lived in Stripe's dashboard: `flow_data` decides where a customer
LANDS, and the portal CONFIGURATION decides what they can reach around it. That
is admin-panel state nothing in this repo can read — **the precise failure this
item rejected two paragraphs earlier when it refused to let Stripe's own
failed-payment emails be the only ones sent.** The file's comment claimed the
guarantee; the code did not have it. Same shape as stage 1's review finding
`payments.ts`'s header lying about its own code, with the halves swapped. The
configuration is created from code now, cancellation and plan changes off.

Four smaller ones: `?? "active"` on an unknown Stripe status at checkout (one
line contradicting the module's own rule three files away — `?? "incomplete"`
now, because the safe direction costs a refresh and cannot give the product
away); a late `invoice.paid` could revive a cancelled subscription, since Stripe
promises no event ordering; re-subscribing left the previous cycle's
`stripe_subscription_id` on the row, which `cancel` and `resume` address Stripe
by; and the exit fee was recorded AFTER the call that could throw, so a failure
in between left money off a card with nothing saying what for.

All six are pinned by § 14 of the test, baselined by putting two of them back.

**And a seventh came out of simply re-opening the screen after the redeploy: a
cold edge function took five seconds and the screen drew nothing for all of
it.** It says *"Checking your subscription…"* now. What it must never say is
*"you have no subscription"* — that is the mistake roadmap 2.14 made on the
plans list, a conclusion painted before the first read returned.

### What the design audit found, and the two findings that were refused

Two isolated agents, a design review and a mechanical detector pass, neither
seeing the other. **The detector found nothing** — no findings, no console
errors, the consent text at 13.31:1 and the warning box at 15.32:1 against a
4.5 floor. **The review scored the screen 23/40 and found nine things, and the
two that mattered most were rules this repo already had in writing.**

**The one that would have cost real money: on a phone, the twelve-month
commitment did not render at all.** `.row-item .sub` is `nowrap` with an
ellipsis and 208px wide at 392, and the middle rung's sentence needed 413px, so
*"You are committing to twelve months"* was cut off — the disclosure the entire
AB 2863 and Adobe reading exists to protect, deleted by a CSS rule at the moment
of the decision, reappearing only inside the consent sentence, which is to say
after the choice was made.

**Nothing in this repo could have caught it, and that is the transferable
part.** Clipped text has a perfectly normal box: the width sweep measured it and
printed `clean`, because every check that script owns is a question about
geometry and an ellipsis is not a geometry problem. A contrast test measures a
colour that IS on screen. **The only instrument that finds this is natural width
against rendered width**, and nothing in this repo took that measurement until
an audit was asked to.

**The second was the owner's own copy rule, broken on a screen built after he
gave it.** All three rung sentences opened by restating the label directly above
them — *"One payment, up front"* under **Pay for the year**, *"No commitment at
all. Stop any month you like."* under **Month to month** at **$75 a month**.
That is *"Mobile — we go to them"* three times over. **The half that survived
the cut is the half that was being clipped**, so one change fixed both, which is
the useful shape: the copy rule and the space budget are usually the same
problem seen from two ends.

The rest, briefly: law 8 was broken in both `.facts` blocks (money in the body
face, one card carrying two money faces) and worst on the early-exit fee — the
largest unexpected number in the product, set at 13px in `--fog` mid-sentence
above a red button. The $999 build fee, 94% of the first charge, appeared
nowhere on the ladder. The block that opens did not animate and switching rungs
was not a `.swap`, both against rules CLAUDE.md says bind new work today. And
the only route back online for a suspended detailer was a **55x16-pixel** text
link, pinned top-right beside a request card carrying a full-width Accept
button — the screen's hierarchy saying a booking request outranked the business
being switched off.

**And the audit's own screenshot caught a gap in the screenshot tool.** Both
`settle()` implementations wait for a `.spinner` and for animations, and a
screen waiting on an edge function is perfectly quiet — so `shoot-dashboard.mjs`
photographed the words *"Checking your subscription…"*. They wait for
`[data-loading]` now, which costs no pixels and which every browser script in
the repo reads.

**Two findings were refused and the reasons are the point.**

**"An unrelated SaaS could ship this screen tomorrow."** True as stated, and it
is the design system's own instruction rather than a lapse:
`dashboard-skeletons.md` §3 has the settings screens share ONE skeleton
deliberately, and the skill-collision rule forbids a direction-generating pass
against this product. Acting on it would be redesigning settings, which is the
owner's call and not this item's.

**"Set the consent as four ruled rows above a short tick sentence."** Genuinely
easier to read, and refused because **the words displayed have to be the words
stored.** `consentSentence()` generates one sentence, the screen prints it and
the server stores it, and that identity is the whole reason a client cannot show
friendlier wording than it records. Splitting the display from the stored text
reintroduces precisely the drift the design makes impossible. **It is a real
question and it belongs to the owner**, because the auditor's underlying point
stands: a 63-word paragraph restating a ruled list two inches above it is a
paragraph a detailer ticks unread, and the artifact meant to survive a
chargeback is then the one thing nobody read.

### The founding saving had to be visible, not stated — and it was an inconsistency, not a gap

The owner, looking at a screenshot on his phone: *"I saw the monthly payment
stuff… it should visually show like the discount price vs the regular price for
the founder spots."*

**He was right about something narrower and more damning than a missing
feature.** `/pricing` already struck its list price — the build fee prints
`~~$999~~ $499` and has since roadmap 2.2 — and the three rungs directly
underneath it printed the founding figure alone. So the page taught a reader
what a discount looks like in the first section and then stopped doing it in the
second, and the saving on the rungs was stated in PROSE below the ladder:
*"the standard ones are $600 a year, $60 a month and $75 a month"* — four
numbers a reader had to carry back up the page and match by hand.

**The dashboard's own ladder had the same gap and a harder version of it.**
`summary` resolves `quotes` to ONE column before the browser ever sees them, so
a founding account is handed founding figures with no way to know what the list
price was. That is deliberate — eleven ternaries is eleven chances to print a
founding price beside a list one — so the fix is server-side:
`list_recurring_cents` and `list_setup_cents` beside each quote, computed by the
same `planFor` at `founding: false`.

**Which is the whole point: the struck number is a real price the product
charges somebody.** `LandingPage.jsx` has carried that sentence since 2.2 —
*"never an anchor invented to make a number look smaller"* — and it does not
soften inside the dashboard. The screen's test is whether the two figures
DIFFER rather than whether the account is founding, so a standard account sees
one price and no theatre, and a strike cannot survive the three spots running
out.

**The prose sentence went**, under the owner's own copy rule: every number in it
is now beside the figure it discounts. What replaced it is the half a strike
cannot say — that the price is locked for the life of the account.

**Three smaller things fell out of it, all caught by tests rather than by
reading.** `theme.css` had no struck-price treatment at all, because until the
billing screen no figure in the dashboard had ever been a discount OF anything;
scoping it took two wrong tries, `.figure .was` (which matched three of four
sites, and the fourth printed `$999$499` with no gap — a rule losing silently)
and bare `.was` (which failed `composition` 4b, because theme.css is GLOBAL and
`landing.css` has its own). It is `.card .was` now. And `seed-demo.mjs` seeds
the demo as `plan_tier: 'founding'`, because a strike only exists on a founding
account and seeded standard the entire treatment would be measured nowhere —
*a configuration nothing seeds is a configuration nothing tests*, applied to a
visual state rather than to a feature.

### It has now talked to Stripe, and four things fell out of that

**Written when nothing had: *"Nothing here has ever talked to Stripe."* The
owner opened a test account the same day and handed over the keys, so the
paragraph below is history rather than a limit** — it is kept because the
reasoning in it is what made an early test possible at all.

Everything was exercised against real Stripe on 2026-09-05: a Checkout session
paid with `4242 4242 4242 4242` in a browser, and a **test clock** run that
advanced a second tenant two months with a card that declines. Stripe's own
page printed **$539.00 today, then $40.00 per month** — the `$499` build plus
the first `$40`, which is what `/pricing` prints and what the billing screen
printed. **That is the tie-out closing in the real world**, and it is the first
time this product has had a number PRINTED and a number CHARGED compared by
Stripe rather than by a test of ours.

**The dunning path behaved exactly as the pricing page promises** — renewal
fails, `past_due`, booking page still up; retries exhaust, `suspended`, booking
page offline, an email at each step. **And it taught four things no amount of
reading would have produced. Two were bugs.**

1. **Stripe's default end-of-dunning is a CANCELLATION, not `unpaid`.** The
   setup notes tell the owner to change that setting; on a fresh account it is
   not changed. The run survived it purely by **event ordering** — the final
   `invoice.payment_failed` landed two seconds after the cancellation, so the
   row ended `suspended`. **The other order gives a row saying `canceled` while
   the booking page is genuinely dark**, and `dunningState()` returned
   `level: "ok"` for `canceled`: an offline business and a billing screen with
   nothing on it. `suspended_at` outranks the word now, because the page being
   off is a fact about US and that column is where we record it.
2. **`invoice.charge` is an ID, not an object, so the decline reason was always
   null.** `asObj(invoice.charge).outcome.seller_message` on an unexpanded
   invoice is `{}`. The code looked right; the email simply never printed the
   one line a detailer can act on. It fetches the charge now and prefers
   `failure_message` — words written for a person — over
   `outcome.seller_message`, which is frequently *"The bank did not return any
   further details with this decline"* and is worse than nothing on a screen.
3. **The pinned API version turned out to be load-bearing rather than tidy.**
   `_shared/stripe.ts` pins `2024-06-20` on the general principle that an
   unpinned integration breaks on a date nobody chose. Fetching the same
   invoice at both versions proved something sharper: **at `2024-06-20` it
   carries `charge` and `payment_intent`; at this account's newer default it
   carries neither.** Every reason lookup would have found nothing, silently.
   The webhook endpoint is registered at the same version and the two must move
   together.
4. **Stripe Tax refuses the entire Checkout session without a head office
   address on the account, in test mode too.** The research said Stripe Tax is
   free until there is a registration and should be on from day one — true
   about the fee, silent about this. It is a dashboard setting, **and this item
   has now refused three times to let one be load-bearing** (the dunning
   emails, the portal configuration, and this). `checkout` tries with automatic
   tax and, on that specific error only, retries without it and returns the
   reason. **The fallback cannot under-collect**: holding a tax registration
   requires that address, so the error is reachable only where automatic tax
   would compute zero anyway.

**And one non-finding worth recording, because a session that only writes down
its failures teaches the next one to distrust the right things.** The setup
needed no dashboard visit: the webhook endpoint was created through the API,
which returns the signing secret, and Supabase reads function secrets at
runtime — so `stripeConfigured()` went from false to true on already-deployed
code with no redeploy.

### The honest limit, as it stood before any of that

**Nothing here has ever talked to Stripe.** Every pure part is pinned by 168
credential-free checks, both screens are verified in a browser at every swept
width, and the three calls that leave the building have never been made because
there is no account to make them against. **Stripe TEST MODE needs no activated
account and no guardian**, so a signup and an `sk_test_` key — ten minutes —
would close that gap long before 2 December. Until then `stripeConfigured()` is
false, the checkout answers 503 *"Payments are not switched on yet"*, and the
screen says so above the button rather than letting somebody press it.

### The checkout is ours now, and the card fields are still Stripe's

Stripe offers three shapes and the owner picked the third, 2026-09-05: *"then
an option to just I make / we make the like gui think so I chose that one so it
can look like the rest of the website."*

1. a hosted page at `checkout.stripe.com` — what stage 2 shipped
2. that page in an iframe on ours
3. **Elements** — the card fields are Stripe's, everything around them is ours

**He is right, and the reason is sharper than taste.** The hosted page is
white, it is titled with the STRIPE ACCOUNT'S name rather than the product's —
the screenshot proves it, the mandate line reads *"you allow Detailing platform
sandbox to charge your card"* — and it arrives at the exact moment a detailer
is deciding whether to trust us with a card. Handing that moment to a page that
looks like somebody else's is the one place in the product where the seam is
most expensive.

**WHAT DID NOT CHANGE, AND MUST NOT: the card fields are still an iframe on
Stripe's origin.** No card number reaches this product, this server, this repo
or any log, so the PCI position is identical to the hosted page. What we gained
is the frame around it; what we did not gain is any exposure. The sentence
under the button says so in the detailer's own words, and it now matters more
than it did when the fields were on another site.

**And the money is still decided in the same place.** `planFor` writes the
snapshot and `consentSentence` writes the words before a single Stripe object
exists; `price_data.unit_amount` is sent from this repo on every call. Only the
surface moved.

#### Four things the swap actually cost, none of them guessable

1. **`payment_behavior: "default_incomplete"` is the whole mechanism.** Stripe
   creates the subscription without attempting payment and returns a client
   secret; the browser confirms it against the Payment Element; the webhook we
   already had turns `invoice.paid` into an active row. **Nothing new listens.**
2. **`items[0][price_data][product_data]` is accepted by Checkout Sessions and
   REJECTED by the Subscriptions API** — *"Did you mean product?"*. So
   `productFor()` finds-or-creates a Product by `metadata.tag === "dp-line"`,
   the same shape the portal configuration already uses. A Product carries only
   the NAME on the receipt; the amount never lives in Stripe.
3. **The build fee moved from a second line item to `add_invoice_items`**,
   which Stripe appends to the subscription's first invoice. One charge, one
   amount, exactly as before — $539 in test mode, proven.
4. **THE CARD DETAILS CAME BACK NULL, and the cause is structural.** The
   account screen's *"visa ···· 4242"* was filled from
   `checkout.session.completed`, **and with our own form no such event ever
   fires.** `subscriptionChanged` now reads `default_payment_method` and
   fetches the card itself. This is the failure mode to expect from every
   hosted-page thing removed later: the code did not break, an event simply
   stopped arriving, and nothing says so.

#### The appearance is READ OFF THE PAGE, not typed out

Stripe's Appearance API takes concrete values — it cannot resolve `var()`
inside an iframe on another origin — so the obvious version is a second
hand-written copy of the palette, which is the drift the design system exists
to prevent. `appearanceFromTokens()` reads the computed values off `<html>` at
mount time, so the form follows `theme.css`, follows a token rename, and
follows **the tenant's own accent**, which `lib/theme.js` writes onto the root
at runtime and no hardcoded copy could ever know about. The 392 screenshot is
the proof: the demo tenant's blue is on Stripe's tab, its focus ring and its
labels, in the uppercase tracked voice every other field in the product uses.

#### No npm package, and that is not austerity

Stripe REQUIRES their script be loaded from `js.stripe.com` and forbids
bundling a copy — it is how PCI scope stays off the server. `@stripe/stripe-js`
is a ~2 KB wrapper around exactly the injection in `lib/stripejs.js`, and this
frontend's dependency list is four packages on purpose.

#### What is still Stripe's, visibly

The payment-method tabs are Stripe's and carry Stripe's promotions — a green
**"$5 back"** badge on Bank, Klarna's pink mark, Cash App. They are switched on
in the Stripe dashboard, not in this repo, and they are the loudest off-brand
thing left on the screen. **Left alone deliberately**: restricting to cards is
one dashboard setting away and costs conversion, and that is the owner's call
to make with real numbers, not this session's to make with none.

#### The limit of the proof, stated plainly

**The browser tool cannot type into a cross-origin iframe**, so no session has
typed a card number into this form. What IS proven: the form mounts, is styled,
and measures clean at 320/360/392/1440/1920; the server returns a real client
secret for a real $539 subscription; and **that same PaymentIntent, confirmed
server-side with `pm_card_visa`, went `succeeded` → webhook → row `active`,
`$539 paid`, card `visa ···· 4242 · 9/2027`.** What is NOT proven is
`stripe.confirmPayment` itself — Stripe's own function, called with its own
elements instance — and 3-D Secure, which needs a human at a real browser.

### "Everything that could change should be in the database" — what the audit found, and where he is right

His ask, 2026-09-05: *"Those facts should be linked in database — basically
everything that could be a changeable fact should be linked to Supabase."*

**He is right about the FAILURE and wrong about the CURE, and the audit is what
separates them.** The failure he is pointing at is drift: the same fact typed in
several files, and one of them wrong. **That is real and it was already
happening in three places.** The cure is not "put it in the database" — it is
"one source per fact", and a database is only sometimes the cheapest source.

#### What was actually broken, all three found by looking rather than reasoning

1. **THE TIE-OUT TEST WAS GUARDING DEAD CODE — the worst of the three, and my
   own change caused it.** `lineItemsFor()` built Stripe Checkout `line_items`,
   and when the hosted page was replaced the same afternoon, **nothing called
   it any more**. `platform-billing` still IMPORTED it; § 2 — *"what the page
   prints is what the card is charged"*, the rule this whole item says outranks
   every other rule — went on passing against a function no request could
   reach, while the amounts that actually charge a card were typed out in the
   endpoint. **A test guarding dead code reads exactly like coverage.**
   `linesFor()` replaces it, describes the MONEY rather than Stripe's
   parameters, and the endpoint now translates and decides nothing.
2. **Two names for one plan across the seam a person walks with a card out.**
   `/pricing` said *"Annual, paid up front"* and *"Annual, paid monthly"*; the
   billing screen said *"Pay for the year"* and *"Pay monthly, for a year"* —
   **and `Billing.jsx`'s own header asserted they carried the same words.** A
   comment is not a mechanism. The dashboard's plainer wording won and § 10
   pins both files to it.
3. **The founding bar spelled out a number that lives in the database.**
   *"When the THIRD one goes, this page shows the standard prices instead"* —
   beside a count read from `platform_settings.founding_total`, a column
   somebody edits with one UPDATE. Raise the cap to five and the page says the
   third is the last. **"The last one" is true at every cap**, and a check now
   refuses any ordinal there. **This is his point exactly, and note the
   direction: the fix was to stop typing the fact, not to fetch it again.**

Also collapsed: `"Website build — one-off"` was typed in two server files and is
now `BUILD_FEE_LINE`, pinned as part of the tie-out — **because a receipt row
that says something the screen never said is the same defect as a price that
does.**

#### Where a database EARNS its place, and where it does not

The test is not *"could this change?"* — everything could. It is **"who changes
it, how often, and what does a wrong value cost?"**

- **PRICES: yes, eventually, and it is the only strong case.** The table is
  typed twice on purpose — a Deno bundle cannot import out of `supabase/`, the
  same wall that forced `_shared/brandColor.js` — and 241 checks are what keeps
  the copies equal. **A `platform_prices` row would make them one.** But it buys
  him nothing he can USE until roadmap 4.4 builds a screen to edit it; until
  then a price change is a SQL statement, which is not more owner-editable than
  a file. **So: build it WITH 4.4's platform settings screen, not before.**
  **And the risk is already contained** — every price is snapshotted onto
  `platform_subscriptions` at purchase and never re-read, so a price edit can
  never re-price somebody who already bought.
- **THE REPEATED PROMISES: no — one module, not one row.** *"Two weeks of
  retries, then the site goes offline"* and *"nothing is deleted"* are typed in
  four and five places across the pricing page, the dunning words and the two
  billing emails. **That is genuine drift risk and a database does not fix it
  better than a check does** — with the added cost that a row can be edited
  into disagreeing with what the code actually DOES. **They cannot be one
  constant either**: the landing bundle cannot import out of `supabase/`, the
  same wall as the price table. **So § 7 now reads all four files** and fails
  if the pricing page stops promising two weeks, stops promising the page comes
  back, or starts counting retries out loud — which it could not do before,
  because every check there compared `dunningState()` against a promise quoted
  in a COMMENT.
- **MARKETING COPY, THE FAQ AND THE COMPARISON TABLE: no.** Eight FAQ answers
  and five claims, changed a few times a year, always with a person reading
  them first. A CMS for one author is a second system to maintain.
- **THE LEGAL DISCLOSURE: NO, AND THIS ONE IS A DELIBERATE REFUSAL.** The
  AB 2863 block on `/pricing` is 80 lines of JSX and it belongs there.
  **Editable legal text is a liability, not a feature**: a typo in an
  auto-renewal disclosure is the exact thing the FTC sued Adobe over, and git
  history — who changed it, when, reviewed by whom — is the audit trail that
  argument needs. A database row has none of that.

#### Two gaps the audit found that are neither

- **There is no support email, phone number or postal address anywhere in the
  product** — while `/pricing` promises *"one button in your own account… no
  phone call, no email and nobody to talk out of it"* and the billing emails
  give a detailer no reply path. **Nothing to move to a database; something to
  decide before anyone pays.**
- **There is no `/terms` or `/privacy` route at all.** The whole legal surface
  is inside the pricing page.
