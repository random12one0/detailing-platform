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
// TWO TARGETS, AND THE REASON IS THE DEV SERVER.
//   `app/dist` is what a BUILD produces and what Netlify uploads.
//   `app/public` is what `npm run dev` serves, and it is the only way
//   `localhost:5173/ex1` can exist without running a build first — his ask,
//   2026-09-08: *"so that way when you go to the localhost and you go /ex1, it
//   goes to the link, instead of it just being hosted after opening it on my
//   files."*
// The dev copy is GITIGNORED (`app/public/ex*`, `app/public/example*`), so the
// header's rule holds: `docs/tenant-sites/` stays the only copy in git and
// there is nothing that can drift.
const DEV = process.argv.includes("--dev");
const OUT = path.join(ROOT, "app", DEV ? "public" : "dist");

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
// A SITE CAN BE MORE THAN ONE PAGE. `ex1` has Work and Prices as real tabs,
// and a nav that names a tab owes a page behind it. The extra files are copied
// alongside `index.html` and their cross-links are rewritten, so `/ex1/work`
// works the same way `/ex1` does.
const MULTI = [
  ["ex1", "v-goldenhour.html", "Prime Mobile Detailing",
   "photograph as the ground · sticky header + dock · three pages",
   { "v-goldenhour-work.html": "work.html", "v-goldenhour-prices.html": "prices.html" }],
  // SITE 2 IS ONE PAGE, AND THE PAGE COUNT IS PART OF THE VARIETY — his own
  // instruction (TASTE-NOTES batch 3, item 7). It sits in MULTI rather than
  // in PAGES because these are the sites built from an APPROVED SCHEME and
  // they get a named slug he can send to somebody; PAGES is the numbered set
  // of ten from 2026-09-07. `extras` is empty, which the rewrite handles.
  ["ex2", "w-delgado.html", "Delgado Mobile Detailing",
   "dark made of light · the process drawn as wiring · one page", {}],
];

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

  // THE MULTI-PAGE SITES. Same banner, same placeholder warning; the only
  // difference is that the cross-links are rewritten from the source
  // filenames to the served ones.
  const multi = [];
  for (const [slug, entry, title, note, extras] of MULTI) {
    try {
      const dir = path.join(OUT, slug);
      await mkdir(dir, { recursive: true });
      // ROOT-ABSOLUTE, NOT RELATIVE, AND IT IS THE WHOLE REASON THE TABS
      // BROKE. He asked for `/ex1` without a trailing slash, so the browser
      // resolves a relative `work.html` against `/` and asks for
      // `/work.html` — which matches no file, hits the SPA fallback and draws
      // the app shell. Measured: clicking Work from `/ex1` landed on
      // "Detailing Platform" with two console errors.
      // `/ex1/work.html` cannot be resolved wrongly from any path.
      const rewrite = (html) => {
        let out = html;
        for (const [from, to] of Object.entries(extras)) {
          out = out.split(from).join(`/${slug}/${to}`);
        }
        out = out.split(entry).join(`/${slug}/`);
        return out;
      };
      for (const [src, dest] of [[entry, "index.html"], ...Object.entries(extras)]) {
        const html = rewrite(await readFile(path.join(SRC, src), "utf8"));
        const withBanner = html.includes("</body>")
          ? html.replace("</body>", `${banner(title, note, slug.toUpperCase())}\n</body>`)
          : html + banner(title, note, slug.toUpperCase());
        await writeFile(path.join(dir, dest), withBanner, "utf8");
      }
      multi.push([slug, title, note]);
      console.log(`  ${slug}: ${1 + Object.keys(extras).length} pages`);
    } catch (e) {
      console.log(`  ${slug}: SKIPPED — ${String(e.message).slice(0, 90)}`);
    }
  }

  // AND AN INDEX, because ten URLs he has to remember is nine too many.
  try {
    const list = [
      ...multi.map(([slug, title, note]) => `
      <a href="/${slug}">
        <b>${slug}</b>
        <span><em>${title}</em>${note}</span>
      </a>`),
      ...rows.map(([n, title, note]) => `
      <a href="/example${n}">
        <b>${n}</b>
        <span><em>${title}</em>${note}</span>
      </a>`),
    ].join("");
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

  // -------------------------------------------------------------------------
  // THE SLASH, AND IT IS THE WHOLE REASON THESE URLS DID NOT WORK — 2026-09-08
  // -------------------------------------------------------------------------
  // Every page above is written as `example1/index.html`, a DIRECTORY. So
  // `/example1/` resolves and **`/example1` does not** — it matches no file,
  // falls through to `_redirects`' `/* /index.html 200`, and serves the app
  // shell. Which, because the router has no 404 (roadmap item P), draws a
  // SIGN-IN FORM.
  //
  // **AND `/example1` WITHOUT THE SLASH IS THE URL HE ASKED FOR**, in this
  // file's own header: *"detailingplatform.com/example1, example2, example3
  // and so on."* So the one address anybody would ever type is the one that
  // was broken. Measured, not reasoned about: `vite preview` serves the
  // tenant page at `/example1/` and the app shell at `/example1`.
  //
  // **NETLIFY WOULD PROBABLY HAVE PAPERED OVER IT, AND THAT IS THE ARGUMENT
  // FOR FIXING IT HERE RATHER THAN RELYING ON THAT.** Its "Pretty URLs"
  // post-processing redirects `/example1` to `/example1/` — but it is a
  // SETTING, in an admin panel nothing in this repo can read, defaulting on.
  // **This project has now been bitten three times by exactly that shape**:
  // Netlify's build credits, Google's two empty branding fields, and Stripe's
  // create-only "Events from". A rule written into the deploy is a rule that
  // cannot be switched off by somebody clicking something.
  //
  // Rules are PREPENDED because `_redirects` is first-match-wins and the
  // catch-all at the bottom would otherwise take every one of them.
  // NOT IN DEV. `OUT` is `app/public` there, and `app/public/_redirects` is a
  // COMMITTED file — the first dev run prepended eleven rules to it. Vite's dev
  // server ignores `_redirects` entirely (it serves `public/` directly), so the
  // rules would have been noise in git and nothing else.
  if (!DEV) try {
    const rp = path.join(OUT, "_redirects");
    const existing = await readFile(rp, "utf8").catch(() => "");
    if (!existing.includes("# examples (generated)")) {
      const rules = [
        "# examples (generated by scripts/build-examples.mjs — do not hand-edit)",
        "# A directory index needs its slash; these serve it without one.",
        ...Array.from({ length: made }, (_, i) =>
          `/example${i + 1}    /example${i + 1}/index.html    200`),
        ...multi.flatMap(([slug, , , ]) => [
          `/${slug}    /${slug}/index.html    200`,
          `/${slug}/work    /${slug}/work.html    200`,
          `/${slug}/prices    /${slug}/prices.html    200`,
        ]),
        "/examples    /examples/index.html    200",
        "",
      ].join("\n");
      await writeFile(rp, rules + existing, "utf8");
      console.log(`  ${made + 1} slashless rewrites prepended to _redirects`);
    }
  } catch (e) {
    console.log(`  the rewrites: SKIPPED — ${String(e.message).slice(0, 80)}`);
  }

  const where = DEV ? "app/public" : "app/dist";
  console.log(`${made} example sites + ${multi.length} multi-page → ${where}/ (+ /examples)`);
  if (DEV) console.log("  dev copy is gitignored; `npm run dev --prefix app` then /ex1");
}

main().catch((e) => {
  // See the header: this never fails the build.
  console.log(`examples skipped — ${String(e.message).slice(0, 100)}`);
});
