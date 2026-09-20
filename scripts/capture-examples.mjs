// THE EXAMPLE THUMBNAILS — captured here, ON PURPOSE, and never in the build.
//
//   npm run dev --prefix app          # the sites must be served first
//   node scripts/build-examples.mjs --dev
//   node scripts/capture-examples.mjs
//
// ---------------------------------------------------------------------------
// WHY THIS IS A SEPARATE SCRIPT AND NOT PART OF `build-examples.mjs`
// ---------------------------------------------------------------------------
// **`build-examples.mjs` RUNS ON EVERY PRODUCTION DEPLOY.** Measured rather
// than assumed: `app/netlify.toml` runs `npm run build`, and `app/package.json`
// defines that as `vite build && node ../scripts/build-examples.mjs`.
//
// **A production deploy costs Andrew 15 Netlify credits and he ran out last
// month.** Generating these at build time would put a browser download and ten
// page loads into a build he pays for, every single time, forever — to produce
// pictures that change only when somebody edits one of five files. That is
// spending his money on a thumbnail.
//
// So the captures are committed, and the thing that keeps a committed artefact
// honest lives in `scripts/example-shots-check.mjs`: a fingerprint gate that
// FAILS BY NAME when a site changes underneath its picture. The objection to
// committing an artefact — that it can quietly stop being true — is answered by
// making it impossible for it to go stale *silently*, which is the same move
// as the receipt grader separating stale from failed.
//
// ---------------------------------------------------------------------------
// WHAT IS CAPTURED, AND WHAT IS NOT
// ---------------------------------------------------------------------------
// **Real screenshots of the real example sites**, at the two widths a person
// actually judges a website on: a desktop viewport and a phone. No
// placeholders, no stand-ins, no mock browser chrome with somebody else's page
// in it.
//
// **`ex3` IS CAPTURED IN ITS DEFAULT COLOUR AND THE CAPTION SAYS SO.** That
// site ships three colorways a visitor can switch between. A thumbnail that
// shows a different color depending on which one somebody felt like
// photographing is not showing them the site — it is showing them one roll of
// a dice, on the one page where misrepresenting what a detailer gets matters
// most. Default, captioned, and the truth does the selling.

import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const require_ = createRequire(import.meta.url);
const { chromium } = require_("./../app/node_modules/playwright/index.js");

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SHOTS = path.join(ROOT, "docs", "example-shots");
const BASE = process.env.EXAMPLES_BASE || "http://localhost:5173";

// The five, and the SOURCE FILE each one is built from — which is what the
// fingerprint is taken of. `build-examples.mjs` owns this mapping; it is
// repeated here rather than imported because that file runs in the deploy and
// this one must never be reachable from it.
export const SITES = [
  ["ex1", "v-goldenhour.html", "Prime Mobile Detailing"],
  ["ex2", "w-delgado.html", "Delgado Mobile Detailing"],
  // DEFAULT COLORWAY ONLY — see the header. `?c=b` is the default the page
  // serves when nobody has chosen, so the capture is what a visitor lands on.
  ["ex3", "x-ballantyne.html", "Ballantyne Mobile Detailing"],
  ["ex4", "y-kinzie.html", "Kinzie Mobile Detailing"],
  ["ex5", "z-tampabay.html", "Sunglade Auto Detail"],
];

/** The fingerprint of what a capture shows: the source file's bytes, with
 *  carriage returns stripped so a line-ending flip cannot report a false
 *  difference. That trap cost twenty minutes during the docs prune, where a
 *  checksum against a git blob said five of nine files differed and none did. */
export const fingerprint = (text) =>
  createHash("sha256").update(String(text).replace(/\r/g, "")).digest("hex").slice(0, 16);

const RX_SLUG = /^ex\d$/;

