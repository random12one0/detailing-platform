# ICP: Detailing Platform + the Control Room that builds it

**This file is the saved record that this is Andrew's ICP project.** Update the
progress log at the bottom as you go. Written 2026-10-09 from the repo, not from memory.
(UNKNOWN - Andrew must answer: what "ICP" stands for at school and what the rubric requires.)

## One sentence
Andrew is building two things at once: **Detailing Platform**, a website-plus-dashboard
service for independent car detailers, and a **Control Room** (the "belt") that runs AI
workers and auditors on a to-do list so the platform gets finished, checked and ready to
sell to real people.

## The two halves
1. **The product** (`detailing-platform/`): custom website + booking + owner dashboard for a detailer.
2. **The build system** (`belt/`): a program that feeds the product's roadmap to Claude Code one job at a time,
   checks the work with cheaper and smarter AIs, and shows everything in a Control Room screen.
   Its bigger vision (auditor platform that tests any app) is written in the pasted vision doc; today's working
   version is the belt + Control Room. Muse / Playwright-based auditor GUI is **planned, not built** (UNKNOWN - Andrew
   must answer: how much of the full auditor vision is the school project vs. the later goal).

---

# SLIDE-BUILDER BRIEF (max 5 slides)

Use only these facts. Anything marked UNKNOWN is unanswered; leave a clearly marked blank, do not invent.

