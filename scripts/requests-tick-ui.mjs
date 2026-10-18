// ROADMAP 99.13 — THE DASHBOARD OFFERS "ANSWER A REQUEST" ONLY TO SOMEBODY THE
// SERVER WILL LET ANSWER IT.
//
// The owner sets per-staff ticks on the Team screen. "Answer requests" is
// enforced by `respond-to-booking` (and since 99.13 by `update-booking`), but
// the Today request card and the job record drew Accept / Quote / Decline for
// every member, so a staff login without the tick was handed three buttons
// that each end in a refusal.
//
// It signs in as the demo owner, then plays TWO members of the same business
// by rewriting the browser's own membership read with page.route (never a
// database write): the OWNER, and STAFF with every tick except "Answer
// requests". One waiting request is fed the same way — an upcoming confirmed
// booking of the demo tenant's, re-labelled `pending` in the response — so the
// run never depends on the demo diary happening to hold one.
// At 390x844, 768x1024, 1440x900 and 320x700 it asks, on Today's request card
// AND on the job record opened from it:
//   owner  → Accept, Quote and Decline are there   (the half that keeps the
//            other honest: "no Accept button" is also what a wrong selector says)
//   staff  → none of the three, and the sentence saying who answers it
// plus no console error and no sideways scroll at each.
//
//   set -a; . ./.env; set +a   (DEMO_OWNER_PW)
//   node scripts/requests-tick-ui.mjs [--base=http://127.0.0.1:5180] [--break=pre-fix] [--freeze=before|after]
//
// --break=pre-fix runs the identical check and only labels the receipt, for a
// run taken on the tree BEFORE the screen change — that tree IS the original
// defect, so its red is the sabotage. It writes to `.sabotage.json` and never
// overwrites the clean receipt (`docs/gotchas.md` 117).

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { demoOwner, demoOwnerEmail } from "./lib/demoOwner.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=") ?? d;
const BASE = arg("base", process.env.BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const BREAK = arg("break", "");
const FREEZE = arg("freeze", "");
const started_at = new Date().toISOString();
const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/99.13";
mkdirSync(`${SHOTS}/png`, { recursive: true });

const SIZES = [[390, 844], [768, 1024], [1440, 900], [320, 700]];
const MODES = {
  owner: (m) => ({ ...m, role: "owner", label: null, permissions: [] }),
  staff: (m) => ({ ...m, role: "staff", label: "Detailer", permissions: ["money", "settings", "marketing"] }),
};
const EXPECTED = SIZES.length * Object.keys(MODES).length * 2;   // two surfaces each
const SENTENCE = "Someone who can answer requests will reply to this one.";

let assertions = 0, reached = 0;
const failures = [], lines = [];
const check = (name, cond, detail = "") => {
  assertions++;
  lines.push(`${cond ? "ok  " : "FAIL"}  ${name}${cond || !detail ? "" : ` — ${detail}`}`);
  console.log(`  ${cond ? "ok  " : "FAIL"}  ${name}${cond || !detail ? "" : ` — ${detail}`}`);
  if (!cond) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch();
// Sign in once; every context after reuses the session.
let state;
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", demoOwnerEmail);
    await page.fill("input[type=password]", demoOwner().password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
  state = await ctx.storageState();
  await ctx.close();
}

async function open(mode, w, h) {
  const ctx = await browser.newContext({ storageState: state, viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text().slice(0, 160)}`); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 160)}`));
  // The membership read, as this mode's member.
  await page.route(/\/rest\/v1\/business_users\?/, async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    await route.fulfill({ response: res, json: Array.isArray(body) ? body.map(MODES[mode]) : MODES[mode](body) });
  });
  // One waiting request: the pending read answered with an upcoming confirmed booking, re-labelled.
  await page.route(/\/rest\/v1\/bookings\?.*status=eq\.pending/, async (route) => {
    const u = new URL(route.request().url());
    u.searchParams.set("status", "eq.confirmed");
    u.searchParams.set("limit", "1");
    const res = await route.fetch({ url: u.toString() });
    const rows = await res.json();
    await route.fulfill({ response: res, json: (Array.isArray(rows) ? rows : []).map((b) => ({ ...b, status: "pending", quoted_at: null })) });
  });
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  return { ctx, page, errors };
}

const answerButtons = (scope) => scope.getByRole("button", { name: /^(Accept|Quote|Re-quote|Send a quote|Send a new quote|Decline)$/ });

