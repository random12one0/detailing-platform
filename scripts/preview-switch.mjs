// ROADMAP 4.3c (a) + F4 — BROWSER PROOF for the preview tab's server switch.
//
// What it proves, in a real browser against the served copy: the actual "Let me make
// changes" / "Back to looking" button in App.jsx asks the server first and only flips the
// banner once the server agrees; a refusal, a failed relock audit, an expired view, an
// offline server and a legacy server each show the right words in English and Spanish;
// a double press sends exactly one request; a reload keeps the persisted mode.
//
// Run (needs Playwright + a browser, so NOT in the worker sandbox):
//   BASE=http://127.0.0.1:5180 node scripts/preview-switch.mjs
//   BASE=http://127.0.0.1:5180 node scripts/preview-switch.mjs --break=refuse-allowed
//   node scripts/preview-switch.mjs --check   # no browser: validates args + scenario list
//
// BASE defaults to the belt's serve port for this copy and is always printed first
// (2026-10-18 97.85: never silently measure another server). The belt's own page check
// plays the same matrix automatically after every turn from belt-checks/request.json;
// this script is the deeper runnable proof (stubbed server answers, request counts,
// screenshots). The full account-history page renders platform_admin_events rows the edge
// test proves are written; this script asserts the tab-side audit surfacing (recorded /
// was-not-recorded) rather than re-driving the back office.
//
// Screenshots + receipt land in out/preview-switch/ (ignored, never committed).

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const BASE = process.env.PREVIEW_BASE || process.env.BASE || "http://127.0.0.1:5180";
const LANGS = (process.env.PREVIEW_LANGS || "en,es").split(",").map((s) => s.trim()).filter(Boolean);
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
const CHECK_ONLY = process.argv.includes("--check");
const OUT = "out/preview-switch";
const SHOTS = `${OUT}/screenshots`;

const T = {
  en: {
    look: "Let me make changes", back: "Back to looking", looking: "Looking at",
    working: "WORKING in", refused: "That change did not go through. Nothing was changed.",
    notRecorded: "was not recorded", until: "Open until", ended: "preview has ended",
  },
  es: {
    look: "Quiero hacer cambios", back: "Volver a mirar", looking: "Viendo",
    working: "TRABAJANDO en", refused: "Ese cambio no se aplic",
    notRecorded: "no qued", until: "Abierto hasta", ended: "Termin",
  },
};

const SCENARIOS = [
  { name: "allowed-unlock", stub: "allow", press: "look", langs: ["en", "es"], sizes: [[390, 844], [768, 1024], [1440, 900]] },
  { name: "double-press", stub: "slow-allow", press: "look-twice", langs: ["en"], sizes: [[390, 844]] },
  { name: "refused-unlock", stub: "refuse-403", press: "look", langs: ["en", "es"], sizes: [[390, 844], [1440, 900]] },
  { name: "refused-relock-audit", stub: "allow-then-locked500", press: "look-then-back", langs: ["en"], sizes: [[390, 844], [1440, 900]] },
  { name: "expired", stub: "none", press: "ended", langs: ["en", "es"], sizes: [[390, 844], [1440, 900]] },
  { name: "legacy-404", stub: "legacy-404", press: "look", langs: ["en"], sizes: [[390, 844]] },
  { name: "legacy-400", stub: "legacy-400", press: "look", langs: ["en"], sizes: [[390, 844]] },
  { name: "offline", stub: "abort", press: "look", langs: ["en"], sizes: [[390, 844]] },
];

if (CHECK_ONLY) {
  console.log(`BASE would be: ${BASE}`);
  console.log(`scenarios: ${SCENARIOS.map((s) => `${s.name} [${s.stub}] (${s.langs.join("/")})`).join("; ")}`);
  console.log(`languages: ${LANGS.join(",")}; break: ${BREAK || "none"}`);
  console.log("--check ok: no browser needed");
  process.exit(0);
}

const requireFromApp = createRequire(new URL("../app/package.json", import.meta.url));
let chromium;
try {
  ({ chromium } = requireFromApp("playwright"));
} catch {
  console.error("Playwright is not installed here. From the repo root: npm install --prefix app --no-save playwright && npx --prefix app playwright install chromium");
  process.exit(2);
}

const results = [];
const failures = [];
const check = (scenario, name, cond, detail = "") => {
  results.push({ scenario, name, ok: !!cond, detail: String(detail).slice(0, 300) });
  if (cond) console.log(`  ok    [${scenario}] ${name}`);
  else { failures.push(`[${scenario}] ${name} ${String(detail).slice(0, 200)}`.trim()); console.error(`  FAIL  [${scenario}] ${name} ${String(detail).slice(0, 200)}`); }
};

