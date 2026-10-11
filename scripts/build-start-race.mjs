// ROADMAP 0.4g — TWO OVERLAPPING "WORK HAS STARTED" PRESSES MUST RECORD ONE DATE.
//
//   node scripts/build-start-race.mjs
//   node scripts/build-start-race.mjs --break=unconditional   # sabotage: the old plain update
//   node scripts/receipt.mjs receipts/build-start-race.json
//
// It races the PRODUCTION `stampBuildStart` (supabase/functions/_shared/
// buildStartStamp.ts, the write `build_start` makes) against the real
// database: two calls fired together, five rounds. Each round must end with
// exactly one winner, the stored date equal to the winner's, and the loser
// told that same date. The deployed `platform-admin` is NOT pressed — this
// checkout's version is not published, and the race lives in the write.
//
// Every run also races a copy with the `is null` condition stripped out (the
// code before 0.4g) and requires it to produce TWO winners — the canary.
// `--break=unconditional` runs all five rounds on that copy, so the run goes red.
//
// WHAT IT TOUCHES: project kguqylyzgyzfktkfnhjb only (refuses any other). One
// throwaway business (slug `build-start-race`, is_demo), deleted in `finally`.
// No email, no edge function, no structure change.

import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { stampBuildStart } from "../supabase/functions/_shared/buildStartStamp.ts";

const { createClient } = createRequire(import.meta.url)("../app/node_modules/@supabase/supabase-js");
const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PLATFORM = "kguqylyzgyzfktkfnhjb";
if (process.env.SUPABASE_PROJECT_REF !== PLATFORM || !URL_?.includes(`${PLATFORM}.supabase.co`)) {
  console.error(`Refusing: not ${PLATFORM}. Nothing was touched.`); process.exit(1);
}
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
if (BREAK && BREAK !== "unconditional") { console.error(`Unknown --break=${BREAK}`); process.exit(1); }
const ROUNDS = 5;
const SLUG = "build-start-race";
const started = new Date();
// Two clients, so the two presses do not share one fetch pipeline.
const dbA = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const dbB = createClient(URL_, SERVICE, { auth: { persistSession: false } });

// THE PRE-0.4g WRITE, MADE FROM THE PRODUCTION SOURCE EACH RUN (not a hand copy),
// and the edit is proved to have landed (docs/gotchas.md 102).
const SRC = "supabase/functions/_shared/buildStartStamp.ts";
const src = readFileSync(SRC, "utf8");
const COND = /\s*\.is\("site_build_started_at", null\)/;
const broken = src.replace(COND, "");
if (broken === src) { console.error("Could not strip the condition from the source — the canary would test nothing."); process.exit(1); }
const tmp = mkdtempSync(join(tmpdir(), "bsr-"));
writeFileSync(join(tmp, "unconditional.ts"), broken);
const { stampBuildStart: unconditional } = await import(pathToFileURL(join(tmp, "unconditional.ts")).href);
console.log(`unconditional copy built from ${SRC} (condition removed: ${broken !== src})`);

let assertions = 0;
const failures = [];
const check = (label, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  return ok;
};
const same = (a, b) => !!a && !!b && Date.parse(a) === Date.parse(b);
let id = null, completed = 0, canaryWinners = null;
const rounds = [];

async function race(fn, round) {
  const reset = await dbA.from("businesses").update({ site_build_started_at: null }).eq("id", id);
  if (reset.error) throw new Error(`reset: ${reset.error.message}`);
  const base = Date.UTC(2026, 9, 1, 12, 0, round); // distinct, so a stored date names its writer
  const tA = new Date(base).toISOString(), tB = new Date(base + 1000).toISOString();
  const [a, b] = await Promise.all([fn(dbA, id, tA), fn(dbB, id, tB)]);
  const { data } = await dbA.from("businesses").select("site_build_started_at").eq("id", id).single();
  return { a, b, tA, tB, stored: data.site_build_started_at };
}

