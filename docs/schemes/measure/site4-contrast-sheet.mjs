// Every text pair on the design sheet, in both colourways, measured against the
// pixel actually behind it.
//
// TWO FAULTS THIS SCRIPT ALREADY HAD, both of which invent results rather than
// missing them, and both worth keeping written down:
//
//   1. NEVER SHOOT fullPage HERE. The ground is a `position: fixed` layer, and
//      a full-page screenshot paints it once at the top — every pixel below the
//      first screen came back WHITE, which manufactured seven failures in the
//      paper colourway and none in graphite. Shoot the viewport, per screen.
//   2. READ THE COLOURS BEFORE PAINTING THEM OUT. Injecting
//      `color: transparent` first makes every computed colour rgba(0,0,0,0),
//      so every pair reports 1.00:1 and the run "fails" completely. Collect
//      first, paint out second, sample third.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");

const lin = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const L = ([r, g, b]) => .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };

const VW = 1440, VH = 900;
const browser = await chromium.launch();
const bad = [];

for (const c of ["b", "c"]) {
  const p = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
  await p.goto(new URL("../docs/schemes/kinzie-styleguide.html?c=" + c + "&smooth=0", import.meta.url).href);
  await p.waitForLoadState("networkidle");
  await p.evaluate(() => document.fonts.ready);
  // reveals hide things; show everything, and drop the fixed switcher so it
  // cannot sit over what is being sampled
  await p.addStyleTag({ content: ".paint{display:none!important}" });
  await p.evaluate(() => document.querySelectorAll(".rv-hidden").forEach(e => e.classList.remove("rv-hidden")));
  await p.waitForTimeout(400);

  // ── 1 · collect, with the real colours still on the page ──────────────
  const items = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("main *")) {
      if (el.children.length) continue;
      const t = (el.textContent || "").trim();
      if (t.length < 2) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || +cs.opacity < .5) continue;
      const big = parseFloat(cs.fontSize) >= 24 ||
                  (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
      el.dataset.cid = String(out.length);
      out.push({
        text: t.slice(0, 30), color: cs.color, size: cs.fontSize, big,
        // sample INSIDE the element, at its padding, on the vertical centre —
        // a point on a corner is an anti-aliased blend and lies both ways
        x: Math.round(r.left + Math.min(12, r.width / 2)),
        docY: Math.round(r.top + scrollY + r.height / 2),
        sticky: !!el.closest(".peel")           // a pinned block moves with the scroll
      });
    }
    return out;
  });

  // ── 2 · paint every glyph out; what is left is exactly the ground ──────
  await p.addStyleTag({ content: "main *{color:transparent!important}" });
  await p.waitForTimeout(250);

  // ── 3 · walk the page a screen at a time and sample ────────────────────
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  const done = new Set();
  let checked = 0, worst = { r: 99, text: "—" };
  for (let y = 0; y < total; y += VH - 60) {
    await p.evaluate(v => window.scrollTo(0, v), y);
    await p.waitForTimeout(200);
    const top = await p.evaluate(() => scrollY);
    // where each item actually IS on this screen — asked of the live page, so
    // a pinned section reports where it is now rather than where it started
    const here = await p.evaluate(() => {
      const out = [];
      let i = 0;
      for (const el of document.querySelectorAll("main [data-cid]")) {
        const r = el.getBoundingClientRect();
        if (r.width < 6 || r.height < 6) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || +cs.opacity < .5) continue;
        i = +el.dataset.cid + 1;
        if (r.top < 6 || r.bottom > innerHeight - 6) continue;
        const x = Math.round(r.left + Math.min(12, r.width / 2));
        const y = Math.round(r.top + r.height / 2);
        // IS ANYTHING PAINTED OVER IT? A pinned block covers what is behind it,
        // and sampling through one reports the ratio of a pair that nobody can
        // see. Reported 2.63:1 for a label that is really 5.71:1.
        const hit = document.elementFromPoint(x, y);
        if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) continue;
        out.push({ i: +el.dataset.cid, x: x, y: y, w: Math.round(r.width) });
      }
      return out;
    });

    // THE HIT TEST AND THE PIXEL MUST COME FROM THE SAME FRAME. Shooting
    // first and hit-testing second let a pinned panel move between the two,
    // and reported 2.63:1 for a label that a screenshot shows on paper at
    // 5.71:1. Shoot AFTER the hit test.
    const shot = await p.screenshot();
    await p.evaluate(async d => {
      const img = new Image(); img.src = d; await img.decode();
      const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0);
      // A SINGLE PIXEL IS NOT A GROUND. This page's ground carries a dot
      // lattice, so one sample can land on a dot and decide a pass or a fail
      // on its own — the same class of fault as sampling a rounded corner.
      // Take five points across the element and return the MEDIAN by
      // luminance, which cannot be swung by one speck.
      window.__pick = (x, yy, w) => {
        const lin = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
        const lum = p => .2126 * lin(p[0]) + .7152 * lin(p[1]) + .0722 * lin(p[2]);
        const pts = [];
        for (let k = 0; k < 5; k++) {
          const px = Math.round(x + k * Math.max(2, Math.min(9, (w || 40) / 6)));
          pts.push([...cx.getImageData(px, yy, 1, 1).data].slice(0, 3));
        }
        pts.sort((a, b) => lum(a) - lum(b));
        return pts[2];
      };
    }, "data:image/png;base64," + shot.toString("base64"));


    for (const h of here) {
      const it = items[h.i];
      if (!it) continue;
      const key = it.sticky ? `${h.i}@${top}` : h.i;
      if (done.has(key)) continue;
      done.add(key);
      const bg = await p.evaluate(([x, yy, w]) => window.__pick(x, yy, w), [h.x, h.y, h.w]);
      const n = it.color.match(/[\d.]+/g).map(Number);
      const a = n.length > 3 ? n[3] : 1;
      const fg = n.slice(0, 3).map((ch, k) => ch * a + bg[k] * (1 - a));
      const r = ratio(fg, bg), need = it.big ? 3 : 4.5;
      checked++;
      if (r < worst.r) worst = { r, ...it };
      if (r < need) bad.push({ c, r: +r.toFixed(2), need, at: top, bg: bg.join(","), ...it });
    }
  }
  console.log(`${c}: ${checked} pairs, worst ${worst.r.toFixed(2)}:1 — "${worst.text}"`);
  await p.close();
}
await browser.close();

if (bad.length) {
  console.log("\nFAIL:");
  for (const x of bad) console.log(`  ${x.c}  ${x.r}:1 < ${x.need}  "${x.text}"  ${x.size} ${x.color}  at scrollY=${x.at}  ground=rgb(${x.bg})`);
} else console.log("\nall pairs pass");
process.exit(bad.length ? 1 : 0);
