// ROADMAP 100.5 (audit R1-08) — THE THIRD "IS THIS TIME FREE" RULE STAYS GONE.
//
//   node --test tests/is-slot-available-dropped.test.mjs
//
// Credential-free: one `git ls-files` and filesystem reads. public.is_slot_available counted bulk
// dealership jobs as busy and defaulted the buffer to 60, disagreeing with validateSlot and
// available-slots. 20261023100000_drop_is_slot_available.sql drops it. This fails if the drop goes,
// if a later migration recreates it, or if any code (app, edge functions, scripts, tests, SQL) names
// it again. Prose (docs/, *.md, receipts/) may still tell its history and is not scanned.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";

const NAME = /is_slot_available/i;
const ORIGIN = "supabase/migrations/20260827000300_helpers.sql"; // append-only: keeps the old create
const DROP = "supabase/migrations/20261023100000_drop_is_slot_available.sql";
const SELF = "tests/is-slot-available-dropped.test.mjs";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\n").filter((f) => /\.(m?js|cjs|jsx|tsx?|sql|json|html|sh|py)$/.test(f))
  .filter((f) => !/^(docs|receipts|reference)\//.test(f) && !/node_modules\//.test(f));

test("the drop migration exists and nothing after it brings the function back", () => {
  const sql = readFileSync(DROP, "utf8");
  assert.match(sql, /^\s*drop function if exists public\.is_slot_available\(uuid, timestamptz, timestamptz\);/m);
  const later = files.filter((f) => f.startsWith("supabase/migrations/") && f > DROP && NAME.test(readFileSync(f, "utf8")));
  assert.deepEqual(later, [], "a migration after the drop names is_slot_available");
});

test("no code anywhere calls or recreates is_slot_available", () => {
  assert.ok(files.length > 300, `only ${files.length} files scanned; the file list broke`);
  assert.match(readFileSync(ORIGIN, "utf8"), NAME, "matcher sanity: the original create should match");
  const callers = files.filter((f) => f !== ORIGIN && f !== DROP && f !== SELF && NAME.test(readFileSync(f, "utf8")));
  assert.deepEqual(callers, [], "these files name the dropped function");
});
