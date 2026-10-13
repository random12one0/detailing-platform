// 14.39 local proof. No live database writes or credentials. Real PostgreSQL
// (PGlite) runs the NEW migration; fake R2 models acceptance and lost replies.
// Real Chromium runs the app's addReceipt at 392 and 1440, including a closed tab.
// node scripts/receipt-abandonment.mjs --break=leave-object
// node scripts/receipt-abandonment.mjs
// PGLITE_DIR defaults to the existing TEMP/pglite installation; BASE=:5180.
// This does NOT certify real R2 cleanup; publication and the live proof remain.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeReceipt } from "./receipt.mjs";
import { handlePhotoDoor, PUT_SECONDS } from "../supabase/functions/_shared/photoDoor.ts";
import { reclaimReceiptAttempts, withReceiptAttempts } from "../supabase/functions/_shared/receiptAttempts.ts";
import { handlePhotoReconcile } from "../supabase/functions/_shared/photoReconcile.ts";

const require = createRequire(import.meta.url);
const { chromium } = require("../app/node_modules/playwright");
const pgDir = process.env.PGLITE_DIR || path.join(process.env.TEMP, "pglite");
const { PGlite } = await import(pathToFileURL(path.join(pgDir, "node_modules/@electric-sql/pglite/dist/index.js")));
const BREAK = process.argv.find(a => a.startsWith("--break="))?.slice(8) || "";
if (BREAK && BREAK !== "leave-object") throw new Error("Unknown sabotage");
const BASE = process.env.BASE || "http://localhost:5180";
const started_at = new Date().toISOString(), failures = [], observations = [];
const EXPECTED = 24; // 14 named SQL/handler targets + 5 browser cases at each of 2 widths.
let discovered = 0, attempted = 0, completed = 0, assertions = 0, canaryCaught = false;
const db = new PGlite(), objects = new Map();
const A = randomUUID(), B = randomUUID();
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const key = (business, expense, file = randomUUID()) => `${business}/${expense}/${file}.png`;
const expense = async (business = A) => { const id = randomUUID(); await q("insert into expenses(id,business_id) values ($1,$2)", [id, business]); return id; };
const register = (k, b, e) => q("select start_receipt_attempt($1,$2,$3)", [b, e, k]);
const finish = async (k, b, e, bytes = 73) => (await q("select finish_receipt_attempt($1,$2,$3,$4,null,null) as e", [b, e, k, bytes]))[0].e;
const expire = k => q("update receipt_upload_attempts set expires_at = now() - interval '1 second' where key = $1", [k]);
const state = async k => (await q("select state from receipt_upload_attempts where key = $1", [k]))[0]?.state;
const claim = () => q("select * from claim_receipt_attempts()");
const ack = a => q("select ack_receipt_attempt($1,$2,$3)", [a.key, a.business_id, a.expense_id]);
const raw = {
  putUrl: async (_bucket, k) => `https://receipt-proof.invalid/${k}`,
  getUrl: async (_bucket, k) => `https://receipt-proof.invalid/${k}`,
  head: async (_bucket, k) => ({ exists: objects.has(k), bytes: objects.get(k)?.length ?? null }),
  del: async (_bucket, k) => { if (!BREAK) objects.delete(k); },
  list: async () => ({ objects: [], next: null }),
};
const reaper = (over = {}) => reclaimReceiptAttempts({ claim, ack, r2: raw, ...over });
async function target(name, fn) {
  discovered++; attempted++;
  try { await fn(); assertions++; completed++; console.log("ok " + name); }
  catch (e) { failures.push(name + ": " + e.message); console.log("FAIL " + name + ": " + e.message); }
}
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table expenses(id uuid primary key, business_id uuid not null, receipt_path text,
      receipt_bytes bigint, receipt_width integer, receipt_height integer, receipt_uploaded_at timestamptz);`);
  await db.exec(readFileSync("supabase/migrations/20261013130000_receipt_upload_attempts.sql", "utf8"));
  await target("attempt committed before signing; failed signing still leaves it", async () => {
    const e = await expense(), k = key(A, e);
    const store = withReceiptAttempts({ ...raw, putUrl: async () => { assert.equal(await state(k), "pending"); throw new Error("lost start response"); } }, register);
    await assert.rejects(store.putUrl("expense-receipts", k, "image/png", PUT_SECONDS));
    assert.equal(await state(k), "pending"); await expire(k); await reaper();
  });
  await target("lost PUT reply reclaimed without finish", async () => {
    const e = await expense(), k = key(A, e); await register(k, A, e); objects.set(k, Buffer.alloc(73));
    await expire(k); const r = await reaper(); assert.equal(r.failed, 0); assert.equal(objects.has(k), false); assert.equal(await state(k), "reaped");
  });
  await target("never PUT is retired without restoring its deleted expense", async () => {
    const e = await expense(), k = key(A, e); await register(k, A, e); await q("delete from expenses where id=$1", [e]);
    await expire(k); await reaper(); assert.equal(await state(k), "reaped");
  });
  await target("young attempt stays; PUT lifetime fits inside grace", async () => {
    const e = await expense(), k = key(A, e); await register(k, A, e); objects.set(k, Buffer.alloc(73));
    assert.ok(PUT_SECONDS < 3600); await reaper(); assert.equal(await state(k), "pending"); assert.ok(objects.has(k));
    await expire(k); await reaper();
  });
  await target("successful receipt keeps authoritative bytes and object", async () => {
    const e = await expense(), k = key(A, e); await register(k, A, e); objects.set(k, Buffer.alloc(73));
    const row = await finish(k, A, e); assert.equal(row.receipt_bytes, 73); await expire(k); await reaper();
    assert.equal(await state(k), "saved"); assert.equal(objects.get(k).length, 73);
  });
  await target("lost finish response can be retried idempotently", async () => {
    const e = await expense(), k = key(A, e); await register(k, A, e); const first = await finish(k, A, e);
    assert.deepEqual(await finish(k, A, e, 999), first);
  });
  await target("cleanup wins lock: late finish refused", async () => {
    const e = await expense(), k = key(A, e); await register(k, A, e); await expire(k); const a = await claim();
    assert.ok(a.some(a => a.key === k)); await assert.rejects(finish(k, A, e)); await reaper();
  });
  await target("finish wins lock: cleanup never claims saved key", async () => {
    const e = await expense(), k = key(A, e); await register(k, A, e); await finish(k, A, e); await expire(k);
    assert.equal((await claim()).some(a => a.key === k), false);
  });
  await target("failed deletion is durable and retried", async () => {
    const e = await expense(), k = key(A, e); await register(k, A, e); objects.set(k, Buffer.alloc(73)); await expire(k);
    const r = await reaper({ r2: { ...raw, del: async () => { throw new Error("lost DELETE reply"); } } });
    assert.ok(r.failed > 0); assert.equal(await state(k), "reaping");
    await reaper(); assert.equal(await state(k), "reaped");
  });
  await target("canary detects DELETE that claims success but leaves object", async () => {
    const e = await expense(), k = key(A, e); await register(k, A, e); objects.set(k, Buffer.alloc(73)); await expire(k);
    const r = await reaper({ r2: { ...raw, del: async () => {} } });
    canaryCaught = r.failed > 0 && await state(k) === "reaping" && objects.has(k);
    assert.ok(canaryCaught); await reaper();
  });
  await target("tenant cannot register or finish another expense", async () => {
    const e = await expense(B), k = key(A, e); await assert.rejects(register(k, A, e));
    const own = key(B, e); await register(own, B, e); await assert.rejects(finish(own, A, e));
    await expire(own); await reaper();
  });
  await target("misfiled claim is refused before any storage call", async () => {
    let touched = 0;
    const e = await expense(); const r = await reaper({ claim: async () => [{ key: key(B, e), business_id: A, expense_id: e, state: "reaping" }],
      r2: { head: async () => { touched++; }, del: async () => { touched++; } } });
    assert.equal(r.failed, 1); assert.equal(touched, 0);
    await assert.rejects(register(key(B, e), A, e));
  });
  await target("browser roles cannot call lifecycle RPCs or read ledger", async () => {
    for (const role of ["anon", "authenticated"]) {
      const rows = await q(`select has_table_privilege($1,'receipt_upload_attempts','SELECT') as t,
        has_function_privilege($1,'start_receipt_attempt(uuid,uuid,text)','EXECUTE') as s,
        has_function_privilege($1,'finish_receipt_attempt(uuid,uuid,text,bigint,integer,integer)','EXECUTE') as f,
        has_function_privilege($1,'claim_receipt_attempts()','EXECUTE') as c,
        has_function_privilege($1,'ack_receipt_attempt(text,uuid,uuid)','EXECUTE') as a`, [role]);
      assert.deepEqual(rows[0], { t: false, s: false, f: false, c: false, a: false });
    }
  });
  await target("scheduled handler stamps cleanup failures and does not fake a run", async () => {
    let stamps = [];
    const deps = { now: () => new Date(), withinLimits: async () => true, r2: raw, missing: [], lastRun: async () => null,
      loadRows: async () => [], allowance: async () => null, stamp: async r => stamps.push(r), log: () => {},
      reclaimReceipts: async () => ({ claimed: 1, removed: 0, failed: 1, batch_full: false }) };
    let res = await handlePhotoReconcile(new Request(BASE), deps); assert.equal(res.status, 200); assert.equal(stamps[0].clean, false);
    stamps = []; deps.reclaimReceipts = async () => { throw new Error("database down"); };
    res = await handlePhotoReconcile(new Request(BASE), deps); assert.equal(res.status, 502); assert.equal(stamps.length, 0);
  });

  const browser = await chromium.launch();
  try {
    for (const width of [392, 1440]) for (const mode of ["saved", "refused", "lost-put-reply", "closed-tab", "lost-finish-reply"]) {
      await target(`browser ${width}/${mode}`, async () => {
        const e = await expense(mode === "refused" ? B : A), context = await browser.newContext({ viewport: { width, height: width === 392 ? 844 : 900 } });
        const page = await context.newPage(), noise = []; let k, bytes;
        page.on("pageerror", e => noise.push(e.message));
        page.on("console", msg => { if (["warning", "error"].includes(msg.type())) noise.push(msg.text()); });
        const store = withReceiptAttempts(raw, register);
        const deps = { requireMember: async (_req, biz) => biz === A ? { businessId: A, userId: A, role: "owner", permissions: [] } : null,
          can: () => true, withinLimits: async () => true, limit: { windowSeconds: 60, limit: 100 }, r2: store, log: () => {},
          budget: async () => ({ used_bytes: 0, cap_bytes: 1000000 }), receiptAttemptsManaged: true,
          expenseBelongs: async (biz, id) => (await q("select id from expenses where id=$1 and business_id=$2", [id, biz])).length > 0,
          getReceipt: async (biz, id) => (await q("select * from expenses where id=$1 and business_id=$2", [id, biz]))[0] || null,
          saveReceipt: async row => { const result = await finish(row.receipt_path, row.business_id, row.id, row.receipt_bytes); if (mode === "lost-finish-reply") throw new Error("lost database reply"); return result; },
          clearReceipt: async () => {} };
        await page.route("**/receipt-proof-door", async route => {
          const res = await handlePhotoDoor(new Request(BASE + "/receipt-proof-door", { method: "POST", headers: { "Content-Type": "application/json" }, body: route.request().postData() }), deps);
          await route.fulfill({ status: res.status, contentType: "application/json", body: await res.text() });
        });
        await page.route("https://receipt-proof.invalid/**", async route => {
          k = new URL(route.request().url()).pathname.slice(1); bytes = route.request().postDataBuffer(); objects.set(k, bytes);
          if (mode === "lost-put-reply") return route.abort("failed");
          if (mode === "closed-tab") { await page.close(); return; }
          await route.fulfill({ status: 200, body: "" });
        });
        try {
          await page.goto(BASE + "/?lite=1");
          const run = page.evaluate(async ({ businessId, expenseId, data }) => {
            const { api } = await import("/src/lib/api.js");
            api.photoDoor = async (business, body) => {
              const res = await fetch("/receipt-proof-door", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: business, ...body }) });
              const value = await res.json(); if (!res.ok) throw new Error(value.error); return value;
            };
            const { addReceipt } = await import("/src/lib/receipts.js");
            try { const row = await addReceipt({ businessId, expenseId, file: new File([Uint8Array.from(data)], "receipt.jpg", { type: "image/jpeg" }) }); return { saved: true, row }; }
            catch (e) { return { saved: false, error: e.message }; }
          }, { businessId: A, expenseId: e, data: [...readFileSync("app/public/img/tenant-site-hero.jpg")] }).catch(e => ({ closed: true }));
          const result = await run;
          if (mode === "saved" || mode === "lost-finish-reply") {
            if (mode === "saved") { assert.ok(result.saved); assert.equal(result.row.receipt_bytes, bytes.length); }
            else {
              assert.equal(result.saved, false); assert.match(result.error, /Could not save the receipt/);
              const retried = await handlePhotoDoor(new Request(BASE, { method: "POST", body: JSON.stringify({
                action: "finish", store: "receipt", business_id: A, expense_id: e, file_id: k.split("/")[2].slice(0, -4),
              }) }), deps);
              assert.equal(retried.status, 200); assert.equal((await retried.json()).expense.receipt_bytes, bytes.length);
            }
            const saved = await q("select receipt_path from expenses where id=$1", [e]); assert.equal(saved[0].receipt_path, k);
            await expire(k); await reaper(); assert.equal(objects.get(k).length, bytes.length);
            if (mode === "saved") assert.equal(noise.length, 0);
            else { assert.equal(noise.length, 1); assert.ok(noise[0].includes("500")); }
          } else if (mode === "refused") {
            assert.equal(result.saved, false); assert.match(result.error, /Expense not found/); assert.equal(k, undefined);
            assert.equal(noise.length, 1); assert.ok(noise[0].includes("404"));
          } else {
            assert.ok(k && objects.has(k)); assert.equal(await state(k), "pending");
            await expire(k); await reaper(); assert.equal(objects.has(k), false); assert.equal(await state(k), "reaped");
            if (mode === "lost-put-reply") assert.ok(noise.every(n => n.includes("ERR_FAILED")));
            else assert.equal(noise.length, 0);
          }
          observations.push({ width, mode, console: noise, stored_bytes: bytes?.length ?? 0, tab_closed: page.isClosed() });
        } finally { await context.close(); }
      });
    }
  } finally { await browser.close(); }
} finally { await db.close(); }
const { path: receipt } = writeReceipt({ check_id: "receipt-abandonment", started_at, expected_targets: EXPECTED,
  discovered_targets: discovered, attempted_targets: attempted, completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: EXPECTED,
  assertion_floor: "One completed assertion group per declared target: fourteen SQL/handler cases and ten real Chromium cases; 24 total.", failures, status: failures.length ? "fail" : "pass",
  canary: { id: "delete-left-object-behind", observed_failure: canaryCaught },
  dimensions: { break: BREAK, base: BASE, database: "throwaway PGlite", storage: "fake R2; real R2 cleanup NOT PROVED", observations } });
console.log(`${discovered}/${EXPECTED} discovered; ${completed} completed; ${failures.length} failures; ${receipt}`);
process.exitCode = failures.length || completed !== EXPECTED ? 1 : 0;
