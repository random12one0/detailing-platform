// ROADMAP 0.11bc2 — THE GALLERY AND THE INTAKE BRIEF, PRESSED LIVE AGAINST THE
// DEPLOYED DOOR AND REAL R2.
//
//   set -a; . ./.env; set +a
//   npm run dev --prefix app
//   node scripts/media-door-live.mjs
//   node scripts/media-door-live.mjs --break=unbound
//
// **THIS ONE WRITES TO THE REAL STORE, AND ANDREW SAID IT MAY** (2026-10-10:
// "prove one real upload of each kind end to end in a browser as the demo
// owner"). It uploads one 70-byte PNG per flow and width, THROUGH THE DEPLOYED
// `photo-door`, into the real `business-media` bucket, and removes every one
// through the door before it exits (in a `finally`, so a red run cleans up too).
//
// WHAT IS SUPPLIED, AND IT IS ONLY DATABASE WRITES. `media-door-browser.mjs`
// answers the door, the PUT and the flag; this answers NONE of them. The only
// responses it supplies are the writes the two screens make to the demo tenant's
// own rows — `gallery_images` (the gallery's insert) and `site_intake` (the
// brief's debounced upsert over the demo tenant's real brief) — plus ONE read,
// the brief's saved step, so the run lands on the photos question. Supabase
// Storage writes are answered too, but only so a regression cannot spend the
// live old bucket: a single one is a FAILURE.
//
// The flag is on disk (`MEDIA_VIA_DOOR = true`), so nothing is rewritten.
// `--break=unbound` rewrites it OFF in the module the browser runs and the
// press then goes down the Supabase Storage path — the original condition.

import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
import { writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";
import { STEPS } from "../app/src/lib/siteIntake.js";

const started_at = new Date().toISOString();
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(REPO, ".manager-shots");
const BASE_URL = process.env.BASE || "http://localhost:5173";
const MEDIA_BASE = (process.argv.find((a) => a.startsWith("--base=")) || "").split("=")[1] || "https://media.detailingplatform.com";
const SLUG = "demo-detail";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const KNOWN_BREAKS = ["unbound"];
if (BREAK && !KNOWN_BREAKS.includes(BREAK)) {
  console.error(`Unknown --break=${BREAK}. Known: ${KNOWN_BREAKS.join(", ")}.\nNOTHING ran and NO receipt was written. This is not a pass.`);
  process.exit(2);
}

const SUPA = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
if (!SUPA || !SERVICE || !ANON) {
  console.error("\nSKIPPED — needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY in the root .env.\nNOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
// THE PROJECT IS CONFIRMED BEFORE THE FIRST QUERY. `adtlnvihwrcqcasqcjwd` is Andrew's real business.
if (!SUPA.includes("kguqylyzgyzfktkfnhjb")) {
  console.error(`\nREFUSING: SUPABASE_URL is not this platform's project — ${SUPA}\nNOTHING ran and NO receipt was written. This is not a pass.`);
  process.exit(2);
}
const OWNER = demoOwner();
const biz = (await fetch(`${SUPA}/rest/v1/businesses?select=id&slug=eq.${SLUG}`, {
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
}).then((r) => r.json()).catch(() => null))?.[0]?.id;
if (!biz) {
  console.error(`\nSKIPPED — no business with slug "${SLUG}". Run: node scripts/seed-demo.mjs\nNOTHING ran and NO receipt was written. This is not a pass.`);
  process.exit(2);
}
const SHOW_STEP = STEPS.findIndex((x) => x.key === "show");
if (SHOW_STEP < 0) {
  console.error('\nREFUSING: no "show" step in STEPS.\nNOTHING ran and NO receipt was written. This is not a pass.');
  process.exit(2);
}

const auth = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email: OWNER.email, password: OWNER.password }),
}).then((r) => r.json()).catch(() => null);
if (!auth?.access_token) {
  console.error("\nSKIPPED — could not sign in as the demo owner.\nNOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
const door = async (body, token = auth.access_token) => {
  const res = await fetch(`${SUPA}/functions/v1/photo-door`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);
const WIDTHS = [
  { label: "1440", width: 1440, height: 900 },
  { label: "392", width: 392, height: 844 },
  { label: "320", width: 320, height: 720 },
];
const FLOWS = [
  { key: "gallery", screen: "Photo gallery", url: "/app?settings=gallery", folder: "gallery", inputs: 1,
    okSel: ".ok-box", okWords: /added/i, table: "gallery_images", field: "image_url" },
  { key: "intake", screen: "Website brief · Photos and prices", url: "/app?brief=1", folder: "intake", inputs: 1,
    okSel: ".uploadbox .label", okWords: /1 added/i, table: null, field: null,
    arm: async (page) => {
      await page.waitForSelector("button.chip[aria-pressed]", { state: "visible", timeout: 30000 });
      await page.getByRole("button", { name: "A few good ones", exact: true }).first().click();
    } },
];
const WRITE_TABLES = ["gallery_images", "site_intake"];

let passed = 0, assertions = 0, completed = 0;
const failures = [];
const artifacts = [];
const check = (name, ok, got = "") => {
  assertions++;
  if (ok) { passed++; console.log(`    ok    ${name}`); return true; }
  failures.push(got ? `${name} — got ${got}` : name);
  console.log(`    FAIL  ${name}${got ? ` — got ${got}` : ""}`);
  return false;
};

// An anonymous read, retried: this machine's resolver intermittently cannot
// resolve the media host (FOR-ANDREW.md), and that is not the product's fault.
const anonGet = async (url) => {
  let last = "no attempt";
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url, { headers: { "cache-control": "no-cache" } });
      return { status: r.status, type: r.headers.get("content-type") || "", bytes: Buffer.from(await r.arrayBuffer()) };
    } catch (e) { last = String(e.cause?.code || e.message); await new Promise((r) => setTimeout(r, 1500)); }
  }
  return { status: 0, type: "", bytes: Buffer.alloc(0), error: last };
};

