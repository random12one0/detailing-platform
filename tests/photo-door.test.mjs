// ROADMAP 0.11, SLICE 1 — THE APP'S HALF OF THE PHOTO DOOR.
//
//   node --test tests/photo-door.test.mjs
//
// Credential-free, no browser, no dev server, no network. Reads
// app/src/lib/photo-door.js (pure, one import of photo-rules.js) and, as text,
// app/src/lib/api.js.
//
// WHAT IT PROVES, and what it cannot: that the app REFUSES every answer the
// contract in photo-door.js does not allow, and says so in words. It cannot
// prove the server half exists. That half is not built, which is exactly why
// every refusal below matters: until it is, these sentences are all a detailer
// sees. The end-to-end run (a stub door in a real browser, then the real
// function through scripts/lib/edgeLocal.mjs) is the next slice's proof.
//
// BREAK IT ON PURPOSE: section 5 rebuilds the module with ONE guard removed
// and asserts the matching check goes red. A check that cannot be seen to fail
// is how this repo shipped six that tested nothing.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DOOR, DOOR_BATCH, DOOR_WORDS, doorError, readFinish, readRemoved, readStart, readUrls,
} from "../app/src/lib/photo-door.js";
import { storagePath } from "../app/src/lib/photo-rules.js";

const BIZ = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const BOOKING = "33333333-3333-4333-8333-333333333333";
const PHOTO = "44444444-4444-4444-8444-444444444444";
const ctx = { businessId: BIZ, bookingId: BOOKING, photoId: PHOTO, type: "image/jpeg" };
const KEY = storagePath({ businessId: BIZ, ownerId: BOOKING, id: PHOTO, type: "image/jpeg" });
const throwsWords = (fn, which) => assert.throws(fn, (e) => e.message === DOOR_WORDS[which]);

test("1 · start: the exact key and an https url, or a plain refusal", () => {
  assert.deepEqual(readStart({ upload_url: "https://r2.example/put", key: KEY }, ctx),
    { uploadUrl: "https://r2.example/put", key: KEY });
  const bad = {
    "another business's key": { upload_url: "https://r2.example/put", key: KEY.replace(BIZ, OTHER) },
    "a traversal that starts with ours": { upload_url: "https://r2.example/put", key: `${BIZ}/../${OTHER}/x.jpg` },
    "our key with the wrong extension": { upload_url: "https://r2.example/put", key: KEY.replace(/\.jpg$/, ".png") },
    "no key": { upload_url: "https://r2.example/put" },
    "an http url": { upload_url: "http://r2.example/put", key: KEY },
    "no url": { key: KEY },
    "an empty object": {},
    "null": null,
    "an array": [KEY],
    "a string": "ok",
  };
  for (const [what, resp] of Object.entries(bad)) {
    assert.throws(() => readStart(resp, ctx), (e) => e.message === DOOR_WORDS.unreadable, what);
  }
});

test("2 · finish: a positive whole-number size, our id and our key, or a plain refusal", () => {
  const row = { id: PHOTO, path: KEY, bytes: 312345 };
  assert.equal(readFinish({ photo: row }, { photoId: PHOTO, key: KEY }), row);
  // TRAP ONE (docs/the-photo-allowance.md § 5): bytes that do not land make the
  // cap compare against zero, and the cap silently becomes unlimited.
  for (const bytes of [0, -5, null, undefined, "312345", 1.5, NaN, Infinity]) {
    throwsWords(() => readFinish({ photo: { ...row, bytes } }, { photoId: PHOTO, key: KEY }), "unconfirmed");
  }
  throwsWords(() => readFinish({ photo: { ...row, id: OTHER } }, { photoId: PHOTO, key: KEY }), "unconfirmed");
  throwsWords(() => readFinish({ photo: { ...row, path: KEY.replace(BIZ, OTHER) } }, { photoId: PHOTO, key: KEY }), "unconfirmed");
  for (const resp of [null, {}, { photo: null }, { photo: [] }, { rows: [row] }]) {
    throwsWords(() => readFinish(resp, { photoId: PHOTO, key: KEY }), "unconfirmed");
  }
});

test("3 · urls and remove: a real map, a literal true", () => {
  assert.deepEqual(readUrls({ urls: { [KEY]: "https://r2.example/get" } }), { [KEY]: "https://r2.example/get" });
  assert.deepEqual(readUrls({ urls: {} }), {});            // nothing readable is an answer, not a failure
  for (const resp of [null, {}, { urls: null }, { urls: [] }, { urls: "x" }]) throwsWords(() => readUrls(resp), "unreadable");
  assert.equal(readRemoved({ removed: true }), true);
  for (const resp of [null, {}, { removed: false }, { removed: "true" }, { removed: 1 }]) throwsWords(() => readRemoved(resp), "unreadable");
});

