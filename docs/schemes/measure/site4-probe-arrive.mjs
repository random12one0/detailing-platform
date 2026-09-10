// The arrival, measured rather than raced.
//
// THE FIRST VERSION OF THIS PROBE WAS THE THING THAT WAS BROKEN, not the
// page: it screenshotted on a wall clock after `goto`, and `goto` itself
// returns hundreds of ms after the animation starts — so every frame showed
// a finished hero and the arrival "wasn't running". Pausing every animation
// and setting `currentTime` gives the exact frame at the exact moment, and
// reading `animationDelay` off the computed style says what the stagger IS
// rather than what it looked like.
import { createRequire } from "node:module"; import { resolve } from "node:path";
const { chromium } = createRequire(resolve("app/package.json"))("playwright");
const URL0 = "file:///D:/Users/rando/Downloads/claude/detailing-platform/docs/tenant-sites/y-kinzie.html";
const b = await chromium.launch();
const say = (ok, m) => { console.log((ok ? "PASS  " : "FAIL  ") + m); if (!ok) process.exitCode = 1; };

const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
await pg.goto(URL0 + "?smooth=0", { waitUntil: "domcontentloaded" });
await pg.evaluate(() => document.fonts.ready);
// the page takes its own mark off when the arrival lands; put it back so the
// animations exist to be measured, and stop them being taken off again
await pg.evaluate(() => { window.setTimeout = () => 0; document.documentElement.classList.add("pre"); });
await pg.waitForTimeout(60);

// A STYLESHEET THAT FAILS TO PARSE STILL RENDERS A PAGE. Count the rules the
// browser actually accepted against the rules in the file: a comment that
// closes early takes the block after it down with no error anywhere.
const css = await pg.evaluate(() => {
  const st = document.querySelector("style");
  let n = 0; try { n = st.sheet.cssRules.length; } catch (e) {}
  return { parsed: n, braces: (st.textContent.match(/@keyframes/g) || []).length };
});
say(css.parsed > 200, `stylesheet: the browser accepted ${css.parsed} rules`);
say(await pg.evaluate(() => {
  const names = [...document.querySelector("style").sheet.cssRules]
    .filter(r => r.type === CSSRule.KEYFRAMES_RULE).map(r => r.name);
  return ["arrive-in", "sheet-in", "shot-in"].every(n => names.includes(n));
}), "stylesheet: all three arrival keyframe blocks parsed");

const spec = await pg.$$eval("[data-in]", n => n.map(e => {
  const c = getComputedStyle(e);
  return { what: e.className || e.tagName, i: e.style.getPropertyValue("--i").trim(),
    name: c.animationName, delay: c.animationDelay, dur: c.animationDuration, fill: c.animationFillMode };
}));
say(spec.every(s => s.name !== "none"), `arrival: ${spec.length} elements carry an animation`);
say(spec.every(s => s.fill === "both"),
  "arrival: fill-mode is `both`, so each one holds still through its delay");
// document order is not beat order: the pill and the sheet sit above the
// hero text in the markup, so compare the SET rather than the sequence
say(spec.map(s => s.delay).sort().join(",") === "0.07s,0.14s,0.21s,0.28s,0.35s,0.42s,0.49s,0.49s",
  "arrival: the stagger is 70ms a beat — " + spec.map(s => s.delay).sort().join(" "));
const sheet = spec.find(s => /sheetobj/.test(s.what));
say(sheet && sheet.name === "sheet-in",
  "arrival: the film sheet gets keyframes that keep its rotation — " + (sheet && sheet.name));
say((await pg.$eval(".hero .shot", e => getComputedStyle(e).animationName)) === "shot-in",
  "arrival: the photograph settles on its own longer curve underneath");

// EXACT FRAMES. Re-arm before every seek: the page removes its own mark the
// moment the last beat lands, and a seek past the end fires that — so a
// second measurement taken afterwards finds no animations at all and reads
// every element at rest. Which is precisely how this probe reported "the
// arrival isn't running" three times about a page that was running it.
async function seek(ms) {
  await pg.evaluate((t) => {
    var d = document.documentElement;
    d.classList.remove("pre");
    void document.body.offsetWidth;          // re-arm
    d.classList.add("pre");
    document.getAnimations().forEach(a => { a.pause(); a.currentTime = t; });
  }, ms);
  await pg.waitForTimeout(40);
}
async function opacities() {
  return pg.evaluate(() => [...document.querySelectorAll("[data-in]")]
    .map(e => ({ i: +e.style.getPropertyValue("--i"), o: +(+getComputedStyle(e).opacity).toFixed(2) }))
    .sort((a, b) => a.i - b.i).map(x => x.o));
}

await seek(200);
const at200 = await opacities();
// beat 1 opens at 70ms and runs 520ms, so at 200ms it is 130ms in, not done;
// beat 5 opens at 350ms and has not started. The dock reads 1 because it is
// display:none above 767px and computed opacity ignores that.
say(at200[0] > 0.5 && at200[0] < 1 && at200[4] === 0,
  `arrival: at 200ms it is mid-stagger — ${at200.join(" ")}`);
await seek(700);
const at700 = await opacities();
say(at700.every(v => v > 0) && at700[6] < 1,
  `arrival: at 700ms every beat has begun and the last is still moving — ${at700.join(" ")}`);
await seek(1100);
say((await opacities()).every(v => v === 1), "arrival: it is over by 1.1s");

for (const t of [0, 200, 400, 600, 900, 1200]) {
  await seek(t);
  await pg.screenshot({ path: `.tmp-site4/arr/t-${String(t).padStart(4, "0")}.png` });
}
await pg.close();

// ── reduced motion never animates at all ────────────────────────────
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const pg3 = await ctx.newPage();
await pg3.goto(URL0, { waitUntil: "domcontentloaded" });
await pg3.waitForTimeout(120);
say(!(await pg3.evaluate(() => document.documentElement.classList.contains("pre"))),
  "arrival: reduced motion never marks the root, so no animation is declared");
say(await pg3.evaluate(() => [...document.querySelectorAll("[data-in]")]
  .every(e => +getComputedStyle(e).opacity === 1)),
  "arrival: reduced motion paints everything immediately");
await b.close();