mkdirSync(SHOTS, { recursive: true });
console.log(`LIVE media door on the demo tenant (${biz.slice(0, 8)}), public base ${MEDIA_BASE}`);
if (BREAK) console.log(`  note  --break=${BREAK} is set: this run is a sabotage and MUST be red.\n`);

const browser = await chromium.launch({ headless: true });
const consoleNoise = [];
const uploaded = []; // keys really PUT to R2, removed in `finally`
const publicUrls = [];

try {
  const signedIn = await (async () => {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await c.newPage();
    await p.goto(`${BASE_URL}/app`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
    if (await p.locator("input[type=email]").count()) {
      await p.fill("input[type=email]", OWNER.email);
      await p.fill("input[type=password]", OWNER.password);
      await p.click("form button.btn.primary");
      await p.waitForSelector(".tabbar", { timeout: 30000 });
    }
    await p.evaluate(() => {
      try {
        localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
        localStorage.setItem("dp.tour", "1");
      } catch { /* private mode */ }
    });
    const state = await c.storageState();
    await c.close();
    return state;
  })();

  for (const flow of FLOWS) for (const w of WIDTHS) {
    const at = `${flow.key} ${w.label}`;
    console.log(`  ${flow.screen} (${flow.folder}) at ${w.label}x${w.height}`);
    const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height }, storageState: signedIn });
    const page = await ctx.newPage();
    await (await ctx.newCDPSession(page)).send("Network.setCacheDisabled", { cacheDisabled: true });
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") consoleNoise.push(`${at} · ${m.type()} · ${m.text().slice(0, 200)}`);
    });
    page.on("pageerror", (e) => consoleNoise.push(`${at} · pageerror · ${String(e.message).slice(0, 200)}`));

    const seen = { storageWrites: [], doorCalls: [], puts: [], rows: [] };
    page.on("request", (r) => {
      if (/\/storage\/v1\/object\//.test(r.url()) && ["POST", "PUT", "DELETE"].includes(r.method())) {
        seen.storageWrites.push(`${r.method()} ${r.url().slice(0, 140)}`);
      }
    });
    page.on("response", async (res) => {
      const req = res.request();
      if (req.method() === "POST" && res.url().endsWith("/functions/v1/photo-door")) {
        let reqBody = {}, resBody = null;
        try { reqBody = JSON.parse(req.postData() || "{}"); } catch { /* keep {} */ }
        try { resBody = await res.json(); } catch { /* keep null */ }
        seen.doorCalls.push({ status: res.status(), reqBody, resBody });
        // Recorded the instant it is known, so the cleanup still finds it if an assertion throws.
        if (resBody?.key && !uploaded.includes(resBody.key)) uploaded.push(resBody.key);
      }
      if (req.method() === "PUT" && !res.url().includes("/rest/v1/") && !res.url().includes(new URL(SUPA).host)) {
        seen.puts.push({ url: res.url(), status: res.status() });
      }
    });

    if (BREAK === "unbound") {
      await page.route("**/src/lib/photo-door.js*", async (route) => {
        const src = await (await fetch(route.request().url())).text();
        await route.fulfill({
          status: 200, contentType: "text/javascript", headers: { "cache-control": "no-store" },
          body: src.replace(/export const MEDIA_VIA_DOOR = (?:true|false);/, "export const MEDIA_VIA_DOOR = false;"),
        });
      });
    }
    // The old bucket is answered, never reached: a fallback is recorded as the FINDING and spends nothing.
    await page.route("**/storage/v1/object/**", (route) => {
      const m = route.request().method();
      if (m === "POST" || m === "PUT") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: "answered-by-the-gate-never-stored" }) });
      }
      return route.continue();
    });
    // THE ONLY DATABASE WRITES SUPPLIED. Everything else, and every other read, is the real thing.
    await page.route("**/rest/v1/**", async (route) => {
      const req = route.request();
      const table = new URL(req.url()).pathname.replace(/^\/rest\/v1\//, "").split("?")[0];
      if (req.method() === "GET" && table === "site_intake" && flow.key === "intake") {
        return route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({ business_id: biz, answers: {}, step: SHOW_STEP, submitted_at: null, updated_at: new Date().toISOString() }),
        });
      }
      if (req.method() === "GET" || !WRITE_TABLES.includes(table)) return route.continue();
      seen.rows.push({ table, method: req.method(), body: req.postData() || "" });
      return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    });

    await page.goto(`${BASE_URL}${flow.url}`, { waitUntil: "domcontentloaded" });
    if (flow.arm) await flow.arm(page);
    await page.waitForSelector('input[type="file"]', { state: "attached", timeout: 30000 });
    await page.waitForTimeout(900);
    const pickers = page.locator('input[type="file"]');
    const n = await pickers.count();
    check(`${at} · the screen has exactly ${flow.inputs} file picker`, n === flow.inputs, `${n}`);

    await pickers.first().setInputFiles({ name: "live.png", mimeType: "image/png", buffer: PNG });
    // The upload is real: wait for the screen to say so, or for the run to be clearly stuck.
    await page.locator(flow.okSel).first().waitFor({ state: "attached", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);

    const call = seen.doorCalls[0];
    check(`${at} · exactly one call to the DEPLOYED door, store media, folder ${flow.folder}, answered 200`,
      seen.doorCalls.length === 1 && call.reqBody.store === "media" && call.reqBody.folder === flow.folder && call.status === 200,
      JSON.stringify(seen.doorCalls.map((c) => [c.status, c.reqBody.store, c.reqBody.folder])));
    check(`${at} · ZERO Supabase Storage uploads — there is no fallback`, seen.storageWrites.length === 0, seen.storageWrites.slice(0, 2).join(" | "));
    const key = call?.resBody?.key || "";
    const pub = call?.resBody?.public_url || "";
    check(`${at} · the key is this business's own ${flow.folder} key`,
      key.startsWith(`${biz}/${flow.folder}/`) && key.endsWith(".png"), key);
    check(`${at} · the public url is ${MEDIA_BASE}/<that key>`, pub === `${MEDIA_BASE}/${key}`, pub);
    check(`${at} · the browser PUT the bytes to R2 once, and R2 answered 200`,
      seen.puts.length === 1 && seen.puts[0].status === 200 && seen.puts[0].url === call?.resBody?.upload_url,
      JSON.stringify(seen.puts.map((p) => [p.status, p.url.slice(0, 60)])));
    const okText = ((await page.locator(flow.okSel).first().textContent().catch(() => "")) || "").replace(/\s+/g, " ").trim();
    check(`${at} · the screen says what happened in its own words`, flow.okWords.test(okText), okText || "nothing on screen");

    if (flow.table) {
      const rows = seen.rows.filter((r) => r.table === flow.table);
      let stored = null;
      try { stored = rows.length ? JSON.parse(rows[0].body)[flow.field] : null; } catch { stored = "unparseable"; }
      check(`${at} · the url that reaches ${flow.table}.${flow.field} is the door's public url`,
        rows.length === 1 && !!pub && stored === pub, rows.length ? String(stored) : "no row written");
    } else {
      const withUrl = seen.rows.filter((r) => r.body.includes(MEDIA_BASE));
      check(`${at} · NO row body anywhere carries a media url — this flow publishes nothing`, withUrl.length === 0, withUrl.map((r) => r.table).join(", "));
    }

    // WHAT A VISITOR WOULD DO: no credentials at all.
    if (pub) publicUrls.push(pub);
    const got = pub ? await anonGet(pub) : { status: 0, type: "", bytes: Buffer.alloc(0), error: "no public url" };
    check(`${at} · an anonymous GET of the public url returns the same bytes`,
      got.status === 200 && got.type.startsWith("image/") && got.bytes.equals(PNG), `${got.status} ${got.type} ${got.bytes.length}B ${got.error || ""}`);

    const shot = path.join(SHOTS, `media-door-live-${flow.key}-${w.label}.png`);
    await page.screenshot({ path: shot });
    artifacts.push(path.relative(REPO, shot).replaceAll("\\", "/"));
    await ctx.close();
    completed++;
  }
} finally {
  // CLEANUP, ALWAYS: every key really PUT is removed through the door. Cloudflare keeps serving a read
  // object from its edge for a while (FOR-ANDREW.md), so removal is confirmed against the ORIGIN with a
  // query string the edge has never seen.
  console.log(`\n  cleanup — removing ${uploaded.length} test object(s) through the door`);
  for (const key of uploaded) {
    const r = await door({ action: "remove", store: "media", business_id: biz, key });
    check(`cleanup · the door removed ${key.slice(0, 8)}…/${key.split("/")[1]}`, r.status === 200, `${r.status} ${JSON.stringify(r.body)}`);
    const gone = await anonGet(`${MEDIA_BASE}/${key}?gone=${randomUUID()}`);
    check(`cleanup · the origin no longer has it (404)`, gone.status === 404, `${gone.status}${gone.error ? " " + gone.error : ""}`);
  }
}

