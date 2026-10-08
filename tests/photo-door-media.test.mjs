// ROADMAP 0.11 SLICE 4 — THE PHOTO DOOR SIGNS FOR `business-media` TOO, RUN IN MEMORY.
//
//   node --test tests/photo-door-media.test.mjs
//
// Credential-free, no network, no database, no R2, no Deno. Node strips the
// types off `_shared/photoDoor.ts`, `_shared/photoKey.ts` and `_shared/r2.ts`
// and runs them against an in-memory world, the same arrangement
// `tests/photo-door-server.test.mjs` and `tests/photo-door-receipts.test.mjs`
// use. Nothing here can spend a request or write a row.
//
// ---------------------------------------------------------------------------
// WHY A THIRD SUITE, AND WHAT IS ACTUALLY DIFFERENT ABOUT THIS STORE
// ---------------------------------------------------------------------------
// The job and receipt stores are the same protocol with different data. **This
// one is not**, and a suite that folded it into either of the others would have
// to say "unless it is the public one" in half its assertions:
//
//   TWO ACTIONS, NOT FOUR. A logo hangs off no row, so there is nothing to
//   `finish` and — the bucket being public-read — nothing to sign a GET for.
//   Both answer in words rather than falling through to another store's code,
//   and § 6 is that.
//
//   `remove` TAKES A KEY. There is no row whose `business_id` can be compared,
//   so `_shared/photoKey.ts`'s guard is not one check among several: it is the
//   only thing between one detailer and another's logo. § 2.
//
//   THE PERMISSION IS STRICTER AND THE OTHER WAY ROUND.
//   `20260904001000_catalog_behind_settings.sql` requires `settings` to insert,
//   update AND delete here. The other two stores let any member add. § 3 asserts
//   both halves, because carrying the other stores' asymmetry over would have
//   let any member replace the business's logo.
//
//   THE CEILING IS HELD BY THE SIGNATURE. Supabase enforced the bucket's
//   `file_size_limit` server-side; R2 enforces nothing, and this store has no
//   `finish` to measure the real size at. So the claimed length is signed INTO
//   the PUT url and a body of any other size fails at Cloudflare. § 4 and § 10.
//
//   IT IS NOT METERED, AND § 5 ASSERTS THAT ON PURPOSE rather than leaving it
//   as an absence nobody wrote down. `job_photo_budget()` has never counted
//   this bucket. What the move changes is the PRICE of that: on Supabase the
//   plan's 1 GB stopped the upload, and on R2 the same traffic is a bill. It is
//   recorded in `ROADMAP.md` 0.11 and `FOR-ANDREW.md` as a decision — adding a
//   bucket to the allowance needs a number nobody has chosen — and the test
//   states today's behaviour so that changing it has to be deliberate.
//
// **WHAT IT DOES NOT PROVE:** that R2 accepts these signatures, that Cloudflare
// honours a signed `content-length`, that a public base exists at all, or
// anything about the live project. The first real PUT is that proof and the
// publish is Andrew's.
//
// BREAK IT ON PURPOSE: § 13 rebuilds `photoDoor.ts` with ONE guard removed at a
// time and asserts the matching probe goes from refused to allowed.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as door from "../supabase/functions/_shared/photoDoor.ts";
import * as keys from "../supabase/functions/_shared/photoKey.ts";
import * as r2lib from "../supabase/functions/_shared/r2.ts";
import {
  MEDIA_EXT_FOR_TYPE, MEDIA_FOLDERS, mediaExtForType, mediaPath,
} from "../app/src/lib/photo-rules.js";
import { readMediaStart } from "../app/src/lib/photo-door.js";

const MB = 1024 * 1024;
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const FILE = "55555555-5555-4555-8555-555555555555";
const BOOKING_A = "77777777-7777-4777-8777-777777777777";
const PHOTO = "88888888-8888-4888-8888-888888888888";
const BASE = "https://media.test.example";

const K = `${A}/gallery/${FILE}.jpg`;
const K_B = `${B}/gallery/${FILE}.png`;

