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
  // SITE 3 CARRIES THREE COLOURWAYS ON ONE SKELETON — his ask, 2026-09-09:
  // *"they all look good so lets do all 3 cuz its easy to just switch
  // colors."* `?c=a` petrol night, `?c=b` painted teal (the default), `?c=c`
  // cool daylight, and the page hands the choice on to its own links so it
  // survives a click through to the prices page.
  ["ex3", "x-ballantyne.html", "Ballantyne Mobile Detailing",
   "three colourways · fora's corner language · the whole price ladder · two pages",
   { "x-ballantyne-prices.html": "prices.html" }],
  // SITE 4 SHIPS ITS OWN PAINT SWITCHER, so it does NOT get the injected one
  // ex3 has. His pick from the design sheet was *"B and C are the best do
  // both"*, and the control was designed into the page rather than floated
  // over it — the scheme's shape rule says the only pill on that page is the
  // availability chip, so a rounded pill dropped on top would be the one
  // thing on the page that breaks its own corner language.
  ["ex4", "y-kinzie.html", "Kinzie Mobile Detailing",
   "bone paper or graphite · every seam a 4.2° diagonal · a real before/after wipe · one page", {}],
  // SITE 5. HIS INSTRUCTION, 2026-09-09: *"not do any more artifacts and just
  // publish to /ex5… make sure future sessions don't make any more artifacts
  // unless I specifically request it."* So this row IS the delivery mechanism
  // for a tenant site now — `npm run dev` serves it at /ex5 and a build puts
  // it on the domain. Nothing about a tenant page goes out as an artifact.
  ["ex5", "z-tampabay.html", "Tampa Bay Auto Detail",
   "a photograph at poster scale · one loud red · the vehicle switchboard · weighted scroll · one page", {}],
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

// ───────────────────────────────────────────────────────────────────────────
// THE EXAMPLE STRIP IS GONE — his instruction, 2026-09-09: *"for every single
// example that's hosted... there's this little thing on the bottom that says
// example three... just completely remove that because it's not needed, and it
// also hides some elements in some of the websites."*
//
// It was there to say the prices are placeholders. That warning still exists
// where it cannot cover anything: every price on every one of these pages
// carries a `data-from` attribute naming the endpoint that owns it, which is
// the durable form of the same statement and is in the file rather than
// painted over the page.
//
// WHAT REPLACES IT ON ex3 ONLY: a paint switcher, because that site ships in
// three colourways and he could not find a way to change them. It is one
// small control, out of the corner of the page, and it says what it is.
// ───────────────────────────────────────────────────────────────────────────
const PAINTS = `
<style>
  .paintpick{position:fixed;right:14px;bottom:14px;z-index:2147483646;
    display:flex;align-items:center;gap:8px;padding:7px 9px 7px 13px;border-radius:999px;
    font:600 12px/1 ui-sans-serif,system-ui,-apple-system,sans-serif;
    background:rgba(12,16,18,.72);color:#F2F1EC;backdrop-filter:blur(14px) saturate(1.3);
    box-shadow:0 10px 30px -12px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.16)}
  .paintpick b{font-weight:600;opacity:.8;letter-spacing:.04em}
  .paintpick button{width:20px;height:20px;padding:0;border-radius:50%;cursor:pointer;
    border:1px solid rgba(255,255,255,.34);transition:transform 180ms cubic-bezier(.16,1,.3,1)}
  .paintpick button:hover{transform:scale(1.16)}
  .paintpick button[aria-pressed="true"]{box-shadow:0 0 0 2px #F2F1EC;transform:scale(1.16)}
  .paintpick [data-paint="a"]{background:#0A1317}
  .paintpick [data-paint="b"]{background:#10635F}
  .paintpick [data-paint="c"]{background:#E9EDF1}
  /* it must not sit on top of the phone dock */
  @media (max-width:820px){ .paintpick{bottom:80px} }
</style>
<div class="paintpick" role="group" aria-label="Colourway">
  <b>Colour</b>
  <button data-paint="a" title="Night" aria-label="Night"></button>
  <button data-paint="b" title="Teal" aria-label="Teal"></button>
  <button data-paint="c" title="Daylight" aria-label="Daylight"></button>
</div>
<script>
(function () {
  var root = document.documentElement, saved = null;
  var btns = [].slice.call(document.querySelectorAll(".paintpick [data-paint]"));
  try { saved = localStorage.getItem("ex3-paint"); } catch (e) {}
  var q = new URLSearchParams(location.search).get("c");
  function set(p) {
    root.setAttribute("data-c", p);
    try { localStorage.setItem("ex3-paint", p); } catch (e) {}
    btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.paint === p)); });
  }
  set(q || (saved === "a" || saved === "b" || saved === "c" ? saved : "b"));
  btns.forEach(function (b) { b.addEventListener("click", function () { set(b.dataset.paint); }); });
})();
<\/script>`;

async function main() {
  let made = 0;
  const rows = [];
  for (const [i, [file, title, note]] of PAGES.entries()) {
    const n = i + 1;
    try {
      const html = await readFile(path.join(SRC, file), "utf8");
      const dir = path.join(OUT, `example${n}`);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "index.html"), html, "utf8");
      rows.push([n, title, note]);
      made++;
    } catch (e) {
      console.log(`  example${n}: SKIPPED — ${String(e.message).slice(0, 80)}`);
    }
  }

  // THE MULTI-PAGE SITES. The cross-links are rewritten from the source
  // filenames to the served ones, and ex3 gets the paint switcher.
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
        let html = rewrite(await readFile(path.join(SRC, src), "utf8"));
        // the paint switcher, on the one site that has paints to switch
        if (slug === "ex3") html = html.replace("</body>", PAINTS + "</body>");
        await writeFile(path.join(dir, dest), html, "utf8");
      }
      multi.push([slug, title, note, Object.values(extras)]);
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
<p class="l">Deliberately unalike detailing sites. Nobody is meant to choose
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
        // ONE RULE PER PAGE THAT EXISTS. This used to emit /work and
        // /prices for every multi site regardless: ex2 is one page and had
        // two rules pointing at files it does not contain, and ex4 would
        // have added two more. A rewrite to a missing file is dead config
        // that looks like a working route.
        ...multi.flatMap(([slug, , , pages]) => [
          `/${slug}    /${slug}/index.html    200`,
          ...pages.map((f) => `/${slug}/${f.replace(/\.html$/, "")}    /${slug}/${f}    200`),
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
