// ROADMAP 0.11 — THE SERVER HALF OF THE PHOTO DOOR, RUN IN MEMORY.
//
//   node --test tests/photo-door-server.test.mjs
//
// Credential-free, no network, no database, no R2, no Deno: it loads
// supabase/functions/_shared/r2.ts and photoDoor.ts (both import-free but for
// each other's siblings, so Node 24 strips the types and runs them) and hands
// them an in-memory world. Nothing here can spend a request or write a row.
//
// WHAT IT PROVES, and what it does not: that every rule in the contract holds
// against a fake database and a fake R2 — the isolation, both traps in
// docs/the-photo-allowance.md § 5, the cap, the permission asymmetry, the rate
// limit, and that no credential value reaches a response, a log or a URL. It
// does NOT prove R2 accepts these signatures: the signer is checked against
// Amazon's own published example, which is the strongest check available
// without an account. The first real PUT is the proof that matters and it is
// Andrew's to make once the function is published.
//
// BREAK IT ON PURPOSE: § 12 rebuilds photoDoor.ts and r2.ts with ONE guard
// removed at a time and asserts the matching probe goes from refused to
// allowed. A check nobody has seen fail is how this repo shipped six that
// tested nothing.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as door from "../supabase/functions/_shared/photoDoor.ts";
import * as r2lib from "../supabase/functions/_shared/r2.ts";
import { storagePath } from "../app/src/lib/photo-rules.js";

const MB = 1024 * 1024;
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const BOOKING_A = "33333333-3333-4333-8333-333333333333";
const BOOKING_B = "44444444-4444-4444-8444-444444444444";
const PHOTO = "55555555-5555-4555-8555-555555555555";
const PHOTO2 = "66666666-6666-4666-8666-666666666666";
const SECRET = "SENTINEL-secret-access-key-do-not-print";
const keyOf = (biz, booking, photo, ext = "jpg") => `${biz}/${booking}/${photo}.${ext}`;

// ---------------------------------------------------------------- the world
function world(mod = door, over = {}) {
  const w = {
    rows: new Map(), objects: new Map(), calls: [], logs: [],
    budget: { used_bytes: 1000, cap_bytes: 10 * MB },
    bookings: new Set([`${A}:${BOOKING_A}`, `${B}:${BOOKING_B}`]),
    limiterOk: true, insertFails: false, ...over,
  };
  const members = {
    "owner-a": { userId: "u-owner-a", businessId: A, role: "owner", permissions: [] },
    "staff-a": { userId: "u-staff-a", businessId: A, role: "staff", permissions: ["requests"] },
    "owner-b": { userId: "u-owner-b", businessId: B, role: "owner", permissions: [] },
  };
  w.store = {
    putUrl: async (bucket, key, type) => { w.calls.push(["putUrl", key]); return `https://r2.test/${bucket}/${key}?put&type=${type}`; },
    getUrl: async (bucket, key) => { w.calls.push(["getUrl", key]); return `https://r2.test/${bucket}/${key}?get`; },
    head: async (_b, key) => { w.calls.push(["head", key]); const o = w.objects.get(key); return o ? { exists: true, bytes: o.bytes } : { exists: false, bytes: null }; },
    del: async (_b, key) => { w.calls.push(["del", key]); w.objects.delete(key); },
  };
  w.deps = {
    requireMember: async (req, biz) => {
      const t = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      const m = members[t];
      return m && m.businessId === biz ? m : null;
    },
    can: (m, p) => m.role === "owner" || m.permissions.includes(p),
    withinLimits: async (limits) => { w.calls.push(["limits", limits[0].bucket, limits[0].key]); return w.limiterOk; },
    limit: { windowSeconds: 3600, limit: 600 },
    bookingBelongs: async (biz, booking) => w.bookings.has(`${biz}:${booking}`),
    budget: async () => (w.budget === undefined ? null : w.budget),
    getPhoto: async (biz, id) => { const r = w.rows.get(id); return r && r.business_id === biz ? r : null; },
    insertPhoto: async (row) => {
      w.calls.push(["insert", row.id]);
      if (w.insertFails) throw new Error("db down");
      if (w.rows.has(row.id)) return w.rows.get(row.id);          // conflict returns the row that is there
      w.rows.set(row.id, row);
      return row;
    },
    deletePhoto: async (_biz, id) => { w.calls.push(["deleteRow", id]); w.rows.delete(id); },
    r2: w.store,
    log: (...a) => w.logs.push(a.map(String).join(" ")),
  };
  w.call = async (token, body) => {
    const res = await mod.handlePhotoDoor(new Request("http://x.test/functions/v1/photo-door", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
    }), w.deps);
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  return w;
}
const startBody = (o = {}) => ({
  action: "start", business_id: A, booking_id: BOOKING_A, photo_id: PHOTO, kind: "before",
  content_type: "image/jpeg", claimed_bytes: 300000, width: 1600, height: 1200, ...o,
});
const finishBody = (o = {}) => ({
  action: "finish", business_id: A, booking_id: BOOKING_A, photo_id: PHOTO, kind: "before",
  width: 1600, height: 1200, caption: null, ...o,
});
const store = (w, key, bytes) => w.objects.set(key, { bytes });
const K = keyOf(A, BOOKING_A, PHOTO);

