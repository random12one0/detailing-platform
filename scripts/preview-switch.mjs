// ROADMAP 4.3c (a) + 4.3e — BROWSER PROOF for the preview tab's server switch.
//
// What it proves, in a real browser against the served copy: the actual "Let me make
// changes" / "Back to looking" button in App.jsx asks the server first and only flips the
// banner once the server agrees. Every state 4.3e names is driven in English AND Spanish at
// 392 and 1440: an allowed unlock, a refused unlock, a refused relock, a relock whose audit
// row failed, an offline server, and a legacy server that answers 404 or 400 "Unknown
// action" (which must still switch, so a half-published release never turns the working
// button into a refusal). A refused or offline unlock must never show WORKING.
//
// Run (needs Playwright + a browser, so NOT in the worker sandbox, and never under tests/):
//   BASE=http://127.0.0.1:5180 node scripts/preview-switch.mjs
//   BASE=… node scripts/preview-switch.mjs --break=refusal-as-404   # the ORIGINAL defect: a refusal flips the bar anyway
//   BASE=… node scripts/preview-switch.mjs --break=drop-es          # the Spanish keys go missing, so the bar falls back to English
//   BASE=… node scripts/preview-switch.mjs --check                  # no browser: prints the scenario list
//
// The switch's server answers are stubbed with page.route (every stub is printed by name);
// nothing here reaches platform-admin. Signing in needs the served copy to point at the
// belt's LOCAL demo backend: against anything else it refuses rather than sign in to a
// real database. Screenshots land in out/preview-switch/ (ignored), or SHOTS=<dir>.
// The receipt is graded by scripts/receipt.mjs; a --break run lands in the .sabotage file.

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { writeReceipt } from "./receipt.mjs";

const BASE = process.env.PREVIEW_BASE || process.env.BASE || process.env.BASE_URL || "http://127.0.0.1:5180";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
const CHECK_ONLY = process.argv.includes("--check");
const SHOTS = process.env.SHOTS || "out/preview-switch/screenshots";
if (BREAK && !["refusal-as-404", "drop-es"].includes(BREAK)) { console.error(`unknown --break=${BREAK}`); process.exit(2); }

// Whole sentences, so a half-translated bar cannot pass on a shared word.
const T = {
  en: {
    look: "Let me make changes", back: "Back to looking",
    looking: "Looking at Coastline. Nothing here can be changed.",
    working: "WORKING in Coastline. Anything you change is theirs.",
    refused: "That change did not go through. Nothing was changed.",
    offline: "Could not reach the server. Nothing was changed.",
    notRecorded: "Back to looking, but this press was not recorded.",
    until: "Open until", close: "Close",
  },
  es: {
    look: "Quiero hacer cambios", back: "Volver a mirar",
    looking: "Viendo Coastline. Aquí no se puede cambiar nada.",
    working: "TRABAJANDO en Coastline. Todo lo que cambies será de ellos.",
    refused: "Ese cambio no se aplicó. No se cambió nada.",
    offline: "No se pudo conectar con el servidor. No se cambió nada.",
    notRecorded: "Volver a mirar, pero este cambio no quedó registrado.",
    until: "Abierto hasta", close: "Cerrar",
  },
};
const BOTH = ["en", "es"];
const NARROW_WIDE = [[392, 844], [1440, 900]];
const SCENARIOS = [
  { name: "allowed-unlock", stub: "allow", press: "look", sizes: [[390, 844], [768, 1024], [1440, 900]] },
  { name: "refused-unlock", stub: "refuse-403", press: "look", sizes: NARROW_WIDE },
  { name: "offline-unlock", stub: "abort", press: "look", sizes: NARROW_WIDE },
  { name: "refused-relock", stub: "allow-then-403", press: "look-then-back", sizes: NARROW_WIDE },
  { name: "offline-relock", stub: "allow-then-abort", press: "look-then-back", sizes: NARROW_WIDE },
  { name: "relock-audit-failed", stub: "allow-then-locked500", press: "look-then-back", sizes: NARROW_WIDE },
  { name: "legacy-404", stub: "legacy-404", press: "look", sizes: NARROW_WIDE },
  { name: "legacy-400-unknown-action", stub: "legacy-400", press: "look", sizes: NARROW_WIDE },
  { name: "double-press", stub: "slow-allow", press: "look-twice", sizes: [[392, 844]], langs: ["en"] },
];
// ONLY=<scenario> narrows a debugging run; such a run declares fewer targets and says so.
const ONLY = process.env.ONLY || "";
const RUNS = SCENARIOS.filter((s) => !ONLY || s.name === ONLY).flatMap((s) => (s.langs || BOTH).flatMap((lang) => s.sizes.map(([w, h]) => ({ ...s, lang, w, h }))));

if (CHECK_ONLY) {
  console.log(`BASE would be: ${BASE}; break: ${BREAK || "none"}; ${RUNS.length} runs`);
  for (const r of RUNS) console.log(`  ${r.name} [${r.stub}] ${r.lang} ${r.w}x${r.h}`);
  process.exit(0);
}

