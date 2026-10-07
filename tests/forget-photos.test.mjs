// ROADMAP 0.11 SLICE 3 — A FORGOTTEN CUSTOMER'S PHOTO FILES LEAVE EVERY STORE.
//
//   node --test tests/forget-photos.test.mjs
//
// Credential-free, no network, no database, no R2. It runs
// supabase/functions/_shared/forgetPhotos.ts against fakes of both stores, then
// loads the real delete-customer/index.ts through the repo's own Node harness
// with a made-up address and key, so it can answer only the requests that are
// refused before anything is read.
//
// `tests/forget-customer.test.mjs` is the integration test (it needs
// credentials, creates a throwaway business and runs against the DEPLOYED
// function). It was not run for this change: it writes to the shared demo
// database and the function it exercises is the old one until Andrew publishes.
// Its § 6, the source reads, was updated by hand to follow the code.
//
// WHAT THIS CATCHES THAT NOTHING ELSE DID. The old code asked Supabase to
// remove the paths and read "no error" as "gone". Pointed at R2 that is a
// customer asking to be forgotten and a stranger's car staying in a bucket,
// reported as success. Each probe below is one way of reading silence as
// success; § 8 removes each guard in turn and asserts the probe then passes.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as forget from "../supabase/functions/_shared/forgetPhotos.ts";
import { makeR2 } from "../supabase/functions/_shared/r2.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const BOOKING = "33333333-3333-4333-8333-333333333333";
const P1 = "55555555-5555-4555-8555-555555555555";
const P2 = "66666666-6666-4666-8666-666666666666";
const key = (biz, photo, ext = "jpg") => `${biz}/${BOOKING}/${photo}.${ext}`;

function world(over = {}) {
  const w = {
    r2Objects: new Set(), supaObjects: new Set(), calls: [], logs: [],
    r2Null: false, r2DelLeaves: false, r2Throws: false,
    supaRemoveError: false, supaRemoveLeaves: false, supaExistsThrows: false, ...over,
  };
  w.stores = {
    r2: w.r2Null ? null : {
      del: async (_b, k) => { w.calls.push(["r2del", k]); if (w.r2Throws) throw new Error("boom"); if (!w.r2DelLeaves) w.r2Objects.delete(k); },
      head: async (_b, k) => ({ exists: w.r2Objects.has(k) }),
    },
    supa: {
      remove: async (ps) => { w.calls.push(["supaRemove", ps.length]); if (w.supaRemoveError) return { error: new Error("e") }; if (!w.supaRemoveLeaves) for (const p of ps) w.supaObjects.delete(p); return { error: null }; },
      exists: async (p) => { if (w.supaExistsThrows) throw new Error("e"); return w.supaObjects.has(p); },
    },
  };
  w.run = (paths, mod = forget) => mod.removePhotoFiles(A, paths, w.stores, (...a) => w.logs.push(a.map(String).join(" ")));
  return w;
}

test("1 · a photo that is only in R2 is removed, and the count is of files confirmed gone", async () => {
  const w = world();
  w.r2Objects.add(key(A, P1));
  assert.deepEqual(await w.run([key(A, P1)]), { ok: true, gone: 1 });
  assert.ok(!w.r2Objects.has(key(A, P1)));
});

test("2 · a photo that is only in Supabase Storage still goes (the deployed integration test's case)", async () => {
  const w = world();
  w.supaObjects.add(key(A, P1));
  assert.deepEqual(await w.run([key(A, P1)]), { ok: true, gone: 1 });
  assert.ok(!w.supaObjects.has(key(A, P1)));
});

test("3 · a customer with some of each, a png, and an older-shaped path: all gone", async () => {
  const w = world();
  const legacy = `${A}/old-folder/photo-without-a-uuid.jpg`;     // not one of ours: Supabase only
  for (const k of [key(A, P1), key(A, P2, "png")]) w.r2Objects.add(k);
  for (const k of [key(A, P2, "png"), legacy]) w.supaObjects.add(k);
  assert.deepEqual(await w.run([key(A, P1), key(A, P2, "png"), legacy]), { ok: true, gone: 3 });
  assert.equal(w.r2Objects.size + w.supaObjects.size, 0);
  assert.ok(!w.calls.some((c) => c[0] === "r2del" && c[1] === legacy), "R2 is never asked about a path this product did not mint");
});

test("4 · nothing to remove needs neither store", async () => {
  const w = world({ r2Null: true });
  assert.deepEqual(await w.run([]), { ok: true, gone: 0 });
  assert.equal(w.calls.length, 0);
});

