// ROADMAP 0.11a — THE APP'S RECEIPT HALF RUN AGAINST THE REAL DOOR, IN MEMORY.
//
//   node --test tests/photo-door-receipt-wire.test.mjs
//
// Credential-free, no network, no database, no R2, no Deno, no browser.
//
// ---------------------------------------------------------------------------
// WHY THIS SUITE EXISTS: THE TWO HALVES HAD NEVER BEEN RUN AGAINST EACH OTHER
// ---------------------------------------------------------------------------
// `tests/photo-door-receipts.test.mjs` drives the SERVER (`_shared/photoDoor.ts`,
// 13 pass, 8 sabotages) and never sees `app/src`. `tests/photo-door.test.mjs`
// drives the app's READERS (`photo-door.js`) against answers written by hand in
// the test. **Nothing anywhere ran `app/src/lib/receipts.js`** — measured
// 2026-10-09: `grep -rn "receipts.js|addReceipt|removeReceipt|signedReceiptUrl"
// tests/ scripts/ --include=*.mjs` returns nothing outside this file. So every
// claim that the app's request bodies match the bodies the door parses, and that
// the door's sentences survive the app's error handling, was a reading of two
// files side by side.
//
// 0.11's own history says what that costs. Two of the faults it records are
// exactly this seam and both were found by a person, not a test: a 404 the app
// read as "the function is not deployed" when it was the door's own "Booking not
// found", and `job_photo_budget()` answering NO ROWS to the service role, which
// a door reading that as "no limit" would have made unlimited on day one.
//
// **SO THE TRANSPORT HERE IS THE REAL HANDLER.** `api.photoDoor` is stubbed to
// serialise the app's body into a `Request`, call `handlePhotoDoor` with an
// in-memory world, and turn the `Response` back into exactly what
// `book/core.js`'s `postFunction` throws — `new Error(data.error)` carrying
// `.status` and `.body`. Nothing between the two halves is described; it is run.
//
// **WHAT IT STILL CANNOT PROVE, SAID PLAINLY:** that R2 accepts these
// signatures, that Cloudflare serves the PUT, that the `expenses` update lands
// against the real database, that the TypeScript compiles (node only strips
// types), or anything in a browser. The first real PUT is that proof and the
// publish is Andrew's. What it does prove is that the wire shape, the key check,
// the authoritative size, the two ceilings, replacement, deletion and every
// refusal sentence agree when the two files actually talk.
//
// BREAK IT ON PURPOSE: § 10 rebuilds `receipts.js` with ONE guard removed at a
// time — six of them, each one string edit, each edit asserted to have LANDED
// before the colour is believed (`docs/gotchas.md` 102) — and asserts the
// matching probe goes from refused to allowed.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as door from "../supabase/functions/_shared/photoDoor.ts";
import { storagePath } from "../app/src/lib/photo-rules.js";
import { DOOR_BATCH, DOOR_WORDS } from "../app/src/lib/photo-door.js";

const MB = 1024 * 1024;
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const EXP_A = "33333333-3333-4333-8333-333333333333";
const EXP_B = "44444444-4444-4444-8444-444444444444";

const SRC = "app/src/lib/receipts.js";
const BUCKET = "expense-receipts";
const appLib = (n) => JSON.stringify(pathToFileURL(path.resolve(`app/src/lib/${n}`)).href);

/** A stand-in for a picked file: a real Blob with the `name` a File has. */
const picked = (name, type, size) =>
  Object.assign(new Blob([new Uint8Array(size)], { type }), { name });

const blankExpense = (id, biz) => ({
  id, business_id: biz, receipt_path: null, receipt_bytes: null,
  receipt_width: null, receipt_height: null, receipt_uploaded_at: null,
});

function applyPatch(w, row) {
  const e = w.expenses.get(row.eq?.id);
  if (!e || (row.eq?.business_id && e.business_id !== row.eq.business_id)) return null;
  Object.assign(e, row.patch);
  return { ...e };
}