// ------------------------------------------------------------------ 1 signer
test("1 · SigV4 is Amazon's own published example, to the character", async () => {
  // https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
  const url = await r2lib.presign({
    method: "GET", host: "examplebucket.s3.amazonaws.com", path: "/test.txt",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    region: "us-east-1", expires: 86400, now: new Date("2013-05-24T00:00:00Z"),
  });
  assert.equal(url,
    "https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256"
    + "&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request"
    + "&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host"
    + "&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404");
});

test("2 · what the store signs for R2: path-style, auto region, the content type bound in, no secret in the URL", async () => {
  const { config, missing } = r2lib.r2Config((n) => ({ R2_ACCOUNT_ID: "acct1234", R2_ACCESS_KEY_ID: "AKIDEXAMPLE", R2_SECRET_ACCESS_KEY: SECRET })[n]);
  assert.deepEqual(missing, []);
  const s = r2lib.makeR2(config, async () => { throw new Error("no network in this test"); }, () => new Date("2026-10-07T12:00:00Z"));
  const put = new URL(await s.putUrl("job-photos", K, "image/jpeg", 600));
  assert.equal(put.host, "acct1234.r2.cloudflarestorage.com");
  assert.equal(put.pathname, `/job-photos/${K}`);
  assert.equal(put.searchParams.get("X-Amz-SignedHeaders"), "content-type;host");
  assert.equal(put.searchParams.get("X-Amz-Expires"), "600");
  assert.match(put.searchParams.get("X-Amz-Credential"), /^AKIDEXAMPLE\/20261007\/auto\/s3\/aws4_request$/);
  const png = new URL(await s.putUrl("job-photos", K, "image/png", 600));
  assert.notEqual(png.searchParams.get("X-Amz-Signature"), put.searchParams.get("X-Amz-Signature"), "the content type is part of the proof");
  const get = new URL(await s.getUrl("job-photos", K, 3600));
  assert.equal(get.searchParams.get("X-Amz-SignedHeaders"), "host");
  for (const u of [put, png, get]) assert.ok(!u.href.includes(SECRET), "the secret never appears in a URL");
});

test("3 · credentials are named, never echoed", () => {
  const none = r2lib.r2Config(() => undefined);
  assert.equal(none.config, null);
  assert.deepEqual(none.missing, ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]);
  const some = r2lib.r2Config((n) => ({ R2_ACCOUNT_ID: "the-account-value" })[n]);
  assert.deepEqual(some.missing, ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]);
  assert.ok(!JSON.stringify(some).includes("the-account-value"), "a value is never in what is reported as missing");
  assert.equal(r2lib.r2Config((n) => ({ R2_ACCOUNT_ID: "  ", R2_ACCESS_KEY_ID: "k", R2_SECRET_ACCESS_KEY: "s" })[n]).config, null, "blank is missing");
});

test("4 · the store measures with R2, and a failed request never carries its URL", async () => {
  const cfg = { accountId: "acct1234", accessKeyId: "AKIDEXAMPLE", secretAccessKey: SECRET };
  const seen = [];
  const ok = r2lib.makeR2(cfg, async (url, init) => {
    seen.push([init.method, url]);
    if (init.method === "HEAD") return new Response(null, { status: 200, headers: { "content-length": "312345" } });
    return new Response(null, { status: 204 });
  });
  assert.deepEqual(await ok.head("job-photos", K), { exists: true, bytes: 312345 });
  await ok.del("job-photos", K);
  assert.deepEqual(seen.map((s) => s[0]), ["HEAD", "DELETE"]);
  const gone = r2lib.makeR2(cfg, async () => new Response(null, { status: 404 }));
  assert.deepEqual(await gone.head("job-photos", K), { exists: false, bytes: null });
  await gone.del("job-photos", K);                                   // already gone is success
  const noLength = r2lib.makeR2(cfg, async () => new Response(null, { status: 200 }));
  assert.deepEqual(await noLength.head("job-photos", K), { exists: true, bytes: null }, "an unstated size is null, never zero");
  const boom = r2lib.makeR2(cfg, async (url) => { throw new Error(`error sending request for url (${url})`); });
  await assert.rejects(boom.head("job-photos", K), (e) => !/X-Amz|r2\.cloudflarestorage|AKIDEXAMPLE/.test(e.message));
});

