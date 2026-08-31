// Walk the CUSTOMER manage page — /booking/:id — in a real browser and save
// full-page screenshots at the four widths the design system names.
//
// Written in roadmap 2.4. `shoot-dashboard.mjs` signs in and walks the owner's
// side; nothing reached the page the CUSTOMER lands on from the confirmation
// email, which is the page 2.4's last item is about. Its states are branches
// on data (confirmed / window closed / cancelled / past / mid-reschedule), so
// they cannot be reached by clicking around one booking — each one needs its
// own id, which is why this takes a list.
//
// Needs: the dev server on :5173 (npm run dev --prefix app).
//
//   node scripts/shoot-manage.mjs <id>                 # one booking, 4 widths
//   node scripts/shoot-manage.mjs <id> --lite          # the .lite path
//   node scripts/shoot-manage.mjs <id> --reschedule    # press "Change the time"
//   node scripts/shoot-manage.mjs <id> --confirm       # press "Cancel this…"
//
// OUT=<dir> chooses where the PNGs go (default ./shots). TAG=<name> labels the
// files. Prints every console error and warning seen at any width.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
import { mkdirSync } from "node:fs";

const OUT = process.env.OUT || "shots";
const TAG = process.env.TAG || "manage";
const BASE = "http://localhost:5173";
const LITE = process.argv.includes("--lite");
const RESCHEDULE = process.argv.includes("--reschedule");
const CONFIRM = process.argv.includes("--confirm");
const id = process.argv[2];
if (!id || id.startsWith("--")) {
  console.error("usage: node scripts/shoot-manage.mjs <booking-uuid> [--lite] [--reschedule] [--confirm]");
  process.exit(2);
}

const WIDTHS = [[1920, 1080], [1440, 900], [768, 1024], [392, 844]];
const suffix = `${RESCHEDULE ? "-reschedule" : ""}${CONFIRM ? "-confirm" : ""}${LITE ? "-lite" : ""}`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const problems = [];

for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(`${w} ${m.type()}: ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => problems.push(`${w} pageerror: ${e.message}`));

  await page.goto(`${BASE}/booking/${id}${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
  // The page fetches the receipt and THEN the public profile, so waiting for
  // the card alone can catch it before the accent is injected.
  await page.waitForSelector(".bk-card, .bk-center h1", { timeout: 25000 });
  await page.waitForTimeout(1600);

  if (RESCHEDULE) {
    await page.getByRole("button", { name: /Change the time/ }).first().click();
    await page.waitForTimeout(2200);
  }
  if (CONFIRM) {
    await page.getByRole("button", { name: /Cancel this booking/ }).first().click();
    await page.waitForTimeout(900);
  }

  // Park the pointer off every control before shooting. A click leaves the
  // mouse where it landed, and the panel that replaces the row can put a
  // DIFFERENT button under it — which is how "Keep my booking" got shot in
  // its hover colour and read as a defect for a while. It is muted, not bone.
  await page.mouse.move(2, 2);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${w}-${TAG}${suffix}.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "console clean at every width");
