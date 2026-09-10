// Crop, scale and re-encode an image through a headless canvas.
//
// WHY IT EXISTS: there is no sharp, no jimp and no PIL on this machine, and
// Playwright is already installed. A canvas does the whole job and writes png,
// jpeg or webp by file extension.
//
// `seam` finds the row where a stacked before/after was joined, by scanning
// for the largest row-to-row difference rather than by eye — playbook rule 110.
//   node scripts/tenant-site-image.mjs seam <src>
//   node scripts/tenant-site-image.mjs crop <src> <out> sx,sy,sw,sh,dw,dh [quality]
import { createRequire } from "node:module";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const require = createRequire(resolve("app/package.json"));
const { chromium } = require("playwright");

const [cmd, src, ...rest] = process.argv.slice(2);
const b64 = readFileSync(src).toString("base64");
const mime = src.endsWith(".png") ? "image/png" : "image/jpeg";
const dataUri = `data:${mime};base64,${b64}`;

const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
await p.goto("about:blank");

if (cmd === "seam") {
  const out = await p.evaluate(async (u) => {
    const im = new Image(); im.src = u; await im.decode();
    const c = document.createElement("canvas");
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const rows = [];
    for (let y = 1; y < c.height; y++) {
      let s = 0;
      for (let px = 0; px < c.width; px += 4) {
        const a = (y * c.width + px) * 4, bb = ((y - 1) * c.width + px) * 4;
        s += Math.abs(d[a] - d[bb]) + Math.abs(d[a + 1] - d[bb + 1]) + Math.abs(d[a + 2] - d[bb + 2]);
      }
      rows.push([y, s / (c.width / 4)]);
    }
    const mid = rows.filter(r => r[0] > c.height * 0.35 && r[0] < c.height * 0.65);
    mid.sort((a, b) => b[1] - a[1]);
    return { w: c.width, h: c.height, top5: mid.slice(0, 5) };
  }, dataUri);
  console.log(JSON.stringify(out, null, 1));
} else if (cmd === "crop") {
  const [out, spec, q] = rest;
  const [sx, sy, sw, sh, dw, dh] = spec.split(",").map(Number);
  const outMime = out.endsWith(".png") ? "image/png" : out.endsWith(".webp") ? "image/webp" : "image/jpeg";
  const b64out = await p.evaluate(async ({ u, sx, sy, sw, sh, dw, dh, outMime, q }) => {
    const im = new Image(); im.src = u; await im.decode();
    const c = document.createElement("canvas");
    c.width = dw; c.height = dh;
    const x = c.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(im, sx, sy, sw, sh, 0, 0, dw, dh);
    return c.toDataURL(outMime, q).split(",")[1];
  }, { u: dataUri, sx, sy, sw, sh, dw, dh, outMime, q: q ? +q : 0.9 });
  writeFileSync(out, Buffer.from(b64out, "base64"));
  console.log(`${out}  ${dw}x${dh}  from ${sx},${sy} ${sw}x${sh}`);
}
await b.close();
