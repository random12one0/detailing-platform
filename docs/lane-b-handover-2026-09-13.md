# WHAT THE HONEST CHECKS FOUND IN `app/src` — for lane B, from lane C, 2026-09-13

**Written at `63509d5`, after running all 58 suites against a tree lane C did
not touch.** Nothing in here is lane C's to fix: every item is a screen, and
`app/src` is lane B's. Each one is a check that is RED TODAY and is red about
the product rather than about itself — lane C has already been through the
stale-spelling ones and closed them.

**READ THIS BEFORE LOOKING AT A RED SUITE**, because two of these are *"a
capability that has no trace in the rebuilt screen"* rather than *"a bug"*, and
the fix for one of them is to DELETE the check.

---

## 1 · THE PRICE EDITOR IS GONE FROM THE BACK OFFICE, AND THE SERVER HALF IS STILL THERE

`tests/platform-billing.test.mjs` — **1 failure of 336.**

```
FAIL  and clearing it back to the files is a real button
```

**What the check asks for, in two halves:** the server carries
`let value: PriceTable | null = null;` in `platform-admin/index.ts` — it does,
still — and `app/src/admin/AdminPage.jsx` carries `action: "prices", prices: null`,
the button that sends it. **That string is nowhere in `app/src` any more.**

**WHAT THE REBUILT SCREEN ACTUALLY HAS** is a read-only display:
`AdminPage.jsx:1321` draws a *"What we charge"* section that prints
`p?.current ?? p?.built_in` through `priceRows()` and says *"Set here,
overriding the built-in table"* or *"The built-in table · nothing is
overridden"*. **There is no editor and no clear button.** So the whole override
feature — `platform_settings.prices`, validated by `pricesFrom`, audited by
`logIt(admin, "prices", …)` — is reachable only through the API.

**HOW BAD IT IS TODAY, MEASURED RATHER THAN ASSUMED:** `platform_settings.prices`
is `null` on `kguqylyzgyzfktkfnhjb` right now, so nothing is stuck and no
detailer is being charged a number Andrew cannot see. **The loss is a
capability, not a live fault.** But the shape of the risk is the one CLAUDE.md
already names: an override set by any route at all could then never be cleared
from the screen, and `null` means *fall back to the files WHOLE*, which is the
safety valve.

**THE DECISION IS ANDREW'S AND IT IS A REAL ONE:** restore the editor, or
delete the feature and the check together. What must not happen is the third
option — a server action nobody can reach and a red check nobody reads.

## 2 · THE THIRTY IN `platform-admin`, WHICH ARE ALREADY TRIAGED

`tests/platform-admin.test.mjs` — **130 passed, 30 failed.**

**THIS NUMBER IS NOT NEW AND NOTHING ABOUT IT CHANGED TODAY.** It was 49 on
2026-09-13 morning, 43 after the first triage, and 30 after the second.
**`docs/platform-admin-triage-2026-09-13.md` § 4 is the list**, and its verdict
is that all thirty name a capability the rebuilt screen does not have.

The three biggest, with what was probed:

| check | probe | what it means |
|---|---|---|
| `the check has a strip to count` / `seven figures across the top` / `and exactly one of them is the lead` | `pa-strip` ×0, `pa-num` ×0, `pa-lead` ×0 | the Growth strip header is gone; the screen has `pa-top` and no numeral face |
| `the button warns before it acts` (impersonation) | `confirm(` ×1, `written down` ×0 | **NOT a loss.** Andrew replaced the warning with `/preview`; `AdminPage.jsx:1165` quotes him. **Three checks to retire, not a feature to restore.** |
| the 12x family — the two-column split, the 1024 collapse, the way back | | the layout the checks describe is not the layout that shipped |

**SO THE WORK IS A DECISION PER ROW, NOT A REPAIR**: for each, either the
capability comes back or the check goes. **Lane C will delete any check lane B
rules obsolete** — say which, and it is one commit in `tests/`.

## 3 · WHAT IS NOT IN HERE, DELIBERATELY

**Nothing about the tap floor, the em dash, the Spanish catalogue or the
stacking rule.** Those surfaces all have rows in `docs/VERIFIED.md` and every
one of their suites is green today: `composition` 97/0, `design-contrast` 43/0,
`spanish` clean, `landing-pricing` 109/0, `route-contract` 30/0.

**And nothing about the browser sweeps**, because lane C did not run them —
`docs/check-coverage-gaps-2026-09-13.md` says exactly which ones and why.
