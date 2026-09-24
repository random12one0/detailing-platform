// WALKING THE PUBLIC BOOKING PAGE, ONCE, FOR EVERY CHECK THAT NEEDS TO.
//
// Extracted 2026-09-22 from `surcharge-visible.mjs` when `discount-label.mjs`
// needed the same walk to reach a different step. **Two money checks with two
// copies of the same walk is how two money checks start disagreeing about what
// the page does** — the same argument `_shared/pricing.ts` makes about the
// quote and the charge, one level out.
//
// Nothing here asserts anything. It gets a browser to a state and reports what
// is on the screen; the checks that import it decide what is true.

/**
 * SETTLE, NOT SLEEP. The fixed number is a CAP and the wait ends when the DOM
 * has been quiet for 130ms with no FINITE animation running.
 *
 * `.bk-step > *` carries `bk-rise` for 950ms (`booking.css` --bk-t-reveal), so
 * a screenshot taken on a timer catches the reveal mid-flight and measures a
 * box that is still moving.
 */
export const settle = (page, cap = 2200) => page.evaluate(async (cap) => {
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
      if (document.querySelector(".bk-spinner, .spinner")) { last = now; continue; }
      const busy = document.getAnimations().some((a) => {
        if (a.playState !== "running") return false;
        const t = a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming();
        return !t || t.iterations !== Infinity;
      });
      if (!busy && now - last >= QUIET) return Math.round(now - t0);
    }
  } finally { obs.disconnect(); }
}, cap);

/** "STEP 3 OF 7" → { n: 3, of: 7 }. The step's own label, so a re-cut flow cannot fool it. */
export const stepNow = (page) => page.evaluate(() => {
  const el = document.querySelector(".bk-step-head .bk-step-label");
  const m = el && el.innerText.match(/(\d+)\s*\D+\s*(\d+)/);
  return m ? { n: Number(m[1]), of: Number(m[2]) } : null;
});

/** The figure in the fixed bar, in whole cents, or null if there isn't one. */
export const barMoney = (page) => page.evaluate(() => {
  const bar = document.querySelector(".bk-bar");
  if (!bar) return null;
  const m = bar.innerText.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  return m ? Math.round(parseFloat(m[1].replace(/,/g, "")) * 100) : null;
});

/**
 * COUNT THE QUOTES THE PAGE ASKS FOR, so `quoted()` can wait for an ANSWER
 * rather than for a while. Call once per page.
 */
export function countQuotes(page) {
  page.__quotes = { inflight: 0, done: 0 };
  const isQuote = (r) => /calculate-booking/.test(r.url());
  page.on("request", (r) => { if (isQuote(r)) page.__quotes.inflight++; });
  page.on("requestfinished", (r) => {
    if (isQuote(r)) { page.__quotes.inflight--; page.__quotes.done++; }
  });
  page.on("requestfailed", (r) => { if (isQuote(r)) page.__quotes.inflight--; });
}

/**
 * Do something that moves the price, and do not come back until the SERVER has
 * answered.
 *
 * **THIS IS THE FIX FOR A REAL FLAKE, AND IT IS WORTH THE PARAGRAPH BECAUSE
 * THE FLAKE LOOKED LIKE A PRODUCT FAULT.** `settle()` ends when the DOM has
 * been quiet for 130ms. A quote is a remote call, and between the click and
 * the response the DOM is perfectly quiet — so settle returned, the run read a
 * quote that had not arrived, and reported "no surcharge line was rendered at
 * all". **A check racing the network reports a product defect rather than a
 * timing bug**, which is the most expensive shape a bad check can have.
 *
 * **AND THE FIRST REPAIR WAS STILL A RACE.** `Promise.race([answer, wait])`
 * reads like a wait and behaves like a deadline: a slow quote loses and the
 * run carries on with the stale number. It failed once in fifteen targets,
 * which is exactly the frequency that gets written off as flaky and re-run.
 * So this counts requests instead of waiting a while.
 */
export async function quoted(page, act, cap = 2200) {
  const q = page.__quotes;
  const before = q.done;
  await act();
  const t0 = Date.now();
  for (;;) {
    await page.waitForTimeout(120);
    if (Date.now() - t0 > 15000) break;             // a quote that never landed
    if (q.inflight > 0) continue;                   // still out there
    if (q.done > before) break;                     // answered
    if (Date.now() - t0 > 1500) break;              // this click sends no quote
  }
  await settle(page, cap);
}

