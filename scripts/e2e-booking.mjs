// Browser e2e for the customer path on the built app.
// Needs the preview server running from app/:
//   npx vite build   (with VITE_SUPABASE_URL pointing at /sbp proxy)
//   SMOKE_PROXY_TARGET=https://<project>.supabase.co npx vite preview --port 4173
// then: node scripts/e2e-booking.mjs   (from app/, for playwright resolution)
import { chromium } from "playwright";
const SP="/tmp/claude-0/-home-user-detailing-platform/4348c183-8eae-5f8e-b6ad-2e12b81af6d0/scratchpad";
const B="http://localhost:4173";
let pass=0, fail=0;
const check=(n,c,d="")=>{ if(c){pass++;console.log("  ok   ",n);} else {fail++;console.log("  FAIL ",n,d);} };
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport:{width:392,height:860}, hasTouch:true });
const page = await ctx.newPage();
const errs=[]; page.on("pageerror",e=>errs.push(String(e)));

// -- book at riverside ------------------------------------------------------
await page.goto(B+"/book/demo-riverside", { waitUntil:"networkidle" });
await page.waitForTimeout(1200);
check("booking page shows the business", (await page.textContent("h1")).includes("Riverside"));
await page.locator(".bk-card").first().click(); await page.waitForTimeout(500);
const cont = async () => { await page.locator("button", { hasText: /continue/i }).first().click(); await page.waitForTimeout(1300); };
// ADVANCE BY HEADING, NOT BY COUNTING. Roadmap 2.7 (W19) made the flow BUILT
// rather than fixed — add-ons get their own step, and only where a business
// has any — so this walked one step behind for the whole run and typed a
// street address into the vehicle-model field. Riverside has an add-on, so it
// was this script that found out. Ask for the step you want and it survives
// the next one being inserted too.
const contTo = async (re, max = 4) => {
  for (let i = 0; i < max; i++) {
    await cont();
    if (re.test(await page.textContent(".bk-step-head h2"))) return true;
  }
  check(`reached the ${re} step`, false, await page.textContent(".bk-step-head h2"));
  return false;
};
await contTo(/vehicle|where|anything to add/i);
await contTo(/where|drop-off/i);
await page.locator(".bk-field input").first().fill("12 Lakeside Dr, Lakewood");
await contTo(/pick a time/i);
// availability loads async; wait out the spinner, then diagnose if empty
await page.waitForFunction(() => !document.querySelector(".bk-spinner"), { timeout: 20000 }).catch(()=>{});
let day = page.locator(".bk-cal .cell:not(.closed):not(.empty)").first();
if (!(await day.count())) {
  // maybe this month has nothing open — page forward one month
  await page.locator('button[aria-label="Next month"]').click();
  await page.waitForTimeout(1800);
  day = page.locator(".bk-cal .cell:not(.closed):not(.empty)").first();
}
if (!(await day.count())) {
  await page.screenshot({ path: SP+"/e2e-when-debug.png" });
  console.log("cells:", await page.evaluate(()=>[...document.querySelectorAll(".bk-cal .cell")].map(c=>c.className).join("|").slice(0,400)));
}
await day.click(); await page.waitForTimeout(1400);
await page.locator(".bk-slots .bk-chip").first().click(); await page.waitForTimeout(400);
await contTo(/reach you/i);
await page.locator(".bk-field input").nth(0).fill("E2E Tester");
await page.locator(".bk-field input[type=tel]").fill("555 010 9988");
await page.locator(".bk-field input[type=email]").fill("e2e-tester@example.test");
await contTo(/check everything/i);
check("review shows a receipt", await page.locator(".bk-receipt").count() > 0);
const totalTxt = await page.locator(".bk-receipt .line.total .bk-price").textContent();
check("receipt total is mono money", /^\$\d+\.\d\d$/.test(totalTxt.trim()), totalTxt);
await page.locator("button", { hasText: /confirm booking/i }).first().click();
await page.waitForTimeout(4000);
const bodyTxt = await page.textContent("body");
check("confirmation screen", /booked|confirmed|see you/i.test(bodyTxt), bodyTxt.slice(0,120));

// find the manage link (receipt route)
// receipt_url is absolute (server-built from PLATFORM_URL); take its path.
const manageHref = await page.evaluate(() => {
  const h = [...document.querySelectorAll("a")].map(a=>a.href).find(h=>h&&h.includes("/booking/"));
  return h ? new URL(h).pathname : null;
});
check("confirmation links to /booking/:id", !!manageHref && manageHref.startsWith("/booking/"), String(manageHref));

// -- manage: reschedule then cancel ----------------------------------------
await page.goto(B+manageHref, { waitUntil:"networkidle" });
await page.waitForTimeout(1500);
const t1 = await page.textContent("body");
check("receipt page shows the booking", /E2E Tester|Riverside/.test(t1));
const resBtn = page.locator("button", { hasText: /change|reschedule/i }).first();
check("reschedule offered", await resBtn.count() > 0);
await resBtn.click(); await page.waitForTimeout(1500);
// Manage-page reschedule offers day chips then time chips (both .bk-chip).
const dayChip = page.locator(".bk-slots").first().locator(".bk-chip:not(.selected)").last();
await dayChip.click(); await page.waitForTimeout(1500);
const timeChip = page.locator(".bk-slots").nth(1).locator(".bk-chip").last();
if (await timeChip.count()) { await timeChip.click(); await page.waitForTimeout(400); }
const confirmRes = page.locator("button", { hasText: /confirm|save|move/i }).first();
if (await confirmRes.count()) { await confirmRes.click(); await page.waitForTimeout(3000); }
const t2 = await page.textContent("body");
check("reschedule confirmed on page", /moved|rescheduled|updated|new time/i.test(t2) || t2 !== t1, t2.slice(0,120));

const cancelBtn = page.locator("button", { hasText: /cancel/i }).first();
check("cancel offered", await cancelBtn.count() > 0);
await cancelBtn.click(); await page.waitForTimeout(800);
const really = page.locator("button", { hasText: /yes|really|cancel it|confirm/i }).first();
if (await really.count()) { await really.click(); await page.waitForTimeout(3000); }
const t3 = await page.textContent("body");
check("booking shows cancelled", /cancell?ed/i.test(t3), t3.slice(0,150));

// -- legacy route + dashboard ----------------------------------------------
await page.goto(B+"/today", { waitUntil:"networkidle" });
await page.waitForTimeout(800);
check("legacy /today still lands on the app (sign-in)", /sign in/i.test(await page.textContent("body")));

console.log(`\n${pass} passed, ${fail} failed; page errors:`, errs.length?errs.slice(0,3):"none");
await b.close();
process.exit(fail?1:0);
