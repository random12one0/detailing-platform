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

// ── THE THREE PLACES A BUSINESS IMAGE IS UPLOADED, AND THE TWO PRESSED HERE ─
// `grep -n uploadBusinessPhoto app/src` finds exactly three call sites, one per
// folder in `MEDIA_FOLDERS`: `Gallery.jsx` (gallery), `BusinessInfo.jsx`
// (branding, twice — the logo tile and the cover tile) and `SiteIntake.jsx`
// (intake). **Criterion 1 names all three in its own words** — *"gallery
// publishing, logo uploads and intake-photo uploads"* — and the first version
// of this gate pressed only the first, which its own receipt said out loud.
//
// **BRANDING IS THE ONE ADDED NEXT, AND NOT BECAUSE IT WAS THE EASIER ONE.**
// There are exactly two permanent records a wrong `public_url` can land in:
// `gallery_images.image_url` and a brand's `logo_url`. The second is the one
// every page of a tenant's site renders, and it is the one 0.11b's own
// write-up names beside the first. **Intake writes no row at all** —
// `SiteIntake.jsx` says so in its own words, *"nothing is published from here —
// no `gallery_images` row is made"* — so it is the only one of the three where
// a wrong url cannot become permanent. It is also the only one with no address
// of its own: the photos question is a step inside the website brief, behind
// earlier required answers. So it stays unpressed, named in the receipt by
// name rather than folded into the pass.
//
// Each flow DECLARES how many file pickers its screen has, as an equality
// rather than a floor: a new picker on either screen reddens this run instead
// of slipping past it (`docs/gotchas.md` 98).
const FLOWS = [
  {
    key: "gallery",
    screen: "Photo gallery",
    url: "/app?settings=gallery",
    folder: "gallery",
    inputs: 1,
    // WHERE THE URL BECOMES PERMANENT, and for the gallery it happens by
    // itself: `publishToGallery` inserts the row as part of the upload.
    table: "gallery_images",
    field: "image_url",
    okWords: /added/i,
    save: null,
    // HOW MANY ROWS THE REFUSAL LEAVES BEHIND. Zero here: the gallery's insert
    // is part of the upload, so a refused upload must write nothing at all.
    refusalRows: 0,
  },
  {
    key: "branding",
    screen: "Business info",
    url: "/app?settings=info",
    folder: "branding",
    inputs: 2,
    // **AND FOR THE LOGO IT DOES NOT HAPPEN BY ITSELF**, which is the one real
    // difference between the two flows and is the product's own design:
    // `BusinessInfo.jsx`'s `upload` puts the url in React state and says
    // *"Photo uploaded. Press Save to keep it."* The url reaches the row only
    // when Save is pressed, so this run presses it — otherwise the half of
    // criterion 2 that matters here, *what gets stored*, is never asked.
    table: "business_branding",
    field: "logo_url",
    okWords: /press save/i,
    save: "Save",
    // ONE here, and it is deliberate rather than tolerated: Save is pressed
    // again after the refusal so the sabotage can observe the url that would
    // have been stored. See the paragraph at that press.
    refusalRows: 1,
  },
];

// **EVERY WRITE TO THESE FOUR TABLES IS ANSWERED HERE AND NEVER REACHES THE
// DATABASE.** The gallery needed one of them; Save needs the other three,
// because `persist()` updates `businesses` and `business_settings` alongside
// `business_branding` — so pressing Save without this list would rewrite three
// real rows on the demo tenant on every width. The bodies are kept, because
// the body is the evidence; the row would only be cleanup. GETs continue to
// the real database, which is what lets the screens render.
const WRITE_TABLES = ["gallery_images", "business_branding", "businesses", "business_settings"];

