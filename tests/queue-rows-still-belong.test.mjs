// THE WORK QUEUE RE-PROVES ITSELF, ROW BY ROW, AGAINST THE DOCUMENT THAT HOLDS IT.
//
// Run: node --test tests/queue-rows-still-belong.test.mjs
//      Credential-free except row 14.26, which says so and is reported by name
//      rather than skipped.
//
// ---------------------------------------------------------------------------
// IT CAUGHT A FAULT IN ITSELF ON ITS FIRST RUN, AND THAT LEADS THIS FILE
// BECAUSE IT IS THE WHOLE ARGUMENT FOR THE CONVENTION
// ---------------------------------------------------------------------------
// Row 2.12's command runs `node --test`, and **a nested runner inherits
// `NODE_TEST_CONTEXT` from its parent**, so the child reported through the
// parent's channel and exited 1 **while the suite behaved exactly as the row
// expects**. Measured both ways on the same command: **inherited env exit 1,
// stripped env exit 0.** It produced one false *"HAS MOVED"* — a check reporting
// a stale row that was not stale, **in the file written to prevent exactly
// that.** `run()` strips it now, with the measurement in a comment above it.
//
// **THE HONEST TALLY: one wrong command in ten, plus one wrong harness, and both
// were found by RUNNING rather than by reading.** Row 3.4c's first command
// probed `2026-10-12` — the ISO date the entry proposes as the *fix* — instead
// of `"12 October 2026"`, the literal actually in `scripts/render-emails.mjs`,
// and would have retired a live row. **That rate is on commands written by
// somebody who knew exactly what each one meant.**
//
// ---------------------------------------------------------------------------
// WHY IT EXISTS — a derived list rots, and this one rotted in ninety minutes
// ---------------------------------------------------------------------------
// Row 1 was 9.11's first clause: nothing to build, because the receipt still
// read `"status": "fail"` over a `git_sha` that was an ANCESTOR of the fix.
// Ninety minutes later the other lane re-ran the sweep, the receipt carried that
// hour's HEAD, and the clause was met. **The manager was about to hand it out.**
//
// **AND THE PART A READING COULD NEVER HAVE CAUGHT: the receipt said `fail`
// before and says `fail` now, and they are different fails.** A stale red over
// an ancestor sha became a **live** red with two real findings — `guide ·
// calendar 5` at 1920, the whole page draggable sideways by 51px. **Same word,
// opposite meaning**, which is why the clause was written about the sha and not
// the status.
//
// ---------------------------------------------------------------------------
// ONE LIST, NOT TWO — the row set is READ from the pass file
// ---------------------------------------------------------------------------
// **Two lists describing one queue is the derived-list fault one level down.**
// The prose table and this file would drift, and the check would pass over a
// queue it no longer described. So:
//
//   * the **IDENTITY** of the queue — which items, in what order — is parsed
//     from the `READY NOW` table in
//     `docs/open-items-read-as-a-stranger-2026-09-25.md`;
//   * only the **COMMANDS** live here, keyed by item id;
//   * **a row the document names and this file has no command for is a red**,
//     and so is a command here for a row the document no longer lists.
//
// **If the parse finds fewer rows than PARSE_FLOOR it FAILS rather than
// quietly checking fewer** — 14.28's discovery-floor argument in a second place.
// **A check that reads a file it cannot prove it parsed correctly is the
// population fault**, not the verdict fault, and that is the one that reads as
// all-clear.
//
// ---------------------------------------------------------------------------
// THE CONVENTION, which needs no interpreting
// ---------------------------------------------------------------------------
// **exit 0 means the row STILL BELONGS. Non-zero means it has MOVED** — done,
// changed or overtaken — **and the queue must be updated before anybody is
// handed that row.** Several commands are inverted (`! grep …`) so that *the
// fault still being present* is the success case: **what is re-proved is the
// row's membership, not the product's health.**
//
// ---------------------------------------------------------------------------
// THREE THINGS IT MUST DO, OR IT IS FURNITURE
// ---------------------------------------------------------------------------
// 1. **Report PER ROW** — one red hiding nine greens names nothing.
// 2. **Declare the row count and fail if it finds fewer.**
// 3. **Rows with no command print as UNVERIFIABLE by name**, never skipped and
//    never counted as passing.
//
// ---------------------------------------------------------------------------
// BROKEN ON PURPOSE, TWO WAYS — 2026-10-03, both run. ROADMAP 14.29.
// ---------------------------------------------------------------------------
//   * `QUEUE_FLIP=<id>` inverts one row's expectation in code.
//   * **The document's own table was edited** — a row taken out of `READY NOW` —
//     and the check followed and named the mismatch. **That is the sabotage that
//     proves it reads the document rather than itself.**

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const QUEUE_DOC = "docs/open-items-read-as-a-stranger-2026-09-25.md";