// ------------------------------------------------------------------ 5 who
test("5 · WHO: no session, another business, no business_id, a bad action", async () => {
  const w = world();
  assert.equal((await w.call("nobody", startBody())).status, 401);
  assert.equal((await w.call("owner-b", startBody())).status, 401, "B's owner cannot act for A");
  assert.equal((await w.call("owner-a", startBody({ business_id: undefined }))).status, 400);
  assert.equal((await w.call("owner-a", startBody({ business_id: "*" }))).status, 400);
  const unk = await w.call("owner-a", { action: "list", business_id: A });
  assert.deepEqual([unk.status, unk.body.error], [400, "Unknown action"]);
  assert.equal(w.calls.filter((c) => c[0] !== "limits").length, 0, "no database or R2 work happened for any of them");
  const noJson = await door.handlePhotoDoor(new Request("http://x.test/", { method: "POST", body: "{{" }), w.deps);
  assert.equal(noJson.status, 400);
  assert.equal((await door.handlePhotoDoor(new Request("http://x.test/", { method: "OPTIONS" }), w.deps)).status, 204);
});

test("6 · the ceiling comes before any work", async () => {
  const w = world(door, { limiterOk: false });
  const r = await w.call("owner-a", startBody());
  assert.equal(r.status, 429);
  assert.match(r.body.error, /Too many photo requests/);
  assert.deepEqual(w.calls.map((c) => c[0]), ["limits"], "only the limiter was asked");
  assert.deepEqual(w.calls[0], ["limits", "photo-door", A], "keyed on the business");
});

test("7 · no R2 credentials: 503 in words, and nothing else happens", async () => {
  const w = world();
  w.deps.r2 = null;
  const r = await w.call("owner-a", startBody());
  assert.deepEqual([r.status, r.body.error], [503, "Photo storage is not set up on the server yet."]);
});

