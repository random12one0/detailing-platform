// ROADMAP 0.11 SLICE 5 — THE PHOTO DOOR SIGNS FOR RECEIPTS TOO, RUN IN MEMORY.
//
//   node --test tests/photo-door-receipts.test.mjs
//
// Credential-free, no network, no database, no R2, no Deno. Node 24 strips the
// types off `_shared/photoDoor.ts` and runs it against an in-memory world, the
// same arrangement `tests/photo-door-server.test.mjs` uses for the job-photos
// half. Nothing here can spend a request or write a row.
//
// ---------------------------------------------------------------------------
// WHY A SECOND SUITE RATHER THAN MORE CASES IN THE FIRST
// ---------------------------------------------------------------------------
// The two stores share a door and almost nothing else that can go wrong. A
// receipt hangs off an EXPENSE, not a booking; it UPDATES five columns on a row
// that already exists rather than inserting one; its ceiling is 5 MB, not 10;
// and it must never reach the customer-facing photo export, which is the whole
// reason `20260921020000_a_receipt_is_not_a_job_photo.sql` made it a separate
// table and bucket in the first place. **A suite that mixed them would make
// every failure ask "which store?" first**, and the job-photos suite's twenty
// assertions are the regression net for the half that already shipped.
//
// ---------------------------------------------------------------------------
// WHAT IT PROVES
// ---------------------------------------------------------------------------
//   isolation   a detailer can never sign for, finish or remove another
//               business's receipt, by any of the four actions, and the key is
//               minted from the MEMBER's business rather than from the body.
//   the cap     5 MB, read off the store profile and not shared with the job
//               store's 10 — asserted by the same request being refused as a
//               receipt and accepted as a job photo.
//   allowance   one budget across both stores, checked at start AND again at
//               finish against the size R2 states, and failing CLOSED when it
//               cannot be read.
//   one each    an expense holds one receipt; a second is refused rather than
//               silently replacing the first and orphaning its object.
//   asymmetry   any member may attach a receipt; removing one needs `settings`.
//
// **WHAT IT DOES NOT PROVE:** that R2 accepts these signatures, that the
// `expenses` update lands against the real database, or anything about the live
// project. Those are the first real run's, and the publish is Andrew's.
//
// BREAK IT ON PURPOSE: § 9 rebuilds `photoDoor.ts` with ONE guard removed at a
// time and asserts the matching probe goes from refused to allowed. A check
// nobody has seen fail is how this repo shipped six that tested nothing.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as door from "../supabase/functions/_shared/photoDoor.ts";
import { storagePath } from "../app/src/lib/photo-rules.js";

const MB = 1024 * 1024;
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const EXP_A = "33333333-3333-4333-8333-333333333333";
const EXP_B = "44444444-4444-4444-8444-444444444444";
const FILE = "55555555-5555-4555-8555-555555555555";
const FILE2 = "66666666-6666-4666-8666-666666666666";
const BOOKING_A = "77777777-7777-4777-8777-777777777777";
const PHOTO = "88888888-8888-4888-8888-888888888888";

const keyOf = (biz, exp, file) => `${biz}/${exp}/${file}.jpg`;
const K = keyOf(A, EXP_A, FILE);