for (const [w, h] of SIZES) {
  for (const mode of Object.keys(MODES)) {
    const tag = `${mode} ${w}x${h}`;
    const { ctx, page, errors } = await open(mode, w, h);
    // ── Today's request card
    const card = page.locator(".reqcard").first();
    const hasCard = await card.waitFor({ state: "attached", timeout: 15000 }).then(() => true, () => false);
    if (hasCard) {
      reached++;
      await card.scrollIntoViewIfNeeded();
      const n = await answerButtons(card).count();
      const said = await card.getByText(SENTENCE).count();
      if (mode === "owner") check(`${tag} · Today card · Accept, Quote and Decline offered`, n === 3, `${n} answer buttons`);
      else {
        check(`${tag} · Today card · no answer buttons`, n === 0, `${n} answer buttons`);
        check(`${tag} · Today card · says who answers it`, said === 1, `${said} copies of the sentence`);
      }
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/png/${BREAK ? "before" : "after"}-today-${mode}-${w}x${h}.png` });
      if (FREEZE && mode === "staff" && w === 390) {
        const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
        await freeze(page, {
          out: `${SHOTS}/${FREEZE}.html`, label: FREEZE === "before" ? "Before" : "After",
          note: FREEZE === "before"
            ? "A staff member whose owner unticked \"Answer requests\" is still shown Accept, Quote and Decline. Each one fails when pressed."
            : "The same staff member now sees one plain line saying someone who can answer requests will reply. Nothing to press that would fail.",
          highlight: ".reqcard",
        });
      }
    } else check(`${tag} · Today card · a request card was drawn`, false, "no .reqcard within 15s");

    // ── The job record, opened from the card
    if (hasCard) {
      await card.locator("[role=button]").first().click();
      const answer = page.getByText(/^(Your answer|Tu respuesta)$/).first();
      const opened = await answer.waitFor({ state: "attached", timeout: 15000 }).then(() => true, () => false);
      if (opened) {
        reached++;
        const scope = answer.locator("xpath=following-sibling::*[1]");
        const n = await answerButtons(scope).count();
        const said = await scope.getByText(SENTENCE).count();
        const remove = await page.getByText("Removing it from your records").count();
        if (mode === "owner") {
          check(`${tag} · job record · Accept, Send a quote and Decline offered`, n === 3, `${n} answer buttons`);
          check(`${tag} · job record · removing is offered`, remove === 1, `${remove}`);
        } else {
          check(`${tag} · job record · no answer buttons`, n === 0, `${n} answer buttons`);
          check(`${tag} · job record · says who answers it`, said === 1, `${said} copies of the sentence`);
          check(`${tag} · job record · removing a request is not offered`, remove === 0, `${remove}`);
        }
        await answer.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${SHOTS}/png/${BREAK ? "before" : "after"}-job-${mode}-${w}x${h}.png` });
      } else check(`${tag} · job record · opened from the card`, false, "no \"Your answer\" heading within 15s");
    }
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${tag} · no sideways scroll`, sideways <= 0, `${sideways}px`);
    check(`${tag} · console clean`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
}
await browser.close();

const failed = failures.length;
console.log(`\n${assertions - failed} passed, ${failed} failed, ${reached} of ${EXPECTED} surfaces reached.`);
const logName = `receipts/requests-tick-ui${BREAK ? `-${BREAK}.sabotage` : ""}.txt`;
writeFileSync(root(logName), [`requests-tick-ui${BREAK ? ` --break=${BREAK}` : ""} — ${new Date().toISOString()} — ${BASE}`, ...lines,
  `${assertions - failed} passed, ${failed} failed, ${reached} of ${EXPECTED} surfaces reached.`].join("\n") + "\n");
const pass = failed === 0 && reached === EXPECTED;
const { path: receipt } = writeReceipt({
  check_id: BREAK ? `requests-tick-ui-${BREAK}` : "requests-tick-ui",
  started_at,
  status: pass ? "pass" : "fail",
  expected_targets: EXPECTED,
  discovered_targets: reached,
  attempted_targets: reached,
  completed_targets: reached,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 40,
  failures,
  dimensions: { widths: SIZES.map(([w, h]) => `${w}x${h}`), modes: Object.keys(MODES), base: BASE, ...(BREAK ? { break: BREAK } : {}) },
  artifacts: [logName],
  // The canary is the owner half: the same selectors must FIND three answer
  // buttons on the owner's card and record, or "none for staff" means nothing.
  canary: BREAK
    ? { id: `break-${BREAK}`, observed_failure: failed > 0 }
    : { id: "owner-sees-the-answer-buttons-the-staff-check-looks-for",
      observed_failure: !failures.some((f) => f.startsWith("owner")) && reached === EXPECTED,
      sabotage_receipts: ["receipts/requests-tick-ui-pre-fix.sabotage.json"] },
});
console.log(`receipt: ${receipt}`);
process.exitCode = pass ? 0 : 1;
