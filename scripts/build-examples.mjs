// ROADMAP 9.5 — THE EXAMPLE SITES, SERVED AT /ex1 … /ex5.
//
// **The ten numbered /example pages were deleted 2026-09-10 — see the block
// where `PAGES` used to be for why, and for the mistake worth not repeating.**
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

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
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
   "Three pages, led by one big photograph · a menu that follows you down · for a detailer with work worth showing",
   { "v-goldenhour-work.html": "work.html", "v-goldenhour-prices.html": "prices.html" }],
  // SITE 2 IS ONE PAGE, AND THE PAGE COUNT IS PART OF THE VARIETY — his own
  // instruction (TASTE-NOTES batch 3, item 7). It sits in MULTI rather than
  // in PAGES because these are the sites built from an APPROVED SCHEME and
  // they get a named slug he can send to somebody; PAGES is the numbered set
  // of ten from 2026-09-07. `extras` is empty, which the rewrite handles.
  ["ex2", "w-delgado.html", "Delgado Mobile Detailing",
   "One page, dark · walks a customer through what happens, step by step · for work that needs explaining before it sells", {}],
  // SITE 3 CARRIES THREE COLOURWAYS ON ONE SKELETON — his ask, 2026-09-09:
  // *"they all look good so lets do all 3 cuz its easy to just switch
  // colors."* `?c=a` petrol night, `?c=b` painted teal (the default), `?c=c`
  // cool daylight, and the page hands the choice on to its own links so it
  // survives a click through to the prices page.
  ["ex3", "x-ballantyne.html", "Ballantyne Mobile Detailing",
   "Two pages, in three colors you can switch between · every price on the page · for a detailer who would rather quote up front than be asked",
   { "x-ballantyne-prices.html": "prices.html" }],
  // SITE 4 SHIPS ITS OWN PAINT SWITCHER, so it does NOT get the injected one
  // ex3 has. His pick from the design sheet was *"B and C are the best do
  // both"*, and the control was designed into the page rather than floated
  // over it — the scheme's shape rule says the only pill on that page is the
  // availability chip, so a rounded pill dropped on top would be the one
  // thing on the page that breaks its own corner language.
  ["ex4", "y-kinzie.html", "Kinzie Mobile Detailing",
   "One page, light or dark · a before-and-after slider a customer can drag · for paint correction and detailing where the result is the argument", {}],
  // SITE 5. HIS INSTRUCTION, 2026-09-09: *"not do any more artifacts and just
  // publish to /ex5… make sure future sessions don't make any more artifacts
  // unless I specifically request it."* So this row IS the delivery mechanism
  // for a tenant site now — `npm run dev` serves it at /ex5 and a build puts
  // it on the domain. Nothing about a tenant page goes out as an artifact.
  ["ex5", "z-tampabay.html", "Sunglade Auto Detail",
   "One page, loud · pick your vehicle and the prices change · for a busy shop that wants a customer booked in under a minute", {}],
];

