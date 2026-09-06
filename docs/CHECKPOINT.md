# Checkpoint — 2026-09-06

**The one living "where are we" file.** Overwritten at each checkpoint, never
appended to. It is a POINTER: `docs/roadmap.md` is the plan, `PROJECT-STATE.md`
is the technical state, `docs/overnight-log.md` is the plain-language account
and holds every open question. Nothing here restates them.

---

## Where we are

**43 of 54 roadmap items ticked. The platform is LIVE.**

`main` was fast-forwarded 164 commits and pushed on 2026-09-06. Netlify built
it; **the bundle hash on https://detailingplatform.com matches the local build
byte for byte**, so the live site is running everything below.

- **detailingplatform.com** — the platform (site `detailplatform-admin-test`)
- **andrewsdetail.com** — the OWNER'S LIVE BUSINESS, site `andrewsauto`.
  **Nothing in this repo deploys there. Do not touch it.**

### What is verified, as of this checkpoint

31 test suites green · booking run 82/82 · width sweep clean at 1920 / 1440 /
392 / 360 / 320 · 25 emails rendered · all 28 edge functions current with the
repo (`node scripts/check-deployed.mjs`).

---

## What is next — in roadmap order

### Buildable without the owner

**Nothing substantial.** This is the fact that shapes the next session, and it
is why the last stretch drifted (see below). The remaining eleven items are
either owner-blocked or owner-decisions.

The honest list of work that does NOT need him:

1. **The free SMS path** (`docs/detailer-dashboard-audit-2026-09-06.md` §3.3) —
   a button that opens the detailer's own messaging app with the text written.
   No provider, no cost, no carrier registration. Costed and recommended; not
   built.
2. **The review ask** (§3.2) — a message the day a job is marked complete.
   Nearly free; the event already fires.
3. **The next job's address as a map link** (§3.4).

### Blocked on the owner, with what each needs

| Item | What unblocks it |
|---|---|
| **5.1 migration** | `LEGACY_SUPABASE_URL` + `LEGACY_SERVICE_KEY` in `.env`. The mapping is verified against the real schema; only the run is missing. |
| **Job photos → Cloudflare R2** | Four values in `.env` (account id, bucket, key id, secret). Until then the share is 10 MB each, which is too small to use. |
| **2.20 stage 3** | Stripe Connect switched on. The payment rule is DECIDED (three modes, per detailer, default pay-after). |
| **2.22 backups** | Two GitHub secrets. Written and documented — `docs/ops/backups.md`. |
| **2.25 sign-up screen / 6.1 demo site** | His taste. Question 0 — two or three detailer sites whose look he likes. |
| **7.2 Sentry** | A DSN. |
| **7.4, 5.2, 5.3** | Marked OWNER, or wait on 5.1. |
| **4.2's last two** | Wait on 2.20 stage 3. |

**Every question is written up in `docs/overnight-log.md`** under "Questions
parked for the owner", with a recommendation attached to each.

---

## The testing loop — ONE LAP RUN, 2026-09-06

`docs/testing/LOOP.md` is the protocol, `docs/testing/FINDINGS.md` the
catalogue, and **`docs/testing/REPORT.md` is the thing to read** — its first
section is what needs the owner and nothing else can move without him.

**Six passes: D1 (a brand-new detailer), O2 (the back office), A1-A5 (the
adversary), C7 (a customer on a bad connection), the code's own failure paths,
and §5 — two detailers signed in at once, in two browsers, which §5 calls
mandatory every lap and which had never been done.**

**Thirty-three findings, nineteen fixed in the pass that found them, six of
them blocks-launch.** Five of those six were invisible from every screen in
the product AND from every check in this repo, which is the pattern §0 of
LOOP.md predicts:

- Pressing **Continue** on the setup form's hours step **destroyed a
  detailer's real hours** — the editor opened on a hardcoded Mon-Fri 9-5 and
  wrote it over the top (F-001).
- **Continue marked a question answered with nothing on screen**, so seven
  taps reported *7 of 7 done* on a business that had answered one. The *"2 of
  7"* defect the owner found, inverted (F-002).
- A detailer who **chose a paid plan never saw the payment screen**, and no
  screen has a word for "never subscribed" (F-003).
- **A dropped reply made a real booking look failed**, and the retry told the
  customer a stranger had taken their slot (F-022).
- **Our own daily email cap marked real customers as bounced, permanently** —
  a 429 was being read as "this address is wrong" (F-025).
- **A failed membership insert locked somebody out of their own business for
  ever**, with no screen able to show it and no button able to undo it
  (F-026).

Plus the back office, which **could not tell a test business from a real
detailer**: the headline read *"Detailers 15"* on a platform with none, and
*Needs a look* was eight rows of fixtures (F-014).

**Two new scripts, both committed and reproducible:**
`scripts/adversary-probe.mjs` (50 checks — nothing leaks to a stranger) and
`scripts/two-detailers.mjs` (25 checks — nothing of one detailer ever reaches
the other, in two live browsers). The second exists because
`seed-two-tenants.mjs` makes two businesses and **no logins**, so §5's own
first instruction was not possible with the fixture §5 names (F-031).

**`docs/testing/REPORT.md` §5 is the brainstorm** the owner asked for: fifty
ideas, each citing the finding or the moment that motivated it, costs named.

## The process failure this checkpoint exists to correct

**2026-09-06: the session drifted from the roadmap into reacting to whatever
the last message said.** Job photos, the back office rebuild, R2, an intake
form, a screenshot gallery — all real work, most of it good, **none of it from
the roadmap**, and it happened because the roadmap's unblocked surface had run
out and nothing said so out loud.

Two specific costs:

- **A screenshot gallery was started when the answer was a URL.** The overnight
  guardrail "never push to main" had been carried past the night it was written
  for, and **pushing to main IS the deploy** — so the way to show him the whole
  product was one push, not sixty JPEGs.
- The width sweep was run four times because source was edited while it ran —
  a rule written in CLAUDE.md and broken twice in one morning.

**The rule for the next session:** when the roadmap has nothing unblocked left,
**say so and stop**, rather than inventing adjacent work. New work that is not
on the roadmap goes ON the roadmap first, or it is not tracked and nobody can
see what it cost.

---

## Standing facts a new session gets wrong

- **`main` is the deploy.** Push to it and detailingplatform.com rebuilds.
  There is no separate publish step.
- **The overnight guardrails were for one night** (2026-09-05/06) and are spent.
  The permanent ones: never write to the live business Supabase project, never
  deploy to `andrewsauto`, and do not rebuild the three pages in
  `docs/tenant-sites/` or use them as a taste reference.
- **Edge functions drift silently.** `check-deployed.mjs` after any change to
  `supabase/functions/`, and re-run the env-backed suites AFTER deploying —
  before that, they were green against the old copy.
- **Never edit anything under `app/src` while `sweep-widths.mjs` is running.**
  It throws its own results away, correctly, and the run is five minutes.
