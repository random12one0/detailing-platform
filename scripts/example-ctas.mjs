// EVERY BOOKING BUTTON ON EVERY EXAMPLE SITE, CLICKED — ROADMAP 2.4's own
// "Done when": *"every booking button on every example opens a valid booking
// path. An automated check visits every public service CTA across all five
// examples."*
//
//   node scripts/build-examples.mjs --dev      # write /ex1 … /ex5 into app/public
//   npm run dev --prefix app                   # :5173
//   node scripts/example-ctas.mjs
//   node scripts/example-ctas.mjs --headed     # watch it
//   node scripts/receipt.mjs receipts/example-ctas.json
//
// Needs NO database and NO credentials. These are static pages; the whole
// check is a browser, a dev server and eight files.
//
// ---------------------------------------------------------------------------
// WHAT WENT WRONG, AND WHY A GREP WOULD NOT HAVE FOUND IT
// ---------------------------------------------------------------------------
// `v-goldenhour-prices.html` and `-work.html` both ran a `[data-book]` handler
// that called `e.preventDefault()` and then dereferenced
// `document.getElementById("book")` — an id that exists ONLY on the index.
// Every "Book Express Wash" style control on both pages threw
// `Cannot read properties of null`, and because the default had already been
// cancelled the link did not navigate either. **Two failures from one missing
// guard, and the second outlives the first**: swallow the exception and the
// button still does nothing.
//
// A1 found it on Prices. Nobody found it on Work. **Nobody found the two
// footer "Get a price" links either** — those are plain anchors pointing at
// `#book` on pages that have no `#book`, so they raise no error at all and do
// nothing, which is the version of this bug that a console check cannot see.
// That is the argument for asserting the LANDING rather than the absence of an
// exception.
//
// ---------------------------------------------------------------------------
// WHAT COUNTS AS A BOOKING CTA — DISCOVERED, NOT LISTED
// ---------------------------------------------------------------------------
// A hand-written list of controls is a list of the ones somebody remembered,
// and this repo's most expensive failures are all the same shape: the defect
// was not missing from the RUN, it was missing from the QUESTION. So the
// controls come off the page: every `<a href>` whose visible words say it
// starts a booking. Five sites express it five ways — `data-book` on ex1,
// `data-pick` on ex4, a bare `#book` anchor on ex2 and ex5, a cross-page link
// on ex3 — and the predicate reads none of those mechanisms.
//
// The count is then held to `EXPECTED` below. A page that quietly stops
// offering a CTA, or a rewrite that drops one, fails on the count before any
// of the per-CTA questions get asked.
//
// ---------------------------------------------------------------------------
// THE FOUR QUESTIONS PER CTA
// ---------------------------------------------------------------------------
//   reach    after the click, the document the browser is on has a booking
//            widget in it (`#book`). This is the one the original defect
//            fails: the page stayed put and has no widget.
//   inview   and if the control MEANT "start booking now" — its href ends in
//            `#book`, or it declares a service — that widget is actually on
//            screen. A fragment that lands a customer at the top of a long
//            page has not opened a booking path.
//   select   and if it declares a service, THAT service is the one selected.
//            A "Book Express Wash" that lands on Full Detail has handed over
//            the wrong service, which is ROADMAP 2.5 on a different site.
//   quiet    no page error and no console error while it happened.
//
// `inview` POLLS, IT DOES NOT GLANCE. The scroll is smooth on three of the
// five sites, so asking once immediately after the click measures the page
// the customer has already left. `docs/gotchas.md` — "settle() is a cap on a
// quiet DOM, not a wait for a thing."
//
// ---------------------------------------------------------------------------
// THREE CANARIES, ONE PER DETECTOR, AND THREE WAYS TO PROVE THEY ARE LIVE
// ---------------------------------------------------------------------------
// A check that cannot fail is not a check. Three controls are injected into
// three different pages, each broken in exactly one way, and each MUST be
// reported:
//
//   canary · dead target   an anchor to a fragment that does not exist, on the
//                          one served page with no widget at all (ex3's
//                          index). Must fail `reach`.
//   canary · wrong service an anchor on ex1 declaring a service the widget
//                          does not offer. Must fail `select`.
//   canary · throws        an anchor on ex5 whose own click handler throws.
//                          Must fail `quiet`.
//
// They are NOT counted as targets — they are not the product — but if any one
// of them comes back clean the run says every green line above it is void and
// exits non-zero.
//
// And each detector can be switched off on purpose, which is how this file was
// certified rather than believed:
//
//   --break=reach     stop asserting the landing   → the dead-target canary survives
//   --break=select    stop asserting the service   → the wrong-service canary survives
//   --break=quiet     stop reading the console     → the throwing canary survives
//   --break=canaries  inject nothing               → the receipt refuses the run
//
// ---------------------------------------------------------------------------
// TWO VIEWPORTS, AND THAT IS NOT THOROUGHNESS — IT IS THE ONLY WAY TO ASK
// ---------------------------------------------------------------------------
// The first run of this file reported eight controls it "could not click".
// Measured rather than explained away: **every one of them is 0x0 at 1440**.
// Each of the five sites carries a phone dock — `.bk` on ex1, `.dock-book` on
// ex2, `.go` on ex3, an `inline-flex .btn` on ex4 — that collapses to nothing
// on a desk screen and is 121x45, 362x48, real, and the PRIMARY booking
// control on a phone. A desk-only sweep does not test them; it merely fails to
// reach them, which is the same thing wearing a different face.
//
// So every control is tried at 1440x900 and at 392x844, and a control is
// judged only at the widths where it can actually be pressed. A control that
// can be pressed at NEITHER is its own failure, by name — that is the dead
// dock this arrangement exists to catch, and nothing else here would see it.