// ───────────────────────────────────────────────────────────────────────────
// THE TEN NUMBERED PAGES ARE DELETED — his instruction, 2026-09-10, and it is
// the SECOND time he has asked.
//
//   *"All of the ones that are /example, I told you to delete them, but you
//    said oh no, we could just keep them here, they do no harm. Well, this is
//    the harm they're doing. They're influencing and taking up space inside of
//    our form when I deliberately didn't want any of these examples because
//    they were all horrible."*
//
// **THE ARGUMENT FOR KEEPING THEM WAS "THEY COST NOTHING", AND THAT WAS WRONG
// IN A WAY WORTH WRITING DOWN.** An unwanted thing that is merely SERVED costs
// nothing. An unwanted thing that is served at a NAMED, GUESSABLE URL becomes
// a list, and a list gets used — the website intake picked all ten up as
// examples for a detailer to choose from, because they were the only twelve
// URLs available. **A rejected artefact left reachable will be reached by the
// next feature that needs a list of that shape.**
//
// `docs/tenant-sites/` still holds every source file: nothing is destroyed,
// and the record of what was tried is intact. They are simply not served, not
// addressable and not enumerable. The sites he is building one at a time are
// `MULTI` above, at /ex1 … /ex5, and those are the only ones.
// ───────────────────────────────────────────────────────────────────────────

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

  // ---------------------------------------------------------------------------
  // THE INDEX — rebuilt 2026-09-20, ROADMAP 7.1.
  // ---------------------------------------------------------------------------
  // **BOTH AUDITS SCORED THIS THE WORST PAGE IN THE PRODUCT — A1 GIVES IT
  // 3/10 — and both note the sites behind it are among the best-looking parts
  // of it.** It was a text list of five slugs: no pictures, on the one page
  // whose entire job is showing somebody what their site would look like; no
  // way back, so it was a dead end reached from a marketing page; and no ask
  // at the end, at the moment somebody is most persuaded.
  //
  // **THE PICTURES ARE REAL SCREENSHOTS OF THE REAL SITES**, captured by
  // `scripts/capture-examples.mjs` at 1440 and 392 and committed to
  // `docs/example-shots/`. They are copied in here — a file copy, not a
  // browser — because THIS SCRIPT RUNS ON EVERY PRODUCTION DEPLOY and a deploy
  // costs Andrew 15 Netlify credits. `scripts/example-shots-check.mjs` fails
  // BY NAME when a site changes after its picture was taken, so a committed
  // capture cannot go stale silently.
  //
  // **AND PHOTOGRAPHING THEM FOUND TWO REAL DEFECTS NOBODY HAD FIXED** — a
  // "next opening" date nine days in the past on ex2, and ex5's review score
  // clipped behind the ceramic card. Both were in ROADMAP 7.10 and both had
  // been read past for days; at thumbnail size they are the first thing the
  // eye lands on. Fixed, then re-photographed. **The examples page was not
  // merely plain — some of what it was showing was broken.**
  //
  // THE TYPE AND THE GROUND ARE THE PLATFORM'S, NOT A TENANT'S. Archivo and
  // JetBrains Mono on `--ink-0`, the same pair `/` and `/pricing` use, because
  // this page is us talking about the work rather than one of the sites. The
  // ground switches to paper for the closing band — `docs/TASTE-NOTES.md` § 3,
  // rule 4, the device all five of the sites he likes use and none of the
  // pages he rejected did.
  //
  // THE ASK IS AT THE BOTTOM. A "build mine like this" above the evidence is a
  // request made before anybody has been persuaded of anything.
  try {
    const shotDir = path.join(ROOT, "docs", "example-shots");
    await mkdir(path.join(OUT, "examples", "shots"), { recursive: true });
    let shots = {};
    try {
      shots = JSON.parse(await readFile(path.join(shotDir, "manifest.json"), "utf8")).sites ?? {};
      for (const site of Object.values(shots)) {
        for (const file of Object.values(site.shots ?? {})) {
          await copyFile(path.join(shotDir, file), path.join(OUT, "examples", "shots", file));
        }
      }
    } catch {
      // **A MISSING CAPTURE IS SAID OUT LOUD, NEVER DRAWN AS A GREY BOX.**
      // Andrew's rule, and the right one: a placeholder on a portfolio is a
      // worse lie than an empty space, because it looks like a decision.
      console.log("  the index: NO SCREENSHOTS — docs/example-shots/manifest.json is missing.");
      console.log("             The page will name the sites and link them, with no pictures.");
      shots = {};
    }

    const card = ([slug, title, note], i) => {
      const s = shots[slug]?.shots ?? {};
      const pics = s.desktop
        ? `<div class="shot">
             <img src="/examples/shots/${s.desktop}" alt="The ${title} site on a desktop screen"
                  width="1440" height="900" loading="${i < 2 ? "eager" : "lazy"}">
             ${s.phone ? `<img class="ph" src="/examples/shots/${s.phone}"
                  alt="The same site on a phone" width="392" height="844" loading="lazy">` : ""}
           </div>`
        : "";
      return `
      <article class="ex" data-i="${i}">
        ${pics}
        <div class="meta">
          <span class="slug">${slug}</span>
          <h2>${title}</h2>
          <p>${note}</p>
          <a class="go" href="/${slug}">Open the live site <span aria-hidden="true">&rarr;</span></a>
        </div>
      </article>`;
    };

    await writeFile(path.join(OUT, "examples", "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Five example sites &mdash; Detailing Platform</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  :root{color-scheme:dark;--ink-0:#0B0D0E;--ink-1:#111417;--ink-2:#171B1E;
    --line:#272D31;--fog:#8B9499;--bone:#F2F1EC;--acc:#38E08B;
    --paper:#EFEEE7;--paper-ink:#12161A;--paper-line:#D2D1C9}
  *{box-sizing:border-box}
  body{margin:0;background:var(--ink-0);color:var(--bone);
    font:400 16px/1.6 "Archivo",sans-serif;-webkit-font-smoothing:antialiased}
  .w{max-width:1080px;margin:0 auto;padding:0 20px}
  a{color:inherit}
  .mono{font-family:"JetBrains Mono",ui-monospace,monospace;font-weight:500;
    font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--fog)}

  /* ── the way back. 7.1: this page was a dead end from a marketing page ── */
  .top{border-bottom:1px solid var(--line);background:var(--ink-0);
    position:sticky;top:0;z-index:5}
  .top .w{display:flex;align-items:center;gap:18px;height:58px}
  .back{display:inline-flex;align-items:center;gap:9px;text-decoration:none;
    color:var(--fog);font-size:14px;min-height:44px;padding-right:6px}
  .back:hover{color:var(--bone)}
  .top .brand{margin-left:auto;font-weight:800;letter-spacing:-.01em;font-size:14px}

  header.hero{padding:74px 0 10px}
  h1{font-size:clamp(38px,6.4vw,74px);line-height:1.02;letter-spacing:-.03em;
    font-weight:800;margin:14px 0 18px;max-width:15ch}
  h1 em{font-style:normal;color:var(--acc)}
  .lede{color:#CFD2CE;font-size:clamp(17px,2vw,20px);max-width:56ch;margin:0}

  /* NUMBERS AS DECORATION — TASTE-NOTES §3 rule 5, and every one is true. */
  .stats{display:flex;flex-wrap:wrap;gap:34px;margin:40px 0 0;padding:26px 0 0;
    border-top:1px solid var(--line)}
  .stats div{min-width:88px}
  .stats b{display:block;font-size:30px;font-weight:800;letter-spacing:-.02em}
  .stats span{font-size:12px}

  /* ── the five. NOT three evenly spaced cards: full-width rows that
        alternate side, so the eye travels and no two read as a set. ── */
  .list{padding:60px 0 20px;display:flex;flex-direction:column;gap:78px}
  .ex{display:grid;grid-template-columns:1.35fr .65fr;gap:38px;align-items:center}
  .ex[data-i="1"],.ex[data-i="3"]{grid-template-columns:.65fr 1.35fr}
  .ex[data-i="1"] .shot,.ex[data-i="3"] .shot{order:2}
  .shot{position:relative;border-radius:14px;overflow:visible}
  .shot>img:first-child{width:100%;height:auto;display:block;border-radius:14px;
    border:1px solid var(--line);box-shadow:0 24px 60px rgba(0,0,0,.55)}
  /* the phone sits ON the desktop shot, which is how anybody actually shows a
     responsive site. 24% is wide enough to read the headline in it. */
  .shot .ph{position:absolute;right:-14px;bottom:-26px;width:24%;height:auto;
    border-radius:9px;border:1px solid var(--line);
    box-shadow:0 18px 40px rgba(0,0,0,.6)}
  .meta h2{font-size:clamp(21px,2.4vw,27px);line-height:1.15;letter-spacing:-.02em;
    font-weight:800;margin:10px 0 10px}
  .meta p{color:var(--fog);margin:0 0 18px;font-size:15px}
  .go{display:inline-flex;align-items:center;gap:8px;min-height:44px;
    text-decoration:none;color:var(--acc);font-weight:600;font-size:15px}
  .go:hover{text-decoration:underline}

  /* ── the ground switches, and the ask comes last ── */
  .end{background:var(--paper);color:var(--paper-ink);margin-top:80px;
    padding:74px 0 80px}
  .end .mono{color:#5B6469}
  .end h2{font-size:clamp(27px,4vw,42px);line-height:1.08;letter-spacing:-.025em;
    font-weight:800;margin:12px 0 14px;max-width:18ch}
  .end p{color:#4A5358;max-width:52ch;margin:0 0 26px}
  .cta{display:inline-flex;align-items:center;justify-content:center;gap:10px;
    min-height:50px;padding:0 26px;border-radius:999px;background:var(--paper-ink);
    color:var(--paper);text-decoration:none;font-weight:600}
  .cta:hover{background:#000}
  /* 44px OF REAL HIT AREA — docs/design-system.md. This was a 15px-tall link
     inside a sentence, which is a target a thumb misses. It is its own row
     now, with the height on the anchor rather than on the text around it. */
  .end .also{display:block;margin-top:10px;color:#5B6469;font-size:14px}
  .end .also a{display:inline-flex;align-items:center;gap:8px;min-height:44px;
    color:var(--paper-ink);font-weight:600;text-decoration:none}
  .end .also a:hover{text-decoration:underline}

  .note{border-top:1px solid var(--paper-line);margin-top:44px;padding-top:20px;
    color:#5B6469;font-size:13.5px;max-width:64ch}

  @media (max-width:820px){
    .ex,.ex[data-i="1"],.ex[data-i="3"]{grid-template-columns:1fr;gap:22px}
    .ex[data-i="1"] .shot,.ex[data-i="3"] .shot{order:0}
    .list{gap:58px;padding-top:44px}
    /* 2x2 rather than a flex wrap: at 392 the four stats broke 3-then-1 and
       left "0 templates" orphaned on its own line. */
    .stats{display:grid;grid-template-columns:1fr 1fr;gap:26px 20px}
    /* INSIDE the shot, not hanging off it. At one column the shot reaches the
       container edge, so a negative offset put the phone 8px past the viewport
       and the whole page scrolled sideways at 768 — measured, 776 > 768. */
    .shot .ph{width:22%;right:10px;bottom:-16px}
    header.hero{padding:44px 0 4px}
  }
  @media (max-width:400px){
    .w{padding:0 16px}
    .stats{gap:22px}
    .shot .ph{display:none}   /* below this it is a smudge, not information */
    /* the sticky bar must stay one line at the narrowest supported width */
    .back .long{display:none}
  }
</style></head><body>

<nav class="top"><div class="w">
  <a class="back" href="/"><span aria-hidden="true">&larr;</span>
    Back<span class="long"> to Detailing Platform</span></a>
  <span class="brand">Detailing&nbsp;Platform</span>
</div></nav>

<header class="hero"><div class="w">
  <span class="mono">Example sites</span>
  <h1>Five real sites, <em>built the same way yours would be.</em></h1>
  <p class="lede">Deliberately unalike. Nobody is meant to choose between them &mdash;
  they are the range. Every one is a working page you can open, not a picture of one.</p>
  <div class="stats">
    <div><b>5</b><span class="mono">sites</span></div>
    <div><b>8</b><span class="mono">pages</span></div>
    <div><b>1</b><span class="mono">booking engine</span></div>
    <div><b>0</b><span class="mono">templates</span></div>
  </div>
</div></header>

<main class="w list">
${multi.map(card).join("")}
</main>

<section class="end"><div class="w">
  <span class="mono">Now that you have seen them</span>
  <h2>Yours is built for you, not chosen from a list.</h2>
  <p>You do not pick one of these. We build a site around your work, your prices
  and your name &mdash; with the booking page inside it, and every price coming
  live from your own dashboard.</p>
  <a class="cta" href="/pricing">See what it costs <span aria-hidden="true">&rarr;</span></a>
  <span class="also"><a href="/book/demo-detail">Or try the booking page, the way a customer would
  <span aria-hidden="true">&rarr;</span></a></span>
  <p class="note">Every price and time on these five is a placeholder. On a real
  detailer's site each one comes live from their own dashboard, so changing a
  price on a phone changes the website. The screenshots above are real captures
  of these real sites, and a check fails by name if one of them changes after
  its picture was taken.</p>
</div></section>

</body></html>`, "utf8");
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
      console.log(`  ${multi.length + 1} slashless rewrites prepended to _redirects`);
    }
  } catch (e) {
    console.log(`  the rewrites: SKIPPED — ${String(e.message).slice(0, 80)}`);
  }

  const where = DEV ? "app/public" : "app/dist";
  console.log(`${multi.length} example sites → ${where}/ (+ /examples)`);
  if (DEV) console.log("  dev copy is gitignored; `npm run dev --prefix app` then /ex1");
}

main().catch((e) => {
  // See the header: this never fails the build.
  console.log(`examples skipped — ${String(e.message).slice(0, 100)}`);
});
