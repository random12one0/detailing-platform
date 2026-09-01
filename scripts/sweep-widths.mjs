// Walk every dashboard screen and the booking page at a narrow width and
// report the two failures the owner's walkthrough was made of.
//
// Written in roadmap 2.6 because that item asks for something no other script
// could do: "a full 392px sweep of every screen is how to find it, or rule it
// out" (W15). Screenshots show what a screen LOOKS like; this says whether
// anything is off the edge, which is the half an eye keeps missing — three of
// six token chips were 66px, 183px and 278px past the right edge of a phone
// and nobody had noticed in three sessions of looking at that screen.
//
// TWO CHECKS, one per complaint he actually made:
//   past-viewport   an element whose right edge is off the screen (W12/W13/
//                   W14/W15 — "cut off to the right")
//   past-parent     an element whose right edge is outside its own PARENT's
//                   content box, even though the screen still contains it.
//                   ADDED IN ROADMAP 2.9, and it is the check that item wished
//                   had existed: the time fields and the segmented control had
//                   been 19px and 11px outside their card at 360 for two
//                   roadmap items, and the card's own 18px of padding swallowed
//                   the difference, so nothing ever crossed the viewport edge
//                   and this script kept saying clean. A CLEAN SWEEP MEANT
//                   NOTHING WAS OFF THE SCREEN, NOT THAT NOTHING WAS OFF ITS
//                   BOX. Baselined against the pre-2.9 commit at 360, where it
//                   reports all four failures and nothing else.
//   self-clipped    an element that scrolls sideways inside itself, which is
//                   the same thing wearing a scrollbar nobody can see
//   touching        two boxes stacked with under 4px between them (W7/W11 —
//                   "the boxes touch"), because a box with no gap under it
//                   reads as part of the box below
//   dead-width      ADDED IN ROADMAP 2.11 STEP 3. At >= 1180px the content
//                   column must be at least MIN_DESK_COL wide. The four checks
//                   above are all "is something outside its box", and at a
//                   desktop width they are trivially satisfied by a narrow
//                   column with empty screen either side: baselined before it
//                   was written, this script reported CLEAN on all 18 screens
//                   at both 1920 and 1440 with a 724px column on a 1920
//                   monitor. Adding the wide widths without this check would
//                   have bought a gate that stays green whether or not the
//                   desktop layout is ever built, which is the mistake at the
//                   top of DECISIONS.md — a check that cannot see the common
//                   failure looks exactly like a check that passes.
//
//   node scripts/sweep-widths.mjs --lite         # the same, through ?lite=1
//   node scripts/sweep-widths.mjs                # 1920, 1440, 392, 360, 320
//   node scripts/sweep-widths.mjs 844            # PHONE LANDSCAPE, 844x390
//   node scripts/sweep-widths.mjs 320            # just the PRODUCT.md floor
//   node scripts/sweep-widths.mjs 392 360 1440   # any list
//
// 320 JOINED THE DEFAULT IN ROADMAP 2.9, the item that made it pass. It was an
// argument you had to remember while it was failing on purpose; PRODUCT.md
// promises 320 -> 1440, so the floor is now swept every time rather than when
// somebody thinks to ask for it.
//
// 1920 AND 1440 JOINED THE DEFAULT IN ROADMAP 2.11 STEP 3, and they carry the
// verification HEIGHTS (1080 and 900) rather than the phone's 844 — a screen
// that fits 900px of laptop is the question, and 844 is not that question.
// docs/dashboard-desktop-spec-2026-08-31.md is what they check against.
//
// EXITS NON-ZERO if it finds anything, so it can gate a change. Needs the dev
// server on :5173 (npm run dev --prefix app) and the seeded demo business,
// same as scripts/shoot-dashboard.mjs — it signs in through the real form.
//
// navigator.share is STUBBED IN on purpose. Chrome on Windows has it and a
// headless browser does not, and that difference is the whole of W14: the
// Share button it adds is what pushed Open off the screen. A sweep that does
// not stub it closes a real bug as "does not reproduce".
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const WIDTHS = (process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number));
// ?lite=1 is the reduced-motion path. It has its own stylesheet rules, so a
// layout that holds in one can fail in the other; sweep-booking-steps.mjs has
// carried this flag since 2.7 and this script needed a scratch copy without it.
const LITE = process.argv.includes("--lite") ? "?lite=1" : "";
const SIZES = WIDTHS.length ? WIDTHS : [1920, 1440, 392, 360, 320];
const BASE = "http://localhost:5173";
// The verification heights, not the phone's. 1080 is his monitor; 900 is the
// laptop and the shortest screen this product is checked against.
//
// 844 IS PHONE LANDSCAPE, AND IT IS THE ONE SIZE THE OWNER ASKED FOR ON
// 2026-08-31 THAT NOTHING HERE MEASURED. His words: "if you shrink a page or
// you'll not full screen it or goes to landscape... it should be able to
// modify and move around and not losing the information." A current iPhone
// (393x852) and Samsung (360x800) are already inside 392/360/320, and the
// laptop is 1440x900 -- landscape was the gap. 844x390 is 390px of HEIGHT,
// SHORTER THAN ANY VIEWPORT THIS PRODUCT HAS EVER BEEN MEASURED AT, which is
// why it belongs to height-hungry things: the day rail, a .sheet pinned to
// 92vh, and the bottom tab bar eating from the same 390px.
//
// DELIBERATELY NOT IN THE DEFAULT LIST YET -- `node scripts/sweep-widths.mjs
// 844` runs it today. It joins SIZES in roadmap 2.11 step 4b, the phone pass,
// which is both the change that BASELINES it (this repo's rule: baseline a new
// check against the last known-good version) and the change that has to
// satisfy it. Adding it to the default now would hand the next session a red
// gate with no baseline, against a phone layout that is about to be redrawn.
const heightFor = (w) => (w === 844 ? 390 : w >= 1900 ? 1080 : w >= 1024 ? 900 : 844);

