// Walk every booking step and say, for each one, how far past the bottom
// of the screen it runs.
//
// W16 is the organising rule of roadmap 2.7 and it is the owner's own words:
// "a good general rule is that everything should be able to fit without
// having to scroll anywhere. Each step, you shouldn't have to scroll down or
// up." He said it about step 1, step 2, the time picker, the review step, and
// then again about desktop (W23, W26).
//
// A rule with no instrument is a preference. `sweep-widths.mjs` answers "is
// anything off the RIGHT edge"; nothing answered "is anything off the
// BOTTOM", which is a different question with a different fix — the right
// edge is one element too wide, the bottom edge is the whole step's budget.
//
// WHAT IT MEASURES. Per step, per width:
//   over    document scrollHeight minus viewport height. 0 means it fits.
//   spent   the same number as a percentage of the viewport, so a 40px
//           overflow at 844 and at 1080 are not read as the same problem.
//   biggest the three tallest blocks inside .bk-wrap, because when a step
//           does not fit, the answer is always "which of these is too tall"
//           and reading it off a screenshot is guesswork.
//
// It fills the form as a real customer would — picks a service, a size, an
// address, a day and a time — because an empty step 4 has no slot grid on it
// and an empty step 6 has no receipt, and those are two of the four screens
// he named.
//
//   node scripts/sweep-booking-steps.mjs              # the four verification sizes
//   node scripts/sweep-booking-steps.mjs 1440x900     # any list of WxH
//   node scripts/sweep-booking-steps.mjs --shots=shots-2.7   # and save PNGs
//   node scripts/sweep-booking-steps.mjs --lite              # the ?lite=1 path
//
// EXITS NON-ZERO while any step overflows, so it is the definition of done
// for W16. Needs the dev server on :5173 and the seeded demo business, like
// sweep-widths.mjs — but no login, because this page is public.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const args = process.argv.slice(2).filter((a) => /^\d+x\d+$/.test(a));
// The four verification sizes from CLAUDE.md § Design, and all four earned
// their place here: 1440x900 was the ONLY one that failed after the phone and
// the 1920 monitor were both clean, because it is the short screen — 180px
// less height than 1920 with the same desktop masthead on it.
const SIZES = (args.length ? args : ["1920x1080", "1440x900", "768x1024", "392x844"]).map((s) => {
  const [width, height] = s.split("x").map(Number);
  return { width, height };
});
const BASE = "http://localhost:5173";
const SLUG = "demo-detail";
const SHOTS = process.argv.find((a) => a.startsWith("--shots="))?.slice(8) ?? "";
// CLAUDE.md § Design: every width is checked in the normal path AND ?lite=1.
const LITE = process.argv.includes("--lite");

// Runs in the page. `.bk-wrap` is the column; its children are the blocks a
// step is made of, so naming the tallest three names the thing to fix.
const MEASURE = () => {
  const vh = window.innerHeight;
  // NOT scrollHeight. `.bk` carries `min-height: 100dvh`, so the document is
  // never shorter than the screen and a step with room to spare reports
  // exactly 0 — which reads as "only just fits" and hides the headroom this
  // script exists to report. The page is a masthead, a column and a fixed
  // bar, and the column already reserves the bar's height in its own bottom
  // padding, so what a step actually needs is the first two added up.
  const h = (sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().height : 0;
  };
  const over = Math.round(h(".bk-header") + h(".bk-wrap") - vh);
  const wrap = document.querySelector(".bk-wrap");
  const blocks = [...(wrap ? wrap.children : [])]
    .flatMap((el) => (getComputedStyle(el).display === "contents" ? [...el.children] : [el]))
    .map((el) => ({
      h: Math.round(el.getBoundingClientRect().height),
      name: el.tagName.toLowerCase()
        + (typeof el.className === "string" && el.className
          ? "." + el.className.trim().split(/\s+/).join(".") : ""),
      txt: (el.textContent || "").trim().slice(0, 22),
    }))
    .filter((b) => b.h > 0)
    .sort((a, b) => b.h - a.h)
    .slice(0, 3);
  return { over, vh, blocks };
};

// --- SETTLE, NOT SLEEP ------------------------------------------------------
// The same change `sweep-widths.mjs` and `shoot-dashboard.mjs` got on
// 2026-09-02: the fixed number becomes a CAP, and the wait ends when the DOM
// has been quiet for 130ms with no FINITE animation running and no `.spinner`
// on the page. A step measured before it finished animating in reports the
// wrong bottom edge, which is the one number this script exists for — so this
// is "wait for the thing", not "wait less".
const settle = (page, cap = 2000) => page.evaluate(async (cap) => {
  const t0 = performance.now();
  const QUIET = 130;
  let last = performance.now();
  const obs = new MutationObserver(() => { last = performance.now(); });
  obs.observe(document.documentElement, {
    subtree: true, childList: true, attributes: true, characterData: true,
  });
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  try {
    for (;;) {
      await frame();
      const now = performance.now();
      if (now - t0 >= cap) return Math.round(now - t0);
      if (document.querySelector(".spinner")) { last = now; continue; }
      const busy = document.getAnimations().some((a) => {
        if (a.playState !== "running") return false;
        const t = a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming();
        return !t || t.iterations !== Infinity;
      });
      if (!busy && now - last >= QUIET) return Math.round(now - t0);
    }
  } finally { obs.disconnect(); }
}, cap);