/**
 * Advance one step by whatever it actually asks for.
 *
 * NOTHING HERE IS COUPLED TO A LABEL OR TO A POSITION, and that is deliberate
 * twice over. `label-guard.mjs` exists because 45 controls in this repo are
 * addressed by the WORDS on them, so a rename blinds a check while every line
 * still reads normally; and CLAUDE.md's calendar lesson is to address a node,
 * never an index. So: press Continue, and if the step did not move, select the
 * next unselected card and press again. On the location step that walks mobile
 * (which wants an address) and lands on drop-off — WITHOUT naming either, and
 * without spending a Geoapify credit geocoding an address the run invented.
 *
 * **`force` BECAUSE THE BUTTON IS `aria-disabled`, NOT `disabled`, AND THE
 * DIFFERENCE IS THE WHOLE OF ROADMAP 2.6.** A disabled button cannot be
 * pressed, so it cannot be asked why; this one is pressable and answers
 * instead. Playwright's actionability check reads `aria-disabled` as "not
 * enabled" and waits thirty seconds for a state that will never arrive, so
 * obeying it would model a customer who CANNOT press Continue.
 */
export async function advance(page, from) {
  const cards = page.locator(".bk-card.selectable");
  const n = await cards.count();
  for (let attempt = 0; attempt <= n; attempt++) {
    if (attempt > 0) await quoted(page, () => cards.nth(attempt - 1).click());
    await page.locator(".bk-bar button.bk-btn.primary").click({ force: true });
    await settle(page, 2200);
    const at = await stepNow(page);
    if (at && at.n > from) return at;
  }
  return null;
}

/** Walk from step 1 to whichever step draws the calendar. */
export async function toCalendar(page) {
  let at = await stepNow(page);
  if (!at) throw new Error("no step label on the booking page");
  for (let guard = 0; guard < 8 && !(await page.locator(".bk-cal").count()); guard++) {
    const next = await advance(page, at.n);
    if (!next) throw new Error(`step ${at.n} would not advance`);
    at = next;
  }
  if (!(await page.locator(".bk-cal").count())) throw new Error("never reached the calendar");
  return at;
}

/**
 * Pick an open day by the grid's own geometry.
 *
 * `monthGrid` lays the month out starting on Sunday and pads the lead-in with
 * empty cells, so a cell's COLUMN is its weekday: 0 Sunday, 6 Saturday. That
 * is locale-free — it does not read the month name, the weekday letters or the
 * heading, all three of which change language.
 *
 * `want` is "weekend", "weekday" or "any". **A weekday target takes the LAST
 * open one, not the first, and that is not arbitrary:** the first is usually
 * tomorrow, and a tenant with a `lead_time` rule would fire a rush fee on it.
 */
export async function pickDay(page, want) {
  let day = null;
  for (let month = 0; month < 3 && !day; month++) {
    if (month) {
      await page.locator(".bk-cal-block .bk-row.between button").last().click();
      await settle(page, 2200);
    }
    await page.locator(".bk-cal .cell:not(.closed):not(.empty)").first()
      .waitFor({ state: "attached", timeout: 8000 }).catch(() => {});
    day = await page.evaluate((want) => {
      const grids = document.querySelectorAll(".bk-cal");
      const cells = [...grids[grids.length - 1].querySelectorAll(".cell")];
      const hits = [];
      for (let i = 0; i < cells.length; i++) {
        const col = i % 7;
        const isWeekend = col === 0 || col === 6;
        if (want === "weekend" && !isWeekend) continue;
        if (want === "weekday" && isWeekend) continue;
        const c = cells[i];
        if (/closed|empty/.test(c.className) || !c.innerText.trim()) continue;
        hits.push(c.innerText.trim());
      }
      if (!hits.length) return null;
      return want === "weekday" ? hits[hits.length - 1] : hits[0];
    }, want);
  }
  if (!day) {
    throw new Error(
      `no open ${want} day in three months of the demo's calendar, so the case this `
      + "target exists for cannot be produced. Re-seed (node scripts/seed-demo.mjs) "
      + "and check available-slots by hand.");
  }
  return day;
}

