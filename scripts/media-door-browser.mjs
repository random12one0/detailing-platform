// ROADMAP 0.11b — THE BUSINESS-MEDIA DOOR PATH, PRESSED IN A REAL BROWSER.
//
//   set -a; . ./.env; set +a
//   npm run dev --prefix app
//   node scripts/media-door-browser.mjs
//   node scripts/media-door-browser.mjs --break=unbound
//   node scripts/media-door-browser.mjs --break=public-url
//
// Dev server + the seeded demo tenant + credentials (the owner login only).
// **IT WRITES NOTHING ANYWHERE**: no R2 object, no Supabase Storage object, no
// `gallery_images` row, no migration, no deploy, no flag flipped on disk.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS: 0.11b's FIRST ATTEMPT CALLED BROWSER EVIDENCE UNREACHABLE
// ---------------------------------------------------------------------------
// Its words: *"no browser evidence for the branch that changed, which is not a
// skipped check but an unreachable one: `readMediaStart` is only called when
// `MEDIA_VIA_DOOR` is `true`, the flag is `false`, and `photo-door` has never
// been deployed, so there is no 1440 or 392 press to make."*
//
// Both halves of that are true and neither makes it unreachable, because
// **neither one is on disk-and-therefore-fixed — they are two responses this
// browser receives, and a response is the one thing a browser script can
// supply.** 0.11d1 had already proved the shape on the sibling screen: it could
// not fill the photo cap, so it answered the ONE thing it could not arrange —
// the allowance RPC — and let the product do everything after it. This is the
// same move with two answers instead of one.
//
// ---------------------------------------------------------------------------
// WHAT IS SUPPLIED, EXACTLY, AND WHAT IS THE PRODUCT'S OWN
// ---------------------------------------------------------------------------
// THREE responses are intercepted. Nothing in `app/src` is edited; the working
// tree is untouched for the whole run, so `git status` is the proof of that
// rather than this sentence.
//
//   1 · `/src/lib/photo-door.js` — the module Vite serves, with the ONE literal
//       `MEDIA_VIA_DOOR = false` rewritten to `true` in flight. That is the
//       exact edit `FOR-ANDREW.md`'s `MEDIA_VIA_DOOR` bullet asks Andrew for,
//       made to the response rather than to the file, so the branch under test
//       is the real one and the repo keeps its OFF default. **The substitution
//       is ASSERTED TO HAVE LANDED** — `docs/gotchas.md` 102 is this repo's own
//       case of a scripted edit that silently never matched and printed an
//       ordinary clean run, and here a miss would measure the OFF path while
//       every line read normally.
//
//   2 · `POST /functions/v1/photo-door` — the door, which is not deployed
//       (`deployed-inventory.mjs` has named it absent since it was written).
//       **Its answer is DERIVED, not written out**: `photo-rules.js`'s own
//       `mediaPath()` mints the key from the request body the app really sent,
//       and `r2.ts`'s own `mediaBase()` + `publicUrl()` derive the url, wired
//       exactly as `photo-door/index.ts` line 133 wires them. Criterion 2 is
//       about that derivation, so a template string here would test nothing.
//
//   3 · the signed PUT, and the `gallery_images` insert. The PUT answers 200
//       because R2 is not ours to spend; the insert answers 201 **without
//       reaching the database**, which is why no row is written — and its
//       request body is read, because the url in it is the permanent record
//       this whole item is about.
//
// Everything else is the product: `Gallery.jsx` presses, `upload.js` reads the
// flag and mints the file id, `readMediaStart` judges the answer, `doorError`
// maps the status, and `Gallery.jsx` renders the sentence into `.error-box`.
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS AT EACH WIDTH — the case that works AND the case that is refused
// ---------------------------------------------------------------------------
//   THE CASE THAT WORKS (a 1x1 PNG, the kind of file a detailer picks):
//     1. the flag substitution landed in the module the browser ran;
//     2. the browser PUT to the door's signed url and to nothing else;
//     3. ZERO Supabase Storage UPLOADS happened — criterion 4 asked of the live
//        runtime rather than of the source, which is the only place a fallback
//        could still be hiding. **Uploads, not traffic:** a public GET of an
//        image stored before the switch is the thing `upload.js` promises keeps
//        working, and counting those printed a false defect at all three widths;
//     4. the key the door minted is this business's own `<biz>/gallery/<id>.png`;
//     5. the url that reached `gallery_images.image_url` is EXACTLY
//        `publicUrl(R2_MEDIA_BASE, key)` for the key that was really PUT;
//     6. the screen says the photo was added.
//
//   THE CASE THAT IS REFUSED — **the 0.11b fault itself**: a door answer
//   carrying the correct `key` beside ANOTHER BUSINESS's `public_url`. That is
//   the one this item fixed, and it is the sharper of the two fields: a wrong
//   `key` is a failed upload, a wrong `public_url` is the wrong image stored
//   permanently in `gallery_images.image_url` or a brand's `logo_url`.
//     7. the refusal is on the screen;
//     8. it is the sentence the product composes, not a stack trace;
//     9. its PIXELS ARE PAINTED — hit-tested at its own centre after being
//        scrolled into view, because "is it there" and "can it be read" are
//        different questions (`docs/gotchas.md` 100) and the scroll has to come
//        first or a box below the fold reads as covered (`gotchas` 110's shape,
//        which 0.11d1 met at 320);
//    10. NOTHING WAS PUT — the refusal happened before any byte left;
//    11. NOTHING WAS STORED — no `gallery_images` insert was attempted, so the
//        wrong url never became permanent.
//
// ---------------------------------------------------------------------------
// THE TWO SABOTAGES, AND BOTH ARE ON THE REAL TEXT
// ---------------------------------------------------------------------------
// `--break=unbound` leaves the flag alone, which is the state of the repo
// today. The press then goes down the Supabase Storage path and assertion 3 —
// zero storage UPLOADS — reddens, naming the request it saw, and the executed-
// copy proof is asserted ABSENT rather than present. That is the ORIGINAL
// condition reproduced, which is what makes a green mean something.
//
// `--break=public-url` removes the `endsWith` condition 0.11b added, from the
// module text the browser runs — not from a copy. The refusal case then goes
// through: the browser PUTs, and **another business's url is stored**. That is
// the fault itself, on a real screen.
//
// **BOTH ARE ASSERTED TO HAVE LANDED BEFORE ANY COLOUR IS BELIEVED** and both
// declare WHAT BECOMES OBSERVABLE rather than merely "it rejected"
// (`docs/gotchas.md` 95, 102, and 0.11b's own recorded lesson that five of six
// sabotages passed while testing nothing because a removed guard still ends in
// *a* rejection). An unrecognised `--break=` exits 2 and writes no receipt, so
// a broken gate cannot satisfy its own acceptance test (`gotchas` 105).

