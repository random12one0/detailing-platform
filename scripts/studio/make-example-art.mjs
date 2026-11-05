// Example art for the fictional Brightline Auto Care fixture (Studio S1).
//
//   node scripts/studio/make-example-art.mjs
//
// Writes app/public/examples/brightline/gallery-1..6.webp + credits.json.
// These are DRAWN ILLUSTRATIONS made by this script, not photographs and not
// AI images. Nothing here may ever be shown as a real detailer's work: the
// seed's captions say "Example imagery" and the site prints them.
// Pairs: 1→2 and 3→4 are the same drawing before and after (dust, matte paint
// versus clean, glossy paint), so a before/after slider has real matched pairs.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "app/public/examples/brightline");
const { chromium } = createRequire(path.join(ROOT, "app/package.json"))("playwright");
const W = 1600, H = 1200;

// The car outline is the mockup's own symbol (docs/improve/studio/mockup/index.html).
const CAR = `<path d="M18 112c-6-1-10-6-9-12l3-17c1-7 7-12 14-13l58-8 52-30c9-5 19-8 30-8h88c13 0 25 5 34 13l34 29 50 7c10 1 18 9 19 19l2 14c1 7-4 13-11 14z"/>`;

function scene({ paint, glass, wall, floor, light, dirty, seed, flip }) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const dust = dirty
    ? Array.from({ length: 260 }, () => `<circle cx="${(rnd() * 390 + 5).toFixed(1)}" cy="${(rnd() * 100 + 12).toFixed(1)}" r="${(rnd() * 2.4 + .4).toFixed(2)}" fill="#8a7a5c" opacity="${(rnd() * .5 + .2).toFixed(2)}"/>`).join("")
      + `<path d="M30 104c40-10 90 4 140-2s120-8 210 0" stroke="#6b5a3c" stroke-width="14" opacity=".45" fill="none" filter="url(#blur)"/>`
    : "";
  const gloss = dirty ? "" : `
    <path d="M40 82c60-6 180-9 330-2" stroke="${light}" stroke-width="3.2" fill="none" opacity=".9"/>
    <path d="M120 40c40-4 90-6 150-2" stroke="#fff" stroke-width="2" fill="none" opacity=".55"/>
    <path d="M52 92c50-3 120-3 200 0" stroke="#fff" stroke-width="1.2" fill="none" opacity=".35"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="wall" cx="${flip ? "30%" : "70%"}" cy="20%" r="90%"><stop offset="0" stop-color="${wall[0]}"/><stop offset="1" stop-color="${wall[1]}"/></radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${floor[0]}"/><stop offset="1" stop-color="${floor[1]}"/></linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${paint[0]}"/><stop offset="1" stop-color="${paint[1]}"/></linearGradient>
    <clipPath id="car">${CAR}</clipPath>
    <filter id="blur"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="soft"><feGaussianBlur stdDeviation="30"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${seed % 97}"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .5 0"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#wall)"/>
  <rect y="${H * .66}" width="${W}" height="${H * .34}" fill="url(#floor)"/>
  <rect x="${flip ? 120 : 980}" y="60" width="500" height="22" rx="11" fill="${light}" opacity="${dirty ? .25 : .7}" filter="url(#soft)"/>
  <ellipse cx="${W / 2}" cy="${H * .8}" rx="640" ry="52" fill="#000" opacity=".55" filter="url(#soft)"/>
  <g transform="translate(${flip ? W - 120 : 120} ${H * .34}) scale(${flip ? -3.4 : 3.4} 3.4)">
    <g fill="url(#body)" ${dirty ? 'style="filter:saturate(.35) brightness(.78)"' : ""}>${CAR}</g>
    <path d="M150 34h48l-4 30h-82zM210 34h44c8 0 15 3 21 8l23 22h-92z" fill="${glass}" opacity="${dirty ? .45 : .9}"/>
    ${gloss}
    <g clip-path="url(#car)">${dust}</g>
    <circle cx="98" cy="112" r="27" fill="#0c0d0e"/><circle cx="98" cy="112" r="13" fill="${dirty ? "#6d6a62" : "#c9ced1"}"/>
    <circle cx="306" cy="112" r="27" fill="#0c0d0e"/><circle cx="306" cy="112" r="13" fill="${dirty ? "#6d6a62" : "#c9ced1"}"/>
  </g>
  ${dirty ? "" : `<g transform="translate(${flip ? W - 120 : 120} ${H * .34 + 139 * 3.4 + 139 * 1.1}) scale(${flip ? -3.4 : 3.4} -1.1)" opacity=".12"><g fill="${paint[0]}">${CAR}</g></g>`}
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity=".35"/>
</svg>`;
}

const PETROL = { wall: ["#24494a", "#0b1a1b"], floor: ["#132627", "#070e0e"], light: "#f3e9d8" };
const ART = [
  ["gallery-1.webp", { ...PETROL, paint: ["#2f5f86", "#183650"], glass: "#7fa3b8", dirty: true, seed: 11 }, "Pair 1, before: dusty matte paint"],
  ["gallery-2.webp", { ...PETROL, paint: ["#3a77a8", "#16334d"], glass: "#9cc4da", dirty: false, seed: 11 }, "Pair 1, after: clean glossy paint"],
  ["gallery-3.webp", { wall: ["#3a2c26", "#120c0a"], floor: ["#241a16", "#0a0605"], light: "#ffd9b0", paint: ["#c23c26", "#6d1a10"], glass: "#b59b8a", dirty: true, seed: 29, flip: true }, "Pair 2, before"],
  ["gallery-4.webp", { wall: ["#3a2c26", "#120c0a"], floor: ["#241a16", "#0a0605"], light: "#ffd9b0", paint: ["#e5482f", "#7a1d12"], glass: "#d8c2b2", dirty: false, seed: 29, flip: true }, "Pair 2, after"],
  ["gallery-5.webp", { ...PETROL, paint: ["#e9e6dd", "#9da3a2"], glass: "#5d7f80", dirty: false, seed: 41 }, "Single: white car under the workshop light"],
  ["gallery-6.webp", { wall: ["#1d2a33", "#080c10"], floor: ["#111a20", "#05080a"], light: "#e54b31", paint: ["#2b2f33", "#0e1012"], glass: "#59707e", dirty: false, seed: 53, flip: true }, "Single: dark car, vermilion light"],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [file, opts] of ART) {
    const b64 = await page.evaluate(async ({ svg, W, H }) => {
      const img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      await img.decode();
      const c = Object.assign(document.createElement("canvas"), { width: W, height: H });
      c.getContext("2d").drawImage(img, 0, 0);
      return c.toDataURL("image/webp", 0.8).split(",")[1];
    }, { svg: scene(opts), W, H });
    writeFileSync(path.join(OUT, file), Buffer.from(b64, "base64"));
    console.log(file, Math.round(Buffer.from(b64, "base64").length / 1024) + "KB");
  }
} finally { await browser.close(); }

writeFileSync(path.join(OUT, "credits.json"), JSON.stringify({
  what: "Drawn illustrations for the fictional Brightline Auto Care example. Not photographs, not AI-generated, not anyone's real work.",
  made_by: "scripts/studio/make-example-art.mjs (SVG drawn in code, encoded to WebP by Chromium)",
  car_outline: "docs/improve/studio/mockup/index.html, symbol #car (Control Room mockup, own work)",
  licence: "Own work for this repository; no third-party material.",
  size: { width: W, height: H },
  files: Object.fromEntries(ART.map(([f, , what]) => [f, what])),
}, null, 2) + "\n");