try {
  console.log(`build-start race — ${ROUNDS} rounds${BREAK ? `\n*** --break=${BREAK}: a sabotage, not a result ***` : ""}\n`);
  await dbA.from("businesses").delete().eq("slug", SLUG);
  const made = await dbA.from("businesses")
    .insert({ is_demo: true, slug: SLUG, name: "BUILD START RACE", timezone: "America/Los_Angeles", contact_email: "build-start-race@example.com" }) // mail-sink: never mailed
    .select("id").single();
  if (made.error) throw new Error(`fixture: ${made.error.message}`);
  id = made.data.id;

  const fn = BREAK === "unconditional" ? unconditional : stampBuildStart;
  for (let r = 1; r <= ROUNDS; r++) {
    console.log(`round ${r}`);
    const { a, b, tA, tB, stored } = await race(fn, r);
    const winners = [a, b].filter((x) => x.won);
    rounds.push({ round: r, a_won: a.won, b_won: b.won, stored });
    check("neither press errored", !a.error && !b.error, `${a.error ?? ""}${b.error ?? ""}`);
    if (!check("exactly one press won", winners.length === 1, `${winners.length} won`)) continue;
    const [win, lose] = a.won ? [a, b] : [b, a];
    const winT = a.won ? tA : tB;
    check("the stored date is the winner's", same(stored, winT), `stored ${stored}, winner wrote ${winT}`);
    check("the loser is told that same date", same(lose.recorded, winT), `loser saw ${lose.recorded}`);
    check("the winner reports what it wrote", same(win.recorded, winT));
    // A THIRD, LATE PRESS (the stale-tab retry) must not move it either.
    const late = await fn(dbA, id, new Date(Date.UTC(2026, 9, 2)).toISOString());
    const { data } = await dbA.from("businesses").select("site_build_started_at").eq("id", id).single();
    check("a later press loses and changes nothing", !late.won && same(data.site_build_started_at, winT), `late won=${late.won}, stored ${data.site_build_started_at}`);
    completed++;
  }

  // THE CANARY: the old write, raced the same way, must let both presses win.
  console.log("canary: the unconditional write");
  const c = await race(unconditional, 99);
  canaryWinners = [c.a, c.b].filter((x) => x.won).length;
  console.log(`  unconditional: ${canaryWinners} winner(s), stored ${c.stored}`);
} catch (e) {
  failures.push(`run aborted: ${e.message}`);
  console.error(e);
} finally {
  if (id) {
    const del = await dbA.from("businesses").delete().eq("id", id);
    console.log(`cleanup: fixture ${del.error ? `NOT deleted — ${del.error.message}` : "deleted"}`);
    if (del.error) failures.push(`fixture ${SLUG} left behind`);
  }
  rmSync(tmp, { recursive: true, force: true });
}

const ok = failures.length === 0 && completed === ROUNDS;
writeReceipt({
  check_id: "build-start-race",
  started_at: started.toISOString(),
  status: ok ? "pass" : "fail",
  expected_targets: ROUNDS, discovered_targets: ROUNDS, attempted_targets: rounds.length, completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: ROUNDS * 5, // six per completed round; a round whose race fails stops at two
  failures, dimensions: { break: BREAK || null, rounds },
  artifacts: ["scripts/build-start-race.mjs", SRC, "supabase/functions/platform-admin/index.ts"],
  warnings: [
    "Races the production write against the live database; it does NOT press the deployed platform-admin, which runs whatever was last published.",
    "Two simultaneous requests are the realistic overlap; nothing forces them to reach Postgres within the same millisecond, and the conditional write is correct either way.",
  ],
  canary: { id: "the pre-0.4g unconditional write lets both overlapping presses win", observed_failure: canaryWinners === 2, caught: canaryWinners },
});
console.log(`\n${ok ? "PASS" : "FAIL"} — ${completed}/${ROUNDS} rounds, ${assertions} assertions, ${failures.length} failed; canary winners ${canaryWinners}`);
process.exit(ok ? 0 : 1);