const browser = await chromium.launch();
let failing = 0;

for (const size of SIZES) {
  console.log(`\n══ ${size.width}x${size.height} ═══════════════════════════════════`);
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(`${BASE}/book/${SLUG}${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bk-card, .bk-note", { timeout: 30000 });
  // The staggered rise runs 950ms with delays to 300ms; measuring inside it
  // measures a transform, which design-system law 12 forbids.
  await settle(page, 1600);

  const say = async (label) => {
    if (SHOTS) {
      const file = `${SHOTS}/${size.width}x${size.height}${LITE ? "-lite" : ""}-${label.replace(/[^a-z0-9]+/gi, "-")}.png`;
      await page.screenshot({ path: file });
    }
    const { over, vh, blocks } = await page.evaluate(MEASURE);
    const bad = over > 1;
    if (bad) failing++;
    const pct = Math.round((over / vh) * 100);
    console.log(
      // The spare room is reported on purpose. "Fits" is only true of the
      // business that was measured, and a detailer with two more services
      // than the demo has is a different page — the headroom is what says
      // how much more this layout can take before W16 breaks again.
      `${label.padEnd(22)} ${bad ? `over ${String(over).padStart(4)}px (${pct}% of the screen)` : `fits, ${-over}px spare`}`
      + (bad ? "\n  tallest: " + blocks.map((b) => `${b.h}px ${b.name} «${b.txt}»`).join("\n           ") : ""),
    );
  };

  // Driven by the step's own heading, not by a hardcoded list: roadmap 2.7
  // made the flow BUILT rather than fixed (W19 gives add-ons their own step,
  // and only where a business has any), so a script that assumes six steps
  // silently measures the wrong screen.
  const heading = () => page.locator(".bk-step-head h2").innerText();
  // innerText, so text-transform has already made it "STEP 1 OF 7".
  const total = Number((await page.locator(".bk-step-head .bk-step-label").innerText()).match(/of (\d+)/i)[1]);

  for (let n = 1; n <= total; n++) {
    const h = await heading();
    await say(`${n}/${total} ${h.slice(0, 17)}`);

    if (n === total) break;                       // Review — nothing to fill.
    // Each step is advanced by whatever it actually asks for. Anything with
    // no requirement (extras, a settings-driven location) just continues.
    if (await page.locator(".bk-card.selectable").count()
        && !(await page.locator(".bk-card.selected").count())) {
      await page.locator(".bk-card.selectable").first().click();
      await settle(page, 1800);            // the server quote
    }
    if (await page.locator(".bk-cal").count()) {
      // On the last day of a month the whole grid is closed, and an open cell
      // is not proof of a free slot, so walk both.
      let picked = false;
      for (let month = 0; month < 3 && !picked; month++) {
        if (month) {
          await page.getByRole("button", { name: "Next month" }).click();
          await settle(page, 1500);
        }
        const days = page.locator(".bk-cal .cell:not(.closed):not(.empty)");
        for (let i = 0; i < (await days.count()); i++) {
          await days.nth(i).click();
          await settle(page, 900);
          if (await page.locator(".bk-chip").count()) { picked = true; break; }
        }
      }
      await say(`${n}/${total} ${h.slice(0, 12)} + slots`);
      await page.locator(".bk-chip").first().click();
      await settle(page, 400);
    }
    for (const [sel, value] of [
      ['.bk-field input[type=tel]', "5551234567"],
      ['.bk-field input[type=email]', "casey@example.com"],
    ]) {
      if (await page.locator(sel).count()) await page.locator(sel).fill(value);
    }
    // The first plain text field on a step: an address on Location, a name on
    // Details. Both are the only required text on their step.
    const text = page.locator(".bk-field input:not([type=tel]):not([type=email])").first();
    if (await text.count() && !(await text.inputValue())) {
      await text.fill(/reach you/i.test(h) ? "Casey Rivera" : "140 Market Street, Springfield");
    }
    await settle(page, 400);
    await page.locator(".bk-bar button.bk-btn.primary").click();
    await settle(page, 1500);
  }

  if (errors.length) { failing++; console.log(`  console: ${errors.length} error(s)\n  ${errors.join("\n  ")}`); }
  await ctx.close();
}

await browser.close();
console.log(failing
  ? `\n${failing} step${failing === 1 ? "" : "s"} do not fit — W16 is not met`
  : `\nevery step fits at ${SIZES.map((s) => `${s.width}x${s.height}`).join(", ")}`);
process.exit(failing ? 1 : 0);