let passed = 0, assertions = 0, completed = 0;
const expectedTargets = FLOWS.length * WIDTHS.length;
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
  for (const flow of FLOWS) for (const w of WIDTHS) {
    console.log(`  ${flow.screen} (${flow.folder}) at ${w.label}x${w.height}`);
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
    // THE LABEL CARRIES THE FLOW AS WELL AS THE WIDTH. With two screens in the
    // run, a line reading only "320" cannot be acted on — and the console is
    // read once at the end across every context, so the label is the only
    // thing that says which screen said it.
    const at = `${flow.key} ${w.label}`;
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") {
        consoleNoise.push(`${at} · ${m.type()} · ${m.text().slice(0, 200)}`);
      }
    });
    page.on("pageerror", (e) => consoleNoise.push(`${at} · pageerror · ${String(e.message).slice(0, 200)}`));

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
    const seen = { writes: [], reads: [], puts: [], rows: [], doorBodies: [] };
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

    // **AND THE PUBLIC BASE IS ANSWERED TOO, WHICH WAS FOUND BY THE CONSOLE
    // RATHER THAN REASONED ABOUT.** `BusinessInfo.jsx`'s tile IS the preview —
    // `<img src={url}>` on the url the door just returned — so the moment the
    // logo upload succeeds the browser fetches `img.media.test` and prints
    // `ERR_NAME_NOT_RESOLVED`. That host is deliberately fake, because **no
    // public address has been bound in Cloudflare yet** and inventing one that
    // looked real would be the worse lie; so the noise is this gate's own and
    // not the product's, and the honest fix is to answer the request rather
    // than to filter the console. Filtering is what would have been wrong: the
    // console assertion below is the only thing in this run that would catch a
    // real error on either screen, and a filter keyed on "failed to load"
    // would have swallowed it.
    //
    // Worth keeping in mind for 0.11ba: the logo preview is the FIRST thing a
    // wrong bound address breaks, and it breaks visibly, on the screen that
    // sets it.
    await page.route(`${RAW_BASE}**`, (route) => route.fulfill({
      status: 200, contentType: "image/png", body: PNG,
    }));

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
    // **EVERY WRITE TO THE FOUR TABLES IN `WRITE_TABLES` IS ANSWERED HERE,
    // 201, WITHOUT REACHING THE DATABASE** — which is why this run writes no
    // row anywhere. The body is the evidence; the row would only be cleanup.
    //
    // It was one table until the branding flow was added, and the widening is
    // not tidiness: `BusinessInfo.jsx`'s Save runs `persist()`, which updates
    // `businesses` and `business_settings` in the same `Promise.all` as the
    // `business_branding` upsert carrying `logo_url`. Pressing Save with only
    // `gallery_images` answered would have rewritten two real rows on the demo
    // tenant at every width — six writes to the live database by a gate whose
    // header promises it writes nothing.
    //
    // Anything NOT in that list continues, and so does every GET, which is
    // what lets both screens render from the real tenant.
    await page.route("**/rest/v1/**", async (route) => {
      const req = route.request();
      const table = new URL(req.url()).pathname.replace(/^\/rest\/v1\//, "").split("?")[0];
      if (req.method() === "GET" || !WRITE_TABLES.includes(table)) return route.continue();
      seen.rows.push({ table, method: req.method(), body: req.postData() || "" });
      return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
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
    await page.goto(`${BASE_URL}${flow.url}`, { waitUntil: "domcontentloaded" });
    // `state: "attached"`, NOT the default. The gallery's file input is
    // `hidden` behind a `<label>` — the pattern three screens here use — and
    // Playwright's "visible" means a non-empty box, so the default wait times
    // out for 30 seconds on a screen that is rendering perfectly and then
    // prints a finding about the PRODUCT. `docs/gotchas.md` 107 is this repo's
    // own case of exactly that, and this script met it on its first run.
    await page.waitForSelector('input[type="file"]', { state: "attached", timeout: 30000 });
    await page.waitForTimeout(900);

    // HOW MANY PICKERS THIS SCREEN HAS, AS AN EQUALITY. `BusinessInfo.jsx`
    // uploads to `branding` from TWO tiles — the logo and the cover — and
    // `Gallery.jsx` from one. A third appearing on either screen is a flow
    // this run presses no part of, and an inequality here would let it arrive
    // silently (`docs/gotchas.md` 98).
    const pickers = page.locator('input[type="file"]');
    const pickerCount = await pickers.count();
    check(`${at} · the screen has exactly ${flow.inputs} file picker${flow.inputs === 1 ? "" : "s"}`,
      pickerCount === flow.inputs, `${pickerCount}`);
    // THE FIRST ONE, EXPLICITLY. With two on the screen a bare selector is a
    // Playwright strict-mode error rather than a measurement, and the first is
    // the logo — the tile whose url every page of a tenant's site renders.
    const picker = pickers.first();

    // READ OUT OF THE PAGE, not off this script's own counters. `flagSeen` and
    // `flagLanded` describe what was SERVED; this describes what RAN.
    const ranProof = await page.evaluate(() => globalThis.__mediaFlagProof ?? 0);
    check(`${at} · the flag substitution landed in the module the browser RAN`,
      BREAK === "unbound" ? (flagSeen > 0 && ranProof === 0) : ranProof > 0,
      `served ${flagSeen}, rewritten ${flagLanded}, executed ${ranProof}`);
    if (BREAK === "public-url") {
      check(`${at} · SABOTAGE: the public_url guard was really removed from the module`,
        guardLanded > 0, `landed ${guardLanded}`);
    }

    // ── THE CASE THAT WORKS ──────────────────────────────────────────────
    mode = "ok";
    await picker.setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: PNG });
    await page.waitForTimeout(1500);

    check(`${at} · ZERO Supabase Storage UPLOADS — there is no fallback left`,
      seen.writes.length === 0, seen.writes.slice(0, 2).join(" | "));
    check(`${at} · the browser PUT to the door's signed url`, seen.puts.length === 1, `${seen.puts.length} PUTs`);

    const okKey = seen.doorBodies.length
      ? mediaPath({ businessId: biz, folder: seen.doorBodies[0].folder, id: seen.doorBodies[0].file_id, type: seen.doorBodies[0].content_type })
      : null;
    check(`${at} · the key is this business's own <id>/${flow.folder}/<file>.png`,
      !!okKey && okKey.startsWith(`${biz}/${flow.folder}/`) && okKey.endsWith(".png"), String(okKey));

    const okBox = page.locator(".ok-box").first();
    check(`${at} · the screen says what happened in its own words`,
      await okBox.count() > 0 && flow.okWords.test(((await okBox.innerText().catch(() => "")) || "")),
      (await okBox.innerText().catch(() => "")) || "no ok-box");

    // **AND FOR THE LOGO, SAVE IS PART OF THE MEASUREMENT.** The gallery's row
    // is written by the upload itself; the logo's is written only when the
    // person presses Save, so without this press criterion 2's *what gets
    // stored* half is never asked of this flow at all.
    if (flow.save) {
      await page.getByRole("button", { name: flow.save, exact: true }).first().click();
      await page.waitForTimeout(1500);
    }

    const rowsFor = () => seen.rows.filter((r) => r.table === flow.table);
    const stored = rowsFor();
    let storedUrl = null;
    try { storedUrl = stored.length ? JSON.parse(stored[0].body)[flow.field] : null; } catch { storedUrl = "unparseable"; }
    check(`${at} · the url stored in ${flow.table}.${flow.field} is publicUrl(base, key) for the key that was PUT`,
      stored.length === 1 && okKey !== null && storedUrl === publicUrl(PUB_BASE, okKey),
      stored.length ? String(storedUrl) : "no row written");

    // ── THE CASE THAT IS REFUSED — the 0.11b fault ───────────────────────
    mode = "theirs";
    const putsBefore = seen.puts.length, rowsBefore = rowsFor().length;
    await picker.setInputFiles({ name: "second.png", mimeType: "image/png", buffer: PNG });
    await page.waitForTimeout(1500);

    const box = page.locator(".error-box").first();
    const present = await box.count() > 0 && await box.isVisible().catch(() => false);
    check(`${at} · another business's public_url is refused, on the screen`, present);
    const said = present ? (await box.innerText()).trim() : "";
    check(`${at} · and it is the sentence the product composes`, said === DOOR_WORDS.unreadable, JSON.stringify(said));

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
      check(`${at} · its pixels are painted at its own centre`, painted === "painted", painted);
    } else {
      check(`${at} · its pixels are painted at its own centre`, false, "no refusal box to hit-test");
    }

    // **AND SAVE IS PRESSED AGAIN, WHICH IS WHAT MAKES THE SABOTAGE BITE ON
    // THIS FLOW.** Found by running `--break=public-url` and reading which
    // lines went red: on the gallery it named the stored row, on the logo it
    // named only the PUT — because the logo's row is written by Save and
    // nothing here had pressed it after the refusal. So the sharpest damage
    // this item is about, *another business's url sitting in `logo_url` for
    // good*, was the one thing the sabotage could not observe. That is
    // `docs/gotchas.md` 95 and this item's own recorded lesson — a sabotage
    // must declare what becomes OBSERVABLE, not merely that something was
    // rejected — met from a third direction: the guard was really gone, the
    // run really went red, and the assertion that mattered most was silent.
    //
    // It comes AFTER the hit-test above, deliberately: Save replaces
    // `.error-box` with its own "Saved." and there would be nothing left to
    // measure. In the clean run this writes the url the person already had; in
    // the sabotaged run it writes the other business's, and `leaked` says so.
    if (flow.save) {
      await page.getByRole("button", { name: flow.save, exact: true }).first().click();
      await page.waitForTimeout(1500);
    }

    check(`${at} · NOTHING WAS PUT — the refusal happened before any byte left`,
      seen.puts.length === putsBefore, `${seen.puts.length - putsBefore} extra PUTs`);
    // DECLARED PER FLOW, because the two flows legitimately differ: the
    // gallery's refusal must write NO row, and the logo's Save press above
    // writes exactly one by design. An inequality here would hide a second
    // gallery insert (`docs/gotchas.md` 98).
    check(`${at} · ${flow.refusalRows === 0 ? "NOTHING WAS STORED — no row was written" : "exactly the one row the Save press wrote"}`,
      rowsFor().length === rowsBefore + flow.refusalRows,
      `${rowsFor().length - rowsBefore} rows, expected ${flow.refusalRows}`);
    // **AND THE OTHER BUSINESS'S ID IS NOWHERE IN ANY ROW THIS SCREEN TRIED TO
    // WRITE.** The assertion above says no SECOND row went; this one says the
    // first one did not carry it either, across every table Save touches. It
    // is the claim the item is actually about — a wrong `key` is a failed
    // upload, a wrong `public_url` is somebody else's image stored for good —
    // and asking it of every recorded body means a future screen that stores
    // the url somewhere new is covered without this script being edited.
    const leaked = seen.rows.filter((r) => r.body.includes(OTHER_BIZ));
    check(`${at} · and no row body anywhere named ${OTHER_BIZ.slice(0, 8)}…`,
      leaked.length === 0, leaked.map((r) => r.table).join(", "));

    const shot = path.join(SHOTS, `media-door-${BREAK || "clean"}-${flow.key}-${w.label}.png`);
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
  min_assertions: 52,
  assertion_floor: "13 per flow-and-width (the picker count, the flag landed, zero storage uploads, one PUT, the "
    + "key's folder, the success sentence, the stored url, the refusal present, the refusal's wording, its pixels, "
    + "no PUT, no second row, no row body naming the other business) x 2 flows x 3 widths + 1 console = 79 when "
    + "every screen renders. A screen that renders but refuses nothing still books its assertions as failures "
    + "rather than dropping out, so the count cannot silently fall below 52. --break=public-url adds one per pair.",
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
      "1 · gallery publishing AND logo uploads write only to business-media in R2 — zero Supabase Storage UPLOADS "
      + "observed on either screen. Intake is the third flow and is not pressed here; see unjudgeable",
      "2 · the public url is derived by r2.ts's mediaBase + publicUrl and is what reaches gallery_images.image_url "
      + "and business_branding.logo_url — the two permanent records a wrong public_url can land in",
      "3 · the key is minted for the caller's own business, under the folder the screen asked for",
      "4 · no Supabase Storage upload fallback remains on either path, asked of the live runtime",
    ],
    flows: FLOWS.map((f) => `${f.key} · ${f.screen} · ${f.url} · ${f.inputs} picker(s) · stores ${f.table}.${f.field}`),
    widths: WIDTHS.map((w) => w.label),
    public_base: PUB_BASE,
    sabotage: BREAK || null,
    intercepted: "three responses: the photo-door.js module (the flag flipped in flight), the undeployed "
      + "photo-door function (its answer DERIVED by photo-rules.js's mediaPath and r2.ts's publicUrl), and the "
      + "signed PUT plus every write to " + WRITE_TABLES.join(", ") + " (so nothing is written anywhere — the last "
      + "three are what BusinessInfo's Save touches). Nothing in app/src is edited.",
    wrote_nothing: "no R2 object, no Supabase Storage object, no gallery_images row, no business_branding row, no "
      + "businesses or business_settings update, no file on disk",
    unjudgeable: [
      "That R2 accepts the signature, that Cloudflare serves the PUT, and that an unauthenticated visitor can read "
      + "the url: no public address has been bound in Cloudflare yet (FOR-ANDREW.md step 9a2), so this run uses a "
      + "test host through r2.ts's real reader. The DERIVATION is measured; the live address is Andrew's.",
      "The INTAKE folder is not pressed in the browser — gallery and branding are. It is the third and last of the "
      + "three uploadBusinessPhoto call sites, it has no address of its own (the photos question is a step inside "
      + "the website brief, behind earlier required answers, reachable only by ?brief=1 plus stepping), and it is "
      + "the only one of the three that writes NO row, so a wrong public_url cannot become permanent through it. "
      + "It completes through the real handler in tests/photo-door-media-wire.test.mjs section 1, which declares "
      + "its folder count from MEDIA_FOLDERS so a fourth folder reddens.",
    ],
  },
  warnings: [
    "MEDIA_VIA_DOOR is still false on disk and photo-door is still undeployed. This run flips the flag in the "
    + "RESPONSE, never in the file, so it measures the branch Andrew's flip will switch on and changes nothing.",
    "Gallery.jsx and BusinessInfo.jsx both render err.message untranslated, so the refusal is read in English at "
    + "every width on both screens. The door's sentences are DOOR_WORDS and their Spanish is tests/spanish.test.mjs "
    + "section 12's subject, not this item's.",
    "The sentence those two screens show is DOOR_WORDS.unreadable, which says 'Reload this job' on screens that are "
    + "not a job. Found 2026-10-09, written up in FOUND.md, not this item's to fix — 0.11b is about which store the "
    + "bytes go to, and the string is shared with JobPhotos.jsx where it is correct.",
  ],
});
console.log(`\nreceipt  ${receiptPath}  —  validate: node scripts/receipt.mjs`);
process.exit(failed ? 1 : 0);