import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { writeReceipt } from "./receipt.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";
const started_at = new Date().toISOString();

// THE PAGES, AND THE `.html` IS DELIBERATE. `build-examples.mjs` prepends
// slashless rewrites (`/ex1/work` → `/ex1/work.html`) to `_redirects`, which
// is a NETLIFY file — the Vite dev server does not read it. The pages' own
// cross-links are rewritten to `/ex1/work.html`, so this is also the URL a
// customer's browser actually asks for after a click on either host.
const SITES = [
  { slug: "ex1", pages: ["", "work.html", "prices.html"] },
  { slug: "ex2", pages: [""] },
  { slug: "ex3", pages: ["", "prices.html"] },
  { slug: "ex4", pages: [""] },
  { slug: "ex5", pages: [""] },
];

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "392x844", width: 392, height: 844 },
];

// **THE COUNT GATE.** Measured 2026-09-19 and then written down, so a page
// that loses a CTA — or a discovery predicate that quietly narrows — fails
// here before any per-control question is asked. That is the failure mode
// `sweep-widths.mjs` was certified against, one product over.
const EXPECTED = {
  "ex1/": 4, "ex1/work.html": 7, "ex1/prices.html": 6,
  "ex2/": 5,
  "ex3/": 4, "ex3/prices.html": 15,
  "ex4/": 6,
  "ex5/": 4,
};

// Visible words that say "this starts a booking". Deliberately about WORDS
// rather than classes or data attributes: five sites carry five mechanisms
// (`data-book`, `data-pick`, a bare `#book`, a cross-page link, a dock) and a
// predicate coupled to any one of them is a predicate that sees one site.
const CTA_WORDS = /\b(book|reserve|schedule|get a quote|get a price|get started)\b/i;

// **WHAT EACH SITE IS EXPECTED TO CONTRIBUTE, DECLARED ABOVE THE RUN.**
// ROADMAP 2.5 states three of these five outright — *"ex3 passes (13
// controls, 13 options, 13 matches)"* and *"ex2 and ex5 contribute zero
// controls"* — so they are the spec's numbers, not this run's.
//
// **THE WEAKNESS, WRITTEN DOWN RATHER THAN HIDDEN:** the spec gives no figure
// for `ex1` or `ex4` (*"ex1 passes"*, *"ex4 passes on 1-3"*), so those two
// came from the first measurement, the same shape as `restore-drill`'s
// `EXPECTED_TABLES`. What makes them a floor rather than a mirror is that
// they are committed constants compared every run: a site that loses a
// service-naming control fails here until a person re-derives the number and
// says which control went. Moving one to make a run pass is the failure this
// whole file exists to catch.
const EXPECTED_NAMING = { ex1: 6, ex2: 0, ex3: 13, ex4: 3, ex5: 0 };

const totalUnmeasured = new Set();
let namingTotal = 0;
const namingBySite = new Map();

const CANARIES = [
  { id: "canary · dead target", page: "ex3/", detector: "reach",
    html: '<a href="#no-such-anchor-at-all" data-canary="dead">Book the canary</a>' },
  { id: "canary · wrong service", page: "ex1/", detector: "select",
    html: '<a href="#book" data-book="canary-not-a-service" data-canary="wrong">Book the canary</a>' },
  { id: "canary · throws", page: "ex5/", detector: "quiet",
    html: '<a href="#book" id="canary-thrower" data-canary="throws">Book the canary</a>' },
];

// ---------------------------------------------------------------------------

const failures = [];
const rows = [];
const consoleNoise = [];
let discovered = 0, attempted = 0, completed = 0, assertions = 0;
const canaryCaught = new Map(CANARIES.map((c) => [c.id, false]));