test("5 · SILENCE IS NOT SUCCESS: a file that is still there after a quiet delete is a refusal, in either store", async () => {
  const r2 = world({ r2DelLeaves: true });
  r2.r2Objects.add(key(A, P1));
  assert.deepEqual(await r2.run([key(A, P1)]), { ok: false, reason: "still_there" });
  const supa = world({ supaRemoveLeaves: true });
  supa.supaObjects.add(key(A, P1));
  assert.deepEqual(await supa.run([key(A, P1)]), { ok: false, reason: "still_there" });
});

test("6 · every way a store can fail stops the whole thing", async () => {
  const cases = {
    "R2 throws": [{ r2Throws: true }, "r2_failed"],
    "Supabase answers an error": [{ supaRemoveError: true }, "supabase_failed"],
    "Supabase cannot say whether it is there": [{ supaExistsThrows: true }, "supabase_failed"],
    "R2 is not configured and a file of ours is named": [{ r2Null: true }, "r2_unavailable"],
  };
  for (const [what, [over, reason]] of Object.entries(cases)) {
    const w = world(over);
    w.r2Objects.add(key(A, P1)); w.supaObjects.add(key(A, P1));
    assert.deepEqual(await w.run([key(A, P1)]), { ok: false, reason }, what);
  }
});

test("7 · another business's key is refused before anything is touched", async () => {
  const w = world();
  w.r2Objects.add(key(B, P2)); w.r2Objects.add(key(A, P1));
  assert.deepEqual(await w.run([key(A, P1), key(B, P2)]), { ok: false, reason: "foreign_path" });
  assert.deepEqual(w.calls, [], "not one delete was issued, not even for the key that was ours");
  assert.ok(w.r2Objects.has(key(B, P2)));
  // Traversal shapes that START with our id do not parse as ours, so they never reach R2.
  const t = world();
  const sneaky = `${A}/../${B}/${BOOKING}/${P2}.jpg`;
  t.supaObjects.add(sneaky);
  assert.equal((await t.run([sneaky])).ok, true);
  assert.ok(!t.calls.some((c) => c[0] === "r2del"));
});

test("8 · the real store: a signed DELETE then a signed HEAD, and a failed request carries no URL", async () => {
  const cfg = { accountId: "acct1234", accessKeyId: "AKIDEXAMPLE", secretAccessKey: "SENTINEL-do-not-print" };
  const gone = new Set();
  const seen = [];
  const fakeFetch = async (url, init) => {
    seen.push(init.method);
    const k = new URL(url).pathname.replace("/job-photos/", "");
    if (init.method === "DELETE") { gone.add(k); return new Response(null, { status: 204 }); }
    return new Response(null, { status: gone.has(k) ? 404 : 200, headers: { "content-length": "1000" } });
  };
  const w = world();
  w.stores.r2 = makeR2(cfg, fakeFetch);
  assert.deepEqual(await w.run([key(A, P1)]), { ok: true, gone: 1 });
  assert.deepEqual(seen, ["DELETE", "HEAD"]);
  const logged = world();
  logged.stores.r2 = makeR2(cfg, async (url) => { throw new Error(`failed ${url}`); });
  assert.equal((await logged.run([key(A, P1)])).reason, "r2_failed");
  assert.ok(!/X-Amz|SENTINEL|r2\.cloudflarestorage/.test(logged.logs.join("\n")), "nothing signed or secret reaches the log");
});

test("9 · delete-customer: the source calls it in the right place, owner-only, nothing personal logged", () => {
  const code = readFileSync("supabase/functions/delete-customer/index.ts", "utf8").replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const at = (s) => code.indexOf(s);
  assert.ok(at("removePhotoFiles(") > 0 && at('rpc("forget_customer"') > at("removePhotoFiles("), "files before rows");
  assert.match(code, /if \(!files\.ok\)[\s\S]{0,400}return json\(/, "a failed removal stops everything");
  assert.match(code, /member\.role !== "owner"/);
  assert.match(code, /photos_deleted: filesRemoved/);
  assert.match(code, /filesRemoved = files\.gone/);
  assert.ok(!/storage\.from\("job-photos"\)\.remove\(paths\)/.test(code), "the old read-silence-as-success call is gone");
  assert.ok(!/console\.(log|warn|error)\([^)]*(customer_email|customer_name|\bemail\b|\bphone\b)/.test(code));
  const envReads = [...code.matchAll(/Deno\.env\.get\(([^)]*)\)/g)].map((m) => m[1]);
  assert.deepEqual(envReads, ["n"], "credentials are read by name through r2Config and nowhere else");
});

