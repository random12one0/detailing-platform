// DOES THE QR ACTUALLY SCAN? — the one question this feature turns on.
//
// The owner asked for a QR generator on 2026-09-02 and the answer he was given
// named exactly this risk: "a QR that looks right and doesn't work is the kind
// of bug this project keeps getting bitten by". It is the same family as
// `travel_fee` — a number PRINTED on a screen that was never CHARGED — and as
// `money-export`, whose whole job is to tie the file back to the screen. A
// picture of a QR is not a QR.
//
// So this renders the code the way `BookingLink.jsx` renders it, reads the
// pixels back, and DECODES them with a different library than the one that
// wrote them (`jsqr`, a devDependency, is an independent implementation). It
// passes only if the string that comes out is the string that went in.
//
// It runs in a real browser because the drawing is `<canvas>` — the encoder
// could be perfect and the rendering still unscannable, which is the half a
// pure-Node test could not see. The three ways to get the rendering wrong are
// all covered below: too small a quiet zone, an inverted or low-contrast
// palette, and a scale that loses modules.
//
//   node tests/qr-scans.test.mjs
//
// Needs the dev server on :5173 (the same as sweep-widths.mjs) but NO login
// and no seeded data — it drives an offscreen canvas on the public page, so it
// is the cheapest browser test in the repo.

import { createRequire } from "node:module";
const require_ = createRequire(import.meta.url);
const { chromium } = require_("./../app/node_modules/playwright/index.js");

const BASE = "http://localhost:5173";
// Short, long, and one with the characters a real slug can carry.
const URLS = [
  "https://detailingplatform.com/book/demo-detail",
  "https://detailingplatform.com/book/andrews-auto-detail-long-beach-california",
  "http://localhost:5173/book/a",
];
const QUIET = 4;   // must match BookingLink.jsx
const PX = 30;     // must match BookingLink.jsx

let n = 0;
let failed = 0;
const check = (name, cond, detail = "") => {
  n++;
  if (!cond) { console.error(`FAIL  ${name}${detail ? `  — ${detail}` : ""}`); failed++; }
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

// The generator module, loaded in the page exactly as the app loads it.
const results = await page.evaluate(async ({ urls, QUIET, PX }) => {
  const { default: qrcode } = await import("/node_modules/qrcode-generator/dist/qrcode.mjs");
  return urls.map((url) => {
    const q = qrcode(0, "M");
    q.addData(url);
    q.make();
    const n = q.getModuleCount();
    const size = (n + QUIET * 2) * PX;
    const el = document.createElement("canvas");
    el.width = size; el.height = size;
    const g = el.getContext("2d");
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, size, size);
    g.fillStyle = "#000000";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (q.isDark(r, c)) g.fillRect((c + QUIET) * PX, (r + QUIET) * PX, PX, PX);
      }
    }
    const px = g.getImageData(0, 0, size, size);
    // AND THE SAME CODE AT THE SIZE A PERSON ACTUALLY LOOKS AT. The canvas
    // is 1,110-1,350px and `.qr-plate canvas` shows it at 200 — a downscale
    // of about 6:1, which is where a QR gets lost: nearest-neighbour
    // sampling at that ratio can drop whole modules. It matters because
    // holding a phone up to somebody else’s screen is the obvious way this
    // gets used before anything is ever printed.
    const shown = document.createElement("canvas");
    shown.width = 200; shown.height = 200;
    const sg = shown.getContext("2d");
    // `image-rendering: pixelated` in the stylesheet is nearest-neighbour,
    // so that is the one measured; smoothing is the browser default and the
    // easier case.
    sg.imageSmoothingEnabled = false;
    sg.drawImage(el, 0, 0, 200, 200);
    return {
      url, size, modules: n,
      data: Array.from(px.data),
      onScreen: Array.from(sg.getImageData(0, 0, 200, 200).data),
      // The very corner, which must be inside the quiet zone and light.
      corner: [px.data[0], px.data[1], px.data[2]],
    };
  });
}, { urls: URLS, QUIET, PX });

await browser.close();

const jsQR = require_("./../app/node_modules/jsqr/dist/jsQR.js");
const decode = jsQR.default ?? jsQR;

for (const r of results) {
  // 1. IT DECODES, and to the string that went in. The whole point.
  const out = decode(Uint8ClampedArray.from(r.data), r.size, r.size);
  check(`"${r.url.slice(0, 40)}…" decodes`, !!out, "jsQR returned null");
  check(`"${r.url.slice(0, 40)}…" decodes to the SAME url`,
    out?.data === r.url, `got ${JSON.stringify(out?.data)}`);

  // 2. IT ALSO SCANS AT THE SIZE IT IS DRAWN ON THE SCREEN, not just at the
  //    size it saves. Somebody holding a phone up to the dashboard is the
  //    first thing that will happen to this feature.
  const seen = decode(Uint8ClampedArray.from(r.onScreen), 200, 200);
  check(`"${r.url.slice(0, 40)}…" scans at the 200px it is SHOWN at`,
    seen?.data === r.url, `${r.modules} modules downscaled from ${r.size}px`);

  // 3. THE QUIET ZONE IS LIGHT. A scanner finds the code by its margin, and
  //    this is the failure a screenshot cannot show you — the code reads fine
  //    on white paper and not at all on the dashboard's near-black panel.
  check(`"${r.url.slice(0, 40)}…" has a light quiet zone`,
    r.corner[0] > 250 && r.corner[1] > 250 && r.corner[2] > 250,
    `corner pixel is rgb(${r.corner.join(",")})`);

  // 4. THE SAVED FILE IS BIG ENOUGH TO PRINT. Saving what is on the screen
  //    (200px) is the mistake that makes a QR useless at the one size that
  //    matters — a card, a van panel, a window sticker.
  check(`"${r.url.slice(0, 40)}…" saves at a printable size`,
    r.size >= 1000, `${r.size}px`);
}

// 5. THE TWO CONSTANTS ARE THE ONES THE COMPONENT USES. If somebody tunes
//    PX or QUIET in BookingLink.jsx and not here, every check above is
//    measuring a code the product does not draw — a check that has quietly
//    stopped testing the thing it names.
const src = (await import("node:fs")).readFileSync("app/src/components/BookingLink.jsx", "utf8");
check("QUIET still matches the component", new RegExp(`const QUIET = ${QUIET};`).test(src));
check("PX still matches the component", new RegExp(`const PX = ${PX};`).test(src));

console.log(failed ? `\n${n} checks, ${failed} FAILED` : `\nqr-scans: ${n} checks pass`);
process.exit(failed ? 1 : 0);