import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Playwright lives in `app/node_modules`, not the repo root — the same require
// every other browser script here uses.
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
import { writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";
import { mediaPath } from "../app/src/lib/photo-rules.js";
import { DOOR_WORDS } from "../app/src/lib/photo-door.js";
import { mediaBase, publicUrl } from "../supabase/functions/_shared/r2.ts";

const started_at = new Date().toISOString();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const SHOTS = path.join(REPO, ".manager-shots");
const BASE_URL = process.env.BASE || "http://localhost:5173";
const SLUG = "demo-detail";
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

const KNOWN_BREAKS = ["unbound", "public-url"];
if (BREAK && !KNOWN_BREAKS.includes(BREAK)) {
  console.error(`Unknown --break=${BREAK}. Known: ${KNOWN_BREAKS.join(", ")}.`);
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !SERVICE) {
  console.error("\nSKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.");
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
// THE PROJECT IS CONFIRMED BEFORE THE FIRST QUERY. `adtlnvihwrcqcasqcjwd` is
// Andrew's real business and nothing here may touch it.
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) {
  console.error(`\nREFUSING: SUPABASE_URL is not this platform's project — ${URL_}`);
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
const OWNER = demoOwner();

const svc = async (p) => {
  const res = await fetch(URL_ + p, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
  return res.json().catch(() => null);
};
const biz = (await svc(`/rest/v1/businesses?select=id&slug=eq.${SLUG}`))?.[0]?.id;
if (!biz) {
  console.error(`\nSKIPPED — no business with slug "${SLUG}". Run: node scripts/seed-demo.mjs`);
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}

// THE PUBLIC BASE, THROUGH `r2.ts`'s OWN READER, and a test host rather than a
// real one: **no address has been bound in Cloudflare yet** (`FOR-ANDREW.md`
// step 9a2), so there is no true value to use and inventing one that looked
// real would be the worse lie. The trailing slash is deliberate — `mediaBase`
// trims it, and a base built by hand here would not.
const RAW_BASE = "https://img.media.test/business/";
const { base: PUB_BASE, missing: NO_BASE } = mediaBase(() => RAW_BASE);
if (!PUB_BASE || NO_BASE.length) {
  console.error("\nREFUSING: r2.ts's own mediaBase refused a perfectly good https base — the derivation under test is broken.");
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
// ANOTHER BUSINESS, for the refusal. A uuid that is not this tenant's, so the
// url the door is made to answer with names a real-shaped object belonging to
// somebody else — which is exactly the answer that used to be accepted.
const OTHER_BIZ = "00000000-0000-4000-8000-00000000beef";
const PUT_HOST = "https://r2.media.test";

// A real 1x1 PNG. `mediaExtForType` takes `image/png`, so the door mints `.png`
// and the product never re-encodes a business image (a logo must keep its
// transparency), which is why this is a PNG and not a JPEG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);

const WIDTHS = [
  { label: "1440", width: 1440, height: 900 },
  { label: "392", width: 392, height: 844 },
  { label: "320", width: 320, height: 720 },   // the narrowest supported width
];

let passed = 0, assertions = 0, completed = 0;
const expectedTargets = WIDTHS.length;
const failures = [];
const findings = [];
const artifacts = [];
const check = (name, ok, got = "") => {
  assertions++;
  if (ok) { passed++; console.log(`    ok    ${name}`); return true; }
  failures.push(got ? `${name} — got ${got}` : name);
  findings.push(got ? `${name} — got ${got}` : name);
  console.log(`    FAIL  ${name}${got ? ` — got ${got}` : ""}`);
  return false;
};

// ── THE MODULE REWRITE, AND THE ASSERTION THAT IT LANDED ───────────────────
// One function so the sabotage and the ordinary run share it: a rewrite that
// silently matches nothing is `docs/gotchas.md` 102, and it prints the same
// green a real run prints.
const FLAG_FROM = "export const MEDIA_VIA_DOOR = false;";
// **THE REWRITE SIGNS ITSELF, AND THE SIGNATURE IS READ OUT OF THE PAGE.**
// "the body I served contained the edit" and "the module the browser ran
// contained the edit" are different claims, and this script was wrong about
// exactly that difference for its first three runs. A counter incremented at
// module scope answers the second one: it exists only if the rewritten text was
// evaluated, and it counts per document, so a copy served from cache shows up
// as a zero rather than as somebody else's green.
const FLAG_TO = "export const MEDIA_VIA_DOOR = true;\n"
  + "globalThis.__mediaFlagProof = (globalThis.__mediaFlagProof || 0) + 1;";
const GUARD_FROM = "|| !resp.public_url.endsWith(`/${out.key}`)";

function rewriteDoorModule(src) {
  const landed = { flag: false, guard: true };
  let out = src;
  if (BREAK !== "unbound") {
    if (out.includes(FLAG_FROM)) { out = out.replace(FLAG_FROM, FLAG_TO); landed.flag = true; }
  } else {
    landed.flag = true;   // deliberately NOT flipped; the OFF path is the sabotage
  }
  if (BREAK === "public-url") {
    landed.guard = out.includes(GUARD_FROM);
    out = out.replace(GUARD_FROM, "");
  }
  return { out, landed };
}

mkdirSync(SHOTS, { recursive: true });
console.log(`business-media door path on the demo tenant (${biz.slice(0, 8)}) at ${BASE_URL}`);
console.log(`Public base, via r2.ts's mediaBase: ${PUB_BASE}`);
console.log(`Refusal answer carries ${OTHER_BIZ.slice(0, 8)}…'s public_url beside a correct key\n`);
if (BREAK) console.log(`  note  --break=${BREAK} is set: this run is a sabotage and MUST be red.\n`);

const browser = await chromium.launch({ headless: !HEADED });
const consoleNoise = [];
let flagSeen = 0, flagLanded = 0, guardLanded = 0;

// ── THE SIGN-IN, ONCE, IN ITS OWN CONTEXT WITH NO ROUTES REGISTERED ────────
// Separated out so every measured context needs exactly ONE navigation; see the
// paragraph at that navigation for why a second one silently reverts the branch
// under test. The tour flags are set here too, so they travel in the saved state
// rather than needing an extra page evaluation later.
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

try {
  for (const w of WIDTHS) {
    console.log(`  ${w.label}x${w.height}`);
    const ctx = await browser.newContext({
      viewport: { width: w.width, height: w.height },
      deviceScaleFactor: 1,
      storageState: signedIn,
    });
    const page = await ctx.newPage();
    // **THE BROWSER CACHE IS TURNED OFF, AND THAT IS NOT A TIDINESS LINE.**
    // With it on, the module rewrite below lands on the FIRST navigation and
    // the second navigation reads the untouched module out of cache with no
    // request to intercept — so the branch under test silently reverts while
    // the script's own counters still say the edit landed. Two runs were spent
    // on that. `no-store` on the fulfilled response is not enough on its own,
    // because the entry can already be in the cache by then; this removes the
    // cache from the question entirely.
    await (await ctx.newCDPSession(page)).send("Network.setCacheDisabled", { cacheDisabled: true });
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") {
        consoleNoise.push(`${w.label} · ${m.type()} · ${m.text().slice(0, 200)}`);
      }
    });
    page.on("pageerror", (e) => consoleNoise.push(`${w.label} · pageerror · ${String(e.message).slice(0, 200)}`));

    // What the run watches rather than what it stubs: every object-storage call
    // and every PUT, so "no fallback" is answered by the wire and not by a grep.
    //
    // **IT COUNTS WRITES, NOT TRAFFIC, AND THE FIRST VERSION COUNTED TRAFFIC.**
    // Criterion 4 is *"no remaining Supabase Storage UPLOAD fallback"*, and a
    // public GET of an image uploaded before the switch is not that — it is the
    // thing `upload.js`'s own header promises keeps working: *"rows written
    // before the switch keep working afterwards; the old bucket stays public
    // and the old urls still point at it."* Counting reads printed a finding at
    // all three widths over a gallery row doing exactly that, which is
    // `docs/gotchas.md` 110's shape: a question broader than the rule, failing
    // toward a FALSE DEFECT. Reads are still recorded, separately, so the
    // receipt can say they happened rather than hiding them.
    const seen = { writes: [], reads: [], puts: [], inserts: [], doorBodies: [] };
    page.on("request", (r) => {
      const u = r.url();
      if (/\/storage\/v1\/object\//.test(u)) {
        const where = r.method() === "POST" || r.method() === "PUT" || r.method() === "DELETE" ? seen.writes : seen.reads;
        where.push(`${r.method()} ${u.slice(0, 160)}`);
      }
      if (r.method() === "PUT" && u.startsWith(PUT_HOST)) seen.puts.push(u);
    });

    // ── 1 · THE MODULE, WITH THE FLAG FLIPPED IN FLIGHT ──────────────────
    //
    // **THE SOURCE IS FETCHED HERE IN NODE, NOT WITH `route.fetch()`, AND THAT
    // IS THE WHOLE REASON THIS WORKS.** `route.fetch()` goes through the
    // BROWSER's network stack, so the ORIGINAL response lands in the browser's
    // own HTTP cache; `fulfill` then serves the rewritten body for that one
    // request, and **the next navigation reads the original straight out of
    // cache with no request to intercept.** Measured, not reasoned about: with
    // `route.fetch()` the first navigation executed the rewritten module and
    // the second executed the untouched one — one intercept, flag back to
    // `false` — while every line of this script still read normally and the
    // "substitution landed" check stayed green off the first navigation's
    // count. It is `docs/gotchas.md` 102's shape from a new direction: the edit
    // really did land, in a copy nothing executed.
    //
    // Fetching in node keeps the original out of the browser entirely, and
    // `no-store` on the way back means EVERY navigation re-requests, so the
    // per-navigation assertion below is a real count rather than a memory.
    await page.route("**/src/lib/photo-door.js*", async (route) => {
      const src = await (await fetch(route.request().url())).text();
      flagSeen++;
      const { out, landed } = rewriteDoorModule(src);
      if (landed.flag) flagLanded++;
      if (landed.guard) guardLanded++;
      await route.fulfill({
        status: 200,
        contentType: "text/javascript",
        headers: { "cache-control": "no-store" },
        body: out,
      });
    });

    // ── 2 · THE DOOR, ANSWERED BY THE REAL DERIVATION ────────────────────
    // `mode` is flipped between the two cases below; nothing else changes, so
    // the success and the refusal differ in exactly one field of one answer.
    let mode = "ok";
    await page.route("**/functions/v1/photo-door", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      seen.doorBodies.push(body);
      if (body.action !== "start" || body.store !== "media") {
        return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: `Unexpected door body: ${JSON.stringify(body)}` }) });
      }
      // THE KEY IS MINTED THE WAY THE SERVER MINTS IT: from the MEMBER's
      // business, never from the body. `photo-rules.js`'s own `mediaPath` is
      // called rather than restated, and `tests/photo-door-media.test.mjs`
      // holds it against `_shared/photoKey.ts`'s copy.
      const key = mediaPath({ businessId: biz, folder: body.folder, id: body.file_id, type: body.content_type });
      // AND THE URL IS `r2.ts`'s OWN, wired as `photo-door/index.ts` wires it.
      const good = publicUrl(PUB_BASE, key);
      const theirs = publicUrl(PUB_BASE, mediaPath({ businessId: OTHER_BIZ, folder: body.folder, id: body.file_id, type: body.content_type }));
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          upload_url: `${PUT_HOST}/put/${key}?sig=signed-for-${body.claimed_bytes}-bytes`,
          key,
          public_url: mode === "ok" ? good : theirs,
          expires_in: 300,
        }),
      });
    });

    // ── 3 · THE PUT, THE OLD BUCKET, AND THE ROW ─────────────────────────
    await page.route(`${PUT_HOST}/**`, (route) => route.fulfill({ status: 200, body: "" }));

    // **THE OLD PATH IS ANSWERED RATHER THAN ALLOWED, AND THIS WAS ADDED AFTER
    // IT BIT.** Before it existed, the run that discovered the cache trap above
    // went down the Supabase Storage path at all three widths and **really
    // uploaded six objects into the live `business-media` bucket** — two per
    // width, 70 bytes each. They were deleted by hand and the bucket was
    // listed empty afterwards, but a gate that writes to a live store when it
    // fails is a gate that cannot be run twice in a row, and `--break=unbound`
    // puts it down that path ON PURPOSE every time. So the call is recorded as
    // having been ATTEMPTED — which is the finding — and answered here, so no
    // byte ever leaves. `getPublicUrl` needs no network and is unaffected.
    await page.route("**/storage/v1/object/**", (route) => {
      const r = route.request();
      if (r.method() === "POST" || r.method() === "PUT") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: "answered-by-the-gate-never-stored" }) });
      }
      return route.continue();
    });
    await page.route("**/rest/v1/gallery_images*", async (route) => {
      const req = route.request();
      if (req.method() === "POST") {
        seen.inserts.push(req.postData() || "");
        // 201 WITHOUT REACHING THE DATABASE, which is why this run writes no
        // row anywhere. The body above is the evidence; the row would only be
        // cleanup.
        return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
      }
      return route.continue();
    });

    // **ONE NAVIGATION, AND THE SIGN-IN HAPPENED BEFORE THE ROUTES EXISTED.**
    // `?settings=gallery` is the screen's own address (`App.jsx`'s deep link,
    // checked against the registry in `screens/more/index.js`), so a signed-in
    // context reaches it in a single load.
    //
    // **THE SECOND NAVIGATION IS WHAT HAD TO GO, AND THE REASON IS WORTH THE
    // PARAGRAPH.** Signing in on `/app` and then going to `/app?settings=gallery`
    // means the module is requested on the first load and **not requested at all
    // on the second** — it comes out of Chromium's per-renderer memory cache,
    // which `Network.setCacheDisabled` does not cover and no response header can
    // reach. Measured: `served 1, executed 1` after the first navigation and
    // `served 1, executed 0` after the second, with the HTTP cache already
    // disabled. So the rewrite was real, landed, and then **the press happened on
    // a document running the untouched module.** Logging in once up front and
    // navigating once per width removes the second load, and the executed-copy
    // proof below is what tells us it stayed removed.
    await page.goto(`${BASE_URL}/app?settings=gallery`, { waitUntil: "domcontentloaded" });
    // `state: "attached"`, NOT the default. The gallery's file input is
    // `hidden` behind a `<label>` — the pattern three screens here use — and
    // Playwright's "visible" means a non-empty box, so the default wait times
    // out for 30 seconds on a screen that is rendering perfectly and then
    // prints a finding about the PRODUCT. `docs/gotchas.md` 107 is this repo's
    // own case of exactly that, and this script met it on its first run.
    await page.waitForSelector('input[type="file"]', { state: "attached", timeout: 30000 });
    await page.waitForTimeout(900);

    // READ OUT OF THE PAGE, not off this script's own counters. `flagSeen` and
    // `flagLanded` describe what was SERVED; this describes what RAN.
    const ranProof = await page.evaluate(() => globalThis.__mediaFlagProof ?? 0);
    check(`${w.label} · the flag substitution landed in the module the browser RAN`,
      BREAK === "unbound" ? (flagSeen > 0 && ranProof === 0) : ranProof > 0,
      `served ${flagSeen}, rewritten ${flagLanded}, executed ${ranProof}`);
    if (BREAK === "public-url") {
      check(`${w.label} · SABOTAGE: the public_url guard was really removed from the module`,
        guardLanded > 0, `landed ${guardLanded}`);
    }

    // ── THE CASE THAT WORKS ──────────────────────────────────────────────
    mode = "ok";
    await page.setInputFiles('input[type="file"]', { name: "shot.png", mimeType: "image/png", buffer: PNG });
    await page.waitForTimeout(1500);

    check(`${w.label} · ZERO Supabase Storage UPLOADS — there is no fallback left`,
      seen.writes.length === 0, seen.writes.slice(0, 2).join(" | "));
    check(`${w.label} · the browser PUT to the door's signed url`, seen.puts.length === 1, `${seen.puts.length} PUTs`);

    const okKey = seen.doorBodies.length
      ? mediaPath({ businessId: biz, folder: seen.doorBodies[0].folder, id: seen.doorBodies[0].file_id, type: seen.doorBodies[0].content_type })
      : null;
    check(`${w.label} · the key is this business's own <id>/gallery/<file>.png`,
      !!okKey && okKey.startsWith(`${biz}/gallery/`) && okKey.endsWith(".png"), String(okKey));
    check(`${w.label} · the url stored in gallery_images is publicUrl(base, key) for the key that was PUT`,
      seen.inserts.length === 1 && okKey !== null
        && JSON.parse(seen.inserts[0]).image_url === publicUrl(PUB_BASE, okKey),
      seen.inserts.length ? String(JSON.parse(seen.inserts[0]).image_url) : "no insert");

    const okBox = page.locator(".ok-box").first();
    check(`${w.label} · the screen says the photo was added`,
      await okBox.count() > 0 && /added/i.test(((await okBox.innerText().catch(() => "")) || "")),
      (await okBox.innerText().catch(() => "")) || "no ok-box");

    // ── THE CASE THAT IS REFUSED — the 0.11b fault ───────────────────────
    mode = "theirs";
    const putsBefore = seen.puts.length, insertsBefore = seen.inserts.length;
    await page.setInputFiles('input[type="file"]', { name: "second.png", mimeType: "image/png", buffer: PNG });
    await page.waitForTimeout(1500);

    const box = page.locator(".error-box").first();
    const present = await box.count() > 0 && await box.isVisible().catch(() => false);
    check(`${w.label} · another business's public_url is refused, on the screen`, present);
    const said = present ? (await box.innerText()).trim() : "";
    check(`${w.label} · and it is the sentence the product composes`, said === DOOR_WORDS.unreadable, JSON.stringify(said));

    if (present) {
      // ITS PIXELS ARE PAINTED. The scroll comes FIRST: `elementFromPoint` is
      // viewport-relative and answers `null` below the fold, which 0.11d1 read
      // as "covered by something" at 320 over a screen rendering perfectly
      // (`docs/gotchas.md` 110).
      await box.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(250);
      const painted = await box.evaluate((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return "zero-size";
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return "offscreen";
        const hit = document.elementFromPoint(cx, cy);
        if (!hit) return "nothing-at-centre";
        return (el === hit || el.contains(hit) || hit.contains(el)) ? "painted" : `covered-by-${hit.className || hit.tagName}`;
      });
      check(`${w.label} · its pixels are painted at its own centre`, painted === "painted", painted);
    } else {
      check(`${w.label} · its pixels are painted at its own centre`, false, "no refusal box to hit-test");
    }

    check(`${w.label} · NOTHING WAS PUT — the refusal happened before any byte left`,
      seen.puts.length === putsBefore, `${seen.puts.length - putsBefore} extra PUTs`);
    check(`${w.label} · NOTHING WAS STORED — no row carried the other business's url`,
      seen.inserts.length === insertsBefore, `${seen.inserts.length - insertsBefore} extra inserts`);

    const shot = path.join(SHOTS, `media-door-${BREAK || "clean"}-${w.label}.png`);
    await page.screenshot({ path: shot });
    artifacts.push(path.relative(REPO, shot).replace(/\\/g, "/"));
    console.log(`    shot  ${path.relative(REPO, shot)}`);

    completed++;
    await ctx.close();
  }

  // THE CONSOLE, READ AT EVERY WIDTH RATHER THAN ONCE. The PUT host and the
  // door are both intercepted, so neither can be the source of noise here;
  // nothing is filtered.
  check("the console is clean at every width", consoleNoise.length === 0, consoleNoise.slice(0, 3).join(" | "));
} finally {
  await browser.close();
}

