// Proves the three moving parts actually move, with real scroll and a real
// pointer: reveals arrive, reveals RE-ARM on the way back up and play again,
// the process rail fills, and a card lights under the cursor.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1280, height: 860 } });
await pg.goto(new URL("../docs/tenant-sites/x-ballantyne.html", import.meta.url).href);
await pg.waitForLoadState("networkidle");
await pg.evaluate(() => document.fonts.ready);

const count = () => pg.evaluate(() => ({
  shown: document.querySelectorAll(".rv-in").length,
  hidden: document.querySelectorAll(".rv-hidden").length,
}));

const atTop = await count();
await pg.mouse.wheel(0, 3000); await pg.waitForTimeout(1200);
const midway = await count();

// scroll past the work cards, then back up above them, then down again:
// the same elements must be hidden in between and shown again after.
await pg.evaluate(() => document.querySelector(".card").scrollIntoView({ block: "center", behavior: "instant" }));
await pg.waitForTimeout(1000);
const firstPass = await pg.evaluate(() => document.querySelector(".card").className);
await pg.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await pg.waitForTimeout(700);
const rearmed = await pg.evaluate(() => document.querySelector(".card").className);
await pg.evaluate(() => document.querySelector(".card").scrollIntoView({ block: "center", behavior: "instant" }));
await pg.waitForTimeout(1000);
const secondPass = await pg.evaluate(() => document.querySelector(".card").className);

// the rail
await pg.evaluate(() => document.getElementById("steps").scrollIntoView({ block: "center", behavior: "instant" }));
await pg.waitForTimeout(600);
const rail = await pg.evaluate(() => ({
  p: getComputedStyle(document.getElementById("steps")).getPropertyValue("--p").trim(),
  lit: document.querySelectorAll(".step.on").length,
}));

// the pointer light, driven by a real mouse move over a real card
await pg.evaluate(() => document.querySelector(".card").scrollIntoView({ block: "center", behavior: "instant" }));
await pg.waitForTimeout(900);
const box = await pg.locator(".card").first().boundingBox();
await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await pg.waitForTimeout(700);
const light = await pg.evaluate(() => {
  const el = document.querySelector(".card");
  return { on: el.classList.contains("on"),
    glow: getComputedStyle(el, "::before").opacity,
    edge: getComputedStyle(el, "::after").opacity,
    mx: el.style.getPropertyValue("--mx") };
});

// the FAQ answer opens over time rather than snapping. MEASURE THE ONE THAT
// WAS CLICKED: querySelector(".q.is-open") returns the question that starts
// open, so the first version of this probe reported a snap that belonged to a
// different element entirely.
await pg.evaluate(() => {
  const t = document.querySelector('[data-panel="day"] .q:not(.is-open)');
  t.id = "probe-q";
  t.scrollIntoView({ block: "center", behavior: "instant" });
});
await pg.waitForTimeout(500);
await pg.locator("#probe-q summary").click();
await pg.waitForTimeout(90);
const mid = await pg.evaluate(() => getComputedStyle(document.querySelector("#probe-q .a")).gridTemplateRows);
await pg.waitForTimeout(800);
const done = await pg.evaluate(() => getComputedStyle(document.querySelector("#probe-q .a")).gridTemplateRows);


// ── the parallax layers, and the SIGN is the whole point ────────────────
const par = await (async () => {
  const pg2 = await b.newPage({ viewport: { width: 1280, height: 860 } });
  await pg2.goto(new URL("../docs/tenant-sites/x-ballantyne.html", import.meta.url).href);
  await pg2.waitForLoadState("networkidle");
  await pg2.evaluate(() => window.scrollTo(0, 200));
  await pg2.waitForTimeout(300);
  const a = await pg2.evaluate(() => ({
    photo: getComputedStyle(document.querySelector(".stage img")).transform,
    strip: getComputedStyle(document.querySelector(".strip")).transform }));
  await pg2.evaluate(() => window.scrollTo(0, 900));
  await pg2.waitForTimeout(400);
  const c = await pg2.evaluate(() => ({
    photo: getComputedStyle(document.querySelector(".stage img")).transform,
    strip: getComputedStyle(document.querySelector(".strip")).transform }));
  const y = (m) => +m.split(",").pop().replace(")", "").trim();
  await pg2.close();
  return { photoMoved: (y(c.photo) - y(a.photo)).toFixed(1),
           stripMoved: (y(c.strip) - y(a.strip)).toFixed(1) };
})();

// ── a tab switch closes every open question ─────────────────────────────
const tabs = await (async () => {
  const pg3 = await b.newPage({ viewport: { width: 1280, height: 860 } });
  await pg3.goto(new URL("../docs/tenant-sites/x-ballantyne.html", import.meta.url).href);
  await pg3.waitForLoadState("networkidle");
  await pg3.evaluate(() => document.querySelector("#faq").scrollIntoView({ block: "start", behavior: "instant" }));
  await pg3.waitForTimeout(400);
  await pg3.locator('[data-panel="day"] .q:not(.is-open) summary').first().click();
  await pg3.waitForTimeout(300);
  const before = await pg3.evaluate(() => document.querySelectorAll(".q.is-open").length);
  await pg3.locator('.tabs [data-tab="work"]').click();
  await pg3.waitForTimeout(300);
  const afterSwitch = await pg3.evaluate(() => document.querySelectorAll(".q.is-open").length);
  await pg3.locator('.tabs [data-tab="day"]').click();
  await pg3.waitForTimeout(300);
  const backAgain = await pg3.evaluate(() => document.querySelectorAll(".q.is-open").length);
  await pg3.close();
  return { openBefore: before, afterSwitch, backAgain };
})();
console.log(JSON.stringify({ par, tabs }, null, 2));

await b.close();
console.log(JSON.stringify({ atTop, midway,
  replay: { firstPass, rearmed, secondPass }, rail, light,
  faqOpening: { at90ms: mid, settled: done } }, null, 2));