/**
 * How much of a rect is actually ink, measured as the difference between two
 * renders of the same frame: the page as it is, and the page with some text
 * made transparent. Everything that is not that text is identical in both.
 *
 * **THIS IS THE ANSWER TO A CHECK THAT GRADED FIVE BLANK SCREENSHOTS BY FILE
 * SIZE AND PASSED** — and the correct picture was SMALLER than the blank one,
 * so size is not weak evidence, it points the wrong way.
 *
 * **THE FIRST VERSION MEASURED THE STANDARD DEVIATION INSIDE THE RECT AND LET
 * A BLANKED LINE THROUGH AT 392** — 3.49 against a floor of 4 — because the
 * rect is not flat ground, it sits on this page's gradient, so the spread is
 * mostly BACKGROUND. A difference between two renders has no background in it
 * at all: the same correction `pinned-bar.mjs` made twice before its `edge`
 * assertion worked.
 */
export const DELTA = async ({ a, b, r }) => {
  const load = async (data) => {
    const img = new Image();
    img.src = "data:image/png;base64," + data;
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return { ctx, w: img.width, h: img.height };
  };
  const A = await load(a);
  const B = await load(b);
  const x = Math.max(0, Math.min(r.x, A.w - 1));
  const y = Math.max(0, Math.min(r.y, A.h - 1));
  const w = Math.max(1, Math.min(r.w, A.w - x));
  const h = Math.max(1, Math.min(r.h, A.h - y));
  const da = A.ctx.getImageData(x, y, w, h).data;
  const db = B.ctx.getImageData(x, y, w, h).data;
  const n = da.length / 4;
  let sum = 0;
  for (let i = 0; i < da.length; i += 4) {
    const la = (da[i] + da[i + 1] + da[i + 2]) / 3;
    const lb = (db[i] + db[i + 1] + db[i + 2]) / 3;
    sum += Math.abs(la - lb);
  }
  return { delta: sum / n, px: n };
};

/**
 * MEASURED BOTH WAYS RATHER THAN ESTIMATED, because the version of this
 * constant that was an estimate let a blanked line through. A real sentence
 * moves its own rect by 4.4 levels at the desk widths and 8.9–9.1 at 320; a
 * blanked one by 0.00 at every target. The floor has a 2.2x margin at its
 * worst and an infinite one below.
 */
export const DELTA_FLOOR = 2;

/** Every screenshot in this family is frozen — a drifting lattice is noise a real failure can hide in. */
export const FROZEN = { animations: "disabled" };

/**
 * Photograph the frame a person sees, then measure how much of each rect is
 * actually its text. The second render is never written to disk.
 *
 * `blankCss` makes the text under test transparent without moving anything, so
 * every pixel that is not that text is identical between the two frames.
 */
export async function frame(page, { dir, file, rects, blankCss, artifacts, prefix }) {
  const shot = await page.screenshot({ ...FROZEN, path: dir + file });
  if (artifacts) artifacts.push(prefix + file);
  const tag = await page.addStyleTag({ content: blankCss });
  await page.waitForTimeout(150);
  const flat = await page.screenshot(FROZEN);
  await tag.evaluate((el) => el.remove());
  const spreads = [];
  for (const r of rects) {
    spreads.push(await page.evaluate(DELTA, {
      a: shot.toString("base64"), b: flat.toString("base64"), r,
    }));
  }
  return spreads;
}

/**
 * READ THE CONSOLE AT EVERY SIZE, AND DO NOT FILTER WARNINGS — Andrew's rule.
 * The two React Router v7 future-flag warnings are known and logged in
 * FOUND.md; they are dropped by NAME so that anything else still lands.
 */
export function watchConsole(page, label, sink) {
  page.on("console", (msg) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    const text = msg.text();
    if (/React Router Future Flag Warning/.test(text)) return;
    sink.push(`${label} · ${msg.type()} · ${text.slice(0, 180)}`);
  });
  page.on("pageerror", (e) => sink.push(`${label} · pageerror · ${String(e.message).slice(0, 180)}`));
  // **A REFUSED REQUEST IS RECORDED WITH ITS PATH, BECAUSE THE CONSOLE DOES
  // NOT GIVE ONE.** Chrome prints "Failed to load resource: the server
  // responded with a status of 429" and names nothing, so a run that trips a
  // rate limit reports a number nobody can act on — which is a finding shaped
  // exactly like a skipped check: visible, and useless. The path turns it into
  // a lead.
  page.on("response", (res) => {
    if (res.status() < 400) return;
    let where = res.url();
    try { where = new URL(where).pathname; } catch { /* keep the raw string */ }
    sink.push(`${label} · http ${res.status()} · ${where}`);
  });
}
