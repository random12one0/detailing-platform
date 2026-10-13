// 0.11bd, credential-free regression proof. No network or database writes.
// Run from the root: node scripts/media-cache-delete.mjs [--break=no-purge]
// The real handler and purge adapter run against separate origin and edge stores.
// An origin 404 is deliberately insufficient: every deletion warms a 200 HIT first.
// For the required real Cloudflare/browser proof use media-cache-delete-live.mjs.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, rmSync, rmdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { handlePhotoDoor } from "../supabase/functions/_shared/photoDoor.ts";
import * as production from "../supabase/functions/_shared/mediaCache.ts";
import { writeReceipt } from "./receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = process.argv.find((a) => a.startsWith("--break="))?.slice(8) || "";
if (BREAK && BREAK !== "no-purge") throw new Error("Unknown sabotage");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const KEY = `${A}/gallery/55555555-5555-4555-8555-555555555555.png`;
const BASE = "https://media.example.test";
const URL = `${BASE}/${KEY}`;
const config = { zoneId: "a".repeat(32), token: "test-only" };
let mod = production;
const scratch = path.resolve(".tmp-0.11bd");
if (BREAK) {
  mkdirSync(scratch, { recursive: true });
  const file = path.join(scratch, "mediaCache.ts");
  let source = readFileSync("supabase/functions/_shared/mediaCache.ts", "utf8");
  const needle = "await purge(publicUrl(base, key));";
  assert.equal(source.split(needle).length - 1, 1, "sabotage must land exactly once");
  source = source.replace(needle, "// sabotage: the original origin-only deletion")
    .replace('"./r2.ts"', JSON.stringify(pathToFileURL(path.resolve("supabase/functions/_shared/r2.ts")).href));
  writeFileSync(file, source);
  mod = await import(pathToFileURL(file).href);
}

