// Contrast over the WHOLE page, sampled off the rendered pixels.
// Rule 102: viewport shots, never fullPage - a fixed ground paints once.
// Rule 103: collect the colours BEFORE painting the glyphs out.
// Rule 104: stamp an id and match on it, never by index.
// Rule 105: five samples per element, median by luminance.
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { chromium } = createRequire(resolve("app/package.json"))("playwright");
const file = process.argv[2];
const W = +(process.argv[3] || 1440);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: 900 }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(resolve(file)).href, { waitUntil: "networkidle" });
await p.waitForTimeout(900);
await p.evaluate(() => {          // reveals off, so nothing is at opacity 0
  document.querySelectorAll(".rv-hidden").forEach(e => e.classList.remove("rv-hidden"));
});

const items = await p.evaluate(() => {
  let i = 0; const out = [];
  document.querySelectorAll("body *").forEach(e => {
    const t = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!t) return;
    const c = getComputedStyle(e);
    if (c.visibility === "hidden" || c.display === "none" || +c.opacity === 0) return;
    if (parseFloat(c.textIndent) < -999) return;
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const id = "gx" + (i++);
    e.setAttribute("data-gx", id);
    out.push({ id, color: c.color, size: parseFloat(c.fontSize), weight: c.fontWeight,
               tag: e.tagName, txt: e.textContent.trim().slice(0, 34) });
  });
  return out;
});

const shots = [];
const H = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < H; y += 420) {
  await p.evaluate(v => scrollTo(0, v), y);
  await p.waitForTimeout(220);
  const boxes = await p.evaluate(() => {
    const o = {};
    document.querySelectorAll("[data-gx]").forEach(e => {
      const r = e.getBoundingClientRect();
      const mid = r.y + r.height / 2;
      const NAV = 64;
      if (mid > NAV + 8 && mid < innerHeight - 6 && r.width > 4)
        o[e.dataset.gx] = [r.x, r.y, r.width, r.height];
    });
    return o;
  });
  await p.evaluate(() => {        // paint the glyphs out AFTER collecting
    document.querySelectorAll("[data-gx]").forEach(e => e.style.color = "transparent");
  });
  const buf = await p.screenshot();
  await p.evaluate(() => {
    document.querySelectorAll("[data-gx]").forEach(e => e.style.color = "");
  });
  shots.push({ boxes, buf });
}

const px = await p.evaluate(() => 1);
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = a => 0.2126 * lin(a[0]) + 0.7152 * lin(a[1]) + 0.0722 * lin(a[2]);
const ratio = (a, c) => { let x = L(a), y = L(c); if (y > x) [x, y] = [y, x]; return (x + .05) / (y + .05); };

// decode the pngs in the browser (there is no image library on this machine)
const grounds = {};
for (const s of shots) {
  const g = await p.evaluate(async ({ b64, boxes }) => {
    const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
    const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
    const x = c.getContext("2d"); x.drawImage(im, 0, 0);
    const out = {};
    for (const [id, [bx, by, bw, bh]] of Object.entries(boxes)) {
      const rows = [by + 1.5, by + bh / 2, by + bh - 1.5]
        .map(v => Math.round(Math.max(1, Math.min(im.height - 2, v))));
      const pts = [];
      for (const yy of rows) for (const f of [.15, .5, .85]) pts.push([Math.round(bx + bw * f), yy]);
      const cols = pts.map(([px, py]) => { const d = x.getImageData(px, py, 1, 1).data; return [d[0], d[1], d[2]]; });
      out[id] = cols;
    }
    return out;
  }, { b64: s.buf.toString("base64"), boxes: s.boxes });
  Object.assign(grounds, g);
}
await b.close();

let fails = 0, worst = 99, worstOf = "";
for (const it of items) {
  const cols = grounds[it.id];
  if (!cols) continue;
  const rgb = it.color.match(/[\d.]+/g).map(Number).slice(0, 3);
  const sorted = cols.slice().sort((a, c) => L(a) - L(c));
  const med = sorted[Math.floor(sorted.length / 2)];
  const r = ratio(rgb, med);
  const big = it.size >= 24 || (it.size >= 18.66 && +it.weight >= 700);
  const floor = big ? 3 : 4.5;
  if (r < worst) { worst = r; worstOf = `${it.tag} ${it.size}px "${it.txt}"`; }
  if (r < floor) { fails++; console.log(`FAIL ${r.toFixed(2)}:1 (floor ${floor}) ${it.tag} ${it.size}px ${it.color} on ${JSON.stringify(cols)} med ${med} "${it.txt}"`); }
}
console.log(`${items.length} text elements measured, ${fails} below floor. Worst ${worst.toFixed(2)}:1 — ${worstOf}`);
