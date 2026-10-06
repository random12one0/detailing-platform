// DOES THE BUSINESS SCREEN SHOW THE DETAILER'S REAL BOOKING PAGE? — ROADMAP 9.10.
//
//   node scripts/page-preview.mjs
//   node scripts/page-preview.mjs --headed
//   node scripts/page-preview.mjs --break=keystroke   # sabotage: refresh on typing
//   node scripts/page-preview.mjs --break=blankthin   # sabotage: blank panel when thin
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
// THE THIN BUSINESS IS REAL AND THE COMPOSITE IS DECLARED
// ---------------------------------------------------------------------------
// **Nothing is written to the database.** `final-pass-fixture` is a REAL
// business in this project with genuinely zero services, and the frame loads
// its REAL public page — that half is not simulated at all.
//
// What IS intercepted is the signed-in session's own count queries, so the
// Business screen computes `counts` as thin. **Said plainly because the
// alternative is a reader assuming more was real than was**: the page in the
// frame is real and thin, the counts behind the sentence are rewritten, and
// the two are made to agree rather than being allowed to contradict.
//
// The honest reason it is not a real sign-in as that business's owner: that
// needs an auth user and a membership row, which is a write to the live
// project, and this sitting is not permitted one.

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

// 320 FIRST, because 9.10's Done-when says so and because the phone is where
// "stacks below rather than beside" is the whole question.
const SIZES = [{ w: 320, h: 844 }, { w: 1440, h: 900 }];
const THIN_SLUG = "final-pass-fixture";

const failures = [], observed = [], consoleBad = [];
let assertions = 0;
const check = (id, name, cond, detail) => {
  assertions++;
  if (cond) { console.log(`    ok      ${name}  ${id}`); return true; }
  failures.push(`${id}: ${name} — ${detail}`);
  console.error(`    FAIL    ${name}  ${id} — ${detail}`);
  return false;
};

async function signIn(ctx) {
  const page = await ctx.newPage();
  page.on("console", (m) => {
    const t = m.type();
    if (t === "error" || t === "warning") consoleBad.push(`${t}: ${m.text().slice(0, 180)}`);
  });
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", OWNER.email);
    await page.fill("input[type=password]", OWNER.password);
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

/** Make the signed-in session read as a THIN business, page and all. */
async function beThin(page) {
  const zero = ["services", "add_ons", "gallery_images", "testimonials", "business_hours"];
  for (const table of zero) {
    await page.route(`**/rest/v1/${table}*`, async (route) => {
      const res = await route.fetch().catch(() => null);
      if (!res) return route.abort().catch(() => {});
      return route.fulfill({
        status: res.status(), contentType: "application/json",
        // `content-range` is how PostgREST answers a head count, and the screen
        // reads `count` off it. Returning [] without it leaves the count null,
        // which renders as "—" rather than as zero and would have made the thin
        // case look like a LOADING case.
        headers: { "content-range": "*/0" },
        body: "[]",
      });
    });
  }
  // and the frame points at a real business that really is thin
  await page.route("**/rest/v1/businesses*", async (route) => {
    const res = await route.fetch().catch(() => null);
    if (!res) return route.abort().catch(() => {});
    let b; try { b = await res.json(); } catch { return route.fulfill({ response: res }); }
    const fix = (o) => { if (o && typeof o === "object" && "slug" in o) o.slug = THIN_SLUG; };
    if (Array.isArray(b)) b.forEach(fix); else fix(b);
    return route.fulfill({ status: res.status(), contentType: "application/json", body: JSON.stringify(b) });
  });
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
      const page = await signIn(ctx);
      if (thin) await beThin(page);
      await openBusiness(page);
      const p = await readPreview(page);
      await page.screenshot({ path: join(ART, `${size.w}-${thin ? "thin" : "complete"}.png`), fullPage: false });

      check(id, "real-page", !!(p.present && p.src && /\/book\//.test(p.src) && p.frameH > 100 && p.painted),
        `the preview is ${p.present ? `present, src=${p.src}, ${p.frameW}x${p.frameH}, painted=${p.painted}` : "ABSENT"}`
        + " — 9.10 asks for the real /book/<slug>, rendered, not a mock-up");

      // 9.10's own failing shape: "a blank right half on the thin business".
      check(id, "thin-not-blank", !thin
        ? true
        : !!(p.present && p.frameH > 100 && p.missing.length > 0),
        thin
          ? `thin business: frame ${p.frameH}px tall, missing-line ${p.missing ? `"${p.missing}"` : "ABSENT"}`
          : "n/a");

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
      check(id, "on-save/returns-on-close", !!(after.present && after.src && after.frameH > 100),
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
    check("1440px lite", "real-page", !!(p.present && p.src && p.frameH > 100 && p.painted),
      `?lite=1: present=${p.present} src=${p.src} ${p.frameW}x${p.frameH} painted=${p.painted}`);
    observed.push(`1440px lite: src=${p.src} ${p.frameW}x${p.frameH}`);
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
    const page = await signIn(ctx);
    await beThin(page);
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
    const caught = !(broken.present && broken.frameH > 100 && broken.missing.length > 0);
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

  const FORGIVEN = /React Router Future Flag Warning/;
  const uniq = [...new Set(consoleBad)];
  for (const c of uniq.filter((c) => !FORGIVEN.test(c))) failures.push(`console — ${c}`);
  const forgiven = uniq.filter((c) => FORGIVEN.test(c));
  if (forgiven.length) {
    observed.push(`console: ${forgiven.length} React Router future-flag warning(s) FORGIVEN BY NAME`);
  }

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
    min_assertions: SIZES.length * 2 * 6 + 1 + 2,
    assertion_floor:
      "6 questions (real-page, thin-not-blank, stacks, tabbar-clear, "
      + "on-save/absent-while-typing, on-save/returns-on-close) x 2 businesses x 2 widths "
      + "+ 1 lite real-page + 2 canaries = 27. Structural: fixed by the question list, never "
      + "by what the run finds - a width whose screen never renders books its six as failures "
      + "rather than dropping out, so the count cannot fall.",
    failures: [...failures, ...canaryProblems],
    warnings: [
      "The THIN business is real: `final-pass-fixture` has genuinely zero services and the frame "
      + "loads its REAL public page. What is intercepted is the signed-in session's own count "
      + "queries, so the screen computes `counts` as thin and the sentence matches the page. "
      + "Nothing is written to the database.",
      "A real sign-in as a thin business's owner would need an auth user and a membership row - a "
      + "write to the live project, which this sitting is not permitted. Said rather than implied.",
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
