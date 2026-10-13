// 0.11bd: REAL upload/read/delete proof, no database writes, no publish.
// node --env-file=.env scripts/media-cache-delete-live.mjs [--break=cached-read]
// Start this checkout on :5180 first. One disposable gallery PNG per width.
// Browser PUT uses real CORS. Public reads have no authentication, no cache-busting
// query and no request Cache-Control. A real HIT is required BEFORE removal.
// A blank test page uses the existing allowed production origin; :5180 is not
// in the live bucket's CORS list. This fixture tests transport, not app layout.
// After the browser PUT, the SAME disposable object is PUT once through the
// signed URL with Cache-Control public,max-age=300. This forces the ORIGINAL
// long-lived cache path even if today's default objects always revalidate.
// It changes only the fixture's HTTP metadata, never the bucket/domain settings.
// Foreign-key refusal is asked via Playwright's request client so its deliberate
// 404 does not add a failed-resource message to the page's console.
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";
const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");
const started_at = new Date().toISOString();
const BREAK = process.argv.find((a) => a.startsWith("--break="))?.slice(8) || "";
if (BREAK && BREAK !== "cached-read") throw new Error("Unknown sabotage");
const BASE = process.env.BASE || "http://localhost:5180";
const PUBLIC = "https://media.detailingplatform.com";
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA || new URL(SUPA).origin !== "https://kguqylyzgyzfktkfnhjb.supabase.co" || !ANON || !SERVICE) {
  throw new Error("No proof: this platform's project and environment must be confirmed before any query");
}
const owner = demoOwner();
const auth = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
  method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify(owner),
}).then((r) => r.json()).catch(() => null);
if (!auth?.access_token) throw new Error("No proof: demo-owner sign-in failed");
const businesses = await fetch(`${SUPA}/rest/v1/businesses?select=id&slug=eq.demo-detail`, {
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
}).then((r) => r.json()).catch(() => null);
if (!Array.isArray(businesses) || businesses.length !== 1) throw new Error("No proof: expected exactly one demo-detail business");
const businessId = businesses[0].id;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");
const WIDTHS = [{ width: 392, height: 844 }, { width: 1440, height: 900 }];
const browser = await chromium.launch({ headless: true });
const reader = await browser.newContext(); // No signed-in state or default auth headers.
const failures = [], evidence = [], uploaded = [], noise = [];
let attempted = 0, completed = 0, assertions = 0;
const check = (name, ok, detail) => {
  assertions++;
  evidence.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
  if (!ok) failures.push(`${name}: ${detail}`);
};
const door = async (request, body) => {
  const r = await request.post(`${SUPA}/functions/v1/photo-door`, {
    headers: { apikey: ANON, Authorization: `Bearer ${auth.access_token}` }, data: { business_id: businessId, store: "media", ...body },
  });
  return { status: r.status(), body: await r.json().catch(() => null) };
};
const publicRead = async (url) => {
  // Retries only transport errors (including this machine's DNS flake); never
  // retry a post-delete 200 until its TTL expires and then call that a pass.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url);
      return { status: r.status, cache: r.headers.get("cf-cache-status") || "", bytes: Buffer.from(await r.arrayBuffer()) };
    } catch { if (attempt === 2) return { status: 0, cache: "transport failed", bytes: Buffer.alloc(0) }; }
  }
};
try {
  for (const size of WIDTHS) {
    const ctx = await browser.newContext({ viewport: size });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) noise.push(`${size.width}: ${m.type()} ${/CORS|Access to fetch/.test(m.text()) ? "CORS refusal (request URL omitted)" : "browser console message (request details omitted)"}`); });
    page.on("pageerror", () => noise.push(`${size.width}: page error`));
    await page.goto(BASE, { waitUntil: "networkidle" });
    const harness = "https://detailingplatform.com/__media-delete-proof";
    await page.route(harness, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Media deletion transport proof</title>" }));
    await page.goto(harness);
    attempted++;
    try {
      const start = await door(ctx.request, { action: "start", folder: "gallery", file_id: randomUUID(), content_type: "image/png", claimed_bytes: PNG.length });
      check(`${size.width} start`, start.status === 200 && typeof start.body?.upload_url === "string", `HTTP ${start.status}`);
      if (!start.body?.upload_url || !start.body?.key) throw new Error("door did not sign an upload");
      const { key, public_url: url, upload_url: uploadUrl } = start.body;
      uploaded.push(key); // Cleanup even if PUT or later proof fails.
      check(`${size.width} own canonical public URL`, url === `${PUBLIC}/${key}` && key.startsWith(`${businessId}/gallery/`), url === `${PUBLIC}/${key}` ? "same URL throughout proof" : "wrong public address or folder");
      if (url !== `${PUBLIC}/${key}`) throw new Error("unsafe public URL");
      const put = await page.evaluate(async ({ uploadUrl, bytes }) => {
        try {
          const r = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png" }, body: new Blob([new Uint8Array(bytes)], { type: "image/png" }) });
          return r.status;
        } catch { return 0; }
      }, { uploadUrl, bytes: [...PNG] });
      check(`${size.width} browser PUT`, put === 200, `HTTP ${put}`);
      if (put !== 200) throw new Error("browser upload did not succeed; no cached deletion can be judged");
      let fixturePut = 0;
      try {
        const r = await fetch(uploadUrl, {
          method: "PUT", headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" }, body: PNG,
        });
        fixturePut = r.status;
      } catch { /* No signed URL or underlying error may enter a receipt. */ }
      check(`${size.width} disposable fixture forces old cache lifetime`, fixturePut === 200, `HTTP ${fixturePut}; fixture metadata only, max-age=300`);
      if (fixturePut !== 200) throw new Error("cached-read regression fixture was not stored");
      let warm = await publicRead(url);
      check(`${size.width} anonymous read returns uploaded bytes`, warm.status === 200 && warm.bytes.equals(PNG), `HTTP ${warm.status}, ${warm.cache}, ${warm.bytes.length} bytes`);
      if (warm.status !== 200 || !warm.bytes.equals(PNG)) throw new Error("public URL never returned the uploaded image");
      for (let read = 0; read < 10 && warm.cache !== "HIT"; read++) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        warm = await publicRead(url);
      }
      check(`${size.width} real cache HIT before delete`, warm.status === 200 && warm.cache === "HIT" && warm.bytes.equals(PNG), `HTTP ${warm.status}, ${warm.cache}`);
      if (warm.cache !== "HIT") throw new Error("old cached-read path was not reached");
      const removed = await door(ctx.request, { action: "remove", key });
      check(`${size.width} removal acknowledged`, removed.status === 200 && removed.body?.removed === true, `HTTP ${removed.status}`);
      const gone = BREAK ? warm : await publicRead(url);
      check(`${size.width} original warmed URL stops succeeding immediately`, [404, 410].includes(gone.status), `HTTP ${gone.status}, ${gone.cache}; no query string or cache bypass`);
      completed++;
    } catch (e) { failures.push(`${size.width} success path did not finish: ${e.message}`); }
    attempted++;
    try {
      const foreign = await door(ctx.request, { action: "remove", key: `00000000-0000-4000-8000-00000000beef/gallery/${randomUUID()}.png` });
      check(`${size.width} another business's key refused`, foreign.status === 404 && foreign.body?.removed !== true, `HTTP ${foreign.status}`);
      completed++;
    } catch { failures.push(`${size.width} refusal path did not finish`); }
    await ctx.close();
  }
} finally {
  for (const key of uploaded) {
    try {
      const r = await door(reader.request, { action: "remove", key });
      check("cleanup test object", r.status === 200 && r.body?.removed === true, `HTTP ${r.status}`);
    } catch { check("cleanup test object", false, "transport failed; demo gallery test object needs removal"); }
  }
  check("console read at both widths", noise.length === 0, noise.length ? noise.join(" | ") : "no errors or warnings");
  const absent = await publicRead(`${PUBLIC}/${businessId}/gallery/${randomUUID()}.png`);
  mkdirSync("receipts", { recursive: true });
  const artifact = `receipts/media-cache-delete-live${BREAK ? ".sabotage" : ""}.txt`;
  writeFileSync(artifact, evidence.map((e) => `${e.ok ? "PASS" : "FAIL"} ${e.name}: ${e.detail}`).join("\n") + "\n");
  const { path } = writeReceipt({
    check_id: "media-cache-delete-live", started_at, status: failures.length ? "fail" : "pass",
    expected_targets: 4, discovered_targets: WIDTHS.length * 2, attempted_targets: attempted, completed_targets: completed,
    skipped_targets: 0, assertions_executed: assertions, min_assertions: 18, failures,
    artifacts: [artifact], canary: { id: "anonymous-missing-image", observed_failure: absent.status === 404, what: "a random nonexistent public gallery key must answer 404" },
    dimensions: { roadmap: "0.11bd", break: BREAK || undefined, base: BASE, browser_upload_origin: "https://detailingplatform.com (blank routed test page, no app UI proof)", cache_fixture: "same uploaded PNG PUT again with Cache-Control public,max-age=300; only disposable object metadata changes", widths: WIDTHS.map((w) => w.width), public_base: PUBLIC, objects: uploaded.length, evidence },
    warnings: ["Browser transport and deployed door are real. This does not exercise Gallery.jsx's row-only Remove button, or certify every Cloudflare location or a previously downloaded browser copy."],
  });
  console.log(`${completed}/4 targets, ${failures.length} failed; ${path}`);
  await browser.close();
}
process.exitCode = failures.length ? 1 : 0;