// ---------------------------------------------------------------------------
// ONE CONSTANT WAS DOING TWO JOBS, AND NO SINGLE COMPARISON COULD BE RIGHT
// ---------------------------------------------------------------------------
// `EXPECTED_ROWS = 16` was asserted with `>=` and answered two different
// questions at once:
//
//   1. **did the table still PARSE?** Fewer rows than expected means the row
//      shape changed and the scan is reading nothing. A **floor** is correct
//      here: finding more rows is not a fault.
//   2. **is the declared row count still TRUE?** A floor is wrong here: the
//      queue can grow to twenty and the declaration stays 16, silently.
//
// **Whichever comparison you pick, you are half wrong** — which makes this a
// constant that cannot be compared correctly rather than a comparison that was
// chosen badly. Split 2026-10-02 into a floor named as a parser guard and an
// equality named as a declaration, each with a message saying which question it
// answers. Found by the inequality sweep over `tests/`; `docs/gotchas.md` 98.
//
// PARSER GUARD. Deliberately well below the real count: closing queue rows must
// never redden this, and a parser that matches nothing must.
const PARSE_FLOOR = 8;
// THE DECLARATION. Exact. 16 rows on 2026-10-03; 14 on 2026-10-06 after 3.4c and 2.12 closed and left the table. 13 after that; 12 after 14.22
// was ticked and its row came out (its old probe, a grep for a bare "visit" in Clients.jsx, is false now by design). Row numbers keep their gap.
// Move it in the SAME EDIT as the table, with a sentence saying why.
const DECLARED_ROWS = 12;

const FLIP = process.env.QUEUE_FLIP || "";

const ROW_RE = /^\| \*\*(\d+)\*\* \| \*\*([^*]+)\*\*/;

