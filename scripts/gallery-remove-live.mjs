// ROADMAP 0.11be — THE GALLERY'S REMOVE BUTTON, PRESSED FOR REAL: real R2, the
// real photo-door, the real Cloudflare cache, a real gallery_images row.
//
//   (dev server of this checkout on BASE, real Supabase in app/.env.local)
//   node --env-file=.env scripts/gallery-remove-live.mjs
//   node --env-file=.env scripts/gallery-remove-live.mjs --break=row-only
//
// Per width (390, 1440): one disposable 1x1 PNG is uploaded through the door to
// the demo business's gallery folder, re-PUT with Cache-Control max-age=300 (the
// long-lived cache path, as 0.11bd's proof does), read anonymously until
// Cloudflare answers HIT, and given a real gallery_images row (demo owner's own
// token, so RLS applies). Then the demo owner presses Remove on that tile. It
// must send the door's remove for exactly that key BEFORE the row delete; then
// R2 itself (a signed HEAD, R2 credentials from .env) must say the object is
// gone, the SAME warmed URL (no query, no bypass) must stop answering 200, and
// the row must be gone from the database.
//
// `--break=row-only` makes `removeBusinessPhotoAt` a no-op in the module the
// browser runs (repo file untouched): the pre-0.11be handler. It must go red.
// Whatever happens, `finally` removes every fixture object through the door and
// every fixture row. Writes only demo-detail rows and demo-detail gallery keys.
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";
import { makeR2, r2Config } from "../supabase/functions/_shared/r2.ts";

const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");
const started_at = new Date().toISOString();
const BREAK = process.argv.find((a) => a.startsWith("--break="))?.slice(8) || "";
if (BREAK && BREAK !== "row-only") { console.error("Unknown --break; known: row-only. Nothing ran."); process.exit(2); }
const BASE = process.env.BASE || "http://localhost:5180";
const SHOTS = process.env.SHOTS || ".manager-shots/0.11be";
const PUBLIC = "https://media.detailingplatform.com";
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
if (!SUPA || new URL(SUPA).origin !== "https://kguqylyzgyzfktkfnhjb.supabase.co" || !ANON) {
  console.error("REFUSING: SUPABASE_URL must be this platform's project. Nothing ran."); process.exit(2);
}
const { config: r2cfg, missing } = r2Config((n) => process.env[n]);
if (!r2cfg) { console.error(`SKIPPED: missing ${missing.join(", ")}. Nothing ran.`); process.exit(2); }
const r2 = makeR2(r2cfg);
const inR2 = async (key) => { try { return (await r2.head("business-media", key)).exists; } catch { return "R2 HEAD failed"; } };

const owner = demoOwner();
const auth = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
  method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify(owner),
}).then((r) => r.json()).catch(() => null);
if (!auth?.access_token) { console.error("No proof: demo-owner sign-in failed."); process.exit(2); }
const H = { apikey: ANON, Authorization: `Bearer ${auth.access_token}`, "Content-Type": "application/json" };
const rest = (p, init = {}) => fetch(`${SUPA}/rest/v1/${p}`, { ...init, headers: { ...H, ...init.headers } });
const biz = await rest("businesses?select=id&slug=eq.demo-detail").then((r) => r.json()).catch(() => null);
if (!Array.isArray(biz) || biz.length !== 1) { console.error("No proof: expected exactly one demo-detail business."); process.exit(2); }
const businessId = biz[0].id;
const door = (body) => fetch(`${SUPA}/functions/v1/photo-door`, {
  method: "POST", headers: H, body: JSON.stringify({ business_id: businessId, store: "media", ...body }),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const publicRead = async (url) => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url);
      return { status: r.status, cache: r.headers.get("cf-cache-status") || "-", bytes: Buffer.from(await r.arrayBuffer()) };
    } catch { /* transport flake only; a 200 is never retried into a 404 */ }
  }
  return { status: 0, cache: "transport failed", bytes: Buffer.alloc(0) };
};
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");
const CAPTION = "0.11be live fixture (removed by its own check)";

