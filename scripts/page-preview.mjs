// DOES THE BUSINESS SCREEN SHOW THE DETAILER'S REAL BOOKING PAGE? — ROADMAP 9.10.
//
//   node scripts/page-preview.mjs
//   node scripts/page-preview.mjs --headed
//   node scripts/page-preview.mjs --break=wrongowner  # sabotage: the thin run signs in as the DEMO owner
//
// Dev server + the seeded demo tenant + `.env` loaded.
//
// ---------------------------------------------------------------------------
// WHAT 9.10 ASKS, AND WHAT EACH CLAUSE COSTS TO GET WRONG
// ---------------------------------------------------------------------------
//   real-page       the right half shows the REAL `/book/<slug>`, not a
//                   rendering of the settings. A mock-up is a second
//                   implementation of the booking page and would drift.
//   on-save         it refreshes on SAVE, NOT on a keystroke. 9.10's own
//                   "what failing looks like": a preview that redraws as
//                   somebody types, showing half-typed nonsense to the one
//                   person judging how their own page looks.
//   thin-not-blank  a thin business gets the page AS IT IS TODAY plus ONE line
//                   naming what is missing. 9.10's other failing shape is "a
//                   blank right half on the thin business, which is the exact
//                   complaint this item came from".
//   stacks          on a phone it stacks BELOW rather than beside.
//
// 4 questions x 2 businesses x 2 widths + 1 lite = **17**, fixed by the list.
//
// ---------------------------------------------------------------------------
// THE THIN BUSINESS IS REAL, ALL THE WAY DOWN
// ---------------------------------------------------------------------------
// The first version of this check made the thin case by INTERCEPTING the
// signed-in session's count queries and rewriting the businesses answer, and
// said so in its own header. That proved the sentence matched the page; it did
// not prove the screen is right for an account that really is thin, and a
// rewritten answer can disagree with the real one in ways nobody sees.
//
// Now the thin run signs in as the REAL owner of `final-pass-fixture`, a
// business on the dev project (ref kguqylyzgyzfktkfnhjb, `is_demo = true`, the
// owner's address on the `fixture.test` sink) with genuinely zero services,
// add-ons, photos and reviews. Nothing in this script intercepts a request.
//
// THE LOGIN: `FIXTURE_OWNER_PW` in `.env`, which is gitignored, the way
// `DEMO_OWNER_PW` is. It fails loudly and never falls back to a literal.
//
//     set -a; . ./.env; set +a
//
// A consequence worth knowing: that business still has its five weekday
// opening-hours rows (`final-pass.mjs` seeds them, as `newBusiness.ts` does),
// so the thin sentence names what is genuinely missing, not what an
// interception zeroed.

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE_URL || process.env.BASE || "http://localhost:5173";
const ART = join(REPO, "artifacts", "page-preview");
const ARGS = process.argv.slice(2);
const HEADED = ARGS.includes("--headed");
const BREAK = (ARGS.find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
const OWNER = demoOwner();
const FIXTURE_OWNER = (() => {
  const password = process.env.FIXTURE_OWNER_PW;
  if (!password) {
    throw new Error("FIXTURE_OWNER_PW is not set, so the thin business cannot be signed into.\n"
      + "  It is the password of final-owner@fixture.test and it lives in `.env`. Load it:\n"
      + "      set -a; . ./.env; set +a\n  NOTHING WAS MEASURED. This is not a pass.");
  }
  return { email: "final-owner@fixture.test", password };
})();

// 320 FIRST, because 9.10's Done-when says so and because the phone is where
// "stacks below rather than beside" is the whole question.
const SIZES = [{ w: 320, h: 844 }, { w: 1440, h: 900 }];
const THIN_SLUG = "final-pass-fixture";
// "Not collapsed". The frame is as tall as its page now, and the shortest REAL page
// (the thin business's refusal) is 88px at a desk; a canary collapses it to 0.
const MIN_FRAME = 40;
const EMPTY_FLOOR_MAX = 40;  // measured 12-16px at all four runs (page padding); a stand-in frame is hundreds

const failures = [], observed = [], consoleBad = [];
let assertions = 0;
const check = (id, name, cond, detail) => {
  assertions++;
  if (cond) { console.log(`    ok      ${name}  ${id}`); return true; }
  failures.push(`${id}: ${name} — ${detail}`);
  console.error(`    FAIL    ${name}  ${id} — ${detail}`);
  return false;
};

async function signIn(ctx, owner = OWNER) {
  const page = await ctx.newPage();
  page.on("console", (m) => {
    const t = m.type();
    if (t === "error" || t === "warning") consoleBad.push(`${t}: ${m.text().slice(0, 180)} @ ${(m.location().url || "").replace(/apikey=[^&]+/, "").slice(0, 160)}`);
  });
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", owner.email);
    await page.fill("input[type=password]", owner.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
  await page.evaluate(() => {
    try {
      localStorage.setItem("dp.tours", JSON.stringify(
        ["shell", "today", "calendar", "money", "clients", "business"]));
      localStorage.setItem("dp.tour", "1");
    } catch { /* private mode */ }
  });
  return page;
}

async function openBusiness(page) {
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  await page.locator('.tabbar button[data-tour="business"]').first().click();
  await page.waitForSelector(".pagepv", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

/** Everything the four questions need, read from the live DOM. */
const readPreview = (page) => page.evaluate(() => {
  const pv = document.querySelector(".pagepv");
  if (!pv) return { present: false };
  const frame = pv.querySelector("iframe");
  const r = pv.getBoundingClientRect();
  const link = document.querySelector(".booking-link");
  const linkBox = link ? link.getBoundingClientRect() : null;
  const cs = frame ? getComputedStyle(frame) : null;
  return {
    present: true,
    src: frame ? frame.getAttribute("src") : null,
    frameH: frame ? Math.round(frame.getBoundingClientRect().height) : 0,
    frameW: frame ? Math.round(frame.getBoundingClientRect().width) : 0,
    painted: !!(cs && cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0),
    missing: (pv.querySelector(".pagepv-missing")?.textContent || "").trim(),
    // BELOW or BESIDE: the preview's top against the link's bottom. Stacked
    // means it starts under the link; beside means they share a band.
    top: Math.round(r.top), left: Math.round(r.left),
    linkBottom: linkBox ? Math.round(linkBox.bottom) : null,
    linkLeft: linkBox ? Math.round(linkBox.left) : null,
    inCol2: !!pv.closest(".col-2"),
  };
});

async function run() {
  rmSync(ART, { recursive: true, force: true });
  mkdirSync(ART, { recursive: true });
  const browser = await chromium.launch({ headless: !HEADED });

  for (const size of SIZES) {
    for (const thin of [false, true]) {
      const id = `${size.w}px ${thin ? "thin" : "complete"}`;
      const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
      // the thin run is a REAL sign-in as the thin business's owner; --break=wrongowner
      // signs in as the demo owner instead, which must turn `thin-not-blank` red
      const page = await signIn(ctx, thin && BREAK !== "wrongowner" ? FIXTURE_OWNER : OWNER);
      await openBusiness(page);
      const p = await readPreview(page);
      await page.screenshot({ path: join(ART, `${size.w}-${thin ? "thin" : "complete"}.png`), fullPage: false });

      check(id, "real-page", !!(p.present && p.src && /\/book\//.test(p.src) && p.frameH > MIN_FRAME && p.painted),
        `the preview is ${p.present ? `present, src=${p.src}, ${p.frameW}x${p.frameH}, painted=${p.painted}` : "ABSENT"}`
        + " — 9.10 asks for the real /book/<slug>, rendered, not a mock-up");

      // 9.10's own failing shape: "a blank right half on the thin business".
      check(id, "thin-not-blank", !thin
        ? true
        // ...and it must BE the thin business: a signed-in demo owner also has a missing-line
        // ("no photos yet"), which is how --break=wrongowner passed this the first time
        : !!(p.present && p.frameH > MIN_FRAME && p.missing.length > 0 && String(p.src).includes(`/book/${THIN_SLUG}`)),
        thin
          ? `thin business: frame ${p.frameH}px tall, missing-line ${p.missing ? `"${p.missing}"` : "ABSENT"}`
          : "n/a");

      /* **AS TALL AS THE PAGE IT SHOWS.** The frame's height against the booking
         page's own content height read from INSIDE the frame (same origin on
         localhost). A frame that keeps its stand-in height reads as a number
         that is not the page's. */
      // THE PAGE'S OWN HEIGHT, MEASURED TWO WAYS. `.bk`'s box is one: but that box
      // can be stretched to the frame by a viewport-relative min-height, and then
      // frame and page agree because one made the other. The other is the lowest
      // bottom edge of any leaf element, which a stretched wrapper cannot move.
      // The gap between them is empty floor under the content: a bar's clearance
      // and padding are fine, a frame of stand-in height around a short page is not.
      const measure = () => page.frames().find((f) => f.url().includes("/book/"))
        ?.evaluate(() => {
          const bk = document.querySelector(".bk");
          let leaf = 0;
          for (const el of bk ? bk.querySelectorAll("*") : []) {
            if (el.children.length) continue;
            const r = el.getBoundingClientRect();
            if (!(r.height > 0 && r.width > 0)) continue;
            // a leaf inside a collapsed panel is still "there" but nobody can see
            // it: skip anything an overflow-clipping ancestor ends above
            let clipped = false;
            for (let up = el.parentElement; up && up !== bk && !clipped; up = up.parentElement) {
              if (getComputedStyle(up).overflowY !== "visible" && r.top >= up.getBoundingClientRect().bottom - 0.5) clipped = true;
            }
            if (!clipped) leaf = Math.max(leaf, r.bottom);
          }
          return { box: Math.ceil(bk?.getBoundingClientRect().height || 0), leaf: Math.ceil(leaf) };
        }).catch(() => null);

      // let it SETTLE: the first load on a cold dev server can outlast the wait
      // above. Up to 5s for frame and page to agree; a message that never comes
      // still ends red once the time is up.
      let probe = { box: 0, leaf: 0 }, pf = p;
      for (let i = 0; i < 10; i++) {
        probe = (await measure()) ?? { box: 0, leaf: 0 };
        pf = await readPreview(page);
        if (probe.box > 0 && Math.abs(pf.frameH - probe.box) <= 2) break;
        await page.waitForTimeout(500);
      }
      const empty = pf.frameH - probe.leaf;
      check(id, "frame-fits", probe.box > 0 && Math.abs(pf.frameH - probe.box) <= 2 && empty >= -2 && empty <= EMPTY_FLOOR_MAX,
        `the frame is ${pf.frameH}px, the page's box ${probe.box}px, its lowest content ${probe.leaf}px,`
        + ` so ${empty}px of empty floor (allowed up to ${EMPTY_FLOOR_MAX})`
        + " - a box mismatch is a stand-in height or a message that never arrived; too much floor is a page stretched to its frame");
      observed.push(`${id}: frame ${pf.frameH}, box ${probe.box}, lowest content ${probe.leaf}, empty floor ${empty}`);

      check(id, "stacks", size.w >= 1180
        ? p.inCol2 === true
        : (p.inCol2 === false && p.linkBottom !== null && p.top >= p.linkBottom - 2),
        size.w >= 1180
          ? `at a desk it belongs in the resting column; inCol2=${p.inCol2}`
          : `on a phone it must start below the link: preview top ${p.top}, link bottom ${p.linkBottom},`
            + ` inCol2=${p.inCol2}`);

      /* **NOTHING MAY COME TO REST UNDER THE TAB BAR.** This repo's own
         absolute, and a 600px frame dropped at the foot of a phone screen is
         exactly the shape that breaks it. Scrolled to the very bottom and
         hit-tested rather than eyeballed: a screenshot shows the frame NEAR
         the bar and cannot tell you whether it is under it. */
      const rest = await page.evaluate(() => {
        const bar = document.querySelector(".tabbar");
        const pv = document.querySelector(".pagepv");
        if (!pv) return { n: 0, why: "no preview" };
        if (!bar) return { n: 0, why: "no tab bar at this width" };
        window.scrollTo(0, document.documentElement.scrollHeight);
        return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => {
          const b = bar.getBoundingClientRect();
          const r = pv.getBoundingClientRect();
          const overlap = Math.max(0, Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top));
          const x = Math.round(r.left + r.width / 2);
          const y = Math.round(Math.min(r.bottom, b.bottom) - 2);
          const hit = document.elementFromPoint(x, y);
          done({
            n: overlap > 1 && hit && hit.closest(".tabbar") ? Math.round(overlap) : 0,
            overlap: Math.round(overlap),
            owns: hit ? hit.tagName + "." + String(hit.className).split(" ")[0] : "nothing",
          });
        })));
      });
      check(id, "tabbar-clear", rest.n === 0,
        `scrolled to the bottom, ${rest.overlap}px of the preview sits in the tab bar's band and the`
        + ` pixel there belongs to ${rest.owns}`);

      /* ══ ON SAVE, NOT ON A KEYSTROKE ═══════════════════════════════════
         **THE FIRST VERSION OF THIS PASSED WITHOUT TESTING ANYTHING.** It
         stamped the iframe, opened a settings panel, typed three characters
         and asserted the stamp survived. It did, at every width, because
         `SettingsHost` renders the resting column ONLY when nothing is open:
         opening the panel unmounts the preview, so there is no frame to
         redraw. The stamp read `no-frame` and the check said ok.

         That is a STRONGER guarantee than 9.10 asks for, and it is still not
         what the old assertion claimed to have measured. Two halves now, each
         named for what it actually is:
           a - while a panel is OPEN no frame is mounted, so nothing typed can
               reach one;
           b - CLOSING the panel brings it back, which is `refreshKey` bumping
               in `onClose` - the save moment. */
      await page.goto(`${BASE}/app?settings=info`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input", { timeout: 15000 }).catch(() => {});
      const nameField = page.locator("input").first();
      if (await nameField.count()) {
        await nameField.click().catch(() => {});
        await nameField.type("zzz", { delay: 60 }).catch(() => {});
      }
      await page.waitForTimeout(700);
      const whileOpen = await page.evaluate(() => document.querySelectorAll(".pagepv iframe").length);
      check(id, "on-save/absent-while-typing", whileOpen === 0,
        `with a settings panel open and three characters typed, ${whileOpen} preview frame(s) are`
        + " mounted; a frame on screen here is the one that could redraw per keystroke");
      await openBusiness(page);
      const after = await readPreview(page);
      check(id, "on-save/returns-on-close", !!(after.present && after.src && after.frameH > MIN_FRAME),
        `after closing the panel the preview is ${after.present ? `back, ${after.frameH}px` : "STILL ABSENT"}`
        + " - if it never comes back, the refresh never happens at all");
      const stamp = whileOpen === 0 ? "unmounted-while-open" : "MOUNTED-WHILE-OPEN";

      observed.push(`${id}: src=${p.src} ${p.frameW}x${p.frameH} inCol2=${p.inCol2}`
        + ` missing=${p.missing ? `"${p.missing.slice(0, 60)}"` : "(none)"} stamp-after-typing=${stamp}`);
      await ctx.close();
    }
  }

  // ── ?lite=1, the reduced-motion path CLAUDE.md requires ────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await signIn(ctx);
    await page.goto(`${BASE}/app?lite=1`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".tabbar", { timeout: 30000 });
    await page.locator('.tabbar button[data-tour="business"]').first().click();
    await page.waitForTimeout(2500);
    const p = await readPreview(page);
    await page.screenshot({ path: join(ART, "1440-lite.png") });
    check("1440px lite", "real-page", !!(p.present && p.src && p.frameH > MIN_FRAME && p.painted),
      `?lite=1: present=${p.present} src=${p.src} ${p.frameW}x${p.frameH} painted=${p.painted}`);
    observed.push(`1440px lite: src=${p.src} ${p.frameW}x${p.frameH}`);
    await ctx.close();
  }

  /* ══ THE PUBLIC PAGE STAYS SILENT ═════════════════════════════════════
     The height message exists for the settings screen. A customer's page, framed
     or not, must send nothing and carry no class. A positive control proves the
     listener CAN hear: the same page with `?pv=1` must be heard. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
    const page = await ctx.newPage();
    await page.setContent(`<script>window.__m={plain:0,pv:0};addEventListener("message",function(e){
      if(e.data&&e.data.type==="dp.pv.height")window.__m[e.source===document.getElementById("a").contentWindow?"plain":"pv"]++})</script>
      <iframe id="a" src="${BASE}/book/demo-detail" width="390" height="800"></iframe>
      <iframe id="b" src="${BASE}/book/demo-detail?pv=1" width="390" height="800"></iframe>`);
    await page.waitForTimeout(3500);
    const heard = await page.evaluate(() => window.__m);
    const plainClass = await page.frames().find((f) => f.url().endsWith("/book/demo-detail"))
      ?.evaluate(() => document.documentElement.classList.contains("pv-embed")).catch(() => null);
    check("public page", "public-silent", heard.plain === 0 && heard.pv >= 1 && plainClass === false,
      `framed WITHOUT ?pv=1: ${heard.plain} message(s), pv-embed class ${plainClass}; framed WITH it: ${heard.pv} message(s) (control, must be >= 1)`);
    await page.goto(`${BASE}/book/demo-detail?pv=1`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const topClass = await page.evaluate(() => document.documentElement.classList.contains("pv-embed"));
    check("public page", "pv-needs-a-frame", topClass === false,
      `opened on its own with ?pv=1, pv-embed class is ${topClass}; it must stay off outside a frame`);
    observed.push(`public page: framed without ?pv=1 sent ${heard.plain}, with it ${heard.pv}; unframed ?pv=1 class=${topClass}`);
    await ctx.close();
  }

  /* ══ THE CANARY, RUN RATHER THAN DECLARED ═════════════════════════════
     **The first version of this receipt wrote `observed_failure: true` as a
     LITERAL.** A canary that is declared to have failed rather than made to
     fail is a decoration, and it would have called this check sound on the
     day the check stopped working. Two detectors, each handed the defect
     9.10 names, and each must go red. */
  const canaryProblems = [];
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await signIn(ctx, FIXTURE_OWNER);
    await openBusiness(page);
    const before = await readPreview(page);
    await page.evaluate(() => {
      document.querySelector(".pagepv-missing")?.remove();
      const f = document.querySelector(".pagepv iframe");
      if (f) f.style.height = "0px";
    });
    const broken = await readPreview(page);
    await page.screenshot({ path: join(ART, "canary-blank-thin.png") });
    assertions++;
    const caught = !(broken.present && broken.frameH > MIN_FRAME && broken.missing.length > 0);
    if (!caught) {
      canaryProblems.push("CANARY MISSED: the-blank-thin-half - the missing line was deleted and"
        + " the frame collapsed to 0px, and `thin-not-blank` still passed.");
    }
    console.log(`  canary the-blank-thin-half: ${before.frameH}px + line -> ${broken.frameH}px +`
      + ` ${broken.missing ? "line" : "no line"}; detector ${caught ? "CAUGHT it" : "MISSED it"}`);

    await openBusiness(page);
    await page.evaluate(() => {
      const f = document.querySelector(".pagepv iframe");
      if (f) f.dataset.pvStamp = "before";
    });
    await page.evaluate(() => {
      const f = document.querySelector(".pagepv iframe");
      if (!f) return;
      const n = f.cloneNode(false);
      delete n.dataset.pvStamp;
      f.replaceWith(n);
    });
    assertions++;
    const gone = await page.evaluate(() => {
      const f = document.querySelector(".pagepv iframe");
      return f ? (f.dataset.pvStamp ?? null) : "no-frame";
    });
    const caught2 = gone === null;
    if (!caught2) {
      canaryProblems.push(`CANARY MISSED: the-remounted-frame - the iframe was replaced and the`
        + ` stamp still read ${gone}, so a redraw is not observable by this method.`);
    }
    console.log(`  canary the-remounted-frame: stamp after replacing the frame is ${gone};`
      + ` detector ${caught2 ? "CAUGHT it" : "MISSED it"}`);
    await ctx.close();
  }

  await browser.close();

  // Forgiven BY NAME, with its reason. (The React Router future-flag warnings were forgiven
  // here until the two flags were turned on in main.jsx; they are failures again.) The 404 is the platform-admin function
  // answering a NON-admin: GearMenu asks `whoami` and the function deliberately
  // answers every non-admin with 404 so it never confirms itself. The demo owner is
  // a platform admin, so it never shows there; the real thin owner is not.
  const FORGIVEN = /status of 404.*functions[/]v1[/]platform-admin/;
  const uniq = [...new Set(consoleBad)];
  for (const c of uniq.filter((c) => !FORGIVEN.test(c))) failures.push(`console — ${c}`);
  const forgiven = uniq.filter((c) => FORGIVEN.test(c));
  for (const c of forgiven) observed.push(`console FORGIVEN BY NAME: ${c.slice(0, 140)}`);

  const targets = SIZES.length * 2 + 1;
  const { path, receipt } = writeReceipt({
    check_id: "page-preview",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status: (failures.length || canaryProblems.length) ? "fail" : "pass",
    expected_targets: targets,
    discovered_targets: targets,
    attempted_targets: targets,
    completed_targets: targets,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: SIZES.length * 2 * 7 + 1 + 2 + 2,
    assertion_floor:
      "7 questions (real-page, thin-not-blank, frame-fits, stacks, tabbar-clear, "
      + "on-save/absent-while-typing, on-save/returns-on-close) x 2 businesses x 2 widths "
      + "+ 1 lite real-page + 2 public-page + 2 canaries = 33. Structural: fixed by the question list, never "
      + "by what the run finds - a width whose screen never renders books its seven as failures "
      + "rather than dropping out, so the count cannot fall.",
    failures: [...failures, ...canaryProblems],
    warnings: [
      "The THIN run is a real sign-in as the owner of `final-pass-fixture` (dev project, is_demo, "
      + "fixture.test sink) and nothing is intercepted. Its login is FIXTURE_OWNER_PW in the "
      + "gitignored `.env`.",
      "That business keeps its five weekday hours rows, so the thin sentence is about what it "
      + "genuinely lacks (services, add-ons, photos, reviews), not an all-zero rewrite.",
      "`on-save` proves the frame is NOT remounted by typing. It does not prove a save DOES "
      + "refresh it; that is `refreshKey` bumping in `onClose`, which is one line and is read "
      + "rather than pressed here.",
    ],
    artifacts: [
      ...SIZES.flatMap((s) => [
        `artifacts/page-preview/${s.w}-complete.png`,
        `artifacts/page-preview/${s.w}-thin.png`,
      ]),
      "artifacts/page-preview/1440-lite.png",
    ],
    dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), thin_slug: THIN_SLUG, observed, sabotage: BREAK },
    canary: { id: "the-blank-thin-half", observed_failure: canaryProblems.length === 0, problems: canaryProblems },
  });

  for (const o of observed) console.log("  " + o);
  console.log("");
  const all = [...failures, ...canaryProblems];
  if (all.length) {
    console.log(`FAIL  page-preview — ${all.length} finding(s)`);
    for (const f of all) console.log("  · " + f);
  } else {
    console.log(`PASS  page-preview — ${receipt.completed_targets} targets, ${assertions} assertions`);
  }
  console.log("receipt: " + path.replace(REPO + "\\", "").replace(REPO + "/", ""));
  process.exit(all.length ? 1 : 0);
}

run().catch((e) => {
  console.error("page-preview could not run: " + e.message);
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
});