test("4 · what a failed call becomes", () => {
  const http = (status, message, body) => Object.assign(new Error(message), { status, body });
  assert.equal(doorError(http(404, "Request failed (404)", null)).message, DOOR_WORDS.missing);
  assert.equal(doorError(http(404, "Request failed (404)", { code: "NOT_FOUND" })).message, DOOR_WORDS.missing);
  // The door's own 404s ("Booking not found", "Photo not found") are the door speaking.
  assert.equal(doorError(http(404, "Booking not found", { error: "Booking not found" })).message, "Booking not found");
  assert.equal(doorError(http(400, "Unknown action")).message, DOOR_WORDS.missing);
  assert.equal(doorError(http(500, "boom")).message, DOOR_WORDS.failed);
  assert.equal(doorError(http(503, "boom")).message, DOOR_WORDS.failed);
  // The over-the-cap refusal is the server's sentence and must arrive untouched.
  const cap = "Photo storage is full: 10.0 of 10.2 MB used. Delete old job photos to make room.";
  assert.equal(doorError(http(409, cap)).message, cap);
  assert.equal(doorError(http(403, "Not allowed")).message, "Not allowed");
  assert.equal(doorError(new TypeError("Failed to fetch")).message, DOOR_WORDS.unreachable);
  assert.equal(doorError(new Error("Looking only")).message, "Looking only");   // the preview tab's own refusal
  assert.equal(doorError("odd").message, "odd");
  // A 400 that is NOT "unknown action" is the server speaking, not a missing door.
  assert.equal(doorError(http(400, "claimed_bytes is required")).message, "claimed_bytes is required");
  // Every sentence is plain, distinct and says what happened to the photo.
  const all = Object.values(DOOR_WORDS);
  assert.equal(new Set(all).size, all.length);
  for (const w of all) assert.match(w, /\.$/);
  assert.ok(DOOR === "photo-door" && DOOR_BATCH === 100);
});

test("5 · SABOTAGE — each guard, removed, is seen", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "photo-door-"));
  const src = readFileSync("app/src/lib/photo-door.js", "utf8")
    .replace('"./photo-rules.js"', JSON.stringify(pathToFileURL(path.resolve("app/src/lib/photo-rules.js")).href));
  const build = async (name, from, to) => {
    assert.equal(src.split(from).length - 1, 1, `${name}: the line to sabotage is not unique or not there`);
    const file = path.join(dir, `${name}.mjs`);
    writeFileSync(file, src.replace(from, to));
    return import(pathToFileURL(file).href);
  };
  const zeroRefused = (m) => { try { m.readFinish({ photo: { id: PHOTO, path: KEY, bytes: 0 } }, { photoId: PHOTO, key: KEY }); return false; } catch { return true; } };
  const foreignKeyRefused = (m) => { try { m.readStart({ upload_url: "https://x.example/p", key: KEY.replace(BIZ, OTHER) }, ctx); return false; } catch { return true; } };
  const httpRefused = (m) => { try { m.readStart({ upload_url: "http://x.example/p", key: KEY }, ctx); return false; } catch { return true; } };
  const mapRefused = (m) => { try { m.readUrls({}); return false; } catch { return true; } };
  const notFoundNamed = (m) => m.doorError(Object.assign(new Error("x"), { status: 404 })).message === DOOR_WORDS.missing;

  // The control: unmodified, every probe is refused.
  const real = await build("control", "export const DOOR =", "export const DOOR =");
  assert.ok(zeroRefused(real) && foreignKeyRefused(real) && httpRefused(real) && mapRefused(real) && notFoundNamed(real));

  assert.ok(!zeroRefused(await build("zero", "p.bytes <= 0", "false")), "zero-bytes guard removed must be seen");
  assert.ok(!foreignKeyRefused(await build("key", "resp.key !== want", "false")), "key-equality guard removed must be seen");
  assert.ok(!httpRefused(await build("https", '!/^https:\\/\\//.test(resp.upload_url)', "false")), "https guard removed must be seen");
  assert.ok(!mapRefused(await build("map", "|| !isObject(resp.urls)) refuse", "|| false) refuse")), "urls-map guard removed must be seen");
  assert.ok(!notFoundNamed(await build("notfound", "if ((s === 404 && !spoke) ||", "if (false ||")), "404 -> 'not set up' removed must be seen");
});

test("6 · the app has ONE way in, and a preview tab on Looking may only read", () => {
  const api = readFileSync("app/src/lib/api.js", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.match(api, /photoDoor: \(businessId, body\) => callFn\("photo-door", /);
  assert.match(api, /!\(name === "photo-door" && body\?\.action === "urls"\)\) guardWrite\(\)/);
  assert.equal((api.match(/photo-door/g) || []).length, 2, "photo-door is named in exactly two places in api.js");
});
