// ROADMAP 0.11be — THE GALLERY'S REMOVE BUTTON, PRESSED IN A REAL BROWSER, WITH
// NO DATABASE AT ALL.
//
//   node scripts/gallery-remove-offline.mjs                    (BASE=http://127.0.0.1:5180 for another server)
//   node scripts/gallery-remove-offline.mjs --break=row-only   must be red
//   node scripts/gallery-remove-offline.mjs --break=foreign    must be red
//
// The same eight presses as `scripts/gallery-remove-browser.mjs`, which stays
// untouched (Andrew, 2026-10-13: prove against the unedited checks, new
// assertions in a new file). That one needs `.env` and a dev server that has
// the platform's settings; a belt job copy has neither, by design, and its
// server answers "Missing VITE_SUPABASE_URL" on every signed-in screen.
//
// So here the back end is STOOD IN INSIDE THE BROWSER: every module the dev
// server sends gets a made-up Supabase address, the demo owner's session is
// made up, and every request to that address is answered below from a
// four-row fixture. **No credential is read, no request leaves the browser
// for any Supabase host, and nothing is written anywhere.** Any request to
// the stand-in that this file does not expect is counted and fails the run.
//
// Widths: 1440x900, 768x1024, 392x844 and 390x844 (the item names 1440 and
// 392; the belt's brief adds 768 and 390). Per width: six made-up gallery
// rows, eight presses, each judged on its exact sequence of storage and row
// calls (see the sister script's header for what each row is).
//
// `--break=row-only` makes `removeBusinessPhotoAt` return at once in the
// module the browser RUNS (the pre-0.11be handler: row delete only).
// `--break=foreign` deletes the business-id comparison from `storedMediaAt`.
// Each swap is asserted to have landed (docs/gotchas.md 102, 113). An unknown
// `--break=` exits 2 and writes no receipt.

import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(REPO, ".manager-shots");
const BASE_URL = process.env.BASE || "http://localhost:5173";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const KNOWN_BREAKS = ["row-only", "foreign"];
if (BREAK && !KNOWN_BREAKS.includes(BREAK)) {
  console.error(`Unknown --break=${BREAK}. Known: ${KNOWN_BREAKS.join(", ")}.\nNOTHING ran and NO receipt was written. This is not a pass.`);
  process.exit(2);
}

// THE STAND-IN BACK END. `.invalid` can never resolve, so a request this file
// forgot to answer fails loudly instead of reaching a real project.
const SB = "https://stand-in.supabase.invalid";
const BIZ = "00000000-0000-4000-8000-0000000000b1";
const USER = { id: "00000000-0000-4000-8000-000000000001", email: "demo@detailplatform.com", aud: "authenticated",
  role: "authenticated", app_metadata: {}, user_metadata: {} };
const SESSION = { access_token: "stand-in", token_type: "bearer", expires_in: 36000,
  expires_at: Math.floor(Date.now() / 1000) + 36000, refresh_token: "stand-in", user: USER };
const TABLES = {
  business_users: [{ business_id: BIZ, user_id: USER.id, role: "owner", label: null, permissions: [], first_name: "Jordan",
    businesses: { name: "Coastline Auto Detailing" } }],
  businesses: [{ id: BIZ, slug: "demo-detail", name: "Coastline Auto Detailing", timezone: "America/Los_Angeles",
    status: "active", plan_tier: "founding", is_demo: true, notification_emails: [] }],
  business_settings: [{ business_id: BIZ }],
  business_branding: [{ business_id: BIZ, primary_color: "#0ea5e9", secondary_color: "#0ea5e9", logo_url: null }],
};

const MEDIA = "https://media.detailingplatform.com";
const OLD = `${SB}/storage/v1/object/public/business-media`;
const EXT = "https://cdn.example.test";
const OTHER = "00000000-0000-4000-8000-00000000beef";
const REFUSAL = "Could not remove the image from storage. Try again.";
const ROW_REFUSAL = "row delete refused by the stand-in";
const u = (n) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");

