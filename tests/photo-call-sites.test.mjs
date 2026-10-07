// EVERY CALL TO `addPhoto` GIVES IT WHAT IT NEEDS. ROADMAP 0.11, found while
// preparing the photo door.
//
//   node --test tests/photo-call-sites.test.mjs
//
// Credential-free, no browser. Reads app/src as text and runs the real
// `storagePath` / `KINDS` from app/src/lib/photo-rules.js.
//
// WHY THIS EXISTS. `SiteIntake.jsx` called
//
//   addPhoto({ file, businessId: business.id, kind: "gallery" })
//
// from the commit that rebuilt that form (3b97ed0) until this was fixed. It
// cannot have worked once: `addPhoto` files a JOB photo, so `storagePath`
// throws without a booking, and `job_photos.kind` only allows before, after or
// damage. **Both halves of that were already tested** — `storagePath` throwing
// on a missing owner is asserted in tests/job-photos.test.mjs § 6, and the
// kind list is the table's own check constraint — and neither test could see
// the CALL SITE, which is where the mistake was. A function's requirements are
// only checked against the function; nothing asked whether the people calling
// it meet them. This asks, for every caller, and discovers the callers so a
// new one is checked by existing.

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import { KINDS, storagePath } from "../app/src/lib/photo-rules.js";

const ROOT = "app/src";
const KIND_KEYS = KINDS.map(([k]) => k);

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(p) ? [p] : [];
});
const stripComments = (s) => s.replace(/\r\n/g, "\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** The object literal handed to each `addPhoto(` call in `src`, as text. */
export function addPhotoCalls(src) {
  const code = stripComments(src);
  const out = [];
  for (const m of code.matchAll(/(?<!function\s)(?<![\w.])addPhoto\s*\(\s*\{/g)) {
    let depth = 0, i = m.index + m[0].length - 1;
    for (; i < code.length; i++) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}" && --depth === 0) break;
    }
    out.push(code.slice(m.index + m[0].length - 1, i + 1));
  }
  return out;
}

/** What is wrong with one call's argument, as plain phrases. Empty is fine. */
export function callProblems(literal) {
  const keys = [...literal.slice(1, -1).split(",")].map((t) => t.trim().split(":")[0].trim()).filter(Boolean);
  const out = [];
  for (const need of ["file", "businessId", "bookingId", "kind"]) {
    if (!keys.includes(need)) out.push(`no ${need} (storagePath needs a booking and the table needs a kind)`);
  }
  const kind = /\bkind\s*:\s*"([^"]*)"/.exec(literal)?.[1];
  if (kind !== undefined && !KIND_KEYS.includes(kind)) {
    out.push(`kind "${kind}" is not one of ${KIND_KEYS.join(", ")}, the only values job_photos.kind allows`);
  }
  return out;
}

test("1 · the two halves of the rule are real: storagePath refuses a missing booking, and KINDS is the table's own list", () => {
  assert.throws(() => storagePath({ businessId: "b", id: "i", type: "image/jpeg" }), /ownerId/);
  const sql = readFileSync("supabase/migrations/20260906010000_job_photos.sql", "utf8");
  const listed = [...(/check \(kind in \(([^)]*)\)\)/.exec(sql)?.[1] ?? "").matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(listed, KIND_KEYS, "photo-rules.js KINDS and the migration's check constraint must agree");
});

test("2 · SABOTAGE — the checker sees the call that used to be in SiteIntake.jsx", () => {
  const old = 'if (business?.id) await addPhoto({ file, businessId: business.id, kind: "gallery" });';
  const [lit] = addPhotoCalls(old);
  assert.ok(lit, "the old call is found at all");
  const problems = callProblems(lit);
  assert.ok(problems.some((p) => /no bookingId/.test(p)), problems.join(" | "));
  assert.ok(problems.some((p) => /kind "gallery"/.test(p)), problems.join(" | "));
  // And a good call passes, including a kind held in a variable and a multi-line literal.
  assert.deepEqual(callProblems(addPhotoCalls('await addPhoto({ file, businessId: business.id, bookingId: booking.id, kind: kindRef.current });')[0]), []);
  assert.deepEqual(callProblems(addPhotoCalls('addPhoto({\n  file,\n  businessId,\n  bookingId,\n  kind: "damage",\n})')[0]), []);
  // The definition is not a call.
  assert.deepEqual(addPhotoCalls("export async function addPhoto({ file, businessId, bookingId, kind, caption = null }) {}"), []);
});

test("3 · THE REAL RESULT — every call to addPhoto in app/src gives it a booking and a valid kind", () => {
  const files = walk(ROOT).filter((f) => !/photos\.js$/.test(f));
  const sites = files.flatMap((f) => addPhotoCalls(readFileSync(f, "utf8")).map((lit) => ({ f, lit })));
  // A DISCOVERY FLOOR, so a pattern that stops matching cannot read as all-clear:
  // the job record's own upload is the one real caller.
  assert.ok(sites.length >= 1, "no addPhoto call site was found; the pattern or the tree changed");
  const bad = sites.flatMap(({ f, lit }) => callProblems(lit).map((p) => `${f}: ${p}`));
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("4 · the website-intake photos go to the business's own folder, and nothing is published from there", () => {
  const src = stripComments(readFileSync("app/src/screens/SiteIntake.jsx", "utf8"));
  assert.match(src, /uploadBusinessPhoto\(business\.id, file, "intake"\)/);
  assert.ok(!/addPhoto\b/.test(src), "SiteIntake no longer imports or calls the job-photo function");
  assert.ok(!/gallery_images/.test(src), "choosing a photo for the website does not publish it");
});
