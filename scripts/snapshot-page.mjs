// Freeze one page into a single self-contained HTML file that opens anywhere.
//
// WHY THIS EXISTS, and it is not a build step: the owner reads these sessions
// on a phone through remote desktop and cannot open `localhost` (CLAUDE.md's
// first section). Screenshots answer "does it look right"; they do not let him
// SCROLL a long page, read the terms list, or see how a section behaves at his
// own width. This writes a file that does — one document, no server, no React,
// no network except the two Google fonts.
//
//   node scripts/snapshot-page.mjs pricing
//   node scripts/snapshot-page.mjs "book/demo-detail" --out=snapshots
//   node scripts/snapshot-page.mjs pricing --width=392
//
// Drop the leading slash: Git Bash rewrites a bare `/pricing` argument into
// `C:/Program Files/Git/pricing` before node sees it. Both forms work anyway.
//
// WHAT IT IS NOT. It is a PHOTOGRAPH, not the product: no React, no Supabase,
// every button is inert and every figure is whatever the database said at the
// moment it was taken. Nobody should ever verify behaviour against one. The
// checks that decide whether something works are still `sweep-widths.mjs`,
// `sweep-booking-steps.mjs` and the suites — this only answers "show me".
//
// THE TWO THINGS THAT MAKE IT NON-OBVIOUS, both learned the same day:
//   · The landing surface holds every `data-rv` block at opacity 0 until it
//     scrolls into view, so a frozen copy is mostly blank unless the reveal is
//     forced first. `.in` is the class `landing/thread.js` adds.
//   · Cross-origin stylesheets (Google Fonts) throw on `cssRules`, so they are
//     kept as a `<link>` rather than inlined. Everything same-origin is
//     inlined, because a `<link>` to `/src/theme.css` means nothing once the
//     dev server is gone.

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = "http://localhost:5173";
const argOf = (f, d = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${f}=`));
  return hit ? hit.slice(f.length + 3) : d;
};
const raw = process.argv[2];
if (!raw) {
  console.error("usage: node scripts/snapshot-page.mjs <path> [--width=1440] [--out=snapshots]");
  process.exit(1);
}
// Undo MSYS path conversion, and accept the path with or without a slash.
const cleaned = raw.replace(/^.*?Git[\\/]/, "").replace(/^\/+/, "");
const PATH = `/${cleaned}`;
const WIDTH = Number(argOf("width", "1440"));
const OUT = argOf("out", "snapshots");

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 1000 } });
const problems = [];
page.on("pageerror", (e) => problems.push(e.message));
await page.goto(`${BASE}${PATH}`, { waitUntil: "networkidle" });

// Reveal everything, then let the transitions finish. Same reason as
// shoot-dashboard.mjs's --url branch.
await page.evaluate(() => {
  document.querySelectorAll("[data-rv]").forEach((el) => el.classList.add("in"));
});
await page.waitForTimeout(900);

const html = await page.evaluate(() => {
  // 1. INLINE EVERY SAME-ORIGIN RULE. `document.styleSheets` is the resolved
  //    truth — it covers the app's three stylesheets and anything Vite injected
  //    — and reading `cssRules` on a cross-origin sheet throws, which is how
  //    the Google Fonts link identifies itself.
  const inline = [];
  const external = [];
  for (const sheet of document.styleSheets) {
    try {
      const rules = [...sheet.cssRules].map((r) => r.cssText).join("\n");
      inline.push(rules);
    } catch {
      if (sheet.href) external.push(sheet.href);
    }
  }

  // 2. THE VALUES SET ON THE ROOT AT RUNTIME. A tenant's accent is written onto
  //    <html> by lib/theme.js rather than living in a stylesheet, so a frozen
  //    copy without them renders the house green on a page that was showing
  //    somebody's blue.
  const rootStyle = document.documentElement.getAttribute("style") || "";
  const rootClass = document.documentElement.className || "";
  const bodyClass = document.body.className || "";

  // 3. Scripts are dead weight in a snapshot and would try to reach a Supabase
  //    that is not there.
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll("script").forEach((s) => s.remove());

  return {
    inline: inline.join("\n"),
    external,
    rootStyle,
    rootClass,
    bodyClass,
    body: clone.innerHTML,
    title: document.title,
  };
});

// The images. A snapshot that reaches back to localhost for a photo is a
// snapshot with holes in it on any other machine.
const images = await page.evaluate(() => [...document.images].map((i) => i.src));
const dataUris = {};
for (const src of [...new Set(images)]) {
  if (!src || src.startsWith("data:")) continue;
  try {
    const res = await page.request.get(src);
    const type = res.headers()["content-type"] || "image/png";
    dataUris[src] = `data:${type};base64,${Buffer.from(await res.body()).toString("base64")}`;
  } catch { /* leave the original src; one missing photo beats no file */ }
}

await browser.close();

let body = html.body;
for (const [src, uri] of Object.entries(dataUris)) body = body.split(src).join(uri);

// The Artifact wrapper supplies <!doctype>, <html>, <head> and <body>, so this
// file is the CONTENT of that body plus its own <title> and <style>. It also
// opens fine on its own in any browser, which is the half that survives if we
// ever stop using artifacts.
// THE TITLE NAMES THE PAGE, NOT THE APP. Every route in this product sets
// `document.title` to "Detailing Platform", so a file named from it is one of
// several identical ones the moment there are two snapshots.
const pageName = (cleaned.split("/")[0] || "home")
  .replace(/-/g, " ")
  .replace(/(^|\s)\w/g, (c) => c.toUpperCase());
const out = `<title>${pageName} Page Snapshot</title>
${html.external.map((h) => `<link rel="stylesheet" href="${h}">`).join("\n")}
<style>
/* Frozen from ${PATH} at ${WIDTH}px on ${new Date().toISOString().slice(0, 16).replace("T", " ")}.
   A PHOTOGRAPH of the running product, not the product: no React, no database,
   every control inert. scripts/snapshot-page.mjs. */
html { ${html.rootStyle} }
${html.inline}
</style>
<div id="snapshot-root" class="${html.bodyClass}">
${body}
</div>`;

const name = `${cleaned.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "home"}-${WIDTH}.html`;
writeFileSync(`${OUT}/${name}`, out, "utf8");
console.log(`${OUT}/${name}  (${(out.length / 1024).toFixed(0)} KB, ${WIDTH}px)`);
if (problems.length) console.log(`page errors: ${problems.join(" | ")}`);
