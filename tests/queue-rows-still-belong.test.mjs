// THE WORK QUEUE RE-PROVES ITSELF, ROW BY ROW.
//
// Run: node --test tests/queue-rows-still-belong.test.mjs
//      Credential-free except row 14.26, which says so and is reported by name
//      rather than skipped.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS — a derived list rots, and this one rotted in ninety minutes
// ---------------------------------------------------------------------------
// `docs/open-items-read-as-a-stranger-2026-09-25.md` carries a work queue: the
// open roadmap items ready to hand to the build lane, cheapest first. **Derived
// lists rot in this repo** — 12.2 and 7.8 both described a product that had
// changed under them, and both were caught by running a command rather than by
// re-reading.
//
// **The queue rotted faster than either.** Row 1 was 9.11's first clause:
// *"nothing to build — the receipt still reads `"status": "fail"` over a
// `git_sha` that is an ANCESTOR of the fix."* **Ninety minutes after it was
// written the other lane re-ran the sweep**, so the receipt carried
// `git_sha 50767da` (that hour's HEAD) and the clause was met. The manager was
// about to hand the row out.
//
// **AND THE PART A READING COULD NEVER HAVE CAUGHT: the receipt said `fail`
// before and says `fail` now, and they are different fails.** A stale red over
// an ancestor sha became a **live** red with two real findings — `guide ·
// calendar 5` at 1920, *"the whole page can be dragged sideways, +51px"*. **Same
// word, opposite meaning.** That is why the clause was written about the **sha**
// and not about the **status**, and it is why this file exists: a command can
// tell those apart and a sentence cannot.
//
// ---------------------------------------------------------------------------
// THE CONVENTION, which needs no interpreting
// ---------------------------------------------------------------------------
// Each row declares a command. **`exit 0` means the row STILL BELONGS in the
// queue. Non-zero means it has MOVED** — done, changed, or overtaken — **and the
// queue must be updated before anybody is handed that row.**
//
// Several commands are deliberately inverted (`! grep …`) so that *the fault
// still being present* is the success case. That reads oddly on purpose: **what
// is being re-proved is the ROW'S MEMBERSHIP, not the product's health.**
//
// ---------------------------------------------------------------------------
// THREE THINGS IT MUST DO, OR IT IS FURNITURE
// ---------------------------------------------------------------------------
// 1. **Report PER ROW.** One red hiding nine greens tells nobody which row to
//    look at, so every row is its own subtest named by item.
// 2. **Declare the row count and fail if it finds fewer** (`EXPECTED_ROWS`).
//    **A table that stops being parsed must not read as all-clear** — this
//    repo's most repeated fault, and the reason `OPEN_FLOOR` exists in
//    `every-open-item-is-citable`.
// 3. **The rows with no command print as UNVERIFIABLE by name**, never silently
//    skipped and never counted as passing. Two rows are in that state and both
//    say why.
//
// ---------------------------------------------------------------------------
// EVERY COMMAND WAS EXECUTED BEFORE IT WAS WRITTEN DOWN, AND ONE OF TEN FAILED
// THAT TEST
// ---------------------------------------------------------------------------
// Row 3.4c's first command probed `2026-10-12` — the ISO date the entry proposes
// as the **fix** — rather than `"12 October 2026"`, the literal that is actually
// in `scripts/render-emails.mjs`. **It exited 1 and would have retired a live
// row.** It was caught because the commands were run, not reasoned.
//
// **One in ten wrong, written by somebody who knew exactly what each one meant.**
// That rate is the argument for the rule.
//
// ---------------------------------------------------------------------------
// BROKEN ON PURPOSE — 2026-10-03
// ---------------------------------------------------------------------------
// `QUEUE_FLIP=<id>` inverts that one row's expectation, so a row that currently
// belongs is asserted to have moved. **The run must go red and name that row and
// no other.** What was flipped and what it printed is in ROADMAP 14.29.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// Declared, not derived. 12 rows in the queue on 2026-10-03; row 1 is done.
const EXPECTED_ROWS = 12;

const FLIP = process.env.QUEUE_FLIP || "";