const browser = await chromium.launch({ headless: !HEADED });
const CTXS = [];
for (const vp of VIEWPORTS) {
  CTXS.push({ vp, ctx: await browser.newContext({ viewport: { width: vp.width, height: vp.height } }) });
}

/** Attach error capture to a page and return the (mutable) list it fills. */
function watch(page) {
  const errs = [];
  page.on("pageerror", (e) => errs.push("pageerror: " + String(e.message).slice(0, 160)));
  page.on("console", (m) => {
    if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160));
  });
  return errs;
}

/** Inject this page's canary, if it has one and canaries are on. */
async function injectCanary(page, key) {
  if (BREAK === "canaries") return null;
  const c = CANARIES.find((x) => x.page === key);
  if (!c) return null;
  await page.evaluate((html) => {
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483647";
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    const t = document.getElementById("canary-thrower");
    if (t) t.addEventListener("click", () => { throw new Error("canary"); });
  }, c.html);
  return c;
}

// **THE NUMBERING IS RE-APPLIED ON EVERY PAGE, AND THE FIRST VERSION DID NOT
// DO THAT.** Discovery stamped `data-cta-n` on a probe page and the click then
// happened on a FRESH load that had never been stamped, so all 51 controls
// came back `Timeout 4000ms exceeded` — a check failing 55 times over a
// product that was fine. It was caught only because a total failure is
// implausible; a partial one would have read as a finding. `docs/gotchas.md`.
//
// Document order of `a[href]` is the identity, and these are static files, so
// the same control carries the same number at both viewports.
const NUMBER = () => [].slice.call(document.querySelectorAll("a[href]"))
  .forEach((a, i) => a.setAttribute("data-cta-n", String(i)));