const VIEWS = [
  // Wide enough to be judged as a website, short enough that the card shows
  // the part that sells: the headline and the first photograph.
  { key: "desktop", width: 1440, height: 900 },
  { key: "phone", width: 392, height: 844 },
];

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, "/")
  || process.argv[1]?.endsWith("capture-examples.mjs")) {
  await mkdir(SHOTS, { recursive: true });
  // ONE SITE AT A TIME: `node scripts/capture-examples.mjs ex1`.
  // Fixing five sites and photographing them all at the end leaves every
  // picture showing a state that was already corrected, for as long as the
  // batch takes. Naming a slug re-shoots that one and MERGES into the
  // manifest, so the other four keep the fingerprints they were actually
  // captured at - rewriting them would re-bless four pictures nobody re-took.
  //
  // AND THE PAGE IS SERVED FROM `app/public`, NOT FROM `docs/tenant-sites`.
  // Editing a site and capturing without `build-examples.mjs --dev` in
  // between photographs the OLD page and records the NEW fingerprint, which
  // is exactly the silent staleness this gate exists to prevent. It happened
  // twice on 2026-09-20, both times from an argument this script did not
  // understand and silently ignored - hence the refusal below.
  const only = process.argv.slice(2).filter((a) => RX_SLUG.test(a));
  const unknown = process.argv.slice(2).filter((a) => !RX_SLUG.test(a));
  if (unknown.length) {
    console.log(`  ${JSON.stringify(unknown)} is not a site slug, and an argument this script`);
    console.log(`  does not understand must NOT quietly mean "capture everything".`);
    console.log(`  Known slugs: ${SITES.map((x) => x[0]).join(", ")}`);
    process.exit(1);
  }
  const todo = only.length ? SITES.filter(([slug]) => only.includes(slug)) : SITES;
  if (only.length !== todo.length) {
    // `ex9` LOOKS like a slug and matches nothing. Without this it captured
    // zero sites, rewrote the manifest's timestamp and exited 0 - a run that
    // did nothing and reported success, which is this repo's oldest failure.
    console.log(`  no such site: ${only.filter((k) => !SITES.some(([x]) => x === k)).join(", ")}`);
    console.log(`  Known slugs: ${SITES.map((x) => x[0]).join(", ")}`);
    process.exit(1);
  }

  let manifest = { captured_at: new Date().toISOString(), sites: {} };
  if (only.length) {
    try {
      const prev = JSON.parse(await readFile(path.join(SHOTS, "manifest.json"), "utf8"));
      manifest.sites = prev.sites ?? {};
      console.log(`  merging into the existing manifest; re-shooting ${only.join(", ")} only`);
    } catch {
      console.log(`  no manifest to merge into - writing a fresh one holding ${only.join(", ")} only.`);
      console.log(`  THE OTHER SITES WILL HAVE NO RECORD and example-shots-check.mjs will say so.`);
    }
  }

  const browser = await chromium.launch();
  let failed = 0;

  for (const [slug, src, title] of todo) {
    const source = await readFile(path.join(ROOT, "docs", "tenant-sites", src), "utf8");
    const fp = fingerprint(source);
    const shots = {};

    for (const v of VIEWS) {
      const page = await browser.newPage({
        viewport: { width: v.width, height: v.height },
        deviceScaleFactor: 1,
      });
      let ok = true;
      try {
        await page.goto(`${BASE}/${slug}/`, { waitUntil: "networkidle", timeout: 20000 });
        // THE REVEAL ANIMATIONS SETTLE OR THE CAPTURE IS OF A HALF-FADED PAGE.
        // `docs/gotchas.md` has both halves of this: a screenshot taken too
        // soon is the previous frame, and a page read before its data resolves
        // hands you a confident wrong answer.
        await page.waitForTimeout(1800);
        const file = `${slug}-${v.key}.jpg`;
        await page.screenshot({
          path: path.join(SHOTS, file),
          type: "jpeg",
          quality: 76,
        });
        shots[v.key] = file;
      } catch (e) {
        ok = false;
        failed++;
        console.log(`  ${slug} ${v.key}: FAILED — ${String(e.message).slice(0, 90)}`);
      }
      await page.close();
      if (ok) console.log(`  ${slug} ${v.key.padEnd(7)} ${v.width}x${v.height} captured`);
    }

    manifest.sites[slug] = { source: src, title, fingerprint: fp, shots };
  }

  await browser.close();
  await writeFile(path.join(SHOTS, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`
${todo.length} site(s) shot, ${Object.keys(manifest.sites).length} in the manifest, ${failed} capture(s) failed.`);
  console.log(`Fingerprints written to docs/example-shots/manifest.json —`);
  console.log(`\`node scripts/example-shots-check.mjs\` fails by name when a site moves.`);
  process.exit(failed ? 1 : 0);
}
