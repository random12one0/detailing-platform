// ROADMAP 0.11b — THE APP'S BUSINESS-MEDIA HALF RUN AGAINST THE REAL DOOR.
//
//   node --test tests/photo-door-media-wire.test.mjs
//
// Credential-free, no network, no database, no R2, no Deno, no browser.
//
// ---------------------------------------------------------------------------
// WHY THIS SUITE EXISTS: THE TWO HALVES HAD NEVER BEEN RUN AGAINST EACH OTHER
// ---------------------------------------------------------------------------
// `tests/photo-door-media.test.mjs` is the closest thing there was, and it is
// the reason this file is narrow rather than a rewrite. Its § 14, 15 and 16 DO
// run the real `app/src/lib/upload.js` — so "the app is only read, never run"
// is **not** the gap here, the way it was for receipts in 0.11a. The gap is one
// level in: **the door those sections run against is written by hand in the
// test.** `globalThis.__door` returns a literal object the test composes, so
// every claim that the app's request body is a body the real door PARSES, and
// that the real door's answer is one the app ACCEPTS, is still two files read
// side by side.
//
// That seam is where both of 0.11's recorded faults lived, and a person found
// both: a 404 the app read as "not deployed" when it was the door's own
// "Booking not found", and `job_photo_budget()` answering no rows to the
// service role. 0.11a found a third one the hour it ran the real handler.
//
// **SO THE TRANSPORT HERE IS THE REAL HANDLER.** `api.photoDoor` is stubbed to
// serialise the app's body into a `Request`, call `handlePhotoDoor` against an
// in-memory world, and rebuild exactly what `book/core.js`'s `postFunction`
// throws — `new Error(data.error)` carrying `.status` and `.body`, which is all
// three fields the app's refusals key on. **And the public address is the real
// one too**: `mediaUrl` is `r2.ts`'s own `mediaBase` + `publicUrl`, not a
// template string, because criterion 2 of this item is about exactly that
// derivation and a hand-built url cannot test it.
//
// WHAT IT PROVES, against the four acceptance criteria of ROADMAP 0.11b:
//   1 · all three folders — `gallery` (publishing), `branding` (the logo) and
//       `intake` — complete through the door with ZERO Supabase Storage calls.
//   2 · the stored url is `R2_MEDIA_BASE` + the key, derived by `r2.ts`, and an
//       absent base is a sentence rather than an upload nobody can read back.
//   3 · the key is minted from the MEMBER's business: the body cannot steer it,
//       another business's key is refused before the PUT, and `remove` on one
//       is a 404 that leaves the object alone.
//   4 · the door path never touches `supabase.storage`, in a run rather than in
//       a regex.
//
// **WHAT IT STILL CANNOT PROVE, SAID PLAINLY:** that R2 accepts these
// signatures, that Cloudflare serves the PUT, that a public base exists at all
// (nobody has bound one — `FOR-ANDREW.md` step 9), that the TypeScript compiles
// (node only strips types), or anything in a browser. `MEDIA_VIA_DOOR` is
// `false` and `photo-door` has never been deployed, so there is no live path to
// press. That is 0.11d's and Andrew's.
//
// BREAK IT ON PURPOSE: § 9 rebuilds `upload.js` and `photo-door.js` with ONE
// guard removed at a time, each edit asserted to have LANDED before the colour
// is believed (`docs/gotchas.md` 102), and asserts the matching probe goes from
// refused to allowed.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as door from "../supabase/functions/_shared/photoDoor.ts";
import { mediaBase, publicUrl } from "../supabase/functions/_shared/r2.ts";
import { mediaPath, MEDIA_FOLDERS } from "../app/src/lib/photo-rules.js";
import { DOOR_WORDS } from "../app/src/lib/photo-door.js";

const MB = 1024 * 1024;
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const FILE_B = "99999999-9999-4999-8999-999999999999";

const SRC = "app/src/lib/upload.js";
const BUCKET = "business-media";
const appLib = (n) => JSON.stringify(pathToFileURL(path.resolve(`app/src/lib/${n}`)).href);

// THE PUBLIC BASE, THROUGH `r2.ts`'s OWN READER. The trailing slash is there on
// purpose: `mediaBase` trims it, and a url built by hand in this test would not
// have exercised that. `BASE` below is therefore what the real function returns,
// never a string this file chose.
const RAW_BASE = "https://img.detailing.test/media/";
const { base: BASE, missing: NO_BASE } = mediaBase(() => RAW_BASE);
assert.equal(NO_BASE.length, 0, "r2.ts's mediaBase refused a perfectly good https base");
assert.equal(BASE, "https://img.detailing.test/media", "mediaBase stopped trimming the trailing slash");

/** A stand-in for a picked file: a real Blob with the `name` a File has. */
const picked = (name, type, size) =>
  Object.assign(new Blob([new Uint8Array(size)], { type }), { name });