/** The queue's identity, read from the document that holds it. */
function rowsFromDoc() {
  const lines = readFileSync(QUEUE_DOC, "utf8").split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === "### READY NOW");
  if (start < 0) return [];
  const out = [];
  for (let j = start + 1; j < lines.length; j++) {
    if (/^#{2,3} /.test(lines[j])) break; // the next section ends the table
    const m = lines[j].match(ROW_RE);
    if (m) {
      out.push({
        n: Number(m[1]),
        id: m[2].replace(/'s fix$/, "").replace(/,.*$/, "").trim(),
      });
    }
  }
  return out;
}

/** Commands, keyed by item id. Membership and order come from the document. */
const CMD = {
  "9.11": { done: "2026-10-03 02:01 — the other lane re-ran the sweep; receipt git_sha 50767da. Clause 2 is Andrew's." },
  "14.21": {
    unverifiable:
      "the teardown is written (finally, crash flag, signal handlers) and the clean and crash runs are proved; what is open is the SIGNAL clause, which a run under `timeout` cannot attribute to the handlers (the table came back the same with the handlers removed). The old probe, no SIGTERM in the script, is false now and would have read the row as gone.",
  },
  "14.26": { done: "2026-10-06 — tests/picked-evidence-survives.test.mjs keeps the one picked row on a fixture tenant the seed never deletes and re-books it if it is ever gone; the old probe (zero picked rows anywhere) is false now by design." },
  "7.18": { done: "2026-10-06 — tests/ld-pages-carry-the-nav.test.mjs is built and names /terms and /privacy; the old probe (no burger in LegalPage.jsx) is now the CHECK's subject, and fixing that file is Lane A's, not this row's." },
  "14.23": { done: "2026-10-06 — scripts/sweep-tap-targets.mjs opens every closed <details> and records both counts per screen (966 controls on 68 screens that nothing had measured). The old probe (no `details` in tapProbe.mjs) is still true and no longer means the gap is open." },
  "8.10c": { done: "2026-10-06 — migration-drift.mjs compares grants and indexes; the old probe (no role_table_grants in the script) would have kept saying the row belonged after grants were built another way." },
  "3.1": { done: "2026-10-06 — both halves are built: the screen (1f6d295) and the server action email_list (dd33fbc). The old probe (no email_sends in AdminPage.jsx) was never the right test of it, and the item stays unticked only until a real row is seen after the publish." },
  "4.3": { cmd: `! grep -rqE 'support_mode|is_support' supabase/functions/` },
  "9.2": {
    unverifiable:
      "membership is 'do the other four STUCK rows state facts they did not compute?' — five advice strings read against five predicates. No grep expresses it; a command could only confirm the file exists. Re-prove it by opening AdminPage.jsx's STUCK array, which is also the first step of the work.",
  },
  "2.15a": { cmd: `node -e 'const r=require("./receipts/bk-bar-clearance.json");process.exit(r.status==="fail"?0:1)'` },
  "0.11": {
    needsEnv: "SUPABASE_SECRET_KEY",
    cmd: `test "$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/photo_total_bytes" -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" -H "Content-Type: application/json" -d '{}')" != "10737418240"`,
  },
  "7.9": {
    unverifiable:
      "membership is 'is anything at opacity 0 after first paint under reduced motion?' — that needs a rendered page, which is why the item is on the list at all. Grepping for data-rv would re-prove the wrong thing: presence is not visibility (7.12).",
  },
};

// **THE CHILD MUST NOT INHERIT THE TEST RUNNER'S OWN ENVIRONMENT.** See the
// header: a nested `node --test` inherits `NODE_TEST_CONTEXT` and exits 1 even
// when the suite behaves as the row expects. Measured: inherited exit 1,
// stripped exit 0, same command.
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
  const rows = rowsFromDoc();

  await t.test("0 · PARSER GUARD — the table still parses at all", () => {
    assert.ok(
      rows.length >= PARSE_FLOOR,
      `parsed ${rows.length} rows from ${QUEUE_DOC} READY NOW, parser floor `
      + `${PARSE_FLOOR}. **This asks only one question: did the table parse?** `
      + "Fewer means the ROW SHAPE CHANGED and the scan is reading nothing, never "
      + "that the queue shrank — a parser that matches nothing must not read as "
      + "all-clear. It is a FLOOR on purpose: closing real queue rows must never "
      + "redden it. Check the `| **n** | **id** |` row shape before touching it.",
    );
  });

  await t.test("0a · DECLARATION — the row count is still the one declared", () => {
    assert.equal(
      rows.length, DECLARED_ROWS,
      `the table carries ${rows.length} rows and this file declares `
      + `${DECLARED_ROWS}. **This asks the other question: is the declared count `
      + "still TRUE?** It is an EQUALITY on purpose — the floor above cannot see "
      + "the count GROW, so a row added to the document would leave the "
      + "declaration quietly wrong. If the queue genuinely changed, move "
      + "DECLARED_ROWS in the same edit as the table and say why. **These were one "
      + "constant compared with `>=` until 2026-10-02, which was correct for the "
      + "parser and wrong for the declaration; see gotchas 98.**",
    );
    const missing = rows.filter((r) => !CMD[r.id]).map((r) => `${r.n} · ${r.id}`);
    assert.deepEqual(
      missing, [],
      "the document names rows this file has no command for. One list, not two: "
      + "add the command here, or take the row out of the table.",
    );
    const orphans = Object.keys(CMD).filter((id) => !rows.some((r) => r.id === id));
    assert.deepEqual(
      orphans, [],
      "this file carries commands for rows the document no longer lists. The "
      + "document is the queue; delete the orphan command.",
    );
  });

  for (const r of rows) {
    const spec = CMD[r.id] || {};

    if (spec.done) {
      await t.test(`${r.n} · ${r.id} — DONE, not a live row`, () => {
        assert.ok(spec.done.length > 10, "a done row must carry its evidence");
      });
      continue;
    }

    if (spec.unverifiable) {
      await t.test(`${r.n} · ${r.id} — UNVERIFIABLE BY COMMAND (read it instead)`, () => {
        assert.ok(spec.unverifiable.length > 40,
          "an unverifiable row must say WHY, or it is a silent skip");
        assert.ok(!spec.cmd, "a row cannot be both unverifiable and carry a command");
      });
      continue;
    }

    const flipped = FLIP === r.id;
    await t.test(`${r.n} · ${r.id} — re-prove${flipped ? " [FLIPPED]" : ""}`, () => {
      if (spec.needsEnv && !process.env[spec.needsEnv]) {
        assert.fail(
          `${r.id} needs ${spec.needsEnv}, which is NOT set. It lives in the `
          + "repo-root `.env` — load it with `set -a; . ./.env; set +a` and run "
          + "again. Reported rather than skipped, because a skipped row reads "
          + "exactly like a passing one.",
        );
      }
      const code = run(spec.cmd);
      const belongs = code === 0;
      assert.equal(
        belongs, flipped ? false : true,
        flipped
          ? `${r.id} was FLIPPED by QUEUE_FLIP and behaved as it should — this red `
            + "is the sabotage working, not a finding."
          : `${r.id} HAS MOVED (exit ${code}). It is done, changed or overtaken. `
            + `Update the READY NOW table in ${QUEUE_DOC} before handing this row `
            + `to anybody. Command: ${spec.cmd}`,
      );
    });
  }
});