function world(mod = door, over = {}) {
  const w = {
    expenses: new Map(), objects: new Map(), calls: [], logs: [],
    budget: { used_bytes: 1000, cap_bytes: 10 * MB },
    limiterOk: true, saveFails: false, wireReceipts: true, ...over,
  };
  // Two businesses, each with one expense, so every isolation question has a
  // real other tenant to ask about rather than a made-up uuid.
  w.expenses.set(EXP_A, { id: EXP_A, business_id: A, receipt_path: null, receipt_bytes: null, receipt_width: null, receipt_height: null, receipt_uploaded_at: null });
  w.expenses.set(EXP_B, { id: EXP_B, business_id: B, receipt_path: null, receipt_bytes: null, receipt_width: null, receipt_height: null, receipt_uploaded_at: null });

  const members = {
    "owner-a": { userId: "u-owner-a", businessId: A, role: "owner", permissions: [] },
    "staff-a": { userId: "u-staff-a", businessId: A, role: "staff", permissions: ["requests"] },
    "owner-b": { userId: "u-owner-b", businessId: B, role: "owner", permissions: [] },
  };
  w.store = {
    putUrl: async (bucket, key, type) => { w.calls.push(["putUrl", bucket, key]); return `https://r2.test/${bucket}/${key}?put&type=${type}`; },
    getUrl: async (bucket, key) => { w.calls.push(["getUrl", bucket, key]); return `https://r2.test/${bucket}/${key}?get`; },
    head: async (bucket, key) => { w.calls.push(["head", bucket, key]); const o = w.objects.get(key); return o ? { exists: true, bytes: o.bytes } : { exists: false, bytes: null }; },
    del: async (bucket, key) => { w.calls.push(["del", bucket, key]); w.objects.delete(key); },
  };
  const receiptDeps = {
    // THE ISOLATION, WRITTEN OUT: every one of these filters on business_id as
    // well as id, because the real ones run with the service role and the
    // storage policies do not apply to it.
    expenseBelongs: async (biz, id) => { const e = w.expenses.get(id); return !!e && e.business_id === biz; },
    getReceipt: async (biz, id) => { const e = w.expenses.get(id); return e && e.business_id === biz ? { ...e } : null; },
    saveReceipt: async (row) => {
      w.calls.push(["saveReceipt", row.id]);
      if (w.saveFails) throw new Error("db down");
      const e = w.expenses.get(row.id);
      if (!e || e.business_id !== row.business_id) throw new Error("not yours");
      Object.assign(e, row);
      return { ...e };
    },
    clearReceipt: async (biz, id) => {
      w.calls.push(["clearReceipt", id]);
      const e = w.expenses.get(id);
      if (!e || e.business_id !== biz) throw new Error("not yours");
      Object.assign(e, { receipt_path: null, receipt_bytes: null, receipt_width: null, receipt_height: null, receipt_uploaded_at: null });
    },
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
    budget: async () => (w.budget === undefined ? null : w.budget),
    getPhoto: async () => null,
    insertPhoto: async (row) => row,
    deletePhoto: async () => {},
    ...(w.wireReceipts ? receiptDeps : {}),
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
  action: "start", store: "receipt", business_id: A, expense_id: EXP_A, file_id: FILE,
  content_type: "image/jpeg", claimed_bytes: 100_000, ...over,
});
const finishBody = (over = {}) => ({
  action: "finish", store: "receipt", business_id: A, expense_id: EXP_A, file_id: FILE, ...over,
});
const put = (w, key, bytes) => w.objects.set(key, { bytes });

// ---------------------------------------------------------------------------
test("0 · the store profile is what the migration declared", () => {
  assert.ok(door.STORES.receipt, "there is no receipt store");
  assert.equal(door.STORES.receipt.bucket, "expense-receipts");
  assert.equal(door.STORES.receipt.maxBytes, 5 * MB,
    "the receipts ceiling is not 5 MB — the bucket's own file_size_limit is, and a door that "
    + "signs above it hands out URLs the bucket will refuse");
  assert.equal(door.STORES.job.maxBytes, 10 * MB, "the job store's ceiling moved");
  assert.notEqual(door.STORES.receipt.bucket, door.STORES.job.bucket,
    "both stores name one bucket — a receipt in job-photos is in the customer-facing export, "
    + "which is the single thing the receipts migration exists to prevent");
  assert.equal(door.STORES.receipt.kinds, null, "a receipt has no before/after/damage");
});

test("1 · the key is the shape the bucket policy reads, and the app mints the same one", () => {
  const mine = door.mintKey(A, EXP_A, FILE, "image/jpeg");
  assert.equal(mine, K);
  assert.equal(mine.split("/")[0], A,
    "the first folder is not the business id — that folder IS the isolation, and the policy "
    + "checks exactly it");
  // TWO COPIES OF A PATH RULE THAT CAN DISAGREE is this repo's most repeated
  // failure, so the test calls both rather than restating one.
  assert.equal(mine, storagePath({ businessId: A, ownerId: EXP_A, id: FILE, type: "image/jpeg" }),
    "the door and app/src/lib/photo-rules.js mint different keys for the same receipt");
});

test("2 · ISOLATION — no action reaches another business's receipt", async () => {
  const w = world();
  // start
  assert.equal((await w.call("owner-a", startBody({ expense_id: EXP_B }))).status, 404,
    "a start against another tenant's expense was not 404");
  // finish
  assert.equal((await w.call("owner-a", finishBody({ expense_id: EXP_B }))).status, 404);
  // remove
  assert.equal((await w.call("owner-a", { action: "remove", store: "receipt", business_id: A, expense_id: EXP_B })).status, 404);
  // urls — absent from the answer, which also tells a prober nothing
  const u = await w.call("owner-a", { action: "urls", store: "receipt", business_id: A, keys: [keyOf(B, EXP_B, FILE2)] });
  assert.equal(u.status, 200);
  assert.deepEqual(u.body.urls, {}, "another business's receipt key was signed");
  // and the body cannot name a business the caller is not in
  assert.equal((await w.call("owner-a", startBody({ business_id: B }))).status, 401);
});

