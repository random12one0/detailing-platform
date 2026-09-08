// ROADMAP 9.5 — THE TEN EXAMPLE SITES, ON THE LIVE DOMAIN.
//
// His ask, 2026-09-07:
//
//   "I wanna have maybe ten example websites. Obviously they're not gonna be
//    choosing from — I just wanna have ten of different styles and kinda
//    different things just for myself, all on the website,
//    detailingplatform.com/example1, example2, example3 and so on."
//
// ---------------------------------------------------------------------------
// IT COPIES RATHER THAN DUPLICATES, AND THAT IS THE WHOLE DESIGN
// ---------------------------------------------------------------------------
// The eleven pages already exist in `docs/tenant-sites/`. Committing a second
// copy under `app/public/` would be two versions of eleven files that have to
// agree for ever, and the one nobody edits is the one that gets served.
//
// So this runs at BUILD time and writes into `dist/`, which is not in git.
// `docs/tenant-sites/` stays the only copy, editing a page is enough, and there
// is nothing to remember.
//
// **IT NEVER FAILS THE BUILD.** A missing page or an unwritable directory logs
// and carries on: these are example pages for the owner to look at, and taking
// the whole dashboard offline over one of them would be an absurd trade. The
// build's own exit code stays vite's.
//
// ---------------------------------------------------------------------------
// THE NUMBERS ON THESE PAGES ARE PLACEHOLDERS AND THE MARKUP SAYS SO
// ---------------------------------------------------------------------------
// His instruction in the same breath: *"obviously we can't show that in an
// example website, so those should be placeholder text — but just make sure it
// knows that those numbers are gonna be numbers actually linked to the booking
// website."*
//
// Every price in every one of these files already carries a `data-from`
// attribute naming the endpoint that owns it on a real site, and each file's
// header says why: a rate typed into a tenant's HTML is *a number PRINTED is
// not a number CHARGED* with the two numbers in two codebases. The banner this
// script injects says the same thing to somebody who is only looking.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// `new URL("../")` from `scripts/` IS the repo root — taking `dirname` of it
// again climbs one level too far and every copy then misses by a directory,
// which the skip lines report as eleven missing files rather than one wrong
// path. Measured, not reasoned about.
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SRC = path.join(ROOT, "docs", "tenant-sites");
const OUT = path.join(ROOT, "app", "dist");

// **THE ORDER IS FIXED AND WRITTEN DOWN**, because `/example3` is a URL he will
// send to somebody, and a list that re-sorts itself when a file is renamed
// makes that link point at a different page. Ten, because ten is what he asked
// for; `a-shop` is the oldest and the least like the references he sent, so it
// is the one left out.
// **REPLACED WHOLESALE 2026-09-08 — these are the ten he asked for**, built on
// docs/TASTE-NOTES.md batch 2 (his own 21 links, measured and looked at) and on
// real detailer data in docs/tenant-site-source-data-2026-09-08.md. His brief:
// *"a lot of variation ... you don't wanna show people two websites that look
// with small detailed change because they won't see the differences, but with
// big differences."*
//
// SO THE ORDER IS AN ALTERNATION, not a ranking. Dark, light, dark, light — and
// the four with NO ANIMATION are spread through rather than grouped, because he
// will click through these in order and two still pages in a row would read as
// a broken batch rather than as a choice.
//
// The eleven older pages stay in docs/tenant-sites/ and are no longer served:
// a-shop, b-van and c-volume he called "very ai", and d–k were built before any
// of his taste evidence existed. Nothing is deleted — they are the structural
// range and the record of what was tried.
const PAGES = [
  ["p-northlight.html", "Northlight Detail", "a photograph as the ground · mobile dock · moderate motion"],
  ["m-holloway.html", "Holloway & Daughters", "newsprint · dense rate card · NO animation"],
  ["n-halo.html", "Halo", "dark ground made of light · a routed diagram · heavy motion"],
  ["o-rinsecity.html", "Rinse City", "painted ink · the price is the page · almost no motion"],
  ["q-meridian.html", "Meridian Auto Salon", "warm cream · page in a container · the quietest motion"],
  ["r-railyard.html", "Rail & Yard", "blueprint grid · set in mono · NO animation"],
  ["l-tidewater.html", "Tidewater", "dusk gradient sky · per-foot pricing · heavy motion"],
  ["t-blackline.html", "Blackline", "black and paper · the ground flips · NO animation"],
  ["s-vera.html", "Vera Interior Care", "clinical light · one column, no grid · moderate motion"],
  ["u-cedarchrome.html", "Cedar & Chrome", "woven earth · staggered masonry · moderate motion"],
];

