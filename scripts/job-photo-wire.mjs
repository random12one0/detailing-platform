// ROADMAP 0.11d2 — A JOB PHOTO GOES TO R2 AND NOWHERE ELSE, AND THE SIZE IS
// NEVER THE CLIENT'S. Measured on the wire, in a real browser.
//
//   set -a; . ./.env; set +a
//   npm run dev --prefix app
//   node scripts/job-photo-wire.mjs
//   node scripts/job-photo-wire.mjs --break=storage-fallback
//   node scripts/job-photo-wire.mjs --break=client-size
//
// Dev server + the seeded demo tenant + credentials (the owner login only).
// **IT WRITES NOTHING ANYWHERE**: no R2 object, no Supabase Storage object, no
// `job_photos` row, no flag flipped on disk, no deploy. The door, the PUT and
// every Storage request are answered by this script, so a sabotage that tries
// to write is recorded and then goes nowhere.
//
// ---------------------------------------------------------------------------
// WHICH HALF OF 0.11d2 THIS IS, AND WHICH HALF IT IS NOT
// ---------------------------------------------------------------------------
// 0.11d2 has two criteria and each one has a client half and an R2 half:
//
//   1 · "a real upload succeeds through a presigned R2 URL and no upload
//        request reaches Supabase Storage"
//   2 · "job_photos.bytes exactly equals the size reported by R2, regardless
//        of the client's claimed size"
//
// **The R2 halves need the release and cannot be faked** — that a signature R2
// minted is accepted, and that `head` states the stored object's real length.
// `photo-door` is undeployed, both door flags are `false`, and `.env` holds no
// R2 credential (only the three `R2_*` NAMES exist, as edge-function secrets),
// so nothing here can head an object or list a bucket. Those stay open and the
// receipt names them as UNJUDGEABLE rather than folding them into the pass.
//
// **The client halves are measurable today and were not measured.** They are
// not small print: they are the entire reason criterion 2's "regardless of the
// client's claimed size" can hold at all.
//
//   · every byte of a job photo leaves the browser through the door's URL and
//     nothing is ever sent to `/storage/v1/object` — a NEGATIVE about the
//     product's own transport, which only a network log can answer;
//   · the browser states its size ONCE, at `start`, where it is used to refuse
//     early — and the `finish` request carries no size field of any kind, so
//     the client cannot influence the figure that is recorded even if it wants
//     to. `tests/photo-door-server.test.mjs` § 11 and § 13 prove the server
//     ignores a lie; this proves the client never gets a second chance to tell
//     one.
//
// `tests/photo-call-sites.test.mjs` reads `app/src` as text and cannot see a
// request, and `scripts/media-door-browser.mjs` presses the BUSINESS-MEDIA
// flows. Nothing had ever pressed the job-photo transport in a browser.
//
// ---------------------------------------------------------------------------
// WHAT IS SUPPLIED, AND WHAT IS THE PRODUCT'S OWN
// ---------------------------------------------------------------------------
// THREE responses are intercepted. Nothing in `app/src` is edited; the working
// tree is untouched for the whole run, so `git status` is the proof of that
// rather than this sentence.
//
//   1 · `POST /functions/v1/photo-door` — the door, which is not deployed.
//       **Its `start` answer is DERIVED, not written out**: `photo-rules.js`'s
//       own `storagePath()` mints the key from the request body the app really
//       sent, exactly as `photoDoor.ts`'s `mintKey` does from the member's
//       business. A template string here would test nothing, and `readStart`
//       refuses unless the key matches to the character — so a correct answer
//       is also the client agreeing on the key.
//
//   2 · the signed PUT, fulfilled 200 with its body length recorded.
//
//   3 · every `/storage/v1/object/**` request, answered so that even a
//       sabotage writes no object, and recorded either way.
//
// Everything else is the product's: `shrink` resizes, `budgetFor` asks the
// REAL allowance RPC (`job_photos` holds 0 rows, so there is room and no
// intercept is needed), `roomFor` decides, `addPhoto` sequences the three hops,
// `readStart`/`readFinish` check the answers, `JobPhotos.jsx` renders.
//
// The file pressed is a REAL 16x16 PNG, built here chunk by chunk with a real
// CRC — `shrink` calls `createImageBitmap`, which decodes the file, so a buffer
// of padding bytes never reaches the transport at all. (`overcap-sentence.mjs`
// can use padding precisely because its press is refused BEFORE the decode.)
//
// ---------------------------------------------------------------------------
// THE SIZE THE SERVER STATES IS DELIBERATELY NOBODY ELSE'S NUMBER
// ---------------------------------------------------------------------------
// `finish` is answered with `bytes: 7_777_777` — a figure that matches neither
// what the client claimed at `start` nor the length of the body it PUT. The
// client accepting it without complaint is criterion 2's client half: there is
// no cross-check, no override and no second opinion, so the recorded size can
// only ever be the server's. A gate that answered with the real body length
// would pass identically whether or not the client had its own copy.
//
// ---------------------------------------------------------------------------
// THE TWO SABOTAGES ARE REAL PRODUCT CHANGES, NOT PLANTED EVIDENCE
// ---------------------------------------------------------------------------
// `app/src/lib/photos.js` is rewritten IN FLIGHT, by the mechanism
// `media-door-browser.mjs` established and for the reason its header gives:
// the source is fetched HERE IN NODE and returned with `cache-control:
// no-store`, never with `route.fetch()`, because `route.fetch()` performs its
// request through the BROWSER and leaves the ORIGINAL in the browser's own
// memory cache — after which the next navigation runs the untouched module with
// no request to intercept (`docs/gotchas.md` 113, measured on exactly this
// file). The rewrite SIGNS ITSELF with a counter at module scope and the
// counter is read out of the page, because "the body I served contained the
// edit" and "the module the browser RAN contained the edit" are different
// claims (`docs/gotchas.md` 102).
//
//   --break=storage-fallback  puts a SECOND DOOR back: after the signed PUT the
//     client also uploads the same blob to Supabase Storage. That is the exact
//     defect criterion 1 forbids — "a second door is how a cap stops meaning
//     anything", in `photos.js`'s own words — and the no-Storage rule must see
//     it. The upload is answered by this script, so nothing is stored.
//
//   --break=client-size  makes the browser state its size at `finish` as well
//     as at `start`. The row would still take R2's figure today, which is the
//     point: this gate's job is to notice the moment the client is given a
//     second chance to tell the server how big its file is, because that is the
//     line criterion 2 rests on and no existing check watches it.
//
// An unrecognised `--break=` exits 2 and writes no receipt, so a typo cannot be
// mistaken for a catch (`docs/gotchas.md` 105).

import { mkdirSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Playwright lives in `app/node_modules`, not the repo root — the same require
// every other browser script here uses.
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
import { writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";
import { storagePath } from "../app/src/lib/photo-rules.js";

const started_at = new Date().toISOString();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const SHOTS = path.join(REPO, ".manager-shots");
const BASE = process.env.BASE || "http://localhost:5173";
const SLUG = "demo-detail";
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

const KNOWN_BREAKS = ["storage-fallback", "client-size"];
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
const job = (await svc(
  `/rest/v1/bookings?select=id,customer_name&business_id=eq.${biz}&deleted_at=is.null&order=customer_name&limit=1`))?.[0];
if (!job) {
  console.error("\nSKIPPED — the demo tenant has no job, so there is no photos section to press.");
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}

// ── A REAL PNG, BUILT HERE ────────────────────────────────────────────────
// `shrink` decodes the file with `createImageBitmap` before anything is sent,
// so the fixture has to be a decodable image or the transport is never reached.
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([len, body, crc]);
};
const png = (side) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(side, 0); ihdr.writeUInt32BE(side, 4);
  ihdr[8] = 8; ihdr[9] = 2;                       // 8-bit, truecolour RGB
  const raw = Buffer.concat(Array.from({ length: side }, (_, y) => Buffer.concat([
    Buffer.from([0]),                             // filter: none
    Buffer.from(Array.from({ length: side * 3 }, (_, i) => (y * 7 + i * 11) % 256)),
  ])));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
};
const FIXTURE = png(16);

// ── THE MODULE REWRITE, AND THE ASSERTION THAT IT LANDED AND RAN ──────────
// One function so the clean run and both sabotages share it: a rewrite that
// silently matches nothing is `docs/gotchas.md` 102 and prints the same green a
// real run prints. The signature is appended in EVERY run, so the clean run
// proves the serve-and-execute path and a sabotage run's counter means
// something.
const SIGN = "\nglobalThis.__wireProof = (globalThis.__wireProof || 0) + 1;\n";
const PUT_FROM = `  if (!put.ok) throw new Error(DOOR_WORDS.putFailed);`;
const FINISH_FROM = `    action: "finish", booking_id: bookingId, photo_id: photoId, kind, width, height, caption,`;

