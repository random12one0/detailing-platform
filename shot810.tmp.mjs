// One-off: photograph the split-days WHEN step and the review, at 392, on the
// three-car tenant. The sweep measures the vehicle step; this is the half a
// person has to LOOK at.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("./app/node_modules/playwright/index.js");

const BASE = "http://localhost:5173";
const OUT = "shots-810";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 392, height: 844 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const errors = [];
p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const settle = async (ms = 1200) => { await p.waitForTimeout(ms); };

await p.goto(`${BASE}/book/demo-riverside`, { waitUntil: "domcontentloaded" });
await p.waitForSelector(".bk-card, .bk-note", { timeout: 30000 });
await settle(1800);

const head = () => p.locator(".bk-step-head h2").innerText();
const cont = () => p.getByRole("button", { name: /continue/i }).first().click();

// Step 1 → Vehicle
for (let i = 0; i < 5; i++) {
  if (/vehicle/i.test(await head())) break;
  if (await p.locator(".bk-card.selectable").count()
      && !(await p.locator(".bk-card.selected").count())) {
    await p.locator(".bk-card.selectable").first().click();
    await settle(1800);
  }
  await cont();
  await settle(1400);
}
const chips = () => p.locator(".bk-field", { hasText: "How many vehicles?" }).locator("button");
await chips().nth(1).click();
await settle(1800);
await p.getByRole("button", { name: "Different days" }).click();
await settle(1800);
await p.locator(".bk-field", { hasText: "2nd vehicle" }).locator("input").fill("Ford F-150");
await settle(600);
await p.screenshot({ path: `${OUT}/split-vehicle.png` });

// On to When. Riverside is mobile-only, so the location step wants an address
// and Continue stays disabled until it has one.
for (let i = 0; i < 5; i++) {
  if (/time|when|pick a/i.test(await head())) break;
  const inputs = p.locator(".bk-field input, .bk-field textarea");
  const n = await inputs.count();
  for (let j = 0; j < n; j++) {
    const ph = (await inputs.nth(j).getAttribute("placeholder")) || "";
    if (/address|street|where/i.test(ph)) await inputs.nth(j).fill("18 Maple Row, Riverside");
  }
  const toggles = p.locator(".bk-chip, .bk-card.selectable");
  if (await toggles.count() && !(await p.locator(".bk-card.selected, .bk-chip.selected").count())) {
    await toggles.first().click();
  }
  await settle(900);
  await cont();
  await settle(1800);
}
console.log("on:", await head());
await settle(2200);

// Pick a day and a time for each car.
for (let car = 0; car < 2; car++) {
  const legChips = p.locator(".bk-field", { hasText: "Pick a time for each car" }).locator("button");
  if (await legChips.count()) { await legChips.nth(car).click(); await settle(1400); }
  for (let month = 0; month < 3; month++) {
    const open = p.locator(".bk-cal .cell:not(.closed):not(.empty)");
    const n = await open.count();
    let picked = false;
    for (let i = 0; i < n && !picked; i++) {
      await open.nth(i).click();
      await settle(1400);
      const slots = p.locator(".bk-slots .bk-chip");
      if (await slots.count()) {
        await slots.nth(car).click();
        await settle(900);
        picked = true;
      }
    }
    if (picked) break;
    await p.getByRole("button", { name: "Next month" }).click();
    await settle(1600);
  }
}
await p.screenshot({ path: `${OUT}/split-when.png` });

// And the review.
for (let i = 0; i < 5; i++) {
  const h = await head();
  if (/check|review/i.test(h)) break;
  await p.locator("input[type=email]").first().fill("alex@example.com").catch(() => {});
  await p.locator("input[type=tel]").first().fill("5551234567").catch(() => {});
  const texts = p.locator("input[type=text], input:not([type])");
  const n = await texts.count();
  for (let j = 0; j < n; j++) {
    const v = await texts.nth(j).inputValue().catch(() => "x");
    if (!v) await texts.nth(j).fill("Alex Rivera").catch(() => {});
  }
  await settle(1000);
  const btn = p.getByRole("button", { name: /continue/i }).first();
  if (!(await btn.isEnabled())) { console.log("stuck on:", h); break; }
  await btn.click();
  await settle(1800);
}
console.log("ended on:", await head());
await p.screenshot({ path: `${OUT}/split-review.png` });
console.log(errors.length ? `console errors: ${errors.join(" | ")}` : "console clean");
await b.close();