// --- dead-width, and the one line that arms it -----------------------------
// FLIP THIS TO `true` IN ROADMAP 2.11 STEP 6, in the same change that ships the
// desktop layout. While it is false the measurement is PRINTED every run and
// does not count toward the exit code, so the failure is visible today without
// leaving a standing gate red before the layout it gates has been built. Once
// true, a regression back to a narrow column fails the sweep.
// docs/dashboard-desktop-spec-2026-08-31.md §6b and §10.
const DESKTOP_SPEC_BUILT = false;
const BP_SPLIT = 1180;   // --wrap; where the desktop spec's second column engages
const MIN_DESK_COL = 1000; // the spec requires 1180; 1000 is the floor that says "a desktop layout exists"
const MORE = ["Business info", "Your colour", "Services & add-ons", "Promo codes & sale",
  "Photo gallery", "Hours & days off", "Booking rules", "Notifications",
  "Message templates", "Team", "Maps, calendar & contacts"];

// Runs in the page. Boxes are the things with an edge — two of those touching
// is the defect; two paragraphs touching is just text.
const CHECK = () => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  const boxy = (el) => el.matches(".card, .sunken, .dashed, .setting-card, .bk-card");
  const name = (el) => el.tagName.toLowerCase()
    + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "");
  for (const el of document.querySelectorAll("body *")) {
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const txt = (el.textContent || "").trim().slice(0, 26);
    const past = Math.round(r.right - vw);
    if (past > 1) out.push(`past-viewport  +${past}px  ${name(el)}  «${txt}»`);
    // Outside its own parent's content box. Skipped where the answer would be
    // a lie rather than a defect: a parent that scrolls sideways on purpose, a
    // parent with no box at all (`display: contents` — .bk-step is one, and it
    // was this check's only false positive), and anything positioned out of
    // flow, which is meant to leave its parent.
    const par = el.parentElement;
    if (par && par !== document.body) {
      const pr = par.getBoundingClientRect();
      const pcs = getComputedStyle(par);
      const inner = pr.right - parseFloat(pcs.paddingRight) - parseFloat(pcs.borderRightWidth);
      const overP = Math.round(r.right - inner);
      if (overP > 1 && pr.width > 0 && !/auto|scroll/.test(pcs.overflowX)
          && pcs.position === "static" && cs.position === "static") {
        out.push(`past-parent    +${overP}px  ${name(el)} in ${name(par)}  «${txt}»`);
      }
    }
    // An ellipsis is a DESIGNED truncation — it says out loud that there is
    // more, and .nav-row .now is built that way on purpose. A scroller with
    // `scrollbar-width: none` says nothing, which is the actual defect.
    else if (el.scrollWidth - el.clientWidth > 1
             && /auto|scroll|hidden/.test(cs.overflowX)
             && cs.textOverflow !== "ellipsis") {
      out.push(`self-clipped   +${el.scrollWidth - el.clientWidth}px  ${name(el)}  «${txt}»`);
    }
    if (!boxy(el)) continue;
    const n = el.nextElementSibling;
    if (!n || !n.getClientRects().length || !boxy(n)) continue;
    const gap = Math.round(n.getBoundingClientRect().top - r.bottom);
    if (gap >= 0 && gap < 4) out.push(`touching       ${gap}px gap  ${name(el)} → ${name(n)}  «${txt}»`);
  }
  return [...new Set(out)];
};