// THE REFUSED CASE, LIVE: another business's folder and another business's key, against the deployed door.
const OTHER_BIZ = "00000000-0000-4000-8000-00000000beef";
const foreignStart = await door({ action: "start", store: "media", business_id: OTHER_BIZ, folder: "gallery", file_id: randomUUID(), content_type: "image/png", claimed_bytes: 70 });
check("refused · a start for ANOTHER business's folder is answered 401 by the deployed door", foreignStart.status === 401, `${foreignStart.status}`);
const foreignRemove = await door({ action: "remove", store: "media", business_id: biz, key: `${OTHER_BIZ}/gallery/${randomUUID()}.png` });
check("refused · removing ANOTHER business's key is answered 404", foreignRemove.status === 404, `${foreignRemove.status}`);

check("console is clean at every width of both screens", consoleNoise.length === 0, consoleNoise.slice(0, 3).join(" | "));

// CANARY, re-judged every run: the anonymous reader must be able to say NO. A key nobody uploaded
// has to read back as not-200; if it read 200 the "anonymous GET returns the bytes" lines prove nothing.
const nothing = await anonGet(`${MEDIA_BASE}/${biz}/gallery/${randomUUID()}.png`);

const failed = failures.length > 0;
const expectedTargets = FLOWS.length * WIDTHS.length;
const { path: receiptPath } = writeReceipt({
  check_id: "media-door-live",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: expectedTargets,
  discovered_targets: expectedTargets,
  attempted_targets: expectedTargets,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 69,
  assertion_floor: "9 per flow-and-width x 6 = 54 (picker count, one deployed-door call, zero storage uploads, key, "
    + "public url, one R2 PUT answered 200, the screen's words, the stored url or its absence, anonymous GET) + 2 "
    + "cleanup per object x 6 objects = 12 + 2 refusals + 1 console = 69.",
  canary: {
    id: "the-anonymous-reader-can-say-no",
    observed_failure: nothing.status !== 200,
    what: "an anonymous GET of a key nobody uploaded under this business",
    rule: "must not read 200, or the 'anonymous GET returns the bytes' assertions cannot tell a stored object from any answer",
  },
  failures,
  artifacts,
  dimensions: {
    roadmap: "0.11bc2",
    break: BREAK || undefined,
    public_base: MEDIA_BASE,
    flows: FLOWS.map((f) => `${f.key} · ${f.screen} · ${f.url}`),
    widths: WIDTHS.map((w) => w.label),
    supplied: "ONLY database writes to gallery_images and site_intake (+ the brief's saved step as one read), and the "
      + "old Supabase bucket's writes (answered so a fallback is recorded and spends nothing). The door, the signed PUT, "
      + "R2 and the public address are all REAL.",
    wrote: "one 70-byte PNG per flow and width into the real business-media bucket, each removed through the door in a "
      + "finally block. No database row, no deploy, no flag flipped, no secret touched.",
    objects_put: uploaded.length,
  },
  warnings: [
    "The browser-pressed REFUSAL (a stranger's public_url) cannot be produced by a real door, so it stays media-door-browser.mjs's. "
    + "Here the refusal is asked of the deployed door directly: another business's folder 401, another business's key 404.",
    "A removed object can keep reading 200 from Cloudflare's edge for minutes (FOR-ANDREW.md); removal is judged at the origin.",
  ],
});
console.log(`\n${passed}/${assertions} passed, ${failures.length} failed\nreceipt  ${receiptPath}  —  validate: node scripts/receipt.mjs`);
await browser.close();
process.exit(failed ? 1 : 0);