// ---------------------------------------------------------------------------
// THE WORLD. The door's deps are `tests/photo-door-receipts.test.mjs`'s, kept
// deliberately close to them so a change on that side shows up on this one.
// ---------------------------------------------------------------------------
function world(over = {}) {
  const w = {
    expenses: new Map(), objects: new Map(),
    doorCalls: [], puts: [], sbCalls: [], logs: [],
    budget: { used_bytes: 1000, cap_bytes: 10 * MB },
    token: "owner-a",
    // The two halves of what the browser hands over: the file a person picked,
    // and what `shrink` makes of it. They are different numbers on purpose —
    // the door is told the size of the blob that really goes up, and a sabotage
    // that claims the picked size has to be visible.
    shrunkBytes: 300_000, shrunkType: null,
    tamperStart: null, tamperFinish: null, doorThrows: null, claimAs: null,
    sbUploadError: null, sbUpdateError: null,
    ...over,
  };
  w.expenses.set(EXP_A, blankExpense(EXP_A, A));
  w.expenses.set(EXP_B, blankExpense(EXP_B, B));

  const members = {
    "owner-a": { userId: "u-owner-a", businessId: A, role: "owner", permissions: [] },
    "staff-a": { userId: "u-staff-a", businessId: A, role: "staff", permissions: ["requests"] },
    "owner-b": { userId: "u-owner-b", businessId: B, role: "owner", permissions: [] },
  };
  const r2 = {
    putUrl: async (bucket, key, type) => `https://r2.test/${bucket}/${key}?put&type=${encodeURIComponent(type)}`,
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
    budget: async () => (w.budget === undefined ? null : w.budget),
    getPhoto: async () => null,
    insertPhoto: async (row) => row,
    deletePhoto: async () => {},
    expenseBelongs: async (biz, id) => {
      const e = w.expenses.get(id);
      return !!e && e.business_id === biz;
    },
    getReceipt: async (biz, id) => {
      const e = w.expenses.get(id);
      return e && e.business_id === biz ? { ...e } : null;
    },
    saveReceipt: async (row) => {
      const e = w.expenses.get(row.id);
      if (!e || e.business_id !== row.business_id) throw new Error("not yours");
      Object.assign(e, row);
      return { ...e };
    },
    clearReceipt: async (biz, id) => {
      const e = w.expenses.get(id);
      if (!e || e.business_id !== biz) throw new Error("not yours");
      Object.assign(e, blankExpense(id, biz));
    },
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
    // `claimAs` is the only thing a real client could lie about, and § 2 is
    // what happens when it does.
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
    if (sent.action === "finish" && w.tamperFinish) return w.tamperFinish(data);
    return data;
  };

  // The PUT. The object is recorded at the size of the body that really went
  // up, which is what makes `finish`'s head() the authoritative size rather
  // than a second copy of the client's claim.
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
  const from = (table) => {
    const row = { table, patch: null };
    const chain = {
      eq: (col, val) => { (row.eq ??= {})[col] = val; return chain; },
      select: () => chain,
      single: () => chain.then(),
      then: (res, rej) => Promise.resolve(
        w.sbUpdateError ? { data: null, error: w.sbUpdateError } : { data: applyPatch(w, row), error: null },
      ).then(res, rej),
    };
    return { update: (patch) => { row.patch = patch; w.sbCalls.push(row); return chain; } };
  };
  globalThis.__supabase = {
    from,
    storage: {
      from: (bucket) => ({
        upload: async (key, blob, opts) => {
          w.sbCalls.push({ bucket, key, type: opts?.contentType, upsert: opts?.upsert, bytes: blob.size });
          if (!w.sbUploadError) w.objects.set(key, { bytes: blob.size });
          return { error: w.sbUploadError };
        },
        remove: async (list) => {
          w.sbCalls.push({ bucket, removed: list });
          for (const k of list) w.objects.delete(k);
          return { error: null };
        },
        createSignedUrl: async (key) => {
          w.sbCalls.push({ bucket, signed: 1 });
          return { data: { signedUrl: `https://sb.test/${bucket}/${key}?one` }, error: null };
        },
        createSignedUrls: async (keys) => {
          w.sbCalls.push({ bucket, signed: keys.length });
          return {
            data: keys.map((p) => ({ path: p, signedUrl: `https://sb.test/${bucket}/${p}?many`, error: null })),
            error: null,
          };
        },
      }),
    },
  };
  // `shrink` and `budgetFor` are the only fiction on the app's side: one needs
  // a canvas, the other a database. Everything else — the key rules, the door
  // readers, the sentences, the chunk size — is the real module.
  globalThis.__shrink = async (file) => ({
    blob: new Blob([new Uint8Array(w.shrunkBytes)], { type: w.shrunkType ?? file.type }),
    width: 800, height: 600,
  });
  globalThis.__budget = async () => w.budget;
  return w;
}

