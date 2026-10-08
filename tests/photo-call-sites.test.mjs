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

// ---------------------------------------------------------------------------
// ROADMAP 0.11 SLICE 4 — AND THE SAME QUESTION ABOUT THE OTHER UPLOAD FUNCTION
// ---------------------------------------------------------------------------
// `uploadBusinessPhoto` returned a bare url until slice 4 and now returns
// `{ url, key }` — the key, so `publishToGallery` can undo its own upload
// instead of keeping a second copy of the whole function. **That is a change to
// a function three screens call, and getting it wrong is silent in the worst
// way:** `const url = await uploadBusinessPhoto(…)` still compiles, still
// uploads the file, and then writes the string `"[object Object]"` into a
// business's `logo_url` or a `gallery_images` row. A saved row, not a failed
// press, and nothing goes red.
//
// So the same question this file asks of `addPhoto` is asked here: not "does
// the function work" but "does every caller use it correctly", with the callers
// DISCOVERED so a new screen is checked by existing.

/** How each `uploadBusinessPhoto(` call in `src` takes its result. */
export function uploadBindings(src) {
  const code = stripComments(src);
  const out = [];
  for (const m of code.matchAll(/(?:(?:const|let|var)\s+(\{[^}]*\}|[A-Za-z_$][\w$]*)\s*=\s*)?await\s+uploadBusinessPhoto\s*\(/g)) {
    out.push(m[1] ?? null);   // null = the result is ignored, which is fine
  }
  return out;
}

/** What is wrong with one binding, as a plain phrase. Empty string is fine. */
export function bindingProblem(bound) {
  if (bound === null) return "";                       // ignored on purpose
  if (!bound.startsWith("{")) {
    return `takes the result as a single value (\`${bound}\`); uploadBusinessPhoto returns { url, key }, `
      + "so this writes an object where a url belongs";
  }
  const names = bound.slice(1, -1).split(",").map((t) => t.trim().split(":")[0].trim()).filter(Boolean);
  const unknown = names.filter((n) => !["url", "key"].includes(n));
  return unknown.length ? `destructures ${unknown.join(", ")}, which uploadBusinessPhoto does not return` : "";
}

test("5 · SABOTAGE — the checker sees the binding every call site used before slice 4", () => {
  const old = 'const url = await uploadBusinessPhoto(business.id, file, "gallery");';
  assert.deepEqual(uploadBindings(old), ["url"]);
  assert.match(bindingProblem(uploadBindings(old)[0]), /single value/);
  // and the forms that are right
  assert.equal(bindingProblem(uploadBindings('const { url } = await uploadBusinessPhoto(b, f, "gallery");')[0]), "");
  assert.equal(bindingProblem(uploadBindings('const { url, key: dest } = await uploadBusinessPhoto(b, f, "gallery");')[0]), "");
  assert.equal(bindingProblem(uploadBindings('await uploadBusinessPhoto(b, f, "intake");')[0]), "");
  // a field that does not exist is caught too, which is the other direction
  assert.match(bindingProblem(uploadBindings('const { publicUrl } = await uploadBusinessPhoto(b, f, "gallery");')[0]), /does not return/);
  // the definition is not a call
  assert.deepEqual(uploadBindings("export async function uploadBusinessPhoto(businessId, file, folder = \"gallery\") {"), []);
});

test("6 · THE REAL RESULT — every uploadBusinessPhoto caller in app/src takes its result correctly", () => {
  const files = walk(ROOT).filter((f) => !/lib[\\/]upload\.js$/.test(f));
  const sites = files.flatMap((f) => uploadBindings(readFileSync(f, "utf8")).map((b) => ({ f, b })));
  // A DISCOVERY FLOOR: four callers today — the logo and hero on Business info,
  // the gallery screen, the website intake, and the gallery copy in photos.js.
  assert.ok(sites.length >= 3, `only ${sites.length} uploadBusinessPhoto call sites found; the pattern or the tree changed`);
  const bad = sites.flatMap(({ f, b }) => { const p = bindingProblem(b); return p ? [`${f}: ${p}`] : []; });
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("4 · the website-intake photos go to the business's own folder, and nothing is published from there", () => {
  const src = stripComments(readFileSync("app/src/screens/SiteIntake.jsx", "utf8"));
  assert.match(src, /uploadBusinessPhoto\(business\.id, file, "intake"\)/);
  assert.ok(!/addPhoto\b/.test(src), "SiteIntake no longer imports or calls the job-photo function");
  assert.ok(!/gallery_images/.test(src), "choosing a photo for the website does not publish it");
});
