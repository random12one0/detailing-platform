// ROADMAP 0.11 slice 6 — THE PHOTO RECONCILE, RUN IN MEMORY.
//
//   node --test tests/photo-reconcile.test.mjs
//
// Credential-free, no network, no database, no R2, no Deno. It loads supabase/functions/_shared/r2.ts,
// photoKey.ts and photoReconcile.ts (Node 24 strips the types) and hands them an in-memory world.
//
// WHAT IT PROVES: the listing is read strictly (an unreadable size or a cut-short page throws, never
// reads as zero or as the end); the signed listing URL carries the proof R2 will check, recomputed here
// by an INDEPENDENT SigV4 written with node:crypto and not by r2.ts; every kind of drift the design names
// is counted (an object with no row, a row with no object, a size that does not match) plus the two the
// design implies (a row with no recorded size, a row filed under another business's prefix); the allowance
// is reported and an unreadable one is null, never "nobody is over"; the handler refuses when it should,
// stamps only a run that really happened, and can reach nothing but `list` (no delete exists to call).
//
// WHAT IT DOES NOT PROVE: that R2 accepts the listing signature or that its XML matches what is parsed
// (the first real run after publishing is that proof, and it is Andrew's), the pg_cron call, or anything
// against the live database. `tests/photo-reconcile-sql.test.mjs` runs the migration on PGlite.
//
// BREAK IT ON PURPOSE: § 7 rebuilds photoReconcile.ts with ONE guard removed at a time and asserts the
// matching probe goes red. A check nobody has seen fail is how this repo shipped six that tested nothing.

import { createHmac, createHash } from "node:crypto";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as rec from "../supabase/functions/_shared/photoReconcile.ts";
import * as r2lib from "../supabase/functions/_shared/r2.ts";

const SHARED = "supabase/functions/_shared";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const BOOK = "44444444-4444-4444-8444-444444444444";
const p = (n) => `55555555-5555-4555-8555-5555555555${String(n).padStart(2, "0")}`;
const key = (biz, n, ext = "jpg") => `${biz}/${BOOK}/${p(n)}.${ext}`;
const MB = 1024 * 1024;
const SECRET = "SENTINEL-secret-access-key-do-not-print";

// ── 1 · the listing, read strictly ──────────────────────────────────────────────────────────────────────
const page = (items, { truncated = false, token = null } = {}) =>
  `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>job-photos</Name>`
  + items.map(([k, s]) => `<Contents><Key>${k}</Key><LastModified>2026-10-06T00:00:00.000Z</LastModified><Size>${s}</Size></Contents>`).join("")
  + `<IsTruncated>${truncated}</IsTruncated>${token ? `<NextContinuationToken>${token}</NextContinuationToken>` : ""}</ListBucketResult>`;

test("1a · a listing page is read: keys, whole-number sizes, and the continuation", () => {
  const r = r2lib.parseListPage(page([[key(A, 1), 1000], [key(B, 2), 0]], { truncated: true, token: "tok&amp;1" }));
  assert.deepEqual(r.objects, [{ key: key(A, 1), bytes: 1000 }, { key: key(B, 2), bytes: 0 }]);
  assert.equal(r.next, "tok&1", "entities in the token are decoded");
  assert.deepEqual(r2lib.parseListPage(page([])), { objects: [], next: null });
});

test("1b · an unreadable size, a cut-short page and a non-listing all THROW rather than read as zero or as the end", () => {
  assert.throws(() => r2lib.parseListPage(page([[key(A, 1), "abc"]])), /no readable size/);
  assert.throws(() => r2lib.parseListPage(page([[key(A, 1), "1.5"]])), /no readable size/);
  assert.throws(() => r2lib.parseListPage(page([[key(A, 1), "-3"]])), /no readable size/);
  assert.throws(() => r2lib.parseListPage(`<ListBucketResult><Contents><Key>${key(A, 1)}</Key></Contents></ListBucketResult>`), /no readable size/);
  assert.throws(() => r2lib.parseListPage(page([[key(A, 1), 5]], { truncated: true })), /cut short/);
  assert.throws(() => r2lib.parseListPage("<Error><Code>AccessDenied</Code></Error>"), /not a listing/);
});