console.log(`preview-switch proof against BASE=${BASE} (break=${BREAK || "none"})`);
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
try {
  for (const sc of SCENARIOS) {
    for (const lang of sc.langs.filter((l) => LANGS.includes(l))) {
      for (const [w, h] of sc.sizes) {
        const tag = `${sc.name}-${lang}-${w}x${h}`;
        const context = await browser.newContext({ viewport: { width: w, height: h } });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
        page.on("console", (m) => { if (m.type() === "error") errors.push(`console.error: ${m.text()}`); });
        let switchRequests = 0;
        await page.addInitScript(({ lang }) => {
          try { localStorage.setItem("dp.lang.app", lang); } catch {}
          try { sessionStorage.setItem("dp.preview.ends", String(Date.now() + 60 * 60 * 1000)); } catch {}
          try { sessionStorage.setItem("dp.preview.who", lang === "es" ? "Costanera" : "Coastline"); } catch {}
        }, { lang });
        await page.route("**/functions/v1/platform-admin**", async (route) => {
          const body = route.request().postDataJSON?.() ?? {};
          if (body.action !== "support_unlock" && body.action !== "support_lock") return route.continue();
          switchRequests++;
          const stub = sc.stub === "allow" && BREAK === "refuse-allowed" ? "refuse-403" : sc.stub;
          if (stub === "allow" || stub === "slow-allow") {
            if (stub === "slow-allow") await new Promise((r) => setTimeout(r, 400));
            return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, unlocked: body.action === "support_unlock" }) });
          }
          if (stub === "allow-then-locked500") {
            if (body.action === "support_unlock") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, unlocked: true }) });
            return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Back to looking, but this press was not recorded.", locked: true }) });
          }
          if (stub === "refuse-403") return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "That preview has ended, so nothing changed." }) });
          if (stub === "legacy-404") return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Not found" }) });
          if (stub === "legacy-400") return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Unknown action" }) });
          if (stub === "abort") return route.abort("failed");
          return route.continue();
        });
        const t = T[lang];
        try {
          if (sc.press === "ended") {
            await page.goto(`${BASE}/preview#ended=expired`, { waitUntil: "domcontentloaded" });
            await page.waitForTimeout(800);
            check(tag, "the ended view names the end in this language", (await page.content()).includes(t.ended), await page.title());
          } else {
            await page.goto(`${BASE}/preview`, { waitUntil: "domcontentloaded" });
            await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
            await page.getByRole("button", { name: t.look }).first().waitFor({ timeout: 15000 });
            const bar = await page.getByRole("status").first().textContent();
            check(tag, "the preview bar starts on Looking in this language", (bar || "").includes(t.looking) && (bar || "").includes(t.until), bar);
            if (sc.press === "look" || sc.press === "look-twice") {
              const before = switchRequests;
              const btn = page.getByRole("button", { name: t.look }).first();
              if (sc.press === "look-twice") { await Promise.all([btn.click(), btn.click().catch(() => {})]); await page.waitForTimeout(900); }
              else { await btn.click(); await page.waitForTimeout(900); }
              const after = await page.getByRole("status").first().textContent();
              const shot = `${SHOTS}/${tag}.png`;
              await page.screenshot({ path: shot });
              const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
              check(tag, "no sideways overflow at this width", overflow <= 0, `overflow ${overflow}px`);
              if (sc.stub === "allow") {
                check(tag, "an allowed unlock flips the banner to Working", (after || "").includes(t.working), after);
                check(tag, "exactly one switch request went out", switchRequests - before === 1, `${switchRequests - before} requests`);
                const persisted = await page.evaluate(() => { try { return sessionStorage.getItem("dp.preview.mode"); } catch { return null; } });
                check(tag, "the Working mode persisted for a reload", persisted === "work", persisted);
                await page.reload({ waitUntil: "domcontentloaded" });
                const bar2 = await page.getByRole("status").first().textContent();
                check(tag, "a reload still shows Working", (bar2 || "").includes(t.working), bar2);
              } else if (sc.stub === "slow-allow") {
                check(tag, "a double press sends exactly one request (the button disables while pending)", switchRequests - before === 1, `${switchRequests - before} requests`);
                check(tag, "the double press still lands on Working", (after || "").includes(t.working), after);
              } else if (sc.stub === "refuse-403" || sc.stub === "abort") {
                check(tag, "a refused/offline unlock keeps Looking", (after || "").includes(t.looking), after);
                check(tag, "the refusal is said out loud in this language", (after || "").includes(t.refused), after);
                const persisted = await page.evaluate(() => { try { return sessionStorage.getItem("dp.preview.mode"); } catch { return null; } });
                check(tag, "the refused press persists nothing", persisted !== "work", persisted);
              } else if (sc.stub.startsWith("legacy")) {
                check(tag, "a legacy server still switches locally (compatibility kept)", (after || "").includes(t.working), after);
              }
            } else if (sc.press === "look-then-back") {
              await page.getByRole("button", { name: t.look }).first().click();
              await page.waitForTimeout(900);
              const mid = await page.getByRole("status").first().textContent();
              check(tag, "unlock first lands on Working", (mid || "").includes(t.working), mid);
              await page.getByRole("button", { name: t.back }).first().click();
              await page.waitForTimeout(900);
              const after = await page.getByRole("status").first().textContent();
              await page.screenshot({ path: `${SHOTS}/${tag}.png` });
              check(tag, "a relock whose audit failed still shows Looking (the server lock held)", (after || "").includes(t.looking), after);
              check(tag, "the missing audit is said out loud in this language", (after || "").includes(t.notRecorded), after);
            }
          }
        } catch (e) {
          check(tag, "scenario ran without an automation error", false, e.message);
        }
        check(tag, "no console/page errors", errors.length === 0, errors.join(" | ").slice(0, 300));
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/receipt.json`, JSON.stringify({
  check_id: "preview-switch", base: BASE, break: BREAK || null,
  status: failures.length ? "fail" : "pass",
  scenarios: SCENARIOS.map((s) => s.name), languages: LANGS,
  assertions: results.length, failures,
}, null, 2) + "\n");
console.log(failures.length ? `\npreview-switch: FAIL (${failures.length}) — see ${OUT}/receipt.json` : `\npreview-switch: PASS (${results.length} assertions) — see ${OUT}/receipt.json`);
process.exit(failures.length ? 1 : 0);