function rewritePhotosModule(src) {
  let out = src, landed = false;
  if (BREAK === "storage-fallback") {
    // THE SECOND DOOR, put back exactly where one would be written: after the
    // signed PUT has succeeded, the same blob also goes to Supabase Storage.
    landed = out.includes(PUT_FROM);
    out = out.replace(PUT_FROM, PUT_FROM
      + `\n  await supabase.storage.from("job-photos").upload(key, blob, { contentType: type });`);
  } else if (BREAK === "client-size") {
    // THE CLIENT GETS A SECOND CHANCE TO STATE ITS SIZE.
    landed = out.includes(FINISH_FROM);
    out = out.replace(FINISH_FROM, FINISH_FROM + `\n    bytes: blob.size,`);
  } else {
    landed = true;                                 // nothing to change
  }
  return { out: out + SIGN, landed };
}

// The figure the door states at `finish`: nobody else's number.
const SERVER_BYTES = 7777777;
const PUT_HOST = "https://r2-answered-by-the-gate.invalid";

const WIDTHS = [
  { label: "1440", width: 1440, height: 900 },
  { label: "392", width: 392, height: 844 },
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

// ── THE JUDGE, LIFTED OUT SO A CANARY CAN REACH IT ────────────────────────
// `docs/gotchas.md` 95: a canary aimed at an assertion's inline copy of a rule
// tests nothing. Both rules live here, once, and the canary below runs this
// same function over a wire log that is known-bad.
const SIZE_KEYS = ["bytes", "size", "claimed_bytes", "content_length", "contentLength", "byte_length"];
export function judge(seen) {
  const sizeNamed = Object.keys(seen.finishBody || {}).filter((k) => SIZE_KEYS.includes(k));
  return {
    storageWrites: seen.storageWrites.length,
    sizeNamedAtFinish: sizeNamed,
    puts: seen.puts.length,
  };
}

mkdirSync(SHOTS, { recursive: true });
console.log(`Job-photo transport on "${job.customer_name}" (${job.id.slice(0, 8)}) at ${BASE}`);
console.log(`Fixture: a real ${FIXTURE.length}-byte 16x16 PNG. The door states bytes: ${SERVER_BYTES}.\n`);
if (BREAK) console.log(`  note  --break=${BREAK} is set: this run is a sabotage and MUST be red.\n`);

const browser = await chromium.launch({ headless: !HEADED });
const consoleNoise = [];
let signedIn = null;

// ── THE SIGN-IN, ONCE, IN ITS OWN CONTEXT WITH NO ROUTES REGISTERED ───────
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", OWNER.email);
    await page.fill("input[type=password]", OWNER.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
  await page.evaluate(() => {
    try {
      localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
      localStorage.setItem("dp.tour", "1");
    } catch { /* private mode */ }
  });
  signedIn = await ctx.storageState();
  await ctx.close();
}

try {
  for (const w of WIDTHS) {
    console.log(`  ${w.label}x${w.height}`);
    const ctx = await browser.newContext({
      viewport: { width: w.width, height: w.height },
      deviceScaleFactor: 1,
      storageState: signedIn,
    });
    const page = await ctx.newPage();
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") {
        consoleNoise.push(`${w.label} · ${m.type()} · ${m.text().slice(0, 200)}`);
      }
    });
    page.on("pageerror", (e) => consoleNoise.push(`${w.label} · pageerror · ${String(e.message).slice(0, 200)}`));

    const seen = {
      puts: [], putBytes: [], storageWrites: [], storageReads: [],
      startBody: null, finishBody: null, doorActions: [],
    };
    // READS ARE RECORDED SEPARATELY FROM WRITES. A signed-url read of
    // `/storage/v1/object` is not an upload, and folding the two together
    // would fail toward a FALSE DEFECT on a screen that is correct.
    page.on("request", (r) => {
      const u = r.url();
      if (/\/storage\/v1\/object\//.test(u)) {
        const m = r.method();
        (m === "POST" || m === "PUT" || m === "PATCH" ? seen.storageWrites : seen.storageReads)
          .push(`${m} ${u.slice(0, 160)}`);
      }
    });

    // 1 · THE MODULE, FETCHED IN NODE AND SIGNED. See the header for why this
    //     is not `route.fetch()`.
    let served = 0, landedCount = 0;
    await page.route("**/src/lib/photos.js*", async (route) => {
      const src = await (await fetch(route.request().url())).text();
      served++;
      const { out, landed } = rewritePhotosModule(src);
      if (landed) landedCount++;
      await route.fulfill({
        status: 200, contentType: "text/javascript",
        headers: { "cache-control": "no-store" }, body: out,
      });
    });

    // 2 · THE DOOR. The key is DERIVED by the product's own `storagePath` from
    //     the body the app really sent — the same expression `readStart`
    //     checks the answer against.
    await page.route("**/functions/v1/photo-door", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      seen.doorActions.push(body.action);
      if (body.action === "start") {
        seen.startBody = body;
        const key = storagePath({
          businessId: body.business_id, ownerId: body.booking_id,
          id: body.photo_id, type: body.content_type,
        });
        return route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({
            upload_url: `${PUT_HOST}/job-photos/${key}?X-Amz-Signature=answered-by-the-gate`,
            key, expires_in: 300,
          }),
        });
      }
      if (body.action === "finish") {
        seen.finishBody = body;
        const key = storagePath({
          businessId: body.business_id, ownerId: body.booking_id,
          id: body.photo_id, type: seen.startBody?.content_type,
        });
        return route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({
            photo: {
              id: body.photo_id, business_id: body.business_id, booking_id: body.booking_id,
              kind: body.kind, path: key, bytes: SERVER_BYTES,
              width: body.width, height: body.height, caption: body.caption ?? null,
            },
          }),
        });
      }
      return route.fulfill({
        status: 200, contentType: "application/json", body: JSON.stringify({ urls: {} }),
      });
    });

    // 3 · THE SIGNED PUT, and every Storage request — answered here, so even a
    //     sabotage stores nothing.
    await page.route(`${PUT_HOST}/**`, (route) => {
      const buf = route.request().postDataBuffer();
      seen.puts.push(route.request().url());
      seen.putBytes.push(buf ? buf.length : -1);
      return route.fulfill({ status: 200, body: "" });
    });
    await page.route("**/storage/v1/object/**", (route) => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ Key: "answered-by-the-gate-never-stored" }),
    }));

    // ONE NAVIGATION PER CONTEXT, so the rewritten module is what runs.
    await page.goto(`${BASE}/job/${job.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-tour="photos"]', { timeout: 30000 });
    await page.waitForTimeout(1200);

    const inputs = await page.locator('input[type=file]').count();
    check(`${w.label} · the photos section has a file input to press`, inputs > 0, String(inputs));

    const ran = await page.evaluate(() => globalThis.__wireProof || 0);
    check(`${w.label} · the served module is the one that RAN (served ${served}, landed ${landedCount}, executed ${ran})`,
      served > 0 && landedCount === served && ran === 1, `served ${served}, landed ${landedCount}, executed ${ran}`);

    // THE PRESS. `onFiles` runs the product's own roomFor -> addPhoto path.
    await page.setInputFiles('input[type=file]',
      { name: "wire.png", mimeType: "image/png", buffer: FIXTURE }).catch(() => {});
    // The three hops are all intercepted, so this is fast; the wait is for the
    // list reload that follows them.
    await page.waitForTimeout(2500);

    const v = judge(seen);

    check(`${w.label} · the door was asked to start and then to finish`,
      seen.doorActions.slice(0, 2).join(",") === "start,finish", seen.doorActions.join(",") || "nothing");

    check(`${w.label} · exactly one PUT, to the URL the door handed out`,
      v.puts === 1 && seen.puts[0]?.startsWith(PUT_HOST), `${v.puts} put(s) ${seen.puts[0]?.slice(0, 60) || ""}`);

    const claimed = seen.startBody?.claimed_bytes;
    check(`${w.label} · the body PUT is the photo, and its length is what the client claimed at start`,
      seen.putBytes[0] > 0 && seen.putBytes[0] === claimed, `put ${seen.putBytes[0]}, claimed ${claimed}`);

    // CRITERION 1's NEGATIVE HALF.
    check(`${w.label} · NO upload request reached Supabase Storage`,
      v.storageWrites === 0, v.storageWrites ? seen.storageWrites.slice(0, 2).join(" | ") : "");

    // CRITERION 2's CLIENT HALF.
    check(`${w.label} · the finish request names no size of any kind`,
      v.sizeNamedAtFinish.length === 0, v.sizeNamedAtFinish.join(",") || "");

    check(`${w.label} · the client accepted the door's figure, which is neither its claim nor the body`,
      SERVER_BYTES !== claimed && SERVER_BYTES !== seen.putBytes[0]
      && await page.locator(".error-box").count() === 0,
      `claim ${claimed}, body ${seen.putBytes[0]}, door ${SERVER_BYTES}`);

    const shot = path.join(SHOTS, `job-photo-wire-${w.label}${BREAK ? `-${BREAK}` : ""}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    artifacts.push(shot);
    completed++;
    await ctx.close();
  }

  // THE CONSOLE, READ AT EVERY WIDTH RATHER THAN ONCE.
  const noise = consoleNoise.filter((n) =>
    // `job_photos` is read from the real database after the press and holds no
    // row for this photo, because the door is answered here. That read is not
    // this item's defect; anything else is.
    !/photo-door|Failed to load resource.*functions\/v1/i.test(n));
  check("the console is clean at every width", noise.length === 0, noise.slice(0, 3).join(" | "));
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

// THE CANARY, RE-JUDGED EVERY RUN, THROUGH THE REAL `judge`: a wire log holding
// both faults at once. If it ever comes back clean, the rules have stopped
// discriminating and this run's green is worthless.
const bad = judge({
  storageWrites: ["POST https://x/storage/v1/object/job-photos/a/b/c.png"],
  puts: ["https://x/put"],
  finishBody: { action: "finish", bytes: 1234 },
});
const canaryCaught = bad.storageWrites === 1 && bad.sizeNamedAtFinish.join(",") === "bytes";

const { path: receiptPath } = writeReceipt({
  check_id: "job-photo-wire",
  started_at,
  status: failed || !canaryCaught ? "fail" : "pass",
  expected_targets: expectedTargets,
  discovered_targets: expectedTargets,
  attempted_targets: expectedTargets,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 12,
  assertion_floor: "7 per width (input, module-ran, start+finish, one PUT, body==claim, no Storage write, no size "
    + "at finish, server's figure accepted) x 2 widths + 1 console = 15 when both widths press. A width whose "
    + "screen never renders books its checks as failures rather than dropping out, so the count cannot silently "
    + "fall below 12.",
  canary: {
    id: "the-two-faults-in-one-log",
    observed_failure: canaryCaught,
    what: "a wire log with one Supabase Storage POST and a finish body naming bytes, put through the real judge()",
    rule: "storageWrites === 0 && no size key at finish",
  },
  failures,
  artifacts,
  dimensions: {
    roadmap: "0.11d2",
    criteria: [
      "no upload request reaches Supabase Storage (client half of criterion 1)",
      "the client cannot state the recorded size (client half of criterion 2)",
    ],
    widths: WIDTHS.map((w) => w.label),
    job: job.id,
    fixture_bytes: FIXTURE.length,
    door_states_bytes: SERVER_BYTES,
    sabotage: BREAK || null,
    intercepted: "photo-door, the signed PUT, and /storage/v1/object — the door is undeployed and there is no R2 "
      + "credential here, so these are the responses that cannot be arranged",
    unjudgeable: [
      "that R2 accepts a signature it minted itself — needs the release and an R2 credential",
      "that R2's head states the stored object's real length, and that job_photos.bytes equals it — needs a real "
        + "object in a real bucket; proved in memory by tests/photo-door-server.test.mjs 11 and 13",
    ],
  },
  warnings: [
    "This is 0.11d2's CLIENT half only. The R2 halves of both criteria stay open and are listed under unjudgeable.",
    "No job_photos row is written, so the photo does not appear in the list afterwards; the press is judged on the "
      + "wire and on the absence of a refusal, not on the list.",
    "Supabase Storage READS are recorded separately and are not counted as uploads.",
  ],
});
console.log(`\nreceipt  ${receiptPath}  —  validate: node scripts/receipt.mjs`);
process.exit(failed || !canaryCaught ? 1 : 0);