test("3 · the key is minted from the MEMBER, so a forged path cannot steer it", async () => {
  const w = world();
  const r = await w.call("owner-a", startBody({ file_id: FILE }));
  assert.equal(r.status, 200);
  assert.equal(r.body.key, K);
  const [kind, bucket, key] = w.calls.find((c) => c[0] === "putUrl");
  assert.equal(kind, "putUrl");
  assert.equal(bucket, "expense-receipts", "the PUT was signed against the wrong bucket");
  assert.equal(key.split("/")[0], A);
});

test("4 · THE CAP is 5 MB for a receipt and 10 for a job photo, from one request shape", async () => {
  const w = world();
  const big = await w.call("owner-a", startBody({ claimed_bytes: 6 * MB }));
  assert.equal(big.status, 413, "6 MB was accepted as a receipt");
  assert.match(big.body.error, /5\.0 MB/, "the refusal does not say what the limit is");
  // the same size as a JOB photo is fine, which is what proves the ceiling is
  // read off the profile rather than hard-coded once for both
  const asJob = await w.call("owner-a", {
    action: "start", business_id: A, booking_id: BOOKING_A, photo_id: PHOTO,
    kind: "before", content_type: "image/jpeg", claimed_bytes: 6 * MB,
  });
  assert.equal(asJob.status, 200, "6 MB was refused as a job photo too — one ceiling is serving both");
});

test("5 · THE ALLOWANCE — one budget across both stores, checked twice, failing closed", async () => {
  // over the cap at start
  const over = world(door, { budget: { used_bytes: 10 * MB - 1000, cap_bytes: 10 * MB } });
  const r1 = await over.call("owner-a", startBody({ claimed_bytes: 500_000 }));
  assert.equal(r1.status, 409);
  assert.match(r1.body.error, /Photo storage is full/, "the full sentence is not the one the job store uses");

  // unreadable fails CLOSED, and nothing is signed
  const blind = world(door, { budget: undefined });
  const r2 = await blind.call("owner-a", startBody());
  assert.equal(r2.status, 503);
  assert.equal(blind.calls.filter((c) => c[0] === "putUrl").length, 0, "a URL was signed with no budget");

  // AND AGAIN AT FINISH, against the size R2 states rather than the claim: a
  // client that under-reported is caught here and the object goes.
  // 4 MB, not 9: nine is over the RECEIPTS ceiling, so the 422 size refusal
  // would fire first and this would be testing that instead. Four is a legal
  // receipt and still 2 MB more than the room left.
  const under = world(door, { budget: { used_bytes: 8 * MB, cap_bytes: 10 * MB } });
  put(under, K, 4 * MB);
  const r3 = await under.call("owner-a", finishBody());
  assert.equal(r3.status, 409, "an under-claimed receipt was stored");
  assert.equal(under.objects.has(K), false, "the over-cap object was left in the bucket");
  assert.equal(under.expenses.get(EXP_A).receipt_path, null, "the expense was written anyway");
});

test("6 · a size R2 will not state is a refusal, never a zero that counts as free", async () => {
  const w = world();
  w.objects.set(K, { bytes: 0 });
  const r = await w.call("owner-a", finishBody());
  assert.equal(r.status, 422);
  assert.equal(w.objects.has(K), false, "the unusable object was kept");
  assert.equal(w.expenses.get(EXP_A).receipt_bytes, null);
});

test("7 · ONE RECEIPT PER EXPENSE, and a retry is not a second one", async () => {
  const w = world();
  put(w, K, 2000);
  const first = await w.call("owner-a", finishBody({ width: 800, height: 1200 }));
  assert.equal(first.status, 200);
  assert.equal(first.body.expense.receipt_path, K);
  assert.equal(first.body.expense.receipt_bytes, 2000);
  assert.equal(first.body.expense.receipt_width, 800);

  // the same finish again is the same answer, not a second write
  w.calls.length = 0;
  const again = await w.call("owner-a", finishBody());
  assert.equal(again.status, 200);
  assert.equal(again.body.expense.receipt_path, K);
  assert.equal(w.calls.filter((c) => c[0] === "saveReceipt").length, 0, "a retry wrote the row again");

  // a DIFFERENT file on an expense that already has one is refused, not swapped
  const second = await w.call("owner-a", startBody({ file_id: FILE2 }));
  assert.equal(second.status, 409, "a second receipt was signed, which orphans the first object");
  const secondFinish = await w.call("owner-a", finishBody({ file_id: FILE2 }));
  assert.equal(secondFinish.status, 409);
  assert.equal(w.expenses.get(EXP_A).receipt_path, K, "the first receipt was replaced");
});