const fixture = (biz) => {
  const k = {
    r2: `${biz}/gallery/${u(11)}.png`, old: `${biz}/gallery/${u(12)}.jpg`,
    before: `${biz}/gallery/${u(13)}.webp`, after: `${biz}/gallery/${u(14)}.jpeg`,
    ext: `${biz}/gallery/${u(15)}.png`, foreign: `${OTHER}/gallery/${u(16)}.png`, rowfail: `${biz}/gallery/${u(17)}.png`,
  };
  const row = (n, name, extra) => ({ id: u(n), name, business_id: biz, kind: "single", image_url: null,
    before_url: null, after_url: null, caption: null, sort_order: n, is_active: true, created_at: started_at, ...extra });
  const rows = [
    row(1, "r2", { image_url: `${MEDIA}/${k.r2}` }),
    row(2, "old", { image_url: `${OLD}/${k.old}` }),
    row(3, "pair", { kind: "before_after", before_url: `${MEDIA}/${k.before}`, after_url: `${OLD}/${k.after}` }),
    row(4, "ext", { image_url: `${EXT}/${k.ext}` }),
    row(5, "foreign", { image_url: `${MEDIA}/${k.foreign}` }),
    row(6, "rowfail", { image_url: `${MEDIA}/${k.rowfail}` }),
  ];
  const id = Object.fromEntries(rows.map((r) => [r.name, r.id]));
  const steps = [
    ["r2", "refused by the door", [`door ${k.r2}`], { stays: true, says: REFUSAL }],
    ["r2", "retried", [`door ${k.r2}`, `row ${id.r2} ok`], { stays: false }],
    ["old", "older Supabase object", [`storage ${k.old}`, `row ${id.old} ok`], { stays: false }],
    ["pair", "both members of a before/after pair", [`door ${k.before}`, `storage ${k.after}`, `row ${id.pair} ok`], { stays: false }],
    ["ext", "external address shaped like a key", [`row ${id.ext} ok`], { stays: false }],
    ["foreign", "another business's object", [`row ${id.foreign} ok`], { stays: false }],
    ["rowfail", "row delete refused", [`door ${k.rowfail}`, `row ${id.rowfail} refused`], { stays: true, says: ROW_REFUSAL }],
    ["rowfail", "row delete retried", [`door ${k.rowfail}`, `row ${id.rowfail} ok`], { stays: false }],
  ];
  return { rows, steps };
};
const sameCalls = (got, want) => JSON.stringify(got) === JSON.stringify(want);

