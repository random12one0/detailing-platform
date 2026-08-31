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
//   self-clipped    an element that scrolls sideways inside itself, which is
//                   the same thing wearing a scrollbar nobody can see
//   touching        two boxes stacked with under 4px between them (W7/W11 —
//                   "the boxes touch"), because a box with no gap under it
//                   reads as part of the box below
//
//   node scripts/sweep-widths.mjs                # 392, 360 and 320
//   node scripts/sweep-widths.mjs 320            # just the PRODUCT.md floor
//   node scripts/sweep-widths.mjs 392 360 1440   # any list
//
// 320 JOINED THE DEFAULT IN ROADMAP 2.9, the item that made it pass. It was an
// argument you had to remember while it was failing on purpose; PRODUCT.md
// promises 320 -> 1440, so the floor is now swept every time rather than when
// somebody thinks to ask for it.
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
const SIZES = WIDTHS.length ? WIDTHS : [392, 360, 320];
const BASE = "http://localhost:5173";
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

for (const w of SIZES) {
  console.log(`\n══ ${w}px ══════════════════════════════════════════`);
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 1 });
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

  await page.goto(`${BASE}/book/demo-detail`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3200);
  await say("book · step 1");

  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", "demo@detailplatform.com");
    // Must match scripts/seed-demo.mjs, same as shoot-dashboard.mjs.
    await page.fill("input[type=password]", "demo123");
    await page.click("form button.btn.primary");
  }
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  await page.waitForTimeout(2200);

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
  : `\nclean at ${SIZES.join(", ")}: nothing off the edge, no boxes touching`);
process.exit(found ? 1 : 0);