const requireFromApp = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = requireFromApp("playwright");

const started_at = new Date().toISOString();
console.log(`preview-switch proof against BASE=${BASE} (break=${BREAK || "none"}), ${RUNS.length} runs declared`);
const src = await (await fetch(`${BASE}/src/lib/supabase.js`)).text().catch(() => "");
if (!/"VITE_SUPABASE_URL":\s*"http:\/\/(127\.0\.0\.1|localhost)/.test(src)) {
  console.error("REFUSED: the served copy does not point at a local demo backend, so this proof will not sign in.");
  process.exit(2);
}

let assertions = 0;
const failures = [];
const check = (tag, name, cond, detail = "") => {
  assertions++;
  if (cond) console.log(`  ok    [${tag}] ${name}`);
  else { failures.push(`[${tag}] ${name} ${String(detail).slice(0, 200)}`.trim()); console.error(`  FAIL  [${tag}] ${name} ${String(detail).slice(0, 200)}`); }
};
const answer = (route, status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
let completed = 0;
let signedIn = null;
let canarySeen = false;
try {
  for (const run of RUNS) {
    const { lang, w, h } = run;
    const tag = `${run.name}-${lang}-${w}x${h}`;
    const t = T[lang];
    const context = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      // The stubbed refusals are the only expected console lines: the browser logs a 4xx/5xx
      // resource and an aborted request on its own. Anything else is a defect.
      const txt = m.text();
      if (m.type() === "error" && !/Failed to load resource|net::ERR_FAILED/.test(txt)) errors.push(`console.error: ${txt}`);
    });
    if (BREAK === "drop-es") {
      // Serve the real Spanish table minus this item's sentences: what an edit that forgets
      // the Spanish keys ships. One navigation per context, so the rewrite is what runs.
      await page.route("**/src/lib/strings/appEs.js*", async (route) => {
        const res = await route.fetch();
        let body = await res.text();
        for (const en of Object.values(T.en)) body = body.split(JSON.stringify(en) + ":").join(JSON.stringify("__dropped__" + en) + ":");
        return route.fulfill({ response: res, body });
      });
    }
    let switchRequests = 0;
    const stubOnce = { unlocked: false };
    await page.route("**/functions/v1/platform-admin**", async (route) => {
      const body = route.request().postDataJSON?.() ?? {};
      if (body.action !== "support_unlock" && body.action !== "support_lock") return route.continue();
      switchRequests++;
      const s = run.stub;
      if (BREAK === "refusal-as-404" && (s === "refuse-403" || s === "allow-then-403")) {
        if (s === "refuse-403" || stubOnce.unlocked) return answer(route, 404, { error: "Not found" });
      }
      if (s === "allow") return answer(route, 200, { success: true, unlocked: body.action === "support_unlock" });
      if (s === "slow-allow") { await new Promise((r) => setTimeout(r, 400)); return answer(route, 200, { success: true }); }
      if (s === "refuse-403") return answer(route, 403, { error: "That preview has ended, so nothing changed." });
      if (s === "abort") return route.abort("failed");
      if (s === "legacy-404") return answer(route, 404, { error: "Not found" });
      if (s === "legacy-400") return answer(route, 400, { error: "Unknown action" });
      if (body.action === "support_unlock") { stubOnce.unlocked = true; return answer(route, 200, { success: true, unlocked: true }); }
      if (s === "allow-then-403") return answer(route, 403, { error: "That preview has ended, so nothing changed." });
      if (s === "allow-then-abort") return route.abort("failed");
      if (s === "allow-then-locked500") return answer(route, 500, { error: "not recorded", locked: true });
      return route.continue();
    });
    try {
      await page.addInitScript(({ lang }) => {
        try { localStorage.setItem("dp.lang.app", lang); } catch {}
        try {
          localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
          localStorage.setItem("dp.tour", "1");
        } catch {}
        try { sessionStorage.setItem("dp.preview.ends", String(Date.now() + 25 * 60 * 1000)); } catch {}
        try { sessionStorage.setItem("dp.preview.who", "Coastline"); } catch {}
      }, { lang });
      // /preview marks the tab as a preview tab; the demo owner then signs in INSIDE it.
      await page.goto(`${BASE}/preview`, { waitUntil: "domcontentloaded" });
      await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email], .impbar", { timeout: 30000 });
      if (await page.locator("input[type=email]").count()) {
        await page.fill("input[type=email]", "demo@detailplatform.com");
        await page.fill("input[type=password]", "demo-backend");
        await page.click("form button.btn.primary");
      }
      const bar = page.locator(".impbar");
      await page.getByRole("button", { name: t.look, exact: true }).waitFor({ timeout: 30000 });
      const barText = async () => ((await bar.textContent()) || "").replace(/\s+/g, " ");
      const first = await barText();
      check(tag, "the preview bar starts on Looking, in this language", first.includes(t.looking) && first.includes(t.until), first);
      check(tag, "Close is in this language", (await page.getByRole("button", { name: t.close, exact: true }).count()) === 1, first);
      const press = async (label) => { await page.getByRole("button", { name: label, exact: true }).click(); await page.waitForTimeout(900); return barText(); };
      const mode = () => page.evaluate(() => { try { return sessionStorage.getItem("dp.preview.mode"); } catch { return null; } });
      let after;
      if (run.press === "look-twice") {
        // Two taps one task apart, as a real double tap lands. (Playwright's own second click
        // waits for the button to be enabled again and then presses the NEXT label, which is
        // a second deliberate press, not a double tap.)
        await page.getByRole("button", { name: t.look, exact: true }).evaluate(async (b) => {
          b.click(); await new Promise((r) => setTimeout(r, 0)); b.click();
        });
        await page.waitForTimeout(900);
        after = await barText();
        check(tag, "a double press sends exactly one request (the button disables while pending)", switchRequests === 1, `${switchRequests} requests`);
        check(tag, "the double press lands on Working", after.includes(t.working), after);
      } else if (run.press === "look") {
        after = await press(t.look);
        if (run.stub === "allow") {
          check(tag, "an allowed unlock flips the bar to Working", after.includes(t.working), after);
          // CANARY, every allowed run: the Working detector the refusals rely on fires here.
          canarySeen = canarySeen || after.includes(t.working);
          check(tag, "exactly one switch request went out", switchRequests === 1, `${switchRequests} requests`);
          check(tag, "Working persisted for a reload", (await mode()) === "work");
        } else if (run.stub === "refuse-403" || run.stub === "abort") {
          const said = run.stub === "abort" ? t.offline : t.refused;
          check(tag, "a refused/offline unlock never shows WORKING", !after.includes(t.working) && after.includes(t.looking), after);
          check(tag, "it says why, in this language", after.includes(said), after);
          check(tag, "the refused press persists nothing", (await mode()) !== "work");
        } else {
          check(tag, "a legacy server (404 / 400 Unknown action) still switches to Working", after.includes(t.working), after);
          check(tag, "and says nothing went wrong", !after.includes(t.refused) && !after.includes(t.offline), after);
        }
      } else {
        const mid = await press(t.look);
        check(tag, "the unlock lands on Working first", mid.includes(t.working), mid);
        after = await press(t.back);
        if (run.stub === "allow-then-locked500") {
          check(tag, "a relock whose audit failed shows Looking (the server lock held)", after.includes(t.looking) && !after.includes(t.working), after);
          check(tag, "and says the press was not recorded, in this language", after.includes(t.notRecorded), after);
        } else {
          const said = run.stub === "allow-then-abort" ? t.offline : t.refused;
          check(tag, "a refused/offline relock stays on Working (the server still has it unlocked)", after.includes(t.working), after);
          check(tag, "it says why, in this language", after.includes(said), after);
        }
      }
      await page.screenshot({ path: `${SHOTS}/${tag}.png` });
      const geo = await page.evaluate(() => {
        const b = document.querySelector(".impbar")?.getBoundingClientRect();
        return { sideways: document.documentElement.scrollWidth - innerWidth, left: b?.left ?? -1, right: b?.right ?? 1e9, vw: innerWidth };
      });
      check(tag, "no sideways scroll, and the bar sits inside the screen", geo.sideways <= 0 && geo.left >= 0 && geo.right <= geo.vw + 0.5, JSON.stringify(geo));
      completed++;
    } catch (e) {
      check(tag, "scenario ran without an automation error", false, e.message.split("\n")[0]);
    }
    check(tag, "no console/page errors", errors.length === 0, errors.join(" | "));
    await context.close();
  }
} finally {
  await browser.close();
}

const status = failures.length || completed !== RUNS.length || !canarySeen ? "fail" : "pass";
if (!canarySeen) console.error("  FAIL  canary: no allowed unlock showed Working in this run, so the refusal checks prove nothing");
writeReceipt({
  check_id: "preview-switch",
  started_at,
  status,
  expected_targets: RUNS.length,
  discovered_targets: RUNS.length,
  attempted_targets: RUNS.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: RUNS.length * 5,
  assertion_floor: "structural floor: every run asks at least the starting bar, Close, its state checks (two or more), the geometry and the console",
  failures,
  canary: { id: "allowed-unlock-shows-working", observed_failure: canarySeen },
  dimensions: { break: BREAK || undefined, base: BASE, runs: RUNS.length, languages: BOTH, scenarios: SCENARIOS.map((s) => s.name) },
  artifacts: [SHOTS],
});
console.log(failures.length ? `\npreview-switch: FAIL (${failures.length} of ${assertions})` : `\npreview-switch: PASS (${assertions} assertions, ${completed} of ${RUNS.length} runs)`);
process.exit(status === "pass" ? 0 : 1);