test("1c · keys with XML entities come back as the real key", () => {
  const r = r2lib.parseListPage(page([["a&amp;b&lt;c&gt;.jpg", 3]]));
  assert.equal(r.objects[0].key, "a&b<c>.jpg");
});

test("1d · listAll follows every page, and a bucket past the page ceiling throws instead of returning part of it", async () => {
  const pages = [{ objects: [{ key: key(A, 1), bytes: 1 }], next: "t1" }, { objects: [{ key: key(A, 2), bytes: 2 }], next: "t2" }, { objects: [{ key: key(A, 3), bytes: 3 }], next: null }];
  const seen = [];
  const all = await r2lib.listAll({ list: async (b, t) => { seen.push(t); return pages[seen.length - 1]; } }, "job-photos");
  assert.equal(all.length, 3);
  assert.deepEqual(seen, [null, "t1", "t2"]);
  await assert.rejects(r2lib.listAll({ list: async () => ({ objects: [], next: "forever" }) }, "job-photos"), /page ceiling/);
});

// ── 2 · the signed listing URL, checked by a signer that is not r2.ts ───────────────────────────────────
const enc3986 = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const hmac = (k, m) => createHmac("sha256", k).update(m).digest();
function independentSignature(url, secret) {
  const u = new URL(url);
  const q = [...u.searchParams.entries()].filter(([k]) => k !== "X-Amz-Signature")
    .map(([k, v]) => [enc3986(k), enc3986(v)]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const canonical = ["GET", u.pathname, q.map(([k, v]) => `${k}=${v}`).join("&"), `host:${u.host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const date = u.searchParams.get("X-Amz-Date"), day = date.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;
  const sts = ["AWS4-HMAC-SHA256", date, scope, createHash("sha256").update(canonical).digest("hex")].join("\n");
  let k = hmac("AWS4" + secret, day);
  for (const part of ["auto", "s3", "aws4_request"]) k = hmac(k, part);
  return createHmac("sha256", k).update(sts).digest("hex");
}

test("2a · makeR2.list asks for a v2 listing and signs it exactly as an independent SigV4 does, with and without a token", async () => {
  const urls = [];
  const fetchFake = async (url) => { urls.push(url); return new Response(page([[key(A, 1), 7]]), { status: 200 }); };
  const store = r2lib.makeR2({ accountId: "acct", accessKeyId: "AKIDEXAMPLE", secretAccessKey: SECRET }, fetchFake, () => new Date("2026-10-06T12:00:00Z"));
  await store.list("job-photos");
  await store.list("job-photos", "next token/+=");
  for (const url of urls) {
    const u = new URL(url);
    assert.equal(u.host, "acct.r2.cloudflarestorage.com");
    assert.equal(u.pathname, "/job-photos");
    assert.equal(u.searchParams.get("list-type"), "2");
    assert.equal(u.searchParams.get("max-keys"), "1000");
    assert.equal(u.searchParams.get("X-Amz-Signature"), independentSignature(url, SECRET), "signature differs from an independent SigV4");
    assert.ok(!url.includes(SECRET), "the secret must never appear in a URL");
  }
  assert.equal(new URL(urls[1]).searchParams.get("continuation-token"), "next token/+=");
});

test("2b · a failed listing call says nothing about the URL, and a non-200 says only the status", async () => {
  const boom = r2lib.makeR2({ accountId: "acct", accessKeyId: "AKID", secretAccessKey: SECRET }, async (url) => { throw new Error("fetch failed for " + url); });
  await assert.rejects(boom.list("job-photos"), (e) => e.message === "R2 request failed" && !/https?:/.test(e.message));
  const denied = r2lib.makeR2({ accountId: "acct", accessKeyId: "AKID", secretAccessKey: SECRET }, async () => new Response("no", { status: 403 }));
  await assert.rejects(denied.list("job-photos"), /R2 request failed \(403\)/);
});

// ── 3 · reconcile(): every kind of drift, counted ───────────────────────────────────────────────────────
const obj = (k, bytes) => ({ key: k, bytes });
const row = (biz, k, bytes) => ({ business_id: biz, path: k, bytes });

test("3a · agreement is clean, with the allowance numbers beside it", () => {
  const r = rec.reconcile([obj(key(A, 1), 3 * MB), obj(key(B, 2), MB)], [row(A, key(A, 1), 3 * MB), row(B, key(B, 2), MB)], { total_bytes: 10 * 1024 * MB, share_bytes: 100 * MB });
  assert.equal(r.clean, true);
  assert.deepEqual([r.orphans, r.missing, r.mismatched, r.unknown_size_rows, r.misfiled, r.unattributed_objects], [0, 0, 0, 0, 0, 0]);
  assert.equal(r.drift_bytes, 0);
  assert.equal(r.r2_bytes, 4 * MB);
  assert.equal(r.allowance.businesses_over_share, 0);
  assert.equal(r.allowance.store_used_pct, Math.round((4 * MB / (10 * 1024 * MB)) * 1000) / 10);
});

test("3b · an object with no row, a row with no object, and a size that does not match are each their own number", () => {
  const r = rec.reconcile(
    [obj(key(A, 1), 5 * MB), obj(key(A, 2), 2 * MB), obj(key(A, 3), 9 * MB)],
    [row(A, key(A, 1), 5 * MB), row(A, key(A, 3), 1 * MB), row(A, key(A, 4), 4 * MB)], null);
  assert.deepEqual([r.orphans, r.orphan_bytes], [1, 2 * MB]);            // key(A,2): in R2, no row
  assert.deepEqual([r.missing, r.missing_bytes], [1, 4 * MB]);           // key(A,4): row, no object
  assert.deepEqual([r.mismatched, r.mismatch_bytes], [1, 8 * MB]);       // key(A,3): 9 stored, 1 recorded
  assert.equal(r.clean, false);
  assert.equal(r.drift_bytes, 16 * MB - 10 * MB);                        // R2 holds 16, the rows say 10
  assert.equal(r.businesses_drifting, 1);
});

test("3c · a row with no recorded size is UNKNOWN, never zero", () => {
  const r = rec.reconcile([obj(key(A, 1), 3 * MB)], [row(A, key(A, 1), null)], null);
  assert.equal(r.unknown_size_rows, 1);
  assert.equal(r.clean, false);
  assert.equal(r.db_bytes, 0);
});

test("3d · a row filed under one business whose key sits under another's prefix is a fault of its own", () => {
  const r = rec.reconcile([obj(key(B, 1), MB)], [row(A, key(B, 1), MB)], null);
  assert.equal(r.misfiled, 1);
  assert.equal(r.clean, false);
  assert.equal(r.orphans, 1, "B's object has no row of B's own");
});

test("3e · a key this product does not mint is counted as unattributed, under no budget", () => {
  const r = rec.reconcile([obj("stray/file.txt", 700), obj("../escape.jpg", 5)], [], null);
  assert.deepEqual([r.unattributed_objects, r.unattributed_bytes, r.r2_objects, r.r2_bytes], [2, 705, 2, 705]);
  assert.equal(r.clean, false);
});

test("3f · over the share is read from the larger of what R2 holds and what the rows say; an unreadable allowance is null, not false", () => {
  const cap = { total_bytes: 1000 * MB, share_bytes: 10 * MB };
  const r = rec.reconcile([obj(key(A, 1), 12 * MB), obj(key(B, 2), MB)], [row(A, key(A, 1), MB), row(B, key(B, 2), MB)], cap);
  assert.equal(r.named[A].over_share, true);
  assert.equal(r.named[B], undefined, "B is under its share and clean, so it is not named");
  assert.equal(r.allowance.businesses_over_share, 1);
  const unknown = rec.reconcile([obj(key(A, 1), 12 * MB)], [row(A, key(A, 1), 12 * MB)], null);
  assert.equal(unknown.allowance, null);
  assert.equal(unknown.named[A], undefined);
  assert.equal(rec.reconcile([obj(key(A, 1), MB)], [row(A, key(A, 2), MB)], null).named[A].over_share, null);
});

test("3g · the totals cover every business, and only the worst are named", () => {
  const objects = [], rows = [];
  for (let i = 0; i < 30; i++) {
    const biz = `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`;
    objects.push(obj(`${biz}/${BOOK}/${p(1)}.jpg`, (i + 1) * MB));   // an orphan each, bigger each time
  }
  const r = rec.reconcile(objects, rows, null);
  assert.equal(r.businesses_seen, 30);
  assert.equal(r.businesses_drifting, 30);
  assert.equal(r.orphans, 30);
  assert.equal(Object.keys(r.named).length, rec.NAMED_BUSINESSES);
  assert.equal(r.named_truncated, true);
  const biggest = `aaaaaaaa-aaaa-4aaa-8aaa-${String(29).padStart(12, "0")}`;
  assert.ok(r.named[biggest], "the biggest drift must be named");
});

test("3h · it does not change what it was given", () => {
  const objects = Object.freeze([Object.freeze(obj(key(A, 1), MB))]);
  const rows = Object.freeze([Object.freeze(row(A, key(A, 2), MB))]);
  assert.doesNotThrow(() => rec.reconcile(objects, rows, Object.freeze({ total_bytes: 1, share_bytes: 1 })));
});

// ── 4 · the handler ─────────────────────────────────────────────────────────────────────────────────────
function world(mod = rec, over = {}) {
  const w = {
    stamps: [], logs: [], listed: 0, now: new Date("2026-10-06T12:00:00Z"), last: null, limitOk: true,
    listObjects: [obj(key(A, 1), MB)], rows: [row(A, key(A, 1), MB)], rowsFail: false, listFail: false,
    allowance: { total_bytes: 100 * MB, share_bytes: MB }, allowanceFail: false, stampFail: false, ...over,
  };
  const r2 = w.noR2 ? null : new Proxy({
    list: async () => { w.listed++; if (w.listFail) throw new Error("R2 request failed"); return { objects: w.listObjects, next: null }; },
  }, { get(t, k) { if (k === "list") return t.list; throw new Error("the handler reached for " + String(k)); } });
  w.deps = {
    now: () => w.now,
    withinLimits: async () => w.limitOk,
    r2, missing: ["R2_ACCOUNT_ID"],
    lastRun: async () => w.last,
    loadRows: async () => { if (w.rowsFail) throw new Error("rows boom"); return w.rows; },
    allowance: async () => { if (w.allowanceFail) throw new Error("rpc boom"); return w.allowance; },
    stamp: async (d) => { if (w.stampFail) throw new Error("stamp boom"); w.stamps.push(d); },
    log: (...a) => w.logs.push(a.join(" ")),
  };
  w.call = async () => { const res = await mod.handlePhotoReconcile(new Request("https://x.test/", { method: "POST", body: "{}" }), w.deps); return { status: res.status, body: await res.json() }; };
  return w;
}

test("4a · a normal run lists, reads the rows, stamps the report once and returns it", async () => {
  const w = world();
  const { status, body } = await w.call();
  assert.equal(status, 200);
  assert.equal(body.ran, true);
  assert.equal(w.stamps.length, 1);
  assert.equal(w.stamps[0].clean, true);
  assert.equal(body.report.r2_objects, 1);
  assert.equal(w.listed, 1);
});

test("4b · over the rate limit it answers 429 and touches nothing", async () => {
  const w = world(rec, { limitOk: false });
  assert.equal((await w.call()).status, 429);
  assert.deepEqual([w.listed, w.stamps.length], [0, 0]);
});

test("4c · R2 not configured is a 503 in words, logs only the NAME, and stamps NOTHING", async () => {
  const w = world(rec, { noR2: true });
  const { status, body } = await w.call();
  assert.equal(status, 503);
  assert.equal(body.ran, false);
  assert.equal(w.stamps.length, 0, "a run that did not happen must not read as a clean one");
  assert.match(w.logs.join(" "), /R2_ACCOUNT_ID/);
});

test("4d · a run less than six hours after the last real one is refused before R2 is touched", async () => {
  const w = world(rec, { last: new Date(w0().getTime() - 5 * 3600 * 1000).toISOString() });
  const { body } = await w.call();
  assert.equal(body.skipped, "too_soon");
  assert.deepEqual([w.listed, w.stamps.length], [0, 0]);
  const old = world(rec, { last: new Date(w0().getTime() - 7 * 3600 * 1000).toISOString() });
  assert.equal((await old.call()).body.ran, true);
  const seeded = world(rec, { last: null });
  assert.equal((await seeded.call()).body.ran, true, "a seeded row is not a run");
});
function w0() { return new Date("2026-10-06T12:00:00Z"); }

test("4e · a failed listing is a 502, says nothing about the URL, and stamps NOTHING", async () => {
  const w = world(rec, { listFail: true });
  const { status, body } = await w.call();
  assert.equal(status, 502);
  assert.equal(w.stamps.length, 0);
  assert.ok(!/https?:|secret|AKID/i.test(JSON.stringify(body) + w.logs.join(" ")));
});

test("4f · a failed read of the rows is a 500 and stamps NOTHING", async () => {
  const w = world(rec, { rowsFail: true });
  assert.equal((await w.call()).status, 500);
  assert.equal(w.stamps.length, 0);
});

test("4g · an unreadable allowance still stamps the drift, with the allowance null", async () => {
  const w = world(rec, { allowanceFail: true });
  assert.equal((await w.call()).status, 200);
  assert.equal(w.stamps[0].allowance, null);
});

test("4h · a result that could not be recorded is a 500, not a 200", async () => {
  const w = world(rec, { stampFail: true });
  const { status, body } = await w.call();
  assert.equal(status, 500);
  assert.equal(body.ran, false);
});

test("4i · it can reach nothing on R2 but `list`: the world throws on any other property", async () => {
  const w = world();
  await w.call();
  assert.ok(!w.logs.some((l) => /reached for/.test(l)));
  assert.throws(() => w.deps.r2.del, /reached for del/);
});

// ── 5 · the files that wire it ──────────────────────────────────────────────────────────────────────────
test("5a · the edge function connects the handler to the real things and writes nothing itself", () => {
  const src = readFileSync("supabase/functions/photo-reconcile/index.ts", "utf8");
  assert.match(src, /handlePhotoReconcile\(req, deps\(\)\)/);
  assert.match(src, /rpc\("note_heartbeat"/);
  assert.ok(!/\.(insert|update|delete|upsert)\(/.test(src), "the reconcile function must not write to any table");
  assert.ok(!/\.del\(|DELETE/.test(src), "the reconcile function must not delete anything");
  const shared = readFileSync(`${SHARED}/photoReconcile.ts`, "utf8").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/\.del\(|\.insert\(|\.update\(|\.upsert\(/.test(shared));
});

// ── 7 · break it on purpose ─────────────────────────────────────────────────────────────────────────────
const dir = mkdtempSync(path.join(tmpdir(), "photo-reconcile-"));
for (const f of ["photoKey.ts", "r2.ts"]) copyFileSync(`${SHARED}/${f}`, path.join(dir, f));
let n = 0;
async function build(from, to) {
  const src = readFileSync(`${SHARED}/photoReconcile.ts`, "utf8");
  assert.equal(src.split(from).length, 2, "the sabotage did not apply: " + from);
  const file = path.join(dir, `photoReconcile-${++n}.ts`);
  writeFileSync(file, src.replace(from, () => to));
  return import(pathToFileURL(file).href);
}
async function probes(mod) {
  const P = {};
  const base = [[obj(key(A, 1), 5 * MB), obj(key(A, 2), 2 * MB)], [row(A, key(A, 1), 5 * MB), row(A, key(A, 4), 4 * MB)]];
  const r = mod.reconcile(...base, null);
  P.orphan = r.orphans === 1 && r.orphan_bytes === 2 * MB;
  P.missing = r.missing === 1 && r.missing_bytes === 4 * MB;
  P.mismatch = mod.reconcile([obj(key(A, 3), 9 * MB)], [row(A, key(A, 3), MB)], null).mismatched === 1;
  P.unknownSizeNotZero = mod.reconcile([obj(key(A, 1), MB)], [row(A, key(A, 1), null)], null).unknown_size_rows === 1;
  P.misfiled = mod.reconcile([obj(key(B, 1), MB)], [row(A, key(B, 1), MB)], null).misfiled === 1;
  P.allowanceNullNotFalse = mod.reconcile([obj(key(A, 1), MB)], [row(A, key(A, 2), MB)], null).named[A]?.over_share === null;
  P.overShare = mod.reconcile([obj(key(A, 1), 12 * MB)], [row(A, key(A, 1), 12 * MB)], { total_bytes: 1000 * MB, share_bytes: 10 * MB }).named[A]?.over_share === true;
  const tooSoon = world(mod, { last: new Date(w0().getTime() - 3600 * 1000).toISOString() });
  P.tooSoonTouchesNothing = (await tooSoon.call()).body.skipped === "too_soon" && tooSoon.listed === 0 && tooSoon.stamps.length === 0;
  const noR2 = world(mod, { noR2: true });
  const noR2Res = await noR2.call().catch(() => ({ status: 0 }));
  P.notConfiguredIs503NoStamp = noR2Res.status === 503 && noR2.stamps.length === 0;
  const lf = world(mod, { listFail: true }); const lfRes = await lf.call();
  P.listFailNoStamp = lfRes.status === 502 && lf.stamps.length === 0;
  const rf = world(mod, { rowsFail: true }); const rfRes = await rf.call();
  P.rowsFailNoStamp = rfRes.status === 500 && rf.stamps.length === 0;
  const ok = world(mod); await ok.call();
  P.stampsOnSuccess = ok.stamps.length === 1;
  return P;
}
const SABOTAGE = [
  ["orphans not counted", "b.orphans++; b.orphan_bytes += bytes;", "", ["orphan"]],
  ["a row with no object is not counted", "if (stored === undefined) { b.missing++; b.missing_bytes += typeof row.bytes === \"number\" ? row.bytes : 0; continue; }", "if (stored === undefined) { continue; }", ["missing"]],
  ["a size mismatch is not counted", "if (typeof row.bytes === \"number\" && row.bytes !== stored) { b.mismatched++; b.mismatch_bytes += Math.abs(stored - row.bytes); }", "", ["mismatch"]],
  ["an unknown size reads as nothing", "else b.unknown_size_rows++;", ";", ["unknownSizeNotZero"]],
  ["a misfiled row is not noticed", "if (!parsed || parsed.businessId !== row.business_id) { b.misfiled++; continue; }", "if (!parsed) { continue; }", ["misfiled"]],
  ["an unreadable allowance reads as nobody over", "r.over_share = allowance ? Math.max(r.r2_bytes, r.db_bytes) > allowance.share_bytes : null;", "r.over_share = allowance ? Math.max(r.r2_bytes, r.db_bytes) > allowance.share_bytes : false;", ["allowanceNullNotFalse"]],
  ["over-share is never raised", "Math.max(r.r2_bytes, r.db_bytes) > allowance.share_bytes", "false", ["overShare"]],
  ["the too-soon guard removed", "if (last && deps.now().getTime() - Date.parse(last) < MIN_INTERVAL_MS) {", "if (false) {", ["tooSoonTouchesNothing"]],
  ["the not-configured guard removed", "if (!deps.r2) {", "if (false) {", ["notConfiguredIs503NoStamp"]],
  ["a failed listing still stamps", "return json({ error: \"Could not read the photo store.\", ran: false }, 502);", "objects = [];", ["listFailNoStamp"]],
  ["a failed row read still stamps", "return json({ error: \"Could not read the photo records.\", ran: false }, 500);", "rows = [];", ["rowsFailNoStamp"]],
];

test("7 · every property holds on the real module, and each guard removed alone turns its own probe red", async () => {
  const real = await probes(rec);
  const red = Object.entries(real).filter(([, v]) => v !== true).map(([k]) => k);
  assert.deepEqual(red, [], "properties that do not hold on the real code: " + red.join(", "));
  for (const [name, from, to, expect] of SABOTAGE) {
    const mod = await build(from, to);
    const P = await probes(mod);
    const bad = Object.entries(P).filter(([, v]) => v !== true).map(([k]) => k);
    for (const e of expect) assert.ok(bad.includes(e), `${name}: expected "${e}" to go red, red was [${bad.join(", ")}]`);
  }
});