function world(mod = door, over = {}) {
  const w = {
    objects: new Map(), calls: [], logs: [],
    budget: { used_bytes: 1000, cap_bytes: 10 * MB },
    limiterOk: true, base: BASE, ...over,
  };
  const members = {
    "owner-a": { userId: "u-owner-a", businessId: A, role: "owner", permissions: [] },
    // A member who may do the job but not change the business's public face.
    "staff-a": { userId: "u-staff-a", businessId: A, role: "staff", permissions: ["requests"] },
    "owner-b": { userId: "u-owner-b", businessId: B, role: "owner", permissions: [] },
  };
  w.store = {
    // `exactBytes` is recorded, because whether it was passed IS the ceiling.
    putUrl: async (bucket, key, type, _exp, exactBytes) => {
      w.calls.push(["putUrl", bucket, key, exactBytes]);
      return `https://r2.test/${bucket}/${key}?put&type=${type}`;
    },
    getUrl: async (bucket, key) => { w.calls.push(["getUrl", bucket, key]); return `https://r2.test/${bucket}/${key}?get`; },
    head: async (bucket, key) => { w.calls.push(["head", bucket, key]); const o = w.objects.get(key); return o ? { exists: true, bytes: o.bytes } : { exists: false, bytes: null }; },
    del: async (bucket, key) => { w.calls.push(["del", bucket, key]); w.objects.delete(key); },
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
    bookingBelongs: async (biz, booking) => biz === A && booking === BOOKING_A,
    // Wired, and § 5 asserts it is never ASKED for a business image.
    budget: async () => { w.calls.push(["budget"]); return w.budget; },
    getPhoto: async () => null,
    insertPhoto: async (row) => row,
    deletePhoto: async () => {},
    ...(w.base === null ? {} : { mediaUrl: (key) => (w.base === "" ? null : r2lib.publicUrl(w.base, key)) }),
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

const startBody = (over = {}) => ({
  action: "start", store: "media", business_id: A, folder: "gallery", file_id: FILE,
  content_type: "image/jpeg", claimed_bytes: 100_000, ...over,
});
const removeBody = (over = {}) => ({ action: "remove", store: "media", business_id: A, key: K, ...over });

// ---------------------------------------------------------------------------
test("0 · the store profile and both key rules come from the bucket's own declaration", () => {
  const sql = readFileSync("supabase/migrations/20260827001000_phase2_cleanup_and_storage.sql", "utf8");

  assert.ok(door.STORES.media, "there is no media store");
  assert.equal(door.STORES.media.bucket, "business-media");
  assert.equal(door.STORES.media.parentField, null,
    "the media store names a parent row; a logo hangs off nothing, and a parent field would be a row to look up that is not there");
  assert.equal(door.STORES.media.kinds, null);

  // THE CEILING IS THE BUCKET'S OWN NUMBER, read out of the migration rather
  // than restated here: signing above it hands out a URL the bucket refuses.
  const limit = /'business-media'[\s\S]*?(\d+)\s*\*\s*1024\s*\*\s*1024/.exec(sql);
  assert.ok(limit, "the bucket's file_size_limit is no longer readable from the migration");
  assert.equal(door.STORES.media.maxBytes, Number(limit[1]) * MB,
    `the door's media ceiling and the bucket's own file_size_limit disagree (${Number(limit[1])} MB in the migration)`);
  assert.equal(door.STORES.media.maxBytes, 10 * MB);
  assert.equal(door.STORES.job.maxBytes, 10 * MB, "the job store's ceiling moved");
  assert.equal(door.STORES.receipt.maxBytes, 5 * MB, "the receipt store's ceiling moved");

  // THE FIVE TYPES ARE THE BUCKET'S `allowed_mime_types`, both copies of them.
  const declared = [...(/allowed_mime_types[\s\S]*?array\[([^\]]*)\]/.exec(sql)?.[1] ?? "")
    .matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(declared.slice().sort(), Object.keys(door.MEDIA_EXT).sort(),
    "the door signs for a different set of types than business-media accepts");
  // **TWO COPIES OF A PATH RULE THAT CAN DISAGREE is this repo's most repeated
  // failure.** The app and the edge function are different runtimes and cannot
  // share a module, so the agreement is asserted by importing both.
  assert.deepEqual(MEDIA_EXT_FOR_TYPE, door.MEDIA_EXT,
    "app/src/lib/photo-rules.js and _shared/photoDoor.ts map types to extensions differently");
  assert.deepEqual(MEDIA_FOLDERS, [...keys.MEDIA_FOLDERS],
    "app/src/lib/photo-rules.js and _shared/photoKey.ts allow different folders");
  assert.deepEqual(Object.values(MEDIA_EXT_FOR_TYPE).slice().sort(), [...keys.MEDIA_EXTS].sort(),
    "an extension the app can mint is not one the isolation guard can parse — which would refuse a key we wrote ourselves");
  assert.ok(!Object.keys(door.MEDIA_EXT).some((t) => /svg/.test(t)),
    "SVG is signable: an SVG may carry script, and a public bucket on the platform's own domain would serve it from there");
});

test("1 · the key is the shape the isolation reads, and the app mints the same one", () => {
  const minted = mediaPath({ businessId: A, folder: "gallery", id: FILE, type: "image/jpeg" });
  assert.equal(minted, K);
  assert.equal(minted.split("/")[0], A, "the first folder is not the business id — that folder IS the isolation");
  assert.equal(keys.businessOwnsKey(A, minted, "media"), true, "the guard refuses a key we mint ourselves");
  // every folder and every type round-trips: minted here, parsed there
  for (const folder of MEDIA_FOLDERS) {
    for (const type of Object.keys(MEDIA_EXT_FOR_TYPE)) {
      const k = mediaPath({ businessId: A, folder, id: FILE, type });
      assert.equal(keys.businessOwnsKey(A, k, "media"), true, `${folder} / ${type} mints a key the guard cannot parse`);
      assert.equal(keys.businessOwnsKey(B, k, "media"), false, `${folder} / ${type} is readable by another business`);
    }
  }
  // and the minter refuses rather than producing a path with a bad segment
  assert.throws(() => mediaPath({ businessId: A, folder: "../..", id: FILE, type: "image/jpeg" }), /folder/);
  assert.throws(() => mediaPath({ businessId: A, folder: "gallery", id: FILE, type: "image/heic" }), /heic/);
  assert.throws(() => mediaPath({ folder: "gallery", id: FILE, type: "image/jpeg" }), /businessId/);
  assert.equal(mediaExtForType("image/heic"), null, "an unsupported type gets a guessed extension instead of a refusal");
});

test("2 · ISOLATION — remove is by KEY, so the guard is the only thing standing in for a row", async () => {
  const w = world();
  w.objects.set(K_B, { bytes: 1000 });
  w.objects.set(K, { bytes: 1000 });

  const foreign = await w.call("owner-a", removeBody({ key: K_B }));
  assert.equal(foreign.status, 404, "another business's image was removed");
  assert.equal(w.objects.has(K_B), true, "another business's object was deleted");
  assert.ok(!JSON.stringify(foreign.body).includes(B),
    "the refusal names the other business — a refusal that echoes the key tells a prober whose it is");

  // every shape that is not a key this product mints, by the same guard
  for (const bad of [
    `${A}/../${B}/gallery/${FILE}.jpg`, `${A}/gallery/../../${B}/gallery/${FILE}.jpg`,
    `${A}%2fgallery%2f${FILE}.jpg`, `${A}\\gallery\\${FILE}.jpg`, `/${A}/gallery/${FILE}.jpg`,
    `business-media/${A}/gallery/${FILE}.jpg`, `https://x/${A}/gallery/${FILE}.jpg`,
    `${A}/gallery/${FILE}.jpg?x=${B}`, `${A}/gallery/${FILE}.jpg `, `${A}/gallery/${FILE}.svg`,
    `${A}/secrets/${FILE}.jpg`, `${A}/GALLERY/${FILE}.jpg`, `${A}/gallery/${FILE}.jpg `,
    `${A}/gallery/`, `${A}/gallery/*`, "", `${A}/${BOOKING_A}/${FILE}.jpg`,
  ]) {
    assert.equal((await w.call("owner-a", removeBody({ key: bad }))).status, 404, `accepted as a key: ${JSON.stringify(bad)}`);
  }
  // a PRIVATE key is not a media key either: the two shapes do not bleed
  assert.equal(keys.businessOwnsKey(A, `${A}/${BOOKING_A}/${PHOTO}.jpg`, "media"), false,
    "a job-photo key parses as a business image, so the public store could delete a private object");
  assert.equal(keys.businessOwnsKey(A, K, "private"), false,
    "a business-image key parses as a private one, so the private stores could sign for a public object");

  // the body cannot name a business the caller is not in
  assert.equal((await w.call("owner-a", startBody({ business_id: B }))).status, 401);
  assert.equal((await w.call("owner-b", removeBody({ business_id: A }))).status, 401);

  // and the owner's own key still works, so the guard is not simply refusing everything
  const mine = await w.call("owner-a", removeBody());
  assert.equal(mine.status, 200);
  assert.equal(mine.body.removed, true);
  assert.equal(w.objects.has(K), false);
});

test("3 · `settings` on BOTH actions — the other two stores' asymmetry would be wrong here", async () => {
  const w = world();
  const add = await w.call("staff-a", startBody());
  assert.equal(add.status, 403,
    "a member without `settings` signed an upload to business-media — the bucket's own insert policy "
    + "has required that permission since 20260904001000, and the service role bypasses the policy");
  assert.match(add.body.error, /settings permission/);
  assert.equal(w.calls.filter((c) => c[0] === "putUrl").length, 0, "a refused caller still signed a URL");

  assert.equal((await w.call("staff-a", removeBody())).status, 403);
  // and the owner may do both
  assert.equal((await w.call("owner-a", startBody())).status, 200);
  // THE CONTRAST, so the difference is proved rather than asserted: the same
  // member CAN add a job photo, which is the asymmetry the other stores carry.
  const asJob = await w.call("staff-a", {
    action: "start", business_id: A, booking_id: BOOKING_A, photo_id: PHOTO,
    kind: "before", content_type: "image/jpeg", claimed_bytes: 100_000,
  });
  assert.equal(asJob.status, 200, "one permission rule is serving both stores");
});

test("4 · THE CEILING — refused in words at the claim, and bound by the signature below it", async () => {
  const w = world();
  const big = await w.call("owner-a", startBody({ claimed_bytes: 11 * MB }));
  assert.equal(big.status, 413, "11 MB was accepted into a 10 MB bucket");
  assert.match(big.body.error, /10\.0 MB/, "the refusal does not say what the limit is");

  w.calls.length = 0;
  const ok = await w.call("owner-a", startBody({ claimed_bytes: 123_456 }));
  assert.equal(ok.status, 200);
  const put = w.calls.find((c) => c[0] === "putUrl");
  assert.equal(put[1], "business-media", "the PUT was signed against the wrong bucket");
  assert.equal(put[3], 123_456,
    "the claimed size was NOT signed into the URL. This store has no `finish` to measure the real size "
    + "at, so that signature is the only thing holding the bucket's per-file ceiling: without it a "
    + "browser claiming 1 KB may PUT any number of bytes and nothing ever notices");
});

test("5 · NOT METERED, stated rather than left as an absence", async () => {
  const w = world(door, { budget: { used_bytes: 10 * MB, cap_bytes: 10 * MB } });
  const r = await w.call("owner-a", startBody());
  assert.equal(r.status, 200,
    "a business image was refused for being over the photo allowance. That may be the right product "
    + "decision, but `job_photo_budget()` does not count this bucket, so the number it was compared "
    + "against is about the other two stores");
  assert.equal(w.calls.filter((c) => c[0] === "budget").length, 0,
    "the allowance was READ for a business image — a cap that is checked against a sum this bucket is "
    + "not in refuses the wrong people and lets the wrong people through");
  // The gap this records, in one line: no per-business cap, only a per-file one.
  // On Supabase the plan's 1 GB stopped the upload; on R2 nothing does, and the
  // same traffic arrives as a bill. ROADMAP 0.11 and FOR-ANDREW.md carry it as
  // a decision, because adding a bucket to the allowance needs a number nobody
  // has chosen.
});

test("6 · TWO ACTIONS. `finish` and `urls` do not exist here, and say so", async () => {
  const w = world();
  for (const action of ["finish", "urls"]) {
    const r = await w.call("owner-a", { ...startBody(), action, keys: [K] });
    assert.equal(r.status, 400, `${action} was not refused for the media store`);
    assert.match(r.body.error, new RegExp(`no ${action} step`),
      `${action} fell through to another store's handler instead of being refused in words: ${r.body.error}`);
  }
  assert.equal(w.calls.filter((c) => ["putUrl", "getUrl", "head"].includes(c[0])).length, 0,
    "a step that does not exist still reached R2");
});

test("7 · no public address is a refusal, and nothing is signed", async () => {
  // not wired at all
  const none = world(door, { base: null });
  const r1 = await none.call("owner-a", startBody());
  assert.equal(r1.status, 503);
  assert.match(r1.body.error, /not set up/);
  assert.equal(none.calls.filter((c) => c[0] === "putUrl").length, 0,
    "an upload was signed with nowhere to read it from — a logo stored where nothing can ever show it");

  // wired but answering null (a base that failed to parse)
  const blank = world(door, { base: "" });
  const r2 = await blank.call("owner-a", startBody());
  assert.equal(r2.status, 503);
});

test("8 · the folder, the id and the type are all allowlists", async () => {
  const w = world();
  for (const folder of ["", "..", "../..", "secrets", "Gallery", "gallery/", null, 7, ["gallery"]]) {
    const r = await w.call("owner-a", startBody({ folder }));
    assert.equal(r.status, 400, `folder accepted: ${JSON.stringify(folder)}`);
  }
  // AN UPPERCASE UUID IS A DIFFERENT OBJECT, because an R2 key is case
  // sensitive and Postgres renders a uuid lowercase — so it is refused, not
  // normalised. It needs hex LETTERS to test: FILE is all digits and dashes,
  // so `FILE.toUpperCase()` is FILE and this assertion passed without asking
  // anything. Caught by running it.
  const UPPER = "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA";
  for (const id of ["", "..", `${FILE}/x`, UPPER, UPPER.toLowerCase().replace("a", "z"), "*", null, 7]) {
    assert.equal((await w.call("owner-a", startBody({ file_id: id }))).status, 400, `file_id accepted: ${JSON.stringify(id)}`);
  }
  for (const type of ["image/svg+xml", "image/heic", "text/html", "", null, "image/jpeg; charset=x"]) {
    assert.equal((await w.call("owner-a", startBody({ content_type: type }))).status, 400, `type accepted: ${JSON.stringify(type)}`);
  }
  for (const n of [0, -1, 1.5, "100", null]) {
    assert.equal((await w.call("owner-a", startBody({ claimed_bytes: n }))).status, 400, `claimed_bytes accepted: ${JSON.stringify(n)}`);
  }
  assert.equal(w.calls.filter((c) => c[0] === "putUrl").length, 0, "one of the refused requests still signed a URL");
});

test("9 · the rate ceiling is asked before any store work, and the store name is still explicit", async () => {
  const w = world(door, { limiterOk: false });
  assert.equal((await w.call("owner-a", startBody())).status, 429);
  assert.equal(w.calls.filter((c) => c[0] === "putUrl").length, 0, "a refused caller still spent R2");

  // no `store` is still the job store, byte for byte
  const w2 = world();
  const u = await w2.call("owner-a", { action: "urls", business_id: A, keys: [`${A}/${BOOKING_A}/${PHOTO}.jpg`] });
  assert.equal(u.status, 200);
  assert.ok(u.body.urls[`${A}/${BOOKING_A}/${PHOTO}.jpg`].includes("/job-photos/"), "the default store moved");
  assert.equal((await w2.call("owner-a", { ...startBody(), store: "pictures" })).status, 400);
});

test("10 · the public base and the signed length are real, not shaped like it", async () => {
  // the base: https only, trailing slash trimmed, and a name rather than a value when it is missing
  const get = (v) => () => v;
  assert.equal(r2lib.mediaBase(get("https://m.example.com/")).base, "https://m.example.com");
  assert.equal(r2lib.mediaBase(get("https://m.example.com///")).base, "https://m.example.com");
  assert.equal(r2lib.mediaBase(get("  https://m.example.com/media  ")).base, "https://m.example.com/media");
  for (const bad of ["", "   ", "http://m.example.com", "m.example.com", "https://", "ftp://m.example.com", undefined]) {
    const { base, missing } = r2lib.mediaBase(get(bad));
    assert.equal(base, null, `accepted as a public base: ${JSON.stringify(bad)}`);
    assert.deepEqual(missing, ["R2_MEDIA_BASE"], "the missing NAME is not reported, which is the only safe thing to log");
  }
  assert.equal(r2lib.publicUrl("https://m.example.com", K), `https://m.example.com/${K}`);
  assert.equal(r2lib.publicUrl("https://m.example.com", `${A}/gallery/a b.jpg`), `https://m.example.com/${A}/gallery/a%20b.jpg`,
    "the key is not path-encoded, so a key and its url can disagree about what a character means");

  // THE SIGNATURE ITSELF, through the real signer: `content-length` is in the
  // proof, and changing the size changes the signature. A browser cannot set
  // that header from JavaScript — it is filled in from the body — so a file of
  // any other size simply does not match.
  const cfg = { accountId: "acct", accessKeyId: "AKIA-test", secretAccessKey: "secret-test" };
  const at = () => new Date("2026-10-08T00:00:00Z");
  const store = r2lib.makeR2(cfg, async () => new Response("", { status: 200 }), at);
  const plain = await store.putUrl("business-media", K, "image/jpeg", 600);
  const bound = await store.putUrl("business-media", K, "image/jpeg", 600, 123_456);
  const other = await store.putUrl("business-media", K, "image/jpeg", 600, 123_457);
  assert.match(plain, /X-Amz-SignedHeaders=content-type%3Bhost/);
  assert.match(bound, /X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost/,
    "content-length is not part of the proof, so the size the door was told is not binding on the browser");
  assert.notEqual(
    /X-Amz-Signature=([0-9a-f]+)/.exec(bound)[1],
    /X-Amz-Signature=([0-9a-f]+)/.exec(other)[1],
    "one byte's difference in the declared size produces the same signature, so the length is not really signed");
  assert.ok(!bound.includes("secret-test"), "the secret is in the URL");
  // and the two private stores are unchanged: no length is signed for them
  assert.match(await store.putUrl("job-photos", `${A}/${BOOKING_A}/${PHOTO}.jpg`, "image/jpeg", 600),
    /X-Amz-SignedHeaders=content-type%3Bhost/);
});

test("11 · the app's reader refuses an answer it cannot use", () => {
  const want = { businessId: A, folder: "gallery", fileId: FILE, type: "image/jpeg" };
  const good = { upload_url: "https://r2/put", key: K, public_url: `${BASE}/${K}` };
  assert.deepEqual(readMediaStart(good, want), { uploadUrl: "https://r2/put", key: K, publicUrl: `${BASE}/${K}` });
  for (const [why, resp] of [
    ["no public_url at all", { ...good, public_url: undefined }],
    // AN `http` PUBLIC URL IS THE ONE WORTH SPELLING OUT: it is blocked as
    // mixed content on every page this product serves, and it would be STORED
    // in a row — so it looks like a missing logo for ever rather than like a
    // configuration mistake once.
    ["an http public_url", { ...good, public_url: `http://media.test/${K}` }],
    ["a public_url that is not a string", { ...good, public_url: 7 }],
    ["another business's key", { ...good, key: K_B }],
    ["a key under a different folder", { ...good, key: `${A}/branding/${FILE}.jpg` }],
    ["an http upload_url", { ...good, upload_url: `http://r2/put` }],
    ["nothing at all", null],
  ]) {
    assert.throws(() => readMediaStart(resp, want), /photo service/, `accepted: ${why}`);
  }
});

test("12 · the app half is switched OFF, and there is no second way in", () => {
  const src = readFileSync("app/src/lib/photo-door.js", "utf8");
  assert.match(src, /export const MEDIA_VIA_DOOR = false;/,
    "MEDIA_VIA_DOOR is not false. Logos and the marketing gallery work today; switching them over "
    + "before photo-door is published and business-media has a public address breaks a working feature");
  const up = readFileSync("app/src/lib/upload.js", "utf8");
  // ONE BRANCH ON THE FLAG PER FUNCTION, never a catch that falls back to the
  // old store: a fallback is a SECOND door, live exactly when the function is
  // down, and `photo-door.js`'s own header forbids it in those words.
  // The READS, not every mention: the file's header explains the flag and the
  // import names it, and counting those made this assertion about prose.
  assert.equal(up.split("if (MEDIA_VIA_DOOR)").length - 1, 2,
    "the flag is branched on somewhere unexpected in upload.js — it is one branch each in upload and remove");
  assert.ok(!/catch[\s\S]{0,200}supabase\.storage/.test(up),
    "upload.js falls back to Supabase Storage when the door fails — a second door is how a cap stops meaning anything");
  // And the gallery copy goes through the same one function rather than keeping
  // its own copy of it, which is what the key in the return value is for.
  const ph = readFileSync("app/src/lib/photos.js", "utf8");
  assert.ok(!/storage\.from\("business-media"\)/.test(ph),
    "photos.js still talks to the business-media bucket itself, so the flag is read in two places");
  assert.match(ph, /uploadBusinessPhoto\(businessId, await dl\.blob\(\), "gallery"\)/);
  assert.match(ph, /removeBusinessPhoto\(businessId, dest\)/,
    "a failed gallery_images insert no longer removes the object it just uploaded");
});

// ---------------------------------------------------------------------------
// § 14 — `upload.js` IS RUN, NOT READ
// ---------------------------------------------------------------------------
// **§ 12 ASKS WHETHER THE FILE SAYS THE RIGHT THINGS; THIS RUNS IT.** The
// difference is not academic: the one change in this slice that reaches a screen
// with the flag still OFF is that `uploadBusinessPhoto` returns `{ url, key }`
// instead of a bare url, and the three call sites were edited to match. A text
// check cannot tell a correct destructure from a plausible-looking one, and a
// wrong one puts `undefined` in a business's `logo_url` — which is a saved row,
// not a failed press.
//
// `upload.js` imports the Supabase client and `api.js`, so it cannot be
// imported here directly. It is copied to a temp directory beside four stub
// siblings and its OWN text is left untouched, which is the arrangement the
// door suites use for `photoDoor.ts`: the thing under test is the real file.
const appLib = (n) => JSON.stringify(pathToFileURL(path.resolve(`app/src/lib/${n}`)).href);

async function loadUpload(flagOn) {
  const d = mkdtempSync(path.join(tmpdir(), "upload-js-"));
  const w = { calls: [], puts: [], doorAnswer: null, doorThrows: null, uploadError: null };
  // The stubs are the only fiction. Everything they stand in for — the key
  // rules, the door readers, the sentences — is the real module, re-exported.
  writeFileSync(path.join(d, "photo-rules.js"), `export * from ${appLib("photo-rules.js")};`);
  writeFileSync(path.join(d, "photo-door.js"),
    `export * from ${appLib("photo-door.js")};\nexport const MEDIA_VIA_DOOR = ${flagOn};`);
  writeFileSync(path.join(d, "api.js"), "export const api = { photoDoor: (b, body) => globalThis.__door(b, body) };");
  writeFileSync(path.join(d, "supabase.js"), "export const supabase = globalThis.__supabase;");
  writeFileSync(path.join(d, "upload.js"), readFileSync("app/src/lib/upload.js", "utf8"));

  globalThis.__door = async (businessId, body) => {
    w.calls.push({ businessId, ...body });
    if (w.doorThrows) throw w.doorThrows;
    return w.doorAnswer;
  };
  globalThis.__supabase = {
    storage: {
      from: (bucket) => ({
        upload: async (key, file, opts) => { w.calls.push({ bucket, key, type: opts.contentType, upsert: opts.upsert }); return { error: w.uploadError }; },
        getPublicUrl: (key) => ({ data: { publicUrl: `https://sb.test/object/public/${bucket}/${key}` } }),
        remove: async (list) => { w.calls.push({ bucket, removed: list }); return { error: null }; },
      }),
    },
  };
  globalThis.fetch = async (url, init) => { w.puts.push({ url, method: init?.method, type: init?.headers?.["Content-Type"], bytes: init?.body?.size }); return new Response("", { status: 200 }); };
  w.mod = await import(pathToFileURL(path.join(d, "upload.js")).href);
  return w;
}

/** A stand-in for a picked file: a real Blob, with the `name` a File has. */
const pickedFile = (name, type, size) => Object.assign(new Blob([new Uint8Array(size)], { type }), { name });

test("14 · FLAG OFF — today's path, byte for byte, and the return shape the screens read", async () => {
  const w = await loadUpload(false);
  const out = await w.mod.uploadBusinessPhoto(A, pickedFile("Logo Final.PNG", "image/png", 2048), "branding");

  assert.equal(typeof out, "object", "uploadBusinessPhoto no longer returns an object, so every call site reads undefined");
  assert.deepEqual(Object.keys(out).sort(), ["key", "url"]);
  const up = w.calls.find((c) => c.bucket);
  assert.equal(up.bucket, "business-media", "the old path stopped writing to business-media");
  assert.equal(up.type, "image/png");
  assert.equal(up.upsert, false, "upsert was turned on, which lets one upload overwrite another");
  assert.match(up.key, new RegExp(`^${A}/branding/[0-9a-f-]{36}\\.png$`), up.key);
  assert.equal(out.key, up.key, "the key returned is not the key written, so a rollback would delete the wrong object");
  assert.equal(out.url, `https://sb.test/object/public/business-media/${up.key}`);
  assert.equal(w.puts.length, 0, "the old path made an HTTP request of its own");
  assert.equal(w.calls.filter((c) => c.action).length, 0, "the old path called the photo door");

  // A PLAIN BLOB HAS NO `name`, and the gallery copy is one. This threw
  // `undefined.split` before slice 4 and only on that one caller.
  const blob = await w.mod.uploadBusinessPhoto(A, new Blob([new Uint8Array(10)], { type: "image/jpeg" }), "gallery");
  assert.match(blob.key, new RegExp(`^${A}/gallery/[0-9a-f-]{36}\\.jpg$`), blob.key);

  // and a failed upload is still the bucket's own sentence, not a swallowed one
  const bad = await loadUpload(false);
  bad.uploadError = { message: "mime type image/heic is not supported" };
  await assert.rejects(bad.mod.uploadBusinessPhoto(A, pickedFile("x.heic", "image/heic", 10), "gallery"), /heic/);
});

test("15 · FLAG ON — start, one PUT, the public url, and no bucket call at all", async () => {
  const w = await loadUpload(true);
  const key = `${A}/gallery/`;
  w.doorAnswer = null;
  // The door's answer is built from the body it is given, so the key the app
  // checks is the key the app asked for — a hard-coded one would make the
  // check vacuous.
  globalThis.__door = async (businessId, body) => {
    w.calls.push({ businessId, ...body });
    const k = `${businessId}/${body.folder}/${body.file_id}.jpg`;
    return { upload_url: `https://r2.test/put/${k}`, key: k, public_url: `${BASE}/${k}`, expires_in: 600 };
  };
  const out = await w.mod.uploadBusinessPhoto(A, pickedFile("car.jpg", "image/jpeg", 4096), "gallery");

  const start = w.calls.find((c) => c.action === "start");
  assert.equal(start.store, "media");
  assert.equal(start.folder, "gallery");
  assert.equal(start.content_type, "image/jpeg");
  assert.equal(start.claimed_bytes, 4096, "the declared size is not the blob's, so the signed length will not match the body");
  assert.ok(start.key === undefined && start.path === undefined,
    "the browser sent a path. The server mints the key; a path built in the browser is the one thing the isolation cannot check");
  assert.equal(w.puts.length, 1, "more or fewer than one PUT");
  assert.equal(w.puts[0].method, "PUT");
  assert.equal(w.puts[0].type, "image/jpeg", "the PUT's content type differs from the one signed for, which R2 refuses");
  assert.equal(w.puts[0].bytes, 4096);
  assert.ok(out.key.startsWith(key) && out.url.startsWith(`${BASE}/`), JSON.stringify(out));
  assert.equal(w.calls.filter((c) => c.bucket).length, 0,
    "the door path still talked to the Supabase bucket — a second door is how a cap stops meaning anything");

  // A TYPE THE BUCKET REFUSES IS REFUSED BEFORE ANYTHING IS SENT.
  const heic = await loadUpload(true);
  await assert.rejects(heic.mod.uploadBusinessPhoto(A, pickedFile("IMG.HEIC", "image/heic", 10), "gallery"),
    /Choose a JPG, PNG, WEBP, GIF or AVIF/);
  assert.equal(heic.calls.length, 0, "a type the bucket refuses still spent a door call");

  // AND AN UNPUBLISHED DOOR FAILS IN WORDS, with nothing written. A gateway 404
  // for a function that does not exist carries no CORS headers, so the browser
  // blocks it and the page sees a TypeError rather than a status.
  const down = await loadUpload(true);
  down.doorThrows = new TypeError("Failed to fetch");
  await assert.rejects(down.mod.uploadBusinessPhoto(A, pickedFile("car.jpg", "image/jpeg", 10), "gallery"),
    /Could not reach the photo service/);
  assert.equal(down.puts.length, 0, "a file was uploaded after the door refused");

  // A KEY THAT IS NOT THE ONE ASKED FOR IS REFUSED, which is what stops a
  // confused or hostile answer making the browser PUT into another business.
  const wrong = await loadUpload(true);
  globalThis.__door = async () => ({ upload_url: "https://r2.test/put", key: K_B, public_url: `${BASE}/${K_B}` });
  await assert.rejects(wrong.mod.uploadBusinessPhoto(A, pickedFile("car.jpg", "image/jpeg", 10), "gallery"),
    /photo service sent back something/);
  assert.equal(wrong.puts.length, 0, "the browser PUT to a key it never asked for");
});

test("16 · remove goes to the door when the flag is on and to the bucket when it is off", async () => {
  const on = await loadUpload(true);
  globalThis.__door = async (businessId, body) => { on.calls.push({ businessId, ...body }); return { removed: true }; };
  await on.mod.removeBusinessPhoto(A, K);
  assert.deepEqual(on.calls, [{ businessId: A, action: "remove", store: "media", key: K }]);
  assert.equal(on.calls.filter((c) => c.bucket).length, 0);

  // AN ANSWER THAT IS NOT A REMOVAL IS NOT TREATED AS ONE: a caller that
  // believes a delete happened stops counting bytes that are still there.
  const lying = await loadUpload(true);
  globalThis.__door = async () => ({ removed: "yes" });
  await assert.rejects(lying.mod.removeBusinessPhoto(A, K), /photo service/);

  const off = await loadUpload(false);
  await off.mod.removeBusinessPhoto(A, K);
  assert.deepEqual(off.calls, [{ bucket: "business-media", removed: [K] }]);
});

// ---------------------------------------------------------------------------
// § 13 — BREAK IT ON PURPOSE
// ---------------------------------------------------------------------------
// The control runs first, so a probe that can never pass cannot be mistaken for
// a caught sabotage. CRLF is normalised: a checkout with autocrlf on carries it
// and the text to sabotage is written with LF.
const SRC = () => readFileSync("supabase/functions/_shared/photoDoor.ts", "utf8").replace(/\r\n/g, "\n");
const dir = mkdtempSync(path.join(tmpdir(), "media-door-sab-"));
const abs = (n) => JSON.stringify(pathToFileURL(path.resolve(`supabase/functions/_shared/${n}`)).href);
async function variant(label, edits) {
  let s = SRC().replace('"./http.ts"', abs("http.ts")).replace('"./photoKey.ts"', abs("photoKey.ts"));
  for (const [from, to] of edits) {
    assert.equal(s.split(from).length - 1, 1, `${label}: the text to sabotage is not unique or not there: ${from.slice(0, 60)}`);
    s = s.replace(from, to);
  }
  const f = path.join(dir, `${label}.ts`);
  writeFileSync(f, s);
  return import(pathToFileURL(f).href);
}

const PROBES = {
  async foreignImageRemoved(mod) {
    const w = world(mod);
    w.objects.set(K_B, { bytes: 1000 });
    return (await w.call("owner-a", removeBody({ key: K_B }))).status === 200;
  },
  async staffSigned(mod) {
    return (await world(mod).call("staff-a", startBody())).status === 200;
  },
  async oversizeSigned(mod) {
    return (await world(mod).call("owner-a", startBody({ claimed_bytes: 50 * MB }))).status === 200;
  },
  async unboundSize(mod) {
    const w = world(mod);
    await w.call("owner-a", startBody());
    return w.calls.find((c) => c[0] === "putUrl")?.[3] === undefined;
  },
  async freeFolder(mod) {
    const r = await world(mod).call("owner-a", startBody({ folder: `../${B}/gallery` }));
    return r.status === 200;
  },
  async freeFileId(mod) {
    const r = await world(mod).call("owner-a", startBody({ file_id: "../../x" }));
    return r.status === 200;
  },
  async urlStoredAnyway(mod) {
    const w = world(mod, { base: "" });
    return (await w.call("owner-a", startBody())).status === 200;
  },
  async urlsTreatedAsStart(mod) {
    const w = world(mod);
    const r = await w.call("owner-a", { ...startBody(), action: "urls", keys: [K] });
    return !/no urls step/.test(r.body?.error ?? "");
  },
};

const SAB = [
  ["foreignImageRemoved", [['if (!businessOwnsKey(member.businessId, key, "media")) return bad("Image not found", 404);', ""]],
    "the ownership guard on remove — the ONLY thing standing in for a row here"],
  // The `settings` check is spelled through a local precisely so this text is
  // unique: written as the same condition the job store uses, it would make
  // THAT suite's sabotage ambiguous and two green suites would go red.
  ["staffSigned", [["const mayChangeBranding = deps.can(member, \"settings\");", "const mayChangeBranding = true;"]],
    "the settings permission on the public store"],
  ["oversizeSigned", [["if (claimed > store.maxBytes) return bad(`That image is larger than ${mb(store.maxBytes)}.`, 413);", ""]],
    "the bucket's 10 MB per-file ceiling"],
  ["unboundSize", [["upload_url: await r2.putUrl(store.bucket, key, type, PUT_SECONDS, claimed),",
                    "upload_url: await r2.putUrl(store.bucket, key, type, PUT_SECONDS),"]],
    "signing the declared length, which is the only thing making the claim binding"],
  ["freeFolder", [["if (typeof folder !== \"string\" || !(MEDIA_FOLDERS as readonly string[]).includes(folder)) {", "if (false) {"]],
    "the folder allowlist — a free folder puts a traversal segment in the minted key"],
  // TWO LINES, because `file_id is not valid.` is also the receipts branch's
  // and a one-line edit is not unique. The declaration above it is.
  ["freeFileId", [["const fileId = body.file_id;\n      if (typeof fileId !== \"string\" || !UUID.test(fileId)) return bad(\"file_id is not valid.\");",
                   "const fileId = body.file_id;"]],
    "the file_id shape — a free id puts a traversal segment in the minted key"],
  ["urlStoredAnyway", [["if (!url) return bad(\"Public image storage is not set up on the server yet.\", 503);", ""]],
    "refusing when there is no public address to read the image back from"],
  ["urlsTreatedAsStart", [["if (action !== \"start\") {\n        return bad(`A business image is stored in one step; there is no ${action} step for it.`);\n      }", ""]],
    "refusing the two actions this store does not have"],
];

test("13 · SABOTAGE — each guard removed is seen (control first)", async () => {
  for (const [name] of SAB) {
    assert.equal(await PROBES[name](door), false, `control: ${name} is already allowed with nothing sabotaged`);
  }
  for (const [name, edits, what] of SAB) {
    const mod = await variant(name, edits);
    assert.equal(await PROBES[name](mod), true, `sabotage not seen — ${what}: the probe still came back refused`);
    console.log(`    caught  ${what}`);
  }
  assert.equal(SAB.length, 8, "the sabotage list changed size; say why in the same edit");
});
