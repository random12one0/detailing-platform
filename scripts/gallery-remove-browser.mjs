// ROADMAP 0.11be — THE GALLERY'S REMOVE BUTTON, PRESSED IN A REAL BROWSER.
//
//   npm run dev --prefix app
//   node --env-file=.env scripts/gallery-remove-browser.mjs
//   node --env-file=.env scripts/gallery-remove-browser.mjs --break=row-only
//   node --env-file=.env scripts/gallery-remove-browser.mjs --break=foreign
//   BASE=http://localhost:5180 ... to aim at another dev server
//
// Dev server + the demo owner's login (`DEMO_OWNER_PW`). **IT WRITES NOTHING**:
// the gallery's rows, the photo door, Supabase Storage's remove and the row
// deletes are all answered here, so no object and no row is touched anywhere.
//
// WHAT IT ASKS, at 1440 and 392, on six made-up gallery rows of the demo
// business (the business id is read off the screen's own query):
//
//   r2       one photo on R2. The door REFUSES the first removal: the row must
//            stay, the screen must say why, and no row delete may be sent. The
//            second press must call the door again, then delete the row.
//   old      one photo from before the switch, on Supabase Storage: its exact
//            key goes to Supabase's remove, never to the door, then the row.
//   pair     a before/after pair, one member on each store: BOTH are removed
//            before the row.
//   ext      an external address whose path is shaped exactly like one of our
//            keys: no storage call at all, the row goes.
//   foreign  another business's R2 address: no storage call naming it, the
//            row goes (the file may be in use by its real owner).
//   rowfail  the door removes the file, the ROW delete is refused: the row and
//            the reason stay; the retry removes again (already-gone is success)
//            and then the row goes.
//
// Every step is judged on the exact sequence of storage and row calls it
// made, so "the file before the row" is an order on the wire, not a reading.
//
// `--break=row-only` makes `removeBusinessPhotoAt` a no-op in the module the
// browser RUNS (the repo file is untouched) — the pre-0.11be handler, which
// deleted only the row. `--break=foreign` deletes the business-id comparison
// from `storedMediaAt`. Both must turn the run red; the substitution is
// asserted to have landed (docs/gotchas.md 102 and 113). An unknown `--break=`
// exits 2 and writes no receipt.

import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(REPO, ".manager-shots");
const BASE_URL = process.env.BASE || "http://localhost:5173";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const KNOWN_BREAKS = ["row-only", "foreign"];
const stop = (why) => {
  console.error(`\n${why}\nNOTHING ran and NO receipt was written. This is not a pass.`);
  process.exit(2);
};
if (BREAK && !KNOWN_BREAKS.includes(BREAK)) stop(`Unknown --break=${BREAK}. Known: ${KNOWN_BREAKS.join(", ")}.`);
const SB = process.env.SUPABASE_URL;
if (!SB) stop("SKIPPED — needs SUPABASE_URL (run with node --env-file=.env).");
if (!SB.includes("kguqylyzgyzfktkfnhjb")) stop(`REFUSING: SUPABASE_URL is not this platform's project — ${SB}`);
const OWNER = demoOwner();

const MEDIA = "https://media.detailingplatform.com";
const OLD = `${SB.replace(/\/$/, "")}/storage/v1/object/public/business-media`;
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
  // name -> [what each press must send, in order]
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
// THE ONE VERDICT every step is judged by, and the canary re-judges it below.
const sameCalls = (got, want) => JSON.stringify(got) === JSON.stringify(want);

const WIDTHS = [{ label: "1440", width: 1440, height: 900 }, { label: "392", width: 392, height: 844 }];
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
console.log(`Gallery Remove on the demo owner's gallery at ${BASE_URL}${BREAK ? `  (--break=${BREAK}: MUST be red)` : ""}\n`);
const browser = await chromium.launch();
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
    localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
    localStorage.setItem("dp.tour", "1");
  });
  const s = await c.storageState();
  await c.close();
  return s;
})();

