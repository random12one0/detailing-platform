// 0.11cc: the expense screen uses the deployed receipt door, with no fallback.
// node scripts/receipt-door-live.mjs
// node scripts/receipt-door-live.mjs --break=unbound
// node scripts/receipt-door-live.mjs --transport-only
// The extra mode uses isolated Chromium without web security to test the real
// transport from the belt's required :5180 origin. R2 allows :5173, not :5180.
// It does NOT prove CORS: scripts/bucket-cors.mjs independently asks real R2
// about every supported origin and strangers, without Playwright routing.
// BASE=http://localhost:5180 is required for the belt checkout.
// Writes only its own marked demo expenses and receipt objects. Removes objects
// through the door before deleting rows, including on signals. No schema changes,
// deployment, emails, or changes to another tenant. Refusal changes the outgoing
// expense id to a nonexistent UUID; the REAL door must refuse it before PUT.
import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { writeReceipt, REPO } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("../app/node_modules/playwright");
const { createClient } = require("../app/node_modules/@supabase/supabase-js");
const BASE = process.env.BASE || "http://localhost:5180";
const SUPA = process.env.SUPABASE_URL;
if (new URL(SUPA).hostname !== "kguqylyzgyzfktkfnhjb.supabase.co") throw new Error("Wrong project; nothing measured");
const BREAK = process.argv.find(a => a.startsWith("--break="))?.slice(8) || "";
if (BREAK && BREAK !== "unbound") throw new Error("Unknown sabotage; nothing measured");
const started_at = new Date().toISOString();
const transportOnly = process.argv.includes("--transport-only");
const cleanMessage = text => text.replace(/https?:\/\/[^\s'"<>]+/g, url => {
  try { const u = new URL(url); return u.origin + u.pathname + (u.search ? "?[query omitted]" : ""); }
  catch { return "[URL omitted]"; }
});
const owner = createClient(SUPA, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const login = await owner.auth.signInWithPassword(demoOwner());
if (login.error) throw login.error;
const { data: biz, error: bizError } = await owner.from("businesses").select("id").eq("slug", "demo-detail").single();
if (bizError) throw bizError;
if (transportOnly && BASE !== "http://localhost:5180") throw new Error("Transport-only mode is restricted to the isolated belt origin");
const browser = await chromium.launch(transportOnly ? { args: ["--disable-web-security"] } : {});
const widths = [
  [390, 844, false], [392, 844, false], [768, 1024, false], [1440, 900, false],
  [320, 844, false], [392, 844, true], [1440, 900, true],
];
const run = randomUUID();
const made = new Set();
const pending = new Map();
const failures = [], artifacts = [], observations = [];
let assertions = 0, discovered = 0, attempted = 0, completed = 0;
const check = (name, ok) => { assertions++; if (!ok) failures.push(name); console.log(`${ok ? "ok" : "FAIL"} ${name}`); };
const door = body => owner.functions.invoke("photo-door", { body: { business_id: biz.id, store: "receipt", ...body } });
async function cleanup() {
  for (const id of [...made]) {
    let { data: row, error } = await owner.from("expenses").select("receipt_path").eq("id", id).single();
    if (error) throw error;
    // A browser can PUT successfully and then lose the CORS reply. Finish the
    // known attempt before removing it, so cleanup cannot orphan that object.
    if (!row.receipt_path && pending.has(id)) {
      const finalized = await door({ action: "finish", expense_id: id, file_id: pending.get(id) });
      if (!finalized.error && finalized.data?.expense?.receipt_path) row = finalized.data.expense;
      else if (finalized.error) {
        const status = finalized.error.context?.status;
        if (![400, 404, 409].includes(status)) throw new Error("Could not verify unfinished receipt cleanup: " + id);
      }
    }
    if (row.receipt_path) {
      const links = await door({ action: "urls", keys: [row.receipt_path] });
      const readUrl = links.data?.urls?.[row.receipt_path];
      if (links.error || !readUrl) throw new Error("Could not verify receipt removal: " + id);
      const gone = await door({ action: "remove", expense_id: id });
      if (gone.error || gone.data?.removed !== true) throw new Error("Receipt cleanup refused; row retained: " + id);
      const missing = await fetch(readUrl);
      await missing.body?.cancel();
      if (missing.status !== 404) throw new Error("Receipt file remains after removal; row retained: " + id);
    }
    const deleted = await owner.from("expenses").delete().eq("id", id).select("id");
    if (deleted.error || deleted.data?.length !== 1) throw new Error("Expense cleanup did not delete exactly its row: " + id);
    made.delete(id);
    pending.delete(id);
  }
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => {
  try { await cleanup(); } finally { await browser.close(); process.exit(130); }
});
const shotDir = path.join(REPO, ".manager-shots", "0.11cc");
mkdirSync(shotDir, { recursive: true });
const image = readFileSync(path.join(REPO, "app/public/img/tenant-site-hero.jpg"));
const transportOK = r => r.start === 1 && r.finish === 1 && r.puts === 1 && r.storage === 0 && r.bytes > 0 && r.bytes === r.stored;
const canaryCaught = !transportOK({ start: 0, finish: 0, puts: 0, storage: 1, bytes: 100, stored: 0 });
let state;
try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + "/app");
  await page.waitForSelector("input[type=email], .tabbar");
  if (await page.locator("input[type=email]").count()) {
    const who = demoOwner();
    await page.fill("input[type=email]", who.email);
    await page.fill("input[type=password]", who.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar");
  }
  await page.evaluate(() => {
    localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
    localStorage.setItem("dp.tour", "1"); localStorage.setItem("dp.lang.app", "en");
  });
  state = await ctx.storageState(); await ctx.close();
  for (const [width, height, lite] of widths) for (const refused of [false, true]) {
    const label = `${width}${lite ? "-lite" : ""}/${refused ? "refused" : "accepted"}`;
    attempted++;
    const context = await browser.newContext({ viewport: { width, height }, storageState: state });
    const p = await context.newPage();
    const calls = [], puts = [], noise = [], expectedHTTP = [];
    let storage = 0, inserted;
    p.on("console", msg => {
      if (!["warning", "error"].includes(msg.type())) return;
      if (refused && /^Failed to load resource: the server responded with a status of 404/.test(msg.text())) expectedHTTP.push(msg.text());
      else noise.push(cleanMessage(msg.text()));
    });
    p.on("pageerror", e => noise.push(cleanMessage(e.message)));
    p.on("response", async res => {
      if (res.url().endsWith("/functions/v1/photo-door")) {
        const body = res.request().postDataJSON();
        calls.push({ action: body?.action, status: res.status() });
        if (body?.action === "start" && res.status() === 200 && body.expense_id === inserted?.id) pending.set(body.expense_id, body.file_id);
      }
      if (res.request().method() === "PUT" && new URL(res.url()).hostname.endsWith("r2.cloudflarestorage.com")) {
        puts.push({ status: res.status(), bytes: res.request().postDataBuffer()?.length || 0 });
      }
    });
    // Observe and remember the ACTUAL inserted row before the product gets it.
    await p.route("**/rest/v1/expenses*", async route => {
      if (route.request().method() !== "POST") return route.continue();
      const response = await route.fetch(); const data = await response.json();
      inserted = Array.isArray(data) ? data[0] : data;
      if (inserted?.id) made.add(inserted.id);
      await route.fulfill({ response, json: data });
    });
    await p.route("**/storage/v1/object/**", route => {
      storage++;
      // A regression is observed but cannot write to the old store.
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: "not-stored" }) });
    });
    if (BREAK) await p.route("**/src/lib/photo-door.js*", async route => {
      const src = await (await fetch(route.request().url())).text();
      if (!src.includes("export const RECEIPTS_VIA_DOOR = true;")) throw new Error("Sabotage target absent");
      const body = src.replace("export const RECEIPTS_VIA_DOOR = true;", "export const RECEIPTS_VIA_DOOR = false;") + "\nglobalThis.__receiptBreak = true;";
      await route.fulfill({ status: 200, contentType: "text/javascript", body });
    });
    if (refused) await p.route("**/functions/v1/photo-door", route => {
      const body = route.request().postDataJSON();
      if (body.action === "start") body.expense_id = "00000000-0000-4000-8000-00000000beef";
      return route.continue({ postData: JSON.stringify(body) });
    });
    try {
      await p.goto(BASE + "/app/money" + (lite ? "?lite=1" : ""));
      await p.locator('[data-tour="expenses"] button').first().click();
      await p.getByRole("button", { name: "Add a note or change the date", exact: true }).click();
      await p.locator('input[type="number"]').fill("0.01");
      await p.getByRole("button", { name: "Supplies", exact: true }).click();
      await p.getByPlaceholder("supplies", { exact: true }).fill(`0.11cc check ${run} ${label}`);
      await p.locator('input[type="file"]').setInputFiles({ name: "receipt.jpg", mimeType: "image/jpeg", buffer: image });
      await p.getByText("Receipt attached — choose another", { exact: true }).waitFor();
      discovered++;
      if (BREAK) check(label + " sabotage executed", await p.evaluate(() => globalThis.__receiptBreak === true));
      await p.getByRole("button", { name: "Save expense", exact: true }).click();
      // "Save expense" disappears when it is RENAMED "Saving", before the
      // request finishes. Settle on the outcome, never on that label's absence.
      await p.waitForFunction(() => !document.querySelector(".sheet") || document.querySelector(".sheet [role=alert]"), null, { timeout: 30000 });
      await p.waitForTimeout(900);
      const { data: row, error } = await owner.from("expenses").select("receipt_path,receipt_bytes").eq("id", inserted?.id).single();
      check(label + " expense exists", !error && !!inserted?.id);
      check(label + " console", noise.length === 0);
      if (refused) {
        const words = (await p.getByRole("alert").allTextContents()).join(" ");
        const uploads = calls.filter(c => ["start", "finish"].includes(c.action));
        check(label + " real door refused nonexistent expense", uploads.length === 1 && uploads[0].action === "start" && uploads[0].status === 404);
        check(label + " refusal stays visible with Close", words.includes("Expense saved, but the receipt did not attach. Expense not found") && await p.locator(".sheet-body").getByRole("button", { name: "Close", exact: true }).isVisible().catch(() => false));
        check(label + " no file or receipt columns written", puts.length === 0 && storage === 0 && row?.receipt_path === null && row?.receipt_bytes === null);
        check(label + " only intentional HTTP refusal in console", expectedHTTP.length === 1);
      } else {
        const result = { start: calls.filter(c => c.action === "start" && c.status === 200).length,
          finish: calls.filter(c => c.action === "finish" && c.status === 200).length,
          puts: puts.filter(x => x.status === 200).length, storage, bytes: puts[0]?.bytes || 0, stored: row?.receipt_bytes };
        check(label + " door start/PUT/finish and authoritative bytes; zero old-store requests", transportOK(result));
        check(label + " saved key belongs to expense", !!row?.receipt_path?.startsWith(`${biz.id}/${inserted.id}/`));
        if (row?.receipt_path && !BREAK) {
          const got = await p.evaluate(async key => {
            const { signedReceiptUrl } = await import("/src/lib/receipts.js");
            const url = await signedReceiptUrl(key);
            const res = await fetch(url); return { status: res.status, bytes: (await res.arrayBuffer()).byteLength };
          }, row.receipt_path);
          check(label + " browser reads same R2 byte count", got.status === 200 && got.bytes === row.receipt_bytes);
        } else check(label + " browser reads same R2 byte count", false);
        check(label + " success closes expense sheet", await p.locator(".sheet").count() === 0);
      }
      const shot = path.join(shotDir, label.replace("/", "-") + ".jpg");
      await p.screenshot({ path: shot, type: "jpeg", quality: 85 });
      artifacts.push(path.relative(REPO, shot).replaceAll("\\", "/"));
      observations.push({ label, calls, puts: puts.map(x => ({ status: x.status, bytes: x.bytes })), storage,
        receipt_bytes: row?.receipt_bytes, console: noise, intentional_http_refusals: expectedHTTP.length,
        screen_error: (await p.getByRole("alert").allTextContents()).join(" ") || null });
      completed++;
    } catch (e) { failures.push(label + " " + cleanMessage(e.message)); }
    finally { await context.close(); await cleanup(); }
  }
} finally { await cleanup(); await browser.close(); }
check("all temporary expense rows and objects cleaned", made.size === 0);
check("transport canary catches old store", canaryCaught);
const { path: receipt } = writeReceipt({ check_id: transportOnly ? "receipt-door-transport" : "receipt-door-live", started_at,
  status: failures.length ? "fail" : "pass", expected_targets: widths.length * 2, discovered_targets: discovered,
  attempted_targets: attempted, completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: 86, failures, artifacts,
  assertion_floor: "Exactly six assertions per accepted/refused target at seven viewport/motion combinations (84), plus cleanup and transport canary (2). Sabotage adds one executed-rewrite assertion per target.",
  canary: { id: "old-store-not-door", observed_failure: canaryCaught },
  dimensions: { break: BREAK || null, base: BASE, transport_only: transportOnly, observations, writes: "Own marked demo expenses and R2 receipts; removed after each target" },
  warnings: ["Refusal replaces only the outgoing expense id. The deployed door and its 404 sentence are real. The expected HTTP 404 console entry is counted once per refused target; every other warning/error fails.",
    "Screenshots are JPEG proof captures; this release changes transport, with no visual before/after difference.",
    transportOnly ? "UNJUDGEABLE browser CORS in this mode: isolated Chromium disables web security for the required :5180 belt origin. Run bucket-cors.mjs separately; this pass certifies real start/PUT/finish/read/refusal/cleanup only." : "Normal browser security. The required :5180 belt origin is absent from the R2 allow list; failures here do not describe the production origin."] });
console.log(`${discovered}/${widths.length * 2} targets; ${assertions} assertions; ${failures.length} failures; ${receipt}`);
process.exit(failures.length ? 1 : 0);
