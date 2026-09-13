# THE TOUR KEEPS COMING BACK — diagnosed 2026-09-13, and the fix is lane B's

**Andrew, using the product:** *"I keep having this glitch that keeps showing me
the tour of every single page. Like, every time I go back to it — or not every
time, but it keeps giving me the tour even though I've already said skip."*

**Lane: the fault is entirely in `app/src`. Lane C wrote the diagnosis, the
failing check and the migration; lane B writes the patch.**

**AND THE SHAPE OF THE PATCH IS SETTLED — § 5 IS AN INSTRUCTION, NOT A
PROPOSAL.** Andrew decided it on 2026-09-13: one dismissal silences all six
guides, and *Show me around* in the gear menu is the way back in. Nothing in
§ 5 is an owner decision waiting to be taken.

---

## 1 · WHERE THE FACT THAT HE HAS SEEN IT LIVES

One place, and one only:

```
localStorage["dp.tours"]   // a JSON array of guide names
localStorage["dp.tour"]    // the legacy single flag, still read on the way in
```

`app/src/App.jsx:58-73` — `seenTours()`, `markTourSeen(name)`, `tourSeen(name)`.
Nothing else in the product writes either key. **There is no server-side record
of any kind.**

**There are SIX guides**, not one: `shell` (the first-run walk of the rail) and
five tab guides — `today`, `calendar`, `money`, `clients`, `business` — plus
`settings`, which only ever runs inside the whole-dashboard tour. `TOURS` and
`GRAND` in `app/src/components/Walkthrough.jsx:112,246`.

**Nothing silently resets it.** `dp.tours` is never removed by any product code;
the only `removeItem` calls in `app/src` are for parked sessions, the preferred
business, impersonation and the preview flag. Three verification scripts remove
it, and they run against their own browser profile. **So the replay is not a
reset — it is a record that was never written.**

## 2 · THE EXACT TRIGGER — two of them, and they are different bugs

### TRIGGER 1 — Skip records ONE guide out of six. This is "the tour of every single page."

`markTourSeen` writes the name of the guide that was on screen and nothing else.
Skipping the first-run guide writes `["shell"]`. The other five are untouched
and each one arrives **900ms after the first time that tab is pressed**
(`App.jsx:602-604`).

Measured by lifting `App.jsx`'s own bookkeeping out and running it —
`tests/tours.test.mjs` § 6c:

```
Skip the SHELL tour:  dp.tours = ["shell"]
  press today     -> A TOUR OPENS
  press calendar  -> A TOUR OPENS
  press money     -> A TOUR OPENS
  press clients   -> A TOUR OPENS
  press business  -> A TOUR OPENS
  => 5 further tours after he pressed Skip once.
```

**It takes six separate Skips to be rid of them**, and the sixth is only
reachable by pressing every tab. The one door that does silence everything is
the gear's *Show me around*, because `App.jsx:650` marks `[...GRAND, "shell"]` in
one go — so the tour he never asked for is final and the one he did ask for is
not.

**Reproduction, from a browser that has never opened the dashboard:**

1. `localStorage.clear()`, reload `/app`.
2. The first-run guide appears. Press **Skip the tour**.
3. Press **Calendar** in the tab bar. Wait one second. **A guide appears.**
4. Press Skip. Press **Money**. Wait one second. **A guide appears.**
5. Repeat for Clients and Business. Five guides after one Skip.

### TRIGGER 2 — a queued guide is thrown away unrecorded. This is "not every time."

`App.jsx:603` arms the guide with a bare `setTimeout` that **is never cleared**,
and the setter behind it is `setTabTour((cur) => cur ?? x.key)`. So pressing a
second tab inside the window:

- the FIRST tab's guide opens **on the screen he has since moved to**, plans
  against targets that are not there, shows a blank dim for up to
  `PLAN_GIVE_UP_MS` (4000ms) and leaves through `onEmpty`;
- `onEmpty` **deliberately does not record it** (`App.jsx:643`, decision 6 —
  correct for an empty dashboard, wrong here);
- the SECOND tab's guide is silently discarded by `cur ?? x.key` and is **also**
  never recorded.

**Both tabs therefore replay on the next visit.** Measured — the two lines
transcribed verbatim and driven with a modelled timer:

```
t=900   on screen: clients          (he is standing on Money)
t=1200  on screen: clients          <- money's timer fired and was DISCARDED
skip -> marked "clients"
dp.tours = ["clients"]
money still unseen? true            -> its tour returns on the next visit
```

That is the intermittency: it depends on how fast he moves between tabs, and on
whether a screen's data settles inside four seconds.

### TRIGGER 3 — the record is per browser, so it is never true on the next device

