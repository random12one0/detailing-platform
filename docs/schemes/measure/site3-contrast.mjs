// Contrast read off the RENDERED page: text colour from computed style, ground
// colour sampled as a real pixel out of the frame's own screenshot (so the
// gradient behind the text is the ground that gets measured, not the token).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 700, height: 900 }, deviceScaleFactor: 1 });
await pg.goto(new URL("grounds.html", import.meta.url).href);
await pg.waitForLoadState("networkidle");
await pg.evaluate(() => document.fonts.ready);

const TARGETS = [["h1", "h1 white"], ["h1 em", "h1 accent word"], [".fact", "fact line"],
  [".stat b", "stat number"], [".stat span", "stat label"], [".links span", "nav link"],
  [".chip", "chip text"], [".b2", "outline button label"]];

for (const id of ["a", "b", "c"]) {
  const shot = await pg.locator("#" + id).screenshot();
  const box = await pg.locator("#" + id).boundingBox();
  const px = await pg.evaluate(async ({ data, pts }) => {
    const img = new Image();
    img.src = "data:image/png;base64," + data;
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return pts.map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3));
  }, {
    data: shot.toString("base64"),
    pts: await pg.evaluate(({ id, sels, ox, oy }) => sels.map(([s]) => {
      const el = document.querySelector("#" + id + " " + s);
      const r = el.getBoundingClientRect();
      const own = getComputedStyle(el).backgroundColor;
      const painted = own !== "rgba(0, 0, 0, 0)" && own !== "transparent";
      // An element with its own fill is measured INSIDE it, in its padding, away
      // from the glyphs. Anything else is measured just outside its left edge,
      // which is the ground the text actually sits on.
      return painted
        ? [Math.round(r.right - ox - 5), Math.round(r.top - oy + r.height / 2)]
        : [Math.round(r.left - ox - 6), Math.round(r.top - oy + r.height / 2)];
    }), { id, sels: TARGETS, ox: box.x, oy: box.y }),
  });
  const cols = await pg.evaluate(({ id, sels }) => sels.map(([s]) =>
    getComputedStyle(document.querySelector("#" + id + " " + s)).color), { id, sels: TARGETS });
  console.log("\n== ground " + id.toUpperCase() + " ==");
  TARGETS.forEach(([, name], i) => {
    const fg = cols[i].match(/[\d.]+/g).slice(0, 3).map(Number);
    const bgp = px[i];
    const r = ratio(fg, bgp);
    console.log(`  ${name.padEnd(22)} ${cols[i].padEnd(20)} on rgb(${bgp}) = ${r.toFixed(2)}:1 ${r >= 4.5 ? "" : r >= 3 ? "  <- large-text only" : "  <- FAIL"}`);
  });
}
await b.close();