/** The strip that says what somebody is looking at. Injected rather than
 *  written into the source files, so the pages themselves stay exactly what a
 *  client's site would be. */
const banner = (title, note, n) => `
<!-- THE STRIP IS FIXED, SO THE PAGE HAS TO GIVE IT ROOM. Seen at 392, where it
     wraps to two lines and covered the last paragraph of the page — a fixed bar
     is out of flow, so nothing under it moves unless something is told to. Two
     heights because the strip has two heights. -->
<style>
  body{padding-bottom:64px!important}
  @media (max-width:760px){ body{padding-bottom:118px!important} }
</style>
<div style="position:fixed;left:0;right:0;bottom:0;z-index:2147483647;
  font:600 12.5px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif;
  background:#0B0D0E;color:#F2F1EC;border-top:1px solid #333B40;
  padding:9px 14px;display:flex;gap:10px;flex-wrap:wrap;align-items:baseline;
  box-shadow:0 -8px 24px -12px rgba(0,0,0,.6);">
  <span style="color:#38E08B;letter-spacing:.1em;text-transform:uppercase;
    font-size:11px;">Example ${n}</span>
  <span>${title}</span>
  <span style="color:#8B9499;font-weight:400;">${note}</span>
  <span style="color:#8B9499;font-weight:400;margin-left:auto;">
    Prices and times are placeholders — on a real site every one of them comes
    live from that detailer's own dashboard.
  </span>
</div>`;

async function main() {
  let made = 0;
  const rows = [];
  for (const [i, [file, title, note]] of PAGES.entries()) {
    const n = i + 1;
    try {
      const html = await readFile(path.join(SRC, file), "utf8");
      const dir = path.join(OUT, `example${n}`);
      await mkdir(dir, { recursive: true });
      // Before `</body>` so it sits above everything and needs no stylesheet.
      const withBanner = html.includes("</body>")
        ? html.replace("</body>", `${banner(title, note, n)}\n</body>`)
        : html + banner(title, note, n);
      await writeFile(path.join(dir, "index.html"), withBanner, "utf8");
      rows.push([n, title, note]);
      made++;
    } catch (e) {
      console.log(`  example${n}: SKIPPED — ${String(e.message).slice(0, 80)}`);
    }
  }

  // AND AN INDEX, because ten URLs he has to remember is nine too many.
  try {
    const list = rows.map(([n, title, note]) => `
      <a href="/example${n}">
        <b>${n}</b>
        <span><em>${title}</em>${note}</span>
      </a>`).join("");
    await mkdir(path.join(OUT, "examples"), { recursive: true });
    await writeFile(path.join(OUT, "examples", "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Example sites</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#0B0D0E;color:#F2F1EC;
    font:16px/1.6 ui-sans-serif,system-ui,-apple-system,sans-serif}
  .w{max-width:640px;margin:0 auto;padding:56px 20px 80px}
  h1{font-size:32px;letter-spacing:-.02em;margin:0 0 10px}
  p.l{color:#CFD2CE;margin:0 0 34px}
  a{display:flex;gap:16px;align-items:baseline;text-decoration:none;color:inherit;
    padding:16px 0;border-top:1px solid #272D31}
  a:hover{background:#111517}
  a b{color:#38E08B;font-size:14px;min-width:22px;font-variant-numeric:tabular-nums}
  a span{display:flex;flex-direction:column;gap:3px}
  a em{font-style:normal;font-weight:600}
  a span span,a span{color:#8B9499;font-size:14px}
  a em{color:#F2F1EC;font-size:17px}
  .n{margin-top:34px;color:#8B9499;font-size:14px;border-top:1px solid #272D31;padding-top:18px}
</style></head><body><div class="w">
<h1>Example sites</h1>
<p class="l">Ten deliberately unalike detailing sites. Nobody is meant to choose
between them — they are the range.</p>
${list}
<p class="n">Every price and time on these is a placeholder. On a real
detailer's site each one comes live from their own dashboard, so changing a
price on a phone changes the website.</p>
</div></body></html>`, "utf8");
  } catch (e) {
    console.log(`  the index: SKIPPED — ${String(e.message).slice(0, 80)}`);
  }

  console.log(`${made} example sites → app/dist/example1…${made} (+ /examples)`);
}

main().catch((e) => {
  // See the header: this never fails the build.
  console.log(`examples skipped — ${String(e.message).slice(0, 100)}`);
});
