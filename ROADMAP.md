# What comes next

**THE SINGLE SOURCE OF WHAT IS LEFT, IN ORDER. Created 2026-09-12.**

This file exists because a worklist lived in a conversation and in a file only
one side could read, and a `/clear` would have taken it. The rules live in
`CLAUDE.md`, the parked finds live in `FOUND.md`, the history lives in the
commits, and **what comes next lives here.** One line each, in the order they
get done. Tick a line by deleting it and letting the commit be the record.

`docs/roadmap.md` is the PRODUCT roadmap, phases 0–9, and still outranks this
for anything it names. This file is the current run of polish work in front of
it.

---

## Next, in order

1. ~~Wave F — the em dash sweep, all three categories.~~ **DONE 2026-09-12.**
   Zero single em dashes left in any user-facing string; the eight
   parenthetical pairs stand.
2. **Setup step 11 and two touch targets.** Step 11 is five 467px template
   cards, 2,980px and 62 buttons on the last screen of onboarding — one open,
   four as `Folded` rows reading *"Ask about access · Not changed yet"*. Plus
   the 28px checkbox row wherever the dashboard renders one (Promo codes, setup
   step 9), and the unnamed switch on *How you get paid*.
3. **The platform landing page, three items.** 42 figcaptions at 9px against an
   11px floor; the corner labels at 8.5px including `0% · ALWAYS` under
   `// COMMISSION`, which is the strongest line this product has, set smaller
   than anything else on the page; and the masthead wordmark at 130x17 on every
   platform page, which is the go-home target on a phone.
4. **Spanish: 139 to zero.** `scripts/i18n-coverage.mjs` counts it and
   `tests/spanish.test.mjs` § 9 holds the ceiling. **Step the ceiling down as
   you go.** Worst first: `SiteIntake.jsx` 58, `AdvancedMoney.jsx` 47,
   `Payments.jsx` 10, `WebAddress.jsx` 7, `ReportProblem.jsx` 6, `Money.jsx` 5.
5. **Mileage.**
6. **Route awareness.**
7. **Weather, from open-meteo.**
8. **Deposits.**
9. **Making photos do work.**
10. **Quote from scratch.**

---

## Not ours to decide — waiting on Andrew

- **The unsubscribe page's accent.** The reviewer's diagnosis is right and one
  bug, not two: the page never loads the business context, so it has no
  masthead colour. But `UnsubscribePage.jsx`'s header records the OPPOSITE as a
  deliberate decision — platform colours, because this is the customer stepping
  away and dressing that in the detailer's branding uses their colour to make
  something harder. **Andrew's to settle**, and it needs an edge-function
  change either way (`unsubscribe-lookup` returns a name and nothing else).
- **The five example sites and four guided tours that nobody has walked.**

---

## Red, and unexplained all day

- **`platform-admin`, 46 failing.** Sampled on 2026-09-11: a mix of checks
  pointing at source that MOVED (`AdminPage.jsx` 1,436 → 813 lines plus
  `PreviewEntry.jsx`) and checks enforcing rules the owner has since REVERSED
  (`check("no chart")` fails because a chart was deliberately built at his
  request). **Somebody has to sort which is which, one failure at a time** —
  a suite this red gets ignored wholesale, and the one real regression hiding
  in 46 stale checks is the reason that matters. Lane C.
- **`password-reset`, 3 failing.** Two are probably the 10-character rule
  landing while the checks still assert eight. **The third is the dangerous
  one:** the three selectors five browser scripts sign in through. Lane C.

---

## The standing instruments

Run these rather than trusting a number written in prose — every check count in
this repo has been wrong at least once.

| | |
|---|---|
| `composition`, `design-contrast`, `landing-pricing`, `route-contract` | credential-free, must pass before any wave is finished |
| `booking-core` | includes § 14, the calendar's stale-answer guard |
| `spanish` | includes § 9, the coverage ratchet |
| `scripts/i18n-coverage.mjs` | the count, with `--list` for every gap |
| `scripts/lane-check.mjs <lane>` | before every `git add` |

**`scripts/sweep-widths.mjs:605` still prints "clean" whatever it measures**
(`found += await say(...)` where `say` returns undefined). Do not trust it
until that is fixed. Lane C, in `FOUND.md`.
