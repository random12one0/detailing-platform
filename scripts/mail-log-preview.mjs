// DOES A MAIL-LOG ROW OPEN THE EMAIL AS SENT, AND SAY SO WHEN IT WAS NEVER STORED — ROADMAP 3.1d.
//
//   node scripts/mail-log-preview.mjs
//   node scripts/mail-log-preview.mjs --break=blank     # sabotage: the "not saved" sentence hidden (a row that opens empty)
//   node scripts/mail-log-preview.mjs --break=unsandboxed  # sabotage: the frame's sandbox removed
//
// Needs the dev server, the seed, and `.env` loaded (`set -a; . ./.env; set +a`).
// Signs in as the demo tenant's OWNER and writes nothing anywhere.
//
// **THE SERVER HALF IS STUBBED, AND THAT IS WHY THIS ITEM STAYS OPEN.** `email_sends.body_html` does not exist in the
// live database until Andrew applies migration 20261010010000, and `send-email` does not store a body until it is
// deployed. So the body read is answered IN THE BROWSER for the cases that need a column that is not there:
//   stored      -> the stub returns a body carrying a sentinel
//   null        -> the stub returns body_html: null (what every pre-migration row will read after it)
//   no-column   -> the stub returns Postgres 42703 (what the live database answers TODAY, as measured)
//   read-error  -> the stub returns 500; the screen must say it could not read, NOT "not saved"
// Nothing is written. The real stored-body path end to end is recorded as UNJUDGEABLE, by name.
//
// WHAT IT ASSERTS, PER WIDTH — 6, DECLARED RATHER THAN COUNTED (gotchas 98)
//   preview/stored         a row opens a dialog holding a sandboxed frame whose RENDERED text contains the sentinel
//   preview/null           a null body says it was not saved and draws no frame
//   preview/no-column      the 42703 answer reads the same way (one expected 400 on the console, nothing else)
//   preview/read-error     a failed read says so, and does NOT say "not saved" and draws no frame
//   preview/closes         Escape puts the dialog away
//   page/console           nothing on the console beyond the one expected 400
// The expected 400/500 count is up to 2 each, not 1: React StrictMode runs the open effect twice in the dev server.
// 3 widths x 6 + 2 canaries = **20**, asserted as an equality.

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner, demoOwnerEmail } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = process.env.BASE_URL || process.env.BASE || "http://localhost:5173";
const ART = join(REPO, ".manager-shots", "3.1d");
const BREAK = (process.argv.slice(2).find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;

if (!process.env.SUPABASE_URL) {
  console.error("Missing SUPABASE_URL — run `set -a; . ./.env; set +a` first.");
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}

const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 700 }];
const SENTINEL = "SENT-AS-WRITTEN-31d";
const EXPECTED_ASSERTIONS = SIZES.length * 6 + 2;

// PURE RULES, so a canary runs through the same code (gotchas 95).
const storedOk = (s) => s.dialog && s.frames === 1 && s.sandbox === "" && s.frameText.includes(SENTINEL) && s.frameH > 100;
const unstoredOk = (s) => s.dialog && s.frames === 0 && s.sentenceVisible && /not saved/i.test(s.sentence);
const failedOk = (s) => s.dialog && s.frames === 0 && s.alert && !/not saved/i.test(s.dialogText);

async function openFirst(page) {
  await page.click("[data-mail-log] .mail-scroll .row-item");
  await page.waitForSelector(".sheet[role=dialog]", { timeout: 10000 });
}
async function settle(page) {
  // ATTACHED, NEVER VISIBLE (gotchas 107): wait until the sheet is no longer loading.
  await page.waitForFunction(() => {
    const d = document.querySelector(".sheet[role=dialog]");
    return !!d && !d.querySelector('[aria-busy="true"]');
  }, null, { timeout: 10000 });
  await page.waitForTimeout(250);
}
const read = (page) => page.evaluate(() => {
  const d = document.querySelector(".sheet[role=dialog]");
  const f = d?.querySelector("iframe");
  const p = d?.querySelector("[data-mail-nobody]");
  return {
    dialog: !!d, frames: d ? d.querySelectorAll("iframe").length : 0,
    sandbox: f ? f.getAttribute("sandbox") : null, frameH: f ? f.getBoundingClientRect().height : 0,
    sentence: p ? p.textContent : "", sentenceVisible: !!p && p.offsetHeight > 0 && getComputedStyle(p).visibility !== "hidden",
    alert: !!d?.querySelector('[role="alert"]'), dialogText: d ? d.innerText : "",
  };
});
async function close(page) {
  await page.keyboard.press("Escape");
  await page.waitForSelector(".sheet[role=dialog]", { state: "detached", timeout: 5000 }).catch(() => {});
  return page.evaluate(() => !document.querySelector(".sheet[role=dialog]"));
}

