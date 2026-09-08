# Session C — the plumbing: database, functions, tests, deploys, docs

**You own `supabase/**`, `tests/**`, `scripts/**` and `docs/**`** (except
`docs/tenant-sites/` and `docs/TASTE-NOTES.md`, which session A owns). **You
never write to `app/src`** — session B owns it and is running browser sweeps
that your write would silently ruin. `docs/sessions/README.md` is the table.

**Say in chat before you apply a migration or deploy a function.** The database
is the one genuinely shared thing, and session B's green test runs go stale the
moment you deploy.

---

## 1. THE FIRST JOB, AND IT BLOCKS EVERYTHING HE CAN SEE

**Nothing built since 2026-09-06 is on the live site.** Measured today:

```
live   https://detailingplatform.com  →  assets/index-nOASGAhD.js
local  npm run build --prefix app     →  assets/index-DgMEktHO.js
```

Different bundles. **The cause is Netlify build credits**, not a disconnected
repo — a deploy triggered on purpose returned
`state: error, skipped: true, "Skipped due to account credit usage exceeded"`.
Every push since has been silently SKIPPED, which from outside looks exactly
like a repo that was never connected.

**The route that needs no build credits** — it uploads files that are already
built, skipping Netlify's build system entirely:

```bash
npm run build --prefix app
npx netlify deploy --prod --dir=app/dist
```

It asks him to log in once. **Nothing in this repo holds a Netlify token**, so
if it needs one, that is a question for him and not something to work around.

**Before any deploy attempt, check the tree size.** `du -sh .` — the tool zips
the WORKING DIRECTORY, not the git tree, so `.gitignore` does not save you. It
was 1.3 GB and returned 500 twice. Keep it under ~300 MB; move scratch
screenshot folders to `../_repo-shots-archive/`.

**And `curl` cannot tell you whether a deploy worked.** `_redirects` sends every
unmatched path to `index.html`, so every URL on that domain returns 200
including ones that do not exist. **Compare the bundle hash** — that is the
command above, and it is the only honest answer.

---

## 2. What is actually left, in the order to do it

| | Item | Notes |
|---|---|---|
| **1** | **The deploy, above.** | Everything he can see depends on it. |
| **2** | **Roadmap 2.22 — restore a backup once.** `[~]` until somebody does. The repo, the workflow and one real 714 KB encrypted dump all exist and are proven; **nothing has ever been restored, and a backup nobody has restored is not a backup.** Needs a scratch Supabase project and the age private key, which is in his password manager and deliberately nowhere else. | `docs/ops/backups.md` — **but that file is WRONG** and describes a symmetric passphrase. Fix or delete it first (coworker report § 3, correction 5). |
| **3** | **`HEALTHCHECK_URL` is unset**, so the backup's "tell the outage watcher" step is a no-op and a backup that stops will stop silently. Five minutes on healthchecks.io. **Not the same URL as `platform_settings.healthcheck_url`.** | `docs/ops/monitoring.md` |
| **4** | **Roadmap 8.17 stage 2b — the Spanish width sweep**, which has never passed at all five widths. Commit `294a7eb` says so. | |
| **5** | **Roadmap 6.1 / 6.2 — a believable demo business** with ~3 months of obviously-fictional history and a reset script. **This is what he shows a prospect on a sales call**, so it is worth more than its position suggests. | |
| **6** | **Roadmap 7.2 — Sentry.** Blocked on his DSN. Free account. | |
| **7** | **Roadmap 8.9 — the advanced money view.** Blocked: three of his six figures are TIP figures and a customer-entered tip does not exist yet. | `money-view-research-2026-09-07.md` § 6 |
| **8** | **Roadmap 5.1–5.3 — copying his real business across for dogfooding.** The mapping is written and tested (47 checks); the I/O half has never run. **HOLD IT.** It needs a key to a business taking real money and **he has deliberately not shared it. Do not ask for it.** | |

---

## 3. Two measurements somebody has to take

Both are one minute and both are currently making a screen lie.

1. **Read Resend's actual plan** at `resend.com/settings/billing`. The account
   sent **200 emails on 7 Sep and 110 on 6 Sep, all delivered** — both above
   the 100/day free cap this product's counter is built against. So either he
   is not on the free plan, or **the back office's *"Emails: N of 100 today"*
   is reddening against a limit that does not exist.**
2. **Count the Stripe webhook's events.** The coworker measured **six**;
   every document here says five. `invoice.payment_succeeded` is present and
   undocumented. Harmless — `stripe-webhook` already handles it — but every
   doc naming five is short by one.

---

## 4. The docs passes, and they are real work

**Better means shorter and truer, never longer.** The most repeated defect in
this repository is a file confidently describing something that stopped being
true — nine such beliefs were found in one pass, fifteen check counts in
another.

- **`docs/README.md` is the map.** Keep its tiers honest as things move.
- **`CLAUDE.md` is 66 KB and must stay there.** It was 232 KB until 2026-09-08,
  which cost ~42,000 tokens of context in every session before a word of work
  was read. The Verification section moved to `docs/verification.md` unedited.
  **Anything that belongs in a reference goes in a reference.**
- **`docs/verification.md` holds a lot of PRODUCT facts filed under a
  verification heading by accident** — multi-vehicle, plans, the two-login park,
  Spanish, promo codes, the dead man's switch. Moving them into a
  `docs/features.md` would be a real improvement. **Move, never rewrite.**
- **Pick a claim and MEASURE it.** A count, a list of call sites, "X is the only
  place that Y". Correct the file and say IN the file how you measured it.
- **`docs/ops/backups.md` is known wrong.** Start there.
- **`docs/owner-setup-prompt.md` is spent** — re-issuing it cost him a cleanup
  (a second Google Cloud project he had to delete). Mark it or delete it.

---

## 5. Before you finish

```bash
set -a; . ./.env; set +a
for f in tests/*.test.mjs; do echo "$f"; node "$f" | tail -1; done
node scripts/check-deployed.mjs
node scripts/db-audit.mjs
node scripts/decisions-index.mjs      # if you touched DECISIONS.md
```

**Commit before you baseline a check.** The baseline loop reverts with
`git checkout --`, and on uncommitted work that deletes the feature. The tell
is the restored run: always take one.

`docs/verification.md` has the whole battery and every trap in it.