const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions, ${completed}/${expectedTargets} widths.`);
if (BREAK) console.log(`  note  --break=${BREAK} was set: a GREEN run here is the failure.`);
if (findings.length) {
  console.log("\nFINDINGS");
  for (const f of findings) console.log(`  · ${f}`);
}

// THE CANARY, RE-JUDGED EVERY RUN: the pre-0.11b reader's rule — `https` and
// nothing else — put against the answer this run's refusal case serves. If that
// rule ever rejects another business's url, the fault this item fixed was never
// reachable and the refusal half of this gate proves nothing.
const theirUrl = publicUrl(PUB_BASE, `${OTHER_BIZ}/gallery/00000000-0000-4000-8000-000000000001.png`);
const preFixWouldAccept = /^https:\/\//.test(theirUrl);

const { path: receiptPath } = writeReceipt({
  check_id: "media-door-browser",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: expectedTargets,
  discovered_targets: expectedTargets,
  attempted_targets: expectedTargets,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 22,
  assertion_floor: "11 per width (flag landed, zero storage calls, one PUT, the key, the stored url, the success "
    + "sentence, the refusal present, the refusal's wording, its pixels, no PUT, no row) x 3 widths + 1 console = 34 "
    + "when every width renders. A width whose screen never renders still books its assertions as failures rather "
    + "than dropping out, so the count cannot silently fall below 22. --break=public-url adds one per width.",
  canary: {
    id: "the-pre-fix-reader",
    observed_failure: preFixWouldAccept,
    what: "readMediaStart before 0.11b tested public_url for 'https' and nothing else",
    rule: "another business's public_url is a perfectly good https url, so the pre-fix rule accepts it",
  },
  failures,
  artifacts,
  dimensions: {
    roadmap: "0.11b",
    criteria: [
      "1 · gallery publishing writes only to business-media in R2 — zero Supabase Storage UPLOADS observed",
      "2 · the public url is derived by r2.ts's mediaBase + publicUrl and is what reaches gallery_images.image_url",
      "3 · the key is minted for the caller's own business",
      "4 · no Supabase Storage upload fallback remains on this path, asked of the live runtime",
    ],
    widths: WIDTHS.map((w) => w.label),
    public_base: PUB_BASE,
    sabotage: BREAK || null,
    intercepted: "three responses: the photo-door.js module (the flag flipped in flight), the undeployed "
      + "photo-door function (its answer DERIVED by photo-rules.js's mediaPath and r2.ts's publicUrl), and the "
      + "signed PUT plus the gallery_images insert (so nothing is written anywhere). Nothing in app/src is edited.",
    wrote_nothing: "no R2 object, no Supabase Storage object, no gallery_images row, no file on disk",
    unjudgeable: [
      "That R2 accepts the signature, that Cloudflare serves the PUT, and that an unauthenticated visitor can read "
      + "the url: no public address has been bound in Cloudflare yet (FOR-ANDREW.md step 9a2), so this run uses a "
      + "test host through r2.ts's real reader. The DERIVATION is measured; the live address is Andrew's.",
      "The branding and intake folders are not pressed in the browser — only gallery is. Both complete through the "
      + "real handler in tests/photo-door-media-wire.test.mjs § 1, which declares its folder count from MEDIA_FOLDERS.",
    ],
  },
  warnings: [
    "MEDIA_VIA_DOOR is still false on disk and photo-door is still undeployed. This run flips the flag in the "
    + "RESPONSE, never in the file, so it measures the branch Andrew's flip will switch on and changes nothing.",
    "Gallery.jsx renders err.message untranslated, so the refusal is read in English at every width. The door's "
    + "sentences are DOOR_WORDS and their Spanish is tests/spanish.test.mjs § 12's subject, not this item's.",
  ],
});
console.log(`\nreceipt  ${receiptPath}  —  validate: node scripts/receipt.mjs`);
process.exit(failed ? 1 : 0);