test("8 · remove needs `settings`, clears the columns BEFORE the object, and is 404 when absent", async () => {
  const w = world();
  put(w, K, 2000);
  await w.call("owner-a", finishBody());

  const staff = await w.call("staff-a", { action: "remove", store: "receipt", business_id: A, expense_id: EXP_A });
  assert.equal(staff.status, 403, "a member without `settings` removed a receipt");
  assert.match(staff.body.error, /receipt/, "the refusal calls it a photo");

  w.calls.length = 0;
  const gone = await w.call("owner-a", { action: "remove", store: "receipt", business_id: A, expense_id: EXP_A });
  assert.equal(gone.status, 200);
  const order = w.calls.map((c) => c[0]).filter((c) => c === "clearReceipt" || c === "del");
  assert.deepEqual(order, ["clearReceipt", "del"],
    "the object went before the columns — the other order can leave a path pointing at nothing, "
    + "which is a broken image on an expense for ever");
  assert.equal(w.expenses.get(EXP_A).receipt_path, null);
  assert.equal(w.objects.has(K), false);

  assert.equal((await w.call("owner-a", { action: "remove", store: "receipt", business_id: A, expense_id: EXP_A })).status, 404);

  // any member may ADD one: the asymmetry is on the way out, not in
  const w2 = world();
  assert.equal((await w2.call("staff-a", startBody())).status, 200);
});

test("9 · an unsaved row takes its object with it, and no credential reaches a reply or a log", async () => {
  const w = world(door, { saveFails: true });
  put(w, K, 2000);
  const r = await w.call("owner-a", finishBody());
  assert.equal(r.status, 500);
  assert.equal(w.objects.has(K), false,
    "the object stayed with no row pointing at it — invisible to everything but the nightly reconcile");
  const said = JSON.stringify(r.body) + w.logs.join(" ");
  assert.doesNotMatch(said, /db down/, "the database's own message reached the caller or the log");
});

test("10 · the store is chosen explicitly, defaults to job, and an unwired receipt store says so", async () => {
  const w = world();
  assert.equal((await w.call("owner-a", { action: "urls", store: "nope", business_id: A, keys: [K] })).status, 400);

  // no `store` at all is the job store, byte for byte: slice 1's app half sends
  // no such field and must keep working
  const u = await w.call("owner-a", { action: "urls", business_id: A, keys: [K] });
  assert.equal(u.status, 200);
  assert.equal(u.body.urls[K].includes("/job-photos/"), true, "the default store is no longer job-photos");

  const bare = world(door, { wireReceipts: false });
  const r = await bare.call("owner-a", startBody());
  assert.equal(r.status, 503);
  assert.match(r.body.error, /not set up/, "an unwired receipt store threw instead of saying so");
});

test("11 · the rate ceiling is asked before any store or database work", async () => {
  const w = world(door, { limiterOk: false });
  const r = await w.call("owner-a", startBody());
  assert.equal(r.status, 429);
  assert.equal(w.calls.filter((c) => ["putUrl", "head", "saveReceipt"].includes(c[0])).length, 0,
    "a refused caller still spent R2 or the database");
});