function world({ mode = "ok", legacy = false, missing = false, originFails = false } = {}) {
  let origin = true, edge = false;
  const events = [], requests = [], logs = [];
  const publicRead = () => {
    if (edge) return { status: 200, cache: "HIT" };
    if (origin) { edge = true; return { status: 200, cache: "MISS" }; }
    return { status: 404, cache: "MISS" };
  };
  const store = {
    putUrl: async () => "https://r2.example.test/put",
    getUrl: async () => "https://r2.example.test/get",
    head: async () => ({ exists: origin, bytes: origin ? 70 : null }),
    list: async () => ({ objects: [], next: null }),
    del: async (bucket, key) => {
      events.push(["delete", bucket, key]);
      if (originFails) throw new Error("origin unavailable");
      origin = false;
    },
  };
  const purge = mod.makeMediaPurge(config, async (url, init) => {
    requests.push({ url, method: init.method, files: JSON.parse(init.body).files, hasAuth: init.headers.Authorization === `Bearer ${config.token}`, timeout: !!init.signal });
    events.push(["purge", ...JSON.parse(init.body).files]);
    if (mode === "network") throw new Error("unsafe upstream details");
    if (mode === "invalid-json") return new Response("not JSON");
    if (mode === "http-error") return Response.json({ success: true }, { status: 403 });
    if (mode === "false") return Response.json({ success: false });
    if (mode === "missing-success") return Response.json({ result: {} });
    edge = false;
    return Response.json({ success: true, result: { id: "purged" } });
  });
  const deps = {
    requireMember: async (req, biz) => req.headers.get("Authorization") === "Bearer owner" && biz === A
      ? { businessId: A, userId: "owner", role: "owner", permissions: [] } : null,
    can: (member) => member.role === "owner",
    withinLimits: async () => true,
    limit: { windowSeconds: 3600, limit: 600 },
    mediaUrl: (key) => `${BASE}/${key}`,
    r2: legacy ? store : mod.withMediaCache(store, BASE, missing ? null : purge),
    log: (...args) => logs.push(args),
  };
  const remove = async (key = KEY, auth = "owner") => {
    const r = await handlePhotoDoor(new Request("https://door.example.test", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` },
      body: JSON.stringify({ action: "remove", store: "media", business_id: A, key }),
    }), deps);
    return { status: r.status, body: await r.json() };
  };
  return { publicRead, remove, events, requests, logs, store, origin: () => origin };
}

const targets = [
  ["warm public URL becomes unreadable after remove", async () => {
    const w = world();
    assert.equal(w.publicRead().status, 200);
    assert.deepEqual(w.publicRead(), { status: 200, cache: "HIT" });
    assert.deepEqual(await w.remove(), { status: 200, body: { removed: true } });
    assert.equal(w.origin(), false);
    assert.equal(w.publicRead().status, 404, "original warmed public URL still returns 200 HIT");
    assert.deepEqual(w.events, [["delete", "business-media", KEY], ["purge", URL]]);
    assert.deepEqual(w.requests, [{ url: `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/purge_cache`, method: "POST", files: [URL], hasAuth: true, timeout: true }]);
  }],
  ["missing purge configuration refuses before deleting", async () => {
    const w = world({ missing: true });
    assert.equal((await w.remove()).status, 500);
    assert.equal(w.origin(), true);
    assert.equal(w.events.length, 0);
  }],
  ...["false", "http-error", "network", "invalid-json", "missing-success"].map((mode) => [`purge ${mode} never confirms removal`, async () => {
    const w = world({ mode });
    w.publicRead();
    const r = await w.remove();
    assert.equal(r.status, 500);
    assert.equal(r.body.removed, undefined);
    assert.equal(w.publicRead().status, 200, "failed purge fixture must retain cached bytes");
    assert.ok(!JSON.stringify({ body: r.body, logs: w.logs }).includes("unsafe upstream details"));
  }]),
  ["retry purges even when origin was already removed", async () => {
    const w = world();
    w.publicRead();
    await w.store.del("business-media", KEY);
    assert.equal(w.publicRead().status, 200);
    assert.equal((await w.remove()).status, 200);
    assert.equal(w.publicRead().status, 404, "retry left the cached public copy readable");
  }],
  ["origin failure cannot become successful removal", async () => {
    const w = world({ originFails: true });
    assert.equal((await w.remove()).status, 500);
    assert.equal(w.requests.length, 0);
  }],
  ["foreign key refused before origin or purge call", async () => {
    const w = world();
    assert.equal((await w.remove(KEY.replace(A, B))).status, 404);
    assert.equal(w.events.length, 0);
  }],
  ["unauthenticated removal refused", async () => {
    const w = world();
    assert.equal((await w.remove(KEY, "stranger")).status, 401);
    assert.equal(w.events.length, 0);
  }],
  ["private objects bypass public purge", async () => {
    const w = world();
    const wrapped = mod.withMediaCache(w.store, null, null);
    await wrapped.del("job-photos", KEY);
    await wrapped.del("expense-receipts", KEY);
    assert.equal(w.requests.length, 0);
    assert.equal(w.events.length, 2);
  }],
  ["configuration and photo-door wiring are present", async () => {
    assert.deepEqual(mod.mediaCacheConfig(() => undefined).missing, [...mod.MEDIA_CACHE_ENV]);
    assert.equal(mod.mediaCacheConfig((name) => name === "CF_MEDIA_ZONE_ID" ? "invalid" : "test-only").config, null);
    assert.deepEqual(mod.mediaCacheConfig((name) => name === "CF_MEDIA_ZONE_ID" ? config.zoneId : config.token).config, config);
    const source = readFileSync("supabase/functions/photo-door/index.ts", "utf8");
    assert.match(source, /r2: config \? withMediaCache\(makeR2\(config\), base, cacheConfig \? makeMediaPurge\(cacheConfig\) : null\)/);
  }],
];
assert.equal(targets.length, 13, "declared target population changed");
const failures = [];
const evidence = [];
let completed = 0;
try {
  for (const [name, run] of targets) {
    try { await run(); evidence.push(`PASS ${name}`); console.log(`PASS ${name}`); }
    catch (e) { failures.push(`${name}: ${e.message}`); evidence.push(`FAIL ${name}: ${e.message}`); console.log(`FAIL ${name}: ${e.message}`); }
    completed++;
  }
  // The original product's deletion is the canary, not an invented status rule.
  const old = world({ legacy: true });
  old.publicRead();
  const oldHit = old.publicRead();
  const oldRemoval = await old.remove();
  const canaryCaught = oldHit.cache === "HIT" && oldRemoval.status === 200 && !old.origin() && old.publicRead().status === 200;
  const artifact = `receipts/media-cache-delete${BREAK ? ".sabotage" : ""}.txt`;
  mkdirSync("receipts", { recursive: true });
  writeFileSync(artifact, [...evidence, `Canary: origin-only remove returns ${oldRemoval.status}, origin exists ${old.origin()}, warmed public URL ${old.publicRead().status} ${old.publicRead().cache}`].join("\n") + "\n");
  const { path: receipt } = writeReceipt({
    check_id: "media-cache-delete", started_at, status: failures.length ? "fail" : "pass",
    expected_targets: 13, discovered_targets: targets.length, attempted_targets: targets.length,
    completed_targets: completed, skipped_targets: 0, assertions_executed: completed, min_assertions: 13,
    assertion_floor: "Thirteen fixed scenario groups, each one judged by assertions over the real handler/adapter. The population is independently asserted equal to thirteen.",
    artifacts: [artifact],
    failures, dimensions: { roadmap: "0.11bd", break: BREAK || undefined, transport: "in-memory origin, edge cache and Cloudflare API; real production handler and adapter" },
    canary: { id: "original-cached-delete", observed_failure: canaryCaught, what: "origin-only remove acknowledges success while the warmed public URL remains 200 HIT" },
    warnings: ["This proves the local policy and regression detector, not the live Cloudflare deployment or gallery screen's row-only deletion."],
  });
  console.log(`${completed}/${targets.length} targets, ${failures.length} failed; ${receipt}`);
  process.exitCode = failures.length ? 1 : 0;
} finally {
  if (BREAK) { rmSync(path.join(scratch, "mediaCache.ts")); rmdirSync(scratch); }
}