/** The signed-URL expiry, taken from `photos.js` itself, never restated. */
function signedFor() {
  const m = /export const SIGNED_FOR = (\d+)/.exec(readFileSync("app/src/lib/photos.js", "utf8"));
  assert.ok(m, "photos.js no longer declares SIGNED_FOR, so this stub cannot stand in for it");
  return Number(m[1]);
}

/**
 * `receipts.js` imports the Supabase client, `api.js` and `photos.js`, so it
 * cannot be imported here directly. It is copied to a temp directory beside
 * five stub siblings with **its own text untouched** (or, in § 10, with one
 * named guard removed), which is the arrangement every door suite uses: the
 * thing under test is the real file.
 */
async function load(flagOn, { src = null } = {}) {
  const d = mkdtempSync(path.join(tmpdir(), "receipts-js-"));
  writeFileSync(path.join(d, "photo-rules.js"), `export * from ${appLib("photo-rules.js")};`);
  writeFileSync(path.join(d, "photo-door.js"),
    `export * from ${appLib("photo-door.js")};\nexport const RECEIPTS_VIA_DOOR = ${flagOn};`);
  writeFileSync(path.join(d, "api.js"), "export const api = { photoDoor: (b, body) => globalThis.__door(b, body) };");
  writeFileSync(path.join(d, "supabase.js"), "export const supabase = globalThis.__supabase;");
  writeFileSync(path.join(d, "photos.js"),
    // SIGNED_FOR is READ OUT OF the real `photos.js` rather than re-exported
    // from it: importing that module pulls in the browser's Supabase client,
    // which needs `import.meta.env`. A literal here would be a second copy of
    // the expiry, which is the drift this repo keeps meeting, so it is parsed.
    `export const SIGNED_FOR = ${signedFor()};\n`
    + "export const shrink = (f) => globalThis.__shrink(f);\n"
    + "export const budgetFor = (b) => globalThis.__budget(b);\n");
  writeFileSync(path.join(d, "receipts.js"), src ?? readFileSync(SRC, "utf8"));
  return import(pathToFileURL(path.join(d, "receipts.js")).href);
}

const keyFor = (biz, exp, file, type = "image/jpeg") =>
  storagePath({ businessId: biz, ownerId: exp, id: file, type });
const fileIdOf = (key) => String(key).split("/")[2].replace(/\.\w+$/, "");

