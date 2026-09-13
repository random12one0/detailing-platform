// THE BASELINE `check-deployed.mjs` HAD NEVER HAD — 2026-09-13.
//
// That script is the ONLY thing in this repo that can say a deployed edge
// function is running yesterday's code. Nothing else notices: the function
// answers, the tests pass against the repo, and the customer gets the old
// behaviour. So a hole in it is silent by construction, and "current" is the
// most expensive wrong answer it can give.
//
// IT HAD A HOLE FOR AS LONG AS IT HAD EXISTED. The walk that decides which
// `_shared` modules end up inside a function's bundle matched
// `/["'](?:\.\.\/)+_shared\/…/` — at least one `../`. A FUNCTION reaches
// `_shared` that way. A `_shared` module reaching a SIBLING writes
// `from "./brandColor.js"`, with no `../` at all, and matched nothing. **So the
// walk stopped at the first hop**, and the example its own comment gave — a
// stale `brandColor.js` reached through `email.ts` — was precisely what it
// could not see. 28 sibling imports were invisible.
//
// The cost, measured the day it was found: `_shared/emailKit.ts`'s money
// formatter was changed and the script reported 3 functions stale. The true
// figure was 17.
//
// Credential-free — that is why `sharedFor` lives in `scripts/lib/` rather than
// inside a script that fetches the Management API at the top level. Run it from
// the repo root.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { sharedFor, ROOT } from "../scripts/lib/sharedDeps.mjs";

let n = 0;
const check = (name, cond, detail = "") => {
  n++;
  if (!cond) {
    console.error(`FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
    process.exitCode = 1;
  }
};

const FN = path.join(ROOT, "supabase", "functions");
const functions = (await readdir(FN, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && d.name !== "_shared")
  .map((d) => d.name).sort();

// --- 0 · THE SUBJECTS EXIST -----------------------------------------------
// A green line over zero subjects reads exactly like a pass.
check("0 · there are functions to walk", functions.length > 30, `${functions.length}`);

// --- 1 · THE FIRST HOP: a function's own `../_shared/x` import -------------
{
  const deps = await sharedFor("create-booking");
  check("1a · a direct `../_shared` import is followed",
    deps.includes("supabase/functions/_shared/pricing.ts"), deps.length + " deps");
  check("1b · every path returned is repo-relative and under _shared",
    deps.every((d) => d.startsWith("supabase/functions/_shared/")), deps.find((d) => !d.startsWith("supabase/functions/_shared/")));
}

// --- 2 · THE SECOND HOP, WHICH IS THE ONE THAT WAS BLIND -------------------
//
// `respond-to-booking` imports `_shared/emailTemplates.ts`. That file imports
// `./emailKit.ts`, which imports `./brandColor.js` and `./i18n.ts`. None of the
// three is named anywhere in the function's own directory, so all three are
// reachable ONLY through the sibling hop.
{
  const deps = await sharedFor("respond-to-booking");
  const own = await readFile(path.join(FN, "respond-to-booking", "index.ts"), "utf8");
  for (const hop of ["emailKit.ts", "brandColor.js", "i18n.ts"]) {
    check(`2 · ${hop} is reached through a sibling import`,
      deps.includes(`supabase/functions/_shared/${hop}`), deps.join(", "));
    check(`2 · and ${hop} is genuinely not named by the function itself`,
      !own.includes(hop),
      "if the function names it directly this check proves nothing about the sibling hop");
  }
}

// --- 3 · THE REAL COUNT, STATED AS A FLOOR --------------------------------
//
// Not a fixed list, which would be a spelling check on today's imports. The
// property is that a `_shared` edit reaches far: every function that sends any
// email must reach `emailKit.ts`, and `emailKit.ts` is reachable only through
// `email.ts` or `emailTemplates.ts` for most of them.
{
  let reach = 0;
  for (const fn of functions) {
    const deps = await sharedFor(fn);
    if (deps.includes("supabase/functions/_shared/emailKit.ts")) reach++;
  }
  check("3 · emailKit.ts is reached by many functions, not three", reach >= 15, `${reach} of ${functions.length}`);
  console.log(`      (emailKit.ts is in ${reach} of ${functions.length} bundles)`);
}

// --- 4 · THE WALK TERMINATES, AND THE REASON IT DOES IS CHECKED ----------
//
// `_shared` modules import each other freely and `db.ts` re-exports
// `retryRead.ts`. The `seen` set is the only thing that would stop a CYCLE
// running for ever.
//
// **DELETING THAT GUARD WAS BASELINED AND STAYED GREEN, and the honest reason
// is that the graph has no cycle today** — 29 modules, 0 cycles, measured. So
// asserting the guard is untestable from outside, and what is asserted instead
// is the property that makes the walk safe: no cycle exists. The day somebody
// adds one, this goes red BEFORE `check-deployed.mjs` hangs with no output,
// which is the failure that would otherwise look like a slow network.
{
  const dir = path.join(FN, "_shared");
  const files = (await readdir(dir)).filter((f) => /\.(ts|js)$/.test(f));
  const edges = {};
  for (const f of files) {
    const src = await readFile(path.join(dir, f), "utf8");
    edges[f] = [...src.matchAll(/["']\.\/([\w.-]+)["']/g)].map((m) => m[1]).filter((x) => files.includes(x));
  }
  check("4a · the module graph was actually read", files.length > 20 && Object.values(edges).flat().length > 20,
    `${files.length} modules, ${Object.values(edges).flat().length} sibling edges`);
  const cycles = new Set();
  const visit = (node, stack) => {
    if (stack.includes(node)) { cycles.add([...stack.slice(stack.indexOf(node)), node].join(" -> ")); return; }
    if (stack.length > 12) return;
    for (const d of edges[node] ?? []) visit(d, [...stack, node]);
  };
  for (const f of files) visit(f, []);
  check("4b · no import cycle among _shared modules", cycles.size === 0, [...cycles][0] ?? "");

  const t = Date.now();
  const deps = await sharedFor("send-email");
  check("4c · the walk terminates and returns each module once",
    Date.now() - t < 5000 && new Set(deps).size === deps.length);
}

// --- 5 · NOTHING IS REACHED THAT DOES NOT EXIST ---------------------------
//
// The walk records a path before checking the file is there, on purpose — a
// deleted module that something still imports SHOULD show up. What must not
// happen is a path escaping the repo.
{
  const deps = await sharedFor("platform-admin");
  check("5 · no path escapes supabase/functions/_shared",
    deps.every((d) => !d.includes("..")), deps.find((d) => d.includes("..")));
}

console.log(process.exitCode
  ? `\ndeploy-freshness: ${n} checks, some FAILED`
  : `\ndeploy-freshness: ${n} checks pass, 0 skipped`);
