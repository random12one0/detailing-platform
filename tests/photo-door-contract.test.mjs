// ROADMAP 0.11 — THE TWO HALVES OF THE PHOTO DOOR, RUN AGAINST EACH OTHER.
//
//   node --test tests/photo-door-contract.test.mjs
//
// Credential-free, in memory. It imports the SERVER's rules
// (supabase/functions/_shared/photoDoor.ts) and the APP's readers
// (app/src/lib/photo-door.js) and feeds one to the other, so the contract
// written in the header of the second is checked against the first instead of
// being two documents that agree on paper.
//
// **IT NEEDS BOTH HALVES AND SAYS SO LOUDLY.** The static imports below fail to
// load if the app half is absent; that is deliberate. A check that quietly
// skipped itself when one side was missing would read exactly like a pass —
// this repo's single most repeated failure.
//
// It found a real conflict the first time it ran: the door answers 404
// "Booking not found", and the app's reader took EVERY 404 to mean "the
// function is not deployed", so a missing booking would have been reported as
// "Photo storage is not set up on the server yet."

import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as door from "../supabase/functions/_shared/photoDoor.ts";
import { DOOR_WORDS, doorError, readFinish, readRemoved, readStart, readUrls } from "../app/src/lib/photo-door.js";

const MB = 1024 * 1024;
const A = "11111111-1111-4111-8111-111111111111";
const BOOKING = "33333333-3333-4333-8333-333333333333";
const PHOTO = "55555555-5555-4555-8555-555555555555";
const KEY = `${A}/${BOOKING}/${PHOTO}.jpg`;
const ctx = { businessId: A, bookingId: BOOKING, photoId: PHOTO, type: "image/jpeg" };

function world(over = {}) {
  const w = { rows: new Map(), objects: new Map(), budget: { used_bytes: 0, cap_bytes: 10 * MB }, bookings: new Set([`${A}:${BOOKING}`]), ...over };
  const member = { userId: "u1", businessId: A, role: "owner", permissions: [] };
  w.deps = {
    requireMember: async (_r, biz) => (biz === A ? member : null),
    can: () => true,
    withinLimits: async () => true,
    limit: { windowSeconds: 3600, limit: 600 },
    bookingBelongs: async (biz, b) => w.bookings.has(`${biz}:${b}`),
    budget: async () => w.budget,
    getPhoto: async (_b, id) => w.rows.get(id) ?? null,
    insertPhoto: async (row) => { w.rows.set(row.id, row); return row; },
    deletePhoto: async (_b, id) => { w.rows.delete(id); },
    r2: {
      putUrl: async (bucket, key) => `https://r2.test/${bucket}/${key}?put`,
      getUrl: async (bucket, key) => `https://r2.test/${bucket}/${key}?get`,
      head: async (_b, key) => (w.objects.has(key) ? { exists: true, bytes: w.objects.get(key) } : { exists: false, bytes: null }),
      del: async (_b, key) => { w.objects.delete(key); },
    },
    log: () => {},
  };
  // Answers the way `postFunction` hands them to the app: a body on success, an
  // Error carrying `status`, the server's sentence and the whole body on failure.
  w.post = async (body) => {
    const res = await door.handlePhotoDoor(new Request("http://x.test/", {
      method: "POST", headers: { Authorization: "Bearer t" }, body: JSON.stringify({ business_id: A, ...body }),
    }), w.deps);
    const data = await res.json();
    if (res.ok) return data;
    throw Object.assign(new Error(data?.error || `Request failed (${res.status})`), { status: res.status, body: data });
  };
  return w;
}

test("1 · every answer the door gives is accepted by the app's readers", async () => {
  const w = world();
  const start = await w.post({ action: "start", booking_id: BOOKING, photo_id: PHOTO, kind: "before", content_type: "image/jpeg", claimed_bytes: 300000, width: 1600, height: 1200 });
  assert.deepEqual(readStart(start, ctx), { uploadUrl: `https://r2.test/job-photos/${KEY}?put`, key: KEY });
  w.objects.set(KEY, 312345);
  const fin = await w.post({ action: "finish", booking_id: BOOKING, photo_id: PHOTO, kind: "before", width: 1600, height: 1200, caption: null });
  assert.equal(readFinish(fin, { photoId: PHOTO, key: KEY }).bytes, 312345);
  assert.deepEqual(Object.keys(readUrls(await w.post({ action: "urls", keys: [KEY] }))), [KEY]);
  assert.equal(readRemoved(await w.post({ action: "remove", photo_id: PHOTO })), true);
});