// ---------------------------------------------------------------------------
test("1 · FLAG ON — start, one PUT, finish, and the size is R2's not the client's", async () => {
  const w = world();
  const mod = await load(true);
  const out = await mod.addReceipt({ file: picked("bill.JPG", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A });

  assert.deepEqual(w.doorCalls.map((c) => c.action), ["start", "finish"], "the order is start, PUT, finish");
  assert.equal(w.puts.length, 1, "more or fewer than one upload request");
  assert.equal(w.sbCalls.length, 0, "the door path talked to Supabase as well, which is a second door");

  const [start, finish] = w.doorCalls;
  assert.equal(start.store, "receipt", "the store is not declared, so the door would file this as a job photo");
  assert.equal(start.business_id, A);
  assert.equal(start.expense_id, EXP_A);
  assert.equal(start.content_type, "image/jpeg");
  // SHRINK BEFORE CLAIMING. The claim has to be the size of the blob that
  // really goes up: the door checks the claim at start and the real size at
  // finish, and the two disagreeing is how a browser buys itself storage.
  assert.equal(start.claimed_bytes, w.puts[0].bytes, "the size declared is not the size uploaded");
  assert.equal(start.claimed_bytes, 300_000, "the picked file's size was claimed instead of the shrunk blob's");
  assert.equal(finish.file_id, start.file_id, "finish is about a different file than start");
  assert.equal(finish.width, 800);
  assert.equal(finish.height, 600);

  // THE APP MINTS THE ID AND NEVER THE PATH, and PUTs only to the key the
  // server named — which is the key the bucket policy and `parseObjectKey`
  // both read the business out of.
  const key = keyFor(A, EXP_A, start.file_id);
  assert.equal(w.puts[0].key, key, "the browser PUT to an object the server did not name");
  assert.equal(w.puts[0].method, "PUT");
  assert.equal(w.puts[0].type, "image/jpeg", "the Content-Type sent is not the one that was signed for");
  assert.match(w.puts[0].url, /^https:\/\//, "an upload url that is not https");

  assert.equal(out.receipt_path, key);
  assert.equal(out.receipt_bytes, 300_000, "the stored size is not the one R2 reported");
  assert.equal(out.id, EXP_A);
  assert.equal(w.expenses.get(EXP_A).receipt_path, key, "the row was never written");
  assert.equal(w.objects.size, 1);
});

test("2 · FLAG ON — an UNDER-CLAIM is caught at finish, the object goes, the row does not land", async () => {
  // The browser claims a kilobyte and PUTs six megabytes. Nothing at start can
  // see that; `finish` heads the real object, and 6 MB is past the receipt
  // ceiling, so it is refused and deleted. This is trap two of
  // `docs/the-photo-allowance.md` § 5 — the recorded size being the client's
  // claim — meeting the guard that exists for it.
  const w = world({ shrunkBytes: 6 * MB, claimAs: 1024 });
  const mod = await load(true);
  await assert.rejects(
    () => mod.addReceipt({ file: picked("huge.jpg", "image/jpeg", 6 * MB), businessId: A, expenseId: EXP_A }),
    (e) => e.message === "The stored receipt has no usable size, so it was not saved." && e.status === 422,
    "a client that under-reported its size was believed",
  );
  assert.equal(w.puts.length, 1);
  assert.equal(w.objects.size, 0, "the over-size object was left in the bucket");
  assert.equal(w.expenses.get(EXP_A).receipt_path, null, "a row was written for an object that was deleted");
});

test("3 · FLAG ON — the 5 MB ceiling is the server's sentence, shown as written, before anything is sent", async () => {
  const w = world({ shrunkBytes: 6 * MB });
  const mod = await load(true);
  await assert.rejects(
    () => mod.addReceipt({ file: picked("big.png", "image/png", 7 * MB), businessId: A, expenseId: EXP_A }),
    (e) => e.message === "That receipt is larger than 5.0 MB." && e.status === 413,
    "the receipt ceiling is not the bucket's own 5 MB, or the sentence was re-worded on the way out",
  );
  assert.equal(w.puts.length, 0, "a refused receipt was uploaded anyway");
  assert.equal(w.objects.size, 0);
  // And it is not one of the app's own sentences: a refusal the detailer can
  // act on must be the server's, not "The photo service had a problem."
  assert.ok(!Object.values(DOOR_WORDS).includes("That receipt is larger than 5.0 MB."));
  // The job store's ceiling is twice it, from the same request shape — so the
  // 5 MB above is read off the receipt profile rather than shared.
  assert.equal(door.RECEIPT_MAX_BYTES, 5 * MB);
});

test("4 · FLAG ON — OVER CAP names what is used, the limit, and how to free it", async () => {
  const w = world({ budget: { used_bytes: 9.9 * MB, cap_bytes: 10 * MB } });
  const mod = await load(true);
  await assert.rejects(
    () => mod.addReceipt({ file: picked("bill.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A }),
    (e) => {
      assert.equal(e.status, 409);
      // 0.11's Done-when, word by word: what is used, what the limit is, and
      // that deleting old job photos frees it.
      assert.match(e.message, /9\.9 MB of 10\.0 MB used/);
      assert.match(e.message, /Delete old job photos to make room/);
      return true;
    },
    "an over-cap receipt was accepted, or the sentence stopped naming the numbers",
  );
  assert.equal(w.puts.length, 0);

  // AND THE CAP FAILS CLOSED. An unreadable allowance is a refusal, never
  // "no limit" — the shape that made `job_photo_budget()` dangerous to a
  // service-role caller.
  const w2 = world({ budget: undefined });
  const mod2 = await load(true);
  await assert.rejects(
    () => mod2.addReceipt({ file: picked("bill.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A }),
    (e) => e.status === 503 && /Could not check your photo storage/.test(e.message),
    "an unreadable allowance was read as unlimited",
  );
  assert.equal(w2.puts.length, 0);
});

test("5 · FLAG ON — REPLACEMENT is remove then add, and DELETION takes the object and the columns", async () => {
  const w = world();
  const mod = await load(true);
  const first = await mod.addReceipt({ file: picked("a.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A });
  assert.equal(w.objects.size, 1);

  // A second one is REFUSED rather than swapped, so the old object cannot be
  // orphaned in a bucket the reconcile does not read.
  const before = w.puts.length;
  await assert.rejects(
    () => mod.addReceipt({ file: picked("b.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A }),
    (e) => e.message === "That expense already has a receipt. Remove it first." && e.status === 409,
  );
  assert.equal(w.puts.length, before, "the refused second receipt was uploaded anyway");
  assert.equal(w.objects.size, 1, "a second object exists for an expense that holds one receipt");
  assert.equal(w.expenses.get(EXP_A).receipt_path, first.receipt_path, "the first receipt was replaced in place");

  // REMOVE: the object AND the five columns, through the door, with no
  // Supabase call anywhere.
  await mod.removeReceipt({ expense: w.expenses.get(EXP_A), businessId: A });
  assert.equal(w.objects.size, 0, "remove cleared the columns and left the object — the allowance never moves");
  const cleared = w.expenses.get(EXP_A);
  for (const col of ["receipt_path", "receipt_bytes", "receipt_width", "receipt_height", "receipt_uploaded_at"]) {
    assert.equal(cleared[col], null, `${col} was left set`);
  }
  assert.equal(w.sbCalls.length, 0, "the door path reached Supabase");
  assert.deepEqual(w.doorCalls.map((c) => c.action), ["start", "finish", "start", "remove"]);

  // And then the replacement lands, which is what makes it a replacement.
  const again = await mod.addReceipt({ file: picked("c.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A });
  assert.equal(w.objects.size, 1);
  assert.notEqual(again.receipt_path, first.receipt_path, "the new receipt reused the old object's key");
});

test("6 · FLAG ON — ISOLATION: another business's expense, and a key this press did not ask for", async () => {
  // Another tenant's expense 404s exactly as one that does not exist, and
  // nothing is uploaded.
  const w = world();
  const mod = await load(true);
  await assert.rejects(
    () => mod.addReceipt({ file: picked("x.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_B }),
    (e) => e.message === "Expense not found" && e.status === 404,
    "one business reached another's expense",
  );
  assert.equal(w.puts.length, 0);
  assert.equal(w.objects.size, 0);
  assert.equal(w.expenses.get(EXP_B).receipt_path, null);

  // A `start` answer naming SOMEBODY ELSE'S object is refused before the PUT.
  // The browser will not upload to any key but the one it asked for, which is
  // the whole of the isolation on a store with no row to compare against.
  const w2 = world({ tamperStart: (ans) => ({ ...ans, key: keyFor(B, EXP_B, fileIdOf(ans.key)) }) });
  const mod2 = await load(true);
  await assert.rejects(
    () => mod2.addReceipt({ file: picked("x.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A }),
    (e) => e.message === DOOR_WORDS.unreadable,
    "the app PUT to whatever key it was handed",
  );
  assert.equal(w2.puts.length, 0, "an object was written under another business's prefix");

  // And a `finish` that cannot state a size is refused rather than shown: a
  // receipt whose bytes do not land makes the cap compare against zero.
  const w3 = world({ tamperFinish: (ans) => ({ expense: { ...ans.expense, receipt_bytes: null } }) });
  const mod3 = await load(true);
  await assert.rejects(
    () => mod3.addReceipt({ file: picked("x.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A }),
    (e) => e.message === DOOR_WORDS.unconfirmed,
    "a receipt with no recorded size was accepted, so the allowance counts it as free",
  );
});

test("7 · FLAG ON — URLS: one request for a list, chunked, and a key refused is absent not fatal", async () => {
  const w = world();
  const mod = await load(true);
  const mine = [0, 1, 2].map((i) => keyFor(A, EXP_A, `5555555${i}-5555-4555-8555-555555555555`));
  w.expenses.get(EXP_A).receipt_path = mine[0];

  const map = await mod.signedReceiptUrls(mine);
  assert.equal(w.doorCalls.length, 1, "one signed-URL request per row is the exact thing this function exists to prevent");
  assert.equal(w.doorCalls[0].action, "urls");
  assert.deepEqual(w.doorCalls[0].keys, mine);
  assert.equal(typeof map, "object");
  // The door answers only for keys the caller may read; anything it will not
  // sign is simply absent, and a row the screen cannot draw must not take it
  // down.
  assert.ok(Object.keys(map).length <= mine.length);
  for (const [k, v] of Object.entries(map)) {
    assert.ok(mine.includes(k), `a url came back for a key that was not asked for: ${k}`);
    assert.match(v, /^https:\/\//);
  }

  // CHUNKED AT `DOOR_BATCH`, declared as an equality rather than a ceiling.
  const w2 = world();
  const mod2 = await load(true);
  const many = Array.from({ length: DOOR_BATCH + 1 }, (_, i) =>
    keyFor(A, EXP_A, `${String(i).padStart(8, "0")}-5555-4555-8555-555555555555`));
  await mod2.signedReceiptUrls(many);
  assert.equal(w2.doorCalls.length, 2, `${DOOR_BATCH + 1} keys is two calls, not one oversized body`);
  assert.equal(w2.doorCalls[0].keys.length, DOOR_BATCH);
  assert.equal(w2.doorCalls[1].keys.length, 1);

  // KEYS FROM TWO BUSINESSES IN ONE CALL IS REFUSED BEFORE IT IS SENT. The
  // door reads the business off the body, so one mixed list would ask the
  // wrong question about half of it.
  const w3 = world();
  const mod3 = await load(true);
  await assert.rejects(
    () => mod3.signedReceiptUrls([keyFor(A, EXP_A, A), keyFor(B, EXP_B, B)]),
    /more than one business/,
  );
  assert.equal(w3.doorCalls.length, 0);

  // An empty list asks nothing at all.
  assert.deepEqual(await mod3.signedReceiptUrls([]), {});
  assert.equal(w3.doorCalls.length, 0);
});

test("8 · FLAG OFF — today's path, unchanged, and ONE request for a list", async () => {
  const w = world();
  const mod = await load(false);
  const out = await mod.addReceipt({ file: picked("bill.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A });

  assert.equal(w.doorCalls.length, 0, "the old path called the photo door");
  assert.equal(w.puts.length, 0, "the old path made an HTTP request of its own");
  const up = w.sbCalls.find((c) => c.bucket);
  assert.equal(up.bucket, BUCKET, "the old path stopped writing to expense-receipts");
  assert.equal(up.upsert, false, "upsert was turned on, which lets one upload overwrite another");
  assert.equal(up.bytes, 300_000);
  // THE FIRST FOLDER IS THE BUSINESS ID: the bucket's policy checks
  // `(storage.foldername(name))[1]`, so the path IS the isolation.
  assert.match(up.key, new RegExp(`^${A}/${EXP_A}/[0-9a-f-]{36}\\.jpg$`), up.key);
  assert.equal(out.receipt_path, up.key);
  assert.equal(out.receipt_bytes, 300_000);
  assert.equal(out.receipt_width, 800);

  // OVER CAP on this path is the app's own refusal, because there is no server
  // to say it: a code the screen keys on, and nothing uploaded.
  const w2 = world({ budget: { used_bytes: 10 * MB, cap_bytes: 10 * MB } });
  const mod2 = await load(false);
  await assert.rejects(
    () => mod2.addReceipt({ file: picked("bill.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A }),
    (e) => e.code === "BUDGET_FULL",
  );
  assert.equal(w2.objects.size, 0, "an over-cap receipt was uploaded on the old path");

  // REMOVE clears the columns and then the object, both halves.
  const w3 = world();
  const mod3 = await load(false);
  const made = await mod3.addReceipt({ file: picked("b.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A });
  await mod3.removeReceipt({ expense: made, businessId: A });
  assert.equal(w3.objects.size, 0, "the object was left behind");
  assert.equal(w3.expenses.get(EXP_A).receipt_path, null);

  // AND ONE REQUEST FOR A LIST ON THIS PATH TOO — ROADMAP 9.20 (c). The first
  // version looped a one-key helper, which is one round trip per row.
  const w4 = world();
  const mod4 = await load(false);
  const map = await mod4.signedReceiptUrls([keyFor(A, EXP_A, A), keyFor(A, EXP_A, B)]);
  assert.equal(w4.sbCalls.filter((c) => c.signed).length, 1, "one signed-URL request per row");
  assert.equal(w4.sbCalls.find((c) => c.signed).signed, 2);
  assert.equal(Object.keys(map).length, 2);
});

test("9 · THERE IS NO SECOND DOOR, and the flag is read in a known number of places", async () => {
  // A fallback that catches the door's failure and writes to Supabase anyway is
  // live exactly when the function is down — which is exactly when the cap
  // would stop counting. `photo-door.js`'s own header forbids it in those words.
  const w = world({ doorThrows: new TypeError("Failed to fetch") });
  const mod = await load(true);
  await assert.rejects(
    () => mod.addReceipt({ file: picked("bill.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A }),
    (e) => e.message === DOOR_WORDS.unreachable,
    "a blocked door did not become the sentence that names both of its causes",
  );
  assert.equal(w.sbCalls.length, 0, "the door failed and the old store was written to anyway: a second door");
  assert.equal(w.objects.size, 0);

  const src = readFileSync(SRC, "utf8");
  assert.equal(src.split("export const RECEIPTS_VIA_DOOR").length - 1, 0,
    "the flag is declared here as well as in photo-door.js");
  assert.equal(src.split("if (RECEIPTS_VIA_DOOR)").length - 1, 3,
    "the flag is branched on somewhere unexpected — one each in addReceipt, removeReceipt and signedReceiptUrl");
  assert.equal(src.split("if (!RECEIPTS_VIA_DOOR)").length - 1, 1, "the negative branch is signedReceiptUrls' alone");
  assert.ok(!/catch[\s\S]{0,200}supabase\.storage/.test(src),
    "receipts.js falls back to Supabase Storage when the door fails");
});

// ---------------------------------------------------------------------------
// § 10 — BREAK IT ON PURPOSE
// ---------------------------------------------------------------------------
// Each entry removes ONE guard from the REAL `receipts.js` text and names the
// probe that must stop refusing. The edit is asserted to have LANDED before the
// colour is believed: a scripted replacement that silently matches nothing
// prints the same green a caught sabotage does (`docs/gotchas.md` 102).
const SABOTAGES = [
  {
    name: "claim the picked file's size instead of the shrunk blob's",
    from: "claimed_bytes: blob.size,",
    to: "claimed_bytes: file.size,",
    async probe(mod, w) {
      await mod.addReceipt({ file: picked("b.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A });
      assert.equal(w.doorCalls[0].claimed_bytes, w.puts[0].bytes, "the size declared is not the size uploaded");
    },
  },
  {
    name: "PUT to whatever key the answer names (the key check gone)",
    from: "readReceiptStart(",
    to: "((resp) => ({ uploadUrl: resp.upload_url, key: resp.key }))(",
    world: () => ({ tamperStart: (ans) => ({ ...ans, key: keyFor(B, EXP_B, fileIdOf(ans.key)) }) }),
    async probe(mod, w) {
      await mod.addReceipt({ file: picked("b.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A })
        .catch(() => {});
      assert.equal(w.puts.length, 0, "the browser uploaded to an object the server did not name");
    },
  },
  {
    name: "accept a finish with no recorded size",
    from: "readReceiptFinish(",
    to: "((resp) => resp.expense)(",
    world: () => ({ tamperFinish: (ans) => ({ expense: { ...ans.expense, receipt_bytes: null } }) }),
    async probe(mod) {
      await assert.rejects(
        () => mod.addReceipt({ file: picked("b.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A }),
        (e) => e.message === DOOR_WORDS.unconfirmed,
      );
    },
  },
  {
    name: "remove falls through to the old store",
    from: "    readRemoved(await door(businessId, { action: \"remove\", expense_id: expense.id }));\n    return;",
    to: "    /* removed */",
    async probe(mod, w) {
      await mod.addReceipt({ file: picked("b.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A });
      await mod.removeReceipt({ expense: w.expenses.get(EXP_A), businessId: A });
      assert.equal(w.sbCalls.length, 0, "removing through the door reached Supabase");
    },
  },
  {
    name: "one urls call may mix two businesses",
    from: "if (paths.some((p) => String(p).split(\"/\")[0] !== businessId)) {",
    to: "if (false) {",
    async probe(mod, w) {
      await mod.signedReceiptUrls([keyFor(A, EXP_A, A), keyFor(B, EXP_B, B)]).catch(() => {});
      assert.equal(w.doorCalls.length, 0, "a mixed-business list was sent as one business's question");
    },
  },
  {
    name: "the old path's allowance check",
    from: "if (!roomFor(blob.size, budget)) {",
    to: "if (false) {",
    flagOn: false,
    world: () => ({ budget: { used_bytes: 10 * MB, cap_bytes: 10 * MB } }),
    async probe(mod, w) {
      await mod.addReceipt({ file: picked("b.jpg", "image/jpeg", 900_000), businessId: A, expenseId: EXP_A })
        .catch(() => {});
      assert.equal(w.objects.size, 0, "an over-cap receipt was uploaded on the old path");
    },
  },
];

test("10 · SABOTAGE — each guard removed is seen (control first)", async () => {
  assert.equal(SABOTAGES.length, 6, "the sabotage list changed size without this number moving");
  const src = readFileSync(SRC, "utf8");

  for (const s of SABOTAGES) {
    const flagOn = s.flagOn ?? true;
    // CONTROL: the real file, same world, probe green.
    const w = world(s.world?.() ?? {});
    await s.probe(await load(flagOn, { src }), w);

    // THE EDIT MUST LAND. An unmatched replacement is an ordinary clean run.
    assert.equal(src.split(s.from).length - 1, 1, `the line to sabotage is not unique: ${s.name}`);
    const broken = src.replace(s.from, s.to);
    assert.notEqual(broken, src, `the sabotage never matched: ${s.name}`);

    const w2 = world(s.world?.() ?? {});
    const mod2 = await load(flagOn, { src: broken });
    await assert.rejects(
      async () => { await s.probe(mod2, w2); },
      `SABOTAGE NOT CAUGHT — ${s.name}: the guard was removed and nothing went red`,
    );
  }
});