const WIDTHS = [[1440, 900], [768, 1024], [392, 844], [390, 844]].map(([width, height]) => ({ label: String(width), width, height }));
const STEPS_PER_WIDTH = 8;
let passed = 0, assertions = 0, completed = 0;
const failures = [], artifacts = [], consoleNoise = [], expectedNoise = [];
const check = (name, ok, detail = "") => {
  assertions++;
  if (ok) { passed++; console.log(`    ok    ${name}`); }
  else { failures.push({ assertion: name, detail: String(detail).slice(0, 300) }); console.log(`    FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};
const landed = { served: 0, swapped: 0 };
const SWAPS = {
  "row-only": ["/src/lib/upload.js", "export async function removeBusinessPhotoAt(businessId, url) {",
    "export async function removeBusinessPhotoAt(businessId, url) { return;"],
  foreign: ["/src/lib/photo-rules.js", 'if (m[1] !== businessId) return { kind: "foreign" };', ""],
};

mkdirSync(SHOTS, { recursive: true });
console.log(`Gallery Remove, stand-in back end, at ${BASE_URL}${BREAK ? `  (--break=${BREAK}: MUST be red)` : ""}\n`);
const browser = await chromium.launch();
try {
  for (const w of WIDTHS) {
    console.log(`  at ${w.label}x${w.height}`);
    const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height } });
    await ctx.addInitScript((s) => {
      localStorage.setItem("sb-stand-in-auth-token", s);
      localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
      localStorage.setItem("dp.tour", "1");
    }, JSON.stringify(SESSION));
    const page = await ctx.newPage();
    // One goto per context, so no module is served from a cache we never saw (gotchas 113).
    await (await ctx.newCDPSession(page)).send("Network.setCacheDisabled", { cacheDisabled: true });
    page.on("console", (m) => {
      if (m.type() !== "error" && m.type() !== "warning") return;
      const at = m.location()?.url || "";
      // The two refusals served on purpose log as failed loads: counted, not filtered unseen.
      if (/Failed to load resource/.test(m.text()) && (/functions\/v1\/photo-door/.test(at) || /rest\/v1\/gallery_images/.test(at))) {
        expectedNoise.push(`${w.label} · ${at.replace(/\?.*/, "")}`);
      } else consoleNoise.push(`${w.label} · ${m.type()} · ${m.text().slice(0, 200)}`);
    });
    page.on("pageerror", (e) => consoleNoise.push(`${w.label} · pageerror · ${String(e.message).slice(0, 200)}`));
    page.on("dialog", (d) => d.accept());

    let fx = null, rows = null, gets = 0, rowFailOnce = true, doorFailOnce = true;
    const calls = [], unexpected = [];
    // Every app module gets the stand-in address (and, under --break, the swap).
    await page.route(/\/src\/.*\.(js|jsx)(\?.*)?$/, async (route) => {
      const res = await route.fetch();
      let body = await res.text();
      body = body.replace(/^import\.meta\.env = \{/, `import.meta.env = {"VITE_SUPABASE_URL":"${SB}","VITE_SUPABASE_ANON_KEY":"stand-in",`);
      if (BREAK && new URL(route.request().url()).pathname === SWAPS[BREAK][0]) {
        landed.served++;
        if (body.includes(SWAPS[BREAK][1])) landed.swapped++;
        body = body.replace(SWAPS[BREAK][1], SWAPS[BREAK][2]);
      }
      await route.fulfill({ response: res, body, headers: { ...res.headers(), "cache-control": "no-store" } });
    });
    await page.route(`${SB}/**`, async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const p = url.pathname;
      if (p === "/auth/v1/user") return route.fulfill({ json: USER });
      if (p === "/functions/v1/photo-door") {
        const body = JSON.parse(req.postData() || "{}");
        if (body.action !== "remove" || body.store !== "media") {
          unexpected.push(`door ${body.action}/${body.store}`);
          return route.fulfill({ status: 400, json: { error: "unexpected door call" } });
        }
        calls.push(`door ${body.key}`);
        // As the deployed door does for a key outside the caller's business.
        if (!String(body.key).startsWith(`${body.business_id}/`)) return route.fulfill({ status: 404, json: { error: "Image not found" } });
        if (body.key === fx.rows[0].image_url.slice(MEDIA.length + 1) && doorFailOnce) {
          doorFailOnce = false;
          return route.fulfill({ status: 503, json: { error: REFUSAL } });
        }
        return route.fulfill({ json: { removed: true } });
      }
      if (p.startsWith("/storage/v1/object/")) {
        if (req.method() === "GET" && p.startsWith("/storage/v1/object/public/")) return route.fulfill({ body: PNG, contentType: "image/png" });
        if (req.method() === "DELETE" && p === "/storage/v1/object/business-media") {
          for (const k of JSON.parse(req.postData() || "{}").prefixes || []) calls.push(`storage ${k}`);
          return route.fulfill({ json: [] });
        }
      }
      if (p.startsWith("/rest/v1/")) {
        const table = p.slice("/rest/v1/".length);
        if (table === "gallery_images" && req.method() === "GET") {
          if (!fx) {
            fx = fixture((url.searchParams.get("business_id") || "").replace(/^eq\./, ""));
            rows = fx.rows.map((r) => ({ ...r }));
          }
          gets++;
          return route.fulfill({ json: rows.map(({ name, ...r }) => r) });
        }
        if (table === "gallery_images" && req.method() === "DELETE") {
          const id = (url.searchParams.get("id") || "").replace(/^eq\./, "");
          if (id === fx.rows[5].id && rowFailOnce) {
            rowFailOnce = false;
            calls.push(`row ${id} refused`);
            return route.fulfill({ status: 409, json: { message: ROW_REFUSAL, code: "stand-in" } });
          }
          calls.push(`row ${id} ok`);
          rows = rows.filter((r) => r.id !== id);
          return route.fulfill({ status: 204, body: "" });
        }
        if (req.method() === "GET" || req.method() === "HEAD") {
          // Naive eq.-filter over the fixture; any other table is empty.
          const found = (TABLES[table] || []).filter((r) => [...url.searchParams]
            .every(([c, v]) => !v.startsWith("eq.") || !(c in r) || String(r[c]) === v.slice(3)));
          if (/vnd\.pgrst\.object/.test(req.headers().accept || "")) {
            return found.length ? route.fulfill({ json: found[0] }) : route.fulfill({ status: 406, json: { code: "PGRST116", message: "no rows" } });
          }
          return route.fulfill({ json: found, headers: { "content-range": `0-${Math.max(found.length - 1, 0)}/${found.length}` } });
        }
        if (table.startsWith("rpc/")) return route.fulfill({ json: null });
      }
      unexpected.push(`${req.method()} ${p}`);
      return route.fulfill({ status: 400, json: { error: "unexpected call to the stand-in" } });
    });
    await page.route(`${MEDIA}/**`, (r) => r.fulfill({ body: PNG, contentType: "image/png" }));
    await page.route(`${EXT}/**`, (r) => r.fulfill({ body: PNG, contentType: "image/png" }));

    await page.goto(`${BASE_URL}/app?settings=gallery`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".gallery-grid img", { timeout: 30000 }).catch(() => {});
    check(`${w.label} · the six rows are on screen`, await page.locator(".gallery-grid > div").count() === 6,
      `${await page.locator(".gallery-grid > div").count()} tiles`);
    if (BREAK) check(`${w.label} · the sabotage landed in the module the browser ran`, landed.swapped > 0, `${landed.swapped}/${landed.served}`);
    if (!fx) { check(`${w.label} · the screen asked for its gallery`, false); await ctx.close(); continue; }

    for (const [name, what, want, after] of fx.steps) {
      const row = fx.rows.find((r) => r.name === name);
      const src = row.image_url || row.after_url;
      const tile = page.locator(".gallery-grid > div").filter({ has: page.locator(`img[src="${src}"]`) });
      const label = `${w.label} · ${name} — ${what}`;
      if (!(await tile.count())) { check(`${label}: its tile was there to press`, false); continue; }
      const before = calls.length, g = gets;
      await tile.getByRole("button", { name: "Remove" }).click();
      // `load()` runs at the end of every press, refused or not: the re-read is the settle signal.
      for (let i = 0; i < 100 && gets === g; i++) await page.waitForTimeout(50);
      await page.waitForTimeout(250);
      const got = calls.slice(before);
      check(`${label}: sent exactly ${want.join(" → ")}`, sameCalls(got, want), `got ${got.join(" → ") || "nothing"}`);
      check(`${label}: the row ${after.stays ? "stays" : "is gone"}`, ((await tile.count()) > 0) === after.stays);
      const box = page.locator(".error-box");
      if (after.says) {
        const text = (await box.count()) ? await box.textContent() : "";
        check(`${label}: the screen says why`, text.includes("That photo was not removed.") && text.includes(after.says), text || "no message");
        await box.scrollIntoViewIfNeeded().catch(() => {});
        const painted = await box.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return r.width > 0 && r.height > 0 && r.left >= -1 && r.right <= innerWidth + 1 && (el === hit || el.contains(hit));
        }).catch(() => false);
        check(`${label}: and the reason is on screen, uncovered, inside the width`, painted);
        if (name === "r2") {
          const shot = path.join(SHOTS, `gallery-remove-offline-${BREAK || "clean"}-${w.label}-refused.png`);
          await page.screenshot({ path: shot });
          artifacts.push(path.relative(REPO, shot).replace(/\\/g, "/"));
        }
      } else {
        check(`${label}: no error left on screen`, (await box.count()) === 0, (await box.count()) ? await box.textContent() : "");
      }
      completed++;
    }
    const sent = calls.filter((c) => !c.startsWith("row "));
    check(`${w.label} · no storage call ever named another business or an external address`,
      !sent.some((c) => c.includes(OTHER) || c.includes("cdn.example.test")), sent.join(" | "));
    check(`${w.label} · nothing unexpected reached the stand-in`, unexpected.length === 0, unexpected.join(" | "));
    check(`${w.label} · the gallery ends empty`, await page.locator(".gallery-grid > div").count() === 0
      && await page.getByText("No photos yet.").isVisible());
    const shot = path.join(SHOTS, `gallery-remove-offline-${BREAK || "clean"}-${w.label}-end.png`);
    await page.screenshot({ path: shot });
    artifacts.push(path.relative(REPO, shot).replace(/\\/g, "/"));
    await ctx.close();
  }
  check("the console is clean at every width (beyond the two refusals served per width)", consoleNoise.length === 0, consoleNoise.slice(0, 3).join(" | "));
  check("exactly the two served refusals logged per width", expectedNoise.length === 2 * WIDTHS.length, expectedNoise.join(" | "));
} finally {
  await browser.close();
}

const failed = failures.length;
const expectedTargets = WIDTHS.length * STEPS_PER_WIDTH;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions, ${completed}/${expectedTargets} presses.`);
if (BREAK) console.log(`  note  --break=${BREAK} was set: a GREEN run here is the failure.`);

// THE CANARY, re-judged every run: the pre-0.11be handler sent only the row
// delete on the first press. The verdict above must reject that sequence.
const probe = fixture(OTHER);
const preFixRejected = !sameCalls([`row ${probe.rows[0].id} ok`], probe.steps[0][2]);
const { path: receiptPath } = writeReceipt({
  check_id: "gallery-remove-offline",
  started_at,
  status: failed || completed < expectedTargets ? "fail" : "pass",
  expected_targets: expectedTargets,
  discovered_targets: expectedTargets,
  attempted_targets: expectedTargets,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 30 * WIDTHS.length + 2,
  assertion_floor: "per width: 1 six-tiles + 8 presses x 3 (calls, row state, message-or-none) + 2 refusals x 1 painted "
    + "+ 3 closing (no foreign/external storage call, nothing unexpected, gallery ends empty) = 30; x 4 widths + 2 "
    + "console = 122, +1 per width with --break (the swap landed).",
  canary: {
    id: "the-row-only-handler",
    observed_failure: preFixRejected,
    what: "Gallery.jsx remove() before 0.11be deleted the row and sent no storage call",
    rule: "the per-press verdict (exact call sequence) rejects a press that sent only the row delete",
  },
  failures,
  artifacts,
  dimensions: {
    roadmap: "0.11be",
    widths: WIDTHS.map((w) => `${w.width}x${w.height}`),
    sabotage: BREAK || null,
    break: BREAK || undefined,
    back_end: `stood in inside the browser at ${SB}: no credential read, no Supabase host contacted, nothing written`,
    unjudgeable: [
      "That the deployed door really erases the R2 object and that a warmed public URL stops answering: "
      + "that is 0.11bd's live proof, after Andrew's release.",
    ],
  },
});
console.log(`receipt  ${receiptPath}  —  validate: node scripts/receipt.mjs`);
process.exit(failed ? 1 : 0);