try {
  for (const w of WIDTHS) {
    console.log(`  at ${w.label}x${w.height}`);
    const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height }, storageState: signedIn });
    const page = await ctx.newPage();
    await (await ctx.newCDPSession(page)).send("Network.setCacheDisabled", { cacheDisabled: true });
    page.on("console", (m) => {
      if (m.type() !== "error" && m.type() !== "warning") return;
      const at = m.location()?.url || "";
      // THE TWO REFUSALS THIS RUN SERVES ON PURPOSE log as failed loads; they
      // are counted (exactly two per width) rather than filtered unseen.
      if (/Failed to load resource/.test(m.text()) && (/functions\/v1\/photo-door/.test(at) || /rest\/v1\/gallery_images/.test(at))) {
        expectedNoise.push(`${w.label} · ${at.replace(/\?.*/, "")}`);
      } else consoleNoise.push(`${w.label} · ${m.type()} · ${m.text().slice(0, 200)}`);
    });
    page.on("pageerror", (e) => consoleNoise.push(`${w.label} · pageerror · ${String(e.message).slice(0, 200)}`));
    page.on("dialog", (d) => d.accept());

    let fx = null, rows = null, gets = 0, rowFailOnce = true, doorFailOnce = true;
    const calls = [], unexpected = [];
    if (BREAK) {
      const [file, from, to] = SWAPS[BREAK];
      await page.route(`**${file}*`, async (route) => {
        const src = await (await fetch(route.request().url())).text();
        landed.served++;
        if (src.includes(from)) landed.swapped++;
        await route.fulfill({ status: 200, contentType: "text/javascript", headers: { "cache-control": "no-store" }, body: src.replace(from, to) });
      });
    }
    await page.route("**/rest/v1/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const table = url.pathname.replace(/^\/rest\/v1\//, "");
      if (table === "gallery_images" && req.method() === "GET") {
        if (!fx) {
          const biz = (url.searchParams.get("business_id") || "").replace(/^eq\./, "");
          fx = fixture(biz);
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
      if (req.method() === "GET" || req.method() === "HEAD" || table.startsWith("rpc/")) return route.continue();
      unexpected.push(`${req.method()} ${table}`);
      return route.fulfill({ status: 201, json: [] });
    });
    // The door, behaving as the deployed one does for a foreign key (404).
    await page.route("**/functions/v1/photo-door", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      if (body.action !== "remove" || body.store !== "media") {
        unexpected.push(`door ${body.action}/${body.store}`);
        return route.fulfill({ status: 400, json: { error: "unexpected door call" } });
      }
      calls.push(`door ${body.key}`);
      if (!String(body.key).startsWith(`${body.business_id}/`)) return route.fulfill({ status: 404, json: { error: "Image not found" } });
      if (body.key === fx.rows[0].image_url.slice(MEDIA.length + 1) && doorFailOnce) {
        doorFailOnce = false;
        return route.fulfill({ status: 503, json: { error: REFUSAL } });
      }
      return route.fulfill({ json: { removed: true } });
    });
    await page.route("**/storage/v1/object/**", async (route) => {
      const req = route.request();
      if (req.method() === "GET" && /\/object\/public\//.test(req.url())) return route.fulfill({ body: PNG, contentType: "image/png" });
      if (req.method() === "DELETE" && /\/object\/business-media$/.test(new URL(req.url()).pathname)) {
        for (const p of JSON.parse(req.postData() || "{}").prefixes || []) calls.push(`storage ${p}`);
        return route.fulfill({ json: [] });
      }
      unexpected.push(`${req.method()} ${req.url().slice(0, 120)}`);
      return route.fulfill({ status: 400, json: { error: "unexpected storage call" } });
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
      const stays = (await tile.count()) > 0;
      check(`${label}: the row ${after.stays ? "stays" : "is gone"}`, stays === after.stays);
      const box = page.locator(".error-box");
      if (after.says) {
        const text = (await box.count()) ? await box.textContent() : "";
        check(`${label}: the screen says why`, text.includes("That photo was not removed.") && text.includes(after.says), text || "no message");
        await box.scrollIntoViewIfNeeded().catch(() => {});
        const painted = await box.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return r.width > 0 && r.height > 0 && r.right <= innerWidth + 1 && (el === hit || el.contains(hit));
        }).catch(() => false);
        check(`${label}: and the reason is on screen, uncovered, inside the width`, painted);
        if (name === "r2") {
          const shot = path.join(SHOTS, `gallery-remove-${BREAK || "clean"}-${w.label}-refused.png`);
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
    check(`${w.label} · nothing else was written anywhere`, unexpected.length === 0, unexpected.join(" | "));
    check(`${w.label} · the gallery ends empty`, await page.locator(".gallery-grid > div").count() === 0
      && await page.getByText("No photos yet.").isVisible());
    const shot = path.join(SHOTS, `gallery-remove-${BREAK || "clean"}-${w.label}-end.png`);
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
  check_id: "gallery-remove-browser",
  started_at,
  status: failed || completed < expectedTargets ? "fail" : "pass",
  expected_targets: expectedTargets,
  discovered_targets: expectedTargets,
  attempted_targets: expectedTargets,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 62,
  assertion_floor: "per width: 1 six-tiles + 8 presses x 3 (calls, row state, message-or-none) + 2 refusals x 1 painted "
    + "+ 3 closing (no foreign/external storage call, nothing else written, gallery ends empty) = 30; x 2 widths + 2 "
    + "console = 62, +1 per width with --break (the swap landed). A screen that renders no tiles books failures, not skips.",
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
    widths: WIDTHS.map((w) => w.label),
    sabotage: BREAK || null,
    break: BREAK || undefined,
    intercepted: "gallery_images GET (six made-up rows) and DELETE, the photo-door function, Supabase Storage's "
      + "remove and public reads, and image reads on the media and example hosts. Nothing in app/src is edited.",
    wrote_nothing: "no R2 object, no Supabase Storage object, no gallery_images row",
    unjudgeable: [
      "That the deployed door really erases the R2 object and that a warmed public URL stops answering: "
      + "that is 0.11bd's live proof, after Andrew's release. This run proves the button calls the right removal "
      + "with the right key, in the right order, and keeps the row on any refusal.",
    ],
  },
});
console.log(`receipt  ${receiptPath}  —  validate: node scripts/receipt.mjs`);
process.exit(failed ? 1 : 0);