// ---------------------------------------------------------------- 8 start
test("8 · START: the minted key is the app's, the URL is bound to the type, bad input is refused in words", async () => {
  const w = world();
  const r = await w.call("owner-a", startBody());
  assert.equal(r.status, 200);
  assert.equal(r.body.key, storagePath({ businessId: A, ownerId: BOOKING_A, id: PHOTO, type: "image/jpeg" }));
  assert.equal(r.body.upload_url, `https://r2.test/job-photos/${K}?put&type=image/jpeg`);
  assert.equal(r.body.expires_in, 600);
  const png = await w.call("owner-a", startBody({ photo_id: PHOTO2, content_type: "image/png" }));
  assert.equal(png.body.key, storagePath({ businessId: A, ownerId: BOOKING_A, id: PHOTO2, type: "image/png" }));
  const refused = {
    "a booking of another business": [startBody({ booking_id: BOOKING_B }), 404, /Booking not found/],
    "a made-up booking": [startBody({ booking_id: "99999999-9999-4999-8999-999999999999" }), 404, /Booking not found/],
    "a traversal as the booking": [startBody({ booking_id: "../x" }), 400, /booking_id/],
    "an uppercase photo id": [startBody({ photo_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa".toUpperCase() }), 400, /photo_id/],
    "a kind that is not one of three": [startBody({ kind: "gallery" }), 400, /before, after or damage/],
    "a heic": [startBody({ content_type: "image/heic" }), 400, /JPEG or PNG/],
    "no size claimed": [startBody({ claimed_bytes: undefined }), 400, /claimed_bytes/],
    "a zero size": [startBody({ claimed_bytes: 0 }), 400, /claimed_bytes/],
    "a fractional size": [startBody({ claimed_bytes: 1.5 }), 400, /claimed_bytes/],
    "a string size": [startBody({ claimed_bytes: "300000" }), 400, /claimed_bytes/],
    "a size over the bucket's ten megabytes": [startBody({ claimed_bytes: 10 * MB + 1 }), 413, /larger than 10\.0 MB/],
  };
  for (const [what, [body, status, re]] of Object.entries(refused)) {
    const x = await w.call("owner-a", body);
    assert.equal(x.status, status, what);
    assert.match(x.body.error, re, what);
  }
});

test("9 · START: over the cap says what is used, the limit, and what frees room; and an unreadable budget REFUSES", async () => {
  const w = world(door, { budget: { used_bytes: 9.9 * MB, cap_bytes: 10 * MB } });
  const over = await w.call("owner-a", startBody({ claimed_bytes: 300000 }));
  assert.equal(over.status, 409);
  assert.equal(over.body.error, "Photo storage is full: 9.9 MB of 10.0 MB used. Delete old job photos to make room.");
  assert.ok(!w.calls.some((c) => c[0] === "putUrl"), "no upload URL is minted over the cap");
  // TRAP ONE: every way of not knowing the budget refuses.
  for (const [what, budget] of Object.entries({
    "no rows (service-role asked, or not a member)": undefined,
    "a cap of zero": { used_bytes: 0, cap_bytes: 0 },
    "a negative cap": { used_bytes: 0, cap_bytes: -1 },
    "a missing cap": { used_bytes: 0 },
    "an unreadable used figure": { used_bytes: "lots", cap_bytes: 10 * MB },
  })) {
    const x = world(door, { budget });
    const r = await x.call("owner-a", startBody());
    assert.equal(r.status, 503, what);
    assert.match(r.body.error, /Could not check your photo storage/, what);
    assert.ok(!x.calls.some((c) => c[0] === "putUrl"), what);
  }
});

test("10 · START: a photo id that is already saved is refused, not overwritten", async () => {
  const w = world();
  store(w, K, 300000);
  assert.equal((await w.call("owner-a", finishBody())).status, 200);
  const again = await w.call("owner-a", startBody());
  assert.deepEqual([again.status, again.body.error], [409, "That photo is already saved."]);
});

// --------------------------------------------------------------- 11 finish
test("11 · FINISH: the row records R2's size, never the client's; finishing twice is one row", async () => {
  const w = world();
  store(w, K, 312345);
  const a = await w.call("owner-a", finishBody({ claimed_bytes: 1000, bytes: 1 }));
  assert.equal(a.status, 200);
  assert.equal(a.body.photo.bytes, 312345, "R2's size");
  assert.equal(a.body.photo.path, K);
  assert.equal(a.body.photo.business_id, A);
  assert.equal(a.body.photo.created_by, "u-owner-a");
  const b = await w.call("owner-a", finishBody());
  assert.deepEqual(b.body.photo, a.body.photo);
  assert.equal(w.rows.size, 1);
  assert.equal(w.calls.filter((c) => c[0] === "insert").length, 1, "the second finish never reached the insert");
  // Two presses at once: still one.
  const w2 = world();
  store(w2, K, 200000);
  const [x, y] = await Promise.all([w2.call("owner-a", finishBody()), w2.call("owner-a", finishBody())]);
  assert.equal(x.status + y.status, 400);
  assert.equal(w2.rows.size, 1);
  assert.deepEqual(x.body.photo, y.body.photo);
  // A png is found under its own extension.
  const w3 = world();
  store(w3, keyOf(A, BOOKING_A, PHOTO2, "png"), 150000);
  const p = await w3.call("owner-a", finishBody({ photo_id: PHOTO2 }));
  assert.equal(p.body.photo.path, keyOf(A, BOOKING_A, PHOTO2, "png"));
});

test("12 · FINISH, TRAP ONE: no object, no size, a zero size, or an oversize object saves nothing", async () => {
  const none = world();
  const r = await none.call("owner-a", finishBody());
  assert.equal(r.status, 409);
  assert.match(r.body.error, /never arrived/);
  assert.equal(none.rows.size, 0);
  for (const [what, bytes] of Object.entries({ "no size stated": null, "a zero size": 0, "an oversize object": 10 * MB + 1 })) {
    const w = world();
    w.objects.set(K, { bytes });
    const x = await w.call("owner-a", finishBody());
    assert.equal(x.status, 422, what);
    assert.equal(w.rows.size, 0, what);
    assert.ok(!w.objects.has(K), `${what}: the object is removed`);
  }
});

test("13 · FINISH, TRAP TWO: a client that under-claimed is refused against what R2 holds, and its object goes", async () => {
  // It claimed 1 KB at start; nine megabytes arrived; the business has 2 MB of room.
  const w = world(door, { budget: { used_bytes: 8 * MB, cap_bytes: 10 * MB } });
  assert.equal((await w.call("owner-a", startBody({ claimed_bytes: 1024 }))).status, 200, "the claim alone passes");
  store(w, K, 9 * MB);
  const r = await w.call("owner-a", finishBody());
  assert.equal(r.status, 409);
  assert.match(r.body.error, /Photo storage is full: 8\.0 MB of 10\.0 MB used/);
  assert.equal(w.rows.size, 0);
  assert.ok(!w.objects.has(K), "the over-cap object is deleted, not left uncounted");
  // And an unreadable budget at finish deletes too rather than recording a photo nobody can count.
  const u = world(door, { budget: undefined });
  store(u, K, 100000);
  const x = await u.call("owner-a", finishBody());
  assert.equal(x.status, 503);
  assert.equal(u.rows.size, 0);
  assert.ok(!u.objects.has(K));
});

test("14 · FINISH: a row that cannot be written takes the object back out; another business's booking is a 404", async () => {
  const w = world(door, { insertFails: true });
  store(w, K, 100000);
  const r = await w.call("owner-a", finishBody());
  assert.equal(r.status, 500);
  assert.ok(!w.objects.has(K), "an object with no row is invisible, so it is removed");
  const x = world();
  store(x, keyOf(A, BOOKING_B, PHOTO), 1000);
  assert.equal((await x.call("owner-a", finishBody({ booking_id: BOOKING_B }))).status, 404);
});

// ------------------------------------------------------------------ 15 urls
test("15 · URLS: only keys this business owns are signed; everything else is simply absent", async () => {
  const w = world();
  const mine = keyOf(A, BOOKING_A, PHOTO);
  const theirs = keyOf(B, BOOKING_B, PHOTO2);
  const hostile = [
    theirs, `${A}/../${B}/${BOOKING_B}/${PHOTO2}.jpg`, `${A}/${BOOKING_A}/${PHOTO}.jpg/../../x`, `/${mine}`, `job-photos/${mine}`,
    `${mine}?x=1`, mine.toUpperCase(), `${A}%2f${BOOKING_A}%2f${PHOTO}.jpg`, `${mine}\u0000`, "*", "", 5, null, { k: 1 },
  ];
  const r = await w.call("owner-a", { action: "urls", business_id: A, keys: [mine, ...hostile] });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.body.urls), [mine]);
  assert.equal(r.body.urls[mine], `https://r2.test/job-photos/${mine}?get`);
  assert.equal(r.body.expires_in, 3600);
  assert.deepEqual(w.calls.filter((c) => c[0] === "getUrl"), [["getUrl", mine]], "the signer was only ever asked for the one key that is ours");
  for (const bad of [undefined, null, "x", [], {}, Array.from({ length: 101 }, () => mine)]) {
    assert.equal((await w.call("owner-a", { action: "urls", business_id: A, keys: bad })).status, 400);
  }
  assert.equal((await w.call("owner-a", { action: "urls", business_id: A, keys: Array.from({ length: 100 }, () => mine) })).status, 200);
});

// --------------------------------------------------------------- 16 remove
test("16 · REMOVE: needs the settings permission, row first then object, a leftover object is not a failure", async () => {
  const w = world();
  store(w, K, 300000);
  await w.call("owner-a", finishBody());
  const denied = await w.call("staff-a", { action: "remove", business_id: A, photo_id: PHOTO });
  assert.deepEqual([denied.status, denied.body.error], [403, "Removing a photo needs the settings permission."]);
  assert.ok(w.rows.has(PHOTO) && w.objects.has(K), "staff removed nothing");
  w.calls.length = 0;
  const ok = await w.call("owner-a", { action: "remove", business_id: A, photo_id: PHOTO });
  assert.deepEqual([ok.status, ok.body], [200, { removed: true }]);
  const order = w.calls.map((c) => c[0]).filter((c) => c === "deleteRow" || c === "del");
  assert.deepEqual(order, ["deleteRow", "del"], "the row goes before the object");
  assert.ok(!w.rows.has(PHOTO) && !w.objects.has(K));
  // Another business's photo is not found; so is one that is already gone.
  const other = world();
  other.rows.set(PHOTO2, { id: PHOTO2, business_id: B, booking_id: BOOKING_B, path: keyOf(B, BOOKING_B, PHOTO2), bytes: 5 });
  assert.equal((await other.call("owner-a", { action: "remove", business_id: A, photo_id: PHOTO2 })).status, 404);
  assert.equal((await w.call("owner-a", { action: "remove", business_id: A, photo_id: PHOTO })).status, 404);
  assert.equal((await w.call("owner-a", { action: "remove", business_id: A, photo_id: "x" })).status, 400);
  // The object failing to go after the row did: still removed, and said in the log, with no URL in it.
  const f = world();
  store(f, K, 300000);
  await f.call("owner-a", finishBody());
  f.store.del = async () => { throw new Error("R2 request failed"); };
  const r = await f.call("owner-a", { action: "remove", business_id: A, photo_id: PHOTO });
  assert.deepEqual([r.status, r.body.removed], [200, true]);
  assert.ok(f.logs.some((l) => /not removed after its row/.test(l)));
});

// ----------------------------------------------------------- 17 no secrets
test("17 · a credential value is in no response, no log line and no URL, across every action and failure", async () => {
  const cfg = { accountId: "acct1234", accessKeyId: "AKIDEXAMPLE", secretAccessKey: SECRET };
  const out = [];
  const fakeFetch = async (url, init) => {
    out.push(url);
    if (init.method === "HEAD") return new Response(null, { status: 200, headers: { "content-length": "250000" } });
    if (init.method === "DELETE") throw new Error(`error sending request for url (${url})`);
    return new Response(null, { status: 500 });
  };
  const w = world();
  w.deps.r2 = r2lib.makeR2(cfg, fakeFetch, () => new Date("2026-10-07T12:00:00Z"));
  const seen = [];
  const rec = async (token, body) => { const r = await w.call(token, body); seen.push(JSON.stringify(r)); return r; };
  await rec("owner-a", startBody());
  await rec("owner-a", finishBody());
  await rec("owner-a", { action: "urls", business_id: A, keys: [K] });
  await rec("owner-a", { action: "remove", business_id: A, photo_id: PHOTO });          // DELETE throws with the URL inside
  w.budget = { used_bytes: 10 * MB, cap_bytes: 10 * MB };
  await rec("owner-a", startBody({ photo_id: PHOTO2 }));
  w.deps.r2 = r2lib.makeR2(cfg, async (url) => { throw new Error(`failed ${url}`); });
  await rec("owner-a", finishBody({ photo_id: PHOTO2 }));                                 // HEAD throws with the URL inside
  const everything = [...seen, ...w.logs].join("\n");
  assert.ok(!everything.includes(SECRET), "the secret value");
  assert.ok(!/X-Amz-Signature/.test(w.logs.join("\n")), "no signed URL in the log");
  assert.ok(!/X-Amz-Signature=[0-9a-f]{64}/.test(seen.filter((s) => !/upload_url|"urls"/.test(s)).join("\n")), "a signature appears only in the answers that exist to carry one");
  assert.ok(out.length > 0 && out.every((u) => !u.includes(SECRET)));
});

// --------------------------------------------------------------- 18 sabotage
// Each entry removes ONE guard from the real source and asserts the probe that
// guard exists for goes from refused to allowed. A run in which the sabotage is
// not seen is a broken check, and the control run proves the probes can pass.
// CRLF is normalised: a checkout with autocrlf on carries it, and the text to sabotage is written with LF.
const SRC = (name) => readFileSync(`supabase/functions/_shared/${name}`, "utf8").replace(/\r\n/g, "\n");
const dir = mkdtempSync(path.join(tmpdir(), "photo-door-sab-"));
const abs = (n) => JSON.stringify(pathToFileURL(path.resolve(`supabase/functions/_shared/${n}`)).href);
async function variant(label, file, edits) {
  let s = SRC(file).replace('"./http.ts"', abs("http.ts")).replace('"./photoKey.ts"', abs("photoKey.ts"));
  for (const [from, to] of edits) {
    assert.equal(s.split(from).length - 1, 1, `${label}: the text to sabotage is not unique or not there: ${from.slice(0, 50)}`);
    s = s.replace(from, to);
  }
  const f = path.join(dir, `${label}.ts`);
  writeFileSync(f, s);
  return import(pathToFileURL(f).href);
}
const PROBES = {
  async foreignKeySigned(mod) { const w = world(mod); const r = await w.call("owner-a", { action: "urls", business_id: A, keys: [keyOf(B, BOOKING_B, PHOTO2)] }); return Object.keys(r.body?.urls ?? {}).length > 0; },
  async underClaimStored(mod) { const w = world(mod, { budget: { used_bytes: 8 * MB, cap_bytes: 10 * MB } }); store(w, K, 9 * MB); const r = await w.call("owner-a", finishBody()); return r.status === 200; },
  async unknownBudgetAllowed(mod) { const w = world(mod, { budget: { used_bytes: 0, cap_bytes: 0 } }); const r = await w.call("owner-a", startBody()); return r.status === 200; },
  async staffRemoved(mod) { const w = world(mod); store(w, K, 1000); await w.call("owner-a", finishBody()); const r = await w.call("staff-a", { action: "remove", business_id: A, photo_id: PHOTO }); return r.status === 200; },
  async limiterIgnored(mod) { const w = world(mod, { limiterOk: false }); const r = await w.call("owner-a", startBody()); return r.status === 200; },
  async foreignBookingAccepted(mod) { const w = world(mod); const r = await w.call("owner-a", startBody({ booking_id: BOOKING_B })); return r.status === 200; },
  async zeroSizeStored(mod) { const w = world(mod); w.objects.set(K, { bytes: 0 }); const r = await w.call("owner-a", finishBody()); return r.status === 200; },
  async orphanKept(mod) { const w = world(mod, { insertFails: true }); store(w, K, 1000); await w.call("owner-a", finishBody()); return w.objects.has(K); },
  async rowLastOnRemove(mod) { const w = world(mod); store(w, K, 1000); await w.call("owner-a", finishBody()); w.calls.length = 0; await w.call("owner-a", { action: "remove", business_id: A, photo_id: PHOTO }); const o = w.calls.map((c) => c[0]).filter((c) => c === "deleteRow" || c === "del"); return o[0] === "del"; },
};
const SAB = [
  ["foreignKeySigned", "photoDoor.ts", [["if (businessOwnsKey(member.businessId, k))", "if (true)"]], "the ownership guard on urls"],
  ["underClaimStored", "photoDoor.ts", [["if (budget.used_bytes + bytes > budget.cap_bytes) {", "if (false) {"]], "the second cap check at finish"],
  ["unknownBudgetAllowed", "photoDoor.ts", [
    ["const b = await deps.budget(member.businessId, token);\n      if (!b || !(Number(b.cap_bytes) > 0) ||", "const b = await deps.budget(member.businessId, token);\n      if (!b ||"],
    ["if (budget.used_bytes + claimed > budget.cap_bytes) return", "if (budget.cap_bytes > 0 && budget.used_bytes + claimed > budget.cap_bytes) return"],
  ], "failing closed on a cap that cannot be read"],
  ["staffRemoved", "photoDoor.ts", [['if (!deps.can(member, "settings"))', "if (false)"]], "the settings permission on remove"],
  ["limiterIgnored", "photoDoor.ts", [["if (!allowed)", "if (false)"]], "the rate ceiling"],
  ["foreignBookingAccepted", "photoDoor.ts", [["if (!(await deps.bookingBelongs(member.businessId, bookingId)))", "if (false)"]], "the booking-belongs check"],
  ["zeroSizeStored", "photoDoor.ts", [["if (!isInt(bytes) || bytes <= 0 || bytes > MAX_BYTES) {", "if (false) {"]], "refusing a size R2 will not state"],
  ["orphanKept", "photoDoor.ts", [["await r2.del(store.bucket, key).catch(() => deps.log(\"photo-door: could not remove an unrecorded object\", photoId));", ""]], "removing the object when the row fails"],
  ["rowLastOnRemove", "photoDoor.ts", [
    ["await deps.deletePhoto(member.businessId, photoId);\n      try { await r2.del(store.bucket, row.path); }\n      catch { deps.log(\"photo-door: object not removed after its row was\", row.id); }",
     "try { await r2.del(store.bucket, row.path); } catch { /* sabotage */ }\n      await deps.deletePhoto(member.businessId, photoId);"],
  ], "row-before-object on remove"],
];

test("18 · SABOTAGE — each guard removed is seen (control first)", async () => {
  for (const name of Object.keys(PROBES)) {
    assert.equal(await PROBES[name](door), false, `control: ${name} must be refused by the real door`);
  }
  for (const [probe, file, edits, what] of SAB) {
    const mod = await variant(probe, file, edits);
    assert.equal(await PROBES[probe](mod), true, `sabotage not seen — ${what}: the probe still came back refused`);
  }
});

test("19 · SABOTAGE — the signer and the store's error handling are seen too", async () => {
  const AWS = {
    method: "GET", host: "examplebucket.s3.amazonaws.com", path: "/test.txt", accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", region: "us-east-1", expires: 86400, now: new Date("2013-05-24T00:00:00Z"),
  };
  const sig = async (m) => (await m.presign(AWS)).split("X-Amz-Signature=")[1];
  const good = "aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404";
  assert.equal(await sig(r2lib), good);
  const noPayloadLiteral = await variant("sig-payload", "r2.ts", [['"UNSIGNED-PAYLOAD"].join', '"UNSIGNED"].join']]);
  assert.notEqual(await sig(noPayloadLiteral), good, "a wrong payload marker must break the known answer");
  const noScope = await variant("sig-scope", "r2.ts", [["for (const part of [o.region, \"s3\", \"aws4_request\"])", "for (const part of [o.region, \"s3\"])"]]);
  assert.notEqual(await sig(noScope), good, "a short key derivation must break the known answer");
  const leaky = await variant("leaky", "r2.ts", [["try { return await fetchImpl(url, { method }); } catch { throw new Error(R2_FAILED); }", "return await fetchImpl(url, { method });"]]);
  const cfg = { accountId: "acct1234", accessKeyId: "AKIDEXAMPLE", secretAccessKey: SECRET };
  const boom = async (url) => { throw new Error(`error sending request for url (${url})`); };
  await assert.rejects(r2lib.makeR2(cfg, boom).head("job-photos", K), (e) => !/X-Amz/.test(e.message));
  await assert.rejects(leaky.makeR2(cfg, boom).head("job-photos", K), (e) => /X-Amz/.test(e.message), "a store that lets fetch's message through leaks the signed URL, and the control sees it");
});

test("20 · the function's own wiring: verify_jwt stays on, nothing is printed, the limit exists", () => {
  const index = readFileSync("supabase/functions/photo-door/index.ts", "utf8");
  const code = index.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.match(code, /Deno\.serve\(\(req\) => handlePhotoDoor\(req, deps\(\)\)\)/);
  assert.match(code, /LIMITS\.photoDoorPerBusiness/);
  // Credentials are read by NAME through r2Config; the only other env read is the anon key, for the budget.
  //
  // **THE DISTINCT SET, NOT THE LIST, AND THE CHANGE IS RECORDED RATHER THAN
  // QUIETLY MADE — ROADMAP 0.11 slice 4.** It was `envReads.sort()` against a
  // two-element list, which went red the moment a SECOND by-name helper was
  // wired (`mediaBase`, the public address for `business-media`): two
  // `Deno.env.get(n)` calls, both correct. The thing being asserted is *which
  // names this file reads from the environment* — that the only literal is the
  // anon key and every credential-shaped value goes through a helper that takes
  // the name as an argument. A set says exactly that and survives a third
  // helper; it is still an equality, so a stray `Deno.env.get("R2_SECRET…")`
  // added tomorrow still reddens it (gotcha 98 — a declaration is an equality,
  // never an inequality).
  const envReads = [...code.matchAll(/Deno\.env\.get\(([^)]*)\)/g)].map((m) => m[1]);
  assert.ok(envReads.length >= 2, "the env reads stopped matching; the pattern or the file changed");
  assert.deepEqual([...new Set(envReads)].sort(), ['"SUPABASE_ANON_KEY"', "n"].sort(),
    `a name is read from the environment that is neither the anon key nor passed to a by-name helper: ${envReads.join(", ")}`);
  // And the public address is wired the same way the credentials are: by name,
  // through `mediaBase`, never spelled as a literal here.
  assert.match(code, /mediaBase\(\(n\) => Deno\.env\.get\(n\)\)/);
  assert.match(code, /mediaUrl: base \?/, "the public image address is not wired into the door");
  assert.ok(!/console\.(log|error)\([^)]*(SECRET|ACCESS_KEY|config\b)/.test(code), "no credential is passed to a log call");
  const deploy = readFileSync("scripts/deploy-functions.mjs", "utf8");
  assert.ok(!/photo-door/.test(deploy), "photo-door is not in PUBLIC_FUNCTIONS, so it deploys with verify_jwt on");
  const limits = readFileSync("supabase/functions/_shared/rateLimit.ts", "utf8");
  assert.match(limits, /photoDoorPerBusiness: \{ windowSeconds: 3600, limit: 600 \}/);
});