Deliberate, and `App.jsx:46-57` argues for it. It means a skip on the laptop is
worth nothing on the phone, nothing in a private window, and **nothing on a
second origin — `localhost:5173` and `detailingplatform.com` are two separate
stores.** His instruction is that dismissal be final for the person.

## 3 · WHAT WAS RULED OUT, BY MEASUREMENT

| candidate | verdict |
|---|---|
| skip and finish write different flags | **No.** Both go through `Walkthrough`'s single `close()` (`Walkthrough.jsx:336,760`) and both reach the same `onClose`. |
| the flag is keyed on route / tab / tenant / language / a version string | **No.** The key is the literal `"dp.tours"`, and the names are the six guide names, which have not changed. |
| the write happens after an unmount | **No.** `close()` fires `onClose` on a 180ms timer that survives unmount, and `markTourSeen` is synchronous. |
| written but read before it loads | **No.** `localStorage` is synchronous; `seenTours()` re-reads on every call. |
| something silently clears it | **No.** No product code removes either key. |

## 4 · THE CHECK THAT SHOULD HAVE CAUGHT IT, AND WHY IT DID NOT

`tests/tours.test.mjs` was **19 passed, 0 failed** while the guides replayed.
Sections 1–5 check the *shape* of the guides — which tabs have one, where their
steps point, that no guide wanders off its own screen. **Not one of them asked
whether a dismissal survives.**

§ 6 now does, and it **runs App.jsx's own bookkeeping** rather than grepping for
it (trap (k)). It is baselined both ways: red against the product as it stands,
green against a copy of `App.jsx` whose `markTourSeen` writes every name.

```
6a · the tour bookkeeping was found and lifted out of App.jsx   ok
6b · the harness can tell seen from unseen                      ok
6c · one dismissal silences every guide, not just the one       FAIL  5 still armed
6d · the dismissal is recorded for the person, not the browser  FAIL
6e · the timer that arms a tab guide can be cancelled           FAIL
```

**Those three are red on purpose and go green when the patch below lands.**
`tours.test.mjs` is not one of the four credential-free suites that must pass
before finishing, so the standing battery is unaffected.

## 5 · THE PATCH — lane B, `app/src/App.jsx`

### THIS IS DECIDED. IT IS NOT A RECOMMENDATION AND THERE IS NOTHING HERE TO CHOOSE.

**Andrew ruled on it on 2026-09-13, in the prompt that opened the lane C session
that wrote this line: *"DECIDED, and yes: one dismissal silences all six tours,
with the gear menu's 'Show me around' as the way back in."*** He had already
said what the complaint was — he skipped the guide and five more were still
queued behind the tabs — so the scope of the fix is the scope of the
complaint, and the way back in is the gear.

**LANE B: BUILD (a), (b) AND (c) BELOW AS WRITTEN.** Do not open a question
about whether six flags should stay six, do not ask whether the server row is
wanted, and do not hand any of it back as an owner decision. **The only things
still open are the two named under WHAT MUST NOT CHANGE at the end of this
section**, and both are instructions to leave something alone.


**(a) One dismissal, not six.** Skip or finish, any guide, records that this
person is done. `markTourSeen` stops taking a name; `tourSeen()` stops taking
one. *Show me around* is already exempt — `tours.test.mjs` § 3 requires a guide
asked for by hand to run whether or not it has been seen — so the gear stays the
way back in.

**(b) Write it for the PERSON as well as the browser.** The table is built and
waiting: `supabase/migrations/20260913060000_a_guide_dismissed_once_is_dismissed_everywhere.sql`.

```
public.user_tours (user_id uuid primary key, dismissed_at timestamptz)
```

**A row that exists means this person is done being shown around.** No list, no
booleans, nothing to merge — which is the whole of what caused trigger 1. RLS is
`user_id = auth.uid()` on select and insert; there is no update or delete policy
because there is no column worth rewriting and nothing needs to un-say it.

Wiring: on sign-in, one `select` — a row found means dismissed, and mirror it
into `localStorage` so the guide never flashes on a later load. On dismissal,
write `localStorage` first (instant) and `insert … on conflict do nothing`
fire-and-forget. **A failed insert must not block the dismissal** — the device
flag already holds it, and the next dismissal tries again.

**(c) Cancel the armed timer.** Keep the handle in a ref and `clearTimeout` it at
the top of the tab's `onClick`. Two lines. With (a) this matters less for the
replay, but it is what stops a guide opening over the wrong screen and sitting
there as a blank dim for four seconds.

**WHAT MUST NOT CHANGE:** `onEmpty` still records nothing (decision 6 — a
dashboard with nothing on it gets the guide the first day there is something to
point at), and a guide asked for by hand still runs.