const failures = [], artifacts = [], noise = [], keys = [], rowIds = [];
let assertions = 0, completed = 0;
const check = (name, ok, detail = "") => {
  assertions++;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${name}: ${detail}`);
};
mkdirSync(SHOTS, { recursive: true });
const WIDTHS = [{ width: 390, height: 844 }, { width: 1440, height: 900 }];
const browser = await chromium.launch();
let swapped = 0;
try {
  for (const vp of WIDTHS) {
    const W = vp.width;
    console.log(`at ${W}x${vp.height}${BREAK ? `  (--break=${BREAK}: MUST be red)` : ""}`);
    // 1 · a real object on R2, warmed into Cloudflare's cache.
    const start = await door({ action: "start", folder: "gallery", file_id: randomUUID(), content_type: "image/png", claimed_bytes: PNG.length });
    const { key, public_url: url, upload_url: put } = start.body || {};
    check(`${W} door signed an upload in this business's gallery folder`, start.status === 200 && key?.startsWith(`${businessId}/gallery/`) && url === `${PUBLIC}/${key}`, `HTTP ${start.status}`);
    if (!key || !put) continue;
    keys.push(key);
    const putStatus = await fetch(put, { method: "PUT", headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" }, body: PNG })
      .then((r) => r.status).catch(() => 0);
    check(`${W} fixture stored on R2 (signed PUT)`, putStatus === 200 && (await inR2(key)) === true, `PUT HTTP ${putStatus}`);
    let warm = await publicRead(url);
    for (let i = 0; i < 12 && warm.cache !== "HIT"; i++) { await new Promise((r) => setTimeout(r, 250)); warm = await publicRead(url); }
    check(`${W} the public URL is a real cache HIT before Remove`, warm.status === 200 && warm.cache === "HIT" && warm.bytes.equals(PNG), `HTTP ${warm.status}, ${warm.cache}`);
    // 2 · a real gallery row pointing at it, written as the owner (RLS applies).
    const ins = await rest("gallery_images", { method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ business_id: businessId, kind: "single", image_url: url, caption: CAPTION, sort_order: -1, is_active: false }) });
    const row = (await ins.json().catch(() => []))[0];
    check(`${W} fixture gallery row written`, ins.status === 201 && !!row?.id, `HTTP ${ins.status}`);
    if (!row?.id) continue;
    rowIds.push(row.id);

    // 3 · the owner presses Remove on that tile.
    // THE APP'S SERVICE WORKER SERVES upload.js FROM ITS OWN CACHE, past page.route:
    // with it running, --break=row-only "landed" and still sent the door call.
    const ctx = await browser.newContext({ viewport: vp, serviceWorkers: "block" });
    const page = await ctx.newPage();
    await (await ctx.newCDPSession(page)).send("Network.setCacheDisabled", { cacheDisabled: true });
    page.on("console", (m) => { if (m.text() === "Service Worker registration blocked by Playwright") return; if (["error", "warning"].includes(m.type())) noise.push(`${W} ${m.type()}: ${m.text().slice(0, 160)}`); });
    page.on("pageerror", (e) => noise.push(`${W} pageerror: ${String(e.message).slice(0, 160)}`));
    page.on("dialog", (d) => d.accept());
    if (BREAK) {
      const from = "export async function removeBusinessPhotoAt(businessId, url) {";
      await page.route("**/src/lib/upload.js*", async (route) => {
        const src = await (await fetch(route.request().url())).text();
        if (src.includes(from)) swapped++;
        await route.fulfill({ contentType: "text/javascript", headers: { "cache-control": "no-store" }, body: src.replace(from, `${from} return;`) });
      });
    }
    const wire = [];
    page.on("request", (req) => {
      if (/functions\/v1\/photo-door/.test(req.url()) && req.method() === "POST") {
        const b = JSON.parse(req.postData() || "{}");
        wire.push(`door ${b.action} ${b.key}`);
      } else if (/rest\/v1\/gallery_images/.test(req.url()) && req.method() === "DELETE") wire.push("row delete");
    });
    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", owner.email);
      await page.fill("input[type=password]", owner.password);
      await page.click("form button.btn.primary");
      await page.waitForSelector(".tabbar", { timeout: 30000 });
    }
    await page.evaluate(() => { localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"])); localStorage.setItem("dp.tour", "1"); });
    await page.goto(`${BASE}/app?settings=gallery`, { waitUntil: "domcontentloaded" });
    const tile = page.locator(".gallery-grid > div").filter({ has: page.locator(`img[src="${url}"]`) });
    await tile.first().waitFor({ timeout: 30000 }).catch(() => {});
    check(`${W} the fixture's tile is on screen`, (await tile.count()) === 1);
    if (BREAK) check(`${W} the sabotage landed in the module the browser ran`, swapped > 0, `${swapped} swap(s)`);
    await tile.scrollIntoViewIfNeeded().catch(() => {});
    let shot = path.join(SHOTS, `gallery-remove-live-${BREAK || "clean"}-${W}-before.png`);
    await page.screenshot({ path: shot }); artifacts.push(shot);
    if (await tile.count()) {
      const done = page.waitForResponse((r) => /rest\/v1\/gallery_images/.test(r.url()) && r.request().method() === "GET", { timeout: 20000 }).catch(() => null);
      await tile.getByRole("button", { name: "Remove" }).click();
      await done;
      await page.waitForTimeout(500);
      const want = [`door remove ${key}`, "row delete"];
      check(`${W} the press sent ${want.join(" → ")}`, JSON.stringify(wire) === JSON.stringify(want), `got ${wire.join(" → ") || "nothing"}`);
      check(`${W} the tile is gone and no error is shown`, (await tile.count()) === 0 && (await page.locator(".error-box").count()) === 0);
      completed++;
    }
    shot = path.join(SHOTS, `gallery-remove-live-${BREAK || "clean"}-${W}-after.png`);
    await page.screenshot({ path: shot }); artifacts.push(shot);
    await ctx.close();

    // 4 · the real world afterwards.
    check(`${W} R2 itself says the object is gone (signed HEAD)`, (await inR2(key)) === false, `exists=${await inR2(key)}`);
    const after = await publicRead(url);
    check(`${W} the SAME warmed URL stops answering 200 (no query, no bypass)`, [404, 410].includes(after.status), `HTTP ${after.status}, ${after.cache}`);
    const left = await rest(`gallery_images?select=id&id=eq.${row.id}`).then((r) => r.json()).catch(() => null);
    check(`${W} the row is gone from the database`, Array.isArray(left) && left.length === 0, `${left?.length ?? "?"} left`);
  }
  check("console clean at both widths", noise.length === 0, noise.slice(0, 4).join(" | "));
} finally {
  for (const key of keys) {
    const r = await door({ action: "remove", key });
    console.log(`cleanup door remove ${key.slice(-12)}: HTTP ${r.status} removed=${r.body?.removed}; R2 exists=${await inR2(key)}`);
  }
  for (const id of rowIds) await rest(`gallery_images?id=eq.${id}`, { method: "DELETE" });
  const lingering = await rest(`gallery_images?select=id&caption=eq.${encodeURIComponent(CAPTION)}`).then((r) => r.json()).catch(() => null);
  console.log(`cleanup fixture rows left: ${lingering?.length ?? "?"}`);
  await browser.close();
}
const absent = await publicRead(`${PUBLIC}/${businessId}/gallery/${randomUUID()}.png`);
const { path: receipt } = writeReceipt({
  check_id: "gallery-remove-live", started_at, status: failures.length || completed < 2 ? "fail" : "pass",
  expected_targets: 2, discovered_targets: 2, attempted_targets: WIDTHS.length, completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: 20, failures, artifacts: artifacts.map((a) => a.replace(/\\/g, "/")),
  canary: { id: "anonymous-missing-image", observed_failure: absent.status === 404, what: "a random nonexistent public gallery key answers 404" },
  dimensions: { roadmap: "0.11be", break: BREAK || undefined, base: BASE, widths: WIDTHS.map((w) => w.width), public_base: PUBLIC,
    real: "photo-door (deployed), R2 bucket business-media, Cloudflare cache on media.detailingplatform.com, gallery_images on kguqylyzgyzfktkfnhjb (demo-detail)" },
  warnings: ["One Cloudflare location (this machine's) is observed; a copy already downloaded by a visitor's browser is out of reach."],
});
console.log(`${completed}/2 presses, ${failures.length} failed, ${assertions} assertions; ${receipt}`);
process.exitCode = failures.length || completed < 2 ? 1 : 0;