const browser = await chromium.launch();
let found = 0;
let narrow = 0;   // desktop widths whose content column is still phone-sized

for (const w of SIZES) {
  console.log(`\n══ ${w}px ══════════════════════════════════════════`);
  const ctx = await browser.newContext({ viewport: { width: w, height: heightFor(w) }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: () => Promise.resolve(), configurable: true });
  });
  const page = await ctx.newPage();
  const say = async (label) => {
    const rows = await page.evaluate(CHECK);
    found += rows.length;
    console.log(`${label.padEnd(24)} ${rows.length ? "\n  " + rows.join("\n  ") : "clean"}`);
  };
  // The sheet opens at a 56vh peek. Pull it to full so the rest of the screen
  // is laid out and measurable, not just the part currently on screen.
  const grow = async () => {
    await page.evaluate(() => { const s = document.querySelector(".sheet"); if (s) s.style.height = "92vh"; });
    await page.waitForTimeout(400);
  };

  await page.goto(`${BASE}/book/demo-detail${LITE}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3200);
  await say("book · step 1");

  await page.goto(`${BASE}/app${LITE}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", "demo@detailplatform.com");
    // Must match scripts/seed-demo.mjs, same as shoot-dashboard.mjs.
    await page.fill("input[type=password]", "demo123");
    await page.click("form button.btn.primary");
  }
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  await page.waitForTimeout(2200);

  // Once per width, not once per screen — every dashboard screen is inside the
  // same container, so eighteen copies of one fact would only be noise.
  if (w >= BP_SPLIT) {
    const col = await page.evaluate(() => {
      const m = document.querySelector(".app-main");
      if (!m) return null;
      const cs = getComputedStyle(m);
      return Math.round(m.getBoundingClientRect().width
        - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    });
    if (col !== null && col < MIN_DESK_COL) {
      const line = `dead-width     ${MIN_DESK_COL - col}px short  .app-main content is ${col}px in a ${w}px viewport`;
      narrow++;
      if (DESKTOP_SPEC_BUILT) { found++; console.log(`  ${line}`); }
      else console.log(`  ${line}  (not gating until DESKTOP_SPEC_BUILT)`);
    }
  }

  for (const t of ["Today", "Calendar", "Money", "Clients", "More"]) {
    await page.getByRole("button", { name: t, exact: true }).first().click();
    await page.waitForTimeout(1700);
    await say(t);
  }

  // The client sheet is its own screen and it is where W7/W8 lived.
  await page.getByRole("button", { name: "Clients", exact: true }).first().click();
  await page.waitForTimeout(1400);
  const client = page.locator(".row-item").first();
  if (await client.count()) {
    await client.click();
    await page.waitForTimeout(1500);
    await grow();
    await say("Clients · one client");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
  }

  await page.getByRole("button", { name: "More", exact: true }).first().click();
  await page.waitForTimeout(1400);
  for (const key of MORE) {
    const row = page.locator(".nav-row", { hasText: key });
    if (!(await row.count())) { console.log(`${key.padEnd(24)} NO SUCH ROW`); found++; continue; }
    await row.first().click();
    await page.waitForTimeout(1600);
    await grow();
    await say(key);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
  }
  await ctx.close();
}

await browser.close();
console.log(found
  ? `\n${found} problem${found === 1 ? "" : "s"} — see above`
  : `\nclean at ${SIZES.join(", ")}${LITE ? " (?lite=1)" : ""}: nothing off the screen, nothing outside its own box, no boxes touching`);
// A "clean" that silently swallowed a dead-width reads as proof the desktop
// layout is fine. It is not proof of anything until DESKTOP_SPEC_BUILT.
if (narrow && !DESKTOP_SPEC_BUILT) {
  console.log(`  ...but the content column is still narrow at ${narrow} desktop width${narrow === 1 ? "" : "s"}`
    + ` — see dead-width above. That is roadmap 2.11's desktop layout, not yet built.`);
}
process.exit(found ? 1 : 0);
