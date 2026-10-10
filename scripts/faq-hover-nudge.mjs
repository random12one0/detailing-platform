// ROADMAP 9.15a — does a stacked FAQ row stay inside its own row when the
// pointer rests on it? (dev server + seed + DEMO_OWNER_PW; `set -a; . ./.env; set +a`)
//
//   node scripts/faq-hover-nudge.mjs            # 320, 392, 1440
//   node scripts/faq-hover-nudge.mjs 320
//
// WHY THIS EXISTS WHEN sweep-widths.mjs ALREADY HAS A past-parent CHECK: the
// sweep caught this once (`+6px button.txt in div.row-item` at 320) only
// because its pointer happened to stop on the first FAQ row. With the fix
// removed on purpose, a full 320 sweep printed `Business · FAQ clean` — its
// catch was luck. This one HOVERS the row, so it asks the question every time.
//
// It measures the row's question button against its row's content box, hovered.
// Exit 1 on anything past by more than 1px, and on finding no row at all — a
// probe that found nothing to hover has measured nothing.
//
// Sabotage, done 2026-10-10: comment out `.rows-stack .row-item:hover > .txt
// { transform: none; }` in theme.css → 320 and 392 print +6px and exit 1.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
import { demoOwner } from "./lib/demoOwner.mjs";

const BASE = process.env.BASE || "http://localhost:5173";
const widths = process.argv.slice(2).map(Number).filter(Boolean);
let bad = 0;
const b = await chromium.launch();
for (const w of widths.length ? widths : [320, 392, 1440]) {
  const page = await b.newPage({ viewport: { width: w, height: 844 } });
  const noise = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) noise.push(m.text()); });
  await page.goto(`${BASE}/app`);
  await page.fill("input[type=email]", "demo@detailplatform.com");  // mail-sink: a dashboard login, never a recipient
  await page.fill("input[type=password]", demoOwner().password);
  await page.click("form button.btn.primary");
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  await page.locator(".tabbar >> text=Business").first().click();
  await page.locator(".nav-row", { hasText: "FAQ" }).first().click();
  const rows = page.locator(".rows-stack .row-item > .txt");
  await rows.first().waitFor({ timeout: 15000 }).catch(() => {});
  const n = await rows.count();
  if (!n) { console.log(`${w}px  NO FAQ ROW FOUND — nothing was measured`); bad++; await page.close(); continue; }
  let worst = -Infinity;
  for (let i = 0; i < n; i++) {
    await rows.nth(i).hover();
    await page.waitForTimeout(400);  // let the 6px transition finish (docs/gotchas.md 119)
    worst = Math.max(worst, await rows.nth(i).evaluate((t) => {
      const row = t.parentElement, cs = getComputedStyle(row);
      return Math.round(t.getBoundingClientRect().right
        - (row.getBoundingClientRect().right - parseFloat(cs.paddingRight)));
    }));
  }
  const over = worst > 1;
  if (over) bad++;
  if (noise.length) bad++;
  console.log(`${w}px  ${n} row(s) hovered, worst ${worst > 0 ? "+" : ""}${worst}px against the row's edge — `
    + `${over ? "PAST ITS ROW" : "inside"}; console ${noise.length ? noise.join(" | ") : "clean"}`);
  await page.close();
}
await b.close();
console.log(bad ? `FAIL — ${bad} problem(s)` : "PASS");
process.exit(bad ? 1 : 0);