async function run() {
  rmSync(ART, { recursive: true, force: true });
  mkdirSync(ART, { recursive: true });
  const failures = [], observed = [], canaries = [], sabotage = [];
  let assertions = 0;
  const ok = (cond, id, detail) => {
    assertions += 1; observed.push({ id, ok: !!cond, detail });
    if (!cond) failures.push(`${id} — ${detail}`);
    console.log(`${cond ? "  ok  " : "  FAIL"} ${id}  ${detail}`);
  };
  const browser = await chromium.launch();
  try {
    for (const { w, h } of SIZES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const noise = [];
      let mode = "stored";
      page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") noise.push(m.text()); });
      page.on("pageerror", (e) => noise.push(String(e)));
      await page.route("**/rest/v1/email_sends*", async (route) => {
        const u = route.request().url();
        if (route.request().method() !== "GET" || !u.includes("select=body_html")) return route.continue();
        if (mode === "stored") return route.fulfill({ json: { body_html: `<html><body style="font-family:serif"><h1>${SENTINEL}</h1><p>Hello Jordan, your detail is booked.</p></body></html>` } });
        if (mode === "null") return route.fulfill({ json: { body_html: null } });
        if (mode === "no-column") return route.fulfill({ status: 400, json: { code: "42703", message: "column email_sends.body_html does not exist" } });
        return route.fulfill({ status: 500, json: { code: "XX000", message: "the database fell over" } });
      });
      await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email]", { timeout: 30000 });
      await page.fill("input[type=email]", demoOwnerEmail);
      await page.fill("input[type=password]", demoOwner().password);
      await page.click("form button.btn.primary");
      await page.waitForSelector(".tabbar", { timeout: 30000 });
      await page.waitForSelector('[data-tour="gear"]', { timeout: 25000 });
      await page.click('[data-tour="gear"]');
      await page.waitForSelector('[data-settings-key="mail"]', { timeout: 20000 });
      await page.click('[data-settings-key="mail"]');
      await page.waitForSelector("[data-mail-log]", { timeout: 20000 });
      await page.waitForFunction(() => {
        const c = document.querySelector("[data-mail-log]");
        return !!c && !c.querySelector('.rows[aria-busy="true"]') && c.querySelectorAll(".row-item").length > 0;
      }, null, { timeout: 25000 });
      await page.waitForTimeout(600);
      const noiseBefore = noise.length;

      // A ROW IS A CONTROL: it must be a button, or the keyboard cannot open it.
      const tag = await page.evaluate(() => document.querySelector("[data-mail-log] .mail-scroll .row-item").tagName);

      // stored
      mode = "stored";
      await openFirst(page); await settle(page);
      if (BREAK === "unsandboxed") await page.evaluate(() => document.querySelector(".sheet iframe")?.removeAttribute("sandbox"));
      const frame = page.frames().find((f) => f !== page.mainFrame());
      let s = await read(page);
      s.frameText = frame ? await frame.evaluate(() => document.body.innerText).catch(() => "") : "";
      if (BREAK === "unsandboxed") {
        sabotage.push({ width: w, break: BREAK, landed: s.sandbox === null });
        if (s.sandbox !== null) { console.error("SABOTAGE DID NOT LAND"); process.exit(2); }
      }
      ok(tag === "BUTTON" && storedOk(s), `${w}/preview/stored`,
        `row is <${tag.toLowerCase()}>; dialog ${s.dialog}, ${s.frames} frame, sandbox=${JSON.stringify(s.sandbox)}, frame ${Math.round(s.frameH)}px tall, rendered text ${s.frameText.includes(SENTINEL) ? "carries" : "LACKS"} the sentinel`);
      await page.screenshot({ path: join(ART, `stored-${w}.png`) });
      const closed1 = await close(page);

      // null body
      mode = "null";
      await openFirst(page); await settle(page);
      if (BREAK === "blank") {
        const n = () => page.evaluate(() => { const e = document.querySelector("[data-mail-nobody]"); return e && e.offsetHeight > 0 ? 1 : 0; });
        const before = await n();
        await page.addStyleTag({ content: "[data-mail-nobody]{display:none!important}" });
        const after = await n();
        sabotage.push({ width: w, break: BREAK, before, after, landed: before === 1 && after === 0 });
        if (!(before === 1 && after === 0)) { console.error(`SABOTAGE DID NOT LAND at ${w}`); process.exit(2); }
      }
      s = await read(page);
      ok(unstoredOk(s), `${w}/preview/null`, `${s.frames} frames; sentence ${s.sentenceVisible ? "painted" : "NOT painted"}: ${JSON.stringify(s.sentence.slice(0, 60))}`);
      await page.screenshot({ path: join(ART, `unstored-${w}.png`) });
      await close(page);

      // no column (what the live database answers today)
      mode = "no-column";
      const n400 = noise.length;
      await openFirst(page); await settle(page);
      s = await read(page);
      const expected400 = noise.slice(n400).filter((m) => /400/.test(m)).length;
      ok(unstoredOk(s), `${w}/preview/no-column`, `${s.frames} frames; sentence ${s.sentenceVisible ? "painted" : "NOT painted"}; ${expected400} expected 400 on the console`);
      await close(page);

      // read error
      mode = "read-error";
      const n500 = noise.length;
      await openFirst(page); await settle(page);
      s = await read(page);
      const expected500 = noise.slice(n500).filter((m) => /500/.test(m)).length;
      ok(failedOk(s), `${w}/preview/read-error`, `${s.frames} frames; alert ${s.alert}; says "not saved": ${/not saved/i.test(s.dialogText)}`);
      const closed2 = await close(page);

      ok(closed1 && closed2, `${w}/preview/closes`, `Escape put the dialog away: ${closed1 && closed2}`);
      const extra = noise.slice(noiseBefore).filter((m) => !/\b(400|500)\b/.test(m));
      ok(extra.length === 0 && expected400 <= 2 && expected500 <= 2, `${w}/page/console`,
        extra.length ? extra.slice(0, 3).join(" | ") : `0 unexpected errors or warnings (${expected400} expected 400, ${expected500} expected 500 from the stubs)`);
      await ctx.close();
    }
    const c1 = storedOk({ dialog: true, frames: 0, sandbox: null, frameText: "", frameH: 0 });
    canaries.push({ name: "the-empty-preview", flagged: !c1 });
    ok(!c1, "canary/the-empty-preview", "a dialog with no frame must NOT read as 'opens the sent body'");
    const c2 = unstoredOk({ dialog: true, frames: 1, sentenceVisible: false, sentence: "" });
    canaries.push({ name: "the-silent-blank", flagged: !c2 });
    ok(!c2, "canary/the-silent-blank", "an empty frame with no sentence must NOT read as 'says it was never stored'");
    if (assertions !== EXPECTED_ASSERTIONS) failures.push(`assertion count ${assertions} != declared ${EXPECTED_ASSERTIONS}`);
  } finally { await browser.close(); }

  const status = failures.length ? "fail" : "pass";
  const unjudgeable = [
    "end-to-end/real-stored-body — the read of a body that send-email really stored cannot be exercised: the column is not in the "
    + "live database until migration 20261010010000 is applied and send-email is deployed, both Andrew's. The stored case above is a "
    + "browser stub of the server's answer.",
  ];
  const { path } = writeReceipt({
    check_id: "mail-log-preview",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status,
    expected_targets: SIZES.length, discovered_targets: SIZES.length, attempted_targets: SIZES.length,
    completed_targets: SIZES.length, skipped_targets: 0,
    assertions_executed: assertions, min_assertions: EXPECTED_ASSERTIONS,
    assertion_floor: "3 widths x 6 + 2 canaries = 20, asserted as an EQUALITY (docs/gotchas.md 98).",
    failures,
    warnings: ["The server's body answer is STUBBED in the browser; see unjudgeable."],
    artifacts: SIZES.flatMap((s) => [`.manager-shots/3.1d/stored-${s.w}.png`, `.manager-shots/3.1d/unstored-${s.w}.png`]),
    dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), business: "demo-detail", item: "3.1d", break: BREAK },
    canary: { id: canaries[0].name, observed_failure: canaries.every((c) => c.flagged) },
    canaries, unjudgeable, sabotage, observed,
  });
  console.log(`receipt: ${path}`);
  console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, ${unjudgeable.length} unjudgeable`);
  unjudgeable.forEach((u) => console.log(`  UNJUDGEABLE ${u}`));
  process.exit(failures.length ? 1 : 0);
}
run().catch((e) => { console.error(e); console.error("NOTHING WAS MEASURED. This is not a pass."); process.exit(2); });
