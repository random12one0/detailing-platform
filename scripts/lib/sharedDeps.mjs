// WHICH `_shared` MODULES END UP INSIDE A FUNCTION'S BUNDLE.
//
// Its own file, and not because `check-deployed.mjs` was too long: that script
// fetches the Supabase Management API at the top level, so it cannot be
// imported without credentials and its walk could never be tested. This is the
// half that decides what "stale" MEANS, it is pure, and
// `tests/deploy-freshness.test.mjs` is the baseline it had gone without.

import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const FUNCTIONS = path.join(ROOT, "supabase", "functions");

// Which _shared modules end up inside this function's bundle. One level is
// enough only if _shared modules do not import each other, so this follows
// them: a stale `brandColor.js` reached through `email.ts` is exactly the
// kind of thing that would otherwise be missed.
//
// AND IT WAS MISSED, FOR AS LONG AS THIS FILE HAS EXISTED — found 2026-09-13.
// The pattern above used to be `/["'](?:\.\.\/)+_shared\/([\w./-]+)["']/`, which
// requires at least one `../`. A FUNCTION reaches `_shared` that way and was
// followed correctly; a `_shared` module reaching a SIBLING writes
// `from "./brandColor.js"`, with no `../` at all, and matched nothing. So the
// walk stopped dead at the first hop and the very example in the comment above
// — `brandColor.js` through `email.ts` — was exactly what it could not see.
//
// **28 sibling imports inside `_shared` were invisible.** The cost, measured
// the day it was found: `_shared/emailKit.ts`'s money formatter was changed and
// this script reported *all 37 functions are current* while NINETEEN of them
// were running the old one. A `_shared` edit makes every importer stale at
// once, and this is the only thing that says so — so a hole here is silent by
// construction, and "current" is the most expensive wrong answer it can give.
//
// The fix is to resolve every relative specifier against the file doing the
// importing and keep whatever lands under `_shared/`, rather than matching a
// spelling. `tests/deploy-freshness.test.mjs` baselines it.
export async function sharedFor(fn, seen = new Set()) {
  const dir = path.join(FUNCTIONS, fn);
  const stack = [];
  for (const f of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (f.isFile()) stack.push(path.join(f.parentPath ?? f.path, f.name));
  }
  while (stack.length) {
    const file = stack.pop();
    let src;
    try { src = await readFile(file, "utf8"); } catch { continue; }
    for (const m of src.matchAll(/["'](\.\.?\/[\w./-]+)["']/g)) {
      const abs = path.resolve(path.dirname(file), m[1]);
      const rel = path.relative(ROOT, abs).split(path.sep).join("/");
      if (!rel.startsWith("supabase/functions/_shared/")) continue;
      if (seen.has(rel)) continue;
      seen.add(rel);
      if (existsSync(abs)) stack.push(abs);
    }
  }
  return [...seen];
}