/** The queue, as data. `cmd` exits 0 while the row still belongs. */
const ROWS = [
  { n: 1, id: "9.11", done: "2026-10-03 02:01 — the other lane re-ran the sweep; receipt git_sha 50767da. Clause 2 is Andrew's." },
  { n: 2, id: "14.22", cmd: `grep -oE '.{2}"visits?"' app/src/screens/Clients.jsx | grep -qv '^t('` },
  { n: 3, id: "14.21", cmd: `! grep -qE 'SIGTERM|SIGINT' scripts/admin-contrast.mjs` },
  { n: 4, id: "14.26", needsEnv: "SUPABASE_SECRET_KEY",
    cmd: `test "$(curl -s "$SUPABASE_URL/rest/v1/bookings?address_source=eq.picked&select=id" -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")" = "[]"` },
  { n: 5, id: "3.4c", cmd: `grep -q '"12 October 2026"' scripts/render-emails.mjs` },
  { n: 6, id: "7.18", cmd: `! grep -qE 'navmenu|burger' app/src/landing/LegalPage.jsx` },
  { n: 7, id: "4.6", cmd: `grep -q 'the /admin back office only' receipts/sweep-tap-targets.json` },
  { n: 8, id: "14.23", cmd: `! grep -qi details scripts/lib/tapProbe.mjs` },
  { n: 9, id: "8.10c", cmd: `! grep -q role_table_grants scripts/migration-drift.mjs` },
  { n: 10, id: "2.12", cmd: `! node --test tests/spanish.test.mjs` },
  { n: 11, id: "9.2", unverifiable:
      "membership is 'do the other four STUCK rows state facts they did not compute?' — five advice strings read against five predicates. No grep expresses it; a command could only confirm the file exists. Re-prove it by opening AdminPage.jsx's STUCK array, which is also the first step of the work." },
  { n: 12, id: "7.9", unverifiable:
      "membership is 'is anything at opacity 0 after first paint under reduced motion?' — that needs a rendered page, which is why the item is on the list at all. Greping for data-rv would re-prove the wrong thing: presence is not visibility (7.12)." },
];

// **THE CHILD MUST NOT INHERIT THE TEST RUNNER'S OWN ENVIRONMENT.** Row 2.12's
// command invokes `node --test`, and a nested runner inherits `NODE_TEST_CONTEXT`
// from its parent, which makes it report through the parent's channel and exit 1
// even when the suite behaves exactly as the row expects. **Measured: inherited
// env gave exit 1, stripped gave exit 0, on the same command.** It cost one
// false "HAS MOVED" on 2.12 before it was found — a check reporting a stale row
// that was not stale, which is the fault this file exists to prevent, in the
// file itself.
function run(cmd) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  try {
    execFileSync("bash", ["-c", cmd], { stdio: "pipe", timeout: 120000, env });
    return 0;
  } catch (e) {
    return typeof e.status === "number" ? e.status : 1;
  }
}

test("every ready row in the work queue still belongs", async (t) => {
  await t.test("0 · the table has the declared number of rows", () => {
    assert.equal(
      ROWS.length, EXPECTED_ROWS,
      `found ${ROWS.length} rows, declared ${EXPECTED_ROWS}. A table that stops `
      + "being parsed must not read as all-clear. If the queue genuinely grew or "
      + "shrank, move EXPECTED_ROWS in the same edit as the row.",
    );
    assert.ok(
      ROWS.filter((r) => r.cmd).length >= 7,
      "fewer than seven runnable commands means the table is being emptied "
      + "rather than maintained",
    );
  });

  for (const r of ROWS) {
    if (r.done) {
      await t.test(`${r.n} · ${r.id} — DONE, not a live row`, () => {
        assert.ok(r.done.length > 10, "a done row must carry its evidence");
      });
      continue;
    }

    if (r.unverifiable) {
      // Named, never skipped, never counted as passing.
      await t.test(`${r.n} · ${r.id} — UNVERIFIABLE BY COMMAND (read it instead)`, () => {
        assert.ok(r.unverifiable.length > 40,
          "an unverifiable row must say WHY, or it is a silent skip");
        assert.ok(!r.cmd,
          "a row cannot be both unverifiable and carry a command");
      });
      continue;
    }

    const flipped = FLIP === r.id;
    await t.test(`${r.n} · ${r.id} — re-prove${flipped ? " [FLIPPED]" : ""}`, () => {
      if (r.needsEnv && !process.env[r.needsEnv]) {
        assert.fail(
          `${r.id} needs ${r.needsEnv}, which is NOT set. It lives in the `
          + "repo-root `.env` — load it with `set -a; . ./.env; set +a` and run "
          + "again. Reported rather than skipped, because a skipped row reads "
          + "exactly like a passing one.",
        );
      }
      const code = run(r.cmd);
      const belongs = code === 0;
      const want = flipped ? false : true;
      assert.equal(
        belongs, want,
        flipped
          ? `${r.id} was FLIPPED by QUEUE_FLIP and behaved as it should — this `
            + "red is the sabotage working."
          : `${r.id} HAS MOVED (exit ${code}). It is done, changed or overtaken. `
            + "Update the queue in docs/open-items-read-as-a-stranger-2026-09-25.md "
            + `before handing this row to anybody. Command: ${r.cmd}`,
      );
    });
  }
});