test("2 · the fields the app sends are exactly the fields the door reads", async () => {
  // The bodies are READ OUT OF photos.js, not retyped here, so renaming a field
  // on either side turns this red.
  const src = readFileSync("app/src/lib/photos.js", "utf8").replace(/\r\n/g, "\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // The keys of the object literal that starts at `action: "x"`: split on the
  // commas that are not inside a call's brackets; a key is what is left of a
  // colon, or the whole token for a shorthand (`kind`, `width`).
  const keysOf = (action) => {
    const at = src.indexOf(`action: "${action}"`);
    assert.ok(at >= 0, `photos.js never sends action "${action}"`);
    let lit = src.slice(at, src.indexOf("}", at));
    while (/\([^()]*\)/.test(lit)) lit = lit.replace(/\([^()]*\)/g, "");
    return lit.split(",").map((t) => t.trim()).filter(Boolean).map((t) => t.split(":")[0].trim()).filter((k) => k !== "action");
  };
  const expected = {
    start: ["booking_id", "photo_id", "kind", "content_type", "claimed_bytes", "width", "height"],
    finish: ["booking_id", "photo_id", "kind", "width", "height", "caption"],
    urls: ["keys"],
    remove: ["photo_id"],
  };
  for (const [action, keys] of Object.entries(expected)) {
    assert.deepEqual([...new Set(keysOf(action))].sort(), [...keys].sort(), `${action}: the app's fields`);
  }
  // And the door accepts a body made of exactly those fields, with values of the types the app sends.
  const w = world();
  const v = { booking_id: BOOKING, photo_id: PHOTO, kind: "after", content_type: "image/png", claimed_bytes: 1000, width: 10, height: 10, caption: "x", keys: [KEY] };
  const body = (action) => ({ action, ...Object.fromEntries(expected[action].map((k) => [k, v[k]])) });
  assert.ok((await w.post(body("start"))).upload_url);
  w.objects.set(`${A}/${BOOKING}/${PHOTO}.png`, 5000);
  assert.equal((await w.post(body("finish"))).photo.kind, "after");
  assert.ok((await w.post(body("urls"))).urls);
  assert.equal((await w.post(body("remove"))).removed, true);
});

test("3 · what the app does with each way the door can say no", async () => {
  const w = world({ budget: { used_bytes: 10 * MB, cap_bytes: 10 * MB } });
  const fail = async (body, over) => { if (over) Object.assign(w, over); try { await w.post(body); } catch (e) { return doorError(e); } assert.fail("expected a refusal"); };
  const start = { action: "start", booking_id: BOOKING, photo_id: PHOTO, kind: "before", content_type: "image/jpeg", claimed_bytes: 300000 };
  // The cap: the door's own sentence, untouched.
  const full = await fail(start);
  assert.equal(full.message, "Photo storage is full: 10.0 MB of 10.0 MB used. Delete old job photos to make room.");
  // The door's own 404s are NOT "not set up".
  w.budget = { used_bytes: 0, cap_bytes: 10 * MB };
  const noBooking = await fail({ ...start, booking_id: "99999999-9999-4999-8999-999999999999" });
  assert.equal(noBooking.message, "Booking not found");
  assert.notEqual(noBooking.message, DOOR_WORDS.missing);
  assert.equal((await fail({ action: "remove", photo_id: PHOTO })).message, "Photo not found");
  // 413, 400s: the sentence as written.
  assert.match((await fail({ ...start, claimed_bytes: 11 * MB })).message, /larger than 10\.0 MB/);
  assert.match((await fail({ ...start, kind: "gallery" })).message, /before, after or damage/);
  // An unreadable budget is the door's 503: the app says the service had a problem.
  w.budget = undefined; w.deps.budget = async () => null;
  assert.equal((await fail(start)).message, DOOR_WORDS.failed);
  // No credentials on the server: the same.
  w.deps.r2 = null;
  assert.equal((await fail(start)).message, DOOR_WORDS.failed);
  // A rate refusal is a sentence, not a status.
  w.deps.withinLimits = async () => false;
  assert.match((await fail(start)).message, /Too many photo requests/);
  // Not signed in.
  w.deps.requireMember = async () => null;
  assert.equal((await fail(start)).message, "Unauthorized");
  // The function not being there at all is what the app calls "not set up".
  const gateway = Object.assign(new Error("Request failed (404)"), { status: 404, body: { code: "NOT_FOUND", message: "Requested function was not found" } });
  assert.equal(doorError(gateway).message, DOOR_WORDS.missing);
});

test("4 · SABOTAGE — drift on the server's side is refused on the app's", async () => {
  const w = world();
  const s = await w.post({ action: "start", booking_id: BOOKING, photo_id: PHOTO, kind: "before", content_type: "image/jpeg", claimed_bytes: 1000 });
  // A key with another extension, another business, another photo; an http URL.
  for (const drift of [{ key: KEY.replace(".jpg", ".png") }, { key: KEY.replace(A, "22222222-2222-4222-8222-222222222222") }, { key: KEY.replace(PHOTO, BOOKING) }, { upload_url: s.upload_url.replace("https:", "http:") }]) {
    assert.throws(() => readStart({ ...s, ...drift }, ctx), (e) => e.message === DOOR_WORDS.unreadable);
  }
  w.objects.set(KEY, 100000);
  const f = await w.post({ action: "finish", booking_id: BOOKING, photo_id: PHOTO, kind: "before" });
  for (const bytes of [0, null, "100000", 0.5]) {
    assert.throws(() => readFinish({ photo: { ...f.photo, bytes } }, { photoId: PHOTO, key: KEY }), (e) => e.message === DOOR_WORDS.unconfirmed);
  }
});