/** Everything on this page that says it starts a booking. */
const discover = (page) => page.evaluate((src) => {
  const re = new RegExp(src, "i");
  return [].slice.call(document.querySelectorAll("a[href]"))
    .filter((a) => {
      const href = a.getAttribute("href") || "";
      if (/^(mailto:|tel:|https?:\/\/)/i.test(href)) return false;
      return re.test((a.textContent || "").replace(/\s+/g, " ").trim());
    })
    .map((a) => {
      // THE CARD THIS CONTROL SITS IN — read behaviourally, because the four
      // sites wrap a service four ways. `article` covers ex3's `.pack` and
      // ex4's; `li`/`.card`/`section` are the fallbacks. Only ever used for a
      // control that names a service, so a generic CTA cannot drag a whole
      // `<section>` in and be judged against it.
      const card = a.closest("article, .pack, .card, li, section");
      const heading = card && card.querySelector("h1, h2, h3, h4");
      const cardPrice = card && (card.textContent.match(/\$\s*[\d,]+/) || [null])[0];
      return {
        n: a.getAttribute("data-cta-n"),
        text: (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
        href: a.getAttribute("href"),
        // THREE SHAPES, MATCHED ON BEHAVIOUR — ROADMAP 2.5's spec, and the
        // reason it is written there: a scan for `data-book` alone reported
        // ex4 as having no mechanism when it had one, working, on `data-pick`.
        // `?svc=` in the href is ex1's cross-page form.
        wants: a.getAttribute("data-book") || a.getAttribute("data-pick")
          || (a.getAttribute("href") || "").match(/[?&]svc=([^&#]+)/)?.[1] || null,
        cardName: heading ? heading.textContent.replace(/\s+/g, " ").trim() : null,
        cardPrice: cardPrice ? cardPrice.replace(/\s+/g, "") : null,
        canary: a.getAttribute("data-canary") || null,
      };
    });
}, CTA_WORDS.source);

// ---------------------------------------------------------------------------
// DOES THIS CONTROL OFFER TO BOOK A **NAMED** SERVICE? — ROADMAP 2.5
// ---------------------------------------------------------------------------
// **THE CLAUSE THIS TURNS ON IS THAT `ex2` AND `ex5` MUST COME OUT AT ZERO.**
// Both carry "Book a detail", and ex5 also carries "Book a coating" — generic
// offers, naming no service, with nothing to carry. A predicate that counts
// them reports two correct sites as broken.
//
// **AND EQUALITY IS WHAT MAKES THAT WORK, NOT A SUBSTRING.** Measured before
// this was written: ex5's widget has an option literally called
// **"Ceramic coating"**, so `"coating"` is a substring of a real option and a
// loose match would count that control and put ex5 at 1. The spec says zero.
// Equality gives zero. *This is the whole difference between the item being
// closed and the item being reopened by the next person who reads the number.*
//
// Three ways in, all of them behavioural:
//   1. it carries an identifier — `data-book`, `data-pick`, or `?svc=`
//   2. its text is `Book <X>` / `Book a <X>` and `<X>` EQUALS an option name
//   3. its text is `Book this` and its CARD's heading EQUALS an option name
const eq = (a, b) => !!a && !!b
  && String(a).replace(/\s+/g, " ").trim().toLowerCase() === String(b).replace(/\s+/g, " ").trim().toLowerCase();

function namesAService(cta, optionNames) {
  if (cta.wants) return "identifier";
  const t = (cta.text || "").replace(/\s*[→>-]+\s*$/, "").trim();
  if (/^book\s+this$/i.test(t) && optionNames.some((n) => eq(n, cta.cardName))) return "card";
  const m = /^book\s+(?:a\s+|an\s+|the\s+)?(.+)$/i.exec(t);
  if (m && optionNames.some((n) => eq(n, m[1]))) return "text";
  return null;
}

/** Is the booking widget on screen? POLLED, because three sites scroll smooth
 *  and asking once immediately after the click measures the page the customer
 *  has already left. gotchas.md — "settle() is a cap on a quiet DOM, not a
 *  wait for a thing." */
const widgetInView = async (page, ms = 2500) => {
  const until = Date.now() + ms;
  for (;;) {
    const seen = await page.evaluate(() => {
      const el = document.getElementById("book");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.top < innerHeight && r.bottom > 0;
    });
    if (seen === null) return { exists: false, inView: false };
    if (seen) return { exists: true, inView: true };
    if (Date.now() > until) return { exists: true, inView: false };
    await page.waitForTimeout(120);
  }
};

// ---------------------------------------------------------------------------
// THE FOUR SABOTAGES ROADMAP 2.5 ASKS FOR, AND THEY PLANT A DEFECT RATHER
// THAN BLINDING A DETECTOR
// ---------------------------------------------------------------------------
// The `--break=` switches above this line turn a detector OFF and check that
// its canary survives. These four do the opposite: they put a real fault into
// a real page and require the check to NAME it. **Each must produce exactly
// its own kind of finding and no other** — which is why assertion 4 compares
// `.bk-total` against the widget option's price rather than the card's, and
// why the chain stops at the first break.
//
// ONE FIXED TARGET, not "the first control the run meets": the same control
// at both viewports, reproducible by anyone, for ever. It is the control the
// item was opened for — "Book this" under Interior Refreshment, $200, on
// `/ex3/prices`, which shipped selecting the $500 Signature Detail.
const SABOTAGE_PAGE = "ex3/prices.html";
const SABOTAGE_ID = "interior-refreshment";
const PLANTS = {
  carry: "strips the identifier — expect `carry`, a control naming a service with nothing to carry",
  resolve: "points it at a service the widget lacks — expect `resolve`",
  price: "edits the card's printed price — expect `price`",
  total: "freezes .bk-total after the press — expect `total`",
};

async function sabotage(page, key) {
  if (!PLANTS[BREAK] || key !== SABOTAGE_PAGE) return;
  await page.evaluate(([id, what]) => {
    const a = document.querySelector(`[data-book="${id}"]`);
    if (!a) return;
    if (what === "carry") a.removeAttribute("data-book");
    if (what === "resolve") a.setAttribute("data-book", "no-such-service-anywhere");
    if (what === "price") {
      const card = a.closest("article, .pack, .card, li, section");
      const el = card && card.querySelector(".price");
      if (el) el.innerHTML = el.innerHTML.replace(/\d[\d,]*/, "999");
    }
  }, [SABOTAGE_ID, BREAK]);
}

/** One control, at one viewport. Returns whether it could be pressed at all,
 *  and what went wrong if it could. */
async function tryOne({ ctx, vp }, url, key, cta, optionNames = []) {
  // **IS THE CARD THIS CONTROL SITS IN A *SERVICE* CARD?** — added after the
  // first run of the name/price assertions produced THREE FALSE FINDINGS, and
  // this is ROADMAP 2.5's own lesson arriving one level down.
  //
  // `ex1/work.html` is a GALLERY. Its cards are past jobs — "1989 Mercedes
  // 300E", "$299" is what that job cost — and the CTA on each one says
  // "Book a Full Detail" and carries `?svc=full`, correctly. Comparing a
  // service option against a car's model name and a past invoice reported
  // three working controls as broken.
  //
  // The precondition is exact and behavioural: the card's heading must equal
  // one of the widget's own option names. It is NOT tautological — it says
  // "this card is selling a service", and the assertion that follows says
  // "and the identifier resolves to THAT service rather than another one",
  // which is exactly the defect on `/ex3/prices`: card Interior Refreshment,
  // widget Signature Detail.
  const serviceCard = optionNames.some((n) => eq(n, cta.cardName));
  const page = await ctx.newPage();
  const errs = watch(page);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await injectCanary(page, key);
  await sabotage(page, key);
  await page.evaluate(NUMBER);

  // TWO SCROLL STATES, BECAUSE A STICKY NAV IS NOT A DEAD BUTTON.
  // Measured 2026-09-19: ex4's first "Book a detail" lives in `.nav`, which is
  // `position: fixed`, `opacity: 0` and translated -68px until the page is
  // scrolled, at which point it becomes `.nav on` and sits at top: 12. Asking
  // only at rest reported it as a booking button nobody can press — a check
  // crying wolf over correct work, which is how a check stops being read.
  // So: try at rest, and if that fails scroll past the fold and try again.
  // A control that refuses BOTH states at BOTH widths is the real finding.
  let pressed = true, state = "at rest";
  const problems = [];
  const press = async (ms) => {
    try { await page.click(`[data-cta-n="${cta.n}"]`, { timeout: ms }); return true; }
    catch { return false; }
  };
  if (!await press(2500)) {
    state = "after scrolling";
    await page.evaluate(() => scrollTo(0, 1400));
    await page.waitForTimeout(700);          // the reveal is a transition, not a frame
    pressed = await press(2500);
  }

  if (!pressed) { await page.close(); return { vp: vp.name, pressed, state, problems, errs }; }

  await page.waitForLoadState("domcontentloaded").catch(() => {});
  const { exists, inView } = await widgetInView(page);

  // Does this control MEAN "start booking now"? An href ending `#book`, or a
  // declared service. "See prices and book" landing at the top of the prices
  // page is correct, and is not held to `inview`.
  const insists = /#book$/.test(cta.href || "") || !!cta.wants;

  assertions++;
  if (BREAK !== "reach" && !exists) problems.push("reach: no booking widget on the page it landed on");

  assertions++;
  if (BREAK !== "reach" && insists && exists && !inView) {
    problems.push("inview: the widget is on the page but not on screen");
  }

  // ---------------------------------------------------------------------
  // THE FOUR ASSERTIONS ROADMAP 2.5 ASKS FOR — 2026-09-21
  // ---------------------------------------------------------------------
  // The item's *Done when* is that this check asserts the matching service
  // NAME and PRICE in booking. Everything above proves the press LANDS
  // somewhere with a widget; none of it proves the widget then shows the
  // thing the customer pressed on. On `/ex3/prices` that gap was the defect:
  // "Book this" under the $200 Interior Refreshment left the $500 Signature
  // Detail selected, and every check in this repo said the page was fine.
  //
  // **ONE ROOT CAUSE, ONE FINDING.** If the identifier resolves to nothing,
  // the selection, the name, the price and the total are all consequences of
  // that, and printing five lines for one fault is what sends the next
  // session debugging the wrong half. So the chain stops at the first break.
  const measured = { resolve: null, name: null, price: null, total: null };
  if (BREAK === "total" && key === SABOTAGE_PAGE && cta.wants === SABOTAGE_ID) {
    await page.evaluate(() => {
      const t = document.querySelector(".bk-total");
      if (t) t.textContent = "$1";
    });
  }
  if (cta.wants) {
    assertions++;
    const opt = await page.evaluate((v) => {
      const all = [].slice.call(document.querySelectorAll('input[name="svc"]'));
      const hits = all.filter((i) => i.value === v);
      const checked = document.querySelector('input[name="svc"]:checked');
      const totalEl = document.querySelector(".bk-total");
      const out = {
        options: all.length, hits: hits.length,
        picked: checked ? checked.value : null,
        total: totalEl ? (totalEl.textContent.match(/\$\s*[\d,]+/) || [null])[0] : null,
        name: null, price: null,
      };
      if (hits.length === 1) {
        const lab = hits[0].closest("label") || hits[0].parentElement;
        const b = lab && lab.querySelector("b");
        const em = lab && lab.querySelector("em");
        out.name = b ? b.textContent.replace(/\s+/g, " ").trim() : null;
        out.price = em ? (em.textContent.match(/\$\s*[\d,]+/) || [null])[0] : null;
      }
      return out;
    }, cta.wants);
    if (opt.total) opt.total = opt.total.replace(/\s+/g, "");
    if (opt.price) opt.price = opt.price.replace(/\s+/g, "");

    // 1 · THE IDENTIFIER RESOLVES.
    if (BREAK !== "resolve-off" && opt.hits !== 1) {
      problems.push(`resolve: "${cta.wants}" matches ${opt.hits} of ${opt.options} widget option(s)`
        + " — the press selects nothing and the default stands, which looks fixed and behaves"
        + " identically to carrying no identifier at all");
      measured.resolve = false;
    } else {
      measured.resolve = true;
      // The original 2.4 assertion, and it is a CONSEQUENCE of the above, so
      // it only speaks once the identifier is known to resolve.
      assertions++;
      if (BREAK !== "select" && opt.picked !== cta.wants) {
        problems.push(`select: asked for "${cta.wants}", widget has "${opt.picked}"`);
      } else {
        // 2 · THE NAME MATCHES the service named on the card it was pressed
        //     from. Unmeasured rather than failed when the card carries no
        //     heading — this repo's parsers have only ever failed by
        //     inventing findings out of correct pages.
        if (serviceCard && opt.name) {
          assertions++;
          measured.name = eq(opt.name, cta.cardName);
          if (BREAK !== "name-off" && !measured.name) {
            problems.push(`name: the card says "${cta.cardName}", the widget option says "${opt.name}"`);
          }
        }
        // 3 · THE PRICE MATCHES the price printed on that card.
        if (serviceCard && cta.cardPrice && opt.price) {
          assertions++;
          measured.price = cta.cardPrice === opt.price;
          if (BREAK !== "price-off" && !measured.price) {
            problems.push(`price: the card prints ${cta.cardPrice}, the widget option prints ${opt.price}`);
          }
        }
        // 4 · THE TOTAL FOLLOWS. Compared against the OPTION's price, not the
        //     card's, deliberately: against the card's, a wrong card price
        //     would report TWO findings for one fault and neither sabotage
        //     below could be told from the other.
        if (opt.price) {
          if (opt.total === null) {
            // **ROADMAP 2.5 PREDICTS THIS AND NAMES THE SITE:** "ex4 passes on
            // 1-3 and is unmeasured on 4 unless it has a total." A widget with
            // no `.bk-total` cannot answer assertion 4, and saying nothing
            // would leave those controls reading as four-for-four.
            // ONE ENTRY PER CONTROL, NOT PER VIEWPORT. The first version
            // pushed from inside `tryOne`, which runs twice, and reported
            // **18** over a list of **9** — a summary number counting
            // something its own list does not show, which is the opening
            // test of `docs/silences.md`, committed inside a check built to
            // that document's standard.
            totalUnmeasured.add(`${key} "${cta.text}"`);
            measured.total = "unmeasured";
          } else {
            assertions++;
            measured.total = opt.total === opt.price;
            if (BREAK !== "total-off" && measured.total !== true) {
              problems.push(`total: the option prints ${opt.price}, .bk-total prints ${opt.total}`);
            }
          }
        }
      }
    }
  } else if (cta.names) {
    // **NO IDENTIFIER AT ALL — the defect ROADMAP 2.5 was opened for.**
    // `<a href="#book">Book this</a>` under a named, priced card. The press
    // lands on the widget and leaves whatever was `checked` selected. It
    // reaches, it does not throw, and every other assertion in this file
    // passes it.
    assertions++;
    problems.push(`carry: this control offers to book "${cta.cardName ?? cta.text}"`
      + " and carries no service identifier — no data-book, no data-pick, no ?svc=."
      + " The press lands on the widget and leaves the default selected.");
  }

  assertions++;
  if (BREAK !== "quiet" && errs.length) problems.push("quiet: " + errs[0]);

  await page.close();
  return { vp: vp.name, pressed, state, problems, errs };
}

// ---------------------------------------------------------------------------

for (const site of SITES) {
  for (const p of site.pages) {
    const key = `${site.slug}/${p}`;
    const url = `${BASE}/${site.slug}/${p}`;

    // Discover once. The DOM is identical at both viewports — these are static
    // files and nothing here is rendered by script — so only the LAYOUT
    // differs, which is exactly what the two passes are for.
    const probe = await CTXS[0].ctx.newPage();
    watch(probe);
    await probe.goto(url, { waitUntil: "domcontentloaded" });
    await injectCanary(probe, key);
    // **THE PROBE HAS TO SEE THE SABOTAGE TOO, and the first version did not.**
    // The plants were applied in `tryOne` only, so discovery read the CLEAN
    // DOM: `--break=carry` still captured the identifier it had just removed,
    // `--break=resolve` captured the good one, and `--break=price` captured
    // the real price and passed with zero failures. All three then reported
    // `select` — one detector standing in for three, which is a check that
    // cannot tell its own sabotages apart.
    await sabotage(probe, key);
    await probe.evaluate(NUMBER);
    const ctas = await discover(probe);
    // The widget's option NAMES, read from this page, so "Book a Full Detail"
    // can be told from "Book a detail" by asking the product rather than by
    // guessing which words are service-shaped.
    const optionNames = await probe.evaluate(() =>
      [].slice.call(document.querySelectorAll('input[name="svc"]')).map((i) => {
        const lab = i.closest("label") || i.parentElement;
        const b = lab && lab.querySelector("b");
        return b ? b.textContent.replace(/\s+/g, " ").trim() : i.value;
      }));
    for (const c of ctas) c.names = c.canary ? null : namesAService(c, optionNames);
    await probe.close();

    const real = ctas.filter((c) => !c.canary);
    discovered += real.length;

    const want = EXPECTED[key];
    if (want === undefined) failures.push(`${key}: no expected count — a page nobody approved`);
    else if (real.length !== want) failures.push(`${key}: expected ${want} booking CTAs, discovered ${real.length}`);

    // **THE SERVICE-NAMING COUNT, AND ZERO IS PRINTED RATHER THAN PASSED
    // SILENTLY** - this clause IS ROADMAP 2.5's remaining item.
    // "A site with no service-naming controls is not a site that passed."
    // `ex2` and `ex5` genuinely have none - they offer "Book a detail" and
    // "Book a coating", which name nothing and have nothing to carry. Those
    // pages must come out at `0 naming` and SAY so, because a page that
    // silently contributes nothing to the subject of a check is the exact
    // shape this repo keeps shipping: a clean line over an unmeasured screen.
    const naming = real.filter((c) => c.names);
    namingTotal += naming.length;
    namingBySite.set(site.slug, (namingBySite.get(site.slug) ?? 0) + naming.length);
    console.log(`\n${key.padEnd(18)} ${String(real.length).padStart(2)} CTAs, ${String(naming.length).padStart(2)} naming a service`
      + (ctas.length > real.length ? " + canary" : ""));
    // **IN THOSE WORDS, because the spec asks for those words.** "0 naming a
    // service" beside a row of green is still a row of green. `0 controls`
    // with the reason after it is a sentence a person scrolling past cannot
    // mistake for a pass.
    if (naming.length === 0) {
      console.log(`${" ".repeat(18)}  0 controls — nothing here offers a NAMED service, so this page `
        + "is UNMEASURED for 2.5 rather than passed. A site with no service-naming controls is "
        + "not a site that passed.");
    }

    for (const cta of ctas) {
      if (!cta.canary) attempted++;

      const seen = [];
      for (const c of CTXS) seen.push(await tryOne(c, url, key, cta, optionNames));
      for (const s of seen) for (const e of s.errs) consoleNoise.push(`${key} ${s.vp} "${cta.text}" — ${e}`);

      const usable = seen.filter((s) => s.pressed);
      let problems;
      if (!usable.length) {
        // The control exists in the markup and cannot be pressed at any width
        // this product supports. That is a booking button nobody can use.
        problems = [`cannot be pressed at ${VIEWPORTS.map((v) => v.name).join(" or ")} — 0x0 or unreachable at both`];
      } else {
        problems = usable.flatMap((s) => s.problems.map((m) => `${s.vp} ${m}`));
      }
      const at = usable.map((s) => `${s.vp} ${s.state}`).join(", ") || "nowhere";

      if (cta.canary) {
        // One canary per page, so the page is the key. Matching on the
        // attribute value too would be a second spelling to keep in step.
        const c = CANARIES.find((x) => x.page === key);
        if (c && problems.length) canaryCaught.set(c.id, true);
        rows.push({ key, ...cta, at, verdict: problems.length ? "caught (canary)" : "MISSED (canary)", problems });
        continue;
      }

      completed++;
      if (problems.length) failures.push(`${key} "${cta.text}" → ${cta.href} — ${problems.join("; ")}`);
      rows.push({ key, ...cta, at, verdict: problems.length ? "FAIL" : "ok", problems });
      console.log(`   ${problems.length ? "FAIL " : "ok   "} ${cta.text.padEnd(26)} ${String(cta.href).padEnd(26)} [${at}]`
        + (problems.length ? "\n          " + problems.join("\n          ") : ""));
    }
  }
}

await browser.close();

// ---------------------------------------------------------------------------

// **ZERO ACROSS THE WHOLE RUN IS A FAILURE, NOT A CLEAN BILL.** Per-site zero
// is a fact about that site; zero everywhere means the predicate stopped
// matching and the four assertions above ran against nothing at all.
if (namingTotal === 0) {
  failures.push("ZERO SERVICE-NAMING CONTROLS ACROSS ALL FIVE SITES. The name, price and "
    + "total assertions ran against nothing, so this run proves nothing about 2.5.");
}
for (const [slug, want] of Object.entries(EXPECTED_NAMING)) {
  const got = namingBySite.get(slug) ?? 0;
  if (got !== want) {
    failures.push(`${slug}: expected ${want} service-naming control(s), found ${got}`
      + (want === 0 ? " — this site offers no NAMED service and must stay at zero" : ""));
  }
}
// `.size`, NOT `.length`. It was `.length` for one commit after the container
// became a Set, so the guard was `undefined` and this whole block silently
// never ran — the unmeasured controls went unreported and the run still said
// PASS. Found by looking for a line that should have been there. A container
// type changed under a guard that was not changed with it.
if (totalUnmeasured.size) {
  const sites = [...new Set([...totalUnmeasured].map((t) => t.split("/")[0]))];
  console.log(`
assertion 4 (the total follows) UNMEASURED on ${totalUnmeasured.size} control(s) `
    + `across ${sites.length} site(s) — ${sites.join(", ")}: their widget prints no .bk-total, so `
    + `there is nothing to compare. NOT a pass on that assertion. ROADMAP 2.5 predicts this for `
    + `ex4 and does not mention ex1, which has it too.`);
}
console.log(`
service-naming controls: ${namingTotal} - `
  + [...namingBySite].map(([k, v]) => `${k} ${v}`).join(", ")
  + (namingTotal ? "" : "  <- nothing was measured"));

const missed = [...canaryCaught].filter(([, caught]) => !caught).map(([id]) => id);
const canary = {
  id: "three-injected-ctas",
  observed_failure: BREAK !== "canaries" && missed.length === 0,
  caught: [...canaryCaught].filter(([, c]) => c).map(([id]) => id),
  missed,
};

mkdirSync(new URL("../artifacts/example-ctas/", import.meta.url), { recursive: true });
const art = "artifacts/example-ctas/index.html";
const expectedTotal = Object.values(EXPECTED).reduce((a, b) => a + b, 0);
writeFileSync(new URL("../" + art, import.meta.url), `<!doctype html><meta charset="utf-8">
<title>Example booking CTAs${BREAK ? ` — SABOTAGE --break=${BREAK}` : ""}</title>
<style>body{font:13px/1.55 ui-monospace,SFMono-Regular,monospace;margin:26px;background:#12100e;color:#e8e3da}
h1{font-size:17px;font-weight:600;letter-spacing:.01em}td,th{padding:5px 11px;border-bottom:1px solid #2e2a26;text-align:left;vertical-align:top}
th{color:#9a9188;font-weight:600}.FAIL{color:#ff8478}.ok{color:#8fd694}td small{color:#9a9188}</style>
<h1>Every booking CTA on /ex1 … /ex5${BREAK ? ` — SABOTAGE, --break=${BREAK}, not a result` : ""}</h1>
<p>${completed} of ${expectedTotal} product CTAs pressed at ${VIEWPORTS.map((v) => v.name).join(" and ")},
${failures.length} failure(s), canary ${canary.observed_failure ? "caught all three" : "MISSED: " + missed.join(", ")}.</p>
<table><tr><th>page</th><th>control</th><th>href</th><th>service</th><th>pressable at</th><th>verdict</th></tr>
${rows.map((r) => `<tr><td>${r.key}</td><td>${r.text}</td><td>${r.href}</td>
<td>${r.wants ?? ""}</td><td>${r.at}</td><td class="${r.verdict}">${r.verdict}
${r.problems.length ? "<br><small>" + r.problems.join("<br>") + "</small>" : ""}</td></tr>`).join("\n")}
</table>`, "utf8");

const status = failures.length === 0 && canary.observed_failure ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "example-ctas",
  started_at,
  status,
  expected_targets: expectedTotal,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  // 51 controls, two viewports, three questions each plus one more wherever a
  // control declares a service — minus the ones that are 0x0 at 1440 and so
  // answer nothing there. Lowering this is a visible diff somebody has to
  // justify, which is the only reason a floor is worth writing down.
  min_assertions: 300,
  failures,
  artifacts: [art],
  warnings: [
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    ...consoleNoise,
  ],
  dimensions: {
    sites: SITES.map((s) => s.slug),
    pages: Object.keys(EXPECTED),
    viewports: VIEWPORTS.map((v) => v.name),
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expectedTotal} CTAs, ${assertions} assertions, `
  + `${failures.length} failure(s), `
  + (canary.observed_failure ? "all three canaries caught" : `CANARY MISSED: ${missed.join(", ")}`)
  + `. Receipt ${path}`);
if (!canary.observed_failure) {
  console.log("  A canary handed this check a defect on purpose and it did not see it.");
  console.log("  Every clean line above is void.");
}
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
