// Walks the booking flow inside a Studio site, step by step, the way a customer
// would: a service, the drop-off place, the first open day and its first time, a
// vehicle year, the contact details, then the final send. Shared by s1-check.mjs
// and studio-check.mjs so both prove the same walk.
//
//   const r = await walkBooking(page, { shots: (n) => path | null });
//   r = { steps: ["1:Pick your services", ...], shownTotal: "$85", confirmed, error, why, times: ["9 AM", ...] }
//
// `times` are the time chips the page offered on the day it picked, read before
// one is pressed, so a check can hold them against available-slots.
export async function walkBooking(page, { shot = () => null, service = "Hand wash" } = {}) {
  const book = page.locator('[data-section="book"]');
  const cont = book.locator(".bk-bar button.bk-btn.primary");
  const enabled = (ms) => page.waitForFunction(() => {
    const b = document.querySelector('[data-section="book"] .bk-bar button.bk-btn.primary');
    return !!b && !b.disabled && b.getAttribute("aria-disabled") !== "true";
  }, null, { timeout: ms }).then(() => true).catch(() => false);
  const out = { steps: [], shownTotal: null, confirmed: false, error: null, why: "", times: [] };
  try {
    for (let n = 1; n <= 9; n++) {
      const stepNo = Number(await book.locator("[data-booking-step]").getAttribute("data-booking-step"));
      const heading = (await book.locator(".bk-step-head h2").innerText()).trim();
      out.steps.push(`${stepNo}:${heading}`);
      if (/check everything/i.test(heading)) break;
      if (/pick your services/i.test(heading)) await book.locator(".bk-card.selectable", { hasText: service }).first().click();
      if (/place|drop-off/i.test(heading)) {
        const drop = book.locator(".bk-card.selectable", { hasText: /drop/i }).first();
        if (await drop.count()) await drop.click();
      }
      if (/time/i.test(heading) && await book.locator(".bk-cal").count()) {
        let picked = false;
        for (let month = 0; month < 3 && !picked; month++) {
          if (month) { await book.getByRole("button", { name: "Next month" }).click(); await page.waitForTimeout(600); }
          await book.locator(".bk-cal .cell:not(.closed):not(.empty)").first().waitFor({ timeout: 8000 }).catch(() => {});
          const days = await book.locator(".bk-cal .cell:not(.closed):not(.empty)").allTextContents();
          for (const d of days.map((x) => x.trim())) {
            const cell = book.locator(".bk-cal .cell:not(.closed):not(.empty)", { hasText: new RegExp(`^${d}$`) }).first();
            if (!(await cell.count())) continue;
            await cell.click();
            await book.locator(".bk-slots .bk-chip").first().waitFor({ timeout: 5000 }).catch(() => {});
            if (await book.locator(".bk-slots .bk-chip").count()) {
              out.times = (await book.locator(".bk-slots .bk-chip").allInnerTexts()).map((t) => t.trim());
              await book.locator(".bk-slots .bk-chip").first().click(); picked = true; break;
            }
          }
        }
        if (!picked) throw new Error("no open time found in three months");
      }
      const year = book.locator('.bk-field input[inputmode="numeric"][maxlength="4"]').first();
      if (await year.count() && !(await year.inputValue())) await year.fill("2019");
      if (/your details/i.test(heading)) {
        await book.locator('.bk-field input:not([type=tel]):not([type=email]):not([type=checkbox])').first().fill("Sample Customer");
        await book.locator(".bk-field input[type=tel]").first().fill("5625550123");
        await book.locator(".bk-field input[type=email]").first().fill("sample@example.test");
      }
      if (!(await enabled(10000))) {
        const why = (await book.locator(".bk-refusal, .bk-error").allInnerTexts().catch(() => [])).join(" | ");
        throw new Error(`stuck on step ${stepNo} (${heading}): ${why}`);
      }
      const file = shot(stepNo); if (file) await page.screenshot({ path: file });
      await cont.click();
      await page.waitForTimeout(700);
    }
    out.shownTotal = (await book.locator(".bk-bar .total strong").innerText()).trim();
    const file = shot("review"); if (file) await page.screenshot({ path: file });
    await book.getByRole("button", { name: /request this time|confirm booking/i }).click();
    await book.locator("h2", { hasText: /holding your time|you’re booked/i }).waitFor({ timeout: 15000 });
    out.confirmed = true;
  } catch (e) {
    out.error = e.message.split("\n")[0];
    out.why = (await book.locator(".bk-error, .bk-refusal").allInnerTexts().catch(() => [])).join(" | ");
  }
  return out;
}

// "9 AM" / "9:30 PM" (time12) back to the engine's "09:00" / "21:30".
export function hhmm(label) {
  const m = /(\d{1,2})(?::(\d\d))?\s*(AM|PM)/i.exec(label || "");
  if (!m) return null;
  const h = (Number(m[1]) % 12) + (/pm/i.test(m[3]) ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${m[2] || "00"}`;
}
