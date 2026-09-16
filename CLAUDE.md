# Detailing Platform

A booking and business-management SaaS for car detailers. Each detailer (a
"tenant") gets a dashboard, a public booking page, optionally their own website
and their own domain. React + Vite front end, Supabase (Postgres + edge
functions) back end, Netlify hosting, Resend for email, Stripe for payments.

**Andrew owns this and directs the work. There are no session roles, no lanes
and no folder ownership — that experiment ended 2026-09-16. Any session can
work anywhere in the repo.** The old rulebook is kept at
`docs/archive/CLAUDE-2026-09-16-pre-reset.md` if the history is ever needed.

## How we work

One item at a time. Build it, verify it against the real thing, show Andrew the
evidence, check it off. Don't batch. Don't start the next item before the
current one is proven. If two documents disagree, say so out loud rather than
quietly picking one.

Andrew is not a programmer. Explain in plain words, define any term the first
time it appears, and never hand over a decision without what he needs to make
it: what the thing is, what happens either way, and your recommendation.

## Commands

```bash
npm run dev --prefix app                  # dev server on :5173
npm run build --prefix app                # production bundle -> app/dist
node --test tests/                        # all test suites
node scripts/seed-demo.mjs                # demo tenant the suites sign in as
node scripts/build-examples.mjs --dev     # example tenant sites at /ex1../ex5
node scripts/context-check.mjs            # real context usage for this session
```

Env-backed scripts need credentials loaded first, or eleven of them print
`Missing SUPABASE_URL` and it reads as a broken environment rather than as a
script that never ran:

```bash
set -a; . ./.env; set +a
```

## Verification

| After changing | Run |
|---|---|
| **Anything, before you finish** | `composition`, `design-contrast`, `landing-pricing`, `route-contract` — credential-free, from repo root |
| Color or ground tokens | `node scripts/accent-sweep.mjs` |
| An edge function | `node scripts/deploy-functions.mjs …` then `node scripts/check-deployed.mjs` |
| A layout | `node scripts/sweep-widths.mjs` (needs dev server + seed) |
| The booking widget | `node scripts/sweep-booking-steps.mjs` |
| Anything on a customer's or booking's path | `node scripts/e2e-booking.mjs` |
| An email | `node scripts/render-emails.mjs` |
| A migration | `node scripts/db-audit.mjs` |

**Report what you observed, never "this should work."** A skipped check reads
exactly like a passing one — this repo's single most repeated failure. A guard
that skips must print that it skipped.

**Break a check on purpose before you trust it.** This repo has shipped at
least six checks that tested nothing. `sweep-widths.mjs` once printed *clean*
over 38 real findings.

**Don't edit `app/src` while a browser script is running.** Vite reloads the
page mid-run and the measurement is worth nothing while still reporting clean.

**`docs/gotchas.md` is fifteen specific ways a measurement lies to you** — a
closed `<details>` still measuring its children, `innerText` swallowing
`<option>` values, a backgrounded tab freezing animations, a stale dev server
serving old CSS, a grep-based check coupled to a spelling rather than a
behavior. Read it before trusting any browser number. Every entry cost
somebody real time.

## Hard rules

- **Never write to the live business project `adtlnvihwrcqcasqcjwd`.** That is
  Andrew's real detailing business taking real customers' money. Reads are
  fine; writes only with his explicit go-ahead for that specific action.
- **Migrations are append-only.** Never edit an existing one.
- **Never commit `app/.env.production` or any credential.** No password, token
  or key goes into a markdown file either — say where it lives, not what it is.
- **`reference/` is read-only.** It is the old site, kept as canon.
- Consequential writes go through edge functions, not the browser client.
- Working branch is `main`. Ask before merging anything large into it.

## Conventions that break the defaults

- **American English in everything a person reads** — color, license, check,
  odor, tires, hood, parking lot. Two exceptions that are data rather than
  spelling: `"cancelled"` is the database's own value across five tables, and
  `"colour"` is a setup-step key stored on every business. Renaming either
  breaks live data.
- **Changing an English string means changing its Spanish key in the same
  edit.** `app/src/lib/strings/appEs.js` is keyed on the English text, so a
  renamed string silently falls back to English with no error anywhere.
  `node scripts/i18n-survey.mjs` finds them afterwards.
- **`app/src/book/core.js` has no `import` statements of any kind** and must
  stay that way — it is the booking rules, droppable into a tenant's own site
  built on anything. `tests/booking-core.test.mjs` enforces it by reading the
  file as text. New booking rules go in there; the page calls them.
