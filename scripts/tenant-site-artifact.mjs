// Bake a tenant site into a single file that can be PUBLISHED AS AN ARTIFACT,
// which is a URL that opens on his phone and can be scrolled and pressed —
// strictly better than a screenshot for anything interactive, and the reason
// this exists.
//
//   node scripts/tenant-site-artifact.mjs y-kinzie [out.html]
//
// The repo copy of a site keeps its Unsplash URLs — that is what makes it a
// portable 400KB file. An ARTIFACT cannot: its CSP blocks every external image with no
// visible error, so a published copy would render with five holes in it.
// This bakes every remote photograph into the file and strips the document
// wrapper the artifact host supplies itself.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const { chromium } = createRequire(resolve("app/package.json"))("playwright");


const page = process.argv[2] || "y-kinzie";
const src = `docs/tenant-sites/${page.replace(/\.html$/, "")}.html`;
let html = readFileSync(src, "utf8");
const urls = [...new Set([...html.matchAll(/src="(https:\/\/images\.unsplash[^"]+)"/g)].map(m => m[1]))];
console.log(`${urls.length} remote photographs to bake`);

const b = await chromium.launch();
const pg = await (await b.newContext()).newPage();
await pg.goto("about:blank");
for (const u of urls) {
  const clean = u.replace(/&amp;/g, "&");
  const m = clean.match(/w=(\d+)&h=(\d+)/);
  // half the requested pixels is still above the box's CSS size at 2x on a
  // phone, and it is a quarter of the bytes
  const dw = Math.round(+m[1] * 0.72), dh = Math.round(+m[2] * 0.72);
  const data = await pg.evaluate(async ({ u, dw, dh }) => {
    const im = new Image(); im.crossOrigin = "anonymous"; im.src = u; await im.decode();
    const c = document.createElement("canvas"); c.width = dw; c.height = dh;
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
    x.drawImage(im, 0, 0, dw, dh);
    return c.toDataURL("image/webp", 0.8);
  }, { u: clean, dw, dh });
  html = html.split(u).join(data);
  console.log(`  ${dw}x${dh}  ${(data.length / 1365).toFixed(0)} KB  ${clean.slice(31, 61)}`);
}
await b.close();

// strip the document wrapper: the host supplies doctype/html/head/body
html = html
  .replace(/^[\s\S]*?<head>/, "")
  .replace(/<meta charset[^>]*>\s*/, "")
  .replace(/<meta name="viewport"[^>]*>\s*/, "")
  .replace(/<\/head>\s*<body>/, "")
  .replace(/<\/body>\s*<\/html>\s*$/, "")
  // the root element is the host's, so the default colourway is set by script
  .replace('var STILL = matchMedia', 'if (!document.documentElement.getAttribute("data-c"))\n  document.documentElement.setAttribute("data-c", "b");\nvar STILL = matchMedia');
const out = process.argv[3] || `${page.replace(/\.html$/, "")}-artifact.html`;
writeFileSync(out, html);
console.log(`\nwrote ${out}  ${(html.length / 1024 / 1024).toFixed(2)} MB`);