// ---------------------------------------------------------------------------
// § 12 — BREAK IT ON PURPOSE
// ---------------------------------------------------------------------------
// Each line rebuilds `photoDoor.ts` with one guard removed and asserts the
// matching probe goes from refused to allowed. The control run first, so a
// probe that can never pass cannot be mistaken for a caught sabotage.
// CRLF is normalised: a checkout with autocrlf on carries it and the text to
// sabotage is written with LF.
const SRC = () => readFileSync("supabase/functions/_shared/photoDoor.ts", "utf8").replace(/\r\n/g, "\n");
const dir = mkdtempSync(path.join(tmpdir(), "receipt-door-sab-"));
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
  async foreignExpenseAccepted(mod) {
    const w = world(mod);
    return (await w.call("owner-a", startBody({ expense_id: EXP_B }))).status === 200;
  },
  async foreignKeySigned(mod) {
    const w = world(mod);
    const r = await w.call("owner-a", { action: "urls", store: "receipt", business_id: A, keys: [keyOf(B, EXP_B, FILE2)] });
    return Object.keys(r.body?.urls ?? {}).length > 0;
  },
  async overSizeSigned(mod) {
    const w = world(mod);
    return (await w.call("owner-a", startBody({ claimed_bytes: 6 * MB }))).status === 200;
  },
  async underClaimStored(mod) {
    const w = world(mod, { budget: { used_bytes: 8 * MB, cap_bytes: 10 * MB } });
    put(w, K, 4 * MB);          // under the 5 MB ceiling, over the room left
    return (await w.call("owner-a", finishBody())).status === 200;
  },
  async unknownBudgetAllowed(mod) {
    const w = world(mod, { budget: { used_bytes: 0, cap_bytes: 0 } });
    return (await w.call("owner-a", startBody())).status === 200;
  },
  async secondReceiptAccepted(mod) {
    const w = world(mod);
    put(w, K, 2000);
    await w.call("owner-a", finishBody());
    return (await w.call("owner-a", startBody({ file_id: FILE2 }))).status === 200;
  },
  async staffRemoved(mod) {
    const w = world(mod);
    put(w, K, 2000);
    await w.call("owner-a", finishBody());
    return (await w.call("staff-a", { action: "remove", store: "receipt", business_id: A, expense_id: EXP_A })).status === 200;
  },
  async orphanKept(mod) {
    const w = world(mod, { saveFails: true });
    put(w, K, 2000);
    await w.call("owner-a", finishBody());
    return w.objects.has(K);
  },
};

const SAB = [
  // **BOTH LINES, BECAUSE THE ISOLATION HERE IS DOUBLED AND REMOVING HALF OF IT
  // REMOVES NOTHING.** `expenseBelongs` asks the question and `getReceipt`
  // answers null for an expense that is not this business's, so deleting either
  // one on its own leaves the other still refusing and the canary would report a
  // guard it never tested. The doubling is deliberate defence in depth; what it
  // costs is that a sabotage has to take the whole guard.
  ["foreignExpenseAccepted", [
    ["if (!(await deps.expenseBelongs!(member.businessId, expenseId))) return bad(\"Expense not found\", 404);", ""],
    ["const row = await deps.getReceipt!(member.businessId, expenseId);\n      if (!row) return bad(\"Expense not found\", 404);",
     "const row = (await deps.getReceipt!(member.businessId, expenseId)) ?? { id: expenseId, business_id: member.businessId, receipt_path: null, receipt_bytes: null, receipt_width: null, receipt_height: null };"],
  ], "the expense-belongs guard (both halves of it)"],
  ["foreignKeySigned", [["if (businessOwnsKey(member.businessId, k))", "if (true)"]],
    "the ownership guard on urls"],
  ["overSizeSigned", [["if (claimed > store.maxBytes) return bad(`That receipt is larger than ${mb(store.maxBytes)}.`, 413);", ""]],
    "the 5 MB receipts ceiling"],
  ["underClaimStored", [["if (rBudget.used_bytes + rBytes > rBudget.cap_bytes) {", "if (false) {"]],
    "the second cap check at finish"],
  // AIMED AT A BUDGET THAT READS AND SAYS NOTHING USEFUL (cap 0), not at a
  // null one. With the guard gone a null budget throws, the outer catch turns
  // it into a 500, and the probe would be measuring the crash rather than the
  // missing guard. The second edit is the same shape the job suite uses: the
  // cap comparison has to stop refusing a zero cap too, or it catches what the
  // first edit let through.
  ["unknownBudgetAllowed", [
    ["const rb = await deps.budget(member.businessId, token);\n        if (!rb || !(Number(rb.cap_bytes) > 0) ||",
     "const rb = await deps.budget(member.businessId, token);\n        if (false ||"],
    ["if (rBudget.used_bytes + claimed > rBudget.cap_bytes) return bad(fullSentence(rBudget), 409);",
     "if (rBudget.cap_bytes > 0 && rBudget.used_bytes + claimed > rBudget.cap_bytes) return bad(fullSentence(rBudget), 409);"],
  ], "failing closed on a cap that cannot be read"],
  ["secondReceiptAccepted", [["if (row.receipt_path) return bad(\"That expense already has a receipt. Remove it first.\", 409);", ""]],
    "one receipt per expense"],
  ["staffRemoved", [["if (!deps.can(member, \"settings\")) return bad(`Removing a ${store.noun} needs the settings permission.`, 403);", ""]],
    "the settings permission on remove"],
  ["orphanKept", [["await r2.del(store.bucket, rKey).catch(() => deps.log(\"photo-door: could not remove an unrecorded receipt\", expenseId));", ""]],
    "removing the object when the row fails"],
];

test("12 · SABOTAGE — each guard removed is seen (control first)", async () => {
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