// ---------------------------------------------------------------------------
// THE WORLD. The door's deps are `tests/photo-door-media.test.mjs`'s, kept
// deliberately close to them so a change on that side shows up on this one.
// ---------------------------------------------------------------------------
function world(over = {}) {
  const w = {
    objects: new Map(),
    doorCalls: [], puts: [], sbCalls: [], logs: [],
    token: "owner-a",
    /** `null` means no public address is configured at all. */
    base: BASE,
    tamperStart: null, tamperRemove: null, doorThrows: null, claimAs: null,
    sbUploadError: null,
    ...over,
  };

  const members = {
    "owner-a": { userId: "u-owner-a", businessId: A, role: "owner", permissions: [] },
    "staff-a": { userId: "u-staff-a", businessId: A, role: "staff", permissions: ["requests"] },
    "owner-b": { userId: "u-owner-b", businessId: B, role: "owner", permissions: [] },
  };
  // `exactBytes` is recorded because it is the ONLY server-side ceiling this
  // store has: there is no `finish` to measure the real object at, so the
  // length signed into the URL is the whole guard (`_shared/photoDoor.ts`).
  const r2 = {
    putUrl: async (bucket, key, type, expires, exactBytes) => {
      w.signed = { bucket, key, type, expires, exactBytes };
      return `https://r2.test/${bucket}/${key}?put&len=${exactBytes}`;
    },
    getUrl: async (bucket, key) => `https://r2.test/${bucket}/${key}?get`,
    head: async (_b, key) => {
      const o = w.objects.get(key);
      return o ? { exists: true, bytes: o.bytes } : { exists: false, bytes: null };
    },
    del: async (_b, key) => { w.objects.delete(key); },
  };
  const deps = {
    requireMember: async (req, biz) => {
      const t = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      const m = members[t];
      return m && m.businessId === biz ? m : null;
    },
    can: (m, p) => m.role === "owner" || m.permissions.includes(p),
    withinLimits: async () => true,
    limit: { windowSeconds: 3600, limit: 600 },
    bookingBelongs: async () => false,
    budget: async () => ({ used_bytes: 1000, cap_bytes: 10 * MB }),
    getPhoto: async () => null,
    insertPhoto: async (row) => row,
    deletePhoto: async () => {},
    // THE REAL DERIVATION, exactly as `photo-door/index.ts` wires it:
    //   mediaUrl: base ? (key) => publicUrl(base, key) : undefined
    // `undefined` rather than a function returning null, because that is the
    // branch the function itself takes when `R2_MEDIA_BASE` is absent.
    ...(w.base ? { mediaUrl: (key) => publicUrl(w.base, key) } : {}),
    r2, log: (...a) => w.logs.push(a.map(String).join(" ")),
  };

  // ── THE TRANSPORT: `postFunction`'s contract, over the real handler ──────
  // Everything the app's error handling keys on travels: the status, the
  // server's own sentence as the Error's message, and the whole body. That is
  // what `app/src/book/core.js`'s `postFunction` builds, copied here because
  // the app half's refusals are read off exactly those three fields.
  globalThis.__door = async (businessId, body) => {
    const sent = { business_id: businessId, ...body };
    w.doorCalls.push(sent);
    if (w.doorThrows) throw w.doorThrows;
    // The one thing a real client could lie about. § 4 is what happens when it
    // does, and it is the reason the length is signed in rather than trusted.
    const onWire = (sent.action === "start" && w.claimAs !== null)
      ? { ...sent, claimed_bytes: w.claimAs } : sent;
    const res = await door.handlePhotoDoor(new Request("http://x.test/functions/v1/photo-door", {
      method: "POST",
      headers: { Authorization: `Bearer ${w.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(onWire),
    }), deps);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(data?.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.body = data ?? null;
      throw err;
    }
    if (sent.action === "start" && w.tamperStart) return w.tamperStart(data);
    if (sent.action === "remove" && w.tamperRemove) return w.tamperRemove(data);
    return data;
  };

  // THE PUT. The object is recorded under the key the signed URL names, so
  // `remove` later has something real to delete and § 7 can show B's object
  // surviving A's attempt on it.
  globalThis.fetch = async (url, init) => {
    const u = new URL(url);
    const key = decodeURIComponent(u.pathname.replace(`/${BUCKET}/`, "").replace(/^\//, ""));
    w.puts.push({
      url: String(url), method: init?.method,
      type: init?.headers?.["Content-Type"], bytes: init?.body?.size, key,
    });
    w.objects.set(key, { bytes: init?.body?.size ?? 0 });
    return new Response("", { status: 200 });
  };

  // ── THE OLD PATH's Supabase client, recorded the same way ───────────────
  // It is here so that "zero bucket calls" is a count of a client that WOULD
  // have answered, not of one that would have thrown. A stub that cannot
  // succeed makes the assertion vacuous.
  globalThis.__supabase = {
    storage: {
      from: (bucket) => ({
        upload: async (key, blob, opts) => {
          w.sbCalls.push({ bucket, key, type: opts?.contentType, upsert: opts?.upsert, bytes: blob.size });
          if (!w.sbUploadError) w.objects.set(key, { bytes: blob.size });
          return { error: w.sbUploadError };
        },
        getPublicUrl: (key) => ({ data: { publicUrl: `https://sb.test/object/public/${bucket}/${key}` } }),
        remove: async (list) => {
          w.sbCalls.push({ bucket, removed: list });
          for (const k of list) w.objects.delete(k);
          return { error: null };
        },
      }),
    },
  };
  return w;
}

/**
 * `upload.js` imports the Supabase client, `api.js`, `photo-rules.js` and
 * `photo-door.js`, so it cannot be imported here directly. It is copied to a
 * temp directory beside four stub siblings with **its own text untouched** (or,
 * in § 9, with one named guard removed), which is the arrangement every door
 * suite uses: the thing under test is the real file.
 *
 * The stubs are the only fiction, and neither stands in for a rule: `api.js` is
 * the transport above and `supabase.js` is the old path's client. `photo-rules.js`
 * and `photo-door.js` are the REAL modules, re-exported, with only the flag
 * overridden — so the key rules, the readers and the sentences are production's.
 */
async function loadUpload({ flagOn = true, edits = [], doorEdits = [] } = {}) {
  const d = mkdtempSync(path.join(tmpdir(), "media-wire-"));
  let src = readFileSync(SRC, "utf8").replace(/\r\n/g, "\n");
  for (const [from, to] of edits) {
    assert.equal(src.split(from).length - 1, 1,
      `the text to sabotage is not unique or not there in ${SRC}: ${from.slice(0, 70)}`);
    src = src.replace(from, to);
  }
  writeFileSync(path.join(d, "upload.js"), src);

  if (doorEdits.length) {
    // The door reader is sabotaged by rebuilding `photo-door.js` itself, so the
    // guard removed is the one production runs — not a copy of it in this file.
    let ds = readFileSync("app/src/lib/photo-door.js", "utf8").replace(/\r\n/g, "\n");
    for (const [from, to] of doorEdits) {
      assert.equal(ds.split(from).length - 1, 1,
        `the text to sabotage is not unique or not there in photo-door.js: ${from.slice(0, 70)}`);
      ds = ds.replace(from, to);
    }
    ds = ds.replace('"./photo-rules.js"', appLib("photo-rules.js"))
      .replace(/export const MEDIA_VIA_DOOR = (true|false);/, `export const MEDIA_VIA_DOOR = ${flagOn};`);
    assert.match(ds, new RegExp(`MEDIA_VIA_DOOR = ${flagOn};`), "the flag override did not land");
    writeFileSync(path.join(d, "photo-door.js"), ds);
  } else {
    writeFileSync(path.join(d, "photo-door.js"),
      `export * from ${appLib("photo-door.js")};\nexport const MEDIA_VIA_DOOR = ${flagOn};`);
  }
  writeFileSync(path.join(d, "photo-rules.js"), `export * from ${appLib("photo-rules.js")};`);
  writeFileSync(path.join(d, "api.js"), "export const api = { photoDoor: (b, body) => globalThis.__door(b, body) };");
  writeFileSync(path.join(d, "supabase.js"), "export const supabase = globalThis.__supabase;");
  return import(pathToFileURL(path.join(d, "upload.js")).href);
}

/** The key the door minted, read off the PUT rather than guessed. */
const mintedKey = (w) => w.puts[0]?.key;

// ---------------------------------------------------------------------------
// § 1 — ALL THREE FOLDERS, END TO END, THROUGH THE REAL DOOR
// ---------------------------------------------------------------------------
// Criterion 1 names three flows — *gallery publishing, logo uploads and
// intake-photo uploads* — and they are three FOLDERS through one function.
// `tests/photo-door-media.test.mjs` § 14 and 15 press `branding` and `gallery`;
// `intake` has never been pressed by anything, and it is the one `SiteIntake.jsx`
// calls. The count is declared so a folder added without a probe is a failure
// rather than a silent omission.
test("1 · gallery, branding and intake each complete through the real door, with no bucket call", async () => {
  assert.equal(MEDIA_FOLDERS.length, 3,
    `MEDIA_FOLDERS is now ${MEDIA_FOLDERS.join(", ")} — add the new folder to this suite rather than widening the count`);

  for (const folder of MEDIA_FOLDERS) {
    const w = world();
    const up = await loadUpload();
    const out = await up.uploadBusinessPhoto(A, picked("car.JPG", "image/jpeg", 4096), folder);

    const start = w.doorCalls.filter((c) => c.action === "start");
    assert.equal(start.length, 1, `${folder}: ${start.length} start calls`);
    assert.equal(start[0].store, "media", `${folder}: the store field is not "media"`);
    assert.equal(start[0].folder, folder);
    assert.equal(start[0].claimed_bytes, 4096, `${folder}: the declared size is not the blob's`);
    // The browser sends no path at all: the server mints it. A path built in
    // the browser is the one thing the isolation cannot check.
    assert.ok(start[0].key === undefined && start[0].path === undefined,
      `${folder}: the browser sent a path`);

    assert.equal(w.puts.length, 1, `${folder}: ${w.puts.length} PUTs`);
    assert.equal(w.puts[0].method, "PUT");
    assert.equal(w.puts[0].type, "image/jpeg", `${folder}: the PUT's type differs from the one signed for`);
    assert.equal(w.puts[0].bytes, 4096);
    assert.equal(w.signed.bucket, BUCKET, `${folder}: signed for ${w.signed.bucket}`);
    assert.equal(w.signed.exactBytes, 4096,
      `${folder}: the length was not signed in, so R2 would accept a body of any size and the 10 MB ceiling is gone`);

    // THE KEY THE DOOR MINTED, held against the app's own `mediaPath` for the
    // same inputs. Both are called; neither is restated.
    assert.equal(out.key, mediaPath({ businessId: A, folder, id: start[0].file_id, type: "image/jpeg" }),
      `${folder}: the key the door minted is not the one the app would mint`);
    assert.equal(out.key, mintedKey(w), `${folder}: the key returned is not the object that was PUT`);
    assert.equal(out.url, `${BASE}/${out.key}`, `${folder}: ${out.url}`);

    assert.deepEqual(w.sbCalls, [],
      `${folder}: the door path talked to Supabase Storage — a second door is how a cap stops meaning anything`);
  }
});

// ---------------------------------------------------------------------------
// § 2 — THE URL IS DERIVED, NOT COMPOSED
// ---------------------------------------------------------------------------
// Criterion 2: *public media URLs are derived from the configured public R2
// address and remain usable by unauthenticated visitors.* The second half is
// 0.11d's — nothing here can fetch anything. The first half is this: the url
// the app RETURNS, which is the url that gets written into `gallery_images.image_url`
// and the brand's `logo_url` permanently, is `r2.ts`'s `publicUrl(base, key)`
// for the key that was actually uploaded, and nothing else.
test("2 · the stored url is r2.ts's own publicUrl for the key that was uploaded", async () => {
  const w = world();
  const up = await loadUpload();
  const out = await up.uploadBusinessPhoto(A, picked("logo.png", "image/png", 2048), "branding");

  assert.equal(out.url, publicUrl(BASE, out.key),
    "the url the app stores is not the one r2.ts derives for that key");
  assert.match(out.url, /^https:\/\//, "a stored image url that is not https is blocked as mixed content");
  assert.ok(out.url.startsWith(`${BASE}/`), `${out.url} does not come from the configured base`);
  assert.ok(out.url.endsWith(`/${out.key}`), `${out.url} does not end in the key that was uploaded`);
  assert.ok(!out.url.includes("supabase") && !out.url.includes("sb.test"),
    `the url still points at Supabase Storage: ${out.url}`);
  assert.equal(w.puts.length, 1);
});

// ---------------------------------------------------------------------------
// § 3 — NO PUBLIC ADDRESS IS A SENTENCE, NOT AN UPLOAD
// ---------------------------------------------------------------------------
// This is the live state today: nobody has bound a public address in Cloudflare
// (`FOR-ANDREW.md` step 9), so if the flag were flipped first this is the branch
// every logo upload would take. It must say so and write nothing — an object in
// a bucket with no public address is a logo nobody can ever see, and the row
// would have been written with whatever url came back.
test("3 · an unconfigured public address refuses in words, and nothing is uploaded", async () => {
  const w = world({ base: null });
  const up = await loadUpload();
  await assert.rejects(
    up.uploadBusinessPhoto(A, picked("logo.png", "image/png", 2048), "branding"),
    /Public image storage is not set up on the server yet\./,
  );
  assert.equal(w.puts.length, 1 - 1, "a file was uploaded with nowhere to read it from");
  assert.deepEqual(w.sbCalls, [], "it fell back to Supabase Storage when the door had no address");
  // AND IT IS THE SERVER'S OWN SENTENCE, not one of the app's generic three.
  // A 503 used to be flattened to "The photo service had a problem. Try again
  // in a minute." — 0.11a's fault — which sends a detailer round that loop for
  // ever over a thing only Andrew can fix.
  for (const generic of [DOOR_WORDS.failed, DOOR_WORDS.missing, DOOR_WORDS.unreachable]) {
    await assert.rejects(
      up.uploadBusinessPhoto(A, picked("logo.png", "image/png", 2048), "branding"),
      (e) => e.message !== generic,
      `the configuration sentence was flattened to "${generic}"`,
    );
  }
});

// ---------------------------------------------------------------------------
// § 4 — THE CEILING AND THE CLAIM
// ---------------------------------------------------------------------------
test("4 · over the per-file ceiling is refused in the server's words, and a lie about the size is bound by the signature", async () => {
  const over = world();
  const up = await loadUpload();
  await assert.rejects(
    up.uploadBusinessPhoto(A, picked("huge.jpg", "image/jpeg", 10 * MB + 1), "gallery"),
    /larger than 10\.0 MB/,
  );
  assert.equal(over.puts.length, 0, "an over-size file was uploaded anyway");

  // A CLIENT THAT UNDER-CLAIMS DOES NOT GET A FREE PASS, and this store has no
  // `finish` to catch it at. What catches it is the length signed into the URL:
  // the door signs what it was TOLD, so a body of any other size fails at R2.
  // The probe is the signature, because nothing else here can see it.
  const lying = world({ claimAs: 10 });
  const up2 = await loadUpload();
  await up2.uploadBusinessPhoto(A, picked("car.jpg", "image/jpeg", 4096), "gallery");
  assert.equal(lying.signed.exactBytes, 10,
    "the door signed a length other than the one it was told, so an under-claim would be unenforceable");
  assert.equal(lying.puts[0].bytes, 4096,
    "the body PUT is not the file's real size, so this probe is not the mismatch it claims to be");
  assert.notEqual(lying.signed.exactBytes, lying.puts[0].bytes,
    "the lie did not produce a mismatch, so R2 would have accepted it");
});

// ---------------------------------------------------------------------------
// § 5 — A TYPE THE BUCKET REFUSES NEVER REACHES THE DOOR
// ---------------------------------------------------------------------------
// Said before anything is sent, because the file is on the person's phone and
// they can pick another one. The sentence names the five that work.
test("5 · an unsupported image type is refused before a door call is spent", async () => {
  const w = world();
  const up = await loadUpload();
  await assert.rejects(
    up.uploadBusinessPhoto(A, picked("IMG_0001.HEIC", "image/heic", 2048), "gallery"),
    new RegExp(DOOR_WORDS.badImageType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.equal(w.doorCalls.length, 0, "a type the bucket refuses still spent a door call");
  assert.equal(w.puts.length, 0);

  // AND THE DOOR AGREES ABOUT THE FIVE IT DOES TAKE — sent for real, not read.
  for (const [type, ext] of [["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"],
    ["image/gif", "gif"], ["image/avif", "avif"]]) {
    const each = world();
    const u = await loadUpload();
    const out = await u.uploadBusinessPhoto(A, picked(`x.${ext}`, type, 1024), "gallery");
    assert.ok(out.key.endsWith(`.${ext}`), `${type} was stored as ${out.key}`);
    assert.equal(each.puts.length, 1, `${type} did not complete`);
  }
});

// ---------------------------------------------------------------------------
// § 6 — THE ISOLATION: THE BODY CANNOT STEER THE KEY
// ---------------------------------------------------------------------------
// Criterion 3: *all business-media keys are minted and authorized for the
// caller's business.* The first folder of the key is the only thing standing in
// for a row's `business_id` here, and it is minted from `member.businessId`.
test("6 · a business the caller is not a member of is refused, and a tampered key is refused before the PUT", async () => {
  // A's session asking for B's business. The door's own 401, in its own word.
  const cross = world({ token: "owner-a" });
  const up = await loadUpload();
  await assert.rejects(up.uploadBusinessPhoto(B, picked("car.jpg", "image/jpeg", 1024), "gallery"), /Unauthorized/);
  assert.equal(cross.puts.length, 0, "a file was uploaded into a business the caller is not a member of");

  // A door answer naming ANOTHER business's key is refused by the app before it
  // PUTs, which is what stops a confused or hostile answer writing into B.
  const tampered = world({
    tamperStart: (d) => ({ ...d, key: `${B}/gallery/${FILE_B}.jpg`, upload_url: `https://r2.test/${BUCKET}/${B}/gallery/${FILE_B}.jpg?put` }),
  });
  const up2 = await loadUpload();
  await assert.rejects(up2.uploadBusinessPhoto(A, picked("car.jpg", "image/jpeg", 1024), "gallery"),
    /photo service sent back something/);
  assert.equal(tampered.puts.length, 0, "the browser PUT to a key it never asked for");

  // AND THE PUBLIC URL IS BOUND TO THAT KEY TOO. It is a separate field and it
  // is the one that gets WRITTEN TO A ROW — `gallery_images.image_url`, the
  // brand's `logo_url` — so a correct key with somebody else's url stores the
  // wrong image permanently, and the key check beside it would not have seen it.
  const wrongUrl = world({
    tamperStart: (d) => ({ ...d, public_url: `${BASE}/${B}/gallery/${FILE_B}.jpg` }),
  });
  const up3 = await loadUpload();
  await assert.rejects(up3.uploadBusinessPhoto(A, picked("car.jpg", "image/jpeg", 1024), "gallery"),
    /photo service sent back something/,
    "a public_url naming another business's object was accepted and would have been stored in a row");
  assert.equal(wrongUrl.puts.length, 0);

  // **AND WHAT THE BROWSER CANNOT CHECK IS SAID RATHER THAN LEFT AS A GAP.** A
  // url for the right object on a DIFFERENT HOST — `https://evil.test/<key>` —
  // is accepted here and always will be: the base is server-side configuration
  // (`R2_MEDIA_BASE`) and the page has never seen it, so there is nothing to
  // compare against. That half is the server's, and § 2 is where it is checked:
  // the door's answer is `r2.ts`'s `publicUrl(base, key)` for the configured
  // base, computed by the real function. Recorded as a division of labour, not
  // as a missing probe.
  const offHost = world({
    tamperStart: (d) => ({ ...d, public_url: `https://other.test/${d.key}` }),
  });
  const up4 = await loadUpload();
  const stored = await up4.uploadBusinessPhoto(A, picked("car.jpg", "image/jpeg", 1024), "gallery");
  assert.equal(stored.url, `https://other.test/${stored.key}`,
    "the host half of the url is now checked in the browser — if that is deliberate, this note is stale");
  assert.equal(offHost.puts.length, 1);
});

// ---------------------------------------------------------------------------
// § 7 — REMOVE IS BY KEY, AND THE KEY IS THE WHOLE GUARD
// ---------------------------------------------------------------------------
test("7 · remove takes the caller's own object and 404s another business's, leaving it alone", async () => {
  const w = world();
  const up = await loadUpload();
  const out = await up.uploadBusinessPhoto(A, picked("car.jpg", "image/jpeg", 1024), "gallery");
  assert.ok(w.objects.has(out.key), "the upload did not record an object to remove");

  // B's object, put there by B, so there is something real for A to fail at.
  const bKey = `${B}/gallery/${FILE_B}.jpg`;
  w.objects.set(bKey, { bytes: 77 });

  await assert.rejects(up.removeBusinessPhoto(A, bKey), /Image not found/);
  assert.equal(w.objects.get(bKey)?.bytes, 77, "another business's object was deleted");

  // A key of a shape this product does not mint is the same 404, so a prober
  // learns nothing from the difference.
  await assert.rejects(up.removeBusinessPhoto(A, `${A}/gallery/../../${B}/gallery/x.jpg`), /Image not found/);
  await assert.rejects(up.removeBusinessPhoto(A, `${A}/secrets/${FILE_B}.jpg`), /Image not found/);

  // Its own object goes.
  await up.removeBusinessPhoto(A, out.key);
  assert.equal(w.objects.has(out.key), false, "remove answered success without deleting the object");
  assert.deepEqual(w.sbCalls, [], "remove went to the Supabase bucket on the door path");
});

// ---------------------------------------------------------------------------
// § 8 — `settings` ON BOTH ACTIONS
// ---------------------------------------------------------------------------
// The other two stores let any member add and need `settings` only to remove.
// `20260904001000_catalog_behind_settings.sql` replaced this bucket's three
// write policies so insert, update AND delete all require it, and the service
// role bypasses the policy that says so — the door states it again or it is gone.
test("8 · a member without the settings permission is refused on both actions, in the server's words", async () => {
  const w = world({ token: "staff-a" });
  const up = await loadUpload();
  await assert.rejects(
    up.uploadBusinessPhoto(A, picked("car.jpg", "image/jpeg", 1024), "gallery"),
    /needs the settings permission/,
  );
  assert.equal(w.puts.length, 0, "a staff member without settings uploaded a business image");
  await assert.rejects(up.removeBusinessPhoto(A, `${A}/gallery/${FILE_B}.jpg`), /needs the settings permission/);
  assert.deepEqual(w.sbCalls, [], "a refused write fell through to Supabase Storage");
});

// ---------------------------------------------------------------------------
// § 9 — FLAG OFF IS UNCHANGED, AND THERE IS NO SECOND WAY IN
// ---------------------------------------------------------------------------
// Criterion 4: *tests prove there is no remaining Supabase Storage upload
// fallback for these media flows.* § 1, 2, 7 and 8 count the bucket calls on
// the door path at zero in a RUN. This is the other half of the same claim: the
// flag chooses one path, and a door that is down does not reopen the other one.
test("9 · the flag chooses one path; a door that fails does not reopen the bucket", async () => {
  const off = world();
  const old = await loadUpload({ flagOn: false });
  const out = await old.uploadBusinessPhoto(A, picked("Logo Final.PNG", "image/png", 2048), "branding");
  assert.equal(off.doorCalls.length, 0, "the old path called the photo door");
  assert.equal(off.puts.length, 0, "the old path made an HTTP request of its own");
  const up = off.sbCalls.find((c) => c.bucket);
  assert.equal(up.bucket, BUCKET);
  assert.equal(up.upsert, false, "upsert was turned on, which lets one upload overwrite another");
  assert.equal(out.url, `https://sb.test/object/public/${BUCKET}/${out.key}`);

  // A DOWN DOOR FAILS IN WORDS WITH NOTHING WRITTEN ANYWHERE. A gateway 404 for
  // a function that does not exist carries no CORS headers, so the browser
  // blocks it and the page sees a TypeError rather than a status.
  const down = world({ doorThrows: new TypeError("Failed to fetch") });
  const on = await loadUpload();
  await assert.rejects(on.uploadBusinessPhoto(A, picked("car.jpg", "image/jpeg", 1024), "gallery"),
    /Could not reach the photo service/);
  assert.deepEqual(down.sbCalls, [], "a failed door call fell back to Supabase Storage");
  assert.equal(down.puts.length, 0);

  const downRemove = world({ doorThrows: new TypeError("Failed to fetch") });
  const on2 = await loadUpload();
  await assert.rejects(on2.removeBusinessPhoto(A, `${A}/gallery/${FILE_B}.jpg`), /Could not reach the photo service/);
  assert.deepEqual(downRemove.sbCalls, [], "a failed remove fell back to the Supabase bucket");
});

// ---------------------------------------------------------------------------
// § 10 — BREAK IT ON PURPOSE
// ---------------------------------------------------------------------------
// Each sabotage is ONE string edit on the REAL text of `upload.js` or
// `photo-door.js`, and `loadUpload` asserts the edit was unique and landed
// before anything runs — `docs/gotchas.md` 102: a scripted edit that silently
// matches nothing produces the same green as a caught sabotage.
//
// The control runs first, so a probe that can never pass cannot be mistaken for
// a caught one.
//
// **AND EACH SABOTAGE DECLARES WHAT BECOMES OBSERVABLE, NOT MERELY THAT THE
// COLOUR CHANGED.** The first version of this section asserted only that the
// sabotaged probe REJECTED, and five of six passed that way while testing
// nothing: removing the image-type gate, for instance, still ends in a
// rejection — the door's own *"A business image must be …"* instead of the
// app's — so a reject/reject comparison sees no difference at all. `broken()`
// below names the thing the guard was there to prevent: the PUT that now goes
// to another business's key, the url that now gets stored, the door call that
// is now spent. `docs/gotchas.md` 95.
const SABOTAGES = [
  {
    label: "the key check",
    doorEdits: [["|| typeof resp.key !== \"string\" || resp.key !== want", "|| typeof resp.key !== \"string\""]],
    async probe(up) {
      return up.uploadBusinessPhoto(A, picked("car.jpg", "image/jpeg", 1024), "gallery");
    },
    // THE WHOLE ANSWER MOVES TO B, url and upload target included. Moving only
    // the `key` is caught by the public-url binding instead, and the sabotage
    // then proves that guard rather than this one — which is how the first run
    // of this probe reported "nothing observable".
    world: () => world({
      tamperStart: () => ({
        key: `${B}/gallery/${FILE_B}.jpg`,
        upload_url: `https://r2.test/${BUCKET}/${B}/gallery/${FILE_B}.jpg?put`,
        public_url: `${BASE}/${B}/gallery/${FILE_B}.jpg`,
        expires_in: 600,
      }),
    }),
    // THE PUT NOW GOES INTO B. That is the fault, and a rejection somewhere
    // later would hide it.
    broken: (w) => {
      assert.equal(w.puts.length, 1, "no PUT was made, so the guard removal changed nothing observable");
      assert.ok(w.puts[0].key.startsWith(`${B}/`), `the PUT went to ${w.puts[0].key}`);
    },
  },
  {
    label: "the public-url binding",
    doorEdits: [["\n    || !resp.public_url.endsWith(`/${out.key}`)", ""]],
    async probe(up) {
      return up.uploadBusinessPhoto(A, picked("car.jpg", "image/jpeg", 1024), "gallery");
    },
    world: () => world({
      tamperStart: (d) => ({ ...d, public_url: `${BASE}/${B}/gallery/${FILE_B}.jpg` }),
    }),
    // THE URL THAT GETS WRITTEN TO A ROW NOW NAMES B's OBJECT.
    broken: (w, out) => {
      assert.ok(out.url.includes(`/${B}/`), `the stored url is ${out.url}`);
      assert.ok(!out.url.endsWith(`/${out.key}`), "the url still names the uploaded object");
    },
  },
  {
    label: "the image-type gate",
    edits: [["if (!mediaExtForType(type)) throw new Error(DOOR_WORDS.badImageType);", ""]],
    async probe(up) {
      await up.uploadBusinessPhoto(A, picked("x.heic", "image/heic", 1024), "gallery");
    },
    world: () => world(),
    // A DOOR CALL IS NOW SPENT on a type the bucket will never take — and the
    // detailer gets the server's wording instead of the sentence naming the
    // five that work. The probe still rejects either way, which is exactly why
    // this is asserted on the call count and the message rather than on colour.
    broken: (w, _out, err) => {
      assert.equal(w.doorCalls.length, 1, "no door call was spent, so the gate is still refusing");
      assert.notEqual(err?.message, DOOR_WORDS.badImageType, "the app's own sentence is still being thrown");
      assert.match(String(err?.message), /A business image must be/);
    },
  },
  {
    label: "the failed-PUT check",
    edits: [["if (!put.ok) throw new Error(DOOR_WORDS.putFailed);", ""]],
    async probe(up) {
      return up.uploadBusinessPhoto(A, picked("car.jpg", "image/jpeg", 1024), "gallery");
    },
    world: () => {
      const w = world();
      globalThis.fetch = async () => new Response("no", { status: 500 });
      return w;
    },
    // A FAILED UPLOAD NOW REPORTS SUCCESS, and the url it hands back would be
    // written into a row pointing at an object that is not there.
    broken: (_w, out) => {
      assert.equal(typeof out?.url, "string", "nothing was returned, so the check is still refusing");
      assert.ok(out.url.startsWith(`${BASE}/`), out.url);
    },
  },
  {
    // THE SECOND DOOR, which is the one fault this design forbids by name. With
    // the branch gone, `remove` goes to the Supabase bucket — where Postgres,
    // not `photoKey.ts`, decides whose object it is, and this stub answers
    // success for anybody's.
    label: "remove falling through to the bucket",
    edits: [['  if (MEDIA_VIA_DOOR) {\n    const resp = await door(businessId, { action: "remove", store: "media", key });',
      "  if (false) {\n    const resp = null;"]],
    async probe(up) {
      await up.removeBusinessPhoto(A, `${B}/gallery/${FILE_B}.jpg`);
    },
    world: () => world(),
    // THE BUCKET IS REACHED, with another business's key, and it answers yes.
    broken: (w) => {
      assert.equal(w.doorCalls.length, 0, "the door was still called, so the branch is still in place");
      assert.deepEqual(w.sbCalls, [{ bucket: BUCKET, removed: [`${B}/gallery/${FILE_B}.jpg`] }]);
    },
  },
  {
    // An answer that is not a removal must not be treated as one: a caller that
    // believes a delete happened stops counting bytes that are still there.
    label: "the removal confirmation",
    edits: [["    if (resp?.removed !== true) throw new Error(DOOR_WORDS.unreadable);", ""]],
    async probe(up) {
      await up.removeBusinessPhoto(A, `${A}/gallery/${FILE_B}.jpg`);
    },
    world: () => world({ tamperRemove: () => ({ removed: "yes" }) }),
    // AN ANSWER THAT IS NOT A REMOVAL IS TREATED AS ONE: the caller returns
    // normally and stops counting bytes that are still there.
    broken: (w) => {
      assert.equal(w.doorCalls.filter((c) => c.action === "remove").length, 1);
    },
  },
];

test("10 · SABOTAGE — each guard removed is seen (control first)", async () => {
  for (const s of SABOTAGES) {
    s.world();
    const clean = await loadUpload();
    await assert.rejects(() => s.probe(clean), `${s.label}: the CONTROL did not refuse, so this probe tests nothing`);
  }
  for (const s of SABOTAGES) {
    const w = s.world();
    const broken = await loadUpload({ edits: s.edits ?? [], doorEdits: s.doorEdits ?? [] });
    let out = null;
    let err = null;
    try { out = await s.probe(broken); } catch (e) { err = e; }
    // `broken()` throws its own named assertion if the guard's absence left
    // nothing to see — which is the only way a sabotage can lie.
    s.broken(w, out, err);
  }
});

// ---------------------------------------------------------------------------
// § 11 — THE DECLARED POPULATION
// ---------------------------------------------------------------------------
// A check that found zero targets is a failure. These are counts, not floors:
// a guard that disappears must redden rather than shrink the population
// silently (`docs/gotchas.md` 98).
test("11 · the suite's own population", () => {
  assert.equal(SABOTAGES.length, 6, "a sabotage was added or removed without updating this count");
  const src = readFileSync(SRC, "utf8");
  assert.equal((src.match(/MEDIA_VIA_DOOR/g) || []).length, 4,
    "the flag is branched on somewhere unexpected in upload.js — it is the header comment, the import and one branch each in upload and remove");
  assert.equal(/catch[\s\S]{0,120}supabase\.storage/.test(src), false,
    "upload.js falls back to Supabase Storage when the door fails");
  // The three call sites criterion 1 names, by folder, read off `app/src`.
  const sites = ["more/BusinessInfo.jsx", "more/Gallery.jsx", "../screens/SiteIntake.jsx"];
  const seen = new Set();
  for (const f of ["app/src/screens/more/BusinessInfo.jsx", "app/src/screens/more/Gallery.jsx", "app/src/screens/SiteIntake.jsx"]) {
    const t = readFileSync(f, "utf8");
    assert.match(t, /uploadBusinessPhoto\(/, `${f} no longer uploads through uploadBusinessPhoto`);
    assert.equal(/supabase\.storage/.test(t), false, `${f} talks to Supabase Storage directly, bypassing the flag`);
    seen.add(f);
  }
  assert.equal(seen.size, sites.length, "the three media call sites changed shape");
});