## WHERE THE FILES ARE (the slide AI must look here)
- **Exact folder with everything for the deck:** `D:\Users\rando\Downloads\claude\detailing-platform\slides-assets\` (this file `ICP.md` plus every screenshot and the logo).
- **Source folders, if it needs to check facts:** product = `D:\Users\rando\Downloads\claude\detailing-platform\`; belt / Control Room = `D:\Users\rando\Downloads\claude\belt\` (start with `belt\START-HERE.md`, `belt\README.md`, `belt\PLAN.md`).

## THE PROJECT IS THREE EQUAL PARTS - give each the same weight
- **Part A - Detailing Platform:** the product being sold to detailers (section 1).
- **Part B - The Belt and Control Room:** the AI work system Andrew built and is still building (section 1B). Working today.
- **Part C - The Auditor platform:** the larger AI auditing, testing and repair system Andrew designed (section 1C). Designed in detail; **not built yet**, so say "designed, in progress" and never "finished".
The story: A is the goal, B is the machine that builds A, C is the quality checker that makes A launch-ready and can later audit any software.

## Slide plan (5 slides)
1. **The big picture** - one diagram: Detailing Platform (goal) <- Belt/Control Room (builds it, working) <- Auditor platform (checks and verifies, designed). Guiding question, topic, theme.
2. **Part A: Detailing Platform** - problem, product, pricing, founding offer, screenshots (landing, booking, dashboard).
3. **Part B: The Belt and Control Room** - how it works, who does each job, real numbers, Control Room screenshot. Say plainly it is still being built.
4. **Part C: The Auditor platform** - the vision, the roles, the phases, status = designed not built.
5. **Plan, resources, and proof of success** - timeline (all three parts), tools/costs, the expert to interview with 3 questions, 3 measurable goals.

## 1. PART A - THE PRODUCT (Detailing Platform)
- **What:** A multi-tenant web service that gives an independent car detailer a professional website with online booking built in, plus a phone-first dashboard to run the business. Three audiences, one codebase: prospects (marketing page), detailer-owners (dashboard), their customers (booking page).
- **Problem:** Customers "look you up before they call" and find a four-year-old Facebook page. Today detailers use a Facebook page, a Wix/Squarespace site, or software that only handles bookings (Urable from $45/mo, Jobber $29-$199/mo, Zenbooker $29/mo). A custom agency site costs $2,000-$8,000 and has no booking. Detailers book jobs by text late at night.
- **Plans and prices (from `app/src/landing/pricing.js`):**
  - **Website + dashboard:** $999 one-time setup, then $60/month, or $600/year (2 months free), or $75/month with no commitment.
  - **Booking only:** $35/month, no setup, no term.
  - **Founding offer (first 3 customers only):** $499 setup, then $40/month, or $400/year, or $50/month month-to-month. Price locked for as long as the account stays open.
  - Terms: no commission ever, customers belong to the detailer, cancel any time and your data leaves with you.
- **Works today (per repo docs and tests; I did not re-test each one live):**
  - Public booking page per detailer with live price calculation, vehicle sizes, multi-car bookings, promo codes, address search, weather forecast, Spanish + English.
  - Booking changes: reschedule, cancel, customer manage page, receipts, calendar (.ics) files.
  - Owner dashboard: Today, Calendar, Clients, Money (revenue and expenses), job records, 25 settings screens, team invites (owner/staff), push notifications.
  - Email: confirmations, reminders, campaigns, unsubscribe, delivery tracking.
  - Custom websites: five example detailer sites built on the kit (`/ex1` to `/ex5`).
  - Billing: Stripe checkout, cancel button, failed-card handling, tested end to end in **Stripe test mode**.
  - Safety/admin: Google sign-in (published), privacy/terms pages, platform-admin screen, outage-alert emails, "forget a customer" erasure, "pause my business" date, encrypted backups, tenant isolation tests.
- **Not built / not working yet:**
  - **No real money can be charged yet** - the Stripe account is not activated (the form requires a business address and Andrew is not old enough to complete it; needs a plan - see questions).
  - **Texting (SMS)** is set up with Telnyx but nothing can send yet (campaign review and number deferred to launch).
  - **Photo uploads** still use a 1 GB Supabase limit; the move to Cloudflare R2 storage is in progress.
  - **No real detailer has used it yet.** The live site is a private preview; nothing is "launched".
  - **Backups were created but never restored once** (roadmap 2.22).
  - Google Business Profile sync is not built; the whole-product language/wording sweep (review item 16) not done.
  - **58 roadmap items still open** (123 done, 1 partly done, of 182) as of 2026-10-09.
  - Publishing was blocked in September by Netlify build credits; current state of the live site vs. the code: UNKNOWN - Andrew must answer.
  - Two test suites were red on 2026-09-11 (`platform-admin`, `password-reset`); current status not rechecked.
- **Real numbers (counted 2026-10-09 with git/file commands):**
  - **1,716** commits; first commit **2026-01-30** (includes the original single-business site it grew from; the platform conversion began around 2026-08-28).
  - **41** server functions (Supabase edge functions).
  - **133** test files (the repo's own docs say suites interfere if all run at once).
  - **111** database migration files (about 59 table-creation statements; the exact live table count: UNKNOWN - not queried).
  - **~60,500** lines of app code, **~21,700** lines of server code, **~43,000** lines of tests (git-tracked files).
  - **1,165** tracked files; **131** documents in `docs/`; the to-do list (ROADMAP.md) is **26,128** lines.
  - Roadmap: **123 done, 58 open, 1 partial** (68% done by the Control Room's own count).
  - Control Room code: **~7,270** lines (belt.mjs 2,365, dashboard.mjs 2,274, lib.mjs 2,631); 39 saved worker runs and 16 "just finished" jobs on screen at 2026-10-09.
- **How it differs:** Competitors sell either booking software (Urable, Jobber, Zenbooker) or a template website (Wix/Squarespace). This sells **one thing: a custom website plus the dashboard that keeps it current**, built for the detailer; booking is a feature of the website, not the product. No commission. Weak spot of competitors per Andrew's research: Urable's help is thin; Jobber is general field-service, not detailing.

## 1B. PART B - THE BELT AND CONTROL ROOM (folder: `D:\Users\rando\Downloads\claude\belt\`)
- **What it is, one sentence:** a small program that hands the product's to-do list to an AI worker one job at a time, over and over, and every so often wakes a smarter AI to check the work and fix the program's own settings.
- **Why it exists:** an AI only exists while it is answering, so the old "AI manager" kept dying. A program has no turn: it can loop, never forgets, costs nothing to run, and has no opinion to be talked out of. The AI only starts when there is thinking to do.
- **Three jobs, three levels of intelligence (on purpose):**
  1. **Analysis = plain code, no AI, free.** Works out which items are ready, what depends on what, whether anything actually changed on disk.
  2. **The choice = a cheap AI (planner).** Gets a shortlist of 5 built by the code and picks one with a sentence of why; if the answer is nonsense the belt ignores it and uses its own pick, so a cheap model is safe.
  3. **The work = Claude Code (worker),** model chosen per job (cheap for wording, strongest, Opus, for anything touching money or permissions).
  4. **The audit = two AIs in sequence (supervisor).** Every 4 items or 90 minutes a mid-level AI reads everything; only if it finds something real is the strongest AI started, which opens the site in a browser, presses the buttons, and un-ticks anything it cannot reproduce.
- **Roles today:** worker = Claude (Opus/Sonnet/Haiku by rule); planner and triage = Codex (gpt-5.6-terra, chosen after measuring about 40% cheaper than gpt-6.1-sol); deep audit = Claude Opus.
- **Safety rules built in:** gates (checks) run after every job and compare to a baseline taken before; an item that fails 3 times is parked for Andrew; workers may never push, deploy, spend money, touch secrets, or write to the real business database; a backup copy of the project history is kept; every job is logged.
- **The Control Room (the screen):** a dark web page at localhost:7777 with tabs **Now, Watch it work, For you, Your jobs, History, This morning, Settings**; buttons Run one job, Start, Pause, Stop, Kill the job; shows the job running with live steps, "what it does next" queue, "just finished" cards with files changed, and "58 left - 123 done" with a progress bar. Screenshot: `control-room-1440.png`.
- **Real numbers (counted 2026-10-09):** about **7,270 lines** of code (belt.mjs 2,365; dashboard.mjs 2,274; lib.mjs 2,631); started running **2026-10-08 21:14**; **39** saved job records; **21** job dispatches and **14** supervisor audit write-ups in its first ~20 hours; **9** failures logged (honestly shown, not hidden). It is agent-agnostic: any command-line AI can fill a role, and it works on any repo with a checklist of `- [ ]` items.
- **What it has already found about itself (shows the audit idea works):** the audit on 2026-10-09 (`belt\PLAN.md`) found the Control Room's live view was broken by two one-line faults (it read from a folder variable that did not exist, and keyed finished jobs on a field never sent) and that it records far more than it shows; the fix plan is written. Also found: Codex checker once answered from a filename guess instead of reading the file, so the belt was changed to open it up and verify; an item worker was killed at the ~50-minute cap with zero commits, so workers now commit in small pieces.
- **Still being built (say so on the slide):** the rebuilt live view and history panels, the Codex roles fully working (some runs failed on a Netlify login), and automatic splitting of items that keep timing out. Andrew is building it right now.

## 1C. PART C - THE AUDITOR PLATFORM (designed, not built; written as a full vision document)
- **One sentence:** an independent AI software-engineering and quality system, with a desktop control screen, that can reconstruct how a large unfamiliar app works, operate it like a real user, inspect its database and integrations, prove problems with evidence, and help repair them safely.
- **Why:** the detailing platform was written mostly by AI over months and has accumulated bugs, inconsistencies and unneeded complexity; fixing them one at a time creates new problems. A fresh independent investigator replaces "disorganized repetitive bug-fixing".
- **Core principles (the rules it follows):** (1) fresh, independent investigation, not trust in old chats; (2) evidence for every finding (file paths, screenshots, logs, reproduction steps) with a confidence level; (3) look past "it works" to "can it be better"; (4) understand the whole connected system, not single files; (5) powerful autonomy in a safe test copy, read-only on production; (6) speed up development, separate launch-blockers from nice-to-haves.
- **Ten specialist AI roles:** Lead Architect, Code Quality, Frontend/UX, Backend/Database, Security, Integration, Functional QA, Performance, Product Improvement, and an Independent Verifier that tries to reproduce important findings.
- **Findings are sorted:** Defect, Improvement, Opportunity, Technical Debt, Unverified Concern; each marked Confirmed / Probable / Unverified / Disputed / Rejected / Resolved. Anti-hallucination rule: one AI saying "broken" is not proof; a second must reproduce it.
- **What it tests for the detailing product:** full journeys (sign up a detailer, publish a site, customer books, reschedule, cancel), two detailers must never see each other's data, subscription upgrades/failed payments in Stripe test mode, plus nasty cases (two people booking the same slot, weather service down, session expiring mid-form, a task running twice).
- **The screen (GUI):** main dashboard, project explorer, AI agent manager, live audit monitor, findings dashboard, visual review studio (screenshots at desktop/tablet/phone), architecture explorer, integration manager, repair workspace (diffs, tests, approve/reject), cost and budget dashboard, audit history, and chat with the lead auditor.
- **Environments and safety:** inspection (read-only), staging (agents may create and break test data), repair (separate Git branch/worktree), production (tightly locked, approval needed).
- **Model flexibility and cost:** starts with Muse Code (Muse Spark models) because of low usage-based pricing, but built to swap in Claude and others; data warning: contributor pricing may let the provider train on submitted content, so secrets and customer data must be kept out.
- **Planned tech:** Tauri or Electron + React + TypeScript desktop app; local orchestration service; Playwright browser automation; Supabase tools; SQLite local database; Git worktrees.
- **Six build phases:** (1) read-only audit engine, findings, cost tracking; (2) browser testing and screenshots; (3) Supabase and integration inspection; (4) specialist auditors, verification, coverage dashboard, readiness scores; (5) controlled repairs with approval; (6) multi-model routing, incremental audits, history. 
- **How it connects to Part B:** the belt's supervisor already does a small version of this (independent audit, un-ticking what it cannot reproduce); the Auditor platform is the full-size version. Today it is a design document only; nothing of the desktop app is built (UNKNOWN - Andrew must answer which phase he will build by May 2027).
- **Definition of success from the vision:** provide a big unfamiliar project, run an audit from the GUI, get reproducible findings, verified fixes, measured coverage and a clear path to launch.

## 2. PLATFORM AND TOOLS (what each does)
- **React + Vite** - builds the website/dashboard screens people see.
- **Supabase** - the database (Postgres), logins, file storage and the 41 server functions.
- **Netlify** - hosts the website at detailingplatform.com.
- **Resend** - sends the emails (free plan: 3,000/month, 100/day).
- **Stripe** - takes payments and subscriptions (test mode only today).
- **Google sign-in (Google Cloud)** - lets people log in with a Google account; published "In production".
- **GitHub** - stores code history and encrypted database backups.
- **Cloudflare R2** - photo storage (being moved to).
- **Telnyx** - text messages (account paid, sending deferred).
- **Geoapify** - address autocomplete on the booking page. **Google Translate API** - translation fallback.
- **Playwright** - robot browser that tests the screens. **Node.js** - runs scripts and tests.
- **Claude Code (Anthropic)** - the AI that writes code; the belt launches it. **Codex (OpenAI)** - planner/checker roles in the belt. Muse/Muse Code is planned in the vision doc only.
- **Costs per month (verified in repo):** Resend $0 now (upgrade to $20 when a real detailer nears the daily cap); Supabase free tier (Pro $25 was refused); Netlify credits exceeded 1,000/month in Sept, current plan cost UNKNOWN - Andrew must answer; Telnyx one-off $4 brand fee already spent, then $15 review + $2/month campaign + ~$1/month number at launch; Cloudflare R2 ~1.5 cents per GB-month after free tier; domain cost UNKNOWN; AI tools: Claude Max plan, price UNKNOWN - Andrew must answer.

## 3. RESOURCES AND EXPERTS
- **Still needed:** (a) 2-3 real detailers to try it (a real detailer in your area; Andrew runs Andrew's Auto Detail, a real business, so start with other detailers he knows or local detailing Facebook/Instagram groups); (b) an adult or plan to activate Stripe and the legal entity (parent/guardian or wait until 18; UNKNOWN); (c) testers on real phones, esp. mid-range Android (nobody has measured); (d) the Telnyx texting setup at launch; (e) time budget for the AI tools; (f) someone to review the legal pages (Andrew's `ENTITY` line is a guess).
- **Best interviewee:** a **small-business software (SaaS) founder**, ideally one who sells to local trades (booking/CRM for salons, detailers or home services). Second choice: a **working detailer** (the customer).
- **3 questions:** (1) What made your first 3 paying customers say yes, and how did you find them? (2) What do you wish you had tested or fixed before you charged money? (3) What price would make a one-person shop say "that's a good deal" without a long sales call?
- (UNKNOWN - Andrew must answer: does he know a SaaS founder or a detailer to interview?)

## 4. TIMELINE (proposed; today is 2026-10-09; school year ends 2027-05-31)
Based on ROADMAP open items (security 0.11, R2 uploads 0.11d, test data 0.3, booking total 2.1, mail log 3.1, plus launch work). **BIG = big checkpoint.**
1. **Oct 23, 2026** - Security item 0.11 and R2 photo uploads proved and committed; Control Room stable with Codex roles fixed.
2. **Nov 6** - **[Belt]** Control Room live view and history rebuilt per `belt\PLAN.md`; Codex roles working; roadmap open items down from 58 to about 45.
3. **Nov 20** - Booking price/total and sticky-footer items (2.1, 2.1b, 2.15) done and checked on real phones.
4. **Dec 4** - Test-data cleanup (0.3) done; the two red test suites green; backup restored once (2.22). **[Auditor]** Phase 1 spec finalized: project import, fresh-context agents, findings database, cost tracking (UNKNOWN - Andrew must answer whether to build this).
5. **Dec 18 (BIG)** - **Checkpoint 1: real-detailer test #1.** 2-3 detailers use the booking page and dashboard while Andrew watches; notes saved.
6. **Jan 15, 2027** - Fixes from test #1 shipped; roadmap open items under 30. **[Auditor]** Phase 1 prototype runs a read-only audit of the detailing platform and saves findings with evidence.
7. **Jan 29** - Texting (Telnyx) and email limits sorted for launch; legal entity question answered.
8. **Feb 12 (BIG)** - **Publish to the public live site** (the first time anyone outside can sign up); founding-offer page live.
9. **Feb 26** - Stripe activated for real charges (needs the adult/entity answer); one test payment of $1 real money.
10. **Mar 12** - Onboard first detailer by hand (custom website built from the kit).
11. **Mar 26 (BIG)** - **Checkpoint 2: real-detailer test #2** on the live product; first-payment target: **first paying customer by Mar 31 (founding offer: $499 setup)**.
12. **Apr 16 (BIG)** - Fixes from test #2; roadmap open items under 10. **[Auditor]** Phase 2 demo: browser robot walks a customer booking and captures screenshots and evidence; final independent audit report on the platform (launch-blocker list).
13. **May 7** - Second and third founding customers targeted; results written up.
14. **May 21 (BIG)** - **Final demo and presentation**: live walkthrough, numbers (customers, open items, tests), what's next.

## 5. GUIDING QUESTION, TOPIC, THEME
- **Guiding question options:** (1) Can a high-school student with AI tools build and launch a software business that real detailers will pay for? (2) How can AI workers and independent AI checkers be organized so software gets finished and verified, not just written? (3) What does a car detailer need from a website and dashboard before they will pay for it?
- **Topic:** Building and launching a SaaS website-and-booking service for car detailers using an AI-run build system.
- **Theme:** Turning AI-written software into something real people can trust and pay for.

## 6. HOW I'LL KNOW IT WORKED (measurable goals, one or more per part)
1. **At least 3 real detailers signed up and paying** (the founding offer has exactly 3 spots), the first by Mar 31, 2027.
2. **A stranger (a real customer of a detailer) books a detail with no help**, start to finish, in under 5 minutes, observed at least 3 times at the real-detailer tests.
3. **Part B (belt): the roadmap goes from 58 open items to 10 or fewer by Apr 30, 2027** (the Control Room's own count; 123 done now), with the test suites green.
4. **Part C (auditor): a working prototype audits the detailing platform and produces a findings report where at least 10 findings each carry evidence and at least 5 are independently reproduced by a second agent; zero critical launch blockers remain open at the final audit.** (Goals 1-2 are Part A; 3 is Part B; 4 is Part C. The requirement was 3 goals; give all four, or merge 3 and 4 if the rubric says exactly 3.)

## 7. DESIGN (so the slides match the site)
- **Design system: "The Thread"** (`docs/design-system.md`). Rules in plain words: one dark ground (the light theme was killed); one accent color that each detailer can change; warm off-white text, never pure white; short plain sentences, no exclamation marks, no "seamless" or "effortless"; big heavy headlines; real photos, never gray placeholder boxes; avoid Inter/Roboto/Arial, purple gradients, three-evenly-spaced-cards layouts.
- **Colors (exact, from `app/src/theme.css`):**
  - Background / ground: **#0B0D0E** (ink-0). Cards/panels: **#111417** (ink-1), top of panel gradient **#171B1E**, highest surface **#1E2327**.
  - Borders / hairlines: **#272D31**; stronger line **#333B40**.
  - Main text: **#F2F1EC** ("bone", warm, never #fff); softer text **#CFD2CE**.
  - Muted text: **#939CA1** (secondary), **#7B858A** (small labels, the floor - do not go darker).
  - Accent (buttons, highlights, success): **#38E08B** mint green; deep accent **#0E5C36**; text on an accent fill **#04150C**.
  - Error / bad: **#E2705F**.
  - Light "paper" used only for sample cards: **#EFEEE7** with ink **#12161A**, muted **#565F64**, line **#D2D1C9**.
  - Primary button on the marketing page: pill, off-white (#F2F1EC) with dark text; the Control Room uses green (#38E08B family) for Start.
- **Fonts:** **Archivo** (Google Fonts, variable width 62-125, weights 100-900) for headlines and body; **JetBrains Mono** (weights 400 and 500) for numbers, prices, small caps labels. Sizes: label 11px, meta 13px, body 15px, strong 17px, title 22-30px, big figure 26-34px, display headline 30-44px (fluid). Headline weight is visibly very heavy (about 800); the exact number was not read from the code.
- **Shape:** buttons and chips fully round (100px pill); the nav bar 16px radius; panels 12px; inputs/inset blocks 8px. Thin 1px hairline borders instead of heavy outlines. Spacing scale 4 / 8 / 12 / 18 / 28 / 44 px. Soft glows tinted by the accent (warm/cool), subtle dot-grid background texture on the ground.
- **Overall look:** dark, calm and premium, like a quiet garage at night. The big warm-white headline and one mint-green accent stand out against near-black. It avoids bright gradients, stock-photo clichés, cartoon icons and generic SaaS wording. The Control Room uses the same dark mint look in a denser layout.
- **Animations / signature details:** reveal 420ms, exit 180ms, hover 180ms; elements animate in and out; a reduced-motion path (`?lite=1`); the "thread" line under tabs ("Your website / Your booking page / Your dashboard") with a green underline on the active one; phone-first 44px touch targets.
- **Logo:** there is **no brand logo by design** (white-label platform). The mark is the small favicon: dark rounded square #0B0D0E with a mint (#38E08B) car-roof curve and two wheel dots. Wordmark on the site is "DETAILING PLATFORM" in wide spaced caps. Files: `slides-assets/logo-icon-512.png` (icon); source `app/public/icon.svg`.

## 8. SCREENSHOTS (in `slides-assets/`)
- `landing-1440.png`, `landing-390.png` - marketing page, top section.
- `pricing-1440.png` - pricing page.
- `booking-page-1440.png`, `booking-page-390.png` - a detailer's public booking page (demo business "Coastline Auto Detailing").
- `example-detailer-site-1440.png` - a custom detailer website built with the kit.
- `dashboard-owner-1440-today.png`, `-calendar.png`, `-money.png`, `dashboard-owner-392-today.png`, `-392-clients.png` - owner dashboard desktop and phone width. **Taken from the repo's own earlier screenshot run (2026-09-13)** because signing in needs the demo login against the cloud database; they are real but about 4 weeks old.
- `control-room-1440.png` - the Control Room, live, 2026-10-09 (shows Item 0.11c running, 58 left / 123 done, up-next queue).

## 9. QUESTIONS ONLY ANDREW CAN ANSWER
1. What does "ICP" stand for at school, and what must the deck include per the rubric?
2. Why did you personally choose this project?
3. Do you know a SaaS founder or a working detailer you can interview?
4. How can Stripe be activated while you are under 18 (parent/guardian, or wait)? This decides the "first paying customer" date.
5. Is detailingplatform.com currently publishing from the code (the Netlify credits issue)?
6. What do you pay monthly for Netlify, the domain, and Claude Max (and any Codex plan)?
7. How much of the full "autonomous auditor GUI" vision is in this school project versus later?
8. Have any other detailers seen the product yet? Which detailers could test it, and in which city?

---
## Progress log (add lines as you go)
- 2026-10-09 - ICP defined, slide brief and screenshots saved to `slides-assets/`.
- 2026-10-09 - Rewrote brief so Part A (platform), Part B (belt/Control Room) and Part C (auditor) get equal weight; added exact folder paths.