// ------------------------------------------------------------ sabotage
const SRC = readFileSync("supabase/functions/_shared/forgetPhotos.ts", "utf8").replace(/\r\n/g, "\n");
const dir = mkdtempSync(path.join(tmpdir(), "forget-sab-"));
const keyUrl = JSON.stringify(pathToFileURL(path.resolve("supabase/functions/_shared/photoKey.ts")).href);
async function variant(label, from, to) {
  assert.equal(SRC.split(from).length - 1, 1, `${label}: the text to sabotage is not unique or not there`);
  const f = path.join(dir, `${label}.ts`);
  writeFileSync(f, SRC.replace('"./photoKey.ts"', keyUrl).replace(from, to));
  return import(pathToFileURL(f).href);
}
const PROBES = {
  async r2LeftoverCounted(m) { const w = world({ r2DelLeaves: true }); w.r2Objects.add(key(A, P1)); return (await w.run([key(A, P1)], m)).ok; },
  async supabaseLeftoverCounted(m) { const w = world({ supaRemoveLeaves: true }); w.supaObjects.add(key(A, P1)); return (await w.run([key(A, P1)], m)).ok; },
  async foreignKeyDeleted(m) { const w = world(); w.supaObjects.add(key(B, P2)); w.r2Objects.add(key(B, P2)); await w.run([key(B, P2)], m); return !w.supaObjects.has(key(B, P2)) || !w.r2Objects.has(key(B, P2)); },
  async r2UnconfiguredPasses(m) { const w = world({ r2Null: true }); w.r2Objects.add(key(A, P1)); return (await w.run([key(A, P1)], m)).ok; },
  async r2ErrorSwallowed(m) { const w = world({ r2Throws: true }); w.r2Objects.add(key(A, P1)); return (await w.run([key(A, P1)], m)).ok; },
};
// NOT LISTED: removing the `if (error)` check on Supabase's remove, alone. It is
// belt and braces with the `exists` loop that follows it — a remove that errored
// leaves the file there, and the next loop refuses on that — so the check cannot
// be broken separately and a sabotage entry for it would be a probe that cannot
// fail. § 6 asserts the behavior either way.
const SAB = [
  ["r2LeftoverCounted", "if ((await stores.r2!.head(BUCKET, key)).exists) {", "if (false) {", "asking R2 whether the file is really gone"],
  ["supabaseLeftoverCounted", "if (await stores.supa.exists(p)) {", "if (false) {", "asking Supabase whether the file is really gone"],
  ["foreignKeyDeleted", "if (parseObjectKey(p) !== null && !businessOwnsKey(businessId, p)) {", "if (false) {", "the other-business guard"],
  ["r2UnconfiguredPasses", 'return { ok: false, reason: "r2_unavailable" };', "return { ok: true, gone: paths.length };", "refusing when R2 is not configured"],
  ["r2ErrorSwallowed", 'return { ok: false, reason: "r2_failed" };', "continue;", "stopping on an R2 failure"],
];

test("10 · SABOTAGE — each guard removed is seen (control first)", async () => {
  for (const name of Object.keys(PROBES)) assert.equal(await PROBES[name](forget), false, `control: ${name} must be refused by the real code`);
  for (const [probe, from, to, what] of SAB) {
    assert.equal(await PROBES[probe](await variant(probe, from, to)), true, `sabotage not seen — ${what}`);
  }
});

test("11 · the real delete-customer loads and refuses what it should before reading anything", async () => {
  process.env.SUPABASE_URL = "http://127.0.0.1:9";                 // nothing listens here
  process.env.SUPABASE_SERVICE_ROLE_KEY = "not-a-real-key";
  const { startEdge } = await import("../scripts/lib/edgeLocal.mjs");
  const edge = await startEdge(["delete-customer"]);
  try {
    const post = (body) => fetch(`${edge.url}/functions/v1/delete-customer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(async (r) => [r.status, await r.json().catch(() => null)]);
    assert.deepEqual(await post({}), [400, { error: "business_id and customer_id are required" }]);
    assert.deepEqual(await post({ business_id: A, customer_id: B }), [404, { error: "not_found" }]);       // no session
    assert.equal((await fetch(`${edge.url}/functions/v1/delete-customer`, { method: "OPTIONS" })).status, 204);
  } finally { await edge.close(); }
});
