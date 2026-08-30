import { chromium } from "playwright";
const OUT = "D:/Users/rando/Downloads/claude/detailing-platform/screenshots";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:392,height:844}, isMobile:true, hasTouch:true });
const p = await ctx.newPage();
await p.goto("http://127.0.0.1:8899/docs/design-directions/5-the-thread.html", { waitUntil:"networkidle" });
await p.waitForTimeout(1400);
const top = await p.evaluate(() => window.scrollY + document.getElementById("threadWrap").getBoundingClientRect().top);
const hgt = await p.evaluate(() => document.getElementById("threadWrap").getBoundingClientRect().height);
console.log("thread block height on a phone:", Math.round(hgt), "px =", (hgt/844).toFixed(2), "screens");
for (let i=0;i<=6;i++) {
  const y = Math.round(top - 300 + (hgt + 300) * (i/6));
  await p.evaluate(yy => window.scrollTo(0,yy), y);
  await p.waitForTimeout(500);
  await p.screenshot({ path:`${OUT}/v20-thread392-${i}.png` });
}
// how far apart are the bubbles and their rows on a phone?
const geo = await p.evaluate(() => {
  const b0 = document.querySelectorAll(".bub")[0].getBoundingClientRect();
  const r0 = document.querySelectorAll(".job")[0].getBoundingClientRect();
  const th = document.querySelector(".thread").getBoundingClientRect();
  const da = document.querySelector(".dash").getBoundingClientRect();
  return { flightY: Math.round(r0.top - b0.top), threadBottom: Math.round(th.bottom), dashTop: Math.round(da.top),
           dx: document.querySelectorAll(".bub")[0].style.getPropertyValue("--dx"),
           dy: document.querySelectorAll(".bub")[0].style.getPropertyValue("--dy") };
});
console.log("first bubble -> its row:", JSON.stringify(geo));
await b.close();