- **Reach for `app/src/components/controls.jsx` before writing a component.**
  `Setting`, `Switch`, `Segmented`, `DurationChoice`, `Stepper`, `MoneyField`,
  `HourChoice`, `Group`, `PasswordInput`, `Folded`.
- **One formatter each.** `app/src/lib/format.js` holds `money`, `time12`,
  `duration`, `dateLong`, `localDate`, `localTime`. There is still no phone
  formatter; when one is needed it goes there.
- **Two to five mutually exclusive choices is a segmented control, never a
  native `<select>`.** A mapped or searchable list (the timezone picker) is
  exempt and the test already knows.

## Design

`docs/design-system.md` is the system. The reference rendering is
`docs/design-directions/5-the-thread.html`, and where the document and that
page disagree, the page is right.

Absolutes:

- **44px of real hit area.** A deliberately small mark (a 7px rail dot, a color
  swatch) keeps its size and grows its target with an absolutely positioned
  `::after` negative inset. A bounding rect cannot measure this — probe with
  `elementFromPoint`, and check the pitch too, or two 32px targets 18px apart
  steal each other's presses.
- **Verify by looking**: screenshot 1920 / 1440x900 / 768x1024 / 392x844, read
  the console at each, in the normal path and `?lite=1`. 320px is the narrowest
  supported width and `sweep-widths.mjs` sweeps it by default.
- **A phone stays portrait.** Rotating it changes nothing — every `min-width`
  breakpoint that spends height carries `and (min-height: 500px)`.
- **Anything that opens, animates in, and ships its exit in the same change.**
  `.split > .col-2` already carries `column-in`/`column-out`;
  `hooks/useLeaving.js` is the exit. Don't invent a second mechanism.
- **Never-defaults**: Inter/Roboto/Arial/system-ui/Space Grotesk as a design
  choice, purple-blue gradients on white, three evenly spaced cards, numbered
  markers on non-sequences, "modern and clean" copy, and copy that explains
  what the label already said.
- **Plain, direct voice.** Short declarative sentences, one fact each. No
  exclamation marks, nothing "seamless" or "effortless". The writing already in
  this product — the "Your web address" screen, the FAQ answers — is the target.
- **Never a gray placeholder box.** An Unsplash connector is wired up. If it
  can't find the right shot, ask Andrew — he would rather go source an image
  than have the work limited by what is to hand.

`docs/screen-rules.md` is Andrew's own rulings from reviewing about 35 screens:
the exhaustion test, section eyebrows, field sizing, the destructive-action
pattern, the em-dash rules. Read it before calling a screen finished.

`docs/TASTE-NOTES.md` is what he actually likes, from sites he sent unprompted.
It outranks any inference about his taste written anywhere else.

## Where the knowledge lives

This repo holds about 930,000 words of markdown. Nobody reads it end to end.
Open a long file only when the work touches its subject.

| File | What it is |
|---|---|
| `docs/README.md` | The map — what every document is and whether it is still true |
| `PROJECT-STATE.md` | Full state briefing; §1–7 only, the rest is a journal |
| `ROADMAP.md` | **The live fix queue — start here.** 79 open items from two audits |
| `docs/audits/` | The two September 2026 live-site audits the queue is built from |
| `docs/roadmap.md` | The long build history |
| `FOUND.md` | Known problems parked, not yet fixed |
| `DECISIONS.md` | Every judgment call and why. **Start at its index** — it is 186,000 words |
| `docs/VERIFIED.md` | What has been proven, when, and at which commit |
| `docs/gotchas.md` | How measurements lie |
| `docs/screen-rules.md` | Screen-level design rulings |
| `docs/tenant-site-kit.md` | The brief for building a client's own website |

Appending to `DECISIONS.md` means adding your line to its index in the same
edit — `node scripts/decisions-index.mjs` exits 1 if you forget. Mark
superseded entries rather than deleting them; the reversal is usually the
load-bearing part.

## Publishing

A push to `main` may or may not publish. Netlify build credits ran out, and the
state has flipped twice without anybody editing the note that claimed it.
**Measure it rather than believing a document:**

```bash
curl -s https://detailingplatform.com/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'
npm run build --prefix app && ls app/dist/assets/*.js
```

Same hash means a push publishes. A different hash means publishing is blocked.
`curl` cannot answer it any other way — `_redirects` sends every unmatched path
to `index.html`, so every URL on that domain returns 200, including ones that
do not exist.

A production deploy costs 15 credits; a **branch deploy or deploy preview costs
zero**, and a preview is a real URL Andrew can open on his phone.

The example tenant sites are a localhost thing: `build-examples.mjs --dev`,
then `localhost:5173/ex1` … `/ex5`.
